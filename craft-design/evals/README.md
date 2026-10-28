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

## Follow-up: task-dependent design decisions

`2026-10-29-decisions.json` records a separate v12.8.0 baseline trial with four
fresh GPT-6-Astra medium generations. Its candidate replaced universal expressive
thesis/memorable-move requirements with task-dependent reading/decision guidance.
The same independent reviewer, blinded to conditions, preferred the baseline
staffing screen and the candidate festival poster, both by moderate margins.
The instruction candidate was **not promoted**: this mixed result does not establish
a general benefit, and the operational result does not support the motivating
hypothesis. Both conditions needed layout refinement. The exact briefs, frozen
reference hashes, candidate patch and final artifact hashes are recorded; tools added in this
release were excluded from the design comparison. The same small-sample and
procedural-isolation limitations apply. There was no held-out model-generation
test of these proposed rules after the mixed result.

Separately, `check-contract.mjs` covers readiness deadlines, missing/hidden text,
visibility overrides, frame content, dimensions, runtime errors and input-file
protection. Independent review found five defects in display/deadline checks and file protection;
their reproductions now form regression tests. The explicit desktop mode and content assertions were also
applied locally to saved native component artifacts with their original runtime.
This verifies bounded rendering behavior, not the published editor DOM, external
design-system updates, interaction-state preservation or a general aesthetic gain.

## Architecture probes: inputs, decisions and independent observation

`2026-10-29-architecture.json` preserves three new briefs, exact conditions and
artifact hashes. Seven fresh GPT-6-Astra medium generations explored a shared
executable facts model, a raster composition proposal translated to editable HTML,
and a decision representation with rendered boundary checks. The latter also had
an ordinary-process control with the same extra boundary checks.

The facts-model condition did not beat the ordinary process on the requested
frames or explicit revision. Changing only authoritative inputs exposed a gap:
correct arithmetic coexisted with an incorrect positive arrival glyph and fare-
difference label. An independent screenshot-only reader found both contradictions;
geometric inspection correctly made no semantic claim. A selected-A capacity
probe exposed a similar access-label gap, outside the original static-C scope.

On the held-out quota task, ordinary generation, explicit decision representation
plus boundary checks, and boundary checks alone all passed 11 input cases at two
viewports. An independent anonymized audit examined all 66 recorded text/control
results and 15 PNGs, with no substantial violations. The separate representation
is therefore **not mandated**. A single blind poster comparison slightly preferred
the raster-guided result for readability, while preferring ordinary generation for
coherence and distinctiveness. Raster-first design is **not made a default**.

The promoted tool is a bounded scenario-application capability, not a taste score:
`--scenario` lets an artifact-owned preview adapter receive explicit input before
the existing capture/contracts. This avoids writing a new browser driver for each
variable-data prototype. `check-scenario.mjs` covers application, asynchronous
completion, fresh inputs/viewports, ordering, failures, deadlines and file safety.
Conditional guidance connects meaningful visible states to their conditions and
supports an authorized independent readback when understanding is uncertain.

This remains exploratory: one generation per condition, one visual judge, no hard
equal compute budget, procedural isolation, Codex-only generation, no human user
study. It neither establishes an architectural ceiling nor a general aesthetic
gain. Rendered candidate search, preference-calibrated evaluation and memory remain
unproven alternatives; the absence of tests for them is not evidence of exhaustion.
