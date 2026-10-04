A warm, flat, engineering-led system for J. Law. Cordova: senior developer and technical lead working across data engineering, Microsoft Fabric, cloud architecture and delivery. It should feel like an engineering notebook mixed with a product strategy document, not a marketing site.

**Clarity through structure.**

## Principles

1. **Reduce ambiguity.** Every surface states what is known, what is unknown, the assumptions, the risks, who owns what, and what happens next.
2. **Documentation first.** Use headings, numbered sections, tables and lists before decoration. If a layout makes something harder to scan, change the layout.
3. **Dense but readable.** Use dashboards over hero banners, systems diagrams over illustrations, and real workflows over abstract concepts.
4. **One hue, used sparingly.** `color-accent` marks the one thing to act on. Everything else is ink on warm paper.
5. **Flat, with one depth cue.** Depth comes from hard pixel shadows (`shadow-pixel`) on things you press, and from nothing else.

## Content fundamentals

### Every page answers five questions

Write in this order. Use the **Decision Brief** component when the five answers sit together.

1. **What problem are we solving?** Lead with context: the situation, why it matters now, and who is affected.
2. **What assumptions exist?** List them so a reader can correct them.
3. **What are the risks?** Name each one with its impact, its likelihood and an owner. Don't hide them at the bottom.
4. **What is recommended?** Give one recommendation, the reasoning behind it, and the confidence in it.
5. **What happens next?** List actions, each with an owner and a date.

### Tone

- **Primary:** structured, analytical, practical, collaborative, transparent.
- **Secondary:** friendly, curious, systems-oriented, low-ego, evidence-driven.
- **Avoid:** hype, marketing language, excessive enthusiasm, buzzwords, corporate jargon and artificial optimism. The writing should never feel sales-oriented, aggressive or overly authoritative.

### How it reads

- Lead with context, then the point. Explain the reasoning behind every recommendation.
- Say what is unknown as plainly as what is known: "We don't know yet how late the upstream export can land."
- Call out risks openly, and give each one an owner.
- Invite correction: "If the 06:00 SLA is wrong, the rest of this changes. Tell me."
- Use sections heavily and bullets often. Keep each bullet to one idea.
- Choose clarity over persuasion. Cut any adjective that isn't evidence.
- Use the first person for the owner ("I recommend"), "we" for shared work, and "you" for the reader. Write numbers as numerals, give dates as `YYYY-MM-DD`, and write times in 24-hour form.
- Use sentence case for headings and buttons. Pixel `label` text is the one uppercase style.
- No emoji, no exclamation marks, and no "excited to announce".

### Examples

| Instead of | Write |
| --- | --- |
| "Supercharge your data with a cutting-edge Fabric platform!" | "Move the nightly loads to a Fabric lakehouse. Assumption: the source exports land by 02:00. Risk: they currently slip on month end." |
| "We're confident this will be a huge success." | "Confidence: medium. The estimate holds if the API contract is frozen by 2026-10-15." |
| "Let's circle back and leverage synergies." | "Next: J. Law drafts the data contract by Friday. The team reviews it on Monday." |
| "Get started today" (button) | "Read the plan" |

The site already has a playful layer: "Press start", "Many hats. One craftsman." and the achievement rows. That play belongs to the pixel-art visuals and to short labels. It never replaces information. A fun title still sits next to the plain one, as the achievement row's opened panel does.

## Visual foundations

### Color

- Set the page on `color-page`. Mark a page's top with one `color-hero` band (hero or page head). Use `color-card` for solid inner grounds such as inline code, chips and stages.
- Set text in `color-ink`. Set secondary text (ledes, descriptions, captions, labels) in `color-ink-muted`. Both pass AA on every light ground.
- Use `color-accent` only for links, the primary action and the J of the mark. Its hover is `color-accent-hover`, and text on it is `color-on-accent`.
- Use `color-gold` for one emphasized phrase on `color-forest`, or as a fill under ink. It never appears as text on light grounds.
- Use at most one dark section per page: `color-forest` with `color-on-forest` headings and `color-on-forest-muted` body copy. The footer is `color-footer` with `color-on-footer`.
- Draw lines with `color-border`, and with `color-border-strong` on hover and on controls. Both are faint. `color-border-strong` is 1.4:1, so a control must also read by its fill and its label.
- Set code on `color-ink` with the `syntax-*` tokens. Every syntax color is at least 4.5:1 on ink.
- Don't use gradients, glows or extra hues. The pixel-art palette is for illustration only, never for UI.

### Type

