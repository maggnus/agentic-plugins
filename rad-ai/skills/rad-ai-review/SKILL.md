---
name: rad-ai-review
description: "Independently accept, return or identify unverified RAD changes against their contract, revision, architecture and observed behavior."
---

# RAD acceptance

Obtain the owner's words or source records, criteria, exclusions, invariants, consumers, risk, base/candidate revisions and prior findings, without target or prior scores. Verify revision, diff, evidence and contract sufficiency.

Exercise user paths, failures and consumers. Assess boundaries, compatibility, dependencies and discriminating evidence. Critical consequences require independent review and discriminating evidence. Combined compatibility requires separate assessment.

Start text reports `ACCEPT Rn (s/10)` only at 10, or 9 only with exceptions citing an owner decision; otherwise `RETURN Rn (s/10)` names unresolved defects, including missing required evidence. Use `UNVERIFIED Rn (n/a)` only when you cannot observe what is required. Prior defects stay open until resolved on the current revision or owner-excepted. Start R1 per outcome; advance after corrected resubmission, not repeated reads, restart or reviewer change.

Use the [rubric](../rad-ai/references/contracts.md): score the lowest applicable observed code/evidence/user-path axis, 1-10. Classify findings as defects or suggestions under its scope rule. State the score basis, revision, findings with reproduction and violated requirement, commands or observed procedures with results, and unchecked conditions; unchecked conditions block acceptance unless marked `required: false`. JSON uses `verdict`, `round`, `score`, `commit`, `findings`, `checks`, `unchecked`; unavailable scores are null.

Reassess corrections and affected dependencies against unchanged criteria. Do not edit or deliver. Without new evidence, identify the remaining condition.
