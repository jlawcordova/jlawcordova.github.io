// Browser checks for the site shell and the hero (pixel-first look spec R5–R8,
// R11, R12, Shell and Hero): the small-screen menu opens, closes and resets,
// and stays out of the way without JavaScript and on wide screens; Motion loads
// only when the menu is reached for; the nav is square with a 16px blur and no
// shadow; Lately shows only with the accomplishments section; the footer's
// links are 44px targets and "↑ TOP" goes to the top; the hero's greeting is
// gone, its island keeps the floaty loop, and its entrance ends visible or
// doesn't run under reduced motion; nothing is rounded and nothing scrolls
// sideways.
//
// Run with `npm run e2e` after `npm run build`. Tests poll for end states and
// never sleep for a fixed time.

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { launch, loadPlaywright } from './browser.mjs';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4321';
const NARROW = 390;
const WIDE = 1440;

/** @type {import('playwright').Browser} */
let browser;
/** A post's path, found from the blog list. */
let post;

before(async () => {
  const playwright = await loadPlaywright();
  if (!playwright) throw new Error('Playwright not found: browser checks NOT RUN');
  browser = await launch(playwright);
  const page = await open('/blog/', { width: WIDE });
  post = await page.evaluate(
    () => [...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href')).find((href) => /^\/.+\/\d{4}\/\d{2}\/\d{2}\/.+\/$/.test(href ?? '')),
  );
  assert.ok(post, 'the blog list links to a post');
  await close(page);
});

after(async () => {
  await browser?.close();
});

/** A page in its own context, with fonts loaded. */
async function open(path, { width = NARROW, reducedMotion = 'no-preference', javaScriptEnabled = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion, javaScriptEnabled });
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const close = (page) => page.context().close();

/** The menu button, the links and the bar, as they are now. */
const menu = (page) =>
  page.evaluate(() => {
    const shown = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
    const nav = /** @type {HTMLElement} */ (document.querySelector('.site-nav'));
    const button = /** @type {HTMLButtonElement} */ (nav.querySelector('.site-nav__menu'));
    const links = /** @type {HTMLElement} */ (nav.querySelector('.site-nav__links'));
    const box = button.getBoundingClientRect();
    return {
      button: shown(button),
      links: shown(links),
      open: nav.classList.contains('is-open'),
      expanded: button.getAttribute('aria-expanded'),
      label: button.getAttribute('aria-label'),
      controls: button.getAttribute('aria-controls'),
      linksId: links.id,
      focused: document.activeElement === button,
      size: [Math.round(box.width), Math.round(box.height)],
      text: button.textContent?.trim(),
      border: getComputedStyle(button).borderTopStyle,
    };
  });

const openMenu = async (page) => {
  await page.locator('.site-nav__menu').click();
  await page.waitForFunction(() => document.querySelector('.site-nav__menu')?.getAttribute('aria-expanded') === 'true');
};

const waitClosed = (page) =>
  page.waitForFunction(() => {
    const nav = document.querySelector('.site-nav');
    return !nav?.classList.contains('is-open') && nav?.querySelector('.site-nav__menu')?.getAttribute('aria-expanded') === 'false';
  });

/** True when a computed transform leaves the element where it is. */
const untransformed = (transform) => transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)';

test('R7: at 390px the menu button shows, icon only, and opens and closes the links', async () => {
  const page = await open('/');
  let m = await menu(page);
  assert.equal(m.button, true, 'the menu button shows');
  assert.equal(m.links, false, 'the links are hidden until it is pressed');
  assert.deepEqual(m.size, [44, 44], 'a 44px target');
  assert.equal(m.text, '', 'no text');
  assert.equal(m.border, 'none', 'no border');
  assert.equal(m.controls, m.linksId, 'aria-controls names the links');
  assert.deepEqual([m.expanded, m.label], ['false', 'Open menu']);

  await openMenu(page);
  m = await menu(page);
  assert.equal(m.links, true, 'the links show');
  assert.deepEqual([m.expanded, m.label], ['true', 'Close menu']);
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('.site-nav__links > a')].map((a) => {
      const box = a.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }),
  );
  const barWidth = await page.evaluate(() => document.querySelector('.site-nav__links')?.getBoundingClientRect().width ?? 0);
  for (const row of rows) {
    assert.ok(row.height >= 44, `each row is a 44px target (${row.height})`);
    assert.equal(Math.round(row.width), Math.round(barWidth), 'each row is full width');
  }

  await page.locator('.site-nav__menu').click();
  await waitClosed(page);
  m = await menu(page);
  assert.deepEqual([m.links, m.expanded, m.label], [false, 'false', 'Open menu']);
  await close(page);
});

