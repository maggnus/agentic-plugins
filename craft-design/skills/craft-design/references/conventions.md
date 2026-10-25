# Reading library entries outside the desktop app

Library entries were written for a desktop design app (daemon, preview pane,
`craft` command line). Here the agent works with plain files and its own tools.
Apply these substitutions; an entry-specific "craft-design adaptation" note at
the top of an entry overrides this table.

| Entry says | Do instead |
|---|---|
| "Emit" / "end with" an `<artifact identifier="slug" type="text/html" title="…">` block | Write the HTML to `design/<slug>/index.html` (or the named file). Never put source in the reply; summarize the files. |
| `<question-form>` JSON, `[form answers — …]` | Ask with the host's question tool as `brief.md` describes; the answers are locked the same way. |
| `"$CRAFT_NODE_BIN" "$CRAFT_BIN" tools directions --id <id>`, `craft tools directions` | Read that direction in `library/directions.md`. |
| `craft … export --format image`, "render the artifact" | `node <skill>/scripts/shot.mjs <file> --width <px>[,<px>]`, as the charter's verification step says. |
| `craft media generate --surface image` | The host's own image generation, if any; otherwise real images or a labeled placeholder. |
| `craft media generate --surface video`, `media scaffold`, `media wait`, `.mp4` delivery | Not available. Deliver the HTML composition itself (motion frames loop in the browser) and say video rendering is out of scope. |
| `craft brand preview` / `craft brand finalize` | See the adaptation note in `brand-extract`. |
| `$CRAFT_PROJECT_ID`, `$CRAFT_PROJECT_DIR`, "the project" | The artifact directory, by default `design/<slug>/`. `{{project_id}}` placeholders become the slug. |
| The app's preview pane, "the preview iframe", Design/Preview tab | The craft-design preview (`scripts/preview.mjs`). Its rules still hold: no `scrollIntoView`, no hotlinked images. |
| In-app Browser tab, `agent-browser` driving app tabs | The host's browser tool; `agent-browser` only when its CLI is already installed; otherwise fetch HTML and CSS directly and say so. |
| Comment / inspect mode, "the element the user selected" | Comments from `design/.craft-comments.jsonl` (written by the preview on Alt+click), matched by `data-craft-id` or selector. |
| Live Artifact, `craft tools live-artifacts create/update`, connectors, `POST /api/craft/connectors/poll`, `<meta name="craft:project">` | A static artifact with a data snapshot: fetch real data once through the host's MCP tools or CLIs (`gh`, files the user names), write it into `data.json` or inline it, and show its timestamp. Without a source, use clearly labeled demo data. No polling endpoint exists. |
| Daemon endpoints (`/api/projects/…`, `/api/craft/…`), `CRAFT_DAEMON_URL` | Do not call them. Scripts that accept them as optional run without them. |
| `postMessage` to the host app (`craft:*` message types) | Harmless no-op; leave it. |
| `data-craft-id`, `data-craft-edit` attributes | Keep and add them as the charter says; the preview uses `data-craft-id`. |

Product endpoints that belong to the designed product itself (for example a
contact form posting to `/api/contact`) are content, not app protocol: keep them
as mock handlers.

## Entry metadata

The `craft:` block in each `ENTRY.md` frontmatter means:

- `mode` — prototype, template, design, utility, image and so on: what kind of
  artifact the entry produces;
- `platform` / `surface` and `scenario` — where and for what it is used;
- `design_system.requires` — whether a visual contract must be bound first; a
  brand spec, a design system or your design spec all satisfy it, and "the active /
  injected DESIGN.md" in entry text means that contract (`sections` lists the
  `DESIGN.md` sections it relies on);
- `craft.requires` — craft files to read from `library/craft/`;
- `inputs` / `parameters` — values to collect; ask only for required ones that
  the brief does not already give, and use declared defaults otherwise;
- `preview`, `example_prompt`, `capabilities_required` — gallery and runtime
  hints of the desktop app; ignore them.

Paths inside an entry are relative to that entry's directory, for example
`assets/template.html` means `library/skills/<id>/assets/template.html`; a
`SKILL.md` in its text or file trees is that entry's `ENTRY.md`.
