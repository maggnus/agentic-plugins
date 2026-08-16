#!/usr/bin/env bash
# Remove old/unused plugin installations from Claude and Codex.
# Performs full reinstall: uninstall plugin -> remove marketplace -> add marketplace at latest tag -> install plugin.

set -euo pipefail

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
plugin_root=$(CDPATH='' cd -- "$script_dir/.." && pwd)

MARKETPLACE="maggnus"
PLUGIN_ID="paseo-cto@maggnus"
REPOSITORY="maggnus/agentic-plugins"
REMOTE_URL="https://github.com/${REPOSITORY}.git"
TAG_RE='^refs/tags/(v([0-9]+)\.([0-9]+)\.([0-9]+))$'

DRY_RUN=false
FORCE=false

usage() {
    cat <<EOF
Usage: $0 [options]

Options:
  --dry-run    Show what would be done without making changes
  --force      Skip confirmation prompts
  -h, --help   Show this help

Performs a full clean reinstall on both Claude and Codex:
  1. Uninstall the plugin
  2. Remove the marketplace registration
  3. Add marketplace at the latest release tag
  4. Install the plugin

Also removes any other old plugin versions from the same marketplace.
EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true ;;
        --force) FORCE=true ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    esac
    shift
done

have() {
    command -v "$1" >/dev/null 2>&1 || /usr/bin/env which "$1" >/dev/null 2>&1
}

remote_tags() {
    git ls-remote --tags "$REMOTE_URL" 2>/dev/null | while read -r sha ref; do
        if [[ $ref =~ $TAG_RE ]]; then
            echo "${BASH_REMATCH[1]}"
        fi
    done | sort -V
}

latest_tag() {
    remote_tags | tail -1
}

run_cmd() {
    if [[ $DRY_RUN == true ]]; then
        echo "  $ $*"
    else
        "$@"
    fi
}

confirm() {
    if [[ $FORCE == true ]]; then
        return 0
    fi
    read -r -p "$1 [y/N] " response
    [[ $response =~ ^[Yy]$ ]]
}

# Get latest release tag
LATEST_TAG=$(latest_tag)
if [[ -z $LATEST_TAG ]]; then
    echo "cleanup: cannot determine latest release tag from $REMOTE_URL" >&2
    exit 1
fi
echo "cleanup: latest release tag is $LATEST_TAG"
BASE_VERSION="${LATEST_TAG#v}"

