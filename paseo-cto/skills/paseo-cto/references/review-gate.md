# CTO review gate

Read this file when a delegated write returns, before repository integration, external-design
acceptance, and any push.

## Mandatory review

The CTO personally reviews every delegated write after any reviewer or lead gate. Review is
deliberative: the CTO retains final integration authority, but a preliminary CTO opinion is not a
verdict and cannot bypass the originating agent's right of reply.

### Preliminary assessment

1. inspect the report and final workspace state; for repository work inspect the exact commit,
   ancestry, and diff; for design work inspect the exact project/paths, preconditions or returned
   versions, read-back, render reference, and byte-identical pre/post repository state;
2. rerun cheap acceptance and read risk-bearing code;
3. list evidenced `blocker`, `major`, or `minor` findings;
4. score the exact contract out of ten;
5. state a proposed `accept`, `accept with CTO fix`, or `return`, with reason;
6. mark the result `PRELIMINARY — NOT AUTHORIZED` and send the exact findings, evidence, score, and
   proposed action to the originating agent.

### Mandatory right of reply

Before every final verdict, give the originating agent one bounded response round. The agent replies
against the exact preliminary assessment with one of:

- `AGREE` — accepts the findings and proposed action;
- `PARTIAL` — identifies each accepted and defended finding;
- `DEFEND` — defends the solution against each disputed finding.

A defense cites specification, code, tests, measurements, or a reproducible counterexample. The
agent must not edit, recommit, or widen scope during this round unless the CTO separately authorizes
rework. Keep its agent and workspace available; do not integrate, apply a CTO fix, return for rework,
or archive while the response is unresolved.

The CTO evaluates every defended finding on its evidence, reruns a decisive bounded check when
needed, and withdraws or reclassifies any finding the response disproves. For every rejected defense,
the final record cites the decisive contrary evidence; authority alone is not a reason. Silence is
not agreement. If the originating agent is genuinely unavailable after one explicit follow-up and an
availability check, record `NO RESPONSE`, the attempted contact, and the reason, then use the safest
evidence-supported authorization. Mere elapsed time is not unavailability.

The final authorization must not introduce a new adverse finding that the agent had no opportunity
to answer. If the response or a decisive check reveals one, issue a revised preliminary assessment
and reopen only the affected finding before deciding it.

### Final authorization

Only after resolving the response does the CTO issue `FINAL AUTHORIZATION — ACCEPT`, `FINAL
AUTHORIZATION — ACCEPT WITH CTO FIX`, or `FINAL AUTHORIZATION — RETURN`, with the revised score and
finding dispositions. Then integrate accepted work and rerun the integration gate. The final
authorization is the CTO's decision; the response round is due process, not agent veto or consensus.

The score informs the owner; it never determines the verdict:

| Score | Meaning |
| --- | --- |
| `9–10` | Complete, well proven, no material defect. |
| `7–8` | Sound, with bounded shortcomings or minor follow-up. |
| `5–6` | Useful but materially incomplete, weakly proven, or substantially corrective. |
| `1–4` | Broken, unsafe, off-contract, or unsuitable. |

Choose return versus CTO repair by severity, blast radius, depth, hot context, correction/task size,
acceptance cost, and collision risk. Return deep, behavioral, architectural, cross-file, or uncertain
work when agent continuity helps. A CTO fix is small, obvious, bounded, separately committed,
rerun, and disclosed. Do not apply a CTO fix directly to an external design; return it to the
Claude Designer with an exact rework contract. Keep the originating agent/workspace active through
disputes or rework.

```text
PRELIMINARY — NOT AUTHORIZED — 7/10 — PROPOSED RETURN — <findings and evidence>
AGENT RESPONSE — PARTIAL — <accepted findings and evidence-backed defenses>
FINAL AUTHORIZATION — ACCEPT WITH CTO FIX — 8/10 — <each disposition and bounded fix>
```

Debate never widens scope. Safety and owner gates remain closed during the response round.

## Evidence, integration, and external gates

- Preserve real exits; a pipe or trailing diagnostic must not mask failure.
- Preserve archive-worthy evidence through a commit, approved artifact store, exact external object
  version/render reference, or concise CTO checkpoint/verdict. Leave no tracked, untracked, or
  temporary external-design tail.
- Prove generated/deployed artifact ancestry and serialize live changes against evidence runs.
- Treat shared-tree contamination as failure; preserve dirty or unintegrated work for diagnosis.

Integrate reviewed commits only into a clean CTO tree. Verify ancestry, resolve collisions
deliberately, run the project gate, and update the plan in the appropriate local integration commit.
For an accepted design, verify the returned external version still matches the reviewed read-back and
render, then update plan truth without copying generated design source into the repository unless a
separate contract requires it.
Implementation ends locally. Push, deploy, publication, live mutation, paid work, schema operations,
and irreversible actions each remain a separate explicit owner/project gate. Before push, inspect
and review every commit in `<upstream>..HEAD` and its evidence.
