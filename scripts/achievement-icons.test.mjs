// Checks for the achievement icons (gamified accomplishments spec D5, R12–R14):
// the list, the object files, the sheet scene and the published catalog agree.

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { resolve } from 'pixellab/engine';
import { readSources } from 'pixellab/compile';
import { CELL, FALLBACK_ICON, FRAME_CELL, FRAMES, ICONS, LOCK_ICON, PLAIN_FRAME, SHEET_ORDER, frameFor, iconCatalog, iconFor } from '../src/lib/achievement-icons.mjs';

const SOURCE = new URL('../src/assets/pixel-art/jlawcordova.pixellab/', import.meta.url);
const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

test('R12: every icon id is kebab-case, unique and has a meaning', () => {
  const ids = SHEET_ORDER;
  assert.equal(new Set(ids).size, ids.length);
  for (const { id, meaning } of ICONS) {
    assert.match(id, KEBAB);
    assert.ok(meaning.trim().length > 0, `${id} has a meaning`);
  }
});

// The ids published with this PR. The lexicon's `knownValues` copies them, so
// they stay: new icons may be added through the skill, but none of these may go.
const PUBLISHED_IDS = [
  'sprout', 'hammer', 'rocket', 'bug', 'shield', 'key', 'wrench', 'book',
  'magnifier', 'flask', 'apple', 'heart', 'signpost', 'chest', 'trophy', 'speech',
];

test('R12: the 16 published icon ids stay', () => {
  assert.equal(PUBLISHED_IDS.length, 16);
  const ids = new Set(ICONS.map((icon) => icon.id));
  for (const id of PUBLISHED_IDS) assert.ok(ids.has(id), `${id} is still an icon`);
});

test('R12: an icon object exists for every sheet entry, and none is unlisted', async () => {
  const files = (await readdir(new URL('objects/', SOURCE))).filter((f) => f.startsWith('icon-'));
  assert.deepEqual(
    files.map((f) => f.replace(/^icon-|\.mjs$/g, '')).sort(),
    [...SHEET_ORDER].sort(),
  );
});

test('R12: every icon is a 16×16 sprite using world colors only', async () => {
  const palette = (await import(new URL('palette.mjs', SOURCE).href)).default;
  for (const id of SHEET_ORDER) {
    const object = (await import(new URL(`objects/icon-${id}.mjs`, SOURCE).href)).default;
    assert.equal(object.kind, 'sprite', id);
    for (const layer of object.layers) {
      assert.equal(layer.map.length, CELL, `${id} is ${CELL} rows`);
      for (const row of layer.map) assert.equal(row.length, CELL, `${id} is ${CELL} wide`);
    }
    for (const color of Object.values(object.keys)) assert.ok(color in palette.world, `${id} uses ${color}`);
    assert.ok(new Set(Object.values(object.keys)).size <= 12, `${id} uses at most 12 colors`);
  }
});

// Isometric icons spec R3: the icons are in the island and Range look, where
// faces are set apart by shade and nothing is outlined.
test('isometric icons R3: no icon uses ink', async () => {
  for (const id of SHEET_ORDER) {
    const object = (await import(new URL(`objects/icon-${id}.mjs`, SOURCE).href)).default;
    assert.ok(!Object.values(object.keys).includes('ink'), `${id} has no ink key`);
  }
});

test('R12: the sheet scene places the icons in SHEET_ORDER, one cell each', async () => {
  const scene = (await import(new URL('scenes/achievement-icons.mjs', SOURCE).href)).default;
  assert.deepEqual(scene.viewBox, [0, 0, CELL * SHEET_ORDER.length, CELL]);
  const placed = scene.items.map((item) => ({
    id: item.group['data-icon'],
    object: item.items[0].object,
    at: item.items[0].at.px,
  }));
  assert.deepEqual(
    placed,
    SHEET_ORDER.map((id, i) => ({ id, object: `icon-${id}`, at: [i * CELL + CELL / 2, CELL - 1] })),
  );
});

test('R12: the compiled sheet stays within 6 KB gzip', async () => {
  const svg = await readFile(new URL('../src/assets/pixel-art/achievement-icons.svg', import.meta.url));
  assert.ok(gzipSync(svg).length <= 6 * 1024, `sheet is ${gzipSync(svg).length} bytes gzip`);
});

test('R13: an unknown or missing icon falls back to the star; the lock and fallback are not choices', () => {
  assert.equal(iconFor('rocket'), 'rocket');
  for (const value of ['nope', '', undefined, null, 3, LOCK_ICON, FALLBACK_ICON]) assert.equal(iconFor(value), FALLBACK_ICON);
  assert.ok(!ICONS.some((icon) => icon.id === LOCK_ICON || icon.id === FALLBACK_ICON));
});

test('R15: the published catalog lists the choices and the fallback', () => {
  const catalog = iconCatalog();
  assert.deepEqual(catalog.icons.map((icon) => icon.id), ICONS.map((icon) => icon.id));
  assert.equal(catalog.fallback, FALLBACK_ICON);
  // The frames are for the page only (achievements redesign spec, Data).
  assert.deepEqual(catalog.icons, ICONS.map(({ id, meaning }) => ({ id, meaning })));
});

