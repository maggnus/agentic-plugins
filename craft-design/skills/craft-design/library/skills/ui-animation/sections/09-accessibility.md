## Accessibility

- Gate hover (motion and paint) behind `@media (hover: hover) and (pointer: fine)`, or touch devices replay hover on tap. Inspect the generated CSS before adding a gate; Tailwind v4 already wraps `hover:` in `@media (hover: hover)`.
- During direct manipulation, keep the element locked to the pointer with no easing; add easing only after release.
- Optional interface SFX: sparse, gesture-unlocked, additive confirmation only. See [references/interface-sfx.md](references/interface-sfx.md).
