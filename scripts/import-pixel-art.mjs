// Imports extracted pixel art (an SVG with one <rect> per run, grouped by
// fill) as engine sources: objects plus one scene that places them (pixel-art
// engine spec D7). It's how the redesign's art moved into the engine, and how
// any future SVG art comes in.
//
// The SVG's top level is read in order:
// - a run of <g fill> groups becomes one sprite object (one layer);
// - a <g data-…> group becomes a scene group, and everything in it one
//   object: its <g fill> runs are layers, and each <g class> inside it a
//   layer with that class (like the Range outfits' cbob);
// - consecutive <g class="<loop> <prefix>N"> groups, for a loop named with
//   --loops, become one object with a frame loop;
// - any other <g class> becomes an object placed with that class.
//
// Objects are trimmed to their bounds, keep anchor [0, 0], are placed at
// px [minX, minY] and are marked legacy. Keys are assigned in order of first
// appearance (a–z, A–Z, 0–9, then punctuation), so each layer's colors are
// painted in the fixture's group order. A color whose value is in the world
// palette takes its world name; any other is named c-<hex> from the legacy
// tier.
//
// --factor character moves the rows that are identical in every data group's
// object (layer by layer, aligned on their shared bounds) into a `character`
// object. Each of those objects then extends it and overrides only its own
// rows.
//
// Usage:
//   node scripts/import-pixel-art.mjs <fixture.svg> --scene <name>
//     [--names a,b,…] [--loops wf,ff,…] [--factor character]
//     [--source <dir>] [--force]

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { serializeObject, serializeScene } from '../src/lib/pixel-art/serialize.mjs';
import { attr, isRectGroup, parse, rectPixels } from './optimize-pixel-art.mjs';

const DEFAULT_SOURCE = fileURLToPath(new URL('../src/assets/pixel-art/source/', import.meta.url));
const ALPHABET = [
  ...'abcdefghijklmnopqrstuvwxyz',
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'0123456789',
  ...'!#$%&*+-/:;<=>?@^_~',
];

/**
 * A layer as drawn: its fill groups in order, as [hex, Set<"x,y">].
 * @typedef {{ class?: string, fills: [string, Set<string>][] }} RawLayer
 * @typedef {{ loop: string, prefix: string, frames: [string, Set<string>][][] }} RawLoop
 * @typedef {{ name?: string, layers: (RawLayer | RawLoop)[], group?: [string, string][], class?: string }} Unit
 */

/** Fill groups as [hex, pixels]. */
const fills = (groups) => groups.map((g) => [attr(g, 'fill'), rectPixels(g.children)]);

const onlyFills = (el) => el.children.every((c) => c.text !== undefined || isRectGroup(c));
const elements = (el) => el.children.filter((c) => c.text === undefined);

/**
 * Splits the SVG's top level into units, each of which becomes one object.
 * @param {any[]} nodes
 * @param {string[]} loops
 * @returns {Unit[]}
 */
export function readUnits(nodes, loops) {
  const svg = nodes.find((n) => n.name === 'svg');
  if (!svg) throw new Error('No <svg> element');
  /** @type {Unit[]} */
  const units = [];
  let run = null;
  for (const el of elements(svg)) {
    if (isRectGroup(el)) {
      if (!run) units.push((run = { layers: [{ fills: [] }] }));
      run.layers[0].fills.push(...fills([el]));
      continue;
    }
    run = null;
    if (el.name !== 'g') throw new Error(`Unsupported <${el.name}> at the top level`);
    const attrs = el.attrs;
    const cls = attr(el, 'class');
    if (attrs.length > 0 && attrs.every(([k]) => k.startsWith('data-'))) {
      units.push({ group: attrs, layers: groupLayers(el) });
      continue;
    }
    if (cls === undefined || attrs.length !== 1) throw new Error(`Unsupported <g${attrs.map(([k, v]) => ` ${k}="${v}"`).join('')}>`);
    if (!onlyFills(el)) throw new Error(`<g class="${cls}"> holds more than fill groups`);
    const loop = /^([a-z][a-z0-9-]*) ([a-z][a-z0-9-]*?)(\d+)$/.exec(cls);
    if (loop && loops.includes(loop[1])) {
      const [, name, prefix, n] = loop;
      const last = units[units.length - 1];
      const open = last?.layers[0] && 'frames' in last.layers[0] && last.layers[0].loop === name ? last.layers[0] : null;
      const expected = open ? open.frames.length : 0;
      if (Number(n) !== expected) throw new Error(`<g class="${cls}">: expected frame ${expected} of ${name}`);
      if (open) open.frames.push(fills(elements(el)));
      else units.push({ layers: [{ loop: name, prefix, frames: [fills(elements(el))] }] });
      continue;
    }
    units.push({ class: cls, layers: [{ fills: fills(elements(el)) }] });
  }
  return units;
}

