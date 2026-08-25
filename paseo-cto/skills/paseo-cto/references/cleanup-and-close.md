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

**Stopping an agent is not cleanup.** An agent whose run was cancelled still holds its session, its
workspace, its worktree and whatever it left running. Retirement is the whole sequence — terminals
killed, agent archived and deleted, workspace archived, records dropped, absence verified — and a
step skipped is a tail, not a shortcut.

Workspace archival may stop every agent and terminal there and remove the worktree; dirty,
unintegrated, disputed, or unknown states remain visible tails. Never bulk-archive, and never use
`kill_agent` as routine cleanup.

## Kill what the agent left running

An agent leaves more than a session behind: workspace terminals, a dev server, a watcher, a tail
following a log, a script started through the workspace. Archival may stop them as a side effect,
and may not; a process that survives holds a port, a lock, or a file handle that the next dispatch
then fails on for reasons nobody connects to this card.

Before archiving anything, for each retiring agent:

1. `list_terminals` scoped to its workspace. Capture what any of them still holds that the evidence
   package needs — `capture_terminal` reads without sending input — then `kill_terminal` each by
   exact ID.
2. Stop every workspace script this run started, by its exact name.
3. Re-list and require an empty result. A terminal that will not die is a named tail with its
   blocker, not a rounding error.

Never kill a terminal belonging to another run, and never kill by pattern or `--cwd` sweep.

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

Then, in this order: kill the terminals and scripts as above; archive the agent; **delete the exact
agent record** (`paseo delete <exact-agent-id>`), because an archived record still answers every
inventory and still costs a read at each reconcile; archive the workspace so its worktree is removed;
and drop both records from the runtime checkpoint. Verify after each step — an unverified archive is
a claim, and `archive_workspace` reporting success while its worktree survives is exactly the state
this rule exists to catch.

Delete by exact ID, one record at a time. A bulk delete, a `--cwd` sweep, or a glob is never the
cleanup path, whatever the list looks like.

Paseo archival preserves the session journal; deletion here applies to the live agent record, the
runtime record and the working copy. The task file, commits, and candidate branch survive, and the
branch is retained until the wave is accepted: the working copy goes, the history does not. The
archived journal is diagnostic history, not a substitute for the source-linked evidence that step 1
requires before archival.

Anything that fails a condition stays as a visible tail with its blocker recorded. `Archived-since`
keeps counting retired cards; it is not a count of live records.

## Close the run

Before context compaction, persist runtime and durable plan truth. Never archive the CTO while child
work, disputes, or unintegrated recoverable tails remain.

At a clean or quiescent close, resolve or preserve every result, retain durable owner-gated
branches, and write the final STATUS render once. Then run the whole teardown in that same turn —
not the parts that are convenient:

1. **Every child agent stops and goes.** Enumerate them from the run's own labels rather than from
   memory or the checkpoint — `paseo ls --global --label paseo-cto.project=<project> --json` covers
   the ones an interrupted turn never recorded. For each: terminals killed, agent archived, agent
   record deleted.
2. **Every schedule and the heartbeat go.** `list_schedules` for this run, then `delete_schedule` by
   exact ID; `delete_heartbeat` for the recorded heartbeat. A schedule outliving its run wakes an
   agent into a project that no longer expects it, which is worse than a leaked record.
3. **Every process they started stops**, under *Kill what the agent left running*.
4. **Every workspace is archived** and its worktree removed, each verified.
5. **Absence is proved, not assumed.** Re-run the label-scoped agent inventory, `list_workspaces`,
   `list_schedules` and `list_terminals`, and require each to hold nothing belonging to this run.

The close is not announced until step 5 passes. Anything that survives it is named in the final
status as a tail with its blocker and its owner — a preserved dispute, an owner-gated branch, a
workspace someone must inspect — so a leftover is a decision on the record rather than a discovery
three days later. Only then may the CTO be archived.
