// The site's one door to Motion (pixel-first look spec, Motion module): short,
// stepped moves in the pixel art's rhythm. Nothing here hides content without
// also revealing it, and nothing runs under prefers-reduced-motion. Islands
// import what they use, so a page without one loads no Motion code.
import { animate, inView, stagger, steps, type AnimationOptions, type DOMKeyframesDefinition } from 'motion';

export { stagger };

type Targets = Element | Element[];

/** True when the visitor asked for reduced motion. Read on every call, so a change applies at once. */
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Stepped easing, like the sprites: `px(4)` moves in four steps. */
export const px = (n: number) => steps(n);

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
  /** Steps in the easing. */
  frames?: number;
}

/**
 * A scroll entrance: each element still below the viewport fades and rises in
 * as it arrives. Elements already on screen are left alone, so nothing a
 * visitor can see disappears. The ones hidden here are revealed by the same
 * call's observers, and all at once before printing.
 */
export function reveal(elements: Iterable<Element>, { y = 16, stagger: gap = 0, duration = 0.4, frames = 6 }: RevealOptions = {}) {
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

  // Elements that enter in the same frame stagger by `gap` seconds.
  let batch = 0;
  let resetting = false;
  inView(
    below,
    (el) => {
      const delay = batch++ * gap;
      if (!resetting) {
        resetting = true;
        requestAnimationFrame(() => ((batch = 0), (resetting = false)));
      }
      animate(el, { opacity: [0, 1], y: [y, 0] }, { duration, delay, ease: px(frames) });
    },
    { amount: 0.2 },
  );
}
