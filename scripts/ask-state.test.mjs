// Checks for the Ask panel's state machine and copy (ask bot spec, "The
// panel"; R3–R11): every state and transition, how each reply from the Worker
// is read, and what the panel says in each state.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COPY,
  HISTORY_LENGTH,
  MAX_QUESTION,
  STATES,
  canAsk,
  formatTime,
  isSitePath,
  message,
  next,
  question,
  readReply,
  remember,
} from '../src/lib/ask-state.mjs';

const EVENTS = [
  { type: 'open' },
  { type: 'opened' },
  { type: 'ask' },
  { type: 'reply', status: 'ok' },
  { type: 'reply', status: 'unknown' },
  { type: 'reply', status: 'off_topic' },
  { type: 'reply', status: 'visitor_limit' },
  { type: 'reply', status: 'resting' },
  { type: 'reply', status: 'failed' },
  { type: 'reply', status: 'something else' },
  { type: 'fail' },
  { type: 'reset' },
  { type: 'close' },
  { type: 'closed' },
];

const key = (e) => (e.type === 'reply' ? `reply:${e.status}` : e.type);

// Every transition the panel makes. Any (state, event) pair not listed leaves the state as it is.
const TRANSITIONS = {
  idle: { open: 'opening' },
  opening: { opened: 'open', close: 'closing' },
  open: { ask: 'waiting', close: 'closing' },
  waiting: {
    'reply:ok': 'answered',
    'reply:unknown': 'unknown',
    'reply:off_topic': 'offTopic',
    'reply:visitor_limit': 'visitorLimit',
    'reply:resting': 'resting',
    'reply:failed': 'failed',
    'reply:something else': 'failed',
    fail: 'failed',
    close: 'closing',
  },
  answered: { ask: 'waiting', close: 'closing' },
  unknown: { ask: 'waiting', close: 'closing' },
  offTopic: { ask: 'waiting', close: 'closing' },
  visitorLimit: { reset: 'open', close: 'closing' },
  resting: { reset: 'open', close: 'closing' },
  failed: { ask: 'waiting', close: 'closing' },
  closing: { closed: 'idle' },
};

describe('the panel state machine', () => {
  it('lists every state', () => {
    assert.deepEqual(Object.keys(TRANSITIONS).sort(), [...STATES].sort());
  });

  for (const state of STATES) {
    it(`from ${state}, goes where it should on every event`, () => {
      for (const event of EVENTS) {
        const expected = TRANSITIONS[state][key(event)] ?? state;
        assert.equal(next(state, event), expected, `${state} + ${key(event)}`);
      }
    });
  }

  it('takes a question only when nothing is pending and no limit is reached', () => {
    assert.deepEqual(
      STATES.filter(canAsk),
      ['open', 'answered', 'unknown', 'offTopic', 'failed'],
    );
  });

  it('runs a whole conversation', () => {
    let state = 'idle';
    for (const event of [
      { type: 'open' },
      { type: 'opened' },
      { type: 'ask' },
      { type: 'reply', status: 'ok' },
      { type: 'ask' },
      { type: 'fail' },
      { type: 'ask' },
      { type: 'reply', status: 'visitor_limit' },
      { type: 'ask' },
      { type: 'close' },
      { type: 'closed' },
    ]) {
      state = next(state, event);
    }
    assert.equal(state, 'idle');
  });
});

describe('reading the Worker’s reply', () => {
  it('reads an answer with its sources', () => {
    const reply = readReply(200, {
      status: 'ok',
      answer: ' I lead full-stack teams. ',
      sources: [{ title: 'Home', path: '/' }, { title: 'Range', path: '/#range' }],
    });
    assert.deepEqual(reply, {
      status: 'ok',
      answer: 'I lead full-stack teams.',
      sources: [
        { title: 'Home', path: '/' },
        { title: 'Range', path: '/#range' },
      ],
    });
  });

  it('drops any source that is not a path on this site', () => {
    const sources = [
      { title: 'Other site', path: 'https://example.com/' },
      { title: 'Protocol-relative', path: '//example.com/' },
      { title: 'Script', path: 'javascript:alert(1)' },
      { title: 'Backslash', path: '/\\example.com' },
      { title: '', path: '/blog/' },
      { title: 'Blog', path: '/blog/' },
    ];
    assert.deepEqual(readReply(200, { status: 'ok', answer: 'a', sources }).sources, [{ title: 'Blog', path: '/blog/' }]);
  });

  it('keeps at most three sources, and none on an unknown or off-topic reply', () => {
    const sources = ['/a/', '/b/', '/c/', '/d/'].map((path) => ({ title: path, path }));
    assert.equal(readReply(200, { status: 'ok', answer: 'a', sources }).sources.length, 3);
    assert.deepEqual(readReply(200, { status: 'unknown', answer: 'a', sources }).sources, []);
    assert.deepEqual(readReply(200, { status: 'off_topic', answer: 'a', sources }).sources, []);
  });

  it('reads the limits with their reset time', () => {
    const resetAt = '2026-10-26T16:00:00.000Z';
    assert.deepEqual(readReply(429, { status: 'visitor_limit', resetAt }), { status: 'visitor_limit', resetAt });
    assert.deepEqual(readReply(503, { status: 'resting', resetAt }), { status: 'resting', resetAt });
    assert.deepEqual(readReply(503, { status: 'resting' }), { status: 'resting' });
    assert.deepEqual(readReply(503, { status: 'resting', resetAt: 'soon' }), { status: 'resting' });
  });

  it('treats anything unexpected as a failure', () => {
    for (const [http, body] of [
      [400, { status: 'invalid' }],
      [200, { status: 'ok' }],
      [200, { status: 'ok', answer: '   ' }],
      [500, { status: 'ok', answer: 'a' }],
      [200, null],
      [200, 'ok'],
      [429, { status: 'resting' }],
      [502, {}],
      [502, { status: 'failed' }],
    ]) {
      assert.deepEqual(readReply(http, body), { status: 'failed' }, JSON.stringify([http, body]));
    }
  });

  it('accepts only same-site paths as links', () => {
    for (const ok of ['/', '/#range', '/blog/', '/api/2022/01/08/mocking-apis-with-prism/']) assert.ok(isSitePath(ok), ok);
    for (const bad of ['', 'blog/', '//x.y', '/\\x.y', 'https://x.y/', 'javascript:x', '/a b', '/"x', 3]) {
      assert.ok(!isSitePath(bad), String(bad));
    }
  });
});

