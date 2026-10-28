# Design-process evaluation

These are maintainer evaluations, not additional instructions loaded by the skill.
`cases.json` preserves the exact English briefs. `2026-10-29-results.json` records
conditions, outcomes and artifact hashes; generated pages and images remain in the
owner's experiment workspace rather than inflating the distributed skill.

The October 29 trial used fresh Codex/GPT-6-Astra medium agents: three baseline /
first-candidate pairs (settings, dispatch board, poster), then a held-out document
pair with the revised release candidate. One independent reviewer saw anonymized
PNGs and the briefs, not source, version identities or design decisions.

The first candidate lost all three pairwise preferences by small margins. Requiring
two or three compositions did not demonstrate a benefit and was removed from the
release; comparison remains optional for a concrete unresolved tradeoff. The revised
candidate won the document preference by a small margin. Neither result establishes
a general aesthetic improvement: one generation per condition, one judge, no hard
token/time cap, procedural rather than OS-enforced read isolation. The first trial
changed several factors, so it cannot identify the effect of each instruction.

All eight designs produced the requested frames. Browser inspection and visual
review found no geometric failures in those frames. This does not establish full
brief compliance or interaction accessibility. Generation was tested in Codex;
Claude Code shares the same packaged files but was not a generation condition.

Separately, `node craft-design/scripts/check-inspection.mjs` runs positive and
negative browser fixtures for clipping, legitimate positioned/scrolling content,
mobile viewport expansion, names, fonts, images, click states and evidence hashes.
Independent code review caught four initial defects and a missing individual-CSS-
transform case; fixes and regressions are included. These objective checks support
the inspector's bounded claims, not a claim to measure design quality. Browser
fixtures are explicitly skipped in hosted CI under the existing package policy;
the recorded local run executed them in Chrome.

For a later trial, freeze each skill package and use fresh, disjoint workspaces.
Keep the task and model/effort equal within a pair. Review images blind, separating
task violations from preference, and preserve unsuccessful outcomes. Test any rule
derived from examples on a different task; do not show comparison outputs to
generating agents. Do not turn a small exploratory win into a universal rule.
