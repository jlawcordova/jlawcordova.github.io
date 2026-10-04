# Plan: Copy that follows the design system (from intent.md 2026-10-04)

| | |
| --- | --- |
| **Status** | Approved 2026-10-04. Built; awaiting independent verification and the owner's review |
| **Intent** | [`intent.md`](intent.md) (accepted) |
| **Spec** | [`spec.md`](spec.md) (approved). R*n* and C*n* below refer to its requirements and concerns |

One PR, `feat/design-system-copy` → `main`, with one commit per step below. Nothing here is risky or hard to reverse, nothing waits on anything outside the repo, and the diff is mostly Markdown, so it doesn't need splitting. The site is deployable after every commit.

The source for the design system's content is the artifact's current version (1791091552-a35a). Each file is read from it with the Artifact tool, then edited as below.

## Departures

Recorded as the work departed from this plan, per `CLAUDE.md`. The spec still holds, with the dated note on its page address.

1. **The preview page is `/design-system/`, not `/lab/design-system/`.** The owner asked for it during step 7, so the page is `src/pages/design-system.astro`. It's still unlisted and `noindex`. Every mention in this plan, the spec, CLAUDE.md and the README now uses the new address.
2. **The pixel-art lab's unlisted check covers the preview page.** `scripts/e2e/editor.e2e.mjs` (R15) failed the first full run because it allowed only `/lab/pixel-art/` to be `noindex`. It now also expects `/design-system/` to carry the robots meta, and still checks that no other page links to either page or is `noindex`.
3. **Step 1 adapted the AchievementRow README's icon line,** not only the main README's paths. Its "crop an `<img>` with `.achievement__icon--img`" note only worked inside the artifact, so it now describes the site's `<use>` markup.
4. **C3 didn't happen.** The build reads `docs/design-system/` with `import.meta.glob`, so the previews stayed where the spec put them.

## Workflow

- **Who builds it:** the main session, inline. No implementer subagents: the work is small, mostly copying and editing text, and each step needs the artifact files the session has already read. A subagent would start cold and re-read them.
- **Sequence:** the steps are commits made in order, so the PR reads step by step. They form three independent tracks, which is where parallel work would be possible:
  - **A, the design system:** steps 1 → 2 → 3, then step 8 after the PR is up. Each step builds on the one before.
  - **B, the site copy:** step 5. It depends on nothing in A.
  - **C, the preview page and test:** step 4. Its CSS, token and test parts don't depend on A, but the page needs step 3's previews before it can be checked.
  - Step 6 (pointers) and step 7 (verification) come last, because they describe and check the whole change.
  The tracks could run in parallel, but each is minutes of work, so running them in sequence costs little and avoids merging their branches.
- **Verification:** once the PR is open, a fresh session given only "Use the `verify-change` skill on PR #<n>." checks it against the intent, spec and plan (CLAUDE.md step 5). Blocking findings are fixed, and a new verifier runs, until a report has no blockers. Only the owner merges into `main`.

## Progress

- [x] 1. Move the design system in
- [x] 2. Design system edits
- [x] 3. Previews
- [x] 4. Preview page and test
- [x] 5. Site copy
- [x] 6. Pointers and notes
- [x] 7. Verify
- [x] 8. Retire the artifact

## Files that change

**Design system (new, R1, R2, R6–R12)**
- `docs/design-system/README.md` (new): from the artifact's `project/README.md`, with the edits in spec [Design system edits](spec.md#design-system-edits), and `project/assets/Icons/README.md` and `project/assets/Logos/README.md` folded into Iconography with repo paths
- `docs/design-system/tokens.json` (new): from `project/tokens.json`, with `meta` replaced and the `hero-title` sample updated
- `docs/design-system/components/<Name>/README.md` (new, 12): from `project/components/<Name>/README.md`. Button and AchievementRow are edited as the spec says. The other 10 are copied as they are
- `docs/design-system/components/<Name>/preview.html` (new, 12): the `<body>` contents of each artifact preview, edited as in step 3

