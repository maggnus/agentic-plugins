# Agent development and platform boundaries

Reviewed: 2026-10-03. Runtime instructions describe generic roles, evidence and transitions. The host integration below concerns packaging and evaluation, not a dependency of the method.

## Failure model

| Mechanism | Observable failure | Method response | Residual limitation |
| --- | --- | --- | --- |
| Bounded or stale context | A requirement, consumer or revision is omitted | Investigate from the scenario, carry source references, reconcile after interruption | Unknown dynamic or external consumers can remain undiscovered |
| Semantic coupling | Isolated file edits implement incompatible contracts | Order contract changes and verify the combined result | Isolation does not establish compatibility |
| Correlated reasoning | Author and reviewer repeat the same assumption | Use independent context and executable expected behavior | Independent sessions are not statistically independent errors |
| Verification substitution | Compilation or an author report is presented as acceptance | Exercise the contracted outcome and discriminating failures | Test coverage can still miss unmodeled behavior |
| Resource and coordination limits | Review queues, waiting and corrections grow | Bound in-flight outcomes and reduce concurrency | Optimal concurrency remains project-dependent |
| State loss | Completed work is repeated or partial work is reported as finished | Reconcile revisions, records and observed process results | An inaccessible process or missing artifact remains unverified |
| Untrusted content | Repository or retrieved text attempts to redefine the task | Preserve the instruction hierarchy and treat retrieved material as task data | Detection and host isolation are not proved by prose instructions |

This model adapts the failure categories in [the foundations register](FOUNDATIONS.md). It is an assessment framework, not a complete safety guarantee.

## Packaging for the two required platforms

Observed local versions before evaluation: Codex CLI 0.159.2; Claude Code 2.1.285.

- Codex documentation supports skills with `SKILL.md` and optional resources; existing `.codex-plugin/plugin.json` remains a supported packaging fallback. This repository uses that format and a shared `skills/` directory. [Official packaging reference](https://developers.openai.com/plugins/build/plugins), [skill documentation](https://learn.chatgpt.com/docs/build-skills).
- Claude Code discovers `skills/<name>/SKILL.md` under the plugin root. The manifest is stored under `.claude-plugin/`; operational materials remain outside that metadata directory. [Official manifest reference](https://code.claude.com/docs/en/plugins-reference).
- Agent context separation does not imply write isolation. Use the host's actual capabilities and verify the workspace and base revision. Claude Code's isolation options and startup behavior are documented separately; Codex guidance also distinguishes independent reading from concurrent writing. [Claude Code subagent reference](https://code.claude.com/docs/en/sub-agents), [Codex subagent reference](https://learn.chatgpt.com/docs/agent-configuration/subagents).

The shared skill does not prescribe product-specific orchestration calls, model identifiers or an external service. Included roles can be read as source instructions during development validation. That is not plugin installation or registration. Installation tests occur only after publication, from the immutable GitHub release tag through platform-supported commands.

## Minimum execution contract

Record required behavior, invariants, consumers, exact base, permitted writes, checks, limits and authorization. A delegate receives only relevant source artifacts and returns observations bound to a revision. If delegation is unavailable, the main role performs implementation and ordinary assessment; critical acceptance remains unverified without the required independent evidence.

Data, schema and infrastructure transitions additionally require compatibility and recovery observations. Restart information identifies current requirements, revisions, incomplete processes, evidence and next action. No report infers completion merely from elapsed time or the end of an agent turn.
