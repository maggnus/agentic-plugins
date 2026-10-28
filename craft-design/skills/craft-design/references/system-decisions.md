# Related screens and design decisions

Use for several screens of one product, component work or an explicitly requested
update to design guidance. An existing product's code, rules and components win;
extend their records rather than creating a competing system.

## Components carry meaning

Reuse the active system's component inventory. For a repeated component or a
decision whose consistency matters, record only what the existing system leaves
open: purpose, when to use it, relevant states and transitions, action placement,
phone adaptation and which properties stay invariant. Identify the source as
product code, a library example or an authored decision. Static frames show the
requested states; they do not require implementing all transitions.

Keep a small frame list alongside the artifact (or in its existing spec): stable
id, entry URL/fragment, viewport, theme and state. Capture those states at their
real sizes. After changing a shared component, check its affected frames and
themes. A shared palette alone does not prove component consistency. Do not
add machinery or a separate file for a single simple screen.

For a shared-component change, connect its source to the affected frame ids in
that existing list. Record the starting revision and the properties that must
change or remain invariant, including instance overrides. Change the shared source
once, then check every affected instance in the requested themes/states against
those expectations. Similar screenshots alone do not prove shared implementation;
a source diff alone does not prove propagation. `inspection.md` describes explicit
content/size checks for rendered frames; use the project's own tests for properties
and states they do not cover. Report which dependencies or states remain unchecked.

## Learn from confirmed changes

Existing preview comments identify elements; resolving a comment fixes that
artifact, not the global design system. A conversation is not authorization to
change rules. When the user asks to retain a preference or improve guidance,
record a compact before/after example in the project's existing design records:

- task and context;
- source images or revisions;
- what the user actually preferred;
- the proposed reason, explicitly separated from confirmed feedback;
- scope, exceptions and system version.

Retrieve only a few relevant examples for a later task. Do not convert "too
plastic" into "never use shadows" without identifying and confirming the cause.
Keep experiment outputs out of other independent runs; training examples and
evaluation tasks must remain separate. A hypothesis becomes a reusable rule only
when supported beyond its original example and authorized for that scope.
