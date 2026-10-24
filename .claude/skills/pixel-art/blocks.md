# Blocks, sides and edges

Part of the `pixel-art` skill ([SKILL.md](SKILL.md), whose [Blocks](SKILL.md#blocks-kind-block) section has the format). Read it before you draw a block's sides, convert a cube sprite into a block, or touch the cliffs' edge pieces.

## Geometry

- A cube's top-face center is (cx, cy). Its top spans x = cx−15 to cx+14.
- The left face is the columns x < cx (15 of them) and the right face x ≥ cx (15).
- Each column's side starts one pixel below that column's lowest top pixel (the engine's block faces; `object_render` shows them).

## `sides` maps

`sides` is `{ keys, left, right }`:
- Each of `left` and `right` is 16 columns × 16 rows and face-local: row 0 is one pixel below the column's top edge.
- A map repeats every 16 columns along a face and up every level.
- A 1×1 face shows columns 0–14. Leave column 15 plain, because it only shows on wider faces.
- A band that follows the top edge is simply the first rows of the map.
- Draw order is faces, then `sides`, then the top `surface`, then `edge`. `sides` are refused on flat blocks, and their colors count toward the 12-color cap.

## Converting a cube sprite into a block

A cube sprite is 30×32 with anchor `[15, 8]`.
- **Surface:** sprite rows 0–15 shifted right by one (sprite column c becomes surface column c+1), keeping only the top diamond.
- **Left:** column i (0–14), row r is `sprite[9 + ⌊i/2⌋ + r][i]`.
- **Right:** column j (0–14), row r is `sprite[16 − ⌈j/2⌉ + r][15 + j]`.
- Columns that share a bottom (left 2k and 2k+1; right 2k−1 and 2k) keep 2×2 speckles level.
- Write the result in canonical JSON (`object map set` for a map, or a script that writes the file the way the program does, then `check`).

## Joints on the cliffs

Where cubes line a cliff, each cube's two corner columns stay visible on *both* cliffs:
- **Left cliff:** left columns 0–14 plus right column 0 (dark), so a dark line shows at each joint.
- **Right cliff:** left column 14 (light) plus right columns 0–14, so a light line shows at each joint.

One map can't fix both, so the island uses separate edge pieces, all with no in-between color:

| Object | Where | Corner columns |
| --- | --- | --- |
| `block` | `[5, 5]`, every inland grass cube and the library demo | True corner: left col 14 left-face, right col 0 right-face |
| `block-left` | left cliff `[0–4, 5]`, except the road end | Right col 0 copies left col 14: the left band, then `soil-2` |
| `block-right` | right cliff `[5, 0–4]` | Left col 14 copies right col 0: the right band, then `soil-3` |
| `block-road` | road end `[2, 5]`, and inland under the road `[2, 0–4]` | As `block-left`, with a path band (`path-3`, last row `path-4`); the scene still lays `path` on top |
| `block-river` | river end `[5, 3]`, and inland under the river `[0–4, 3]`, behind the house too | As `block-right`, with a water band under the river top, in the water ramp |

Inland cubes' sides only show while the island's entrance floats them up; at rest the cubes in front hide them.

- Keep the corner columns free of speckles and drips, so the copies join cleanly.
- A copied corner column writes the other face's base key explicitly (`s` for `soil-2` on the right map, `S` for `soil-3` on the left), because `.` there shows the wrong face's color.
- **Checking a joint:** a joint is at x = `cx` on the left cliff and `cx − 1` on the right cliff, and the side rows run from `cy + 8` to `cy + 23`. Compare each row with the same cube's own corner column on that face (x − 1 on the left cliff, x + 1 on the right), not with the next cube's column, whose drips differ. Check it on `closeup-land`.
- Don't swap the corner colors: that only moves the line one column over.
- Never bridge a joint with an in-between shade such as `wood-3` (spec R7).
- Blocks can't `extends`, so the edge pieces repeat their maps. Generate them from one script, and change them together.
- **When the owner edits a block** in Pixel Lab, only that block's source changes, so re-apply their change to the block's variants yourself and say so in the report.
