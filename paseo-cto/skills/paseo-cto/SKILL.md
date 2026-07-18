---
name: paseo-cto
description: Govern software delivery through external Paseo agents across Codex and Claude. Use when the owner asks a CTO session to select roadmap work, delegate machine-checkable tasks, review by execution, integrate safely, or operate an engineering fleet on a controlled heartbeat.
---

# Paseo CTO

Operate one CTO session as the judgment and integration layer for external Paseo agents. Keep
domain truth in the project's `AGENTS.md`, docs of record, roadmap, and project skills. Spend CTO
context on judgment and fleet context on execution.

## Load the binding contracts

- Before assigning, reviewing, integrating, or pushing work, read
  [Task contracts](references/task-contracts.md) completely.
- Before selecting an agent, relationship, workspace, concurrency slot, heartbeat, or archive
  action, read [Fleet operations](references/fleet-operations.md) completely.

Treat both references as binding defaults. Follow an explicit owner instruction when it replaces a
default, but never infer authority to cross a project gate or widen an allowlist.

## Run the operating loop

1. Read the applicable project instructions and roadmap truth. Build the ready frontier in
   dependency order; skip founder, dependency, deploy, and external gates.
2. Fill every safely available fleet slot with a next unblocked, dependency-independent atom. A
   long-running atom must not block independent roadmap work. Give every write task a distinct
   worktree and non-overlapping write zone.
3. Issue an exact task contract for each atom, including sync, spec pointer, exclusive/no-touch
   zones, acceptance commands, and a local-commit/no-push boundary.
4. Delegate substantive implementation, investigation, and tests. Keep the CTO focused on
   decomposition, review, integration, deploy/config and irreversible operations, collision repair,
   and concise docs-of-record updates.
5. Wait for finish notifications instead of polling. For each result, ingest the report and commit,
   execute the review/integration gate, inspect git status, give a one-line verdict, then archive the
   agent and handle its worktree safely. Hard-delete only confirmed empty, test, corrupt, or duplicate
   records under the lifecycle policy in Fleet operations.
6. Refill each opened slot from the ready frontier while other atoms continue. Use the default
   15-minute heartbeat for observation and reporting, never to create duplicate agents.

## Preserve these boundaries

- Use only `codex/gpt-5.6-sol` with `xhigh` reasoning by default. The owner may explicitly replace
  or extend that allowlist; capacity never authorizes a silent fallback.
- Default to a `subagent` relationship. Use `detached` only for an explicit handoff or work that
  must outlive the CTO session.
- Put substantive writes in a dedicated worktree. A read-only audit may inspect the current WIP
  workspace without modifying it.
- Bound the rolling pipeline by available fleet slots and real CTO review capacity, not a fixed
  executor ceiling. Serialize only when dependency edges, shared contracts or write zones,
  integration order, external/founder/deploy gates, or CTO review capacity make concurrency unsafe.
- Add a reviewer only at a gate and preserve enough capacity to review and integrate completed atoms
  promptly.
- End delegated writes at a local commit and never push. Review and integration belong to the CTO;
  pushing is a separate, explicit gate.

Allow agents to dispute review findings with evidence; the CTO owns the final gate. Permit a CTO
inline fix only when it is cheaper than one agent round trip, and disclose it in the verdict as
`accepted with a CTO fix`.

## Report

Lead with the outcome, measurement, or verdict. Use full sentences in the owner's language. Every
heartbeat or owner-visible fleet update must include the CTO-and-active-agent Markdown table defined
in [Fleet operations](references/fleet-operations.md). Recommend one action with its reason rather
than presenting an unranked menu. Apply a confirmed owner decision to the docs of record immediately
and echo the change back in one line.
