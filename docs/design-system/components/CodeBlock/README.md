# CodeBlock

Inline code and fenced code blocks, with Prism token colors on an ink ground.

## Use

- Inline `code`: 0.9em `font-code` on `color-card`, with `radius-chip` corners. It wraps anywhere.
- `pre`: `color-page` on `color-ink`, `radius-button` corners, 16px × 20px padding, `code-block` type and `shadow-pixel-accent`. Long lines scroll inside the block and never wrap.
- Token colors are the `syntax-*` tokens. Each one is at least 4.5:1 on ink. Diffs use `syntax-inserted` and `syntax-deleted` backgrounds.

## What you provide

- Prism-highlighted markup (`.token.<kind>` spans). Unlisted tokens fall back to `color-page`.

## Note

- Prism puts `token range` on spans. Scope page rules (`section.range`) so they don't style code.
