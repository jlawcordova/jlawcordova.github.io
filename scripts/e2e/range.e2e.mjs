// Browser checks for the home page's Range carousel (Range class characters
// spec R1, R5–R8): the dots, nameplate, "class N of M" text and sprite label
// follow src/data/home.ts; exactly one outfit shows at a time; the arrows wrap
// both ways; auto-advance, pause, hover and focus pause and reduced motion
// behave; and at 390px and 1440px every name fits on one line with no
// horizontal scroll and 44px tap targets.
//
// Run with `npm run e2e` after `npm run build`.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { launch, loadPlaywright } from './browser.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4321';
/** The class names in rangeClasses, read from home.ts as text. */
const classNames = (homeTs) => [.../export const rangeClasses = \[([\s\S]*?)\] as const;/.exec(homeTs)[1].matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
/** The carousel's interval (Range.astro), plus slack. */
const STEP_MS = 2200;

/** @type {import('playwright').Browser} */
let browser;
/** @type {string[]} */
let names;

before(async () => {
  const playwright = await loadPlaywright();
  if (!playwright) throw new Error('Playwright not found: browser checks NOT RUN');
  browser = await launch(playwright);
  names = classNames(await readFile(new URL('src/data/home.ts', `file://${ROOT}`), 'utf8'));
});

after(async () => {
  await browser?.close();
});

/** The home page at a width, scrolled to the Range section. */
async function openRange({ width = 1440, reducedMotion = 'no-preference' } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
  await page.goto(`${BASE}/`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#range').scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  return page;
}

/** What the carousel shows now. */
const state = (page) =>
  page.evaluate(() => {
    const range = /** @type {HTMLElement} */ (document.querySelector('.range'));
    const name = /** @type {HTMLElement} */ (document.querySelector('.range__name'));
    const nameBox = name.getBoundingClientRect();
    const shown = [...document.querySelectorAll('.range__sprite g[data-class]')].filter((g) => getComputedStyle(g).display !== 'none');
    return {
      current: Number(range.dataset.current),
      name: name.textContent,
      position: document.querySelector('.range__position')?.textContent,
      label: document.querySelector('.range__sprite')?.getAttribute('aria-label'),
      dots: document.querySelectorAll('.range__dot').length,
      currentDot: [...document.querySelectorAll('.range__dot')].findIndex((d) => d.classList.contains('is-current')),
      shadow: getComputedStyle(/** @type {HTMLElement} */ (document.querySelector('.range__nameplate'))).getPropertyValue('--class-shadow').trim(),
      shown: shown.map((g) => g.getAttribute('data-class')),
      lines: Math.round(nameBox.height / parseFloat(getComputedStyle(name).lineHeight || `${nameBox.height}`)),
      plateHeight: Math.round(document.querySelector('.range__nameplate').getBoundingClientRect().height),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });

const pause = async (page) => {
  const toggle = page.locator('.range__toggle');
  if ((await toggle.getAttribute('aria-pressed')) === 'false') await toggle.click();
};
const next = (page) => page.locator('.range__arrow[data-dir="1"]').click();
const prev = (page) => page.locator('.range__arrow[data-dir="-1"]').click();

for (const width of [390, 1440]) {
  test(`R6, R8: at ${width}px every class has its dot, name, label and shadow on one line, with no horizontal scroll`, async () => {
    const page = await openRange({ width });
    await pause(page);
    const home = await readFile(new URL('src/data/home.ts', `file://${ROOT}`), 'utf8');
    const shadows = [...home.matchAll(/shadow: '(#[0-9A-Fa-f]{6})'/g)].map((m) => m[1].toUpperCase());
    for (let i = 0; i < names.length; i += 1) {
      const s = await state(page);
      assert.equal(s.current, i);
      assert.equal(s.name, names[i]);
      assert.equal(s.position, `, class ${i + 1} of ${names.length}`);
      assert.equal(s.label, `Pixel-art character dressed for ${names[i]}`);
      assert.equal(s.dots, names.length);
      assert.equal(s.currentDot, i);
      assert.equal(s.shadow.toUpperCase(), shadows[i]);
      assert.deepEqual(s.shown, [String(i)], 'exactly one outfit shows (R5)');
      assert.equal(s.lines, 1, `${names[i]} fits on one line`);
      assert.equal(s.plateHeight, 44, 'the nameplate keeps its height');
      assert.equal(s.scrollWidth, width, 'no horizontal scroll');
      await next(page);
    }
    const boxes = await page.evaluate(() =>
      [...document.querySelectorAll('.range__arrow, .range__toggle')].map((e) => e.getBoundingClientRect()).map((r) => [r.width, r.height]),
    );
    for (const [w, h] of boxes) assert.ok(w >= 44 && h >= 44, `tap target ${w}×${h}`);
    await page.close();
  });
}

test('R7: the arrows wrap both ways', async () => {
  const page = await openRange();
  await pause(page);
  await prev(page);
  assert.equal((await state(page)).current, names.length - 1, 'Previous from the first goes to the last');
  await next(page);
  assert.equal((await state(page)).current, 0, 'Next from the last goes to the first');
  await page.close();
});

test('R7: it auto-advances, and pause, hover and focus stop it', async () => {
  const page = await openRange();
  await page.waitForTimeout(STEP_MS + 400);
  assert.equal((await state(page)).current, 1, 'auto-advance');

  await pause(page);
  // Clicking leaves the pointer over the panel and focus on the toggle, and
  // either one pauses it too, so clear both before each wait.
  const release = async () => {
    await page.mouse.move(0, 0);
    await page.evaluate(() => /** @type {HTMLElement} */ (document.activeElement)?.blur());
  };
  await release();
  let at = (await state(page)).current;
  await page.waitForTimeout(STEP_MS + 400);
  assert.equal((await state(page)).current, at, 'paused');
  await page.locator('.range__toggle').click();
  await release();

  await page.locator('.range__stage').hover();
  at = (await state(page)).current;
  await page.waitForTimeout(STEP_MS + 400);
  assert.equal((await state(page)).current, at, 'hover pauses');

  await page.mouse.move(0, 0);
  await page.locator('.range__arrow[data-dir="1"]').focus();
  at = (await state(page)).current;
  await page.waitForTimeout(STEP_MS + 400);
  assert.equal((await state(page)).current, at, 'focus pauses');
  await page.close();
});

test('R7: with reduced motion it does not auto-advance', async () => {
  const page = await openRange({ reducedMotion: 'reduce' });
  await page.waitForTimeout(STEP_MS + 400);
  assert.equal((await state(page)).current, 0);
  await page.close();
});
