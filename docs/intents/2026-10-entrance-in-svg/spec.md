# Spec: Pixel Lab v0.10.0, and the build-ups from the SVG (from intent.md 2026-10-27)
Status: approved. The owner set the steps and rules in the request and reviews the final PR (2026-10-27). Each Area of concern below is taken with its recommendation.

## Summary

The site pins Pixel Lab v0.10.0, whose compiler writes a scene's `entrance` into its SVG (the lab's `docs/site-contract.md`, "The entrance"). Each `data-enter` group keeps its element and attributes, and its drawing moves into a wrapper the compiler adds inside it. The build-up plays below any element whose `data-play` list holds `enter`, and every piece is at rest without it or under reduced motion.

The hero island's `<svg>` is inlined with `data-play="enter"`, so it builds up on load from CSS alone. The Range puts `enter` in its current class group's `data-play` on every class change, alongside the A button's `hop`. The site's own schedule, player, entrance lab and their tests go, and the timing lives only in the document.

## Requirements

### The pin and the art

- **R1. The pin is v0.10.0.** `scripts/pixellab.mjs` sets `VERSION` to `v0.10.0`, with both tarballs' SHA-256 from the release's `SHA256SUMS`, taken only once the release workflow has published them.
- **R2. The Linux program still runs in CI.** The highest GLIBC symbol version in v0.10.0's `linux-x64` program is measured, as for v0.9.0, and is one `ubuntu-latest` has. The comment in `pixellab.mjs` names it.
- **R3. Only the two scenes with an entrance change.** After the pin, `npm run art` reports every file `lossless`. `hero-island.svg` and `range-sprite.svg` change; the other five SVGs and all 13 thumbnails hash the same as v0.9.0's. Both changed files stay within their budgets (`manifest.json`: hero 750 KB raw / 150 KB gzip, Range 200 KB / 50 KB), and the PR reports their sizes before and after.
- **R4. `check` stays clean.** `npm run pixellab -- check` on the worktree's document shows no problems and no new warnings (no `entrance_play` warning).

### The hero

- **R5. The hero island builds up from its SVG.** The inlined `<svg>` carries `data-play="enter"` in the page's HTML, so the build-up starts with the page and needs no script. Its timing and look are the document's `hero-island` entrance, which is the site's old `TIMING`.
- **R6. The copy keeps its stagger.** `Hero.astro`'s script plays only the copy's fade and rise, as before.
- **R7. The Ask bubble still waits for its character.** The bubble shows once the character's piece has landed, and at once under reduced motion, as today.

### The Range

- **R8. Each class change rebuilds the setting from the SVG.** On a class change, the new class's `data-class` group gets `enter` in its `data-play`, replayed if it was already there, and the other groups lose theirs. The first build still waits until the stage is half in view. A setting not yet asked to build shows at rest.
- **R9. The hop and the build-up share `data-play`.** `data-play` is a list of tokens on the class group. A replays only `hop`, and a build replays only `enter`, so neither cuts the other short: A during a build-up hops the character while the setting goes on building, and a build doesn't stop a hop on the same group. The hop's `animationend` (`range-sprite--hop`) takes only `hop` out.
- **R10. A quick double press ends in place.** A new build takes `enter` away first, which puts every piece at rest at once, then adds it back.

### Retiring the site's copy

