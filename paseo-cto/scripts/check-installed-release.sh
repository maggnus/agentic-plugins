#!/usr/bin/env bash
# Verify that Codex and Claude use the same remote marketplace tag and installed commit.

set -euo pipefail

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
plugin_root=$(CDPATH='' cd -- "$script_dir/.." && pwd)

python3 - "$plugin_root" <<'PY'
import json
import pathlib
import subprocess
import sys

root = pathlib.Path(sys.argv[1]).resolve()
repo = root.parent
home = pathlib.Path.home()
marketplace_name = "maggnus"
plugin_id = "paseo-cto@maggnus"
expected_repository = "maggnus/claude-plugins"
expected_url = "https://github.com/maggnus/claude-plugins.git"

claude_manifest = json.loads((root / ".claude-plugin/plugin.json").read_text())
codex_manifest = json.loads((root / ".codex-plugin/plugin.json").read_text())
release_tag = f"v{claude_manifest['version']}"
errors = []

def require(condition, message):
    if not condition:
        errors.append(message)

def output(*args):
    return subprocess.check_output(args, cwd=repo, text=True)

tag_lines = output(
    "git", "ls-remote", "origin", f"refs/tags/{release_tag}",
    f"refs/tags/{release_tag}^{{}}",
).splitlines()
tag_refs = {ref: sha for sha, ref in (line.split() for line in tag_lines)}
remote_commit = tag_refs.get(
    f"refs/tags/{release_tag}^{{}}", tag_refs.get(f"refs/tags/{release_tag}")
)
require(remote_commit is not None, f"remote tag {release_tag} does not exist")
if remote_commit:
    require(output("git", "rev-parse", "HEAD").strip() == remote_commit,
            f"local HEAD is not the commit published as {release_tag}")

codex_marketplaces = json.loads(output("codex", "plugin", "marketplace", "list", "--json"))
codex_entries = [
    item for item in codex_marketplaces.get("marketplaces", [])
    if item.get("name") == marketplace_name
]
require(len(codex_entries) == 1, "Codex does not have exactly one maggnus marketplace")
if codex_entries:
    source = codex_entries[0].get("marketplaceSource", {})
    require(source.get("sourceType") == "git", "Codex marketplace is not remote Git")
    require(source.get("source", "").rstrip("/") == expected_url.rstrip("/"),
            "Codex marketplace points to a different remote repository")
    codex_root = pathlib.Path(codex_entries[0]["root"])
    metadata_path = codex_root / ".codex-marketplace-install.json"
    if metadata_path.is_file():
        metadata = json.loads(metadata_path.read_text())
        require(metadata.get("ref_name") == release_tag,
                f"Codex marketplace is not pinned to {release_tag}")
        if remote_commit:
            require(metadata.get("revision") == remote_commit,
                    "Codex marketplace revision differs from the remote tag commit")
    else:
        require((codex_root / ".git").exists(),
                "Codex marketplace has neither install metadata nor a Git checkout")
        if (codex_root / ".git").exists():
            codex_revision = subprocess.check_output(
                ["git", "-C", str(codex_root), "rev-parse", "HEAD"], text=True
            ).strip()
            codex_tag = subprocess.run(
                ["git", "-C", str(codex_root), "describe", "--tags", "--exact-match", "HEAD"],
                text=True, capture_output=True,
            )
            require(codex_tag.returncode == 0 and codex_tag.stdout.strip() == release_tag,
                    f"Codex marketplace checkout is not pinned to {release_tag}")
            if remote_commit:
                require(codex_revision == remote_commit,
                        "Codex marketplace checkout differs from the remote tag commit")

codex_plugins = json.loads(output(
    "codex", "plugin", "list", "--marketplace", marketplace_name, "--json"
))
codex_installed = [
    item for item in codex_plugins.get("installed", []) if item.get("pluginId") == plugin_id
]
require(len(codex_installed) == 1, "Codex paseo-cto is not installed exactly once")
if codex_installed:
    require(codex_installed[0].get("enabled") is True, "Codex paseo-cto is disabled")
    require(codex_installed[0].get("version") == codex_manifest["version"],
            "Codex installed version differs from the tagged manifest")

known_path = home / ".claude/plugins/known_marketplaces.json"
installed_path = home / ".claude/plugins/installed_plugins.json"
known = json.loads(known_path.read_text()) if known_path.is_file() else {}
claude_marketplace = known.get(marketplace_name, {})
claude_source = claude_marketplace.get("source", {})
require(claude_source.get("source") == "github", "Claude marketplace is not remote GitHub")
require(claude_source.get("repo") == expected_repository,
        "Claude marketplace points to a different remote repository")
require(claude_source.get("ref") == release_tag,
        f"Claude marketplace is not pinned to {release_tag}")

installed_registry = json.loads(installed_path.read_text()) if installed_path.is_file() else {}
claude_installed = installed_registry.get("plugins", {}).get(plugin_id, [])
require(len(claude_installed) == 1, "Claude paseo-cto is not installed exactly once")
if claude_installed:
    install = claude_installed[0]
    require(install.get("version") == claude_manifest["version"],
            "Claude installed version differs from the tagged manifest")
    if remote_commit:
        require(install.get("gitCommitSha") == remote_commit,
                "Claude installed commit differs from the remote tag commit")

if errors:
    for error in errors:
        print(f"installed release: {error}", file=sys.stderr)
    raise SystemExit(1)

print(
    f"installed release: Claude {claude_manifest['version']} and Codex "
    f"{codex_manifest['version']} use {release_tag} at {remote_commit}"
)
PY
