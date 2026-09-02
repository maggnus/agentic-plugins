# Changelog

One tag per release, named after the `paseo-cto` base version. Sibling plugins are versioned on
their own and move inside the same tag. Entries record what changed in the method, not every commit.

## Unreleased — paseo-cto lean method (next tag)

One day of the 10.8.2 method on a real project (four builders, three independent reviews, two
rehearsals, four dev walks) measured where the plugin was the brake: a review floor stricter than
the owner wanted and forbidden to weaken, 27 KB of CTO skill plus 100 KB of references before the
first dispatch, a 15-minute full-fleet heartbeat, and drift between files on the return ceiling.
The parts that produced the day's real findings — the work tree, the ledger, the finding kinds,
the two-return loop, the proof-that-can-fail rule, the consumer-surface walk — are unchanged.

- **The review floor is the charter's.** `reviewDepth` is `lean`, `standard` (default) or
  `strict`; `risk-based` and `every-write` keep working as older names. Under `standard` the CTO
  glances at `Routine` work itself (return, checks, diff stat — no code read), a non-author
  reviewer with one falsifier inspects `Significant`, and an independent reviewer with an executable
  proof inspects `Critical`. `lean` makes `Significant` a CTO look at the whole diff. The `Critical`
  row — authentication, authorization, tenant isolation, privacy, data loss, corruption,
  irreversible actions — cannot be lowered by any charter. A CTO that returned twice does not grant
  itself a budget; its third look is an independent reviewer's.
- **Loads in a third of the space.** CTO skill 27.6 → 9 KB, reviewer 15.7 → 7 KB, builder 8 → 5 KB,
  researcher 3.2 → 2 KB; references 194 → 100 KB, with `persistent-settings.md` folded into the
  charter, `execution-plan.md` into fleet operations and the work tree, `builder-return.md` into the
  contract. The first Operate reads five references (about 38 KB) instead of eight. A test now holds
  every ceiling.
- **The heartbeat is cheap by default.** Cadence is the charter's `heartbeatMinutes` (default 30);
  a quiet heartbeat runs the cheap check and posts one liveness line, and the full reconcile with
  the fleet render happens only on a return, an error, a permission, or every fourth beat.
- **Host-native researchers.** `hostNativeRoles` (default `["researcher"]`) lets read-only research
  and a `Routine`/`Significant` inspection run as the host's own subagent; writers and `Critical`
  reviewers stay Paseo agents.
- **A card is a dispatch unit.** `CARD.md` carries `Current state`, `Review rounds` and `Closure`
  (optional in place, so existing trees validate); an accepted card with no tasks needs its closure
  commit and evidence like a task.
- **The plan review may be waived** for a wave of at most three cards with no `Critical` card that
  is not the project's first; `plan_review_state: waived` records the CTO's answers as evidence and
  the check refuses a waiver on a bigger or critical wave.
- **The pre-dispatch contract check defaults to `Critical` and shared infrastructure only.**
- **One return ceiling.** Two returns, then `ESCALATE`, then at most a bounded budget of two: four
  is the ceiling in every file; the WORKFLOW template no longer says seven, the contract no longer
  says five, and it scores three axes like the gate. A test holds the number.
- **Both hosts named where they differ.** Every contract carries `Plugin path` for the role-file
  fallback; a Codex builder whose sandbox cannot reach the Git common directory returns
  `uncommitted: sandbox` and the CTO commits at integration.
- **Bookkeeping survives a daemon hiccup.** `ledger.py` records the event and marks `FLEET.md` stale
  when the render cannot complete, defaults the timezone to the machine's, and still treats a
  missing renderer as an error. `release.sh` commits the tooling stamp with the cachebuster so the
  tag carries the digest it verifies.
- **Two registers.** Durable records keep the neutral, impersonal register; chat answers the owner's
  actual question and may name a commit, a branch, an agent or a file. `check-owner-status.sh` no
  longer rejects a file name and applies to unsolicited status deltas only.

