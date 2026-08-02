# Status and reporting

Read this file before emitting any status, and on every reconcile while operating. It defines one
durable status render that is the single source of truth for "where are we", so a Claude CTO and a
Codex CTO produce byte-comparable output and no report is ever silently skipped.

## One render, two sinks

Compute the status values once per reconcile, then write them to both sinks from the same values in
the same turn, so they can never disagree:

1. **Durable file** — always rewrite `<git-common-dir>/paseo-cto/STATUS.md` (resolve the common
   directory; the same location as the runtime checkpoint). This write is unconditional and
   deterministic: it happens on every reconcile and material event regardless of whether you also post
   to chat. It is the owner's always-current answer to "where are we", openable at any moment.
2. **Chat** — treat operational messages as a delta stream. On a heartbeat reconcile or material
   event, post only evidence, decisions, blockers, readiness changes, or next actions that changed
   since the last chat message. Never repeat unchanged meaning in different words. If nothing
   material changed, post nothing; the durable file remains current. On an explicit full-status
   request, post **verbatim** the header block and fleet table, CTO row first. A bare founder
   "where are we" question follows Founder status below and omits the fleet table.

State the absolute `STATUS.md` path once when Operate begins and in an explicit full-status reply, so
the owner knows where to look. Do not repeat it in ordinary delta updates.

## Language and register

Prose is written in `charter.reportingLanguage` and follows the formal, neutral, impersonal register
rules in the CTO skill without exception: no first or second person, social language, emotion,
praise, blame, unsupported hedging, process narrative, fragments, or stacked nouns. Put the result
first and use silence in place of repetition. A status render is the place where those rules are
easiest to break — a table tempts telegraphic phrasing, and the `Constraint` and `Next` lines tempt a
narrated account of what was done. Write them as sentences about the project, not about the work
performed on it.

## Owner-facing status — the mandatory policy

The durable render is the full state. The message sent to the owner is a different artifact with a
different job, and this policy governs it wherever it is produced — heartbeat reconcile, landing
decision, escalation, or a direct question.

> **Write owner-facing CTO status updates in the configured reporting language as brief, formal,
> neutral, impersonal, self-contained prose. Do not use first or second person, social language,
> emotion, praise, blame, surprise, drama, unsupported hedging, literary framing, or commentary on
> how important, impressive, costly,
> interesting, or consequential a finding feels. Explain only what currently limits progress, what
> materially changed or was decided, why it matters to the product or critical path, and what
> happens next.**

There are no mandatory headings and no keywords. A status reads as a few short natural paragraphs.

### Constraints

- **Keep it as short as the material change allows, never more than 900 characters by default. One
  or two short paragraphs are preferred; use up to four only when needed.** There is no target
  length and no minimum: two sentences that answer the four questions below are a complete status,
  not a draft. Exceeding 900 is allowed only for an owner decision or a critical risk that cannot be
  stated correctly in less.
- Never repeat what has not changed since the previous status.
- Never retell the course of an investigation.
- Do not list intermediate attempts, commits, or counts of steps, files, rounds or findings unless
  the number changes a decision.
- No file/line, commands, internal function names, exact query forms, or test-harness detail.
- No corrected intermediate mistakes, taken identifiers, working-tree cleanliness or other internal
  events once they block nothing.
- No internal jargon or metaphor — a card does not "land", a hypothesis does not "survive", a review
  does not "earn its round", a return is not "the most substantial", an item is not "the heaviest",
  a card does not "go off" anywhere.
- No first or second person, singular or plural.
- No greeting, thanks, apology, request for patience, praise, blame, or conversational aside.
- No `seems`, `probably`, `apparently`, `hopefully`, or `likely` unless a measured probability is
  supplied; state the bounded unknown instead.
- No evaluation of an author, a reviewer, an agent, the work, or the quality of a finding.
- Translate technical detail into its general consequence.
- Mention an adjacent defect only as a separate card, and only when it affects the critical path, a
  risk, or an owner decision.

The reader knows the product's architecture and has not read the current card, the review report,
the code, or the previous message.

### The check before sending

```text
Can the owner understand from this status alone:
- what currently blocks or limits progress;
- what materially changed;
- why it matters;
- what happens next?
```

If understanding it requires opening the card, the code, an agent's log, or an earlier message,
rewrite it.

### Two artifacts, not one

1. **Review report** keeps the complete technical findings — commands, exact evidence, file/line,
   identifiers, reproduction detail. Nothing here shortens it.
2. **Owner-facing CTO status** carries the understandable technical substance, its effect, and the
   next action.

Detail belongs in the first. A status that borrows from it has been written for the wrong reader.

### Golden examples

The examples use the English bootstrap default. Their sentence structure and register, not their
language, are normative; a configured local language takes precedence.

Rejected — internal detail, drama, opaque jargon, and facts that change no decision:

```text
Seventeen steps were recorded and the three heaviest items were closed. The false-green hypothesis
survived, the first commit used occupied identifiers, and the reviewer was retained for a
fast-forward to the corrected head.
```

Accepted:

```text
The operator procedure and recovery drill are being corrected because the previous checks could
report success without establishing recovery. The checks that admitted false success now use
reproducible measurements.

Two independent product defects have separate outcomes. Billing records can outlive a deleted file,
which affects the first partner's contractual requirement. A separate lifecycle defect can stop
processing without a visible failure.

The procedure and drill complete first so they record current behaviour. The independent defects
then proceed against the preserved checks.
```

Three more pairs, each rewritten to the consequence rather than the route:

