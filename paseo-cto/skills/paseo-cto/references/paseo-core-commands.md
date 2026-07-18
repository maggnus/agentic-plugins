# Paseo core commands

Read this compact reference before routine fleet mutation. Use the
[complete catalog](paseo-command-catalog.md) only for an operation not covered here or a failed
compatibility branch. The mappings were checked against Paseo main `c97f823` (`0.2.0-beta.1`) and
installed daemon `0.1.110`.

## Choose one lifecycle branch

| Operation | Current `0.2` | Compatibility `0.1.x` |
| --- | --- | --- |
| Create/list/archive isolation | `create/list/archive_workspace` | `create/list/archive_worktree` |
| Create child | `create_agent(workspaceId)` | `create_agent(relationship, workspace)` |
| Cancel run | `cancel_agent` | `paseo stop <id> --json` if no tool |
| Delete CTO heartbeat | `delete_heartbeat` | `delete_schedule` |

Never mix branches. Resolve provider/model/reasoning/`modeId` with
`list_providers`, scoped `list_models`, and `inspect_provider` before launch.

Current creation:

```text
create_workspace({isolation:"worktree", path:<repo>, mode:"branch-off",
  worktreeSlug:<slug>, branchName:<branch>, baseBranch:<exact-SHA>})
create_agent({workspaceId:<id>, title:<max-60>, provider:<provider/model>,
  initialPrompt:<contract>, notifyOnFinish:false, labels:<string-map>,
  settings:{modeId:<inspected-role-mode>, thinkingOptionId?:<inspected-effort>}})
```

Compatibility creation:

```text
create_worktree({cwd:<repo>, target:{kind:"branch-off", worktreeSlug:<slug>,
  branchName:<branch>, baseBranch:<exact-SHA>}})
create_agent({relationship:{kind:"subagent"},
  workspace:{kind:"existing", workspaceId:<id>}, title:<max-60>,
  provider:<provider/model>, initialPrompt:<contract>, notifyOnFinish:false,
  labels:<string-map>, settings:{modeId:<inspected-role-mode>,
  thinkingOptionId?:<inspected-effort>}})
```

## Routine reconciliation

- Global recovery: `paseo ls --global --label paseo-cto.project=<project> --json`.
- Workspaces: current `list_workspaces`; compatibility
  `list_worktrees({cwd:<known-project-root>})` for every known root.
- One agent: `get_agent_status`; recent evidence: `get_agent_activity(limit:10–20)`; bounded CLI
  fallback: `paseo logs <id> --tail 20`.
- Permissions: `list_pending_permissions`, then `respond_to_permission` only within authority.
- Long processes: `list_terminals` and `capture_terminal`; never interrupt merely for inspection.
- Idle follow-up/rework: `send_agent_prompt`; sending to a running agent replaces its turn.

Create the CTO heartbeat inside the CTO agent with stable name, `*/15 * * * *`, `maxRuns:96`, and
`expiresIn:24h`; persist its ID. Archive only exact agents/workspaces after the Fleet operations
proof. Never restart the daemon, bulk-delete, or routinely use `kill_agent`.
