# Status and reporting

Read this file before the first status render and on every reconcile while operating. It defines
one deterministic snapshot so Claude and Codex report the same state, and it owns the two
registers — the record register and the chat register.

## One snapshot, two sinks

Compute the snapshot once per reconcile and use the same values for both sinks.

1. **Durable file** — `FLEET.md` beside the checkpoint at `<git-common-dir>/paseo-cto/FLEET.md`,
   written only by `render_fleet.py` (the ledger calls it on every event), which probes Paseo and
   Git, validates the checkpoint, checks a temporary render with `check-fleet-render.sh` and
   replaces the file atomically. A failed probe leaves the prior file unchanged. Never edit it or
   compose a row from a worker report. For a read-only request run the renderer with `--stdout`.
2. **Chat** — the header and complete table when a material event occurred since the last posted
   snapshot or the owner asks for status; otherwise one quiet line, every value read from the
   checkpoint and never recalled: `<dd/mm hh:mm> · Fleet steady · <running> running · head
   <short-sha>`, followed by one list item per live agent, `` `<title>` — <derived-status> ``.

Every owner-facing message carries its moment — the snapshot in its header, the quiet line and a
prose delta in their `dd/mm hh:mm` opening — read from the machine's clock at the reconcile that
produced it, never inherited. A material event is a landing decision, a verdict that ends the loop (acceptance, escalation, a
break), a new blocker, a critical-path change, or an owner gate. A return inside the loop is not
one; the table shows it as the node moving between `reviewing` and `rework`. Coalesce every change
discovered in one turn into one report after the reconcile; if several heartbeats were missed,
publish only the newest snapshot. State the absolute `FLEET.md` path once when Operate begins.

## The snapshot — exact shape

```markdown
# Update <YYYY-MM-DD HH:MM TZ>
paseo-cto: v<base-version> | Model: <provider>/<model> (<reasoning-effort>) | Context: <amount>(<percent>%) | Session: <elapsed>
Wave: [<wave-id>] <wave name>
Cards: <done>/<total>
Nodes: <accepted> accepted / <merged> merged / <in flight> in flight / <remaining> remaining · <percent> by risk weight · round <minutes> · proof returns <share>

| Agent | Task | Status | Time | LOC |
| --- | --- | --- | --- | --- |
| `cto-<family>` | `—` Integrate storage API | `reviewing` | 8m | — |
| `W5-4-<family>-builder` | `W5-4` Complete recovery path | `running` | 18m | +24 -3 |
```

`# Update` is the only heading; the version is the base tag without the Codex suffix; `Model` is
the CTO's `provider/model` and effort; `Context` is the host's exact measurement or the segment is
omitted; `Session` is wall-clock since this CTO session started (`24m`, `1h`, `1h24m`; a new host
conversation starts a new clock, compaction does not). The current wave holds the head of the
critical path; `total` is its card files, `done` those `accepted`. Rows: the CTO first with its
bounded action, then current-wave agents, then every other owned agent in title order. **Status**
is one derived token — `running`, `waiting`, `blocked`, `idle`, `reviewing`, `rework`, `stalled`,
`error`, `done` — never a native provider status. **Time** is time in the current derived state,
`~` when reconstructed. **LOC** is the textual line delta against the recorded baseline, `+2.4k
-36` at a thousand or more, `—` for report-only agents. Nothing follows the last row. If version,
model, effort or session time is unavailable, stop rather than invent it.

## Two registers

**The record register** governs the fleet render, the round journal, worker returns, review reports,
escalations and any durable status. Prose is formal, neutral, impersonal, evidence-led and in the
charter's `reportingLanguage`: no first or second person, social language, emotion, praise, blame,
hedging, process narrative or commentary on an agent. The system is the subject — not "the review
found" but "the check found". Order the clauses: observed fact and evidence; effect on the
contracted outcome; required disposition; remaining unknown. One decisive line of command output at
most; exits, measurements and transcripts belong in the report and the evidence package. Machine
tokens — the snapshot labels, plan IDs, agent titles, status tokens, commands, paths — are never
translated. `check-owner-status.sh` mechanically checks an unsolicited status delta for length,
paragraph count, personal language and banned framing; it judges form only.

**The chat register** governs an answer to the owner. The owner's question decides the vocabulary:
asked about a commit, a branch, an agent, a round or a file, name it precisely, with its SHA, its
title or its path. An unsolicited status delta follows the record register and runs one or two
paragraphs under 900 characters: what limits progress, what changed or was decided, why it matters
to the product, what happens next. Never repeat a fact, conclusion or next step already sent; say
nothing instead. `unavailable` is a truthful measurement; an approximation presented as one is not.
On the first Operate with a non-English language, load the host's language norms for it before the
first owner-facing message.

| Rejected | Accepted |
| --- | --- |
| "I reviewed the excellent recovery fix and think it will probably work." | "The recovery path now rejects an incomplete restore. Release authorization remains pending until the production measurement passes." |
| "Thirteen commits, a clean tree, green checks, and a deleted test environment." | "The contracted behaviour is implemented and the required checks pass on the reviewed revision. Authorization is pending." |

Every commit or repository file named in owner-facing documentation, a review report, a decision
record or the work tree is a commit-pinned Markdown link under
[Source references](source-references.md).
