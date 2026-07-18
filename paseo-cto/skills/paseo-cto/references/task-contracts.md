# Task contracts

Read this file completely before delegating, reviewing, integrating, or pushing work.

## Assignment contract

Give every agent one bounded atom and write the task message in this order:

1. **Sync first.** Name the repository root, target branch, and frozen baseline. For an agent-owned
   write worktree, require `git status --short --branch`, then the repository's fetch/rebase flow
   before editing. Use `git pull --rebase origin main` only when it is safe for that branch; otherwise
   fetch and rebase the fresh worktree branch onto the named baseline. For a read-only audit of the
   current WIP workspace, synchronization means recording the current HEAD and status—never checkout,
   rebase, clean, or modify the owner's WIP.
2. **Exact spec pointer.** Give the authoritative file plus section or anchor and require it to be
   read completely. Do not replace the source of truth with a prose retelling.
3. **Atom and outcome.** State one testable result, relevant constraints, and any frozen decisions.
4. **Exclusive zone and no-touch zone.** List every writable path and every prohibited path,
   including other agents' areas and CTO-owned deploy/config, docs-of-record, or diagnosed hot paths.
5. **Exact acceptance.** List commands, expected exit codes or measurements, negative cases, and
   required output. For measurement code, require proof that the measurer became more honest, never
   more lenient; do not weaken strict counters.
6. **Commit boundary.** Require the requested local commit shape/message and repository-required
   co-author trailer. State `never push` explicitly.
7. **Result report.** Require the commit hash, concise diff summary, exact commands with real exit
   codes, final `git status --short --branch`, and disputed decisions as a list.

Use this compact task skeleton:

```markdown
Sync first: <repo, worktree/branch, baseline, exact sync checks>
Spec: <path and exact section; read it completely>
Atom: <one machine-checkable outcome>
Write zone: <exclusive paths>
No-touch: <explicit paths and boundaries>
Acceptance: <exact commands, negative cases, expected evidence>
Commit: <local shape/message/trailer>; never push
Report: <hash, diff, commands + real exits, git status, disputes>
```

## Workspace and contract isolation

- Give every substantive write task its own worktree. Do not place two writers in one tree or allow
  overlapping package/file zones.
- Allow a report-only audit to read the current WIP workspace only when its contract forbids all
  writes. Report that the evidence includes uncommitted owner changes.
- If an unexpected shared-tree or file-zone collision appears, stop the affected agent, preserve
  both states, and report it. Integrate the contract/schema wave first, then dependents; let the CTO
  repair lockfile, checksum, generated-file, or script-section collisions deliberately.
- Stop at wire/schema boundaries unless the CTO explicitly authorizes a narrow additive contract
  wave: canonical source plus regeneration in one commit, mechanical edge passthrough by an existing
  neighbor, and a breaking check against the frozen baseline.

## Review and integration gate

The CTO must review independently from the executor:

1. Ingest the report and inspect the exact commit and final agent worktree status.
2. Rerun at least the cheap acceptance commands and personally read risky core changes involving
   auth, money, privacy, data integrity, or measurement.
3. Return only concrete defects, or one line: `accepted without fixes, N/10` or
   `accepted with a CTO fix: <change>, N/10`. An agent may rebut with evidence; the CTO decides.
4. Integrate only the reviewed commit(s), rerun the integration gate, and inspect the CTO tree status.

Return a defect to its originating executor when a follow-up is needed; do not let that agent learn
about its defect only from another agent's commit.

A delegated task ends at a local commit. Never bundle a push into implementation or integration.
When project and owner authority permit a push, enter a separate push gate: invoke
`git log <upstream>..HEAD` alone, review every listed commit and its acceptance evidence, then invoke
the push separately. An informational log inside an `&&` chain is not a gate.

## Paid-for execution lessons

- Start shell chains by changing to the repository root. Preserve the real exit code; never let
  `tail`, a pipe, or a trailing diagnostic turn a failed command into apparent success. Background
  wrappers must capture and print the command exit code, scan the log for `ERROR`, and exit with the
  captured code.
- Gate evidence on image ancestry, not tag equality. Embed the image commit SHA and require
  `git merge-base --is-ancestor <required-fix> <image-sha>` for every commit supporting the verdict.
- Serialize deploy/config/image changes against live evidence runs. A rollout during a run invalidates
  that run; integrate agent-returned config values between runs in CTO-owned commits.
- Treat shared-tree contamination as a correctness failure, not cleanup trivia. Preserve dirty or
  unintegrated worktrees until their state is understood and reported.
- An evidence-gated task closes on a committed green artifact, never on merged code: the measuring
  instrument is not the evidence. Keep failed or diagnostic artifacts out of the docs of record
  unless they document a finding referenced elsewhere, and say explicitly which of the two — the
  instrument or the proof — a verdict actually accepted.
