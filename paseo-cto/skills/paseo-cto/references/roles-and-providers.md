# Roles and provider policy

Read this file before choosing a role, provider, model, permission mode, name, or labels.

## Provider preflight

The CTO may run in Codex or Claude; role authority and acceptance do not change by provider. Before
dispatch, for each selected worker family:

1. call `list_providers`, then `list_models` only when exact `codex` or `claude` IDs are needed;
2. require `paseo-cto` to be installed and enabled in that worker environment: verify with
   `codex plugin list` for Codex or `claude plugin list` for Claude;
3. call `inspect_provider`, validate the model/reasoning tuple, and resolve an exact `modeId`;
4. validate provider, model, reasoning, and `modeId` against the persistent charter; store newly
   resolved role modes in its `modeMap`, then record the settings revision and snapshot in runtime.

Do not dispatch to a family whose plugin or selected tuple is unavailable. Do not ask a worker to
discover or install the plugin. Preserve an existing failed agent and workspace as `waiting`; a
provider/model change requires a charter change, never a silent fallback.

All workers are separate Paseo provider sessions, visible and archivable in Paseo. Do not delegate
through the host's in-chat subagent facility. Repository writers never share a mutable workspace;
Claude Designers never share a Claude Design project/file write zone.

Before the first Claude Designer dispatch for a provider/runtime version, require the Claude family
and verify `claude-design` is connected at `https://api.anthropic.com/v1/design/mcp` in the Claude
worker environment. Treat the capability as verified only when runtime evidence records an actual
project read plus a reversible write/read/render/delete probe; a successful-looking login command is
insufficient. Reuse that proof until authentication, provider, runtime version, or observed behavior
changes. Until the direct Codex route passes the same round trip, a Codex CTO dispatches this role to
a Claude worker; it does not use a GPT worker or ask the owner to repeat `codex mcp login`.

These four owner-approved rules replace only the corresponding generic Paseo defaults for an
explicitly invoked Paseo CTO run:

