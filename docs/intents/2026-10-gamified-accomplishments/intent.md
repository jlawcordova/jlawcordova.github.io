# Intent: Gamified accomplishments
Author: J. Law. Cordova (site owner). Status: accepted.

## Problem

The Accomplishments section already says "Achievements unlocked" above a list of cards, but the cards read like a résumé: a date, a plain title, a paragraph, tags and links. Every card carries the same gold star, so nothing helps a visitor tell one accomplishment from another at a glance. The section promises a game and delivers a list.

Platform achievement lists, such as Steam achievements and Apple's Game Center challenges, do this better. Each entry has its own icon, a playful name and a one-line hint of what it took. You can scan the whole list in seconds, and the names stay memorable.

## Proposed outcome

- **Steam-style list.** Each accomplishment is a row with its own icon on the left, a fun title and a short description.
- **A plainer heading.** "Achievements unlocked" becomes "What I've been working on lately", so the section says plainly what it is and the game stays in the rows, not the heading.
- **Short description, then the full one.** The short description is a summary of five to seven words. The existing longer description, tags and links are kept and shown on demand: on hover on desktop, and on mobile the row expands when tapped to show them in full.
- **The home page shows a short list.** The three most recent accomplishments, then one locked teaser. Nothing else.
- **A separate page for the rest.** A "show more" button on the home page opens a page with every accomplishment, newest first, and the locked goals. The page is paginated.
- **The fun title and the plain meaning both survive.** The playful name leads, but the short description makes clear what was actually done, so a recruiter or client isn't left guessing.
- **Claude suggests the fun title, short description and icon** while drafting the weekly accomplishments. The owner approves or edits them before anything is saved.
- **A fixed library of 16 pixel-art icons,** made with the existing pixel-art engine as a new category of art next to the world and the Range outfits. It's an achievement icon set of its own, not a map of the profile's disciplines. A skill makes it easy to add more icons later, in the same style.
- **A fallback icon.** A record whose icon the site doesn't know, such as one added before the site is redeployed, or an old record before the migration, shows a fallback icon instead.
- **Locked teasers come from goals.** Goals are future achievements the owner has set. They live in their own AT Protocol collection, apart from the accomplishments, and show as locked. Each goal carries its own text, so a locked teaser says in words what the goal is and that it's still a goal. A goal becomes a real accomplishment when it's achieved.
- **Existing records get icons too.** A temporary migration script gives every current record a fun title, short description and an icon from the library, then is deleted. The suggestions come from the `accomplishments` skill's drafting step, so the owner approves or edits them the same way as new ones.

## Affected users and systems

- **Home page visitors:** the Accomplishments section looks and reads differently, and there's a new page for the full list.
- **The owner:** reviews and approves the suggested fun titles, descriptions and icons, and sets goals.
- **Accomplishment records on the AT Protocol repo** and the build step that fetches them: the lexicon gains new fields (at least a fun title and an icon), and a new goals collection is added.
- **Where the work lives:** the lexicons, the goals collection, the `accomplishments` skills and CLI, and the migration live in `jlawcordova-atproto`. The icons, the icon skill and the pages live in this repo. They ship in this order: lexicon and goals collection, then the site rendering with its fallback, then drafting and saving the new fields, then the migration.
- **The `accomplishments` skills and CLI:** drafting suggests the new fields, and saving writes them. They also gain a way to add and manage goals.
- **The pixel-art library and engine:** a new icon category, 16 icons, and a skill for creating icons.
- **The Accomplishments component and its styles,** plus the new page.
- **Home page weight:** the section gets lighter (three rows and one teaser).

## Constraints

- **The site's rules still hold:** the design language and palette, no new dependencies, inline SVG within the home page weight budget, deterministic output, and accessibility (icons are decorative, text carries the meaning, reduced motion respected, readable at 390px with no horizontal scroll).
- **Public-safe.** Accomplishment and goal records are public as soon as they're written, so fun titles, descriptions and goals follow the same rules: no client names, no internal incidents, work described by its kind. A goal never names unannounced work.
- **Playful, not misleading.** The fun title must not overstate or obscure what the accomplishment was. A locked goal is clearly a goal, not a claim.
- **Not a real game.** No points, rarity percentages, progress bars or "unlocked by X% of visitors" figures, unless they're true and defined.
- **Icons are built with the engine,** inside its design-language caps and the 32-color world palette, with no legacy colors. The skill that creates icons follows the `pixel-art` skill's rules.
- **The migration is temporary and safe.** It's a one-off script, run once by the owner, that only adds the new fields to existing records. It shows what it will change before writing and can be re-run without double changes. It's deleted afterward. Old records without the new fields still render until it runs.
- **The committed `"unavailable"` placeholder behavior is unchanged,** and if goals can't be fetched the home page simply shows no teaser.
- **Out of scope:** user accounts, tracking which achievements a visitor has seen, sound, filtering or searching the full list, and redesigning other home page sections.

## Open questions

Decided with the owner: Steam-style list; a five-to-seven-word short description, with the full description kept and shown on hover or tap; a fallback icon for unknown icons; migration suggestions go through the drafting skill's approval; the full-list page is paginated; goals carry their own text for the locked teaser; the home page shows three recent plus one locked; the rest lives on a separate page with its own address and title; goals live in a separate AT Protocol collection; the locked teaser on the home page is the goal the owner is working toward; tags and links are kept and shown with the full description; the heading becomes "What I've been working on lately"; 16 icons from a new pixel-art category, with a skill to create more; a temporary migration script gives every old record its icon and fun title.

1. **Marking the current goal:** how does the owner say which goal they're working toward (a flag on the goal, or the first in an order), and what shows if none is marked?
2. **Is a goal removed once achieved,** or does the accomplishment link back to it? And can a goal exist without a date?
3. **The 16 icons:** which kinds of achievement the set covers (for example a launch, a fix, a first, a milestone), and what the fallback icon looks like.
4. **The full-list page:** its address and title, how many rows per page, and how locked goals sit on it (all at the end, or on the first page).
5. **Dates:** does each row keep a date, and where?
6. **Voice of the fun titles:** how playful? Who has the final say when the suggestion and the plain title disagree?
