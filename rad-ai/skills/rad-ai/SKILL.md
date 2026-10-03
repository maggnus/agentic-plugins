---
name: rad-ai
description: Run a bounded Rapid Application Development cycle for application creation or evolution: investigate uncertainty, implement, integrate and accept outcomes against explicit quality constraints.
---

# RAD AI

Optimize elapsed time to an accepted outcome subject to explicit quality constraints. The method is experimental; report observed results and uncertainty. Respect the requested scope, project rules and existing authorization.

## Cycle

1. **Frame.** Inspect current requirements, architecture and revision. State the user, intended outcome, exclusions, acceptance criteria, invariants, dependencies and available budget. Clarify uncertainty affecting the next decision. Keep the current plan in existing records. A planning request ends with a plan.
2. **Experiment.** Identify the uncertainty that could invalidate dependent work. Choose an observation that distinguishes alternatives before implementing them. Product assumptions require representative user feedback; technical assumptions require executable evidence. Agent agreement is insufficient. Record the observation and decision. Discard prototypes, retain experiments, or apply production acceptance. Known changes need no prototype.
3. **Partition.** Define independently assessable outcomes using [contracts](references/contracts.md). For a broad dependency surface, use [scale](references/scale.md). Start with one implementer. Delegate authorized independent outcomes within integration and review capacity. Serialize writes in a shared workspace; concurrent writers require verified isolation. Shared contracts precede dependent changes. Reduce concurrency as queues, conflicts or rework grow.
4. **Implement.** Inspect affected consumers, preserve boundaries and produce a minimal complete change. Test the promised behavior and relevant failure paths. New abstractions require an identified need and considered alternatives. Delegation can use the included [implementation role](../rad-ai-build/SKILL.md); otherwise perform these duties directly.
5. **Accept.** Assess consequence: local reversible defects need targeted checks and a complete diff read; cross-module or user-visible changes also need consumer checks and independent review where available; critical consequences (data loss, unauthorized access, disclosure or irreversible effects) require independent review and evidence that rejects a violated invariant. Missing critical evidence prevents delivery. Use the included [review role](../rad-ai-review/SKILL.md) when delegating. Acceptance binds to exact requirements and revision. Compilation alone does not demonstrate a user outcome. Return only contracted defects; record adjacent findings separately. Rework requires new evidence, not weaker criteria.
6. **Integrate.** Combine accepted outcomes in dependency order. Verify affected consumers and the user path on the combined revision. Changed requirements or base revisions invalidate affected evidence. Without new evidence, split, revise the approach or identify the blocking condition.
7. **Deliver and learn.** Perform authorized delivery with observable success and recovery conditions. Check the target environment and obtain feedback; if delivery is outside scope, identify the local acceptance boundary. At a budget limit, reduce scope or stop dependent work without weakening quality. Choose the next cycle from observations.

## Continuity

After interruption, reconcile revisions, requirements, work and evidence before resuming. Preserve completed independent outcomes. Report outcome, commands and exit statuses, unchecked conditions and next step. Measure elapsed time, human effort, model cost, waiting and rework; claim improvement only against a comparable baseline.
