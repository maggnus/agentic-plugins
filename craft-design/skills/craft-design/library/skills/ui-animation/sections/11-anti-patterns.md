## Anti-patterns

High-signal failures not covered above:

- Animating on mount without a user trigger: unexpected motion disorients; the user did nothing to cause it.
- Hard stops on drag boundaries feel broken; apply friction/damping so movement diminishes past it (see gesture-drag reference).
- Animating both a container and staggering its children: pick one entrance per container. If the panel slides in, its content should already be visible on arrival.
- Tooltip animation after the first is open: subsequent tooltips in the group open instantly, or the toolbar feels laggy.
- Scroll-revealing product UI, above-the-fold content, or every section of a page: scroll reveals belong to a few chosen moments on marketing surfaces, run once, and never re-animate on scroll-up (see [references/scroll-animations.md](references/scroll-animations.md)).
- Easing or duration on scrubbed (scroll-driven) motion: scroll position is the clock, so any curve or duration makes it lag the scrollbar. `linear` and no duration is correct there, and only there.
- Reduced motion handled only in CSS: Motion's JS-driven animations ignore a `@media (prefers-reduced-motion)` block, so the CSS gate passes review while spatial travel still plays. Wrap the app in `<MotionConfig reducedMotion="user">` or branch on `useReducedMotion()`. The opposite overcorrection, a global `* { transition: none !important }` under reduce, also strips the opacity and colour feedback that reduced motion keeps.
- Installing `framer-motion` for new work: the package is now `motion` and React imports come from `motion/react`. The old package still resolves, so a mixed codebase compiles while shipping two copies of the library.
