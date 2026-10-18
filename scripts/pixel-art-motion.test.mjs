// Tests for scene motion (island level up spec, Animation): validation with
// exact messages, stepping between keys, the compiled CSS, the rest frame
// that reduced motion shows, poses, the canonical format and the optimizer.
// Small inline fixtures, Node built-ins only.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { composite, loadSources, renderScene, validate } from '../src/lib/pixel-art/engine.mjs';
import { loopFrame, motionCss, poseItems, shownItems, stateAt, stepsFor } from '../src/lib/pixel-art/motion.mjs';
import { serialize } from '../src/lib/pixel-art/serialize.mjs';
import { compileScene } from './optimize-pixel-art.mjs';

const PALETTE = { world: { 'grass-2': '#8FA56E', 'wood-3': '#7A4E2D' }, outfit: {} };
const OBJECTS = {
  dot: { kind: 'sprite', anchor: [0, 0], keys: { g: 'grass-2' }, layers: [{ map: ['g'] }] },
  box: { kind: 'sprite', anchor: [0, 0], keys: { w: 'wood-3' }, layers: [{ map: ['ww'] }] },
};
const scene = (motion, items = [{ object: 'dot', id: 'mover', at: { px: [2, 2] } }]) => ({ viewBox: [0, 0, 40, 20], items, motion });
const src = (s) => loadSources({ palette: PALETTE, objects: OBJECTS, scenes: { demo: s } });
const problems = (s) => validate(src(s)).map((p) => p.replace('scenes/demo.mjs: ', ''));
const track = (keys, item = 'mover') => ({ item, keys });

describe('motion: validation', () => {
  it('a well-formed motion has no problems', () => {
    assert.deepEqual(problems(scene({ duration: 1000, tracks: [track([{ t: 0 }, { t: 500, move: [4, 2], show: false, pose: 'box' }])] })), []);
  });

  it('names each broken rule', () => {
    const bad = scene(
      {
        duration: 1000,
        speed: 2,
        tracks: [
          track([{ t: 5 }]),
          track([{ t: 0 }, { t: 0 }], 'mover'),
          track([{ t: 0 }, { t: 1000 }, { t: 1200, move: [1.5, 0], show: 'yes', pose: 'nope', ease: 'in' }], 'ghost'),
        ],
      },
      [
        { object: 'dot', id: 'mover', at: { px: [0, 0] } },
        { object: 'dot', id: 'mover', at: { px: [1, 0] } },
        { object: 'dot', id: 'Bad Id', at: { px: [2, 0] } },
      ],
    );
    assert.deepEqual(problems(bad), [
      "items[1]: id 'mover' is already used in this scene",
      'items[2]: id must be lowercase kebab-case',
      "motion: unknown property 'speed'",
      'motion.tracks[0].keys[0]: the first key must be at t 0, the rest frame',
      "motion.tracks[1]: item 'mover' already has a track",
      'motion.tracks[1].keys[1]: keys must be in time order, each later than the last',
      "motion.tracks[2]: item 'ghost' is no item's id",
      'motion.tracks[2].keys[1]: t must be less than the duration',
      "motion.tracks[2].keys[2]: unknown property 'ease'",
      'motion.tracks[2].keys[2]: t must be less than the duration',
      'motion.tracks[2].keys[2]: move must be two whole numbers',
      'motion.tracks[2].keys[2]: show must be true or false',
      "motion.tracks[2].keys[2]: pose 'nope' does not exist",
    ]);
  });

  it('a duration under 100 ms, or tracks that are not a list, are refused', () => {
    assert.deepEqual(problems(scene({ duration: 50, tracks: {} })), [
      'motion: duration must be a whole number of ms, at least 100',
      'motion: tracks must be a list',
    ]);
  });
});

