---
name: rad-ai-review
description: "Independently accept, return or identify unverified RAD changes against their contract, revision, architecture and observed behavior."
---

# RAD acceptance

Obtain the owner's words or source records, criteria, exclusions, invariants, consumers, risk, base/candidate revisions and prior findings, without target or prior scores. Verify revision, diff, evidence and contract sufficiency, and whether the candidate contains the current base. Treat the implementer's statements as claims to test, not as findings.

Exercise user paths, failures and consumers. Assess boundaries, compatibility, dependencies and discriminating evidence. Critical consequences require independent review and discriminating evidence. Combined compatibility requires separate assessment.

Start text reports `ACCEPT Rn (s/10)` only at 10, or 9 only with exceptions citing an owner decision; otherwise `RETURN Rn (s/10)` names unresolved defects, including missing required evidence. Use `UNVERIFIED Rn (n/a)` only when you cannot observe what is required. Prior defects stay open until resolved on the current revision or owner-excepted. Start R1 per outcome; advance after corrected resubmission, not repeated reads, restart or reviewer change.

Use the [rubric](../rad-ai/references/contracts.md): score the lowest applicable observed code/evidence/user-path axis, 1-10. Classify findings as defects or suggestions under its scope rule: nondiscriminating evidence is a defect for the invariants and criteria the contract names or a critical consequence, and a suggestion elsewhere; report a missing invariant once as a contract gap. For each defect name its class and list every instance of the class visible in the candidate, not only the first; check the coverage table for closure. State the score basis, revision, findings with reproduction and violated requirement, commands or observed procedures with results, and unchecked conditions; unchecked conditions block acceptance unless the contract marks them `required: false`; propose that mark with its reason and the outcome that should observe it, never apply it yourself. JSON uses `verdict`, `round`, `score`, `commit`, `findings`, `checks`, `unchecked`; unavailable scores are null.

Reassess corrections and affected dependencies against unchanged criteria. In rounds after the first, assess the delta, every prior finding and whatever the delta affects; unchanged code is not exempt from new defects, but rerun only evidence the delta can change. When a corrected resubmission returns for a second defect of one class in the same component, require redesign of the class with one general rule and a coverage table instead of instance fixes; defects of one class listed together in one review are one defect. Statements in changed documents are checked against the candidate like code. Do not edit or deliver. Without new evidence, identify the remaining condition.
