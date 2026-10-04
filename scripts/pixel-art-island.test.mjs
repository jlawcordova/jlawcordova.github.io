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

/** The ground's library objects: one per position, plus a flat top laid over a front block where the river or road crosses it. */
const GROUND = ['tile', 'block', 'river', 'path'];

/** Today's island, in bytes (spec R6). */
const MAX_RAW = 83485;
const MAX_GZIP = 18299;

/**
 * Objects that paint behind the trucks (ground, water, road, bridge, house, the back trees' shade) and in front of them
 * (spec, Target scene). Trees stand on both sides: TREES are placed by depth, and the R5 test checks each one.
 */
const BEHIND_TRUCKS = ['island-shadow', 'tile', 'block', 'river', 'waterfall-face', 'path', 'bridge', 'house', 'tree-shade'];
const IN_FRONT_OF_TRUCKS = ['bridge-rail', 'shed', 'crane-mast', 'crane-jib', 'fence', 'hearth'];
const TREES = ['tree', 'tree-small', 'pine'];

const indexesOf = (names) => scene.items.flatMap((item, i) => (names.includes(item.object) ? [i] : []));

/** What these items paint on their own, in scene pixels: a Map of 'x,y' to color name. */
const paintOf = (items) => {
  sources.scenes.set('island-probe', { viewBox: scene.viewBox, origin: scene.origin, items });
  return composite(renderScene(sources, 'island-probe').root);
};

/** The visible steps of idrive in pixel-art.css, as [dx, dy]. */
const driveSteps = async () => {
  const css = await readFile(join(ROOT, 'src/styles/pixel-art.css'), 'utf8');
  return [...css.match(/@keyframes idrive\{(.*?)\}\}/)[1].matchAll(/translate\((-?\d+)px,(-?\d+)px\);opacity:(\d)/g)].map((m) => m.slice(1).map(Number));
};

