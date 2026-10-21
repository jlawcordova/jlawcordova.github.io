# Design system

A warm, flat, engineering-led system for J. Law. Cordova: senior developer and technical lead working across data engineering, Microsoft Fabric, cloud architecture and delivery. It should feel like an engineering notebook mixed with a product strategy document, not a marketing site.

This folder is the design system's source of truth. Change it here, by pull request.

**Clarity through structure.**

## Principles

1. **Reduce ambiguity.** Every surface states what is known, what is unknown, the assumptions, the risks, who owns what, and what happens next.
2. **Documentation first.** Use headings, numbered sections, tables and lists before decoration. If a layout makes something harder to scan, change the layout.
3. **Dense but readable.** Use dashboards over hero banners, systems diagrams over illustrations, and real workflows over abstract concepts.
4. **One hue, used sparingly.** `color-accent` marks the one thing to act on. Everything else is ink on warm paper.
5. **Square and flat, like the pixel art.** Corners are square and nothing casts a shadow. Edges and depth come from a thick ink border (`border-thick`) on things you press and on the shell, and from nothing else.
6. **Delight in small, smooth moves.** Use the Motion library to make state changes and entrances feel alive. UI motion glides at the display's full frame rate; only the pixel art's own loops step. Motion supports the content and never hides it.

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
- Use sentence case for headings. Buttons, nav links and pixel `label` text are uppercase, in Silkscreen.
- No emoji, no exclamation marks, and no "excited to announce". The one "!" on the site is the achievement toast's label (see Gamified copy).

### Examples

| Instead of | Write |
| --- | --- |
| "Supercharge your data with a cutting-edge Fabric platform!" | "Move the nightly loads to a Fabric lakehouse. Assumption: the source exports land by 02:00. Risk: they currently slip on month end." |
| "We're confident this will be a huge success." | "Confidence: medium. The estimate holds if the API contract is frozen by 2026-10-15." |
| "Let's circle back and leverage synergies." | "Next: J. Law drafts the data contract by Friday. The team reviews it on Monday." |
| "Get started today" (button) | "Read the plan" |
| "Click here to learn more!" (button) | "Press start" (a gamified button, with the section it opens right beside it) |

### Gamified copy

Two places can play: **achievements** (the home section and the full list of accomplishments) and **buttons**. Everything else uses the plain voice above.

- **Voice:** Stardew Valley's achievements ("Greenhorn", "Cowpoke"). One to three words, warm, a little folksy, light wordplay. Never a joke that needs explaining.
- **Plain meaning sits next to it.** An achievement's fun title has a short description beside it and a plain title in its opened panel. The headings "Achievements", "Earned achievements" and "Locked achievements" each have a plain subtitle or line beside them, which says what the list is without explaining the game framing. A gamified button sits beside text that says where it leads.
- **Never misleading.** A fun title doesn't overstate what was done. A locked achievement reads as not done yet, not as a claim.
- **Not a real game.** No points, levels, rarity or progress figures unless they're true and defined. The achievement tally counts what's earned and what's locked, and never reads as progress (no "30 of 33").
- **Two kept exceptions:** the home page's Range heading, "Many hats. One craftsman.", with a plain paragraph beside it; and the achievement toast's label, "Achievement unlocked!", the one exclamation mark on the site, with the achievement's name and plain line under it ([achievements redesign spec](../intents/2026-10-achievements-redesign/spec.md), C1).

## Visual foundations

### Color

- Set the page on `color-page`. Mark a page's top with one `color-hero` band (hero or page head). Use `color-card` for solid inner grounds such as inline code, chips and stages.
- Set text in `color-ink`. Set secondary text (ledes, descriptions, captions, labels) in `color-ink-muted`. Both pass AA on every light ground.
- Use `color-accent` only for links, the primary action, the J of the mark, and the second clause of the hero title. Its hover is `color-accent-hover`, and text on it is `color-on-accent`.
- Use `color-gold` for one emphasized phrase on `color-forest`, or as a fill under ink. It never appears as text on light grounds.
- Use at most one dark section per page: `color-forest` with `color-on-forest` headings and `color-on-forest-muted` body copy. The footer is `color-footer` with `color-on-footer`.
- Draw lines with `color-border`, and with `color-border-strong` on hover and on controls. Both are faint. `color-border-strong` is 1.4:1, so a control must also read by its fill and its label.
- Set code on `color-code` with `color-on-code` and the `syntax-*` tokens. Every syntax color is at least 4.5:1 on it.
- Don't use gradients, glows or extra hues. The pixel-art palette is for illustration only, never for UI. The achievement frames count as illustration: their colors are drawn in their pixel-art sheet, like the icons', and no CSS uses them.

