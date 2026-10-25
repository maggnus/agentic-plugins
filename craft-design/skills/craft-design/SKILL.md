---
name: craft-design
description: "Design any visual artifact: app and product screens, prototypes, landing and marketing pages, dashboards, documents and print, posters and cards, brand kits, motion frames. Works from brief and spec to a built and verified design with a live preview; loads templates, design systems and craft rules from a bundled library only when needed."
---

# craft-design

You are a senior digital product designer; the user is your manager. This skill
is the router into a bundled design library. Load as little as the
task needs: every file you read stays in context. Claude Code and Codex run it
alike.

`<skill>` below means the directory that contains this file.

## Load in levels

1. **Always:** this file, then the charter before the first artifact of a
   conversation: `<skill>/references/charter.md` (brief, spec, directions, plan,
   build, verification, refinement) and `charter-craft.md` (craft rules), each
   whole in its own unbatched command: hosts cut long tool results (Codex at
   about 10k tokens). Each ends with "End of charter part N."; if missing,
   reread that part alone.
2. **Find, never browse.** `<skill>/library/catalog.tsv` has one row per entry
   (`kind id mode platform scenario design_system craft path summary`), about
   280 rows. Never read it whole. Query it:

   ```sh
   grep -i -E 'pricing|saas' <skill>/library/catalog.tsv | cut -f1,2,4,9 | cut -c1-220
   grep -i '^system' <skill>/library/catalog.tsv | grep -i fintech | cut -f2,9 | cut -c1-220
   ```

   `kind` is `skill`, `craft`, `system`, `direction` or `frame`. Read at most two
   candidate entries before choosing; prefer the one whose `mode` and `platform`
   match.
3. **Only the chosen entry.** Read its `ENTRY.md` in full. Large entries list
   their `sections/` in a table: read only the sections the task needs. Read the
   entry's `assets/`, `references/` or `templates/` files when the entry tells you
   to; reuse its template instead of rewriting it. Check sizes first (`wc -c`):
   a file over about 30 KB is never read whole (it would be cut); copy such a
   seed into the artifact directory and edit it by search, and read long text
   by heading in ranges.
4. **Its craft rules.** The entry's catalog `craft` column names files in
   `<skill>/library/craft/<name>.md`. Read those; when the column is empty, read
   `typography`, `color` and `anti-ai-slop` (with a form, `form-validation`).
   Skip the rest. Frontmatter `craft.craft.requires` may also list
   rules that have no file yet; ignore them.
5. **Its visual contract**, exactly one of:
   - a user brand source (spec, URL, screenshot) → extract real values into
     `brand-spec.md` as the charter says;
   - a design system the user names or the project already uses → see below;
   - otherwise your design spec for this subject (charter, Lock brand and
     direction); a library system or direction may inform it, never cap it.
     Read one direction block with
     `sed -n '/(id: <id>)/,/^### /p' <skill>/library/directions.md`.

   The contract governs tokens, fonts, radii, shadows and ornament and is
   written as the theme (charter, Materialize the contract as a theme); reuse the
   template's working code, but the spec decides the sections, and the entry's
   aesthetic rules yield to the contract.

Every new artifact takes steps 2–5. An imperfect entry still gives its
template, checklist and craft; the contract overrides its look. Skip the entry
only when no row of the artifact's type matches, and name the queries. In entry
text, "SKILL.md" is that entry's `ENTRY.md` and "the active / injected
DESIGN.md" is the contract of step 5.

## Design systems

`<skill>/library/design-systems/<id>/` holds a normalized package. Read in this
order and stop when you have enough: `USAGE.md` (what to load for which task) →
`DESIGN.md` (visual principles) → `tokens.css`, pasted verbatim as the theme
between `/* tokens:start */` and `/* tokens:end */`; other files are optional
depth. While a system is active, do not
invent tokens, write raw hex outside its `:root`, or ask about brand, style or
palette.

## Platform specifics

Entries are written for a desktop design app. Read `<skill>/references/conventions.md`
once when an entry mentions `<artifact>`, `question-form`, `$CRAFT_*`, `craft …` commands,
`/api/…`, the daemon, Live Artifacts, connectors or the in-app browser. Read
`<skill>/references/platforms.md` for native platforms (iOS, Android, tablet,
desktop app), several targets, app prototypes or device frames, and
`<skill>/references/print-and-diagrams.md` for pages meant for paper or PDF and
for diagrams.

## Where artifacts go

Write into the directory the user names. Otherwise use `design/<slug>/` at the
workspace root, one directory per artifact, with `index.html` as the entry. Do
not stage or commit those files unless the user or the project rules say so, and
never write design scratch into product source directories.

## Preview

Start once per workspace, in the background, and give the user the artifact's
link it prints:

```sh
node <skill>/scripts/preview.mjs design --port 4178
```

`/view/<path>` opens an artifact in the shell, `/raw/<path>` the file alone; the
root lists every HTML file; a busy port moves on, the printed URL is
authoritative. It reloads on save, switches widths and lets the user Alt+click
an element to leave a comment (`design/.craft-comments.jsonl`, with the
element's `data-craft-id` and selector). `node <skill>/scripts/preview.mjs
--comments design` lists the open ones; apply them as refinements and mark each
with `node <skill>/scripts/preview.mjs --resolve design <id>`. A second start on
the same directory reports the running server.

Verify the render as the charter says, once the build is complete:

```sh
node <skill>/scripts/shot.mjs design/<slug>/index.html --width 1440,390
```

Each width renders at an exact viewport (below 600 a phone, 844 tall) to one
PNG, with a line giving the page height and any horizontal overflow with the
offending elements. `--full` captures a page longer than a few screens, `--at
<y|selector>` scrolls first, `--click <selector>` (repeatable) or a
`#fragment` opens a state (a tab, the card's back, a dialog); `--height` and
`--out` are optional. View the PNGs
with the host's image reading. Without Chrome, Chromium, Edge or Brave, deliver
on static checks and say so.

```sh
node <skill>/scripts/tokens.mjs check design/<slug>/index.html --width 1440,390
```

`check` warns about values outside the theme and tokens no element follows.
`extract` and `sync` share one brand theme between artifacts, and `import` turns
a project's token JSON into that theme; the commands and the import contract
are in the charter (One brand or product, one theme).

## Images

The client's own venue, people and products without supplied photos get
art-directed placeholders (charter-craft, Visual finish), not stock. For named real
places or objects, or when the user asks for photos:

```sh
node <skill>/scripts/images.mjs search "espresso bar interior" [--source openverse]
node <skill>/scripts/images.mjs get '<ref from search>' design/<slug> --name hero
```

`search` lists freely licensed photos (query in English); `get` saves
one to `design/<slug>/img/`, downsized to 1600px, prints its size and appends the
credit to `img/CREDITS.md`. The `tweaks` entry adds optional live controls
(accent, type scale, density, motion, theme) around an artifact.

## Asking the user

Clarify with the host's question tool, never a `<question-form>` block; read
`<skill>/references/brief.md` first (questions from the material, concrete
options, one round, answers locked). Ask only when a gap changes direction,
structure or format or the subject is unclear; missing details of a known
subject become marked demo content; when nobody can answer, decide and list the
assumptions.

## Provenance

Do not edit `library/` by hand; it is generated.
