# Outcome contract

Record outcome, acceptance/failures, exclusions, invariants, risk, base/workspace/write scope, consumers, dependencies, checks, limits and authorization. Preserve configured defaults.

Existing records hold outcome ID, requirements/revision, state, review history, evidence, decisions and next step. Completion means current contracted acceptance, including required delivery; reopening reduces completion. Architectural decisions record alternatives, consequences and reconsideration conditions.

## Review rubric

Score observed code, evidence and user path when applicable; report the minimum axis. Anchors: 1-2 broken load-bearing requirements; 3-5 material defects or nondiscriminating evidence; 6-8 bounded issues; 9-10 minor or no findings with required evidence. Explain the basis. Scores never override requirements. Unavailable assessment has no invented score.

Round history belongs to the outcome. A corrected candidate or material evidence resubmitted after return advances the round once; repeated assessment preserves it.

## Status input

Fresh stage snapshots supply task IDs/states and decision IDs, resolution state and human-authority requirement. Count IDs once; contradictory duplicates invalidate reporting. States: ready, active, review, blocked, done, cancelled. Active/review count as in-flight; only current completion is done. Count unresolved human-only decisions once even when they block several tasks. Derive values on every report; source records remain authoritative.
