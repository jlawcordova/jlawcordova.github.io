# Plan: Accomplishment icons in the island and Range style (from intent.md 2026-10-05)

## Context

The 18 accomplishment icons are flat, front-on and outlined in `ink`, while the hero island and the Range are now isometric, unoutlined and shaded. The [spec](spec.md) redraws all 18 `icon-<id>` objects in that look and changes nothing else. The owner decided to keep the 16×16 cell, to redraw the star and the padlock too, and to fix the intent's count to 16. The owner wants a sample of three icons (chest, star, padlock) drawn in parallel and reviewed against before/after screenshots. After that, the other 15 are drawn by subagents, two icons each.

## Files that change

- **Round 1 (sample):** `src/assets/pixel-art/source/objects/icon-chest.mjs`, `icon-star.mjs`, `icon-lock.mjs`; `src/assets/pixel-art/achievement-icons.svg` (regenerated); `docs/intents/2026-10-isometric-icons/samples/*.png` (new, review images).
- **After the sample review:** `.claude/skills/achievement-icon/SKILL.md` ("What an icon is", the `lock` line), `.claude/skills/pixel-art/SKILL.md` ("Island and Range look": drop "Achievement icons keep their own outlined style"; optional "Isometric icons" part), `.claude/agents/pixel-artist.md` (the no-`ink` rule covers icons; drop "Only the achievement icons keep their outlines"; icon hand-off images).
- **Round 2 (the other 15):** the remaining `objects/icon-*.mjs`; `achievement-icons.svg` (regenerated); more `samples/*.png`.
- **Integration:** `scripts/achievement-icons.test.mjs` (one new test: no `icon-*` key maps to `ink`); `docs/intents/2026-10-gamified-accomplishments/spec.md` (a one-line dated note under D5 pointing to this spec); `docs/intents/2026-10-isometric-icons/spec.md` (Status line).
- **Not touched:** `src/lib/achievement-icons.mjs`, `scenes/achievement-icons.mjs` (unless `npm test` asks for a canonical re-save), `AchievementIcons.astro`, `AccomplishmentRow.astro`, `accomplishments.css`, the engine, the palette, the island and the Range.

## Order of work

```
docs/isometric-icons-spec (spec + intent fix, local)
  └─ feat/isometric-icons ── step 0 ── round 1 ── review ── step 3 ── round 2 ── step 5 ──▶ owner pushes, PR to main
        round 1: 3 pixel-artist subagents in parallel worktrees (chest | star | lock)
        round 2: 8 pixel-artist subagents in parallel worktrees (two icons each, one with trophy alone)
```

The subagent worktrees are scratch: the main session copies only their `icon-*.mjs` files back and commits on `feat/isometric-icons`. That makes one main-session branch with no slice PRs, because nothing can be pushed and the gather step is small.