| Rejected | Accepted |
| --- | --- |
| "The review returned the card, and this is the most substantial return in the run. The false-green hypothesis survived." | "The recovery drill does not prove the procedure because several checks report success independently of system state. The procedure and drill require correction." |
| "The deduplication key is pinned three ways, and three of four mutations are caught; `uniqueFieldsOf` only scans the top level." | "Adding a field can no longer remove the value that distinguishes two deliveries. The check's remaining limitation has a separate outcome." |
| "Thirteen commits, a clean tree, an unpushed branch, green checks, and a deleted test environment." | "The contracted behaviour is implemented and the required checks pass on the reviewed revision. Authorization is pending." |

A mechanical check for the parts a script can judge is in
[`templates/check-owner-status.sh`](../templates/check-owner-status.sh) — length, paragraph count,
first and second person, banned framing, mandated headings, and a trailing "separately" paragraph
carrying stale internal history. Invoke it with `REPORTING_LANGUAGE` set to the exact charter value;
the supplied English default applies only before local settings exist. It judges form only; the four
questions above and semantic agreement with the configured language are the real gate.

Machine tokens are never translated and never rephrased: table headers, plan IDs, derived-status
tokens, agent titles, commands, and paths appear exactly as specified below whatever the reporting
language is.

## Durable render

Rewrite `STATUS.md` to exactly this shape. Every field is filled from evidence, never estimated:

```markdown
# <project> — Paseo CTO status
Updated <YYYY-MM-DD HH:MM TZ> · run <run> · CTO <cto-id> · STATUS <absolute-path>
Strategy <alpha|beta|stable> · Readiness <N>% toward <named target> · Remaining <N>% · <count> waves
Constraint: <one sentence, or "none">
Fleet — Active <N> · Review <N> · Stalled <N> · Archived-since <N> · Tails <N>

## Where the project is
| Epic / wave | Status | Ready |
| --- | --- | --- |
| <plan-aligned name> | <planned|running|blocked|done> | <N>% |

## Active fleet
| Agent | Task | Status | Time | LOC |
| --- | --- | --- | --- | --- |
| `cto-<family>` | `—` Integrate storage API | `reviewing` | 8m | — |
| `A-14-<family>-builder` | `A-14` Complete storage API path | `running` | 18m | +2.4k -36 |
| `A-15-<family>-researcher` | `A-15` Verify startup dependency chain | `blocked` | 12m | — |

## Blocked and tails
| Node | Blocker | Pull trigger |
| --- | --- | --- |
| `A-15` | Awaiting owner decision on retry policy | Owner answers, then re-dispatch |

## Next
<one or two sentences: nearest shippable outcome, next accepted/integrated result, and what — if
anything — the owner must decide>
```

Omit the `Blocked and tails` table only when both are empty. Keep three to seven rollup rows but
compute readiness over every in-scope top-level outcome; if scope or acceptance is incomplete, report
readiness and remaining as `unavailable` rather than approximating. The named target matters: `100%`
toward `alpha` exit is not stable-release readiness.

## Fleet table — fixed columns and mechanical fields

Use exactly `Agent | Task | Status | Time | LOC`, CTO first. The render is mechanical so providers
cannot diverge:

- **Agent** — `<plan-id>-<family>-<role>`, where `<family>` is the provider-family slug the charter's
  `roleAssignments` records for that role. The CTO row is `cto-<family>`.
- **Task** — the plan node's own outcome title, prefixed with its stable plan ID in backticks
  (`` `A-14.2` ``); use `` `—` `` for the CTO's own bounded change. Never invent an ad-hoc phrasing;
  the ID lets the owner trace every row up to its epic in the rollup, so no task looks random.
- **Status** — the derived token from Fleet operations (`running`, `waiting`, `blocked`, `idle`,
  `reviewing`, `rework`, `stalled`, `error`, `done`). Never a native provider status.
- **Time** — time in the current derived state, not total task age. After recovery without a reliable
  `stateSince`, use the closest timestamp and prefix `~`.
- **LOC** — the textual line delta against the recorded baseline, taken from
  `git diff --numstat <baseline> --` totals. Abbreviate each side independently: below 1000, the
  exact integer; 1000 or more, one-decimal thousands with a `k` suffix, rounding half up
  (`+2.4k -36`). It is a live snapshot while running and exact after the returned commit. Use `—`
  for report-only agents and whenever no code delta applies. Report binary or untracked changes as a
  tail, never in the count.

## Header counts — exact, from the reconcile

Each count is an exact integer taken from the current reconcile, not a guess. The CTO is excluded from
every count.

- **Active** — external agents doing or legitimately awaiting work (`running`, `waiting`, `blocked`,
  `idle`).
- **Review** — returned results under review (`reviewing`, `rework`).
- **Stalled** — evidence-confirmed stalls (`stalled`).
- **Archived-since** — cleanups completed since the previous report.
- **Tails** — preserved states still needing an action, including durable owner-gated tails.

## Founder status

When the owner asks only where the project stands, answer briefly from the accepted plan: the header
block and the `Where the project is` rollup, without the fleet table or technical detail. Count
accepted outcomes, not activity or elapsed time. Use project weights when defined, otherwise equal
weights across the complete set. Explain any readiness change caused by a changed denominator.
Strategy may be reported to the founder but is never sent to workers.

Keep it to a few sentences. The founder is asking what is true about the product, not what the fleet
has been doing: name what now works that did not, what is next, and what — if anything — awaits an
owner decision. Internal identifiers, agent names, and mechanism belong in the fleet render, not
here.
