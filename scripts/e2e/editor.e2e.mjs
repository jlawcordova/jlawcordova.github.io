// Browser checks for the pixel-art lab's Scene mode (pixel-art engine spec
// D17, R15, R16, R19–R22, R24, R5). Each editing flow runs once with the
// pointer and once with the keyboard alone. Controls are found by their
// roles and accessible names; only dragging on the stage uses positions,
// worked out from the stage's own zoom.
//
// Run with `npm run e2e` after `npm run build`. Screenshots go to
// .e2e-output/.

import assert from 'node:assert/strict';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { serialize } from '../../src/lib/pixel-art/serialize.mjs';
import { launch, loadPlaywright } from './browser.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DIST = join(ROOT, 'dist');
const OUTPUT_DIR = join(ROOT, '.e2e-output');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4321';
const LAB = `${BASE}/lab/pixel-art/`;
const SCENE = 'library-demo';
const SCENE_FILE = join(ROOT, `src/assets/pixel-art/source/scenes/${SCENE}.mjs`);
/** The editor's JS budget, engine included (spec D10). */
const JS_BUDGET = 30 * 1024;

/** @type {import('playwright').Browser} */
let browser;
let committed = '';

before(async () => {
  const playwright = await loadPlaywright();
  if (!playwright) throw new Error('Playwright not found: browser checks NOT RUN');
  browser = await launch(playwright);
  committed = await readFile(SCENE_FILE, 'utf8');
});

after(async () => {
  await browser?.close();
});

// ------------------------------------------------------------------ helpers

/**
 * A fresh page on the lab, with its own storage. `storage: false` makes
 * localStorage throw, as some private modes do; `init` runs before the
 * page's own scripts.
 * @param {{ width?: number, height?: number, reducedMotion?: 'reduce' | 'no-preference', storage?: boolean, init?: [Function, any] }} [options]
 */
async function openLab({ width = 1440, height = 900, reducedMotion = 'no-preference', storage = true, init } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion, acceptDownloads: true });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin });
  if (!storage) {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('Storage is blocked', 'SecurityError');
        },
      });
    });
  }
  if (init) await context.addInitScript(init[0], init[1]);
  const page = await context.newPage();
  /** @type {string[]} */
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.goto(LAB);
  await page.getByRole('group', { name: 'Scene stage' }).waitFor();
  return { context, page, errors };
}