describe('motion: stepping', () => {
  it('a move takes one step per pixel along a straight or 2:1 line', () => {
    assert.equal(stepsFor(0, 0), 0);
    assert.equal(stepsFor(-12, 0), 12);
    assert.equal(stepsFor(32, -16), 16);
    assert.equal(stepsFor(6, 9), 3);
  });

  it('steps toward the next key, changes show and pose at their key, and loops back to the first key', () => {
    const t = track([{ t: 0, show: false }, { t: 100, show: true }, { t: 900, move: [16, -8], pose: 'box' }]);
    const at = (time) => stateAt(t, 'dot', 1000, time);
    assert.deepEqual(at(0), { move: [0, 0], show: false, pose: 'dot' });
    assert.deepEqual(at(100), { move: [0, 0], show: true, pose: 'dot' });
    assert.deepEqual(at(500), { move: [8, -4], show: true, pose: 'dot' });
    assert.deepEqual(at(899), { move: [14, -7], show: true, pose: 'dot' });
    assert.deepEqual(at(900), { move: [16, -8], show: true, pose: 'box' });
    assert.deepEqual(at(950), { move: [8, -4], show: true, pose: 'box' }, 'the last key steps back to the first over the rest of the loop');
    assert.deepEqual(at(1500), at(500), 'time wraps around the loop');
  });

  it('poseItems moves, re-poses and hides tracked items, and leaves the rest alone', () => {
    const items = [{ object: 'box', at: { px: [0, 0] } }, { group: { class: 'g' }, items: [{ object: 'dot', id: 'mover', at: { px: [2, 2] } }] }];
    const motion = { duration: 1000, tracks: [track([{ t: 0 }, { t: 500, move: [4, 0], pose: 'box', show: false }])] };
    const posed = poseItems(items, motion, 500, (item) => item.at.px);
    assert.equal(posed[0], items[0]);
    assert.deepEqual(posed[1].items[0], { object: 'box', id: 'mover', at: { px: [6, 2] }, hidden: true });
    assert.deepEqual(shownItems(posed)[1].items, []);
  });

  it('loopFrame follows each loop’s CSS cycle', () => {
    assert.equal(loopFrame('wf', 5, 0), 0);
    assert.equal(loopFrame('wf', 5, 450), 2);
    assert.equal(loopFrame('ff', 4, 600), 0);
    assert.equal(loopFrame('other', 2, 250), 1);
  });
});

describe('motion: compiled', () => {
  const motion = { duration: 2000, tracks: [track([{ t: 0, show: false }, { t: 500, show: true }, { t: 1000, move: [4, -2], pose: 'box' }, { t: 1500, show: false }])] };

  it('draws the rest frame: hidden items and unused poses never composite', () => {
    const { root, style } = renderScene(src(scene(motion)), 'demo');
    assert.equal(composite(root).size, 0, 'the mover is hidden at rest');
    assert.ok(style);
    const shown = { duration: 2000, tracks: [track([{ t: 0, move: [1, 0] }, { t: 1000, pose: 'box' }])] };
    const rest = composite(renderScene(src(scene(shown)), 'demo').root);
    assert.deepEqual([...rest.keys()], ['3,2'], 'the rest key’s move is drawn in, and only the first pose shows');
  });

  it('writes stepped keyframes, show and pose animations, and turns them off under reduced motion', () => {
    const ids = new Map([['mover', { object: 'dot' }]]);
    const css = motionCss(motion, ids);
    assert.match(css, /@keyframes mv-mover\{0%\{transform:translate\(0,0\)\}25%\{transform:translate\(0,0\);animation-timing-function:steps\(2,end\)\}50%\{transform:translate\(4px,-2px\)\}/);
    assert.match(css, /@keyframes mv-mover-s\{0%\{opacity:0\}25%\{opacity:1\}50%\{opacity:1\}75%\{opacity:0\}\}/);
    assert.match(css, /\.mv-mover\{opacity:0;animation:mv-mover 2000ms step-end infinite,mv-mover-s 2000ms step-end infinite\}/);
    assert.match(css, /\.mv-mover-1\{opacity:0;animation:mv-mover-1 2000ms step-end infinite\}/);
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{\[class\^="mv-"\],\[class\*=" mv-"\]\{animation:none\}\}$/);
  });

  it('a still track writes no CSS', () => {
    assert.equal(motionCss({ duration: 1000, tracks: [track([{ t: 0 }])] }, new Map([['mover', { object: 'dot' }]])), '');
  });

  it('the optimizer keeps the <style> and stays lossless', () => {
    const { output } = compileScene(src({ ...scene(motion), output: 'demo.svg' }), 'demo');
    assert.match(output, /^<svg [^>]*><style>@keyframes mv-mover\{/);
    assert.match(output, /<g class="mv-mover"><g class="mv-mover-0">/);
  });

  it('serializes canonically: ids after the object, then motion with one key per line', () => {
    const s = scene({ duration: 1000, tracks: [track([{ t: 0 }, { t: 500, move: [4, -2], show: false, pose: 'box' }])] });
    const text = serialize(s);
    assert.match(text, /\{ object: 'dot', id: 'mover', at: \{ px: \[2, 2\] \} \},/);
    assert.match(text, /  motion: \{\n    duration: 1000,\n    tracks: \[\n      \{\n        item: 'mover',\n        keys: \[\n          \{ t: 0 \},\n          \{ t: 500, move: \[4, -2\], show: false, pose: 'box' \},\n        \],\n      \},\n    \],\n  \},\n/);
  });
});
