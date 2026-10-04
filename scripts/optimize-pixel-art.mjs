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
// checked: 100 KB raw and 25 KB gzip per file (redesign spec §8), except the
// hero island's 500 KB and 125 KB (hero island detail spec R10). Node
// built-ins only.
//
// Usage:
//   npm run art                          validate and compile every scene,
//                                        then write the scenes with an output
//   npm run art -- --check <name>        validate one object or scene
//   npm run art -- --preview <name>      write .art-preview/<name>@{1,2,3,4}x.png
//                                        (name palette: the world palette's swatch sheet)
//   npm run art -- --preview <name> --scale N   also write <name>@Nx.png (N up to 16)
//   npm run art -- --sizes <scene>       print the bytes each object and color adds to
//                                        the compiled scene, against the sources at HEAD
//   npm run art -- --new object <name> [--kind sprite|block] [--extends character] [--size WxH]
//   npm run art -- --new scene <name>    write a starter source
// --source <dir> and --out <dir> replace source/ and the output folder.
// A name can be qualified as objects/<name> or scenes/<name>.
// Exit code 0 when everything is fine, 1 on any problem.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve as resolvePath } from 'node:path';
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
  validate,
} from '../src/lib/pixel-art/engine.mjs';
import { serializeObject, serializeScene } from '../src/lib/pixel-art/serialize.mjs';
import { MAX_NAME, starterBlock, starterExtends, starterScene, starterSprite } from '../src/lib/pixel-art/starter.mjs';
import { toRectSvg } from '../src/lib/pixel-art/svg.mjs';
import { encodePng, previewColors, renderPalette, renderPreview } from './pixel-art-preview.mjs';

const ART_DIR = fileURLToPath(new URL('../src/assets/pixel-art/', import.meta.url));
const SOURCE_DIR = join(ART_DIR, 'source');
const PREVIEW_DIR = '.art-preview';
const MAX_SCALE = 16;
/** Each output's budget in bytes: the engine's, or its own (hero island detail spec R10). */
export const BUDGET = { raw: 100 * 1024, gzip: 25 * 1024 };
export const OUTPUT_BUDGETS = { 'hero-island.svg': { raw: 500 * 1024, gzip: 125 * 1024 } };

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

/**
 * Renders a scene and runs it through the optimizer, lossless check and
 * budget. A preview-only scene gets the engine's budget.
 */
