#!/usr/bin/env bash
# Automated release script for paseo-cto
# Runs all validation steps, updates Codex cachebuster, creates tag, and pushes.

set -euo pipefail

# Find repo root
repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$repo_root" ]; then
    echo "release: not in a git repository" >&2
    exit 1
fi
cd "$repo_root"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "release: working tree has uncommitted changes" >&2
    git status --short
    exit 1
fi

# Ensure we're on main
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then
    echo "release: not on main branch (currently on $branch)" >&2
    exit 1
fi

# Read base version from Claude manifest (authoritative)
version=$(jq -r '.version' paseo-cto/.claude-plugin/plugin.json)
if [ -z "$version" ] || [ "$version" = "null" ]; then
    echo "release: cannot read version from Claude manifest" >&2
    exit 1
fi

tag="v$version"
echo "release: preparing $tag"

# Verify Codex manifest base version matches
codex_version=$(jq -r '.version' paseo-cto/.codex-plugin/plugin.json | cut -d'+' -f1)
if [ "$codex_version" != "$version" ]; then
    echo "release: version mismatch: Claude=$version, Codex=$codex_version" >&2
    exit 1
fi

# 1. Contract tests
echo "release: running contract tests..."
bash paseo-cto/scripts/test-plugin-contracts.sh

# 2. Stamp work tooling
echo "release: stamping work tooling..."
python3 paseo-cto/scripts/stamp-work-tooling.py

# 3. Update Codex cachebuster
echo "release: updating Codex cachebuster..."
python3 ~/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py paseo-cto

# 4. Validate plugin
echo "release: validating plugin..."
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py paseo-cto

# 5. Distribution sync check
echo "release: checking distribution sync..."
bash paseo-cto/scripts/check-distribution-sync.sh

# Check if cachebuster update created changes to commit
if ! git diff --quiet; then
    echo "release: committing cachebuster update..."
    git add paseo-cto/.codex-plugin/plugin.json
    git commit -m "chore: update codex cachebuster for $tag"
fi

# Create/update tag
if git rev-parse "$tag" >/dev/null 2>&1; then
    echo "release: tag $tag exists locally, replacing..."
    git tag -d "$tag"
fi
git tag "$tag"

echo "release: pushing main and $tag..."
git push origin main
git push origin "$tag" --force

echo "release: $tag published successfully"
echo ""
echo "To upgrade an existing installation:"
echo "  PASEO_CTO_TAG=$tag"
echo "  claude plugin uninstall paseo-cto@maggnus --scope user"
echo "  claude plugin marketplace remove maggnus --scope user"
echo "  claude plugin marketplace add \"maggnus/agentic-plugins@\${PASEO_CTO_TAG}\" --scope user"
echo "  claude plugin install paseo-cto@maggnus --scope user"
echo ""
echo "  codex plugin remove paseo-cto@maggnus"
echo "  codex plugin marketplace remove maggnus"
echo "  codex plugin marketplace add maggnus/agentic-plugins --ref \"\${PASEO_CTO_TAG}\""
echo "  codex plugin add paseo-cto@maggnus"
echo ""
echo "  bash paseo-cto/scripts/check-installed-release.sh"