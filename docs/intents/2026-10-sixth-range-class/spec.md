# Spec: Sixth Range class (from intent.md 2026-10-03)
Status: approved.

## Requirements

Traced to the [intent](intent.md). Each is checkable.

- **R1. Six classes.** `rangeClasses` in `src/data/home.ts` has a sixth entry, `Security & Governance`, after Project Management. The carousel shows it as class 6 of 6. *(Outcome: sixth class)*
- **R2. Its outfit is in the sprite.** `src/assets/pixel-art/range-sprite.svg` has a `<g data-class="5">` holding the existing `outfit-security-governance` object, placed like the other five. The outfit's own art isn't changed. *(Problem: the outfit exists but isn't shown; constraint: existing outfit art as it is)*
- **R3. Only the current outfit shows.** `range.css` shows `data-class="5"` when `data-current="5"`, and no other variant at the same time. *(Outcome)*
- **R4. Sixth pager dot.** The pager renders six dots, and the sixth is current on class 6. It needs no markup change, since it's mapped from `rangeClasses`. *(Outcome)*
- **R5. Its own nameplate color.** The nameplate's hard shadow uses the new entry's `shadow` value, taken from the outfit's main color like the others. *(Outcome)*
- **R6. Behavior unchanged.** Arrows wrap in both directions across six classes, auto-advance, pause, hover and focus pause, and reduced motion behave as before. The "class N of 6" text and the sprite's `aria-label` update from the data. *(Constraint: accessibility)*
- **R7. Fits at 390px.** Six dots, the nameplate and the controls fit with no horizontal scroll, and the 44px tap targets hold. *(Constraint)*
- **R8. Public-safe copy.** The class name traces to the profile's discipline #6, "Security and governance". The Range paragraph is not changed. *(Constraint)*
- **R9. Budgets hold.** The range sprite stays within ≤ 100 KB raw and ≤ 25 KB gzip, and `npm run art` reports every file `lossless` and none `OVER BUDGET`. The home page stays within the redesign spec's §12 budgets. *(Constraint)*
- **R10. Earlier documents say so.** The redesign intent's decision #7 and the redesign spec's §7.3 get a note that the sixth class is live, and §7.3's `rangeClasses` block is updated. *(Outcome)*
- **R11. Visible change is reviewed** with screenshots of class 6 at 1440px and 390px, and the independent verifier checks the PR. *(Constraint)*

## Design

### Data: `src/data/home.ts`

Add one entry to `rangeClasses`, and update its comment if it says "five":

```ts
{ name: 'Security & Governance', shadow: '#858F99' },
```

`shadow` is `silver-3` from the world palette, the outfit's main (armor) color, as the other shadows are their outfits' main colors. It's decorative, so it has no contrast requirement; it only needs to read against the light stage. See concern C2.

### Art: `src/assets/pixel-art/source/scenes/range-sprite.mjs`

Add a sixth group after `data-class: '4'`:

```js
{
  group: { 'data-class': '5' },
  items: [
    { object: 'outfit-security-governance', at: { px: [-24, -6] } },
  ],
},
```

Then run `npm run art`. The object is already built and previewed in the engine's slice for it (#34). The scene's viewBox doesn't change, since the outfit extends the same 16×20 character. The headgear and armor extend above the other outfits' heads, so the preview must be checked for clipping against the `viewBox` (concern C3).

### Styles: `src/styles/range.css`

Add `.range[data-current="5"] .range__sprite g[data-class="5"]` to the list that shows the current outfit. The rule has no other change. The pager, nameplate and controls need no CSS change.

### Component: `src/components/home/Range.astro`

No change expected. The dots, "class N of M" text and the script's `count` all derive from `rangeClasses.length`, and the component's first paint is class 0.

### Tests and checks

- `scripts/e2e/art.e2e.mjs` compares each `data-class` variant against a fixture. Variants 0–4 stay identical to their fixtures. See concern C1 for variant 5.
- `npm run art`, `npm test`, `npm run build` and `npm run e2e` as in `CLAUDE.md`.
- Add a check that `rangeClasses.length` equals the number of `data-class` groups in the compiled sprite, so the data and the art can't drift apart again. Place it with the existing art tests.
- Screenshots of all six classes at 1440px and 390px, confirming no horizontal scroll.

### Documents

- Redesign intent, decision #7: add "Update, 2026-10: the sixth class, Security & Governance, is live (sixth-range-class intent)." Don't rewrite the decision.
- Redesign spec §7.3: update the `rangeClasses` block and add the same note. The redesign documents predate the templates, so only these two notes change.

## Areas of concern

**C1. The pixel-identical fixture can't cover the new variant.** The sprite's R10 check compares the compiled SVG with `scripts/fixtures/pixel-art/range-sprite.src.svg`, the original hand-made source. That fixture only has five variants, and the compiled sprite will now have six, so the "renders identically" check fails or has to skip the new group. This isn't a policy conflict but it changes a promise the engine made ("pixel-identical").
*Decision for the owner:* keep the fixture frozen and compare only variants 0–4 against it, adding variant 5 to the "states" list as an extra with no fixture, or extend the fixture with a rendered baseline of the new outfit. I recommend the first: the fixture stays the record of the original art, and variant 5 is verified by its own preview and the screenshots.

**C2. The nameplate shadow is a design choice, not a rule.** The other five shadows come from the mock. There is no mock color for this class. `#858F99` (`silver-3`) is the outfit's armor color. `#B4BCC4` (`silver-2`) is lighter, and probably too faint against the light stage.
*Decision for the owner:* approve `#858F99`, or choose another.

**C3. The nameplate may wrap at 390px.** At the 18px Silkscreen size, "Security & Governance" (21 characters) is wider than "Project Management" (18), the longest today. With the stage's padding at 390px it may not fit on one line. The nameplate has `min-height: 44px` and is a flex box, so it would wrap to two lines and move the sprite down on that class, which causes layout shift while the carousel advances.
*Decision for the owner:* if it wraps, either shorten the name ("Security & Gov." reads poorly; "Security" alone is clear but drops "governance"), reduce the nameplate font size at narrow widths for all classes, or give the nameplate a fixed two-line height on mobile. I recommend measuring first. If it fits, nothing changes.

**C4. The outfit's headgear may clip.** The Security outfit's helmet rows are in the preview only, not yet in the live viewBox of `[-51, -9, 103, 72]`. If it extends above the top edge, it will be cut off. This is checked with the preview and screenshots, and fixed by moving the viewBox, which would shift all six classes by a few pixels and should be avoided if possible.

## Open questions

Answered from the intent:

1. **The name on the nameplate:** "Security & Governance", matching the profile's discipline and the existing "Cloud & DevOps" style.
2. **The nameplate shadow color:** `#858F99` (`silver-3`), pending C2.
3. **Timing:** keep 2200ms per class. A full cycle goes from 11 seconds to 13.2 seconds, and the carousel pauses on hover and focus and can be paused by the visitor. No change is proposed. The owner can revisit after seeing it live.

New:

4. **C1, C2 and C3 above** need the owner's decision before the plan is written.
