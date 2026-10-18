// Browser checks for the accomplishments as achievement rows (gamified
// accomplishments spec R1–R3, R5–R9, R13, R17, R20; plan "Requirements to
// checks"): the rows, the home section, the paginated /achievements/ pages,
// the tooltip, the icon crop and the site's layout rules. The pixel-first look
// (its spec's Accomplishments, R3, R10–R12 and Tests) adds the rows' 3px
// edges, the two-column home section, and the Motion panel and entrances. The
// achievements redesign (its spec's R1–R20, "redesign R<n>" below) adds the
// headings and subtitles, the framed icons, the tally, the Latest chip, the
// "Achievement unlocked!" toast, the frame hop, the new URLs and their
// redirects, and the nav link.
//
// These checks need four datasets, not the one dist/ the runner serves, so
// this suite builds its own. In `before` it copies each fixture in
// scripts/fixtures/ over src/data/accomplishments.json in turn, runs
// `astro build --outDir .e2e-output/accomplishments/<variant>/`, and puts the
// original file back byte for byte as soon as the builds are done, on failure
// and on SIGINT/SIGTERM too. Each variant is then served by a small static
// server of its own. If a build fails, or a build didn't pick up its fixture,
// `before` throws and every check here fails: they never pass without running.
//
// Run with `npm run e2e` after `npm run build` (the other suites use dist/),
// or alone with `npm run e2e -- scripts/e2e/accomplishments.e2e.mjs`. Don't run
// `npm test` at the same time: it reads the placeholder this suite swaps.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CELL, FALLBACK_ICON, FRAME_CELL, FRAMES, LOCK_ICON, SHEET_ORDER, frameFor } from '../../src/lib/achievement-icons.mjs';
import { formatDateRange } from '../../src/lib/accomplishment-list.mjs';
import { launch, loadPlaywright } from './browser.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DATA = join(ROOT, 'src/data/accomplishments.json');
const ASTRO = join(ROOT, 'node_modules', '.bin', 'astro');
const BUILDS = join(ROOT, '.e2e-output', 'accomplishments');
const FIXTURES = {
  rich: 'scripts/fixtures/accomplishments.json',
  'two-done': 'scripts/fixtures/accomplishments-two-done.json',
  unavailable: 'scripts/fixtures/accomplishments-unavailable.json',
  'locked-only': 'scripts/fixtures/accomplishments-locked-only.json',
};
/** The tooltip's 0.3 s delay plus its fade, with slack. */
const TIP_MS = 500;
const HEADING = 'Achievements';
const HOME_LEDE = 'I keep a log of my recent work. Here’s what I’ve been up to lately.';
const PAGE_LEDE = 'I keep a log of my recent work. Locked achievements are planned, not done yet.';
/** The toast shows 0.66 s after the list comes into view: this is that, with slack. */
const TOAST_MS = 2_000;

/** The rich fixture, newest first as the fetch script writes it. */
const rich = JSON.parse(readFileSync(join(ROOT, FIXTURES.rich), 'utf8')).items;
const richDone = rich.filter((item) => item.done !== false);
const richLocked = rich.filter((item) => item.done === false).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
/** The record whose icon isn't in the library, and the one from before the gamified fields. */
const unknownIcon = rich.find((item) => item.icon === 'dragon');
const oldStyle = rich.find((item) => item.done !== false && item.funTitle === undefined && item.icon === undefined);
const lead = (item) => item.funTitle ?? item.title;
const cellOf = (icon) => `${SHEET_ORDER.indexOf(icon) * CELL} 0 ${CELL} ${CELL}`;
const frameCellOf = (frame) => `${FRAMES.indexOf(frame) * FRAME_CELL} 0 ${FRAME_CELL} ${FRAME_CELL}`;

/** @type {import('playwright').Browser} */
let browser;
/** @type {Record<string, { url: string, server: import('node:http').Server }>} */
const sites = {};

before(async () => {
  const playwright = await loadPlaywright();
  if (!playwright) throw new Error('Playwright not found: browser checks NOT RUN');
  assert.ok(unknownIcon && oldStyle, 'the rich fixture has a row with an unknown icon and an old-style row');
  await buildVariants();
  for (const variant of Object.keys(FIXTURES)) sites[variant] = await serve(join(BUILDS, variant));
  browser = await launch(playwright);
});

after(async () => {
  await browser?.close();
  await Promise.all(Object.values(sites).map(({ server }) => new Promise((done) => server.close(done))));
});

// ------------------------------------------------------------------ builds

/**
 * Builds the site once per fixture, then restores src/data/accomplishments.json.
 * Throws if a build fails, if a build didn't use its fixture, or if the file
 * isn't back to what it was.
 */
async function buildVariants() {
  const original = readFileSync(DATA);
  const restore = () => writeFileSync(DATA, original);
  const onSignal = (signal) => {
    restore();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  process.once('exit', restore);
  try {
    for (const [variant, fixture] of Object.entries(FIXTURES)) {
      const outDir = join(BUILDS, variant);
      await rm(outDir, { recursive: true, force: true });
      copyFileSync(join(ROOT, fixture), DATA);
      const result = spawnSync(ASTRO, ['build', '--outDir', outDir], { cwd: ROOT, encoding: 'utf8' });
      if (result.status !== 0) throw new Error(`The "${variant}" fixture build failed:\n${result.stdout}${result.stderr}`);
    }
  } finally {
    restore();
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    process.off('exit', restore);
  }
  assert.ok(readFileSync(DATA).equals(original), 'src/data/accomplishments.json is restored');

  // Each build used its own fixture, not a cached or leftover one.
  const home = (variant) => readFile(join(BUILDS, variant, 'index.html'), 'utf8');
  assert.match(await home('rich'), new RegExp(richDone[2].funTitle), 'the rich build has the third newest row');
  assert.match(await home('two-done'), /Pest Control/, 'the two-done build has its rows');
  assert.doesNotMatch(await home('two-done'), new RegExp(richDone[2].funTitle), 'the two-done build has only two rows');
  assert.doesNotMatch(await home('unavailable'), /class="achievement/, 'the unavailable build has no rows');
  assert.match(await home('locked-only'), /Form Fitter/, 'the locked-only build has its newest locked row');
  assert.doesNotMatch(await home('locked-only'), /data-state="done"/, 'the locked-only build has no done rows');
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
};

/** Serves a built directory on a free port, like `astro preview` does dist/. */
function serve(dir) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    const file = normalize(join(dir, path.endsWith('/') ? `${path}index.html` : path));
    if (file !== dir && !file.startsWith(dir + sep)) return void res.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory()) return void res.writeHead(301, { location: `${path}/` }).end();
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
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
 * A fresh page on a variant's build. Unless `settle` is false, every row's
 * scroll entrance has run and ended before it's returned (see settle()).
 * Unless `toast` is true, the session already saw the "Achievement unlocked!"
 * toast, so it stays out of the way of the other checks.
 * @param {string} variant
 * @param {string} path
 * @param {Parameters<import('playwright').Browser['newPage']>[0] & { settle?: boolean, toast?: boolean }} [options]
 */
async function open(variant, path, { settle: wait = true, toast = false, ...options } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...options });
  if (!toast) await page.addInitScript(() => sessionStorage.setItem('achievement-toast', 'shown'));
  const response = await page.goto(`${sites[variant].url}${path}`);
  assert.equal(response?.status(), 200, `${variant} ${path} loads`);
  await page.evaluate(() => document.fonts.ready);
  if (wait) await settle(page);
  if (!options.hasTouch) await page.mouse.move(0, 0);
  return page;
}

