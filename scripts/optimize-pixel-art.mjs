// `npm run art`: compiles the pixel-art sources in src/assets/pixel-art/source/
// (palette.mjs, objects/*.mjs and scenes/*.mjs) into the compact SVGs in
// src/assets/pixel-art/ (pixel-art engine spec D6, R38).
//
// Each scene renders with the engine to a rect SVG, one <rect> per run, which
// optimizeSvg() below turns into paths: each <g fill> group made only of rects
// becomes one <path> of merged runs. Every other element, attribute and the
// order are kept, so the CSS classes, data-class variants and z-order still
// work. verifyLossless() then checks that every fill group covers exactly the
// same pixels as before and that nothing else changed, and the budget is
// checked (redesign spec §8: 100 KB raw, 25 KB gzip). Node built-ins only.
//
// Usage:
//   npm run art                          validate and compile every scene,
//                                        then write the scenes with an output
//   npm run art -- --check <name>        validate one object or scene
//   npm run art -- --preview <name>      write .art-preview/<name>@{1,2,3,4}x.png
//                                        (name palette: the world palette's swatch sheet)
//   npm run art -- --new object <name> [--kind sprite|block] [--extends character] [--size WxH]
//   npm run art -- --new scene <name>    write a starter source
// --source <dir> and --out <dir> replace source/ and the output folder.
// A name can be qualified as objects/<name> or scenes/<name>.
// Exit code 0 when everything is fine, 1 on any problem.

import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

import {
  describeObject,
  isName,
  loadSources,
  objectFile,
  renderScene,
  resolve,
  sceneFile,
  usedKeys,
  validate,
} from '../src/lib/pixel-art/engine.mjs';
import { serializeObject, serializeScene } from '../src/lib/pixel-art/serialize.mjs';
import { toRectSvg } from '../src/lib/pixel-art/svg.mjs';
import { encodePng, previewColors, renderPalette, renderPreview } from './pixel-art-preview.mjs';

const ART_DIR = fileURLToPath(new URL('../src/assets/pixel-art/', import.meta.url));
const SOURCE_DIR = join(ART_DIR, 'source');
const PREVIEW_DIR = '.art-preview';
const MAX_RAW = 100 * 1024;
const MAX_GZIP = 25 * 1024;

// Just enough XML for the sources: elements with double-quoted attributes,
// and text. Comments, CDATA and processing instructions are refused.
const TOKEN = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>|([^<]+)/y;
const ATTR = /([\w:-]+)="([^"]*)"/g;

/** Parses the sources' markup into { name, attrs, children, selfClosing } and { text } nodes. */
export function parse(source) {
  const root = { children: [] };
  const stack = [root];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < source.length) {
    const at = TOKEN.lastIndex;
    const m = TOKEN.exec(source);
    if (!m) throw new Error(`Unsupported markup at offset ${at}: ${source.slice(at, at + 40)}`);
    const [, closing, name, attrText, selfClosing, text] = m;
    const parent = stack[stack.length - 1];
    if (text !== undefined) {
      parent.children.push({ text });
    } else if (closing) {
      if (stack.length === 1 || parent.name !== name) throw new Error(`Unsupported markup: unexpected </${name}> at offset ${at}`);
      stack.pop();
    } else {
      const attrs = [...attrText.matchAll(ATTR)].map(([, k, v]) => [k, v]);
      const el = { name, attrs, children: [], selfClosing: Boolean(selfClosing) };
      parent.children.push(el);
      if (!selfClosing) stack.push(el);
    }
  }
  if (stack.length !== 1) throw new Error(`Unsupported markup: <${stack[stack.length - 1].name}> is never closed`);
  return root.children;
}

export const attr = (el, key) => el.attrs.find(([k]) => k === key)?.[1];
const attrsText = (attrs) => attrs.map(([k, v]) => ` ${k}="${v}"`).join('');

function serialize(nodes) {
  return nodes
    .map((n) => {
      if (n.text !== undefined) return n.text;
      if (n.selfClosing) return `<${n.name}${attrsText(n.attrs)}/>`;
      return `<${n.name}${attrsText(n.attrs)}>${serialize(n.children)}</${n.name}>`;
    })
    .join('');
}

