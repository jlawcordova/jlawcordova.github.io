// Checks for the blog's pixel-art thumbnails: each post's featured image is a
// PNG in static/public/thumbnails/, 1200×630, and no two posts share one. The
// thirteen there were drawn on the old 32×16 grid and published by Pixel Lab
// v0.10.0, the last program that could draw them; they're kept as published.

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const POSTS = new URL('../src/content/posts/', import.meta.url);
const THUMBNAILS = new URL('../static/public/thumbnails/', import.meta.url);

test('every post has exactly one thumbnail: a 1200×630 PNG that is there', async () => {
  const posts = (await readdir(POSTS)).filter((f) => f.endsWith('.md'));
  const files = (await readdir(THUMBNAILS)).filter((f) => f.endsWith('.png'));
  const used = [];
  for (const post of posts) {
    const text = await readFile(new URL(post, POSTS), 'utf8');
    const key = /^featured-image: \/public\/thumbnails\/([a-z0-9-]+)\.png$/m.exec(text)?.[1];
    assert.ok(key, `${post}'s featured image is a /public/thumbnails/<key>.png`);
    assert.ok(files.includes(`${key}.png`), `${post}: ${key}.png is in static/public/thumbnails/`);
    used.push(key);
  }
  assert.equal(new Set(used).size, used.length, 'no two posts share a thumbnail');
  assert.deepEqual(used.map((key) => `${key}.png`).sort(), files.sort(), "every thumbnail is a post's");
  for (const file of files) {
    const png = await readFile(new URL(file, THUMBNAILS));
    assert.equal(png.toString('latin1', 1, 4), 'PNG', `${file} is a PNG`);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630], `${file} is 1200×630`);
  }
});
