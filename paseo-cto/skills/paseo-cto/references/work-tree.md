# Work tree

Read this file before creating, updating, splitting, or accepting any unit of work, and before
producing the work index. It defines the permanent-file model: one work unit is one file, created
once and never moved.

## One unit, one permanent file

A work unit is created in its final place and stays there for its whole lifecycle:

```text
planned → active → blocked | paused | rework → accepted | rejected
```

Acceptance moves no text: the state changes and the closure fields are filled in the same file. The
file that was dispatched is the file that is reviewed and accepted. Nothing is summarised into a row
or copied into an archive.

The tree carries current and completed work together. Git carries candidate history, the evidence
package carries command transcripts, and the work index carries the one-line view.

## Structure

```text
docs/work/
├── STATUS.md                       generated index of every unit; never hand-edited
├── WAVES.md                        generated overview of the waves; never hand-edited
├── WORKFLOW.md                     standing rules; no live task ever appears here
├── waves/
│   └── W1/
│       ├── WAVE.md
│       └── W1-LF-04/
│           ├── CARD.md
│           └── tasks/
│               ├── W1-LF-04a.md
│               └── W1-LF-04c/
│                   ├── TASK.md
│                   └── subtasks/
│                       └── W1-LF-04c.1.md
└── backlog/
    ├── TRIGGERS.md
    ├── OWNER_GATES.md
    └── REJECTED.md
```

The root is the only adjustable path. It is recorded once in `SETTINGS.json` as `work.root` and
defaults to `docs/work`; everything below it is derived, not chosen. The depth is fixed at wave,
card, task, subtask. Work that seems to need a fifth level is work that was decomposed wrongly:
split it into another card or another task instead.

## Identifiers derive the path

An identifier always carries its wave, is permanent, is never reused, and never changes when
priority, state, or ownership changes.

```text
W1-LF-04      card
W1-LF-04a     task
W1-LF-04b     the next task
W1-LF-04a.1   subtask
```

The wave number, the area code and the ordinal fix exactly one legal path, and the check recomputes
it in both directions. A task with no subtasks is `tasks/<id>.md`; a task that has them becomes
`tasks/<id>/TASK.md`. The area code is registered in the wave's `areas` field, so codes cannot
accumulate by taste.

## States and markers

| Marker | State | Meaning | Required with it |
| --- | --- | --- | --- |
| `[ ]` | `ready` | Planned; may be dispatched | — |
| `[~]` | `active`, `review`, `rework` | Work, review, or correction after a return | `started_at` |
| `[?]` | `blocked` | Continuation is objectively impossible | `blocker` |
| `[=]` | `deferred` | Deliberately paused, or gated behind a named event | `pause_reason` or, for a trigger, `return_trigger` |
| `[!]` | `rejected` | Withdrawn from the current cycle | `return_trigger` |
| `[x]` | `accepted` | Accepted in place | `accepted_at`, closure commit, evidence |

Review and return are not states of their own. A unit under review stays `[~]`, a returned unit
stays `[~]`, and which round it is in belongs to its file rather than to the index. `[?]` is only
for objective impossibility; a deliberate stop is `[=]`.

## Relation to the parent

Every child declares exactly one relation.

- `required` — the parent cannot close until this child is accepted.
- `follow_up` — found during work or review; the parent's outcome is honestly accepted without it.
- `expansion` — a new outcome beyond the original scope.
- `trigger` — may not start before a named event, which is recorded as its return trigger.

A card closes when every `required` child is accepted. An open `follow_up`, `expansion`, or
`trigger` child never reopens an honestly accepted parent, and the same rule applies one level up
between cards and their wave.

## Metadata

[`templates/work-schema.json`](../templates/work-schema.json) is the single source of truth for
field sets, vocabularies, section order, and identifier grammar. The templates, the generator, and
the validator all read it. Every field is a closed vocabulary or a typed scalar; an unknown field or
value, a timestamp without an offset, and a negative duration are refused.

`risk` and `maturity` live on the file, not only in the dispatch contract. The contract is transient,
and the maturity a result was judged at — `RESEARCH`, `DESIGN`, `BUILD`, `OPERATIONALIZATION` —
decides whether a later reading is correct.

## When a finding becomes its own file

A finding stays inside the current unit when it is required by the current acceptance, tests the
same outcome, and keeps the same scope, risk, owner, and proof. It becomes its own task or subtask
when it has a separate outcome, needs separate acceptance, changes scope, carries different risk,
needs a different specialist, can be independently returned or accepted, can be deferred without
making the current acceptance dishonest, or waits on a separate owner decision or external trigger.

The test: a separate file is needed when the work can be independently assigned, performed,
reviewed, returned, and accepted. Ordinary implementation steps stay a checklist inside their file.

