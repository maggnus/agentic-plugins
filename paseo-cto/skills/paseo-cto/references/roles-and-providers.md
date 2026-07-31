# Roles and provider policy

Read this file before choosing a role, provider, model, permission mode, name, or labels. It is the
single definition of the permission policy; other references name its values but never restate them.

## Plugin-version preflight

Run this before the provider preflight on every explicit `operate` start or resume, and before
relying on any rule in these references. The method changes between releases; operating from a stale
copy silently applies retired rules.

1. **Refresh the source.** In the marketplace's own checkout, fetch and confirm the working tree is
   clean and level with its remote. A local edit that was never pushed, or a remote commit that was
   never pulled, is the usual cause of two sessions disagreeing about the method.
2. **Read the version from the manifest on disk**, not from the host's install registry. The
   registry lags, and it keys installs by project path — a stale or foreign path there proves
   nothing about what this session loaded.
3. **Identify what this session actually loaded.** The skill's own base directory is the answer. A
   marketplace registered as a local directory serves the live checkout, so the version-numbered
   cache under the host's plugin directory is an archive of earlier releases, not the source; a
   remote marketplace serves an immutable snapshot instead, and only there does the cached copy
   answer the question.
4. **Reconcile a mismatch before working.** Update the marketplace and the installed plugin through
   the host CLI — `claude plugin marketplace update <name>` then `claude plugin update
   <plugin>@<name> --scope <scope>`, or the Codex equivalents — and note that an update applies at
   the next session start, so a mid-session refresh does not retroactively change what is already in
   context.
5. **Re-read the changed files.** When the version moved, reload the affected references before
   acting on them, and reconcile `SETTINGS.json` against any changed field: a release that redefines
   a charter value leaves the persisted choice valid but its wording stale.

Only then continue to the provider preflight and to creating agents.

## Provider preflight

The CTO may run in Codex or Claude; role authority and acceptance do not change by provider. Before
dispatch, for each selected worker family:

1. call `list_providers`, then `list_models` only when an exact model ID for that provider is needed;
2. require `paseo-cto` to be installed and enabled in that worker environment: verify with
   `codex plugin list` for Codex or `claude plugin list` for Claude;
3. call `inspect_provider`, validate the model/reasoning tuple, and resolve an exact `modeId`;
4. validate provider, model, reasoning, and `modeId` against the persistent charter; store newly
   resolved role modes in its `modeMap`, then record the settings revision and snapshot in runtime.

Do not dispatch to a family whose plugin or selected tuple is unavailable. Do not ask a worker to
discover or install the plugin. Preserve an existing failed agent and workspace as `waiting`; a
provider/model change requires a charter change, never a silent fallback.

All workers are separate Paseo provider sessions, visible and archivable in Paseo. Do not delegate
through the host's in-chat subagent facility. Repository writers never share a mutable workspace.

These four owner-approved rules replace only the corresponding generic Paseo defaults for an
explicitly invoked Paseo CTO run:

- take every model and effort from the charter's `roleAssignments`, never from
  `~/.paseo/orchestration-preferences.json` or any other global default;
- set `notifyOnFinish: false` for parallel agents until the platform issue is fixed; it may be true
  only for a single active agent on the critical path (see Fleet operations);
