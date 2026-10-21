## Author reliable editable motion

For a new Open Design film, use timeline-driven HTML with GSAP and optional
SVG/Canvas. HTML/SVG suit typography, crisp diagrams and UI; Canvas suits dense
marks, fields and procedural worlds. Combine them when useful. Preserve an
existing supported renderer instead of rebuilding it just to fit this default.

Keep duration, frame size, palette, type scale, easing and scene timings in one
small configuration. Group each scene's elements and motion together. Separate
content/data from drawing. Reuse geometry and cached textures; cap offscreen
work and particle counts. Keep a scene stable at any requested timestamp.

The Open Design video composition contract:

```html
<div id="main" data-composition-id="main" data-start="0"
     data-duration="15" data-width="1920" data-height="1080" data-poster-time="13.5">
  <!-- Real scene elements, sized for this stage. -->
</div>
<script>
// Load GSAP before this block; retain the host's pinned dependency when supplied.
const duration = 15;
const tl = gsap.timeline({ paused: true });
// Define initial states explicitly, then animate scene objects at absolute times.
// tl.fromTo(...); tl.to(...); Reading holds occupy real time in the timeline.
const clock = { t: 0 };
tl.to(clock, { t: duration, duration, ease: 'none' }, 0);
window.__timelines = { main: tl };
// A procedural layer must draw from clock.t, not increment state each frame.
// Video export seeks with timeline callbacks suppressed, so draw from a
// per-frame loop rather than from onUpdate alone:
// (function render() { drawWorld(clock.t); requestAnimationFrame(render); })();
</script>
```

This is a protocol skeleton, not a finished visual template. Author the real
composition. Root duration, timeline duration, aspect and the brief must agree.
Use real seconds: the master timeline must keep `timeScale(1)`, no repeat or
start delay, and its actual `duration()` must equal `data-duration`. The setter
`tl.duration(seconds)` changes playback speed; it does NOT add a reading hold.
Use the full-length clock tween above, and keep all tracks within its duration.
The player and renderer reject inconsistent video clocks before export.

For SVG pop/scale entrances, establish a shared origin BEFORE the from state.
Animate a common group for related shapes (a disk and its shading), or set the
same `svgOrigin` in both states. Do not set it only in the destination: GSAP
smooth-origin compensation can offset shapes with different bounding boxes.

```js
function popShape(tl, node, cx, cy, at, duration = 0.45) {
  const svgOrigin = cx + ' ' + cy;
  tl.fromTo(node, { scale: 0, svgOrigin },
    { scale: 1, svgOrigin, duration, ease: 'back.out(2)' }, at);
}
```
Use the actual composition id consistently. Register timelines before signalling
readiness; all image/font dependencies need a known ready state. Keep assets
local when possible and avoid relying on inaccessible remote URLs.

Deterministic motion must survive forward/backward seeking: no Date.now-based
scene state, unseeded randomness, simulation that only works after playing from
zero, or independent CSS animation competing with the master timeline. Define
positions and reveals as functions of time, or as seekable timeline tracks.
Never make visible content depend on timeline callbacks (onUpdate, onComplete);
the MP4 exporter seeks with them suppressed.
Audio-reactive motion needs a precomputed envelope or known beat map when exact
replay matters. Never imply that an arbitrary pulse is analysis of the music.

Open Design scaffolds and embeds shared source playback: open the HTML to
automatically loop the film, with no separate player bar. Click the picture to
pause/resume or unlock audio blocked by browser autoplay. The internal
`window.__odMotionPlayer` interface retains play/pause, seek and replay. Preserve its `script[data-od-motion-source-player]`. Do not create
competing controls or start a second playback clock. The renderer sets
`window.__odMotionRender` before author scripts to disable preview chrome and
scaling during capture. The scaffold includes pinned GSAP 3.14.2 at
`./gsap.min.js`; preserve and reference that local file. No download is needed. Prefer installed/system fonts with Chinese coverage; an unrequested font
must not block delivery. If an optional download fails, use an available font
instead of probing more mirrors, installing font tools or creating environments.
For an existing standalone source without the host player, put controls outside the
composition and connect them to the same master timeline. Scale the whole stage
uniformly to fit; do not reflow scene layout when the viewport changes. Controls
must not appear in the exported frames. Keep a useful poster when reduced motion
is requested and let the user explicitly start playback.
