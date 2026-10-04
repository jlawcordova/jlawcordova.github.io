# Spec: Island migration (from intent.md 2026-10-03)
Status: approved.
Updated to the build with the owner's approval on 2026-10-04 (final review of PR #71): the as-built differences are now the spec, and the front blocks have no outline.

This spec moves the hero island to world colors and rebuilds it from library objects. It was first written under the [pixel-art follow-ups intent](../2026-10-pixel-art-follow-ups/intent.md) and now belongs to the island's own [intent](intent.md). The owner's answers to the earlier concerns are recorded under each one below.

## Requirements

Traced to the intent's Problem and Proposed outcome. Each is checkable.

- **R1. No big maps.** `island-base` and `island-front` are deleted. `scenes/hero-island.mjs` is built only from objects of at most 64×64 pixels and at most 12 colors. *(Outcome: the island is made of pieces)*
- **R2. World colors only.** Every object in `hero-island` uses world colors (plus `ink` and `cream`). None has `legacy: true` or a `c-<hex>` key. *(Outcome: one palette, for the island)*
- **R3. Same layout, free redesign.** The viewBox stays `[-100, -84, 225, 212]`, the road stays on the same line, and the river, road, bridge, house, trees, crane, fence, trucks, flag and waterfall are all still there. Their drawing and exact placement may be redesigned where library objects make it simpler. The owner reviews the before and after previews. *(Outcome: a redesign is allowed)*
- **R4. Animation is unchanged.** The scene keeps the groups the CSS animates: `wf w0`…`w4` (six copies of the loop in the scene, in sync: one on each of the five river tiles and one on the falling face, 30 groups in all), `ff f0`…`f3`, `hf h0`…`h5`, `itruck it1`, `itruck it2` and `pcloud pc0`…`pc2`. `pixel-art.css` is not edited. Frame 0 is still the reduced-motion frame and `it2` is still hidden under reduced motion. *(Constraint)*
- **R5. Paint order is kept.** The trees, crane, fence and roof that were `island-front` still paint over the trucks, and the trucks still paint over the road. *(Constraint: same place)*
- **R6. Not heavier.** `hero-island.svg` is at most today's 83,485 bytes raw and 18,299 bytes gzipped, and the home page stays inside the redesign spec's §12 budget. *(Constraint: no heavier art)* As built: 75,627 bytes raw and 15,187 gzipped (80,564 and 16,271 before the block's outline was removed).
- **R7. Legacy colors are swapped for world colors.** Each legacy color the island loses becomes the named world color in the table in [Colors](#colors). Shade changes are accepted. *(Outcome: no legacy colors on the island)*
- **R8. One piece at a time.** Each slice in [Slices](#slices) is its own reviewed step: one commit, with before and after previews at 1× and 4× and a screenshot of the home page at 1440px and 390px (no horizontal scroll). Each slice removes the pixels it replaces from `island-base` or `island-front` in the same commit, so nothing is ever painted twice. How the slices are grouped into PRs is the plan's decision (the `write-plan` skill, "How many PRs"). The site stays deployable after each PR. *(Constraint)* As built, verification found slips in slices 3, 5 and 7, and each was fixed in a fix-up commit that `plan.md` records (for example, the house's missing 46th column, found after slice 7).
- **R9. The proof changes with the promise.** The island stops being pixel-identical to `scripts/fixtures/pixel-art/hero-island.src.svg`, so the tests that say so (engine spec R10 and R11 for the island, and the island case in `scripts/e2e/art.e2e.mjs`, a suite since deleted because that was its only case) are replaced in the first slice that changes a shade. The new tests check R1 to R6 and R10, not pixels. *(Constraint; see C2)*
- **R10. The island is still decorative and safe.** `HeroIsland.astro` still inlines the SVG with the same classes, and the SVG carries no script, link, text or external reference. *(Constraint: accessibility, public safety)*
- **R11. The library and the skill keep up.** New objects are added to the `library-demo` test list when they appear there (skill, "Adding to the library demo"). The last slice removes the island's legacy section from `.claude/skills/pixel-art/SKILL.md` and the README mentions of `island-base` and `island-front` (the README had none). The island's own pieces (`river`, `waterfall-face`, `house`, `shed` and the like) are not generic, so they stay out of `library-demo`; `path` and `bridge` are generic and are in it. *(Outcome)*
- **R12. Independent verification** on every PR, as in `CLAUDE.md`. *(Constraint)*

## Design

### What is there today

| Piece | In the scene | Size | Colors | World-color status |
| --- | --- | --- | --- | --- |
| `island-base` | `px [-96, -3]` | 193×128 | 33 | 21 colors exact, 12 not |
| `island-front` | `px [-37, -7]` | 109×98 | 20 | 16 exact, 4 not |
| `waterfall` (`wf`, 5 frames) | `px [-36, 33]` | 82×45 | 1 | exact (`water-1`), but wider than 64 |
| `flag` (`ff`, 4 frames) | `px [37, 73]` | 10×24 | 1 | exact (`water-1`) |
| `hearth` (`hf`, 6 frames) | `px [24, 17]` | 17×37 | 4 | exact (`roof-2` to `roof-4`, `ink`) |
| `truck`, `truck-green` | `px [31, 6]` | 21×20 | 8 | 3 not exact; the green one extends the first |
| `cloud-a`, `cloud-b`, `cloud-c` | `px` with `pcloud` | 41×19, 29×16, 24×13 | 3 each | all 3 not exact |

The ground is the 6×6 grid the engine spec measured (D4), about 192 pixels across, with one level of soil along the two front edges, a dithered shadow under it, a river that runs to a waterfall over the front-right edge, a road across it, a bridge, a house, trees, a crane, a fence, and two trucks that drive along the road.

### Target scene

`hero-island` becomes a list of library objects in paint order. The plan reads exact positions off the 4× preview; this is the shape.

- **Ground.** 36 tile positions on a `[col, row, 0]` grid, with the scene's `origin` at `[0, 8]`. Positions on the two front edges (`col = 5` or `row = 5`) are `block` `[1, 1, 1]`: a grass top and soil sides, so the soil shows, **with no outline** (the owner's decision of 2026-10-04: the library `block` has no `edge`, so there is no outline on the grass tops or between the soil sides). The rest are flat `tile`. Back-edge sides are never seen, so they stay flat. The library's soil is 16 pixels high where the old art had about 20, so the island is 4 pixels shorter and the shadow sits 24 pixels below the top faces to keep its old gap. The old two-tone grass checkerboard and the soil's mottling are replaced by `tile`'s specks and the block's plain faces. The blocks under the river and the road carry a flat `river` or `path` top, listed right after them, so their soil sides still show.
- **River.** A new island object, `river`, not the library's `water`. It is `water` with two of its five ripple rows blank (same size, colors, `wf` loop and frame count), because six `water` tiles would put the island over R6 (about 88.7 KB raw). The river is the `river` tiles `[1, 3]` to `[4, 3]`, plus one over the front block at `[5, 3]`; each carries the `wf` surface loop itself, and its top is `water-2` with sparse moving ripples. The waterfall's falling face is a small new object, `waterfall-face` (15×29, 5 colors), at the front-right edge, with the same `wf` frames; it falls 4 pixels past the soil into spray. The river is a full tile wide (about 30 pixels where the old one was about 12).
- **Road.** A new flat `path` tile (top `path-2`, with a surface of `path-1` and `path-3` specks like `tile`'s), placed along column 2 at `[2, 0]`, `[2, 1]`, `[2, 2]`, `[2, 4]` and over the front block at `[2, 5]`. It is a full tile wide (about 30 pixels where the old road was about 26) and about 2 pixels further back, so it still contains the old road and the trucks stay on it. It has no cream centre dashes and no darker edge lines.
- **Bridge, house, fence, crane.** New sprites, each within 64×64 and 12 colors, drawn from the existing shapes. `bridge` (34×27) sits at `[2, 3]`, and `bridge-rail` (21×17) is its front railing, placed on the same tile after the trucks, because the trucks drive between the two railings. `house` (46×42) is placed by `px`, at the old house's place. The crane is about 44 wide and 65 tall, so it is drawn as two stacked objects, `crane-mast` (8×40) and `crane-jib` (44×27), with no exemption from the cap; `hearth` hangs from the jib as before. `fence` (14×15) is the two posts, and `shed` (22×19) is the small roofed building under the crane (the "roof pieces"). The shed moved 3 pixels left and 3 up and the fence posts 2 pixels down, onto the grass by the river, because the river is now a full tile wide.
- **Trees.** The island's own ink-outlined trees: `tree-small` (14×21, round) and `pine` (17×24), four of each, not the library's `tree`, which is larger and unoutlined and read as a different style beside the outlined house, bridge and crane. The round back tree at `px [-25, 29]` reuses `tree-small`, so its trunk moves 1 pixel left and its crown outline changes by a pixel or two on each side. `tree-shade` (11×5, `grass-3`) is the dithered ground shade under the three back trees whose trunks show.
- **Shadow.** `island-shadow`, a 30×16 diamond with a one-pixel checker in `path-2` only (`path-1` is nearly the page background, so the first plan's `path-1` and `path-2` became one tone), placed by `px` on the 11 front tiles whose shadow shows.
- **Animated pieces.** `flag` and `hearth` swap their keys to world names and drop `legacy: true`. This changes no pixel (the values are equal). The `flag` is the waterfall's fast streaks (the `ff` loop), not a flag: it lies on the falling water, so it paints before the trucks, where it always was. The `waterfall`'s 82-wide map is mostly empty. Its sparkles are carried by the `river` tiles and the falling-face object, so the 82×45 sprite is retired.
- **Trucks and clouds.** Same shapes, world keys (see below). `truck-green` stays a recolor of `truck` (`extends: 'truck'`).
- **Order.** The shadow, the ground in `col + row` order (with the river and road tops right after the blocks they cover, and `waterfall-face` after the river), the bridge, the house, the back trees' shade and the four back trees, the `flag`, the trucks (`itruck it1`, `itruck it2`), then the front pieces in this order, roughly back to front so that a nearer piece covers a farther one: `bridge-rail`, `shed`, `crane-mast`, `crane-jib`, `fence`, the four front trees (back to front), then `hearth`, then the clouds. The front pieces cannot be sorted by `col + row` with the trucks, because the trucks move. They are listed after the trucks on purpose (R5). Wherever a truck crosses a tree on its drive, the one further forward paints on top.

### Colors

No new world colors are needed. The tier stays at 32. Every legacy color on the island is swapped for the nearest world color from the editor's approved palette. Colors that already equal a world value (21 of the base's 33 and 16 of the front's 20) change nothing. The rest:

| Legacy color | Used | Becomes | Distance | What it is |
| --- | --- | --- | --- | --- |
| `c-88a267` | 2,373 px | `grass-2` | 10 | the second grass of the checkerboard |
| `c-7e9a60` | 809 px | `grass-3` | 22 | grass shade |
| `c-d4c5a9` | 814 px | `path-2` | 23 | road |
| `c-d9c9ae` | 289 px (also clouds, truck) | `path-2` | 31 | road, cloud and truck edge |
| `c-5e7d45` | 127 + 132 px | `grass-4` | 27 | dark grass, tree shade |
| `c-a9bd8c` | 151 px | `grass-1` | 22 | light grass |
| `c-6f8a55`, `c-77925a` | 144 + 112 px | `grass-3` | 5, 10 | near-duplicate greens |
| `c-bba88a`, `c-b8a88a` | 31 + 58 px | `wood-1` | 22, 23 | fence |
| `c-6e4d36` | 29 px | `wood-3` | 15 | wood |
| `c-d2c3a6` | 13 px | `path-2` | 19 | path |
| `c-e8f1ec`, `c-d3dfc0` | 18 + 8 px | `cream`, `water-1` | 17, 22 | highlights |
| `c-fffdf8`, `c-efe6d6` | clouds | `cream` | 31, 13 | cloud body and shade |
| `c-fbf6ec`, `c-bfd3cb` | truck | `cream`, `water-1` | 17, 16 | truck body and window |
| `c-6f9a6e`, `c-2e4f33`, `c-3f6b45` | green truck | `grass-3`, `grass-4`, `grass-4` | 27, 43, 19 | green truck |

Distance is plain RGB distance (0 to 441). In all, 4,901 of `island-base`'s 14,433 painted pixels (34%) and 207 of `island-front`'s 1,958 (11%) change shade. The biggest visible effect is that the grass loses some of its subtle variety, because 11 greens fall onto four ramp steps. Pieces drawn fresh from tiles will not reproduce the old checkerboard pixel for pixel anyway; the `tile` library object's own surface specks stand in for it (C3).

### Slices

Each slice is one step in this order (R8). The plan decides which slices share a PR. Early slices are small and low-risk, so the process is proven before the large ones.

1. **Free swaps (no visible change) and clouds.** `flag` and `hearth` to world keys (a test shows they paint the same pixels), together with the three clouds in world colors (a tiny shade change). One slice.
2. **Trucks.** `truck` and `truck-green` to world colors.
3. **Ground and shadow.** The 36 positions and the shadow. The matching pixels leave `island-base`.
4. **River and waterfall.** `water` tiles and the falling face. Retires the 82×45 `waterfall`.
5. **Road and bridge.**
6. **House.**
7. **Front pieces.** Trees, fence, crane and roof pieces. `island-front` is empty and deleted.
8. **Clean-up.** `island-base` is empty and deleted. The fixture, the identity tests and the e2e case are removed, and the skill and README are updated (R11).

The first slice that changes a shade (1) also replaces the identity tests (R9), because they cannot pass any more.

### Files touched

`src/assets/pixel-art/source/objects/` (added: `path`, `island-shadow`, `waterfall-face`, `river`, `bridge`, `bridge-rail`, `house`, `shed`, `fence`, `crane-mast`, `crane-jib`, `pine`, `tree-small` and `tree-shade`; deleted: `island-base`, `island-front` and `waterfall`; edited: the library `block`, see below), `scenes/hero-island.mjs`, `scenes/library-demo.mjs`, the compiled `hero-island.svg`, `scripts/pixel-art-roundtrip.test.mjs`, `scripts/pixel-art-island.test.mjs` (new), `scripts/pixel-art-engine.test.mjs` (library list), `scripts/e2e/editor.e2e.mjs` (its frame tests use `waterfall-face` and its largest-map cases use `range-island`), `scripts/e2e/range.e2e.mjs` (a timing fix unrelated to the island's art), `src/components/lab/lab.ts` (a comment), `scripts/e2e/art.e2e.mjs` (deleted in slice 1, because the island was its only case; see the plan), `scripts/fixtures/pixel-art/hero-island.src.svg` (removed last), `.claude/skills/pixel-art/SKILL.md`, `README.md`. Not touched: `pixel-art.css`, `HeroIsland.astro`, `hero.css`, the palette, the engine.

**The library `block` changed** (2026-10-04): it lost its `soil-4` outline. That goes beyond the old "Not touched" list, because `block` is a library object: it also changes the six blocks `library-demo` places, which lose the outline too. The engine draws the outline only when `faces.edge` is set, so no engine change was needed.

## Areas of concern

All resolved by the owner (2026-10-03), and C8 on 2026-10-04.

**C1. Scope.** The island is its own change with its own intent. The editor outcomes and the Range platform stay with the follow-ups intent. **Resolved:** the island is a separate intent. The legacy tier stays in the engine until the Range platform moves.

**C2. The old safety net contradicts the new goal.** The engine spec makes the island pixel-identical to its fixture (R10, R11), and the browser check compares it too. **Resolved:** pixel-identical is not required and the island may be redesigned. The identity checks for the island are retired in slice 1 and replaced with structural tests (R1 to R6). The fixture stays until the last slice.

**C3. Shade changes, and a full palette.** **Resolved:** shade changes don't matter. Every legacy color is swapped for the approved world color from the editor's palette. No palette changes are needed or made. Legacy colors that already exist in the palette can be removed from the island at once.

**C4. The 64×64 cap against two pieces.** **Resolved:** the crane is split into stacked objects, the waterfall sprite is retired, and nothing gets an exemption.

**C5. The truck path is hard-coded.** `idrive` in `pixel-art.css` moves the trucks by fixed offsets from `px [31, 6]`. **Resolved:** the road stays on the same line, so no CSS changes (R4).

**C6. Size could rise.** **Resolved:** the owner is fine with the size. R6 still holds the island to today's size, and each slice reports raw and gzip size. If 36 single tiles don't fit, the plan may use `[2, 2, 0]` blocks.

**C7. Two palettes persist until the Range platform moves.** The migrated island sits next to the legacy Range platform. **Accepted:** it is no worse than today.

**C8. The island as built differs from this spec.** The slice PRs flagged where the build departs from the approved spec and left the spec unedited for the owner. **Resolved (2026-10-04):** the implementation is accepted as built, and this spec is amended to match: the `river` object in place of `water` tiles, `tree-small` and `pine` in place of the library `tree`, the objects the spec did not name (`bridge-rail`, `shed`, `tree-shade`, `waterfall-face`, `island-shadow`, `path`, `house`, `fence`, `crane-mast`, `crane-jib`), the front pieces' paint order, six copies of the `wf` loop, the `path-2`-only shadow, the `flag` painting before the trucks, and the visible changes (a shorter soil, a full-tile-wide river and road, a lighter rippling river, a road without dashes, a reshaped back tree, a moved shed and fence). The one change the owner asked for is that the front blocks have no outline (Target scene, Ground).

## Open questions

All closed.

| # | Question | Answer |
| --- | --- | --- |
| 1 | The legacy tier: delete it entirely once empty? | **Out of scope.** It isn't empty after this work. Decided with the Range platform. |
| 2 | Draft differences | **Out of scope.** Stays with the follow-ups intent. |
| 3 | Palette swaps | **Out of scope.** Stays with the follow-ups intent. |
| 4 | The Range platform: after the island? | **Out of scope.** Stays with the follow-ups intent. |
| N1 | Nearest world color everywhere, or redraw? | **Closed:** swap to the approved colors, and redraw freely. |
| N2 | One PR per slice? | **Closed:** no. Each slice is one commit (R8), and the plan groups them into PRs under `write-plan`'s "How many PRs". The flag, hearth and clouds are one slice; the trucks are their own slice. |
| N3 | Keep the old fixture until the end? | **Closed:** yes, until the last slice. |
