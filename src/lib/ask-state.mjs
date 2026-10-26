// @ts-check
// The Ask panel's pure logic (ask bot spec, "The panel"; R3–R11): its states
// and transitions, how a reply from the Worker is read, and the copy for each
// state. Plain .mjs so the Node tests can import it; src/lib/ask.ts runs it
// in the page.

/** Every state the panel can be in. */
export const STATES = Object.freeze([
  'idle',
  'opening',
  'open',
  'waiting',
  'answered',
  'unknown',
  'offTopic',
  'visitorLimit',
  'resting',
  'failed',
  'closing',
]);

/** The longest question (R11). */
export const MAX_QUESTION = 200;

/** How many earlier exchanges go with each question (R11). */
export const HISTORY_LENGTH = 2;

/** How long the panel waits for the Worker. */
export const TIMEOUT_MS = 8000;

/** The panel's copy, word for word from the spec. */
export const COPY = Object.freeze({
  bubble: "Hi, I'm J. Law. What would you like to know?",
  title: 'Ask J. Law',
  label: "AI avatar. Answers come from this site's public content.",
  first: "I'm an AI avatar of J. Law. I answer from what's published on this site, and I can be wrong.",
  privacy: "Questions go to an AI service. Don't include personal details.",
  failed: "I couldn't reach the service. Try again, or get in touch.",
  chips: Object.freeze(['What do you do?', 'Which stack do you use?', 'Are you open to work?']),
});

/** The states a visitor can ask a question from. */
const ASKING = new Set(['open', 'answered', 'unknown', 'offTopic', 'failed']);

/** The states the panel is showing in. */
const SHOWING = new Set([...ASKING, 'waiting', 'visitorLimit', 'resting']);

/** What each reply status from the Worker turns into (spec, the Worker's table). */
const REPLY_STATE = Object.freeze({
  ok: 'answered',
  unknown: 'unknown',
  off_topic: 'offTopic',
  visitor_limit: 'visitorLimit',
  resting: 'resting',
});

/** @param {string} state */
export const canAsk = (state) => ASKING.has(state);

/** @param {string} state */
export const isShowing = (state) => SHOWING.has(state);

/**
 * @typedef {{ type: 'open' | 'opened' | 'ask' | 'fail' | 'close' | 'closed' | 'reset' }
 *   | { type: 'reply', status: string }} Event
 */

/**
 * The state after an event. An event that doesn't apply leaves the state as it is.
 * @param {string} state
 * @param {Event} event
 * @returns {string}
 */
export function next(state, event) {
  switch (event.type) {
    case 'open':
      return state === 'idle' ? 'opening' : state;
    case 'opened':
      return state === 'opening' ? 'open' : state;
    case 'ask':
      return canAsk(state) ? 'waiting' : state;
    case 'reply':
      return state === 'waiting' ? (REPLY_STATE[/** @type {keyof REPLY_STATE} */ (event.status)] ?? 'failed') : state;
    case 'fail':
      return state === 'waiting' ? 'failed' : state;
    case 'reset':
      return state === 'visitorLimit' || state === 'resting' ? 'open' : state;
    case 'close':
      return isShowing(state) || state === 'opening' ? 'closing' : state;
    case 'closed':
      return state === 'closing' ? 'idle' : state;
    default:
      return state;
  }
}

/** @param {unknown} value @returns {value is string} */
const text = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * A same-site path the panel may link to: it starts with one slash, so it
 * can't point at another site or run script.
 * @param {unknown} path
 */
export const isSitePath = (path) => typeof path === 'string' && /^\/(?![/\\])[^\s<>"]*$/.test(path);

/**
 * @typedef {object} Reply
 * @property {'ok' | 'unknown' | 'off_topic' | 'visitor_limit' | 'resting' | 'failed'} status
 * @property {string} [answer]
 * @property {{ title: string, path: string }[]} [sources]
 * @property {string} [resetAt] ISO time the limit resets.
 * @property {string} [sig] The Worker's signature of the exchange, sent back with it in the history.
 */

/**
 * Reads the Worker's response. Anything it doesn't expect is a failure, and
 * a source is kept only when its path is on this site.
 * @param {number} httpStatus
 * @param {unknown} body
 * @returns {Reply}
 */
export function readReply(httpStatus, body) {
  const raw = /** @type {Record<string, unknown>} */ (body && typeof body === 'object' ? body : {});
  const status = raw.status;
  if ((status === 'ok' || status === 'unknown' || status === 'off_topic') && httpStatus === 200) {
    if (!text(raw.answer)) return { status: 'failed' };
    const sources = (Array.isArray(raw.sources) ? raw.sources : [])
      .filter((s) => s && text(s.title) && isSitePath(s.path))
      .slice(0, 3)
      .map((s) => ({ title: String(s.title), path: String(s.path) }));
    /** @type {Reply} */
    const reply = { status, answer: raw.answer.trim(), sources: status === 'ok' ? sources : [] };
    if (typeof raw.sig === 'string' && /^[0-9a-f]{64}$/.test(raw.sig)) reply.sig = raw.sig;
    return reply;
  }
  if ((status === 'visitor_limit' && httpStatus === 429) || (status === 'resting' && httpStatus === 503)) {
    const resetAt = text(raw.resetAt) && !Number.isNaN(Date.parse(raw.resetAt)) ? raw.resetAt : undefined;
    return resetAt ? { status, resetAt } : { status };
  }
  return { status: 'failed' };
}

/**
 * A time of day in the visitor's own clock, such as "3:04 PM".
 * @param {string} iso
 * @param {{ locale?: string, timeZone?: string }} [options]
 */
export function formatTime(iso, { locale, timeZone } = {}) {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(iso));
}

/**
 * What the panel says in a state, and whether it offers "Get in touch".
 * @param {string} state
 * @param {Reply} [reply]
 * @param {{ locale?: string, timeZone?: string }} [options]
 * @returns {{ text: string, contact: boolean } | null}
 */
export function message(state, reply, options) {
  const at = reply?.resetAt ? formatTime(reply.resetAt, options) : '';
  switch (state) {
    case 'answered':
      return { text: reply?.answer ?? '', contact: false };
    case 'unknown':
      return { text: reply?.answer ?? '', contact: true };
    case 'offTopic':
      return { text: reply?.answer ?? '', contact: false };
    case 'visitorLimit':
      return {
        text: at
          ? `You've reached the question limit for now. You can ask again at ${at}.`
          : "You've reached the question limit for now. Try again later.",
        contact: true,
      };
    case 'resting':
      return {
        text: at
          ? `I'm resting for now, and back at ${at}. The rest of the site works as usual.`
          : "I'm resting for now. The rest of the site works as usual.",
        contact: true,
      };
    case 'failed':
      return { text: COPY.failed, contact: true };
    default:
      return null;
  }
}

/**
 * The question as it's sent, or null when it can't be (empty or too long).
 * @param {string} value
 */
export function question(value) {
  const q = value.replace(/\s+/g, ' ').trim();
  return q && q.length <= MAX_QUESTION ? q : null;
}

/**
 * The conversation sent with the next question: the last two exchanges, each
 * with the Worker's signature, without which the Worker ignores it.
 * @param {{ q: string, a: string, sig?: string }[]} history
 * @param {string} q
 * @param {string} a
 * @param {string} [sig]
 */
export const remember = (history, q, a, sig) => [...history, sig ? { q, a, sig } : { q, a }].slice(-HISTORY_LENGTH);
