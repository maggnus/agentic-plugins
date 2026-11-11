# RAD AI method

Status: experimental method. Operational rules are in [the main skill](skills/rad-ai/SKILL.md); evidence and limitations are in [foundations](research/FOUNDATIONS.md) and [evaluation](research/EVALUATION.md).

## Objective and unit of work

The optimization target is elapsed time from an application need to an accepted observable outcome, subject to functional, architectural and operational constraints. Output volume, agent count and local test success are intermediate observations. Quality is a feasibility constraint, not a weighted term that faster implementation can offset.

A cycle covers a bounded user or consumer outcome. Its records identify requirements, exclusions, invariants, dependency surface, revision, budget, evidence and unresolved conditions. Existing project records are sufficient. The method does not impose a separate task system, model, provider or execution service.

## Adaptation of RAD

| RAD function | Agent development mechanism | Transition condition |
| --- | --- | --- |
| Requirements planning | Establish a bounded outcome and investigate affected architecture | Acceptance is observable; unknown decisions and dependencies are explicit |
| User design | Test a consequential product or technical assumption | The discriminating observation supports a decision; unavailable feedback remains unavailable |
| Construction | Implement independent outcomes under stable contracts | Behavior and affected consumers satisfy acceptance on an identified revision |
| Cutover | Integrate, perform authorized delivery, observe the target and obtain feedback | The combined result is verified within the delivery scope; recovery and unresolved conditions are recorded |

Transitions may return to earlier decisions when evidence invalidates assumptions. Established corrections can omit product prototyping. An implementation agent's approval is not representative user feedback. A prototype has an explicit disposition; retaining it does not exempt it from production criteria.

## Design hypotheses and falsification

| ID | Design hypothesis | Observation that rejects its application |
| --- | --- | --- |
| H1 | Earlier discriminating experiments reduce dependent rework | Experiment overhead exceeds avoided rework on comparable outcomes |
| H2 | Bounded contracts support independent implementation | Nominally separate outcomes repeatedly change one semantic contract |
| H3 | Concurrency helps within integration and review capacity | Queueing, conflicts or correction cost increase elapsed time or cost |
| H4 | Revision-bound acceptance prevents reuse of stale evidence | A changed revision is accepted without checking affected evidence |
| H5 | Incremental dependency tracing can supply adequate context | A material consumer or invariant is missed by the scoped investigation |
| H6 | Repeated cycles can preserve architectural changeability | Coupling, duplication and cost of comparable subsequent changes increase |

These are design hypotheses, not consequences proven by the cited studies. The first release evaluates bounded feasibility and decision behavior. General acceleration and giant-repository capability require controlled comparative and longitudinal trials.

## Consequence and acceptance

Local reversible consequences require targeted checks and a complete diff assessment. Cross-module or user-visible consequences additionally require failure-path and consumer assessment. Every acceptance comes from a separate review context. Critical consequences additionally require evidence that rejects a violated invariant. If that evidence is unavailable, implementation can be prepared, but critical delivery cannot be accepted.

Acceptance identifies exact requirements and revision. Integration is a separate obligation: independent branch acceptance does not prove combined compatibility. A return identifies a defect and the observation needed to close it. Scope follows the owner request, project rules, affected scenarios and invariants rather than only the written contract; pre-existing defects the change activates or that block the outcome are in scope. Suggestions and unrelated pre-existing issues become separate work. Only a separate review context accepts; implementers and coordinators submit, and a returned outcome closes only after review of its current revision. Repetition without new information changes the approach or identifies a blocking condition; it never lowers acceptance criteria.

## Scale and continuity

Scale is described by authored code, module boundaries, affected consumers, dependency complexity and check duration. Investigation starts at the scenario and expands with impact. Parallel writes require verified isolation; semantic contracts and shared resources can remain coupled despite isolated files. Additional coordination levels require observed load.

After interruption, reconcile current requirements, revisions, outstanding work and observations before continuing. Invalidate only affected evidence and preserve independent completed outcomes. At a budget boundary, reduce scope or stop dependent work while preserving quality constraints.

## Reporting protocol

Text acceptance records use `ACCEPT Rn (s/10)` and `RETURN Rn (s/10)`;
unavailable assessment uses `UNVERIFIED Rn (n/a)`. The round belongs to one
outcome, starts at 1 and advances after corrected resubmission. Repeated reads,
restart and reviewer changes preserve the round. The score is the minimum of
applicable observed code, evidence and user-path axes under the included rubric.
It is an ordinal judgment, not a probability. Acceptance requires 10: verified
requirements, a sufficient contract, current required checks and no unresolved
defects. A 9 accepts only defects excepted by a cited owner decision; 8 or lower
returns. A visible passing score without these completion conditions became a
target that agents satisfied while known defects remained.

Stage status is a derived view: `<index> (p%) ✅ D 📋 N ⚙️ A 🙋 B`, the stage's index alone. Source records
are reconciled before each report. N counts distinct noncancelled tasks, D counts
current acceptance at the target, A counts implementation/review, and
B counts distinct unresolved human-authority decisions. Compute p as 100D/N,
rounding halves up; empty-stage percentage is 0 by convention. Missing or
contradictory input remains unavailable. Displayed percentages and counts are not
stored as a second source of state. Task-count percentage is not an estimate of
remaining effort, elapsed time or quality.

## Instruction limits

All operational material is English and contained under `skills/`. Rules are concise, but word counts are not capped: an earlier 1200-word budget forced compression that removed conditions. Each operational Markdown file stays within 500 lines, because agents weigh the first 500 lines most, and decisive rules come first. References must remain within `skills/`; research is not loaded as hidden operational detail. Package checks enforce these constraints.
