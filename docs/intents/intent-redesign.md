# Intent: Redesign the site to the isometric pixel-art brand

| | |
| --- | --- |
| **Status** | Draft |
| **Owner** | J. Law. Cordova |
| **Created** | 2026-10-01 |
| **Design source** | [J. Law Portfolio canvas](https://claude.ai/artifact/JhKbkNZP9qGWHMaWE8USbR), artboard **"Prototype B — isometric"** (`project/Isometric.dc.html`) |
| **Specification** | [`docs/specs/spec-redesign.md`](../specs/spec-redesign.md) |
| **Content source** | [`docs/references/profile.md`](../references/profile.md): updated roles, highlights and skills (2026) |

## Intent

Rebrand jlawcordova.com from the current Poole-based look (white page, pink accent, Merriweather/Roboto, animated cogs) to the warm, isometric pixel-art identity in Prototype B, so the site reads as the portfolio of a senior developer and tech lead who ships whole products. The home page should match the mock. Every other page (blog index, posts, 404) should move to the same branding so the site is consistent.

Prototype B is the source of truth for look, layout, copy and motion. Where this document and the mock disagree, the mock wins unless an entry under [Decisions](#decisions) says otherwise.

The redesign also brings the site's **roles and skills** up to date. The current site describes an earlier backend-focused profile. The updated profile is in [`docs/references/profile.md`](../references/profile.md) and is the source of truth for **facts**: role, disciplines, highlights and skills. The mock's copy was written from that same profile. If the mock's wording and the profile disagree on a fact, follow the profile and record the change under [Decisions](#decisions).

## Why

- The current home page sells "Enterprise Applications / Backend Systems / Automated Pipelines". That undersells the current role, which is leading teams and owning delivery end to end. The profile has since grown into technical leadership, Microsoft Fabric data platforms, secure and PCI-aware delivery, release governance, estimation and mentoring. None of that is on the site today.
- The visual identity is a lightly modified Poole theme with no character of its own.
- The isometric pixel-art world gives a memorable look and makes the "many hats, one craftsman" message concrete: one character who changes outfit for each discipline.

## Scope

### In scope

1. **Design tokens.** Replace `src/styles/variables.css` with the Prototype B palette, type and radii (see [Brand spec](#brand-spec)).
2. **Global shell.** New sticky pill navigation, new footer and fonts, in `BaseLayout.astro`, `Navigation.astro` and `Footer.astro`.
3. **Home page** (`src/pages/index.astro`), rebuilt to the mock's sections without the highlights row: hero, Range, and footer.
4. **Pixel-art assets.** The isometric hero island and the Range character sprite, ported from the mock's SVG.
5. **Blog index, post pages and 404**, restyled with the new tokens, type and surfaces. These have no mock, so they should follow the brand rules below and not be invented from scratch.
6. **Content update.** Replace the old role copy with the updated profile wherever the site describes J. Law's role or work: the hero, Range, `site.description`, meta and Open Graph descriptions, and the 404 page if it has bio copy.
7. **Brand marks.** Keep the existing **JL logo**: the flat block "J" and "L" on a square grid. Recolor it to the new palette, with the J in the accent green (was pink) and the L in ink. Don't use the mock's isometric cube, don't make it 3D, and don't change its shape. Favicon, `apple-touch-icon` and the social share image follow if [Decisions](#decisions) says to.
8. **Clean-up.** Remove styles, assets and scripts made obsolete by the redesign, for example `intro.css`, `bio.css`, the cogs SVG, the skill-rotator script, and Font Awesome if no icon still needs it.

### Out of scope

- The other two prototypes on the canvas (Main and Prototype C).
- Post content, URLs, permalinks, the Atom feed and the content schema. Existing links must keep working.
- A full résumé, project list or skills page. The profile feeds the copy on the existing pages and doesn't become a new page (see [Decisions](#decisions) #4 and #8).
- The build, deploy and hosting setup (Astro, GitHub Pages workflow).
- New pages or sections the mock doesn't show.

## Brand spec

Taken from `Isometric.dc.html`. Treat the values as the token set and name them in `variables.css`.

### Color

| Role | Value | Where it shows in the mock |
| --- | --- | --- |
| Page ground | `#F4EDE0` | Body background |
| Hero ground | `#EADFC8` | Hero section, under the isometric grid |
| Card ground | `#E9DCC6` | Range sprite stage, footer link text |
| Ink | `#2E2418` | Headings, body text, pixel outlines, hard shadows |
| Ink, muted | `#5C4B39` | Lede, descriptions, small caps labels |
| Earth | `#5A3E2B` | Grid lines, borders (at low alpha), logo side |
| **Accent (default)** | `#3F6B45` | Primary button, Contact pill, "not handoffs.", logo top, links |
| Accent hover | `#2E4F33` | Link hover |
| Forest (dark section) | `#2F4632` | Range section background |
| Footer | `#3F2B1E` | Footer background |
| Gold | `#D8B66A` | "One craftsman." on dark |
| On-dark text | `#F4EDE0` / `#D9CFBB` | Heading / body on the forest section |
| On-accent text | `#F6F0E3` | Text on accent buttons |

The mock offers accent alternates `#7B2D3B` (wine), `#8A5A34` (clay) and `#5E6B2F` (olive). Ship the default green. Keep the accent a single token so it can be swapped.

### Type

- **Display / UI pixel font:** [Silkscreen](https://fonts.google.com/specimen/Silkscreen) 400/700. Used for the wordmark, buttons, the Contact pill, small caps labels (dates, categories), the Range class nameplate and the footer. Letter-spacing about 1px.
- **Text font:** [Sora](https://fonts.google.com/specimen/Sora) 400/500/600/700, falling back to `'Segoe UI', system-ui, sans-serif`. Used for headings and body.
- Hero H1: Sora 700, `clamp(44px, 5.6vw, 76px)`, line-height 1.02, letter-spacing -1.5px.
- Section H2: Sora 700, `clamp(40px, 5vw, 64px)`, line-height 1.04, letter-spacing -1px.
- Lede: 18px, line-height 1.6.
- Post body type on the blog is not in the mock. Use Sora at a comfortable reading size (about 17–18px, line-height about 1.7) and keep code in a monospace stack.

### Surfaces and shape

- **Isometric grid texture** (`.isogrid`): two 1px lines at ±26.57° in `rgba(90,62,43,.06)`, tile `32px × 16px`. Used on the hero and the sprite stage.
- **Frosted surfaces:** the nav and cards (blog lists) use translucent cream (`rgba(250,245,235,.55–.62)`), a 1px border in `rgba(90,62,43,.16)`, and a backdrop blur on the nav.
- **Hard pixel shadow:** `4px 4px 0 #2E2418` on the primary button. Never use soft drop shadows on pixel elements.
- **Radii:** nav and pills `999px`, buttons `10px`, cards `14px`, Range panel `24px` outer and `16px` inner.
- Pixel art always renders with `shape-rendering: crispEdges` and is never smoothed or blurred when scaled.
- Max content width `1160px`, 24px side gutters.

### Motion

All of it is stepped (`steps()` / `step-end`) so it feels like sprite animation, not tweening:

- The hero island floats (`floaty`, 6s, 6px).
- Clouds drift (`pcloud`), with staggered durations.
- Two trucks drive the road (`idrive`, 13s, offset by half a cycle).
- The waterfall, flags and other small frame loops (`wf`, `ff`, `hf`).
- The Range sprite auto-advances every 2.2s. The next arrow gives a short pulse on each advance.

`prefers-reduced-motion: reduce` must stop every animation and show a single static frame, as the mock's media query does.

## Page spec: home

1. **Header.** A sticky, centered pill nav: the recolored JL logo (in place of the mock's cube) with the **J.LAW** wordmark, links **Range** (`#range`) and **Blog** (`/blog`), and an accent **Contact** pill that links to LinkedIn.
2. **Hero** (`#top`, isogrid on hero ground):
   - Left: "Hi, I'm J. Law. Cordova." / H1 "I ship whole products, *not handoffs.*" (second clause in accent) / a **short** lede, two sentences, about being a senior developer and tech lead at Netzon in Davao City / buttons **Press start** (to `#range`, primary with a hard shadow) and **Get in touch** (LinkedIn, ghost).
   - Right: the floating isometric island. It has a house, river and waterfall, a bridge, a road with two trucks, a tower crane, trees and drifting clouds. A small second island holds the character at a chalkboard.
   - **No highlights section.** The mock's `HIGHLIGHTS` label row and six highlight cards are left out on purpose.
3. **Range** (`#range`, forest background):
   - Left: a frosted panel holding the isogrid stage, with a nameplate showing the current class, previous and next pixel-arrow buttons, the character sprite on its island, and five pager dots.
   - Classes, in order: **Front-end, Infrastructure, UX Design, Data Engineering, Project Management**. Each one recolors the sprite's outfit and headgear (palette and row overrides in the mock's `CL` table).
   - The classes should line up with the profile's [disciplines](../references/profile.md#disciplines). **UX Design** is backed by the Figma UI design work for a client's internal retail planning tool. **Security & Governance**, one of the profile's strongest areas, has no class. See [Decisions](#decisions) #7.
   - Right: H2 "Many hats. *One craftsman.*" (second clause in gold), then the paragraph about working every stage of shipping software.
4. **Footer.** Dark brown bar in Silkscreen: "© {year} J. LAW. CORDOVA" with links **GITHUB · LINKEDIN · X · BLOG**. Keep the year computed at build time as the current footer does.

Copy should be taken verbatim from the mock, checked against the [profile](../references/profile.md). The current home sections (intro with cogs, "Code + Create" bio, recent blog posts) are replaced. See [Decisions](#decisions) about recent posts.

## Constraints

- **Stack stays the same:** Astro, TypeScript, plain CSS in `src/styles/`, tokens in `variables.css`. No CSS framework, and no UI framework for one carousel.
- **Ship as little JS as possible.** Only the Range carousel needs script. Write it as a small vanilla `<script>` in an Astro component, like the current skill rotator. Everything else is static HTML and CSS.
- **Keep the pixel art lean.** The mock inlines about 320 KB of hero SVG and about 130 KB of sprite SVG as individual `<rect>`s. Port it as static assets or components, and merge runs of same-colored pixels into paths. The home page should not get much heavier than it is today. The art must stay pixel-exact to the mock.
- **Accessibility:**
  - Decorative art is `aria-hidden`.
  - The sprite has a live text alternative ("Pixel-art character dressed for {class}").
  - Prev and next are real `<button>`s with `aria-label`s, at least 44px.
  - Focus is visible (2px ink outline with a cream halo, per the mock).
  - Body text meets 4.5:1 contrast on every ground it sits on.
  - The auto-advance pauses on hover, focus and reduced motion.
- **Responsive:**
  - Every section wraps to one column at phone width with a 16–24px gutter and no horizontal scroll.
  - The nav wraps instead of collapsing into a drawer.
  - The pixel art scales down with `max-width: 100%`.
- **Fonts:** load only Silkscreen and Sora from Google Fonts, and drop Merriweather and Roboto.
- **SEO and sharing:** keep the existing meta and Open Graph tags working. Update `site.description` to match the new positioning, drawing on the profile summary.
- **Confidentiality:** the repo and site are public. Copy may use only what's in [`docs/references/profile.md`](../references/profile.md): no client names, project codenames, colleagues' names, or internal incidents and decisions. Describe work by its kind, not by who it was for.

## Acceptance criteria

- [ ] At 1440px wide, the home page matches Prototype B in layout, colors, type, copy and pixel art when compared side by side, apart from the deliberate changes recorded here and in the spec (JL logo, no highlights section, shorter hero paragraph).
- [ ] Every factual claim on the site (role, employer, disciplines, technologies) can be traced to `docs/references/profile.md`. No old role copy ("Enterprise Applications / Backend Systems / Automated Pipelines", "Code + Create" bio) remains.
- [ ] No client names, project codenames or colleagues' names appear anywhere in the built site.
- [ ] At 390px wide, the home page has no horizontal scroll, all content is reachable, and the tap targets are at least 44px.
- [ ] The Range carousel cycles through all five classes on its own and with the buttons. The nameplate, sprite colors, pager dots and text alternative all update together.
- [ ] With `prefers-reduced-motion: reduce`, nothing moves and each animated element shows one static frame.
- [ ] Blog index, every post, and 404 use the new tokens, fonts, nav and footer, with no leftover pink accent, Merriweather, Roboto or Font Awesome icons.
- [ ] Code blocks in posts stay legible, with syntax colors re-tuned to the new palette if needed.
- [ ] Every existing post URL, `/blog/pageN/` and `/atom.xml` still resolves.
- [ ] `npm run build` passes, including `astro check`, with no new warnings.
- [ ] Home page weight (HTML + CSS + JS + images) is no more than today's, or any increase is justified in the PR.
- [ ] Lighthouse accessibility is 100 on the home page and a post page.
- [ ] `variables.css` and any CSS left unused by the redesign have been removed.

## Decisions

Open items to settle before or during implementation. Record the answer here.

| # | Question | Default if not decided |
| --- | --- | --- |
| 1 | The mock drops the **Recent Blog Posts** section from the home page. Drop it, or add a section in the new style before the footer? | Drop it. Blog stays one click away in the nav and footer. |
| 2 | The mock links **Contact** and **Get in touch** to LinkedIn. Use email (`site.author.email`) instead? | LinkedIn, as in the mock. |
| 3 | Should the recolored JL logo replace the **favicon, touch icons and OG share image**? | Yes for favicon and touch icons. Regenerate the OG image in the new style. |
| 4 | Should the nav and footer link to the **résumé PDF** (`/public/CORDOVA-JUNEL-LAWRENCE-RESUME.pdf`)? It probably predates the updated profile. | No, as in the mock. Refreshing the PDF against the profile is a separate task. |
| 5 | **Post pages** have no mock. Is a token-level restyle enough, or should a post layout be designed on the canvas first? | Token-level restyle, reviewed in the PR. |
| 6 | **Twitter → X.** The footer label becomes "X". Should the URL change to `x.com`? | Keep the existing URL and change only the label. |
| 7 | **Range classes vs. profile.** Should **Security & Governance** get a class, and should Infrastructure be renamed? UX Design stays, since the Figma work backs it. | Keep the mock's five classes, including UX Design. Rename **Infrastructure** to **Cloud & DevOps** to match the profile. Don't add Security & Governance: a sixth class would need a new outfit and another pager dot. The security work stays in the profile and can come back in a later change. |
| 8 | Should the home page show a **skills list** from the profile's inventory, for example a strip under Range? | No. The mock has none, and Range carries it. Revisit after launch. |

## References

- Design canvas: https://claude.ai/artifact/JhKbkNZP9qGWHMaWE8USbR (Prototype B — isometric)
- Updated roles and skills: `docs/references/profile.md`
- Current tokens: `src/styles/variables.css`
- Current shell: `src/layouts/BaseLayout.astro`, `src/components/Navigation.astro`, `src/components/Footer.astro`
- Current home: `src/pages/index.astro`
