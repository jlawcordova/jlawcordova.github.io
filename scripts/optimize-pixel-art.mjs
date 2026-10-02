// Converts the pixel-art sources in src/assets/pixel-art/source/*.src.svg,
// where every pixel is a <rect>, into compact SVGs in src/assets/pixel-art/.
// Each <g fill> group made only of rects becomes one <path> of merged runs.
// Every other element, attribute and the order are kept, so the CSS classes,
// data-class variants and z-order still work. Node built-ins only.
//
// After converting, it checks that every fill group covers exactly the same
// pixels as before and that nothing else changed; any difference exits 1.
// It also fails if a file is over budget (spec §8: 100 KB raw, 25 KB gzip).
//
// Usage: npm run art

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ART_DIR = fileURLToPath(new URL('../src/assets/pixel-art/', import.meta.url));
const SOURCE_DIR = join(ART_DIR, 'source');
const MAX_RAW = 100 * 1024;
const MAX_GZIP = 25 * 1024;

// Just enough XML for the sources: elements with double-quoted attributes,
// and text. Comments, CDATA and processing instructions are refused.
const TOKEN = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>|([^<]+)/y;
const ATTR = /([\w:-]+)="([^"]*)"/g;

function parse(source) {
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

const attr = (el, key) => el.attrs.find(([k]) => k === key)?.[1];
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
function isRectGroup(el) {
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
function rectPixels(rects) {
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

async function main() {
  const files = (await readdir(SOURCE_DIR)).filter((f) => f.endsWith('.src.svg')).sort();
  let failed = false;
  for (const file of files) {
    const source = await readFile(join(SOURCE_DIR, file), 'utf8');
    const output = optimizeSvg(source);
    verifyLossless(source, output);
    const target = join(ART_DIR, file.replace(/\.src\.svg$/, '.svg'));
    await writeFile(target, output);
    const [raw, gz] = [Buffer.byteLength(output), gzipSync(output).length];
    const [srcRaw, srcGz] = [Buffer.byteLength(source), gzipSync(source).length];
    const over = raw > MAX_RAW || gz > MAX_GZIP;
    failed ||= over;
    console.log(
      `${file}: ${kb(srcRaw)} / ${kb(srcGz)} gzip → ${kb(raw)} / ${kb(gz)} gzip, lossless${over ? ' — OVER BUDGET' : ''}`,
    );
  }
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`optimize-pixel-art: ${err.message}`);
    process.exitCode = 1;
  });
}
