# Spec: The island sweeps in, and its objects drop onto it (from intent.md 2026-10-18)
Status: draft; built in the same PR, approved when the owner merges it. The owner asked for a PR that applies their lab pick, so the intent, spec, plan and build are reviewed together there.

The numbers in R1–R5 (the spans, durations, lag and settle time) are replaced by the [island edge sweep spec](../2026-10-island-edge-sweep/spec.md). The order and the moves still hold.

This change replaces R1–R5 of the [island clock sweep spec](../2026-10-island-clock-sweep/spec.md) (the clock order, the pop and their timing). Its R6–R13 still hold: the cube groups and feet, the water along row 3, the lab, the skill and the motion rules.

## Requirements

- **R1. The ground sweeps in, left to right.**
  - Each cube's start is set by its screen x, spread over 0.25s, plus the owner's extra left-to-right cascade of 0.25s.
  - Both run the same way, so the ground's sweep spans 0.5s in all: from 0.32s (0.12s after the shadow) at the left corner to 0.82s at the right.
  - Cubes in the same screen column start together. *(Outcome: the ground sweeps in from left to right)*
- **R2. Each cube floats up with a big overshoot.**
  - A cube rises 16 art pixels from below to 6 past its spot, then settles.
  - It fades in on the way up, and takes 0.25s, 60% of it rising. *(Outcome: floats up with a big overshoot)*
- **R3. Each object drops onto the cube under it.**
  - An object starts 0.42s after the ground piece nearest its foot. Pieces of one thing arrive together, as before.
  - It falls 24 art pixels from above to 1.5 past its spot, then settles.
  - It fades in on the way down, and takes 0.25s, 45% of it falling. *(Outcome: each object drops onto the island a moment after the cube under it, with only a small dip)*
- **R4. Shadow and clouds.** The shadow fades in first, at 0.2s, over 0.4s. With objects arriving with their cubes, the clouds drift in from the left halfway through the ground's stagger span, at 0.445s, over 0.6s.
- **R5. The island has settled by 1.45s.** The last object lands at 1.44s.
- **R6. The Range keeps its own build-up.** `RANGE_TIMING` names every number itself instead of taking the island's, so no island pick can reach the Range. Its rows still float up 0.08s apart, and the objects sweep in by x. Range settings spec R4–R6 are unchanged. *(Constraint: the Range settings keep their own build-up)*
- **R7. The lab sets the ground and the objects apart.**
  - The controls have a Ground tab and an Objects tab. Each tab has its own order, move, duration, peak, rise, overshoot and pop sizes.
  - The objects move as the ground does, numbers and all, until they're given a move of their own. They then start from the ground's numbers.
  - The tabs work with the keyboard, the left and right arrows moving between them. *(Outcome: the ground and the objects are each configurable)*
- **R8. Motion never hides the island,** as island build entrance spec R9 says: with JavaScript off, with Motion blocked, and under reduced motion, every piece shows at once and in place.
- **R9. The docs follow.** The design system's Motion section and the pixel-art-motion skill describe the new build-up and the objects' own numbers.
- **R10. Verified.**
  - `npm run build`, `npm test`, `npm run art` and `npm run e2e` pass.
  - The home page and the lab are screenshotted at 1440px and 390px with no horizontal scroll.

## Design

- **`TIMING`** in `src/lib/island-entrance.mjs` takes the owner's line as given. Every other number keeps its value.
  - `objects: 'same'` is kept as copied, though it isn't used while `with` is true.
  - The pop sizes stay at 0.3 and 1.1 for the lab.
- **Objects' own numbers.** `Timing` gains `objectDuration`, `objectPeak`, `objectRise`, `objectOvershoot`, `objectPopFrom` and `objectPopPeak`.
  - `motionOf(t, kind)` returns the ground's move and numbers, or the objects'. With `objectMove: 'same'`, the objects' are the ground's.
  - `schedule()` gives each kind its own keyframes, times and duration.
  - The player derives a stepped move's steps from its keyframes, so each kind steps by its own rise. `playEntrance(groups, entrances)` no longer takes the timing.
- **`RANGE_TIMING`** lists all its fields. They are the values it had on `main`: rows, left to right, float, 10 art pixels with a 2 pixel overshoot, 0.55 to the peak, no cascade, objects after the floor, and the same move for both.
- **The lab** (`EntranceLab.astro`):
  - **Tabs.** It builds both tabs from one field list. Each field shows only when its tab's move uses it.
  - **Own move.** Switching the objects from `same` to a move of their own copies the ground's numbers into theirs.
  - **URL.** The open tab is kept in the URL (`tab=objects`).
- **Tests** (`scripts/island-entrance.test.mjs`):
  - The island's order is by x, with the span and cascade adding up to 0.5s.
  - The cubes' float and the objects' drop keyframes, times and durations.
  - Each object starts 0.42s after its nearest cube, the clouds start at 0.445s, and the island has settled by 1.45s.
  - The objects' own numbers are used only with a move of their own.
  - The Range's numbers are pinned field by field.
  - The every-option test covers the objects' own moves.

## Areas of concern

- **C1. The rhythm exception grows in distance, and shrinks in time.**
  - At the hero's 675px, the cubes rise about 48 CSS pixels and overshoot 18, and the objects fall about 72. The design system's moves are 8–24px.
  - The whole build-up now settles in 1.44s, down from 2.34s, and each piece takes 0.25s, inside the 0.12–0.5s range.

  *Proposed: the island's named exception stays, with these numbers.*
- **C2. The sweep and the cascade run the same way.** Both are spread by screen x, so the owner's two 0.25s values act as one 0.5s sweep. That's what the owner saw in the lab, so it's kept as two numbers, as picked.
- **C3. The ground's sweep comes in columns.** Cubes with the same screen x (`col − row`) start together, so the ground arrives in 11 diagonal columns. No decision needed.

## Open questions

None.
