# Spec: Island level up (from intent.md 2026-10-18)
Status: approved, 2026-10-19: the owner approved the animation and asked for this PR.

Written after the owner reviewed the work in stages (the object list, each object, the composed island twice and the animation twice), so it records what was decided rather than proposing it. The shared art decisions, object by object, are in [art-brief.md](art-brief.md); the approved object list is [objects.md](objects.md).

## Requirements

### The island

- **R1.** The hero island is three joined sections on one grid: today's island in the middle (cols 0–5, rows 0–5, plus one column at col 6 on rows 0–2 behind the waterfall row), a mining section on its L–B side (rows 6–10) and a rail section on its T–R side (rows −6 to −1, cols 0–10). The road runs along col 2 through all three.
- **R2.** The middle island keeps the house, the river along row 3 to the waterfall at [5, 3], the river bridge and its rail, the trees and the clouds. The waterfall falls about 2.5 levels below the island (the 64 px cap; the owner asked for about three).
- **R3.** The mining section has the stone-vaulted `tunnel-road` where the road leaves at the L–B cliff, a `block-mine` ore ground at its bottom-left with a heap of ore, a raised `conveyor-row` belt that carries ore up-right into the `ore-screen` over `track-mine`, and one `mine-cart` that runs to the road.
- **R4.** The middle island holds the processing line past the river bridge: the `hopper` beside the road, the `processor` with its glowing LED panel, the `container`'s loading spot at the processor's outlet, and the `boxes` stack beside it.
- **R5.** The rail section is grass. The `track` runs along row −3 from the two-piece `tunnel-rail` at its T–L end to `block-rail` at the B–R cliff; the road crosses it on the timber overpass (`bridge-road` with `bridge-road-ramp` and `bridge-road-ramp-far`); the `crane` stands between the track and the loading spot, with three jib and three hook poses; the train is a truck-sized `locomotive`, a `flatcar` and a `boxcar`, one tile each.
- **R6.** Every new object is in world colours with no `ink` and no outline, within 64×64 and 12 colours, lit top, mid left face, dark right face, as the `pixel-art` skill's Island and Range look says.

### The production line

- **R7.** One loop of 28 s plays on the island, and the scene at its end matches its start, so it repeats without a seam: ore appears on the heap, rides the belt into the screen and drops into the cart; the cart rolls to the road and tips into a truck (two cart trips fill it with 4 ores); the truck drives over the river bridge, tips its ore into the hopper, then drives on up the overpass and off the road's T–R end; the processor's LED pulses and four parcels go into the container; the train arrives out of the tunnel carrying an empty container, the crane lifts it off and sets it at the loading spot, then lifts it back onto the same flatcar once it's loaded, and the train leaves past the B–R cliff. A new truck comes out of the road tunnel each loop. No piece appears from nowhere: each comes out of a tunnel, off a heap or out of the processor, or arrives on the train.
- **R8.** Trucks pitch up and down the overpass ramps (`truck-open-up`, `truck-open-down`) and sit flat on the deck and the roads; a truck going down the far ramp paints behind the bridge.
- **R9.** Reduced motion shows the loop's first frame, still, and that frame is a full picture of the island at work. The motion runs in CSS inside the SVG, so the page needs no JavaScript for it.

### The engine and the lab

- **R10.** A scene can carry a `motion`: one loop of `duration` ms with a track of keys per item that has an `id`. Each key sets the item's `move` (whole px from its placement), `show` and `pose` from its time on; moves step a pixel at a time along straight or 2:1 lines; the first key is at 0, the rest frame. The engine validates it, draws the rest frame and compiles the tracks to CSS (`mv-<id>` classes, `steps()` and `step-end` keyframes, and a reduced-motion rule) in a `<style>` at the top of the SVG.
- **R11.** The lab's Scene mode has an Animation pane: play, pause, a time scrubber and the loop length, with every frame loop playing on the stage; and the selected item's track, with Animate this item, keys added at the current time, keys moved by dragging or the arrow keys past 0 s, and each key's time, X, Y, Shown and Pose editable. Export saves the motion.
- **R12.** Object mode's Frames panel becomes an Animation pane: Animate this layer turns a still layer into one of the site's loops (`ff`, `wf`, `hf`) with its map copied into each frame, Loop switches between them and warns when the frame count differs from what the site plays, Stop animating keeps one frame, and Poses opens the objects named after this one.
- **R13.** `/lab/pixel-art/?object=<name>` and `?scene=<name>` open that document.
- **R14.** The lab fills the screen with no nav or footer, each panel scrolling on its own, and links back to the site.
- **R15.** `npm run art -- --sizes` works on a scene with motion.
- **R16.** A `design-scene` skill runs the site and hands over lab links while a scene or the island is designed, with one `pixel-artist` subagent at a time per object (small ones batched, at most 3) and a separate one for the scene.

### Budgets

