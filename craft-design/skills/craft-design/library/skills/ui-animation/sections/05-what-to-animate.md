## What to animate

- Movement: `transform` and `opacity` only; they skip layout and paint.
- State feedback: `color`, `background-color`, and `opacity` are acceptable.
- Never animate layout properties (`width`, `height`, `top`, `left`); they trigger layout recalc every frame. (Exception: a deliberate container tween, see the card-resize and container-morph recipes.)
- Never use `transition: all`; it animates unintended properties and silently adopts future ones. List them explicitly.
- Avoid `filter` animation for core interactions; if unavoidable keep blur ≤ 20px (heavy blur is expensive, especially in Safari).
- SVG: apply transforms on a `<g>` wrapper with `transform-box: fill-box; transform-origin: center`; without it they rotate/scale around the canvas origin. Line drawing, path morphing, and the Motion SVG origin override live in [references/svg-animation.md](references/svg-animation.md).
- `transform: scale()` also scales children (icons, text, borders scale proportionally), unlike `width`/`height`: a feature for press feedback, but account for it when an inner element must stay fixed-size.
- Disable transitions during theme switches (`[data-theme-switching] * { transition: none !important }`), or every themed property animates at once. Force a reflow (`void document.body.offsetHeight`) after the flip and remove the override on the next frame, or use `next-themes` `disableTransitionOnChange`.
