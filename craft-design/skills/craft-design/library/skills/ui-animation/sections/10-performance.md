## Performance

- Pause looping animations off-screen with `IntersectionObserver`; they burn GPU even when invisible.
- Toggle `will-change` only during heavy motion and only for `transform`/`opacity`; remove it after. Each promotion costs compositor memory; permanent promotion across many elements is worse than none.
- Do not animate drag via CSS variables on a container; every update recalculates styles for all children. Set `transform` directly on the moving element.
- Motion `x`/`y` values are the default for axis movement and drag (they bypass React re-renders). Use a full `transform` string when one owner must combine multiple transform functions, interop with non-Motion code, or survive a busy main thread: the shorthands run on `requestAnimationFrame` and drop frames when motion coincides with navigation, data loading, or hydration; CSS/WAAPI stay smooth there.
- Motion that janks only sometimes (on open, during navigation, while data lands) is usually a long task sharing the tick, not a costly animation. Don't start an animation and expensive work in the same tick: start the motion, let a frame land, then do the work, or defer it to `transitionend`.
- See [references/performance-deep-dive.md](references/performance-deep-dive.md) for WAAPI, compositing layers, long tasks during animation, and the CSS vs JS comparison table.
