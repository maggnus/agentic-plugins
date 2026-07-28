# Fleet operations

Read this file before creating, recovering, or monitoring a fleet. Reporting lives in
[Status and reporting](status-and-reporting.md); archival and close live in
[Cleanup and close](cleanup-and-close.md). This file governs preflight, reconciliation, creation,
derived state, and the heartbeat.

## Preflight and state

`operate` requires the CTO to be an agent-scoped Paseo session (`PASEO_AGENT_ID` or equivalent
caller identity). Outside Paseo, allow only inspection/status and explain how to start or hand off
to a Paseo CTO; create no agents, workspaces, or heartbeat.

Bind project root/plan, the canonical settings path/revision, integration branch and accepted
`HEAD`, CTO/project/run IDs, owner gates, capacity, and heartbeat. Capacity counts external agents
only. Keep plan truth in Git, persistent owner choices in `SETTINGS.json`, and volatile state at the
canonical absolute path defined by Execution plan:

```text
$(git rev-parse --git-common-dir)/paseo-cto/<run>.json
```

Resolve the common directory before use; never clean an unresolved or broad path. Recover settings
before runtime, persist runtime after each lifecycle mutation, and commit plan changes before
dependent dispatch and material gates so integration stays clean. Lifecycle-only transitions belong
in runtime/status and do not justify a plan commit.

## Reconcile before creation

Reconcile on startup, resume, context recovery, every heartbeat, and material events. On startup,
recovery, and every fourth heartbeat (about hourly), also sweep for orphans — unlabeled crash tails
that routine project/run-scoped queries miss.

1. Read and validate persistent settings first, then plan, accepted Git state, and runtime
   checkpoint. If the runtime snapshot differs, retain the persistent settings and record the
   mismatch; never let an old run or a replacement CTO reset owner choices.
2. Inventory agents with `paseo ls --global --json`. Match the project first, regardless of run,
   then partition by `paseo-cto.run`; adopt or resolve prior-run work before new work on the same
   task.
3. List workspaces with `list_workspaces` (older-daemon fallback in the command catalog).
4. Inspect known IDs/permissions and match each owned record to its plan node, Git state, evidence,
   and review state.
5. Process returned results before dispatch. Detect duplicates, errors, suspected stalls, stranded
   or archived-agent workspaces, and dirty/unintegrated/unknown tails.
6. Persist runtime state, commit any durable plan correction, then rebuild the ready frontier.

### Turn-start check

Agents do not announce completion; the CTO discovers it. Because a full reconcile runs only on the
heartbeat and material events, begin **every** CTO turn with the cheap check instead: pending
permissions plus the status of the agents already recorded in runtime. A turn happens whenever the
owner writes or the CTO continues its own work, so this costs no extra cycle and usually surfaces a
return well before the next heartbeat. Escalate to the full reconcile below only when the cheap
check shows a return, an error, or a permission needing a decision.

Never mutate an unlabeled or foreign record without proving ownership. Never create a duplicate for
a task/role already `running`, `waiting`, `reviewing`, or `rework` in any run. The CTO is the sole
lifecycle owner of every agent in the run, recorded as `paseo-cto.parent`. A reviewer that returned
findings remains the default re-review owner rather than an idle tail; preserve it with its workspace
until the bounded rework resolves unless a Review-gate replacement condition applies. Advance a
preserved clean reviewer branch only through the Review gate's verified conflict-free fast-forward;
otherwise create a replacement workspace rather than rewriting review history.

## Create isolated work

Freeze an exact baseline and use plan-aligned branch/workspace names:

- `create_workspace`, then `create_agent(workspaceId)` (older-daemon `create_worktree` +
  legacy `create_agent` shapes are in the command catalog).

Persist the workspace immediately after creation, then the agent ID and labels immediately after
launch. Parallel agents use `notifyOnFinish: false`: a finish injection can replace the CTO turn and
is lost on daemon restart. Set it true in exactly one case — a single active agent sitting on the
critical path, where there is no concurrent turn to displace and the finish is the next thing the
CTO needs. With more than one agent in flight the flag stays false and the turn-start check plus the
heartbeat carry discovery.

