# RAD AI method

Status: experimental method. Operational rules are in [the main skill](skills/rad-ai/SKILL.md); evidence and limitations are in [foundations](research/FOUNDATIONS.md) and [evaluation](research/EVALUATION.md).

## Objective and unit of work

The optimization target is elapsed time from an application need to an accepted observable outcome, subject to functional, architectural and operational constraints. Output volume, agent count and local test success are intermediate observations. Quality is a feasibility constraint, not a weighted term that faster implementation can offset.

A cycle covers a bounded user or consumer outcome. Existing project records take precedence; when none exist, `docs/rad/` holds the project frame (`PROJECT.md` with the product claim, explicit refusals, invariant registry, decision records with rejected alternatives and stage order `W1..Wn`) alongside per-stage `stage.json`, `acceptance.json` and outcome contracts. A bounded fix in an established repository needs only existing documentation and its outcome contract. The method does not impose a model, provider or execution service.

## Adaptation of RAD

| RAD function | Agent development mechanism | Transition condition |
| --- | --- | --- |
| Requirements planning | Establish the product frame, stage order (first stage end-to-end) and bounded outcome; trace affected architecture | Acceptance is observable; refusals, unknown decisions and dependencies are explicit |
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

Acceptance identifies exact requirements and revision (exact match or 7+ hex Git SHA prefix). Integration is a separate obligation: independent branch acceptance does not prove combined compatibility. Scope follows the owner request, project rules, affected scenarios and invariants rather than only the written contract; pre-existing defects the change activates or that block the outcome are in scope. Only a separate review context accepts; implementers and coordinators submit.

A review sorts findings into three kinds. A blocking defect violates, in what the outcome delivers, an owner requirement, a project rule, a named invariant or criterion, or a critical consequence; only it returns an outcome. A correction is any other flaw in scope that a check can confirm fixed: the review names the check, the flaw is fixed, the check passes, and the coordinator closes it without another round; acceptance carries to the final revision (while corrections resolved in earlier rounds keep their recorded revision). A note becomes a task where it belongs or is declined with a reason, and never blocks. The reviewer's own observations are evidence. An experiment is accepted on its answer, not on the quality of its prototype or record.

The method regulates itself: the contract carries a time budget and a round limit, and when either is spent with a blocking defect open the approach changes or the outcome is split, each as a new outcome; it is recorded blocked only when neither exists. The owner decides only changes to the owner's requirements, critical consequences without evidence and irreversible actions. Repetition without new information never lowers acceptance criteria.

## Scale and continuity

Scale is described by authored code, module boundaries, affected consumers, dependency complexity and check duration. Investigation starts at the scenario and expands with impact. Parallel writes require verified isolation; semantic contracts and shared resources can remain coupled despite isolated files. Additional coordination levels require observed load.

After interruption, reconcile current requirements, revisions, outstanding work and observations before continuing. Invalidate only affected evidence and preserve independent completed outcomes. At a budget boundary, reduce scope or stop dependent work while preserving quality constraints.

Work longer than one context keeps its state in the repository. The stage's acceptance list states each observable behavior with the steps a user performs and a `passes` flag that only an accepting review turns on; items are never deleted from the list, rewordings append the reviewer's finding or owner's decision to `amended`, owner-withdrawn items record `removed` with `passes: false`, and every update is verified against both the stage base and the latest committed list. Every candidate is a commit. Project commands distinguish `run`, full `check` and fast `smoke` sanity checks so session resume and pre-edit verification avoid repeating slow suites unnecessarily while preserving full pre-submission verification. The implementer walks the items on the running result before submitting, because unit checks pass on features that do not work for a user; the reviewer walks them again, because an agent grades its own work leniently. These rules adapt Anthropic's reports on long-running agent harnesses (2025-11-26, 2026-03-24). Review cost follows consequence, so one review may assess several local reversible outcomes in one pass.

## Reporting protocol

Text acceptance records use `ACCEPT Rn (blocking 0, corrections c)` and
`RETURN Rn (blocking b, corrections c)`, counting open findings; unavailable assessment
uses `UNVERIFIED Rn`. The round belongs to one outcome, starts at 1 and advances after
corrected resubmission. Repeated reads, restart and reviewer changes preserve the round.

There is no numeric score. Two forms of it failed in use. A score that did not decide
the verdict became a target: agents stopped at 8 of 10 with known defects open. A score
that had to reach 10 on its lowest axis made every inaccuracy a new round: an experiment
whose answer was reproduced in the first review was returned three times at 8 of 10 for
the wording of its record and closed after almost five hours. Counts of findings by kind
state what remains and cannot be approached gradually.

Stage status is a derived view: `<index> (p%) ✅ D 📋 W ⚙️ A 🙋 B`, the stage's index alone, with ` ⛔ K` before `🙋` only when K tasks are blocked; `🙋 B` is always last; D + W + A + K = N, with W the tasks waiting to start. Source records
are reconciled before each report. N counts distinct noncancelled tasks, D counts
current acceptance at the target, A counts implementation/review, and
B counts distinct unresolved human-authority decisions. Compute p as 100D/N,
rounding halves up; empty-stage percentage is 0 by convention. Missing or
contradictory input remains unavailable. Displayed percentages and counts are not
stored as a second source of state. Task-count percentage is not an estimate of
remaining effort, elapsed time or quality.

## Instruction limits

All operational material is English and contained under `skills/`. A loaded skill occupies the context the work needs, so the main skill holds the decision process and the references hold formats and definitions read on demand. Rules are concise and structured with lists rather than dense prose; word counts are not capped. Each operational Markdown file stays within 500 lines, because agents weigh the first 500 lines most, and decisive rules come first. References and heading fragments must resolve within `skills/`; research is not loaded as hidden operational detail. Package checks enforce these constraints.
