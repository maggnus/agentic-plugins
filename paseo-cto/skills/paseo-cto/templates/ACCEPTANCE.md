# <project> — Acceptance

Compact history of accepted cards. The plan document owns current work; Git, CI and runtime
artifacts own detailed evidence.

| Card | Wave | Risk | Accepted outcome | Closure record | Durable evidence | Time |
|---|---|---|---|---|---|---|
| `<ID>` | `<W1>` | Critical | <what is true now that was not before> | `<commit>` | Git/runtime | 28/07 20:42 (3h25m) |
| `<ID>` | `<W1>` | Routine | <accepted outcome> | `<commit>` | Git | 29/07 09:15 (40m) |

New rows use only `Routine`, `Significant` or `Critical`, one final closure record, the accepted
outcome, one durable evidence reference and the card's time field. Do not copy candidate
coordinates, patch IDs, review dialogue or command transcripts here.

`Time` carries two different facts in one cell: when the row was written, then the working time the
card cost, in parentheses. Write the moment of acceptance as `DD/MM HH:MM` in the machine's local
time — it orders the history and shows the product clock, so it is never backdated to when the work
started.

The parenthesized figure is active working time: every agent turn across build, review and rework,
plus the CTO's own work on that card. Waiting is not spent time — an owner decision, an external
gate, a queued dispatch or an idle session is excluded — so it reads as cost rather than elapsed
calendar time. Sum it from the runtime checkpoint at acceptance, round to five minutes, and write
`(<N>h<MM>m)`, `(<N>h)` on a whole hour, or `(<N>m)` below an hour. A card returned and reworked
carries the sum of all its attempts, and one whose time was never measured records `(n/a)` rather
than a reconstructed figure. A historical row that predates the column keeps a bare `n/a`.
