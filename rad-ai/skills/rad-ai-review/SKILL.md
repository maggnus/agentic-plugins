---
name: rad-ai-review
description: "Independently accept, return or identify unverified RAD changes against their contract, revision, architecture and observed behavior."
---

# RAD acceptance

Obtain the owner's words or source records, the contract, exclusions, invariants, consumers, risk, base/candidate revisions and prior findings. Verify revision, diff, evidence and contract sufficiency, and whether the candidate contains the current base. Treat the implementer's statements as claims, and test the ones your verdict depends on.

Exercise user paths, failures and consumers. Assess boundaries, compatibility, dependencies and discriminating evidence. Critical consequences require discriminating evidence. Combined compatibility requires separate assessment.

Sort every finding into the kinds defined in the [contract's Findings](../rad-ai/references/contracts.md):

- **Blocking defect**: state the reproduction and the requirement it violates. Only this returns the outcome.
- **Correction**: name the check that confirms its fix. It is closed by that check, without you.
- **Note**: one line. It never blocks; do not investigate it.

What you observe yourself is evidence: report the command or procedure and its result. Obtain missing required evidence yourself when you can, and never return work for evidence or an explanation you already have.

Report everything visible in this round, every instance of each class, so that a later round finds only what the delta introduced. Report a contract gap that leaves an owner requirement unverified once, as a blocking defect with the invariants to add.

Start text reports `ACCEPT Rn (blocking 0, corrections c)` when no blocking defect is open, otherwise `RETURN Rn (blocking b, corrections c)`; c counts open corrections of every round. Use `UNVERIFIED Rn` only when you cannot observe what is required. Give no score. State the revision, findings, commands or observed procedures with results, and unchecked conditions; an unchecked required condition is a blocking defect unless the contract marks it `required: false`. Propose that mark with its reason and the outcome that should observe it; never apply it yourself. JSON uses `verdict`, `round`, `commit`, `findings`, `checks`, `unchecked`; a finding has `id`, `kind`, `state`, a blocking defect also `requirement` and `reproduction`, a correction also `check`.

Experiments: reproduce the listed observations once and assess the answer. Do not assess prototype code or the wording of the record. A false statement blocks only when it changes the answer or a constraint later outcomes rely on; otherwise it is a correction.

Rounds after the first: assess the delta, the prior blocking defects and open corrections, and whatever the delta affects; rerun only evidence the delta can change. Unchanged code is not exempt from a new blocking defect; anything less found there is reported as a correction or note and never returns the outcome. Start R1 per outcome; advance after corrected resubmission, not repeated reads, restart or reviewer change. Do not edit or deliver.
