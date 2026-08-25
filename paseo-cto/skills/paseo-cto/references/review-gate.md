# CTO review gate

Read this file when a delegated repository write returns, a semantic CTO integration fix is made, or
a delegated report-only result is proposed as plan-node closure, authorization for a `Critical` card, or an
owner-gate decision. Apply it before closure, integration, or push. Intermediate research or design
used only to narrow the next contract is source-checked by the CTO and does not receive a separate
review. Ordinary CTO work-tree and contract edits follow the plan-review rule below rather than a
per-edit review. A project may define stricter gates; it must not define a weaker floor.

The CTO classifies the risk and owns the decision; the classification decides who performs the
inspection. The CTO accepts a `Routine` outcome itself, and a `Significant` one only when the change
cannot alter product behaviour — tests, documentation, configuration, generated files, mechanical
edits. A `Significant` outcome that changes product code, and every `Critical` outcome, go to a
non-author reviewer: a diff read cannot catch the defect classes that matter at that tier
(concurrency, authority composition, unexercised paths), because the CTO runs no falsifier of its
own and reads with the integrator's, not the adversary's, hypothesis. A change the CTO authored — a semantic integration
fix — is always inspected by a non-author agent whatever its risk, because reading one's own diff is
not a second look. Landing authority, integration, and the bounded CTO fix remain CTO work.

Once an outcome is under inspection, the author and its reviewer converge on it themselves: the
reviewer returns, the author corrects, and the two repeat until the reviewer accepts or its
five-return budget is spent. The CTO stays outside that loop and decides on the record when it
escalates or breaks. *The convergence loop* and *Escalation* below define both.

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
5. choose `ACCEPT`, `ACCEPT WITH CTO FIX`, `ACCEPT WITH RESIDUE`, `RETURN`, `ESCALATE`, or
   `BLOCKED`. A delegated reviewer chooses only `ACCEPT`, `RETURN`, or `ESCALATE`; the landing
   decisions belong to the CTO.

For a repository write, also inspect the final workspace state, complete reviewed revision range,
ancestry, and actual diff. For a gated report-only result, verify every source that carries a
conclusion and the stated omitted scope. Apply [Source references](source-references.md) to every
commit or repository file cited as durable evidence. Every verdict carries the round score defined
under *Scoring each round*; the score measures the work and never decides the verdict.

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
separate agent and no falsifier. A return goes to the author as the correction it names, and the
author argues back only where it disputes a finding on evidence — no ceremonial response round.

### Significant

A change that cannot alter product behaviour — tests, documentation, configuration, generated
files, mechanical edits — is accepted by the CTO on the final diff and the author's acceptance
evidence checked against the task file. Any change to product code receives a delegated non-author
reviewer, who inspects the complete outcome with the final diff plus targeted success and
failure-path checks and brings at least one independently selected falsifier of a concrete risk
hypothesis the author's evidence does not settle; sensitive surfaces (authentication,
authorization, money, privacy, data loss, schema, canonical contracts) additionally anchor the
falsifier to the threatened invariant. The reviewer runs in parallel and blocks nothing; the
saving from skipping it is spent later with interest when an escaped defect is repaired after
integration.

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
condition. It is a landing decision, so only the CTO takes it: a delegated reviewer may name a
finding as residue-eligible in its return, and the CTO decides. It requires all of:

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

A plan review converges the same way, with the CTO as the author of the tree: the reviewer returns,
the CTO corrects the tree, and the loop repeats under the same five-return budget and the same
journal, kept in the wave file. Because the CTO is the corrected party there, an exhausted budget
goes to the owner as a named gate rather than to another CTO decision — a decomposition the reviewer
cannot accept after five rounds is a scope question, not a review question.

## The convergence loop

A returned card is not finished by a verdict; it is finished by the author and the reviewer
converging on evidence. They own that loop and run it to its end. Inside it the CTO adjudicates
nothing and authorizes no individual correction: it carries the material between the two agents,
advances the reviewer branch, writes the round journal, and watches for the break conditions below.
Everything the gate already requires — independent derivation, a proof able to fail, the finding
kinds, the maturity level, the review depth, and the non-negotiation rules of the direct exchange —
holds unchanged in every round.

