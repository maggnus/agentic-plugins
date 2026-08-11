# paseo-cto — release notes

Each line states the observation the change came from. Rules earn their place by removing a failure
that was actually measured, not by anticipating one.

## 9.13.0

A long Qwibi run measured repeated token costs that did not add evidence: every role used the
maximum reasoning tier, worker reports reproduced command transcripts, unrelated tasks inherited
old session context, the runtime checkpoint accumulated full returns, full CI discovered failures
that a cheap composition check could name, and mechanical corrections inherited the parent card's
Critical falsifier requirement.

- **Reasoning effort is selected within an owner-approved range.** Ranges use exact provider tier
  IDs as `<minimum>..<maximum>`. Routine work uses the minimum, Significant work the middle tier,
  and Critical work the maximum; escalation requires a named new risk or contradiction. The plugin
  still chooses no model, provider, tier, or range for the owner.
- **One negative half proves one load-bearing claim.** Supporting compiler, formatter, linter, and
  unchanged upstream-suite commands share that proof instead of each receiving an artificial
  mutation. Critical invariants retain their independent falsifier.
- **Composition preflight precedes a full suite.** The integrated diff first runs the cheapest
  repository checks that inventory its changed surfaces. The expensive suite then runs once at its
  named gate instead of discovering an attributable static failure late.
- **Operational context is bounded.** Normal worker returns are limited to 1800 characters and
  group evidence by claim. Runtime keeps one 1200-character return summary per live agent and at
  most twelve material events, never full prompts, reports, transcripts, or repeated snapshots.
  Unrelated atoms start fresh sessions; author and reviewer context is reused only for bounded
  rework of the same atom.
- **Mechanical corrections receive their own risk classification.** They do not inherit Critical
  depth or an independent falsifier unless they change product behavior, an oracle, acceptance
  semantics, reachability, or the threatened invariant.
- **Status updates are coalesced.** Material transitions in one turn produce one delta, while
  scheduled and explicitly requested snapshots retain the complete fleet table. Missed heartbeat
  intervals do not produce stale catch-up snapshots.

## 9.12.0

Owner decision, not a new rule: the review-performer option is removed from the CTO seat. The
Routine tier allowed the CTO to carry the mandatory second look itself, and the integration delta
named the CTO as its reviewer; both quietly turned the integration authority into a review
workload.

- **Review is always delegated, at every tier.** The CTO classifies the risk, dispatches the
  risk-required review or second look to a non-author agent, and decides on the returned evidence;
  it never produces review evidence itself. The Routine second look goes to a delegated non-author
  agent under a lightweight contract; an integration delta that alters the result receives a
  dispatched non-author review. Landing authority, risk classification, integration, rerunning
  composition-invalidated checks, and the bounded CTO fix remain CTO work — everything else in the
  gate is unchanged.

## 9.11.0

Agent titles diverged across CTO sessions because the format was a prose convention read once at
first Operate: each model followed it with its own fidelity, and a compacted session reconstructed
the pattern from habit. Recovery never depended on titles — labels carry machine identity — but the
fleet table showed a different naming style per model.

- **An agent title is derived, never composed.** The single format is `<plan-id>-<family>-<role>`
  (`cto-<family>` for the CTO row): a pure function of the labels the agent already carries, so any
  two CTOs on any host and any model derive the identical string. No descriptive additions, no
  translation into the reporting language, no model or version in place of the family slug. Every
  reconcile derives the expected title from the labels and renames any owned agent whose title
  differs; a mismatch is corrected mechanically, never preserved as style.

## 9.10.0

Two measured costs paid without buying evidence: reviewers re-ran green author command sets whose
results CI had already recorded for the exact revision, and small homogeneous findings from one
review each grew a full workspace, dispatch, and review cycle of their own because a work-tree node
implied a fleet cycle. Review depth also drifted upward silently, since nothing distinguished
risk-required depth from precautionary depth.

- **Recorded runs are first-class acceptance evidence.** The reviewer inventories CI and pipeline
  evidence and counts it once verified: pinned to the exact reviewed revision, actually executed —
  not skipped, permissively ignored, or retried into green — cache-honest, able to distinguish the
  property it proves, and at least as representative as a local rerun, with no inherent rank over
  one. The governing rule is symmetric: execute a reviewer-owned check when it adds discriminating
  information; read and verify existing evidence when execution would only duplicate it.
  Reviewer-owned checks broaden beyond negative cases to mutation, boundaries, compatibility,
  ordering, absent invariants, alternate paths, and proving the author's test fails on the defect.
