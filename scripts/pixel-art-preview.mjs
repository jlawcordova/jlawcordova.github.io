// PNG previews of pixel art (pixel-art engine spec R29), from the engine's
// own pixels, with Node built-ins only. An object stands on one 32×16 tile
// outline; a scene shows its viewBox, with only its first data-class
// variant. Both sit on the site's card color, at frame 0 of every loop.
// `npm run art -- --preview <name>` writes them at 1×, 2×, 3× and 4× to the
// git-ignored .art-preview/.

import { readFile } from 'node:fs/promises';
import { crc32, deflateSync } from 'node:zlib';

import { bounds, composite, renderObject, renderScene } from '../src/lib/pixel-art/engine.mjs';
import { TILE_H, TILE_W } from '../src/lib/pixel-art/iso.mjs';

const VARIABLES_CSS = new URL('../src/styles/variables.css', import.meta.url);
const MARGIN = 2;

/**
 * The card color and the grid line color composited over it, as opaque RGB,
 * read from variables.css so a token change carries over.
 * @returns {Promise<{ card: number[], grid: number[] }>}
 */
export async function previewColors() {
  const css = await readFile(VARIABLES_CSS, 'utf8');
  const card = /--color-card:\s*#([0-9A-Fa-f]{6});/.exec(css);
  const grid = /--color-grid:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\);/.exec(css);
  if (!card || !grid) throw new Error('variables.css: --color-card or --color-grid not found');
  const cardRgb = [0, 2, 4].map((i) => parseInt(card[1].slice(i, i + 2), 16));
  const alpha = Number(grid[4]);
  return { card: cardRgb, grid: cardRgb.map((c, i) => Math.round(Number(grid[i + 1]) * alpha + c * (1 - alpha))) };
}

/**
 * The outline of the tile whose top-face center is (0, 0): rows of width 4,
 * 8, … 32, 32, … 8, 4, so every edge steps 2 across for 1 down.
 * @returns {string[]} "x,y" pixels
 */
function tileOutline() {
  const rows = TILE_H;
  const half = (/** @type {number} */ r) => (r < rows / 2 ? 2 * (r + 1) : 2 * (rows - r));
  const inside = (/** @type {number} */ x, /** @type {number} */ r) => r >= 0 && r < rows && x >= -half(r) && x < half(r);
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let x = -half(r); x < half(r); x++) {
      if (!inside(x, r - 1) || !inside(x, r + 1) || !inside(x - 1, r) || !inside(x + 1, r)) out.push(`${x},${r - rows / 2}`);
    }
  }
  if (out.some((p) => Math.abs(Number(p.split(',')[0])) > TILE_W / 2)) throw new Error('tile outline is wider than a tile');
  return out;
}

/**
 * Renders an object (on a tile) or a scene (at its viewBox) to RGBA.
 * @param {import('../src/lib/pixel-art/engine.mjs').Sources} sources
 * @param {{ object?: string, scene?: string }} target
 * @param {{ card: number[], grid: number[] }} colors
 * @returns {{ image: { width: number, height: number, rgba: Buffer }, origin: [number, number] }}
 */
export function renderPreview(sources, target, { card, grid }) {
  /** @type {Map<string, number[]>} */
  const paint = new Map();
  const rgb = (/** @type {string} */ name) => {
    const hex = /** @type {string} */ (sources.colors.get(name)?.hex);
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  };
  let box;
  if (target.scene) {
    const { viewBox, root } = renderScene(sources, target.scene);
    for (const [p, name] of composite(root, { firstVariant: true })) paint.set(p, rgb(name));
    const [x, y, w, h] = viewBox;
    box = { minX: x, minY: y, maxX: x + w - 1, maxY: y + h - 1 };
  } else {
    for (const p of tileOutline()) paint.set(p, grid);
    for (const [p, name] of composite(renderObject(sources, /** @type {string} */ (target.object)))) paint.set(p, rgb(name));
    const b = /** @type {NonNullable<ReturnType<typeof bounds>>} */ (bounds(paint.keys()));
    box = { minX: b.minX - MARGIN, minY: b.minY - MARGIN, maxX: b.maxX + MARGIN, maxY: b.maxY + MARGIN };
  }
  const width = box.maxX - box.minX + 1;
  const height = box.maxY - box.minY + 1;
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) rgba.set([...card, 255], i * 4);
  for (const [p, color] of paint) {
    const [x, y] = p.split(',').map(Number);
    if (x < box.minX || x > box.maxX || y < box.minY || y > box.maxY) continue;
    rgba.set([...color, 255], ((y - box.minY) * width + (x - box.minX)) * 4);
  }
  return { image: { width, height, rgba }, origin: [box.minX, box.minY] };
}

/**
 * An RGBA PNG of the image, scaled up by whole-pixel repetition.
 * @param {{ width: number, height: number, rgba: Buffer }} image
 * @param {number} scale
 */
export function encodePng({ width, height, rgba }, scale) {
  const w = width * scale;
  const h = height * scale;
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / scale);
    for (let x = 0; x < w; x++) {
      const from = (sy * width + Math.floor(x / scale)) * 4;
      rgba.copy(raw, y * stride + 1 + x * 4, from, from + 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, deflate, no filter set, no interlace
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * @param {string} type
 * @param {Buffer} data
 */
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}