Separation decides ownership and closure, never execution. Small homogeneous siblings — one technical
surface, one environment, one verification method, one review context — are implemented and reviewed
as one batch under one contract, one workspace, and one review, classified at the highest risk among
them. Each batched node keeps its own identifier, state, closure record, and return path, and the
shared evidence must close each node individually. A node that develops independent risk, a separate
acceptance story, or a return of its own leaves the batch.

## While the work runs

`Current state` is rewritten, never appended to, and holds at most five lines: the position, the
blocker, and the next significant step. `Next action` holds one operation. Review dialogue is never
copied into the file. A closed finding leaves the open list or appears in the closure record. A
return leaves the unit active. A block preserves the duration already accumulated, and resuming does
not reset the start.

## Acceptance

Set the state to `accepted`, record `accepted_at`, record the closure commit and the durable
evidence, fill `Closure`, close the acceptance checklist or record `deliberate_partial: true`,
update the active duration, regenerate the index, then test whether the parent card and the wave can
now close. The file stays where it is.

Each evidence entry is a Markdown link. The literal `Git` is the only exception and records that the
commit itself is the whole evidence; it is written deliberately so an accepted task with nothing
behind it cannot pass silently.

A partial acceptance is honest only when the headline outcome is genuinely achieved, the limitation
does not make it false, the return trigger is exact and observable, the residue is reversible or
observable, and the accepting review — the CTO or a delegated reviewer — agreed that a separate
required task is not needed. The unachieved
independent part gets its own identifier; it is never left in prose.

## The index

`STATUS.md` is generated from the tree and is an index, not a second copy of the work. It carries
exactly:

```markdown
| Status | ID | Task | Commit | Start | Time |
```

- **Status** — the marker as inline code.
- **ID** — the full identifier, linked to its permanent file.
- **Task** — the outcome title, never an activity.
- **Commit** — the closure commit for an accepted unit, the candidate commit for an active one, and
  `—` otherwise. A short SHA is displayed, and it links to the immutable full commit; a branch link
  is not commit identity.
- **Start** — `dd/mm hh:mm`, the first transition into active work. A return, a re-review, a block,
  or a pause never resets it.
- **Time** — `dd/mm hh:mm (<duration>)`. The moment is the acceptance time for an accepted unit and
  the last significant state change otherwise. The duration is active work only: builder, reviewer,
  rework, and CTO investigation or integration on that unit. Waiting on an owner decision, an
  external event, an environment, or an idle session is excluded.

Rows appear in tree order, ascending by identifier. No value is read from the clock, so regenerating
an unchanged tree produces an identical file.

Waves are not rows in that table; they get their own generated file, `WAVES.md`, written by the same
command:

```markdown
| Status | ID | Wave | Outcome | Cards | Done |
```

One row per wave in ascending order, with its state marker, its title, the first line of its
`Outcome` section, how many of its cards are accepted, and that share as a percentage rounded half
up from integers. The last row totals every wave. A wave with no cards renders `0/0` and `—`.

## Commands

```sh
python3 <script home>/work.py --root <work root> init
python3 <script home>/work.py --root <work root> new task --parent W1-LF-04 --title "<outcome>"
python3 <script home>/work.py --root <work root> status
python3 <script home>/work.py --root <work root> check
python3 <script home>/work.py --root <work root> fix-links
```

Nodes are created by `new` rather than by hand, so an identifier, a path, and a parent listing
cannot disagree from the first minute. `status` rewrites the index only when it changed. `check`
refuses a duplicate identifier, an identifier that does not match its path or its wave directory, an
unknown state or field, a missing link target, an accepted unit without a closure commit or
evidence, an active unit without a start, a blocked unit without a blocker, a paused unit without a
reason, a rejected or trigger-gated unit without a return trigger, a negative duration, a malformed
timestamp, a dependency cycle, a dependency without a file, a parent closed over an open required
child, an acceptance checklist left open without a deliberate partial, a `Current state` that has
turned into a chronology, an index that disagrees with the tree, a commit reference that is not a
full immutable SHA, a nested Markdown link, a title that names an activity, and one identifier that
is live in both the tree and a frozen legacy document. `fix-links` repairs the mechanical class:
a commit link carrying a short SHA and a source link pinned to a branch are repinned to the full
commit SHA the local repository resolves them to.

Copy `work.py`, `work-schema.json`, and `templates/work/` into the project's own script and template
home and bind `check` to the project's validation gate. Do not call them from the plugin path, which
carries a version and differs between hosts.

That copy can silently fall behind, so it is stamped. `work.py` and `work-schema.json` carry the
plugin release in which the tooling last changed, together with a digest over the pair. Every run
verifies both, refusing a copy assembled from two releases or edited in place. `work.py version`
prints the stamp, and

```sh
python3 <script home>/work.py check --root <work root> --plugin-templates <plugin>/skills/paseo-cto/templates
```

additionally compares the project's stamp with the installed plugin's, so a project that stayed on an
older release learns it from the gate rather than from a surprising behaviour months later. A change
the project genuinely needs belongs in the plugin, not in the copy.
