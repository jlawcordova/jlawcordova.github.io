# Plan: Island migration (from intent.md 2026-10-03)

Plans [`spec.md`](spec.md) (R1–R12, slices 1–8). The work runs on a feature branch (`write-plan`, "Feature branch"): five slice PRs merge into `feat/island-migration`, and one final PR takes it to `main`. The owner reviews the whole island once, in that final PR, and only the owner merges it. Nothing deploys until then.

## Files that change

- `src/assets/pixel-art/source/objects/`
  - `flag.mjs`, `hearth.mjs`, `cloud-a.mjs`, `cloud-b.mjs`, `cloud-c.mjs`, `truck.mjs`, `truck-green.mjs`: world keys, no `legacy: true`.
  - `path.mjs` (new): the flat road tile (spec, Target scene).
  - `island-shadow.mjs` (new): the dithered shadow, in `path-2` (as built; see step 3).
  - `waterfall-face.mjs` (new): the falling face at the front-right edge, `wf` frames.
  - `river.mjs` (new, as built in step 4): the library's `water` with fewer ripples, for the river's tiles (see step 4).
  - `bridge.mjs`, `house.mjs`, `fence.mjs`, `crane-mast.mjs`, `crane-jib.mjs` (new), plus a roof piece if the house can't carry it, and `tree-small.mjs` (new) only if a second tree size is needed. As built in step 7, the roof piece is `shed.mjs`, and `pine.mjs`, `tree-shade.mjs` and `bridge-rail.mjs` are new too (see step 7).
  - `island-front.mjs` (deleted in step 7), `island-base.mjs` and `waterfall.mjs` (deleted in steps 8 and 4).
- `src/assets/pixel-art/source/scenes/hero-island.mjs` and the generated `src/assets/pixel-art/hero-island.svg`. `library-demo.mjs` and its SVG, when a new object is added to the demo (R11).
- `scripts/pixel-art-roundtrip.test.mjs`: the island's R11 identity tests become structural tests (step 1); the "animated pieces" test drops `waterfall` (step 4) and `island-base` (step 8).
- `scripts/pixel-art-island.test.mjs` (new): the structural tests for R1–R6 and R10 (step 1), tightened as each slice lands.
- `scripts/pixel-art-engine.test.mjs`: the `library-demo` object list (R11).
- `scripts/e2e/art.e2e.mjs`: deleted in step 1. The island case was its only one (the Range case was retired earlier), so no empty suite is left. `README.md`: its fixtures row no longer names `art.e2e.mjs`.
- `scripts/e2e/editor.e2e.mjs`: it uses `waterfall` for its frame tests and `island-base` as "the largest map". The frame tests move to `waterfall-face` (step 4) and the largest-map cases move to `range-island`, the largest legacy map left (step 8).
- `src/components/lab/lab.ts`: the comment naming `island-base` as the largest map (step 8). No code change.
- `scripts/fixtures/pixel-art/hero-island.src.svg` (deleted in step 8).
- `.claude/skills/pixel-art/SKILL.md` and `README.md`: the island's legacy section and mentions (step 8).

Not touched: `pixel-art.css`, `HeroIsland.astro`, `hero.css`, `palette.mjs`, the engine.

## Order of work

One commit per slice, in the spec's order. Each PR targets `feat/island-migration`, which is branched from `main` once this plan is merged.

**PR A: slices 1–2 (identity tests replaced, no visible change and small shade changes)**

