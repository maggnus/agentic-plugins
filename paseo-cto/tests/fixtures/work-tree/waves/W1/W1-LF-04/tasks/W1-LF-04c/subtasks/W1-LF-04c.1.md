---
id: W1-LF-04c.1
kind: subtask
wave: W1
card: W1-LF-04
parent: W1-LF-04c
state: ready
risk: routine
maturity: BUILD
relation: required
depends_on: []
blocks: []
created_at: 2026-08-02T09:04:00+08:00
updated_at: 2026-08-02T09:04:00+08:00
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

# W1-LF-04c.1 — Host state snapshot comparable

## Outcome

Host state before and after a sandbox run is captured in a form two runs can be compared by.

## Scope

### In

- The snapshot and its comparison.

### Out

- The bound itself, which the parent task owns.

## Acceptance

- [ ] Two identical runs produce identical snapshots.
- [ ] A leaked file makes the comparison fail.

## Current state

Not started.

## Next action

Choose what the snapshot must include for a leak to be visible.

## Guardrails

- The snapshot must not ignore paths merely because they are noisy.

## Findings

None open.

## Closure

### Accepted outcome

Pending.

### Residuals

Pending.

### Evidence

- Pending.
