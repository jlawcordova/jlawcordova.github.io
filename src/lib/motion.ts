// The site's one door to Motion (pixel-first look spec, Motion module): short,
// smooth moves at the display's full frame rate. Nothing here hides content without
// also revealing it, and nothing runs under prefers-reduced-motion. Islands
// import what they use, so a page without one loads no Motion code.
import { animate, inView, stagger, type AnimationOptions, type DOMKeyframesDefinition } from 'motion';

export { inView, stagger };

type Targets = Element | Element[];

/** True when the visitor asked for reduced motion. Read on every call, so a change applies at once. */
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The site's easing: a smooth ease-out that starts quickly and settles gently.
 * The pixel art's own loops stay stepped in CSS; UI motion glides.
 */
export const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Animates from the first keyframe to the last. The start state is set by this
 * call, so an element is never left in it. Under reduced motion nothing runs,
 * and the element stays at its natural end state.
 */
export function play(targets: Targets, keyframes: DOMKeyframesDefinition, options: AnimationOptions = {}) {
  const list = Array.isArray(targets) ? targets : [targets];
  if (!list.length || reduced()) return undefined;
  return animate(list, keyframes, options);
}

interface RevealOptions {
  /** Pixels to rise from. */
  y?: number;
  /** Seconds between elements that enter together. */
  stagger?: number;
  duration?: number;
}

/**
 * A scroll entrance: each element still below the viewport fades and rises in
 * as it arrives. Elements already on screen are left alone, so nothing a
 * visitor can see disappears. The ones hidden here are revealed by the same
 * call's observers, and all at once before printing.
 */
export function reveal(elements: Iterable<Element>, { y = 16, stagger: gap = 0, duration = 0.4 }: RevealOptions = {}) {
  if (reduced()) return;
  const below = [...elements].filter(
    (el): el is HTMLElement | SVGElement => 'style' in el && el.getBoundingClientRect().top > innerHeight,
  );
  if (!below.length) return;

  for (const el of below) el.style.opacity = '0';
  addEventListener(
    'beforeprint',
    () => {
      for (const el of below) {
        el.style.opacity = '';
        el.style.transform = '';
      }
    },
    { once: true },
  );

  inViewStaggered(below, 0.2, gap, (el, delay) => {
    animate(el, { opacity: [0, 1], y: [y, 0] }, { duration, delay, ease: easeOut });
  });
}

interface HopOptions {
  /** Seconds to wait after an element comes into view, so a rising row can land first. */
  delay?: number;
  /** Seconds between elements that enter together. */
  stagger?: number;
}

/**
 * A playful hop (achievements redesign spec R15): the element moves up 8px and
 * back over 0.3s, once, after `delay` seconds. It only moves something that is
 * already showing, so it never hides anything, and under reduced motion it
 * does nothing.
 */
export const hopOnce = (el: Element, delay = 0) => play(el, { y: [0, -8, 0] }, { duration: 0.3, delay, ease: easeOut });

/** The hop, played on each element as it comes into view. */
export function hop(elements: Iterable<Element>, { delay = 0, stagger: gap = 0 }: HopOptions = {}) {
  const list = [...elements];
  if (!list.length || reduced()) return;
  inViewStaggered(list, 0.6, gap, (el, wait) => {
    hopOnce(el, delay + wait);
  });
}

/**
 * Calls `run` for each element once, as `amount` of it comes into view, with
 * its delay: elements that enter in the same frame stagger by `gap` seconds.
 */
function inViewStaggered(elements: Element[], amount: number, gap: number, run: (el: Element, delay: number) => void) {
  let batch = 0;
  let resetting = false;
  inView(
    elements,
    (el) => {
      const delay = batch++ * gap;
      if (!resetting) {
        resetting = true;
        requestAnimationFrame(() => ((batch = 0), (resetting = false)));
      }
      run(el, delay);
    },
    { amount },
  );
}
