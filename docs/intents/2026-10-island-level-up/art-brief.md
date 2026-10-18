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
| 9 | `track`, `block-rail`, `flatcar` |
| 10 | `locomotive` |
| 11 | `boxcar` |
| 12 | `tunnel-rail` |
| 13 | `bridge-road` |

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

`scenes/island-level-up-objects.mjs` is a preview-only 12×9 board of grass tiles. Place your object (and its poses and variants) on it, at or near your home tile below, after the floor tiles, keeping the placed items in paint order (by `col + row`). Move to a nearby free tile if something's in the way. The board is the only scene a run may edit.

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
