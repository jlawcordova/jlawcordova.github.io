# Spec: Copy that follows the design system (from intent.md 2026-10-04)
Status: draft.

## Requirements

Traced to the [intent](intent.md). Each is checkable.

### The design system moves into this repo

- **R1. It's committed here.** The design system's content is in `docs/design-system/`, laid out as in [Design](#where-it-lives). It's the source of truth from now on, and its README says so in its first lines. *(Outcome 3)*
- **R2. It's public-safe.** Every committed file passes CLAUDE.md's publishing rules: its examples are made up, and name no client, colleague or employer system. *(Constraint: public-safe)*
- **R3. Tokens can't drift.** Every token in `docs/design-system/tokens.json` whose name matches a custom property in `src/styles/variables.css` has the same value, and a `node:test` test checks it. *(Outcome 3: one source of truth)*
- **R4. The repo points to it.** CLAUDE.md's Conventions and the README's project layout table name `docs/design-system/`. The `write-spec` skill lists it among the standards a spec loads. *(Outcome 3: "changes go through this repo")*
- **R5. The artifact is retired.** The design system artifact gets one last revision matching the repo, with a line at the top of its README saying the repo is the source. After that it isn't edited. *(Outcome 3)*

### Gamified copy

- **R6. Gamified copy has a home.** The design system's README has a Gamified copy section. It allows gamified copy in two places, accomplishments and buttons, plus one kept exception, the Range heading. Everything else uses the plain, structured voice. *(Outcome 1; constraint)*
- **R7. The voice is defined.** The section gives the voice the accomplishments already use: Stardew Valley's level of playfulness, one to three words, warm, a little folksy, light wordplay, never a joke that needs explaining. It carries over the [gamified accomplishments](../2026-10-gamified-accomplishments/intent.md) rules: playful but not misleading, and no points, rarity or progress figures unless they're true and defined. *(Outcome 1)*
- **R8. Plain meaning sits next to play.** A gamified line never stands alone. An accomplishment's fun title sits beside its short description and plain title. A gamified button sits beside text that says where it leads. The Range heading sits beside its plain paragraph. *(Outcome 1)*
- **R9. The accomplishment examples match the site.** The AchievementRow guidelines use Stardew-style fun titles in the row, with the plain title in the opened panel. *(Problem)*
- **R10. Buttons may be gamified.** The Button guidelines and the README's examples table allow a gamified label as well as a plain one. *(Outcome 1)*
- **R11. The hero title's accent is allowed.** The design system's color rule lists the hero title's second clause as a use of `color-accent`. *(Owner decision on spec C2)*
- **R12. Nothing else changes in the system.** Tokens, the other components and the rest of the README keep their meaning. Only the edits listed in [Design](#design-system-edits) and the move are made. *(Constraint: scope)*

### Site

- **R13. Hero title.** The hero `<h1>` is rewritten in the design system's voice: plain, specific, and backed by the profile. Its second clause stays accent-colored. *(Outcome 2)*
- **R14. Hero paragraph.** The hero lede is rewritten in the design system's voice: context first, first person, no slogans. *(Outcome 2)*
- **R15. Range paragraph.** The Range paragraph is rewritten in the design system's voice. *(Outcome 2)*
- **R16. Site description.** `site.description`, used for search results and link previews, matches the new hero and is at most 160 characters. *(Outcome 2)*
- **R17. These stay as they are:** the pre-title, "Press start", "Get in touch", "Many hats. One craftsman.", the Range class names, and the accomplishments' wording, look and behavior. *(Outcome 2; constraints)*
- **R18. Facts come from the profile.** Every claim in R13 to R16 traces to `docs/references/profile.md`. The owner's AI workflow claim is added to the profile first (see [Updates elsewhere](#updates-elsewhere)). *(Constraint: public-safe)*
- **R19. Layout and behavior don't change.** No markup structure, class, style or carousel behavior changes. Both sections show no horizontal scroll at 390px, and the new text wraps no worse than one extra line at 1440px and 390px. *(Constraint: out of scope)*
- **R20. Earlier documents say so.** The redesign spec's §7.1, §7.3 and §7.4 get an update note that links here, as §7.3 already has for the Range classes. Their old copy stays, because that spec predates the templates. *(CLAUDE.md: update mentions)*

## Design

### Where it lives

```
docs/design-system/
  README.md                     the brand book (from the artifact's project/README.md)
  tokens.json                   tokens with usage notes (from project/tokens.json)
  components/<Name>/README.md   guidelines, one per component (12)
```

The 12 components are AchievementRow, Button, Card, CodeBlock, DecisionBrief, Footer, Navigation, PageHead, Pagination, Pill, Prose and Register.

Left out, because the site already holds them or they only serve the artifact's page:

- `components/bundle.css`: a copy of the site's CSS. The site's `src/styles/` is the implementation.
- `components/*/preview.html` and the cover: they render only inside the artifact, from its generated `tokens.css` and uploaded assets.
- The uploaded logo and icon sheet. The README points to them where they already live: `static/public/logo.svg`, `static/public/favicon.svg`, `static/public/logo@2x.png` and `src/assets/pixel-art/achievement-icons.svg`. The two asset READMEs fold into the README's Iconography section.
- The artifact's index file.

`tokens.json` keeps its shape. Its `meta` becomes `{"source": "docs/design-system", "synced": "<date>"}`, with the existing `paths` kept.

**Which wins.** `src/styles/variables.css` holds the values the build uses. `tokens.json` adds names that are literals in the CSS (such as `radius-chip` and the `syntax-*` colors) and a usage note for each. A token change edits both in the same commit, and R3's test fails if they differ.

**The test.** `scripts/design-system.test.mjs` reads `tokens.json` and the first definition of each `--<name>` in `variables.css` (outside media queries), and compares the values of every token with a matching name. The comparison ignores case and whitespace. Tokens that have no custom property, and shadows that use `var()` in the CSS, are skipped.

### Design system edits

These apply to the files in `docs/design-system/`.

**README, top.** Add after the first paragraph: "This folder is the design system's source of truth. Change it here, by pull request."

**README, `## Content fundamentals`.** Replace the paragraph that begins "The site already has a playful layer" with a new subsection after `### Examples`:

> ### Gamified copy
>
> Two places can play: **accomplishments** and **buttons**. Everything else uses the plain voice above.
>
> - **Voice:** Stardew Valley's achievements ("Greenhorn", "Cowpoke"). One to three words, warm, a little folksy, light wordplay. Never a joke that needs explaining.
> - **Plain meaning sits next to it.** An accomplishment's fun title has a short description beside it and a plain title in its opened panel. A gamified button sits beside text that says where it leads.
> - **Never misleading.** A fun title doesn't overstate what was done. A locked accomplishment reads as not done yet, not as a claim.
> - **Not a real game.** No points, levels, rarity or progress figures unless they're true and defined.
> - **One kept exception:** the home page's Range heading, "Many hats. One craftsman.", with a plain paragraph beside it.

**README, examples table.** The button row "Get started today" → "Read the plan" stays as a plain example. Add a row: "Click here to learn more!" → "Press start" (a gamified button, with the section it opens right beside it).

**README, `### Color`.** The `color-accent` line becomes: "Use `color-accent` only for links, the primary action, the J of the mark, and the second clause of the hero title."

**README, `## Components`.** The AchievementRow line becomes: "an icon, a fun title, a short line, a date, and an opened panel with the plain title, tags and links."

**README, `## Iconography`.** Asset paths change to the repo paths above, and the asset READMEs' notes (the icon sheet's cell order, the mark's colors and grounds) are added.

**Button README.** "What you provide" becomes: a label of one to three words. It's either plain and says what happens next ("Read the plan", not "Learn more"), or gamified under the README's Gamified copy rules ("Press start"). The "Don't" list keeps "no exclamation marks or hype".

**AchievementRow README, `## Content`.** The short title is a fun title in the Gamified copy voice. The short line says plainly what was done, in five to seven words. The plain title in the panel says exactly what was done. A locked row's text says it's not done yet. Examples, all made up:

| Row | Fun title | Short line | Plain title (panel) |
| --- | --- | --- | --- |
| Done | Night Owl | Nightly loads finish before 06:00. | Moved the nightly loads to a lakehouse |
| Done | Lore Keeper | On-call steps for every pipeline. | Documented the data platform's on-call runbook |
| Locked | Spring Cleaning | Retire the legacy ETL. | — (date slot: "Not done yet") |

**tokens.json.** The `hero-title` sample becomes the new hero title.

### The artifact's last revision

The artifact gets the same edits, the same top line (pointing to `docs/design-system/` in this repo), and matching previews: the Button preview's primary label becomes "Press start", and the AchievementRow preview uses the examples above. Its `lastChange` note says it's retired. The PR description links the revision.

### Site copy

Only text changes, in `src/components/home/Hero.astro`, `src/components/home/Range.astro` and `src/site.ts`. The `<span class="accent">` in the hero title wraps the new second clause. Claims trace to the profile's Current role, Summary, Highlights and Disciplines.

| Where | Now | New | Profile source |
| --- | --- | --- | --- |
| Hero title | I ship whole products, *not handoffs.* | I take software from estimate *to production.* | Release management; technical estimation |
| Hero paragraph | Senior developer and tech lead at Netzon in Davao City. I lead full-stack teams, design data platforms, and take releases safely to production. | Senior developer and tech lead at Netzon in Davao City. I lead full-stack teams, design data platforms on Microsoft Fabric, and run releases with sign-offs and rollback. | Current role; Summary |
| Range paragraph | I’ve worked every stage of shipping software, from code review to production sign-off. AI speeds up the work; the judgment stays mine. | Each outfit is a discipline I work in, from Figma designs to production releases. I set up AI workflows that plan, build and check each change before it ships. | Disciplines; AI workflows (added to the profile, see below) |
| Site description | J. Law. Cordova is a senior developer and tech lead in Davao City who ships whole products: full-stack apps, Fabric data platforms and secure releases. | Senior developer and tech lead in Davao City. I take software from estimate to production: full-stack apps, Fabric data platforms and releases with rollback. (157 characters) | Current role; Summary |

These read as the design system: they lead with what is done rather than a contrast slogan, name real tools and steps, use the first person, and drop adjectives that aren't evidence ("whole"). The Range paragraph says what the carousel shows, so the playful heading has a plain line beside it (R8).

The two paragraphs grow from 23 and 22 words to 27 and 29. Both sit in `max-width` columns (540px and 480px), so they wrap to one more line at most. R19's screenshots check it.

### Updates elsewhere

- **Profile** (`docs/references/profile.md`), Summary: "Sets up AI-assisted delivery workflows (intent, spec, plan, build and independent verification) so each change is planned, built and checked before it ships." This is the owner's own claim, and this site's workflow is the public example.
- **Redesign spec** §7.1, §7.3 and §7.4: *Update, 2026-10: rewritten to follow the design system ([copy intent](../2026-10-design-system-copy/intent.md)).*
- **CLAUDE.md, Conventions:** "Copy, components and tokens follow the design system in `docs/design-system/`. Its README is the brand book. A token change edits `tokens.json` and `src/styles/variables.css` together."
- **README.md** project layout table: a `docs/design-system/` row.
- **`.claude/skills/write-spec/SKILL.md`,** step 2: add `docs/design-system/` to the standards list.

### Verification

- `npm run build` and `npm test` pass as CLAUDE.md requires, including the new token test.
- Screenshots of the home page at 1440px and 390px, before and after, with no horizontal scroll.
- A search of `docs/design-system/` for "Netzon" and client-style names finds nothing.
- The artifact is read back after its last revision and shows the edits and the top line.

## Areas of concern

Decided with the owner: the Range heading is the one kept exception (the intent now says so), the hero title's accent clause is added to the color rule, and the site description is rewritten here.

### C1. Two copies until the artifact is retired

The repo and the artifact hold the same content for one revision. R5 makes the repo the source and stops edits to the artifact, so they diverge only if someone edits it anyway. Its top line says not to.

### C2. The previews don't come along

Without `preview.html` files, the repo copy has no rendered examples. The live site is the rendered example of every component except DecisionBrief and Register, which aren't on the site. If rendered previews are wanted later, they're a separate change.

## Open questions

The intent has none, and the owner settled the spec's earlier questions. The new copy above can still be edited in review.
