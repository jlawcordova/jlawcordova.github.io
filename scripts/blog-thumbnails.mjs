// The blog's thumbnails: one preview-only `thumb-<key>` scene per post in the
// Pixel Lab document, rendered on the card color to a 1200×630 PNG at
// static/public/thumbnails/<key>.png. Each is the post's featured image: the
// featured card, the related-post cards and the link preview (og:image).
//
//   npm run thumbnails             # render every thumbnail
//   npm run thumbnails -- rest     # render one, by key
//
// The PNGs are generated: change the scene (or the objects it places), then
// run this. scripts/blog-thumbnails.test.mjs fails when a PNG is stale.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readSources } from 'pixellab/compile';
import { encodePng, previewColors, renderPreview } from 'pixellab/preview';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const DOCUMENT = join(ROOT, 'src/assets/pixel-art/jlawcordova.pixellab');

/** Every thumbnail scene's viewBox is this size, drawn at SCALE: 1200×630. */
export const WIDTH = 240;
export const HEIGHT = 126;
export const SCALE = 5;

/** One entry per post: its file name (without .md) and its thumbnail key. */
export const THUMBNAILS = [
  { post: '2019-04-28-rest-in-a-nutshell', key: 'rest' },
  { post: '2020-11-28-creating-unit-test-coverage-reports-for-aspnet-core-3.1-projects-with-coverlet-and-reportgenerator', key: 'coverlet' },
  { post: '2020-12-05-JWT-for-authorization-in-microservice-architectured-systems', key: 'jwt' },
  { post: '2020-12-12-collecting-and-monitoring-application-metrics-with-elastic-search-logstash-kibana-and-filebeat-ELK', key: 'elk' },
  { post: '2020-12-19-documenting-aspnet-core-3.1-api-projects-code-first-with-nswag', key: 'nswag' },
  { post: '2021-01-02-setting-up-continuous-integration-for-an-aspnet-core-project-with-github-actions', key: 'github-actions' },
  { post: '2021-01-09-running-an-aspnet-core-api-project-in-a-docker-container', key: 'docker' },
  { post: '2021-02-14-creating-uml-diagrams-in-visual-studio-code', key: 'uml' },
  { post: '2021-04-06-using-caching-to-create-performant-apis', key: 'caching' },
  { post: '2021-05-01-creating-a-graphql-endpoint-in-nestjs', key: 'graphql' },
  { post: '2022-01-08-mocking-apis-with-prism', key: 'prism' },
  { post: '2023-07-16-taking-on-the-cloud-resume-challenge', key: 'cloud-resume' },
  { post: '2023-12-26-2023-in-review', key: '2023-in-review' },
];

export const sceneFor = (/** @type {string} */ key) => `thumb-${key}`;
export const urlFor = (/** @type {string} */ key) => `/public/thumbnails/${key}.png`;
export const fileFor = (/** @type {string} */ key) => join(ROOT, 'static', urlFor(key));

/**
 * Reads the document and the card color its previews use.
 */
export async function loadDocument() {
  const { sources, loadErrors } = await readSources(DOCUMENT);
  if (loadErrors.length) throw new Error(loadErrors.join('\n'));
  const { default: manifest } = await import(join(DOCUMENT, 'manifest.json'), { with: { type: 'json' } });
  return { sources, colors: previewColors(manifest.preview) };
}

/**
 * The thumbnail's PNG: the scene's viewBox on the card color, at SCALE.
 * @param {Awaited<ReturnType<typeof loadDocument>>} doc
 * @param {string} key
 */
export function renderThumbnail({ sources, colors }, key) {
  const { image } = renderPreview(sources, { scene: sceneFor(key) }, colors);
  if (image.width !== WIDTH || image.height !== HEIGHT) {
    throw new Error(`scenes/${sceneFor(key)}.mjs is ${image.width}×${image.height}; a thumbnail's viewBox is ${WIDTH}×${HEIGHT}`);
  }
  return encodePng(image, SCALE);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const wanted = process.argv.slice(2);
  const unknown = wanted.filter((key) => !THUMBNAILS.some((t) => t.key === key));
  if (unknown.length) {
    console.error(`unknown thumbnail ${unknown.join(', ')}; keys: ${THUMBNAILS.map((t) => t.key).join(', ')}`);
    process.exit(1);
  }
  const doc = await loadDocument();
  for (const { key } of THUMBNAILS.filter((t) => !wanted.length || wanted.includes(t.key))) {
    const file = fileFor(key);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, renderThumbnail(doc, key));
    console.log(`scenes/${sceneFor(key)} → static${urlFor(key)} (${WIDTH * SCALE}×${HEIGHT * SCALE})`);
  }
}
