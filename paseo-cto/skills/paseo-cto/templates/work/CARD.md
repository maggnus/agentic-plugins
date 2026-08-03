---
id: {{ID}}
kind: card
wave: {{WAVE}}
state: ready
risk: {{RISK}}
maturity: {{MATURITY}}
relation: {{RELATION}}
depends_on: []
blocks: []
created_at: {{NOW}}
updated_at: {{NOW}}
started_at:
accepted_at:
candidate_commit:
closure_commit:
evidence:
duration_minutes: 0
blocker:
pause_reason:
return_trigger:
---

# {{ID}} — {{TITLE}}

## Outcome

The single observable result the card as a whole delivers, in one or two sentences.

## Invariants

Contracts every child task must hold. A task that cannot hold one of these does not belong to this
card.

## Scope

The boundary shared by every child task. Detail belongs to the task files, not here.

## Aggregate acceptance

What must be true for this card to close honestly. The card closes only when every child task
carrying `relation: required` is accepted; an open `follow_up`, `expansion` or `trigger` child never
reopens an honestly accepted card.

## Tasks
