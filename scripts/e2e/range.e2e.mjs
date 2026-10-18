// Browser checks for the home page's Range carousel (Range class characters
// spec R1, R5–R8): the nameplate, its swatch, "class N of M" text and sprite
// label follow src/data/home.ts; exactly one outfit shows at a time; the arrows
// wrap both ways; auto-advance, pause, hover and focus pause and reduced motion
// behave; and at 390px and 1440px every name fits on one line with no
// horizontal scroll and 44px tap targets.
//
// The handheld console (pixel-first look spec, Range; R4, R10, R12): START
// pauses and plays, B goes back, A is hidden under reduced motion, every
// console button is at least 44px, and at 320px, 390px and 1440px no button or
// key label runs past the shell. The pager dots are gone (C5).
//
// The class change (Range pop spec R1–R7): each class tints the section and
// the screen with the copy still readable, battle bars sweep the screen and a
// slash crosses the section, the countdown runs the carousel and holds while
// paused, PAUSED shows without moving anything, START plays at once even with
// the pointer and focus still on the console, A makes only the character hop,
// and A and B are ink keys with no labels.
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
/** The carousel's interval (Range.astro, Range settings spec R7); the waits add their own slack. */
const STEP_MS = 3000;

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

/** Every entrance group of the setting on show: its opacity and transform. */
const settingPieces = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.range__sprite .enter')]
      .filter((g) => getComputedStyle(/** @type {Element} */ (g.closest('[data-class]'))).display !== 'none')
      .map((g) => ({ opacity: getComputedStyle(g).opacity, transform: getComputedStyle(g).transform })),
  );
const pieceAtRest = ({ opacity, transform }) => opacity === '1' && (transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)');

test('Settings R4, R8: a switch builds the new setting, and a quick double press still ends with every piece in place', async () => {
  const page = await openRange();
  await pause(page);
  await next(page);
  // The build starts at once: the floor rows start below their spots and transparent.
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.range__sprite .enter')].some(
        (g) => getComputedStyle(/** @type {Element} */ (g.closest('[data-class]'))).display !== 'none' && Number(getComputedStyle(g).opacity) < 1,
      ),
    undefined,
    { timeout: 1000 },
  );
  await next(page);
  await page.waitForTimeout(1600);
  const pieces = await settingPieces(page);
  assert.ok(pieces.length >= 4, `${pieces.length} pieces on show`);
  assert.deepEqual(pieces.filter((p) => !pieceAtRest(p)), [], 'every piece ends in place');
  assert.deepEqual((await state(page)).shown, ['2'], 'only the current class shows');
  await page.close();
});

