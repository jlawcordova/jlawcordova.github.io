// Checks for the blog's pixel-art thumbnails: each post's featured image is the
// PNG its preview-only thumb-<key> scene declares, which `npm run art` writes to
// static/public/thumbnails/<key>.png (Pixel Lab v0.6.0 spec R4, R19).

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const POSTS = new URL('../src/content/posts/', import.meta.url);
const SCENES = new URL('../src/assets/pixel-art/jlawcordova.pixellab/scenes/', import.meta.url);

const scenes = new Map(
  await Promise.all(
    (await readdir(SCENES))
      .filter((f) => f.startsWith('thumb-') && f.endsWith('.json'))
      .map(async (f) => [f.slice(0, -5), JSON.parse(await readFile(new URL(f, SCENES), 'utf8'))]),
  ),
);

test('every post has exactly one thumbnail, and its featured image is that thumbnail', async () => {
  const posts = (await readdir(POSTS)).filter((f) => f.endsWith('.md'));
  const used = [];
  for (const post of posts) {
    const text = await readFile(new URL(post, POSTS), 'utf8');
    const key = /^featured-image: \/public\/thumbnails\/([a-z0-9-]+)\.png$/m.exec(text)?.[1];
    assert.ok(key, `${post}'s featured image is a /public/thumbnails/<key>.png`);
    assert.ok(scenes.has(`thumb-${key}`), `${post}: there's a thumb-${key} scene`);
    used.push(key);
  }
  assert.equal(new Set(used).size, used.length, 'no two posts share a thumbnail');
  assert.deepEqual(used.map((key) => `thumb-${key}`).sort(), [...scenes.keys()].sort(), 'every thumb scene is a post\'s');
});

test('every thumb-<key> scene is preview-only and declares <key>.png at 5×', async () => {
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', SCENES), 'utf8'));
  assert.equal(manifest.publish.images, '../../../../static/public/thumbnails');
  for (const [name, scene] of scenes) {
    assert.equal(scene.output, undefined, `${name} writes no SVG`);
    assert.deepEqual(scene.image, { file: `${name.slice('thumb-'.length)}.png`, scale: 5 }, `${name}'s image`);
  }
});
