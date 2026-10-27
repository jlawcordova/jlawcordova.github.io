// The document's entrances match the site's build-up (Pixel Lab v0.9.0 entrances
// spec R3–R4). Until the follow-up moves the build-up into the SVG, the site plays
// its own copy (src/lib/island-entrance.mjs) and Pixel Lab plays the document's,
// so the two can drift: this fails when the timing or the schedule differ.
//
// Each scene's `entrance show` gives its timing (ms) and its pieces with their
// delays. The site's schedule() runs on the same pieces, read as pieceOf() reads
// them (a missing attribute is NaN), and every delay, duration and move must agree.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RANGE_TIMING, schedule, settledBy, TIMING } from '../src/lib/island-entrance.mjs';
import { pixellab } from './pixellab.mjs';

/** The Timing fields in seconds on the site and whole ms in the document. */
const TIMES = ['start', 'groundDelay', 'groundSpan', 'cascade', 'objectLead', 'objectSpan', 'lag', 'duration', 'objectDuration', 'shadowDuration', 'skyDuration'];

/** The site's Timing as the document holds it. */
const inMs = (/** @type {Record<string, unknown>} */ t) =>
  Object.fromEntries(Object.entries(t).map(([k, v]) => [k, TIMES.includes(k) ? Math.round(/** @type {number} */ (v) * 1000) : v]));

async function show(/** @type {string} */ scene) {
  const { status, stdout, stderr } = await pixellab(['scene', 'entrance', 'show', scene, '--site', '.', '--json']);
  assert.equal(status, 0, stderr);
  return JSON.parse(stdout);
}

/** Within a microsecond, in ms. */
const near = (/** @type {number} */ a, /** @type {number} */ b, /** @type {string} */ what) =>
  assert.ok(Math.abs(a - b) < 1e-3, `${what}: the document has ${a} ms, the site ${b} ms`);

for (const [scene, timing, name] of /** @type {const} */ ([
  ['hero-island', TIMING, 'TIMING'],
  ['range-sprite', RANGE_TIMING, 'RANGE_TIMING'],
])) {
  describe(`${scene}'s entrance`, async () => {
    const entrance = await show(scene);

    it(`is the site's ${name}`, () => {
      assert.deepEqual(entrance.timing, inMs(timing));
    });

    it("plays every piece as the site's schedule() does", () => {
      const pieces = entrance.pieces.map((/** @type {any} */ p) => ({ enter: p.role, col: Number(p.col), row: Number(p.row), x: Number(p.x), y: Number(p.y) }));
      assert.ok(pieces.length > 0, `${scene} has no entrance pieces`);
      const plan = schedule(pieces, timing);
      entrance.pieces.forEach((/** @type {any} */ p, /** @type {number} */ i) => {
        const site = plan[i];
        assert.ok(site, `${scene} ${p.path}: the site gives this ${p.role} no entrance`);
        near(p.delay, site.delay * 1000, `${scene} ${p.path} delay`);
        near(p.duration, site.duration * 1000, `${scene} ${p.path} duration`);
        assert.equal(p.move, site.move, `${scene} ${p.path} move`);
      });
      near(entrance.settledBy, settledBy(plan) * 1000, `${scene} settled by`);
    });
  });
}
