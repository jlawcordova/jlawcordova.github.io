// @ts-check
// The Range's class change (Range pop spec): the countdown's timing, the
// battle bars on the console's screen and the slash across the section.
// Shared by src/components/home/Range.astro and scripts/range-change.test.mjs.

/** How often the carousel advances, in ms: long enough for a setting to rest after it builds (Range settings spec R7). */
export const INTERVAL = 3000;

/**
 * Battle bars: the size of a block in px, the number of frames after the
 * first, the time per frame in ms, and how far ahead of the sweep the lit
 * blocks run, as a share of the sweep.
 */
export const BARS = { cell: 12, frames: 10, frameMs: 50, edge: 0.1 };

/**
 * When a block of the battle bars clears, from 0 up to (not including) 1.
 * Blocks go in bands two rows high. Even bands sweep left to right and odd
 * ones right to left, and each band starts a little after the one above it.
 * @param {number} x
 * @param {number} y
 * @param {number} cols
 * @param {number} rows
 */
export function barsOrder(x, y, cols, rows) {
  const band = Math.floor(y / 2);
  const across = band % 2 ? (cols - 1 - x) / cols : x / cols;
  return across * 0.8 + (band / Math.ceil(rows / 2)) * 0.2;
}

/**
 * What each block shows at a point in the sweep: 0 when it has cleared to the
 * new color, 1 when it still holds the old one, and 2 when it's lit as the
 * sweep's edge.
 * @param {number[]} order When each block clears, from barsOrder.
 * @param {number} progress From 0 to 1.
 * @param {number} [edge]
 * @returns {(0 | 1 | 2)[]}
 */
export function barsFrame(order, progress, edge = BARS.edge) {
  return order.map((o) => (o < progress ? 0 : o < progress + edge ? 2 : 1));
}

/**
 * The slash across the section: the new color cuts in as a thin diagonal and
 * widens both ways until it covers the section.
 */
export const SLASH = {
  from: 'polygon(60% 0%, 60% 0%, 40% 100%, 40% 100%)',
  to: 'polygon(-40% 0%, 160% 0%, 140% 100%, -60% 100%)',
  duration: 600,
  easing: 'cubic-bezier(0.55, 0, 0.45, 1)',
};
