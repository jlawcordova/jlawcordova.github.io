# Plan: Gamified accomplishments (from intent.md 2026-10-03)
Status: draft.

Plans [`spec.md`](spec.md) (R1–R21, D1–D7). The work is in two repos, so the order below says which repo each PR is in. Every merge to `master` deploys this site, and the Worker deploys on merge to `jlawcordova-atproto`, so each PR leaves both deployable. Paths without a repo name are in this repo; `atproto:` paths are in `jlawcordova-atproto`.

## Files that change

**`jlawcordova-atproto`**

- `lexicons/com/jlawcordova/profile/accomplishment.json`: add `funTitle`, `shortDescription`, `icon`, `done`; drop `startDate` from `required`.
- `shared/src/index.ts`: add the fields to `Accomplishment`; the extra rules (startDate required unless `done: false`; a locked record has no dates; new writes require the three new fields; `funTitle` is one to three words; `shortDescription` is five to seven); a `validateAccomplishment` option to tell a new write from a read.
- `shared/test/accomplishment.test.ts`: tests for each rule.
- `jlawcordova-mcp/src/accomplishments.ts`: `updateAccomplishment` (getRecord, merge, validate, `putRecord` with `swapRecord`, rebuild); `AddInput` and `addAccomplishment` carry the new fields.
- `jlawcordova-mcp/src/api.ts`: `PATCH /api/accomplishments/<rkey>`; the new fields join `ADD_FIELDS`; the 405 message for the item route lists `DELETE, PATCH`.
- `jlawcordova-mcp/src/tools.ts`: the new fields on `add_accomplishment`; a new `update_accomplishment` tool.
- `jlawcordova-mcp/test/api.test.ts`, `tools.test.ts`: tests for update (merge, null removes a field, stale CID refused, not found, bad rkey, unknown field) and for the new add fields.
- `jlawcordova-cli/src/cli.ts`: `accomplishments update <rkey>` (JSON patch on stdin); usage text; `jlawcordova-cli/test/cli.test.ts`.
- `docs/cli-setup.md`: mention `update`.
- `.claude/skills/accomplishments/SKILL.md`, `README.md`: drafting, locked, mark done, stale and de-duplication changes (D7). `.claude/settings.json` is unchanged: `update`, `add` and `delete` keep prompting.
- `scripts/migrate-gamified-accomplishments.mjs` (new, deleted in the last step).
- `docs/intents/2026-10-gamified-accomplishments/intent.md` (new): a short pointer to this repo's intent, spec and plan, plus a row in `docs/intents/README.md`, because that repo's `CLAUDE.md` starts every piece of work from an intent folder.

**This repo**

- `src/assets/pixel-art/source/objects/icons/*.mjs` (new): 16 icons plus `star` and `lock`.
- `src/assets/pixel-art/source/scenes/achievement-icons.mjs` (new) and `src/assets/pixel-art/achievement-icons.svg` (new, generated).
- `src/lib/achievement-icons.ts` (new): the ordered list of icon names and meaning lines, with the fallback and lock.
- `src/pages/achievement-icons.json.ts` (new): publishes `/achievement-icons.json`.
- `src/components/AchievementIcons.astro` (new): inlines the sheet once per page.
- `src/components/AccomplishmentRow.astro` (new), `AccomplishmentCard.astro` (deleted).
- `src/components/Accomplishments.astro`: the home section.
- `src/pages/accomplishments/index.astro`, `src/pages/accomplishments/[page].astro` (new), and `src/components/AccomplishmentsPage.astro` (new): the full list, like `BlogPage.astro`.
- `src/lib/accomplishments.ts`: new fields, `done`/`locked` split, `rowFor`.
- `src/lib/pagination.ts`, `src/site.ts`: generalise `paginate` and add `accomplishmentsPerPage: 12`.
- `scripts/fetch-accomplishments.mjs` and `scripts/fetch-accomplishments.test.mjs`: the new fields, locked records, ordering.
- `src/styles/accomplishments.css`: rewritten.
- `.claude/skills/achievement-icon/SKILL.md` (new); `.claude/skills/pixel-art/SKILL.md` (a pointer to it and the icon folder).
- `scripts/pixel-art-engine.test.mjs`: icons are within the caps and listed in `achievement-icons.ts`; a new `scripts/achievement-icons.test.mjs` for the list and the JSON.
- `scripts/fixtures/accomplishments.json` (new) and `scripts/e2e/accomplishments.e2e.mjs` (new): browser checks against fixture data.
- `README.md`, `CLAUDE.md`: the new routes, folder, skill and the fixture/restore note.

