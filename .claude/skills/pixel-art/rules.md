# Rules on the hero island and the Range

Part of the `pixel-art` skill ([SKILL.md](SKILL.md)). Read it before you pick an approach for anything on the hero island or the Range.

**Find the rules on your objects first.**
- Read the table for your scene below, and run `grep -rn '"<name>"' src/assets/pixel-art/jlawcordova.pixellab/scenes/` for where each object is placed.
- If your approach would break a rule, say so before you build it. Since Pixel Lab v0.6.0 no test checks these (spec R18), so render and check them yourself.
- Never edit a test to make it pass.

## Rules on the hero island

These were pinned by `scripts/pixel-art-island.test.mjs`, which left the site with Pixel Lab v0.6.0 (spec R18); the engine still enforces its own R13 and R28. They're still the art's rules: keep them, and check them with renders (`scene_render --time` for the loop) before you report.

| Group | Pins |
| --- | --- |
| All | Every placed object ≤ 64×64, ≤ 12 colors, world colors. No `ink` (R2). R6: the island within 750 KB raw and 150 KB gzip. |
| Land | The 132 ground positions in three sections; the edge piece at each position by its neighbours (left cliff, right cliff, corner, inland), the library edge pieces each pinned to `block` with only its corner column changed; the joint test on `closeup-land`; `path` faces `{ top: 'path-2' }` with surface keys `path-1`, `path-3`, `cream` in that order; each top (`path`, `river`, `track`, `track-mine`, `level-crossing`) laid on its cube in the cube's group; no block has an `edge`; R28 (top > left > right) on every block; R13 library sizes and the library-demo object list; `island-shadow` stays outside the ground. |
| Water | `river` is a flat `water-2` tile with five `wf` frames, in world colors. `block-river` is `block-right` with a water band, pinned like the other edge pieces. `waterfall-face` keeps exactly 2 layers (a static map, then `wf` ×5), sits at tile `[5, 3, 0]` right after a river tile, and every `flag` pixel lands on it. |
| Entrance | Every item sits in one top-level `enter` group: one `shadow` (24 pieces), 132 `ground` groups, `object` groups whose `data-x` is each item's foot (shades take their tree's, the crane's jib and hook the mast's), one `sky`. R2: the settled island paints what flat inland tiles would, in every loop frame. The ground paints row by row. The island and the close-ups are in depth order, and no moving piece is drawn in copies (`check`: no `out_of_order`, no `copies`). |
| Clouds | R7: `cream`, `path-2` and `path-3` only, never `path-1` (spec C4). Each keeps its ambient loop (the drift). |
| Trees | R3: pinned positions; each trunk foot on grass, not river, road or track. R7: wherever a shown truck crosses a tree in the loop, the one further forward (larger col + row) draws later. |
| Office | `house` anchor `[21, 41]` at `[-59, 59]`; it covers tile `[0, 3]` except `-34,31` and `-34,32` (checked before the next pin, so a worktree can confirm the mask while it fails); a world color at x −35, y 30–32. |
| Crane | The same world colors at both ends of the mast's top row and of the jib's anchor row. The jib's anchor sits one pixel above the mast's top-left pixel; the jib paints the pixel above the hook's rope (`crane-hook` column 9, row 0); mast + jib > 64 px; the jib's motion poses are `crane-jib-side` and `crane-jib-back`, the hook's `crane-hook-low` and `crane-hook-drop`. Each column of `boxes` stands on grass. R7: `flag` and `crane-box` keep their loops and frame counts, in world colors. |
| Bridge | The river bridge at [2, 3] paints over the ground. `library-demo` places `bridge`. |
| Trucks | Four `truck-open` items (flat, or tipped) share the line. At every 50 ms of the loop a shown truck's road point keeps x + 2y at 80 (road level). In depth order, back to front: `gate-far`, `signal-far`, `truck-far`, the train cars, `signal-near`, `gate-near`, with the other trucks before `signal-near`. No truck is on the crossing with the train, and while a car is on it both gates are down and both signals lit; at rest they're up and dark. `truck-green` still `extends: 'truck'` with no map of its own. |

