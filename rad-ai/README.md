# `rad-ai`

An experimental, self-contained adaptation of Rapid Application Development for AI agents.
A bounded cycle frames the user outcome, investigates consequential uncertainty, implements
and integrates changes, accepts behavior and architecture against evidence, and obtains feedback.
The optimization target is elapsed time to an accepted outcome subject to explicit quality constraints.

The method is independent of model provider and execution service. The main skill can frame,
implement and integrate directly, and the implementation role separates context when delegation
is available and authorized. Acceptance always comes from a separate review context (a subagent,
another session or agent, or the owner); without one the outcome remains `UNVERIFIED`. Both
Codex and Claude Code provide subagents; the rules use no platform-specific hooks. All operational
instructions and resources are English and contained in this package.

## Instruction limits

- Rules are concise and structured so that a loaded skill leaves context to the work; length is
  not capped by word count.
- Each operational Markdown file stays within 500 lines, because agents weigh the first
  500 lines most; decisive rules come first.
- Operational references stay inside `skills/`; research documents are not automatically loaded,
  and package checks verify both file containment and heading fragments.

Package checks reject violations. The main instruction retains the complete decision process;
references supply the project layout, record formats, finding definitions, reporting rules and
broad-dependency investigation.

## Records for long-running work

Work that spans many sessions keeps its state in the repository, not in an agent's context.
Existing project records take precedence; when a repository has none, `rad-ai` uses `docs/rad/`
(`PROJECT.md` for product claim, explicit refusals, invariants, decisions with rejected
alternatives and ordered stages `W1..Wn`, plus `<stage>/stage.json`, `<stage>/acceptance.json`
and `<stage>/outcomes/`):

- **Acceptance list.** `acceptance.json` lists the stage's observable behaviors, each with
  the steps a user performs and `passes`, false until a review has seen the steps pass. Written
  before implementation, items are never deleted from the list: new items may be appended, a
  misdescribed step to an already-delivered behavior or an owner-approved behavior change appends
  a record to `amended` (`["R1 F4: ..."]`), and an owner-withdrawn item sets `removed` (`"D9: ..."`)
  with `passes: false`. A blocking defect is first of all an active item whose steps fail.
- **Project commands.** `run` starts the result ready for use, `check` runs every required check,
  and `smoke` runs a fast base sanity check (`smoke` equals `check` when `check` is fast).
- **Git.** Every candidate is a commit; a workspace without a repository gets one first.
- **Session start.** At every start, resume or context compaction the coordinator reads the
  project frame, stage records, `acceptance.json`, `git log` and `git status`, runs `smoke` (or
  `check` when fast) and walks one passing item unless already verified on clean `HEAD`; a broken
  base is repaired as its own outcome first. The implementer verifies base sanity before editing
  and runs the full `check` command before submitting.
- **User's-eye check.** The implementer performs each item's steps on the running result
  before submitting; the reviewer performs them again.

## Review and stage reports

Text reviews begin with `ACCEPT R2 (blocking 0, corrections 3)` or
`RETURN R1 (blocking 2, corrections 1)`. `R2` identifies the outcome's second review
round; rounds advance on corrected resubmission and survive repeated reads, restarts and
reviewer changes. The counts are of open findings; there is no score.

- A **blocking defect** violates, in what the outcome delivers, an owner requirement, a
  project rule, a named invariant or criterion, or a critical consequence. Only it returns
  an outcome for another round.
- A **correction** is any other flaw in scope that a check can confirm fixed. The review
  names that check; the flaw is fixed, the check passes, and it is closed without another
  review.
- A **note** becomes a task where it belongs or is declined with a reason; it never blocks.

An outcome is complete when a separate review has accepted it and every correction across all
rounds is closed; acceptance carries to a final revision that differs only by those fixes.
Experiments are accepted on their answer. The contract sets a time budget and a round
limit, two by default; the roles decide what happens at the limit without asking the
owner, who decides only changes to the owner's requirements, critical consequences without
evidence and irreversible actions. Unavailable assessment uses `UNVERIFIED R2`.

Every progress report recalculates the current stage from reconciled source records:

```text
W5 (57%) ✅ 20 📋 11 ⚙️ 3 ⛔ 1 🙋 1
```

