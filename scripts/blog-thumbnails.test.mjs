// Checks for the blog's pixel-art thumbnails (scripts/blog-thumbnails.mjs):
// every post has one, each is a preview-only thumb-<key> scene of the right
// size, and every committed PNG is what its scene renders.

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { inflateSync } from 'node:zlib';

import { HEIGHT, THUMBNAILS, WIDTH, fileFor, loadDocument, renderThumbnail, sceneFor, urlFor } from './blog-thumbnails.mjs';

const POSTS = new URL('../src/content/posts/', import.meta.url);
const doc = await loadDocument();

/** A PNG's pixels: its size and its IDAT stream, inflated. */
function pixels(/** @type {Buffer} */ png) {
  const idat = [];
  let width = 0;
  let height = 0;
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    const type = png.toString('latin1', at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') [width, height] = [data.readUInt32BE(0), data.readUInt32BE(4)];
    if (type === 'IDAT') idat.push(data);
    at += 12 + length;
  }
  return { width, height, raw: inflateSync(Buffer.concat(idat)) };
}

test('every post has exactly one thumbnail, and its featured image is that thumbnail', async () => {
  const posts = (await readdir(POSTS)).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();
  assert.deepEqual(THUMBNAILS.map((t) => t.post).sort(), posts);
  assert.equal(new Set(THUMBNAILS.map((t) => t.key)).size, THUMBNAILS.length, 'keys are unique');
  for (const { post, key } of THUMBNAILS) {
    const text = await readFile(new URL(`${post}.md`, POSTS), 'utf8');
    assert.match(text, new RegExp(`^featured-image: ${urlFor(key).replaceAll('.', '\\.')}$`, 'm'), `${post} uses ${urlFor(key)}`);
  }
});

test('every thumbnail is a preview-only thumb-<key> scene with a 240×126 viewBox', () => {
  const thumbs = [...doc.sources.scenes.keys()].filter((name) => name.startsWith('thumb-')).sort();
  assert.deepEqual(thumbs, THUMBNAILS.map((t) => sceneFor(t.key)).sort(), 'one scene per thumbnail, and no others');
  for (const name of thumbs) {
    const scene = doc.sources.scenes.get(name);
    assert.equal(scene.output, undefined, `${name} writes no SVG`);
    assert.deepEqual(scene.viewBox.slice(2), [WIDTH, HEIGHT], `${name}'s viewBox`);
  }
});

test('every committed thumbnail PNG is what its scene renders (run npm run thumbnails if not)', async () => {
  for (const { key } of THUMBNAILS) {
    assert.ok(existsSync(fileFor(key)), `static${urlFor(key)} exists`);
    const committed = pixels(await readFile(fileFor(key)));
    const fresh = pixels(renderThumbnail(doc, key));
    assert.deepEqual([committed.width, committed.height], [1200, 630]);
    assert.ok(committed.raw.equals(fresh.raw), `static${urlFor(key)} is stale against scenes/${sceneFor(key)}.mjs; run npm run thumbnails`);
  }
});