- **Work decomposition does not imply execution decomposition.** Split-before-dispatch gains its
  converse, batch-before-dispatch: small homogeneous sibling nodes — one surface, one environment,
  one verification method, one review context — travel as one contract, one workspace, one review,
  classified at the highest risk among them, while each node keeps its own identifier, acceptance,
  closure, and return path. A node that develops independent risk or a return of its own leaves the
  batch.
- **Review depth follows the classification and does not drift.** Risk-required depth is the default
  and, absent new evidence, the ceiling; exceeding it is a deliberate, recorded spend of the
  validation budget, and uncertainty is resolved by reclassification rather than silent deep review.

## 9.9.0

Owner decision: the `team` plugin is retired and removed from the marketplace. It was Claude Code
only by construction — its roles were Claude Code subagents and its fan-outs used the Workflow
tool — while every multi-agent need it served runs through this plugin on both hosts. Two operating
models for the same work meant divided maintenance without a second capability.

- **The marketplace ships `paseo-cto` and `russian-speech` only.** The `team` directory, its
  marketplace entry, and its install instructions are removed; existing installations keep working
  from their pinned tags but receive no further releases.

## 9.8.0

The merge of the Russian style skill in 9.7.0 addressed the wrong cause. A host could not see that
skill because it had never been released under a tag, not because it lived in its own package; the
one host that did install it had silently dropped its tag pin. Owner decision: the two stay separate
products, and the distribution rule stands on its own — GitHub, pinned to a tag.

- **`skills/russian-speech` and the `SessionStart` hook return to the `russian-speech` plugin.** This
  plugin ships the method; the prose rules ship beside it and are installed by name.

## 9.7.0

Withdrawn by 9.8.0, and recorded rather than removed. It folded `skills/russian-speech` and the
`SessionStart` hook into this plugin after a host pinned to `v9.6.0` could not see the standalone
package, which existed only on the branch. Merging removed the symptom; cutting a release tag was
the fix.

## 9.6.0

One measured fleet day spent more of itself on accounting than on product: 59,799 lines of evidence
against 8,790 lines of product code, 44 bookkeeping commits out of 77, fifteen sequential
integrations, and three validator refusals over reference form. Four changes return that time
without lowering a single acceptance bar.

- **Durable evidence is the derivation, not the haul.** Nothing bounded how much raw material an
  evidence package may hoard, and one card accumulated 257 captured files under a rule that only
  ever asked for the failing form and its output. The review gate now keeps what was run, its exit,
  the deciding values, and a script able to re-derive them on the exact revision; a raw capture is
  retained only where the claim is otherwise unreproducible. Money movement, tenant isolation, the
  sandbox boundary, and irreversible operations keep their complete raw package — there the capture
  is the proof.
- **One decision produces one plan commit.** Two to three plan commits per accepted card — activation,
  closure, children — were bookkeeping the rule never demanded. The execution plan now states it
  positively: everything a single acceptance or dispatch changes in the plan lands as one commit,
  including the regenerated index.
- **A cleared set lands in one pass.** The integration rule forbade batching absolutely while the
  validation budget already priced a combined-tree proof for several accepted changes — an internal
  contradiction resolved in favor of the measurement. Deferring cleared work to accumulate a batch
  stays forbidden; landing atoms that are already through review at the same reconcile, zones
  disjoint, in one pass with the gates, index, and push run once on the combined tree, is now the
  stated form of continuous integration.
- **A repinnable reference is repaired, not returned.** A branch link or a short SHA inside an
  otherwise well-formed forge link cost a full correction round three times in one day, though Git
  can expand both without an author. `work.py fix-links` resolves such references through the local
  repository and repins them to the full commit SHA; only a reference the repository cannot resolve
  still returns to its author, and the immutability requirement itself is unchanged.

## 9.5.0

A project may import its frozen history into the tree instead of leaving it beside it.

