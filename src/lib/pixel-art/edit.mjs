// @ts-check
// Edits to object sources, for the editor's Object mode (pixel-art engine
// spec D9.5, R17). Each function changes a source document in place and keeps
// it in the canonical shape, so what the editor exports is what a person would
// write by hand. No DOM, so `npm test` covers it.
//
// A sprite either has its own `layers`, or `extends` another object and
// overrides whole rows of its map layers. Painting an object that extends
// another writes the painted row as an override, and drops the override again
// when the row matches the base.

import { isKey, layerMaps, resolve } from './engine.mjs';

/**
 * @typedef {{ layer: number, frame: number }} Where
 * @typedef {import('./engine.mjs').Sources} Sources
 */

/** Keys tried for a new color after its own initial: lowercase, uppercase, digits, then punctuation. */
const KEY_ORDER = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-=?@^_~:;<>/|()[]{}"`,\\\'';

/**
 * The map a layer shows at a frame: a frame loop shows frame `frame`, or its
 * last frame if it has fewer.
 * @param {any} layer
 * @param {number} frame
 * @returns {string[]}
 */
export function mapAt(layer, frame) {
  const maps = layerMaps(layer);
  return maps[Math.min(frame, maps.length - 1)];
}

/**
 * The key for a color: the one already mapped to it, or a new one, added to
 * the document's own `keys` (after the inherited ones, so it paints last).
 * @param {any} doc
 * @param {Record<string, string>} keys  the resolved keys
 * @param {string} color
 */
export function keyFor(doc, keys, color) {
  const found = Object.keys(keys).find((k) => keys[k] === color);
  if (found) return found;
  const initial = color[0] ?? 'a';
  const candidates = [initial, initial.toUpperCase(), ...KEY_ORDER];
  const key = /** @type {string} */ (candidates.find((k) => isKey(k) && !(k in keys)));
  doc.keys = { ...(doc.keys ?? {}), [key]: color };
  return key;
}

/**
 * Sets pixels on one layer and frame to a color, or clears them (`null`).
 * Pixels outside the map are ignored. Returns how many changed.
 * @param {Sources} sources  sources that hold `doc` as `name`
 * @param {string} name
 * @param {any} doc
 * @param {Where} where
 * @param {[number, number][]} pixels
 * @param {string | null} color
 */
export function paint(sources, name, doc, { layer, frame }, pixels, color) {
  const resolved = resolve(sources, name);
  const source = resolved.layers[layer];
  if (!source) return 0;
  const map = mapAt(source, frame);
  const ch = color === null ? '.' : keyFor(doc, resolved.keys, color);
  /** @type {Map<number, string[]>} */
  const rows = new Map();
  let changed = 0;
  for (const [x, y] of pixels) {
    if (y < 0 || y >= map.length || x < 0 || x >= map[y].length) continue;
    const row = rows.get(y) ?? [...map[y]];
    if (row[x] !== ch) changed++;
    row[x] = ch;
    rows.set(y, row);
  }
  if (changed === 0) return 0;
  if (doc.extends) {
    if ('frames' in source) throw new Error(`layer ${layer} is a frame loop; an object that extends another can only override map layers`);
    const base = resolve(sources, doc.extends).layers[layer];
    const baseMap = /** @type {string[]} */ (layerMaps(base)[0]);
    /** @type {Record<string, Record<string, string>>} */
    const overrides = { ...(doc.rows ?? {}) };
    const mine = { ...(overrides[layer] ?? {}) };
    for (const [y, row] of rows) {
      const text = row.join('');
      if (text === baseMap[y]) delete mine[y];
      else mine[y] = text;
    }
    // Rows in order, so the canonical source lists them top to bottom.
    const sorted = Object.fromEntries(Object.keys(mine).map(Number).sort((a, b) => a - b).map((y) => [y, mine[y]]));
    if (Object.keys(sorted).length) overrides[layer] = sorted;
    else delete overrides[layer];
    doc.rows = Object.fromEntries(Object.keys(overrides).map(Number).sort((a, b) => a - b).map((l) => [l, overrides[l]]));
  } else {
    const target = 'frames' in doc.layers[layer] ? doc.layers[layer].frames[Math.min(frame, doc.layers[layer].frames.length - 1)] : doc.layers[layer].map;
    for (const [y, row] of rows) target[y] = row.join('');
  }
  return changed;
}

