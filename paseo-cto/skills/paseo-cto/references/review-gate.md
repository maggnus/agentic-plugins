# CTO review gate

Read this file when a delegated write returns, before repository integration and any push. A project
may define stricter gates; it must not define a weaker floor.

## Risk classification

Classify the card by the credible consequence of a defect, not by file type, subsystem, diff size,
or implementation mechanism:

- `Routine` — the worst credible failure is local, quickly detectable, reversible, and cannot
  violate a critical product invariant.
- `Significant` — product or service behaviour changes materially, but credible damage remains
  bounded, observable, and reversible.
- `Critical` — a realistic defect could directly violate security, authentication, authorization,
  tenant isolation, privacy or secrets, data integrity or preservation, distributed consistency or
  completion, public compatibility, or the safety of an irreversible action.

Auth, protocol, migration, storage, deployment, and similar surfaces trigger an explicit
classification check; they do not automatically make a card Critical. Uncertainty prevents a
Routine classification but never creates Critical by itself; Critical always requires a credible
threat to a named critical invariant. Crossing subsystems, changing shared components, dependencies,
build/test infrastructure, or requiring manual integration raises a card to at least Significant
unless the diff and consequences are mechanically bounded.

## Common evidence floor

For every returned repository write:

1. inspect the report, final workspace state, complete reviewed revision range, ancestry, and actual
   diff against outcome, scope, and no-touch boundaries;
2. inventory executable final-revision evidence; verbal claims are not acceptance;
3. require a clean final worktree and preserve real command exits;
4. list evidenced `blocker`, `major`, or `minor` findings;
5. choose `ACCEPT`, `ACCEPT WITH CTO FIX`, `ACCEPT WITH RESIDUE`, `RETURN`, or `BLOCKED`.

Numerical scores are not used.

## A proof must be able to fail

A check that cannot fail proves nothing, and it is the most expensive defect this gate exists to
catch: it is indistinguishable from a passing check until something in production disagrees with it.
The recurring shape is one defect wearing different clothes — a gate whose condition no input could
violate, a script comparing a subset against itself, a fixture pinned to the value the code
currently produces, a suite exercising a configuration the deployed system never reaches. Each
reports success truthfully and means nothing by it.

For every check offered as acceptance evidence, require three things before it counts:

- **The negative half, with its output captured.** Show the check failing on a deliberately broken
  input — the mutation, the command, and the real non-zero exit. A check whose failing form was
  never observed is a claim, not a measurement.
- **What it catches and what it does not.** Name the mutations the check distinguishes and, just as
  explicitly, the ones it would pass. A check with no stated blind spot has not been thought about.
- **Reachability of the configuration it ran in.** Argue that the environment, inputs, and code path
  under test are ones the product actually reaches. Evidence gathered in a configuration production
  cannot enter is evidence about a system nobody runs.

This is a property of the evidence, not an extra stage: it costs the author one broken input and one
sentence, and it removes the review round that would otherwise discover the same thing later.

## Review depth

### Routine

A non-author integrator or CTO performs a mandatory second look over the complete final diff, scope,
and final-revision acceptance evidence and returns `ACCEPT` or `RETURN`. This is not a formal
independent review. It requires no separate reviewer, falsifier, author response, or score.

### Significant

An independent non-author reviewer inspects the final diff and evidence. Targeted success and
relevant failure-path checks must cover the changed behaviour. Add an independent falsifier only
when there is a concrete risk hypothesis that existing evidence does not settle.

### Critical

An independent non-author reviewer inspects the final diff and evidence. At least one independently
selected executable falsifier or fault-injection proof must challenge the threatened invariant. The
reviewer may own that proof; no separate falsifier role is required. A maintained negative or
conformance suite counts only when it demonstrably distinguishes the defect.

## When the reviewer shares the author's provider family

An independent review borrows part of its strength from the reviewer not sharing the author's
blind spots. When the assignment puts author and reviewer on the same provider family — because only
one is available, or the charter says so — that property is gone, and it goes quietly: the review
still reads as independent and still produces findings.

Do not treat this as equivalent. Record in the review that the cross-family property was lost, and
compensate in the reviewer's contract:

- **Require a falsifier of a different shape than the author's evidence.** If the author proved the
  behaviour with a unit test, the falsifier is not another unit test: it injects a fault, drives the
  product path end to end, or attacks the boundary from outside. Same-shape evidence tends to share
  the same blind spot.
- **Forbid taking the problem statement from the author.** The reviewer derives what the change must
  do from the contract, the specification, and the code — never from the author's report of what it
  does. A review that begins by accepting the author's framing can only check the work against
  itself.
- **Findings that survive are worth no less; findings that are missed are more likely.** Weight the
  absence of findings accordingly, and prefer keeping a `Critical` card's falsifier independently
  selected even when that costs a round.

## Accepting with residue

Not every true finding has to be fixed before the work lands. A finding can be real, correctly
argued, and still not worth another round — because the product behaviour under review is already
settled and what remains improves the proof, hardens a boundary nobody can currently cross, or
anticipates a condition that does not yet exist.

`ACCEPT WITH RESIDUE` lands the work and records the finding as a known fact with a return
condition. It requires all of:

- the outcome the card contracted is met and evidenced;
- the residue is written down where the project will find it again — a plan node, an invariant entry,
  or a decision record — never only in review dialogue;
- the return condition is concrete and observable: the event that makes the residue worth fixing,
  stated so that anyone can recognise it when it happens;
- the decision names what is being accepted, not merely that something was.

**Residue is forbidden when the finding fails either test**, and the decision is `RETURN` or
`BLOCKED`:

- **Reversibility.** Could the worst credible failure be undone once noticed? A defect that destroys,
  discloses, or misappropriates something cannot be un-shipped by fixing it later.
- **Detection.** Would the failure announce itself? A defect that fails silently — wrong data
  accepted as right, an authorization that quietly permits, a payment that quietly doesn't — has no
  moment at which the return condition fires.

Authentication and authorization, tenant isolation, money, privacy and secrets, data loss and
corruption, and irreversible actions are named because they fail both tests routinely, not because
the list is complete. A finding outside the list that fails either test is barred just the same; the
tests decide, the list only saves time on the common cases. When in doubt the card returns — the
cost of one more round is bounded, and the cost of a wrong residue is not.

Record the residue as a plan node carrying `Residue` and `Return condition` fields, so the shape
check can see it exists. A residue with no return condition is not a decision, it is a defect
nobody is tracking.

## Converge: the second return forces a decision

Review rounds are not free, and their cost is invisible because each individual round looks
justified. The failure mode is a card that keeps returning on progressively narrower findings while
the product behaviour it was about stopped changing several rounds ago.

After the **second** return on one card, the CTO decides in that same turn — not after one more
round — among exactly these:

- **accept with residue**, under the rule above;
- **split the card**, moving the unresolved part into its own node with its own risk classification
  and acceptance, and landing the settled part;
- **name the gate and stop**, recording what is actually blocking convergence — a missing decision,
  an absent capability, an unstated requirement — and who must resolve it.

Continuing to a third round is available only when the new finding is a blocker that fails the
reversibility or detection test above, and the reason goes in the record. Track rounds per card, not
per candidate: a re-dispatch under a new commit is the same card. Record the count in the card's
`Rounds` field — a card at two or more rounds must also carry `Convergence` naming which of the
three decisions was taken, so the choice is visible in the plan rather than only in the review.

## The author's bounded response round

Grant the originating agent one bounded, evidence-based round of response only when there is a
blocker or major finding, a proposed return, a disputed scope or contract, or a semantic CTO
integration edit. In that round the agent may agree, partly agree, or defend each disputed finding
with specification, code, tests, measurements, or a reproducible counterexample. Agreement is not an
acceptance gate. Clean acceptance and Routine second looks require no response round at all.

The agent must not edit, recommit, or widen scope during the round unless rework is explicitly
authorized. Resolve every defense on evidence and withdraw or reclassify disproved findings. A new
adverse finding discovered during the round earns its own bounded round before final authorization.
Agent silence is recorded but does not create agreement or automatically block an otherwise
evidence-supported decision.

Choose return versus CTO repair by severity, blast radius, depth, hot context, correction size,
acceptance cost, and collision risk. A CTO fix is small, obvious, bounded, separately visible,
rerun, and disclosed. Return deep, behavioural, architectural, cross-file, or uncertain work when
author continuity helps.

## Lean re-review after return

An accepted `RETURN` starts bounded rework inside the same card; it does not reset valid review
evidence or require a new review organization.

- Keep the originating author and independent reviewer, with their workspaces, until the finding is
  resolved. Reuse the same reviewer by default.
- Before re-review, the CTO may advance a clean preserved reviewer branch to the corrected exact
  revision only by verified conflict-free fast-forward: require empty porcelain, the recorded prior
  reviewed `HEAD`, and ancestry from that `HEAD` to the correction. Record the new exact range.
  Never rebase, reset, manually edit, or resolve conflicts in the reviewer workspace; use a
  replacement workspace when fast-forward is impossible.
- The reviewer may satisfy complete-final-diff inspection by retaining its own inspection of
  unchanged lines, inspecting the entire rework delta and affected context, and confirming the final
  range, scope, ancestry, and evidence. Do not force a context-free reread of unchanged material.
- A reviewer-selected falsifier remains independently selected. Rerun it on the corrected exact
  revision when its hypothesis still applies; do not require a novel or distinct falsifier merely
  because the commit changed. Add a new proof only for a new risk hypothesis, materially changed
  semantics or dependency surface, contradictory evidence, or an invalidated prior proof.
- Use a replacement reviewer only when the prior reviewer is unavailable or errored, independence
  is compromised, a disputed finding needs an independent tie-break, or the rework materially
  expands scope, dependencies, or the threatened invariant.
- When several blocker or major findings are symptoms of one missing model, use the existing author
  response/rework round to state the shared ownership, lifecycle, serialization, or linearization
  model and its bounded acceptance matrix before patching. Do not add a separate research stage
  unless material uncertainty remains.

The author response and explicitly authorized rework may be one follow-up when the CTO accepts the
findings and the repair contract is clear. Never insert a ceremonial `AGREE` round.

## Integration delta

Integrate accepted work only into a clean CTO tree. Compare the integrated result with the reviewed
revision range:

- if it applies without manual edits and its dependency surface is unchanged, reuse valid
  final-revision evidence;
- if a conflict resolution, integration edit, reordered dependency, or changed dependency surface
  alters the result, review that delta explicitly and rerun every check it may invalidate.

Patch identity is optional provenance metadata, never an acceptance criterion. Inspect every commit
in `<upstream>..HEAD` before push. Do not repeat a leaf suite whose reviewed tree and dependency
surface remain unchanged; follow [Validation budget](validation-budget.md).

## Durable evidence

- Preserve archive-worthy evidence through Git, an approved artifact store, CI, runtime state, or a
  concise durable authorization record.
- Prove generated or deployed artifact ancestry and serialize live changes against evidence runs.
- Treat shared-tree contamination as failure; preserve dirty or unintegrated work for diagnosis.
- Implementation ends locally. Push, deploy, publication, live mutation, paid work, schema
  operations, and irreversible actions remain separate explicit owner/project gates.