/**
 * Scrolls each row into view, so its scroll entrance runs (pixel-first look
 * spec R10), then back to the top, and waits until every row is at rest:
 * fully opaque and in its place (R11). It fails if an entrance leaves a row
 * hidden.
 */
async function settle(page) {
  for (const row of await page.locator('li.achievement').elementHandles()) {
    await row.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('li.achievement')].every((el) => {
        const s = getComputedStyle(el);
        return Number(s.opacity) === 1 && (s.transform === 'none' || s.transform === 'matrix(1, 0, 0, 1, 0, 0)');
      }),
    undefined,
    { timeout: 5_000 },
  );
}

/** A token's color as the browser computes it, to compare with computed styles. */
const tokenColor = (page, token) =>
  page.evaluate((name) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);

/** A row's four edges, as [width, style, color], and its four corner radii. */
const edgesOf = (row) =>
  row.evaluate((li) => {
    const s = getComputedStyle(li);
    return {
      sides: ['Top', 'Right', 'Bottom', 'Left'].map((side) => [s[`border${side}Width`], s[`border${side}Style`], s[`border${side}Color`]]),
      corners: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius],
    };
  });

/** The list page's two sections. */
const EARNED = 'section[aria-labelledby="earned-title"]';
const LOCKED = 'section[aria-labelledby="locked-title"]';

/** The row whose lead is `text`. */
const rowNamed = (page, text) =>
  page.locator('li.achievement').filter({ has: page.locator('.achievement__lead', { hasText: new RegExp(`^${text}$`) }) });

/** The leads of the rows in `scope`, in order. */
const leads = (page, scope) => page.locator(`${scope} li.achievement .achievement__lead`).allTextContents();

/** Whether a row's tooltip is fully shown. */
const tipShown = (row) =>
  row.locator('.achievement__tip').evaluate((tip) => {
    const style = getComputedStyle(tip);
    return style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) === 1;
  });

const isOpen = (row) => row.locator('details').evaluate((details) => /** @type {HTMLDetailsElement} */ (details).open);

