#!/usr/bin/env bash
# Check if the project's work tooling matches the installed plugin version

set -euo pipefail

plugin_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
cd "$plugin_root"

# Find project root (where work tree is)
work_root="${1:-$(git rev-parse --show-toplevel 2>/dev/null)}"
if [ -z "$work_root" ] || [ ! -d "$work_root" ]; then
    echo "usage: $0 <project-work-root>" >&2
    echo "  If omitted, uses git root of current directory" >&2
    exit 1
fi

# Get plugin version
plugin_version=$(jq -r '.version' "$plugin_root/.claude-plugin/plugin.json")
if [ -z "$plugin_version" ] || [ "$plugin_version" = "null" ]; then
    echo "cannot read plugin version" >&2
    exit 1
fi

echo "Checking work tooling in: $work_root"
echo "Plugin version: $plugin_version"

# Check if work.py exists in project
project_work_py="$work_root/scripts/work.py"
project_schema="$work_root/scripts/work-schema.json"

if [ ! -f "$project_work_py" ]; then
    echo "FAIL: work.py not found at $project_work_py" >&2
    echo "Run: cp paseo-cto/skills/paseo-cto/templates/work.py $project_work_py" >&2
    echo "     cp paseo-cto/skills/paseo-cto/templates/work-schema.json $project_schema"
    echo "     cp -r paseo-cto/skills/paseo-cto/templates/work $work_root/scripts/work"
    exit 1
fi

if [ ! -f "$project_schema" ]; then
    echo "FAIL: work-schema.json not found at $project_schema" >&2
    exit 1
fi

# Run version check
project_version=$("$project_work_py" version 2>/dev/null | cut -d' ' -f3 || echo "unknown")
echo "Project work tooling version: $project_version"

if [ "$project_version" != "$plugin_version" ]; then
    echo "MISMATCH: Project tooling ($project_version) != Plugin ($plugin_version)" >&2
    echo "Update with:" >&2
    echo "  cp paseo-cto/skills/paseo-cto/templates/work.py $project_work_py" >&2
    echo "  cp paseo-cto/skills/paseo-cto/templates/work-schema.json $project_schema"
    echo "  cp -r paseo-cto/skills/paseo-cto/templates/work $work_root/scripts/work"
    exit 1
fi

# Full check with plugin templates
echo "Running full validation against plugin templates..."
"$project_work_py" check --root "$work_root" --plugin-templates "$plugin_root/skills/paseo-cto/templates"

echo "OK: Work tooling matches plugin version $plugin_version"
