// Browser checks for the Ask bot (ask bot spec R1–R3, R5–R10, R15–R19; plan
// step A6): the bubble by the island's character, the jump and the glide to
// the bottom left, focus in and out, Escape, every reply the Worker can give
// (stubbed), same-site source links only, no horizontal scroll at 1440px and
// 390px, no glide or jump under reduced motion, and the island's character
// back after closing. A build without PUBLIC_ASK_ENDPOINT has no bubble and
// loads no Ask script.
//
// These checks need builds with and without the endpoint, not the dist/ the
// runner serves, so this suite builds its own into .e2e-output/ask/ (on, off)
// and serves each with a small static server. The Worker's address is
// https://ask.e2e.invalid/ask, which Playwright's page.route answers; nothing
// leaves the machine.
//
// With ASK_SCREENSHOTS=<dir> set, the behaviour sequence also saves the
// plan's sixteen screenshots (step A8) into <dir>.
//
// Run with `npm run e2e`, or alone with `npm run e2e -- scripts/e2e/ask.e2e.mjs`.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { readFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { COPY, TIMEOUT_MS, message } from '../../src/lib/ask-state.mjs';
import { launch, loadPlaywright } from './browser.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ASTRO = join(ROOT, 'node_modules', '.bin', 'astro');
const BUILDS = join(ROOT, '.e2e-output', 'ask');
const ENDPOINT = 'https://ask.e2e.invalid/ask';
const SHOTS = process.env.ASK_SCREENSHOTS ? resolve(ROOT, process.env.ASK_SCREENSHOTS) : '';
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
/** The jump (the hop state, 480 ms) and the glide (0.5 s), with slack. */
const OPEN_MS = 1400;
const RESET_AT = new Date(Date.now() + 3 * 3600_000).toISOString();

/** The Worker's replies, one per row of the spec's response table. */
const REPLIES = {
  ok: {
    status: 200,
    body: {
      status: 'ok',
      answer: 'I lead full-stack teams, design data platforms on Microsoft Fabric, and run releases with sign-offs and rollback.',
      sources: [
        { title: 'Home', path: '/' },
        { title: 'Somewhere else', path: 'https://example.com/' },
        { title: 'Script', path: 'javascript:alert(1)' },
      ],
      sig: 'a'.repeat(64),
    },
  },
  unknown: {
    status: 200,
    body: { status: 'unknown', answer: "My site doesn't say whether I'm taking on new work. The best way to ask is to get in touch.", sources: [] },
  },
  offTopic: {
    status: 200,
    body: { status: 'off_topic', answer: 'I only answer questions about me and my work. Try one of the questions below.', sources: [] },
  },
  visitorLimit: { status: 429, body: { status: 'visitor_limit', resetAt: RESET_AT } },
  resting: { status: 503, body: { status: 'resting', resetAt: RESET_AT } },
  invalid: { status: 400, body: { status: 'invalid' } },
  failed: { status: 502, body: { status: 'failed' } },
};

/** @type {import('playwright').Browser} */
let browser;
/** @type {Record<'on' | 'off', { url: string, server: import('node:http').Server }>} */
const sites = /** @type {any} */ ({});

before(async () => {
  const playwright = await loadPlaywright();
  if (!playwright) throw new Error('Playwright not found: browser checks NOT RUN');
  for (const variant of /** @type {const} */ (['on', 'off'])) {
    const outDir = join(BUILDS, variant);
    await rm(outDir, { recursive: true, force: true });
    const { PUBLIC_ASK_ENDPOINT, ...env } = process.env;
    if (variant === 'on') env.PUBLIC_ASK_ENDPOINT = ENDPOINT;
    const result = spawnSync(ASTRO, ['build', '--outDir', outDir], { cwd: ROOT, encoding: 'utf8', env });
    if (result.status !== 0) throw new Error(`The "${variant}" build failed:\n${result.stdout}${result.stderr}`);
    sites[variant] = await serve(outDir);
  }
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  browser = await launch(playwright);
});

