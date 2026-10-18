# Spec: Achievements redesign (from intent.md 2026-10-18)
Status: built and approved by the owner in [#124](https://github.com/jlawcordova/jlawcordova.github.io/pull/124), 2026-10-18. R19's one-row nav and R20a were added when dark mode reached `main` mid-change, and R9 now spells out the full-color padlock, as the owner asked during review. Written together with the intent, plan and code at the owner's request, so they were approved together when it merged.

Implements [`intent.md`](intent.md). Where they disagree, the intent wins and this spec gets fixed. The look comes from the canvas the owner reviewed on 2026-10-17 and 2026-10-18: framed icons, tally chips, a gold "Achievement unlocked!" toast and a staggered entrance. The owner's decisions after the review are in the intent: no color key, the toast keeps its "!", an achievements URL with redirects, and a nav link named "Achievements".

**Naming.** The records stay *accomplishments*: the data file, the fetch script, the AT Protocol records, the `accomplishments` skill and the component file names don't change. Everything a reader sees says *achievements*. This spec uses "achievement" for what's on the page and "record" for the data.

## Requirements

### Copy

- **R1. Headings.** The home section's heading and the full list's page title are both "Achievements". The page's `<title>` is "Achievements - J. Law. Cordova".
- **R2. Subtitles.** Under the home heading: "I keep a log of my recent work. Here’s what I’ve been up to lately." Under the page title, on every page of the list: "I keep a log of my recent work. Locked achievements are planned, not done yet." Nothing on either page says the list is written like a game's.
- **R3. List headings.** The done records are under "Earned achievements" (an `h2`), with the line "Newest first. Open one for the details." The locked records, on page 1 only, are under "Locked achievements", with the line "Planned work I haven’t finished. Each one moves to the earned list when it’s done." A locked row still says "Not done yet" where the date goes.
- **R4. Home button.** The home section's link to the full list reads "View all" (visually hidden: " achievements").
- **R5. Page label.** The pixel label above the page title reads "Page N of M" when the list has more than one page, and is left out otherwise. The counts move to the tally (R6).

### Color and frames

- **R6. Tally.** Under the subtitle on the home section and on every page of the list, two chips give the totals: "N earned" (a `color-gold` fill under `color-ink` text, with `border-thick`) and "N locked" (a 3px dashed `color-border-strong` edge, like a locked row). A chip with a count of 0 isn't shown. The counts are of all records, not of one page. There's no progress figure such as "30 of 33".
- **R7. Latest.** The newest earned row (the first done record) carries a small "Latest" chip after its title: Silkscreen 11px, `color-ink` on a `color-gold` fill. It's on the home section and on page 1 of the list.
- **R8. Framed icons.** Every row's icon sits in a frame: a 20 × 20 pixel slot drawn at 3× (60px). It has a 1px `ink` edge, a 1px bevel (light on the top and left, dark on the bottom and right), and a fill, with the 16 × 16 icon in the middle. The fill says what kind of work the icon stands for:

  | Frame | Icons | Fill, bevel shadow, bevel light (world palette) |
  | --- | --- | --- |
  | `make` | sprout, hammer, rocket, flask | `gold-1`, `gold-3`, `cream` |
  | `fix` | bug, shield, key, wrench | `grass-1`, `grass-2`, `cream` |
  | `think` | book, magnifier, signpost, chest | `skin-1`, `wood-1`, `cream` |
  | `people` | apple, heart, speech | `water-1`, `water-2`, `cream` |
  | `milestone` | trophy | `roof-1`, `roof-2`, `skin-1` |
  | `plain` | star (the fallback), and every locked row | `path-1`, `path-2`, `cream` |

  There's no key to the colors on the page: the icon already says the kind, and the color only backs it up.
- **R9. Locked rows.** A locked row uses the `plain` frame, dims its icon to 40% grey as today, and draws the padlock over the frame's top-right corner. Only the achievement's own icon dims: the padlock and the frame keep their full colors. Its dashed edge doesn't change.
- **R10. Frames are pixel art.** The frames are drawn in the pixel-art engine as one sheet, like the icon sheet, so the UI's CSS adds no colors. Each icon's frame kind is listed beside its meaning in the icon list, and a test fails if an icon has no frame.

### Toast

- **R11. When.** On the home page, the first time the achievements list scrolls into view in a browser session, a toast appears for the newest earned achievement. It doesn't appear when there's no earned record, when JavaScript is off, or again in the same session. It isn't on the full list page.
- **R12. What it says.** A label, "Achievement unlocked!", then the achievement's title as its row leads, then its short line and month ("Shipped the new booking app release · Sep 2026", or the month alone when there's no short line), with its framed icon on the left. The label is the brand book's one exception to "no exclamation marks".
- **R13. How it looks.** A `color-gold` fill, `border-thick`, square, no shadow, at most 420px wide. Fixed 24px from the bottom right of the viewport, and 16px from the bottom, left and right at 480px and below. Text is `color-ink` (7.8:1 on gold).
- **R14. How it behaves.** It's a polite status message (`role="status"`), so screen readers announce it without moving focus. It closes with its close button (a 44px target with the focus ring) or Escape, and closes itself after 5 seconds. The timer pauses while the pointer is over it or focus is inside it. If it closes while focus is inside, focus moves to the section heading.

