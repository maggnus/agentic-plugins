# Claude/Codex plugins

Personal plugin repository (`maggnus`). The `team` plugin targets Claude Code; `paseo-cto` is a
dual Claude Code/Codex plugin and behaves identically on both platforms.

## Install

```sh
PASEO_CTO_TAG=v7.0.1
claude plugin marketplace add "maggnus/claude-plugins@${PASEO_CTO_TAG}"
claude plugin install team@maggnus
claude plugin install paseo-cto@maggnus
```

```sh
PASEO_CTO_TAG=v7.0.1
codex plugin marketplace add maggnus/claude-plugins --ref "$PASEO_CTO_TAG"
codex plugin add paseo-cto@maggnus
```

All `paseo-cto` installations use the remote GitHub marketplace pinned to the matching immutable
release tag. A local directory, a moving branch, or an unpinned remote marketplace is not a valid
installation source. The local repository is used for development and validation only.

## Plugins

### `team` — the virtual-team operating model

A generic, project-agnostic multi-agent operating model: a **CTO** (the main conversation)
supervises on-demand specialists, runs work as **agile time-boxed sprints** — a pulled backlog run
as parallel streams with serialized gates — and **gates every change** on top of an elevated
adversarial reviewer.

Ships:

- **skill `team`** — the operating model: roles × skills team composition, the sprint lifecycle,
  the reliability doctrine, risk-tiered ceremony, sizing, founder gates. Detail that is needed only
  at one moment lives in two progressively loaded references (`execution-rules.md`,
  `reporting.md`). Project specifics attach through the skill's *Project bindings* slots
  (validation gate, verification substrate, docs of record, area skills, commit convention, script
  homes) resolved per repo and recorded there.
- **agent `builder`** — implements strictly within its assigned scope; leaves changes
  uncommitted; scoped self-checks.
- **agent `reviewer`** — adversarial quality gate at max effort; refute-by-default, file:line
  evidence; runs the project's validation gate; **no write tools** — report-only is structural.
- **agent `researcher`** — read-only ground / pre-flight / answer; returns digests other agents
  consume.

Domain knowledge does not live here — it stays in each project's own area skills
(`.claude/skills/*`). Never copy the skill or the role agents into a project; a local copy
shadows the plugin and drifts.

This plugin is Claude Code only by construction: its roles are Claude Code subagents and its
fan-outs use the Workflow tool, neither of which Codex provides. Multi-agent work under Codex runs
through `paseo-cto`, whose workers are external Paseo agents.

### `paseo-cto` — the external-agent CTO operating model

A project-agnostic CTO organization over external Paseo agents, packaged natively for both Claude
Code and Codex. The CTO delegates by default: it decomposes the work, dispatches isolated
role-skilled agents, and touches code itself only for a trivial change or a bounded
integration-time fix. It manages toward outcomes rather than activity, keeps a living hierarchical
execution plan, moves independent work forward while deepening discovered branches, and preserves
founder, review, integration, push, deploy, and irreversible-operation gates.

**The plugin names no model, no reasoning effort, and no provider preference, and never supplies a
default for one.** Which model and which effort carries which role — the CTO's own seat included —
is the owner's decision, recorded in the project charter's `roleAssignments` and nowhere else. A
role with no assignment is not dispatchable, and an unavailable model is reported rather than
silently substituted. `reportingLanguage` is also project-local and authoritative: any valid local
value, including Russian, overrides the plugin's English first-run proposal and the host's current
conversation language. The register remains formal, neutral, impersonal, grammatical, result-first,
and silent in place of repetition in every configured language.

The first operating run presents a compact charter for CTO strategy, role assignments, permission
policy, fleet budget, autonomy horizon, review depth, and reporting language. It is persisted per
project at `<git-common-dir>/paseo-cto/SETTINGS.json` and reused across conversation or daemon
restarts, worktrees, run IDs, and Claude/Codex CTO handovers. Writers use isolated workspaces and
local commits. Every returned outcome receives the risk-required non-author review, including
report-only research and design; repository writes integrate only after acceptance. Every commit or
repository file used as durable evidence is a source-code link pinned to the exact revision.

