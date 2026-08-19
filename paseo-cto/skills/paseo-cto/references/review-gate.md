# CTO review gate

Read this file when a delegated repository write returns, a semantic CTO integration fix is made, or
a delegated report-only result is proposed as plan-node closure, authorization for a `Critical` card, or an
owner-gate decision. Apply it before closure, integration, or push. Intermediate research or design
used only to narrow the next contract is source-checked by the CTO and does not receive a separate
review. Ordinary CTO work-tree and contract edits follow the plan-review rule below rather than a
per-edit review. A project may define stricter gates; it must not define a weaker floor.

The CTO classifies the risk and owns the decision; the classification decides who performs the
inspection. The CTO accepts a `Routine` or plain `Significant` outcome itself, on the final diff and
the author's evidence. A `Critical` outcome, and a `Significant` one on the sensitive surfaces named
under Review depth, go to a non-author reviewer. A change the CTO authored — a semantic integration
fix — is always inspected by a non-author agent whatever its risk, because reading one's own diff is
not a second look. Landing authority, integration, and the bounded CTO fix remain CTO work.

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
classification check; they do not automatically make a card Critical. Uncertainty prevents a Routine
classification but never creates Critical by itself. Crossing subsystems, changing shared components,
dependencies, or build and test infrastructure raises a card to at least Significant unless the diff
and consequences are mechanically bounded.

## Judge at the contracted maturity

Every card carries a maturity level, set when it is written and named in the assignment. Risk says
what a defect would cost; maturity says what the card promised to produce.

- `RESEARCH` — the outcome is a verified answer. Refuting the starting hypothesis is a success.
- `DESIGN` — the outcome is a working model. A preliminary plan may change as facts arrive.
- `BUILD` — the outcome is an already-specified contract, realized. Divergence is a defect.
- `OPERATIONALIZATION` — the outcome is proof that a real procedure is executable by a real operator
  in the environment actually available.

**Judge work at the maturity level contracted by the card.** An assumption invalidated during
research or design is a result, not a defect. Return work only when it fails the outcome promised at
that maturity level.

Depth of investigation surfaces neighbouring problems, and no card carries everything found next to
it. Sort each finding into exactly one kind before deciding the landing:

- a defect in **this card's contracted outcome** — the only kind that can force a return;
- a **refinement of the starting hypothesis** — recorded as a result, not charged as a failure;
- an **independent product defect** — a proposed plan child, reported precisely and left unfixed;
- **additional work** the finding implies — a separate card, never absorbed into this one.

State the kind alongside each finding. No landing decision may use a finding whose kind is unstated.

## Common evidence floor

For every outcome that crosses this gate:

1. inspect the report, complete evidence package, outcome, scope, and no-touch boundaries;
2. inventory executable or source-verifiable evidence for the exact returned result; verbal claims
   are not acceptance;
3. require a clean final worktree and preserve real command exits or source-linked primary evidence;
4. list evidenced `blocker`, `major`, or `minor` findings;
5. choose `ACCEPT`, `ACCEPT WITH CTO FIX`, `ACCEPT WITH RESIDUE`, `RETURN`, or `BLOCKED`.

For a repository write, also inspect the final workspace state, complete reviewed revision range,
ancestry, and actual diff. For a gated report-only result, verify every source that carries a
conclusion and the stated omitted scope. Apply [Source references](source-references.md) to every
commit or repository file cited as durable evidence. Numerical scores are not used.

## A proof must be able to fail

A check that cannot fail proves nothing and is indistinguishable from a passing check until
production disagrees. The recurring shapes: a gate whose condition no input could violate, a script
comparing a subset against itself, a fixture pinned to the value the code currently produces, and a
suite exercising a configuration the deployed system never reaches.

For every load-bearing claim offered as acceptance evidence, require three things. Several commands
may share one negative half when they establish the same claim; unchanged compiler, formatter,
linter, and upstream-suite commands need no ceremonial mutation.

- **The negative half, with its output captured.** Show the check failing on a deliberately broken
  input — the mutation, the command, and the real non-zero exit.
- **What it catches and what it does not.** Name the mutations the check distinguishes and the ones
  it would pass. A check with no stated blind spot has not been thought about.
- **Reachability of the configuration it ran in.** Argue that the environment, inputs, and code path
  under test are ones the product actually reaches.

This is a property of the evidence, not an extra stage. It costs the author one broken input and one
sentence, and removes the review round that would otherwise discover the same thing later.

## Review depth

Whoever performs the inspection — the CTO or a delegated reviewer — checks every changed path against
the contract's write zone and `No-touch` before judging the content. A path outside the write zone is
a finding until it is classified: the additive edit the [Assignment contract](assignment-contract.md)
permits, declared in the return and changing no existing behaviour there, is ratified at integration;
anything undeclared, behaviour-changing, or inside `No-touch` returns.

### Routine

The CTO reads the final diff and the author's acceptance evidence and accepts or returns; no
separate agent, no falsifier, no author response.

### Significant

