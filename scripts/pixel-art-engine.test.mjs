// Tests for the pixel-art engine (pixel-art engine spec D8): parsing and
// validation with exact messages, sprites, scenes, the serializer, the
// palette and the PNG previews. Small inline fixtures, Node built-ins only.
// Test names start with the requirement they cover (R34).

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { inflateSync } from 'node:zlib';

import { composite, describeObject, loadSources, paintedSize, renderObject, renderScene, resolve, usedKeys, validate } from '../src/lib/pixel-art/engine.mjs';
import { blockFaces, pxToTile, tilePixels, tileToPx } from '../src/lib/pixel-art/iso.mjs';
import { addFrame, addLayer, colorAt, deleteFrame, deleteLayer, duplicateFrame, duplicateLayer, floodFill, move, paint, resize } from '../src/lib/pixel-art/edit.mjs';
import { serialize } from '../src/lib/pixel-art/serialize.mjs';
import { starterBlock, starterExtends, starterScene, starterSprite } from '../src/lib/pixel-art/starter.mjs';
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
    assert.deepEqual(problems, ["objects/tree.mjs: unknown property 'colour'", "objects/tree.mjs: kind must be 'sprite' or 'block', got 'blob'"]);
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

  it('R27: rejects a 24×33 character, and an outfit that makes one', () => {
    const body = (h, w = 24) => Array.from({ length: h }, () => 'g'.repeat(w));
    assert.deepEqual(validate(src({ character: sprite(body(32)) })), []);
    assert.deepEqual(validate(src({ character: sprite(body(33)) })), ['objects/character.mjs: the figure is 24×33; a character is at most 24×32']);
    assert.deepEqual(validate(src({ character: sprite(body(32, 25)) })), ['objects/character.mjs: the figure is 25×32; a character is at most 24×32']);
    const legacyBase = { character: sprite(body(33), undefined, { legacy: true }), hat: { kind: 'sprite', extends: 'character' } };
    assert.deepEqual(validate(src(legacyBase)), ['objects/hat.mjs: the figure is 24×33; a character is at most 24×32']);
  });

  it('R27: a character\'s cap is on the figure it paints, not its canvas', () => {
    const canvas = (figureWidth) => Array.from({ length: 38 }, (_, y) => (y < 32 ? `${'.'.repeat(10)}${'g'.repeat(figureWidth)}`.padEnd(40, '.') : '.'.repeat(40)));
    const base = { character: sprite(canvas(24), undefined, { legacy: true }) };
    assert.deepEqual(validate(src({ ...base, coat: { kind: 'sprite', extends: 'character' } })), []);
    const prop = { kind: 'sprite', extends: 'character', rows: { 0: { 37: 'g'.padEnd(40, '.') } } };
    assert.deepEqual(validate(src({ ...base, coat: prop })), ['objects/coat.mjs: the figure is 34×38; a character is at most 24×32']);
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

  it('R16: pxToTile finds the tile under every pixel, at any level and origin', () => {
    for (const origin of [[0, 0], [5, 32], [-17, 3]]) {
      for (const level of [0, 1, -2]) {
        for (let col = -3; col <= 3; col++) {
          for (let row = -3; row <= 3; row++) {
            const [cx, cy] = tileToPx([col, row, level], origin);
            for (const p of tilePixels(cx, cy)) {
              const [x, y] = p.split(',').map(Number);
              assert.deepEqual(pxToTile([x, y], level, origin), [col, row, level], `pixel ${p}, origin ${origin}, level ${level}`);
            }
          }
        }
      }
    }
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

describe('blocks (R28, D3, D4)', () => {
  // Faces from `blockFaces`, drawn as text: T, L and R for the top, left and
  // right faces, and the same letter in lowercase where the edge covers it.
  // Each picture starts at `origin`, relative to the first tile's top-face
  // center. Checked by eye against the 2:1 grid, then frozen here.
  const PICTURES = {
  '1,1,0': {
    origin: [-15, -8],
    rows: [
      '..............tt..............',
      '............ttTTtt............',
      '..........ttTTTTTTtt..........',
      '........ttTTTTTTTTTTtt........',
      '......ttTTTTTTTTTTTTTTtt......',
      '....ttTTTTTTTTTTTTTTTTTTtt....',
      '..ttTTTTTTTTTTTTTTTTTTTTTTtt..',
      'ttTTTTTTTTTTTTTTTTTTTTTTTTTTtt',
      'ttTTTTTTTTTTTTTTTTTTTTTTTTTTtt',
      '..ttTTTTTTTTTTTTTTTTTTTTTTtt..',
      '....ttTTTTTTTTTTTTTTTTTTtt....',
      '......ttTTTTTTTTTTTTTTtt......',
      '........ttTTTTTTTTTTtt........',
      '..........ttTTTTTTtt..........',
      '............ttTTtt............',
      '..............tt..............',
    ],
  },
  '1,1,1': {
    origin: [-15, -8],
    rows: [
      '..............tt..............',
      '............ttTTtt............',
      '..........ttTTTTTTtt..........',
      '........ttTTTTTTTTTTtt........',
      '......ttTTTTTTTTTTTTTTtt......',
      '....ttTTTTTTTTTTTTTTTTTTtt....',
      '..ttTTTTTTTTTTTTTTTTTTTTTTtt..',
      'ttTTTTTTTTTTTTTTTTTTTTTTTTTTtt',
      'tTTTTTTTTTTTTTTTTTTTTTTTTTTTTt',
      'lLTTTTTTTTTTTTTTTTTTTTTTTTTTRr',
      'lLLLTTTTTTTTTTTTTTTTTTTTTTRRRr',
      'lLLLLLTTTTTTTTTTTTTTTTTTRRRRRr',
      'lLLLLLLLTTTTTTTTTTTTTTRRRRRRRr',
      'lLLLLLLLLLTTTTTTTTTTRRRRRRRRRr',
      'lLLLLLLLLLLLTTTTTTRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLTTRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'llLLLLLLLLLLLLLRRRRRRRRRRRRRrr',
      '..llLLLLLLLLLLLRRRRRRRRRRRrr..',
      '....llLLLLLLLLLRRRRRRRRRrr....',
      '......llLLLLLLLRRRRRRRrr......',
      '........llLLLLLRRRRRrr........',
      '..........llLLLRRRrr..........',
      '............llLRrr............',
      '..............lr..............',
    ],
  },
  '2,1,2': {
    origin: [-15, -8],
    rows: [
      '..............tt..............................',
      '............ttTTtt............................',
      '..........ttTTTTTTtt..........................',
      '........ttTTTTTTTTTTtt........................',
      '......ttTTTTTTTTTTTTTTtt......................',
      '....ttTTTTTTTTTTTTTTTTTTtt....................',
      '..ttTTTTTTTTTTTTTTTTTTTTTTtt..................',
      'ttTTTTTTTTTTTTTTTTTTTTTTTTTTtt................',
      'tTTTTTTTTTTTTTTTTTTTTTTTTTTTTTtt..............',
      'lLTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTtt............',
      'lLLLTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTtt..........',
      'lLLLLLTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTtt........',
      'lLLLLLLLTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTtt......',
      'lLLLLLLLLLTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTtt....',
      'lLLLLLLLLLLLTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTtt..',
      'lLLLLLLLLLLLLLTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTtt',
      'lLLLLLLLLLLLLLLLTTTTTTTTTTTTTTTTTTTTTTTTTTTTTt',
      'lLLLLLLLLLLLLLLLLLTTTTTTTTTTTTTTTTTTTTTTTTTTRr',
      'lLLLLLLLLLLLLLLLLLLLTTTTTTTTTTTTTTTTTTTTTTRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLTTTTTTTTTTTTTTTTTTRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLTTTTTTTTTTTTTTRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLTTTTTTTTTTRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLTTTTTTRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLTTRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'lLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      'llLLLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      '..llLLLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      '....llLLLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      '......llLLLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      '........llLLLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      '..........llLLLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      '............llLLLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      '..............llLLLLLLLLLLLLLLLRRRRRRRRRRRRRRr',
      '................llLLLLLLLLLLLLLRRRRRRRRRRRRRrr',
      '..................llLLLLLLLLLLLRRRRRRRRRRRrr..',
      '....................llLLLLLLLLLRRRRRRRRRrr....',
      '......................llLLLLLLLRRRRRRRrr......',
      '........................llLLLLLRRRRRrr........',
      '..........................llLLLRRRrr..........',
      '............................llLRrr............',
      '..............................lr..............',
    ],
  },

  };
  const picture = (size) => {
    const faces = blockFaces(size, [0, 0]);
    const at = new Map();
    for (const [face, letter] of [['top', 'T'], ['left', 'L'], ['right', 'R']]) for (const p of faces[face]) at.set(p, letter);
    for (const p of faces.edge) at.set(p, at.get(p).toLowerCase());
    const [x0, y0] = PICTURES[size.join(',')].origin;
    const rows = PICTURES[size.join(',')].rows;
    return { origin: [x0, y0], rows: rows.map((row, r) => [...row].map((_, c) => at.get(`${x0 + c},${y0 + r}`) ?? '.').join('')), count: at.size };
  };
  const BLOCK = { kind: 'block', size: [1, 1, 1], faces: { top: 'grass-2', left: 'wood-3', right: 'grass-4', edge: 'ink' } };
  const FLAT = { kind: 'block', size: [1, 1, 0], faces: { top: 'grass-2' } };
  const pixelsOf = (sources, name) => composite(renderObject(sources, name));

  it('R28: pixel-exact faces for [1,1,0], [1,1,1] and [2,1,2]', () => {
    for (const size of ['1,1,0', '1,1,1', '2,1,2']) {
      const { rows } = PICTURES[size];
      const got = picture(size.split(',').map(Number));
      assert.deepEqual(got.rows, rows, `size ${size}`);
      // Nothing was drawn outside the picture.
      assert.equal(got.count, rows.join('').replaceAll('.', '').length, `size ${size}: no pixel outside the picture`);
    }
  });

  it('D4: a tile is 16 rows, 2 pixels wider on each side per row, and its top face is a diamond', () => {
    const widths = [];
    for (let y = -8; y < 8; y++) widths.push(tilePixels(0, 0).filter((p) => Number(p.split(',')[1]) === y).length);
    assert.deepEqual(widths, [2, 6, 10, 14, 18, 22, 26, 30, 30, 26, 22, 18, 14, 10, 6, 2]);
  });

  it('R28: the top is the light shade, the left face the mid shade and the right face the shadow shade', () => {
    const sources = src({ block: BLOCK });
    const faces = blockFaces([1, 1, 1], [0, 0]);
    const drawn = pixelsOf(sources, 'block');
    for (const p of faces.top) if (!faces.edge.includes(p)) assert.equal(drawn.get(p), 'grass-2', `top ${p}`);
    for (const p of faces.left) if (!faces.edge.includes(p)) assert.equal(drawn.get(p), 'wood-3', `left ${p}`);
    for (const p of faces.right) if (!faces.edge.includes(p)) assert.equal(drawn.get(p), 'grass-4', `right ${p}`);
    for (const p of faces.edge) assert.equal(drawn.get(p), 'ink', `edge ${p}`);
    assert.equal(drawn.size, faces.top.length + faces.left.length + faces.right.length);
  });

  it('D4: the edge is one pixel wide and every step across the top steps 2 across for 1 down', () => {
    const { edge, top } = blockFaces([1, 1, 0], [0, 0]);
    const outline = new Set(edge);
    // Each row of the diamond's outline holds its leftmost and rightmost pixel pair, and they move 2 per row.
    const lefts = [];
    for (let y = -8; y < 0; y++) lefts.push(Math.min(...top.filter((p) => p.endsWith(`,${y}`)).map((p) => Number(p.split(',')[0]))));
    assert.deepEqual(lefts.map((x, i) => (i ? x - lefts[i - 1] : 0)).slice(1), Array(7).fill(-2));
    for (const p of top) {
      const [x, y] = p.split(',').map(Number);
      const exposed = [`${x - 1},${y}`, `${x + 1},${y}`, `${x},${y - 1}`, `${x},${y + 1}`].some((n) => !top.includes(n));
      assert.equal(outline.has(p), exposed, `edge at ${p}`);
    }
  });

  it('D8: two adjacent blocks share an edge, with no gap and no overlap', () => {
    const a = new Set(blockFaces([1, 1, 0], [0, 0]).top);
    const b = new Set(blockFaces([1, 1, 0], [16, 8]).top);
    assert.deepEqual([...a].filter((p) => b.has(p)), []);
    assert.deepEqual([...new Set([...a, ...b])].sort(), blockFaces([2, 1, 0], [0, 0]).top.sort());
    const c = new Set(blockFaces([1, 1, 0], [-16, 8]).top);
    const d = new Set(blockFaces([1, 1, 0], [0, 16]).top);
    const four = [...a, ...b, ...c, ...d];
    assert.equal(new Set(four).size, four.length, 'four tiles around a corner share no pixel');
    assert.deepEqual([...four].sort(), blockFaces([2, 2, 0], [0, 0]).top.sort(), 'and together they are the 2×2 block\'s top');
  });

  it('D8, L4: a seeded random grid, cut into blocks of random sizes, tiles with no gaps or overlaps', () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const cols = 1 + Math.floor(r() * 7);
      const rows = 1 + Math.floor(r() * 7);
      /** Cuts a cols×rows rectangle at [c, d] into blocks, guillotine style. */
      const cut = (c, d, w, h) => {
        if (w > 1 && r() < 0.5) {
          const k = 1 + Math.floor(r() * (w - 1));
          return [...cut(c, d, k, h), ...cut(c + k, d, w - k, h)];
        }
        if (h > 1 && r() < 0.5) {
          const k = 1 + Math.floor(r() * (h - 1));
          return [...cut(c, d, w, k), ...cut(c, d + k, w, h - k)];
        }
        return [[c, d, w, h]];
      };
      const blocks = cut(0, 0, cols, rows);
      const painted = new Map();
      for (const [c, d, w, h] of blocks) {
        for (const p of blockFaces([w, h, 0], [(c - d) * 16, (c + d) * 8]).top) painted.set(p, (painted.get(p) ?? 0) + 1);
      }
      assert.deepEqual([...painted.values()].filter((n) => n !== 1), [], `seed ${seed}: no pixel is painted twice`);
      const whole = new Set();
      for (let c = 0; c < cols; c++) for (let d = 0; d < rows; d++) for (const p of tilePixels((c - d) * 16, (c + d) * 8)) whole.add(p);
      assert.equal(painted.size, whole.size, `seed ${seed}: no gaps (${blocks.length} blocks in ${cols}×${rows})`);
      assert.ok([...painted.keys()].every((p) => whole.has(p)), `seed ${seed}: nothing outside the grid`);
      assert.equal(painted.size, cols * rows * 256, `seed ${seed}: every tile is 256 pixels`);
    }
  });

  it('R3: a block is placed by its first tile\'s top-face center, by tile or by pixel', () => {
    const sources = src({ block: BLOCK }, { s: scene([{ object: 'block', at: { tile: [2, 1, 1] } }, { object: 'block', at: { px: [5, -3] } }], { origin: [10, 20] }) });
    const placed = composite(renderScene(sources, 's').root);
    const [tx, ty] = tileToPx([2, 1, 1], [10, 20]);
    const expected = new Set([...blockFaces([1, 1, 1], [tx, ty]).top, ...blockFaces([1, 1, 1], [5, -3]).top]);
    for (const p of expected) assert.ok(placed.has(p), `${p} is drawn`);
  });

  it('R5: a surface is clipped to the top face and compiles to "<loop> <prefix>N" groups, frame 0 first', () => {
    const map = (ch) => Array.from({ length: 16 }, () => ch.repeat(32));
    const water = { kind: 'block', size: [1, 1, 0], faces: { top: 'grass-2' }, surface: { keys: { a: 'cream', b: 'ink' }, loop: 'wf', prefix: 'w', frames: [map('a'), map('b')] } };
    const sources = src({ water }, { s: scene([{ object: 'water', at: { px: [0, 0] } }]) });
    const { root } = renderScene(sources, 's');
    assert.deepEqual(root.children.map((c) => c.attrs?.[0]?.[1] ?? 'layer'), ['layer', 'wf w0', 'wf w1']);
    const top = new Set(blockFaces([1, 1, 0], [0, 0]).top);
    assert.deepEqual([...root.children[1].children[0].pixels.keys()].filter((p) => !top.has(p)), [], 'frame 0 stays on the top face');
    assert.equal(root.children[1].children[0].pixels.size, top.size, 'frame 0 covers the whole top face');
    const flat = composite(root);
    assert.equal(flat.get('0,0'), 'cream', 'only frame 0 shows when flattened');
    assert.ok(root.children[1].frame === 0 && root.children[2].frame === 1);
  });

  it('R5: a surface repeats on every tile of a larger block, and a static one is a plain layer', () => {
    const map = Array.from({ length: 16 }, () => 'a'.repeat(32));
    const slab = { kind: 'block', size: [2, 1, 0], faces: { top: 'grass-2' }, surface: { keys: { a: 'cream' }, map } };
    const flat = pixelsOf(src({ slab }), 'slab');
    const top = blockFaces([2, 1, 0], [0, 0]).top;
    assert.equal(flat.size, top.length);
    assert.ok(top.every((p) => flat.get(p) === 'cream'));
  });

  it('R5: each tile\'s surface is clipped to that tile\'s own diamond, not the whole top', () => {
    // A map that paints only its bottom-right corner, which is outside its own tile's diamond.
    const map = Array.from({ length: 16 }, (_, y) => (y >= 14 ? `${'.'.repeat(30)}aa` : '.'.repeat(32)));
    const slab = { kind: 'block', size: [2, 1, 0], faces: { top: 'grass-2' }, surface: { keys: { a: 'cream' }, map } };
    const drawn = pixelsOf(src({ slab }), 'slab');
    assert.deepEqual([...drawn.keys()].filter((p) => drawn.get(p) === 'cream'), [], 'nothing outside a tile\'s own diamond is painted, even if the next tile covers it');
    // A map that paints a pixel inside its own diamond lands once per tile.
    const dot = Array.from({ length: 16 }, (_, y) => (y === 8 ? `${'.'.repeat(16)}a${'.'.repeat(15)}` : '.'.repeat(32)));
    const dotted = pixelsOf(src({ slab: { ...slab, surface: { keys: { a: 'cream' }, map: dot } } }), 'slab');
    assert.deepEqual([...dotted.keys()].filter((p) => dotted.get(p) === 'cream').sort(), ['0,0', '16,8']);
  });

  it('R5: the edge is drawn last, over the surface', () => {
    const map = Array.from({ length: 16 }, () => 'a'.repeat(32));
    const slab = { kind: 'block', size: [1, 1, 0], faces: { top: 'grass-2', edge: 'ink' }, surface: { keys: { a: 'cream' }, loop: 'wf', prefix: 'w', frames: [map] } };
    const sources = src({ slab }, { s: scene([{ object: 'slab', at: { px: [0, 0] } }]) });
    const { root } = renderScene(sources, 's');
    assert.deepEqual(root.children.map((c) => c.attrs?.[0]?.[1] ?? 'layer'), ['layer', 'wf w0', 'layer']);
    assert.equal(composite(root).get(blockFaces([1, 1, 0], [0, 0]).edge[0]), 'ink');
  });

  it('R3: a flat block has a top and nothing below it', () => {
    const sources = src({ tile: FLAT });
    const faces = blockFaces([1, 1, 0], [0, 0]);
    assert.deepEqual([faces.left, faces.right], [[], []]);
    assert.equal(pixelsOf(sources, 'tile').size, faces.top.length);
  });

  it('R30: a block with a bad size, missing faces, or unknown properties', () => {
    const bad = (obj) => validate(src({ blk: obj }));
    assert.deepEqual(bad({ ...BLOCK, size: [1, 1] }), ['objects/blk.mjs: size must be three whole numbers: tiles wide, tiles deep (both at least 1) and levels high (0 is a flat tile)']);
    assert.deepEqual(bad({ ...BLOCK, size: [0, 1, 1] }), ['objects/blk.mjs: size must be three whole numbers: tiles wide, tiles deep (both at least 1) and levels high (0 is a flat tile)']);
    assert.deepEqual(bad({ ...BLOCK, faces: { top: 'grass-2' } }), [
      'objects/blk.mjs: faces.left is missing; a block with levels needs a left and a right face',
      'objects/blk.mjs: faces.right is missing; a block with levels needs a left and a right face',
    ]);
    assert.deepEqual(bad({ ...FLAT, faces: { top: 'grass-2', left: 'ink' } }), ['objects/blk.mjs: faces.left: a flat block (0 levels) has no left face']);
    assert.deepEqual(bad({ ...FLAT, faces: { left: 'ink' } }), ['objects/blk.mjs: faces.top is missing', 'objects/blk.mjs: faces.left: a flat block (0 levels) has no left face']);
    assert.deepEqual(bad({ ...FLAT, faces: { top: 'grass-9' } }), ["objects/blk.mjs: faces.top: 'grass-9' is not in the palette"]);
    assert.deepEqual(bad({ ...FLAT, faces: { top: 'grass-2', side: 'ink' } }), ["objects/blk.mjs: faces: unknown face 'side'; use top, left, right or edge"]);
    assert.deepEqual(bad({ ...FLAT, keys: {} }), ["objects/blk.mjs: unknown property 'keys'"]);
  });

  it('R30: a surface with a ragged map, an unknown key or a bad frame', () => {
    const rows = (n, w, ch = 'a') => Array.from({ length: n }, () => ch.repeat(w));
    const blk = (surface) => validate(src({ blk: { ...FLAT, surface } }));
    assert.deepEqual(blk({ keys: { a: 'cream' }, map: rows(16, 32) }), []);
    assert.deepEqual(blk({ keys: { a: 'cream' }, map: rows(15, 32) }), ['objects/blk.mjs: surface: 15 rows, expected 16, one tile']);
    assert.deepEqual(blk({ keys: { a: 'cream' }, map: [...rows(15, 32), 'a'.repeat(31)] }), ['objects/blk.mjs: surface, row 15: 31 wide, expected 32, one tile']);
    assert.deepEqual(blk({ keys: { a: 'cream' }, map: [...rows(15, 32), `${'a'.repeat(31)}q`] }), ["objects/blk.mjs: surface, row 15, column 31: key 'q' is not in keys"]);
    assert.deepEqual(blk({ keys: { a: 'nope' }, map: rows(16, 32) }), ["objects/blk.mjs: surface, key 'a': 'nope' is not in the palette"]);
    assert.deepEqual(blk({ keys: { a: 'cream' }, loop: 'wf', prefix: 'w', frames: [rows(16, 32), rows(2, 32)] }), ['objects/blk.mjs: surface, frame 1: 2 rows, expected 16, one tile']);
    assert.deepEqual(blk({ keys: { a: 'cream' }, loop: 'wf', frames: [rows(16, 32)] }), ['objects/blk.mjs: surface: prefix must be one lowercase class name']);
    assert.deepEqual(blk({ map: rows(16, 32), keys: { a: 'cream' }, extra: 1 }), ["objects/blk.mjs: surface: unknown property 'extra'"]);
  });

  it('R26, R27: a block may use world colors only, at most 12 colors and 64×64 pixels', () => {
    const blk = (obj) => validate(src({ blk: obj }));
    assert.deepEqual(blk({ ...BLOCK, faces: { ...BLOCK.faces, top: 'c-6f8a55' } }), ["objects/blk.mjs: faces.top: 'c-6f8a55' is a legacy color; only imported art may use it"]);
    assert.deepEqual(blk({ ...BLOCK, faces: { ...BLOCK.faces, top: 'teal-1' } }), ["objects/blk.mjs: faces.top: 'teal-1' is an outfit color; only objects that extend character may use it"]);
    assert.deepEqual(blk({ ...FLAT, size: [2, 2, 0] }), []);
    assert.deepEqual(blk({ ...FLAT, size: [3, 3, 0] }), ['objects/blk.mjs: 94×48, max 64×64']);
    assert.deepEqual(blk({ ...BLOCK, size: [1, 1, 3] }), []);
    assert.deepEqual(blk({ ...BLOCK, size: [1, 1, 4] }), ['objects/blk.mjs: 30×80, max 64×64']);
    const wide = { ...PALETTE, world: { ...PALETTE.world, ...Object.fromEntries([...Array(10).keys()].map((i) => [`w-${i}`, `#0000${String(i).padStart(2, '0')}`])) } };
    const row = (ch) => ch.repeat(32);
    const surface = { keys: Object.fromEntries([...Array(10).keys()].map((i) => [String(i), `w-${i}`])), map: [...'0123456789'].map(row).concat(Array(6).fill(row('0'))) };
    assert.deepEqual(validate(src({ blk: { ...BLOCK, surface } }, {}, wide)), ['objects/blk.mjs: uses 14 colors, max 12']);
  });

  it('R27, L4: a block\'s size is checked before anything is drawn, so a typo is an error, not a crash', () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const size = [1 + Math.floor(r() * 5000), 1 + Math.floor(r() * 5000), Math.floor(r() * 500)];
      const w = (size[0] + size[1]) * 16 - 2;
      const h = (size[0] + size[1]) * 8 + size[2] * 16;
      const started = Date.now();
      assert.deepEqual(validate(src({ blk: { ...BLOCK, size } })), [`objects/blk.mjs: ${w}×${h}, max 64×64`], `seed ${seed}`);
      assert.ok(Date.now() - started < 1000, `seed ${seed}: reported at once`);
    }
  });

  it('R27, L4: a block\'s computed size is its drawn size', () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      for (let i = 0; i < 6; i++) {
        const size = [1 + Math.floor(r() * 3), 1 + Math.floor(r() * 3), Math.floor(r() * 3)];
        const sources = src({ blk: { ...BLOCK, size } });
        const { width, height } = resolve(sources, 'blk');
        const faces = blockFaces(size, [0, 0]);
        const xs = [...faces.top, ...faces.left, ...faces.right].map((p) => p.split(',').map(Number));
        assert.deepEqual([width, height], [Math.max(...xs.map((p) => p[0])) - Math.min(...xs.map((p) => p[0])) + 1, Math.max(...xs.map((p) => p[1])) - Math.min(...xs.map((p) => p[1])) + 1], `size ${size}`);
      }
    }
  });

  it('R30: a sprite cannot extend a block', () => {
    assert.deepEqual(validate(src({ blk: BLOCK, sp: { kind: 'sprite', extends: 'blk' } })), ["objects/sp.mjs: extends 'blk', which is a block; only a sprite can be extended"]);
  });

  it('R9: a block serializes to its canonical text, with and without a surface', () => {
    const rows = Array.from({ length: 16 }, (_, i) => '.'.repeat(i) + 'a' + '.'.repeat(31 - i));
    const text = serialize({ kind: 'block', size: [1, 1, 0], faces: { top: 'water-2' }, surface: { keys: { a: 'water-1' }, loop: 'wf', prefix: 'w', frames: [rows] } });
    const lines = text.split('\n');
    assert.equal(lines[0], '// Pixel-art object. How to edit it: .claude/skills/pixel-art/SKILL.md');
    assert.deepEqual(lines.slice(1, 16), [
      'export default {',
      "  kind: 'block',",
      '  size: [1, 1, 0],',
      '  faces: {',
      "    top: 'water-2',",
      '  },',
      '  surface: {',
      '    keys: {',
      "      a: 'water-1',",
      '    },',
      "    loop: 'wf',",
      "    prefix: 'w',",
      '    frames: [',
      '      [',
      `        '${rows[0]}',`,
    ]);
    assert.equal(lines.slice(-5).join('\n'), "      ],\n    ],\n  },\n};\n");
    const plain = serialize({ kind: 'block', size: [1, 1, 1], faces: { top: 'a', left: 'b', right: 'c', edge: 'd' } });
    assert.equal(plain, "// Pixel-art object. How to edit it: .claude/skills/pixel-art/SKILL.md\nexport default {\n  kind: 'block',\n  size: [1, 1, 1],\n  faces: {\n    top: 'a',\n    left: 'b',\n    right: 'c',\n    edge: 'd',\n  },\n};\n");
    const still = serialize({ kind: 'block', size: [1, 1, 0], faces: { top: 'a' }, surface: { keys: { a: 'b' }, map: ['a'] } });
    assert.ok(still.includes("  surface: {\n    keys: {\n      a: 'b',\n    },\n    map: [\n      'a',\n    ],\n  },\n"));
  });

  it('R9, L4: a random block survives save and reload byte for byte', async () => {
    for (const seed of SEEDS) {
      const r = rng(seed);
      const obj = { kind: 'block', size: [1 + Math.floor(r() * 3), 1 + Math.floor(r() * 3), Math.floor(r() * 3)], faces: { top: 'grass-2' } };
      if (obj.size[2] > 0) Object.assign(obj.faces, { left: 'wood-3', right: 'grass-4' });
      if (r() < 0.5) obj.faces.edge = 'ink';
      const text = serialize(obj);
      assert.equal(serialize(await load(text)), text, `seed ${seed}`);
    }
  });

  it('R27: --check names a block\'s kind, size and colors', () => {
    const sources = src({ block: BLOCK });
    assert.equal(describeObject(sources, resolve(sources, 'block')), 'block 1×1×1 · 30×32 · 4 colors (of 12) · 1 frame');
  });
});