/**
 * The 4-connected pixels that share the start pixel's key, for Fill.
 * @param {string[]} map
 * @param {number} x
 * @param {number} y
 * @returns {[number, number][]}
 */
export function floodFill(map, x, y) {
  if (y < 0 || y >= map.length || x < 0 || x >= map[y].length) return [];
  const target = map[y][x];
  const seen = new Set([`${x},${y}`]);
  /** @type {[number, number][]} */
  const out = [];
  const stack = [[x, y]];
  while (stack.length) {
    const [px, py] = /** @type {number[]} */ (stack.pop());
    out.push([px, py]);
    for (const [nx, ny] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]]) {
      if (ny < 0 || ny >= map.length || nx < 0 || nx >= map[ny].length || map[ny][nx] !== target || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`);
      stack.push([nx, ny]);
    }
  }
  return out;
}

/**
 * The color at a pixel, for the Picker, or null if it's transparent.
 * @param {import('./engine.mjs').Resolved} resolved
 * @param {Where} where
 * @param {number} x
 * @param {number} y
 */
export function colorAt(resolved, { layer, frame }, x, y) {
  const source = resolved.layers[layer];
  const ch = source ? mapAt(source, frame)[y]?.[x] : undefined;
  return ch && ch !== '.' ? (resolved.keys[ch] ?? null) : null;
}

/**
 * The rows an object overrides, per layer, top to bottom.
 * @param {any} doc
 * @returns {Record<number, number[]>}
 */
export function overriddenRows(doc) {
  /** @type {Record<number, number[]>} */
  const out = {};
  for (const [layer, rows] of Object.entries(doc.rows ?? {})) out[Number(layer)] = Object.keys(rows).map(Number).sort((a, b) => a - b);
  return out;
}

/**
 * Pads or crops every map of a sprite with its own layers to `width` ×
 * `height`, at the right and the bottom.
 * @param {any} doc
 * @param {number} width
 * @param {number} height
 */
export function resize(doc, width, height) {
  const fit = (/** @type {string[]} */ map) =>
    Array.from({ length: height }, (_, y) => (map[y] ?? '').slice(0, width).padEnd(width, '.'));
  for (const layer of doc.layers) {
    if ('frames' in layer) layer.frames = layer.frames.map(fit);
    else layer.map = fit(layer.map);
  }
}

/**
 * A blank map the size of the object's others.
 * @param {any} doc
 */
const blank = (doc) => {
  const first = layerMaps(doc.layers[0])[0];
  return Array(first.length).fill('.'.repeat(first[0].length));
};

/** @param {any} doc */
export function addLayer(doc) {
  doc.layers.push({ map: blank(doc) });
  return doc.layers.length - 1;
}

/**
 * @param {any} doc
 * @param {number} index
 */
export function duplicateLayer(doc, index) {
  doc.layers.splice(index + 1, 0, JSON.parse(JSON.stringify(doc.layers[index])));
  return index + 1;
}

/**
 * Deletes a layer, unless it's the last one. Returns the layer to select.
 * @param {any} doc
 * @param {number} index
 */
export function deleteLayer(doc, index) {
  if (doc.layers.length <= 1) return index;
  doc.layers.splice(index, 1);
  return Math.min(index, doc.layers.length - 1);
}

/**
 * Moves an item in a list by `delta`; returns its new index.
 * @param {any[]} list
 * @param {number} index
 * @param {number} delta
 */
export function move(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return index;
  [list[index], list[target]] = [list[target], list[index]];
  return target;
}

/**
 * Adds a blank frame after `index` to a frame loop. Returns its index.
 * @param {any} doc
 * @param {number} layer
 * @param {number} index
 */
export function addFrame(doc, layer, index) {
  const frames = doc.layers[layer].frames;
  frames.splice(index + 1, 0, frames[index].map((/** @type {string} */ row) => '.'.repeat(row.length)));
  return index + 1;
}

/**
 * @param {any} doc
 * @param {number} layer
 * @param {number} index
 */
export function duplicateFrame(doc, layer, index) {
  const frames = doc.layers[layer].frames;
  frames.splice(index + 1, 0, [...frames[index]]);
  return index + 1;
}

/**
 * Deletes a frame, unless it's the last one. Returns the frame to show.
 * @param {any} doc
 * @param {number} layer
 * @param {number} index
 */
export function deleteFrame(doc, layer, index) {
  const frames = doc.layers[layer].frames;
  if (frames.length <= 1) return index;
  frames.splice(index, 1);
  return Math.min(index, frames.length - 1);
}