/** Presses Tab until `locator` has focus, as a keyboard-only visitor would. */
async function tabTo(page, locator, max = 200) {
  const target = await locator.elementHandle();
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press('Tab');
    if (await target?.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error('not reachable with Tab');
}

/**
 * The share of an element's pixels that change when its icon SVGs are drawn,
 * from screenshots with them hidden and shown. 0 means nothing painted.
 */
async function paintedShare(page, icon, svgSelector = 'svg') {
  const svgs = icon.locator(svgSelector);
  await svgs.evaluateAll((all) => all.forEach((svg) => (svg.style.visibility = 'hidden')));
  const blank = await icon.screenshot();
  await svgs.evaluateAll((all) => all.forEach((svg) => (svg.style.visibility = '')));
  const drawn = await icon.screenshot();
  return page.evaluate(
    async ([a, b]) => {
      const pixels = async (png) => {
        const img = new Image();
        img.src = `data:image/png;base64,${png}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height).data;
      };
      const [pa, pb] = [await pixels(a), await pixels(b)];
      let changed = 0;
      for (let i = 0; i < pa.length; i += 4) if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) changed += 1;
      return changed / (pa.length / 4);
    },
    [blank.toString('base64'), drawn.toString('base64')],
  );
}

// ------------------------------------------------------------------ R1, R9

describe('rows', () => {
  for (const width of [1440, 390]) {
    test(`R1, R9: at ${width}px a done row shows its icon, fun title, short description and date; a locked row says "Not done yet" with a lock and can't open`, async () => {
      const page = await open('rich', '/', { viewport: { width, height: 900 } });
      const first = richDone[0];
      const done = rowNamed(page, first.funTitle);
      assert.equal(await done.getAttribute('data-state'), 'done');
      assert.equal(await done.locator('summary.achievement__row .achievement__icon').getAttribute('data-icon'), first.icon);
      assert.equal(await done.locator('.achievement__glyph').getAttribute('viewBox'), cellOf(first.icon));
      assert.equal(await done.locator('.achievement__glyph use').getAttribute('href'), '#achievement-icons');
      // Redesign R8: the icon sits in its kind's frame, 60px, with the 48px icon 6px in.
      assert.equal(await done.locator('.achievement__icon').getAttribute('data-frame'), frameFor(first.icon));
      assert.equal(await done.locator('.achievement__frame').getAttribute('viewBox'), frameCellOf(frameFor(first.icon)));
      assert.equal(await done.locator('.achievement__frame use').getAttribute('href'), '#achievement-frames');
      const [frameBox, glyphBox] = [await done.locator('.achievement__frame').boundingBox(), await done.locator('.achievement__glyph').boundingBox()];
      assert.ok(frameBox && glyphBox);
      const px = (n) => Math.round(n * 2) / 2; // to the half pixel, past sub-pixel layout
      assert.deepEqual([px(frameBox.width), px(frameBox.height)], [60, 60], 'the frame is 60px');
      assert.deepEqual([px(glyphBox.x - frameBox.x), px(glyphBox.y - frameBox.y), px(glyphBox.width)], [6, 6, 48], 'the icon is 48px, 6px in');
      assert.equal(await done.locator('.achievement__short').textContent(), first.shortDescription);
      const date = await done.locator('.achievement__date').textContent();
      assert.equal(date, formatDateRange(first));
      assert.match(date ?? '', /^[A-Z][a-z]{2} \d{4}$/, 'a month, such as "Sep 2026"');

      const box = (selector) => done.locator(selector).boundingBox();
      const [icon, text, when] = [await box('.achievement__icon'), await box('.achievement__text'), await box('.achievement__date')];
      assert.ok(icon && text && when);
      assert.ok(icon.x + icon.width <= text.x, 'the icon is on the left');
      if (width >= 1440) {
        assert.ok(when.x >= text.x + text.width, 'the date is on the right');
      } else {
        assert.ok(when.y >= text.y + text.height - 1, 'the date stacks under the text below 480px');
      }

      // The pixel-first look: a square 3px color-border edge, 12px from the next row.
      const border = await tokenColor(page, '--color-border');
      const { sides, corners } = await edgesOf(done);
      for (const side of sides) assert.deepEqual(side, ['3px', 'solid', border], 'a 3px solid color-border edge');
      assert.deepEqual(corners, ['0px', '0px', '0px', '0px'], 'square corners');
      const gap = await done.evaluate((li) => {
        const rows = [.../** @type {Element} */ (li.parentElement).querySelectorAll(':scope > li')];
        return rows[rows.indexOf(li) + 1].getBoundingClientRect().top - li.getBoundingClientRect().bottom;
      });
      assert.equal(gap, 12, 'rows are 12px apart');

      const goal = richLocked[0];
      const locked = rowNamed(page, goal.funTitle);
      assert.equal(await locked.getAttribute('data-state'), 'locked');
      const strong = await tokenColor(page, '--color-border-strong');
      const lockedEdges = await edgesOf(locked);
      for (const side of lockedEdges.sides) assert.deepEqual(side, ['3px', 'dashed', strong], 'a 3px dashed color-border-strong edge');
      assert.deepEqual(lockedEdges.corners, ['0px', '0px', '0px', '0px'], 'square corners when locked');
      assert.equal(await locked.locator('.achievement__date').textContent(), 'Not done yet');
      assert.equal(await locked.locator('.achievement__short').textContent(), goal.shortDescription);
      assert.equal(await locked.locator('svg.achievement__lock').count(), 1, 'the lock mark');
      assert.equal(await locked.locator('svg.achievement__lock').getAttribute('viewBox'), cellOf(LOCK_ICON));
      assert.equal(await locked.locator('.achievement__glyph').getAttribute('viewBox'), cellOf(goal.icon));
      assert.equal(await locked.locator('.achievement__icon').getAttribute('data-frame'), 'plain', 'redesign R9: a locked row takes the plain frame');
      assert.equal(await locked.locator('.achievement__frame').getAttribute('viewBox'), frameCellOf('plain'));
      assert.equal(await locked.locator('details, summary').count(), 0, 'no <details>');
      assert.equal(await locked.locator('a, button, input, [tabindex]').count(), 0, 'nothing focusable');
      assert.equal(await locked.locator('.achievement__tip').count(), 0, 'no tooltip');
      await locked.click();
      assert.equal(await locked.locator('.achievement__title, .achievement__description').count(), 0, 'clicking shows nothing more');
      await page.close();
    });
  }

  test('R9: a locked row dims its icon but not its padlock, frame or text, so text contrast is unchanged', async () => {
    const page = await open('rich', '/');
    const locked = rowNamed(page, richLocked[0].funTitle);
    const done = rowNamed(page, richDone[0].funTitle);
    const icon = await locked.locator('.achievement__glyph').evaluate((el) => {
      const s = getComputedStyle(el);
      return { opacity: Number(s.opacity), filter: s.filter };
    });
    assert.ok(icon.opacity < 1 || icon.filter !== 'none', `the locked icon is dimmed (opacity ${icon.opacity}, filter ${icon.filter})`);

    // The text's own look, and every ancestor's opacity and filter, which would dim it too.
    const look = (row, selector) =>
      row.locator(selector).evaluate((el) => {
        const s = getComputedStyle(el);
        let opacity = 1;
        const filters = [];
        for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
          const ns = getComputedStyle(node);
          opacity *= Number(ns.opacity);
          if (ns.filter !== 'none') filters.push(ns.filter);
        }
        return { color: s.color, opacity, filters };
      });
    for (const selector of ['.achievement__lead', '.achievement__short']) {
      const [goal, ordinary] = [await look(locked, selector), await look(done, selector)];
      assert.equal(goal.opacity, 1, `${selector} isn't faded`);
      assert.deepEqual(goal.filters, [], `${selector} has no filter`);
      assert.equal(goal.color, ordinary.color, `${selector} has the same color as in a done row`);
    }
    const date = await look(locked, '.achievement__date');
    assert.equal(date.opacity, 1, '"Not done yet" isn\'t faded');
    assert.deepEqual(date.filters, []);
    // Achievements redesign R9: only the icon dims; the padlock and the frame keep their colors.
    for (const selector of ['.achievement__lock', '.achievement__frame']) {
      const art = await look(locked, selector);
      assert.equal(art.opacity, 1, `${selector} isn't faded`);
      assert.deepEqual(art.filters, [], `${selector} isn't greyed`);
    }
    await page.close();
  });

  test('R13: a row with an unknown icon and an old-style row draw the fallback star, in the plain frame', async () => {
    const page = await open('rich', '/achievements/');
    for (const item of [unknownIcon, oldStyle]) {
      const row = rowNamed(page, lead(item));
      assert.equal(await row.locator('.achievement__icon').getAttribute('data-icon'), FALLBACK_ICON, `${item.rkey} shows the star`);
      assert.equal(await row.locator('.achievement__glyph').getAttribute('viewBox'), cellOf(FALLBACK_ICON));
      assert.equal(await row.locator('.achievement__icon').getAttribute('data-frame'), 'plain');
    }
    await page.close();
  });

  test('R17: a record without the gamified fields leads with its plain title, has no short line and still opens', async () => {
    const page = await open('rich', '/achievements/');
    const row = rowNamed(page, oldStyle.title);
    assert.equal(await row.count(), 1);
    assert.equal(await row.locator('.achievement__short').count(), 0, 'no short-description line');
    assert.equal(await row.locator('.achievement__date').textContent(), formatDateRange(oldStyle));
    await row.locator('summary').click();
    assert.equal(await isOpen(row), true);
    assert.equal(await row.locator('.achievement__title').textContent(), oldStyle.title);
    assert.equal(await row.locator('.achievement__description').textContent(), oldStyle.description);
    await page.close();
  });

  test('the icon and frame sheets are hidden without display:none, and each row\'s <use> crops paint its icon and frame', async () => {
    const page = await open('rich', '/');
    const sheet = page.locator('svg.achievement-icons');
    assert.equal(await sheet.count(), 1, 'one sheet per page');
    assert.equal(await page.locator('#achievement-icons').count(), 1);
    assert.equal(await page.locator('#achievement-frames').count(), 1, 'redesign R10: the frame sheet is inlined with it');
    const style = await sheet.evaluate((svg) => {
      const s = getComputedStyle(svg);
      const r = svg.getBoundingClientRect();
      return { display: s.display, position: s.position, width: r.width, height: r.height };
    });
    assert.notEqual(style.display, 'none');
    assert.equal(style.position, 'absolute');
    assert.deepEqual([style.width, style.height], [0, 0]);

    const [first, second] = [rowNamed(page, richDone[0].funTitle), rowNamed(page, richDone[1].funTitle)];
    const share = await paintedShare(page, first.locator('.achievement__icon'), 'svg.achievement__glyph');
    assert.ok(share > 0.2, `the ${richDone[0].icon} icon paints ${Math.round(share * 100)}% of its box`);
    // The icon covers part of the frame, so only the rest changes when the frame is hidden.
    const frameShare = await paintedShare(page, first.locator('.achievement__icon'), 'svg.achievement__frame');
    assert.ok(frameShare > 0.5, `the frame paints ${Math.round(frameShare * 100)}% of its box`);
    assert.notDeepEqual(
      await first.locator('.achievement__icon').screenshot(),
      await second.locator('.achievement__icon').screenshot(),
      'different icons crop different cells',
    );
    const locked = rowNamed(page, richLocked[0].funTitle);
    const lockShare = await paintedShare(page, locked.locator('.achievement__icon'), 'svg.achievement__lock');
    assert.ok(lockShare > 0.03, `the lock paints ${Math.round(lockShare * 100)}% of its box`);
    await page.close();
  });
});

// ------------------------------------------------------------------ R2, R3

