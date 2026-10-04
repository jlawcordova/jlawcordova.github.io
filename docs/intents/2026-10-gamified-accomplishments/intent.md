# Intent: Gamified accomplishments
Author: J. Law. Cordova (site owner). Status: done for the site, 2026-10-04: built in [#56](https://github.com/jlawcordova/jlawcordova.github.io/pull/56), [#60](https://github.com/jlawcordova/jlawcordova.github.io/pull/60) and [#61](https://github.com/jlawcordova/jlawcordova.github.io/pull/61). The atproto side (lexicon, `update`, skill, migration) merged in `jlawcordova-atproto` #21 and #22. R4, R10, R11, R15 and R18 need real runs of the `accomplishments` skill and are tracked in that repo's sub-intent.

## Problem

The Accomplishments section already says "Achievements unlocked" above a list of cards, but the cards read like a résumé: a date, a plain title, a paragraph, tags and links. Every card carries the same gold star, so nothing helps a visitor tell one accomplishment from another at a glance. The section promises a game and delivers a list.

Platform achievement lists, such as Steam achievements and Apple's Game Center challenges, do this better. Each entry has its own icon, a playful name and a one-line hint of what it took. You can scan the whole list in seconds, and the names stay memorable.

## Proposed outcome

- **Steam-style list.** Each accomplishment is a row with its own icon on the left, a fun title and a short description, and the date it was accomplished on the right, as Steam shows it.
- **A plainer heading.** "Achievements unlocked" becomes "What I've been working on lately", so the section says plainly what it is and the game stays in the rows, not the heading.
- **Short description, then the full one.** The short description is a summary of five to seven words. The existing longer description, tags and links are kept. On a device with a mouse, hovering a row shows the longer description in a tooltip. Clicking the row, or tapping it on a phone where there's no hover, expands it to show everything, including the tags and links.
- **The home page shows a short list.** The three most recent accomplishments, then the newest locked accomplishment. Nothing else.
- **A separate page for the rest.** A "show more" button on the home page opens a page with every accomplishment, newest first, and the locked ones. The page is paginated.
- **The fun title and the plain meaning both survive.** The playful name leads, but the short description makes clear what was actually done, so a recruiter or client isn't left guessing.
- **Claude suggests the fun title, short description and icon** while drafting the weekly accomplishments. The owner approves or edits them before anything is saved.
- **A fixed library of 16 pixel-art icons,** made with the existing pixel-art engine as a new category of art next to the world and the Range outfits. It's an achievement icon set of its own, not a map of the profile's disciplines. A skill makes it easy to add more icons later, in the same style.
- **A fallback icon.** An accomplishment without a known icon still shows one.
- **Locked accomplishments.** A goal isn't a separate kind of thing. It's an accomplishment that isn't done yet. It uses an icon from the same set, shown as locked, like an achievement in a game you haven't earned yet. It can't be clicked or expanded, has no accomplished date, and its text says in words that it's not done yet. When it's achieved, it becomes an ordinary accomplishment.
- **Stale locked accomplishments are cleared.** A locked accomplishment that's still not done two weeks after it was set is stale. When drafting the next accomplishments, Claude points out stale ones and suggests removing them, and the owner confirms.
- **Existing records get icons too.** A temporary migration gives every current accomplishment a fun title, short description and an icon from the library, then is deleted. Claude suggests them the same way as for new ones, and the owner approves or edits them.

## Affected users and systems

- **Home page visitors:** the Accomplishments section looks and reads differently, and there's a new page for the full list.
- **The owner:** reviews and approves the suggested fun titles, descriptions and icons, sets locked accomplishments, and confirms deleting stale ones.
- **Accomplishment records on the AT Protocol repo** and the build step that fetches them: each accomplishment gains a fun title, a short description and an icon, and can be not done yet.
- **Both repos:** the records, the `accomplishments` skills and CLI, and the migration are in `jlawcordova-atproto`. The icons and pages are in this repo.
- **The `accomplishments` skills and CLI:** drafting suggests the fun title, short description and icon, and saving keeps them. They also let the owner set locked accomplishments, mark them done, and remove stale ones.
- **The pixel-art library and engine:** a new icon category, 16 icons, and a skill for creating icons.
- **The Accomplishments component and its styles,** plus the new page.
- **Home page weight:** the section gets lighter (three rows and one teaser).

## Constraints

- **The site's rules still hold:** the design language and palette, no new dependencies, inline SVG within the home page weight budget, deterministic output, and accessibility (icons are decorative, text carries the meaning, reduced motion respected, readable at 390px with no horizontal scroll).
- **Public-safe.** Accomplishment records, locked or not, are public as soon as they're written, so fun titles and descriptions follow the same rules: no client names, no internal incidents, work described by its kind. A locked accomplishment never names unannounced work.
- **Stardew Valley's level of playfulness.** Fun titles take their voice from Stardew Valley's achievements (such as "Greenhorn" or "Cowpoke"): one to three words, warm, a little folksy, with light wordplay, never a joke that needs explaining. The owner has the final say, as with every suggestion.
- **Playful, not misleading.** The fun title must not overstate or obscure what the accomplishment was. A locked accomplishment is clearly not done yet, not a claim.
- **Not a real game.** No points, rarity percentages, progress bars or "unlocked by X% of visitors" figures, unless they're true and defined.
- **Icons are built with the engine,** inside its design-language caps and the 32-color world palette, with no legacy colors. The skill that creates icons follows the `pixel-art` skill's rules.
- **The migration is temporary and safe.** It's run once by the owner and only adds to existing accomplishments, never changing what's already there. It shows what it will change before writing and can be re-run without double changes. It's deleted afterward. Old records without the new fields still render until it runs.
- **The committed `"unavailable"` placeholder behavior is unchanged,** and if there's no locked accomplishment the home page simply shows no locked row.
- **Out of scope:** user accounts, tracking which achievements a visitor has seen, sound, filtering or searching the full list, and redesigning other home page sections.

## Open questions

None. The owner asked the spec to propose the 16 icons, the fallback icon, how locked accomplishments look, and the full-list page's address, title and page size.
