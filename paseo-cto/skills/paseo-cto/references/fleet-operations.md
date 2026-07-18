# Fleet operations

Read this file before creating, recovering, monitoring, archiving, or reporting a fleet.

## Preflight and state

`operate` requires the CTO to be an agent-scoped Paseo session (`PASEO_AGENT_ID` or equivalent
caller identity). Outside Paseo, allow only inspection/status and explain how to start or hand off to
a Paseo CTO; do not create agents, workspaces, or a heartbeat.

Bind project root/plan, integration branch and accepted `HEAD`, CTO/project/run IDs, charter, owner
gates, capacity, and heartbeat. Capacity counts external agents only. Keep plan/charter in Git and
volatile state at the canonical absolute path defined by Execution plan:

```text
$(git rev-parse --git-common-dir)/paseo-cto/<run>.json
```

Resolve the common directory before use; never clean an unresolved or broad path. Persist after each
lifecycle mutation and commit plan changes before dispatch/material gates so integration stays
clean.

## Reconcile before creation

Reconcile on startup, resume, context recovery, every heartbeat, and material events. On startup,
recovery, and every fourth heartbeat (about hourly), also run an orphan sweep:

1. Read plan, accepted Git state, and runtime checkpoint.
2. Inventory agents with `paseo ls --global --json`. Match the project first,
   regardless of run, then partition by `paseo-cto.run`; adopt or resolve prior-run work before new
   work on the same task.
3. On the current API use `list_workspaces`. On `0.1.x`, call
   `list_worktrees({cwd:<each bound or discovered project root>})`; derive further paths from global
   agent inventory. Never use `paseo worktree ls --json` as a global inventory command.
4. Inspect known IDs/permissions and match each owned record to its plan node, lifecycle owner, Git
   state, evidence, and review state.
5. Process returned results before dispatch. Detect duplicates, errors, suspected stalls, stranded
   workspaces, archived-agent workspaces, and dirty/unintegrated/unknown tails.
6. Persist runtime state, commit any durable plan correction, then rebuild the ready frontier.

Routine cycles may scope by project/run labels, but the hourly sweep must catch unlabeled crash
tails. Never mutate an unlabeled or foreign record without proving ownership. Never create a
duplicate for a task/role already `running`, `waiting`, `reviewing`, or `rework` in any run.

`paseo-cto.parent` identifies the sole lifecycle owner. The CTO displays lead descendants in the
global table but does not prompt, return, integrate, or archive lead-owned children until the lead
explicitly hands them over or escalates. Record handover in runtime state before changing ownership.

## Create isolated work

Choose one branch from Paseo core commands:

- current: `create_workspace`, then `create_agent(workspaceId)`;
- `0.1.x`: `create_worktree`, then legacy `create_agent(relationship, workspace)`.

Freeze an exact baseline and use plan-aligned branch/workspace names. Persist the workspace
immediately after creation, then the agent ID and labels immediately after launch.

Parallel agents use `notifyOnFinish: false`: current finish injection can replace the CTO turn and
is lost on daemon restart. It may be true only when deliberately awaiting one agent alone.

## Derived status and stalls

Paseo's native state and project work state differ. Maintain one English derived status and reset
`stateSince` only when it changes:

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

`Time` is time in this state, not total task duration. After recovery without reliable
`stateSince`, use the closest timestamp and prefix `~`. Idle is not storage: archive unless a
specific follow-up or dispute justifies reuse. A lead with active children is `waiting`, not done.

Elapsed time alone never proves a stall. Require two consecutive 15-minute snapshots without
meaningful progress, bounded `get_agent_activity(limit: 10–20)`, terminal/background evidence, and
permission/capacity/external-wait checks. Do not prompt a genuinely running turn. For confirmed
stalls, preserve Git/workspace state before cancellation; prefer reuse or replacement in the same
workspace over discarding work.

## Fifteen-minute heartbeat and table

