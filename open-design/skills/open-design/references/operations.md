# Runtime and recovery

Install the official OpenDesign desktop release from [nexu-io/open-design](https://github.com/nexu-io/open-design/releases/tag/open-design-v0.24.1) into a stable application location. The plugin does not bundle OD or a model. Use an already-authorized local coding agent or a provider chosen by the user. Do not silently create an account or buy credits.

Launch OD, choose Local AI and the intended existing agent if onboarding is required, then run the helper's `discover`. On macOS/Linux discovery uses `lsof` and verifies the health response, version, UI and project inventory. If multiple instances or another packaging layout make discovery ambiguous, use explicit `connect --daemon http://127.0.0.1:<port> --web http://127.0.0.1:<port>`. The web origin must serve both UI and `/api/health`; the packaged static-file port alone is insufficient. After OD restarts, run discovery again because its ports may change.

The helper fails closed on an untested OD version. Upgrade its compatibility claim only after running the create/worktree, source-run, preview and lifecycle checks against the new version. The documented folder-server auto-detection RFC is not evidence that a released version implements it.

Desktop `project import-folder` can return `desktop import token rejected`. Select the external folder in OD's interface, or use `prepare` to populate a new OD-owned project. Do not extract or forge a desktop import token. Worktrees prepared by the helper share Git history, not uncommitted/ignored files. They remain until normal project cleanup; `down` does not delete them.

Preview processes are grouped under a worker with a random identity and recorded start time. Stop checks this identity, then terminates only that group. On failed readiness, earlier services started by the same up operation are stopped. A stale PID is not a license to terminate another process. An interrupted `operation.lock` needs inspection of state and process ownership before removing that lock; do not delete it just to make a second start succeed.

Known limitations: macOS/Linux process management only; both Codex and Claude Code can invoke the same skill. Browser controls of a nested app depend on its sandbox/storage compatibility. Framework hot reload and OD iframe replacement may reset preview state. A dev-mode Storybook may have missing fonts despite a successful build; use its supported static build when needed. The direct application URL distinguishes an app failure from an embedding failure. Do not solve embedding by disabling TLS, CORS or the OD sandbox.

Privacy: OD 0.24.1 has optional content/metrics telemetry and separate reliability diagnostics. Review its Privacy controls before sending non-public materials. The helper neither changes those controls nor claims fully offline operation. It does not copy credential files; generated prompts and project files can still reach the selected model through OD. Run only within the user's authorized task.
