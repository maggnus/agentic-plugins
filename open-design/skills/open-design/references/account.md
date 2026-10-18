# Accounts and Hosted availability

Use the running desktop application's read-only account/catalog APIs through
`python3 <helper> account --refresh`, after `discover` or explicit `connect`.
The initial catalog can be stale while a remote refresh is in progress. A false
`modelCatalogFresh` means unverified availability, not an empty entitlement list.
Run `account` again after the existing refresh finishes. A fresh enabled model is
not a guarantee that every request fits the remaining balance or allowance.

The relevant distinctions are:

- **Registration:** an account exists; it may not be signed in on this machine.
- **Authenticated desktop session:** the application can read that account's
  current plan and catalog. Reauthorization may still become necessary.
- **Hosted funding:** a balance, promotion or paid allowance determines what can
  actually run. Free does not promise recurring model credits. A zero wallet
  alone does not prove that a paid plan's separate allowance is exhausted.
- **Selected agent/model:** local CLI, Hosted and a user-supplied provider key are
  different execution choices. Preserve the owner/project's choice; do not
  silently replace it just because Hosted became available.

Hosted reduces initial provider configuration when usable credits are available.
Subscription API access and hosted image models are plan/model dependent; do not
create or export an API key merely to inspect them. Publishing and cloud project
synchronization are separate actions, not a side effect to enable while checking
sign-in. The account check does not establish faster rendering, better visual
quality, full offline operation or exemption from preview sandbox restrictions.

Official sources checked on 2026-10-18:

- [0.25.0 release notes](https://open-design.ai/updates/): Hosted opens after
  sign-in; Local AI/API Key remain available. A paid allowance can permit work
  even with a zero wallet. Cloud updates require confirmation before replacing
  local work.
- [Pricing and account FAQ](https://open-design.ai/pricing/): current plan/API
  access, model allowances and Free/BYOK distinctions. Read these afresh for
  recommendations; do not freeze prices or model entitlements into this skill.

The generic [FAQ](https://open-design.ai/faq/) still contains older statements
that there are no subscriptions. For current account behavior use the installed
version, live account status and current pricing/release notes instead.
