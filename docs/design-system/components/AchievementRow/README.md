# AchievementRow

One record as a list row: a pixel icon, a short title and line, and a date. A done row opens to the plain title, the full description, tags and links. A locked row shows what is still open.

## Use

- `ul.achievement-list > li.achievement[data-state]`: rows on `color-surface` with a `color-border` hairline and `radius-card` corners, at least 72px tall, with a 10px gap between them.
- The row grid is icon (48px), text, date and chevron. The title is in `row-lead`, the line in `row-short` (`color-ink-muted`) and the date in `label`. At 480px and below, the date stacks under the text.
- `data-state="done"` uses a `<details>`. The panel animates open in 0.25s, or instantly under reduced motion. On mouse devices a tooltip shows the full description: `color-page` on `color-ink` with `shadow-pixel-accent`.
- `data-state="locked"`: transparent, with a dashed `color-border-strong` outline. The icon dims to 40% grey with a padlock in the corner, and the text keeps full strength. The date slot says "Not done yet".
- Icons are 16px cells from `src/assets/pixel-art/achievement-icons.svg`, drawn at 48px. Put `<AchievementIcons />` on the page once, then crop a cell with `<svg viewBox="<16 × index> 0 16 16"><use href="#achievement-icons"/></svg>`.

## What you provide

- An icon index, a short title, an optional line, and a month or range. For done rows, also the plain title, the description, tags and links.

## Content

- The short title can be playful. The plain title in the panel must say exactly what was done. A locked row's line says what blocks it.
