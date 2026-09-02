# Work tree

Read this file before creating, updating, splitting or accepting a unit of work, before producing
the index, and when sequencing the ready frontier. One work unit is one permanent file, created once
at a path derived from its identifier and never moved; acceptance fills its closure fields in place.

## Structure and identifiers

```text
docs/work/
├── STATUS.md            generated index of every unit; never hand-edited
├── WAVES.md             generated overview of the waves; never hand-edited
├── WORKFLOW.md          standing rules; no live task ever appears here
├── waves/W1/WAVE.md
├── waves/W1/W1-LF-04/CARD.md
├── waves/W1/W1-LF-04/tasks/W1-LF-04a.md
├── waves/W1/W1-LF-04/tasks/W1-LF-04c/TASK.md
├── waves/W1/W1-LF-04/tasks/W1-LF-04c/subtasks/W1-LF-04c.1.md
└── backlog/TRIGGERS.md · OWNER_GATES.md · REJECTED.md
```

The root is the only adjustable path (`work.root` in `SETTINGS.json`). Depth is fixed at wave,
card, task, subtask; work that seems to need a fifth level was decomposed wrongly. An identifier
carries its wave, is permanent, is never reused, and fixes exactly one legal path: `W1-LF-04` card,
`W1-LF-04a` task, `W1-LF-04a.1` subtask. The area code is registered in the wave's `areas`.

A card is the smallest dispatchable unit as well as a container: a card whose outcome is one
reviewable atom is dispatched itself and carries its own `Current state`, `Review rounds` and
`Closure`; a card that needs several atoms gets tasks and closes when every `required` task is
accepted. Do not create a single task under a card merely to have somewhere to write the journal.

## States, markers, relations

| Marker | State | Required with it |
| --- | --- | --- |
| `[ ]` | `ready` | — |
| `[~]` | `active`, `review`, `rework` | `started_at` |
| `[?]` | `blocked` — objectively impossible to continue | `blocker` |
| `[=]` | `deferred` — paused, or gated behind a named event | `pause_reason`, or `return_trigger` for a trigger |
| `[!]` | `rejected` — withdrawn from the current cycle | `return_trigger` |
| `[x]` | `accepted` — in place | `accepted_at`, closure commit, evidence |

Review and return are not states of their own; which round a unit is in belongs to its file. Every
child declares one relation: `required` (the parent cannot close without it), `follow_up` (found
during work; the parent closes honestly without it), `expansion` (a new outcome), `trigger` (may
not start before its named event). An open `follow_up`, `expansion` or `trigger` never reopens an
honestly accepted parent.

`risk` and `maturity` live on the file. `review_rounds`, the `Review rounds` journal and
`escalation_decision` carry the convergence loop under [Review gate](review-gate.md); the validator
enforces only that count, journal and decision agree, that the journal stays within the four-return
ceiling, and that each line keeps the shape `- R2(5/10) RETURN 25/08 14:20 — finding → answer →
what changed`. `Current state` is rewritten, never appended to, and holds at most five lines;
`Next action` holds one operation; review dialogue is never copied into the file.

## Plan and frontier

Every node states what becomes observably true. Derive nodes from the nearest shippable outcome
downward; a node no goal claims is attached, parked with a trigger, or dropped. Rank ready nodes by
dependency, critical path, user value, feedback speed, risk reduction and reversibility, then apply
the charter's strategy: `alpha` prefers the smallest honest vertical path, `beta` alternates missing
coverage with the most consequential depth gaps, `stable` finishes component depth and operational
gates. Depth never blocks forward motion without a real dependency; while one branch investigates,
keep an independent ready branch moving. Do not manufacture small tasks to appear busy.

Keep the release clock in the checkpoint: nearest outcome, critical path, current wave (the wave
holding the head of the critical path; retained through its final `N/N` snapshot when its last card
lands), target window, next observable finish, accepted movement since the prior reconcile. Re-rank
after every material event.

