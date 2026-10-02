# Plan: Isometric pixel-art engine (from intent.md 2026-10-01, amended 2026-10-02)

| | |
| --- | --- |
| **Status** | Approved by the owner, 2026-10-02 |
| **Intent** | [`intent.md`](intent.md) (accepted) |
| **Spec** | [`spec.md`](spec.md) (approved). Requirement IDs (R*n*), design sections (D*n*), levels (L*n*) and concerns (A*n*) below refer to it |
| **Created** | 2026-10-02 |

The engine replaces the hand-extracted art sources with text sources (objects and scenes) that compile to the same optimized SVGs. It adds an unlisted editor at `/lab/pixel-art/`, agent skills, and independent verification for each PR. Everything ships as **seven PRs, one per spec slice (0–6)**, merged in order. Each one leaves `master` deployable and the site looking exactly as it does today. The spec says *what*, and this plan says *in which order, in which files, and how each step is proved*. If they disagree, the spec wins and this plan gets fixed in the same commit.

**Departures from the spec**, approved by the owner on 2026-10-02:

1. **CI runs `npm test`.** Slice 0 adds a test step to `.github/workflows/deploy.yml`, so R8's staleness check and the round-trip tests run on every PR and push, not only when someone runs them.
2. **Slices 1 and 2 ship as separate PRs,** as the spec allows. The riskier island rebuild then gets its own verifier pass.
3. **Two more test files than D1 lists.** `scripts/pixel-art-cli.test.mjs` holds the command-line tests (R38), and `scripts/e2e-runner.test.mjs` tests the browser runner's NOT RUN path (R35). Both spawn processes in temp directories, so they're kept apart from the pure engine tests.

## Files that change

Grouped by PR. "(new)", "(moved)" and "(deleted)" are marked. Anything else is edited.

**PR 0: Verification tooling**
- `.claude/skills/verify-change/SKILL.md` (new)
- `scripts/e2e/browser.mjs` (new): finds Playwright and launches Chromium
- `scripts/e2e/run.mjs` (new): the `npm run e2e` runner
- `scripts/e2e/art.e2e.mjs` (new)
- `scripts/e2e-runner.test.mjs` (new): the NOT RUN path, in `npm test`
- `package.json`: adds an `"e2e": "node scripts/e2e/run.mjs"` script. No dependencies
- `.gitignore`: adds `.e2e-output/` and `.art-preview/`
- `.github/workflows/deploy.yml`: adds the test step (departure 1)
- `CLAUDE.md`, `README.md`

**PR 1: Engine and Range round trip**
- `src/lib/pixel-art/engine.mjs` (new): load, validate, resolve `extends`, render scenes to layer trees
- `src/lib/pixel-art/iso.mjs` (new): grid positions only. Block faces come in PR 3
- `src/lib/pixel-art/svg.mjs` (new): layer tree → rect SVG
- `src/lib/pixel-art/serialize.mjs` (new): canonical source text
- `src/assets/pixel-art/source/palette.mjs` (new): world tier with the brand entries only, outfit tier empty, legacy tier with all 81 colors
- `src/assets/pixel-art/source/objects/character.mjs` (new)
- `src/assets/pixel-art/source/objects/outfit-*.mjs` (new): five files
- `src/assets/pixel-art/source/objects/range-island.mjs` (new)
- `src/assets/pixel-art/source/scenes/range-sprite.mjs` (new)
- `scripts/fixtures/pixel-art/range-sprite.src.svg` and `hero-island.src.svg` (moved from `source/`)
- `scripts/optimize-pixel-art.mjs`: new scene-driven `main()` and command line. `optimizeSvg` and `verifyLossless` stay as they are
- `scripts/import-pixel-art.mjs` (new)
- `scripts/pixel-art-preview.mjs` (new): PNG writer
- `scripts/pixel-art-engine.test.mjs` (new)
- `scripts/pixel-art-roundtrip.test.mjs` (new)
- `scripts/pixel-art-cli.test.mjs` (new)
- `src/assets/pixel-art/range-sprite.svg`: regenerated
- `scripts/e2e/art.e2e.mjs`: fixture paths
- `.claude/skills/pixel-art/SKILL.md` (new): the headless path
- `.claude/skills/write-plan/SKILL.md`: its example mentions `range-sprite.src.svg`
- `CLAUDE.md`, `README.md`