after(async () => {
  await browser?.close();
  await Promise.all(Object.values(sites).map(({ server }) => new Promise((done) => server.close(done))));
});

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

/** Serves a build on a free port. */
function serve(dir) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    const file = normalize(join(dir, path.endsWith('/') ? `${path}index.html` : path));
    if (file !== dir && !file.startsWith(dir + sep)) return void res.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory()) return void res.writeHead(301, { location: `${path}/` }).end();
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
    }
  });
  return new Promise((done, fail) => {
    server.on('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
      done({ url: `http://127.0.0.1:${port}`, server });
    });
  });
}

// ------------------------------------------------------------------ helpers

/**
 * The home page with the Worker stubbed, once the island has built and the
 * bubble shows. `replies` answers each question in turn; a reply of 'hang'
 * never answers, 'abort' fails the request, and `delay` holds each reply.
 */
async function home({ viewport = DESKTOP, reducedMotion = 'no-preference', replies = [], delay = 0, variant = 'on' } = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion });
  const queue = [...replies];
  /** @type {any[]} */
  const asked = [];
  await page.route(ENDPOINT, async (route) => {
    asked.push(route.request().postDataJSON());
    const reply = queue.shift() ?? 'ok';
    if (reply === 'hang') return;
    if (reply === 'abort') return route.abort();
    if (delay) await new Promise((done) => setTimeout(done, delay));
    const { status, body } = REPLIES[reply];
    await route
      .fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
      .catch(() => {});
  });
  const response = await page.goto(`${sites[variant].url}/`);
  assert.equal(response?.status(), 200);
  await page.evaluate(() => document.fonts.ready);
  if (variant === 'on') {
    await page.locator('.ask-bubble').waitFor({ state: 'visible' });
    await settle(page);
  }
  await page.mouse.move(0, 0);
  return { page, asked };
}

/** Waits for the island's entrance to end. */
async function settle(page) {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.hero-island .enter')].every((g) =>
        g.getAnimations().every((a) => a.playState === 'finished'),
      ),
    undefined,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(200);
}

/** The character's foot and head on screen, from its enter group (as ask-loader.ts reads it). */
const character = (page) =>
  page.evaluate(() => {
    const island = /** @type {SVGSVGElement} */ (document.querySelector('.hero-island'));
    const foot = /** @type {SVGGElement} */ (island.querySelector('.ask-character')?.closest('.enter'));
    const vb = island.viewBox.baseVal;
    const art = island.getBoundingClientRect();
    const s = art.width / vb.width;
    const x = art.left + (Number(foot.dataset.x) - vb.x) * s;
    const y = art.top + (Number(foot.dataset.y) - vb.y) * s;
    return { x, y, head: y - 29 * s, s };
  });

const rect = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  }, selector);

/** Opens the panel with a press on the bubble and waits for the glide to end. */
async function openPanel(page) {
  await page.locator('.ask-bubble').click();
  await page.locator('.ask-panel').waitFor({ state: 'visible' });
  await page.waitForTimeout(OPEN_MS);
}

/** Asks a question by typing it, and waits for the reply to show. */
async function ask(page, text) {
  const before = await page.locator('.ask-msg--bot').count();
  await page.locator('.ask-panel__input').fill(text);
  await page.locator('.ask-panel__submit').click();
  await page.waitForFunction(
    (n) => document.querySelectorAll('.ask-msg--bot:not(.ask-msg--waiting)').length > n,
    before,
    { timeout: TIMEOUT_MS + 4000 },
  );
  return page.locator('.ask-msg--bot').last();
}

const noHorizontalScroll = async (page, label) => {
  const [scroll, client] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(scroll <= client, `${label}: no horizontal scroll (${scroll} > ${client})`);
};

