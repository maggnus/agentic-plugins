# Operating charter

Read this file completely before the first `operate` run and whenever the owner asks to reconfigure
the CTO session.

## When to ask

Run the questionnaire only when no binding charter exists, the owner explicitly requests
reconfiguration, or provider capabilities changed enough to invalidate the selected models. Do not
ask during `inspect`, `review`, project-status reporting, context recovery, or an ordinary resume.
Do not create agents, workspaces, heartbeats, commits, or plan mutations until the first charter is
confirmed.

Use the host's native multiple-choice interface when available; otherwise show the same choices as
a compact numbered list. Ask at most three questions per screen. Discover providers, models,
reasoning settings, and permission modes through Paseo before presenting choices. Never offer an
unavailable value. If one provider family is unavailable, record that fact and skip its model
question.

## Questionnaire

Present them in three screens (`1–3`, `4–6`, `7–8`) and collect:

1. **CTO strategy** — `alpha`, `beta`, or `stable`. This remains internal to the CTO. Recommend one
   from project evidence and put that option first.
2. **GPT model** — two or three strongest currently allowed Codex/OpenAI choices, with the preferred
   tuple first.
3. **Claude model** — two or three strongest currently allowed Anthropic choices, with the preferred
   tuple first.
4. **Reasoning policy** — offer only efforts supported by the selected models:
   `balanced` (high writers/researchers, strongest reviewers), `uniform-high`, and `maximum`.
5. **Permission policy**:
   - `role-safe` — strongest available read-only/plan mode for reviewers and researchers; the
     provider's auto-review/auto-edit mode for builders and leads;
   - `always-ask` — builders/leads ask before writes or actions; reviewers/researchers remain in the
     strongest read-only/plan mode;
   - `full-access-writers` — full/bypass mode for builders and leads, read-only/plan mode for
     reviewers and researchers.
6. **Fleet budget**:
   - `balanced` — four external live agents: three writers and one review reserve;
   - `conservative` — three external live agents: two writers and one review reserve;
   - `capacity` — offer only when a positive numeric owner/platform limit is known; otherwise ask
     for an exact positive `max_live`, then reserve one slot for review.
   The CTO does not count toward `max_live`.
7. **Autonomy horizon**:
   - `until-gate` — continue safe ready work until completion or a founder/external gate;
   - `one-wave` — finish the current execution wave and stop cleanly;
   - `named-scope` — operate only the explicitly named plan nodes.
8. **Independent review depth**:
   - `risk-based` — use an independent reviewer for medium/high-risk or disputed work;
   - `every-write` — independently review every delegated write before CTO review;
   - `cto-only` — mandatory CTO review without a separate reviewer unless the CTO escalates.

The following are standing rules and are not questionnaire choices:

- the CTO reviews every delegated write;
- the reconciliation heartbeat runs every 15 minutes while work remains;
- agents commit locally and never push;
- push, deploy, publication, live mutation, money, and irreversible actions remain separate gates;
- critical security, privacy, authorization, and data-integrity risks are never deferred by strategy.

## Persist and confirm

Resolve each provider/role `settings.modeId` with `inspect_provider`; never hardcode mode names or
IDs. Write the accepted charter, including exact models, reasoning settings, mode mapping, fleet
limits, strategy, horizon, review depth, and confirmation date, into the durable execution plan or
project configuration. Keep operational state in the runtime checkpoint described in
`execution-plan.md`, not in this configuration. Do not create a global Paseo preferences file.

Echo one compact confirmation before mutation:

```text
CTO charter: alpha | GPT <model> | Claude <model> | balanced reasoning | role-safe | 4/3+1 external fleet | until-gate | risk-based review
```

On resume, read this line and proceed. Ask only for a missing decision that materially blocks safe
operation. The owner may change one field without repeating the whole questionnaire.
