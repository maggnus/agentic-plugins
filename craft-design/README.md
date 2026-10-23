# craft-design

A light approximation of OpenDesign and Claude Design for Codex and Claude Code: the agent
designs standalone HTML artifacts (prototypes, landing and marketing pages, dashboards, mobile
screens, documents, wireframes, brand kits, motion frames) with OpenDesign's method, and the
user watches them in a live preview. No daemon, desktop app, MCP server or account is needed.

## Installation

Install only the published immutable release, never this local directory.

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v12.6.0"
claude plugin install craft-design@maggnus
codex plugin marketplace add maggnus/agentic-plugins --ref v12.6.0
codex plugin add craft-design@maggnus
```

## How it saves context

Only one skill is registered: [SKILL.md](skills/craft-design/SKILL.md), a router of about 1,300
tokens. Everything else is read on demand:

- `references/charter.md` — the design method (brief, direction, plan, build, verification,
  refinement, craft rules), read once per conversation before the first artifact;
- `references/brief.md`, `protocol.md`, `platforms.md`, `print-and-diagrams.md` — read only when
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
Chrome, Chromium, Edge or Brave and reports horizontal overflow with the offending elements.
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

The library is generated from OpenDesign (Apache-2.0); see [NOTICE](NOTICE) and
`library/SOURCE.json`. It holds 113 skills and templates with real content, 11 craft rule files,
152 design systems, 5 visual directions and 5 device frames. Excluded: placeholder stubs that
only point to other repositories, entries that work only inside OpenDesign, PDF/PPTX export,
paid media generation, video, Figma, and all presentation (deck, slides) entries.

To update it from an OpenDesign checkout, edit `sync.config.json` if needed and run:

```sh
node craft-design/scripts/sync-from-open-design.mjs <open-design checkout>
```

Entry-specific adaptations live in `overlays/<id>.md` and are inserted on every sync. Never edit
`library/` by hand.

## Verification

Run `npm test` from the repository root. It checks packaging, the library's integrity and the
preview server. Visual quality of generated designs is judged per task, not by the tests.