- **Imported acceptance is declared, not inferred.** Freezing the old execution document stays the
  cheaper path and the default, but a project that wants one continuous view can carry its accepted
  cards into the tree. `historical_acceptance` marks such a card, and only an accepted card:
  `started_at` may then be absent, `risk` may be `pre_policy` for work older than the risk policy,
  `historical_time_record` keeps the time exactly as the old row wrote it including a bare `n/a`, and
  the wave plan-review gate does not apply, because the cards predate the plan. Measured on a project
  that imported 186 accepted cards.
- **The strongest relaxation records a joint absence.** `historical_acceptance_metadata_incomplete`
  permits an accepted card with neither an acceptance moment nor a closure commit, and requires both
  to be empty — so it states that the source held neither, and cannot quietly cover one omission.
- **The rollup says how much of itself is history.** An imported card is real completed work and is
  counted, but the gate never saw it, so `WAVES.md` closes with one further row stating how many of
  the counted cards were imported. A project that froze its history sees no such row.

## 9.4.0

A project's copy of the work tooling can no longer drift in silence.

- **The tooling is stamped.** `work.py` and `work-schema.json` are copied into each project, so
  nothing noticed when that copy stayed on an older release or was edited in place — the model would
  simply behave differently in one project than the plugin describes. The pair now carries the release
  it came from and a digest over itself, verified on every run: a copy assembled from two releases and
  a locally modified copy are refused with the reason. `work.py version` prints the stamp, and
  `check --plugin-templates <dir>` compares the project's stamp with the installed plugin's.
- **The stamp cannot rot.** `scripts/stamp-work-tooling.py` re-stamps only when the tooling actually
  changed, and the distribution check refuses a release whose tooling changed without being
  re-stamped, so a doc-only release never marks every project's copy stale.

## 9.3.0

The plugin upgrades itself.

- **`paseo-cto upgrade`.** The installation sequence was four commands per host, copied from the
  README and pinned to whatever tag that copy of the README named, so an upgrade silently installed
  a release older than the newest one. A shipped script now resolves the newest release tag from the
  remote repository, re-pins both hosts to it, and reinstalls any sibling plugin that shares the
  marketplace, which the manual sequence removed and never restored. `--check` reports versions
  without changing anything, `--dry-run` prints the exact commands, and `--tag` pins one release.
  An installation change is never made implicitly: it alters the owner's environment, not a project.

## 9.2.0

The wave overview states progress as a share, and totals itself.

- **`Done` and a total row.** `WAVES.md` gains a percentage beside each wave's card count and closes
  with a row summing every wave, so the project's overall progress is one number rather than an
  addition the reader performs. The percentage is rounded half up from integers and never depends on
  float repair; a wave with no cards renders `0/0` and `—`.

## 9.1.0

The waves became visible again.

- **`WAVES.md` is generated beside the index.** 9.0.0 left no place where the waves are seen
  together: the index starts at the cards because a wave row would carry no commit, start or
  duration, and the wave dashboard that the plan document used to hold went with the document. One
  row per wave now states its marker, its title, the first line of its outcome, and how many of its
  cards are accepted. `work.py status` writes both files, `work.py check` rejects a hand edit to
  either, and `work.py init` creates both.

## 9.0.0

Work stopped moving between documents. One work unit is now one permanent file, created once and
never moved, and the index over those files is generated rather than maintained.

- **A work unit is a permanent file.** Wave, card, task and subtask each live at a path derived from
  their identifier under the project's work root, and acceptance changes the state and the closure
  fields in that same file. The atomic transfer into an acceptance row is removed, together with the
  archive of preserved bodies that 8.1.0 and 8.1.1 added to compensate for it: both existed to stop
  a transfer from destroying the reasoning, and a file that never moves cannot lose it. Measured on a
  transfer that replaced seventy-line cards with single sentences.
- **The structure is derived, not chosen.** The work root is the only adjustable path and is recorded
  once in `SETTINGS.json`; everything below it follows from the identifier, and the check recomputes
  the path in both directions. The rule permitting a project to keep its own tracker for current work
  is withdrawn: two shapes for one plan become two truths.
