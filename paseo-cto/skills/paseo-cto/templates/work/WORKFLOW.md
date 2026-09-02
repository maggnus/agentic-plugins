# Work rules

Standing rules for this project's execution. This file holds only long-lived rules: never the
current frontier, a live task list, or a status claim. Current work lives in the wave tree; the
index of every unit is [STATUS.md](STATUS.md) and the overview of the waves is
[WAVES.md](WAVES.md). Both are generated.

## Sources of truth

- One work unit is one permanent file under `waves/`, created once, keeping its identifier for its
  whole lifecycle, never moved or rewritten into another document on acceptance.
- The unit's file is the only source of its state. `STATUS.md` and `WAVES.md` are generated and
  never edited by hand; a hand edit fails the tree check.
- Git holds candidate history; the evidence package holds command transcripts; the file holds the
  current position and the closure record. None duplicates another.
- The canonical source repository is `<HTTPS source repository URL>`. Every commit or repository
  file used as evidence is a Markdown link pinned to an immutable 40-character commit.

## Authority gates

- The CTO owns the tree: creation, identifiers, dependencies, state transitions and closure.
  Workers read their file and report; they never edit it. Lifecycle events are written by the
  ledger, never by hand.
- Repository writers commit locally and never push. Push, deploy, publication, live mutation,
  money, schema operations and irreversible actions each stay a separate owner gate.
- An unknown that belongs to the owner becomes a row in [backlog/OWNER_GATES.md](backlog/OWNER_GATES.md)
  or a unit in state `[?]` naming it as the blocker; it is never filled in with a guess.

## Inspection and landing

- Every delegated write and every result used for closure or authorization is inspected at the
  depth its risk requires under the project's `reviewDepth`: a CTO glance for `Routine`, a
  non-author reviewer or a CTO look for `Significant`, an independent reviewer with an executable
  proof for `Critical`. Authentication, authorization, tenant isolation, privacy, data loss,
  corruption and irreversible actions are `Critical` whatever the setting.
- A card whose outcome is one atom is dispatched itself and carries its own journal and closure;
  a card that needs several atoms has tasks and closes when every `required` task is accepted.
- A unit is accepted in place: state `accepted`, closure commit and evidence recorded, `Closure`
  filled, the checklist closed or `deliberate_partial: true` with the residue and its exact
  return trigger. Integration happens into a clean tree; checks invalidated by composition rerun.

## Verification commands

- Project validation gate: `<command>`.
- Tree check: `python3 <script home>/work.py check --root <work root>`.
- Status generation: `python3 <script home>/work.py status --root <work root>`.
- The full suite runs only at the triggers named per unit, at a wave gate, or at a release gate.

## Review rounds

- A unit under inspection or in rework stays `[~]`; review and return are not status tokens.
- The inspector and the author converge on the outcome themselves: a return authorizes the rework
  it names inside the same unit, the author answers every finding with evidence, and they repeat.
  The CTO carries their material and adjudicates nothing until the unit escalates or breaks out of
  the contract.
- Each round leaves one line in `## Review rounds` — `- R2(5/10) RETURN 25/08 14:20 — finding →
  evidenced answer → what changed` — and `review_rounds` carries the count. The moment is local
  `dd/mm hh:mm` when the verdict arrived. Every verdict scores code, work and, when a consumer
  surface was walked, experience on ten points; the marker carries the lowest axis; the score never
  decides the verdict.
- The inspector holds two returns on one unit. After the second its verdict is `ESCALATE`, and the
  CTO decides on the journal in that turn: `bounded_retry` (two more returns with an exact
  acceptance condition), `independent_review` (a replacement reviewer inside that budget),
  `accept_with_corrections`, `split`, or `stop`. `escalation_decision` records it; **four returns
  is the ceiling**.
- The review dialogue is never copied into the file. Findings that survive become checklist items
  or new units.

## Time

- `Start` is the moment the unit first became active; a return, re-review, block or pause never
  resets it.
- `Time` is `dd/mm hh:mm (<duration>)`: acceptance time for an accepted unit, the last significant
  state change otherwise; `duration_minutes` counts active work only — builder, inspector, rework,
  CTO integration — and excludes waiting on an owner, an external event, an environment or an idle
  session.

## Findings and splitting

A finding stays inside the current unit when the current acceptance requires it and it keeps the
same scope, risk, owner and proof. It becomes its own unit when it can be independently assigned,
performed, inspected, returned and accepted. Ordinary implementation steps stay a checklist.

Separation decides ownership and closure, never execution: small homogeneous siblings — one
surface, one environment, one verification method, one review context — are implemented and
inspected as one batch under one contract, one workspace and one inspection, classified at the
highest risk among them; each keeps its own identifier, state, closure and return path, and a node
that develops its own risk or return leaves the batch.

Every child declares one relation: `required` blocks the parent's closure, `follow_up` does not,
`expansion` adds a new outcome, `trigger` may not start before its named event.

## Chronology

`Current state` is rewritten, not appended to, and holds at most five lines. `Next action` holds
one operation. Closed findings leave the open list. History lives in Git and the evidence package.
