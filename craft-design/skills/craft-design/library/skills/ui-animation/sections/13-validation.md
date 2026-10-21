## Validation

Produce evidence for each check (DevTools observations, not "looks fine"):

- Grep the diff for layout property transitions (`width`, `height`, `top`, `left`) and `transition: all`.
- Retoggle components rapidly; confirm transitions retarget instead of restarting from zero.
- Slow to 10% in the DevTools Animations panel to catch timing and `transform-origin` issues invisible at full speed.
- Confirm `will-change` is toggled around animations, not permanently set, and looping animations pause off-screen.
- Test touch interactions on real devices; simulators under-report gesture and hover-on-tap issues.
- Honor `prefers-reduced-motion`: replace spatial travel with immediate state changes or restrained fades. Pause looping decorations with `animation-play-state: paused` (do not yank them with `display: none`). Keep explicit user-triggered feedback. Exercise the same task in that mode.
