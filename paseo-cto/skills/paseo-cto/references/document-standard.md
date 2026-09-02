# Project document standard

Read this file when a project needs its durable documents created or when maintaining a frozen
execution history from before the work tree. Current work never lives here; it lives in the
permanent files defined by [Work tree](work-tree.md), and the plugin binds to no foreign tracker.

## The card body

Every field of the old plan document has a home in the tree, in the section order the schema
fixes: the identifier and `# <id> — <title>` heading; `## Outcome`; `risk` and `maturity` in the
front matter; `## Scope` with `In` and `Out`; `## Acceptance` as a checklist with its negative
half; the validation budget in the contract or `## Guardrails` when it is a standing limit;
`## Current state` at five lines, rewritten; `## Review rounds` with `review_rounds` and
`escalation_decision`; residue under `## Closure › Residuals` with `deliberate_partial: true` and
`return_trigger`. A card's aggregate contract lives in `CARD.md` — shared outcome, invariants every
child holds, shared boundary, closure conditions — and repeats no task detail.

## The frozen history

A project that operated before adopting the tree keeps its execution document and acceptance
history read-only: evidence of what was accepted, never reformatted or converted. The acceptance
history holds one row per accepted card — card, wave, risk, accepted outcome, a commit-pinned
closure link, durable evidence links, and `DD/MM HH:MM (<cost>)` with active working time or
`(n/a)`. [`templates/PLAN.md`](../templates/PLAN.md) and
[`templates/ACCEPTANCE.md`](../templates/ACCEPTANCE.md) describe that shape and
[`templates/check-plan-shape.sh`](../templates/check-plan-shape.sh) still validates it; none of the
three applies to the tree.

## The invariant registry (recommended)

[`templates/INVARIANTS.md`](../templates/INVARIANTS.md): a numbered list of contracts no change may
break without a decision record, each naming what must hold, where it is enforced and what breaking
it costs. `Critical` requires a credible threat to a named invariant, so the registry turns that
classification from a judgment call into a lookup.

## The shape is a gate

`work.py check` validates the tree against `work-schema.json` and its own stamp;
`check-source-links.sh` rejects bare commit and file evidence in selected durable documents;
`check_runtime.py` validates the checkpoint against Paseo, settings and Git; `render_fleet.py` and
`check-fleet-render.sh` generate and validate the fleet snapshot. Copy them into the project's
script home and bind them to the validation gate; the plugin path carries a version and differs
between hosts.
