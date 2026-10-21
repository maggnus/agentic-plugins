## Spatial and sequencing

- Popover `transform-origin` at the trigger (modals stay `center`), dialog/menu entrances from `scale(0.9-0.96)` not `scale(0)` (small popovers at the low end, full dialogs at the high end: a large surface already travels far in absolute pixels), and 30-50ms staggers (total under 300ms, most important element leading). Full rules and code in [references/transition-recipes.md](references/transition-recipes.md) and [references/contextual-animations.md](references/contextual-animations.md).
- **Paired elements rule:** elements that animate together (modal + overlay, tooltip + arrow, FAB + label) must share easing and duration. Mismatched timing is the usual cause of "something feels off".