- **Sora** (`font-text`, 400/500/600/700) for headings and body. **Silkscreen** (`font-pixel`, 400) for the wordmark, primary buttons, pills, pagination, `label`, `tag` and the footer. A monospace stack (`font-code`) for code and IDs. Both faces load from Google Fonts: `family=Silkscreen&family=Sora:wght@400;500;600;700`.
- Headings: `hero-title` once per page at most, then `section-title`, `h1`, `h2` and `h3`. Body copy is `body` (17px / 1.6). Long reads use `post-body` (17px / 1.75) in a `reading-max` column.
- Silkscreen is for short strings only, three words at most. Never set a sentence in it.
- Use tabular numerals in tables and registers.

### Space and layout

- Content is at most `content-max` (1160px) wide. Reading columns are at most `reading-max` (720px).
- Sections and bands supply their own `gutter`, which drops to `gutter-narrow` at `breakpoint-narrow` (480px). Home sections pad `space-section-y` top and bottom.
- Cards pad `space-card-pad-y` × `space-card-pad-x`. Lists of cards sit in a grid with a 12px gap.
- Two-column grids stack below `breakpoint-stack` (720px). Pages never scroll sideways at 390px.
- The isometric grid (`.isogrid`, `color-grid`, a 32 × 16 tile) sits behind title bands and stages only.

### Shape and depth

- Radii run from small to large by what they wrap: `radius-chip` (6) for code and tags, `radius-button` (10) for buttons, code blocks and images, `radius-card` (14) for cards and rows, `radius-stage` (16), `radius-panel` (24), and `radius-pill` for the nav bar and the Contact pill.
- `shadow-pixel` goes on the primary button. While pressed, it becomes `shadow-pixel-pressed` with a 2px translate. Ink fills (code blocks, tooltips, the current page) take `shadow-pixel-accent`. The sticky nav is the only element with a soft shadow (`shadow-nav`) and a blur.

### States and motion

- **Focus:** a 2px `color-ink` outline, offset 2px, over `shadow-focus-halo`. On `color-forest` or `color-footer`, use the `on-` color for the outline and that ground for the halo. Never remove the focus ring.
- **Hover:** links go to `color-accent-hover`. Cards strengthen to `color-border-strong` over `color-surface-ghost`.
- **Locked or pending:** dashed `color-border-strong`, with the icon dimmed and the text left at full strength.
- **Motion:** sprite steps (`steps()`/`step-end`) and fades of 0.12–0.25s only. Respect `prefers-reduced-motion`, and show a single static frame under it.
- Every interactive element is at least `tap-target` (44px) in both directions.

## Iconography

- **The mark:** the flat block J and L on a square grid (`static/public/logo.svg`, 68 × 45), with the J in `color-accent` (#3f6b45) and the L in `color-ink` (#2e2418). Don't make it 3D, outline it, recolor it or change its shape. Set it beside "J.LAW" in `wordmark` in the nav. It's two-ink, so as an `<img>` it reads on light grounds only (`color-page`, `color-hero`, `color-card`). `static/public/favicon.svg` is the same mark padded to a square, and `static/public/logo@2x.png` is a raster fallback.
- **Icons:** 16 × 16 pixel icons from one sheet (`src/assets/pixel-art/achievement-icons.svg`), drawn at 48px (3×) with crisp edges. The sheet is one row of 16px cells: 0 star (the fallback), 1 lock, 2 sprout, 3 hammer, 4 rocket, 5 bug, 6 shield, 7 key, 8 wrench, 9 book, 10 magnifier, 11 flask, 12 apple, 13 heart, 14 signpost, 15 chest, 16 trophy, 17 speech. Their colors are fixed from the pixel-art world palette and outlined in `color-ink`, for light grounds. Small glyphs (chevron, external arrow, play/pause) are hand-pixelled paths in `currentColor`.
- Don't use emoji, an icon font, or outlined line icons.
- For diagrams, prefer systems diagrams that use the UI tokens: boxes in `color-surface` with `color-border`, flows in `color-ink`, and one path highlighted in `color-accent`. Pixel-art scenes are for the personal site's hero and Range only.

## Components

Built from the site:

- **Button**: primary (pixel, accent, pressed-key shadow) and ghost.
- **Pill**: the Contact call to action in the nav.
- **Navigation** and **Footer**: the site shell.
- **PageHead**: the title band with a label.
- **Card** and **PostCard**: the frosted list surface.
- **Pagination**.
- **AchievementRow**: an icon, a title, a short line, a date, and an opened panel with tags and links.
- **CodeBlock** and **Prose**: the reading column.

Intentional additions, for the content model above:

- **DecisionBrief**: the five questions as one numbered block.
- **Register**: assumptions and risks in a table, each with a rating, an owner and a next step.

## Not in this system yet

These site pieces are left out. Each one is specific to the personal site, and none is needed for working documents.

- The Range carousel (`src/components/home/Range.astro`), the hero island scene, and the outfit sprite.
- The featured post and related-post cards. They need post images.
- The pixel-art lab UI (`src/styles/lab.css`).
