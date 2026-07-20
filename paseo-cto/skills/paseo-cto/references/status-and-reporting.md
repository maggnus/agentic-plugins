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
2. **Chat** — on every heartbeat reconcile and material event, post to chat **verbatim** the header
   block and the fleet table, CTO row first — never a prose summary in their place. Prose may
   accompany the table but must not replace it. The sole exception is a bare founder "where are we"
   question, which follows Founder status below and omits the fleet table; a scheduled heartbeat
   reconcile never omits it. A skipped or collided chat post never means stale truth, because the
   file is already current; catch up on the next interval.

State the absolute `STATUS.md` path once when Operate begins and whenever you post a chat report, so
the owner knows where to look. Founder-facing prose stays in the owner's language; the table headers,
plan IDs, and derived-status tokens stay in English exactly as specified below.

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
| `cto-claude` | `—` Integrate storage API | `reviewing` | 8m | — |
| `A-14-gpt-builder` | `A-14` Complete storage API path | `running` | 18m | +2.4k -36 |
| `A-15-claude-researcher` | `A-15` Verify startup dependency chain | `blocked` | 12m | — |

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

- **Agent** — `<plan-id>-<family>-<role>`; the Claude Designer exception is
  `<plan-id>-claude-designer` because the role name fixes its provider family. The CTO row is
  `cto-gpt` or `cto-claude`. `family` is `gpt` or `claude`.
- **Task** — the plan node's own outcome title, prefixed with its stable plan ID in backticks
  (`` `A-14.2` ``); use `` `—` `` for the CTO's own bounded change. Never invent an ad-hoc phrasing;
  the ID lets the owner trace every row up to its epic in the rollup, so no task looks random.
- **Status** — the derived token from Fleet operations (`running`, `waiting`, `blocked`, `idle`,
  `reviewing`, `rework`, `stalled`, `error`, `done`). Never a native provider status.
- **Time** — time in the current derived state, not total task age. After recovery without a reliable
  `stateSince`, use the closest timestamp and prefix `~`.
- **LOC** — the textual line delta against the recorded baseline from `git diff --numstat <baseline> --`
  totals. Abbreviate each side independently: below 1000, the exact integer; 1000 or more, one-decimal
  thousands with a `k` suffix, rounding half up (`+2.4k -36`). It is a live snapshot while running and
  exact after the returned commit. Use `—` for Claude Designers, report-only agents, and when no code delta
  applies. Do
  not sum rows: lead and child diffs may overlap. Report binary/untracked changes as a tail, never in
  the count.

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

When the owner asks only where the project stands, answer briefly from the accepted plan in the
owner's language: the header block and the `Where the project is` rollup, without the fleet table or
technical detail. Count accepted outcomes, not activity or elapsed time. Use project weights when
defined, otherwise equal weights across the complete set. Explain any readiness change caused by a
changed denominator. Strategy may be reported to the founder but is never sent to workers.
