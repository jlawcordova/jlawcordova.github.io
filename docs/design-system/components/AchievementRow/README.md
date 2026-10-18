# AchievementRow

One record as a list row: a framed pixel icon, a short title and line, and a date. A done row opens to the plain title, the full description, tags and links. A locked row shows what is still open. The tally of earned and locked achievements, and the Latest chip, go with it.

## Use

- `ul.achievement-list > li.achievement[data-state]`: rows on `color-surface` with a 3px `color-border` edge and square corners, at least 84px tall, with a 12px gap between them.
- The row grid is icon (60px), text, date and chevron. The title is in `row-lead`, the line in `row-short` (`color-ink-muted`) and the date in `label`. At 480px and below, the date stacks under the text.
- `data-state="done"` uses a `<details>`. The panel eases open in 0.25s with Motion, or opens instantly under reduced motion. Rows stagger in as the list scrolls into view, and each earned frame hops 8px once as its row lands (see the README's Motion section). On mouse devices a tooltip shows the full description: `color-page` on `color-ink` with `border-thick`, and no shadow.
- `data-state="locked"`: transparent, with a 3px dashed `color-border-strong` edge. It always takes the plain frame. Only the achievement's own icon dims to 40% grey; the padlock over the frame's corner and the frame keep their full colors, and the text keeps full strength. The date slot says "Not done yet".
- **The framed icon** (`span.achievement__icon`, drawn by `AchievementIcon.astro`): a 20px frame cell from `src/assets/pixel-art/achievement-frames.svg` at 60px, with the 16px icon cell from `src/assets/pixel-art/achievement-icons.svg` at 48px, 6px in from the top and left. Put `<AchievementIcons />` on the page once (it inlines both sheets), then crop with `<svg viewBox="<20 × frame index> 0 20 20"><use href="#achievement-frames"/></svg>` and `<svg viewBox="<16 × icon index> 0 16 16"><use href="#achievement-icons"/></svg>`. The frame is the icon's kind of work, from `ICONS` in `src/lib/achievement-icons.mjs`.
- **The tally** (`ul.achievement-tally`): Silkscreen chips under the subtitle. "N earned" is `color-gold` under `color-ink` with `border-thick`, and carries `data-theme="light"` so it stays ink on gold in the dark theme; "N locked" has a locked row's dashed edge and follows the theme. A count of 0 isn't shown. They count every record, never a page, and never read as progress.
- **Latest** (`span.achievement__latest`, with `data-theme="light"`): an 11px Silkscreen chip, `color-ink` on `color-gold` in both themes, beside the newest earned row's title (both in `span.achievement__heading`, so the title's text stays its own). One per list.

## What you provide

- An icon index and its frame, a short title, an optional line, and a month or range. For done rows, also the plain title, the description, tags and links. For the tally, the two totals.

## Content

- The short title is a fun title in the README's Gamified copy voice. The short line says plainly what was done, in five to seven words. The plain title in the panel says exactly what was done. A locked row's text says it's not done yet.
- The list headings are "Earned achievements" and "Locked achievements", each with a plain line under it.
- Examples, all made up:

| Row | Fun title | Short line | Plain title (panel) |
| --- | --- | --- | --- |
| Done | Night Owl | Nightly loads finish before 06:00. | Moved the nightly loads to a lakehouse |
| Done | Lore Keeper | On-call steps for every pipeline. | Documented the data platform's on-call runbook |
| Locked | Spring Cleaning | Retire the old nightly ETL jobs. | — (date slot: "Not done yet") |

## Don't

- Don't add a key to the frame colors. The icon says the kind.
- Don't color a frame with CSS. Frames are pixel art, drawn in their sheet.
- Don't put Latest on more than one row, or show a progress figure in the tally.
