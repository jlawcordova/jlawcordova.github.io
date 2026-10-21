// Tests of the explainer asset library, the Pixel Lab document in
// art/explainer-library.pixellab/ (explainer library spec R2–R7): it
// validates, its sources are canonical, its palette is the site's, and every
// asset in the spec's list exists with its loop. Node built-ins, and Pixel
// Lab's program for what it reports as JSON (Pixel Lab v0.6.0 spec R17).

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { DOC, exportLibrary } from './export-explainer-library.mjs';
import { pixellab } from './pixellab.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SITE_DOC = join(ROOT, 'src/assets/pixel-art/jlawcordova.pixellab');

/** A command's JSON result, on the explainer library. */
async function json(/** @type {string[]} */ args) {
  const { stdout } = await pixellab([...args, '--document', DOC, '--json']);
  return JSON.parse(stdout);
}

const check = await json(['check']);
const objects = (await json(['object', 'list'])).objects;
const scenes = (await json(['scene', 'list'])).scenes;
/** Each object as `object show` resolves it: extends, layers with their loop and class, keys with their tier. */
const shown = new Map(await Promise.all(objects.map(async ({ name }) => [name, await json(['object', 'show', name])])));

// The spec's Asset list: every object, with the loop it plays (null: none).
// `cbob` is the character's idle bob, which every outfit inherits.
const ASSETS = {
  // Kitchen
  chef: 'cbob', waiter: 'cbob',
  'block-kitchen': null, 'tile-kitchen': null,
  stove: 'ff', sink: 'wf',
  table: null, 'table-long': null, chair: null, 'chair-turned': null, 'chair-office': null,
  'ticket-rail': null, 'kitchen-pass': null, fridge: null, 'recipe-book': null,
  plate: null, 'plate-dish': null, 'plate-stack': null,
  // Office
  'server-rack': 'hf', 'server-tower': 'hf', computer: 'ff', desk: null, 'desk-l': null, 'desk-white-oak': null, 'desk-l-white-oak': null,
  'plant-tall': null, 'plant-bush': null, 'plant-cactus': null,
  'cubicle-wall': null, 'cubicle-wall-turned': null, 'cubicle-corner': null,
  'block-office': null, 'tile-office': null, 'water-dispenser': 'hf',
  wire: 'wf', 'wire-turned': 'wf', 'wire-corner-n': null, 'wire-corner-e': null,
  'wire-corner-s': null, 'wire-corner-w': null, 'wire-junction': null, 'wire-plug': null,
  'staff-developer': 'cbob', 'staff-manager': 'cbob', 'staff-analyst': 'cbob',
  laptop: 'ff',
  cat: 'hf', 'cat-tabby': 'hf', 'cat-tuxedo': 'hf', 'cat-black': 'hf', 'cat-gray': 'hf', 'cat-white': 'hf', 'cat-calico': 'hf',
  'chart-bar': null, 'chart-line-up': null, 'chart-line-down': null, 'chart-pie': null,
  bulb: 'ff', 'bulb-off': null, whiteboard: null,
  // Cloud
  database: null, 'database-stack': null, router: 'hf', firewall: 'ff',
  'cloud-platform': null, 'cloud-platform-shadow': null, globe: 'wf', 'monitor-wall': 'wf',
  vault: null, padlock: null,
  // AI
  robot: 'cbob', 'robot-small': 'cbob',
  token: null, 'token-gold': null, 'token-water': null,
  bookshelf: null, toolbox: null, 'plug-hub': 'ff', sandbox: null, scale: 'hf', 'filing-cabinet': null,
  // Pieces that tie a scene together
  'arrow-ne': null, 'arrow-nw': null, 'arrow-se': null, 'arrow-sw': null, 'arrow-up': null,
  'data-packet': 'ff',
  'bubble-speech': null, 'bubble-thought': null, 'bubble-typing': 'ff',
  'bubble-check': null, 'bubble-question': null, 'bubble-alert': null,
  signpost: null, placard: null,
  'marker-1': null, 'marker-2': null, 'marker-3': null, 'marker-4': null, 'marker-5': null,
};