describe('opening and the tooltip', () => {
  test('redesign R1, R2: the home section and the list are "Achievements", with plain subtitles that don\'t explain the game framing', async () => {
    const page = await open('rich', '/');
    assert.equal((await page.locator('#achievements h2#achievements-title').textContent())?.trim(), HEADING);
    assert.equal(await page.locator('#achievements .accomplishments__lede').textContent(), HOME_LEDE);
    assert.doesNotMatch(await page.locator('#achievements').innerText(), /\bgame/i);
    await page.close();
    const list = await open('rich', '/achievements/');
    assert.equal(await list.locator('h1').textContent(), HEADING);
    assert.equal(await list.title(), 'Achievements - J. Law. Cordova');
    assert.equal(await list.locator('header.page-head .achievements-page__lede').textContent(), PAGE_LEDE);
    assert.doesNotMatch(await list.locator('main').innerText(), /\bgame|accomplishment/i);
    await list.close();
  });

  test('R3: clicking a row opens it to the plain title, description, tags and links, and clicking again closes it', async () => {
    const page = await open('rich', '/');
    const item = richDone[0];
    const row = rowNamed(page, item.funTitle);
    assert.equal(await row.locator('.achievement__panel').isVisible(), false, 'closed at first');
    await row.locator('summary').click();
    assert.equal(await isOpen(row), true);
    assert.equal(await row.locator('.achievement__title').textContent(), item.title);
    assert.equal(await row.locator('.achievement__description').textContent(), item.description);
    assert.equal(await row.locator('.achievement__title').isVisible(), true);
    assert.deepEqual(await row.locator('.achievement__tags li').allTextContents(), item.tags);
    const links = row.locator('.achievement__links a');
    assert.deepEqual(await links.evaluateAll((all) => all.map((a) => a.getAttribute('href'))), item.links);
    for (const target of await links.evaluateAll((all) => all.map((a) => a.getAttribute('target')))) assert.equal(target, '_blank');
    assert.equal(await links.first().isVisible(), true);
    await row.locator('summary').click();
    assert.equal(await isOpen(row), false);
    await page.close();
  });

  test('R3, R20: with the keyboard alone a row takes focus with a visible ring, and Enter and Space open and close it', async () => {
    const page = await open('rich', '/');
    const row = rowNamed(page, richDone[0].funTitle);
    const summary = row.locator('summary');
    await tabTo(page, summary);
    const ring = await summary.evaluate((el) => {
      const s = getComputedStyle(el);
      return { visible: el.matches(':focus-visible'), style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    assert.equal(ring.visible, true);
    assert.equal(ring.style, 'solid', 'a focus ring');
    assert.ok(ring.width >= 2, `the ring is ${ring.width}px`);
    await page.keyboard.press('Enter');
    assert.equal(await isOpen(row), true, 'Enter opens');
    await tabTo(page, row.locator('.achievement__links a').first(), 5);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    assert.equal(await isOpen(row), false, 'Enter closes');
    await page.keyboard.press('Space');
    assert.equal(await isOpen(row), true, 'Space opens');
    await page.keyboard.press('Space');
    assert.equal(await isOpen(row), false, 'Space closes');
    await page.close();
  });

  test('R3: hovering a row with a mouse shows the full description in a tooltip, with no links, that the pointer can move onto', async () => {
    const page = await open('rich', '/');
    assert.equal(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches), true, 'a mouse');
    const item = richDone[0];
    const row = rowNamed(page, item.funTitle);
    const tip = row.locator('.achievement__tip');
    assert.equal(await tipShown(row), false, 'hidden at first');
    assert.equal(await row.locator('summary').getAttribute('aria-describedby'), await tip.getAttribute('id'));
    assert.equal(await tip.getAttribute('role'), 'tooltip');

    await row.locator('summary').hover();
    await page.waitForTimeout(TIP_MS);
    assert.equal(await tipShown(row), true, 'hover shows it');
    assert.equal(await tip.textContent(), item.description);
    assert.equal(await tip.locator('a, ul, li, button').count(), 0, 'text only, no links or tags');

    const box = await tip.boundingBox();
    assert.ok(box);
    await page.mouse.move(box.x + 12, box.y + box.height / 2, { steps: 12 });
    await page.waitForTimeout(TIP_MS);
    assert.equal(await tipShown(row), true, 'it stays with the pointer on it');
    assert.equal(
      await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.achievement__tip'), [box.x + 12, box.y + box.height / 2]),
      true,
      'the pointer is on the tooltip',
    );

    await page.mouse.move(0, 0);
    await page.waitForTimeout(TIP_MS);
    assert.equal(await tipShown(row), false, 'it goes when the pointer leaves');

    await row.locator('summary').hover();
    await row.locator('summary').click();
    await page.waitForTimeout(TIP_MS);
    assert.equal(await tipShown(row), false, 'hidden while the row is open');
    await page.close();
  });

  test('R3: Escape closes the tooltip, for the mouse and for keyboard focus, until the row is left', async () => {
    const page = await open('rich', '/');
    const row = rowNamed(page, richDone[1].funTitle);
    await row.locator('summary').hover();
    await page.waitForTimeout(TIP_MS);
    assert.equal(await tipShown(row), true);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(TIP_MS);
    assert.equal(await tipShown(row), false, 'Escape closes it under the pointer');
    assert.equal(await row.getAttribute('data-tip-hidden'), '');
    await page.mouse.move(0, 0);
    await row.locator('summary').hover();
    await page.waitForTimeout(TIP_MS);
    assert.equal(await tipShown(row), true, 'it comes back once the pointer has left and returned');
    await page.mouse.move(0, 0);

    const other = rowNamed(page, richDone[2].funTitle);
    await tabTo(page, other.locator('summary'));
    await page.waitForTimeout(TIP_MS);
    assert.equal(await tipShown(other), true, 'keyboard focus shows it');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(TIP_MS);
    assert.equal(await tipShown(other), false, 'Escape closes it under focus');
    assert.equal(await isOpen(other), false, 'Escape doesn\'t open the row');
    await page.close();
  });

  test('R3: on a touch screen there is never a tooltip, and a tap opens the row', async () => {
    const page = await open('rich', '/', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    assert.equal(await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches), false, 'no mouse');
    const row = rowNamed(page, richDone[0].funTitle);
    await row.locator('summary').tap();
    await page.waitForTimeout(TIP_MS);
    assert.equal(await isOpen(row), true, 'a tap opens it');
    assert.equal(await row.locator('.achievement__description').isVisible(), true);
    await row.locator('summary').tap();
    await page.waitForTimeout(TIP_MS);
    assert.equal(await isOpen(row), false);
    const tips = await page.locator('.achievement__tip').evaluateAll((all) => all.map((tip) => getComputedStyle(tip).display));
    assert.ok(tips.length > 0);
    for (const display of tips) assert.equal(display, 'none', 'no tooltip on touch');
    await page.close();
  });
});

// ------------------------------------------------------------------ R5, R6, R8

describe('the home section', () => {
  test('R5, R6: with many records it shows the three newest done, the newest locked, and "View all"', async () => {
    const page = await open('rich', '/');
    assert.deepEqual(await leads(page, '#achievements'), [...richDone.slice(0, 3).map(lead), lead(richLocked[0])]);
    const states = await page.locator('#achievements li.achievement').evaluateAll((all) => all.map((li) => li.getAttribute('data-state')));
    assert.deepEqual(states, ['done', 'done', 'done', 'locked']);
    const more = page.locator('#achievements a.accomplishments__more');
    assert.equal(await more.count(), 1);
    assert.equal(await more.getAttribute('href'), '/achievements/');
    assert.equal((await more.textContent())?.trim(), 'View all achievements', 'redesign R4: "View all", with " achievements" for screen readers');
    assert.equal(await more.isVisible(), true);
    await more.click();
    await page.waitForURL(/\/achievements\/$/);
    assert.equal(await page.locator('h1').textContent(), HEADING);
    await page.close();
  });

  test('redesign R19: the nav link is "Achievements", to the home section', async () => {
    const page = await open('rich', '/achievements/');
    const link = page.locator('.site-nav a[href="/#achievements"]');
    assert.equal(await link.count(), 1);
    assert.equal((await link.textContent())?.trim(), 'Achievements');
    assert.equal(await page.locator('.site-nav a', { hasText: /^Lately$/ }).count(), 0, 'no "Lately"');
    await page.close();
  });

  test('R6, R8: with two done and none locked it shows both, no locked row and no button', async () => {
    const page = await open('two-done', '/');
    assert.equal((await page.locator('#achievements-title').textContent())?.trim(), HEADING);
    assert.deepEqual(await leads(page, '#achievements'), ['Lift Off', 'Pest Control']);
    assert.equal(await page.locator('#achievements li[data-state="locked"]').count(), 0);
    assert.equal(await page.locator('.accomplishments__more').count(), 0, 'no "View all"');
    await page.close();
  });

  for (const width of [1440, 390]) {
    const layout = width > 720 ? 'in two columns at 1:2, with the tally and "View all" on the left' : 'stacked, with "View all" under the rows';
    test(`pixel-first look: at ${width}px the section has its lede and tally, ${layout}`, async () => {
      const page = await open('rich', '/', { viewport: { width, height: 900 } });
      const section = page.locator('#achievements');
      const lede = section.locator('.accomplishments__lede');
      assert.equal(await lede.textContent(), HOME_LEDE);
      assert.equal(await lede.evaluate((p) => getComputedStyle(p).color), await tokenColor(page, '--color-ink-muted'), 'the lede is color-ink-muted');
      assert.equal(
        await section.locator('ol.achievement-list').evaluate((ol) => ol.nextElementSibling?.matches('a.accomplishments__more')),
        true,
        '"View all" comes after the list in the DOM',
      );
      const box = async (selector) => {
        const b = await section.locator(selector).boundingBox();
        assert.ok(b, selector);
        return b;
      };
      const inner = await box('.accomplishments__inner');
      const title = await box('#achievements-title');
      const text = await box('.accomplishments__lede');
      const tally = await box('.achievement-tally');
      const list = await box('ol.achievement-list');
      const more = await box('.accomplishments__more');
      if (width > 720) {
        const left = (inner.width - 48) / 3;
        assert.ok(Math.abs(list.width - 2 * left) <= 1, `the rows take two thirds after a 48px gap (${list.width} of ${inner.width})`);
        assert.ok(Math.abs(list.x - (inner.x + left + 48)) <= 1, 'the rows start after the left column and the gap');
        for (const [name, b] of [['heading', title], ['lede', text], ['tally', tally], ['View all', more]]) {
          assert.ok(b.x + b.width <= list.x - 48 + 1, `the ${name} is in the left column`);
        }
        assert.ok(title.y < text.y && text.y < tally.y && tally.y < more.y, 'the heading, the lede, the tally, then "View all"');
        assert.ok(more.y + more.height <= list.y + list.height, '"View all" sits beside the rows, not under them');
      } else {
        assert.ok(Math.abs(list.x - title.x) <= 1 && Math.abs(list.width - inner.width) <= 1, 'the rows take the full width');
        assert.ok(text.y > title.y && tally.y > text.y + text.height && list.y > tally.y + tally.height, 'the heading, the lede, the tally, then the rows');
        assert.ok(more.y >= list.y + list.height, '"View all" is under the rows');
      }
      await page.close();
    });
  }

  test('R8: with the "unavailable" placeholder the section doesn\'t render', async () => {
    const page = await open('unavailable', '/');
    assert.equal(await page.locator('#achievements, .achievement-toast').count(), 0);
    assert.equal(await page.locator('li.achievement, svg.achievement-icons').count(), 0);
    assert.doesNotMatch(await page.locator('body').innerText(), new RegExp(HEADING));
    await page.close();
  });
});

// ------------------------------------------------------------------ R7

describe('the full list', () => {
  test('R7, redesign R3, R5, R20: page 1 has the 12 newest earned rows and the pagination, then every locked one under "Locked achievements"', async () => {
    const page = await open('rich', '/achievements/');
    assert.equal(await page.locator('h1').textContent(), HEADING);
    assert.equal((await page.locator('p.label').textContent())?.trim(), 'Page 1 of 3');
    const earned = page.locator(EARNED);
    assert.equal((await earned.locator('h2#earned-title').textContent())?.trim(), 'Earned achievements');
    assert.equal(await earned.locator('.achievements-page__note').textContent(), 'Newest first. Open one for the details.');
    assert.deepEqual(await leads(page, `${EARNED} ol.achievement-list`), richDone.slice(0, 12).map(lead));
    assert.equal(await earned.locator('li[data-state="locked"]').count(), 0);
    const section = page.locator(LOCKED);
    assert.equal((await section.locator('h2#locked-title').textContent())?.trim(), 'Locked achievements');
    assert.equal(
      await section.locator('.achievements-page__note').textContent(),
      'Planned work I haven’t finished. Each one moves to the earned list when it’s done.',
    );
    assert.deepEqual(await leads(page, LOCKED), richLocked.map(lead));
    const states = await section.locator('li.achievement').evaluateAll((all) => all.map((li) => li.dataset.state));
    assert.deepEqual(states, richLocked.map(() => 'locked'));
    const nav = page.locator('nav.pagination[aria-label="Achievements pages"]');
    assert.deepEqual(await nav.locator('a[aria-label^="Page"]').evaluateAll((all) => all.map((a) => a.getAttribute('href'))), [
      '/achievements/',
      '/achievements/page2/',
      '/achievements/page3/',
    ]);
    // The pagination sits right under the earned rows, before the locked list.
    assert.equal(await nav.evaluate((el) => el.previousElementSibling?.matches('ol.achievement-list')), true);
    const [navBox, lockedBox] = [await nav.boundingBox(), await section.boundingBox()];
    assert.ok(navBox && lockedBox && navBox.y + navBox.height <= lockedBox.y, 'the pagination is above the locked list');
    await page.close();
  });

  test('R7: pages 2 and 3 hold the rest, newest first, with no locked rows', async () => {
    const seen = [];
    for (const [n, path] of [[2, '/achievements/page2/'], [3, '/achievements/page3/']]) {
      const page = await open('rich', path);
      assert.equal((await page.locator('p.label').textContent())?.trim(), `Page ${n} of 3`);
      seen.push(...(await leads(page, '.achievements-page')));
      assert.equal(await page.locator(`li[data-state="locked"], ${LOCKED}`).count(), 0, `no locked rows on page ${n}`);
      if (n === 3) assert.equal(await page.locator('li.achievement').count(), 6, 'page 3 has the remaining 6');
      await page.close();
    }
    assert.deepEqual(seen, richDone.slice(12).map(lead));
    const missing = await fetch(`${sites.rich.url}/achievements/page4/`);
    assert.equal(missing.status, 404, 'no page 4');
  });

  test('R7, R8: with two done there is one page and no locked list; unavailable data gives a note instead of rows', async () => {
    const two = await open('two-done', '/achievements/');
    assert.equal(await two.locator('header.page-head p.label').count(), 0, 'redesign R5: no label with one page');
    assert.equal(await two.locator('li.achievement').count(), 2);
    assert.equal(await two.locator(`${LOCKED}, nav.pagination`).count(), 0);
    await two.close();

    const none = await open('unavailable', '/achievements/');
    assert.equal(await none.locator('h1').textContent(), HEADING);
    assert.equal(await none.locator('p.achievements-page__empty').isVisible(), true);
    assert.equal(await none.locator('li.achievement, nav.pagination, .achievement-tally').count(), 0);
    await none.close();
    assert.equal((await fetch(`${sites.unavailable.url}/achievements/page2/`)).status, 404);
  });

  test('R7, R9: with only locked records the page has no label and no "0 earned", and no gap where the label would be', async () => {
    const page = await open('locked-only', '/achievements/');
    assert.equal(await page.locator('h1').textContent(), HEADING);
    assert.equal(await page.locator('header.page-head p.label').count(), 0, 'no label element, empty or not');
    assert.equal(
      await page.locator('header.page-head .page-head__inner').evaluate((el) => el.firstElementChild?.tagName),
      'H1',
      'the title comes first in the page head',
    );
    assert.doesNotMatch(await page.locator('body').innerText(), /\b0 earned\b|Page 1 of 1/i);
    assert.equal(await page.locator(`${EARNED}, li[data-state="done"], nav.pagination`).count(), 0);
    assert.deepEqual(await leads(page, LOCKED), ['Form Fitter', 'Trail Guide']);

    // The title sits where it does on a page that never had a label (the "unavailable" note).
    const titleTop = (p) => p.locator('h1').evaluate((h1) => h1.getBoundingClientRect().top);
    const unlabelled = await open('unavailable', '/achievements/');
    assert.equal(await titleTop(page), await titleTop(unlabelled), 'no layout gap above the title');
    await unlabelled.close();
    await page.close();
  });
});

// ------------------------------------------------------------------ R20

describe('layout and accessibility', () => {
  const PAGES = ['/', '/achievements/', '/achievements/page2/', '/achievements/page3/'];

  for (const width of [390, 1440]) {
    test(`R20: at ${width}px, with every row open, there's no horizontal scroll and every target is at least 44px`, async () => {
      for (const path of PAGES) {
        const page = await open('rich', path, { viewport: { width, height: 900 } });
        await page.locator('details.achievement__details').evaluateAll((all) => all.forEach((d) => (/** @type {HTMLDetailsElement} */ (d).open = true)));
        await page.waitForTimeout(400);
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }));
        assert.ok(scrollWidth <= innerWidth, `${path}: scrollWidth ${scrollWidth} > ${innerWidth}`);
        const targets = await page
          .locator('summary.achievement__row, .achievement__links a, .accomplishments__more, nav.pagination a')
          .evaluateAll((all) => all.map((el) => [el.className || el.textContent?.trim(), el.getBoundingClientRect().width, el.getBoundingClientRect().height]));
        assert.ok(targets.length > 0);
        for (const [name, w, h] of targets) assert.ok(w >= 44 && h >= 44, `${path}: ${name} is ${w}×${h}`);
        await page.close();
      }
    });
  }

  /**
   * Opens a row by clicking its summary, and reads its panel every frame until
   * the panel has been at rest for 0.4 s, longer than its 0.25 s opening (3 s
   * at most). Reports whether it ever moved, and how it ended.
   */
  const watchOpening = (row) =>
    row.locator('details').evaluate(async (details) => {
      const panel = /** @type {HTMLElement} */ (details.querySelector('.achievement__panel'));
      const still = () => {
        const s = getComputedStyle(panel);
        return Number(s.opacity) === 1 && (s.transform === 'none' || s.transform === 'matrix(1, 0, 0, 1, 0, 0)');
      };
      /** @type {HTMLElement} */ (details.querySelector('summary')).click();
      let moved = false;
      let restingSince = performance.now();
      for (const start = performance.now(); performance.now() - start < 3000; ) {
        await new Promise((done) => requestAnimationFrame(done));
        if (!still()) {
          moved = true;
          restingSince = performance.now();
        } else if (performance.now() - restingSince > 400) break;
      }
      return { open: /** @type {HTMLDetailsElement} */ (details).open, moved, rests: still(), inline: panel.getAttribute('style') ?? '' };
    });

  test('R20, pixel-first look R12: reduced motion stops the panel\'s Motion opening and the row entrances, and turns off the chevron and tooltip transitions', async () => {
    const run = async (reducedMotion) => {
      const page = await open('rich', '/', { reducedMotion, settle: false });
      // The rows below the fold at load: hidden for their entrance, or not.
      const atLoad = await page
        .locator('#achievements li.achievement')
        .evaluateAll((all) => all.filter((li) => li.getBoundingClientRect().top > innerHeight).map((li) => Number(getComputedStyle(li).opacity)));
      await settle(page);
      const durations = await page.evaluate(() => {
        const of = (selector) => getComputedStyle(/** @type {Element} */ (document.querySelector(selector))).transitionDuration;
        return { panel: of('.achievement__panel'), chevron: of('.achievement__chevron'), tip: of('.achievement__tip') };
      });
      const row = rowNamed(page, richDone[0].funTitle);
      await row.scrollIntoViewIfNeeded();
      const opening = await watchOpening(row);
      const animations = await page.evaluate(() => document.getAnimations().length);
      await page.close();
      return { atLoad, durations, opening, animations };
    };

    const moving = await run('no-preference');
    assert.ok(moving.atLoad.length > 0, 'some rows start below the fold');
    for (const opacity of moving.atLoad) assert.equal(opacity, 0, 'a row below the fold waits for its entrance');
    assert.equal(moving.durations.panel, '0s', 'the panel has no CSS transition: Motion opens it');
    assert.notEqual(moving.durations.chevron, '0s', 'the chevron turns by default');
    assert.match(moving.durations.tip, /[1-9]/, 'the tooltip fades by default');
    assert.equal(moving.opening.open, true);
    assert.equal(moving.opening.moved, true, 'the panel fades and drops in as it opens');
    assert.equal(moving.opening.rests, true, 'and ends fully shown in its place');

    const still = await run('reduce');
    for (const opacity of still.atLoad) assert.equal(opacity, 1, 'no row is hidden for an entrance');
    for (const [name, value] of Object.entries(still.durations)) {
      for (const part of value.split(',')) assert.equal(part.trim(), '0s', `${name}: ${value}`);
    }
    assert.equal(still.opening.open, true);
    assert.equal(still.opening.moved, false, 'the panel opens without moving');
    assert.equal(still.opening.rests, true);
    assert.equal(still.opening.inline, '', 'Motion never touched the panel');
    assert.equal(still.animations, 0, 'nothing on the page is animating');
  });

  test('R20: icons are decorative (aria-hidden) and the rows read as text', async () => {
    for (const path of ['/', '/achievements/']) {
      const page = await open('rich', path);
      const hidden = await page
        .locator('svg.achievement-icons, .achievement svg')
        .evaluateAll((all) => all.map((svg) => svg.getAttribute('aria-hidden')));
      assert.ok(hidden.length > 0);
      for (const value of hidden) assert.equal(value, 'true');
      const names = await page.locator('summary.achievement__row').evaluateAll((all) => all.map((s) => s.textContent?.replace(/\s+/g, ' ').trim()));
      for (const name of names) assert.match(name ?? '', /[A-Za-z]{3}.* \d{4}/, `the row reads as text: ${name}`);
      await page.close();
    }
  });
});