- use the accepted operating charter, not `~/.paseo/orchestration-preferences.json`, for models;
- set `notifyOnFinish: false` for parallel agents until the platform issue is fixed;
- run the bounded 15-minute reconciliation defined by the CTO lifecycle, not ad-hoc polling;
- agent permission requests are the CTO's to resolve, never the owner's. Check
  `list_pending_permissions` at the start of every turn and every reconcile, and `respond_to_permission`
  immediately within authority — never leave a request sitting for the owner to answer or let it stall
  an agent until the next heartbeat. Routine build/read/in-worktree approvals (dependency fetch for a
  gate, a file change inside the agent's own worktree) the CTO grants or denies itself; only a genuine
  owner-gate (push, deploy, publication, live mutation, money, secrets, schema, irreversible action)
  is ever escalated to the owner. An agent that requests a write outside its worktree or write zone is
  out of scope: deny with `interrupt: true` and return it to its contract.

Retain every other base Paseo safety rule.

## Models and permission policy

Verify IDs at runtime because catalogs can change:

| Family | Preferred order | Default reasoning |
| --- | --- | --- |
| GPT | `codex/gpt-5.6-sol`, then `codex/gpt-5.6-terra` | `xhigh` (reviewer `max`) |
| Claude | `claude/claude-opus-4-8[1m]`, then `claude/claude-opus-4-8` | `xhigh` (reviewer `max`) |

Use the persistent charter's selected tuple. By owner directive 2026-07-20, the reviewer role runs at
`max` — the quality gate gets the top tier — and every other role (builder, claude-designer,
researcher, lead) defaults to `xhigh`. `ultra`, fast modes, or any tier below these require explicit
owner or binding project authorization.

Pass `create_agent.settings.modeId` on every launch; it is mandatory. Resolve its exact value from
`inspect_provider` rather than hard-coding provider names. By owner directive 2026-07-20 the default
policy is `full-access-writers`: agents launch with full permissions so they never stall on permission
prompts. Repository writers still commit locally and never push; Claude Designers never mutate the
repository and use only their contracted external-design zone.

- `full-access-writers` (default): builder/lead/claude-designer use the selected
  full-access/bypass mode. Reviewers and researchers keep the strongest read-only or plan mode where
  the provider enforces one; where none exists (e.g. Codex offers no read-only-execute mode) they run
  full-access under a report-only contract with byte-identical pre/post `git status --porcelain`
  (reduced enforcement) instead of blocking on prompts;
- `role-safe` (explicit owner request): reviewer/researcher use the strongest enforceable read-only or
  plan mode; builder/lead/claude-designer use the charter's writer mode;
- `always-ask` (explicit owner request): builder/lead/claude-designer use the mode that asks before
  writes or sensitive actions; reviewer/researcher still use the strongest read-only or plan mode.

Containment does not depend on the permission mode: every repository writer runs in its own isolated
worktree, and every Claude Designer uses an exclusive external project/file zone. An agent that writes
outside its worktree or contracted external zone is out of scope (deny/return regardless of mode).
The CTO still resolves any permission request itself and never lets one reach the owner; under
`full-access-writers` these are rare by design. Mark a report-only agent run without an enforceable
read-only mode as `reduced enforcement`.

## Roles and authority

The assignment prompt's first instruction must invoke the exact qualified skill:

| Role | Codex | Claude | Authority |
| --- | --- | --- | --- |
| Builder | `$paseo-cto:paseo-builder` | `/paseo-cto:paseo-builder` | Assigned write zone, acceptance, local commit; no agents, integration, push, or external action. |
| Claude Designer | — (dispatch a Claude worker) | `/paseo-cto:claude-designer` | Exact Claude Design project/file zone; read-back and render proof; no repository changes, acceptance, sharing, or publication. |
| Reviewer | `$paseo-cto:paseo-reviewer` | `/paseo-cto:paseo-reviewer` | Independent report on a named commit; no fixes, commits, integration, or plan edits. |
| Researcher | `$paseo-cto:paseo-researcher` | `/paseo-cto:paseo-researcher` | Read-only bounded investigation; no project decisions. |
| Lead | `$paseo-cto:paseo-lead` | `/paseo-cto:paseo-lead` | One bounded stream and one child level; no lead child, project reprioritization, push, or founder gate. |

If the qualified skill is unavailable, the worker must return exactly
`BLOCKED: role skill unavailable` before any repository read or write. The CTO remains final reviewer
and integration authority, including for lead-approved work.

Route by dominant need: prefer GPT for mechanical implementation and structured diagnostics;
Claude for product/architecture synthesis, UI judgment, qualitative research, and every Claude
Designer assignment. Prefer an opposite-family independent reviewer; otherwise use a fresh session.
Record material exceptions.

## Identity, labels, and ownership

Use titles no longer than 60 characters: `<plan-id>-<family>-<role>`, for example
`A-14-claude-builder` or `A-14.2-gpt-builder`. The Claude Designer title is exactly
`<plan-id>-claude-designer` because the role name already fixes its provider family. Use `gpt` for
Codex/OpenAI and `claude` for Anthropic; name the CTO row `cto-gpt` or `cto-claude`. Keep the
status-table task aligned with the plan title.

Set string labels on every agent:

```text
paseo-cto.project   = <stable project slug>
paseo-cto.run       = <CTO run/session id>
paseo-cto.task      = <stable plan id>
paseo-cto.role      = <builder|claude-designer|reviewer|researcher|lead>
paseo-cto.workspace = <workspace id>
paseo-cto.baseline  = <exact git SHA>
paseo-cto.parent    = <CTO agent ID or owning lead ID>
paseo-cto.stream    = <root or lead plan ID>
```

Do not label strategy or derived status. Search all active and review-pending agents for the same
project/task/role before creation.

Each agent has one lifecycle owner. The CTO owns root children; a lead owns its descendants. The CTO
may observe lead descendants but must not prompt, archive, replace, or otherwise mutate them until
the lead records handover or escalation. Ownership returns to the CTO only through that recorded
transition.
