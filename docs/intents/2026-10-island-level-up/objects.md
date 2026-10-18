# Island level up: new objects

The objects the [intent](intent.md) needs that the pixel-art library doesn't have yet. The owner approved all 19, the optional ones included, on 2026-10-18, and the spec takes them as its object set. Sizes are rough, in pixels or tiles.

## Mining section (L–B side)

| # | Object | What it is | Moves |
| --- | --- | --- | --- |
| 1 | `tunnel-road` | Stone arch portal at the L–B edge, where the road goes in. Stone in the `path` ramp (the palette has no grey). About 1×1 tile, 1 level high. | No |
| 2 | `conveyor` | Open belt on trestles, one tile per segment so it can run any length along one axis. The mining conveyor, and again at ground level for the boxes leaving the processor. | Belt runs (frame loop) |
| 3 | `ore` | One chunk of filtered ore: a dark rock with a gold fleck, about 5×4. Rides the conveyor, falls into carts, fills the trucks and drops into the hopper. | Moved by the scene |
| 4 | `ore-screen` | The filter where the conveyor ends: a grate the ore drops through into the carts. Optional; without it the ore just falls off the belt's end. | Shakes (optional) |
| 5 | `mine-cart` | Small open cart on the narrow track. Frames: empty, loaded, tipped to dump. | Rolls, tips |
| 6 | `track-mine` | Narrow-gauge mine-cart track tile: wooden sleepers and two thin rails, flat. | No |

## Today's island (middle)

| # | Object | What it is | Moves |
| --- | --- | --- | --- |
| 7 | `truck-open` | An open-top truck (a tipper) replacing today's box truck: the same cab, an open bed that shows 0 to 4 ores, and a tipped-bed pose. `truck-green` becomes its recolor. | Drives, waits, tips |
| 8 | `hopper` | A funnel on legs that takes the truck's ore, past the river bridge. | No |
| 9 | `processor` | The covered conveyor: a housing over the belt, about 2 tiles long, with a green LED panel. Ore goes in one end, boxes come out the other. | LED glows (frame loop) |
| 10 | `parcel` | One cardboard box, about 8×8, for the belt. Today's `boxes` is a stack and `crane-box` hangs from a rope, so neither works alone. | Moved by the scene |
| 11 | `container` | A shipping container (the "container van"), about 2 tiles long. Boxes go in at its open end; the crane lifts it onto the train. | Lifted by the crane |
| 12 | `crane-hook` | The crane's rope and spreader with no load, so the container can hang from it. Replaces `crane-box` on the island. | Swings with the load (today's `hf` loop) |

## Rail section (T–R side)

| # | Object | What it is | Moves |
| --- | --- | --- | --- |
| 13 | `track` | Railway track tile: ballast, sleepers and two rails, running T–L to B–R. | No |
| 14 | `block-rail` | The cliff cube where the track meets the island's edge, hanging a ballast band down its side, like `block-road` and `block-river`. | No |
| 15 | `tunnel-rail` | The underground tunnel mouth at the T–L side: a ramp cut into the ground with a portal, where the train comes up. | No |
| 16 | `bridge-road` | The road bridge over the tracks: a deck with rails on two piers, at road level. Today's `bridge` is a wooden footbridge over the river. | No |
| 17 | `locomotive` | The train's engine, about 2 tiles long. | Drives |
| 18 | `flatcar` | A flat wagon the container is set down on. | Drives |
| 19 | `boxcar` | A closed wagon behind the flatcar, as the canvas draws (a brown wagon). Optional. | Drives |

## Reused as they are

The ground blocks and their edge pieces (`block`, `block-left`, `block-right`, `block-road`, `block-river`), `path`, `river`, `waterfall-face`, `bridge`, `bridge-rail`, `house`, `crane-mast`, `crane-jib`, `boxes`, the trees (`tree`, `tree-small`, `pine`, `tree-shade`), `flower*`, `pebble`, `fence`, `flag`, the clouds and the island's shadow pieces.

## Changed

- `truck` and `truck-green` give way to `truck-open` and its recolor (7).
- `crane-box` gives way to `crane-hook` carrying the `container` (11, 12).
