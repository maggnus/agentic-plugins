# Legacy adoption

Read this file when a project that already keeps an execution document and an acceptance history
adopts the work tree. It replaces a bulk conversion with a rule, because a conversion of accepted
history buys nothing: accepted work is already immutable, and rewriting it would put the same record
in two places.

## What happens

- **A project without documents** starts directly in the work tree; nothing here applies.
- **A project with them** freezes what exists and starts new work in the tree. The frozen documents
  become read-only history. They are not converted, not reformatted, and not corrected — an
  historical accepted record is evidence of what was accepted, and editing it destroys exactly that.

The natural adoption point is a wave boundary: the next wave opens in the tree while closed waves
stay in the frozen documents. Adopting mid-wave is possible but costs a second reading path for the
same wave, so it is worth doing only when the current wave is young.

## The one rule that is enforced

One live unit has exactly one home. `work.py check --legacy-plan <path>` refuses when an identifier
that is live in the tree also appears as a current card in the frozen document. Any other divergence
between the two is harmless, because only one of them is the plan.

Everything else follows from that:

- Work already accepted stays only in the frozen history.
- Work still open at the adoption point is recreated in the tree as new files with new
  wave-prefixed identifiers, and its rows are removed from the frozen document's current section in
  the same change.
- Returning to an old accepted card creates a new `follow_up` or `expansion` task with a new
  identifier. The historical record is never reopened or rewritten.

## Old identifiers

Identifiers written before adoption need not satisfy the tree's grammar, and forms without a wave
prefix are common. That is another reason the frozen documents are not validated by `work.py check`:
they keep their own shape, and `check-plan-shape.sh` remains available for them.

## Entry points

If tooling, links, or habit point at the old paths, leave a short stub in place rather than deleting
the file. A stub states where current work now lives, links the index and the frozen snapshot, and
forbids adding new work in the old format. Do not delete an old document before its exact snapshot
exists in the repository.

## What the plugin does not ship

No converter, no migration document, and no `legacy/` directory template. Those belong to the project
performing the adoption, once, at the moment it decides to adopt.