**PR 2: Hero island round trip**
- `source/objects/island-base.mjs`, `waterfall.mjs`, `flag.mjs`, `hearth.mjs`, `truck.mjs`, `cloud-a.mjs`, `cloud-b.mjs`, `cloud-c.mjs` (new)
- `source/scenes/hero-island.mjs` (new)
- `src/assets/pixel-art/hero-island.svg`: regenerated
- `palette.mjs`: legacy names only, if the importer needs new ones
- `scripts/pixel-art-roundtrip.test.mjs`
- The `pixel-art` skill

**PR 3: World palette and library**
- `palette.mjs`: the 32 world colors (R31)
- `src/lib/pixel-art/iso.mjs`: block faces
- `src/lib/pixel-art/engine.mjs`: the `block` kind
- `source/objects/block.mjs`, `tile.mjs`, `water.mjs`, `tree.mjs` (new)
- `source/scenes/library-demo.mjs` (new)
- Tests, the `pixel-art` skill and the README

**PR 4: Security and governance outfit**
- `source/objects/outfit-security-governance.mjs` (new)
- An optional prop object (new), if the figure needs one (see risk 2)
- `palette.mjs`: at most 4 outfit colors (Q6)
- `source/scenes/outfit-preview.mjs` (new)
- Tests

**PR 5: Editor, scene mode**
- `src/layouts/BaseLayout.astro`: a `noindex` prop
- `src/pages/lab/pixel-art.astro` (new)
- `src/components/lab/` (new): `LabBar.astro`, `Toolbar.astro`, `Stage.astro`, `StatusBar.astro`, `Library.astro`, `Inspector.astro`, and client modules `lab.ts` (state and undo), `stage.ts`, `scene-mode.ts`, `keyboard.ts`, `drafts.ts`, `export.ts`
- `src/styles/lab.css` (new): imported by the page only (A5)
- `src/styles/base.css`: the focus ring on the stage, swatches, rows and tabs
- `scripts/e2e/editor.e2e.mjs` (new)
- The `pixel-art` skill's editor section, `CLAUDE.md`, `README.md`

**PR 6: Editor, object mode**
- `src/components/lab/object-mode.ts`, `palette-panel.ts`, `layers-panel.ts`, `frames-panel.ts`, `dialogs.ts` (new)
- Edits to the PR 5 components and `lab.css`
- `scripts/e2e/editor.e2e.mjs`
- The `pixel-art` skill

**This plan's Progress list** is updated in every PR.

## Order of work

### Ground rules for every PR

- **Branch** from `master` after the previous PR merges: `feat/pixel-art-<n>-<slug>`.
- **Test first.** Write each test before its code, named `R<n>: …` (R34).
- **Before asking for verification** (L1–L6, D14):
  - `npm test` shows `# fail 0`;
  - `npm run build` ends with `- 0 errors`, `- 0 warnings`, `- 0 hints` and `[build] Complete!`;
  - `npm run art` reports every file `lossless` and none `OVER BUDGET`;
  - `npm run e2e` shows `# fail 0` from PR 0 on. "NOT RUN" doesn't count;
  - `git diff master -- package.json package-lock.json` shows no new dependencies;
  - the PR's own checks below pass.

  Paste every output into the PR description.
- **Screenshots** at 1440px and 390px for any visible or UI change, plus `--preview` PNGs for new art (from PR 1 on).
- **Independent verification** (D16): once the checks pass, start a fresh session whose only prompt is "Use the `verify-change` skill on PR #<n>." Pass it no notes. Fix its blocking findings, and reply under its comment saying what changed. Its re-check covers only the failed items. The owner merges.
- **Keep the plan current.** When the work departs from this plan, update `plan.md` in the same commit. Tick the Progress list in each PR.
- **Public safety** (`CLAUDE.md`): the art and copy are generic. No names, logos or likenesses in code, art, commits or PR text. Restore `src/data/accomplishments.json` with `git checkout` if a build touched it.
- **Determinism:** no `Map` or object iteration whose order depends on insertion from unordered input. Sort explicitly with code-point comparison, never `localeCompare`. Never use `Date` or randomness in output.