## v10.7.2 — brief 1.0.0, paseo-cto 10.7.2

The phase before the first line of code became its own plugin.

- `brief` sets a product up before any code exists: the product stated as one claim with the
  refusals that bound it, a shortest already-useful path, an observable measure and the assumptions
  still unproven.
- A capability enters the product only when at least two genuinely unlike uses require it, or when
  it is a safety or consistency invariant nothing but the product itself can enforce; everything
  else stays one use's own work behind a named escape hatch.
- The concept becomes a numbered proof a stranger can run on published artifacts, and that proof
  generates the order of slices — the first of which carries a consumer end to end.
- Decisions that belong to the owner are written down as open decisions with the work that waits on
  them, never filled in to make the concept read as complete.
- The decomposition is read by someone who did not write it against ten questions, `ACCEPT` or
  `RETURN` on the same plan, two returns and then a decision.
- The phase leaves a documentation frame with a fixed authority order: one entry point that every
  environment instruction file points at, the normative product document, decision records that keep
  their rejected alternatives, and a numbered invariant registry.
- The distribution check now holds every sibling package to the Codex contract it holds `paseo-cto`
  to: matching manifests, a shared skills directory, `agents/openai.yaml` beside every skill, and one
  resolving marketplace entry.

## v10.8.2 — paseo-cto 10.8.2

Six tooling defects from a field run of 10.8.1 (four nodes, three builders, three reviewers, one
CTO restart), plus the method changes that run argued for. Nothing in the review gate, the
pre-dispatch contract check, the builder return, the direct author–reviewer exchange or the ledger's
sole authorship of events changed — those carried the run.

- **A1 — a short SHA was accepted.** `candidate --commit 0fa0fe80` succeeded, the render then failed,
  and the node carried a bare SHA against the source-reference rule. *Now:* `--commit` and
  `--closure-commit` take a 40-character SHA or a commit-pinned URL and refuse anything else before
  writing; a SHA becomes `<sourceRepository>/commit/<sha>` from the project's settings.
  *Test:* `test-ledger.sh` A1 — fails on 10.8.1, passes on 10.8.2.
- **A2 — two decision vocabularies.** `escalate --decision split` wrote a line the validator then
  rejected. *Now:* one table in `work-schema.json` — `bounded_retry`, `independent_review`,
  `accept_with_corrections`, `split`, `stop` — each saying whether it extends the loop; the ledger
  refuses a decision outside it; `review-gate.md` documents the table. *Test:* A2 — fails on 10.8.1.
- **A3 — the journal limit was enforced after the write.** *Now:* the ledger trims `--finding` and
  `--reason-text` to the schema limit before writing and says so. *Test:* A3.
- **A4 — a reviewer's dirty tree blocked FLEET.md for the whole review.** *Now:* uncommitted files in
  a report-only workspace are a warning; a builder's stay an error. *Test:* `test-plugin-contracts.sh`
  A4, both cases.
- **A5 — inventory by directory lost worktree agents** and a restarted CTO dispatched a duplicate.
  *Now:* `fleet-operations.md` and `paseo-core-commands.md` inventory by the `paseo-cto.run` label
  and by checkpoint IDs, never by path.
- **A6 — after a CTO restart the agents' parent pointed at the dead session.** *Now:* resume begins
  with adoption (`update_agent`, parent = this session) before any dispatch, and the validator's
  message names that step.
- **B1 — the deployment window is a resource.** Plan commits queue and push with `[skip ci]` in a
  quiet window; code merges go one at a time after the previous promotion completes; the window
  check is a named pre-push step.
- **B2 — `measurement-gaming` is a finding kind.** Changing how a claim is measured instead of what
  the product does returns the work; a second such finding against the same author breaks the loop
  and reassigns the node.
- **B3 — window expiry is a command.** The author returns a candidate within twenty minutes with
  `deliberate_partial` declared and the remainder under `UNVERIFIED` and `FINDINGS`.
