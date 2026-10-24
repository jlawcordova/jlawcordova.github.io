// Every object in the site's Pixel Lab document has a category (Pixel Lab
// categories spec R7, D3), so its Library opens in tabs and nothing lands in
// Others. Which category is the art's call, so this checks only that there is
// one. Node built-ins, and Pixel Lab's program for its JSON.

import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { pixellab } from './pixellab.mjs';

const DOC = fileURLToPath(new URL('../src/assets/pixel-art/jlawcordova.pixellab', import.meta.url));

test("R7: every object in the site's document has a category", async () => {
  const { status, stdout, stderr } = await pixellab(['object', 'list', '--document', DOC, '--json']);
  assert.equal(status, 0, stderr);
  const { objects } = JSON.parse(stdout);
  assert.ok(objects.length > 0, 'the document lists its objects');
  const without = objects.filter((o) => !o.category?.length).map((o) => o.name);
  assert.deepEqual(without, [], 'give these a category with `npm run pixellab -- object category <name> --to <path>`');
});
