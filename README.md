# Claude/Codex plugins

Personal plugin repository (`maggnus`) for exactly two platforms: Claude Code and Codex.
All plugins share one release version, are packaged for both platforms, and are installed from
the remote marketplace pinned to an immutable release tag.
A local directory, a moving branch, or an unpinned marketplace is not a valid installation source.

## `brief`

The phase before the first line of code: the product stated as one claim with the refusals that
bound it, tested against unlike uses so that no capability enters for a single case, turned into a
numbered proof a stranger can run, and ordered into slices whose first one carries a consumer end to
end — leaving the entry point, product document, decision records and invariant registry every later
decision is read from. It tracks no work and lands no change: whoever executes takes the first slice
from it. See [brief/README.md](brief/README.md).

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v12.0.6"
claude plugin install brief@maggnus
```

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v12.0.6
codex plugin add brief@maggnus
```

## `paseo-cto`

A fast CTO loop over isolated Paseo agents: plan tasks dispatched to builders in their own
worktrees, acceptance by risk, one command that lands an accepted branch and watches its rollout,
and a one-line status. Models and reasoning effort are owner decisions recorded in the project
settings. See [paseo-cto/README.md](paseo-cto/README.md).

```sh
PASEO_CTO_TAG=v12.0.6
claude plugin marketplace add "maggnus/agentic-plugins@${PASEO_CTO_TAG}"
claude plugin install paseo-cto@maggnus
```

```sh
PASEO_CTO_TAG=v12.0.6
codex plugin marketplace add maggnus/agentic-plugins --ref "$PASEO_CTO_TAG"
codex plugin add paseo-cto@maggnus
```

## `team`

The same delivery discipline for a project that needs no fleet, in one skill file: outcomes with
acceptance, checks sized to the risk, a check seen failing before it counts, an independent read of
the diff before a risky change lands, and a reviewer and author who converge on it across up to two
returns. See [team/README.md](team/README.md).

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v12.0.6"
claude plugin install team@maggnus
```

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v12.0.6
codex plugin add team@maggnus
```

## `russian-speech`

Coherent Russian technical prose: reconstruct meaning from compressed working notes instead of
translating them literally, preserving technical terms and facts. See
[russian-speech/README.md](russian-speech/README.md).

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v12.0.6"
claude plugin install russian-speech@maggnus
```

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v12.0.6
codex plugin add russian-speech@maggnus
```

Adding the marketplace once is enough for all four; the command is repeated so each plugin can be
installed on its own.

## Release

Every change requires a new shared version and publication to GitHub. All plugins use that
version in their Claude Code manifests; all Codex manifests use the same base version plus one
shared cache-busting suffix. The Git tag is `v` followed by the shared version. A published tag
is never moved, and a local edit alone is not a completed delivery.

After a push to `main`, [GitHub Actions](.github/workflows/release.yml) runs the tests and
[semantic-release](https://github.com/semantic-release/semantic-release). It chooses one version
from the commits since the last tag: `feat` raises the minor version, `!` or `BREAKING CHANGE`
raises the major version, and other changes raise the patch version, including documentation.

The release updates every plugin manifest and README installation tag, updates `CHANGELOG.md`,
creates a `chore(release)` commit, pushes an immutable tag and publishes a GitHub Release.
The Codex suffix is shared across all plugins. Do not bump versions or create release tags manually.
Concurrent releases are serialized; the generated commit uses `[skip ci]` to avoid another run.

```sh
npm ci
npm test
# Commit and push the source changes; GitHub Actions publishes the release.
git push origin main
# Optional manual run or preview:
gh workflow run release.yml -R maggnus/agentic-plugins
gh workflow run release.yml -R maggnus/agentic-plugins -f dry_run=true
```

A preview checks the next version without committing or publishing. The release preparation
and commit/tag behavior are tested against a temporary Git repository by `npm test`.
The built-in `GITHUB_TOKEN` needs `contents: write`; no npm publication or npm token is used.

## Upgrade

Re-pin the marketplace to the new tag and reinstall the plugins that are in use:

```sh
PASEO_CTO_TAG=v12.0.6
claude plugin marketplace remove maggnus --scope user
claude plugin marketplace add "maggnus/agentic-plugins@${PASEO_CTO_TAG}" --scope user
claude plugin install <plugin>@maggnus --scope user

codex plugin marketplace remove maggnus
codex plugin marketplace add maggnus/agentic-plugins --ref "$PASEO_CTO_TAG"
codex plugin add <plugin>@maggnus
```

`paseo-cto` can do this itself — see its README. Restart Claude Code and start a new Codex
conversation afterwards so both hosts load the tagged skills.