const shot = async (page, name) => {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`) });
};

const said = (state, reply) => message(state, reply).text;
const limitTime = (state) =>
  said(state, { status: state === 'resting' ? 'resting' : 'visitor_limit', resetAt: RESET_AT });

// ------------------------------------------------------------------ checks

for (const [label, viewport] of /** @type {const} */ ([
  ['1440px', DESKTOP],
  ['390px', PHONE],
])) {
  describe(`at ${label}`, () => {
    test('the bubble says hello beside the character, and is a real button', async () => {
      const { page } = await home({ viewport });
      const bubble = page.locator('.ask-bubble');
      assert.equal(await bubble.textContent(), COPY.bubble);
      assert.equal(await bubble.evaluate((b) => b.tagName), 'BUTTON');
      const box = await rect(page, '.ask-bubble');
      const at = await character(page);
      assert.ok(Math.abs(box.bottom + 12 - at.head) <= 2, `the bubble's foot is just above the head (${box.bottom} vs ${at.head})`);
      assert.ok(at.x >= box.left && at.x <= box.right + 24, 'the bubble is over the character');
      assert.ok(box.left >= 0 && box.right <= viewport.width, 'the bubble is on screen');
      assert.ok(box.height >= 44, '44px tap target');
      await noHorizontalScroll(page, 'idle');
      await page.close();
    });

    test('pressing the bubble jumps, glides the character to the bottom left and opens the panel', async () => {
      const { page } = await home({ viewport });
      const playing = page.evaluate(
        () =>
          new Promise((done) => {
            const figure = document.querySelector('.ask-character');
            new MutationObserver(() => figure?.getAttribute('data-play') === 'hop' && done(true)).observe(figure, {
              attributes: true,
            });
            setTimeout(() => done(false), 3000);
          }),
      );
      await page.locator('.ask-bubble').click();
      assert.equal(await playing, true, 'the character jumps (data-play="hop")');
      await page.locator('.ask-panel').waitFor({ state: 'visible' });
      await page.waitForTimeout(OPEN_MS);

      const dialog = page.locator('.ask-panel');
      assert.equal(await dialog.getAttribute('role'), 'dialog');
      assert.equal(await dialog.getAttribute('aria-label'), 'Ask J. Law');
      assert.equal(await dialog.getAttribute('aria-modal'), null, 'non-modal');
      const panel = await rect(page, '.ask-panel');
      const gutter = viewport.width > 640 ? 24 : 0;
      assert.ok(Math.abs(panel.left - gutter) <= 1, 'the panel is at the left');
      assert.ok(Math.abs(viewport.height - gutter - panel.bottom) <= 1, 'the panel is at the bottom');
      if (viewport.width <= 640) assert.ok(Math.abs(panel.width - viewport.width) <= 1, 'the panel takes the width (R19)');
      if (viewport.width <= 640) assert.ok(panel.height <= viewport.height * 0.6 + 1, 'at most 60% of the screen (R19)');

      const avatar = await rect(page, '.ask-avatar');
      assert.ok(Math.abs(avatar.left + 21 - (panel.left + 37)) <= 2, `the character stands at the panel's left (${avatar.left})`);
      assert.ok(Math.abs(avatar.top + 87 - (panel.top - 3)) <= 2, `the character stands on the panel's top edge (${avatar.top})`);
      assert.equal(await page.locator('.ask-avatar').getAttribute('aria-hidden'), 'true', 'the moving character is decorative');
      assert.equal(
        await page.evaluate(() => getComputedStyle(document.querySelector('.ask-character')).visibility),
        'hidden',
        'the island character is hidden while it is on the panel',
      );

      // R6: the AI label and the "can be wrong" line before any question; R10: no count.
      assert.equal(await page.locator('.ask-panel__label').textContent(), COPY.label);
      assert.equal(await page.locator('.ask-msg--bot').first().textContent(), COPY.first);
      assert.equal(await page.locator('.ask-panel__privacy').textContent(), COPY.privacy);
      assert.deepEqual(await page.locator('.ask-chip').allTextContents(), [...COPY.chips]);
      assert.ok(!/left today|questions left/i.test(await dialog.textContent()), 'no count of questions left');
      for (const box of await page.locator('.ask-panel button, .ask-panel input').evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().height),
      )) {
        assert.ok(box >= 44, `44px tap targets (${box})`);
      }
      await noHorizontalScroll(page, 'open');
      await page.close();
    });

    test('focus moves to the question box, and back to the bubble on Close and on Escape', async () => {
      const { page } = await home({ viewport });
      await openPanel(page);
      assert.equal(await page.evaluate(() => document.activeElement?.className), 'ask-panel__input');
      await page.locator('.ask-panel__close').click();
      await page.waitForTimeout(800);
      assert.equal(await page.locator('.ask-panel').isVisible(), false);
      assert.equal(await page.evaluate(() => document.activeElement?.className), 'ask-bubble');

      await page.locator('.ask-bubble').press('Enter');
      await page.locator('.ask-panel').waitFor({ state: 'visible' });
      await page.waitForTimeout(OPEN_MS);
      assert.equal(await page.evaluate(() => document.activeElement?.className), 'ask-panel__input');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      assert.equal(await page.locator('.ask-panel').isVisible(), false, 'Escape closes');
      assert.equal(await page.evaluate(() => document.activeElement?.className), 'ask-bubble');
      assert.equal(
        await page.evaluate(() => getComputedStyle(document.querySelector('.ask-character')).visibility),
        'visible',
        'the island character is back',
      );
      assert.equal(await page.locator('.ask-avatar').isVisible(), false);
      await page.close();
    });

    test('an answer shows with its same-site source links only, and the conversation goes with the next question', async () => {
      const { page, asked } = await home({ viewport, replies: ['ok', 'ok', 'ok', 'ok'] });
      await openPanel(page);
      const reply = await ask(page, 'What do you do?');
      assert.match(await reply.textContent(), /^I lead full-stack teams/);
      const links = await reply.locator('a').evaluateAll((as) => as.map((a) => [a.textContent, a.getAttribute('href')]));
      assert.deepEqual(links, [['Source: Home', '/']], 'only the same-site source is linked');
      await ask(page, 'Which stack do you use?');
      await ask(page, 'And data?');
      await page.locator('.ask-chip').first().click();
      await page.waitForFunction(() => document.querySelectorAll('.ask-msg--you').length === 4);
      await page.waitForFunction(() => !document.querySelector('.ask-msg--waiting'));
      assert.deepEqual(asked[0], { question: 'What do you do?', history: [] });
      assert.equal(asked[1].history[0].sig, 'a'.repeat(64), 'the Worker\'s signature goes back with the exchange');
      assert.equal(asked[3].question, 'What do you do?');
      assert.deepEqual(
        asked[3].history.map((h) => h.q),
        ['Which stack do you use?', 'And data?'],
        'only the last two exchanges go along (R11)',
      );
      assert.equal(await page.locator('.ask-panel__input').getAttribute('maxlength'), '200');
      for (const height of await page.locator('.ask-msg a').evaluateAll((as) => as.map((a) => a.getBoundingClientRect().height))) {
        assert.ok(height >= 44, `links are 44px tap targets (${height})`);
      }
      await noHorizontalScroll(page, 'answered');
      await page.close();
    });
  });
}

