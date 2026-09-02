# Fleet operations

Read this file before creating, recovering or monitoring a fleet. It governs preflight, the
runtime checkpoint, reconciliation, creation, parallel work, derived state and the heartbeat.
Reporting is in [Status and reporting](status-and-reporting.md); retirement and close in
[Cleanup and close](cleanup-and-close.md).

## Preflight and state

Operate requires an agent-scoped Paseo session (`PASEO_AGENT_ID` or equivalent). Outside Paseo,
allow only inspection and status and explain how to start a Paseo CTO. Bind the project root, work
root, settings path and revision, integration branch and accepted head, CTO/project/run IDs, owner
gates, both fleet ceilings and the heartbeat. Plan truth lives in Git, owner choices in
`SETTINGS.json`, volatile state in the checkpoint:

```text
$(git rev-parse --git-common-dir)/paseo-cto/<run>.json
```

Runtime schema 3 has these top-level keys: `schema`, `updatedAt`, `project`, `run`, `settings`
(`path/revision`), `plugin` (`version/commit`), `cto` (identity, assignment, session and state
times, derived status, bounded action), `integration` (`branch/head/acceptedHead`), `heartbeat`
(`id/name/status`), `releaseClock` (nearest outcome, critical path, current wave ID and name,
target window, next observable finish, accepted movement), `activeNodes` (`id`, `ceremonyMinutes`,
`auxiliaryReturnsSinceMovement`, `accounting`), `agents` (identity, task/role/family/title,
workspace/baseline, optional candidate, assignment/mode, derived status and `stateSince`, one
`returnSummary` under 1200 characters), `workspaces`, `tails`, `materialEvents`; optional
`resources` and `accountingTotals`. Keep at most twelve material events and twelve tails. The
checkpoint is current state, not a transcript: it is written by the ledger on every event, and by
hand only to adopt a resumed run. Conversation history is not a recovery mechanism.

`check_runtime.py <checkpoint> --project-root <root>` validates the checkpoint against the live
Paseo inventory, settings and Git; a mismatch, a legacy checkpoint or an unavailable probe stops
dispatch until a fresh inventory is reconciled.

## Reconcile

Reconcile on startup, resume, context recovery, a material event, and the heartbeat. Every fourth
heartbeat, and on startup and recovery, also sweep for orphans.

1. Read settings, the tree, accepted Git state and the checkpoint; run `check_runtime.py`.
2. Inventory by label, never by directory: `paseo ls --global --label paseo-cto.project=<project>
   --label paseo-cto.run=<run> --json` plus every unlabelled agent whose parent is the exact CTO.
   Worktree agents do not appear in a root-scoped listing; a CTO that inventories by directory
   dispatches duplicates.
3. Inspect every recorded ID with `get_agent_status`; match each record to its node, Git state,
   evidence and review state; rename any title that differs from its derived form.
4. **Collect finished work as a step.** For every recorded agent not running, read the return in
   this reconcile and move the node, or record why it cannot move. An uncollected result costs the
   whole interval.
5. Process returns and permissions before dispatch; detect duplicates, errors, stalls, stranded
   workspaces and dirty tails. Never create a duplicate for a task and role already live in any run.
6. Persist runtime through the ledger, commit any durable plan correction, rebuild the ready
   frontier.

**Turn-start check.** Begin every turn with the cheap check — pending permissions plus the recorded
agents' status — and escalate to a full reconcile only when it shows a return, an error or a
decision. A non-running agent means a report is waiting; fetch it in that turn. Never wait in-turn
for a long operation: start it detached, record where its exit line will appear, and read that
line at the next material event or heartbeat — never by a wait loop inside the CTO turn.

**Resume and handover.** A restarted or handed-over CTO is a new session with a new agent ID. Its
first mutation is adoption: inventory by label, `update_agent` each live agent of this run whose
parent is the previous session, record the new parent in `cto.agentId`, rerun the validator. A
same-run predecessor is the only parent an agent may have carried; any other parent is foreign. A
CTO on the other host loads the same `SETTINGS.json`, keeps its revision and charter, and replaces
only CTO, run and heartbeat identity. After an agent-daemon restart, sessions and the heartbeat are
gone while worktrees, branches and commits survive: re-issue each active card's contract to a fresh
agent in its preserved workspace, including any review findings already returned, recreate the
heartbeat, and sweep the scratch directories the dead sessions left.

## Create isolated work

Before any workspace: confirm the integration tree is clean, record the exact baseline SHA, choose
a branch name no working copy holds. Then `create_workspace(title:<derived-agent-title>)` in
branch-off mode from that SHA, verify the returned title, and
`create_agent(workspaceId, title:<the-same-derived-agent-title>)`. This equality is strict.
Pointing a new workspace at an existing branch moves that branch and strands its uncommitted work;
to hand an existing branch to an agent, verify no copy has it checked out and re-verify the
integration tree afterwards. Persist the workspace ID immediately after creation and the agent ID
and labels immediately after launch. A finish notification can replace the CTO turn in progress and
is lost on daemon restart; re-derive state from the checkpoint rather than from the interrupted turn.

