# Roles and provider policy

Read this file before choosing a role, provider, model, permission mode, name, or labels. It is the
single definition of the permission policy; other references name its values but never restate them.

## Plugin-version preflight

Run this before the provider preflight on every explicit `operate` start or resume. The method
changes between releases, and operating from a stale copy silently applies retired rules.

1. **Require a remote tagged marketplace.** The marketplace source is the canonical Git remote and
   its selected reference is the immutable release tag `v<base-version>`. A local directory, a
   moving branch, or an unpinned Git source is invalid for operation.
2. **Read the version from the loaded manifest and the tag from marketplace metadata.** Claude's
   manifest version equals the tag without `v`; Codex may append only its `+codex.<cachebuster>`
   build suffix to the same base version.
3. **Verify one commit identity.** The remote tag, the marketplace checkout revision, and the
   installed plugin commit must be identical on both hosts. A version label without the same commit
   is not sufficient.
4. **Reconcile a mismatch before working.** Remove the stale plugin and marketplace registration,
   then add `maggnus/claude-plugins@v<version>` in Claude or `maggnus/claude-plugins --ref
   v<version>` in Codex and reinstall. Never move a published tag or convert the installation to a
   local directory. A reinstall applies only at the next session start.
5. **Re-read the changed files.** When the version moved, reload the affected references and
   reconcile `SETTINGS.json` against any changed field.

Only then continue to the provider preflight and to creating agents.

## Cross-family review check

After the provider preflight resolves role assignments, verify the independence property for
risk-gated work:

1. **Read `roleAssignments`** for `builder` and `reviewer` (and `researcher` if it will perform
   independent review).
2. **Compare `family` slugs.** If builder and reviewer share the same `family`, the cross-family
   independence property is lost.
3. **Record the loss** in the dispatch contract and apply the Review gate's compensation rules
   (see [Review gate](review-gate.md)). Do not silently proceed.
4. **Warn the owner** if the charter permits cross-family assignment but the live provider catalog
   cannot satisfy it — this is an owner decision, not a CTO fallback.

A project that cannot provision cross-family reviewers must accept reduced review independence and
document it in `ownerOverrides`.

## Provider preflight

The CTO may run in Codex or Claude; role authority and acceptance do not change by provider. Before
dispatch, for each selected worker family:

1. call `list_providers`, then `list_models` only when an exact model ID for that provider is needed;
2. require `paseo-cto` to be installed and enabled in that worker environment, verified with
   `codex plugin list` or `claude plugin list`;
3. call `inspect_provider`, validate the model/reasoning tuple, and resolve an exact `modeId`;
4. validate provider, model, reasoning, and `modeId` against the persistent charter, store newly
   resolved role modes in its `modeMap`, then record the settings revision and snapshot in runtime.

Do not dispatch to a family whose plugin or selected tuple is unavailable, and do not ask a worker to
install the plugin. Preserve an existing failed agent and workspace as `waiting`; a provider or model
change requires a charter change, never a silent fallback.

All workers are separate Paseo provider sessions, visible and archivable in Paseo. Do not delegate
through the host's in-chat subagent facility. Repository writers never share a mutable workspace.

These four owner-approved rules replace only the corresponding generic Paseo defaults for an
explicitly invoked Paseo CTO run:

- take every model and effort from the charter's `roleAssignments`, never from
  `~/.paseo/orchestration-preferences.json` or any other global default;
- set `notifyOnFinish: false` for parallel agents; it may be true only for a single active agent on
  the critical path (see Fleet operations);
- run the bounded 15-minute reconciliation defined by the CTO lifecycle, not ad-hoc polling;
- agent permission requests are the CTO's to resolve, never the owner's. Check
  `list_pending_permissions` at the start of every turn and every reconcile, and
  `respond_to_permission` immediately within authority. Routine build, read and in-worktree
  approvals the CTO grants or denies itself; only a genuine owner gate — push, deploy, publication,
  live mutation, money, secrets, schema, irreversible action — is escalated. An agent requesting a
  write outside its worktree or write zone is out of scope: deny with `interrupt: true` and return
  it to its contract.

Retain every other base Paseo safety rule.

## Model and effort selection is local — the plugin makes none

**This plugin names no model, no reasoning effort, and no provider preference, and it never supplies
a default for any of them.** The owner knows which model is available, affordable, and appropriate
today; a model name written here would silently override a choice the plugin cannot see.

The binding lives in the charter's `roleAssignments` in the project-scoped `SETTINGS.json`, defined
by [Persistent settings](persistent-settings.md). It maps each role, the CTO's own seat included, to
a provider, a model, and a reasoning effort. Read it, validate it against the live catalog, and
dispatch what it says.

- **An unassigned role is not dispatchable.** Stop and ask the owner for an entry. Do not infer one
  from another role, carry one over from a previous run, or read one from a global preferences file.
- **A missing or invalid tuple is an owner decision, never a fallback.** If the assigned model or
  effort is unavailable at preflight, preserve the agent and workspace as `waiting`, report the
  exact tuple and the exact failure, and wait.
- **Verify what actually ran, not what was requested.** Read the runtime model the provider reports
  back. When it differs from the value that was sent, report the difference rather than reconciling
  it quietly: every claim the agent made was measured on the substrate that actually ran.
