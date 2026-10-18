# Plan: The island sweeps in, and its objects drop onto it (from intent.md 2026-10-18)

## Files that change

- **Motion:**
  - `src/lib/island-entrance.mjs`: the objects' own numbers, `motionOf`, the owner's `TIMING`, and `RANGE_TIMING` field by field.
  - `src/lib/play-entrance.ts`: steps from the keyframes, and no timing argument.
  - `src/components/home/Hero.astro` and `Range.astro`: the new `playEntrance` call.
- **Lab:** `src/components/lab/EntranceLab.astro`, with its Ground and Objects tabs.
- **Tests:**
  - `scripts/island-entrance.test.mjs`.
  - `scripts/e2e/shell.e2e.mjs`: the settle comment's number.
- **Docs:**
  - `docs/design-system/README.md` and `.claude/skills/pixel-art-motion/SKILL.md`.
  - The clock sweep spec's status note.
  - This change's `intent.md`, `spec.md` and `plan.md`.

## Order of work

One slice, run by the main session in one sitting, straight to a PR into `main`:

```
main ◀── PR (ready; owner merges) ── feat/island-sweep-drop
           commits: the lab's separate object move and tabs (built first, while the owner was trying options), intent, spec, plan, steps 1–2
```

The lab's two commits came first, as the owner asked for them while trying options. They went onto `feat/entrance-lab-tabs`, and from there into this branch. `npm test` passes after each commit.

1. **The pick.**
   - Set `TIMING` to the owner's line, and list every field of `RANGE_TIMING`.
   - Rewrite the island's schedule tests for R1–R5, and pin the Range field by field.
2. **Docs and checks.**
   - Update the design system's Motion section, the skill's current-choice notes, the e2e settle comment, and the clock sweep spec's status.
   - Run every check, screenshot, and open the PR with the output.

## Workflow and reviews

The main session runs both steps on `feat/island-sweep-drop`, then opens the PR. There are no owner reviews before the PR: the owner picked the look in the lab. There is no independent review: the schedule is pure and tested, and the e2e checks cover the end states. The owner merges.

## Risks

- **The island's pick leaking into the Range.** `RANGE_TIMING` used to spread `TIMING`, so the new cascade, overshoot and drop would have reached it. It now names every field, and a test pins them all against the values on `main`.
- **A piece left out of place.** The e2e end-state checks require every island and Range group to end opaque and untransformed.
- **The object move changes what the player gets.** `playEntrance` now reads each entrance's own keyframes. The Range and the hero are checked by e2e, and the lab in the browser.

## Proof

- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`.
- `npm test` and `npm run e2e`: `# fail 0`.
- `npm run art`: every file `lossless` (the art is unchanged).
- Screenshots of the home page and the lab at 1440px and 390px, with no horizontal scroll, and a mid-entrance frame.
