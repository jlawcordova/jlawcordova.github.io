# Intent: A pixel-first look, with Motion transitions
Author: J. Law. Cordova (site owner). Status: accepted. Amended 2026-10-05 while writing the spec: the home page proposal wins over the design system, the nav keeps its blur, the hero greeting goes, Motion's packages and budget are approved, and the footer's grass is in scope.

## Problem

The design system rounds corners almost everywhere: buttons, the Contact pill, the navigation bar, cards, rows and stages. It gets depth from hard pixel shadows on buttons, code blocks, tooltips and the current page in pagination. Its buttons and nav links are set in Sora. That doesn't match the pixel art the site is built around. I'm leaning towards square-ish looks that match the pixel-art vibe, and away from rounded corners.

The site also feels static. Transitions are limited to a few CSS fades and sprite steps, and I want it to feel more delightful.

## Proposed outcome

- **Square corners everywhere.** No UI element has rounded corners, including buttons, the Contact pill and the navigation bar.
- **No shadows.** Buttons and everything else that used a hard shadow get a thick border instead.
- **No shadow on the nav bar.** The navigation bar loses its shadow. It keeps a see-through fill with a backdrop blur, as the home page proposal draws it.
- **Pixel type on every button and link in the nav.** All buttons and the navigation links use the pixel font. The hero's greeting line goes, as in the proposal.
- **A menu button on small screens.** On mobile, the nav shows an icon-only menu button with no text and no border, and the links stay hidden until it's pressed.
- **The footer is a grass block.** It stays mostly dirt-colored, with a grass layer along the top.
- **Motion where it helps.** The site uses the Motion library (formerly Framer Motion) wherever possible to make the experience delightful, with transitions on the components where they fit.
- **The home page looks like the proposal.** The site is built to match my home page proposal on the design canvas. Where the proposal and the design system disagree, the proposal wins.
- **The design system says so.** Its guidance describes all of the above, and changes wherever the proposal differs from it, so later work follows it.

## Affected users and systems

- **Site visitors:** every page, since buttons, the navigation, cards, rows, code blocks, pagination and the footer all change, and pages gain transitions.
- **The design system:** its principles, shape and depth, type, motion and component guidance, its tokens and its previews.
- **Dependencies:** the site gains the `motion` package and the packages it installs with it (`framer-motion`, `motion-dom`, `motion-utils` and `tslib`). I approve adding them, and raising the home page's JavaScript budget to fit them.
- **Future work:** anything built from the design system, including the proposed home page redesign with the Range on a handheld console.

## Constraints

- The visible focus ring, 44px tap targets and `prefers-reduced-motion` support stay.
- Colors stay as they are, except the nav's see-through fill, which follows the proposal.
- Pages still work and show all their content without JavaScript.
- Out of scope: the pixel art itself, except a new grass tile for the footer.

## Open questions

- None. The navigation bar keeps its backdrop blur, as the proposal draws it.
