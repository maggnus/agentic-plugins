# Assignment contract

Read this file immediately before dispatching work. Give each agent one bounded plan atom in an
isolated workspace at a frozen integration-branch SHA. The first prompt line is a fail-closed role
gate; put all other fields in this order:

```markdown
First action: load <qualified role skill>. If unavailable, reply exactly BLOCKED: role skill unavailable and stop before any repository read or write.
Identity: <repo; plan ID/title; workspace; branch; baseline; language; provider tuple; modeId>
Read: <project instructions; exact spec/plan sections; domain skills>
Outcome: <one testable result; frozen decisions>
Write zone: <exclusive paths>
No-touch: <paths, operations, other streams, plan/integration/deploy/live boundaries>
Acceptance: <commands, expected exits/measurements, negative cases, durable artifacts>
Observation: <expected silence/long operations and safe liveness proof>
Commit: <local shape/message/trailers>; never push
Return: <hash, concise diff, real checks, Git state, blockers/disputes, proposed children>
```

Use `$paseo-cto:paseo-<role>` in Codex and `/paseo-cto:paseo-<role>` in Claude. Include the
preflight-resolved `modeId`. The worker verifies its initial state but never fetches, pulls, rebases,
switches branches, or changes the baseline without an explicit follow-up. Its normal report stays
below 2500 characters; systemic security, corruption, race, privacy, or data-loss evidence is never
compressed away.

The CTO strategy never appears in the contract: it selects the atom but does not weaken acceptance.
Every writer has its own workspace; parallel writers never share mutable paths or verification
substrates. A cross-zone need is a blocker or proposed child, not implicit scope expansion.

## Role additions

- Builder: exact write zone, local commit, empty final porcelain.
- Reviewer: exact commit and acceptance, preferably a fresh workspace, byte-identical pre/post
  `git status --porcelain`, report only.
- Researcher: one question and evidence format, identical pre/post porcelain, read-only.
- Lead: one stream, one child level, child budget/zones, allowed worker tuples and role-mode map,
  exclusive ledger, and one stream gate; no lead child.

Before a lead creates a child, it resolves the absolute Git common directory and reserves the child
node/identity in its exclusive
`<git-common-dir>/paseo-cto/<run>/streams/<stream>.json` ledger. It persists the workspace ID before
agent creation and the agent ID immediately afterward. No ledger, no child. The lead remains sole
lifecycle owner until a recorded handover/escalation and returns every child writer commit
unsquashed, reachable, and in integration order for individual CTO review.

Evidence needed after archive must be committed, copied to an approved project artifact store, or
captured concisely in the CTO checkpoint/verdict. Disposable logs use only an approved ignored
directory or exact external temporary path; a dead workspace path is not evidence.