### PR 0: Verification tooling (slice 0)

1. **`verify-change` skill.** Write `.claude/skills/verify-change/SKILL.md` from D16, generalized to any change under `docs/intents/`:
   - **Front matter:** `name: verify-change`, plus a `description` that triggers on "verify PR #n" or "use verify-change".
   - **Body:** the inputs, the nine steps, the rules (report only; no pushes or commits; mutations only in the working copy, then reverted; spec gaps go to the owner), and the report format with the attribution footer.
   - **"Try to break it":** comes from the change's own spec.
2. **`scripts/e2e/browser.mjs`.** `loadPlaywright()` tries `import('playwright')`. If that fails, it reads `npm root -g` (`execFileSync`) and imports `<root>/playwright/index.js` by file URL. It returns `null` if neither works. The `E2E_PLAYWRIGHT_ROOT` environment variable replaces the global root, so tests can point it at an empty directory. `launch()` uses `PLAYWRIGHT_BROWSERS_PATH`'s Chromium when it's set.
3. **`scripts/e2e/run.mjs`:**
   - If `loadPlaywright()` returns `null`: print `Playwright not found: browser checks NOT RUN` and exit 2.
   - If `dist/` is missing: print `Run npm run build first` and exit 1.
   - Otherwise:
     1. Find a free port (`net.createServer().listen(0)`).
     2. Spawn `node_modules/.bin/astro preview --ignore-lock --port <p>`, and wait for HTTP 200 on `/`. Astro 7 backgrounds `astro preview` when it detects an AI agent, and refuses to start beside a running one. `--ignore-lock` keeps the server in the foreground and owned by the runner, and leaves any server you have running alone.
     3. Run `node --test "scripts/e2e/*.e2e.mjs"` (or the files passed after `--`) with `E2E_BASE_URL` set, piping its output and returning its exit code. The glob keeps `browser.mjs` and `run.mjs` out of the run.
     4. Kill the server in `finally`.
4. **`scripts/e2e/art.e2e.mjs`.** For each pair (fixture `.src.svg` → committed `.svg`; in PR 0 the fixtures are still in `source/`), render both with `page.setContent`, then compare `getImageData` pixel by pixel:
   - **States compared:**
     - every group visible, with no CSS;
     - each `data-class="N"` alone;
     - frame 0 of each loop, with only `.w0`, `.f0`, `.h0` showing and `.it2` hidden.
   - **Render setup:** each SVG at its viewBox size × 1, on a white page.
   - **Test name:** `R11: hero island renders identically to its fixture` (and `R10:` for the sprite).

   Today this proves the redesign optimizer is lossless in the browser. From PR 1 on, it proves the round trip.
5. **CI (departure 1).** In `deploy.yml`'s build job, before `withastro/action`, add:
   - `actions/setup-node` (pinned to the current major, like the other actions), with Node 24 and `cache: npm`;
   - `npm ci`;
   - `npm test`.
6. **Docs:**
   - **`CLAUDE.md` Commands:** `npm run e2e`.
   - **`CLAUDE.md` "Verifying your work":** browser checks must show `# fail 0`, and "NOT RUN" means not verified.
   - **`CLAUDE.md` "How changes flow":** step 5, independent verification with `verify-change`, reported as a PR comment.
   - **README:** the `npm run e2e` line and the `.claude/skills/` row (add `verify-change`).
7. **Verify** with the new skill, as its first run. A12 and D16 apply.

