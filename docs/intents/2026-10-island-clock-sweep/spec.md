# Spec: The island builds in a clock sweep, and the tools to tune it stay (from intent.md 2026-10-17)
Status: draft; built in [#122](https://github.com/jlawcordova/jlawcordova.github.io/pull/122), approved when the owner merges it. As with [#112](https://github.com/jlawcordova/jlawcordova.github.io/pull/112), the owner asked for the build to go all the way to a ready PR, so the intent, spec, plan and build are reviewed together there.

The numbers come from the owner's pick in the stagger prototype on 2026-10-17:

> ground=clock when=after objects=front-back move=pop groundSpan=0.5 cascade=0 objectSpan=0.6 lead=0.08 lag=0.4 duration=0.5 rise=24 overshoot=2 seed=1

In that prototype, `overshoot` sets how far a pop grows past full size, at 5% a step, so 2 means 110%. A pop doesn't use `rise`, `lag` or `seed`, because they only apply to the other moves and orders.

This change replaces R3–R6 of the [island build entrance spec](../2026-10-island-build-entrance/spec.md) (rows, float, timing). Its R1, R2 and R7–R12 still hold.

## Requirements

- **R1. The ground pops up cube by cube, in a clock sweep.** Each of the 36 cubes enters on its own. The order turns clockwise on screen around the middle of the island, like a clock's hand starting at the left corner: up over the back, round the right, and back past the front. The first cubes start 0.12s after the shadow, at 0.32s, and the last starts 0.5s after them. *(Outcome: the ground comes in a clock sweep, with a 0.5s stagger)*
- **R2. Objects follow the ground, front to back.** The first object starts 0.08s before the last cube has landed. The objects then enter by depth, from the front of the island to the back, spread over 0.6s. Pieces of one thing arrive together, as before: a tree with its shade, the crane's mast, jib and box, and the trucks with the flag beside them. *(Outcome: the objects follow after the ground from front to back)*
- **R3. Every piece pops.** A piece grows from 30% of its size, from its own foot, to 110% (the owner's overshoot of 2), then settles to full size. It fades in as it grows. Each pop takes 0.5s and reaches its peak 55% of the way through. *(Outcome: every piece pops into place; each takes 0.5s)*
- **R4. Shadow and clouds as before.** The shadow fades in first, at 0.2s, over 0.4s. The clouds drift in from the left over 0.6s as the objects begin. The loops keep running throughout. *(Island build entrance spec R7, R8)*
- **R5. The island has settled by 2.35s.** The last object lands at 2.34s.
- **R6. Entrance groups carry what the orders need.**
  - Each cube is its own `ground` group, with its grid place (`data-col`, `data-row`) and its foot (`data-x`, `data-y`, its tile's center).
  - Each `object` group gains `data-y`, the foot's y, beside its `data-x`.
  - With feet on every piece, the schedule can order by any position, and so can the lab (R8).
- **R7. Row 3 is water all the way across.** The grass cube behind the office at `[0, 3]` becomes `block-river` with a `river` top, like the rest of row 3, so the river runs from the island's back-left edge to the waterfall. The close-ups that show `[0, 3]` follow. *(Outcome: the grass tile behind the office becomes water)*
- **R8. The prototyping tools are saved as the entrance lab.** An unlisted, `noindex` page at `/lab/island-entrance/` plays the hero island's build-up with the same schedule and player as the home page, under controls for every option the prototype had:
  - ground orders, objects after or with their cube, object orders, and a move for the ground and one for the objects (by default, the same);
  - the spans, the cascade, the object lead or lag, the duration, the peak, and the rise, overshoot and pop sizes.

  Any change replays at once. R replays and H hides the controls. The settings live in the URL, a speed control slows the playback, Site version resets to what ships, and Copy gives the changes to `TIMING`, ready to paste. No page links to it. *(Outcome: the prototyping tools are saved)*
- **R9. A skill for pixel-art motion.** `.claude/skills/pixel-art-motion/SKILL.md` tells an agent how the site animates its pixel art: the build-ups and their schedule, the entrance groups, the CSS frame loops, prototyping in the lab, shipping a choice, and verifying it. The pixel-art skill and `CLAUDE.md` point to it. *(Outcome: a skill so future agents can animate the island and other pixel art)*
- **R10. Motion never hides the island.** This repeats island build entrance spec R9: with JavaScript off, with Motion blocked, and under reduced motion, every piece shows at once and in place. A pop's start state is set only by the call that animates it. *(Constraint: the site's motion rules)*
- **R11. The art rules hold.** Sources only, `npm run art` lossless, and `hero-island.svg` within 500 KB raw and 125 KB gzip. World colors only, no new objects and no new dependencies. *(Constraint: the art rules; no new dependencies)*
- **R12. The docs follow.** The design system's Motion section describes the new build-up. The pixel-art skill describes the cube groups and feet, and the pixel-artist agent's pins name the water at `[0, 3]`. The README lists the lab.
- **R13. Verified.** `npm run build`, `npm test`, `npm run art` and `npm run e2e` pass. The home page and the lab are screenshotted at 1440px and 390px with no horizontal scroll, with one mid-entrance frame.

## Design

### The art (R6, R7)

- **`hero-island.mjs`.** The six row groups become 36 cube groups, in the same paint order, row by row:

  ```js
  { group: { class: 'enter', 'data-enter': 'ground', 'data-col': '0', 'data-row': '3', 'data-x': '-48', 'data-y': '32' }, items: [/* block-river, river */] }
  ```

  Each holds its cube, the top laid over it, and, at `[5, 3]`, the `waterfall-face`. Groups still don't nest.
- **Feet.** An object group's `data-y` is the foot of its first item, measured the same way as `data-x`: the bottom row of a sprite (`at.px[1] − anchor[1] + height − 1`), or a tile-placed object's tile center. A shade takes its tree's foot, and the crane's jib and box take the mast's. The trucks' group starts with the flag (the waterfall's streaks), so it takes the flag's foot and arrives with the front of the island, as it did in the prototype.
- **`[0, 3]`.** It becomes `block-river` with `river` over it. The `river` adds a sixth `wf` loop set. `closeup-office` and `closeup-front-trees` show that position and take the same change.
- **Bytes.** The groups break up color merges, so the SVG grows from 115.7 KB to 140.8 KB raw, and from 24.7 KB to 29.2 KB gzip. That is well within the budget (C3).

### The schedule (R1–R5)

`src/lib/island-entrance.mjs` stays a pure function that `node:test` imports, but it now covers every option the lab offers:

- **`Timing`** names every number and choice:
  - `start`, `groundDelay`, `groundSpan`, `cascade`, the `ground` order and the `objects` order;
  - `with`, `objectLead`, `objectSpan` and `lag`;
  - the ground's `move` and the objects' `objectMove` (`same` by default, so they move as the ground does), the `duration` and `peak`, then `rise` and `overshoot` (float and drop) and `popFrom` and `popPeak` (pop);
  - the shadow and sky numbers, and a `seed` for the random orders.
- **`TIMING`** is the owner's choice:

  ```js
  { ground: 'clock', objects: 'front-back', with: false, move: 'pop', groundSpan: 0.5, objectSpan: 0.6, objectLead: 0.08, duration: 0.5, popFrom: 0.3, popPeak: 1.1 }
  ```

  The other numbers keep their values.
- **`RANGE_TIMING`** names its own order and move (`rows`, `ltr`, `float`), so the Range is unchanged (C2). Its old `rowGap` of 0.08 becomes a `groundSpan` of 0.16 over its three rows.
- **Orders** score each piece. Lower enters first, and the scores are spread over the span:
  - `rows`, `cols`, `back-front`, `front-back`, `sweep` (or `ltr`), `center`, `edges`, `clock`, `checker`, `random` and `together`;
  - `same`, for objects, uses the ground's order.

  Ground pieces are placed by their grid position. An object's foot maps back onto the grid, using a cube's foot as the anchor. The clock measures the screen angle about the middle of the ground, starting at the left corner (C5).
- **Moves:** `float` and `drop` (y), `pop` (scale), `stepped` (a float in whole art pixels, for the lab), and `fade`. Each returns its keyframes and times.
- **`settledBy(plan)`** gives the time the last piece lands, for the tests and the lab's readout.

`src/lib/play-entrance.ts` (new) plays a schedule on its groups. It reads each group's data into a piece (`pieceOf`) and plays each entrance through `play()` from `src/lib/motion.ts`, with an ease-out to the peak and `SETTLE_EASE` onto the spot. The hero, the Range and the lab all use it, so the three can't drift apart.

**Pop origin.** `hero.css` gives `.hero-island .enter` the rule `transform-box: fill-box; transform-origin: 50% 100%`. Each piece then grows from its own foot, not the SVG's corner. The rule changes nothing at rest, since nothing is transformed then.

### The entrance lab (R8)

- **`src/pages/lab/island-entrance.astro`** (new, `noindex`) renders `HeroIsland` on a hero-colored stage, next to the controls.
- **`src/components/lab/EntranceLab.astro`** (new) builds its selects from the exported order and move lists, so a new option appears in the lab once it's added to the schedule. Fields that don't apply hide: the lag when objects come after the ground, the pop sizes for other moves, and so on.
- **Replays.** Each one cancels the running moves and puts every piece back in place before playing again. In the prototype, a cancelled pop left its pieces shrunk.
- **Copy** writes, for example, `Entrance lab: changes to TIMING in src/lib/island-entrance.mjs: { groundSpan: 0.6 }`.
- **Unlisted.** The editor e2e's list of unlisted pages adds the lab, so it must carry the robots meta, and no other page may mention `/lab/`. The lab's styles are scoped to its component and use only the tokens. It doesn't import `lab.css`, which stays the editor's alone.

### The skill and docs (R9, R12)

- **`.claude/skills/pixel-art-motion/SKILL.md`** (new) covers:
  - what moves and where;
  - the hard rules;
  - the entrance groups and their data;
  - the `Timing` fields, orders and moves;
  - prototyping in the lab, and adding a new option to it;
  - shipping a choice, and the CSS frame loops;
  - verifying, and the pitfalls the prototypes ran into.
- **Pointers.** The pixel-art skill's hero island section and its checklist point to the new skill. So do `CLAUDE.md`'s Commands and the README's layout table and lab section.
- **Design system, Motion:** the hero island bullet gets the new order, move and numbers.
- **`pixel-artist.md`:** the `block-river` pin covers `[0–4, 3]`.

### Tests

- **`scripts/island-entrance.test.mjs`:**
  - the island's clock order: the hand from the middle to the left corner starts first, the corners turn clockwise, and the ground spans 0.5s;
  - the pop's keyframes;
  - objects front to back over 0.6s, starting 0.08s before the ground lands;
  - the shadow and the sky;
  - settled by 2.35s;
  - every order, move and `with` choice schedules every piece and ends in place (R8's options can't break);
  - the Range's numbers are unchanged.
- **`scripts/pixel-art-island.test.mjs`:**
  - `[0, 3]` is `block-river` with a `river` top;
  - six river tiles in the loop count;
  - one ground group per cube, with its place and foot;
  - every object group's `data-x` and `data-y`.
- **`scripts/pixel-art-cli.test.mjs`:** the `--sizes` pins count 17 `block` placements, not 18.
- **e2e:**
  - `shell.e2e.mjs` already waits for every `.hero-island .enter` group to end opaque and untransformed, and checks them without JavaScript and under reduced motion;
  - `motion.e2e.mjs` checks them with Motion blocked;
  - `editor.e2e.mjs` adds the lab to the unlisted pages.

## Areas of concern

- **C1. The build-up still sits outside the design system's motion rhythm.** The rhythm says 0.12–0.5s durations, 0.04–0.08s staggers and 8–24px moves. The island's pieces now take 0.5s, which is inside it. But the build-up still runs 2.34s, and a pop is a change of size, not a slide. *Proposed: the design system's named exception for the island stays, with the new numbers.*
- **C2. The Range and the island now move differently (the intent's open question).** Range settings spec R4 has each piece rise and settle "as on the hero island". The owner chose a pop for the island only. *Proposed: the Range keeps its float, because the owner tuned it separately and it replays on every class change. A test pins its numbers. If the owner wants it to pop too, it's a one-line change in `RANGE_TIMING`, and it can be tried in the lab first once the lab can show the Range.*
- **C3. The groups cost bytes.** The island grows by 25 KB raw and 4.4 KB gzip. That's within the budget, but every page view pays it. *Proposed: accept it.* Merging a cube's paint across groups would need engine work.
- **C4. Object depth comes from feet, not from the boxes.** The prototype measured each group's box in the browser. The shipped schedule reads each group's foot from its data, so `node:test` can check it. Shades now share their tree's depth, and the crane's box shares the mast's, so both arrive together. That's closer to "pieces of one thing arrive together" than the prototype was. The order is otherwise the one the owner saw, including the trucks arriving first with the waterfall's streaks.
- **C5. The clock's first wave is three cubes.** `[2, 3]`, `[1, 4]` and `[0, 5]` lie exactly on the line from the middle to the left corner, so they start together, as they did in the prototype. No decision needed.
- **C6. A stepped move in a shared module.** Pixel-first look spec R10 keeps UI motion smooth and allows stepping only in the pixel art's own loops. The lab's `stepped` move eases in whole art pixels from `play-entrance.ts`. It moves pixel art, the site doesn't use it, and the `steps()` check still passes. *Proposed: allow it as a lab option for the art.*

## Open questions

- *Should the Range settings change to match?* Proposed no (C2). The owner decides on the PR.
