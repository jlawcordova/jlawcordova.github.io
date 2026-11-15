// Pixpocket's program is optional here (scripts/pixpocket.mjs): its releases
// are private, so CI builds from the SVGs `npm run art` wrote and someone
// committed. These checks are what keeps that honest without the program:
// the committed SVGs were published from the document as it is now, every
// scene with an output has its SVG, and nothing is downloaded.

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chmod, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { DOCUMENT, RECORD, documentHash, findProgram, readRecord, versionOf } from './pixpocket.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ART = join(ROOT, 'src/assets/pixel-art');

/** A program that answers --version with `says`, in a folder of its own. */
async function fake(/** @type {string} */ says) {
  const dir = await mkdtemp(join(tmpdir(), 'pixpocket-test-'));
  const path = join(dir, 'pixpocket');
  await writeFile(path, `#!/bin/sh\necho "${says}"\n`);
  await chmod(path, 0o755);
  return { dir, path };
}

test('the committed SVGs were published from the document as it is', async () => {
  const record = await readRecord();
  assert.ok(record, `${RECORD} is there: run npm run art`);
  assert.equal(
    record.sources,
    await documentHash(),
    `${DOCUMENT} has changed since its SVGs were published: run npm run art where Pixpocket is installed, and commit what it writes`,
  );
  assert.match(record.program, /^pixpocket \S+$/, 'it names the program that published them');
});

test('every scene with an output has its SVG, named for its scene, and no other SVG is left', async () => {
  const scenes = join(ROOT, DOCUMENT, 'scenes');
  const outputs = [];
  for (const file of (await readdir(scenes)).filter((f) => f.endsWith('.json'))) {
    const scene = JSON.parse(await readFile(join(scenes, file), 'utf8'));
    if (!scene.output) continue;
    outputs.push(scene.output);
    const svg = await readFile(join(ART, scene.output), 'utf8');
    assert.match(svg, new RegExp(`^<svg [^>]*data-pixpocket="${file.slice(0, -5)}"`), `${scene.output} is ${file}'s`);
  }
  assert.ok(outputs.length > 0, 'the document publishes something');
  const svgs = (await readdir(ART)).filter((f) => f.endsWith('.svg'));
  assert.deepEqual(svgs.sort(), outputs.sort(), 'the SVGs beside the document are exactly its outputs');
});

test('the document is format 3, and every object copied from the studio is recorded', async () => {
  const manifest = JSON.parse(await readFile(join(ROOT, DOCUMENT, 'manifest.json'), 'utf8'));
  assert.equal(manifest.format, 3);
  const imported = JSON.parse(await readFile(join(ROOT, DOCUMENT, 'studio-import.json'), 'utf8')).objects;
  assert.ok(imported.length > 0);
  for (const name of imported) assert.ok(existsSync(join(ROOT, DOCUMENT, 'objects', `${name}.json`)), `${name} is in the document`);
});

test('the program is $PIXPOCKET first, and only something that says it is Pixpocket', async () => {
  const real = await fake('pixpocket 9.9.9');
  const other = await fake('something else 1.0');
  assert.equal(versionOf(real.path), 'pixpocket 9.9.9');
  assert.equal(versionOf(other.path), undefined);
  assert.equal(versionOf(join(real.dir, 'missing')), undefined);
  assert.equal(findProgram({ env: { PIXPOCKET: real.path }, root: real.dir }), real.path);
  // Not Pixpocket: it falls through to the PATH and the checkout beside this one, which may have it or not.
  assert.notEqual(findProgram({ env: { PIXPOCKET: other.path }, root: other.dir }), other.path);
});

test('nothing downloads the program: no release URL, no pinned hash, no bin folder', async () => {
  const script = await readFile(join(ROOT, 'scripts/pixpocket.mjs'), 'utf8');
  assert.doesNotMatch(script, /releases\/download|sha256:|fetch\(/);
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.art, 'node scripts/pixpocket.mjs publish');
  for (const name of ['pixpocket', 'pixellab']) {
    assert.ok(!(name in (pkg.dependencies ?? {})) && !(name in (pkg.devDependencies ?? {})), `${name} isn't an npm package`);
  }
});
