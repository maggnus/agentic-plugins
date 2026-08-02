# Source references

Read this file before writing or checking a plan card, acceptance row, review finding, research
conclusion, decision record, or other durable technical evidence.

## Evidence is linked to exact source

Every mention of a repository commit or file that supports a claim is a Markdown link to source
code. Link text stays concise; the target carries the exact identity.

- **Commit:** link the short SHA to the canonical forge page for the full SHA.
- **File:** link the repository-relative path to the file at the exact reviewed or accepted commit.
- **Line evidence:** add the forge's line or line-range fragment to the commit-pinned file URL.
- **Several sources:** link each commit or file separately. Do not hide several source identities
  behind one generic label.

```markdown
[a1b2c3d](https://github.com/example/project/commit/a1b2c3d4...)
[`src/queue/worker.go`](https://github.com/example/project/blob/a1b2c3d4.../src/queue/worker.go#L41-L63)
```

A branch URL is navigation, not evidence: the branch can move after authorization. A repository-
relative file link is acceptable only for explanatory navigation that makes no historical claim.
Evidence uses a commit-pinned URL.

## Resolve the source base once

Bind the canonical HTTPS source repository URL from project truth or the accepted Git remote before
the first durable source link is written. Record that binding in the plan's rules or existing project
configuration; do not infer a different host per card.

Local commits still use the canonical commit URL constructed from their full SHA. Mark the link
`local-only until push` while the owner push gate remains closed. The target may not resolve on the
forge until the authorized push, but its identity is stable and must not be replaced with a branch
link.

## Scope and exceptions

This rule applies to source mentions used as evidence, current-state support, closure records, or
technical findings in tracked documentation and archive-worthy reports. It does not turn commands,
schema field names, placeholder paths, or filenames discussed only as format examples into evidence.
Code fences may show syntax, but a source claim outside the fence still requires a link.

The following are invalid durable evidence:

```markdown
Fixed in a1b2c3d.
See `src/queue/worker.go:41`.
Evidence: Git.
```

The following is valid:

```markdown
The close path is serialized in
[`src/queue/worker.go`](https://github.com/example/project/blob/a1b2c3d4.../src/queue/worker.go#L41-L63)
and accepted by [a1b2c3d](https://github.com/example/project/commit/a1b2c3d4...).
```

The reference check supplied with the document templates catches mechanically recognizable bare
SHAs and paths. Passing that check does not prove that a link points to the correct revision; the
reviewer verifies target, SHA, path, and line range as part of the evidence review.
