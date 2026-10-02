# Spec: Isometric pixel-art engine (from intent.md 2026-10-01, amended 2026-10-02)
Status: draft.

| | |
| --- | --- |
| **Intent** | [`intent.md`](intent.md) |
| **Builds on** | [Redesign spec](../2026-10-redesign/spec.md) §8 (pipeline), §11 (responsive), §12 (budgets) and §13 (verification) |
| **Plan** | `plan.md`, written after this spec is approved |

This spec turns the intent into buildable detail. The intent says *what* and *why*, and this says *how*. If the two disagree, the intent wins and this spec gets fixed.

## Requirements

Each requirement traces to the intent's Scope (S*n*) or Acceptance criteria (AC).

### Engine and sources

- **R1. Objects.** Every reusable piece of art is an object: a `.mjs` file under `src/assets/pixel-art/source/objects/` whose default export is plain data (S1).
- **R2. Each outfit is its own object.** The five current Range outfits and the new one each live in their own file. Outfits share a base character object and override it (S1, AC).
- **R3. Scenes.** A scene is a `.mjs` file under `source/scenes/` that places objects on the isometric grid or at pixel offsets, in paint order. Each shipped SVG is built from exactly one scene (S2).
- **R4. Extensible library.** Adding a new object (a block, water, a tree) needs only a new file under `objects/`, and any scene can place it. Only a new *kind* of object (see [D3](#d3-object-kinds)) needs engine code (S3, AC).
- **R5. Frames and classes.** An object layer can declare a frame loop that compiles to the `class="<loop> <prefix>N"` groups that `pixel-art.css` animates (`wf w0..4`, `ff f0..3`, `hf h0..5`). Layers and placements can also carry fixed classes (`cbob`, `itruck it1`, `pcloud pc0`). No CSS changes (S4, AC).
- **R6. Named palette.** Objects name their colors from one shared palette module. Brand colors use their `variables.css` token names and values, and a test keeps the two in step (intent constraint).
- **R7. Compiler.** `npm run art` compiles every scene, runs the existing optimizer and its lossless check, enforces the budget, and writes `src/assets/pixel-art/<name>.svg` for each scene that ships (S5, AC).
- **R8. Deterministic.** The same sources always give byte-identical output. `npm test` fails if a committed SVG is stale against its sources (intent constraint).
- **R9. Canonical format.** Every committed source is in the editor's canonical format: re-serializing it gives the same bytes. Hand edits and editor exports therefore give small, comparable diffs (supports S8).

### Round trip

- **R10. Range sprite.** The compiled `range-sprite.svg` has the same layer structure as the extracted sprite (base island, `data-class="0..4"` groups, each with its `cbob` group, in the same order). Every fill group in every layer covers exactly the same pixels (S6, AC).
- **R11. Hero island.** The compiled `hero-island.svg` has the same animation groups, in the same order, as the extracted island. Each layer's **visible image** (the top-most color at every pixel) is identical. See [concern A1](#a1-pixel-exact-for-the-island-means-the-visible-image) for why this differs from R10 (S6, S7, AC).
- **R12. Source of truth.** After R10 and R11 pass, the engine sources are the source of truth for both pieces of art. The extracted SVGs move to test fixtures and stay there (Decision #3).

### New art

- **R13. Library objects.** The library includes at least a block, a flat tile, a water block (with a frame loop) and a tree, plus a demo scene built only from them (S3, AC).
- **R14. Security and governance outfit.** A sixth outfit object, made with the engine and placed in a preview scene. It's **not** added to `range-sprite.svg` or the carousel (S10, Decision #5).

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

## Design

### D1. Files

```
src/assets/pixel-art/
  hero-island.svg                 generated, committed (name unchanged)
  range-sprite.svg                generated, committed (name unchanged)
  source/
    palette.mjs                   named colors
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
```

The engine is plain ES modules with JSDoc types and `// @ts-check`, not TypeScript. `node scripts/…` imports it without a build step (the repo supports Node ≥ 22.12, which doesn't strip types by default), and Astro bundles the same files into the editor. The engine uses no Node or DOM APIs, so it runs unchanged in both.

### D2. Palette

`source/palette.mjs` exports a flat map from color name to `#RRGGBB`:

```js
export default {
  ink: '#2E2418',      // --color-ink
  earth: '#5A3E2B',    // --color-earth
  gold: '#D8B66A',     // --color-gold
  accent: '#3F6B45',   // --color-accent
  page: '#F4EDE0',     // --color-page
  // …
  'moss-1': '#7E9A60',
  'moss-2': '#8FA56E',
};
```

- Brand colors take their token names. A test parses `src/styles/variables.css` and checks that each token-named entry has the token's value.
- The importer gives every other extracted color a name like `c-7e9a60`. Names are cosmetic, so renaming one later (for example to `moss-1`) changes no output.
- Uppercase hex only, no alpha. Transparent is the absence of a pixel, never a color.
- 81 colors exist today across both pieces of art. New ones are added by hand, never by the editor on its own (see R17: the editor paints only from the palette).

### D3. Object kinds

An object's `kind` picks how the engine draws it. There are two kinds:

**`sprite`**: pixel maps. It covers outfits, trees, trucks, clouds and the imported island maps.

```js
// source/objects/tree.mjs
export default {
  kind: 'sprite',
  anchor: [5, 13],              // the map pixel that sits on the placement point
  keys: { L: 'moss-1', D: 'moss-3', T: 'earth' },   // '.' is always transparent
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

- **Keys** are single printable characters other than space and `.`, which gives about 90 per object. That's enough for the island base's ~40 colors.
- **Layers** paint bottom to top. A layer can carry `class: 'cbob'`, and it compiles to its own group so CSS can move it.
- **Frames:** `{ loop: 'wf', prefix: 'w', frames: [map, map, …] }` compiles to groups `class="wf w0"`, `class="wf w1"` and so on, in order. Frame 0 is the static frame that reduced motion shows, which matches today's CSS.
- **Inheritance**, the mock's `BASE` and `CL` model: an object can have `extends: 'character'` and then give `rows: { <layer>: { <rowIndex>: '<row>' } }` and `keys` overrides. Every outfit extends `character`. Whole rows are replaced, so an outfit's diff shows exactly which rows it changes.

**`block`**: procedural boxes on the isometric grid. They cover blocks, flat tiles and water.

```js
// source/objects/water.mjs
export default {
  kind: 'block',
  size: [1, 1, 0],              // tiles wide, tiles deep, levels high (0 = flat tile)
  faces: { top: 'water-1', left: 'water-2', right: 'water-3', edge: 'water-4' },
  surface: { loop: 'wf', prefix: 'w', frames: [ /* top-face sprite maps */ ] },  // optional
};
```

- It draws the top, left and right faces in their three tones, with an optional 1px edge, on the 2:1 grid in [D4](#d4-isometric-grid).
- An optional `surface` sprite, which can have frames, is laid over the top face. That's how water ripples or grass detail work.

New objects of either kind are data only (R4). A third kind, such as slopes, means engine code and its own tests, and is added only when an asset needs it (Decision #6).

### D4. Isometric grid

- 2:1 dimetric, matching `.isogrid` (lines at ±26.57°). Every edge steps 2 pixels across for 1 down, so lines stay clean at every integer zoom.
- A tile at `[col, row, level]` has its top-face center at `x = (col − row) × W/2` and `y = (col + row) × W/4 − level × Hz`. `W` is the tile width in art pixels and `Hz` is one level's height. The scene sets both, so the two shipped scenes can use the grid their art was drawn on. See [open question Q1](#open-questions).
- A placement is either `at: { tile: [col, row, level] }` or `at: { px: [x, y] }`. The second is for imported art and fine nudges. Both resolve to whole pixels.

### D5. Scenes

```js
// source/scenes/range-sprite.mjs
export default {
  output: 'range-sprite.svg',   // omit for preview-only scenes
  viewBox: [-51, -9, 103, 72],
  grid: { tile: 16, level: 8 },
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

1. Load `palette.mjs`, every object and every scene, and validate them: unknown keys, ragged rows, missing objects, `extends` cycles, colors not in the palette, and non-integer offsets each fail with the file and row.
2. Render each scene to a tree of layers that mirrors its groups. Each layer is a map from pixel to color, where later paint wins.
3. Emit a rect SVG: in each layer, one `<g fill>` per color, in order of first paint, with one `<rect>` per horizontal run. Group attributes and order are kept.
4. Hand that SVG to the existing `optimizeSvg` and `verifyLossless` unchanged, check the budget, and write `<output>`.
5. Print each file's raw and gzip size, as today.

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
- **Palette:** token-named entries match `variables.css`.
- **Staleness:** compiling every scene with an `output` gives byte-identical files to those committed (R8).
- **Round trip:** see D7.

### D9. Editor page

**Page.** `src/pages/lab/pixel-art.astro` renders with `BaseLayout`, which gets an optional `noindex` prop that emits the robots meta (R15). The title is "Pixel-art lab". The page header uses the existing `PageHead` component (label "Lab"). No `robots.txt` entry is added, because a `Disallow` would stop crawlers from reading the `noindex` and would also publish the URL.

**Data.** At build time the page imports every source with `import.meta.glob('…/source/**/*.mjs', { eager: true })` and embeds the palette, objects and scenes as JSON in one `<script type="application/json">`. The client script parses it, so there are no fetches.

**Layout.** It follows the redesign's grid, tokens and breakpoints.

| Width | Layout |
| --- | --- |
| ≥ 960px | Three columns: **Library** (object list) · **Stage** (canvas) · **Inspector** (palette, layers, frames, variants, item properties). The toolbar sits above the stage. |
| < 960px | One column: toolbar, stage, then Library and Inspector as two tabs below. |
| < 480px | 16px gutter, as on the rest of the site. The toolbar wraps. |

The stage is a `<canvas>` inside a frame that scrolls on both axes inside itself, so a 4× zoom never scrolls the page sideways (R22). Drawing uses `imageSmoothingEnabled = false` and integer zoom only (1×, 2×, 3×, 4×, and "fit", which picks the largest integer that fits). The `.isogrid` background sits behind the canvas, so you can check alignment at each zoom (AC).

**Modes.** A toolbar switch picks **Scene** or **Object**.

- **Scene mode** (R16):
  - **Add:** drag an object from the Library onto the stage, which snaps to the tile under the pointer. Or tap an object, then tap a tile. Or focus an object and press Enter, which places it at the stage cursor.
  - **Select:** tap an item on the stage, or pick it in the **item list**. That list is a listbox of the scene's items in paint order, and it's the stage's accessible model.
  - **Move:** drag it, or use the arrow keys to move one tile (Shift+arrow moves one pixel). Page Up and Page Down change the level, `[` and `]` change the paint order, and Delete removes it. Each control also has a 44px button in the Inspector.
- **Object mode** (R17):
  - **Tools:** pencil, eraser, fill and picker. Each is a 44px toolbar button with a one-letter shortcut (B, E, G, I).
  - **Palette:** the shared palette as swatch buttons, each named in its `aria-label` (for example "moss-1, #7E9A60"). New colors aren't added in the editor (D2).
  - **Layers, frames and variants:** shown as lists, with add, duplicate, reorder and delete actions. Painting on an outfit edits its override rows. The base `character` is edited by opening it directly.
  - **Without a pointer:** arrow keys move a pixel cursor, and Space applies the current tool.
  - **Frame preview:** step buttons always. A play button runs the loop at its CSS timing, and it doesn't autoplay under `prefers-reduced-motion: reduce`.
- **Both modes:** undo and redo (Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z, plus buttons), with a history bounded at 200 steps. Every action is announced in a polite live region, for example "Tree moved to column 3, row 4".

**Export** (R19). "Copy source" uses `navigator.clipboard.writeText` and "Download .mjs" uses a Blob link. Both use `serialize.mjs`, so the file is already in canonical form (R9). The panel shows the target path, such as `src/assets/pixel-art/source/objects/tree.mjs`, and the next step: "Commit it, then run `npm run art`." A new object or scene needs a name, which is checked against existing names, in lowercase kebab-case.

**Drafts** (R20). Each edited scene or object is saved in `localStorage` under `pixel-lab:<kind>:<name>`, with a hash of the site version it started from. If the site version has changed since, the editor says so and offers "Keep draft" or "Load site version". All storage access is wrapped in try/catch, and the editor works without storage (private browsing).

**Script.** Client code lives in `src/components/lab/` as TypeScript, bundled by Astro into this page only. It imports the engine from `src/lib/pixel-art/`, never re-implements it (R18), and doesn't use `eval` or dynamic `import()` of user content.

**Styles.** Tokens only (`variables.css`): `--font-pixel` for labels, the focus ring from `base.css` (extended to the canvas and item list, which it doesn't cover today), and `--radius-*` for panels. The stage frame uses `--color-card`, like the Range stage.

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
- **`CLAUDE.md`:** the Conventions line becomes "Edit pixel art only in `src/assets/pixel-art/source/**/*.mjs` (or on the editor page), then run `npm run art`. Never hand-edit the generated SVGs." Add the editor to Commands and the Architecture paragraph.
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
| Tests, build, no dependencies | `npm test` shows `# fail 0`. `npm run build` ends with 0 errors, warnings and hints. `package.json` and the lockfile have no new entries |
| README documents it | Review D11 |

### D13. Delivery slices

Each slice is one PR. Each one leaves the site deployable and looking exactly as it does today.

1. **Engine and Range round trip:** palette, object and scene formats (sprite kind only), compiler step, serializer, importer, fixtures moved, the Range sprite rebuilt from source, tests, and docs for what exists so far.
2. **Hero island round trip:** the island imported and rebuilt from source, with before and after screenshots.
3. **Library:** the `block` kind, the `block`, `tile`, `water` and `tree` objects, and the `library-demo` scene.
4. **Security and governance outfit:** the outfit object, `outfit-preview` and the preview images.
5. **Editor, scene mode:** the page, `noindex`, data embedding, stage, library, item list, keyboard model, export and drafts.
6. **Editor, object mode:** painting tools, layers, frames, variants and the full Playwright round trip.

Slices 1 and 2 can merge into one PR if you'd rather review the round trip once. Slices 3 and 4 can run alongside 5.

## Areas of concern

### A1. "Pixel-exact" for the island means the visible image

The extracted island's static layer paints 1,492 pixels more than once, and 1,411 of those repaints are in a different color. Those hidden pixels can't be seen today, but the redesign's lossless check counts them, because it compares every fill group. The engine stores what's visible, so the per-fill-group check can't hold for the island. **R11** therefore compares each layer's visible image. The Range sprite has no hidden pixels, so **R10** keeps the stricter test. The island's rendered output is unchanged, and the file gets slightly smaller. **Owner:** confirm that "pixel for pixel" means the visible image for the island.

### A2. The island moves in as one large map

The extracted art is grouped by color, not by thing. Trees, roofs and the ground are mixed together in each color group, so the importer can't split the island into library objects. "Moved into the engine" therefore starts as `island-base`, one pixel map of up to 225×212, plus the animated pieces as their own objects. Breaking the base into blocks, water and trees is manual editor work afterwards. Each piece should be a visible no-op, or a deliberate change reviewed on its own. **Owner:** accept this as the end state of this change, with any splitting as later work.

### A3. Unlisted isn't private

Anyone with `/lab/pixel-art/` can open the editor, and the repo is public, so the URL is easy to find. `noindex` keeps it out of search results, but it doesn't keep anyone out. The page shows only art and sources already in the public repo, sends nothing anywhere, and drafts stay in the visitor's own browser, so there's nothing sensitive to expose. **Owner:** accept a public, unadvertised page. The alternative is a dev-only page, which the intent ruled out.

### A4. Accessibility of a pixel painter

R21 and D9 cover the WCAG requirements: a keyboard path for everything, no required dragging, labeled controls, 44px buttons, the focus ring, live announcements and reduced motion. Even so, painting pixels is visual work, so the canvas's accessible model is the item list and the cursor announcements, not a description of the image. On a 390px phone, the stage zoom limits precise painting. The page works there, but it's best for scene layout and review, and detailed painting is best on a desktop. **Owner:** accept that scope for small screens.

### A5. Editor CSS outside `global.css`

`CLAUDE.md` says the import order in `global.css` is the cascade order, which implies every stylesheet goes through `global.css`. Doing that with `lab.css` would ship the editor's styles to every page, against R24 and redesign §12's 8 KB CSS budget. D9 imports `lab.css` from the editor page only. It's still one CSS file per area, it's still built from tokens, and it loads after `global.css`. **Owner:** approve this exception. The alternative is putting it in `global.css` and accepting a few KB on every page.

### A6. Drafts can drift from the repo

A draft in `localStorage` can be older than what's deployed, for example after you commit a change from another device. D9 stores the site version a draft started from, and it warns before mixing them. It can't merge them. **Owner:** accept "keep draft or load site version" as the only choice for now.

### A7. One-time byte churn in committed art

Slices 1 and 2 rewrite `hero-island.svg` and `range-sprite.svg` with no visible change (D7). The diffs are large and can't be read. The proof is the round-trip tests and screenshots, not the diff.

No two standards contradict each other outright. A5 is the closest, and the spec resolves it in favor of the performance budget.

## Open questions

Intent decisions 1–10 are all answered in the intent and adopted here as written. Decision #5 (the sixth class going live) is still a separate follow-up, and #7 (palette swaps) is still no.

| # | Question | Proposal |
| --- | --- | --- |
| Q1 | **Tile size in art pixels.** The scene's `grid.tile` and `grid.level` should match the grid the island was drawn on, so new library pieces line up with it. | Measure it from the island during slice 1. Record it in `plan.md` and in the `library-demo` scene. |
| Q2 | **Opening a downloaded file in the editor.** Sources are `.mjs`, so opening one means running it as code. | Not in this change. The library comes from the deployed site and work in progress lives in drafts. If you need it later, accept only the canonical format and parse it as data, never `import()` it. |
| Q3 | **Palette names** for the 81 extracted colors. | The importer names them `c-<hex>`. Rename them as they're touched, which changes no output. |
| Q4 | **Editor URL.** | `/lab/pixel-art/`, which leaves room for other tools under `/lab/`. Post URLs have at least four segments (`[category/]YYYY/MM/DD/slug`), so it can't collide with one. |
| Q5 | **Outfit inheritance fit.** If the five extracted outfits share little of their base, `character` plus row overrides gives little saving. | Factor what's shared in slice 1. If an outfit overrides most rows, that's still valid. The format doesn't change. |
