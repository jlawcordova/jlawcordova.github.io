# Plan: Gamified accomplishments (from intent.md 2026-10-03)
Status: done for the site, 2026-10-04: built in [#56](https://github.com/jlawcordova/jlawcordova.github.io/pull/56), [#60](https://github.com/jlawcordova/jlawcordova.github.io/pull/60) and [#61](https://github.com/jlawcordova/jlawcordova.github.io/pull/61). The atproto side (lexicon, `update`, skill, migration) merged in `jlawcordova-atproto` #21 and #22. R4, R10, R11, R15 and R18 need real runs of the `accomplishments` skill and are tracked in that repo's sub-intent.

Plans [`spec.md`](spec.md) (R1–R21, D1–D7). The work is in two repos, so the order below says which repo each PR is in. Every merge to `master` deploys this site, and the Worker deploys on merge to `jlawcordova-atproto`, so each PR leaves both deployable. Paths without a repo name are in this repo; `atproto:` paths are in `jlawcordova-atproto`.

## Files that change

**PR 1, this repo: the icons and their IDs**

- `src/assets/pixel-art/source/objects/icon-<id>.mjs` (new): 16 icons plus `star` (the fallback) and `lock`. The engine reads `objects/` flat, so the names carry an `icon-` prefix and there is no `icons/` folder.
- `src/assets/pixel-art/source/scenes/achievement-icons.mjs` (new) and `src/assets/pixel-art/achievement-icons.svg` (new, generated): the sheet.
- `src/lib/achievement-icons.mjs` (new): the icon IDs with a meaning line each, the fallback and lock, and the sheet order. It is plain `.mjs` with `// @ts-check` like the other shared libs, so the Node tests can import it.
- `src/pages/achievement-icons.json.ts` (new): publishes `/achievement-icons.json`.
- `.claude/skills/achievement-icon/SKILL.md` (new); `.claude/skills/pixel-art/SKILL.md` gets a pointer to it.
- `scripts/pixel-art-engine.test.mjs` and a new `scripts/achievement-icons.test.mjs`: every icon is within the caps and listed, the list and the JSON agree.
- `CLAUDE.md`, `README.md`: the new folder, skill and route.

**PR 2, `jlawcordova-atproto`: everything on that side**

- `lexicons/com/jlawcordova/profile/accomplishment.json`: add `funTitle`, `shortDescription`, `icon` (with the 16 IDs from PR 1 as `knownValues`) and `done`; drop `startDate` from `required`.
- `shared/src/index.ts`: the new fields on `Accomplishment`; the extra rules (startDate required unless `done: false`; a locked record has no dates; new writes require the three new fields; `funTitle` is one to three words; `shortDescription` is five to seven); a way to tell a new write from a read. `shared/test/accomplishment.test.ts`: a test per rule.
- `jlawcordova-mcp/src/accomplishments.ts`: `updateAccomplishment` (getRecord, merge, validate, `putRecord` with `swapRecord`, rebuild); `addAccomplishment` carries the new fields.
- `jlawcordova-mcp/src/api.ts`: `PATCH /api/accomplishments/<rkey>`; the new fields join `ADD_FIELDS`; the item route's 405 message lists `DELETE, PATCH`.
- `jlawcordova-mcp/src/tools.ts`: the new fields on `add_accomplishment` and a new `update_accomplishment` tool. Tests in `jlawcordova-mcp/test/api.test.ts` and `tools.test.ts`.
- `jlawcordova-cli/src/cli.ts`: `accomplishments update <rkey>` (JSON patch on stdin), usage text, tests in `jlawcordova-cli/test/cli.test.ts`. `docs/cli-setup.md` mentions it.
- `.claude/skills/accomplishments/SKILL.md` and `README.md`: drafting with the new fields, the voice, locked accomplishments, marking done, stale cleanup, de-duplication (D7). `.claude/settings.json` is unchanged.
- `scripts/migrate-gamified-accomplishments.mjs` (new, removed after it has run).
- `docs/intents/2026-10-gamified-accomplishments/intent.md` and `spec.md` (new): a sub-intent for PR 2, and a row in `docs/intents/README.md`, because that repo starts all work from an intent folder and records test progress in it. The intent links this repo's intent, spec and plan for the why and the contracts (D1, D2, D7) rather than copying them; where they disagree, this repo's intent wins. Its spec fills in what's left there (`shared`'s read and write modes, where locked records sort and how `list --since` treats them, `PATCH` status codes, the migration's input file) and owns PR 2's acceptance tests and build order (one commit per step).
- `jlawcordova-cli/package.json`: version 1.1.0, released with a `cli-v1.1.0` tag after the merge, so the installed CLI and the skill zip have `update`.

**PR 3, this repo: the site**

- `scripts/fetch-accomplishments.mjs`, `scripts/fetch-accomplishments.test.mjs`: the new fields, locked records, ordering, `createdAt` kept.
- `src/lib/accomplishments.ts`: new fields, the `done`/`locked` split, `rowFor`. `src/lib/pagination.ts`, `src/site.ts`: generalised `paginate` and `accomplishmentsPerPage: 12`.
- `src/lib/accomplishment-list.mjs` (new) and `scripts/accomplishments.test.mjs` (new): the logic behind `accomplishments.ts` (reading the file into `done` and `locked`, `rowFor`, `formatDateRange`, and `homeSelection` for R5, R6 and R8: the three newest done, the newest locked, whether "Show more" is needed), in plain `.mjs` with `// @ts-check` so the Node tests can import it. `accomplishments.ts` feeds it the JSON and re-exports it with its types. The tests also check the fixtures below.
- `src/lib/paginate.mjs` (new) and `scripts/pagination.test.mjs` (new): the generalised `paginate(items, perPage)` and `pagePath(base, n)`, in plain `.mjs` with `// @ts-check` so the Node tests can import them (Node can't load `pagination.ts`'s extensionless import of `site`). `pagination.ts` re-exports them, and `BlogPage.astro` takes the generic page shape. The blog's built pages are unchanged.
- `src/components/BlogPage.astro`, `src/pages/blog/index.astro` and `src/pages/blog/[page].astro`: changed for the shared `paginate`. `BlogPage.astro` takes `Page<Post>` and builds its links with `pagePath`, and the two blog routes pass `site.postsPerPage` as the page size. The blog's built pages are unchanged.
- `src/components/AccomplishmentRow.astro` (new), `AccomplishmentCard.astro` (deleted), `AchievementIcons.astro` (new), `Accomplishments.astro` (the home section with the "Show more" button).
- `src/pages/accomplishments/index.astro`, `src/pages/accomplishments/[page].astro` (new) and `src/components/AccomplishmentsPage.astro` (new).
- `src/styles/accomplishments.css`: rewritten, including the tooltip.
- **As built (PR 3's UI):** the Escape script is inline in `AchievementIcons.astro`, since that component is rendered once on every page with rows. The tooltip appears after a 0.3 s delay, so it doesn't pop up over the next row while the pointer only passes over the list. The `/accomplishments/` label counts done accomplishments only, as the pages do ("30 accomplishments · Page 1 of 3"). **Owner-decided:** with no done accomplishments (only locked ones), the page has no label at all, rather than "0 accomplishments · Page 1 of 1"; `PageHead` then renders no label element, so there's no gap above the title. This also settles the spec's open point about the D4 label: it counts done accomplishments only and is left out when that count is 0, which spec D4's "Page content" bullet now records. Without data (the `"unavailable"` placeholder, or no records), `/accomplishments/` still builds, with a short note and a link home, and there are no pages 2+. The page isn't in the main nav (the home section's "Show more" links to it), and the site has no sitemap.
- `scripts/fixtures/accomplishments.json` (new) and `scripts/e2e/accomplishments.e2e.mjs` (new). The proof's three fixtures are three files: `accomplishments.json` (30 done, 3 locked), `accomplishments-two-done.json` and `accomplishments-unavailable.json`, plus `accomplishments-locked-only.json` (2 locked, none done) for the hidden count above, all in the shape the fetch script writes and with invented, public-safe text only.
- **As built (the e2e, a departure):** `npm run e2e` serves one `dist/`, but the proof needs several datasets (four, with the locked-only one), so `accomplishments.e2e.mjs` builds its own instead of using `dist/`. Before its checks it copies each fixture over `src/data/accomplishments.json` in turn, runs `astro build --outDir .e2e-output/accomplishments/<variant>/` (about a second each, no `astro check`), and writes the original file back byte for byte straight after, also on a failed build and on SIGINT/SIGTERM. It serves each variant with a small `node:http` static server. If a build fails, doesn't pick up its fixture, or the file isn't restored, every check in the suite fails, so it can't pass without running. The runner and the other suites are unchanged, and `npm run build && npm run e2e` still checks the placeholder build. Running `npm test` at the same time can see a fixture in place of the placeholder.
- `README.md`, `CLAUDE.md`: the routes, components and the fixture/restore note.

## Order of work

Three PRs, in this order, then the migration run and a small cleanup. Each leaves the site and the Worker working on their own.

1. **PR 1: the icons and their IDs (this repo).** Start with `star`, `lock` and `rocket` as a pilot, together with the sheet, `achievement-icons.mjs`, `/achievement-icons.json`, the `achievement-icon` skill and their tests, and show the previews to the owner to approve the style before drawing the other 15. Nothing on a page uses them yet, so the deployed site doesn't change. Merging fixes the 16 icon IDs the lexicon needs and publishes the list the skill reads.
2. **PR 2: all the `jlawcordova-atproto` changes.** Lexicon, `shared`, Worker, MCP, CLI, the skill, the migration script and the intent pointer. Merging deploys the Worker. Old records and the site are unaffected, because every new field is optional on read. It needs PR 1 deployed so the skill can read the icon list.
3. **PR 3: the site.** The data layer, the row, the home section, the tooltip script, the paginated `/accomplishments/` pages, the styles, the fixture, e2e and docs. Until records have the new fields, rows fall back to the plain title and the star, so it can merge before or after the migration.
4. **Run the migration (the owner, after PR 2 is deployed).** Claude drafts suggestions through the skill, the owner approves them in the selector, the dry-run output is reviewed, then `--write` runs once. Claude records the output in PR 2's Verification section.
5. **Clean-up commit (`jlawcordova-atproto`).** Delete the migration script and its test, mark the atproto sub-intent and its spec **Closed**, and update that repo's index. Then set `Status: done` on this repo's intent, spec and plan.

PR 1 comes first because the lexicon's `knownValues` and the skill both need the icon IDs. PR 3 doesn't depend on PR 2 to merge, but its real data does.

**PR 3 status.** PR 3 delivers the whole site side: the data layer, the rows, the home section, the tooltip, the `/accomplishments/` pages, the styles, and the unit and browser checks for R1–R3, R5–R9, R13, R17 and R20, proven against the invented fixtures. It was opened as a draft until PR 2 merged and the migration ran. Both are now done (`jlawcordova-atproto` #21 and #22), and the rest is settled:

- **The real records (2026-10-04).** `npm run fetch-accomplishments` wrote 9 items, the same 9 the live site shows. Every one has a fun title, a short description and one of the 16 icons, and none is locked. Built with them, the home page shows 3 done rows and "Show more", and `/accomplishments/` lists all 9 ("9 accomplishments · Page 1 of 1") with no horizontal scroll at 1440px or 390px. The data file was then restored to the placeholder.
- **R16 (the migration)** is proven in `jlawcordova-atproto` #22: the owner approved the dry run, `--write` updated all 9 records with only their three new fields, and a second dry run found nothing left.
- **R10, R11, R4, R15 and R18** are atproto-side and need real runs of the `accomplishments` skill (that repo's S1, S3–S6). They aren't verified yet, and they don't block this PR: the site renders whatever the skill writes, locked records included, as the fixtures prove.

## Risks

- **Riskiest: PR 2's schema change.** The Worker validates every write, and the site's fetch drops a record that fails its own check. A bug could drop records from the site. Handled by keeping every new field optional on read, a test that today's real records still validate and parse (the nine records fetched while writing the spec, saved as a fixture without any private text), and checking the live site's build after the PR 2 deploy shows the same count.
- **`putRecord` replaces the whole record.** A merge bug could silently drop tags or links. Handled by a test that a patch of one field leaves all others byte-for-byte equal, and by `swapRecord`.
- **Staleness depends on `createdAt`.** It must survive an `update`. Tested explicitly. Also the fetch script keeps `createdAt` on items now, where it used to strip it.
- **Icons are small and subjective (spec C6).** Handled by the pilot icons in PR 1, previews of every icon, and the sheet's budget check (6 KB gzip). If the sheet goes over, fall back to inlining only used icons.
- **Page weight and the JS budget.** Measured in PR 3 against the redesign spec's budgets (spec C2).
- **The `<use>` crop trick.** Cropping one icon from a shared sheet with `viewBox` must work in the browsers the site supports and when the hidden SVG is `display:none` (some browsers don't render `<use>` from a `display:none` SVG). Handled by hiding it with `width: 0; height: 0; position: absolute` instead, and checked in the e2e screenshots. If it still fails, each row inlines its own icon.
- **Tooltip accessibility (WCAG 1.4.13).** The e2e checks that the pointer can enter the tooltip, that Escape closes it and that it never shows on touch emulation.
- **Cross-repo ordering (spec C5).** Written into the order above: icons first, then the Worker and skill, then the site. The skill can't read the icon list before PR 1 is deployed. The site tolerates records without the new fields, so PR 3 can't break on a different merge order.
- **One large PR 2.** The Worker, CLI, MCP, skill and migration land together, as asked. Handled by keeping each change in its own commit, tests per rule, and the proof below, so review can go commit by commit.
- **Public data.** Fixtures contain invented text only. The migration's suggestions are public as soon as they're written, so the owner approves every one first. No record text from private work goes into a commit or PR.
- **Another option, not chosen:** a separate goals collection (the intent rejected it), and one inline SVG per row (heavier, so the shared sheet won).

## Proof

Run in each repo as it applies, and paste the output in the PR.

- **PR 2, `atproto`:** the acceptance tests in that repo's `docs/intents/2026-10-gamified-accomplishments/spec.md`, recorded in its intent and PR as they pass. In short: `npm test` and `npm run typecheck` pass. Tests are named for the rule they check. After the PR deploys: `accomplishments list --limit 100` returns all existing records, and `accomplishments update <rkey>` on a throwaway record changes one field and leaves the rest equal (then that record is deleted).
- **PRs 1 and 3, this repo:** `npm test` shows `# fail 0`; `npm run build` ends with `- 0 errors`, `- 0 warnings`, `- 0 hints` and `[build] Complete!`; `npm run art` reports every file `lossless` and none `OVER BUDGET`; `npm run e2e` shows `# fail 0`.
- **Icons (PR 1):** `npm run art -- --check <name>` passes for each, the 1× and 4× previews are attached, and the sheet is at most 20 KB raw and 6 KB gzip.
- **Requirements to checks:**
  - R1, R9: fixture build; e2e reads a done row's icon, fun title, short description and right-hand date, and a locked row's "Not done yet", locked mark and absence of a `<details>`.
  - R2: e2e finds the h2 "What I've been working on lately" and no "Achievements unlocked".
  - R3: e2e clicks a row (expands, shows plain title, description, tags, links), presses Enter and Space, hovers with a mouse (tooltip with the description and no links), moves the pointer onto the tooltip (stays), presses Escape (closes), and emulates touch (no tooltip).
  - R4, R15, R18: skill review in PR 2, with sample drafts attached to the PR (words counted, no joke that needs explaining).
  - R5, R6, R8: e2e with three fixtures: many records (three done, one locked, button present), two done and none locked (no locked row, no button), and the `"unavailable"` placeholder (no section).
  - R7: e2e with 30 fixture records: page 1 has 12 rows plus the locked list, `/accomplishments/page3/` has the rest, and there are no locked rows on pages 2+.
  - R10, R11: atproto tests for update/mark done; a skill run after PR 2 lists a locked record older than 14 days and asks before deleting.
  - R12, R13: the icon tests (caps, world palette, no legacy colors) and an e2e row with an unknown icon name that shows the star.
  - R14: the `achievement-icon` skill is followed to add the pilot icons in PR 1.
  - R16, R17: the migration dry-run output (step 4), then `--write`, then `accomplishments list` shows all records with the new fields; and a fixture record with none of them renders.
  - R19, R21: review of the rendered pages and records for points, rarity, progress and anything non-public.
  - R20: screenshots of the home section and the full-list page at 1440px and 390px with `scrollWidth <= innerWidth`, keyboard-only walkthrough, `prefers-reduced-motion` check, 44px targets.
- **Weight:** gzip sizes of the home page's HTML and CSS and of the sheet, measured from `dist/`, reported against the budgets in spec C2.
- **Fixtures:** after building with fixture data, `git checkout src/data/accomplishments.json` restores the placeholder before committing, as `CLAUDE.md` requires.
