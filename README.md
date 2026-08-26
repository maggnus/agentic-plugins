# Claude/Codex plugins

Personal plugin repository (`maggnus`). Each plugin is packaged for both Claude Code and Codex, is
versioned on its own, and installs from the remote marketplace pinned to an immutable release tag.
A local directory, a moving branch, or an unpinned marketplace is not a valid installation source.

## `brief`

The phase before the first line of code: the product stated as one claim with the refusals that
bound it, tested against unlike uses so that no capability enters for a single case, turned into a
numbered proof a stranger can run, and ordered into slices whose first one carries a consumer end to
end — leaving the entry point, product document, decision records and invariant registry every later
decision is read from. It tracks no work and lands no change: whoever executes takes the first slice
from it. See [brief/README.md](brief/README.md).

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v10.7.1"
claude plugin install brief@maggnus
```

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v10.7.1
codex plugin add brief@maggnus
```

## `paseo-cto`

A release-driven CTO operating model over isolated Paseo agents: decomposition, delegated work with
bounded contracts, risk-sized review that the reviewer and the author converge on themselves, and
source-linked integration. Models and reasoning effort are owner decisions recorded in the project
charter. See [paseo-cto/README.md](paseo-cto/README.md).

```sh
PASEO_CTO_TAG=v10.7.1
claude plugin marketplace add "maggnus/agentic-plugins@${PASEO_CTO_TAG}"
claude plugin install paseo-cto@maggnus
```

```sh
PASEO_CTO_TAG=v10.7.1
codex plugin marketplace add maggnus/agentic-plugins --ref "$PASEO_CTO_TAG"
codex plugin add paseo-cto@maggnus
```

## `team`

The same delivery discipline for a project that needs no fleet, in one skill file: outcomes with
acceptance, checks sized to the risk, a check seen failing before it counts, an independent read of
the diff before a risky change lands, and a reviewer and author who converge on it across up to two
returns. See [team/README.md](team/README.md).

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v10.7.1"
claude plugin install team@maggnus
```

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v10.7.1
codex plugin add team@maggnus
```

## `russian-speech`

Grammatical, engineer-to-engineer Russian technical prose: meaning-first translation of engineering
terms, no literal calques, exact resource names preserved. See
[russian-speech/README.md](russian-speech/README.md).

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v10.7.1"
claude plugin install russian-speech@maggnus
```

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v10.7.1
codex plugin add russian-speech@maggnus
```

Adding the marketplace once is enough for all four; the command is repeated so each plugin can be
installed on its own.

## Release

One tag publishes the whole repository, and its name is the `paseo-cto` base version. Bump that
version in the [Claude](paseo-cto/.claude-plugin/plugin.json) and
[Codex](paseo-cto/.codex-plugin/plugin.json) manifests to the same value first; a published tag is
never moved.

```sh
bash paseo-cto/scripts/release.sh                                      # from a local clone
gh workflow run release.yml -R maggnus/agentic-plugins                 # or on GitHub Actions
gh workflow run release.yml -R maggnus/agentic-plugins -f dry_run=true # validation only
```

Both paths run the contract and work-tree tests, stamp the work tooling, refresh the Codex
cache-busting suffix, verify that the Claude and Codex packages stay in sync, and refuse a version
whose tag already exists.

## Upgrade

Re-pin the marketplace to the new tag and reinstall the plugins that are in use:

```sh
PASEO_CTO_TAG=v10.7.1
claude plugin marketplace remove maggnus --scope user
claude plugin marketplace add "maggnus/agentic-plugins@${PASEO_CTO_TAG}" --scope user
claude plugin install <plugin>@maggnus --scope user

codex plugin marketplace remove maggnus
codex plugin marketplace add maggnus/agentic-plugins --ref "$PASEO_CTO_TAG"
codex plugin add <plugin>@maggnus
```

`paseo-cto` can do this itself — see its README. Restart Claude Code and start a new Codex
conversation afterwards so both hosts load the tagged skills.
