// Checks for src/lib/paginate.mjs, the paginate shared by the blog and the
// accomplishments pages (gamified accomplishments spec D4, R7).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pagePath, paginate } from '../src/lib/paginate.mjs';

const range = (n) => Array.from({ length: n }, (_, i) => i + 1);

test('R7: 30 items at 12 per page make pages of 12, 12 and 6', () => {
  const pages = paginate(range(30), 12);
  assert.deepEqual(
    pages.map((p) => [p.page, p.totalPages, p.totalItems, p.items.length]),
    [
      [1, 3, 30, 12],
      [2, 3, 30, 12],
      [3, 3, 30, 6],
    ],
  );
  assert.deepEqual(pages.flatMap((p) => p.items), range(30));
});

test('an exact multiple has no empty trailing page', () => {
  assert.equal(paginate(range(18), 9).length, 2);
});

test('an empty list still has one empty page', () => {
  assert.deepEqual(paginate([], 9), [{ page: 1, totalPages: 1, totalItems: 0, items: [] }]);
});

test('perPage must be a positive integer', () => {
  for (const bad of [0, -1, 1.5, Number.NaN]) assert.throws(() => paginate(range(3), bad), RangeError);
});

test('pagePath keeps the blog URLs: /blog/, then /blog/pageN/', () => {
  assert.equal(pagePath('/blog/', 1), '/blog/');
  assert.equal(pagePath('/blog/', 2), '/blog/page2/');
  assert.equal(pagePath('/accomplishments/', 3), '/accomplishments/page3/');
});
