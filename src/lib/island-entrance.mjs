// @ts-check
// The build-up entrances: when each `enter` group starts and how it moves, for
// the hero island (island clock sweep spec R1–R5) and for each Range setting
// (Range settings spec R4, R5). Pure data in, timings out, so node:test can
// check the order without a browser; Hero.astro, Range.astro and the entrance
// lab play it with playEntrance() from src/lib/play-entrance.ts.

/** The orders the ground can enter in. Each is a score; lower enters first. */
export const GROUND_ORDERS = /** @type {const} */ ([
  'rows',
  'cols',
  'back-front',
  'front-back',
  'sweep',
  'center',
  'edges',
  'clock',
  'checker',
  'random',
  'together',
]);

/** The orders the objects can enter in, after the ground. `same` follows the ground's order. */
export const OBJECT_ORDERS = /** @type {const} */ (['ltr', 'same', 'back-front', 'front-back', 'random', 'together']);

/** How each ground or object piece moves in. */
export const MOVES = /** @type {const} */ (['float', 'drop', 'pop', 'stepped', 'fade']);

/**
 * @typedef {{
 *   start: number,
 *   groundDelay: number,
 *   groundSpan: number,
 *   cascade: number,
 *   ground: typeof GROUND_ORDERS[number],
 *   objects: typeof OBJECT_ORDERS[number],
 *   with: boolean,
 *   objectLead: number,
 *   objectSpan: number,
 *   lag: number,
 *   move: typeof MOVES[number],
 *   duration: number,
 *   peak: number,
 *   rise: number,
 *   overshoot: number,
 *   popFrom: number,
 *   popPeak: number,
 *   shadowDuration: number,
 *   skyDuration: number,
 *   skyDrift: number,
 *   seed: number,
 * }} Timing
 *   Seconds, art pixels and scales. Every build-up names all of them, so the
 *   entrance lab can show and copy any one.
 */

/** The owner's choice from the entrance lab (island clock sweep spec R1–R5). */
export const TIMING = /** @type {Timing} */ ({
  /** When the shadow starts, alongside the hero copy. */
  start: 0.2,
  /** From the shadow's start to the first ground piece's. */
  groundDelay: 0.12,
  /** From the first ground piece's start to the last one's. */
  groundSpan: 0.5,
  /** An extra left-to-right delay inside each wave, spread over the island's width. */
  cascade: 0,
  /** The ground pops up cube by cube, clockwise from the left corner. */
  ground: 'clock',
  /** The objects follow front to back. */
  objects: 'front-back',
  /** Objects come after the ground, not each with the cube under it. */
  with: false,
  /** How long before the last ground piece lands the first object starts. */
  objectLead: 0.08,
  /** From the first object's start to the last one's. */
  objectSpan: 0.6,
  /** With `with`: how long after the cube under it an object starts. */
  lag: 0.4,
  move: 'pop',
  /** Each piece's move, from its start to settled. */
  duration: 0.5,
  /** The share of a move spent reaching its peak, before settling. */
  peak: 0.55,
  /** Float and drop: how far from its spot a piece starts, in art pixels. */
  rise: 10,
  /** Float and drop: how far past its spot a piece goes before settling. */
  overshoot: 2,
  /** Pop: the size a piece grows from. */
  popFrom: 0.3,
  /** Pop: the size it grows to before settling. */
  popPeak: 1.1,
  shadowDuration: 0.4,
  skyDuration: 0.6,
  /** How far left of their spot the clouds start. */
  skyDrift: 6,
  /** The random orders' seed, so a shuffle stays put. */
  seed: 1,
});

/**
 * A Range setting's build-up on each class change (Range settings spec R5).
 * Quicker than the island's, since it replays on every switch: its three floor
 * rows float up 0.08s apart, left to right, then its objects by x.
 * @type {Timing}
 */
export const RANGE_TIMING = {
  ...TIMING,
  start: 0,
  groundDelay: 0.08,
  groundSpan: 0.16,
  ground: 'rows',
  objects: 'ltr',
  objectLead: 0.1,
  objectSpan: 0.3,
  move: 'float',
  duration: 0.5,
};