describe('library (R13, R31)', () => {
  const dir = new URL('../src/assets/pixel-art/source/', import.meta.url);
  const committed = async () => {
    const read = async (sub) => {
      const out = {};
      for (const file of (await readdir(new URL(`${sub}/`, dir))).filter((f) => f.endsWith('.mjs'))) {
        out[file.slice(0, -4)] = (await import(new URL(`${sub}/${file}`, dir).href)).default;
      }
      return out;
    };
    return loadSources({ palette: (await import(new URL('palette.mjs', dir).href)).default, objects: await read('objects'), scenes: await read('scenes') });
  };

  it('R13: the library has a block, a flat tile, a water block with a frame loop and a tree, in world colors only', async () => {
    const sources = await committed();
    assert.deepEqual(validate(sources), []);
    for (const name of ['block', 'tile', 'water', 'tree']) {
      const resolved = resolve(sources, name);
      assert.equal(resolved.legacy, false, `${name} is not legacy`);
      for (const color of [...Object.values(resolved.block?.faces ?? {}), ...usedKeys(resolved).map((k) => resolved.keys[k])]) {
        assert.equal(sources.colors.get(color).tier, 'world', `${name} uses ${color}`);
      }
    }
    assert.equal(sources.objects.get('block').size.join(), '1,1,1');
    assert.equal(sources.objects.get('tile').size.join(), '1,1,0');
    assert.equal(sources.objects.get('tree').kind, 'sprite');
    const water = sources.objects.get('water');
    assert.equal(`${water.surface.loop} ${water.surface.prefix}`, 'wf w');
    assert.equal(water.surface.frames.length, 5);
    const [w, h] = (({ width, height }) => [width, height])(resolve(sources, 'tree'));
    assert.ok(w <= 64 && h <= 64, 'the tree fits 64×64');
  });

  it('R28: every library block is lit top light, left mid, right shadow', async () => {
    const sources = await committed();
    const lum = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    let checked = 0;
    for (const [name, obj] of sources.objects) {
      if (obj.kind !== 'block' || !obj.faces.left) continue;
      const [t, l, r] = ['top', 'left', 'right'].map((f) => lum(sources.colors.get(obj.faces[f]).hex));
      assert.ok(t > l && l > r, `${name}: top ${t.toFixed(3)} > left ${l.toFixed(3)} > right ${r.toFixed(3)}`);
      checked++;
    }
    assert.ok(checked >= 1, 'at least one block with sides is checked');
  });

  it('R13: library-demo is a 3×3 island that places every library object', async () => {
    const sources = await committed();
    const demo = sources.scenes.get('library-demo');
    assert.equal(demo.output, undefined, 'a preview-only scene');
    const items = demo.items.filter((i) => i.object);
    assert.deepEqual([...new Set(items.map((i) => i.object))].sort(), ['block', 'bridge', 'path', 'pebble', 'tile', 'tree', 'water']);
    assert.ok(items.every((i) => i.at.tile.slice(0, 2).every((n) => n >= 0 && n <= 2)), 'every item sits within a 3×3 grid');
  });
});