Keep one agent-scoped heartbeat while work, review, a recoverable wait, or a tail remains:

```text
name: paseo-cto:<project>:<cto-short-id>
cron: */15 * * * *
maxRuns: 96
expiresIn: 24h
```

Store its ID; stable name plus target is idempotent. Renew deliberately. Delete with current
`delete_heartbeat` or compatibility `delete_schedule`. On collision with an active CTO turn, report
at the nearest idle boundary; the next interval catches up.

Use this exact prompt, filling absolute paths and IDs:

```text
PASEO CTO RECONCILIATION
Project root: <absolute-root>
Plan: <absolute-plan-path>
Project/run: <project>/<run>
CTO/runtime: <cto-id>/<absolute-runtime-json>
Read plan and runtime state. Reconcile project agents globally, process returns and permissions,
derive states/stateSince and LOC, diagnose evidence-backed stalls, preserve tails, perform safe
archival, and update plan/runtime. Every fourth run perform the orphan workspace sweep. Refill
only safe capacity from ready plan nodes; never duplicate or mutate lead-owned descendants. Emit
the exact English summary and five-column table required by Fleet operations, with CTO first.
```

Emit immediately after material changes as well as on the timer:

```markdown
Status <YYYY-MM-DD HH:MM TZ> | Active <N> | Review <N> | Stalled <N> | Archived <N> | Tails <N>

| Agent | Task | Status | Time | LOC |
| --- | --- | --- | --- | --- |
| `cto-claude` | Review authentication integration | `reviewing` | 8m | — |
| `A-14-gpt-builder` | Complete storage API path | `running` | 18m | +2.4k -36 |
| `A-15-claude-researcher` | Verify startup dependency chain | `blocked` | 12m | — |
```

The summary counts external agents; CTO is excluded. `Archived` is cleanup since the prior report;
`Tails` is preserved state needing action. Use exactly `Agent | Task | Status | Time | LOC`; names
encode provider/role, tasks stay plan-aligned, and surrounding prose stays in the owner's language.

`LOC` is the current textual line delta for that task/workspace against its recorded baseline,
computed from numeric `git diff --numstat <baseline> --` totals and abbreviated (`+2.4k -36`). It is
a snapshot while work is running and exact after the returned commit. Binary and untracked files do
not silently enter the count; report them as a tail or artifact. Use `—` for report-only agents or
when no code delta applies. For the CTO, show the delta of its current bounded change; otherwise
use `—`. Do not sum rows because lead and child diffs may overlap.

## Archive and close

Run the Review gate first. Returned work remains `reviewing` or `rework`; keep its originating
agent/workspace through unresolved findings or disputes.

Before archival:

1. Capture report, IDs, Git state/commits, decision, and archive-surviving evidence as required by
   the Assignment contract and Review gate.
2. Require empty `git status --porcelain` and prove accepted commits reachable from integration,
   unless an explicit preservation/discard decision is recorded. A report-only reviewer/researcher
   may close earlier when pre/post Git states match and its source commit remains reachable from a
   preserved builder branch.
3. Require no running turn, unresolved permission, dispute, needed terminal, or unrecorded tail.
   Normal closure is idle/done. A native `error` or `closed` record may also close after diagnosis,
   state preservation, and a recorded retry/replace/discard decision.
4. Archive the exact agent, verify removal, then archive the exact workspace/worktree and verify
   again. Update runtime/plan and increment `Archived`.

Workspace archival may stop every agent/terminal there and remove the worktree. Dirty, unintegrated,
disputed, or unknown states remain visible tails. Hard-delete only a proven empty, test, corrupt, or
duplicate exact record; never use bulk delete or routine `kill_agent`.

Before context compaction, persist runtime and durable plan truth. Never archive the CTO while child
work, disputes, or unintegrated tails remain. At clean close, resolve or preserve every result,
emit a final table, delete the heartbeat, record the exact resume point, then allow CTO archival.
