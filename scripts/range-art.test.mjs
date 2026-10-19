// The Range scene's art stays on the island's engine (Isometric Range spec
// R1, R3, R7, R8; Range settings spec R1, R4, R11): each setting is a floor of
// cubes in entrance groups with its objects, nothing in range-sprite paints
// ink, the viewBox keeps the stage's size, and the compiled SVG stays inside
// its budget. Node built-ins only.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { resolve } from 'pixellab/engine';
import { readSources } from 'pixellab/compile';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SOURCE = join(ROOT, 'src/assets/pixel-art/jlawcordova.pixellab');
/** The document's per-output budgets (manifest.json), which Pixel Lab's `art build` enforces. */
const OUTPUT_BUDGETS = JSON.parse(await readFile(join(SOURCE, 'manifest.json'), 'utf8')).publish.budgets;

const { sources } = await readSources(SOURCE);
const scene = sources.scenes.get('range-sprite');
const css = await readFile(join(ROOT, 'src/styles/range.css'), 'utf8');

/** A scene's items in paint order, flattened out of their groups. */
const flatten = (items) => items.flatMap((item) => (item.group ? flatten(item.items) : [item]));
/** The class groups, each holding its own setting (Range settings spec, The scene). */
const classes = scene.items.filter((i) => i.group?.['data-class'] !== undefined);
/** The entrance groups directly inside a class group. */
const enters = (setting, kind) => setting.items.filter((i) => i.group?.class === 'enter' && i.group['data-enter'] === kind);

/** The x of an object's foot: a tile's center, or the center of a sprite's bottom row (island build entrance spec). */
const footX = (item) => {
  if (item.at.tile) return (item.at.tile[0] - item.at.tile[1]) * 16 + scene.origin[0];
  const r = resolve(sources, item.object);
  return Math.round(item.at.px[0] - r.anchor[0] + r.width / 2);
};

describe('Range art (Isometric Range spec, Range settings spec)', () => {
  it('R1 (settings): outside the groups the scene places only the shared shadow, and range-island is gone', () => {
    const outside = scene.items.filter((i) => i.object).map((i) => i.object);
    assert.deepEqual([...new Set(outside)], ['island-shadow']);
    assert.ok(!sources.objects.has('range-island'), 'range-island is gone');
    for (const item of scene.items.filter((i) => i.group)) assert.ok(item.group['data-class'] !== undefined, 'every group is a class');
  });

  it('R1, R4 (settings): each floor is three ground rows, left cliff last, of three one-level cubes on their own row', () => {
    for (const setting of classes) {
      const rows = enters(setting, 'ground');
      const name = setting.group['data-class'];
      assert.deepEqual(rows.map((r) => r.group['data-row']), ['0', '1', '2'], `${name}: rows 0 to 2, in paint order`);
      for (const row of rows) {
        assert.deepEqual(row.items.map((i) => i.at.tile), [0, 1, 2].map((col) => [col, Number(row.group['data-row']), 0]), `${name}: row ${row.group['data-row']} by column`);
        for (const { object } of row.items) {
          const obj = sources.objects.get(object);
          assert.equal(obj.kind, 'block', `${name}: ${object} is a block`);
          assert.deepEqual(obj.size, [1, 1, 1], `${name}: ${object} is a one-level cube`);
        }
      }
      const kinds = setting.items.map((i) => i.group?.['data-enter']);
      assert.ok(kinds.every((k, i) => k !== 'ground' || kinds.slice(0, i).every((p) => p === 'ground')), `${name}: the floor paints before its objects`);
      assert.ok(kinds.every((k) => k === 'ground' || k === 'object'), `${name}: only ground and object groups`);
    }
  });

  it('R4 (settings): each object group\'s data-x is its first object\'s foot', () => {
    for (const setting of classes) {
      for (const group of enters(setting, 'object')) {
        const [first] = flatten(group.items);
        assert.equal(Number(group.group['data-x']), footX(first), `${first.object}'s foot`);
      }
    }
  });

  it('R1, R2 (settings): every class has its own setting, and no two share a floor set', () => {
    assert.equal(classes.length, 7);
    const floors = classes.map((c) => new Set(flatten(enters(c, 'ground')).map((i) => i.object)));
    floors.forEach((floor, i) => {
      assert.ok(floor.size >= 3, `class ${i} has a floor set of its own pieces`);
      floors.slice(i + 1).forEach((other, j) => {
        assert.deepEqual([...floor].filter((name) => other.has(name)), [], `classes ${i} and ${i + j + 1} share no floor piece`);
      });
    });
    assert.ok(classes.every((c) => flatten(c.items).some((i) => sources.objects.get(i.object)?.extends === 'character')), 'each setting has its character');
    assert.doesNotMatch(css, /data-setting/, 'no shared setting is left in range.css');
  });

  it('R3: nothing range-sprite places paints ink, so the characters have no outline', () => {
    const names = new Set();
    const walk = (items) => items.forEach((i) => (i.group ? walk(i.items) : names.add(i.object)));
    walk(scene.items);
    assert.ok(names.has('outfit-security-governance'), 'the outfits are walked');
    for (const name of names) {
      const r = resolve(sources, name);
      const keys = { ...(r.keys ?? {}), ...(r.sides?.keys ?? {}), ...(r.surface?.keys ?? {}) };
      for (const color of Object.values(keys)) assert.notEqual(color, 'ink', `${name} paints ink`);
    }
  });

  it('R7: the viewBox keeps the stage size', () => {
    assert.deepEqual(scene.viewBox, [-51, -9, 103, 72]);
  });

  it('R8, R11 (settings): the compiled SVG is within its own budget, 200 KB raw and 50 KB gzip', async () => {
    const svg = await readFile(join(ROOT, 'src/assets/pixel-art/range-sprite.svg'));
    assert.deepEqual(OUTPUT_BUDGETS['range-sprite.svg'], { raw: 200 * 1024, gzip: 50 * 1024 });
    assert.ok(svg.length <= 200 * 1024, `${svg.length} B raw`);
    assert.ok(gzipSync(svg).length <= 50 * 1024, 'gzip within 50 KB');
  });
});
