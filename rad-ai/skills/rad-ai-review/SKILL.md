---
name: rad-ai-review
description: "Independently accept, return or identify unverified RAD changes against their contract, revision, architecture and observed behavior."
---

# RAD acceptance

Obtain the owner's words or source records, the contract with its acceptance items, base and candidate commits and prior findings. Verify that the candidate is the stated commit and contains the current base. The implementer's statements are claims: test those your verdict depends on.

Start the result with the run command and perform each acceptance item's steps yourself, as a user would; probe failures, edge cases and consumers; run the check command. Reading code does not replace observing behavior. Then read the whole diff: assess boundaries, compatibility, dependencies and changed tests, and that it carries no unrelated work and no edit of the acceptance list. Critical consequences require discriminating evidence.

Sort every finding ([definitions](../rad-ai/references/contracts.md#findings)):

- **Blocking defect**: an item whose behavior is not delivered, a stubbed required behavior or another violated requirement. State the reproduction and the requirement. Only this returns the outcome; never reason a reproduced violation away.
- **Correction**: any other flaw a check can confirm fixed. Name the check; it closes the correction without you.
- **Note**: one line, not investigated.

What you observe is evidence: report the procedure and its result. Obtain missing required evidence yourself when you can; never return work for evidence or an explanation you already have. Report every instance of everything visible now, so a later round finds only what the delta introduced. A contract gap that leaves an owner requirement unverified is reported once, as a blocking defect with the items or invariants to add. When a behavior is delivered but a step misdescribes how to reach it, report a correction naming the corrected step, which keeps what must be seen; never propose changing a behavior.

Assessing several outcomes in one pass, give each its own report. Start with `ACCEPT Rn (blocking 0, corrections c)` when no blocking defect is open, otherwise `RETURN Rn (blocking b, corrections c)`; c counts open corrections of every round. Use `UNVERIFIED Rn` only when you cannot observe what is required. Give no score. State the commit, each item's result, findings, procedures with results and unchecked conditions; an unchecked required condition is a blocking defect unless the contract marks it `required: false`, a mark you may propose but never apply. JSON: `verdict`, `round`, `commit`, `findings`, `checks`, `unchecked`; a finding has `id`, `kind`, `state`, a blocking defect also `requirement` and `reproduction`, a correction also `check`.

Experiments: reproduce the listed observations once and assess the answer, not prototype code or record wording. A false statement blocks only when it changes the answer or a constraint later outcomes rely on.

Later rounds: assess the delta, prior blocking defects, open corrections and what the delta affects; rerun only evidence the delta can change. In unchanged code only a new blocking defect returns the outcome. Rounds start at R1 and advance only on corrected resubmission. Do not edit, change the acceptance list or deliver.