1. **Free swaps and clouds; the proof changes (R9).** `flag` and `hearth` to world keys, with a test that each paints the same pixels as before. The three clouds to world colors (`cream`, `path-2`, as in the Colors table). In the same commit, replace the island's R11 identity tests and the `art.e2e.mjs` fixture case with `pixel-art-island.test.mjs`: viewBox (R3), the animated groups and their classes (R4), paint order of trucks against front pieces and road (R5), raw and gzip size against 83,485 / 18,299 bytes (R6), no `legacy`/`c-<hex>` on migrated objects (R2, as an allow-list that shrinks to empty by step 8), and no script, link, text or external reference (R10). Keep the R11 test that the fixture's two static layers don't overlap, since the fixture stays until step 8.
2. **Trucks.** `truck` and `truck-green` to world colors; `truck-green` keeps `extends: 'truck'`. Measure and record the three green-truck distances in the Colors table (spec says "to be measured in the slice").

**PR B: slice 3 (the biggest pixel move)**

3. **Ground and shadow.** The 36 positions (`block [1,1,1]` on the front edges, `tile` elsewhere) and `island-shadow`. Remove those pixels from `island-base` in the same commit. If the size test fails, switch interior tiles to `[2, 2, 0]` blocks (spec C6) and record it here.
   - *As built.* The size test passes with single `tile`s (`hero-island.svg` goes from 83,336 to 67,323 bytes raw), so the `[2, 2, 0]` fallback is not used. The scene gets `origin: [0, 8]`, the value at which the 36 top faces cover the old diamond exactly (a fit against `island-base`); `px` items are unaffected. `island-shadow` is a 30×16 diamond with a one-pixel `path-2` checker, placed by `px` on the 11 front tiles whose shadow shows (a half-level offset is not on the tile grid), and it uses `path-2` only. The soil is 16 pixels high, as the `block` library object draws it, where the old art had about 20, so the island is 4 pixels shorter and the shadow sits 24 pixels below the top faces to keep its old gap. What left `island-base`: every grass, soil-face, grass-lip and shadow pixel (10,046 of 14,433), found as grass-colored regions not touching a tree's foliage keys, plus soil colors outside the top-face footprint. The trees, trunks, door, road, river, bridge, house and crane cable stay. Visible changes, all deliberate: the front blocks carry the library's 1-pixel `soil-4` outline (removed on 2026-10-04; see the last section), the soil loses its mottling, the old two-tone grass checkerboard becomes `tile`'s specks, and the dithered ground shade under the back trees goes with the grass (it returns with the trees in step 7 if wanted).

**PR C: slices 4–5**