- **Blocked, paused and withdrawn work has its own marker.** The set is `[ ]` ready, `[~]` active
  including review and rework, `[?]` blocked, `[=]` paused or trigger-gated, `[!]` withdrawn, `[x]`
  accepted. Until now blocked and deferred work rendered as `[ ]` and read as ready. Review and
  return remain inside `[~]`.
- **A child declares why it exists.** `required`, `follow_up`, `expansion` or `trigger`. A parent
  closes over its required children only, so an honestly accepted card is no longer reopened by
  follow-up work, and a trigger-gated unit cannot start before its named event.
- **The index is generated and the fleet snapshot is renamed.** `STATUS.md` in the work root is the
  committed index of the project, produced by `work.py status` and never hand-edited; the runtime
  render of who is working right now is `FLEET.md` beside the checkpoint. One name for two artifacts
  was ambiguous in every sentence that used it.
- **The tree is built before the first dispatch, and reviewed by someone else.** A wave whose work
  has started without an accepted independent plan review fails the check. The reviewer role gains a
  plan-review mode; no planning or execution-architect role is created, and the CTO still owns the
  decomposition.
- **A worker no longer writes the plan.** A builder reads its task file, which must be startable from
  a cold context, and reports; the CTO records state and creates new units in the integration tree.
  A state edit made on a frozen baseline in an isolated worktree could not be believed without a
  merge.
- **The shape is a program, not a convention.** `work.py` and `work-schema.json` are the single
  source of identifiers, vocabularies, field sets and section order, shared by the templates, the
  generator and the validator, with `work.py new` creating every node so a path and a parent listing
  cannot disagree from the first minute.
- **Adoption replaces migration.** A project with an execution document freezes it and starts new
  work in the tree, usually at a wave boundary. The one enforced rule is that a live identifier has
  exactly one home; `check-plan-shape.sh` stays available for the frozen document.

## 8.1.1

The accepted-card archive is a tree, not a flat directory.

- **Wave, card, task.** A preserved card body is stored at `<wave>/<card>/<task>.md`, keeping the
  identifier verbatim in each segment, so the archive is walked the way the plan is read. The flat
  padded form introduced in 8.1.0 ordered correctly but hid the structure it was recording; ordering
  within one card is a cosmetic cost a project can pad away if it minds it. A check locates a
  preserved body by its tail, since the wave is not part of the identifier.

## 8.1.0

Four rules earned by a forty-hour run: what an acceptance row cannot hold, when an idle fleet is a
defect, what an agent-daemon restart costs, and the second way a harness proves nothing.

- **The acceptance row is an index, not the record.** Transferring a card into a one-line row
  destroys its decisions, its excluded scope, its acceptance conditions and its residue, and the loss
  is invisible afterwards because the plan is also what would reveal it. The complete card body is now
  preserved verbatim in an accepted-card file linked from the row, an accepted residue re-enters the
  plan as a deferred card with its return condition, and the file name is derived so a plain listing
  sorts parents before children and `2` before `10`. Measured on a transfer that replaced seventy-line
  cards with single sentences and lost one residue entirely.
- **An empty fleet with admissible ready work is a defect, not a state.** Refill happens on the
  heartbeat or on initiative, so a fleet that empties just after one can stay empty until the next
  with nothing noticing. The two producing moments are named — archiving before dispatching, and
  serialising behind a check the next card does not need.
- **An agent-daemon restart preserves no session.** Measured: every agent and the scheduled heartbeat
  are gone, while workspaces, worktrees, branches and commits survive. Recovery costs one re-dispatch
  per active card plus recreating the heartbeat, and nothing more — because a writer commits locally.
- **The harness must assemble what the product assembles.** Beyond substituting a value, a harness can
  wire the components differently from the running system: a guard the product installs and the
  harness omits, or a privileged connection where production uses an ordinary one. A constraint on
  assembly is proved on the assembly the product uses, compared line by line rather than by
  description. Twice in one run this left a boundary green while it crashed the server and refused
  thirty product call sites.
- **A worker no longer stops when the plugin mechanism withholds its role.** All three role skills now
  resolve through the mechanism first and the installed file second, and may report the role
  unavailable only after both fail, quoting each error.

## 8.0.1

The scheduled snapshot now has one heading and no fleet section label.

- **The heading is only the update timestamp.** The exact first line is
  `# Update <YYYY-MM-DD HH:MM TZ>`; the project name is not repeated.