### Motion

- **R15. Entrance.** Rows still below the fold rise in as today (16px, 0.4s, 0.06s apart). As each earned row lands, its frame hops once: up 8px and back, in 0.3s, 0.06s apart. Locked frames don't hop. The toast rises 16px and fades in over 0.3s, 0.66s after the list comes into view, and fades out over 0.25s when it closes. All of it uses the shared ease-out.
- **R16. Reduced motion.** Under `prefers-reduced-motion: reduce`, nothing moves: rows show at once, frames don't hop, and the toast appears and leaves without sliding or fading.

### URLs and navigation

- **R17. New URLs.** The full list is at `/achievements/`, with later pages at `/achievements/page2/`, `/achievements/page3/` and so on, 12 earned rows a page as today.
- **R18. Redirects.** `/accomplishments/` and every `/accomplishments/pageN/` that exists redirect to the matching `/achievements/` URL. GitHub Pages can't send HTTP redirects, so each old URL is a small page with an instant refresh, a canonical link to the new URL, `noindex`, and a plain link for anyone whose browser doesn't follow the refresh.
- **R19. Navigation.** The nav link "Lately" becomes "Achievements". It still points at the home page's section, now `/#achievements`, and still shows only when that section renders. The bar stays one row at every width with the longer link: where every link shares the row (a header of 673px to 800px), the wordmark steps down and the links' padding narrows.
- **R20. Layout.** On the list page, the pagination sits right under the earned list, before the locked list.

### Dark theme

- **R20a. Gold stays ink on gold.** The dark theme (merged into `main` while this change was built) flips `color-ink` to cream but keeps `color-gold`. The earned chip, the Latest chip and the toast carry `data-theme="light"`, as the brand book says for drawn objects like the Range handheld, so they're ink on gold in both themes. The locked chip, the rows and the headings follow the theme. The frames and icons are pixel art and aren't redrawn.

### Design system and checks

- **R21. Brand book.** The design system README records: the toast label as the second exception to the copy rules, beside the Range heading; the frame sheet under Iconography, with the frame kinds; achievements, not accomplishments, as the place gamified copy plays; and the frame hop and toast under Motion. The AchievementRow guidelines and preview show frames, the tally and the Latest chip. A new AchievementToast component has guidelines and a preview.
- **R22. Docs that name the old URL** (README, CLAUDE.md, the achievement-icon skill, code comments) name the new one. Earlier changes' docs under `docs/intents/` aren't rewritten.
- **R23. Checks.** `npm test` covers the frame kinds and the frame sheet. The browser checks cover R1–R20 on the fixture builds, at 1440px and 390px, including the redirects, the toast and reduced motion. `npm run build`, `npm test`, `npm run art` and `npm run e2e` pass as `CLAUDE.md` requires.

## Design

### Data

- `src/lib/achievement-icons.mjs` gains `FRAMES`, the frame kinds in sheet order (`plain`, `make`, `fix`, `think`, `people`, `milestone`), a `frame` on every entry of `ICONS`, and `frameFor(id)`, which gives an icon's frame (`plain` for the fallback and anything unknown). `iconCatalog()`, and so `/achievement-icons.json`, doesn't change: the `accomplishments` skill picks icons by meaning, not by frame.
- `rowFor()` in `src/lib/accomplishment-list.mjs` also returns the row's `frame`: the icon's for a done record, `plain` for a locked one.

