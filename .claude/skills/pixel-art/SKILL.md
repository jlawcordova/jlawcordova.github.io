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
  - **world**: exactly 32 colors, as seven material ramps of 4 shades (`grass-1` highlight … `grass-4` shadow, and the same for soil, wood, path, water, roof and gold), plus `ink`, `cream`, `skin-1` and `skin-2`. They were picked from the island's own shades. `npm run art -- --preview palette` writes the swatch sheet: a row per material, shade 1 to 4 across. The tier is full, so a new color means dropping one.
  - **outfit**: at most 16 clothing colors (full: the `silver`, `violet`, `slate`, `orange`, `sky` and `navy` ramps, light to dark; a new color means dropping one), only for objects that extend `character`.
  - **legacy**: the 81 colors extracted from the redesign's art (`c-<hex>`), frozen. **Only imported art (`legacy: true`) may use them.** Never use one in new art, and never set `legacy: true` yourself.
  - Colors are added to the palette by hand, in a reviewed commit. Brand entries keep their `src/styles/variables.css` values.
- **Light** comes from the same side as on the island: tops are the light shade, left faces the mid shade, right faces the shadow shade.
- **Size caps.** A map is at most 64×64. A character (`character`, or anything that extends it) paints a figure of at most 24×32 (raised from 16×24 for the Range class characters, so a held prop fits); today's figures are about 14×23. A prop too big to hold is its own `prop-<name>` scene object. An object uses at most 12 colors; aim for 6–8. Imported legacy objects are exempt.

## Formats

Every source is a `.mjs` file whose default export is plain data, in the **canonical format**: the header comment, two-space indentation, single quotes, one map row per line and trailing commas. A test fails if a file isn't canonical, so start from `--new` or copy an existing file's layout exactly.

The examples below compile together against today's sources, as `objects/small-rock.mjs`, `objects/stone-block.mjs`, `objects/outfit-example.mjs` and `scenes/example.mjs` (a test checks this).

### Objects (`source/objects/<name>.mjs`)

Names are lowercase kebab-case. There are two kinds: `sprite` (pixel maps) and `block` (boxes on the isometric grid, drawn from numbers).

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

### Blocks (`kind: 'block'`)

A block is described by numbers, not drawn. Use one for ground, walls and water. `block`, `tile` and `water` in `source/objects/` are the library, and `scenes/library-demo.mjs` places them with `tree` and `pebble`. This example is `objects/stone-block.mjs` in the skill's test.

**Adding to the library demo.** A test (`library (R13, R31)` in `scripts/pixel-art-engine.test.mjs`) lists the objects `library-demo` places, and checks that every item sits within its 3×3 grid (columns and rows 0 to 2). When you place a new object there, add its name to that list in the same change, and keep it on the grid. A small object can stand on a block's top: give it the block's tile and list it right after that block, so it paints on top.

```js
// Pixel-art object. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  kind: 'block',
  size: [1, 1, 1],
  faces: {
    top: 'grass-2',
    left: 'soil-2',
    right: 'soil-3',
    edge: 'soil-4',
  },
};
```

