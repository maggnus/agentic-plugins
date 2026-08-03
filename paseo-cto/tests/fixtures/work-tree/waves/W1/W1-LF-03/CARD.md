---
id: W1-LF-03
kind: card
wave: W1
state: accepted
risk: significant
maturity: BUILD
relation: required
depends_on: []
blocks: []
created_at: 2026-08-01T09:05:00+08:00
updated_at: 2026-08-01T12:05:00+08:00
started_at: 2026-08-01T10:20:00+08:00
accepted_at: 2026-08-01T12:05:00+08:00
candidate_commit:
closure_commit: https://github.com/example/project/commit/a14fc2900000000000000000000000000000abcd
evidence:
duration_minutes: 105
blocker:
pause_reason:
return_trigger:
---

# W1-LF-03 — Launch contract frozen

## Outcome

The launch contract is fixed and every later card is written against it.

## Invariants

The contract changes only through a new card, never through an implementation detail.

## Scope

The contract document and its checks. No implementation.

## Aggregate acceptance

The contract is committed, its checks run in the validation gate, and no required task remains open.

## Tasks

- [W1-LF-03a](tasks/W1-LF-03a.md) — required
- [W1-LF-03b](tasks/W1-LF-03b.md) — follow_up