describe('hero island structure', () => {
  it('R2: no object the island places uses legacy colors, with no exceptions', () => {
    for (const name of new Set(placed)) {
      const obj = resolve(sources, name);
      const legacyKeys = Object.values(obj.keys).filter((color) => /^c-[0-9a-f]{6}$/.test(color));
      assert.equal(obj.legacy, false, `${name} is marked legacy`);
      assert.deepEqual(legacyKeys, [], `${name} uses legacy colors`);
      assert.equal(sources.objects.get(name).legacy, undefined, `${name} sets legacy: true`);
    }
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

  it('R3: the front blocks have no outline (the owner\'s decision of 2026-10-04: the library block has no edge)', () => {
    const block = sources.objects.get('block');
    assert.ok(placed.includes('block'), 'the island places blocks');
    assert.equal(block.faces.edge, undefined, 'block has no faces.edge');
    assert.deepEqual(Object.keys(block.faces).sort(), ['left', 'right', 'top'], 'block has only top, left and right faces');
  });

  it('R7: the clouds and trucks use the world colors the Colors table names', () => {
    const want = {
      'cloud-a': { a: 'path-2', b: 'cream', c: 'cream' },
      'cloud-b': { a: 'path-2', b: 'cream', c: 'cream' },
      'cloud-c': { a: 'path-2', b: 'cream', c: 'cream' },
      truck: { a: 'ink', b: 'path-2', c: 'path-1', d: 'roof-2', e: 'water-1', f: 'roof-4', g: 'roof-3', h: 'cream' },
      'truck-green': { a: 'ink', b: 'gold-3', c: 'gold-2', d: 'grass-3', e: 'water-1', f: 'grass-4', g: 'grass-4', h: 'gold-1' },
    };
    for (const [name, keys] of Object.entries(want)) assert.deepEqual(resolve(sources, name).keys, keys, name);
  });

  it('R3: the viewBox is unchanged and the trucks still drive from the same road line', () => {
    assert.deepEqual(scene.viewBox, [-100, -84, 225, 212]);
    assert.match(svg, /^<svg [^>]*viewBox="-100 -84 225 212"/);
    for (const cls of ['itruck it1', 'itruck it2']) {
      const item = scene.items.find((i) => i.class === cls);
      assert.ok(item, `${cls} is placed`);
      assert.deepEqual(item.at, { px: [31, 6] }, `${cls} position`);
    }
    for (const name of ['flag', 'hearth', 'river', 'waterfall-face', 'path', 'bridge', 'bridge-rail', 'house', 'shed', 'tree-small', 'pine', 'crane-mast', 'crane-jib', 'fence', 'truck', 'truck-green']) {
      assert.ok(placed.includes(name), `${name} is still in the scene`);
    }
    assert.ok(!placed.includes('waterfall'), 'the 82×45 waterfall is retired (slice 4)');
  });

  it('R4: the groups the CSS animates are all there, in order, and the CSS still names them', async () => {
    const groups = [...svg.matchAll(/<g class="([^"]+)"/g)].map((m) => m[1]);
    // Each river tile carries its own wf loop, and the falling face one more.
    const rivers = indexesOf(['river', 'waterfall-face']).length;
    assert.equal(rivers, 6, 'five river tiles (one a top on the front block) and the falling face');
    const want = [
      ...Array.from({ length: rivers }, () => [0, 1, 2, 3, 4].map((n) => `wf w${n}`)).flat(),
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

  it('R5: trucks paint over the ground and road, and the front pieces paint over the trucks, in the scene', () => {
    const trucks = indexesOf(['truck', 'truck-green']);
    assert.equal(trucks.length, 2);
    const [firstTruck, lastTruck] = [Math.min(...trucks), Math.max(...trucks)];
    for (const i of indexesOf(BEHIND_TRUCKS)) assert.ok(i < firstTruck, `${scene.items[i].object} paints before the trucks`);
    for (const name of IN_FRONT_OF_TRUCKS) assert.ok(placed.includes(name), `${name} is in the scene`);
    for (const i of indexesOf(IN_FRONT_OF_TRUCKS)) assert.ok(i > lastTruck, `${scene.items[i].object} paints after the trucks`);
    // Four trees stand behind the road (the old island-base map drew them) and four in front of it.
    const trees = indexesOf(TREES);
    assert.deepEqual([trees.filter((i) => i < firstTruck).length, trees.filter((i) => i > lastTruck).length], [4, 4]);
  });

  it('R5: wherever a truck crosses a tree on its drive, the one standing further forward paints over the other', async () => {
    const trucks = indexesOf(['truck', 'truck-green']);
    const steps = (await driveSteps()).filter(([, , shown]) => shown);
    const map = resolve(sources, 'truck').layers[0].map;
    const [tx, ty] = scene.items[trucks[0]].at.px;
    const truckFoot = ty + map.length - 1;
    let crossings = 0;
    for (const i of indexesOf(TREES)) {
      const item = scene.items[i];
      const tree = paintOf([item]);
      const treeFoot = item.at.px[1];
      for (const [dx, dy] of steps) {
        const overlaps = map.some((row, y) => [...row].some((c, x) => c !== '.' && tree.has(`${tx + dx + x},${ty + dy + y}`)));
        if (!overlaps) continue;
        crossings++;
        const inFront = treeFoot > truckFoot + dy;
        assert.equal(i > Math.max(...trucks), inFront, `${item.object} at ${item.at.px} with the truck at translate(${dx}px, ${dy}px)`);
      }
    }
    assert.ok(crossings > 0, 'the trucks pass some trees');
  });

  it('R5: in the compiled SVG, every front piece is painted after both truck groups', () => {
    // Everything between the end of the it2 group and the hearth's first frame, as 'x,y' to fill.
    const it2 = svg.indexOf('<g class="itruck it2"');
    const after = svg.slice(svg.indexOf('</g>', it2), svg.indexOf('<g class="hf h0"'));
    const painted = new Map();
    for (const [, fill, d] of after.matchAll(/<path fill="(#[0-9A-F]{6})" d="([^"]+)"/g)) {
      for (const [, x, y, w, h] of d.matchAll(/M(-?\d+) (-?\d+)h(\d+)v(\d+)h-\d+z/g)) {
        for (let j = 0; j < Number(h); j++) for (let k = 0; k < Number(w); k++) painted.set(`${Number(x) + k},${Number(y) + j}`, fill);
      }
    }
    const lastTruck = Math.max(...indexesOf(['truck', 'truck-green']));
    const front = scene.items.filter((item, i) => i > lastTruck && !item.class && item.object !== 'hearth');
    assert.equal(front.length, 5 + 4, 'the rail, shed, mast, jib and fence, and four trees');
    const all = paintOf(front);
    const hex = (color) => sources.colors.get(color).hex.toUpperCase();
    for (const item of front) {
      let pixels = 0;
      for (const [p, color] of paintOf([item])) {
        if (all.get(p) !== color) continue; // covered by a later front piece
        assert.equal(painted.get(p), hex(color), `${item.object} at ${item.at.px ?? item.at.tile}: pixel ${p} after the trucks`);
        pixels++;
      }
      assert.ok(pixels > 0, `${item.object} shows`);
    }
    assert.equal(painted.size, all.size, 'nothing else is painted between the trucks and the hearth');
  });

  it('R1, R3: the ground is 36 library objects on a [col, row, 0] grid: blocks on the two front edges, the river along row 3, the road along column 2, flat tiles elsewhere', () => {
    const items = scene.items.filter((item) => GROUND.includes(item.object));
    // The first item at a position is its ground; a later one at the same position is a flat top laid over it.
    const seen = new Map();
    const ground = [];
    const tops = [];
    for (const item of items) {
      const [col, row, level] = item.at.tile;
      assert.equal(level, 0, 'ground sits at level 0');
      assert.ok(col >= 0 && col <= 5 && row >= 0 && row <= 5, `[${col}, ${row}] is on the grid`);
      const key = `${col},${row}`;
      (seen.has(key) ? tops : ground).push(item);
      seen.set(key, true);
    }
    assert.equal(ground.length, 36, 'every position once');
    assert.deepEqual(scene.origin, [0, 8], 'the grid origin that puts the 6×6 top faces where the island stood');
    for (const item of ground) {
      const [col, row] = item.at.tile;
      // The river runs along row 3 from the house; under the house, at [0, 3], it stays grass.
      // The road runs along column 2, on the trucks' line, and crosses the river on the bridge at [2, 3].
      const want = col === 5 || row === 5 ? 'block' : row === 3 && col >= 1 ? 'river' : col === 2 ? 'path' : 'tile';
      assert.equal(item.object, want, `[${col}, ${row}]`);
    }
    // Where the river and the road cross the front edges, the block gets a river or path top, listed right after it.
    assert.deepEqual(tops.map((item) => [item.object, item.at.tile]), [['path', [2, 5, 0]], ['river', [5, 3, 0]]]);
    for (const top of tops) {
      const i = scene.items.indexOf(top);
      assert.equal(scene.items[i - 1].object, 'block', `${top.object} is laid over the block before it`);
      assert.deepEqual(scene.items[i - 1].at, top.at);
    }
    const order = ground.map((item) => item.at.tile[0] + item.at.tile[1]);
    assert.deepEqual(order, [...order].sort((a, b) => a - b), 'ground paints back to front (col + row, smallest first)');
    const blockObj = resolve(sources, 'block');
    assert.deepEqual(blockObj.block.size, [1, 1, 1]);
    assert.deepEqual(resolve(sources, 'tile').block.size, [1, 1, 0]);
    const path = sources.objects.get('path');
    assert.deepEqual([path.size, path.faces, Object.values(path.surface.keys)], [[1, 1, 0], { top: 'path-2' }, ['path-1', 'path-3']], 'path is a flat path-2 tile with path-1 and path-3 specks');
    // river is the library's water with fewer ripples (two of its five rows), so six fit R6; same size, colors and loop.
    const [water, river] = ['water', 'river'].map((name) => sources.objects.get(name));
    assert.deepEqual(river.size, [1, 1, 0]);
    assert.deepEqual([river.faces, river.surface.keys, river.surface.loop, river.surface.prefix], [water.faces, water.surface.keys, water.surface.loop, water.surface.prefix]);
    river.surface.frames.forEach((frame, f) => frame.forEach((row, y) => assert.equal(row, [6, 11].includes(y) ? '.'.repeat(32) : water.surface.frames[f][y], `river frame ${f}, row ${y}`)));
  });

  it('R1, R2, R4: the waterfall-face falls down the front block at [5, 3], in world colors, with its own wf loop and the flag\'s streaks on it', () => {
    const obj = resolve(sources, 'waterfall-face');
    assert.equal(obj.legacy, false);
    assert.ok(obj.width <= CAPS.size && obj.height <= CAPS.size, `${obj.width}×${obj.height}`);
    assert.ok(usedColors(sources, obj).length <= CAPS.colors);
    for (const color of Object.values(obj.keys)) assert.ok(color in sources.palette.world, `waterfall-face uses ${color}`);
    // A still face, then the loop: frame 0 is what reduced motion shows over it.
    assert.equal(obj.layers.length, 2);
    assert.ok(obj.layers[0].map, 'the face itself is not animated');
    assert.deepEqual([obj.layers[1].loop, obj.layers[1].prefix, obj.layers[1].frames.length], ['wf', 'w', 5]);
    const i = indexesOf(['waterfall-face']);
    assert.equal(i.length, 1);
    assert.deepEqual(scene.items[i[0]].at, { tile: [5, 3, 0] });
    assert.equal(scene.items[i[0] - 1].object, 'river', 'it follows the river top it falls from');
    assert.ok(i[0] < indexesOf(['flag'])[0], 'the flag\'s streaks paint over it');
    // Every streak of the flag (ff), in every frame, lands on the falling water.
    const render = (names) => {
      sources.scenes.set('slice-4-probe', { viewBox: scene.viewBox, origin: scene.origin, items: scene.items.filter((item) => names.includes(item.object)) });
      return composite(renderScene(sources, 'slice-4-probe').root);
    };
    const face = render(['waterfall-face']);
    const flag = resolve(sources, 'flag');
    const [fx, fy] = scene.items.find((item) => item.object === 'flag').at.px;
    let streaks = 0;
    for (const frame of flag.layers[0].frames) {
      frame.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '.') continue;
          streaks++;
          assert.ok(face.has(`${fx + x},${fy + y}`), `the flag paints off the waterfall at ${fx + x},${fy + y}`);
        }
      });
    }
    assert.ok(streaks > 0);
  });

  it('R1, R2: island-shadow is a small world-color object, painted under the ground and outside the island', () => {
    const obj = resolve(sources, 'island-shadow');
    assert.equal(obj.legacy, false);
    assert.ok(obj.width <= CAPS.size && obj.height <= CAPS.size, `${obj.width}×${obj.height}`);
    assert.ok(usedColors(sources, obj).length <= CAPS.colors);
    for (const color of Object.values(obj.keys)) assert.match(color, /^path-[1-4]$/, `shadow color ${color}`);
    const shadows = indexesOf(['island-shadow']);
    const ground = indexesOf(GROUND);
    assert.ok(shadows.length > 0);
    assert.ok(Math.max(...shadows) < Math.min(...ground), 'the shadow paints before the ground');
    // Everything the shadow paints that survives is below or beside the island, so it only shows as a rim.
    const only = (names) => {
      sources.scenes.set('slice-3-probe', { viewBox: scene.viewBox, origin: scene.origin, items: scene.items.filter((item) => names.includes(item.object)) });
      return composite(renderScene(sources, 'slice-3-probe').root);
    };
    const island = only(GROUND);
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

  it('R1, R2, R3: the bridge is a small world-color object on the road where it crosses the river, painted over the ground', () => {
    const obj = resolve(sources, 'bridge');
    assert.equal(obj.legacy, false);
    assert.ok(obj.width <= CAPS.size && obj.height <= CAPS.size, `${obj.width}×${obj.height}`);
    assert.ok(usedColors(sources, obj).length <= CAPS.colors);
    for (const color of Object.values(obj.keys)) assert.ok(color in sources.palette.world, `bridge uses ${color}`);
    const i = indexesOf(['bridge']);
    assert.equal(i.length, 1);
    assert.deepEqual(scene.items[i[0]].at, { tile: [2, 3, 0] });
    assert.ok(i[0] > Math.max(...indexesOf(GROUND)), 'it paints over the ground, both banks included');
  });

  it('R3, R4, C5: both trucks stay on the road: at every visible step of idrive, their lowest pixels sit on the path or the bridge', async () => {
    const css = await readFile(join(ROOT, 'src/styles/pixel-art.css'), 'utf8');
    const steps = [...css.match(/@keyframes idrive\{(.*?)\}\}/)[1].matchAll(/translate\((-?\d+)px,(-?\d+)px\);opacity:(\d)/g)].map((m) => m.slice(1).map(Number));
    assert.equal(steps.length, 59, 'idrive is unchanged');
    sources.scenes.set('slice-5-road', { viewBox: scene.viewBox, origin: scene.origin, items: scene.items.filter((item) => ['path', 'bridge'].includes(item.object)) });
    const road = composite(renderScene(sources, 'slice-5-road').root);
    for (const name of ['truck', 'truck-green']) {
      const map = resolve(sources, name).layers[0].map;
      const feet = [];
      for (let x = 0; x < map[0].length; x++) {
        for (let y = map.length - 1; y >= 0; y--) if (map[y][x] !== '.') { feet.push([x, y]); break; }
      }
      const [tx, ty] = scene.items.find((item) => item.object === name).at.px;
      const onRoad = (dx, dy) => feet.filter(([x, y]) => road.has(`${tx + dx + x},${ty + dy + y}`) || road.has(`${tx + dx + x},${ty + dy + y + 1}`)).length;
      for (const [dx, dy, shown] of steps) {
        // The last visible steps (dx < -88) are checked below, not here.
        if (!shown || dx < -88) continue;
        const on = onRoad(dx, dy);
        assert.ok(on >= feet.length - 1, `${name} at translate(${dx}px, ${dy}px): ${on} of ${feet.length} on the road`);
      }
      // At the last 9 visible steps the truck is still on the island, but it turns off the road onto the grass by the
      // front edge before it fades, exactly as it did on the old road. Pin how much road is under it there, so it can't get worse.
      const tail = steps.filter(([dx, , shown]) => shown && dx < -88).map(([dx, dy]) => onRoad(dx, dy));
      const oldRoad = [15, 10, 9, 7, 5, 2, 1, 0, 0];
      assert.equal(tail.length, oldRoad.length, `${name}: ${tail.length} steps past dx -88`);
      tail.forEach((on, i) => assert.ok(on >= oldRoad[i], `${name}: road under the last steps is ${JSON.stringify(tail)}, worse than the old road's ${JSON.stringify(oldRoad)}`));
      // With reduced motion the truck rests untranslated at the road's back end, half behind the crane; the old road held 15 of 21 there too.
      assert.ok(onRoad(0, 0) >= 15, `${name} at rest: ${onRoad(0, 0)} of ${feet.length} on the road`);
    }
  });

  it('R1, R2, R3: the house is a small world-color object, where the house stood, painted after the ground and before the trucks', () => {
    const obj = resolve(sources, 'house');
    assert.equal(obj.legacy, false);
    assert.ok(obj.width <= CAPS.size && obj.height <= CAPS.size, `${obj.width}×${obj.height}`);
    assert.ok(usedColors(sources, obj).length <= CAPS.colors);
    for (const color of Object.values(obj.keys)) assert.ok(color in sources.palette.world, `house uses ${color}`);
    const i = indexesOf(['house']);
    assert.equal(i.length, 1);
    // Its anchor is the front corner of its walls; [-59, 59] is where the old house's front corner stood.
    assert.deepEqual(obj.anchor, [21, 41]);
    assert.deepEqual(scene.items[i[0]].at, { px: [-59, 59] });
    assert.ok(i[0] > Math.max(...indexesOf(GROUND)), 'it paints over the ground');
    // It covers the river's grass end at [0, 3], which is why that tile stays grass: all but the 2 pixels of its right corner, by the river.
    sources.scenes.set('slice-6-probe', { viewBox: scene.viewBox, origin: scene.origin, items: [{ object: 'tile', at: { tile: [0, 3, 0] } }] });
    const tile = composite(renderScene(sources, 'slice-6-probe').root);
    sources.scenes.set('slice-6-probe', { viewBox: scene.viewBox, origin: scene.origin, items: [scene.items[i[0]]] });
    const house = composite(renderScene(sources, 'slice-6-probe').root);
    const showing = [...tile.keys()].filter((p) => !house.has(p));
    assert.deepEqual(showing, ['-34,31', '-34,32'], 'the house hides the tile at [0, 3]');
    // The roof's right outline, the old house's rightmost column, is the house's too.
    for (const y of [30, 31, 32]) assert.equal(house.get(`-35,${y}`), 'ink', `the roof's right outline at -35,${y}`);
  });

  it('R1, R2: every object the island places is within 64×64 and 12 colors, in world colors', () => {
    for (const name of new Set(placed)) {
      const obj = resolve(sources, name);
      assert.ok(obj.width <= CAPS.size && obj.height <= CAPS.size, `${name} is ${obj.width}×${obj.height}`);
      assert.ok(usedColors(sources, obj).length <= CAPS.colors, `${name} uses ${usedColors(sources, obj).length} colors`);
      const world = new Set(Object.values(sources.palette.world).map((hex) => hex.toUpperCase()));
      for (const hex of usedColors(sources, obj)) assert.ok(world.has(hex.toUpperCase()), `${name} uses ${hex}, not a world color`);
    }
  });

  it('R1: the two legacy maps are deleted and the scene places neither', () => {
    for (const name of ['island-base', 'island-front']) {
      assert.ok(!sources.objects.has(name), `${name}.mjs is deleted`);
      assert.ok(!placed.includes(name));
    }
  });

  it('R1, R3: the crane is two stacked objects, the jib right on top of the mast, too tall for one', () => {
    assert.equal(indexesOf(['crane-mast']).length, 1);
    assert.equal(indexesOf(['crane-jib']).length, 1);
    const [mast, jib] = ['crane-mast', 'crane-jib'].map((name) => ({ obj: resolve(sources, name), item: scene.items[indexesOf([name])[0]] }));
    assert.ok(mast.obj.height + jib.obj.height > CAPS.size, 'as one object it would break the 64-pixel cap');
    // The mast's top-left pixel sits right under the jib's anchor, the bottom-left of the jib's own piece of mast.
    const top = [mast.item.at.px[0] - mast.obj.anchor[0], mast.item.at.px[1] - mast.obj.anchor[1]];
    assert.deepEqual(jib.item.at.px, [top[0], top[1] - 1]);
    const outline = (row, from) => [row[from], row[from + mast.obj.width - 1]].map((key) => (key === '.' ? '.' : resolve(sources, 'crane-mast').keys[key] ?? key));
    assert.deepEqual(outline(mast.obj.layers[0].map[0], 0), ['ink', 'ink'], 'the mast starts with its two outlines');
    assert.deepEqual(outline(jib.obj.layers[0].map[jib.obj.anchor[1]], jib.obj.anchor[0]).map((key) => jib.obj.keys[key] ?? key), ['ink', 'ink'], 'the jib ends on the same two outlines');
    // The hearth (the crane's swinging load) hangs from the jib: the pixel above its cable is the jib's.
    const hearth = scene.items.find((item) => item.object === 'hearth');
    assert.ok(paintOf([jib.item]).has(`${hearth.at.px[0] + 9},${hearth.at.px[1] - 1}`), 'the jib is right above the hearth\'s cable');
  });

  it('R3: the front pieces and trees are pinned, and each stands on the grass, not on the river or the road', () => {
    const at = (names) => scene.items.filter((item) => names.includes(item.object)).map((item) => [item.object, item.at.px ?? item.at.tile]);
    assert.deepEqual(at(['tree-shade', ...TREES, ...IN_FRONT_OF_TRUCKS]), [
      ['tree-shade', [-1, 19]],
      ['tree-shade', [-25, 29]],
      ['tree-shade', [55, 38]],
      ['tree-small', [-1, 19]],
      ['pine', [-25, 20]],
      ['tree-small', [-25, 29]],
      ['pine', [55, 38]],
      ['bridge-rail', [2, 3, 0]],
      ['shed', [32, 62]],
      ['crane-mast', [59, 59]],
      ['crane-jib', [56, 19]],
      ['fence', [12, 75]],
      ['tree-small', [-13, 73]],
      ['pine', [-30, 78]],
      ['pine', [-1, 80]],
      ['tree-small', [-1, 90]],
      ['hearth', [24, 17]],
    ]);
    // Each shade lies under a back tree's trunk.
    for (const [, px] of at(['tree-shade'])) {
      assert.ok(scene.items.some((item) => TREES.includes(item.object) && String(item.at.px) === String(px)), `a tree stands on the shade at ${px}`);
    }
    // Where each piece meets the ground: a tree's or the mast's anchor (the foot of its trunk), and the lowest pixel of every column of the shed and the fence.
    const feet = scene.items.filter((item) => [...TREES, 'crane-mast'].includes(item.object)).map((item) => [item.object, item.at.px]);
    for (const item of scene.items.filter((item) => ['shed', 'fence'].includes(item.object))) {
      const lowest = new Map();
      for (const p of paintOf([item]).keys()) {
        const [x, y] = p.split(',').map(Number);
        lowest.set(x, Math.max(lowest.get(x) ?? -Infinity, y));
      }
      for (const [x, y] of lowest) feet.push([item.object, [x, y]]);
    }
    const ground = paintOf(scene.items.filter((item) => GROUND.includes(item.object)));
    const wet = paintOf(scene.items.filter((item) => ['river', 'path', 'bridge', 'waterfall-face'].includes(item.object)));
    for (const [name, [x, y]] of feet) {
      assert.ok(ground.has(`${x},${y}`), `${name} stands on the island at ${x},${y}`);
      assert.ok(!wet.has(`${x},${y}`), `${name} stands on the river or the road at ${x},${y}`);
    }
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