// ------------------------------------------------------------------ achievements redesign

describe('achievements redesign: URLs', () => {
  test('R17, R18: every old /accomplishments/ page is a refresh to the matching /achievements/ page, with a canonical link and noindex', async () => {
    for (const [from, to] of [
      ['/accomplishments/', '/achievements/'],
      ['/accomplishments/page2/', '/achievements/page2/'],
      ['/accomplishments/page3/', '/achievements/page3/'],
    ]) {
      const response = await fetch(`${sites.rich.url}${from}`);
      assert.equal(response.status, 200, `${from} is served`);
      const html = await response.text();
      assert.match(html, new RegExp(`<meta http-equiv="refresh" content="0;url=${to}">`), `${from} refreshes to ${to} at once`);
      assert.match(html, new RegExp(`<link rel="canonical" href="https://jlawcordova.com${to}">`), `${from} names ${to} as canonical`);
      assert.match(html, /<meta name="robots" content="noindex">/);
      assert.match(html, new RegExp(`<a href="${to}">`), 'a plain link too');
      assert.equal((await fetch(`${sites.rich.url}${to}`)).status, 200, `${to} exists`);
    }
    const page = await browser.newPage();
    await page.goto(`${sites.rich.url}/accomplishments/page2/`);
    await page.waitForURL(/\/achievements\/page2\/$/);
    assert.equal((await page.locator('p.label').textContent())?.trim(), 'Page 2 of 3', 'a browser lands on the new page');
    await page.close();
    assert.equal((await fetch(`${sites.rich.url}/accomplishments/page4/`)).status, 404, 'no redirect for a page that never existed');
    assert.equal((await fetch(`${sites.unavailable.url}/accomplishments/`)).status, 200, 'the old URL still redirects without data');
    assert.equal((await fetch(`${sites.unavailable.url}/accomplishments/page2/`)).status, 404);
  });
});

