# Cleanup and close

Read this file when an accepted result is ready for cleanup, when a failed or stalled agent must be
retired, or when the run is being wound down. It is not needed at startup or during ordinary
dispatch.

## Retire an agent and its workspace

Run the [Review gate](review-gate.md) first. Returned work stays `reviewing` or `rework`; keep its
originating agent and workspace through unresolved findings or disputes. Before retirement:

1. Capture the report, IDs, Git state and source-linked commits, the decision, and every piece of
   surviving evidence required by the [Assignment contract](assignment-contract.md) and the Review
   gate. Apply [Source references](source-references.md) to every repository file or commit named in
   durable evidence.
2. Require empty `git status --porcelain` and prove accepted commits reachable from integration,
   unless an explicit preservation or discard decision is recorded. A report-only reviewer or
   researcher may close earlier when pre/post Git states match and its source commit stays reachable
   from a preserved builder branch.
3. Require no running turn, unresolved permission, dispute, needed terminal, or unrecorded tail.
   Normal closure is `idle` or `done`; a native `error`/`closed` record may close after diagnosis,
   state preservation, and a recorded retry/replace/discard decision.
4. Archive the exact agent, verify removal, then archive the exact workspace or worktree and verify
   again. Update runtime and plan, and increment `Archived-since`.

After an evidence-based `RETURN`, keep both author and reviewer workspaces through bounded rework by
default. Archive the reviewer early only when it is being replaced under the Review gate, or when
the review evidence and the exact continuation owner are durably preserved.

Workspace archival may stop every agent and terminal there and remove the worktree; dirty,
unintegrated, disputed, or unknown states remain visible tails. Never bulk-archive, and never use
`kill_agent` as routine cleanup.

## Delete the record once the card is integrated

An archived record is not free. It still appears in inventories, still occupies the runtime
checkpoint, and still has to be read and dismissed at every reconcile. Once a card is integrated,
its agent and workspace records are deleted, not kept.

Delete when all four hold:

1. the card is accepted and its commits are reachable from the integration branch;
2. the final report, the Git coordinates, and the source links are written into the task file;
3. the workspace reports an empty `git status --porcelain`, with no dispute, running turn, or
   pending permission;
4. the review is closed, so any further work needs a new card rather than a return.

Then archive the agent, archive the workspace so its worktree is removed, and drop both records from
the runtime checkpoint. The checkpoint carries live work only. What survives deletion is the task
file, the commits, and the candidate branch, which is retained until the wave is accepted: the
working copy goes, the history does not.

Anything that fails a condition stays as a visible tail with its blocker recorded. `Archived-since`
keeps counting retired cards; it is not a count of live records.

## Close the run

Before context compaction, persist runtime and durable plan truth. Never archive the CTO while child
work, disputes, or unintegrated recoverable tails remain.

At a clean or quiescent close, resolve or preserve every result, retain durable owner-gated
branches, write the final STATUS render once, delete the heartbeat in the same turn, record the
exact resume point, then allow CTO archival.
