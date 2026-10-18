# Spec: Dark mode (from intent.md 2026-10-17)
Status: proposed with its build in one PR; approved by merging it.

## Requirements

- **R1.** Every page has a light theme (today's colors, unchanged) and a dark theme.
- **R2.** With no choice saved, a page follows the reader's system setting (`prefers-color-scheme`), including when it changes while the page is open.
- **R3.** A theme button sits in the nav bar on every page. Pressing it switches the theme at once, and the choice is saved in the browser and used on every later page.
- **R4.** The saved or system theme is applied before first paint, so no page flashes light before turning dark.
- **R5.** The button is a 44px icon-only target with the site's visible focus ring. It's a toggle (`aria-pressed`, true when dark) with the fixed name "Dark theme". It shows a half-filled pixel square in light and a pixel sun in dark (a crescent at first; the owner asked for the square in review, 2026-10-18). It's shown only with JavaScript, since it does nothing without it.
- **R6.** In the dark theme every text pair used today stays AA: `color-ink` and `color-ink-muted` on `color-page`, `color-hero` and `color-card` at 4.5:1 or better, `color-accent` and its hover on the same grounds, and `color-on-accent` on `color-accent`.
- **R7.** Code blocks keep their dark ground and the `syntax-*` colors in both themes (every syntax color is already 4.5:1 or better on it).
- **R8.** The Range handheld keeps its light colors in both themes: it's a drawn object, and its gold-on-ink keys don't work inverted.
- **R9.** The browser's `theme-color` and `color-scheme` follow the theme, so the address bar, scrollbars and form controls match.
- **R10.** The nav bar stays one row at 390px with the button beside the menu button, and no page scrolls sideways at 390px or 1440px in either theme.
- **R11.** `tokens.json` records each color token's dark value next to its light one, and a test keeps them in step with `variables.css` and checks R6.

## Design

### Tokens
`variables.css` keeps the light colors on `:root` and also applies them to `[data-theme="light"]`, so an element can pin the light theme for itself and its children (R8). A second block, `[data-theme="dark"]`, sets the dark values, and each block sets `color-scheme`. Non-color tokens stay on `:root` alone.

| Token | Light | Dark |
| --- | --- | --- |
| `color-page` | `#F4EDE0` | `#1C1712` |
| `color-hero` | `#EADFC8` | `#262019` |
| `color-card` | `#E9DCC6` | `#2D251C` |
| `color-surface` | `rgba(250, 245, 235, 0.55)` | `rgba(45, 37, 28, 0.55)` |
| `color-surface-strong` | `rgba(250, 245, 235, 0.78)` | `rgba(28, 23, 18, 0.78)` |
| `color-surface-ghost` | `rgba(250, 245, 235, 0.6)` | `rgba(45, 37, 28, 0.6)` |
| `color-ink` | `#2E2418` | `#F1E8D8` |
| `color-ink-muted` | `#5C4B39` | `#C8B9A1` |
| `color-border` | `rgba(90, 62, 43, 0.16)` | `rgba(241, 232, 216, 0.16)` |
| `color-border-strong` | `rgba(90, 62, 43, 0.22)` | `rgba(241, 232, 216, 0.24)` |
| `color-grid` | `rgba(90, 62, 43, 0.06)` | `rgba(241, 232, 216, 0.06)` |
| `color-accent` | `#3F6B45` | `#8CBC86` |
| `color-accent-hover` | `#2E4F33` | `#A8D1A1` |
| `color-on-accent` | `#F6F0E3` | `#1C1712` |

Measured: ink 14.6:1 on page, 12.4:1 on card; ink-muted 9.2:1 and 7.8:1; accent 8.2:1 and 6.9:1; on-accent on accent 8.2:1. `color-earth`, `color-gold`, the forest and footer colors and the `syntax-*` colors are the same in both themes: they're already dark grounds or illustration colors.

Two new tokens for code blocks (R7), the same in both themes: `color-code` `#2E2418` (the block's ground, which was `color-ink`) and `color-on-code` `#F4EDE0` (its text, which was `color-page`). Inverted fills that read either way, such as the tooltip and the current page in pagination, keep `color-ink` on `color-page` and simply flip.

### Theme script
`BaseLayout.astro`'s pre-paint inline script also sets `<html data-theme>`: the saved `theme` from `localStorage` if it's `light` or `dark`, else `dark` when `prefers-color-scheme: dark` matches, else `light`, and sets the `theme-color` meta to the page color. Storage errors fall back to the system setting (R2, R4, R9). Without JavaScript the page has no `data-theme` and so stays light.

### Button
`Navigation.astro` adds `button.site-nav__theme` after the links: the same 44px, borderless, icon-only shape as the menu button, with two `crispEdges` glyphs (the half square, the sun) that CSS swaps by `data-theme`. Its script toggles `data-theme`, saves the choice, updates `aria-pressed` and `theme-color`, and follows system changes until a choice is saved. On wide screens the links take the free space (`margin-left: auto`) so the button sits right of the Contact pill; at 720px and below (with JavaScript) the links move to the end of the flex order, and the button sits left of the menu button. The wordmark's container-query step-down (18px to 14px) now starts in a header under 420px, and also runs in a header of 673px to 752px, where every link, Lately included, and the button share the row. A further step to 10px, with no gap between the two buttons, keeps the bar one row in a header under 330px, on phones down to 320px (R10).

### Pixel art
The art isn't redrawn, but in the dark theme the hero island's dithered shadow takes `color-page` (a little darker than the band) instead of its light `path-2`, so it settles into the ground rather than reading as a pale hatch. CSS sets the fill on that group's path; the group's opacity stays free for the entrance. The owner asked for this in review, 2026-10-18.

### Range handheld
`.range__console` gets `data-theme="light"`, so its tokens stay light inside the forest section (R8).

### Docs
The brand book gains a "Dark theme" part under Color. The Navigation and CodeBlock guidelines and previews mention the button and the new code tokens. `tokens.json` adds `dark` to `color.themes` and a `dark` value to each color token that changes.

## Areas of concern
- **The pixel art isn't redrawn** (out of scope). The hero island sits on the dark hero band as it is, apart from its shadow (see Pixel art); it's drawn with its own outlines, so it reads, but it was tuned against the light band.
- **Without JavaScript the site stays light,** even with a dark system setting. Doing otherwise needs the dark values repeated in a `prefers-color-scheme` media block; the spec chooses one copy of the values.
- **Process.** The owner asked for the change and its build together, so intent, spec, plan and code come in one PR, and the owner accepts all four by merging it.

## Open questions
None.
