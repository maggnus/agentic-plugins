# paseo-cto — release notes

Each line states the observation the change came from. Rules earn their place by removing a failure
that was actually measured, not by anticipating one.

## 6.0.0

Three corrections from operating the 5.x method through a full day of cards. All three were failures
of the method rather than of any agent following it.

- **Work is judged at the maturity the card contracted.** A card now declares `RESEARCH`, `DESIGN`,
  `BUILD` or `OPERATIONALIZATION` beside its risk, and the landing decision reads both. An
  assumption invalidated during research or design is a result; only a defect in the contracted
  outcome forces a return. Depth of investigation surfaces neighbouring problems, and neither the
  reviewer nor the CTO may load one card with all of them: every finding is sorted into a defect in
  this outcome, a refinement of the starting hypothesis, an independent product defect, or
  additional work, and its kind is stated. Reviewer findings carry the kind; only an
  `outcome-defect` blocker returns a card.

- **The register bans evaluation, not only first person.** Reports state the prior assumption, the
  observed evidence, the effect on the contracted outcome, and the required disposition — and
  nothing about how important, impressive, costly or interesting the finding is. Phrases that rate
  the work rather than report it are removed rather than softened. The rule was already in the CTO
  skill; it now reaches every worker report through a line in each role skill.

- **The heartbeat stopped forcing a message.** The reconcile prompt told the CTO to post the header
  and fleet table into chat on every run, which contradicted the delta-stream rule three files away
  and produced a periodic retelling of an unchanged state. The prompt now posts only on a material
  event, in a fixed four-line shape — `FRONTIER`, `DECISION`, `IMPACT`, `NEXT` — carrying the
  general technical consequence rather than the route taken to it. Precise file/line, commands and
  captured output stay in the review report and the evidence package, which is where a reader who
  needs them looks.

Nothing was removed from the evidence discipline: independent adversarial review, the false-green
audit, the validation budget, bounded scope, reviewer preservation across rounds, and the
residue/split/return separation are unchanged, and the archival review report keeps its full
technical detail.

## 5.3.0

The researcher completes the set. 5.1.0 gave the reviewer the obligation to construct a false green
and 5.2.0 gave it to the builder; a researcher's conclusion is load-bearing in the same way and was
the one place still allowed to rest on confirming evidence alone. A finding assembled only from
sources that agree is indistinguishable from a finding that happens to be true, and the CTO plans
against it either way.

- **The researcher seeks a counterexample for every load-bearing conclusion.** Rule 2 now asks for
  one plausible counterexample, one conflicting primary source, or one condition under which the
  conclusion would be false — reported either way. Where the bounded evidence cannot settle it, that
  is stated rather than left as silence, which keeps an unsettled question visible instead of
  promoting it to a fact by omission.

## 5.2.0

The builder now carries the obligation 5.1.0 gave the reviewer, because the cheapest place to catch
a proof that cannot fail is before it is offered. In the run that prompted both, a card returned at
Critical risk on a fault its own acceptance could never have shown: emission was proved harmless
against a sink that errors, blocks or is absent, and the failure mode was the emitter's lifecycle —
a closed channel written to by a step still running, reachable at every ordinary shutdown. The
evidence was sound and answered the wrong question.

- **The builder attempts a false green before returning.** Rule 4 now asks, of each load-bearing
  acceptance check, whether a reachable bypass, a lifecycle boundary, an independently chosen
  mutation, or a differing configuration lets the check pass while the contracted outcome is false.
  The failing output is preserved, or the contract is cited for why the hypothesis cannot be reached.
  A builder who has already tried to break its own evidence returns a smaller review surface.

## 5.1.0

One addition to the reviewer, from a run in which every blocker across eleven accepted cards was a
proof that could not fail rather than a defect in code. A cleanup report called seven surviving
cloud artifacts absent. A scanner pin identified a string the peer offered about itself. A spend
ceiling test had stopped exercising the ceiling. Thirty-two of thirty-three database-backed
packages reported success for months while running nothing. In each case the check ran, passed, and
reported truthfully — about the wrong thing.

- **The reviewer now attempts a false green before believing any evidence.** Rule 4 opens with the
  construction rather than the challenge: try to build a passing result that proves nothing, and
  prefer bypass hypotheses over breakage ones — the implementation skipped, the fixture supplying
  the expected answer, the oracle derived from the code it judges, the exercised composition
  differing from the deployed one, the negative case that cannot fail. A surviving hypothesis is a
  RETURN before any further code is read. Challenging a check after reading the diff comes too late:
  by then the review has already adopted the author's frame of what the check is for.

## 5.0.0

Four corrections to 4.1.0, from reviewing 4.1.0 itself. Three of its eight rules lived only in
prose, and a rule that lives only in prose is one a tired session skips — which is how the eight
rules came to be needed in the first place.

