# craft-design

A design studio for Codex and Claude Code: the agent designs any visual artifact, from brief to
a finished, verified result (app and product screens, prototypes, landing and marketing pages,
dashboards, documents and print, posters and cards, brand kits, motion frames), and the user
watches it in a live preview. No daemon, desktop app, MCP server or account is needed.

## Installation

Install only the published immutable release, never this local directory.

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v13.0.2"
claude plugin install craft-design@maggnus
codex plugin marketplace add maggnus/agentic-plugins --ref v13.0.2
codex plugin add craft-design@maggnus
```

## How it works

Before authoring, the agent receives a complete capability overview and follows a design charter: brief, spec, direction, plan, build, verification, refinement.
Each result is a self-contained file that opens in a browser, so it can be previewed, screenshotted
and checked like any web page.

An optional **visual concept → editable artifact** path can use an image proposal
before implementation. The author checks actual image-generation and image-viewing
capabilities separately: it can use an available host generator, work from an
existing reference without generating again, or build directly when these tools
are missing or the proposal is unsuitable. No image model, service or credentials
are bundled. Small changes and established product components keep the direct path.
See [visual concepts](skills/craft-design/references/visual-concepts.md).

## How it saves context

Only one skill is registered: [SKILL.md](skills/craft-design/SKILL.md), a compact entry point. Before authoring, `craft-guide.mjs` delivers a mandatory overview of
every capability, the charter and the visual-method guidance in bounded packets.
Each next call acknowledges the receipt at the end of the previous packet.
The author records a route and a reason for using, skipping or lacking each capability;
applicable reference details follow before READY. This tracks delivery and declared
decisions, not comprehension or an unbypassable filesystem restriction.

Supporting resources:

- `references/charter.md` and `charter-craft.md` — the design method (brief, direction, plan,
  build, verification, refinement) and the craft rules, delivered in packets before each artifact;
  a pending packet can be repeated after interrupted output;
- `references/brief.md`, `conventions.md`, `platforms.md`, `print-and-diagrams.md`,
  `visual-concepts.md` — visual-method guidance is always known before choosing;
  the remaining references load when the recorded task needs them;
- `library/catalog.tsv` — one row per skill, template, design system, craft rule, direction and
  device frame, queried with `grep`, never read whole;
- `library/skills/<id>/ENTRY.md` — the chosen entry only; large entries are split into
  `sections/` so only the needed parts are read.

## Preview and verification

`craft-guide.mjs begin --state /absolute/artifact/.craft-guide.json` starts instruction delivery.
Use one packet per model-visible tool call, never a shell loop. `status` repeats the
pending packet; `next --receipt TOKEN` acknowledges it. `decide --json 'JSON'`
requires an assessment of every capability and separate generation/viewing evidence.
Changed instruction editions invalidate saved receipts. The state is local workflow
evidence, not a credential or a security boundary. The selected catalog entry and
its craft rules are delivered through the same bounded reader. Use absolute --state
and --plan paths: Codex may report only the session directory to a hook even when
exec_command selects another workdir. Invocation evidence binds exact arguments
and resolved data paths, so an absolute invocation can work from either directory.

### Host guard and its limits

The bundled PreToolUse hook must run before guide commands. It rejects shortened,
piped or compound invocations, blocks other supported local tools while a packet
is pending, and permits only read/discovery or guide operations while choosing the
route. `decide --json 'JSON'` avoids a separate plan-file write. Once READY, ordinary
artifact work proceeds. Without an observed hook invocation, the guide fails before
recording delivery. Normal work in sessions without an active guide is unaffected.

In Codex, installing a plugin does **not** trust its hooks: review this plugin's
hook in `/hooks`. Hook changes may require review again. Claude Code also requires
a configuration where plugin hooks run. These are host requirements, not a new
permission to bypass another policy. No trust configuration is changed by the plugin.

The guard is a workflow check for cooperative authors, not a sandbox: it starts
at an attempted `craft-guide.mjs begin`, cannot prove comprehension, and does not control hosted or
specialized paths that the client does not expose to hooks. Arbitrary shell access
can tamper with local evidence. A caller needs an external controlled environment
for adversarial enforcement. If hooks are disabled, unsupported, skipped or fail,
do not represent preparation as complete. Do not publish a claim that all model
behavior is mechanically constrained.

A failed or compound start remains visibly incomplete. An unobserved invocation
does not prove hooks are disabled: retry the printed literal command once in the
same working directory. If that also fails, report activation as unverified; `status` repeats a pending packet. If the task is explicitly cancelled,
`cancel --state FILE --reason TEXT` releases the session even when the state file
was never created or is unreadable, without overwriting an unrelated file.


`verify.mjs FILE --state STATE [inspection options]` refuses an incomplete guide,
runs both strict token and render checks, and saves separate logs plus `summary.json`
in a fresh directory next to the state. It validates source/PNG hashes and expected
render reports, reports current counts and repair diagnostics, and returns the exact
command to repeat after edits. Check responsive widths together; the default
1440,390 widths use 900,844 heights. `tokens check --json` exposes structured
evidence and distinguishes inactive responsive consumers from broken visible bindings.
Warnings, missing reports and unavailable browser checks are not silently accepted.
Ordinary quality findings require repair and another complete check; only environment
failures justify incomplete verification. The author still inspects PNGs and facts.
`passed` covers mandatory technical checks; `clean` also requires zero review findings.


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
