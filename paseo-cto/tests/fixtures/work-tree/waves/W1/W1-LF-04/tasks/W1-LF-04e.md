---
id: W1-LF-04e
kind: task
wave: W1
card: W1-LF-04
state: rework
risk: significant
maturity: BUILD
relation: expansion
depends_on: []
blocks: []
created_at: 2026-08-03T10:00:00+08:00
updated_at: 2026-08-03T19:20:00+08:00
started_at: 2026-08-03T12:00:00+08:00
accepted_at:
candidate_commit: https://github.com/example/project/commit/7f3d2b110000000000000000000000000000abcd
closure_commit:
evidence:
duration_minutes: 90
blocker:
pause_reason:
return_trigger:
deliberate_partial: false
---

# W1-LF-04e — Harness assembles the product sandbox

## Outcome

The boundary test exercises the sandbox the product assembles, not a differently wired copy of it.

## Scope

### In

- The harness assembly and its comparison with the product path.

### Out

- The boundary behaviour, which W1-LF-04a owns.

## Acceptance

- [ ] The harness and the product install the same guard.
- [ ] A guard present in one and absent in the other fails the comparison.

## Current state

Returned by review: the comparison covered the guard but not the connection privilege. The
correction is in progress in the same workspace.

## Next action

Extend the comparison to the connection the product opens.

## Guardrails

- The comparison is made line by line, not by description.

## Findings

None open beyond the accepted review finding being corrected.

## Closure

### Accepted outcome

Pending.

### Residuals

Pending.

### Evidence

- Pending.