**PR 0's own checks:**
- `npm run e2e` passes with Playwright present.
- `scripts/e2e-runner.test.mjs` (new, part of `npm test`, no browser and no network) spawns `run.mjs` with `E2E_PLAYWRIGHT_ROOT` pointing at an empty temp directory. It expects exit code 2 and the NOT RUN message (R35). A second case gives it a stand-in Playwright and no `dist/`, and expects exit code 1 and "Run npm run build first".
- A local mutation (one rect removed from the committed `hero-island.svg`) turns `art.e2e.mjs` red, and is reverted.

### PR 1: Engine and Range round trip (slice 1)

1. **Tests first** for D8's parser, validation, sprite, scene, serializer and palette cases, and for R26, R27 and R30, using small inline fixtures. Each validation error gets an exact expected message, for example `objects/tree.mjs: layer 0, row 7: 31 wide, expected 32`.
2. **`engine.mjs`:**
   - **`loadSources({ palette, objects, scenes })`** takes plain data, never file paths, so the same code runs in Node and in the browser.
   - **`validate()`** returns every problem rather than throwing on the first.
   - **`resolve(object)`** applies `extends`: whole-row replacement per layer, then a `keys` merge.
   - **`renderScene(scene)`** returns a tree of `{ attrs, layers: [{ class?, frames?: [...], pixels: Map<"x,y", colorName> }], children }` that mirrors groups, placements and frame loops. Later paint wins within a layer.
   - **Placements:** `px` placements are offset by the object's `anchor`. `tile` placements use `iso.mjs`.
   - **No Node or DOM APIs.** JSDoc types with `// @ts-check`.
3. **`iso.mjs`:** `tileToPx([col, row, level], origin)` per D4 (`x = (col − row) × 16 + ox`, `y = (col + row) × 8 − level × 16 + oy`).
4. **`svg.mjs`:** layer tree → rect SVG. Per layer, one `<g fill>` per color in order of first paint. In that group, one `<rect>` per horizontal run, sorted by y, then x. Group attributes are copied in source order. The root carries the scene's `viewBox`, `xmlns`, `aria-hidden="true"` and `shape-rendering="crispEdges"`, in the same attribute order as today's fixtures.
5. **`serialize.mjs`.** The canonical text is:
   - a single header comment, then `export default {`;
   - two-space indentation;
   - keys in a fixed order per kind (`kind`, `legacy`, `extends`, `anchor`, `keys`, `layers` / `size`, `faces`, `surface` for objects; `output`, `viewBox`, `origin`, `items` for scenes);
   - single-quoted strings, one map row per line, trailing commas, and a final newline.

   `serialize(load(text)) === text` for every committed source (R9).
6. **`palette.mjs`:**
   - **Legacy tier:** all 81 colors as `c-<lowercase hex>`, sorted by hex.
   - **World tier, PR 1:** only the brand entries that the art already uses (`ink`, `cream`, `gold-2`, `soil-3`). The "seven complete ramps" test waits for PR 3. PR 1 tests only the brand values, the caps and unique names.
   - **Duplicates across tiers:** the same hex may appear in two tiers. Names are unique.
   - The full world palette comes in PR 3.
7. **`import-pixel-art.mjs`** (one-off, kept):
   - It parses a fixture with `optimize-pixel-art.mjs`'s parser, which it exports for this.
   - **Each static layer** (a group with no `class` or `data-class`) becomes one sprite object, trimmed to its bounding box, with `anchor: [0, 0]`, placed at `px: [minX, minY]`.
   - **Keys** are assigned by first appearance from a fixed alphabet (`a–z`, `A–Z`, `0–9`, then punctuation).
   - **Frame loops** become one object with `frames`, and **placement classes** become placements.
   - **Mark** `legacy: true`.
   - **Range names** come from `src/data/home.ts`'s order: `outfit-front-end`, `outfit-cloud-devops`, `outfit-ux-design`, `outfit-data-engineering`, `outfit-project-management`. Each outfit has a static layer and a `cbob` layer.
   - **`--factor character`** moves the rows that are identical in all five outfits (per layer, aligned on the union bounding box) into `character.mjs`. Each outfit then `extends: 'character'` and overrides only its rows (Q5).
