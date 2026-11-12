---
name: rad-ai
description: "Develop applications through bounded RAD cycles: investigate uncertainty, implement, integrate and accept outcomes against explicit quality constraints."
---

# RAD AI

Optimize time to accepted outcomes; quality constraints are fixed. Respect scope, project rules and authorization. Roles name duties, not agents: any runtime or model may fill one. The roles decide and never wait for the owner, who decides only changes to the owner's own requirements, critical consequences left without evidence, and irreversible actions.

## Records

Kept in the project's repository; details in [contracts](references/contracts.md).

- **Acceptance list**: the stage's observable behaviors as JSON, each with the steps a user performs and `passes`, false until a review has seen the steps pass. Written before implementation; afterwards items are only added and `passes` set: none is removed or reworded to pass.
- **Contract** per outcome: the items it delivers, exclusions, invariants, checks, time budget, round limit (two unless risk sets another). Fixed when implementation starts; what is found later becomes a new outcome. Only a gap that leaves an owner requirement unverified amends it, once.
- **Project commands**: one run command starts the result, one check command runs every required check. Record them in the first outcome.
- **Git**: every candidate is a commit; a workspace without a repository gets one first. Branching, pushing and merging follow project rules.

## Session start

At every start, resume or context compaction recover state from the records, not from memory: read the stage records, the acceptance list, `git log` and `git status`, run the check command, and perform one passing item's steps on the running result. Uncommitted changes are the outcome in flight, not the base. Repair a broken base, as its own outcome, before new work.

## Cycle

1. **Frame.** Inspect requirements, architecture and revision; clarify uncertainty that affects the next decision. Record what the owner must get, not how to build it: the acceptance list, exclusions and the plan. Never narrow acceptance to fit an implementation. Planning requests end with a plan.
2. **Experiment.** Test a consequential uncertainty before dependent work: one question, a closed list of observations. Product assumptions need representative feedback, technical ones discriminating evidence; agent agreement is neither. One review accepts it when the answer, "no" included, and the constraints later outcomes rely on are reproduced; prototype code and record wording are not assessed. A prototype is discarded or passes production acceptance.
3. **Partition.** One contract and record per outcome; for broad dependencies see [scale](references/scale.md). Work one outcome at a time; add independent outcomes within review capacity, serializing writes to a shared workspace. Shared contracts precede their consumers.
4. **Implement** with the [implementation role](../rad-ai-build/SKILL.md), delegated or performed directly.
5. **Accept.** Only a separate context accepts, using the [review role](../rad-ai-review/SKILL.md): a subagent, another session or the owner. Give it the owner's words, the contract and all prior findings; the implementer's statements are claims. One review may assess several local reversible outcomes in one pass, with a verdict for each. Critical consequences (data loss, access, disclosure, irreversible effects) require discriminating evidence.
6. **Integrate.** A candidate that contained the current base when accepted is the combined revision; otherwise a review accepts the combined revision. Changed requirements or revision invalidate affected evidence. A stage is complete when every outcome is complete, every item passes and no postponed observation is outstanding.
7. **Deliver and learn.** Deliver only with authorization, observing success and recovery; verify the target, obtain feedback and choose the next work from observations. Budget limits reduce scope, never quality. A class of blocking defect returned once becomes a contract line of later outcomes.

## Completion

- Only a **blocking defect** returns an outcome for another round: an acceptance item whose steps fail, or another violation of what the owner, the contract or project rules require. A **correction**, any other flaw whose fix a check confirms, is fixed and closed by the coordinator when that check passes, without review. A **note** becomes a task where it belongs or is declined with a reason. [Findings](references/contracts.md#findings) defines them.
- An outcome is complete when a separate review has accepted it, every correction of every round is closed, its items pass and required delivery is done. Acceptance carries to a final revision that differs only by correction fixes whose checks passed.
- What a reviewer observed is evidence: record it; never run a round for the implementer to reproduce it.
- At the time budget the implementer submits what exists. When the budget or the round limit is spent with a blocking defect open, change the approach or split the outcome: the original is cancelled, naming its successors. Record it blocked only when neither exists, naming what unblocks it.

## Reports

Reviews start `ACCEPT Rn (blocking 0, corrections c)`, `RETURN Rn (blocking b, corrections c)` or `UNVERIFIED Rn` when no separate review or required observation can be obtained; that outcome is blocked. Progress reports start with the status line `<index> (p%) ✅ D 📋 W ⚙️ A 🙋 B`, recalculated from current records before every report, never from displayed values or invented records. Of the stage's N tasks, cancelled excluded, D are complete, W wait to start, A are in implementation or review and K are blocked: D + W + A + K = N. ` ⛔ K` appears before `🙋` only when K > 0; `🙋 B`, the distinct unresolved decisions only a human can make, is always last. p is 100D/N rounded half-up, 0% for an empty stage. The line carries the stage's index alone (`W5`), never a word naming or describing the stage, and no other text. The [formatter](scripts/report.py) computes and checks these lines (`status`, `verdict`, `complete`, `acceptance`) from the records in [contracts](references/contracts.md#reports). Report the revision, commands with exit statuses, limitations and next step; record per outcome the rounds, time and tokens observed.
