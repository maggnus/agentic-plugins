# Work rules

The rules every agent follows here. The plan is [ROADMAP.md](ROADMAP.md), task state is
[BOARD.md](BOARD.md), residuals and parked ideas are [FINDINGS.md](FINDINGS.md). Decisions live in
the project's decision records; a task only links to them.

## Files

- **Board** — one table row per task: mark, task, outcome, commit, time of the last change.
- **Task** — `tasks/<id>.md` while the task is open: risk, group, dependencies, what it keeps,
  outcome, scope, acceptance, `Proof:`. A builder that finds no `Proof:` writes one first.
- **Group check** — the line under a group; run on the running environment after its last task.
- Tasks of later milestones are one row on the board; their file is written when they are picked.

## Fast loop

- A builder works in its own worktree and branch, commits locally, never pushes, merges the fresh
  main before reporting and runs the fast check.
- Acceptance by risk: routine by reading, significant by running `Proof:`, critical with one
  independent reviewer.
- An accepted branch lands at once with `land.py`; nothing is pushed while a release runs; a
  failed rollout is fixed forward.

## Guardrails for builders

- <what builders never touch: live environments, shared resources, secrets>
- <ports, local services, generated code rules>
