# Plan: The site takes Pixel Lab v0.6.0's output (from intent.md 2026-10-21)

Implements [spec.md](spec.md). The owner asked for the spec, the plan and the migration to be finished up to one final PR, which they review as a whole (2026-10-21).

## Files that change

- **The document:** `src/assets/pixel-art/jlawcordova.pixellab/`. 233 `.mjs` files are deleted and their `.json` files are new (`palette.json`, `objects/*.json`, `scenes/*.json`). `manifest.json` is edited.
- **The explainer library:** `art/explainer-library.pixellab/`, with 102 `.mjs` files deleted and their `.json` files new, plus `manifest.json`.
- **Outputs taken out of git** (deleted from the index, kept on disk): `src/assets/pixel-art/{achievement-frames,achievement-icons,footer-dirt,footer-grass,hero-island,range-sprite}.svg` and the 13 `static/public/thumbnails/*.png`.
- **New:** `scripts/pixellab.mjs` and `scripts/pixellab.test.mjs`.
- **Deleted:**
  - `scripts/blog-thumbnails.mjs`;
  - `scripts/pixel-art-island.test.mjs`, `scripts/pixel-art-motion.test.mjs`, `scripts/pixel-art-roundtrip.test.mjs` and `scripts/pixel-art-sources.test.mjs`;
  - `scripts/range-art.test.mjs` and `scripts/range-classes.test.mjs`.
- **Edited:**
  - Scripts and tests: `scripts/export-explainer-library.mjs`, `scripts/explainer-library.test.mjs`, `scripts/blog-thumbnails.test.mjs`, `scripts/range-change.test.mjs`, `scripts/achievement-icons.test.mjs`, `scripts/pixel-first-look.test.mjs` and `scripts/e2e/range.e2e.mjs`.
  - Site: `src/styles/pixel-art.css`, `src/components/home/Range.astro` and `src/components/home/HeroIsland.astro` (comment only).
  - Config: `package.json`, `package-lock.json`, `.gitignore` and `.github/workflows/deploy.yml`.
  - Docs: `CLAUDE.md`, `README.md`, `docs/design-system/README.md` and `docs/design-system/components/AchievementRow/README.md`.
  - Skills and the agent: `.claude/skills/{pixel-art,pixel-art-motion,design-scene,achievement-icon}/SKILL.md`, plus any of their reference files that name `.mjs` sources, and `.claude/agents/pixel-artist.md`. `verify-change` and `write-plan` are edited only where they name removed commands.
  - This plan, when the work departs from it.

## Order of work

