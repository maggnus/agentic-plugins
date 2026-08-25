---
id: {{ID}}
kind: task
wave: {{WAVE}}
card: {{CARD}}
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
review_rounds: 0
escalation_decision:
---

# {{ID}} — {{TITLE}}

## Outcome

One verifiable result. What becomes observably true that is not true now.

## Scope

### In

- What this task owns.

### Out

- What it must not touch. A need outside this boundary becomes a finding, not a widened task.

## Acceptance

- [ ] A command, its expected exit, or an observable state.
- [ ] The negative case that must fail closed.

## Current state

Where the work actually stands, in at most five lines. This section is rewritten, never appended to:
a chronology belongs to Git and to the evidence package.

## Next action

The single next operation.

## Guardrails

- The boundary a worker must not cross without a new contract.

## Findings

Open findings that still belong to this task. A finding with its own outcome, acceptance, risk,
owner or return path becomes its own task or subtask instead.

## Review rounds

One line per round of the convergence loop, written by the CTO from the two roles' reports:
`- R1(7/10) RETURN <dd/mm hh:mm> — <finding> → <the author's evidenced answer> → <what changed>`. The
marker carries the reviewer's ten-point score and the local moment of the verdict. After an
escalation, one `- CTO <decision> <dd/mm hh:mm> — <reason>` line records what was decided. The review
dialogue itself stays in the reports and the evidence package.

## Closure

Filled when the task is accepted. Until then this section stays as written.

### Accepted outcome

What was actually accepted.

### Residuals

Honestly retained limitations, each with an exact return trigger. Empty when there are none.

### Evidence

- Commit, evidence package, or durable document of record, each as a Markdown link.
