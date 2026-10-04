---
name: write-spec
description: Turn an accepted intent.md into spec.md, the requirements and design spec for the change, in the AI-native SDLC (intent.md → spec.md → plan.md → code and tests → PR). Use when an intent under docs/intents/ has been accepted (merged) and someone asks for its spec or design, or wants to move an accepted intent forward.
---
# Write a spec

`spec.md` turns an accepted `intent.md` into a requirements and design spec that the build can be planned against, with areas of concern flagged. It records what was decided, next to the intent that records what was asked for.

The steps and the prompt follow Stage 2 (Design) of Anthropic's [AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook). The playbook gives the prompt but no spec template, so the structure below is derived from what that prompt asks for.

## Steps

1. **Read the intent.** It must be accepted, meaning merged with `Status: accepted`. If it's still a draft, say so and stop.
2. **Load the standards that apply.** These are this repo's equivalent of the playbook's brand, security, compliance and UX skills:
   - `CLAUDE.md`, including the public-safety rules;
   - `docs/references/`;
   - the design system in `docs/design-system/` (the brand book, copywriting rules, tokens and component guidelines);
   - the design tokens in `src/styles/variables.css`;
   - the house standards set by earlier specs under `docs/intents/`, such as the redesign spec's typography, contrast, accessibility and performance budgets;
   - any skill in `.claude/skills/` that matches the work.
3. **Run the prompt below** against the intent and the codebase.
4. **Write `spec.md` next to `intent.md`** with the structure below.
5. **Review the spec against the idea.** Does it solve the stated Problem? Is every Open question from the intent answered or carried forward?
6. **Work through the Areas of concern first.** These are the points an analyst would have escalated. The owner resolves each one before the plan is written.
7. **Commit `spec.md` alongside `intent.md`** and open a PR. The owner approving and merging the spec is what starts the plan stage (`write-plan`).

The spec must not contradict the intent. If it has to, change the intent first, with the owner, in its own commit.

## The prompt (from the playbook)

> Read the attached intent.md and produce a requirements and design spec for integrating it into our existing codebase. Apply the skills available to you so the plan conforms to our brand guidelines, security policies and UX standards. Document the spec fully as spec.md, ready to hand to the engineering team. Describe clearly any areas of concern, especially where you cannot satisfy contradicting policies.

## Structure

```markdown
# Spec: <name of the change> (from intent.md <YYYY-MM-DD>)
Status: draft.

## Requirements
<What the change must do, as checkable statements traced to the intent's Problem and Proposed outcome.>

## Design
<How it fits the existing codebase: pages, components, data, styles, behavior and copy. Enough detail to plan against, in the standards loaded in step 2.>

## Areas of concern
<Each concern, the standard or policy involved, and what the owner needs to decide. Call out any place where two standards contradict each other.>

## Open questions
<Each open question from the intent, answered or carried forward, plus any new ones.>
```

Set `Status: approved` in the PR before it merges.