- **Record the chosen effort in the dispatch contract** whenever the assignment allows a range.

### Spend reasoning effort by risk, not by habit

An `effort` value is either one exact provider tier or an inclusive range written as
`<minimum>..<maximum>`, using exact tier IDs from that provider's ordered catalog. The owner fixes
the permissible range; the CTO chooses one exact tier per dispatched atom and passes only that tier
to the provider. Never pass the range itself as `thinkingOptionId`.

Within an allowed range, use the lowest tier that meets the contracted risk and maturity:

- Routine research, design, build work, and its lightweight second look use the minimum tier;
- Significant work and review use the middle available tier, rounded upward when the range has an
  even number of choices;
- Critical work and review use the maximum tier;
- a bounded correction or re-review keeps the prior tier unless the finding changed the risk,
  exposed a missing semantic model, or produced contradictory evidence.

Escalate one tier only for a named reason: a newly threatened invariant, materially wider dependency
surface, contradictory primary evidence, or a return showing that the current reasoning depth missed
the governing model. A long diff, a failed command, elapsed time, or a verbose report does not
justify escalation. Record the chosen tier and reason in the assignment.

## Permission policy

Pass `create_agent.settings.modeId` on every launch; it is mandatory. Resolve its exact value from
`inspect_provider` rather than hard-coding provider names. The default policy is
`full-access-writers`, so agents never stall on permission prompts. Repository writers still commit
locally and never push.

- `full-access-writers` (default): the builder uses the selected full-access mode. Reviewers and
  researchers keep the strongest read-only or plan mode the provider enforces; where none exists
  they run full-access under a report-only contract in a dedicated disposable workspace, with
  byte-identical pre/post `git status --porcelain` (reduced enforcement);
- `role-safe` (explicit owner request): reviewer and researcher use the strongest enforceable
  read-only or plan mode; the builder uses the charter's writer mode;
- `always-ask` (explicit owner request): the builder uses the mode that asks before writes or
  sensitive actions; reviewer and researcher still use the strongest read-only or plan mode.

Containment does not depend on the permission mode: every repository writer runs in its own isolated
worktree, and an agent that writes outside it is out of scope. Mark a report-only agent run without
an enforceable read-only mode as `reduced enforcement`; such a run receives no mutable production
credentials, shared workspace, or authorization to call external mutation tools. If a Critical
review requires access that could mutate protected external state and no enforceable read-only mode
exists, stop at `BLOCKED`.

## Roles and authority

The assignment prompt's first instruction must invoke the exact qualified skill —
`$paseo-cto:paseo-<role>` in Codex, `/paseo-cto:paseo-<role>` in Claude:

| Role | Codex | Claude | Authority |
| --- | --- | --- | --- |
| Builder | `$paseo-cto:paseo-builder` | `/paseo-cto:paseo-builder` | Assigned write zone, acceptance, local commit; no agents, integration, push, or external action. |
| Reviewer | `$paseo-cto:paseo-reviewer` | `/paseo-cto:paseo-reviewer` | Independent report on a named outcome and, when present, its exact revision range; no fixes, commits, integration, or plan edits. |
| Researcher | `$paseo-cto:paseo-researcher` | `/paseo-cto:paseo-researcher` | Read-only bounded investigation; no project decisions. |

If the qualified skill is unavailable, the worker must return exactly
`BLOCKED: role skill unavailable` before any repository read or write. The CTO remains final
reviewer and integration authority.

Routing follows `roleAssignments`; the plugin states no preference for one provider family over
another. One structural rule holds, because it is about independence rather than capability: when
the risk gate requires an initial independent review, prefer a reviewer from a different provider
family than the author, and otherwise use a fresh session. A same-family reviewer is a weaker check,
so when the assignment leaves both on one family, record that the cross-family property was lost and
apply the Review gate's compensation rules.

After an evidence-based return, reuse the same non-author reviewer and session by default under the
Review gate. Replace it only for unavailability or error, compromised independence, a disputed
finding needing a tie-break, or materially expanded scope, dependencies, or threatened invariant.

## Identity, labels, and ownership

An agent title is derived, never composed. The single format is `<plan-id>-<family>-<role>` — for
example `A-14-<family>-builder` — and `cto-<family>` for the CTO row. No other words, no descriptive
additions, no translation into the reporting language, and nothing in place of `<family>` but the
short provider-family slug `roleAssignments` records for that role. The title is a pure function of
`paseo-cto.task`, the assigned family, and `paseo-cto.role`, so any two CTOs derive the identical
string. At every reconcile, derive the expected title from the labels and rename any owned agent
whose title differs (`update_agent`). Keep the status-table task aligned with the plan title.

The workspace title is not a second naming surface. Before creating an agent, derive its exact title
once and pass that byte-identical string both as `create_workspace.title` and as
`create_agent.title`. A newly created workspace whose title differs from its agent title is invalid:
do not launch the agent in it. During reconciliation, compare every owned agent title with the title
of its recorded workspace and correct a mismatch with `rename_workspace` before reuse. Do not append
`workspace`, a role description, a run identifier, or any other qualifier.

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
project, task and role before creation. The CTO is the single lifecycle owner of every agent it
creates.