export function compileScene(sources, name) {
  const rects = toRectSvg(renderScene(sources, name), (color) => sources.colors.get(color).hex);
  const output = optimizeSvg(rects);
  verifyLossless(rects, output);
  const [raw, gz] = [Buffer.byteLength(output), gzipSync(output).length];
  const [srcRaw, srcGz] = [Buffer.byteLength(rects), gzipSync(rects).length];
  const budget = OUTPUT_BUDGETS[sources.scenes.get(name).output] ?? BUDGET;
  const over = raw > budget.raw || gz > budget.gzip;
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

async function preview(sources, problems, query, extraScale) {
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
  for (const scale of new Set([1, 2, 3, 4, extraScale ?? 1])) {
    const file = join(PREVIEW_DIR, `${name}@${scale}x.png`);
    await writeFile(file, encodePng(image, scale));
    console.log(`wrote ${file} (${image.width * scale}×${image.height * scale})`);
  }
  return true;
}

/** A scene's compiled size in bytes, raw and gzip, without the lossless check. */
function measure(sources, name) {
  const output = optimizeSvg(toRectSvg(renderScene(sources, name), (color) => sources.colors.get(color).hex));
  return { output, raw: Buffer.byteLength(output), gzip: gzipSync(output).length };
}

/** The scene's items without any that place `object`. */
const withoutObject = (items, object) =>
  items.filter((item) => item.object !== object).map((item) => (item.group ? { ...item, items: withoutObject(item.items, object) } : item));

/** How many times each object is placed. */
function placements(items, counts = new Map()) {
  for (const item of items) {
    if (item.group) placements(item.items, counts);
    else counts.set(item.object, (counts.get(item.object) ?? 0) + 1);
  }
  return counts;
}

/**
 * What each object and each color costs in a compiled scene: the bytes the
 * scene loses, raw and gzip, when the object's items are left out or the
 * color's paths are dropped. Costs overlap a little, so they don't add up to
 * the total exactly.
 */
function sceneSizes(sources, name) {
  const scene = sources.scenes.get(name);
  const total = measure(sources, name);
  const objects = new Map();
  for (const [object, placed] of placements(scene.items)) {
    sources.scenes.set('sizes-probe', { ...scene, output: undefined, items: withoutObject(scene.items, object) });
    const less = measure(sources, 'sizes-probe');
    objects.set(object, { placed, raw: total.raw - less.raw, gzip: total.gzip - less.gzip });
  }
  sources.scenes.delete('sizes-probe');
  // A hex can have several names; the first tier's (world before legacy) wins.
  const names = new Map();
  for (const [color, { hex }] of sources.colors) if (!names.has(hex)) names.set(hex, color);
  const colors = new Map();
  for (const hex of new Set([...total.output.matchAll(/<path fill="(#[0-9A-F]{6})"/g)].map((m) => m[1]))) {
    const less = total.output.replace(new RegExp(`<path fill="${hex}"[^>]*/>`, 'g'), '');
    colors.set(`${names.get(hex) ?? '?'} ${hex}`, { raw: total.raw - Buffer.byteLength(less), gzip: total.gzip - gzipSync(less).length });
  }
  return { raw: total.raw, gzip: total.gzip, objects, colors };
}

/**
 * The sources as committed at HEAD, or the reason they can't be read. They're
 * copied from git into a temp folder, which the caller removes.
 */
async function headSources(dir) {
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  let files;
  try {
    files = git('ls-tree', '-r', '--name-only', 'HEAD', '--', '.').split('\n').filter((f) => f.endsWith('.mjs'));
  } catch {
    return { reason: 'not in a git repository with a HEAD commit' };
  }
  if (!files.length) return { reason: 'no sources at HEAD' };
  const temp = await mkdtemp(join(tmpdir(), 'pixel-art-head-'));
  for (const file of files) {
    await mkdir(dirname(join(temp, file)), { recursive: true });
    await writeFile(join(temp, file), git('show', `HEAD:./${file}`));
  }
  const { sources, loadErrors } = await readSources(temp);
  return { temp, sources, problems: [...loadErrors, ...validate(sources)] };
}

/** Prints what each object and color of a scene costs, against HEAD. */
async function sizes(sources, problems, query, dir) {
  const target = find(sources, problems, query);
  if (!target.scene) throw new Problem(`--sizes takes a scene; ${target.object} is an object`);
  const mine = problems.filter((p) => dependencies(sources, target).has(p.slice(0, p.indexOf(': '))));
  if (mine.length) return printProblems(mine), false;
  const now = sceneSizes(sources, target.scene);
  const head = await headSources(dir);
  let before;
  try {
    if (head.reason) before = { reason: head.reason };
    else if (!head.sources.scenes.has(target.scene)) before = { reason: `${sceneFile(target.scene)} isn't at HEAD` };
    else if (head.problems.some((p) => dependencies(head.sources, target).has(p.slice(0, p.indexOf(': '))))) {
      before = { reason: 'its sources at HEAD have problems' };
    } else before = sceneSizes(head.sources, target.scene);
  } finally {
    if (head.temp) await rm(head.temp, { recursive: true, force: true });
  }
  const bytes = (n) => (n === undefined ? '—' : n.toLocaleString('en-US'));
  const delta = (a, b) => (a === undefined || b === undefined ? '—' : `${a - b >= 0 ? '+' : ''}${(a - b).toLocaleString('en-US')}`);
  const label = sources.scenes.get(target.scene).output ?? `${target.scene} (preview only)`;
  console.log(`${label}: ${bytes(now.raw)} B raw, ${bytes(now.gzip)} B gzip`);
  console.log(before.reason ? `HEAD: not available (${before.reason})` : `HEAD: ${bytes(before.raw)} B raw, ${bytes(before.gzip)} B gzip (${delta(now.raw, before.raw)} raw, ${delta(now.gzip, before.gzip)} gzip)`);
  /** One table, sorted by raw bytes now (then HEAD), largest first. */
  const table = (title, rows, nowRows, headRows, placed) => {
    const keys = [...new Set([...nowRows.keys(), ...(headRows?.keys() ?? [])])];
    const raw = (k) => nowRows.get(k)?.raw ?? -1;
    keys.sort((a, b) => raw(b) - raw(a) || (headRows?.get(b)?.raw ?? 0) - (headRows?.get(a)?.raw ?? 0) || (a < b ? -1 : 1));
    const header = [title, ...(placed ? ['placed'] : []), 'raw', 'Δ raw', 'gzip', 'Δ gzip'];
    const lines = keys.map((k) => {
      const [n, h] = [nowRows.get(k), headRows?.get(k)];
      return [k, ...(placed ? [bytes(n?.placed)] : []), bytes(n?.raw), delta(n?.raw, h?.raw), bytes(n?.gzip), delta(n?.gzip, h?.gzip)];
    });
    const widths = header.map((_, i) => Math.max(...[header, ...lines].map((l) => l[i].length)));
    console.log(`\n${rows}`);
    for (const l of [header, ...lines]) console.log(l.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  '));
  };
  table('object', 'Bytes each object adds (the scene compiled without it), against HEAD:', now.objects, before.objects, true);
  table('color', "Bytes each color's path takes, against HEAD:", now.colors, before.colors, false);
  return true;
}

async function create(sources, dir, kind, name, opts) {
  if (name && name.length > MAX_NAME) throw new Problem(`--new ${kind}: name is ${name.length} characters long, max ${MAX_NAME}`);
  if (!name || !isName(name)) throw new Problem(`--new ${kind}: name ${JSON.stringify(name ?? '')} must be lowercase kebab-case, like small-rock`);
  const file = kind === 'object' ? objectFile(name) : sceneFile(name);
  const path = join(dir, file);
  if (existsSync(path)) throw new Problem(`${file} already exists; edit it, or pick another name`);
  let text;
  if (kind === 'scene') {
    text = serializeScene(starterScene());
  } else if (opts.kind && opts.kind !== 'sprite' && opts.kind !== 'block') {
    throw new Problem(`--kind ${opts.kind} isn't supported; use sprite or block`);
  } else if (opts.kind === 'block') {
    if (opts.size || opts.extends) throw new Problem("--kind block doesn't take --size or --extends; a block's size is in its file, in tiles and levels");
    text = serializeObject(starterBlock());
  } else if (opts.extends) {
    if (opts.size) throw new Problem('--size and --extends don\'t mix: an object that extends another has its size');
    if (!sources.objects.has(opts.extends)) throw new Problem(`--extends ${opts.extends}: no such object`);
    text = serializeObject(starterExtends(sources, opts.extends));
  } else {
    const m = /^(\d+)x(\d+)$/.exec(opts.size ?? '16x16');
    const [w, h] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
    if (!m || w < 1 || h < 1 || w > 64 || h > 64) throw new Problem(`--size ${opts.size}: give WxH, each from 1 to 64`);
    text = serializeObject(starterSprite(w, h));
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
      scale: { type: 'string' },
      sizes: { type: 'string' },
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

  let scale;
  if (values.scale !== undefined) {
    if (!values.preview) throw new Problem('--scale goes with --preview');
    scale = /^\d+$/.test(values.scale) ? Number(values.scale) : 0;
    if (scale < 1 || scale > MAX_SCALE) throw new Problem(`--scale ${values.scale}: give a whole number from 1 to ${MAX_SCALE}`);
  }
  const problems = [...loadErrors, ...validate(sources)];
  if (values.check) return check(sources, problems, values.check);
  if (values.preview) return preview(sources, problems, values.preview, scale);
  if (values.sizes) return sizes(sources, problems, values.sizes, dir);
  if (problems.length) {
    printProblems(problems);
    return false;
  }
  return !(await compileAll(sources, out));
}

if (process.argv[1] && resolvePath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Piped into head, stdout closes early: stop printing, but finish the work.
  process.stdout.on('error', (err) => {
    if (err.code !== 'EPIPE') throw err;
  });
  main(process.argv.slice(2))
    .then((ok) => {
      if (!ok) process.exitCode = 1;
    })
    .catch((err) => {
      console.error(err instanceof Problem || err.code?.startsWith?.('ERR_PARSE_ARGS') ? err.message : `optimize-pixel-art: ${err.stack}`);
      process.exitCode = 1;
    });
}
