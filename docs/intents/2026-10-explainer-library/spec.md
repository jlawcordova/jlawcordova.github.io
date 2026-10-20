# Spec: Explainer asset library (from intent.md 2026-10-21)
Status: approved.

## Requirements
- R1. The library is its own Pixel Lab document, `art/explainer-library.pixellab/`, separate from the site's document. Nothing the site builds or serves reads it, and no site art or page changes.
- R2. Its palette is the site's palette, color for color, so the assets match the site's art. A test keeps the two files identical.
- R3. Every asset follows the site's look and the engine's rules: the 32×16 tile, light from the left (top lightest, left face mid, right face darkest), world colors only (outfit colors only in objects that extend `character`), no `ink` outlines, at most 12 colors per object, and the 64×64 map cap. Oversized pieces are fine within that cap.
- R4. The 44 assets in the [Asset list](#asset-list) exist as objects, under the names it gives. A test checks every name.
- R5. The animated assets carry the loop the list gives them, with frame 0 as their still pose, so every asset works as a still image too.
- R6. Every source validates with the engine and is in canonical form (a test, as for the site's document).
- R7. Contact-sheet scenes place the assets by group on their floors, so the library can be browsed in Pixel Lab and previewed in one image per group.
- R8. One command exports the library for video and infographics: a transparent PNG of every object, one per loop frame, at a chosen scale, plus each contact sheet, into a git-ignored folder.
- R9. Generic and public-safe: no names, lettering, logos or likenesses. Screens, boards and charts show shapes and color, never text. Number markers show a single digit.

## Design

### The document
- `art/explainer-library.pixellab/`: `manifest.json` (name `explainer-library`, no publish folder, since no scene has an `output`), `palette.mjs` (a copy of the site's), `objects/` and `scenes/`.
- `objects/character.mjs` is a copy of the site's base character, so the people are outfits on the same figure as the Range's classes (`extends: 'character'`).
- It's edited with the `pixellab` CLI, `--document art/explainer-library.pixellab` (the MCP server is bound to the site's document), or in Pixel Lab with File › Open Document….

### Materials
The world palette has no neutral gray, blue or white outside the outfit tier, so:
- white goods, plates and paper: `cream` and `path-1`, shaded with `path-2`/`path-3`;
- steel and machine cases: the `path` ramp (warm steel), or the `water` ramp for cool steel and screens;
- screens: `water-1`/`water-2` glow on a `water-4` or `soil-4` bezel;
- LEDs and signals: `grass-1`/`grass-2` (on), `gold-1` (warning), `roof-1` (alert);
- flames: `gold-1`, `gold-2`, `roof-1`, `roof-2`;
- people and robots: outfits on `character`, which may use the outfit tier (`silver`, `slate`, `navy`, `sky`, `violet`, `orange`).

### Loops
The engine's loops, as the site uses them: `ff` (4 frames, 600 ms), `wf` (5 frames, 1 s) and `hf` (6 frames, 3 s), plus the `cbob` layer class every character already has (the idle bob). Frame 0 is the still pose. Two-state assets are two objects (`bulb` and `bulb-off`).

### Asset list
Numbers 1–20 are the owner's list; 21–44 were added in the brainstorm and approved with it. "Still" means no loop.

| # | Asset | Objects | Motion |
| --- | --- | --- | --- |
| 1 | Chef | `chef` | `cbob` |
| 2 | Waiter | `waiter` | `cbob` |
| 3 | Kitchen floor | `block-kitchen` (cube), `tile-kitchen` (flat tile) | still |
| 4 | Stove | `stove` | `ff` flames, steam |
| 5 | Sink | `sink` | `wf` running water |
| 6 | Tables | `table`, `table-long` | still |
| 7 | Chairs | `chair`, `chair-turned` (the other facing) | still |
| 8 | Server machines | `server-rack` (oversized), `server-tower` | `hf` LEDs |
| 9 | Computer | `computer` | `ff` cursor on screen |
| 10 | Desks | `desk`, `desk-l` | still |
| 11 | Potted plants | `plant-tall`, `plant-bush`, `plant-cactus` | still |
| 12 | Cubicle walls | `cubicle-wall`, `cubicle-wall-turned`, `cubicle-corner` | still |
| 13 | Office floor | `block-office`, `tile-office` | still |
| 14 | Water dispenser | `water-dispenser` | `hf` bubble |
| 15 | Wires | `wire`, `wire-turned`, `wire-corner-n`, `wire-corner-e`, `wire-corner-s`, `wire-corner-w`, `wire-junction`, `wire-plug` | `wf` packets on `wire` and `wire-turned` |
| 16 | Office staff | `staff-developer`, `staff-manager`, `staff-analyst` | `cbob` |
| 17 | Laptop | `laptop` | `ff` screen |
| 18 | Cats | `cat`, `cat-black`, `cat-gray`, `cat-white`, `cat-calico` (recolors extend `cat`) | `hf` tail flick |
| 19 | Charts | `chart-bar`, `chart-line-up`, `chart-line-down`, `chart-pie` (each on an easel board) | still |
| 20 | Giant light bulb | `bulb`, `bulb-off` (oversized) | `ff` glow on `bulb` |
| 21 | Order ticket rail | `ticket-rail` | still |
| 22 | The pass | `kitchen-pass` (counter, heat lamp, bell) | still |
| 23 | Fridge | `fridge` | still |
| 24 | Recipe book | `recipe-book` (open on a stand) | still |
| 25 | Plates | `plate`, `plate-dish`, `plate-stack` | still |
| 26 | Database | `database`, `database-stack` | still |
| 27 | Router / load balancer | `router` | `hf` port lights |
| 28 | Firewall | `firewall` (brick wall with a flame) | `ff` flame |
| 29 | Cloud platform | `cloud-platform` (a cloud slab things stand on) | still |
| 30 | Globe | `globe` (on a stand, with region pins) | `wf` spin |
| 31 | Monitoring wall | `monitor-wall` | `wf` graphs |
| 32 | Vault | `vault`, `padlock` | still |
| 33 | Robot agents | `robot`, `robot-small` (outfits on `character`) | `cbob`, `hf` antenna blink |
| 34 | Tokens | `token`, `token-gold`, `token-water` (cubes with a glyph shape; recolors extend `token`) | still |
| 35 | Bookshelf | `bookshelf` | still |
| 36 | Toolbox | `toolbox` | still |
| 37 | Plug and hub | `plug-hub` | `ff` spark |
| 38 | Sandbox | `sandbox` | still |
| 39 | Balance scale | `scale` | `hf` tilt |
| 40 | Filing cabinet | `filing-cabinet` | still |
| 41 | Arrows and packets | `arrow-ne`, `arrow-nw`, `arrow-se`, `arrow-sw` (flat on a tile), `arrow-up`, `data-packet` | `ff` pulse on `data-packet` |
| 42 | Bubbles | `bubble-speech`, `bubble-thought`, `bubble-typing`, `bubble-check`, `bubble-question`, `bubble-alert` | `ff` dots on `bubble-typing` |
| 43 | Signs and markers | `signpost`, `placard`, `marker-1` … `marker-5` | still |
| 44 | Whiteboard | `whiteboard` | still |

### Contact sheets
Preview-only scenes (no `output`) that place each group on its floor: `sheet-kitchen` (1–7, 21–25), `sheet-office` (8–20, 44), `sheet-cloud` (8, 15, 26–32), `sheet-ai` (33–40) and `sheet-glue` (41–43). Each batch adds its assets to its sheet.

### Export
`npm run explainer-export` runs `scripts/export-explainer-library.mjs`. It lists the document's objects and scenes with the `pixellab` CLI and writes, into `.explainer-export/` (git-ignored):
- `<object>.png` for a still object, or `<object>-f<n>.png` for each frame of a looped one, rendered transparent at `--scale` (default 8);
- `<sheet>.png` for each contact sheet, on the preview card color.
The base `character` is left out.

### Tests
`scripts/explainer-library.test.mjs` (Node built-ins and the `pixellab` engine, as the site's art tests): the document validates (R6), every source is canonical (R6), the palette file equals the site's (R2), every asset in the list exists (R4), each looped asset has its loop (R5), and the people and robots extend `character`.

## Areas of concern
- **Palette.** The world tier is full and has no neutral gray, blue or pure white, which machines, screens and white goods want. The spec keeps the site's palette as is (R2) and uses the materials above. If an asset reads wrong without a true gray, the fix is a palette change in both documents, which is the owner's call; the build reports it rather than adding a color.
- **Animation in the export.** The loops play in Pixel Lab and as frame sequences in the export. A compiled SVG would need the site's CSS to animate, so the library publishes no SVGs.
- **Size.** Oversized pieces stay within the engine's 64×64 cap; the server rack and the giant bulb are the largest.

## Open questions
None.
