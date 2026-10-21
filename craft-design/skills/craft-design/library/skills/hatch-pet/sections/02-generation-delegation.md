## Generation Delegation

Use `$imagegen` for all normal visual generation.

Before generating base art, row strips, or repair rows, load and follow the installed image generation skill:

```text
${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/SKILL.md
```

Do not call the Image API directly for the normal path. Let `$imagegen` choose its own built-in-first path and its own CLI fallback rules. If `$imagegen` says a fallback requires confirmation, ask the user before continuing.

When invoking `$imagegen` from this skill, pass the generated pet prompt as the authoritative visual spec. Do not wrap it in the generic `$imagegen` shared prompt schema and do not add extra polish, hero-art, photo, product, or illustration-style augmentation. Pet prompts should stay terse, sprite-specific, and digital-pet oriented; only add role labels for input images and any essential user constraint.

Use this skill's scripts for deterministic work only: preparing prompts and manifests, ingesting selected `$imagegen` outputs, extracting frames, validating rows, composing the final atlas, creating QA media, and packaging.

Hard boundary: do not create, draw, tile, warp, mirror, or synthesize pet visuals with local Python/Pillow scripts, SVG, canvas, HTML/CSS, or other code-native art as a substitute for `$imagegen`. For a normal pet run, expect up to 10 visual generation jobs: 1 base pet plus 9 row-strip jobs. The only exception is `running-left`, which may be derived by mirroring `running-right` only after `running-right` has been generated, visually inspected, and explicitly approved as safe to mirror. If mirroring is not appropriate, generate `running-left` as a normal grounded `$imagegen` row. If those calls are too expensive, blocked, or unavailable, stop and explain the blocker instead of fabricating row strips locally.

Do not mark visual jobs complete by editing `imagegen-jobs.json`, copying files into `decoded/`, or writing helper scripts that populate row outputs. Use `record_imagegen_result.py` for selected built-in `$imagegen` outputs, or `generate_pet_images.py` only for the documented secondary fallback. The deterministic scripts may only process already-generated visual outputs.

Only the base job may be prompt-only. Every row-strip job generated through `$imagegen` must use the input images listed in `imagegen-jobs.json`, including the canonical base reference created after the base job is recorded. Treat any row generation without attached grounding images as invalid.
