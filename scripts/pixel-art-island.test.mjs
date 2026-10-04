// Structural tests for the hero island (island migration spec R2 to R6 and
// R10). The island stopped being pixel-identical to its fixture when its first
// shades moved to world colors (R9), so these check what the island is made of
// and how it is laid out, not which pixels it paints. Node built-ins only.
//
// The allow-list below shrinks as slices land and is empty after the last one.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { CAPS, composite, renderScene, resolve, usedColors } from '../src/lib/pixel-art/engine.mjs';
import { compileScene, readSources } from './optimize-pixel-art.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ART_DIR = join(ROOT, 'src/assets/pixel-art');

const { sources } = await readSources(join(ART_DIR, 'source'));
const scene = sources.scenes.get('hero-island');
const placed = scene.items.map((item) => item.object);
const svg = compileScene(sources, 'hero-island').output;

/**
 * The objects the island may still draw from legacy colors, until their slice
 * lands: the island and its front layer (slices 3 to 8) and the waterfall
 * (slice 4). Remove each name when its slice replaces it; the test fails if a
 * name stays after the object has left the scene.
 */
const LEGACY_ALLOWED = ['island-base', 'island-front', 'waterfall'];

/** Today's island, in bytes (spec R6). */
const MAX_RAW = 83485;
const MAX_GZIP = 18299;

/** Objects that paint behind the trucks (ground, water, road, bridge, house) and in front of them (spec, Target scene). */
const BEHIND_TRUCKS = ['island-base', 'island-shadow', 'tile', 'block', 'water', 'waterfall', 'waterfall-face', 'path', 'bridge', 'house'];
const IN_FRONT_OF_TRUCKS = ['island-front', 'tree', 'tree-small', 'fence', 'crane-mast', 'crane-jib', 'hearth'];

const indexesOf = (names) => scene.items.flatMap((item, i) => (names.includes(item.object) ? [i] : []));

