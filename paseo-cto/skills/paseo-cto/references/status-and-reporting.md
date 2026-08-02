# Status and reporting

Read this file before emitting any status, and on every reconcile while operating. It defines one
deterministic snapshot so Claude and Codex report the same project state.

## One snapshot, two sinks

Compute the snapshot once per reconcile and use those exact values for both sinks:

1. **Durable file** — rewrite `<git-common-dir>/paseo-cto/STATUS.md` on every reconcile and material
   event. Resolve the Git common directory; never write the file to an assumed checkout root.
2. **Chat** — post the exact current-wave header and complete fleet table on every scheduled
   15-minute heartbeat, even when nothing changed. Post the same snapshot immediately for every
   explicit status request, including a bare "where are we" request. A material event between
   scheduled snapshots may add a brief prose delta after the snapshot.

The scheduled snapshot is the sole exception to the rule against repeating unchanged information.
Never repeat unchanged prose. State the absolute `STATUS.md` path once when Operate begins; do not
put it in the snapshot or repeat it in ordinary updates.

## Language and register

Owner-facing prose uses the exact project-local `charter.reportingLanguage`. That setting overrides
the plugin's English bootstrap default for every prose message, status explanation, escalation,
review, research report, and durable narrative. No language is privileged by the plugin after a
valid local setting exists.

Prose is formal, neutral, impersonal, evidence-led, concise, and self-contained. It contains no
first or second person, social language, emotion, praise, blame, unsupported hedging, process
narrative, fragments, or commentary on an author or agent. Put the result first.

The fixed snapshot labels and machine tokens below form a stable interface and are not translated:
`Update`, `paseo-cto`, `Model`, `Context`, `Session`, `Wave`, `Cards`, the table headers, plan IDs,
agent titles, derived-status tokens, commands, and paths. The exact form is independent of the
configured prose language.

## Scheduled snapshot — exact shape

Rewrite `STATUS.md` and post the scheduled chat snapshot in exactly this shape:

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

Use single spaces exactly as shown. `# Update ...` is the only Markdown heading; the fleet table
follows `Cards` directly after one blank line and has no `Active fleet` heading. The `paseo-cto` line
is separate from the Markdown heading. Its version is the base version of the immutable marketplace
tag loaded by this session; never show the Codex cachebuster suffix. `Model` is the exact
`provider/model` assignment for the CTO role followed by its configured reasoning effort in
parentheses. `Context` is the exact context amount and percentage reported by the current host, for
example `201k(15%)`; do not infer or reinterpret either value. Omit the complete
`| Context: ...` segment when the host exposes no trustworthy measurement. `Session` is elapsed
wall-clock time since this CTO session started, rendered as `24m`, `1h`, or `1h24m`. A handover or
new host conversation starts a new session clock; compaction inside the same session does not.

Derive every required identity value from plugin-version preflight, `charter.roleAssignments`, and
runtime state. If the version, model, effort, or session time is unavailable, or the version
disagrees with the selected immutable release, fail the status gate instead of inventing it. Context
is the only optional value. Invoke
[`templates/check-status-render.sh`](../templates/check-status-render.sh) with
`PASEO_CTO_VERSION=v<base-version>` to verify the displayed release.

Do not add the run ID, CTO ID, path, strategy, readiness, constraint, fleet counts, project rollup,
blockers, tails, or next action to this mechanical render. Those facts belong in the plan, runtime
state, or a material prose delta. Do not put any content after the final fleet row in `STATUS.md`.

The timestamp uses the machine's local time and a short unambiguous timezone token. Every value is
derived from current evidence; none is estimated.

## Current wave and card counts

The runtime checkpoint stores the current wave ID and name. Resolve both during every reconcile:

- The current wave is the wave containing the head of the critical path.
- When the last card in that wave is accepted, retain the completed wave through its final `N/N`
  snapshot. Advance only after that snapshot to the wave containing the next critical-path head.
- `done` is the count of unique acceptance-history card IDs whose `Wave` column equals the current
  wave ID.
- `total` is the number of unique card IDs in the union of those accepted rows and the current plan
  cards bound to the same wave. Accepted cards are absent from the current plan because acceptance
  is an atomic transfer.
- A discovered card increases `total` as soon as it is added to that wave. A duplicate ID, a current
  `[x]` card, or a disagreement between plan and acceptance truth fails the status gate; never repair
  the display by inventing a count.
