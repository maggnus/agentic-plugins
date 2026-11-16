---
name: craft-design
description: "Design any visual artifact: app and product screens, prototypes, landing and marketing pages, dashboards, documents and print, posters and cards, brand kits, motion frames. Works from brief and spec to a built and verified design with a live preview; loads templates, design systems and craft rules from a bundled library only when needed."
---

# craft-design

Design and verify an editable visual artifact. Follow the user's scope and real
brand/component sources. `<skill>` is the directory containing this file.

## Before authoring

First study the user's brief and existing project/brand files in the workspace
(tokens, components, attached references), and only then start `craft-guide.mjs
begin`: between `begin` and `READY`, the guard blocks arbitrary shell commands.
`begin` starts the bundled artistic charter, capability map, and visual-concepts
curriculum in verbatim 24 KB packets (below the 30 KB output cap):

```sh
node <skill>/scripts/craft-guide.mjs begin --state <absolute-artifact-directory>/.craft-guide.json --query "WORDS"
```

Run this as one literal command with the actual absolute skill path (no path
variable, `cd &&`, wrapper, pipe or redirection). Use absolute `--state` and
`--plan` paths. The bundled host guard must be enabled/trusted: if a call fails
as unobserved, retry the printed literal command once in the same directory; if
that also fails, stop and report activation as unverified.

Acknowledge each base packet with the printed `next --state FILE --receipt TOKEN`
command (retain at least 4500 output tokens per packet) until `BASE COMPLETE`.
At `BASE COMPLETE`, inspect at most two catalog candidates if needed with
`entry --id ID --page N` or `read --path skills/ID/`, then submit the route:

```sh
node <skill>/scripts/craft-guide.mjs decide --state <abs>/.craft-guide.json --json '{"visualPath":"direct","reason":"...","tools":{"generation":{"status":"...","evidence":"..."},"viewing":{"status":"...","evidence":"..."}},"visualContract":{"source":"library-system","systemId":"...","adaptation":"..."},"entryId":"...","use":["library","tokens","inspection","preview"]}'
```

Compact `use: [...]` (or full `capabilities`) compiles the selected references,
the chosen `ENTRY.md` and its `craft` files into 24 KB packets. When the
compiled slice fits in one packet, `decide` returns it and `READY` immediately;
larger routes finish with `next --state FILE --receipt TOKEN`. `status --state FILE`
repeats an interrupted packet. After context loss, use `status` and revisit
relevant sections.

## Find and reuse

Every new artifact selects an entry, craft rules and a visual contract:

1. Search with `catalog --query`; never read `library/catalog.tsv` whole. Preview
   at most two candidates with `entry` and choose the fitting mode/platform.
   An imperfect entry still supplies structure and working assets. Skip entries
   only when no row matches the artifact type; record the searches.
2. READY delivers only the chosen ENTRY.md and its catalog craft files. Read its
   required sections/checklist/assets yourself: `read --path` lists and pages
   them, and after READY a file-read tool also works. Reuse
   working template code; the brief determines sections and behavior. Check sizes:
   text above 30 KB is read by headings/ranges, not one huge result. Copy a large
   template before editing it by search. In entries, SKILL.md means ENTRY.md.
3. Its catalog `craft` files from `<skill>/library/craft/` arrive with READY
   (always including `typography`, `typography-hierarchy`, `color`, and
   `anti-ai-slop`, plus `typography-hierarchy-editorial` for landing/editorial
   entries). Read `form-validation` yourself for forms. Ignore frontmatter
   requirements with no file.
4. Bind exactly one `visualContract` in `decide` (`library-system`, `project-brand`, or `custom-spec`). It overrides template aesthetics. For `library-system`, the guide automatically delivers `USAGE.md`, `DESIGN.md`, and `tokens.css`; preserve actual theme values. Directions may inform an original spec (`inspiredBy`); read one block from `<skill>/library/directions.md`.

The guide routes applicable references: brief, platform/print, host conventions,
shared components and scenarios, visual proposals, and inspection. An entry using
`<artifact>`, `question-form`, `$CRAFT_*`, daemon/API or editor-specific commands
also requires `<skill>/references/conventions.md`. A named design system uses
`<skill>/library/design-systems/<id>/USAGE.md` to select further resources.

## Build, preview and verify

Use the directory the user names, otherwise `design/<slug>/index.html`. Keep
scratch files out of product source. No staging, commits or publishing without
user/project authorization. Do not edit generated `library/` files.

Serve only the intended artifact directory:

```sh
node <skill>/scripts/preview.mjs design/<slug> --port 4178
```

Use the printed URL; a busy port changes it. `/` opens a read-only multi-frame
preview board (paired widths automatically or layout from optional
`design.json`, pan/zoom, `8px` grid, live reload), `/view/<path>` opens a
single-file view, and `/raw/<path>` serves the raw document. Do not expose
neighbouring experiment results.

For multi-section pages, build the first screen and calibrate early with
`--stage calibrate` (`1440×900` and `390×844` 1:1 without `--full`), then build
remaining sections and run full verification:

```sh
node <skill>/scripts/verify.mjs design/<slug>/index.html --state design/<slug>/.craft-guide.json --width 1440,390
```

Check responsive widths together: default heights are 900 for desktop and 844 for
phone. Add `--height` for another common height, `--fit` for a no-scroll frame,
`--mode desktop` for a narrow fixed artboard, and `--stage calibrate` for fast
first-screen calibration. The command owns output paths and returns current
counts, source-bound PNGs, 1:1 viewport `strips` (`frame-*-s*.png`) for long
pages, diagnostics and a `repeatCommand`.
When `passed:false`, repair listed causes (or pass `--resolutions FILE` with matching `sourceSha256` for verified review findings) and repeat the command; `needs-review` also exits 1. Read
summary.json if remainingDiagnostics is nonzero. Never change checks or hide
required content to obtain a pass. Use the latest counts, not earlier logs or
memory; an edit invalidates the previous verification at every affected size.
Keep `.craft-verification` next to the state with the deliverable; its reports
and screenshots are evidence, not scratch files. Then view every final PNG and
the 1:1 viewport `strips` (`frame-*-s*.png`) and check facts against the brief. Explain genuine
source-contract exceptions without claiming a full pass. No browser means
incomplete checks, explicitly reported after diagnosing the environment failure.
A technical pass does not prove taste, facts, accessibility or visual review.

Use inspect.mjs/tokens.mjs for focused diagnosis. For --contract readiness/content,
--scenario fixtures, scroll/click states, or report limitations use inspection.md
(delivered when selected). shot.mjs only captures. The guide also introduces image
search/get with attribution, brand-kit generation and token extract/sync/import.
Changes after the final PNG require new verification of the delivered file.
