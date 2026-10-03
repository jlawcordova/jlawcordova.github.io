// Checks for the achievement icons (gamified accomplishments spec D5, R12–R14):
// the list, the object files, the sheet scene and the published catalog agree.

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

import { CELL, FALLBACK_ICON, ICONS, LOCK_ICON, SHEET_ORDER, iconCatalog, iconFor } from '../src/lib/achievement-icons.mjs';

const SOURCE = new URL('../src/assets/pixel-art/source/', import.meta.url);
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
    assert.ok(!object.legacy, `${id} is not legacy`);
    for (const layer of object.layers) {
      assert.equal(layer.map.length, CELL, `${id} is ${CELL} rows`);
      for (const row of layer.map) assert.equal(row.length, CELL, `${id} is ${CELL} wide`);
    }
    for (const color of Object.values(object.keys)) assert.ok(color in palette.world, `${id} uses ${color}`);
    assert.ok(new Set(Object.values(object.keys)).size <= 12, `${id} uses at most 12 colors`);
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
});

test('R14: the achievement-icon skill lists exactly the icons in the set', async () => {
  const skill = await readFile(new URL('../.claude/skills/achievement-icon/SKILL.md', import.meta.url), 'utf8');
  const table = skill.split('<!-- icons:start -->')[1]?.split('<!-- icons:end -->')[0] ?? '';
  const rows = [...table.matchAll(/^\| `([^`]+)` \| (.+) \|$/gm)].map((m) => ({ id: m[1], meaning: m[2] }));
  assert.deepEqual(rows, ICONS.map(({ id, meaning }) => ({ id, meaning })));
});