- **R17.** `hero-island.svg` stays within **750 KB raw and 150 KB gzip** (raised from 500 KB and 125 KB by the owner on 2026-10-19). It is about 500 KB raw and 101 KB gzip, the motion's CSS about 28 KB of that.
- **R18.** The lab's JS, engine included, stays within **36 KB gzip** (raised from 30 KB for the Animation pane, the owner's call).
- **R19.** The island still builds in with the entrance schedule (`TIMING`, unchanged): the ground sweeps left to right by screen x in 0.5 s, and the whole island settles by **1.5 s** (it settled by 1.45 s when it was 6×6; the bigger island lands its last piece at 1.47 s).

## Design

- **Scene.** `scenes/hero-island.mjs` keeps the entrance groups: one `shadow` group of 24 `island-shadow` pieces, 129 `ground` groups (one per cube, with any top laid over it), `object` groups with their feet, and one `sky` group. The motion's moving items sit inside their object groups, so the entrance and the motion never set the same element's transform. The island is generated by a script outside the repo; the source is the record. The close-up scenes are re-framed on the new island.
- **Paint-order hand-offs.** A scene's paint order is fixed per item, so a moving piece that must pass behind something at one moment and in front at another is two items of the same object, one hiding as the other shows: the trucks at the loop's wrap and at the overpass deck's far edge, the ore between belt, cart and truck bed, and the container between the flatcar (painted before the locomotive) and the loading spot.
- **Hero.** `hero.css`: beside the copy (from 1024 px), the island is 150% of its column wide and runs off the hero's right edge, so the rail section and the leaving train crop off; stacked, it shows whole, smaller. No horizontal scroll at any width.
- **Engine.** `src/lib/pixel-art/motion.mjs` (new) holds the format, validation, stepping (`stateAt`), posing for the lab (`poseItems`) and the CSS (`motionCss`); `engine.mjs` validates `id` and `motion`, draws tracked items at their rest frame in `mv-` groups (one sub-group per pose) and lets `composite` play frame loops at a time; `svg.mjs` writes the `<style>`; `serialize.mjs` writes `id` and `motion` canonically. `edit.mjs` gains `animateLayer`, `setLoop` and `stillLayer`.
- **Lab.** `animation-panel.ts` (new) is the Scene mode pane; `frames-panel.ts` becomes Object mode's Animation pane; `stage.ts` poses the scene at the pane's time; `scene-mode.ts` keys moves past 0 s; `lab.ts` opens `?object=`/`?scene=`; `BaseLayout.astro` gains `bare`, which the lab page uses; `lab.css` fits the workspace to the viewport.
- **CSS loops.** The trucks no longer use `itruck`/`idrive`; the scene's motion drives them. `pixel-art.css` keeps `wf`, `ff`, `hf`, `pcloud`, `floaty` and `cbob`, and drops `idrive`, `.itruck` and `.it2`.
- **Library.** The new objects are in [objects.md](objects.md), with the owner's later additions: `block-mine` (and edges), `conveyor-low`, the slanted and tipped truck poses, `crane-hook-low`, `crane-hook-drop`, `crane-jib-side`, `crane-jib-back` and the two-piece rail tunnel. `block-yard` and the review boards were retired. `truck`, `truck-green`, `crane-box`, `conveyor`, `conveyor-low`, `truck-open-green` and `fence` stay in the library but aren't placed.
- **Tests.** The island tests that pinned today's 6×6 island are re-pinned to this layout with the same intent: the ground grid and its edge pieces by neighbour, the settled ground painting what flat tiles would, the shadow pieces, the entrance groups and feet, the trucks on the road's line at every step of the loop, the trucks and trees painting in depth order, the crane stacked with the hook under the jib, the pinned positions of trees and front pieces, the CSS loops, and the SVG's safety (now allowing the engine's motion `<style>` and nothing else). New tests cover the motion format, the lab's links, both Animation panes and `--sizes` on motion.
- **Docs.** The `pixel-art`, `pixel-art-motion` and `design-scene` skills, the pixel-artist agent and `CLAUDE.md` describe the motion format, the panes, the links, the budgets and the new island.

## Areas of concern

- **The 64 px cap shortens the waterfall** to about 2.5 levels below the island rather than three. A second object stacked under it would add the rest; left as is unless the owner asks.
- **Pixel-first look spec R10 said stepped animation lives in `pixel-art.css` alone.** Scene motion steps in CSS inside the scene's SVG. The `pixel-art-motion` skill records the widening.
- **Only one inline SVG on a page may carry motion,** since `mv-` class names aren't prefixed per scene. Only the hero does.
- **Ore reads faintly on the dark belt,** and the descending truck shows only its cab and bed top behind the far ramp's rail; both are as the owner reviewed them.
- **The entrance settles 0.02 s later** with the bigger island (R19); `TIMING` is unchanged.

## Open questions

None open. Every intent question was answered with the owner (see intent.md), and the reviews' changes are recorded in art-brief.md.
