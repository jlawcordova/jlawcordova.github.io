// Tests for the Range's class change (Range pop spec R2–R6): the battle bars'
// order and frames, the slash, the countdown's interval, and the character's
// hop state, run against the compiled range-sprite.svg. Node
// built-ins only.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { BARS, barsFrame, barsOrder, INTERVAL, SLASH } from '../src/lib/range-change.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
/** Every block's clear time on a screen of cols × rows blocks, row by row. */
const grid = (cols, rows) => Array.from({ length: cols * rows }, (_, n) => barsOrder(n % cols, Math.floor(n / cols), cols, rows));

describe('battle bars', () => {
  // The screen at 1440px is about 38 × 27 blocks, and at 390px about 25 × 22.
  for (const [cols, rows] of [
    [38, 27],
    [25, 22],
    [1, 1],
  ]) {
    it(`R2: on ${cols} × ${rows} blocks every block clears once, between the first frame and the last`, () => {
      const order = grid(cols, rows);
      assert.ok(order.every((o) => o >= 0 && o < 1), 'every clear time is in [0, 1)');
      assert.ok(barsFrame(order, 0).every((b) => b !== 0), 'the first frame still holds the old color everywhere');
      assert.ok(barsFrame(order, 1).every((b) => b === 0), 'the last frame has cleared every block');
      // A block that has cleared never comes back.
      for (let f = 1; f <= BARS.frames; f += 1) {
        const [before, now] = [barsFrame(order, (f - 1) / BARS.frames), barsFrame(order, f / BARS.frames)];
        assert.ok(before.every((b, n) => b !== 0 || now[n] === 0), `frame ${f} keeps every cleared block clear`);
      }
    });
  }

  it('R2: bands are two rows high, and neighbouring bands sweep from opposite sides', () => {
    const [cols, rows] = [20, 8];
    const at = (x, y) => barsOrder(x, y, cols, rows);
    for (let y = 0; y < rows; y += 1) {
      assert.equal(at(0, y), at(0, y - (y % 2)), `row ${y} goes with the top row of its band`);
      const leftFirst = at(0, y) < at(cols - 1, y);
      assert.equal(leftFirst, Math.floor(y / 2) % 2 === 0, `band ${Math.floor(y / 2)} sweeps from the ${leftFirst ? 'left' : 'right'}`);
    }
    // Each band starts a little after the one above it.
    assert.ok(at(0, 0) < at(cols - 1, 3) && at(cols - 1, 3) < at(0, 4));
  });

  it("R2: the lit edge runs just ahead of the sweep, and only there", () => {
    const order = grid(30, 20);
    const frame = barsFrame(order, 0.5);
    frame.forEach((b, n) => {
      if (b === 2) assert.ok(order[n] >= 0.5 && order[n] < 0.5 + BARS.edge);
      if (b === 1) assert.ok(order[n] >= 0.5 + BARS.edge);
    });
    assert.ok(frame.includes(2), 'some blocks are lit');
  });

  it('R2: the change takes about half a second, in whole blocks of 12px', () => {
    assert.equal(BARS.cell, 12);
    assert.equal(BARS.frames * BARS.frameMs, 500);
  });
});

describe('slash and countdown', () => {
  it('R3: the slash starts as a line and ends past every edge of the section', () => {
    const points = (polygon) => [...polygon.matchAll(/(-?\d+)% (-?\d+)%/g)].map(([, x, y]) => [Number(x), Number(y)]);
    const [from, to] = [points(SLASH.from), points(SLASH.to)];
    assert.equal(from.length, 4);
    assert.equal(to.length, 4, 'the same number of points, so the shape can be animated');
    assert.deepEqual(from[0], from[1], 'it starts with no width at the top');
    assert.deepEqual(from[2], from[3], 'and none at the bottom');
    const [tl, tr, br, bl] = to;
    assert.ok(tl[0] <= 0 && tr[0] >= 100 && br[0] >= 100 && bl[0] <= 0, 'it ends wider than the section, top and bottom');
    assert.ok(SLASH.duration >= 400 && SLASH.duration <= 800);
  });

  it('R4: the countdown runs the carousel at the Range settings interval', async () => {
    assert.equal(INTERVAL, 3000);
    const css = await read('src/styles/range.css');
    assert.match(css, /mask-size:\s*calc\(100% \/ 12\) 100%/, 'twelve segments');
  });
});

describe("A's hop", () => {
  it('R6: every class has one character, and its hop moves it by whole pixels, rises and lands where it started', async () => {
    const svg = await read('src/assets/pixel-art/range-sprite.svg');
    const groups = svg.split(/<g data-class="\d+">/).slice(1);
    assert.ok(groups.length > 0);
    for (const group of groups) assert.equal([...group.matchAll(/class="character[ "]/g)].length, 1, 'one character per class');
    assert.match(svg, /\[data-play~="hop"\]/, 'the sprite plays hop through data-play');

    // The hop is a one-shot state of the character (Pixel Lab v0.8.0), which
    // data-play plays as it played the action it was made from.
    const character = JSON.parse(await read('src/assets/pixel-art/jlawcordova.pixellab/objects/character.json'));
    const hop = character.states?.hop;
    assert.ok(hop, 'the character has the hop state');
    assert.equal(hop.loop, false, 'it plays once');
    assert.equal(hop.then, character.start, 'then hands back to the state it starts in');
    assert.equal(hop.move[0].t, 0);
    assert.ok(hop.move.every(({ move: [x, y] }) => x === 0 && Number.isInteger(y)), 'up and down, by whole pixels');
    const ys = hop.move.map(({ move }) => move[1]);
    assert.equal(ys[0], 0, 'it starts at rest');
    assert.ok(Math.min(...ys) <= -5, 'it rises');
    assert.ok(Math.abs(ys.at(-1)) <= 1, 'it lands (and returns to rest when the state ends)');

    const range = await read('src/components/home/Range.astro');
    // data-play is a list the hop shares with the build-up (entrance in SVG spec R9).
    assert.match(range, /replay\(group, 'hop'\)/, 'A plays it with data-play');
    assert.match(range, /animationName !== 'range-sprite--hop'/, 'and when the hop ends');
    assert.match(range, /drop\(group, 'hop'\)/, 'takes only hop out');
  });
});
