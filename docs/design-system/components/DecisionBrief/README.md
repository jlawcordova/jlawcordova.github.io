# DecisionBrief

The five questions every page answers (problem, assumptions, risks, recommendation, next actions) as one numbered block. **Intentional addition:** this isn't on the site. It puts the copywriting model into a component.

## Use

- `article.brief`: a `color-surface` box with a `color-border` hairline and `radius-card` corners. The header has a `label` kicker, a 22px/600 title and a meta line (owner, date, status) in `label`.
- Each `.brief__section` is a two-column row: a numbered `label` key (168px) and the body. Rows are separated by hairlines. At 480px and below, the key stacks over the body.
- `.brief__section--recommend` sits on `color-card`. It's the only emphasis, and it's what the reader should act on.
- Next actions use `.brief__actions`: each item has the action on the left, and the owner and date in `label` on the right.
- Ratings use the Register's `.rating` chips.

## What you provide

- All five sections, in this order. If something is unknown, say so in its section. Don't drop the section.
- One recommendation, with its reasoning and a confidence level.
- An owner and a date on every next action.

## Don't

- Don't add a coloured left border or icons to the sections. Hierarchy comes from the numbers and the one tinted row.
