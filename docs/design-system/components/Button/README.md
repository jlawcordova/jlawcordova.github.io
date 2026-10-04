# Button

A link-styled action in two weights: primary for the one thing to do next, ghost for everything else.

## Use

- **Primary** (`.btn.btn--primary`): one per view. It's set in `button-primary` (Silkscreen) on `color-accent`, with `shadow-pixel`. While pressed it moves 2px and drops to `shadow-pixel-pressed`, so it reads as a key.
- **Ghost** (`.btn.btn--ghost`): secondary actions. It's set in `button-ghost` (Sora 500) on `color-surface-ghost` with a `color-border-strong` outline.
- Both are 52px tall with 24px of horizontal padding, `radius-button` corners, and a 10px gap for an optional icon.

## What you provide

- An `<a>` (or `<button>`) with the classes, and a label of two or three words that says what happens next: "Read the plan", not "Learn more".

## Don't

- Don't put two primaries side by side.
- Don't use exclamation marks or hype in labels.
- The ghost outline is 1.4:1. Never rely on the outline alone to show it's a control. The label must say what it does.
