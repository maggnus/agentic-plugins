#!/usr/bin/env python3
"""Derive the next release from the commits since the last tag and apply it.

The repository publishes one tag per release, named after the paseo-cto base version,
because upgrade.py and the installed-release check both resolve `vN.N.N` that way.
Every plugin whose files changed is bumped at the level its commits imply; paseo-cto
is bumped at least one patch even when only another plugin changed, so the tag exists.
"""

import argparse
import json
import pathlib
import re
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
TAG_RE = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")
TYPE_RE = re.compile(r"^(?P<type>[a-z]+)(?:\((?P<scope>[^)]*)\))?(?P<breaking>!)?:")
VERSION_TAG_RE = re.compile(r"v\d+\.\d+\.\d+")
README_FILES = ("README.md", "paseo-cto/README.md")


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", str(ROOT), *args],
                          check=True, capture_output=True, text=True).stdout.strip()


def last_tag() -> str | None:
    tags = [t for t in git("tag", "--list", "v*").splitlines() if TAG_RE.match(t)]
    return max(tags, key=lambda t: tuple(int(p) for p in TAG_RE.match(t).groups())) if tags else None


def level_of(subject: str, body: str) -> str:
    match = TYPE_RE.match(subject)
    if not match:
        return "patch"
    if match.group("breaking") or "BREAKING CHANGE" in body:
        return "major"
    return "minor" if match.group("type") == "feat" else "patch"


def bump(version: str, level: str) -> str:
    major, minor, patch = (int(p) for p in version.split("+", 1)[0].split("."))
    if level == "major":
        return f"{major + 1}.0.0"
    if level == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def plugins() -> dict[str, str]:
    manifest = json.loads((ROOT / ".claude-plugin/marketplace.json").read_text())
    return {p["name"]: p["source"].lstrip("./") for p in manifest["plugins"]}


def commits_since(tag: str | None) -> list[tuple[str, str]]:
    span = f"{tag}..HEAD" if tag else "HEAD"
    raw = git("log", "--format=%s%x1e%b%x1f", span)
    out = []
    for record in raw.split("\x1f"):
        record = record.strip("\n")
        if not record.strip():
            continue
        subject, _, body = record.partition("\x1e")
        if subject.startswith("chore(release):") or subject.startswith("chore: update codex cachebuster"):
            continue
        out.append((subject, body))
    return out


def changed_paths(tag: str | None) -> list[str]:
    span = f"{tag}..HEAD" if tag else "HEAD"
    return git("diff", "--name-only", span).splitlines()


def write_version(plugin_dir: str, base: str, stamp: str) -> None:
    claude = ROOT / plugin_dir / ".claude-plugin/plugin.json"
    data = json.loads(claude.read_text())
    data["version"] = base
    claude.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    codex = ROOT / plugin_dir / ".codex-plugin/plugin.json"
    data = json.loads(codex.read_text())
    data["version"] = f"{base}+codex.{stamp}"
    codex.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--level", choices=("auto", "patch", "minor", "major"), default="auto")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    tag = last_tag()
    commits = commits_since(tag)
    if not commits:
        print("bump: nothing to release since " + (tag or "the first commit"))
        return 2

    sources = plugins()
    paths = changed_paths(tag)
    touched = {name for name, src in sources.items() if any(p.startswith(f"{src}/") for p in paths)}
    touched.add("paseo-cto")  # the tag is its version, so it always moves

    levels = {}
    for subject, body in commits:
        level = args.level if args.level != "auto" else level_of(subject, body)
        scope = (TYPE_RE.match(subject).group("scope") if TYPE_RE.match(subject) else None) or ""
        targets = [scope] if scope in sources else sorted(touched)
        for name in targets:
            order = ("patch", "minor", "major")
            levels[name] = max(levels.get(name, "patch"), level, key=order.index)

    stamp = time.strftime("%Y%m%d%H%M%S", time.gmtime())
    released = {}
    for name in sorted(touched):
        current = json.loads((ROOT / sources[name] / ".claude-plugin/plugin.json").read_text())["version"]
        released[name] = bump(current, levels.get(name, "patch"))

    new_tag = "v" + released["paseo-cto"]
    print(f"bump: {tag or 'none'} -> {new_tag}")
    for name, version in released.items():
        print(f"  {name}: {version} ({levels.get(name, 'patch')})")

    if args.dry_run:
        return 0

    for name, version in released.items():
        write_version(sources[name], version, stamp)
    for readme in README_FILES:
        path = ROOT / readme
        path.write_text(VERSION_TAG_RE.sub(new_tag, path.read_text()))

    print(new_tag)
    return 0


if __name__ == "__main__":
    sys.exit(main())
