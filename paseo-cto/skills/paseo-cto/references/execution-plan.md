# Execution plan

Read this file completely before selecting, sequencing, adding, or reporting project work.

## Project truth and bindings

Resolve these bindings from the repository before operating:

- project instructions and no-touch boundaries;
- roadmap or product goals;
- living execution-plan document;
- authoritative validation commands;
- validation ownership and the exact triggers for full-suite, wave, release, and deploy checks;
- integration branch and commit convention;
- canonical HTTPS source repository URL for commit-pinned source links;
- founder, release, deploy, external, data, and irreversible-operation gates.

Never duplicate a tracker the project already keeps: bind to it and require only that every field
below has a home in it. When the project has no plan document, create the canonical set from
[Document standard](document-standard.md) in `operate` mode, in the repository's normal
documentation area. That standard also fixes the card shape, the acceptance row and the reference
check that keeps both from drifting.

## CTO-only delivery strategy

The CTO holds exactly one strategy for the project until the owner changes the persistent charter. It
controls prioritization only:

- **`alpha`** — maximize forward motion toward a runnable system and a verified basic end-to-end
  path. Defer work that is not needed to launch or test that path.
- **`beta`** — balance forward coverage with depth. Close important integration, negative-path,
  recovery, testing, and reliability gaps needed for broader real use.
- **`stable`** — prioritize depth. Bring each relevant component to the project's production bar for
  tests, reliability, fault tolerance, security, observability, performance, recovery, and operating
  documentation.

The strategy belongs only to the CTO. Do not put it in agent names, labels, task contracts, review
scores, or fleet rows. Agents always satisfy the exact contract they receive. The owner or project
truth chooses the strategy; if it is absent, the CTO states the assumption once. Changing strategy
is a visible CTO decision, not a silent per-task downgrade.

No strategy permits weak handling of authentication, authorization, money, privacy, data loss,
corruption, secrets, or irreversible actions. Those risks receive the necessary safety floor even
during `alpha`.

## Keep a living hierarchy

Treat the plan as a hierarchy rather than a flat immutable checklist:

```text
project outcome
  epic / wave
    executable atom
      discovered investigation, fix, verification, or integration child
```

Every dispatched task must map to one stable plan node. Existing nodes need not predict all future
work: when evidence exposes a missing step, add a child or sibling before dispatching it. Never hide
new work inside an inaccurate old row merely to preserve the original plan.

Each active node carries, in the project's native format:

- stable ID and a concise outcome-oriented title that stands on its own as a status row;
- state: `ready`, `active`, `review`, `rework`, `blocked`, `deferred`, or `done`;
- dependencies and explicit gates;
- completion evidence or acceptance condition;
- a bounded validation ladder when the project-wide default is insufficient;
- current owner or agent when active;
- source-linked commit/evidence reference when returned;
- blocker and pull trigger when blocked or deferred;
- for a discovered child, the evidence or event that spawned it — its reason for existing.

The last two exist so no task reads as random in status: every node ties back to a parent and, when it
was not in the original plan, to the finding that created it.

The plan state and the agent state are different state machines. The plan's authoritative state is
the exact machine token at the start of `Current state`; these tokens are never translated. The
heading marker is only its compact render:

| Plan state | Card marker | Agent-state relationship |
| --- | --- | --- |
| `ready` | `[ ]` | No agent is required; the node may be dispatched. |
| `active` | `[~]` | At least one owner is performing useful work. |
| `review` | `[~]` | A returned outcome is undergoing the required second look. |
| `rework` | `[~]` | The originating author is correcting accepted findings. |
| `blocked` | `[ ]` | A dependency or decision prevents dispatch or continuation. |
| `deferred` | `[ ]` | A named pull trigger must occur before the node becomes ready. |
| `done` | `[x]` | Transitional only: acceptance is being recorded atomically. |

Runtime agent states remain those defined by Fleet operations. They explain executor lifecycle and
do not overwrite the plan state; the CTO derives the plan transition from evidence.

Stable IDs are never renumbered, reused, or lost. Acceptance transfers a card atomically: append its
source-linked row to the acceptance history and remove the complete card from the current execution
plan in the same semantic change. The ID then lives in acceptance history and must not remain as a
duplicate done card in the execution plan. A removal without the matching acceptance row is a failed
plan-shape gate. Split a node when it crosses independent write zones, owners, acceptance boundaries,
or dependency edges. Newly discovered depth becomes explicit children. Park blocked or intentionally
skipped work with a reason and a pull trigger.

## Build the ready frontier

Rank ready nodes by dependency, critical path, user value, feedback speed, risk reduction, and
reversibility. Then apply the CTO strategy:

- in `alpha`, prefer the smallest honest vertical path to a working system;
- in `beta`, alternate missing functional coverage with the most consequential depth gaps;
- in `stable`, finish component depth and cross-component operational gates.

Depth must not block forward motion without a real dependency. While one branch investigates a hard
problem, keep an independent ready branch moving if write zones, integration order, and review
capacity remain safe. Conversely, do not manufacture small tasks merely to appear busy.

Keep the release clock in runtime state: nearest shippable outcome, current critical path, current
wave ID/name, target window, next observable finish or decision, and accepted movement since the
prior reconcile. The current wave is the wave containing the head of the critical path. When its
last card is accepted, retain it through the final `N/N` status snapshot, then advance to the wave
containing the next critical-path head. Re-rank after every material event; do not preserve a stale
priority merely because work already started.

Update the plan when dispatch depends on a new or changed node, and at discovery, semantic
return/rework, acceptance transfer, integration, blocking, deferral, and close. Reviewer queueing,
agent/workspace lifecycle, and candidate coordinates are transient runtime/status facts, not plan
changes. The CTO owns plan edits in the integration tree; workers propose new nodes in reports rather
than editing the project-wide tracker unless their contract explicitly grants that path.

The plan is durable project truth in Git. The CTO commits semantic plan changes locally before a
dispatch that depends on them and at material gates, and keeps the integration tree clean before
creating worker baselines. Do not create a plan commit solely to record that an unchanged candidate
entered review or that an agent/workspace changed lifecycle state; runtime and `STATUS.md` own those
transitions. Apply [Source references](source-references.md) to every commit or repository file that
supports a plan claim.

## Persist a recoverable checkpoint

Keep mutable runtime state outside the tracked worktree at the exact resolved path
`$(git rev-parse --git-common-dir)/paseo-cto/<run>.json`. Persistent owner choices live separately in
the canonical `SETTINGS.json` defined by [Persistent settings](persistent-settings.md). Record the
settings path/revision and a non-authoritative charter snapshot, accepted integration `HEAD`, CTO ID,
heartbeat ID/name, last report time, current wave ID/name, archived-since-report count, active plan
nodes, derived states and `stateSince`, every agent/workspace ID with its path, branch, baseline,
returned commits, the release clock, and preserved tails. Update the runtime file before compaction,
at material transitions, and at close. A runtime checkpoint, old run, or replacement CTO may never
overwrite the canonical settings. If `stateSince` is absent, report recovered state time as
approximate.

The human-facing status render sits beside the settings and checkpoints at
`$(git rev-parse --git-common-dir)/paseo-cto/STATUS.md`; the checkpoint is machine truth, and
[Status and reporting](status-and-reporting.md) defines how the render is produced from it.
