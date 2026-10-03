// The Range carousel's data and art can't drift (Range class characters spec
// R12): src/data/home.ts lists as many classes as the compiled sprite and its
// scene have data-class groups, numbered 0 to N − 1 in order, and range.css
// shows each one. Node built-ins only.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFile(join(ROOT, path), 'utf8');

/** The class names in rangeClasses, read from home.ts as text. */
export const classNames = (homeTs) => {
  const block = /export const rangeClasses = \[([\s\S]*?)\] as const;/.exec(homeTs);
  assert.ok(block, 'home.ts exports rangeClasses');
  return [...block[1].matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
};

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
