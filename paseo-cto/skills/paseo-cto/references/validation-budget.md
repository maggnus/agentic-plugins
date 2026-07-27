# Validation budget

Read this file before assigning acceptance commands and before any reviewer, lead, or CTO rerun.
Treat validation time as part of the critical path. The goal is decisive evidence with no duplicate
reassurance.

## One owner per proof

Assign every command or proof to one primary role:

| Role | Default responsibility |
| --- | --- |
| Builder | Targeted tests, static checks, type/build checks, and negative cases for changed surfaces. |
| Reviewer | Diff and static inspection plus the cheapest independent falsifier for a concrete risk. |
| Lead / CTO | Ancestry, patch identity, collision resolution, and checks invalidated by composition. |
| Release gate | Full repository, end-to-end, deployment, migration, or production-like suites. |

Do not copy the same green command set across roles. After verifying the exact commit, command,
environment, exit, and durable result, reuse that evidence. A fresh role or review round alone does
not invalidate it.

## Escalation ladder

Start with the smallest check able to falsify the change:

1. inspect the diff and affected contract;
2. run a focused unit, conformance, static, type, or build check;
3. add one bounded negative or integration check for the identified boundary;
4. expand only after a failure, contradictory evidence, changed dependency surface, or new
   falsifiable hypothesis.

Run a full suite only when at least one condition holds:

- the plan explicitly makes it the atom's acceptance gate;
- an epic/wave closes;
- a release, deploy, schema/data operation, or production-like exercise is next;
- the change is genuinely cross-cutting and focused checks cannot bound its dependency surface;
- prior full-suite evidence is absent, stale for the exact tree, contradictory, or red.

Security, privacy, authorization, corruption, and data-loss work keeps its safety floor, but still
uses this ladder: prove the risky boundary with a decisive negative case instead of automatically
running every unrelated suite.

## Contract and review behavior

Write one `Validation budget` line in every repository assignment. Name builder-owned commands,
reviewer-only falsifiers, integration checks, and the exact full-suite trigger. If the contract
lists a full suite, state why the trigger applies.

When a returned result is green, reviewers and the CTO first inspect its exact evidence. Rerun only
what changed during integration or what a concrete review hypothesis challenges. Record unrun
release checks as deferred to their named gate, not as missing atom evidence.
