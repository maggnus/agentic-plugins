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

## Importing the history instead of freezing it

Freezing is the default because it is cheap and because an accepted record is already immutable.
A project that wants one continuous view — the whole history and the current frontier read the same
way, in one index — may instead import its accepted cards into the tree. That is a deliberate
widening of the model, not a correction to it, and it is chosen for that reason rather than because
freezing failed.

An imported record declares itself:

- `historical_acceptance: true` marks a card as carried over, and is valid only on an accepted
  **card** — never on a task, a subtask, or open work — so the marker cannot excuse missing evidence
  on live work, and the import stays as coarse as the old record was.
- `started_at` may be absent, because the old row did not carry one.
- `risk: pre_policy` states that the work is older than the project's risk policy.
- `historical_time_record` keeps the time exactly as the old row wrote it, including a bare `n/a`,
  and the index renders that string rather than a duration it never measured.
- `historical_acceptance_metadata_incomplete: true` permits an accepted card with neither an
  acceptance moment nor a closure commit, and requires **both** to be empty. It therefore states
  that the source held neither, and cannot be used to cover one accidental omission.
- The wave plan-review gate does not apply to imported cards, because they were accepted before the
  plan existed.

The rollup then says how much of itself is history: `WAVES.md` counts imported cards in the total —
they are real completed work — and closes with one further row stating how many of the counted cards
were imported. Without that row a large import makes a project read as nearly finished, when the
number the reader sees is mostly work this tree's gate never saw.

Everything else is unchanged: the identifier is new and wave-prefixed, the body is the old record
rather than an improved retelling, and returning to an imported card creates a new `follow_up` or
`expansion` task instead of reopening it.

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
