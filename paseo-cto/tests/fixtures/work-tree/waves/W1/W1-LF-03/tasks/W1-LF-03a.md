---
id: W1-LF-03a
kind: task
wave: W1
card: W1-LF-03
state: accepted
risk: significant
maturity: BUILD
relation: required
depends_on: []
blocks: [W1-LF-04a]
created_at: 2026-08-01T09:06:00+08:00
updated_at: 2026-08-01T12:05:00+08:00
started_at: 2026-08-01T10:20:00+08:00
accepted_at: 2026-08-01T12:05:00+08:00
candidate_commit:
closure_commit: https://github.com/example/project/commit/a14fc2900000000000000000000000000000abcd
evidence:
  - [contract check run](https://github.com/example/project/blob/a14fc2900000000000000000000000000000abcd/docs/evidence/W1-LF-03a.md)
duration_minutes: 105
blocker:
pause_reason:
return_trigger:
deliberate_partial: false
---

# W1-LF-03a — Launch contract frozen

## Outcome

The launch contract states every externally visible obligation and its check refuses a change that
breaks one.

## Scope

### In

- The contract document and its check.

### Out

- Any implementation that satisfies the contract.

## Acceptance

- [x] The contract check exits zero on the contract as written.
- [x] Removing one obligation makes the check exit non-zero.

## Current state

Accepted. The contract is committed and the check runs in the validation gate.

## Next action

None; the task is closed.

## Guardrails

- The contract is not widened to describe implementation.

## Findings

None open.

## Closure

### Accepted outcome

The contract is fixed, checked, and referenced by the two cards that follow.

### Residuals

None.

### Evidence

- [contract check run](https://github.com/example/project/blob/a14fc2900000000000000000000000000000abcd/docs/evidence/W1-LF-03a.md)
