// The build-ups play from the SVGs (entrance in SVG spec R14). Pixpocket
// writes each scene's entrance into its compiled SVG, and a page plays it by
// putting `enter` in a data-play list (Pixpocket's docs/site-contract.md, "The
// entrance"). The site keeps no copy of the schedule, so this is what CI sees
// of the build-up: both SVGs carry it, it plays only with motion allowed, and
// the hero asks for it. Where Pixpocket is installed, it also checks when each
// settles and that the document's pieces are the SVG's.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { DOCUMENT as DOC, pixpocket } from './pixpocket.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DOCUMENT = join(ROOT, DOC);

/** What `scene entrance show` says of a scene, or undefined where Pixpocket isn't installed. */
function show(/** @type {string} */ scene) {
  const run = pixpocket(['scene', 'entrance', 'show', scene, '--document', DOCUMENT, '--json']);
  if (!run) return undefined;
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
}
const NO_PROGRAM = "Pixpocket isn't installed here";

/** The rules of a stylesheet at the top level, with the at-rule each sits in (or ''). */
function rules(/** @type {string} */ css) {
  const out = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    if (css[i] === '{') {
      stack.push(css.slice(start, i).trim());
      start = i + 1;
    } else if (css[i] === '}') {
      const selector = stack.pop();
      if (selector !== undefined && !selector.startsWith('@')) out.push({ selector, at: stack.filter((s) => s.startsWith('@')).join(' ') });
      start = i + 1;
    }
  }
  return out;
}

for (const [scene, settledBy] of /** @type {const} */ ([
  ['hero-island', 2296],
  ['range-sprite', 1440],
])) {
  describe(`${scene}.svg`, () => {
    const entrance = show(scene);
    const skip = entrance ? false : NO_PROGRAM;

    it('carries an entrance: every data-enter group has the wrapper its drawing moves in', async () => {
      const svg = await readFile(join(ROOT, 'src/assets/pixel-art', `${scene}.svg`), 'utf8');
      // Each piece's drawing moves into a group the compiler adds, its only child.
      const pieces = [...svg.matchAll(/<g\b[^>]*\sdata-enter="[^"]*"[^>]*>(<[^>]*>)/g)];
      assert.ok(pieces.length > 0, 'the SVG has data-enter groups');
      for (const [, child] of pieces) assert.match(child, /^<g\b(?![^>]*\sdata-enter=)/, `a piece starts with ${child.slice(0, 60)}`);
    });

    it("the document's pieces are the SVG's data-enter groups", { skip }, async () => {
      const svg = await readFile(join(ROOT, 'src/assets/pixel-art', `${scene}.svg`), 'utf8');
      assert.ok(entrance.entrance, `${scene} has no entrance`);
      // entrance show lists the scene's pieces, or a Range's first setting's (data-class="0").
      const first = svg.includes('data-class="0"') ? svg.slice(svg.indexOf('data-class="0"'), svg.indexOf('data-class="1"')) : svg;
      assert.equal((first.match(/<g\b[^>]*\sdata-enter="/g) ?? []).length, entrance.pieces.length, 'as many pieces as data-enter groups');
    });

    it('plays enter from data-play, only when motion is allowed', async () => {
      const svg = await readFile(join(ROOT, 'src/assets/pixel-art', `${scene}.svg`), 'utf8');
      const style = svg.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
      const enter = rules(style).filter((r) => r.selector.includes('[data-play~="enter"]'));
      assert.ok(enter.length > 0, 'a rule plays enter');
      for (const { selector, at } of enter) {
        assert.match(at, /prefers-reduced-motion:\s*no-preference/, `${selector} is outside the no-preference query`);
      }
    });

    it(`settles at ${settledBy} ms`, { skip }, () => {
      assert.equal(entrance.settledBy, settledBy);
    });
  });
}

describe('the hero', () => {
  it('inlines the island with data-play="enter", so it builds up on load without script', async () => {
    const astro = await readFile(join(ROOT, 'src/components/home/HeroIsland.astro'), 'utf8');
    assert.match(astro, /\.replace\('<svg ', '<svg [^']*\bdata-play="enter"[^']*'\)/);
  });
});