- **R11. The site's copy goes.** Deleted: `src/lib/island-entrance.mjs`, `src/lib/play-entrance.ts`, `src/components/lab/EntranceLab.astro`, `src/pages/lab/island-entrance.astro`, `scripts/island-entrance.test.mjs` and `scripts/entrance-timing.test.mjs`, plus anything only they used. The Motion library stays, since the copy, the Range and the rest of the site use it.
- **R12. Page CSS no longer reaches into the build-up.** `.hero-island .enter { transform-box… }` goes, since nothing animates `.enter` any more and the SVG sets its own box and origin on its wrappers. The dark theme's shadow fill rule stays.
- **R13. The docs follow.** `CLAUDE.md`, `README.md`, the design system's Motion section and the `pixel-art` and `pixel-art-motion` skills say:
  - the timing lives only in the document (`npm run pixellab -- scene entrance set|show`, or Pixel Lab's Entrance section), and the SVG plays it when a page puts `enter` in `data-play`;
  - Pixel Lab must be v0.10.0 or later to open the document;
  - there is no entrance lab: a build-up is tuned in Pixel Lab, which previews, replays (R) and exports it.

### Proof

- **R14. A test guards the SVGs.** `npm test` fails unless:
  - both scenes have an entrance, and every `data-enter` group in their SVGs is one of its pieces, with its wrapper inside;
  - each SVG's style plays `enter` from `data-play`, only under `prefers-reduced-motion: no-preference`;
  - the hero island is inlined with `data-play="enter"`;
  - the hero island settles at 2320 ms and a Range setting at 1440 ms, the times the site's schedule gave, so a change to either build-up is a deliberate one.
- **R15. The browser checks follow.** `shell.e2e.mjs`, `range.e2e.mjs`, `theme.e2e.mjs`, `motion.e2e.mjs` and `ask.e2e.mjs` check what the SVG now plays, where they checked the old player:
  - every piece, and the wrapper inside it, ends at rest and fully shown, on the hero and on each Range setting;
  - the build-up actually runs: right after load, and right after a class change, pieces are animating;
  - nothing runs under reduced motion (no animation in the island's or the setting's subtree);
  - without JavaScript the hero island still builds up and ends at rest, and the Range shows at rest;
  - the Range rebuilds on a class change, a quick double press ends in place, A still hops the character alone, and A during a build-up doesn't restart or end the build-up.
- **R16. Every check passes.** `npm run build` (0 errors, 0 warnings, 0 hints), `npm test` and `npm run e2e` (`# fail 0`), pasted in the PR with `pixellab check`.
- **R17. Recordings show it.** The PR carries Playwright recordings of the built home page: the hero island's build-up, and a Range class change.

## Design

### D1. The pin (R1, R2)

The tarball lines come from the release's own `SHA256SUMS`, downloaded once the release workflow has finished; `ensureProgram` checks the tarball against both the pinned hash and that file. The glibc floor is read with `strings` on the extracted program (`GLIBC_2.x`, highest version). The comment above `whyNot` names it.

### D2. The proof of R3

Hash every file in `src/assets/pixel-art/*.svg` and `static/public/thumbnails/*.png` with v0.9.0 and with v0.10.0, and diff the lists. `check`'s output is compared line by line. `art build`'s size lines give the before and after for the two changed SVGs.

### D3. The hero (R5–R7)

`HeroIsland.astro` adds `data-play="enter"` where it adds the class to the `<svg>`. The SVG's rules have the form `[data-pixellab="hero-island"] [data-play~="enter"] .…, [data-pixellab="hero-island"][data-play~="enter"] .…`, so the attribute on the root works. `Hero.astro` drops the island's two lines and its imports, and keeps the copy's `play()` with its stagger.

The Ask bubble's loader (`src/lib/ask-loader.ts`) waits for the animations on the character's piece. The move is now on the wrapper inside the piece, which `foot.getAnimations()` doesn't return. It waits instead for the finite animations in the piece's subtree (`getAnimations({ subtree: true })`, those whose end time is finite), since the character's idle bob is an endless loop inside the same piece. That relies only on the `data-enter` group, not on the generated class names. Under reduced motion there are none, so the bubble shows at once.

### D4. The Range (R8–R10)

Two small helpers in `Range.astro` treat `data-play` as a token list:

- `replay(group, token)` sets the list without `token`, reads the group's box so the browser applies that, then adds `token` back (the contract's replay);
- `drop(group, token)` takes `token` out, and removes the attribute when the list is empty.

`build()` clears `data-play` on every other class group (they are hidden, and a token left on one would play again when it shows), then `replay(current, 'enter')`. A does `replay(current, 'hop')`. The hop's `animationend` handler does `drop(group, 'hop')`. Changing the list from `enter hop` to `enter` and back leaves the build-up's rules matching throughout, so its animations aren't restarted, and the hop's own state animation runs on the character inside the piece's wrapper, so the two moves compose.

Under reduced motion `build()` still sets the token, and the SVG plays nothing (its play rules are inside `prefers-reduced-motion: no-preference`). A stays hidden and inert under reduced motion, as now.

### D5. What goes (R11, R12)

- The schedule (`island-entrance.mjs`), the player (`play-entrance.ts`), the entrance lab's page and component, and their two tests. `src/pages/lab/` and `src/components/lab/` are then empty and go.
- `pixel-first-look.test.mjs` skips `src/components/lab/` in its stepped-easing check; that exception goes.
- `hero.css` loses the `.hero-island .enter` origin rule (R12). The dark shadow rule's `[data-enter="shadow"] path` still matches, since the paths are inside the wrapper.
- The shell e2e check of the lab's stage goes with the lab.
- The README's layout rows for the schedule and the lab go, and its route list loses `/lab/island-entrance/`.

