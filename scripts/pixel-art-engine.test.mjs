// Tests for the pixel-art engine (pixel-art engine spec D8): parsing and
// validation with exact messages, sprites, scenes, the serializer, the
// palette and the PNG previews. Small inline fixtures, Node built-ins only.
// Test names start with the requirement they cover (R34).

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { inflateSync } from 'node:zlib';

import { composite, loadSources, renderObject, renderScene, resolve, validate } from '../src/lib/pixel-art/engine.mjs';
import { tileToPx } from '../src/lib/pixel-art/iso.mjs';
import { serialize } from '../src/lib/pixel-art/serialize.mjs';
import { toRectSvg } from '../src/lib/pixel-art/svg.mjs';
import { encodePng, renderPreview } from './pixel-art-preview.mjs';

const PALETTE = {
  world: { ink: '#2E2418', cream: '#F4EDE0', 'grass-2': '#8FA56E', 'grass-4': '#4E6B3A', 'wood-3': '#7A4E2D' },
  outfit: { 'teal-1': '#7FA89B' },
  legacy: { 'c-6f8a55': '#6F8A55', 'c-2e2418': '#2E2418' },
};

/** Sources from inline objects and scenes. */
const src = (objects = {}, scenes = {}, palette = PALETTE) => loadSources({ palette, objects, scenes });
/** A one-layer sprite. */
const sprite = (map, keys = { g: 'grass-2' }, extra = {}) => ({ kind: 'sprite', keys, layers: [{ map }], ...extra });
const scene = (items, extra = {}) => ({ viewBox: [0, 0, 8, 8], items, ...extra });
const hexOf = (sources) => (name) => sources.colors.get(name).hex;

/** Deterministic pseudo-random numbers (mulberry32), so a failure can be replayed from its seed. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEEDS = [1, 7, 42, 2026, 31337];

/** Imports source text as a module, the way `npm run art` loads a file. */
const load = async (text) => (await import(`data:text/javascript,${encodeURIComponent(text)}`)).default;

