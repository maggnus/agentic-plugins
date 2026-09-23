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
claude plugin marketplace add "maggnus/agentic-plugins@v12.0.4"
claude plugin install brief@maggnus
```

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v12.0.4
codex plugin add brief@maggnus
```

## `paseo-cto`

A fast CTO loop over isolated Paseo agents: plan tasks dispatched to builders in their own
worktrees, acceptance by risk, one command that lands an accepted branch and watches its rollout,
and a one-line status. Models and reasoning effort are owner decisions recorded in the project
settings. See [paseo-cto/README.md](paseo-cto/README.md).

```sh
PASEO_CTO_TAG=v12.0.4
claude plugin marketplace add "maggnus/agentic-plugins@${PASEO_CTO_TAG}"
claude plugin install paseo-cto@maggnus
```

```sh
PASEO_CTO_TAG=v12.0.4
codex plugin marketplace add maggnus/agentic-plugins --ref "$PASEO_CTO_TAG"
codex plugin add paseo-cto@maggnus
```

## `team`

The same delivery discipline for a project that needs no fleet, in one skill file: outcomes with
acceptance, checks sized to the risk, a check seen failing before it counts, an independent read of
the diff before a risky change lands, and a reviewer and author who converge on it across up to two
returns. See [team/README.md](team/README.md).

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v12.0.4"
claude plugin install team@maggnus
```

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v12.0.4
codex plugin add team@maggnus
```

## `russian-speech`

Coherent Russian technical prose: reconstruct meaning from compressed working notes instead of
translating them literally, preserving technical terms and facts. See
[russian-speech/README.md](russian-speech/README.md).

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v12.0.4"
claude plugin install russian-speech@maggnus
```

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v12.0.4
codex plugin add russian-speech@maggnus
```

Adding the marketplace once is enough for all four; the command is repeated so each plugin can be
installed on its own.

## Release

Every change requires a new shared version and publication to GitHub. All plugins use that
version in their Claude Code manifests; all Codex manifests use the same base version plus one
shared cache-busting suffix. The Git tag is `v` followed by the shared version. A published tag
is never moved, and a local edit alone is not a completed delivery.

Commit the changes, then run the local release script. It derives the next shared version from
all commits since the last release: `feat` raises the minor version, a breaking change raises
the major version, and other changes raise the patch version. Commit scopes do not create
independent plugin versions. All manifests and README installation tags are updated together.

For GitHub Actions, first run `python3 .github/scripts/bump.py`, commit the resulting manifests
and README changes, and push them. The workflow publishes the prepared version.

```sh
bash paseo-cto/scripts/release.sh                                      # from a local clone
gh workflow run release.yml -R maggnus/agentic-plugins                 # or on GitHub Actions
gh workflow run release.yml -R maggnus/agentic-plugins -f dry_run=true # validation only
```

Both paths run the contract tests, refresh the shared Codex suffix for all plugins, verify that
every package uses the same version, and refuse a version whose tag already exists.

## Upgrade

Re-pin the marketplace to the new tag and reinstall the plugins that are in use:

```sh
PASEO_CTO_TAG=v12.0.4
claude plugin marketplace remove maggnus --scope user
claude plugin marketplace add "maggnus/agentic-plugins@${PASEO_CTO_TAG}" --scope user
claude plugin install <plugin>@maggnus --scope user

codex plugin marketplace remove maggnus
codex plugin marketplace add maggnus/agentic-plugins --ref "$PASEO_CTO_TAG"
codex plugin add <plugin>@maggnus
```

`paseo-cto` can do this itself — see its README. Restart Claude Code and start a new Codex
conversation afterwards so both hosts load the tagged skills.
