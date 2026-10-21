## Rules

- Keep `$imagegen` as the primary generation layer.
- Keep reference images attached/visible for `$imagegen` whenever the chosen path supports references.
- Attach the row's `references/layout-guides/<state>.png` image to every row-strip job as a layout-only guide, and do not accept outputs that copy guide pixels.
- Use subagents for row-strip visual generation after the parent records the base image. The parent may generate the base, but row-strip jobs belong to subagents unless the user explicitly says not to use subagents for this session.
- Generate every normal visual job with `$imagegen`: base plus all row strips that are not explicitly approved `running-left` mirror derivations.
- Treat only the base job as eligible for prompt-only generation; every row job must attach its listed grounding images.
- Delegate `running-right` first, then mirror `running-left` only when visual inspection confirms a mirror preserves identity and semantics; otherwise delegate `running-left` as a normal grounded `$imagegen` row.
- Never substitute locally drawn, tiled, transformed, or code-generated row strips for missing `$imagegen` outputs.
- Never manually mutate `imagegen-jobs.json` to claim a visual job completed.
- Do not rely on generated images for exact atlas geometry; use this skill's deterministic scripts.
- Use the chroma key stored in `pet_request.json`; do not force a fixed green screen.
- Keep the pet's silhouette, face, materials, palette, and props consistent across all rows.
- Enforce the transparency and effects rules above in every base, row, and repair prompt.
- Treat visual identity drift as a blocker even when `qa/review.json` and `final/validation.json` have no errors.
- Treat a contact sheet that shows cropped references, repeated tiles, white cell backgrounds, or non-sprite fragments as failed.
- Treat forbidden detached effects, chroma-key-adjacent artifacts, shadows, glows, smears, dust, landing marks, wave marks, speed lines, or motion trails as failed rows.
- Treat `qa/review.json` errors as blockers. Warnings require visual review.
