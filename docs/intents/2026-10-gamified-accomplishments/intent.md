# Intent: Gamified accomplishments
Author: J. Law. Cordova (site owner). Status: accepted.

## Problem

The Accomplishments section already says "Achievements unlocked" above a list of cards, but the cards read like a résumé: a date, a plain title, a paragraph, tags and links. Every card carries the same gold star, so nothing helps a visitor tell one accomplishment from another at a glance. The section promises a game and delivers a list.

Platform achievement lists, such as Steam achievements and Apple's Game Center challenges, do this better. Each entry has its own icon, a playful name and a one-line hint of what it took. You can scan the whole list in seconds, and the names stay memorable.

## Proposed outcome

- **Steam-style list.** Each accomplishment is a row with its own icon on the left, a fun title and a short description, and the date it was accomplished on the right, as Steam shows it.
- **A plainer heading.** "Achievements unlocked" becomes "What I've been working on lately", so the section says plainly what it is and the game stays in the rows, not the heading.
- **Short description, then the full one.** The short description is a summary of five to seven words. The existing longer description, tags and links are kept and shown on demand: on hover on desktop, and on mobile the row expands when tapped to show them in full.
- **The home page shows a short list.** The three most recent accomplishments, then the newest locked accomplishment. Nothing else.
- **A separate page for the rest.** A "show more" button on the home page opens a page with every accomplishment, newest first, and the locked ones. The page is paginated.
- **The fun title and the plain meaning both survive.** The playful name leads, but the short description makes clear what was actually done, so a recruiter or client isn't left guessing.
- **Claude suggests the fun title, short description and icon** while drafting the weekly accomplishments. The owner approves or edits them before anything is saved.
- **A fixed library of 16 pixel-art icons,** made with the existing pixel-art engine as a new category of art next to the world and the Range outfits. It's an achievement icon set of its own, not a map of the profile's disciplines. A skill makes it easy to add more icons later, in the same style.
- **A fallback icon.** A record whose icon the site doesn't know, such as one added before the site is redeployed, or an old record before the migration, shows a fallback icon instead.
- **Locked accomplishments.** A goal is not a separate kind of record. It's an accomplishment with a flag saying it isn't done yet, in the same collection. It uses an icon from the same set, shown with a locked indicator, like an achievement in a game you haven't earned yet. It can't be clicked or expanded, has no accomplished date (`startDate` becomes optional while it's not done), and its text says in words that it's not done yet. When it's achieved, the flag flips and it becomes an ordinary accomplishment.
- **Stale locked accomplishments are cleared.** When drafting the next accomplishments, the skill spots locked ones that are stale, meaning created more than two weeks ago and still not done, and proposes deleting them. The owner confirms, and they're deleted in that save.
- **Existing records get icons too.** A temporary migration script gives every current record a fun title, short description and an icon from the library, then is deleted. The suggestions come from the `accomplishments` skill's drafting step, so the owner approves or edits them the same way as new ones.

## Affected users and systems

- **Home page visitors:** the Accomplishments section looks and reads differently, and there's a new page for the full list.
- **The owner:** reviews and approves the suggested fun titles, descriptions and icons, sets locked accomplishments, and confirms deleting stale ones.
- **Accomplishment records on the AT Protocol repo** and the build step that fetches them: the lexicon gains new fields (at least a fun title, a short description, an icon and a done flag, and `startDate` becomes optional for locked records). There's no separate goals collection.
- **Where the work lives:** the lexicon, the `accomplishments` skills and CLI, and the migration live in `jlawcordova-atproto`. The icons, the icon skill and the pages live in this repo. They ship in this order: lexicon, then the site rendering with its fallback, then drafting and saving the new fields, then the migration.
- **The `accomplishments` skills and CLI:** drafting suggests the new fields, and saving writes them. They also gain a way to add locked accomplishments, mark them done, and propose deleting stale ones.
- **The pixel-art library and engine:** a new icon category, 16 icons, and a skill for creating icons.
- **The Accomplishments component and its styles,** plus the new page.
- **Home page weight:** the section gets lighter (three rows and one teaser).

## Constraints

- **The site's rules still hold:** the design language and palette, no new dependencies, inline SVG within the home page weight budget, deterministic output, and accessibility (icons are decorative, text carries the meaning, reduced motion respected, readable at 390px with no horizontal scroll).
- **Public-safe.** Accomplishment records, locked or not, are public as soon as they're written, so fun titles and descriptions follow the same rules: no client names, no internal incidents, work described by its kind. A locked accomplishment never names unannounced work.
- **Stardew Valley's level of playfulness.** Fun titles take their voice from Stardew Valley's achievements (such as "Greenhorn", "Cowpoke", "Gofer" or "A Big Help"): short, warm, a little folksy, with light wordplay, never a joke that needs explaining. The owner has the final say, as with every suggestion.
- **Playful, not misleading.** The fun title must not overstate or obscure what the accomplishment was. A locked accomplishment is clearly not done yet, not a claim.
- **Not a real game.** No points, rarity percentages, progress bars or "unlocked by X% of visitors" figures, unless they're true and defined.
- **Icons are built with the engine,** inside its design-language caps and the 32-color world palette, with no legacy colors. The skill that creates icons follows the `pixel-art` skill's rules.
- **The migration is temporary and safe.** It's a one-off script, run once by the owner, that only adds the new fields to existing records. It shows what it will change before writing and can be re-run without double changes. It's deleted afterward. Old records without the new fields still render until it runs.
- **The committed `"unavailable"` placeholder behavior is unchanged,** and if there's no locked accomplishment the home page simply shows no locked row.
- **Out of scope:** user accounts, tracking which achievements a visitor has seen, sound, filtering or searching the full list, and redesigning other home page sections.

## Open questions

Decided with the owner: Steam-style list; a five-to-seven-word short description, with the full description kept and shown on hover or tap; a fallback icon for unknown icons; the home page shows the newest locked accomplishment; `startDate` is optional while locked; a locked accomplishment is stale two weeks after it's created; migration suggestions go through the drafting skill's approval; the full-list page is paginated; goals are accomplishments flagged as not done, in the same collection, with an icon from the same set, a locked indicator, their own text, no click or expand, and stale ones deleted through the drafting skill; the home page shows three recent plus one locked; the rest lives on a separate page with its own address and title; each row shows its accomplished date on the right; fun titles follow Stardew Valley's voice, with the owner's final say; tags and links are kept and shown with the full description; the heading becomes "What I've been working on lately"; 16 icons from a new pixel-art category, with a skill to create more; a temporary migration script gives every old record its icon and fun title.

None left for the intent. The spec proposes these, and the owner isn't strict on them:

- **The 16 icons:** a set flexible enough to cover most accomplishments, plus the fallback icon and the locked indicator.
- **The full-list page:** its address and title, how many rows per page, and where locked accomplishments sit.
