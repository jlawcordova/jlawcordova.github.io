// @ts-check
// The build-up entrances: when each `enter` group starts and how it moves, for
// the hero island (island edge sweep spec R3–R7) and for each Range setting
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

/** How the objects move in: `same` as the ground, or a move of their own. */
export const OBJECT_MOVES = /** @type {const} */ (['same', ...MOVES]);

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
 *   objectMove: typeof OBJECT_MOVES[number],
 *   duration: number,
 *   peak: number,
 *   rise: number,
 *   overshoot: number,
 *   popFrom: number,
 *   popPeak: number,
 *   objectDuration: number,
 *   objectPeak: number,
 *   objectRise: number,
 *   objectOvershoot: number,
 *   objectPopFrom: number,
 *   objectPopPeak: number,
 *   shadowDuration: number,
 *   skyDuration: number,
 *   skyDrift: number,
 *   seed: number,
 * }} Timing
 *   Seconds, art pixels and scales. Every build-up names all of them, so the
 *   entrance lab can show and copy any one.
 */

/**
 * The owner's pick from the entrance lab (island edge sweep spec R3–R7). The
 * hero-island scene's `entrance` holds the same numbers in ms, for Pixel Lab
 * (Pixel Lab v0.9.0 spec R4); scripts/entrance-timing.test.mjs keeps them equal.
 */
export const TIMING = /** @type {Timing} */ ({
  /** When the shadow starts, alongside the hero copy. */
  start: 0.2,
  /** From the shadow's start to the first ground piece's. */
  groundDelay: 0.12,
  /** From the first ground piece's start to the last one's. */
  groundSpan: 1,
  /** An extra left-to-right delay, spread over the island's width. With the sweep, the ground spans 1.25s in all. */
  cascade: 0.25,
  /** The ground sweeps in from the left corner to the right. */
  ground: 'sweep',
  /** As copied from the lab; unused while the objects arrive `with` their cubes. */
  objects: 'same',
  /** Each object arrives with the cube under it. */
  with: true,
  /** Without `with`: how long before the last ground piece lands the first object starts. */
  objectLead: 0.08,
  /** Without `with`: from the first object's start to the last one's. */
  objectSpan: 0.6,
  /** How long after the cube under it an object starts. */
  lag: 0.5,
  /** The ground floats up and overshoots. */
  move: 'float',
  /** The objects drop from above. With a move of their own, they use the object numbers below; with `same`, the ground's. */
  objectMove: 'drop',
  /** Each ground piece's move, from its start to settled. */
  duration: 0.35,
  /** The share of a move spent reaching its peak, before settling. */
  peak: 0.6,
  /** Float and drop: how far from its spot a piece starts, in art pixels. */
  rise: 16,
  /** Float and drop: how far past its spot a piece goes before settling. */
  overshoot: 6,
  /** Pop: the size a piece grows from. */
  popFrom: 0.3,
  /** Pop: the size it grows to before settling. */
  popPeak: 1.1,
  /** The objects' own numbers: a quick drop from 24 art px with a small dip. */
  objectDuration: 0.3,
  objectPeak: 0.5,
  objectRise: 24,
  objectOvershoot: 1.5,
  objectPopFrom: 0.3,
  objectPopPeak: 1.1,
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
 * rows float up 0.08s apart, left to right, then its objects by x. Every field
 * is named here, so no island pick reaches the Range (island sweep drop spec R6).
 * The range-sprite scene's `entrance` holds the same numbers (Pixel Lab v0.9.0 spec R5).
 * @type {Timing}
 */
export const RANGE_TIMING = {
  start: 0,
  groundDelay: 0.08,
  groundSpan: 0.16,
  cascade: 0,
  ground: 'rows',
  objects: 'ltr',
  with: false,
  objectLead: 0.1,
  objectSpan: 0.3,
  lag: 0.4,
  move: 'float',
  objectMove: 'same',
  duration: 0.5,
  peak: 0.55,
  rise: 10,
  overshoot: 2,
  popFrom: 0.3,
  popPeak: 1.1,
  objectDuration: 0.5,
  objectPeak: 0.55,
  objectRise: 10,
  objectOvershoot: 2,
  objectPopFrom: 0.3,
  objectPopPeak: 1.1,
  shadowDuration: 0.4,
  skyDuration: 0.6,
  skyDrift: 6,
  seed: 1,
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
 * @typedef {{ move: typeof MOVES[number], duration: number, peak: number, rise: number, overshoot: number, popFrom: number, popPeak: number }} Motion
 *   How one kind of piece moves: the ground's, or the objects'.
 */

/**
 * How the ground or the objects move. Objects move as the ground does unless
 * `objectMove` names a move of their own, which then takes the object numbers.
 * @param {Timing} t
 * @param {'ground' | 'object'} kind
 * @returns {Motion}
 */
export function motionOf(t, kind) {
  const { move, duration, peak, rise, overshoot, popFrom, popPeak } = t;
  if (kind === 'ground' || t.objectMove === 'same') return { move, duration, peak, rise, overshoot, popFrom, popPeak };
  return {
    move: t.objectMove,
    duration: t.objectDuration,
    peak: t.objectPeak,
    rise: t.objectRise,
    overshoot: t.objectOvershoot,
    popFrom: t.objectPopFrom,
    popPeak: t.objectPopPeak,
  };
}

/**
 * The keyframes and times of a move.
 * @param {Motion} m
 * @returns {Pick<Entrance, 'keyframes' | 'times'>}
 */
function moveOf(m) {
  const times = [0, m.peak, 1];
  switch (m.move) {
    case 'drop':
      return { keyframes: { opacity: [0, 1, 1], y: [-m.rise, m.overshoot, 0] }, times };
    case 'pop':
      return { keyframes: { opacity: [0, 1, 1], scale: [m.popFrom, m.popPeak, 1] }, times };
    case 'fade':
      return { keyframes: { opacity: [0, 1] } };
    default:
      return { keyframes: { opacity: [0, 1, 1], y: [m.rise, -m.overshoot, 0] }, times };
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

  const moves = Object.fromEntries(
    /** @type {const} */ (['ground', 'object']).map((kind) => {
      const m = motionOf(t, kind);
      return [kind, { move: m.move, duration: m.duration, ...moveOf(m) }];
    }),
  );
  return pieces.map((p, i) => {
    switch (p.enter) {
      case 'shadow':
        return { move: 'fade', delay: t.start, duration: t.shadowDuration, keyframes: { opacity: [0, 1] } };
      case 'ground':
      case 'object': {
        const { move, duration, keyframes, times } = moves[p.enter];
        return { move, delay: /** @type {number} */ (delays.get(i)), duration, keyframes, ...(times && { times }) };
      }
      case 'sky':
        return { move: 'drift', delay: objectStart, duration: t.skyDuration, keyframes: { opacity: [0, 1], x: [-t.skyDrift, 0] } };
      default:
        return null;
    }
  });
}

/** When the last piece has settled, in seconds from the start. */
export const settledBy = (/** @type {(Entrance | null)[]} */ plan) => Math.max(0, ...plan.flatMap((e) => (e ? [e.delay + e.duration] : [])));
