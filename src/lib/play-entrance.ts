// Plays a build-up schedule (src/lib/island-entrance.mjs) on its enter groups,
// for the hero island, each Range setting and the entrance lab. Every move
// goes through play(), so a start state is only ever set by the call that
// animates it, and nothing runs under reduced motion.
import { SETTLE_EASE, type Entrance, type Timing } from './island-entrance.mjs';
import { easeOut, play } from './motion';

/** An ease-out that lands on whole steps, so a stepped float moves in whole art pixels. */
const inSteps = (n: number) => (p: number) => Math.round((1 - (1 - p) ** 3) * n) / n;

/** A move's ease: out to its peak, then in and out onto its spot. */
function easeOf(move: Entrance['move'], t: Timing) {
  if (move === 'stepped') return [inSteps(Math.max(1, t.rise + t.overshoot)), inSteps(Math.max(1, t.overshoot))];
  if (move === 'float' || move === 'drop' || move === 'pop') return [easeOut, SETTLE_EASE];
  return easeOut;
}

/** An `enter` group's piece, as the schedule reads it: its kind, grid place and foot. */
export const pieceOf = (group: SVGGElement | HTMLElement) => ({
  enter: group.dataset.enter,
  col: Number(group.dataset.col),
  row: Number(group.dataset.row),
  x: Number(group.dataset.x),
  y: Number(group.dataset.y),
});

/** Plays each group's entrance, and returns the running animations (undefined where nothing runs). */
export function playEntrance(groups: Element[], entrances: (Entrance | null)[], t: Timing) {
  return groups.map((group, i) => {
    const entrance = entrances[i];
    if (!entrance) return undefined;
    const { keyframes, delay, duration, times, move } = entrance;
    return play(group, keyframes, { delay, duration, times, ease: easeOf(move, t) } as Parameters<typeof play>[2]);
  });
}
