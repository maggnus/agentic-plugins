---
id: W1-LF-04c
kind: task
wave: W1
card: W1-LF-04
state: deferred
risk: significant
maturity: BUILD
relation: trigger
depends_on: []
blocks: []
created_at: 2026-08-02T09:03:00+08:00
updated_at: 2026-08-02T09:03:00+08:00
started_at:
accepted_at:
candidate_commit:
closure_commit:
evidence:
duration_minutes: 0
blocker:
pause_reason:
return_trigger: The first tenant workload runs for a full day in the staging environment.
deliberate_partial: false
---

# W1-LF-04c — Cleanup convergence measured

## Outcome

Sandbox cleanup returns the host to its starting state within a bounded time under real workload.

## Scope

### In

- The convergence measurement and its bound.

### Out

- Any cleanup implementation change.

## Acceptance

- [ ] The measurement runs against a real day of workload.
- [ ] The bound is stated as a number, not as an impression.

## Current state

Waiting for its trigger. No measurement is meaningful before real workload exists.

## Next action

None until the trigger fires.

## Guardrails

- A synthetic workload does not satisfy this task.

## Findings

None open.

## Closure

### Accepted outcome

Pending.

### Residuals

Pending.

### Evidence

- Pending.
