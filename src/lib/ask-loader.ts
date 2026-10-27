// The loader (spec, "Loading and budgets"): places the bubble by the
// character's foot and reveals it, and loads the panel on the first hover,
// focus or press. Everything else is in src/lib/ask.ts.
const root = document.querySelector<HTMLElement>('.ask');
const island = document.querySelector<SVGSVGElement>('.hero-island');
const figure = island?.querySelector('.ask-character');
const foot = figure?.closest<SVGGElement>('.enter');
const bubble = root?.querySelector<HTMLButtonElement>('.ask-bubble');

if (root && island && foot && bubble) {
  const load = () => import('./ask');
  // The bubble sits above the head (29 art px over the foot), to the
  // character's left, or its right where the left would leave the screen.
  const place = () => {
    const vb = island.viewBox.baseVal;
    const art = island.getBoundingClientRect();
    const box = root.getBoundingClientRect();
    const s = art.width / vb.width;
    const x = art.left + (Number(foot.dataset.x) - vb.x) * s;
    const y = art.top + (Number(foot.dataset.y) - 29 - vb.y) * s;
    const w = bubble.offsetWidth;
    const left = x - w + 24 < 16 ? x - 24 : x - w + 24;
    bubble.style.left = `${left - box.left}px`;
    bubble.style.top = `${y - box.top - bubble.offsetHeight - 12}px`;
    bubble.style.setProperty('--tail', `${x - left}px`);
  };
  // Shown once the character has landed in the island's build-up (at once
  // under reduced motion, where nothing animates), so it never points at
  // empty ground. The SVG plays the landing on a wrapper inside the piece,
  // next to the character's endless idle loop, so this waits on the piece's
  // finite animations.
  requestAnimationFrame(async () => {
    const landing = foot.getAnimations({ subtree: true }).filter((a) => a.effect?.getComputedTiming().endTime !== Infinity);
    await Promise.all(landing.map((a) => a.finished.catch(() => {})));
    bubble.hidden = false;
    place();
    new ResizeObserver(place).observe(island);
  });
  // If the panel can't load (offline, or a deploy replaced its chunk), the
  // bubble goes rather than stay a dead button.
  const tryLoad = () => load().catch(() => ((bubble.hidden = true), undefined));
  bubble.addEventListener('pointerenter', tryLoad, { once: true });
  bubble.addEventListener('focus', tryLoad, { once: true });
  bubble.addEventListener('click', async () => (await tryLoad())?.open(root, bubble));
}
