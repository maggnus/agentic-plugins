#!/usr/bin/env python3
"""Stamp the work tooling with the release in which it last changed, and record its digest.

A project keeps its own copy of work.py and work-schema.json, so nothing else notices that the copy
has fallen behind the plugin or was edited locally. The pair carries one version and one digest.

The version is derived, not remembered: walking the published release tags from the newest down,
the stamp is the oldest consecutive tag whose tooling content equals the current content, and the
manifest version when even the newest tag differs. A digest that happens to match the file cannot
say which release the content belongs to, so it is never the reason to keep an old stamp.
"""

from __future__ import annotations

import json
import pathlib
import re
import subprocess
import sys

PLUGIN_ROOT = pathlib.Path(__file__).resolve().parent.parent
REPO_ROOT = PLUGIN_ROOT.parent
TEMPLATES = PLUGIN_ROOT / "skills/paseo-cto/templates"
WORK = TEMPLATES / "work.py"
SCHEMA = TEMPLATES / "work-schema.json"
TAG_RE = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")
VERSION_LINE_RE = re.compile(r'(?m)^TOOLING_VERSION = ".*"$')


def git(*args: str) -> str | None:
    result = subprocess.run(["git", "-C", str(REPO_ROOT), *args], capture_output=True, text=True)
    return result.stdout if result.returncode == 0 else None


def identity(work_text: str, schema: dict) -> str:
    """The tooling content with its stamp fields removed, so a re-stamp is not a change."""
    body = {k: v for k, v in schema.items() if k not in ("tooling_version", "tooling_digest")}
    normalized = VERSION_LINE_RE.sub('TOOLING_VERSION = ""', work_text, count=1)
    return normalized + json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def release_tags() -> list[str]:
    listed = git("tag", "--list", "v*") or ""
    tags = [tag for tag in listed.split() if TAG_RE.match(tag)]
    return sorted(tags, key=lambda t: tuple(int(p) for p in TAG_RE.match(t).groups()), reverse=True)


def tagged_identity(tag: str) -> str | None:
    work_text = git("show", f"{tag}:{WORK.relative_to(REPO_ROOT).as_posix()}")
    schema_text = git("show", f"{tag}:{SCHEMA.relative_to(REPO_ROOT).as_posix()}")
    if work_text is None or schema_text is None:
        return None
    try:
        return identity(work_text, json.loads(schema_text))
    except ValueError:
        return None


def stamp_version(manifest_version: str, current: str) -> str:
    stamped = manifest_version
    for tag in release_tags():
        if tagged_identity(tag) != current:
            break
        stamped = tag[1:]
    return stamped


def main() -> int:
    sys.path.insert(0, str(TEMPLATES))
    sys.dont_write_bytecode = True
    import work as worklib

    manifest_version = json.loads((PLUGIN_ROOT / ".claude-plugin/plugin.json").read_text())["version"]
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    work_text = WORK.read_text(encoding="utf-8")
    version = stamp_version(manifest_version, identity(work_text, schema))

    schema["tooling_version"] = version
    schema["tooling_digest"] = ""
    SCHEMA.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    WORK.write_text(VERSION_LINE_RE.sub(f'TOOLING_VERSION = "{version}"', work_text, count=1),
                    encoding="utf-8")
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    digest = worklib.tooling_digest(WORK, schema)
    if schema.get("tooling_digest") == digest and version == schema.get("tooling_version"):
        print(f"work tooling: unchanged since {version}; stamp retained")
        return 0
    schema["tooling_digest"] = digest
    SCHEMA.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"work tooling: stamped {version} at {digest[:12]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
