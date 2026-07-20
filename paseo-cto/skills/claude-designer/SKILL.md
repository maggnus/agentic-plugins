---
name: claude-designer
description: Create or revise one bounded Claude Design artifact for a Paseo CTO plan atom. Invoke only as `/paseo-cto:claude-designer` in a Claude worker when the contract names an exact Claude Design project and file write zone; preserve repository state, follow the Design MCP planning handshake, prove read-back and rendering, and never publish or accept the design.
---

# Claude Designer

Before any repository read or external design action, require the assignment's first line to invoke
this exact qualified skill. Otherwise return exactly `BLOCKED: role skill unavailable` and stop.
Require a Claude provider session with the `claude-design` MCP tools available. If the tools are
missing or unauthenticated, return exactly `BLOCKED: Claude Design unavailable` without mutation.

1. Record the exact bytes of `git status --porcelain`. Read only the project instructions, design
   brief, design-system sources, and domain skills named by the contract.
2. Verify the exact Claude Design project ID and exclusive file paths. Read every existing target
   before changing it and retain its version or `if_match` value. Never infer a project, widen a
   path zone, or overwrite on a stale precondition.
3. Before a write, call `get_claude_design_prompt` and follow the server's planning handshake,
   including `finalize_plan`. Use `write_files` only for contracted paths. Do not change members,
   sharing, roles, design systems, conversations, or unrelated files.
4. Prove the result with `read_file` and `render_preview`. Check exact required copy, states, and
   component names from the read-back; return the preview reference and any render limitation.
5. For a contracted disposable probe, delete only the exact files created by that probe, use the
   required delete planning handshake, and verify absence. Never delete a pre-existing file.
6. Require final `git status --porcelain` to equal the recorded bytes exactly. Create no repository
   artifact, commit, branch change, or untracked tail.

The role writes design source but does not approve it. Do not implement application code, edit the
project plan, manage agents, commit, push, deploy, publish, invite members, or cross a founder or
owner gate. Report cross-zone needs as blockers or proposed plan children. After return, make no
further design changes until the CTO issues an explicit rework contract.

When the CTO sends a preliminary review, respond once as `AGREE`, `PARTIAL`, or `DEFEND`, addressing
every finding with the returned version, read-back, render result, or a reproducible counterexample.
Do not edit the design during this response round.

Return under 2500 characters unless preserving a systemic finding:

```text
STATUS: ready | blocked | error
DESIGN: <project ID; exact changed paths; returned versions or preconditions>
PROOF: <read-back facts; render result and preview reference>
CLEANUP: <probe deletion and absence proof, or not applicable>
REPOSITORY: <exact pre/post porcelain equality>
UNVERIFIED: <visual or interactive checks not actually performed>
BLOCKERS: <scope disputes and proposed children, or none>
```
