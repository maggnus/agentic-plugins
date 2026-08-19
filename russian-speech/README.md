# `russian-speech`

Makes the agent write grammatical, engineer-to-engineer Russian technical prose: meaning-first
translation of engineering terms, no literal calques, exact product/API/resource names preserved, no
anthropomorphized components, no colour metaphors for CI/CD state.

Ships the skill with the normative replacement table (lane → контур, identity → сервисная учётная
запись, reconcile → синхронизировать, gate → проверка, trigger → событие запуска, …), the
engineering status template and the pre-send self-check; the full glossary for CI/CD, GitOps,
Kubernetes, GCP, IAM, Git and testing loads on demand from
[`references/glossary.md`](skills/russian-speech/references/glossary.md).

In Claude Code a SessionStart hook injects a compact style directive into every session, so the base
register always applies. Codex has no such hook: there the style applies through implicit skill
invocation or explicitly as `$russian-speech:russian-speech`.