- **A return authorizes the rework it names, and nothing else.** The author corrects inside the same
  node, the same write zone, and the same contract, preserving still-valid proof and adding
  regressions only for accepted findings. No separate rework contract is issued for a round.
- **One round is one return and one corrected candidate.** The author answers every finding with
  evidence — agreement, partial agreement, or a defence built from specification, code, tests,
  measurements, or a reproducible counterexample. The reviewer resolves each defence on evidence and
  withdraws or reclassifies whatever it disproves. Silence is recorded and creates no agreement.
- **The reviewer holds five returns on one work unit.** Rounds are counted per dispatched node, not
  per candidate: a re-dispatch under a new commit continues the same count. The fifth return is the
  last the reviewer may issue on its own authority.
- **From the third return each return carries a convergence condition** — one sentence naming what
  remains unclosed and which evidence would close it. A return that cannot name that condition is an
  escalation, not another attempt.
- **A round carrying no new evidence on either side does not spend the budget; it escalates.**
  Repeating a finding without new material, or resubmitting a candidate whose evidence did not
  change, means the loop has stopped converging and further rounds only spend time.
- **After the fifth return the reviewer returns `ESCALATE` instead of `RETURN`.** That verdict carries
  what remains unclosed, which findings recurred across rounds, what each side last proved, and the
  reviewer's stated hypothesis for why the loop did not converge. `ACCEPT` remains available at every
  round, including the last.

When the Review gate lets the CTO accept the outcome itself, the CTO is the inspector and runs the
same loop against the author under the same five-return budget and the same journal. It has nobody
to escalate to: after the fifth return it takes one of the escalation outcomes below in that turn.

## Escalation: the CTO decides on the record

An escalated node reaches the CTO with the round journal, both roles' last reports, the final diff or
evidence package, and the reviewer's convergence condition. The CTO reads the exchange itself — what
was found, what was answered, what changed between rounds, whether the round scores moved as the
work changed, and whether the two sides were still arguing about the same fact. A flat score across
several rounds says the corrections are not reaching the problem; a score that climbs while the
findings repeat says the review has drifted from its anchors.

A node that arrived through a break condition rather than an exhausted budget is a different case:
resolve what broke — ratify or return the out-of-zone edit, reclassify the node, open the owner
gate, create the plan child, replace a compromised reviewer — and hand the node back to the loop
with the budget it had left. The bounded second budget is spent only after the five returns are.

Otherwise the CTO decides in that same turn among exactly these:

- **accept**, in any form this gate already defines: `ACCEPT`, `ACCEPT WITH CTO FIX`, or `ACCEPT WITH
  RESIDUE` under the residue rule;
- **grant a bounded second budget of two returns**, once per work unit, with an exact acceptance
  condition written into the node before the loop resumes;
- **assign an independent replacement reviewer**, in the rare cases below, working inside that same
  two-return budget;
- **split the node**, landing the settled part and moving the unresolved part into its own node with
  its own risk classification and acceptance;
- **name the gate and stop**, recording what blocks convergence and who must resolve it, as `BLOCKED`
  or a withdrawal.

A replacement reviewer is for what a second budget alone cannot settle: the two roles dispute a fact
neither can close on the evidence available; the review's independence is in doubt; author and
reviewer share a provider family and the disputed finding sits exactly where that costs most; or a
`Critical` invariant rests on a falsifier the author disputes. It creates no new budget, and its
first act is deriving the requirement from the contract, the specification and the code rather than
from either prior report.

Seven returns is the ceiling on one work unit — five inside the loop and two inside the granted
budget. Once the second budget is spent, the next CTO decision cannot be another round: accept,
accept with residue, split, or name the gate. A finding that fails the reversibility or detection
test cannot be accepted with residue at any round count; that node blocks or is withdrawn instead.

## What breaks the loop early