The CTO reads the final diff and checks the author's acceptance evidence against the task file;
a delegated non-author reviewer is added only when the change touches authentication,
authorization, money, privacy, data loss, schema, or a canonical contract, or when the author's
evidence does not exercise the product path. That reviewer inspects the complete outcome with the
final diff plus targeted success and failure-path checks, and adds an independent falsifier only
for a concrete risk hypothesis existing evidence does not settle.

### Critical

An independent non-author reviewer inspects the complete returned outcome and evidence. At least one
independently selected executable falsifier, fault-injection proof, conflicting primary source, or
bounded counterexample must challenge the threatened invariant. Repository writes use executable
proof when the invariant can be exercised. The reviewer may own that proof. A maintained negative or
conformance suite counts only when it demonstrably distinguishes the defect.

### Depth follows the classification and does not drift

The risk-required depth is the default and, absent new evidence, the ceiling. Adding a falsifier, a
round, or a suite beyond it carries its explicit reason in the review record. Resolve uncertainty by
reclassifying the card on evidence, never by silently reviewing at a higher tier. One review may
cover several batched sibling nodes: it runs once at the highest classification among them, and its
evidence must close each node individually.

A correction is classified by the credible consequence of the correction itself, not inherited from
its parent card. A mechanical test-inventory, comment, generated-file, or report repair may receive a
Routine acceptance even when the product change it supports was Critical, provided it cannot alter
product behaviour or weaken the critical proof. If the correction changes an oracle, acceptance
semantics, production reachability, or the threatened invariant, it keeps the corresponding depth.

## When the reviewer shares the author's provider family

An independent review borrows part of its strength from the reviewer not sharing the author's blind
spots. A same-family assignment removes that property silently: the review still reads as independent
and still produces findings.

Record in the review that the cross-family property was lost, and compensate in the reviewer's
contract:

- **Require a falsifier of a different shape than the author's evidence.** If the author proved the
  behaviour with a unit test, the falsifier injects a fault, drives the product path end to end, or
  attacks the boundary from outside.
- **Forbid taking the problem statement from the author.** The reviewer derives what the change must
  do from the contract, the specification, and the code, never from the author's report.
- **Weight the absence of findings accordingly.** Findings that survive are worth no less; findings
  that are missed are more likely. Prefer keeping a `Critical` card's falsifier independently
  selected even when that costs a round.

## Accepting with residue

A finding can be real, correctly argued, and still not worth another round when the product
behaviour is settled and what remains only improves the proof.

`ACCEPT WITH RESIDUE` lands the work and records the finding as a known fact with a return
condition. It requires all of:

- the outcome the card contracted is met and evidenced;
- the residue is written where the project will find it again — a plan node, an invariant entry, or a
  decision record — never only in review dialogue;
- the return condition is concrete and observable, stated so that anyone can recognise it;
- the decision names what is being accepted.

**Residue is forbidden when the finding fails either test below**, and the decision is `RETURN` or
`BLOCKED`:

- **Reversibility.** Could the worst credible failure be undone once noticed? A defect that destroys,
  discloses, or misappropriates something cannot be un-shipped by fixing it later.
- **Detection.** Would the failure announce itself? A defect that fails silently has no moment at
  which the return condition fires.

Authentication and authorization, tenant isolation, money, privacy and secrets, data loss and
corruption, and irreversible actions fail both tests routinely; the list saves time on common cases
and does not bound the rule. When in doubt the card returns.

Record the residue in the accepted task's `Closure` section under `Residuals`, set
`deliberate_partial: true`, and give it an exact `return_trigger`. When the unachieved part is
independent work rather than a limitation, it gets its own task identifier instead.

## Reviewing a decomposition rather than an outcome

A plan review applies this gate once to a new project's or wave's tree before its first card starts.
Creating or correcting an individual task contract inside an accepted wave is CTO-owned work and
does not trigger a separate contract review. Review the tree again only when a later rewrite changes
closure semantics, dependencies, or owner gates across multiple nodes. A `RETURN` and any such
re-review continue with the same reviewer and retained evidence under
[Project bootstrap](project-bootstrap.md).

## Converge: the second return forces a decision

Each round looks justified on its own, so a card can keep returning on ever narrower findings after
the product behaviour stopped changing.

After the **second** return on one card, the CTO decides in that same turn among exactly these:

- **accept with residue**, under the rule above;
- **split the card**, moving the unresolved part into its own node with its own risk classification
  and acceptance, and landing the settled part;
- **name the gate and stop**, recording what blocks convergence and who must resolve it.

A third round is available only when the new finding is a blocker failing the reversibility or
detection test, and the reason goes in the record. Track rounds per card, not per candidate: a
re-dispatch under a new commit is the same card. Record the count in the card's `Rounds` field; a
card at two or more rounds also carries `Convergence` naming which decision was taken.

## The author's bounded response round

Grant the originating agent one bounded, evidence-based round of response only when there is a
blocker or major finding, a proposed return, a disputed scope or contract, or a semantic CTO
integration edit. In that round the agent may agree, partly agree, or defend each disputed finding
with specification, code, tests, measurements, or a reproducible counterexample. Agreement is not an
acceptance gate, and a clean acceptance — delegated or CTO-performed — requires no response round.