### D6. The SVG test (R14)

`scripts/entrance-svg.test.mjs` runs `scene entrance show <scene> --json` through the pin script, as the explainer and category tests do, and reads the compiled SVGs:

- every `data-enter` group in each SVG starts with its wrapper, a `<g>` without `data-enter`, and the groups number as many as the pieces `entrance show` lists (for the Range, which lists its first setting, the groups in `data-class="0"`);
- the SVG's `<style>` has a `[data-play~="enter"]` rule, and every such rule sits inside `@media (prefers-reduced-motion:no-preference)`;
- `HeroIsland.astro` writes `data-play="enter"` onto the `<svg>`;
- `settledBy` is 2320 ms for `hero-island` and 1440 ms for `range-sprite`.

### D7. The browser checks (R15)

The pieces' wrappers are their children: `[data-enter] > *`. The checks read the piece and its children, never the generated `<scene>--e…` classes.

- `shell.e2e.mjs`: the hero ends with the copy, the pieces and their wrappers at rest; right after load some wrapper is animating; without JavaScript the copy shows at once and the island builds up and ends at rest; under reduced motion nothing in the island animates. The lab test goes.
- `range.e2e.mjs`: `settingPieces` reads the wrappers; the switch test sees the build-up start and end; reduced motion moves nothing; the hop test reads the wrappers for "the floor stays put" and waits for `hop` to leave `data-play`; a new test presses A during a build-up and checks that the build-up's animations run on, unrestarted, and end at rest, while the character hops.
- `theme.e2e.mjs`: the dark shadow check reads the shadow's paths once the build-up has ended, so it's taken at rest.
- `motion.e2e.mjs`: its selectors include the wrappers; with JavaScript off and with Motion blocked, the hero island still builds up from CSS, so those checks wait for it to end at rest instead of expecting it at rest at load, and the Range is at rest at load.
- `ask.e2e.mjs`: waits for the island's build-up on the pieces' wrappers, and checks that the bubble shows only once the character's piece has landed (1370 ms in), and at once under reduced motion.

### D8. Recordings (R17)

As in the v0.9.0 change: a throwaway Playwright check, run through `npm run e2e -- <file>`, records the built home page at 1280×800 with Playwright's video, waits for the hero to settle, then scrolls to the Range and presses Next twice. `ffmpeg` turns the video into `recordings/hero-island-build-up.gif` and `recordings/range-class-change.gif`, at 640 px wide and 15 fps.

## Areas of concern

1. **The hero builds up without JavaScript now.** Until now a page without JavaScript showed the island at once. With the attribute in the HTML, CSS plays the build-up anyway, and it still ends at rest. The intent asks for this ("on load and without script"). The design system's "Never hide content" rule holds: nothing stays hidden, and nothing hides under reduced motion. Recommended: accept, and say so in the design system's Motion section.
2. **No end event.** The contract promises none. The Ask bubble waits on the piece's own finite animations (D3), and the e2e checks poll for rest. Recommended: no page code depends on the generated class or keyframe names.
3. **Reduced motion turned off mid-visit.** The play rules sit in a media query, so a visitor who turns reduced motion off while the page is open sees the hero, and the Range's current setting, build up at that moment. That is harmless and rare. Recommended: accept.
4. **The tuning tool moves.** The entrance lab goes, and a build-up is tuned in Pixel Lab's Entrance section, which plays the same CSS the site gets from the same engine. Recommended: the docs point there (R13).
5. **The owner's Pixel Lab must be v0.10.0.** The document doesn't change in this PR, but the site's SVGs now depend on v0.10.0's output, and an older app's Publish would write SVGs that never build up. Recommended: say so in the PR and the docs.
6. **The owner's checkout.** This change edits no art source, so it can't conflict with the owner's uncommitted `hero-island.json` and `meadow.json` edits. Recommended: flag it in the PR.
7. **CI runs no browser checks.** The deploy workflow runs `npm test`, not `npm run e2e`, so R14's test is what CI sees of the build-up. Recommended: keep it, and paste the e2e output in the PR.

## Open questions

None.