describe('hero island structure', () => {
  it('R2: only allow-listed objects use legacy colors; the list names only objects still in the scene', () => {
    for (const name of new Set(placed)) {
      const obj = resolve(sources, name);
      const legacyKeys = Object.values(obj.keys).filter((color) => /^c-[0-9a-f]{6}$/.test(color));
      if (LEGACY_ALLOWED.includes(name)) continue;
      assert.equal(obj.legacy, false, `${name} is marked legacy`);
      assert.deepEqual(legacyKeys, [], `${name} uses legacy colors`);
      assert.equal(sources.objects.get(name).legacy, undefined, `${name} sets legacy: true`);
    }
    for (const name of LEGACY_ALLOWED) assert.ok(placed.includes(name), `${name} has left the scene; remove it from LEGACY_ALLOWED`);
  });

  it('R7: flag and hearth paint the same pixels as before, because each world key has the legacy color\'s value', () => {
    const was = {
      flag: { a: 'c-c9ddd3' },
      hearth: { a: 'ink', b: 'c-5a2230', c: 'c-7b2d3b', d: 'c-9e3b4b' },
    };
    const hex = (color) => sources.colors.get(color).hex;
    for (const [name, keys] of Object.entries(was)) {
      const now = resolve(sources, name).keys;
      assert.deepEqual(Object.keys(now), Object.keys(keys), `${name} keys`);
      for (const [key, legacy] of Object.entries(keys)) assert.equal(hex(now[key]), hex(legacy), `${name} key ${key}`);
    }
  });

  it('R7: truck-green is still a recolor of truck, and both use world colors', () => {
    assert.equal(sources.objects.get('truck-green').extends, 'truck');
    assert.equal(sources.objects.get('truck-green').layers, undefined, 'truck-green adds no map of its own');
    for (const name of ['truck', 'truck-green']) {
      for (const color of Object.values(resolve(sources, name).keys)) assert.ok(color in sources.palette.world, `${name} uses ${color}`);
    }
  });

  it('R3: the viewBox is unchanged and the trucks still drive from the same road line', () => {
    assert.deepEqual(scene.viewBox, [-100, -84, 225, 212]);
    assert.match(svg, /^<svg [^>]*viewBox="-100 -84 225 212"/);
    for (const cls of ['itruck it1', 'itruck it2']) {
      const item = scene.items.find((i) => i.class === cls);
      assert.ok(item, `${cls} is placed`);
      assert.deepEqual(item.at, { px: [31, 6] }, `${cls} position`);
    }
    for (const name of ['flag', 'hearth', 'waterfall', 'truck', 'truck-green']) assert.ok(placed.includes(name), `${name} is still in the scene`);
  });

  it('R4: the groups the CSS animates are all there, in order, and the CSS still names them', async () => {
    const groups = [...svg.matchAll(/<g class="([^"]+)"/g)].map((m) => m[1]);
    const want = [
      ...[0, 1, 2, 3, 4].map((n) => `wf w${n}`),
      ...[0, 1, 2, 3].map((n) => `ff f${n}`),
      'itruck it1',
      'itruck it2',
      ...[0, 1, 2, 3, 4, 5].map((n) => `hf h${n}`),
      ...[0, 1, 2].map((n) => `pcloud pc${n}`),
    ];
    assert.deepEqual(groups, want);
    const css = await readFile(join(ROOT, 'src/styles/pixel-art.css'), 'utf8');
    for (const cls of ['.itruck', '.it2', '.pcloud', '.wf', '.ff', '.hf', '.w0', '.f0', '.h0']) assert.ok(css.includes(cls), `pixel-art.css names ${cls}`);
    const reduced = css.slice(css.indexOf('prefers-reduced-motion: reduce'));
    assert.ok(reduced.includes('.w0, .f0, .h0 { opacity: 1; }'), 'reduced motion shows frame 0');
    assert.ok(reduced.includes('.it2 { opacity: 0; }'), 'reduced motion hides it2');
  });

  it('R5: trucks paint over the ground and road, and the front pieces paint over the trucks', () => {
    const trucks = indexesOf(['truck', 'truck-green']);
    assert.equal(trucks.length, 2);
    const [firstTruck, lastTruck] = [Math.min(...trucks), Math.max(...trucks)];
    for (const i of indexesOf(BEHIND_TRUCKS)) assert.ok(i < firstTruck, `${scene.items[i].object} paints before the trucks`);
    const front = indexesOf(IN_FRONT_OF_TRUCKS);
    assert.ok(front.length > 0, 'there are front pieces');
    for (const i of front) assert.ok(i > lastTruck, `${scene.items[i].object} paints after the trucks`);
    // In the compiled SVG: ground paths, then the trucks, then paths drawn over them, then the roof loop.
    const at = (text) => svg.indexOf(text);
    assert.ok(svg.slice(0, at('<g class="itruck it1"')).includes('<path'), 'something is painted under the trucks');
    assert.ok(svg.slice(at('<g class="itruck it2"'), at('<g class="hf h0"')).includes('</g><path'), 'something is painted over the trucks');
  });

  it('R1, R3: the ground is 36 library objects on a [col, row, 0] grid: blocks on the two front edges, flat tiles elsewhere', () => {
    const ground = scene.items.filter((item) => item.object === 'block' || item.object === 'tile');
    assert.equal(ground.length, 36);
    assert.deepEqual(scene.origin, [0, 8], 'the grid origin that puts the 6×6 top faces where the island stood');
    const seen = new Set();
    for (const item of ground) {
      const [col, row, level] = item.at.tile;
      assert.equal(level, 0, 'ground sits at level 0');
      assert.ok(col >= 0 && col <= 5 && row >= 0 && row <= 5, `[${col}, ${row}] is on the grid`);
      assert.equal(item.object, col === 5 || row === 5 ? 'block' : 'tile', `[${col}, ${row}]`);
      seen.add(`${col},${row}`);
    }
    assert.equal(seen.size, 36, 'every position once');
    const order = ground.map((item) => item.at.tile[0] + item.at.tile[1]);
    assert.deepEqual(order, [...order].sort((a, b) => a - b), 'ground paints back to front (col + row, smallest first)');
    const blockObj = resolve(sources, 'block');
    assert.deepEqual(blockObj.block.size, [1, 1, 1]);
    assert.deepEqual(resolve(sources, 'tile').block.size, [1, 1, 0]);
  });

  it('R1, R2: island-shadow is a small world-color object, painted under the ground and outside the island', () => {
    const obj = resolve(sources, 'island-shadow');
    assert.equal(obj.legacy, false);
    assert.ok(obj.width <= CAPS.size && obj.height <= CAPS.size, `${obj.width}×${obj.height}`);
    assert.ok(usedColors(sources, obj).length <= CAPS.colors);
    for (const color of Object.values(obj.keys)) assert.match(color, /^path-[1-4]$/, `shadow color ${color}`);
    const shadows = indexesOf(['island-shadow']);
    const ground = indexesOf(['tile', 'block']);
    assert.ok(shadows.length > 0);
    assert.ok(Math.max(...shadows) < Math.min(...ground), 'the shadow paints before the ground');
    // Everything the shadow paints that survives is below or beside the island, so it only shows as a rim.
    const only = (names) => {
      sources.scenes.set('slice-3-probe', { viewBox: scene.viewBox, origin: scene.origin, items: scene.items.filter((item) => names.includes(item.object)) });
      return composite(renderScene(sources, 'slice-3-probe').root);
    };
    const island = only(['tile', 'block']);
    const shadow = only(['island-shadow']);
    const visible = [...shadow.keys()].filter((p) => !island.has(p));
    // 11 sprites of 128 checker pixels each: none overlaps another, and none hides under the ground.
    assert.equal(shadow.size, 11 * 128, 'the shadow sprites paint 1,408 distinct pixels');
    assert.equal(visible.length, shadow.size, 'every shadow pixel is outside the island');
  });

  it('R3: the 11 shadow pieces are pinned under the island\'s front tiles, so moving one fails', () => {
    const at = scene.items.filter((item) => item.object === 'island-shadow').map((item) => item.at);
    // One per front tile, from the right and left corners in to the front corner, 32 pixels below its top face.
    assert.deepEqual(at, [
      { px: [80, 80] },
      { px: [-80, 80] },
      { px: [64, 88] },
      { px: [-64, 88] },
      { px: [48, 96] },
      { px: [-48, 96] },
      { px: [32, 104] },
      { px: [-32, 104] },
      { px: [16, 112] },
      { px: [-16, 112] },
      { px: [0, 120] },
    ]);
    assert.deepEqual(resolve(sources, 'island-shadow').anchor, [15, 8], 'the anchor is the diamond\'s center');
  });

  it('R8: island-base no longer paints the ground\'s soil, grass lip or shadow, so nothing is painted twice', () => {
    sources.scenes.set('slice-3-ground', { viewBox: scene.viewBox, origin: scene.origin, items: scene.items.filter((item) => item.object === 'tile' || item.object === 'block') });
    const footprint = composite(renderScene(sources, 'slice-3-ground').root);
    const base = resolve(sources, 'island-base');
    const [ox, oy] = scene.items.find((item) => item.object === 'island-base').at.px;
    const soil = new Set(['c-8a5a34', 'c-7a4e2d', 'c-9c6b42', 'c-4a3324', 'c-6e4d36']);
    const shadow = 'c-d4c5a9';
    const grass = new Set(['c-8fa56e', 'c-88a267', 'c-7e9a60', 'c-a9bd8c', 'c-77925a', 'c-6f8a55', 'c-6f8f55', 'c-4e6b3a', 'soil-3']);
    const topOf = new Map();
    for (const p of footprint.keys()) {
      const [x, y] = p.split(',').map(Number);
      topOf.set(x, Math.min(topOf.get(x) ?? Infinity, y));
    }
    let leftover = 0;
    base.layers[0].map.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '.') continue;
        const color = base.keys[row[x]];
        assert.ok(!soil.has(color) && color !== shadow, `island-base paints ${color} at ${x},${y}`);
        if (!grass.has(color)) continue;
        // What is left in these greens and browns is a tree's foliage, a trunk or a door: on the island, or a treetop above it, never on its rim or below it.
        const covered = footprint.has(`${x + ox},${y + oy}`) || y + oy < (topOf.get(x + ox) ?? Infinity);
        assert.ok(covered, `island-base paints ${color} at ${x},${y} outside the ground`);
        leftover++;
      }
    });
    assert.ok(leftover < 400, `${leftover} green and brown pixels are left in island-base`);
  });

  it('R6: the compiled island is no heavier than today\'s, raw and gzipped', async () => {
    const committed = await readFile(join(ART_DIR, 'hero-island.svg'), 'utf8');
    assert.equal(committed, svg, 'the committed SVG is what the scene compiles to');
    assert.ok(Buffer.byteLength(svg) <= MAX_RAW, `${Buffer.byteLength(svg)} bytes raw, over ${MAX_RAW}`);
    const gzip = gzipSync(svg, { level: 9 }).length;
    assert.ok(gzip <= MAX_GZIP, `${gzip} bytes gzipped, over ${MAX_GZIP}`);
  });

  it('R10: the SVG is decorative and safe: no script, link, text or external reference', async () => {
    const committed = await readFile(join(ART_DIR, 'hero-island.svg'), 'utf8');
    for (const [label, text] of [['compiled', svg], ['committed', committed]]) {
      assert.match(text, /^<svg [^>]*aria-hidden="true"/, label);
      assert.doesNotMatch(text, /<(script|a|text|tspan|image|use|style|foreignObject|link|iframe|animate|set)\b/i, label);
      assert.doesNotMatch(text, /\b(href|src)\s*=/i, label);
      assert.doesNotMatch(text, /\bon[a-z]+\s*=/i, label);
      assert.doesNotMatch(text, /javascript:|data:|url\(/i, label);
      assert.deepEqual(text.match(/https?:\/\/[^"' )]+/g), ['http://www.w3.org/2000/svg'], label);
    }
    const component = await readFile(join(ROOT, 'src/components/home/HeroIsland.astro'), 'utf8');
    assert.match(component, /hero-island\.svg\?raw/);
    assert.match(component, /class="hero-island pixel-art"/);
  });
});
