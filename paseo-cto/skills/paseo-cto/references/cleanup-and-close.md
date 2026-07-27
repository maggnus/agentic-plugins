# Cleanup and close

Read this file when an accepted result is ready for cleanup, when a failed or stalled agent must be
retired, or when the run is being wound down. It is not needed at startup or during ordinary
dispatch.

## Archive an agent and its workspace

Run the [Review gate](review-gate.md) first. Returned work stays `reviewing` or `rework`; keep its
originating agent and workspace through unresolved findings or disputes. Before archival:

1. Capture the report, IDs, Git state and commits, the decision, and every piece of
   archive-surviving evidence required by the [Assignment contract](assignment-contract.md) and the
   Review gate.
2. Require empty `git status --porcelain` and prove accepted commits reachable from integration,
   unless an explicit preservation or discard decision is recorded. A report-only reviewer or
   researcher may close earlier when pre/post Git states match and its source commit stays reachable
   from a preserved builder branch.
3. Require no running turn, unresolved permission, dispute, needed terminal, or unrecorded tail.
   Normal closure is `idle` or `done`; a native `error`/`closed` record may close after diagnosis,
   state preservation, and a recorded retry/replace/discard decision.
4. Archive the exact agent, verify removal, then archive the exact workspace/worktree and verify
   again. Update runtime/plan and increment `Archived-since`.

Workspace archival may stop every agent and terminal there and remove the worktree; dirty,
unintegrated, disputed, or unknown states remain visible tails. Hard-delete only a proven empty,
test, corrupt, or duplicate exact record; never bulk-delete or routinely `kill_agent`.

## Close the run

Before context compaction, persist runtime and durable plan truth. Never archive the CTO while child
work, disputes, or unintegrated recoverable tails remain.

At a clean or quiescent close, resolve or preserve every result, retain durable owner-gated
branches, write the final STATUS render once, delete the heartbeat in the same turn, record the
exact resume point, then allow CTO archival.