The loop runs without the CTO only while it stays inside the contract. Any of the following ends the
round immediately and hands the node to the CTO with the journal as it stands. The unspent budget is
preserved and remains available to whatever the CTO decides.

- A changed path outside the write zone that the return did not declare as the permitted additive
  edit, or any path in `No-touch`.
- A finding that changes the node's risk classification or maturity, requires an owner gate — push,
  deployment, money, schema, live mutation, an irreversible action — or disputes the contract itself
  rather than the work measured against it.
- A finding whose kind is not `outcome-defect`. An independent product defect or additional work
  belongs to a new plan node, and only the CTO writes the tree.
- Any signal that the exchange is being used to negotiate a verdict, weaken, skip or conceal an
  adverse check, select the other role's proof, or apply social pressure. Integration freezes, the
  record is preserved, and an independent replacement is assigned; never allege coordination without
  a reproducible message or action.
- A reviewer or author that is unavailable, errored, or no longer independent.

## Scoring each round

Every verdict the reviewer issues — `ACCEPT`, `RETURN`, or `ESCALATE` — carries a score on a ten-point
scale, written as the round marker `R<n>(<score>/10)`. The score answers one question: how good is
this work, judged at the contracted maturity, on the evidence in front of the reviewer.

Score two axes and report both:

- **Code** — does the change do what the contract requires, does it read like the surrounding code,
  does it hold the invariants its area already holds, and does it leave the tree in a state the next
  change can build on.
- **Work** — does the evidence discriminate, was the negative half observed, does the return match
  what the diff actually does, did the work stay inside its zone, and is the result reproducible
  from the report alone.

**The marker carries the lower of the two.** A clean implementation proved by a check that cannot
fail scores on its evidence, and a thoroughly evidenced change that ignores the conventions of the
area it edits scores on its code. For a report-only outcome the code axis reads as the answer
itself: its correctness, its completeness against the question asked, and whether its sources carry
the conclusion drawn from them.

The anchors are observable, not felt:

| Score | What it means |
| --- | --- |
| 9–10 | The contracted outcome is met, nothing above `minor` is open, and every load-bearing claim has an observed failing form and a stated blind spot. |
| 7–8 | The outcome is met with only `minor` findings open; one check is narrower than the claim it carries, or the configuration it ran in is a step away from the one the product reaches. |
| 5–6 | One `major` finding, or evidence that does not distinguish the defect it is offered against. The product probably behaves, but the proof does not establish it. |
| 3–4 | Several `major` findings, a false green, or a divergence from the contract at the declared maturity. |
| 1–2 | An open `blocker` in the contracted outcome, evidence that does not reproduce, or work that does not run. |

Four rules keep the number honest:

- **The score never decides the verdict.** An open `outcome-defect` blocker returns the work at any
  score, and its absence accepts the work at any score. A low score with no finding behind it is a
  defect in the review, not in the work.
- **Every score below 9 names its reason** in the same line — which finding, which missing proof,
  which convention. An accepted outcome scored below 8 says in one clause what stayed imperfect, so
  the number is never mute.
- **The scale does not move with the round.** Effort spent across five rounds earns nothing; the
  fifth round is scored against the same anchors as the first, and a score that rises without the
  work changing is a review that has started grading the author.
- **No strategy, urgency, or provider changes it.** `alpha` and `stable` change what is contracted,
  not what a seven means.

## The round journal

Each round leaves exactly one line in the dispatched node's `Review rounds` section: the round
number with its score, the verdict, the moment it was issued, the finding that carried it, what the
author answered with, and what changed —
`- R2(5/10) RETURN 25/08 14:20 — <finding> → <answer> → <what changed>`. An escalation adds one
decision line in the same shape: `- CTO bounded_retry 25/08 15:10 — <reason>`, naming the same
decision the node's `escalation_decision` field records.

The moment is `dd/mm hh:mm` in the machine's local time, taken when the verdict arrives rather than
when the line is written, and it is the only clock reading in the journal: durations are derived
from the sequence, never restated per line. Two adjacent moments show what a round actually cost,
which is what makes a stalled loop visible before the budget runs out.