test('Settings R6, R9: under reduced motion a switch shows the new setting at once, with nothing moving', async () => {
  const page = await openRange({ reducedMotion: 'reduce' });
  await next(page);
  const pieces = await settingPieces(page);
  assert.ok(pieces.length >= 4);
  assert.deepEqual(pieces.filter((p) => !pieceAtRest(p)), []);
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

test('Console, Pop R6: A makes only the character hop, and leaves its setting and the class alone', async () => {
  const page = await openRange();
  await pause(page);
  await settled(page);
  // Let the setting finish building first, so anything that moves is the hop.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.range__sprite .enter')].every((g) => {
      const s = getComputedStyle(g);
      return s.opacity === '1' && (s.transform === 'none' || s.transform === 'matrix(1, 0, 0, 1, 0, 0)');
    }),
  );
  const before = await state(page);
  // Sample the character's and the sprite's transforms every frame while A runs.
  await page.evaluate(() => {
    const seen = /** @type {{ character: number, sprite: string, ground: string[] }[]} */ ([]);
    Object.assign(window, { hopFrames: seen });
    const shown = () => /** @type {Element} */ ([...document.querySelectorAll('.range__sprite g[data-class]')].find((g) => getComputedStyle(g).display !== 'none'));
    const tick = () => {
      const g = shown();
      seen.push({
        character: new DOMMatrix(getComputedStyle(/** @type {Element} */ (g.querySelector('.cbob'))).transform).f,
        sprite: getComputedStyle(/** @type {Element} */ (document.querySelector('.range__sprite'))).transform,
        ground: [...g.querySelectorAll('.enter[data-enter="ground"]')].map((e) => getComputedStyle(e).transform),
      });
      if (seen.length < 60) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const a = page.getByRole('button', { name: 'A: jump' });
  assert.equal(await a.count(), 1);
  await a.click();
  await page.waitForFunction(() => /** @type {{ hopFrames: unknown[] }} */ (/** @type {unknown} */ (window)).hopFrames.length >= 60);
  const frames = await page.evaluate(() => /** @type {{ hopFrames: { character: number, sprite: string, ground: string[] }[] }} */ (/** @type {unknown} */ (window)).hopFrames);
  const lowest = Math.min(...frames.map((f) => f.character));
  assert.ok(lowest <= -5, `the character rises (to ${lowest})`);
  assert.ok(frames.every((f) => Number.isInteger(f.character)), 'by whole pixels');
  assert.ok(frames.every((f) => f.sprite === 'none'), 'the sprite as a whole stays put');
  assert.ok(
    frames.every((f) => f.ground.every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)')),
    "the setting's floor stays put",
  );
  // It lands back where it started.
  await page.waitForFunction(() => {
    const g = [...document.querySelectorAll('.range__sprite g[data-class]')].find((e) => getComputedStyle(e).display !== 'none');
    return !g?.querySelector('.cbob.is-hopping');
  });
  await settled(page);
  const after = await state(page);
  assert.equal(after.current, before.current, 'the class does not change');
  assert.equal(after.name, before.name);
  assert.equal(after.live, before.live, 'nothing is announced');
  await page.close();
});

test('Console: under reduced motion A is hidden, and B stays', async () => {
  const page = await openRange({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.range__a').isVisible(), false, 'A is hidden');
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

/** The colors of the section, the screen and the copy, as sRGB through a canvas (Chrome reports oklch as oklch). */
const colors = (page) =>
  page.evaluate(() => {
    const ctx = /** @type {CanvasRenderingContext2D} */ (document.createElement('canvas').getContext('2d', { willReadFrequently: true }));
    const rgb = (/** @type {string} */ color) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const of = (/** @type {string} */ s, /** @type {'color' | 'backgroundColor'} */ p) => rgb(getComputedStyle(/** @type {Element} */ (document.querySelector(s)))[p]);
    return {
      ground: of('section.range', 'backgroundColor'),
      screen: of('.range__stage', 'backgroundColor'),
      heading: of('.range__copy h2', 'color'),
      gold: of('.range__copy .gold', 'color'),
      body: of('.range__copy p', 'color'),
    };
  });
const luminance = (/** @type {number[]} */ c) => {
  const [r, g, b] = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('Pop R1: each class tints the section and the screen, and the copy stays readable on every one', async () => {
  const page = await openRange();
  await pause(page);
  const grounds = new Set();
  for (let i = 0; i < names.length; i += 1) {
    await page.waitForTimeout(700); // the change's layers clear
    const c = await colors(page);
    grounds.add(c.ground.join());
    assert.ok(contrast(c.heading, c.ground) >= 4.5, `${names[i]}: heading ${contrast(c.heading, c.ground).toFixed(1)}:1`);
    assert.ok(contrast(c.body, c.ground) >= 4.5, `${names[i]}: body ${contrast(c.body, c.ground).toFixed(1)}:1`);
    assert.ok(contrast(c.gold, c.ground) >= 3, `${names[i]}: the gold phrase ${contrast(c.gold, c.ground).toFixed(1)}:1, large text`);
    assert.ok(luminance(c.screen) > luminance(c.ground), `${names[i]}: the screen is lighter than the ground`);
    await next(page);
  }
  assert.equal(grounds.size, names.length, 'every class has its own ground');
  await page.close();
});

test('Pop R2, R3: a change sweeps battle bars over the screen and slashes the section, then clears both layers', async () => {
  const page = await openRange();
  await pause(page);
  await next(page);
  const during = await page.evaluate(() => ({
    screen: document.querySelectorAll('.range__stage > .range__change canvas').length,
    section: document.querySelectorAll('section.range > .range__change > span').length,
  }));
  assert.deepEqual(during, { screen: 1, section: 2 }, 'the screen has its blocks, and the section its old color and the slash');
  await page.waitForTimeout(900);
  const afterwards = await page.evaluate(() => [...document.querySelectorAll('.range__change')].map((l) => l.childElementCount));
  assert.deepEqual(afterwards, [0, 0], 'both layers are empty once the change is done');
  await page.close();

  const still = await openRange({ reducedMotion: 'reduce' });
  await next(still);
  assert.deepEqual(
    await still.evaluate(() => [...document.querySelectorAll('.range__change')].map((l) => l.childElementCount)),
    [0, 0],
    'under reduced motion the colors change at once',
  );
  await still.close();
});

/** How full the countdown is, from 0 to 1. */
const fill = (page) =>
  page.evaluate(() => new DOMMatrix(getComputedStyle(/** @type {Element} */ (document.querySelector('.range__timer-fill'))).transform).a);
/** Where the countdown and the screen's foot are, to catch a layout shift. */
const hudBox = (page) =>
  page.evaluate(() => {
    const stage = /** @type {Element} */ (document.querySelector('.range__stage')).getBoundingClientRect();
    const hud = /** @type {Element} */ (document.querySelector('.range__hud')).getBoundingClientRect();
    return { stage: [stage.height, stage.width], hud: [hud.top - stage.top, hud.left - stage.left, hud.width, hud.height] };
  });

for (const width of [390, 1440]) {
  test(`Pop R4: at ${width}px the countdown fills toward the next class on the screen, and pausing holds it and shows PAUSED without moving anything`, async () => {
    const page = await openRange({ width });
    // Measure from the start of an interval, so the countdown can't wrap between readings.
    await advancesFrom(page, (await state(page)).current);
    const stage = await page.locator('.range__stage').boundingBox();
    const hud = await page.locator('.range__hud').boundingBox();
    assert.ok(stage && hud && hud.y >= stage.y && hud.y + hud.height <= stage.y + stage.height, 'the countdown is on the screen');
    const early = await fill(page);
    await page.waitForTimeout(800);
    const later = await fill(page);
    assert.ok(later > early, `it fills (${early.toFixed(2)} → ${later.toFixed(2)})`);
    assert.equal(await page.locator('.range__paused').isVisible(), false, 'no PAUSED while it plays');

    const box = await hudBox(page);
    await page.locator('.range__toggle').click();
    await release(page);
    assert.equal(await page.locator('.range__paused').isVisible(), true, 'PAUSED shows');
    assert.deepEqual(await hudBox(page), box, 'and nothing moves');
    const held = await fill(page);
    await page.waitForTimeout(800);
    assert.equal(await fill(page), held, 'the countdown holds');
    const plate = await page.locator('.range__nameplate').boundingBox();
    const badge = await page.locator('.range__paused').boundingBox();
    assert.ok(plate && badge && (badge.x >= plate.x + plate.width || badge.y >= plate.y + plate.height), 'PAUSED clears the nameplate');
    await page.close();
  });
}

test('Pop R5: START plays at once, with the pointer still over the console and focus still on START', async () => {
  const page = await openRange();
  const start = page.locator('.range__toggle');
  await start.click();
  assert.equal(await start.getAttribute('aria-pressed'), 'true');
  const at = (await state(page)).current;
  // No release: the pointer stays on START, and so does focus.
  await start.click();
  assert.equal(await start.getAttribute('aria-pressed'), 'false');
  await advancesFrom(page, at);
  assert.equal((await state(page)).current, (at + 1) % names.length, 'the rotation moves on');
  await page.close();
});

test('Pop R7: A and B have no labels, and every console key is ink with off-white symbols', async () => {
  const page = await openRange();
  const labels = await page.locator('.range__key-label').allTextContents();
  assert.deepEqual(labels, ['START'], 'only START keeps a label');
  const keys = await page.evaluate(() =>
    [...document.querySelectorAll('.range__arrow, .range__button')].map((b) => {
      const s = getComputedStyle(b);
      return [s.backgroundColor, s.color];
    }),
  );
  assert.equal(keys.length, 4, 'Previous, Next, A and B');
  assert.equal(new Set(keys.map(([bg]) => bg)).size, 1, 'one key color');
  assert.deepEqual(keys[0], ['rgb(46, 36, 24)', 'rgb(244, 237, 224)'], 'color-ink keys with color-page symbols');
  await page.close();
});
