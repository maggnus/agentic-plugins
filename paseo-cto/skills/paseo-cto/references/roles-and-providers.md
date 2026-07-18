# Roles and provider policy

Read this file before choosing a role, provider, model, permission mode, name, or labels.

## Provider preflight

The CTO may run in Codex or Claude; role authority and acceptance do not change by provider. Before
dispatch, for each selected worker family:

1. call `list_providers`, then `list_models` only when exact `codex` or `claude` IDs are needed;
2. require `paseo-cto` to be installed and enabled in that worker environment: verify with
   `codex plugin list` for Codex or `claude plugin list` for Claude;
3. call `inspect_provider`, validate the model/reasoning tuple, and resolve an exact `modeId`;
4. record provider, model, reasoning, and `modeId` in the runtime checkpoint.

Do not dispatch to a family whose plugin or selected tuple is unavailable. Do not ask a worker to
discover or install the plugin. Preserve an existing failed agent and workspace as `waiting`; a
provider/model change requires a charter change, never a silent fallback.

All workers are separate Paseo provider sessions, visible and archivable in Paseo. Do not delegate
through the host's in-chat subagent facility. Writers never share a mutable workspace.

These three owner-approved rules replace only the corresponding generic Paseo defaults for an
explicitly invoked Paseo CTO run:

- use the accepted operating charter, not `~/.paseo/orchestration-preferences.json`, for models;
- set `notifyOnFinish: false` for parallel agents until the platform issue is fixed;
- run the bounded 15-minute reconciliation defined by the CTO lifecycle, not ad-hoc polling.

Retain every other base Paseo safety rule.

## Models and permission policy

Verify IDs at runtime because catalogs can change:

| Family | Preferred order | Default reasoning |
| --- | --- | --- |
| GPT | `codex/gpt-5.6-sol`, then `codex/gpt-5.6-terra` | `xhigh` |
| Claude | `claude/claude-fable-5`, then `claude/claude-opus-4-8[1m]`, then `claude/claude-opus-4-8` | `xhigh` |

Use the charter's selected tuple. Exceptional reasoning tiers or fast modes require explicit owner
or binding project authorization.

Pass `create_agent.settings.modeId` on every launch; it is mandatory. Resolve its exact value from
`inspect_provider` rather than hard-coding provider names:

- `role-safe`: reviewer/researcher use the strongest enforceable read-only or plan mode;
  builder/lead use the charter's writer mode;
- `always-ask`: builder/lead use the mode that asks before writes or sensitive actions;
  reviewer/researcher still use the strongest read-only or plan mode;
- `full-access-writers`: builder/lead use the selected full-access mode; reviewer/researcher remain
  in the strongest read-only or plan mode.

If no enforceable read-only mode exists, give a reviewer/researcher the least-privileged available
`modeId`, a fresh isolated workspace, a text-only no-write contract, and require exact equality of
pre/post `git status --porcelain`. Mark the run `reduced enforcement`.

## Roles and authority

The assignment prompt's first instruction must invoke the exact qualified skill:

| Role | Codex | Claude | Authority |
| --- | --- | --- | --- |
| Builder | `$paseo-cto:paseo-builder` | `/paseo-cto:paseo-builder` | Assigned write zone, acceptance, local commit; no agents, integration, push, or external action. |
| Reviewer | `$paseo-cto:paseo-reviewer` | `/paseo-cto:paseo-reviewer` | Independent report on a named commit; no fixes, commits, integration, or plan edits. |
| Researcher | `$paseo-cto:paseo-researcher` | `/paseo-cto:paseo-researcher` | Read-only bounded investigation; no project decisions. |
| Lead | `$paseo-cto:paseo-lead` | `/paseo-cto:paseo-lead` | One bounded stream and one child level; no lead child, project reprioritization, push, or founder gate. |

If the qualified skill is unavailable, the worker must return exactly
`BLOCKED: role skill unavailable` before any repository read or write. The CTO remains final reviewer
and integration authority, including for lead-approved work.

Route by dominant need: prefer GPT for mechanical implementation and structured diagnostics;
Claude for product/architecture synthesis, UI judgment, and qualitative research. Prefer an
opposite-family independent reviewer; otherwise use a fresh session. Record material exceptions.

## Identity, labels, and ownership

Use titles no longer than 60 characters: `<plan-id>-<family>-<role>`, for example
`A-14-claude-builder` or `A-14.2-gpt-builder`. Use `gpt` for Codex/OpenAI and `claude` for Anthropic;
name the CTO row `cto-gpt` or `cto-claude`. Keep the status-table task aligned with the plan title.

Set string labels on every agent:

```text
paseo-cto.project   = <stable project slug>
paseo-cto.run       = <CTO run/session id>
paseo-cto.task      = <stable plan id>
paseo-cto.role      = <builder|reviewer|researcher|lead>
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
