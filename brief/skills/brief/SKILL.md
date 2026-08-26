---
name: brief
description: Set a product up before any code exists. State what it is and what it deliberately is not, test it against unlike uses, turn it into a proof a stranger can run, order the slices that reach it, and lay the four documents every later decision is read from. Invoke as `$brief:brief` in Codex or `/brief:brief` in Claude.
---

# Brief

This phase ends before the first line of code. It answers four questions — what is being built, what
is deliberately not being built, what would prove it was built, and what is built first — and it
leaves behind three things the rest of the project is read from: a concept, an order of slices, and
the documents that hold both. It runs once when a project starts, again when a large slice opens,
and on a running project that never had a concept at all.

It does not track work. No state directory, no card tree, no generated index: the delivery method
owns that, and duplicating it here produces two plans that disagree by the third week.

## What must be true when this ends

1. **A concept** — the product in one claim, the consumer and the task, the shortest path that is
   already useful, the refusals, the observable measure of success, and the assumptions still
   unproven.
2. **An order of slices** — a sequence of observable product changes, the first of which carries a
   consumer end to end.
3. **A documentation frame** — one entry point, one normative product document, decision records,
   and an invariant registry, with the authority order between them fixed.

The concept is finished not by length but by capability: it is done when the first slice can be
named and someone can say how they would know it works. Anything not needed for that answer does not
belong in it and can be written later, when it is cheaper and truer. A phase that produced documents
but cannot name the first slice has not finished; a phase that named the first slice with three
paragraphs is complete.

## Hold what is yours and name what is not

No role is created here. Whoever leads the work holds the decisions that are theirs, and the
delivery method — a fleet, a subagent, a colleague — supplies anyone else who is needed.

Some decisions are never yours. Product direction, pricing, money, legal exposure, privacy posture,
publication, external commitments, and anything irreversible belong to the owner. Such an unknown is
written down as an open decision with the work that depends on it named beside it, and the dependent
slice is marked as waiting on it. Filling one in quietly to make the concept read as complete is the
single most expensive thing that can happen in this phase, because everything downstream inherits it
without knowing it was a guess.

State each open decision in one sentence, say what changes with each answer, and stop there. A
recommendation is welcome; a substitution is not.

## State the product, and state its refusals

Write these, in this order, and keep each one short enough to be argued with:

- **The claim** — one sentence naming what the product is. Not a category, not a comparison, not a
  benefit. If it needs a second sentence to be understood, the first one is not yet the claim.
- **The consumer and the task** — who reaches for this, and what they were trying to accomplish
  before it existed. A task, not a segment: people are described by what they are doing.
- **The shortest useful path** — the smallest sequence of steps that already leaves the consumer
  better off, written as steps. If that path requires an entity the consumer did not ask for, the
  model has a foreign concept in it and the path is not yet the shortest.
- **The refusals** — what the product deliberately does not do, and for whom it is not. This section
  is worth more than the claim: it is the one people argue with, and every argument it starts is one
  that would otherwise have been had halfway through implementation.
- **The measure** — what is observably true when this works, stated so that it could turn out false.
  A number nobody will read is not a measure; a behaviour anyone can check is.
- **The unproven** — assumptions the concept rests on and nobody has tested yet, each with what
  would disprove it.

## Test it against unlike uses before it becomes a system

A concept validated against one use becomes that use's private tool with a general name. Name
several genuinely unlike uses of the product — different consumers, different scale, different
failure cost, different degree of trust — and for each one write what the product must be true for
it to work, and the escape hatch it needs when the product cannot do something itself.

Then apply the rule that keeps the system small: **a capability becomes part of the product only if
at least two unlike uses require it, or it is a safety or consistency invariant nothing but the
product itself can enforce.** Everything else is that one use's own work, reached through the escape
hatch. A use invented after the fact to justify a capability someone already wanted is not a witness
— the test is whether it was named before the capability was.

Every capability that passes needs a lifecycle, a failure mode, a way to withdraw it, and a way to
observe it. A capability with no removal path is a permanent obligation being taken on silently.

## Turn it into a proof a stranger can run

Write the numbered list of things a person who was not involved can do, using only what is published,
when the product is finished. Each line is an action and its result — "opens X and receives Y" —
never a property of the system, never "supports", never a status code or a rendered page as the
result.

