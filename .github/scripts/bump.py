#!/usr/bin/env python3
"""Derive the next release from the commits since the last tag and apply it.

All plugins share one base version and one release tag. The highest change level
among the release commits applies to every plugin, regardless of commit scope.
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
# Conventional Commits puts the break in a footer of its own. Prose that merely mentions the words
# — a commit message explaining how the level is derived, for instance — is not a breaking change.
BREAKING_FOOTER_RE = re.compile(r"^BREAKING[ -]CHANGE:", re.M)
VERSION_TAG_RE = re.compile(r"v\d+\.\d+\.\d+")


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
    if match.group("breaking") or BREAKING_FOOTER_RE.search(body):
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


def write_version(plugin_dir: str, base: str, stamp: str) -> None:
    claude = ROOT / plugin_dir / ".claude-plugin/plugin.json"
    data = json.loads(claude.read_text())
    data["version"] = base
    claude.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    codex = ROOT / plugin_dir / ".codex-plugin/plugin.json"
    data = json.loads(codex.read_text())
    data["version"] = f"{base}+codex.{stamp}"
    codex.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def refresh_codex() -> int:
    """Refresh all Codex suffixes together, refusing inconsistent base versions."""
    sources = plugins()
    versions = set()
    codex_manifests = []
    for source in sources.values():
        claude = json.loads((ROOT / source / ".claude-plugin/plugin.json").read_text())
        path = ROOT / source / ".codex-plugin/plugin.json"
        codex = json.loads(path.read_text())
        versions.update((claude["version"], codex["version"].split("+codex.", 1)[0]))
        codex_manifests.append((path, codex))
    if len(versions) != 1:
        print("bump: all plugins must share one base version", file=sys.stderr)
        return 1
    version = versions.pop()
    stamp = time.strftime("%Y%m%d%H%M%S", time.gmtime())
    for path, manifest in codex_manifests:
        manifest["version"] = f"{version}+codex.{stamp}"
        path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"bump: all Codex manifests use {version}+codex.{stamp}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--level", choices=("auto", "patch", "minor", "major"), default="auto")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--refresh-codex", action="store_true")
    args = parser.parse_args()
    if args.refresh_codex:
        if args.dry_run or args.level != "auto":
            parser.error("--refresh-codex cannot be combined with --dry-run or --level")
        return refresh_codex()

    tag = last_tag()
    commits = commits_since(tag)
    if not commits:
        print("bump: nothing to release since " + (tag or "the first commit"))
        return 2

    sources = plugins()
    order = ("patch", "minor", "major")
    level = args.level if args.level != "auto" else max(
        (level_of(subject, body) for subject, body in commits), key=order.index)
    current = tag[1:] if tag else json.loads(
        (ROOT / sources["paseo-cto"] / ".claude-plugin/plugin.json").read_text())["version"]
    version = bump(current, level)

    stamp = time.strftime("%Y%m%d%H%M%S", time.gmtime())
    new_tag = "v" + version
    print(f"bump: {tag or 'none'} -> {new_tag}")
    for name in sorted(sources):
        print(f"  {name}: {version} ({level})")

    if args.dry_run:
        return 0

    for source in sources.values():
        write_version(source, version, stamp)
    for path in [ROOT / "README.md", *(ROOT / source / "README.md" for source in sources.values())]:
        if path.is_file():
            path.write_text(VERSION_TAG_RE.sub(new_tag, path.read_text()))

    print(new_tag)
    return 0


if __name__ == "__main__":
    sys.exit(main())