/** A <g fill> whose children are all <rect>s (at least one). */
export function isRectGroup(el) {
  return (
    el.name === 'g' &&
    attr(el, 'fill') !== undefined &&
    el.children.length > 0 &&
    el.children.every((c) => c.name === 'rect')
  );
}

function wholeNumber(rect, key) {
  const raw = attr(rect, key) ?? (key === 'x' || key === 'y' ? '0' : undefined);
  if (raw === undefined || !/^-?\d+$/.test(raw)) {
    throw new Error(`Only whole-number rects are supported; got ${key}="${raw}"`);
  }
  return Number(raw);
}

/** Pixels as a Set of "x,y" keys. */
export function rectPixels(rects) {
  const pixels = new Set();
  for (const r of rects) {
    const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((k) => wholeNumber(r, k));
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) pixels.add(`${x + dx},${y + dy}`);
  }
  return pixels;
}

/**
 * Path data for a pixel set: horizontal runs per row, then runs with the same
 * x and width in consecutive rows merged into one taller rectangle.
 */
function pathData(pixels) {
  const rows = new Map();
  for (const key of pixels) {
    const [x, y] = key.split(',').map(Number);
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push(x);
  }
  // Runs per row, keyed "x,w" so the row below can be checked in O(1).
  const runs = new Map();
  for (const [y, xs] of rows) {
    xs.sort((a, b) => a - b);
    const rowRuns = new Map();
    for (let i = 0; i < xs.length; ) {
      let j = i;
      while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
      rowRuns.set(`${xs[i]},${j - i + 1}`, { x: xs[i], w: j - i + 1 });
      i = j + 1;
    }
    runs.set(y, rowRuns);
  }
  let d = '';
  for (const y of [...runs.keys()].sort((a, b) => a - b)) {
    for (const [key, { x, w }] of [...runs.get(y)].sort(([, a], [, b]) => a.x - b.x)) {
      let h = 1;
      while (runs.get(y + h)?.has(key)) {
        runs.get(y + h).delete(key);
        h++;
      }
      d += `M${x} ${y}h${w}v${h}h-${w}z`;
    }
  }
  return d;
}

function optimizeNodes(nodes) {
  return nodes.map((n) => {
    if (n.text !== undefined) return n;
    if (isRectGroup(n)) {
      return { name: 'path', attrs: [...n.attrs, ['d', pathData(rectPixels(n.children))]], children: [], selfClosing: true };
    }
    return { ...n, children: optimizeNodes(n.children) };
  });
}

/** Rect form → path form. Throws on markup it doesn't understand. */
export function optimizeSvg(source) {
  return serialize(optimizeNodes(parse(source)));
}

const PATH_RUN = /M(-?\d+) (-?\d+)h(\d+)v(\d+)h-(\d+)z/y;

function pathPixels(d) {
  const pixels = new Set();
  PATH_RUN.lastIndex = 0;
  while (PATH_RUN.lastIndex < d.length) {
    const m = PATH_RUN.exec(d);
    if (!m || m[3] !== m[5]) throw new Error(`Unexpected path data: ${d.slice(PATH_RUN.lastIndex, PATH_RUN.lastIndex + 40)}`);
    const [x, y, w, h] = m.slice(1, 5).map(Number);
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) pixels.add(`${x + dx},${y + dy}`);
  }
  return pixels;
}

/**
 * Flattens a tree into a sequence of steps, with each fill group (source) or
 * generated path (output) reduced to its fill, other attributes and pixels.
 */
function steps(nodes, out = []) {
  for (const n of nodes) {
    if (n.text !== undefined) out.push({ text: n.text });
    else if (isRectGroup(n)) out.push({ pixels: rectPixels(n.children), attrs: n.attrs });
    else if (n.name === 'path' && attr(n, 'd') !== undefined) {
      out.push({ pixels: pathPixels(attr(n, 'd')), attrs: n.attrs.filter(([k]) => k !== 'd') });
    } else {
      out.push({ open: `<${n.name}${attrsText(n.attrs)}>` });
      steps(n.children, out);
      out.push({ close: n.name });
    }
  }
  return out;
}

