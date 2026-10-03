---
name: rad-ai
description: "Develop applications through bounded RAD cycles: investigate uncertainty, implement, integrate and accept outcomes against explicit quality constraints."
---

# RAD AI

Optimize time to accepted outcomes under quality constraints. The method is experimental. Respect scope, project rules and existing authorization.

## Cycle

1. **Frame.** Inspect requirements, architecture and revision. Record the user outcome, exclusions, acceptance, invariants, dependencies, budget and current plan in existing records. Clarify uncertainty affecting the next decision. Planning requests end with a plan.
2. **Experiment.** Test consequential uncertainty before dependent work. Product assumptions require representative feedback; technical assumptions require discriminating evidence. Agent agreement is insufficient. Record observations and decisions. Discard prototypes, retain experiments, or apply production acceptance. Established corrections need no prototype.
3. **Partition.** Define assessable outcomes using [contracts](references/contracts.md); investigate broad dependencies using [scale](references/scale.md). Start with one implementer. Delegate authorized independent outcomes within review capacity. Serialize shared-workspace writes; concurrent writers require verified isolation. Shared contracts precede consumers. Reduce concurrency as queues, conflicts or rework grow.
4. **Implement.** Preserve boundaries, inspect consumers and make minimal complete changes. Justify new dependencies against alternatives. Test behavior and failure paths, including a discriminating failing form for significant changes. Use the included [implementation role](../rad-ai-build/SKILL.md) when delegating; otherwise perform these duties directly.
5. **Accept.** Local reversible consequences require targeted checks and complete diff assessment; cross-module or user-visible changes add consumer checks and independent review where available. Critical consequences, including data loss, access, disclosure or irreversible effects, require independent review and discriminating evidence; missing evidence prevents delivery. Acceptance binds to requirements and revision. Use the included [review role](../rad-ai-review/SKILL.md) when delegating. Return contracted defects; record adjacent findings separately.
6. **Integrate.** Combine accepted outcomes by dependency and verify consumers and user paths on the combined revision. Invalidate affected evidence after requirements or revision changes. Without new evidence, split, revise the approach or identify the blocking condition.
7. **Deliver and learn.** Perform authorized delivery with observed success and recovery. Verify the target and obtain feedback; identify local acceptance when delivery is outside scope. Budget limits reduce scope without weakening quality. Choose subsequent work from observations.

## Reports

Text reviews start `ACCEPT Rn (s/10)` or `RETURN Rn (s/10)`; unavailable assessment uses `UNVERIFIED Rn (n/a)`. Rounds start at 1 per outcome and advance after corrected resubmission; repeats, restarts and reviewer changes preserve them. Score the lowest applicable code/evidence/user-path axis using the contract rubric. Requirements determine the verdict independently of score.

Before every progress report, reconcile current task and decision records; calculate `<stage>(p%) 📋 N ⚙️ A 🙋 B`. Exclude cancelled tasks. N counts eligible tasks; D counts currently completed outcomes; A counts implementation/review; B counts distinct unresolved human-only decisions. Round p=100D/N half-up; empty stages use 0%. Never reuse displayed values or invent missing records. The optional [formatter](scripts/report.py) implements these rules.

Preserve completed independent work after interruption. Report revision, observed commands, exit statuses, limitations and next step. Measure elapsed time, effort, cost, waiting and rework; compare improvement against a baseline.
