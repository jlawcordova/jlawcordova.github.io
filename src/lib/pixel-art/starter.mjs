// @ts-check
// Starter sources for new objects and scenes (pixel-art engine spec R38,
// D9.6). `npm run art -- --new` and the editor's New dialogs both build their
// documents here, so a new file is the same whichever way it's made.

import { resolve, usedKeys } from './engine.mjs';

/** Names are at most this long, so file names and the editor stay readable. */
export const MAX_NAME = 64;

/** An empty scene: a 128×128 view around tile [0, 0, 0]. */
export const starterScene = () => ({ viewBox: [-64, -64, 128, 128], origin: [0, 0], items: [] });

/**
 * An empty sprite, anchored at its bottom center, so it stands on a tile.
 * @param {number} width
 * @param {number} height
 */
export const starterSprite = (width, height) => ({
  kind: 'sprite',
  anchor: [Math.floor(width / 2), height - 1],
  keys: { o: 'ink' },
  layers: [{ map: Array(height).fill('.'.repeat(width)) }],
});

/** A one-level block, lit like the island: light top, mid left, shadow right. */
export const starterBlock = () => ({ kind: 'block', size: [1, 1, 1], faces: { top: 'grass-2', left: 'soil-2', right: 'soil-3' } });

/**
 * The nearest palette color by value, among the given tiers.
 * @param {import('./engine.mjs').Sources} sources
 * @param {string} hex
 * @param {string[]} tiers
 */
export function nearestColor(sources, hex, tiers) {
  const rgb = (/** @type {string} */ h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = rgb(hex);
  /** @type {{ name: string, d: number } | null} */
  let best = null;
  for (const [name, color] of sources.colors) {
    if (!tiers.includes(color.tier)) continue;
    const [r2, g2, b2] = rgb(color.hex);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (!best || d < best.d) best = { name, d };
  }
  return best?.name;
}

/**
 * An object that extends `base` with no rows overridden yet. A new object may
 * not paint legacy colors, so every legacy key it inherits is re-keyed to the
 * nearest allowed color. It then validates as it is, and its rows can be
 * overridden one at a time.
 * @param {import('./engine.mjs').Sources} sources
 * @param {string} base
 */
export function starterExtends(sources, base) {
  const resolved = resolve(sources, base);
  const tiers = resolved.character ? ['world', 'outfit'] : ['world'];
  /** @type {Record<string, string>} */
  const keys = {};
  for (const key of usedKeys(resolved)) {
    const color = sources.colors.get(resolved.keys[key]);
    if (color && !tiers.includes(color.tier)) keys[key] = /** @type {string} */ (nearestColor(sources, color.hex, tiers));
  }
  return { kind: 'sprite', extends: base, keys, rows: {} };
}
