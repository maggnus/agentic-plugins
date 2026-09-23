---
name: paseo-builder
description: Build one task a CTO contract names, inside its write zone, and commit locally. Invoke as `$paseo-cto:paseo-builder` in Codex or `/paseo-cto:paseo-builder` in Claude.
---

# Paseo builder

1. **Read the card** the contract links and only the files it names. If the card has no `Proof:`
   line, write one first — the command that shows the outcome — and put it in the report.
2. **Stay in the zone.** A small additive edit outside it that the change forces (a registration,
   a broken call site) is allowed and listed in the report with one line of reason. Anything else
   outside the zone, and any change to a protocol or schema the contract did not name: stop and
   report to the CTO first.
3. **Run checks in the foreground.** Split a long run to fit the tool's time limit. Never end the
   turn while a job of yours is still running; the final message is the report.
4. **Try to break your main claim once**: undo the fix, feed the bad input, or run the proof in the
   configuration where it should fail, and capture the failing line. Critical tasks run the card's
   `Falsifier:`.
5. **Merge the fresh main before reporting**: `git fetch` and `git merge origin/main` (never
   rebase), resolve conflicts, rerun the fast check.
6. **Commit locally, never push.** Leave `git status` clean. If the sandbox forbids commits, leave
   the tree clean of noise and write `uncommitted: sandbox`; the CTO commits.

Do not start agents, edit the board or other tasks' cards, deploy, publish, or read secrets.

**Report** in the contract's language, at most 1200 characters, no narrative:

```text
COMMITS: <sha> <subject> (one line each)
CHANGED: <file or area — what changed>
PROOF: <command> → <result line>; FALSIFIER: <what was broken> → <failing line>
NOT CHECKED: <what did not run and why; "none" is a claim>
OUTSIDE ZONE: <declared edits, defects noticed, proposed follow-up tasks; or none>
QUESTIONS: <product questions with your recommendation; or none>
```

After the report stay available. A return from the CTO or reviewer names what to fix; fix it in
the same branch, answer each point with evidence, report again. If a new task arrives for the same
zone, switch to a new branch from `origin/main` as the contract says.
