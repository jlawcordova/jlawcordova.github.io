# Spec: Copy that follows the design system (from intent.md 2026-10-04)
Status: draft.

## Requirements

Traced to the [intent](intent.md). Each is checkable.

### Design system

- **R1. Gamified copy has a home.** The design system's README has a section on gamified copy. It says gamified copy is allowed in two places only, accomplishments and buttons, and that everything else uses the plain, structured voice. *(Outcome 1; constraint: limited to accomplishments and buttons)*
- **R2. The voice is defined.** That section gives the voice the accomplishments already use: Stardew Valley's level of playfulness, one to three words, warm, a little folksy, light wordplay, never a joke that needs explaining. It carries over the gamified accomplishments' rules: playful but not misleading, never overstating what was done, and no points, rarity or progress figures unless they're true and defined. *(Outcome 1; [gamified accomplishments intent](../2026-10-gamified-accomplishments/intent.md), constraints)*
- **R3. Plain meaning sits next to play.** The section says a gamified line never stands alone. An accomplishment's fun title sits beside its short description and plain title. A gamified button sits beside text that says where it goes or what it does. *(Outcome 1: "how that playful copy sits next to the plain voice")*
- **R4. The examples match the site.** The AchievementRow guidelines and preview use Stardew-style fun titles in the row, with the plain title in the opened panel, as the site does. *(Problem: "The design system gets the accomplishments wrong")*
- **R5. Buttons may be gamified.** The Button guidelines and the README's examples table allow a gamified label as well as a plain one. The Button preview shows "Press start" and "Get in touch", as the site does. *(Outcome 1)*
- **R6. The kept headline is named.** The README's paragraph on the site's playful layer is replaced by R1's section. "Many hats. One craftsman." is listed there as a kept exception, so the design system and the site agree. *(Outcome 2: the heading stays; see [concern C1](#c1-the-range-heading-is-neither-an-accomplishment-nor-a-button))*
- **R7. Nothing else changes in the system.** Tokens, components other than those named above, assets, the cover and the rest of the README stay as they are. *(Constraint: accomplishments unchanged; scope)*

### Site

- **R8. Hero title.** The hero `<h1>` is rewritten in the design system's voice: plain, specific, and backed by the profile. Its second clause stays accent-colored. *(Outcome 2)*
- **R9. Hero paragraph.** The hero lede is rewritten in the design system's voice: context first, first person, no slogans. *(Outcome 2)*
- **R10. Range paragraph.** The Range paragraph is rewritten in the design system's voice. *(Outcome 2)*
- **R11. These stay as they are:** the pre-title, "Press start", "Get in touch", "Many hats. One craftsman.", the Range class names, and the accomplishments' wording, look and behavior. *(Outcome 2; constraints)*
- **R12. Facts come from the profile.** Every claim in R8 to R10 traces to `docs/references/profile.md`. *(Constraint: public-safe)*
- **R13. Layout and behavior don't change.** No markup structure, class, style, or carousel behavior changes. Both sections show no horizontal scroll at 390px, and the new text wraps no worse than the old at 1440px and 390px. *(Constraint: out of scope)*
- **R14. Earlier documents say so.** The redesign spec's §7.1 and §7.3 get an update note that links here, as §7.3 already has for the Range classes. Their old copy stays, because that spec predates the templates. *(CLAUDE.md: when a doc changes, update mentions)*

## Design

### Design system changes

These are published to the design system artifact as one revision. The artifact isn't in this repo, so the PR description lists each change and links the revision for the verifier.

**README: `## Content fundamentals`.** Replace the paragraph that begins "The site already has a playful layer" with a new subsection after `### Examples`:

> ### Gamified copy
>
> Two places can play: **accomplishments** and **buttons**. Everything else uses the plain voice above.
>
> - **Voice:** Stardew Valley's achievements ("Greenhorn", "Cowpoke"). One to three words, warm, a little folksy, light wordplay. Never a joke that needs explaining.
> - **Plain meaning sits next to it.** An accomplishment's fun title has a short description beside it and a plain title in its opened panel. A gamified button sits beside text that says where it leads.
> - **Never misleading.** A fun title doesn't overstate what was done. A locked accomplishment reads as not done yet, not as a claim.
> - **Not a real game.** No points, levels, rarity or progress figures unless they're true and defined.
> - **One kept exception:** the home page's Range heading, "Many hats. One craftsman.", with a plain paragraph beside it.

**README: examples table.** The button row "Get started today" → "Read the plan" stays as a plain example. Add one row: "Click here to learn more!" → "Press start" (a gamified button, with the section it opens right beside it).

**README: `## Components`.** The AchievementRow line becomes: "an icon, a fun title, a short line, a date, and an opened panel with the plain title, tags and links."

