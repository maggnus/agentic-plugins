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

1. Discover providers, models, reasoning settings, and permission modes through Paseo, and read
   enough project evidence to choose a sensible default for every field.
2. Present the **complete proposed charter as one confirmation line** (below) and ask the owner to
   confirm it or change any field. This is the primary interaction.
3. Fall back to native multiple-choice questions only for a field where evidence is genuinely silent
   and the default would materially affect safety, and only for that field. Never offer an
   unavailable value; if a provider family is unavailable, record that and drop its model question.

On resume or CTO handover, read `SETTINGS.json` and proceed; ask only for a decision whose absence
blocks safe operation. The owner may change one field without repeating anything, and that change is
persisted before further operation.

```text
CTO charter: alpha | GPT <model> | Claude <model> | xhigh reasoning (reviewer max) | full-access-writers | capacity fleet (max_live <N>, 1 review slot per 2 writers) | until-gate | risk-based review
```

## The eight fields

1. **Strategy** — `alpha`, `beta`, or `stable`. Internal to the CTO (see Execution plan); recommend
   one from project evidence.
2. **GPT model** — the strongest currently allowed Codex/OpenAI choice, preferred tuple first.
3. **Claude model** — the strongest currently allowed Anthropic choice, preferred tuple first.
4. **Reasoning policy** — by owner directive 2026-07-20: the reviewer role runs at `max`, and the
   builder and researcher roles default to `xhigh`. `ultra`, uniform overrides, or any tier below
   these only on explicit owner request; offer only efforts the selected models support.
5. **Permission policy** — `full-access-writers` (default), `role-safe`, or `always-ask`. The three
   values are defined once in [Roles and providers](roles-and-providers.md); confirm the name here
   and apply that definition. Push, deploy, and the other owner/CTO gates are unchanged by it.
6. **Fleet budget** — the ceiling on live external agents; the CTO does not count toward it.
   `capacity` (recommended) takes a positive `max_live` and reserves one review slot per two live
   writers, rounded up, so a return never queues behind a busy reviewer. `balanced` (3 writers + 1
   review reserve) and `conservative` (2 writers + 1 review reserve) are fixed small presets for a
   machine or an account that genuinely cannot carry more.

   A ceiling is not a target. The real limit on useful concurrency is the number of ready atoms whose
   write zones are pairwise disjoint — see *Parallel admission* in
   [Fleet operations](fleet-operations.md). Raising `max_live` without disjoint work buys nothing and
   pays for it in merge conflicts, so a charter with a high ceiling obliges the CTO to structure the
   plan into independent lanes rather than to dispatch overlapping atoms.
7. **Autonomy horizon** — `until-gate` (continue safe ready work to completion or a founder/external
   gate), `one-wave` (finish the current wave and stop cleanly), or `named-scope` (only named nodes).
8. **Independent review depth** — `risk-based` applies the complete floor from
   [Review gate](review-gate.md). `every-write` may strengthen it by assigning a formal independent
   reviewer to Routine work. No charter choice may reduce or redefine the risk-based floor.

These are standing rules, not choices: every delegated write receives at least the required
non-author second look; one 15-minute heartbeat runs while work remains; repository writers commit
locally and never push; push, deploy, publication, live mutation, money, and irreversible actions
stay separate gates. Validation is budgeted: one primary owner per proof, final-tree evidence is
reused, and a full suite runs only at an explicit plan, wave, release, or deploy trigger or when new
evidence invalidates prior proof.

## Persist

Resolve each provider/role `settings.modeId` with `inspect_provider`; never hardcode mode names or
IDs. Write the accepted charter — exact models, reasoning, mode mapping, fleet limits, strategy,
horizon, review depth, confirmation date, and any explicit owner overrides — atomically to the
project-scoped `SETTINGS.json`. Keep operational state in the per-run checkpoint from
`execution-plan.md`; never use that checkpoint or a global Paseo preferences file as the settings
authority.
