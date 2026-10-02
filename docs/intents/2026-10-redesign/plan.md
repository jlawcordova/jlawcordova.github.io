# Plan: Isometric pixel-art redesign

| | |
| --- | --- |
| **Status** | Draft |
| **Intent** | [`intent.md`](intent.md) |
| **Spec** | [`spec.md`](spec.md) |
| **Created** | 2026-10-01 |

This plan turns the spec into an ordered set of pull requests and tasks. The spec says *what to build*; this says *in what order, in which PR, and how each step is checked*. When the plan and the spec disagree on a detail, the spec wins and the plan gets fixed. The one exception is where this plan says it changes the spec's slicing, and why.

## 1. Approach

The work ships as **four pull requests**, merged in order. Each one leaves `master` deployable, because every merge to `master` deploys to GitHub Pages.

| PR | Branch | Spec slices | What visitors see after merge |
| --- | --- | --- | --- |
| 1. Foundation | `feat/redesign-foundation` | 1 | New colors, fonts, header and footer on every page. Old page bodies still render, mapped onto the new tokens. |
| 2. Home | `feat/redesign-home` | 2, 3 | The new home page: hero island, Range carousel and restyled Accomplishments. |
| 3. Pages | `feat/redesign-pages` | 4 | Blog index, posts and 404 fully restyled. Legacy styles removed. |
| 4. Brand marks | `feat/redesign-brand-marks` | 5, 6 | Recolored JL logo, favicons, touch icons, manifest and share image. Final verification report. |

**Changes to the spec's slicing:**
- **`pixel-art.css` moves from slice 1 to PR 2.** Its keyframes only target the art, which first appears in PR 2.
- **Slices 2 and 3 share PR 2.** The pipeline has nothing to show until the home page uses its output.
- **Slice 6 (verification) runs in every PR** for the parts that PR touches. PR 4 carries the full pass.

**Dependencies:**
- PR 2, 3 and 4 each branch from `master` after the previous PR merges.
- The pixel-art pipeline tasks (T2.1–T2.3) don't depend on PR 1 and can start while PR 1 is in review.

## 2. Ground rules for every PR

- **No sensitive data.** Follow `CLAUDE.md`: no client names, project codenames or colleagues' names in code, copy, comments, commits, branch names, PR text or images. The art and copy come from the owner's own design canvas and `docs/references/profile.md`, which are public-safe.
- **Leave `src/data/accomplishments.json` alone.** It stays the committed `"unavailable"` placeholder. Fixture data used for checks is never committed.
- **Checks before every push:**
  - `npm test` and `npm run build`, which includes `astro check`. Zero errors, no new warnings.
  - The PR's own verification list below.
- **Screenshots** go in the PR description, taken with the pre-installed Playwright Chromium (`/opt/pw-browsers/chromium`) from a throwaway script outside the repo. No new dev dependencies.
- **One concern per commit.** Each commit message says what changed, not which task it was.
- **Spec drift.** If a task finds the spec wrong or incomplete, fix the spec in the same PR and say so in the PR description. Don't silently diverge.

## 3. PR 1: Foundation

**Goal:** every page gets the new tokens, fonts, header and footer, without breaking the old page bodies.

**Size:** M.

### Tasks