- **B4 — the pre-dispatch contract check covers Routine nodes on shared infrastructure**; other
  Routine nodes keep it optional per settings.

## v10.8.1 — paseo-cto 10.8.1

Three defects in `ledger.py`, found on its first real day (Qwibi, 27 August 2026), and three small
additions in the same patch. Nothing in the review gate or the owner gates changed.

- **Defect 1 — `merge` accepted on the owner's behalf.** After `merge` a node carried
  `state: accepted` and a filled `accepted_at`, although landing on the integration branch is
  integration and the owner's acceptance is a separate pass. *Now:* `merge` records
  `closure_commit` and the evidence and leaves the node in `review`; a new `accept` event sets
  `accepted` and `accepted_at` from the clock, with `--task` repeatable for a batch; a project where
  merging is accepting sets `acceptance.mergeIsAcceptance: true`. *Accepted:* after `merge` the
  state is `review` and `accepted_at` is empty; after `accept` both are set; `work check` is green in
  both states.
- **Defect 2 — `merge --evidence` broke the front matter.** A bare URL was written as a list item
  the validator cannot read, and every later check refused the file until it was edited by hand.
  *Now:* `--evidence` accepts a URL — captioned `Candidate <short-sha>` or `--evidence-label` — or a
  ready Markdown link, and is repeatable: the first link goes into the front matter, all of them into
  `Closure › Evidence`. A value that is neither is refused before anything is written. *Accepted:*
  clean front matter with one and with two links; the invalid value fails with a message and no
  file changes.
- **Defect 3 — the fleet render was silently skipped.** The tooling copy lacked `render_fleet.py`
  and `check_runtime.py`, and the ledger printed `fleet render skipped`. *Now:* a missing renderer
  is an error with a non-zero exit; the ledger looks beside itself first, then in the installed
  plugin at the checkpoint's `plugin.version` and says where it took the script from;
  `check-work-tooling.sh` requires the whole set. *Accepted:* on a complete copy `candidate` ends in
  a written `FLEET.md`; on a missing renderer the command fails and the word "skipped" never appears.
- `candidate` and `verdict` say `returns spent 2/2: next verdict is ESCALATE unless
  bounded_retry/independent_review is recorded` while the next round can still be planned, and
  `escalate --decision bounded_retry` is accepted before that round.
- `verdict --task-finding <task>=<text>` gives one node of a batch its own journal line.
- Every event prints one result line per touched node — state, round, candidate, head — so the CTO
  reads the outcome instead of the files.

## v10.8.0 — paseo-cto 10.8.0

Bookkeeping moved from the CTO's turns into a command, and the round loop lost its avoidable latency.
Every control stage is unchanged: each delegated write still gets an independent reviewer at its risk
tier, the CTO still does not inspect, owner gates are untouched.

- **A. One ledger call per event.** [`templates/ledger.py`](paseo-cto/skills/paseo-cto/templates/ledger.py)
  performs `dispatch`, `candidate`, `verdict`, `merge`, `retire`, `block` and `escalate`, writing the
  checkpoint, the node files, the journal line, the index and the fleet render in one call, stamped
  from the system clock. *Accepted:* candidate → RETURN → candidate → ACCEPT → merge → retire runs in
  six calls with no hand edits and a valid tree.
- **B. One run reports everything.** The validator no longer stops at the first defect in a node,
  every finding carries an exact `fix:`, over-long journal lines are trimmed by `check --fix` instead
  of refused, `[reset R<n>]` is a legal round form, and the budget warning arrives while a round can
  still be planned. *Accepted:* a tree carrying five typical defects lists all five in one run.
- **C. A builder return has a required shape.**
  [`references/builder-return.md`](paseo-cto/skills/paseo-cto/references/builder-return.md) fixes the
  range, the per-item changes, the claim/command/result table for commands that actually ran, the
  falsifiers, the screenshot manifest and the mandatory `UNVERIFIED` list. *Accepted:* the contract
  requires it and the reviewer reads it as a checklist.
