# Spec: Gamified accomplishments (from intent.md 2026-10-03)
Status: approved.

Implements [`intent.md`](intent.md). Where they disagree, the intent wins and this spec gets fixed. The work spans two repos: this one (pages, icons, the icon skill) and `jlawcordova-atproto` (the record schema, the Worker, the CLI and the `accomplishments` skill). Paths without a repo name are in this repo.

## Requirements

Each requirement traces to the intent's Proposed outcome (PO) or Constraints (C).

**The list (PO: Steam-style list, heading, descriptions)**

- **R1.** Each accomplishment renders as a row: its icon on the left, then the fun title and the short description, and on the right the date it was accomplished (a month, such as "Sep 2026").
- **R2.** The section heading is "What I've been working on lately". "Achievements unlocked" no longer appears.
- **R3.** A done row expands on click, on tap, and with Enter or Space. Expanded, it shows the plain title, the full description, the tags and the links. On a device with a mouse, hovering a row (or focusing it with the keyboard) also shows the full description in a tooltip. The tooltip is a convenience: nothing, including the links, is reachable only through it, and it never appears on touch.
- **R4.** The short description is a five-to-seven-word summary. The fun title leads; the short description says plainly what was done, so the row still makes sense without the plain title.

**Home and full list (PO: short list, separate page)**

- **R5.** The home page shows the three most recent done accomplishments, then the newest locked one. Nothing else.
- **R6.** A "Show more" button on the home page links to the full-list page. It shows only when something isn't on the home page.
- **R7.** The full-list page lists every done accomplishment, newest first, and every locked one. It is paginated.
- **R8.** If there is no locked accomplishment, the home page shows no locked row. If the data is `"unavailable"` or empty, the section doesn't render, as today (C: placeholder unchanged).

**Locked accomplishments (PO: locked, stale)**

- **R9.** A locked accomplishment is an accomplishment that isn't done. It has no date, can't be opened or clicked, shows a locked mark on its icon, and says "Not done yet" in words where the date would be.
- **R10.** A locked accomplishment that is still not done 14 days after it was created is stale. When drafting, Claude lists stale ones and proposes deleting them. Nothing is deleted until the owner confirms. The site doesn't hide stale ones by itself.
- **R11.** The owner can add a locked accomplishment, mark it done (which gives it a date and makes it ordinary), and delete one, all through the `accomplishments` skill.

**Icons (PO: 16 icons, fallback, skill)**

- **R12.** There are 16 icons, built with the pixel-art engine as a new category (D5). They use only world-palette colors.
- **R13.** An accomplishment whose icon is missing or unknown shows the fallback icon.
- **R14.** A skill, `.claude/skills/achievement-icon/SKILL.md`, adds an icon in the same style.

**Drafting, saving and migration (PO: Claude suggests, existing records)**

- **R15.** When drafting, Claude suggests the fun title, short description and icon for each draft. The owner approves or edits them before anything is saved.
- **R16.** Every existing accomplishment gets a fun title, short description and icon through a one-off migration, approved by the owner, and the migration is then deleted.
- **R17.** Old records without the new fields still render until the migration runs.

**Constraints carried through**

- **R18.** Fun titles follow the Stardew Valley voice (C: playfulness), are never misleading, and the owner has the final say.
- **R19.** The page has no points, rarity, progress bars or percentages.
- **R20.** The new pages meet the site's rules: tokens only, no new dependencies, deterministic output, text carries meaning (icons are `aria-hidden`), reduced motion respected, visible focus, 44px targets, and no horizontal scroll at 390px.
- **R21.** Records stay public-safe, locked ones included (C: public-safe).

## Design

### D1. The record (`jlawcordova-atproto`)

`lexicons/com/jlawcordova/profile/accomplishment.json` gains four optional properties and loosens one:

| Property | Type | Rule |
| --- | --- | --- |
| `funTitle` | string | At most 60 graphemes. The playful name that leads the row. New writes also require one to three words (see below). |
| `shortDescription` | string | At most 80 graphemes. The five-to-seven-word summary. |
| `icon` | string | At most 32 graphemes, lowercase kebab-case (for example `rocket`). The lexicon lists the 16 names as `knownValues`, which doesn't reject others. |
| `done` | boolean | Default `true`. `false` means locked. |

