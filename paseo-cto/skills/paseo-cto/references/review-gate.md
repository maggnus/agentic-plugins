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
5. choose `ACCEPT`, `ACCEPT WITH CTO FIX`, `RETURN`, or `BLOCKED`.

Numerical scores are not used.

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
