# `rad-ai`

An experimental, self-contained adaptation of Rapid Application Development for AI agents.
A bounded cycle frames the user outcome, investigates consequential uncertainty, implements
and integrates changes, accepts behavior and architecture against evidence, and obtains feedback.
The optimization target is elapsed time to an accepted outcome subject to explicit quality constraints.

The method is independent of model provider and execution service. The main skill can frame,
implement and integrate directly, and the implementation role separates context when delegation
is available and authorized. Acceptance always comes from a separate review context (a subagent,
another session or agent, or the owner); without one the outcome remains `UNVERIFIED`. Both
Codex and Claude Code provide subagents; the rules use no platform-specific hooks. All operational instructions and resources are English and contained
in this package.

## Instruction limits

- Rules are concise; length is not capped by word count.
- Each operational Markdown file stays within 500 lines, because agents weigh the first
  500 lines most; decisive rules come first.
- Operational references stay inside `skills/`; research documents are not automatically loaded.

Package checks reject violations. The main instruction retains the complete decision process;
references supply the contract fields and broad-dependency investigation.

## Review and stage reports

Text reviews begin with `ACCEPT R2 (10/10)` or `RETURN R2 (8/10)`.
`R2` identifies the outcome's second review round; rounds advance on corrected
resubmission and survive repeated reads, restarts and reviewer changes. Scores are
ordinal assessments from 1 to 10, using the lowest applicable code, evidence or
observed user-path axis. Acceptance requires 10: verified requirements, a sufficient
contract, current required checks and no unresolved defects. A 9 accepts only defects
excepted by a cited owner decision; 8 or lower returns. Only a separate review
context accepts; a reviewer's proposal to defer a defect is not authorization.
Unavailable assessment uses `UNVERIFIED R2 (n/a)`; JSON exposes `verdict`, `round`
and nullable `score` alongside the evidence fields.

Every progress report recalculates the current stage from reconciled source records:

```text
W5 (57%) ✅ 20 📋 35 ⚙️ 3 🙋 1
```

`W5` is an example stage index; the line carries the index alone, never a word
naming the stage. `✅` counts completed tasks and `📋` distinct noncancelled stage tasks;
the percentage is completed tasks divided by that total, rounded to the nearest
integer with halves rounded up. `⚙️` counts implementation and review tasks.
`🙋` counts distinct unresolved decisions requiring human authority; one decision
blocking several tasks counts once. Completion requires acceptance of the
current revision, including delivery when required. Reopening work or adding tasks can
reduce the percentage. Empty stages use 0%; missing or contradictory records
produce an unavailable report rather than invented zero values.

The optional stateless formatter reads a fresh JSON view of existing records:

```sh
python3 rad-ai/skills/rad-ai/scripts/report.py status current-stage.json
python3 rad-ai/skills/rad-ai/scripts/report.py verdict current-review.json
```

Stage input has `stage`, `tasks` with `id` and `state`, and `decisions` with `id`,
`state` and boolean `requires_human`. Task states are `ready`, `active`, `review`,
`blocked`, `done`, `cancelled`; decision states are `open`, `resolved`.
Review input has `verdict`, positive integer `round`, and integer `score` from 1
to 10, or null for `UNVERIFIED`. `ACCEPT` and `RETURN` also require `findings` with
`id`, `kind` (`defect` or `suggestion`) and `state` (`open`, `resolved` or
`excepted`); an excepted defect carries `exception` with `decision`, `subject` and
`applies_to`. `ACCEPT` requires `commit` and `checks` with `command` (or the observed manual procedure),
`result` (`pass` or `fail`), `revision` (full or at least 7-character prefix), optional `exit`
and optional boolean `required` (default true): every required check passes on that commit,
every `unchecked` entry is an object with `required: false` (plain text counts as required), no defect is open, and 9 appears only
with exceptions. `RETURN` names an open defect and scores 8 or lower. This checks
record consistency only; it cannot establish code quality or block a manual closure. The formatter stores no task state or displayed
values. Its use is optional; the complete reporting rules are in the skill.

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
claude plugin marketplace add "maggnus/agentic-plugins@v13.4.0"
claude plugin install rad-ai@maggnus
```

### Codex

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v13.4.0
codex plugin add rad-ai@maggnus
```

When Codex reports that this marketplace is registered from a different source, run
`codex plugin marketplace remove maggnus`, then repeat the pinned marketplace and plugin
commands above. Use native commands to update the registration.

Only the published immutable release tag is a valid installation source. Do not install from
a working directory or clone. Versions and these installation tags are generated by the shared
GitHub Actions release after source changes reach `main`.

## Source checks

`npm test` includes package integrity, the instruction line limit, calculated-report tests and shared-release checks.
`python3 rad-ai/scripts/check-package.py` validates this package without installing it.
Behavioral evaluation is separate from structural validation.