describe('validation (R30: every error names the file, the place and the rule)', () => {
  it('R1: a sprite object loads and validates with no problems', () => {
    assert.deepEqual(validate(src({ tree: sprite(['.g.', 'ggg']) })), []);
  });

  it('R30: a ragged row', () => {
    assert.deepEqual(validate(src({ tree: sprite(['ggg', 'gg', 'ggg']) })), ['objects/tree.mjs: layer 0, row 1: 2 wide, expected 3']);
  });

  it('R30: a map with the wrong number of rows, in a frame', () => {
    const tree = { kind: 'sprite', keys: { g: 'grass-2' }, layers: [{ map: ['g', 'g'] }, { loop: 'wf', prefix: 'w', frames: [['g', 'g'], ['g']] }] };
    assert.deepEqual(validate(src({ tree })), ['objects/tree.mjs: layer 1, frame 1: 1 rows, expected 2']);
  });

  it('R30: a key that is not in keys, with its column', () => {
    assert.deepEqual(validate(src({ tree: sprite(['ggg', 'gqg']) })), ["objects/tree.mjs: layer 0, row 1, column 1: key 'q' is not in keys"]);
  });

  it('R30: keys are case-sensitive', () => {
    assert.deepEqual(validate(src({ tree: sprite(['gG']) })), ["objects/tree.mjs: layer 0, row 0, column 1: key 'G' is not in keys"]);
  });

  it('R30: a key that is more than one character, or a space', () => {
    assert.deepEqual(validate(src({ tree: sprite(['g'], { g: 'grass-2', gg: 'ink', ' ': 'ink' }) })), [
      "objects/tree.mjs: key 'gg': keys are one printable character, not space or '.'",
      "objects/tree.mjs: key ' ': keys are one printable character, not space or '.'",
    ]);
  });

  it('R30: a color that is not in the palette', () => {
    assert.deepEqual(validate(src({ tree: sprite(['g'], { g: 'grass-9' }) })), ["objects/tree.mjs: key 'g': 'grass-9' is not in the palette"]);
  });

  it('R30: a scene that places a missing object', () => {
    const problems = validate(src({}, { demo: scene([{ object: 'nope', at: { px: [0, 0] } }]) }));
    assert.deepEqual(problems, ["scenes/demo.mjs: items[0]: object 'nope' does not exist"]);
  });

  it('R30: a missing object inside a group names the nested item', () => {
    const problems = validate(src({}, { demo: scene([{ group: { 'data-class': '0' }, items: [{ object: 'nope', at: { px: [0, 0] } }] }]) }));
    assert.deepEqual(problems, ["scenes/demo.mjs: items[0].items[0]: object 'nope' does not exist"]);
  });

  it('R30: extends an object that does not exist', () => {
    assert.deepEqual(validate(src({ hat: { kind: 'sprite', extends: 'nope' } })), ["objects/hat.mjs: extends 'nope', which does not exist"]);
  });

  it('R30: an extends cycle', () => {
    const objects = { a: { kind: 'sprite', extends: 'b' }, b: { kind: 'sprite', extends: 'a' } };
    assert.deepEqual(validate(src(objects)), ['objects/a.mjs: extends cycle: a → b → a', 'objects/b.mjs: extends cycle: b → a → b']);
  });

  it('R30: non-integer offsets and anchors', () => {
    const problems = validate(
      src({ tree: sprite(['g'], undefined, { anchor: [0.5, 0] }) }, { demo: scene([{ object: 'tree', at: { px: [1.5, 0] } }, { object: 'tree', at: { tile: [0, 0] } }]) }),
    );
    assert.deepEqual(problems, [
      'objects/tree.mjs: anchor must be two whole numbers',
      'scenes/demo.mjs: items[0]: at.px must be two whole numbers',
      'scenes/demo.mjs: items[1]: at.tile must be three whole numbers',
    ]);
  });

  it('R30: unknown properties and kinds', () => {
    const problems = validate(src({ tree: { ...sprite(['g']), kind: 'blob', colour: 'red' } }));
    assert.deepEqual(problems, ["objects/tree.mjs: unknown property 'colour'", "objects/tree.mjs: kind must be 'sprite', got 'blob'"]);
  });

  it('R30: a row override with the wrong width, or out of range', () => {
    const objects = {
      character: sprite(['gg', 'gg'], { g: 'grass-2' }),
      hat: { kind: 'sprite', extends: 'character', rows: { 0: { 1: 'ggg' } } },
      cap: { kind: 'sprite', extends: 'character', rows: { 0: { 2: 'gg' } } },
    };
    assert.deepEqual(validate(src(objects)), [
      'objects/cap.mjs: layer 0, row 2 (override): character has rows 0 to 1',
      'objects/hat.mjs: layer 0, row 1 (override): 3 wide, expected 2',
    ]);
  });

  it('R30: every problem is reported, not only the first', () => {
    assert.deepEqual(validate(src({ tree: sprite(['gq', 'g']) })), [
      'objects/tree.mjs: layer 0, row 0, column 1: key \'q\' is not in keys',
      'objects/tree.mjs: layer 0, row 1: 1 wide, expected 2',
    ]);
  });

  it('R30: names must be lowercase kebab-case', () => {
    assert.deepEqual(validate(src({ Tree: sprite(['g']) })), ['objects/Tree.mjs: names are lowercase kebab-case']);
  });

  it('R30: two scenes cannot write the same output', () => {
    const problems = validate(src({}, { a: scene([], { output: 'x.svg' }), b: scene([], { output: 'x.svg' }) }));
    assert.deepEqual(problems, ["scenes/b.mjs: output 'x.svg' is also written by scenes/a.mjs"]);
  });

  it('R30: group attributes are class or data-*', () => {
    const problems = validate(src({}, { demo: scene([{ group: { onclick: 'x' }, items: [] }]) }));
    assert.deepEqual(problems, ["scenes/demo.mjs: items[0]: group attribute 'onclick' must be class or data-*"]);
  });

  it('R30, L4: random invalid objects each fail with their exact message', () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const w = 2 + Math.floor(r() * 30);
      const h = 3 + Math.floor(r() * 30); // 3 or more, so the most common width is clear
      const map = Array.from({ length: h }, () => Array.from({ length: w }, () => (r() < 0.5 ? 'g' : '.')).join(''));
      const row = Math.floor(r() * h);
      const col = Math.floor(r() * w);
      const cases = [
        [map.map((m, i) => (i === row ? m.slice(1) : m)), `layer 0, row ${row}: ${w - 1} wide, expected ${w}`],
        [map.map((m, i) => (i === row ? `${m.slice(0, col)}z${m.slice(col + 1)}` : m)), `layer 0, row ${row}, column ${col}: key 'z' is not in keys`],
        [map.map((m) => m + '.'.repeat(65 - w)), `65×${h}, max 64×64`],
      ];
      for (const [bad, message] of cases) {
        assert.deepEqual(validate(src({ tree: sprite(bad) })), [`objects/tree.mjs: ${message}`], `seed ${seed}`);
      }
    }
  });
});