## Order of work

Each step is one PR. The numbers are the order to merge in; steps marked "parallel" can be built while another is in review.

1. **`atproto`: record and `update`.** Lexicon, `shared`, Worker (`update`, new add fields), MCP tool, CLI and tests, plus the intent pointer. Merging deploys the Worker. Old records and the site are unaffected, since every new field is optional on read.
2. **Site: icon infrastructure.** The `achievement-icon` skill, `icons.ts`, the sheet scene, `AchievementIcons.astro`, `/achievement-icons.json`, and three icons: `star` (the fallback), `lock` and one real icon (`rocket`) to prove the style. Nothing on a page uses them yet, so the deployed site is unchanged. The owner approves the 1× and 4× previews before the rest are drawn.
3. **Site: data layer, row and home section.** `fetch-accomplishments`, `lib/accomplishments.ts`, `AccomplishmentRow`, `Accomplishments.astro`, the CSS, the tooltip script, the fixture and e2e. Until step 1's fields exist on records, every row falls back (plain title, star), and the "Show more" button links to a page that step 4 adds, so this PR hides the button until step 4 (a flag in `Accomplishments.astro`, removed in step 4).
4. **Site: the full-list page.** Routes, `AccomplishmentsPage.astro`, pagination generalisation, the "Show more" button, e2e for the page.
5. **Site: the remaining icons, in two PRs (parallel with 3 and 4).** Seven icons each, so the previews stay reviewable: first `sprout`, `hammer`, `wrench`, `shield`, `key`, `cog`, `book`; then `magnifier`, `flask`, `watering-can`, `heart`, `compass`, `chest`, `trophy`, `lantern`. Each PR updates the sheet, `icons.ts` and the previews.
6. **`atproto`: the skill.** Drafting with the three new fields, the voice, locked accomplishments, marking done, stale cleanup, de-duplication (D7). It reads `/achievement-icons.json`, so it ships after steps 2 and 5 are deployed.
7. **`atproto`: the migration script.** It ships with a dry-run by default and `--write`. It is never merged into a shape that writes without the flag.
8. **Run the migration (the owner).** Claude drafts suggestions through the skill, the owner approves in the selector, the dry-run is reviewed, then `--write` runs once. Claude records the output in the PR.
9. **Clean up.** Delete the migration script (atproto); remove the "Show more" flag if it is still there; set `Status: done` on the intent, spec and plan; update the READMEs. The site then renders the real fun titles and icons.

Steps 2 to 5 don't need step 1, so they can start at once. Step 3's real data needs step 8.

## Risks

