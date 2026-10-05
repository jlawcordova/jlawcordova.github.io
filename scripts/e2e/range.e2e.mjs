// Browser checks for the home page's Range carousel (Range class characters
// spec R1, R5–R8): the nameplate, its swatch, "class N of M" text and sprite
// label follow src/data/home.ts; exactly one outfit shows at a time; the arrows
// wrap both ways; auto-advance, pause, hover and focus pause and reduced motion
// behave; and at 390px and 1440px every name fits on one line with no
// horizontal scroll and 44px tap targets.
//
// The handheld console (pixel-first look spec, Range; R4, R10, R12): START
// pauses and plays, B goes back, A makes the sprite hop without changing the
// class and is hidden under reduced motion, every console button is at least
// 44px, and at 320px, 390px and 1440px no button or key label runs past the
// shell. The pager dots are gone (C5).
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
    const plate = /** @type {HTMLElement} */ (document.querySelector('.range__nameplate'));
    const plateBox = plate.getBoundingClientRect();
    const stageBox = document.querySelector('.range__stage').getBoundingClientRect();
    const shown = [...document.querySelectorAll('.range__sprite g[data-class]')].filter((g) => getComputedStyle(g).display !== 'none');
    return {
      current: Number(range.dataset.current),
      name: name.textContent,
      position: document.querySelector('.range__position')?.textContent,
      label: document.querySelector('.range__sprite')?.getAttribute('aria-label'),
      shadow: getComputedStyle(plate).getPropertyValue('--class-shadow').trim(),
      swatch: getComputedStyle(document.querySelector('.range__swatch')).backgroundColor,
      shown: shown.map((g) => g.getAttribute('data-class')),
      lines: Math.round(nameBox.height / parseFloat(getComputedStyle(name).lineHeight || `${nameBox.height}`)),
      plateHeight: Math.round(plateBox.height),
      plateInside: plateBox.left >= stageBox.left && plateBox.right <= stageBox.right,
      live: plate.getAttribute('aria-live'),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });

/** '#8A6AA6' → 'rgb(138, 106, 166)', as getComputedStyle reports it. */
const rgb = (hex) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

/**
 * Waits until the nameplate and sprite have finished their class-change
 * moves, so their boxes are measured at rest.
 */
const settled = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        // Motion writes its first frame after the click, so a check made at
        // once can see "at rest" before the move starts. Wait out the move's
        // first frames, then for three frames in a row at rest.
        const atRest = () =>
          ['.range__nameplate', '.range__sprite'].every((s) => {
            const t = getComputedStyle(document.querySelector(s)).transform;
            return t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';
          });
        let frames = 0;
        let still = 0;
        const tick = () => {
          frames += 1;
          still = frames > 2 && atRest() ? still + 1 : 0;
          if (still >= 3) resolve(undefined);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );

/** Clicking leaves the pointer over the console and focus on a button, and either one pauses it. */
const release = async (page) => {
  await page.mouse.move(0, 0);
  await page.evaluate(() => /** @type {HTMLElement} */ (document.activeElement)?.blur());
};

const pause = async (page) => {
  const toggle = page.locator('.range__toggle');
  if ((await toggle.getAttribute('aria-pressed')) === 'false') await toggle.click();
};
const next = (page) => page.locator('.range__arrow[data-dir="1"]').click();
const prev = (page) => page.locator('.range__arrow[data-dir="-1"]').click();

