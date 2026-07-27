# Execution rules — how a sprint runs

Read this when composing the agent calls for a sprint. Generic Workflow mechanics (fan-out,
barriers, pipelines, resume, structured outputs) are the Workflow tool's own and are not restated
here. These are the rules that bind every sprint.

## Effort — the CTO's dial, within set bounds

The CTO assigns `effort` per agent call as a judgment sized to the stage — mechanical work lower,
judgment-heavy or risky work higher (owner directive). The bounds are fixed:

| Role | Bounds | Default |
| --- | --- | --- |
| `builder` | [`high`, `max`] | `xhigh` |
| `researcher` | [`high`, `max`] | `xhigh` |
| `reviewer` | [`xhigh`, `max`] | `max` — it optimizes for confidence, not speed |

The quality gate never drops below `xhigh`. Role definitions carry these defaults, so state an
override only when deviating; the **seniority tiers** (senior/lead/principal, in the skill) name the
floor/default/ceiling presets on this dial. **Never blanket-`max`** — pinning every agent to the
ceiling is abdicating the dial, not managing it.

## Model

Agents inherit the session model. Don't pin `model` without a recorded reason; review is the natural
place to spend a stronger model if one exists.

## Ground once, feed digests

One ground pass — a `researcher`, or the CTO inline for a small scope — distills the spec into the
digest the whole sprint reads. Specialists then read only their named files/sections and grep
excerpts, never the same full-doc read fanned across agents.

## Pre-flight an expensive or irreversible step

When a sprint's later steps are costly, gated, or irreversible (a cloud window, a deploy, a paid
job), a read-only `researcher` verifies the inputs FIRST — the image builds, the job spec is valid,
the fixture exists — so the gated window isn't burned on a broken input. Verifying inputs is the
lever for **operational / irreversible** risk, as the perspective-diverse panel is the lever for
**correctness / security** risk; reach for the one the risk calls for.

## Free-text deliverables, not forced schemas

A specialist's final structured output is a *single* forced tool call; a large or nested `schema`
after a long session hits the model's structured-output retry cap and **aborts the sprint after the
work is already sitting in the tree**. Builders and reviewers return a **concise plain-text** final
message (the CTO parses it); reserve `schema` for a *tiny flat* handful of scalar fields at most —
never a nested findings array. The real deliverable is the **working tree + gate results**, never
the report envelope; never let the envelope be able to discard completed work. When a schema run
does die on the retry cap, the code is usually already complete — verify the gates directly rather
than blindly re-running the builder.

## Gate discipline

Builders self-check scoped during Build: their language's lint and tests, plus the task's named
acceptance proof. Each stream's **authoritative pass is its reviewer's verify run**, reported
verbatim. The **box close runs the full validation gate once** on the integrated tree. Never skipped,
never taken as green from a builder's summary, and never run in a way that violates substrate
isolation (doctrine rule 2).

## Committed scripts

Sprint workflow scripts live at the bound workflow-script home *(default: `tools/workflows/`)*, and
operational-edge scripts (doctrine rule 3) at the bound script home *(default: `tools/`)* — a sprint
expressed in code outlives session scratch and can be re-run or cloned as a template. But a script
**pins the role names and the execution pattern it was written against**: when a role is renamed or
these rules change, either migrate the script or treat it as a historical record. A stale
`agentType` is a broken script, not a durable asset — don't clone one as a template without checking
it against the current roles and these rules.
