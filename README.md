# Claude/Codex plugins

Personal plugin repository (`maggnus`). The `team` plugin targets Claude Code; `paseo-cto` is a
dual Claude Code/Codex plugin.

## Install

```sh
claude plugin marketplace add maggnus/claude-plugins
claude plugin install team@maggnus
claude plugin install paseo-cto@maggnus

codex plugin marketplace add maggnus/claude-plugins
codex plugin add paseo-cto@maggnus
```

On the dev machine the marketplace can point at the local clone instead, so edits apply without
a push:

```sh
claude plugin marketplace add ~/Code/claude-plugins
codex plugin marketplace add ~/Code/claude-plugins
```

## Plugins

### `team` — the virtual-team operating model

A generic, project-agnostic multi-agent operating model: a **CTO/lead** (the main conversation)
supervises on-demand specialists, runs work as **bounded sequential sprints**
(mission · goals · plan), and **gates every change** on top of an elevated adversarial reviewer.

Ships:

- **skill `team`** — the operating model: roles × skills team composition, the sprint lifecycle,
  risk-tiered ceremony, sizing, reporting, execution rules, founder gates. Project specifics
  attach through its *Project bindings* slots (validation gate, docs of record, area skills,
  commit convention, workflow-script home) resolved per repo and recorded there.
- **agent `builder`** — implements strictly within its assigned scope; leaves changes
  uncommitted; scoped self-checks.
- **agent `reviewer`** — adversarial quality gate at max effort; refute-by-default, file:line
  evidence; runs the project's validation gate; **no write tools** — report-only is structural.
- **agent `researcher`** — read-only ground / pre-flight / answer; returns digests other agents
  consume.

Domain knowledge does not live here — it stays in each project's own area skills
(`.claude/skills/*`). Never copy the skill or the role agents into a project; a local copy
shadows the plugin and drifts.

### `paseo-cto` — the external-agent CTO operating model

A project-agnostic CTO organization over external Paseo agents, packaged natively for both Claude
Code and Codex. The CTO delegates by default: it decomposes the work, dispatches isolated role-skilled
agents, and touches code itself only for a trivial change or a bounded integration-time fix. It keeps
a living hierarchical execution plan, moves independent work forward while deepening discovered
branches, routes work across GPT and Claude, and preserves founder, review, integration, push, deploy,
and irreversible-operation gates.

The first operating run presents a compact multiple-choice charter for CTO strategy, available
models, reasoning and permission policies, fleet budget, autonomy horizon, and review depth. It is
persisted per project at `<git-common-dir>/paseo-cto/SETTINGS.json` and reused across conversation or
daemon restarts, worktrees, run IDs, and Claude/Codex CTO handovers. Four explicit worker skills define
provider-neutral authority.
Writers use isolated workspaces and local commits; the CTO reviews every write, assigns a ten-point
assessment, resolves evidence-based disputes, and integrates safely.

Invoke the CTO skill as `$paseo-cto:paseo-cto` in Codex or `/paseo-cto:paseo-cto` in Claude. Worker
prompts use the same qualified namespace for `paseo-builder`, `paseo-reviewer`,
`paseo-researcher`, or `paseo-lead`; dispatch fails closed when the plugin is unavailable in the
selected worker family.

A named 15-minute heartbeat reconciles the plan, agents, workspaces, reviews, stalls, and cleanup.
Every reconcile rewrites one durable status render at a fixed path — the owner's always-current answer
to "where are we" — and reflects the same values into chat, so a Claude CTO and a Codex CTO produce
identical output and no report is silently skipped. Recoverable checkpoints and stable labels allow a
fresh or compacted session to resume without replaying completed work.

Ships:

- **skill `paseo-cto`** — the CTO operating loop, onboarding charter, living plan, founder status,
  review, lifecycle, provider policy, and complete Paseo command catalog;
- **worker role skills** — `paseo-builder`, `paseo-reviewer`, `paseo-researcher`, and `paseo-lead`;
- **Claude manifest** — `.claude-plugin/plugin.json` for marketplace installation;
- **Codex manifest and skill metadata** — `.codex-plugin/plugin.json` and
  `skills/paseo-cto/agents/openai.yaml`, with no hardcoded Paseo MCP endpoint.

References load progressively: project status does not load fleet/task documentation, ordinary
fleet work uses a compact core-command sheet, and the complete command catalog is lookup-only.

## Releasing a change

For `paseo-cto`, keep the base version in `.claude-plugin/plugin.json` and
`.codex-plugin/plugin.json` identical. Before committing, refresh the Codex cachebuster and validate
the plugin:

```sh
python3 ~/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py paseo-cto
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py paseo-cto
```

Then commit and push. Machines installed from GitHub update and reinstall from the remote
marketplace with:

```sh
claude plugin marketplace update maggnus
codex plugin marketplace upgrade maggnus
codex plugin add paseo-cto@maggnus
```

Start a new Codex conversation after reinstalling so it loads the updated skills and tools.
