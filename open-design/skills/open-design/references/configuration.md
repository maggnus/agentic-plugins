# Project configuration

A `.open-design.json` is portable between working copies. Commands use argument arrays, not shell strings; `cwd` is relative to the selected OD project directory and must stay within it. Do dependency installation and builds through the project's usual commands before `up`. The helper does not infer scripts from arbitrary package manifests.

```json
{
  "version": 1,
  "services": [
    {
      "name": "ui",
      "cwd": "frontend",
      "argv": ["pnpm", "exec", "vite", "--host", "127.0.0.1", "--port", "7980"],
      "url": "http://127.0.0.1:7980/",
      "env": {"NO_COLOR": "1"}
    }
  ],
  "views": [
    {"name": "Application", "url": "http://127.0.0.1:7980/"},
    {"name": "Components", "url": "http://127.0.0.1:7980/components"}
  ]
}
```

Use the project's actual commands, paths and free ports, not these example values. Bind servers to loopback. Environment values are optional, inherit the caller's environment and must not put secrets into committed configuration. Readiness URLs and view URLs accept only HTTP loopback addresses with explicit ports; authenticated/remote preview deployment is outside this helper.

A service without `argv` is externally managed: the helper waits for its URL but never stops it. For owned services, an occupied port is an error; the helper never adopts or kills a process merely because it listens there. Start is idempotent for a healthy identical configuration. A changed config or failed service requires `down` followed by `up`.

The helper stores connection details, private service descriptors, logs and process identity under `~/.config/agentic-open-design`; `AGENTIC_OD_HOME` selects another state directory. Generated preview filenames include a configuration digest and are never overwritten if their contents differ. A changed config produces a new preview artifact. Old artifacts remain inspectable.

The wrapper offers view tabs, an explicit reload and an external link. It embeds existing servers and contains no project styling or copied components. OD and the servers run on the same computer; a loopback preview is not a shareable public site. Inline editing/comment coordinates, nested screenshot export and mobile-device emulation are not guaranteed by embedding. Use the project's actual browser/device checks.
