// Checks for the Ask bot's knowledge file (ask bot spec, "The knowledge
// file"; R12, R13): it's built only from the allowlisted sources, stays under
// its cap, and holds nothing CLAUDE.md says is never published.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { describe, it } from 'node:test';

import {
  ALLOWLIST,
  FORBIDDEN,
  MAX_BYTES,
  POST_OPENING,
  PROFILE_SECTIONS,
  buildKnowledge,
  plainText,
  problems,
} from '../src/lib/ask-knowledge.mjs';
import { heroCopy, rangeClasses, rangeCopy } from '../src/data/home.ts';
import { site } from '../src/site.ts';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const fixture = async (name) => JSON.parse(await read(`scripts/fixtures/${name}`));

/** The posts as src/lib/posts.ts reads them: front matter, body and URL. */
async function posts() {
  const files = (await readdir(new URL('src/content/posts/', root))).filter((f) => f.endsWith('.md'));
  return Promise.all(
    files.map(async (file) => {
      const text = await read(`src/content/posts/${file}`);
      const [, head, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
      const field = (name) => new RegExp(`^${name}: (.*)$`, 'm').exec(head)?.[1];
      const [, year, month, day, slug] = /^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/.exec(file);
      const categories = [...new Set(field('categories').toLowerCase().split(/\s+/))];
      return {
        title: field('title'),
        date: `${year}-${month}-${day}`,
        description: field('description'),
        path: `/${[...categories, year, month, day, slug].join('/')}/`,
        body,
      };
    }),
  );
}

async function build(accomplishments) {
  return buildKnowledge({
    home: { hero: heroCopy, range: rangeCopy, classes: rangeClasses, contact: site.author.linkedin },
    profile: await read('docs/references/profile.md'),
    posts: await posts(),
    accomplishments,
    perPage: site.accomplishmentsPerPage,
    generatedAt: '2026-10-26T00:00:00.000Z',
  });
}

const placeholder = async () => JSON.parse(await read('src/data/accomplishments.json'));

describe('the knowledge file', () => {
  it('has the home page, the profile and every post, and no achievements while the data is the placeholder', async () => {
    const { entries } = await build(await placeholder());
    const postCount = (await posts()).length;
    assert.equal(entries.length, 2 + postCount);
    assert.deepEqual(
      entries.filter((e) => e.kind !== 'post').map((e) => [e.kind, e.path]),
      [
        ['home', '/'],
        ['profile', '/#range'],
      ],
    );
    assert.ok(entries.every((e) => e.path.startsWith('/') && e.title && e.text));
  });

  it('adds only the earned achievements, citing the page each is listed on', async () => {
    const data = await fixture('accomplishments.json');
    const done = data.items.filter((item) => item.done);
    const achievements = (await build(data)).entries.filter((e) => e.kind === 'achievement');
    assert.equal(achievements.length, done.length);
    const pages = Math.ceil(done.length / site.accomplishmentsPerPage);
    assert.ok(pages > 1, 'the fixture spans more than one page');
    const expected = Array.from({ length: pages }, (_, i) => (i ? `/achievements/page${i + 1}/` : '/achievements/'));
    assert.deepEqual(achievements.map((e) => e.path), done.map((_, i) => expected[Math.floor(i / site.accomplishmentsPerPage)]));
    for (const item of data.items.filter((i) => !i.done)) {
      assert.ok(!achievements.some((e) => e.title === item.title), `locked "${item.title}" is left out`);
    }
  });

  it('is sorted by path, so its bytes are stable', async () => {
    const { entries } = await build(await fixture('accomplishments.json'));
    const paths = entries.map((e) => e.path);
    assert.deepEqual(paths, [...paths].sort());
    assert.equal(JSON.stringify(await build(await fixture('accomplishments.json'))), JSON.stringify(await build(await fixture('accomplishments.json'))));
  });

  it('reads only the allowlisted profile sections, never the current role', async () => {
    const profile = (await build(await placeholder())).entries.find((e) => e.kind === 'profile');
    assert.deepEqual(
      profile.text.split('\n').map((line) => line.split(':')[0]),
      [...PROFILE_SECTIONS],
    );
    const role = /## Current role\n([\s\S]*?)\n## /.exec(await read('docs/references/profile.md'))[1];
    const employer = /\bat ([A-Z]\w+)/.exec(role)[1];
    assert.ok(!profile.text.includes(employer), 'the current role section stays out');
  });

  it('reads at most the opening of each post', async () => {
    for (const post of (await build(await placeholder())).entries.filter((e) => e.kind === 'post')) {
      const [, , opening] = post.text.split('\n');
      assert.ok((opening ?? '').length <= POST_OPENING, post.path);
    }
  });

  for (const name of ['the placeholder', 'accomplishments.json', 'accomplishments-two-done.json']) {
    it(`stays under ${MAX_BYTES} bytes and holds nothing forbidden, with ${name}`, async () => {
      const data = name === 'the placeholder' ? await placeholder() : await fixture(name);
      const json = JSON.stringify(await build(data), null, 2);
      assert.deepEqual(problems(json), []);
      assert.ok(!json.includes(site.author.email), 'no email address');
    });
  }

  it('is built only from the allowlisted sources', async () => {
    const page = await read('src/pages/ask-knowledge.json.ts');
    const imports = [...page.matchAll(/from '([^']+)'/g)].map(([, spec]) => spec);
    const sources = {
      '../../docs/references/profile.md?raw': 'docs/references/profile.md',
      '../data/accomplishments.json': 'src/data/accomplishments.json',
      '../data/home': 'src/data/home.ts',
      '../lib/posts': 'src/content/posts/*.md',
      '../site': 'src/site.ts',
    };
    const code = ['astro', '../lib/ask-knowledge.mjs'];
    for (const spec of imports) {
      if (code.includes(spec)) continue;
      assert.ok(spec in sources, `${spec} isn't an allowlisted source`);
      assert.ok(ALLOWLIST.includes(sources[spec]), `${sources[spec]} isn't in ALLOWLIST`);
    }
    assert.match(page, /contact: site\.author\.linkedin/);
    assert.equal((page.match(/site\.author\.\w+/g) ?? []).join(), 'site.author.linkedin', 'only the LinkedIn link');
  });
});

describe('the knowledge checks', () => {
  it('find each forbidden pattern', () => {
    const samples = {
      'email address': 'write to someone@example.com',
      'phone number': 'call +63 917 123 4567',
      'API key': 'sk-ant-api03-abcdefghijk',
      'GitHub token': 'ghp_abcdefghijklmnop1234',
      'AWS key': 'AKIAABCDEFGHIJKLMNOP',
      'private key': '-----BEGIN PRIVATE KEY-----',
    };
    assert.deepEqual(Object.keys(samples), FORBIDDEN.map((f) => f.name));
    for (const [name, sample] of Object.entries(samples)) {
      assert.match(problems(sample).join(), new RegExp(`^${name}`), name);
    }
  });

  it('flag a file over the cap', () => {
    assert.match(problems('x'.repeat(MAX_BYTES + 1)).join(), /over the/);
  });

  it('turn Markdown into plain text, dropping code and email addresses', () => {
    assert.equal(
      plainText('## Hi\n\nA **bold** [link](https://x.y) and `code`.\n\n```js\nsecret()\n```\n\nMail me@example.com now.'),
      'Hi A bold link and code. Mail now.',
    );
  });
});
