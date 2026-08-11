# Persistent settings

Read this file before proposing or recovering an operating charter, and on every new session, CTO
handover, context recovery, or owner-requested reconfiguration.

## One project-scoped source of truth

Resolve the Git common directory to an absolute path and use exactly:

```text
$(git rev-parse --git-common-dir)/paseo-cto/SETTINGS.json
```

`SETTINGS.json` is the owner-confirmed, project-scoped Paseo CTO configuration. It survives new
conversations, daemon restarts, worktree changes, run IDs, and a switch between Claude and Codex CTOs
because every worktree in the repository resolves the same Git common directory. It is not a run
checkpoint and must never contain a CTO ID, run ID, heartbeat ID, active node, workspace, accepted
`HEAD`, or other volatile state. Do not put secrets in it.

The minimum schema is:

```json
{
  "schema": 3,
  "project": "<stable-project-slug>",
  "revision": 1,
  "confirmedAt": "<RFC3339 timestamp>",
  "charter": {
    "strategy": "alpha",
    "roleAssignments": {
      "cto":        { "family": "<slug>", "provider": "<provider/model>", "effort": "<tier>" },
      "builder":    { "family": "<slug>", "provider": "<provider/model>", "effort": "<tier|minimum..maximum>" },
      "reviewer":   { "family": "<slug>", "provider": "<provider/model>", "effort": "<tier|minimum..maximum>" },
      "researcher": { "family": "<slug>", "provider": "<provider/model>", "effort": "<tier|minimum..maximum>" }
    },
    "permissionPolicy": "full-access-writers",
    "fleetBudget": "conservative",
    "autonomyHorizon": "until-gate",
    "reviewDepth": "risk-based",
    "reportingLanguage": "<language the owner writes in>",
    "modeMap": {}
  },
  "work": {
    "root": "docs/work",
    "scriptHome": "<where the project keeps its copy of work.py and work-schema.json>"
  },
  "ownerOverrides": {}
}
```

`work.root` is the only adjustable path in the work tree; everything below it is derived from the
identifier. `work.scriptHome` is where the project keeps its own copy of the generator, the
validator and the templates, because the plugin path carries a version and differs between hosts.

The seven charter fields use the values defined by Operating charter. Every angle-bracket value
above is a placeholder the owner fills: **the plugin ships no model, no effort tier, and no
provider preference, and it never supplies one as a fallback.** An `effort` may name one tier or a
range the CTO picks from per atom; a role absent from `roleAssignments` is not dispatchable.
The range syntax is inclusive and uses exact tier IDs from the provider's ordered catalog, for
example `medium..xhigh`; the dispatch always resolves it to one exact tier under Roles and
providers. `family` is the short lowercase slug used in agent titles and the status table. `modeMap` records
the exact validated provider/role modes and may grow as a new role is first used. `ownerOverrides`
contains only explicitly confirmed, durable project-specific rules; never infer or migrate an
authority-expanding override from an old run. Project bindings, gates, and plan truth remain in the
project's normal tracked documents.

## One fact, one key

A setting is written in exactly one place. Two keys carrying the same fact will disagree — one of
them gets updated and the other is left behind, and nothing in the file says which is current.

- Never record a charter value in both `charter` and `ownerOverrides`. If an owner directive changes
  a charter field, change that field.
- Never add a key at the document root beyond the ones the schema names. An owner decision that is
  not a charter field belongs in `ownerOverrides`, under a stable name.
- Never encode a decision only in a free-text note. A note explains a value; it never carries one.
  When a note contradicts the field beside it, the field is authoritative and the note is a defect
  to be corrected in the same edit.
- Validate on read: a charter field whose value is outside the set its definition allows makes the
  file invalid, and the startup rule below applies. Do not silently accept a value borrowed from
  another field's vocabulary.

## Startup and CTO handover

1. Resolve and read `SETTINGS.json` before selecting defaults or reading a per-run checkpoint.
2. If it is valid, treat its charter and owner overrides as authoritative. Do not ask for charter
   confirmation again. Validate the persisted model/reasoning/mode tuples against current provider
   capabilities; unavailability is a visible owner decision, never a silent fallback or reset.
3. Copy `settingsPath`, `settingsRevision`, and the charter snapshot into the run checkpoint for
   audit. The copy is not authoritative and may not overwrite the persistent file.
4. A replacement CTO creates or adopts runtime state with its own CTO/run IDs while retaining the
   same settings revision. Changing CTO family or identity is not a charter change.
5. If the file is invalid or partially written, stop before plan mutation, workspace creation, or
   dispatch. Report the exact path and validation error; do not fall back to defaults.

## Migrating a `schema: 2` file

Schema 3 adds the `work` block, because the work root and the project's script home are project
facts the loop needs before it can read or generate anything, and a value that has no slot ends up
guessed differently by each session. Migrate by adding the block with the project's actual paths and
raising `revision`. Nothing else changes, and the charter is not reconfirmed.

## Migrating a `schema: 1` file

Schema 1 carried `gptModel`, `claudeModel`, and a single `reasoningPolicy` string. Schema 2 replaces
all three with `roleAssignments`, because one string could not express a per-role effort and the
model fields had no slot for the CTO's own seat — so projects grew private keys to hold what the
schema could not, and those keys drifted out of agreement with it.

Migrate in one edit, then raise `revision`:

1. Build `roleAssignments` from what the project actually dispatched: the models the
   old fields named, the per-role efforts from wherever the project kept them, and the CTO's seat.
   Where the old file disagreed with itself, present the candidates and ask the owner once — never
   pick the newest timestamp.
2. Add `reportingLanguage` from the owner's explicit project preference. Use English only when no
   local preference exists and the owner confirms the first-run proposal.
3. Delete `gptModel`, `claudeModel`, and `reasoningPolicy`, along with every private key and note
   that existed only to work around their absence.
4. Move any remaining owner decision that is not a charter field into `ownerOverrides`, and drop
   notes that now contradict the fields.

A `schema: 1` file is readable but not operable: complete the migration before the first dispatch.

## First-run and legacy migration

When `SETTINGS.json` is absent:

1. Prefer one explicit confirmed charter already stored in tracked project configuration.
2. Otherwise, a charter from the run named by the current `FLEET.md` may be migrated only after the
   CTO proves that run is the current active or owner-accepted run.
3. If multiple conflicting charters remain and no current accepted run resolves them, present the
   candidates and ask the owner once. Never choose the newest timestamp, current CTO family, or
   plugin defaults silently.
4. On a genuine first run, follow Operating charter's propose-and-confirm flow.
5. Persist the accepted or migrated settings before creating an agent, workspace, heartbeat, plan
   commit, or new runtime checkpoint.

Record an optional `migratedFrom` path for provenance. Migration must not import volatile IDs or
unconfirmed authority-expanding overrides.

## Atomic updates

Only an explicit owner charter change may alter the seven fields or `ownerOverrides`. Update one
field without reconfirming the rest, increment `revision`, update `confirmedAt`, validate the complete
document, and atomically replace `SETTINGS.json` through a temporary file in the same directory.
Afterward update the active run's settings revision and snapshot. A reconcile, restart, handover,
provider preflight, or plugin update must never rewrite owner choices merely because defaults or
catalog order changed.
