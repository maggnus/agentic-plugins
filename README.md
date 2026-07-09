# claude-plugins

Personal Claude Code plugin marketplace (`maggnus`).

## Install

```sh
claude plugin marketplace add maggnus/claude-plugins
claude plugin install team@maggnus
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

## Releasing a change

Edit → commit → push. Machines installed from GitHub pick it up via
`claude plugin marketplace update maggnus`.