describe('each reply the Worker can give', () => {
  const cases = /** @type {const} */ ([
    ['not on the site', 'unknown', 'unknown', () => REPLIES.unknown.body.answer, true],
    ['off topic', 'offTopic', 'offTopic', () => REPLIES.offTopic.body.answer, false],
    ['visitor limit', 'visitorLimit', 'visitorLimit', () => limitTime('visitorLimit'), true],
    ['site limit or switched off', 'resting', 'resting', () => limitTime('resting'), true],
    ['bad input', 'invalid', 'failed', () => COPY.failed, true],
    ['the AI service unavailable (502)', 'failed', 'failed', () => COPY.failed, true],
    ['a network failure', 'abort', 'failed', () => COPY.failed, true],
  ]);
  for (const [name, reply, state, text, contact] of cases) {
    test(`${name}: says so plainly`, async () => {
      const { page } = await home({ replies: [reply] });
      await openPanel(page);
      const shown = await ask(page, 'A question');
      const words = await shown.evaluate((li) => li.firstChild?.textContent);
      assert.equal(words, text(), state);
      const links = await shown.locator('a').allTextContents();
      assert.deepEqual(links, contact ? ['Get in touch'] : [], 'a "Get in touch" link where it helps');
      const disabled = await page.locator('.ask-panel__submit').isDisabled();
      assert.equal(disabled, state === 'visitorLimit' || state === 'resting', 'no more questions past a limit');
      await page.close();
    });
  }

  test(`a Worker that doesn't answer in ${TIMEOUT_MS / 1000}s: fails plainly`, async () => {
    const { page } = await home({ replies: ['hang'] });
    await openPanel(page);
    const shown = await ask(page, 'A question');
    assert.equal(await shown.evaluate((li) => li.firstChild?.textContent), COPY.failed);
    assert.equal(await page.locator('.ask-panel__submit').isDisabled(), false, 'can try again');
    await page.close();
  });

  test('while waiting, Ask and the chips are disabled and three dots show', async () => {
    const { page } = await home({ replies: ['ok'], delay: 1500 });
    await openPanel(page);
    await page.locator('.ask-chip').nth(1).click();
    await page.locator('.ask-msg--waiting').waitFor();
    assert.equal(await page.locator('.ask-msg--waiting span').count(), 3);
    for (const button of await page.locator('.ask-chip, .ask-panel__submit').all()) assert.ok(await button.isDisabled());
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'ask-panel__input', 'focus waits in the box');
    await page.locator('.ask-msg--waiting').waitFor({ state: 'detached' });
    assert.ok(!(await page.locator('.ask-panel__submit').isDisabled()));
    await page.close();
  });
});