- **Riskiest: step 1's schema change.** The Worker validates every write, and the site's fetch drops a record that fails its own check. A bug could drop records from the site. Handled by keeping every new field optional on read, a test that today's real records still validate and parse (the nine records fetched while writing the spec, saved as a fixture without any private text), and checking the live site's build after the step 1 deploy shows the same count.
- **`putRecord` replaces the whole record.** A merge bug could silently drop tags or links. Handled by a test that a patch of one field leaves all others byte-for-byte equal, and by `swapRecord`.
- **Staleness depends on `createdAt`.** It must survive an `update`. Tested explicitly. Also the fetch script keeps `createdAt` on items now, where it used to strip it.
- **Icons are small and subjective (spec C6).** Handled by the pilot in step 2, previews in every icon PR, and the sheet's budget check (6 KB gzip). If the sheet goes over, fall back to inlining only used icons.
- **Page weight and the JS budget.** Measured in steps 3 and 4 against the redesign spec's budgets (spec C2).
- **The `<use>` crop trick.** Cropping one icon from a shared sheet with `viewBox` must work in the browsers the site supports and when the hidden SVG is `display:none` (some browsers don't render `<use>` from a `display:none` SVG). Handled by hiding it with `width: 0; height: 0; position: absolute` instead, and checked in the e2e screenshots. If it still fails, each row inlines its own icon.
- **Tooltip accessibility (WCAG 1.4.13).** The e2e checks that the pointer can enter the tooltip, that Escape closes it and that it never shows on touch emulation.
- **Cross-repo ordering (spec C5).** Written into the order above. The skill (step 6) can't run before the icons are live, or new records would show the fallback.
- **Public data.** Fixtures contain invented text only. The migration's suggestions are public as soon as they're written, so the owner approves every one first. No record text from private work goes into a commit or PR.
- **Another option, not chosen:** a separate goals collection (the intent rejected it), and one inline SVG per row (heavier, so the shared sheet won).

## Proof

Run in each repo as it applies, and paste the output in the PR.

- **`atproto`:** `npm test` and `npm run typecheck` pass. Tests are named for the rule they check. After step 1 deploys: `accomplishments list --limit 100` returns all existing records, and `accomplishments update <rkey>` on a throwaway record changes one field and leaves the rest equal (then that record is deleted).
- **This repo:** `npm test` shows `# fail 0`; `npm run build` ends with `- 0 errors`, `- 0 warnings`, `- 0 hints` and `[build] Complete!`; `npm run art` reports every file `lossless` and none `OVER BUDGET`; `npm run e2e` shows `# fail 0`.
- **Icons (steps 2 and 5):** `npm run art -- --check <name>` passes for each, the 1× and 4× previews are attached, and the sheet is at most 20 KB raw and 6 KB gzip.
- **Requirements to checks:**
  - R1, R9: fixture build; e2e reads a done row's icon, fun title, short description and right-hand date, and a locked row's "Not done yet", locked mark and absence of a `<details>`.
  - R2: e2e finds the h2 "What I've been working on lately" and no "Achievements unlocked".
  - R3: e2e clicks a row (expands, shows plain title, description, tags, links), presses Enter and Space, hovers with a mouse (tooltip with the description and no links), moves the pointer onto the tooltip (stays), presses Escape (closes), and emulates touch (no tooltip).
  - R4, R15, R18: skill review in step 6, with sample drafts attached to the PR (words counted, no joke that needs explaining).
  - R5, R6, R8: e2e with three fixtures: many records (three done, one locked, button present), two done and none locked (no locked row, no button), and the `"unavailable"` placeholder (no section).
  - R7: e2e with 30 fixture records: page 1 has 12 rows plus the locked list, `/accomplishments/page3/` has the rest, and there are no locked rows on pages 2+.
  - R10, R11: atproto tests for update/mark done; the skill run in step 6 lists a locked record older than 14 days and asks before deleting.
  - R12, R13: the icon tests (caps, world palette, no legacy colors) and an e2e row with an unknown icon name that shows the star.
  - R14: the `achievement-icon` skill is followed to add the pilot icon in step 2.
  - R16, R17: the migration dry-run output, then `--write`, then `accomplishments list` shows all records with the new fields; and a fixture record with none of them renders.
  - R19, R21: review of the rendered pages and records for points, rarity, progress and anything non-public.
  - R20: screenshots of the home section and the full-list page at 1440px and 390px with `scrollWidth <= innerWidth`, keyboard-only walkthrough, `prefers-reduced-motion` check, 44px targets.
- **Weight:** gzip sizes of the home page's HTML and CSS and of the sheet, measured from `dist/`, reported against the budgets in spec C2.
- **Fixtures:** after building with fixture data, `git checkout src/data/accomplishments.json` restores the placeholder before committing, as `CLAUDE.md` requires.
