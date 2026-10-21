// Exports the explainer asset library (art/explainer-library.pixellab/) for
// videos and infographics (explainer library spec R8): a transparent PNG of
// every object, one per loop frame, and each contact sheet on the preview
// card color, rendered by Pixel Lab's program (scripts/pixellab.mjs).
//
//   npm run explainer-export                  # 8×, into .explainer-export/
//   npm run explainer-export -- --scale 4 --out <dir>
//
// A still object is <name>.png; a looped one is <name>-f<n>.png per frame.
// The base `character` is left out: the people are its outfits.

import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { ensureProgram } from './pixellab.mjs';

const run = promisify(execFile);
const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const DOC = join(ROOT, 'art/explainer-library.pixellab');

/** @param {string[]} args @param {string} doc */
const pixellab = async (args, doc) => (await run(await ensureProgram(), [...args, '--document', doc], { maxBuffer: 64 * 1024 * 1024 })).stdout;

/**
 * The renders to make: one per object frame, then one per scene.
 * @param {{ doc?: string, out: string, scale?: number, only?: string[] }} options
 */
export async function plan({ doc = DOC, out, scale = 8, only }) {
  const list = async (group) => {
    const data = JSON.parse(await pixellab([group, 'list', '--json'], doc));
    return Array.isArray(data) ? data : data[`${group}s`];
  };
  const objects = await list('object');
  const scenes = await list('scene');
  const wanted = (name) => name !== 'character' && (!only || only.includes(name));
  const jobs = [];
  for (const { name, frames } of objects.filter((o) => wanted(o.name))) {
    for (let f = 0; f < frames; f++) {
      const file = join(out, frames > 1 ? `${name}-f${f}.png` : `${name}.png`);
      jobs.push(['object', 'render', name, '--frame', String(f), '--scale', String(scale), '--out', file]);
    }
  }
  for (const { name } of scenes.filter((s) => wanted(s.name))) {
    jobs.push(['art', 'preview', `scenes/${name}`, '--scale', String(scale), '--out', join(out, `${name}.png`)]);
  }
  return jobs;
}

/**
 * Writes the PNGs, a few renders at a time, and returns the files written.
 * @param {{ doc?: string, out: string, scale?: number, only?: string[] }} options
 */
export async function exportLibrary(options) {
  const doc = options.doc ?? DOC;
  await mkdir(options.out, { recursive: true });
  const jobs = await plan({ ...options, doc });
  const files = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      await pixellab(job, doc);
      files.push(job[job.length - 1]);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return files.sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => {
    const i = args.indexOf(name);
    return i === -1 ? fallback : args[i + 1];
  };
  const out = resolve(flag('--out', join(ROOT, '.explainer-export')));
  const scale = Number(flag('--scale', '8'));
  if (!Number.isInteger(scale) || scale < 1 || scale > 16) {
    console.error('--scale must be a whole number from 1 to 16');
    process.exit(1);
  }
  const files = await exportLibrary({ out, scale });
  console.log(`wrote ${files.length} PNGs at ${scale}× to ${out}`);
}
