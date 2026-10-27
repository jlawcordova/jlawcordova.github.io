---
name: pixel-art-motion
description: Animate this site's pixel art. Covers the build-up entrances of the hero island and the Range settings (each scene's `entrance`: its orders, moves and enter groups, played by the SVG through `data-play`), the loops the SVGs play by themselves (frame loops for water and the waterfall, ambient loops for the clouds, states for the character's bob and hop and the island's crane, cart, gates, signals and truck, scene motion for the trucks and crane, and actions) and the island's CSS float, and tuning a build-up in Pixel Lab's Entrance section. Use whenever someone asks to change how the island or a Range setting comes in, to try, tune or ship a stagger, to retime or add a loop, a state or an action, or to animate a new piece of pixel art. Builds on the pixel-art skill.
---
# Pixel-art motion

The pixel art moves in two ways:

- **Build-ups.** The hero island and each Range setting assemble themselves from their `enter` groups. The timing is each scene's `entrance` in the document, Pixel Lab (v0.10.0 or later) compiles it into the scene's SVG, and the SVG plays it when the page puts `enter` in a `data-play` list. The site has no copy of the schedule.
- **Loops.** Each compiled SVG plays its own loops from a `<style>` the compiler writes into it (Pixel Lab's site contract): frame loops (water, the waterfall, the belts' and processor's lights), ambient loops (the clouds' drift), states (the character's `idle` bob and its one-shot `hop`, which the page plays by name, and the island's moving parts) and actions, one-shot moves of a scene item the page plays by name. Only the island's float is page CSS, on its HTML wrapper.
- **Scene motion.** A scene's `motion` timeline moves, shows and hides its items, and switches their states, on one loop, such as the island level up's production line. The engine compiles it into CSS inside the scene's SVG, and Pixel Lab's timeline plays and edits it ([Scene motion](#scene-motion)).

Drawing the art itself is the `pixel-art` skill. This skill is about how it moves.

## Where things live

| What | Where |
| --- | --- |
| The timing: each scene's `entrance` (`Timing` fields, times in whole ms; a field left out keeps Pixel Lab's default, the hero island's pick, so the hero's is `{}`) | `scenes/hero-island.json`, `scenes/range-sprite.json`; edit with Pixel Lab's Entrance section or `scene entrance set`, read with `scene entrance show` |
| The schedule (orders, moves, eases) and the CSS that plays it | Pixel Lab's engine, pinned in `scripts/pixellab.mjs`; the lab's `docs/site-contract.md`, "The entrance", says what a page may rely on |
| The one door to Motion: `play()`, `reduced()`, `easeOut` | `src/lib/motion.ts` |
| Who asks for it | `src/components/home/HeroIsland.astro` (`data-play="enter"` on the inlined `<svg>`, so it plays on load without script) and `Range.astro` (`enter` in the current class group's `data-play`, on every class change) |
| Loops, ambient loops, states and actions | the document's sources (`objects/*.json`, `scenes/*.json`), compiled into each SVG's own `<style>`; the float only in `src/styles/pixel-art.css` |
| Playing a one-shot state or an action | the page sets `data-play` (the Range's A in `src/components/home/Range.astro`) |
| Tests | `scripts/entrance-svg.test.mjs` (both SVGs carry their entrance, play it only with motion allowed, the hero asks for it, and each settles when it should), `scripts/range-change.test.mjs` (the hop), and the e2e checks in `shell.e2e.mjs`, `motion.e2e.mjs`, `range.e2e.mjs` and `ask.e2e.mjs` |
| The current choice, and why | [island edge sweep spec](../../../docs/intents/2026-10-island-edge-sweep/spec.md) (the numbers; the [island sweep drop spec](../../../docs/intents/2026-10-island-sweep-drop/spec.md) before it set the order and moves, and the [clock sweep](../../../docs/intents/2026-10-island-clock-sweep/spec.md) added the groups' feet and the lab), [Range settings spec](../../../docs/intents/2026-10-range-settings/spec.md) R4–R6, the [entrance in SVG spec](../../../docs/intents/2026-10-entrance-in-svg/spec.md) (how the page plays it), and the design system's Motion section |

## Hard rules

- **Never hide the art.** The SVG ships with every piece in place, and a piece is hidden only while the build-up that reveals it runs: the SVG's rules hold each piece's first keyframe during its delay (fill `backwards`) and leave it at rest after its move. Without `enter` in a `data-play` around it the whole scene shows. Never hide a piece in page CSS or markup to animate it in later. The hero builds up even without JavaScript, since its attribute is in the HTML, and still ends at rest.
- **Reduced motion.** The SVG's build-up rules sit inside `prefers-reduced-motion: no-preference`, so `data-play="enter"` plays nothing under reduce, and `play()` does nothing either. Each SVG stops its own loops (frame loops on frame 0, ambient loops and scene motion at rest, states at rest on the frame they settle in) and doesn't play actions or states, so no `animationend` fires: page code that waits for one must not depend on it. A new loop needs a frame 0 (or a rest position) that reads as a still picture.
- **Smooth versus stepped.** Build-ups glide: a float, drop or pop eases out to its peak and in and out onto its spot, as the engine writes them. Only the art's own loops step (`step-end`, `steps()`), in the CSS the engine writes into each SVG (pixel-first look spec R10, widened by the island level up spec). The `stepped` move is a pixel-art option that neither scene uses.
- **Build-ups only through `data-play`.** Page code asks for one by putting `enter` in a `data-play` list, and replays it by taking `enter` out and putting it back once the browser has applied the removal. It never animates the pieces itself, never selects the generated `<scene>--e…` classes, and treats `data-play` as a list it shares with actions and one-shot states (the Range's `hop`). No event marks the end of a build-up: page code that waits for one waits on the finite animations under the piece (`getAnimations({ subtree: true })`), as the Ask bubble does.
- **Build-ups are a named exception** to the design system's 0.12–0.5s rhythm. When their numbers change, update the design system's Motion section in the same PR. Keep the Range's numbers its own, so an island change can't move the Range.
- **Edit the art only in its sources** (`pixel-art` skill). The groups and their data attributes come from the scene source. Never edit the compiled SVG.
- **No new dependencies.** Motion is already there.

## Enter groups

Every item in an animated scene sits in exactly one top-level group with class `enter`. Groups don't nest. Each group is a piece of the scene's entrance, and its data is what the schedule reads. The compiler moves each piece's drawing into a wrapper group, its only child, and plays the move on that; the piece keeps its element and attributes, so page code (the Ask bot's `closest('.enter')`, the dark shadow's `[data-enter="shadow"] path`) still finds it. The pieces in each `data-class` group (a Range setting) are scheduled on their own.

| `data-enter` | Data | Hero island | Range setting |
| --- | --- | --- | --- |
| `shadow` | none | the 11 shadow pieces, one group | none: the shadow sits outside the classes |
| `ground` | `data-col`, `data-row`, and the foot `data-x`, `data-y` (its tile's center) | one group per cube (132), row by row (their depth order) | one group per floor row, with `data-row` only |
| `object` | the foot `data-x`, `data-y` | one group per run of objects that arrive together | one per prop, and one for the outfit, with `data-x` |
| `sky` | none | the three clouds | none |

**The foot** is where a piece meets the ground: the center of a sprite's bottom row, `[round(at.px[0] − anchor[0] + width / 2), at.px[1] − anchor[1] + height − 1]`, or a tile-placed object's tile center (`tileToPx`). Pieces of one thing share their first item's foot: a `tree-shade` takes its tree's, and the crane's jib and box take the mast's. Each item in a group shares the group's `data-x`, and `data-y` is the first item's. `scene entrance show <scene>` lists every piece with its place and delay.

**Adding a piece to the island:**

1. Put it in its own `object` group with its foot `data-x` and `data-y` (`scene_place --new-group '{"class": "enter", "data-enter": "object"}' --foot`). The edit sorts the scene, so the group lands where the piece stands; give the piece a `level` if it rides or hangs above the ground (the `pixel-art` skill, Depth order).
2. Run `npm run art`.
3. The schedule places it in the order by its foot, so no page code changes. Check its delay with `scene entrance show hero-island`.

A new ground position is its own `ground` group with its place and foot. Groups break up color merges, so each one costs bytes (`npm run pixellab -- art sizes hero-island`).

**Groups are in depth order.** The groups sit in the SVG in the scene's depth order, which every edit keeps. The orders below read each group's data, not its place, so a sort doesn't change when a piece enters, except for `random`, which seeds each piece by its index in the SVG: after a sort that moves groups it gives another, equally random, shuffle (the depth order migration moved 34 of the island's 219 pieces in it).

## The schedule

Pixel Lab's engine schedules each piece from the scene's `Timing` (`scene entrance show <scene> --json` gives each piece's `delay`, `duration` and `move`, and `settledBy`). A role it doesn't know isn't animated. The order of events:

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
| `stepped` | a float that lands on whole art pixels (neither scene uses it) | `rise`, `overshoot`, `peak` |
| `fade` | opacity only | none |

The ground uses `move`, `duration`, `peak`, `rise`, `overshoot`, `popFrom` and `popPeak`. The objects use `objectMove`. With `same` (the default), they move exactly as the ground does, numbers and all. With a move of their own, they take `objectDuration`, `objectPeak`, `objectRise`, `objectOvershoot`, `objectPopFrom` and `objectPopPeak`, so the cubes can float with an overshoot while the objects drop with no dip, for example.

`rise` and the offsets are in the SVG's own units, so 10 means 10 art pixels: about 30 CSS pixels at the hero's 675px, and about 17 at 390px. A `pop` scales about the bottom middle of each piece's box, which the SVG's own rules set on the wrappers; page CSS sets no origin.

## Tuning a build-up

There's no entrance lab on the site. A build-up is tuned where it lives, in the document:

- **In Pixel Lab** (the owner's way). With nothing selected, the inspector's **Entrance** section sets the ground's order and move, the objects' (with their block, or in an order of their own), More Timing and the seed, and every change is one undoable edit that replays the build-up. **R** replays it, the animation pane's gold Entrance band scrubs through it, and File › Export… (with the entrance first) makes a video of it. What it plays is what the site plays: the same engine writes the SVG's CSS. Agents can run it for the owner and ask for the settings they pick.
- **From the CLI** (agents, in a worktree): `npm run pixellab -- scene entrance set <scene> --ground clock --object-move pop --duration 300 --document src/assets/pixel-art/jlawcordova.pixellab` sets fields (times in ms; `--timing '<json>'` takes a whole `Timing` in seconds), `scene entrance show <scene>` lists the timing, every piece's delay and the settle time, and `scene render <scene> --entrance <ms> --out <png>` draws it that far in. `scene entrance clear` removes it. `npm run art`, then `npm run dev`, plays it on the page.
- **The Range** is `range-sprite`'s entrance. Pixel Lab plays its first setting; every setting plays the same timing over its own pieces.

## Shipping a choice

1. **Docs first.** A new look is a change of intent, so follow `CLAUDE.md` ("How changes flow"). Record the owner's settings in the spec, word for word.
2. **The numbers.** Set them in the scene's `entrance` (Pixel Lab, or `scene entrance set`), and run `npm run art`. Keep the Range's numbers its own, so an island change can't move the Range.
3. **The tests.** If the settle time changes, update it in `scripts/entrance-svg.test.mjs`, which pins it so that a change is deliberate.
4. **New data.** If an order needs data the groups don't carry, add it to the scene source (as `data-col` and `data-y` were added for the clock sweep).
5. **The design system.** Update the Motion section's numbers for the build-up.
6. **Verify** (below), and paste the output into the PR.

## Scene motion

A sequence where pieces travel and hand things on (a truck drives up, tips its load, leaves) is a scene's `motion`, not hand-written CSS. The format is in the `pixel-art` skill (Scenes); the engine is Pixel Lab's program (`scripts/pixellab.mjs` pins it).

- **One loop per scene.** `duration` is the whole cycle in ms, and every track runs on it, so pieces stay in step. Something that "keeps coming" is one item that leaves hidden and comes back at the start of the next cycle.
- **Keys.** Each key at `t` ms sets, from then on, the item's `move` (pixels from where the scene places it), `show`, `state` (one of its sprite's states, such as `truck-open`'s `tipped`, played from its first frame) and `pose` (another object with the same anchor). The island uses states, not poses: `object states from-poses` turned its pose families into states, with the renders checked at every 100 ms. A track that keys a state owns that item: a page's `data-state` and `data-play` don't change it. Values carry over from the key before. The first key is at 0, the rest frame, which is what reduced motion shows, and every `t` is less than `duration`.
- **Moves step a pixel at a time.** Between two keys an item steps toward the next key's move: one pixel per step along a straight line, 1 across and 1 up or down along a 1:1 diagonal (what a ramp along the belt's axis uses), or 2 across and 1 down along the 2:1 grid. Another angle takes fewer, larger steps, so keep moves on the grid's lines. After the last key it steps back to the first key's move over the rest of the loop, so hide it or hold it there.
- **What it compiles to.** Each tracked item gets a `<g class="<scene>--mv-<id>">`, one per pose, and keyframes in a `<style>` at the top of the SVG: `steps()` transforms for moves, `step-end` opacity for show and poses, and a reduced-motion rule that turns them all off. The art is drawn at the rest frame, with hidden pieces and unused poses kept in the SVG at opacity 0.
- **Editing it.** In the owner's checkout, key it over the MCP, where each edit applies as it's made, as the `pixel-art` skill's flow says: `scene_track_add` makes a track, `scene_key_set` sets a key's `move`, `show`, `state` and `pose`, and `scene_motion_path` keys a run along the grid. Only a track rewritten as a whole lives in the source: that's an edit the MCP can't express, so ask the owner before writing it. In a worktree, write the `motion` block in the source, by hand or with a script, or use Pixel Lab's commands. `scene_set <scene> <item> --id <id>` names an item. Once it has a track (`scene_track_add`), `scene_move <scene> <id> --by col,row --time <ms>` (or `--nudge x,y`) keys its move at that time, making the key if needed, and `scene_render <scene> --time <ms>` shows that moment, with every frame loop. Pixel Lab's timeline plays and scrubs the result (⌥⌘P) for the owner.
- **Depth while moving.** A moving item that is alone in its list changes place in the depth order as it moves, and the SVG draws a copy of it for each place, which costs bytes (`check` lists `copies`). Keep every moving piece alone in its own `enter` group: a group keeps its place at rest for the whole loop, so there are no copies, and the list is the paint order at every moment. Its order against a piece it only meets mid-loop is then the list's order, so render those moments (`scene_render --time`) and fix a wrong one with a `level` or the override, never by moving lines.
- **The page.** Scene motion runs inside the `enter` groups like the frame loops, so the entrance and the motion never set the same element's transform. Every generated class and keyframe name is scoped to its scene (`<scene>--…`), so several inline SVGs can share a page. They aren't part of the site contract: never select them from page code.

## Loops, ambient loops, states and actions

Every loop lives in the art and plays from the SVG's own `<style>`; the page's CSS animates none of it (Pixel Lab v0.6.0, the lab's `docs/site-contract.md`).

- **Frame loops.** A layer `{ "loop": "wf", "prefix": "w", "frames": [...] }` (or a block `surface` with `loop`) compiles to groups `class="wf w0"`, `class="wf w1"` and so on (the `pixel-art` skill, Formats), each shown for 1/*N* of the cycle. `wf` is 1.0 s over 5 frames, `ff` 0.6 s over 4 and `hf` 3.0 s over 6; any other loop plays 200 ms a frame. Pixel Lab's `object_animate <name> --layer <n> --loop wf|ff|hf` turns a still layer into one with the right frame count, `object_frame_*` adds, duplicates, moves and deletes frames, and `object_render <name> --frame <k>` shows each frame.
- **Ambient loops.** `"ambient": { "duration", "offset", "keys": [{ "t", "move" }, …] }` on a scene item or an object's map layer repeats on its own: it steps a pixel at a time to each key, then back to the first over the rest of `duration`, starting `offset` ms in. The clouds drift 12 px right and back (`cloud-a` 16 s; `cloud-b` 20 s from 7 s in; `cloud-c` 13 s from 3 s in). Set one with `scene ambient <scene> <item> --duration <ms> [--offset <ms>] --keys '<json>'` or `object ambient <object> <layer> …`; `--clear` removes it. An item can't have scene motion and an ambient loop at once.
- **Actions.** `"actions": { "<name>": { "duration", "keys" } }` are one-shot moves that play only when the page asks: it adds the name to `data-play` on the `<svg>` or a group around the item, removes it and adds it back to restart, and the browser fires `animationend` with `animationName` `<scene>--<name>` when it ends. The action holds its last key until `duration`, then returns to rest, and replaces the ambient loop while it plays. Each jump of more than a pixel is a hold key 1 ms before it, then the new move, because keys step a pixel at a time in between. Set one with `scene action <scene> <item> <name> --duration <ms> --keys '<json>'` or `object action <object> <layer> <name> …`; `--delete` removes it.
- **States** (Pixel Lab v0.8.0). `"start"` and `"states": { "<name>": { "frames", "ms", "loop", "then", "move" } }` on a sprite, after `layers`: each state plays its `frames` (the sprite's frame numbers, repeats allowed) at `ms` each, with an optional `move` of the whole sprite (ambient-style keys). It loops, or with `"loop": false` plays once and then holds its last frame or hands over to `then`. Every placement starts in `start`. The character's `idle` bobs 1 px up from 500 ms of a 1 s loop, and its `hop` (480 ms, once, then `idle`) is the old hop action's keys. The page plays a one-shot state with `data-play`, as it plays an action, and the browser fires `animationend` with `<scene>--<state>`: the Range's A adds `hop` to the current class group's `data-play` list (beside `enter`) and takes it out on `range-sprite--hop`. `data-state="<name>"` on the `<svg>` or a group switches the items below it at once (the lab's `docs/site-contract.md`, States); the site doesn't use it yet. Edit states with `object state add|set|delete|duplicate`, `object state frame …` and `object state key …`, and a scene's with `scene key set --state` and `scene set --state`. `object states make <name>` turns a sprite's layer ambient loop and actions into states, and `object states from-poses <base>` a pose family. Both refuse unless the art stays the same.
- **Entrances** (Pixel Lab v0.9.0, in the SVG since v0.10.0). A scene's `entrance`, after `motion`, holds the build-up's `Timing` with times in whole ms. Its pieces are the scene's `data-enter` groups, and a field left out keeps the default, the hero island's pick, so the hero island's is `{}`; `range-sprite` has its own numbers. The compiled SVG carries it: each piece's drawing in a wrapper, and rules that play when `enter` is in a `data-play` list on the `<svg>` or a group around the pieces ([Tuning a build-up](#tuning-a-build-up)). It costs bytes (`art sizes` reports `entrance`): about 15 KB raw and 1 KB gzipped on the hero. Edit an entrance with `scene entrance set|clear|show`. `check` warns (`entrance_play`) when an object in such a scene has an action or state named `enter`.
- **Looking at them.** `scene_render <scene> --time <ms>` places ambient loops, states and scene motion at that time, and `scene render … --play <action>@<ms>` shows a frame of an action. `object render <name> --state <state> --time <ms>` shows a state that far in, and `object state run <name> <state>` lists when its frame and move change and where it settles.
- **Reduced motion** stops all of it: frame loops show frame 0, ambient loops and scene motion stay at rest, actions and states don't play (an item with states shows the first frame of the state it settles in, at rest), and no `animationend` fires.
- **The float.** The island's float (`floaty`) is the one loop left in `pixel-art.css`, on its HTML wrapper (`.hero__float`), so it and the SVG's own moves never set the same element's transform.
- **Loops and build-ups don't fight.** The build-up moves each piece's wrapper, and the art's loops, states and actions sit on groups inside it, so no two set the same element's transform. The Range's `hop` and `enter` share the class group's `data-play` list: A replays only `hop`, a class change replays only `enter`, and neither restarts or ends the other.

## Verifying

- `npm test`: `entrance-svg.test.mjs` (the SVGs carry their entrances, under no-preference only, the hero asks for it, the settle times) and the hop test. Nothing counts the loops any more: render them (`scene_render --time`) and compare.
- `npm run build`, then `npm run e2e`:
  - `shell.e2e.mjs` sees the island building right after load, waits for every piece and its wrapper (`.hero-island [data-enter]`, `[data-enter] > *`) to end at opacity 1, untransformed, and checks it without JavaScript (it still builds up) and under reduced motion (nothing animates);
  - `motion.e2e.mjs` checks them with JavaScript off and with Motion blocked;
  - `range.e2e.mjs` does the same for each setting, and presses A mid-build;
  - `ask.e2e.mjs` checks the bubble waits for the character to land.
- **Headless,** look at a scene's build-up at any moment with `scene render <scene> --entrance <ms>`, its motion and loops with `scene_render <scene> --time <ms>` (Pixel Lab), and an object's frames with `object_render --frame <k>`.
- **In the browser,** check end states with computed styles, not screenshots. When the preview pane is hidden, its timeline is throttled, so a long-running script or a quick screenshot catches a stale frame. Read `getComputedStyle(wrapper).opacity` and `.transform` after the settle time, and `getAnimations({ subtree: true })` for what still runs.
- Screenshots at 1440px and 390px, with no horizontal scroll (`CLAUDE.md`).

## Pitfalls

- **Replaying needs the removal applied.** Taking `enter` out and putting it back in the same task does nothing: read the group's box in between (`getBoundingClientRect()`), as `Range.astro`'s `replay()` does. Taking it out mid-way puts every piece at rest at once, which is how a quick double press ends in place.
- **Don't clobber `data-play`.** Setting the attribute to one token drops the others: a hop that sets `data-play="hop"` would end a running build-up at once. Add and remove tokens.
- **A hidden group replays on showing.** A token left on a hidden class group plays again when the group shows (`display: none` stops its animations), so `build()` clears the other classes' lists.
- **Order by the data, never `getBBox()`.** The schedule reads the feet in the groups' data, which stay put while loops run and keep a shade with its tree.
- **Ties start together.** The clock's hand at the start lies on a line of cubes, so three start at once. Every order is a score, so equal scores mean the same moment.
- **The schedule spreads scores over the span,** so the last-scored piece always starts exactly `span` after the first, whatever the order.
- **The Range replays on every class change,** about every 3s, so its build-up has to stay quick. Don't give it the island's numbers without the owner's say.
