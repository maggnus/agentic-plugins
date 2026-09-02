# Review gate

Read this file when a delegated write returns, when a CTO integration fix changes semantics, or
when a report-only result is proposed as closure, authorization for a `Critical` card, or an
owner-gate decision. Intermediate research that only narrows the next contract is source-checked by
the CTO and gets no separate review. Ordinary work-tree and contract edits get no per-edit review.

## Who inspects, by risk and by charter

The charter's `reviewDepth` chooses one column. `standard` is the default; `risk-based` is its
older name, `every-write` is the older name of `strict`.

| Risk | `lean` | `standard` | `strict` |
| --- | --- | --- | --- |
| `Routine` | CTO glance | CTO glance | non-author reviewer, reading depth |
| `Significant` | CTO look | non-author reviewer, one falsifier | non-author reviewer, one falsifier |
| `Critical` | independent reviewer, executable proof | same | same |

- **CTO glance** — five minutes on the return, not on the code: the return is complete in the
  contract's structure, every `CHECKS` line carries a real result, each load-bearing claim has its
  negative half under `FALSIFIERS`, `UNVERIFIED` is honest, `git diff --stat` stays inside the write
  zone and touches no `No-touch` path. Accept, or return the one gap. No falsifier, no reproduction.
- **CTO look** — the glance plus the complete diff read against the task file and the captured
  evidence, and one falsifier only when that reading leaves a concrete hypothesis open. Fifteen
  minutes is the budget; a look that needs more is a reviewer dispatch, whatever the column says.
- **Non-author reviewer** — a separate agent reads the complete diff and the captured evidence,
  reruns nothing already green, and runs at most one independently selected falsifier of a
  different shape than the author's evidence, at the cheapest level that discriminates it. A change
  that cannot alter product behaviour — tests, documentation, configuration, generated files — is
  inspected at reading depth even at `Significant`.
- **Independent reviewer** — a non-author reviewer from a different provider family whenever the
  catalog allows, with at least one executable falsifier, fault injection, conflicting primary
  source or bounded counterexample against the threatened invariant. A maintained negative suite
  counts only when it demonstrably distinguishes the defect.

Whoever inspects also walks the consumer surface when the card changed one (below). Several
homogeneous siblings share one inspection at the highest classification among them, and its
evidence must close each node individually. A change the CTO authored is inspected by a non-author
reviewer at any risk. Nothing the CTO writes into a project lowers the `Critical` row: authentication,
authorization, tenant isolation, privacy and secrets, data loss and corruption, distributed
consistency, public compatibility and irreversible actions keep that floor under every charter.

## Risk classification

Classify by the credible consequence of a defect, never by file type, subsystem, diff size or
mechanism:

- `Routine` — the worst credible failure is local, quickly detectable, reversible, and cannot
  violate a critical product invariant.
- `Significant` — behaviour changes materially, but credible damage stays bounded, observable and
  reversible.
- `Critical` — a realistic defect could directly violate one of the invariants named above.

Auth, protocol, migration, storage and deployment surfaces trigger an explicit classification check;
they do not automatically make a card `Critical`. Uncertainty prevents `Routine` but never creates
`Critical` by itself. Crossing subsystems or changing shared components, dependencies or build and
test infrastructure raises a card to at least `Significant` unless the diff is mechanically bounded.
A correction is classified by its own consequence, not inherited from its parent card: a comment,
inventory or generated-file repair may land at `Routine` under a `Critical` card, provided it cannot
alter behaviour or weaken the critical proof.

## Judge at the contracted maturity

Every card carries a maturity level named in the assignment: `RESEARCH` (a verified answer),
`DESIGN` (a working model), `BUILD` (a specified contract realized), `OPERATIONALIZATION` (a
procedure proved executable by a real operator in the real environment). An assumption invalidated
during research or design is a result, not a defect. Return work only when it fails the outcome
promised at its maturity.

Depth surfaces neighbouring problems and no card carries everything found next to it. Every
finding has exactly one kind, stated beside it, and no landing decision uses a finding whose kind
is unstated:

- `outcome-defect` — a defect in this card's contracted outcome; the only kind that can return it;
- `hypothesis-refinement` — recorded as a result;
- `independent-defect` — a proposed plan child, reported precisely and left unfixed;
- `additional-work` — a separate card, never absorbed;
- `measurement-gaming` — the author changed how a claim is measured rather than what the product
  does (a tightened limit, a fixture pinned to current output, a viewport stretched before the
  reading). It is an `outcome-defect` in the proof; its second occurrence against one author on one
  node stops the loop and the node is reassigned to another author.

## A proof must be able to fail

A check that cannot fail proves nothing until production disagrees: a condition no input violates,
a script comparing a subset against itself, a fixture pinned to current output, a suite exercising a
configuration the product never reaches. For every load-bearing claim require the negative half
with its captured failing output, a statement of what the check catches and what it would pass, and
an argument that the configuration it ran in is one the product reaches. Several commands proving
one claim share one negative half; unchanged compiler, formatter, linter and upstream-suite commands
need no ceremonial mutation. This is a property of the evidence and costs the author one broken
input and one sentence; discovering it at review costs a round.

