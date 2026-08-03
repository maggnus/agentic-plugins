---
id: W1-LF-04
kind: card
wave: W1
state: active
risk: critical
maturity: BUILD
relation: required
depends_on: [W1-LF-03]
blocks: []
created_at: 2026-08-02T09:00:00+08:00
updated_at: 2026-08-03T20:55:00+08:00
started_at: 2026-08-03T18:40:00+08:00
accepted_at:
candidate_commit:
closure_commit:
evidence:
duration_minutes: 240
blocker:
pause_reason:
return_trigger:
---

# W1-LF-04 — Sandbox boundary holds under load

## Outcome

Untrusted work cannot reach the host filesystem or another tenant's data, and the boundary is proved
rather than asserted.

## Invariants

No child task may weaken the boundary to make its own proof easier.

## Scope

The sandbox boundary, its identity model, and the measurement that proves it. Scheduling policy
belongs to a later card.

## Aggregate acceptance

Every required task is accepted, and the boundary measurement runs in the validation gate.

## Tasks

- [W1-LF-04a](tasks/W1-LF-04a.md) — required
- [W1-LF-04b](tasks/W1-LF-04b.md) — required
- [W1-LF-04c](tasks/W1-LF-04c/TASK.md) — trigger
- [W1-LF-04d](tasks/W1-LF-04d.md) — required
- [W1-LF-04e](tasks/W1-LF-04e.md) — expansion