| ID | Task | Files | Done when |
| --- | --- | --- | --- |
| T1.1 | **Tokens.** Replace `variables.css` with spec §3.1. | `src/styles/variables.css` | The file matches §3.1 exactly. |
| T1.2 | **Legacy aliases** (temporary). Map each of the 18 old custom properties that `src/styles/` still uses to its nearest new token (see [Legacy alias map](#legacy-alias-map)), so the not-yet-restyled CSS keeps rendering. Also replace the literal `font-family: Merriweather` in `accomplishments.css`, `bio.css` and `recent-blogs.css` with `var(--font-text)`. The file starts with a comment saying it's removed in PR 3. | `src/styles/legacy-aliases.css` (new, temporary), literal font names in old CSS | `grep -rn "Merriweather\|Roboto" src/` returns nothing. Old pages render with no unstyled text. |
| T1.3 | **Fonts and head.** Swap the font `<link>`s for spec §3.4. Remove the Font Awesome kit `<script>`. | `src/layouts/BaseLayout.astro` | The built HTML loads Silkscreen and Sora only, and has no `kit.fontawesome.com`. |
| T1.4 | **Base, type and layout.** Rewrite these on tokens per spec §4 and §3.3: `body`, links, focus ring, anchor `scroll-margin`, smooth scroll (off under reduced motion), and the `.container`, `.isogrid` and `.visually-hidden` utilities (`.container` was later removed as unused in T3.7). Use `overflow-x: clip` on `body` (the spec was updated from `hidden`; see risk R1). | `src/styles/base.css`, `type.css`, `layout.css` | The utilities exist. Sticky positioning still works (checked in T1.7). |
| T1.5 | **Buttons and card.** Write `.btn`, `.btn--primary`, `.btn--ghost`, `.pill` (spec §5) and `.card` (spec §6.4). | `src/styles/buttons.css`, `src/styles/card.css` (new) | The classes match the spec. Nothing uses them yet except the nav pill. |
| T1.6 | **JL mark.** Write the component per spec §6.2, with a `height` prop (default 20). | `src/components/JLMark.astro` (new) | It renders two paths with the accent and ink fills. The outline is identical to `static/public/logo.svg`. |
| T1.7 | **Header and nav** per spec §6.1, with **Blog** and **Contact** only. The **Range** link and the brand's `#top` target wait for PR 2, because `#range` and `#top` don't exist until then. Remove the drawer button and its script. | `src/components/Navigation.astro`, `src/styles/navigation.css` | It's sticky on scroll, wraps at 390px, has 44px targets, and has no `fa-` classes. |
| T1.8 | **Footer** per spec §6.7, with the build-time year. | `src/components/Footer.astro`, `src/styles/footer.css` | Pixel-font bar. GITHUB, LINKEDIN, X and BLOG links, each with a 44px target. |
| T1.9 | **Stylesheet order.** Interim import list: spec §3.5 order for the files that exist, then `legacy-aliases`, then the old section files still in use. | `src/styles/global.css` | The build passes. No import points at a missing file. |

### Legacy alias map

Used by T1.2. It lists every old custom property still referenced in `src/styles/`.

| Old properties | New value |
| --- | --- |
| `--body-color` | `var(--color-ink)` |
| `--body-bg`, `--white` | `var(--color-page)` |
| `--primary-color`, `--link-color`, `--blue` | `var(--color-accent)` |
| `--gray-3`, `--gray-4` | `var(--color-ink-muted)` |
| `--border-color` | `var(--color-border)` |
| `--root-font-family`, `--header-font-family` | `var(--font-text)` |
| `--code-font-family` | `var(--font-code)` |
| `--code-color` | `var(--color-ink)` |
| `--root-font-size`, `--body-font-size` | `17px` |
| `--root-font-weight` | `400` (Sora 300 isn't loaded) |
| `--root-line-height` | `1.6` |
| `--large-font-size` | `20px` |

### Verify

- **Build:** `npm test` and `npm run build` pass.
- **Screenshots** at 1440×900 and 390×844 of `/`, `/blog/`, one post with code, and `/404`:
  - New header and footer.
  - Old bodies readable, with no default serif fonts and no pink.
- **Greps on `dist/`:** `kit.fontawesome.com`, `Merriweather`, `Roboto` and `#EC407A` all return no matches. Expected exception: `logo.svg`, `logo.png` and `favicon.*` stay the old pink until PR 4.
- **Keyboard:** Tab through the header. The focus ring is visible on every link.
- **Sticky header:** stays pinned while scrolling a long post at 1440px and 390px.

## 4. PR 2: Home

**Goal:** the new home page, including the pixel-art pipeline.

**Size:** L.

### Tasks: pixel-art pipeline

| ID | Task | Files | Done when |
| --- | --- | --- | --- |
| T2.1 | **Extract sources.** Read `project/Isometric.dc.html` from the [design canvas](https://claude.ai/artifact/JhKbkNZP9qGWHMaWE8USbR) and do spec §8 extraction steps 1–3. Take only the `<svg>` elements. The sprite's line also has a wrapping `<div role="img">`, which is not part of the source. Then: replace `style="display: {{vis.vN}}"` with `data-class="N"`, add `xmlns`, and drop the root `style`. No `{{…}}` may remain. | `src/assets/pixel-art/source/hero-island.src.svg`, `range-sprite.src.svg` | Both files parse as standalone SVG and render in Chromium exactly as the canvas does. |
| T2.2 | **Optimizer script, test first.** Write `scripts/optimize-pixel-art.test.mjs` (`node:test`, picked up by `npm test`) with small inline fixtures. It must check that the script: merges horizontal runs; keeps `class`, `data-class` and element order; handles nested groups (a `<g class>` wrapping `<g fill>`); leaves non-rect content untouched; and fails when a group's pixel set differs. Then write `scripts/optimize-pixel-art.mjs` per spec §8. It uses Node built-ins only. The sources use whole-number coordinates only and every rect is inside a fill group (checked on the mock), so the pixel-set comparison can be exact. | `scripts/optimize-pixel-art.mjs`, `scripts/optimize-pixel-art.test.mjs`, `package.json` (`"art"` script) | `npm test` passes, including the new tests. |
| T2.3 | **Generate the art.** Run `npm run art` and commit the outputs. | `src/assets/pixel-art/hero-island.svg`, `range-sprite.svg` | The lossless check passes. Each file is ≤ 100 KB raw and ≤ 25 KB gzip (expected about 97/20 KB and 41/7.6 KB). |
| T2.4 | **Pixel-art CSS** per spec §8.1. Port the keyframes verbatim from the mock's `<style>` (its lines 16–32). | `src/styles/pixel-art.css` (new) | The reduced-motion block covers every animated class, including `cbob`. |

### Tasks: home page

| ID | Task | Files | Done when |
| --- | --- | --- | --- |
| T2.5 | **Data.** `rangeClasses` per spec §7.3. | `src/data/home.ts` (new) | Typed `as const`. Index *i* matches sprite variant *i*. |
| T2.6 | **Hero.** `HeroIsland.astro` imports the optimized SVG with `?raw` and renders it through `<Fragment set:html={…} />`. Sizing comes from a class, not from attributes inside the SVG. `Hero.astro` follows spec §6.3, with copy from §7.1. | `src/components/home/HeroIsland.astro`, `Hero.astro`, `src/styles/hero.css` (new) | It matches the mock's hero at 1440px, apart from D4 and D5. The art has `aria-hidden="true"`. |
| T2.7 | **Range.** Follow spec §6.6, with copy from §7.3. The sprite is inlined the same way as the hero. The variant `display` rules key off `data-current` on the section, and the server renders `data-current="0"` so the no-JS state is correct. The script handles state, timer, pulse, prev/next, the pause toggle, hover/focus pause, reduced motion and visibility, as one `<script>` under 60 lines. | `src/components/home/Range.astro`, `src/styles/range.css` (new) | Every behavior in §6.6 works (see the Verify list). |
| T2.8 | **Accomplishments restyle.** Follow spec §6.8: render nothing for `"unavailable"` or zero items; cap at 8 with a `<details>` for the rest; pixel star badge; tags and links. `src/lib/accomplishments.ts` is unchanged. | `src/components/Accomplishments.astro`, `src/styles/accomplishments.css` | Fixture checks pass (see Verify). |
| T2.9 | **Compose the page.** `index.astro` renders `Hero`, `Range` and `Accomplishments`, in that order. Remove the old intro, bio and recent posts sections and the skill-rotator script. The nav gains the **Range** link (`/#range`), and the brand links to `#top` on the home page. Update `site.description` per spec §7.4. | `src/pages/index.astro`, `src/components/Navigation.astro`, `src/site.ts` | The home page has exactly three sections between the header and footer. |
| T2.10 | **Delete the old home.** Remove `intro.css`, `bio.css`, `recent-blogs.css` and `home.css` and their imports. (The related-posts rules that post pages use, such as `.recent-blog-container`, were already in `posts.css`. `recent-blogs.css` only styled the old home section, so nothing needed moving.) Delete `jlawcordova-cogs.svg`, `graph-background.png` and `graph-background.webp`. | `src/styles/*`, `static/public/*` | Nothing references the deleted files. Post pages' related posts still render. |
| T2.11 | **README.** Add `src/data/home.ts`, `src/assets/pixel-art/`, `scripts/optimize-pixel-art.mjs` and `docs/` to the project layout table, and `npm run art` to the commands. | `README.md` | — |

### Verify (spec §13 rows for the home page)

- **Build:** `npm test` (fetch and optimizer tests) and `npm run build` pass.
- **Mock match:** full-page screenshot of `/` at 1440px, side by side with the canvas board. It matches apart from D1–D6.
- **390px:** screenshot of `/`. `scrollWidth <= innerWidth`. All tap targets at least 44px.
- **Carousel** (Playwright):
  - Auto-advances through all 5 names in about 11s.
  - Prev and next wrap around.
  - The nameplate, sprite variant, current dot, `aria-label` and `--class-shadow` change together.
  - Pause stops it. Hover and focus pause it.
  - The `aria-live` toggling follows §6.6.
- **Reduced motion:** Playwright with `reducedMotion: 'reduce'`.
  - `document.getAnimations().length === 0`.
  - The toggle shows "play".
  - Only frame 0 of each frame loop is visible.
- **No JavaScript:** Front-end shows, the arrows and toggle are hidden, and the layout doesn't shift.
- **Accomplishments fixtures** (a)–(e) from spec §13, run by temporarily overwriting the JSON. Restore it with `git checkout src/data/accomplishments.json` before committing.
- **Weight:** gzip sizes per spec §12, reported in the PR. Total first-party is ≤ 50 KB.
- **Greps on `dist/index.html`:**
  - Old copy ("Enterprise Applications", "Code + Create", "Backend Systems"): no matches.
  - The §7.5 confidentiality search, run on a build that includes the live accomplishments (`npm run fetch-accomplishments` first, then restore the placeholder): no matches.

## 5. PR 3: Pages

**Goal:** blog index, posts and 404 in the new style, with the temporary legacy layer removed.

**Size:** M.

| ID | Task | Files | Done when |
| --- | --- | --- | --- |
| T3.1 | **Page title band.** `.page-head` per spec §9.1, as a small shared component that takes `title` and an optional `label`. | `src/components/PageHead.astro` (new), `src/styles/page.css` | Used by the blog, posts and 404. |
| T3.2 | **Blog index and pagination** per spec §9.2, with the `Blog` H1 and the posts/page label. Pagination is wrapped in `<nav aria-label="Blog pages">` and marks the current page with `aria-current="page"`. | `src/components/BlogPage.astro`, `PostListItem.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[page].astro`, `src/styles/blog.css`, `blog-item.css` | `/blog/` and `/blog/page2/` render to spec at 1440px and 390px. |
| T3.3 | **Post page** per spec §9.3: reading column, images, blockquote, tables, links, and related posts as an `<aside>` card grid on new classes. | `src/pages/[...slug].astro`, `src/styles/posts.css` | The `recent-blog-*` classes are gone from markup and CSS. |
| T3.4 | **Code and syntax.** Inline code and code blocks per spec §9.3, Prism theme per §9.4. | `src/styles/code.css`, `syntax.css` | Every token color in the file comes from the §9.4 table. |
| T3.5 | **404** per spec §9.5. | `src/pages/404.astro` | The copy matches. There's one "Head back home" button. |
| T3.6 | **Remove the legacy layer.** Delete `legacy-aliases.css`, `masthead.css` and `message.css` and their imports. Set the final §3.5 import order. | `src/styles/*` | None of the 18 old custom property names from T1.2 remains: `grep -rnE "var\(--(body-color\|body-bg\|white\|primary-color\|link-color\|blue\|gray-[0-9]\|border-color\|root-font\|header-font\|code-font\|code-color\|body-font\|root-line\|large-font)" src/` is empty. |
| T3.7 | **Obsolete selector sweep.** For every selector left in `src/styles/`, confirm a use in `src/` or post content. Delete the unused ones. | `src/styles/*` | A short script or grep log in the PR description shows zero unused selectors, apart from styles the spec requires for markup posts can produce but don't yet: the §9.3 table styles and the §9.4 Prism token colors. |

### Verify

- **Build:** `npm test` and `npm run build` pass.
- **Screenshots** at 1440px and 390px: `/blog/`, `/blog/page2/`, a C# post, a YAML post, a post with a blockquote, and `/404`.
- **URLs unchanged:** the list of built `dist/**/index.html` routes plus `atom.xml` is identical to `master`'s build before this PR.
- **Greps on `dist/`:** `fa-`, `Merriweather`, `Roboto` and `#EC407A` return no matches in CSS or HTML.
- **No horizontal scroll** at 390px on any of the pages above. Long code blocks scroll inside their box.

## 6. PR 4: Brand marks and final verification

**Goal:** the recolored JL logo everywhere it appears outside the page, and the full acceptance pass.

**Size:** S–M.

| ID | Task | Files | Done when |
| --- | --- | --- | --- |
| T4.1 | **Vector marks.** Recolor `logo.svg`: same 68×45 geometry, J `#3F6B45`, L `#2E2418`, written as the two paths from spec §6.2. Write `favicon.svg` with the square-padded viewBox (§10). | `static/public/logo.svg`, `static/public/favicon.svg` (new) | Both open correctly in Chromium. The geometry diff against the old logo is colors only, apart from the old file's 0.2-unit overlap fringe around the L (`x=37.8` rects), which the spec's whole-unit paths drop. |
| T4.2 | **Raster marks.** With a throwaway script outside the repo (Playwright Chromium screenshots, plus a few lines of Node to pack PNGs into an ICO), produce every raster in spec §10. Commit outputs only. | `logo.png`, `logo@2x.png`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `apple-touch-icon-precomposed.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png` | Sizes match the file names. The 16px favicon has crisp edges. |
| T4.3 | **Share image** per spec §10, from a throwaway HTML page that uses the committed hero art. | `static/public/jlawcordova-image.png` | 1200×630, ≤ 300 KB, no text beyond what §10 lists. |
| T4.4 | **Head and manifest.** Add the §10 `<link>`s and `theme-color` to `BaseLayout.astro`, replacing `shortcut icon` and `apple-touch-icon-precomposed`. Write the §10 manifest, which fixes the icon paths. | `src/layouts/BaseLayout.astro`, `static/public/site.webmanifest` | The manifest is valid JSON and its icon URLs resolve in `dist/`. |
| T4.5 | **Final verification.** Run every row of spec §13 and the intent's acceptance criteria, including Lighthouse (accessibility = 100, performance ≥ 95 mobile) on `/` and one post. Run it through `npx lighthouse` with `CHROME_PATH=/opt/pw-browsers/chromium`; if Lighthouse can't be installed in the environment, run axe-core instead and say so. Put a pass/fail table in the PR description. | — | Every row passes, or the PR says what failed and why. |

### Verify

- **Greps on the build:** the built `index.html` references the new icons and the manifest, and `#EC407A` appears nowhere in `dist/`, images included (spot-check that `favicon.ico` was regenerated).
- **Share preview:** check `og:image` with a social-card preview tool, or by opening the image URL directly.
- **The full T4.5 table.**

## 7. Risks and mitigations

| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | **`overflow-x: hidden` on `body` can break the sticky header.** If the overflow isn't propagated to the viewport, for example because `html` also sets `overflow`, the body becomes the scroll container. | Use `overflow-x: clip` on `body`, which hides the hero art's overflow without creating a scroll container. Check the sticky header in PR 1 and again in PR 2 once the hero art is in place. |
| R2 | **Slice 1 restyles the shell while old bodies remain.** Mixed pages in production for one or two deploys. | `legacy-aliases.css` maps old tokens onto the new palette and fonts, so the in-between state is coherent. It's removed in PR 3 (T3.6). |
| R3 | **The nav links to `#range` before it exists.** | The Range link and the brand's `#top` target are added in PR 2 (T1.7, T2.9). |
| R4 | **The optimizer changes a pixel or the z-order.** | Test-first fixtures (T2.2), plus the per-group pixel-set check on every run. Groups are re-emitted in source order. |
| R5 | **The art blurs at non-integer scales.** 675px is exactly 3× the 225-unit viewBox; smaller widths aren't. | `shape-rendering: crispEdges` keeps edges hard. Accept slightly uneven pixel widths below 675px, as the mock does. |
| R6 | **Accomplishments records are empty at launch,** so the section never shows in review. | Fixture checks (a)–(e) in PR 2 cover every state. Real records appear on the next deploy after one is added. |
| R7 | **A record or new copy leaks a confidential name.** | The §7.5 grep in PR 2 and PR 4, on a build with live records. `CLAUDE.md` covers records written through the MCP tools. |
| R8 | **Lighthouse isn't available in the container.** | Fall back to axe-core and a manual contrast spot-check. Say so in the PR 4 report. |
| R9 | **Silkscreen or Sora fail to load**, for example if Google Fonts is blocked. | The font stacks in §3.1 fall back to `ui-monospace` and `system-ui`. The layout must not depend on exact glyph widths: check by blocking fonts once in PR 1. |
| R10 | **A deploy goes out mid-sequence while a daily or dispatch rebuild runs.** | Every PR leaves `master` deployable, so a rebuild at any point is safe. |

## 8. Follow-ups (not in this plan)

- A sixth Range class, **Security & Governance**, with new outfit art (intent decision #7). The art is made with the pixel-art engine in [`2026-10-pixel-art-engine/intent.md`](../2026-10-pixel-art-engine/intent.md).
- A nav link to Accomplishments once there are enough records (decision #11).
- Refreshing the résumé PDF against the profile (decision #4).
- A skills strip from the profile's inventory (decision #8).

## 9. Progress

Update this checklist as PRs merge.

- [x] PR 1: Foundation
- [x] PR 2: Home
- [x] PR 3: Pages
- [ ] PR 4: Brand marks and final verification
