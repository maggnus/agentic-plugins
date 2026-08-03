---
id: W2-CF-01
kind: card
wave: W2
state: ready
risk: significant
maturity: BUILD
relation: required
depends_on: [W1-LF-04]
blocks: []
created_at: 2026-08-03T21:01:00+08:00
updated_at: 2026-08-03T21:01:00+08:00
started_at:
accepted_at:
candidate_commit:
closure_commit:
evidence:
duration_minutes: 0
blocker:
pause_reason:
return_trigger:
---

# W2-CF-01 — Interrupted run recovers

## Outcome

A run interrupted at any stage resumes or fails visibly; it never reports success on partial state.

## Invariants

Recovery never invents state it cannot read.

## Scope

The recovery path and its drill. Backup policy belongs elsewhere.

## Aggregate acceptance

The drill distinguishes a real recovery from a reported one, and every required task is accepted.

## Tasks

- [W2-CF-01a](tasks/W2-CF-01a.md) — required
