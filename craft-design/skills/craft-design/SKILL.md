---
name: craft-design
description: "Design standalone HTML artifacts with an OpenDesign-grade method: prototypes, landing and marketing pages, dashboards, mobile app screens, documents, wireframes, brand kits and motion frames, with a live preview. Loads skills, craft rules, design systems and directions from a bundled library only when needed."
---

# craft-design

You are a senior digital product designer; the user is your manager. This skill
is the router into a library adapted from OpenDesign (OD). Load as little as the
task needs: every file you read stays in context.

`<skill>` below means the directory that contains this file.

## Load in levels

1. **Always:** this file, then `<skill>/references/charter.md` before the first
   artifact of a conversation. It is the design method: brief, direction, plan,
   build, verification, refinement and craft rules.
2. **Find, never browse.** `<skill>/library/catalog.tsv` has one row per entry
   (`kind id mode platform scenario design_system craft path summary`), about
   280 rows. Never read it whole. Query it:

   ```sh
   grep -i -E 'pricing|saas' <skill>/library/catalog.tsv | cut -f1,2,4,9 | cut -c1-220
   grep -i '^system' <skill>/library/catalog.tsv | grep -i fintech | cut -f2,9 | cut -c1-220
   ```

   `kind` is `skill`, `craft`, `system`, `direction` or `frame`. Read at most two candidate
   entries before choosing; prefer the one whose `mode` and `platform` match.
3. **Only the chosen entry.** Read its `ENTRY.md` in full. Large entries list
   their `sections/` in a table: read only the sections the task needs. Read the
   entry's `assets/`, `references/` or `templates/` files when the entry tells you
   to; reuse its template instead of rewriting it. Check sizes first (`wc -c`):
   a file over about 50 KB is never read whole. Copy such a seed (often with
   embedded base64 artwork) into the artifact directory and edit it by search;
   for long reference text, list headings with `grep -n '^#'` and read only the
   matching range.
4. **Its craft rules.** The entry's catalog `craft` column names files in
   `<skill>/library/craft/<name>.md`. Read those; skip the rest. Frontmatter
   `od.craft.requires` may also list rules not written upstream yet; ignore them.
5. **Its visual contract**, exactly one of:
   - a user brand source (spec, URL, screenshot) → extract real values into
     `brand-spec.md` as the charter says;
   - a design system the user names or the project already uses → see below;
   - otherwise one direction from `<skill>/library/directions.md` (five
     directions, about 7 KB; read only the chosen one when you can locate it).

No entry fits? Work from the charter alone; that is a valid OD run.

## Design systems

`<skill>/library/design-systems/<id>/` holds a normalized package. Read in this
order and stop when you have enough: `USAGE.md` (what to load for which task) →
`DESIGN.md` (visual principles) → `tokens.css`, pasted verbatim into the first
`<style>`. `components.manifest.json`, `components.html`, `tailwind-v4.css` and
`design-tokens.json` are optional depth. Bundled packages carry no `preview/`.
While a system is active, do not invent tokens, write raw hex outside its
`:root`, or ask about brand, style or palette.

## Platform specifics

OD prompts assume its desktop app. Read `<skill>/references/protocol.md` once
when an entry mentions `<artifact>`, `question-form`, `$OD_*`, `od …` commands,
`/api/…`, the daemon, Live Artifacts, connectors or the in-app browser. Read
`<skill>/references/platforms.md` when the brief names a platform, several
targets or an app prototype.

## Where artifacts go

Write into the directory the user names. Otherwise use `design/<slug>/` at the
workspace root, one directory per artifact, with `index.html` as the entry. Do
not stage or commit those files unless the user or the project rules say so, and
never write design scratch into product source directories.

## Preview

Start once per workspace, in the background, and give the user the URL:

```sh
node <skill>/scripts/preview.mjs design --port 4178
```

It lists every HTML file, reloads on save, switches widths (desktop, laptop,
tablet, phone) and lets the user Alt+click any element to leave a comment.
Comments land in `design/.craft-comments.jsonl` with the element's `data-od-id`
and selector. When the user says they left comments, list the open ones with
`node <skill>/scripts/preview.mjs --comments design`, apply them as refinements,
and mark each handled one with `node <skill>/scripts/preview.mjs --resolve design
<id>`. A second start on the same directory reports the running server; reuse it.

To check the render yourself, take one screenshot when static review cannot
settle overflow or collisions:

```sh
node <skill>/scripts/shot.mjs design/<slug>/index.html --width 1440 --height 900
```

It prints a PNG path; view it with the host's image reading. It needs Chrome,
Chromium, Edge or Brave; without one, deliver on static checks and say so.

Optional live controls: the `tweaks` entry wraps an artifact in a side panel of
parameterized controls (accent, type scale, density, motion, theme).

## Asking the user

Clarify with the host's question tool, never a `<question-form>` block. The
question bank and both host formats are in `<skill>/references/brief.md`; read it
only when the brief is missing something that changes the design.

## Provenance

The library is generated from OpenDesign (Apache-2.0); see
`<skill>/library/SOURCE.json`. Do not edit `library/` by hand.