/** A data group's layers: fill runs, and one classed layer per <g class>. */
function groupLayers(el) {
  const layers = [];
  let run = null;
  for (const child of elements(el)) {
    if (isRectGroup(child)) {
      if (!run) layers.push((run = { fills: [] }));
      run.fills.push(...fills([child]));
      continue;
    }
    run = null;
    const cls = attr(child, 'class');
    if (child.name !== 'g' || cls === undefined || child.attrs.length !== 1 || !onlyFills(child)) {
      throw new Error('A data group may hold only fill groups and <g class> groups of fills');
    }
    layers.push({ class: cls, fills: fills(elements(child)) });
  }
  return layers;
}

/** Every [hex, pixels] in a unit, in drawing order. */
const allFills = (unit) => unit.layers.flatMap((l) => ('frames' in l ? l.frames.flat() : l.fills));

/** The bounds of every pixel in a list of units. */
function unionBounds(units) {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const unit of units) {
    for (const [, pixels] of allFills(unit)) {
      for (const p of pixels) {
        const [x, y] = p.split(',').map(Number);
        [minX, minY, maxX, maxY] = [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x), Math.max(maxY, y)];
      }
    }
  }
  if (minX === Infinity) throw new Error('A unit with no pixels');
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * A grid of hex values (or null) for fill groups; later groups win.
 * @returns {(string | null)[][]}
 */
function grid(groupFills, box) {
  const rows = Array.from({ length: box.height }, () => Array(box.width).fill(null));
  for (const [hex, pixels] of groupFills) {
    for (const p of pixels) {
      const [x, y] = p.split(',').map(Number);
      rows[y - box.minY][x - box.minX] = hex;
    }
  }
  return rows;
}

/**
 * Assigns keys in order of first appearance.
 * @param {Map<string, string>} keyOf  hex → key, extended in place
 * @param {Set<string>} taken
 */
function assignKeys(hexes, keyOf, taken) {
  for (const hex of hexes) {
    if (keyOf.has(hex)) continue;
    const key = ALPHABET.find((k) => !taken.has(k));
    if (!key) throw new Error('More colors than keys');
    keyOf.set(hex, key);
    taken.add(key);
  }
}

const mapRows = (rows, keyOf) => rows.map((row) => row.map((hex) => (hex === null ? '.' : keyOf.get(hex))).join(''));

/**
 * The palette name for a color: its world name if it has one, else c-<hex>.
 * @param {any} palette
 */
const namer = (palette) => {
  const world = new Map(Object.entries(palette.world).map(([name, hex]) => [hex, name]));
  return (hex) => world.get(hex) ?? `c-${hex.slice(1).toLowerCase()}`;
};

/** Keys object: key → color name, in key-assignment order. */
const keysFor = (keyOf, nameOf, only) =>
  Object.fromEntries([...keyOf].filter(([hex]) => !only || only.has(hex)).map(([hex, key]) => [key, nameOf(hex)]));

/** A unit as a standalone legacy sprite, trimmed to its bounds. */
function plainObject(unit, nameOf) {
  const box = unionBounds([unit]);
  const keyOf = new Map();
  assignKeys(allFills(unit).map(([hex]) => hex), keyOf, new Set());
  const layers = unit.layers.map((l) => {
    if ('frames' in l) return { loop: l.loop, prefix: l.prefix, frames: l.frames.map((f) => mapRows(grid(f, box), keyOf)) };
    return { ...(l.class ? { class: l.class } : {}), map: mapRows(grid(l.fills, box), keyOf) };
  });
  return { box, object: { kind: 'sprite', legacy: true, anchor: [0, 0], keys: keysFor(keyOf, nameOf), layers } };
}

/**
 * Factors the data groups' objects into `character` plus row overrides.
 * @param {Unit[]} variants
 */
