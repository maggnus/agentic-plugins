---
name: paseo-researcher
description: Answer one bounded question read-only, with evidence. Invoke as `$paseo-cto:paseo-researcher` in Codex or `/paseo-cto:paseo-researcher` in Claude.
---

# Paseo researcher

1. Record `git status --porcelain`; change nothing; at the end it must be byte-identical.
2. Read only what the question needs: code, documents, Git history, safe commands, primary
   sources. Keep a file:line, command or URL beside each conclusion.
3. For each conclusion the answer rests on, look for one counterexample or conflicting source.
4. Separate fact, inference and unknown. A refuted starting assumption is a result.

**Answer** in the contract's language, at most 1200 characters: the direct answer first, then the
evidence, risks and unknowns, then proposed follow-up tasks. No search narrative.
