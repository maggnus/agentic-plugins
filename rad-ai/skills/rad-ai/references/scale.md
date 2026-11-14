# Broad dependency surfaces

When a repository exceeds single-session context or an outcome touches shared modules, schemas, events or external consumers, expand investigation from the scenario outward instead of reading the whole repository blindly.

## Scoped investigation

1. **Entry to boundary trace**: start from the user/consumer entry point, trace direct call paths, module interfaces, configuration flags, data schemas and existing checks.
2. **Indirect coupling**: search for dynamic dispatch, reflection, registries, background jobs, event subscribers, templates, CLI wrappers and external consumers; record any unresolved dependency explicitly in the contract before editing.
3. **Bounded implementer context**: keep cross-module tradeoffs at coordination level and hand each implementer only the files, contracts, invariants and consumer checks relevant to its write zone.

## Partitioning and ordering

- **Semantic over file isolation**: separate files can still share one semantic contract, lock, port, queue or table. Order shared contract, protocol and schema changes as their own outcome **before** consumer outcomes.
- **Workspace discipline**: run concurrent writers only in isolated Git worktrees with disjoint write zones and non-overlapping runtime resources; serialize writes in a shared checkout. Cap concurrency by review and integration capacity: if review queues or merge conflicts grow, reduce parallel outcomes.
- **Mixed-version transitions**: for persistent data, public APIs or rolling deployments, state the compatibility window (expand -> migrate/dual-read -> contract), invariant checks on live/fixture data and an explicit recovery path when ordinary code rollback cannot undo state changes.

## Cross-cycle architecture health

- Verify local behavior, all identified consumers and the integrated revision separately; branch-level pass never proves combined compatibility.
- Keep uncontracted refactoring out of feature or fix diffs; open a dedicated outcome when coupling or duplication raises change cost.
- Record measured scope per trial or stage (touched modules, consumer count, check runtime); one bounded change validates only the exercised dependency surface, never the entire system.
