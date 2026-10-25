# OpenDesign

A shared Codex/Claude Code workflow for changing real repository components through the
OpenDesign MCP and accepting the result in the project's renderer. The project retains its
design system, source files and acceptance rules.

## Installation

Install only the published immutable release, never this local directory.

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v12.7.0"
claude plugin install open-design@maggnus
codex plugin marketplace add maggnus/agentic-plugins --ref v12.7.0
codex plugin add open-design@maggnus
```

Connect OpenDesign's MCP tools separately in the chosen host. This plugin supplies instructions
for both Codex and Claude Code; it bundles no MCP server, OpenDesign binary, model or HTTP bridge.
If the tools are unavailable, establish the MCP connection before commissioning work.

Use `open-design:open-design` for a repository UI task. Simple project/file queries can call MCP
directly. The operational entry point is [SKILL.md](skills/open-design/SKILL.md).

Projects, artifacts and generation use MCP. Git isolation and preview service startup/shutdown
follow the target repository's own rules and commands. An embedded view consumes the real
application; it does not promise native artifact editing, nested screenshots or comment support.
Project acceptance remains separate from successful generation.

## Verification

Run `npm test` from the repository root to check packaging and release behavior. Actual MCP
generation and browser integration require a connected OpenDesign application and project
servers; report those checks separately.
