# Validation budget

Read this file before assigning acceptance commands and before any reviewer or CTO rerun.
Treat validation time as part of the critical path. The goal is decisive evidence with no duplicate
reassurance.

## Iteration mode

Use incremental compilation, targeted commands, and warm caches for small changes and rework loops.
Do not clear caches or request clean/no-cache builds by default. Use a cold build only to prove
artifact reproducibility, investigate a concrete cache-invalidation hypothesis, or satisfy an
explicit release gate.

Before an expensive full suite on an integrated tree, derive the touched surfaces from the exact
integration range and run the cheapest existing repository checks whose inventories or dependency
graphs cover those surfaces. This composition preflight runs after integration, not only in the
writer workspace. If it fails, attribute and correct that failure before spending the full-suite
budget. Once the preflight passes, run the full suite once at its named gate; do not use the full
suite to discover a failure a changed-path check could have named first.

## One owner per proof

Assign every command or proof to one primary role:

| Role | Default responsibility |
| --- | --- |
| Builder | Targeted tests, static checks, type/build checks, and negative cases for changed surfaces. |
| Researcher | Primary-source verification, explicit unknowns, and one counterexample for every load-bearing conclusion. |
| Routine second look | The inspection assigned by the Review gate. |
| Reviewer | Independent inspection of the returned outcome and any falsifier assigned by the Review gate. |
| CTO | Final-range ancestry, collision resolution, checks invalidated by composition, and dispatching the integration-delta review. |
| Release gate | Full repository, end-to-end, deployment, migration, or production-like suites. |

Do not copy the same green command set across roles. After verifying the exact commit, command,
environment, exit, and durable result, reuse that evidence. A fresh role or review round alone does
not invalidate it.

## Rework budget

Rework preserves proof ownership. The builder reruns only checks invalidated by its correction and
adds regressions for accepted findings. The same reviewer normally inspects the complete correction
delta in context and reruns its existing independently selected falsifier when the hypothesis still
applies. A new reviewer, a distinct falsifier, a full-range reread from zero, or another full green
suite needs one of the explicit invalidation or replacement conditions in the Review gate; the fact
that `HEAD` changed is not enough by itself.

## At least one proof travels the product's own path

When the harness assembles the request, supplies the credential, or fills in a value product code
would have produced, it verifies the harness. It keeps reporting success for as long as the product
path stays broken, and volume of evidence does not correct this: every run shares the same
substitution.

For any acceptance that concerns a boundary between two components — two services, two language
planes, product code and an external system, a client and the contract it calls — **at least one
accepted proof must travel the product's own path**, with the harness supplying no value that
product code would generate. The harness may observe, capture, and assert; it may not stand in for
a participant.

Harness-only evidence remains useful for iteration and for isolating a component's internals. It is
not sufficient acceptance for the boundary itself, and a card whose only evidence is harness-shaped
has not yet proven the thing it claims.

### The harness assembles what the product assembles

The same failure has a second form in which nothing is substituted: the harness wires the components
differently from the running system. A guard the product installs but the harness omits, a
privileged connection where production uses an ordinary one, or a client built by a shortcut the
daemon does not use each leaves every check green while the property under test is absent.

**A card that constrains how the system is assembled must be proved on the assembly the product
uses.** Compare the harness against the production wiring line by line, not against its description.
Where no such harness exists, building one is part of the card.

**When the product path genuinely cannot be run** — the environment does not exist yet, the external
system is unavailable, or exercising it would mutate something owner-gated — the rule does not
dissolve; it defers, visibly:

1. State in the card which participant the harness stood in for, and what that substitution could
   hide. "The harness built the request" is the finding, not a footnote.
2. Land the card as `ACCEPT WITH RESIDUE` under the [Review gate](review-gate.md), with the
   product-path proof as the residue and its return condition the event that makes the path runnable
   — the environment existing, the gate opening, the dependency shipping.
3. Apply the residue tests first. A boundary whose failure is irreversible or silent — an
   authorization path, a payment, a data-destroying operation — does not qualify: it blocks on the
   missing environment rather than landing on harness evidence.

What is not permitted is passing harness evidence off as boundary acceptance without saying so.
A substitution that is written down is a known gap with a trigger; the same substitution unmentioned
is the defect this rule exists to catch, and it reads as proof until production disagrees.

## Escalation ladder

Start with the smallest check able to falsify the change:

1. inspect the diff and affected contract;
2. run a focused unit, conformance, static, type, or build check;
3. add one bounded negative or integration check for the identified boundary;
4. expand only after a failure, contradictory evidence, changed dependency surface, or new
   falsifiable hypothesis.

Run a full suite only when at least one condition holds:

- the plan explicitly makes it the atom's acceptance gate;
- several complex accepted changes are being merged and need one combined-tree proof;
- an epic/wave closes;
- a release, deploy, schema/data operation, or production-like exercise is next;
- the change is genuinely cross-cutting and focused checks cannot bound its dependency surface;
- prior full-suite evidence is absent, stale for the exact tree, contradictory, or red.

The negative half belongs to each load-bearing acceptance claim, not to every command that happens
to support it. One mutation, fault, or counterexample may distinguish several commands that prove
the same claim. A standard compiler, linter, formatter, or unchanged upstream suite does not need
its own artificial mutation unless that check is being introduced or changed, or it is the primary
proof of a new invariant. Prefer an existing maintained negative suite over constructing a new
one-off mutation with the same shape.

Security, privacy, authorization, corruption, and data-loss work keeps its safety floor, but still
uses this ladder: prove the risky boundary with a decisive negative case instead of automatically
running every unrelated suite.

## Contract and review behavior

Write one `Validation budget` line in every repository assignment. Name builder-owned commands, the
Review-gate owner and proof, the combined-tree composition preflight, integration checks, and the
exact full-suite trigger. If the contract lists a full suite, state why the trigger applies.

When a returned result is green, reviewers and the CTO first inspect its exact evidence. Repository
files and commits in that evidence follow [Source references](source-references.md). Rerun only what
changed during integration or what a concrete review hypothesis challenges. Record unrun release
checks as deferred to their named gate, not as missing atom evidence.