### Dark theme

Every page has a light theme and a dark theme. The dark theme is the same warm, flat system at night: dark warm paper, cream ink and a lighter green accent.

- **Which one shows.** The theme button in the nav cycles Auto, Light and Dark. Auto, the default, follows the reader's system setting; Light and Dark are saved in the browser. It's set before first paint, so a page never flashes. Without JavaScript the page is light.
- **The tokens flip, not the rules.** `tokens.json` gives each color that changes a `dark` value, and `variables.css` sets them under `[data-theme="dark"]`. Everything above still holds in dark: set the page on `color-page`, text in `color-ink` and `color-ink-muted`, and actions in `color-accent`. Every text pair stays AA (`scripts/design-system.test.mjs` checks it).
- **The same in both themes:** `color-earth`, `color-gold`, the forest and footer colors, and code blocks (`color-code` with the `syntax-*` colors). They're already dark grounds or illustration colors.
- **Inverted fills flip with the theme.** A tooltip or the current page in pagination is `color-ink` with `color-page` text, so it's cream on dark ink in dark.
- **Drawn objects keep the light colors.** The Range handheld carries `data-theme="light"`, so its gold shell, ink keys and paper stage look the same in both themes. Use the same attribute for any other drawn object. The achievement toast, the earned tally chip and the Latest chip do the same, so they stay ink on gold.
- **The pixel art isn't redrawn.** It sits on the dark grounds as it is, except that the hero island's dithered shadow takes `color-page`, so it settles into the dark band instead of reading as a pale hatch.

### Type

- **Sora** (`font-text`, 400/500/600/700) for headings and body. **Silkscreen** (`font-pixel`, 400) for the wordmark, every button (primary, ghost and pill), nav links, pagination, `label`, `tag` and the footer. A monospace stack (`font-code`) for code and IDs. Both faces load from Google Fonts: `family=Silkscreen&family=Sora:wght@400;500;600;700`.
- Headings: `hero-title` once per page at most, then `section-title`, `h1`, `h2` and `h3`. Body copy is `body` (17px / 1.6). Long reads use `post-body` (17px / 1.75) in a `reading-max` column.
- Silkscreen is for short strings only, three words at most. Never set a sentence in it.
- Use tabular numerals in tables and registers.

### Space and layout

- Content is at most `content-max` (1160px) wide. Reading columns are at most `reading-max` (720px).
- Sections and bands supply their own `gutter`, which drops to `gutter-narrow` at `breakpoint-narrow` (480px). Home sections pad `space-section-y` top and bottom.
- Cards pad `space-card-pad-y` × `space-card-pad-x`. Lists of cards sit in a grid with a 12px gap.
- Two-column grids stack below `breakpoint-stack` (720px). Pages never scroll sideways at 390px.
- The isometric grid (`.isogrid`, `color-grid`, a 32 × 16 tile) is a continuous diamond lattice at the pixel art's 2:1 slope. It covers the whole hero band, the page title bands and stages, and nothing else.

### Shape and depth

- **Corners are square.** Nothing in the UI is rounded: buttons, pills, the nav bar, cards, rows, chips, code blocks, stages, panels and images all have 90° corners. The pixel art is the only place for curves, and only as pixels.
- **No shadows.** Don't use hard or soft shadows, glows or bevels. Where the system used `shadow-pixel` or `shadow-pixel-accent`, use `border-thick` instead: a 3px `color-ink` border.
- `border-thick` goes on buttons, the Contact pill, the nav bar, the current page in pagination, tooltips, the Range console, the achievement toast and the earned tally chip. Achievement rows take a 3px `color-border` edge, dashed `color-border-strong` when locked, like the locked tally chip. Cards and stages keep the 1px `color-border` hairline. Ink fills such as code blocks need no extra edge.
- **Pressed:** a button moves 2px down and right. Nothing else changes.
- The sticky nav has no shadow. It sits on the see-through `color-surface-strong` with a 16px backdrop blur, the one blur in the system, and falls back to solid `color-page` where `backdrop-filter` isn't supported.