0. **Branch and plan.** `git checkout -b feat/isometric-icons` from `docs/isometric-icons-spec`. Set the spec to `Status: approved` (the owner approved it in the session) and commit it together with this plan as `plan.md`.
1. **Before images** (no commit yet). From the unchanged tree:
   - `npm run art -- --preview achievement-icons --scale 4`, and `--preview icon-<id> --scale 3` plus `@1x` for all 18. Copy each one to `samples/before-<name>@Nx.png`.
   - Page screenshots: `cp scripts/fixtures/accomplishments.json src/data/accomplishments.json`, start the dev server (`.claude/launch.json` entry `dev` → `npm run dev`, port 4321, not committed), and use the in-app browser to capture the home section and `/accomplishments/` at 1440px and 390px. They show done rows with `chest`, the fallback star (the `dragon` record) and the locked rows. Save them as `samples/before-page-*.png`.
   - **Locked chest.** No locked fixture record uses `chest` (they're `book`, `trophy` and `speech`). So a scratch copy of the rich fixture, in the session scratchpad and never committed, sets the newest locked record's `icon` to `chest`. The home section then shows a locked chest with the padlock over it. Capture that row at 1440px and 390px, plus a close crop of its 48px icon cell, as `samples/before-locked-chest*.png`.
2. **Round 1: chest, star, lock.** Three `pixel-artist` subagents run in parallel (`isolation: "worktree"`), one icon each (prompt below). The main session copies the three `.mjs` files back, runs `npm run art`, makes the after images (step 1's set, `after-*`), retakes the page screenshots, and shows the owner a side-by-side comparison: the sheet before and after at 4×, each icon at 3× and 1×, the page shots, and the locked chest (dimmed chest with the new padlock, from the scratch fixture) before and after. **Owner review.** Feedback goes to the matching agent (resumed with SendMessage) until the owner approves. Then commit: the three icons, the regenerated SVG and the sample images. *(As run: the owner approved the chest at once and sent the star and lock back once. The star went from upright and thin to lying flat with an even 4-px extrusion; the lock grew to about 10×12 and was rebuilt as blocks, like the clouds. The spec's C2 records the new lock size.)*
3. **Write the rules down.** From the approved sample and the agents' reports, the main session updates the two skills and the agent as listed in Files that change. Commit. Round 2's agents read these rules.
4. **Round 2: the other 15.** Eight `pixel-artist` subagents run in parallel worktrees, grouped so that similar shapes share an artist:
   - `sprout` + `apple` (organic)
   - `hammer` + `wrench` (tools)
   - `rocket` + `flask` (round upright)
   - `bug` + `heart`
   - `shield` + `speech` (standing on the left-face plane)
   - `key` + `magnifier` (flat metal)
   - `book` + `signpost` (wood and paper)
   - `trophy` (alone)

   Each one reads the approved chest, star and lock as its reference. The main session gathers the 15 files, runs `npm run art`, makes the after images and the page shots, and commits the icons, the SVG and the images. *(As run: the owner asked for the round-2 artists to run on Claude Fable, so each `pixel-artist` agent was launched with that model. Their worktrees were cut from `main`, so each read the spec, plan, the updated skills and the three reference icons from the main session's checkout by path. All 15 came back within the caps and none needed a second pass.)*
5. **Integration.** Add the no-`ink` test to `scripts/achievement-icons.test.mjs` and the D5 note. Run the full proof (below). Restore `src/data/accomplishments.json` with `git checkout`. Commit. Hand over the final before/after comparison of all 18 and the proof output. The owner pushes and opens the PR to `main`. *(As run: two departures from Proof. `npm run build` fails inside this worktree because Vite 8 resolves `tsconfig.json` against the main checkout, which has no `node_modules` ("Tsconfig not found astro/tsconfigs/strict"); the build was run on an rsync copy of the worktree outside the repo folder and passed there. `npm run e2e` was NOT RUN, since Playwright isn't installed on this machine; the page screenshots were taken with headless Chrome over the DevTools protocol from a scratch script instead. Both should be run on the PR branch where they can.)*

### Subagent prompt (each round)

Tell the agent:

- that it runs in **parallel mode** in its own worktree, on `icon-<id>` (and its pair), for the change `docs/intents/2026-10-isometric-icons/`;
- to invoke `pixel-art` and `achievement-icon`, and to read the intent, spec (R1–R13, the icon table, Canvas and view) and plan;
- that the icon is 16×16, with anchor `[8, 15]` and one layer, world colors only, at most 12 colors (aim for 6–8), no `ink`, no platform, isometric on the 2:1 grid, lit top, mid left, dark right, at least three shades of the main material, and a lighter rim where a lit edge meets the row's `--color-surface`;
- that `lock` stays in the upper-right corner (as built: columns 6–15, rows 0–11), so the CSS `-6px` offset still fits;
- in round 2, that the committed `icon-chest`, `icon-star` and `icon-lock` are the reference look;
- to edit only its own `icon-*.mjs`, with no commits, and not to edit the scene, the tests or the SVG it regenerates;
- to symlink the main checkout's `node_modules` if its worktree has none;
- to hand back its worktree path, its files, `--check` output, 1× and 3× previews (opened and looked at), `--sizes achievement-icons` bytes and the choices the owner should weigh in on.

## Workflow and reviews

| Step | Who | Where | Then |
| --- | --- | --- | --- |
| 0–1 | main session | `feat/isometric-icons` | before images ready |
| 2 | 3 `pixel-artist` subagents in parallel, gathered by the main session | one scratch worktree each | **owner review** of before/after |
| 3 | main session | `feat/isometric-icons` | goes straight on |
| 4 | 8 `pixel-artist` subagents in parallel, gathered by the main session | one scratch worktree each | goes straight on |
| 5 | main session | `feat/isometric-icons` | hand-off: owner pushes and opens the PR |

- **File ownership.** Each subagent edits only its own `icon-<id>.mjs` files. The scene, the SVG, tests, skills, agent and docs belong to the main session. A subagent that needs one of them stops and reports.
- **Owner review.** One pause, after round 1, because the sample sets the look for the other 15 (spec C3). The owner looks at the side-by-side comparison and the page screenshots. Round 2 runs without a pause, and the owner sees all 18 in the final hand-off.
- **Independent review:** none. The change is art plus one test, it's checked by the owner's eye and the existing tests, and nothing is hard to reverse.

## Risks

- **16×16 can't carry the detail (spec C1).** This shows up in the round 1 review. If the owner isn't happy after feedback, stop before round 2.
- **Style drift across 8 parallel artists.** It's handled by the approved sample, the rules written in step 3, and the final side-by-side sheet. A misfit icon goes back to its agent.
- **Weight (spec C4).** The sheet is 3.7 KB gzip against a 6 KB test budget. Measure it with `--sizes achievement-icons` after round 1, and project it ×6. If round 2 goes over, stop and ask the owner (the fallback is a code change).
- **Lock legibility over a dimmed icon.** Checked in round 1 on the locked chest, so the reviewed icon is shown in both of its states.
- **The fixture leaks into a commit.** `git checkout src/data/accomplishments.json` before every commit, and `git diff --cached` before each one. The locked-chest fixture lives only in the scratchpad.
- **Worktree gather.** Subagents' `npm run art` rewrites the SVG in their worktree. Only the `.mjs` files are copied, and the main session recompiles.

## Proof

- `npm run art`: every file `lossless`, none `OVER BUDGET`; `npm run art -- --sizes achievement-icons` and the sheet's gzip bytes, at most 6144.
- `npm test`: `# fail 0`, including the new no-`ink` test.
- `npm run build` with the placeholder data: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`.
- `npm run e2e` (after a build): `# fail 0`. The accomplishments suite checks the icon crops and that each icon paints.
- Screenshots of the home section and `/accomplishments/` with the rich fixture at 1440px and 390px, before and after, with no horizontal scroll, showing a done row, the fallback star and a locked row with the padlock, plus the locked chest from the scratch fixture.
- Before/after sheet at 4× and each icon at 3× and 1×, in `samples/`.
