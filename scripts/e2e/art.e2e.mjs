// Browser check: each committed pixel-art SVG renders exactly like its fixture
// (pixel-art engine spec D17, R10, R11). Both are drawn at their viewBox size
// × 1 on a white page and compared with getImageData pixel by pixel, in each
// state the site can show: every group visible, each data-class variant alone,
// frame 0 of the loops, each animation frame alone, and .it2 alone. No
// committed baseline images.
//
// Run with `npm run e2e`. On a failure, a screenshot of the pair goes to
// .e2e-output/.

import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { launch, loadPlaywright } from './browser.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUTPUT_DIR = join(ROOT, '.e2e-output');

// Fixture (the art as extracted, one <rect> per run, kept in
// scripts/fixtures/pixel-art/) → committed output.
const PAIRS = [
  {
    name: 'R10: Range sprite renders identically to its fixture',
    slug: 'range-sprite',
    fixture: 'scripts/fixtures/pixel-art/range-sprite.src.svg',
    compiled: 'src/assets/pixel-art/range-sprite.svg',
  },
  {
    name: 'R11: hero island renders identically to its fixture',
    slug: 'hero-island',
    fixture: 'scripts/fixtures/pixel-art/hero-island.src.svg',
    compiled: 'src/assets/pixel-art/hero-island.svg',
  },
];

// What reduced motion shows (pixel-art.css): frame 0 of each loop, one truck.
const FRAME_ZERO_CSS = '.wf,.ff,.hf{opacity:0}.w0,.f0,.h0{opacity:1}.it2{opacity:0}';

/** @type {import('playwright').Browser} */
let browser;
/** @type {import('playwright').Page} */
let page;

before(async () => {
  const playwright = await loadPlaywright();
  if (!playwright) throw new Error('Playwright not found: browser checks NOT RUN');
  browser = await launch(playwright);
  page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 800, height: 600 } });
});

after(async () => {
  await browser?.close();
});

/**
 * The states to compare: everything with no CSS, each data-class variant
 * alone (as range.css shows them), and, if the art has loops, frame 0, each
 * animation frame alone (as the loops show them) and .it2 alone.
 */
function statesFor(...svgs) {
  const states = [{ name: 'every group visible, no CSS', css: '' }];
  const variants = new Set(svgs.flatMap((svg) => [...svg.matchAll(/data-class="([^"]*)"/g)].map((m) => m[1])));
  for (const n of [...variants].sort()) {
    states.push({ name: `data-class="${n}" alone`, css: `[data-class]{display:none}[data-class="${n}"]{display:inline}` });
  }
  if (svgs.some((svg) => /class="[^"]*\b(?:wf|ff|hf|it2)\b/.test(svg))) {
    states.push({ name: 'frame 0 of each loop, .it2 hidden', css: FRAME_ZERO_CSS });
  }
  // Later frames cover earlier ones when every group is visible, so each one
  // is also compared on its own.
  const frames = new Set(svgs.flatMap((svg) => [...svg.matchAll(/class="(?:wf|ff|hf) ([wfh]\d+)"/g)].map((m) => m[1])));
  for (const f of [...frames].sort()) {
    states.push({ name: `.${f} alone`, css: `.wf,.ff,.hf{opacity:0}.${f}{opacity:1}` });
  }
  if (svgs.some((svg) => /class="[^"]*\bit2\b/.test(svg))) {
    states.push({ name: '.it2 alone', css: '.it1{opacity:0}' });
  }
  return states;
}

function viewBoxSize(svg) {
  const m = /<svg\b[^>]*\bviewBox="(-?\d+) (-?\d+) (\d+) (\d+)"/.exec(svg);
  if (!m) throw new Error('No whole-number viewBox on the root <svg>');
  return { viewBox: m.slice(1).join(' '), minX: Number(m[1]), minY: Number(m[2]), width: Number(m[3]), height: Number(m[4]) };
}

function withCss(svg, css) {
  return css ? svg.replace(/<svg\b[^>]*>/, (open) => `${open}<style>${css}</style>`) : svg;
}

const dataUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

/**
 * Renders both SVGs on a white page and compares them pixel by pixel.
 * Returns the number of differing pixels, the first one, and how many
 * pixels of the fixture aren't white (so a blank render can't pass).
 */
async function compare(fixture, compiled, width, height) {
  const img = (id, svg) => `<img id="${id}" width="${width}" height="${height}" alt="" src="${dataUrl(svg)}">`;
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:#fff">${img('fixture', fixture)}${img('compiled', compiled)}</body></html>`,
  );
  return page.evaluate(
    async ({ width, height }) => {
      const pixels = async (id) => {
        const el = /** @type {HTMLImageElement} */ (document.getElementById(id));
        await el.decode();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(el, 0, 0, width, height);
        return ctx.getImageData(0, 0, width, height).data;
      };
      const a = await pixels('fixture');
      const b = await pixels('compiled');
      const rgba = (d, i) => `rgba(${d[i]},${d[i + 1]},${d[i + 2]},${d[i + 3]})`;
      let diffs = 0;
      let first = null;
      let painted = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i] !== 255 || a[i + 1] !== 255 || a[i + 2] !== 255) painted++;
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) {
          diffs++;
          if (!first) {
            const p = i / 4;
            first = { x: p % width, y: Math.floor(p / width), fixture: rgba(a, i), compiled: rgba(b, i) };
          }
        }
      }
      return { diffs, first, painted };
    },
    { width, height },
  );
}

for (const pair of PAIRS) {
  test(pair.name, async (t) => {
    const fixture = await readFile(join(ROOT, pair.fixture), 'utf8');
    const compiled = await readFile(join(ROOT, pair.compiled), 'utf8');
    const size = viewBoxSize(fixture);
    assert.equal(viewBoxSize(compiled).viewBox, size.viewBox, 'viewBox differs');

    for (const state of statesFor(fixture, compiled)) {
      await t.test(state.name, async () => {
        const result = await compare(withCss(fixture, state.css), withCss(compiled, state.css), size.width, size.height);
        if (result.diffs > 0) {
          await mkdir(OUTPUT_DIR, { recursive: true });
          const shot = join(OUTPUT_DIR, `art-${pair.slug}-${state.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`);
          await page.screenshot({ path: shot });
          const { x, y, fixture: was, compiled: now } = result.first;
          assert.fail(
            `${result.diffs} pixel(s) differ; first at (${x + size.minX}, ${y + size.minY}): fixture ${was}, compiled ${now}. Screenshot: ${shot}`,
          );
        }
        assert.ok(result.painted > 0, 'the fixture rendered blank');
      });
    }
  });
}