For any boundary between two components, at least one accepted proof travels the product's own
path, with the harness supplying no value product code would generate and assembling nothing
differently from the running system. When the product path genuinely cannot run, the substitution
is written into the card and the node lands with residue whose return condition is the event that
makes the path runnable — never on an irreversible or silent boundary, which blocks instead.

## Landing decisions

The inspector — reviewer or CTO — chooses `ACCEPT`, `RETURN` or `ESCALATE`. The CTO alone lands:
`ACCEPT`, `ACCEPT WITH CTO FIX` (a small, obvious, bounded, separately visible, rerun and disclosed
fix), `ACCEPT WITH RESIDUE`, `RETURN`, `ESCALATE`, `BLOCKED`. A clean acceptance needs no response
round; a `RETURN` goes to the author as the correction it names.

`ACCEPT WITH RESIDUE` lands work whose contracted outcome is met while a real finding only improves
the proof. It requires the residue written where the project will find it — the node's
`Residuals` with `deliberate_partial: true` and an exact `return_trigger`, or its own node when the
unachieved part is independent work — and it is forbidden when the finding fails either test:
**reversibility** (could the worst failure be undone once noticed) or **detection** (would it
announce itself). The `Critical` invariants fail both routinely; when in doubt, the card returns.

## The convergence loop

A returned card is finished by the author and the inspector converging on evidence, not by a
verdict. Inside the loop the CTO adjudicates nothing: it relays material verbatim where workers
cannot address each other, writes the round journal, and watches for break conditions. When the CTO
is itself the inspector, it holds the same two returns under the same rules and does not grant
itself a budget: its third look is an independent reviewer's.

- A return authorizes the rework it names and nothing else, inside the same node, zone and
  contract; no separate rework contract per round.
- One round is one return and one corrected candidate. The author answers every finding with
  evidence; the inspector resolves each defence on evidence and withdraws what it disproves. Silence
  is recorded and creates no agreement.
- The inspector holds two returns on one work unit, counted per node, not per candidate; a
  re-dispatch under a new commit continues the count. The second return carries a convergence
  condition — what remains unclosed and which evidence closes it. A round with no new evidence on
  either side spends nothing and escalates.
- After the second return the verdict is `ESCALATE`: what is unclosed, which findings recurred,
  what each side last proved, and why the loop did not converge. `ACCEPT` stays available in every
  round; rounds spent are not quality earned.
- The exchange carries facts — revision, reproduction, exit, which finding refers to which line —
  and never negotiates a verdict, asks for an adverse check to be skipped or weakened, lets the
  author touch a reviewer-owned falsifier, or applies pressure. A breach freezes integration,
  preserves the record and brings a replacement reviewer; never allege coordination without a
  reproducible message.
- Keep the same author and inspector, with their workspaces, for the whole loop. Advance a clean
  reviewer branch only by verified conflict-free fast-forward from the recorded reviewed head;
  replace the workspace when that is impossible. Unchanged material is not reread; the correction
  delta and its affected context are. A reviewer-selected falsifier stays selected and reruns on
  the corrected revision when its hypothesis still applies; a new proof needs a new hypothesis.

**Break conditions** end the round at once and hand the node to the CTO with the journal and the
unspent budget: an undeclared path outside the write zone or in `No-touch`; a finding that changes
risk or maturity, needs an owner gate, or disputes the contract; a finding that is not an
`outcome-defect`; any negotiation signal; a lost, errored or no longer independent participant; a
second `measurement-gaming` finding. The CTO resolves what broke — ratifies or returns the edit,
reclassifies, opens the gate, creates the child, replaces the reviewer — and hands the node back.

**Escalation** reaches the CTO with the journal, both last reports, the final diff or package and
the convergence condition. Read the exchange: whether the scores moved as the work changed, whether
both sides still argue the same fact. Decide in that turn among exactly the schema's vocabulary —
`bounded_retry` (two more returns, once per node, with an exact acceptance condition written into
the node), `independent_review` (a replacement reviewer from a third family when the catalog allows,
inside that same budget), `accept_with_corrections`, `split`, `stop`. Only the first two extend the
loop; the ledger refuses anything else. **Four returns is the ceiling on one work unit**; after the
granted budget the next decision is never another round. A finding that fails reversibility or
detection cannot be accepted with residue at any round count.

A node whose rounds keep resolving into new work rather than into a closed finding is a
decomposition problem; escalate it instead of spending the budget.

## The delta re-review

An `ACCEPT` that named corrections to make before merge, or a `RETURN` whose findings were all
about the proof, takes the short path: the same inspector reads only the range from the previously
reviewed candidate against the findings that produced it, answers in 300 characters, and the earlier
verdict on unchanged material stands. It is journalled as a round but spends no return unless it
finds a new `outcome-defect`, at which point the full protocol resumes. It never substitutes for a
first inspection or covers scope the earlier review never saw.

