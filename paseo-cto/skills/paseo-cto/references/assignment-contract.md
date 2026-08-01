# Assignment contract

Read this file immediately before dispatching work. Give each agent one bounded plan atom in an
isolated workspace. The first prompt line is a fail-closed role gate; put all other fields in this
order:

```markdown
First action: load <qualified role skill>. If unavailable, reply exactly BLOCKED: role skill unavailable and stop before any repository read or write.
Identity: <repo; plan ID/title; workspace; branch; exact technical baseline; language; provider tuple from roleAssignments, with the chosen effort and the reason when the assignment allowed a range; modeId>
Risk: <Routine | Significant | Critical — credible consequence and threatened invariant, if any>
Maturity: <RESEARCH | DESIGN | BUILD | OPERATIONALIZATION — the level the outcome is judged at; see the Review gate>
Read: <project instructions; exact spec/plan sections; domain skills>
Outcome: <one testable result; frozen decisions>
Write zone: <exclusive paths>
No-touch: <paths, operations, other streams, plan/integration/deploy/live boundaries>
Acceptance: <commands, expected exits/measurements, the negative half with its captured output, what each check catches and what it would pass, why its configuration is one the product reaches, durable artifacts>
Validation budget: <builder-owned checks; review depth; hypothesis-bound falsifier if any; integration checks; exact full-suite trigger>
Review: <apply Review gate for the declared risk; name only the non-author second-look/review owner>
Observation: <expected silence/long operations and safe liveness proof>
Commit: <coherent local commit set/message conventions>; final reviewed range; clean worktree; never push
Return: <final range, concise diff, real checks, Git state, blockers/disputes, proposed children>
Response round: <only when triggered by Review gate; evidence-based and no changes without rework authorization>
```

`Maturity` is not optional and is not inferred from the role: a builder can carry a `RESEARCH` card and a researcher can carry a `DESIGN` one. It fixes what counts as success before the work starts, so a refuted assumption cannot later be read as a failure to deliver. `Outcome` is written to match it — a verified answer, a chosen model, a realized contract, or a procedure proved executable by the operator who will actually run it.

Address the role skill as `$paseo-cto:paseo-<role>` in Codex and `/paseo-cto:paseo-<role>` in
Claude, where `<role>` is `builder`, `reviewer`, or `researcher`. Include the preflight-resolved
`modeId`. The worker verifies its initial state but never fetches, pulls, rebases, switches
branches, or changes the technical baseline without an explicit follow-up. Exact baseline and final
revisions are Git/CI/runtime metadata, not plan prose. Its normal report stays below 2500
characters; systemic security, corruption, race, privacy, or data-loss evidence is never compressed
away.

One card means one outcome, not one commit. Several local commits are allowed when they form one
coherent, reviewable outcome and acceptance story. Split work before dispatch when parts have
independent outcomes, risk levels, acceptance stories, owners, or landing value. A cross-zone need
is a blocker or proposed child, never implicit scope expansion.

Risk classification, review depth, landing decisions, falsifiers, and the conditions for an author
response live only in [Review gate](review-gate.md). Apply that file by reference; do not restate or
override it in an assignment.

The CTO strategy selects the atom but does not weaken acceptance. Every repository writer has its
own workspace, and parallel writers never share mutable paths or verification substrates.

Assign each proof to exactly one role according to [Validation budget](validation-budget.md). Do not
copy the same full command set into builder, reviewer, and CTO responsibilities. Green evidence
remains valid for the reviewed final tree until a changed tree, changed dependency surface,
contradictory result, or concrete hypothesis invalidates it.

## Acceptance must demand a check that can fail

Write the `Acceptance` line so a passing result means something. Every contracted check carries its
negative half — the deliberately broken input, the command, the real non-zero exit, output captured
— plus what it distinguishes, what it would let through, and why the configuration it runs in is one
the product reaches. See *A proof must be able to fail* in [Review gate](review-gate.md); the
contract is where that requirement is priced in, because discovering it at review costs a round.

For a boundary between two components, name in the contract which accepted proof travels the
product's own path. A harness that assembles the request and supplies the expected value tests the
harness; it can report success while the boundary it claims to cover has never been crossed by
product code. One end-to-end proof through the real path settles what any number of harness runs
cannot — see [Validation budget](validation-budget.md).

## Role additions

- Builder: exact write zone, coherent local commit set, reviewed final range, empty final porcelain.
  A builder producing user-facing design artifacts must receive the project's design-system skill
  sources in Read; visual values come from those sources' tokens, never invented ad hoc.
- Reviewer: final reviewed range and acceptance, preferably a fresh workspace for the initial
  independent review, byte-identical pre/post `git status --porcelain`, report only. Preserve and
  reuse that reviewer/workspace for bounded re-review by default; assign the final correction delta,
  affected context, and the existing independently selected falsifier unless a Review-gate
  replacement or invalidation condition applies. The contract's named domain skills are a floor:
  load every available skill bearing directly on the change and report the additions.
- Researcher: one question and evidence format, identical pre/post porcelain, read-only.

Evidence needed after archive must be committed, copied to an approved project artifact store, or
captured concisely in the CTO checkpoint/authorization. Disposable logs use only an approved ignored
directory or exact external temporary path; a dead workspace path is not evidence.
