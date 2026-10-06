# OpenDesign

A shared Codex/Claude Code workflow for changing real repository components through OpenDesign
and viewing the existing application inside its preview pane. The project retains its design
system, source files and acceptance rules. This plugin does not replace the renderer with HTML mocks.

The included Python helper connects to an official local OpenDesign 0.24.1 installation, creates
an isolated Git worktree when wanted, starts project-declared preview services, registers a tabbed
preview artifact, runs bounded agent tasks and stops only its own processes. It uses Python 3.11+
and Git on macOS/Linux, with no Python dependencies. Native Windows lifecycle support is not claimed.

## Installation

Install only the published immutable release, never this local directory.

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v12.2.0"
claude plugin install open-design@maggnus
codex plugin marketplace add maggnus/agentic-plugins --ref v12.2.0
codex plugin add open-design@maggnus
```

Ask the agent to use `open-design:open-design` for a repository UI task. Projects may opt in by
maintaining `.open-design.json`; no global rule forces every design task through OD. The operational
entry point is [SKILL.md](skills/open-design/SKILL.md), with configuration and recovery references.
OpenDesign itself is obtained separately from its official release and uses the owner's selected
agent/model. No API key, model subscription, MCP server or OpenDesign binary is bundled.

## Verification

```sh
python3 -m unittest discover -s open-design/tests -v
```

Tests exercise real local process startup/shutdown and failure rollback, occupied-port isolation,
stale process identity, config boundaries, safe preview serialization and clean Git worktree creation.
They do not contact a model or install the plugin. A release also runs the repository's `npm test`.
Actual OD/browser integration needs a running desktop instance and project servers; report that
separately from unit tests. Embedding is not a promise that OD's element editing, nested screenshots
or comments work identically to its native HTML artifacts.
