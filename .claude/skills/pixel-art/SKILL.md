---
name: pixel-art
description: Make, change or review this site's pixel art (the hero island, the Range sprite and its outfits, library objects and scenes) as text sources compiled by `npm run art`. Use whenever someone asks to draw, edit, recolor or check pixel art, an outfit or character, a library object, or a scene, or to add art to the site. Works headless, with no editor and no browser.
---
# Pixel art

The site's pixel art is text. **Objects** (pixel maps) and **scenes** (objects placed in paint order) live in `src/assets/pixel-art/source/`, and `npm run art` compiles each scene with an `output` to an optimized SVG in `src/assets/pixel-art/`. The design is in `docs/intents/2026-10-pixel-art-engine/spec.md` (D2–D6, R26–R30).

**Never write or edit an output SVG by hand.** Output SVGs only ever come from the compiler. Change a source, then run `npm run art`.

## The design language (hard rules)

New art must fit the existing world. The engine enforces every rule here except the 6–8 color target.

- **Grid.** A tile is 32×16 pixels, 2:1 dimetric: every edge steps 2 pixels across for 1 down. One level is 16 pixels high, so a one-level block is 32×32 and reads as a cube. A tile at `[col, row, level]` has its top-face center at `x = (col − row) × 16 + ox`, `y = (col + row) × 8 − level × 16 + oy`, where `[ox, oy]` is the scene's `origin`.
- **Palette tiers** (`source/palette.mjs`):
  - **world**: at most 32 colors, as seven material ramps of 4 shades (`grass-1` highlight … `grass-4` shadow, and the same for soil, wood, path, water, roof and gold), plus `ink`, `cream` and two skin tones. For now it holds only the brand entries (`ink`, `cream`, `gold-2`, `soil-3`); the ramps arrive with the library objects.
  - **outfit**: at most 16 clothing colors, only for objects that extend `character`.
  - **legacy**: the 81 colors extracted from the redesign's art (`c-<hex>`), frozen. **Only imported art (`legacy: true`) may use them.** Never use one in new art, and never set `legacy: true` yourself.
  - Colors are added to the palette by hand, in a reviewed commit. Brand entries keep their `src/styles/variables.css` values.
- **Light** comes from the same side as on the island: tops are the light shade, left faces the mid shade, right faces the shadow shade.
- **Size caps.** A map is at most 64×64. A character (`character`, or anything that extends it) paints a figure of at most 16×24; today's figures are about 14×23. An object uses at most 12 colors; aim for 6–8. Imported legacy objects are exempt.

## Formats

Every source is a `.mjs` file whose default export is plain data, in the **canonical format**: the header comment, two-space indentation, single quotes, one map row per line and trailing commas. A test fails if a file isn't canonical, so start from `--new` or copy an existing file's layout exactly.

The three examples below compile together against today's sources, as `objects/small-rock.mjs`, `objects/outfit-example.mjs` and `scenes/example.mjs` (a test checks this).

### Objects (`source/objects/<name>.mjs`)

Names are lowercase kebab-case. Only the `sprite` kind exists so far; blocks come later.

```js
// Pixel-art object. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  kind: 'sprite',
  anchor: [2, 3],
  keys: {
    g: 'ink',
    c: 'cream',
  },
  layers: [
    {
      map: [
        '.gg.',
        'gccg',
        'gccg',
        '.gg.',
      ],
    },
  ],
};
```

- **`keys`** maps one printable character (not space, not `.`) to a palette name. `.` is always transparent. Keys are case-sensitive: use a letter for a material and its uppercase for a darker shade of it.
- **`anchor`** is the map pixel that sits on the placement point. For something standing on a tile, put it at the bottom center.
- **`layers`** paint bottom to top, and every map in an object has the same size. A layer can carry `class: 'cbob'` (or any fixed class), which puts it in its own group for CSS to move.
- **Frame loops:** a layer `{ loop: 'wf', prefix: 'w', frames: [map, map, …] }` compiles to groups `class="wf w0"`, `class="wf w1"` and so on. Frame 0 is what reduced motion shows. The loops the site's CSS animates are `wf` (w0–w4), `ff` (f0–f3) and `hf` (h0–h5).
- **Paint order inside a layer** follows `keys`: each color is drawn in the order its key is listed.

### Outfits (`extends`)

Every outfit extends `character` and replaces whole rows:

```js
// Pixel-art object. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  kind: 'sprite',
  extends: 'character',
  keys: {
    b: 'ink',
    c: 'gold-2',
    d: 'soil-3',
    e: 'ink',
    f: 'soil-3',
    t: 'cream',
  },
  rows: {
    1: {
      24: '....................attttta.....',
    },
  },
};
```

