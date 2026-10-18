# Plan: The Range pops (from intent.md 2026-10-18)
Status: for approval in this change's PR, with the intent and spec.

Plans [`spec.md`](spec.md) (R1–R8).

## Files that change

- `src/components/home/Range.astro`: the change's layers, the countdown and PAUSED, A and B without labels, the bars, the slash, the countdown as the clock, the START fix and the hop.
- `src/lib/range-change.mjs` (new): the interval, the bars and the slash.
- `src/styles/range.css`: the class colors, the layers, the HUD, PAUSED, the keys and the shell.
- `src/styles/pixel-art.css`: `chop` and `.cbob.is-hopping`, off under reduced motion.
- `src/styles/variables.css` and `docs/design-system/tokens.json`: `color-shell`, and the Range's ground in `color-forest`'s usage.
- `docs/design-system/README.md`: the Range console and its motion.
- **Tests:** `scripts/range-change.test.mjs` (new), and `scripts/e2e/range.e2e.mjs` for R1–R7 and the hop.
- `docs/intents/2026-10-range-pop/` (new): this intent, spec and plan.

Not touched: the settings' art and its sources, `home.ts`, the copy and the build-up's timing.

## Order of work

1. The prototype, already reviewed by the owner on `proto/range-glitch`.
2. Strip it to the owner's picks, and move the numbers into `range-change.mjs`.
3. The START fix, A's hop and the keys without labels.
4. The token, the design system's notes and these documents.
5. Tests and browser checks, then the proof below.

*Departure: dark mode ([#121](https://github.com/jlawcordova/jlawcordova.github.io/pull/121)) and the island's sweep and drop ([#123](https://github.com/jlawcordova/jlawcordova.github.io/pull/123)) landed on `main` during step 5. Merging them moved the screen's colors inside the console (spec, Areas of concern), and the build-up now goes through `playEntrance`. The reduced-motion checks in `motion.e2e.mjs`, `editor.e2e.mjs` and `accomplishments.e2e.mjs` then found the paused countdown and the PAUSED blink still counted as animations, so the countdown is made lazily and the blink's reduced-motion rule matches its selector.*

## Workflow and reviews

One slice, run by the main session in one sitting, so it goes straight to a PR into `main` (`write-plan`, "Branches"). The owner reviewed the look on the prototype, so no review pauses the work. No independent review is planned. The checks below, pasted into the PR, are the verification, and the owner can still ask for a `verify-change` run.

## Risks

- **A flaky timing check.** The countdown and auto-advance checks wait on real time. They measure from the start of an interval and allow slack, like the existing ones.
- **A conflict with the dark mode change** in `Range.astro` and `range.css`. Whichever lands second resolves it.

## Proof

- `npm run build`: 0 errors, 0 warnings, 0 hints.
- `npm test`: `# fail 0`.
- `npm run e2e`: `# fail 0`. The new START check fails with the fix taken out.
- Screenshots of the Range at 1440px and 390px, with no horizontal scroll.
