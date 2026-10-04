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

import { resolve } from '../src/lib/pixel-art/engine.mjs';
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
