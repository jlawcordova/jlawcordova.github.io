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

import { loadSources, resolve, validate } from '../src/lib/pixel-art/engine.mjs';
import { serialize } from '../src/lib/pixel-art/serialize.mjs';
import { compileScene, readSources } from './optimize-pixel-art.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ART_DIR = join(ROOT, 'src/assets/pixel-art');
const SOURCE_DIR = join(ART_DIR, 'source');
const FIXTURES = join(ROOT, 'scripts/fixtures/pixel-art');

const { sources, loadErrors } = await readSources(SOURCE_DIR);

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

describe("the island's animated pieces (R11)", () => {
  it('R11: the animated pieces are their own objects', () => {
    const loops = { flag: ['ff', 'f', 4], hearth: ['hf', 'h', 6] };
    for (const [name, [loop, prefix, frames]] of Object.entries(loops)) {
      const layer = sources.objects.get(name).layers[0];
      assert.deepEqual([layer.loop, layer.prefix, layer.frames.length], [loop, prefix, frames], name);
    }
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
