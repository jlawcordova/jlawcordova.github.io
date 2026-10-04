# Card

The frosted list surface, used for post cards and anything else shown as a grid of linked items.

## Use

- `.card`: `color-surface` fill, `color-border` hairline, square corners, no shadow, `space-card-pad-y` × `space-card-pad-x` padding. When it's a link (`a.card`), hover strengthens it to `color-border-strong` over `color-surface-ghost`.
- `.post-card` stacks a `label` (the date) over a `card-title`. The title turns `color-accent` on hover.
- Lay cards out in `.post-list`, an auto-fill grid with a 300px minimum and a 12px gap.

## What you provide

- A date or category label and a title. Keep titles to what the item is. Don't write teasers.
