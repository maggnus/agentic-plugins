---
name: team
description: Delivery discipline for a small project without any fleet machinery. Split the work into outcomes that can be judged, size the check to what a defect would cost, prove a check can fail before trusting it, delegate reads in parallel and writes one at a time, and review a change before it lands. Invoke as `$team:team` in Codex or `/team:team` in Claude.
---

# Team

A small project does not need workspaces, snapshots or a task database. It needs four things: work
split into outcomes that can actually be finished and judged, checks proportionate to what a defect
would cost, evidence that each check is able to fail, and a reading of the diff by someone who did
not write it. This file is the whole method; there is nothing else to load.

## Run the work

1. **Split the request into outcomes, not steps.** An outcome is one result a reader can check —
   "the importer rejects a malformed row with a named error", not "edit the parser". Each one names
   what it produces, how it is judged, and what it deliberately leaves alone. Anything that needs
   more than roughly a day of work, spans unrelated surfaces, or cannot be judged as one story is
   two outcomes.
2. **State the plan once, before the first edit**, as a short list of those outcomes in the order
   they will land. Keep it in the reply and in commit messages. Do not create a state directory, an
   index, or a generated file to track it; the repository and its history already are the record.
   Revise the list out loud when reality changes it — a silently abandoned outcome reads as done.
3. **Land one outcome at a time.** Finish, check, and commit it before starting the next. A branch
   with three half-finished outcomes cannot be reviewed and cannot be reverted cleanly.

## Size the check to the risk

Classify each outcome by the credible consequence of a defect, not by how big the diff is:

- **Routine** — the worst credible failure is local, obvious, and reversible. Run the targeted check
  for the changed behaviour and read the complete diff before committing.
- **Significant** — behaviour users depend on changes, but damage stays bounded and noticeable. Add
  the failure path, not only the success path, and have the change reviewed before it lands.
- **Critical** — a defect could touch authentication, authorization, money, privacy or secrets, data
  loss or corruption, an irreversible action, or a published interface. Require an independent
  review, at least one check that would genuinely fail if the invariant broke, and explicit owner
  approval before anything irreversible.

Uncertainty rules out Routine; it does not by itself create Critical. Touching a shared component,
a migration, or build and test infrastructure is at least Significant unless the change is
mechanically bounded.

## Check what the change can break, and run it while it still decides something

Two habits waste more time than any missing test: running everything, and running it too late.

- **Derive the blast radius from the change** — the paths it touches, whoever consumes them, the
  contracts they publish — and pick checks that can fail for a defect in that set. A check that
  cannot name the defect class it distinguishes does not earn its runtime, and green on code the
  change cannot reach measures the suite, not the change.
- **Prefer the check nearest the change that can still fail for the right reason.** A red full suite
  says something broke; a targeted check says what.
- **Order the check that could invalidate the approach before the work that depends on it.** A
  contract, a boundary, a permission model, a migration path, a consumer path — disprove these at
  the first slice that reaches them. A check whose result can no longer change what happens next is
  ceremony; state the earlier run instead of repeating it to look diligent.
- Cross-cutting changes — a shared component, a schema, build or test infrastructure — have a wide
  radius by nature. Widening the set there is deriving it correctly, not spending recklessly.

## Prove the check can fail

A green command proves nothing until its failing form has been seen. Before offering any check as
evidence, break the thing it guards — revert the fix, corrupt the input, remove the guard clause —
run the same command, and keep the real failing output. State in one sentence what the check
distinguishes and what it would pass anyway. Checks that share a claim share one broken input;
unchanged compilers, formatters and linters need no ceremony.

Report a command and its real exit status, never "tests pass". If a check was not run, say so.

## Delegate reads in parallel, writes one at a time

Subagents in this setup share one working copy, so file ownership is a promise, not a boundary.

- **Reading work runs in parallel**: locating call sites, surveying conventions, reproducing a bug,
  reviewing a diff. Give each one its question, the paths worth reading, and the exact shape of the
  answer; tell it to return findings with file and line references and to change nothing.
- **Writing work runs one at a time.** Two agents editing the same tree overwrite each other without
  either noticing. If work must be split across writers, split it in sequence, not in parallel.
- Every delegated result is checked against the source before it is used. A subagent's summary is a
  claim, not evidence — open the file it cites.

## Review before landing

A Significant or Critical change is read by an agent that did not write it, in a fresh session,
against the outcome and its acceptance — not against the author's account of what was done. That
review inspects the complete diff, checks that the evidence exercises a path the product actually
reaches, and returns either `ACCEPT` or `RETURN` with each finding named precisely. A Routine change
is accepted after its author reads the whole diff once more, deliberately.

Every verdict carries a ten-point score, written as the round marker `R2(5/10)`. Score the **code** —
does it meet the outcome, read like the surrounding code, and hold the invariants of the area it
touches; the **work** — does the evidence discriminate, was the failing form observed, does the
report match what the diff does; and, whenever a product surface was changed and walked, the
**experience** — does the scenario reach its result, do the edges behave, what does the path cost,
is the consumer better off. Where no consumer can observe the change, experience is `n/a` rather
than an invented number. The marker carries the lowest axis that applies. Nine or ten means nothing above a minor finding is open and every load-bearing claim has been
seen failing; five or six means one major finding or evidence that does not distinguish the defect
it is offered against; one or two means an open blocker in the outcome itself. Name the reason for
any score below nine, and for an acceptance below eight say in one clause what stayed imperfect.

