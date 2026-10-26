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
  bubble.hidden = false;
  place();
  new ResizeObserver(place).observe(island);
  bubble.addEventListener('pointerenter', load, { once: true });
  bubble.addEventListener('focus', load, { once: true });
  bubble.addEventListener('click', async () => (await load()).open(root, bubble));
}
