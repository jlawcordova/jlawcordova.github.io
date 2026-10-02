---
name: write-plan
description: Write plan.md, the implementation plan for an approved spec, before any code is written, in the AI-native SDLC (intent.md → spec.md → plan.md → code and tests → PR). Use when a change under docs/intents/ has an approved spec.md and someone asks to plan, start building or implement it. Also use to update plan.md when implementation departs from it.
---
# Write a plan

`plan.md` is the written plan for making the change: the files that change, the order of the work, the risks, and the proof that it works. It is written and approved before any code. Review later checks the diff against it.

Template and steps follow Stage 3 (Build) of Anthropic's [AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook).

## Steps

1. **Work read-only until the plan is approved.** Use Claude Code's plan mode where it's available. Otherwise read the codebase without editing anything.
2. **Read `intent.md` and `spec.md`** in the change's directory, plus `CLAUDE.md`. The spec must be approved. If it isn't, say so and stop.
3. **Draft the plan with the template below.** Name the files that change, the order of the work, and the tests and checks that prove it.
4. **Interrogate the plan.** What could the change break? Which step is most risky? What other options were considered and not chosen, and why?
5. **Iterate until someone who has never seen the conversation could implement the change from the plan alone.**
6. **Commit the approved plan as `plan.md`** next to `spec.md`, once the owner has approved it.
7. **Implement against the plan.** With a solid plan, implementation is often a single pass.
8. **When the implementation departs from the plan, update `plan.md` in the same commit.** The PR's diff and the committed plan should always match.

Every merge to `master` deploys the site. If the change needs more than one PR, make each PR a numbered step in Order of work, and keep the site deployable after each one.

## Template

```markdown
# Plan: <name of the change> (from intent.md <YYYY-MM-DD>)

## Files that change
<Each file, marked (new) or (deleted) where it applies.>

## Order of work
1. <First step.>
2. <Next step.>

## Risks
<What could break, the riskiest step, and how each risk is handled.>

## Proof
<The checks that show it works, written so they can be run: npm test and npm run build output, specific tests, screenshots at 1440px and 390px against the spec or mock, budgets.>
```

## Example

```markdown
# Plan: pixel-art outfit for security work (from intent.md 2026-10-01)

## Files that change
src/assets/pixel-art/source/scenes/range-sprite.mjs, src/assets/pixel-art/range-sprite.svg,
src/data/home.ts, src/styles/range.css

## Order of work
1. Add the sixth outfit object, place it in a new group in the sprite scene, and run npm run art.
2. Add the class to rangeClasses.
3. Add its data-current rule and check the pager at 390px.

## Risks
The sprite file grows. It must stay within 100 KB raw and 25 KB gzip, or the art
script fails.

## Proof
npm run art reports lossless and within budget, npm test and npm run build pass,
and the carousel cycles through all six classes in a screenshot at 1440px and 390px.
```
