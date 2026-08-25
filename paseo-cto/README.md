# `paseo-cto`

A project-agnostic CTO organization over external Paseo agents, packaged natively for Claude Code
and Codex. The CTO delegates by default: it decomposes the work, dispatches isolated role-skilled
agents, and touches code itself only for a trivial change or a bounded integration fix. It manages
toward outcomes rather than activity, keeps a living hierarchical plan, and preserves the founder,
review, integration, push, deploy and irreversible-operation gates.

Invoke the CTO as `$paseo-cto:paseo-cto` in Codex or `/paseo-cto:paseo-cto` in Claude. Worker roles
use the same namespace — `paseo-builder`, `paseo-reviewer`, `paseo-researcher` — and dispatch fails
closed when the plugin is unavailable in the selected worker family.

## Owner decisions the plugin never makes

The plugin names no model, no reasoning effort and no provider preference, and never supplies a
default for one. Which model and which effort carries which role — the CTO's own seat included — is
recorded in the project charter's `roleAssignments` and nowhere else. A role with no assignment is
not dispatchable, and an unavailable model is reported rather than silently substituted.
`reportingLanguage` is project-local and authoritative: any valid local value, including Russian,
overrides the plugin's English first-run proposal and the host's conversation language.

The first run presents a compact charter — CTO strategy, role assignments, permission policy, fleet
budget, autonomy horizon, review depth, reporting language — persisted at
`<git-common-dir>/paseo-cto/SETTINGS.json` and reused across restarts, worktrees and Claude/Codex
handovers.

## How work is tracked

One wave, card, task or subtask is one file, created once at a path derived from its identifier and
never moved; acceptance fills the closure fields in that same file. Two committed files are
generated from the tree: `STATUS.md`, the index of every unit, and `WAVES.md`, one row per wave with
its accepted share. Before the first dispatch on a new project or wave, an independent reviewer
attacks the decomposition; a wave whose work started without that verdict fails the check.

Review depth follows risk. The CTO accepts Routine outcomes, and Significant ones that cannot alter
product behaviour — tests, documentation, configuration, generated files, mechanical edits — on the
diff and the author's evidence. Every Significant change to product code, every Critical outcome,
and anything the CTO authored go to a non-author reviewer with its own falsifier. Every durable
source reference is pinned to the exact revision.

A delegated review then runs as a loop the reviewer and the author own: a return authorizes the
rework it names, the author answers every finding with evidence, and the two repeat for up to five
returns while the CTO relays their material and adjudicates nothing. Every verdict carries a
ten-point score on the code and on the work, and one line per round goes into the node's journal —
`- R2(5/10) RETURN 25/08 14:20 — finding → answer → what changed`. The score measures the work and
never decides the verdict; the moment shows what the round cost. Worker returns and chat status
lines carry the same local `dd/mm hh:mm` stamp. After the fifth return the reviewer escalates, and the CTO decides on that
record — accept, one bounded budget of two more returns, an independent replacement reviewer inside
that budget, a split, or a named gate. Seven returns is the ceiling. Independence, evidence and the
non-negotiation rules hold identically in the fifth round and the first.

## Status reporting

A named 15-minute heartbeat reconciles the plan, agents, workspaces, reviews, stalls and cleanup,
and refreshes the durable fleet snapshot `FLEET.md`. The chat receives the full snapshot when a
material event occurred or the owner asks for status, and a single quiet liveness line otherwise, so
a long session does not spend its context restating an unchanged table.

```text
# Update <YYYY-MM-DD HH:MM TZ>
paseo-cto: v10.4.0 | Model: openai/gpt-5.6-sol (xhigh) | Session: 1h24m
Wave: [<wave-id>] <wave name>
Cards: <done>/<total>

| Agent | Task | Status | Time | LOC |
| --- | --- | --- | --- | |
```

## Project onboarding

A new project needs a charter in the Git common directory:

```sh
PASEO_CTO_PLUGIN=/absolute/path/printed-by-the-plugin-install-command
cp "$PASEO_CTO_PLUGIN/skills/paseo-cto/templates/SETTINGS.template.json" \
  "$(git rev-parse --git-common-dir)/paseo-cto/SETTINGS.json"
# edit: project slug, roleAssignments, reportingLanguage, fleetBudget, autonomyHorizon,
# reviewDepth, permissionPolicy
```

Copy the work tooling into the project and bind `check` to the validation gate:

```sh
mkdir -p scripts
cp "$PASEO_CTO_PLUGIN/skills/paseo-cto/templates/work.py" scripts/
cp "$PASEO_CTO_PLUGIN/skills/paseo-cto/templates/work-schema.json" scripts/
cp -r "$PASEO_CTO_PLUGIN/skills/paseo-cto/templates/work" scripts/work
cp "$PASEO_CTO_PLUGIN/skills/paseo-cto/templates/check_runtime.py" scripts/
cp "$PASEO_CTO_PLUGIN/skills/paseo-cto/templates/render_fleet.py" scripts/
cp "$PASEO_CTO_PLUGIN/skills/paseo-cto/templates/check-fleet-render.sh" scripts/
bash "$PASEO_CTO_PLUGIN/scripts/check-work-tooling.sh" "$(git rev-parse --show-toplevel)"
```

The tooling is stamped with the release it came from, so a project's copy cannot fall behind the
plugin or be edited in place unnoticed. `work.py check` refuses a duplicate or misplaced identifier,
an unknown state or field, an accepted task without a closure commit or evidence, a blocked task
without a blocker, a dependency cycle, a parent closed over an open required child, a hand-edited
index, and a commit reference that is not an immutable full SHA.

## Upgrade

[`upgrade.py`](skills/paseo-cto/scripts/upgrade.py) resolves the newest release tag, re-pins both
hosts to it, and reinstalls any sibling plugin from the same marketplace. Asking the CTO for
`paseo-cto upgrade` runs it.

```sh
python3 "$PASEO_CTO_PLUGIN/skills/paseo-cto/scripts/upgrade.py" --check     # report versions only
python3 "$PASEO_CTO_PLUGIN/skills/paseo-cto/scripts/upgrade.py" --dry-run   # print the commands
python3 "$PASEO_CTO_PLUGIN/skills/paseo-cto/scripts/upgrade.py"             # upgrade to the latest
python3 "$PASEO_CTO_PLUGIN/skills/paseo-cto/scripts/upgrade.py" --tag v10.4.0
```

## What ships

Both hosts load the same [skill sources](skills); only invocation syntax, the Codex cache-busting
build suffix and Codex interface metadata differ. References load progressively — status reads the
reporting reference and the work index, dispatch loads the contract reference, the full command
catalog is lookup-only.

- skills `paseo-cto`, `paseo-builder`, `paseo-reviewer`, `paseo-researcher`;
- work-tree schema, templates and `work.py` (`init`, `new`, `status`, `check`, `version`);
- fleet render, runtime check and their validators;
- [Claude](.claude-plugin/plugin.json) and [Codex](.codex-plugin/plugin.json) manifests, with one
  Codex metadata file per skill and no hardcoded Paseo MCP endpoint.
