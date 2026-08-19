---
name: team
description: Delivery discipline for a small project without any fleet machinery. Split the work into outcomes that can be judged, size the check to what a defect would cost, prove a check can fail before trusting it, delegate reads in parallel and writes one at a time, and review a change before it lands. Invoke as `$team:team` in Codex or `/team:team` in Claude.
---

# Team

A small project does not need workspaces, snapshots or a task database. It needs four things: work
split into outcomes that can actually be finished and judged, checks proportionate to what a defect
would cost, evidence that each check is able to fail, and a reading of the diff by someone who did
not write it. This file is the whole method; there is nothing else to load.

## Run the work

1. **Split the request into outcomes, not steps.** An outcome is one result a reader can check —
   "the importer rejects a malformed row with a named error", not "edit the parser". Each one names
   what it produces, how it is judged, and what it deliberately leaves alone. Anything that needs
   more than roughly a day of work, spans unrelated surfaces, or cannot be judged as one story is
   two outcomes.
2. **State the plan once, before the first edit**, as a short list of those outcomes in the order
   they will land. Keep it in the reply and in commit messages. Do not create a state directory, an
   index, or a generated file to track it; the repository and its history already are the record.
   Revise the list out loud when reality changes it — a silently abandoned outcome reads as done.
3. **Land one outcome at a time.** Finish, check, and commit it before starting the next. A branch
   with three half-finished outcomes cannot be reviewed and cannot be reverted cleanly.

## Size the check to the risk

Classify each outcome by the credible consequence of a defect, not by how big the diff is:

- **Routine** — the worst credible failure is local, obvious, and reversible. Run the targeted check
  for the changed behaviour and read the complete diff before committing.
- **Significant** — behaviour users depend on changes, but damage stays bounded and noticeable. Add
  the failure path, not only the success path, and have the change reviewed before it lands.
- **Critical** — a defect could touch authentication, authorization, money, privacy or secrets, data
  loss or corruption, an irreversible action, or a published interface. Require an independent
  review, at least one check that would genuinely fail if the invariant broke, and explicit owner
  approval before anything irreversible.

Uncertainty rules out Routine; it does not by itself create Critical. Touching a shared component,
a migration, or build and test infrastructure is at least Significant unless the change is
mechanically bounded.

## Prove the check can fail

A green command proves nothing until its failing form has been seen. Before offering any check as
evidence, break the thing it guards — revert the fix, corrupt the input, remove the guard clause —
run the same command, and keep the real failing output. State in one sentence what the check
distinguishes and what it would pass anyway. Checks that share a claim share one broken input;
unchanged compilers, formatters and linters need no ceremony.

Report a command and its real exit status, never "tests pass". If a check was not run, say so.

## Delegate reads in parallel, writes one at a time

Subagents in this setup share one working copy, so file ownership is a promise, not a boundary.

- **Reading work runs in parallel**: locating call sites, surveying conventions, reproducing a bug,
  reviewing a diff. Give each one its question, the paths worth reading, and the exact shape of the
  answer; tell it to return findings with file and line references and to change nothing.
- **Writing work runs one at a time.** Two agents editing the same tree overwrite each other without
  either noticing. If work must be split across writers, split it in sequence, not in parallel.
- Every delegated result is checked against the source before it is used. A subagent's summary is a
  claim, not evidence — open the file it cites.

## Review before landing

A Significant or Critical change is read by an agent that did not write it, in a fresh session,
against the outcome and its acceptance — not against the author's account of what was done. That
review inspects the complete diff, checks that the evidence exercises a path the product actually
reaches, and returns either `ACCEPT` or `RETURN` with each finding named precisely. A Routine change
is accepted after its author reads the whole diff once more, deliberately.

Sort every finding before deciding: a defect in the contracted outcome can force a return; a
neighbouring problem, a refinement, or an idea for later is recorded and left to its own work item.
A review that grows the scope of the change it reviews has stopped being a review.

## Converge — the second return forces a decision

Each round of findings looks justified on its own, so a change can keep returning long after the
behaviour stopped improving. After the **second** return on one outcome, choose in that same turn:

- **accept with residue** — the outcome is met, the remaining limitation is written down where it
  will be found again, and it names the exact condition that reopens it;
- **split** — move the unresolved part into its own work item with its own risk and acceptance, and
  land the settled part;
- **name the blocker and stop** — say what prevents convergence and who must resolve it.

Residue is forbidden when the failure could not be undone once noticed, or would not announce
itself. Authentication, money, privacy, data loss and irreversible actions fail both tests routinely:
those return instead.

## Landing and owner gates

Commit locally in coherent commits with a clean working tree. Push, deploy, publish, migrate a
schema, rotate or read secrets, spend money, and any irreversible action are the owner's decision
each time, not a standing permission. Ask once, plainly, with what will happen and what it costs to
undo.

## Reporting

Lead with the outcome, then the evidence, then what remains. Write about the work, not about who did
it: no first person, no apology, no process narrative, no claim that something was verified without
the command that verified it. Say plainly when something was skipped, assumed, or left unproven —
an unstated gap is the one that costs the project later.
