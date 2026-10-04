# Intent: A pixel-first look, with Motion transitions
Author: J. Law. Cordova (site owner). Status: draft.

## Problem

The design system rounds corners almost everywhere: buttons, the Contact pill, the navigation bar, cards, rows and stages. It gets depth from hard pixel shadows on buttons, code blocks, tooltips and the current page in pagination. Its buttons and nav links are set in Sora. That doesn't match the pixel art the site is built around. I'm leaning towards square-ish looks that match the pixel-art vibe, and away from rounded corners.

The site also feels static. Transitions are limited to a few CSS fades and sprite steps, and I want it to feel more delightful.

## Proposed outcome

- **Square corners everywhere.** No UI element has rounded corners, including buttons, the Contact pill and the navigation bar.
- **No shadows.** Buttons and everything else that used a hard shadow get a thick border instead.
- **Pixel type on every button and link in the nav.** All buttons and the navigation links use the pixel font. The hero's greeting ("Hi, I’m J. Law. Cordova.") does too.
- **The footer is a grass block.** It stays mostly dirt-colored, with a grass layer along the top.
- **Motion where it helps.** The site uses the Motion library (formerly Framer Motion) wherever possible to make the experience delightful, with transitions on the components where they fit.
- **The design system says so.** Its guidance describes all of the above, so later work, including the proposed home page redesign, follows it.

## Affected users and systems

- **Site visitors:** every page, since buttons, the navigation, cards, rows, code blocks, pagination and the footer all change, and pages gain transitions.
- **The design system:** its principles, shape and depth, type, motion and component guidance, its tokens and its previews.
- **Dependencies:** the site gains the `motion` package. I approve adding it.
- **Future work:** anything built from the design system, including the proposed home page redesign with the Range on a handheld console.

## Constraints

- The visible focus ring, 44px tap targets and `prefers-reduced-motion` support stay.
- Colors stay as they are.
- Pages still work and show all their content without JavaScript.
- Out of scope: the pixel art itself.

## Open questions

- Should the navigation bar keep its backdrop blur?
