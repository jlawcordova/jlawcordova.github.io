// The Range carousel's data and art can't drift (Range class characters spec
// R1, R3, R12): src/data/home.ts lists as many classes as the compiled sprite
// and its scene have data-class groups, numbered 0 to N − 1 in order, each
// group places the outfit named for its class, range.css shows each one, and
// the character and its outfits stay off legacy colors. Node built-ins only.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { resolve } from '../src/lib/pixel-art/engine.mjs';
import { readSources } from './optimize-pixel-art.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFile(join(ROOT, path), 'utf8');

/** The class names in rangeClasses, read from home.ts as text. */
export const classNames = (homeTs) => {
  const block = /export const rangeClasses = \[([\s\S]*?)\] as const;/.exec(homeTs);
  assert.ok(block, 'home.ts exports rangeClasses');
  return [...block[1].matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
};

/** The outfit object named for a class: 'Cloud & DevOps' → 'outfit-cloud-devops'. */
export const outfitFor = (name) => `outfit-${name.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

/** The data-class values of a compiled SVG's groups, in document order. */
export const svgClasses = (svg) => [...svg.matchAll(/<g data-class="(\d+)"/g)].map((m) => m[1]);

describe('Range classes (R12)', () => {
  it('R12: rangeClasses has as many entries as the compiled sprite has data-class groups, in order', async () => {
    const names = classNames(await read('src/data/home.ts'));
    const groups = svgClasses(await read('src/assets/pixel-art/range-sprite.svg'));
    assert.deepEqual(groups, names.map((_, i) => String(i)));
  });

  it('R12: the scene has the same groups as the data', async () => {
    const names = classNames(await read('src/data/home.ts'));
    const scene = (await import('../src/assets/pixel-art/source/scenes/range-sprite.mjs')).default;
    const groups = scene.items.filter((i) => i.group).map((i) => i.group['data-class']);
    assert.deepEqual(groups, names.map((_, i) => String(i)));
  });

  it('R5: range.css shows each data-class when it is current, and no other', async () => {
    const names = classNames(await read('src/data/home.ts'));
    const css = await read('src/styles/range.css');
    const shown = [...css.matchAll(/\.range\[data-current="(\d+)"\] \.range__sprite g\[data-class="(\d+)"\]/g)];
    for (let i = 0; i < names.length; i += 1) assert.ok(shown.some((m) => m[1] === String(i)), `data-current="${i}" shows its class`);
    for (const [, current, cls] of shown) assert.equal(current, cls);
  });

  it('R12: the check fails when a group or an entry is missing', () => {
    const home = "export const rangeClasses = [\n  { name: 'A', shadow: '#000' },\n  { name: 'B', shadow: '#000' },\n] as const;";
    const twoGroups = '<g data-class="0"></g><g data-class="1"></g>';
    assert.deepEqual(svgClasses(twoGroups), classNames(home).map((_, i) => String(i)));
    assert.notDeepEqual(svgClasses('<g data-class="0"></g>'), classNames(home).map((_, i) => String(i)));
    assert.notDeepEqual(svgClasses(twoGroups), classNames(home.replace("  { name: 'B', shadow: '#000' },\n", '')).map((_, i) => String(i)));
  });
});

describe('Range class order (R1)', () => {
  it('R1: each data-class places the outfit named for its class, in rangeClasses order', async () => {
    const names = classNames(await read('src/data/home.ts'));
    const scene = (await import('../src/assets/pixel-art/source/scenes/range-sprite.mjs')).default;
    const placed = scene.items.filter((i) => i.group).map((g) => g.items.find((i) => i.object.startsWith('outfit-')).object);
    assert.deepEqual(placed, names.map(outfitFor));
  });

  it('R1: outfitFor turns each class name into its outfit name', () => {
    assert.equal(outfitFor('Cloud & DevOps'), 'outfit-cloud-devops');
    assert.equal(outfitFor('Security & Governance'), 'outfit-security-governance');
    assert.equal(outfitFor('Back-end'), 'outfit-back-end');
  });
});

describe('Range characters off legacy colors (R3, R3a)', () => {
  it('R3: character and every outfit resolve as non-legacy', async () => {
    const { sources } = await readSources(join(ROOT, 'src/assets/pixel-art/source'));
    const outfits = [...sources.objects.keys()].filter((n) => n.startsWith('outfit-'));
    assert.equal(outfits.length, 7);
    for (const name of ['character', ...outfits]) assert.equal(resolve(sources, name).legacy, false, `${name} is not legacy`);
  });
});
