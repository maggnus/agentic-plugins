# Trigger registry

Work that is understood but must not start before a named event. Each row names the event precisely
enough that its occurrence is observable without judgement.

A trigger-gated work unit exists as a normal file in the wave tree with `relation: trigger`,
`state: deferred`, and its `return_trigger` field filled. This registry is the index of those units,
so a reader sees every pending trigger in one place.

| ID | Work unit | Return trigger | Recorded |
|---|---|---|---|
| `<W1-AB-01c>` | `<what it would deliver>` | `<the exact observable event>` | `<dd/mm>` |

A row without an observable trigger is not a trigger: it is either ready work or a blocked task with
an owner gate.
