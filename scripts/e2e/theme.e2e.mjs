// Browser checks for dark mode (dark mode spec R1–R10): a page follows the
// system setting until the theme button saves a choice, the choice applies
// before first paint on later pages, the button is a 44px toggle with a focus
// ring, theme-color follows, code blocks and the Range handheld keep their
// colors, there's no button without JavaScript, and the bar stays one row with
// nothing scrolling sideways in either theme.
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
    const shown = (el) => !!el && getComputedStyle(el).display !== 'none';
    return {
      theme: document.documentElement.dataset.theme ?? null,
      atBody: window.__themeAtBody,
      background: getComputedStyle(document.body).backgroundColor,
      pressed: button?.getAttribute('aria-pressed'),
      name: button?.getAttribute('aria-label'),
      moon: shown(button?.querySelector('.site-nav__glyph-moon')),
      sun: shown(button?.querySelector('.site-nav__glyph-sun')),
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
      saved: localStorage.getItem('theme'),
    };
  });

test('R2, R4: with no saved choice, a page follows the system setting from first paint', async () => {
  for (const colorScheme of /** @type {const} */ (['light', 'dark'])) {
    const { page, context } = await open('/', { colorScheme });
    const now = await state(page);
    assert.equal(now.atBody, colorScheme, `${colorScheme}: set before <body>`);
    assert.equal(now.theme, colorScheme);
    assert.equal(now.background, PAGE[colorScheme]);
    assert.equal(now.pressed, String(colorScheme === 'dark'));
    assert.equal(now.saved, null, 'nothing saved until the button is pressed');
    await context.close();
  }
});

test('R2: the page follows a system change until a choice is saved', async () => {
  const { page, context } = await open('/blog/');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.locator('.site-nav__theme').click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  assert.equal((await state(page)).theme, 'light', 'a saved choice wins over the system');
  await context.close();
});

test('R3, R5, R9: the button switches the theme, saves it, and later pages paint in it', async () => {
  const { page, context } = await open('/', { width: WIDE });
  let now = await state(page);
  assert.deepEqual([now.theme, now.pressed, now.name, now.moon, now.sun], ['light', 'false', 'Dark theme', true, false]);
  assert.equal(now.themeColor?.toUpperCase(), '#F4EDE0');

  await page.locator('.site-nav__theme').click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  now = await state(page);
  assert.deepEqual([now.pressed, now.moon, now.sun, now.saved, now.background], ['true', false, true, 'dark', PAGE.dark]);
  assert.equal(now.themeColor?.toUpperCase(), '#1C1712');

  // A new page in the same browser, with a light system setting.
  await page.goto(`${BASE}/blog/`);
  now = await state(page);
  assert.equal(now.atBody, 'dark', 'the saved choice is set before <body>');
  assert.equal(now.background, PAGE.dark);

  await page.locator('.site-nav__theme').click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  assert.equal((await state(page)).saved, 'light');
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
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
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

test('R7, R8: code blocks and the Range handheld look the same in both themes', async () => {
  const look = async (theme) => {
    const { page, context } = await open(post, { theme, width: WIDE });
    const code = await page.evaluate(() => {
      const pre = getComputedStyle(document.querySelector('pre'));
      return [pre.backgroundColor, pre.color];
    });
    await page.goto(`${BASE}/`);
    const handheld = await page.evaluate(() =>
      ['.range__console', '.range__bezel', '.range__stage', '.range__nameplate', '.range__arrow'].map((selector) => {
        const style = getComputedStyle(document.querySelector(selector));
        return `${selector} ${style.backgroundColor} ${style.color} ${style.borderTopColor}`;
      }),
    );
    await context.close();
    return { code, handheld };
  };
  const light = await look('light');
  const dark = await look('dark');
  assert.deepEqual(dark.code, light.code, 'code blocks');
  assert.equal(light.code[0], 'rgb(46, 36, 24)');
  assert.deepEqual(dark.handheld, light.handheld, 'the handheld');
});

test('R10: the bar is one row and nothing scrolls sideways, in both themes', async () => {
  for (const theme of ['light', 'dark']) {
    for (const width of [NARROW, WIDE]) {
      for (const path of ['/', '/blog/', post, '/accomplishments/', '/404.html']) {
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
