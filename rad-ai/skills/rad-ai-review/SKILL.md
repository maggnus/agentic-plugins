---
name: rad-ai-review
description: "Independently accept, return or identify unverified RAD changes against their contract, revision, architecture and observed behavior."
---

# RAD acceptance

## Context and independence

1. Obtain the owner's original words or authoritative project records, the outcome contract with its `acceptance.json` items, base and candidate commits, and all findings from earlier rounds.
2. Confirm that the checked-out candidate matches the stated commit hash and contains the current base.
3. Treat the implementer's submission as claims: independently verify every statement your verdict relies on. Never edit project files, modify `acceptance.json` or perform delivery.

## Inspection procedure

1. **Behavioral walk.** Start the result with the project's `run` command and perform every contracted acceptance item's steps yourself as a user or consumer. Probe edge and failure cases (empty, malformed, duplicate, unauthorized, missing dependency) and affected consumers. Run the project's `check` command on the candidate whenever it was skipped or run on another revision. Reading code never replaces observing behavior.
2. **Diff and architecture read.** Read the entire `git diff` from base to candidate: verify module boundaries, consumer compatibility, dependency justification, test integrity, accuracy of changed documents, absence of unrelated edits and absence of edits to `acceptance.json`. Critical consequences require discriminating evidence (a check seen failing when the invariant breaks).

## Classifying findings

Sort every issue using [finding definitions](../rad-ai/references/contracts.md#findings):

- **Blocking defect** (`blocking`): an acceptance item whose behavior is not delivered, a stubbed or display-only control, or any reproducible violation of an owner requirement, project rule, named invariant/criterion or critical consequence; a consumer regression; a pre-existing defect activated by the change or blocking the outcome; missing required evidence you also cannot obtain; or a contract gap leaving an owner requirement unverified (report once, naming the items or invariants to add). Always include exact `requirement` and `reproduction`. Only a blocking defect returns an outcome; never explain away a reproduced violation.
- **Correction** (`correction`): any other in-scope flaw confirmable by a deterministic check or observable procedure. Always state `check`. When a behavior works as required but an acceptance step misdescribes how to reach it, report a correction naming the accurate step while preserving what must be seen; never propose weakening the behavior itself.
- **Note** (`note`): a single-line observation, suggestion or unrelated pre-existing issue; never investigated further and never blocking.

## Round discipline

- **Reviewer observations count as evidence**: record the exact command or step and its result. Obtain missing checkable evidence yourself when feasible; never return an outcome for evidence or explanations you already possess.
- **Complete pass**: report every visible instance of every flaw now so a subsequent round checks only the rework delta.
- **Experiments**: reproduce the listed observations once and judge whether the answer and downstream constraints hold; do not grade prototype code quality or record prose. A false statement blocks only if it alters the answer or a constraint later outcomes depend on.
- **Later rounds (`R2+`)**: inspect the delta since the previous round, prior blocking defects, open corrections from all rounds and paths affected by the delta; rerun only checks the delta can affect. In unchanged code only a newly discovered blocking defect can return the outcome. Rounds start at `R1` and increment only on resubmission after `RETURN`.

## Verdict and record format

When assessing multiple local reversible outcomes in one pass, emit a separate report for each.

- Begin text output with `ACCEPT Rn (blocking 0, corrections c)` when open blocking count is 0, `RETURN Rn (blocking b, corrections c)` when `b > 0`, or `UNVERIFIED Rn` only when required observation cannot be performed in this environment. `c` counts open corrections across all rounds. Give no numeric score.
- Follow with: candidate commit, per-item step results, findings, executed checks with exit statuses and `unchecked` conditions. Any required unchecked condition is a blocking defect unless the contract marks it `required: false` (you may propose that mark, never apply it).
- Structured JSON record ([schema](../rad-ai/references/contracts.md#reports)): `verdict`, `round`, `commit`, `findings`, `checks`, `unchecked`. Each finding carries `id`, `kind`, `state` and optional `round`; `blocking` adds `requirement` and `reproduction`; `correction` adds `check` (plus `result: "pass"` and `revision` once resolved).
