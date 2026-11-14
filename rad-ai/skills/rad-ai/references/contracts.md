# Records

## Project layout

If a repository already defines its own project documents, task records or board, use them without duplication. Otherwise keep records under `docs/rad/`:

- `docs/rad/PROJECT.md` - product claim in one sentence, consumer and task, explicit refusals, invariant registry, decision records (context, choice, cost, rejected alternatives), ordered stages (`W1`, `W2`, ...) and project commands. Authority order: owner and decision records -> product requirements and invariants -> stage contracts -> current code.
- `docs/rad/<stage>/stage.json` - current stage tasks and decisions for status reporting.
- `docs/rad/<stage>/acceptance.json` - stage acceptance list.
- `docs/rad/<stage>/outcomes/<id>.md` and `<id>-review.json` - per-outcome contract, submission summary and review record.

A bounded fix in an established codebase requires only the existing repository documentation and its outcome contract.

## Acceptance list

`acceptance.json` records every observable behavior of the stage:

```json
{
  "stage": "W5",
  "items": [
    {
      "id": "A1",
      "behavior": "A visitor resets a forgotten password",
      "steps": [
        "Open /login and choose Forgot password",
        "Submit a registered address: a reset message arrives"
      ],
      "passes": false
    }
  ]
}
```

- Write `acceptance.json` at Frame from the owner's requirements so that all active items passing means the stage goal is met.
- Only the coordinator updates `passes: true` with the accepted `revision` for items confirmed by an accepting review (including items passed in earlier rounds untouched by the delta). `RETURN` sets nothing; an item later seen failing reverts to `passes: false`.
- Items are **never deleted** from `items`. Beyond toggling `passes`, the list changes in three ways only:
  1. a contract amendment or a new outcome appends new items;
  2. a reviewer's correction fixes a step that misdescribes how to reach an already-delivered behavior while keeping what must be observed, appending the finding to `amended` (`"amended": ["R1 F4: form moved to /sign-in"]`);
  3. the owner alone changes a behavior (appending the owner decision to `amended`) or withdraws an item by setting `"removed": "Owner decision D9: deferred to W6"` with `passes: false`.
- Amendment history is append-only: prior entries in `amended` are never edited or dropped, and `removed` items are never restored silently or counted in active totals.
- Whenever updating `acceptance.json`, the coordinator runs `report.py acceptance <list> --previous <stage-base-list> --previous <last-committed-list>`, rejecting deleted items, unrecorded edits and rewritten amendment histories.

## Project commands

Record in `PROJECT.md` or the repository README:
- `run` - starts the application or artifact ready for consumer interaction;
- `check` - executes every required project check and exits nonzero when any fails;
- `smoke` - executes a fast base sanity check (`smoke` equals `check` when `check` is fast).

An outcome that introduces a new required check adds it to `check`. All roles run these recorded commands rather than ad-hoc substitutes.

## Outcome contract