**Preview page (new, R4a)**
- `src/pages/design-system.astro` (new): the unlisted preview page
- `src/styles/design-system.css` (new): the `.brief*`, `.register*` and `.rating*` rules from the artifact's `components/bundle.css` (lines 1136–1259), imported only by the preview page
- `src/styles/variables.css`: adds `--radius-chip: 6px`, which those rules use. It's already a token in `tokens.json`, so the token test then covers it too

**Tests (new, R3, R4a)**
- `scripts/design-system.test.mjs` (new)

**Site copy (R13–R18)**
- `docs/references/profile.md`: the AI workflow line in Summary
- `src/components/home/Hero.astro`: the title and lede
- `src/components/home/Range.astro`: the paragraph
- `src/site.ts`: `description`

**Pointers and notes (R4, R20)**
- `CLAUDE.md`: Commands and Conventions lines, and `docs/design-system/` in the Architecture summary
- `README.md`: project layout table rows for `docs/design-system/` and the preview page
- `.claude/skills/write-spec/SKILL.md`: step 2's standards list
- `docs/intents/2026-10-redesign/spec.md`: update notes under §7.1, §7.3 and §7.4
- `docs/intents/2026-10-design-system-copy/plan.md`: this file (status and departures)

**Outside the repo (R5):** the design system artifact's last revision, after step 7.

## Order of work

