// Browser checks for the pixel-art lab's Scene mode (pixel-art engine spec
// D17, R15, R16, R19–R22, R24, R5). Each editing flow runs once with the
// pointer and once with the keyboard alone. Controls are found by their
// roles and accessible names; only dragging on the stage uses positions,
// worked out from the stage's own zoom.
//
// Run with `npm run e2e` after `npm run build`. Screenshots go to
// .e2e-output/.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import palette from '../../src/assets/pixel-art/source/palette.mjs';
import { serialize } from '../../src/lib/pixel-art/serialize.mjs';
import { starterSprite } from '../../src/lib/pixel-art/starter.mjs';
import { resolve } from '../../src/lib/pixel-art/engine.mjs';
import { compileScene, readSources } from '../optimize-pixel-art.mjs';
import { launch, loadPlaywright } from './browser.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DIST = join(ROOT, 'dist');
const OUTPUT_DIR = join(ROOT, '.e2e-output');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:4321';
const LAB = `${BASE}/lab/pixel-art/`;
const SCENE = 'library-demo';
const SOURCE_DIR = join(ROOT, 'src/assets/pixel-art/source');
const SCENE_FILE = join(SOURCE_DIR, `scenes/${SCENE}.mjs`);
const sourceOf = (kind, name) => readFile(join(SOURCE_DIR, `${kind}s/${name}.mjs`), 'utf8');
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

/**
 * The data from source text, as `npm run art` would load it. Node caches
 * modules by URL, so the same text gives the same object: each call returns
 * its own copy, so one test changing it can't change another's.
 */
