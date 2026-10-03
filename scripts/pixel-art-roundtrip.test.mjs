// Round-trip and staleness tests for the committed pixel art (pixel-art
// engine spec D7, D8, R8–R12): the sources compile to the same art as the
// extracted fixtures, every source is in canonical form, and the committed
// SVGs are what the sources compile to. Node built-ins only.

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { loadSources, renderScene, resolve, validate } from '../src/lib/pixel-art/engine.mjs';
import { serialize } from '../src/lib/pixel-art/serialize.mjs';
import { toRectSvg } from '../src/lib/pixel-art/svg.mjs';
import { attr, compileScene, isRectGroup, parse, readSources, rectPixels } from './optimize-pixel-art.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ART_DIR = join(ROOT, 'src/assets/pixel-art');
const SOURCE_DIR = join(ART_DIR, 'source');
const FIXTURES = join(ROOT, 'scripts/fixtures/pixel-art');

const { sources, loadErrors } = await readSources(SOURCE_DIR);
const rects = (name) => toRectSvg(renderScene(sources, name), (color) => sources.colors.get(color).hex);

/**
 * The art's structure: groups with their attributes, and layers (runs of
 * <g fill>), each as a map of fill → pixels, plus how many pixels its fill
 * groups paint in total (to catch overlaps).
 */
function structure(svg) {
  const walk = (el) => {
    const out = [];
    let layer = null;
    for (const child of el.children) {
      if (child.text !== undefined) continue;
      if (isRectGroup(child)) {
        if (!layer) out.push((layer = { fills: new Map(), painted: 0, top: new Map() }));
        const pixels = rectPixels(child.children);
        const fill = attr(child, 'fill');
        layer.fills.set(fill, new Set([...(layer.fills.get(fill) ?? []), ...pixels]));
        layer.painted += pixels.size;
        for (const p of pixels) layer.top.set(p, fill);
        continue;
      }
      layer = null;
      out.push({ attrs: child.attrs.map(([k, v]) => `${k}="${v}"`).join(' '), children: walk(child) });
    }
    return out;
  };
  return walk(parse(svg).find((n) => n.name === 'svg'));
}

/** Asserts the same groups in the same order, and the same pixels per fill in every layer. */
function assertSameLayers(actual, expected, path = 'svg') {
  assert.equal(actual.length, expected.length, `${path}: ${actual.length} children, expected ${expected.length}`);
  expected.forEach((want, i) => {
    const got = actual[i];
    const at = `${path} > ${want.attrs !== undefined ? `g ${want.attrs}` : `layer ${i}`}`;
    if (want.attrs !== undefined) {
      assert.equal(got.attrs, want.attrs, `${at}: group attributes`);
      return assertSameLayers(got.children, want.children, at);
    }
    assert.ok(got.fills, `${at}: expected a layer`);
    assert.deepEqual([...got.fills.keys()].sort(), [...want.fills.keys()].sort(), `${at}: fills`);
    for (const [fill, pixels] of want.fills) {
      const mine = got.fills.get(fill);
      const missing = [...pixels].filter((p) => !mine.has(p));
      const extra = [...mine].filter((p) => !pixels.has(p));
      assert.deepEqual({ missing, extra }, { missing: [], extra: [] }, `${at}: fill ${fill}`);
    }
  });
}

/**
 * Asserts the same groups in the same order, and the same visible image in
 * every layer: the top-most fill at each pixel, where later paint wins (R11,
 * concern A1).
 */
function assertSameVisible(actual, expected, path = 'svg') {
  assert.equal(actual.length, expected.length, `${path}: ${actual.length} children, expected ${expected.length}`);
  expected.forEach((want, i) => {
    const got = actual[i];
    const at = `${path} > ${want.attrs !== undefined ? `g ${want.attrs}` : `layer ${i}`}`;
    if (want.attrs !== undefined) {
      assert.equal(got.attrs, want.attrs, `${at}: group attributes`);
      return assertSameVisible(got.children, want.children, at);
    }
    assert.ok(got.top, `${at}: expected a layer`);
    const differ = [...new Set([...want.top.keys(), ...got.top.keys()])].filter((p) => want.top.get(p) !== got.top.get(p));
    const first = differ.slice(0, 3).map((p) => `${p}: fixture ${want.top.get(p) ?? 'none'}, compiled ${got.top.get(p) ?? 'none'}`);
    assert.deepEqual(first, [], `${at}: ${differ.length} pixel(s) differ`);
  });
}

/** Fill groups in a layer that don't overlap can be drawn in any order with the same result. */
function assertNoOverlaps(layers, path = 'svg') {
  for (const item of layers) {
    if (item.attrs !== undefined) assertNoOverlaps(item.children, `${path} > g ${item.attrs}`);
    else {
      const distinct = new Set([...item.fills.values()].flatMap((s) => [...s])).size;
      assert.equal(item.painted, distinct, `${path}: a layer paints ${item.painted - distinct} pixel(s) twice`);
    }
  }
}

