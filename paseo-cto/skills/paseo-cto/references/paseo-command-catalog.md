# Paseo command catalog

This is the complete lookup index for uncommon Paseo operations and compatibility recovery. Routine
CTO work uses [Paseo core commands](paseo-core-commands.md), so do not load this larger file at
ordinary skill startup.

This catalog was checked against Paseo main `c97f823` (`0.2.0-beta.1`) and the installed daemon
`0.1.110` compatibility surface that predates workspace commands. At startup, inspect the available
tool names once and choose the matching branch. Do not probe compatibility by making speculative
write calls.

## Compatibility branch (older daemon `0.1.x`)

The current-API creation and reconciliation shapes are in [Paseo core commands](paseo-core-commands.md).
The `0.1.110` daemon predates workspace commands; choose the branch by actual tool availability and
never mix branches within a run.

| Operation | Current `0.2` | Compatibility `0.1.x` |
| --- | --- | --- |
| Create/list/archive isolation | `create/list/archive_workspace` | `create/list/archive_worktree` |
| Create child | `create_agent(workspaceId)` | `create_agent(relationship, workspace)` |
| Cancel run | `cancel_agent` | `paseo stop <id> --json` if no tool |
| Delete CTO heartbeat | `delete_heartbeat` | `delete_schedule` |

Compatibility creation:

```text
agentTitle = <derived `<plan-id>-<family>-<role>`>
create_worktree({cwd:<repo>, target:{kind:"branch-off", worktreeSlug:<agentTitle>,
  branchName:<branch>, baseBranch:<exact-SHA>}})
verify returned worktree name == agentTitle
create_agent({relationship:{kind:"subagent"},
  workspace:{kind:"existing", workspaceId:<id>}, title:<agentTitle>,
  provider:<provider/model>, initialPrompt:<contract>, notifyOnFinish:false,
  labels:<string-map>, settings:{modeId:<inspected-role-mode>,
  thinkingOptionId?:<inspected-effort>}})
```

The compatibility API has no separate workspace-title field, so `worktreeSlug` is the workspace
name and must equal the agent title exactly. Do not launch the agent if inventory reports another
name.

For `0.1.x` workspace inventory use `list_worktrees({cwd:<known-project-root>})` for every known root;
`paseo worktree ls --json` is not a global inventory command and may fail without repository context.

## Complete agent-scoped MCP catalog

Inputs below list the operational fields an orchestrator normally needs. Use the tool's exposed
schema only when an uncommon optional field is required.

### Voice and workspaces

| Tool | Main input | Purpose and constraint |
| --- | --- | --- |
| `speak` | `text` | Optional voice output; available only when voice tools are enabled. |
| `create_workspace` | `isolation`, plus `path/projectId/title/mode/worktreeSlug/branchName/baseBranch/branch/prNumber/forge` | Create local or worktree workspace. Set `title` to the exact derived agent title and prefer exact SHA as `baseBranch`. |
| `list_workspaces` | none | List active workspaces. |
| `rename_workspace` | `title`, optional `workspaceId` | Rename current or named workspace. |
| `archive_workspace` | `workspaceId` | Archives the workspace, every owned agent/terminal, and possibly removes the managed worktree. Use only after cleanup proof. |

Compatibility-only tools use `create_worktree`, `list_worktrees`, and `archive_worktree`; their
routine create shape is in Paseo core commands; uncommon fields remain in the exposed tool schema.

### Agents

| Tool | Main input | Purpose and constraint |
| --- | --- | --- |
| `create_agent` | `title`, `provider`, `initialPrompt`; optional `workspaceId`, `notifyOnFinish`, `labels`, `settings` | Create a child in an agent-scoped session. Use split workspace creation so its ID can be labeled, and require its `title` to equal the workspace title exactly. |
| `send_agent_prompt` | `agentId`, `prompt`; optional `sessionMode`, `background`, `notifyOnFinish` | Follow up or return rework. Sending into a running agent replaces its turn; do so only deliberately. |
| `get_agent_status` | `agentId` | Return current snapshot and pending permissions for one known ID. |
| `list_agents` | optional `includeArchived`, `cwd`, `sinceHours`, `statuses`, `limit` | Compact list. Agent-scoped calls default to caller `cwd`; use known IDs or global CLI recovery for worktrees elsewhere. |
| `get_agent_activity` | `agentId`, optional `limit` | Curated timeline. Always begin with `limit: 10–20`; omission can return the entire history. |
| `cancel_agent` | `agentId` | Abort only the current run and keep the session reusable. Preserve state first. |
| `archive_agent` | `agentId` | Soft-delete from active list; interrupts if running. Normal cleanup only after review/result capture. |
| `kill_agent` | `agentId` | Permanently terminate the session. Never routine cleanup. |
| `update_agent` | `agentId`; optional `name`, `labels`, `settings` | Change title/labels/model/mode/reasoning/features. Do not store derived status in labels. |
| `set_agent_mode` | `agentId`, `modeId` | Switch provider permission/session mode. Prefer `update_agent` when changing several settings. |