describe('design language (R26, R27)', () => {
  const twelve = 'abcdefghijkl';
  const manyColors = (n) => Object.fromEntries([...'abcdefghijklm'].slice(0, n).map((k, i) => [k, `w-${i}`]));
  const wide = { ...PALETTE, world: { ...PALETTE.world, ...Object.fromEntries([...Array(13).keys()].map((i) => [`w-${i}`, `#0000${String(i).padStart(2, '0')}`])) } };

  it('R27: rejects a 13th color, and allows 12', () => {
    assert.deepEqual(validate(src({ tree: sprite([twelve], manyColors(12)) }, {}, wide)), []);
    assert.deepEqual(validate(src({ tree: sprite([`${twelve}m`], manyColors(13)) }, {}, wide)), ['objects/tree.mjs: uses 13 colors, max 12']);
  });

  it('R27: counts colors by value, so two keys for one color count once', () => {
    assert.deepEqual(validate(src({ tree: sprite(['gG'], { g: 'grass-2', G: 'grass-2' }) })), []);
  });

  it('R27: rejects a 65×64 object, and allows 64×64', () => {
    const map = (w, h) => Array.from({ length: h }, () => 'g'.repeat(w));
    assert.deepEqual(validate(src({ tree: sprite(map(64, 64)) })), []);
    assert.deepEqual(validate(src({ tree: sprite(map(65, 64)) })), ['objects/tree.mjs: 65×64, max 64×64']);
    assert.deepEqual(validate(src({ tree: sprite(map(64, 65)) })), ['objects/tree.mjs: 64×65, max 64×64']);
  });

  it('R27: rejects a 16×25 character, and an outfit that makes one', () => {
    const body = (h) => Array.from({ length: h }, () => 'g'.repeat(16));
    assert.deepEqual(validate(src({ character: sprite(body(24)) })), []);
    assert.deepEqual(validate(src({ character: sprite(body(25)) })), ['objects/character.mjs: the figure is 16×25; a character is at most 16×24']);
    const legacyBase = { character: sprite(body(25), undefined, { legacy: true }), hat: { kind: 'sprite', extends: 'character' } };
    assert.deepEqual(validate(src(legacyBase)), ['objects/hat.mjs: the figure is 16×25; a character is at most 16×24']);
  });

  it('R27: a character\'s cap is on the figure it paints, not its canvas', () => {
    const canvas = (figureWidth) => Array.from({ length: 30 }, (_, y) => (y < 24 ? `${'.'.repeat(10)}${'g'.repeat(figureWidth)}`.padEnd(32, '.') : '.'.repeat(32)));
    const base = { character: sprite(canvas(16), undefined, { legacy: true }) };
    assert.deepEqual(validate(src({ ...base, coat: { kind: 'sprite', extends: 'character' } })), []);
    const prop = { kind: 'sprite', extends: 'character', rows: { 0: { 29: 'g'.padEnd(32, '.') } } };
    assert.deepEqual(validate(src({ ...base, coat: prop })), ['objects/coat.mjs: the figure is 26×30; a character is at most 16×24']);
  });

  it('R26: rejects a legacy color in a new object', () => {
    assert.deepEqual(validate(src({ tree: sprite(['g'], { g: 'c-6f8a55' }) })), [
      "objects/tree.mjs: key 'g': 'c-6f8a55' is a legacy color; only imported art may use it",
    ]);
  });

  it('R26: an outfit color only in objects that extend character', () => {
    assert.deepEqual(validate(src({ tree: sprite(['t'], { t: 'teal-1' }) })), [
      "objects/tree.mjs: key 't': 'teal-1' is an outfit color; only objects that extend character may use it",
    ]);
    const objects = { character: sprite(['g']), coat: { kind: 'sprite', extends: 'character', keys: { g: 'teal-1' } } };
    assert.deepEqual(validate(src(objects)), []);
  });

  it('R26: an outfit inherits the colors it uses, so a legacy base must be re-keyed', () => {
    const objects = { character: sprite(['l'], { l: 'c-6f8a55' }, { legacy: true }), coat: { kind: 'sprite', extends: 'character' } };
    assert.deepEqual(validate(src(objects)), ["objects/coat.mjs: key 'l': 'c-6f8a55' is a legacy color; only imported art may use it"]);
    objects.coat.keys = { l: 'grass-2' };
    assert.deepEqual(validate(src(objects)), []);
  });

  it('R27: legacy objects are exempt from the caps and the tiers', () => {
    const map = Array.from({ length: 70 }, () => `${twelve}m`.repeat(6));
    assert.deepEqual(validate(src({ base: sprite(map, { ...manyColors(13), l: 'c-6f8a55' }, { legacy: true }) }, {}, wide)), []);
  });

  it('R26: palette tiers over their caps', () => {
    const big = (n, prefix) => Object.fromEntries([...Array(n).keys()].map((i) => [`${prefix}-${i}`, `#00${String(i).padStart(4, '0')}`]));
    const problems = validate(loadSources({ palette: { world: big(33, 'w'), outfit: big(17, 'o'), legacy: big(90, 'l') } }));
    assert.deepEqual(problems, ['palette.mjs: world has 33 colors, max 32', 'palette.mjs: outfit has 17 colors, max 16']);
  });

  it('R26: palette values are uppercase hex with no alpha, and names are unique across tiers', () => {
    const palette = { world: { ink: '#2e2418', cream: '#F4EDE0AA' }, outfit: {}, legacy: { ink: '#2E2418' } };
    assert.deepEqual(validate(loadSources({ palette })), [
      "palette.mjs: world 'ink': '#2e2418' must be uppercase #RRGGBB, with no alpha",
      "palette.mjs: world 'cream': '#F4EDE0AA' must be uppercase #RRGGBB, with no alpha",
      "palette.mjs: 'ink' is in both world and legacy; names must be unique",
    ]);
  });

  it('R26: the same value may be in two tiers under different names', () => {
    assert.deepEqual(validate(src()), []);
  });

  it('R27, L4: random oversize objects fail with their exact size', () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const w = 65 + Math.floor(r() * 40);
      const h = 1 + Math.floor(r() * 100);
      const message = `objects/tree.mjs: ${w}×${h}, max 64×64`;
      assert.deepEqual(validate(src({ tree: sprite(Array.from({ length: h }, () => 'g'.repeat(w))) })), [message], `seed ${seed}`);
    }
  });
});