/** The scene's data from its source text, as `npm run art` would load it. */
const load = async (text) => (await import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`)).default;

/** Picks a scene in the document picker with the pointer. */
async function pickScene(page, name) {
  await page.getByRole('combobox', { name: 'Open' }).selectOption(`scene:${name}`);
}

/** Opens Export with the pointer, reads the source, and closes it. */
async function exportText(page) {
  await page.getByRole('button', { name: 'Export' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  const text = await dialog.getByRole('textbox', { name: 'Source' }).inputValue();
  await dialog.getByRole('button', { name: 'Close' }).click();
  return text;
}

/** Presses Tab until the control with this role and name has focus. */
async function tabTo(page, role, name, { back = false, max = 120 } = {}) {
  const target = page.getByRole(role, { name, exact: true });
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  }
  throw new Error(`Tab never reached the ${role} "${name}"`);
}

/** Opens Export with the keyboard, reads the source, and closes it with Escape. */
async function exportTextByKeyboard(page) {
  await tabTo(page, 'button', 'Export', { back: true });
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Export' });
  const text = await dialog.getByRole('textbox', { name: 'Source' }).inputValue();
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  return text;
}

/** The items in `now` that aren't in `base`, compared as JSON. */
function added(base, now) {
  const left = base.map((item) => JSON.stringify(item));
  return now.filter((item) => {
    const i = left.indexOf(JSON.stringify(item));
    if (i === -1) return true;
    left.splice(i, 1);
    return false;
  });
}

/** The index of the one item that isn't in the committed scene. */
async function newItem(text, base = committed) {
  base = (await load(base)).items;
  const items = (await load(text)).items;
  const extra = added(base, items);
  assert.equal(extra.length, 1, `expected one new item, got ${JSON.stringify(extra)}`);
  return { item: extra[0], index: items.findIndex((i) => JSON.stringify(i) === JSON.stringify(extra[0])), items };
}

async function screenshot(page, name) {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await page.screenshot({ path: join(OUTPUT_DIR, `${name}.png`), fullPage: true });
}

/** Every file under a folder, as paths relative to it. */
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(relative(DIST, path));
  }
  return out;
}

// ------------------------------------------------------------- unlisted

describe('the page (R15, R24)', () => {
  test('R15: the lab carries the robots meta, and no other page links to /lab/', async () => {
    const html = await readFile(join(DIST, 'lab/pixel-art/index.html'), 'utf8');
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
    const others = (await walk(DIST)).filter((f) => /\.(html|xml|txt|json|webmanifest)$/.test(f) && f !== join('lab', 'pixel-art', 'index.html'));
    assert.ok(others.length > 10, 'dist/ looks empty');
    for (const file of others) {
      const text = await readFile(join(DIST, file), 'utf8');
      assert.ok(!text.includes('/lab/'), `${file} mentions /lab/`);
      assert.ok(!/robots/.test(text) || !text.includes('noindex'), `${file} is noindex`);
    }
  });

  test('R24: the editor JS is within 30 KB gzip, and only the lab page loads its JS and CSS', async () => {
    const html = await readFile(join(DIST, 'lab/pixel-art/index.html'), 'utf8');
    const assets = [...html.matchAll(/(?:src|href)="\/_astro\/([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
    const scripts = assets.filter((a) => a.endsWith('.js'));
    assert.ok(scripts.length > 0, 'the lab loads no script');
    let gzip = 0;
    for (const script of scripts) gzip += gzipSync(await readFile(join(DIST, '_astro', script))).length;
    assert.ok(gzip <= JS_BUDGET, `editor JS is ${gzip} bytes gzip, over ${JS_BUDGET}`);
    const own = assets.filter((a) => /pixel-art/.test(a));
    assert.ok(own.some((a) => a.endsWith('.css')), 'the lab has no CSS of its own');
    for (const file of (await walk(DIST)).filter((f) => f.endsWith('.html') && f !== join('lab', 'pixel-art', 'index.html'))) {
      const text = await readFile(join(DIST, file), 'utf8');
      for (const asset of [...scripts, ...own]) assert.ok(!text.includes(asset), `${file} loads ${asset}`);
    }
  });
});

// ------------------------------------------------------- scene editing

describe('scene editing (R16)', () => {
  test('R16: with the pointer: add, move, change level and order, then remove an item', async () => {
    const { context, page, errors } = await openLab();
    await pickScene(page, SCENE);
    assert.equal(await exportText(page), committed, 'the scene opens as committed');

    // Tap a thumbnail, then tap the stage.
    await page.getByRole('button', { name: 'tree', exact: true }).click();
    await page.getByRole('group', { name: 'Scene stage' }).click();
    let { item, index } = await newItem(await exportText(page));
    assert.equal(item.object, 'tree');
    const [col, row, level] = item.at.tile;
    assert.equal(level, 0);

    await page.getByRole('button', { name: 'Increase column' }).click();
    await page.getByRole('button', { name: 'Increase row' }).click();
    await page.getByRole('button', { name: 'Increase level' }).click();
    ({ item } = await newItem(await exportText(page)));
    assert.deepEqual(item.at.tile, [col + 1, row + 1, 1]);

    await page.getByRole('button', { name: 'Raise', exact: true }).click();
    let moved = await newItem(await exportText(page));
    assert.equal(moved.index, index + 1, 'Raise moves it one later in paint order');
    await page.getByRole('button', { name: 'Lower', exact: true }).click();
    moved = await newItem(await exportText(page));
    assert.equal(moved.index, index, 'Lower moves it back');

    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    assert.equal(await exportText(page), committed, 'removing it gives the committed scene back');
    await screenshot(page, 'editor-pointer-1440');
    assert.deepEqual(errors, []);
    await context.close();
  });

  test('R16: with the pointer: drag a thumbnail onto the stage, then drag the item one tile', async () => {
    const { context, page, errors } = await openLab();
    await pickScene(page, SCENE);
    const stage = page.getByRole('group', { name: 'Scene stage' });
    await page.getByRole('button', { name: 'block', exact: true }).dragTo(stage);
    let { item } = await newItem(await exportText(page));
    assert.equal(item.object, 'block');
    const [col, row, level] = item.at.tile;

    // The block's top face covers the tile it was dropped on, under the
    // stage's center, so a drag from there moves it.
    await page.getByRole('button', { name: 'Select', exact: true }).click();
    const zoom = Number((await page.locator('#lab-status-zoom').textContent()).replace('×', ''));
    const box = await page.locator('#lab-canvas').boundingBox();
    const frame = await stage.boundingBox();
    const [x, y] = [frame.x + frame.width / 2, frame.y + frame.height / 2];
    assert.ok(x > box.x && y > box.y, 'the stage center is on the canvas');
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 8 * zoom, y + 4 * zoom, { steps: 4 });
    await page.mouse.move(x + 16 * zoom, y + 8 * zoom, { steps: 4 });
    await page.mouse.up();
    ({ item } = await newItem(await exportText(page)));
    assert.deepEqual(item.at.tile, [col + 1, row, level], 'dragged one column');

    // The whole drag is one undo step.
    await page.getByRole('button', { name: 'Undo' }).click();
    ({ item } = await newItem(await exportText(page)));
    assert.deepEqual(item.at.tile, [col, row, level]);
    await page.getByRole('button', { name: 'Redo' }).click();
    ({ item } = await newItem(await exportText(page)));
    assert.deepEqual(item.at.tile, [col + 1, row, level]);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test('R21: with the keyboard alone: add, move, change level and order, nudge, then remove an item', async () => {
    // The scene that opens first, so the native picker isn't needed: on
    // macOS, headless Chromium ignores keys on a closed <select>.
    const { context, page, errors } = await openLab();
    const first = await readFile(join(ROOT, 'src/assets/pixel-art/source/scenes/hero-island.mjs'), 'utf8');
    assert.equal(await exportTextByKeyboard(page), first, 'hero-island opens first, as committed');

    // Enter on a thumbnail places it at the stage cursor.
    await tabTo(page, 'button', 'tree');
    await page.keyboard.press('Enter');
    let { item, index } = await newItem(await exportTextByKeyboard(page), first);
    const [col, row] = item.at.tile;

    await tabTo(page, 'group', 'Scene stage', { back: true });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('PageUp');
    ({ item } = await newItem(await exportTextByKeyboard(page), first));
    assert.deepEqual(item.at.tile, [col + 1, row + 1, 1]);

    // hero-island places every item by pixel, so a new one goes in front.
    await tabTo(page, 'group', 'Scene stage');
    await page.keyboard.press('[');
    let moved = await newItem(await exportTextByKeyboard(page), first);
    assert.equal(moved.index, index - 1, '[ lowers it');
    await tabTo(page, 'group', 'Scene stage');
    await page.keyboard.press(']');
    moved = await newItem(await exportTextByKeyboard(page), first);
    assert.equal(moved.index, index, '] raises it');

    // Shift + arrows nudge by a pixel; the item is then placed by pixel.
    await tabTo(page, 'group', 'Scene stage');
    await page.keyboard.press('Shift+ArrowLeft');
    ({ item } = await newItem(await exportTextByKeyboard(page), first));
    assert.ok(item.at.px, 'a nudged item is placed by pixel');
    await tabTo(page, 'group', 'Scene stage');
    await page.keyboard.press('Control+z');
    ({ item } = await newItem(await exportTextByKeyboard(page), first));
    assert.deepEqual(item.at.tile, [col + 1, row + 1, 1], 'Ctrl+Z undoes the nudge');

    await tabTo(page, 'group', 'Scene stage');
    await page.keyboard.press('Delete');
    assert.equal(await exportTextByKeyboard(page), first, 'removing it gives the committed scene back');

    // Selecting from the Items list, and Escape to deselect.
    await tabTo(page, 'tree', 'Items');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.getByRole('treeitem', { selected: true }).count(), 1, 'arrows in Items select an item');
    await tabTo(page, 'group', 'Scene stage', { back: true });
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('treeitem', { selected: true }).count(), 0, 'Escape deselects');
    assert.deepEqual(errors, []);
    await context.close();
  });

  test('R21: the toolbar is one tab stop, with arrow keys inside it', async () => {
    const { context, page } = await openLab();
    await tabTo(page, 'button', 'Scene');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Select');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Scene stage', 'Tab leaves the toolbar for the stage');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Select', 'and comes back to the same tool');
    await context.close();
  });
});

// -------------------------------------------------------------- export

describe('export (R19)', () => {
  test('R19: Copy source and Download .mjs both give the canonical source and its repo path', async () => {
    const { context, page } = await openLab();
    await pickScene(page, SCENE);
    // An edit first, so the export isn't just the committed file.
    await page.getByRole('button', { name: 'tree', exact: true }).click();
    await page.getByRole('group', { name: 'Scene stage' }).click();

    await page.getByRole('button', { name: 'Export' }).click();
    const dialog = page.getByRole('dialog', { name: 'Export' });
    await assert.doesNotReject(dialog.getByText(`src/assets/pixel-art/source/scenes/${SCENE}.mjs`).waitFor());
    const shown = await dialog.getByRole('textbox', { name: 'Source' }).inputValue();
    assert.equal(serialize(await load(shown)), shown, 'the source is canonical');

    await dialog.getByRole('button', { name: 'Copy source' }).click();
    await dialog.getByText(`Copied the source of ${SCENE}.`).waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), shown, 'clipboard');

    const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Download .mjs' }).click()]);
    assert.equal(download.suggestedFilename(), `${SCENE}.mjs`);
    assert.equal(await readFile(await download.path(), 'utf8'), shown, 'download');
    await context.close();
  });

  test('R19: with problems, Export lists them and both buttons are off', async () => {
    // A draft that places an object the site doesn't have.
    const doc = { ...(await load(committed)), items: [{ object: 'no-such-object', at: { tile: [0, 0, 0] } }] };
    const init = [
      ([key, value]) => {
        try {
          if (!sessionStorage.getItem('seeded')) {
            localStorage.setItem(key, value);
            sessionStorage.setItem('seeded', '1');
          }
        } catch {}
      },
      [`pixel-lab:scene:${SCENE}`, JSON.stringify({ version: 'x', saved: 0, doc })],
    ];
    const { context, page } = await openLab({ init });
    await pickScene(page, SCENE);
    await page.getByRole('button', { name: 'Export' }).click();
    const dialog = page.getByRole('dialog', { name: 'Export' });
    await dialog.getByText("items[0]: object 'no-such-object' does not exist").waitFor();
    assert.ok(await dialog.getByRole('button', { name: 'Copy source' }).isDisabled());
    assert.ok(await dialog.getByRole('button', { name: 'Download .mjs' }).isDisabled());
    await context.close();
  });
});

// -------------------------------------------------------------- drafts

describe('drafts (R20)', () => {
  test('R20: a reload keeps the draft, and Reset goes back to the site version', async () => {
    const { context, page } = await openLab();
    await pickScene(page, SCENE);
    await page.getByRole('button', { name: 'tree', exact: true }).click();
    await page.getByRole('group', { name: 'Scene stage' }).click();
    const edited = await exportText(page);
    assert.notEqual(edited, committed);
    await page.getByText('Draft, just now').waitFor();

    await page.reload();
    await pickScene(page, SCENE);
    assert.equal(await exportText(page), edited, 'the draft survives a reload');

    await page.getByRole('button', { name: 'Reset to site version' }).click();
    assert.equal(await exportText(page), committed);
    await page.getByText('Site version', { exact: true }).waitFor();
    await page.reload();
    await pickScene(page, SCENE);
    assert.equal(await exportText(page), committed, 'no draft is left');
    await context.close();
  });

  test('R20: a draft from an older site version shows the banner', async () => {
    const doc = await load(committed);
    doc.items = doc.items.slice(1);
    const init = [
      ([key, value]) => {
        try {
          if (!sessionStorage.getItem('seeded')) {
            localStorage.setItem(key, value);
            sessionStorage.setItem('seeded', '1');
          }
        } catch {}
      },
      [`pixel-lab:scene:${SCENE}`, JSON.stringify({ version: '00000000', saved: 0, doc })],
    ];
    const { context, page } = await openLab({ init });
    await pickScene(page, SCENE);
    const banner = page.getByRole('region', { name: 'Draft' });
    await banner.getByText(`This draft started from an older version of ${SCENE} on the site.`).waitFor();
    await screenshot(page, 'editor-stale-draft-1440');

    // Keep draft: the banner goes and the draft stays.
    await banner.getByRole('button', { name: 'Keep draft' }).click();
    await banner.waitFor({ state: 'hidden' });
    assert.equal(await exportText(page), serialize(doc));
    await page.reload();
    await pickScene(page, SCENE);
    assert.ok(await banner.isHidden(), 'a kept draft is no longer stale');

    // Load site version: back to the committed scene.
    await page.evaluate(([key]) => {
      const draft = JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify({ ...draft, version: '00000000' }));
    }, [`pixel-lab:scene:${SCENE}`]);
    await page.reload();
    await pickScene(page, SCENE);
    await banner.getByRole('button', { name: 'Load site version' }).click();
    await banner.waitFor({ state: 'hidden' });
    assert.equal(await exportText(page), committed);
    await context.close();
  });

  test('R20: with storage blocked, the lab says drafts are off and still edits', async () => {
    const { context, page, errors } = await openLab({ storage: false });
    await page.getByText("Drafts off: this browser isn't saving them").waitFor();
    await pickScene(page, SCENE);
    await page.getByRole('button', { name: 'tree', exact: true }).click();
    await page.getByRole('group', { name: 'Scene stage' }).click();
    assert.notEqual(await exportText(page), committed);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

// ---------------------------------------------------------- responsive

describe('layout (R22, R5)', () => {
  for (const width of [320, 390, 1440]) {
    test(`R22: no horizontal scroll at ${width}px, on every panel`, async () => {
      const { context, page } = await openLab({ width, height: width > 900 ? 900 : 844 });
      const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      assert.ok(await fits(), 'on load');
      if (width < 960) {
        for (const name of ['Library', 'Items', 'Inspector']) {
          await page.getByRole('tab', { name }).click();
          assert.ok(await page.getByRole('tabpanel').isVisible(), `${name} shows a tab panel`);
          assert.ok(await fits(), `with ${name} open`);
        }
        await page.getByRole('tab', { name: 'Library' }).click();
      }
      // The largest scene, zoomed in, pans inside the stage, not the page.
      await pickScene(page, 'hero-island');
      await page.getByRole('button', { name: 'Zoom 4×' }).click();
      assert.ok(await fits(), 'at 4×');
      await page.getByRole('button', { name: 'Zoom to fit' }).click();
      await page.getByRole('button', { name: 'Export' }).click();
      assert.ok(await fits(), 'with Export open');
      await page.getByRole('button', { name: 'Close' }).click();
      await screenshot(page, `editor-${width}`);
      await context.close();
    });
  }

  test('R22: at 960px and up, Library, Items and Inspector are columns, not tabs', async () => {
    const { context, page } = await openLab({ width: 1440 });
    assert.equal(await page.getByRole('tab').count(), 0);
    assert.equal(await page.getByRole('tabpanel').count(), 0);
    for (const name of ['Library', 'Items']) assert.ok(await page.getByRole('heading', { name, exact: true }).isVisible(), name);
    await context.close();
  });

  test('R5: with reduced motion, nothing animates on the lab or the home page', async () => {
    const { context, page } = await openLab({ reducedMotion: 'reduce' });
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0, 'lab');
    await page.goto(`${BASE}/`);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0, 'home');
    await context.close();
  });
});
