# Spec: Island migration (from intent.md 2026-10-03)
Status: draft.

This is the first spec under the [pixel-art follow-ups intent](intent.md). It covers the part the owner chose to start with: **moving the hero island to world colors and rebuilding it from library objects.** The intent's other outcomes (opening a file in the editor, draft differences, the palette-swap decision, the base character) get their own specs in this folder. See concern C1.

## Requirements

Traced to the intent's Problem and Proposed outcome. Each is checkable.

- **R1. No big maps.** `island-base` and `island-front` are deleted. `scenes/hero-island.mjs` is built only from objects of at most 64×64 pixels and at most 12 colors. *(Outcome: the island is made of pieces)*
- **R2. World colors only.** Every object in `hero-island` uses world colors (plus `ink` and `cream`). None has `legacy: true` or a `c-<hex>` key. *(Outcome: one palette, for the island)*
- **R3. Same place.** The ground stays a 6×6-tile footprint on the same pixels, the viewBox stays `[-100, -84, 225, 212]`, and the river, road, bridge, house, trees, crane, fence, trucks, flag and waterfall are all still there in the same arrangement. The owner confirms it reads as the same place against the before and after previews. *(Constraint: same place)*
- **R4. Animation is unchanged.** The scene keeps the groups the CSS animates: `wf w0`…`w4`, `ff f0`…`f3`, `hf h0`…`h5`, `itruck it1`, `itruck it2` and `pcloud pc0`…`pc2`. `pixel-art.css` is not edited. Frame 0 is still the reduced-motion frame and `it2` is still hidden under reduced motion. *(Constraint)*
- **R5. Paint order is kept.** The trees, crane, fence and roof that were `island-front` still paint over the trucks, and the trucks still paint over the road. *(Constraint: same place)*
- **R6. Not heavier.** `hero-island.svg` is at most today's 83,485 bytes raw and 18,299 bytes gzipped, and the home page stays inside the redesign spec's §12 budget. *(Constraint: no heavier art)*
- **R7. Every shade change is listed.** Each legacy color the island loses maps to a named world color in the table in [Colors](#colors). No pixel changes shade for a reason that isn't in the table. *(Outcome: each change of shade is deliberate)*
- **R8. One piece at a time.** Each slice in [Slices](#slices) is its own PR with before and after previews at 1× and 4× and a screenshot of the home page at 1440px and 390px (no horizontal scroll). Each slice removes the pixels it replaces from `island-base` or `island-front` in the same PR, so nothing is ever painted twice. *(Constraint)*
- **R9. The proof changes with the promise.** The island stops being pixel-identical to `scripts/fixtures/pixel-art/hero-island.src.svg`, so the tests that say so (engine spec R10 and R11 for the island, and the island case in `scripts/e2e/art.e2e.mjs`) are replaced in the first slice that changes a shade. The new tests check R1 to R6 and R10, not pixels. *(Constraint; see C2)*
- **R10. The island is still decorative and safe.** `HeroIsland.astro` still inlines the SVG with the same classes, and the SVG carries no script, link, text or external reference. *(Constraint: accessibility, public safety)*
- **R11. The library and the skill keep up.** New objects are added to the `library-demo` test list when they appear there (skill, "Adding to the library demo"). The last slice removes the island's legacy section from `.claude/skills/pixel-art/SKILL.md` and the README mentions of `island-base` and `island-front`. *(Outcome)*
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

- **Ground.** 36 tile positions on a `[col, row, 0]` grid. Positions on the two front edges (`col = 5` or `row = 5`) are `block` `[1, 1, 1]` (grass top, soil sides, so the soil shows). The rest are flat `tile`. Back-edge sides are never seen, so they stay flat.
- **River.** `water` tiles along the river's course, which carry the `wf` surface loop themselves. The waterfall's falling face is a small new object at the front-right edge, with the same `wf` frames.
- **Road.** A new flat `path` tile (top `path-2`, with a surface of `path-1` and `path-3` specks like `tile`'s), placed along the road.
- **Bridge, house, fence, crane.** New sprites, each within 64×64 and 12 colors, drawn from the existing shapes. The crane is about 44 wide and 65 tall, so it is drawn as two stacked objects (mast, then jib and hook), or trimmed by one pixel row if the plan finds it can.
- **Trees.** The existing `tree` library object, with a small variant added if a second size is needed.
- **Shadow.** A sprite of the dithered shadow under the island, in `path-1` and `path-2`.
- **Animated pieces.** `flag` and `hearth` swap their keys to world names and drop `legacy: true`. This changes no pixel (the values are equal). The `waterfall`'s 82-wide map is mostly empty. Its sparkles are carried by the river's `water` tiles and the new falling-face object, so the 82×45 sprite is retired.
- **Trucks and clouds.** Same shapes, world keys (see below). `truck-green` stays a recolor of `truck` (`extends: 'truck'`).
- **Order.** Ground, shadow, river, road, bridge, house, back trees, the trucks (`itruck it1`, `itruck it2`), then the front pieces (front trees, crane, fence, roof pieces, hearth, flag), then the clouds. The front pieces cannot be sorted by `col + row` with the trucks, because the trucks move. They are listed after the trucks on purpose (R5).

### Colors

No new world colors are needed. The tier stays at 32. Every legacy color on the island maps to the nearest world color. Colors that already equal a world value (21 of the base's 33 and 16 of the front's 20) change nothing. The rest:

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
| `c-6f9a6e`, `c-2e4f33`, `c-3f6b45` | green truck | `grass-3`, `grass-4`, `grass-4` | to be measured in the slice | green truck |

Distance is plain RGB distance (0 to 441). In all, 4,901 of `island-base`'s 14,433 painted pixels (34%) and 207 of `island-front`'s 1,958 (11%) change shade. The biggest visible effect is that the grass loses some of its subtle variety, because 11 greens fall onto four ramp steps. Pieces drawn fresh from tiles will not reproduce the old checkerboard pixel for pixel anyway; the `tile` library object's own surface specks stand in for it (C3).

### Slices

Each slice is one PR, in this order. Early slices are small and low-risk, so the process is proven before the large ones.

1. **Free swaps (no visible change).** `flag` and `hearth` to world keys. A test shows they paint the same pixels.
2. **Clouds.** Three clouds to world colors. A visible, tiny shade change.
3. **Trucks.** `truck` and `truck-green` to world colors.
4. **Ground and shadow.** The 36 positions and the shadow. The matching pixels leave `island-base`.
5. **River and waterfall.** `water` tiles and the falling face. Retires the 82×45 `waterfall`.
6. **Road and bridge.**
7. **House.**
8. **Front pieces.** Trees, fence, crane and roof pieces. `island-front` is empty and deleted.
9. **Clean-up.** `island-base` is empty and deleted. The fixture, the identity tests and the e2e case are removed, and the skill and README are updated (R11).

The first slice that changes a shade (2) also replaces the identity tests (R9), because they cannot pass any more.

### Files touched

`src/assets/pixel-art/source/objects/` (new and removed objects), `scenes/hero-island.mjs`, the compiled `hero-island.svg`, `scripts/pixel-art-roundtrip.test.mjs`, `scripts/pixel-art-engine.test.mjs` (library list), `scripts/e2e/art.e2e.mjs`, `scripts/fixtures/pixel-art/hero-island.src.svg` (removed last), `.claude/skills/pixel-art/SKILL.md`, `README.md`. Not touched: `pixel-art.css`, `HeroIsland.astro`, `hero.css`, the palette, the engine.

## Areas of concern

**C1. The intent is bigger than this spec.** The intent lists five outcomes. This spec delivers the island half of "one palette" and all of "the island is made of pieces". The legacy tier cannot be emptied yet, because the Range sprite's base character still uses it, so `legacy` stays in the engine after this work. *Owner decides:* confirm this spec covers only the island, with the editor outcomes and the base character as separate specs in this folder.

**C2. The old safety net contradicts the new goal.** The engine spec makes the island pixel-identical to its fixture (R10, R11) and the browser check compares it too. The follow-ups intent deliberately changes shades and allows a redraw. Both can't hold. *Proposal:* retire the identity checks for the island in slice 2, keep the fixture as the "before" reference until slice 9, and replace the proof with structural tests (R1 to R6) plus the owner's review of previews. *Owner decides* whether to accept that the pixels are then judged by eye.

**C3. Shade changes are real, and the palette is full.** Mapping to the nearest world color changes 34% of the base's pixels (the table), and the grass is the most affected. The world tier has 32 of 32 colors, so keeping a shade means dropping another. *Owner decides, per slice:* accept the nearest color, ask for a redraw with the available ramp, or approve a palette swap-in (one color out, one in, in its own reviewed commit).

**C4. The 64×64 cap against two pieces.** The crane (about 44×65) is one row over, and the waterfall (82×45) is wider. The cap is a hard rule for new art (engine spec R27), and the legacy exemption only covers imported objects. This spec splits the crane and retires the waterfall sprite. *Owner decides* if a one-row overage on the crane should instead get an exemption.

**C5. The truck path is hard-coded.** `idrive` in `pixel-art.css` moves the trucks by fixed offsets from `px [31, 6]`. The road has to stay on the same line, or the CSS changes in the same PR. This spec keeps the road, so no CSS changes (R4). A redrawn road that moves is out of scope here.

**C6. Size could rise.** 36 ground positions, each with surface specks, compile to many more rects than one big map. R6 caps the result at today's size. If it doesn't fit, the plan may have to use bigger blocks (a `[2, 2, 0]` fits the 64 pixel cap) instead of single tiles. *Proof:* each slice reports raw and gzip size.

**C7. Two palettes persist until the base character moves.** Between slices, and after the last one, a piece of legacy art (the Range sprite) sits on the same page as the migrated island. That is the same situation as before and doesn't get worse.

## Open questions

Carried forward from the [intent](intent.md):

| # | Question | Answer here |
| --- | --- | --- |
| 1 | The legacy tier: delete it entirely once empty, or keep it empty? | **Carried.** It is not empty after this work (C1, C7). Decide in the base-character spec. |
| 2 | Draft differences: show only, or merge row by row? | **Carried.** Not part of the island work. |
| 3 | Palette swaps: still wanted? | **Carried.** Not part of the island work. |
| 4 | The base character: after the island, one piece at a time? | **Carried.** Starts after slice 9. |

New:

| # | Question | Recommendation |
| --- | --- | --- |
| N1 | Take the nearest world color everywhere, or redraw where it looks worse? | Nearest first, and redraw only where a preview shows a real loss (C3). |
| N2 | One PR per slice, or merge the three small recolors (1 to 3)? | Slice 1 together with 2 is fine, since slice 1 changes nothing. Keep trucks separate. |
| N3 | Keep the old fixture until the end, or drop it at the first visible change? | Keep it until slice 9, as the "before" reference (C2). |
