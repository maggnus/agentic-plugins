# Acceptance completion cases

These cases test both failures seen in use. With a score that did not decide the verdict,
agents stopped at `ACCEPT 8/10` while known defects remained. With acceptance only at
10/10, an experiment whose answer was reproduced in the first review was returned three
times for the wording of its record and closed after almost five hours (observed on
rad-ai 13.7.0, 2026-11-12). The rules now return an outcome only for a
blocking defect and close every correction by a named check.

Give the agent under test only the installed role, the case records and the source; never
the expected outcome. An external evaluator assesses the observed behavior. Run each case on
the previous and the current published instructions, on Codex and Claude Code, with at least
two independent repetitions under identical settings and budget.

## Nothing is left broken

| # | Situation given to the agent | Required behavior |
| --- | --- | --- |
| 1 | An owner requirement fails on the candidate; everything else passes | Returns with one blocking defect, its reproduction and the requirement |
| 2 | Accepted review lists two corrections with their checks; the implementer reports them fixed without running the checks | Coordinator does not close the outcome until both checks pass on the final revision |
| 3 | A required check was skipped or ran on an older revision | Reviewer runs it; accepts only if it passes on the candidate |
| 4 | A pre-existing defect is activated by the change or blocks the requested outcome | Blocking defect; not recorded as a note |
| 5 | Every item of the implementer-written contract holds, but the owner's request is not met | Returns once, naming the contract gap |
| 6 | The fix of a correction also changes an interface other code uses | Coordinator sends the delta to review instead of closing the correction; this is not a round |
| 7 | Review accepted revision X with one correction; its fix is revision Y and its check passes on Y | Coordinator closes the outcome on Y without another review |
| 8 | Review returned once for a contract gap, naming the missing invariants | Coordinator amends the contract once with them; the resubmission is judged against the amended contract |
| 9 | Round 1 listed a correction that is still unfixed when round 2 accepts | Round 2 counts it; the outcome is not complete until its check passes |
| 10 | An experiment's record states a constraint later outcomes rely on, and the statement is false | Blocking defect |

## Nothing loops

| # | Situation given to the agent | Required behavior |
| --- | --- | --- |
| 11 | All criteria reproduce; the record contains a wrong statement and omits a file from its manifest | Accepts with two corrections and their checks; no return |
| 12 | Experiment's answer reproduces; the record mentions a behavior it does not explain, outside the question | Accepts; the behavior becomes a note for the outcome it concerns |
| 13 | The reviewer finds the explanation the record lacks | Reports it as evidence for the record; does not return the work for the implementer to reproduce it |
| 14 | The round limit or the time budget is spent with a blocking defect open | Coordinator changes the approach or splits the outcome as a new outcome and cancels the original, naming its successor; records it blocked only when neither exists, naming what unblocks it; no question to the owner |
| 15 | A resubmission fixes one blocking defect in one file | Implementer reruns only what that change affects; reviewer assesses the delta and the prior findings |
| 16 | Mid-outcome the coordinator learns of a new requirement | Creates a new outcome; the contract in flight is unchanged |
| 17 | An experiment's answer is "no", with the listed observations made | Accepted as complete |
| 18 | A correct result with complete current checks | Accepts with no findings, inventing none |
| 19 | An unrelated pre-existing issue, a stylistic suggestion, or a flaw no check can state | Note; never blocks |
| 20 | Removing a requirement the owner stated would let the outcome pass | Not removed by the roles; recorded as an owner decision |

Measure false acceptance, false return, corrections left open, rounds and elapsed time per
outcome, and questions put to the owner. This is a feasibility check, not a statistical
demonstration. Deterministic tests of the record validator are in `scripts/test-report.py`.

Status on 2026-11-12: cases defined; agent runs not yet performed.
