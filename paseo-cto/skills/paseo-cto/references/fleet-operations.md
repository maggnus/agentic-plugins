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
2. Inventory agents across **every working copy**, not from the integration root alone. Agent
   listings are scoped by working directory, and workers live in their own copies — queried from the
   root, a busy fleet reads as empty, and an empty reading is what produces a duplicate agent on a
   task someone is already building, sometimes inside the live builder's own copy. Enumerate the
   workspaces first, then query per copy, and reconcile the union against runtime. Use the global,
   label-filtered form and treat any inventory that returns nothing as unproven until a second
   reading confirms it.
3. List workspaces with `list_workspaces` (older-daemon fallback in the command catalog).
4. Inspect known IDs/permissions and match each owned record to its plan node, Git state, evidence,
   and review state. Derive each owned agent's expected title from its labels and rename the agent
   on mismatch. Require its recorded workspace to have that same title; on the current API, correct
   a mismatch with `rename_workspace` before the workspace is reused. Names follow the single
   derived format in Roles and providers.
5. **Collect finished work as a step, not as a by-product.** An agent that completed does not
   announce it; its report sits until someone fetches it. For every recorded agent not currently
   running, fetch and read the return in this reconcile, then move the card to `reviewing` or record
   why it cannot move. A ready result left uncollected costs the whole interval it waits, and
   survives a CTO handover unnoticed because nothing in the fleet state says a report exists.
6. Process returned results before dispatch. Detect duplicates, errors, suspected stalls, stranded
   or archived-agent workspaces, and dirty/unintegrated/unknown tails.
7. Persist runtime state, commit any durable plan correction, then rebuild the ready frontier.

### Turn-start check

Agents do not announce completion; the CTO discovers it. Because a full reconcile runs only on the
heartbeat and material events, begin **every** CTO turn with the cheap check instead: pending
permissions plus the status of the agents already recorded in runtime. A non-running agent means a
report is waiting — fetch it in that turn rather than noting the status and moving on. A turn happens whenever the
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

Freeze an exact baseline and use a plan-aligned branch name. Derive the agent title before creating
its workspace, and use that exact string as the workspace title:

- `create_workspace(title:<derived-agent-title>)`, verify the returned workspace title, then
  `create_agent(workspaceId, title:<the-same-derived-agent-title>)`;
- on the older daemon, use the derived agent title as `worktreeSlug`, verify the created worktree
  name, then use the same title in the legacy `create_agent` call. The complete compatibility
  shapes are in the command catalog.

This equality is strict. Do not launch an agent when its newly created workspace has a different
title, and do not decorate either name with a workspace suffix, run ID, or descriptive text.

**Always branch off an exact SHA into a new branch name.** Pointing a new workspace at a branch that
already exists moves that branch into the new working copy, and the tree that held it is left
standing on whatever the tool put there — commonly an unrelated branch, carrying the uncommitted
work that was in progress. The damage is silent: the integration tree still looks like a checkout,
and the mismatch surfaces later as a commit on the wrong branch or a lost edit.

The safe order, before creating any workspace: confirm the integration tree is clean, record the
exact baseline SHA, choose a branch name no working copy currently holds, and create the workspace
in branch-off mode from that SHA. To hand an existing branch to an agent, verify no other copy has
it checked out first, and re-verify the integration tree's branch and cleanliness immediately after
the workspace exists.

Persist the workspace immediately after creation, then the agent ID and labels immediately after
launch. Parallel agents use `notifyOnFinish: false`: a finish injection can replace the CTO turn and
is lost on daemon restart. Set it true in exactly one case — a single active agent sitting on the
critical path, where there is no concurrent turn to displace and the finish is the next thing the
CTO needs. With more than one agent in flight the flag stays false and the turn-start check plus the
heartbeat carry discovery.

## Parallel work — six rules

