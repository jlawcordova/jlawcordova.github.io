# Spec: Isometric pixel-art engine (from intent.md 2026-10-01, amended 2026-10-02)
Status: approved.

| | |
| --- | --- |
| **Intent** | [`intent.md`](intent.md) |
| **Builds on** | [Redesign spec](../2026-10-redesign/spec.md) §8 (pipeline), §11 (responsive), §12 (budgets) and §13 (verification) |
| **Plan** | [`plan.md`](plan.md) |

This spec turns the intent into buildable detail. The intent says *what* and *why*, and this says *how*. If the two disagree, the intent wins and this spec gets fixed.

## Requirements

Each requirement traces to the intent's Scope (S*n*) or Acceptance criteria (AC).

### Engine and sources

- **R1. Objects.** Every reusable piece of art is an object: a `.mjs` file under `src/assets/pixel-art/source/objects/` whose default export is plain data (S1).
- **R2. Each outfit is its own object.** The five current Range outfits and the new one each live in their own file. Outfits share a base character object and override it (S1, AC).
- **R3. Scenes.** A scene is a `.mjs` file under `source/scenes/` that places objects on the isometric grid or at pixel offsets, in paint order. Each shipped SVG is built from exactly one scene (S2).
- **R4. Extensible library.** Adding a new object (a block, water, a tree) needs only a new file under `objects/`, and any scene can place it. Only a new *kind* of object (see [D3](#d3-object-kinds)) needs engine code (S3, AC).
- **R5. Frames and classes.** An object layer can declare a frame loop that compiles to the `class="<loop> <prefix>N"` groups that `pixel-art.css` animates (`wf w0..4`, `ff f0..3`, `hf h0..5`). Layers and placements can also carry fixed classes (`cbob`, `itruck it1`, `pcloud pc0`). No CSS changes (S4, AC).
- **R6. Named palette.** Objects name their colors from one shared palette module with three tiers: world, outfit and legacy (see [R26](#design-language)). Brand colors use their `variables.css` token names and values, and a test keeps the two in step (intent constraint).
- **R7. Compiler.** `npm run art` compiles every scene, runs the existing optimizer and its lossless check, enforces the budget, and writes `src/assets/pixel-art/<name>.svg` for each scene that ships (S5, AC).
- **R8. Deterministic.** The same sources always give byte-identical output. `npm test` fails if a committed SVG is stale against its sources (intent constraint).
- **R9. Canonical format.** Every committed source is in the editor's canonical format: re-serializing it gives the same bytes. Hand edits and editor exports therefore give small, comparable diffs (supports S8).

### Design language

These rules keep new art in one world, and keep sources small enough for a person or an AI to read and edit as text. They were set by the owner on 2026-10-02, after measuring today's art (see [D2](#d2-palette) and [D4](#d4-isometric-grid)).

- **R26. Palette tiers.**
  - The **world** palette has at most 32 colors: 7 material ramps of 4 shades (highlight, light, mid, shadow), plus ink, cream and 2 skin tones.
  - The **outfit** palette adds at most 16 clothing colors.
  - The **legacy** palette is today's 81 extracted colors, frozen. Only imported art may use it.
  - The engine fails any new object that uses a legacy color, and any palette that goes over a cap.
- **R27. Size caps.** The tile is 32×16 pixels and one level is 16 pixels high. A character is at most 16×24. An object is at most 64×64 and uses at most 12 colors (aim for 6–8). A block uses 3–4 (top, left, right and an optional edge). Imported legacy maps are exempt. The engine enforces every cap except the 6–8 target.
- **R28. Light direction.** Every block and every new object is lit from the same side as the island: the top is the light shade, the left face the mid shade and the right face the shadow shade.
- **R29. Previews.** `npm run art -- --preview <name>` writes a PNG of any object or scene at 1×, 2×, 3× and 4× to a git-ignored folder, using Node built-ins only. The same images go in PRs, and anyone editing a source, whether a person or an AI, checks the change by looking at the picture.
- **R30. Precise errors.** Every validation error names the file, layer, frame, row and column, and the rule broken. Examples: "row 7 is 31 wide, expected 32", "key `q` is not in `keys`" and "`c-6f8a55` is a legacy color".

### Round trip

- **R10. Range sprite.** The compiled `range-sprite.svg` has the same layer structure as the extracted sprite (base island, `data-class="0..4"` groups, each with its `cbob` group, in the same order). Every fill group in every layer covers exactly the same pixels (S6, AC).
- **R11. Hero island.** The compiled `hero-island.svg` has the same animation groups, in the same order, as the extracted island. Each layer's **visible image** (the top-most color at every pixel) is identical. See [concern A1](#a1-pixel-exact-for-the-island-means-the-visible-image) for why this differs from R10 (S6, S7, AC).
- **R12. Source of truth.** After R10 and R11 pass, the engine sources are the source of truth for both pieces of art. The extracted SVGs move to test fixtures and stay there (Decision #3).

### New art

- **R13. Library objects.** The library includes at least a block, a flat tile, a water block (with a frame loop) and a tree, plus a demo scene built only from them (S3, AC).
- **R14. Security and governance outfit.** A sixth outfit object, made with the engine and placed in a preview scene. It's **not** added to `range-sprite.svg` or the carousel (S10, Decision #5).
- **R31. First world palette.** The first 32 world colors are picked from the island's existing shades, so new art looks like the same world. They ship with a swatch sheet preview in their PR. The library objects (R13) and the new outfit (R14) use only world and outfit colors.

### Editor page

- **R15. Route.** The editor is at `/lab/pixel-art/`. It's a static page, deployed with the site, with `<meta name="robots" content="noindex, nofollow">`. It isn't linked from the nav, footer, any page or the Atom feed (S8, Decision #8).
- **R16. Scene editing.** You can open any scene, add an object from the library, move it a tile or a pixel at a time, change its level and paint order, and remove it (S8).
- **R17. Object painting.** You can open or create an object, paint and erase pixels with the shared palette, flood-fill, pick a color from the canvas, and work across layers, frames and variants. Undo and redo cover every edit (S8, Decision #9).
- **R18. Same render.** The editor draws with the same engine code as `npm run art`. A scene or object exported from the editor, committed and compiled gives exactly the pixels the editor showed (S8, AC).
- **R19. Export.** "Copy source" and "Download .mjs" give the canonical source of the current scene or object, and show the repo path it belongs at. Nothing is sent over the network (Decision #10).
- **R20. Drafts.** Unsaved work is kept in the browser's `localStorage`, per scene or object, and can be reset to the site's version (S8).
- **R21. No dragging needed.** Everything you can do by dragging, you can also do with single taps or clicks, and with the keyboard alone (intent constraint; WCAG 2.1.1 and 2.5.7).
- **R22. Responsive.** The page works at 1440px and 390px wide, with no horizontal page scroll at any width from 320px up (AC).

### Cross-cutting

- **R23. No new dependencies,** runtime or dev, and no UI framework (intent constraint).
- **R24. Budgets.** Each shipped SVG stays ≤ 100 KB raw and ≤ 25 KB gzip, and is no bigger than today's. The home page's weight doesn't grow, and none of the editor's code, CSS or data loads on any other page (intent constraint).
- **R25. Docs.** The README and `CLAUDE.md` describe the source formats, the editor and `npm run art`. Every mention of `source/*.src.svg` is updated (AC; `CLAUDE.md` "When a doc moves").

### Skills and verification

- **R32. Pixel-art skill.** `.claude/skills/pixel-art/SKILL.md` teaches any AI agent to make and change pixel art without this conversation's context. It covers objects, scenes, outfits, the design language (R26–R28), previews, validation errors and the editor. Its main path needs **no editor and no browser**: the agent writes or changes sources, runs `npm run art`, and gets the output SVGs and PNG previews. The editor is an optional extra. Each slice that changes how art is made updates the skill in the same PR (S11, Decision #13).
- **R33. Verify-change skill.** `.claude/skills/verify-change/SKILL.md` runs an independent, report-only check of any PR against its change's intent, spec and plan. It isn't specific to pixel art (S11, S12, Decision #12).
- **R34. Traceability.** Every requirement in this spec maps to at least one test whose name starts with its ID (for example `R27: rejects a 13th color`), or to a named check in [D15](#d15-traceability) (S12, AC).
- **R35. Browser checks.** Browser checks are scripts in `scripts/e2e/`, run by `npm run e2e` with the environment's own Playwright. They're not a dependency and not part of `npm test`. If Playwright isn't available, the run prints "browser checks NOT RUN" and exits 2. It never passes silently (S12, Decision #11).
- **R36. Independent verification.** Every PR in this change gets a verifier report as a PR comment, from a session that didn't build it. The verifier never pushes, and it never edits committed files (S12, Decision #12, AC).
- **R37. Skill eval.** A fresh session, given only the pixel-art skill and a one-line request ("add a small rock to the library"), produces an object that passes validation and whose preview the owner accepts. The session works headless: it doesn't open the editor or a browser (S11, AC, Decision #13).
- **R38. Headless toolkit.** Everything the editor can do has a text-and-command equivalent, so an agent never needs the editor:
  - `npm run art -- --new <kind> <name>` writes a valid, canonical starter source at the right path;
  - `--check <name>` validates one object or scene;
  - `--preview <name>` writes its PNGs (R29);
  - plain `npm run art` compiles and writes the output SVGs.

  Output SVGs only ever come from the compiler, never from hand-written SVG (Decision #13).

## Design

### D1. Files

```
src/assets/pixel-art/
  hero-island.svg                 generated, committed (name unchanged)
  range-sprite.svg                generated, committed (name unchanged)
  source/
    palette.mjs                   world, outfit and legacy color tiers (D2)
    objects/
      character.mjs               base body for every outfit
      outfit-front-end.mjs        one file per outfit, the six below plus…
      outfit-cloud-devops.mjs
      outfit-ux-design.mjs
      outfit-data-engineering.mjs
      outfit-project-management.mjs
      outfit-security-governance.mjs
      range-island.mjs            the Range stage's island, as one pixel map
      island-base.mjs             the hero island's static art, as one pixel map
      waterfall.mjs  flag.mjs  hearth.mjs  truck.mjs  cloud-*.mjs
      block.mjs  tile.mjs  water.mjs  tree.mjs
    scenes/
      hero-island.mjs             output: hero-island.svg
      range-sprite.mjs            output: range-sprite.svg
      library-demo.mjs            preview only, not written
      outfit-preview.mjs          preview only, shows all six outfits
src/lib/pixel-art/
  engine.mjs                      load, validate, render objects and scenes to layers
  iso.mjs                         grid projection and block faces
  svg.mjs                         layers → rect SVG (the optimizer's input)
  serialize.mjs                   canonical source text for objects and scenes
src/pages/lab/pixel-art.astro     the editor page
src/components/lab/               editor components and their client script
src/styles/lab.css                editor styles (see concern A5)
scripts/
  optimize-pixel-art.mjs          unchanged optimizer, plus a scene-compiling entry point
  import-pixel-art.mjs            one-off: extracted SVG → object and scene sources
  fixtures/pixel-art/
    hero-island.src.svg           moved from source/, pins today's art
    range-sprite.src.svg          moved from source/
  pixel-art-engine.test.mjs
  pixel-art-roundtrip.test.mjs
  pixel-art-preview.mjs           PNG previews (R29): engine pixels → PNG via node:zlib
.art-preview/                     git-ignored output of the previews
scripts/e2e/
  run.mjs                         finds Playwright, serves dist/, runs the suites (D17)
  art.e2e.mjs                     fixture vs compiled art, rendered in the browser
  editor.e2e.mjs                  editor flows, widths, keyboard-only, reduced motion, storage off
.e2e-output/                      git-ignored screenshots from the browser checks
.claude/skills/
  pixel-art/SKILL.md              making and changing pixel art (D18)
  verify-change/SKILL.md          independent, report-only verification (D16)
```

The engine is plain ES modules with JSDoc types and `// @ts-check`, not TypeScript. `node scripts/…` imports it without a build step (the repo supports Node ≥ 22.12, which doesn't strip types by default), and Astro bundles the same files into the editor. The engine uses no Node or DOM APIs, so it runs unchanged in both.

### D2. Palette

**What the art uses today** (measured on 2026-10-02):

| | Colors |
| --- | --- |
| Hero island (static base) | 38 |
| Range island | 21 |
| Each outfit (body included) | 16–18. Only 6 are shared by all five: outline, skin, hair, mouth and two leg shades |
| **All art** | **81**, with many near-duplicates: 11 greens, 8 sand and path tones, 7 browns |

The island is already built from a handful of materials, each in a few shades. The palette keeps that model and tightens it.

**`source/palette.mjs`** exports three tiers:

```js
export default {
  // World: at most 32. Seven 4-shade material ramps (1 = highlight … 4 = shadow),
  // plus ink, cream and two skin tones.
  world: {
    'grass-1': '#B5C79C', 'grass-2': '#8FA56E', 'grass-3': '#6F8F55', 'grass-4': '#4E6B3A',
    'soil-1': '#9C6B42',  'soil-2': '#8A5A34',  'soil-3': '#5A3E2B',  'soil-4': '#3F2B1E',
    // wood, path, water, roof, gold …
    ink: '#2E2418',       // --color-ink
    cream: '#F4EDE0',     // --color-page
    'skin-1': '#E9B98A', 'skin-2': '#A0524A',
  },
  // Outfit: at most 16 clothing colors, used only by outfit objects.
  outfit: { 'teal-1': '#7FA89B' /* … */ },
  // Legacy: today's 81 extracted colors, frozen. Only imported art may use them.
  legacy: { 'c-6f8a55': '#6F8A55' /* … */ },
};
```

- **Ramps.** The seven materials are grass, soil, wood, path, water, roof and gold. Each has 4 shades, named `<material>-1` (highlight) to `<material>-4` (shadow). The values above are illustrative. R31 picks the real ones from the island's existing shades.
- **Brand colors** keep their token values: `ink` is `--color-ink`, `cream` is `--color-page`, `gold-2` is `--color-gold` and `soil-3` is `--color-earth`. A test parses `src/styles/variables.css` and checks each one.
- **Legacy colors** are named `c-<hex>` by the importer. Names are cosmetic, so renaming one changes no output. Moving a legacy object to world colors is a visible change, made deliberately, one object at a time.
- **Rules the engine enforces:**
  - Uppercase hex only, with no alpha. Transparent is the absence of a pixel, never a color.
  - Each name is unique across all tiers.
  - Tier caps: world ≤ 32, outfit ≤ 16.
  - An object marked `legacy: true` (only the importer sets it) may use any tier. Any other object may use only world colors, plus outfit colors if it `extends: 'character'`.
- **Who adds colors.** New colors are added by hand in a reviewed commit, never by the editor (R17: the editor paints only from the palette).

### D3. Object kinds

An object's `kind` picks how the engine draws it. There are two kinds:

**`sprite`**: pixel maps. It covers outfits, trees, trucks, clouds and the imported island maps.

```js
// source/objects/tree.mjs
export default {
  kind: 'sprite',
  anchor: [5, 13],              // the map pixel that sits on the placement point
  keys: { L: 'grass-2', D: 'grass-4', T: 'wood-3' },   // '.' is always transparent
  layers: [
    {
      map: [
        '...LLLL...',
        '..LLDDLL..',
        // one string per row, all the same length
        '....TT....',
      ],
    },
  ],
};
```

- **Keys** are single printable characters other than space and `.`. Use mnemonic letters (`g` for grass, `w` for wood), and an uppercase letter for a darker shade of the same material.
- **Caps (R27):**
  - A map is at most 64×64. A character is at most 16×24.
  - An object uses at most 12 keys, with 6–8 as the target.
  - Objects marked `legacy: true` are exempt from both. That covers `island-base` (38 colors, up to 225×212) and `range-island`.
  - The two caps that matter most for editing as text are the 12 keys and the 64 width. A row of 32 or fewer is comfortable in a diff, and that's also where an AI's edits stay reliable: it reads text in chunks, not letter by letter, so long runs of the same character are where it miscounts.
- **Layers** paint bottom to top. A layer can carry `class: 'cbob'`, and it compiles to its own group so CSS can move it.
- **Frames:** `{ loop: 'wf', prefix: 'w', frames: [map, map, …] }` compiles to groups `class="wf w0"`, `class="wf w1"` and so on, in order. Frame 0 is the static frame that reduced motion shows, which matches today's CSS.
- **Inheritance**, the mock's `BASE` and `CL` model: an object can have `extends: 'character'` and then give `rows: { <layer>: { <rowIndex>: '<row>' } }` and `keys` overrides. Every outfit extends `character`. Whole rows are replaced, so an outfit's diff shows exactly which rows it changes.

**`block`**: procedural boxes on the isometric grid. They cover blocks, flat tiles and water.

```js
// source/objects/water.mjs
export default {
  kind: 'block',
  size: [1, 1, 0],              // tiles wide, tiles deep, levels high (0 = flat tile)
  faces: { top: 'water-1', left: 'water-2', right: 'water-3', edge: 'water-4' },  // R28: light, mid, shadow
  surface: { loop: 'wf', prefix: 'w', frames: [ /* top-face sprite maps */ ] },  // optional
};
```

- It draws the top, left and right faces in their three tones, with an optional 1px edge, on the 2:1 grid in [D4](#d4-isometric-grid). The light comes from the same side as on the island: top light, left mid, right shadow (R28). A block uses 3–4 colors.
- `size` is in tiles and levels, so a block is described by numbers rather than drawn. That makes blocks the easiest objects to place and change, for a person or an AI.
- An optional `surface` sprite, which can have frames, is laid over the top face. That's how water ripples or grass detail work.

New objects of either kind are data only (R4). A third kind, such as slopes, means engine code and its own tests, and is added only when an asset needs it (Decision #6).

### D4. Isometric grid

- **The tile is 32×16 art pixels, fixed** (R27). That's what the hero island was drawn on: its grass checkerboard is made of 32×16 diamonds. It's also the shape of the site's `.isogrid` background. The island's grass is about 192 pixels across, which is roughly 6×6 tiles.
- **One level is 16 pixels high,** so a one-level block is 32 wide and 32 tall and reads as a cube.
- **Projection.** 2:1 dimetric, with lines at ±26.57°. Every edge steps 2 pixels across for 1 down, so lines stay clean at every integer zoom.
- **Tile position.** A tile at `[col, row, level]` has its top-face center at `x = (col − row) × 16 + ox` and `y = (col + row) × 8 − level × 16 + oy`. `[ox, oy]` is the scene's `origin`, which lines the grid up with the scene's art.
- **Placement** is either `at: { tile: [col, row, level] }` or `at: { px: [x, y] }`. The second is for imported art and fine nudges. Both resolve to whole pixels.
- **Character scale.** Today's character is 16×20: half a tile wide, and a little over a tile tall. New characters keep that scale (at most 16×24, R27).

### D5. Scenes

```js
// source/scenes/range-sprite.mjs
export default {
  output: 'range-sprite.svg',   // omit for preview-only scenes
  viewBox: [-51, -9, 103, 72],
  origin: [0, 32],              // where tile [0, 0, 0] sits; the grid itself is fixed (D4)
  items: [
    { object: 'range-island', at: { px: [-51, -9] } },
    { group: { 'data-class': '0' }, items: [{ object: 'outfit-front-end', at: { px: [-8, 20] } }] },
    { group: { 'data-class': '1' }, items: [{ object: 'outfit-cloud-devops', at: { px: [-8, 20] } }] },
    // …
  ],
};
```

- **Items** paint in source order, so z-order is explicit and deterministic. The editor inserts new items in back-to-front order (by `row + col`, then `level`), and you can raise or lower one by hand.
- **Groups** carry attributes onto a `<g>` (only `class` and `data-*`), so the Range variants keep their `data-class` hooks.
- **Placement classes** (`{ object: 'truck', class: 'itruck it1', … }`) put the object inside a `<g class>`, which is how the two trucks and three clouds keep their CSS hooks.
- The values above are illustrative. The importer finds the real offsets.

### D6. Compiling

`npm run art` runs `scripts/optimize-pixel-art.mjs`, which gains a scene step in front of the existing one:

1. Load `palette.mjs`, every object and every scene, and validate them. Each of these fails with the file, layer, frame, row and column (R30):
   - unknown keys;
   - ragged rows;
   - missing objects;
   - `extends` cycles;
   - colors not in the palette;
   - a non-legacy object using a legacy color, or a non-outfit object using an outfit color;
   - a palette tier over its cap;
   - an object over 64×64 or 12 colors, or a character over 16×24;
   - non-integer offsets.
2. Render each scene to a tree of layers that mirrors its groups. Each layer is a map from pixel to color, where later paint wins.
3. Emit a rect SVG: in each layer, one `<g fill>` per color, in order of first paint, with one `<rect>` per horizontal run. Group attributes and order are kept.
4. Hand that SVG to the existing `optimizeSvg` and `verifyLossless` unchanged, check the budget, and write `<output>`.
5. Print each file's raw and gzip size, as today.

**Command line (R38).** `npm run art` takes these options. All of them use the same engine as the build and the editor:

| Command | What it does | Exit code |
| --- | --- | --- |
| `npm run art` | Validate and compile everything, then write the output SVGs | 0 ok, 1 on any problem |
| `npm run art -- --check <name>` | Validate one object or scene, plus everything it uses, without writing anything. It prints every problem (R30) and, on success, a one-line summary: size, colors used against the cap, layers, frames | 0 ok, 1 on problems |
| `npm run art -- --preview <name>` | Write `.art-preview/<name>@{1,2,3,4}x.png`. A preview shows an object standing on one tile over a 32×16 grid, and a scene at its viewBox | 0 ok, 1 on problems |
| `npm run art -- --new object <name> [--kind sprite\|block] [--extends character] [--size WxH]` | Write a canonical starter source to `source/objects/<name>.mjs`. For a sprite that's an empty map of the given size with a starter key; for a block it's a 1×1×1 block in the `grass` ramp. It refuses to overwrite an existing file | 0 ok, 1 if it exists or the name is invalid |
| `npm run art -- --new scene <name>` | Write a preview-only scene with an empty `items` list | Same |

Each command's output is short and plain text, made to be read by a person or an agent. Every error has the file, location and rule (R30).

Editor actions map to source edits like this:

| Editor action | Text equivalent |
| --- | --- |
| Place, move or remove an item | Add, change or remove an entry in the scene's `items` |
| Change level or paint order | Change `at.tile[2]`, or move the entry in `items` |
| Paint, erase or fill pixels | Replace whole rows in a layer's `map` or frame |
| Add a layer or frame | Add an entry to `layers` or `frames` |
| Make an outfit | `--new object <name> --extends character`, then row overrides |
| Export | Not needed. The file being edited is the source |

Preview-only scenes (no `output`) go through steps 1 to 4 too, so they're held to the same checks.

The optimizer's own fixtures and tests stay. The old "read `source/*.src.svg`" entry point goes away.

### D7. Round trip

- `scripts/import-pixel-art.mjs` reads a fixture SVG and writes object and scene sources. Each static layer becomes one sprite object. Each frame loop becomes one object with frames, and each placement class becomes a placement. It's run once per fixture in the plan. It stays in the repo because it's also how any future SVG art comes in.
- **The Range sprite:** `range-island`, plus one outfit object per `data-class`. Each outfit has a static layer and a `cbob` layer. After import, the plan factors the five outfits into `character` plus overrides, and the test below must keep passing.
- **The hero island:** `island-base` (one pixel map, trimmed to its bounds, up to 225×212), `waterfall`, `flag`, `hearth`, `truck` (placed twice) and three clouds.
- `scripts/pixel-art-roundtrip.test.mjs` compiles both scenes and checks them against the fixtures: R10's per-fill-group test for the Range sprite and R11's visible-image test for the island, plus group structure and order. It also re-runs the optimizer's lossless check.
- The committed `hero-island.svg` and `range-sprite.svg` change bytes once, because group order changes and hidden pixels are dropped. They don't change visually. The PR shows before and after screenshots and sizes.

### D8. Tests (`node:test`, no network)

- **Parser and validation:** each error case in D6 step 1 has a fixture and an exact message.
- **Sprites:** keys, transparency, anchors, layers, classes, frames and `extends` with row and key overrides.
- **Blocks:** each face's pixels for sizes `[1,1,0]`, `[1,1,1]` and `[2,1,2]`. Edges step exactly 2:1. Two adjacent blocks share an edge with no gap or overlap.
- **Scenes:** paint order, group attributes, placement classes, and tile versus pixel placement.
- **Serializer:** `serialize(load(file))` equals the file's bytes for every committed source (R9).
- **Palette:** brand entries match `variables.css`. The tier caps (32 and 16) hold. Names are unique across tiers. The world tier is seven complete 4-shade ramps plus ink, cream and the two skin tones.
- **Design-language caps:** an object of 65×64, a 13th color, a 16×25 character and a legacy color in a new object each fail with the expected message. Legacy objects are exempt.
- **Previews:** the PNG writer produces a valid PNG (signature, IHDR, CRC) whose decoded pixels equal the engine's pixels at 1× and 3×.
- **Staleness:** compiling every scene with an `output` gives byte-identical files to those committed (R8).
- **Round trip:** see D7.

### D9. Editor page

#### D9.1 Page and data

- **Route.** `src/pages/lab/pixel-art.astro` renders with `BaseLayout`, which gets an optional `noindex` prop that emits the robots meta (R15). The title is "Pixel-art lab". The site header and footer stay, so the page reads as part of the site and has a way back. No `robots.txt` entry is added, because a `Disallow` would stop crawlers from reading the `noindex` and would also publish the URL.
- **Data.** At build time the page imports every source with `import.meta.glob('…/source/**/*.mjs', { eager: true })` and embeds the palette, objects and scenes as JSON in one `<script type="application/json">`. The client script parses it, so there are no fetches.
- **Script.** Client code lives in `src/components/lab/` as TypeScript, bundled by Astro into this page only. It imports the engine from `src/lib/pixel-art/`, never re-implements it (R18), and doesn't use `eval` or dynamic `import()` of user content.
- **Without JavaScript,** the workspace is replaced by a short note: "The pixel-art lab needs JavaScript."

#### D9.2 Regions

The page is one workspace with five regions. They keep the same names everywhere in the UI, the code and this spec.

| Region | What it holds |
| --- | --- |
| **Lab bar** | The page title, the **document picker** (what's open: a scene or an object, by name, plus "New scene…" and "New object…"), the draft status and the **Export** button. |
| **Toolbar** | The **Scene / Object** mode switch, the tools for that mode, zoom, the grid toggle, and undo and redo. |
| **Stage** | The canvas, drawn by the engine over the `.isogrid` background. |
| **Status bar** | The cursor position, the zoom, a problems count, and the live region that announces each action. |
| **Library** | Every object, grouped and searchable, with a thumbnail. In Scene mode you place objects from it. In Object mode you open one to edit. |
| **Inspector** | Panels for the open document. They change with the mode (D9.4 and D9.5). |

#### D9.3 Layout

**≥ 960px (wireframe at 1440px).** Three columns under the lab bar. The workspace fills the viewport below the sticky header (`height: calc(100dvh - var(--header-offset))`, at least 640px), so the page itself doesn't scroll while you work. Each column scrolls on its own. The footer sits below the workspace.

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ [JL] J.LAW                                                   Range   Blog   (Contact)      │  site header
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ LAB  Pixel-art lab   [ Scene · hero-island   ▾ ]   ● Draft, 2 min ago   [Export]           │  lab bar
├──────────────────┬──────────────────────────────────────────────────┬──────────────────────┤
│ LIBRARY          │ (Scene|Object) [V][A][H] 1× 2× 3× 4× Fit # ↶ ↷   │ ITEMS                │  toolbar
│ [ Search…      ] ├──────────────────────────────────────────────────┤ ▾ island-base        │
│                  │                                                  │ · waterfall          │
│ BLOCKS           │                                                  │ · tree          ◂    │
│ ┌──┐ ┌──┐ ┌──┐   │                                                  │ · truck (it1)        │
│ │▱▱│ │▱▱│ │≈≈│   │                                                  │ · truck (it2)        │
│ └──┘ └──┘ └──┘   │                                                  ├──────────────────────┤
│ block tile water │                                                  │ SELECTED · tree      │
│                  │        stage: canvas over .isogrid               │ Col [3] ± Row [4] ±  │
│ NATURE           │                                                  │ Level [0] ±          │
│ ┌──┐ ┌──┐        │                                                  │ Nudge x [0] y [0]    │
│ │/\│ │()│        │                                                  │ [Raise] [Lower]      │
│ └──┘ └──┘        │                                                  │ [Duplicate] [Remove] │
│ tree cloud-a     │                                                  ├──────────────────────┤
│                  │                                                  │ SCENE                │
│ CHARACTERS   ▸   │                                                  │ Output hero-island   │
│ LEGACY       ▸   ├──────────────────────────────────────────────────┤ Origin [0] [32]      │
│                  │ col 3 · row 4 · lvl 0   x 48 y 40   2×   ! 0     │                      │  status bar
└──────────────────┴──────────────────────────────────────────────────┴──────────────────────┘
  264px                               fills the rest                     304px
```

**< 960px (wireframe at 390px).** One column. The stage comes first, at `height: 60dvh` (at least 320px). Library, Items and Inspector become three tabs below it. Nothing sits side by side, and nothing is wider than the viewport.

```
┌──────────────────────────────┐
│ [JL] J.LAW                   │ site header (wraps as today)
│ Range  Blog  (Contact)       │
├──────────────────────────────┤
│ LAB  Pixel-art lab           │ lab bar: title,
│ [ Scene · hero-island    ▾ ] │ picker on its own row,
│ ● Draft, 2 min ago  [Export] │ then status and Export
├──────────────────────────────┤
│ (Scene|Object) [V][A][H]     │ toolbar wraps to two rows,
│ [Fit ▾]   #   ↶  ↷           │ every button 44×44
├──────────────────────────────┤
│                              │
│                              │
│    stage: pans inside its    │
│    own frame; never scrolls  │
│    the page sideways         │
│                              │
├──────────────────────────────┤
│ col 3 · row 4 · ! 0          │ status bar
├──────────────────────────────┤
│ [Library] [Items] [Inspector]│ tabs (role="tablist")
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐          │
│ │▱▱│ │▱▱│ │≈≈│ │/\│          │ thumbnails wrap
│ └──┘ └──┘ └──┘ └──┘          │
└──────────────────────────────┘
```

At < 480px the gutter is 16px, as on the rest of the site. At 390px the stage frame is 358px wide. At "Fit" zoom, the hero island scene (225 pixels wide) shows at 1×, and a 64-pixel object shows at 5×.

#### D9.4 Scene mode

The **Library** sits on the left. The **Inspector** shows three panels: **Items**, **Selected** and **Scene**.

- **Toolbar tools:**

  | Tool | Key | What it does |
  | --- | --- | --- |
  | Select | V | Picks an item. Dragging it moves it. |
  | Place | A | Places the Library's current object on the tapped tile. |
  | Pan | H, or hold Space | Drags the view. |

  The toolbar also has **zoom** (1×, 2×, 3×, 4×, Fit), the **grid** toggle (#), which draws every tile's outline on the stage, and **undo/redo**.
- **Adding an object.** There are three ways, and each does the same thing:
  - drag a Library thumbnail onto the stage;
  - tap a thumbnail, then tap a tile;
  - focus a thumbnail and press Enter, which places it at the stage cursor.

  New items snap to tiles. They're inserted in back-to-front order (by `row + col`, then `level`).
- **On the stage:**
  - The tile under the pointer or cursor shows as an ink diamond outline at 50% opacity.
  - The selected item gets a 1px accent outline around its pixels' bounding box. The outline doesn't animate.
- **Items panel.** A listbox of the scene's items in paint order, with the front item at the top. Groups such as `data-class="2"` show as collapsible rows. This list is the stage's accessible model: choosing a row selects the item, and the stage keys act on it.
- **Selected panel:**
  - **Position:** Col, Row and Level as number fields with − and + buttons. Nudge x and y for pixel offsets.
  - **Class:** the placement class, for example `itruck it1`.
  - **Actions:** Raise, Lower, Duplicate and Remove, each a 44px button.
- **Scene panel:** the scene's name, its output file (or "Preview only"), `viewBox` and `origin`.

#### D9.5 Object mode

The **Library** is the list of objects to open. The **Inspector** shows **Palette**, **Layers**, **Frames** and **Object** panels, plus a **Preview** at true size.

- **Toolbar tools:**

  | Tool | Key | What it does |
  | --- | --- | --- |
  | Pencil | B | Paints one pixel with the current color. |
  | Eraser | E | Clears one pixel. |
  | Fill | G | Flood-fills same-colored, 4-connected pixels. |
  | Picker | I | Makes the clicked pixel's color current. |

  The toolbar also has **zoom** (4×, 8×, 12×, 16×, Fit), the **pixel grid** toggle (#), which draws 1px lines between pixels at 8× and up, an **onion skin** toggle, which shows the previous frame at 30% opacity, and **undo/redo**.
- **Stage:**
  - The object sits on a checkerboard so you can see transparent pixels.
  - A dashed ink rectangle marks the object's bounds.
  - A small crosshair marks its anchor.
  - Painting outside the cap (R27) isn't possible: the bounds stop at 64×64.
- **Palette panel:**
  - **Layout.** The world palette is laid out as its design language: one row per material, four swatches from highlight to shadow, then a row for ink, cream and the two skin tones. Outfit colors are a second group, shown only for outfit objects. Legacy colors are a third group, collapsed, and shown only for legacy objects.
  - **Swatches** are 44×44 buttons. Each one's `aria-label` gives its name and value, for example "grass-2, #8FA56E". The current color has an ink ring and `aria-pressed="true"`.
  - **Usage meter.** "Colors used: 7 of 12" sits under the swatches. It turns to the warning style at 9 and above, past the 6–8 target. At 12, any swatch not already in use is disabled.
- **Layers panel:**
  - A list of layers, bottom to top. Each row has a visibility toggle (editor only, never exported), its class (for example `cbob`), and Raise, Lower, Duplicate and Delete actions.
  - Painting always goes to the selected layer.
- **Frames panel:**
  - Shown when the layer has a loop. A strip of frame thumbnails, numbered `w0`, `w1` and so on, with add, duplicate, delete and reorder actions.
  - Step-back, play and step-forward buttons. Play runs at the loop's CSS timing. Under `prefers-reduced-motion: reduce` it doesn't start by itself, and only stepping is offered until you press play.
- **Object panel:**
  - Name, kind, anchor, and size (W × H, with the caps shown next to it).
  - For an outfit, it shows "Extends character". Rows this outfit overrides are marked in a gutter beside the stage. Painting on a row that isn't overridden yet adds an override for that row.
- **Preview:** the object at 1× and 2×, standing on one 32×16 tile over `.isogrid`. That's how you check the design at the size it ships.

#### D9.6 Dialogs and messages

- **Export** (`<dialog>`, opened from the lab bar):
  - **Header:** the target path, for example `src/assets/pixel-art/source/objects/tree.mjs`.
  - **Body:** the canonical source in a read-only monospace box (R9).
  - **Buttons:** **Copy source** (`navigator.clipboard.writeText`), **Download .mjs** (a Blob link) and **Close**.
  - **Next step:** "Commit it, then run `npm run art`."
  - **Problems:** if the document has validation problems (R30), the dialog lists them instead and both export buttons are disabled. Every exported file therefore compiles.
- **New scene / New object** (`<dialog>`):
  - **Name:** lowercase kebab-case, checked against existing names as you type.
  - **For an object:** its kind (sprite or block), its size, and whether it extends `character`. That last option makes it an outfit.
- **Problems.** The status bar's problems count (`!`) opens a popover. It lists each problem with its location (R30), and choosing one moves the stage cursor there.
- **Draft banner.** Shown under the lab bar when the open draft started from an older site version: "This draft started from an older version of `tree` on the site." [Keep draft] [Load site version].
- **Empty states:**
  - **Empty scene:** "Add an object from the Library."
  - **No search results:** "No objects match '<query>'."
  - **Storage unavailable:** the lab bar's status reads "Drafts off: this browser isn't saving them".

#### D9.7 Keyboard

Shortcuts work only while focus is on the stage, so they never interfere with typing in a field.

| Keys | Scene mode | Object mode |
| --- | --- | --- |
| Arrows | Move the selected item one tile, or the cursor if nothing is selected | Move the pixel cursor |
| Shift + arrows | Nudge the selected item one pixel | Move the cursor 8 pixels |
| Space | Hold to pan | Apply the current tool at the cursor |
| Enter | Place the Library's current object at the cursor | Apply the current tool at the cursor |
| Page Up / Page Down | Raise or lower the level | Previous or next frame |
| `[` / `]` | Paint order back or forward | Previous or next layer |
| Delete | Remove the selected item | Erase at the cursor |
| Escape | Deselect | Cancel the current stroke |
| V A H / B E G I | Tools | Tools |
| 0, 1–4 | Fit, or zoom 1×–4× | Fit, or zoom 4×, 8×, 12×, 16× |
| Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z | Undo, redo | Undo, redo |

- **Undo** keeps at most 200 steps. A pencil stroke counts as one step.
- **Announcements.** Every action is announced in the status bar's polite live region, for example "Tree moved to column 3, row 4" or "Painted 6 pixels grass-2".
- **Tab order:** lab bar, toolbar, stage, status bar, Library, then Inspector. On small screens, the tabs come in place of the side columns. The toolbar is one `role="toolbar"` tab stop with arrow-key movement inside it. The stage is a focusable group labeled "Scene stage" or "Object stage", described by the status bar.
- **Focus ring.** The site's focus ring (`base.css`) is extended to the stage, swatches, list rows and tabs.

#### D9.8 Visual style

It uses the site's own look, from tokens only. The lab should feel like a room in the same house, not a different app.

| Element | Style |
| --- | --- |
| Page ground | `--color-page`, with the workspace columns on `--color-surface` cards (`--radius-card`, 1px `--color-border`) |
| Region headings (LIBRARY, ITEMS, PALETTE…) | `.label` style: `--font-pixel`, uppercase, `--color-ink-muted` |
| Body text and fields | `--font-text`, `--color-ink` |
| Stage frame | `--color-card` with `.isogrid`, `--radius-stage`, like the Range stage |
| Tool buttons | 44×44 pixel icons drawn on a 9×9 grid, in the same style as the Range chevrons. Idle: no background. Current: `--color-ink` background, `--color-page` icon, `--shadow-pixel`, like the Range nameplate |
| Export | `.btn .btn--primary` |
| Secondary actions | `.btn .btn--ghost` |
| Selection and the current swatch | 1px `--color-accent` outline on the stage; 2px `--color-ink` ring on swatches |
| Warnings (the color meter, problems) | `--color-ink` text on `--color-gold`, never color alone. The `!` glyph and the count always show |

There's no motion beyond frame playback: no panel transitions and no animated selection outline. Every number shown on screen (cursor position, sizes, color counts) uses `font-variant-numeric: tabular-nums` so it doesn't jitter.

#### D9.9 Drafts and export plumbing

- **Drafts** (R20). Each edited scene or object is saved in `localStorage` under `pixel-lab:<kind>:<name>`, together with a hash of the site version it started from. Every storage access is wrapped in try/catch, and the editor works without storage, for example in private browsing.
- **Export** uses `serialize.mjs` (R9). A new document's name is checked against existing names, in lowercase kebab-case.

### D10. Budgets and weight

| Item | Budget | How it's checked |
| --- | --- | --- |
| `hero-island.svg` | ≤ today's size (83.5 KB raw); always ≤ 100 KB raw / 25 KB gzip | `npm run art` report |
| `range-sprite.svg` | ≤ today's size (32.6 KB raw); same hard limits | `npm run art` report |
| Home page | Unchanged from today's build, and within redesign §12 | Compare `dist/index.html` and its bundles before and after |
| Other pages | No editor JS, CSS or data | Grep `dist/` for the editor bundle name; only `lab/pixel-art/index.html` references it |
| Editor JS | ≤ 30 KB gzip, engine included | Measured from `dist/` |
| Editor data | Reported in the PR, no fixed budget | The island base map dominates. Expected to be a few KB gzip |

### D11. Docs

- **README:** the layout table rows for `src/assets/pixel-art/`, `scripts/optimize-pixel-art.mjs` and the new folders. Add a "Pixel art" section covering the formats (D2–D5), the editor URL and the "export → commit → `npm run art`" loop.
- **`CLAUDE.md`:** the Conventions line becomes "Edit pixel art only in `src/assets/pixel-art/source/**/*.mjs` (or on the editor page), then run `npm run art`. Never hand-edit the generated SVGs." Add the editor to Commands and the Architecture paragraph. Add a Conventions note that `src/styles/lab.css` is imported by the editor page only, an approved exception to the `global.css` cascade (A5). Add one Conventions line for the design language: "New pixel art uses the world palette, the 32×16 tile, the light direction and the size caps (pixel-art engine spec R26–R28). Check it with `npm run art -- --preview <name>`."
- **`CLAUDE.md` also gains:** `npm run e2e` under Commands; a "Verifying your work" line saying browser checks must show `# fail 0`, and that a "NOT RUN" result counts as not verified; and a step 5 under "How changes flow": an independent verifier session checks each PR with the `verify-change` skill and reports as a PR comment.
- **README:** a "Skills" line in the layout table pointing at `.claude/skills/`.
- **Code comments** that mention `source/*.src.svg` are updated. The redesign's `spec.md` and `plan.md` keep their wording, since `CLAUDE.md` says not to rewrite them. Their §8 describes how the art was first extracted, which is still true.

### D12. Verification

| Acceptance criterion | Check |
| --- | --- |
| `npm run art` builds every scene, lossless | Run it. Every file reports `lossless` and none `OVER BUDGET`. Paste the output |
| Range variants pixel for pixel | `pixel-art-roundtrip.test.mjs` (R10) |
| Hero island pixel for pixel | `pixel-art-roundtrip.test.mjs` (R11). Playwright screenshots of `/` at 1440px before and after, compared pixel by pixel with animations paused |
| Each outfit is its own object | Six `outfit-*.mjs` files, each `extends: 'character'` |
| New object needs only a file | The library objects in R13 are data only. The demo scene places each one |
| Security and governance outfit | Compiles in `outfit-preview`, is within budget, and has a preview PNG at 1×–4× in its PR |
| Prop on `.isogrid` without misaligned edges | Block tests (D8), plus a screenshot of `library-demo` in the editor at 1×, 2× and 3× over `.isogrid` |
| Frame loops and reduced motion | Group classes checked in tests. Playwright with `reducedMotion: 'reduce'` on `/` and `/lab/pixel-art/`: `document.getAnimations().length === 0` and frame 0 shows |
| Editor round trip | Playwright: open `library-demo`, add, move and remove an item, paint pixels on a copy of `tree`, export both. Write the exports into a temp copy of `source/`, compile, and compare the pixels to the editor canvas's `getImageData` at 1× |
| Editor at 1440 and 390, no dragging, unlisted, noindex | Screenshots at both widths. `scrollWidth <= innerWidth` from 320px up. A keyboard-only Playwright run of the round trip above. Grep `dist/` for links to `/lab/`: none outside the page itself. The robots meta is present. Lighthouse accessibility = 100 |
| Design language | Engine tests for each cap and tier (D8). The world palette's swatch sheet preview in its PR. The library objects and the new outfit pass validation with no legacy colors |
| Previews | `npm run art -- --preview tree` writes four PNGs to `.art-preview/`, and they are git-ignored |
| Editor layout | Screenshots of Scene and Object mode at 1440px and 390px, compared against the D9.3 wireframes |
| Pixel-art skill eval | R37, run once at the end of slice 6 (D18) |
| Independent reports and traceability | A verifier comment on every PR in this change (D16). The verifier's traceability check finds no requirement without evidence (D15) |
| Tests, build, no dependencies | `npm test` shows `# fail 0`. `npm run build` ends with 0 errors, warnings and hints. `package.json` and the lockfile have no new entries |
| README documents it | Review D11 |

### D13. Delivery slices

Each slice is one PR. Each one leaves the site deployable and looking exactly as it does today. Every slice ends with the implementer's own levels L1–L6 passing, then an independent verifier report (D14, D16).

0. **Verification tooling:** the `verify-change` skill, the `scripts/e2e/` harness with `art.e2e.mjs` (it already works on today's art), `npm run e2e`, and the `.gitignore` entries. This slice is verified with its own skill, as the skill's first run.

1. **Engine and Range round trip:** the first version of the `pixel-art` skill (its headless path), the `--new`, `--check` and `--preview` commands, the palette tiers with today's colors as legacy, object and scene formats (sprite kind only), validation with the design-language caps (R26–R30), the compiler step, the serializer, PNG previews, the importer, the fixtures moved, the Range sprite rebuilt from source, tests, and docs for what exists so far.
2. **Hero island round trip:** the island imported and rebuilt from source, with before and after screenshots.
3. **World palette and library:** the first 32 world colors (R31) with a swatch sheet, then the `block` kind, the `block`, `tile`, `water` and `tree` objects in world colors only, and the `library-demo` scene.
4. **Security and governance outfit:** the outfit object, `outfit-preview` and the preview images.
5. **Editor, scene mode:** the page, `noindex`, data embedding, stage, library, item list, keyboard model, export and drafts.
6. **Editor, object mode:** painting tools, layers, frames, variants, the full browser round trip, the editor section of the `pixel-art` skill, and the skill eval (R37).

Slices 1 and 2 can merge into one PR if you'd rather review the round trip once. Slices 3 and 4 can run alongside 5.

### D14. Verification levels

Each level says who runs it. The implementer covers L1–L6 in its own session before asking for verification. The verifier then repeats L1, re-runs L6, and adds L7. The owner closes with L8.

| Level | What | Who | Where it lives | Slices |
| --- | --- | --- | --- | --- |
| **L1 Gates** | `npm test`, `npm run build`, `npm run art` (every file `lossless`, none `OVER BUDGET`), no new entries in `package.json` or the lockfile | Implementer; verifier re-runs | `CLAUDE.md` "Verifying your work" | All |
| **L2 Unit** | Tests written before the code, named by requirement ID | Implementer | `scripts/pixel-art-engine.test.mjs` | All |
| **L3 Exact rebuild** | Fixture comparisons (R10, R11), the staleness check, and two builds giving byte-identical output | Implementer | `scripts/pixel-art-roundtrip.test.mjs` | 1, 2, then every slice |
| **L4 Randomized** | Seeded, repeatable random inputs (a small generator, Node built-ins only): save and reload give the same bytes; random block sizes tile with no gaps or overlaps; random invalid inputs each fail with their exact error | Implementer | `scripts/pixel-art-engine.test.mjs`, seed printed on failure | 1, 3 |
| **L5 Visual** | Compiled art rendered in the browser against its fixture; PNG previews; screenshots at 1440px and 390px | Implementer captures; verifier compares | `scripts/e2e/art.e2e.mjs`, `.art-preview/` | 2–6 |
| **L6 Browser end to end** | Editor flows, done with the pointer and again keyboard-only; widths 320, 390 and 1440 with no horizontal scroll; reduced motion; storage turned off; the `noindex` meta | Implementer writes; verifier runs and adds its own | `scripts/e2e/editor.e2e.mjs` | 5, 6 |
| **L7 Independent** | A fresh, report-only session: traceability, test-strength (mutation) checks, attempts to break it, and the diff against the plan | Verifier | `verify-change` skill, PR comment | All |
| **L8 Owner** | Using the editor and judging how the art looks. Merging | Owner | Merging the PR | All; essential for 4–6 |

The implementer doesn't tick acceptance criteria. Its report says what it ran and what it saw. The verifier's report says whether the spec is met.

### D15. Traceability

Every requirement, with the levels that cover it and where the evidence lives. Tests are named `R<n>: …`, so `grep -r "R27:" scripts/` finds them. The verifier checks this table against the tests at the start of every run (R34).

| Req | Levels | Evidence |
| --- | --- | --- |
| R1 Objects | L2 | Engine tests load and validate objects |
| R2 Outfits are objects | L2, L3 | Six `outfit-*.mjs` files that extend `character`; Range round trip |
| R3 Scenes | L2 | Scene tests: order, groups, classes, placement |
| R4 Extensible library | L2, L7 | `library-demo` places every library object; the verifier adds a throwaway object in its working copy and places it |
| R5 Frames and classes | L2, L6 | Group class tests; reduced-motion browser check |
| R6 Named palette | L2 | Palette tests |
| R7 Compiler | L1 | `npm run art` output |
| R8 Deterministic | L3 | Two builds byte-identical; staleness test |
| R9 Canonical format | L2, L4 | Serializer round trip on every committed source and on random objects |
| R10 Range sprite | L3 | Round-trip test, per fill group |
| R11 Hero island | L3, L5 | Round-trip test (visible image); `art.e2e.mjs` browser render comparison |
| R12 Source of truth | L7 | Fixtures moved; no `.src.svg` read by `npm run art`; docs updated |
| R13 Library objects | L2, L5 | Block tests; previews |
| R14 Security outfit | L5, L8 | Preview at 1×–4×; owner's review |
| R15 Route, unlisted | L6 | Robots meta present; no link to `/lab/` anywhere else in `dist/` |
| R16 Scene editing | L6 | Editor flow: add, move, change level and order, remove |
| R17 Object painting | L6 | Editor flow: pencil, eraser, fill, picker, layers, frames, undo and redo |
| R18 Same render | L6 | Export → compile → compare with the canvas's `getImageData` |
| R19 Export | L6 | Clipboard text and download file both equal `serialize()` output |
| R20 Drafts | L6 | Reload keeps the draft; the stale-draft banner; storage-off mode |
| R21 No dragging | L6 | Keyboard-only run of every flow; tap-tap placement |
| R22 Responsive | L6 | `scrollWidth <= innerWidth` at 320, 390 and 1440 |
| R23 No dependencies | L1 | `package.json` and lockfile diff |
| R24 Budgets | L1, L6 | `npm run art` report; the editor bundle is referenced only by `lab/pixel-art/index.html` |
| R25 Docs | L7 | The verifier reads the README and `CLAUDE.md` changes against D11 |
| R26 Palette tiers | L2 | Tier, cap and uniqueness tests |
| R27 Size caps | L2, L4 | Cap tests; random oversize inputs |
| R28 Light direction | L2 | Block tests check each face's shade |
| R29 Previews | L2 | PNG writer test; the `--preview` command |
| R30 Precise errors | L2, L4 | Exact-message tests; random invalid inputs |
| R31 World palette | L5, L8 | Swatch sheet; owner's review |
| R32 Pixel-art skill | L7 | Skill eval (R37); the verifier checks that each slice updated the skill |
| R33 Verify-change skill | L7 | Used on every PR from slice 0 |
| R34 Traceability | L7 | The verifier's grep finds no requirement without evidence |
| R35 Browser checks | L1, L7 | `npm run e2e` exits 2 with "NOT RUN" when Playwright is missing; the verifier checks this |
| R36 Independent verification | L7 | A report comment on every PR |
| R37 Skill eval | L7, L8 | The eval session's object, preview and validation output, from a session with no browser |
| R38 Headless toolkit | L2, L7 | CLI tests: `--new` output validates and is canonical, `--new` refuses to overwrite, `--check` exit codes and messages, `--preview` writes four PNGs. The verifier makes one small object headless, using only the commands |

### D16. Independent verifier

**Starting it.** When L1–L6 pass, the implementer asks for verification by starting a new session (for example `create_session` in Claude Code on the web). The prompt is only: "Use the `verify-change` skill on PR #<n>." It passes on none of its own notes, summaries or opinions. The owner can start one the same way.

**Inputs.** The PR head, checked out fresh; the change's `intent.md`, `spec.md` and `plan.md`; `CLAUDE.md`. Nothing from the implementer's session.

**Steps** (the skill's body):

1. **Pin the evidence.** Record the PR head commit and the spec commit the work claims to follow.
2. **Scope.** From `plan.md`, list this slice's requirements and acceptance criteria.
3. **L1 gates.** Run them and paste the exact output.
4. **Traceability (R34).** For each requirement in scope, find its `R<n>:` tests or its named check in D15. Missing evidence is a blocking finding.
5. **Test strength.** Make at least three mutations in the working copy that should turn a test red, and confirm each one does. Examples: change one pixel in a source, add a 13th color, make a row one character short, or swap two scene items. Revert each mutation, and never commit one. A test that stays green is a blocking finding.
6. **Browser checks (L5, L6)** for UI slices. Run `npm run e2e`. Take its own screenshots at 320, 390 and 1440. A "NOT RUN" result means those criteria are reported as **not verified**, never as passed.
7. **Try to break it.** Work through the slice's list from the skill, then anything else the spec suggests. For the editor: keyboard only, 320px, storage off, reduced motion, a 64×64 object at Fit, export with problems present, a stale draft, and very long names.
8. **Against the plan.** Look for files changed outside the plan, departures not recorded in `plan.md`, and spec text the code contradicts.
9. **Report.** Post one PR comment in the format below, then stop.

**Rules:**
- Recommend only. The verifier never pushes, never commits and never edits committed files. Suggested tests or fixes go in the comment as code blocks.
- When the spec's meaning is unclear, that goes under "Spec gaps" for the owner. The verifier doesn't pick a reading.
- A re-check after fixes covers only the failed items and the L1 gates. It's posted as a new comment that links the previous one.
- The comment ends with the Claude Code attribution footer.

**Report format** (one PR comment):

```markdown
## Verification: <PR title>
Independent, report-only. PR head <sha> · spec <sha> · slice <n>.
**Result: PASS | FAIL** (<n> blocking, <n> suggestions, <n> not verified)

### Gates (L1)
<exact output of npm test, npm run build, npm run art; dependency diff>

### Acceptance criteria
| Criterion | Result | Evidence |

### Requirements in scope
| Req | Result | Evidence |

### Test strength
| Mutation | Expected | Result |

### Attempts to break it
<what was tried, what happened>

### Recommendations
1. **Blocking:** …
2. **Suggestion:** …

### Spec gaps
<questions for the owner, or "None">
```

### D17. Browser checks

- **`npm run e2e`** runs `node scripts/e2e/run.mjs`. It's a `scripts` entry in `package.json`, not a dependency.
- **Finding Playwright.** `run.mjs` first tries `import('playwright')`. If that fails, it resolves Playwright from the global install (`npm root -g`), and it uses the environment's Chromium (`PLAYWRIGHT_BROWSERS_PATH`). If neither works, it prints "Playwright not found: browser checks NOT RUN" and exits 2.
- **What it serves.** It serves the existing `dist/` with `astro preview` on a free port (it doesn't build; run `npm run build` first), runs the suites with `node --test` so the output matches `npm test` (`# fail 0`), then stops the server.
- **`art.e2e.mjs`.** It renders each fixture SVG and its compiled SVG in the same page at 1×, with animations paused and frame 0 showing, and compares `getImageData` pixel by pixel. That makes the "looks identical" check exact, with no committed baseline images.
- **`editor.e2e.mjs`.** It holds the flows in D15 for R15–R22, each run once with the pointer and once keyboard-only. It finds controls only by their accessible names and roles, never by pixel coordinates.
- **Output.** Screenshots go to `.e2e-output/`, which is git-ignored.

### D18. Agent skills

Both skills follow the repo's existing skill format (YAML front matter with `name` and `description`, then steps). They're plain Markdown, so any agent that can read files can follow them.

**`pixel-art`.** It triggers when someone asks to make, change or review pixel art, an outfit, a library object or a scene, or to use the lab. The body covers:
- **The design language,** as hard rules: the 32×16 tile, 16px levels, palette tiers and caps, light direction, and the object and character size limits.
- **Formats** for objects (`sprite`, `block`), layers, frames, `extends`, scenes and placements, each with a minimal example that compiles.
- **The main path, headless.** No editor and no browser:
  1. **Start from a valid file:** `npm run art -- --new object <name>` (or `scene`), or open an existing source. Choose the smallest object that does the job, and prefer placing objects and blocks in a scene over drawing large maps.
  2. **Edit whole rows** and keep their widths.
  3. **Check it:** `npm run art -- --check <name>`. Fix each problem by the file, row and column it names.
  4. **Look at it:** `npm run art -- --preview <name>`, then **open the PNG**. The picture, not the text, decides whether the art is right.
  5. **Generate the output:** `npm run art` writes the SVGs, then `npm test`. Never write or edit an output SVG by hand.
- **The editor (optional).** Use it when a person wants to work visually, or to check that the editor shows the same thing. Open `/lab/pixel-art/` (or the dev server), drive it through accessible names and the keyboard map (D9.7), export, and save the file at the path the Export dialog shows.
- **Pitfalls:** `.` is transparent; keys are case-sensitive; long runs of one character are easy to miscount, so count against the preview, not the text; legacy colors are off-limits for new art.
- **Before opening a PR:** previews attached, caps and tiers pass, no legacy colors, light direction checked, the art is generic and public-safe (`CLAUDE.md`), and the skill itself updated if the formats changed.

**`verify-change`.** It triggers on "verify PR #n" or "use verify-change". The body is D16's inputs, steps, rules and report format, written for any change rather than this one. A change's own "try to break it" list comes from its spec. For this change, that's D16 step 7.

**Skill eval (R37).** Once, at the end of slice 6, a fresh session with no browser available receives only "Use the `pixel-art` skill to add a small rock to the library and place it in `library-demo`." The run passes if:
- the new object validates;
- it stays within the caps and uses world colors only;
- its preview PNG is posted for the owner, and the owner accepts it.

The transcript's mistakes feed back into the skill before the change closes.

## Areas of concern

### A1. "Pixel-exact" for the island means the visible image

The extracted island's static layer paints 1,492 pixels more than once, and 1,411 of those repaints are in a different color. Those hidden pixels can't be seen today, but the redesign's lossless check counts them, because it compares every fill group. The engine stores what's visible, so the per-fill-group check can't hold for the island. **R11** therefore compares each layer's visible image. The Range sprite has no hidden pixels, so **R10** keeps the stricter test. The island's rendered output is unchanged, and the file gets slightly smaller.

**Resolved (owner, 2026-10-02):** Accepted. For the island, "pixel for pixel" means each layer's visible image. The Range sprite keeps the per-fill-group check.

### A2. The island moves in as one large map

The extracted art is grouped by color, not by thing. Trees, roofs and the ground are mixed together in each color group, so the importer can't split the island into library objects. "Moved into the engine" therefore starts as `island-base`, one pixel map of up to 225×212, plus the animated pieces as their own objects. Breaking the base into blocks, water and trees is manual editor work afterwards. Each piece should be a visible no-op, or a deliberate change reviewed on its own.

**Resolved (owner, 2026-10-02):** Accepted. The island ends this change as `island-base` plus its animated pieces. Splitting it into library objects is later work.

### A3. Unlisted isn't private

Anyone with `/lab/pixel-art/` can open the editor, and the repo is public, so the URL is easy to find. `noindex` keeps it out of search results, but it doesn't keep anyone out. The page shows only art and sources already in the public repo, sends nothing anywhere, and drafts stay in the visitor's own browser, so there's nothing sensitive to expose.

**Resolved (owner, 2026-10-02):** Accepted. The editor is public but unlisted.

### A4. Accessibility of a pixel painter

R21 and D9 cover the WCAG requirements: a keyboard path for everything, no required dragging, labeled controls, 44px buttons, the focus ring, live announcements and reduced motion. Even so, painting pixels is visual work, so the canvas's accessible model is the item list and the cursor announcements, not a description of the image. On a 390px phone, the stage zoom limits precise painting. The page works there, but it's best for scene layout and review, and detailed painting is best on a desktop.

**Resolved (owner, 2026-10-02):** Accepted. Phones are for scene layout and review, and detailed painting is for desktops.

### A5. Editor CSS outside `global.css`

`CLAUDE.md` says the import order in `global.css` is the cascade order, which implies every stylesheet goes through `global.css`. Doing that with `lab.css` would ship the editor's styles to every page, against R24 and redesign §12's 8 KB CSS budget. D9 imports `lab.css` from the editor page only. It's still one CSS file per area, it's still built from tokens, and it loads after `global.css`.

**Resolved (owner, 2026-10-02):** Accepted. `lab.css` loads only on the editor page. D11's `CLAUDE.md` changes include a note on this exception.

### A6. Drafts can drift from the repo

A draft in `localStorage` can be older than what's deployed, for example after you commit a change from another device. D9 stores the site version a draft started from, and it warns before mixing them. It can't merge them.

**Resolved (owner, 2026-10-02):** Accepted. "Keep draft" or "Load site version" is the only choice for now.

### A7. One-time byte churn in committed art

Slices 1 and 2 rewrite `hero-island.svg` and `range-sprite.svg` with no visible change (D7). The diffs are large and can't be read. The proof is the round-trip tests and screenshots, not the diff.

**Resolved (owner, 2026-10-02):** Accepted. Reviewers check the round-trip tests and the browser pixel comparison, not the SVG diff.

### A8. Two palettes side by side

New art must use the 32 world colors, but the hero island and the five outfits keep their 81 legacy colors, because the exact rebuild (R10, R11) needs them. Until legacy art is moved to world colors, new pieces placed next to old ones can differ slightly in shade, for example a world `grass-2` tile beside an island grass that was one of 11 near-identical greens. R31 limits this by picking world colors from the island's own shades.

**Resolved (owner, 2026-10-02):** Accepted. Moving legacy art to world colors is later work, done one object at a time.

### A9. Wireframes are a starting point

D9.3's wireframes fix the regions, their order and the breakpoints. They don't fix exact spacing or icon drawings. Those are settled in the editor PRs against screenshots. A change that moves a region, or drops one at a breakpoint, comes back to this spec first.

**Resolved (owner, 2026-10-02):** Accepted. Regions, order and breakpoints are fixed. Spacing and icons are settled against screenshots.

### A10. Browser checks depend on the environment

Using the environment's Playwright keeps it out of the dependencies (Decision #11), but the checks then only run where Playwright is installed. That's true in cloud sessions. On your own machine it means a global `npm install -g playwright`, which is outside the repo. Global versions also drift, so the scripts use only Playwright's long-stable core API: launching, pages, keyboard, `evaluate` and screenshots. A missing Playwright gives "NOT RUN" and exit code 2, never a pass.

**Resolved (owner, 2026-10-02):** Accepted. Browser checks are verified in cloud sessions, or locally after a global install.

### A11. The verifier costs a session per PR

That's seven slices and at least seven verifier sessions, plus re-checks. Depth scales with risk: slices 0–4 are mostly gates, traceability and mutation checks, and slices 5–6 get the full browser and try-to-break pass. Disagreements about what the spec means don't loop between the two sessions. They go to you as spec gaps.

**Resolved (owner, 2026-10-02):** Accepted. Every slice gets a verifier, lighter on 0–4 and full on 5–6.

### A12. Part of the skill eval is taste

Validation, caps and tiers are objective. "Looks right" isn't, so R37 ends with your judgment of the preview. A failed eval improves the skill. It doesn't block the engine.

**Resolved (owner, 2026-10-02):** Accepted. The eval's look is the owner's call, and a failed eval improves the skill without blocking the engine.

No two standards contradict each other outright. A5 is the closest, and the owner resolved it in favor of the performance budget. All twelve concerns were resolved on 2026-10-02.

## Open questions

Intent decisions 1–13 are all answered in the intent and adopted here as written. Everything this change leaves for later is collected in the [follow-ups intent](../2026-10-pixel-art-follow-ups/intent.md): moving legacy art to world colors (A8), splitting the island (A2), opening files in the editor (Q2), draft diffs (A6), the sixth class going live (Decision #5) and palette swaps (Decision #7). Decision #5 (the sixth class going live) is still a separate follow-up, and #7 (palette swaps) is still no.

| # | Question | Answer |
| --- | --- | --- |
| Q1 | ~~Tile size in art pixels.~~ | **Closed:** 32×16, with a 16-pixel level, measured from the island's grass grid (D4, R27). |
| Q2 | **Opening a downloaded file in the editor.** Deferred to the [follow-ups intent](../2026-10-pixel-art-follow-ups/intent.md). Sources are `.mjs`, so opening one means running it as code. | Not in this change. The library comes from the deployed site and work in progress lives in drafts. If you need it later, accept only the canonical format and parse it as data, never `import()` it. **Adopted** (owner, 2026-10-02). |
| Q3 | **Palette names** for the 81 extracted colors. | The importer names them `c-<hex>` in the legacy tier. Rename them as they're touched, which changes no output. **Adopted** (owner, 2026-10-02). |
| Q4 | **Editor URL.** | `/lab/pixel-art/`, which leaves room for other tools under `/lab/`. Post URLs have at least four segments (`[category/]YYYY/MM/DD/slug`), so it can't collide with one. **Adopted** (owner, 2026-10-02). |
| Q5 | **Outfit inheritance fit.** If the five extracted outfits share little of their base, `character` plus row overrides gives little saving. | Factor what's shared in slice 1. If an outfit overrides most rows, that's still valid. The format doesn't change. **Adopted** (owner, 2026-10-02). |
| Q6 | **Outfit colors.** The five outfits already use 51 distinct colors between them, 41 of which the Range island doesn't use, all legacy. The new outfit can use at most 16 outfit colors on top of the world palette. | The Security and governance outfit uses world colors plus at most 4 new outfit colors (for example a steel-blue ramp). The remaining 12 are left for later outfits. **Adopted** (owner, 2026-10-02). |
