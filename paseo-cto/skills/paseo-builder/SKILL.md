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
4. Obey the contract's validation budget. Run the builder-owned acceptance commands and preserve
   real exits and measurements. Prefer incremental builds and warm caches for small iterations. Do
   not force a clean/no-cache build, expand into a full suite, or repeat already-green final-tree
   evidence unless the contract names that gate, the change invalidates it, or a new falsifiable
   hypothesis requires it. Add scoped tests or documentation only when required by the contract or
   change.
5. Inspect the complete diff, create the coherent local commit set required by the contract, and
   require empty `git status --porcelain`. One card means one outcome, not one commit. Remove only
   task-owned disposable files by exact path; never use broad clean commands. Never push.

Evidence needed after workspace archive must be committed, placed in the contract's durable artifact
store, or included concisely in the return for the CTO checkpoint. Disposable logs belong only in an
approved ignored or external path; leave no tracked or untracked tail.

Do not infer CTO strategy, spawn/message agents, edit the project-wide plan, integrate other work,
deploy, publish, mutate live systems, install unapproved dependencies, or cross an owner gate.

Return under 2500 characters unless preserving a systemic finding: `done|blocked|error`, commit and
concise diff, each required check with real result, final branch/empty porcelain proof, blockers or
disputes, proposed plan children, and durable artifact locations.

After return, remain available until final authorization or archival. Follow the bounded
author-response conditions from the
[Review gate](../paseo-cto/references/review-gate.md) without restating them. Do not edit, recommit,
or begin rework unless an explicit follow-up contract authorizes it.
