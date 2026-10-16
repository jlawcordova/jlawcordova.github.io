// @ts-check
// The build-up entrances: when each `enter` group starts and how it moves, for
// the hero island (island build entrance spec R3–R7) and for each Range setting
// (Range settings spec R4, R5). Pure data in, timings out, so node:test can
// check the order without a browser; Hero.astro and Range.astro play it.

/** The owner's tuned timing, from the prototype rounds (spec R6). Seconds and art pixels. */
export const TIMING = {
  /** When the island starts, alongside the hero copy. */
  start: 0.2,
  /** Between one ground row and the next. */
  rowGap: 0.12,
  /** Each piece's float, rising then settling. */
  duration: 0.65,
  /** How far below its spot a piece starts. */
  rise: 10,
  /** How far past its spot a piece floats before settling. */
  overshoot: 2,
  /** The share of the float spent rising. */
  peak: 0.55,
  /** How long before the last ground row lands the first object starts. */
  objectLead: 0.08,
  shadowDuration: 0.4,
  skyDuration: 0.6,
  /** How far left of their spot the clouds start. */
  skyDrift: 6,
};

/**
 * A Range setting's build-up on each class change (Range settings spec R5).
 * Quicker than the island's, since it replays on every switch, with its own
 * object sweep, because a setting has three rows to the island's six.
 * @type {typeof TIMING & { sweep?: number }}
 */
export const RANGE_TIMING = {
  ...TIMING,
  start: 0,
  rowGap: 0.08,
  duration: 0.5,
  objectLead: 0.1,
  sweep: 0.3,
};

/** The ease back down onto the spot, after the rise's ease-out (cubic-bezier). */
export const SETTLE_EASE = /** @type {[number, number, number, number]} */ ([0.45, 0, 0.55, 1]);

/**
 * @typedef {{ enter: string | undefined, row?: number, x?: number }} Piece
 *   An `enter` group's `data-enter`, and its `data-row` (ground) or `data-x` (object).
 * @typedef {{
 *   move: 'float' | 'fade' | 'drift',
 *   delay: number,
 *   duration: number,
 *   keyframes: { opacity: number[], x?: number[], y?: number[] },
 *   times?: number[],
 * }} Entrance
 */

/**
 * Each piece's entrance, in the order given, or null for a piece it doesn't know.
 * Ground rows float up left to right: the highest row (the left cliff) first.
 * Objects follow just before the ground finishes, left to right by their x,
 * over the timing's sweep, or else the span the rows take. The shadow fades
 * in first, and the clouds drift in as the objects begin.
 * @param {Piece[]} pieces
 * @param {typeof TIMING & { sweep?: number }} [t]  the timing; the island's by default
 * @returns {(Entrance | null)[]}
 */
export function schedule(pieces, t = TIMING) {
  const rows = pieces.filter((p) => p.enter === 'ground').map((p) => Number(p.row));
  const xs = pieces.filter((p) => p.enter === 'object').map((p) => Number(p.x));
  const lastRow = Math.max(0, ...rows);
  const groundEnd = t.start + t.rowGap * (lastRow + 1) + t.duration;
  const objectStart = groundEnd - t.objectLead;
  const sweep = t.sweep ?? t.rowGap * lastRow;
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];

  /** @param {number} delay @returns {Entrance} */
  const float = (delay) => ({
    move: 'float',
    delay,
    duration: t.duration,
    keyframes: { opacity: [0, 1, 1], y: [t.rise, -t.overshoot, 0] },
    times: [0, t.peak, 1],
  });

  return pieces.map((p) => {
    switch (p.enter) {
      case 'shadow':
        return { move: 'fade', delay: t.start, duration: t.shadowDuration, keyframes: { opacity: [0, 1] } };
      case 'ground':
        return float(t.start + t.rowGap * (lastRow - Number(p.row) + 1));
      case 'object':
        return float(objectStart + (maxX > minX ? ((Number(p.x) - minX) / (maxX - minX)) * sweep : 0));
      case 'sky':
        return { move: 'drift', delay: objectStart, duration: t.skyDuration, keyframes: { opacity: [0, 1], x: [-t.skyDrift, 0] } };
      default:
        return null;
    }
  });
}
