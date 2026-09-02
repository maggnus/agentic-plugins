# Operating charter and persistent settings

Read this file before the first Operate, on every new session, CTO handover or context recovery,
and when the owner asks to reconfigure. The charter is a small set of owner-controlled fields
persisted once per project; the goal is a confirmed charter in one exchange, never an
interrogation.

## One project-scoped source of truth

```text
$(git rev-parse --git-common-dir)/paseo-cto/SETTINGS.json
```

Every worktree resolves the same Git common directory, so the file survives new conversations,
daemon restarts, worktree changes, run IDs and a switch between a Claude and a Codex CTO. It is not
a run checkpoint: it never holds a CTO ID, run ID, heartbeat ID, active node, workspace, accepted
head or secret. Resolve and read it before any default and before the runtime checkpoint. A valid
file is the confirmed charter: validate its provider tuples and proceed without asking again. An
invalid or partially written file stops plan mutation, workspace creation and dispatch; report the
exact path and error, never fall back to defaults.

```json
{
  "schema": 4,
  "project": "<stable-project-slug>",
  "revision": 1,
  "confirmedAt": "<RFC3339 timestamp>",
  "sourceRepository": "https://<forge>/<owner>/<repo>",
  "charter": {
    "strategy": "alpha",
    "roleAssignments": {
      "cto":        { "family": "<slug>", "provider": "<provider/model>", "effort": "<tier>" },
      "builder":    { "family": "<slug>", "provider": "<provider/model>", "effort": "<tier|minimum..maximum>" },
      "reviewer":   { "family": "<slug>", "provider": "<provider/model>", "effort": "<tier|minimum..maximum>" },
      "researcher": { "family": "<slug>", "provider": "<provider/model>", "effort": "<tier|minimum..maximum>" }
    },
    "permissionPolicy": "full-access-writers",
    "fleetBudget": { "max_live_tasks": 3, "max_live_agents": 7 },
    "autonomyHorizon": "until-gate",
    "reviewDepth": "standard",
    "reportingLanguage": "<language the owner writes in>",
    "heartbeatMinutes": 30,
    "hostNativeRoles": ["researcher"],
    "contractCheck": { "critical": true, "significant": false, "routine": false },
    "resourcePolicy": { "defaultMode": "exclusive", "consumable": [] },
    "acceptance": { "mergeIsAcceptance": false },
    "mainAdvanceWindowMinutes": 0,
    "modeMap": {}
  },
  "work": { "root": "docs/work", "scriptHome": "scripts" },
  "ownerOverrides": {}
}
```

Every angle-bracket value is the owner's: **the plugin ships no model, no effort tier and no
provider preference, and never supplies one as a fallback.** A role absent from `roleAssignments`
is not dispatchable. `sourceRepository` is the canonical HTTPS URL the ledger turns bare SHAs into
commit-pinned links with.

## The charter fields

1. **strategy** — `alpha` (maximize motion toward a runnable system and a verified basic
   end-to-end path; defer what that path does not need), `beta` (alternate missing coverage with
   the most consequential depth gaps), `stable` (bring each component to the production bar). It
   controls prioritization only and never appears in agent names, labels or contracts. No strategy
   weakens the `Critical` floor.
2. **roleAssignments** — provider, model and effort per role, the CTO's seat included. An effort is
   one exact tier or an inclusive range `<minimum>..<maximum>` of exact tier IDs from the provider's
   ordered catalog; the CTO picks one tier per atom under [Roles and providers](roles-and-providers.md).
   `family` is the short slug used in agent titles.
3. **permissionPolicy** — `full-access-writers` (default), `role-safe`, `always-ask`; defined once
   in Roles and providers.
4. **fleetBudget** — `max_live_tasks` protects integration capacity, `max_live_agents` stops
   retained sessions multiplying; the CTO counts toward neither. A ceiling is not a target: useful
   concurrency is the number of ready atoms with pairwise disjoint write zones.
5. **autonomyHorizon** — `until-gate` (continue safe ready work to completion or a gate),
   `one-wave`, `named-scope`.
