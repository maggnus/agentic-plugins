# Fleet operations

Read this file before creating, recovering, or monitoring a fleet. Reporting lives in
[Status and reporting](status-and-reporting.md); archival, deletion and close live in
[Cleanup and close](cleanup-and-close.md). This file governs preflight, reconciliation, creation,
derived state, and the heartbeat.

## Preflight and state

`operate` requires the CTO to be an agent-scoped Paseo session (`PASEO_AGENT_ID` or equivalent
caller identity). Outside Paseo, allow only inspection and status, and explain how to start or hand
off to a Paseo CTO; create no agents, workspaces, or heartbeat.

Bind project root and plan, the canonical settings path and revision, integration branch and
accepted `HEAD`, CTO/project/run IDs, owner gates, capacity, and heartbeat. Capacity counts external
agents only. Keep plan truth in Git, persistent owner choices in `SETTINGS.json`, and volatile state
at the canonical absolute path defined by Execution plan:

```text
$(git rev-parse --git-common-dir)/paseo-cto/<run>.json
```

Resolve the common directory before use; never clean an unresolved or broad path. Recover settings
before runtime, persist runtime after each lifecycle mutation, and commit plan changes before
dependent dispatch and material gates. Lifecycle-only transitions belong in runtime and never
justify a plan commit.

## Reconcile before creation

Reconcile on startup, resume, context recovery, every heartbeat, and material events. On startup,
recovery, and every fourth heartbeat, also sweep for orphans — unlabeled crash tails that routine
project-scoped queries miss.

1. Read and validate persistent settings first, then plan, accepted Git state, and runtime
   checkpoint. If the runtime snapshot differs, retain the persistent settings and record the
   mismatch; never let an old run or a replacement CTO reset owner choices.
2. Inventory agents across **every working copy**, not from the integration root alone. Agent
   listings are scoped by working directory, so a busy fleet reads as empty from the root, and an
   empty reading is what produces a duplicate agent on a task someone is already building. Enumerate
   the workspaces first, query per copy, and reconcile the union against runtime. Treat any
   inventory that returns nothing as unproven until a second reading confirms it.
3. List workspaces with `list_workspaces`.
4. Inspect known IDs and permissions, and match each owned record to its plan node, Git state,
   evidence, and review state. Derive each agent's expected title from its labels and rename on
   mismatch. Require its recorded workspace to carry the same title, correcting a mismatch with
   `rename_workspace` before reuse. Names follow the single derived format in Roles and providers.
5. **Collect finished work as a step, not as a by-product.** A completed agent does not announce
   itself; its report sits until someone fetches it. For every recorded agent not currently running,
   fetch and read the return in this reconcile, then move the card to `reviewing` or record why it
   cannot move. An uncollected result costs the whole interval it waits and survives a handover
   unnoticed.
6. Process returned results before dispatch. Detect duplicates, errors, suspected stalls, stranded
   workspaces, and dirty or unintegrated tails.
7. Persist runtime state, commit any durable plan correction, then rebuild the ready frontier.

### Turn-start check

A full reconcile runs only on the heartbeat and material events, so begin **every** CTO turn with
the cheap check instead: pending permissions plus the status of the agents already recorded in
runtime. A non-running agent means a report is waiting; fetch it in that turn. This costs no extra
cycle and usually surfaces a return well before the next heartbeat. Escalate to the full reconcile
only when the cheap check shows a return, an error, or a permission needing a decision.

Never mutate an unlabeled or foreign record without proving ownership. Never create a duplicate for
a task or role already `running`, `waiting`, `reviewing`, or `rework` in any run. The CTO is the sole
lifecycle owner of every agent in the run, recorded as `paseo-cto.parent`. A reviewer that returned
findings remains the default re-review owner: preserve it with its workspace until the bounded
rework resolves, unless a Review-gate replacement condition applies. Advance a preserved clean
reviewer branch only through the Review gate's verified conflict-free fast-forward.

## Create isolated work

Freeze an exact baseline and use a plan-aligned branch name. Derive the agent title before creating
its workspace, and use that exact string as the workspace title: call
`create_workspace(title:<derived-agent-title>)`, verify the returned workspace title, then
`create_agent(workspaceId, title:<the-same-derived-agent-title>)`.

This equality is strict. Do not launch an agent when its newly created workspace has a different
title, and do not decorate either name with a workspace suffix, run ID, or descriptive text.

**Always branch off an exact SHA into a new branch name.** Pointing a new workspace at an existing
branch moves that branch into the new working copy, and the tree that held it is left on whatever
the tool put there, carrying the uncommitted work that was in progress. The damage is silent and
surfaces later as a commit on the wrong branch or a lost edit.

The safe order, before creating any workspace: confirm the integration tree is clean, record the
exact baseline SHA, choose a branch name no working copy currently holds, and create the workspace
in branch-off mode from that SHA. To hand an existing branch to an agent, verify no other copy has
it checked out first, then re-verify the integration tree's branch and cleanliness immediately after
the workspace exists.

