## Video production and dual delivery

For video briefs, use the studio's existing local HyperFrames renderer during
Build. It needs no video-generation API key. Do not ask the user to render it
manually or run a second renderer. Plan declares `hyperframes-html` as the
production route, editable source as canonical, and MP4 as a required derived
output. For interactive briefs use `html` and source only.

Keep source and MP4 paths in the readable plan and in the composition's MP4
link. The exporter checks its actual output path and the declared audio policy;
The studio does not parse or freeze a model-authored plan. Do not add machine
blocks or a contract-repair turn.

Apply this delivery guidance only to the user's actual current video-motion
request, including an explicit video-motion request in another project. A
selected scenario or loaded helper alone does not authorize creating a film.
Plan-only requests end with the plan; interactive motion and hover/scroll
animation in a prototype remain runnable HTML. Follow-ups may directly edit an
existing film; re-render only when the requested change affects the video.

1. Scaffold a visible source directory with the native shell tool:
   `craft media scaffold --project "$CRAFT_PROJECT_ID" --composition-dir "motion-source/film"`.
   Use a new descriptive directory for a new film; edit the existing source on
   revisions. Keep `hyperframes.json`, `meta.json`, HTML and local assets there.
2. Author `motion-source/film/index.html`. Its composition root must have
   `data-composition-id="main"`, `data-start="0"`, `data-duration`, `data-width`,
   `data-height` and `data-fps`. Register the seekable master timeline at
   `window.__timelines.main`. Use actual GSAP animations, not a placeholder
   timeline. Keep assets/fonts local and relative to this source directory.
   Include `<meta name="craft-motion-output" content="video">` and
   `<link rel="alternate" type="video/mp4" href="../../film.mp4">` in the head.
   The href must identify the actual planned MP4 inside the project. The
   interactive equivalent declares `content="interactive"` and needs no MP4.
   For video, choose a stable, representative moment in your actual timeline
   and declare its time in seconds as `data-poster-time` on that root. It must
   satisfy `0 <= time < data-duration`; avoid an empty opening or a transition.
   Prefer a frame that communicates the product or main idea at thumbnail size.
   The host validates the source/video clock and dimensions and extracts this
   exact frame from the finished MP4. Do not generate a separate invented cover,
   change the video's opening for the cover, or bake preview containers into it.
3. Render through the host:
   `craft media generate --project "$CRAFT_PROJECT_ID" --surface video --model hyperframes-html --composition-dir "motion-source/film" --output "film.mp4"`.
   If it returns a task ID, use `craft media wait <id>` and wait for success.
   A queued task, HTML preview or failed command is not a completed film.
4. Preserve the source and assets, and link BOTH the actual MP4 and the source
   HTML in the final response using project-relative Markdown links. The file
   viewer provides preview/download. On later video edits re-render the same
   linked MP4 so the download matches the current source.

If the host reports a renderer failure, preserve the editable source and report
that blocker truthfully. Never fabricate a download or label HTML-only output
as a finished video. Only actual user-requested video-motion production, and
only when the host Core authorizes it, permits this bounded check:

- During planning, retain factual invariants and exact required copy in the
  existing Design Spec/beat map. An explainer must preserve the causal mechanism
  and exceptions when shortening subtitles; decorative metaphors are not facts.
- After the first render, perform one review of the actual source and exported
  video: check the clock/dimensions, compare captions against those invariants,
  and inspect at most three representative frames (opening, key explanation,
  ending). Check related SVG shapes stay aligned. Use available host/browser/
  frame tools and actually view the images; source reading alone is not visual
  evidence. Do not claim a check that tool access did not allow.
- If that review or the renderer identifies a concrete defect, make at most one
  targeted repair and re-render; recheck only the affected facts/frames. If still
  incorrect or unverifiable, report the limitation instead of certifying it.
- Do not spawn acceptance agents, score aesthetics, add a separate pipeline
  stage, or repeat an open-ended polish loop. Interactive motion, prototypes,
  slides, documents and other tasks keep their existing ship-on-write policy.