6. **reviewDepth** — `lean`, `standard` (default), `strict`; the matrix is in
   [Review gate](review-gate.md). `risk-based` reads as `standard`, `every-write` as `strict`. No
   value lowers the `Critical` row.
7. **reportingLanguage** — every owner-facing message and worker return. Any project-local value
   overrides the plugin's English bootstrap default and the host's conversation language.
8. **heartbeatMinutes** — the fallback reconcile cadence, default 30; the ceiling is 60 and the
   floor is 10. `notifyOnFinish` carries the primary signal.
9. **hostNativeRoles** — roles the CTO may run as the host's in-chat subagents instead of Paseo
   agents; default `["researcher"]`. `builder` is never allowed; `reviewer` only for `Routine` and
   `Significant` inspections, never `Critical`.
10. **contractCheck** — which tiers get the pre-dispatch contract check; `critical` may not be
    switched off.
11. **resourcePolicy** — what happens when two tasks want one shared thing; `exclusive` stops the
    second for a decision, a resource under `consumable` may be rebuilt without waiting.
12. **acceptance.mergeIsAcceptance** — false by default: `merge` records closure and leaves the node
    in `review` until the owner accepts; true makes `merge` do both.
13. **mainAdvanceWindowMinutes** — the release build window; zero disables the starvation warning.

`work.root` is the only adjustable work-tree path; `work.scriptHome` is where the project keeps its
copy of the tooling. `modeMap` records validated provider modes per role. `ownerOverrides` holds
only explicitly confirmed durable rules that are not charter fields — a charter value is never
written twice, and a note never carries a value.

## First run: propose, then confirm

1. Discover providers, models, reasoning settings and permission modes through Paseo, and read
   enough project evidence to propose every field except the role assignments. Propose English
   only when no project-local reporting language exists.
2. Present the complete proposed charter as **one confirmation line** and ask the owner to confirm
   or change any field. Role assignments are offered from the discovered catalog, never as a
   preference:

   ```text
   CTO charter: alpha | roles per roleAssignments | full-access-writers | 3 tasks/7 agents | until-gate | standard review | heartbeat 30m | reports in <language>
   ```

3. Use a native multiple-choice question only for a field where evidence is silent and the default
   would affect safety. Never offer a value the catalog does not expose.
4. Resolve each role's `modeId` with `inspect_provider`, then write the charter atomically through
   a temporary file in the same directory. Create no agent, workspace, heartbeat, commit or
   checkpoint before that write.

When `SETTINGS.json` is absent and an older run left a charter in a `FLEET.md` or a legacy
checkpoint, migrate it only after proving that run is the current accepted one; with several
conflicting candidates ask the owner once. Never import volatile IDs or authority-expanding
overrides. Record `migratedFrom` for provenance.

## Changing and migrating

Only an explicit owner change alters a charter field: update that one field, raise `revision`,
update `confirmedAt`, validate the whole document, replace atomically, then update the active
run's settings revision. A reconcile, restart, handover, preflight or plugin update never rewrites
an owner choice. Changing CTO family or identity is not a charter change.

Older files migrate in one edit and one `revision` increment, with no reconfirmation:

- a `fleetBudget` that counted writers or a bare `max_live` converts one for one to
  `max_live_tasks` (halving a bare agent ceiling, rounding down to at least one) with
  `max_live_agents = 2 * max_live_tasks + 1`;
- `schema: 3` adds `max_live_agents`; `schema: 2` first adds the `work` block; `schema: 1`
  (`gptModel`, `claudeModel`, `reasoningPolicy`) is readable but not operable until
  `roleAssignments` and `reportingLanguage` are built from what the project actually dispatched,
  asking the owner once where the old file disagreed with itself;
- a missing `heartbeatMinutes`, `hostNativeRoles` or `contractCheck` takes the default above
  without a revision change; `reviewDepth: risk-based` and `every-write` keep working under their
  new names.

Write `schema: 4` after any migration.
