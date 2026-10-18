# Spec: The Range pops (from intent.md 2026-10-18)
Status: built and approved by the owner in [#125](https://github.com/jlawcordova/jlawcordova.github.io/pull/125), 2026-10-18, with R4 changed at review so hover no longer holds the countdown. The owner shaped the design on a running prototype and asked for it as a PR, so the intent, spec and plan were written after it and are approved together by merging.

## Requirements

- **R1. Each class tints the section and the screen.** On a class change, the section's ground and the console screen take the class's color, from its `shadow` in `src/data/home.ts`. Each color is set by role, at one lightness for every class, so the copy keeps its contrast on all seven: the ground at OKLCH lightness 0.34, the screen at 0.86. Browsers without CSS relative colors keep today's forest ground and card screen. *(Outcome: the backgrounds change with each character)*
- **R2. Battle bars on the screen.** The screen's old color holds in 12px blocks, in bands two rows high. Alternate bands sweep away from opposite sides, each band starting a little after the one above, and the blocks just ahead of the sweep light up in the class's bright color. It takes 0.5s, in 10 frames. *(The owner's pick for the screen)*
- **R3. A slash across the section.** The new ground cuts in over the old one as a thin diagonal and widens both ways until it covers the section, over 0.6s. *(The owner's pick for the section)*
- **R4. A countdown on the screen.** A framed bar of 12 segments, with no numbers, runs along the foot of the screen. It fills over the 3s interval ([Range settings spec](../2026-10-range-settings/spec.md) R7), and the class changes when it's full. It fills in a deep shade of the class's color (lightness 0.5). Keyboard focus in the console and a hidden tab hold it where it is, START pauses it, and an arrow or B starts it over. Hovering and clicking don't hold it: with the countdown and START on show, a hold the visitor can't see reads as a bug. This replaces the hover pause of the [Range class characters spec](../2026-10-sixth-range-class/spec.md) R7. *(Outcome: a countdown with no numbers, part of the in-game screen UI; the owner's review of #125: hovering the screen shouldn't stop the cycle)*
- **R5. START pauses and plays, and PAUSED shows.** While START has the rotation paused, a blinking **❚❚ PAUSED** badge sits at the screen's upper right, across from the nameplate. It's out of the layout, so showing it moves nothing. Up to 480px wide it's the icon alone, so the longest names keep their room, and below 375px it sits just under the nameplate. Pressing START to play resumes at once, even though the pointer is still over the console and focus is on START. *(Outcome: the indicator, no layout shift, and the unpause bug)*
- **R6. A makes only the character hop.** The character rises six of the art's pixels, drops back and bounces one, a whole pixel at a time, over 0.48s. Its setting stays put and the class doesn't change. *(Outcome: jump moves only the character)*
- **R7. The console's keys and shell.** The D-pad arrows, A and B are `color-ink` keys with `color-page` symbols, and all turn `color-footer` on hover. A and B have no labels. START keeps its own. A sits up and to the right of B, like a handheld's face buttons, except below 375px where there's no room. The shell is the new `color-shell` token, `#CFCCC6`. *(Outcome: consistent dark brown keys with white symbols, no JUMP or BACK, a light gray console)*
- **R8. Reduced motion.** Under `prefers-reduced-motion: reduce`, the colors change at once with no bars or slash, A is hidden as before, and PAUSED doesn't blink. The rotation starts paused, as before, so PAUSED shows.

## Design

- **`src/lib/range-change.mjs`** (new, `// @ts-check`) holds the interval, the bars' numbers and `barsOrder` and `barsFrame`, and the slash's keyframes, so they can be unit-tested.
- **Colors.** `range.css` sets `--range-ground`, `--range-screen`, `--range-lit` and `--range-meter` from `--class-shadow` with `oklch(from …)` inside `@supports`, over token fallbacks. `--class-shadow` moves from the nameplate to the section, so everything inherits it.

  | Class | Heading | Body | Gold phrase | Ink on screen | Countdown on its track |
  | --- | --- | --- | --- | --- | --- |
  | Front-end | 11.1:1 | 8.3:1 | 6.6:1 | 9.5:1 | 5.5:1 |
  | Back-end | 10.1:1 | 7.6:1 | 6.1:1 | 9.9:1 | 5.1:1 |
  | UX Design | 9.9:1 | 7.5:1 | 5.9:1 | 10.0:1 | 5.1:1 |
  | Cloud & DevOps | 10.2:1 | 7.7:1 | 6.1:1 | 9.9:1 | 5.2:1 |
  | Data Engineering | 9.3:1 | 7.0:1 | 5.6:1 | 10.2:1 | 4.9:1 |
  | Security & Governance | 10.0:1 | 7.6:1 | 6.0:1 | 10.0:1 | 5.1:1 |
  | Project Management | 10.2:1 | 7.7:1 | 6.1:1 | 10.0:1 | 5.1:1 |

- **The change's layers.** The section and the screen each get an empty `.range__change` layer behind their content. A change sets the new colors first, then covers them with the old color in that layer and takes it away: a canvas, one canvas pixel to a block, for the bars, and a clip-path on a span for the slash. A new change clears the last one, and each layer empties when its change ends.
- **The countdown is the clock.** A Web Animations animation on the bar's fill runs for the interval, and its `finished` promise shows the next class. Pausing pauses the animation, so the bar and the rotation can't disagree. This replaces the `setInterval`. The animation is made the first time the rotation plays, so under reduced motion, where the rotation starts paused, nothing on the page animates.
- **The unpause bug.** Hover and focus held the rotation, and clicking START left both on the console, so the rotation stayed held after START played it. Hover no longer holds it, and focus only does when it's keyboard focus (`:focus-visible`), so a click leaves nothing holding it. Pressing START to play from the keyboard lets go of the focus hold until focus moves again.
- **The hop** is `chop` in `pixel-art.css`, on the class's `.cbob` group (the character), with `step-end` like the art's other loops. `.cbob` holds only the character in every class.

## Areas of concern

- **Stepped motion.** The pixel-first look spec keeps `steps()` to the pixel art's own CSS (its 2026-10-05 amendment, enforced by `pixel-first-look.test.mjs`). The countdown fills smoothly behind its segment mask, the blink is a hard cut in plain keyframes, and the hop is in `pixel-art.css` because it moves the art. The battle bars are drawn frame by frame on purpose: they're the console's game screen, and the owner chose them over smooth options.
- **Longer than the motion rhythm.** The slash (0.6s) and the countdown (3s) run past the design system's 0.12–0.5s. The design system's Motion section records them as the Range's own numbers, like the build-ups.
- **Browser support.** Relative colors are recent. The `@supports` fallback keeps the page readable without them, but those browsers won't see the tints.
- **The dark theme.** [Dark mode](../2026-10-dark-mode/spec.md) (R8) keeps the console in its light colors with `data-theme="light"`. A custom property resolves `var()` where it's declared, so the screen's and the countdown's colors are set on `.range__stage`, inside the console, and their fallbacks take the light theme. The ground and the copy's colors are the same in both themes. `color-shell` has no dark value.

## Out of scope

The prototype's other transitions and its options panel, any change to the settings' art, the copy and the class order.
