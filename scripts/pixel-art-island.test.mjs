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
import { pxToTile, tileToPx } from '../src/lib/pixel-art/iso.mjs';
import { stateAt } from '../src/lib/pixel-art/motion.mjs';
import { compileScene, readSources } from './optimize-pixel-art.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ART_DIR = join(ROOT, 'src/assets/pixel-art');

const { sources } = await readSources(join(ART_DIR, 'source'));
const scene = sources.scenes.get('hero-island');
/** The scene's items in paint order, flattened out of their entrance groups (island build entrance spec). */
const flatten = (items) => items.flatMap((item) => (item.group ? flatten(item.items) : [item]));
const items = flatten(scene.items);
const placed = items.map((item) => item.object);
const svg = compileScene(sources, 'hero-island').output;

/**
 * The cubes on the island's two front edges (hero island detail spec, Hidden joints): the true corner, then the edge pieces
 * that hide the joints on the left cliff, the right cliff and where the road meets the left cliff.
 */
const BLOCKS = ['block', 'block-left', 'block-right', 'block-road', 'block-river'];
/** The island level up's cubes: the mining ground and its left cliff, and the right-cliff cube under the railway. */
const NEW_BLOCKS = ['block-mine', 'block-mine-left', 'block-rail'];
const CUBES = [...BLOCKS, ...NEW_BLOCKS];
/** The flat tops laid over a cube: the road, the river, the railway and the mine track. */
const TOPS = ['river', 'path', 'track', 'track-mine', 'level-crossing'];

/** The ground's library objects: one cube per position, plus a flat top laid over it where the road, river or a track crosses it. */
const GROUND = ['tile', ...CUBES, ...TOPS];

/** The island's cubes by "col,row", from their ground groups (island level up spec R1). */
const cubeAt = new Map(
  scene.items.filter((g) => g.group?.['data-enter'] === 'ground').map((g) => [String(g.items[0].at.tile.slice(0, 2)), g.items[0].object]),
);
/** Where a cube stands: on the left cliff (nothing at row + 1), the right cliff (nothing at col + 1), both (a front corner), or inland. */
const cliffOf = (col, row) => {
  const [left, right] = [!cubeAt.has(`${col},${row + 1}`), !cubeAt.has(`${col + 1},${row}`)];
  return left && right ? 'corner' : left ? 'left' : right ? 'right' : 'inland';
};

/** The scene's motion tracks by item id, and a tracked item's state at a time (motion.mjs). */
const tracks = new Map(scene.motion.tracks.map((track) => [track.item, track]));
const stateOf = (item, time) => stateAt(tracks.get(item.id), item.object, scene.motion.duration, time);
const pointOf = (item) => item.at.px ?? tileToPx(item.at.tile, scene.origin);
/** The trucks the motion drives. */
const trucks = items.filter((item) => item.id?.startsWith('truck-'));

/** The island's limits, in bytes (hero island detail spec R10, raised by the island level up spec), which replace R6's "no heavier than today". */
const MAX_RAW = 750 * 1024;
const MAX_GZIP = 150 * 1024;

/**
 * Objects that paint behind the trucks (ground, water, road, bridge, house, the back trees' shade) and in front of them
 * (spec, Target scene). Trees stand on both sides: TREES are placed by depth, and the R5 test checks each one.
 */
const BEHIND_TRUCKS = ['island-shadow', 'tile', ...GROUND, 'waterfall-face', 'bridge', 'house', 'tree-shade'];
const FRONT_PIECES = ['bridge-rail', 'boxes', 'crane-mast', 'crane-jib', 'crane-hook'];
const TREES = ['tree', 'tree-small', 'pine'];

const indexesOf = (names) => items.flatMap((item, i) => (names.includes(item.object) ? [i] : []));

/** What these items paint on their own, in scene pixels: a Map of 'x,y' to color name. */
const paintOf = (items) => {
  sources.scenes.set('island-probe', { viewBox: scene.viewBox, origin: scene.origin, items });
  return composite(renderScene(sources, 'island-probe').root);
};

