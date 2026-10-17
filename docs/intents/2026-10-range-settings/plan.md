# Plan: Each Range character in its own setting (from intent.md 2026-10-16)

Status: built on `feat/range-settings` in [#114](https://github.com/jlawcordova/jlawcordova.github.io/pull/114)–[#120](https://github.com/jlawcordova/jlawcordova.github.io/pull/120), with the departures noted in Workflow and Order of work; every setting approved by the owner, the last five together in [#113](https://github.com/jlawcordova/jlawcordova.github.io/pull/113) (2026-10-17).

Plans [`spec.md`](spec.md) (R1–R15). The owner asked for the intent, spec and plan to be written together and the work to start on them, so all three are reviewed in the final PR.

## Files that change

- **PR 1, groundwork and the lab:**
  - `src/assets/pixel-art/source/scenes/range-sprite.mjs`: the shared shadow, the transitional grass group, each class's entrance groups, and the lab in class 4.
  - The lab's objects (new): `src/assets/pixel-art/source/objects/block-lab.mjs`, `block-lab-left.mjs` and `block-lab-right.mjs`, plus `prop-data-engineering-shelf.mjs`, `-bench.mjs`, `-cauldron.mjs` and `-book.mjs`. These were drawn in the prototype.
  - `src/assets/pixel-art/range-sprite.svg`: compiled by `npm run art`, never edited by hand.
  - `src/lib/island-entrance.mjs`: `schedule(pieces, timing)`, `sweep` and `RANGE_TIMING`.
  - `src/components/home/Range.astro`: the build, the first view and the 3s interval, with the slide and the prototype's parameter removed.
  - `src/styles/range.css`: hides the shared grass group for class 4.
  - `scripts/optimize-pixel-art.mjs`: `OUTPUT_BUDGETS` gives `range-sprite.svg` 200 KB raw and 50 KB gzip.
  - **Tests:**
    - `scripts/range-art.test.mjs`: R1 becomes the settings' rules, R8 takes the new budget, and a new settled-pixels test.
    - `scripts/range-classes.test.mjs` and `scripts/pixel-art-roundtrip.test.mjs`: read only the `data-class` groups, and flatten nested groups.
    - `scripts/pixel-art-cli.test.mjs`: re-pin the `--check scenes/range-sprite` line.
    - `scripts/island-entrance.test.mjs`: the Range's schedule.
    - `scripts/e2e/range.e2e.mjs` and `scripts/e2e/motion.e2e.mjs`: the build's end state, and the Range's pieces without JavaScript, with Motion blocked and under reduced motion.
  - **Docs:**
    - `docs/design-system/README.md`: Motion, the Range build-up (spec C1).
    - `.claude/skills/pixel-art/SKILL.md`: the Range's settings, and a "Range settings" part.
    - `.claude/agents/pixel-artist.md`: the Range pins and hand-off.
  - `docs/intents/2026-10-range-settings/samples/` (new): the lab's review images.
- **PRs 2–7, one setting each:**
  - New: that setting's `objects/block-<setting>.mjs`, `-left.mjs` and `-right.mjs`, plus any `-corner.mjs` (spec, Floor sets).
  - New: its `objects/prop-<class>-<name>.mjs`.
  - Its own class group in `scenes/range-sprite.mjs`, and `range-sprite.svg` recompiled.
  - Its selector in `range.css`, and the CLI test's re-pinned line.
  - Its review images in `samples/`.
- **Final steps, on `feat/range-settings`:**
  - The shared grass group comes out of `range-sprite.mjs`, its rule out of `range.css`, and its clause out of `Range.astro`'s `build()`.
  - `range-art.test.mjs` gets the "every class has its own setting" test.
  - The skill's transitional note comes out.
  - Status lines in `intent.md`, `spec.md` and `plan.md`.

Not touched: the outfits and `character`, `home.ts`, `pixel-art.css`, the hero island and its scene, the palette and the engine (`src/lib/pixel-art/`).

## Order of work

```
main ── feat/range-settings ─────────────────────────────────── final PR (owner merges) ──▶ main
          │  docs: intent, spec, plan (committed here first; the final PR opens as a draft)
          ├─ PR 1  groundwork + the lab      ◀─ feat/range-settings-groundwork   ▲ owner review
          ├─ PR 2  Front-end (mage)          ◀─ feat/range-settings-front-end    ▲ owner review
          ├─ PR 3  Back-end                  ◀─ feat/range-settings-back-end     ┐
          ├─ PR 4  UX Design                 ◀─ feat/range-settings-ux-design    │ merged on passing checks;
          ├─ PR 5  Cloud & DevOps            ◀─ feat/range-settings-cloud-devops │ the owner reviews them together
          ├─ PR 6  Security & Governance     ◀─ feat/range-settings-security     │ in the final PR
          ├─ PR 7  Project Management        ◀─ feat/range-settings-project-management ┘
          └─ step 15 on feat/range-settings: status and proof, then mark the final PR ready (step 14 landed in PR 7)
```

The slices run strictly one after another. The owner asked for one subagent at a time, each setting approved before the next starts (spec R12). PRs 2–7 follow the carousel's order, skipping Data Engineering, whose lab lands in PR 1.

**Docs (on `feat/range-settings`)**

0. Commit `intent.md`, `spec.md` and `plan.md`, push, and open the final PR into `main` as a draft.

**PR 1: groundwork and the lab (steps 1–6)**

1. **The scene in entrance groups.**
   - Move the grass platform, its tree and its flowers into the shared `data-setting="grass"` group, with its inland tiles as `block`. Each class's outfit goes in its own `object` group (`data-x="0"`), and the shadow stays outside.
   - Update `range-art.test.mjs` R1 to the settings' rules, which allow the shared grass group for now.
   - Make `range-classes.test.mjs` and `pixel-art-roundtrip.test.mjs` read the `data-class` groups and flatten them.
   - Re-pin the CLI line.
   - Add the settled-pixels test: the grass classes paint the same as before.
2. **The schedule.** Add `timing`, `sweep` and `RANGE_TIMING` to `island-entrance.mjs`, with their tests.
3. **The build on the page.**
   - In `Range.astro`: the build, completing a running build first, the first-view observer and the 3s interval. Remove the slide and `?range-interval=`.
   - Extend `range.e2e.mjs` and `motion.e2e.mjs`.
4. **The budget.** `OUTPUT_BUDGETS` for `range-sprite.svg`, and `range-art.test.mjs` R8.
5. **The lab.**
   - Commit the prototype's floor set and props, class 4's group and its `range.css` selector.
   - Re-pin the CLI line.
   - Copy the agent's review images into `samples/`.
6. **Docs for the settings.**
   - The design system's Motion exception.
   - The skill's Range description and its "Range settings" part, which takes the lab as the reference.
   - The agent's pins and hand-off.

**PRs 2–7: one setting each (steps 7–12, one per PR)**

7. Front-end (class 0), then 8. Back-end (1), 9. UX Design (2), 10. Cloud & DevOps (3), 11. Security & Governance (5), 12. Project Management (6). Each step:
   - **The subagent draws.** One `pixel-artist` subagent, briefed as in Workflow, draws the floor set and props and places them in its class group.
   - **The main session finishes it.** It adds the class's `range.css` selector, re-pins the CLI line, runs the checks, and commits.

13. **What reviews teach** goes into the skill's "Range settings" part, in the PR where the owner gave the feedback, so the next subagent starts from it.

**Final steps**

14. **Remove the grass** (as built, in PR 7: once the office gave the last class its own floor, the test that ties the shared grass to the classes using it could only pass with the grass gone, so the office and this step landed together).
    - The shared group, its CSS rule and `build()`'s clause.
    - Add the "every class has its own setting" test, and drop the R1 allowance for the shared group.
    - Take the transitional note out of the skill.
    - The transition's settled-pixels test goes with the grass group it checked, and the CLI's broken-source check points at `library-demo`, which still places `flower`.
15. **Status and proof.**
    - Set the status lines.
    - Measure the home page's HTML from `dist/`.
    - Paste the verification into the final PR and mark it ready.

`npm test` passes after every commit from step 1 on. The prototype's working tree fails 5 Range tests, and step 1 fixes them.

## Workflow and reviews

| Step | Who | Where | Then |
| --- | --- | --- | --- |
| 0 | Main session | `feat/range-settings` | Draft final PR opened |
| 1–6 | Main session (the lab's art is the prototype's, drawn by the `pixel-artist` agent) | `feat/range-settings-groundwork`, PR 1 | **Owner review 1** |
| 7 | One `pixel-artist` subagent draws; the main session finishes and commits | `feat/range-settings-front-end`, PR 2 | **Owner review 2** |
| 8–12, each | One `pixel-artist` subagent draws; the main session finishes and commits | `feat/range-settings-<class>`, PRs 3–7 | Merged once its checks pass; next slice starts |
| 14 (in PR 7), 15 | Main session | `feat/range-settings-project-management`, then `feat/range-settings` | Final PR ready; **owner reviews PRs 3–7's settings together**, then merges |

- **One at a time.** A slice's subagent starts only once the previous slice is finished: its art, its CSS rule and its pins are committed and every local check passes. It works in the main checkout on the slice branch, since nothing else runs at the same time, so no worktree is needed. From PR 4 on, so GitHub's CI doesn't hold the next agent up, the next slice's branch is cut from the previous slice's branch, and the previous PR merges into `feat/range-settings` when its CI passes. The next PR then shows only its own commits.
- **The subagent's brief.** Each brief names:
  - the class, its character and its proposed setting from the spec's table;
  - the lab (`block-lab*`, `prop-data-engineering-*`, class 4's group) as the reference;
  - the skill's "Range settings" part;
  - the 22 KB raw and 5 KB gzip target;
  - its file ownership;
  - the review images it saves to `samples/`: before and after at 1× and 3× from a scratch scene that keeps the shadow and only its class's group, plus the floor set at 6×.

  The subagent doesn't commit, push or touch tests, CSS, components, the engine or another class's group.
- **File ownership.** Within its slice, a subagent owns only its own:
  - `block-<setting>*.mjs`;
  - `prop-<class>-*.mjs`;
  - class group in `range-sprite.mjs`;
  - images in `samples/`.

  The main session owns everything else and checks `git status` before each commit. A subagent that needs a shared file (a library object, the engine, a test) stops and reports.
- **Owner reviews.**
  - **Review 1 (PR 1).** The lab on the page at 1440px and 390px, a mid-build frame, and the timing and interval live on the dev server. Also the spec's open decisions:
    - C1, the Motion exception;
    - C2, the 3s interval;
    - C3, the 200 KB and 50 KB budget.

    Approval fixes the lab as the reference for the other six.
  - **Review 2 (PR 2, the mage).** The setting's PR shows the before and after images, the floor set at 6×, the page at 1440px and 390px, and `--sizes`. The owner may change the theme, the floor or the props. Feedback goes back to the same subagent, resumed with the owner's words; the main session commits the change to the same PR and asks again. On approval, the main session merges the PR and starts the next slice.
  - **PRs 3–7, reviewed together.** After approving PR 2, the owner asked to go on to the end and review the remaining settings together (2026-10-16). Each of PRs 3–7 still carries its images, screenshots and `--sizes`, and still runs one subagent at a time. The main session merges each into `feat/range-settings` once its checks pass, then starts the next slice without pausing. The owner reviews Back-end, UX Design, Cloud & DevOps, Security & Governance and Project Management in the final PR. Feedback there goes to a `pixel-artist` subagent per setting, one at a time, as commits on `feat/range-settings`.
- **Merge rules.**
  - The main session merges PRs 1–7 into `feat/range-settings` once their checks pass: PRs 1 and 2 after the owner's approval, PRs 3–7 without a pause (Owner reviews).
  - If `main` moves, it merges `main` into `feat/range-settings` before the next slice starts.
  - Only the owner merges the final PR into `main`.
- **Independent review.** None. The owner reviews every setting: the lab and the mage one by one, the rest together in the final PR. The code lands in PR 1 with unit and e2e tests, and the art is checked by `npm run art` and the Range tests. The owner can still ask for a `verify-change` run on the final PR.

## Risks

- **The riskiest step is step 1.** Moving the grass into a shared group, and its inland tiles into cubes, must not change the settled look for the six grass classes. The settled-pixels test checks it, as the prototype's byte-identical preview did. If it fails, stop and report the differing pixels.
- **A build left half done.** A quick double press could leave a piece mid-rise in a hidden group. `show()` completes the running build before starting the next, and the e2e check pins the end state after a switch.
- **Hiding content.** A start state set before Motion loads would hide the Range if Motion fails. `play()` sets it in the call that animates it, and the e2e cases with Motion blocked and without JavaScript pin it.
- **Budget.** Each setting reports `--sizes`, and `npm run art` fails above the new cap.
  - If a setting is over 22 KB raw after the trims in the spec (plain hidden faces, fewer props, simpler joints), the main session reports it at that setting's review instead of squeezing the art.
  - If the total would pass 200 KB, stop and ask the owner before the last settings.
- **A subagent edits outside its files.** The main session reviews `git status` and the diff before committing, and reverts anything outside the slice's ownership.
- **Test pins churn.** The CLI's scene line changes with every setting. It is re-pinned in each slice, never deleted.
- **Paint order with tall props.** A tall prop at the back can cover the character's head if it's listed after it. Props are listed back to front, and each review image shows the settled scene.
- **Options not chosen:**
  - Parallel subagents: the owner asked for one at a time, each approved.
  - One shared floor for several settings: contradicts R2.
  - Animating the old setting out: doubles the motion per switch (spec C7).
  - Loading each class's setting on demand: breaks the inline-SVG rule and needs new loading code.

## Proof

- `npm run art`: every file `lossless`, none `OVER BUDGET`. `npm run art -- --sizes range-sprite` goes in each PR.
- `npm test`: `# fail 0` after every commit, including the settled-pixels, settings, schedule and class tests.
- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`.
- `npm run e2e`: `# fail 0`. "NOT RUN" means not verified.
- **Screenshots** of the Range at 1440px and 390px for each class touched, settled, with no horizontal scroll, plus one mid-build frame in PR 1.
- **Final PR:**
  - all seven settings at 1440px;
  - the home page's HTML gzip size from `dist/index.html`, against the 150 KB budget;
  - the `range-sprite.svg` size against 200 KB and 50 KB.
