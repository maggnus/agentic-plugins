# Claude/Codex plugins

Personal plugin repository (`maggnus`). `paseo-cto` and `russian-speech` are dual Claude
Code/Codex plugins.

## Install

```sh
PASEO_CTO_TAG=v10.2.0
claude plugin marketplace add "maggnus/agentic-plugins@${PASEO_CTO_TAG}"
claude plugin install paseo-cto@maggnus
claude plugin install russian-speech@maggnus
```

```sh
PASEO_CTO_TAG=v10.2.0
codex plugin marketplace add maggnus/agentic-plugins --ref "$PASEO_CTO_TAG"
codex plugin add paseo-cto@maggnus
codex plugin add russian-speech@maggnus
```

All `paseo-cto` installations use the remote GitHub marketplace pinned to the matching immutable
release tag. A local directory, a moving branch, or an unpinned remote marketplace is not a valid
installation source. The local repository is used for development and validation only.

## Release

### Local (requires Codex CLI tools)

```sh
bash paseo-cto/scripts/release.sh
```

Runs all validation, updates Codex cachebuster, creates the immutable tag, and pushes. Requires
local Codex CLI tools (`~/.codex/skills/.system/plugin-creator/scripts/`), `jq`, and push access
to `origin`.

### Remote (via GitHub API / curl)

Trigger the release workflow from anywhere without a local clone:

```sh
# With explicit version
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/maggnus/agentic-plugins/actions/workflows/release.yml/dispatches \
  -d '{"ref":"main","inputs":{"version":"10.2.0"}}'

# Without version (reads from plugin manifest)
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/maggnus/agentic-plugins/actions/workflows/release.yml/dispatches \
  -d '{"ref":"main"}'
```

Or via `gh` CLI:
```sh
gh workflow run release.yml -R maggnus/agentic-plugins -f version=10.2.0
gh workflow run release.yml -R maggnus/agentic-plugins  # auto-detect version
```

The workflow runs on GitHub Actions: validates, updates Codex cachebuster, commits, tags, and pushes.
Requires a `GITHUB_TOKEN` with `repo` scope (classic PAT or fine-grained with Contents write).

## Plugins

### `paseo-cto` — the external-agent CTO operating model

A project-agnostic CTO organization over external Paseo agents, packaged natively for both Claude
Code and Codex. The CTO delegates by default: it decomposes the work, dispatches isolated
role-skilled agents, and touches code itself only for a trivial change or a bounded
integration-time fix. It manages toward outcomes rather than activity, keeps a living hierarchical
execution plan, moves independent work forward while deepening discovered branches, and preserves
founder, review, integration, push, deploy, and irreversible-operation gates.

**The plugin names no model, no reasoning effort, and no provider preference, and never supplies a
default for one.** Which model and which effort carries which role — the CTO's own seat included —
is the owner's decision, recorded in the project charter's `roleAssignments` and nowhere else. A
role with no assignment is not dispatchable, and an unavailable model is reported rather than
silently substituted. `reportingLanguage` is also project-local and authoritative: any valid local
value, including Russian, overrides the plugin's English first-run proposal and the host's current
conversation language. The register remains formal, neutral, impersonal, grammatical, and
result-first in every configured language. Unchanged prose is never repeated, and an unchanged fleet
table is not reposted either.

The first operating run presents a compact charter for CTO strategy, role assignments, permission
policy, fleet budget, autonomy horizon, review depth, and reporting language. It is persisted per
project at `<git-common-dir>/paseo-cto/SETTINGS.json` and reused across conversation or daemon
restarts, worktrees, run IDs, and Claude/Codex CTO handovers. Writers use isolated workspaces and
local commits. Delegated writes, semantic CTO integration fixes, and closure- or
authorization-bearing reports receive the risk-required non-author review; intermediate research is
source-checked and folded into the next contract. Every durable source reference is pinned to the
exact revision.

Reasoning effort is economical by construction when the owner permits a range: Routine atoms use
the minimum allowed tier, Significant atoms the middle tier, and Critical atoms the maximum.
Validation uses one negative half per load-bearing claim, a changed-surface composition preflight
before an expensive full suite, and one proof owner. Normal worker returns and runtime summaries are
bounded; unrelated tasks start fresh sessions, while bounded rework reuses the author and reviewer
context that still carries valid inspection.

Invoke the CTO skill as `$paseo-cto:paseo-cto` in Codex or `/paseo-cto:paseo-cto` in Claude. Worker
prompts use the same qualified namespace with the platform's own prefix — `$paseo-cto:paseo-<role>`
in Codex, `/paseo-cto:paseo-<role>` in Claude — for `paseo-builder`, `paseo-reviewer`, and
`paseo-researcher`; dispatch fails closed when the plugin is unavailable in the selected worker
family.

