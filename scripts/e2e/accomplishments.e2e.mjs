// Browser checks for the accomplishments as achievement rows (gamified
// accomplishments spec R1–R3, R5–R9, R13, R17, R20; plan "Requirements to
// checks"): the rows, the home section, the paginated /accomplishments/ pages,
// the tooltip, the icon crop and the site's layout rules.
//
// These checks need three datasets, not the one dist/ the runner serves, so
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

import { CELL, FALLBACK_ICON, LOCK_ICON, SHEET_ORDER } from '../../src/lib/achievement-icons.mjs';
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
};
/** The tooltip's 0.3 s delay plus its fade, with slack. */
const TIP_MS = 500;
const HEADING = 'What I’ve been working on lately';

/** The rich fixture, newest first as the fetch script writes it. */
const rich = JSON.parse(readFileSync(join(ROOT, FIXTURES.rich), 'utf8')).items;
const richDone = rich.filter((item) => item.done !== false);
const richLocked = rich.filter((item) => item.done === false).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
/** The record whose icon isn't in the library, and the one from before the gamified fields. */
const unknownIcon = rich.find((item) => item.icon === 'dragon');
const oldStyle = rich.find((item) => item.done !== false && item.funTitle === undefined && item.icon === undefined);
const lead = (item) => item.funTitle ?? item.title;
const cellOf = (icon) => `${SHEET_ORDER.indexOf(icon) * CELL} 0 ${CELL} ${CELL}`;

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
 * A fresh page on a variant's build.
 * @param {string} variant
 * @param {string} path
 * @param {Parameters<import('playwright').Browser['newPage']>[0]} [options]
 */