const sameSet = (a, b) => a.size === b.size && [...a].every((p) => b.has(p));

/** Throws unless `output` draws exactly the same pixels, groups and structure as `source`. */
export function verifyLossless(source, output) {
  const a = steps(parse(source));
  const b = steps(parse(output));
  if (a.length !== b.length) throw new Error(`Structure changed: ${a.length} steps before, ${b.length} after`);
  for (let i = 0; i < a.length; i++) {
    const [x, y] = [a[i], b[i]];
    if (x.pixels && y.pixels) {
      const label = `fill group ${attr(x, 'fill') ?? attrsText(x.attrs)} (step ${i})`;
      if (attrsText(x.attrs) !== attrsText(y.attrs)) throw new Error(`Attributes changed on ${label}`);
      if (!sameSet(x.pixels, y.pixels)) throw new Error(`Pixels changed in ${label}: ${x.pixels.size} before, ${y.pixels.size} after`);
    } else if (JSON.stringify(x) !== JSON.stringify(y)) {
      throw new Error(`Structure changed at step ${i}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`);
    }
  }
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/** Thrown for a problem the user can fix; printed without a stack. */
class Problem extends Error {}

/**
 * Loads palette.mjs, objects/*.mjs and scenes/*.mjs from a source folder.
 * A file that can't be imported is reported like any other problem.
 */
export async function readSources(dir) {
  const loadErrors = [];
  const load = async (file) => {
    try {
      return (await import(pathToFileURL(join(dir, file)).href)).default;
    } catch (err) {
      loadErrors.push(`${file}: cannot be loaded: ${err.message.split('\n')[0]}`);
      return undefined;
    }
  };
  const folder = async (sub) => {
    const files = existsSync(join(dir, sub)) ? (await readdir(join(dir, sub))).filter((f) => f.endsWith('.mjs')).sort() : [];
    const out = {};
    for (const f of files) {
      const data = await load(`${sub}/${f}`);
      if (data !== undefined) out[f.slice(0, -'.mjs'.length)] = data;
    }
    return out;
  };
  const palette = await load('palette.mjs');
  const sources = loadSources({ palette, objects: await folder('objects'), scenes: await folder('scenes') });
  return { sources, loadErrors };
}

/** Renders a scene and runs it through the optimizer, lossless check and budget. */
export function compileScene(sources, name) {
  const rects = toRectSvg(renderScene(sources, name), (color) => sources.colors.get(color).hex);
  const output = optimizeSvg(rects);
  verifyLossless(rects, output);
  const [raw, gz] = [Buffer.byteLength(output), gzipSync(output).length];
  const [srcRaw, srcGz] = [Buffer.byteLength(rects), gzipSync(rects).length];
  const over = raw > MAX_RAW || gz > MAX_GZIP;
  return { output, over, report: `${kb(srcRaw)} / ${kb(srcGz)} gzip → ${kb(raw)} / ${kb(gz)} gzip, lossless${over ? ' — OVER BUDGET' : ''}` };
}

/**
 * Finds an object or scene by name, or by objects/<name> or scenes/<name>.
 * A file that exists but didn't load is found too, so its load error is what
 * gets reported.
 */
function find(sources, problems, query) {
  const m = /^(objects|scenes)\/(.+?)(?:\.mjs)?$/.exec(query);
  const name = m ? m[2] : query;
  const failed = (file) => problems.some((p) => p.startsWith(`${file}: cannot be loaded: `));
  const asObject = !m || m[1] === 'objects';
  const asScene = !m || m[1] === 'scenes';
  const isObject = asObject && (sources.objects.has(name) || failed(objectFile(name)));
  const isScene = asScene && (sources.scenes.has(name) || failed(sceneFile(name)));
  if (isObject && isScene) throw new Problem(`${name} is both an object and a scene; say objects/${name} or scenes/${name}`);
  if (!isObject && !isScene) throw new Problem(`no object or scene named ${query}`);
  return isObject ? { object: name, file: objectFile(name) } : { scene: name, file: sceneFile(name) };
}

/** The files a check of one object or scene covers: it, and everything it uses. */
function dependencies(sources, target) {
  const files = new Set(['palette.mjs']);
  // A name is added even when its file didn't load, so its load error shows.
  const addObject = (name) => {
    for (let n = name; typeof n === 'string' && !files.has(objectFile(n)); n = sources.objects.get(n)?.extends) {
      files.add(objectFile(n));
    }
  };
  const addItems = (items) => {
    for (const item of Array.isArray(items) ? items : []) {
      if (item?.group) addItems(item.items);
      else if (typeof item?.object === 'string') addObject(item.object);
    }
  };
  if (target.object) addObject(target.object);
  else {
    files.add(sceneFile(target.scene));
    addItems(sources.scenes.get(target.scene)?.items);
  }
  return files;
}

function printProblems(problems) {
  for (const p of problems) console.error(p);
  console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'}; nothing written.`);
}

async function compileAll(sources, out) {
  let failed = false;
  for (const name of sources.scenes.keys()) {
    const scene = sources.scenes.get(name);
    const { output, over, report } = compileScene(sources, name);
    failed ||= over;
    if (scene.output) {
      await mkdir(out, { recursive: true });
      await writeFile(join(out, scene.output), output);
      console.log(`${scene.output}: ${report}`);
    } else {
      console.log(`${name} (preview only, not written): ${report}`);
    }
  }
  return failed;
}

function check(sources, problems, query) {
  const target = find(sources, problems, query);
  const files = dependencies(sources, target);
  const mine = problems.filter((p) => files.has(p.slice(0, p.indexOf(': '))));
  if (mine.length) {
    printProblems(mine);
    return false;
  }
  if (target.object) {
    console.log(`${target.file}: ok · ${describeObject(sources, resolve(sources, target.object))}`);
  } else {
    const scene = sources.scenes.get(target.scene);
    const objects = [...files].filter((f) => f.startsWith('objects/')).length;
    const [, , w, h] = scene.viewBox;
    const output = scene.output ? `output ${scene.output}` : 'preview only';
    console.log(`${target.file}: ok · ${w}×${h} · ${countItems(scene.items)} items · ${objects} objects · ${output}`);
  }
  return true;
}

const countItems = (items) => items.reduce((n, item) => n + (item.group ? countItems(item.items) : 1), 0);

async function preview(sources, problems, query) {
  // The swatch sheet of the world palette (R31), not an object or a scene.
  const sheet = query === 'palette';
  if (sheet) {
    const mine = problems.filter((p) => p.startsWith('palette.mjs: '));
    if (mine.length) return printProblems(mine), false;
  } else if (!check(sources, problems, query)) return false;
  const target = sheet ? undefined : find(sources, problems, query);
  const colors = await previewColors();
  const { image } = target ? renderPreview(sources, target, colors) : renderPalette(sources, colors);
  await mkdir(PREVIEW_DIR, { recursive: true });
  const name = target ? (target.object ?? target.scene) : 'palette';
  for (const scale of [1, 2, 3, 4]) {
    const file = join(PREVIEW_DIR, `${name}@${scale}x.png`);
    await writeFile(file, encodePng(image, scale));
    console.log(`wrote ${file} (${image.width * scale}×${image.height * scale})`);
  }
  return true;
}

/** The nearest color by value in the allowed tiers, for re-keying a legacy base. */
function nearest(sources, hex, tiers) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = rgb(hex);
  let best = null;
  for (const [name, color] of sources.colors) {
    if (!tiers.includes(color.tier)) continue;
    const [r2, g2, b2] = rgb(color.hex);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (!best || d < best.d) best = { name, d };
  }
  return best?.name;
}

