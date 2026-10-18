# Intent: The Range pops
Author: J. Law. Cordova (site owner). Status: done, 2026-10-18: built and merged in [#125](https://github.com/jlawcordova/jlawcordova.github.io/pull/125). The owner shaped this change on a running prototype (2026-10-17 to 2026-10-18), picked the result and asked for it as a build-ready PR. This intent records what they asked for, after the fact, and merging the PR accepts it.

## Problem

The Range section "doesn't quite pop." Since the [Range settings](../2026-10-range-settings/intent.md) change, every class has its own setting, but the console screen and the section around it stay the same colors whatever class is showing. Nothing tells a visitor how long a class will stay before the next one, and pausing with START shows nothing on the screen. The console's keys are two colors (ink arrows, green A and B), and JUMP and BACK labels crowd the face. A makes the whole platform hop, not the character. Pressing START to play again doesn't seem to resume the rotation.

## Proposed outcome

In the owner's words, from the prototype review:

- **"When every range character is shown, the background in the console and the background in the section also changes as well,"** with a game-like transition. The owner tried pixel, hard, wild and soft transitions on the prototype and chose **battle bars on the screen and a slash on the section.**
- **The console is light gray.**
- **"A progress bar that indicates when the next character will be shown, like a countdown with no numbers."** It's **"part of the in-game screen UI."**
- **"When clicking START, this toggles the pause. When paused, an indicator should be shown,"** **"at the upper right so the progress bar doesn't do any layout shifts."**
- **"The buttons [are] consistent in color, the same dark brown buttons,"** with **white texts and symbols.**
- **"Jump should just make the character jump, not the entire platform."**
- **"Remove the Jump and Back text. Just have A and B as the buttons."**
- **Fix "the bug where unpausing seems to not resume the cycle."**

## Affected users and systems

- **Home page visitors:** the Range section, its console and its controls.
- **`src/components/home/Range.astro`, `src/styles/range.css` and `src/styles/pixel-art.css`** (the character's hop).
- **The design system:** a new shell color token, the Range's colors and its motion.
- **The Range's tests and browser checks.**

## Constraints

- Everything in `CLAUDE.md`'s conventions holds: no new dependencies, colors from the tokens, the focus ring, 44px tap targets and reduced motion on anything interactive or animated.
- The Range's copy, the class names and the settings' art don't change.
- Post URLs, `/blog/pageN/` and `/atom.xml` don't change.

## Open questions

None. The prototype answered them.
