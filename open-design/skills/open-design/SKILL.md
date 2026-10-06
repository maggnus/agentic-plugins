---
name: open-design
description: "Create and refine real project interfaces through OpenDesign with a visible live preview. Use when OpenDesign is requested or a project opts in with .open-design.json; preserve its existing components, design system and acceptance process."
---

# OpenDesign project workflow

Use OpenDesign as the agent conversation and visual review workspace. The repository owns the components, design tokens and acceptance criteria. A preview page embeds the real running application; it is not a second implementation.

## Choose the scope

Read the project's entry point and current task. Coordinate with its active owner before shared writes. Identify the actual UI package, existing preview command, affected states/themes/viewports and the smallest acceptance check. Do not broaden a component task into a redesign or make OpenDesign mandatory for unrelated work.

A project opts in by maintaining `.open-design.json`, described in [configuration](references/configuration.md). A config supplied outside the repository works too. Inspect its commands before running them; configuration is executable project intent, not a permission grant. Do not replace another preview server, invent ports, weaken browser protections, or copy secrets and ignored local files into a workspace.

## Connect and isolate

The helper is `scripts/od_bridge.py` relative to this skill. It requires Python 3.11+, Git, macOS/Linux and a running official OpenDesign **0.24.1**. It needs no Python packages. See [operations](references/operations.md) for installation, connection recovery and limitations.

1. Run `python3 <helper> discover`, then `doctor`. Discovery identifies one desktop instance through process inventory; explicit `connect --daemon <origin> --web <origin>` is the fallback. Never use bare `od` on macOS: that may be the system octal-dump utility.
2. Prefer an isolated worktree when another agent is active. `prepare --repo <repo> --name <name> [--ref <commit>]` creates a normal OD-owned project and populates its directory with a new Git worktree. It reports project, conversation, branch and directory. Dirty sources require an explicit committed ref; uncommitted work and `.env.local` are not copied. Use the project's own dependency/build commands in that directory.
3. An existing OD project selected through its UI can instead be used directly. Supply its id to `up`; the helper obtains its real directory from OD. This edits that workspace in place. Desktop folder-import consent is not bypassed.
4. Run `up --project <id> --config <file>`. It starts only configured services, waits for local readiness and registers a small preview artifact. Open the reported project URL, select the reported `previewFile` under Design Files, then Preview. Tabs choose real project views; Reload view recreates the nested frame; Open separately is the fallback.

## Send bounded work

Use `run --project <id> --conversation <id> --agent <id> --model <model> --prompt-file <file>`, then `wait --run <id> --timeout <seconds>`. The owner/project chooses the model; an existing agent default can be passed explicitly as `default`. Do not imply that an unresolved default identifies the actual model. A wait deadline requests cancellation and reports failure; inspect before retrying. Do not assume mid-turn steering works.

The task must name the outcome, allowed paths, design sources, exclusions and checks. Require real repository-native components, reuse of existing primitives, and examples mounting the same implementation. Tell OD that generic HTML/artifact conventions do not override the project. Source-only output may have no OD artifact card; inspect the Git diff rather than asking for a duplicate mockup. OD may also index build files produced by another process: do not attribute them to its agent.

## Accept and hand over

Check the actual revision and meaningful behavior in the project's renderer. Verify affected themes and viewports, real fonts, loading/error/disabled states as applicable, browser errors and interaction events. For an embedded preview, confirm the application appears **inside OD** and that an actual source change becomes visible; screenshots outside OD do not establish that connection. Frame replacement can reset state. If refresh, fonts or embedding fail, report the limitation and use the direct view until corrected; do not silently claim equivalence to a native design editor.

Preserve project review and owner-acceptance requirements. Do not merge, publish or change API/design authority merely because OD succeeded. Report the source revision, project/view links, observed checks and remaining gaps. Generated preview HTML, its artifact manifest and OD's `.file-versions/` are tooling output, not product code; do not stage them accidentally.

Use `status --project <id>` and `down --project <id>` for services owned by this helper. Down preserves files, worktrees, projects and external servers. Leave a review session running when useful, state that explicitly, and provide its stop command. Installation/distribution rules belong to the plugin repository; never install a local plugin checkout or modify an installed cache.