test('R7: a link, Escape and an outside click close the menu, and Escape returns focus', async () => {
  const page = await open('/');

  await openMenu(page);
  await page.locator('.site-nav__links a[href="/#range"]').click();
  await waitClosed(page);

  // Focus starts inside the menu, so returning it to the button is what's tested.
  await openMenu(page);
  await page.locator('.site-nav__links a').first().focus();
  assert.equal((await menu(page)).focused, false, 'focus is in the menu, not on the button');
  await page.keyboard.press('Escape');
  await waitClosed(page);
  assert.equal((await menu(page)).focused, true, 'Escape returns focus to the button');

  await openMenu(page);
  await page.mouse.click(NARROW / 2, 860);
  await waitClosed(page);
  await close(page);
});

test('R7: widening past 720px closes the menu, and narrowing again starts closed', async () => {
  const page = await open('/');
  await openMenu(page);
  await page.setViewportSize({ width: 1024, height: 900 });
  await waitClosed(page);
  let m = await menu(page);
  assert.deepEqual([m.button, m.links], [false, true], 'wide: no button, the links show');
  await page.setViewportSize({ width: NARROW, height: 900 });
  m = await menu(page);
  assert.deepEqual([m.button, m.links, m.expanded], [true, false, 'false'], 'narrow again: closed');
  await close(page);
});

test('R7: without JavaScript the links show and the button does not', async () => {
  for (const path of ['/', post]) {
    const page = await open(path, { javaScriptEnabled: false });
    const m = await menu(page);
    assert.deepEqual([m.button, m.links], [false, true], path);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${path}: no horizontal scroll`,
    );
    await close(page);
  }
});

test('R7: at 1440px the button is hidden and the bar is one row', async () => {
  const page = await open('/', { width: WIDE });
  const m = await menu(page);
  assert.deepEqual([m.button, m.links], [false, true]);
  assert.equal(await page.evaluate(() => Math.round(document.querySelector('.site-nav')?.getBoundingClientRect().height ?? 0)), 62);
  await close(page);
});

test('R7: on narrow phones (320px, 375px) the closed bar stays one row, so the fixed header never covers the page', async () => {
  for (const width of [320, 375]) {
    const page = await open('/blog/', { width });
    const bar = await page.evaluate(() => ({
      nav: Math.round(document.querySelector('.site-nav')?.getBoundingClientRect().height ?? 0),
      scrollWidth: document.documentElement.scrollWidth,
    }));
    assert.equal(bar.nav, 62, `${width}px: one row`);
    assert.ok(bar.scrollWidth <= width, `${width}px: no horizontal scroll`);
    await close(page);
  }
});

test('R10, R11: Motion loads only once the menu button is reached for, and the links end fully visible', async () => {
  const page = await open(post);
  const scripts = () => page.evaluate(() => performance.getEntriesByType('resource').filter((r) => /\.m?js(\?|$)/.test(r.name)).length);
  const before = await scripts();
  await page.locator('.site-nav__menu').hover();
  await page.waitForFunction((n) => performance.getEntriesByType('resource').filter((r) => /\.m?js(\?|$)/.test(r.name)).length > n, before);
  await openMenu(page);
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.site-nav__links > a')].every((a) => {
      const style = getComputedStyle(a);
      return style.opacity === '1' && (style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)');
    }),
  );
  await close(page);
});

test('R6: the nav is square, with a 16px blur, a thick ink edge and no shadow', async () => {
  const page = await open('/', { width: WIDE });
  const nav = await page.evaluate(() => {
    const style = getComputedStyle(/** @type {Element} */ (document.querySelector('.site-nav')));
    return {
      shadow: style.boxShadow,
      blur: style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter'),
      border: style.borderTopWidth,
      radius: style.borderTopLeftRadius,
      brand: document.querySelector('.site-nav__brand')?.textContent?.trim(),
    };
  });
  assert.equal(nav.shadow, 'none');
  assert.equal(nav.blur, 'blur(16px)');
  assert.equal(nav.border, '3px');
  assert.equal(nav.radius, '0px');
  assert.equal(nav.brand, 'J. LAW. Cordova');
  await close(page);
});

test('Lately shows only when the home page has its accomplishments section (so never with the committed placeholder)', async () => {
  const home = await open('/', { width: WIDE });
  const section = await home.locator('#accomplishments').count();
  assert.equal(await home.locator('.site-nav a[href="/#accomplishments"]').count(), section, 'home');
  await close(home);
  const page = await open(post, { width: WIDE });
  assert.equal(await page.locator('.site-nav a[href="/#accomplishments"]').count(), section, 'a post');
  await close(page);
});

for (const width of [NARROW, WIDE]) {
  test(`R1, R18: at ${width}px nothing is rounded and nothing scrolls sideways`, async () => {
    for (const path of ['/', '/blog/', post]) {
      const page = await open(path, { width });
      const result = await page.evaluate(() => ({
        rounded: [...document.querySelectorAll('*')]
          .filter((el) => {
            const s = getComputedStyle(el);
            return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].some((r) => r !== '0px');
          })
          .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`),
        scrollWidth: document.documentElement.scrollWidth,
      }));
      assert.deepEqual(result.rounded, [], `${path}: square corners`);
      assert.ok(result.scrollWidth <= width, `${path}: no horizontal scroll (${result.scrollWidth})`);
      await close(page);
    }
  });
}