async function create(sources, dir, kind, name, opts) {
  if (name && name.length > 64) throw new Problem(`--new ${kind}: name is ${name.length} characters long, max 64`);
  if (!name || !isName(name)) throw new Problem(`--new ${kind}: name ${JSON.stringify(name ?? '')} must be lowercase kebab-case, like small-rock`);
  const file = kind === 'object' ? objectFile(name) : sceneFile(name);
  const path = join(dir, file);
  if (existsSync(path)) throw new Problem(`${file} already exists; edit it, or pick another name`);
  let text;
  if (kind === 'scene') {
    text = serializeScene({ viewBox: [-64, -64, 128, 128], origin: [0, 0], items: [] });
  } else if (opts.kind && opts.kind !== 'sprite' && opts.kind !== 'block') {
    throw new Problem(`--kind ${opts.kind} isn't supported; use sprite or block`);
  } else if (opts.kind === 'block') {
    if (opts.size || opts.extends) throw new Problem("--kind block doesn't take --size or --extends; a block's size is in its file, in tiles and levels");
    text = serializeObject({ kind: 'block', size: [1, 1, 1], faces: { top: 'grass-2', left: 'soil-2', right: 'soil-3' } });
  } else if (opts.extends) {
    if (opts.size) throw new Problem('--size and --extends don\'t mix: an object that extends another has its size');
    if (!sources.objects.has(opts.extends)) throw new Problem(`--extends ${opts.extends}: no such object`);
    // A new object may not paint legacy colors, so every legacy key it
    // inherits is re-keyed to the nearest allowed color. Then it validates
    // as it is, and its rows can be overridden one at a time.
    const base = resolve(sources, opts.extends);
    const tiers = base.character ? ['world', 'outfit'] : ['world'];
    const keys = {};
    for (const key of usedKeys(base)) {
      const color = sources.colors.get(base.keys[key]);
      if (color && !tiers.includes(color.tier)) keys[key] = nearest(sources, color.hex, tiers);
    }
    text = serializeObject({ kind: 'sprite', extends: opts.extends, keys, rows: {} });
  } else {
    const m = /^(\d+)x(\d+)$/.exec(opts.size ?? '16x16');
    const [w, h] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
    if (!m || w < 1 || h < 1 || w > 64 || h > 64) throw new Problem(`--size ${opts.size}: give WxH, each from 1 to 64`);
    text = serializeObject({ kind: 'sprite', anchor: [Math.floor(w / 2), h - 1], keys: { o: 'ink' }, layers: [{ map: Array(h).fill('.'.repeat(w)) }] });
  }
  await mkdir(join(dir, kind === 'object' ? 'objects' : 'scenes'), { recursive: true });
  await writeFile(path, text);
  console.log(`wrote ${relative(process.cwd(), path) || path}`);
  console.log(`Next: edit it, then npm run art -- --check ${name} and --preview ${name}.`);
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      check: { type: 'string' },
      preview: { type: 'string' },
      new: { type: 'string' },
      kind: { type: 'string' },
      extends: { type: 'string' },
      size: { type: 'string' },
      source: { type: 'string' },
      out: { type: 'string' },
    },
  });
  const dir = resolvePath(values.source ?? SOURCE_DIR);
  const out = resolvePath(values.out ?? ART_DIR);
  const { sources, loadErrors } = await readSources(dir);

  if (values.new) {
    if (values.new !== 'object' && values.new !== 'scene') throw new Problem('--new takes object or scene, then a name');
    if (positionals.length !== 1) throw new Problem(`--new ${values.new} takes one name`);
    await create(sources, dir, values.new, positionals[0], values);
    const after = await readSources(dir);
    const problems = [...after.loadErrors, ...validate(after.sources)];
    return check(after.sources, problems, `${values.new}s/${positionals[0]}`);
  }
  if (positionals.length) throw new Problem(`unexpected ${positionals.join(' ')}`);

  const problems = [...loadErrors, ...validate(sources)];
  if (values.check) return check(sources, problems, values.check);
  if (values.preview) return preview(sources, problems, values.preview);
  if (problems.length) {
    printProblems(problems);
    return false;
  }
  return !(await compileAll(sources, out));
}

if (process.argv[1] && resolvePath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2))
    .then((ok) => {
      if (!ok) process.exitCode = 1;
    })
    .catch((err) => {
      console.error(err instanceof Problem || err.code?.startsWith?.('ERR_PARSE_ARGS') ? err.message : `optimize-pixel-art: ${err.stack}`);
      process.exitCode = 1;
    });
}
