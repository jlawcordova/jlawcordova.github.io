# Spec: The art moves to Pixel Lab's depth order (from intent.md 2026-10-21)
Status: approved (the owner approved ahead of review; reviewed once, in the final PR).

This change adopts the lab's [depth order](https://github.com/jlawcordova/jlawcordova-lab/blob/main/docs/intents/2026-10-depth-order/spec.md) (lab spec R1–R16), following its [notes for the site](https://github.com/jlawcordova/jlawcordova-lab/blob/main/docs/intents/2026-10-depth-order/site-notes.md). It supersedes the site's [pixel-art engine spec](../2026-10-pixel-art-engine/spec.md) where that says items paint in source order and can be raised or lowered by hand.

## Requirements

- **R1. The site pins Pixel Lab v0.5.0.** `package.json` and `package-lock.json` install `pixellab` from the lab's `v0.5.0` tag, never a commit. `npm run pixellab -- scene sort --help` works, and `npm run pixellab -- help` lists no `scene raise`. *(Outcome: the site runs on v0.5.0)*
- **R2. The art looks as the owner approved it.**
  - Every scene's preview at rest is pixel-identical to what v0.3.0 drew, except where R7 brings a close-up in line with the island.
  - The hero island is pixel-identical to v0.3.0 at every moment of its 28 s loop, checked every 250 ms and again every 50 ms.
  - Any other visible change is listed for review with a before/after render. *(Outcome: the art looks as the owner approved it)*
