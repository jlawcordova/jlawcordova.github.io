# Plan: Hero island detail (from intent.md 2026-10-04)
Status: done, 2026-10-05: built in [#81](https://github.com/jlawcordova/jlawcordova.github.io/pull/81) (tools), [#83](https://github.com/jlawcordova/jlawcordova.github.io/pull/83) (the land) and [#85](https://github.com/jlawcordova/jlawcordova.github.io/pull/85) (everything else) on `feat/hero-island-detail`, and merged to `main` in that branch's final PR.

**As built.** The work departed from this plan in these ways:
- **Reviews and verifiers.** From Stage 1 on, the workflow change in [#82](https://github.com/jlawcordova/jlawcordova.github.io/pull/82) applied. The work ran back to back up to the owner's two reviews (steps 9 and 12), and slices merged after those reviews without a verifier. The owner skipped the final verifier run.
- **Branches.** Stage 1 and the workflow change were branched from Stage 0's branch while #81 was open. The owner merged them into the feature branch.
- **Agents.** The `pixel-artist` agent wasn't registered in the coordinating session, so general-purpose Opus agents ran with `.claude/agents/pixel-artist.md` as their instructions.
- **Worktrees.** The coordinator made Stage 2's worktrees itself, from the feature branch. The Agent tool's isolation would have branched from the main checkout's HEAD.
- **Commits.** Steps 7 and 8 are one commit, because the joint test can't pass on step 7 alone.
- **Owner's decisions.** From the land review: the road's center line, and a fifth edge piece, `block-river` (Stage 2, water group). From the Stage 2 review: the fence comes off the island.
- **A test fix.** The Stage 0 block-painting e2e assumed a plain `block`. It now paints whichever block the site has.


This plan builds the [spec](spec.md) as amended on 2026-10-04. In plan mode, before this was written:
- an exploring agent mapped the engine, the lab, the CLI and the tests;
- a pixel-art agent proposed every object (see [Art proposals](#art-proposals)).

The owner accepted every proposal and recommendation. The pixel-art agent then revised its own instructions ([`pixel-artist-agent.md`](pixel-artist-agent.md)), and every art run uses that revision.

## Files that change

**Engine** (`src/lib/pixel-art/`):
- `engine.mjs`:
  - `sides` joins `BLOCK_PROPS`;
  - `validateBlockShape` checks it (refused on flat blocks, 16×16 maps, world keys);
  - `validateBlockResolved` counts its colors;
  - `resolveBlock` and `usedColors` merge its keys apart from the surface's;
  - `drawBlock` paints it after the faces and before the surface and `edge`, using a per-column painter.
- `iso.mjs`: `blockFaces` already gives each column's top; a helper may expose the start row per column.
- `serialize.mjs`: `serializeBlock` emits `sides` after `surface` (`keys`, `left`, `right`).

**CLI** (`scripts/`):
- `optimize-pixel-art.mjs`:
  - a per-output budget in `compileScene` (`hero-island.svg` 500 KB raw / 125 KB gzip, everything else 100 / 25);
  - `--scale N` for `--preview`;
  - `--sizes <scene>`;
  - an EPIPE handler on stdout.
- `pixel-art-preview.mjs`: unchanged, since `encodePng` already takes any whole scale.

**Lab** (`src/components/lab/`):
- `object-mode.ts`: `paintBlocked` lets top-surface and side pixels through; a pixel maps back to a map cell; the size setter drops `sides` when a block goes flat.
- `palette-panel.ts`: the palette is on for blocks.
- `lab.ts`: `usableObject` accepts a well-formed `sides`, so drafts keep it.

**Art** (`src/assets/pixel-art/source/`):
- **Land** (`objects/`): `tile`, `block`, `block-left` (new), `block-right` (new), `block-road` (new), `path`.
- **Water:** `river`, `waterfall-face`, `flag`.
- **Clouds:** `cloud-a`, `cloud-b`, `cloud-c`.
- **Trees:** `pine`, `tree-small` (`tree-shade` stays).
- **Office:** `house`.
- **Crane:** `crane-mast`, `crane-jib`, `hearth.mjs` → `crane-box.mjs` and `shed.mjs` → `boxes.mjs` (renamed).
- **Bridge:** `bridge`, `bridge-rail`, `fence`.
- **Trucks:** `truck`, `truck-green`.
- **Scenes:** `scenes/hero-island.mjs`.
- **Close-up scenes** (new, preview-only): `closeup-land`, `closeup-road-end`, `closeup-water`, `closeup-crane`, `closeup-office`, `closeup-front-trees`, `closeup-sky`.
- **Compiled:** `src/assets/pixel-art/hero-island.svg`.

**Tests:**
- `scripts/pixel-art-island.test.mjs`:
  - the constants: `MAX_RAW`/`MAX_GZIP`, `GROUND`, `BEHIND_TRUCKS`, `IN_FRONT_OF_TRUCKS`;
  - R6, the three R7 tests, R3 no-outline, R3 road line, the R5 names, the ground grid, the river, the house, the crane, the pinned positions;
  - new: a joint test on `closeup-land`.
- `scripts/pixel-art-engine.test.mjs`: `sides` validation, pixel-exact rendering for `[1,1,1]` and `[2,1,2]`, and canonical round-trip, including random blocks with `sides`.
- `scripts/pixel-art-cli.test.mjs`: `--scale`, `--sizes`, the per-output budget, EPIPE.
- `scripts/pixel-art-roundtrip.test.mjs`: the loop table (`hearth` → `crane-box`). Its R32 count stays at 4 code blocks.
- `scripts/e2e/editor.e2e.mjs`: painting a block's top and a side pixel, exporting, and comparing.

**Docs and agent:**
- `.claude/agents/pixel-artist.md` (new), from [`pixel-artist-agent.md`](pixel-artist-agent.md).
- `.claude/skills/pixel-art/SKILL.md`:
  - `sides` in the existing `stone-block` example;
  - a "Hero island look" section;
  - `--scale`, `--sizes` and the close-up scenes;
  - the editor now paints blocks;
  - the renames in "The art that's already on the site".
- `CLAUDE.md`: the pixel-art line names the `pixel-artist` agent.
- `docs/intents/2026-10-redesign/spec.md`: a dated note under §12 pointing to this spec's budgets.
- `docs/intents/2026-10-hero-island-detail/samples/`: review images from every round.

## Order of work

This uses a feature branch, `feat/hero-island-detail`, branched from `main`. There are three slice PRs, because each stage has to be reviewed by the owner before the next one starts, and Stage 2's agents start from the merged land. Each slice PR gets the independent verifier, and an agent may merge it into the feature branch once the verifier passes and CI is green. One final PR takes the feature branch to `main`, and only the owner merges it.

### PR 1, Stage 0: tools (no visible change)

1. **Per-output budget.** `compileScene` looks up the scene's output and applies the island's limits to `hero-island.svg`, and the engine's to the rest. Island R6 checks 500 KB raw and 125 KB gzip. The redesign spec's §12 gets a dated note. Tests: a CLI test with the island over 100 KB raw passes, and another output over 100 KB fails.
2. **CLI tooling:**
   - `--preview <name> --scale N` writes `<name>@Nx.png` alongside 1×–4×;
   - `--sizes <scene>` prints raw and gzip bytes per object and per color for the compiled scene and for `git show HEAD:` sources;
   - stdout EPIPE exits quietly;
   - with CLI tests.
3. **The engine's `sides`.**
   - **Format:** `{ keys, left, right }`, each 16 columns × 16 rows. Column *c* of a face is face column *c* mod 16. Row *r* is *r* pixels below that column's top edge (from `blockFaces`), repeating up every level.
   - **Painting:** after the faces, before the surface and `edge`.
   - **Plumbing:** validation, color counting, the serializer, and the skill's `stone-block` example.
   - **Tests:** pixel-exact pictures for `[1,1,1]` and `[2,1,2]`, refusal on flat blocks and on bad sizes or keys, the 12-color cap, and the round-trip.
4. **Block painting in the lab.**
   - **Painting a pixel:** a click on a top pixel paints the surface cell (clipped to the diamond). A click on a face pixel paints the side map cell from the step 3 mapping. Painting creates `surface` or `sides` keys the way sprites create keys.
   - **Panels and drafts:** the palette is on for blocks, the size setter drops `sides` when a block goes flat, and drafts accept `sides`.
   - **Tests:** e2e tests paint one top and one side pixel and export, and the export is canonical and matches. The editor JS stays within 30 KB gzip.
5. **Close-up scenes.** Seven preview-only scenes, each with a tight viewBox:
   - `closeup-land`: columns 3–5 × rows 3–5, showing the corner and both cliffs;
   - `closeup-road-end`: columns 1–3 × rows 4–5;
   - `closeup-water`: the river at `[3..5, 3]`, the waterfall and the `flag`;
   - `closeup-crane`: tiles `[3..5, 0..2]`, the crane, the hanging box, the boxes and the pine at `px [55, 38]`;
   - `closeup-office`: the house, the road at `[2, 2..4]`, the bridge and its rail, and both trucks placed by `px` at two drive offsets;
   - `closeup-front-trees`: the front trees and the fence;
   - `closeup-sky`: the three clouds and the jib's head, on the hero background.

   They draw today's objects for now. Each stays under the 100 KB budget.
6. **The agent, the skill and `CLAUDE.md`.**
   - `.claude/agents/pixel-artist.md` from the revised draft.
   - The skill's "Hero island look", built from the spec's look and the agent's revision, plus the new tooling.
   - The `CLAUDE.md` line.
   - **Check the lab hand-off (C7):** run the agent on a no-op task ("start the lab and report its URL") and confirm the dev server still answers after it hands back. If it doesn't, the agent file says the coordinator runs the server, and the main session uses `.claude/launch.json`.

   Stage 1 waits for this PR.

### PR 2, Stage 1: land (one `pixel-artist` agent)

7. **`block` and `tile` from the samples.**
   - **`block`** is a block kind with `sides`, converted pixel for pixel from [`samples/block-sample.mjs`](samples/block-sample.mjs).
     - **Left map:** column *i* starts at sample row 9+⌊*i*/2⌋.
     - **Right map:** column *j* starts at sample row 16−⌈*j*/2⌉.
     - Column 15 is left plain, because it shows only on wider faces. The unused keys (`w`, `a`, `W`) are dropped.
     - **The check:** the compiled cube matches the sample sprite exactly. Run `--check block` and diff the preview.
   - **`tile`** is [`samples/tile-sample.mjs`](samples/tile-sample.mjs).
8. **Edge pieces and road.**
   - **The variants:** `block-left`, `block-right` and `block-road`, as in the spec's [Hidden joints](spec.md#hidden-joints).
   - **The scene:** `block` at `[5,5]`, `block-left` at `[0..4,5]` except `[2,5]`, `block-road` at `[2,5]`, `block-right` at `[5,0..4]`.
   - **`path`** gets its mottled top.
   - **Tests:**
     - the ground grid, `GROUND`, `BEHIND_TRUCKS` and R3 no-outline, updated for the variants;
     - a new joint test: on `closeup-land`, every corner column on both cliffs matches its face's material, row by row;
     - `library-demo` keeps `block` (the true cube).
9. **Owner review.** The agent hands back the sources, the images (including `closeup-land` at 6×), the running lab and its report. The owner edits in the lab if they want, and the agent folds the exports in. Then the agent is asked to refine its instructions, and the refinements go into `.claude/agents/pixel-artist.md` in this PR.

### PR 3, Stage 2: everything else (seven parallel agents)

10. **Start the agents.** The main session starts seven `pixel-artist` agents at once, each in its own worktree (`isolation: "worktree"`) from the feature branch with the land merged, in parallel mode:
    - water, clouds, trees, office, crane, bridge and trucks;
    - each gets its group's proposal below, the expected failures, and its close-up scene;
    - the crane agent draws in `hearth.mjs` and `shed.mjs`;
    - if a usage limit stops an agent, the main session resumes it after the reset; crane, water and trees go first if the agents have to run in batches.
11. **Gather.** On a review branch:
    - copy each group's sources, then `git mv` the crane pieces to `crane-box` and `boxes`;
    - update the scene names and any proposed anchors;
    - run `npm run art`, `npm test` and `npm run build` on the whole island, and check `--sizes hero-island` against R10;
    - copy every agent's images into `samples/`, start one lab, and send **one** push notification to the owner, with a line for each agent.
12. **Review and change requests.** The owner's feedback is sorted by group, and each agent with changes is resumed by name with its feedback or lab export. Gather and ping run again when they're all done.
13. **Commits**, one per group, each with its replaced tests (the spec's [Tests that change](spec.md#tests-that-change)):
    - water: the river test;
    - clouds and trucks: the R7 color tests;
    - office: the house ink test;
    - crane: the crane ink test, the renames, the names lists, `pixel-art-roundtrip.test.mjs`'s loop table, and the skill's list of the site's art;
    - trees and bridge: no test changes expected.

    A last commit folds the agents' refinements into the agent file.

### Final PR

`feat/hero-island-detail` → `main`. The verifier runs against the whole spec, and only the owner merges.

## Art proposals

Proposed by the pixel-art agent and accepted by the owner. All colors are world colors, and none is `ink`. Sizes are compared with today's `hero-island.svg`: 75.6 KB raw and 15.2 KB gzip. A run costs about 14.7 B, and an isolated texture pixel about 30 B raw and 6 B gzip.

### Land

| Object | Kind and size | Build | Details | Colors |
| --- | --- | --- | --- | --- |
| `tile` | block `[1,1,0]` | face, surface | The sample: 4 tufts of two 1-px blades | `grass-2`, `grass-1` |
| `block` | block `[1,1,1]`, no `edge` | faces, sides, surface | The owner's sample, pixel for pixel. Its surface is the tile's map. | `grass-1`…`grass-4`, `soil-2`…`soil-4` (7) |
| `block-left` | as `block` | as `block` | Right column 0 in the left face's material | as `block` |
| `block-right` | as `block` | as `block` | Left column 14 in the right face's material | as `block` |
| `block-road` | as `block` | as `block` | `block-left` with a `path-3` band and a `path-4` last row under the road | + `path-3`, `path-4` |
| `path` | block `[1,1,0]` | face, surface | 3 soft patches (3, 5 and 3 px blobs): 2 `path-1` upper left, 1 `path-3`, plus 3 single `path-3` pebbles, all at least 2 px from the edge. Keys stay `h` and `d`. | `path-1`…`path-3` |

Cost: about +16.0 KB raw and +3.8 KB gzip. Most of it is the sample's land (measured +15.3 / +3.7), and the variants add almost nothing.

### Water

| Object | Kind and size | Build | Details | Colors |
| --- | --- | --- | --- | --- |
| `river` | block `[1,1,0]`, `wf`, 5 frames | face, 5 surface frames | `water-2` top with 4 `water-1` ripple crests per tile: 3 px on one row and 2 px on the next, shifted +2. Each frame moves them (+2, +1) diagonally with the flow, and frame 4 loops to frame 0. | `water-2`, `water-1` |
| `waterfall-face` | sprite 15×29 → 15×31 | static layer, `wf` layer | **Static layer:** a `water-3` sheet, a 2-row `water-2` lip with 2 drips, 2 broken `water-2` stripes, the right edge in `water-3` (not an outline), a `water-4` line over a 2–3 row `cream` and `water-1` foam band, and 3 `cream` spray drops. **`wf` layer:** 1×4 `water-2` streaks moving 2 px a frame. | `water-1`…`water-4`, `cream` |
| `flag` | sprite 10×24, `ff`, 4 frames | 4 frames | 1×3 `water-1` streaks in columns 0, 3, 6 and 9, staggered 1–3 rows, moving 2 px a frame and stopping at the foam | `water-1` |

Cost: about −1.8 KB raw and −0.4 KB gzip, because the river's frames get simpler. Frame 0 shows everything at rest.

### Clouds

The clouds are short-sided cube stacks:
- **`cloud-a`:** about 42×24, 4 cubes 20, 14, 12 and 10 wide, with the 12 on top of the 20.
- **`cloud-b`:** about 30×20, 3 cubes 16, 12 and 8 wide, with the 8 stacked; its top stays at y −80.
- **`cloud-c`:** about 24×17, 2 cubes 16 and 8 wide.

Each cube has a `cream` diamond top with clipped tips, 4–6 px sides in `path-2` (left) and `path-3` (right), and no texture. They keep their `pcloud` classes and positions. Cost: about +1.9 KB raw and +0.4 KB gzip.

### Trees

- **`pine`** grows from 17×24 to 17×27, with its anchor at `[7,26]` so its foot doesn't move.
  - **Shape:** three tiers 17, 13 and 9 wide, with a 3-px tip.
  - **Shading:** each tier is split at the center, `grass-2` on the left and `grass-3` on the right. Its skirt is `grass-3`/`grass-4` with a 1-px sawtooth of needle tips. A 1-px `grass-4` shadow falls on the tier below.
  - **Texture:** two 1×2 needle ticks per side per tier.
  - **Trunk:** `wood-3` with a `wood-4` shaded column.
- **`tree-small`** stays 14×21.
  - **Shape:** three scalloped leaf clusters.
  - **Shading:** `grass-1` caps on the upper left, `grass-2` bodies, a `grass-3` lower right, and a 2-row `grass-4` underside.
  - **Trunk:** two-tone, like the pine's. The old `water-1` shine goes.
- **`tree-shade`** is unchanged.

Cost: about +3.6 KB raw and +0.9 KB gzip.

### Office (`house`)

The office keeps its 46×42 size, its anchor and its silhouette. Its old ink pixels become `roof-3`, `roof-4` or `path-3`.

- **Roof:** `roof-2`, with a `roof-1` rim on the front-left edge. The fascia is 2 rows of `roof-3` with a `roof-4` last row on the left, and 3 rows of `roof-4` on the right.
- **Walls:** `path-1` on the left and `path-2` on the right, with a 2-row `path-3` plinth.
- **Right wall, facing the road:** a 12×9 `wood-2` roll-up loading door with 3 `wood-3` slats on the 2:1 slope and a `path-3` jamb, under a 16-px awning (3 rows, `roof-1` to `roof-3`, casting a `roof-4` shadow).
- **Left wall:** a 4×8 office door (`wood-3` with a `wood-2` lit edge) and a `water-1` window with a `path-3` sill.
- **Roof vent:** 5×4 at the back right.
- **No** lettering or logos.

It uses 10 colors. Cost: about +1.5 KB raw and +0.4 KB gzip.

### Crane

| Object | Kind and size | Details | Colors |
| --- | --- | --- | --- |
| `crane-mast` | 8×40, unchanged | `gold-2` chords on the left face (column 0 `gold-1`) and `gold-3` on the right (column 7 `gold-4`), a tie every 6 rows, see-through zigzag braces, a 2-row foot plate | 5 |
| `crane-jib` | 44×27 → 44×32, anchor `[28,31]` | The mast continued, a 6×5 cab with a 2-px `water-1` window, a truss jib (chords 3 px apart, `gold-2` zigzag web, open holes), a 6×6 counterweight (`wood-3`, `wood-4`, `soil-4`), a 6-px apex with `wood-4` ties, and a 3×2 `gold-4` trolley over the cable | 8 |
| `crane-box` (was `hearth`) | 17×37 → 17×39, `hf`, 6 frames | The same travel (rows +0, +2, +6, +8, +6, +2), a `wood-4` cable in column 9, a `gold-4` hook, `wood-4` slings, and a 14-wide box (`wood-1` top, `wood-2` left, `wood-3` right) with `path-1` tape and flap notches. Frame 0 is the top of the travel. | 6 |
| `boxes` (was `shed`) | 22×19 → 22×24, anchor `[17,23]` | Three boxes (12 wide at the back left, 10 at the front, and 8 stacked on the 12), the same materials and tape, a `grass-3` contact shadow, and feet no lower than the shed's | 5 |

Cost: about +4.2 KB raw and +1.0 KB gzip.

### Bridge

- **`bridge`** keeps its 34×27 size and silhouette.
  - **Deck:** `wood-1` planks with 9 painted `wood-2` gap lines every 3 px on the 2:1 slope. The edges are `wood-2`, with `wood-3` notches, on the left and `wood-3` on the right.
  - **Far rail:** a `wood-1` top over a `wood-2` underside, with 3 posts with caps.
- **`bridge-rail`** gets the same rail.
- **`fence`** has two log posts: lit `wood-1` columns with `wood-2` grain dashes, a `wood-3` shaded column, and `wood-1` end-grain caps with a `wood-2` ring.

Each uses 3 colors. Cost: about +1.8 KB raw and +0.4 KB gzip.

### Trucks

- **`truck`** keeps its 21×20 size and silhouette, so its wheels stay on the road line.
  - **Outline:** each ink pixel becomes the darker shade of the face it borders.
  - **Box:** a `cream` top, a `path-1` rear, and a `path-2` long side with 3 `path-3` ribs.
  - **Cab:** a `roof-2` top, a `roof-3` front with a 2-row `water-1` windshield and a `cream` headlight, and a `roof-4` side with a `water-1` window.
  - **Wheels:** `wood-4` tyres with `path-2` hubs.
  - **Keys:** `b`–`h` keep their roles, plus `i` (ribs), `t` (tyres) and `u` (hubs).
- **`truck-green`** still `extends: 'truck'`, with today's overrides plus `i` → `gold-4`.

Each uses 9 colors. Cost: about +0.8 KB raw and +0.2 KB gzip.

### Budget

| Group | Raw | Gzip |
| --- | --- | --- |
| Land | +16.0 KB | +3.8 KB |
| Water | −1.8 | −0.4 |
| Clouds | +1.9 | +0.4 |
| Trees | +3.6 | +0.9 |
| Office | +1.5 | +0.4 |
| Crane | +4.2 | +1.0 |
| Bridge | +1.8 | +0.4 |
| Trucks | +0.8 | +0.2 |
| **Island** | **≈104 KB** (limit 500) | **≈22 KB** (limit 125) |

The home page goes from about 28 KB to about 31 KB gzip, against a budget of 150. The island passes the old 100 KB raw default, so step 1 lands first.

### Running in parallel

**Dependencies.** Water, trees and crane depend on the merged land: the waterfall sits beside `block-right`'s corner column, and the shade and boxes stand on the tufts. Clouds could start during the Stage 1 review.

**What each agent may change.** Each touches only its own object files, and anchor changes stay inside them.

**Expected failures in the worktrees** (agents report them and never edit tests):

| Group | Expected failures |
| --- | --- |
| Water | the river test |
| Office | the house ink test |
| Crane | the crane ink tests |
| Clouds | the R7 color test |
| Trucks | the R7 color test |
| Every group | R6, if the worktree predates step 1 (it shouldn't) |

**Pairs to check together at the gather step:**
- the pine behind the lattice mast;
- the trucks under `bridge-rail`;
- the office awning by the road.

## Risks

- **The riskiest step is lab block painting (step 4).** The inverse mapping is easy to get off by one, and the editor's JS budget is 30 KB gzip. E2e tests paint a top pixel and a side pixel and compare the export with the expected source, and the budget test stays.
- **The shear painter could drift by a pixel.** Pixel-exact engine tests for `[1,1,1]` and `[2,1,2]` catch it, and step 7 requires the converted `block` to match the owner's sample exactly.
- **The joints may still show.** The joint test on `closeup-land` fails. The slice stops and asks the owner rather than adding an in-between color (spec C3).
- **The island passes 100 KB raw.** The per-output budget (step 1) merges before any art.
- **Usage limits during Stage 2.** Agents stop early and their worktrees keep their work. The main session resumes them after the reset, and the ping says which ones finished.
- **A shared checkout.** Another session uses this checkout. All work happens on named branches and in worktrees, and `git status` and the branch are checked before every commit. Only named paths are staged.
- **Pinned tests fail by design in Stage 2.** Each is replaced in its group's commit and listed in the PR, never skipped (spec C2).
- **The lab hand-off.** If an agent's dev server dies with the agent, the main session runs it (step 6 decides this).

## Proof

- **`npm run art`:** every file `lossless`, none `OVER BUDGET`. Paste `--sizes hero-island` into each art PR, with the island under 500 KB raw and 125 KB gzip.
- **`npm test`:** `# fail 0`, including the new `sides`, joint, budget and CLI tests.
- **`npm run build`:** `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`.
- **`npm run e2e`:** `# fail 0`, including block painting. "NOT RUN" doesn't count as passing.
- **Home page weight:** `gzip -9c dist/index.html | wc -c` is at most 150 KB.
- **Previews:** before, after and close-up previews for every object in `samples/`, and the island at 3×.
- **Screenshots:** the home page at 1440px and 390px, with no horizontal scroll.
- **Reduced motion:** nothing animates, and `it2` is hidden.
- **Verification:** an independent verifier on each slice PR and on the final PR.
