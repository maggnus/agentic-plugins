# Fleet operations

Read this file completely before selecting, starting, monitoring, reusing, or archiving an agent or
worktree.

## Contents

- [Owner authority and hard model allowlist](#owner-authority-and-hard-model-allowlist)
- [Relationship and workspace](#relationship-and-workspace)
- [Concurrency budget](#concurrency-budget)
- [Roadmap truth and gates](#roadmap-truth-and-gates)
- [Notify-on-finish lifecycle](#notify-on-finish-lifecycle)
- [Heartbeat and reporting](#heartbeat-and-reporting)

## Owner authority and hard model allowlist

Unless the owner explicitly says otherwise, the only allowed launch tuple is:

| Provider/model | Reasoning | Use |
| --- | --- | --- |
| `codex/gpt-5.6-sol` | `xhigh` | All default fleet work |

The owner may explicitly replace or extend this allowlist globally or for a named task. Require an
unambiguous provider/model/reasoning tuple; do not infer an override from availability, prior runs,
task urgency, or generic provider preferences. Treat `Max` as an exceptional tier: use it only for a
genuinely complex task, state the reason, and only when the owner has explicitly allowed its exact
tuple. Never select `Max` merely because a default-capacity request failed.

Use auto-review permission mode by default unless the owner or binding project policy explicitly
requires another mode.

On a provider-capacity error, preserve the existing agent and its context, report the condition, and
retry the same tuple only through a later authorized action. A heartbeat may observe and report
capacity readiness, but must not create a replacement. Do not churn, change provider/model/reasoning,
or silently fall back. Capacity is an expected wait state, not model authority.

## Relationship and workspace

- Use `relationship: { kind: "subagent" }` by default so the agent lifecycle belongs to the CTO task.
- Use `relationship: { kind: "detached" }` only for an explicit owner-requested handoff or work that
  must remain independently usable after the CTO session is archived.
- Use a dedicated Paseo worktree for every substantive write task. Use the current workspace only for
  read-only inspection of live WIP, with writes forbidden in the task contract.
- Keep relationship and workspace decisions separate: `subagent` does not imply a shared tree, and
  `detached` does not excuse missing isolation.

## Concurrency budget

Operate a bounded rolling pipeline. While fleet slots are available, continuously start the next
unblocked, dependency-independent roadmap atoms; a long-running atom must not block independent
roadmap work or leave otherwise safe slots idle. Give every concurrent write task a distinct Paseo
worktree and exclusive, non-overlapping write zones.

Bound the live set by the available owner/platform fleet slots and the CTO's real capacity to review
and integrate results promptly. Add a reviewer only when an implementation reaches its gate, account
for that temporary slot in the same budget, and remove it after the verdict. Do not create agents
merely to keep a fleet-looking dashboard busy.

Serialize atoms only when concurrency is unsafe because of a dependency edge, a shared contract or
overlapping write zone, required integration order, an external/founder/deploy gate, or insufficient
real CTO review capacity. Do not treat elapsed runtime, roadmap adjacency, or the existence of another
executor as a serialization reason.

When a slot opens, take the next unblocked atom rather than leaving a finished agent idle. Reuse an
agent only when continuity is valuable and it remains active for a concrete follow-up; otherwise archive
it and start the next atom with a clean contract.

## Roadmap truth and gates

Before selecting work, read every applicable project `AGENTS.md`, the docs of record, roadmap, and
dependency status. Build the ready frontier in dependency order, not simply by the lowest card number,
then fill safe fleet slots with unblocked atoms whose dependencies, contracts, write zones, and
integration order permit parallel work. A running atom is not itself a dependency edge and must not
hold back an independent ready atom. Skip any founder decision, unmet dependency, deploy approval,
external publication, provider setup, sign-off, or other external gate. Never cross one without
explicit owner authority.

Use read-only preflight where it helps prepare a candidate's exact spec, dependencies, zones, and
acceptance without consuming unsafe review capacity. Preflight must not start gated or overlapping
implementation and is not a substitute for filling a safe executor slot.

## Notify-on-finish lifecycle

Create agent-scoped work with `notifyOnFinish: true` (or leave its native true default). Do not poll a
running agent: continue CTO work and wait for its completion, error, or permission notification.

After notification, use this order:

1. ingest the result report and referenced commit;
2. inspect the agent worktree with `git status --short --branch` and run the review gate;
3. call `archive_agent` for the finished agent so it leaves the active fleet;
4. call `archive_worktree` only when the worktree is clean and its reviewed work is integrated or
   intentionally discarded under owner authority;
5. preserve any dirty or unintegrated worktree and report its path, branch, status, commits, and next
   required action explicitly.

Never leave finished agents as idle tails. Never discard a dirty or unintegrated tree merely to make
the fleet appear clean.

## Heartbeat and reporting

Use `create_heartbeat` on a 15-minute cadence by default; the owner may set another cadence explicitly.
A heartbeat is an observation prompt returning to the CTO session, not `create_schedule` or another
mechanism that creates a new agent. It checks notifications, active agents, background jobs, gates,
and capacity waits. It must never launch a duplicate for work that is already active.

Treat overlap or `already active` as expected idempotency signals. Keep the current agent and wait for
notification; do not repair healthy overlap with cancellation, recreation, or model churn.

Every heartbeat and owner-visible fleet update must lead with the outcome, carry the report
timestamp (owner-local time) next to the table, and include this Markdown table with the CTO plus
every active agent. No provider/model column — the owner controls the allowlist separately; identify
work by its roadmap atom index (e.g. `S2C-11`, `S2-11`, or a wave label) with a very short title in
its own column:

| Actor | Atom | Title (short) | Status | Elapsed | Next action |
| --- | --- | --- | --- | --- | --- |
| CTO | `<atom/gate index or —>` | `<current gate or coordination, 2-5 words>` | active | `<time in state>` | `<one concrete action>` |
| `<agent>` | `<roadmap atom / wave index>` | `<task title, 2-5 words>` | `<state>` | `<time in state>` | `<one concrete action>` |

Use full grammatical sentences in the owner's language. When the owner is offline, continue only safe,
unblocked work; accumulate concise updates and leave every founder, deploy, external, and sign-off gate
untouched.
