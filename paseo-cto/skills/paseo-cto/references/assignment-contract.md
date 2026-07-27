# Assignment contract

Read this file immediately before dispatching work. Give each agent one bounded plan atom in an
isolated workspace. The first prompt line is a fail-closed role gate; put all other fields in this
order:

```markdown
First action: load <qualified role skill>. If unavailable, reply exactly BLOCKED: role skill unavailable and stop before any repository read or write.
Identity: <repo; plan ID/title; workspace; branch; exact technical baseline; language; provider tuple; modeId>
Risk: <Routine | Significant | Critical — credible consequence and threatened invariant, if any>
Read: <project instructions; exact spec/plan sections; domain skills>
Outcome: <one testable result; frozen decisions>
Write zone: <exclusive paths>
No-touch: <paths, operations, other streams, plan/integration/deploy/live boundaries>
Acceptance: <commands, expected exits/measurements, negative cases, durable artifacts>
Validation budget: <builder-owned checks; review depth; hypothesis-bound falsifier if any; integration checks; exact full-suite trigger>
Observation: <expected silence/long operations and safe liveness proof>
Commit: <coherent local commit set/message conventions>; final reviewed range; clean worktree; never push; for Claude Designer use "none" and require exact external result evidence
Return: <final range or external design result, concise diff, real checks, Git state, blockers/disputes, proposed children>
Author response: <only if triggered by blocker/major, proposed return, disputed scope/contract, or semantic integration edit; evidence-based and no changes without rework authorization>
```

Use `$paseo-cto:paseo-<role>` in Codex and `/paseo-cto:paseo-<role>` in Claude. Include the
preflight-resolved `modeId`. The worker verifies its initial state but never fetches, pulls, rebases,
switches branches, or changes the technical baseline without an explicit follow-up. Exact baseline
and final revisions are Git/CI/runtime metadata, not plan prose. Its normal report stays below 2500
characters; systemic security, corruption, race, privacy, or data-loss evidence is never compressed
away.

One card means one outcome, not one commit. Several local commits are allowed when they form one
coherent, reviewable outcome and acceptance story. Split work before dispatch when parts have
independent outcomes, risk levels, acceptance stories, owners, or landing value. A cross-zone need
is a blocker or proposed child, never implicit scope expansion.

Risk and review semantics live only in [Review gate](review-gate.md). Do not redefine them in an
assignment or infer Critical from a subsystem name. Routine receives a non-author integrator/CTO
second look; Significant receives independent review; Critical receives independent review plus an
independently selected executable falsifier. A Significant card adds a falsifier only for a concrete
risk hypothesis.

The CTO strategy selects the atom but does not weaken acceptance. Every repository writer has its
own workspace; a Claude Designer has a separate Claude session and exclusive Claude Design
project/file zone. Parallel writers never share mutable paths or verification substrates.

Assign each proof to exactly one role according to
[Validation budget](validation-budget.md). Do not copy the same full command set into builder,
reviewer, lead, and CTO responsibilities. Green evidence remains valid for the reviewed final tree
until a changed tree, changed dependency surface, contradictory result, or concrete hypothesis
invalidates it.

## Role additions

- Builder: exact write zone, coherent local commit set, reviewed final range, empty final porcelain.
  A builder producing user-facing design artifacts must receive the project's design-system skill
  sources in Read; visual values come from those sources' tokens, never invented ad hoc.
- Claude Designer: Claude provider only; channel is exclusively Paseo browser tools driving the
  design service's own UI per the claude-designer skill — design-service MCP
  (`mcp__claude-design__*` or equivalent) is never called or proxied. Contract names the exact
  design project, target file zone, brief, mandatory design-system sources, token-protocol limits,
  and required post-action observed UI evidence. Repository porcelain remains byte-identical; there
  is no commit, sharing, publication, or unrelated external action.
- Reviewer: final reviewed range and acceptance, preferably a fresh workspace, byte-identical
  pre/post `git status --porcelain`, report only. The contract's named domain skills are a floor:
  load every available skill bearing directly on the change and report the additions.
- Researcher: one question and evidence format, identical pre/post porcelain, read-only.
- Lead: one stream, one child level, child budget/zones, allowed worker tuples and role-mode map,
  exclusive ledger, and one stream gate; no lead child.

Before a lead creates a child, it resolves the absolute Git common directory and reserves the child
node/identity in its exclusive
`<git-common-dir>/paseo-cto/<run>/streams/<stream>.json` ledger. It persists the workspace ID before
agent creation and the agent ID immediately afterward. No ledger, no child. The lead remains sole
lifecycle owner until a recorded handover/escalation and returns every child writer commit
reachable and in integration order.

Evidence needed after archive must be committed, copied to an approved project artifact store, or
captured concisely in the CTO checkpoint/authorization. Disposable logs use only an approved ignored
directory or exact external temporary path; a dead workspace path is not evidence.