const load = async (text) => structuredClone((await import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`)).default);

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

/**
 * Presses Tab until the control with this role and name has focus. Every
 * library object is a tab stop in the lab, so `max` leaves room for the
 * library to grow: at 120 it ran out when the footer tiles were added.
 */
async function tabTo(page, role, name, { back = false, max = 240 } = {}) {
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
  test('R15: the unlisted pages carry the robots meta, and no other page links to them', async () => {
    // The lab, and the design system previews (design system copy spec R4a).
    const unlisted = [join('lab', 'pixel-art', 'index.html'), join('design-system', 'index.html')];
    // Text files, scripts and styles too, so a link built at run time would
    // show; the unlisted pages' own bundles are left out.
    const own = new Set();
    for (const page of unlisted) {
      const html = await readFile(join(DIST, page), 'utf8');
      assert.match(html, /<meta name="robots" content="noindex, nofollow">/, `${page} is noindex`);
      for (const m of html.matchAll(/(?:src|href)="\/(_astro\/[^"]+)"/g)) own.add(m[1]);
    }
    const others = (await walk(DIST)).filter(
      (f) => /\.(html|xml|txt|json|webmanifest|js|css)$/.test(f) && !unlisted.includes(f) && !own.has(f.split('\\').join('/')),
    );
    assert.ok(others.length > 10, 'dist/ looks empty');
    for (const file of others) {
      const text = await readFile(join(DIST, file), 'utf8');
      assert.ok(!text.includes('/lab/'), `${file} mentions /lab/`);
      assert.ok(!text.includes('/design-system/'), `${file} mentions /design-system/`);
      assert.ok(!/robots/.test(text) || !text.includes('noindex'), `${file} is noindex`);
    }
  });

  test('R24: the editor JS is within 30 KB gzip, and only the lab page loads its JS and CSS', async () => {
    const assetsOf = async (page) =>
      [...(await readFile(join(DIST, page), 'utf8')).matchAll(/(?:src|href)="\/_astro\/([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
    const assets = await assetsOf('lab/pixel-art/index.html');
    // The site's own scripts, such as the nav's menu (pixel-first look spec
    // R7), load on every page, the lab included. They aren't the editor's code,
    // so the editor's scripts are the lab's minus the ones a plain page loads.
    const site = new Set(await assetsOf('404.html'));
    const scripts = assets.filter((a) => a.endsWith('.js') && !site.has(a));
    assert.ok(scripts.length > 0, 'the lab loads no script of its own');
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

  test('R16: with the pointer: drag a thumbnail onto the stage, then drag the item two tiles as one undo step', async () => {
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
    // Two columns, a tile at a time, so the drag makes more than one edit.
    for (let i = 1; i <= 2; i++) await page.mouse.move(x + 16 * zoom * i, y + 8 * zoom * i, { steps: 4 });
    await page.mouse.up();
    ({ item } = await newItem(await exportText(page)));
    assert.deepEqual(item.at.tile, [col + 2, row, level], 'dragged two columns');

    // The whole drag is one undo step.
    await page.getByRole('button', { name: 'Undo' }).click();
    ({ item } = await newItem(await exportText(page)));
    assert.deepEqual(item.at.tile, [col, row, level], 'one Undo takes back the whole drag');
    await page.getByRole('button', { name: 'Redo' }).click();
    ({ item } = await newItem(await exportText(page)));
    assert.deepEqual(item.at.tile, [col + 2, row, level]);
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

    // A held key: one press, then repeats. The whole hold is one undo step.
    await tabTo(page, 'group', 'Scene stage');
    await page.keyboard.down('ArrowRight');
    const stage = page.getByRole('group', { name: 'Scene stage' });
    for (let i = 0; i < 2; i++) await stage.dispatchEvent('keydown', { key: 'ArrowRight', repeat: true, bubbles: true });
    await page.keyboard.up('ArrowRight');
    ({ item } = await newItem(await exportTextByKeyboard(page), first));
    assert.deepEqual(item.at.tile, [col + 4, row + 1, 1], 'a held arrow moves a tile per repeat');
    await tabTo(page, 'group', 'Scene stage');
    await page.keyboard.press('Control+z');
    ({ item } = await newItem(await exportTextByKeyboard(page), first));
    assert.deepEqual(item.at.tile, [col + 1, row + 1, 1], 'one Ctrl+Z takes back the whole held key');

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

  test('R21: a held arrow key is one undo step', async () => {
    const { context, page, errors } = await openLab();
    await pickScene(page, SCENE);
    const stage = page.getByRole('group', { name: 'Scene stage' });
    await page.getByRole('button', { name: 'tree', exact: true }).click();
    await stage.click();
    let { item } = await newItem(await exportText(page));
    const [col, row, level] = item.at.tile;

    await stage.focus();
    await page.keyboard.down('ArrowRight');
    for (let i = 0; i < 2; i++) await stage.dispatchEvent('keydown', { key: 'ArrowRight', repeat: true, bubbles: true });
    await page.keyboard.up('ArrowRight');
    ({ item } = await newItem(await exportText(page)));
    assert.deepEqual(item.at.tile, [col + 3, row, level], 'a held arrow moves a tile per keydown');
    await stage.focus();
    await page.keyboard.press('Control+z');
    ({ item } = await newItem(await exportText(page)));
    assert.deepEqual(item.at.tile, [col, row, level], 'one Ctrl+Z takes back the whole hold');
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

  test("R20: a draft the lab can't use is dropped, and its scene opens as on the site", async () => {
    const draft = (doc) => JSON.stringify({ version: 'x', saved: 0, doc });
    const tree = { object: 'tree', at: { tile: [0, 0, 0] } };
    const bad = {
      // hero-island opens first, so the page itself has to come up.
      'pixel-lab:scene:hero-island': draft({ viewBox: [0, 0, 8, 8], items: [{ ...tree, class: 5 }] }),
      'pixel-lab:scene:range-sprite': draft({}),
      'pixel-lab:scene:outfit-preview': draft({ viewBox: [0, 0, 100000, 100000], items: [null] }),
      'pixel-lab:scene:library-demo': draft({ viewBox: [0, 0, 8, 8], items: [{ group: { 'data-class': 7 }, items: [tree] }] }),
    };
    const init = [
      (drafts) => {
        try {
          if (!sessionStorage.getItem('seeded')) {
            for (const [key, value] of Object.entries(drafts)) localStorage.setItem(key, value);
            sessionStorage.setItem('seeded', '1');
          }
        } catch {}
      },
      bad,
    ];
    const { context, page, errors } = await openLab({ init });
    for (const name of ['hero-island', 'range-sprite', 'outfit-preview', 'library-demo']) {
      if (name !== 'hero-island') await pickScene(page, name);
      const site = await readFile(join(ROOT, `src/assets/pixel-art/source/scenes/${name}.mjs`), 'utf8');
      await page.getByRole('button', { name: 'Export' }).click();
      const dialog = page.getByRole('dialog', { name: 'Export' });
      await dialog.getByText(`src/assets/pixel-art/source/scenes/${name}.mjs`).waitFor();
      assert.equal(await dialog.getByRole('textbox', { name: 'Source' }).inputValue(), site, `${name} opens as on the site`);
      await dialog.getByRole('button', { name: 'Close' }).click();
      // An edit then saves under this scene's own name, with its own content.
      await page.getByRole('button', { name: 'tree', exact: true }).click();
      await page.getByRole('group', { name: 'Scene stage' }).click();
      const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).doc, `pixel-lab:scene:${name}`);
      assert.equal(saved.output, (await load(site)).output, `the ${name} draft holds ${name}`);
      await page.getByRole('button', { name: 'Reset to site version' }).click();
    }
    assert.deepEqual(errors, []);
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

// -------------------------------------------------------- object mode

/** A swatch's accessible name: "grass-2, #8FA56E". */
const swatch = (name) => `${name}, ${palette.world[name] ?? palette.outfit[name] ?? palette.legacy[name]}`;

/** Opens an object with the pointer. */
const pickObject = (page, name) => page.getByRole('combobox', { name: 'Open' }).selectOption(`object:${name}`);

/**
 * Where a map pixel is on screen, from the stage's own zoom: painting on a
 * canvas is positional by nature.
 */
async function pixel(page, x, y) {
  const zoom = Number((await page.locator('#lab-status-zoom').textContent()).replace('×', ''));
  const box = await page.locator('#lab-canvas').boundingBox();
  return [box.x + (x + 0.5) * zoom, box.y + (y + 0.5) * zoom];
}

async function clickPixel(page, x, y) {
  const [cx, cy] = await pixel(page, x, y);
  await page.mouse.click(cx, cy);
}

/** The first layer's map (or a frame of a layer) from exported source text. */
const mapOf = async (text, layer = 0, frame = null) => {
  const doc = await load(text);
  return frame === null ? doc.layers[layer].map : doc.layers[layer].frames[frame];
};

/** Writes exported sources into a copy of source/, and compiles it with `npm run art`'s own command. */
async function compileCopy(files) {
  const dir = await mkdtemp(join(tmpdir(), 'lab-r18-'));
  await cp(SOURCE_DIR, join(dir, 'source'), { recursive: true });
  for (const [path, text] of Object.entries(files)) await writeFile(join(dir, 'source', path), text);
  const out = execFileSync(process.execPath, [join(ROOT, 'scripts/optimize-pixel-art.mjs'), '--source', join(dir, 'source'), '--out', join(dir, 'out')], { encoding: 'utf8' });
  return { dir, out };
}

/**
 * Compares the stage canvas at 1× with an SVG drawn at its viewBox size,
 * both over white. `css` is applied to the SVG, to show frame 0 of its loops.
 */
async function compareCanvas(page, svg, sources) {
  // Frame 0 of every frame loop, as the editor shows it: each loop's later
  // frames are hidden. Placement classes (it1, pc1) stay.
  const later = new Set();
  for (const obj of sources.objects.values()) {
    for (const layer of [...(obj.layers ?? []), ...(obj.surface?.frames ? [obj.surface] : [])]) {
      for (let n = 1; n < (layer.frames?.length ?? 0); n++) later.add(`${layer.loop}.${layer.prefix}${n}`);
    }
  }
  const css = [...later].map((c) => `.${c}{display:none}`).join('');
  const styled = css ? svg.replace(/<svg\b[^>]*>/, (open) => `${open}<style>${css}</style>`) : svg;
  return page.evaluate(async (source) => {
    const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('lab-canvas'));
    const [w, h] = [canvas.width, canvas.height];
    const draw = (image) => {
      const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(image, 0, 0, w, h);
      return ctx.getImageData(0, 0, w, h).data;
    };
    const img = new Image(w, h);
    img.src = `data:image/svg+xml;base64,${btoa(source)}`;
    await img.decode();
    const [a, b] = [draw(canvas), draw(img)];
    let diffs = 0;
    let painted = 0;
    let first = null;
    for (let i = 0; i < a.length; i += 4) {
      if (b[i] !== 255 || b[i + 1] !== 255 || b[i + 2] !== 255) painted++;
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {
        diffs++;
        first ??= { x: (i / 4) % w, y: Math.floor(i / 4 / w), editor: [...a.slice(i, i + 3)], compiled: [...b.slice(i, i + 3)] };
      }
    }
    return { diffs, painted, first, size: [w, h] };
  }, styled);
}

describe('object painting (R17)', () => {
  test('R17: with the pointer: pencil, eraser, fill and picker, with undo and redo', async () => {
    const { context, page, errors } = await openLab();
    await pickObject(page, 'tree');
    const site = await sourceOf('object', 'tree');
    assert.equal(await exportText(page), site, 'tree opens as committed');
    const before = await mapOf(site);

    // Pencil: one pixel in a new color adds a key for it.
    await page.getByRole('button', { name: swatch('roof-2') }).click();
    await clickPixel(page, 0, 0);
    let text = await exportText(page);
    assert.equal((await load(text)).keys.r, 'roof-2');
    assert.equal((await mapOf(text))[0][0], 'r');

    // A stroke is one undo step.
    const [x0, y0] = await pixel(page, 0, 27);
    const [x1] = await pixel(page, 5, 27);
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x1, y0, { steps: 6 });
    await page.mouse.up();
    assert.equal((await mapOf(await exportText(page)))[27].slice(0, 6), 'rrrrrr');
    await page.getByRole('button', { name: 'Undo' }).click();
    assert.equal((await mapOf(await exportText(page)))[27], before[27], 'one Undo takes back the stroke');

    // Eraser.
    await page.getByRole('button', { name: 'Eraser' }).click();
    await clickPixel(page, 0, 0);
    assert.deepEqual(await mapOf(await exportText(page)), before);

    // Fill: the transparent area around the tree, 4-connected.
    await page.getByRole('button', { name: 'Fill' }).click();
    await page.getByRole('button', { name: swatch('water-2') }).click();
    await page.getByRole('button', { name: 'Fill' }).click();
    await clickPixel(page, 0, 0);
    const filled = await mapOf(await exportText(page));
    const key = Object.entries((await load(await exportText(page))).keys).find(([, c]) => c === 'water-2')[0];
    for (let y = 0; y < before.length; y++) {
      for (let x = 0; x < before[y].length; x++) {
        const outside = before[y][x] === '.' && (y === 0 || x === 0 || y === before.length - 1 || x === before[y].length - 1);
        if (outside) assert.equal(filled[y][x], key, `edge pixel ${x},${y} is filled`);
        if (before[y][x] !== '.') assert.equal(filled[y][x], before[y][x], `the tree at ${x},${y} is untouched`);
      }
    }
    await page.getByRole('button', { name: 'Undo' }).click();
    assert.deepEqual(await mapOf(await exportText(page)), before, 'Undo takes back the fill');
    await page.getByRole('button', { name: 'Redo' }).click();
    assert.deepEqual(await mapOf(await exportText(page)), filled, 'Redo puts it back');

    // Picker: the trunk's color becomes the current one.
    await page.getByRole('button', { name: 'Picker' }).click();
    await clickPixel(page, 9, 22);
    const trunk = (await load(site)).keys[before[22][9]];
    assert.equal(await page.getByRole('button', { name: swatch(trunk) }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(errors, []);
    await context.close();
  });

  test('R17: layers and frames: add, paint on one, step, and delete', async () => {
    const { context, page, errors } = await openLab();
    await pickObject(page, 'tree');
    const site = await sourceOf('object', 'tree');
    await page.getByRole('button', { name: 'Add layer' }).click();
    await page.getByRole('button', { name: swatch('ink') }).click();
    await clickPixel(page, 1, 1);
    let doc = await load(await exportText(page));
    assert.equal(doc.layers.length, 2);
    assert.equal(doc.layers[1].map[1][1], Object.keys(doc.keys).find((k) => doc.keys[k] === 'ink'), 'paint goes to the selected layer');
    assert.deepEqual(doc.layers[0].map, (await load(site)).layers[0].map);
    await page.getByRole('button', { name: 'Delete Layer 2' }).click();
    doc = await load(await exportText(page));
    assert.equal(doc.layers.length, 1);

    // Frames, on the waterfall face's loop.
    await pickObject(page, 'waterfall-face');
    const fall = await load(await sourceOf('object', 'waterfall-face'));
    const loop = fall.layers.findIndex((l) => l.frames);
    await page.getByRole('button', { name: `Layer ${loop + 1} · loop wf, 5 frames` }).click();
    await page.getByRole('button', { name: 'Frame w2' }).click();
    assert.equal(await page.getByRole('button', { name: 'Frame w2' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Next frame' }).click();
    assert.equal(await page.getByRole('button', { name: 'Frame w3' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Eraser' }).click();
    await page.getByRole('button', { name: 'Duplicate frame' }).click();
    doc = await load(await exportText(page));
    assert.equal(doc.layers[loop].frames.length, 6);
    assert.deepEqual(doc.layers[loop].frames[4], fall.layers[loop].frames[3], 'the copy follows the frame');
    await page.getByRole('button', { name: 'Delete frame' }).click();
    doc = await load(await exportText(page));
    assert.deepEqual(doc.layers[loop].frames, fall.layers[loop].frames);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test('R17 (hero island detail R6): painting a block\'s top and sides exports a canonical block with surface and sides', async () => {
    const { context, page, errors } = await openLab();
    await pickObject(page, 'block');
    const site = await sourceOf('object', 'block');
    assert.equal(await exportText(page), site, 'block opens as committed');
    // block is [1, 1, 1]: its first tile's center is at (15, 8) on the stage.
    // Left column i starts at y = 1 + ⌊i/2⌋ and right column j at y = 8 − ⌈j/2⌉ from it.
    await page.getByRole('button', { name: swatch('roof-2') }).click();
    await clickPixel(page, 15, 8); // the top's center: surface column 16, row 8
    await clickPixel(page, 5, 13); // left column 5, row 2
    // The right face with the keyboard: from the cursor at (5, 13) to (25, 15), right column 10, row 4.
    // The pointer leaves first, since the status bar shows the hovered pixel over the cursor.
    await page.mouse.move(0, 0);
    for (const key of ['Shift+ArrowRight', 'Shift+ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown']) await page.keyboard.press(key);
    assert.equal(await page.locator('#lab-status-position').textContent(), 'x 25 · y 15');
    await page.keyboard.press('Space');

    // The site's block, whether or not it has a surface and sides yet, with a new roof-2 key and those three cells.
    const blank = (w) => Array(16).fill('.'.repeat(w));
    const put = (map, col, row, key) => map.map((line, y) => (y === row ? line.slice(0, col) + key + line.slice(col + 1) : line));
    const painted = await exportText(page);
    const doc = await load(painted);
    const keyOf = (keys) => Object.keys(keys).find((k) => keys[k] === 'roof-2');
    const [top, side] = [keyOf(doc.surface.keys), keyOf(doc.sides.keys)];
    const before = await load(site);
    assert.ok(!Object.values(before.surface?.keys ?? {}).includes('roof-2') && top && side, 'roof-2 is a new key on the top and the sides');
    const surface = before.surface ?? { keys: {}, map: blank(32) };
    const sides = before.sides ?? { keys: {}, left: blank(16), right: blank(16) };
    const expected = {
      ...before,
      surface: { keys: { ...surface.keys, [top]: 'roof-2' }, map: put(surface.map, 16, 8, top) },
      sides: { keys: { ...sides.keys, [side]: 'roof-2' }, left: put(sides.left, 5, 2, side), right: put(sides.right, 10, 4, side) },
    };
    assert.equal(painted, serialize(expected), 'the export is the canonical block, with a surface and sides');
    const { dir, out } = await compileCopy({ 'objects/block.mjs': painted });
    await rm(dir, { recursive: true, force: true });
    assert.match(out, /^hero-island\.svg: .* lossless$/m, 'the painted block compiles');

    // A draft keeps its sides over a reload.
    await page.reload();
    await page.getByRole('group', { name: 'Scene stage' }).waitFor();
    await pickObject(page, 'block');
    assert.equal(await exportText(page), painted, 'the draft survives a reload, sides and all');

    // Going flat drops the sides; Undo brings them back.
    await page.getByRole('button', { name: 'Decrease levels' }).click();
    const flat = await load(await exportText(page));
    assert.deepEqual([flat.size, flat.faces, flat.sides], [[1, 1, 0], { top: 'grass-2' }, undefined]);
    assert.deepEqual(flat.surface, expected.surface, 'the top surface stays');
    await page.getByRole('button', { name: 'Undo' }).click();
    assert.equal(await exportText(page), painted);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("R17: painting an outfit overrides the row, and painting it back drops the override", async () => {
    // A pixel of the figure (so it stays within its 24×32 cap) on a row an
    // outfit doesn't override yet, in the first outfit that has one.
    const { sources } = await readSources(SOURCE_DIR);
    let [outfit, layers, layer, row] = ['', [], -1, -1];
    for (const name of [...sources.objects.keys()].filter((n) => n.startsWith('outfit-')).sort()) {
      const site = await load(await sourceOf('object', name));
      for (const [i, l] of resolve(sources, name).layers.entries()) {
        if (l.frames) continue;
        const overridden = new Set(Object.keys(site.rows?.[i] ?? {}).map(Number));
        row = l.map.findIndex((r, y) => !overridden.has(y) && /[^.]/.test(r));
        if (row >= 0) {
          [outfit, layers, layer] = [name, resolve(sources, name).layers, i];
          break;
        }
      }
      if (outfit) break;
    }
    assert.ok(layer >= 0, 'an outfit has a painted row it doesn\'t override');
    const { context, page } = await openLab();
    await pickObject(page, outfit);
    const map = layers[layer].map;
    const col = map[row].search(/[^.]/);
    await page.getByRole('button', { name: new RegExp(`^Layer ${layer + 1}\\b`) }).click();
    await page.getByRole('button', { name: swatch('roof-2') }).click();
    await clickPixel(page, col, row);
    let doc = await load(await exportText(page));
    assert.ok(doc.rows[layer]?.[row], `layer ${layer}, row ${row} is now overridden`);
    await page.getByRole('button', { name: 'Picker' }).click();
    await page.getByRole('button', { name: 'Undo' }).click();
    doc = await load(await exportText(page));
    assert.equal(doc.rows[layer]?.[row], undefined, 'undone, the row matches character again, so its override is gone');
    // Painting it back by hand drops the override too.
    await page.getByRole('button', { name: 'Redo' }).click();
    const name = resolve(sources, outfit).keys[map[row][col]];
    await page.getByRole('button', { name: swatch(name) }).click();
    await clickPixel(page, col, row);
    doc = await load(await exportText(page));
    assert.equal(doc.rows[layer]?.[row], undefined, 'painted back, the override is gone');
    await context.close();
  });

  test('R17: Escape during a pointer stroke takes the whole stroke back', async () => {
    const { context, page } = await openLab();
    await pickObject(page, 'tree');
    const site = await sourceOf('object', 'tree');
    await page.getByRole('button', { name: swatch('roof-2') }).click();
    const [x0, y0] = await pixel(page, 0, 27);
    const [x1] = await pixel(page, 6, 27);
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x1, y0, { steps: 6 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    // The live region is cleared, then written on the next frame, so a
    // repeated message speaks again: wait for it rather than read it at once.
    await page.waitForFunction(() => document.getElementById('lab-announce')?.textContent === 'Stroke cancelled');
    assert.equal(await exportText(page), site, 'the stroke is gone');
    // And the next stroke still works, as its own undo step.
    await clickPixel(page, 0, 27);
    assert.equal((await mapOf(await exportText(page)))[27][0], 'r');
    await context.close();
  });

  test('R27: the meter is plain up to 8 colors and warns from 9', async () => {
    const { context, page } = await openLab();
    await pickObject(page, 'tree');
    await page.getByText('Colors used: 7 of 12').waitFor();
    await page.getByRole('button', { name: swatch('roof-2') }).click();
    await clickPixel(page, 0, 0);
    assert.doesNotMatch(await page.getByText('Colors used: 8 of 12').getAttribute('class'), /is-warning/);
    await page.getByRole('button', { name: swatch('water-2') }).click();
    await clickPixel(page, 1, 0);
    assert.match(await page.getByText('Colors used: 9 of 12').getAttribute('class'), /is-warning/);
    await context.close();
  });

  test('R17: layer visibility and onion skin change only the editor, never the export', async () => {
    const { context, page } = await openLab();
    const canvas = () => page.locator('#lab-canvas').evaluate((c) => c.toDataURL());
    await pickObject(page, 'tree');
    const site = await sourceOf('object', 'tree');
    const shown = await canvas();
    const toggle = page.getByRole('button', { name: 'Show Layer 1' });
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    assert.notEqual(await canvas(), shown, 'the hidden layer is gone from the stage');
    assert.equal(await exportText(page), site, 'but not from the export');
    await toggle.click();
    assert.equal(await canvas(), shown);

    await pickObject(page, 'waterfall-face');
    const fall = await load(await sourceOf('object', 'waterfall-face'));
    await page.getByRole('button', { name: `Layer ${fall.layers.findIndex((l) => l.frames) + 1} · loop wf, 5 frames` }).click();
    // The onion skin draws under the whole object, so hide the still layers
    // (the face the streaks fall over), as a person would to see it.
    for (const [i, layer] of fall.layers.entries()) {
      if (!layer.frames) await page.getByRole('button', { name: `Show Layer ${i + 1}` }).click();
    }
    await page.getByRole('button', { name: 'Frame w2' }).click();
    const plain = await canvas();
    await page.getByRole('button', { name: 'Onion skin' }).click();
    assert.equal(await page.getByRole('button', { name: 'Onion skin' }).getAttribute('aria-pressed'), 'true');
    assert.notEqual(await canvas(), plain, 'frame w1 shows under w2');
    assert.equal(await exportText(page), await sourceOf('object', 'waterfall-face'));
    await context.close();
  });

  test('R27: a stepper at its limit is marked off, and does nothing', async () => {
    const { context, page } = await openLab();
    await pickObject(page, 'tree');
    const width = page.getByRole('spinbutton', { name: 'Width' });
    await width.fill('64');
    await width.press('Enter');
    await page.getByText('20 × 28').waitFor({ state: 'detached' });
    const more = page.getByRole('button', { name: 'Increase width' });
    assert.equal(await more.getAttribute('aria-disabled'), 'true');
    await more.dispatchEvent('click');
    assert.equal((await mapOf(await exportText(page)))[0].length, 64, 'still 64 wide, the cap');
    assert.equal(await page.getByRole('button', { name: 'Decrease width' }).getAttribute('aria-disabled'), 'false');
    await context.close();
  });

  test('R27: the usage meter warns from 9 colors, and at 12 turns off every color not in use', async () => {
    const { context, page } = await openLab();
    await pickObject(page, 'outfit-security-governance');
    const { sources } = await readSources(SOURCE_DIR);
    const r = resolve(sources, 'outfit-security-governance');
    const counts = new Map();
    const pixels = [];
    for (const [li, layer] of r.layers.entries()) layer.map?.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && pixels.push({ li, x, y, ch }) && counts.set(ch, (counts.get(ch) ?? 0) + 1)));
    const used = new Set([...counts.keys()].map((k) => sources.colors.get(r.keys[k]).hex));
    await page.getByText(`Colors used: ${used.size} of 12`).waitFor();
    // Enough pixels of the outfit's most used key to reach 12, so no color drops out.
    const add = 12 - used.size;
    assert.ok(add >= 1, 'the outfit leaves room for a color');
    // The layer that paints the most, and its most used key.
    const byLayer = new Map();
    for (const p of pixels) byLayer.set(p.li, (byLayer.get(p.li) ?? 0) + 1);
    const layer = [...byLayer].sort((a, b) => b[1] - a[1])[0][0];
    const inLayer = new Map();
    for (const p of pixels) if (p.li === layer) inLayer.set(p.ch, (inLayer.get(p.ch) ?? 0) + 1);
    const common = [...inLayer].sort((a, b) => b[1] - a[1])[0][0];
    const all = pixels.filter((p) => p.ch === common && p.li === layer);
    assert.ok(all.length > add, 'the most used key keeps a pixel');
    const spots = all.slice(0, add);
    await page.getByRole('button', { name: new RegExp(`^Layer ${layer + 1}\\b`) }).click();
    const fresh = Object.keys(palette.world).filter((n) => !used.has(palette.world[n])).slice(0, add + 1);
    for (const [i, spot] of spots.entries()) {
      await page.getByRole('button', { name: swatch(fresh[i]) }).click();
      await clickPixel(page, spot.x, spot.y);
    }
    const meter = page.getByText('Colors used: 12 of 12');
    await meter.waitFor();
    assert.match(await meter.getAttribute('class'), /is-warning/);
    const off = page.getByRole('button', { name: swatch(fresh[add]) });
    assert.equal(await off.getAttribute('aria-disabled'), 'true');
    // aria-disabled keeps it focusable and announced; a click does nothing.
    await off.dispatchEvent('click');
    assert.equal(await page.getByRole('button', { name: swatch(fresh[add - 1]) }).getAttribute('aria-pressed'), 'true', 'a 13th color can\'t be chosen');
    assert.equal(await page.getByRole('button', { name: swatch(fresh[0]) }).getAttribute('aria-disabled'), 'false', 'colors in use stay on');
    await context.close();
  });

  test('R21: with the keyboard alone: open, choose a color, paint, erase, fill, pick and undo', async () => {
    const { context, page, errors } = await openLab();
    // The toolbar is one tab stop: Tab to it, then arrow to Object.
    await tabTo(page, 'button', 'Scene');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await tabTo(page, 'button', 'tree');
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('combobox', { name: 'Open' }).inputValue(), 'object:tree');
    const site = await sourceOf('object', 'tree');
    const before = await mapOf(site);

    await tabTo(page, 'button', swatch('roof-2'));
    await page.keyboard.press('Enter');
    await tabTo(page, 'group', 'Object stage', { back: true });
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    let map = await mapOf(await exportTextByKeyboard(page));
    assert.equal(map[0].slice(0, 2), 'rr', 'Space and Enter paint at the cursor');

    await tabTo(page, 'group', 'Object stage');
    await page.keyboard.press('Delete');
    await page.keyboard.press('e');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    assert.deepEqual(await mapOf(await exportTextByKeyboard(page)), before, 'Delete and the eraser clear them');

    await tabTo(page, 'group', 'Object stage');
    await page.keyboard.press('g');
    await page.keyboard.press('Space');
    map = await mapOf(await exportTextByKeyboard(page));
    assert.equal(map[0][0], 'r', 'fill at the cursor');
    assert.equal(map.at(-1).at(-1), 'r', 'fills to the far corner');
    await tabTo(page, 'group', 'Object stage');
    await page.keyboard.press('Control+z');
    assert.deepEqual(await mapOf(await exportTextByKeyboard(page)), before, 'Ctrl+Z undoes the fill');

    // Shift + arrows move 8 pixels; the picker reads the trunk.
    await tabTo(page, 'group', 'Object stage');
    await page.keyboard.press('i');
    await page.keyboard.press('Shift+ArrowRight');
    for (let i = 0; i < 22; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    const trunk = (await load(site)).keys[before[22][9]];
    assert.equal(await page.getByRole('button', { name: swatch(trunk) }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(errors, []);
    await context.close();
  });

  test('R21: Page Up and Page Down step frames, and [ and ] step layers', async () => {
    const { context, page } = await openLab();
    await pickObject(page, 'waterfall-face');
    const fall = await load(await sourceOf('object', 'waterfall-face'));
    const loop = fall.layers.findIndex((l) => l.frames);
    await page.getByRole('group', { name: 'Object stage' }).focus();
    for (let i = 0; i < loop; i++) await page.keyboard.press(']');
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    assert.equal(await page.getByRole('button', { name: 'Frame w2' }).getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('PageUp');
    assert.equal(await page.getByRole('button', { name: 'Frame w1' }).getAttribute('aria-pressed'), 'true');
    await context.close();
  });
});

describe('same render (R18)', () => {
  test('R18: with the pointer: paint tree, export it and library-demo, compile them, and match the canvas', async () => {
    const { context, page, errors } = await openLab();
    await pickObject(page, 'tree');
    await page.getByRole('button', { name: swatch('roof-2') }).click();
    for (const [x, y] of [[9, 3], [10, 3], [11, 4], [3, 10]]) await clickPixel(page, x, y);
    const tree = await exportText(page);
    await pickScene(page, SCENE);
    await page.getByRole('button', { name: 'Zoom 1×' }).click();
    const scene = await exportText(page);
    assert.equal(scene, committed, 'library-demo itself is unchanged; it shows the painted tree');
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('dialog', { name: 'Export' }).getByText('This scene uses a draft of tree. Export it too.').waitFor();
    await page.getByRole('button', { name: 'Close' }).click();

    const { dir, out } = await compileCopy({ 'objects/tree.mjs': tree, [`scenes/${SCENE}.mjs`]: scene });
    assert.match(out, /library-demo \(preview only, not written\): .* lossless/);
    // library-demo has no output file, so it's compiled by the same function `npm run art` uses.
    const { sources } = await readSources(join(dir, 'source'));
    const result = await compareCanvas(page, compileScene(sources, SCENE).output, sources);
    await rm(dir, { recursive: true, force: true });
    assert.ok(result.painted > 1000, 'the compiled scene drew');
    assert.equal(result.diffs, 0, `${result.diffs} pixels differ: ${JSON.stringify(result.first)}`);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test('R18: with the keyboard alone: paint tree, place it on hero-island, export both, compile, and match the canvas', async () => {
    const { context, page, errors } = await openLab();
    // The toolbar is one tab stop: Tab to it, then arrow to Object.
    await tabTo(page, 'button', 'Scene');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await tabTo(page, 'button', 'tree');
    await page.keyboard.press('Enter');
    await tabTo(page, 'button', swatch('gold-2'));
    await page.keyboard.press('Enter');
    await tabTo(page, 'group', 'Object stage', { back: true });
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    const tree = await exportTextByKeyboard(page);

    // Back to the scene that opened first, and the tree onto it.
    await tabTo(page, 'button', 'Object', { back: true });
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await tabTo(page, 'button', 'tree');
    await page.keyboard.press('Enter');
    await tabTo(page, 'group', 'Scene stage', { back: true });
    await page.keyboard.press('Escape');
    await page.keyboard.press('1');
    const scene = await exportTextByKeyboard(page);
    assert.ok((await load(scene)).items.some((i) => i.object === 'tree'), 'the tree is placed');
    // The canvas with no cursor or selection drawn: focus off the stage.
    await page.keyboard.press('Shift+Tab');

    const { dir, out } = await compileCopy({ 'objects/tree.mjs': tree, 'scenes/hero-island.mjs': scene });
    assert.match(out, /hero-island\.svg: .* lossless/);
    const svg = await readFile(join(dir, 'out', 'hero-island.svg'), 'utf8');
    const { sources } = await readSources(join(dir, 'source'));
    const result = await compareCanvas(page, svg, sources);
    await rm(dir, { recursive: true, force: true });
    assert.ok(result.painted > 10000, 'the compiled scene drew');
    assert.equal(result.diffs, 0, `${result.diffs} pixels differ: ${JSON.stringify(result.first)}`);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe('dialogs (D9.6)', () => {
  test('R17: New object checks the name as you type, then opens a draft you can place in a scene', async () => {
    const { context, page, errors } = await openLab();
    await page.getByRole('combobox', { name: 'Open' }).selectOption('new:object');
    const dialog = page.getByRole('dialog', { name: 'New object' });
    const name = dialog.getByRole('textbox', { name: 'Name' });
    await name.fill('Small Rock');
    await dialog.getByText('Use lowercase letters and digits').waitFor();
    await name.fill('tree');
    await dialog.getByText("There's already an object or scene called tree.").waitFor();
    await name.fill('small-rock');
    await dialog.getByText('src/assets/pixel-art/source/objects/small-rock.mjs').waitFor();
    await dialog.getByRole('button', { name: 'Create' }).click();
    assert.equal(await page.getByRole('combobox', { name: 'Open' }).inputValue(), 'object:small-rock');
    await page.getByText('New, not on the site').first().waitFor();
    assert.equal(await exportText(page), serialize(starterSprite(16, 16)), 'the same starter as npm run art -- --new');

    await page.getByRole('button', { name: swatch('path-3') }).click();
    await clickPixel(page, 8, 15);
    await pickScene(page, SCENE);
    await page.getByRole('button', { name: 'small-rock', exact: true }).click();
    await page.getByRole('group', { name: 'Scene stage' }).click();
    const { item } = await newItem(await exportText(page));
    assert.equal(item.object, 'small-rock');
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('dialog', { name: 'Export' }).getByText('This scene uses a draft of small-rock. Export it too.').waitFor();
    await page.getByRole('button', { name: 'Close' }).click();

    // Discard drops the new object's draft.
    await pickObject(page, 'small-rock');
    await page.getByRole('button', { name: 'Discard draft' }).click();
    assert.equal(await page.getByRole('option', { name: /small-rock/ }).count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test('R30: the problems count lists each problem, and choosing one goes to its row and column', async () => {
    const doc = await load(await sourceOf('object', 'tree'));
    doc.layers[0].map[5] = `${doc.layers[0].map[5].slice(0, 3)}q${doc.layers[0].map[5].slice(4)}`;
    const init = [
      ([key, value]) => {
        try {
          if (!sessionStorage.getItem('seeded')) {
            localStorage.setItem(key, value);
            sessionStorage.setItem('seeded', '1');
          }
        } catch {}
      },
      ['pixel-lab:object:tree', JSON.stringify({ version: 'x', saved: 0, doc })],
    ];
    const { context, page } = await openLab({ init });
    await pickObject(page, 'tree');
    await page.getByRole('button', { name: '1 problem' }).click();
    await page.getByRole('button', { name: "layer 0, row 5, column 3: key 'q' is not in keys" }).click();
    assert.equal(await page.locator('#lab-status-position').textContent(), 'x 3 · y 5');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Object stage');
    await page.getByRole('button', { name: 'Export' }).click();
    assert.ok(await page.getByRole('button', { name: 'Copy source' }).isDisabled());
    await context.close();
  });
});

describe('layout (R22, R5)', () => {
  for (const width of [320, 390, 1440]) {
    test(`R22: no horizontal scroll at ${width}px, on every panel, in both modes`, async () => {
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

      // Object mode, on the outfit (its gutter) and the largest map.
      for (const name of ['outfit-security-governance', 'footer-dirt']) {
        await pickObject(page, name);
        assert.ok(await fits(), `${name} in Object mode`);
        if (width < 960) {
          for (const tab of ['Library', 'Palette', 'Inspector']) {
            await page.getByRole('tab', { name: tab }).click();
            assert.ok(await fits(), `${name}, with ${tab} open`);
          }
          await page.getByRole('tab', { name: 'Library' }).click();
        }
        await page.getByRole('button', { name: 'Zoom 16×' }).click();
        assert.ok(await fits(), `${name} at 16×`);
        await page.getByRole('button', { name: 'Zoom to fit' }).click();
      }
      await page.getByRole('combobox', { name: 'Open' }).selectOption('new:object');
      assert.ok(await fits(), 'with New object open');
      await page.getByRole('button', { name: 'Cancel' }).click();
      await pickObject(page, 'outfit-security-governance');
      await screenshot(page, `editor-object-${width}`);
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

  // Heading order is one of the audits behind D15's "Lighthouse accessibility
  // = 100" for the editor (R21, R22). Lighthouse only sees the page as it
  // loads, so this walks every state it can't reach.
  for (const width of [1440, 390]) {
    test(`R22: heading levels never skip at ${width}px (D15's Lighthouse check): both modes, every tab, both dialogs and the problems list`, async () => {
      const { context, page } = await openLab({ width, height: width > 900 ? 900 : 844 });
      // Each visible heading is at most one level below the one before it.
      const skips = () =>
        page.evaluate(() => {
          const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
            .filter((h) => h.checkVisibility() || h.classList.contains('visually-hidden'))
            .map((h) => [Number(h.tagName[1]), h.textContent.trim()]);
          return levels.filter(([level], i) => i > 0 && level > levels[i - 1][0] + 1).map(([level, text]) => `h${level} ${text}`);
        });
      // Below 960px the panels are tabs, so each one is checked open.
      const everyTab = async (label, tabs) => {
        if (width >= 960) return assert.deepEqual(await skips(), [], label);
        for (const tab of tabs) {
          await page.getByRole('tab', { name: tab }).click();
          assert.deepEqual(await skips(), [], `${label}, ${tab} tab`);
        }
      };
      await everyTab('Scene mode', ['Library', 'Items', 'Inspector']);
      for (const name of ['tree', 'outfit-security-governance', 'footer-dirt', 'block']) {
        await pickObject(page, name);
        await everyTab(`Object mode, ${name}`, ['Library', 'Palette', 'Inspector']);
      }
      await page.getByRole('button', { name: 'Export' }).click();
      await page.getByRole('dialog', { name: 'Export' }).waitFor();
      assert.deepEqual(await skips(), [], 'with Export open');
      await page.getByRole('dialog', { name: 'Export' }).getByRole('button', { name: 'Close' }).click();
      for (const kind of ['scene', 'object']) {
        await page.getByRole('combobox', { name: 'Open' }).selectOption(`new:${kind}`);
        await page.getByRole('dialog', { name: kind === 'scene' ? 'New scene' : 'New object' }).waitFor();
        assert.deepEqual(await skips(), [], `with New ${kind} open`);
        await page.getByRole('button', { name: 'Cancel' }).click();
      }
      await page.getByRole('button', { name: /problems?$/ }).click();
      assert.deepEqual(await skips(), [], 'with the problems list open');
      await context.close();
    });
  }

  test('R5: with reduced motion, nothing animates on the lab or the home page, and frames only step when asked', async () => {
    const { context, page } = await openLab({ reducedMotion: 'reduce' });
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0, 'lab');
    await pickObject(page, 'waterfall-face');
    const fall = await load(await sourceOf('object', 'waterfall-face'));
    await page.getByRole('button', { name: `Layer ${fall.layers.findIndex((l) => l.frames) + 1} · loop wf, 5 frames` }).click();
    await page.waitForTimeout(600);
    assert.equal(await page.getByRole('button', { name: 'Frame w0' }).getAttribute('aria-pressed'), 'true', 'Play never starts by itself');
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0, 'object mode');
    await page.goto(`${BASE}/`);
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0, 'home');
    await context.close();
  });
});
