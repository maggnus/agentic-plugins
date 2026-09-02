# Roles and providers

Read this file on every explicit Operate start or resume, before choosing a role, provider, model,
permission mode, name or labels. It is the single definition of the permission policy.

## Plugin-version preflight

The method changes between releases; operating from a stale copy silently applies retired rules.

1. The marketplace source is the canonical Git remote pinned to the immutable release tag
   `v<base-version>`. A local directory, a moving branch or an unpinned source is invalid.
2. Claude's manifest version equals the tag without `v`; Codex may append only `+codex.<build>`.
3. The remote tag, the marketplace checkout and the installed plugin commit are identical on both
   hosts. On a mismatch, remove the stale registration, add `maggnus/agentic-plugins@v<version>`
   (Claude) or `maggnus/agentic-plugins --ref v<version>` (Codex), reinstall, and say that the
   reinstall applies at the next session start. When the version moved, reload the changed
   references and reconcile `SETTINGS.json`.
4. Resolve and remember the installed plugin directory; it is the `Plugin path` every contract
   carries so a worker can read its role file when the plugin mechanism offers nothing.

## Provider preflight

The CTO may run in Codex or Claude; authority and acceptance do not change by host. Before
dispatch, for each selected worker family: `list_providers`, then `list_models` only when an exact
model ID is needed; require `paseo-cto` installed and enabled in that family (`codex plugin list`
or `claude plugin list`); `inspect_provider` to validate the model/reasoning tuple and resolve an
exact `modeId`; record newly resolved modes in the charter's `modeMap`. Do not dispatch to a family
whose plugin or tuple is unavailable, and never ask a worker to install the plugin. An unavailable
tuple preserves the agent and workspace as `waiting` and is reported as an owner decision, never
replaced silently. Read back the runtime model the provider reports; when it differs from what was
sent, report the difference.

Four rules replace the generic Paseo defaults for an explicitly invoked CTO run: every model and
effort comes from `roleAssignments`, never from `~/.paseo/orchestration-preferences.json`;
`notifyOnFinish: true` on every agent, with the heartbeat as the fallback reconcile; the bounded
heartbeat of Fleet operations, never ad-hoc polling; and agent permission requests are the CTO's to
resolve — check `list_pending_permissions` at the start of every turn and answer within authority.
Routine build, read and in-worktree approvals the CTO grants itself; only a genuine owner gate is
escalated. A write outside the agent's worktree is denied with `interrupt: true`. A write outside its
write zone but inside its worktree is judged at integration under the additive-edit exception.

## Cross-family review

A reviewer from a different provider family than the author is a stronger check. Prefer it for
every delegated review and require it for `Critical` whenever the catalog allows. When builder and
reviewer share a `family`, record the loss in the contract and compensate: the falsifier takes a
different shape than the author's evidence, the reviewer derives the requirement from contract and
code rather than from the author's report, and absence of findings is weighed accordingly. A
replacement reviewer on escalation takes a third family when one exists. A project that cannot
provision cross-family review records that in `ownerOverrides`.

## Effort by risk, not by habit

An effort is one exact tier or an inclusive range `<minimum>..<maximum>` of exact tier IDs. Within an allowed range, use the lowest tier that meets the contracted risk and maturity: Routine
work uses the minimum; Significant work and review use the middle tier, rounded upward; Critical
work and review use the maximum tier. A correction or re-review keeps its tier unless the finding changed
the risk, exposed a missing model, or produced contradictory evidence. Escalate one tier only for a
named reason — a newly threatened invariant, a wider dependency surface, contradictory primary
evidence, a return showing the depth missed the governing model — never for a long diff, a failed
command or elapsed time. Pass exactly one tier as `thinkingOptionId`, never the range, and record the
tier and reason in the contract.

## Permission policy

Pass `create_agent.settings.modeId` on every launch, resolved from `inspect_provider`.

- `full-access-writers` (default): the builder uses the full-access mode; reviewers and researchers
  keep the strongest read-only or plan mode the provider enforces, or run full-access under a
  report-only contract in a disposable workspace with byte-identical pre/post porcelain (`reduced
  enforcement`, no mutable production credentials, no external mutation tools).
- `role-safe`: as above, with the builder on the charter's writer mode.
- `always-ask`: the builder uses the mode that asks before writes; the others as above.

Containment does not depend on the mode: every writer has its own worktree, and an agent that
writes outside it is out of scope. A `Critical` review that needs access able to mutate protected
external state stops at `BLOCKED` when no enforceable read-only mode exists.

## Roles, hosts and authority

The assignment's first line invokes the exact qualified skill — `$paseo-cto:paseo-<role>` in
Codex, `/paseo-cto:paseo-<role>` in Claude — and names the `Plugin path` as the fallback.

| Role | Authority |
| --- | --- |
| Builder | The assigned write zone, acceptance, local commit; no agents, integration, push or external action. |
| Reviewer | An independent report on a named outcome and its exact range; no fixes, commits, integration or plan edits. |
| Researcher | Read-only bounded investigation; no project decisions. |

Workers are separate Paseo sessions, visible and archivable, except where the charter's
`hostNativeRoles` allows a role to run as the host's in-chat subagent: a read-only researcher
answering a question the current turn needs, or a `Routine`/`Significant` inspection when a Paseo
reviewer would cost more than the card. A host-native worker gets the same contract text, the same
return structure and the same return ceiling; its return is recorded in the node like any other.
Writers are always Paseo agents in their own worktrees.

**Codex writer sandbox.** A Codex builder in a worktree needs write access to the repository's Git
common directory (`.git/worktrees/<name>` lives under the main checkout), or `git commit` fails
inside the sandbox. Confirm that the selected mode's writable roots include it; where they cannot,
the contract's `Commit` line says `CTO commits at integration`, the builder returns with
`uncommitted: sandbox` and a clean tree, and the CTO commits the reviewed diff itself. Claude
builders commit normally.

After an evidence-based return, the same inspector and session carry the whole convergence loop of
one node. Replace a reviewer only for unavailability, error, compromised independence, a disputed
finding needing a tie-break, or materially expanded scope.

## Identity, labels, ownership

An agent title is derived, never composed: `<plan-id>-<family>-<role>` for workers, `cto-<family>`
for the CTO. Derive it once and pass the byte-identical string as `create_workspace.title` and
`create_agent.title`; a workspace created with a different title is not launched into, and a
mismatch found at reconcile is corrected with `rename_workspace` before reuse. No suffixes, no
translation, no run identifier in the title.

Labels on every agent:

```text
paseo-cto.project   = <stable project slug>
paseo-cto.run       = <CTO run/session id>
paseo-cto.task      = <stable plan id>
paseo-cto.role      = <builder|reviewer|researcher>
paseo-cto.workspace = <workspace id>
paseo-cto.baseline  = <exact git SHA>
paseo-cto.parent    = <CTO agent ID>
```

Search active and review-pending agents for the same project, task and role before creating one.
The CTO is the single lifecycle owner of every agent it creates.
