# Practical evaluation

Status: in progress, 2026-10-03. The evaluated claim is bounded workflow and decision feasibility. Comparative acceleration, optimal concurrency, longitudinal architecture quality and giant-codebase capability are not measured by this pilot.

## Protocol

The small case is a command-line CSV importer with a specified atomic batch contract. A fresh independent evaluator receives the skill source, application, contract and author report without the expected verdict or proposed correction. It must assess actual behavior without changing implementation. A returned implementation is corrected and independently reassessed against the same criteria.

The larger case is an isolated public Django checkout, revision `7847227a3fecde4b2a169552b84c60c6286b6025`, under its BSD license. Measured Python source: 907 production files / 165617 lines and 2011 test files / 357506 lines. The bounded trial adds an optional keyword-only length constraint to one text utility while preserving existing consumers, Unicode and lazy behavior. Allowed changes are the implementation, existing tests and reference documentation. This tests a shared utility in a substantial existing repository, not whole-system or giant-system understanding.

Source validation reads the packaged instruction directly; it does not install or register a local plugin. Native installation tests use only the subsequently published immutable GitHub tag. Model and host settings are retained; agent count and permissions are bounded per case. Failed attempts are recorded rather than excluded.

## Observations

| Experiment | Observation | Scope of conclusion |
| --- | --- | --- |
| Independent small-application acceptance | Existing unittest exits 0; independent assessment returns `RETURN`. Fourteen scenarios were exercised; six violated the contract, grouped into atomicity and invalid-input status findings | The review instruction distinguishes test success from contracted behavior in this example |
| Root reproduction | Two reported atomicity failures independently reproduced through the CLI, each exiting 2 while modifying state | The principal finding matches observed application state |
| Correction | Corrected unittest exits 0; the same new checks on the original implementation exit 1 | The regression checks distinguish the identified defects |
| Reassessment | `ACCEPT` on corrected revision; 17 independently exercised scenarios passed. Filesystem interruption is recorded separately | Input-rejection defects closed under the unchanged contract; crash/concurrency durability is not established |
| Native larger-system trial | Three permitted files changed; 34 targeted tests passed. Broader consumer suite: 1171 run, 20 skipped, exit 0; four documentation examples passed | Bounded implementation and local verification completed; no upstream delivery or whole-system claim |
| Independent package assessment | `gpt-6-luna` returned `ACCEPT`; `npm test`, fixture reproduction and staged diff checks passed | Structural constraints, source claims and release preparation were assessed; published installation remains a separate check |
| Native Claude Code execution | Command exits 1; the service reports that the account cannot use Claude Code; model usage and cost are zero | Application or skill behavior was not exercised on this host; runtime verification remains unavailable |

Initial application source and contract are in [the fixture](../evals/importer/CONTRACT.md). Selected observations are in [review evidence](evidence/importer-review.json) [correction evidence](evidence/importer-correction.json), [reassessment](evidence/importer-accepted.json), and [larger-system evidence](evidence/django-trial.json). The larger trial contract and licensed patch are in `evals/django/`. Complete local transcripts are retained separately from the distributed operational instruction.

## Interpretation

The returning review supports one decision mechanism; it is not a success-rate estimate. The correction test measures regression discrimination, not autonomous productivity. The larger trial was assessed through the complete patch, scoped files, recorded checks and an independently repeated targeted run. The result remains an uncommitted patch with a SHA-256 identity, rather than a fabricated result commit.

Different tasks, hosts and executors in this pilot cannot support a causal comparison. No speedup percentage is reported. A comparative protocol would require common tasks and starting revisions, controlled context and budgets, randomized order, repeats, all failed and unfinished runs, and independent acceptance. A longitudinal sequence must assess subsequent change cost, coupling and duplication. A genuine giant repository and nonlocal consumers are required before claiming that scale.

## Platform verification

Both platform manifests and shared skill structure are checked from source. Publication, immutable-tag installation, component discovery and a Codex runtime invocation are pending. Claude Code runtime invocation requires an authorized account with model access; packaging and installation checks do not substitute for it.

Agent token accounting is retained as reported. Exact resolved model identity and complete elapsed time were not captured, limiting reproducibility of agent behavior and preventing a productivity comparison. The reported partial cycle time is not used as time-to-acceptance.
