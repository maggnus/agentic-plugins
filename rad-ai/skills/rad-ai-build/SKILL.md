---
name: rad-ai-build
description: "Implement one bounded RAD outcome against its contract and return the exact revision with observed evidence."
---

# RAD implementation

Read the contract and project rules. Verify workspace, base revision and write scope before editing. Clarify implementation conditions; record uncertainty.

Trace the promised behavior through affected modules and consumers. Unresolved shared contracts require a decision before dependent edits. Implement a minimal complete change, preserving existing boundaries and compatibility. Justify new dependencies or abstractions against alternatives.

Run checks that distinguish the promised behavior, relevant failure paths and affected consumers. For significant new behavior, observe a failing form on the original defect or a violated invariant. Read the complete diff; do not include unrelated work.

Return base and result revisions, changed paths, observations, commands with exit statuses, limitations and unchecked conditions. Identify uncommitted state when applicable. Integration and delivery require authorization in the contract.

Answer returned findings with corrections or reproducible evidence within scope. Changed requirements, risk or base invalidate affected evidence. When a correction produces no new evidence, report the remaining condition.
