# Roles and provider policy

Read this file before choosing a role, provider, model, permission mode, name, or labels. It is the
single definition of the permission policy; other references name its values but never restate them.

## Plugin-version preflight

Run this before the provider preflight on every explicit `operate` start or resume, and before
relying on any rule in these references. The method changes between releases; operating from a stale
copy silently applies retired rules.

1. **Require a remote tagged marketplace.** The marketplace source is the canonical Git remote and
   its selected reference is the immutable release tag `v<base-version>`. A local directory, a
   moving branch, or an unpinned Git source is invalid for operation even on the development
   machine.
2. **Read the version from the loaded manifest and the tag from marketplace metadata.** Claude's
   manifest version equals the tag without `v`; Codex may append only its `+codex.<cachebuster>`
   build suffix to the same base version.
3. **Verify one commit identity.** The remote tag, the marketplace checkout revision, and the
   installed plugin commit must be identical on both hosts. The skill's own base directory confirms
   what this session loaded; a version label without the same commit is not sufficient.
4. **Reconcile a mismatch before working.** Remove the stale plugin and marketplace registration,
   then add `maggnus/claude-plugins@v<version>` in Claude or add
   `maggnus/claude-plugins --ref v<version>` in Codex and reinstall the plugin. Never move a
   published tag or convert the installation to a local directory. A reinstall applies only at the
   next session start.
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

### Spend reasoning effort by risk, not by habit

An `effort` value is either one exact provider tier or an inclusive range written as
`<minimum>..<maximum>`, using exact tier IDs from that provider's ordered catalog. The owner fixes
the permissible range; the CTO chooses one exact tier for each dispatched atom and passes only that
tier to the provider. Never pass the range itself as `thinkingOptionId`.

Within an allowed range, use the lowest tier that meets the contracted risk and maturity:

- Routine research, design, build work, and its lightweight second look use the minimum tier;
- Significant work and review use the middle available tier, rounded upward when the range has an
  even number of choices;
- Critical work and review use the maximum tier;
- a bounded correction or re-review keeps the prior tier unless the finding changed the risk,
  exposed a missing semantic model, or produced contradictory evidence.

Escalate one tier only for a named reason: a newly threatened invariant, materially wider
dependency surface, contradictory primary evidence, or a return showing that the current reasoning
depth missed the governing model. A long diff, a failed command, elapsed time, or a verbose report
does not justify escalation by itself. Record the chosen tier and reason in the assignment. This
policy spends fewer tokens by default without lowering the owner-selected minimum or any safety
floor.

## Permission policy

Pass `create_agent.settings.modeId` on every launch; it is mandatory. Resolve its exact value from
`inspect_provider` rather than hard-coding provider names. The default policy is
`full-access-writers`: agents launch with full permissions so they never stall on permission
prompts. Repository writers still commit locally and never push.

- `full-access-writers` (default): the builder uses the selected full-access/bypass mode. Reviewers
  and researchers keep the strongest read-only or plan mode where the provider enforces one; where
  none exists (e.g. Codex offers no read-only-execute mode) they run full-access under a report-only
  contract in a dedicated disposable workspace, with byte-identical pre/post
  `git status --porcelain` (reduced enforcement), instead of blocking on prompts;
- `role-safe` (explicit owner request): reviewer and researcher use the strongest enforceable
  read-only or plan mode; the builder uses the charter's writer mode;
- `always-ask` (explicit owner request): the builder uses the mode that asks before writes or
  sensitive actions; reviewer and researcher still use the strongest read-only or plan mode.

Containment does not depend on the permission mode: every repository writer runs in its own isolated
worktree. An agent that writes outside its worktree is out of scope (deny or return regardless of
mode). The CTO still resolves any permission request itself and never lets one reach the owner;
under `full-access-writers` these are rare by design. Mark a report-only agent run without an
enforceable read-only mode as `reduced enforcement`. Such a run receives no mutable production
credentials, shared workspace, or authorization to call external mutation tools. If a Critical
review requires access that could mutate protected external state and no enforceable read-only mode
exists, stop at `BLOCKED`; a report-only prompt is not an adequate substitute for containment.

## Roles and authority

The assignment prompt's first instruction must invoke the exact qualified skill. The pattern is
identical on both platforms — `$paseo-cto:paseo-<role>` in Codex, `/paseo-cto:paseo-<role>` in
Claude:

| Role | Codex | Claude | Authority |
| --- | --- | --- | --- |
| Builder | `$paseo-cto:paseo-builder` | `/paseo-cto:paseo-builder` | Assigned write zone, acceptance, local commit; no agents, integration, push, or external action. |
| Reviewer | `$paseo-cto:paseo-reviewer` | `/paseo-cto:paseo-reviewer` | Independent report on a named outcome and, when present, its exact revision range; no fixes, commits, integration, or plan edits. |
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

An agent title is derived, never composed. The single format is `<plan-id>-<family>-<role>` — for
example `A-14-<family>-builder` or `A-14.2-<family>-builder` — and `cto-<family>` for the CTO row:
no other words, no descriptive additions, no translation into the reporting language, and nothing
in place of `<family>` but the short provider-family slug the charter's `roleAssignments` records
for that role — a stable lowercase token, not a model name and not a version. The title is a pure
function of values the agent already carries — `paseo-cto.task`, the assigned family, and
`paseo-cto.role` — so any two CTOs, on any host and any model, derive the identical string. At
every reconcile, derive the expected title from the labels and rename any owned agent whose title
differs (`update_agent`); a title is display output, and a mismatch is corrected mechanically,
never preserved as style. Keep the status-table task aligned with the plan title.

The workspace title is not a second naming surface. Before creating an agent, derive its exact
title once and pass that byte-identical string both as `create_workspace.title` and as
`create_agent.title`. A newly created workspace whose title differs from its agent title is invalid:
do not launch the agent in it. During reconciliation, compare every owned agent title with the title
of its recorded workspace and correct a current-API mismatch with `rename_workspace` before reuse.
For the older worktree API, which has no separate title field, use the exact derived agent title as
`worktreeSlug` and verify that the created worktree inventory exposes that name before launch. Do
not append `workspace`, a role description, a run identifier, or any other qualifier.

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
