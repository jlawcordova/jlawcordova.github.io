# Plan: Achievements redesign (from intent.md 2026-10-18)

Status: draft. Written together with the intent, spec and code at the owner's request, so it's reviewed in this change's PR.

Plans [`spec.md`](spec.md) (R1–R23).

## Files that change

- **Docs:** `docs/intents/2026-10-achievements-redesign/intent.md`, `spec.md`, `plan.md` (new); `docs/design-system/README.md`; `docs/design-system/components/AchievementRow/README.md` and `preview.html`; `docs/design-system/components/AchievementToast/README.md` and `preview.html` (new); `docs/design-system/components/Navigation/README.md` and `preview.html`; `README.md`; `CLAUDE.md`; `.claude/skills/achievement-icon/SKILL.md`.
- **Art:** `src/assets/pixel-art/source/objects/frame-plain.mjs`, `frame-make.mjs`, `frame-fix.mjs`, `frame-think.mjs`, `frame-people.mjs`, `frame-milestone.mjs` (new); `src/assets/pixel-art/source/scenes/achievement-frames.mjs` (new); `src/assets/pixel-art/achievement-frames.svg` (new, compiled).
- **Data and logic:** `src/lib/achievement-icons.mjs`, `src/lib/accomplishment-list.mjs`, `src/lib/motion.ts`, `src/lib/achievement-toast.ts` (new, the toast's script).
- **Routes:** `src/pages/achievements/index.astro` and `[page].astro` (moved from `src/pages/accomplishments/`); `src/pages/accomplishments/index.astro` and `[page].astro` (new: the redirect pages).
- **Components and styles:** `src/components/AccomplishmentRow.astro`, `Accomplishments.astro`, `AccomplishmentsPage.astro`, `AchievementIcons.astro`, `PageHead.astro`, `Navigation.astro`; `src/components/AchievementIcon.astro` (new, the framed icon, shared by the rows and the toast) and `AchievementTally.astro` (new, the totals, shared by the home section and the list page); `src/pages/design-system.astro`; `src/styles/accomplishments.css`. *(The two new components and the toast module weren't listed before building; they keep the markup in one place.)*
- **Tests:** `scripts/achievement-icons.test.mjs`, `scripts/accomplishments.test.mjs`, `scripts/pagination.test.mjs`, `scripts/e2e/accomplishments.e2e.mjs`, `scripts/e2e/shell.e2e.mjs`; `scripts/e2e/editor.e2e.mjs` (redirect pages may be noindex) and `scripts/e2e/theme.e2e.mjs` (the list's new URL), found while running the checks.
- **After `main` moved:** `src/styles/navigation.css` (the nav fits the longer link), and `data-theme="light"` on the gold pieces in `AchievementTally.astro`, `AccomplishmentRow.astro` and `Accomplishments.astro`, with their previews.

## Order of work

One slice, straight to a PR into `main`: the main session does it in one sitting, with one subagent drawing the frames alongside, so there's no main-session branch. The branch is `feat/achievements-redesign`.

1. **docs:** the intent.
2. **docs:** the spec.
3. **docs:** this plan.
4. **art:** the six frame objects and the frame sheet scene, compiled with `npm run art` (R8, R10). Run by the `pixel-artist` subagent.
5. **feat:** frame kinds in the icon list, `frameFor()`, `rowFor()`'s `frame`, and their unit tests, including the frame sheet's order and budget (R8–R10, R23). The achievement-icon skill names the frame step.
6. **feat:** the list moves to `/achievements/`, with redirect pages at the old URLs, and the nav link becomes "Achievements" (R17–R19). *(Changed while building: Astro's dynamic `redirects` entry wrote `/achievements/page2` without the trailing slash, a second hop and a canonical link to the wrong URL, so the fallback below is used for both old URLs.)*
7. **feat:** the redesigned rows, home section and list page: copy, tally, Latest chip, framed icons, pagination above the locked list, and the frame hop (R1–R9, R15, R16, R20).
8. **feat:** the "Achievement unlocked!" toast (R11–R14, R15, R16).
9. **docs:** the brand book, the AchievementRow, AchievementToast and Navigation guidelines and previews, the README and CLAUDE.md (R21, R22).
10. **test:** the browser checks for R1–R20 (R23).
11. **merge:** `main` moved during the build (dark mode, the island's sweep), so it's merged in before the PR.
12. **fix:** the gold pieces keep the light colors in the dark theme, the nav's one-row step-down widens for "Achievements", and the theme check uses the new URL (R19, R20a). *(Added after the merge: dark mode wasn't on `main` when this plan was written.)*

## Workflow and reviews

| Step | Who | Where | Then |
| --- | --- | --- | --- |
| 1–3 | Main session | `feat/achievements-redesign` | Step 4 starts in the background, and the main session goes on with 5. |
| 4 | `pixel-artist` subagent | The same worktree. It may only touch the files under Art above. | The main session checks `npm run art` and the 4× preview, then commits it. |
| 5–6 | Main session, while step 4 runs | The same branch. Steps 5 and 6 touch none of step 4's files. | Commit each. |
| 7–10 | Main session, after step 4 lands | The same branch. | Run the Proof, then open the PR into `main`. |

- **Merge rules:** the owner merges the PR into `main`. Agents never do (`.claude/hooks/block-main-merge.sh`).
- **Owner reviews:** none before the PR. The owner already reviewed the look in the canvas and asked for the work to go straight to a PR. The PR carries the screenshots and the frame preview.
- **Independent review:** none. The unit tests and browser checks, pasted into the PR, are the verification. The owner can ask for a `verify-change` run.

## Risks

- **Dynamic redirects in a static build.** If Astro won't write correct refresh pages for `/accomplishments/[page]`, step 6 instead keeps two small pages under `src/pages/accomplishments/` that return `Astro.redirect()` with a 301 for each page path, which a static build writes as the same refresh markup, and this plan is updated in that commit. *(It happened: see step 6.)*
- **The browser checks are the riskiest step.** The suite checks many exact strings, classes and sizes that this change alters. Each changed assertion follows a requirement here, and no check is dropped without a replacement.
- **Playwright may be missing.** `npm run e2e` then prints "NOT RUN" and exits 2. That's reported as not verified, never as passing.
- **The dark-mode branch also edits the nav.** `Navigation.astro` and its preview change on `feat/dark-mode` too. Whichever lands second resolves a small conflict in the nav link line.
- **The toast covers the lower rows** for up to 5 seconds. It's bounded, can be closed, pauses on hover and focus, and shows once a session.
- **`sessionStorage` can throw** (private windows, blocked storage). Reads and writes are in `try`, so the toast may show again but never breaks the page.

## Proof

- `npm run art`: every file `lossless`, none `OVER BUDGET`, and `npm run art -- --preview achievement-frames --scale 4` looked at.
- `npm test`: `# fail 0`.
- `npm run build`: `0 errors`, `0 warnings`, `0 hints`, `[build] Complete!`, with `dist/accomplishments/index.html` a refresh page to `/achievements/`.
- `npm run e2e`: `# fail 0`, including the accomplishments suite on the four fixture builds.
- Screenshots of the home section (with the toast) and `/achievements/` at 1440px and 390px from the rich fixture build, with no horizontal scroll.