test('R8: the footer links are GitHub, LinkedIn, X, Blog and a gold ↑ TOP, each at least 44 × 44px', async () => {
  for (const width of [NARROW, WIDE]) {
    const page = await open(post, { width });
    const footer = await page.evaluate(() => {
      const gold = getComputedStyle(document.documentElement).getPropertyValue('--color-gold').trim();
      const probe = document.createElement('span');
      probe.style.color = gold;
      document.body.append(probe);
      const goldRgb = getComputedStyle(probe).color;
      probe.remove();
      const links = [...document.querySelectorAll('.site-footer__links a')];
      return {
        labels: links.map((a) => a.textContent?.replace(/\s+/g, ' ').trim()),
        boxes: links.map((a) => {
          const box = a.getBoundingClientRect();
          return [box.width, box.height];
        }),
        topColor: getComputedStyle(links.at(-1)).color,
        topHref: links.at(-1)?.getAttribute('href'),
        goldRgb,
        font: getComputedStyle(/** @type {Element} */ (document.querySelector('.site-footer'))).fontFamily,
        chip: !!document.querySelector('.site-footer__chip .jl-mark'),
      };
    });
    assert.deepEqual(footer.labels, ['GITHUB', 'LINKEDIN', 'X', 'BLOG', '↑ TOP']);
    for (const [w, h] of footer.boxes) assert.ok(w >= 44 && h >= 44, `${width}px: tap target ${w}×${h}`);
    assert.equal(footer.topHref, '#top');
    assert.equal(footer.topColor, footer.goldRgb, '↑ TOP is gold at rest');
    assert.match(footer.font, /Silkscreen/);
    assert.ok(footer.chip, 'the mark sits on its chip');
    await close(page);
  }
});

test('R8: ↑ TOP goes back to the top, on the home page and on a post', async () => {
  for (const path of ['/', post]) {
    const page = await open(path);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForFunction(() => scrollY > 0);
    await page.locator('.site-footer__top').click();
    await page.waitForFunction(() => scrollY === 0);
    await close(page);
  }
});

test('R5, Hero: the greeting is gone and the island keeps its floaty loop on an inner wrapper', async () => {
  const page = await open('/', { width: WIDE });
  const hero = await page.evaluate(() => {
    const island = document.querySelector('.hero .hero-island');
    const floaty = island?.closest('.floaty');
    const art = document.querySelector('.hero__art');
    return {
      pretitle: document.querySelectorAll('.hero__pretitle').length,
      greeting: /Hi, I[’']m/.test(document.querySelector('.hero')?.textContent ?? ''),
      lede: document.querySelector('.hero__lede')?.textContent?.replace(/\s+/g, ' ').trim(),
      floaty: !!floaty,
      inner: !!floaty && !!art && floaty !== art && art.contains(floaty),
      artFloaty: art?.classList.contains('floaty'),
    };
  });
  assert.equal(hero.pretitle, 0);
  assert.equal(hero.greeting, false);
  assert.equal(
    hero.lede,
    'Senior developer and tech lead in Davao City. I lead full-stack teams, design data platforms on Microsoft Fabric, and run releases with sign-offs and rollback.',
  );
  assert.equal(hero.floaty, true, 'the island is inside .floaty');
  assert.equal(hero.inner, true, '.floaty is an inner wrapper of .hero__art');
  assert.equal(hero.artFloaty, false, 'the entrance wrapper is not .floaty');
  await close(page);
});

test('R10, R11: the hero entrance ends with everything fully visible in place', async () => {
  const page = await open('/', { width: WIDE });
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.hero__title, .hero__lede, .hero__actions, .hero__art')].every((el) => {
      const style = getComputedStyle(el);
      return style.opacity === '1' && (style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)');
    }),
  );
  await close(page);
});

test('R11, R12: without JavaScript and under reduced motion the hero shows at once, with nothing animating', async () => {
  for (const options of [{ javaScriptEnabled: false }, { reducedMotion: 'reduce' }]) {
    const page = await open('/', { width: WIDE, ...options });
    const els = await page.evaluate(() =>
      [...document.querySelectorAll('.hero__title, .hero__lede, .hero__actions, .hero__art, .hero__float')].map((el) => {
        const style = getComputedStyle(el);
        return { float: el.classList.contains('hero__float'), opacity: style.opacity, transform: style.transform, animations: el.getAnimations().length };
      }),
    );
    assert.equal(els.length, 5);
    for (const el of els) {
      assert.equal(el.opacity, '1', JSON.stringify(options));
      // The floaty loop moves the inner wrapper whenever motion is allowed.
      if (!el.float || options.reducedMotion) assert.ok(untransformed(el.transform), `${JSON.stringify(options)}: ${el.transform}`);
      if (options.reducedMotion) assert.equal(el.animations, 0, 'no animation runs under reduced motion');
    }
    await close(page);
  }
});
