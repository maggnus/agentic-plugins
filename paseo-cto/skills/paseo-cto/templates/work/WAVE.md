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

What this wave owns, the boundary it must not cross, and its independent lanes. Work outside the
boundary belongs to another wave, to the trigger registry, or to the owner-gate registry.

## Cards

## Plan review

The decomposition is reviewed before its first card starts: independently for the project's first
wave, for a wave with a critical card, or for more than three cards; otherwise the CTO may answer
the plan-review questions itself and record `waived` with those answers as the evidence. Record the
verdict in `plan_review_state`, link or state the evidence, and note below what the review changed.