const SHEETS = ['sheet-kitchen', 'sheet-office', 'sheet-cloud', 'sheet-ai', 'sheet-glue', 'sheet-consolidated'];

describe('explainer library document', () => {
  it('R6: every source loads and validates', () => {
    assert.equal(check.ok, true);
    assert.deepEqual(check.problems, []);
  });

  it('R6: every source is in canonical form', () => {
    const notCanonical = check.warnings.filter((w) => /canonical form/.test(w.message));
    assert.deepEqual(notCanonical.map((w) => w.text), [], 're-save these with the program');
  });

  it("R2: the palette is the site's palette", async () => {
    assert.equal(await readFile(join(DOC, 'palette.json'), 'utf8'), await readFile(join(SITE_DOC, 'palette.json'), 'utf8'));
  });

  it("R1, R8: the document publishes nothing; the contact sheets are preview-only", async () => {
    const manifest = JSON.parse(await readFile(join(DOC, 'manifest.json'), 'utf8'));
    assert.equal(manifest.name, 'explainer-library');
    assert.equal(manifest.publish, undefined);
    assert.deepEqual(scenes.map((s) => s.name).sort(), [...SHEETS].sort());
    for (const scene of scenes) assert.equal(scene.output, null, `${scene.name} has an output`);
  });

  it('R4: every asset in the list exists, and nothing else but the base character', () => {
    assert.deepEqual(objects.map((o) => o.name).sort(), [...Object.keys(ASSETS), 'character'].sort());
  });

  it('R5: each asset plays the loop the list gives it, and only that', () => {
    for (const [name, loop] of Object.entries(ASSETS)) {
      const object = shown.get(name);
      const loops = object.layers.filter((l) => 'loop' in l).map((l) => l.loop);
      const bobs = object.layers.some((l) => l.class === 'cbob');
      if (loop === 'cbob') {
        assert.ok(object.character && bobs, `${name} is an outfit on character, with the idle bob`);
        assert.deepEqual(loops, [], `${name} has no frame loop`);
      } else if (loop) {
        assert.ok(loops.length > 0 && loops.every((l) => l === loop), `${name} loops ${loop}, not ${loops.join(', ') || 'nothing'}`);
      } else {
        assert.deepEqual(loops, [], `${name} is still`);
      }
    }
  });

  it('R3: the people and robots extend character; nothing else uses outfit colors', () => {
    for (const [name, object] of shown) {
      if (ASSETS[name] === 'cbob') assert.equal(object.extends, 'character', `${name} extends character`);
      if (object.character) continue;
      for (const key of object.keys) assert.equal(key.tier, 'world', `${name} uses ${key.name}`);
    }
  });

  it('R7: each contact sheet places only library objects, and every asset is on a sheet', async () => {
    const placed = new Set();
    const walk = (items) => {
      for (const item of items) {
        if (item.items) walk(item.items);
        else if (item.object) placed.add(item.object);
      }
    };
    for (const name of SHEETS) walk((await json(['scene', 'items', name])).items);
    for (const name of placed) assert.ok(name in ASSETS, `${name} is not in the asset list`);
    const missing = Object.keys(ASSETS).filter((name) => !placed.has(name));
    assert.deepEqual(missing, [], 'assets on no contact sheet');
  });
});

describe('explainer library export (R8)', () => {
  it('writes a transparent PNG per object frame and one per contact sheet, without the base character', async () => {
    const out = await mkdtemp(join(tmpdir(), 'explainer-export-'));
    try {
      const files = await exportLibrary({ out, scale: 1, only: ['cat', 'chef', 'character', 'sheet-glue'] });
      assert.deepEqual(files.map((f) => basename(f)), [
        'cat-f0.png', 'cat-f1.png', 'cat-f2.png', 'cat-f3.png', 'cat-f4.png', 'cat-f5.png', 'chef.png', 'sheet-glue.png',
      ]);
      for (const file of files) {
        const head = (await readFile(file)).subarray(0, 8);
        assert.deepEqual([...head], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${basename(file)} is a PNG`);
      }
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  });
});
