---
name: rad-ai
description: "Develop applications through bounded RAD cycles: investigate uncertainty, implement, integrate and accept outcomes against explicit quality constraints."
---

# RAD AI

Optimize elapsed time to accepted observable outcomes while keeping quality constraints fixed. Respect scope, project rules and authorization.

- **Roles name duties, not agents**: any runtime, subagent or model may fill a role.
- **Intent gates action**: a question or status request answers without editing or starting work; a planning request ends with a plan.
- **Autonomy**: roles resolve technical and coordination choices without waiting. The owner decides only:
  1. changes to the owner's requirements or product scope;
  2. critical consequences left without discriminating evidence;
  3. irreversible or external actions (deployment, publishing, live schema migration, spending, secrets).

## Project frame and records

Keep state in the repository, never only in conversation memory. Existing project records take precedence and are never duplicated; when a repository has none, use `docs/rad/` ([contracts](references/contracts.md)):

- **Project frame** (`docs/rad/PROJECT.md` for multi-stage work): the product stated in one claim, consumer and task, explicit refusals (what is deliberately not built), invariant registry, decision records with rejected alternatives, stage order (`W1`, `W2`, ...) and project commands. Authority order: owner and decision records -> product requirements and invariants -> stage contracts -> current code. Code shows what exists today; it never weakens a recorded promise. A single local fix in an established repository needs only existing project docs and its outcome contract.
- **Acceptance list** (`docs/rad/<stage>/acceptance.json`): the stage's observable behaviors with user steps and `passes: false` until an accepting review confirms them. Written before implementation; items are never deleted and never reworded to match a weaker implementation.
- **Stage snapshot** (`docs/rad/<stage>/stage.json`): stage tasks and open decisions for status calculation.
- **Outcome contract and record** (`docs/rad/<stage>/outcomes/<id>.md` and `<id>-review.json`): delivered items, exclusions, invariants, checks, time budget (covering rework and review) and round limit (two by default). Fixed when implementation starts; newly discovered scope becomes a new outcome. Only a contract gap that left an owner requirement unverified amends the contract, once.
- **Project commands**: `run` starts the result ready for use; `check` runs every required check and exits nonzero on failure; `smoke` runs a fast base sanity check (`smoke` equals `check` when `check` is fast). Record them in the first outcome.
- **Git**: every candidate is a commit; initialize Git before the first edit if the workspace has no repository. Branching, merging and pushing follow project rules.

## Session start

At every start, resume or context compaction recover state from repository records, not from memory:

1. Read the project frame, current stage records, `acceptance.json`, `git log` and `git status`.
2. Uncommitted changes belong to the outcome in flight, not the base.
3. Run `smoke` (or `check` when fast) and walk one passing acceptance item's steps on the running result unless already verified on the exact clean `HEAD`.
4. If the base is broken, repair it as its own bounded outcome before starting any other work.

## Cycle

1. **Frame.** Inspect requirements, architecture and base revision; clarify uncertainty that changes the next decision. For a new product or capability, ensure the first stage carries a consumer end to end along the shortest useful path, and admit a general capability only when real uses or safety invariants require it. Record `acceptance.json`, refusals/exclusions and the outcome plan. Never narrow acceptance to fit an implementation.
2. **Experiment.** Test consequential uncertainty before dependent work: one question and a closed list of observations. Product assumptions require representative user feedback; technical assumptions require discriminating evidence; agent agreement is neither. One review accepts an experiment when its answer ("no" included) and constraints for later outcomes reproduce; prototype code and prose polish are not assessed. Discard a prototype or pass it through full production acceptance.
3. **Partition.** Create one contract per outcome; for wide dependency surfaces follow [scale](references/scale.md). Work one outcome at a time; add parallel outcomes only when independent and within review capacity, serializing writes in a shared checkout. Land shared contracts and schemas before their consumers.
4. **Implement** using the [implementation role](../rad-ai-build/SKILL.md), delegated or performed directly.
5. **Accept.** Only a separate context accepts, following the [review role](../rad-ai-review/SKILL.md) (a subagent, another session or the owner). Supply the owner's exact words or source records, the contract, base and candidate commits, and all prior findings; treat implementer statements as claims. One review may assess several local reversible outcomes in one pass with a separate verdict per outcome. Critical consequences (auth, permissions, money, privacy, data loss, irreversible effects) require discriminating evidence.
6. **Integrate.** An accepted candidate that already contains the current base is the combined revision; otherwise review the integrated revision. Changed requirements or base revisions invalidate only affected evidence. A stage finishes when every outcome is complete, every active acceptance item passes and no postponed observation remains open.
7. **Deliver and learn.** Perform authorized delivery while observing target health and recovery, collect feedback and select the next outcome or stage from observations. Update any document falsified by a change in that same change. Budget limits reduce scope, never quality. Any class of blocking defect returned once becomes an explicit check in subsequent contracts.

## Completion

- **Verdict rules** ([Findings](references/contracts.md#findings)):
  - Only a **blocking defect** returns an outcome for another round (`RETURN`): a failing acceptance item, stubbed behavior or violated owner requirement, project rule, invariant or critical consequence.
  - A **correction** is any other in-scope flaw whose fix a named check confirms. The coordinator closes it without another review once that check passes on the final revision; if the fix touches anything beyond the correction, send that delta to review without advancing the round.
  - A **note** becomes a task in its own area or is declined with a recorded reason; it never blocks.
- **Outcome closure**: an outcome is complete when accepted by a separate review, every correction across all rounds is closed, its acceptance items are marked passing and verified via the [formatter](scripts/report.py) (`acceptance --previous <stage-base> --previous <last-committed>`), and required delivery is verified. Acceptance carries to a `final` revision differing only by verified correction fixes.
- **Reviewer observations are evidence**: record them directly; never run another round merely for the implementer to repeat what the reviewer already observed.
- **Budget and round ceiling**: at the time budget the implementer submits what exists. When the time budget or round limit is spent with an open blocking defect, change the technical approach or split the outcome into named successors and mark the original `cancelled`; mark it `blocked` only when neither option exists, naming the exact unblocking condition.

## Reports

- **Review headers**: `ACCEPT Rn (blocking 0, corrections c)`, `RETURN Rn (blocking b, corrections c)` or `UNVERIFIED Rn` (when separate review or required observation is unavailable, leaving the outcome blocked). No numeric score is used.
- **Stage status line**: start every progress report with `<index> (p%) ✅ D 📋 W ⚙️ A 🙋 B`, recalculated from reconciled current records before each report, never copied from earlier messages. Across the stage's `N` noncancelled tasks, `D` are complete, `W` wait to start, `A` are in implementation or review, and `K` are blocked (`D + W + A + K = N`). Insert ` ⛔ K` before `🙋` only when `K > 0`; `🙋 B` (distinct open decisions requiring human authority) is always last. `p` is `100 * D / N` rounded half-up (`0%` when `N = 0`). The line starts with the stage index alone (`W5`), never a stage title or extra text.
- **Tooling and evidence**: run `<rad-ai-skill-dir>/scripts/report.py` (`status`, `verdict`, `complete`, `acceptance`) against records matching [contracts](references/contracts.md#reports). Report exact revisions, commands with exit statuses, unchecked limits and the next step; record rounds, elapsed time and token usage per outcome.