describe('achievements redesign: frames, tally and Latest', () => {
  test('R8, R9: every row on every page sits in its kind\'s frame, and every locked row in the plain one', async () => {
    for (const path of ['/achievements/', '/achievements/page2/', '/achievements/page3/']) {
      const page = await open('rich', path);
      const rows = await page.locator('li.achievement').evaluateAll((all) =>
        all.map((li) => {
          const icon = /** @type {HTMLElement} */ (li.querySelector('.achievement__icon'));
          return { state: li.dataset.state, icon: icon.dataset.icon, frame: icon.dataset.frame, crop: li.querySelector('.achievement__frame')?.getAttribute('viewBox') };
        }),
      );
      assert.ok(rows.length > 0);
      for (const row of rows) {
        const frame = row.state === 'locked' ? 'plain' : frameFor(row.icon);
        assert.equal(row.frame, frame, `${path}: ${row.icon} (${row.state})`);
        assert.equal(row.crop, frameCellOf(frame));
      }
      await page.close();
    }
  });

  test('R6: the tally gives the totals on the home section and every list page: earned on gold with the thick edge, locked dashed', async () => {
    const chips = async (page, scope) =>
      page.locator(`${scope} .achievement-tally__chip`).evaluateAll((all) =>
        all.map((li) => {
          const s = getComputedStyle(li);
          return { kind: li.dataset.kind, text: li.textContent?.replace(/\s+/g, ' ').trim(), fill: s.backgroundColor, edge: [s.borderTopWidth, s.borderTopStyle, s.borderTopColor], height: li.getBoundingClientRect().height };
        }),
      );
    const page = await open('rich', '/');
    const [gold, ink, strong] = [await tokenColor(page, '--color-gold'), await tokenColor(page, '--color-ink'), await tokenColor(page, '--color-border-strong')];
    const home = await chips(page, '#achievements');
    assert.deepEqual(home.map((c) => [c.kind, c.text]), [['earned', '30 earned'], ['locked', '3 locked']]);
    assert.equal(home[0].fill, gold);
    assert.deepEqual(home[0].edge, ['3px', 'solid', ink]);
    assert.deepEqual(home[1].edge, ['3px', 'dashed', strong]);
    assert.doesNotMatch(await page.locator('#achievements').innerText(), /\bof 33\b|%/, 'no progress figure');
    await page.close();

    for (const path of ['/achievements/', '/achievements/page3/']) {
      const list = await open('rich', path);
      assert.deepEqual((await chips(list, 'header.page-head')).map((c) => c.text), ['30 earned', '3 locked'], `${path} shows the totals`);
      await list.close();
    }
    const two = await open('two-done', '/');
    assert.deepEqual((await chips(two, '#achievements')).map((c) => c.text), ['2 earned'], 'a zero count isn\'t shown');
    await two.close();
    const lockedOnly = await open('locked-only', '/achievements/');
    assert.deepEqual((await chips(lockedOnly, 'header.page-head')).map((c) => c.text), ['2 locked']);
    await lockedOnly.close();
  });

  test('R7: the newest earned row carries the one Latest chip, on the home section and page 1 only', async () => {
    for (const [path, expected] of [['/', 1], ['/achievements/', 1], ['/achievements/page2/', 0]]) {
      const page = await open('rich', path);
      const chips = page.locator('.achievement__latest');
      assert.equal(await chips.count(), expected, `${path}: ${expected} Latest chip`);
      if (expected) {
        const row = page.locator('li.achievement').filter({ has: chips });
        assert.equal(await row.locator('.achievement__lead').textContent(), lead(richDone[0]));
        assert.equal((await chips.textContent())?.trim(), 'Latest');
        const s = await chips.evaluate((el) => ({ fill: getComputedStyle(el).backgroundColor, font: getComputedStyle(el).fontFamily }));
        assert.equal(s.fill, await tokenColor(page, '--color-gold'));
        assert.match(s.font, /Silkscreen/);
      }
      await page.close();
    }
  });
});

