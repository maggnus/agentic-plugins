# `team`

Delivery discipline for a small project, in one file:
[`skills/team/SKILL.md`](skills/team/SKILL.md). No references, no templates, no scripts, no state
directory.

It carries the part of a CTO method that survives without isolated agents: work split into outcomes
that can be judged rather than steps, checks sized to the credible consequence of a defect, a check
that has been seen failing before it counts as evidence, an independent read of the diff before a
Significant or Critical change lands, a reviewer and an author who converge on the change themselves
across up to five returns — each verdict scored out of ten on the code and on the work — and a
decision on that record: accept with residue, two more returns, a different reviewer, a split, or
the named blocker, once the loop stops converging.

One structural difference from `paseo-cto`: host-native subagents share a single working copy, so
file ownership is a promise rather than a boundary. Reading runs in parallel; writing runs one at a
time.

Invoke as `$team:team` in Codex or `/team:team` in Claude. It is not a smaller configuration of
`paseo-cto` — the two are read independently.
