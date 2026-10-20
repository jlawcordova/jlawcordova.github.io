---
name: pixel-art-motion
description: Animate this site's pixel art. Covers the build-up entrances of the hero island and the Range settings (the schedule, its orders and moves, the enter groups), the CSS frame loops (water, waterfall, crane, trucks, clouds, the island's float), and prototyping a new entrance in the entrance lab at /lab/island-entrance/. Use whenever someone asks to change how the island or a Range setting comes in, to try, tune or ship a stagger, to retime or add a loop, or to animate a new piece of pixel art. Builds on the pixel-art skill.
---
# Pixel-art motion

The pixel art moves in two ways:

- **Build-ups.** The hero island and each Range setting assemble themselves from their `enter` groups. Motion plays them from a pure schedule.
- **Loops.** Water, the waterfall, the crane's box, the trucks, the clouds and the island's float are CSS animations on classes the art compiles onto its groups.
- **Scene motion.** A scene's `motion` timeline moves, shows, hides and re-poses its items on one loop, such as the island level up's production line. The engine compiles it into CSS inside the scene's SVG, and the lab's Animation pane plays and edits it ([Scene motion](#scene-motion)).

Drawing the art itself is the `pixel-art` skill. This skill is about how it moves.

## Where things live

| What | Where |
| --- | --- |
| The schedule: `Timing`, `TIMING` (island), `RANGE_TIMING`, the orders and moves, `schedule()`, `settledBy()` | `src/lib/island-entrance.mjs` (plain `.mjs`, so `node:test` imports it) |
| Playing a schedule on SVG groups: `pieceOf()`, `playEntrance()` | `src/lib/play-entrance.ts` |
| The one door to Motion: `play()`, `reduced()`, `easeOut` | `src/lib/motion.ts` |
| Who plays it | `src/components/home/Hero.astro` (on load), `Range.astro` (on every class change), the entrance lab |
| The entrance lab | `src/pages/lab/island-entrance.astro` and `src/components/lab/EntranceLab.astro` |
| The pop's origin | `.hero-island .enter` in `src/styles/hero.css` |
| The CSS loops and their reduced-motion frames | `src/styles/pixel-art.css` |
| Tests | `scripts/island-entrance.test.mjs` (schedule), `scripts/pixel-art-island.test.mjs` (groups and loops), `scripts/range-art.test.mjs`, and the e2e checks in `shell.e2e.mjs`, `motion.e2e.mjs` and `range.e2e.mjs` |
| The current choice, and why | [island edge sweep spec](../../../docs/intents/2026-10-island-edge-sweep/spec.md) (the numbers; the [island sweep drop spec](../../../docs/intents/2026-10-island-sweep-drop/spec.md) before it set the order and moves, and the [clock sweep](../../../docs/intents/2026-10-island-clock-sweep/spec.md) added the groups' feet and the lab), [Range settings spec](../../../docs/intents/2026-10-range-settings/spec.md) R4–R6, and the design system's Motion section |

## Hard rules

- **Never hide the art.** The SVG ships with every piece in place. A start state (opacity 0, a scale, an offset) is set only by the call that animates it, which is what `play()` does. Never hide a piece in CSS or in markup to animate it in later. With JavaScript off, or with Motion blocked, the art shows at once.
- **Reduced motion.** `play()` does nothing under `prefers-reduced-motion: reduce`, and `pixel-art.css` stops every loop on its frame 0. A new loop needs a frame 0 that reads as a still picture, and a line in the reduced-motion block.
- **Smooth versus stepped.** Build-ups glide, with `easeOut` to the peak and `SETTLE_EASE` onto the spot. Only the art's own CSS loops step (`step-end`, `steps()`), in `pixel-art.css`, or in a scene's compiled motion, which the engine writes into that scene's SVG (pixel-first look spec R10, widened by the island level up spec). The lab's `stepped` move is a pixel-art option that the site doesn't use.
- **Motion only through `src/lib/motion.ts`,** and build-ups only through `playEntrance()`. Then the hero, the Range and the lab play exactly the same code.
- **Build-ups are a named exception** to the design system's 0.12–0.5s rhythm. When their numbers change, update the design system's Motion section in the same PR, and keep the numbers under their own names in `island-entrance.mjs`.
- **Edit the art only in its sources** (`pixel-art` skill). The groups and their data attributes come from the scene source. Never edit the compiled SVG.
- **No new dependencies.** Motion is already there.

## Enter groups

Every item in an animated scene sits in exactly one top-level group with class `enter`. Groups don't nest. `pieceOf()` reads each group's data:

| `data-enter` | Data | Hero island | Range setting |
| --- | --- | --- | --- |
| `shadow` | none | the 11 shadow pieces, one group | none: the shadow sits outside the classes |
| `ground` | `data-col`, `data-row`, and the foot `data-x`, `data-y` (its tile's center) | one group per cube (132), row by row (their depth order) | one group per floor row, with `data-row` only |
| `object` | the foot `data-x`, `data-y` | one group per run of objects that arrive together | one per prop, and one for the outfit, with `data-x` |
| `sky` | none | the three clouds | none |

**The foot** is where a piece meets the ground: the center of a sprite's bottom row, `[round(at.px[0] − anchor[0] + width / 2), at.px[1] − anchor[1] + height − 1]`, or a tile-placed object's tile center (`tileToPx`). Pieces of one thing share their first item's foot: a `tree-shade` takes its tree's, and the crane's jib and box take the mast's. Each item in a group shares the group's `data-x`, and `data-y` is the first item's. `scripts/pixel-art-island.test.mjs` checks every value.

**Adding a piece to the island:**

1. Put it in its own `object` group with its foot `data-x` and `data-y` (`scene_place --new-group '{"class": "enter", "data-enter": "object"}' --foot`). The edit sorts the scene, so the group lands where the piece stands; give the piece a `level` if it rides or hangs above the ground (the `pixel-art` skill, Depth order).
2. Run `npm run art`.
3. The schedule places it in the order by its foot, so no motion code changes.

A new ground position is its own `ground` group with its place and foot. Groups break up color merges, so each one costs bytes (`npm run pixellab -- art sizes hero-island`).

**Groups are in depth order.** The groups sit in the SVG in the scene's depth order, which every edit keeps. The orders below read each group's data, not its place, so a sort doesn't change when a piece enters, except for `random`, which seeds each piece by its index in the SVG: after a sort that moves groups it gives another, equally random, shuffle (the depth order migration moved 34 of the island's 219 pieces in it).

## The schedule

`schedule(pieces, timing)` returns each piece's `{ move, delay, duration, keyframes, times }`, or `null` for a kind it doesn't know. The order of events:

1. The shadow fades in at `start`.
2. The ground starts at `start + groundDelay`. Each piece is spread over `groundSpan` by the ground order, plus up to `cascade` from left to right.
3. Objects start `objectLead` before the last ground piece lands, spread over `objectSpan` by the object order. With `with: true`, each object instead starts `lag` after the ground piece nearest its foot.
4. The clouds drift in as the objects begin.

**Orders.** Each order gives a piece a score, lower first, and the scores are spread over the span. All but `random` score a piece by its data:

| Order | Enters first |
| --- | --- |
| `rows` | row by row, the highest row (the left cliff) first |
| `cols` | column by column, column 0 (back left) first |
| `back-front`, `front-back` | by foot depth (screen y) |
| `sweep`, `ltr` | left to right by screen x |
| `center`, `edges` | rippling out from the middle, or in from the edges |
| `clock` | the screen angle about the ground's middle, clockwise from the left corner |
| `checker` | two waves, like a checkerboard |
| `random` | shuffled by `seed` and the piece's index in the SVG, the same on every replay until a sort moves the groups |
| `together` | all at once |
| `same` | objects only: the ground's order |

**Moves:**

| Move | What it does | Uses |
| --- | --- | --- |
| `float` | rises `rise` art px, overshoots `overshoot`, settles | `rise`, `overshoot`, `peak` |
| `drop` | the same, from above | `rise`, `overshoot`, `peak` |
| `pop` | grows from its foot, from `popFrom` to `popPeak`, then settles to 1 | `popFrom`, `popPeak`, `peak` |
| `stepped` | a float that lands on whole art pixels (lab only) | `rise`, `overshoot`, `peak` |
| `fade` | opacity only | none |

The ground uses `move`, `duration`, `peak`, `rise`, `overshoot`, `popFrom` and `popPeak`. The objects use `objectMove`. With `same` (the default), they move exactly as the ground does, numbers and all. With a move of their own, they take `objectDuration`, `objectPeak`, `objectRise`, `objectOvershoot`, `objectPopFrom` and `objectPopPeak`, so the cubes can float with an overshoot while the objects drop with no dip, for example. `motionOf(t, 'ground' | 'object')` resolves either.

`y` and `x` are in the SVG's own units, so 10 means 10 art pixels: about 30 CSS pixels at the hero's 675px, and about 17 at 390px. `scale` needs `transform-box: fill-box` and a `transform-origin` on the group, or it grows from the SVG's corner. The island's is set in `hero.css`.

## Prototyping in the lab

Run `npm run dev`, then open http://localhost:4321/lab/island-entrance/. The page is unlisted and `noindex`. It plays the hero island with the real schedule and player, so what you see is what ships.

- **Controls.** Two tabs, **Ground** and **Objects**, each with its own order, timing and move. Every `Timing` field the current choices use is there, and fields that don't apply hide. Giving the objects a move of their own starts their numbers from the ground's, so only the move changes at first. Arrow keys move between the tabs.
- **Keys and buttons.** Any change replays at once. R replays and H hides the controls. **Playback speed** slows it to ½× or ¼× to study one wave. **New shuffle** re-seeds the random orders. **Site version** goes back to `TIMING`.
- **Sharing.** The settings live in the URL, so a link reproduces a look. **Copy** gives the changes to `TIMING`, ready to paste.
- **Running it for the owner.** Start the dev server with the browser preview (`preview_start` with the project's dev configuration) and give them the URL. Owners tune by eye, and the numbers they hand back are what the spec records.
- **Adding an option.** Add the order to `GROUND_ORDERS` or `OBJECT_ORDERS` (or the move to `MOVES`), score it in `score()` (or shape it in `moveOf()`), give it a label in `EntranceLab.astro`, and give any new number a `Timing` field and a range in the lab. The every-option test in `island-entrance.test.mjs` then checks it ends in place.
- **Something the lab can't express** (another scene, a new kind of piece): prototype it in a worktree as a throwaway panel, keep it off `main`, and port what the owner picks into the schedule and the lab afterwards.

## Shipping a choice

1. **Docs first.** A new look is a change of intent, so follow `CLAUDE.md` ("How changes flow"). Record the owner's settings line in the spec, word for word.
2. **The numbers.** Set the fields in `TIMING` (or `RANGE_TIMING`). Keep the Range's numbers by name, so an island change can't move the Range.
3. **The tests.** Update `scripts/island-entrance.test.mjs` for the new order, move and settle time, keep the Range's pins, and keep the every-option test.
4. **New data.** If the order needs data the groups don't carry, add it to the scene source (as `data-col` and `data-y` were added for the clock sweep), and to the island tests.
5. **The design system.** Update the Motion section's numbers for the build-up.
6. **The e2e comment.** If the settle time changes, update its comment in `scripts/e2e/shell.e2e.mjs`.
7. **Verify** (below), and paste the output into the PR.

## Scene motion

A sequence where pieces travel and hand things on (a truck drives up, tips its load, leaves) is a scene's `motion`, not hand-written CSS. The format is in the `pixel-art` skill (Scenes); the engine is Pixel Lab's `pixellab/motion` (`node_modules/pixellab/cli/lib/engine/motion.mjs`).

- **One loop per scene.** `duration` is the whole cycle in ms, and every track runs on it, so pieces stay in step. Something that "keeps coming" is one item that leaves hidden and comes back at the start of the next cycle.
- **Keys.** Each key at `t` ms sets, from then on, the item's `move` (pixels from where the scene places it), `show` and `pose` (another object with the same anchor, such as `truck-open-tipped`). Values carry over from the key before. The first key is at 0, the rest frame, which is what reduced motion shows, and every `t` is less than `duration`.
- **Moves step a pixel at a time.** Between two keys an item steps toward the next key's move: one pixel per step along a straight line, 1 across and 1 up or down along a 1:1 diagonal (what a ramp along the belt's axis uses), or 2 across and 1 down along the 2:1 grid. Another angle takes fewer, larger steps, so keep moves on the grid's lines. After the last key it steps back to the first key's move over the rest of the loop, so hide it or hold it there.
- **What it compiles to.** Each tracked item gets a `<g class="mv-<id>">`, one `<g class="mv-<id>-<n>">` per pose, and keyframes in a `<style>` at the top of the SVG: `steps()` transforms for moves, `step-end` opacity for show and poses, and a reduced-motion rule that turns them all off. The art is drawn at the rest frame, with hidden pieces and unused poses kept in the SVG at opacity 0.
- **Editing it.** In the owner's checkout, key it over the MCP and send it for approval with `doc_save`, as the `pixel-art` skill's flow says: `scene_track_add` makes a track, `scene_key_set` sets a key's `move`, `show` and `pose`, and `scene_motion_path` keys a run along the grid. Only a track rewritten as a whole lives in the source: that's an edit the MCP can't express, so ask the owner before writing it. In a worktree, write the `motion` block in the source, by hand or with a script, or use Pixel Lab's commands. `scene_set <scene> <item> --id <id>` names an item. Once it has a track (`scene_track_add`), `scene_move <scene> <id> --by col,row --time <ms>` (or `--nudge x,y`) keys its move at that time, making the key if needed, and `scene_render <scene> --time <ms>` shows that moment, with every frame loop. Pixel Lab's timeline plays and scrubs the result (⌥⌘P) for the owner.
- **Depth while moving.** A moving item that is alone in its list changes place in the depth order as it moves, and the SVG draws a copy of it for each place, which costs bytes (`check` lists `copies`). Keep every moving piece alone in its own `enter` group: a group keeps its place at rest for the whole loop, so there are no copies, and the island's tests can read the list as the paint order at every moment (a test checks both). Its order against a piece it only meets mid-loop is then the list's order, so render those moments (`scene_render --time`) and fix a wrong one with a `level` or the override, never by moving lines.
- **The page.** Scene motion runs inside the `enter` groups like the frame loops, so the entrance and the motion never set the same element's transform. Class and keyframe names are `mv-<id>`, unprefixed, so only one inline SVG on a page may carry motion.

## The CSS loops

A loop is frames in the art and keyframes in the CSS:

- **In the art,** a layer `{ loop: 'wf', prefix: 'w', frames: [...] }` (or a block `surface` with `loop`) compiles to groups `class="wf w0"`, `class="wf w1"` and so on (the `pixel-art` skill, Formats). Pixel Lab's `object_animate <name> --layer <n> --loop wf|ff|hf` turns a still layer into one with the right frame count, `object_frame_*` adds, duplicates, moves and deletes frames, and `object_render <name> --frame <k>` shows each frame. A placement class (`class: 'pcloud pc0'`) moves a whole object; a piece that travels and hands things on is the scene's motion instead (above).
- **In the CSS** (`pixel-art.css`), each frame loop is an opacity keyframe that shows frame *n* for 1/*N* of the cycle, with `step-end` timing and one negative `animation-delay` per frame. The loops are `wf` (1.0s, 5 frames), `ff` (0.6s, 4) and `hf` (3.0s, 6). Placement loops move with stepped transforms: `pcloud`, `floaty` and `cbob`. (The trucks' old `idrive` went with the island level up: the scene's motion drives them.)
- **Reduced motion** sets `animation: none` and shows frame 0 (`.w0, .f0, .h0`); a scene's motion turns itself off with its own rule.
- **The tests.** The island test "R4: the groups the CSS animates" counts the loop classes (`wf` per river tile and the falling face, `ff` for the flag and the belt segments, `hf` for the processor, `pcloud` for the clouds). Update that count when a loop's piece is added or removed, and check the CSS names any new class.
- **Loops and build-ups don't fight.** The loops' classes sit on groups inside the `enter` groups, and the island's float is on its own wrapper (`.hero__float`), so the CSS and Motion never set the same element's transform.

## Verifying

- `npm test`: the schedule, group and loop tests.
- `npm run build`, then `npm run e2e`:
  - `shell.e2e.mjs` waits for every `.hero-island .enter` to end at opacity 1, untransformed, and checks them without JavaScript and under reduced motion;
  - `motion.e2e.mjs` checks them with Motion blocked;
  - `range.e2e.mjs` does the same for each setting.
- **Headless,** look at a scene's motion and loops at any moment with `scene_render <scene> --time <ms>` (Pixel Lab), and at an object's frames with `object_render --frame <k>`. Entrances run only in the page.
- **In the browser,** check end states with computed styles, not screenshots. When the preview pane is hidden, its timeline is throttled, so a long-running script or a quick screenshot catches a stale frame. Read `getComputedStyle(group).opacity` and `.transform` after the settle time. For a mid-entrance frame, use the lab at ¼× and press R just before the screenshot.
- Screenshots at 1440px and 390px, with no horizontal scroll (`CLAUDE.md`).

## Pitfalls

- **A cancelled animation keeps its start state.** Cancelling a pop that hasn't started leaves its `scale(0.3)` inline, and a later float never resets it. Put every piece back in place first (`play(groups, { opacity: 1, x: 0, y: 0, scale: 1 }, { duration: 0 })`), as the lab does. The Range completes a running build before starting the next.
- **Don't order by `getBBox()` in the page.** It can't be tested in `node:test`, it changes while loops run, and it splits a shade from its tree. Use the feet in the data.
- **Ties start together.** The clock's hand at the start lies on a line of cubes, so three start at once. Every order is a score, so equal scores mean the same moment.
- **The schedule spreads scores over the span,** so the last-scored piece always starts exactly `span` after the first, whatever the order.
- **The Range replays on every class change,** about every 3s, so its build-up has to stay quick. Don't give it the island's numbers without the owner's say.
