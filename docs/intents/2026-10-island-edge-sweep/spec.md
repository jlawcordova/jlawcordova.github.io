# Spec: The island stands on the hero's bottom edge, and sweeps in slower (from intent.md 2026-10-20)
Status: draft; built in the same PR, approved when the owner merges it. The owner tried the position and the timing on a running prototype and asked for a PR, so the intent, spec, plan and build are reviewed together there.

This change replaces the numbers in R1–R5 of the [island sweep drop spec](../2026-10-island-sweep-drop/spec.md): the spans, durations, lag and settle time. That spec's order and moves (the sweep by screen x, the ground's float with its overshoot, the objects' drop with a small dip) and its R6–R10 still hold. It also replaces the settle time in the [island level up spec](../2026-10-island-level-up/spec.md) R19.

## Requirements

- **R1. The island stands on the hero's bottom edge.**
  - The art column sits at the bottom of the hero, not centred beside the copy, at every width: beside the copy from 1024px, and under it when stacked.
  - The band's bottom edge cuts through the island's lowest block, the front-left cube of the mining section, at about half the height of its side. The shadow under that block is hidden too.
  - The cut stays inside that block while the island's floaty loop moves it up and down by 6px.
  - The hero keeps its height from 641px wide: 734px at 1440px, as before.
  - On a phone, up to 640px wide, the island is bigger, centred and higher. It's 135% of its column, centred on the screen, so it runs off both edges. Its top sits about 50px under the buttons: the row's 40px gap and a little sky. At 390px wide it's about 483px wide instead of 358px, and the hero is 868px tall instead of 889px. On the prototype, the owner found it too small, too far right and too far below the buttons.
  - Nothing scrolls sideways. *(Outcome: the island sits at the bottom of the hero)*
- **R2. The lab's stage clips the island the same way.** The stage keeps its size and clips at its edge, so the island stands on it as on the hero. *(Outcome: the entrance lab shows the island as the hero does)*
- **R3. The ground sweeps in, left to right, more slowly.**
  - Each cube's start is set by its screen x, spread over 1s, plus the 0.25s left-to-right cascade.
  - The sweep spans 1.25s in all: from 0.32s (0.12s after the shadow) at the left corner to 1.57s at the right. Cubes in the same screen column still start together. *(Outcome: the ground sweeps in more slowly)*
- **R4. Each cube floats up with a big overshoot, over 0.35s.** It rises 16 art pixels from below to 6 past its spot, then settles. It fades in on the way up, 60% of the move rising.
- **R5. Each object drops onto the cube under it.**
  - An object starts 0.5s after the ground piece nearest its foot. Pieces of one thing arrive together.
  - It falls 24 art pixels from above to 1.5 past its spot, then settles. It fades in on the way down, and takes 0.3s, half of it falling. *(Outcome: each piece takes a little longer to land)*
- **R6. Shadow and clouds.** The shadow fades in first, at 0.2s, over 0.4s. The clouds drift in from the left halfway through the ground's stagger span, now at 0.82s, over 0.6s.
- **R7. The island has settled by 2.35s.** The ground lands by 1.92s, and the last object lands at 2.32s.
- **R8. The Range keeps its own build-up.** `RANGE_TIMING` is unchanged, and still names every field. *(Constraint: the Range settings keep their own build-up)*
- **R9. Motion never hides the island,** as island build entrance spec R9 says: with JavaScript off, with Motion blocked, and under reduced motion, every piece shows at once and in place.
- **R10. The docs follow.** The design system's Motion section and the pixel-art-motion skill describe the new numbers. The sweep drop and level up specs point here for the numbers they no longer hold.
- **R11. Verified.**
  - `npm run build`, `npm test`, `npm run art` and `npm run e2e` pass.
  - The home page and the lab are screenshotted at 1440px and 390px with no horizontal scroll.

## Design

- **Position** (`src/styles/hero.css`):
  - `.hero` keeps its bottom padding in `--hero-pad-bottom` (96px, 64px up to 480px wide).
  - `.hero__art` takes `align-self: flex-end`, so the column sits at the bottom of the row when the copy is taller.
  - `.hero-island` moves down by `translateY(calc(var(--hero-pad-bottom, 0px) + 28 / 264 * 100% + 3px))`: through the bottom padding to the band's edge, then past it. A transform doesn't change layout, so the band keeps its height. A transform's percentage is of the SVG's own height, so the cut lands in the same place on the art at every size. 28 of the viewBox's 264 units are the shadow below the lowest block and the bottom half of its side. The 3px is the middle of the floaty loop's 6px.
  - `.hero` already clips with `overflow: hidden`. The entrance groups and the floaty loop animate other elements, so the SVG's transform doesn't fight them.
- **Phones** (`src/styles/hero.css`, up to 640px):
  - `.hero__float .hero-island` takes `width: 135%`, `max-width: none` and `flex: none`, like the rule from 1024px. `.hero__float` keeps `justify-content: center`, so the overflow splits evenly on both sides. Scoped to `.hero__float`, so the lab's island keeps its size. `.hero` clips the overflow, so nothing scrolls sideways.
  - `.hero__art` takes `margin-top: calc(-1 * var(--hero-pad-bottom) - 28 / 446 * 135%)`, which is what the island's transform moves it down: the padding, and 28 viewBox units of an island 446 units wide at 135% of the column. A margin's percentage is of the containing block's width, which is the column when stacked.
- **Lab** (`src/pages/lab/island-entrance.astro`): `.entrance-stage` sets `--hero-pad-bottom` to its 48px bottom padding and takes `overflow: hidden`. The lab's island uses the same `.hero-island` class, so it takes the same transform.
- **`TIMING`** in `src/lib/island-entrance.mjs` takes the owner's line as given: `groundSpan: 1`, `lag: 0.5`, `duration: 0.35`, `objectDuration: 0.3`, `objectPeak: 0.5`. Every other field keeps its value.
- **Tests** (`scripts/island-entrance.test.mjs`): the sweep's 1.25s, the cubes' 0.35s, the objects' 0.5s lag, 0.3s and 0.5 peak, the clouds at 0.82s, the 2.32s settle, and the pick's fields.

## Areas of concern

- **C1. The rhythm exception grows in time.**
  - Each cube now takes 0.35s and each object 0.3s, still inside the design system's 0.12–0.5s range.
  - The whole build-up settles in about 2.3s, up from 1.47s. The hero copy has finished by then, so a visitor reads the copy while the island builds.

  *Proposed: the island's named exception stays, with these numbers.*
- **C2. The hero keeps its height.** A first prototype pulled the art column down with a negative margin, and the hero dropped from 734px to 667px at 1440px wide. The owner asked to keep the old size, so the island moves with a transform alone. No decision needed.
- **C3. The cut moves with the float.** The floaty loop lifts the island 0 to 6px, so the cut moves 6px up and down the lowest block's side. At 390px wide that side is about 16px tall, so at the top of the loop the cut is near the bottom of the side. That's what the owner saw in the prototype.
- **C4. The phone island loses its ends.** At 135% and centred, about an eighth of the island runs off each edge at 390px wide: the mining section's left corner and the rail section's right end. The lowest block, at the left corner, still shows above the cut.

## Open questions

None.
