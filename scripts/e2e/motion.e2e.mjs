// Browser checks that Motion never hides content (pixel-first look spec R10–R12,
// C6). After a full scroll, everything that animates ends visible and at rest.
// With JavaScript off, or with the Motion chunk blocked, the hero's copy, the
// Range console and setting and the blog's post cards are visible from the
// start, and the hero island, which builds itself up from its SVG's CSS, ends
// visible (entrance in SVG spec R15). Under reduced
// motion nothing animates, and printing reveals anything still waiting to
// scroll in. The accomplishment rows' own checks are in accomplishments.e2e.mjs,
// which builds the data they need.
//
// Run with `npm run e2e` after `npm run build`.

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { launch, loadPlaywright } from './browser.mjs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4321';

/**
 * What animates on each page, by selector. The build-ups play on a wrapper
 * inside each piece (Pixel Lab's site contract, "The entrance"), so the
 * pieces' children count too.
 */
const PAGES = {
  '/': ['.hero__copy > *', '.hero__art', '.hero-island [data-enter]', '.hero-island [data-enter] > *', '.range__panel', '.range__sprite [data-enter]', '.range__sprite [data-enter] > *'],
  '/blog/': ['.post-list > li'],
};
/** What CSS alone plays from the page's HTML, with or without script: the hero island's build-up. */
const CSS_ONLY = { '/': ['.hero-island [data-enter] > *'], '/blog/': [] };

/** @type {import('playwright').Browser} */
let browser;

before(async () => {
  const playwright = await loadPlaywright();
  if (!playwright) throw new Error('Playwright not found: browser checks NOT RUN');
  browser = await launch(playwright);
});

after(() => browser?.close());

/** Each animated element's opacity and transform, and how many there are. */
const looks = (page, selectors) =>
  page.evaluate((selectors) => {
    const els = selectors.flatMap((s) => [...document.querySelectorAll(s)]);
    return els.map((el) => {
      const style = getComputedStyle(el);
      return { tag: el.className || el.tagName, opacity: style.opacity, transform: style.transform };
    });
  }, selectors);

const atRest = ({ opacity, transform }) => opacity === '1' && (transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)');

/** Polls until every element is at rest, or fails with the ones that aren't. */
async function untilAtRest(page, selectors, ms = 5000) {
  const end = Date.now() + ms;
  let last = [];
  while (Date.now() < end) {
    last = await looks(page, selectors);
    if (last.length && last.every(atRest)) return last;
    await page.waitForTimeout(100);
  }
  assert.fail(`not at rest: ${JSON.stringify(last.filter((l) => !atRest(l)))}`);
}

/** Scrolls to the bottom one screen at a time, so every entrance fires. */
async function scrollThrough(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 400) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(60);
  }
}

for (const width of [390, 1440]) {
  for (const [path, selectors] of Object.entries(PAGES)) {
    test(`R10, R11: at ${width}px on ${path}, everything that animates ends visible and at rest after a scroll`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${BASE}${path}`);
      await scrollThrough(page);
      await untilAtRest(page, selectors);
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
}

for (const [path, selectors] of Object.entries(PAGES)) {
  const scripted = selectors.filter((s) => !CSS_ONLY[path].includes(s));

  test(`R11: on ${path} with JavaScript off, everything is visible at load, or once the SVG's own build-up ends`, async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${BASE}${path}`);
    const all = await looks(page, scripted);
    assert.ok(all.length > 0, `${path} has elements to check`);
    assert.deepEqual(all.filter((l) => !atRest(l)), []);
    await untilAtRest(page, selectors);
    await context.close();
  });

  test(`R11: on ${path} with the Motion chunk blocked, nothing is hidden, before or after a scroll`, async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let blocked = 0;
    // The Motion library is its own chunk, shared by every island that uses it.
    await page.route(/\/_astro\/motion\.[^/]*\.js$/, (route) => ((blocked += 1), route.abort()));
    await page.goto(`${BASE}${path}`);
    assert.ok(blocked > 0, 'the page asked for the Motion chunk');
    assert.deepEqual((await looks(page, scripted)).filter((l) => !atRest(l)), [], 'at load');
    await scrollThrough(page);
    await untilAtRest(page, selectors);
    assert.deepEqual((await looks(page, selectors)).filter((l) => !atRest(l)), [], 'after a scroll');
    const hidden = await page.evaluate(() => document.querySelectorAll('[style*="opacity: 0"]').length);
    assert.equal(hidden, 0, 'no element is left at opacity 0');
    await page.close();
  });

  test(`R12: on ${path} under reduced motion, nothing animates and nothing is hidden`, async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(`${BASE}${path}`);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.querySelectorAll('[style*="opacity: 0"]').length), 0, 'nothing hidden at load');
    await scrollThrough(page);
    const all = await looks(page, selectors);
    assert.deepEqual(all.filter((l) => !atRest(l)), []);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0, 'no running animation');
    await page.close();
  });
}

test('C6: printing reveals the entrances still waiting below the fold', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/blog/`);
  const waiting = await page.evaluate(() => document.querySelectorAll('.post-list > li[style*="opacity: 0"]').length);
  assert.ok(waiting > 0, 'some cards wait below the fold');
  await page.evaluate(() => dispatchEvent(new Event('beforeprint')));
  assert.deepEqual((await looks(page, PAGES['/blog/'])).filter((l) => !atRest(l)), []);
  await page.close();
});
