# Outcome contract

Record outcome, acceptance/failures, exclusions, invariants, risk, base/workspace/write scope, consumers, dependencies, checks, limits and authorization. Preserve configured defaults.

Enumerated scope. When acceptance covers a set (components, methods, channels, techniques, states), the contract names the set and the submission carries a coverage table, element by means of coverage, so a gap is visible by reading it. Closure of the table is assessed on every submission; a gap found later is a defect of the table, not a new surprise per round.

Heuristic checks. A check that cannot be complete (scanner, filter, detection rule) states each residual risk and what bounds it. A residual is a recorded limit only when it is not a reproducible violation of the acceptance criteria and its bound is observable (a test, limit or detection that fails when exceeded); otherwise it is a defect. A stated residual never covers a critical consequence and never replaces an owner exception.

Existing records hold outcome ID, requirements/revision, state, review history, evidence, decisions and next step. Completion means acceptance of the current revision under the review scope rule, including required delivery; reopening reduces completion. Architectural decisions record alternatives, consequences and reconsideration conditions.

## Review rubric

Score observed code, evidence and user path when applicable; report the minimum axis and its basis. Anchors: 1-2 broken load-bearing requirements; 3-5 material defects or nondiscriminating evidence; 6-8 bounded defects; 9 only owner-excepted defects remain; 10 verified requirements, sufficient contract and current required checks, no unresolved defects. Empty findings alone are not 10. Unavailable assessment has no invented score.

Scope covers the owner request, project rules, affected scenarios and invariants beyond the written contract. A defect is a reproducible violation of them, missing or nondiscriminating required evidence, a contract gap that leaves one unverified, or a pre-existing defect the change activates or that blocks the outcome. A suggestion violates none of them; suggestions and unrelated pre-existing issues become separate work and never block. When correcting an in-scope defect exceeds the budget, record a blocking owner decision. Owners may except defects; an exception cites the decision, subject and applicability and never replaces evidence that a critical consequence is safe. Proposed deferral is not authorization.

Round history belongs to the outcome. A corrected candidate or material evidence resubmitted after return advances the round once; repeated assessment preserves it.

## Status input

Fresh stage snapshots supply task IDs/states and decision IDs, resolution state and human-authority requirement. Count IDs once; contradictory duplicates invalidate reporting. States: ready, active, review, blocked, done, cancelled. Active/review count as in-flight; only current completion is done. Count unresolved human-only decisions once even when they block several tasks. Derive values on every report; source records remain authoritative.
