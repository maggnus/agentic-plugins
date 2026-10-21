## Easing defaults

| Element                       | Duration     | Easing                           |
| ----------------------------- | ------------ | -------------------------------- |
| Button press feedback         | 100-160ms    | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Tooltips, small popovers      | 125-200ms    | `ease-out` or enter curve        |
| Dropdowns, selects            | 150-250ms    | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Modals, drawers               | 200-350ms    | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Move/slide on screen          | 200-300ms    | `cubic-bezier(0.25, 1, 0.5, 1)`  |
| Page transitions              | 250-400ms    | enter or move curve              |
| Hover (colour/opacity), one control | 200ms   | `ease`                           |
| Hover (transform/scale)       | 100-150ms    | enter curve                      |
| Illustrative/marketing        | Up to 1000ms | Spring or custom                 |

Keep routine UI under 300ms; scale duration with distance (a full-screen slide can exceed 300ms, a 6px tooltip shift stays under 150ms).

**Named curves**

- **Enter:** `cubic-bezier(0.22, 1, 0.36, 1)` for entrances and transform-based hover
- **Move:** `cubic-bezier(0.25, 1, 0.5, 1)` for slides, drawers, panels
- **Drawer (iOS-like):** `cubic-bezier(0.32, 0.72, 0, 1)` (extremely steep start; the reason its 500ms doesn't read as slow)
- **Expo out:** `cubic-bezier(0.19, 1, 0.22, 1)` for dramatic reveals, card hovers, text reveals
- **Press:** `cubic-bezier(0.25, 0.46, 0.45, 0.94)` for button press feedback
- **On-screen move:** `cubic-bezier(0.645, 0.045, 0.355, 1)` for back-and-forth movement that stays on screen

Avoid `ease-in` for UI: it starts slow, so the element lags the user's action and feels sluggish. Prefer custom curves from [easing.dev](https://easing.dev/) over built-in `ease`/`ease-out`, whose gentle acceleration reads soft, not decisive.