- `rows` is `{ <layer index>: { <row index>: '<whole row>' } }`. A row override must be the full width of the base's map.
- `keys` adds keys, or overrides the base's: the base's order comes first, then new keys.
- `character` and the five Range outfits are imported legacy art. A new outfit inherits the character's legacy colors, so it must override those keys with world or outfit colors. `--new object <name> --extends character` writes those overrides for you, using the nearest allowed color (keys `b` to `f` above); replace them with better choices as the world palette grows.
- `character` is a 32×35 canvas, with anchor `[0, 0]` at its top left. The figure is in its `cbob` layer, within columns 17–31, and the legacy outfits' props (a board, screens) are in layer 0, to its left. A new outfit keeps its figure within 16×24 and puts any prop in a separate object, placed beside it in a scene.

### Scenes (`source/scenes/<name>.mjs`)

```js
// Pixel-art scene. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  output: 'example.svg',
  viewBox: [-51, -9, 103, 72],
  origin: [0, 32],
  items: [
    { object: 'range-island', at: { px: [-49, -1] } },
    { object: 'small-rock', at: { tile: [1, 2, 0] } },
    { object: 'small-rock', class: 'pcloud pc0', at: { px: [30, 0] } },
    {
      group: { 'data-class': '0' },
      items: [
        { object: 'outfit-example', at: { px: [-24, -6] } },
      ],
    },
  ],
};
```

- **Items paint in order**: later items cover earlier ones. To bring something forward, move its entry down the list.
- **`at`** is `{ tile: [col, row, level] }` (snaps to the grid) or `{ px: [x, y] }` (exact, for imported art and nudges). Both must be whole numbers.
- **`class`** on an item wraps the object in a `<g class>` (the trucks' `itruck it1`, the clouds' `pcloud pc0`). **`group`** makes a `<g>` with `class` or `data-*` attributes around its items (the Range's `data-class` variants).
- **`output`** names the SVG it writes in `src/assets/pixel-art/`. Leave it out for a preview-only scene; it's still compiled and checked.

## The main path: headless

You don't need the editor or a browser.

1. **Start from a valid file.** `npm run art -- --new object <name> --size 16x16` (a sprite with an empty map), `--new object <name> --extends character` (an outfit) or `--new scene <name>`, or open an existing source. Choose the smallest object that does the job, and prefer placing objects in a scene over drawing large maps. `--new` refuses to overwrite a file.
2. **Edit whole rows**, and keep every row the same width. Add each color you use to `keys`, from the world palette.
3. **Check it:** `npm run art -- --check <name>`. It prints every problem with its file, layer, frame, row and column, and the rule broken, or a one-line summary (size, colors against the cap, layers, frames). Fix each problem where it points.
4. **Look at it:** `npm run art -- --preview <name>` writes `.art-preview/<name>@1x.png` to `@4x.png` (git-ignored). **Open the PNG and look at it.** An object stands on one tile outline; a scene shows its viewBox at frame 0. The picture, not the text, decides whether the art is right.
5. **Generate the output:** `npm run art` writes the SVGs for scenes with an `output`, then run `npm test`. A test fails if a committed SVG is stale against its sources.

A name can be written `objects/<name>` or `scenes/<name>` when an object and a scene share it.

## Pitfalls

- `.` is transparent. A space is not a valid key.
- Keys are case-sensitive: `g` and `G` are different colors.
- Long runs of one character are easy to miscount. Count against the preview, not the text, and let `--check` find ragged rows.
- Legacy colors (`c-<hex>`) are off-limits for new art, and so is `legacy: true`.
- Don't hand-edit `src/assets/pixel-art/*.svg`, and don't add `.src.svg` files. The extracted originals live in `scripts/fixtures/pixel-art/` as test fixtures only.
- `scripts/import-pixel-art.mjs` brings existing SVG art in as legacy sources. It's not for drawing new art.

## Before opening a PR

- [ ] `npm run art -- --check <name>` passes for everything you touched, and `npm run art` reports every file `lossless` and none `OVER BUDGET`.
- [ ] No legacy colors in new art; within the caps; light from the island's side.
- [ ] The preview PNGs (1× and 4× at least) are attached to the PR.
- [ ] `npm test` shows `# fail 0`.
- [ ] The art is generic and public-safe (`CLAUDE.md`): no names, logos or likenesses.
- [ ] If you changed how art is made (formats, commands, rules), this skill is updated in the same PR.
