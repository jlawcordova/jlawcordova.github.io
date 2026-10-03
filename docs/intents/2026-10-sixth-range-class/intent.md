# Intent: Range class characters
Author: J. Law. Cordova (site owner). Status: accepted. Implemented in [#49](https://github.com/jlawcordova/jlawcordova.github.io/pull/49), awaiting verification.

## Problem

The Range carousel on the home page shows five classes as the same character in five outfits. The outfits are mostly a change of shirt and hat, so the classes are hard to tell apart and read as plain. **Security and governance**, one of the strongest disciplines in the [profile](../../references/profile.md#disciplines) (Disciplines #6), has no class at all, and **back-end** work isn't separate from front-end. The [pixel-art engine change](../2026-10-pixel-art-engine/intent.md) already made a knight-in-armor outfit for Security and governance (decision #5), and it looks right: a character with a role, not just clothes. The carousel doesn't show it, and the other five don't match it. The redesign deferred a sixth class on purpose (its [decision #7](../2026-10-redesign/intent.md)). This work was split out of the [pixel-art follow-ups](../2026-10-pixel-art-follow-ups/intent.md) so it can ship ahead of the island migration.

Originally this intent only added the sixth class. It was widened, with the owner, to make every class a character in the spirit of the knight.

## Proposed outcome

The Range carousel shows seven classes, each a recognizable character with one costume cue and one prop, in the pixel-art style of the rest of the site:

| Class | Character |
| --- | --- |
| Front-end | A mage |
| Back-end | A hacker in a hoodie |
| UX Design | A painter, with art tools |
| Cloud & DevOps | An engineer in a hard hat |
| Data Engineering | An alchemist |
| Project Management | A person in a suit |
| Security & Governance | The knight in armor (already built) |

*Update, 2026-10-03, from the owner's review of [#49](https://github.com/jlawcordova/jlawcordova.github.io/pull/49): Back-end became a developer with rounded hair and a slate top, holding a laptop in front, after the hoodie didn't read at this size. Data Engineering is a medieval alchemist (floppy cap, white beard, belted tunic, triangular flask).*

A prop that is too big to hold, such as a house, a server rack or an easel, is its own object placed in the scene next to the character, so the character and the object both live on the Range platform. Each class has copy, its own nameplate color and a pager dot, and the carousel still works as it does today. The redesign's decision #7 and spec §7.3 carry a note that the classes changed.

## Affected users and systems

- **Home page visitors:** the carousel gains two classes (back-end and security) and every outfit looks different.
- **The Range component and `src/data/home.ts`:** seven classes and their names and nameplate colors.
- **Pixel-art sources:** the base character moved to non-legacy colors, a redrawn outfit for five classes, a new one for back-end, and the knight as it is. This includes the outfit palette tier and the Range sprite scene.
- **Pixel-art checks and the `pixel-art` skill:** the Range sprite's "identical to the original" check no longer applies, since the art changes on purpose.
- **Earlier documents:** the redesign intent's decision #7 and spec §7.3.

## Constraints

- **Still professional.** The characters are playful but not a game. Each has one costume cue and one prop, in the same pose and silhouette as the others. Nameplates stay plain job names, with no "Wizard" or "Hacker" labels, and there are no stats, levels or rarity styling. The knight is the bar for how far it goes.
- **New art follows the engine's rules:** the design language (32×16 tile, light direction, size caps), the world and outfit palette tiers, and no legacy colors in the outfits or the base character. The figure's size cap is raised so each character's prop fits as drawn, not just as a silhouette. The body stays the same size, and the cap applies to characters only. New outfit colors are added to the palette by hand in a reviewed commit, within the outfit tier's 16-color limit.
- **Every class is reviewed,** with before and after previews and screenshots at 1440px and 390px for each. The redrawn and new classes can ship together in one PR, as long as each class's preview and screenshots are in it.
- **The carousel stays accessible.** Seven dots fit at 390px with no horizontal scroll. The pause control, keyboard behavior, 44px tap targets and reduced motion all work as they do today. The "class N of 7" text and the sprite's label follow the data.
- **No heavier art.** The range sprite stays within ≤ 100 KB raw and ≤ 25 KB gzip, and the home page within its budget.
- **Copy is public-safe** and traces to the profile's disciplines. No client names or internal incidents. The Range paragraph is not changed.
- **An independent verifier checks each PR.**
- **The base character changes shade slightly, not shape.** Moving it off legacy colors may nudge a hair, boot or skin shade by a step. Its body, pose and proportions stay as they are, and the change is reviewed with before and after previews.
- **Big props are scene objects.** A prop that doesn't fit the raised figure cap is a separate object in the Range sprite's scene, drawn within the existing object caps and placed on the platform beside the character. It's shown only with its class, and it counts toward the sprite's size budget.
- **The engine's cap changes.** The pixel-art engine's character cap (16×24, engine spec R27) is raised in its own step, with the engine, its tests and the `pixel-art` skill updated together. No other cap changes.
- **Out of scope:** enlarging or redrawing the island platform (a prop must fit the platform as it is), the platform's legacy colors, the hero island and the rest of the palette migration (the follow-ups intent), and a game-style interface around the carousel.

## Open questions

1. **The order of the seven classes.** The carousel starts on the first.
2. **The name of the back-end class:** "Back-end", or "Software Engineering"?
3. **The props and colors** for each character, within the new figure cap.
4. **Nameplate shadow colors,** one per class, from each outfit's main color.
5. **Timing:** does the carousel's 2200ms interval still suit seven classes? A full cycle becomes 15.4 seconds.
6. **Does the nameplate fit** the longest names at 390px?
7. **The new figure cap:** how large, so every prop fits without making the character tower over the island and trucks? (The spec proposes 24×32.)
8. **Which props are held and which stand beside the character,** and whether the platform has room for them.