Native agent statuses are `initializing`, `idle`, `running`, `error`, and `closed`. CTO table states
such as `waiting`, `blocked`, `reviewing`, `rework`, and `stalled` are derived and must not be passed
back as native filters.

### Workspace terminals

| Tool | Main input | Purpose and constraint |
| --- | --- | --- |
| `list_terminals` | optional `cwd` or `all` | List terminal sessions. Use during long-command and cleanup checks. |
| `create_terminal` | optional `cwd`, `name` | Create a persistent workspace terminal. |
| `capture_terminal` | `terminalId`; optional `start`, `end`, `scrollback`, `stripAnsi` | Read terminal output without sending input. |
| `send_terminal_keys` | `terminalId`, `keys`; optional `literal` | Send text or special keys. Treat as a state-changing action. |
| `kill_terminal` | `terminalId` | Terminate a terminal after proving it is no longer needed. |

### Heartbeats and schedules

| Tool | Main input | Purpose and constraint |
| --- | --- | --- |
| `create_heartbeat` | `prompt`, `cron`; optional `timezone`, `name`, `maxRuns`, `expiresIn` | Recurring prompt to the current CTO. Always use a stable name, TTL, and run limit. |
| `delete_heartbeat` | `id` | Delete a current-API heartbeat owned by this agent. |
| `create_schedule` | `prompt`, `cron`; `provider` required top-level and in `0.1.x`, optional agent-scoped only on current API; optional `timezone`, `name`, `cwd`, current-API `isolation`, `maxRuns`, `expiresIn` | Recurring fresh-agent work. Require stable `name`/target, `maxRuns`, and `expiresIn`; do not use for the CTO status heartbeat. |
| `list_schedules` | none | Current API lists new-agent schedules and excludes heartbeats; `0.1.x` may include both target types. |
| `inspect_schedule` | `id` | Inspect a new-agent schedule and history. |
| `pause_schedule` | `id` | Pause a schedule. |
| `resume_schedule` | `id` | Resume a schedule. |
| `update_schedule` | `id`, plus changed fields | Update cron/timezone/name/prompt/limits/provider/model/mode/cwd/expiry. |
| `schedule_logs` | `id` | Return run history. |
| `run_schedule_once` | `id` | Current MCP trigger without changing cadence; use CLI `paseo schedule run-once` when older MCP omits it. |
| `delete_schedule` | `id` | Permanently delete a new-agent schedule; in `0.1.x`, also use for the known heartbeat ID. |

On the current API, `list/inspect/pause/resume/update/logs/run-once/delete` schedule tools operate on
new-agent schedules; heartbeat management is deliberately separate. In `0.1.x`, the schedule group
may also expose heartbeat targets. Inspect the known schedule ID/target before mutating it.

### Providers and permissions

| Tool | Main input | Purpose and constraint |
| --- | --- | --- |
| `list_providers` | none | Compact availability and modes. Call once during charter/preflight. |
| `list_models` | `provider` | Full model IDs and reasoning options for one provider. Do not call for unrelated providers. |
| `inspect_provider` | `provider`; optional `cwd`, `settings` | Validate a proposed model/mode/reasoning/features tuple. Use only returned feature IDs. |
| `list_pending_permissions` | none | List pending permission requests across agents. Reconcile before classifying a stall. |
| `respond_to_permission` | `agentId`, `requestId`, `response` | Approve or deny within owner/project authority. Never infer authority for a gated action. |

Optional browser tools may be injected by Paseo configuration. They are not lifecycle commands and
do not alter this catalog.

## Complete CLI command index

Use MCP tools for normal orchestration. Use the CLI for global recovery, exact-ID inspection, JSON
evidence, or a command absent from the installed MCP version. Add `--json` only when that command
exposes it; streaming commands such as `attach` and `logs` do not. Resolve exact IDs before mutation.