/** The ease back down onto the spot, after the ease-out to the peak (cubic-bezier). */
export const SETTLE_EASE = /** @type {[number, number, number, number]} */ ([0.45, 0, 0.55, 1]);

/**
 * @typedef {{ enter: string | undefined, col?: number, row?: number, x?: number, y?: number }} Piece
 *   An `enter` group's `data-enter`, `data-col` and `data-row` (ground), and
 *   `data-x` and `data-y` (its foot, in scene pixels).
 * @typedef {{
 *   move: typeof MOVES[number] | 'drift',
 *   delay: number,
 *   duration: number,
 *   keyframes: { opacity: number[], x?: number[], y?: number[], scale?: number[] },
 *   times?: number[],
 * }} Entrance
 * @typedef {{ u: number, v: number, x: number, y: number }} Cell
 *   A piece's place: grid column and row (fractional for objects), and screen x and y.
 */

/** Reads a number that may be missing: undefined, null, '' and NaN all count as missing. */
const num = (/** @type {unknown} */ n) => (n === undefined || n === null || n === '' || Number.isNaN(Number(n)) ? undefined : Number(n));

/** A small seeded random in [0, 1), so a shuffle is the same on every replay. */
function random(/** @type {number} */ seed, /** @type {number} */ i) {
  let t = (seed * 9301 + i * 49297 + 233280) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Scores mapped onto 0–1, so a span means the same for every order. */
function normalize(/** @type {number[]} */ scores) {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return scores.map((s) => (max > min ? (s - min) / (max - min) : 0));
}

/**
 * Every piece's place. Ground pieces with a column and row are on the grid,
 * and their feet tell where the grid sits on screen, so an object's foot maps
 * back onto it. A Range floor row has a row only, and a Range object an x only.
 * @param {Piece[]} pieces
 * @returns {(Cell | null)[]}
 */
function cells(pieces) {
  const anchor = pieces.find((p) => p.enter === 'ground' && [p.col, p.row, p.x, p.y].every((n) => num(n) !== undefined));
  const [ox, oy] = anchor ? [Number(anchor.x) - (Number(anchor.col) - Number(anchor.row)) * 16, Number(anchor.y) - (Number(anchor.col) + Number(anchor.row)) * 8] : [0, 0];
  return pieces.map((p) => {
    const [col, row, x, y] = [num(p.col), num(p.row), num(p.x), num(p.y)];
    if (p.enter === 'ground') {
      const [u, v] = [col ?? 0, row ?? 0];
      return { u, v, x: x ?? (u - v) * 16 + ox, y: y ?? (u + v) * 8 + oy };
    }
    if (p.enter === 'object') {
      const [sx, sy] = [x ?? 0, y ?? oy];
      const [a, b] = [(sx - ox) / 16, (sy - oy) / 8];
      return { u: (a + b) / 2, v: (b - a) / 2, x: sx, y: sy };
    }
    return null;
  });
}

/**
 * The score each order gives a piece. `center` is the middle of the ground.
 * The clock starts at the left corner and turns clockwise on screen.
 * @param {string} order
 * @param {Cell} c
 * @param {number} i  the piece's index, for the random order
 * @param {Timing} t
 * @param {{ x: number, y: number }} center
 */
function score(order, c, i, t, center) {
  const [du, dv] = [((c.x - center.x) / 16 + (c.y - center.y) / 8) / 2, ((c.y - center.y) / 8 - (c.x - center.x) / 16) / 2];
  switch (order) {
    case 'rows':
      return -c.v;
    case 'cols':
      return c.u;
    case 'back-front':
      return c.y;
    case 'front-back':
      return -c.y;
    case 'sweep':
    case 'ltr':
      return c.x;
    case 'center':
      return Math.hypot(du, dv);
    case 'edges':
      return -Math.hypot(du, dv);
    case 'clock': {
      const a = Math.atan2(c.y - center.y, c.x - center.x);
      return (((a - Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }
    case 'checker':
      return (((Math.round(c.u) + Math.round(c.v)) % 2) + 2) % 2;
    case 'random':
      return random(t.seed, i);
    default:
      return 0;
  }
}

/**
 * The keyframes and times of a ground or object piece's move.
 * @param {Timing} t
 * @returns {Pick<Entrance, 'keyframes' | 'times'>}
 */
function moveOf(t) {
  const times = [0, t.peak, 1];
  switch (t.move) {
    case 'drop':
      return { keyframes: { opacity: [0, 1, 1], y: [-t.rise, t.overshoot, 0] }, times };
    case 'pop':
      return { keyframes: { opacity: [0, 1, 1], scale: [t.popFrom, t.popPeak, 1] }, times };
    case 'fade':
      return { keyframes: { opacity: [0, 1] } };
    default:
      return { keyframes: { opacity: [0, 1, 1], y: [t.rise, -t.overshoot, 0] }, times };
  }
}

/**
 * Each piece's entrance, in the order given, or null for a piece it doesn't know.
 * The shadow fades in first. The ground follows in the timing's ground order,
 * spread over its span. Then the objects, in their own order over their span,
 * starting just before the ground has landed; or, `with` the ground, each a
 * little after the cube under it. The clouds drift in as the objects begin.
 * @param {Piece[]} pieces
 * @param {Timing} [t]  the timing; the island's by default
 * @returns {(Entrance | null)[]}
 */
export function schedule(pieces, t = TIMING) {
  const place = cells(pieces);
  const ground = pieces.flatMap((p, i) => (p.enter === 'ground' ? [i] : []));
  const objects = pieces.flatMap((p, i) => (p.enter === 'object' ? [i] : []));
  const at = (/** @type {number} */ i) => /** @type {Cell} */ (place[i]);
  const xs = ground.map((i) => at(i).x);
  const ys = ground.map((i) => at(i).y);
  const center = ground.length ? { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 } : { x: 0, y: 0 };

  const firstGround = t.start + t.groundDelay;
  const groundT = normalize(ground.map((i) => score(t.ground, at(i), i, t, center)));
  const across = normalize(ground.map((i) => at(i).x));
  /** @type {Map<number, number>} */
  const delays = new Map(ground.map((i, k) => [i, firstGround + groundT[k] * t.groundSpan + across[k] * t.cascade]));
  const groundEnd = Math.max(firstGround, ...delays.values()) + t.duration;

  let objectStart = groundEnd - t.objectLead;
  if (t.with) {
    // Each object rides in with the ground piece nearest its foot.
    for (const i of objects) {
      let best = -1;
      let near = Infinity;
      for (const g of ground) {
        const d = Math.hypot(at(g).u - at(i).u, at(g).v - at(i).v);
        if (d < near) [best, near] = [g, d];
      }
      delays.set(i, (delays.get(best) ?? firstGround) + t.lag);
    }
    objectStart = firstGround + t.groundSpan / 2;
  } else {
    const order = t.objects === 'same' ? t.ground : t.objects;
    const objectT = normalize(objects.map((i) => score(order, at(i), i, t, center)));
    objects.forEach((i, k) => delays.set(i, objectStart + objectT[k] * t.objectSpan));
  }

  const { keyframes, times } = moveOf(t);
  return pieces.map((p, i) => {
    switch (p.enter) {
      case 'shadow':
        return { move: 'fade', delay: t.start, duration: t.shadowDuration, keyframes: { opacity: [0, 1] } };
      case 'ground':
      case 'object':
        return { move: t.move, delay: /** @type {number} */ (delays.get(i)), duration: t.duration, keyframes, ...(times && { times }) };
      case 'sky':
        return { move: 'drift', delay: objectStart, duration: t.skyDuration, keyframes: { opacity: [0, 1], x: [-t.skyDrift, 0] } };
      default:
        return null;
    }
  });
}

/** When the last piece has settled, in seconds from the start. */
export const settledBy = (/** @type {(Entrance | null)[]} */ plan) => Math.max(0, ...plan.flatMap((e) => (e ? [e.delay + e.duration] : [])));
