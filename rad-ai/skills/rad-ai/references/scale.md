# Broad dependency surfaces

Start at the scenario entry point and current architectural constraints. Trace implementation, contracts, consumers, configuration, data and checks. Investigate incrementally, including dynamic calls, events and external consumers. Record unknown dependencies.

Partition by stable module boundaries. Changes to one semantic contract remain ordered even when files differ. Keep cross-module decisions with the coordinator and give implementers bounded context with source references. Add coordination levels only for measured integration load.

Check behavior locally, then affected contracts and consumers, then the combined result. Shared infrastructure and unknown impact widen the required investigation. Plan mixed-version compatibility and recovery for schema transitions; reversal may be unavailable.

Across cycles, inspect new coupling, duplication, rework and the cost of subsequent change. Uncontracted refactoring is separate work.

Record tested scale using authored code, modules, dependency surface and check duration. A bounded task in a large repository supports that scenario, not a general scalability claim.