describe('one question at a time', () => {
  test('closing and reopening while waiting does not let a second question through', async () => {
    // The reply takes 6 s (inside the panel's 8 s), longer than closing and reopening.
    const { page, asked } = await home({ replies: ['ok', 'ok'], delay: 6000 });
    await openPanel(page);
    await page.locator('.ask-chip').first().click();
    await page.locator('.ask-msg--waiting').waitFor();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    await page.locator('.ask-bubble').click();
    await page.locator('.ask-panel').waitFor({ state: 'visible' });
    await page.waitForTimeout(OPEN_MS);
    assert.ok(await page.locator('.ask-panel__submit').isDisabled(), 'Ask stays off while the first is out');
    assert.equal(await page.locator('.ask-msg--waiting').count(), 1, 'still waiting on the first');
    await page.locator('.ask-msg--waiting').waitFor({ state: 'detached', timeout: 8000 });
    assert.equal(asked.length, 1);
    assert.ok(!(await page.locator('.ask-panel__submit').isDisabled()));
    await page.close();
  });

  test('if the panel cannot load, the bubble goes instead of staying a dead button', async () => {
    const { page } = await home();
    await page.route(/\/_astro\/ask\.[^/]*\.js$/, (route) => route.abort());
    await page.locator('.ask-bubble').click();
    await page.locator('.ask-bubble').waitFor({ state: 'hidden', timeout: 5000 });
    assert.equal(await page.locator('.ask-panel').count(), 0);
    await page.close();
  });
});

describe('under reduced motion', () => {
  test('the character moves to the panel without a jump or a glide, and does not bob', async () => {
    const { page } = await home({ reducedMotion: 'reduce' });
    let jumped = false;
    await page.exposeFunction('jumped', () => (jumped = true));
    await page.evaluate(() => {
      const figure = document.querySelector('.ask-character');
      new MutationObserver(() => figure?.hasAttribute('data-play') && window.jumped()).observe(figure, { attributes: true });
    });
    await page.locator('.ask-bubble').click();
    await page.locator('.ask-panel').waitFor({ state: 'visible' });
    await page.waitForTimeout(100);
    assert.equal(jumped, false, 'no jump');
    assert.equal(await page.evaluate(() => document.querySelector('.ask-avatar').getAnimations().length), 0, 'no glide');
    const panel = await rect(page, '.ask-panel');
    const avatar = await rect(page, '.ask-avatar');
    assert.ok(Math.abs(avatar.top + 87 - (panel.top - 3)) <= 2, 'already on the panel');
    const moving = await page.evaluate(() =>
      [...document.querySelectorAll('.ask-avatar svg g')].filter((g) => getComputedStyle(g).animationName !== 'none').length,
    );
    assert.equal(moving, 0, 'the avatar does not bob');
    await shot(page, '13-reduced-motion');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.ask-avatar').isVisible(), false);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.ask-character')).visibility), 'visible');
    await page.close();
  });
});

