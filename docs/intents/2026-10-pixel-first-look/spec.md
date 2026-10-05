# Spec: A pixel-first look, with Motion transitions (from intent.md 2026-10-04)
Status: approved. Amended 2026-10-05 while planning: `feat/hero-island-detail` (#86) has merged, so the hero is no longer held back, and `lab.css` joins the theme step. Amended again 2026-10-05 after launch: the owner found stepped UI motion laggy on the deployed site, so UI motion now eases smoothly (the shared `easeOut`), and only the pixel art's CSS loops stay stepped. The steps named below are replaced by it.

This spec turns the [intent](intent.md) into requirements and a design. It builds the site to match two sources:

- **The home page proposal**, a private design canvas the owner made ([Home page proposal](https://claude.ai/artifact/EXqo7KdQKfz4nd7ZbmEb7F), artboard "Home — proposal", `project/Main.dc.html`). It sets the look of the shell and the layout of the home sections: the nav, the hero, the Range on a handheld console, the accomplishments section and the footer.
- **The design system** in [`docs/design-system/`](../../design-system/README.md): square corners, `border-thick` instead of shadows, Silkscreen on buttons and nav links, the grass-block footer and the Motion rules.

Where the two disagreed, the owner chose the canvas on 2026-10-05. The intent was amended to say so, and the design system was updated in this PR to match ([Canvas and design system](#canvas-and-design-system)).

The owner chose Motion's plain-JavaScript API on 2026-10-05, not `motion/react`. The design system already says so ("The site isn't React"), and CLAUDE.md rules out a UI framework. The canvas uses the same API (`animate`, `stagger`, `inView`, `steps`).

## Requirements

Traced to the intent's Problem, Proposed outcome and Constraints. Each is checkable.

- **R1. Square corners everywhere.** Every rule in `src/styles/*.css`, `lab.css` and `design-system.css` included, sets `border-radius` to `0` or not at all. The `radius-*` tokens are `0` in `tokens.json` and `variables.css`. The pixel art is untouched. *(Outcome: square corners everywhere)*
- **R2. No shadows.** No rule sets a `box-shadow` with an offset or a blur. Only spread-only rings stay: the focus halo (`shadow-focus-halo`) and the lab's selection rings. `shadow-pixel`, `shadow-pixel-pressed`, `shadow-pixel-accent` and `shadow-nav` are removed from `tokens.json` and `variables.css`. The nav bar's 16px backdrop blur is the only `backdrop-filter` left. *(Outcome: no shadows; no shadow on the nav bar)*
- **R3. `border-thick` replaces them.** A new `border-thick` token (3px solid `color-ink`) is on buttons, the Contact pill, the nav bar, the current page in pagination, the achievement tooltip and the Range console. Accomplishment rows take a 3px `color-border` edge, dashed `color-border-strong` when locked. Cards and stages keep the 1px `color-border` hairline. Code blocks get no edge. *(Outcome: no shadows; the canvas)*
- **R4. Pressed buttons move.** While pressed, `.btn--primary`, the pill and the console's A and B buttons move 2px down and right, in an `ease-out` transition of at most 0.12s. Nothing else changes. *(Design system: Shape and depth)*
- **R5. Pixel type.** Every `.btn`, the `.pill`, the nav links, pagination links and the footer are set in Silkscreen, uppercase, and no sentence is. The hero greeting line is removed. *(Outcome: pixel type on every button and link in the nav; the greeting goes)*
- **R6. The nav bar.** The nav bar sits on `color-surface-strong` (now 78% opacity) with a 16px backdrop blur and `border-thick`, square at every width, with no shadow. Without `backdrop-filter` support it's solid `color-page`. The brand reads "J. LAW. Cordova". *(Outcome: no shadow on the nav bar; the canvas)*
- **R7. A menu button on small screens.** At 720px and below, with JavaScript, the nav shows only the brand and an icon-only menu button: 44 × 44px, no text, no border, with `aria-expanded`, `aria-controls` and an `aria-label` that reads "Open menu" or "Close menu". Pressing it shows the links and the pill in the bar. Choosing a link, pressing Escape, clicking outside the bar or widening past 720px closes the menu, and Escape returns focus to the button. Without JavaScript the button is hidden and the links show, wrapping under the brand. *(Outcome: a menu button on small screens; Constraint: works without JavaScript)*
- **R8. The footer is a grass block.** The footer is `color-footer` dirt with faint speckles and a pixel grass layer along the top, drawn in the world palette's grass and soil ramps. Its text stays `color-on-footer`, the JL mark sits on a `color-card` chip, a gold "↑ TOP" link ends the links, and every link stays at least 44 × 44px. *(Outcome: the footer is a grass block; the canvas)*
- **R9. Motion, plain JavaScript.** The site adds the `motion` package, pinned to an exact version, and imports only `animate`, `stagger` and `inView`. No React, no `motion/react` and no other new dependency. *(Outcome: Motion where it helps; Affected systems: dependencies)*
- **R10. Motion where it helps.** These move with Motion, in the design system's rhythm (0.12–0.5s, the shared smooth `easeOut`, 8–24px moves, 0.04–0.08s staggers):
  - the hero copy and island as the home page loads;
  - the Range console as it scrolls into view, the sprite and nameplate on a class change, and the sprite's hop when A is pressed;
  - accomplishment rows as their list scrolls into view, on the home page and `/accomplishments/`, and a row's panel as it opens;
  - post cards as the blog list scrolls into view;
  - the nav links as the small-screen menu opens.

  Nothing loops on its own except the Range rotation and the existing pixel-art CSS loops. *(Outcome: Motion where it helps)*
- **R11. Motion never hides content.** With JavaScript off, or if Motion fails to load, every page shows all its content, fully opaque, in its final place. A script sets an element's start state only in the same task that starts its animation, or, for scroll entrances, only for elements still below the fold, and it reveals them all before printing. No animation moves layout. *(Constraint: works without JavaScript)*
- **R12. Reduced motion.** Under `prefers-reduced-motion: reduce`, no Motion animation runs: elements are at their end state from the start, the Range doesn't auto-advance, and the A button is hidden. The existing CSS loops keep their reduced-motion frame. *(Constraint: `prefers-reduced-motion`)*
- **R13. The home page matches the canvas,** as set out in [Home page](#home-page): the hero, the Range console, the accomplishments section and the footer. *(Outcome: the home page looks like the proposal)*
- **R14. The rest of the site follows.** The blog list and its pagination, posts (code blocks, images, blockquotes), `/accomplishments/`, the 404 page, the design-system page and the pixel-art lab all pick up R1–R5 through the tokens and shared components. *(Affected users: every page)*
- **R15. The design system matches what ships.** Its guidance already follows the canvas (updated in this PR). The component previews in `docs/design-system/components/*/preview.html` show the new Navigation (with the menu button), Footer, Button, Pill, Pagination and AchievementRow. `tokens.json` and `variables.css` change together, and the existing sync test passes. *(Outcome: the design system says so)*
- **R16. Kept from before.** The visible focus ring, 44px tap targets, colors (except `color-surface-strong`'s opacity), copy (except where [Home page](#home-page) names a change), post URLs, `/blog/pageN/`, `/atom.xml` and the committed `"unavailable"` accomplishments placeholder are unchanged. *(Constraints; CLAUDE.md)*
- **R17. Budgets.** As in [Budgets](#budgets). *(Design system: Motion budget)*
- **R18. Reviewed.** Every page that changes is screenshotted at 1440px and 390px with no horizontal scroll, and an independent verifier checks each PR. *(CLAUDE.md)*
- **R19. The hero waits for the island.** No work on the hero files starts until `feat/hero-island-detail` has merged into `main`, as set out in [Sequencing](#sequencing). *(Owner's decision, 2026-10-05; met the same day, when #86 merged)*

## Design

### Canvas and design system

The canvas was drawn before some of the design system's rules were final. The owner chose the canvas wherever they differed (C1), and the design system now says the same:

| Where | Canvas, now built and in the design system | Design system before |
| --- | --- | --- |
| Nav bar | A 78% see-through fill with a 16px backdrop blur | Solid `color-page`, no blur |
| Brand | "J. LAW. Cordova" beside the mark | "J.LAW" |
| Hero greeting | None | "Hi, I’m J. Law. Cordova." in Silkscreen |
| Hero lede | "Senior developer and tech lead in Davao City. …", without the employer | Today's lede |
| Accomplishment rows | A 3px `color-border` edge, 12px apart | A 1px hairline, 10px apart |
| Footer | The mark on a `color-card` chip, five links ending with a gold "↑ TOP", gold on hover | Four links, underlined on hover |
| Console labels | "START", "JUMP" and "BACK" in Silkscreen at 10px | `label` (12px) |

Two canvas details aren't differences: the nameplate's swatch replaces today's colored shadow, as no-shadows requires, and the canvas's sample accomplishments and sprite images stand in for the site's real data and its inline Range sprite.

The intent's constraint that colors stay as they are has one exception, which the intent now records: `color-surface-strong` rises from 62% to 78% opacity, the canvas's nav fill.

### Tokens

`tokens.json` and `variables.css` change together, and `tokens.json`'s `version` gets a minor bump:

- **Radius:** every `radius-*` token becomes `0`, as the design system says. Rules that set `border-radius` from a literal (`6px` on chips and inline code) set `0` or drop the declaration.
- **Shadow:** `shadow-pixel`, `shadow-pixel-pressed`, `shadow-pixel-accent` and `shadow-nav` are removed. `shadow-focus-halo` stays: the focus ring needs it.
- **Border:** a new `border` family holds `border-thick`: `3px solid var(--color-ink)`, and `border-thick-width: 3px` for rules that set the color separately (the nav menu's inner rule).
- **Color:** `color-surface-strong` becomes `rgba(250, 245, 235, 0.78)`. `color-ink`'s usage drops "the hard pixel shadow". No other color changes.
- **Type:** the `wordmark` sample becomes "J. LAW. Cordova".

### Shell

**Navigation** (`Navigation.astro`, `navigation.css`):

- The bar is `content-max` wide on `color-surface-strong` with a 16px backdrop blur and `border-thick`, padding 6px 6px 6px 20px. Today's `@supports not (backdrop-filter …)` fallback to `color-page` stays. The brand is the JL mark at 23px tall, a 24px gap, and "J. LAW. Cordova" in `wordmark`. Links are Silkscreen 13px, 1px tracking, uppercase, `color-ink`, `color-accent` on hover, each at least 44px tall.
- The links are **Range** (`/#range`), **Lately** (`/#accomplishments`) and **Blog** (`/blog/`), then the **Contact** pill. Lately renders only when the home page's accomplishments section renders (`homeSelection(getAccomplishments()).visible`), so it never points at a missing section. The section keeps its `id="accomplishments"`.
- **Small screens:** a pre-paint inline script in `BaseLayout.astro`'s `<head>` sets `data-js` on `<html>`, so the collapsed bar paints first with no layout shift. At 720px and below, `html[data-js] .site-nav__links` is hidden until the bar has `.is-open`, and the menu button shows. The open menu sits under a `border-thick-width` `color-ink` rule inside the bar. Links stack as full-width 44px rows divided by `color-border`, with the pill full width at the bottom. The glyphs are the canvas's pixel paths in `currentColor`: three bars, and a pixel × while open.
- A small client script in `Navigation.astro` toggles the menu and handles R7's closing rules. It loads Motion with a dynamic `import('motion')` the first time the button is hovered, focused or touched, and staggers the links in (opacity 0→1, y −8→0, 0.2s, `easeOut`, 0.04s stagger). If Motion isn't loaded when the menu opens, the links show at once. So pages that use no other Motion don't download it unless someone opens the menu.
- The page head (`.page-head`) starts behind the sticky header, so the 16px gap above the bar and the blur behind it show the band's color at the top of the page. Its top padding grows by the header's height, and anchors keep `--header-offset`. The hero band does the same.

**Footer** (`Footer.astro`, `footer.css`):

- `color-footer` ground. A 28px grass edge runs across the top, with a highlight row and a stepped bottom that drips into the dirt, and sparse 4px dirt speckles sit below it. They're drawn as two repeating pixel-art tiles, `footer-grass` (48×28) and `footer-dirt` (64×48), compiled by `npm run art` from `src/assets/pixel-art/source/` in the world palette (`grass-1`…`grass-4`, `soil-3`, `soil-4` and `ink` for the darkest speckle), and repeated as a CSS background (`image-rendering: pixelated`). It's made with the `pixel-art` skill and kept within the engine's size caps, and the owner reviews its preview. The intent now puts this one piece of art in scope (C4).
- Content: the JL mark on a `color-card` chip (the mark reads on light grounds only), then "© 2026 J. LAW. CORDOVA" and the links GitHub, LinkedIn, X, Blog and "↑ TOP", in Silkscreen 13px with 1px tracking. "↑ TOP" links to `#top`, which every browser treats as the top of the page when no element has that id, so it works on every page. Padding is 52px on top (28px grass plus 24px) and 40px below.
- Links are `color-on-footer` and turn `color-gold` on hover. "↑ TOP" is `color-gold` at rest. Focus keeps today's `color-on-forest` outline over a `color-footer` halo.

### Home page

**Hero** (`Hero.astro`, `hero.css`):

- Layout as today: copy left, the island right, wrapping when they don't fit. The greeting line (`.hero__pretitle`) is removed. The title is unchanged. The lede becomes the canvas's: "Senior developer and tech lead in Davao City. I lead full-stack teams, design data platforms on Microsoft Fabric, and run releases with sign-offs and rollback." The buttons follow the new Button.
- The hero band starts behind the sticky header, as the page head does.
- **Motion on load:** the title, lede and buttons stagger in (opacity 0→1, y 16→0, 0.4s, `easeOut`, 0.08s stagger), and the island follows (y 24→0, 0.5s, 0.2s delay). The island keeps its `.floaty` CSS loop on an inner wrapper, so the two transforms don't fight.

**Range** (`Range.astro`, `range.css`) becomes the handheld console:

- **Layout:** the heading and paragraph sit centered above the console, at most 640px wide. The console is centered, at most 540px wide, and runs off the section's bottom edge: its bottom border is removed, and the section's bottom padding is `0` with `overflow: hidden`. Today's frosted panel and its backdrop blur are removed.
- **Shell:** a `color-gold` body with `border-thick` on three sides, padding 28px (16px at 480px and below).
- **Screen:** a `color-ink` bezel holding a `color-card` stage with the `.isogrid`. The nameplate sits top-left on `color-page` with `border-thick`, in `label` type: a 12px swatch of the class color in a 2px `color-ink` square, then the class name. The sprite sits below it, with its `role="img"` and label as today.
- **Controls,** left to right:
  - a D-pad, a 3 × 3 grid of 44px cells in `color-ink`, where left and right are the Previous and Next buttons with today's labels, and up, down and the center are decoration (`aria-hidden`);
  - a START button (64 × 44px): a pixel slot above the "START" label, in Silkscreen at 10px. It pauses and plays the rotation with `aria-pressed`, and its accessible name is "Start: pause the class rotation", so it contains the visible word;
  - A and B, 52px square, `color-accent` with `border-thick`, with "JUMP" and "BACK" labels beside them in Silkscreen at 10px. A's name is "A: jump" and B's is "B: previous class". B does what Previous does.
- **Decoration:** five speaker slots at the bottom right, in `color-ink` at 40% opacity, `aria-hidden`.
- **The pager dots are removed,** as the canvas has it (C5). The position stays in the nameplate's visually hidden ", class n of 7" text.
- **Behavior:** as today. The rotation advances every 2.2s and stops on hover, on focus inside the console, when the page is hidden and when paused. A user's change is announced politely, and auto-advance isn't. Without JavaScript, class 0 shows and the buttons are hidden with `visibility`, so nothing shifts.
- **Motion:**
  - the console rises in as it scrolls into view (y 48→0, 0.4s, `easeOut`);
  - on a class change, the sprite slides in from the side it came from (x ±24→0, 0.25s, `easeOut`), and the nameplate pops (scale 0.88→1.06→1, 0.2s, `easeOut`);
  - A makes the sprite hop (y 0→−16→0→−6→0 with a small x shake, 0.5s, eased in and out on each leg), and the class doesn't change.
- Focus on the console's buttons is a `color-ink` outline over a `color-gold` halo.

**Accomplishments** (`Accomplishments.astro`, `accomplishments.css`):

- **Two columns** at more than 720px, at a 1:2 ratio with a 48px gap. The left column holds the heading ("What I’ve been working on lately", unchanged), a new lede in `color-ink-muted`, "A running log of what I’ve shipped recently.", and the Show more button when `showMore` holds. The right column holds the rows. In the DOM the button comes after the list, so at 720px and below it sits under the rows, and grid areas place it in the left column on wide screens.
- Rows follow AchievementRow: a 3px `color-border` edge, dashed `color-border-strong` when locked, 12px apart, `color-border-strong` over `color-surface-ghost` on hover. Today's grid-rows transition on the panel is replaced by Motion: when a `<details>` opens, its panel fades and drops in (y −8→0, 0.25s, `easeOut`). Closing is instant. The chevron turns in a `easeOut` CSS transition. Rows stagger in as the list scrolls into view (y 16→0, 0.4s, `easeOut`, 0.06s stagger), and so do the rows on `/accomplishments/`.
- The tooltip is `color-page` on `color-ink` with `border-thick` and no shadow.

### Other pages

- **Blog list and posts:** cards, pagination, featured images, inline code, code blocks and blockquotes go square, and their pixel shadows go. Post cards stagger in on the blog list. Post pages get no entrance motion, since people read them.
- **`/accomplishments/`:** as Accomplishments above, plus square pagination.
- **Design-system page:** the previews update (R15). `design-system.css`'s radius uses resolve to 0 through the tokens.
- **Lab:** `lab.css` goes square through the tokens. Its two `shadow-pixel` uses become `border-thick` in the theme step, with every other stylesheet. Its spread-only selection rings stay, and the lab gets no Motion.

### Motion module

- `src/lib/motion.ts` is the one place that imports `motion`. It exports small helpers: `reveal(elements, from)` for scroll entrances with `inView`, `play(element, keyframes, options)`, and the shared smooth `easeOut` easing. Every helper returns at once under reduced motion, which it reads from `matchMedia` on each call.
- Each island's script imports only the helpers it uses, so Vite splits the bundle and pages without an island load no Motion code. The nav uses a dynamic import, as above.
- Start states are set inside the helpers, in the same call that starts the animation, so R11 holds by construction. `reveal` only hides elements whose top is below the viewport when it runs, and a `beforeprint` listener reveals them all.

### Budgets

The redesign spec's §12 and the hero island detail spec's Budgets set today's limits. The owner approved the Motion weight and a bigger JavaScript budget on 2026-10-05 (C2), and chose the full `motion` build, not `motion/mini`:

| Measure (gzip transfer) | Today | New |
| --- | --- | --- |
| Home JS, all chunks | ≤ 2 KB (the Range script) | **≤ 32 KB**: Motion's `animate` with `stagger` and `inView` (about 18 KB), the Range, nav and row scripts, and room for later islands |
| JS on a page with no Motion island (a post, 404) | — | **≤ 4 KB** until the menu opens |
| CSS, all bundles | ≤ 8 KB | ≤ 8 KB, unchanged |
| Home total first-party | ≤ 160 KB | ≤ 160 KB, unchanged |
| Lighthouse performance, mobile | ≥ 95 | ≥ 95, unchanged |

The plan measures these from `npm run build` and records the numbers. The redesign spec's §12 gets a dated note pointing here.

### Sequencing

The owner decided on 2026-10-05 (C7) that nothing touching the hero files would start until `feat/hero-island-detail` merged into `main`. It merged the same day (#86), so the hero is built with the nav and footer.

This section first listed `lab.css` among the files the island branch also edits. It didn't: #86 changed the lab's TypeScript, not its stylesheet, and it touched none of `Hero.astro`, `HeroIsland.astro` or `hero.css`. So `lab.css` goes square, and loses its pixel shadows, in the theme step with every other stylesheet. The order of the work is in [plan.md](plan.md).

### Tests

New:

- **`scripts/pixel-first-look.test.mjs`** (node:test, no network): no `border-radius` other than `0`, no `box-shadow` with an offset or blur, no `backdrop-filter` outside `.site-nav`, and no retired token name anywhere in `src/` or `docs/design-system/`; `border-thick` exists in both token files; `package.json` pins `motion` exactly and adds nothing else.
- **`scripts/e2e/shell.e2e.mjs`:**
  - at 390px, R7: the menu button is visible and the links are hidden; the button opens and closes the menu with the right `aria-expanded` and label; a link, Escape and an outside click close it, and Escape returns focus; widening past 720px resets it;
  - without JavaScript, the links show and the button doesn't;
  - at 1440px, the button is hidden;
  - the nav's computed `box-shadow` is `none` and its `backdrop-filter` is a 16px blur, and every corner on the page is square;
  - the footer is 44px per link, "↑ TOP" scrolls to the top on the home page and on a post, and there's no horizontal scroll at 390px.
- **Range e2e:** START pauses and plays; B goes back; A hops without changing the class; A is hidden under reduced motion; every console button is at least 44px.
- **Motion e2e:**
  - after load and a full scroll, every animated element is at opacity 1 with no transform;
  - with JavaScript off, and with the Motion chunk blocked, the console and every row are visible at load (and the hero, once its slice lands);
  - under reduced motion, no element has a running animation.

Changed, never skipped, because this spec changes what they pin:

| Test | Becomes |
| --- | --- |
| `range.e2e.mjs` R6, R8: "every class has its dot, name, label and shadow" | Every class has its name, label and swatch color. No dots (C5). The nameplate keeps its 44px height. |
| `accomplishments.e2e.mjs` R20: "reduced motion turns off the opening, chevron and tooltip transitions" | The same, with the panel's opening now a Motion animation that doesn't run |
| `design-system.test.mjs`'s `tokenList` families (`color`, `radius`, `spacing`, `shadow`, `layout`) | Gains `border`, so the sync test covers `border-thick` |

## Areas of concern

The owner resolved C1–C5 and C7 on 2026-10-05. Each is kept with its decision, so the plan and the verifier can trace it.

- **C1. The canvas and the design system disagreed in seven places.** *Resolved: the canvas wins.* The intent's outcome and constraints were amended in their own commit, and the design system's README, Navigation, Footer and AchievementRow guidance changed in this PR to match ([Canvas and design system](#canvas-and-design-system)). Two of the seven went against the intent itself, the nav's blur and the hero greeting, and the owner chose the canvas for both.
- **C2. Motion's weight against the JavaScript budget.** *Resolved: approved.* About 18 KB gzip for the full `motion` build is fine, with no lighter build for now. The home JS budget rises to 32 KB to leave room ([Budgets](#budgets)). Pages without an island stay small, because the nav loads Motion lazily.
- **C3. Motion's dependency tree.** *Resolved: approved.* `motion@14.0.0` installs `framer-motion`, `motion-dom`, `motion-utils` and `tslib`. `react` and `react-dom` are optional peers that npm doesn't install, and the plan confirms that from `package-lock.json`.
- **C4. The grass block needs new pixel art.** *Resolved: in scope.* The intent's out-of-scope line now excepts a footer grass tile. `footer-grass` is drawn in the world palette with the `pixel-art` skill, so CLAUDE.md's rules on colors and pixel-art sources still hold.
- **C5. Earlier requirements change.** *Resolved: the canvas wins.* The Range's pager dots, which the redesign spec required, are removed. The nameplate's colored shadow becomes a swatch. The accomplishments panel's CSS transition, which the gamified accomplishments spec's R20 tests, becomes Motion. The tests change as listed in [Tests](#tests), and each earlier spec gets a dated note pointing here.
- **C6. Content hidden for an entrance.** Policy: "Pages still work and show all their content without JavaScript", and the design system's "Never hide content". Scroll entrances must hide elements below the fold until they arrive, so a failure between hiding and revealing could leave a row invisible. The [Motion module](#motion-module) only hides elements from the same script that reveals them, never in CSS, and reveals everything before printing. The e2e tests block the Motion chunk to prove it. **No decision needed** unless the owner wants entrances on load only, with nothing waiting for scroll.
- **C7. The work in flight on the hero island.** *Resolved: wait.* The hero files weren't touched until `feat/hero-island-detail` merged. It merged on 2026-10-05 ([Sequencing](#sequencing)).

## Open questions

- From the intent: none. The nav's blur stays, as the amended intent records.
- **What A does under reduced motion.** A's only effect is the hop, which reduced motion turns off, so the spec hides A and its label (R12). The alternative is a one-frame offset with no movement. Recommendation: hide it. Still open for the owner.