Work lives in a permanent file tree. One wave, card, task or subtask is one file, created once at a
path derived from its identifier and never moved: acceptance changes the state and fills the closure
fields in that same file rather than transferring text into a history document. Two committed files
are generated from that tree: `STATUS.md`, the index of every unit, carrying exactly
`Status | ID | Task | Commit | Start | Time` in tree order, and `WAVES.md`, one row per wave with its
outcome, its accepted card count and that share as a percentage, closed by a total row and, when
history was imported rather than frozen, by how much of that total it is. Before the
first dispatch on a new project or wave, the CTO builds the tree and an independent reviewer attacks
the decomposition; a wave whose work started without that verdict fails the check.

A named 15-minute heartbeat reconciles the plan, agents, workspaces, reviews, stalls, and cleanup.
Every heartbeat generates one durable fleet snapshot, `FLEET.md`. The chat receives the full snapshot —
local timestamp; plugin version, CTO model/effort, available host context and session time; current
wave ID and name; accepted/total cards; then the complete fleet table with the CTO first — when a
material event occurred or the owner asks for status, and a single quiet liveness line otherwise, so
a long session does not spend its context restating an unchanged table. Claude and Codex derive the
snapshot from the same installed tag, role assignment, work tree, and runtime state. Recoverable
checkpoints and stable labels allow a fresh or compacted session to resume without replaying
completed work.

```text
# Update <YYYY-MM-DD HH:MM TZ>
paseo-cto: v10.2.0 | Model: openai/gpt-5.6-sol (xhigh) | Session: 1h24m
Wave: [<wave-id>] <wave name>
Cards: <done>/<total>

| Agent | Task | Status | Time | LOC |
| --- | --- | --- | --- | |
```

Ships:

- **skill `paseo-cto`** — the CTO operating loop, outcome discipline, reporting register, onboarding
  charter, living plan, founder status, review gate, fleet lifecycle, provider policy, and the Paseo
  command catalog;
- **work tree tooling** — one schema that fixes identifiers, vocabularies, field sets and section
  order, the templates generated from it, and `work.py` with `init`, `new`, `status`, `check` and
  `version`. The tooling is stamped with the release it came from, so a project's copy cannot fall
  behind the plugin or be edited in place unnoticed. The validator refuses a duplicate or misplaced
  identifier, an unknown state or field, an accepted task
  without a closure commit or evidence, a blocked task without a blocker, a rejected or trigger-gated
  task without a return trigger, a dependency cycle, a parent closed over an open required child, a
  hand-edited index or wave overview, a commit reference that is not an immutable full SHA, and one
  identifier that is live in both the tree and a frozen legacy document;
- **self-upgrade** — [`upgrade.py`](paseo-cto/skills/paseo-cto/scripts/upgrade.py) resolves the
  newest release tag from the remote repository, re-pins both hosts to it, and reinstalls any
  sibling plugin sharing the marketplace; `--check` and `--dry-run` change nothing;
- **status markers** — `[ ]` ready, `[~]` active including review and rework, `[?]` blocked, `[=]`
  paused or trigger-gated, `[!]` withdrawn, `[x]` accepted;
- **document standard and templates** — the invariant registry, the frozen shape of a pre-adoption
  execution document and its acceptance history, plus checks for source links, the exact current-wave
  fleet render, its bounded runtime checkpoint, and the owner-facing reporting register;
- **worker role skills** — `paseo-builder`, `paseo-reviewer`, and `paseo-researcher`;
- **Claude manifest** — [`.claude-plugin/plugin.json`](paseo-cto/.claude-plugin/plugin.json) for
  marketplace installation;
- **Codex manifest and skill metadata** — [`.codex-plugin/plugin.json`](paseo-cto/.codex-plugin/plugin.json)
  and one Codex metadata file in each [shared skill directory](paseo-cto/skills), with no hardcoded
  Paseo MCP endpoint.

Both hosts load the same [skill sources](paseo-cto/skills). Only invocation syntax, the Codex
cache-busting build suffix, and Codex interface metadata differ. The
[distribution synchronization check](paseo-cto/scripts/check-distribution-sync.sh) verifies the
shared descriptions, authors, base versions, marketplace source, skill set, and release tag.
The [installed-release check](paseo-cto/scripts/check-installed-release.sh) additionally verifies
that both host installations resolve the same remote tagged commit.

References load progressively. Project status reads only the reporting reference and the work index;
creating or accepting work loads the work-tree reference; starting a project or a wave loads the
bootstrap reference; ordinary fleet work uses a compact core-command sheet; archival and close load
their own reference; the complete command catalog is lookup-only.

### Project onboarding

A new project needs a charter (`SETTINGS.json`) in the Git common directory. Start from the template:

```sh
cp paseo-cto/skills/paseo-cto/templates/SETTINGS.template.json \
  "$(git rev-parse --git-common-dir)/paseo-cto/SETTINGS.json"
# edit: project slug, roleAssignments (family/provider/effort for cto/builder/reviewer/researcher),
# reportingLanguage, fleetBudget, autonomyHorizon, reviewDepth, permissionPolicy
```

