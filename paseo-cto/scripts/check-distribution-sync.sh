#!/usr/bin/env bash
# Verify that the Claude and Codex packages expose one shared Paseo CTO method.

set -euo pipefail

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
plugin_root=$(CDPATH='' cd -- "$script_dir/.." && pwd)

python3 - "$plugin_root" <<'PY'
import json
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1]).resolve()
claude_manifest = json.loads((root / ".claude-plugin/plugin.json").read_text())
codex_manifest = json.loads((root / ".codex-plugin/plugin.json").read_text())

errors = []

def require(condition, message):
    if not condition:
        errors.append(message)

require(claude_manifest.get("name") == "paseo-cto", "Claude manifest name is not paseo-cto")
require(codex_manifest.get("name") == "paseo-cto", "Codex manifest name is not paseo-cto")

claude_version = claude_manifest.get("version", "")
codex_version = codex_manifest.get("version", "")
codex_base = codex_version.split("+codex.", 1)[0]
require(claude_version == codex_base, "Claude version and Codex base version differ")
require(claude_manifest.get("description") == codex_manifest.get("description"),
        "Claude and Codex descriptions differ")
require(claude_manifest.get("author") == codex_manifest.get("author"),
        "Claude and Codex authors differ")
require(codex_manifest.get("skills") == "./skills/",
        "Codex manifest must expose the shared skills directory")

skill_dirs = sorted(path.parent for path in (root / "skills").glob("*/SKILL.md"))
require(bool(skill_dirs), "no shared skills found")
for skill_dir in skill_dirs:
    require((skill_dir / "agents/openai.yaml").is_file(),
            f"Codex metadata missing for {skill_dir.name}")

marketplace_path = root.parent / ".claude-plugin/marketplace.json"
if marketplace_path.is_file():
    marketplace = json.loads(marketplace_path.read_text())
    entries = [item for item in marketplace.get("plugins", []) if item.get("name") == "paseo-cto"]
    require(len(entries) == 1, "root marketplace must contain exactly one paseo-cto entry")
    if entries:
        entry = entries[0]
        require((marketplace_path.parent.parent / entry.get("source", "")).resolve() == root,
                "root marketplace paseo-cto source does not resolve to this plugin")
        require(entry.get("description") == claude_manifest.get("description"),
                "root marketplace and plugin descriptions differ")

sys.path.insert(0, str(root / "skills/paseo-cto/templates"))
sys.dont_write_bytecode = True
import work as worklib

work_script = root / "skills/paseo-cto/templates/work.py"
work_schema = json.loads((root / "skills/paseo-cto/templates/work-schema.json").read_text())
require(work_schema.get("tooling_version") == worklib.TOOLING_VERSION,
        "work.py and work-schema.json carry different tooling stamps")
require(work_schema.get("tooling_digest") == worklib.tooling_digest(work_script, work_schema),
        "the work tooling changed without being re-stamped; run scripts/stamp-work-tooling.py")

release_tag = f"v{claude_version}"
readme = (root.parent / "README.md").read_text()
plugin_readme_path = root / "README.md"
require(plugin_readme_path.is_file(), "paseo-cto/README.md is missing")
plugin_readme = plugin_readme_path.read_text() if plugin_readme_path.is_file() else ""

require(f"PASEO_CTO_TAG={release_tag}" in readme,
        f"README.md does not select release tag {release_tag}")
require(f"paseo-cto: {release_tag} |" in plugin_readme,
        f"paseo-cto/README.md snapshot example does not show {release_tag}")
require('maggnus/agentic-plugins@${PASEO_CTO_TAG}' in readme,
        "README.md does not pin the Claude marketplace to the release tag")
require('maggnus/agentic-plugins --ref "$PASEO_CTO_TAG"' in readme,
        "README.md does not pin the Codex marketplace to the release tag")
for name, body in (("README.md", readme), ("paseo-cto/README.md", plugin_readme)):
    require("plugin marketplace add ~/" not in body,
            f"{name} still permits a local marketplace installation")
    stale = sorted({tag for tag in re.findall(r"v\d+\.\d+\.\d+", body) if tag != release_tag})
    require(not stale, f"{name} still names {', '.join(stale)} instead of {release_tag}")

# Sibling plugins ship in the same tag and must be as installable on Codex as on Claude.
for name in ("brief", "team", "russian-speech"):
    sibling_root = root.parent / name
    require((sibling_root / "README.md").is_file(), f"{name}/README.md is missing")

    sibling_claude_path = sibling_root / ".claude-plugin/plugin.json"
    sibling_codex_path = sibling_root / ".codex-plugin/plugin.json"
    if not (sibling_claude_path.is_file() and sibling_codex_path.is_file()):
        require(sibling_claude_path.is_file(), f"{name} has no Claude manifest")
        require(sibling_codex_path.is_file(), f"{name} has no Codex manifest")
        continue

    sibling_claude = json.loads(sibling_claude_path.read_text())
    sibling_codex = json.loads(sibling_codex_path.read_text())
    require(sibling_claude.get("name") == name, f"{name} Claude manifest name does not match")
    require(sibling_codex.get("name") == name, f"{name} Codex manifest name does not match")
    require(sibling_claude.get("version", "") ==
            sibling_codex.get("version", "").split("+codex.", 1)[0],
            f"{name} Claude and Codex base versions differ")
    require(sibling_claude.get("description") == sibling_codex.get("description"),
            f"{name} Claude and Codex descriptions differ")
    require(sibling_claude.get("author") == sibling_codex.get("author"),
            f"{name} Claude and Codex authors differ")
    require(sibling_codex.get("skills") == "./skills/",
            f"{name} Codex manifest must expose the shared skills directory")

    sibling_skills = sorted(path.parent for path in (sibling_root / "skills").glob("*/SKILL.md"))
    require(bool(sibling_skills), f"{name} ships no skills")
    for skill_dir in sibling_skills:
        require((skill_dir / "agents/openai.yaml").is_file(),
                f"Codex metadata missing for {name}/{skill_dir.name}")

    if marketplace_path.is_file():
        sibling_entries = [item for item in marketplace.get("plugins", [])
                           if item.get("name") == name]
        require(len(sibling_entries) == 1,
                f"root marketplace must contain exactly one {name} entry")
        if sibling_entries:
            sibling_entry = sibling_entries[0]
            require((marketplace_path.parent.parent / sibling_entry.get("source", "")).resolve()
                    == sibling_root.resolve(),
                    f"root marketplace {name} source does not resolve to that plugin")
            require(sibling_entry.get("description") == sibling_claude.get("description"),
                    f"root marketplace and {name} descriptions differ")

if errors:
    for error in errors:
        print(f"distribution sync: {error}", file=sys.stderr)
    raise SystemExit(1)

print(
    f"distribution sync: Claude {claude_version} and Codex {codex_version} share "
    f"{len(skill_dirs)} skills"
)
PY