describe('sprites', () => {
  it('R1: "." is transparent, and the anchor sits on the placement point', () => {
    const sources = src({ dot: sprite(['...', '.g.'], undefined, { anchor: [1, 1] }) });
    assert.deepEqual([...composite(renderObject(sources, 'dot'))], [['0,0', 'grass-2']]);
  });

  it('R5: layers paint bottom to top, and a class layer gets its own group', () => {
    const coat = { kind: 'sprite', keys: { g: 'grass-2', i: 'ink' }, layers: [{ map: ['gg'] }, { class: 'cbob', map: ['.i'] }] };
    const sources = src({ coat }, { s: scene([{ object: 'coat', at: { px: [0, 0] } }]) });
    const svg = toRectSvg(renderScene(sources, 's'), hexOf(sources));
    assert.equal(
      svg,
      '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="0 0 8 8" shape-rendering="crispEdges">' +
        '<g fill="#8FA56E"><rect x="0" y="0" width="2" height="1"/></g>' +
        '<g class="cbob"><g fill="#2E2418"><rect x="1" y="0" width="1" height="1"/></g></g></svg>',
    );
    assert.deepEqual([...composite(renderScene(sources, 's').root)].sort(), [['0,0', 'grass-2'], ['1,0', 'ink']]);
  });

  it('R5: a frame loop compiles to "<loop> <prefix>N" groups, and frame 0 is the static frame', () => {
    const fall = { kind: 'sprite', keys: { w: 'cream' }, layers: [{ loop: 'wf', prefix: 'w', frames: [['w.'], ['.w'], ['..']] }] };
    const sources = src({ fall }, { s: scene([{ object: 'fall', at: { px: [0, 0] } }]) });
    const rendered = renderScene(sources, 's');
    assert.equal(
      toRectSvg(rendered, hexOf(sources)).replace(/^<svg[^>]*>|<\/svg>$/g, ''),
      '<g class="wf w0"><g fill="#F4EDE0"><rect x="0" y="0" width="1" height="1"/></g></g>' +
        '<g class="wf w1"><g fill="#F4EDE0"><rect x="1" y="0" width="1" height="1"/></g></g>' +
        '<g class="wf w2"></g>',
    );
    assert.deepEqual([...composite(rendered.root)], [['0,0', 'cream']]);
  });

  it('R5: colors are first painted in key order, and runs are sorted by y, then x', () => {
    const tree = sprite(['gi', 'ig', 'gg'], { i: 'ink', g: 'grass-2' });
    const sources = src({ tree }, { s: scene([{ object: 'tree', at: { px: [0, 0] } }]) });
    assert.equal(
      toRectSvg(renderScene(sources, 's'), hexOf(sources)).replace(/^<svg[^>]*>|<\/svg>$/g, ''),
      '<g fill="#2E2418"><rect x="1" y="0" width="1" height="1"/><rect x="0" y="1" width="1" height="1"/></g>' +
        '<g fill="#8FA56E"><rect x="0" y="0" width="1" height="1"/><rect x="1" y="1" width="1" height="1"/><rect x="0" y="2" width="2" height="1"/></g>',
    );
  });

  it('R2: extends replaces whole rows per layer, then merges keys', () => {
    const objects = {
      character: { kind: 'sprite', anchor: [1, 0], keys: { o: 'ink', s: 'cream' }, layers: [{ map: ['oo', 'ss'] }, { class: 'cbob', map: ['s.', '.s'] }] },
      coat: { kind: 'sprite', extends: 'character', keys: { s: 'grass-2', t: 'teal-1' }, rows: { 1: { 0: 'tt' } } },
    };
    const coat = resolve(src(objects), 'coat');
    assert.deepEqual(coat.keys, { o: 'ink', s: 'grass-2', t: 'teal-1' });
    assert.deepEqual(coat.layers, [{ map: ['oo', 'ss'] }, { class: 'cbob', map: ['tt', '.s'] }]);
    assert.deepEqual(coat.anchor, [1, 0]);
    assert.equal(coat.character, true);
    assert.deepEqual(objects.character.layers[1].map, ['s.', '.s'], 'the base is not changed');
  });
});

