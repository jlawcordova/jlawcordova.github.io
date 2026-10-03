// @ts-check
// Splits a list into numbered pages, shared by the blog (/blog/, /blog/page2/,
// ...) and the accomplishments pages (/accomplishments/, /accomplishments/page2/,
// ...). Plain .mjs so the Node tests can import it; src/lib/pagination.ts
// re-exports it for the pages.

/**
 * One page of a list.
 * @template T
 * @typedef {{ page: number, totalPages: number, totalItems: number, items: T[] }} Page
 */

/**
 * Splits items into pages of perPage. An empty list still has one (empty) page.
 * @template T
 * @param {readonly T[]} items
 * @param {number} perPage
 * @returns {Page<T>[]}
 */
export function paginate(items, perPage) {
  if (!Number.isInteger(perPage) || perPage < 1) throw new RangeError(`perPage must be a positive integer, got ${perPage}`);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  return Array.from({ length: totalPages }, (_, i) => ({
    page: i + 1,
    totalPages,
    totalItems: items.length,
    items: items.slice(i * perPage, (i + 1) * perPage),
  }));
}

/**
 * The URL of page n under base: page 1 is base itself, then base + "page2/", ...
 * (Jekyll's paginate_path, which the blog's URLs keep).
 * @param {string} base a path ending in "/", such as "/blog/"
 * @param {number} n
 */
export function pagePath(base, n) {
  return n === 1 ? base : `${base}page${n}/`;
}
