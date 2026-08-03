---
id: W2-CF-01a
kind: task
wave: W2
card: W2-CF-01
state: ready
risk: significant
maturity: BUILD
relation: required
depends_on: []
blocks: []
created_at: 2026-08-03T21:02:00+08:00
updated_at: 2026-08-03T21:02:00+08:00
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
---

# W2-CF-01a — Recovery drill fails on partial state

## Outcome

The drill exits non-zero when the restored state is incomplete, and zero only when it is not.

## Scope

### In

- The drill and its negative case.

### Out

- The recovery implementation.

## Acceptance

- [ ] The drill exits zero on a complete restore.
- [ ] The drill exits non-zero on an incomplete restore.

## Current state

Not started. Waiting for the wave plan review.

## Next action

Write the incomplete-restore fixture first.

## Guardrails

- The drill must not derive its expectation from the recovery code.

## Findings

None open.

## Closure

### Accepted outcome

Pending.

### Residuals

Pending.

### Evidence

- Pending.
