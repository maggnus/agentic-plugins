## Core rules

- Animate for feedback, orientation, continuity, or deliberate delight. If it's just "it looks cool" and the user sees it often, don't.
- Keep keyboard focus and repeated navigation immediate. A state transition may animate if focus and task completion do not wait for it.
- Prefer CSS transitions for interruptible UI: keyframes restart from zero on interruption, transitions retarget. Use keyframes only for predetermined sequences.
- Implementation priority: CSS transitions > WAAPI > CSS keyframes > JS (`requestAnimationFrame`); under load CSS stays smooth while JS drops frames.
- Asymmetric timing: occasional interactions can enter slightly slower, exit fast. High-frequency ephemeral UI (hover highlights, popovers, panel toggles) inverts this: enter instantly (0ms), exit with a brief fade (100-150ms) so the action feels immediate.
- Tappable controls press on `:active` at 0ms and set `touch-action: manipulation`.
- Use `@starting-style` for DOM entry; fall back to a `data-mounted` attribute where unsupported.
- A small `filter: blur(2px)` hides rough crossfades between swapped content.
