---
name: rad-ai-build
description: "Implement a bounded RAD outcome against its contract and return the exact revision with observed evidence."
---

# RAD implementation

Read the contract and project rules; verify workspace, base revision and write scope. Clarify implementation conditions and record uncertainty.

Trace affected modules and consumers. Resolve shared contracts before dependent edits. Implement minimal complete changes preserving boundaries and compatibility; justify dependencies against alternatives.

Check behavior, failures and consumers; correct defects found before submission. For significant changes and for every invariant the contract names, observe a failing form on the original defect or violated invariant. Never skip, weaken or refit checks to pass; justify changed tests. Read the complete diff and exclude unrelated work. In documents add decisions and requirements, not a restatement of the code, and verify every statement you add or change against the candidate. Before submitting, bring the current base into the candidate and rerun what it affects, so the accepted revision is the combined one. Stop only processes you started, by their identity, and leave nothing outside the workspace. When the contract covers an enumerated set, submit the coverage table with the revision; state each residual risk of any check that cannot be complete and what bounds it observably. Residuals follow the [contract's rule](../rad-ai/references/contracts.md). Stop at the contract's time budget and submit what exists with what remains. On an unchanged candidate, do not repeat a command or observation that already gave its answer, unless the contract names the repetitions; when no remaining step can change a decision, submit what exists with what remains. In an experiment make each listed observation once, answer the question, and list side observations in one line each without investigating them. Submit; never accept your own work.

Report base/result revisions or exact uncommitted state, changed paths, observed commands and exit statuses, limitations, unchecked conditions with what each would need, and observed rounds, time and cost. Integration and delivery require contract authorization.

Answer returned findings within scope: fix blocking defects and corrections, run each correction's named check and report its result. Change and rerun only what the findings and your delta affect; do not rewrite or re-verify the rest. Preserve the outcome's review round; corrected resubmission advances it once. Changed requirements, risk or base invalidate affected evidence. Without new evidence, identify the remaining condition. Do not infer stage totals from one delegated task.
