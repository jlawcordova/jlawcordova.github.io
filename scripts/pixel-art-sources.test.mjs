// Tests of this site's own art sources, with the engine from Pixel Lab
// (art-to-Pixel-Lab spec R6): the library, the security and governance
// outfit and the palette, moved here from the engine's test when the engine
// moved to the lab, plus the document's manifest staying in step with the
// theme tokens. Node built-ins only.

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { loadSources, paintedSize, resolve, usedKeys, validate } from 'pixellab/engine';

const DOC = new URL('../src/assets/pixel-art/jlawcordova.pixellab/', import.meta.url);

describe('the document (art-to-Pixel-Lab spec R1)', () => {
  it("R1: the manifest's preview and theme colors are the theme tokens", async () => {
    const manifest = JSON.parse(await readFile(new URL('manifest.json', DOC), 'utf8'));
    const css = await readFile(new URL('../src/styles/variables.css', import.meta.url), 'utf8');
    const card = /--color-card:\s*(#[0-9A-Fa-f]{6});/.exec(css)?.[1];
    const grid = /--color-grid:\s*(rgba\([^)]*\));/.exec(css)?.[1];
    const dark = css.indexOf('[data-theme="dark"]');
    const darkPage = /--color-page:\s*(#[0-9A-Fa-f]{6})\b/.exec(css.slice(dark))?.[1];
    assert.equal(manifest.preview.card, card, '--color-card');
    assert.equal(manifest.preview.grid, grid, '--color-grid');
    assert.equal(manifest.theme.darkPage, darkPage?.toUpperCase(), 'the dark --color-page');
    assert.equal(manifest.name, 'jlawcordova');
  });
});

describe('library (R13, R31)', () => {
  const dir = DOC;
  const committed = async () => {
    const read = async (sub) => {
      const out = {};
      for (const file of (await readdir(new URL(`${sub}/`, dir))).filter((f) => f.endsWith('.mjs'))) {
        out[file.slice(0, -4)] = (await import(new URL(`${sub}/${file}`, dir).href)).default;
      }
      return out;
    };
    return loadSources({ palette: (await import(new URL('palette.mjs', dir).href)).default, objects: await read('objects'), scenes: await read('scenes') });
  };

  it('retire legacy R1, R2, R3: no committed source has a legacy tier, flag or color', async () => {
    const sources = await committed();
    assert.deepEqual(Object.keys(sources.palette), ['world', 'outfit']);
    const legacy = /^c-[0-9a-f]{6}$/;
    for (const [name, obj] of sources.objects) {
      assert.ok(!('legacy' in obj), `${name} sets legacy`);
      const colors = [...Object.values(obj.keys ?? {}), ...Object.values(obj.faces ?? {}), ...Object.values(obj.surface?.keys ?? {}), ...Object.values(obj.sides?.keys ?? {})];
      for (const color of colors) assert.doesNotMatch(color, legacy, `${name} names ${color}`);
    }
  });

  it('R13: the library has a block, a flat tile, a water block with a frame loop and a tree, in world colors only', async () => {
    const sources = await committed();
    assert.deepEqual(validate(sources), []);
    for (const name of ['block', 'tile', 'water', 'tree']) {
      const resolved = resolve(sources, name);
      for (const color of [...Object.values(resolved.block?.faces ?? {}), ...usedKeys(resolved).map((k) => resolved.keys[k])]) {
        assert.equal(sources.colors.get(color).tier, 'world', `${name} uses ${color}`);
      }
    }
    assert.equal(sources.objects.get('block').size.join(), '1,1,1');
    assert.equal(sources.objects.get('tile').size.join(), '1,1,0');
    assert.equal(sources.objects.get('tree').kind, 'sprite');
    const water = sources.objects.get('water');
    assert.equal(`${water.surface.loop} ${water.surface.prefix}`, 'wf w');
    assert.equal(water.surface.frames.length, 5);
    const [w, h] = (({ width, height }) => [width, height])(resolve(sources, 'tree'));
    assert.ok(w <= 64 && h <= 64, 'the tree fits 64×64');
  });

  it('R28: every library block is lit top light, left mid, right shadow', async () => {
    const sources = await committed();
    const lum = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    let checked = 0;
    for (const [name, obj] of sources.objects) {
      if (obj.kind !== 'block' || !obj.faces.left) continue;
      const [t, l, r] = ['top', 'left', 'right'].map((f) => lum(sources.colors.get(obj.faces[f]).hex));
      assert.ok(t > l && l > r, `${name}: top ${t.toFixed(3)} > left ${l.toFixed(3)} > right ${r.toFixed(3)}`);
      checked++;
    }
    assert.ok(checked >= 1, 'at least one block with sides is checked');
  });

  it('R13: library-demo is a 3×3 island that places every library object', async () => {
    const sources = await committed();
    const demo = sources.scenes.get('library-demo');
    assert.equal(demo.output, undefined, 'a preview-only scene');
    const items = demo.items.filter((i) => i.object);
    assert.deepEqual([...new Set(items.map((i) => i.object))].sort(), ['block', 'bridge', 'flower', 'path', 'pebble', 'tile', 'tree', 'water']);
    assert.ok(items.every((i) => i.at.tile.slice(0, 2).every((n) => n >= 0 && n <= 2)), 'every item sits within a 3×3 grid');
  });
});

describe('security and governance outfit (R14, Q6)', () => {
  const dir = DOC;
  const committed = async () => {
    const read = async (sub) => {
      const out = {};
      for (const file of (await readdir(new URL(`${sub}/`, dir))).filter((f) => f.endsWith('.mjs'))) {
        out[file.slice(0, -4)] = (await import(new URL(`${sub}/${file}`, dir).href)).default;
      }
      return out;
    };
    return loadSources({ palette: (await import(new URL('palette.mjs', dir).href)).default, objects: await read('objects'), scenes: await read('scenes') });
  };
  const NAME = 'outfit-security-governance';

  it('R14: the outfit validates and extends character', async () => {
    const sources = await committed();
    assert.deepEqual(validate(sources), []);
    const outfit = sources.objects.get(NAME);
    assert.equal(outfit.extends, 'character');
  });

  it('R27: the figure stays within 24×32', async () => {
    const sources = await committed();
    const [w, h] = paintedSize(resolve(sources, NAME));
    assert.ok(w <= 24 && h <= 32, `the figure is ${w}×${h}`);
  });

  it('Q6: it uses world colors plus at most 4 outfit colors', async () => {
    const sources = await committed();
    const resolved = resolve(sources, NAME);
    const tiers = [...new Set(usedKeys(resolved).map((k) => resolved.keys[k]))].map((c) => sources.colors.get(c).tier);
    assert.ok(tiers.every((t) => t === 'world' || t === 'outfit'), 'world and outfit colors only');
    assert.ok(tiers.filter((t) => t === 'outfit').length <= 4, 'at most 4 outfit colors');
    const { outfit } = (await import(new URL('palette.mjs', DOC).href)).default;
    assert.ok(Object.keys(outfit).length <= 16, 'the outfit tier has at most 16 colors');
  });

  it('R14: it is in range-sprite (Range class characters R1), and outfit-preview shows every outfit', async () => {
    const sources = await committed();
    const placed = (name) => JSON.stringify(sources.scenes.get(name).items);
    assert.ok(placed('range-sprite').includes(NAME), 'in the carousel');
    assert.equal(sources.scenes.get('range-sprite').output, 'range-sprite.svg');
    const preview = sources.scenes.get('outfit-preview');
    assert.equal(preview.output, undefined, 'a preview-only scene');
    const outfits = preview.items.filter((i) => i.object?.startsWith('outfit-')).map((i) => i.object).sort();
    assert.deepEqual(outfits, [...sources.objects.keys()].filter((n) => n.startsWith('outfit-')).sort());
    assert.equal(outfits.length, 7);
  });
});

describe('palette (R6, R26)', () => {
  const palette = async () => (await import(new URL('palette.mjs', DOC).href)).default;

  it('R6: brand entries match their variables.css tokens', async () => {
    const css = await readFile(new URL('../src/styles/variables.css', import.meta.url), 'utf8');
    const token = (name) => new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6});`).exec(css)?.[1].toUpperCase();
    const { world } = await palette();
    const brand = { ink: 'color-ink', cream: 'color-page', 'gold-2': 'color-gold', 'soil-3': 'color-earth' };
    for (const [name, tokenName] of Object.entries(brand)) {
      assert.ok(token(tokenName), `--${tokenName} is in variables.css`);
      assert.equal(world[name], token(tokenName), `${name} matches --${tokenName}`);
    }
  });

  it('R26: the committed palette validates: caps, uppercase hex, unique names', async () => {
    assert.deepEqual(validate(loadSources({ palette: await palette() })), []);
  });

  it('R31: the world tier is seven complete 4-shade ramps, from highlight to shadow, plus ink, cream and two skin tones', async () => {
    const { world } = await palette();
    const luminance = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const materials = ['grass', 'soil', 'wood', 'path', 'water', 'roof', 'gold'];
    const ramps = materials.flatMap((m) => [1, 2, 3, 4].map((n) => `${m}-${n}`));
    assert.deepEqual(Object.keys(world), [...ramps, 'ink', 'cream', 'skin-1', 'skin-2'], 'in ramp order, then the singles');
    assert.equal(Object.keys(world).length, 32);
    for (const m of materials) {
      const shades = [1, 2, 3, 4].map((n) => luminance(world[`${m}-${n}`]));
      assert.ok(shades.every((l, i) => i === 0 || l < shades[i - 1]), `${m}: shade 1 is the lightest and 4 the darkest`);
    }
    assert.equal(new Set(Object.values(world)).size, 32, 'no two world colors share a value');
  });
});