describe('security and governance outfit (R14, Q6)', () => {
  const dir = new URL('../src/assets/pixel-art/source/', import.meta.url);
  const committed = async () => {
    const read = async (sub) => {
      const out = {};
      for (const file of (await readdir(new URL(`${sub}/`, dir))).filter((f) => f.endsWith('.mjs'))) {
        out[file.slice(0, -4)] = (await import(new URL(`${sub}/${file}`, dir).href)).default;
      }
      return out;
    };
    return loadSources({ palette: (await import(new URL('palette.mjs', dir).href)).default, objects: await read('objects'), scenes: await read('scenes') });
  };
  const NAME = 'outfit-security-governance';

  it('R14: the outfit validates, extends character and is not legacy', async () => {
    const sources = await committed();
    assert.deepEqual(validate(sources), []);
    const outfit = sources.objects.get(NAME);
    assert.equal(outfit.extends, 'character');
    assert.equal(resolve(sources, NAME).legacy, false);
  });

  it('R27: the figure stays within 24×32', async () => {
    const sources = await committed();
    const [w, h] = paintedSize(resolve(sources, NAME));
    assert.ok(w <= 24 && h <= 32, `the figure is ${w}×${h}`);
  });

  it('Q6: it uses world colors plus at most 4 outfit colors, and no legacy ones', async () => {
    const sources = await committed();
    const resolved = resolve(sources, NAME);
    const tiers = [...new Set(usedKeys(resolved).map((k) => resolved.keys[k]))].map((c) => sources.colors.get(c).tier);
    assert.ok(!tiers.includes('legacy'), 'no legacy colors');
    assert.ok(tiers.filter((t) => t === 'outfit').length <= 4, 'at most 4 outfit colors');
    const { outfit } = (await import('../src/assets/pixel-art/source/palette.mjs')).default;
    assert.ok(Object.keys(outfit).length <= 16, 'the outfit tier has at most 16 colors');
  });

  it('R14: it is in range-sprite (Range class characters R1), and outfit-preview shows every outfit', async () => {
    const sources = await committed();
    const placed = (name) => JSON.stringify(sources.scenes.get(name).items);
    assert.ok(placed('range-sprite').includes(NAME), 'in the carousel');
    assert.equal(sources.scenes.get('range-sprite').output, 'range-sprite.svg');
    const preview = sources.scenes.get('outfit-preview');
    assert.equal(preview.output, undefined, 'a preview-only scene');
    const outfits = preview.items.filter((i) => i.object?.startsWith('outfit-')).map((i) => i.object).sort();
    assert.deepEqual(outfits, [...sources.objects.keys()].filter((n) => n.startsWith('outfit-')).sort());
    assert.equal(outfits.length, 7);
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

  it('R31: the world tier is seven complete 4-shade ramps, from highlight to shadow, plus ink, cream and two skin tones', async () => {
    const { world } = await palette();
    const luminance = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const materials = ['grass', 'soil', 'wood', 'path', 'water', 'roof', 'gold'];
    const ramps = materials.flatMap((m) => [1, 2, 3, 4].map((n) => `${m}-${n}`));
    assert.deepEqual(Object.keys(world), [...ramps, 'ink', 'cream', 'skin-1', 'skin-2'], 'in ramp order, then the singles');
    assert.equal(Object.keys(world).length, 32);
    for (const m of materials) {
      const shades = [1, 2, 3, 4].map((n) => luminance(world[`${m}-${n}`]));
      assert.ok(shades.every((l, i) => i === 0 || l < shades[i - 1]), `${m}: shade 1 is the lightest and 4 the darkest`);
    }
    assert.equal(new Set(Object.values(world)).size, 32, 'no two world colors share a value');
  });

  it('R31: the world ramps come from the island: each is mostly exact legacy values', async () => {
    const { world, legacy } = await palette();
    const legacyValues = new Set(Object.values(legacy));
    const exact = Object.values(world).filter((hex) => legacyValues.has(hex)).length;
    assert.ok(exact >= 24, `${exact} of 32 world colors are legacy values`);
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

describe('editing objects (R17)', () => {
  const at = (layer = 0, frame = 0) => ({ layer, frame });
  const base = () =>
    sprite(['....', '.gg.', '.gg.', '....'], { g: 'grass-2' }, { layers: [{ map: ['....', '.gg.', '.gg.', '....'] }, { loop: 'wf', prefix: 'w', frames: [['....', '....', '....', '....'], ['g...', '....', '....', '....']] }] });

  it('R17: the pencil paints pixels, and a new color gets a key named after it', () => {
    const doc = base();
    const sources = src({ s: doc });
    assert.equal(paint(sources, 's', doc, at(), [[0, 0], [1, 1]], 'ink'), 2);
    assert.deepEqual(doc.keys, { g: 'grass-2', i: 'ink' });
    assert.deepEqual(doc.layers[0].map, ['i...', '.ig.', '.gg.', '....']);
    assert.equal(paint(sources, 's', doc, at(), [[0, 0], [9, 9]], 'ink'), 0, 'no change, and outside the map is ignored');
    assert.deepEqual(validate(sources), []);
  });

  it('R17: a key already taken falls back to the uppercase, then the fixed order', () => {
    const doc = sprite(['..'], { g: 'grass-2', G: 'grass-4' });
    const sources = src({ s: doc });
    paint(sources, 's', doc, at(), [[0, 0]], 'grass-1');
    assert.deepEqual(Object.keys(doc.keys), ['g', 'G', 'a']);
  });

  it('R17: the eraser clears pixels, on the frame being edited', () => {
    const doc = base();
    const sources = src({ s: doc });
    assert.equal(paint(sources, 's', doc, at(0), [[1, 1]], null), 1);
    assert.deepEqual(doc.layers[0].map, ['....', '..g.', '.gg.', '....']);
    paint(sources, 's', doc, at(1, 1), [[0, 0]], null);
    paint(sources, 's', doc, at(1, 0), [[3, 3]], 'grass-2');
    assert.deepEqual(doc.layers[1].frames, [['....', '....', '....', '...g'], ['....', '....', '....', '....']]);
  });

  it('R17: painting an object that extends another overrides whole rows, and drops a row that matches the base again', () => {
    const body = sprite(['....', '.gg.', '.gg.'], { g: 'grass-2' });
    const outfit = { kind: 'sprite', extends: 'body', keys: {}, rows: {} };
    const sources = src({ body, outfit });
    paint(sources, 'outfit', outfit, at(), [[0, 2], [3, 0]], 'ink');
    assert.deepEqual(outfit.rows, { 0: { 0: '...i', 2: 'igg.' } });
    assert.deepEqual(outfit.keys, { i: 'ink' });
    paint(sources, 'outfit', outfit, at(), [[0, 2]], null);
    assert.deepEqual(outfit.rows, { 0: { 0: '...i' } });
    paint(sources, 'outfit', outfit, at(), [[3, 0]], null);
    assert.deepEqual(outfit.rows, {});
    assert.equal(serialize(outfit), serialize({ kind: 'sprite', extends: 'body', keys: { i: 'ink' }, rows: {} }));
  });

  it('R17: an object that extends another can\'t paint a frame loop', () => {
    const body = base();
    const outfit = { kind: 'sprite', extends: 'body', rows: {} };
    const sources = src({ body, outfit });
    assert.throws(() => paint(sources, 'outfit', outfit, at(1), [[0, 0]], 'ink'), /frame loop/);
  });

  it('R17: fill takes 4-connected pixels of the same key only', () => {
    const map = ['gg.g', 'g..g', '.g.g'];
    assert.deepEqual(floodFill(map, 0, 0).map((p) => p.join(',')).sort(), ['0,0', '0,1', '1,0']);
    assert.deepEqual(floodFill(map, 1, 1).map((p) => p.join(',')).sort(), ['1,1', '2,0', '2,1', '2,2']);
    assert.deepEqual(floodFill(map, 9, 0), []);
  });

  it('R17: the picker reads the color under a pixel, on the frame shown', () => {
    const sources = src({ s: base() });
    const resolved = resolve(sources, 's');
    assert.equal(colorAt(resolved, at(0), 1, 1), 'grass-2');
    assert.equal(colorAt(resolved, at(0), 0, 0), null);
    assert.equal(colorAt(resolved, at(1, 1), 0, 0), 'grass-2');
    assert.equal(colorAt(resolved, at(1, 5), 0, 0), 'grass-2', 'past the last frame shows the last frame');
  });

  it('R17: resize pads and crops every map at the right and bottom', () => {
    const doc = base();
    resize(doc, 2, 5);
    assert.deepEqual(doc.layers[0].map, ['..', '.g', '.g', '..', '..']);
    assert.deepEqual(doc.layers[1].frames[1], ['g.', '..', '..', '..', '..']);
    assert.deepEqual(validate(src({ s: doc })), []);
  });

  it('R17: layers and frames can be added, duplicated, moved and deleted, but never to none', () => {
    const doc = base();
    assert.equal(addLayer(doc), 2);
    assert.deepEqual(doc.layers[2].map, ['....', '....', '....', '....']);
    assert.equal(duplicateLayer(doc, 0), 1);
    assert.deepEqual(doc.layers[1], doc.layers[0]);
    assert.equal(move(doc.layers, 1, 1), 2);
    assert.equal(move(doc.layers, 0, -1), 0, 'already first');
    assert.equal(deleteLayer(doc, 3), 2);
    assert.equal(doc.layers.length, 3);
    const one = sprite(['g']);
    assert.equal(deleteLayer(one, 0), 0);
    assert.equal(one.layers.length, 1);

    const loop = base();
    assert.equal(addFrame(loop, 1, 0), 1);
    assert.deepEqual(loop.layers[1].frames.map((f) => f[0]), ['....', '....', 'g...']);
    assert.equal(duplicateFrame(loop, 1, 2), 3);
    assert.deepEqual(loop.layers[1].frames[3], loop.layers[1].frames[2]);
    assert.equal(deleteFrame(loop, 1, 3), 2);
    assert.equal(loop.layers[1].frames.length, 3);
    assert.deepEqual(validate(src({ s: loop })), []);
  });

  it('R17: the editor\'s starters are the same documents as npm run art -- --new writes', () => {
    assert.deepEqual(starterSprite(4, 3), { kind: 'sprite', anchor: [2, 2], keys: { o: 'ink' }, layers: [{ map: ['....', '....', '....'] }] });
    assert.deepEqual(starterScene(), { viewBox: [-64, -64, 128, 128], origin: [0, 0], items: [] });
    const body = sprite(['gc'], { g: 'grass-2', c: 'c-6f8a55' }, { legacy: true });
    assert.deepEqual(starterExtends(src({ body }), 'body'), { kind: 'sprite', extends: 'body', keys: { c: 'grass-2' }, rows: {} });
    assert.deepEqual(starterBlock(), { kind: 'block', size: [1, 1, 1], faces: { top: 'grass-2', left: 'soil-2', right: 'soil-3' } });
  });
});
