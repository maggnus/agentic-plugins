---
name: open-design
description: "Develop real repository interfaces through the OpenDesign MCP while preserving project components, design tokens and acceptance rules. Use for OpenDesign UI development and review; simple project or file queries can use MCP directly."
---

# OpenDesign project workflow

Use the connected OpenDesign MCP for project context, files and generation. The repository owns the components, design tokens and acceptance criteria. A preview consumes the real application; it is not a second implementation.

## Establish context

Read the repository entry point and current task. Identify the canonical UI package, existing preview commands and affected states, themes and viewports. Coordinate with the active owner before shared writes. A separate conversation does not establish file isolation; follow the repository's rules for separate worktrees and integration.

Discover the available MCP tools and follow their current schemas. For the design the user has open, use active context; for an explicitly selected project, resolve it once and pass its exact id in subsequent calls. Prefer `get_artifact` for an entry file and its dependencies, `get_file` for a known file, and `search_files` for locating content. Use `get_project` when the local source directory is needed. Do not infer project paths from names.

The MCP connection is supplied separately by OpenDesign. If it is unavailable, report the missing connection; do not substitute private HTTP requests, scrape application state or install a local bridge. This plugin bundles no MCP server or application.

## Commission bounded work

For generation, follow the MCP brief workflow; skip questions only when the user has asked to do so. Preserve the user's chosen execution mode and model. Discover available agents rather than guessing runtime identifiers. For OpenDesign Cloud, use the MCP sign-in workflow and distinguish authentication from usable allowance; never infer funding or model availability from sign-in alone.

The prompt names the outcome, allowed paths, design sources, exclusions and checks. Require canonical repository components and previews that mount the same implementation. Project instructions outrank generic artifact conventions. Do not copy secrets or ignored local configuration into an OD project.

Use `start_run` with a stable `requestId` generated once per confirmed action. After a lost response, reuse the same id and payload; do not create another run while the original is in progress. Poll `get_run` every 30–60 seconds and keep the user informed. A waiting deadline ends observation, not the run: cancel only at the user's explicit request. Follow the MCP recovery instructions for failures.

The available `start_run` schema may not support selecting a conversation. If the task requires a specific existing conversation, establish that the connected tools support it before starting; do not silently create a replacement conversation.

## Preview and accept

Use the repository's existing commands to start, inspect and stop its preview services. Reuse an available application view; do not replace another session's server or introduce a parallel process manager. If a preview wrapper is needed, register it through `create_artifact` and have it embed the existing application without copied styling or components. Keep generated artifacts out of product commits. Do not weaken browser protections to make embedding work.

Verify the actual revision in the project's renderer: affected themes and viewports, fonts, meaningful interaction states, browser errors and events. For an embedded preview, confirm that the application appears inside OD and that a real source change becomes visible. If embedding fails, report the limitation and use the direct view; nested editing, screenshots and comments are not guaranteed to behave like native artifacts.

Source-only work may have no artifact card; inspect the Git diff instead of requesting a duplicate mockup. Build files may come from another process, so do not attribute them to the OD agent without evidence.

Preserve project review and owner acceptance. Report the source revision, project/view links, observed checks and remaining gaps. Leave useful review services running and identify their repository-owned stop command. Plugin changes belong in its source repository and published releases, never in the installed cache.