describe('committed sources', () => {
  it('R1, R3: every object and scene loads and validates', () => {
    assert.deepEqual(loadErrors, []);
    assert.deepEqual(validate(sources), []);
  });

  it('R9: every committed source is in canonical form', async () => {
    for (const sub of ['objects', 'scenes']) {
      for (const file of (await readdir(join(SOURCE_DIR, sub))).filter((f) => f.endsWith('.mjs'))) {
        const path = join(SOURCE_DIR, sub, file);
        const text = await readFile(path, 'utf8');
        const data = (await import(pathToFileURL(path).href)).default;
        assert.equal(serialize(data), text, `${sub}/${file} is not canonical; re-save it with serialize()`);
      }
    }
  });

  it('R2: each Range class places one outfit, its own object extending character', () => {
    const groups = sources.scenes.get('range-sprite').items.filter((i) => i.group);
    for (const group of groups) {
      const outfits = group.items.map((i) => i.object).filter((name) => sources.objects.get(name)?.extends === 'character');
      assert.equal(outfits.length, 1, `data-class ${group.group['data-class']} places one outfit`);
      assert.match(outfits[0], /^outfit-/);
      assert.equal(resolve(sources, outfits[0]).character, true);
    }
    assert.equal(new Set(groups.map((g) => g.items.find((i) => i.object.startsWith('outfit-')).object)).size, groups.length, 'no outfit is placed twice');
  });

  it('R12: the extracted SVGs are test fixtures, and npm run art reads no .src.svg', async () => {
    assert.ok(existsSync(join(FIXTURES, 'range-sprite.src.svg')));
    assert.ok(existsSync(join(FIXTURES, 'hero-island.src.svg')));
    assert.deepEqual((await readdir(SOURCE_DIR)).filter((f) => f.endsWith('.svg')), []);
    assert.doesNotMatch(await readFile(join(ROOT, 'scripts/optimize-pixel-art.mjs'), 'utf8'), /\.src\.svg/);
  });
});

describe('pixel-art skill (R32)', () => {
  it('R32: the skill\'s examples are canonical and compile against today\'s sources', async () => {
    const skill = await readFile(join(ROOT, '.claude/skills/pixel-art/SKILL.md'), 'utf8');
    const blocks = [...skill.matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1]);
    assert.equal(blocks.length, 4, 'an object, a block, an outfit and a scene');
    const [rock, stone, outfit, scene] = await Promise.all(
      blocks.map(async (text) => {
        const data = (await import(`data:text/javascript,${encodeURIComponent(text)}`)).default;
        assert.equal(serialize(data), text, 'the example is in canonical form');
        return data;
      }),
    );
    const palette = sources.palette;
    const objects = Object.fromEntries(sources.objects);
    const withExamples = loadSources({
      palette,
      objects: { ...objects, 'small-rock': rock, 'stone-block': stone, 'outfit-example': outfit },
      scenes: { example: scene },
    });
    assert.deepEqual(validate(withExamples), []);
    assert.ok(compileScene(withExamples, 'example').output.includes('class="pcloud pc0"'));
  });
});

// The Range sprite's R10 round trip was retired by the Range class
// characters change (its spec C1): its art changes on purpose. Its fixture
// stays, as input for R12 and the import tests.

describe('hero island round trip (R11)', () => {
  it('R11: the fixture\'s 1,492 repainted pixels are between its two static layers, not inside one', async () => {
    const fixture = structure(await readFile(join(FIXTURES, 'hero-island.src.svg'), 'utf8'));
    assertNoOverlaps(fixture);
    const [back, front] = fixture.filter((l) => l.fills);
    assert.equal([...front.top.keys()].filter((p) => back.top.has(p)).length, 1492);
  });

  it('R11: hero island matches its fixture\'s visible image, with the same groups in the same order', async () => {
    const fixture = structure(await readFile(join(FIXTURES, 'hero-island.src.svg'), 'utf8'));
    const compiled = structure(rects('hero-island'));
    assertNoOverlaps(compiled);
    assertSameVisible(compiled, fixture);
  });

  it('R11: as no layer hides pixels, every fill group of every layer matches too', async () => {
    const fixture = structure(await readFile(join(FIXTURES, 'hero-island.src.svg'), 'utf8'));
    assertSameLayers(structure(rects('hero-island')), fixture);
  });

  it('R11: the same viewBox and root attributes as the fixture', async () => {
    const open = (svg) => /^<svg[^>]*>/.exec(svg)[0];
    assert.equal(open(rects('hero-island')), open(await readFile(join(FIXTURES, 'hero-island.src.svg'), 'utf8')));
  });

  it('R11: the animated pieces are their own objects, and island-base is one legacy map', () => {
    const loops = { waterfall: ['wf', 'w', 5], flag: ['ff', 'f', 4], hearth: ['hf', 'h', 6] };
    for (const [name, [loop, prefix, frames]] of Object.entries(loops)) {
      const layer = sources.objects.get(name).layers[0];
      assert.deepEqual([layer.loop, layer.prefix, layer.frames.length], [loop, prefix, frames], name);
    }
    const base = resolve(sources, 'island-base');
    assert.equal(base.legacy, true);
    assert.ok(base.width <= 225 && base.height <= 212);
  });
});

describe('determinism and staleness (R8)', () => {
  it('R8: compiling twice gives identical bytes', async () => {
    const again = await readSources(SOURCE_DIR);
    for (const name of sources.scenes.keys()) {
      assert.equal(compileScene(again.sources, name).output, compileScene(sources, name).output, name);
    }
  });

  it('R8: every committed SVG is what its scene compiles to (run npm run art if not)', async () => {
    const outputs = [...sources.scenes].filter(([, s]) => s.output);
    assert.ok(outputs.length > 0);
    for (const [name, scene] of outputs) {
      const committed = await readFile(join(ART_DIR, scene.output), 'utf8');
      assert.ok(committed === compileScene(sources, name).output, `${scene.output} is stale against scenes/${name}.mjs; run npm run art`);
    }
  });
});
