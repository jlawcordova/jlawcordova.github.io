---
name: write-intent
description: Capture an idea, ticket or incident for this site as intent.md, the first artifact of the AI-native SDLC (intent.md → spec.md → plan.md → code and tests → PR). Use whenever someone describes a change they want (a feature, a redesign, a fix too big for one PR, a follow-up from a review or incident) and it has no intent.md yet, or asks to write, draft or capture an intent.
---
# Write an intent

`intent.md` is a proto-spec in the originator's own words: what is wanted, why, and under which constraints. It's human readable, version controlled, and the input the spec stage reads. It is not a design: no files, components or code. The section below draws the line, because drifting into the spec is the most common way an intent goes wrong.

Template and steps follow Stage 1 (Plan) of Anthropic's [AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook).

## Steps

1. **Let the originator describe the problem in their own words.** What they can't do today, who it affects, what better looks like, what's out of scope. No formal language is needed.
2. **Brainstorm until the idea is concrete.** Ask the questions an analyst would ask: scope, users, constraints, and what success looks like. Ask about what's wanted, not how to build it. Ask a few at a time, and don't fill gaps with guesses.
3. **Pick its home:** `docs/intents/YYYY-MM-<slug>/intent.md`, where `YYYY-MM` is the current month and `<slug>` is short kebab-case. Check that no existing directory under `docs/intents/` already covers the change.
4. **Write `intent.md` with the template below**, keeping the section names and order exactly. Put what's out of scope under Constraints.
5. **Check the draft for spec leakage** with the test in the next section, and take out anything that fails it.
6. **Show the draft to the originator** and correct anything Claude misunderstood. Don't commit before they've reviewed it.
7. **Check it's public-safe** against `CLAUDE.md`. No other people's names, client names, project codenames or internal incidents; describe work by its kind. Facts about roles and skills come only from `docs/references/profile.md`. The Author line names the owner only.
8. **Commit it on its own branch and open a PR.** The owner accepts the intent by merging the PR, which is what starts the spec stage (`write-spec`). Closing the PR rejects it. Set `Status: accepted` in the PR before it merges.

An intent can also come from a trigger rather than a person, such as a review finding, a failing check or a production problem. Use the same template, and put the anomaly and its evidence under Problem.

## Intent, not spec

The intent says what the owner wants and why. The spec decides how. Claude keeps to that line when drafting an intent, when reviewing one, and when folding the owner's answers into one.

**The test:** could the owner have written this sentence without opening the code or designing the solution? If not, it belongs in the spec.

These belong in the spec, not the intent:

- Data fields, lexicon or schema changes, and their names (`startDate`, "a done flag").
- Files, components, scripts, routes and which repo something lives in.
- Rollout or ship order, migration steps and release sequencing.
- Fallbacks, error states and edge-case behavior Claude worked out, rather than the owner asked for.
- Exact numbers and lists the owner didn't give: page sizes, URLs, the members of a set.
- Visual and interaction details beyond the outcome the owner described.

Two rules keep the line in place:

- **Only the owner's decisions go in.** When the owner states something specific, such as "16 icons" or "stale after two weeks", record it as they said it, in outcome terms where possible ("a locked accomplishment has no date", not "`startDate` becomes optional"). Never add a decision of Claude's own, however sensible. A gap Claude spots in review goes back to the owner as a question, and a design gap is left for the spec.
- **Open questions are about what's wanted.** "Should locked goals show on the home page?" is an intent question. "How many rows per page?" or "Which field marks a goal?" is a spec question: leave it out, because the spec answers design questions anyway. If the owner wants the spec to propose something, a single line saying so is enough.

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
Should the outfit cover governance work, such as policies and audits,
or only hands-on security?
```
