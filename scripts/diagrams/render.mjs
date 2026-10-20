// Renders the blog's diagrams (scripts/diagrams/diagrams.mjs) to the PNGs the
// posts embed, at 2× in Chromium with the site's fonts from Google Fonts. Uses
// the environment's Playwright, as the browser checks do (scripts/e2e/).
//
//   npm run diagrams                      # render every diagram
//   npm run diagrams -- caching-write     # render the ones whose file matches
//
// The PNGs are generated: change a diagram here, then run this.

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { launch, loadPlaywright } from '../e2e/browser.mjs';
import { DIAGRAMS } from './diagrams.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FONTS = 'https://fonts.googleapis.com/css2?family=Silkscreen&family=Sora:wght@400;500;600;700&display=block';

const playwright = await loadPlaywright();
if (!playwright) {
  console.error('Playwright not found: diagrams NOT RENDERED');
  process.exit(2);
}

const wanted = process.argv.slice(2);
const browser = await launch(playwright);
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1600, height: 1200 } });
try {
  for (const { file, draw } of DIAGRAMS.filter((d) => !wanted.length || wanted.some((w) => d.file.includes(w)))) {
    await page.setContent(`<!doctype html><html><head><link rel="stylesheet" href="${FONTS}"><style>body{margin:0}svg{display:block}</style></head><body>${await draw()}</body></html>`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await document.fonts.load('600 13px Sora');
      await document.fonts.load('400 13px Sora');
      await document.fonts.load('10px Silkscreen');
      await document.fonts.ready;
    });
    const png = await page.locator('svg').first().screenshot({ type: 'png' });
    await writeFile(join(ROOT, file), png);
    console.log(`wrote ${file}`);
  }
} finally {
  await browser.close();
}
