---
id: W1-LF-04a
kind: task
wave: W1
card: W1-LF-04
state: active
risk: critical
maturity: BUILD
relation: required
depends_on: [W1-LF-03a]
blocks: [W1-LF-04b]
created_at: 2026-08-02T09:01:00+08:00
updated_at: 2026-08-03T20:55:00+08:00
started_at: 2026-08-03T18:40:00+08:00
accepted_at:
candidate_commit: https://github.com/example/project/commit/85c318af0000000000000000000000000000abcd
closure_commit:
evidence:
duration_minutes: 135
blocker:
pause_reason:
return_trigger:
deliberate_partial: false
---

# W1-LF-04a — Sandbox output boundary verified

## Outcome

A sandboxed process cannot write outside its own tree, and the check fails when the boundary is
removed.

## Scope

### In

- The output path boundary and its negative test.

### Out

- The identity model, which belongs to the next task.

## Acceptance

- [ ] The boundary test exits zero on the current revision.
- [ ] Removing the boundary makes the same test exit non-zero.

## Current state

The positive test passes on the candidate revision. The negative form is written but not yet run
against the unfixed revision.

## Next action

Run the negative test against the revision before the boundary was added.

## Guardrails

- The test must not read the implementation to derive its expectation.

## Findings

The harness assembles the sandbox differently from the product; the difference is tracked as
W1-LF-04e.

## Closure

### Accepted outcome

Pending.

### Residuals

Pending.

### Evidence

- Pending.