The score measures the work and never decides the verdict: a defect in the contracted outcome
returns the change at any score, and its absence accepts it at any score. Judge the fifth round
against the same anchors as the first — rounds spent are not quality earned.

Sort every finding before deciding: a defect in the contracted outcome can force a return; a
neighbouring problem, a refinement, or an idea for later is recorded and left to its own work item.
A review that grows the scope of the change it reviews has stopped being a review.

## Walk the surface the consumer meets

A diff says what the code does, not what the consumer receives. When a change touches a product
surface — an HTTP or gRPC API, a CLI, a TUI, a web or mobile interface, an SDK, an event stream, a
job's output, a configuration contract — someone walks that surface the way its consumer does,
in an environment the product reaches rather than through a fixture standing in for it.

The first slice that carries a scenario through to its consumer gets this walk whatever its risk:
that is the cheapest moment at which a wrong path costs one change instead of a release. After that
the walk follows risk.

Six questions, in order — the first that fails is the finding:

1. Does the scenario reach its result — not `200 OK`, not a rendered page, not an exit status?
2. What happens at the edges: empty, one, many, slow, partial, unauthorized, repeated, concurrent,
   malformed, dependency missing? Say which edges were walked and which were not.
3. What does the path cost in steps, calls, waits and prior knowledge, against the minimum it needs?
4. Does a failure name what happened and what to do next — a stable code beside a readable message,
   a truthful exit status, a diagnosis where a script can read it?
5. Is it consistent with the conventions of that surface and with the neighbouring paths?
6. Is the consumer better off, judged against their task rather than against the contract?

A finding carries the exact call or step, the real response or captured state, and a reproduction
path. An impression without a reproducible step is not a finding. The walk grants no licence to
widen the change: a broken scenario the change promised is a defect that returns it; a rough edge it
never promised is recorded as its own work item.

## Converge — the reviewer and the author finish it between them

A returned change is not finished by a verdict; it is finished by the two agents converging on
evidence. Let them run that loop instead of adjudicating each round yourself.

- A return authorizes exactly the rework it names, inside the same outcome and the same files. The
  author answers every finding with evidence — agreement, or a defence built from the specification,
  the code, a test, a measurement, or a reproducible counterexample — and corrects in the same turn.
- The reviewer holds **five returns on one outcome**, counted across the whole outcome rather than
  per attempt. From the third return it states in one sentence what remains unclosed and which
  evidence would close it. A round in which neither side produced anything new does not spend the
  budget; it ends the loop.
- Keep one line per round where the work is tracked — `R2(5/10) RETURN 25/08 14:20 — finding →
  evidenced answer → what changed`, the moment in local `dd/mm hh:mm`. That ledger, not the
  transcript, is what the decision below is read from; the scores show whether the corrections are
  reaching the problem, and the moments show what each round cost.
- Nothing about a long loop lowers the standard. The reviewer derives what the change must do from
  the outcome, the specification and the code in the fifth round exactly as in the first, and
  neither side may trade a verdict, skip an adverse check, or lean on the other socially.

End the round immediately and decide yourself, whatever the budget left, when the correction would
leave the agreed scope, change the outcome or its risk, need an owner gate, or when the finding is a
neighbouring problem rather than a defect in this outcome.

## Decide on the record after the fifth return

After the fifth return the loop stops and you decide, reading the round ledger and both sides' last
reports — what was found, what was answered, and whether the two were still arguing about the same
fact. Choose exactly one:

- **accept**, including with residue — the outcome is met, the remaining limitation is written down
  where it will be found again, and it names the exact condition that reopens it;
- **grant two more returns**, once, with the exact acceptance condition stated before the loop
  resumes;
- **bring in a different reviewer** for that same two-return budget — for a fact neither side can
  close, a disputed falsifier on a critical invariant, or a review whose independence is in doubt;
- **split** — move the unresolved part into its own work item with its own risk and acceptance, and
  land the settled part;
- **name the blocker and stop** — say what prevents convergence and who must resolve it.

Seven returns is the ceiling: five in the loop and two in the granted budget. After that the next
decision is never another round. Residue stays forbidden when the failure could not be undone once
noticed, or would not announce itself. Authentication, money, privacy, data loss and irreversible
actions fail both tests routinely: those block instead.

## Landing and owner gates

Commit locally in coherent commits with a clean working tree. Push, deploy, publish, migrate a
schema, rotate or read secrets, spend money, and any irreversible action are the owner's decision
each time, not a standing permission. Ask once, plainly, with what will happen and what it costs to
undo.

## Reporting

Open every status, review and hand-off with its moment in local `dd/mm hh:mm`, read from the clock
when the message is written. A report whose time is unknown reads as current however old it is.

Lead with the outcome, then the evidence, then what remains. Write about the work, not about who did
it: no first person, no apology, no process narrative, no claim that something was verified without
the command that verified it. Say plainly when something was skipped, assumed, or left unproven —
an unstated gap is the one that costs the project later.
