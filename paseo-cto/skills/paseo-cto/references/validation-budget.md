# Validation budget

Read this file before assigning acceptance commands and before any reviewer or CTO rerun.
Validation time is critical-path time; the goal is decisive evidence with no duplicate reassurance.

## Check what this change can break, and nothing else

A suite that runs because it always runs is a habit with a build time. Derive the blast radius from
the change — the paths the diff touches, the components that consume them, the contracts they
publish, the environments those contracts meet — and pick the checks that distinguish a defect in
that set. Name the affected surfaces before naming commands; a check that cannot name the defect
class it distinguishes does not enter the budget; prefer the check nearest the change that can
still fail for the right reason; green on code the change cannot reach measures the suite, not the
change. Cross-cutting changes — a shared component, a schema, build or test infrastructure — have a
wide radius by nature, and widening the set there is deriving it correctly.

## Run a check while it can still change a decision

Put the check that could invalidate the approach before the work that depends on it: a contract, a
boundary, a permission model, a migration path and a consumer path are cheapest to disprove at the
first vertical slice. A check ordered after the decision it informs is ceremony. Release-shaped
checks stay at the release gate, but when a defect class only the full suite would catch is
plausible in this change, buy the smallest early check that discriminates it. Never re-time a green
command to look diligent; state the earlier run, its revision and its result.

## Iteration mode and the composition preflight

Use incremental compilation, targeted commands and warm caches for small changes and rework. A cold
build proves artifact reproducibility, investigates a cache hypothesis, or satisfies a release gate
— nothing else. Before an expensive full suite on an integrated tree, derive the touched surfaces
from the exact integration range and run the cheapest repository checks covering them; this
composition preflight runs after integration, not only in the writer's workspace. Once it passes,
run the full suite once at its named gate.

## End-to-end runs are rationed

An end-to-end run is the most expensive evidence and the least discriminating per minute. It is
admitted only when the defect is observable **solely** on the consumer surface; everything provable
at unit or component level is proven there, including every negative half — the rule that a proof
must be able to fail does not relax, it moves to the cheapest level that still distinguishes the
defect. One scenario per task, desktop only unless the outcome is about mobile. No route, surface
or theme matrices. No screenshot matrices: screenshots exist for owner approval of an interface
change, as one set of the changed surface captured once. The reviewer does not rerun the author's
end-to-end pass; it reads the captured logs and exit lines and runs at most one falsifier. Lint and
type checks run per touched package; the fast composite check runs once before return, not per
edit. A negative half is never bought with a repeated full run; it belongs to each load-bearing claim, not to every command that supports it. A contract listing end-to-end passes
on two form factors, screenshots in both themes and negative halves obtained by rerunning, without
a stated reason for each, is a planning defect corrected before the agent starts.

## One owner per proof

| Role | Default responsibility |
| --- | --- |
| Builder | Targeted tests, static checks, type and build checks, negative cases for changed surfaces, and every cheap repository gate whose inventory covers the write zone; a gate deferred to the wave-closing suite fails there once per task that skipped it. |
| Researcher | Primary-source verification, explicit unknowns, one counterexample per load-bearing conclusion. |
| Inspector (reviewer or CTO) | Independent inspection of the returned outcome, the falsifier the Review gate assigns, and the consumer-path walk when the card changed a product surface. |
| CTO | Final-range ancestry, collision resolution, checks invalidated by composition, the integration-delta inspection. |
| Release gate | Full repository, end-to-end, deployment, migration or production-like suites. |

Do not copy a green command set across roles; after verifying the exact commit, command,
environment, exit and durable result, reuse it. Rework preserves ownership: the builder reruns only
what its correction invalidated and adds regressions for accepted findings; the same inspector
reads the correction delta and reruns its existing falsifier when the hypothesis still applies. A
new reviewer, a distinct falsifier, a full reread or another full suite needs an explicit
invalidation or replacement condition from the Review gate; a changed `HEAD` alone is not one.

## The ladder

Start with the smallest check able to falsify the change: inspect the diff and affected contract;
run a focused unit, conformance, static, type or build check; add one bounded negative or
integration check for the identified boundary; expand only after a failure, contradictory
evidence, a changed dependency surface or a new falsifiable hypothesis. Run a full suite only when
the plan makes it the atom's gate, several complex changes merge and need one combined-tree proof,
a wave closes, a release, deploy, schema or production-like exercise is next, the change is
genuinely cross-cutting, or prior full-suite evidence is absent, stale, contradictory or red.
Security, privacy, authorization, corruption and data-loss work keeps its floor and still uses this
ladder: prove the risky boundary with a decisive negative case rather than every unrelated suite.

## Contract behaviour

Write one `Validation budget` line in every repository assignment: the affected surfaces, the
builder-owned commands, the inspection depth and its proof, the composition preflight, the
integration checks, the exact full-suite trigger and the reason it applies. When a returned result
is green, inspect its exact evidence first; rerun only what changed during integration or what a
concrete hypothesis challenges. Record unrun release checks as deferred to their named gate.
