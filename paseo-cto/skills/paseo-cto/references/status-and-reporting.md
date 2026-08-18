# Status and reporting

Read this file before emitting any status, and on every reconcile while operating. It defines one
deterministic snapshot so Claude and Codex report the same project state. It is also the single
owner of the reporting register: `SKILL.md` states the principles and defers here for the rules and
examples.

This file governs the **fleet snapshot**, the runtime render of who is working right now. The
committed `STATUS.md` that `work.py status` generates is a different artifact, defined by
[Work tree](work-tree.md). The index shows where the project is; the snapshot shows what the fleet
is doing this minute.

## One snapshot, two sinks, two cadences

Compute the snapshot once per reconcile and use those exact values for both sinks.

1. **Durable file** — run `render_fleet.py` unconditionally on every reconcile and material event. It
   obtains the current Paseo inventory, verifies runtime and Git, derives the table from the work
   tree, validates a temporary file, and atomically replaces
   `<git-common-dir>/paseo-cto/FLEET.md`. Never edit this file or compose a row from a worker report.
2. **Chat** — post the header and complete fleet table when a material event occurred since the last
   posted snapshot, and immediately for any explicit status request. Otherwise post one quiet line:
   `Fleet steady · <agents-running> running · head <short-sha>` — nothing else.

For a status or other read-only request, run the same renderer with `--stdout`. It validates the live
state and table without replacing the durable file. If validation fails, report the mismatch and do
not publish a table presented as current.

A material event is a landing decision, a review verdict, a new blocker, a critical-path change, or
an owner gate. An unchanged table restates what the durable file already holds.

Coalesce every lifecycle change discovered in one turn into one report, after the reconciliation is
complete. A turn adds at most one compact prose delta. If several heartbeats were missed while one
long operation held the session, publish only the newest snapshot at the next idle boundary. State
the absolute `FLEET.md` path once when Operate begins.

## Language and register

Owner-facing prose uses the exact project-local `charter.reportingLanguage`. That setting overrides
the plugin's English bootstrap default for every prose message, status explanation, escalation,
review, research report, and durable narrative.

This register governs Paseo-generated operational artifacts and reports. It does not suppress brief
progress notices required by the host while tools run; those notices are not fleet status, are not
copied into `FLEET.md` or runtime, and do not create additional reporting cadence.

On the first Operate with a non-English `reportingLanguage`, load the host's language-norm glossary
or skill for the configured language before the first owner-facing message.

Prose is formal, neutral, impersonal, evidence-led, concise, and self-contained. It carries no first
or second person, social language, emotion, praise, blame, unsupported hedging, process narrative,
fragments, or commentary on an author or agent. Put the result first.

The report speaks about the system, never about who performed the work. Not "I found a defect" but
"the check found a defect". This holds for withdrawing a claim too: state that the claim is wrong
and what was measured instead, with no apology.

Write complete sentences. A technical term serves a sentence; it never replaces one. Brevity comes
from tight sentences, not from dropped grammar, so no stacked bare nouns, no semicolon lists
standing in for clauses, and no arrow chains. Test before sending: would a reader seeing this system
for the first time understand it on one pass?

Use this sentence order whenever the clauses exist: observed fact and evidence; effect on the
contracted outcome; required disposition; remaining unknown. Omit a clause that carries no decision.

The fixed snapshot labels and machine tokens are a stable interface and are never translated:
`Update`, `paseo-cto`, `Model`, `Context`, `Session`, `Wave`, `Cards`, the table headers, plan IDs,
agent titles, derived-status tokens, commands, and paths.

## Scheduled snapshot — exact shape

Generate `FLEET.md` and post the chat snapshot in exactly this shape:

```markdown
# Update <YYYY-MM-DD HH:MM TZ>
paseo-cto: v<base-version> | Model: <provider>/<model> (<reasoning-effort>) | Context: <amount>(<percent>%) | Session: <elapsed>
Wave: [<wave-id>] <wave name>
Cards: <done>/<total>

| Agent | Task | Status | Time | LOC |
| --- | --- | --- | --- | --- |
| `cto-<family>` | `—` Integrate storage API | `reviewing` | 8m | — |
| `W5-4-<family>-builder` | `W5-4` Complete recovery path | `running` | 18m | +24 -3 |
```

Use single spaces exactly as shown. `# Update ...` is the only Markdown heading, and the fleet table
follows `Cards` after one blank line with no `Active fleet` heading. The `paseo-cto` line is separate
from that heading. Its version is the base version of the immutable marketplace tag this session
loaded; never show the Codex cachebuster suffix. `Model` is the exact `provider/model` assignment
for the CTO role with its configured reasoning effort in parentheses. `Context` is the exact amount
and percentage the host reports, for example `201k(15%)`; omit the whole `| Context: ...` segment
when no trustworthy measurement exists. `Session` is elapsed wall-clock time since this CTO session
started, rendered as `24m`, `1h`, or `1h24m`. A handover or new host conversation starts a new
session clock; compaction inside the same session does not.

Derive every identity value from plugin-version preflight, `charter.roleAssignments`, and verified
runtime state. If the version, model, effort, or session time is unavailable, or the version
disagrees with the selected immutable release, stop instead of inventing it. Context is the only
optional value. Generate and validate the file in one command:

```sh
python3 <tools>/render_fleet.py <checkpoint> --project-root <integration-root> \
  --timezone <local-timezone-token> [--context <amount(percent%)>]
```

