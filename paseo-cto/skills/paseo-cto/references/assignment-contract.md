# Assignment contract

Read this file immediately before dispatching work. Give each agent one bounded plan atom in an
isolated workspace. The atom is one permanent task file: the contract names its path and binds it
to this dispatch instead of restating it. A contract that cannot be written from the task file
means the file is not startable from a cold context, which is a planning defect. The worker never
edits that file. The first prompt line is a fail-closed role gate; every field of the template below
then follows in order, and none is dropped. A field the task file already fixes — `Read`, `Outcome`,
`Acceptance` — is carried as a pointer to the section that fixes it plus whatever this dispatch adds,
never as a paraphrase of it. The dispatch-only fields — identity, risk and chosen effort, maturity,
write zone, no-touch, the validation budget with its negative halves, the review owner, commit and
return rules — are always written in full, because the task file cannot know them.

```markdown
First action: load <qualified role skill>. If unavailable, reply exactly BLOCKED: role skill unavailable and stop before any repository read or write.
Identity: <repo; plan ID/title; workspace; branch; exact technical baseline; reportingLanguage from SETTINGS.json; provider tuple from roleAssignments, with the chosen effort and the reason when the assignment allowed a range; modeId>
Risk: <Routine | Significant | Critical — credible consequence and threatened invariant, if any>
Maturity: <RESEARCH | DESIGN | BUILD | OPERATIONALIZATION — the level the outcome is judged at; see the Review gate>
Read: <the task file path; project instructions; exact spec sections; domain skills; Source references>
Outcome: <one testable result; frozen decisions>
Write zone: <exclusive paths>
No-touch: <paths, operations, other streams, plan/integration/deploy/live boundaries>
Acceptance: <commands, expected exits/measurements, the negative half with its captured output, what each check catches and what it would pass, why its configuration is one the product reaches, durable artifacts>
Validation budget: <builder-owned checks; review depth; one negative half per load-bearing claim; combined-tree composition preflight; integration checks; exact full-suite trigger>
Review: <apply Review gate for the declared risk; name the review owner — the CTO where the gate lets it accept, otherwise the non-author reviewer>
Observation: <expected silence/long operations and safe liveness proof>
Commit: <coherent local commit set/message conventions>; final reviewed range; clean worktree; never push
Return: <opens with TIME: dd/mm hh:mm local and minutes worked; then source-linked final range and file evidence, concise diff, real checks, Git state, blockers/disputes, proposed children>
Convergence loop: <the reviewer's five-return budget for this node, the running round count, and the exact acceptance condition when the CTO has granted the bounded second budget>
```

`Maturity` is mandatory and is never inferred from the role: a builder can carry a `RESEARCH` card
and a researcher a `DESIGN` one. It fixes what counts as success before the work starts. `Outcome`
matches it — a verified answer, a chosen model, a realized contract, or a procedure proved
executable. Every return uses the assignment's reporting language and the formal, neutral,
impersonal register.

Address the role skill as `$paseo-cto:paseo-<role>` in Codex and `/paseo-cto:paseo-<role>` in
Claude, where `<role>` is `builder`, `reviewer`, or `researcher`. Include the preflight-resolved
`modeId`. The worker verifies its initial state but never fetches, pulls, rebases, switches
branches, or changes the technical baseline without an explicit follow-up. Exact baseline and final
revisions are Git/CI/runtime metadata, not plan prose. Its normal report has a hard ceiling of 1800
characters. Group commands that establish the same claim, retain only decisive exits and
measurements, and omit intermediate attempts. Systemic security, corruption, race, privacy, or
data-loss evidence is never compressed away; its complete capture belongs in the named durable
artifact while the return links and summarizes it.

Bind the canonical source repository URL before dispatch. Every commit or repository file used as
evidence in a return, review report, plan update, or acceptance record follows
[Source references](source-references.md). A bare SHA or file path is not an acceptable durable
reference.

