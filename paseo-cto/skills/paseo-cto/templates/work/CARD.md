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
deliberate_partial: false
review_rounds: 0
escalation_decision:
---

# {{ID}} — {{TITLE}}

## Outcome

The single observable result this card delivers, in one or two sentences.

## Invariants

Contracts every child task must hold. A task that cannot hold one of these does not belong here.

## Scope

The boundary shared by every child task, or the boundary of the card itself when it is dispatched
as one atom. Detail belongs to task files, not here.

## Aggregate acceptance

What must be true for this card to close honestly. A card with tasks closes when every task
carrying `relation: required` is accepted; a card dispatched as its own atom closes on this
checklist:

- [ ] A command, its expected exit, or an observable state.
- [ ] The negative case that must fail closed.

## Current state

Where the work stands, in at most five lines. Rewritten, never appended to.

## Tasks

## Review rounds

One line per round when the card is dispatched as its own atom, written by the ledger:
`- R1(7/10) RETURN <dd/mm hh:mm> — <finding> → <answer> → <what changed>`. After an escalation,
one `- CTO <decision> <dd/mm hh:mm> — <reason>` line.

## Closure

Filled when the card is accepted as its own atom; a card that closes through its tasks records the
aggregate here.

### Accepted outcome

What was actually accepted.

### Residuals

Honestly retained limitations, each with an exact return trigger. Empty when there are none.

### Evidence

- Commit, evidence package, or durable document of record, each as a Markdown link.
