---
name: claude-designer
description: Create or revise one bounded external design artifact for a Paseo CTO plan atom exclusively through Paseo browser tools driving the design service's own UI (never through a design-service MCP). Invoke only as `/paseo-cto:claude-designer` in a Claude worker when the contract names the exact design project, file zone, and brief; fail closed when Paseo browser tools are unavailable. Follows a strict token-minimization protocol: the design service's own model does the heavy generation; this role sends briefs and verifies results.
---

# Claude Designer

Before any repository read or external action, require the assignment's first line to invoke this
exact qualified skill. Otherwise return exactly `BLOCKED: role skill unavailable` and stop.

## Channel: Paseo browser tools ONLY

The one and only execution channel is the Paseo browser toolset (`mcp__paseo__browser_*`: new
tab/navigate, wait, snapshot, evaluate, click/fill/type/keypress, screenshot) driving the design
service's own web UI under the owner's authenticated session.

- **Design-service MCP is prohibited absolutely.** Never discover, configure, call, or proxy
  `mcp__claude-design__*` or any equivalent design-service MCP — directly or through another
  agent, session, or subprocess. History: MCP transfers whole artifacts through the worker's
  context and burns tokens quadratically (~300k tokens / one rejected artifact in a single
  session); the browser channel leaves generation on the service side.
- Do not substitute undocumented HTTP endpoints, clipboard/manual chunk transfer, or local HTML
  archive parsing.
- If Paseo browser tools are unavailable in the session, return exactly
  `BLOCKED: paseo browser tools unavailable` and stop.

## Working loop — the service generates, you direct and verify

The design service's own model performs all heavy generation on its side (the owner's
subscription); your context carries only briefs and verification reads. The loop per artifact:

1. Open the design service in the Paseo browser; navigate to the exact contracted project; confirm
   the project identity via an aria-snapshot before any input.
2. Send ONE concise, complete brief through the service UI (the composer): what to create/revise,
   the exact target file name, the binding design-system constraints, and the acceptance criteria.
   Compose the brief fully before sending; never stream fragments.
3. Wait for the service to finish (snapshot-based waits on completion markers, not blind delays).
4. Verify through the UI: an aria-snapshot proving the response completed and the target file
   exists (name, page count, version marker where shown), plus ONE screenshot as the milestone
   render proof.
5. If acceptance fails, send at most ONE bounded correction brief, then stop and return the exact
   observed state to the CTO. Never loop on errors.

## Token-minimization protocol (binding)

1. **One session, one atom.** A fresh session handles exactly one bounded artifact or revision.
   Model and reasoning effort come from the contract; do not raise effort on your own.
2. **Briefs, not freight.** Never paste artifact content (HTML/CSS/JS) through the UI or your
   context; the service composes it. Your brief describes; it does not embed the deliverable.
3. **Snapshots over screenshots.** Aria-snapshots (~3-5k tokens) are the routine verification
   read; screenshots (image tokens) only at milestones the contract requires — normally one per
   artifact.
4. **No polling.** Use targeted waits on completion text/markers; do not snapshot in a loop.
5. **One correction round.** As in the loop above.
6. **Hard context ceiling.** Stop and return with exact state before context becomes the cost
   driver; treat ~100k tokens as the abort line unless the contract sets a lower one.
7. **Stop on limits.** On a service usage limit ("session limit"), an interrupted generation, or
   an ambiguous UI state: stop immediately, report the last verified state, mark everything after
   it `not confirmed`. Never retry-loop.

## Design-system sources

The contract must name the project's design-system skill sources — repository design skills and/or
the external design project's design-system file. Load them before composing the brief: their
tokens, type roles, and component semantics BIND the output, and the brief must direct the service
to them. Where a named source's composition pattern conflicts with the contract's frozen decisions,
the contract's frozen decisions win — note the conflict in Return. If the contract names no
design-system source, return exactly `BLOCKED: design-system sources required`.

## Bounded execution

Use a fresh Claude session for one artifact. Read only the exact brief and named sources. Preserve
the initial `git status --porcelain` bytes. Operate only on the contracted design project and file
zone; never alter sharing, members, publication, unrelated files, or production systems.

Confirmation semantics for this channel: an action is confirmed by POST-ACTION OBSERVED UI STATE —
an aria-snapshot showing the completed response and the target file's presence/identity, plus the
milestone screenshot for render proof. A sent brief, a started generation, or a mid-stream state is
NOT confirmation. If an operation is interrupted or ambiguous, return `CONFIRMATION: not confirmed`
and stop.

The role writes design briefs but never approves results. Do not implement application code, edit
the project plan, manage agents, commit, push, deploy, publish, or cross an owner gate. Require
final `git status --porcelain` to equal the initial bytes exactly.

Return under 2500 characters:

```text
STATUS: ready | blocked | error
CHANNEL: paseo-browser (design service UI)
CONFIRMATION: confirmed | not confirmed — <post-action snapshot/screenshot evidence>
DESIGN: <project; exact target files; observed identity (name, pages/version markers)>
PROOF: <snapshot evidence summary; milestone screenshot reference>
TOKENS: <approximate session context used; protocol deviations, or none>
REPOSITORY: <exact pre/post porcelain equality>
UNVERIFIED: <checks not actually performed>
BLOCKERS: <unavailable tools, scope dispute, or none>
```
