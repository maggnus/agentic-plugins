#!/usr/bin/env python3
"""Upgrade the installed paseo-cto to the latest published release, on both hosts.

The plugin is only ever installed from the remote marketplace pinned to an immutable release tag,
so an upgrade is a re-pin: remove the plugin and the marketplace registration, add the marketplace
at the newer tag, and install again. This script resolves the newest tag from the remote repository
and performs that sequence for every host whose CLI is present, preserving any sibling plugin
installed from the same marketplace.

    python3 upgrade.py --check        report installed versions against the latest tag; change nothing
    python3 upgrade.py --dry-run      print the exact commands without running them
    python3 upgrade.py                upgrade every present host to the latest tag
    python3 upgrade.py --tag v9.1.0   pin to one exact release instead of the latest

Both hosts load skills at start, so Claude Code must be restarted and a new Codex conversation
started after an upgrade. Nothing here touches a repository or a project.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import subprocess
import sys

MARKETPLACE = "maggnus"
PLUGIN = "paseo-cto"
PLUGIN_ID = f"{PLUGIN}@{MARKETPLACE}"
REPOSITORY = "maggnus/claude-plugins"
REMOTE_URL = f"https://github.com/{REPOSITORY}.git"
TAG_RE = re.compile(r"^refs/tags/(v(\d+)\.(\d+)\.(\d+))$")


def run(command: list[str], capture: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(command, text=True, capture_output=capture, check=False)


def have(executable: str) -> bool:
    return run(["command", "-v", executable]).returncode == 0 or bool(
        run(["/usr/bin/env", "which", executable]).stdout.strip()
    )


def remote_tags() -> list[tuple[tuple[int, int, int], str]]:
    result = run(["git", "ls-remote", "--tags", REMOTE_URL])
    if result.returncode != 0:
        fail(f"cannot reach {REMOTE_URL}: {result.stderr.strip()}")
    tags = []
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) != 2:
            continue
        match = TAG_RE.match(parts[1])
        if match:
            tags.append(((int(match.group(2)), int(match.group(3)), int(match.group(4))),
                         match.group(1)))
    if not tags:
        fail(f"{REMOTE_URL} publishes no vN.N.N release tag")
    return sorted(tags)


def tag_commit(tag: str) -> str | None:
    result = run(["git", "ls-remote", REMOTE_URL, f"refs/tags/{tag}", f"refs/tags/{tag}^{{}}"])
    if result.returncode != 0:
        return None
    refs = {ref: sha for sha, ref in (line.split() for line in result.stdout.splitlines())}
    return refs.get(f"refs/tags/{tag}^{{}}") or refs.get(f"refs/tags/{tag}")


def fail(message: str) -> None:
    print(f"upgrade: {message}", file=sys.stderr)
    raise SystemExit(1)


# --------------------------------------------------------------------------------------
# installed state
# --------------------------------------------------------------------------------------


def claude_state() -> dict | None:
    """Read the Claude registries directly: they are the record the CLI itself writes."""
    if not have("claude"):
        return None
    home = pathlib.Path.home()
    known = read_json(home / ".claude/plugins/known_marketplaces.json")
    installed = read_json(home / ".claude/plugins/installed_plugins.json")
    source = known.get(MARKETPLACE, {}).get("source", {})
    entries = installed.get("plugins", {}).get(PLUGIN_ID, [])
    siblings = sorted(
        identifier for identifier in installed.get("plugins", {})
        if identifier.endswith(f"@{MARKETPLACE}") and identifier != PLUGIN_ID
    )
    return {
        "host": "Claude",
        "ref": source.get("ref"),
        "version": entries[0].get("version") if entries else None,
        "commit": entries[0].get("gitCommitSha") if entries else None,
        "siblings": siblings,
    }


def codex_state() -> dict | None:
    if not have("codex"):
        return None
    listing = run(["codex", "plugin", "list", "--marketplace", MARKETPLACE, "--json"])
    installed = []
    if listing.returncode == 0:
        try:
            installed = json.loads(listing.stdout).get("installed", [])
        except json.JSONDecodeError:
            installed = []
    entry = next((item for item in installed if item.get("pluginId") == PLUGIN_ID), None)
    siblings = sorted(
        item["pluginId"] for item in installed
        if item.get("pluginId") and item["pluginId"] != PLUGIN_ID
    )
    ref = None
    marketplaces = run(["codex", "plugin", "marketplace", "list", "--json"])
    if marketplaces.returncode == 0:
        try:
            for item in json.loads(marketplaces.stdout).get("marketplaces", []):
                if item.get("name") != MARKETPLACE:
                    continue
                ref = marketplace_ref(pathlib.Path(item["root"]))
        except (json.JSONDecodeError, KeyError):
            ref = None
    return {
        "host": "Codex",
        "ref": ref,
        "version": (entry or {}).get("version"),
        "commit": None,
        "siblings": siblings,
    }


def marketplace_ref(root: pathlib.Path) -> str | None:
    """Codex records the pinned ref either in install metadata or in a plain Git checkout."""
    metadata = root / ".codex-marketplace-install.json"
    if metadata.is_file():
        return read_json(metadata).get("ref_name")
    if (root / ".git").exists():
        described = run(["git", "-C", str(root), "describe", "--tags", "--exact-match", "HEAD"])
        if described.returncode == 0:
            return described.stdout.strip()
    return None


def base_version(version: str | None) -> str | None:
    """The Codex manifest carries a cachebuster suffix; the release is the part before it."""
    return version.split("+", 1)[0] if version else None


def read_json(path: pathlib.Path) -> dict:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}


# --------------------------------------------------------------------------------------
# command plans
# --------------------------------------------------------------------------------------


def claude_plan(tag: str, state: dict) -> list[list[str]]:
    commands = [
        ["claude", "plugin", "uninstall", PLUGIN_ID, "--scope", "user"],
        ["claude", "plugin", "marketplace", "remove", MARKETPLACE, "--scope", "user"],
        ["claude", "plugin", "marketplace", "add", f"{REPOSITORY}@{tag}", "--scope", "user"],
        ["claude", "plugin", "install", PLUGIN_ID, "--scope", "user"],
    ]
    commands.extend(
        ["claude", "plugin", "install", sibling, "--scope", "user"]
        for sibling in state["siblings"]
    )
    return commands


def codex_plan(tag: str, state: dict) -> list[list[str]]:
    commands = [
        ["codex", "plugin", "remove", PLUGIN_ID],
        ["codex", "plugin", "marketplace", "remove", MARKETPLACE],
        ["codex", "plugin", "marketplace", "add", REPOSITORY, "--ref", tag],
        ["codex", "plugin", "add", PLUGIN_ID],
    ]
    commands.extend(["codex", "plugin", "add", sibling] for sibling in state["siblings"])
    return commands


TOLERATED = {"uninstall", "remove"}


def apply(commands: list[list[str]], dry_run: bool) -> list[str]:
    """Removals may fail when nothing is registered; an add or install failing is a real error."""
    problems = []
    for command in commands:
        print(f"  $ {' '.join(command)}")
        if dry_run:
            continue
        result = run(command, capture=True)
        if result.returncode != 0 and not TOLERATED & set(command):
            problems.append(f"{' '.join(command)}: {result.stderr.strip() or 'failed'}")
    return problems


# --------------------------------------------------------------------------------------
# entry point
# --------------------------------------------------------------------------------------


def report(states: list[dict], tag: str) -> bool:
    current = True
    for state in states:
        version = state["version"] or "not installed"
        ref = state["ref"] or "unpinned"
        mark = "current" if ref == tag and base_version(state["version"]) == tag[1:] else "outdated"
        if mark == "outdated":
            current = False
        print(f"  {state['host']}: {version} at {ref} — {mark}")
    return current


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="upgrade.py", description=__doc__)
    parser.add_argument("--tag", default=None, help="exact release tag; default is the newest")
    parser.add_argument("--check", action="store_true", help="report only; change nothing")
    parser.add_argument("--dry-run", action="store_true", help="print the commands, run nothing")
    args = parser.parse_args(argv)

    tag = args.tag or remote_tags()[-1][1]
    if not TAG_RE.match(f"refs/tags/{tag}"):
        fail(f"{tag} is not a vN.N.N release tag")
    commit = tag_commit(tag)
    if commit is None:
        fail(f"release tag {tag} does not exist in {REMOTE_URL}")

    states = [state for state in (claude_state(), codex_state()) if state]
    if not states:
        fail("neither the claude nor the codex CLI is available on this machine")

    label = "requested release" if args.tag else "latest release"
    print(f"upgrade: {label} is {tag} at {commit}")
    current = report(states, tag)

    if args.check:
        return 0 if current else 1
    if current and not args.dry_run:
        print("upgrade: every present host already uses this release")
        return 0

    problems = []
    for state in states:
        print(f"upgrade: {state['host']}")
        plan = claude_plan(tag, state) if state["host"] == "Claude" else codex_plan(tag, state)
        problems.extend(apply(plan, args.dry_run))

    if args.dry_run:
        print("upgrade: dry run; nothing was changed")
        return 0
    if problems:
        for problem in problems:
            print(f"upgrade: {problem}", file=sys.stderr)
        return 1

    print(f"upgrade: verifying {tag}")
    if not report([state for state in (claude_state(), codex_state()) if state], tag):
        print("upgrade: a host did not reach the requested release", file=sys.stderr)
        return 1

    print(
        "upgrade: restart Claude Code and start a new Codex conversation so both hosts load the "
        "tagged skills"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
