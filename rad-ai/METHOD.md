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

Local reversible consequences require targeted checks and a complete diff assessment. Cross-module or user-visible consequences additionally require failure-path and consumer assessment, with independent review when available. Critical consequences require independent review and evidence that rejects a violated invariant. If that evidence is unavailable, implementation can be prepared, but critical delivery cannot be accepted.

Acceptance identifies exact requirements and revision. Integration is a separate obligation: independent branch acceptance does not prove combined compatibility. A return identifies a contracted defect and the observation needed to close it. Adjacent findings become separate work. Repetition without new information changes the approach or identifies a blocking condition; it never lowers acceptance criteria.

## Scale and continuity

Scale is described by authored code, module boundaries, affected consumers, dependency complexity and check duration. Investigation starts at the scenario and expands with impact. Parallel writes require verified isolation; semantic contracts and shared resources can remain coupled despite isolated files. Additional coordination levels require observed load.

After interruption, reconcile current requirements, revisions, outstanding work and observations before continuing. Invalidate only affected evidence and preserve independent completed outcomes. At a budget boundary, reduce scope or stop dependent work while preserving quality constraints.

## Reporting protocol

Text acceptance records use `ACCEPT Rn (s/10)` and `RETURN Rn (s/10)`;
unavailable assessment uses `UNVERIFIED Rn (n/a)`. The round belongs to one
outcome, starts at 1 and advances after corrected resubmission. Repeated reads,
restart and reviewer changes preserve the round. The score is the minimum of
applicable observed code, evidence and user-path axes under the included rubric.
It is an ordinal judgment, not a probability or an acceptance threshold.

Stage status is a derived view: `<stage>(p%) 📋 N ⚙️ A 🙋 B`. Source records
are reconciled before each report. N counts distinct noncancelled tasks, D counts
current completion at the contracted target, A counts implementation/review, and
B counts distinct unresolved human-authority decisions. Compute p as 100D/N,
rounding halves up; empty-stage percentage is 0 by convention. Missing or
contradictory input remains unavailable. Displayed percentages and counts are not
stored as a second source of state. Task-count percentage is not an estimate of
remaining effort, elapsed time or quality.

## Instruction budget

All operational material is English and contained under `skills/`. The main instruction is limited to 500 whitespace-delimited words and 70 lines; each role to 200 words and 30 lines. Operational Markdown and interface metadata together are limited to 1200 words. References must remain within `skills/`; research is not loaded as hidden operational detail. Package checks enforce these constraints.
