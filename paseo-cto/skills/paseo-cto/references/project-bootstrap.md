# Project bootstrap

Read this file before the first dispatch on a new project and before opening a new large wave. It
defines how the executable work tree comes into existence and what must be true before a builder
takes the first task. The charter in [Operating charter](operating-charter.md) configures the
organization; this file builds the work.

Decomposition, identifiers, dependencies, and the frozen starting shape of a wave are CTO
responsibilities, and no separate planning role exists. The CTO may not confirm the completeness of
its own large decomposition; the independent review below does that.

## Order for a new project

1. **Read project truth** in this order: project instructions and no-touch boundaries, product
   documents and roadmap, an existing tracker if the project has one, the authoritative validation
   commands, the owner gates, and the canonical HTTPS source repository URL.
2. **Fix the release cuts and the waves.** A wave is a group of cards that together make one
   observable product change shippable.
3. **Create `WORKFLOW.md`** from the template, with the project's bindings resolved: validation gate,
   script home, work root, repository URL.
4. **Create the wave directories and `WAVE.md`** for authorized waves only, registering each wave's
   area codes.
5. **Create cards and tasks** for genuinely authorized work only, using `work.py new` rather than by
   hand.
6. **Record dependencies, blockers, and gates** on the files themselves.
7. **Separate the kinds of work**: ready, owner-gated, external-clock, withdrawn, and conceptual work
   that has not been promoted into the plan. Each kind has its own home — a ready file, a blocked
   file with its gate, a trigger file with its event, a rejected file with its return trigger, or no
   file at all until it is promoted.
8. **Generate the index** with `work.py status`.
9. **Run `work.py check`** and reach green.
10. **Dispatch the independent plan review** described below.
11. **Correct the tree** against the accepted findings, in the same files.
12. **Commit the frozen starting shape** of the wave and record the review verdict in `WAVE.md`.
13. **Only now dispatch the first builder.**

Steps 9 and 12 are enforced, not merely stated: the tree check refuses a wave in which any card or
task has started while `plan_review_state` is `pending` or `returned`, and refuses an accepted plan
review that links no evidence.

## Order for a new wave

The same sequence from step 4, scoped to that wave. Cards accepted in earlier waves are untouched;
their files stay where they are. A wave is opened when its outcome is the nearest shippable one, not
because the previous wave finished.

## Unknowns are gates, never filler

Product direction, pricing, legal exposure, external commitments, publication, live mutation, money,
and irreversible operations are the owner's, and the CTO never chooses one silently to complete a
plan. Such an unknown becomes a row in `backlog/OWNER_GATES.md` and, when work depends on it, a task
in state `blocked` naming that gate as its blocker.

## Independent review of the plan

The review is performed by the existing reviewer role under a plan-review contract. No permanent
planning or architecture role is created. The reviewer reads the tree and answers, with evidence:

- Does the tree, taken together, deliver the project outcome it claims?
- Is there work that falls between two cards and belongs to neither?
- Are there dependency cycles, or dependencies on units that do not exist?
- Can a card or a wave be closed too early — is any closure path false?
- Is every `required` child genuinely required, and is any new functionality mislabelled as a local
  finding?
- Are there hidden owner decisions presented as ordinary tasks?
- Is every acceptance condition checkable, with its negative half?
- Can a ready task be started from a cold context by someone who was not in the conversation?
- Does any task depend on information that exists only in an agent's history?
- Does every blocked, paused, withdrawn, and trigger-gated unit carry an exact, observable return
  trigger?

The review ends in `ACCEPT` or `RETURN` of the same plan. On `RETURN` the CTO corrects that plan;
the review continues rather than restarting, and no new role appears. Record the verdict in the
wave's `plan_review_state`, link the review report as `plan_review_evidence`, and state in the wave's
`Plan review` section what the review changed.

A corrected plan returns to the same reviewer and retained evidence; use a replacement only under
the Review gate. Re-review the correction, not the whole tree. The plan review converges the same
way an outcome does, with the CTO as the corrected party: the reviewer holds five returns, each one
leaving its line in the wave's `Plan review` section. A tree the reviewer still cannot accept after
the fifth is a scope question rather than a review question — accept with a recorded limitation and
return trigger, split the disputed scope, or name the gate for the owner and stop. The CTO does not
grant itself another budget on its own tree.

This review applies to the initial project or wave decomposition, not to each task contract or every
CTO correction inside an accepted wave. Repeat it only for a material rewrite that changes closure,
dependencies, or owner gates across multiple nodes.

## What "executable from a cold context" means

Each ready task must be dispatchable to a worker who has read nothing but that file and the project
instructions it names. A file that requires the CTO's memory of a conversation is not ready, and the
plan review is the last cheap place to catch that.
