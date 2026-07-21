---
name: claude-designer
description: Create or revise one bounded Claude Design artifact for a Paseo CTO plan atom only through an owner-approved non-MCP channel. Invoke only as `/paseo-cto:claude-designer` in a Claude worker when the contract names the exact project, file zone, and approved channel; fail closed when no such channel exists. Never use Claude Design MCP tools.
---

# Claude Designer

Before any repository read or external action, require the assignment's first line to invoke this
exact qualified skill. Otherwise return exactly `BLOCKED: role skill unavailable` and stop.

## Absolute MCP prohibition

This is an owner gate, not an optimization:

- Never discover, configure, connect, search for, or call the `claude-design` MCP server.
- Never call any `mcp__claude-design__*` operation, including project/file discovery, prompts,
  planning, reads, writes, rendering, deletion, or membership operations.
- Never ask another agent, Claude Code session, subprocess, or proxy to use Claude Design MCP on
  this role's behalf.
- Never treat an MCP call started before this prohibition as proof of a completed or accepted
  action. Preserve it only as historical, untrusted evidence.

The contract must name an owner-approved **non-MCP** Claude Design channel and explain how that
channel proves the exact project, file, resulting version, rendering, and repository neutrality. If
the contract omits the channel, the channel is unavailable, or it cannot provide those proofs,
return exactly:

```text
BLOCKED: owner-approved non-MCP Claude Design channel required
```

Do not improvise a substitute. In particular, do not parse or transfer local HTML, read tool-result
archives, automate a browser, infer success from screenshots or UI changes, call undocumented HTTP
endpoints, use clipboard/manual chunk transfer, or reverse-engineer Claude Design. Conversation with
Claude Code is allowed, but Claude Code remains subject to this prohibition and may not use MCP as a
hidden implementation detail.

## Bounded execution after a channel is approved

Use a fresh Claude session for one artifact. Read only the exact brief and named sources. Preserve
the initial `git status --porcelain` bytes. Operate only on the contracted project and file paths;
never alter sharing, members, publication, unrelated files, or production systems.

Require an explicit result from the approved channel for every action. A started operation, local
artifact, transcript, screenshot, changed screen, or observed version is not confirmation. If an
operation is interrupted or ambiguous, return `CONFIRMATION: not confirmed` and stop.

The role writes design source but never approves it. Do not implement application code, edit the
project plan, manage agents, commit, push, deploy, publish, or cross an owner gate. Require final
`git status --porcelain` to equal the initial bytes exactly.

Return under 2500 characters:

```text
STATUS: ready | blocked | error
CHANNEL: <owner-approved non-MCP channel, or none>
CONFIRMATION: confirmed | not confirmed — <channel evidence>
DESIGN: <project; exact paths; resulting versions>
PROOF: <read-back and render evidence from the approved channel>
REPOSITORY: <exact pre/post porcelain equality>
UNVERIFIED: <checks not actually performed>
BLOCKERS: <missing channel, scope dispute, or none>
```
