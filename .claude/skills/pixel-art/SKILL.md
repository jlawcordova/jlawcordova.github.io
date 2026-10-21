---
name: pixel-art
description: Make, change or review this site's pixel art (the hero island, the Range sprite and its outfits, library objects and scenes) as text sources compiled by `npm run art`, looked at and edited through Pixel Lab (the `pixellab` MCP tools and CLI). Use whenever someone asks to draw, edit, recolor or check pixel art, an outfit or character, a library object, or a scene, to place or arrange objects in a scene, to propose an art change for the owner to approve in Pixel Lab, or to add art to the site. Works headless, with no editor and no browser.
---
# Pixel art

The site's pixel art is text. **Objects** (pixel maps) and **scenes** (objects placed on the grid, drawn back to front by where each stands) live in the site's Pixel Lab document, `src/assets/pixel-art/jlawcordova.pixellab/` (a folder: `manifest.json`, `palette.mjs`, `objects/`, `scenes/`), and `npm run art` (Pixel Lab's `pixellab art build`) compiles each scene with an `output` to an optimized SVG in `src/assets/pixel-art/`. The engine, the compiler and the CLI are the `pixellab` dev dependency, installed from the lab repo (`jlawcordova-lab`); `npm run pixellab -- <group> <verb> …` runs any of its commands on this checkout (the `--site .` is in the script, so it works in a worktree too). The design is in `docs/intents/2026-10-pixel-art-engine/spec.md` (D2–D6, R26–R30), the move to the document in `docs/intents/2026-10-art-to-pixel-lab/spec.md`, and depth order (Pixel Lab v0.5.0) in `docs/intents/2026-10-pixel-lab-depth-order/spec.md`.

**Never write or edit an output SVG by hand.** Output SVGs only ever come from the compiler. Change a source, then run `npm run art`.

## The design language (hard rules)

New art must fit the existing world. The engine enforces every rule here except the 6–8 color target.

- **Grid.** A tile is 32×16 pixels, 2:1 dimetric: every edge steps 2 pixels across for 1 down. One level is 16 pixels high, so a one-level block is 32×32 and reads as a cube. A tile at `[col, row, level]` has its top-face center at `x = (col − row) × 16 + ox`, `y = (col + row) × 8 − level × 16 + oy`, where `[ox, oy]` is the scene's `origin`.
- **Palette tiers** (`jlawcordova.pixellab/palette.mjs`):
  - **world**: exactly 32 colors, as seven material ramps of 4 shades (`grass-1` highlight … `grass-4` shadow, and the same for soil, wood, path, water, roof and gold), plus `ink`, `cream`, `skin-1` and `skin-2`. They were picked from the island's own shades. `npm run pixellab -- art preview palette --out .art-preview/palette.png` writes the swatch sheet: a row per material, shade 1 to 4 across. The tier is full, so a new color means dropping one.
  - **outfit**: at most 16 clothing colors (full: the `silver`, `violet`, `slate`, `orange`, `sky` and `navy` ramps, light to dark; a new color means dropping one), only for objects that extend `character`.
  - Colors are added to the palette by hand, in a reviewed commit. Brand entries keep their `src/styles/variables.css` values.
- **Light** comes from the same side as on the island: tops are the light shade, left faces the mid shade, right faces the shadow shade.
- **Size caps.** A map is at most 64×64. A character (`character`, or anything that extends it) paints a figure of at most 24×32 (raised from 16×24 for the Range class characters, so a held prop fits); the isometric base is 14×24, and the knight with its shield and sword 22×27. A prop too big to hold is its own `prop-<class>-<name>` object. An object uses at most 12 colors; aim for 6–8. Every object is held to these caps.

## Formats

Every source is a `.mjs` file whose default export is plain data, in the **canonical format**: the header comment, two-space indentation, single quotes, one map row per line and trailing commas. A test fails if a file isn't canonical, so start from `--new` or copy an existing file's layout exactly.

The examples below compile together against today's sources, as `objects/small-rock.mjs`, `objects/stone-block.mjs`, `objects/outfit-example.mjs` and `scenes/example.mjs` (a test checks this).

### Objects (`source/objects/<name>.mjs`)

Names are lowercase kebab-case. There are two kinds: `sprite` (pixel maps) and `block` (boxes on the isometric grid, drawn from numbers).

```js
// Pixel-art object. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  kind: 'sprite',
  anchor: [2, 3],
  keys: {
    g: 'ink',
    c: 'cream',
  },
  layers: [
    {
      map: [
        '.gg.',
        'gccg',
        'gccg',
        '.gg.',
      ],
    },
  ],
};
```

- **`keys`** maps one printable character (not space, not `.`) to a palette name. `.` is always transparent. Keys are case-sensitive: use a letter for a material and its uppercase for a darker shade of it.
- **`anchor`** is the map pixel that sits on the placement point. For something standing on a tile, put it at the bottom center.
- **`layers`** paint bottom to top, and every map in an object has the same size. A layer can carry `class: 'cbob'` (or any fixed class), which puts it in its own group for CSS to move.
- **Frame loops:** a layer `{ loop: 'wf', prefix: 'w', frames: [map, map, …] }` compiles to groups `class="wf w0"`, `class="wf w1"` and so on. Frame 0 is what reduced motion shows. The loops the site's CSS animates are `wf` (w0–w4), `ff` (f0–f3) and `hf` (h0–h5).
- **Paint order inside a layer** follows `keys`: each color is drawn in the order its key is listed.

### Blocks (`kind: 'block'`)

A block is described by numbers, not drawn. Use one for ground, walls and water. `block`, `tile`, `water` and `path` (a flat road tile) in `jlawcordova.pixellab/objects/` are the library, and `scenes/library-demo.mjs` places them with `tree`, `pebble` and `bridge`. This example is `objects/stone-block.mjs` in the skill's test.

**Adding to the library demo.** A test (`library (R13, R31)` in `scripts/pixel-art-engine.test.mjs`) lists the objects `library-demo` places, and checks that every item sits within its 3×3 grid (columns and rows 0 to 2). When you place a new object there, add its name to that list in the same change, and keep it on the grid. A small object can stand on a block's top: give it the block's tile (its top face's level), and depth order draws it over the block.

```js
// Pixel-art object. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  kind: 'block',
  size: [1, 1, 1],
  faces: {
    top: 'grass-2',
    left: 'soil-2',
    right: 'soil-3',
    edge: 'soil-4',
  },
  sides: {
    keys: {
      g: 'grass-3',
      G: 'grass-4',
      s: 'soil-3',
      S: 'soil-4',
    },
    left: [
      'gggggggggggggggg',
      'GGGGGGGGGGGGGGGG',
      '..G.....G....G..',
      '................',
      '................',
      '................',
      '................',
      '....s...........',
      '................',
      '................',
      '................',
      '..........ss....',
      '..........ss....',
      '................',
      '................',
      '................',
    ],
    right: [
      'GGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGG',
      '...G......G.....',
      '................',
      '................',
      '................',
      '.........S......',
      '................',
      '................',
      '................',
      '...SS...........',
      '...SS...........',
      '................',
      '................',
      '................',
      '................',
    ],
  },
};
```

- **`size`** is `[tiles wide, tiles deep, levels high]`. `[1, 1, 0]` is a flat tile and `[1, 1, 1]` a cube. A block is at most 64×64 pixels, so `[2, 2, 0]` fits and `[3, 3, 0]` doesn't.
- **`faces`**: `top` is the light shade, `left` the mid shade and `right` the shadow shade (R28). `left` and `right` are required when there are levels, and refused on a flat block. `edge` is optional: a 1-pixel outline around the whole block, drawn last. The faces use 1–4 colors (a flat block just its top), and the whole object, surface and sides included, stays within 12.
- **Placement.** `at` is the top-face center of the block's first tile. The sides hang `levels × 16` pixels *below* it, so a cube on the ground is placed at `[col, row, 0]` and its sides reach one level under the ground. To sit a cube on top of a tile, place it at level 1: `[col, row, 1]`. A `[2, 1, 2]` block covers the tiles `[col, row]` and `[col + 1, row]`.
- **Depth.** A block sorts by the box it fills: its `size` from its first tile, and its levels down from `at`. A wide or tall block goes behind and in front of its neighbours by that box ([Depth order](#depth-order)).
- **A tile is 30 pixels wide at its widest row,** not 32: pixel centers never land on an edge, so neighbouring tiles share no pixel and leave no gap. Don't nudge blocks by a pixel to hide a seam; there isn't one.
- **`surface`** (optional) paints a one-tile (32×16) sprite over each tile of the top face, clipped to each tile's own diamond. It's `{ keys, map }`, or `{ keys, loop, prefix, frames }` for a loop. `water` uses five frames of `wf w0`…`w4`, which is what the site's CSS animates. Frame 0 is the reduced-motion frame. Surface colors count toward the 12-color cap.
- **`sides`** (optional, blocks with levels only) textures the left and right faces: `{ keys, left, right }`, each map 16 columns by 16 rows. A map is face-local: row 0 is the first pixel below the top's edge in each column, so a band that follows the top edge is just the map's first rows (the grass band above). Column *c* of a face reads map column *c* mod 16, and the map repeats up every level. A 1×1 face is 15 pixels wide, so it shows columns 0–14, and column 15 shows only where a longer face repeats the map. The engine draws the faces, then the sides, then the surface, then `edge`. Side colors count toward the 12-color cap.
- `npm run pixellab -- object new <name> --kind block` writes a starter block.

### Outfits (`extends`)

Every outfit extends `character` and replaces whole rows:

```js
// Pixel-art object. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  kind: 'sprite',
  extends: 'character',
  keys: {
    g: 'roof-1',
    h: 'roof-2',
    i: 'roof-3',
    t: 'gold-2',
  },
  rows: {
    1: {
      24: '...............hhhthhhihhii.....',
    },
  },
};
```

- `rows` is `{ <layer index>: { <row index>: '<whole row>' } }`. A row override must be the full width of the base's map.
- `keys` adds keys, or overrides the base's: the base's order comes first, then new keys.
- The example recolors the base's shirt keys (`g`, `h`, `i`) red and adds a gold buckle `t` on one row of the chest.
- `character` uses world colors only, with no `ink` and no outline; its keys are in [Isometric characters](#isometric-characters). An outfit may recolor those keys or add its own. `object new <name> --extends character` writes a starter outfit with no keys or rows of its own yet.
- `character` is a 32×35 canvas, with anchor `[20, 29]` on the ground under the figure, so a scene places it by `tile`. The figure is in its `cbob` layer (layer 1; layer 0 is empty): head rows 7–20, body rows 18–27, legs rows 25–30, columns 13–26. Draw held props in the `cbob` layer too, so they bob with the character. A prop goes left of the body (columns 8–12) or right of it (columns 27–31). A new outfit keeps its figure, with any prop it holds, within 24×32. A larger prop is a separate `prop-<class>-<name>` object (see [Isometric characters](#isometric-characters)).

### Scenes (`source/scenes/<name>.mjs`)

```js
// Pixel-art scene. How to edit it: .claude/skills/pixel-art/SKILL.md
export default {
  output: 'example.svg',
  viewBox: [-51, -9, 103, 72],
  origin: [0, 32],
  items: [
    { object: 'tile', at: { tile: [0, 0, 0] } },
    { object: 'small-rock', id: 'rock', at: { tile: [1, 2, 0] } },
    { object: 'small-rock', class: 'pcloud pc0', at: { px: [30, 0] } },
    {
      group: { 'data-class': '0' },
      items: [
        { object: 'outfit-example', at: { px: [-24, -6] } },
      ],
    },
  ],
  motion: {
    duration: 2000,
    tracks: [
      {
        item: 'rock',
        keys: [
          { t: 0 },
          { t: 1000, move: [16, -8] },
        ],
      },
    ],
  },
};
```

- **Items draw back to front by where they stand,** not by their place in the list, and the file is kept in that order ([Depth order](#depth-order)). Never reorder lines to fix an overlap.
- **`at`** is `{ tile: [col, row, level] }` (snaps to the grid) or `{ px: [x, y] }` (exact, for imported art and nudges), with an optional `level` for a pixel-placed item (`{ px: [x, y], level: 1 }`): how high it stands, which only changes its depth. All are whole numbers.
- **`depth`** (optional, `'front'` or `'back'`) on an item or a `{ group }`: draw it over, or under, everything else in its list.
- **`class`** on an item wraps the object in a `<g class>` (the clouds' `pcloud pc0`). **`group`** makes a `<g>` with `class` or `data-*` attributes around its items (the Range's `data-class` variants).
- **`output`** names the SVG it writes in `src/assets/pixel-art/`. Leave it out for a preview-only scene; it's still compiled and checked.
- **`id`** (optional, kebab-case, unique in the scene) names an item so a `motion` track can move it.
- **`motion`** (optional) animates items on one loop of `duration` ms, one track per item it moves (the example walks the rock 16 px up-right and back every 2 s). Each key sets, from `t` ms on, the item's `move` (pixels from its placement), `show` and `pose` (an object drawn instead, with the same anchor). The first key is at 0, the rest frame that reduced motion and `art preview` show. Moves step a pixel at a time. The `pixel-art-motion` skill (Scene motion) has the rules, and Pixel Lab's timeline plays and scrubs it.

### Depth order

Pixel Lab (v0.5.0 on) works out what draws in front from where each item stands, the lab's [depth order](https://github.com/jlawcordova/jlawcordova-lab/blob/main/docs/intents/2026-10-depth-order/spec.md). How the site uses it is in the [depth order spec](../../../docs/intents/2026-10-pixel-lab-depth-order/spec.md).

- **Each item stands in a box** in tile space: its column, row and level, and a block's `size` or a sprite's `footprint` and height (the rows above its anchor, over 16). Of two items whose pixels could overlap, the one behind draws first. Where the boxes don't decide, the list's order holds.
- **The file is kept in depth order.** Every edit, by the MCP, the CLI or Pixel Lab, sorts the whole scene in the same step, so the list reads back to front. `check` warns `out_of_order` about a file that isn't (one edited by hand), and `npm run pixellab -- scene sort <scene>` (or `--all`) sorts it. A sort moves as few items as it can.
- **An edit can change paths.** `scene_place`, `scene_move`, `scene_set` and the rest return the item's path after the sort, and `reordered` lists the other paths that moved. List the items again (`scene_items`) after an edit before using a path.
- **`level` on a pixel-placed item** says how high it stands: `scene_set <scene> <item> --level <n>`. It doesn't move what's drawn; each level brings the item one tile closer on both axes in depth. Every pixel item stands on level 0 until it has one, so give one to anything that rides or hangs above the ground: the island's ore and stones on trucks, belts, the hopper and the cart, and the heaps' top lumps are at 1, the hopper and the jib at 2, the hook at 3. An item on a tile takes its level from its tile, and changing that moves it.
- **`footprint: [wide, deep]` on a sprite** (`object_footprint <name> --to w,d`) says how many tiles its box covers, from its anchor's tile toward the front (+col, +row), as a block's size does from its first tile. The site's sprites are anchored at their front foot, so a footprint claims ground in front of the sprite, and whatever is placed there next sorts behind it. Add one only where a sort needs it, and check the scene: `mine-cart` ([2, 1]) and `container` ([2, 2]) have one, so the cart draws in front of the ore screen it stands under and the train's container between its flatcar and the locomotive. A footprint changes where every scene using the object sorts; sort them (`check` warns until you do).
- **`depth: 'front'` or `'back'`** on an item or a group draws it over, or under, everything else in its list: `scene_set <scene> <path> --depth front|back|auto` (`auto` takes it off). On a top-level item or group it means the whole scene. The island's shadow group is `back`, and the bridge rail's group is `front`. Use it when nothing about where the item stands can say it; it holds against anything placed later.
- **Groups sort as one object,** by the box around their members, and their members sort among themselves inside. A run of `data-class` variant groups sorts as one.
- **Moving items.** An item with a motion track that is alone in its list reorders as it moves, and the SVG draws a copy for each place it takes (`check` lists `copies`). One inside a group keeps its place at rest for the whole loop. Every moving piece on the island is alone in its own `enter` group, so nothing on the island reorders and there are no copies; a test keeps it so. Its order against a piece it only meets mid-loop is the list's order, so check those moments with `scene_render --time <ms>`.
- **There is no raise or lower,** and `scene_place` takes no index: the override and the data above are the only controls. Don't reorder lines to fix an overlap.
- **Adding many depth fields at once** (a migration, a new section): each edit re-sorts, and a sort made with only part of the data in place can move pieces that only meet mid-loop out of order. Add the data, then sort once, and compare the renders with the scene as it was ([depth order spec](../../../docs/intents/2026-10-pixel-lab-depth-order/spec.md), D4).

## Pixel Lab: the MCP and the CLI

Pixel Lab for Mac (the owner's editor, from `~/Projects/jlawcordova-lab`) opens this document and edits it with the engine, which lives in the lab and is installed here as the `pixellab` dev dependency. Every action it has is one command, reachable three ways: the app, the `pixellab` CLI, and the `pixellab` MCP server, whose tools are the commands with `.` → `_` (`scene.place` is `mcp__pixellab__scene_place`). Use it to look at art and to edit it. `npm run art` (its `art build`) stays the compiler: it writes the SVGs; `art preview` writes the review previews and `art sizes` measures bytes (next section).

**Find it, in this order:**

1. **The MCP tools are the way to work, and the first choice.** If `mcp__pixellab__*` tools are listed (or deferred: load them with ToolSearch, query `+pixellab`), use them for looking at art and for editing it. Call `document_info` first. Its `root` must be this site's document (`~/Projects/jlawcordova.github.io/src/assets/pixel-art/jlawcordova.pixellab`, or this checkout's). If it names another document, such as a scratch copy, the server is bound to the wrong place: don't edit or draw through it. Stop and tell the owner to point the MCP at this document (`--document` or `--site`); never connect it yourself. Only a worktree, or an MCP that can't be fixed, falls back to the CLI, and then only if the owner says so.
2. **The CLI** (the fallback, and what compiles). `npm run pixellab -- <group> <verb> [args]` runs the installed `pixellab` on this checkout (`--site .` is in the script). `npm run pixellab -- help` and `npm run pixellab -- <group> --help` list the commands; the reference is `docs/cli.md` in the lab repo. The app's own copy (`node "$HOME/Applications/Pixel Lab.app/Contents/Resources/cli/bin/pixellab.mjs" … --site <checkout>`) is the same CLI, possibly a different version.

The owner connects the MCP with `claude mcp add pixellab -- node "$HOME/Applications/Pixel Lab.app/Contents/Resources/cli/bin/pixellab.mjs" serve --mcp`. Never run that, or install the app, yourself.

**The flow: make the change, then send it for approval over the MCP.** In the owner's checkout, every art change, small or large, goes this way:

1. `document_info` names this site's document.
2. Look at the art as it is with `scene_render` or `object_render`.
3. Make the change with the MCP's edit tools (`object_paint`, `scene_move`, `scene_set`, …). Render it again, and run `check` on each doc you changed.
4. `doc_save` each doc. It writes a **proposal**, not the source.
5. Report each proposal's id, its doc and what it changes, and stop there. The owner approves or rejects it in Pixel Lab.
6. After the owner approves, run `npm run art`, `npm test` and the rest of the checks the task needs. Until then they test the old sources.

**Why not the CLI or a hand edit in the owner's checkout.** Pixel Lab reloads a doc when its file changes on disk only if that doc has no unsaved edits. When the owner has unsaved edits open, a write to that file leaves them looking at the old version: they don't see your change, and their next save in the app conflicts with it. A proposal waits in the app's Agent window. The owner applies it when they're ready: after saving their own edits, it lands on the version they're looking at. Main sessions brief subagents the same way: proposals in the owner's checkout. Never tell an agent to write sources there instead.

**Which tool for what:**

| To | Use |
| --- | --- |
| Look at a scene or object while you work | `scene_render` / `object_render` (MCP): the PNG comes back to you as an image, with each item's bounds. `--scale` up to 16, `--time` for a moment of the loops and the scene's motion, `--frame` for one frame of an object's loop, `--theme dark` for the site's dark theme, `--show <item path>` for another Range class. |
| Find your way around | `scene_list`, `scene_items` (every item in depth order, back to front, with its path, such as `5.2`, its id, level, depth override and placement point), `scene_show`, `object_list`, `object_show`, `object_pick`, `palette_get` |
| Validate | `check <name>` (the engine's problems for that doc and what it uses, or its one-line summary, and warnings: `out_of_order`, `copies`, `off_grid`) |
| Fix what draws in front | `scene_set --level` (a pixel item), `object_footprint`, `scene_set --depth`; `scene_sort` for a file out of order ([Depth order](#depth-order)) |
| Change art (the default) | MCP edits, then `doc_save`, which writes a **proposal** for the owner to approve (the flow above) |
| Change art in a worktree, or what the MCP can't express once the owner says so | the CLI's edit commands, or whole rows in the `.mjs` source (below) |
| Compile and test | `npm run art`, `npm test` |
| Review images and bytes | `art_preview`, `art_sizes` (MCP), not PNG files opened from disk |

**Edits through the MCP are proposals.** Each MCP session holds open docs as working copies with undo (`doc_undo`, `doc_redo`, `doc_status`). Renders and `check` see the unsaved edits. Nothing touches the site until `doc_save`, which validates the doc and writes a proposal for the owner instead of the source. Pixel Lab shows it in its Agent window (⌥⌘A), ghosted over the stage with a diff, and the owner approves or rejects it there (or with `pixellab proposal apply <id>`). `proposal_list` lists proposals and `proposal_render` draws one as it would land.
- Proposals are how art changes in the owner's checkout, whether or not the task mentions them.
- A proposal records the file it was made against. If the file changed before the owner applies it, Pixel Lab refuses it (`baseMatches` is false in `proposal_list`): make it again from the file as it is now.
- Never apply, reject or force a proposal, yours or anyone's, by any route. That's the owner's call. Don't `--force` a save past problems or a conflict either.
- Report each proposal's id, its doc and what it changes. Until it's approved the sources haven't changed, so `npm run art` and `npm test` say nothing about it. After approval, run them (Pixel Lab's Publish, ⌘B, is `npm run art`).

**Edits through the CLI write the working tree.** Use them in a worktree, which the MCP server doesn't edit. In the owner's checkout, use them only for what the MCP can't express (below), and only once the owner says so. Each edit is one-shot: load, edit, validate with the engine, serialize canonically and write atomically. It refuses a doc with problems or a file that changed on disk while it ran, and prints what changed and `wrote <file>`. `--dry-run` prints the diff instead. The commands and params match the MCP tools (`npm run pixellab -- object paint pine 3,4 4,4 --color grass-2` is `object_paint`). The `doc` commands (undo, save) exist only in the MCP session.

**Draw maps in bulk, touch them up with commands.** Painting pixel by pixel is slow for a whole map.
- **In the owner's checkout:** generate the map with a script, then send it through the MCP. Size the object with `object_new` or `object_resize`, then make one `object_paint` call per color with every pixel of that color, and one `object_erase` for the pixels that go. Save it as one proposal.
- **In a worktree:** write the whole rows in the source, or generate them with `serialize()` from `pixellab/serialize`.

Then use `object_paint`, `object_fill` and `object_erase` for fixes and feedback, and the scene commands for placing and arranging:
- **Pixels** are map column and row, as in `object_render` at scale 1. Pass every pixel of one color in a single call. Painting a color the object doesn't use yet adds a key, as the lab does: check the key it got with `object_show`, and rename it in the source if it breaks the file's material convention (a lowercase letter for a shade, its uppercase for the darker one).
- **Layers and frames:** `object_layer_*`, `object_frame_*`, `object_animate` (a still layer becomes a `wf`, `ff` or `hf` loop, with frame 0 copied into every frame) and `object_still`. `object_new` and `scene_new` are the same starters as `--new`.
- **Items** are addressed by their path from `scene_items` or by their `id`. Every edit re-sorts the scene, so paths can change: use the path the result returns, and list the items again before the next edit. `scene_place --at col,row,level` (or `--px x,y --level n`) adds an item where it stands, and the sort puts it in its place. `--group <path>` places it in an existing group, and `--new-group '{"class": "enter", "data-enter": "object"}' --foot` wraps it in a new one with its foot as `data-x` and `data-y`. `scene_move`, `scene_set`, `scene_duplicate` and `scene_remove` work on items inside groups too, and a move at rest keeps the group's `data-x`/`data-y` in step; `scene_group_set` sets a group's attributes.
- `scene_move --time <ms>` past 0 keys an animated item's move at that time (the `pixel-art-motion` skill, Scene motion).

**What the MCP can't express.** Since Pixel Lab v0.4.0 the MCP places items into groups (`scene_place --group`, `--new-group … --foot`), sets a group's attributes (`scene_group_set`), keeps `data-x`/`data-y` in step when an item moves, and keys a track's `show` and `pose` (`scene_track_add`, `scene_key_set`, `scene_motion_path`). A few edits are still only in the source:
- moving an item from one `{ group }` to another;
- a track rewritten as a whole, rather than key by key;
- depth data added to many items before a single sort ([Depth order](#depth-order)).

In the owner's checkout, say which edit it is and ask before writing it. With the owner's OK:
1. Ask them to save or close that doc in Pixel Lab first.
2. Write the source.
3. Tell them it's on disk.

Send the rest of the change as a proposal as usual.

**The owner's hand edits land on disk.** Pixel Lab's own saves write the working tree directly, so there's no export step: the file on disk is the new baseline, and `git diff` shows what they changed. Pixel Lab reloads a file when it changes on disk only if that doc has no unsaved edits. When the owner says Pixel Lab doesn't show a change that is on disk, that's why: the doc has unsaved edits, and `doc_save` from the app will conflict. Don't tell them to force it. Keep a copy of what's on disk, and ask whether to resend your change as a proposal against what they save. Pixel Lab has no links: hand the owner the names of the scenes and objects to open (its sidebar lists the scenes, then the Library of objects; double-click an object for Object mode).

## The `npm run art` path

This path needs no editor and no browser, and it's the one that compiles, previews and measures, so every change ends here. In the owner's checkout it starts after the owner approves your proposals: steps 1–3 happen over the MCP (`object_new`, the edit tools, `check`), and you run step 5 once the proposals land. In a worktree you take every step yourself.

1. **Start from a valid file.** `npm run pixellab -- object new <name> --width 16 --height 16` (a sprite with an empty map), `object new <name> --kind block` (a block), `object new <name> --extends character` (an outfit) or `scene new <name>`, or open an existing source. Choose the smallest object that does the job, and prefer placing objects in a scene over drawing large maps. `new` refuses to overwrite a file.
2. **Edit whole rows**, and keep every row the same width. For a block, change `size` and `faces` instead. Add each color you use to `keys`, from the world palette.
3. **Check it:** `npm run pixellab -- check <name>`. It prints every problem with its file, layer, frame, row and column, and the rule broken, or a one-line summary (size, colors against the cap, layers, frames). Fix each problem where it points.
4. **Look at it with the MCP, not by opening PNG files.** `object_render` and `scene_render` hand you the image directly, with other frames (`frame`), times (`time`), scales (up to 16×), themes and `show` paths; `art_preview` (also `palette`) gives the review PNG on the document's card color and `art_sizes` the bytes. Don't write PNGs with the CLI and open them with Read to check art. If the MCP isn't usable, say so rather than falling back to PNG files. The picture, not the text, decides whether the art is right: an object stands on one tile outline, a scene shows its viewBox at frame 0.
5. **Generate the output:** `npm run art` writes the SVGs for scenes with an `output`, then run `npm test`. A test fails if a committed SVG is stale against its sources.

A name can be written `objects/<name>` or `scenes/<name>` when an object and a scene share it.

**Sizes.** Each SVG must stay within its budget, or `npm run art` reports it `OVER BUDGET` and exits 1: `hero-island.svg` 750 KB raw and 150 KB gzip, `range-sprite.svg` 200 KB and 50 KB, every other SVG 100 KB and 25 KB. `npm run pixellab -- art sizes <scene>` shows where the bytes go: the scene's total, then what each object adds (the scene compiled without it) and what each color's path takes, raw and gzip, each against the sources at `HEAD`.

**Close-ups.** Preview-only scenes frame each part of the hero island tightly, so every review round renders the same view. Preview them with `--scale 6`:

| Scene | Shows |
| --- | --- |
| `closeup-land` | The island's front corner at [5, 10] in the mining section, with four joints on each cliff |
| `closeup-road-end` | The road going into `tunnel-road` at the L–B cliff |
| `closeup-water` | The river, the bridge and the long waterfall with its streaks (`flag`), down to its spray |
| `closeup-crane` | The crane with its hook, the container at the loading spot and the train waiting under it |
| `closeup-office` | The house, the road, the river bridge and its rail |
| `closeup-front-trees` | The front trees of the middle and mining sections |
| `closeup-sky` | The three clouds and the crane jib's head |

They place the island's objects at the island's positions, with the island's levels and the overrides of the island's groups (the shadow pieces `back`, the bridge rail `front`), in the island's order (its depth order, flattened out of its groups), and a test keeps them that way: when the island's scene renames, moves or re-levels an object, change the close-ups in the same commit. Sorted on its own, a close-up can settle pieces that don't overlap in another order than the island; put it in the island's order instead, which is a valid depth order for it (`scene sort` then moves nothing). They show the island's rest frame: no `id`s, no `motion`, and none of the items hidden at t 0. They don't use the entrance groups. Where a close-up cuts the island off, the cubes at its edge show their sides. The preview's card color is one shade off the hero's background, so the sky reads as it does on the site.

## The app (where the owner looks)

There is no browser editor any more: the web lab at `/lab/pixel-art/` was retired when the engine moved to Pixel Lab. The owner opens the document in the Mac app, which shows every source in the working tree (it reloads a clean doc when its file changes), places and paints, plays a scene's motion on its timeline (⌥⌘P), reviews proposals in the Agent window, and publishes with ⌘B. Hand the owner the names of the objects and scenes to open there (the sidebar lists them), a review PNG of each, and any proposal ids. A scene's keys are set over the MCP: `move` with `scene_move --time <ms>` or `scene_key_set --move`, and `show` and `pose` with `scene_key_set`. `scene_render --time <ms>` or `npm run pixellab -- scene render <scene> --time <ms> --out <png>` shows any moment of it.

- **Blocks:** a block shows as the engine draws it. The app paints its top (`surface`) and its faces (`sides`); a saved block carries only that block, so apply the same change to its variants (such as the island's edge pieces) yourself.

## The explainer library

`art/explainer-library.pixellab/` is a second document: isometric assets for the owner's videos and infographics, not the site ([explainer library spec](../../../docs/intents/2026-10-explainer-library/spec.md) lists every asset and its loop). The same rules and look apply, with these differences:

- **Its palette is a copy of the site's.** A test keeps the two files identical, so a palette change edits both.
- **Edit it with the CLI and `--document`:** `npx pixellab <group> <verb> … --document art/explainer-library.pixellab` (the flag goes after the command). The `pixellab` MCP server is bound to the site's document, so it can't edit this one; review PNGs come from `art preview … --out` into `.art-preview/`.
- **It publishes nothing.** Its scenes are preview-only contact sheets (`sheet-kitchen`, `sheet-office`, `sheet-cloud`, `sheet-ai`, `sheet-glue`), and every asset must stand on one of them. `npm run explainer-export` renders every object (one PNG per loop frame) and sheet for video.
- **A new asset** goes in the spec's Asset list and in `ASSETS` in `scripts/explainer-library.test.mjs`, with its loop.
- **Outfits can't loop.** An object that `extends` another overrides rows only, so it can't add a frame loop; and only outfits may use outfit colors. The robots are silver outfits with the idle bob for that reason.

## Achievement icons

The 16×16 icons beside the accomplishments on the site are objects named `icon-<id>`, placed in the `achievement-icons` scene. They're drawn in the [island and Range look](#island-and-range-look), following [Isometric icons](#isometric-icons), and have a few rules of their own (size, anchor, sheet order, the icon list). Use the `achievement-icon` skill to add or change one.

## The art that's already on the site

- **The hero island** (`scenes/hero-island.mjs`, written to `hero-island.svg`) is three joined sections with a production line running through them ([island level up spec](../../../docs/intents/2026-10-island-level-up/spec.md), and [art-brief.md](../../../docs/intents/2026-10-island-level-up/art-brief.md) for every object's sizes, anchors and paint-order rules):
  - the ground: 132 one-level cubes, listed row by row (row −6 to 10, then by column), which is their depth order. The middle island is cols 0–5 on rows 0–5, plus cols 6–7 on rows 0–2; the mining section is rows 6–10 and the rail section rows −6 to −1 (cols 0–10). Inland and at the front corner it's `block` (or `block-mine` on the ore ground), the cliffs take the edge pieces (`block-left`, `block-right`, `block-mine-left`, and `block-rail` where the railway meets the B–R cliff), and the road and the river run on `block-road` and `block-river` with `path` and `river` laid over them; `track`, `track-mine` and `level-crossing` lie on their cubes the same way. The road runs the whole of col 2 (crossing the track at [2, −3]), and the river the whole of row 3 to the waterfall at [5, 3]. Inland cubes' sides are hidden at rest, and a test checks the settled island paints what flat tiles would (except one corner column at each concave step in the outline, which shows by design);
  - the middle island's house, river bridge and rail, back trees on their `tree-shade`s, and the waterfall (`waterfall-face` and `flag`, falling below the island);
  - the mining section: `tunnel-road`, the heap of gold-cube `ore` and gray `stone`, `conveyor-row` into the `ore-screen`, which sorts the ore into the `mine-cart` on `track-mine` and the stone onto a reject pile;
  - the processing line: `hopper`, `conveyor-feed` carrying the ore into the `processor` (its LED is an `hf` loop), the `container`'s loading spot and `boxes`;
  - the rail section: the two-piece `tunnel-rail`, `track`, the `level-crossing` with a `crossing-signal` and `crossing-gate` on each side, the crane (`crane-mast`, `crane-jib` and `crane-hook`, with their poses) and the train;
  - the trucks (`truck-open` and its poses), the ore, the parcel, the containers, the cart, the hook, the jib, the stones, the crossing's signals and gates and the train cars carry `id`s, and the scene's 28 s `motion` moves them (the `pixel-art-motion` skill, Scene motion);
  - `cloud-a`, `cloud-b` and `cloud-c`, placed with `pcloud pc0` to `pc2`. `fence`, `truck`, `truck-green` and `crane-box` are in the library but off the island.

  **Entrance groups.** Every item sits in one top-level group with class `enter`, which `Hero.astro` animates with the schedule in `src/lib/island-entrance.mjs`. How they move, and how to try another build-up, is the `pixel-art-motion` skill:
  - `'data-enter': 'shadow'`: the 24 shadow pieces;
  - `'data-enter': 'ground'` with `'data-col'`, `'data-row'`, `'data-x'` and `'data-y'`: one group per cube, holding the cube and any top laid over it, with its tile's center as its foot;
  - `'data-enter': 'object'` with `'data-x'` and `'data-y'`: one group per run of objects that arrive together, in depth order. The foot is the center of the sprite's bottom row (`[round(at.px[0] − anchor[0] + width / 2), at.px[1] − anchor[1] + height − 1]`), or a tile-placed object's tile center. Every item shares the group's x, and its y is the first item's. A `tree-shade` takes its tree's foot, and the crane's jib and hook take the mast's;
  - `'data-enter': 'sky'`: the clouds.

  A new object goes in its own `object` group with its foot (`scene_place --new-group '{"class": "enter", "data-enter": "object"}' --foot`), and the sort puts the group where it stands; a test checks every x and y. Give it a `level` if it rides or hangs above the ground ([Depth order](#depth-order)). Groups don't merge colors across each other, so they cost bytes.
- **The Range sprite** (`scenes/range-sprite.mjs`) puts each character in its own setting ([Range settings spec](../../../docs/intents/2026-10-range-settings/spec.md)):
  - Four `island-shadow` pieces sit outside every group, shared by all classes.
  - Seven `data-class` groups follow, one per class, in the order of `rangeClasses` in `src/data/home.ts` (a test keeps them in step). Each holds its whole setting in entrance groups, as on the hero island: three `ground` rows (`data-row` 0 to 2) of one-level cubes from the setting's own floor set, then one `object` group per prop and one for the outfit, each with its foot `data-x`. `Range.astro` floats them up on every class change with `RANGE_TIMING` from `src/lib/island-entrance.mjs`.
  - Each outfit extends `character` and stands on the center tile, placed by `{ tile: [1, 1, 0] }` in an `object` group with `data-x="0"`. The characters are isometric figures in the [island and Range look](#island-and-range-look), with no `ink` outline ([Isometric Range](../../../docs/intents/2026-10-range-isometric/spec.md)).
  - A test requires seven class groups, each with a floor set no other class uses.
  - `art preview range-sprite` and Pixel Lab draw only the first `data-class` group. To look at another class, render it with `scene_render range-sprite --show <path>`, the path of any item in that class's group (from `scene_items`). For a preview on the card color, preview a scratch copy of the scene that keeps the shadow and only that class's group.
- **The blog's thumbnails** (`scenes/thumb-<key>.mjs`, one per post) are preview-only scenes: a small floating island (`block`, `block-left`, `block-right`, with `island-shadow` pieces at each cliff tile's center + [0, 32]) holding the post's idea, in a `viewBox` exactly 240×126, so `npm run thumbnails` (`scripts/blog-thumbnails.mjs`) renders it on the card color at 5× to the 1200×630 `static/public/thumbnails/<key>.png`. The site crops it to 16:9, so keep the subject 12 px clear of the left and right edges. Objects made for one thumbnail are named `thumb-<key>-<thing>`. A test fails when a post has no thumbnail or a PNG is stale; after changing a `thumb-*` scene, or an object one places, run `npm run thumbnails`.
- **Recolors.** `truck-green` is `truck` with other colors: it `extends: 'truck'` and lists only the keys that differ. Use the same pattern for a variant that changes colors but not shape.
- **Keep the CSS hooks.** `pixel-art.css` animates the classes on these groups (`wf w0`…, `pcloud pc0`, `cbob`); the scene's motion styles its own `mv-` groups. Don't rename a loop, prefix or placement class unless you change the CSS in the same PR.

## Island and Range look

The style of the hero island's objects, of the Range (its platform and its characters) and of the achievement icons ([hero island detail spec](../../../docs/intents/2026-10-hero-island-detail/spec.md), [Isometric Range spec](../../../docs/intents/2026-10-range-isometric/spec.md), [isometric icons spec](../../../docs/intents/2026-10-isometric-icons/spec.md)). Detailed, calm, no outlines. The `pixel-artist` agent (`.claude/agents/pixel-artist.md`) draws in it.

- **Shade order.**
  - Each material uses its own ramp. The lit top is shade 2. The left face is the mid shade and the right face the dark one (for soil, `soil-2` and `soil-3`).
  - Texture is the next shade lighter on tops, or darker on sides, from the same ramp. A face holds 2–3 shades at most.
  - Two-tone the small parts too: a trunk is `wood-3` with a `wood-4` right column, and a post is lit on the left and dark on the right.
- **Density.**
  - About 4 small clusters per 32×16 top. For grass, that's tufts of two 1-px blade strokes, 2–3 px tall, slightly leaning, sometimes mirrored.
  - About 6 speckles per side face, mixing 1×1 and 2×2 squares.
  - Scale counts with the face: below about 4 px of exposed body, a band or skirt does texture's job better than single pixels.
  - Space texture on a 2:1 band along the band's own axis (u = x/2 + y), not along x, or it clumps.
  - Avoid 2×1 dashes, which read as scratches. "V" tufts read as birds, and diagonal dotted pairs read as wallpaper.
  - Keep texture at least 2 px from face edges, so repeats don't draw grid lines. On a top, that means every pixel in a ±2 square around a texture pixel is inside the tile's diamond.
- **Transitions.**
  - Where materials meet (grass over dirt, a road over dirt), the upper material hangs a 3–4 px band down the side faces, following the top edge.
  - The band's last row is the ramp's darker shade, and a few 1-px drips break up its lower edge. A roof's fascia stays straight, with no drips.
  - Bands stay in the upper material's own ramp: grass bands are grass greens, a road's band is `path-3`, last row `path-4`, and a river's is in the water ramp.
  - Every top material on a cliff hangs its own band, so where the river or the road reaches the edge, the edge piece under it carries that material's band (`block-road`, and `block-river` under the river).
- **Edges and joints.**
  - No outlines, and no `ink` on island or Range objects.
  - Where cubes line a cliff, both of each cube's corner columns show on both cliffs. So joints are hidden with separate edge pieces (`block`, `block-left`, `block-right`, `block-road`), never with an in-between shade or a corner-color swap.
  - When an object loses its outline, recolor the outline pixels with the darker shade of the face they border, which keeps the silhouette. On a small face, count those darker pixels as detail (a box's rear edge reads as a rib, a chassis as tyres) before adding strokes, or it turns stripy.
  - Where an object's lit color matches the ground under it (`grass-2` foliage on `grass-2` grass), give it a lighter rim on the lit side; the darker-shade rule only covers the shaded side.
  - A recolor (`extends`) that loses its outline needs its own shade order checked: top lighter than left, left than right.
- **Shapes.**
  - Clouds are short-sided stacked cubes: `cream` tops, `path-2` left, `path-3` right, tip pixels clipped, no texture. A cube's top width is a multiple of 4 (8–24), and a stacked cube narrower than 12 reads as a chimney.
  - The road is `path-2` dirt with a `cream` dashed center line: one dash per tile, 4 rows on the road's 2:1 line through the tile's center, so the dashes and gaps are even along the road.
  - Pines are three stacked tiers with shallow-V skirts, split at the center (lit left, dark right), with a sawtooth of needle tips.
  - Cardboard is `wood-1` top, `wood-2` left, `wood-3` right, with `path-1` tape. A box W px wide has a top W/2 rows tall. Judge tape on the island or a close-up, since `path-1` nearly matches the preview's background. The same goes for any `path-1` top (a concrete step, a steel rim): on an object's own `--preview` it washes out, so judge it in a close-up or a render on the grass.
  - Planks and plank gaps on a 2:1 deck sit at least 4 rows apart; every 3 rows the steps line up into a checkerboard.
  - Buildings: a flat roof reads with a 1-px parapet line in the face shades, and `water-1` glass on a `path-1` wall needs a `path-3` frame. Place wall features by offsets from each column's wall-top row.
  - Water texture follows the side rule too: a falling sheet is `water-3` with darker `water-4` stripes and few light streaks, or it reads as rain.
  - Lattices (the crane) are see-through.
- **Scale.** Texture should fade to grain at 1× and read as material at 2–3×. Check both.
- **Cost.**
  - Each horizontal run costs about 15 B, and rows of the same width merge, so vertical strokes are cheap.
  - An isolated texture pixel costs about 30 B raw and 6 B gzip, times the number of placements and loop frames.
  - Prefer a few deliberate clusters and horizontal adjacency.
  - Check with `npm run pixellab -- art sizes hero-island` (or `range-sprite`).

### Isometric characters

The Range's characters are built like the clouds: stacked boxes, no outline, no `ink`. The knight (`outfit-security-governance`) is the reference, as approved in the owner's review.

- **Grid and light.** Boxes sit on the 2:1 grid: screen x = u − v and y = (u + v)/2 − z, where u runs right-down, v left-down and z up. Each box has its top lightest, its left face mid and its right face darkest. The figure faces down-left, so the head's left face is the face.
- **Body plan** (iso units, 1 unit = 1 px across):
  - legs: two boxes 2 wide, 2 deep, 4 tall, with a 2-unit gap;
  - body: 8 wide, 4 deep, 7 tall;
  - arms: 2×2×6 boxes beside the body;
  - head: a full cube, 8 wide, 6 deep, 8 tall (a short-sided cloud cube leaves no room for eyes and a fringe).
  - That is about 14×24 px. With its props, a figure stays within 24×32.
- **Canvas.** 32×35, anchor `[20, 29]` at the ground under the body's center, placed on the Range by `{ tile: [1, 1, 0] }`, the center tile. Props have room at columns 8–12 on the left and 27–31 on the right.
- **Face.** On the head's left face, 8 px wide and 8 tall, sloping 2:1:
  - hair is a band on its top two rows, plus a sideburn at its left end;
  - eyes are 1×2 dark pixels in columns 15 and 18, so they follow the slope;
  - the head's right face is hair above and shaded skin below.
- **Keys of `character`:**
  - `a` `soil-4`: hair's right face, and shoes;
  - `b` `soil-3`: hair's left face (fringe and sideburn);
  - `c` `skin-1` and `d` `wood-1`: lit and shaded skin;
  - `e` `soil-4`: eyes;
  - `f` `soil-3` and `F` `soil-4`: trousers, left and right;
  - `g`, `h`, `i` (`path-1`, `path-2`, `path-3`): shirt top, left and right;
  - `j` `soil-2`: hair's top.
- **Parts without outlines.**
  - Give each part's bottom row its face's darker shade (the head's last row, a belt).
  - Light shoulder or pauldron tops.
  - A 1-px gap between the arm and the body.
  - Use 6–8 colors, and at most 4 from the outfit tier.
- **What an outfit changes.** It overrides whole rows of layer 1 only.
  - A hat or helmet recolors the head box and its top rows. Anything above the head (a plume, a hat's crown) adds rows over it.
  - The torso recolors the body and arm boxes.
  - The legs change only their colors.
  - Keep the base's face where the outfit shows it, so every class reads as the same person (the knight wears an open helm).
- **Props.**
  - A held prop is drawn in the `cbob` layer.
  - A flat prop (a shield) lies on the left face's plane, so its top and bottom, and any emblem bar, follow the 2:1 slope, with a 1-px darker edge on its right for its thickness.
  - A long prop (a sword, a staff) is a vertical 2-px stroke, lit on the left and dark on the right, 1 px clear of the head, with the fist drawn over its grip.
  - A prop too big for 24×32 is its own `prop-<class>-<name>` object, placed by `tile` next to the figure inside that class's `data-class` group, so it shows and hides with it; depth order draws it behind or in front of the figure by where it stands.
- **Check at 1× and 3× in the class's setting.** 3× is the Range's size on the page. Where a lit face is close to the floor under it, give it a lighter rim on its lit side. With no outline, a figure has less edge contrast at 1× than the old outlined ones; the owner accepted that.

### Range settings

Each Range class stands in a setting that fits it, built from its own blocks. The alchemist's lab (Data Engineering, class 4) is the reference, as the owner approved it: `block-lab`, `block-lab-left`, `block-lab-right` and the four `prop-data-engineering-*` objects.

- **The floor** is a 3×3 grid of one-level cubes, all from the setting's own floor set, so no two settings share a floor:
  - `block-<setting>` for the inland tiles and the front corner `[2, 2]`;
  - `block-<setting>-left` for the left cliff, `[0, 2]` and `[1, 2]`, where right column 0 copies left column 14;
  - `block-<setting>-right` for the right cliff, `[2, 0]` and `[2, 1]`, where left column 14 copies right column 0.

  Follow the island's joint rules, so any courses or seams run unbroken across the joints. A pattern that runs along the face, such as the worksite's diagonal hazard stripes, copies map column 15 instead of 14 into the joint column, since the joint sits where column 15 would be; that keeps the stripes exact across it. Check the rendered joint rows either way. Generate the three from one script.
- **The lab's floor** is running-bond brick: a `path-2` top with `path-3` joints, bricks one tile long and half a tile wide along the down-right axis; `path-3` left faces with `path-4` mortar courses; `path-4` right faces with `soil-3` mortar. Each setting picks its own material and pattern, in world colors.
- **Hidden faces may be plain.** An inland cube's sides show only while it floats up, and then only for a row or two during the overshoot, so a face hidden at rest may be plain to save bytes. Give the front corner its own `block-<setting>-corner` with full sides when you do. The settled setting must look the same either way.
- **Props** are `prop-<class>-<name>` objects, two to four of them, balanced left and right of the character:
  - None covers the figure, which spans about x −12 to +6 and y 0 to 24 in scene pixels, with its held prop on its left.
  - Tall props go at the back, where the viewBox's top is y −9.
  - A prop may reuse a library object (one of the island's clouds, a tree) and may loop with `wf`, `ff` or `hf`, with frame 0 as its rest pose.
  - Screens, boards and books show shapes and color, never text.
- **Order inside the class group:** the three `ground` rows (0, 1, 2, each by column), then the `object` groups in depth order, which the sort keeps (props behind the character come before it, props in front after it). `data-x` is each group's first object's foot: a tile-placed object's tile center, `(col − row) × 16`, or a `px`-placed sprite's `at.px[0] − anchor[0] + width / 2`, rounded.
- **Budget:** about 22 KB raw and 5 KB gzip per setting, from `npm run pixellab -- art sizes range-sprite`. The lab is 21 KB and 4.6 KB, of which the brick floor is 16 KB. Plain hidden faces and joints on the row seams are the cheapest trims.
- **Check** each setting at 1× and 3× on the stage's background, and watch it build on the dev server: every piece must look right arriving on its own.

### Isometric icons

The achievement icons are solid objects built like the clouds and the bridge, on a 16×16 cell. The chest (`icon-chest`), the star (`icon-star`) and the lock (`icon-lock`) are the references, as approved in the owner's review ([isometric icons spec](../../../docs/intents/2026-10-isometric-icons/spec.md)).

- **One object, no ground.** A 16×16 sprite with one layer, anchor `[8, 15]`, no tile, block, grass or shadow under it, and no `ink`. Columns 0 and 15 stay transparent so neighbours in the sheet don't touch. Its lowest pixels sit on row 15, near the anchor (the chest's are at columns 9–10, the star's two feet at 3–4 and 11–12).
- **Build it from boxes on the 2:1 grid** (screen x = u − v, y = (u + v)/2 − z). A box shows a lit top, a mid left face and a dark right face, with crisp edges between them. Each face holds 2–3 shades at most. The chest is a 9×5 box with a barrel lid; the lock is a 6×4×3 box with a 2-px-thick shackle bar that steps down 1 row per 2 px, like the bridge rail.
- **Shade order.** The lit top is the ramp's shade 2 with a shade 1 rim or crest along its lit back-left edge; the left face is shade 3 and the right face shade 4 (the chest: `wood-2` top, `wood-3` front, `wood-4` end; the lock's body: `gold-2`, `gold-3`, `gold-4`). A top of shade 1 beside a left face of shade 2 merges into one flat face at 3×. The main material shows at least three shades.
- **Even thickness.** A flat shape (a star, a key, a heart) lies on the grid and is extruded by one constant vector, straight down, 4 px for the star. Every edge that faces the viewer gets the same band height: left-facing edges mid, right-facing edges dark. Upright on a face plane, a shape shears and one side comes out twice as thick as the other, which breaks the illusion; the owner rejected that for the star.
- **Edges without outlines.** Where the old outline pixel went, use the darker shade of the face it borders. The icons sit on a near-cream row background (`--color-surface`), so a *lighter* rim vanishes there: the lit edge is carried by shade 1 of the material (the chest's `gold-1` strap tips, the star's `gold-1` rim), never `cream`. A `cream` glint pixel reads as a hole on that background; the lit facets carry the shine instead.
- **Steel is the `path` ramp** (`path-2` top, `path-3` face, `path-4` shade), since the world palette has no neutral gray. Keep `path-2` to tops and single pixels; it washes out on cream.
- **Colors.** 4–8 per icon. The star uses four shades of gold and nothing else.
- **Check at 3× and 1×, and dimmed.** 3× is the icon's 48px size on the page. A locked row shows the icon in grayscale at 40% opacity with the lock over its upper-right third, so a shape must still read by its left half and its shade steps when gray. Judge it on `--color-surface`, not only on the preview's card color, which is darker and makes gold look faint.
- **The lock** stays in its cell's upper-right corner (columns 6–15, rows 0–11) and is drawn in full color over the dimmed icon.

## Pitfalls

- `.` is transparent. A space is not a valid key.
- Keys are case-sensitive: `g` and `G` are different colors.
- Long runs of one character are easy to miscount. Count against the preview, not the text, and let `--check` find ragged rows.
- Don't hand-edit `src/assets/pixel-art/*.svg`, and don't add `.src.svg` files.
- Don't reorder a scene's lines to change what draws in front: the next edit sorts them back. Give the item a `level`, its object a `footprint`, or the `depth` override ([Depth order](#depth-order)).
- A path from before an edit can point at another item after it. Use the path the edit returns, or list the items again.

## Before opening a PR

- [ ] `npm run pixellab -- check <name>` passes for everything you touched, with no `out_of_order` warning (and any `copies` warning explained in the PR), and `npm run art` reports every file `lossless` and none `OVER BUDGET`. For the hero island, paste `npm run pixellab -- art sizes hero-island` into the PR.
- [ ] World colors only (outfit colors only in an outfit); within the caps; light from the island's side.
- [ ] The preview PNGs (1× and 4× at least) are attached to the PR. For the Range, each class you touched at 1× and 3×, from a scratch copy of `range-sprite` that keeps the shadow and only that class's group, and a new floor set at 6×.
- [ ] `npm test` shows `# fail 0`.
- [ ] In the owner's checkout, every art change went to the owner as a Pixel Lab proposal (or, for what the MCP can't express, was written with their OK). Each is approved and in the working tree, or listed in your report by id as still waiting. You applied none yourself, and `npm run art` and `npm test` ran after the approvals.
- [ ] The art is generic and public-safe (`CLAUDE.md`): no names, logos or likenesses.
- [ ] If you changed how art is made (formats, commands, rules), this skill is updated in the same PR.
- [ ] If you changed how art moves (an entrance, a loop), the `pixel-art-motion` skill's checks pass and it's updated in the same PR.
