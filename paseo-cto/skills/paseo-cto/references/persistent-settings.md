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
  "schema": 1,
  "project": "<stable-project-slug>",
  "revision": 1,
  "confirmedAt": "<RFC3339 timestamp>",
  "charter": {
    "strategy": "alpha",
    "gptModel": "codex/gpt-5.6-sol",
    "claudeModel": "claude/claude-opus-4-8[1m]",
    "reasoningPolicy": "maximum",
    "permissionPolicy": "role-safe",
    "fleetBudget": "conservative",
    "autonomyHorizon": "until-gate",
    "reviewDepth": "risk-based",
    "modeMap": {}
  },
  "ownerOverrides": {}
}
```

The eight charter fields use the values defined by Operating charter. `modeMap` records the exact
validated provider/role modes and may grow as a new role is first used. `ownerOverrides` contains
only explicitly confirmed, durable project-specific rules; never infer or migrate an
authority-expanding override from an old run. Project bindings, gates, and plan truth remain in the
project's normal tracked documents.

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

## First-run and legacy migration

When `SETTINGS.json` is absent:

1. Prefer one explicit confirmed charter already stored in tracked project configuration.
2. Otherwise, a charter from the run named by the current `STATUS.md` may be migrated only after the
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

Only an explicit owner charter change may alter the eight fields or `ownerOverrides`. Update one
field without reconfirming the rest, increment `revision`, update `confirmedAt`, validate the complete
document, and atomically replace `SETTINGS.json` through a temporary file in the same directory.
Afterward update the active run's settings revision and snapshot. A reconcile, restart, handover,
provider preflight, or plugin update must never rewrite owner choices merely because defaults or
catalog order changed.