## Parallel work

`max_live_tasks` limits tasks in flight; `max_live_agents` limits external sessions; a task carries
at most one live agent per role. Admit work only under both.

1. As many tasks run as have pairwise disjoint write zones at file granularity — no more, and the
   ceiling is never a target. Disjoint paths are not enough when tasks share a running thing — a
   stand and its ports, a datastore, a shared index — recorded as resources with a mode; a second
   task on an `exclusive` one stops for a decision.
2. An overlap is split along its subsystem seam; what will not split becomes a successor
   re-baselined on the earlier atom's accepted head. Conflicts are never resolved by hand in a
   writer's workspace.
3. A task changing a canonical contract, a schema or shared infrastructure runs alone.
4. A deterministically regenerated file — lockfile, formatter output, generated index — is not
   shared ownership; the CTO regenerates it at integration.
5. No inspection capacity, no new task: a task admitted without the glance, look or reviewer its
   depth needs will sit as a candidate. Batching Routine siblings is how capacity stretches.
6. Accepted work integrates and retires immediately; refill only with admissible ready work.

Name a wave's independent lanes in its wave file and attach every node to one. If the critical
path is one chain, the honest concurrency is one task plus off-path work; say so instead of
dispatching overlapping atoms to look busy. Track `ceremonyMinutes` and the saturating `0..2`
`auxiliaryReturnsSinceMovement` per active node: after two auxiliary layers — a research dispatch or
a review organization beyond the node's own loop — without accepted movement, the next action builds,
integrates, combines the check with an existing review, exposes a gate, or stops.

## Derived status and stalls

One derived token per agent, `stateSince` reset only when it changes: `running`, `waiting`,
`blocked`, `idle`, `reviewing`, `rework`, `stalled`, `error`, `done`. Idle is not storage: retire
unless a specific follow-up justifies reuse. An agent session belongs to one atom; reuse it only for
that atom's convergence loop. An unrelated atom always starts a fresh session.

Elapsed time alone never proves a stall. Require two consecutive heartbeat snapshots without
meaningful progress, bounded `get_agent_activity(limit: 10–20)`, terminal or background evidence,
and permission, capacity and external-wait checks; then decide in that reconcile — narrow, split,
reassign, return, expose the gate, stop. Never prompt a genuinely running turn. When an atom's
target window expires, instruct the author to return a candidate within twenty minutes with
`deliberate_partial` declared and the remainder under `UNVERIFIED` and `FINDINGS`.

Where a push to the integration branch starts a build and promotion, the branch is busy for
`mainAdvanceWindowMinutes`: plan and documentation commits queue and push `[skip ci]` in a quiet
window; code merges go one at a time after the previous promotion completed; the window check is a
named step before every push.

## One heartbeat

Keep exactly one agent-scoped heartbeat while the CTO can still advance in-scope work without a new
owner instruction; stop it the moment the ready frontier is empty and every remaining tail is
owner-gated, persisting every tail and the exact resume trigger in that same turn, then
`delete_heartbeat` and `delete_schedule` by exact ID for every schedule this run created — the two
are separate records. Do not renew it afterwards; a later owner instruction starts a fresh
reconciliation.

`notifyOnFinish` carries the primary signal; the heartbeat is the fallback that catches a lost
notification and a stall. Its cadence is the charter's `heartbeatMinutes` (default 30):

```text
name: paseo-cto:<project>:<cto-short-id>
cron: */<heartbeatMinutes> * * * *
maxRuns: <1440 / heartbeatMinutes>
expiresIn: 24h
```

A heartbeat turn is cheap by default and expensive only when it has to be:

```text
PASEO CTO HEARTBEAT
Project root: <absolute-root> · Work root: <absolute-work-root>
Project/run: <project>/<run> · CTO/runtime: <cto-id>/<absolute-runtime-json>
Settings: <absolute-settings-json> revision <revision>
Start with the cheap check: list_pending_permissions and get_agent_status for every agent the
checkpoint records. If nothing returned, nothing errored and no permission waits — and this is not
the fourth heartbeat since the last full reconcile — post one quiet liveness line from the checkpoint
and end the turn. Otherwise reconcile fully: validate settings and runtime with check_runtime.py,
inventory by label, collect every return, resolve permissions, derive states and LOC, diagnose
evidence-backed stalls, preserve tails, retire integrated records, refill only safe capacity from
ready nodes under both ceilings, and render FLEET.md through the ledger. Post the full snapshot
only when a material event occurred since the last posted one; add brief prose only for a material
event. Never repeat unchanged prose.
```

On collision with an active CTO turn, report at the nearest idle boundary; the next interval
catches up. When pushes are arriving faster than `mainAdvanceWindowMinutes`, say so once.