### Top-level

| Command | Purpose |
| --- | --- |
| `paseo ls` | List agents; use `--global` and label filters for cross-workspace recovery. |
| `paseo run` | Create/start an agent. |
| `paseo import` | Import an existing provider session. |
| `paseo clone` | Clone and register a repository workspace. |
| `paseo attach` | Stream an agent's output; blocking, never use for periodic reconciliation. |
| `paseo logs` | Read a bounded snapshot with `--tail <N>`; `--follow` is blocking. |
| `paseo stop` | Interrupt the current run without deleting the agent. |
| `paseo delete` | Hard-delete an exact agent; destructive and exceptional. |
| `paseo send` | Send a follow-up task. |
| `paseo inspect` | Inspect exact agent metadata. |
| `paseo wait` | Wait for an agent to become idle; always supply `--timeout`. |
| `paseo archive` | Soft-delete an exact agent. |
| `paseo onboard` | First-time setup. |
| `paseo start` | Start the daemon. |
| `paseo status` | Daemon status shortcut. |
| `paseo restart` | Restart daemon; never call without explicit owner approval. |
| `paseo hooks` | Record provider hook activity. |

### Command groups

| Group | Subcommands |
| --- | --- |
| `paseo agent` | `ls`, `run`, `import`, `attach`, `logs`, `stop`, `delete`, `send`, `inspect`, `wait`, `mode`, `archive`, `reload`, current-API `detach`, `update` |
| `paseo workspace` | `create`, `ls`, `archive` |
| `paseo worktree` | `create`, `ls`, `archive` (compatibility and direct worktree operations) |
| `paseo heartbeat` | `create`, `update`, `delete` (must run inside a Paseo agent) |
| `paseo schedule` | `create`, `ls`, `inspect`, `logs`, `pause`, `resume`, `delete`, `run-once`, `update` |
| `paseo provider` | `ls`, `models` |
| `paseo permit` | `ls`, `allow`, `deny` |
| `paseo terminal` | `ls`, `create`, `kill`, `capture`, `send-keys` |
| `paseo loop` | `run`, `ls`, `inspect`, `logs`, `stop` |
| `paseo chat` | `create`, `ls`, `inspect`, `delete`, `post`, `read`, `wait` |
| `paseo daemon` | `start`, `pair`, `status`, `stop`, `restart`, `set-password` |
| `paseo hub` | `connect`, `status`, `disconnect` |
| `paseo speech` | Reserved empty group in the checked versions; no subcommands. |

Installed `0.1.110` has no `workspace`, `heartbeat`, or `hub` CLI groups and no `agent detach`;
`worktree` replaces `workspace`, the full schedule group remains, `create_heartbeat` exists in MCP,
and a heartbeat is deleted through `delete_schedule`. Choose by actual command/tool availability;
do not rerun every `--help` on each session. If a listed command rejects a documented field, inspect
only that command's help, record the compatibility delta in the session checkpoint, and continue
without scanning the source tree.

### Recovery recipes

Resolve labels and exact IDs before every mutation:

```bash
paseo ls --global --label paseo-cto.project=<project> --json
paseo inspect <agent-id> --json
paseo logs <agent-id> --tail 20
paseo wait <agent-id> --timeout 60 --json
paseo archive <exact-agent-id> --json
```

Delete only the recorded heartbeat ID. Use the group exposed by the installed CLI:

```bash
paseo heartbeat delete <heartbeat-id> --json
paseo schedule delete <compatibility-heartbeat-id> --json
```

For `0.1.x` worktree recovery use MCP `list_worktrees({cwd:<known-project-root>})`; `paseo worktree
ls --json` is not a global inventory command and may fail without repository context. After the
cleanup proof in Cleanup and close, archive only the exact returned worktree name:

```bash
paseo worktree archive <exact-worktree-name> --json
```

## Non-negotiable safety

- Never restart or stop the daemon without explicit owner approval; it can terminate the entire
  active fleet.
- Never use bulk delete, broad `--cwd` deletion, unresolved globs, or `kill_agent` for routine
  cleanup.
- `archive_workspace`/`archive_worktree` can stop agents and terminals and remove a managed working
  copy. Run the cleanup proof in Cleanup and close first.
- A command being available does not grant authority. Project and founder gates still apply.