- **`size`** is `[tiles wide, tiles deep, levels high]`. `[1, 1, 0]` is a flat tile and `[1, 1, 1]` a cube. A block is at most 64×64 pixels, so `[2, 2, 0]` fits and `[3, 3, 0]` doesn't.
- **`faces`**: `top` is the light shade, `left` the mid shade and `right` the shadow shade (R28). `left` and `right` are required when there are levels, and refused on a flat block. `edge` is optional: a 1-pixel outline around the whole block, drawn last. The faces use 1–4 colors (a flat block just its top), and the whole object, surface included, stays within 12.
- **Placement.** `at` is the top-face center of the block's first tile. The sides hang `levels × 16` pixels *below* it, so a cube on the ground is placed at `[col, row, 0]` and its sides reach one level under the ground. To sit a cube on top of a tile, place it at level 1: `[col, row, 1]`. A `[2, 1, 2]` block covers the tiles `[col, row]` and `[col + 1, row]`.
- **Paint order.** Items paint in order, so list a scene back to front: by `col + row`, smallest first.
- **A tile is 30 pixels wide at its widest row,** not 32: pixel centers never land on an edge, so neighbouring tiles share no pixel and leave no gap. Don't nudge blocks by a pixel to hide a seam; there isn't one.
- **`surface`** (optional) paints a one-tile (32×16) sprite over each tile of the top face, clipped to each tile's own diamond. It's `{ keys, map }`, or `{ keys, loop, prefix, frames }` for a loop. `water` uses five frames of `wf w0`…`w4`, which is what the site's CSS animates. Frame 0 is the reduced-motion frame. Surface colors count toward the 12-color cap.
- `npm run art -- --new object <name> --kind block` writes a starter block.

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
- `character` uses world colors only (`a` ink, `b` and `e` `soil-4`, `c` and `d` skin, `f` `wood-4`). An outfit may recolor those keys, as the knight and the suit do for armor and trousers. `--new object <name> --extends character` writes a starter outfit; it would re-key any legacy color of its base to the nearest allowed one, though `character` has none now.
- `character` is a 32×35 canvas, with anchor `[0, 0]` at its top left. The figure (head rows 19–23, legs rows 30–34) is in its `cbob` layer, columns 18–30; each outfit draws the top of the head (row 18), any hat above it, and the torso (rows 24–29). Draw held props in the `cbob` layer too, so they bob with the character. A prop goes left of the body (columns 8–17) or in front of it (as the Back-end laptop does, columns 22–31); there is no room right of column 31. A new outfit keeps its figure, with any prop it holds, within 24×32. A larger prop is a separate `prop-<name>` object, placed beside the character in a scene.

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