describe('achievements redesign: the toast', () => {
  const card = (page) => page.locator('.achievement-toast__card');
  /** Scrolls the home list into view and waits for the toast to show. */
  const reach = async (page) => {
    await page.locator('#achievements .achievement-list').scrollIntoViewIfNeeded();
    await card(page).waitFor({ state: 'visible', timeout: TOAST_MS });
  };

  test('R11: it renders hidden in a status region, and only on the home page with an earned record', async () => {
    const html = await (await fetch(`${sites.rich.url}/`)).text();
    assert.match(html, /<div class="achievement-toast" role="status">\s*<div class="achievement-toast__card"[^>]* hidden>/, 'hidden without JavaScript');
    const page = await open('rich', '/', { toast: true, settle: false });
    assert.equal(await card(page).isHidden(), true, 'hidden until the list comes into view');
    await page.close();
    for (const [variant, path] of [['rich', '/achievements/'], ['locked-only', '/'], ['unavailable', '/']]) {
      const other = await open(variant, path, { toast: true });
      assert.equal(await other.locator('.achievement-toast').count(), 0, `no toast on ${variant} ${path}`);
      await other.close();
    }
  });

  for (const width of [1440, 390]) {
    test(`R12, R13: at ${width}px it names the newest earned achievement, gold under ink, in the corner`, async () => {
      const page = await open('rich', '/', { toast: true, settle: false, viewport: { width, height: 900 } });
      await reach(page);
      await page.waitForTimeout(400);
      const newest = richDone[0];
      assert.equal(await page.locator('.achievement-toast__label').textContent(), 'Achievement unlocked!');
      assert.equal(await page.locator('.achievement-toast__name').textContent(), lead(newest));
      assert.equal(await page.locator('.achievement-toast__line').textContent(), `${newest.shortDescription} · ${formatDateRange(newest)}`);
      assert.equal(await card(page).locator('.achievement__icon').getAttribute('data-icon'), newest.icon);
      assert.equal(await card(page).locator('.achievement__icon').getAttribute('data-frame'), frameFor(newest.icon));

      const look = await card(page).evaluate((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { fill: s.backgroundColor, color: s.color, edge: [s.borderTopWidth, s.borderTopStyle, s.borderTopColor], radius: s.borderTopLeftRadius, shadow: s.boxShadow, r: r.toJSON(), vw: innerWidth, vh: innerHeight, scroll: document.documentElement.scrollWidth };
      });
      assert.equal(look.fill, await tokenColor(page, '--color-gold'));
      assert.equal(look.color, await tokenColor(page, '--color-ink'));
      assert.deepEqual(look.edge, ['3px', 'solid', await tokenColor(page, '--color-ink')]);
      assert.equal(look.radius, '0px');
      assert.equal(look.shadow, 'none');
      const gutter = width > 480 ? 24 : 16;
      assert.ok(Math.abs(look.vw - look.r.right - gutter) <= 1, `${gutter}px from the right (${look.vw - look.r.right})`);
      assert.ok(Math.abs(look.vh - look.r.bottom - gutter) <= 1, `${gutter}px from the bottom (${look.vh - look.r.bottom})`);
      if (width > 480) assert.ok(look.r.width <= 420, `at most 420px wide (${look.r.width})`);
      else assert.ok(Math.abs(look.r.left - 16) <= 1, '16px from the left');
      assert.ok(look.scroll <= look.vw, 'no horizontal scroll');
      const close = await page.locator('.achievement-toast__close').boundingBox();
      assert.ok(close && close.width >= 44 && close.height >= 44, 'the close button is a 44px target');
      await page.close();
    });
  }

  test('R11, R14: it closes with its button or Escape, and shows once a session', async () => {
    const page = await open('rich', '/', { toast: true, settle: false });
    await reach(page);
    await page.locator('.achievement-toast__close').click();
    await card(page).waitFor({ state: 'hidden', timeout: 1_000 });
    await page.reload();
    await page.locator('#achievements .achievement-list').scrollIntoViewIfNeeded();
    await page.waitForTimeout(TOAST_MS);
    assert.equal(await card(page).isHidden(), true, 'not again in the same session');
    await page.close();

    const again = await open('rich', '/', { toast: true, settle: false });
    await reach(again);
    await again.keyboard.press('Escape');
    await card(again).waitFor({ state: 'hidden', timeout: 1_000 });
    await again.close();
  });

  test('R14: it closes itself after 5 seconds, but not while the pointer is on it', async () => {
    const page = await open('rich', '/', { toast: true, settle: false });
    await reach(page);
    await card(page).hover();
    await page.waitForTimeout(6_000);
    assert.equal(await card(page).isVisible(), true, 'it stays while hovered');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(4_000);
    assert.equal(await card(page).isVisible(), true, 'the 5 seconds start again when the pointer leaves');
    await card(page).waitFor({ state: 'hidden', timeout: 2_500 });
    await page.close();
  });

  test('R14: from the keyboard, its close button has a focus ring, and closing it moves focus to the heading', async () => {
    const page = await open('rich', '/', { toast: true, settle: false });
    await reach(page);
    const close = page.locator('.achievement-toast__close');
    await tabTo(page, close);
    const ring = await close.evaluate((el) => ({ visible: el.matches(':focus-visible'), style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }));
    assert.deepEqual([ring.visible, ring.style], [true, 'solid']);
    assert.ok(ring.width >= 2);
    await page.waitForTimeout(5_500);
    assert.equal(await card(page).isVisible(), true, 'it stays while focus is inside');
    await page.keyboard.press('Enter');
    await card(page).waitFor({ state: 'hidden', timeout: 1_000 });
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'achievements-title');
    await page.close();
  });

  test('R15, R16: it rises in with Motion by default, and appears without moving under reduced motion', async () => {
    const watch = async (reducedMotion) => {
      const page = await open('rich', '/', { toast: true, settle: false, reducedMotion });
      await reach(page);
      const moving = await card(page).evaluate(async (el) => {
        let moved = false;
        for (const start = performance.now(); performance.now() - start < 600; ) {
          const s = getComputedStyle(el);
          if (Number(s.opacity) < 1 || (s.transform !== 'none' && s.transform !== 'matrix(1, 0, 0, 1, 0, 0)')) moved = true;
          await new Promise((done) => requestAnimationFrame(done));
        }
        return moved;
      });
      await page.close();
      return moving;
    };
    assert.equal(await watch('no-preference'), true, 'it fades and rises in');
    assert.equal(await watch('reduce'), false, 'it just appears');
  });
});

