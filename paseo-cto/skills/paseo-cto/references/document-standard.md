# Project document standard

Read this file when a project needs its durable documents created, when writing a card body, or when
maintaining a frozen execution history. Current work does not live here: it lives in the permanent
files defined by [Work tree](work-tree.md). This file covers the documents that surround the tree
and the frozen shape a project keeps from before it adopted the tree.

## One structure, not a convention

The work tree is mandatory while the CTO operates. A project does not keep its own parallel shape
for current work, and the plugin does not bind to a foreign tracker for it: two shapes for the same
plan mean two readings, two checks, and eventually two truths. The one adjustable value is the work
root, recorded once in `SETTINGS.json`.

A project that already keeps an execution document and an acceptance history adopts the tree under
[Legacy adoption](legacy-adoption.md). Its existing documents are frozen, keep the shape described
below, and are never converted.

The invariant registry remains recommended and unchanged, because its value is at the review gate
rather than in tracking work.

## The card body

The permanent card and task files carry the same content the plan document used to carry, in the
section order the schema fixes. Every field below has a home in the tree:

| Field | Where it lives now |
| --- | --- |
| Stable ID and outcome-oriented title | The identifier and the `# <id> — <title>` heading |
| Outcome | `## Outcome` |
| Risk | `risk`: `routine`, `significant`, or `critical` |
| Maturity | `maturity`: `RESEARCH`, `DESIGN`, `BUILD`, or `OPERATIONALIZATION`, repeated in the dispatch contract |
| Scope | `## Scope`, split into `In` and `Out` |
| Acceptance | `## Acceptance`, as a checklist with its negative half |
| Validation budget | The contract, or `## Guardrails` when it is a standing limit |
| Current state | `## Current state`, at most five lines, rewritten rather than appended to |
| Rounds and convergence | The review report; the second return forces the decision named in the Review gate |
| Residue | `## Closure` → `### Residuals`, with `deliberate_partial: true` |
| Return condition | `return_trigger` |

A card's aggregate contract lives in `CARD.md`: the shared outcome, the invariants every child must
hold, the shared boundary, and the conditions for honest closure. It does not repeat the detail of
its tasks.

## The frozen execution history

A project that operated before adopting the tree keeps its execution document and acceptance history
as read-only history. They are evidence of what was accepted, so they are not reformatted, corrected,
or converted.

The acceptance history holds one compact row per accepted card and nothing else:

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
time in parentheses. The parenthesized cost counts every agent turn across build, review and rework
plus the CTO's own work on that card; waiting is excluded, so the number reads as cost rather than
calendar duration. A card whose time was never measured records `(n/a)`; a figure is never
reconstructed after the fact. The work tree carries the same two facts as `accepted_at` and
`duration_minutes`, and renders them in the same form.

Under the tree, acceptance is not a transfer and there is no archive: the accepted body stays in the
file it was written in, which is what the transfer rule was trying to preserve.

## Source links

Every repository file or commit used as evidence in a task file, a review report, a decision record,
or a frozen document follows [Source references](source-references.md). File links are pinned to the
exact reviewed or accepted commit; commit links use the canonical forge page. Bare SHAs, bare file
paths, branch links, and labels such as "Git" are not durable evidence.

## The invariant registry (recommended)

A numbered list of contracts no change may break without an explicit decision record. Each entry
names what must hold and where it is enforced. Its value is at the review gate: `Critical` requires
a credible threat to a named invariant, and a registry turns that from a judgment call into a
lookup. Without one, risk classification drifts toward whatever the current reviewer fears most.

## Make the shape a gate

A document whose form rests on convention drifts, and nobody notices until the plan stops being
sequenceable. The checks are the gate:

- [`templates/work.py`](../templates/work.py) `check` validates the whole tree against
  [`templates/work-schema.json`](../templates/work-schema.json): identifiers, derived paths,
  vocabularies, field sets, section order, closure rules, dependencies, and the generated files. It
  also verifies its own stamp, so a copy assembled from two releases or edited in place is refused,
  and with `--plugin-templates` it reports a copy older than the installed plugin.
- [`templates/check-source-links.sh`](../templates/check-source-links.sh) rejects mechanically
  recognizable bare commit and file evidence in selected durable documents.
- [`templates/check-fleet-render.sh`](../templates/check-fleet-render.sh) validates the runtime
  fleet snapshot and, with `WORK_ROOT`, proves that `Cards: <done>/<total>` and the wave name agree
  with the tree.
- [`templates/check-plan-shape.sh`](../templates/check-plan-shape.sh) remains available for a frozen
  execution document from before adoption. It describes the old shape and is not applied to the tree.

Copy the checks and the templates into the project's own script home and bind them to the project's
validation gate; do not call them from the plugin path, which carries a version and differs between
Claude and Codex.
