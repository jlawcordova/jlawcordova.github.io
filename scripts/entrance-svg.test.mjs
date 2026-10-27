// The build-ups play from the SVGs (entrance in SVG spec R14). Pixel Lab v0.10.0
// writes each scene's entrance into its compiled SVG, and a page plays it by
// putting `enter` in a data-play list (the lab's docs/site-contract.md, "The
// entrance"). The site keeps no copy of the schedule, so this is what CI sees
// of the build-up: both SVGs carry it, it plays only with motion allowed, the
// hero asks for it, and each settles when the site's old schedule did.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { pixellab } from './pixellab.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DOCUMENT = join(ROOT, 'src/assets/pixel-art/jlawcordova.pixellab');

async function show(/** @type {string} */ scene) {
  const { status, stdout, stderr } = await pixellab(['scene', 'entrance', 'show', scene, '--document', DOCUMENT, '--json']);
  assert.equal(status, 0, stderr);
  return JSON.parse(stdout);
}

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
  ['hero-island', 2320],
  ['range-sprite', 1440],
])) {
  describe(`${scene}.svg`, async () => {
    const entrance = await show(scene);
    const svg = await readFile(join(ROOT, 'src/assets/pixel-art', `${scene}.svg`), 'utf8');

    it('has an entrance, and every data-enter group in the SVG is one of its pieces, with its wrapper inside', () => {
      assert.ok(entrance.entrance, `${scene} has no entrance`);
      // Each piece's drawing moves into a group the compiler adds, its only child.
      const pieces = [...svg.matchAll(/<g\b[^>]*\sdata-enter="[^"]*"[^>]*>(<[^>]*>)/g)];
      assert.ok(pieces.length > 0, 'the SVG has data-enter groups');
      for (const [, child] of pieces) assert.match(child, /^<g\b(?![^>]*\sdata-enter=)/, `a piece starts with ${child.slice(0, 60)}`);
      // entrance show lists the scene's pieces, or a Range's first setting's (data-class="0").
      const first = svg.includes('data-class="0"') ? svg.slice(svg.indexOf('data-class="0"'), svg.indexOf('data-class="1"')) : svg;
      assert.equal((first.match(/<g\b[^>]*\sdata-enter="/g) ?? []).length, entrance.pieces.length, 'as many pieces as data-enter groups');
    });

    it('plays enter from data-play, only when motion is allowed', () => {
      const style = svg.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
      const enter = rules(style).filter((r) => r.selector.includes('[data-play~="enter"]'));
      assert.ok(enter.length > 0, 'a rule plays enter');
      for (const { selector, at } of enter) {
        assert.match(at, /prefers-reduced-motion:\s*no-preference/, `${selector} is outside the no-preference query`);
      }
    });

    it(`settles at ${settledBy} ms, as the site's own schedule did`, () => {
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
