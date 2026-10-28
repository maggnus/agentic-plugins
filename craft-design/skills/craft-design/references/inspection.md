# Render inspection

`node <skill>/scripts/inspect.mjs <file-or-url> --width 1440,390`

This uses shot.mjs's browser, viewport, clicks and capture. Each PNG has a JSON
report with the input, frame/state, source hash (local files), rendered-HTML hash,
PNG hash, findings and coverage limits. It does not modify the source. The hash
of the entry file does not include linked resources. URLs have no local source
hash. Dynamic content may change during a capture; this is not an atomic export.

Use `--height`, `--out`, `--full`, `--at` and repeated `--click` as with shot.mjs.
`--fit` applies only when the whole document must fit the viewport and no internal
scrolling is allowed. Do not use it for normal long pages or legitimate scroll
regions. Use a frame's own file or fragment/state, not a scaled presentation board.

`--strict` exits 1 on errors or a truncated report; review findings do not fail
it. Exit 2 means bad arguments; exit 3 means no browser/runtime support. Without
`--strict`, findings are reported without failing the capture. A missing report
or failed capture is not a pass.

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
