// @ts-check
// The Ask bot's knowledge file, /ask-knowledge.json (ask bot spec, "The
// knowledge file"; R12). Built at build time from the sources ALLOWLIST names
// and nothing else, so the bot can only answer from what the site already
// publishes. Plain .mjs so the Node tests can build it from the same sources;
// src/pages/ask-knowledge.json.ts feeds it for the site.

/** Every source the knowledge file may read. The test checks the file against it. */
export const ALLOWLIST = Object.freeze([
  'src/data/home.ts',
  'docs/references/profile.md',
  'src/content/posts/*.md',
  'src/data/accomplishments.json',
  // Only author.linkedin (the contact line) and accomplishmentsPerPage.
  'src/site.ts',
]);

/** The only sections of the profile the bot reads; the rest (the current role) stays out. */
export const PROFILE_SECTIONS = Object.freeze(['Summary', 'Highlights', 'Disciplines', 'Skills inventory']);

/** How much of each post's body the bot reads. */
export const POST_OPENING = 600;

/** The file's cap: about 40,000 tokens. */
export const MAX_BYTES = 150 * 1024;

/** What must never be in the file (CLAUDE.md, "Never publish sensitive or identifying data"). */
export const FORBIDDEN = Object.freeze([
  { name: 'email address', pattern: /[\w.+-]+@[\w-]+(\.[\w-]+)+/ },
  { name: 'phone number', pattern: /(\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4})|\b0\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/ },
  { name: 'API key', pattern: /\bsk-[\w-]{8,}/ },
  { name: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{8,}/ },
  { name: 'AWS key', pattern: /\bAKIA[0-9A-Z]{12,}/ },
  { name: 'private key', pattern: /-----BEGIN/ },
]);

/**
 * @typedef {object} Entry
 * @property {string} path The site path an answer cites, such as "/blog/" or "/#range".
 * @property {string} title
 * @property {'home' | 'profile' | 'post' | 'achievement'} kind
 * @property {string} text Plain text.
 */

/**
 * @typedef {object} Knowledge
 * @property {string} generatedAt
 * @property {Entry[]} entries Sorted by path, then title, so the bytes are stable.
 */

/**
 * Markdown to plain text: no code, images, HTML or markup, links as their
 * text, and anything shaped like an email address dropped.
 * @param {string} markdown
 */
export function plainText(markdown) {
  return markdown
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*\|?\s*-{3,}.*$/gm, ' ')
    .replace(/\|/g, ' ')
    .replace(/(\*\*|__|\*|_)(\S[^*_]*?)\1/g, '$2')
    .replace(new RegExp(FORBIDDEN[0].pattern.source, 'g'), ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The profile's allowlisted sections, as plain text, each under its heading.
 * @param {string} markdown docs/references/profile.md
 */
export function profileText(markdown) {
  const sections = markdown.split(/^## /m).slice(1);
  return PROFILE_SECTIONS.map((name) => {
    const section = sections.find((s) => s.startsWith(`${name}\n`));
    if (!section) throw new Error(`profile.md has no "## ${name}" section`);
    return `${name}: ${plainText(section.slice(name.length + 1))}`;
  }).join('\n');
}

/**
 * @typedef {object} HomeCopy
 * @property {{ title: string, accent: string, lede: string }} hero
 * @property {{ title: string, accent: string, lede: string }} range
 * @property {readonly { name: string }[]} classes
 * @property {string} contact Where to get in touch.
 */

/** @param {HomeCopy} home @returns {Entry} */
export function homeEntry(home) {
  const classes = home.classes.map((c) => c.name).join(', ');
  return {
    path: '/',
    title: 'Home',
    kind: 'home',
    text: [
      `${home.hero.title} ${home.hero.accent}`,
      home.hero.lede,
      `${home.range.title} ${home.range.accent} ${home.range.lede}`,
      `The disciplines, as the Range's classes: ${classes}.`,
      `Get in touch: on LinkedIn, ${home.contact}.`,
    ].join('\n'),
  };
}

/** @param {string} markdown @returns {Entry} */
export function profileEntry(markdown) {
  return { path: '/#range', title: 'Range', kind: 'profile', text: profileText(markdown) };
}

/**
 * @typedef {object} PostSource
 * @property {string} title
 * @property {string} date YYYY-MM-DD
 * @property {string} [description]
 * @property {string} path The post's URL path, with slashes.
 * @property {string} body Its Markdown.
 */

/** @param {PostSource} post @returns {Entry} */
export function postEntry(post) {
  const opening = plainText(post.body).slice(0, POST_OPENING);
  const lines = [`Blog post, ${post.date}.`];
  if (post.description) lines.push(plainText(post.description));
  lines.push(opening);
  return { path: post.path, title: post.title, kind: 'post', text: lines.join('\n') };
}

/**
 * One entry per earned (done) accomplishment, citing the /achievements/ page
 * it's listed on. None while the data is the "unavailable" placeholder.
 * @param {unknown} data src/data/accomplishments.json
 * @param {number} perPage
 * @returns {Entry[]}
 */
export function achievementEntries(data, perPage) {
  const raw = /** @type {{ status?: unknown, items?: unknown }} */ (data ?? {});
  if (raw.status !== 'ok' || !Array.isArray(raw.items)) return [];
  /** @type {any[]} */
  const done = raw.items.filter(
    (item) => item?.done === true && typeof item.title === 'string' && typeof item.description === 'string',
  );
  return done.map((item, i) => {
    const page = Math.floor(i / perPage) + 1;
    const when = typeof item.startDate === 'string' ? ` (${item.startDate})` : '';
    return {
      path: page === 1 ? '/achievements/' : `/achievements/page${page}/`,
      title: item.title,
      kind: 'achievement',
      text: `Achievement${when}: ${plainText(item.description)}`,
    };
  });
}

/**
 * @param {object} sources
 * @param {HomeCopy} sources.home
 * @param {string} sources.profile docs/references/profile.md
 * @param {PostSource[]} sources.posts
 * @param {unknown} sources.accomplishments src/data/accomplishments.json
 * @param {number} sources.perPage Achievements per page.
 * @param {string} sources.generatedAt
 * @returns {Knowledge}
 */
export function buildKnowledge({ home, profile, posts, accomplishments, perPage, generatedAt }) {
  const entries = [
    homeEntry(home),
    profileEntry(profile),
    ...posts.map(postEntry),
    ...achievementEntries(accomplishments, perPage),
  ].sort((a, b) => (a.path === b.path ? a.title.localeCompare(b.title) : a.path < b.path ? -1 : 1));
  return { generatedAt, entries };
}

/**
 * What's wrong with a knowledge file: its size, and any forbidden pattern.
 * @param {string} json
 * @returns {string[]}
 */
export function problems(json) {
  const found = [];
  const bytes = new TextEncoder().encode(json).length;
  if (bytes > MAX_BYTES) found.push(`${bytes} bytes, over the ${MAX_BYTES}-byte cap`);
  for (const { name, pattern } of FORBIDDEN) {
    const match = pattern.exec(json);
    if (match) found.push(`${name}: "${match[0]}"`);
  }
  return found;
}
