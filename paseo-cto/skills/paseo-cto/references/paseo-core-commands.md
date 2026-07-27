# Paseo core commands

Read this compact reference before routine fleet mutation. It covers the current Paseo API only
(`0.2`, checked against main `c97f823` / `0.2.0-beta.1`). Older-daemon `0.1.x` shapes, the full tool
and CLI index, and recovery recipes live in the [command catalog](paseo-command-catalog.md); load it
only for an operation not covered here or a failed compatibility branch.

At startup, inspect the available tool names once and confirm you are on the current API
(`create_workspace`/`list_workspaces`/`archive_workspace` and `delete_heartbeat` exist). If they do
not, switch to the catalog's compatibility branch. Never mix branches, and never probe by making
speculative write calls.

## Resolve provider settings first

Before any launch, resolve provider/model/reasoning/`modeId` with `list_providers`, scoped
`list_models`, and `inspect_provider`. Passing `settings.modeId` on every `create_agent` is mandatory.

## Create isolated work

```text
create_workspace({isolation:"worktree", path:<repo>, mode:"branch-off",
  worktreeSlug:<slug>, branchName:<branch>, baseBranch:<exact-SHA>})
create_agent({workspaceId:<id>, title:<max-60>, provider:<provider/model>,
  initialPrompt:<contract>, notifyOnFinish:false, labels:<string-map>,
  settings:{modeId:<inspected-role-mode>, thinkingOptionId?:<inspected-effort>}})
```

Persist the workspace ID immediately after creation and the agent ID and labels immediately after
launch. Use `notifyOnFinish:false` for parallel agents; set it true only when deliberately awaiting one
agent alone.

## Routine reconciliation

- Global recovery: `paseo ls --global --label paseo-cto.project=<project> --json`.
- Workspaces: `list_workspaces`.
- One agent: `get_agent_status`; recent evidence: `get_agent_activity(limit:10–20)`; bounded CLI
  fallback: `paseo logs <id> --tail 20`.
- Permissions: `list_pending_permissions`, then `respond_to_permission` only within authority.
- Long processes: `list_terminals` and `capture_terminal`; never interrupt merely for inspection.
- Idle follow-up/rework: `send_agent_prompt`; sending to a running agent replaces its turn.

## Heartbeat and cleanup

Create the CTO heartbeat inside the CTO agent with a stable name, `*/15 * * * *`, `maxRuns:96`, and
`expiresIn:24h`; persist its ID and delete it with `delete_heartbeat`. Archive only exact
agents/workspaces after the cleanup proof in Cleanup and close. Never restart the daemon,
bulk-delete, or routinely use `kill_agent`.
