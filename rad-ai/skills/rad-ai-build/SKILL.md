---
name: rad-ai-build
description: "Implement a bounded RAD outcome against its contract and return the exact revision with observed evidence."
---

# RAD implementation

## Preparation

1. Read the outcome contract, its items in `acceptance.json` and project rules.
2. Verify workspace isolation, base commit and permitted write paths. If the workspace has no Git repository, initialize one before editing.
3. Verify the base before editing: run `smoke` (or `check` when fast) unless a clean pass on the exact `HEAD` commit is already recorded. Unless repairing the base is the contracted outcome, stop and report a failing base instead of building on top of it.

## Implementation

- Trace affected entry points, modules, shared schemas and consumers before editing; settle shared contracts prior to dependent code.
- Make minimal, complete changes that preserve module boundaries and backward compatibility; justify any new dependency.
- Never stub, mock out or fake a required product behavior.
- Update documents only for decisions, requirements or user-facing contracts changed by this outcome; verify every added statement against the candidate instead of restating code.

## Verification before submission

1. **Discriminating checks.** Exercise normal paths, failure paths and affected consumers. For every contracted invariant and significant behavior change, observe the check fail when the guarded property is broken before trusting its pass. Never skip, weaken or refit a check to pass; justify any edit to existing tests.
2. **Required suite.** Run the project's full `check` command on the candidate.
3. **User's-eye walk.** Start the application with the project's `run` command and perform each contracted acceptance item's steps as an actual user or consumer (browser, CLI, API client), recording what each step produced. Code reading and unit tests never replace this walk.
4. **Clean candidate.** Bring the current base into the candidate if it moved, rerunning what the merge affects. Read the complete `git diff`; remove unrelated edits and ensure `acceptance.json` was not modified.
5. **Commit and cleanup.** Commit the candidate. Stop only processes you started and leave no temporary files outside the workspace.

## Convergence and returned work

- **Do not loop**: on an unchanged candidate never repeat a command or observation that already gave its answer unless the contract specifies repetitions.
- **Experiments**: perform each listed observation in the closed list once, answer the single question ("yes" or "no" with supporting measurements) and note side observations in one line each.
- **Budget boundary**: when no remaining action can change a decision, or when the time budget is reached, commit and submit what exists with an explicit list of what remains unchecked.
- **Returned findings**: on `RETURN` or open corrections, fix the blocking defects and corrections, run each correction's named check and report its exit status and output; modify and rerun only what the findings and your delta affect.

## Submission report

Report:
- base and candidate commit hashes and changed file paths;
- observed result of each acceptance item's steps;
- executed commands with exact exit statuses;
- unchecked conditions and what each requires;
- elapsed time and token/tool usage if available;
- the coverage table or residual-risk bounds required by [contracts](../rad-ai/references/contracts.md).

Never edit `acceptance.json`, accept your own work, report stage-wide totals from a single outcome, or integrate/deliver without explicit contract authorization.
