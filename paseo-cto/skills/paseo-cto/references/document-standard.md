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
| Heading | `<marker> <stable-id> — <outcome-oriented title>`. The marker is always the first content after the Markdown heading prefix: `[ ]` renders `ready|blocked|deferred`, `[~]` renders `active|review|rework`, and `[x]` renders transitional `done`. Example: `#### [ ] LF-06 — Ship immutable App releases`. |
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
state`, or a marker placed at the end of the heading, fails the shape gate.

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

### The row is an index; the card body is preserved

A row records that an outcome was accepted. It cannot hold what the card decided, what it deliberately
excluded, what its acceptance conditions were, or what residue it left. Transferring a card into a row
alone therefore destroys the reasoning while keeping the name of the work, and the loss is invisible
afterwards because the plan is also the record that would reveal it.

So the transfer has three parts, not two:

- **The body is preserved verbatim.** Write the complete card, unedited, to its own file in an
  accepted-card directory, and link that file from the row's durable-evidence cell. Do not summarise,
  reformat or improve it: the value of the record is that it is the text that was accepted.
- **A residue is live work, not history.** An accepted residue with a return condition is an open
  commitment. It re-enters the execution plan as a deferred card carrying that condition as its pull
  trigger, and it does not travel into the history with the rest of the card.
- **The row then carries only what a reader needs to find the rest.**

Store the preserved files as a tree whose shape is the shape of the work: a directory per wave, then
the card, then its tasks. `LF-08/9b` accepted in wave `W3` becomes `W3/LF-08/9b.md`, beside
`W3/LF-08.md` for the parent card itself. Each file keeps its identifier verbatim, so the archive is
walked the way the plan is read, and a reader who knows the wave finds the card without a search.

The wave is not part of the identifier, so a check that must find a preserved body locates it by its
tail rather than by reconstructing a path. Within one card a plain listing orders tasks lexically,
which puts a two-digit suffix before a single-digit one; that is a cosmetic cost of keeping the
identifier verbatim, and a project that minds it pads the suffix in the file name.

Work discovered, planned and accepted between two baselines appears only in the history. That is
legitimate exactly when the preserved body exists — it is the evidence that a card existed at all — so
a row without one is rejected.

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
[`templates/check-status-render.sh`](../templates/check-status-render.sh) validates the exact
current-wave status header and fleet table. With `PLAN_FILE` and `ACCEPTANCE_FILE`, it also proves
that `Cards: <done>/<total>` agrees with the atomic current/history split for that wave.

Copy the checks into the project's own script home and bind them to the project's validation gate;
do not call them from the plugin path, which carries a version and differs between Claude and Codex.
Extend the copies with whatever else the project can express — a dashboard-versus-cards cross-check
is the usual first addition, since only the project knows its rollup.
