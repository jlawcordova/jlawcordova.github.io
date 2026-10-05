# Plan: A pixel-first look, with Motion transitions (from intent.md 2026-10-04)

## Context

The intent (`docs/intents/2026-10-pixel-first-look/intent.md`, accepted and amended 2026-10-05) and spec (`spec.md`, merged in #84) call for these changes:
- square corners and `border-thick` instead of shadows;
- Silkscreen on buttons and nav links;
- a see-through nav with a small-screen menu;
- a grass-block footer;
- the Range as a handheld console;
- two-column accomplishments;
- plain-JS Motion entrances and state changes.

The home page is built to the owner's canvas ("Home page proposal", private artifact).

The owner asked for this order: global theme first, then three parallel subagents for (1) hero, nav and footer, (2) Range, (3) accomplishments. #86 (`feat/hero-island-detail`) merged on 2026-10-05, so the spec's Sequencing (R19, C7) no longer holds the hero back. Also, #86 never touched `Hero.astro`, `hero.css` or `lab.css`. The spec's reason for deferring `lab.css` was wrong, and the owner approved moving it into the theme step.

## Skill update

While planning, the owner asked for `write-plan` to make the main-session branch the default. That's tooling, not part of this change, so it's in its own PR into `main`, [#87](https://github.com/jlawcordova/jlawcordova.github.io/pull/87). This plan already follows it: every slice merges into `feat/pixel-first-look`, and one final PR goes to `main`.

## Files that change

**Docs:**
- `docs/intents/2026-10-pixel-first-look/plan.md` (new)
- `spec.md`: Status set to approved; Sequencing, R19 and C7 resolved because #86 merged; `lab.css` moved into the theme step
- `docs/intents/2026-10-redesign/spec.md` and `docs/intents/2026-10-gamified-accomplishments/spec.md`: dated notes
- `README.md`: the project layout gains `src/lib/motion.ts`

**Theme (PR 1):**
- Dependencies: `package.json`, `package-lock.json` (`motion@14.0.0`, exact)
- Tokens: `docs/design-system/tokens.json`, `src/styles/variables.css`, and `scripts/design-system.test.mjs` (the `tokenList` families gain `border`)
- The sweep, every stylesheet with a radius, offset shadow or non-nav blur: `buttons.css`, `card.css`, `code.css`, `blog.css`, `posts.css`, `accomplishments.css`, `range.css`, `navigation.css`, `lab.css`, `design-system.css`
- `src/lib/motion.ts` (new)
- `scripts/pixel-first-look.test.mjs` (new)
- Footer grass art (new):
  - `src/assets/pixel-art/source/objects/footer-grass.mjs` and `footer-dirt.mjs`
  - `scenes/footer-grass.mjs` and `scenes/footer-dirt.mjs`
  - outputs `src/assets/pixel-art/footer-grass.svg` and `footer-dirt.svg`
- Previews: `docs/design-system/components/{Button,Pill,Card,Pagination,CodeBlock}/preview.html`

**Slice A, shell and hero (PR 2):**
- `src/layouts/BaseLayout.astro`: the pre-paint `data-js` inline script
- `src/components/Navigation.astro`, `src/styles/navigation.css`
- `src/components/Footer.astro`, `src/styles/footer.css`
- `src/components/PageHead.astro` (if needed), `src/styles/page.css`
- `src/components/home/Hero.astro`, `src/styles/hero.css`
- Previews: `docs/design-system/components/{Navigation,Footer,PageHead}/preview.html`
- `scripts/e2e/shell.e2e.mjs` (new)

**Slice B, Range (PR 3):**
- `src/components/home/Range.astro`, `src/styles/range.css`, `scripts/e2e/range.e2e.mjs`

**Slice C, lists (PR 4):**
- `src/components/Accomplishments.astro`, `AccomplishmentRow.astro`, `AccomplishmentsPage.astro`
- `src/styles/accomplishments.css`
- `src/components/BlogPage.astro` and `PostListItem.astro` (the post-card stagger)
- `docs/design-system/components/AchievementRow/preview.html`
- `scripts/e2e/accomplishments.e2e.mjs`

**Integration (PR 5):**
- `scripts/e2e/motion.e2e.mjs` (new)
- the docs notes above

## Order of work

**One feature branch, `feat/pixel-first-look`,** branched from `main` at `b78c5b4` (with #86). Every slice PR merges into it, and one final PR takes it to `main`:

```
main ──┬──────────────────────────────────────────────── PR 5 (owner merges) ──▶ main
       └─ feat/pixel-first-look
            ├─ step 0: plan.md + spec amendment (direct commits)
            ├─ PR 1  theme   ◀─ feat/pixel-first-look-theme
            ├─ PR 2  shell+hero ◀─ feat/pixel-first-look-shell ┐
            ├─ PR 3  range   ◀─ feat/pixel-first-look-range   ├ in parallel, from PR 1's merge
            ├─ PR 4  lists   ◀─ feat/pixel-first-look-lists   ┘
            └─ integration commits (motion e2e, budgets, notes)
```

Merging into `feat/pixel-first-look` deploys nothing, so each slice only has to build and pass its checks. Only PR 5 deploys. Slices A, B and C each branch from PR 1's merge and don't depend on one another.

**Step 0 (main session, on `feat/pixel-first-look` directly):**
- **0a.** Commit `plan.md`.
- **0b.** Amend `spec.md`: Status approved; Sequencing and C7 resolved (#86 merged 2026-10-05, so the hero joins slice A); `lab.css` moves into the theme step; correct the claim that #86 edits `lab.css`.

**PR 1, theme → `feat/pixel-first-look`:**
1. `npm install --save-exact motion@14.0.0`. Confirm `package-lock.json` has no `react` or `react-dom` entries (C3).
2. **Tokens**, in `tokens.json` and `variables.css` together:
   - `radius-*` become `0`;
   - remove `shadow-pixel`, `shadow-pixel-pressed`, `shadow-pixel-accent` and `shadow-nav`, and keep `shadow-focus-halo`;
   - `color-surface-strong` becomes `rgba(250, 245, 235, 0.78)`;
   - a new `border` family holds `border-thick` (`3px solid var(--color-ink)`) and `border-thick-width` (`3px`);
   - the `wordmark` sample becomes "J. LAW. Cordova", and `color-ink`'s usage drops "hard pixel shadow";
   - minor `version` bump;
   - `design-system.test.mjs`'s family list gains `border`.
3. **Global sweep.** Every `border-radius` literal is set to 0 or dropped. Offset and blur shadows become `border-thick`, as follows:
   - `.btn--primary`, `.btn--ghost`, the pill, the current pagination link and the achievement tooltip get `border-thick`;
   - code blocks get no edge;
   - the range nameplate loses its shadow for now (slice B adds the swatch);
   - `lab.css`'s one `shadow-pixel` (the pressed tool) is dropped, since its ink fill is already its edge and an ink border on ink wouldn't show;
   - the nav drops `shadow-nav` but keeps its fill and blur;
   - the Range panel loses its blur for now (slice B rebuilds it).

   Also: `.btn--ghost` moves to `font-pixel`; pressed buttons translate 2px with `transition: transform .12s steps(2)`. Spread-only focus halos and the lab's selection rings stay.
4. **`src/lib/motion.ts`:** the only importer of `motion` (`animate`, `stagger`, `inView`). It exports:
   - `reduced()`, read from `matchMedia` on every call;
   - `easeOut`, the shared smooth easing (first planned as stepped `px(n)`; changed after launch, see the note under Risks);
   - `play(el, keyframes, opts)`, which returns at once when `reduced()`;
   - `reveal(els, { y, stagger })`, which hides only elements whose top is below the viewport, in the same call that registers `inView`, and reveals them all on `beforeprint`;
   - `stagger`, re-exported.

   Islands import this module statically. The nav imports it dynamically (slice A).
5. **`scripts/pixel-first-look.test.mjs`**, node:test, reading files only. In `src/` and `docs/design-system/` it checks that:
   - no `border-radius` value is anything but `0`;
   - no `box-shadow` has an x/y offset or a blur;
   - no `backdrop-filter` appears outside `.site-nav`;
   - no retired token name appears.

   It also checks that `border-thick` exists in both token files, and that `package.json` pins `motion` exactly with no other new dependency.
6. **Footer art.** The `footer-grass` and `footer-dirt` sprites and scenes come from the `pixel-artist` agent (it runs in parallel with steps 1–5; see Workflow):
   - **Grass edge:** a 48×28 tile from the canvas's `grass-edge` pattern, mapped to world `grass-1`…`grass-4`, with a stepped bottom over a `soil-4` ground.
   - **Dirt:** a 64×48 speckle tile from `dirt-speckle`, with `soil-3` and `ink` speckles on `soil-4`.

   Each tile stays within the 64×64 and 12-color caps and the 100 KB / 25 KB budget. `npm run art` must report lossless.
7. Update the Button, Pill, Card, Pagination and CodeBlock previews where their markup changed.

**PRs 2–4, three parallel slices → `feat/pixel-first-look`, each from PR 1's merge:**

**Slice A, shell and hero (PR 2):**
- **A1. Pre-paint flag.** An `is:inline` script in `BaseLayout`'s `<head>` sets `document.documentElement.dataset.js = ''`.
- **A2. Nav.**
  - Brand: the mark at 23px, a 24px gap, then "J. LAW. Cordova".
  - Links: Silkscreen 13px. Range (`/#range`), then Lately (`/#accomplishments`), then Blog, then the Contact pill. Lately renders only when `homeSelection(getAccomplishments()).visible` from `src/lib/accomplishments.ts`.
  - The bar: `color-surface-strong` with a 16px blur and `border-thick`, keeping the existing `@supports not` fallback.
- **A3. Small-screen menu (≤720px).**
  - Hidden only under `html[data-js]` until `.is-open`.
  - A 44px icon-only button with the canvas's pixel paths, plus `aria-expanded`, `aria-controls` and the "Open menu"/"Close menu" label.
  - It closes on a link, on Escape (focus returns to the button), on an outside click, and when the window widens past 720px.
  - Motion is loaded with `import('../lib/motion')` on the button's first `pointerenter`, `focus` or `touchstart`. The links stagger in (0.2s, `px(4)`, 0.04s) when it's loaded, and show at once otherwise.
- **A4. Page head.** It starts behind the header: the band's top padding is the header's height plus the original padding, with a matching negative top margin.
- **A5. Footer.**
  - The grass and dirt SVGs as CSS backgrounds (`image-rendering: pixelated`): grass `repeat-x` on top, dirt below.
  - The mark on a `color-card` chip, then "© {year} J. LAW. CORDOVA" and GitHub, LinkedIn, X, Blog and "↑ TOP" (`#top`, `color-gold`).
  - Silkscreen 13px, 52px top and 40px bottom padding, gold on hover.
- **A6. Hero.**
  - Remove `.hero__pretitle`, and change the lede to the canvas's text (no employer).
  - The band starts behind the header, as A4.
  - Wrap the island in an inner element that keeps `.floaty`.
  - On load, `play()` staggers the title, lede and buttons (y 16→0, 0.4s, `px(6)`, 0.08s), then the island (y 24→0, 0.5s, `px(6)`, 0.2s delay). The island also fades in (opacity 0→1), as the canvas has it, so it doesn't jump down before it rises.
- **A7.** Update the Navigation (with the menu button), Footer and PageHead previews, and write `shell.e2e.mjs` (Proof).

**Slice B, Range (PR 3):**
- **B1. Markup and CSS.**
  - The copy is centered above the console.
  - The console: a gold shell with `border-thick` on three sides, running off the section's bottom edge (`overflow: hidden`, no bottom padding), 540px at most, padding 28px (16px at ≤480px).
  - An ink bezel around a `color-card` `.isogrid` stage.
  - The nameplate: `label` type with a 12px swatch of `--class-shadow`, still 44px tall.
  - Speaker slots (`aria-hidden`).
  - The pager dots are removed.
- **B2. Controls.**
  - The D-pad's left and right keep `.range__arrow[data-dir]` and their labels.
  - START keeps `.range__toggle` and `aria-pressed`, now named "Start: pause the class rotation".
  - A (`.range__a`, "A: jump") and B (`.range__b`, "B: previous class", same as Previous).
  - JUMP, BACK and START labels in Silkscreen 10px.
  - Focus is an ink outline over a gold halo.
  - Without JavaScript, the buttons are hidden by `visibility` as today.
  - Under reduced motion, A is hidden.
- **B3. Motion.**
  - `reveal()` the console (y 48→0, 0.4s, `px(6)`).
  - On a class change: the sprite slides x ±24→0 (0.25s, `px(4)`) and the nameplate pops (scale 0.88→1.06→1, 0.2s, `px(3)`).
  - The A hop: y 0→−16→0→−6→0 with a small x shake (0.5s, `px(8)`), with no class change.
  - The rotation logic in the existing script is unchanged.
- **B4. Update `range.e2e.mjs`.**
  - The R6/R8 test drops the dots and keeps the name, label, swatch, 44px plate and no scroll.
  - New: START pauses and plays, B goes back, A hops without changing the class, A is hidden under reduced motion, and every console button is ≥44px.

**Slice C, lists (PR 4):**
- **C1. Home accomplishments.**
  - Two columns above 720px (1:2, 48px gap) using grid areas: the heading, the new lede "A running log of what I’ve shipped recently." and Show more on the left, the rows on the right.
  - In the DOM, Show more stays after the list.
- **C2. Rows.**
  - A 3px `color-border` edge, 3px dashed `color-border-strong` when locked, 12px gap, and hover on `color-border-strong` over `color-surface-ghost`.
  - The tooltip gets `border-thick`.
  - The chevron turns with `steps(2)`.
  - The panel's grid-rows transition is replaced by a `toggle` listener that runs `play()` on open (y −8→0, 0.25s, `px(4)`). Closing is instant.
- **C3. Entrances.** `reveal()` the rows (y 16→0, 0.4s, `px(6)`, 0.06s) on the home page and `/accomplishments/`, and the post cards on the blog list.
- **C4.** Update the AchievementRow preview and `accomplishments.e2e.mjs`:
  - R20 now checks that the panel's Motion animation doesn't run under reduced motion;
  - the R1/R9 row checks cover the 3px edges.

**Integration, then PR 5 → `main` (main session, after PRs 2–4 merge into the branch).** The steps below are commits straight on `feat/pixel-first-look`. PR 5 is that branch against `main`:
- **I1.** Merge `main` into `feat/pixel-first-look` if it moved.
- **I2.** `scripts/e2e/motion.e2e.mjs`:
  - after load and a full scroll, every animated element ends at opacity 1 with no transform;
  - with JavaScript disabled, and with the Motion chunk blocked by `page.route`, the hero, the console, every row and every card are visible at load;
  - under reduced motion, nothing animates;
  - printing reveals everything.
- **I3.** Measure the budgets from `dist/` (Proof) and record them in the PR. Add dated notes to:
  - the redesign spec's §12, for the JS budget;
  - its Range section, for the dots;
  - the gamified accomplishments spec's R20.

  Add `src/lib/motion.ts` to the README's layout.
- **I4.** Open the PR to `main` with screenshots. Only the owner merges it.

## Workflow and reviews

The run, start to finish. Each step starts as soon as the previous one ends, with no pause to ask:

| # | Who | Where | Then |
| --- | --- | --- | --- |
| 0 | Main session | `docs/plan-skill-branches`: the skill and `CLAUDE.md` update (#87) | Opens its PR into `main` for the owner, and doesn't wait for it → 1 |
| 1 | Main session | Creates `feat/pixel-first-look` from `main`, commits step 0, and pushes | → 2 |
| 2 | Main session, plus one pixel-artist agent in parallel | `feat/pixel-first-look-theme`: steps 1–5 and 7, and the agent's step 6 merged in | Opens PR 1 into the feature branch, merges it when checks and CI are green → 3 |
| 3 | Three general-purpose agents in parallel, each in its own worktree | `-shell`, `-range` and `-lists`, branched from the feature branch after PR 1 | Each opens its PR into the feature branch with its Proof pasted. The main session merges each one when it's green, in the order they finish, then runs `npm test` and the build on the feature branch → 4 when all three are in |
| 4 | Main session | Integration commits on the feature branch | Opens PR 5 into `main` → 5 |
| 5 | Fresh verifier subagent | Reads PR 5 only | Posts its report on PR 5. The main session fixes blocking findings on the feature branch → 6 |
| 6 | Owner | Reviews PR 5 (screenshots, the verifier's report) | Feedback becomes commits on the feature branch. The owner merges into `main` |

**Rules for the run:**
- **Merging into the feature branch:** the main session merges a slice PR when its pasted Proof and CI are green. Agents never merge into `main`; the hook enforces it.
- **When `main` moves:** merge `main` into the feature branch before the next step starts, and slices merge the feature branch into theirs before they open a PR.
- **A slice that conflicts** with another already merged: the slice's agent merges the feature branch in and resolves the conflict. If the resolution touches another slice's files, the main session does it instead.
- **Stop and report** (to the owner, in chat) only when:
  - a slice needs a shared file it doesn't own;
  - a test that should pass doesn't, and the fix isn't in the slice;
  - the home JS budget goes over 32 KB;
  - a public-safety question comes up;
  - something outside this plan would be hard to reverse.

**Step 0 and PR 1 (theme):** the main session runs them in order.
- During PR 1, the main session also spawns one `pixel-artist` agent in its own worktree for step 6. If the session doesn't list `pixel-artist` as an agent type, it spawns a general-purpose agent told to read and follow `.claude/agents/pixel-artist.md`. Its brief: the two canvas patterns, the world-palette mapping above, and the caps.
- Its sources and outputs are merged into the theme branch as step 6's commit.
- The art isn't wired into the page yet, so it doesn't block steps 1–5.

**PRs 2–4:** once PR 1 is merged into `feat/pixel-first-look`, the main session spawns three general-purpose agents in parallel, each with `isolation: "worktree"` on its own branch from `feat/pixel-first-look`:
- `feat/pixel-first-look-shell` (A),
- `feat/pixel-first-look-range` (B),
- `feat/pixel-first-look-lists` (C).

Each agent gets the same brief:
- this plan, its slice's steps, and the file-ownership list above;
- "Don't edit a file outside your slice. If you need a change to `src/lib/motion.ts`, tokens or another slice's file, stop and report it instead."
- Run `npm ci`, then the slice's Proof. Commit one commit per step, push, and open a PR into `feat/pixel-first-look` with the output pasted in.

The main session merges each slice once its checks and CI are green, in the order they finish. Each merge is followed by a rebuild and `npm test` on the branch.

**Owner reviews:** none mid-way, since the canvas already sets the look. The owner reviews PR 5: screenshots of every changed page at 1440px and 390px, plus a 4× footer close-up. Feedback becomes commits on the branch before they merge.

**Independent review:** one `verify-change` run on PR 5, against the whole spec, in a fresh subagent given only "Use the `verify-change` skill on PR #<n>." It's a large feature branch that changes shared tokens. Blocking findings are fixed on the branch. The slices get no verifier: `pixel-first-look.test.mjs`, the e2e suites and the final run cover them.

## Risks

*Changed after launch (2026-10-05): the owner found the stepped UI motion laggy on the deployed site. It held 60 fps, but `steps()` moves in 3–8 jumps by design. A follow-up replaces every `px(n)` and `steps(2)` in UI motion with a smooth ease-out (`easeOut` in `src/lib/motion.ts`, `ease-out` in CSS). The pixel-art loops stay stepped. Bundle size is unchanged.*


- **Parallel slices colliding.** This is the main workflow risk.
  - Each slice owns a separate set of files (see Files that change).
  - All shared pieces land first in PR 1: the tokens, `motion.ts`, `package.json` and the guard test.
  - A slice that needs a shared change stops and reports rather than editing.
  - The only overlap with another slice is the Lately link. It reads the existing `homeSelection`, and C doesn't change that.
- **The riskiest step is slice A's menu and pre-paint flag,** since it runs on every page and must work without JavaScript and without layout shift.
  - `shell.e2e.mjs` tests it with JavaScript off, at 390px and at 1440px.
  - The flag is set before first paint, so the closed menu never flashes open.
- **Hidden content (C6).** `reveal()` hides elements only in the same call that registers their reveal, and only below the fold. `motion.e2e.mjs` blocks the Motion chunk and disables JavaScript to prove nothing stays hidden.
- **The theme sweep breaking existing suites.** `range.e2e.mjs` reads `--class-shadow`, not `box-shadow`, so it survives PR 1. PR 1 runs every suite before it merges.
- **E2e flakiness from stepped animations.** Tests wait for end states by polling computed opacity and transform, never with fixed sleeps.
- **The budget.** Motion's `animate` and `inView` should be about 18 KB gzip. If home JS exceeds 32 KB gzip, stop and report before PR 5. Don't switch to `motion/mini` without the owner.
- **Footer art over its caps or off-palette.** `npm run art` fails the build, and the pixel-artist iterates until it reports lossless and within budget.
- **The console at 390px.** It must fit: the D-pad's 132px, START's 64px, the A/B column's roughly 100px and 32px of padding. If it doesn't, the padding drops to 16px. The screenshots and `scrollWidth` checks prove it.
- **Dead nav link.** With the `"unavailable"` placeholder, Lately must not render. `shell.e2e.mjs` checks it against the committed placeholder.

**Considered and not chosen:**
- **One sequential PR:** slower, and the owner asked for fan-out.
- **A fourth parallel hero slice:** no longer needed now that #86 has merged, and the owner grouped the hero with the shell.
- **A verifier on every slice:** the guard test and the final whole-spec run cover them more cheaply.
- **A docs PR for the plan before the branch:** the plan is the branch's first commit and reaches `main` with PR 5, so implementation doesn't wait on another merge.

## Proof

Every PR pastes these:
- `npm test`: `# fail 0`, including `pixel-first-look.test.mjs` and `design-system.test.mjs`.
- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints`, `[build] Complete!`.
- `npm run art`: every file `lossless`, none `OVER BUDGET` (PR 1, PR 2).
- `npm run e2e`: `# fail 0`, never "NOT RUN". Slices run their own suite plus the whole set before opening the PR:
  - PR 2: `shell.e2e.mjs`;
  - PR 3: `range.e2e.mjs`;
  - PR 4: `accomplishments.e2e.mjs`, run alone as CLAUDE.md requires.
- Screenshots at 1440px and 390px of each page the PR changes, with `document.documentElement.scrollWidth === innerWidth`. Rich-fixture builds for accomplishments, restored with `git checkout src/data/accomplishments.json` afterwards.

Also for PR 5:
- `motion.e2e.mjs` passes.
- The budgets: `dist/` JS chunks loaded by `/` ≤ 32 KB gzip; JS loaded by a post and by 404 ≤ 4 KB gzip before the menu opens; CSS ≤ 8 KB gzip; home total first-party ≤ 160 KB gzip. Measured with `gzip -c | wc -c` over the files each page's HTML references.
- Screenshots of every page (home, blog list, a post, `/accomplishments/`, 404, `/design-system/`, the lab) at both widths.
- The verifier's PASS comment.
