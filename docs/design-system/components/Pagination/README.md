# Pagination

Numbered page links for the blog and the accomplishments lists.

## Use

- `.pagination > .pagination__link`: at least 44 × 44px, square corners, `pill` type, `color-surface-ghost` with `border-thick`.
- The current page (`aria-current="page"`) inverts to `color-page` on `color-ink`, with no shadow.

## What you provide

- The links, with `aria-current="page"` on the current one.
