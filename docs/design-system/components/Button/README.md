# Button

A link-styled action in two weights: primary for the one thing to do next, ghost for everything else.

## Use

- **Primary** (`.btn.btn--primary`): one per view. It's set in `button-primary` (Silkscreen, uppercase) on `color-accent`, with `border-thick`. While pressed it moves 2px down and right, so it reads as a key.
- **Ghost** (`.btn.btn--ghost`): secondary actions. It's set in Silkscreen, uppercase, on `color-surface-ghost` with `border-thick`. On hover the fill turns `color-card`.
- Both are 52px tall with 24px of horizontal padding, square corners, no shadow, and a 10px gap for an optional icon.

## What you provide

- An `<a>` (or `<button>`) with the classes, and a label of one to three words. It's either plain and says what happens next ("Read the plan", not "Learn more"), or gamified under the README's Gamified copy rules ("Press start").

## Don't

- Don't put two primaries side by side.
- Don't use exclamation marks or hype in labels.
- Don't round the corners or add a shadow.
- The label must say what it does. Don't rely on the border alone to show it's a control.