This list is the definition of done for the product, and it is where the order of slices comes from:
each slice is the shortest work that makes one more line of it true. It is also the cheapest
correction available in the whole project, because a line nobody can write here is a product nobody
could have described later.

## Order the slices

- **The first slice carries a consumer end to end.** Not a schema, not a platform layer, not an
  authentication system with nothing behind it. The first thing that works proves the concept was
  real; anything else defers that proof to the moment it is most expensive.
- **Each slice states its outcome in one sentence, observable by the consumer.** "The importer
  rejects a malformed row with a named error" is an outcome. "The parser is refactored" is a step.
- **A slice is opened when its outcome is the nearest reachable one**, not because the previous one
  finished and it was next on a list written a month ago.
- **Dependencies, blockers and owner gates are written on the slice itself**, in the words of what is
  waiting and what would release it.
- **Kinds of work stay separated**: ready, waiting on an owner decision, waiting on an external
  event, withdrawn, and not yet promoted into the plan at all. Mixing them produces a plan that
  looks full and moves slowly, and hides which of the two is happening.

## Have the decomposition read by someone else

The completeness of your own decomposition is the one thing you cannot check. Before any building
starts, someone who did not write the order reads it and answers, with evidence:

1. Does the sequence, taken together, deliver the product the concept claims?
2. Is there work that falls between two slices and belongs to neither?
3. Are there dependency cycles, or dependencies on slices that do not exist?
4. Can any slice be closed while its outcome is still false — is any closure path a false one?
5. Is every outcome observable by a consumer, or is one of them an internal state in disguise?
6. Is any owner decision presented as ordinary work?
7. Is every acceptance condition checkable, including its negative half — what must *not* happen?
8. Can each ready slice be started from a cold context by someone who read only its own description?
9. Does anything depend on information that exists only in a conversation?
10. Does every waiting, withdrawn and deferred item carry an exact, observable condition that
    returns it?

The read ends in `ACCEPT` or `RETURN` on the same plan, with each finding named precisely. On
`RETURN` the plan is corrected in place and the same reader continues rather than starting over. Two
returns, then decide: accept with the limitation written down, split the disputed part off, or name
the blocker and stop. A plan its reader still cannot accept after the second return is a scope
question, not a review question.

## Lay the documentation frame

Four roles, whatever the project chooses to call the files:

- **One entry point** — the single file a person or an agent opens first: what this is, what to read
  in what order, where everything lives. Every environment instruction file in the repository
  carries no content of its own and points here, so there is one place to change and one to read.
- **The product document** — normative semantics: entities, lifecycles, boundaries, what the product
  promises. It changes only through a decision record, never in passing while shipping something.
- **Decision records** — one per decision, each with its context, the decision itself, what it costs,
  and the alternatives that were rejected and why. Without the rejected alternatives a record is
  decoration: the next person reopens the question and pays for it twice.
- **An invariant registry** — a numbered list of contracts no change may break without a new decision
  record, each naming what must hold and where it is enforced. It also converts risk classification
  from a judgement call into a lookup.

Fix the authority order once, in the entry point, and resolve every later conflict by it: decision
records outrank the product document, which outranks the invariant registry and the mechanism
documents, which outrank the code. Code is evidence of what exists today; it is never authority to
weaken what the product promised.

## Keep the frame true

- **A document is corrected by the same change that falsified it** — not the next one, not later. A
  document that has drifted from the code is worse than no document, because the reader believes it.
- **A claim enters only with a source that can be checked.** "It was verified" without the command
  that verified it is a claim about a feeling.
- **A deleted document is never restored from history as authority.** It was deleted by a decision;
  reviving the text revives a decision nobody made.
- **The frame is checked where changes land.** Whoever reads a change before it lands also asks
  whether it moved a product surface without touching the entry point, the product document, or a
  decision record. That question costs one line and is the only thing that keeps the frame alive.

## Hand the work over

This phase produces no code and lands no change. When the order of slices has been read and
accepted, hand the first slice to the delivery method — it decomposes that slice into outcomes,
sizes its checks, and reviews what lands. Return here only to open the next large slice, or when a
decision record changes the concept underneath one.

## Reporting

Lead with the concept's claim, then the refusals, then the first slice and what would prove it.
Write about the product, not about the process of writing about it: no first person, no narration of
how the document was produced. Say plainly which decisions are still the owner's and which
assumptions remain unproven — an unstated gap in this phase is inherited by everything built after
it.
