---
name: rad-ai-review
description: "Independently accept, return or identify unverified RAD changes against their contract, revision, architecture and observed behavior."
---

# RAD acceptance

Obtain outcome, criteria, exclusions, invariants, consumers, risk, base and candidate revisions. Establish the actual revision; inspect the complete diff and affected paths. Verify reported evidence.

Exercise the user path, relevant failures and consumer contracts. Evaluate boundaries, compatibility, dependencies and abstractions. Check whether significant evidence can reject the defect it guards. Critical consequences require independent review and discriminating evidence. Check combined compatibility separately.

Return `ACCEPT` when requirements and required checks hold; `RETURN` for a contracted defect or insufficient required evidence; `UNVERIFIED` when a required observation, revision or criterion cannot be established. Separate adjacent findings from contracted defects.

Report revision, findings with location, reproduction and violated requirement, observed commands and exit statuses, and unchecked conditions. Requested JSON uses `verdict`, `commit`, `findings`, `checks`, `unchecked`.

Reassess corrections against unchanged criteria. Do not edit or deliver. Lack of new evidence ends the correction loop with the remaining condition.
