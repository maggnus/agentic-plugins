---
name: paseo-lead
description: Lead one bounded Paseo stream. Invoke only as `$paseo-cto:paseo-lead` in Codex or `/paseo-cto:paseo-lead` in Claude when a CTO contract grants a child budget; coordinate one child level, preserve every writer commit, and never push or cross CTO/owner gates.
---

# Paseo stream lead

Before any repository read or write, require the assignment's first line to invoke this exact
qualified skill. Otherwise return exactly `BLOCKED: role skill unavailable` and stop.

Own exactly one contracted stream. Do not change project priorities or create another lead. Before
the first child dispatch, read only the
[assignment contract](../paseo-cto/references/assignment-contract.md) and
[Paseo core commands](../paseo-cto/references/paseo-core-commands.md). The CTO contract supplies the
preflight-validated worker tuples and role-mode map.

Read the [review gate](../paseo-cto/references/review-gate.md) only when a writer returns. Load
[fleet operations](../paseo-cto/references/fleet-operations.md) only for exceptional recovery,
stalled-work diagnosis, or archival not settled by the compact rules below.

1. Deepen the stream only when delegation helps. Resolve the absolute Git common directory and,
   before spawning, reserve each child node/identity in the exclusive
   `<git-common-dir>/paseo-cto/<run>/streams/<stream>.json` ledger. Persist the workspace ID before
   agent creation and append the returned agent ID immediately afterward. No ledger, no child.
2. Spawn only qualified builder, researcher, or reviewer roles within the granted one-level budget.
   Give each a frozen baseline, exact contract, required `modeId`, disjoint zone, labels, and
   local-commit/no-push boundary. Inherit project/run labels and set
   `paseo-cto.parent=<lead-id>` plus `paseo-cto.stream=<stream-plan-id>`.
3. Remain sole lifecycle owner of descendants. The CTO may observe but takes control only after a
   ledger-recorded handover or escalation.
4. Use isolated workspaces and `notifyOnFinish: false` for parallel children. Reconcile the ledger,
   descendants, permissions, returns, and tails every 15 minutes while the subtree is open; use one
   stable, expiring, ID-recorded stream heartbeat. Do not block independent children behind
   unrelated depth.
5. Apply the Review gate without restating or weakening it. Return substantial rework to its author
   and integrate only accepted commits without squashing. Apply the validation budget: reuse valid
   final-tree evidence and run only stream checks invalidated by composition or required by a new
   hypothesis. Keep every child writer commit reachable and ordered for the CTO's integration-delta
   review.

Never infer a stall from time alone: require two unchanged snapshots plus bounded activity,
terminal, permission, capacity, and external-wait checks. Before archiving an exact child, preserve
its report and durable evidence, require clean porcelain, prove commits reachable from the stream,
and resolve every run, permission, dispute, terminal, and tail; archive agent before workspace.
Record an error/closed retry, replacement, or discard decision before cleanup. Remove the stream
heartbeat only after handover or a clean subtree close.

Preserve acceptance evidence beyond archive through commits, an approved artifact store, or the CTO
checkpoint; disposable logs use only approved ignored/external paths and leave no untracked tail.
Never push or cross founder, project-plan, architecture, deploy, publication, live, money, or
irreversible gates.

Return under 2500 characters unless preserving a systemic finding: `ready|blocked|error`, every
child writer commit in integration order, child verdicts, exact checks, final Git state, durable
artifacts, handovers/escalations/disputes, and proposed plan children.
