# Render inspection

`node <skill>/scripts/inspect.mjs <file-or-url> --width 1440,390`

This uses shot.mjs's browser, viewport, clicks and capture. Each PNG has a JSON
report with the input, frame/state, source hash (local files), rendered-HTML hash,
PNG hash, findings and coverage limits. It does not modify the source. The hash
of the entry file does not include linked resources. Non-file URLs have no local source
hash. Dynamic content may change during a capture; this is not an atomic export.

Use `--height`, `--out`, `--full`, `--at` and repeated `--click` as with shot.mjs.
`--out` is a PNG filename, not a directory. `--mode auto` preserves the default:
widths below 600 emulate a phone. Use `--mode desktop` for a narrow fixed artboard
that must lay out at its exact CSS width without mobile scaling; use `--mode mobile`
for phone behavior regardless of width. A phone webpage still needs its viewport
meta tag. Record the actual mode; a desktop artboard is not a mobile-browser test.
`--fit` applies only when the whole document must fit the viewport and no internal
scrolling is allowed. Do not use it for normal long pages or legitimate scroll
regions. Use a frame's own file or fragment/state, not a scaled presentation board.

`--strict` exits 1 on errors or a truncated report; review findings do not fail
it. Exit 2 means bad arguments; exit 3 means no browser/runtime support. Without
`--strict`, findings are reported without failing the capture. A missing report
or failed capture is not a pass.

## Explicit expectations

Geometry cannot distinguish a complete design from an empty or loading page.
When readiness or required content is uncertain, pass `--contract expectations.json`.
Derive a few observable checks from the brief before inspecting; do not weaken them
to match an incomplete result. This is optional for simple static work, not another
required planning document. Example for a three-card view:

```json
{
  "version": 1,
  "timeoutMs": 5000,
  "ready": [{ "selector": "[data-render-ready]", "count": 1 }],
  "checks": [
    { "selector": "[data-craft-id=card]", "count": 3 },
    { "selector": "h1", "textIncludes": "Devices" },
    { "selector": ".loading", "count": 0 },
    { "selector": ".frame", "box": { "width": 720, "height": 640, "tolerance": 1 } }
  ],
  "noRuntimeErrors": true
}
```

`ready` conditions are awaited after navigation and requested clicks, before capture;
they and `checks` are checked again in the final state. Timeout is 0–15000 ms,
default 5000; zero means one immediate probe without polling. A positive deadline
includes evaluation time. A timeout remains a failure even if content appears later. Every check
requires a CSS `selector`; `count` is exact, or use `min` (default 1) and `max`.
By default only displayed elements count. `visible:false` counts all DOM matches
(use it with `count:0` to require removal, rather than merely hiding an element).
`textIncludes` compares normalized whitespace, case sensitively, on every matching
element's displayed DOM text; transparent/hidden subtrees are excluded. With
`visible:false` it uses all DOM text instead. CSS-generated/transformed text and
form values are not checked. `box` compares rendered
CSS dimensions, with default tolerance 1 px. Text/box conditions require a match
even with `count:0`. These checks do not prove viewport visibility, lack of clipping
or occlusion, semantic correctness or good composition.

For a component/editor harness, add `frame:"#artboard"` to a check to address a
unique same-origin iframe. Unavailable or cross-origin frame content fails explicitly;
it is never silently accepted. This targeted check does not extend the geometric
audit to the iframe. Shadow roots and nested frame chains are not traversed.
Use the host's real renderer, dependencies and design-system bindings when available;
assert its expected output, rather than accepting a substitute shell as equivalent.

Uncaught JavaScript exceptions and `console.error`/failed `console.assert` messages
from navigation through inspection appear as review findings. `noRuntimeErrors:true`
makes them errors. This is not exhaustive: caught exceptions, private framework
error channels, workers and out-of-process frames need host-specific checks.
Readiness, contract results and the contract file hash are recorded in the JSON.
Unknown fields, invalid schema or output paths that overwrite the source/contract
exit 2; failed checks exit 1 only with `--strict`.

## Geometric findings

- **text-clipped:** text-range bounds exceed an ancestor that clips. Inspect the
  named element and ancestor. Range rectangles include leading: small vertical
  excess is tolerated, and transformed or unusual type may need judgment.
- **possible-occlusion:** another hit target covers sampled points. Check the
  screenshot and intended state; nested children alone are not occlusion.
- **outside-frame / scroll-region / overflow:** compare against the brief before
  changing layout. Never repair fit by hiding content or disabling useful scroll.
- **broken-image:** a displayed image failed to decode.
- **control-name:** no common accessible-name source was found; inspect real
  semantics. This is not a complete accessibility-tree audit.
- **text-contrast / small-target:** review findings. Contrast uses computed solid
  backgrounds; images, gradients, effects, interaction states and intended target
  spacing need visual/platform review.
- **fonts:** requested CSS families and the actual Chromium font usage for up to
  48 distinct family/weight/style/script samples. Compare these with the contract.
  Family aliases and fallback glyphs are legitimate, so differing names alone
  are not an error. Failed declared font loads are reported separately.

Findings include viewport-relative bounds and stable `data-craft-id` where present;
use them to inspect the affected area. Full-page captures still measure the
original viewport. Read the report's limitations: no claims about unexamined
iframes, shadow roots, pseudo-elements, canvas or SVG text. Pointer-transparent
overlays and small glyph clipping can escape geometric checks. Content correctness,
hierarchy, suitability and all relevant interaction states still need review.

Do not announce "everything verified" from a clean JSON report. State what was
measured, what was viewed, and what remains unverified. Fix evidence-backed issues,
then recapture the changed states; do not chase a zero-warning score by deleting
content, reducing all text or hiding overflow.
