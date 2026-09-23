# `russian-speech`

Makes the agent write grammatical, engineer-to-engineer Russian technical prose: meaning-first
translation of engineering terms, no literal calques, exact product/API/resource names preserved, no
anthropomorphized components, no colour metaphors for CI/CD state.

The first rule is to comprehend, not translate: internal notes, agent reports and logs (often
compressed English) are never carried into Russian line by line — the message answers what happened,
why it matters to the reader and what comes next, in the writer's own words.

Ships the skill with the normative replacement table (lane → контур, identity → сервисная учётная
запись, reconcile → синхронизировать, gate → проверка, trigger → событие запуска, …), the
engineering status template and the pre-send self-check. All instructions are contained in
[`SKILL.md`](skills/russian-speech/SKILL.md); no additional reference files are required.

In Claude Code a SessionStart hook injects a compact style directive into every session, so the base
register always applies. Codex has no such hook: there the style applies through implicit skill
invocation or explicitly as `$russian-speech:russian-speech`.
