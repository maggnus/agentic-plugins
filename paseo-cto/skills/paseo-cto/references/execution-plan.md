# Execution plan

Read this file completely before selecting, sequencing, adding, or reporting project work.

## Project truth and bindings

Resolve these bindings from the repository before operating:

- project instructions and no-touch boundaries;
- roadmap or product goals;
- work root and the project's copy of the work tooling, from `SETTINGS.json`;
- authoritative validation commands;
- validation ownership and the exact triggers for full-suite, wave, release, and deploy checks;
- integration branch and commit convention;
- canonical HTTPS source repository URL for commit-pinned source links;
- founder, release, deploy, external, data, and irreversible-operation gates.

The plan lives in the work tree defined by [Work tree](work-tree.md): one work unit is one permanent
file under the work root, created once and never moved. The structure below the root is derived from
the identifier rather than chosen, so a project cannot express the same plan in two shapes. A project
that already keeps an execution document adopts the tree under [Legacy adoption](legacy-adoption.md);
its frozen history keeps the shape described in [Document standard](document-standard.md).

Before the first dispatch on a new project or a new wave, build the tree under
[Project bootstrap](project-bootstrap.md). A wave whose first card has started without an accepted
plan review fails the tree check.

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
wave
  card
    task
      subtask
```

The depth stops there. Work that appears to need a fifth level was decomposed wrongly and is split
into another card or task instead.

Every dispatched task must map to one stable plan node. Existing nodes need not predict all future
work: when evidence exposes a missing step, add a child or sibling before dispatching it. Never hide
new work inside an inaccurate old row merely to preserve the original plan.

Each node carries, in the fields fixed by
[`templates/work-schema.json`](../templates/work-schema.json):

- stable wave-prefixed ID and a concise outcome-oriented title that stands on its own as an index row;
- state: `ready`, `active`, `review`, `rework`, `blocked`, `deferred`, `rejected`, or `accepted`;
- relation to the parent: `required`, `follow_up`, `expansion`, or `trigger`;
- dependencies and explicit gates;
- acceptance conditions, and completion evidence once accepted;
- a bounded validation ladder when the project-wide default is insufficient;
- source-linked candidate or closure commit;
- blocker when blocked, pause reason when paused, return trigger when deferred, trigger-gated or
  withdrawn;
- start time and accumulated active duration;
- for a discovered child, the evidence or event that spawned it — its reason for existing.

The last one exists so no task reads as random in the index: every node ties back to a parent and,
when it was not in the original plan, to the finding that created it.

The plan state and the agent state are different state machines. The plan's authoritative state is
the exact machine token in the node's `state` field; these tokens are never translated. The marker is
only its compact render.

| Plan state | Marker | Agent-state relationship |
| --- | --- | --- |
| `ready` | `[ ]` | No agent is required; the node may be dispatched. |
| `active` | `[~]` | At least one owner is performing useful work. |
| `review` | `[~]` | A returned outcome is undergoing the required second look. |
| `rework` | `[~]` | The originating author is correcting accepted findings. |
| `blocked` | `[?]` | A dependency or decision makes continuation objectively impossible. |
| `deferred` | `[=]` | A deliberate pause, or a named trigger that must occur first. |
| `rejected` | `[!]` | Withdrawn from the current cycle until its return trigger fires. |
| `accepted` | `[x]` | Accepted in place, with its closure commit and evidence recorded. |

Runtime agent states remain those defined by Fleet operations. They explain executor lifecycle and
do not overwrite the plan state; the CTO derives the plan transition from evidence.

Stable IDs are never renumbered, reused, or lost. Acceptance moves no text: the state changes and the
closure fields are filled in the same file, and the parent is then tested for closure over its
`required` children only. Split a node when it crosses independent write zones, owners, acceptance
boundaries, or dependency edges. Newly discovered depth becomes explicit children with their own
files under the rule in [Work tree](work-tree.md). Park blocked or intentionally skipped work with a
reason and an exact return trigger.

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
return/rework, acceptance, integration, blocking, deferral, and close. Reviewer queueing,
agent/workspace lifecycle, and candidate coordinates are transient runtime facts, not plan changes.

The CTO is the only writer of the work tree. A worker reads its task file and reports; it does not
edit that file, because it works from a frozen baseline in an isolated worktree and a state edit
there would have to be merged before it could be believed. Workers propose new nodes in their
returns, and the CTO creates them in the integration tree.

The plan is durable project truth in Git. The CTO commits semantic plan changes locally before a
dispatch that depends on them and at material gates, and keeps the integration tree clean before
creating worker baselines. Regenerate the work index in the same change that alters a node. One
decision produces one plan commit: everything a single acceptance or dispatch changes in the plan —
states, closure fields, the children it creates, and the regenerated index — lands together, not as
separate activation, closure, and bookkeeping commits. Do not
create a plan commit solely to record that an unchanged candidate entered review or that an
agent/workspace changed lifecycle state; runtime and the fleet render own those transitions. Apply
[Source references](source-references.md) to every commit or repository file that supports a plan
claim.

## Persist a recoverable checkpoint

Keep mutable runtime state outside the tracked worktree at the exact resolved path
`$(git rev-parse --git-common-dir)/paseo-cto/<run>.json`. Persistent owner choices live separately in
the canonical `SETTINGS.json` defined by [Persistent settings](persistent-settings.md). Record the
settings path/revision and a non-authoritative charter snapshot, accepted integration `HEAD`, CTO ID,
heartbeat ID/name, loaded plugin base version/tag/commit, CTO host and role assignment,
`sessionStartedAt`, last trustworthy host context measurement when available, last report time,
current wave ID/name, archived-since-report count, active plan nodes, derived states and `stateSince`,
every agent/workspace ID with its path, branch, baseline, returned commits, the release clock, and
preserved tails. Update the runtime file before compaction, at material transitions, and at close. A
runtime checkpoint, old run, or replacement CTO may never overwrite the canonical settings. A new
CTO session resets `sessionStartedAt`; compaction in the same session preserves it. If `stateSince`
is absent, report recovered state time as approximate.

Two different files are easy to confuse and must not be. The **fleet render** sits beside the
settings and checkpoints at `$(git rev-parse --git-common-dir)/paseo-cto/FLEET.md`: it is the
runtime snapshot of who is working right now, it is untracked, and
[Status and reporting](status-and-reporting.md) defines how it is produced from the checkpoint. The
**work index** is `STATUS.md` in the work root: it is committed, it is generated from the task files
by `work.py status`, and it shows where the project is rather than which agents are live.

The runtime checkpoint is current state, not an execution transcript. Store at most one bounded
`returnSummary` per live agent — verdict, exact candidate, open findings, and unverified gate, no
more than 1200 characters — and replace it when the decision changes. Never copy full prompts,
worker reports, command transcripts, repeated snapshots, or completed review dialogue into the
checkpoint. Keep at most twelve material-event records, each as a timestamp plus one decision or
state change. When an agent is safely archived, remove its live record after preserving its exact
Git coordinates and any unresolved tail in the task, durable evidence, or compact tail record.
Conversation history and an ever-growing JSON file are not recovery mechanisms; the task, Git,
settings, and this bounded checkpoint are.