- `title`, `description` and `createdAt` stay required. `title` and `description` keep their meaning (plain headline, full description), and show in the opened row.
- `startDate` is no longer required by the lexicon. `shared/src/index.ts` adds the rule: `startDate` is required unless `done` is `false`, and a locked record must have no `startDate` or `endDate`.
- **New writes are stricter than the lexicon.** `add` and `update` also require `funTitle`, `shortDescription` and `icon`. Reads and the site tolerate their absence, which is what keeps old records valid (R17). Lexicon evolution rules forbid adding required fields later, so the strictness lives in `shared`, not in the lexicon.
- Old records have no `done`, so they count as done.
- `shared` adds the rules that a `funTitle` is one to three words, and a `shortDescription` five to seven. They apply to new writes only, like the required fields.

### D2. Operations in the Worker, CLI and MCP (`jlawcordova-atproto`)

There is no way to change a record today (`list`, `add`, `delete` only). Marking a record done and the migration both need one, so this adds `update`:

- `jlawcordova-mcp/src/accomplishments.ts`: `updateAccomplishment(rkey, patch)`. It reads the record, merges the patch (fields set to `null` are removed), validates the result with `shared`, keeps `createdAt` and the rkey, and writes with `com.atproto.repo.putRecord`, passing the record's CID as `swapRecord` so a concurrent change fails instead of overwriting. It triggers the portfolio rebuild like `add`.
- `jlawcordova-mcp/src/api.ts`: `PATCH /api/accomplishments/<rkey>` with a JSON body, next to the existing `DELETE`.
- `jlawcordova-cli/src/cli.ts`: `accomplishments update <rkey>`, reading the patch as JSON on stdin, printing the updated record like `add` does.
- `jlawcordova-mcp/src/tools.ts`: an `update_accomplishment` tool wrapping the same function. MCP output for the other tools doesn't change.
- `list` already returns `createdAt`, which the skill needs for staleness (R10).

### D3. Fetching and data (this repo)

`scripts/fetch-accomplishments.mjs` (`toItem`, `compareItems`):

- Accepts a record with no `startDate` only when `done` is `false`. Everything else still must have a valid `startDate`, as today.
- Copies `funTitle`, `shortDescription`, `icon` (each only when a non-empty string) and `done` (a boolean, `true` when absent) into the item. It keeps `createdAt` on every item.
- `compareItems` is unchanged for done items. Locked items sort by `createdAt`, newest first.
- The committed `src/data/accomplishments.json` stays the `"unavailable"` placeholder.

`src/lib/accomplishments.ts` (`getAccomplishments`) returns `{ status, done, locked }` instead of one `items` array, both newest first. `done` is the new field on `Accomplishment`, plus the optional `funTitle`, `shortDescription` and `icon`. `formatDateRange` is used for done items only. A small helper `rowFor(item)` returns what to show: `funTitle ?? title` as the lead, `shortDescription` (or nothing), and the icon name (or the fallback).

### D4. Pages and components (this repo)

- **`src/components/AccomplishmentRow.astro`** replaces `AccomplishmentCard.astro`. It renders a `<li class="achievement">`.
  - A done row is a `<details>`. Its `<summary>` is the visible row: icon, fun title, short description, date. The opened panel holds the plain title, the full description, the tags and the links, with the markup and 44px link targets `AccomplishmentCard` has today.
  - A locked row is a plain `<li>` with the same layout, no `<details>`, a locked mark over the icon and "Not done yet" in the date slot.
  - A row with no `funTitle` leads with the plain title and has no short-description line.
