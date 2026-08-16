# Paseo command catalog

This is the complete lookup index for uncommon Paseo operations. Routine CTO work uses
[Paseo core commands](paseo-core-commands.md), so do not load this larger file at ordinary skill
startup.

This catalog was checked against Paseo main `c97f823` (`0.2.0-beta.1`). Inspect the available tool
names once at startup. Do not probe for a tool by making speculative write calls, and if a listed
command rejects a documented field, inspect only that command's help and record the delta in the
session checkpoint.

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
| `delete_heartbeat` | `id` | Delete a heartbeat owned by this agent. |
| `create_schedule` | `prompt`, `cron`; optional `provider`, `timezone`, `name`, `cwd`, `isolation`, `maxRuns`, `expiresIn` | Recurring fresh-agent work. Require stable `name`/target, `maxRuns`, and `expiresIn`; never use for the CTO status heartbeat. |
| `list_schedules` | none | Lists new-agent schedules and excludes heartbeats. |
| `inspect_schedule` | `id` | Inspect a new-agent schedule and history. |
| `pause_schedule` / `resume_schedule` | `id` | Pause or resume a schedule. |
| `update_schedule` | `id`, plus changed fields | Update cron/timezone/name/prompt/limits/provider/model/mode/cwd/expiry. |
| `schedule_logs` | `id` | Return run history. |
| `run_schedule_once` | `id` | Trigger without changing cadence. |
| `delete_schedule` | `id` | Permanently delete a new-agent schedule. |

Schedule tools operate on new-agent schedules only; heartbeat management is deliberately separate.
Inspect the known schedule ID and target before mutating it.

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
| `paseo delete` | Hard-delete an exact agent. Use only for a record whose card is integrated under Cleanup and close, or a proven empty, test, corrupt or duplicate record. |
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
| `paseo agent` | `ls`, `run`, `import`, `attach`, `logs`, `stop`, `delete`, `send`, `inspect`, `wait`, `mode`, `archive`, `reload`, `detach`, `update` |
| `paseo workspace` | `create`, `ls`, `archive` |
| `paseo worktree` | `create`, `ls`, `archive` (direct worktree operations) |
| `paseo heartbeat` | `create`, `update`, `delete` (must run inside a Paseo agent) |
| `paseo schedule` | `create`, `ls`, `inspect`, `logs`, `pause`, `resume`, `delete`, `run-once`, `update` |
| `paseo provider` | `ls`, `models` |
| `paseo permit` | `ls`, `allow`, `deny` |
| `paseo terminal` | `ls`, `create`, `kill`, `capture`, `send-keys` |
| `paseo loop` | `run`, `ls`, `inspect`, `logs`, `stop` |
| `paseo chat` | `create`, `ls`, `inspect`, `delete`, `post`, `read`, `wait` |
| `paseo daemon` | `start`, `pair`, `status`, `stop`, `restart`, `set-password` |
| `paseo hub` | `connect`, `status`, `disconnect` |
| `paseo speech` | Reserved empty group in the checked version; no subcommands. |

### Recovery recipes

Resolve labels and exact IDs before every mutation:

```bash
paseo ls --global --label paseo-cto.project=<project> --json
paseo inspect <agent-id> --json
paseo logs <agent-id> --tail 20
paseo wait <agent-id> --timeout 60 --json
paseo archive <exact-agent-id> --json
```

Delete only the recorded heartbeat ID:

```bash
paseo heartbeat delete <heartbeat-id> --json
```

After the cleanup proof in Cleanup and close, archive only the exact returned worktree name:

```bash
paseo worktree archive <exact-worktree-name> --json
```

## Non-negotiable safety

- Never restart or stop the daemon without explicit owner approval; it can terminate the entire
  active fleet.
- Never use bulk delete, broad `--cwd` deletion, unresolved globs, or `kill_agent` for routine
  cleanup.
- `archive_workspace` can stop agents and terminals and remove a managed working copy. Run the
  cleanup proof in Cleanup and close first.
- A command being available does not grant authority. Project and founder gates still apply.