1. **Start from a valid file.** `npm run art -- --new object <name> --size 16x16` (a sprite with an empty map), `--new object <name> --kind block` (a block), `--new object <name> --extends character` (an outfit) or `--new scene <name>`, or open an existing source. Choose the smallest object that does the job, and prefer placing objects in a scene over drawing large maps. `--new` refuses to overwrite a file.
2. **Edit whole rows**, and keep every row the same width. For a block, change `size` and `faces` instead. Add each color you use to `keys`, from the world palette.
3. **Check it:** `npm run art -- --check <name>`. It prints every problem with its file, layer, frame, row and column, and the rule broken, or a one-line summary (size, colors against the cap, layers, frames). Fix each problem where it points.
4. **Look at it:** `npm run art -- --preview <name>` (or `--preview palette` for the world palette's swatch sheet) writes `.art-preview/<name>@1x.png` to `@4x.png` (git-ignored). **Open the PNG and look at it.** An object stands on one tile outline; a scene shows its viewBox at frame 0. The picture, not the text, decides whether the art is right.
5. **Generate the output:** `npm run art` writes the SVGs for scenes with an `output`, then run `npm test`. A test fails if a committed SVG is stale against its sources.

A name can be written `objects/<name>` or `scenes/<name>` when an object and a scene share it.

## The editor (optional)

The lab at `/lab/pixel-art/` (or `npm run dev`, then http://localhost:4321/lab/pixel-art/) edits scenes and paints objects in a browser, drawn by the same engine as `npm run art`. Use it when a person wants to work visually, or to check that the editor shows what the compiler builds. Everything it does also has a text-and-command path, the one above, so an agent never needs it.

- **Drive it by accessible names and keys,** not pixel positions:
  - **Lab bar:** the picker is the combobox "Open". It lists scenes, objects, new drafts, "New scene…" and "New object…".
  - **Toolbar:** one tab stop; arrow to "Scene" or "Object" inside it.
  - **Stage:** the group "Scene stage" or "Object stage".
  - **Library:** buttons named after their objects.
  - **Panels:** in Scene mode, the tree "Items"; in Object mode, the swatches named like "grass-2, #8FA56E".
- **Scene mode:** choose a thumbnail, then a tile, or focus a thumbnail and press Enter to place it at the stage cursor. On the stage:
  - arrows move the selected item one tile, or the cursor;
  - Shift + arrows nudge one pixel, and the item is then placed by `px`;
  - Page Up and Page Down change the level, `[` and `]` the paint order;
  - Delete removes, Escape deselects;
  - V, A and H pick Select, Place and Pan, and 0–4 zoom. Fit picks the largest whole zoom that fits the stage, up to 8×, so it can go past the 4× button.
- **Object mode:** opening an object, or choosing one in the Library while in Object mode, shows its map over a checkerboard, with its bounds dashed and its anchor marked. On the stage:
  - B, E, G and I pick Pencil, Eraser, Fill (4-connected) and Picker;
  - arrows move the pixel cursor (Shift: 8 pixels), and Space or Enter applies the tool there;
  - Delete erases at the cursor, and Escape cancels a stroke in progress;
  - Page Up and Page Down step frames, and `[` and `]` step layers;
  - 0 is Fit, and 1–4 zoom to 4×, 8×, 12× and 16×. A pointer stroke is one undo step.
  - **Colors:** a color the object doesn't use yet gets a new key, named after the color where it can be. The usage meter warns from 9 colors and stops new ones at 12.
  - **Outfits:** painting an outfit writes whole-row overrides, and a row painted back to match `character` drops its override. The gutter beside the stage marks the overridden rows.
  - **Layers and frames:** the Layers and Frames panels add, duplicate, reorder and delete them. Play never starts by itself.
- **New documents** start from the same starters as `--new`, as drafts named "(new)". A scene can place a new object right away. Export then reminds you to export the object too.
- **Export** shows the canonical source and its path. Save it there exactly, then run `npm run art` and `npm test`. With problems, Export lists them instead, and the status bar's count opens the same list, where choosing one goes to its row and column.
- **Drafts** stay in that browser's `localStorage`. They're not in the repo until someone exports and commits them.

## Achievement icons

The 16×16 icons beside the accomplishments on the site are objects named `icon-<id>`, placed in the `achievement-icons` scene. They follow every rule here and have a few of their own (size, anchor, sheet order, the icon list). Use the `achievement-icon` skill to add or change one.

## Legacy objects (the art that's already on the site)

The redesign's art was imported with `scripts/import-pixel-art.mjs`, so it's marked `legacy: true` and uses the legacy palette. Each of these objects stays a pixel-for-pixel copy of the original until someone changes it on purpose.

- **The hero island** (`scenes/hero-island.mjs`, written to `hero-island.svg`) is built from:
  - `island-base`: the island itself, one 193×128 map with 33 colors;
  - the river's `river` tiles and `waterfall-face`, `flag` and `hearth`: frame loops `wf` (5 frames, one set per piece), `ff` (4) and `hf` (6);
  - `truck`, placed with class `itruck it1`, and `truck-green`, placed with `itruck it2`;
  - `island-front`: the trees, crane, fence and roof that are drawn in front of the trucks;
  - `cloud-a`, `cloud-b` and `cloud-c`, placed with `pcloud pc0` to `pc2`.
- **The Range sprite** (`scenes/range-sprite.mjs`) is `range-island` (still legacy) plus seven outfits that extend `character`, one per `data-class` group, in the order of `rangeClasses` in `src/data/home.ts` (a test keeps them in step). The outfits and `character` were redrawn in world and outfit colors by the [Range class characters](../../../docs/intents/2026-10-sixth-range-class/intent.md) change, so they're no longer legacy.
- **Why `island-base` is exempt from the caps:** the extracted art is grouped by color, not by thing, so the importer can't split it into trees, blocks and water (spec concern A2). It moved in as one big map, which is wider than 64 and uses far more than 12 colors. Splitting it into library objects is later work, done one piece at a time. Each piece should either be a visible no-op or a deliberate change that's reviewed on its own.
- **Recolors.** `truck-green` is `truck` with other colors: it `extends: 'truck'` and lists only the keys that differ. Use the same pattern for a variant that changes colors but not shape.
- **Moving legacy art to world colors** changes how it looks, so do it one object at a time, in its own PR, with before and after previews. Don't do it as part of other work.
- **Keep the CSS hooks.** `pixel-art.css` animates the classes on these groups (`wf w0`…, `itruck it1`, `pcloud pc0`, `cbob`). Don't rename a loop, prefix or placement class unless you change the CSS in the same PR.

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
