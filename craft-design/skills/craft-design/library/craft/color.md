# Color craft rules

Universal color rules applied on top of the active `DESIGN.md`. The
design system supplies the palette tokens; this file enforces how to
*use* them.

> Adapted from [refero_skill](https://github.com/referodesign/refero_skill)
> (MIT). All examples reference the standard tokens
> (`--bg`, `--surface`, `--surface-2`, `--fg`, `--muted`, `--border`, `--border-strong`, `--accent`).

## Palette structure

A coherent palette has four layers. Plan all four before writing any CSS.

| Layer | Share of pixels | Tokens |
|---|---|---|
| **Neutrals** | 70–90% | `--bg`, `--surface`, `--surface-2`, `--fg`, `--muted`, `--border`, `--border-strong` |
| **Accent** (one) | 5–10% | `--accent` only — never invent a second accent |
| **Semantic** | 0–5% | `--success`, `--warn`, `--danger` |
| **Effect** | <1% | gradients, glows; rarely justified |

## Surface planes & separation

Two equally valid ways to organize a plane exist — choose the one that fits the genre and medium:

1. **Airy / structural:** whitespace, typographic scale, and hairline dividers (`1px solid var(--border)`) carry the hierarchy with no boxes, fills, or drop shadows.
2. **Layered / tactile:** stepped surfaces and subtle elevation separate interactive controls, panels, and overlays. When using layered surfaces in `oklch()`, obey monotonic lightness and avoid **contour congestion** ("box inside a box"):
   - **Light mode (`L_bg <= L_surface2 <= L_surface`):** `--bg` (`oklch(0.968 0.004 H)`) → elevated `--surface` (`oklch(0.998 0.002 H)`) with `1px solid oklch(0.20 0.01 H / 0.10)` and a two-layer physical shadow (contact occlusion + soft penumbra). Never make `--surface-2` darker than `--bg` (keep it `oklch(0.980 0.003 H)`).
   - **Dark mode (monotonic step-up):** `--bg` (`oklch(0.14 0.015 H)`) → `--surface` (`oklch(0.19 0.016 H)`) → `--surface-2` (`oklch(0.23 0.018 H)`) with `oklch(1 0 0 / 0.08)` border and `inset 0 1px 0 oklch(1 0 0 / 0.06)` top highlight.
   - **Keep nested card regions transparent:** charts, KPI summaries, logs, specs, and button footers inside `--surface` use `background: transparent` with whitespace and `1px solid var(--border)` hairlines. Reserve `--surface-2` strictly for functional wells (`thead`, switch tracks, code blocks). Never paint nested blocks inside `--surface` back to `--bg`.
- **85–10–5 budget & action restraint:** keep 85% neutral planes, 10% quiet structural contrast, 5% `--accent`. At most ONE solid high-contrast button per action group (including `--danger`: beside `--accent`, style destructive actions as quiet outlined/transparent buttons with `--danger` text). Avoid the default warm-beige + terracotta cliché (`#F4F1EA + #A8421E`) unless requested by the brand.

## Figure-ground scarcity & conditional roles

By default, any composition rests on the universal law of **figure-ground scarcity**: a dominant quiet neutral canvas plus **ONE focal accent (`--accent`)** used sparingly.

- **Primary focal accent (`--accent`, `--accent-on`) & soft tint (`--accent-soft`):** give `--accent` crisp clarity while keeping 70–90% of the canvas neutral. `--accent-soft` (`color-mix(in oklch, var(--accent) 12%, transparent)`) is a quiet tint of that same accent for selected rows, active ranges, or focus bands. Keep at most ONE solid high-contrast button per action group.
- **Conditional secondary color (`--accent-2`) — NOT mandatory:** do not invent a second chromatic accent just to fill a palette. Add `--accent-2` or categorical series colors only when real informational necessity demands distinguishing independent data series, streams, or opposing poles.
- **Conditional semantic signals (`--danger`, `--warn`, `--success`) — NOT mandatory:** use status colors only when the interface reports real system states, validations, or critical incidents (where an incident must stand out from calm nominal rows); omit them from editorial, print, or brand pages that carry no live status.
- **Dark contrast masses (`.on-dark`):** treat full-width dark bands or inverted anchor slabs as a rare dramatic device when the subject truly warrants contrast, never as an obligatory default on light/airy compositions.

## Contrast minimums

Run these as gates, not goals:

| Pair | Minimum |
|---|---|
| Body text (≤16 px) on background | **4.5:1** |
| Large text (>18 px or 14 px bold) | **3:1** |
| UI components against adjacent surfaces | **3:1** |

When the brand color clashes (low-contrast indigo on light background is
common), darken the accent to a `600`-level shade for text use; reserve
the brand-bright variant for fills only.

## Dark themes

Avoid pure black and pure white — both cause vibration and eye strain.

| Token | Dark theme | Light theme |
|---|---|---|
| Background | `#0f0f0f` (not `#000`) | `#fafafa` (not `#fff`) |
| Foreground | `#f0f0f0` (not `#fff`) | `#111111` (not `#000`) |

On dark surfaces, prefer **semi-transparent white borders** over solid
dark borders — a 1px `rgba(255,255,255,0.08)` reads as structure
without adding visual noise.

## Semantic color naming

Always name tokens by **purpose**, never by hue:

```css
/* good */
--accent: #2f6feb;
--success: #17a34a;

/* bad — locks you out of theming */
--blue-500: #2f6feb;
--green-500: #17a34a;
```

## Anti-defaults

- **Indigo `#6366f1`** (Tailwind `indigo-500`) is the most reliable
  AI-slop tell. The active `DESIGN.md` provides `--accent`; use it. If
  the brief truly needs indigo, make the user say so explicitly. If
  your `DESIGN.md` encodes indigo as `--accent`, that is intentional —
  the linter only flags hardcoded hex, so `var(--accent)` uses are
  unaffected even when the resolved color happens to be `#6366f1`.
- **Two-stop "trust" gradient** (purple → blue, blue → cyan, etc.) on a
  hero is the second most reliable tell. A flat surface + one
  type-driven hierarchy beats it every time.
- **Decorative gradients with no functional purpose**. Gradients should
  separate hierarchies (header → body, primary CTA → secondary), not
  decorate empty space.
