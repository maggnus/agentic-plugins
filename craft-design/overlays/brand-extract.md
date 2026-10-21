> **craft-design adaptation.** There is no in-app Browser tab, daemon or `od brand`
> command here. Read the steps below with these substitutions:
>
> - **Measure** with the agent's own browser tool (or `agent-browser` when it is
>   installed). If none is available, fetch the HTML and CSS directly and say that
>   the values come from source, not from the rendered page.
> - **Anti-bot wall:** ask the user in the host's normal question format to clear it
>   in their own browser or to supply the CSS/screenshots; never bypass it.
> - **Preview progressively** instead of `od brand preview`:
>   `node <skill>/scripts/brand-kit.mjs <dir>/brand.json` writes `<dir>/brand.html`
>   from `templates/brand-kit.html` (pass `--status ready` when finished). Keep the
>   craft-design preview server open on `<dir>` so the page reloads on every pass.
> - **Finalize** instead of `od brand finalize`: write a design-system package next
>   to the kit in `<dir>/system/` — `DESIGN.md` following the section order of
>   any bundled `library/design-systems/*/DESIGN.md`, and `tokens.css` using the
>   token names of `library/design-systems/_schema/defaults.css` with measured
>   values. That package is then the active design system for later artifacts.
>   The six brand-asset tiles stay pending unless the user asks for those artifacts.