Every outcome contract states:
- outcome ID and kind (`delivered` or `experiment`);
- covered `acceptance.json` item IDs (or the experiment's single question and closed observation list);
- failure cases, explicit exclusions and named invariants;
- risk level (`local reversible`, `cross-module / user-visible` or `critical`);
- base commit, workspace isolation and permitted write paths;
- affected consumers, shared contracts and dependencies;
- required checks, total time budget (including rework and review) and round limit (default `2`);
- integration and delivery authorization.

General owner expectations (cleanliness, latency, documentation) apply to delivered outcomes and stage exit, not to temporary experiment artifacts.

- **Enumerated scope.** When acceptance spans a finite set (endpoints, components, methods, states), list every element in the contract and require an element-by-check coverage table in the submission. Missing an element is one blocking defect on the table.
- **Required evidence.** Name upfront which invariants need discriminating evidence (a check observed failing when the invariant is broken) and which real dependencies must be exercised. A code mutation surviving checks is `blocking` when it violates a critical consequence, `correction` (check: the mutation fails) when it violates a named invariant or criterion, otherwise `note`.
- **Postponed observations.** Only the contract may mark an observation `required: false`, recording what cannot be observed yet, why, which later outcome will observe it and what bounds risk meanwhile. Roles may propose postponement, never mark it; for critical consequences only the owner decides.
- **Documents.** Added statements in delivered docs are claims checked against the candidate: a false statement is `blocking` if it misstates a requirement, experimental answer or downstream constraint, otherwise `correction`. Submission notes are evidence, not deliverables: verify only claims the verdict depends on.
- **Heuristic checks.** Any incomplete check (scanner, statistical bound, filter) states residual risks and an observable threshold check that fails if exceeded; otherwise the gap is `blocking`. Heuristic bounds never cover critical consequences.
- **Outcome record.** Stores ID, requirements, base/candidate/final revisions, state, review rounds with time and token cost, reviewer and implementer evidence, open/resolved corrections with checks, postponed observations, decisions and next step. Reopening reduces stage completion.

## Findings

Scope covers the owner's request, project rules, affected consumer scenarios and invariants, not merely the implementer's contract text.

- **Blocking defect** (`blocking`): in delivered work, an acceptance item whose steps fail (unless the behavior works and only the step path was misdescribed), a stubbed or decorative-only control, any reproducible violation of an owner requirement, project rule, named invariant/criterion or critical consequence, a consumer regression, a pre-existing defect activated by the change or blocking the outcome, missing required evidence the reviewer also cannot obtain, or an unverified owner requirement gap in the contract. Only this returns an outcome; none may be deferred.
- **Correction** (`correction`): any other in-scope flaw whose fix a deterministic command or observable procedure confirms (`check` fails before the fix and passes after). Closed by the coordinator when `check` passes on the final revision; if the fix alters anything outside the correction, send the delta to review without incrementing the round. Never left open or deferred.
- **Note** (`note`): an out-of-scope pre-existing issue, optional improvement or uncheckable suggestion. Turned into a separate backlog task where it belongs or declined with a reason.

An empty finding list never suffices alone: `ACCEPT` requires verified acceptance items and passing required checks on the candidate commit. Only resubmission after `RETURN` increments `round`; re-reads, restarts, reviewer swaps and correction-delta checks keep the same round. Changing approach after hitting the budget or round limit starts a new outcome with a fresh contract.

## Reports

All four report views are statelessly validated by `scripts/report.py`:

- **`status`**: input object has `stage` (index without spaces, e.g. `"W5"`), `tasks` (`id`, `state` in `ready | active | review | blocked | done | cancelled`) and `decisions` (`id`, `state` in `open | resolved`, boolean `requires_human`). Conflicting duplicate IDs or missing fields fail with exit code `2`.
- **`verdict`**: input object has `verdict` (`ACCEPT | RETURN | UNVERIFIED`) and positive integer `round`; `score` is rejected. `ACCEPT` and `RETURN` require `findings` (`id`, `kind`, `state` in `open | resolved`, optional integer `round <= review.round`). `blocking` requires `requirement` and `reproduction`; `correction` requires `check`, plus `result: "pass"` and `revision` when `resolved`. `ACCEPT` additionally requires `commit`, `checks` (`command`, `result` in `pass | fail`, `revision` matching `commit` exactly or by 7+ hex Git SHA prefix, optional integer `exit`, optional boolean `required` defaulting to `true`) with at least one passing required check and all required checks passing, and no required `unchecked` entries (`"text"` or `{"condition": "...", "required": true}`).
- **`complete`**: requires a valid `ACCEPT` record where every `correction` is `resolved`. Post-acceptance fixes set `final` to the resulting commit: every correction of the final round must pass on `final` (resolved corrections carrying an earlier `round` retain the revision on which they closed prior to `ACCEPT`), and `final` may differ from `commit` only when at least one correction was closed on `final`.
- **`acceptance`**: validates `stage` and `items`, counting `passes: true` across non-removed items; with one or more `--previous` snapshots (stage base and latest committed list) rejects deleted items, silent rewordings and altered `amended` / `removed` histories.
