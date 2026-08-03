# Work rules

Standing rules for this project's execution. This file holds only long-lived rules: it never carries
the current frontier, a live task list, or a status claim. Current work lives in the wave tree, and
the index of it is [STATUS.md](STATUS.md).

## Sources of truth

- One work unit is one permanent file under `waves/`. It is created once, keeps its identifier for
  its whole lifecycle, and is never moved, copied, or rewritten into another document on acceptance.
- The task file is the only source of a task's state. `STATUS.md` is generated from the tree and is
  never edited by hand.
- Git holds candidate history; the evidence package holds command transcripts; the task file holds
  the current position and the closure record. None of the three duplicates another.
- The canonical source repository is `<HTTPS source repository URL>`. Every commit or repository
  file used as evidence is a Markdown link pinned to an immutable 40-character commit.

## Authority gates

- The CTO owns the tree: creation, identifiers, dependencies, state transitions, and closure.
  Workers read their task file and report; they do not edit it.
- Repository writers commit locally and never push. Push, deploy, publication, live mutation, money,
  schema operations, and irreversible actions each stay a separate owner gate.
- An unknown that belongs to the owner becomes a record in [backlog/OWNER_GATES.md](backlog/OWNER_GATES.md)
  or a task in state `[?]` with its blocker. It is never filled in with a guess to complete the plan.

## Landing discipline

- Every delegated outcome receives the risk-required non-author review before completion; every
  repository write receives it before integration.
- A task is accepted in place: its state becomes `accepted`, its closure commit and evidence are
  recorded, and its `Closure` section is filled. No text moves to another file.
- Integration happens into a clean tree; checks invalidated by composition are rerun.

## Verification commands

- Project validation gate: `<command>`.
- Tree check: `python3 <script home>/work.py check --root <work root>`.
- Status generation: `python3 <script home>/work.py status --root <work root>`.
- The full suite runs only at the triggers named per card, at a wave gate, or at a release gate.

## Status discipline

- `STATUS.md` is an index, not a work journal. It carries exactly `Status | ID | Task | Commit |
  Start | Time` and nothing else.
- Rows appear in tree order: wave, card, task, subtask, each ascending by identifier. There is no
  priority ordering, because the ordering the reader can trust is the one the tree already fixes.
- The status token is one of `[ ]` ready, `[~]` active including review and rework, `[?]` blocked,
  `[=]` deliberately paused or trigger-gated, `[!]` withdrawn from the current cycle, `[x]` accepted.
- Correcting the display means correcting the task file and regenerating. A hand edit to `STATUS.md`
  fails the tree check.

## Time

- `Start` is the moment the task first became active. It is not reset by a return, a re-review, a
  block, or a pause.
- `Time` is `dd/mm hh:mm (<duration>)`. The moment is the acceptance time for an accepted task and
  the last significant state change otherwise.
- `duration_minutes` counts active work only: builder, reviewer, rework, and CTO investigation or
  integration on that task. Waiting on an owner decision, an external event, an environment, or an
  idle session is not spent time.

## Findings and splitting

A finding stays inside the current task when it is required by the current acceptance, tests the
same outcome, and keeps the same scope, risk, owner and proof. It becomes its own task or subtask
when it has a separate outcome, needs separate acceptance, changes scope, carries different risk,
needs a different specialist, can be independently returned or accepted, can be deferred without
making the current acceptance dishonest, or depends on a separate owner decision or external
trigger.

The test is one sentence: a separate file is needed when the work can be independently assigned,
performed, reviewed, returned, and accepted. Ordinary implementation steps stay a checklist inside
the task.

Every child declares one relation: `required` blocks the parent's closure, `follow_up` does not,
`expansion` adds a new outcome, and `trigger` may not start before its named event.

## Review and return

- A task under review or in rework stays `[~]`. Review and return are not separate status tokens.
- The review dialogue is never copied into the task file. Findings that survive become either
  checklist items in the current task or new work units.
- After the second return on one unit, the decision is made in that turn: accept with residue, split,
  or name the gate and stop.

## Acceptance and closure

At acceptance: set the state, record `accepted_at`, record the closure commit and durable evidence,
fill `Closure`, close the acceptance checklist or record `deliberate_partial: true` with the residue
and its exact return trigger, update the active duration, regenerate `STATUS.md`, then test whether
the parent card and the wave can now close.

A residue is honest only when the headline outcome is genuinely achieved, the limitation does not
make it false, the return trigger is exact, and the reviewer agreed that a separate required task is
not needed. The unachieved independent part gets its own identifier.

## Chronology

`Current state` is rewritten, not appended to, and holds at most five lines. `Next action` holds one
operation. Closed findings leave the open list. History lives in Git and in the evidence package.
