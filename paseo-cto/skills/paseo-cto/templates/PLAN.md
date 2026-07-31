# <project> — Execution

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
  `BLOCKED`, with `blocker | major | minor` findings. Numerical scores are not used.
- A residue accepted under the review gate lives here as a node with its return condition, never
  only in review dialogue.
- Every acceptance check carries its negative half; a check whose failing form was never observed
  is not evidence.
- Every delegated write receives the risk-required non-author second look before integration.
- The validation gate is `<command>`; the full suite runs only at the triggers named per card.
- This file is updated in the same change that ships the work.
- Accepted cards move to `<acceptance file>` with their total active time.

## 3. Cards

### <W1> — <wave name>

#### EX-1 — <outcome-oriented title> — `[ ]`

**Outcome.** <one testable result; what is true when this card is done>

**Risk.** `<Routine|Significant|Critical>`: <credible consequence; for Critical, the threatened
invariant>

**Scope.**

- <what this card owns>
- <the boundary it must not cross>

**Acceptance.**

- <command, expected exit or measurement>
- <negative case that must fail closed>

**Validation budget.** <author-owned checks; review depth and its proof; the exact full-suite
trigger>

**Current state.** <where the work actually is; each claim with its source, or "not started">

#### EX-2 — <next card> — `[~]`

**Outcome.** <one testable result>

**Risk.** `<Routine|Significant|Critical>`: <credible consequence>

**Scope.** <what this card owns>

**Acceptance.** <machine-checkable conditions>

**Current state.** <where the work actually is, with sources>

**Deferred children.** <only when a card was split: each child, what it owns, and what unblocks it>
