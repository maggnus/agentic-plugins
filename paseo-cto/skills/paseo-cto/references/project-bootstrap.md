# Project bootstrap

Read this file before the first dispatch on a new project and before opening a new wave. It
defines how the executable work tree comes into existence and what must be true before a builder
takes the first atom. Decomposition, identifiers, dependencies and the frozen starting shape are
CTO work; no separate planning role exists.

## Order for a new project

1. Read project truth: instructions and no-touch boundaries, product documents and roadmap, an
   existing tracker, the authoritative validation commands, the owner gates, the canonical HTTPS
   source repository URL.
2. Fix the release cuts and the waves: a wave is a group of cards that together make one observable
   product change shippable.
3. Create `WORKFLOW.md` from the template with the bindings resolved: validation gate, script home,
   work root, repository URL.
4. Create the wave directory and `WAVE.md` for the authorized wave only, registering its area codes
   and naming its independent lanes.
5. Create cards, and tasks only where a card needs more than one atom, with `work.py new`. Record
   dependencies, blockers and gates on the files. Product direction, pricing, legal exposure,
   external commitments, publication, live mutation, money and irreversible operations are the
   owner's: such an unknown becomes a row in `backlog/OWNER_GATES.md` and a `blocked` unit naming
   that gate, never a guess.
6. Generate the index, run `work.py check`, reach green.
7. Review the plan — independently or by waiver, below — and correct the tree in the same files.
8. Commit the frozen starting shape with the review verdict in `WAVE.md`. Only now dispatch.

A new wave repeats from step 4. A wave opens when its outcome is the nearest shippable one, not
because the previous wave finished.

## Plan review: independent or waived

An independent plan review is required for a new project's first wave, for any wave that carries a
`Critical` card, and for any wave with more than three cards. The reviewer role runs it under a
plan-review contract, answering with evidence: does the tree deliver the outcome it claims; does
work fall between cards; are there cycles or missing dependencies; can a card or wave close early;
is every `required` child required; is an owner decision hidden in a task; is every acceptance
checkable with its negative half; can a ready task start from a cold context; does any task depend
on information that exists only in an agent's history; does every blocked, paused or trigger-gated
unit carry an observable return trigger. It ends in `ACCEPT` or `RETURN` of the same plan; on
`RETURN` the CTO corrects and the same reviewer re-reviews the correction, for at most two returns.
A tree the reviewer cannot accept after two is a scope question for the owner, never a budget the
CTO grants itself. Record the verdict in `plan_review_state`, link the report as
`plan_review_evidence`, and state in `Plan review` what the review changed.

A smaller wave — at most three cards, none `Critical`, and not the project's first — may be
**waived**: the CTO answers the same ten questions against its own tree, records
`plan_review_state: waived` with the answer summary as `plan_review_evidence`, and proceeds. A
waived wave that later gains a `Critical` card or a fourth card gets the independent review before
that card starts. The check refuses a wave whose work started while the review is `pending` or
`returned`, and an `accepted` review without evidence.

The review covers the initial decomposition, not each task contract or every CTO correction inside
an accepted wave. Repeat it only for a material rewrite that changes closure, dependencies or owner
gates across several nodes.

## Executable from a cold context

Each ready unit must be dispatchable to a worker who has read nothing but that file and the
project instructions it names. A file that needs the CTO's memory of a conversation is not ready,
and the plan review is the last cheap place to catch that.
