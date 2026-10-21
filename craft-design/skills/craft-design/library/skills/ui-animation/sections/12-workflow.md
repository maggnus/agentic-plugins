## Workflow

Copy and track:

```text
Animation progress:
- [ ] Step 1: Decide whether the interaction should animate
- [ ] Step 2: Choose purpose, easing, and duration
- [ ] Step 3: Pick the implementation style
- [ ] Step 4: Load the relevant component or technique reference
- [ ] Step 5: Validate timing, interruption, and device behavior
```

1. Answer the four questions in [references/decision-framework.md](references/decision-framework.md): animate? purpose? easing? speed?
2. Pick duration from the easing defaults table above. If the value is contested, dial it live in the DevTools bezier editor (Chrome or Firefox; Safari has none) against the real component, then paste the literal into source beside the other timing constants: a DevTools edit dies on navigation.
3. Choose implementation: CSS transition > WAAPI > spring > keyframe > JS.
4. Load the reference for your component or technique.
5. When reviewing, apply the strict posture in [references/review-format.md](references/review-format.md): measure against the ten standards, output the Before/After/Why table, then a tiered verdict ending in a Block/Approve decision.
