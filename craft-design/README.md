# craft-design

A design studio for Codex and Claude Code: the agent designs any visual artifact, from brief to
a finished, verified result (app and product screens, prototypes, landing and marketing pages,
dashboards, documents and print, posters and cards, brand kits, motion frames), and the user
watches it in a live preview. No daemon, desktop app, MCP server or account is needed.

## Installation

Install only the published immutable release, never this local directory.

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v12.10.0"
claude plugin install craft-design@maggnus
codex plugin marketplace add maggnus/agentic-plugins --ref v12.10.0
codex plugin add craft-design@maggnus
```

## How it works

The agent follows a design charter: brief, spec, direction, plan, build, verification, refinement.
Each result is a self-contained file that opens in a browser, so it can be previewed, screenshotted
and checked like any web page.

## How it saves context

Only one skill is registered: [SKILL.md](skills/craft-design/SKILL.md), a router of about 1,300
tokens. Everything else is read on demand:

- `references/charter.md` and `charter-craft.md` — the design method (brief, direction, plan,
  build, verification, refinement) and the craft rules, read once per conversation before the
  first artifact; split in two so that no host truncates a single read;
- `references/brief.md`, `conventions.md`, `platforms.md`, `print-and-diagrams.md` — read only when
  the situation needs them;
- `library/catalog.tsv` — one row per skill, template, design system, craft rule, direction and
  device frame, queried with `grep`, never read whole;
- `library/skills/<id>/ENTRY.md` — the chosen entry only; large entries are split into
  `sections/` so only the needed parts are read.

## Preview and verification

`scripts/preview.mjs` is a dependency-free Node server bound to `127.0.0.1`: a list of
artifacts, live reload on save, desktop/laptop/tablet/phone widths, and Alt+click comments that
are stored next to the artifacts for the agent and copied to the clipboard. `scripts/shot.mjs`
renders one or more exact viewport widths (phone emulation below 600px) with an installed
Chrome, Chromium, Edge or Brave, opens states first on request (`--click <selector>`, a `#fragment`)
and reports horizontal overflow with the offending elements.
`scripts/inspect.mjs` adds a structured report from that same render: clipping,
possible occlusion, broken images, control names, contrast review and sampled
actual fonts. `--fit` checks a no-scroll brief, `--strict` fails on measured errors;
review findings and explicitly unexamined cases still need visual judgment.
`--contract expectations.json` adds brief-derived readiness, element-count, text
and size checks, including selected same-origin iframe content. Exceptions and
console errors are recorded; `noRuntimeErrors` in the contract makes them fail
strict inspection. `--mode desktop` preserves the exact CSS width of a narrow
fixed artboard without mobile scaling; the default `auto` behavior is unchanged.
`--scenario fixture.json` applies explicit data through an isolated artifact’s own
preview adapter, awaits completion, and records the input hash. It supports checking
the same implementation on contrasting conditions; it does not evaluate meaning or taste.
See [render inspection](skills/craft-design/references/inspection.md) for the schema,
limits and the difference between a technically valid render and a good design.
`scripts/tokens.mjs` keeps the theme honest: `check` finds values outside the theme and tokens
no element follows (with a browser it changes each token in turn and watches whether any computed
style moves), `extract` and `sync` share one brand theme between artifacts, and `import` turns
project token JSON (W3C Design Tokens, Style Dictionary or plain nested JSON, several files,
aliases, arithmetic, light and dark values) into that theme, refusing with the token's path
whatever it cannot carry faithfully. `scripts/images.mjs` searches Wikimedia Commons or Openverse for photos under
licenses that allow commercial use and modification, downloads them into the artifact's `img/`
and keeps `img/CREDITS.md`. `scripts/brand-kit.mjs` renders the brand-extract kit page from
`brand.json`.

Requirements: Node.js 22 or newer; a Chromium-family browser for screenshots; network access
for image search.

## Library

The bundled library holds 112 skills and templates with real content, 11 craft rule files, 152
design systems, 5 visual directions and 5 device frames, all in one naming scheme. It is
generated and never edited by hand.

Maintainers rebuild it from a source checkout: edit `sync.config.json` (the selection and the
ordered rebrand rules) if needed and run

```sh
node craft-design/scripts/sync-library.mjs <source checkout>
```

Entry-specific adaptations live in `overlays/<id>.md` and are inserted on every sync. The
provenance of the current build is recorded in [library-source.json](library-source.json).

## Verification

Run `npm test` from the repository root. It checks packaging, the library's integrity and the
preview server. Visual quality of generated designs is judged per task, not by the tests.