- **Expand and tooltip (R3).** A done row is a native `<details>`, so click, tap, Enter and Space work without JavaScript. On hover-capable devices only (`@media (hover: hover) and (pointer: fine)`), hovering the summary or focusing it shows a tooltip beneath the row with the full description, written as `role="tooltip"` and linked by `aria-describedby`. It follows WCAG 1.4.13: the pointer can move onto it without it closing, it stays until the pointer or focus leaves, and Escape dismisses it. It's hidden while the row is expanded, and it holds text only (no links or tags), so nothing depends on it. It is CSS, plus a script of about 0.2 KB for Escape. The list doesn't shift, because the tooltip floats over what's below.
- **`src/components/Accomplishments.astro`** is the home section: the h2 "What I've been working on lately" (keeping `id="accomplishments"`), three done rows, the newest locked row, and a ghost button "Show more" to `/accomplishments/` (R6). The `<p class="label">` is dropped.
- **Routes.** `src/pages/accomplishments/index.astro` (page 1) and `src/pages/accomplishments/[page].astro` (pages 2+, `/accomplishments/page2/`), mirroring the blog's routes and its `paginate`/pagination nav. `lib/pagination.ts` is generalised to take the page size and not just posts. `site.ts` gains `accomplishmentsPerPage: 12`.
- **Page content.** Title "Accomplishments", via `PageHead` with a label such as "9 accomplishments · Page 1 of 1". Page 1 lists its 12 done rows, then, only on page 1, a labeled "Not done yet" list with every locked row. Pages 2+ have no locked rows.
- **Styles.** `src/styles/accomplishments.css` is rewritten for the row layout: a single column list, icon 48px, tokens only, the date right-aligned (stacked under the title below 480px). Locked rows dim the icon, not the text, so text contrast is unchanged. Opening is a grid-row transition that `prefers-reduced-motion` turns off.

### D5. The icons (this repo)

- **Where they live.** Sprite objects `src/assets/pixel-art/source/objects/icon-<name>.mjs` (the engine reads `objects/` flat, so the name carries a prefix), each 16×16, at most 12 colors (aim for 6–8), world palette only, no legacy colors. They're flat (front-on) pictures, not isometric, lit from the upper left so the shading matches the world's top-light, left-mid, right-shadow rule.
- **The sheet.** One scene, `scenes/achievement-icons.mjs`, places all 18 icons in a row on a 16px grid, each in a group with `data-icon="<name>"`, and writes `achievement-icons.svg`. A component, `AchievementIcons.astro`, inlines it once per page inside a hidden `<svg>` as a `<g id="achievement-icons">`. A row draws its icon with `<svg viewBox="<16 × index> 0 16 16"><use href="#achievement-icons"/></svg>`, so each page carries the art once however many rows it has. The icon-to-index map comes from one `achievement-icons.mjs` list that a test keeps in step with the objects.
- **Budget.** The sheet is at most 20 KB raw and 6 KB gzip, measured in the PR.
- **Published list.** The build also writes `/achievement-icons.json`: every icon's name and a short meaning line. The `accomplishments` skill reads it, so the icon library has one source of truth and the skill never hard-codes names.
- **The 16 icons.** They describe what kind of thing was done, not which discipline, so they stay flexible:

| Icon | Meaning |
| --- | --- |
| `sprout` | started something, or a first |
| `hammer` | built something |
| `rocket` | shipped or launched |
| `wrench` | fixed or repaired |
| `shield` | secured or protected |
| `key` | unlocked access |
| `cog` | automated or improved a process |
| `book` | wrote or documented |
| `magnifier` | investigated or analysed |
| `flask` | experimented or prototyped |
| `watering-can` | mentored or helped others grow |
| `heart` | helped, or went the extra mile |
| `compass` | planned, led or set direction |
| `chest` | organised or stored (data, assets) |
| `trophy` | reached a milestone |
| `lantern` | lit the way (a guide, a talk, a write-up) |

- **Outside the 16.** The fallback is `star`, the gold star the cards use today redrawn as a 16×16 icon (R13). The locked mark is `lock`, a small padlock drawn over the icon's corner. Both live in the same sheet and the same folder, but aren't offered to Claude as choices.

### D6. The icon skill (this repo)

`.claude/skills/achievement-icon/SKILL.md` follows the `pixel-art` skill's rules and adds the icon-specific steps: start from `npm run art -- --new object icon-<name> --size 16x16`, draw, `--check`, `--preview`, add the object to the sheet scene, add its name and meaning to `achievement-icons.mjs`, run `npm run art` and `npm test`, and attach the previews. It lists the 16 icons and their meanings so a new icon fills a gap rather than duplicating one.

### D7. Drafting, locking, stale and migration (`jlawcordova-atproto`)

Changes to `.claude/skills/accomplishments/SKILL.md`:

