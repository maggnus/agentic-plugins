# Assignment contract

Read this file immediately before dispatching work. One agent gets one bounded plan atom, or one
declared batch of homogeneous siblings, in an isolated workspace. The atom is one permanent file:
the contract names its path and binds it to this dispatch instead of restating it. A field the file
already fixes — `Read`, `Outcome`, `Acceptance` — is a pointer plus whatever this dispatch adds;
the dispatch-only fields are always written in full. A contract that cannot be written from the
task file means the file is not startable from a cold context, which is a planning defect.

```markdown
First action: load <qualified role skill>; if the plugin offers nothing, read <Plugin path>/skills/<role>/SKILL.md. If both fail, reply exactly BLOCKED: role skill unavailable and stop before any repository read or write.
Plugin path: <absolute installed plugin directory from the plugin-version preflight>
Identity: <repo; plan ID/title; workspace; branch; exact baseline; reportingLanguage; provider tuple with the chosen effort and its reason; modeId>
Risk: <Routine | Significant | Critical — credible consequence and threatened invariant, if any>
Maturity: <RESEARCH | DESIGN | BUILD | OPERATIONALIZATION>
Read: <task file path; project instructions; exact spec sections; domain skills>
Outcome: <pointer to the task file's Outcome; frozen decisions this dispatch adds>
Write zone: <exclusive paths>
No-touch: <paths, operations, other streams, plan/integration/deploy/live boundaries; every shared file a running task owns>
Acceptance: <pointer to the checklist; commands, expected exits, one negative half per load-bearing claim with its captured output, why the configuration is one the product reaches>
Validation budget: <affected surfaces; builder-owned checks that discriminate a defect in them; e2e: none | one scenario <why observable only on the surface>; screenshots: none | one approval set <surface>; inspection depth per Review gate and who performs it; composition preflight; full-suite trigger; return ceiling <chars>>
Consumer surface: <none, or: the surface, the consumer role, how to reach it, data or credentials, the edges that matter>
Resources: <none, or each shared stand, port, datastore or index file with its mode>
Window: <target window; on expiry return a candidate within twenty minutes with deliberate_partial declared>
Commit: <coherent local commit set and message convention; clean tree; never push — or `CTO commits at integration` for a sandbox that cannot commit>
Return: <the structure below, within the ceiling>
Convergence: <inspector for this node; returns spent of two; the exact acceptance condition when a bounded budget was granted>
```

`Maturity` is never inferred from the role: a builder can carry a `RESEARCH` card and a researcher
a `DESIGN` one. Address the role as `$paseo-cto:paseo-<role>` in Codex and `/paseo-cto:paseo-<role>`
in Claude. The worker verifies its initial state but never fetches, pulls, rebases or changes the
baseline. Risk classification, depth, landing decisions, falsifiers and the loop live only in
[Review gate](review-gate.md); an assignment may not lower a budget, skip the journal, or make a
verdict conditional on anything but evidence. Assign each proof to exactly one role under
[Validation budget](validation-budget.md); never copy one command set into builder, reviewer and
CTO responsibilities. Green evidence stays valid for the reviewed tree until a changed tree,
changed dependency surface, contradictory result or concrete hypothesis invalidates it.

**Write zones.** One card means one outcome, not one commit. A cross-zone need is a blocker or a
proposed child, with one exception: a purely additive edit to a file no running task owns — a new
registry target, a call site a signature change broke, a test helper — may be made and declared in
the return, and the CTO ratifies or returns it at integration. The worker cannot see what other
tasks hold, so the dispatch closes that half: a shared file a running task owns, or one two
admissible tasks would both extend, is named in `No-touch`, and at most one running task is
admitted per such file. Two returns extending the same unnamed file: the later re-bases on the
accepted earlier one.

**A batch** dispatches several homogeneous nodes — one surface, environment, verification method
and review context — under one contract, workspace and inspection. The contract names every node
with its own acceptance; the inspection closes each individually; the journal is written into every
node; a node that develops its own risk or return leaves the batch. A batch creates no node and
hides no failure behind another's acceptance.

**Role additions.** Builder: exact write zone, coherent commit set, reviewed final range, empty
porcelain; no full suite, no end-to-end pass belonging to another task, no repeated run bought to
produce a negative half; a builder producing user-facing design artifacts receives the project's
design-system sources in `Read`. Reviewer: the exact outcome and, for a repository write, the final
range and preferably a fresh workspace; it reads captured evidence, reruns nothing already green, runs at
most one falsifier, walks the consumer surface when named, requires byte-identical pre/post
porcelain, and is preserved for the whole loop. Researcher: one question, one evidence format,
read-only; a separate review follows only when the report is proposed as closure or authorization,
otherwise the CTO verifies its sources and folds the result into the next contract.

## The return

The captured lines are what the inspector reads instead of rerunning the work; that substitution
holds only if the lines are real. The default ceiling is 1200 characters and the hard ceiling of 1800 characters is never exceeded; systemic
security, corruption, race, privacy or data-loss evidence keeps its complete capture in a named
durable artifact the return links.

```text
RANGE: <source-linked baseline..final revision, or `uncommitted: sandbox`>
TIME: <dd/mm hh:mm> local, <n>m of work
CHANGES: <one line per contract item: what it asked, what the code now does>
CHECKS:
| claim | command, verbatim | result line |
| --- | --- | --- |
FALSIFIERS: <which check fails under which deliberate break, with the captured failing line>
SCREENSHOTS: <file · surface · theme · dimensions · what it shows; or none>
UNVERIFIED: <every contracted claim no command above establishes; `none` is itself a claim>
FINDINGS: <what the contract or package lacked; declared additive edits; proposed children; no workarounds applied>
```

`CHECKS` carries only commands that ran; a command named but not executed, or a suite green from
memory, is a false statement about evidence. `FALSIFIERS` names the break, not the intention.
`SCREENSHOTS` is a manifest and exists only where an owner decision waits on it. The CTO checks the
structure before dispatching an inspection, so an incomplete return costs a message rather than a
round. Every commit or file cited follows [Source references](source-references.md). Evidence needed
after archive is committed, copied to an approved artifact store, or captured concisely in the
checkpoint; a dead workspace path is not evidence.
