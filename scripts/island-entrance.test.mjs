// Tests for the build-up schedule: the hero island's (island build entrance
// spec R3–R7), run against the groups in the compiled hero-island.svg, and a
// Range setting's (Range settings spec R4, R5), run against the groups in the
// compiled range-sprite.svg. Node built-ins only.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { RANGE_TIMING, schedule, TIMING } from '../src/lib/island-entrance.mjs';

const read = (name) => readFile(new URL(`../src/assets/pixel-art/${name}`, import.meta.url), 'utf8');
/** An SVG's enter groups, as Hero.astro and Range.astro read them. */
const enterGroups = (svg) =>
  [...svg.matchAll(/<g class="enter" ([^>]*)>/g)].map(([, attrs]) => {
    const data = Object.fromEntries([...attrs.matchAll(/data-(\w+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
    return { enter: data.enter, row: data.row === undefined ? undefined : Number(data.row), x: data.x === undefined ? undefined : Number(data.x) };
  });
const pieces = enterGroups(await read('hero-island.svg'));
const plan = schedule(pieces);
const of = (kind) => pieces.flatMap((p, i) => (p.enter === kind ? [{ ...p, ...plan[i] }] : []));
const end = (e) => e.delay + e.duration;
const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-9, `${label}: ${a} ≈ ${b}`);

describe('island entrance schedule', () => {
  it('reads every group of the compiled island, and knows each kind', () => {
    assert.ok(pieces.length > 20, `${pieces.length} groups`);
    assert.deepEqual([...new Set(pieces.map((p) => p.enter))].sort(), ['ground', 'object', 'shadow', 'sky']);
    assert.ok(plan.every(Boolean));
  });

  it('R3: ground rows float up left to right, the left cliff (row 5) first, 0.12s apart', () => {
    const rows = of('ground').sort((a, b) => a.delay - b.delay);
    assert.deepEqual(rows.map((r) => r.row), [5, 4, 3, 2, 1, 0]);
    for (let i = 1; i < rows.length; i++) close(rows[i].delay - rows[i - 1].delay, 0.12, `row ${rows[i].row}`);
    close(rows[0].delay, TIMING.start + TIMING.rowGap, 'the first row starts one gap after the shadow');
  });

  it('R4, R6: each piece rises 10 art px from below to 2 px past its spot, then settles, over 0.65s', () => {
    for (const piece of [...of('ground'), ...of('object')]) {
      assert.equal(piece.move, 'float');
      assert.deepEqual(piece.keyframes, { opacity: [0, 1, 1], y: [10, -2, 0] });
      assert.deepEqual(piece.times, [0, 0.55, 1]);
      assert.equal(piece.duration, 0.65);
    }
  });

  it('R5: objects start 0.08s before the last ground row lands, then sweep left to right by x over 0.6s', () => {
    const groundEnd = Math.max(...of('ground').map(end));
    const objects = of('object');
    const first = Math.min(...objects.map((o) => o.delay));
    close(first, groundEnd - 0.08, 'the first object');
    const byX = [...objects].sort((a, b) => a.x - b.x || a.delay - b.delay);
    for (let i = 1; i < byX.length; i++) assert.ok(byX[i].delay >= byX[i - 1].delay, `x ${byX[i].x} starts no earlier than x ${byX[i - 1].x}`);
    close(byX.at(-1).delay - byX[0].delay, 0.6, 'the sweep');
    for (const o of objects.filter((o) => o.x === byX[0].x)) close(o.delay, first, 'the leftmost object starts first');
  });

  it('R7: the shadow fades in first, and the clouds drift in from the left as the objects begin', () => {
    const [shadow] = of('shadow');
    assert.equal(shadow.move, 'fade');
    assert.equal(shadow.delay, TIMING.start);
    assert.ok(shadow.delay < Math.min(...of('ground').map((g) => g.delay)));
    const [sky] = of('sky');
    assert.deepEqual([sky.move, sky.keyframes], ['drift', { opacity: [0, 1], x: [-6, 0] }]);
    close(sky.delay, Math.min(...of('object').map((o) => o.delay)), 'the clouds start with the objects');
  });

  it('R6: the whole island has settled by 2.75s', () => {
    const last = Math.max(...plan.map(end));
    assert.ok(last <= 2.75, `settled at ${last.toFixed(2)}s`);
  });

  it('a single object, or an unknown kind, still schedules safely', () => {
    const [object, unknown] = schedule([{ enter: 'object', x: 3 }, { enter: 'weather' }]);
    assert.ok(Number.isFinite(object.delay));
    assert.equal(unknown, null);
  });
});

// Every enter group in the sprite: each setting's floor rows and objects. Range.astro plays one setting at a time, and
// each has the same three rows, so the whole sprite's groups schedule as one setting would.
const range = enterGroups(await read('range-sprite.svg'));
const rangePlan = schedule(range, RANGE_TIMING);
const ofRange = (kind) => range.flatMap((p, i) => (p.enter === kind ? [{ ...p, ...rangePlan[i] }] : []));

describe('Range setting schedule', () => {
  it('reads the sprite\'s groups: floor rows and objects only', () => {
    assert.ok(range.length >= 10, `${range.length} groups`);
    assert.deepEqual([...new Set(range.map((p) => p.enter))].sort(), ['ground', 'object']);
    assert.ok(rangePlan.every(Boolean));
  });

  it('R4, R5: the rows float up left to right, the left cliff (row 2) first, 0.08s apart, from the switch', () => {
    const rows = [...new Map(ofRange('ground').map((r) => [r.row, r])).values()].sort((a, b) => a.delay - b.delay);
    assert.deepEqual(rows.map((r) => r.row), [2, 1, 0]);
    close(rows[0].delay, 0.08, 'the first row');
    for (let i = 1; i < rows.length; i++) close(rows[i].delay - rows[i - 1].delay, 0.08, `row ${rows[i].row}`);
  });

  it('R5: each piece rises 10 art px to 2 px past its spot over 0.5s, as on the island', () => {
    for (const piece of [...ofRange('ground'), ...ofRange('object')]) {
      assert.equal(piece.move, 'float');
      assert.deepEqual(piece.keyframes, { opacity: [0, 1, 1], y: [10, -2, 0] });
      assert.deepEqual(piece.times, [0, 0.55, 1]);
      assert.equal(piece.duration, 0.5);
    }
  });

  it('R4, R5: objects start 0.1s before the floor lands, then sweep left to right by x over 0.3s', () => {
    const floorEnd = Math.max(...ofRange('ground').map(end));
    const objects = ofRange('object');
    const byX = [...objects].sort((a, b) => a.x - b.x || a.delay - b.delay);
    close(byX[0].delay, floorEnd - 0.1, 'the leftmost object');
    for (let i = 1; i < byX.length; i++) assert.ok(byX[i].delay >= byX[i - 1].delay, `x ${byX[i].x} starts no earlier than x ${byX[i - 1].x}`);
    close(byX.at(-1).delay - byX[0].delay, 0.3, 'the sweep');
  });

  it('R5: a setting has settled by 1.5s', () => {
    const last = Math.max(...rangePlan.map(end));
    assert.ok(last <= 1.5, `settled at ${last.toFixed(2)}s`);
  });

  it('the island keeps its own numbers', () => {
    assert.deepEqual(
      [TIMING.start, TIMING.rowGap, TIMING.duration, TIMING.rise, TIMING.overshoot, TIMING.peak, TIMING.objectLead],
      [0.2, 0.12, 0.65, 10, 2, 0.55, 0.08],
    );
    assert.equal(/** @type {any} */ (TIMING).sweep, undefined, 'the island\'s objects sweep over its rows\' span');
  });
});
