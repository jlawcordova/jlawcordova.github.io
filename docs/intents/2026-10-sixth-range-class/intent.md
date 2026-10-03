# Intent: Sixth Range class
Author: J. Law. Cordova (site owner). Status: accepted.

## Problem

The Range carousel on the home page shows five classes. **Security and governance**, one of the strongest disciplines in the [profile](../../references/profile.md#disciplines) (Disciplines #6), has no class, so the home page undersells it. The [pixel-art engine change](../2026-10-pixel-art-engine/intent.md) already made the outfit (decision #5, success criterion for the first new asset), but the carousel doesn't show it. The redesign deferred this on purpose (its [decision #7](../2026-10-redesign/intent.md)). It was split out of the [pixel-art follow-ups](../2026-10-pixel-art-follow-ups/intent.md) so it can ship on its own, ahead of the art migration.

## Proposed outcome

The Range carousel shows Security and governance as its sixth class, with its outfit, copy, a sixth pager dot and its own nameplate color. The redesign's decision #7 and spec §7.3 carry a note that the sixth class is live.

## Affected users and systems

- **Home page visitors:** the carousel gains a class.
- **The Range component and `src/data/home.ts`:** six classes and their copy.
- **Earlier documents:** the redesign intent's decision #7 and spec §7.3.

## Constraints

- **The carousel stays accessible.** Six dots fit at 390px with no horizontal scroll. The pause control, keyboard behavior and reduced motion work as they do today.
- **Copy is public-safe** and traces to the profile's Disciplines #6. No client names or internal incidents.
- **The engine's rules hold:** the existing outfit art as it is, no new dependencies, the home page within its budget, and an independent verifier on the PR.
- **Visible change is reviewed** with screenshots at 1440px and 390px.
- **Out of scope:** changing the other five outfits, the palette migration and the island (see the follow-ups intent).

## Open questions

1. **The name on the nameplate:** "Security & Governance", matching the profile?
2. **The nameplate shadow color** for the new class.
3. **Timing:** does the carousel's 2200ms interval still suit six classes?
