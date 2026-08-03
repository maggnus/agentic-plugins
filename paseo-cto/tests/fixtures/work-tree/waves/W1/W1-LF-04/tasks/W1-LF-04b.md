---
id: W1-LF-04b
kind: task
wave: W1
card: W1-LF-04
state: blocked
risk: critical
maturity: BUILD
relation: required
depends_on: [W1-LF-04a]
blocks: []
created_at: 2026-08-02T09:02:00+08:00
updated_at: 2026-08-03T11:10:00+08:00
started_at:
accepted_at:
candidate_commit:
closure_commit:
evidence:
duration_minutes: 0
blocker: The production identity namespace is an owner decision recorded as gate G1; no value may be assumed.
pause_reason:
return_trigger:
deliberate_partial: false
---

# W1-LF-04b — Production identity split applied

## Outcome

Each tenant runs under its own identity, and one tenant's credentials cannot reach another's data.

## Scope

### In

- The identity split and its negative test.

### Out

- The output boundary, which W1-LF-04a owns.

## Acceptance

- [ ] Two tenants run under distinct identities.
- [ ] A cross-tenant read fails closed.

## Current state

Blocked on the owner decision recorded as gate G1. No implementation exists yet.

## Next action

None until the gate opens.

## Guardrails

- No namespace is invented to unblock the work.

## Findings

None open.

## Closure

### Accepted outcome

Pending.

### Residuals

Pending.

### Evidence

- Pending.
