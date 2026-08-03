---
id: {{ID}}
kind: wave
state: ready
areas: [{{AREAS}}]
plan_review_state: pending
plan_review_evidence:
plan_review_at:
created_at: {{NOW}}
updated_at: {{NOW}}
---

# {{ID}} — {{TITLE}}

## Outcome

One observable product change this wave delivers. Not a list of cards.

## Scope

What this wave owns, and the boundary it must not cross. Work outside the boundary belongs to
another wave, to the trigger registry, or to the owner-gate registry.

## Cards

## Plan review

The wave's decomposition is reviewed independently before its first card starts. Record the verdict
in `plan_review_state`, link the review evidence, and state below what the review changed. A wave
whose first card has started while the review is `pending` or `returned` fails the tree check.