describe('achievements redesign: the frame hop', () => {
  test('R15, R16: earned frames hop once as the list comes into view, locked frames never do, and nothing hops under reduced motion', async () => {
    const watch = async (reducedMotion) => {
      const page = await open('rich', '/', { settle: false, reducedMotion });
      await page.locator('#achievements .achievement-list').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      const hopped = await page.evaluate(async () => {
        const icons = [...document.querySelectorAll('#achievements li.achievement')].map((li) => ({
          state: /** @type {HTMLElement} */ (li).dataset.state,
          icon: /** @type {HTMLElement} */ (li.querySelector('.achievement__icon')),
          moved: false,
        }));
        for (const start = performance.now(); performance.now() - start < 1500; ) {
          for (const entry of icons) {
            const t = getComputedStyle(entry.icon).transform;
            if (t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)') entry.moved = true;
          }
          await new Promise((done) => requestAnimationFrame(done));
        }
        return icons.map(({ state, moved }) => ({ state, moved }));
      });
      await page.close();
      return hopped;
    };
    const moving = await watch('no-preference');
    for (const { state, moved } of moving) assert.equal(moved, state === 'done', `a ${state} frame ${state === 'done' ? 'hops' : 'stays still'}`);
    for (const { moved } of await watch('reduce')) assert.equal(moved, false, 'nothing hops under reduced motion');
  });
});

describe('achievements redesign: the nav and the dark theme', () => {
  test('R19: with every link, Achievements included, the bar is one row at every width, in both themes', async () => {
    for (const colorScheme of /** @type {const} */ (['light', 'dark'])) {
      for (const width of [320, 375, 390, 452, 720, 721, 740, 764, 792, 800, 820, 840, 841, 844, 848, 849, 852, 860, 900, 1024, 1440]) {
        const page = await open('rich', '/achievements/', { viewport: { width, height: 800 }, colorScheme, settle: false });
        const bar = await page.locator('.site-nav').evaluate((el) => Math.round(el.getBoundingClientRect().height));
        assert.equal(bar, 62, `${colorScheme} ${width}px: the bar is one row`);
        if (width > 720) {
          assert.equal(await page.locator('.site-nav a[href="/#achievements"]').isVisible(), true, `${width}px: Achievements shows`);
          for (const [w, h] of await page.locator('.site-nav__links a').evaluateAll((all) => all.map((a) => [a.getBoundingClientRect().width, a.getBoundingClientRect().height]))) {
            assert.ok(w >= 44 && h >= 44, `${width}px: a nav link is ${w}×${h}`);
          }
        }
        await page.close();
      }
    }
  });

  test('R6, R7, R13: in the dark theme the earned chip, Latest and the toast stay ink on gold; the locked chip follows the theme', async () => {
    const page = await open('rich', '/', { colorScheme: 'dark', toast: true, settle: false });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
    await page.locator('#achievements .achievement-list').scrollIntoViewIfNeeded();
    await page.locator('.achievement-toast__card').waitFor({ state: 'visible', timeout: TOAST_MS });
    const look = await page.evaluate(() => {
      const of = (selector) => {
        const s = getComputedStyle(/** @type {Element} */ (document.querySelector(selector)));
        return [s.color, s.backgroundColor];
      };
      return {
        earned: of('.achievement-tally__chip[data-kind="earned"]'),
        latest: of('.achievement__latest'),
        toast: of('.achievement-toast__name'),
        card: of('.achievement-toast__card'),
        locked: of('.achievement-tally__chip[data-kind="locked"]')[0],
        heading: of('#achievements-title')[0],
      };
    });
    const [ink, gold] = ['rgb(46, 36, 24)', 'rgb(216, 182, 106)'];
    assert.deepEqual(look.earned, [ink, gold]);
    assert.deepEqual(look.latest, [ink, gold]);
    assert.equal(look.toast[0], ink);
    assert.equal(look.card[1], gold);
    assert.equal(look.locked, look.heading, 'the locked chip takes the dark theme\'s ink');
    assert.notEqual(look.locked, ink);
    await page.close();
  });
});