for (const width of [390, 1440]) {
  test(`R6, R8: at ${width}px every class has its name, label and swatch on one line, with no horizontal scroll`, async () => {
    const page = await openRange({ width });
    await pause(page);
    const home = await readFile(new URL('src/data/home.ts', `file://${ROOT}`), 'utf8');
    const shadows = [...home.matchAll(/shadow: '(#[0-9A-Fa-f]{6})'/g)].map((m) => m[1].toUpperCase());
    assert.equal(await page.locator('.range__dot').count(), 0, 'the pager dots are gone (C5)');
    for (let i = 0; i < names.length; i += 1) {
      await settled(page);
      const s = await state(page);
      assert.equal(s.current, i);
      assert.equal(s.name, names[i]);
      assert.equal(s.position, `, class ${i + 1} of ${names.length}`);
      assert.equal(s.label, `Pixel-art character dressed for ${names[i]}`);
      assert.equal(s.shadow.toUpperCase(), shadows[i]);
      assert.equal(s.swatch, rgb(shadows[i]), 'the swatch shows the class color');
      assert.deepEqual(s.shown, [String(i)], 'exactly one outfit shows (R5)');
      assert.equal(s.lines, 1, `${names[i]} fits on one line`);
      assert.ok(s.plateInside, `${names[i]}'s nameplate fits inside the stage`);
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
  // The carousel's clock starts when the page loads, not when openRange
  // returns, so a slow load (a cold server or browser on the first run after a
  // build) has already used part of the interval. Wait for the next step from
  // wherever it is now, within one interval, and check it is exactly one class.
  const from = (await state(page)).current;
  await page.waitForFunction(
    (was) => Number(/** @type {HTMLElement} */ (document.querySelector('.range')).dataset.current) !== was,
    from,
    { timeout: STEP_MS + 400 },
  );
  assert.equal((await state(page)).current, (from + 1) % names.length, 'auto-advance moves one class at a time');

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

/** Waits for the carousel to move off `from`, within one interval. */
const advancesFrom = (page, from) =>
  page.waitForFunction(
    (was) => Number(/** @type {HTMLElement} */ (document.querySelector('.range')).dataset.current) !== was,
    from,
    { timeout: STEP_MS + 400 },
  );

test('Console: START pauses and plays the rotation', async () => {
  const page = await openRange();
  const start = page.getByRole('button', { name: 'Start: pause the class rotation' });
  assert.equal(await start.count(), 1, 'START is named for its visible word');
  assert.equal(await start.getAttribute('aria-pressed'), 'false', 'it starts out playing');

  await start.click();
  await release(page);
  assert.equal(await start.getAttribute('aria-pressed'), 'true', 'pressing START pauses');
  const at = (await state(page)).current;
  await page.waitForTimeout(STEP_MS + 400);
  assert.equal((await state(page)).current, at, 'paused');

  await start.click();
  await release(page);
  assert.equal(await start.getAttribute('aria-pressed'), 'false', 'pressing START again plays');
  await advancesFrom(page, at);
  assert.equal((await state(page)).current, (at + 1) % names.length, 'and the rotation moves on');
  await page.close();
});

test('Console: B goes back a class, like Previous, and announces it', async () => {
  const page = await openRange();
  await pause(page);
  const b = page.getByRole('button', { name: 'B: previous class' });
  assert.equal(await b.count(), 1);
  await b.click();
  let s = await state(page);
  assert.equal(s.current, names.length - 1, 'B from the first goes to the last');
  assert.equal(s.name, names[names.length - 1]);
  assert.equal(s.live, 'polite', 'a change the visitor asked for is announced');
  await b.click();
  s = await state(page);
  assert.equal(s.current, names.length - 2);
  assert.equal(s.label, `Pixel-art character dressed for ${names[names.length - 2]}`);
  await page.close();
});

test('Console: A makes the sprite hop and leaves the class alone', async () => {
  const page = await openRange();
  await pause(page);
  await settled(page);
  const before = await state(page);
  // Record every transform Motion writes on the sprite while it hops.
  await page.evaluate(() => {
    const sprite = /** @type {HTMLElement} */ (document.querySelector('.range__sprite'));
    const seen = /** @type {string[]} */ ([]);
    Object.assign(window, { hopFrames: seen });
    new MutationObserver(() => seen.push(sprite.style.transform)).observe(sprite, { attributes: true, attributeFilter: ['style'] });
  });
  const a = page.getByRole('button', { name: 'A: jump' });
  assert.equal(await a.count(), 1);
  await a.click();
  // It rises (a negative translateY), then lands back where it was.
  await page.waitForFunction(() =>
    /** @type {{ hopFrames: string[] }} */ (/** @type {unknown} */ (window)).hopFrames.some((t) => /translateY\(-\d/.test(t)),
  );
  await settled(page);
  const after = await state(page);
  assert.equal(after.current, before.current, 'the class does not change');
  assert.equal(after.name, before.name);
  assert.equal(after.live, before.live, 'nothing is announced');
  await page.close();
});

test('Console: under reduced motion A and its JUMP label are hidden, and B stays', async () => {
  const page = await openRange({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.range__a').isVisible(), false, 'A is hidden');
  assert.equal(await page.locator('.range__key--a .range__key-label').isVisible(), false, 'JUMP is hidden');
  assert.equal(await page.locator('.range__b').isVisible(), true, 'B is still there');
  await page.close();

  const moving = await openRange();
  assert.equal(await moving.locator('.range__a').isVisible(), true, 'A shows when motion is allowed');
  await moving.close();
});

for (const width of [320, 390, 1440]) {
  test(`Console: at ${width}px every console button is at least 44px, every button and key label is inside the shell, with no horizontal scroll`, async () => {
    const page = await openRange({ width });
    const boxes = await page.evaluate(() =>
      [...document.querySelectorAll('.range__console button')].map((b) => {
        const r = b.getBoundingClientRect();
        return [b.getAttribute('aria-label'), r.width, r.height];
      }),
    );
    assert.equal(boxes.length, 5, 'Previous, Next, START, A and B');
    for (const [label, w, h] of boxes) assert.ok(w >= 44 && h >= 44, `${label}: ${w}×${h}`);
    // The section clips overflow, so a label past the shell is cut off, not scrolled to.
    const outside = await page.evaluate(() => {
      const shell = document.querySelector('.range__console').getBoundingClientRect();
      const border = parseFloat(getComputedStyle(document.querySelector('.range__console')).borderLeftWidth);
      return [...document.querySelectorAll('.range__controls button, .range__key-label')]
        .map((e) => [e.getAttribute('aria-label') ?? e.textContent, e.getBoundingClientRect()])
        .filter(([, r]) => r.left < shell.left + border || r.right > shell.right - border)
        .map(([name, r]) => `${name}: ${r.left}–${r.right}`);
    });
    assert.deepEqual(outside, [], 'nothing runs past the shell');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no horizontal scroll');
    await page.close();
  });
}