4. **River and waterfall.** `water` tiles along the river, the new `waterfall-face` with `wf w0`…`w4`; `waterfall.mjs` is deleted. Move the editor e2e frame tests to `waterfall-face`, and drop `waterfall` from the "animated pieces" test.
   - *As built.* The old river ran along row 3 (it filled most of that row's width), so the river is the tiles `[1, 3]` to `[4, 3]` in place of their grass `tile`s, plus a flat top laid over the front block at `[5, 3]` (listed right after it) so the block keeps its soil sides. `[0, 3]` stays grass: the house covers it completely. **Departure:** the tiles are a new object, `river`, not the library's `water`. Six `water` tiles put `hero-island.svg` at about 88.7 KB raw, over R6's 83,485 bytes, because every tile repeats its ripples in all five frames. `river` is `water` with two of its five ripple rows blank (same size, colors, `wf` loop and frame count; a test pins that), which brings slice 4 to 82,796 bytes. It is island-specific, so it is not in `library-demo`. `waterfall-face` (15×29, 5 colors) covers the right face of the block at `[5, 3]` and falls 4 pixels past the soil into spray, as the old fall did, so every streak of the `flag` loop (`ff`, which is the waterfall's own fast streaks, not a flag) still lands on water; a test checks every flag pixel in every frame. Its still layer is the face, and its `wf` loop adds five slower streaks on the columns the flag leaves free. The `flag` object and its place are unchanged (slice 7). What left `island-base`: the river (`c-5f8c7e` right of the house's wall at x = −37) and the spray (`c-e8f1ec`), 961 pixels; the house's window panes keep their water colors. The river's top is now `water-2` with ripples (the old river was one flat `water-3`), and it is a full tile wide where the old one was about 12 pixels.
5. **Road and bridge.** `path` tiles on the same road line as today (the trucks' `idrive` offsets don't change, C5), and `bridge`.
   - *As built.* The old road ran along column 2 (its pixels spanned 71 to 97 in x + 2y, inside column 2's 64 to 96), so the road is `path` at `[2, 0]`, `[2, 1]`, `[2, 2]` and `[2, 4]` in place of their grass, plus a `path` top over the front block at `[2, 5]`. `[2, 3]` stays river, under the bridge. The road is now a full tile wide (30 pixels across, where the old one was about 26) and about 2 pixels further back, so it still contains the old road; a test checks that at every visible step of `idrive` at least 20 of each truck's 21 lowest pixels sit on the path or the bridge (the old road scored the same or one less), until the last steps where the trucks drive off the front edge and fade, as before. `path` is a flat `path-2` tile with `path-1` and `path-3` specks; the old road's cream centre dashes are gone. `bridge` (34×27, `ink` and `roof-1` to `roof-4`) is the old bridge's pixels, which were already exact world colors, placed at `[2, 3]` after the whole ground. Both are generic, so `library-demo` shows them (a path at `[1, 0]`, and the bridge over the water at `[1, 1]`, listed right after the water in col + row order, so a block the editor test drops on the centre tile is inserted after it and paints on top) and its test lists them. What left `island-base`: the road (`c-c9b79a`, `c-a8957a`, `c-bba88a`, `cream`) and the bridge, 1,404 pixels. `hero-island.svg` is 79,939 bytes raw after this step.
   - *Also in PR C, recorded late (PR D).* Two departures from this plan's file list. **`scripts/e2e/range.e2e.mjs`** (not an island file) got its own commit: its auto-advance check waited a fixed time from page load, so a slow first run could see two carousel steps; it now waits from where the carousel is. **`.claude/skills/pixel-art/SKILL.md`** was edited in slices 4–5, not only in step 8: the library line names `path` and `bridge`, and the island list names `river` and `waterfall-face` in place of `waterfall`. The rest of the skill's island section is still step 8. The truck-on-road test's comment also said the trucks "drive off the island's front edge" at the 9 skipped steps; they are still on the island there but off the road, as on the old road. PR D rewords it and pins those steps so they can't get worse.

**PR D: slices 6–7**

6. **House.**
   - *As built.* `house` (46×42, 10 colors: `ink`, `roof-1` to `roof-4`, `path-1`, `path-2`, `water-1`, `water-3` and `soil-3`) is the old house's pixels in world colors, at the same place: its anchor is the front corner of its walls, placed at `px [-59, 59]`, right after the bridge. The house is not on the tile grid (it is about 2.7 tiles wide), so it is placed by `px`. Only the right wall's shade changes (`c-d9c9ae` becomes `path-2`); the roof, the cream left wall, the door and the window panes were already exact world colors. It hides the tile at `[0, 3]` except 2 pixels at its right corner, by the river. It stays out of `library-demo`: it is bigger than a tile and would cover the demo's grid. What left `island-base`: 1,335 of the house's pixels, including its window panes, which were the last water colors in `island-base`. `hearth` is not part of the house (it is the crane's swinging load), so step 6 leaves it alone. `hero-island.svg` was 79,939 bytes raw after this step, unchanged, because the house paints the same runs.
   - *Fixed after verification (PR D).*
     - **What went wrong.** As first built, `house` was 45 columns wide and missed the old house's rightmost column: the 3 `ink` pixels of the roof's right outline, at scene x = −35, y 30–32. They stayed in `island-base` through slice 6. Slice 7 then dropped them with it, leaving a gap in the roof's edge.
     - **The fix.** A fix-up commit gives `house` that 46th column. The house is now the whole old house, 1,338 pixels, and a test pins the outline.
     - **The result.** Only the right wall's shade changes against the old house.
7. **Front pieces.** Trees, `fence`, `crane-mast` + `crane-jib` (each within 64×64), roof pieces. All listed after the trucks (R5). `island-front.mjs` is empty and deleted.
   - *As built.* Every piece is the old pieces' pixels in world colors, cut into objects:
     - **Trees, a departure.** The island has two kinds, four round trees and four pines, all ink-outlined like the rest of the island. They are `tree-small` (14×21, the old round tree at the back right) and a new `pine` (17×24). The other back round tree, at `px [-25, 29]` in front of the back pine, was drawn slightly differently. Reusing `tree-small` there moves its trunk 1 pixel left (from x −25…−22 to −26…−23) and changes its crown outline by a pixel or two on each side. Its `tree-shade` sits at the new trunk. The library's `tree` is not used: tried at the pines' places, its bigger, unoutlined crown read as a different style beside the outlined house, bridge and crane, and it can't stand in for a pine (previews in the PR). Four trees stand behind the road (they were `island-base`) and paint before the trucks; four stand in front (they were `island-front`) and paint after them. A test checks that wherever a truck crosses a tree on its drive, the one further forward paints on top.
     - **`tree-shade`** (11×5, `grass-3`, new): the dithered shade under the back trees that slice 3 removed with the grass, taken from the old map, under the three back trees whose trunks show. Not under the front trees, which would paint it over a truck.
     - **The crane:** `crane-mast` (8×40) and `crane-jib` (44×27) stacked, the jib's anchor right above the mast's top, so the 67-pixel crane needs no exemption. `hearth` is the crane's swinging load; it hangs from the jib as before, at the same place.
     - **`bridge-rail`** (21×17, new, a departure): the bridge's front railing, which was in `island-front` because the trucks drive between the two railings. It is placed on the bridge's tile, `[2, 3]`, after the trucks.
     - **Roof pieces: `shed`** (22×19): the small roofed building under the crane. It stood on the river once the river was a tile wide (slice 4), so it moves 3 pixels left and 3 up, onto the grass of `[4, 2]` by the river bank.
     - **`fence`** (14×15): the two posts. They stood in the river too, so they move onto the river's front bank (`[4, 4]` and `[5, 4]`), right of the front pine that used to hide them. A test checks every piece's feet stand on the island's grass, not on the river, road or bridge.
     - Placed by `px` (except `bridge-rail`), like the old pieces, because none of them sits on the tile grid. None is in `library-demo`: they are the island's own pieces.
     - What left the maps: `island-base`'s four back trees (687 pixels), so `island-base` is now an empty map that slice 8 deletes, and all of `island-front`, which is deleted, so the R2 allow-list is `island-base` alone. The skill's island list names the new objects (the rest of its island section is step 8).
     - The R5 test now checks, in the compiled SVG, that every front piece's visible pixels are painted after both truck groups and before the hearth, and that nothing else is painted there.
     - `hero-island.svg` was 80,549 bytes raw, 16,267 with `gzip -9`, after this step. After the house fix it is 80,564 bytes raw and 16,271 with `gzip -9`.

**PR E: slice 8**

8. **Clean-up.** `island-base` is empty and deleted, with the fixture, the remaining R11 island tests and the R2 allow-list. The editor e2e's largest-map cases move to `range-island`, the `lab.ts` comment is updated, and the skill's island section and the README mentions go (R11).

   - *As built (PR E).* No visual change: `hero-island.svg` is byte-identical before and after (80,564 bytes raw, 16,271 with `gzip -9`), because `island-base` was already an empty map. `island-base.mjs` and the fixture `hero-island.src.svg` are deleted, with the four R8 "island-base no longer paints" tests and the R2 allow-list, which is gone, so R2 now holds for every object in the scene with no exceptions. A new test pins that neither `island-base` nor `island-front` exists. In `pixel-art-roundtrip.test.mjs` the "fixture layers don't overlap" test goes, the R12 check no longer looks for the island fixture (`range-sprite.src.svg` stays), and the "animated pieces" test keeps its `flag` and `hearth` loop checks without the `island-base` part; the `structure` and `assertNoOverlaps` helpers it used go too. In `editor.e2e.mjs` both largest-map cases use `range-island` (99×62). The `lab.ts` comment names `range-island`. `MAX_MAP` (512) was not chosen to fit `island-base` (193×128; it is a generous cap on a draft's size), so it is unchanged. The skill's island section now describes the island as built from library and island objects and drops the "why exempt" text; `range-island` stays as the one legacy object. The README had no `island-base` or `island-front` mention; its fixtures row now describes the Range sprite fixture only. The legacy palette tier stays (spec Q1).

**Final PR: `feat/island-migration` → `main`.** Opened by the agents after PR E merges, with the whole-island before and after (1× and 4× previews, home at 1440px and 390px), the final size against R6, and links to every slice PR and its verifier report. Verified once more against the whole spec. The owner reviews R3 here and merges, which deploys.

### Workflow for each slice PR

1. An implementer agent, in its own worktree from the tip of `feat/island-migration`, builds the PR's slices one commit each, runs every gate in Proof, pushes the previews and screenshots to `art-previews/pr-<n>`, ticks Progress below, and opens the PR against `feat/island-migration`. It records in the PR description anything left on purpose to a later slice, so the verifier doesn't flag it.
2. A fresh verifier agent gets only "Use the verify-change skill on PR #<n>."
3. Blocking findings go to an implementer, then a new verifier runs. This repeats until a report is PASS.
4. With PASS and green CI, an agent merges the PR into `feat/island-migration` (the hook in `.claude/settings.json` allows only `feat/*` bases). If `main` has moved, it merges `main` into the feature branch before the next PR starts.

The PRs run one after another: every slice edits `hero-island.mjs` and removes pixels from `island-base`, so they can't be built in parallel.

## Risks

- **Slice 3 is the riskiest.** It moves a third of the island's pixels and is where size (R6) is most likely to break, because 36 tiles each carry their own runs. Handled by the size test from step 1 and the `[2, 2, 0]` fallback.
- **Painting twice.** A slice that adds an object but leaves its pixels in `island-base` paints both. Each slice removes the pixels it replaces in the same commit (R8), and the 4× preview shows doubled edges.
- **The trucks leave the road.** The road is redrawn in step 5 but `idrive` is fixed in CSS. The road stays on the same line, and the screenshots show both trucks on it with motion and with reduced motion.
- **Paint order.** Front pieces must follow the trucks in `items` (R5). The structural test checks the order of the groups in the compiled SVG.
- **The editor's browser tests lose their fixtures** in steps 4 and 8 (see Files). They move in the same commit. CI doesn't run e2e, so the implementer and the verifier run it locally; "NOT RUN" is not a pass.
- **No review until the end.** The owner sees the redesign only in the final PR. A rejected look then means reworking slices on the feature branch, which is the owner's accepted trade-off.
- **Alternatives not chosen.** One PR per slice (eight verifier loops for small slices) and a single PR (too large to verify in one pass, and slice 3 should be checked before building on it).

## Proof

Each slice PR pastes:

- `npm test`: `# fail 0`.
- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`; then `git checkout src/data/accomplishments.json`.
- `npm run art`: every file `lossless`, none `OVER BUDGET`, and `git status` clean afterwards. Each new object also passes `npm run art -- --check <name>` within 64×64 and 12 colors.
- `npm run build && npm run e2e`: `# fail 0` (needs local Playwright).
- `hero-island.svg` raw and gzip bytes, before and after.
- `npm run art -- --preview hero-island` at 1× and 4×, before and after, and the home page at 1440px and 390px with no horizontal scroll.

The final PR adds the whole-island before and after, and a verifier report against R1–R12.

### Progress

- [x] PR A: slices 1–2
- [x] PR B: slice 3
- [x] PR C: slices 4–5
- [x] PR D: slices 6–7
- [x] PR E: slice 8
- [x] Final PR to `main`

## Spec corrections for the owner

Where the island as built differs from the approved `spec.md`. The implementers didn't edit the spec for these; the owner decided at the final PR (2026-10-04) to accept the island as built and amend the spec. Every item below is resolved.

- **The shadow is `path-2` only.** The spec said `path-1` and `path-2`; slice 3 built a one-tone checker because `path-1` is nearly the page background (step 3, As built). This one was already edited into `spec.md` (Target scene) by PR C, so the owner should confirm that edit. *Resolved: amended into the spec, 2026-10-04.*
- **The river is a new `river` object, not the library's `water` tiles.** Six `water` tiles put the island over R6; `river` is `water` with two of its five ripple rows blank (step 4, As built). The spec's Target scene still says `water` tiles. *Resolved: amended into the spec, 2026-10-04.*
- **Six copies of the `wf` loop.** R4 names `wf w0`…`w4` once. Each of the five river tiles and the falling face carries its own loop, so the scene has six (30 groups). They run in sync, and `pixel-art.css` is untouched. *Resolved: amended into the spec, 2026-10-04.*
- **The trees are `tree-small` and a new `pine`, not the library's `tree`** (step 7, As built). The spec says the island uses the existing `tree`, with a small variant if needed. The island's own trees are ink-outlined round trees and pines; the library `tree` is larger and unoutlined, and was tried and dropped. *Resolved: amended into the spec, 2026-10-04.*
- **Pieces the spec doesn't name** (step 7): `bridge-rail` (the bridge's front railing, which paints over the trucks), `shed` (the spec's "roof pieces": a small roofed building under the crane) and `tree-shade` (the ground shade under the back trees). *Resolved: amended into the spec, 2026-10-04.*
- **The front pieces' own order.** The spec's Order lists them as "front trees, crane, fence, roof pieces, hearth". As built, they paint in this order: `bridge-rail`, `shed`, `crane-mast`, `crane-jib`, `fence`, the four front trees (back to front), then `hearth`. That is roughly back to front, so a nearer piece covers a farther one. R5 only needs them all after the trucks, which they are. The owner should say whether the spec's list was meant as a paint order. *Resolved: amended into the spec, 2026-10-04.*
- **The `flag` paints before the trucks.** The spec's Order lists the front pieces as "front trees, crane, fence, roof pieces, hearth, flag". As built, `flag` (the waterfall's fast streaks, not a flag) stays where it always was, before the trucks, because it lies on the falling water and no truck passes it. *Resolved: amended into the spec, 2026-10-04.*

## As built after the owner's review (2026-10-04)

- **The library `block` has no outline.** The owner's one change: the front grass blocks carry no outline, and `block` (`src/assets/pixel-art/source/objects/block.mjs`) drops `faces.edge: 'soil-4'`. This supersedes the 1-pixel `soil-4` outline recorded in step 3, As built. The engine draws the outline only when `faces.edge` is set, so there is no engine change. The change reaches every placed `block`: 11 in `hero-island` and 6 in `library-demo` (a departure from the spec's old "Not touched" list, now amended). No test pinned the block's outline or pixels (the engine tests build their own blocks), so no test changed. `hero-island.svg` goes from 80,564 to 75,627 bytes raw and from 16,271 to 15,187 with `gzip -9`. The 4x previews show no outline on the grass tops or between the soil sides. A 1-pixel `soil-3` column remains at each seam between blocks along the front-left edge: it is the block's own right-face shade, not an outline.
- **`main` merged in.** `origin/main` (PR #70, a `verify-change` skill fix, unrelated to the island) is merged into the branch.
- **`spec.md` amended** to match the build (its status line is dated); see the resolved items above.
