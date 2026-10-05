# Register

A dense table of assumptions and risks, each with a rating, an owner and a next step. **Intentional addition:** this isn't on the site. It makes "call out risks openly" something you can see at a glance.

## Use

- `.register > table`: a `color-surface` box with square corners. It scrolls sideways inside itself on narrow screens, never the page.
- Headers and the caption are `label`. IDs (`A-` assumptions, `R-` risks) are `font-code` in `color-ink-muted`. Rows are 15px and separated by `color-border`.
- Rating chips (`.rating`): `--high` is `color-page` on `color-ink`, `--medium` is `color-ink` on `color-gold`, and `--low` is `color-ink` on `color-card`. They differ in lightness, not just hue, and always carry the word.

## What you provide

- Rows with an ID, a one-line item, a rating word, an owner and a next step. An assumption that hasn't been checked is rated "Unconfirmed".

## Don't

- Don't use red/amber/green. Don't leave the owner blank. If no one owns a row, that's the risk.