**Button README.** "What you provide" becomes: a label of one to three words. It's either plain and says what happens next ("Read the plan", not "Learn more"), or gamified under the README's Gamified copy rules ("Press start"). The "Don't" list keeps "no exclamation marks or hype".

**Button preview.** The primary label "Read the plan" becomes "Press start". The ghost button stays "Get in touch".

**AchievementRow README, `## Content`:** the short title is a fun title in the Gamified copy voice. The short line says plainly what was done in five to seven words. The plain title in the panel says exactly what was done. A locked row's text says it's not done yet.

**AchievementRow preview.** Same markup, new example text, all made up and public-safe:

| Row | Fun title | Short line | Plain title (panel) |
| --- | --- | --- | --- |
| Done | Night Owl | Nightly loads finish before 06:00. | — |
| Done, open | Lore Keeper | On-call steps for every pipeline. | Documented the data platform's on-call runbook |
| Locked | Spring Cleaning | Retire the legacy ETL. | — (date slot: "Not done yet") |

**Index.** `lastChange` is set (by J. Law. Cordova, via Claude Code, note "Gamified copy for accomplishments and buttons"). No other index key changes.

### Site changes

Only text changes, in `src/components/home/Hero.astro` and `src/components/home/Range.astro`. The `<span class="accent">` in the hero title wraps the new second clause.

Proposed copy, for the owner to edit. Claims trace to the profile's Current role, Summary and Highlights.

| Where | Now | Proposed | Profile source |
| --- | --- | --- | --- |
| Hero title | I ship whole products, *not handoffs.* | I take software from estimate *to production.* | Release management; technical estimation |
| Hero paragraph (now 23 words) | Senior developer and tech lead at Netzon in Davao City. I lead full-stack teams, design data platforms, and take releases safely to production. | Senior developer and tech lead at Netzon in Davao City. I lead full-stack teams, design data platforms on Microsoft Fabric, and run releases with sign-offs and rollback. (27 words) | Current role; Summary |
| Range paragraph (now 22 words) | I’ve worked every stage of shipping software, from code review to production sign-off. AI speeds up the work; the judgment stays mine. | Each outfit is a discipline I work in, from Figma designs to production releases. I use AI to work faster, and I review what it produces. (27 words) | Disciplines; Responsible AI highlight |

Why these read as the design system: they lead with what is done rather than a contrast slogan, name real tools and steps, use the first person, and cut adjectives that aren't evidence ("safely", "whole"). The Range paragraph says what the carousel shows, so the playful heading has a plain line beside it (R3, R6).

The redesign spec set the two paragraphs at about 23 and 22 words (D5). The proposals run to 27. Both sit in `max-width` columns (540px and 480px), so they wrap to one more line at most; R13's screenshots check it.

### Redesign spec notes

Under §7.1 and §7.3, add: *Update, 2026-10: the hero title and paragraph and the Range paragraph were rewritten to follow the design system ([copy intent](../2026-10-design-system-copy/intent.md)).*

### Verification

- `npm run build` and `npm test` pass as CLAUDE.md requires. No test asserts the copy today, so none changes.
- Screenshots of the home page at 1440px and 390px, before and after, with no horizontal scroll.
- The design system revision is read back after publishing: the README section, both READMEs and both previews show the text above.

## Areas of concern

### C1. The Range heading is neither an accomplishment nor a button

The intent limits gamified copy to accomplishments and buttons, and also keeps "Many hats. One craftsman.", a slogan-style heading. Read strictly, the second breaks the first. This spec keeps the heading and names it in the design system as the one kept exception (R6), with a plain paragraph beside it. **Owner decides:** accept the exception, or amend the intent's constraint to say so too.

### C2. The hero title's accent clause isn't in the design system's color rules

The design system allows `color-accent` only for links, the primary action and the J of the mark. The hero title's accent-colored clause is outside that list, and the intent puts styling out of scope. This spec keeps the accent clause. **Owner decides:** keep it and add "the hero title's second clause" to the design system's color rule in this revision (recommended, since the system was built from the site), or leave the mismatch for later.

### C3. The site description repeats the old hero line

`site.description` in `src/site.ts` (the page's meta and social description) says "who ships whole products", from the old title. The intent doesn't name it. **Owner decides:** rewrite it to match the new hero in this change (recommended), or leave it out of scope.

### C4. The design system isn't version controlled here

Its revision can't be part of the PR's diff, so a verifier checks it from the PR description and a read of the artifact. Nothing else in this repo depends on it.

## Open questions

The intent has none.

1. Is the proposed copy for the hero title, hero paragraph and Range paragraph what you want? Edit freely; the requirements only ask that it follows the design system and the profile.
2. C1, C2 and C3 above.