# --- Claude ---
if have claude; then
    echo ""
    echo "=== Claude ==="

    known_path="$HOME/.claude/plugins/known_marketplaces.json"
    installed_path="$HOME/.claude/plugins/installed_plugins.json"

    # Check current marketplace pin
    claude_ref=""
    if [[ -f $known_path ]]; then
        known=$(cat "$known_path")
        claude_ref=$(echo "$known" | jq -r ".maggnus.source.ref // empty" 2>/dev/null || echo "")
    fi

    # Check installed plugin versions
    plugin_versions=()
    if [[ -f $installed_path ]]; then
        installed=$(cat "$installed_path")
        while IFS= read -r line; do
            [[ -z $line ]] && continue
            plugin_versions+=("$line")
        done < <(echo "$installed" | jq -r ".plugins.\"${PLUGIN_ID}\" // [] | .[] | \"\\(.version) \\(.gitCommitSha // \"no-commit\")\"" 2>/dev/null || echo "")
    fi

    # Determine if cleanup needed
    needs_marketplace_update=false
    if [[ -n $claude_ref && $claude_ref != "$LATEST_TAG" ]]; then
        needs_marketplace_update=true
        echo "  Marketplace pinned to $claude_ref (should be $LATEST_TAG)"
    fi

    old_versions=()
    for entry in "${plugin_versions[@]}"; do
        version=$(echo "$entry" | awk '{print $1}')
        commit=$(echo "$entry" | awk '{print $2}')
        if [[ $version != "$BASE_VERSION" ]]; then
            old_versions+=("$entry")
            echo "  Found old plugin version: $version (commit: $commit)"
        fi
    done

    if [[ $needs_marketplace_update == true || ${#old_versions[@]} -gt 0 ]]; then
        if confirm "  Perform full reinstall (uninstall plugin, remove marketplace, add at $LATEST_TAG, install)?"; then
            # 1. Uninstall plugin
            run_cmd claude plugin uninstall "${PLUGIN_ID}" --scope user
            # 2. Remove marketplace
            run_cmd claude plugin marketplace remove maggnus --scope user
            # 3. Add marketplace at latest tag
            run_cmd claude plugin marketplace add "${REPOSITORY}@${LATEST_TAG}" --scope user
            # 4. Install plugin
            run_cmd claude plugin install "${PLUGIN_ID}" --scope user
        fi
    else
        echo "  Already at latest version ($LATEST_TAG)"
    fi
else
    echo "Claude CLI not found, skipping"
fi

# --- Codex ---
if have codex; then
    echo ""
    echo "=== Codex ==="

    # Get marketplace info
    marketplaces_json=$(codex plugin marketplace list --json 2>/dev/null || echo '{"marketplaces":[]}')
    codex_roots=$(echo "$marketplaces_json" | jq -r ".marketplaces[] | select(.name==\"$MARKETPLACE\") | .root" 2>/dev/null || echo "")

    marketplace_needs_update=false
    marketplace_root=""

    while IFS= read -r root; do
        [[ -z $root ]] && continue
        marketplace_root="$root"
        metadata_path="$root/.codex-marketplace-install.json"
        if [[ -f $metadata_path ]]; then
            ref=$(jq -r '.ref_name // empty' "$metadata_path" 2>/dev/null || echo "")
            if [[ -n $ref && $ref != "$LATEST_TAG" ]]; then
                marketplace_needs_update=true
                echo "  Marketplace at $root pinned to $ref (should be $LATEST_TAG)"
            fi
        elif [[ -d $root/.git ]]; then
            current_tag=$(git -C "$root" describe --tags --exact-match HEAD 2>/dev/null || echo "")
            if [[ -n $current_tag && $current_tag != "$LATEST_TAG" ]]; then
                marketplace_needs_update=true
                echo "  Marketplace at $root checked out at $current_tag (should be $LATEST_TAG)"
            fi
        fi
    done <<< "$codex_roots"

    # Check installed plugin versions
    plugins_json=$(codex plugin list --marketplace "$MARKETPLACE" --json 2>/dev/null || echo '{"installed":[]}')
    old_codex_versions=()
    while IFS= read -r version; do
        [[ -z $version ]] && continue
        codex_base="${version%%+*}"
        if [[ $codex_base != "$BASE_VERSION" ]]; then
            old_codex_versions+=("$version")
            echo "  Found old plugin version: $version"
        fi
    done < <(echo "$plugins_json" | jq -r ".installed[] | select(.pluginId==\"$PLUGIN_ID\") | .version" 2>/dev/null || echo "")

    if [[ $marketplace_needs_update == true || ${#old_codex_versions[@]} -gt 0 ]]; then
        if confirm "  Perform full reinstall (remove plugin, remove marketplace, add at $LATEST_TAG, add plugin)?"; then
            # 1. Remove plugin
            run_cmd codex plugin remove "$PLUGIN_ID"
            # 2. Remove marketplace
            run_cmd codex plugin marketplace remove maggnus
            # 3. Add marketplace at latest tag
            run_cmd codex plugin marketplace add "$REPOSITORY" --ref "$LATEST_TAG"
            # 4. Add plugin
            run_cmd codex plugin add "$PLUGIN_ID"
        fi
    else
        echo "  Already at latest version ($LATEST_TAG)"
    fi
else
    echo "Codex CLI not found, skipping"
fi

echo ""
if [[ $DRY_RUN == true ]]; then
    echo "cleanup: dry run complete — no changes made"
else
    echo "cleanup: done"
    echo "Restart Claude Code and start a new Codex conversation to load the updated skills."
fi