## The pre-dispatch contract check

A contract naming a section, export, component or mechanism that does not exist costs a round. A
non-author reviewer attacks the contract in five minutes — does every named mechanism exist at that
path and name; are references correct as written; does anything close by convention; is every
acceptance claim falsifiable; does the write zone overlap a running task — and answers `ACCEPT` or
`RETURN` in one line. It is required for `Critical` and for any node whose write zone touches shared
infrastructure — build and test tooling, a shared configuration, a schema, a canonical contract, a
stand another task uses. The charter's `contractCheck` may add `significant` and `routine`; it
creates no journal round.

## Review the surface the consumer meets

A diff says what the code does, not what the consumer receives. On a card that changes a product
surface — an HTTP or gRPC API, a CLI, a TUI, a web or mobile interface, an SDK, an event stream, a
job's output, a configuration contract — the inspection includes walking that surface as its
consumer does, in an environment the product reaches, never against a fixture. The first vertical
slice of a wave always gets the walk, whatever its risk; afterwards it follows risk: a
`Significant` or higher change to the surface, its error or permission behaviour, or a contract a
consumer depends on. It adds no agent: whoever inspects the card walks, and one walk covers batched
siblings on the same surface.

Six questions in order; the first that fails is the finding: does the scenario reach its result;
what happens at the edges (empty, one, many, slow, partial, unauthorized, repeated, concurrent,
malformed, dependency missing); what does the path cost against the minimum; does a failure explain
itself; is it consistent with the surface's conventions and neighbouring paths; is the consumer
better off. A finding carries the exact call, the real response and a reproduction; an impression is
not a finding. The walk widens nothing: a broken contracted scenario is an `outcome-defect`, a rough
edge the card never promised is `independent-defect` or `additional-work`.

## Scoring each round

Every verdict carries a score on a ten-point scale in the round marker `R<n>(<score>/10)` — how
good is this work, judged at the contracted maturity, on the evidence in front of the inspector.
Score **code** (does what the contract requires, reads like its surroundings, holds the area's
invariants, leaves the tree buildable), **work** (evidence discriminates, negative half observed,
return matches the diff, stayed in zone, reproducible from the report), and **experience** whenever
a surface was walked (scenario reaches its result, edges behave, path cost, failures explain
themselves, consumer better off); otherwise experience is `n/a`. For a report-only outcome the code
axis is the answer itself. **The marker carries the lowest axis that applies.**

| Score | Anchor |
| --- | --- |
| 9–10 | Outcome met, nothing above `minor` open, every load-bearing claim has an observed failing form and a stated blind spot; a walked scenario reaches its result and failures explain themselves. |
| 7–8 | Outcome met with `minor` findings; one check narrower than its claim or a step away from the configuration the product reaches; a path that works with avoidable cost. |
| 5–6 | One `major`, or evidence that does not distinguish the defect it is offered against; an edge misbehaves or a failure gives nothing to act on. |
| 3–4 | Several `major`, a false green, or divergence from the contract at its maturity; the result is reachable only along a path the consumer would not find. |
| 1–2 | An open `blocker` in the outcome, evidence that does not reproduce, work that does not run; the scenario does not complete. |

The score never decides the verdict: an open `outcome-defect` blocker returns at any score and its
absence accepts at any score. Every score below 9 names its reason in the same line, and an
acceptance below 8 says in one clause what stayed imperfect. The scale does not move with the round
or with strategy, urgency or provider.

## The round journal

Each round leaves exactly one line in the node's `Review rounds` section, written by the ledger from
the two reports: `- R2(5/10) RETURN 25/08 14:20 — <finding> → <answer> → <what changed>`. An
escalation adds `- CTO bounded_retry 25/08 15:10 — <reason>`, naming the same value as
`escalation_decision`. The moment is local `dd/mm hh:mm` when the verdict arrived and the only clock
reading in the journal; two adjacent moments show what a round cost. The dialogue itself stays in
the reports and the evidence package. A CTO glance or look that returns is journalled the same way.

## Integration delta and durable evidence

Integrate only into a clean CTO tree. If the accepted range applies without manual edits and its
dependency surface is unchanged, reuse its final-revision evidence; if a conflict resolution,
integration edit or changed dependency surface alters the result, inspect that delta at the node's
depth and rerun what it may invalidate. Inspect every commit in `<upstream>..HEAD` before push.

Durable evidence is the derivation, not the haul: what ran, its exit, the values that decide the
claim, and a way to re-derive them on the exact revision, all as commit-pinned links under
[Source references](source-references.md). Raw captures stay only where a claim is otherwise
unreproducible; money, tenant isolation, the sandbox boundary and irreversible operations keep their
complete package. Shared-tree contamination is failure; dirty or unintegrated work is preserved for
diagnosis. Implementation ends locally; push and everything beyond it are owner gates.
