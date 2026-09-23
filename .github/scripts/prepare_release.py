#!/usr/bin/env python3
"""Write the version chosen by semantic-release to all plugin manifests and READMEs."""

import argparse
import json
from pathlib import Path
import re
import time

ROOT = Path(__file__).resolve().parents[2]


def prepare(version: str) -> None:
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
        raise ValueError("expected a stable release version: X.Y.Z")
    marketplace = json.loads((ROOT / ".claude-plugin/marketplace.json").read_text())
    stamp = time.strftime("%Y%m%d%H%M%S", time.gmtime())
    updates = {}
    old_versions = set()
    readmes = {ROOT / "README.md"}
    for plugin in marketplace["plugins"]:
        directory = ROOT / plugin["source"]
        readmes.add(directory / "README.md")
        for platform in (".claude-plugin", ".codex-plugin"):
            path = directory / platform / "plugin.json"
            manifest = json.loads(path.read_text())
            old_versions.add(manifest["version"].split("+codex.", 1)[0])
            manifest["version"] = version if platform == ".claude-plugin" else f"{version}+codex.{stamp}"
            updates[path] = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    if len(old_versions) != 1:
        raise ValueError("all plugins must share one base version before release")
    for path in readmes:
        if path.is_file():
            updates[path] = re.sub(r"v\d+\.\d+\.\d+", "v" + version, path.read_text())
    for path, content in updates.items():
        path.write_text(content)
    print(f"Prepared all plugins for v{version}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("version")
    prepare(parser.parse_args().version)