There is one slice, run by the main session in one sitting, so there's no main-session branch. It's [PR #143](https://github.com/jlawcordova/jlawcordova.github.io/pull/143) into `main`, which already holds the intent and the spec. The owner asked for one PR to review. Each step is one commit:

```
main ── docs/intent-pixel-lab-v0-6 (PR #143: intent, spec, plan, steps 1–7) ── owner merges ──▶ main
```

1. **The program, pinned.**
   - Add `scripts/pixellab.mjs` (spec R10, D3) and `scripts/pixellab.test.mjs` (R21).
   - Point `package.json`'s `art` and `pixellab` scripts at it, and make `dev`, `build` and `test` run `npm run art` first (R11).
   - Gitignore `.pixellab-bin/`.
   - Nothing reads the new scripts yet, apart from the migration in step 2.
2. **Migrate both documents** (R1, R15): run `npm run pixellab -- document migrate` and `npm run pixellab -- document migrate --document art/explainer-library.pixellab`. The program refuses unless the SVGs come out byte-identical. Commit the migration on its own, so the diff is the format change alone.
3. **The swap** (R2–R5, D1, D2):
   - the cloud classes become ambient loops, with `scene set --class ''` and `scene ambient`;
   - the character's bob becomes an ambient loop and its hop an action, with `object ambient` and `object action`;
   - `scene sort` runs on the 13 thumb scenes;
   - three hand edits: the layer class `character`, each thumb scene's `image`, and the manifest's `publish.images`.

   Then `check` runs, with no problems and only the 15 existing `off_grid` warnings, followed by `npm run art`.
4. **The page** (R7–R9, D4): strip `pixel-art.css`'s art keyframes, put A on `data-play`, fix `HeroIsland.astro`'s comment, and update the hop browser check (R22).
5. **Outputs out of git, the package out** (R12–R14):
   - `git rm --cached` the six SVGs and 13 PNGs, then gitignore them;
   - `npm uninstall pixellab`;
   - add the CI step;
   - delete `scripts/blog-thumbnails.mjs` and the six art suites;
   - rewrite `blog-thumbnails.test.mjs`, `range-change.test.mjs`'s hop test, `achievement-icons.test.mjs` and `pixel-first-look.test.mjs`'s R9 (R18–R20);
   - put the explainer export and its test on the program (R16, R17).

   After this step, nothing imports `pixellab/*`.
6. **Docs, skills and the agent** (R23, R24).
7. **Proof** (D7): run the scratch frame comparison and take the screenshots, then paste the results into the PR. No commit, unless a fix comes out of it. Such a fix goes in its own commit, and this plan is updated in the same commit if the fix departs from it.

## Workflow and reviews

| Step | Who | Where | Then |
|---|---|---|---|
| 1–6 | main session | worktree `.claude/worktrees/pixel-lab-v0-6`, branch `docs/intent-pixel-lab-v0-6` | push after each step; the PR's CI builds it |
| 7 | main session | the same worktree, plus a temporary worktree of `main` for the "before" build | results and screenshots go in the PR body |

- **CLI only.** The art changes are made with the released program through `npm run pixellab -- …`, in the worktree. They never go through the owner's MCP server, which works on the owner's checkout (CLAUDE.md), and `document migrate` isn't offered over MCP anyway. Before step 2, `proposal_list` over MCP showed no open proposals and no unsaved edits in the app. That was checked on 2026-10-21.
- **Merge rules.** There's no slice to merge. Only the owner merges PR #143 into `main`. If `main` moves, merge it into the branch before step 7, rebuild the art and rerun the checks.
- **Owner reviews.** Only the final one, on PR #143, as the owner asked. The PR lists the four areas of concern taken with their recommendations. It also says the owner must update the Pixel Lab app and MCP server to v0.6.0 before merging.
- **Independent review.** None. The migration proves itself: the program refuses unless the SVGs are byte-identical. The visual frame comparison (step 7) is the gate for the swap. The owner can still ask for a `verify-change` run.

## Risks

- **The swap changes motion (riskiest, step 3).** The hop's keys are converted by hand (D2). The frame comparison in step 7 samples every 40 ms through the hop, and 24 times across each loop. If any frame differs, fix the keys and rerun. Don't change the comparison to make it pass.
- **Comparing paused CSS animations across two pages is fragile.** The old page's animations are driven by `pixel-art.css` and the new page's by each SVG's own `<style>`. Both are CSS animations, so `document.getAnimations()` lists them on both pages. Entrances (Motion's Web Animations) are finished first, and any page animation that isn't the art's is excluded. Sample times avoid step boundaries by at least 5 ms, as the lab's gate did. If the pages can't be lined up, fall back to the lab's per-scene method: each SVG on a bare page, with and without `pixel-art.css`.
- **`npm test` builds the art first.** It needs network access once on a fresh clone (spec concern 1). The new `pixellab.test.mjs` never touches the network.
- **`astro check` and `?raw` imports** need the SVGs. `build` runs `art` first. `withastro/action` runs `npm run build` by default, so CI builds them too. The new CI step also builds them before `npm test`.
- **Deleting tracked outputs.** `git rm --cached` stages the deletion at once (CLAUDE.md). Check `git diff --cached --stat` before each commit, so the deletion lands only in step 5's commit.
- **Fixture accomplishments.** The accomplishments browser suite copies fixtures over `src/data/accomplishments.json` and restores it. Check `git status` before committing.
- **Explainer export output** must stay the same. Its test pins the file names, and step 5 also compares one export run against a run on `main`, by file list.
- **The owner's app.** A v0.5.0 app or MCP server can't open the migrated document. The PR says so, and nothing is installed for them.

## Proof

Pasted into PR #143:

- `npm run art`: every file `lossless`, the 13 thumbnails written, and any over-budget lines as warnings only.
- `npm run pixellab -- check`: `ok`, no problems, and only the 15 `off_grid` warnings that are in today's art. The same command with `--document art/explainer-library.pixellab`: no problems and no warnings.
- The 13 thumbnails, decoded, pixel-identical to the PNGs on `main`.
- `npm test`: `# fail 0`. `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints` and `[build] Complete!`. `npm run e2e`: `# fail 0`, and if it can't run, the PR says so, never that it passed.
- `grep -rn "pixellab/" scripts src` finds no import of the package.
- The frame comparison report (D7): frames compared and frames matched, normal and reduced motion, the hop included.
- Screenshots of the home page's hero and Range at 1440 and 390 px, before and after: at rest, mid-hop and under reduced motion. Also a check that there's no horizontal scroll at either width.

## As built

- **Step 7, the hop's browser check.** The first full `npm run e2e` failed "A makes only the character hop": the check read the `transform` of `.character`, but the SVG moves a generated element inside that group (`<g class="character"><g class="range-sprite--a1">…`). The check now reads the group's drawn position instead (spec R22, updated in the same commit). The art and the page were right: the frame comparison had already matched every hop frame.
