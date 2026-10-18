# Intent: Dark mode
Author: J. Law. Cordova (site owner). Status: proposed with its build in one PR; accepted by merging it.

## Problem
The site only has a light theme. Readers who browse with a dark system theme, or at night, get a bright page with no way to dim it.

## Proposed outcome
"Add a dark mode and its button on the site." The whole site has a dark theme, and a button on every page switches between light and dark.

Added in review (2026-10-18): "Can we include an auto, and have that be the default?" The button also offers Auto, and Auto is the default.

## Affected users and systems
Every reader, on every page: the home page, the blog and its posts, `/accomplishments/`, the 404, and the unlisted lab and design-system pages. The design system's colors and its brand book.

## Constraints
- It still looks like this site: warm, flat, square, the same one accent hue and the same pixel art.
- Text stays readable (AA or better), with the focus ring, 44px targets and reduced-motion support kept.
- No new dependencies, and no CSS or UI framework.
- Post URLs, `/blog/pageN/` and `/atom.xml` don't change.
- Out of scope: redrawing the pixel art for the dark theme.

## Open questions
None from the owner. The spec proposes the details.
