# Navigation

The sticky, frosted pill bar at the top of every page: the mark and wordmark on the left, two or three links and the Contact pill on the right.

## Use

- `.site-header > nav.site-nav`: it's sticky at the top, with 16px gutter padding above. The bar is `content-max` wide, on `color-surface-strong` with a 16px backdrop blur, a `color-border` hairline, `shadow-nav` and `radius-pill` corners.
- The brand is the JL mark at 20px tall beside "J.LAW" in `wordmark`. Links are `nav-link` (14px) in `color-ink`, and turn `color-accent` on hover.
- At 480px and below, the links wrap under the brand, and the bar takes `radius-panel` so it doesn't turn into a tall stadium. There's no drawer.

## What you provide

- The links (three at most) and the pill's target.

## Don't

- Don't add a hamburger menu or more than one pill.
