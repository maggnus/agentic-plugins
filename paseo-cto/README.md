# `paseo-cto`

A CTO for a small team of isolated Paseo agents, packaged for Claude Code and Codex. It dispatches
plan tasks to builders in their own worktrees, accepts their work by risk, lands each accepted
branch with one command, watches the rollout, and reports one status line. It is built for a fast
loop: land on acceptance, run the full suite after the push, fix forward.

Invoke it as `$paseo-cto:paseo-cto` in Codex or `/paseo-cto:paseo-cto` in Claude. The worker roles
`paseo-builder`, `paseo-reviewer` and `paseo-researcher` use the same namespace on both hosts, and a
contract carries the plugin path so a worker can read its role file when the host does not load it.
Operating needs a Paseo agent seat.

## What it keeps small

- **One instruction per role.** The CTO skill is one file; each worker role is under sixty lines.
- **One record of task state.** The project's board has one row per task — state, outcome,
  commit. No generated index, no journal, no scores.
- **Review by risk.** Routine work is accepted by reading; significant work by running the card's
  `Proof:`; only critical work (protocol, access, privacy, data loss, irreversible) gets one
  independent reviewer, one round.
- **Landing is a script.** [`scripts/land.py`](scripts/land.py) merges into a temporary worktree,
  runs the project check, marks the board, pushes, waits for the rollout and prints one line. A
  conflict goes back to the author.
- **Agents stay useful.** Checks run in the foreground; the same builder takes the next task in its
  zone; documentation is written by the CTO, not by agents.

## One layout for every project

`templates/work/` holds the files a project's work directory starts from: `BOARD.md` (a table per
group, one row per task: mark `[x]` `[~]` `[!]` `[=]` `[ ]`, task linked to its file, outcome,
commit, time of the last change), `TASK.md` (the shape of `tasks/<id>.md`), `ROADMAP.md`,
`WORKFLOW.md` and `FINDINGS.md`. [`scripts/check-board.py`](scripts/check-board.py) keeps the board
honest and [`scripts/board-status.py`](scripts/board-status.py) prints the owner's status line.

## Project settings

`<git-common-dir>/paseo-cto/SETTINGS.json`, shared by every worktree of the repository:

```json
{
  "roleAssignments": {
    "cto":      {"provider": "<provider/model>", "thinking": "<level>"},
    "builder":  {"provider": "<provider/model>", "thinking": "<level>"},
    "reviewer": {"provider": "<provider/model>", "thinking": "<level>"},
    "researcher": {"provider": "<provider/model>", "thinking": "<level>"}
  },
  "reportingLanguage": "<language>",
  "land": {
    "board": "docs/BOARD.md",
    "check": "make ci-fast",
    "boardCheck": "python3 scripts/check-board.py",
    "busy": "<exits 0 while a release runs>",
    "watch": "<waits for the rollout; exit 0 means success>"
  }
}
```

The plugin names no model and supplies no default; the owner fills `roleAssignments`.

## Upgrade

```sh
python3 "$PASEO_CTO_PLUGIN/skills/paseo-cto/scripts/upgrade.py" --check     # report versions only
python3 "$PASEO_CTO_PLUGIN/skills/paseo-cto/scripts/upgrade.py"             # upgrade to the latest
python3 "$PASEO_CTO_PLUGIN/skills/paseo-cto/scripts/upgrade.py" --tag v12.0.3
```

## What ships

- skills `paseo-cto`, `paseo-builder`, `paseo-reviewer`, `paseo-researcher`, with one Codex
  metadata file each;
- `scripts/land.py`, `scripts/check-board.py`, `scripts/board-status.py` and their test in
  `scripts/test-plugin-contracts.sh`;
- `templates/work/` — the board, task, roadmap, work rules and findings files;
- [Claude](.claude-plugin/plugin.json) and [Codex](.codex-plugin/plugin.json) manifests.

A Codex builder needs write access to the repository's Git common directory to commit inside its
sandbox; where it cannot, it reports `uncommitted: sandbox` and the CTO commits when landing.
