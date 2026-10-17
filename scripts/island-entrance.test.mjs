// Tests for the build-up schedule: the hero island's (island clock sweep spec
// R1–R5), run against the groups in the compiled hero-island.svg, and a Range
// setting's (Range settings spec R4, R5), run against the groups in the
// compiled range-sprite.svg. Node built-ins only.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { GROUND_ORDERS, MOVES, OBJECT_ORDERS, RANGE_TIMING, schedule, settledBy, TIMING } from '../src/lib/island-entrance.mjs';

const read = (name) => readFile(new URL(`../src/assets/pixel-art/${name}`, import.meta.url), 'utf8');
/** An SVG's enter groups, as pieceOf() in src/lib/play-entrance.ts reads them. */
const enterGroups = (svg) =>
  [...svg.matchAll(/<g class="enter" ([^>]*)>/g)].map(([, attrs]) => {
    const data = Object.fromEntries([...attrs.matchAll(/data-(\w+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
    const n = (key) => (data[key] === undefined ? undefined : Number(data[key]));
    return { enter: data.enter, col: n('col'), row: n('row'), x: n('x'), y: n('y') };
  });
const pieces = enterGroups(await read('hero-island.svg'));
const plan = schedule(pieces);
const of = (kind) => pieces.flatMap((p, i) => (p.enter === kind ? [{ ...p, ...plan[i] }] : []));
const end = (e) => e.delay + e.duration;
const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-9, `${label}: ${a} ≈ ${b}`);
const startOrder = (list) => [...list].sort((a, b) => a.delay - b.delay);

describe('island entrance schedule', () => {
  it('reads every group of the compiled island, and knows each kind', () => {
    assert.ok(pieces.length > 50, `${pieces.length} groups`);
    assert.deepEqual([...new Set(pieces.map((p) => p.enter))].sort(), ['ground', 'object', 'shadow', 'sky']);
    assert.ok(plan.every(Boolean));
  });

  it('R1: the ground pops up cube by cube, clockwise from the left corner, over 0.5s', () => {
    const ground = startOrder(of('ground'));
    assert.equal(ground.length, 36);
    const at = (col, row) => ground.find((g) => g.col === col && g.row === row);
    // The four corners, a quarter turn apart: left [0, 5], back [0, 0], right [5, 0], front [5, 5].
    // The clock's hand starts on the line from the middle to the left corner, so those three cubes start together.
    const first = ground.filter((g) => g.delay === ground[0].delay).map((g) => [g.col, g.row]);
    assert.deepEqual(first, [[2, 3], [1, 4], [0, 5]], 'the hand from the middle to the left corner starts');
    close(ground[0].delay, TIMING.start + 0.12, 'the first cubes start 0.12s after the shadow');
    const corners = [at(0, 5), at(0, 0), at(5, 0), at(5, 5)];
    for (let i = 1; i < 4; i++) assert.ok(corners[i].delay > corners[i - 1].delay, `corner ${i} turns clockwise`);
    // The sweep ends at the last cube before the hand comes round again, so the right corner lands a little after half-way.
    const half = (at(5, 0).delay - at(0, 5).delay) / 0.5;
    assert.ok(half > 0.45 && half < 0.55, `the right corner is about half a turn on (${half.toFixed(2)})`);
    close(end(ground.at(-1)) - TIMING.duration - ground[0].delay, 0.5, 'the sweep');
    // Clockwise on screen: going round from the left corner, each cube's angle about the island's middle only grows.
    const angle = (g) => {
      const a = Math.atan2(g.y - 48, g.x);
      return (((a - Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    };
    for (let i = 1; i < ground.length; i++) assert.ok(angle(ground[i]) >= angle(ground[i - 1]), `[${ground[i].col}, ${ground[i].row}] follows the clock`);
  });

  it('R3: each piece pops up from 30% to 110% of its size, then settles, over 0.5s', () => {
    for (const piece of [...of('ground'), ...of('object')]) {
      assert.equal(piece.move, 'pop');
      assert.deepEqual(piece.keyframes, { opacity: [0, 1, 1], scale: [0.3, 1.1, 1] });
      assert.deepEqual(piece.times, [0, 0.55, 1]);
      assert.equal(piece.duration, 0.5);
    }
  });

  it('R2: objects start 0.08s before the last cube lands, then sweep front to back over 0.6s', () => {
    const groundEnd = Math.max(...of('ground').map(end));
    const objects = startOrder(of('object'));
    close(objects[0].delay, groundEnd - 0.08, 'the first object');
    for (let i = 1; i < objects.length; i++) assert.ok(objects[i].y <= objects[i - 1].y, `y ${objects[i].y} starts no earlier than y ${objects[i - 1].y}`);
    close(objects.at(-1).delay - objects[0].delay, 0.6, 'the sweep');
    const parts = (y) => objects.filter((o) => o.y === y);
    for (const y of new Set(objects.map((o) => o.y))) assert.equal(new Set(parts(y).map((o) => o.delay)).size, 1, `everything with its foot at y ${y} arrives together`);
  });

  it('R4: the shadow fades in first, and the clouds drift in from the left as the objects begin', () => {
    const [shadow] = of('shadow');
    assert.equal(shadow.move, 'fade');
    assert.equal(shadow.delay, TIMING.start);
    assert.ok(shadow.delay < Math.min(...of('ground').map((g) => g.delay)));
    const [sky] = of('sky');
    assert.deepEqual([sky.move, sky.keyframes], ['drift', { opacity: [0, 1], x: [-6, 0] }]);
    close(sky.delay, Math.min(...of('object').map((o) => o.delay)), 'the clouds start with the objects');
  });

  it('R5: the whole island has settled by 2.35s', () => {
    const last = settledBy(plan);
    assert.ok(last <= 2.35, `settled at ${last.toFixed(2)}s`);
    close(last, 2.34, 'the last object lands');
  });

  it('R6: every order and move the entrance lab offers schedules the whole island, ending in place', () => {
    for (const ground of GROUND_ORDERS) {
      for (const objects of OBJECT_ORDERS) {
        for (const move of MOVES) {
          for (const along of [false, true]) {
            const t = { ...TIMING, ground, objects, move, with: along };
            const entrances = schedule(pieces, t);
            const label = JSON.stringify({ ground, objects, move, with: along });
            assert.ok(entrances.every((e) => e && Number.isFinite(e.delay) && e.delay >= 0), label);
            for (const e of entrances) for (const frames of Object.values(e.keyframes)) assert.equal(frames.at(-1), frames === e.keyframes.scale ? 1 : frames === e.keyframes.opacity ? 1 : 0, `${label}: ends in place`);
          }
        }
      }
    }
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

  it('the island keeps its own numbers, and the Range keeps its float (island clock sweep spec C2)', () => {
    const pick = (t) => [t.start, t.groundDelay, t.groundSpan, t.ground, t.objects, t.with, t.objectLead, t.objectSpan, t.move, t.duration, t.popFrom, t.popPeak];
    assert.deepEqual(pick(TIMING), [0.2, 0.12, 0.5, 'clock', 'front-back', false, 0.08, 0.6, 'pop', 0.5, 0.3, 1.1]);
    assert.deepEqual(pick(RANGE_TIMING), [0, 0.08, 0.16, 'rows', 'ltr', false, 0.1, 0.3, 'float', 0.5, 0.3, 1.1]);
    assert.deepEqual([RANGE_TIMING.rise, RANGE_TIMING.overshoot, RANGE_TIMING.peak], [10, 2, 0.55]);
  });
});