- run the bounded 15-minute reconciliation defined by the CTO lifecycle, not ad-hoc polling;
- agent permission requests are the CTO's to resolve, never the owner's. Check
  `list_pending_permissions` at the start of every turn and every reconcile — together with the
  recorded agents' status, per the Fleet operations turn-start check — and
  `respond_to_permission` immediately within authority — never leave a request sitting for the owner
  to answer or let it stall an agent until the next heartbeat. Routine build/read/in-worktree
  approvals (a dependency fetch for a gate, a file change inside the agent's own worktree) the CTO
  grants or denies itself; only a genuine owner gate (push, deploy, publication, live mutation,
  money, secrets, schema, irreversible action) is ever escalated to the owner. An agent that
  requests a write outside its worktree or write zone is out of scope: deny with `interrupt: true`
  and return it to its contract.

Retain every other base Paseo safety rule.

## Model and effort selection is local — the plugin makes none

**This plugin names no model, no reasoning effort, and no provider preference, and it never supplies
a default for any of them.** Model catalogs turn over faster than a plugin release, and the owner —
not the method — knows which model is available, affordable, and appropriate today. A model name
written here would silently override a choice the plugin cannot see.

The binding lives in one place: the charter's `roleAssignments` in the project-scoped
`SETTINGS.json`, defined by [Persistent settings](persistent-settings.md). It maps each role —
including the CTO's own seat — to a provider, a model, and a reasoning effort, in the values the
owner confirmed. Read it, validate it against the live catalog, and dispatch what it says.

- **An unassigned role is not dispatchable.** If `roleAssignments` has no entry for the role, stop
  and ask the owner for one. Do not choose a model, infer one from another role, carry one over
  from a previous run, or read one from a global Paseo preferences file.
- **A missing or invalid tuple is an owner decision, never a fallback.** If the assigned model or
  effort is unavailable at preflight, preserve the agent and workspace as `waiting`, report the
  exact tuple and the exact failure, and wait. Substituting a neighbouring model silently is the
  failure this rule exists to prevent.
- **Verify what actually ran, not what was requested.** Read the runtime model the provider reports
  back, not the value that was sent. A provider may serve a different model than the one selected;
  when the two differ, report it rather than reconciling it quietly, because every claim the agent
  made about its own capacity was measured on the substrate that actually ran.
- **Record the chosen effort in the dispatch contract** whenever the assignment allows a range, so
  the choice is auditable after the fact.

## Permission policy

Pass `create_agent.settings.modeId` on every launch; it is mandatory. Resolve its exact value from
`inspect_provider` rather than hard-coding provider names. The default policy is
`full-access-writers`: agents launch with full permissions so they never stall on permission
prompts. Repository writers still commit locally and never push.

- `full-access-writers` (default): the builder uses the selected full-access/bypass mode. Reviewers
  and researchers keep the strongest read-only or plan mode where the provider enforces one; where
  none exists (e.g. Codex offers no read-only-execute mode) they run full-access under a report-only
  contract with byte-identical pre/post `git status --porcelain` (reduced enforcement) instead of
  blocking on prompts;
- `role-safe` (explicit owner request): reviewer and researcher use the strongest enforceable
  read-only or plan mode; the builder uses the charter's writer mode;
- `always-ask` (explicit owner request): the builder uses the mode that asks before writes or
  sensitive actions; reviewer and researcher still use the strongest read-only or plan mode.

Containment does not depend on the permission mode: every repository writer runs in its own isolated
worktree. An agent that writes outside its worktree is out of scope (deny or return regardless of
mode). The CTO still resolves any permission request itself and never lets one reach the owner;
under `full-access-writers` these are rare by design. Mark a report-only agent run without an
enforceable read-only mode as `reduced enforcement`.

## Roles and authority

The assignment prompt's first instruction must invoke the exact qualified skill. The pattern is
identical on both platforms — `$paseo-cto:paseo-<role>` in Codex, `/paseo-cto:paseo-<role>` in
Claude:

| Role | Codex | Claude | Authority |
| --- | --- | --- | --- |
| Builder | `$paseo-cto:paseo-builder` | `/paseo-cto:paseo-builder` | Assigned write zone, acceptance, local commit; no agents, integration, push, or external action. |
| Reviewer | `$paseo-cto:paseo-reviewer` | `/paseo-cto:paseo-reviewer` | Independent report on a named commit; no fixes, commits, integration, or plan edits. |
| Researcher | `$paseo-cto:paseo-researcher` | `/paseo-cto:paseo-researcher` | Read-only bounded investigation; no project decisions. |

If the qualified skill is unavailable, the worker must return exactly
`BLOCKED: role skill unavailable` before any repository read or write. The CTO remains final
reviewer and integration authority.

Routing follows `roleAssignments`; the plugin states no preference for one provider family over
another on any kind of work. One structural rule does hold, because it is about independence rather
than about capability: when the risk gate requires an initial independent review, prefer a reviewer
from a different provider family than the author, and otherwise use a fresh session. A reviewer of
the same family as the author is a weaker check — findings that survive it are worth no less, but
findings it misses are more likely — so when the assignment leaves both on one family, record that
the cross-family property was lost.

After an evidence-based return, reuse the same non-author reviewer and session by default under the
Review gate. Replace it only for unavailability or error, compromised independence, a disputed
finding needing a tie-break, or materially expanded scope, dependencies, or threatened invariant.
Record material exceptions.

## Identity, labels, and ownership

Use titles no longer than 60 characters: `<plan-id>-<family>-<role>`, for example
`A-14-<family>-builder` or `A-14.2-<family>-builder`, and `cto-<family>` for the CTO row. `<family>`
is the short provider-family slug the charter's `roleAssignments` records for that role — a stable
lowercase token, not a model name and not a version. Keep the status-table task aligned with the
plan title.

Set string labels on every agent:

```text
paseo-cto.project   = <stable project slug>
paseo-cto.run       = <CTO run/session id>
paseo-cto.task      = <stable plan id>
paseo-cto.role      = <builder|reviewer|researcher>
paseo-cto.workspace = <workspace id>
paseo-cto.baseline  = <exact git SHA>
paseo-cto.parent    = <CTO agent ID>
```

Do not label strategy or derived status. Search all active and review-pending agents for the same
project/task/role before creation. The CTO is the single lifecycle owner of every agent it creates.
