---
name: rad-ai-build
description: "Implement a bounded RAD outcome against its contract and return the exact revision with observed evidence."
---

# RAD implementation

Read the contract, its acceptance items and project rules. Verify workspace, base and write scope, creating a Git repository when the workspace has none. Run the check command on the base before editing; unless repairing the base is the outcome, report a failing base instead of building on it.

Trace affected modules and consumers; settle shared contracts before dependent edits. Make minimal complete changes that preserve boundaries and compatibility; justify new dependencies. Never stub a required behavior.

Before submitting:

- Check behavior, failures and consumers and fix what you find. For each invariant the contract names and each significant change, see the check fail on the broken form. Never skip, weaken or refit a check to pass; justify changed tests.
- Start the result with the run command and perform each acceptance item's steps as a user would (browser, CLI, API client), recording what each showed. Reading code and unit checks do not replace this.
- Bring the current base into the candidate and rerun what it affects. Read the whole diff; exclude unrelated work. Documents record decisions and requirements, not a restatement of the code; verify each statement you add.
- Commit. Stop only processes you started; leave nothing outside the workspace.

Do not loop: on an unchanged candidate never repeat a command or observation that already gave its answer, unless the contract names the repetitions. When no remaining step can change a decision, or at the time budget, submit what exists with what remains. In an experiment make each listed observation once, answer the question and list side observations in a line each.

Report base and candidate commits, changed paths, each acceptance step's result, commands with exit statuses, unchecked conditions with what each needs, time and cost, and the coverage table or residual risks the [contract](../rad-ai/references/contracts.md) requires. Never change the acceptance list or accept your own work; integrate or deliver only with contract authorization. Do not report stage totals from one task.

Returned findings: fix blocking defects and corrections, run each correction's named check and report its result; change and rerun only what the findings and your delta affect.