A finding stays inside its unit when the current acceptance requires it and it keeps the same
scope, risk, owner and proof. It becomes its own file when it can be independently assigned,
performed, reviewed, returned and accepted. Separation decides ownership and closure, never
execution: small homogeneous siblings are dispatched and inspected as one batch under one contract,
each keeping its own identifier, state, closure and return path.

The CTO is the only writer of the tree. A worker reads its file from a frozen baseline and reports;
it proposes children in its return. Commit semantic plan changes — new nodes, dependencies, closure
— before a dependent dispatch and at material gates, with the regenerated index in the same change.
Lifecycle transitions belong to the checkpoint and never earn a plan commit of their own.

## The ledger writes the events

`ledger.py`, copied beside `work.py`, performs each lifecycle event as one call and stamps it from
the system clock — no event takes a time argument:

```sh
ledger.py --checkpoint <run.json> --work-root <root> dispatch  --task <id> --agent <id> --workspace <id> --role builder --baseline <sha>
ledger.py … candidate --task <id> --commit <sha-or-url>
ledger.py … verdict   --task <id> --verdict RETURN --score 6 --finding "…" [--answer …] [--changed …] [--delta]
ledger.py … escalate  --task <id> --decision bounded_retry --reason-text "…"
ledger.py … block     --task <id> --blocker "…"
ledger.py … merge     --task <id> --closure-commit <sha-or-url> --evidence <url> [--accepted "…"]
ledger.py … accept    --task <id> [--residue "…" --return-trigger "…"]
ledger.py … retire    --task <id>
```

One call updates the checkpoint, the node's front matter and sections, the journal line, the
generated index and the fleet render, then runs the validator. `--task` may be repeated for a
batch. A bare SHA becomes a commit-pinned link through `sourceRepository`; a short SHA is refused.
`merge` records integration and leaves the node in `review` until `accept`, unless the charter says
`mergeIsAcceptance`. The timezone token defaults to the machine's; pass `--timezone` to override.
A fleet render that fails because the Paseo probe is unavailable leaves the event recorded and
`FLEET.md` unchanged with a warning; a render tool that is missing beside the tooling is an error.

## Acceptance and the index

Acceptance sets the state, records `accepted_at`, the closure commit and durable evidence, fills
`Closure`, closes the checklist or records `deliberate_partial: true` with residue and an exact
`return_trigger`, and tests whether the parent can close. Each evidence entry is a Markdown link;
the literal `Git` is the deliberate waiver meaning the commit is the whole evidence.

`STATUS.md` carries exactly `| Status | ID | Task | Commit | Start | Time |`, one row per card,
task and subtask in tree order: the marker, the identifier linked to its file, the outcome title,
the closure commit for an accepted unit or the candidate for an active one as a short SHA linked to
the full commit, the first moment the unit became active (never reset), and `dd/mm hh:mm
(<duration>)` — acceptance time or last significant change, with active work only. `WAVES.md`
carries `| Status | ID | Wave | Outcome | Cards | Done |` with a closing total row. Neither reads
the clock, so regenerating an unchanged tree produces an identical file.

## Commands and the stamped copy

```sh
python3 <script home>/work.py --root <work root> init | new <kind> … | status | check [--fix] | fix-links
```

`new` creates a node at its derived path; `check` refuses a duplicate or misplaced identifier, an
unknown state or field, a missing link target, an accepted unit without closure commit or evidence,
an active unit without a start, a blocked unit without a blocker, a dependency cycle, a parent
closed over an open required child, an open checklist without a deliberate partial, a `Current
state` grown into a chronology, a hand-edited index, a commit reference that is not a full SHA, a
journal that contradicts its count or exceeds the ceiling, and a wave whose work started while its
plan review is `pending` or `returned`. `fix-links` repins short or branch forge references.

Copy `work.py`, `work-schema.json`, `ledger.py`, `render_fleet.py`, `check_runtime.py`,
`check-fleet-render.sh` and `work/` into the project's script home and bind `check` to the
validation gate; never call them from the plugin path, which carries a version and differs between
hosts. The pair `work.py` and `work-schema.json` is stamped with the plugin release and a digest;
`check --plugin-templates <plugin>/skills/paseo-cto/templates` reports a copy that fell behind.
