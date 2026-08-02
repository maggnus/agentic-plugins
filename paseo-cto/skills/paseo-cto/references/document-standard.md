# Project document standard

Read this file when a project has no living plan document, when writing a new card, and when
recording an accepted one. It defines the canonical shape of the documents the CTO loop reads and
writes. `templates/` holds the copies to start from.

## Default, not imposition

- **A project without a tracker** gets the canonical set: a plan document and an acceptance history,
  created in `operate` mode in the repository's normal documentation area, from `templates/`.
  Optionally an invariant registry, which is worth its weight the moment reviews start arguing about
  what counts as `Critical`.
- **A project with its own tracker** keeps it. Bind to it, never duplicate it. The names and the
  layout are the project's; what the CTO requires is that every field below has a home, because the
  loop reads them: a node without a state, an acceptance condition, or a blocker with a pull trigger
  cannot be sequenced.

Either way the shape is a check, not a convention — see *Make the shape a gate*.

## The plan document

One living hierarchy, `outcome → epic/wave → atom → discovered child`, plus a dashboard that rolls
the epics up. Every dispatched task maps to one stable node.

A card carries exactly these fields:

| Field | Content |
| --- | --- |
| Heading | `<stable-id> — <outcome-oriented title> — <marker>`, where `[ ]` renders `ready|blocked|deferred`, `[~]` renders `active|review|rework`, and `[x]` renders transitional `done`. |
| **Outcome** | One testable result in one or two sentences. Not a task list. |
| **Risk** | `Routine`, `Significant` or `Critical` with the credible consequence and, for `Critical`, the threatened invariant. |
| **Maturity** | `RESEARCH`, `DESIGN`, `BUILD` or `OPERATIONALIZATION`; fixes what outcome the card promises. |
| **Scope** | What the card owns, and the boundaries it must not cross. |
| **Acceptance** | Machine-checkable conditions: commands, exits, observable states, negative cases. |
| **Validation budget** | Who owns which proof and the exact full-suite trigger. Optional when the project-wide default suffices. |
| **Current state** | Starts with exactly one plan-state token: `ready`, `active`, `review`, `rework`, `blocked`, `deferred`, or `done`; every supporting file or commit is source-linked. |
| **Rounds** | Review rounds this card has taken, when it has taken any. At two or more, `Convergence` becomes required. |
| **Convergence** | Which of the three decisions the second return forced: accept with residue, split, or the named gate. Required once `Rounds` reaches two. |
| **Residue** | A true finding accepted rather than fixed, stated as what is known to be wrong. Requires `Return condition`. |
| **Return condition** | The observable event that makes the residue worth fixing. Required whenever `Residue` is present. |

The last four exist because two review rules would otherwise live only in prose, and a rule that
lives only in prose is one the next tired session skips. `Rounds`/`Convergence` makes the
convergence decision visible in the plan; `Residue`/`Return condition` makes an accepted defect a
tracked fact rather than a line in a review nobody reads again. The shape check enforces both
pairings, so the omission is a failed gate rather than a discovery months later.

Blocked or deferred work records its blocker and the pull trigger that releases it. A discovered
child records the evidence that created it, so no node reads as random. The exact state-to-marker
mapping lives in [Execution plan](execution-plan.md); a disagreement between marker and `Current
state` fails the shape gate.

The dashboard shows one row per epic/wave with its state and readiness; it is derived from the
cards and must never disagree with them.

Update the plan in the same change that ships the work — at dispatch, discovery, return, acceptance,
integration, blocking, deferral and close. Stable IDs are never renumbered, reused, or lost.

### Acceptance is an atomic transfer

The execution plan contains current work; the acceptance history contains completed work. When an
outcome is accepted, append its compact source-linked acceptance row and remove its complete card
from the execution plan in the same semantic change. This is a transfer, not two independent edits:

- do not leave a duplicate `[x]` card in the execution plan after the acceptance change;
- do not remove a card unless its stable ID appears in the acceptance history;
- do not add an acceptance row for an ID that remains current;
- never reuse an ID after transfer.

When the reference check receives `BASE_REF=<accepted-before-change>`, it verifies both sides of the
transfer against the prior tree. Without `BASE_REF`, it still rejects an ID present in both current
documents but cannot prove that a removed ID existed previously.

## The acceptance history

One compact row per accepted card, and nothing else. Candidate SHAs, patch IDs, review dialogue and
command transcripts belong in Git, CI and runtime artifacts.

| Column | Content |
| --- | --- |
| Card | Stable plan ID |
| Wave | Epic or wave label |
| Risk | The classification the card landed under |
| Accepted outcome | What is true now that was not before |
| Closure record | Markdown link to the integration commit or equivalent durable source record |
| Durable evidence | One or more Markdown links to the exact source, CI result, runtime record, or artifact |
| Time | When the row was written, then the working time the card cost |

`Time` holds `DD/MM HH:MM (<cost>)` — the local-time moment of acceptance, then the active working
time in parentheses. The timestamp orders the history and shows the product clock, so it records
when the row was written and is never backdated to when the work started.

The parenthesized cost counts every agent turn across build, review and rework plus the CTO's own
work on that card. Waiting is excluded — an owner decision, an external gate, a queued dispatch or
an idle session is not spent time — so the number reads as cost, not as calendar duration. Sum it
from the runtime checkpoint at acceptance, round to five minutes, and write `(<N>h<MM>m)`, `(<N>h)`
on a whole hour, or `(<N>m)` below an hour. A returned and reworked card carries the sum of its
attempts. A card whose time was never measured records `(n/a)`, and a historical row that predates
the column keeps a bare `n/a`; a figure is never reconstructed after the fact.

## Source links

Every repository file or commit used as evidence in the plan, acceptance history, review report, or
decision record follows [Source references](source-references.md). File links are pinned to the exact
reviewed or accepted commit; commit links use the canonical forge page. Bare SHAs, bare file paths,
and labels such as "Git" are not durable evidence.

## The invariant registry (recommended)

A numbered list of contracts no change may break without an explicit decision record. Each entry
names what must hold and where it is enforced. Its value is at the review gate: `Critical` requires
a credible threat to a named invariant, and a registry turns that from a judgment call into a
lookup. Without one, risk classification drifts toward whatever the current reviewer fears most.

## Make the shape a gate

A document whose form rests on convention drifts — a card loses its acceptance section, a row loses
its evidence, and nobody notices until the plan stops being sequenceable.
[`templates/check-plan-shape.sh`](../templates/check-plan-shape.sh) is the reference check: card
headings and state mappings, the required sections, allowed risk and maturity values, atomic
acceptance transfer, source links in acceptance rows, and the acceptance table's column count and
time field. [`templates/check-source-links.sh`](../templates/check-source-links.sh) rejects
mechanically recognizable bare commit and file evidence in selected durable documents.

Copy both checks into the project's own script home and bind them to the project's validation gate;
do not call them from the plugin path, which carries a version and differs between Claude and Codex.
Extend the copies with whatever else the project can express — a dashboard-versus-cards cross-check
is the usual first addition, since only the project knows its rollup.