describe('hero island structure', () => {
  it('R7: flag and crane-box keep their loops and frame counts, in world colors', () => {
    for (const [name, [loop, prefix, count]] of Object.entries({ flag: ['ff', 'f', 4], 'crane-box': ['hf', 'h', 6] })) {
      const obj = resolve(sources, name);
      const looped = obj.layers.filter((layer) => 'frames' in layer);
      assert.deepEqual(looped.map((layer) => [layer.loop, layer.prefix, layer.frames.length]), [[loop, prefix, count]], name);
      for (const color of Object.values(obj.keys)) assert.ok(color !== 'ink' && color in sources.palette.world, `${name} uses ${color}`);
    }
  });

  it('R7: truck-green is still a recolor of truck, and both use world colors', () => {
    assert.equal(sources.objects.get('truck-green').extends, 'truck');
    assert.equal(sources.objects.get('truck-green').layers, undefined, 'truck-green adds no map of its own');
    for (const name of ['truck', 'truck-green']) {
      for (const color of Object.values(resolve(sources, name).keys)) assert.ok(color in sources.palette.world, `${name} uses ${color}`);
    }
  });

  it('R3: the front blocks have no outline (the owner\'s decision of 2026-10-04: the library block and its edge pieces have no edge)', () => {
    for (const name of CUBES) {
      const block = sources.objects.get(name);
      assert.ok(placed.includes(name), `the island places ${name}`);
      assert.equal(block.faces.edge, undefined, `${name} has no faces.edge`);
      assert.deepEqual(Object.keys(block.faces).sort(), ['left', 'right', 'top'], `${name} has only top, left and right faces`);
      assert.ok(!Object.values(block.sides?.keys ?? {}).includes('ink') && !Object.values(block.surface?.keys ?? {}).includes('ink'), `${name} paints no ink`);
    }
  });

  it('R7: the clouds are cubes in world colors: cream tops, path-2 and path-3 sides, never path-1 (detail spec C4)', () => {
    for (const name of ['cloud-a', 'cloud-b', 'cloud-c']) {
      const colors = new Set(Object.values(resolve(sources, name).keys));
      assert.deepEqual([...colors].sort(), ['cream', 'path-2', 'path-3'], name);
    }
  });

  it('R7: the trucks use world colors only, with no outline, and truck-green still extends truck', () => {
    for (const name of ['truck', 'truck-green']) {
      for (const color of Object.values(resolve(sources, name).keys)) assert.ok(color !== 'ink' && color in sources.palette.world, `${name} uses ${color}`);
    }
    assert.equal(sources.objects.get('truck-green').extends, 'truck');
  });

  it('R1, R3: the viewBox frames the three sections and the clouds, and the scene\'s motion drives the trucks, not a CSS class (island level up spec)', () => {
    assert.deepEqual(scene.viewBox, [-182, -92, 446, 264]);
    assert.match(svg, /^<svg [^>]*viewBox="-182 -92 446 264"/);
    assert.ok(!items.some((item) => item.class?.split(' ').includes('itruck')), 'no item uses the old itruck drive');
    for (const name of ['flag', 'river', 'waterfall-face', 'path', 'bridge', 'bridge-rail', 'house', 'boxes', 'tree-small', 'pine', 'crane-mast', 'crane-jib', 'crane-hook', 'truck-open', 'tunnel-road', 'conveyor-row', 'ore-screen', 'mine-cart', 'hopper', 'processor', 'container', 'track', 'tunnel-rail', 'level-crossing', 'crossing-signal', 'crossing-gate', 'conveyor-feed', 'stone', 'locomotive', 'flatcar', 'boxcar']) {
      assert.ok(placed.includes(name), `${name} is in the scene`);
    }
    assert.equal(trucks.length, 4, 'four truck items share the line');
    for (const truck of trucks) {
      const poses = new Set([truck.object, ...tracks.get(truck.id).keys.map((key) => key.pose).filter(Boolean)]);
      for (const pose of poses) assert.match(pose, /^truck-open(-tipped)?$/, `${truck.id} is the red open-top truck in one of its poses, so the loop hands one over to the next unseen (spec R7)`);
    }
    assert.ok(!placed.includes('fence'), 'the fence is off the island (the owner\'s Stage 2 review)');
    assert.ok(!placed.includes('waterfall'), 'the 82×45 waterfall is retired (slice 4)');
  });

  it('R4: the groups the CSS animates are the frame loops and the clouds, and the CSS still names them; the trucks\' idrive is gone', async () => {
    // The entrance groups wrap these and animate from the hero's script; the mv- groups are the scene's motion (island level up spec R10).
    const groups = [...svg.matchAll(/<g class="([^"]+)"/g)].map((m) => m[1]).filter((cls) => cls !== 'enter' && !cls.startsWith('mv-'));
    // Each river tile carries its own wf loop, and the falling face one more.
    const rivers = indexesOf(['river', 'waterfall-face']).length;
    assert.equal(rivers, 7, 'six river tiles, the whole of row 3 (island clock sweep spec R7), and the falling face');
    const count = (prefix) => groups.filter((cls) => cls.split(' ')[0] === prefix).length;
    // The flag's streaks, the two belt segments' cleats and the feed belt's are ff; the processor's LED is hf (island level up spec R4).
    const belts = indexesOf(['conveyor-row', 'conveyor-feed']).length;
    assert.equal(belts, 3, 'two ore belt segments and the feed belt (the owner\'s PR review)');
    assert.deepEqual(
      Object.fromEntries(['wf', 'ff', 'hf', 'pcloud'].map((p) => [p, count(p)])),
      { wf: rivers * 5, ff: 4 * (1 + belts), hf: 6, pcloud: 3 },
    );
    assert.equal(groups.length, rivers * 5 + 4 * 4 + 6 + 3, 'no other class');
    const css = await readFile(join(ROOT, 'src/styles/pixel-art.css'), 'utf8');
    for (const cls of ['.pcloud', '.wf', '.ff', '.hf', '.w0', '.f0', '.h0']) assert.ok(css.includes(cls), `pixel-art.css names ${cls}`);
    for (const gone of ['idrive', '.itruck', '.it2']) assert.ok(!css.includes(gone), `pixel-art.css no longer has ${gone}`);
    const reduced = css.slice(css.indexOf('prefers-reduced-motion: reduce'));
    assert.ok(reduced.includes('.w0, .f0, .h0 { opacity: 1; }'), 'reduced motion shows frame 0');
  });

  it('R8: the trucks paint over the ground and road; the crossing\'s far signal and gate paint behind the far truck and the train, and the near ones in front of every truck and the train', () => {
    const [lastGround, lastBehind] = [Math.max(...indexesOf([...GROUND, 'waterfall-face'])), Math.max(...indexesOf(BEHIND_TRUCKS))];
    const at = (id) => items.findIndex((item) => item.id === id);
    for (const truck of trucks) assert.ok(items.indexOf(truck) > lastGround, `${truck.id} paints over the ground`);
    // The ones on the road before the crossing also paint over the house, the river bridge and the back trees' shade.
    for (const truck of trucks.filter((t) => t.id !== 'truck-far')) assert.ok(items.indexOf(truck) > lastBehind, `${truck.id} paints over the house and the bridge`);
    const far = trucks.filter((t) => t.id === 'truck-far');
    assert.equal(far.length, 1, 'one truck drives on past the crossing');
    // A level crossing replaced the overpass (the owner's PR review): back to front, the far gate and signal, the far truck, the train, the near signal and gate.
    assert.ok(at('gate-far') < at('signal-far') && at('signal-far') < at('truck-far'), 'the far gate and signal paint behind the far truck');
    const cars = ['train-loco', 'train-flatcar', 'train-boxcar', 'container-train'];
    for (const car of cars) assert.ok(at('truck-far') < at(car) && at(car) < at('signal-near'), `${car} paints between the far truck and the near signal`);
    assert.ok(at('signal-near') < at('gate-near'), 'the near gate paints in front of the near signal');
    for (const truck of trucks.filter((t) => t !== far[0])) assert.ok(items.indexOf(truck) < at('signal-near'), `${truck.id} paints behind the near signal`);
  });

  it('R8: no truck is on the level crossing while the train is, and the gates are down and the lamps lit whenever a car is on it (the owner\'s PR review)', () => {
    const [cx] = tileToPx([2, -3, 0], scene.origin);
    const byId = (id) => items.find((item) => item.id === id);
    const xAt = (item, time) => pointOf(item)[0] + stateOf(item, time).move[0];
    // In screen x, the crossing tile reaches ±8 px from its centre along either axis, a car ±18 px and a truck ±10 px.
    const cars = ['train-loco', 'train-flatcar', 'train-boxcar'].map(byId);
    const [gateNear, gateFar, signalNear, signalFar] = ['gate-near', 'gate-far', 'signal-near', 'signal-far'].map(byId);
    let trainOn = 0;
    for (let time = 0; time < scene.motion.duration; time += 50) {
      const car = cars.some((item) => stateOf(item, time).show && Math.abs(xAt(item, time) - cx) < 8 + 18);
      const truck = trucks.some((item) => stateOf(item, time).show && Math.abs(xAt(item, time) - cx) < 8 + 10);
      assert.ok(!(car && truck), `a truck and the train are both on the crossing at ${time} ms`);
      if (!car) continue;
      trainOn++;
      assert.equal(stateOf(gateNear, time).pose, 'crossing-gate-down', `the near gate is down at ${time} ms`);
      assert.equal(stateOf(gateFar, time).pose, 'crossing-gate-down-far', `the far gate is down at ${time} ms`);
      for (const signal of [signalNear, signalFar]) assert.match(stateOf(signal, time).pose, /^crossing-signal-(left|right)$/, `${signal.id} is lit at ${time} ms`);
    }
    assert.ok(trainOn > 0, 'the train passes the crossing');
    // At rest (and under reduced motion) the lamps are dark and the gates up.
    for (const item of [gateNear, gateFar, signalNear, signalFar]) assert.equal(stateOf(item, 0).pose, item.object, `${item.id} at rest`);
  });

  it('R7: wherever a shown truck crosses a tree in the loop, the one standing further forward paints over the other', () => {
    // Further forward is the larger col + row of where it stands: a tree's trunk foot, a truck's road point.
    const depth = ([x, y]) => {
      const [col, row] = pxToTile([x, y], 0, scene.origin);
      return col + row;
    };
    const trees = indexesOf(TREES).map((i) => ({ i, item: items[i], paint: paintOf([items[i]]), depth: depth(items[i].at.px) }));
    let crossings = 0;
    for (const truck of trucks) {
      const [x0, y0] = pointOf(truck);
      for (let time = 0; time < scene.motion.duration; time += 100) {
        const { move, show, pose } = stateOf(truck, time);
        if (!show) continue;
        const at = [x0 + move[0], y0 + move[1]];
        const body = paintOf([{ object: pose, at: { px: at } }]);
        for (const tree of trees) {
          if (![...body.keys()].some((p) => tree.paint.has(p))) continue;
          crossings++;
          const inFront = tree.depth > depth(at);
          assert.equal(tree.i > items.indexOf(truck), inFront, `${tree.item.object} at ${tree.item.at.px} and ${truck.id} at ${at} (${time} ms)`);
        }
      }
    }
    assert.ok(crossings > 0, 'the trucks pass some trees');
  });

  it('R1, R3: the ground is one cube per position on a [col, row, 0] grid in three sections, edge pieces on the front cliffs, block at the corner, and each top laid right after its cube (island level up spec R1)', () => {
    const ground = scene.items.filter((g) => g.group['data-enter'] === 'ground');
    assert.deepEqual(scene.origin, [0, 8], 'the grid origin that puts the middle island\'s top faces where the island stood');
    // The middle island (cols 0–5, rows 0–5, plus cols 6–7 on rows 0–2 behind the waterfall row, the owner's PR review), the mining section on its L–B
    // side (rows 6–10) and the rail section on its T–R side (rows −6 to −1, cols 0–10; row −6 only to col 4).
    const want = new Set();
    for (let row = -6; row <= 10; row++) {
      const last = row === -6 ? 4 : row < 0 ? 10 : row <= 2 ? 7 : 5;
      for (let col = 0; col <= last; col++) want.add(`${col},${row}`);
    }
    assert.deepEqual([...cubeAt.keys()].sort(), [...want].sort(), 'the three sections, every position once');
    assert.equal(ground.length, 132, 'one ground group per position');
    // Which cube stands where, by its neighbours: the cliffs need their edge pieces (hero island detail spec, Hidden joints).
    const allowed = {
      corner: ['block'],
      left: ['block-left', 'block-road', 'block-mine-left'],
      right: ['block-right', 'block-river', 'block-rail'],
      inland: ['block', 'block-road', 'block-river', 'block-mine'],
    };
    for (const [key, object] of cubeAt) {
      const [col, row] = key.split(',').map(Number);
      assert.ok(allowed[cliffOf(col, row)].includes(object), `[${col}, ${row}] (${cliffOf(col, row)}) is ${object}`);
    }
    // The road runs on col 2 the whole way: its cubes are block-road, and the river runs on block-river along row 3.
    // The road crosses the track at ground level (the owner's PR review), and the bridge crosses the river at [2, 3].
    for (let row = -6; row <= 10; row++) {
      const want = row === 3 ? 'block-river' : 'block-road';
      assert.equal(cubeAt.get(`2,${row}`), want, `the road's cube at [2, ${row}]`);
    }
    for (let col = 0; col <= 5; col++) assert.equal(cubeAt.get(`${col},3`), 'block-river', `the river's cube at [${col}, 3]`);
    assert.equal(cubeAt.get('10,-3'), 'block-rail', 'the railway meets the B–R cliff on block-rail');
    // Each group is its cube, then any top on the same tile, laid on the material it belongs on.
    const on = { path: ['block-road'], 'level-crossing': ['block-road'], river: ['block-river'], track: ['block-road', 'block-rail'], 'track-mine': ['block', 'block-right'], 'waterfall-face': ['block-river'] };
    for (const group of ground) {
      const [cube, ...rest] = group.items;
      assert.ok(CUBES.includes(cube.object), `${cube.object} at ${cube.at.tile} is a cube`);
      for (const top of rest) {
        assert.deepEqual(top.at.tile, cube.at.tile, `${top.object} sits on its cube's tile`);
        assert.ok(on[top.object]?.includes(cube.object), `${top.object} at ${top.at.tile} lies on ${cube.object}`);
      }
    }
    // Row by row, then by column: a cube only covers the cubes at [col + 1, row] and [col, row + 1], which both come later.
    const order = ground.map((g) => g.items[0].at.tile[1] * 100 + g.items[0].at.tile[0]);
    assert.deepEqual(order, [...order].sort((a, b) => a - b), 'ground paints row by row, then by column');
    for (const name of BLOCKS) assert.deepEqual(resolve(sources, name).block.size, [1, 1, 1], `${name} is a cube`);
    // Each edge piece is block with one corner column recolored to the cliff's face (block-road also swaps the grass band
    // for a path band): the same top, faces and surface, the same right face (block-right) or the same left face (block-left).
    const side = (name, face) => {
      const { faces, sides } = sources.objects.get(name);
      return sides[face].map((row) => [...row].map((k) => (k === '.' ? faces[face] : sides.keys[k])));
    };
    const column = (map, c) => map.map((row) => row[c]);
    for (const name of BLOCKS.slice(1)) {
      const [obj, block] = [name, 'block'].map((n) => sources.objects.get(n));
      assert.deepEqual([obj.faces, obj.surface], [block.faces, block.surface], `${name} has block's faces and top`);
    }
    assert.deepEqual(side('block-left', 'left'), side('block', 'left'), 'block-left keeps block\'s left face');
    assert.deepEqual(side('block-right', 'right'), side('block', 'right'), 'block-right keeps block\'s right face');
    for (const [name, face, keep] of [['block-left', 'right', 'left'], ['block-right', 'left', 'right'], ['block-road', 'right', 'left']]) {
      const corner = face === 'right' ? 0 : 14;
      const changed = side(name, face).map((row) => row.filter((_, c) => c !== corner));
      const base = name === 'block-road' ? side('block', face).map((row) => row.map((color) => (color === 'grass-4' ? 'path-4' : color))) : side('block', face);
      assert.deepEqual(changed, base.map((row) => row.filter((_, c) => c !== corner)), `${name} changes only its ${face} face's corner column`);
      assert.deepEqual(column(side(name, face), corner), column(side(name, keep), face === 'right' ? 14 : 0), `${name}'s corner column copies its ${keep} face's corner`);
    }
    assert.deepEqual(side('block-road', 'left'), side('block', 'left').map((row) => row.map((color) => ({ 'grass-3': 'path-3', 'grass-4': 'path-4' })[color] ?? color)), 'block-road is block with a path band');
    // block-river is block-right with a water band: grass becomes the water ramp, and its corner column copies its right face's.
    const band = (map, ramp) => map.map((row) => row.map((color) => (color.startsWith(ramp) ? 'band' : color)));
    const river = side('block-river', 'right');
    assert.deepEqual(band(river, 'water-'), band(side('block-right', 'right'), 'grass-'), 'block-river is block-right with its right band in water');
    assert.ok(river.flat().some((c) => c === 'water-3') && river.flat().some((c) => c === 'water-4'), 'its right band is water-3 with a water-4 last row');
    assert.deepEqual(side('block-river', 'left').map((row) => row.filter((_, c) => c !== 14)), side('block-right', 'left').map((row) => row.filter((_, c) => c !== 14).map((color) => ({ 'grass-3': 'water-3', 'grass-4': 'water-4' })[color] ?? color)), 'its left face is block-right\'s with a water band');
    assert.deepEqual(column(side('block-river', 'left'), 14), column(river, 0), 'block-river\'s corner column copies its right face\'s corner');
    assert.deepEqual(resolve(sources, 'tile').block.size, [1, 1, 0]);
    const path = sources.objects.get('path');
    assert.deepEqual([path.size, path.faces, Object.values(path.surface.keys)], [[1, 1, 0], { top: 'path-2' }, ['path-1', 'path-3', 'cream']], 'path is a flat path-2 tile with path-1 and path-3 wear and a cream center line (the owner\'s land review)');
    // river is a flat water-2 tile with five wf frames of ripples, in world colors (hero island detail spec, Tests that change).
    const flow = sources.objects.get('river');
    assert.deepEqual([flow.size, flow.faces, flow.surface.loop, flow.surface.prefix, flow.surface.frames.length], [[1, 1, 0], { top: 'water-2' }, 'wf', 'w', 5]);
    for (const color of Object.values(flow.surface.keys)) assert.ok(color in sources.palette.world && color !== 'ink', `river uses ${color}`);
  });

  it('R2 (island build entrance): the settled island paints exactly what it would with flat inland tiles, in every loop frame', () => {
    // Each inland cube's sides only show while it floats in: swap every inland cube for a flat tile of its own top and
    // surface, and the settled island must paint the same pixels (island level up spec, Tests).
    const flatOf = (name) => {
      const flat = `${name}--flat-probe`;
      if (!sources.objects.has(flat)) {
        const { faces, surface } = sources.objects.get(name);
        sources.objects.set(flat, { kind: 'block', size: [1, 1, 0], faces: { top: faces.top }, ...(surface ? { surface } : {}) });
      }
      return flat;
    };
    // Hidden means its front neighbours and the one diagonally in front all stand: at a concave corner in the island's outline,
    // one corner column of a cube shows past the step, by design.
    const inland = (item) => {
      if (!CUBES.includes(item.object) || !item.at.tile) return false;
      const [col, row] = item.at.tile;
      return cliffOf(col, row) === 'inland' && cubeAt.has(`${col + 1},${row + 1}`);
    };
    const swapped = items.map((item) => (inland(item) ? { ...item, object: flatOf(item.object) } : item));
    assert.ok(swapped.some((item, i) => item !== items[i]), 'some cubes are inland');
    const paint = (list, frame) => {
      sources.scenes.set('island-probe', { viewBox: scene.viewBox, origin: scene.origin, items: list });
      return [...composite(renderScene(sources, 'island-probe').root, { frame })].sort();
    };
    for (let frame = 0; frame < 6; frame++) assert.deepEqual(paint(items, frame), paint(swapped, frame), `frame ${frame}`);
    for (const name of [...sources.objects.keys()].filter((n) => n.endsWith('--flat-probe'))) sources.objects.delete(name);
  });

  it('R1, R2, R4: the waterfall-face falls down the front block at [5, 3], in world colors, with its own wf loop and the flag\'s streaks on it', () => {
    const obj = resolve(sources, 'waterfall-face');
    assert.ok(obj.width <= CAPS.size && obj.height <= CAPS.size, `${obj.width}×${obj.height}`);
    assert.ok(usedColors(sources, obj).length <= CAPS.colors);
    for (const color of Object.values(obj.keys)) assert.ok(color in sources.palette.world, `waterfall-face uses ${color}`);
    // A still face, then the loop: frame 0 is what reduced motion shows over it.
    assert.equal(obj.layers.length, 2);
    assert.ok(obj.layers[0].map, 'the face itself is not animated');
    assert.deepEqual([obj.layers[1].loop, obj.layers[1].prefix, obj.layers[1].frames.length], ['wf', 'w', 5]);
    const i = indexesOf(['waterfall-face']);
    assert.equal(i.length, 1);
    assert.deepEqual(items[i[0]].at, { tile: [5, 3, 0] });
    assert.equal(items[i[0] - 1].object, 'river', 'it follows the river top it falls from');
    assert.ok(i[0] < indexesOf(['flag'])[0], 'the flag\'s streaks paint over it');
    // Every streak of the flag (ff), in every frame, lands on the falling water.
    const render = (names) => {
      sources.scenes.set('slice-4-probe', { viewBox: scene.viewBox, origin: scene.origin, items: items.filter((item) => names.includes(item.object)) });
      return composite(renderScene(sources, 'slice-4-probe').root);
    };
    const face = render(['waterfall-face']);
    const flag = resolve(sources, 'flag');
    const [fx, fy] = items.find((item) => item.object === 'flag').at.px;
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
    assert.ok(obj.width <= CAPS.size && obj.height <= CAPS.size, `${obj.width}×${obj.height}`);
    assert.ok(usedColors(sources, obj).length <= CAPS.colors);
    for (const color of Object.values(obj.keys)) assert.match(color, /^path-[1-4]$/, `shadow color ${color}`);
    const shadows = indexesOf(['island-shadow']);
    const ground = indexesOf(GROUND);
    assert.ok(shadows.length > 0);
    assert.ok(Math.max(...shadows) < Math.min(...ground), 'the shadow paints before the ground');
    // Everything the shadow paints that survives is below or beside the island, so it only shows as a rim.
    const only = (names) => {
      sources.scenes.set('slice-3-probe', { viewBox: scene.viewBox, origin: scene.origin, items: items.filter((item) => names.includes(item.object)) });
      return composite(renderScene(sources, 'slice-3-probe').root);
    };
    const island = only(GROUND);
    const shadow = only(['island-shadow']);
    const visible = [...shadow.keys()].filter((p) => !island.has(p));
    // 24 sprites of 128 checker pixels each, along the three sections' front edges: none overlaps another, and none hides under the ground.
    assert.equal(shadow.size, 24 * 128, 'the shadow sprites paint 3,072 distinct pixels');
    assert.equal(visible.length, shadow.size, 'every shadow pixel is outside the island');
  });

  it('R3: the 24 shadow pieces are pinned under the island\'s front tiles, so moving one fails', () => {
    const at = items.filter((item) => item.object === 'island-shadow').map((item) => item.at.px);
    // Under the front tiles of the three sections, 32 pixels below each top face (island level up spec, Design).
    assert.deepEqual(at, [
      [240, 80], [224, 88], [208, 96], [192, 104], [144, 96], [160, 104], [176, 112], [112, 96],
      [96, 104], [80, 112], [64, 104], [32, 104], [16, 112], [0, 120], [-16, 128], [-32, 136],
      [-48, 144], [-64, 152], [-160, 120], [-144, 128], [-128, 136], [-112, 144], [-96, 152], [-80, 160],
    ]);
    assert.deepEqual(resolve(sources, 'island-shadow').anchor, [15, 8], 'the anchor is the diamond\'s center');
  });

  it('R1, R2, R3: the bridge is a small world-color object on the road where it crosses the river, painted over the ground', () => {
    const obj = resolve(sources, 'bridge');
    assert.ok(obj.width <= CAPS.size && obj.height <= CAPS.size, `${obj.width}×${obj.height}`);
    assert.ok(usedColors(sources, obj).length <= CAPS.colors);
    for (const color of Object.values(obj.keys)) assert.ok(color in sources.palette.world, `bridge uses ${color}`);
    const i = indexesOf(['bridge']);
    assert.equal(i.length, 1);
    assert.deepEqual(items[i[0]].at, { tile: [2, 3, 0] });
    assert.ok(i[0] > Math.max(...indexesOf(GROUND)), 'it paints over the ground, both banks included');
  });

  it('R7, R8: every truck keeps to the road\'s line at road level through the whole loop, the level crossing included', () => {
    // A point on the road's centre line (col 2) at height z has x + 2y = 80 − 2z with the island's origin, whatever its row.
    const line = 80;
    for (const truck of trucks) {
      const [x0, y0] = pointOf(truck);
      let shown = 0;
      for (let time = 0; time < scene.motion.duration; time += 50) {
        const { move, show, pose } = stateOf(truck, time);
        if (!show) continue;
        shown++;
        const v = x0 + move[0] + 2 * (y0 + move[1]);
        const where = `${truck.id} at ${time} ms (${pose})`;
        assert.equal(v, line, `${where}: x + 2y is ${v}, off the road`);
      }
      assert.ok(shown > 0, `${truck.id} shows`);
    }
    // At the rest frame, the trucks on show stand on the road at road level.
    for (const truck of trucks.filter((t) => stateOf(t, 0).show)) {
      const [x, y] = pointOf(truck);
      assert.equal(x + 2 * y, line, `${truck.id} at rest`);
    }
  });

  it('R1, R2, R3: the house is a small world-color object, where the house stood, painted after the ground and before the trucks', () => {
    const obj = resolve(sources, 'house');
    assert.ok(obj.width <= CAPS.size && obj.height <= CAPS.size, `${obj.width}×${obj.height}`);
    assert.ok(usedColors(sources, obj).length <= CAPS.colors);
    for (const color of Object.values(obj.keys)) assert.ok(color in sources.palette.world, `house uses ${color}`);
    const i = indexesOf(['house']);
    assert.equal(i.length, 1);
    // Its anchor is the front corner of its walls; [-59, 59] is where the old house's front corner stood.
    assert.deepEqual(obj.anchor, [21, 41]);
    assert.deepEqual(items[i[0]].at, { px: [-59, 59] });
    assert.ok(i[0] > Math.max(...indexesOf(GROUND)), 'it paints over the ground');
    // It covers the river's grass end at [0, 3], which is why that tile stays grass: all but the 2 pixels of its right corner, by the river.
    sources.scenes.set('slice-6-probe', { viewBox: scene.viewBox, origin: scene.origin, items: [{ object: 'tile', at: { tile: [0, 3, 0] } }] });
    const tile = composite(renderScene(sources, 'slice-6-probe').root);
    sources.scenes.set('slice-6-probe', { viewBox: scene.viewBox, origin: scene.origin, items: [items[i[0]]] });
    const house = composite(renderScene(sources, 'slice-6-probe').root);
    const showing = [...tile.keys()].filter((p) => !house.has(p));
    assert.deepEqual(showing, ['-34,31', '-34,32'], 'the house hides the tile at [0, 3]');
    // The roof's right edge, the old house's rightmost column, is the house's too, painted in a world color (no outline).
    for (const y of [30, 31, 32]) {
      const color = house.get(`-35,${y}`);
      assert.ok(color && color !== 'ink' && color in sources.palette.world, `the roof's right edge at -35,${y} is ${color}`);
    }
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
    const [mast, jib] = ['crane-mast', 'crane-jib'].map((name) => ({ obj: resolve(sources, name), item: items[indexesOf([name])[0]] }));
    assert.ok(mast.obj.height + jib.obj.height > CAPS.size, 'as one object it would break the 64-pixel cap');
    // The mast's top-left pixel sits right under the jib's anchor, the bottom-left of the jib's own piece of mast.
    const top = [mast.item.at.px[0] - mast.obj.anchor[0], mast.item.at.px[1] - mast.obj.anchor[1]];
    assert.deepEqual(jib.item.at.px, [top[0], top[1] - 1]);
    // The jib's anchor row lines up with the mast's top row: the same world colors at both ends (no outline).
    const ends = (obj, y, from) => [from, from + mast.obj.width - 1].map((x) => obj.keys[obj.layers[0].map[y][x]]);
    const mastEnds = ends(mast.obj, 0, 0);
    assert.deepEqual(ends(jib.obj, jib.obj.anchor[1], jib.obj.anchor[0]), mastEnds, 'the jib carries on the mast\'s top row');
    for (const color of mastEnds) assert.ok(color && color !== 'ink' && color in sources.palette.world, `the mast's edge is ${color}`);
    // The hook hangs from the jib: the pixel above its rope is the jib's, and its other poses and the jib's swap in place by the motion (island level up spec R5).
    const hook = items.find((item) => item.object === 'crane-hook');
    assert.ok(paintOf([jib.item]).has(`${hook.at.px[0] + 9},${hook.at.px[1] - 1}`), 'the jib is right above the hook\'s rope');
    const poses = (item) => new Set(tracks.get(item.id).keys.map((key) => key.pose).filter(Boolean));
    assert.deepEqual([...poses(jib.item)].sort(), ['crane-jib', 'crane-jib-back', 'crane-jib-side']);
    assert.deepEqual([...poses(hook)].sort(), ['crane-hook', 'crane-hook-drop', 'crane-hook-low']);
  });

  it('R3: the front pieces and trees are pinned, and each stands on the grass, not on the river, the road or a track', () => {
    const at = (names) => items.filter((item) => names.includes(item.object)).map((item) => [item.object, item.at.px ?? item.at.tile]);
    assert.deepEqual(at(['tree-shade', ...TREES, ...FRONT_PIECES]), [
      ['tree-small', [157, 3]],
      ['pine', [229, 44]],
      ['crane-mast', [136, 52]],
      ['crane-jib', [133, 12]],
      ['pine', [34, -2]],
      ['tree-shade', [-1, 19]],
      ['tree-shade', [-25, 29]],
      ['tree-shade', [61, 75]],
      ['tree-small', [-1, 19]],
      ['pine', [-25, 20]],
      ['tree-small', [-25, 29]],
      ['pine', [-101, 68]],
      ['tree-small', [-138, 82]],
      ['tree', [-146, 95]],
      ['bridge-rail', [2, 3, 0]],
      ['crane-hook', [103, 7]],
      ['boxes', [86, 70]],
      ['pine', [61, 75]],
      ['tree-small', [173, 72]],
      ['tree-small', [-13, 73]],
      ['pine', [-30, 78]],
      ['pine', [-1, 80]],
      ['tree-small', [-1, 90]],
      ['tree-small', [-19, 93]],
      ['pine', [-74, 131]],
    ]);
    // Each shade lies under a back tree's trunk.
    for (const [, px] of at(['tree-shade'])) {
      assert.ok(items.some((item) => TREES.includes(item.object) && String(item.at.px) === String(px)), `a tree stands on the shade at ${px}`);
    }
    // Where each piece meets the ground: a tree's or the mast's anchor (the foot of its trunk), and the lowest pixel of every column of the boxes.
    const feet = items.filter((item) => [...TREES, 'crane-mast'].includes(item.object)).map((item) => [item.object, item.at.px]);
    for (const item of items.filter((item) => item.object === 'boxes')) {
      const lowest = new Map();
      for (const p of paintOf([item]).keys()) {
        const [x, y] = p.split(',').map(Number);
        lowest.set(x, Math.max(lowest.get(x) ?? -Infinity, y));
      }
      for (const [x, y] of lowest) feet.push([item.object, [x, y]]);
    }
    const ground = paintOf(items.filter((item) => GROUND.includes(item.object)));
    const wet = paintOf(items.filter((item) => ['river', 'path', 'level-crossing', 'bridge', 'waterfall-face', 'track', 'track-mine'].includes(item.object)));
    for (const [name, [x, y]] of feet) {
      assert.ok(ground.has(`${x},${y}`), `${name} stands on the island at ${x},${y}`);
      assert.ok(!wet.has(`${x},${y}`), `${name} stands on the river or the road at ${x},${y}`);
    }
  });

  it('R6: the compiled island is within the detail spec\'s R10 limits, raw and gzipped', async () => {
    const committed = await readFile(join(ART_DIR, 'hero-island.svg'), 'utf8');
    assert.equal(committed, svg, 'the committed SVG is what the scene compiles to');
    assert.ok(Buffer.byteLength(svg) <= MAX_RAW, `${Buffer.byteLength(svg)} bytes raw, over ${MAX_RAW}`);
    const gzip = gzipSync(svg, { level: 9 }).length;
    assert.ok(gzip <= MAX_GZIP, `${gzip} bytes gzipped, over ${MAX_GZIP}`);
  });

  it('R10: the SVG is decorative and safe: no script, link, text or external reference, and only the engine\'s motion <style>', async () => {
    const committed = await readFile(join(ART_DIR, 'hero-island.svg'), 'utf8');
    for (const [label, full] of [['compiled', svg], ['committed', committed]]) {
      assert.match(full, /^<svg [^>]*aria-hidden="true"/, label);
      // The scene's motion compiles to one <style> first in the SVG (island level up spec R10): keyframes and rules for mv- classes,
      // and the reduced-motion rule that turns them off, with no url(), @import or other selector.
      const style = /^<svg [^>]*><style>([^<]*)<\/style>/.exec(full)?.[1];
      assert.ok(style, `${label}: the motion's <style> comes first`);
      assert.doesNotMatch(style, /url\(|@import|expression|javascript:/i, label);
      const selectors = style.replace(/@keyframes [^{]+\{(?:[^{}]*\{[^}]*\})*\}/g, '').replace(/@media \(prefers-reduced-motion:reduce\)\{/, '').match(/[^{}]+(?=\{)/g) ?? [];
      for (const sel of selectors) assert.match(sel, /^(\.mv-[a-z0-9-]+|\[class\^="mv-"\],\[class\*=" mv-"\])$/, `${label}: selector ${sel}`);
      assert.equal(full.match(/<style>/g).length, 1, `${label}: one <style>`);
      const text = full.replace(/<style>[^<]*<\/style>/, '');
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

describe('entrance groups (island build entrance spec, Entrance groups)', () => {
  const groups = scene.items;
  const attr = (group, name) => group.group[name];
  const ofKind = (kind) => groups.filter((group) => attr(group, 'data-enter') === kind);

  it('every item sits in exactly one top-level enter group, of four kinds', () => {
    for (const group of groups) {
      assert.ok(group.group, 'every top-level item is a group');
      assert.equal(attr(group, 'class'), 'enter');
      assert.ok(['shadow', 'ground', 'object', 'sky'].includes(attr(group, 'data-enter')), attr(group, 'data-enter'));
      assert.ok(group.items.every((item) => !item.group), 'groups do not nest');
    }
    assert.deepEqual(ofKind('shadow').flatMap((g) => g.items).map((i) => i.object), Array(24).fill('island-shadow'), 'the 24 shadow pieces');
    assert.deepEqual(ofKind('sky').flatMap((g) => g.items).map((i) => i.object), ['cloud-a', 'cloud-b', 'cloud-c'], 'the three clouds');
    assert.equal(ofKind('shadow').length + ofKind('sky').length, 2, 'one shadow group and one sky group');
  });

  it('each cube is one ground group, in paint order, holding its cube and the top laid over it, with its grid place and foot (island clock sweep spec R6)', () => {
    const ground = ofKind('ground');
    assert.equal(ground.length, 132, 'one group per position (island level up spec R1, cols 6–7 on rows 0–2 since the owner\'s PR review)');
    for (const group of ground) {
      const [col, row] = [Number(attr(group, 'data-col')), Number(attr(group, 'data-row'))];
      for (const item of group.items) {
        assert.ok(item.at.tile, `${item.object} is placed on the grid`);
        assert.deepEqual(item.at.tile, [col, row, 0], `${item.object} at ${item.at.tile} is in its cube's group`);
      }
      assert.ok(CUBES.includes(group.items[0].object), `[${col}, ${row}] starts with its cube`);
      const [x, y] = tileToPx([col, row, 0], scene.origin);
      assert.deepEqual([attr(group, 'data-x'), attr(group, 'data-y')], [String(x), String(y)], `[${col}, ${row}]'s foot is its tile's center`);
    }
    const inGround = new Set(ground.flatMap((g) => g.items));
    // Objects placed on a tile (the bridges, the train, the processing line …) sit in object groups; no cube or top does.
    const tiled = items.filter((item) => !inGround.has(item) && item.at.tile && GROUND.includes(item.object));
    assert.deepEqual(tiled, [], 'every cube and top is ground');
  });

  it('each object group\'s data-x and data-y are its objects\' foot: shades take their tree\'s, and the crane\'s jib and hook take the mast\'s', () => {
    const foot = (item) => {
      if (item.at.tile) return tileToPx(item.at.tile, scene.origin);
      const { anchor, width, height } = resolve(sources, item.object);
      return [Math.round(item.at.px[0] - anchor[0] + width / 2), item.at.px[1] - anchor[1] + height - 1];
    };
    const objects = ofKind('object').flatMap((g) => g.items);
    const mast = objects.find((item) => item.object === 'crane-mast');
    const footOf = (item) => {
      if (item.object === 'tree-shade') return foot(objects.find((o) => o.object !== 'tree-shade' && String(o.at.px) === String(item.at.px)));
      if (item.object.startsWith('crane-jib') || item.object.startsWith('crane-hook')) return foot(mast);
      return foot(item);
    };
    for (const group of ofKind('object')) {
      // Every item shares the group's x. Its y is the first item's, so the trucks arrive with the flag, at its foot.
      for (const item of group.items) assert.equal(attr(group, 'data-x'), String(footOf(item)[0]), `${item.object} at ${JSON.stringify(item.at)}`);
      assert.equal(attr(group, 'data-y'), String(footOf(group.items[0])[1]), `${group.items[0].object}'s foot y`);
    }
    assert.equal(objects.length, items.length - 24 - 3 - ofKind('ground').flatMap((g) => g.items).length, 'every other item is an object');
  });

  it('the groups survive compiling, in order, with their data attributes', () => {
    const compiled = [...svg.matchAll(/<g class="enter" ([^>]*)>/g)].map((m) => m[1]);
    const want = groups.map((group) => Object.entries(group.group).filter(([k]) => k !== 'class').map(([k, v]) => `${k}="${v}"`).join(' '));
    assert.deepEqual(compiled, want);
  });
});

describe('close-up scenes (hero island detail plan, step 5)', () => {
  const CLOSEUPS = ['closeup-land', 'closeup-road-end', 'closeup-water', 'closeup-crane', 'closeup-office', 'closeup-front-trees', 'closeup-sky'];
  const key = (item) => JSON.stringify([item.object, item.class, item.at]);
  const order = new Map(items.map((item, i) => [key(item), i]));

  it('each is preview-only and shows island items where the island places them, in the island\'s paint order', () => {
    for (const name of CLOSEUPS) {
      const closeup = sources.scenes.get(name);
      assert.ok(closeup, `${name} exists`);
      assert.equal(closeup.output, undefined, `${name} writes no file`);
      assert.deepEqual(closeup.origin, scene.origin, `${name} uses the island's origin`);
      // They show the island at its rest frame, without its motion (island level up spec, Design).
      assert.equal(closeup.motion, undefined, `${name} has no motion`);
      const items = closeup.items;
      const at = items.map((item) => order.get(key(item)));
      assert.deepEqual(items.filter((_, i) => at[i] === undefined), [], `${name}: every item is one the island places`);
      assert.deepEqual(at, [...at].sort((a, b) => a - b), `${name}: in the island's order`);
    }
  });

  it('R7: on closeup-land, every joint on both cliffs is painted in its face\'s material, row by row, with no in-between color', () => {
    // Where two cubes meet on a cliff, one column of the back cube's other face shows: on the left cliff (nothing at row + 1 on
    // the island) its right face's column 0, at x = cx; on the right cliff (nothing at col + 1) its left face's column 14, at
    // x = cx - 1 (spec, Hidden joints).
    // That column must carry on the cliff's face: band rows and soil rows alike, it paints what the same cube's corner column
    // on the cliff's face paints in the same row (left cliff: x - 1, the left face's column 14; right cliff: x + 1, the right
    // face's column 0), and at the cube's last side row that corner is the face's own color (soil-2 left, soil-3 right).
    const closeup = sources.scenes.get('closeup-land');
    const shown = composite(renderScene(sources, 'closeup-land').root);
    const blocks = closeup.items.filter((item) => resolve(sources, item.object).block?.size[2] === 1);
    const at = new Set(blocks.map((item) => String(item.at.tile.slice(0, 2))));
    let joints = 0;
    for (const item of blocks) {
      const [col, row] = item.at.tile;
      const [cx, cy] = [(col - row) * 16 + scene.origin[0], (col + row) * 8 + scene.origin[1]];
      const cliffs = [
        { cliff: 'left', next: [col + 1, row], x: cx, own: cx - 1, onCliff: ['left', 'corner'].includes(cliffOf(col, row)) && ['left', 'corner'].includes(cliffOf(col + 1, row)) },
        { cliff: 'right', next: [col, row + 1], x: cx - 1, own: cx, onCliff: ['right', 'corner'].includes(cliffOf(col, row)) && ['right', 'corner'].includes(cliffOf(col, row + 1)) },
      ];
      for (const { cliff, next, x, own, onCliff } of cliffs) {
        if (!onCliff || !at.has(String(next))) continue;
        joints++;
        // The cube's 16 side rows below its top's lowest corner (cy + 7).
        for (let y = cy + 8; y < cy + 24; y++) {
          const [joint, face] = [shown.get(`${x},${y}`), shown.get(`${own},${y}`)];
          const where = `${item.object} at [${col}, ${row}], ${cliff} cliff, x ${x}, side row ${y - cy - 8}`;
          assert.equal(joint, face, `${where}: the joint paints ${joint}, the ${cliff} face's corner paints ${face}`);
        }
        assert.equal(shown.get(`${own},${cy + 23}`), resolve(sources, item.object).block.faces[cliff], `${item.object} at [${col}, ${row}]: the ${cliff} face's corner ends in the face's color`);
      }
    }
    assert.equal(joints, 8, 'four joints on each cliff of the mining section\'s front corner');
  });

  it('closeup-office shows the house, the road and the river bridge with its rail, and no truck', () => {
    const names = sources.scenes.get('closeup-office').items.map((item) => item.object);
    for (const name of ['house', 'path', 'bridge', 'bridge-rail']) assert.ok(names.includes(name), `closeup-office shows ${name}`);
    assert.ok(!names.some((n) => n.startsWith('truck')), 'the trucks are the motion\'s, not the close-up\'s');
  });
});
