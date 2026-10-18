# CodeBlock

Inline code and fenced code blocks, with Prism token colors on a dark ground in both themes.

## Use

- Inline `code`: 0.9em `font-code` on `color-card`, with square corners. It wraps anywhere.
- `pre`: `color-on-code` on `color-code`, square corners, 16px × 20px padding and `code-block` type. `color-code` is the light theme's ink and stays the same in the dark theme, so code reads the same in both. No shadow: the fill is its edge. Long lines scroll inside the block and never wrap.
- Token colors are the `syntax-*` tokens. Each one is at least 4.5:1 on `color-code`. Diffs use `syntax-inserted` and `syntax-deleted` backgrounds.

## What you provide

- Prism-highlighted markup (`.token.<kind>` spans). Unlisted tokens fall back to `color-on-code`.

## Note

- Prism puts `token range` on spans. Scope page rules (`section.range`) so they don't style code.