- **Draft (step 4).** Each draft also has `funTitle`, `shortDescription` and `icon`. The icon is chosen from `https://jlawcordova.com/achievement-icons.json` by meaning; if the file can't be fetched or nothing fits, Claude picks the closest and says so. The selector shows all three, and the owner can edit them like any field.
- **Voice.** Fun titles are one to three words, warm, with light wordplay, in the way Stardew Valley's achievements are: "Greenhorn" for earning 15,000g and "Cowpoke" for 50,000g, with a plain hint beneath. Claude never uses a joke that needs explaining and never overstates the work (R18). Where a fun title and the plain title disagree, the owner decides.
- **Locked accomplishments.** On request ("add a goal: …"), Claude drafts a record with `done: false`, a `title`, `description`, `funTitle`, `shortDescription` and `icon`, and no dates, and saves it with `add` after the owner approves. It follows the public-safe rules and never names unannounced work.
- **Marking done.** When drafting, if recent activity matches a locked accomplishment, Claude offers to mark it done with `update`, which sets `done: true` and its date.
- **Stale.** Each drafting run lists locked records whose `createdAt` is more than 14 days ago and proposes deleting them in the selector. Only confirmed ones are deleted, with `accomplishments delete`.
- **De-duplication (step 3)** keeps working from `list`, and now treats a matching locked record as a candidate to mark done, not a duplicate.

**Migration** (`jlawcordova-atproto/scripts/migrate-gamified-accomplishments.mjs`, deleted afterwards):

1. Claude drafts a fun title, short description and icon for each of the existing records, through the skill's draft step, and writes them to a scratch JSON file, keyed by rkey.
2. The owner approves or edits each in the selector.
3. The script prints, per record, what it will add (a dry run, writing nothing), then waits for the owner to re-run it with `--write`.
4. With `--write` it calls `accomplishments update <rkey>` for each, adding only the three new fields. It skips any record that already has a `funTitle`, so it can be re-run safely. It never changes `title`, `description`, dates, tags or links.

## Areas of concern

**C1. Resolved: hover is a tooltip, click or tap expands.** Hover alone fails keyboard and touch users (WCAG 2.1.1, 1.4.13), so the tooltip carries only the full description and everything is also reachable by expanding the row. The tooltip floats, so the list doesn't jump.

**C2. Resolved: the icon sheet is limited to 6 KB gzip.** The home page carries all 18 icons to show four. The redesign spec's budgets are 40 KB gzip of HTML, 8 KB gzip of CSS and 2 KB of JS. If the sheet goes over, only the icons used on the page get inlined. The plan measures the sheet and the new Escape script (about 0.2 KB) against the budgets, since the Range script already uses part of the JS budget.

**C3. Resolved: `update` is in scope.** `PATCH` lets a signed-in owner token rewrite a record, which marking done and the migration need. It uses the same owner-only check as the other routes and `swapRecord` to avoid overwriting. Without it, those would delete and re-add records, which gives them new rkeys and creation dates and resets the staleness clock.

**C4. Accepted: the new fields are optional for reads.** The lexicon can't require them later, so `shared` requires them for new writes. A record written by another client without them is valid and shows as a plain row with the fallback icon (R17). "Every record has an icon" is enforced only for writes through this CLI and Worker, which the owner accepts.

**C5. Cross-repo ordering.** The two repos ship separately. The safe order is: lexicon, `shared`, Worker and CLI (`update`, new fields); then the site (reads new fields, tolerates missing ones); then the skill; then the migration. The site must ship before the skill can write new fields, or the new records would show with the fallback icon until it does. The plan will split the work into PRs in that order.

**C6. Icon art quality is subjective.** An icon within the caps can still be unreadable at 16×16. The pixel-art skill's rule is that the preview picture decides, so each icon's PR carries its 1× and 4× previews and the owner reviews them. The 16 names in D5 can change at that stage without changing this spec's requirements.

**C7. Resolved: the Stardew examples are "Greenhorn" and "Cowpoke".** Those two were confirmed against the game's achievement list. "Gofer" and "A Big Help" couldn't be, so the intent no longer cites them, and fun titles are one to three words.

## Open questions

The intent has none left. It asked the spec to propose these, and D4 and D5 do:

- **The 16 icons, the fallback and the locked look:** the table in D5, the gold `star` as the fallback, and a `lock` mark over a dimmed icon.
- **The full-list page:** `/accomplishments/`, then `/accomplishments/page2/` and so on; the title "Accomplishments"; 12 rows per page; locked rows in their own "Not done yet" list at the bottom of page 1.

No new questions. C1 to C4 and C7 are resolved above; C5 and C6 are for the plan and the icon PRs.