describe('without PUBLIC_ASK_ENDPOINT (pull request previews, local dev)', () => {
  test('there is no bubble and no Ask script, and the page works as before', async () => {
    const page = await browser.newPage({ viewport: DESKTOP });
    /** @type {string[]} */
    const scripts = [];
    page.on('request', (request) => request.resourceType() === 'script' && scripts.push(request.url()));
    await page.goto(`${sites.off.url}/`);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('.ask, .ask-bubble').count(), 0, 'no bubble');
    assert.ok(!scripts.some((url) => /ask/i.test(url.split('/').pop() ?? '')), `no Ask script (${scripts.join(', ')})`);
    assert.ok(!(await page.content()).includes('ask-panel'), 'no panel shell');
    assert.equal(await page.locator('.hero-island .ask-character').count(), 1, 'the character still stands on the island');
    await page.close();
  });

  test('the knowledge file is published either way', async () => {
    for (const variant of /** @type {const} */ (['on', 'off'])) {
      const response = await fetch(`${sites[variant].url}/ask-knowledge.json`);
      assert.equal(response.status, 200);
      const { entries } = await response.json();
      assert.ok(entries.some((e) => e.path === '/'), variant);
    }
  });
});

describe('the behaviour sequence', () => {
  test('idle, focus, glide, open, waiting, answer, the guardrail states and close, at 1440px and 390px', async () => {
    // 01–06 and 12: one conversation at 1440px.
    const { page } = await home({ replies: ['ok'], delay: 1500 });
    await shot(page, '01-idle');
    for (let i = 0; i < 30 && (await page.evaluate(() => document.activeElement?.className)) !== 'ask-bubble'; i++) {
      await page.keyboard.press('Tab');
    }
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'ask-bubble', 'the bubble is in the tab order');
    assert.ok(await page.locator('.ask-bubble').evaluate((b) => b.matches(':focus-visible')), 'with the focus ring');
    await shot(page, '02-bubble-focus');
    await page.keyboard.press('Enter');
    // The jump takes 480 ms, then the glide 500 ms: about 250 ms into the glide.
    await page.waitForTimeout(480 + 250);
    await shot(page, '03-glide-mid');
    await page.waitForTimeout(OPEN_MS);
    await shot(page, '04-open');
    await page.locator('.ask-chip').first().click();
    await page.locator('.ask-msg--waiting').waitFor();
    await shot(page, '05-waiting');
    await page.locator('.ask-msg--waiting').waitFor({ state: 'detached' });
    await page.mouse.move(0, 0);
    await shot(page, '06-answered');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(OPEN_MS);
    await shot(page, '12-closed');
    await page.close();

    // 07–11: each guardrail state on its own.
    for (const [name, reply] of [
      ['07-unknown', 'unknown'],
      ['08-off-topic', 'offTopic'],
      ['09-visitor-limit', 'visitorLimit'],
      ['10-resting', 'resting'],
      ['11-failed', 'abort'],
    ]) {
      const { page: p } = await home({ replies: [reply] });
      await openPanel(p);
      await ask(p, reply === 'offTopic' ? 'Can you write me a poem?' : reply === 'unknown' ? 'Are you open to work?' : 'What do you do?');
      await p.mouse.move(0, 0);
      await shot(p, name);
      await p.close();
    }

    // 14–16: the phone.
    const { page: phone } = await home({ viewport: PHONE, replies: ['ok'] });
    await shot(phone, '14-390-idle');
    await openPanel(phone);
    await shot(phone, '15-390-open');
    await ask(phone, 'What do you do?');
    await shot(phone, '16-390-answered');
    await noHorizontalScroll(phone, '390 answered');
    await phone.close();
  });
});
