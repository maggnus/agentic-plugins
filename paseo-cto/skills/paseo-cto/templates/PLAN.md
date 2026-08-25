# <project> — Execution

**Superseded shape.** Current work lives in the permanent work tree under the project's work root;
this template describes the document a project kept before adoption and keeps afterwards as frozen
history.

The only current implementation status and critical path. Product semantics and decisions live in
their own documents; accepted history lives in the acceptance file. A status claim here carries a
verifiable source or does not enter.

## 1. Where we are

**Nearest shippable outcome.** <one sentence: what ships next and what it proves>

**Critical path.** <the ordered nodes that gate that outcome>

| Epic / wave | State | Ready |
| --- | --- | --- |
| `<W0>` <name> | `done` | 100% |
| `<W1>` <name> | `running` | <N>% |
| `<W2>` <name> | `planned` | 0% |

## 2. Rules

- Landing decisions are `ACCEPT`, `ACCEPT WITH CTO FIX`, `ACCEPT WITH RESIDUE`, `RETURN` or
  `BLOCKED`, with `blocker | major | minor` findings. Every reviewer verdict also carries its
  ten-point round score, `R<n>(<score>/10)`; the score measures the work and never decides the
  verdict.
- The canonical source repository is `<HTTPS source repository URL>`; every commit or repository
  file used as evidence is a commit-pinned Markdown link.
- A residue accepted under the review gate lives here as a node with its return condition, never
  only in review dialogue.
- Every acceptance check carries its negative half; a check whose failing form was never observed
  is not evidence.
- Every delegated repository write, semantic CTO integration fix, and delegated result used for
  closure or authorization receives the risk-required non-author review. Intermediate research is
  source-checked by the CTO.
- The validation gate is `<command>`; the full suite runs only at the triggers named per card.
- This file is updated in the same change that ships the work.
- Acceptance is an atomic transfer: append the source-linked row to `<acceptance file>` and remove
  the complete card from this current-work document in the same change. Never leave a duplicate
  `[x]` card or delete an ID without its acceptance row.

## 3. Cards

### <W1> — <wave name>

#### [ ] EX-1 — <outcome-oriented title>

**Outcome.** <one testable result; what is true when this card is done>

**Risk.** `<Routine|Significant|Critical>`: <credible consequence; for Critical, the threatened
invariant>

**Maturity.** `<RESEARCH|DESIGN|BUILD|OPERATIONALIZATION>`

**Scope.**

- <what this card owns>
- <the boundary it must not cross>

**Acceptance.**

- <command, expected exit or measurement>
- <negative case that must fail closed>

**Validation budget.** <author-owned checks; review depth and its proof; the exact full-suite
trigger>

**Current state.** `ready` — not started

#### [~] EX-2 — <next card>

**Outcome.** <one testable result>

**Risk.** `<Routine|Significant|Critical>`: <credible consequence>

**Maturity.** `<RESEARCH|DESIGN|BUILD|OPERATIONALIZATION>`

**Scope.** <what this card owns>

**Acceptance.** <machine-checkable conditions>

**Current state.** `active` — <where the work actually is, with commit-pinned source links>

**Rounds.** <returns so far on this card, with the latest round marker — `3 — R3(6/10)`; omit until
there has been one. The reviewer holds five, and a CTO-granted budget adds at most two more>

**Convergence.** <required once Rounds passes five: the decision taken on the escalated record —
accept, accept with residue, the granted two-return budget, an independent replacement reviewer,
split, or the named gate>

**Residue.** <a true finding accepted rather than fixed, stated as what is known to be wrong>

**Return condition.** <required whenever Residue is present: the observable event that makes it
worth fixing>

**Deferred children.** <only when a card was split: each child, what it owns, and what unblocks it>
