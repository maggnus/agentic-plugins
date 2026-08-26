# Changelog

One tag per release, named after the `paseo-cto` base version. Sibling plugins are versioned on
their own and move inside the same tag. Entries record what changed in the method, not every commit.

## v10.7.1 — paseo-cto 10.7.1

Runs and tokens became an owned budget rather than a side effect.

- `SKILL.md` renames the context policy to *Spend context, runs and tokens deliberately* and makes
  the CTO accountable for the spend: a run that cannot change the next decision is not run, long
  commands run detached and are read by their exit line, command output is bounded, and the full
  suite runs once at a named closing gate.
- `validation-budget.md` rations end-to-end runs: admitted only where the defect is observable
  solely on the consumer surface, one scenario per task, no route or theme matrices, no screenshot
  matrices beyond a single owner-approval set, and no negative half bought by a repeated full run.
- `assignment-contract.md` prices this before dispatch through explicit `Validation budget`
  subfields, and bounds builder and reviewer runs.
- `review-gate.md` reads success and failure paths from the author's captured logs; the reviewer's
  own execution is its single falsifier, and Routine adds no run beyond reading.
- `fleet-operations.md` forbids wait loops inside a CTO turn; `status-and-reporting.md` keeps
  command output out of status messages.

The negative-half requirement is unchanged: it moves to the cheapest level that discriminates the
defect rather than disappearing.

## v10.7.0 — paseo-cto 10.7.0, team 1.3.0

The CTO stopped inspecting: every outcome is reviewed by a non-author reviewer at every risk tier,
and the CTO classifies, decides and integrates on that reviewer's evidence. The convergence loop
dropped from five returns to two, with four as the ceiling after a granted budget.

## v10.6.0 — paseo-cto 10.6.0

Closing a run tears down every resource it created — terminals, agent records, schedules, the
heartbeat, workspaces — and proves absence with a label-scoped inventory before the close is
announced.

## v10.5.1 — paseo-cto 10.5.1

The release version is derived by `bump.py` from the commits since the last tag instead of being
raised by hand; a break is recognised only as a footer.

## v10.5.0 — paseo-cto 10.5.0, team 1.2.0

Checks are derived from what the change can break and ordered where they can still change a
decision. The reviewer walks the surface the consumer meets, and scoring gained the experience axis.

## v10.4.0 — paseo-cto 10.4.0, team 1.1.0

The reviewer and the author converge on their own across a bounded loop; every verdict carries a
ten-point score and its moment, recorded one line per round in the node's journal.
