# Claude/Codex plugins

Personal plugin repository (`maggnus`). The `team` plugin targets Claude Code; `paseo-cto` is a
dual Claude Code/Codex plugin.

## Install

```sh
claude plugin marketplace add maggnus/claude-plugins
claude plugin install team@maggnus
claude plugin install paseo-cto@maggnus
```

On the dev machine the marketplace can point at the local clone instead, so edits apply without
a push:

```sh
claude plugin marketplace add ~/Code/claude-plugins
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

A project-agnostic CTO loop over external Paseo agents, packaged natively for both Claude Code and
Codex. It selects the first unblocked roadmap atom from project truth, delegates work under an
owner-controlled model allowlist and exclusive file zones, reviews by execution, and keeps review,
integration, and push gates with the CTO.

The default fleet policy uses `codex/gpt-5.6-sol` with `xhigh` reasoning, `subagent` relationships,
dedicated worktrees for substantive writes, bounded concurrency, and finish notifications instead
of polling. Its default 15-minute heartbeat observes and reports active work; it never starts a
duplicate agent. Owners can explicitly override the cadence and model allowlist.

Ships:

- **skill `paseo-cto`** — a concise operating entrypoint with separate task-contract and
  fleet-lifecycle references;
- **Claude manifest** — `.claude-plugin/plugin.json` for marketplace installation;
- **Codex manifest and skill metadata** — `.codex-plugin/plugin.json` and
  `skills/paseo-cto/agents/openai.yaml`, with no hardcoded Paseo MCP endpoint.

## Releasing a change

Edit → commit → push. Machines installed from GitHub pick it up via
`claude plugin marketplace update maggnus`.
