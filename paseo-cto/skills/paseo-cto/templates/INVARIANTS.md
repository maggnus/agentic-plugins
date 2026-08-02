# <project> — Invariants

Contracts no change may break without an explicit decision record. Check this file before touching
the surfaces it names, and cite an entry when classifying a card `Critical`: that classification
requires a credible threat to a named invariant, and this registry is where the names live.

Each entry states what must hold, where it is enforced, and what breaking it would cost. An entry
that no test or check enforces is a gap worth its own card.

## INV-1 — <short name>

<What must hold, in one or two sentences, stated so a reviewer can test it.>

**Enforced by.** <commit-pinned source link to the test, check, or database constraint; or
"unenforced — see card `<ID>`">

**Breaking it costs.** <the concrete failure: data loss, tenancy leak, silent corruption, broken
public contract>

## INV-2 — <short name>

<same shape>

---

Changing or retiring an invariant is a decision record, not a review argument. Add the new entry in
the same change that ships the behaviour, and never weaken one to make a card pass.