The agent must not edit, recommit, or widen scope during the round unless rework is explicitly
authorized. Resolve every defence on evidence and withdraw or reclassify disproved findings. A new
adverse finding discovered during the round earns its own bounded round before final authorization.
Agent silence is recorded but creates no agreement.

Choose return versus CTO repair by severity, blast radius, depth, hot context, correction size,
acceptance cost, and collision risk. A CTO fix is small, obvious, bounded, separately visible,
rerun, and disclosed. Return deep, behavioural, architectural, cross-file, or uncertain work.

## Direct exchange between author and reviewer

A fact that only one side holds is asked and answered directly; routing it through the CTO delays the
answer until the next reconcile. The CTO remains the decision point and audits the exchange at the
material handoff, at the return, and at the scheduled reconcile.

The channel carries facts: the exact revision, range and bounded scope; how to reproduce something,
the command, and its real exit; which finding refers to which line, and the evidence-based response
to it. One question, one answer. Do not restate what the contract, the report, or the diff already
carries. Ask when asking is cheaper than deriving the same fact from the code.

Four things the exchange never does:

- negotiate a verdict, an acceptance, or a classification outside the task contract;
- request that an adverse check or finding be skipped, weakened, concealed, or reclassified;
- let the author select or modify a reviewer-owned falsifier, or the reviewer modify the candidate
  or its acceptance evidence;
- apply pressure, urgency, praise, blame, or any other social framing to a verdict.

Independence of derivation does not change: the reviewer derives what the change must do from the
contract, the specification and the code. The exchange supplies facts, not the problem statement.

Record each exchange in one line in both the return and the review report — what was asked, what was
answered. On any signal of a breach, freeze integration, preserve the record, and assign an
independent replacement or tie-break reviewer; never allege coordination without a reproducible
message or action. A project may close this channel and route every handoff through the CTO, but it
may not widen it.

## Lean re-review after return

An accepted `RETURN` starts bounded rework inside the same card. It does not reset valid review
evidence or require a new review organization. For a report-only outcome, the preserved author and
reviewer continue against the same evidence package without a repository fast-forward.

- Keep the originating author and independent reviewer, with their workspaces, until the finding is
  resolved. Reuse the same reviewer by default.
- Before re-review, the CTO may advance a clean preserved reviewer branch to the corrected exact
  revision only by verified conflict-free fast-forward: require empty porcelain, the recorded prior
  reviewed `HEAD`, and ancestry from that `HEAD` to the correction. Record the new exact range.
  Never rebase, reset, or resolve conflicts in the reviewer workspace; use a replacement workspace
  when fast-forward is impossible.
- The reviewer may satisfy complete-final-diff inspection by retaining its own inspection of
  unchanged lines, inspecting the entire rework delta and affected context, and confirming the final
  range, scope, ancestry, and evidence. Do not force a context-free reread of unchanged material.
- A reviewer-selected falsifier remains independently selected. Rerun it on the corrected revision
  when its hypothesis still applies. Add a new proof only for a new risk hypothesis, materially
  changed semantics or dependency surface, contradictory evidence, or an invalidated prior proof.
- Use a replacement reviewer only when the prior reviewer is unavailable or errored, independence is
  compromised, a disputed finding needs a tie-break, or the rework materially expands scope,
  dependencies, or the threatened invariant.
- When several blocker or major findings are symptoms of one missing model, use the existing
  response round to state the shared ownership, lifecycle, serialization, or linearization model and
  its bounded acceptance matrix before patching.

The author response and explicitly authorized rework may be one follow-up when the CTO accepts the
findings and the repair contract is clear. Never insert a ceremonial `AGREE` round.

## Integration delta

Integrate accepted work only into a clean CTO tree. Compare the integrated result with the reviewed
revision range:

- if it applies without manual edits and its dependency surface is unchanged, reuse valid
  final-revision evidence;
- if a conflict resolution, integration edit, reordered dependency, or changed dependency surface
  alters the result, dispatch an explicit non-author review of that delta and rerun every check it
  may invalidate.

Patch identity is optional provenance metadata, never an acceptance criterion. Inspect every commit
in `<upstream>..HEAD` before push. Do not repeat a leaf suite whose reviewed tree and dependency
surface remain unchanged; follow [Validation budget](validation-budget.md).

## Durable evidence

- Preserve archive-worthy evidence through source-linked Git references, an approved artifact store,
  CI, runtime state, or a concise durable authorization record. Apply
  [Source references](source-references.md) to every commit or repository file mentioned.
- Durable evidence is the derivation, not the haul. Keep what was run, its exit, the values that
  decide the claim, and a script able to re-derive them on the exact revision. Retain a raw capture
  only where the claim is otherwise unreproducible. Money movement, tenant isolation, the sandbox
  boundary, and irreversible operations keep their complete raw package.
- Prove generated or deployed artifact ancestry and serialize live changes against evidence runs.
- Treat shared-tree contamination as failure; preserve dirty or unintegrated work for diagnosis.
- Implementation ends locally. Push, deploy, publication, live mutation, paid work, schema
  operations, and irreversible actions remain separate explicit owner or project gates.
