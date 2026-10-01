# Spec: Isometric pixel-art redesign

| | |
| --- | --- |
| **Status** | Draft |
| **Intent** | [`docs/intents/intent-redesign.md`](../intents/intent-redesign.md) |
| **Design source** | [J. Law Portfolio canvas](https://claude.ai/artifact/JhKbkNZP9qGWHMaWE8USbR), artboard "Prototype B — isometric" (`project/Isometric.dc.html`) |
| **Content source** | [`docs/references/profile.md`](../references/profile.md) |
| **Created** | 2026-10-01 |

This spec turns the intent into buildable detail: files, tokens, components, behavior, budgets and checks. The intent says *what* and *why*; this says *how*. If the spec and the intent conflict, the intent wins and this spec gets fixed.

## 1. Decisions adopted

The intent's open decisions are taken at their defaults. To change one, update the intent's Decisions table first, then this section.

| # | Decision | Adopted |
| --- | --- | --- |
| 1 | Recent blog posts on home | **Dropped.** Blog is linked from the nav and footer. |
| 2 | Contact target | **LinkedIn** (`site.author.linkedin`) for both "Contact" and "Get in touch". |
| 3 | Brand marks | **Keep the existing JL logo**, recolored to the new palette ([§6.2](#62-jl-mark)). Regenerate the favicon, touch icons and manifest icons from it. **Regenerate** the OG image. |
| 4 | Résumé link | **Not linked.** The PDF stays at its URL, untouched. |
| 5 | Post pages | **Token-level restyle** per [§9](#9-secondary-pages), reviewed in the PR. |
| 6 | Twitter → X | Label **"X"**, URL unchanged (`site.author.twitter`). |
| 7 | Range classes | **Front-end, Cloud & DevOps, UX Design, Data Engineering, Project Management.** "Infrastructure" is renamed, the outfit art doesn't change, and no sixth class is added. |
| 8 | Skills list on home | **None.** |

Three deliberate deviations from the mock. D1 and D2 are for accessibility and portability; D3 is the owner's brand choice:

- **D1. Pause control for the Range carousel.** WCAG 2.2.2 requires a way to pause content that moves on its own for more than 5s. A 44px pixel pause/play button sits beside the pager dots ([§6.6](#66-range)).
- **D2. Blog nav link** uses the relative `/blog/` rather than the mock's absolute `https://jlawcordova.com/blog`.
- **D3. Logo.** The mock's isometric cube mark is **not** used. The site keeps J. Law's existing logo: a flat block "J" and "L" built on a square grid. Only its colors change, to the new palette. It stays flat and 2D, with no isometric faces or 3D shading.

## 2. Architecture

The stack stays as it is: Astro 7, TypeScript, plain CSS in `src/styles/`, and Prism for code. No new runtime dependencies.

- **Static by default.** Every page is static HTML and CSS. The only client script is the Range carousel, a small vanilla `<script>` bundled by Astro.
- **The pixel art is inline SVG.** It's inlined, rather than loaded through `<img>`, so that page CSS drives its animations and `prefers-reduced-motion`, and so the carousel can switch sprite variants. The art is imported as `?raw` strings from optimized SVG files and rendered with `set:html`.
- **Content is data.** Highlights and Range classes live in `src/data/home.ts`, typed, and the components map over them. Copy comes from the mock, checked against the profile.

### 2.1 File plan

**Add**

| Path | Purpose |
| --- | --- |
| `src/styles/pixel-art.css` | Crisp rendering, keyframes and reduced-motion rules for all pixel art |
| `src/styles/hero.css`, `src/styles/highlights.css`, `src/styles/range.css` | Home sections |
| `src/styles/buttons.css` | `.btn`, `.btn--primary`, `.btn--ghost`, `.pill` |
| `src/components/JLMark.astro` | The existing JL logo as inline SVG, recolored ([§6.2](#62-jl-mark)) |
| `src/components/home/Hero.astro` | Hero section, including highlights |
| `src/components/home/HeroIsland.astro` | Inlines the hero art SVG |
| `src/components/home/HighlightCard.astro` | One highlight card |
| `src/components/home/Range.astro` | Range section, sprite stage and carousel script |
| `src/data/home.ts` | `highlights` and `rangeClasses` arrays (see [§7](#7-content)) |
| `src/assets/pixel-art/source/hero-island.src.svg` | Hero art exactly as extracted from the mock (rect form) |
| `src/assets/pixel-art/source/range-sprite.src.svg` | Range sprite and island, all five variants, as extracted |
| `src/assets/pixel-art/hero-island.svg` | Optimized output, committed |
| `src/assets/pixel-art/range-sprite.svg` | Optimized output, committed |
| `scripts/optimize-pixel-art.mjs` | Source → optimized converter with a lossless check ([§8](#8-pixel-art-pipeline)) |
| `static/public/favicon.svg` | JL mark favicon |
| `static/public/logo@2x.png` | JL mark at 136×90 |

**Modify**

| Path | Change |
| --- | --- |
| `src/styles/variables.css` | Replaced by the token set in [§3](#3-design-tokens) |
| `src/styles/global.css` | New import list ([§3.5](#35-stylesheet-order)) |
| `src/styles/base.css`, `type.css`, `layout.css` | Rewritten on tokens: Sora body, ink on page ground, link and focus styles |
| `src/styles/navigation.css`, `footer.css` | Rewritten for the pill header and footer bar |
| `src/styles/blog.css`, `blog-item.css`, `posts.css`, `code.css`, `syntax.css`, `page.css` | Restyled per [§9](#9-secondary-pages) |
| `src/layouts/BaseLayout.astro` | Fonts, icons, manifest and theme color; Font Awesome removed |
| `src/components/Navigation.astro` | Pill nav ([§6.1](#61-header-and-nav)) |
| `src/components/Footer.astro` | Footer bar ([§6.7](#67-footer)) |
| `src/pages/index.astro` | Composes `Hero` and `Range`; old sections and the skill-rotator script removed |
| `src/components/BlogPage.astro`, `PostListItem.astro`, `src/pages/blog/*.astro` | Markup for the restyle; adds a page `<h1>` |
| `src/pages/[...slug].astro` | Related posts markup moved to new classes |
| `src/pages/404.astro` | Restyled, same copy |
| `src/site.ts` | New `description` ([§7.4](#74-site-metadata)) |
| `static/public/site.webmanifest` | Name, colors and icon paths (currently wrong: `/android-chrome-*` → `/public/android-chrome-*`) |
| `static/public/logo.svg`, `logo.png`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `apple-touch-icon-precomposed.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png` | Regenerated from the recolored JL mark |
| `static/public/jlawcordova-image.png` | New OG image ([§10](#10-brand-marks)) |
| `package.json` | Adds the script `"art": "node scripts/optimize-pixel-art.mjs"` |
| `README.md` | Project layout table: adds `src/data/`, `src/assets/pixel-art/`, `scripts/` and `docs/` |

**Delete**

| Path | Why |
| --- | --- |
| `src/styles/intro.css`, `bio.css`, `recent-blogs.css`, `home.css`, `masthead.css`, `message.css` | Old home sections; `masthead` and `message` are unused. Related posts move to `posts.css`. |
| `static/public/jlawcordova-cogs.svg`, `graph-background.png`, `graph-background.webp` | Only used by the old intro |
| Font Awesome kit `<script>` in `BaseLayout.astro` | No icon fonts remain; icons are inline SVG |

Keep `static/public/home/jlawcordova-profile.png` and the résumé PDF; they're out of scope.

## 3. Design tokens

### 3.1 `variables.css`

```css
:root {
  /* Ground */
  --color-page: #F4EDE0;
  --color-hero: #EADFC8;
  --color-card: #E9DCC6;
  --color-surface: rgba(250, 245, 235, 0.55);   /* frosted cards */
  --color-surface-strong: rgba(250, 245, 235, 0.62); /* nav */
  --color-surface-ghost: rgba(250, 245, 235, 0.6);   /* ghost button */

  /* Ink */
  --color-ink: #2E2418;
  --color-ink-muted: #5C4B39;
  --color-earth: #5A3E2B;
  --color-border: rgba(90, 62, 43, 0.16);
  --color-border-strong: rgba(90, 62, 43, 0.22);
  --color-grid: rgba(90, 62, 43, 0.06);

  /* Brand */
  --color-accent: #3F6B45;
  --color-accent-hover: #2E4F33;
  --color-on-accent: #F6F0E3;
  --color-gold: #D8B66A;

  /* Dark sections */
  --color-forest: #2F4632;
  --color-on-forest: #F4EDE0;
  --color-on-forest-muted: #D9CFBB;
  --color-on-forest-surface: rgba(244, 237, 224, 0.08);
  --color-on-forest-border: rgba(244, 237, 224, 0.2);
  --color-footer: #3F2B1E;
  --color-on-footer: #E9DCC6;

  /* Highlight markers */
  --marker-wine: #7B2D3B;
  --marker-teal: #5F8C7E;
  --marker-gold: #D8B66A;
  --marker-leaf: #6F8F55;
  --marker-clay: #8A5A34;
  --marker-moss: #3E4A2A;

  /* Type */
  --font-text: 'Sora', 'Segoe UI', system-ui, sans-serif;
  --font-pixel: 'Silkscreen', ui-monospace, monospace;
  --font-code: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;

  /* Shape */
  --radius-pill: 999px;
  --radius-panel: 24px;
  --radius-stage: 16px;
  --radius-card: 14px;
  --radius-button: 10px;
  --shadow-pixel: 4px 4px 0 var(--color-ink);
  --shadow-pixel-sm: 2px 2px 0 var(--color-ink);
  --shadow-nav: 0 8px 24px rgba(46, 36, 24, 0.08);

  /* Layout */
  --content-max: 1160px;
  --reading-max: 720px;
  --gutter: 24px;
  --header-offset: 96px; /* scroll-margin for anchors under the sticky header */
}

@media (max-width: 480px) {
  :root { --gutter: 16px; }
}
```

Media queries can't read custom properties, so breakpoints are written literally: `480px`, `720px` and `960px`.

### 3.2 Contrast (verified)

| Pair | Ratio | Use |
| --- | --- | --- |
| ink on page | 13.05 | Body text |
| ink-muted on page / hero / card | 7.16 / 6.30 / 6.16 | Ledes, card body, labels |
| accent on page / hero | 5.30 / 4.67 | Links, accent heading clause |
| on-accent on accent | 5.44 | Button text |
| on-forest / on-forest-muted / gold on forest | 8.83 / 6.65 / 5.30 | Range section |
| on-footer on footer | 9.85 | Footer |

All of these pass WCAG AA for their sizes. Don't introduce a text/ground pair that isn't in this table without checking it.

### 3.3 Typography

| Role | Font | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Hero H1 | text | `clamp(44px, 5.6vw, 76px)` | 700 | 1.02 | -1.5px |
| Section H2 | text | `clamp(40px, 5vw, 64px)` | 700 | 1.04 | -1px |
| Post H1 | text | `clamp(32px, 4vw, 48px)` | 700 | 1.1 | -0.5px |
| Post H2 / H3 | text | 28px / 22px | 700 / 600 | 1.25 | -0.3px / 0 |
| Pre-title ("Hi, I'm…") | text | 20px | 500 | 1.4 | 0 |
| Lede | text | 18px | 400 | 1.6 (hero), 1.65 (range) | 0 |
| Post body | text | 17px | 400 | 1.75 | 0 |
| Card title | text | 14px | 600 | 1.4 | 0 |
| Card body | text | 13px | 400 | 1.45 | 0 |
| Nav link | text | 14px | 400 | 1 | 0 |
| Wordmark | pixel | 18px | 400 | 1 | 1px |
| Primary button | pixel | 15px | 400 | 1 | 0 |
| Contact pill | pixel | 13px | 400 | 1 | 0 |
| Label / footer / date / category | pixel | 12px | 400 | 1.4 | 1px, uppercase |
| Range nameplate | pixel | 18px | 400 | 1 | 1px |
| Code | code | 14px (blocks), 0.9em (inline) | 400 | 1.6 | 0 |

### 3.4 Fonts

Replace the Merriweather/Roboto `<link>` in `BaseLayout.astro` with:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Silkscreen&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

Silkscreen is loaded at 400 only, because the mock never uses 700.

### 3.5 Stylesheet order

`global.css` imports in this order: `variables`, `base`, `type`, `layout`, `buttons`, `pixel-art`, `syntax`, `code`, `navigation`, `footer`, `hero`, `highlights`, `range`, `blog`, `blog-item`, `posts`, `page`.

## 4. Global styles

- **`body`:** `background: var(--color-page); color: var(--color-ink); font: 400 17px/1.6 var(--font-text); overflow-x: hidden;` (hidden overflow guards against the hero art's `overflow: visible`).
- **Links:** `color: var(--color-accent)`; on hover `var(--color-accent-hover)`. Underline them in post bodies and not in UI chrome.
- **Focus:** `:where(a, button):focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; box-shadow: 0 0 0 5px var(--color-page); }`. On forest and footer grounds, the outline is `var(--color-on-forest)` and the halo is the section ground.
- **Anchors:** `[id] { scroll-margin-top: var(--header-offset); }` and `html { scroll-behavior: smooth; }`, with the smooth scroll removed under reduced motion.
- **`.isogrid` utility:** `background-image: linear-gradient(26.57deg, var(--color-grid) 1px, transparent 1px), linear-gradient(-26.57deg, var(--color-grid) 1px, transparent 1px); background-size: 32px 16px;`
- **`.container`:** `max-width: var(--content-max); margin-inline: auto; padding-inline: var(--gutter);`
- **`.visually-hidden`:** the standard clip pattern, for screen-reader-only text.

## 5. Buttons

| Class | Spec |
| --- | --- |
| `.btn` | `display: inline-flex; align-items: center; gap: 10px; min-height: 52px; padding: 0 24px; border-radius: var(--radius-button); text-decoration: none; font-size: 15px;` |
| `.btn--primary` | `background: var(--color-accent); color: var(--color-on-accent); font-family: var(--font-pixel); box-shadow: var(--shadow-pixel);` On hover, `background: var(--color-accent-hover)`. When active, `transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--color-ink)`, so it reads as a pressed key. |
| `.btn--ghost` | `background: var(--color-surface-ghost); border: 1px solid var(--color-border-strong); color: var(--color-ink); font-family: var(--font-text); font-weight: 500;` On hover, `background: var(--color-page)`. |
| `.pill` | `display: inline-flex; align-items: center; min-height: 44px; padding: 0 18px; border-radius: var(--radius-pill); background: var(--color-accent); color: var(--color-on-accent); font: 13px var(--font-pixel); text-decoration: none;` |

## 6. Components

### 6.1 Header and nav

`Navigation.astro` renders:

```html
<header class="site-header">
  <nav class="site-nav" aria-label="Main">
    <a class="site-nav__brand" href="/"><JLMark /> J.LAW</a>
    <div class="site-nav__links">
      <a href="/#range">Range</a>
      <a href="/blog/">Blog</a>
      <a class="pill" href={site.author.linkedin}>Contact</a>
    </div>
  </nav>
</header>
```

- **Header:** `.site-header` is `position: sticky; top: 0; z-index: 20; display: flex; justify-content: center; padding: 16px var(--gutter) 0`.
- **Nav:**
  - `.site-nav` is `width: 100%; max-width: var(--content-max); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 10px 10px 22px; border-radius: var(--radius-pill); background: var(--color-surface-strong); border: 1px solid var(--color-border); box-shadow: var(--shadow-nav); backdrop-filter: blur(16px) saturate(130%)`, plus the `-webkit-` prefix.
  - Where `backdrop-filter` isn't supported, fall back to `background: var(--color-page)`, using `@supports not (backdrop-filter: blur(1px))`.
- **Brand:** the brand link is `font: 18px var(--font-pixel); letter-spacing: 1px; color: var(--color-ink)` with a 10px gap to the mark. Off the home page it links to `/`; on the home page it links to `#top`.
- **Text links:** `font-size: 14px; padding: 12px 14px; color: var(--color-ink)`, which gives a 44px target.
- **Small screens:** the nav wraps, and there's no drawer. Below 480px the link group takes the full width and the pill keeps its size.
- **Removed:** the drawer button and its script.

### 6.2 JL mark

The logo is the existing `static/public/logo.svg`. It's a "J" and an "L" drawn as flat blocks on a 15-unit square grid, so each letter reads as a few stacked squares. **Keep its geometry exactly as it is.** Only the colors change:

| Letter | Old color | New color |
| --- | --- | --- |
| J (left) | `#EC407A` (pink) | `var(--color-accent)`, `#3F6B45` |
| L (right) | `#1B1B1B` | `var(--color-ink)`, `#2E2418` |

It's flat, with no isometric faces, no earth side and no shading. It stays two letters, not a single cube.

`JLMark.astro` renders the old file's eleven overlapping `<rect>`s merged into two paths. The outline is identical to the old file:

```html
<svg viewBox="0 0 68 45" width="30" height="20" shape-rendering="crispEdges" aria-hidden="true" class="jl-mark">
  <path fill="var(--color-accent)" d="M15 0h15v45H0V30h15z" />  <!-- J -->
  <path fill="var(--color-ink)" d="M38 0h14v30h16v15H38z" />    <!-- L -->
</svg>
```

- **Size:** a `height` prop sets the size, and the width follows the 68:45 ratio. The default is 20px high, about 30px wide, in the nav.
- **Accent swaps:** the J uses the accent token, so it follows if the accent changes.
- **Dark grounds** (only if the mark is ever placed on forest or footer): J in `var(--color-gold)`, L in `var(--color-on-forest)`. The site doesn't use this variant yet.
- **Other assets:** the static logo, favicons and OG image all use this geometry ([§10](#10-brand-marks)).

### 6.3 Hero

The hero is a `<section id="top" class="hero isogrid">` with `background-color: var(--color-hero); padding: 72px var(--gutter) 96px; overflow: hidden`.

- **`.hero__inner`:** `.container` plus `display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 40px`.
- **Copy column:** `flex: 1 1 480px; max-width: 600px; display: flex; flex-direction: column; gap: 22px`. In order:
  1. `<p class="hero__pretitle">`: pre-title.
  2. `<h1>`: the H1, with its second clause in `<span class="accent">`.
  3. `<p class="hero__lede">`: the lede, `max-width: 540px`, ink-muted.
  4. The button row, `display: flex; flex-wrap: wrap; gap: 14px; padding-top: 6px`, holding `<a class="btn btn--primary" href="#range">Press start</a>` and `<a class="btn btn--ghost" href={linkedin}>Get in touch</a>`.
- **Art column:** `flex: 1 1 460px; display: flex; justify-content: center` with class `floaty`. It holds `<HeroIsland />`, which outputs the SVG at `width: 675px; max-width: 100%; height: auto; display: block; overflow: visible`, with `aria-hidden="true"`.
- **Highlights block:**
  - Placement: `.container` with `margin-top: 56px; display: flex; flex-direction: column; gap: 14px`.
  - Label row: `display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px`, in pixel 12px, ink-muted. It reads `HIGHLIGHTS` and `DAVAO CITY, PH · UTC+8`.
  - Grid: `<ul class="highlights" role="list">`, `display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 12px; list-style: none; padding: 0; margin: 0`.

### 6.4 Highlight card

`HighlightCard.astro` takes props `{ title: string; body: string; marker: MarkerColor }` and renders `<li class="highlight">`.

- **Card:** `border-radius: var(--radius-card); padding: 14px 16px; background: var(--color-surface); border: 1px solid var(--color-border); display: flex; gap: 12px; align-items: flex-start`.
- **Marker:** `<span class="highlight__marker" aria-hidden="true">`, `flex-shrink: 0; width: 10px; height: 10px; margin-top: 5px; background: var(--marker-*); box-shadow: var(--shadow-pixel-sm)`.
- **Text:** `<strong>` for the title and `<span>` for the body, in a column with a 2px gap, using the card type from [§3.3](#33-typography).

### 6.5 Hero island art

- The source is the mock's hero `<svg>` (`viewBox="-100 -84 225 212"`, `shape-rendering="crispEdges"`), unchanged in content.
- It's optimized per [§8](#8-pixel-art-pipeline). The optimizer keeps these animation group classes, which `pixel-art.css` targets:

| Class | What it animates |
| --- | --- |
| `pcloud pc0..pc2` | Clouds drifting |
| `itruck it1, it2` | Two trucks on the road |
| `wf w0..w4` | Waterfall frames |
| `ff f0..f3` | Flag frames |
| `hf h0..h5` | Hearth and smoke frames |

### 6.6 Range

The Range section is `<section id="range" class="range" aria-labelledby="range-title">`, with `background: var(--color-forest); color: var(--color-on-forest); padding: 96px var(--gutter) 112px`.

**Layout.** `.range__inner` is `.container` plus `display: flex; flex-wrap: wrap; align-items: center; gap: 56px`.

**Panel** (left, `flex: 1 1 460px`):
- **Outer frame:** `border-radius: var(--radius-panel); padding: 20px; background: var(--color-on-forest-surface); border: 1px solid var(--color-on-forest-border); backdrop-filter: blur(16px)`.
- **Inner stage:** `.isogrid` with `border-radius: var(--radius-stage); background-color: var(--color-card); padding: 28px 20px 24px; display: flex; flex-direction: column; align-items: center; gap: 16px`. Its children, in order:
  1. **Nameplate** `<p class="range__nameplate" aria-live="off">`:
     - Style: `min-height: 44px; display: flex; align-items: center; padding: 0 18px; background: var(--color-ink); color: var(--color-page); font: 18px var(--font-pixel); letter-spacing: 1px; box-shadow: 4px 4px 0 var(--class-shadow)`. `--class-shadow` is the current class's shadow color.
     - Text: the class name, followed by `<span class="visually-hidden">, class N of 5</span>`.
  2. **Controls row** (`display: flex; align-items: center; justify-content: center; gap: 24px`), holding three things:
     - `<button type="button" class="range__arrow" data-dir="-1" aria-label="Previous class">`.
     - The sprite figure: `<figure class="range__sprite" role="img" aria-label="Pixel-art character dressed for {name}">`, containing the sprite SVG (309px wide, `max-width: 100%`).
     - `<button ... data-dir="1" aria-label="Next class">`.
     - Arrows are 56×56, with no border or background. The icon is the mock's 7×9 pixel chevron (an inline SVG drawn at 28×36), filled with `var(--color-ink)`.
  3. **Pager row** (`display: flex; align-items: center; gap: 8px`):
     - Five dots `<span class="range__dot" aria-hidden="true">`, 10×10, `background: rgba(90,62,43,.25)`. The current dot is `background: var(--color-ink)`.
     - Then, 8px later, the pause/play toggle **(D1)**: `<button type="button" class="range__toggle" aria-pressed="false" aria-label="Pause class rotation">`. It's 44×44 with a pixel pause icon (two 2×7 bars) or a play icon (pixel triangle), filled with `var(--color-ink)`, and no background.

**Copy** (right, `flex: 1 1 380px; display: flex; flex-direction: column; gap: 20px`):
- `<h2 id="range-title">`: "Many hats." plus `<span class="gold">One craftsman.</span>`.
- `<p>`: the lede, `max-width: 480px`, `var(--color-on-forest-muted)`.

**Sprite variants.** `range-sprite.svg` contains the island and five `<g data-class="0..4">` variant groups. The mock's `display: {{vis.vN}}` holes are replaced by the `data-class` attributes. CSS shows a variant only when it matches the section's state: `.range[data-current="2"] .range__sprite g[data-class="2"] { display: inline }`, with all other variants `display: none`. The character's `cbob` groups stay as they are in the source.

**Behavior** (`<script>` in `Range.astro`, under 60 lines, no dependencies):

- **State.** The script keeps `index` (0–4) and `playing`. It renders by setting `section.dataset.current`, the nameplate text and `--class-shadow`, the sprite's `aria-label`, and the current dot.
- **Auto-advance.**
  - The class advances every **2200ms** while `playing` is true.
  - On each auto-advance, the Next arrow gets a `.is-pulsing` class for **200ms**: `transform: translateX(4px) scale(0.88)`, with its icon filled `var(--color-accent)`. This matches the mock's `pulse`.
- **Prev and next.** They step by −1 or +1 (mod 5) and restart the 2200ms timer.
  - The nameplate's `aria-live` switches to `polite` for user-triggered changes and back to `off` for auto-advance, so autoplay doesn't keep announcing.
- **Pause and play.**
  - The toggle flips `playing`, `aria-pressed`, its `aria-label` ("Pause class rotation" / "Play class rotation") and its icon.
  - Autoplay also pauses while the pointer is over the panel or focus is inside it (`mouseenter`/`mouseleave`, `focusin`/`focusout`), and resumes afterwards unless the user pressed pause.
- **Reduced motion.** If `matchMedia('(prefers-reduced-motion: reduce)')` matches, `playing` starts as `false`, the toggle shows "play", and no pulse runs. The media query is listened to for changes.
- **Hidden tab.** On `visibilitychange`, the timer stops while the document is hidden.
- **Without JavaScript:** variant 0 ("Front-end") shows, the arrows and toggle are hidden with `.range:not(.is-ready) .range__arrow, … { visibility: hidden }`, and the layout doesn't shift.

### 6.7 Footer

`<footer class="site-footer">`: `background: var(--color-footer); padding: 22px var(--gutter); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; font: 12px var(--font-pixel); letter-spacing: 1px; color: var(--color-on-footer)`.

- **Left:** `© <time datetime={iso}>{year}</time> J. LAW. CORDOVA`. The year is computed at build time, as today.
- **Right:** `<nav aria-label="Elsewhere">` with links `GITHUB`, `LINKEDIN`, `X` and `BLOG`, in that order, 20px apart. Each link has `padding-block: 12px` to give a 44px target.
- **Links:** `color: var(--color-on-footer)`, underlined on hover and focus.

## 7. Content

All copy is exactly as written here. Typographic apostrophes are `’` and the middle dot is `·`.

### 7.1 Hero

- **Pre-title:** Hi, I’m J. Law. Cordova.
- **H1:** I ship whole products, *not handoffs.* (The second clause is accent-colored.)
- **Lede:** Senior developer and tech lead at Netzon in Davao City. I lead full-stack teams on C#, ASP.NET Core, React and Next.js, design data platforms on Microsoft Fabric, and own the release process that gets it all safely to production.
- **Buttons:** Press start · Get in touch

### 7.2 Highlights (`src/data/home.ts`)

```ts
export type MarkerColor = 'wine' | 'teal' | 'gold' | 'leaf' | 'clay' | 'moss';

export const highlights = [
  { title: 'Led two full-stack teams', body: 'Shipped e-commerce products on React, Next.js and ASP.NET Core', marker: 'wine' },
  { title: 'Fabric data foundation', body: 'Designed a Bronze, Silver, Gold lakehouse with per-client access and Power BI on top', marker: 'teal' },
  { title: 'PCI-aware release process', body: 'Secure SDLC, sign-offs and rollback for a payment-sensitive browser extension', marker: 'gold' },
  { title: '100+ pull requests reviewed', body: 'TDD, code review and developer onboarding on a large enterprise platform', marker: 'leaf' },
  { title: 'Estimates backed by prototypes', body: 'Built a working Next.js proof of concept to test scope before committing', marker: 'clay' },
  { title: 'Responsible AI, taught in-house', body: 'A framework for working with AI without leaking client data', marker: 'moss' },
] as const satisfies readonly { title: string; body: string; marker: MarkerColor }[];
```

Each one traces to a row in the profile's Highlights table.

### 7.3 Range

```ts
export const rangeClasses = [
  { name: 'Front-end', shadow: '#6F8F55' },
  { name: 'Cloud & DevOps', shadow: '#D8B66A' },
  { name: 'UX Design', shadow: '#9E3B4B' },
  { name: 'Data Engineering', shadow: '#5F8C7E' },
  { name: 'Project Management', shadow: '#3E4A2A' },
] as const;
```

The `shadow` values are the mock's `CL[i].A` colors, used as the nameplate's hard shadow. Sprite variant *i* in the SVG matches entry *i*.

- **H2:** Many hats. *One craftsman.* (The second clause is gold.)
- **Lede:** From TDD and code review to lakehouse design and production sign-off, I’ve worked every stage of shipping software. I keep every layer in one head, and let AI speed up the cutting while the judgment stays mine.

### 7.4 Site metadata

`site.description` becomes:

> J. Law. Cordova is a senior developer and tech lead in Davao City who ships whole products: full-stack apps, Fabric data platforms and secure releases.

That's 151 characters. It's used for `<meta name="description">` and the home page's `og:description`.

### 7.5 Confidentiality check

Before merging, search the built `dist/` for any client name, project codename or colleague name from the private source material. There must be zero matches. The only organization named on the site is the employer, Netzon, which is already public in the profile.

## 8. Pixel-art pipeline

**Extraction (done once, by hand):**

1. Copy the hero `<svg>…</svg>` (line 60 of `Isometric.dc.html`) to `hero-island.src.svg`.
2. Copy the sprite `<svg>…</svg>` (inside line 87) to `range-sprite.src.svg`. Replace each `style="display: {{vis.vN}}"` with `data-class="N"`.
3. Add `xmlns="http://www.w3.org/2000/svg"` to both. Strip the `style` attribute on the root, which sizing CSS replaces.

**Optimization (`npm run art`).** `scripts/optimize-pixel-art.mjs` uses only Node built-ins. For each source file it:

1. Parses each `<g fill="#…">` whose children are all `<rect>`.
2. Expands the rects to a set of unit pixels.
3. Re-emits one `<path fill="#…" d="…">`, merging horizontal runs per row: `M{x} {y}h{w}v1h-{w}z`. It may also merge vertically identical runs into taller rectangles.
4. Keeps every other element, attribute and the group nesting unchanged, in particular `class`, `data-class` and the order (z-order).
5. **Checks losslessness:** for every fill group, the output's pixel set must equal the source's. If any group differs, the script exits non-zero.
6. Writes the output to `src/assets/pixel-art/*.svg` and prints raw and gzip sizes.

**Expected results** (measured on the mock with row merging only):

| File | Source raw / gz | Optimized raw / gz |
| --- | --- | --- |
| Hero island | 316 KB / 23 KB | ~97 KB / ~20 KB |
| Range sprite | 129 KB / 8.8 KB | ~41 KB / ~7.6 KB |

**Budget:** each optimized file must be ≤ 100 KB raw and ≤ 25 KB gzip.

### 8.1 `pixel-art.css`

- **Crisp rendering:** `.pixel-art, .pixel-art * { shape-rendering: crispEdges; }` and `image-rendering: pixelated` on any raster.
- **Keyframes, ported verbatim from the mock (lines 16–32):**

| Keyframes | Applied with |
| --- | --- |
| `bob` | — |
| `idrive` | `.itruck` 13s step-end infinite, `.it2` delayed -6.5s |
| `wfk` | `.wf` 1.0s, delays w0…w4 = 0 / -0.8 / -0.6 / -0.4 / -0.2s |
| `ffk` | `.ff` 0.6s, delays f0…f3 = 0 / -0.45 / -0.3 / -0.15s |
| `hfk` | `.hf` 3.0s, delays h0…h5 = 0 / -2.5 / -2 / -1.5 / -1 / -0.5s |
| `pcloud` | `.pcloud` 16s steps(12,end); `.pc1` 20s with -7s delay; `.pc2` 13s with -3s delay |
| `floaty` | `.floaty` 6s steps(2,end) |
| `cbob` | `.cbob` 1s step-end |

- **Reduced motion:** `@media (prefers-reduced-motion: reduce) { .bob, .itruck, .pcloud, .floaty, .wf, .ff, .hf, .cbob { animation: none } .wf, .ff, .hf { opacity: 0 } .w0, .f0, .h0 { opacity: 1 } .it2 { opacity: 0 } }`.

## 9. Secondary pages

These pages have no mock. They use the tokens, type and surfaces above and invent no new visual language.

### 9.1 Shared

- Every page uses the new header and footer.
- The page ground is `--color-page`.
- Content sits in `.container`. Reading content sits in a `max-width: var(--reading-max)` column.
- **Page title band:** a `.page-head isogrid` band with `background-color: var(--color-hero); padding: 56px var(--gutter) 40px`. It holds:
  - the page's `<h1>`, styled like the post H1;
  - an optional pixel label above it, 12px, ink-muted.

### 9.2 Blog index (`/blog/`, `/blog/pageN/`)

- **Title band:** H1 **Blog**, a new visible heading, since the page has none today. The label reads `{totalPosts} POSTS · PAGE {page} OF {totalPages}`, which replaces the old `.page-info` line.
- **Featured post (page 1):** a card with `border-radius: var(--radius-card); background: var(--color-surface); border: 1px solid var(--color-border); overflow: hidden`, in a two-column grid that becomes one column below 720px.
  - The image is `aspect-ratio: 16/9; object-fit: cover`.
  - Then the category label (pixel 12px, uppercase, ink-muted), the title (Sora 600, 24px, ink link, accent on hover), the description (ink-muted, 16px), and "Read more" as `.btn.btn--primary`.
- **Post list:** a grid of `auto-fill, minmax(min(300px, 100%), 1fr)` with a 12px gap. Each item is a highlight-style card without a marker: category label, then the title link.
- **Pagination:**
  - Buttons are `min-width: 44px; min-height: 44px; border-radius: var(--radius-button)`, in pixel 13px.
  - Links have the ghost style.
  - The current page is `background: var(--color-ink); color: var(--color-page); box-shadow: 4px 4px 0 var(--color-accent)`, with `aria-current="page"`.
  - Wrap them in `<nav aria-label="Blog pages">`.

### 9.3 Post

- **Title band:** the post title as H1, with the date as a pixel label, `<time>`, uppercase, e.g. `DEC 26, 2023`. Use the existing `formatDate`; uppercase it in CSS.
- **Body:** a reading column in post-body type.
  - Headings are Sora 700. Paragraph spacing is `1.1em`.
  - Lists are indented 1.4em.
- **Links** are accent-colored with `text-underline-offset: 3px`.
- **Images:** `max-width: 100%; height: auto; border-radius: var(--radius-button); border: 1px solid var(--color-border)`.
- **Blockquote:** `background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-card); padding: 16px 20px; color: var(--color-ink-muted)`.
- **Tables** (if any): full width, 1px border rows, and a header in pixel 12px uppercase.
- **Inline code:** `background: var(--color-card); color: var(--color-ink); padding: 0.1em 0.35em; border-radius: 6px; font-family: var(--font-code)`.
- **Code blocks:** `background: var(--color-ink); color: var(--color-page); border-radius: var(--radius-button); padding: 16px 20px; overflow-x: auto; box-shadow: 4px 4px 0 var(--color-accent)`.
- **Related posts:** an `<aside aria-labelledby="related-title">` with `<h2 id="related-title">Related posts</h2>` (pixel label style). It holds a two-column card grid (one column below 720px): image at `aspect-ratio: 16/9`, category label, title link. It replaces the `recent-blog-*` classes.

### 9.4 Syntax theme (Prism on the ink ground)

Every color has at least 4.5:1 contrast against `#2E2418`.

| Tokens | Color | Contrast |
| --- | --- | --- |
| comment, prolog, doctype, cdata | `#A8957A`, italic | 5.24 |
| keyword, boolean, constant | `#D8B66A` | 7.83 |
| string, char, attr-value | `#B5C79C` | 8.41 |
| number, regex | `#E6B8A8` | 8.53 |
| function, decorator, annotation | `#9DC1B4` | 7.76 |
| class-name, builtin, namespace, symbol | `#E3C57E` | 9.09 |
| tag, property, selector, JSON property | `#C9DDD3` | 10.69 |
| attr-name, key, variable | `#8FAEA5` | 6.34 |
| operator, punctuation, entity | `#D9C9AE` | 9.35 |
| deleted | background `rgba(201, 147, 156, .2)` | — |
| inserted | background `rgba(159, 208, 138, .2)` | — |

### 9.5 404

The title band has H1 **404: Page not found**. Below it, the existing sentence stays in a reading column, followed by `<a class="btn btn--primary" href="/">Head back home</a>`. The inline "Head back home" link in the sentence is removed so the link isn't duplicated. The sentence becomes: "Sorry, we’ve misplaced that URL or it’s pointing to something that doesn’t exist."

## 10. Brand marks

All marks use the JL geometry of [§6.2](#62-jl-mark): J in accent, L in ink. They're flat, never isometric or shaded.

| Asset | Spec |
| --- | --- |
| `favicon.svg` | JL mark on a transparent background, viewBox padded to square (`-2 -13.5 72 72`) |
| `favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png` | JL mark rasterized on transparent, with edges snapped to whole pixels at 16px |
| `apple-touch-icon.png`, `apple-touch-icon-precomposed.png` | 180×180, JL mark at 60% width on `--color-page` |
| `android-chrome-192x192.png`, `-512x512.png` | JL mark at 60% width on `--color-page` |
| `logo.svg` / `logo.png` | The JL mark alone, same 68×45 canvas as today, recolored. `logo.png` is re-exported at 68×45 and 136×90 (`logo@2x.png`). |
| `jlawcordova-image.png` (OG) | 1200×630, PNG, ≤ 300 KB. Hero ground with isogrid, the hero island on the right (about 560px wide), the JL mark with the `J.LAW` wordmark top-left, and the H1 "I ship whole products, not handoffs." in Sora 700, ink, with the accent clause. No other text. |

The OG image can be rendered by any means, for example a throwaway HTML page captured with the pre-installed Playwright Chromium. Commit the output PNG only.

`BaseLayout.astro` head:

```html
<link rel="icon" href="/public/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/public/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" href="/public/apple-touch-icon.png" />
<link rel="manifest" href="/public/site.webmanifest" />
<meta name="theme-color" content="#F4EDE0" />
```

These replace the current `apple-touch-icon-precomposed` and `shortcut icon` links. Keep the PNG files for old clients that request them directly.

`site.webmanifest`:

```json
{"name":"J. Law. Cordova","short_name":"J.LAW","icons":[{"src":"/public/android-chrome-192x192.png","sizes":"192x192","type":"image/png"},{"src":"/public/android-chrome-512x512.png","sizes":"512x512","type":"image/png"}],"theme_color":"#F4EDE0","background_color":"#F4EDE0","display":"standalone"}
```

## 11. Responsive behavior

| Width | Behavior |
| --- | --- |
| ≥ 960px | As in the mock. Hero and Range are two columns. Highlights are 3 × 2. |
| 720–959px | Hero and Range wrap to one column (copy first, then art or panel). Highlights are 2 per row. |
| < 720px | One column throughout. The hero art is 100% of the content width. The blog featured card stacks. |
| < 480px | Gutter is 16px. Hero padding is `48px 16px 64px`. Range padding is `64px 16px 72px`. The nav links wrap under the brand. Highlights are 1 per row (the `min(320px, 100%)` guard). |

At every width from 320px up there's no horizontal scroll. All tap targets are at least 44×44.

## 12. Performance budgets

Baseline (current `master`, measured from `npm run build`): the home page loads 5.1 KB of HTML (2.0 KB gzip), 20.6 KB of CSS (3.9 KB gzip), 62.6 KB of background WebP and 4.7 KB of SVGs. That's about **70 KB of first-party transfer**, plus the Font Awesome kit script and its fonts, plus Merriweather and Roboto.

| Metric (home, gzip transfer) | Budget |
| --- | --- |
| HTML, including the inline art | ≤ 40 KB |
| CSS (all bundles) | ≤ 8 KB |
| JS (Range script) | ≤ 2 KB |
| Images (first-party, excluding favicon) | 0 KB, since the art is inline |
| **Total first-party** | **≤ 50 KB**, under the 70 KB baseline |
| Third-party scripts | 0 (Font Awesome removed) |
| Web fonts | Silkscreen 400 + Sora 400/500/600/700 (Latin subset via Google Fonts) |

Also: no layout shift from the art (the SVG has an intrinsic aspect ratio from its viewBox), and Lighthouse performance ≥ 95 on mobile emulation for home and one post.

## 13. Verification

Each intent acceptance criterion maps to a check:

| Intent criterion | How to check |
| --- | --- |
| Matches Prototype B at 1440px | Screenshot `/` at 1440×900 and full page with Playwright. Compare side by side with the canvas board. The art must be pixel-identical, which the optimizer's lossless check guarantees. Layout, colors and copy must match. |
| Facts trace to the profile | Review §7 against `docs/references/profile.md`. Grep `dist/` for the old copy ("Enterprise Applications", "Code + Create", "Backend Systems"): no matches. |
| No confidential names | §7.5 grep over `dist/`: no matches. |
| 390px works | Screenshot at 390×844. `document.documentElement.scrollWidth <= innerWidth` on every page type. Tap-target audit in Lighthouse. |
| Range carousel | Manual and Playwright: auto-advances through 5 names; prev and next wrap around; nameplate, sprite variant, dots and `aria-label` stay in sync; pause stops it; hover and focus pause it. |
| Reduced motion | Playwright with `reducedMotion: 'reduce'`: no running animations (`document.getAnimations().length === 0`), the carousel isn't playing, the single static frames show. |
| Secondary pages restyled | Visual review of `/blog/`, `/blog/page2/`, one post with code, one with a blockquote, and `/404`. Grep `dist/` for `fa-`, `Merriweather`, `Roboto` and `#EC407A`: no matches. |
| Code legible | Syntax colors per §9.4, contrast already verified. Visual check of a C# and a YAML post. |
| URLs unchanged | Compare the list of built `dist/**/index.html` routes plus `atom.xml` against `master`'s build. They must be identical. |
| Build passes | `npm run build` (includes `astro check`), with no new warnings. |
| Weight | Measure per §12 from `dist/` (gzip sizes). Report in the PR. |
| Lighthouse a11y = 100 | Lighthouse on `/` and one post, desktop and mobile. |
| Obsolete CSS removed | Each file in §2.1's Delete table is gone. For each remaining CSS selector, a grep shows a use in `src/` or post content. |

## 14. Delivery slices

Each slice is reviewable on its own and leaves the site deployable.

1. **Foundation:** tokens, fonts, base, type, buttons and pixel-art CSS. New header, footer and recolored JL mark. Font Awesome removed. Every page picks up the new shell.
2. **Pixel-art pipeline:** source SVGs, the optimizer script with its lossless check, and the optimized outputs.
3. **Home:** hero, highlights, Range with the carousel, `home.ts` and the site description. Old home sections and assets deleted.
4. **Secondary pages:** blog index, pagination, post, syntax theme, related posts and 404.
5. **Brand marks:** favicons, touch and manifest icons, logo, OG image and manifest fix.
6. **Verification pass:** §13 checks, with numbers and screenshots in the PR.

Slices 1–3 can ship as a single PR if review prefers fewer, larger changes. Slices 4 and 5 follow.
