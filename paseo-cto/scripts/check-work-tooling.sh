#!/usr/bin/env bash
# Check that a project's copy of the work tooling matches the installed plugin's stamp, then
# validate the project's work tree with that copy.
#
#   check-work-tooling.sh [<project-root>]
#
# The work root and the script home come from the project's SETTINGS.json (`work.root`,
# `work.scriptHome`); a project without one is assumed to keep `docs/work` and `scripts`.

set -euo pipefail

plugin_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
templates="$plugin_root/skills/paseo-cto/templates"

project_root="${1:-$(git rev-parse --show-toplevel 2>/dev/null || true)}"
if [ -z "$project_root" ] || [ ! -d "$project_root" ]; then
    echo "usage: $0 <project-root>" >&2
    echo "  If omitted, uses the git root of the current directory" >&2
    exit 1
fi
project_root=$(CDPATH='' cd -- "$project_root" && pwd)

# The tooling is stamped with the release in which it last changed, which is not always the
# plugin's own version: a release that touched only prose keeps the older stamp.
plugin_version=$(jq -r '.tooling_version' "$templates/work-schema.json")
if [ -z "$plugin_version" ] || [ "$plugin_version" = "null" ]; then
    echo "cannot read the plugin's tooling stamp" >&2
    exit 1
fi

settings="$(git -C "$project_root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)/paseo-cto/SETTINGS.json"
work_root="docs/work"
script_home="scripts"
if [ -f "$settings" ]; then
    work_root=$(jq -r '.work.root // "docs/work"' "$settings")
    script_home=$(jq -r '.work.scriptHome // "scripts"' "$settings")
fi
case "$work_root" in /*) ;; *) work_root="$project_root/$work_root" ;; esac
case "$script_home" in /*) ;; *) script_home="$project_root/$script_home" ;; esac

echo "Project: $project_root"
echo "Plugin tooling stamp: $plugin_version"
echo "Script home: $script_home"
echo "Work root: $work_root"

# Everything ledger.py and the check-*.sh scripts call must live beside work.py: a copy that
# lacks one of these renders nothing and validates nothing until someone finds out why.
missing=""
for tool in work.py work-schema.json ledger.py render_fleet.py check_runtime.py check-fleet-render.sh; do
    [ -f "$script_home/$tool" ] || missing="$missing $tool"
done
if [ -n "$missing" ]; then
    echo "FAIL: tooling incomplete in $script_home:$missing" >&2
    for tool in $missing; do
        echo "Run: cp \"$templates/$tool\" \"$script_home/$tool\"" >&2
    done
    exit 1
fi

project_version=$(python3 "$script_home/work.py" version 2>/dev/null | awk '{print $3}')
echo "Project tooling stamp: ${project_version:-unknown}"
if [ "${project_version:-}" != "$plugin_version" ]; then
    echo "MISMATCH: project tooling (${project_version:-unknown}) != plugin ($plugin_version)" >&2
    echo "Update with:" >&2
    echo "  for t in work.py work-schema.json ledger.py check_runtime.py render_fleet.py check-fleet-render.sh; do cp \"$templates/\$t\" \"$script_home/\$t\"; done" >&2
    echo "  cp -R \"$templates/work/.\" \"<the project's templates directory>/\"" >&2
    exit 1
fi

echo "Validating the work tree against the plugin templates..."
python3 "$script_home/work.py" --root "$work_root" check --plugin-templates "$templates"

echo "OK: work tooling matches the plugin tooling stamp $plugin_version"