Add `--stdout` when the current request is read-only.

The renderer invokes `check-fleet-render.sh` before replacement; a failed live probe or check leaves
the prior `FLEET.md` unchanged.

Do not add the run ID, CTO ID, path, strategy, readiness, constraint, fleet counts, project rollup,
blockers, tails, or next action to this mechanical render. Those belong in the plan, runtime state,
or a material prose delta. Do not put any content after the final fleet row in `FLEET.md`.

The timestamp uses the machine's local time and a short unambiguous timezone token. Every value is
derived from current evidence; none is estimated.

## Current wave and card counts

The runtime checkpoint stores the current wave ID and name. Resolve both during every reconcile:

- The current wave is the wave containing the head of the critical path.
- When the last card in that wave is accepted, retain the completed wave through its final `N/N`
  snapshot, then advance to the wave holding the next critical-path head.
- `total` is the number of card files in that wave's directory.
- `done` is how many of them are in state `accepted`.
- A discovered card increases `total` as soon as its file exists. A duplicate ID or a tree that does
  not validate fails the status gate; never repair the display by inventing a count.
- When no current wave exists, render `Wave: [—] —` and `Cards: 0/0`.

The displayed count must always satisfy `0 <= done <= total`. The reference checker in
[`templates/check-fleet-render.sh`](../templates/check-fleet-render.sh) validates every field and,
with `WORK_ROOT` supplied, recalculates the counts and the wave name from the work tree. With
`RUNTIME_FILE` and `PROJECT_ROOT`, it also requires exact agent coverage, task identity, derived
status, state time, and workspace line delta. A project
still reading a frozen execution document supplies `PLAN_FILE` and `ACCEPTANCE_FILE` instead; the
two modes are mutually exclusive.

## Fleet table — fixed columns and mechanical fields

Use exactly `Agent | Task | Status | Time | LOC`. The table contains every owned non-archived agent,
even one belonging to a different wave or a preserved tail. Put the CTO first, then current-wave
agents, then every other agent in stable agent-title order. The CTO row shows its current bounded
integration or review action and is never omitted.

- **Agent** — `<plan-id>-<family>-<role>`, where `<family>` is the provider-family slug recorded for
  that role in `charter.roleAssignments`. The CTO row is `cto-<family>`.
- **Task** — the plan node's outcome title, prefixed with its stable ID in backticks
  (`` `W5-4` ``). Use `` `—` `` for the CTO's own bounded action. Never invent a title that cannot
  be traced to the plan.
- **Status** — exactly one derived Fleet operations token: `running`, `waiting`, `blocked`, `idle`,
  `reviewing`, `rework`, `stalled`, `error`, or `done`. Never a native provider status.
- **Time** — time in the current derived state, not total task age. After recovery without a
  reliable `stateSince`, use the closest defensible timestamp and prefix `~`.
- **LOC** — textual line delta against the recorded baseline from
  `git diff --numstat <baseline> --`. Abbreviate each side independently: below 1000 use the exact
  integer; at 1000 or more use one-decimal thousands with a `k` suffix, rounding half up
  (`+2.4k -36`). Use `—` for report-only agents or when no code delta applies. Record binary and
  untracked changes as runtime tails, not as line counts.

## Material prose delta

Prose is added only when a landing decision, risk, blocker, critical-path change, or owner gate
materially changed. It follows the snapshot, has no mandated heading, and normally runs one or two
short paragraphs under 900 characters.

The prose states only what limits progress, what changed or was decided, why it matters to the
product or critical path, and what happens next. Never repeat what has not changed, retell an
investigation, list intermediate attempts, or include commands, internal function names, exact query
forms, working-tree cleanliness, or test-harness detail. Mention an adjacent defect only as a
separate card, and only when it affects the critical path, a risk, or an owner decision.

The reader knows the product architecture but has not opened the card, the review report, the
source, or the previous message. If the delta requires any of those, rewrite it.

### Register examples

The examples use the English bootstrap default. Their structure and register are normative, not
their language.

Rejected — personal, emotional, process-focused, and hedged:

```text
I reviewed the excellent recovery fix and think it will probably work. You should rerun the suite.
```

Accepted:

```text
The recovery path now rejects an incomplete restore. Release authorization remains pending until
the production recovery measurement passes.
```

| Rejected | Accepted |
| --- | --- |
| "The review returned the card, and the false-green hypothesis survived." | "The recovery drill does not prove the procedure because several checks report success independently of system state. The procedure and drill require correction." |
| "The deduplication key is pinned three ways, and three of four mutations are caught." | "Adding a field can no longer remove the value that distinguishes two deliveries. The check's remaining limitation has a separate card." |
| "Thirteen commits, a clean tree, green checks, and a deleted test environment." | "The contracted behaviour is implemented and the required checks pass on the reviewed revision. Authorization is pending." |

[`templates/check-owner-status.sh`](../templates/check-owner-status.sh) mechanically checks the
prose delta for length, paragraph count, personal language, and banned framing. Invoke it with
`REPORTING_LANGUAGE` set to the exact charter value. It judges form only; semantic truth remains the
CTO gate.

## Evidence links

Every commit or repository file named in owner-facing documentation, a review report, a decision
record, or the work tree is a Markdown link to its canonical source. Apply
[Source references](source-references.md); a bare SHA or local path is not durable evidence.
