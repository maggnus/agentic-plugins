# Operating charter

Read this file before the first `operate` run and whenever the owner asks to reconfigure the project.
The charter is eight persistent fields; the goal is to reach a confirmed charter in one exchange,
not to run an interrogation.

## Propose, then confirm

First follow [Persistent settings](persistent-settings.md). A valid `SETTINGS.json` is the confirmed
charter across sessions and CTO identities: validate its provider tuples and proceed without asking
again. Do not create agents, workspaces, heartbeats, commits, runtime checkpoints, or plan mutations
until settings have been recovered or the first charter is confirmed and persisted. For a genuine
first run, reach confirmation fast:

1. Discover providers, models, reasoning settings, and permission modes through Paseo, and read enough
   project evidence to choose a sensible default for every field.
2. Present the **complete proposed charter as one confirmation line** (below) and ask the owner to
   confirm it or change any field. This is the primary interaction.
3. Fall back to native multiple-choice questions only for a field where evidence is genuinely silent
   and the default would materially affect safety, and only for that field. Never offer an unavailable
   value; if a provider family is unavailable, record that and drop its model question.

On resume or CTO handover, read `SETTINGS.json` and proceed; ask only for a decision whose absence
blocks safe operation. The owner may change one field without repeating anything, and that change is
persisted before further operation.

```text
CTO charter: alpha | GPT <model> | Claude <model> | high reasoning | role-safe | 4/3+1 external fleet | until-gate | risk-based review
```

## The eight fields

1. **Strategy** — `alpha`, `beta`, or `stable`. Internal to the CTO (see Execution plan); recommend one
   from project evidence.
2. **GPT model** — the strongest currently allowed Codex/OpenAI choice, preferred tuple first.
3. **Claude model** — the strongest currently allowed Anthropic choice, preferred tuple first.
4. **Reasoning policy** — `high` by default (owner directive 2026-07-20, a deliberate step down from the
   former maximum-tier default of 2026-07-18). `maximum`, `balanced`, or `uniform-high` only on explicit
   owner request; offer only efforts the selected models support.
5. **Permission policy** — `role-safe` (writers get the charter's writer mode, reviewers/researchers
   the strongest read-only/plan mode), `always-ask` (writers ask before writes/sensitive actions), or
   `full-access-writers` (writers full/bypass). Reviewers/researchers always stay read-only/plan.
6. **Fleet budget** — `balanced` (3 writers + 1 review reserve), `conservative` (2 writers + 1 review
   reserve), or `capacity` (a known positive `max_live`, reserving one review slot). The CTO does not
   count toward `max_live`.
7. **Autonomy horizon** — `until-gate` (continue safe ready work to completion or a founder/external
   gate), `one-wave` (finish the current wave and stop cleanly), or `named-scope` (only named nodes).
8. **Independent review depth** — `risk-based` (independent reviewer for medium/high-risk or disputed
   work), `every-write`, or `cto-only`.

These are standing rules, not choices: the CTO reviews every delegated write; one 15-minute heartbeat
runs while work remains; agents commit locally and never push; push, deploy, publication, live
mutation, money, and irreversible actions stay separate gates; and critical security, privacy,
authorization, and data-integrity risks are never deferred by strategy.

## Persist

Resolve each provider/role `settings.modeId` with `inspect_provider`; never hardcode mode names or IDs.
Write the accepted charter — exact models, reasoning, mode mapping, fleet limits, strategy, horizon,
review depth, confirmation date, and any explicit owner overrides — atomically to the project-scoped
`SETTINGS.json`. Keep operational state in the per-run checkpoint from `execution-plan.md`; never use
that checkpoint or a global Paseo preferences file as the settings authority.
