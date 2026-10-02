---
name: write-intent
description: Capture an idea, ticket or incident for this site as intent.md, the first artifact of the AI-native SDLC (intent.md → spec.md → plan.md → code and tests → PR). Use whenever someone describes a change they want (a feature, a redesign, a fix too big for one PR, a follow-up from a review or incident) and it has no intent.md yet, or asks to write, draft or capture an intent.
---
# Write an intent

`intent.md` is a proto-spec in the originator's own words: what is wanted, why, and under which constraints. It's human readable, version controlled, and the input the spec stage reads. It is not a design: no files, components or code.

Template and steps follow Stage 1 (Plan) of Anthropic's [AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook).

## Steps

1. **Let the originator describe the problem in their own words.** What they can't do today, who it affects, what better looks like, what's out of scope. No formal language is needed.
2. **Brainstorm until the idea is concrete.** Ask the questions an analyst would ask: scope, users, constraints, and what success looks like. Ask a few at a time, and don't fill gaps with guesses.
3. **Pick its home:** `docs/intents/YYYY-MM-<slug>/intent.md`, where `YYYY-MM` is the current month and `<slug>` is short kebab-case. Check that no existing directory under `docs/intents/` already covers the change.
4. **Write `intent.md` with the template below**, keeping the section names and order exactly. Put what's out of scope under Constraints.
5. **Show the draft to the originator** and correct anything Claude misunderstood. Don't commit before they've reviewed it.
6. **Check it's public-safe** against `CLAUDE.md`. No other people's names, client names, project codenames or internal incidents; describe work by its kind. Facts about roles and skills come only from `docs/references/profile.md`. The Author line names the owner only.
7. **Commit it on its own branch and open a PR.** The owner accepts the intent by merging the PR, which is what starts the spec stage (`write-spec`). Closing the PR rejects it. Set `Status: accepted` in the PR before it merges.

An intent can also come from a trigger rather than a person, such as a review finding, a failing check or a production problem. Use the same template, and put the anomaly and its evidence under Problem.

## Template

```markdown
# Intent: <short name of the change>
Author: <name> (<role>). Status: draft.

## Problem
<What can't be done today, who it affects, and why it matters. In the originator's words.>

## Proposed outcome
<What better looks like, described by its result, not its implementation.>

## Affected users and systems
<Who and what this touches: readers, the owner, pages, content, data, pipelines.>

## Constraints
<Rules any solution must follow: stack, budgets, accessibility, public-safety, what must not change, and what's out of scope.>

## Open questions
<What isn't decided yet. The spec answers these or carries them forward.>
```

## Example

```markdown
# Intent: Pixel-art outfit for security work
Author: J. Law. Cordova (site owner). Status: draft.

## Problem
The Range carousel shows five disciplines, but security and governance,
one of the strongest areas in the profile, has no outfit, so the home
page undersells it.

## Proposed outcome
A sixth Range class for security and governance, with its own outfit in
the same pixel-art style as the other five.

## Affected users and systems
Home page visitors, the Range carousel, the sprite art and its pipeline.

## Constraints
Same isometric style and palette. Art stays inline SVG within the home
page weight budget. Reduced motion and keyboard behavior unchanged.
Out of scope: changing the other five outfits.

## Open questions
Does a sixth pager dot still fit at 390px wide?
```
