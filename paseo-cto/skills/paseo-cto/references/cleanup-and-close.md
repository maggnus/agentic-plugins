# Cleanup and close

Read this file when an accepted result is ready for cleanup, when a failed or stalled agent must be
retired, or when the run is being wound down. It is not needed at startup or during dispatch.

## Retire an agent and its workspace

Returned work stays `reviewing` or `rework` with its author and inspector until the loop ends.
Before retirement: capture the report, IDs, Git state, source-linked commits, the decision and
every piece of surviving evidence; require empty `git status --porcelain` and accepted commits
reachable from integration, unless a preservation or discard decision is recorded; require no
running turn, unresolved permission, dispute, needed terminal or unrecorded tail. A report-only
reviewer or researcher may close earlier when its pre/post Git states match.

**Stopping an agent is not cleanup.** A cancelled agent still holds its session, workspace,
worktree and whatever it left running. Retirement is the whole sequence, and a step skipped is a
tail, not a shortcut:

1. **Kill what the agent left running.** `list_terminals` scoped to its workspace; `capture_terminal`
   anything the evidence package still needs; `kill_terminal` each by exact ID; stop every workspace
   script this run started by name; re-list and require an empty result. Never kill by pattern or
   `--cwd` sweep, never a terminal of another run.
2. **Archive the agent**, verify removal.
3. **Delete the exact agent record** (`paseo delete <exact-agent-id>`) once the card is integrated:
   its commits are reachable from the integration branch, the report and Git coordinates are in the
   task file, the workspace is clean with no dispute or pending permission, and the review is
   closed. An archived record still answers every inventory and costs a read at every reconcile.
4. **Archive the workspace** so its worktree goes; verify that it went — `archive_workspace`
   reporting success while the worktree survives is exactly what this step catches.
5. **Drop both records from the checkpoint** through `ledger.py retire`.

Delete by exact ID, one record at a time; never bulk-archive, never `kill_agent` as routine
cleanup. Paseo archival preserves the session journal; deletion applies to the live record, the
runtime record and the working copy. The task file, commits and candidate branch survive, and the
branch is retained until the wave is accepted: the working copy goes, the history does not. The
archived journal is diagnostic history, not a substitute for the source-linked evidence step 1
requires. A dirty, unintegrated, disputed or unknown state stays a visible tail with its blocker.

## Close the run

Before context compaction, persist runtime and durable plan truth. Never archive the CTO while
child work, disputes or unintegrated recoverable tails remain.

At a clean or quiescent close, resolve or preserve every result, retain owner-gated branches, write
the final render once, then run the whole teardown in that same turn:

1. **Every child agent stops and goes**, enumerated from the run's own labels — `paseo ls --global
   --label paseo-cto.project=<project> --json` — not from memory: terminals killed, agent archived,
   record deleted.
2. **Every schedule and the heartbeat go**: `list_schedules`, then `delete_schedule` by exact ID,
   and `delete_heartbeat` for the recorded heartbeat. A schedule outliving its run wakes an agent
   into a project that no longer expects it.
3. **Every process they started stops**, as above.
4. **Every workspace is archived** and its worktree removed, each verified.
5. **Absence is proved, not assumed**: re-run the label-scoped inventory, `list_workspaces`,
   `list_schedules` and `list_terminals`, and require each to hold nothing of this run.

The close is not announced until step 5 passes. Anything that survives is named in the final status
as a tail with its blocker and owner, so a leftover is a decision on the record rather than a
discovery three days later. Only then may the CTO be archived.