describe('what the panel says', () => {
  const options = { locale: 'en-US', timeZone: 'Asia/Manila' };
  const resetAt = '2026-10-26T16:00:00.000Z'; // midnight in Manila

  it('shows the answer itself, offering contact when the site does not say', () => {
    assert.deepEqual(message('answered', { status: 'ok', answer: 'Yes.' }), { text: 'Yes.', contact: false });
    assert.deepEqual(message('unknown', { status: 'unknown', answer: 'The site does not say.' }), {
      text: 'The site does not say.',
      contact: true,
    });
    assert.deepEqual(message('offTopic', { status: 'off_topic', answer: 'I only answer about my work.' }), {
      text: 'I only answer about my work.',
      contact: false,
    });
  });

  it('gives each limit with the time it resets, and no error', () => {
    assert.deepEqual(message('visitorLimit', { status: 'visitor_limit', resetAt }, options), {
      text: "You've reached the question limit for now. You can ask again at 12:00 AM.",
      contact: true,
    });
    assert.deepEqual(message('resting', { status: 'resting', resetAt }, options), {
      text: "I'm resting for now, and back at 12:00 AM. The rest of the site works as usual.",
      contact: true,
    });
    assert.deepEqual(message('resting', { status: 'resting' }, options), {
      text: "I'm resting for now. The rest of the site works as usual.",
      contact: true,
    });
  });

  it('says plainly when the service could not be reached', () => {
    assert.deepEqual(message('failed', { status: 'failed' }), {
      text: "I couldn't reach the service. Try again, or get in touch.",
      contact: true,
    });
  });

  it('says nothing new in the other states', () => {
    for (const state of ['idle', 'opening', 'open', 'waiting', 'closing']) assert.equal(message(state), null);
  });

  it('keeps the copy plain: no exclamation marks, no count of questions left', () => {
    const all = [
      ...Object.values(COPY).flat(),
      ...['visitorLimit', 'resting', 'failed'].map((s) => message(s, { status: 'resting', resetAt }, options).text),
    ];
    for (const line of all) {
      assert.ok(!line.includes('!'), line);
      assert.ok(!/left today|questions left/i.test(line), line);
    }
  });

  it('formats a reset time in the given clock', () => {
    assert.equal(formatTime('2026-10-26T07:04:00.000Z', options), '3:04 PM');
  });
});

describe('questions and history', () => {
  it('sends a question of 1 to 200 characters, tidied', () => {
    assert.equal(question('  What   do you do?  '), 'What do you do?');
    assert.equal(question('   '), null);
    assert.equal(question('x'.repeat(MAX_QUESTION)), 'x'.repeat(MAX_QUESTION));
    assert.equal(question('x'.repeat(MAX_QUESTION + 1)), null);
  });

  it('keeps the Worker\'s signature with each exchange', () => {
    const sig = 'a'.repeat(64);
    assert.deepEqual(remember([], 'q', 'a', sig), [{ q: 'q', a: 'a', sig }]);
    assert.equal(readReply(200, { status: 'ok', answer: 'a', sources: [{ title: 'Home', path: '/' }], sig }).sig, sig);
    assert.equal(readReply(200, { status: 'ok', answer: 'a', sources: [], sig: 'not hex' }).sig, undefined);
  });

  it('remembers only the last two exchanges', () => {
    let history = [];
    for (const n of [1, 2, 3]) history = remember(history, `q${n}`, `a${n}`);
    assert.equal(history.length, HISTORY_LENGTH);
    assert.deepEqual(history, [
      { q: 'q2', a: 'a2' },
      { q: 'q3', a: 'a3' },
    ]);
  });
});
