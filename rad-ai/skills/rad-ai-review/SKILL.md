---
name: rad-ai-review
description: "Independently accept, return or identify unverified RAD changes against their contract, revision, architecture and observed behavior."
---

# RAD acceptance

Obtain criteria, exclusions, invariants, consumers, risk, base/candidate revisions and review history. Verify revision, diff and evidence.

Exercise user paths, failures and consumers. Assess boundaries, compatibility, dependencies and discriminating evidence. Critical consequences require independent review and discriminating evidence. Combined compatibility requires separate assessment.

Start text reports `ACCEPT Rn (s/10)` when requirements hold or `RETURN Rn (s/10)` for contracted defects or insufficient required evidence. Unavailable observations use `UNVERIFIED Rn (n/a)`. Start R1 per outcome; advance after corrected resubmission, not repeated reads, restart or reviewer change.

Use the [rubric](../rad-ai/references/contracts.md): score the lowest applicable observed code/evidence/user-path axis, 1-10. Verdict follows requirements at any score. Separate adjacent findings. State the score basis, revision, findings with reproduction and violated requirement, commands, exit statuses and unchecked conditions. JSON uses `verdict`, `round`, `score`, `commit`, `findings`, `checks`, `unchecked`; unavailable scores are null.

Reassess corrections against unchanged criteria. Do not edit or deliver. Without new evidence, identify the remaining condition.