describe('scenes (R3)', () => {
  const dot = sprite(['g']);
  const ink = sprite(['i'], { i: 'ink' });

  it('R3: items paint in source order, and later paint wins in a layer', () => {
    const sources = src({ dot, ink }, { s: scene([{ object: 'dot', at: { px: [1, 1] } }, { object: 'ink', at: { px: [1, 1] } }]) });
    const out = toRectSvg(renderScene(sources, 's'), hexOf(sources));
    assert.match(out, /<g fill="#2E2418"><rect x="1" y="1" width="1" height="1"\/><\/g><\/svg>$/);
    assert.doesNotMatch(out, /#8FA56E/, 'a fully covered color leaves no group');
    const swapped = src({ dot, ink }, { s: scene([{ object: 'ink', at: { px: [1, 1] } }, { object: 'dot', at: { px: [1, 1] } }]) });
    assert.deepEqual([...composite(renderScene(swapped, 's').root)], [['1,1', 'grass-2']]);
  });

  it('R3: groups carry their attributes in source order, and placement classes wrap the object', () => {
    const items = [
      { group: { 'data-class': '0', class: 'variant' }, items: [{ object: 'dot', at: { px: [0, 0] } }] },
      { object: 'ink', class: 'itruck it1', at: { px: [2, 0] } },
    ];
    const sources = src({ dot, ink }, { s: scene(items) });
    assert.equal(
      toRectSvg(renderScene(sources, 's'), hexOf(sources)).replace(/^<svg[^>]*>|<\/svg>$/g, ''),
      '<g data-class="0" class="variant"><g fill="#8FA56E"><rect x="0" y="0" width="1" height="1"/></g></g>' +
        '<g class="itruck it1"><g fill="#2E2418"><rect x="2" y="0" width="1" height="1"/></g></g>',
    );
  });

  it('R3: tile placement uses the grid and the scene origin; px placement is exact', () => {
    assert.deepEqual(tileToPx([0, 0, 0], [0, 0]), [0, 0]);
    assert.deepEqual(tileToPx([1, 0, 0], [0, 0]), [16, 8]);
    assert.deepEqual(tileToPx([0, 1, 0], [0, 0]), [-16, 8]);
    assert.deepEqual(tileToPx([2, 1, 1], [5, 32]), [21, 40]);
    const items = [{ object: 'dot', at: { tile: [1, 0, 1] } }, { object: 'ink', at: { px: [3, 4] } }];
    const sources = src({ dot, ink }, { s: scene(items, { origin: [2, 30] }) });
    assert.deepEqual([...composite(renderScene(sources, 's').root)], [['18,22', 'grass-2'], ['3,4', 'ink']]);
  });

  it('R3: the root carries the scene viewBox in today\'s attribute order', () => {
    const sources = src({}, { s: scene([], { viewBox: [-51, -9, 103, 72] }) });
    assert.equal(
      toRectSvg(renderScene(sources, 's'), hexOf(sources)),
      '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="-51 -9 103 72" shape-rendering="crispEdges"></svg>',
    );
  });
});

describe('serializer (R9)', () => {
  it('R9: writes the canonical text for a sprite', () => {
    const obj = {
      kind: 'sprite',
      legacy: true,
      anchor: [5, 13],
      keys: { L: 'grass-2', "'": 'ink' },
      layers: [{ map: ['.L.', "'L'"] }, { class: 'cbob', map: ['...', '.L.'] }, { loop: 'wf', prefix: 'w', frames: [['L..', '...'], ['.L.', '...']] }],
    };
    assert.equal(
      serialize(obj),
      `// Pixel-art object. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  kind: 'sprite',
  legacy: true,
  anchor: [5, 13],
  keys: {
    L: 'grass-2',
    '\\'': 'ink',
  },
  layers: [
    {
      map: [
        '.L.',
        '\\'L\\'',
      ],
    },
    {
      class: 'cbob',
      map: [
        '...',
        '.L.',
      ],
    },
    {
      loop: 'wf',
      prefix: 'w',
      frames: [
        [
          'L..',
          '...',
        ],
        [
          '.L.',
          '...',
        ],
      ],
    },
  ],
};
`,
    );
  });

  it('R9: writes the canonical text for an outfit and a scene', () => {
    assert.equal(
      serialize({ kind: 'sprite', extends: 'character', keys: {}, rows: { 0: { 3: 'ab', 10: 'cd' }, 1: {} } }),
      `// Pixel-art object. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  kind: 'sprite',
  extends: 'character',
  keys: {},
  rows: {
    0: {
      3: 'ab',
      10: 'cd',
    },
    1: {},
  },
};
`,
    );
    const s = {
      output: 'range-sprite.svg',
      viewBox: [-51, -9, 103, 72],
      origin: [0, 32],
      items: [
        { object: 'range-island', at: { px: [-51, -9] } },
        { group: { 'data-class': '0' }, items: [{ object: 'outfit-front-end', class: 'a b', at: { tile: [1, -2, 0] } }] },
        { group: {}, items: [] },
      ],
    };
    assert.equal(
      serialize(s),
      `// Pixel-art scene. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  output: 'range-sprite.svg',
  viewBox: [-51, -9, 103, 72],
  origin: [0, 32],
  items: [
    { object: 'range-island', at: { px: [-51, -9] } },
    {
      group: { 'data-class': '0' },
      items: [
        { object: 'outfit-front-end', class: 'a b', at: { tile: [1, -2, 0] } },
      ],
    },
    {
      group: {},
      items: [],
    },
  ],
};
`,
    );
  });

  it('R9, L4: random objects and scenes survive save and reload byte for byte', async () => {
    const chars = 'abcXYZ019#@\'\\"%!~';
    for (const seed of SEEDS) {
      const r = rng(seed);
      const pick = (list) => list[Math.floor(r() * list.length)];
      const w = 1 + Math.floor(r() * 64);
      const h = 1 + Math.floor(r() * 24);
      const keyList = [...new Set(Array.from({ length: 1 + Math.floor(r() * 12) }, () => pick([...chars])))];
      const map = () => Array.from({ length: h }, () => Array.from({ length: w }, () => (r() < 0.3 ? '.' : pick(keyList))).join(''));
      const layers = [{ map: map() }];
      if (r() < 0.5) layers.push({ class: 'cbob', map: map() });
      if (r() < 0.5) layers.push({ loop: 'hf', prefix: 'h', frames: Array.from({ length: 1 + Math.floor(r() * 5) }, map) });
      const obj = { kind: 'sprite', ...(r() < 0.5 ? { legacy: true } : {}), anchor: [Math.floor(r() * w), Math.floor(r() * h)], keys: Object.fromEntries(keyList.map((k) => [k, 'ink'])), layers };
      const text = serialize(obj);
      const loaded = await load(text);
      assert.deepEqual(loaded, obj, `seed ${seed}`);
      assert.equal(serialize(loaded), text, `seed ${seed}`);

      const item = () => (r() < 0.5 ? { object: 'dot', at: { px: [Math.floor(r() * 200) - 100, Math.floor(r() * 200) - 100] } } : { object: 'dot', class: 'pcloud pc1', at: { tile: [Math.floor(r() * 9) - 4, Math.floor(r() * 9), Math.floor(r() * 3)] } });
      const s = { viewBox: [-10, -10, 20, 20], items: [item(), { group: { 'data-class': String(seed) }, items: [item(), item()] }, item()] };
      const sceneText = serialize(s);
      assert.equal(serialize(await load(sceneText)), sceneText, `seed ${seed}`);
      assert.deepEqual(await load(sceneText), s, `seed ${seed}`);
    }
  });
});

describe('palette (R6, R26)', () => {
  const palette = async () => (await import('../src/assets/pixel-art/source/palette.mjs')).default;

  it('R6: brand entries match their variables.css tokens', async () => {
    const css = await readFile(new URL('../src/styles/variables.css', import.meta.url), 'utf8');
    const token = (name) => new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6});`).exec(css)?.[1].toUpperCase();
    const { world } = await palette();
    const brand = { ink: 'color-ink', cream: 'color-page', 'gold-2': 'color-gold', 'soil-3': 'color-earth' };
    for (const [name, tokenName] of Object.entries(brand)) {
      assert.ok(token(tokenName), `--${tokenName} is in variables.css`);
      assert.equal(world[name], token(tokenName), `${name} matches --${tokenName}`);
    }
  });

  it('R26: the committed palette validates: caps, uppercase hex, unique names', async () => {
    assert.deepEqual(validate(loadSources({ palette: await palette() })), []);
  });

  it('R26: the legacy tier is the 81 extracted colors, named c-<hex> and sorted by value', async () => {
    const { legacy } = await palette();
    const entries = Object.entries(legacy);
    assert.equal(entries.length, 81);
    for (const [name, hex] of entries) assert.equal(name, `c-${hex.slice(1).toLowerCase()}`);
    const hexes = entries.map(([, hex]) => hex);
    assert.deepEqual(hexes, [...hexes].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });
});

describe('previews (R29)', () => {
  /** Decodes an RGBA, 8-bit, non-interlaced PNG made by encodePng. */
  function decodePng(buf) {
    assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'PNG signature');
    let pos = 8;
    let ihdr;
    const idat = [];
    const crc32 = (b) => {
      let c = ~0;
      for (const byte of b) {
        c ^= byte;
        for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
      }
      return ~c >>> 0;
    };
    while (pos < buf.length) {
      const len = buf.readUInt32BE(pos);
      const type = buf.toString('latin1', pos + 4, pos + 8);
      const data = buf.subarray(pos + 8, pos + 8 + len);
      assert.equal(buf.readUInt32BE(pos + 8 + len), crc32(buf.subarray(pos + 4, pos + 8 + len)), `${type} CRC`);
      if (type === 'IHDR') ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
      if (type === 'IDAT') idat.push(data);
      pos += 12 + len;
    }
    assert.deepEqual({ depth: ihdr.depth, color: ihdr.color, interlace: ihdr.interlace }, { depth: 8, color: 6, interlace: 0 });
    const raw = inflateSync(Buffer.concat(idat));
    const stride = ihdr.width * 4 + 1;
    const pixels = [];
    for (let y = 0; y < ihdr.height; y++) {
      assert.equal(raw[y * stride], 0, 'filter type 0');
      for (let x = 0; x < ihdr.width; x++) pixels.push([...raw.subarray(y * stride + 1 + x * 4, y * stride + 5 + x * 4)]);
    }
    return { width: ihdr.width, height: ihdr.height, pixels };
  }

  it('R29: the PNG writer makes a valid PNG whose pixels are the image, at 1× and 3×', () => {
    const image = { width: 2, height: 2, rgba: Buffer.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 1, 2, 3, 255]) };
    const one = decodePng(encodePng(image, 1));
    assert.deepEqual(one, { width: 2, height: 2, pixels: [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [1, 2, 3, 255]] });
    const three = decodePng(encodePng(image, 3));
    assert.equal(three.width, 6);
    assert.equal(three.height, 6);
    assert.deepEqual(three.pixels[0], [255, 0, 0, 255]);
    assert.deepEqual(three.pixels[2], [255, 0, 0, 255]);
    assert.deepEqual(three.pixels[3], [0, 255, 0, 255]);
    assert.deepEqual(three.pixels[3 * 6 + 5], [1, 2, 3, 255]);
  });

  it('R29: a preview has the engine\'s pixels on the card color, standing on a tile', () => {
    const sources = src({ dot: sprite(['g.', 'gg'], undefined, { anchor: [0, 1] }) });
    const card = [0xe9, 0xdc, 0xc6];
    const grid = [0xe0, 0xd3, 0xbd];
    const { image, origin } = renderPreview(sources, { object: 'dot' }, { card, grid });
    const decoded = decodePng(encodePng(image, 1));
    const at = (x, y) => decoded.pixels[(y - origin[1]) * decoded.width + (x - origin[0])];
    const grass = [0x8f, 0xa5, 0x6e, 255];
    assert.deepEqual(at(0, -1), grass);
    assert.deepEqual(at(0, 0), grass);
    assert.deepEqual(at(1, 0), grass);
    assert.deepEqual(at(1, -1), [...card, 255], 'transparent pixels show the card');
    assert.deepEqual(at(-16, 0), [...grid, 255], 'the tile outline\'s left corner');
    assert.deepEqual(at(15, 0), [...grid, 255], 'the tile outline\'s right corner');
    assert.deepEqual(at(0, -8), [...grid, 255], 'the tile outline\'s top corner');
    assert.deepEqual(at(0, 7), [...grid, 255], 'the tile outline\'s bottom corner');
  });

  it('R29: a scene preview shows only the first of sibling data-class variants', () => {
    const items = ['0', '1'].map((n, i) => ({ group: { 'data-class': n }, items: [{ object: i ? 'ink' : 'dot', at: { px: [i, 0] } }] }));
    const sources = src({ dot: sprite(['g']), ink: sprite(['i'], { i: 'ink' }) }, { s: scene(items, { viewBox: [0, 0, 2, 1] }) });
    const card = [1, 2, 3];
    const { image } = renderPreview(sources, { scene: 's' }, { card, grid: [4, 5, 6] });
    assert.deepEqual(decodePng(encodePng(image, 1)).pixels, [[0x8f, 0xa5, 0x6e, 255], [...card, 255]]);
    assert.equal(composite(renderScene(sources, 's').root).size, 2, 'composite draws every variant by default');
  });

  it('R29: a scene preview is its viewBox, at frame 0', () => {
    const fall = { kind: 'sprite', keys: { w: 'cream' }, layers: [{ loop: 'wf', prefix: 'w', frames: [['w.'], ['.w']] }] };
    const sources = src({ fall }, { s: scene([{ object: 'fall', at: { px: [0, 0] } }], { viewBox: [0, 0, 3, 1] }) });
    const card = [1, 2, 3];
    const { image } = renderPreview(sources, { scene: 's' }, { card, grid: [4, 5, 6] });
    assert.deepEqual(decodePng(encodePng(image, 1)).pixels, [[0xf4, 0xed, 0xe0, 255], [...card, 255], [...card, 255]]);
  });
});