Copy the work tooling into the project and bind `check` to the validation gate:

```sh
mkdir -p scripts
cp paseo-cto/skills/paseo-cto/templates/work.py scripts/
cp paseo-cto/skills/paseo-cto/templates/work-schema.json scripts/
cp -r paseo-cto/skills/paseo-cto/templates/work scripts/work
cp paseo-cto/skills/paseo-cto/templates/check_runtime.py scripts/
cp paseo-cto/skills/paseo-cto/templates/render_fleet.py scripts/
cp paseo-cto/skills/paseo-cto/templates/check-fleet-render.sh scripts/
```

Verify the project's work tooling matches the installed plugin:

```sh
bash paseo-cto/scripts/check-work-tooling.sh
```

### `russian-speech` — literate Russian technical prose

Makes the agent write grammatical, engineer-to-engineer Russian technical prose: meaning-first
translation of engineering terms, no literal calques, exact product/API/resource names preserved,
no anthropomorphized components, no color metaphors for CI/CD state.

Ships:

- **skill `russian-speech`** — the operating rules: mandatory translation principles, the
  normative replacement table (lane → контур, identity → сервисная учётная запись,
  reconcile → синхронизировать, gate → проверка, trigger → событие запуска, …), the engineering
  status template, and the pre-send self-check. The full glossary — false friends and preferred
  forms for CI/CD, GitOps, Kubernetes, GCP, IAM, Git, and testing, with worked examples — loads
  progressively from `references/glossary.md`.
- **SessionStart hook** (Claude Code only) — injects a compact style directive into every
  session, so the base register applies always; the skill and its glossary load on demand for
  long-form reports, reviews, ADRs, and documentation.
- **Codex manifest and skill metadata** — `.codex-plugin/plugin.json` and `agents/openai.yaml`
  in the skill directory. Codex has no SessionStart hook, so there the style applies through
  implicit skill invocation and explicit `$russian-speech:russian-speech`.

It is versioned and installed on its own. It briefly lived inside `paseo-cto` (9.7.0) after a
tag-pinned host could not see it; the cause was a missing release tag, not the packaging, so 9.8.0
separated them again.

## Releasing a change

For `paseo-cto`, keep the base version in the
[Claude manifest](paseo-cto/.claude-plugin/plugin.json) and
[Codex manifest](paseo-cto/.codex-plugin/plugin.json) identical. The automated release script runs
all validation steps, updates the Codex cachebuster, creates the tag, and pushes:

```sh
bash paseo-cto/scripts/release.sh
```

It refuses an existing local or remote tag; bump both manifest base versions before a new release.

The script executes (and commits if needed):
1. Contract tests (`test-plugin-contracts.sh`)
2. Work tooling stamp (`stamp-work-tooling.py`)
3. Codex cachebuster update (`update_plugin_cachebuster.py`)
4. Plugin validation (`validate_plugin.py`)
5. Distribution sync check (`check-distribution-sync.sh`)
6. Tag creation and push

To run manually without pushing:
```sh
bash paseo-cto/scripts/test-plugin-contracts.sh
python3 paseo-cto/scripts/stamp-work-tooling.py
python3 ~/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py paseo-cto
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py paseo-cto
bash paseo-cto/scripts/check-distribution-sync.sh
```

Commit the validated release, create its immutable tag, and push both. Never move or replace a
published release tag.

An existing installation upgrades itself. The plugin ships
[`upgrade.py`](paseo-cto/skills/paseo-cto/scripts/upgrade.py), which resolves the newest release tag
from the remote repository and re-pins both hosts to it, preserving any sibling plugin installed
from the same marketplace. Asking the CTO for `paseo-cto upgrade` runs it:

```sh
python3 <plugin>/skills/paseo-cto/scripts/upgrade.py --check      # report versions only
python3 <plugin>/skills/paseo-cto/scripts/upgrade.py --dry-run    # print the exact commands
python3 <plugin>/skills/paseo-cto/scripts/upgrade.py              # upgrade to the latest release
python3 <plugin>/skills/paseo-cto/scripts/upgrade.py --tag v9.1.0 # pin to one exact release
```

The same sequence by hand:

```sh
PASEO_CTO_TAG=v10.2.0

claude plugin uninstall paseo-cto@maggnus --scope user
claude plugin marketplace remove maggnus --scope user
claude plugin marketplace add "maggnus/agentic-plugins@${PASEO_CTO_TAG}" --scope user
claude plugin install paseo-cto@maggnus --scope user

codex plugin remove paseo-cto@maggnus
codex plugin marketplace remove maggnus
codex plugin marketplace add maggnus/agentic-plugins --ref "$PASEO_CTO_TAG"
codex plugin add paseo-cto@maggnus

bash paseo-cto/scripts/check-installed-release.sh
```

Restart Claude Code and start a new Codex conversation after reinstalling so both hosts load the
tagged skills and metadata.