Persist the workspace immediately after creation, then the agent ID and labels immediately after
launch. Parallel agents use `notifyOnFinish: false`, because a finish injection can replace the CTO
turn and is lost on daemon restart. Set it true in exactly one case: a single active agent on the
critical path, where no concurrent turn can be displaced.

## Parallel work — six rules

The budget limits **tasks in flight, not agents**. A task carries as many agents as its review depth
requires: an author, its non-author reviewer, and a third only for a tie-break. Counting agents
instead of tasks makes a Critical atom look twice as expensive as a Routine one.

1. **As many tasks run as have write zones that are pairwise disjoint at file granularity — no
   more.** The ceiling is a limit, never a target.
2. **An overlap is split along its subsystem seam; what will not split becomes a successor.**
   Re-baselining the later atom on the earlier one's accepted `HEAD` is cheaper than resolving a
   conflict by hand, which is never done in a writer's workspace.
3. **A task that changes a canonical contract, a schema or shared infrastructure runs alone.** Every
   other writer waits for its acceptance and re-baselines on it.
4. **A file any participant regenerates deterministically — a lockfile, formatter output, a
   generated index — is not shared ownership**; the CTO regenerates it during integration.
5. **No free review capacity, no new task.** A returned candidate waiting for a reviewer costs the
   same as an unstarted atom and ages worse.
6. **Accepted work integrates immediately, and an empty slot with admissible ready work is a
   defect.** Dispatch the next task first, then retire the finished one; conflict cost grows with
   the square of how long branches sit apart.

Name the wave's independent lanes in its wave file when the wave opens, and attach every new node to
one. A node that fits no lane is split or queued. If the critical path is one chain of dependent
atoms, the honest concurrency is one task plus off-path work; say so in status instead of
dispatching overlapping atoms to look busy.

## Recovering from an agent-daemon restart

A restart of the agent daemon does not preserve running work. Every agent session and the scheduled
heartbeat are gone afterwards, while workspaces, worktrees, branches and commits survive intact.

Recovery costs one re-dispatch per active card plus recreating the heartbeat, provided every
candidate was committed. After a restart, re-issue each active card's contract to a fresh agent in
its preserved workspace, including the findings of any review that had already returned; recreate
the heartbeat; and sweep the scratch directories the dead sessions left outside the repository.

## CTO handover

A new CTO first loads the same `SETTINGS.json`, inventories all project agents regardless of prior
run or CTO, and then adopts or creates runtime state. Preserve the settings revision and charter
snapshot while replacing only CTO, run and heartbeat identity. Do not re-onboard, choose provider
defaults, or reinterpret owner overrides merely because the CTO changed between Claude and Codex.
Conflicting legacy checkpoints are history; Persistent settings defines the migration rule.

## Derived status and stalls

Paseo's native state and project work state differ. Maintain one exact machine-readable derived
status token per agent and reset `stateSince` only when it changes:

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

Idle is not storage: retire the agent unless a specific follow-up or dispute justifies reuse.

An agent session belongs to one plan atom. Reuse the author and reviewer only for bounded response,
rework, and re-review of that same atom. An unrelated atom always starts a fresh session even when
the previous agent is idle; carrying an old conversation into new work spends context on irrelevant
history and increases instruction drift.

Elapsed time alone never proves a stall. Require two consecutive 15-minute snapshots without
meaningful progress, bounded `get_agent_activity(limit: 10–20)`, terminal or background evidence,
and permission, capacity and external-wait checks. Two such snapshots require a CTO decision in that
reconcile: narrow, split, reassign, return, expose the gate, or stop. Do not prompt a genuinely
running turn. For confirmed stalls, preserve Git and workspace state before cancellation.

## One heartbeat, one invariant

Keep exactly one agent-scoped heartbeat while the CTO can still advance in-scope work without a new
owner instruction: any agent `running`, `reviewing`, or `rework`; a pending permission; a verified
background operation; or a recoverable tail with an available action.

Stop it the moment that is false — when the ready frontier is empty and every remaining tail is
**owner-gated**: immutable branch coordinates, a pull trigger needing a new owner instruction, an
accepted plan change, or an external event, with no agent, workspace, permission, review, rework, or
background operation still needing care. In that same turn, persist every tail and the exact resume
trigger, write the final `FLEET.md` render once, and delete the heartbeat with `delete_heartbeat`.
Do not renew it or re-emit an identical scheduled report afterward; a later owner instruction,
accepted plan change, or matching external event starts a fresh reconciliation.

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
preserve tails, retire integrated records, and update plan/runtime. Every fourth run perform the
orphan workspace sweep. Refill only safe capacity from ready plan nodes; never duplicate an existing
task or role. Resolve the loaded plugin base version, CTO model/effort, any trustworthy host context
measurement, session elapsed time, current wave, and accepted/total card counts from preflight,
settings, runtime, plan, and acceptance truth.
Rewrite the durable FLEET.md render unconditionally. In chat, post the full header and fleet table
only when a material event occurred since the last posted snapshot or the owner asked for status;
otherwise post one quiet liveness line (see Status and reporting). Add brief unheaded prose only for
a material event. Never repeat unchanged prose.
```
