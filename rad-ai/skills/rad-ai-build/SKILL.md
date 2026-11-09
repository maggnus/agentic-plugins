---
name: rad-ai-build
description: "Implement a bounded RAD outcome against its contract and return the exact revision with observed evidence."
---

# RAD implementation

Read the contract and project rules; verify workspace, base revision and write scope. Clarify implementation conditions and record uncertainty.

Trace affected modules and consumers. Resolve shared contracts before dependent edits. Implement minimal complete changes preserving boundaries and compatibility; justify dependencies against alternatives.

Check behavior, failures and consumers; correct defects found before submission. For significant changes, observe a failing form on the original defect or violated invariant. Never skip, weaken or refit checks to pass; justify changed tests. Read the complete diff and exclude unrelated work. When the contract covers an enumerated set, submit the coverage table with the revision; state each residual risk of any check that cannot be complete and what bounds it observably. A residual is a recorded limit only when it is not a reproducible violation of the acceptance criteria; it never covers a critical consequence and never replaces an owner exception (see [contracts](../rad-ai/references/contracts.md)). Submit; never accept your own work.

Report base/result revisions or exact uncommitted state, changed paths, observed commands and exit statuses, limitations and unchecked conditions. Integration and delivery require contract authorization.

Answer returned findings with corrections or reproducible evidence within scope. Preserve the outcome's review round; corrected resubmission advances it once. When a corrected resubmission is returned for a second defect of one class in the same component, redesign the class with one general rule and a coverage table, not another instance fix; the round history is kept. Defects of one class listed together in one review are one defect. Changed requirements, risk or base invalidate affected evidence. Without new evidence, identify the remaining condition. Do not infer stage totals from one delegated task.