### Art

- Six objects, `frame-<kind>.mjs`, each a 20 × 20 sprite using only the colors in R8 plus `ink`.
- One scene, `achievement-frames.mjs`, places them in a row of 20px cells in `FRAMES` order and compiles to `src/assets/pixel-art/achievement-frames.svg`, within a 2 KB gzip budget that `npm test` checks.
- `AchievementIcons.astro` inlines this sheet next to the icon sheet, once a page, as `#achievement-frames`. A row crops its frame with `viewBox="<20 × index> 0 20 20"`.

### Rows (`AccomplishmentRow.astro`, `accomplishments.css`)

- The icon slot is 60px: the frame SVG, the 48px icon SVG 6px in from its top and left, and, when locked, the padlock 9px past its top-right corner.
- The row grid's first column grows from 48px to 60px and the row from 72px to 84px tall, with 9px padding on the icon side. The open panel's text lines up with the title (85px in), and the tooltip moves with it. At 480px and below the date still stacks under the text.
- A `latest` prop adds the Latest chip inside the title.

### Home section (`Accomplishments.astro`)

- The section's id becomes `achievements`, its heading's `achievements-title`. The left column holds the heading, the subtitle, the tally and "View all"; the rows stay on the right, and stack under the tally at 720px and below with "View all" after them, as today.
- The toast's markup renders inside the section, after the rows, only when there's an earned record: a `role="status"` region that is always present, holding the card with the `hidden` attribute. `src/lib/achievement-toast.ts`, called from the component's script, shows it (R11–R14) with `inView` from Motion, remembers it in `sessionStorage` (inside `try`, so a blocked store just means it can show again), and animates it with `play()`.
- `AchievementIcon.astro` draws the framed icon for the rows and the toast, and `AchievementTally.astro` the tally for the home section and the list page.

### List page (`AccomplishmentsPage.astro`, `PageHead.astro`, routes)

- `src/pages/accomplishments/` moves to `src/pages/achievements/`. Two small pages stay at the old paths, `index.astro` and `[page].astro` (with the same `getStaticPaths` as the list), and each returns `Astro.redirect()` to the new URL with a 301. A static build writes them as refresh pages. A `redirects` entry in `astro.config.mjs` would drop the trailing slash on the dynamic one.
- `PageHead` gains an optional default slot after the title, for the subtitle and the tally. Pages that don't pass one are unchanged.
- The page gets the totals as props, so pages 2 and later show the same tally as page 1.

### Motion (`src/lib/motion.ts`)

- A new `hop(elements, { delay, stagger })`: as each element comes into view, it moves up 8px and back over 0.3s, after `delay`, with elements entering together `stagger` seconds apart. It never hides anything and does nothing under reduced motion.
- Both lists call `reveal()` for the rows, as now, and `hop()` for the earned frames, with a 0.4s delay so the hop starts as a rising row lands.

## Areas of concern

- **C1. The exclamation mark.** The brand book says "no exclamation marks". The owner chose "Achievement unlocked!" anyway. The brand book records it as an exception, scoped to the toast label only, next to the Range heading's exception. Resolved by the owner.
- **C2. World colors in the UI.** The brand book keeps the pixel-art palette "for illustration only, never for UI". Drawing the frames as pixel art keeps the colors in the art, as the icons' own colors are, and the CSS adds none. This rests on reading a frame as part of the icon, which the owner should confirm in review.
- **C3. Refresh redirects.** Static hosting can't send a 301. Astro's refresh pages carry a canonical link and `noindex`, which search engines treat as a move. The old `#accomplishments` anchor isn't redirected (fragments never reach the server), so an old link to it opens the home page at the top. The nav was the only link to it on the site.
- **C4. A toast that leaves by itself.** Timed content needs a way to stop it (WCAG 2.2.1). The toast repeats the first row, pauses while it's hovered or focused, and has a close button and Escape. It covers the lower rows for at most 5 seconds.
- **C5. Two words for one thing.** Records are "accomplishments" and the page says "achievements". The split is fixed by this spec's Naming note, so code and docs say which one they mean.
- **C6. Dark mode landed mid-change.** The dark theme merged into `main` while this change was being built. R19's nav fit and R20a follow from it.

## Open questions

- The intent left none. None are new.