- **D. Delta re-review.** After an accept-with-corrections or a proof-only return, the reviewer
  inspects only `prev..new` in 300 characters. It counts as a round and spends no return unless it
  finds a new outcome-defect. *Accepted:* the rule is in the gate and `verdict --delta` records it.
- **E. Shared resources are modelled.** The checkpoint carries resources with a mode; a second task
  on an `exclusive` one stops for an explicit decision; `resourcePolicy` records which stands the
  owner treats as consumable. *Accepted:* the second dispatch fails until `--acknowledge`.
- **F. A batch is a first-class dispatch.** One contract, one workspace, one review over several
  homogeneous nodes, each keeping its own acceptance and closure; `--task` repeats. *Accepted:* three
  nodes complete their cycle in six ledger calls.
- **G. Cost and time are recorded.** Per node and per run: minutes by role, rounds, and returns
  classified as outcome-defect, proof, rule or contract. *Accepted:* `FLEET.md` carries accepted /
  merged / in flight / remaining, percent by risk weight, average round length and the proof-return
  share.
- **H. Pre-dispatch contract check.** For significant and critical nodes a non-author reviewer
  attacks the contract in five minutes against a five-item checklist and answers in one line.
  *Accepted:* the rule is in the gate and the dispatch step; `contractCheck` can disable it for
  routine only.
- **I. One clock, one source.** The ledger stamps every event from the system clock, the quiet status
  line is read from the checkpoint rather than recalled, and the heartbeat warns when pushes to the
  integration branch outpace `mainAdvanceWindowMinutes`.

The checkpoint moves to schema 3; `ledger.py` migrates a schema-2 file in place, adding resources and
accounting without losing what it recorded.

## v10.7.1 — paseo-cto 10.7.1

Runs and tokens became an owned budget rather than a side effect.

- `SKILL.md` renames the context policy to *Spend context, runs and tokens deliberately* and makes
  the CTO accountable for the spend: a run that cannot change the next decision is not run, long
  commands run detached and are read by their exit line, command output is bounded, and the full
  suite runs once at a named closing gate.
- `validation-budget.md` rations end-to-end runs: admitted only where the defect is observable
  solely on the consumer surface, one scenario per task, no route or theme matrices, no screenshot
  matrices beyond a single owner-approval set, and no negative half bought by a repeated full run.
- `assignment-contract.md` prices this before dispatch through explicit `Validation budget`
  subfields, and bounds builder and reviewer runs.
- `review-gate.md` reads success and failure paths from the author's captured logs; the reviewer's
  own execution is its single falsifier, and Routine adds no run beyond reading.
- `fleet-operations.md` forbids wait loops inside a CTO turn; `status-and-reporting.md` keeps
  command output out of status messages.

The negative-half requirement is unchanged: it moves to the cheapest level that discriminates the
defect rather than disappearing.

## v10.7.0 — paseo-cto 10.7.0, team 1.3.0

The CTO stopped inspecting: every outcome is reviewed by a non-author reviewer at every risk tier,
and the CTO classifies, decides and integrates on that reviewer's evidence. The convergence loop
dropped from five returns to two, with four as the ceiling after a granted budget.

## v10.6.0 — paseo-cto 10.6.0

Closing a run tears down every resource it created — terminals, agent records, schedules, the
heartbeat, workspaces — and proves absence with a label-scoped inventory before the close is
announced.

## v10.5.1 — paseo-cto 10.5.1

The release version is derived by `bump.py` from the commits since the last tag instead of being
raised by hand; a break is recognised only as a footer.

## v10.5.0 — paseo-cto 10.5.0, team 1.2.0

Checks are derived from what the change can break and ordered where they can still change a
decision. The reviewer walks the surface the consumer meets, and scoring gained the experience axis.

## v10.4.0 — paseo-cto 10.4.0, team 1.1.0

The reviewer and the author converge on their own across a bounded loop; every verdict carries a
ten-point score and its moment, recorded one line per round in the node's journal.
