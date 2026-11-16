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

## Surface planes & separation (OKLch)

Obey monotonic lightness in `oklch()` and avoid **contour congestion** ("box inside a box"):

- **Light mode (`L_bg <= L_surface2 <= L_surface`):** `--bg` (`oklch(0.968 0.004 H)`) → elevated `--surface` (`oklch(0.998 0.002 H)`) with `1px solid oklch(0.20 0.01 H / 0.10)` and a two-layer physical shadow (contact occlusion + soft penumbra). Never make `--surface-2` darker than `--bg` (keep it `oklch(0.980 0.003 H)`).
- **Dark mode (monotonic step-up):** `--bg` (`oklch(0.14 0.015 H)`) → `--surface` (`oklch(0.19 0.016 H)`) → `--surface-2` (`oklch(0.23 0.018 H)`) with `oklch(1 0 0 / 0.08)` border and `inset 0 1px 0 oklch(1 0 0 / 0.06)` top highlight.
- **Keep nested card regions transparent:** charts, KPI summaries, logs, specs, and button footers inside `--surface` use `background: transparent` with whitespace and `1px solid var(--border)` hairlines. Reserve `--surface-2` strictly for functional wells (`thead`, switch tracks, code blocks). Never paint nested blocks inside `--surface` back to `--bg`.
- **85–10–5 budget & action restraint:** keep 85% neutral planes, 10% quiet structural contrast, 5% `--accent`. At most ONE solid high-contrast button per action group (including `--danger`: beside `--accent`, style destructive actions as quiet outlined/transparent buttons with `--danger` text). Avoid the default warm-beige + terracotta cliché (`#F4F1EA + #A8421E`) unless requested by the brand.

## Semantic color roles & tonal masses

Replace arbitrary accent counting with four purposeful color roles and clear tonal massing:

1. **Primary action & active selection (`--accent`, `--accent-on`)** — give `--accent` genuine OKLch chromatic clarity (avoid washed-out greyed tints) while keeping 70–85% of the page canvas quiet and neutral. Keep at most ONE solid high-contrast button per action group. Links and `:focus-visible` rings should stay clearly perceptible without counting against a quota.
2. **Tinted support (`--accent-soft` / `color-mix(in oklch, var(--accent) 12%, transparent)`)** — for selected rows, active ranges, soft status pills, and subtle focus bands.
3. **Secondary domain tone or series color (`--accent-2` / categorical series)** — match the primary accent's perceptual OKLch lightness and chroma when the subject needs a second pole or data-series comparison.
4. **Semantic signals (`--danger`, `--warn`, `--success`)** — in operational consoles, a critical incident must stand out clearly from calm nominal rows (rather than blending into an even card grid), while keeping destructive buttons beside a primary CTA outlined until explicit confirmation.

Use large tonal masses and contrast anchors (`.on-dark`, drafting boards, tinted focal panels, or a high-contrast anchor section) where they sharpen hierarchy and subject drama — never as a forced dark band on every page.

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