8. **`optimize-pixel-art.mjs` command line** (D6, R38):
   - **`main()`** loads `source/` (or `--source <dir>`), validates, then compiles every scene with an `output`. Each one goes rect SVG → `optimizeSvg` → `verifyLossless` → budget → write to `src/assets/pixel-art/` (or `--out <dir>`), printing sizes in today's format.
   - **Options:** `--check`, `--preview` and `--new` per the D6 table. `--source` and `--out` exist for tests and for the editor's export check (PR 6).
   - **Exit codes:** 0 ok, 1 on any problem.
   - **Remove** the old `*.src.svg` loop, and update the header comment.
9. **`pixel-art-preview.mjs`:**
   - It writes RGBA PNGs with `node:zlib` (`deflateSync`, `crc32`; Node ≥ 22.2).
   - An object renders standing on one 32×16 tile outline over `--color-card`. The outline color is `--color-grid` composited over the card, as an opaque hex. A scene renders at its viewBox.
   - It writes 1×, 2×, 3× and 4× by integer repetition.
   - The test decodes the PNG with `inflateSync` and compares pixels (R29).
10. **Fixtures:** `git mv` both `.src.svg` files to `scripts/fixtures/pixel-art/`. Check `git diff --cached` before committing (`CLAUDE.md`).
11. **Round trip:**
    1. Run the importer on the Range fixture with `--factor character`.
    2. Write `scenes/range-sprite.mjs`.
    3. Run `npm run art`.
    4. `pixel-art-roundtrip.test.mjs` compiles the scene and checks R10: the same group structure and order as the fixture, and the same pixel set in every fill group of every layer.

    Expect `range-sprite.svg` to come out byte-identical or close to it, since the sprite has no hidden pixels and each color is unique per layer. Any difference must be explained in the PR.
12. **Determinism and staleness (R8):**
    - Compiling twice gives identical bytes.
    - Compiling every scene with an `output` equals the committed file.
    - Seeded random objects round-trip through `serialize` (L4). The seed is printed on failure.
13. **`pixel-art` skill, first version:** D18's design language, formats and headless path. It names the `--new`, `--check` and `--preview` commands, says "never hand-edit an output SVG", and lists the pitfalls. Point `art.e2e.mjs` at the fixtures' new paths.
14. **Docs** (D11):
    - **`CLAUDE.md`:** Commands (`npm run art -- --check | --preview | --new`), the edit-pixel-art convention (`source/**/*.mjs`), and the design-language line.
    - **README:** layout rows and a "Pixel art" section.
    - **`write-plan` skill:** point its example at the new paths.

### PR 2: Hero island round trip (slice 2)

1. **Test first:** `R11: hero island matches its fixture's visible image`. For each layer of the compiled scene and the fixture, compute the top-most color per pixel (later paint wins). The two maps must be equal. Then check that the group structure (classes, order) matches.
2. **Import:**
   - The island fixture becomes `island-base`, `waterfall` (`wf`, prefix `w`, 5 frames), `flag` (`ff`, `f`, 4), `hearth` (`hf`, `h`, 6), `truck` (placed twice, with classes `itruck it1` and `itruck it2`) and `cloud-a`/`-b`/`-c` (classes `pcloud pc0..2`).
   - `island-base` is legacy and exempt from the caps (up to 225×212, 38 colors).
3. **Compile, then check the evidence:**
   - `npm run art`: `hero-island.svg` is ≤ 83.5 KB raw and ≤ 25 KB gzip (D10).
   - `npm run e2e`: `art.e2e.mjs` is pixel-identical in every state.
   - Before and after screenshots of `/` at 1440px and 390px, with animations paused.
4. **Update the skill** to mention legacy objects and why `island-base` is exempt (A2).

### PR 3: World palette and library (slice 3)