function factorCharacter(variants, nameOf) {
  const shape = (u) => u.layers.map((l) => ('frames' in l ? 'frames' : (l.class ?? ''))).join('|');
  if (variants.some((v) => shape(v) !== shape(variants[0]))) throw new Error('--factor needs every data group to have the same layers');
  const box = unionBounds(variants);
  const grids = variants.map((v) => v.layers.map((l) => grid(l.fills, box)));
  const same = (li, y) => grids.every((g) => g[li][y].join() === grids[0][li][y].join());

  // The character: shared rows, blank elsewhere. Its keys follow the first
  // variant's drawing order.
  const shared = new Set();
  const charGrids = grids[0].map((rows, li) =>
    rows.map((row, y) => {
      if (!same(li, y)) return row.map(() => null);
      for (const hex of row) if (hex) shared.add(hex);
      return row;
    }),
  );
  const charKeys = new Map();
  assignKeys(allFills(variants[0]).map(([hex]) => hex).filter((hex) => shared.has(hex)), charKeys, new Set());
  const character = {
    kind: 'sprite',
    legacy: true,
    anchor: [0, 0],
    keys: keysFor(charKeys, nameOf),
    layers: variants[0].layers.map((l, li) => ({ ...(l.class ? { class: l.class } : {}), map: mapRows(charGrids[li], charKeys) })),
  };

  const outfits = variants.map((variant, vi) => {
    const keyOf = new Map(charKeys);
    assignKeys(allFills(variant).map(([hex]) => hex), keyOf, new Set(charKeys.values()));
    const own = new Set([...keyOf.keys()].filter((hex) => !charKeys.has(hex)));
    const rows = {};
    grids[vi].forEach((layerRows, li) => {
      const charRows = mapRows(charGrids[li], charKeys);
      mapRows(layerRows, keyOf).forEach((row, y) => {
        if (row !== charRows[y]) (rows[li] ??= {})[y] = row;
      });
    });
    return { kind: 'sprite', legacy: true, extends: 'character', keys: keysFor(keyOf, nameOf, own), rows };
  });
  return { box, character, outfits };
}

/**
 * Turns the units into objects and a scene.
 * @returns {{ objects: Map<string, any>, scene: any }}
 */
export function importUnits(units, { scene, viewBox, names = [], factor, palette }) {
  const nameOf = namer(palette);
  units.forEach((u, i) => (u.name = names[i] ?? `${scene}-${i}`));
  const objects = new Map();
  const add = (name, object) => {
    const prior = objects.get(name);
    if (prior && serializeObject(prior) !== serializeObject(object)) throw new Error(`Two different objects are both named ${name}`);
    objects.set(name, object);
  };
  /** @type {Map<Unit, [number, number]>} */
  const at = new Map();
  const variants = units.filter((u) => u.group);
  if (factor) {
    if (factor !== 'character') throw new Error('--factor takes only character');
    const { box, character, outfits } = factorCharacter(variants, nameOf);
    add('character', character);
    variants.forEach((v, i) => {
      add(v.name, outfits[i]);
      at.set(v, [box.minX, box.minY]);
    });
  }
  for (const unit of units) {
    if (at.has(unit)) continue;
    const { box, object } = plainObject(unit, nameOf);
    add(unit.name, object);
    at.set(unit, [box.minX, box.minY]);
  }
  const items = units.map((u) => {
    const item = { object: u.name, ...(u.class ? { class: u.class } : {}), at: { px: at.get(u) } };
    return u.group ? { group: Object.fromEntries(u.group), items: [item] } : item;
  });
  return { objects, scene: { output: `${scene}.svg`, viewBox, items } };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      scene: { type: 'string' },
      names: { type: 'string' },
      loops: { type: 'string' },
      factor: { type: 'string' },
      source: { type: 'string' },
      force: { type: 'boolean' },
    },
  });
  if (positionals.length !== 1 || !values.scene) throw new Error('Usage: import-pixel-art.mjs <fixture.svg> --scene <name> [--names a,b] [--loops wf] [--factor character]');
  const source = resolve(values.source ?? DEFAULT_SOURCE);
  const palette = (await import(pathToFileURL(join(source, 'palette.mjs')).href)).default;
  const nodes = parse(await readFile(positionals[0], 'utf8'));
  const svg = nodes.find((n) => n.name === 'svg');
  const viewBox = attr(svg, 'viewBox').split(' ').map(Number);
  const units = readUnits(nodes, values.loops ? values.loops.split(',') : []);
  const { objects, scene } = importUnits(units, {
    scene: values.scene,
    viewBox,
    names: values.names ? values.names.split(',') : [],
    factor: values.factor,
    palette,
  });

  const files = [
    ...[...objects].map(([name, obj]) => [join(source, 'objects', `${name}.mjs`), serializeObject(obj)]),
    [join(source, 'scenes', `${values.scene}.mjs`), serializeScene(scene)],
  ];
  const existing = files.filter(([file]) => existsSync(file)).map(([file]) => file);
  if (existing.length && !values.force) throw new Error(`Refusing to overwrite (pass --force):\n  ${existing.join('\n  ')}`);
  await mkdir(join(source, 'objects'), { recursive: true });
  await mkdir(join(source, 'scenes'), { recursive: true });
  for (const [file, text] of files) {
    await writeFile(file, text);
    console.log(`wrote ${file}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`import-pixel-art: ${err.message}`);
    process.exitCode = 1;
  });
}