`W5` is an example stage index; the line carries the index alone, never a word
naming the stage. `⛔ K` appears before `🙋` only when K tasks are blocked; `🙋` is always last. `✅` counts completed tasks and `📋` tasks waiting to start; the four task counts
(`✅`, `📋`, `⚙️`, `⛔`) add up to the distinct noncancelled stage tasks, and
the percentage is completed tasks divided by that total, rounded to the nearest
integer with halves rounded up. `⚙️` counts implementation and review tasks.
`🙋` counts distinct unresolved decisions requiring human authority; one decision
blocking several tasks counts once. Completion requires acceptance of the
current revision, including delivery when required. Reopening work or adding tasks can
reduce the percentage. Empty stages use 0%; missing or contradictory records
produce an unavailable report rather than invented zero values.

The stateless formatter reads a fresh JSON view of existing records:

```sh
python3 <rad-ai-skill-dir>/scripts/report.py status current-stage.json
python3 <rad-ai-skill-dir>/scripts/report.py verdict current-review.json
```

Stage input has `stage`, `tasks` with `id` and `state`, and `decisions` with `id`,
`state` and boolean `requires_human`. Task states are `ready`, `active`, `review`,
`blocked`, `done`, `cancelled`; decision states are `open`, `resolved`.
Review input has `verdict` and positive integer `round`; a `score` field is rejected.
`ACCEPT` and `RETURN` also require `findings` with `id`, `kind` (`blocking`, `correction`
or `note`), `state` (`open` or `resolved`) and optional positive integer `round` (`<= review.round`).
A blocking defect carries `requirement` and `reproduction`. A correction carries `check`, the
command or procedure that confirms its fix, and once resolved `result: "pass"` and the `revision`
on which that check passed. `ACCEPT` requires `commit` and `checks` with `command` (or the observed
manual procedure), `result` (`pass` or `fail`), `revision` (exact match or a 7+ hex Git SHA prefix),
optional `exit` and optional boolean `required` (default true): every required check
passes on that commit, every `unchecked` entry is an object with `required: false` (plain
text counts as required) and no blocking defect is open. `RETURN` names an open blocking
defect; corrections and notes alone never return an outcome.

```sh
python3 <rad-ai-skill-dir>/scripts/report.py complete current-review.json
python3 <rad-ai-skill-dir>/scripts/report.py acceptance acceptance.json \
  --previous base-acceptance.json --previous head-acceptance.json
```

`complete` prints `COMPLETE Rn` only for an accepted review whose corrections are all
resolved: corrections of the final round must pass on the accepted `commit` (or on `final` when
post-acceptance fixes followed it), while corrections carrying an earlier `round` keep the revision
on which they closed prior to `ACCEPT`. `acceptance` prints `W5 acceptance 12/40`, counting passing
active items (`removed` items excluded); with one or more `--previous` snapshots (the stage base and
the latest committed list) it rejects deleted items, rewritten `amended` / `removed` histories, and
any `behavior` or `steps` change that did not append a new entry to `amended`. These commands check
record consistency only; they cannot establish code quality or block a manual closure.

## Invoke

| Role | Codex | Claude Code |
| --- | --- | --- |
| Complete cycle | `$rad-ai:rad-ai` | `/rad-ai:rad-ai` |
| Bounded implementation | `$rad-ai:rad-ai-build` | `/rad-ai:rad-ai-build` |
| Independent acceptance | `$rad-ai:rad-ai-review` | `/rad-ai:rad-ai-review` |

## Evidence and limits

[Method](METHOD.md), [foundations](research/FOUNDATIONS.md),
[agent engineering](research/AGENT-ENGINEERING.md), [thought experiments](research/THOUGHT-EXPERIMENTS.md),
and [evaluation](research/EVALUATION.md) distinguish source evidence, design hypotheses and observations.
The [development plan](PLAN.md) records the release path.

The initial validation concerns bounded decision and workflow feasibility. Comparative acceleration,
long-term architectural preservation and giant-codebase capability remain unverified. A bounded
change in a large repository does not establish suitability for every part of that system.

## Install from GitHub

### Claude Code

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v14.2.0"
claude plugin install rad-ai@maggnus
```

### Codex

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v14.2.0
codex plugin add rad-ai@maggnus
```

When Codex reports that this marketplace is registered from a different source, run
`codex plugin marketplace remove maggnus`, then repeat the pinned marketplace and plugin
commands above. Use native commands to update the registration.

Only the published immutable release tag is a valid installation source. Do not install from
a working directory or clone. Versions and these installation tags are generated by the shared
GitHub Actions release after source changes reach `main`.

## Source checks

`npm test` includes package integrity, instruction line and anchor checks, calculated-report tests and shared-release checks.
`python3 rad-ai/scripts/check-package.py` validates this package without installing it.
Behavioral evaluation is separate from structural validation.
