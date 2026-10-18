# Navigation

The sticky, see-through bar at the top of every page: the mark and wordmark on the left, two or three links, the Contact pill and the theme button on the right.

## Use

- `.site-header > nav.site-nav`: it's sticky at the top, with 16px gutter padding above. The bar is `content-max` wide, on `color-surface-strong` with a 16px backdrop blur, `border-thick` and square corners. Without `backdrop-filter` support it falls back to solid `color-page`. It has no shadow.
- The brand is the JL mark at 23px tall, then a 24px gap and "J. LAW. Cordova" in `wordmark`. Links are uppercase Silkscreen at 13px with 1px tracking, in `color-ink`, and turn `color-accent` on hover.
- At 720px and below, the links and the Contact pill hide behind a menu button beside the brand. The button is icon only, with no text and no border: a 44px tap target holding a pixel three-bar glyph, which becomes a pixel × while the menu is open. It carries `aria-expanded`, `aria-controls` and an `aria-label` ("Open menu" or "Close menu").
- The open menu drops below a `border-thick` rule inside the bar. The links stack as full-width 44px rows, with the Contact pill full width at the bottom. Choosing a link closes the menu. The links stagger in with Motion, and appear at once under reduced motion.
- The links are Range, Achievements and Blog. Range and Achievements point at their home page sections, and Achievements shows only when that section renders.
- The theme button cycles the theme choice: Auto (the default, following the system), Light, then Dark (see the brand book's Dark theme). It has the menu button's shape: icon only, no border, a 44px target. Its glyph shows the current choice: a half-filled pixel square for Auto, a pixel sun for Light and an empty pixel square for Dark. Its name and tooltip say it too: "Theme: Auto", "Theme: Light" or "Theme: Dark". It sits right of the Contact pill on wide screens and left of the menu button at 720px and below, and shows only with JavaScript.
- Where the full wordmark can't share the row (a header under 420px, or 673px to 752px with every link), it steps down to 14px, and to 10px in a header under 330px, so the closed bar stays one row.
- The bar stays square at every width.

## What you provide

- The links (three at most) and the pill's target.

## Don't

- Don't add more than one pill.
- Don't add a shadow to the bar.
- Don't show the menu button above 720px, or give it or the theme button a text label or a border.
- Don't put the theme button inside the menu: it stays in the bar at every width.