- **The table follows the card count directly.** `## Active fleet` is removed. One blank line
  separates `Cards` from the fixed table header, so the snapshot has exactly one Markdown heading.
- **The wave index is bracketed.** The exact line is `Wave: [<wave-id>] <wave name>`; an absent wave
  is `Wave: [—] —`. The [render check](skills/paseo-cto/templates/check-status-render.sh) rejects the
  former title, an unbracketed wave index, and the removed table section heading. The
  [contract tests](scripts/test-plugin-contracts.sh) exercise the corrected shape.

## 8.0.0

The canonical plan heading and status identity line now put the immediately actionable state first.

- **Every card starts with its marker.** The only canonical heading is
  `#### <marker> <stable-id> — <outcome-oriented title>`, for example
  `#### [ ] LF-06 — Ship immutable App releases`. A suffix marker is rejected. The
  [plan-shape check](skills/paseo-cto/templates/check-plan-shape.sh), the
  [status-render check](skills/paseo-cto/templates/check-status-render.sh), templates, transfer
  checks, and contract fixtures use the same order.
- **The status identifies the loaded CTO seat.** A separate line reports the immutable plugin base
  version, exact `provider/model` with reasoning effort, optional host-provided context measurement,
  and elapsed CTO-session time. Host context is omitted when no trustworthy measurement exists;
  plugin version, model, effort, and session time remain mandatory.
- **The status gate checks the selected release.** `PASEO_CTO_VERSION=v<base-version>` makes a stale
  or falsely labelled status fail. The [contract tests](scripts/test-plugin-contracts.sh) cover the
  new leading-marker rule, legacy suffix rejection, version mismatch, and both present and absent
  context measurements.

## 7.1.0

The periodic fleet display is restored as an explicit operational invariant.

- **Every heartbeat publishes the fleet table.** The scheduled 15-minute reconcile writes and posts
  the same snapshot even when state is unchanged. Material prose remains a delta stream and is not
  repeated.
- **The heading contains only current-wave state.** The exact render is project and local timestamp,
  current wave ID and name, and `Cards: <done>/<total>`, followed by the complete fleet table with
  the CTO first. Strategy, readiness, internal run identity, rollups, blockers, and next-action prose
  are no longer part of the mechanical heading.
- **Card statistics come from document truth.** `done` counts unique rows for the current wave in the
  acceptance history. `total` is their union with current cards in the same wave. The last card
  therefore produces a final `N/N` snapshot before the critical path advances.
- **The status render has an executable gate.** The
  [render check](skills/paseo-cto/templates/check-status-render.sh) validates the exact heading,
  fleet columns, CTO-first ordering, derived status tokens, and plan/acceptance counts. The
  [contract tests](scripts/test-plugin-contracts.sh) cover the valid render, the removed legacy
  heading, a false count, a missing CTO row, and current work without an identified wave.

## 7.0.1

The installed-release check now supports both Codex marketplace layouts. When the installation
metadata sidecar is absent, it verifies the marketplace's detached Git checkout directly: exact
tag, remote-tag commit, and installed revision must agree. The published `v7.0.0` tag remains
unchanged; this correction is a new immutable release.

## 7.0.0

The role contracts, review gate, document lifecycle, reporting register, and dual-host packaging now
state one consistent operating model.

- **Every returned outcome is reviewed.** The independent risk-based second look now applies to
  report-only research and design as well as repository writes. Integration remains specific to
  accepted writes. The reviewer evaluates the complete evidence package when no revision range
  exists.
- **Finding type controls disposition.** An untyped finding makes a review incomplete. Only an open
  `outcome-defect` blocker necessarily returns the current card; independent defects and additional
  work become separate plan children or named gates.
- **Source identities are links.** The [source-reference policy](skills/paseo-cto/references/source-references.md)
  requires commit-pinned links for repository commits, files, and lines used as durable evidence.
  The [reference check](skills/paseo-cto/templates/check-source-links.sh) rejects mechanically
  recognizable bare source identities.
- **Acceptance is an atomic transfer.** A completed card is appended to acceptance history and
  removed from the current execution plan in the same semantic change. The
  [shape check](skills/paseo-cto/templates/check-plan-shape.sh) rejects duplicate IDs, transitional
  done cards, missing source links, state-marker mismatches, and—when `BASE_REF` is supplied—removed
  cards without acceptance rows or new acceptance rows without prior cards.
