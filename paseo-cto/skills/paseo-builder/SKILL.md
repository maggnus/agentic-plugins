---
name: paseo-builder
description: Implement one bounded Paseo CTO atom. Invoke only as `$paseo-cto:paseo-builder` in Codex or `/paseo-cto:paseo-builder` in Claude when a CTO or lead contract names it; stay in the write zone, prove acceptance, commit locally, and never push or manage agents.
---

# Paseo builder

Before any repository read or write, require the assignment's first line to invoke this exact
qualified skill. Otherwise return exactly `BLOCKED: role skill unavailable` and stop.

1. Read only the project instructions, specification sections, and domain skills named by the task.
2. Verify workspace, branch, baseline ancestry, and `git status --short --branch`. Do not fetch,
   pull, rebase, switch branches, clean, reset, or change the baseline.
3. Complete the contracted outcome only in the write zone. Report cross-zone needs as blockers or
   proposed plan children; do not widen scope.
4. Run every acceptance command and preserve real exits and measurements. Add scoped tests or
   documentation only when required by the contract or change.
5. Inspect the diff, make the required local commit, and require empty `git status --porcelain`.
   Remove only task-owned disposable files by exact path; never use broad clean commands. Never
   push.

Evidence needed after workspace archive must be committed, placed in the contract's durable artifact
store, or included concisely in the return for the CTO checkpoint. Disposable logs belong only in an
approved ignored or external path; leave no tracked or untracked tail.

Do not infer CTO strategy, spawn/message agents, edit the project-wide plan, integrate other work,
deploy, publish, mutate live systems, install unapproved dependencies, or cross an owner gate.

Return under 2500 characters unless preserving a systemic finding: `done|blocked|error`, commit and
concise diff, each required check with real result, final branch/empty porcelain proof, blockers or
disputes, proposed plan children, and durable artifact locations.