- **Two review rules became gate-enforced.** `Residue` now requires `Return condition`, and a card at
  two or more `Rounds` requires `Convergence`. The shape check verifies both pairings, tested in both
  directions: a residue without its trigger and a second round without its decision each fail the
  gate, one round passes. An accepted defect is now a tracked fact rather than a line in a review
  nobody opens again.
- **The residue prohibition became a test rather than a list.** Naming six forbidden surfaces
  invited the reading that anything unnamed qualifies. Two questions now decide: could the worst
  credible failure be undone once noticed, and would it announce itself? The named surfaces stay as
  the common cases that fail both, not as the boundary.
- **The product-path rule gained its unavailable case.** Requiring one proof through the real path
  with no stated exception left two outcomes when the environment does not yet exist: silent
  violation or a blocked card. It now defers visibly — name the participant the harness stood in
  for, land as residue with the path proof as the trigger, and never for a boundary whose failure is
  irreversible or silent.
- **The outcome section stopped restating the product clock.** Three of its seven rules repeated what
  the clock already said about work in progress, stalled movement, and busy agents. Four remain — the
  ones about what counts as a result at all.

Version is major because a landing decision was added in 4.1.0 to a set consumers may parse, and
because two plan fields are now conditionally required by the shape gate.

## 4.1.0

Eight corrections from a long production run, all of them cheap: each replaces a review round or a
lost interval, and none adds a stage.

- **Landing gained `ACCEPT WITH RESIDUE`.** One card ran five review rounds; the product behaviour
  under review was settled at the second, and the remaining three argued about the quality of a
  checking script. A true finding can now land as a recorded residue with an observable return
  condition — forbidden outright on authentication, authorization, tenant isolation, money, privacy,
  secrets, data loss or corruption, and irreversible actions.
- **Review rounds now converge by rule.** Rounds were unbounded, and each one individually looked
  justified while the card stopped moving. After the second return on one card the CTO decides in
  that same turn: accept with residue, split the card, or name the gate and stop.
- **Acceptance must demand a check that can fail.** Every blocking finding of the run had one shape
  — a proof that proves something other than what it claims: a gate whose condition no input could
  violate, a script comparing a subset against itself, a fixture pinned to the value the code already
  emitted, a suite exercising a configuration the deployed system never reaches. Contracts now
  require the negative half with captured output, what the check catches and what it would pass, and
  a reachability argument for the configuration it ran in.
- **Fleet inventory is per working copy.** Agent listings are scoped by working directory and workers
  live in their own copies, so a busy fleet read as empty from the integration root. That reading
  produced two duplicate agents, one of them inside a live builder's own copy. Enumerating
  workspaces and querying each is now a reconcile step, and an empty inventory is unproven until a
  second reading confirms it.
- **Collecting a finished report is a step, not a by-product.** A completed agent announces nothing.
  A ready report sat uncollected for 45 minutes once and across a CTO handover another time. Every
  reconcile, and every turn-start check, now fetches the return of any recorded agent that is not
  running.
- **At least one proof travels the product's own path.** The run's most expensive defect — no user
  file could cross a boundary the system was built to cross — survived twelve cards of live cloud
  measurement, because the harness assembled the request and supplied the expected value itself.
  Volume did not correct it; every run shared the same substitution. Boundary acceptance now requires
  one proof through the real path, with the harness standing in for no participant.
- **A same-family review says so and compensates.** The method assumes a reviewer from a different
  provider family; when none is available the independence is lost silently and the review still
  reads as independent. The loss is now recorded, and the reviewer's contract requires a falsifier of
  a different shape than the author's evidence and forbids taking the problem statement from the
  author's report.
- **Workspace creation branches off an exact SHA.** Creating a workspace on an existing branch moved
  that branch out of the integration tree and left it standing on an unrelated branch with
  uncommitted work — silently, since the tree still looked like a checkout. The safe order is now
  written down: clean tree, recorded SHA, unused branch name, and re-verification afterwards.

## 4.0.0

- **The plugin names no model, no reasoning effort, and no provider preference.** Model catalogs turn
  over faster than plugin releases, and a model name written into a reference silently overrode an
  owner choice the plugin could not see. Role assignments — the CTO's own seat included — moved into
  one charter field the plugin reads and never fills.
- **Charter schema 2.** A single `reasoningPolicy` string could not express a per-role effort and the
  model fields had no slot for the CTO seat, so projects grew private keys to hold what the schema
  could not, and those keys drifted out of agreement with it. One-fact-one-key makes that drift a
  validation error.
- **A reporting register.** A report written in the first person about work performed reads as an
  account of its author rather than as the state of the system. No first person, complete
  grammatical prose, the result first, silence in place of repetition. The language it is written in
  is a charter field, for the same reason the models are.
- **Outcome discipline stated rather than implied.** Progress is a changed observable state of the
  product, not a started task or a busy fleet; work no goal claims is not scheduled.
- **The shape check writes to a private `mktemp` directory** under a trap, instead of predictable
  `/tmp` paths.
