# Operating charter

Read this file before the first `operate` run and whenever the owner asks to reconfigure the project.
The charter is seven persistent owner-controlled fields; the goal is to reach a confirmed charter
in one exchange, not to run an interrogation.

## Propose, then confirm

First follow [Persistent settings](persistent-settings.md). A valid `SETTINGS.json` is the confirmed
charter across sessions and CTO identities: validate its provider tuples and proceed without asking
again. Do not create agents, workspaces, heartbeats, commits, runtime checkpoints, or plan mutations
until settings have been recovered or the first charter is confirmed and persisted. For a genuine
first run, reach confirmation fast:

1. Discover the available providers, models, reasoning settings, and permission modes through Paseo,
   and read enough project evidence to propose a sensible value for every field except the role
   assignments. Propose English only when no project-local reporting language or explicit owner
   preference exists.
2. Present the **complete proposed charter as one confirmation line** (below) and ask the owner to
   confirm it or change any field. This is the primary interaction. Role assignments are the one
   part that is genuinely the owner's to state: offer the discovered catalog, never a preference.
3. Fall back to native multiple-choice questions only for a field where evidence is genuinely silent
   and the default would materially affect safety, and only for that field. Never offer a value the
   catalog does not currently expose.

On resume or CTO handover, read `SETTINGS.json` and proceed; ask only for a decision whose absence
blocks safe operation. The owner may change one field without repeating anything, and that change is
persisted before further operation.

```text
CTO charter: alpha | roles per SETTINGS.json roleAssignments | full-access-writers | <N> tasks in flight | until-gate | risk-based review | reports in <language>
```

## The seven fields

1. **Strategy** — `alpha`, `beta`, or `stable`. Internal to the CTO (see Execution plan); recommend
   one from project evidence.
2. **Role assignments** — provider, model, and reasoning effort for each role the project
   dispatches, and for the CTO's own seat. **The plugin proposes no value here and holds no
   default.** It offers what the catalog currently exposes and records what the owner chooses; the
   rules for reading, validating, and failing on this field are in
   [Roles and providers](roles-and-providers.md). An entry may fix one effort or allow a range the
   CTO picks per atom by risk and maturity. A range uses `<minimum>..<maximum>` with exact provider
   tier IDs; the chosen tier and reason go in the dispatch contract. A role with no entry is not
   dispatchable.
3. **Permission policy** — `full-access-writers` (default), `role-safe`, or `always-ask`. The three
   values are defined once in [Roles and providers](roles-and-providers.md); confirm the name here
   and apply that definition. Push, deploy, and the other owner/CTO gates are unchanged by it.
4. **Fleet budget** — the ceiling on plan tasks in flight, written as a positive `max_live_tasks`;
   the CTO does not count toward it. The agents a task carries follow from its review depth, not
   from the budget, so a Critical atom and a Routine one each occupy exactly one slot.

   A ceiling is not a target. The real limit on useful concurrency is the number of ready atoms whose
   write zones are pairwise disjoint — see *Parallel work* in
   [Fleet operations](fleet-operations.md). Raising `max_live_tasks` without disjoint work buys
   nothing and pays for it in merge conflicts, so a charter with a high ceiling obliges the CTO to
   structure the plan into independent lanes rather than to dispatch overlapping atoms.
5. **Autonomy horizon** — `until-gate` (continue safe ready work to completion or a founder/external
   gate), `one-wave` (finish the current wave and stop cleanly), or `named-scope` (only named nodes).
6. **Independent review depth** — `risk-based` applies the complete floor from
   [Review gate](review-gate.md). `every-write` may strengthen it by assigning a formal independent
   reviewer to Routine work. No charter choice may reduce or redefine the risk-based floor.
7. **Reporting language** — the language for every owner-facing message and worker return: chat,
   status, escalation, review, research, and the durable render. Any valid project-local value has
   precedence over the plugin's English bootstrap default and over the host's current conversation
   language. A direct owner request changes the field only after it is persisted. The register rules
   remain unchanged in every language: formal, neutral, impersonal, grammatical, result first, and
   silent rather than repetitive. Machine tokens, plan IDs, commands, paths, commit messages, and
   code retain their source form.

These are standing rules, not choices: every delegated outcome receives at least the required
non-author second look before completion, and every repository write receives it before integration;
one 15-minute heartbeat runs while work remains; repository writers commit
locally and never push; push, deploy, publication, live mutation, money, and irreversible actions
stay separate gates. Validation is budgeted: one primary owner per proof, final-tree evidence is
reused, and a full suite runs only at an explicit plan, wave, release, or deploy trigger or when new
evidence invalidates prior proof. Every operational message and worker return is written in the
configured reporting language under the formal, neutral, impersonal register in the CTO skill.

## Persist

Resolve each provider/role `settings.modeId` with `inspect_provider`; never hardcode mode names or
IDs. Write the accepted charter — role assignments, mode mapping, fleet limits, strategy, horizon,
review depth, reporting language, confirmation date, and any explicit owner overrides — atomically
to the project-scoped `SETTINGS.json`. Keep operational state in the per-run checkpoint from
`execution-plan.md`; never use that checkpoint or a global Paseo preferences file as the settings
authority.