1. **Pick the world palette (R31):**
   - Group the island's legacy colors into the seven materials (grass, soil, wood, path, water, roof, gold) by hue.
   - In each group, choose four shades spread evenly by luminance, highlight to shadow. Prefer exact legacy values.
   - Add `ink`, `cream` and two skin tones (from the outfits' shared colors).
   - Brand values must match `variables.css`.
   - `npm run art -- --preview palette` writes a swatch sheet: rows are materials, columns are shades 1–4. Post it in the PR.
2. **Tests first** (R26, R28 and D8's block cases):
   - the tier caps;
   - seven complete ramps;
   - the face shade per face;
   - pixel-exact faces for `[1,1,0]`, `[1,1,1]` and `[2,1,2]`;
   - a seeded random grid of blocks tiling with no gaps or overlaps (L4).
3. **`iso.mjs` faces.** A tile's top face is the set of pixels whose centers satisfy `|dx|/16 + |dy|/8 < 1`. Ties are half-open: include the left and top edges, exclude the right and bottom. Neighbouring tiles therefore partition the plane exactly. The side faces drop `level × 16` pixels below the top's left and right edges. The 1px `edge` is drawn last.
4. **`block` kind** in `engine.mjs`: `size`, `faces` and an optional `surface` sprite with frames.
5. **Objects:** `block`, `tile`, `water` (with a `wf`-style surface loop) and `tree` (a sprite of at most 64×64 and 12 colors), all in world colors only. Scene `library-demo`: a 3×3 island using every object.
6. **Previews and docs:** `--preview` for each new object and `library-demo` in the PR. A README "Pixel art" note on the palette tiers. The skill gains block examples.

### PR 4: Security and governance outfit (slice 4)

1. **Tests first:**
   - the outfit validates;
   - the figure stays within 16×24 (R27);
   - it uses world colors plus at most 4 outfit colors (Q6);
   - it isn't part of `range-sprite.mjs` (R14).
2. **Draw it** with the headless path:
   1. `npm run art -- --new object outfit-security-governance --extends character`.
   2. Override rows for a generic security look: a steel-blue ramp, with a shield or key motif. No logos.
   3. If a prop beside the figure is wanted, as some legacy outfits have, make it a separate object, placed next to the figure in `outfit-preview`.
3. **Scene `outfit-preview`:** all six outfits side by side, on tiles.
4. **Evidence:** previews at 1×–4× in the PR. The owner judges the look (L8).

### PR 5: Editor, scene mode (slice 5)

1. **Page:**
   - `BaseLayout` gets `noindex?: boolean`, which emits `<meta name="robots" content="noindex, nofollow">`.
   - `src/pages/lab/pixel-art.astro` builds its data with `import.meta.glob('../../assets/pixel-art/source/**/*.mjs', { eager: true })` and embeds `{ palette, objects, scenes, siteVersion }` as JSON in `<script type="application/json" id="lab-data">`.
   - `siteVersion` is a hash per document, from `serialize()` output.
   - `<noscript>` holds the D9.1 note.
   - It imports `lab.css` and the client entry.
2. **Layout (D9.2–D9.3):**
   - The site header stays, then the lab bar.
   - **≥ 960px:** a three-column workspace (264px · 1fr · 304px), at `height: calc(100dvh - var(--header-offset))` with a 640px minimum. Each column scrolls on its own.
   - **< 960px:** a single column. The stage is `60dvh` (320px minimum), and Library, Items and Inspector become `role="tablist"` tabs.
   - **Stage frame:** `overflow: auto`, so zoom never scrolls the page.
3. **Client:**
   - **`lab.ts`:** state, and undo/redo (200 steps; a drag or stroke is one step).
   - **`stage.ts`:** renders with `engine.renderScene` into an `ImageData` at 1×, then `drawImage` onto the canvas at integer zoom, with `imageSmoothingEnabled = false`.
   - **`scene-mode.ts`:** the tools V, A and H; drag, tap-tap and Enter placement; the items listbox; the Selected and Scene panels.
   - **`keyboard.ts`:** the D9.7 map. Shortcuts only work while the stage has focus. The toolbar uses a roving tabindex.
   - **`drafts.ts`:** `localStorage` under `pixel-lab:<kind>:<name>` together with `siteVersion`. Every access is wrapped in try/catch. The stale-draft banner.
   - **`export.ts`:** the Export `<dialog>`, which uses `serialize()`. Copy and Download are disabled while there are problems.
   - **Announcements:** a polite live region.
4. **Styles:** `lab.css` uses tokens only (D9.8), and the focus ring is extended in `base.css`.
5. **`editor.e2e.mjs`, scene flows,** each run with the pointer and again keyboard-only:
   - **R15:** the robots meta is present, and no link to `/lab/` appears elsewhere in `dist/`.
   - **R16:** add, move, change level and order, and remove an item.
   - **R19:** export: the clipboard and download text both equal `serialize()`.
   - **R20:** a reload keeps the draft. A stale draft shows the banner. With storage blocked, the "Drafts off" status shows.
   - **R21:** keyboard only.
   - **R22:** `scrollWidth <= innerWidth` at 320, 390 and 1440.
   - **R5:** reduced motion: `getAnimations().length === 0`.
6. **Budget (R24, D10):**
   - Editor JS is ≤ 30 KB gzip.
   - `grep -rl` of the editor bundle's filename in `dist/` finds only `lab/pixel-art/index.html`.
   - `dist/index.html` and its bundles are unchanged from `master`'s build.
7. **Docs:**
   - **Skill:** the editor section (optional).
   - **`CLAUDE.md`:** the editor, plus the `lab.css` exception (A5).
   - **README:** the `/lab/pixel-art/` row.

### PR 6: Editor, object mode (slice 6)

1. **Object mode** (D9.5):
   - **Tools:** B, E, G and I. Fill is 4-connected.
   - **Zoom:** 4×, 8×, 12×, 16× and Fit.
   - **Toggles:** the pixel grid at 8× and up, and onion skin.
   - **Stage:** the checkerboard, the bounds and the anchor crosshair.
   - **Palette panel:** material rows, then outfit and legacy groups. The usage meter disables new swatches at 12.
   - **Layers and Frames panels.** Play doesn't autoplay under reduced motion.
   - **Object panel:** for outfits, a row-override gutter. Painting an untouched row creates an override.
   - **New dialog:** names in kebab-case, checked live.
   - **Problems popover.**
2. **R18, `editor.e2e.mjs`:**
   1. Paint on a copy of `tree` and edit `library-demo`.
   2. Export both into a temp copy of `source/`.
   3. Run `node scripts/optimize-pixel-art.mjs --source <tmp> --out <tmp>/out`.
   4. Compare the compiled pixels with the canvas's `getImageData` at 1×.

   Run it with the pointer and again keyboard-only (R17, R21).
3. **Skill eval (R37):**
   1. Start a fresh session with only: "Use the `pixel-art` skill to add a small rock to the library and place it in `library-demo`. Don't use the editor or a browser."
   2. The run passes if the rock validates, stays within the caps and uses world colors only. Its preview goes to the owner.
   3. Fold any mistakes from the transcript back into the skill in this PR.

### Progress

Tick these as PRs merge.

- [x] PR 0: Verification tooling
- [ ] PR 1: Engine and Range round trip
- [ ] PR 2: Hero island round trip
- [ ] PR 3: World palette and library
- [ ] PR 4: Security and governance outfit
- [ ] PR 5: Editor, scene mode
- [ ] PR 6: Editor, object mode

## Risks

**The riskiest step is PR 2,** the island rebuild. It's the most pixels, it has hidden overdraw, and it's the first visible-image comparison.

| # | Risk | Handling |
| --- | --- | --- |
| 1 | **The island rebuild differs, or the file grows.** Dropping 1,492 hidden pixels changes how runs merge, so the path data changes. | R11 compares the visible image, and `art.e2e.mjs` compares in the browser. If the output grows past 83.5 KB, emit colors in the fixture's group order (the importer records it as the key order), which keeps the original run structure. |
| 2 | **The cap conflicts with props.** Legacy outfits include props (a board, screens) in their variant groups, so they're wider than 16×24. | Legacy outfits are exempt. New outfits keep the figure within 16×24 and put any prop in its own object (PR 4). |
| 3 | **Little to factor into `character`.** The five outfits may share few whole rows (Q5). | Still valid: an outfit can override most rows. The round-trip test is the gate, not the size of the saving. |
| 4 | **Diamond rasterization leaves gaps or overlaps.** | The half-open center rule (PR 3, step 3), plus the seeded random tiling test (L4). |
| 5 | **`astro check` flags the `@ts-check` engine code** under `astro/tsconfigs/strict`. | Run `npm run build` right after the first engine file lands in PR 1, and fix types in JSDoc. Never turn checking off. |
| 6 | **Editor JS goes over 30 KB gzip.** | No framework, and one shared engine import. Check after PR 5 step 3. If it's over, lazy-load object mode with a dynamic import of a bundled module (not of user content). |
| 7 | **Editor code leaks onto other pages,** for example through a shared chunk. | The R24 grep in PR 5, plus the unchanged home bundle check. |
| 8 | **Global Playwright drifts or doesn't resolve** (ESM ignores `NODE_PATH`). | `browser.mjs` imports by file URL from `npm root -g`. Only core APIs are used. A missing install gives "NOT RUN" and exit 2 (A10). |
| 9 | **Output isn't deterministic** because of iteration order or locale. | Explicit code-point sorts, and the twice-compile test (R8) in CI (departure 1). |
| 10 | **`git mv` of the fixtures gets swept into another commit.** | Check `git diff --cached` before each commit (`CLAUDE.md`). |
| 11 | **The verifier and implementer disagree on what the spec means.** | It goes to the owner as a spec gap. The spec gets fixed, then the plan. |

## Proof

| Check | Command or method | Pass when |
| --- | --- | --- |
| Gates (L1), every PR | `npm test`; `npm run build`; `npm run art`; `git diff master -- package.json package-lock.json` | `# fail 0`; `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`; every file `lossless`, none `OVER BUDGET`; no new dependencies |
| Browser checks, PR 0 on | `npm run build && npm run e2e` | `# fail 0`. "NOT RUN" fails the check |
| Range round trip | `R10:` tests; `art.e2e.mjs` | Same structure, and the same pixels per fill group; identical in the browser |
| Island round trip | `R11:` tests; `art.e2e.mjs`; screenshots of `/` at 1440px and 390px | Same visible image per layer; ≤ 83.5 KB raw and ≤ 25 KB gzip |
| Design language | `R26:`–`R28:` and `R30:` tests; the palette swatch sheet | The caps and tiers are enforced; the owner accepts the swatch sheet |
| Headless toolkit | `R38:` tests in `pixel-art-cli.test.mjs`; the verifier makes one object using only the commands | All commands behave per the D6 table |
| Library and alignment | Block tests; `--preview library-demo`; the editor at 1×, 2× and 3× over `.isogrid` | No gaps or overlaps; edges step exactly 2:1 |
| New outfit | `--preview outfit-preview` at 1×–4× | Within the caps; the owner accepts the look |
| Editor | `editor.e2e.mjs`, pointer and keyboard-only; screenshots of both modes at 1440px and 390px against the D9.3 wireframes; Lighthouse accessibility on `/lab/pixel-art/` | `# fail 0`; no horizontal scroll from 320px; accessibility = 100 |
| Same render (R18) | The export → compile → compare flow | Pixel-identical at 1× |
| Weight | `npm run art` sizes; gzip of the editor bundle; a `dist/` grep | Each SVG ≤ today's size; editor JS ≤ 30 KB gzip; no editor code outside its page; home unchanged |
| Traceability (R34) | The verifier greps `R<n>:` across `scripts/` against D15 | No requirement without evidence |
| Independent verification (R36) | A `verify-change` comment on each PR | Present, with no open blocking findings at merge |
| Skill eval (R37) | Fresh session, headless | The rock validates, within the caps and in world colors; the owner accepts its preview |
