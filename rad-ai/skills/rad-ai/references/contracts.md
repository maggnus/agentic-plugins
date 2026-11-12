# Records

## Acceptance list

`acceptance.json` beside the stage's records:

```json
{"stage": "W5", "items": [{"id": "A1", "behavior": "A visitor resets a forgotten password",
  "steps": ["Open /login, choose Forgot password", "Submit a registered address: a reset message arrives"],
  "passes": false}]}
```

An item is one behavior a user or consumer can observe; its steps say what to do on the running result and what must be seen. Write it at Frame from the owner's words: every item passing is what the owner asked for. On acceptance the coordinator sets `passes` true, with the accepted `revision`, on the items the review reports as passing, those of earlier rounds untouched by the delta included; a return sets nothing, and an item later seen to fail goes back to false. Otherwise the list changes in three ways only: a contract amendment or a new outcome adds items; a reviewer's finding corrects a step that misdescribes the way to a delivered behavior, keeping what must be seen; the owner alone changes a behavior or removes an item. Each rewording records its finding or decision in the item's `amended`, anew each time. Whenever it sets `passes`, the coordinator runs `report.py acceptance <list> --previous <list at the stage's base, or at the commit recording a removal>`, which rejects a removed item and a rewording without a new `amended`.

## Project commands

The repository's rules or README record one run command that starts the result ready for use and one check command that runs every required check and fails when any fails. An outcome that adds a required check adds it there. Roles use these commands, not their own.

## Outcome contract

Outcome, kind (delivered or experiment), acceptance items, failures, exclusions, invariants, risk, base commit, workspace and write scope, consumers, dependencies, checks, time budget for the whole outcome with rework and review, round limit and authorization. An experiment's contract states its one question and the closed list of observations that answer it. A general owner requirement (clean, fast, explained) applies to delivered outcomes and the stage's exit, not to an experiment's record.

- **Enumerated scope.** When acceptance covers a set (components, methods, states), name the set; the submission carries a coverage table, element by means of coverage. A gap found later is one blocking defect of the table.
- **Required evidence.** Name, before implementation, what needs discriminating evidence (a check seen to fail when the property is broken) and the observations to make on real dependencies. A code variation that survives the checks is blocking when it breaks a critical consequence, a correction (its check: the variation fails) when it breaks a named invariant or criterion, otherwise a note.
- **Postponed observations.** Only the contract postpones an observation the candidate cannot make, recording what is unobserved, why, the outcome that will make it and what bounds the risk meanwhile. Roles propose, never mark. For a critical consequence the owner decides.
- **Documents.** Statements a delivered outcome adds are claims checked against the candidate; a false one blocks only when it misstates a requirement, the answer or a constraint others rely on, otherwise it is a correction. A submission record is evidence, not a deliverable: check only the statements the verdict depends on.
- **Heuristic checks.** A check that cannot be complete (scanner, filter) states each residual risk and its bound. A residual is a recorded limit only when it is not a reproducible violation of acceptance and its bound is observable (a test or limit that fails when exceeded); otherwise it is a blocking defect. It never covers a critical consequence.
- **Outcome record.** ID, requirements, revision, state, review rounds with observed cost, evidence including the reviewer's observations, open corrections with their checks, postponed observations, decisions, next step. Reopening reduces completion.

## Findings

Scope is the owner's request, project rules, affected scenarios and invariants, beyond the written contract.

- **Blocking defect.** In what the outcome delivers: an acceptance item whose steps fail, unless the behavior is delivered and a step only misdescribes the way to it (a correction); a required behavior stubbed or only displayed; a reproducible violation of an owner requirement, project rule, named invariant or criterion, or critical consequence; a regression in an affected scenario or consumer; a pre-existing defect the change activates or that blocks the outcome; required evidence the reviewer could not obtain either; a contract gap that leaves an owner requirement unverified. Only this returns an outcome. Nobody defers one.
- **Correction.** Any other flaw in scope that a check can confirm fixed: a wrong statement, a missing record entry, a local fault no requirement covers. Its check, a command or observable procedure, fails before the fix and passes after. The coordinator closes it when the check passes on the final revision; a fix that changes anything beyond the correction returns to review as a delta. Never left open or moved to later work.
- **Note.** A suggestion, an unrelated pre-existing issue, an observation the requirements do not cover, or a flaw no check can state. It becomes a task where it belongs or is declined with a reason.

An empty finding list alone does not accept: acceptance needs verified requirements and current required checks. Only a corrected resubmission after a return advances the round; repeated assessment, restarts, reviewer changes and a correction's delta review do not. A changed approach after the limit is a new outcome with its own contract.

## Reports

The status line is defined in the main skill. Its input is a fresh snapshot: `stage`, `tasks` with `id` and `state` (ready, active, review, blocked, done, cancelled), `decisions` with `id`, `state` (open, resolved) and boolean `requires_human`. Active and review tasks are in flight; only current completion is done. Contradictory duplicate IDs or missing records make the report unavailable.

`verdict` checks a review record; `complete` checks that every correction is resolved with `result` and `revision` on the accepted commit, or on `final` when fixes followed it.