Invoke the CTO skill as `$paseo-cto:paseo-cto` in Codex or `/paseo-cto:paseo-cto` in Claude. Worker
prompts use the same qualified namespace with the platform's own prefix — `$paseo-cto:paseo-<role>`
in Codex, `/paseo-cto:paseo-<role>` in Claude — for `paseo-builder`, `paseo-reviewer`, and
`paseo-researcher`; dispatch fails closed when the plugin is unavailable in the selected worker
family.

A named 15-minute heartbeat reconciles the plan, agents, workspaces, reviews, stalls, and cleanup.
Every reconcile rewrites one durable status render at a fixed path — the owner's always-current
answer to "where are we" — and reflects the same values into chat, so a Claude CTO and a Codex CTO
using the same project settings produce equivalent output in the same configured language and no
report is silently skipped. Recoverable checkpoints and stable labels allow a fresh or compacted
session to resume without replaying completed work.

Ships:

- **skill `paseo-cto`** — the CTO operating loop, outcome discipline, reporting register, onboarding
  charter, living plan, founder status, review gate, fleet lifecycle, provider policy, and the Paseo
  command catalog;
- **document standard and templates** — the canonical plan document, acceptance history and
  invariant registry, plus checks for document shape, atomic task transfer, source links, and the
  owner-facing reporting register. An accepted task is appended to acceptance history and removed
  from current execution in one semantic change; it is never duplicated or silently discarded;
- **worker role skills** — `paseo-builder`, `paseo-reviewer`, and `paseo-researcher`;
- **Claude manifest** — [`.claude-plugin/plugin.json`](paseo-cto/.claude-plugin/plugin.json) for
  marketplace installation;
- **Codex manifest and skill metadata** — [`.codex-plugin/plugin.json`](paseo-cto/.codex-plugin/plugin.json)
  and one Codex metadata file in each [shared skill directory](paseo-cto/skills), with no hardcoded
  Paseo MCP endpoint.

Both hosts load the same [skill sources](paseo-cto/skills). Only invocation syntax, the Codex
cache-busting build suffix, and Codex interface metadata differ. The
[distribution synchronization check](paseo-cto/scripts/check-distribution-sync.sh) verifies the
shared descriptions, authors, base versions, marketplace source, skill set, and release heading.
The [installed-release check](paseo-cto/scripts/check-installed-release.sh) additionally verifies
that both host installations resolve the same remote tagged commit.

References load progressively. Project status reads only the reporting reference and the plan;
ordinary fleet work uses a compact core-command sheet; archival and close load their own reference;
the complete command catalog is lookup-only.

## Releasing a change

For `paseo-cto`, keep the base version in the
[Claude manifest](paseo-cto/.claude-plugin/plugin.json) and
[Codex manifest](paseo-cto/.codex-plugin/plugin.json) identical. Before committing, run the contract
tests, refresh the Codex cachebuster, validate the plugin, and verify both distributions:

```sh
bash paseo-cto/scripts/test-plugin-contracts.sh
python3 ~/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py paseo-cto
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py paseo-cto
bash paseo-cto/scripts/check-distribution-sync.sh
```

Commit the validated release, create its immutable tag, and push both. Never move or replace a
published release tag. Existing installations migrate by removing the old marketplace registration,
adding the remote repository at the new tag, and reinstalling:

```sh
PASEO_CTO_TAG=v7.0.1

claude plugin uninstall paseo-cto@maggnus --scope user
claude plugin marketplace remove maggnus --scope user
claude plugin marketplace add "maggnus/claude-plugins@${PASEO_CTO_TAG}" --scope user
claude plugin install paseo-cto@maggnus --scope user

codex plugin remove paseo-cto@maggnus
codex plugin marketplace remove maggnus
codex plugin marketplace add maggnus/claude-plugins --ref "$PASEO_CTO_TAG"
codex plugin add paseo-cto@maggnus

bash paseo-cto/scripts/check-installed-release.sh
```

Restart Claude Code and start a new Codex conversation after reinstalling so both hosts load the
tagged skills and metadata.