Tokens: `radius-*` all become 0. `shadow-pixel`, `shadow-pixel-pressed`, `shadow-pixel-accent` and `shadow-nav` are retired, and `shadow-focus-halo` stays for the focus ring. `color-surface-strong`, the nav's fill, rises from 62% to 78% opacity, as the home page proposal draws it. `border-thick` is new. `tokens.json` and `src/styles/variables.css` hold these values, and they change together (see `../intents/2026-10-pixel-first-look/spec.md`).

### States and motion

- **Focus:** a 2px `color-ink` outline, offset 2px, over `shadow-focus-halo`. On `color-forest` or `color-footer`, use the `on-` color for the outline and that ground for the halo. Never remove the focus ring.
- **Hover:** links go to `color-accent-hover`. Cards strengthen to `color-border-strong` over `color-surface-ghost`.
- **Locked or pending:** dashed `color-border-strong`, with the icon dimmed and the text left at full strength. A locked achievement's padlock stays in full color over its dimmed icon.
- **Motion:** see Motion below. Respect `prefers-reduced-motion`, and show a single static frame under it.
- Every interactive element is at least `tap-target` (44px) in both directions.

### Motion

Use [Motion](https://motion.dev) (the `motion` package, formerly Framer Motion) wherever a transition makes the site more delightful. The site isn't React, so use Motion's plain-JavaScript API (`animate`, `stagger`, `inView`) in small client scripts, not its React components.

- **Where:** state changes (a Range class switching, a nameplate updating, a row's panel opening), entrances as a section scrolls into view (a short stagger of cards or rows, and each earned achievement frame's one 8px hop as its row lands), the achievement toast rising into the corner, and playful feedback a person asks for (a sprite's hop when they press A).
- **How it moves:** smoothly. Use the shared ease-out (`easeOut` in `src/lib/motion.ts`, `cubic-bezier(0.22, 1, 0.36, 1)`) for entrances, slides and panels, and `ease-out` for CSS presses and turns. Stepped easing (`steps()`) is for the pixel art's own CSS loops only, such as the island's water and trucks, because stepped UI motion reads as lag. Keep durations between 0.12s and 0.5s, and stagger by 0.04–0.08s. Keep moves short: 8–24px slides and hops, never long sweeps.
- **Two build-ups are longer entrances.** The owner tuned them by eye, so they sit outside the rhythm above. Their numbers live in `src/lib/island-entrance.mjs`, each under its own name; don't reuse them for other entrances.
  - **The hero island** ([island edge sweep spec](../intents/2026-10-island-edge-sweep/spec.md), C1): the ground sweeps in from left to right over 1.25s, each cube floating up 16 art pixels and overshooting by 6, in 0.35s. Each object drops 24 art pixels onto its spot 0.5s after the cube under it, with a 1.5 pixel dip, in 0.3s. The island settles in about 2.3s. Try other build-ups in the unlisted entrance lab (`/lab/island-entrance/`).
  - **A Range setting,** on every class change ([Range settings spec](../intents/2026-10-range-settings/spec.md), C1): its rows float up and settle, quicker. Rows are 0.08s apart, each piece takes 0.5s, the props and the character sweep in over 0.3s, and a setting settles in about 1.45s. The carousel advances every 3s, so each setting rests after it builds.
- **The Range's class change is a game screen's,** chosen by the owner on a prototype ([Range pop spec](../intents/2026-10-range-pop/spec.md) R2–R6), so it keeps its own numbers too, in `src/lib/range-change.mjs`. Battle bars clear the screen in 12px blocks over 0.5s, drawn frame by frame, and a slash crosses the section over 0.6s. The countdown fills smoothly over the 3s interval. A's hop moves the character by whole pixels, from `pixel-art.css`, because it moves the art.
- **What to avoid:** motion that loops on its own beyond the Range rotation, parallax, scroll-jacking, layout shift, and animating text people are reading.
- **Never hide content.** Pages render complete without JavaScript. A script sets an element's start state just before animating it, so nothing stays hidden if the script fails.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, skip the animation and jump to the end state.
- **Budget:** import only the functions a page uses, and load scripts per island, not site-wide.

## Iconography

- **The mark:** the flat block J and L on a square grid (`static/public/logo.svg`, 68 × 45), with the J in `color-accent` (#3f6b45) and the L in `color-ink` (#2e2418). Don't make it 3D, outline it, recolor it or change its shape. Set it beside "J. LAW. Cordova" in `wordmark` in the nav. It's two-ink, so as an `<img>` it reads on light grounds only (`color-page`, `color-hero`, `color-card`). `static/public/favicon.svg` is the same mark padded to a square, and `static/public/logo@2x.png` is a raster fallback.
- **Icons:** 16 × 16 pixel icons from one sheet (`src/assets/pixel-art/achievement-icons.svg`), drawn at 48px (3×) with crisp edges. The sheet is one row of 16px cells: 0 star (the fallback), 1 lock, 2 sprout, 3 hammer, 4 rocket, 5 bug, 6 shield, 7 key, 8 wrench, 9 book, 10 magnifier, 11 flask, 12 apple, 13 heart, 14 signpost, 15 chest, 16 trophy, 17 speech. Their colors are fixed from the pixel-art world palette and outlined in `color-ink`, for light grounds. Small glyphs (chevron, external arrow, play/pause, close) are hand-pixelled paths in `currentColor`.
- **Frames:** on the site, each achievement icon sits in a 20 × 20 pixel frame from a second sheet (`src/assets/pixel-art/achievement-frames.svg`), drawn at 60px: a 1px `ink` edge, a 1px bevel lit from the top left, and a fill that says the kind of work. The cells are 0 plain (`path-1`, for the fallback star and every locked row), 1 make (`gold-1`), 2 fix (`grass-1`), 3 think (`skin-1`), 4 people (`water-1`) and 5 milestone (`roof-1`). Each icon names its frame in `src/lib/achievement-icons.mjs`. There's no key on the page: the icon says the kind, and the color only backs it up.
- Don't use emoji, an icon font, or outlined line icons.
- For diagrams, prefer systems diagrams that use the UI tokens: boxes in `color-surface` with `color-border`, flows in `color-ink`, and one path highlighted in `color-accent`. Names are in Sora, and a node's kind or a short group name in a Silkscreen `label`. The blog's diagrams are drawn this way by `scripts/diagrams/` (`npm run diagrams`). Pixel-art scenes are for the personal site's hero, the Range and the blog's thumbnails only.

## Components

Built from the site:

- **Button**: primary (pixel, accent, thick border) and ghost (pixel, thick border).
- **Pill**: the Contact call to action in the nav.
- **Navigation** and **Footer**: the site shell. The footer is a grass block: a pixel grass edge over speckled dirt.
- **PageHead**: the title band with a label.
- **Card** and **PostCard**: the frosted list surface.
- **Pagination**.
- **AchievementRow**: a framed icon, a fun title, a short line, a date, and an opened panel with the plain title, tags and links. With it, the tally of earned and locked achievements, and the Latest chip.
- **AchievementToast**: "Achievement unlocked!" for the newest earned achievement, once a visit, on the home page.
- **CodeBlock** and **Prose**: the reading column.

Intentional additions, for the content model above:

- **DecisionBrief**: the five questions as one numbered block.
- **Register**: assumptions and risks in a table, each with a rating, an owner and a next step.

## Not in this system yet

These site pieces are left out. Each one is specific to the personal site, and none is needed for working documents.

- The Range carousel (`src/components/home/Range.astro`), the hero island scene, and the outfit sprite. The home page shows the Range on a handheld console: a square `color-shell` gray shell, cut off by the section's bottom edge, with a D-pad for class, START to pause, A to make the character hop and B to go back. The keys are `color-ink` with `color-page` symbols, and only START has a label, in Silkscreen at 10px. The screen carries a HUD: the nameplate, a 12-segment countdown along its foot and a PAUSED badge at its upper right. Each class tints the section's ground and the screen from its color, at one lightness per role ([Range pop spec](../intents/2026-10-range-pop/spec.md) R1).
- The featured post and related-post cards. They need post images: each post's is a pixel-art thumbnail, a small floating island in the hero island's style drawn as a `thumb-<key>` scene and rendered by `npm run art`.
- The pixel-art lab UI (`src/styles/lab.css`).