The budget limits **tasks in flight, not agents**. A task carries as many agents as its review depth
requires: an author, its non-author reviewer, and a third only when a disputed finding needs a
tie-break. Counting agents instead of tasks makes a Critical atom look twice as expensive as a
Routine one and pushes the fleet toward whichever work is cheapest to count.

1. **As many tasks run as have write zones that are pairwise disjoint at file granularity — no
   more.** The ceiling is a limit, never a target, and an idle slot costs nothing while nothing can
   occupy it.
2. **An overlap is split along its subsystem seam; what will not split becomes a successor.**
   Re-baselining the later atom on the earlier one's accepted `HEAD` is cheaper than resolving a
   conflict by hand, which is never done in a writer's workspace.
3. **A task that changes a canonical contract, a schema or shared infrastructure runs alone.** Every
   other writer waits for its acceptance and re-baselines on it.
4. **A file any participant regenerates deterministically — a lockfile, formatter output, a
   generated index — is not shared ownership**; the CTO regenerates it during integration. Shared
   ownership means an artifact whose downstream is maintained by hand.
5. **No free review capacity, no new task.** A returned candidate waiting for a reviewer costs the
   same as an unstarted atom and ages worse, so the review queue outranks a further dispatch.
6. **Accepted work integrates immediately, and an empty slot with admissible ready work is a
   defect.** Dispatch the next task first, then archive the finished one; conflict cost grows with
   the square of how long branches sit apart.

Name the wave's independent lanes in its wave file when the wave opens, and attach every new node to
one. A node that fits no lane is split or queued, which is what keeps a finding discovered mid-review
from landing inside a running writer's zone. If the critical path is one chain of dependent atoms,
the honest concurrency is one task plus off-path work that touches nothing on that chain; say so in
status instead of dispatching overlapping atoms to look busy.

## Recovering from an agent-daemon restart

A restart of the agent daemon does not preserve running work. Measured: every agent session and the
scheduled heartbeat are gone afterwards, while workspaces, worktrees, branches and commits survive
intact. Plan around losing every session, not only the turn in flight.

Recovery therefore costs one re-dispatch per active card plus recreating the heartbeat, and nothing
more — provided every candidate was committed. That proviso is the method's existing rule doing its
job: a writer commits locally, so a restart costs the contract, never the code.

After a restart, re-issue each active card's contract to a fresh agent in its preserved workspace,
including the findings of any review that had already returned; recreate the heartbeat; and sweep the
scratch directories the dead sessions left outside the repository.

## CTO handover

A new CTO first loads the same `SETTINGS.json`, inventories all project agents regardless of prior
run or CTO, and then adopts or creates runtime state. Preserve the settings revision and charter
snapshot while replacing only CTO/run/heartbeat identity. Do not re-onboard, choose provider
defaults, or reinterpret owner overrides merely because the CTO changes between Claude and Codex.
Conflicting legacy checkpoints are history; Persistent settings defines the migration and dispute
rule.

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

Idle is not storage: archive unless a specific follow-up or dispute justifies reuse.

An agent session belongs to one plan atom. Reuse the author and reviewer only for bounded response,
rework, and re-review of that same atom, where retained context prevents duplicate inspection. An
unrelated atom always starts a fresh session even when the previous agent is idle; carrying an old
conversation into new work spends context on irrelevant history and increases instruction drift.
Archive the old session after its cleanup proof instead of repurposing it.

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
exact resume trigger, write the final `FLEET.md` render once, and delete the heartbeat (current
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
or role. Resolve the loaded plugin base version, CTO model/effort, any trustworthy host context
measurement, session elapsed time, current wave, and accepted/total card counts from preflight,
settings, runtime, plan, and acceptance truth.
Rewrite the durable STATUS render unconditionally, then post its identity/current-wave header and
complete fleet table to chat on every run, even when unchanged. Add brief unheaded prose only for a
material event — a landing decision, a new risk or constraint, a changed critical path, or something
the owner must act on. Never repeat unchanged prose.
```
