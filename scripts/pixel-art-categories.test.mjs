// Every object in the site's Pixpocket document has a category (Pixel Lab
// categories spec R7, D3), so its Library opens in tabs and nothing lands in
// Others. Which category is the art's call, so this checks only that there is
// one. Reads the document's files; a sprite that extends another has its own.

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const OBJECTS = new URL('../src/assets/pixel-art/jlawcordova.pixpocket/objects/', import.meta.url);

test("R7: every object in the site's document has a category", async () => {
  const files = (await readdir(OBJECTS)).filter((f) => f.endsWith('.json'));
  assert.ok(files.length > 0, 'the document has objects');
  const without = [];
  for (const file of files) {
    const object = JSON.parse(await readFile(new URL(file, OBJECTS), 'utf8'));
    if (!object.category?.length) without.push(file.slice(0, -5));
  }
  assert.deepEqual(without, [], 'give these a category with `npm run pixpocket -- object category <name> --to <path>`');
});
