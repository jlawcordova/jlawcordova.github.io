# Island level up: art brief

The shared brief for the `pixel-artist` runs that draw the [approved objects](objects.md), one run at a time ([design-scene skill](../../../.claude/skills/design-scene/SKILL.md)). A large object gets a run of its own, and small ones share a run, at most 3 per run (the owner's rule). The spec takes its decisions over once the scene is approved.

| Run | Objects |
| --- | --- |
| 1 | `ore` |
| 2 | `mine-cart`, `track-mine`, `ore-screen` |
| 3 | `conveyor` (both directions) |
| 4 | `tunnel-road` |
| 5 | `truck-open` (with its pose and recolor) |
| 6 | `hopper`, `parcel`, `crane-hook` |
| 7 | `processor` |
| 8 | `container` |
| 15 | `block-yard`, `block-yard-left`, `block-yard-right` (runs before 9, so `block-rail` can match it) |
| 9 | `track`, `block-rail`, `flatcar` |
| 10 | `locomotive` |
| 11 | `boxcar` |
| 12 | `tunnel-rail` |
| 13 | `bridge-road` |
| 14 | `block-mine`, `block-mine-left`, `block-mine-right` (next after run 6) |

Runs 14 and 15 were added by the owner on 2026-10-19: a patch of different ground for the mining section and stone paving for the rail section. Each is a floor set (inland cube and both cliff pieces), as in the `pixel-art` skill's Range settings.

## The line, in scene terms

The [intent](intent.md) describes the loop. On the grid (a tile at `[col, row]`):

- **Two axes.** The **row axis** runs up-right to down-left on screen: one row more is 16 px left and 8 px down. The road runs along it, from the stone tunnel at the L–B edge (the front-left) to the T–R edge. The **col axis** runs up-left to down-right: one column more is 16 px right and 8 px down. The river and both tracks run along it.
- **Mining section** (in front of today's island, toward the L–B side). The road goes into a stone box at the L–B cliff (`tunnel-road`): its dark arch opening is on its left face, toward the viewer, and trucks appear from behind its up-right end. A raised `conveyor` runs parallel to the road and ends over the mine-cart track at an `ore-screen`, where ore drops into a `mine-cart`. The `track-mine` runs along the col axis, from beside the road toward the B–R side. Carts roll up-left to the road end and tip toward the road (up-left) into the truck waiting there.
- **Today's island** (middle). The `truck-open` drives up-right along the road with its cab in front (at its up-right end), crosses the river bridge, stops beside the `hopper` just past it and tips its bed to its right (down-right, toward the viewer's right) into the hopper. The hopper stands on the up-left end of the `processor`, a covered belt running along the col axis with its green LED panel on its left face. Boxes (`parcel`) come out of its down-right end onto a ground-level `conveyor` (col axis) that carries them into the `container`'s hidden up-left end. The crane lifts the container with its `crane-hook` and sets it on the train.
- **Rail section** (behind today's island, toward the T–R side). The `track` comes up from `tunnel-rail` (a portal sunk in the ground, its dark opening facing down-right) at the T–L side and runs along the col axis to the `block-rail` cliff at the B–R edge. The road crosses it on `bridge-road`. The train (`locomotive` in front at the down-right end, then `flatcar`, then `boxcar`) waits by the crane, takes the container on the flatcar and drives off the B–R edge.

## Orientation per object

| Object | Long axis | Faces or opens | Poses |
| --- | --- | --- | --- |
| `tunnel-road` | row axis, about 1–2 tiles, 1 level or more high | arch on the left face | — |
| `conveyor` | one tile per segment | — | Two directions: `conveyor` on the col axis and `conveyor-row` on the row axis. Belt motion as an `ff` loop (4 frames, frame 0 at rest). Raised on trestles; the ground run can use the same object. |
| `ore` | about 3×3 to 4×4 px, so 4 fit in a truck bed | — | — |
| `ore-screen` | sits on the conveyor's end, over the track | grate toward the viewer | optional shake as `ff` |
| `mine-cart` | col axis, about half a tile | — | `mine-cart` (empty), `mine-cart-tipped` (tilted up-left) |
| `track-mine` | col axis, one flat tile | — | — |
| `truck-open` | row axis, about the size of today's `truck` | cab at the up-right end; bed open on top | `truck-open`, `truck-open-tipped` (bed raised to its right, down-right). `truck-open-green` is its recolor, like `truck-green`. |
| `hopper` | about half a tile, on legs | open funnel on top | — |
| `processor` | col axis, about 2 tiles | LED panel on the left face | LED glow as an `hf` loop (6 frames, frame 0 unlit or dim) |
| `parcel` | about 6×6 px | cardboard like `boxes` | — |
| `container` | col axis, about 2 tiles, fits on the flatcar | doors on the hidden up-left end, so no doors drawn | — |
| `crane-hook` | rope and spreader bar that the container hangs under | — | keeps `crane-box`'s `hf` 6-frame swing if it hangs a load |
| `track` | col axis, one flat tile (ballast, sleepers, rails) | — | — |
| `block-rail` | right-cliff cube under the track at the B–R edge | ballast band down its side | — |
| `tunnel-rail` | col axis, 1–2 tiles | dark opening facing down-right | — |
| `bridge-road` | row axis, one tile, at road level | — | — |
| `locomotive` | col axis, about 2 tiles | front at the down-right end | — |
| `flatcar` | col axis, about 2 tiles | — | — |
| `boxcar` | col axis, about 2 tiles | — | — |

A pose is its own object named `<name>-<pose>`, with the same anchor: `extends` with `rows` where the map stays the same size, else its own map. A recolor `extends` and lists only the keys that change.

## Scale and look

- Match today's island: the `house` is about 1.5 tiles, the `truck` about 21 px long, a `boxes` box about 8 px. Track gauge: rails about 6–8 px apart for `track`, 4 px for `track-mine`.
- The [Island and Range look](../../../.claude/skills/pixel-art/SKILL.md#island-and-range-look): world colors only, no outlines, no `ink`, lit top, mid left face, dark right face. Stone and steel are the `path` ramp.
- **Bytes.** The island grows to about three times its area within the 500 KB raw and 125 KB gzip budget, so keep each object lean: aim for 3 KB raw or less per placement (check with `npm run art -- --sizes island-level-up-objects`), and keep texture out of loop frames.

## The review board

`scenes/island-level-up-objects.mjs` is a preview-only 12×9 board of grass tiles. It reached its 100 KB preview budget at run 8, so the rail section's runs (15, 9, 10, 11, 12, 13) use a second board, `scenes/island-level-up-rail.mjs`, the same size, with their home tiles as listed below. Place your object (and its poses and variants) on it, at or near your home tile below, after the floor tiles, keeping the placed items in paint order (by `col + row`). Move to a nearby free tile if something's in the way. The board is the only scene a run may edit.

| Row | Home tiles |
| --- | --- |
| 8 (front) | `tunnel-road` [0, 8], `conveyor` and `conveyor-row` [2–3, 8], `ore-screen` [4, 8], `track-mine` [6–7, 8] with `mine-cart` on [7, 8], `ore` [9, 8], `mine-cart-tipped` [10, 8] |
| 5 | `truck-open` [0, 5], `truck-open-tipped` [1, 5], `hopper` [3, 5], `processor` [4–5, 5], `parcel` [7, 5], `container` [8–9, 5], `crane-hook` [11, 5] |
| 2 | `tunnel-rail` [0, 2], `track` [1–3, 2] with `locomotive` on it, `flatcar` [5, 2], `boxcar` [7, 2], `bridge-road` [9, 2], `block-rail` [11, 2] |

## Each run delivers

- The object's source (and its poses and variants) under `src/assets/pixel-art/source/objects/`, passing `npm run art -- --check <name>`.
- Its place on the review board.
- `samples/after-<name>.png` at @3x and @6x, and the board at @3x as `samples/board.png` (overwritten each run). Open every PNG and look at it.
- Lab links, one per object: `http://localhost:4321/lab/pixel-art/?object=<name>`, plus `?scene=island-level-up-objects`. The main session hosts the dev server: don't start one.
- `npm run art` with every file `lossless` and none `OVER BUDGET`, `npm test` with `# fail 0`, and the object's bytes from `--sizes island-level-up-objects`.
- No commits, no edits to `hero-island`, other objects, tests or the engine.

## Decisions from the runs so far

- `ore` is 4×4 px, anchor [2, 3]; four in a tight pile cover about 12×8 px, so a cart or truck bed needs an opening of about 12×6.
- `ore-screen`'s rim top is at z = 16 px and it stands only behind the track, so carts roll under it. The scene lists it before the carts and the falling ore.
- Both conveyors have their belt top at z = 16 px, one trestle per segment, and an `ff` cleat loop that steps 2 px across and 1 down. `conveyor-row` is shifted 2 units forward along its axis, so a run ending on the tile behind `ore-screen` meets its rim. A run paints back to front by col + row.
- Open for the scene review: ore reads faintly on the dark belt (a lighter `ore` base would fix it), and the boxes' ground run may want a low conveyor (belt at about z = 6) if the `processor`'s outlet and the `container` sit low. The `processor` and `container` runs say which.
- **Faces, corrected:** for an object long along the row axis, its long side toward the viewer is the right face (dark shade) and the left face is its short end; for one long along the col axis, the long side is the left face. The orientation table's "faces" column is read with this in mind.
- `truck-open` is 20×18 with its anchor on the ground under its centre; the cab is at the up-right end, so its long right side (dark) faces the viewer and the tailgate is the left face. `truck-open-tipped` shears the bed toward the viewer (down-right): its open edge is about 6 px above the road, so the `hopper`'s rim must be at that height or lower. The greens extend them with 8 keys.
- `hopper` is 20×16, anchor [10, 11]: its rim is at z = 6 (the tipped bed's lip) and its spout ends 1 px above the ground at its front corner, so the `processor` takes ore at ground level, with a low inlet at its up-left end under or just down-right of the hopper. The board places it 2 px up-left of a tile centre to meet the road's edge.
- `parcel` is 8×8 (6×6 vanished on the belt), anchor [4, 7]; on a belt it sits at the belt centre + (0, 2) and paints after the segments it overlaps.
- `crane-hook` drops in for `crane-box` at px [24, 17] with the same `hf` swing. In frame 0 its sling tips are at (21, 33) and (45, 45) on the island, so a `container` about 26–30 units long hangs with its top centre line from about (21, 34) to (45, 46), and paints before the hook.
- `block-mine` (with `-left` and `-right`) has a rocky `soil-1` top and the grass cubes' soil body, so a cliff stays one cliff with a different top band. It costs about 2 KB per cube. Don't lay it under `track-mine` (a grass-topped flat block). The wooden `mine-cart` has less contrast on it than on grass: watch that in the scene.
- `processor` is 47×30, anchor [20, 17] at a tile centre one column down-right of the hopper's tile; its low hood takes the hopper's spout at ground level, and it paints after the hopper. Its outlet is low: belt top at z = 6, on its down-right end at u +22…+24, so a `conveyor-low` (the conveyor family with its belt at z = 6) on the tile two columns down-right starts at the lip's end, and a `parcel` leaving it sits at the tile centre + (23, 7). One working height (z = 6) runs from the tipped truck's lip through the hopper and processor to the container.
- `conveyor-low` (24×16, anchor [12, 13], tile-centred, col axis) has its belt top at z = 6 on short legs, from the same generator as `conveyor`; it starts at the `processor`'s lip on the tile two columns down-right. The `container`'s opening must be at z = 6 too.
- `container` is 38×32, anchor [19, 22] at its footprint's ground centre: 28 units long (col axis), 12 wide, 12 tall, in the `roof` red ramp, sitting on the ground with its doorway (z 1–11) on the hidden up-left end. Under the hook it sits at the hook's px + (9, 35), so at px [33, 52] on today's island. The `flatcar` is drawn to carry this footprint.
- The rail section's objects go on `scenes/island-level-up-rail.mjs`.
- `block-yard` (with `-left` and `-right`): `path-2` pinwheel flagstones and an 8-row stone band (rows 0–7) over the grass cube's soil body (rows 8–15), about 1 KB per cube in a patch. `block-rail` swaps rows 0–7 of `block-yard-right` for its ballast band and re-copies left column 14 from right column 0.
- The rail board has about 26 KB of its 100 KB preview budget left after run 15, so the rail runs keep their board placements lean.
- `track` is a flat `path-3` ballast block (col axis): rails 8 units apart at v ±4, rail head at z = 1, about 1.3 KB per tile, laid over a ground cube like `path`. `block-rail` keeps the yard's 8-row band depth with a ballast band and a `soil-4` last row at row 7.
- `flatcar` is 42×27, anchor [21, 19] at its footprint's ground centre: deck 30 units long and 12 wide, top at z = 9, wheel discs at u ±7.5 and ±12.5 on the near rail, `soil-4` couplers 2 units long at both ends. The `container` goes at the flatcar's point + (0, −9).
- `locomotive` is 40×34, anchor [20, 26], dark green (`grass-3`/`grass-4`, `soil-4` front) with a `gold` frame stripe: 28 units long, 12 wide, cab top at z 22, its frame at the flatcar's deck height (z 7–9), the same wheels and couplers. A `flatcar` coupled behind it sits at the locomotive's px + (−32, −16), two tiles up-left along the col axis.
- `boxcar` is 42×38, anchor [21, 30], brown (`soil-2` sides, `wood-2` roof, `wood-1` walkway) on the flatcar's own frame, roof top at z 21, level with the container; it couples behind a `flatcar` at the flatcar's px + (−32, −16). The train is boxcar, flatcar with container, locomotive, two tiles apart along the col axis.
- `tunnel-rail` (back: the dark bore and a jamb strip) and `tunnel-rail-front` (the hill, vault, arch ring and left jamb) are both 64×57 with anchor [34, 41], placed on the same tile at the track's up-left end. The mouth is 16 units down-right of the anchor (the centre of tile [col + 1, row]); its opening is 20 wide with the crown at z 28. Paint order: `tunnel-rail`, then every car inside or crossing the mouth, then `tunnel-rail-front`. A car shows only once its front reaches the mouth. About 5.2 KB raw for the pair (a lean version without ribs is 3.8 KB).
- `bridge-road` is a girder deck (road top z 28, underside z 25, 3 px over the locomotive's cab) on the track tile [C, R], carried by `bridge-road-ramp` on [C, R+1] and `bridge-road-ramp-far` on [C, R−1], 2-tile stone embankments rising 14 px per tile, with plain ground cubes under them and ground-level `path` from [C, R±3] on. Paint the far ramp before the train and the deck and near ramp after it. A flat truck would float on the ramps, so trucks stay off them unless the owner decides otherwise.

## The owner's layout review (2026-10-19)

- **The train is smaller:** each car (`flatcar`, `boxcar`) and the `container` is one tile long, and the `locomotive` is about the size of a truck. The rail tunnel and the overpass shrink to suit the smaller train. These supersede the sizes recorded above for those objects.
- **The hopper, processor and container stand on the middle island** (today's island). **The crane stands on the rail section** and lifts the container from the middle island onto the train.
- **The rail section's ground is grass:** the stone yard is too strong. `block-yard` and its edges leave the island, and `block-rail` is rebuilt from the grass `block-right`.
- Redo order, one subagent at a time: container; flatcar and block-rail; locomotive; boxcar; rail tunnel; overpass; the scene's re-layout; the crane's poses; then the motion.
- `container` (redrawn): 22×22, anchor [11, 16] at its footprint's ground centre: 16 units long (one tile, col axis), 8 wide, 10 tall, doorway z 1–10 on the hidden up-left end. Slings 2 units in from each end land at anchor + (−6, −13) and (+6, −7).
- `flatcar` (redrawn): 28×17, anchor [14, 13]; deck 18×10 units with its top at z 6; one wheel disc per end at u ±5.5 on the near rail; couplers from u ±9 to ±10 at z 3–5. The container goes at the flatcar's point + (0, −6); coupled cars are spaced (20, 10) px apart along the col axis. `block-rail` (rebuilt) is the grass `block-right` with a 3-row ballast band, a `soil-4` last row and drips.
- `locomotive` (redrawn): 28×24, anchor [14, 19]; the flatcar's frame (18×10 units, deck height z 4–6, same wheels and couplers), hood to z 11, cab to z 17 with a steel roof. A `flatcar` behind it goes at the locomotive's px + (−20, −10).
- `boxcar` (redrawn): 28×26, anchor [14, 22], on the flatcar's frame, body 16×8 units to a roof top at z 16; behind a flatcar at its px + (−20, −10). The whole train is now 18×10 units a car, at most z 17 tall, cars 20 units apart.
- `tunnel-rail` and `tunnel-rail-front` (redrawn): both 46×41 with anchor [23, 29]; the mouth (14 wide, crown z 20) is 10 units down-right of the anchor, at anchor + (10, 5) px. Same paint order: back piece, cars inside or crossing the mouth, front piece; a car shows once its point is 10 units inside and is clear of the front piece 8 units out. About 3.3 KB for the pair.
- The overpass (redrawn): road top on the deck at z 23, girder underside at z 20, 2-tile ramps rising 11.5 px per tile; anchors [16, 34] (deck), [32, 31] (near ramp), [16, 23] (far ramp), same placement rules. **A `truck-open` can cross** if the scene rests it on the road height under its downhill end (about 7 units behind its centre going up the near ramp, 7 ahead going down the far one); on the deck it sits flat at z 23. Paint order: far ramp, a truck on it, the train, deck, near ramp, a truck on the near ramp or deck.
- The hook (redrawn, no `hf` loop) has three poses with anchor [5, 0] and the rope at px x + 9, gold spreader: `crane-hook` (23 px rope, carrying: container anchor at P + (9, 33)), `crane-hook-low` (47 px, pick-up and set-down on the ground: P + (9, 57)), `crane-hook-drop` (41 px, on the flatcar: P + (9, 51)). At the island's pick-up the hook goes at (87, −1) over `container-1` at (96, 56); at the drop, (135, −25) over the flatcar's container at (144, 26). The container paints before the hook.
- The jib has three poses, all placed at px [117, 4] on the island, swapped by show/hide in `crane-jib`'s slot after `crane-mast`: `crane-jib` (front, rope tip (96, −1), today's), `crane-jib-side` (+col, tip (144, −1); `crane-hook` at (135, −1) carries the container at (144, 32), which on screen hangs just over the train) and `crane-jib-back` (−row, tip (144, −25); `crane-hook-drop` at (135, −25) sets it on the flatcar at (144, 26)). About 2.2 KB each.

## The owner's animation review (2026-10-19)

The owner liked the loop and asked for:
- **The container arrives on the train,** with no pop-in: the train comes in carrying an empty container, the crane sets it down by the processor, the boxes go in, and once it's full the crane puts it back on the same train, which then leaves.
- **A wooden overpass** instead of stone.
- **Slanted truck poses** for climbing and descending the ramps, and the truck going down the far ramp painted behind the bridge, not in front of it.
- **The ore belt reversed:** ore travels from the lower left to the upper right, and the ore ground sits at the bottom-left of the mining section.
- **The `boxes` stack moved next to the processor,** away from the river.
- **A longer waterfall:** it falls about three blocks below the cliff.

Redo order, one subagent at a time: the wooden overpass; the slanted truck poses (to the new ramps' slope); the reversed ore belt; the longer waterfall; then the scene's layout and motion.
