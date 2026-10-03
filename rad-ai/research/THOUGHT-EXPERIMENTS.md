# Thought experiments

Run: 2026-10-03. These are manual applications of the method to defined scenarios, not empirical productivity results. Each row identifies the initial condition, decision through the cycle and observable failure.

| Scenario | Cycle decision | Rejection or recovery observation |
| --- | --- | --- |
| Small new application; product purpose uncertain | Frame one user outcome, show the minimal path, record feedback before dependent expansion; use one implementer | A generated feature set without representative feedback leaves the product hypothesis unresolved |
| Established local correction in a large application | Trace the entry point and affected consumers; skip product prototyping; implement the bounded correction | A repository-wide redesign exceeds the outcome and is separated from the correction |
| Shared API change with several consumers | Establish the contract first, then implement consumers and check the combined revision | Two locally successful branches with incompatible assumptions fail integration acceptance |
| Schema transition with mixed versions | State invariant, migration conditions, compatibility window and recovery; classify consequence | A proposed ordinary rollback without data recovery is insufficient for irreversible conversion |
| Separate workspaces modifying related modules | Verify isolation, then assess semantic dependencies; serialize shared contracts | No line conflict is not evidence of compatible behavior |
| Requirement changes after prototype | Record the new requirement, invalidate affected work and preserve independent outcomes | Continuing dependent work on the old assumption fails current acceptance |
| Author and reviewer share an assumption | Derive expected behavior from the contract and exercise a discriminating input | Agreement alone cannot accept a result; observed behavior determines the finding |
| Context loss or interrupted process | Reconcile revision, records, actual process outcome and unfinished work | A missing result remains unchecked; time elapsed cannot establish completion |
| Existing tests pass; user outcome fails | Walk the actual scenario and relevant failure paths | The contracted defect returns the change even when the old suite is green |
| Large dependency surface with an unknown consumer | Expand investigation and record uncertainty before integration | A successful bounded check does not close an unresolved external contract |
| Time budget exhausted | Reduce scope or stop dependent work, keeping acceptance criteria | Budget consumption does not change the invariant or permit a false completion report |
| Independent review unavailable for critical consequences | Prepare the implementation and identify missing evidence | Critical delivery remains unverified until the required independent assessment exists |

## Changes resulting from the exercise

The operational instruction distinguishes acceptance from delivery, prototype retention from production acceptance, file isolation from semantic independence, and unavailable evidence from a negative finding. It permits established local corrections to skip unnecessary discovery. It requires rechecking the combined revision and preserves independent completed work after a requirement change.

The scenarios expose decisions; they do not prove that agents consistently follow the instruction. That is tested in [the practical evaluation](EVALUATION.md). Longitudinal architecture and giant-repository investigation remain separate empirical obligations.
