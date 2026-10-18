# AchievementToast

"Achievement unlocked!" for the newest earned achievement: a small gold card that rises into the bottom-right corner once a visit, when the home page's achievements list scrolls into view, and leaves by itself.

## Use

- `div.achievement-toast[role="status"] > div.achievement-toast__card[hidden]`: the status region is always in the page, fixed 24px from the bottom right (16px from the bottom, left and right at 480px and below), at most 420px wide. The card renders `hidden`, and a script shows it, so without JavaScript there's no toast.
- The card is `color-gold` under `color-ink` with `border-thick`, square, with no shadow. It carries `data-theme="light"`, like the Range handheld, so it looks the same in the dark theme. Its grid is the framed icon (60px), the text, and a 44px close button with a pixel ×. The close button keeps the ink focus ring, inside the card.
- The text is the label in `label` style ("Achievement unlocked!"), the achievement's title as its row leads it in Sora 600 at 18px, and its short line and month in Sora at 14px ("Shipped the new booking app release · Sep 2026", or the month alone).
- It shows 0.66s after the list comes into view, once a browser session. It rises 16px and fades in over 0.3s, its frame hops once, and it fades out over 0.25s. Under reduced motion it appears and leaves without moving.
- It closes with its button or Escape, and by itself after 5 seconds. The timer pauses while the pointer is over it or focus is inside it. If it closes with focus inside, focus moves to the section heading.

## What you provide

- The newest earned achievement's icon and frame, title, short line and month.

## Content

- The label is always "Achievement unlocked!": the one exclamation mark on the site (README, Gamified copy).
- It names an earned achievement only, never a locked one, and only the newest.

## Don't

- Don't show it on other pages, more than once a session, or for anything but the newest earned achievement.
- Don't move focus to it, or make it the only place something is said: it repeats the first row.
- Don't keep it on screen without a way to close it.