- **R3. The art files are in depth order.** `npm run pixellab -- check` has no `out_of_order` warning, and `scene sort --all --dry-run` changes nothing. *(Outcome: the art files are in depth order)*
- **R4. The scenes say where things stand.** Where depth order alone draws a piece wrong, the scene gives it a `level`, a `footprint` on its object, or the `front`/`back` override (D3). No item is reordered by hand to fix a sort. *(Constraint: prefer heights and overrides)*
- **R5. No regrouping.** The island's entrance groups are as they were: the same groups, attributes and members, with only their order in the file changed. The crane keeps its three groups. Every moving piece stays alone in its own `enter` group, so `check` reports no `copies`. *(Constraints: group the crane only if nothing else works; keep moving pieces alone)*
- **R6. Sizes.** Every SVG compiles lossless and within its budget; `hero-island.svg` stays within its 768,000-byte budget, which doesn't change. *(Constraint: keep the island within its budget)*
- **R7. The close-ups match the island.** Each close-up gives its items the levels and overrides of the island items it shows, lists them in the island's order, and is in depth order. The close-up test is unchanged and passes. *(Outcome: the close-ups still show the island as the island shows it)*
- **R8. The build-up is unchanged.** With the shipped `TIMING` and `RANGE_TIMING`, every piece starts when it did. The lab's `random` order, which seeds each piece by its index in the SVG, reshuffles; the PR says how much. *(Constraint: no change to how the island builds up beyond what the new order does)*
- **R9. The docs describe depth order.** The `pixel-art` and `pixel-art-motion` skills, the `pixel-artist` agent, the README and the tests' comments describe depth order, the override, `level`, `footprint` and `scene sort`, and that an edit re-sorts the scene and can change paths. Nothing mentions raise, lower, `--index` or listing a scene back to front by hand. The pixel-art engine spec gets a one-line pointer here. *(Outcome: the docs, skills and agent describe depth order)*
- **R10. Tests.** A test that pins the list's order follows the new order, with the same strength. A new test checks that the island and the close-ups are in depth order and that no moving piece takes more than one place, which is what lets the island tests read the list as the paint order at every moment. *(Constraint: don't weaken a test)*
- **R11. Verified.** `npm run art` (every file lossless, none over budget), `npm test`, `npm run build`, `npm run e2e` and `npm run pixellab -- check` pass, and the home page is screenshotted at 1440px and 390px with no horizontal scroll. *(Constraint: the site's usual checks all pass)*

## Design

### D1. The pin

`"pixellab": "github:jlawcordova/jlawcordova-lab#v0.5.0"`, installed with `npm install --save-dev` so the lockfile resolves the tag to its commit (`022e5a0`, the tag's target). The tag's own `package.json` says `0.0.0-dev`, so the lockfile shows that version; the tag and the commit are what pin it.

### D2. Why the new engine draws some art differently

Measured on the unchanged document with v0.5.0, before any edit: the sort would move 82 items in eight scenes, and 555 published pixels change at rest in seven (`hero-island` 281, `closeup-water` 124, `closeup-front-trees` 76, `closeup-office` 36, `closeup-crane` 20, `closeup-road-end` 12, `closeup-land` 6; `range-sprite` moves 4 items and no pixel). Across the island's loop, up to 650 pixels differ at one moment. Every island change is a regression from the hand-tuned order:

- **Riders sort behind what carries them.** Every pixel-placed item stands on level 0 until it has a `level`, and its box comes from its anchor, so ore in a truck bed or on a belt, stones on a belt, the train's container on its flatcar and the top lumps of the ore and stone heaps all sort behind their carrier.
- **The crane.** The jib, drawn 40 px above its foot at level 0, sorts far back, and the mast's group (mast and jib) with it, so the foundation covers the mast's foot.
- **The shadow** draws over the waterfall.
- **The bridge rail** sorts under the bridge (same tile, the bridge is taller).

Two facts about the engine shape the design:

- **A pixel item's `level` moves it only in depth.** At the same pixel point, one level more moves its box by one tile on each axis toward the viewer, so where it draws doesn't change. It's the tool for riders.
- **On the island, nothing reorders while it moves.** The engine reorders a moving item only when it's alone in its list. Every tracked item on the island sits in its own `enter` group, so each piece keeps its place at rest for the whole loop, as under v0.3.0, and the SVG needs no copies. A piece's order against the others comes from its box at rest, and where two pieces only meet in the middle of the loop, from the order of the list.

### D3. The depth data

| Where | Data | Why |
| --- | --- | --- |
| The island's shadow group | `depth: 'back'` | under the whole island, the waterfall included (site notes step 3) |
| The Range's four shared `island-shadow` pieces (outside its class groups) | `depth: 'back'` | under every setting, as the island's; sorted alone they move after the class groups (no pixel changes today, but nothing would stop a deeper floor going under them), and with it `range-sprite.svg` is the v0.3.0 output, byte for byte |
| The bridge rail's group | `depth: 'front'` | over the bridge and the trucks crossing it; in v0.3.0 it already drew over everything it touches |
| Ore and stones that ride: `ore-wait-1`, `-2`, `ore-road-1`…`-4` (truck beds), `ore-hopper-1`…`-4` (the tipping truck), `ore-feed-1`…`-4` (the feed belt), `ore-belt-1`, `-2`, `stone-belt-1`, `-2` (the ore belt), `stone-reject-1`, `-2`, `ore-cart-1`, `-2` (the cart) | `level: 1` | over their carrier |
| The heaps' top lumps: stones at (−46, 84) and (−90, 103), ore at (−96, 103) and (−92, 106) | `level: 1` | over the lumps under them, and the belt riders that start in the heap |
| `hopper` | `level: 2` | over the feed belt and the feed ore on it, which is at level 1 |
| `jib` | `level: 2` | stands on the mast, about 2.5 levels up; 3 pulls the processor in front of the feed ore (4 pairs, 79 px over the loop) |
| `hook` | `level: 3` | hangs from the jib, over the container it lifts; 3 to 5 draw the same, 2 doesn't (406 px) |
| `mine-cart` | `footprint: [2, 1]` | in front of the ore screen it stands under (same foot, the screen is taller), behind the belt row in front of it |
| `container` | `footprint: [2, 2]` | the train's container sorts over its flatcar and under the locomotive |

**Footprints on large sprites.** The site notes suggest footprints on the house, the train, the crane mast and the tunnel pieces, so they sort by the ground they cover. A footprint grows from the anchor's tile toward the front (+col, +row), as a block's size does from its first tile. The site's sprites are anchored at their front foot (a building's front corner, a car's middle), so a footprint would claim ground in front of the sprite instead of under it, and the next object placed there would sort behind it. Measured one at a time on top of D3: the house [2, 2], locomotive [2, 1], boxcar [2, 1], `tunnel-rail-front` [2, 2], `tunnel-road` [2, 2] and `boxes` [2, 1] change nothing today; the flatcar [2, 1] (7,200 px over the loop), `tunnel-rail` [2, 2] (2,461 px) and the processor [2, 2] (518 px) break the art. So only the two footprints the sort needs are added. Giving footprints their meaning would mean anchoring large sprites at their back tile, which is new art work (Areas of concern).

### D4. Applying the data: one pass, then one sort

Each CLI edit re-sorts the whole scene. Sorted with only part of the data in place, the minimal-move sort takes pieces that only meet mid-loop out of the old order, and later sorts keep them where they landed: the ore riding the belt draws under the belt's corner, the train over the tunnel mouth's front. Measured on a copy, sorting first and then adding the same final data one command at a time leaves 23 pairs out of the approved order, 12,856 px over the loop and 64 at rest. Adding all the data first and sorting once leaves none.

So the data is added in one pass to the unsorted files, without moving a line: `level` and `depth` keys by hand (a script that writes them with the engine's own serializer, so the files stay canonical), the two footprints with `object footprint`. Then `npm run pixellab -- scene sort --all` sorts every scene once. This departs from the brief's order (sort, then fix) for the reason above, and it only adds fields: no line is reordered by hand.

### D5. The close-ups

They place island items with no groups, ids or motion, and the close-up test keys each by object, class and `at` (so `level` too) and checks it against the island's flattened order.

- Each close-up item gets the `level` of the island item it shows, and the override of that item's group (the shadow pieces `back`, the rail `front`). Where tracked island items share a place with an id-less one (the heap stone at (−46, 88) and the two `stone-reject` riders), the close-up's item is the id-less one.
- Sorted on their own, the close-ups settle some pairs that never overlap (a cloud and a pine, the house and a tree shade) in another order than the island, and the test fails. So each close-up is put in the island's order, which is already a valid depth order for it (`scene sort` moves nothing).
- One pixel change: `closeup-water` and `closeup-front-trees` listed the heap's top stone before the stone under it, the reverse of the island (the test didn't see it, because the `stone-reject` riders share that stone's key). Depth order now draws the top stone over the heap, as the island always has: 2 px in each.

### D6. Tests

- "The 24 shadow pieces are pinned" and "the front pieces and trees are pinned" compare the list's sequence; they get the new sequence (two shadow pieces swap, and the rail moves to the end with the front band). Their positions don't change.
- New, in the island tests: the island and each close-up are in depth order (`isInDepthOrder`), and the island's motion takes no copies (`motionCopies` is empty), so its list order is the paint order at every moment, which the truck and tree tests rely on.
- The comments that say "in paint order" say "in depth order (the paint order)".

### D7. Docs

- `pixel-art` skill: scenes are kept in depth order; how depth is worked out (boxes from where an item stands, `level` for a pixel item, `footprint` for a sprite and the front-anchor caveat, groups as one object, moving items in groups keep their rest place); the override; `scene sort` and `check`'s `out_of_order` and `copies`; edits re-sort and return new paths (`reordered`), so list again; no raise, lower or `--index`; new items placed with `scene place` go where they stand. The library-demo note ("list it right after that block") and the Range's order inside a class group follow.
- `pixel-art-motion` skill: groups are in depth order; a new piece goes in its own `object` group and the sort places it; why moving pieces stay alone in their group.
- `pixel-artist` agent: `scene_set --depth` and `--level` replace `scene_raise`; the truck pins say "draws behind/in front".
- README: scenes in depth order.
- The pixel-art engine spec: a one-line pointer to this spec beside "Items paint in source order".

### D8. The build-up

The shipped orders read each group's data, not its index. Compared piece by piece between the committed and the new SVGs: with `TIMING` and `RANGE_TIMING` no piece starts at another time, and with every ground and object order the lab offers, only `random` for the objects changes, for 34 of the island's 219 pieces. `range-sprite`'s enter groups keep their indexes (the four items the sort moved are its shared shadow pieces, which sit outside the enter groups, and `depth: 'back'` puts them back first).

## Areas of concern

- **Footprints against the site's anchors.** The site notes favour footprints on large sprites, but with front-foot anchors they would describe ground in front of the sprite (D3). The spec adds none for that purpose and records the numbers. If the owner wants footprints to mean ground, large sprites would need back-tile anchors: new art, out of scope here.
- **The two footprints that are added** (`mine-cart`, `container`) are there to win a sort, not to describe ground. They are named in the PR's decisions with the alternatives.
- **Editing by hand.** The brief says to edit through the commands, or by hand where the skill allows. D4 adds `level` and `depth` keys by hand (scripted, with the engine's serializer) because the commands can't add data without sorting. In a worktree the skill allows source edits, and no line is reordered. The PR records it.
- **Overrides are blunt.** `depth: 'front'` on the rail draws it over anything ever placed in front of it; a pixel placement at level 1 draws the same today but moves the rail's foot from (−16, 48) to about (−5, 52), which changes its group's `data-x`/`data-y`, its entrance timing and a pinned test. The PR lists both.
- **The island's motion order is fixed.** Because moving pieces are grouped, lab spec R10 (reordering while moving) never applies on the island. That keeps the old behaviour and the size, and a test now guards it.

## Open questions

- From the intent: none. The owner's choices are taken as the lab spec and site notes favour, and listed in the PR.