1. **Move the design system in, as it is.** Read every file listed above from the artifact. Write `README.md`, `tokens.json` and the 12 component READMEs to `docs/design-system/` with no content edits, except paths: asset paths in the README point to `static/public/logo.svg`, `static/public/favicon.svg`, `static/public/logo@2x.png` and `src/assets/pixel-art/achievement-icons.svg`, and the two asset READMEs are folded into Iconography. Replace `tokens.json`'s `meta` with `{"source": "docs/design-system", "synced": "2026-10-04", "paths": <kept>}`. A move with no edits keeps step 2's diff readable.
2. **Make the design system the source, and allow gamified copy.** All the edits in spec [Design system edits](spec.md#design-system-edits): the README's top line, Gamified copy section, examples table row, `color-accent` rule, Components line, the Button and AchievementRow READMEs, and the `hero-title` sample in `tokens.json` (the new hero title, plain text).
3. **Add the previews.** For each component, write `preview.html` from the artifact preview's `<body>` contents, without the doctype, `<head>`, fonts or inline `body` padding. Then edit:
   - **Button:** the primary label becomes "Press start".
   - **AchievementRow:** the spec's three example rows. Icons become the site's markup: `<span class="achievement__icon"><svg class="pixel-art" viewBox="<16 × cell> 0 16 16" width="48" height="48" aria-hidden="true" focusable="false"><use href="#achievement-icons"/></svg></span>`, with cells 4 (rocket) for Night Owl, 9 (book) for Lore Keeper, and 3 (hammer) for Spring Cleaning. The locked row adds the lock as a second `<svg class="achievement__lock pixel-art">` at cell 1, copied from `src/components/AccomplishmentRow.astro`. The open row's panel uses the spec's plain title.
   - **Navigation and Footer:** `aria-label="Example navigation"` and `aria-label="Example links"`, so the page's own landmarks keep unique names.
   - **All:** `href="#"` links stay. Check every example against R2 (no client, colleague or employer names).
4. **Add the preview page and test.**
   - `src/styles/variables.css`: add `--radius-chip: 6px;` beside the other radii.
   - `src/styles/design-system.css`: copy bundle.css lines 1136–1259 (`.brief` to `.rating--low`), with a header comment like `lab.css`'s saying only the preview page imports it.
   - `src/pages/design-system.astro`: `BaseLayout` with `title="Design system previews"` and `noindex`, a `PageHead`, and `<AchievementIcons />` once. Load the previews with `import.meta.glob('../../docs/design-system/components/*/preview.html', { query: '?raw', import: 'default', eager: true })`. Render one `<section>` per component in the README's Components order (Button, Pill, Navigation, Footer, PageHead, Card, Pagination, AchievementRow, CodeBlock, Prose, DecisionBrief, Register), with an `h2` of the name, a link to its README on GitHub (`https://github.com/jlawcordova/jlawcordova.github.io/blob/main/docs/design-system/components/<Name>/README.md`), and the markup through `set:html`. A component missing from the order list goes at the end, so a new one still shows.
   - `scripts/design-system.test.mjs`: (a) every `docs/design-system/components/<Name>/` has both `README.md` and `preview.html`; (b) for every token in `tokens.json`'s `color`, `radius`, `spacing`, `shadow` and `layout` families whose name has a `--<name>` in `variables.css`, the values match, ignoring case and whitespace. Use the first definition outside `@media`, and skip CSS values containing `var(`. (c) `tokens.json` parses, and every token name is unique.
5. **Rewrite the site copy.** Add the profile line first, then the spec's [Site copy](spec.md#site-copy) table, word for word: `Hero.astro` (title, keeping `<span class="accent">` around "to production."; lede), `Range.astro` (paragraph), `site.ts` (`description`).
6. **Point the repo at the design system.** The spec's [Updates elsewhere](spec.md#updates-elsewhere): CLAUDE.md, README.md, the `write-spec` skill and the redesign spec notes. Also add `docs/design-system/` to CLAUDE.md's Architecture summary.
7. **Verify** (see Proof), take the screenshots, and record any departures in this file.
8. **Retire the artifact** (R5). Publish one revision to it with the README, Button and AchievementRow edits from step 2, the Button and AchievementRow previews from step 3 (with their artifact icon markup kept, since the site sheet isn't there), the top line "Retired. The source of truth is `docs/design-system/` in the site's repository.", and a `lastChange` note saying it's retired. Read it back. Put the revision's link in the PR description, not in the repo, because the artifact is private.

## Risks

- **The build can't read `docs/` (C3).** This is the riskiest step. Vite allows imports from anywhere inside the project root, and `docs/` is inside it, so the glob should work in both `astro dev` and `astro build`. Step 4 checks it first: if the page renders no previews, or the build fails, move the previews to `src/design-system-previews/<Name>.html`, leave a README note in `docs/design-system/` pointing there, have the test check both places, and record it under Departures.
- **Preview CSS bleeding onto the site.** `design-system.css` is imported only by the preview page, and its classes (`.brief`, `.register`, `.rating`) are used nowhere else. `--radius-chip` is new and unused by existing rules, so adding it changes nothing on the site.
- **Previews breaking the page layout.** The Navigation preview's `site-header` is sticky on the site, and the artifact preview already sets `position:static`. Keep that inline style. The Footer preview uses `.site-footer` inside `main`. Check both in the 390px screenshot.
- **Wrong icon cells.** The cells come from the sheet order in `src/lib/achievement-icons.mjs` (`SHEET_ORDER`). The test doesn't check them, so the screenshot does.
- **Longer text.** The hero lede and Range paragraph grow by 4 and 6 words (R19). The 390px screenshots confirm at most one extra line and no horizontal scroll.
- **Token drift found by the new test.** The artifact's tokens were read from `variables.css` on 2026-10-04, so they should match. If the test fails, fix `tokens.json` to the CSS value, which is the value the site ships, and note it.
- **Public safety (R2).** Everything under `docs/design-system/` becomes public. Before committing, search it for "Netzon" and for any real-looking client or person name. The examples use "Finance", "Data team" and "J. Law" only.

**Not chosen:** committing `bundle.css` and rendering the previews in an iframe with it. That keeps a second copy of the site's CSS that can drift, while the site's own CSS shows exactly what ships.

## Proof

Run and paste in the PR:

- `npm test`: `# fail 0`, including `design-system.test.mjs`.
- `npm run build`: `- 0 errors`, `- 0 warnings`, `- 0 hints` and `[build] Complete!`. Then `grep -c 'noindex' dist/design-system/index.html` is 1, and `grep -c '<section' dist/design-system/index.html` is at least 12.
- `npm run e2e`: `# fail 0` (nothing tests the copy, but the Range and accomplishments suites must still pass).
- `grep -rn "Netzon" docs/design-system/` finds nothing.
- `grep -rn "whole products\|handoffs\|judgment stays" src/` finds nothing.
- Screenshots at 1440px and 390px, before and after: the home page's hero and Range sections, and the whole `/design-system/` page. Each shows no horizontal scroll. Every preview renders, the icons in the AchievementRow preview are the rocket, book and hammer (with a lock), and DecisionBrief and Register are styled.
- The artifact's README, read back after step 8, starts with the retirement line.
