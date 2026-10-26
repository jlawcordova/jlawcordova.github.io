# AskPanel

Ask J. Law: the bot that answers questions about the site's owner from the site's public content ([ask bot spec](../../../intents/2026-10-ask-bot/spec.md)). A speech bubble over the hero island's character opens it, and the character stands on the panel's top-left edge while it's open.

## Use

- **The bubble:** `button.ask-bubble` over the island, placed by a script above the character's head, with a stepped ink tail down to it. `color-page` under `color-ink` with `border-thick`, square, Sora 500 at 15px, at most 236px wide and at least 44px tall. It renders `hidden` and shows only once it's placed, so it's never a dead button. Only on the home page, and only when the site is built with the bot's address.
- **The panel:** `section.ask-panel[role="dialog"]`, named "Ask J. Law", non-modal, fixed 24px from the bottom left, at most 400px wide, `color-page` with `border-thick`. On a phone (640px and below) it takes the width, sits on the bottom edge and is at most 60% of the screen; it moves up with the on-screen keyboard.
- Its parts, top to bottom: the title (Sora 600, 18px) with the AI label under it (13px, `color-ink-muted`) and a ghost Close button; the conversation (`ol.ask-panel__log`, `aria-live="polite"`); three suggested questions (`button.ask-chip`, Sora 14px, 2px ink edge, 44px tall); the question box (16px, `border-thick`, 200 characters at most) with a primary Ask button; and the privacy line (12px, `color-ink-muted`).
- **Messages:** the bot's on `color-card`, left; the visitor's with a 1px `color-border-strong` edge, right. Source links read "Source: <page>" and only ever go to a page on the site. "Get in touch" follows a reply where it helps.
- **Waiting:** Ask and the chips are disabled, and three 6px dots pulse in turn in the bot's place, smoothly, since only the pixel art steps (still under reduced motion). Answers arrive whole.
- **Motion:** pressing the bubble plays the character's jump (its `hop` state, through `data-play`), then the character glides to the panel's edge in 0.5s with `easeOut`, and the panel rises 16px and fades in over 0.3s. Closing glides it back, or fades it where the island is off screen. These glides are a named exception to the 8–24px rule, like the island's build-up. Under reduced motion it moves there without jumping or gliding, and doesn't bob.
- **Focus:** opening moves focus to the question box; Close or Escape closes it and returns focus to the bubble. The moving character is decorative (`aria-hidden`).

## What you provide

- Nothing per use. The copy is in `src/lib/ask-state.mjs`, word for word from the spec.

## Content

- The bubble: "Hi, I'm J. Law. What would you like to know?". The label: "AI avatar. Answers come from this site's public content.". The first line, before any question: "I'm an AI avatar of J. Law. I answer from what's published on this site, and I can be wrong.". The privacy line: "Questions go to an AI service. Don't include personal details.".
- The limits and failures say what happened and when it clears, in the plain voice: no error codes, no exclamation marks, and never a count of questions left.

## Don't

- Don't put the bot on other pages, or keep the conversation after the page closes.
- Don't render a reply's text as HTML, or link a source that isn't a path on the site.
- Don't show a running count of questions left.