The CTO writes those lines — workers never edit the tree — from the two roles' reports at each
handoff. The journal is what a later session, a replacement reviewer, and the escalation decision
are read from; the review dialogue itself stays in the reports and the evidence package and is never
copied into the file.

## Response and repair inside the loop

A response is owed whenever there is a blocker or major finding, a proposed return, a disputed scope
or contract, or a semantic CTO integration edit. A clean acceptance — delegated or CTO-performed —
requires none, and a ceremonial `AGREE` round is never inserted. The response and the authorized
correction are one turn: the author states its position on each finding and lands the rework the
return named, in the same node and write zone.

An author that disputes a finding does not correct it while disputing it; it answers with evidence
and waits for the reviewer to resolve the dispute. A new adverse finding discovered mid-round earns
its own round before final authorization.

Choose return versus CTO repair by severity, blast radius, depth, hot context, correction size,
acceptance cost, and collision risk. A CTO fix is small, obvious, bounded, separately visible,
rerun, and disclosed. Return deep, behavioural, architectural, cross-file, or uncertain work.

When several blocker or major findings are symptoms of one missing model, the author states that
shared ownership, lifecycle, serialization, or linearization model and its bounded acceptance matrix
before patching, inside the round it was asked in.

## Direct exchange between author and reviewer

The convergence loop runs on this channel. A fact that only one side holds is asked and answered
directly; routing the question through a decision maker delays the answer until the next reconcile.
Where the host gives workers no way to address each other, the CTO relays the return, the response,
and the corrected revision verbatim, adding no judgement of its own — relaying is transport, not
adjudication. The CTO remains the decision point at escalation, at a break condition, and at
integration, and audits the exchange at each material handoff and at the scheduled reconcile.

The channel carries facts and the loop's own material: the exact revision, range and bounded scope;
how to reproduce something, the command, and its real exit; which finding refers to which line, and
the evidence-based response to it; the verdict of the round and the correction it names. One
question, one answer. Do not restate what the contract, the report, or the diff already carries. Ask
when asking is cheaper than deriving the same fact from the code.

Four things the exchange never does:

- negotiate a verdict, an acceptance, or a classification outside the task contract;
- request that an adverse check or finding be skipped, weakened, concealed, or reclassified;
- let the author select or modify a reviewer-owned falsifier, or the reviewer modify the candidate
  or its acceptance evidence;
- apply pressure, urgency, praise, blame, or any other social framing to a verdict.

Independence of derivation does not change with the number of rounds: the reviewer derives what the
change must do from the contract, the specification and the code, in the fifth round exactly as in
the first. The exchange supplies facts, not the problem statement. Familiarity built over rounds is
not evidence, and neither side may accept the other's conclusion because the loop is long.

Record each exchange in one line in both the return and the review report — what was asked, what was
answered — and in the round journal at each handoff. On any signal of a breach, freeze integration,
preserve the record, and assign an independent replacement or tie-break reviewer; never allege
coordination without a reproducible message or action. A project may close this channel and route
every handoff through the CTO, but it may not widen it.

## Continuity across rounds

A `RETURN` starts bounded rework inside the same node. It does not reset valid review evidence,
restart the round count, or require a new review organization. For a report-only outcome, the
preserved author and reviewer continue against the same evidence package without a repository
fast-forward.

- Keep the originating author and independent reviewer, with their workspaces, for the whole loop.
  The same reviewer carries every round of one node by default.
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
  Depth still follows the classification: extra proofs added because the loop is long, rather than
  because a hypothesis is open, carry their reason in the record.
- Replace the reviewer only under a break condition or an escalation decision — unavailability, an
  error, compromised independence, a disputed finding needing a tie-break, or rework that materially
  expands scope, dependencies, or the threatened invariant.
- A node whose rounds keep resolving into new work rather than into a closed finding is a
  decomposition problem, not a review problem. Escalate it instead of spending the budget.

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