- When no current wave exists, render `Wave: [—] —` and `Cards: 0/0`.

The displayed count must always satisfy `0 <= done <= total`. The reference checker in
[`templates/check-status-render.sh`](../templates/check-status-render.sh) validates the shape and,
when the plan and acceptance paths are supplied, recalculates the counts.

## Fleet table — fixed columns and mechanical fields

Use exactly `Agent | Task | Status | Time | LOC`. The table contains every owned non-archived agent,
even when it belongs to a different wave or a preserved tail. Put the CTO first, then current-wave
agents, then every other active or preserved agent in stable agent-title order. The CTO row means the
CTO's current bounded integration or review action; it is never omitted.

- **Agent** — `<plan-id>-<family>-<role>`, where `<family>` is the provider-family slug recorded for
  that role in `charter.roleAssignments`. The CTO row is `cto-<family>`.
- **Task** — the plan node's outcome title, prefixed with its stable ID in backticks
  (`` `W5-4` ``). Use `` `—` `` for the CTO's own bounded action. Do not invent a title that cannot
  be traced to the plan.
- **Status** — exactly one derived Fleet operations token: `running`, `waiting`, `blocked`, `idle`,
  `reviewing`, `rework`, `stalled`, `error`, or `done`. Never use a native provider status.
- **Time** — time in the current derived state, not total task age. After recovery without a
  reliable `stateSince`, use the closest defensible timestamp and prefix `~`.
- **LOC** — textual line delta against the recorded baseline from
  `git diff --numstat <baseline> --`. Abbreviate each side independently: below 1000 use the exact
  integer; at 1000 or more use one-decimal thousands with a `k` suffix, rounding half up
  (`+2.4k -36`). Use `—` for report-only agents or when no code delta applies. Record binary and
  untracked changes as runtime tails, not as line counts.

## Material prose delta

The snapshot is the state display. Prose is added only when a landing decision, risk, blocker,
critical-path change, or owner gate materially changed. It follows the snapshot, has no mandated
heading, and normally consists of one or two short paragraphs. Keep it under 900 characters unless
an owner decision or critical risk cannot be stated correctly in less.

The prose states only:

- what currently limits progress;
- what materially changed or was decided;
- why it matters to the product or critical path;
- what happens next.

Never repeat what has not changed, retell an investigation, list intermediate attempts, or include
commands, internal function names, exact query forms, working-tree cleanliness, or test-harness
detail. Translate technical evidence into its product consequence. Mention an adjacent defect only
as a separate card and only when it affects the critical path, a risk, or an owner decision.

The reader knows the product architecture but has not opened the card, review report, source, or
previous message. If the delta requires any of those to be understood, rewrite it.

### Register examples

The examples use the English bootstrap default. Their sentence structure and register, not their
language, are normative; the configured local language takes precedence.

Rejected — personal, emotional, process-focused, and hedged:

```text
I reviewed the excellent recovery fix and think it will probably work. You should rerun the suite.
```

Accepted:

```text
The recovery path now rejects an incomplete restore. Release authorization remains pending until
the production recovery measurement passes.
```

More consequence-focused rewrites:

| Rejected | Accepted |
| --- | --- |
| "The review returned the card, and the false-green hypothesis survived." | "The recovery drill does not prove the procedure because several checks report success independently of system state. The procedure and drill require correction." |
| "The deduplication key is pinned three ways, and three of four mutations are caught." | "Adding a field can no longer remove the value that distinguishes two deliveries. The check's remaining limitation has a separate card." |
| "Thirteen commits, a clean tree, green checks, and a deleted test environment." | "The contracted behaviour is implemented and the required checks pass on the reviewed revision. Authorization is pending." |

[`templates/check-owner-status.sh`](../templates/check-owner-status.sh) mechanically checks the
optional prose delta for length, paragraph count, personal language, and banned framing. Invoke it
with `REPORTING_LANGUAGE` set to the exact charter value. It does not check the structured snapshot;
use [`templates/check-status-render.sh`](../templates/check-status-render.sh) for that. Both checks
judge form only; semantic truth remains the CTO gate.

## Evidence links

Every commit or repository file named in owner-facing documentation, a review report, a decision
record, the plan, or acceptance history is a Markdown link to its canonical source. Apply
[Source references](source-references.md); a bare SHA or local path is not durable evidence.