## CTO handover

A new CTO first loads the same `SETTINGS.json`, inventories all project agents regardless of prior
run or CTO, and then adopts or creates runtime state. Preserve the settings revision and charter
snapshot while replacing only CTO/run/heartbeat identity. Do not re-onboard, choose provider
defaults, or reinterpret owner overrides merely because the CTO changes between Claude and Codex.
Conflicting legacy checkpoints are history; Persistent settings defines the migration and dispute
rule.

## Derived status and stalls

Paseo's native state and project work state differ. Maintain one English derived status per agent
and reset `stateSince` only when it changes:

| Status | Meaning |
| --- | --- |
| `running` | Useful agent work or a verified long operation is active. |
| `waiting` | A known permission, capacity, external event, or legitimate wait is pending. |
| `blocked` | A dependency or decision prevents progress. |
| `idle` | No active turn, with a concrete near-term reuse reason. |
| `reviewing` | A returned result is under independent or CTO review. |
| `rework` | The originating agent is correcting returned findings. |
| `stalled` | Repeated evidence shows no useful progress. |
| `error` | Paseo/provider failure remains unresolved. |
| `done` | Accepted result awaits immediate cleanup. |

Idle is not storage: archive unless a specific follow-up or dispute justifies reuse.

Elapsed time alone never proves a stall. Require two consecutive 15-minute snapshots without
meaningful progress, bounded `get_agent_activity(limit: 10–20)`, terminal/background evidence, and
permission/capacity/external-wait checks. Two such snapshots require a CTO decision in that
reconcile, not a third identical report: narrow, split, reassign, return, expose the gate, or stop.
Do not prompt a genuinely running turn. For confirmed stalls, preserve Git/workspace state before
cancellation; prefer reuse or replacement in the same workspace over discarding work.

## One heartbeat, one invariant

Keep exactly one agent-scoped heartbeat while the CTO can still advance in-scope work without a new
owner instruction: any agent `running`, `reviewing`, or `rework`; a pending permission; a verified
background operation; or a recoverable tail with an available action (review, integration, rework,
cleanup, or preserving mutable state).

Stop it the moment that is false — when the ready frontier is empty and every remaining tail is
**owner-gated**: immutable branch/baseline/head coordinates, a pull trigger that needs a new owner
instruction, accepted plan change, or external event, and no agent, workspace, permission, review,
rework, or background operation still needing care. In that same turn, persist every tail and the
exact resume trigger, write the final `STATUS.md` render once, and delete the heartbeat (current
`delete_heartbeat`, older-daemon `delete_schedule`). Do not renew it or re-emit an identical
scheduled report afterward; a later owner instruction, accepted plan change, or matching external
event starts a fresh reconciliation from the recorded trigger.

Create the heartbeat inside the CTO agent; a stable name plus target is idempotent:

```text
name: paseo-cto:<project>:<cto-short-id>
cron: */15 * * * *
maxRuns: 96
expiresIn: 24h
```

Store its ID. On collision with an active CTO turn, report at the nearest idle boundary; the next
interval catches up. Use this exact reconciliation prompt, filling absolute paths and IDs:

```text
PASEO CTO RECONCILIATION
Project root: <absolute-root>
Plan: <absolute-plan-path>
Project/run: <project>/<run>
CTO/runtime: <cto-id>/<absolute-runtime-json>
Settings: <absolute-settings-json> revision <revision>
Read and validate settings first, then plan and runtime state. Reconcile project agents globally,
process returns and permissions, derive states/stateSince and LOC, diagnose evidence-backed stalls,
preserve tails, perform safe archival, and update plan/runtime. Every fourth run perform the orphan
workspace sweep. Refill only safe capacity from ready plan nodes; never duplicate an existing task
or role. Rewrite the durable STATUS render, then post its header block and fleet table verbatim into
chat (not a prose summary), CTO first, per Status and reporting.
```