// Achievements redesign spec R8–R10: every icon sits in a frame of its kind,
// drawn as pixel art in one sheet.
test('achievements redesign R10: every icon names a frame, and every frame but plain has an icon', () => {
  assert.deepEqual([...FRAMES], ['plain', 'make', 'fix', 'think', 'people', 'milestone']);
  for (const { id, frame } of ICONS) assert.ok(FRAMES.includes(frame) && frame !== PLAIN_FRAME, `${id} has a kind's frame`);
  for (const frame of FRAMES.filter((f) => f !== PLAIN_FRAME)) {
    assert.ok(ICONS.some((icon) => icon.frame === frame), `${frame} frames at least one icon`);
  }
});

test('achievements redesign R8: the fallback, an unknown icon and the lock take the plain frame', () => {
  assert.equal(frameFor('rocket'), 'make');
  assert.equal(frameFor('trophy'), 'milestone');
  for (const value of [FALLBACK_ICON, LOCK_ICON, 'dragon', '', undefined, null]) assert.equal(frameFor(value), PLAIN_FRAME);
});

test('achievements redesign R8, R10: each frame is a 20×20 sprite: an ink edge, a bevel and a fill, in its own colors', async () => {
  const COLORS = {
    plain: ['path-1', 'path-2', 'cream'],
    make: ['gold-1', 'gold-3', 'cream'],
    fix: ['grass-1', 'grass-2', 'cream'],
    think: ['skin-1', 'wood-1', 'cream'],
    people: ['water-1', 'water-2', 'cream'],
    milestone: ['roof-1', 'roof-2', 'skin-1'],
  };
  // The kinds' frames recolor frame-plain, so each is checked as the engine resolves it.
  const { sources } = await readSources(fileURLToPath(SOURCE));
  for (const frame of FRAMES) {
    assert.equal(sources.objects.get(`frame-${frame}`)?.kind, 'sprite', frame);
    const object = resolve(sources, `frame-${frame}`);
    assert.equal(object.layers.length, 1, `${frame} has one layer`);
    const { map } = /** @type {{ map: string[] }} */ (object.layers[0]);
    assert.equal(map.length, FRAME_CELL, `${frame} is ${FRAME_CELL} rows`);
    for (const row of map) assert.equal(row.length, FRAME_CELL, `${frame} is ${FRAME_CELL} wide`);
    const at = (x, y) => object.keys[map[y][x]];
    const [fill, shadow, light] = COLORS[frame];
    for (let i = 0; i < FRAME_CELL; i++) {
      for (const [x, y] of [[i, 0], [i, FRAME_CELL - 1], [0, i], [FRAME_CELL - 1, i]]) assert.equal(at(x, y), 'ink', `${frame} edge at ${x},${y}`);
    }
    for (let i = 2; i < FRAME_CELL - 2; i++) {
      assert.equal(at(i, 1), light, `${frame} top bevel`);
      assert.equal(at(1, i), light, `${frame} left bevel`);
      assert.equal(at(i, FRAME_CELL - 2), shadow, `${frame} bottom bevel`);
      assert.equal(at(FRAME_CELL - 2, i), shadow, `${frame} right bevel`);
      for (let j = 2; j < FRAME_CELL - 2; j++) assert.equal(at(i, j), fill, `${frame} fill at ${i},${j}`);
    }
  }
});

test('achievements redesign R10: the frame sheet places the frames in FRAMES order, one cell each', async () => {
  const scene = (await import(new URL('scenes/achievement-frames.mjs', SOURCE).href)).default;
  assert.equal(scene.output, 'achievement-frames.svg');
  assert.deepEqual(scene.viewBox, [0, 0, FRAME_CELL * FRAMES.length, FRAME_CELL]);
  assert.deepEqual(
    scene.items.map((item) => ({ frame: item.group['data-frame'], object: item.items[0].object })),
    FRAMES.map((frame) => ({ frame, object: `frame-${frame}` })),
  );
  const svg = await readFile(new URL('../src/assets/pixel-art/achievement-frames.svg', import.meta.url), 'utf8');
  for (const frame of FRAMES) assert.match(svg, new RegExp(`data-frame="${frame}"`));
  assert.ok(gzipSync(svg).length <= 2 * 1024, `frame sheet is ${gzipSync(svg).length} bytes gzip`);
});

test('R14: the achievement-icon skill lists exactly the icons in the set, with their frames', async () => {
  const skill = await readFile(new URL('../.claude/skills/achievement-icon/SKILL.md', import.meta.url), 'utf8');
  const table = skill.split('<!-- icons:start -->')[1]?.split('<!-- icons:end -->')[0] ?? '';
  const rows = [...table.matchAll(/^\| `([^`]+)` \| (.+) \| `([^`]+)` \|$/gm)].map((m) => ({ id: m[1], meaning: m[2], frame: m[3] }));
  assert.deepEqual(rows, ICONS.map(({ id, meaning, frame }) => ({ id, meaning, frame })));
});
