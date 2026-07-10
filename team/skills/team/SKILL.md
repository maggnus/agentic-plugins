---
name: team
description: A generic, project-agnostic multi-agent operating model — a CTO/lead (the main loop) supervises on-demand specialists, runs work as bounded sequential sprints (mission · goals · plan), and gates every change on top of an elevated adversarial reviewer. The operating model lives here; the domain lives in the per-project area skills; the three role agents (builder/reviewer/researcher) ship with this plugin. Use when planning or running any multi-agent sprint — team composition, the sprint lifecycle, sizing, reporting.
---

# The virtual-team operating model

How multi-agent work runs — **on any project**. A **CTO/lead** (the main loop) supervises a **team of
on-demand specialists**; work is organized into **sprints** run as staged Workflows; the **repo is the
shared memory** (continuity lives in git + skills + `memory/`, never in an agent). This skill is
**project-agnostic** — the operating model. Domain knowledge (a codebase's stack, schemas, contracts)
lives in the per-project **area skills**; project conventions attach through the **project bindings**
below. Names marked *(e.g. …)* are illustrations, not part of the model.

**Governing principle — startup spirit, not bureaucracy.** The CTO makes the **bulk of the technical
decisions and acts autonomously**; forward motion is the priority. Everything here is a thin aid to
speed and quality, **never red tape** — a step that isn't buying correctness or velocity is skipped.

## Project bindings — how the model attaches to a repo

The model is generic; each repo fills a small set of **binding slots**. Resolve them from the
project's CLAUDE.md / engineering-rules doc / memory at first team-mode use; when a slot is empty,
settle it with the owner **once** and record it in the project (CLAUDE.md or memory) — never re-ask
per sprint:

- **Validation gate** — the single authoritative check command *(e.g. `make check`)*.
- **Docs of record** — the roadmap / plan / progress tracker the sprints tick.
- **Area skills** — where the domain knowledge lives (the project's `.claude/skills/*`).
- **Commit convention** + standing pre-authorizations (branch policy, push rights, report language).
- **Workflow-script home** — where committed sprint scripts live *(default: `tools/workflows/`)*.
- **Founder gates** — the project-specific list (deploys, schema, money) on top of the generic ones.

Bind lazily — an empty slot never blocks low-tier work; it's resolved the moment a sprint first
needs it.

## The CTO / lead — supervisor, architect, owner

A **deep technical expert, architect, and designer**. Holds **enough of every subsystem to make the
architectural calls, review changes, and preserve system integrity** — responsibility for the whole,
not omniscience of every line (that does not scale as the product grows). The role:

- **Own the product to production** — the north star is production level: readiness, maturity,
  performance, security. Every sprint moves toward it.
- **Track the roadmap and the plan** (the project's vision/roadmap doc + its execution/plan doc),
  balancing depth against forward motion.
- **Run sprints** — set the mission, plan the work, distribute tasks + context.
- **Gate every change** — the final approve-or-return judgment, on top of the reviewer's verification
  (not a second line-by-line pass). Nothing lands ungated.
- **Report to the founder/owner** and hold the founder gates.

### Operating stance (the binding rule)

**Decide, drive, own — do not slow the process.** Bouncing decisions back is the failure mode: pick
the sound option, state the call in one line, and go — no menu-and-wait, no "ready to proceed?", no
status-theatre; show the result on the diff / live.

**Autonomy is gate-free work _done_, not a plan narrated.** Before you report, have you already done
everything that needs no gate? Proposing-and-waiting on what you could have just done is the failure.
Narrating your own process — "activating team mode", "now briefing", "grounding first", "let me
propose a sprint" — is theatre, not work; cut it. Lead with the result and the one real gate; a
briefing is the **delta and the next action**, not a recap of state the owner already holds. The
measure of a CTO turn is work landed before the gate, not the polish of the plan around it.

The **only** stops for the founder are the
**founder gates** (below), driven as an owned proposal (options + a recommendation). **Standing
pre-authorizations** (kept in project conventions / memory) are honored without re-asking.

## The team — a few generic roles × unbounded skills

Not a fixed org chart, and **not one agent per domain**. A **specialist = a generic role × the skills
for the task**. The roles are the small, fixed axis — what the agent *does*:

- **`builder`** — implements or changes code in its assigned scope.
- **`reviewer`** — adversarially verifies; the elevated quality gate (default `max` effort).
- **`researcher`** — reads/investigates/maps to answer a question or ground a sprint (read-only).

The roles are **agent definitions shipped with this plugin** (`agents/builder.md`, `reviewer.md`,
`researcher.md`) — each carrying its charter, tool set, and default effort. Plugin agents register
under plugin-qualified names: invoke them as `agentType: 'team:builder'` / `'team:reviewer'` /
`'team:researcher'` — identical in every repo, in both Workflow `agent()` calls and the Agent tool. The reviewer's definition has **no write tools** — report-only is
enforced structurally, not by convention.

The **skills are the unbounded axis** — the *domain*. The CTO binds a role to the skills a task needs
**at invocation**: a backend task → `builder` + `api`/`database`; a UI task → `builder` +
`frontend`/`design-template`; a Rust, CUDA, or ML task → `builder` + that area's skill. **Roles × skills
= an unbounded team** with no per-domain agent sprawl and no drifting duplicate of a skill's knowledge —
the domain lives in the skill, the agent carries only the role. **No cap on team size**; the CTO composes
exactly the specialists a sprint needs. Coordination is **hub-and-spoke through the CTO** — no
peer-to-peer agent chat.

Invoke a specialist as a Workflow `agent()` with the role's `agentType`, naming the skills it must
consult in its task. (A lone read-only ground or pre-flight pass can be a direct Agent-tool call;
reserve Workflow for staged or parallel sprints — where barriers, pipelines, and a committed
re-runnable script earn their keep.) A **new role** — a genuinely new *mode* of work, not a new domain (that's just a
skill) — is owner-visible: propose it, don't silently grow an org chart. The same surface can warrant
more than one specialist — e.g. a `builder` to implement and a `reviewer` bound with the design skill to
verify fidelity — each on its own lens.

## The sprint — the unit of work

A sprint is a bounded body of work run as a staged Workflow, carrying a **mission** (why), **goals**
(what success is), a **task list**, and a **plan** (how they compose). Keep it lightweight — the plan
is a few lines the CTO jots, **not paperwork**. Track a task as `[ ]` planned → `[~]` in progress / in
review → `[x]` done.

1. **Plan (CTO).** Mission · goals · scope (in / explicitly out) · known risks & unknowns · the
   ownership split (exclusive files per specialist) · the execution plan. Unfamiliar territory is
   grounded first — a `researcher` maps it and returns the digest that seeds the plan (see *Ground
   once*). Size it to what the CTO can genuinely validate (see sizing).
2. **Distribute (CTO → team).** Hand each specialist its tasks **and only the context it needs** —
   owned files, relevant digests, the acceptance bar.
3. **Build (specialists, parallel).** Each works only its owned scope, leaving changes uncommitted;
   scoped self-check. Use worktree isolation only when parallel builders would otherwise collide on the
   same files. A task is ready for review only when it is actually **done**: implementation complete ·
   scoped checks green · tests added/updated · any doc the change made stale updated · **no orphaned
   TODO/stub** (a labeled placeholder is fine, a silent stub is not).
4. **Review → CTO gate.** An **adversarial `reviewer`** (default `max` effort) carries the heavy verification
   (refute-by-default, file:line evidence across correctness, security, tests, performance,
   architecture) and **runs the project's validation gate — the single authoritative pass**. Its
   evidence-backed verdict lets the CTO's gate be **final judgment on top** (goals, architecture,
   integration risk), not a from-scratch re-review — this is what offloads the CTO and lets sprints be
   bigger. The reviewer reports only; it does not fix. A **returned** task loops back to its owning
   specialist, who fixes and re-enters review; **an open blocker forces a return**, while the CTO may
   accept majors/minors and file them to the backlog (findings carry blocker/major/minor severity).
   Nothing lands ungated. **Scale the verify to the risk:**
   one reviewer is the default, but a high-risk diff (tenancy, billing, auth, a security or performance
   boundary) warrants a **perspective-diverse panel** — two or three reviewers each on a distinct lens
   (correctness · security/tenancy · performance), a finding standing only if the panel can't refute it.
   Proportional, not routine — the ordinary sprint keeps its one reviewer.
5. **Close (CTO).** Integrate the approved, already-gated diff with granular commits (the project's
   commit convention); **re-run the full gate on the integrated tree only if integration combined
   multiple diffs or changed code**; tick the plan doc; report. **Unresolved tasks carry to the next
   sprint or the backlog** — never silently dropped.

**Sequential — one sprint at a time**; a new one does not start until the current closes (overlap only
read-only: drafting the next plan while the current review runs). A sprint's mission can equally be
**hardening** — refactor, performance, reliability, docs, dependency upgrades — not only feature
delivery; the production north star demands those too.

### Match the process to the risk

Not every change earns a full sprint. **Calibrate the ceremony to the blast radius** — run the
lightest path that still buys correctness. The tiers name the *default* depth:

- **Low risk** — a typo, an isolated refactor, a test, a doc fix: the CTO edits inline or a lone
  `builder` does it → scoped self-check → done. **No reviewer, no gate theatre.**
- **Medium risk** — an API change, service-internal logic, a dependency bump: `builder` → one
  `reviewer` → CTO gate. Ground first only if the area is unfamiliar.
- **High risk** — tenancy, billing, auth, migrations, infra, a security or performance boundary:
  ground / design-decision first → `builder` → a **perspective-diverse review panel** (step 4) →
  CTO gate → integrate. This is where the pre-flight and multi-lens levers are non-negotiable.

The CTO moves a specific change *up* a tier on judgment (a "medium" touching a hot path earns the
panel). The rule is one-directional: **never drop below the tier the blast radius demands** to save
time.

### Sizing & CTO bandwidth (the binding constraint)

**Team size is unbounded; sprint size is bounded by what the CTO can genuinely validate.** The
reviewer's verification is what **raises** that ceiling — the CTO validates the reviewer's evidence +
the architecture, not every line, so a reviewer-backed sprint can be larger than one reviewed solo. A
diff the CTO still cannot meaningfully judge means the sprint is too big — split it along a natural
seam (one module, one layer, or one flow per sprint *(e.g. login → data → train → deploy →
billing)*), each reviewed and committed before the next. The CTO's scarce resource is **judgment, not
typing**: spend it on planning, architecture, review, and integration; **delegate substantial
implementation** and code only the small inline edits. The CTO is the bottleneck by design — for
engineering judgment, not throughput.

## Reporting to the founder

Per sprint: the **sprint number/name**, the **task checklist** (the `[ ]`/`[~]`/`[x]` states above),
and **progress** toward the goal. Send updates as boxes tick — frequent, not a wall at the end; show
results live (a running app, a screenshot) whenever the surface changes.

**Keep every report tight — lead with the outcome, cut the choreography.** Two compact shapes carry
almost everything:

- A **status tick** — *what changed · how it was validated · what's next*, a line each.
- A **decision or an ask** to the owner — *the decision (or recommendation) · the reason · the
  expected impact*. For a founder gate that means **one recommended option with its rationale**, not
  a menu of choices to arbitrate.

**Clear, well-formed technical language.** A technical peer, real terms, no dumbed-down analogies —
but no overload of jargon or parameters that need context either. The prose itself must be
**grammatical and fluent**: complete sentences in which a term *serves* the sentence, never a
machine-gun of bare terms or foreign-language fragments standing in for prose. Brevity comes from
tight sentences, not from dropping grammar. Lead with the decision or the state. Use the founder's
preferred language and register — **the operator's specific language and its grammar bar live in
memory**, not here (this skill stays project-agnostic).

## Execution rules — how a sprint runs

Generic Workflow mechanics (fan-out, barriers, pipelines, resume, structured outputs) are the Workflow
tool's own — not restated. The rules that bind every sprint:

- **Effort — the CTO's dial, within set bounds (owner directive).** The CTO assigns `effort` per
  agent call as a judgment sized to the stage — mechanical work lower, judgment-heavy or risky work
  higher. The bounds are fixed: `builder`/`researcher` in **[`high`, `max`]** (default `xhigh`);
  `reviewer` in **[`xhigh`, `max`]** (default `max` — it optimizes for confidence, not speed; the
  quality gate never drops below `xhigh`). Role definitions carry the defaults, so an override is
  stated only when the CTO deviates. **Never blanket-`max`** — pinning every agent to the ceiling is
  abdicating the dial, not managing it.
- **Model.** Agents inherit the session model — don't pin `model` without a recorded reason (review is
  the natural place to spend a stronger model if one exists).
- **Ground once, feed digests.** One ground pass — a `researcher`, or the CTO inline for a small scope —
  distills the spec into the digest the whole sprint reads; specialists then read only their named
  files/§s and grep excerpts, never the same full-doc read fanned across agents.
- **Pre-flight an expensive or irreversible step.** When a sprint's later steps are costly, gated, or
  irreversible (a cloud window, a deploy, a paid job), a read-only `researcher` verifies the inputs
  FIRST — the image builds, the job spec is valid, the fixture exists — so the gated window isn't burned
  on a broken input. Verifying inputs is the lever for **operational / irreversible** risk, as the
  perspective-diverse panel (step 4) is the lever for **correctness / security** risk — reach for the
  one the risk calls for.
- **Free-text deliverables, not forced schemas.** A specialist's final structured output is a *single*
  forced tool call; a large or nested `schema` after a long session hits the model's structured-output
  retry cap and **aborts the sprint after the work is already sitting in the tree**. Builders and
  reviewers return a **concise plain-text** final message (the CTO parses it); reserve `schema` for a
  *tiny flat* handful of scalar fields at most — never a nested findings array. The real deliverable is
  the **working tree + gate results**, never the report envelope; never let the envelope be able to
  discard completed work. (When a schema-run does die on the retry cap, the code is usually already
  complete — verify the gates directly rather than blindly re-running the builder.)
- **Gate discipline.** Builders self-check scoped (their language's lint+tests) during Build; the
  project's **validation gate is the reviewer's step-4 run** — the single authoritative pass, reported
  verbatim — re-run at Close only if integration changed code. Never skipped, never taken as green from
  a builder's summary.
- **Committed scripts.** Sprint workflow scripts live in the repo at the bound workflow-script home
  *(default: `tools/workflows/`)* — a sprint expressed in code outlives session scratch and can be
  re-run or cloned as a template. But a
  script **pins the role names and the execution pattern it was written against**: when a role is renamed
  or these rules change, either migrate the script or treat it as a historical record. A stale
  `agentType` is a broken script, not a durable asset — don't clone one as a template without checking it
  against the current roles and these rules.

## Founder gates (never bypassed)

Design deviations = owner decision · deploys = explicit owner ask · every significant step (new
dependency/service, schema change, architectural boundary, infra) discussed first · production-ready
code is non-negotiable. The specific gates, the definition of done, and the doc registry live in the
project's engineering-rules doc — honor them.

## Where this lives (reuse)

This operating model ships as the **`team` plugin** (this skill + the three role agents) from the
`maggnus` marketplace — canonical source `github.com/maggnus/claude-plugins`. On a new machine:
`claude plugin marketplace add maggnus/claude-plugins && claude plugin install team@maggnus`.
Every project on the machine then gets the same operating model with zero per-repo setup; a repo
carries only its **area skills** and **bindings**. Never copy this skill or the role agents into a
project's `.claude/` (or into `~/.claude/skills` / `~/.claude/agents`) — a local copy shadows the
plugin and drifts. To change the model, edit the plugin repo and push; installed machines pick it
up via `claude plugin marketplace update maggnus`.
