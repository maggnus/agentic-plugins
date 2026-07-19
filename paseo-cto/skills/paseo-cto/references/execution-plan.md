# Execution plan

Read this file completely before selecting, sequencing, adding, or reporting project work.

## Project truth and bindings

Resolve these bindings from the repository before operating:

- project instructions and no-touch boundaries;
- roadmap or product goals;
- living execution-plan document;
- authoritative validation commands;
- integration branch and commit convention;
- founder, release, deploy, external, data, and irreversible-operation gates.

Use existing project documents. Do not impose a particular filename or duplicate a tracker. If the
project has no execution plan, create the smallest useful one only in `operate` mode and keep it in
the repository's normal documentation area.

## CTO-only delivery strategy

The CTO holds exactly one strategy for the current project session. It controls prioritization only:

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
- current owner or agent when active;
- commit/evidence reference when returned;
- blocker and pull trigger when blocked or deferred;
- for a discovered child, the evidence or event that spawned it — its reason for existing.

The last two exist so no task reads as random in status: every node ties back to a parent and, when it
was not in the original plan, to the finding that created it.

Stable IDs are never renumbered or silently removed. Split a node when it crosses independent write
zones, owners, acceptance boundaries, or dependency edges. Newly discovered depth becomes explicit
children. Park blocked or intentionally skipped work with a reason and a pull trigger.

## Build the ready frontier

Rank ready nodes by dependency, critical path, user value, feedback speed, risk reduction, and
reversibility. Then apply the CTO strategy:

- in `alpha`, prefer the smallest honest vertical path to a working system;
- in `beta`, alternate missing functional coverage with the most consequential depth gaps;
- in `stable`, finish component depth and cross-component operational gates.

Depth must not block forward motion without a real dependency. While one branch investigates a hard
problem, keep an independent ready branch moving if write zones, integration order, and review
capacity remain safe. Conversely, do not manufacture small tasks merely to appear busy.

Update the plan at dispatch, discovery, return/rework, acceptance, integration, blocking, deferral,
and close. The CTO owns plan edits in the integration tree; workers propose new nodes in reports
rather than editing the project-wide tracker unless their contract explicitly grants that path.

The plan is durable project truth in Git. The CTO commits plan changes locally before dispatch and
at material gates, and keeps the integration tree clean before creating worker baselines.

## Persist a recoverable checkpoint

Keep mutable runtime state outside the tracked worktree at the exact resolved path
`$(git rev-parse --git-common-dir)/paseo-cto/<run>.json`. Record the accepted integration `HEAD`, CTO
ID, heartbeat ID/name, last report time, archived-since-report count, active plan nodes, derived
states and `stateSince`, every agent/workspace ID with its path, branch, baseline, returned commits,
and preserved tails. Update it before compaction, at material transitions, and at close. If
`stateSince` is absent, report recovered state time as approximate.

The human-facing status render sits beside this checkpoint at
`$(git rev-parse --git-common-dir)/paseo-cto/STATUS.md`; the checkpoint is machine truth, and
[Status and reporting](status-and-reporting.md) defines how the render is produced from it.
