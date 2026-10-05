// The Range scene's art stays on the island's engine (Isometric Range spec
// R1, R3, R5, R7, R8): the platform is laid from the island's blocks, nothing
// in range-sprite paints ink or is legacy, the viewBox keeps the stage's size,
// and the compiled SVG stays inside its budget. Node built-ins only.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { resolve } from '../src/lib/pixel-art/engine.mjs';
import { readSources } from './optimize-pixel-art.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SOURCE = join(ROOT, 'src/assets/pixel-art/source');

/** The objects that make the land (blocks and their shadow) and the scenery on it. */
const GROUND = ['tile', 'block', 'block-left', 'block-right', 'island-shadow'];
const SCENERY = ['tree', 'flower', 'flower-pink', 'flower-gold'];

/** Every object a scene places, outside the data-class groups, in order. */
const placedOutsideGroups = (scene) => scene.items.filter((i) => i.object).map((i) => i.object);

describe('Range art (Isometric Range spec)', () => {
  it('R1: the platform is laid from the island blocks, and the rest is the tree and flowers', async () => {
    const { sources } = await readSources(SOURCE);
    const placed = placedOutsideGroups(sources.scenes.get('range-sprite'));
    for (const name of placed) assert.ok([...GROUND, ...SCENERY].includes(name), `${name} is an island block or scenery`);
    for (const name of GROUND) assert.ok(placed.includes(name), `the platform uses ${name}`);
    assert.ok(!sources.objects.has('range-island'), 'range-island is gone');
    assert.ok(placed.filter((n) => n.startsWith('flower')).length >= 3, 'the platform has flowers');
  });

  it('R3: nothing range-sprite places paints ink, so the characters have no outline', async () => {
    const { sources } = await readSources(SOURCE);
    const names = new Set();
    const walk = (items) => items.forEach((i) => (i.group ? walk(i.items) : names.add(i.object)));
    walk(sources.scenes.get('range-sprite').items);
    assert.ok(names.has('outfit-security-governance'), 'the outfits are walked');
    for (const name of names) {
      const r = resolve(sources, name);
      const keys = { ...(r.keys ?? {}), ...(r.sides?.keys ?? {}), ...(r.surface?.keys ?? {}) };
      for (const color of Object.values(keys)) assert.notEqual(color, 'ink', `${name} paints ink`);
    }
  });

  it('R5: nothing range-sprite places is legacy', async () => {
    const { sources } = await readSources(SOURCE);
    const scene = sources.scenes.get('range-sprite');
    const names = [];
    const walk = (items) => items.forEach((i) => (i.group ? walk(i.items) : names.push(i.object)));
    walk(scene.items);
    for (const name of names) assert.equal(resolve(sources, name).legacy, false, `${name} is not legacy`);
  });

  it('R7: the viewBox keeps the stage size', async () => {
    const { sources } = await readSources(SOURCE);
    assert.deepEqual(sources.scenes.get('range-sprite').viewBox, [-51, -9, 103, 72]);
  });

  it('R8: the compiled SVG is within the engine budget', async () => {
    const svg = await readFile(join(ROOT, 'src/assets/pixel-art/range-sprite.svg'));
    assert.ok(svg.length <= 100 * 1024, `${svg.length} B raw`);
    assert.ok(gzipSync(svg).length <= 25 * 1024, 'gzip within 25 KB');
  });
});
