# CTO review gate

Read this file when a delegated write returns, before integration, and before any push.

## Mandatory review

The CTO personally reviews every delegated write after any reviewer or lead gate:

1. inspect the report, exact commit, ancestry, diff, and final workspace state;
2. rerun cheap acceptance and read risk-bearing code;
3. list evidenced `blocker`, `major`, or `minor` findings;
4. score the exact contract out of ten;
5. independently choose `accept`, `accept with CTO fix`, or `return`, with reason;
6. integrate accepted work and rerun the integration gate.

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
rerun, and disclosed. Keep the originating agent/workspace active through disputes or rework.

```text
ACCEPT — 8/10 — <reason>
ACCEPT WITH CTO FIX — 6/10 — <small fix and rerun proof>
RETURN — 7/10 — <why the originating agent should rework it>
```

An agent may accept or rebut a finding with specification, code, test, or measurement evidence. The
CTO revises disproved findings honestly; if evidence remains ambiguous, the CTO records the final
decision. Debate never widens scope.

## Evidence, integration, and external gates

- Preserve real exits; a pipe or trailing diagnostic must not mask failure.
- Preserve archive-worthy evidence through a commit, approved artifact store, or concise CTO
  checkpoint/verdict. Leave no tracked or untracked disposable tail.
- Prove generated/deployed artifact ancestry and serialize live changes against evidence runs.
- Treat shared-tree contamination as failure; preserve dirty or unintegrated work for diagnosis.

Integrate reviewed commits only into a clean CTO tree. Verify ancestry, resolve collisions
deliberately, run the project gate, and update the plan in the appropriate local integration commit.
Implementation ends locally. Push, deploy, publication, live mutation, paid work, schema operations,
and irreversible actions each remain a separate explicit owner/project gate. Before push, inspect
and review every commit in `<upstream>..HEAD` and its evidence.
