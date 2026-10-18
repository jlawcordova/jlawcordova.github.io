# Plan: Dark mode (from intent.md 2026-10-17)

## Files that change
- `docs/intents/2026-10-dark-mode/intent.md`, `spec.md`, `plan.md` (new)
- `src/styles/variables.css`: the light color block on `:root, [data-theme="light"]`, the dark block, `color-code` and `color-on-code`
- `src/styles/code.css`: `pre` on `color-code` with `color-on-code`
- `src/styles/navigation.css`: the theme button and its order in the bar
- `src/components/Navigation.astro`: the button, its glyphs and its script
- `src/layouts/BaseLayout.astro`: the pre-paint theme script and `theme-color`
- `src/components/home/Range.astro`: `data-theme="light"` on the handheld
- `docs/design-system/tokens.json`, `docs/design-system/README.md`, `docs/design-system/components/Navigation/README.md` and `preview.html`, `docs/design-system/components/CodeBlock/README.md`
- `scripts/design-system.test.mjs`: dark values match `variables.css`, and the R6 contrast pairs
- `scripts/e2e/theme.e2e.mjs` (new): the button, saving, the system default, no flash, the handheld, no sideways scroll

## Order of work
One slice, straight to a PR into `main`: a small change the main session makes in one sitting, so there's no main-session branch. Branch `feat/dark-mode`.
1. Intent, spec and plan.
2. Tokens, code block and the tests for them.
3. The button, the pre-paint script and the handheld scope.
4. Design-system docs.
5. Browser checks.

## Workflow and reviews
The main session runs every step in order, back to back, and opens a ready PR into `main`. Owner review: the PR itself, with screenshots of both themes; the owner accepts intent, spec and plan by merging. Independent review: none. The token, contrast and browser checks cover it.

## Risks
- **A token used as a fill flips badly in dark.** Every use of `color-ink` and `color-page` as a fill was checked: code blocks move to their own tokens, the Range handheld pins light, and the tooltip and pagination flip cleanly. Screenshots of each page in both themes confirm it.
- **The nav wraps at 390px** with the extra button. The e2e check measures the bar's height at 390px and the container query is adjusted if needed.
- **The design-system test reads the first value of each property.** The light block stays first in `variables.css`, so it still compares the light values.

## Proof
`npm test` (`# fail 0`), `npm run build` (0 errors, warnings and hints), `npm run e2e` (`# fail 0`), and screenshots of the home page, a post and `/accomplishments/` in both themes at 1440px and 390px with no sideways scroll.
