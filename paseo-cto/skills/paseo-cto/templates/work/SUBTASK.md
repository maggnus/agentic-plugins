---
id: {{ID}}
kind: subtask
wave: {{WAVE}}
card: {{CARD}}
parent: {{PARENT}}
state: ready
risk: {{RISK}}
maturity: {{MATURITY}}
relation: {{RELATION}}
depends_on: []
blocks: []
created_at: {{NOW}}
updated_at: {{NOW}}
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

# {{ID}} — {{TITLE}}

## Outcome

One verifiable result, independently assignable and independently acceptable. A subtask that fails
that test belongs inside its parent task as a checklist item.

## Scope

### In

- What this subtask owns.

### Out

- What belongs to the parent task or to a sibling.

## Acceptance

- [ ] A command, its expected exit, or an observable state.
- [ ] The negative case that must fail closed.

## Current state

At most five lines, rewritten rather than appended to.

## Next action

The single next operation.

## Guardrails

- The boundary a worker must not cross without a new contract.

## Findings

Open findings that still belong to this subtask.

## Closure

Filled when the subtask is accepted.

### Accepted outcome

What was actually accepted.

### Residuals

Honestly retained limitations, each with an exact return trigger.

### Evidence

- Commit, evidence package, or durable document of record, each as a Markdown link.
