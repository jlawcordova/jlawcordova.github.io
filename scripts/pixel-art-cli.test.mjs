// Tests for `npm run art`'s command line (pixel-art engine spec D6, R38):
// --new, --check, --preview and the plain compile, each run as a process on
// a temp copy of the sources. No browser and no network.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { serialize } from '../src/lib/pixel-art/serialize.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SCRIPT = join(ROOT, 'scripts/optimize-pixel-art.mjs');
const temps = [];

after(() => Promise.all(temps.map((dir) => rm(dir, { recursive: true, force: true }))));

/** A temp folder holding a copy of source/, an empty out/, and the working directory for previews. */
async function workspace() {
  const dir = await mkdtemp(join(tmpdir(), 'pixel-art-cli-'));
  temps.push(dir);
  await cp(join(ROOT, 'src/assets/pixel-art/source'), join(dir, 'source'), { recursive: true });
  return dir;
}

/** Runs `npm run art -- <args>` against the workspace. */
function art(dir, ...args) {
  const r = spawnSync(process.execPath, [SCRIPT, '--source', join(dir, 'source'), '--out', join(dir, 'out'), ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const load = async (path) => (await import(`${pathToFileURL(path).href}?t=${Date.now()}`)).default;

describe('npm run art (R38)', () => {
  it('R38: plain run compiles every scene and writes the outputs', async () => {
    const dir = await workspace();
    const { code, out } = art(dir);
    assert.equal(code, 0, out);
    assert.match(out, /^range-sprite\.svg: [\d.]+ KB \/ [\d.]+ KB gzip → [\d.]+ KB \/ [\d.]+ KB gzip, lossless$/m);
    assert.equal(await readFile(join(dir, 'out/range-sprite.svg'), 'utf8'), await readFile(join(ROOT, 'src/assets/pixel-art/range-sprite.svg'), 'utf8'));
  });

  it('R38: plain run writes nothing and exits 1 when any source has a problem', async () => {
    const dir = await workspace();
    const path = join(dir, 'source/objects/range-island.mjs');
    const text = await readFile(path, 'utf8');
    const broken = text.replace(/(map: \[\n\s+')./, '$1');
    assert.notEqual(broken, text);
    await writeFile(path, broken);
    const { code, err } = art(dir);
    assert.equal(code, 1);
    assert.match(err, /^objects\/range-island\.mjs: layer 0, row 0: 98 wide, expected 99$/m);
    assert.match(err, /^1 problem; nothing written\.$/m);
    assert.ok(!existsSync(join(dir, 'out')));
  });

  it('R38: a source that does not load is reported with its file', async () => {
    const dir = await workspace();
    await writeFile(join(dir, 'source/objects/broken.mjs'), 'export default {');
    const { code, err } = art(dir, '--check', 'range-island');
    assert.equal(code, 0, 'a check of another object is not blocked');
    const all = art(dir);
    assert.equal(all.code, 1);
    assert.match(all.err, /^objects\/broken\.mjs: cannot be loaded: /m, err);
  });
});

describe('--check (R38)', () => {
  it('R38: prints a one-line summary for a valid object and exits 0', async () => {
    const dir = await workspace();
    const { code, out } = art(dir, '--check', 'outfit-front-end');
    assert.equal(code, 0);
    assert.equal(out, 'objects/outfit-front-end.mjs: ok · 32×35 · 15 colors (legacy, no cap) · 2 layers · 1 frame\n');
  });

  it('R38: prints a one-line summary for a valid scene', async () => {
    const dir = await workspace();
    const { code, out } = art(dir, '--check', 'scenes/range-sprite');
    assert.equal(code, 0);
    assert.equal(out, 'scenes/range-sprite.mjs: ok · 103×72 · 6 items · 7 objects · output range-sprite.svg\n');
  });

  it('R38: prints every problem with file, place and rule, and exits 1', async () => {
    const dir = await workspace();
    const { code, out } = art(dir, '--new', 'object', 'rock', '--size', '4x2');
    assert.equal(code, 0, out);
    const path = join(dir, 'source/objects/rock.mjs');
    await writeFile(path, (await readFile(path, 'utf8')).replace("'....',\n        '....',", "'.oz.',\n        '...',"));
    const check = art(dir, '--check', 'rock');
    assert.equal(check.code, 1);
    assert.equal(
      check.err,
      "objects/rock.mjs: layer 0, row 0, column 2: key 'z' is not in keys\n" +
        'objects/rock.mjs: layer 0, row 1: 3 wide, expected 4\n' +
        '2 problems; nothing written.\n',
    );
  });

  it('R38: a check covers what the target uses, and only that', async () => {
    const dir = await workspace();
    const path = join(dir, 'source/objects/character.mjs');
    await writeFile(path, (await readFile(path, 'utf8')).replace("a: 'ink'", "a: 'no-such-color'"));
    assert.equal(art(dir, '--check', 'outfit-ux-design').code, 1, 'an outfit is checked with its base');
    assert.equal(art(dir, '--check', 'range-sprite').code, 1, 'a scene is checked with its objects');
    assert.equal(art(dir, '--check', 'range-island').code, 0, 'an unrelated object is not');
  });

  it('R38: --check and --preview report a source that does not load, by its file', async () => {
    const dir = await workspace();
    const path = join(dir, 'source/objects/range-island.mjs');
    await writeFile(path, `${await readFile(path, 'utf8')}export default {`);
    for (const args of [['--check', 'range-island'], ['--check', 'objects/range-island'], ['--preview', 'range-island'], ['--check', 'range-sprite']]) {
      const { code, err } = art(dir, ...args);
      assert.equal(code, 1, args.join(' '));
      assert.match(err, /^objects\/range-island\.mjs: cannot be loaded: /m, args.join(' '));
      assert.doesNotMatch(err, /no object or scene named/, args.join(' '));
    }
    assert.ok(!existsSync(join(dir, '.art-preview')));
    assert.equal(art(dir, '--check', 'outfit-front-end').code, 0, 'an object that does not use it still checks');
  });

  it('R38: an unknown name exits 1', async () => {
    const dir = await workspace();
    const { code, err } = art(dir, '--check', 'nope');
    assert.equal(code, 1);
    assert.equal(err, 'no object or scene named nope\n');
  });
});

describe('--new (R38)', () => {
  it('R38: --new object writes a canonical starter sprite that validates', async () => {
    const dir = await workspace();
    const { code, out } = art(dir, '--new', 'object', 'small-rock', '--size', '8x6');
    assert.equal(code, 0, out);
    assert.match(out, /objects\/small-rock\.mjs: ok · 8×6 · 0 colors \(of 12\) · 1 layer · 1 frame/);
    const path = join(dir, 'source/objects/small-rock.mjs');
    const text = await readFile(path, 'utf8');
    assert.equal(serialize(await load(path)), text);
    assert.deepEqual(await load(path), { kind: 'sprite', anchor: [4, 5], keys: { o: 'ink' }, layers: [{ map: Array(6).fill('........') }] });
  });

  it('R38: --new object --extends character writes an outfit that validates, re-keying legacy colors', async () => {
    const dir = await workspace();
    const { code, out, err } = art(dir, '--new', 'object', 'outfit-test', '--extends', 'character');
    assert.equal(code, 0, out + err);
    const obj = await load(join(dir, 'source/objects/outfit-test.mjs'));
    assert.equal(obj.extends, 'character');
    assert.deepEqual(obj.rows, {});
    const palette = await load(join(dir, 'source/palette.mjs'));
    for (const color of Object.values(obj.keys)) assert.ok(color in palette.world || color in palette.outfit, `${color} is a world or outfit color`);
  });

  it('R38: --new object --kind block writes a canonical starter block that validates', async () => {
    const dir = await workspace();
    const { code, out } = art(dir, '--new', 'object', 'stone', '--kind', 'block');
    assert.equal(code, 0, out);
    assert.match(out, /objects\/stone\.mjs: ok · block 1×1×1 · 30×32 · 3 colors \(of 12\) · 1 frame/);
    const path = join(dir, 'source/objects/stone.mjs');
    assert.equal(serialize(await load(path)), await readFile(path, 'utf8'));
    assert.deepEqual(await load(path), { kind: 'block', size: [1, 1, 1], faces: { top: 'grass-2', left: 'soil-2', right: 'soil-3' } });
  });

  it('R38: --new scene writes a preview-only scene that validates', async () => {
    const dir = await workspace();
    const { code, out } = art(dir, '--new', 'scene', 'rock-demo');
    assert.equal(code, 0, out);
    const path = join(dir, 'source/scenes/rock-demo.mjs');
    assert.equal(serialize(await load(path)), await readFile(path, 'utf8'));
    assert.equal((await load(path)).output, undefined);
    assert.match(art(dir).out, /^rock-demo \(preview only, not written\): /m);
  });

  it('R38: --new refuses to overwrite, and refuses bad names, kinds and sizes', async () => {
    const dir = await workspace();
    const before = await readFile(join(dir, 'source/objects/character.mjs'), 'utf8');
    const cases = [
      [['--new', 'object', 'character'], 'objects/character.mjs already exists; edit it, or pick another name\n'],
      [['--new', 'object', 'Big_Rock'], '--new object: name "Big_Rock" must be lowercase kebab-case, like small-rock\n'],
      [['--new', 'object', 'a'.repeat(65)], '--new object: name is 65 characters long, max 64\n'],
      [['--new', 'object', 'rock', '--kind', 'slope'], "--kind slope isn't supported; use sprite or block\n"],
      [['--new', 'object', 'rock', '--kind', 'block', '--size', '4x4'], "--kind block doesn't take --size or --extends; a block's size is in its file, in tiles and levels\n"],
      [['--new', 'object', 'rock', '--size', '65x2'], '--size 65x2: give WxH, each from 1 to 64\n'],
      [['--new', 'thing', 'rock'], '--new takes object or scene, then a name\n'],
    ];
    for (const [args, message] of cases) {
      const { code, err } = art(dir, ...args);
      assert.equal(code, 1, args.join(' '));
      assert.equal(err, message, args.join(' '));
    }
    assert.equal(await readFile(join(dir, 'source/objects/character.mjs'), 'utf8'), before);
    assert.deepEqual((await readdir(join(dir, 'source/objects'))).filter((f) => f.startsWith('rock')), []);
  });
});

describe('--preview (R29, R38)', () => {
  it('R29: writes four PNGs, at 1× to 4×, to .art-preview/', async () => {
    const dir = await workspace();
    const { code, out } = art(dir, '--preview', 'outfit-front-end');
    assert.equal(code, 0, out);
    const files = (await readdir(join(dir, '.art-preview'))).sort();
    assert.deepEqual(files, ['outfit-front-end@1x.png', 'outfit-front-end@2x.png', 'outfit-front-end@3x.png', 'outfit-front-end@4x.png']);
    const size = async (f) => {
      const buf = await readFile(join(dir, '.art-preview', f));
      return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    };
    const [w, h] = await size('outfit-front-end@1x.png');
    assert.deepEqual(await size('outfit-front-end@3x.png'), [w * 3, h * 3]);
  });

  it('R29: a scene previews at its viewBox', async () => {
    const dir = await workspace();
    assert.equal(art(dir, '--preview', 'range-sprite').code, 0);
    const buf = await readFile(join(dir, '.art-preview/range-sprite@2x.png'));
    assert.deepEqual([buf.readUInt32BE(16), buf.readUInt32BE(20)], [206, 144]);
  });

  it('R31: --preview palette writes the world palette\'s swatch sheet, four shades across and a row per material', async () => {
    const dir = await workspace();
    const { code, out } = art(dir, '--preview', 'palette');
    assert.equal(code, 0, out);
    assert.deepEqual((await readdir(join(dir, '.art-preview'))).sort(), ['palette@1x.png', 'palette@2x.png', 'palette@3x.png', 'palette@4x.png']);
    const buf = await readFile(join(dir, '.art-preview/palette@1x.png'));
    // 4 swatches of 16 across, 8 rows (7 materials, then ink, cream and the skin tones), 2-pixel gaps.
    assert.deepEqual([buf.readUInt32BE(16), buf.readUInt32BE(20)], [2 + 4 * 18, 2 + 8 * 18]);
  });

  it('R31: a palette with problems gets no swatch sheet, and exits 1', async () => {
    const dir = await workspace();
    const path = join(dir, 'source/palette.mjs');
    await writeFile(path, (await readFile(path, 'utf8')).replace("'#B5C79C'", "'#b5c79c'"));
    const { code, err } = art(dir, '--preview', 'palette');
    assert.equal(code, 1);
    assert.match(err, /^palette\.mjs: world 'grass-1': '#b5c79c' must be uppercase #RRGGBB, with no alpha$/m);
    assert.ok(!existsSync(join(dir, '.art-preview')));
  });

  it('R29: an object with problems gets no preview, and exits 1', async () => {
    const dir = await workspace();
    const path = join(dir, 'source/objects/range-island.mjs');
    await writeFile(path, (await readFile(path, 'utf8')).replace("legacy: true,\n", ''));
    const { code, err } = art(dir, '--preview', 'range-island');
    assert.equal(code, 1);
    assert.match(err, /is a legacy color; only imported art may use it/);
    assert.ok(!existsSync(join(dir, '.art-preview')));
  });
});
