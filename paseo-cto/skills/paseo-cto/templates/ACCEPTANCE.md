# <project> — Acceptance

Compact history of accepted cards. The plan document owns current work; Git, CI and runtime
artifacts own detailed evidence.

| Card | Wave | Risk | Accepted outcome | Closure record | Durable evidence | Time total |
|---|---|---|---|---|---|---|
| `<ID>` | `<W1>` | Critical | <what is true now that was not before> | `<commit>` | Git/runtime | 3h25m |
| `<ID>` | `<W1>` | Routine | <accepted outcome> | `<commit>` | Git | 40m |

New rows use only `Routine`, `Significant` or `Critical`, one final closure record, the accepted
outcome, one durable evidence reference and the card's total time. Do not copy candidate
coordinates, patch IDs, review dialogue or command transcripts here.

`Time total` is the active working time the card consumed: every agent turn across build, review and
rework, plus the CTO's own work on that card. Waiting is not spent time — an owner decision, an
external gate, a queued dispatch or an idle session is excluded — so the figure is cost rather than
elapsed calendar time. Sum it from the runtime checkpoint at acceptance, round to five minutes, and
write `<N>h<MM>m`, or `<N>m` below an hour. A card returned and reworked carries the sum of all its
attempts. A card whose time was never measured records `n/a`; a figure is never reconstructed after
the fact.
