# Spec: The hero island builds itself as it comes in (from intent.md 2026-10-16)
Status: built in #112; approved when the owner merges it. The owner asked for the intent, spec, plan and build to land together in one PR ([#112](https://github.com/jlawcordova/jlawcordova.github.io/pull/112)), so each stage is reviewed there rather than merged on its own.

R3–R6 (the rows, the float and their timing) are replaced by the [island clock sweep spec](../2026-10-island-clock-sweep/spec.md), and the river now runs the whole of row 3.

The numbers below come from the owner's prototype rounds on 2026-10-16, where they tuned the entrance by feel: rows sweeping left to right, objects held back until the ground is nearly done, a slightly slower stagger and an overshoot on the float.

## Requirements

- **R1. The ground is cubes.** All 36 positions on the 6×6 grid are one-level cubes. Where the road or the river crosses a position, its flat top is laid over the cube, as it already is on the front edges. *(Outcome: the tiles become blocks)*
- **R2. The settled island looks as it does today.** Once every piece is in place, the island paints exactly the pixels it paints today: every frame of every loop, and both trucks at every step of their drive. The cubes' extra faces are hidden by the cubes in front of them. *(Answers the intent's first open question; see C2)*
- **R3. The ground floats up one row at a time, left to right.** The grid's six rows enter one after another, starting with the row along the left cliff (row 5) and ending with the back-right row (row 0). Each row rises into place from below. *(Outcome: the blocks float up from below, one row at a time, sweeping left to right)*
- **R4. Each piece overshoots, then settles.** A rising piece passes its spot by a little, then eases back down onto it. *(Outcome: overshoots slightly and settles)*
- **R5. Objects follow the ground, one at a time, left to right.** The first object starts just before the last ground row has landed. Objects then enter in order of their position on screen, from left to right, one at a time rather than grouped by kind. Pieces that make up one thing arrive together: a tree with its shade, the bridge with its rail, and the crane's mast, jib and hanging box. *(Outcome: the objects come in after the ground)*
- **R6. The owner's timing.** Rows are 0.12s apart. Each piece takes 0.65s, spending the first 55% rising 10 art pixels to 2 art pixels past its spot. Objects start 0.08s before the ground finishes and sweep over 0.6s. The island starts 0.2s after the page's script runs, alongside the hero copy, and has settled after about 2.75s. *(Outcome: unhurried, a little slower than the first prototype's)*
- **R7. Shadow, clouds and trucks.** The island's shadow fades in first, under the rows. The clouds fade in and drift in from the left as the objects begin. The trucks join the object sweep at their starting position, and their drive loop keeps running throughout. *(Answers the intent's second open question)*
- **R8. The loops keep running.** The water, the waterfall streaks, the crane's load, the trucks, the clouds and the island's float run as today, including their reduced-motion frames. *(Constraint: the site's art and motion rules)*
- **R9. Motion never hides the island.** With JavaScript off, or with the Motion chunk blocked, the whole island shows at once, fully opaque and in place. A piece's start state is set only by the call that animates it. Under `prefers-reduced-motion: reduce`, nothing animates and every piece is in place from the start. This applies pixel-first look spec R11 and R12 to the island's pieces. *(Constraint: the site's motion rules)*
- **R10. The art rules hold.** The art changes only in its sources under `src/assets/pixel-art/source/` and is compiled by `npm run art`. Every output stays lossless, and `hero-island.svg` stays within its 500 KB raw and 125 KB gzip budget. The change uses world colors only, adds no new objects and adds no new dependencies. *(Constraint: the site's art rules; no new dependencies)*
- **R11. The docs follow.** The design system's Motion guidance names the island build-up and its numbers (C1). The pixel-art skill describes the cube ground and the entrance groups. The close-up scenes keep matching the island. *(CLAUDE.md: copy, components and tokens follow the design system)*
- **R12. Verified.** `npm run build`, `npm test`, `npm run art` and `npm run e2e` pass. The home page is screenshotted at 1440px and 390px, with no horizontal scroll. *(CLAUDE.md, Verifying your work)*

## Design

### The ground (R1, R2)

Each of the 25 inner positions changes from a flat tile to the front-edge cube of the same material. No objects are added:

| Today, flat | Becomes |
| --- | --- |
| `tile` (grass) | `block` |
| `path` (the road along column 2) | `block-road`, with `path` laid over it |
| `river` (along row 3) | `block-river`, with `river` laid over it |

The edge pieces carry their material's band on their sides, so a rising road or river cube shows a road or water band rather than grass. `tile` stays in the library, because the Range and the library demo use it.

**Paint order.** The ground is listed row by row (row 0 to 5), and by column within each row. A cube at `[col, row]` only covers the cubes at `[col + 1, row]` and `[col, row + 1]`, and both still come after it, so this is still back to front. It also makes each row one contiguous run, which lets a row be one group (below). Where a flat top is laid over a cube, the top stays listed right after it.

**Why nothing shows at rest.** All the cubes are the same height, so an inner cube's left and right faces sit exactly under the tops and faces of the cubes in front of it. A test proves R2 instead of relying on this argument (Tests).

### Entrance groups (R3, R5, R7)

The scene wraps its items in groups with the class `enter` and a `data-enter` kind. The engine already supports `{ group: { class, 'data-*' }, items }`:

- **`shadow`:** the 11 `island-shadow` pieces, as one group.
- **`ground`, with `data-row="0"` to `"5"`:** one group per grid row, holding that row's cubes and tops (and the `waterfall-face` in row 3).
- **`object`, with `data-x`:** one group for each run of consecutive objects that share an `x`. `x` is the scene-pixel column of the object's foot: the center of its sprite's bottom row, or, for a tile-placed object, the tile's center. A `tree-shade` takes its tree's `x`. The `crane-jib` and `crane-box` take the `crane-mast`'s, so the crane arrives in one piece. The trucks take their placement's foot, so they arrive with the flag beside them.
- **`sky`:** the three clouds.

Objects keep their paint order, so their groups are interleaved by depth, not sorted by `x`. The CSS loops (`wf`, `ff`, `hf`, `itruck`, `pcloud`) keep their own classes on groups nested inside, and `pixel-art.css` doesn't change. The optimizer keeps every class and `data-*` group, and it can't merge colors across groups, so the SVG grows. It also grows from the cubes' hidden faces. The prototype's groups (with flat tiles) took the SVG from 91 KB to 92–97 KB. The PR records the actual size with `npm run art -- --sizes hero-island`. Either way it is far inside the 500 KB budget.

### The entrance script (R4–R9)

- **`src/lib/island-entrance.mjs`** (plain JavaScript with `// @ts-check`, like the pixel-art engine, so `node:test` can import it) exports the schedule as a pure function. It takes each group's kind, row and `x`, and returns each group's delay, duration and keyframes. The R6 numbers live there as named constants.
- **`Hero.astro`'s script** keeps the copy's entrance as it is and drops the `.hero__art` rise. It reads the `.hero-island .enter` groups, asks the schedule for their timing, and plays each group with `play()` from `src/lib/motion.ts`, so reduced motion and the start-state rule (R9) come from the existing helper:
  - **Ground and objects:** `opacity [0, 1, 1]` and `y [10, -2, 0]` over 0.65s. The keyframe `times` are `[0, 0.55, 1]`, eased with `easeOut` on the way up and an ease-in-out on the way down.
  - **Shadow:** `opacity [0, 1]` over 0.4s at the start.
  - **Sky:** `opacity [0, 1]` and `x [-6, 0]` over 0.6s, when the objects begin.
- **Units.** Motion sets `y` as a CSS transform on the SVG group, in the SVG's own units, so 10 means 10 art pixels. At the hero's 675px width that is 30 CSS pixels; at 390px it is about 17.
- **Floaty loop.** `.hero__float` keeps the floaty loop on its own wrapper. The two never fight over a transform, because the entrance moves only the groups inside the SVG.
- **Prototype extras dropped.** The prototype's replay key and its `?entrance=` variants don't ship.

### Docs (R11)

- **Design system** (`docs/design-system/README.md`, Motion): adds the hero island's build-up as the one longer entrance, with its numbers, under C1's decision.
- **Pixel-art skill:**
  - The hero island section says the ground is cubes, explains the entrance groups, and says how to place a new object (in its own `object` group, with its foot `x`).
  - The close-ups note says their ground follows the island.
  - The pixel-artist agent's test pins are checked for anything about flat tiles.
- **Close-ups.** The seven close-up scenes take the island's new ground items, in its new order, for the positions they show (as the skill already requires). Where a close-up cuts the island off, the cubes at its edge now show their side faces. The close-ups are review views, so this reads as a cut-away.

### Tests

**Tests that change.** These are in `scripts/pixel-art-island.test.mjs`, which encodes the flat-tile layout that the intent replaces. None is deleted or skipped:

- **The helpers** read the scene's items flattened out of their groups.
- **R1, R3 (the ground):** every position is a cube (`block` inland, `block-road` or `block-river` under the road and the river, with their tops listed right after them), and the ground paints row by row.
- **R4 (the CSS groups):** checks that the loop classes appear in order, leaving out the `enter` groups.
- **The close-up order test:** unchanged in what it checks, but it reads flattened items.

**New tests:**

- **R2, settled pixels.** The scene's composite equals the composite of the same scene with each inner cube put back to today's flat tile (and its top), in today's diagonal order.
- **Entrance groups:**
  - Every item sits in exactly one `enter` group, of the four kinds.
  - Each `ground` group holds exactly its row's items.
  - Each `object` group's `x` matches its objects' feet, except for the named exceptions (shades, the crane).
  - The groups survive compilation into `hero-island.svg`.
- **The schedule** (`scripts/island-entrance.test.mjs`):
  - Rows go left to right, 0.12s apart.
  - No object starts before the ground's last row is 0.08s from landing.
  - Objects are ordered by `x` and span 0.6s.
  - The whole entrance ends by 2.75s.
- **e2e** (`shell.e2e.mjs`, `motion.e2e.mjs`): every `.hero-island .enter` group ends fully opaque with no transform. With JavaScript off, with Motion blocked, and under reduced motion, every group shows at once with nothing animating.

## Areas of concern

- **C1. The owner's timing sits outside the design system's motion rhythm.** The design system says durations of 0.12–0.5s, staggers of 0.04–0.08s, moves of 8–24px and "never long sweeps". The owner's tuned entrance uses 0.65s per piece, 0.12s between rows and a 30 CSS pixel rise on desktop, and it runs for about 2.75s. The two standards contradict each other. *Proposed: the owner's prototype wins, and the design system's Motion section records the island build-up as a named exception, so the rhythm still holds everywhere else.* The owner confirms in review.
- **C2. The settled look (the intent's first open question).** *Proposed: pixel-identical to today at rest (R2), proven by a test.* That keeps the change to motion only, and leaves every earlier art review standing. If the owner wants the cubes to show at rest somewhere, R2 changes.
- **C3. Hidden pixels cost bytes.** The inner cubes' faces are painted and then covered, and the groups break up color merges. The SVG grows, though it stays far within budget. Trimming hidden faces would need engine work, which is out of scope.
- **C4. Tests that encode today's layout change.** The island tests pin flat tiles and diagonal paint order, which the intent replaces. Each change is listed under Tests, the pinned facts are replaced rather than dropped, and the new settled-pixels test is stricter than the one it relaxes.
- **C5. Close-ups show cut faces.** At a close-up's edge, a cube's side shows where the island has a neighbour out of frame. This is accepted as a cut-away. The alternative, flat tiles in the close-ups only, would break the rule that close-ups show exactly the island's items.
- **C6. The entrance hides nothing a visitor reads.** The island is decorative (`aria-hidden`), the copy keeps its own short entrance, and R9 keeps it visible without JavaScript. No decision needed.

## Open questions

- *Should the island look exactly as it does today once it has settled?* Proposed yes, as R2 (C2).
- *Should the clouds and the trucks join the entrance?* Yes, as R7: the trucks join the object sweep at their starting position, and the clouds drift in as the objects begin.
