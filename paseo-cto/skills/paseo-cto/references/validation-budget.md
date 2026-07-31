# Validation budget

Read this file before assigning acceptance commands and before any reviewer or CTO rerun.
Treat validation time as part of the critical path. The goal is decisive evidence with no duplicate
reassurance.

## Iteration mode

Use incremental compilation, targeted commands, and warm caches for small changes and rework loops.
Do not clear caches or request clean/no-cache builds by default. Use a cold build only to prove
artifact reproducibility, investigate a concrete cache-invalidation hypothesis, or satisfy an
explicit release gate.

## One owner per proof

Assign every command or proof to one primary role:

| Role | Default responsibility |
| --- | --- |
| Builder | Targeted tests, static checks, type/build checks, and negative cases for changed surfaces. |
| Routine second look | The inspection assigned by the Review gate. |
| Reviewer | Independent inspection and any falsifier assigned by the Review gate. |
| CTO | Final-range ancestry, integration-delta review, collision resolution, and checks invalidated by composition. |
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

A test harness is cheap, repeatable, and the easiest place to prove nothing at all. When the harness
assembles the request, supplies the credential, or fills in the value that product code would have
produced, it verifies the harness — and it will keep reporting success for as long as the product
path stays broken, across any number of runs and any amount of live infrastructure. Volume of
evidence does not correct this; every run shares the same substitution.

For any acceptance that concerns a boundary between two components — two services, two language
planes, product code and an external system, a client and the contract it calls — **at least one
accepted proof must travel the product's own path**, with the harness supplying no value that
product code would generate. The harness may observe, capture, and assert; it may not stand in for
a participant.

Harness-only evidence remains useful for iteration and for isolating a component's internals. It is
not sufficient acceptance for the boundary itself, and a card whose only evidence is harness-shaped
has not yet proven the thing it claims.

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

Security, privacy, authorization, corruption, and data-loss work keeps its safety floor, but still
uses this ladder: prove the risky boundary with a decisive negative case instead of automatically
running every unrelated suite.

## Contract and review behavior

Write one `Validation budget` line in every repository assignment. Name builder-owned commands, the
Review-gate owner and proof, integration checks, and the exact full-suite trigger. If the contract
lists a full suite, state why the trigger applies.

When a returned result is green, reviewers and the CTO first inspect its exact evidence. Rerun only
what changed during integration or what a concrete review hypothesis challenges. Record unrun
release checks as deferred to their named gate, not as missing atom evidence.