One card means one outcome, not one commit. Several local commits are allowed when they form one
coherent, reviewable outcome and acceptance story. Split work before dispatch when parts have
independent outcomes, risk levels, acceptance stories, owners, or landing value. A cross-zone need
is a blocker or proposed child, never implicit scope expansion — with one exception: a purely
additive edit to a file no running task owns (a new target in a registry, a call-site update forced
by a signature change, a test helper) may be made and declared in the return; the CTO ratifies it at
integration or returns it. The worker cannot see what other tasks hold, so the dispatch closes that
half: a shared file a running task owns, or one that two admissible tasks would both extend, is named
in `No-touch`, and at most one running task is admitted per such file. If two returns still extend
the same unnamed file, the later one re-bases on the accepted earlier one instead of being merged by
hand. The converse holds for small
homogeneous nodes: one contract may carry several sibling nodes sharing one surface, environment,
verification method, and review context; the contract then names every node with its own
acceptance, and the review closes each individually.

Risk classification, review depth, landing decisions, falsifiers, the convergence loop and its
budgets, and the conditions for an author response live only in [Review gate](review-gate.md). Apply
that file by reference; do not restate or override it in an assignment. An assignment may not lower
a budget, skip the round journal, or make a verdict conditional on anything but evidence.

The CTO strategy selects the atom but does not weaken acceptance. Every repository writer has its
own workspace, and parallel writers never share mutable paths or verification substrates.

Assign each proof to exactly one role according to [Validation budget](validation-budget.md). Do not
copy the same full command set into builder, reviewer, and CTO responsibilities. Green evidence
remains valid for the reviewed final tree until a changed tree, changed dependency surface,
contradictory result, or concrete hypothesis invalidates it.

## Acceptance must demand a check that can fail

Write the `Acceptance` line so a passing result means something. Every load-bearing claim carries a
negative half — the deliberately broken input, the command, and the real non-zero exit, output
captured — plus what it distinguishes, what it would let through, and why the configuration it runs
in is one the product reaches. Supporting commands for the same claim share that negative half;
standard unchanged compiler, formatter, linter, or upstream-suite invocations do not each require a
ceremonial mutation. See *A proof must be able to fail* in [Review gate](review-gate.md); the
contract is where that requirement is priced in, because discovering it at review costs a round.

For a boundary between two components, name in the contract which accepted proof travels the
product's own path. A harness that assembles the request and supplies the expected value tests only
the harness. See [Validation budget](validation-budget.md).

## Role additions

- Builder: exact write zone, coherent local commit set, reviewed final range, empty final porcelain.
  It exchanges facts, findings and corrections directly with the reviewer of the same node under
  *Direct exchange between author and reviewer* in [Review gate](review-gate.md), recording each
  exchange in its return. A reviewer `RETURN` authorizes the rework it names inside the same node
  and write zone; the contract does not issue a separate rework assignment per round, and the
  builder returns to the CTO instead of correcting whenever a break condition fires.
  A builder producing user-facing design artifacts must receive the project's design-system skill
  sources in Read; visual values come from those sources' tokens, never invented ad hoc.
- Reviewer: exact returned outcome and acceptance; for a repository write, include the final
  reviewed range and preferably a fresh workspace for the initial independent review. Require
  byte-identical pre/post `git status --porcelain` and report-only operation. Preserve and reuse that
  reviewer/workspace for the whole convergence loop by default; assign the final correction delta,
  affected context, and the existing independently selected falsifier unless a Review-gate
  replacement or invalidation condition applies. Name the round count this dispatch continues, so a
  cold reviewer session knows how much of the five-return budget remains and when its next verdict
  must be `ESCALATE` rather than `RETURN`. The contract's named domain skills are a floor: load every
  available skill bearing directly on the outcome and report the additions. It may ask the author
  directly for a fact it would otherwise spend a turn deriving, under the same direct-exchange rule,
  recording each exchange in its report.
- Researcher: one question and evidence format, identical pre/post porcelain, and read-only. A
  separate review follows only when the report itself is proposed as closure, authorization for a
  `Critical` card, or an owner-gate decision; otherwise the CTO verifies its sources and folds the
  result into the next contract.

Evidence needed after archive must be committed, copied to an approved project artifact store, or
captured concisely in the CTO checkpoint/authorization. Disposable logs use only an approved ignored
directory or exact external temporary path; a dead workspace path is not evidence.