## Rules on the Range

These were pinned by the Range art tests that left the site with Pixel Lab v0.6.0 (spec R18). They're still the art's rules: keep them and check them by render. `scripts/range-change.test.mjs` still checks the hop: one `character` layer per class, with a `hop` action in whole pixels.

| Group | Pins |
| --- | --- |
| Classes | R1: each `data-class` group places the outfit named for its class (`outfit-<class>`), in `rangeClasses` order from `src/data/home.ts`. R12: as many groups as entries, and `range.css` shows each one. R2 (roundtrip): each group places exactly one object that extends `character`, its own `outfit-*`, and no outfit is placed twice. |
| Characters | Knight (R14, R27, Q6): validates, `extends: 'character'`, figure ≤ 24×32, world colors plus at most 4 outfit colors, and `outfit-preview` places every outfit (7). |
| Scene | Outside the groups, only `island-shadow`; every top-level group is a `data-class`, seven of them, each with its character and a floor set no other class uses. Each floor is three `ground` groups, rows 0–2 in order, of three one-level `block` cubes on their own row, by column, before any `object` group. Each `object` group's `data-x` is its first object's foot. R3: no object the scene places paints `ink`; R7: viewBox `[-51, -9, 103, 72]`; R8: `range-sprite.svg` ≤ 200 KB raw and 50 KB gzip. |
| CLI (historical) | R38: `--check outfit-front-end` prints `11 colors (of 12)` and `--check scenes/range-sprite` prints the scene's item and object counts (`40 items · 23 objects` with the lab), so every new setting changes that line; the main session re-pins it. R38 also breaks `character`'s `a: 'soil-4'` and expects `outfit-ux-design` to fail, so `outfit-ux-design` must keep using the base's `a`. |
| Editor (historical) | The R17 and R27 cases read their sample from the sources: R17 needs at least one outfit with a painted row it doesn't override, and R27 needs the knight to stay under 12 colors, so the meter has room for one more. The responsive check opens `outfit-security-governance`. |

## Silhouettes, anchors and loops

- **Keep silhouettes that tests read.** When you remove an outline, recolor its pixels with the neighboring face's darker shade rather than erasing them. These shapes are read by tests:
  - the trucks' lowest pixel in each column (the road line);
  - the house's mask, which covers the tile at `[0, 3]`;
  - the bridge deck, which counts as road (paint plank gaps, don't open holes);
  - the feet of `boxes`, which must stand on grass;
  - the flag's streaks, which must land on `waterfall-face`.
- **Prove the mask is kept.** When a redraw must keep a silhouette, have the generator compare the new map's mask with `HEAD`'s and refuse any difference. When you remove a post or strut that touches a deck or top edge, keep its last pixel in the edge's color, or the mask gets a hole.
- **Grow objects upward or away from water and road.** Keep the anchor on the foot. Keeping or shrinking a map is fine when it reads better (the crane's box kept its size by raising its travel). The `boxes` stack stands only 2–3 px clear of the river, so no column of it may reach lower than its lowest pixel in that column today. If a map grows, keep the anchor on the same ground point.
- **Loops.** Keep each loop's name, prefix and frame count: `wf` ×5, `ff` ×4, `hf` ×6.
  - Frame 0 is the reduced-motion frame, so make it the rest pose.
  - Don't add `class` layers to an island object: the island test counts the groups the CSS animates.
  - `art preview` renders frame 0 only. Look at each frame with `object_render <name> --frame <k>`, or at a moment of a scene's loops and motion with `scene_render <scene> --time <ms>`. Play them in Pixel Lab's timeline. To save frames side by side as one review image, write scratch copies with the frames rotated (`<name>-f<k>`) and place them in a scratch strip scene.
  - A surface repeats every tile, so a 5-frame drift can't slide seamlessly: fade crests in and out instead, or move a whole period. A streak moving 2 px a frame loops seamlessly on a period of 2 × the frame count (10 rows for `wf`, 8 for `ff`).