async function open(variant, path, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...options });
  const response = await page.goto(`${sites[variant].url}${path}`);
  assert.equal(response?.status(), 200, `${variant} ${path} loads`);
  await page.evaluate(() => document.fonts.ready);
  if (!options.hasTouch) await page.mouse.move(0, 0);
  return page;
}

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
      assert.equal(await done.locator('.achievement__icon svg').getAttribute('viewBox'), cellOf(first.icon));
      assert.equal(await done.locator('.achievement__icon svg use').getAttribute('href'), '#achievement-icons');
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

      const goal = richLocked[0];
      const locked = rowNamed(page, goal.funTitle);
      assert.equal(await locked.getAttribute('data-state'), 'locked');
      assert.equal(await locked.locator('.achievement__date').textContent(), 'Not done yet');
      assert.equal(await locked.locator('.achievement__short').textContent(), goal.shortDescription);
      assert.equal(await locked.locator('svg.achievement__lock').count(), 1, 'the lock mark');
      assert.equal(await locked.locator('svg.achievement__lock').getAttribute('viewBox'), cellOf(LOCK_ICON));
      assert.equal(await locked.locator('.achievement__icon svg').first().getAttribute('viewBox'), cellOf(goal.icon));
      assert.equal(await locked.locator('details, summary').count(), 0, 'no <details>');
      assert.equal(await locked.locator('a, button, input, [tabindex]').count(), 0, 'nothing focusable');
      assert.equal(await locked.locator('.achievement__tip').count(), 0, 'no tooltip');
      await locked.click();
      assert.equal(await locked.locator('.achievement__title, .achievement__description').count(), 0, 'clicking shows nothing more');
      await page.close();
    });
  }

  test('R9: a locked row dims its icon but not its text, so text contrast is unchanged', async () => {
    const page = await open('rich', '/');
    const locked = rowNamed(page, richLocked[0].funTitle);
    const done = rowNamed(page, richDone[0].funTitle);
    const icon = await locked.locator('.achievement__icon > svg').first().evaluate((el) => {
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
    await page.close();
  });

  test('R13: a row with an unknown icon and an old-style row draw the fallback star', async () => {
    const page = await open('rich', '/accomplishments/');
    for (const item of [unknownIcon, oldStyle]) {
      const row = rowNamed(page, lead(item));
      assert.equal(await row.locator('.achievement__icon').getAttribute('data-icon'), FALLBACK_ICON, `${item.rkey} shows the star`);
      assert.equal(await row.locator('.achievement__icon svg').getAttribute('viewBox'), cellOf(FALLBACK_ICON));
    }
    await page.close();
  });

  test('R17: a record without the gamified fields leads with its plain title, has no short line and still opens', async () => {
    const page = await open('rich', '/accomplishments/');
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

  test('the icon sheet is hidden without display:none, and each row\'s <use> crop paints its icon', async () => {
    const page = await open('rich', '/');
    const sheet = page.locator('svg.achievement-icons');
    assert.equal(await sheet.count(), 1, 'one sheet per page');
    assert.equal(await page.locator('#achievement-icons').count(), 1);
    const style = await sheet.evaluate((svg) => {
      const s = getComputedStyle(svg);
      const r = svg.getBoundingClientRect();
      return { display: s.display, position: s.position, width: r.width, height: r.height };
    });
    assert.notEqual(style.display, 'none');
    assert.equal(style.position, 'absolute');
    assert.deepEqual([style.width, style.height], [0, 0]);

    const [first, second] = [rowNamed(page, richDone[0].funTitle), rowNamed(page, richDone[1].funTitle)];
    const share = await paintedShare(page, first.locator('.achievement__icon'));
    assert.ok(share > 0.2, `the ${richDone[0].icon} icon paints ${Math.round(share * 100)}% of its box`);
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
  test('R2: the home heading is "What I’ve been working on lately" and "Achievements unlocked" is gone', async () => {
    const page = await open('rich', '/');
    assert.equal((await page.locator('#accomplishments h2#accomplishments-title').textContent())?.trim(), HEADING);
    assert.doesNotMatch(await page.locator('body').innerText(), /achievements unlocked/i);
    await page.close();
    const list = await open('rich', '/accomplishments/');
    assert.doesNotMatch(await list.locator('body').innerText(), /achievements unlocked/i);
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
  test('R5, R6: with many records it shows the three newest done, the newest locked, and "Show more"', async () => {
    const page = await open('rich', '/');
    assert.deepEqual(await leads(page, '#accomplishments'), [...richDone.slice(0, 3).map(lead), lead(richLocked[0])]);
    const states = await page.locator('#accomplishments li.achievement').evaluateAll((all) => all.map((li) => li.getAttribute('data-state')));
    assert.deepEqual(states, ['done', 'done', 'done', 'locked']);
    const more = page.locator('#accomplishments a.accomplishments__more');
    assert.equal(await more.count(), 1);
    assert.equal(await more.getAttribute('href'), '/accomplishments/');
    assert.match((await more.textContent())?.trim() ?? '', /^Show more/);
    assert.equal(await more.isVisible(), true);
    await more.click();
    await page.waitForURL(/\/accomplishments\/$/);
    assert.equal(await page.locator('h1').textContent(), 'Accomplishments');
    await page.close();
  });

  test('R6, R8: with two done and none locked it shows both, no locked row and no button', async () => {
    const page = await open('two-done', '/');
    assert.equal((await page.locator('#accomplishments-title').textContent())?.trim(), HEADING);
    assert.deepEqual(await leads(page, '#accomplishments'), ['Lift Off', 'Pest Control']);
    assert.equal(await page.locator('#accomplishments li[data-state="locked"]').count(), 0);
    assert.equal(await page.locator('.accomplishments__more').count(), 0, 'no "Show more"');
    await page.close();
  });

  test('R8: with the "unavailable" placeholder the section doesn\'t render', async () => {
    const page = await open('unavailable', '/');
    assert.equal(await page.locator('#accomplishments').count(), 0);
    assert.equal(await page.locator('li.achievement, svg.achievement-icons').count(), 0);
    assert.doesNotMatch(await page.locator('body').innerText(), new RegExp(HEADING));
    await page.close();
  });
});

// ------------------------------------------------------------------ R7

describe('the full list', () => {
  test('R7: page 1 has the 12 newest done rows, then every locked one under "Not done yet"', async () => {
    const page = await open('rich', '/accomplishments/');
    assert.equal(await page.locator('h1').textContent(), 'Accomplishments');
    assert.equal((await page.locator('p.label').textContent())?.trim(), '30 accomplishments · Page 1 of 3');
    assert.deepEqual(await leads(page, '.achievements-page > ol.achievement-list'), richDone.slice(0, 12).map(lead));
    assert.equal(await page.locator('.achievements-page > ol li[data-state="locked"]').count(), 0);
    const section = page.locator('section.achievements-page__locked');
    assert.equal((await section.locator('h2#locked-title').textContent())?.trim(), 'Not done yet');
    assert.deepEqual(await leads(page, 'section.achievements-page__locked'), richLocked.map(lead));
    const states = await section.locator('li.achievement').evaluateAll((all) => all.map((li) => li.dataset.state));
    assert.deepEqual(states, richLocked.map(() => 'locked'));
    const nav = page.locator('nav.pagination[aria-label="Accomplishments pages"]');
    assert.deepEqual(await nav.locator('a[aria-label^="Page"]').evaluateAll((all) => all.map((a) => a.getAttribute('href'))), [
      '/accomplishments/',
      '/accomplishments/page2/',
      '/accomplishments/page3/',
    ]);
    await page.close();
  });

  test('R7: pages 2 and 3 hold the rest, newest first, with no locked rows', async () => {
    const seen = [];
    for (const [n, path] of [[2, '/accomplishments/page2/'], [3, '/accomplishments/page3/']]) {
      const page = await open('rich', path);
      assert.equal((await page.locator('p.label').textContent())?.trim(), `30 accomplishments · Page ${n} of 3`);
      seen.push(...(await leads(page, '.achievements-page')));
      assert.equal(await page.locator('li[data-state="locked"], .achievements-page__locked').count(), 0, `no locked rows on page ${n}`);
      if (n === 3) assert.equal(await page.locator('li.achievement').count(), 6, 'page 3 has the remaining 6');
      await page.close();
    }
    assert.deepEqual(seen, richDone.slice(12).map(lead));
    const missing = await fetch(`${sites.rich.url}/accomplishments/page4/`);
    assert.equal(missing.status, 404, 'no page 4');
  });

  test('R7, R8: with two done there is one page and no locked list; unavailable data gives a note instead of rows', async () => {
    const two = await open('two-done', '/accomplishments/');
    assert.equal((await two.locator('p.label').textContent())?.trim(), '2 accomplishments · Page 1 of 1');
    assert.equal(await two.locator('li.achievement').count(), 2);
    assert.equal(await two.locator('.achievements-page__locked, nav.pagination').count(), 0);
    await two.close();

    const none = await open('unavailable', '/accomplishments/');
    assert.equal(await none.locator('p.achievements-page__empty').isVisible(), true);
    assert.equal(await none.locator('li.achievement, nav.pagination').count(), 0);
    await none.close();
    assert.equal((await fetch(`${sites.unavailable.url}/accomplishments/page2/`)).status, 404);
  });
});

// ------------------------------------------------------------------ R20

describe('layout and accessibility', () => {
  const PAGES = ['/', '/accomplishments/', '/accomplishments/page2/', '/accomplishments/page3/'];

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

  test('R20: reduced motion turns off the opening, chevron and tooltip transitions', async () => {
    const durations = async (reducedMotion) => {
      const page = await open('rich', '/', { reducedMotion });
      const result = await page.evaluate(() => {
        const of = (selector) => getComputedStyle(/** @type {Element} */ (document.querySelector(selector))).transitionDuration;
        return { panel: of('.achievement__panel'), chevron: of('.achievement__chevron'), tip: of('.achievement__tip') };
      });
      await page.close();
      return result;
    };
    const moving = await durations('no-preference');
    assert.notEqual(moving.panel, '0s', 'the panel animates by default');
    assert.notEqual(moving.chevron, '0s');
    assert.match(moving.tip, /[1-9]/, 'the tooltip fades by default');
    const still = await durations('reduce');
    for (const [name, value] of Object.entries(still)) {
      for (const part of value.split(',')) assert.equal(part.trim(), '0s', `${name}: ${value}`);
    }
  });

  test('R20: icons are decorative (aria-hidden) and the rows read as text', async () => {
    for (const path of ['/', '/accomplishments/']) {
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
