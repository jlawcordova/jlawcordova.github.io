# Intent: Achievements redesign
Author: J. Law. Cordova (site owner). Status: done, 2026-10-18: built and merged in [#124](https://github.com/jlawcordova/jlawcordova.github.io/pull/124). The owner reviewed the design in a canvas on 2026-10-17 and 2026-10-18, then asked for the intent, spec, plan and code to be written together and taken to one PR, so merging that PR accepted all of them.

## Problem
The accomplishments section on the home page and the full list at `/accomplishments/` are plain: ink on warm paper, with the icons sitting loose beside each row. They could use more of a pop of color.

The rows already borrow from games (fun titles, icons, locked rows), but the headings don't: the section is called "What I've been working on lately" and the page "Accomplishments". Nothing marks the moment a reader reaches the section.

## Proposed outcome
A redesigned section and page that are more colorful and more playful, while still following the design system.

- **Gamified headings.** "Achievements" instead of "Accomplishments", with "Earned achievements" and "Locked achievements" for the two lists.
- **A plain subtitle beside them,** in the spirit of "I keep a log of my recent accomplishments. Here's what I've been up to lately." It shouldn't explain that the list is written like a game's: the content speaks for itself.
- **Framed icons.** Each icon sits in a frame with a background, color coded. There's no key to the colors on the page.
- **An "Achievement unlocked!" toast** that appears when the reader reaches the Achievements section. It keeps its exclamation mark, as an exception to the brand book's rule.
- **Fun motion,** such as a stagger as the rows come in.
- **The URL follows the name.** The full list moves to an achievements URL, and the old accomplishments URLs redirect to it.
- **The nav link is renamed "Achievements".**

## Affected users and systems
Home page visitors, the home page's achievements section, the full list page and its URLs, the site navigation, the achievement icon art, and the design system's brand book and component guidelines.

## Constraints
- Follow the design system: its tokens, square corners, no shadows, the Motion rules, the focus ring, 44px tap targets and `prefers-reduced-motion`. The toast's exclamation mark is the one agreed exception.
- No new dependencies.
- Links to the old accomplishments URLs keep working.
- Public-safe, as `CLAUDE.md` requires.
- Post URLs, `/blog/pageN/` and `/atom.xml` don't change.
- Out of scope: the accomplishment records themselves, how they're written and fetched, and the icon set's pictures.

## Open questions
None left after the canvas review. The spec decides the details.
