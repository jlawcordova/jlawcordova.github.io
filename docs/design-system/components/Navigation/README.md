# Navigation

The sticky, see-through bar at the top of every page: the mark and wordmark on the left, two or three links and the Contact pill on the right.

## Use

- `.site-header > nav.site-nav`: it's sticky at the top, with 16px gutter padding above. The bar is `content-max` wide, on `color-surface-strong` with a 16px backdrop blur, `border-thick` and square corners. Without `backdrop-filter` support it falls back to solid `color-page`. It has no shadow.
- The brand is the JL mark at 23px tall, then a 24px gap and "J. LAW. Cordova" in `wordmark`. Links are uppercase Silkscreen at 13px with 1px tracking, in `color-ink`, and turn `color-accent` on hover.
- At 720px and below, the links and the Contact pill hide behind a menu button beside the brand. The button is icon only, with no text and no border: a 44px tap target holding a pixel three-bar glyph, which becomes a pixel × while the menu is open. It carries `aria-expanded`, `aria-controls` and an `aria-label` ("Open menu" or "Close menu").
- The open menu drops below a `border-thick` rule inside the bar. The links stack as full-width 44px rows, with the Contact pill full width at the bottom. Choosing a link closes the menu. The links stagger in with Motion, and appear at once under reduced motion.
- The bar stays square at every width.

## What you provide

- The links (three at most) and the pill's target.

## Don't

- Don't add more than one pill.
- Don't add a shadow to the bar.
- Don't show the menu button above 720px, or give it a text label or a border.
