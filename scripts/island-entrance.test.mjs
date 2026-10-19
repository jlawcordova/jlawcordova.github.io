// Tests for the build-up schedule: the hero island's (island sweep drop spec
// R1–R5), run against the groups in the compiled hero-island.svg, and a Range
// setting's (Range settings spec R4, R5), run against the groups in the
// compiled range-sprite.svg. Node built-ins only.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { GROUND_ORDERS, MOVES, OBJECT_MOVES, OBJECT_ORDERS, RANGE_TIMING, schedule, settledBy, TIMING } from '../src/lib/island-entrance.mjs';

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

  it('R1: the ground sweeps in left to right by screen x, over 0.25s plus a 0.25s cascade: 0.5s in all', () => {
    const ground = startOrder(of('ground'));
    assert.equal(ground.length, 132, 'the three sections (island level up spec R1)');
    for (let i = 1; i < ground.length; i++) assert.ok(ground[i].x >= ground[i - 1].x, `x ${ground[i].x} starts no earlier than x ${ground[i - 1].x}`);
    close(ground[0].delay, TIMING.start + 0.12, 'the left corner starts 0.12s after the shadow');
    assert.deepEqual([ground[0].col, ground[0].row], [0, 10], 'the left corner first: the mining section\'s, at the far left');
    assert.deepEqual([ground.at(-1).col, ground.at(-1).row], [10, -5], 'the right corner last: the rail section\'s, at the far right');
    close(ground.at(-1).delay - ground[0].delay, 0.5, 'the sweep and the cascade');
    for (const x of new Set(ground.map((g) => g.x))) assert.equal(new Set(ground.filter((g) => g.x === x).map((g) => g.delay)).size, 1, `the column at x ${x} starts together`);
  });

  it('R2: each cube floats up 16 art px to 6 past its spot, then settles, over 0.25s', () => {
    for (const piece of of('ground')) {
      assert.equal(piece.move, 'float');
      assert.deepEqual(piece.keyframes, { opacity: [0, 1, 1], y: [16, -6, 0] });
      assert.deepEqual(piece.times, [0, 0.6, 1]);
      assert.equal(piece.duration, 0.25);
    }
  });

  it('R3: each object drops 24 art px onto its spot, dips 1.5, settles over 0.25s, starting 0.42s after the cube under it', () => {
    const ground = of('ground');
    const objects = of('object');
    for (const piece of objects) {
      assert.equal(piece.move, 'drop');
      assert.deepEqual(piece.keyframes, { opacity: [0, 1, 1], y: [-24, 1.5, 0] });
      assert.deepEqual(piece.times, [0, 0.45, 1]);
      assert.equal(piece.duration, 0.25);
      // Some cube starts exactly 0.42s before it: the one nearest its foot.
      assert.ok(ground.some((g) => Math.abs(piece.delay - g.delay - 0.42) < 1e-9), `the object at ${piece.x}, ${piece.y} follows a cube`);
    }
    for (const y of new Set(objects.map((o) => `${o.x},${o.y}`))) {
      assert.equal(new Set(objects.filter((o) => `${o.x},${o.y}` === y).map((o) => o.delay)).size, 1, `everything with its foot at ${y} arrives together`);
    }
  });

  it('R4: the shadow fades in first, and the clouds drift in from the left halfway through the ground\'s span', () => {
    const [shadow] = of('shadow');
    assert.equal(shadow.move, 'fade');
    assert.equal(shadow.delay, TIMING.start);
    assert.ok(shadow.delay < Math.min(...of('ground').map((g) => g.delay)));
    const [sky] = of('sky');
    assert.deepEqual([sky.move, sky.keyframes], ['drift', { opacity: [0, 1], x: [-6, 0] }]);
    close(sky.delay, 0.445, 'the clouds');
  });

  it('R5: the whole island has settled by 1.5s (island level up spec R19; 1.45s when it was 6×6)', () => {
    const last = settledBy(plan);
    assert.ok(last <= 1.5, `settled at ${last.toFixed(2)}s`);
    close(last, 1.47, 'the last object lands');
  });

  it('the clock order (island clock sweep spec R1, now a lab option): cube by cube, clockwise from the left corner', () => {
    const t = { ...TIMING, ground: 'clock', groundSpan: 0.5, cascade: 0, move: 'pop', duration: 0.5 };
    const clockPlan = schedule(pieces, t);
    const ground = startOrder(pieces.flatMap((p, i) => (p.enter === 'ground' ? [{ ...p, ...clockPlan[i] }] : [])));
    assert.equal(ground.length, 132);
    close(ground[0].delay, TIMING.start + 0.12, 'the first cubes start 0.12s after the shadow');
    close(end(ground.at(-1)) - t.duration - ground[0].delay, 0.5, 'the sweep');
    // Clockwise on screen: going round from the left, each cube's angle about the middle of the ground only grows. The
    // middle is the centre of the ground's box, as the schedule finds it (the island level up spec's three sections).
    const xs = ground.map((g) => g.x);
    const ys = ground.map((g) => g.y);
    const [mx, my] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    const angle = (g) => {
      const a = Math.atan2(g.y - my, g.x - mx);
      return (((a - Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    };
    for (let i = 1; i < ground.length; i++) assert.ok(angle(ground[i]) >= angle(ground[i - 1]), `[${ground[i].col}, ${ground[i].row}] follows the clock`);
  });

  it('the pop (island clock sweep spec R3, now a lab option): from 30% to 110% of its size, then settles', () => {
    const popPlan = schedule(pieces, { ...TIMING, move: 'pop', objectMove: 'same', duration: 0.5, peak: 0.55 });
    for (const piece of pieces.flatMap((p, i) => (['ground', 'object'].includes(p.enter) ? [popPlan[i]] : []))) {
      assert.equal(piece.move, 'pop');
      assert.deepEqual(piece.keyframes, { opacity: [0, 1, 1], scale: [0.3, 1.1, 1] });
      assert.deepEqual(piece.times, [0, 0.55, 1]);
      assert.equal(piece.duration, 0.5);
    }
  });

  it('R6: every order and move the entrance lab offers schedules the whole island, ending in place', () => {
    for (const ground of GROUND_ORDERS) {
      for (const objects of OBJECT_ORDERS) {
        for (const move of MOVES) {
          for (const [along, objectMove] of [[false, 'same'], [true, OBJECT_MOVES[(MOVES.indexOf(move) + 2) % OBJECT_MOVES.length]]]) {
            const t = { ...TIMING, ground, objects, move, objectMove, with: along };
            const entrances = schedule(pieces, t);
            const label = JSON.stringify({ ground, objects, move, objectMove, with: along });
            assert.ok(entrances.every((e) => e && Number.isFinite(e.delay) && e.delay >= 0), label);
            for (const e of entrances) for (const frames of Object.values(e.keyframes)) assert.equal(frames.at(-1), frames === e.keyframes.scale ? 1 : frames === e.keyframes.opacity ? 1 : 0, `${label}: ends in place`);
          }
        }
      }
    }
  });

  it('R8: the objects can move their own way, whatever the ground\'s move', () => {
    assert.equal(RANGE_TIMING.objectMove, 'same', 'the Range moves both the same way');
    for (const objectMove of MOVES) {
      const entrances = schedule(pieces, { ...TIMING, move: 'pop', objectMove });
      const moves = (kind) => new Set(pieces.flatMap((p, i) => (p.enter === kind ? [entrances[i].move] : [])));
      assert.deepEqual([...moves('ground')], ['pop'], objectMove);
      assert.deepEqual([...moves('object')], [objectMove], objectMove);
    }
  });

  it('R8: objects with a move of their own take their own numbers, and with the ground\'s move, the ground\'s', () => {
    const own = { objectDuration: 0.3, objectPeak: 0.7, objectRise: 12, objectOvershoot: 0, objectPopFrom: 0.5, objectPopPeak: 1 };
    const of = (t, kind) => pieces.flatMap((p, i) => (p.enter === kind ? [schedule(pieces, t)[i]] : []));
    const [drop] = of({ ...TIMING, ...own, move: 'float', objectMove: 'drop' }, 'object');
    assert.deepEqual([drop.duration, drop.times, drop.keyframes], [0.3, [0, 0.7, 1], { opacity: [0, 1, 1], y: [-12, 0, 0] }], 'a drop with no dip');
    const [ground] = of({ ...TIMING, ...own, move: 'float', objectMove: 'drop' }, 'ground');
    assert.deepEqual([ground.duration, ground.keyframes.y], [TIMING.duration, [TIMING.rise, -TIMING.overshoot, 0]], 'the ground keeps its own');
    const [same] = of({ ...TIMING, ...own, objectMove: 'same' }, 'object');
    const [cube] = of({ ...TIMING, ...own, objectMove: 'same' }, 'ground');
    assert.deepEqual([same.move, same.duration, same.keyframes], [cube.move, cube.duration, cube.keyframes], 'same ignores the object numbers');
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

  it('R5: each piece rises 10 art px to 2 px past its spot over 0.5s', () => {
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

  it('the island takes the owner\'s pick, and the Range keeps every number of its own (island sweep drop spec R6)', () => {
    const pick = Object.fromEntries(Object.entries(TIMING).filter(([k]) => ['groundSpan', 'cascade', 'ground', 'objects', 'with', 'lag', 'move', 'objectMove', 'duration', 'peak', 'rise', 'overshoot', 'objectDuration', 'objectPeak', 'objectRise', 'objectOvershoot'].includes(k)));
    // The owner's line from the lab, as given.
    assert.deepEqual(pick, { groundSpan: 0.25, cascade: 0.25, ground: 'sweep', objects: 'same', with: true, lag: 0.42, move: 'float', objectMove: 'drop', duration: 0.25, peak: 0.6, rise: 16, overshoot: 6, objectDuration: 0.25, objectPeak: 0.45, objectRise: 24, objectOvershoot: 1.5 });
    assert.deepEqual(RANGE_TIMING, {
      start: 0, groundDelay: 0.08, groundSpan: 0.16, cascade: 0, ground: 'rows', objects: 'ltr', with: false, objectLead: 0.1, objectSpan: 0.3, lag: 0.4,
      move: 'float', objectMove: 'same', duration: 0.5, peak: 0.55, rise: 10, overshoot: 2, popFrom: 0.3, popPeak: 1.1,
      objectDuration: 0.5, objectPeak: 0.55, objectRise: 10, objectOvershoot: 2, objectPopFrom: 0.3, objectPopPeak: 1.1,
      shadowDuration: 0.4, skyDuration: 0.6, skyDrift: 6, seed: 1,
    });
    assert.deepEqual(Object.keys(RANGE_TIMING).sort(), Object.keys(TIMING).sort(), 'the Range names every field');
  });
});