- **Plan state is explicit.** The plan template now includes the required `Maturity` field on every
  active example, and the document standard maps every plan state to its card marker without
  conflating plan state with runtime agent state.
- **Language precedence is explicit.** `charter.reportingLanguage` remains the authoritative local
  choice and may name Russian or any other language. It overrides the plugin's English first-run
  proposal and the host's conversation language. The formal, neutral, impersonal register applies
  unchanged in every language, with no first or second person, social framing, emotion, praise,
  blame, or unsupported hedging. The [status check](skills/paseo-cto/templates/check-owner-status.sh)
  accepts a configured language and can extend its pronoun and social-language patterns per project.
- **Codex and Claude packaging is checked together.** The
  [distribution check](scripts/check-distribution-sync.sh) verifies shared descriptions, authors,
  base versions, marketplace source, skill coverage, and release metadata. The
  [contract test](scripts/test-plugin-contracts.sh) exercises document shape, source links, English
  and Russian reporting modes, and the execution-to-acceptance transfer.
- **Installations are immutable and remote.** Codex and Claude register the GitHub marketplace at
  the same `v<version>` release tag; local directories and moving branches are development inputs,
  not installation sources. The [installed-release check](scripts/check-installed-release.sh)
  verifies the marketplace type, tag, revision, installed versions, and shared commit.

## 6.0.2

Two corrections to 6.0.0 and 6.0.1, both found by reading the rules against each other.

- **`Maturity` is a stored card field, not only a dispatch field.** 6.0.0 made the assignment and
  the review gate require it while the project document standard still listed the card's exact
  fields without it, so the level a card promised lived only in a prompt and the next session had to
  guess it. It now sits beside `Risk` in the card standard, and `templates/check-plan-shape.sh`
  enforces it on the same rule Risk carries: a not-started card may be unclassified, anything in
  progress or done may not, and a value outside the four levels is reported.

- **The status length is a ceiling, not a range.** "Usually 500–900 characters" reads as a target,
  and a target invites writing up to it. The rule is now: as short as the material change allows,
  never more than 900 by default, one or two paragraphs preferred and four only when needed. There
  is no minimum — two sentences that answer the four questions are a complete status, not a draft.

## 6.0.1

The owner-facing status becomes a policy with a check, not a shape with headings.

- **One mandatory policy, one place.** `references/status-and-reporting.md` now carries the rule for
  every message the owner reads: brief, neutral, self-contained engineering prose — no first person,
  emotion, praise, surprise, drama, literary framing, or commentary on how important or interesting a
  finding feels; only what limits progress, what materially changed, why it matters to the product or
  the critical path, and what happens next. The CTO skill and the reconcile prompt point at it rather
  than restating it.

- **The mandated headings are gone.** `FRONTIER / DECISION / IMPACT / NEXT`, introduced one version
  earlier, traded one rigid form for another and taught the reader to skim four labels. A status is
  now a few short natural paragraphs: at most four, usually 500–900 characters, longer only for an
  owner decision or a critical risk that cannot be stated correctly in less.

- **What must not appear is enumerated.** Intermediate attempts, commit and file and round counts,
  file/line, commands, internal function names, query forms, harness detail, corrected internal
  mistakes, working-tree state, and the run's own vocabulary — cards, branches, agents, reviewers,
  rounds. Adjacent defects appear only as separate cards, and only when they move the critical path,
  a risk, or an owner decision.

- **A check for the mechanical half.** `templates/check-owner-status.sh` judges length, paragraph
  count, first person, banned framing, internal-mechanics vocabulary, template headings, and a
  trailing aside carrying stale internal history. It exits with the violation count. Form only: the
  four content questions in the policy remain the real gate, and the file says so.

Review reports, findings, and durable evidence are untouched — they keep commands, exact evidence,
file/line, identifiers and reproduction detail in full. The change moves detail to the right reader
rather than removing it, and independent adversarial review, the false-green audit, the validation
budget, bounded scope, reviewer preservation and the RETURN/RESIDUE/SPLIT separation all stand.

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
