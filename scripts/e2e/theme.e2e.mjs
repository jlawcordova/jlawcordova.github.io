// Browser checks for dark mode (dark mode spec R1–R10): Auto, the default,
// follows the system setting; the theme button cycles Auto, Light and Dark and
// saves the choice, which applies before first paint on later pages; the
// button is a 44px target with a focus ring; theme-color follows; code blocks
// and the Range handheld keep their colors; there's no button without
// JavaScript; and the bar stays one row with nothing scrolling sideways in
// either theme.
//
// Run with `npm run e2e` after `npm run build`. Tests poll for end states and
// never sleep for a fixed time.

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { launch, loadPlaywright } from './browser.mjs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4321';
const NARROW = 390;
const WIDE = 1440;
const PAGE = { light: 'rgb(244, 237, 224)', dark: 'rgb(28, 23, 18)' };

/** @type {import('playwright').Browser} */
let browser;
/** A post with a code block, found from the blog list. */
let post;

before(async () => {
  const playwright = await loadPlaywright();
  if (!playwright) throw new Error('Playwright not found: browser checks NOT RUN');
  browser = await launch(playwright);
  const { page, context } = await open('/blog/', { width: WIDE });
  const posts = await page.evaluate(() =>
    [...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href')).filter((href) => /^\/.+\/\d{4}\/\d{2}\/\d{2}\/.+\/$/.test(href ?? '')),
  );
  for (const path of posts) {
    await page.goto(`${BASE}${path}`);
    if (await page.locator('pre').count()) {
      post = path;
      break;
    }
  }
  assert.ok(post, 'a post has a code block');
  await context.close();
});

after(async () => {
  await browser?.close();
});

/**
 * A page in a new context with the given system setting. `theme` is saved in
 * storage before any page loads, as an earlier visit would have left it.
 */
async function open(path, { width = NARROW, colorScheme = 'light', theme, javaScriptEnabled = true, context } = {}) {
  context ??= await browser.newContext({ viewport: { width, height: 900 }, colorScheme, javaScriptEnabled, reducedMotion: 'reduce' });
  if (theme) await context.addInitScript((value) => localStorage.setItem('theme', value), theme);
  // The theme <html> has when <body> starts, before anything can paint.
  await context.addInitScript(() => {
    new MutationObserver((_, observer) => {
      if (!document.body) return;
      window.__themeAtBody = document.documentElement.dataset.theme ?? null;
      observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
  });
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`);
  await page.evaluate(() => document.fonts.ready);
  return { page, context };
}

/** The theme as the page shows it now. */
const state = (page) =>
  page.evaluate(() => {
    const button = document.querySelector('.site-nav__theme');
    const glyphs = ['auto', 'light', 'dark'].filter((name) => {
      const glyph = button?.querySelector(`.site-nav__glyph-${name}`);
      return !!glyph && getComputedStyle(glyph).display !== 'none';
    });
    return {
      choice: document.documentElement.dataset.themeChoice ?? null,
      theme: document.documentElement.dataset.theme ?? null,
      atBody: window.__themeAtBody,
      background: getComputedStyle(document.body).backgroundColor,
      name: button?.getAttribute('aria-label'),
      title: button?.getAttribute('title'),
      glyphs,
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content')?.toUpperCase(),
      saved: localStorage.getItem('theme'),
    };
  });

/** Presses the theme button and waits for the next choice. */
const press = async (page, choice) => {
  await page.locator('.site-nav__theme').click();
  await page.waitForFunction((want) => document.documentElement.dataset.themeChoice === want, choice);
  return state(page);
};

test('R2, R4: Auto is the default and follows the system setting from first paint', async () => {
  for (const colorScheme of /** @type {const} */ (['light', 'dark'])) {
    const { page, context } = await open('/', { colorScheme });
    const now = await state(page);
    assert.equal(now.atBody, colorScheme, `${colorScheme}: set before <body>`);
    assert.deepEqual(
      [now.choice, now.theme, now.background, now.name, now.title, now.glyphs, now.saved],
      ['auto', colorScheme, PAGE[colorScheme], 'Theme: Auto', 'Theme: Auto', ['auto'], null],
    );
    await context.close();
  }
});

test('R2: Auto follows a system change, and a saved choice does not', async () => {
  const { page, context } = await open('/blog/');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');

  await press(page, 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  assert.equal((await state(page)).theme, 'light', 'a saved choice wins over the system');
  await context.close();
});

test('R3, R5, R9: the button cycles Auto, Light and Dark, saves the choice, and later pages paint in it', async () => {
  const { page, context } = await open('/', { width: WIDE });
  let now = await state(page);
  assert.deepEqual([now.choice, now.theme, now.themeColor], ['auto', 'light', '#F4EDE0']);

  now = await press(page, 'light');
  assert.deepEqual(
    [now.theme, now.name, now.glyphs, now.saved, now.background, now.themeColor],
    ['light', 'Theme: Light', ['light'], 'light', PAGE.light, '#F4EDE0'],
  );

  now = await press(page, 'dark');
  assert.deepEqual(
    [now.theme, now.name, now.glyphs, now.saved, now.background, now.themeColor],
    ['dark', 'Theme: Dark', ['dark'], 'dark', PAGE.dark, '#1C1712'],
  );

  // A new page in the same browser, with a light system setting.
  await page.goto(`${BASE}/blog/`);
  now = await state(page);
  assert.equal(now.atBody, 'dark', 'the saved choice is set before <body>');
  assert.deepEqual([now.choice, now.background, now.glyphs], ['dark', PAGE.dark, ['dark']]);

  // Back to Auto: the saved choice is cleared and the system setting shows.
  now = await press(page, 'auto');
  assert.deepEqual(
    [now.theme, now.name, now.glyphs, now.saved, now.background],
    ['light', 'Theme: Auto', ['auto'], null, PAGE.light],
  );
  await page.goto(`${BASE}/`);
  assert.equal((await state(page)).choice, 'auto');
  await context.close();
});

test('R5: the button is a 44px target with the focus ring, and works from the keyboard', async () => {
  for (const width of [NARROW, WIDE]) {
    const { page, context } = await open('/blog/', { width });
    const button = page.locator('.site-nav__theme');
    const box = await button.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, `${width}px: 44px target (${box?.width}×${box?.height})`);
    await button.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    const ring = await button.evaluate((el) => {
      const style = getComputedStyle(el);
      return { focused: document.activeElement === el, outline: `${style.outlineStyle} ${style.outlineWidth}` };
    });
    assert.deepEqual(ring, { focused: true, outline: 'solid 2px' }, `${width}px: visible focus ring`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.documentElement.dataset.themeChoice === 'light');
    await context.close();
  }
});

test('R5: without JavaScript there is no button and the page is light', async () => {
  const { page, context } = await open('/', { colorScheme: 'dark', javaScriptEnabled: false });
  const result = await page.evaluate(() => ({
    shown: getComputedStyle(document.querySelector('.site-nav__theme')).display !== 'none',
    background: getComputedStyle(document.body).backgroundColor,
  }));
  assert.deepEqual(result, { shown: false, background: PAGE.light });
  await context.close();
});

test('R7, R8: code blocks and the Range handheld look the same in both themes, and the island shadow blends in dark', async () => {
  const look = async (theme) => {
    const { page, context } = await open(post, { theme, width: WIDE });
    const code = await page.evaluate(() => {
      const pre = getComputedStyle(document.querySelector('pre'));
      return [pre.backgroundColor, pre.color];
    });
    await page.goto(`${BASE}/`);
    const shadow = await page.evaluate(() => getComputedStyle(document.querySelector('.hero-island [data-enter="shadow"] path')).fill);
    const handheld = await page.evaluate(() =>
      ['.range__console', '.range__bezel', '.range__stage', '.range__nameplate', '.range__arrow'].map((selector) => {
        const style = getComputedStyle(document.querySelector(selector));
        return `${selector} ${style.backgroundColor} ${style.color} ${style.borderTopColor}`;
      }),
    );
    await context.close();
    return { code, handheld, shadow };
  };
  const light = await look('light');
  const dark = await look('dark');
  assert.deepEqual(dark.code, light.code, 'code blocks');
  assert.equal(light.code[0], 'rgb(46, 36, 24)');
  assert.deepEqual(dark.handheld, light.handheld, 'the handheld');
  // The island's shadow keeps its art color in light and settles into the page in dark.
  assert.equal(light.shadow, 'rgb(201, 183, 154)');
  assert.equal(dark.shadow, PAGE.dark);
});

test('R10: the bar is one row and nothing scrolls sideways, in both themes', async () => {
  for (const theme of ['light', 'dark']) {
    for (const width of [NARROW, WIDE]) {
      for (const path of ['/', '/blog/', post, '/achievements/', '/404.html']) {
        const { page, context } = await open(path, { width, theme });
        const result = await page.evaluate(() => ({
          bar: Math.round(document.querySelector('.site-nav').getBoundingClientRect().height),
          scrollWidth: document.documentElement.scrollWidth,
          theme: document.documentElement.dataset.theme,
        }));
        assert.equal(result.theme, theme);
        assert.equal(result.bar, 62, `${theme} ${width}px ${path}: the bar is one row`);
        assert.ok(result.scrollWidth <= width, `${theme} ${width}px ${path}: no horizontal scroll (${result.scrollWidth})`);
        await page.screenshot({ path: `.e2e-output/theme-${theme}-${width}${path.replace(/[^a-z0-9]+/gi, '-')}.png` });
        await context.close();
      }
    }
  }
});
