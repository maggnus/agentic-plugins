# `paseo-cto`

A project-agnostic CTO organization over external Paseo agents, packaged natively for Claude Code
and Codex. The CTO decomposes the work into permanent files, dispatches isolated role-skilled
agents, inspects or delegates review by risk, integrates accepted changes, and keeps the founder,
review, push, deploy and irreversible-operation gates. It manages toward a shippable product, not
toward activity.

Invoke it as `$paseo-cto:paseo-cto` in Codex or `/paseo-cto:paseo-cto` in Claude. Worker roles —
`paseo-builder`, `paseo-reviewer`, `paseo-researcher` — use the same namespace on both hosts, and a
contract carries the installed plugin path so a worker can read its role file when the host's
plugin mechanism offers nothing. **Operating needs a Paseo agent seat**: outside Paseo the CTO is
read-only and says how to start one.

## Built to load fast and spend little

The CTO skill is about 9 KB and loads five references on the first Operate; a reviewer card is
7 KB and reads the full review gate only for a `Critical` card. Worker returns default to 1200
characters. The heartbeat's cadence comes from the charter (default 30 minutes) and a quiet
heartbeat costs one cheap check and one liveness line, not a fleet-wide probe. Read-only research
may run as the host's own subagent when the charter allows it. Every rule that survived is one that
found a real defect on a real project; the ceremonies that only produced dispatches did not.

## Owner decisions the plugin never makes

The plugin names no model, no reasoning effort and no provider, and never supplies a default for
one. Which model and effort carries which role — the CTO's own seat included — lives in the project
charter's `roleAssignments`, persisted at `<git-common-dir>/paseo-cto/SETTINGS.json` and reused
across restarts, worktrees and Claude/Codex handovers. `reportingLanguage` is project-local and
authoritative. The first run proposes the whole charter as one line and asks for confirmation.

## Inspection follows risk, and the charter picks the floor

| Risk | `lean` | `standard` (default) | `strict` |
| --- | --- | --- | --- |
| `Routine` | CTO glance | CTO glance | non-author reviewer |
| `Significant` | CTO look | non-author reviewer, one falsifier | non-author reviewer, one falsifier |
| `Critical` | independent reviewer, executable proof | same | same |

A glance reads the return and the diff stat, not the code; a look reads the whole diff. A
non-author reviewer reruns nothing already green and runs at most one independently selected
falsifier. Authentication, authorization, tenant isolation, privacy, data loss, corruption and
irreversible actions are `Critical` under every charter. When a card changes a product surface,
whoever inspects it walks that surface as its consumer does; the first vertical slice of a wave is
always walked.

A review is a convergence loop the inspector and the author own: a return authorizes the rework it
names, the author answers each finding with evidence, and after two returns the inspector
escalates. The CTO then decides on the record — `bounded_retry`, `independent_review`,
`accept_with_corrections`, `split`, `stop` — and four returns is the ceiling. Every verdict
carries a ten-point score on code, work and experience that measures the work and never decides
the verdict, and one line per round goes into the node's journal.

## How work is tracked

One wave, card, task or subtask is one file, created once at a path derived from its identifier
and never moved; acceptance fills its closure in place. A card whose outcome is one atom is
dispatched itself and carries its own journal; a card that needs several atoms has tasks.
`STATUS.md` and `WAVES.md` are generated. A wave's decomposition gets an independent plan review on
a project's first wave, on a wave with a `Critical` card, or above three cards; a smaller wave may
be waived by the CTO with its answers recorded. Every lifecycle event is written by `ledger.py` in
one call — checkpoint, node, journal, index and fleet render together, stamped from the clock.

## Status reporting

The fleet snapshot `FLEET.md` is rendered on every event and on the heartbeat. Chat receives the
full snapshot when a material event occurred or the owner asks, and a single quiet liveness line
otherwise. Durable records use a neutral, impersonal register in the project's language; an answer
to the owner names the commit, branch or agent the owner asked about.

```text
# Update <YYYY-MM-DD HH:MM TZ>
paseo-cto: v11.0.1 | Model: openai/gpt-5.6-sol (xhigh) | Session: 1h24m
Wave: [<wave-id>] <wave name>
Cards: <done>/<total>

| Agent | Task | Status | Time | LOC |
| --- | --- | --- | --- | --- |
```

## Project onboarding

```sh
PASEO_CTO_PLUGIN=/absolute/path/printed-by-the-plugin-install-command
cp "$PASEO_CTO_PLUGIN/skills/paseo-cto/templates/SETTINGS.template.json" \
  "$(git rev-parse --git-common-dir)/paseo-cto/SETTINGS.json"
# edit: project slug, sourceRepository, roleAssignments, reportingLanguage, fleetBudget,
# reviewDepth, heartbeatMinutes, hostNativeRoles

mkdir -p scripts
for tool in work.py work-schema.json ledger.py check_runtime.py render_fleet.py check-fleet-render.sh; do
  cp "$PASEO_CTO_PLUGIN/skills/paseo-cto/templates/$tool" scripts/
done
cp -r "$PASEO_CTO_PLUGIN/skills/paseo-cto/templates/work" scripts/work
bash "$PASEO_CTO_PLUGIN/scripts/check-work-tooling.sh" "$(git rev-parse --show-toplevel)"
```

The tooling is stamped with the release it came from, so a copy cannot fall behind or be edited in
place unnoticed. `work.py check` refuses a duplicate or misplaced identifier, an unknown state or
field, an accepted unit without closure commit or evidence, a dependency cycle, a parent closed
over an open required child, a hand-edited index, a journal that contradicts its count, and a
commit reference that is not a full SHA.

## Upgrade

[`upgrade.py`](skills/paseo-cto/scripts/upgrade.py) resolves the newest release tag, re-pins both
hosts to it and reinstalls any sibling plugin from the same marketplace; asking the CTO for
`paseo-cto upgrade` runs it.

```sh
python3 "$PASEO_CTO_PLUGIN/skills/paseo-cto/scripts/upgrade.py" --check     # report versions only
python3 "$PASEO_CTO_PLUGIN/skills/paseo-cto/scripts/upgrade.py"             # upgrade to the latest
python3 "$PASEO_CTO_PLUGIN/skills/paseo-cto/scripts/upgrade.py" --tag v11.0.1
```

## What ships

Both hosts load the same [skill sources](skills); only invocation syntax, the Codex cache-busting
build suffix and Codex interface metadata differ. A Codex builder needs write access to the
repository's Git common directory to commit inside its sandbox; where it cannot, the contract says
so and the CTO commits at integration.

- skills `paseo-cto`, `paseo-builder`, `paseo-reviewer`, `paseo-researcher`;
- work-tree schema, templates, `work.py` and `ledger.py`;
- fleet render, runtime check and their validators;
- [Claude](.claude-plugin/plugin.json) and [Codex](.codex-plugin/plugin.json) manifests, with one
  Codex metadata file per skill and no hardcoded Paseo MCP endpoint.
