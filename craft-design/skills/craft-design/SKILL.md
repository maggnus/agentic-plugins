---
name: craft-design
description: "Design any visual artifact: app and product screens, prototypes, landing and marketing pages, dashboards, documents and print, posters and cards, brand kits, motion frames. Works from brief and spec to a built and verified design with a live preview; loads templates, design systems and craft rules from a bundled library only when needed."
---

# craft-design

Design and verify an editable visual artifact. Follow the user's scope and real
brand/component sources. `<skill>` is the directory containing this file.

## Before authoring

Complete the guide before choosing a method or writing the artifact. It delivers
the full capability map, both charter parts and visual-method guidance in small
packets. Knowing every capability is mandatory; using every method is not.

```sh
node <skill>/scripts/craft-guide.mjs begin --state design/<slug>/.craft-guide.json
```

Run this as one literal command with the actual absolute skill path. Do not use
a path variable, `cd &&`, a wrapper, pipe or redirection. The bundled host guard
must be enabled/trusted. An unobserved invocation does not by itself prove that
the hook is inactive: retry the printed literal command once in the same working
directory. If that also fails, stop preparation and report activation as unverified;
do not forge receipts or silently proceed. This guard controls supported local
calls after begin; it is not a sandbox or proof of comprehension.

Use a fresh state next to each artifact; never another agent's state. Follow each
packet's next command in its own tool call, allowing at least 1800 output tokens.
Read through its ending receipt. Do not loop, batch, pipe, truncate or automate
acknowledgements. `status --state FILE` repeats an interrupted packet.

At BASE COMPLETE, inspect actual tools and select the library entry with
`craft-guide.mjs catalog --query WORDS` and `entry --id ID --page N`. Record the route plan
with entryId when using the library.
`decide --state FILE --json 'JSON'` requires a reason for using, skipping or
lacking every capability and separate generation/viewing evidence. Unknown tool
availability is not absence. Read the applicable detail packets, selected ENTRY and its craft rules until READY.
The state records delivery and declared decisions. The guard rejects piped reading
and other local tool calls during packet delivery, and authoring during selection.
Use literal, standalone guide commands; catalog/entry and tool discovery remain
available when choosing. No separate plan-file write is needed with --json. After context loss, use status and revisit relevant sections;
a changed edition requires a fresh state. Library-specific reading still follows.

## Find and reuse

Every new artifact selects an entry, craft rules and a visual contract:

1. Search `<skill>/library/catalog.tsv` (columns: kind, id, mode, platform,
   scenario, design_system, craft, path, summary); never read it whole. Example:
   `grep -i -E 'dashboard|operations' <skill>/library/catalog.tsv | cut -f1,2,4,9 | cut -c1-220`.
   Read at most two candidate ENTRY.md files and choose the fitting mode/platform.
   An imperfect entry still supplies structure and working assets. Skip entries
   only when no row matches the artifact type; record the searches.
2. Read the chosen ENTRY.md and its required sections/checklist/assets. Reuse
   working template code; the brief determines sections and behavior. Check sizes:
   text above 30 KB is read by headings/ranges, not one huge result. Copy a large
   template before editing it by search. In entries, SKILL.md means ENTRY.md.
3. Read its catalog `craft` files in `<skill>/library/craft/`. An empty list means
   typography, color and anti-ai-slop; add form-validation for forms. Ignore
   frontmatter requirements with no file.
4. Bind exactly one visual contract: supplied brand source, active project/design
   system, or a subject-specific design spec. It overrides template aesthetics.
   For a library system read USAGE.md → DESIGN.md → tokens.css; preserve actual
   theme values. Directions may inform an original spec; they are not a ceiling.
   Read one block from `<skill>/library/directions.md`, not every direction.

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

Use the printed URL; a busy port changes it. `/view/` adds a preview shell,
`/raw/` shows the artifact. The server reloads edits and records Alt+click comments
against data-craft-id values; `--comments DIR` lists them, `--resolve DIR ID`
resolves an applied comment. Do not expose neighbouring experiment results.

After implementation, run the combined checks at the requested sizes:

```sh
node <skill>/scripts/verify.mjs design/<slug>/index.html --state design/<slug>/.craft-guide.json --width 1440,390
```

Check responsive widths together: default heights are 900 for desktop and 844 for
phone. Add --height for another common height, --fit for a no-scroll frame, and
--mode desktop for a narrow fixed artboard. The command owns output paths and
returns current counts, source-bound PNGs, diagnostics and a repeatCommand.
When passed:false, repair the listed causes and run that complete command again;
ordinary quality findings are not a reason to stop after one diagnostic. Read
summary.json if remainingDiagnostics is nonzero. Never change checks or hide
required content to obtain a pass. Use the latest counts, not earlier logs or
memory; an edit invalidates the previous verification at every affected size.
Then view every final PNG and check its facts against the brief. Explain genuine
source-contract exceptions without claiming a full pass. No browser means
incomplete checks, explicitly reported after diagnosing the environment failure.
A technical pass does not prove taste, facts, accessibility or visual review.

Use inspect.mjs/tokens.mjs for focused diagnosis. For --contract readiness/content,
--scenario fixtures, scroll/click states, or report limitations use inspection.md
(delivered when selected). shot.mjs only captures. The guide also introduces image
search/get with attribution, brand-kit generation and token extract/sync/import.
Changes after the final PNG require new verification of the delivered file.
