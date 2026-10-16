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

import { composite, renderScene, resolve } from '../src/lib/pixel-art/engine.mjs';
import { OUTPUT_BUDGETS, readSources } from './optimize-pixel-art.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SOURCE = join(ROOT, 'src/assets/pixel-art/source');

const { sources } = await readSources(SOURCE);
const scene = sources.scenes.get('range-sprite');
const css = await readFile(join(ROOT, 'src/styles/range.css'), 'utf8');

/** A scene's items in paint order, flattened out of their groups. */
const flatten = (items) => items.flatMap((item) => (item.group ? flatten(item.items) : [item]));
/** The class groups, and the shared grass setting while some classes still use it (Range settings spec, While settings are being added). */
const classes = scene.items.filter((i) => i.group?.['data-class'] !== undefined);
const grass = scene.items.find((i) => i.group?.['data-setting'] === 'grass');
/** The entrance groups directly inside a setting. */
const enters = (setting, kind) => setting.items.filter((i) => i.group?.class === 'enter' && i.group['data-enter'] === kind);
/** The classes whose setting is the shared grass: those without a floor of their own. */
const grassClasses = classes.filter((c) => enters(c, 'ground').length === 0).map((c) => c.group['data-class']);

/** The x of an object's foot: a tile's center, or the center of a sprite's bottom row (island build entrance spec). */
const footX = (item) => {
  if (item.at.tile) return (item.at.tile[0] - item.at.tile[1]) * 16 + scene.origin[0];
  const r = resolve(sources, item.object);
  return Math.round(item.at.px[0] - r.anchor[0] + r.width / 2);
};

/** What these items paint on their own, in scene pixels, as sorted 'x,y' → color entries. */
const paintOf = (items) => {
  sources.scenes.set('range-probe', { viewBox: scene.viewBox, origin: scene.origin, items });
  return [...composite(renderScene(sources, 'range-probe').root)].sort();
};

describe('Range art (Isometric Range spec, Range settings spec)', () => {
  it('R1 (settings): outside the groups the scene places only the shared shadow, and range-island is gone', () => {
    const outside = scene.items.filter((i) => i.object).map((i) => i.object);
    assert.deepEqual([...new Set(outside)], ['island-shadow']);
    assert.ok(!sources.objects.has('range-island'), 'range-island is gone');
    for (const item of scene.items.filter((i) => i.group)) {
      assert.ok(item.group['data-class'] !== undefined || item.group['data-setting'] === 'grass', 'every group is a class or the shared grass');
    }
  });

  it('R1, R4 (settings): each floor is three ground rows, left cliff last, of three one-level cubes on their own row', () => {
    for (const setting of [...classes, ...(grass ? [grass] : [])]) {
      const rows = enters(setting, 'ground');
      const name = setting.group['data-class'] ?? 'grass';
      if (setting !== grass && rows.length === 0) continue;
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
    for (const setting of [...classes, ...(grass ? [grass] : [])]) {
      for (const group of enters(setting, 'object')) {
        const [first] = flatten(group.items);
        assert.equal(Number(group.group['data-x']), footX(first), `${first.object}'s foot`);
      }
    }
  });

  it('R1 (settings): a class with its own floor hides the shared grass, and a class without one shows it', () => {
    const hidden = [...css.matchAll(/\.range\[data-current="(\d+)"\] \.range__sprite g\[data-setting="grass"\]/g)].map((m) => m[1]);
    const own = classes.map((c) => c.group['data-class']).filter((c) => !grassClasses.includes(c));
    assert.deepEqual(hidden.sort(), own.sort());
    assert.equal(Boolean(grass), grassClasses.length > 0, 'the shared grass is there only while a class uses it');
  });

  it('settings spec, the transition: the shared grass, with its inland cubes, paints what the old flat platform did, for each class on it', () => {
    if (!grass) return;
    // The old platform, rebuilt: inland cubes go back to flat tiles, and the ground paints by diagonal (col + row), as it did.
    const shadow = scene.items.filter((i) => i.object);
    const ground = flatten(enters(grass, 'ground')).map((i) => (i.at.tile[0] < 2 && i.at.tile[1] < 2 ? { ...i, object: 'tile' } : i));
    const diagonal = (item) => item.at.tile[0] + item.at.tile[1];
    ground.sort((a, b) => diagonal(a) - diagonal(b) || b.at.tile[0] - a.at.tile[0]);
    const scenery = flatten(enters(grass, 'object'));
    for (const name of grassClasses) {
      const cls = classes.find((c) => c.group['data-class'] === name);
      const now = paintOf([...shadow, ...grass.items, ...cls.items]);
      const before = paintOf([...shadow, ...ground, ...scenery, ...flatten(cls.items)]);
      assert.deepEqual(now, before, `class ${name}`);
    }
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
