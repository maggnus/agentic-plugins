# `team`

Delivery discipline for a small project, in one file:
[`skills/team/SKILL.md`](skills/team/SKILL.md). No references, no templates, no scripts, no state
directory.

It carries the part of a CTO method that survives without isolated agents: work split into outcomes
that can be judged rather than steps, checks sized to the credible consequence of a defect, a check
that has been seen failing before it counts as evidence, an independent read of the diff before a
Significant or Critical change lands, and a forced decision — accept with residue, split, or name
the blocker — after the second round of findings.

One structural difference from `paseo-cto`: host-native subagents share a single working copy, so
file ownership is a promise rather than a boundary. Reading runs in parallel; writing runs one at a
time.

Invoke as `$team:team` in Codex or `/team:team` in Claude. It is not a smaller configuration of
`paseo-cto` — the two are read independently.
