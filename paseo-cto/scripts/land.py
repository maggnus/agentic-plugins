#!/usr/bin/env python3
"""Land one accepted branch on the main branch in a single command.

    python3 land.py <branch> <task-id>[,<task-id>...] [--outcome TEXT] [--settings PATH] [--keep]

Steps: wait while a release is busy; merge the branch into a temporary worktree cut from the
remote main; run the project's check; mark the task done on the board in the same merge commit;
push; wait for the rollout. The owner's working tree is never touched and nothing is rebased.

Exit codes: 0 landed, 1 failed (check, board, push or rollout), 2 conflict (back to the author),
3 usage or settings error. The last line of output is always one of
    LANDED <task> <sha> · <rollout>
    CONFLICT <task>: <files>
    FAILED <task> at <step>: <reason>

Project settings live in <git-common-dir>/paseo-cto/SETTINGS.json under "land":
    board        path of the board file inside the repository (required)
    check        shell command run in the merge worktree before the push
    boardCheck   shell command run after the board edit
    busy         shell command that exits 0 while a release is running
    watch        shell command that waits for the rollout; exit 0 means it succeeded
    mainBranch   default "main";  remote  default "origin"
    pollSeconds  default 60;  busyMaxMinutes  default 30
    commitTrailer  text appended to the commit message
"""

import argparse
import json
import pathlib
import re
import shutil
import subprocess
import sys
import time


class Stop(Exception):
    def __init__(self, code, line):
        super().__init__(line)
        self.code = code
        self.line = line


def git(cwd, *args, check=True):
    result = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True)
    if check and result.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)}: {(result.stderr or result.stdout).strip()[-400:]}")
    return result


def shell(cwd, command):
    result = subprocess.run(command, cwd=cwd, shell=True, capture_output=True, text=True)
    return result.returncode, (result.stdout + result.stderr)


def tail(text, lines=30):
    return "\n".join(text.rstrip().splitlines()[-lines:])


def note(message):
    print(f"land: {message}", file=sys.stderr, flush=True)


def load_settings(repo, explicit):
    if explicit:
        path = pathlib.Path(explicit)
    else:
        common = git(repo, "rev-parse", "--path-format=absolute", "--git-common-dir").stdout.strip()
        path = pathlib.Path(common) / "paseo-cto" / "SETTINGS.json"
    if not path.is_file():
        raise Stop(3, f"no settings at {path}")
    land = json.loads(path.read_text()).get("land") or {}
    if not land.get("board"):
        raise Stop(3, f'settings {path} have no "land.board"')
    land.setdefault("mainBranch", "main")
    land.setdefault("remote", "origin")
    land.setdefault("pollSeconds", 60)
    land.setdefault("busyMaxMinutes", 30)
    return land


def wait_while_busy(repo, land):
    command = land.get("busy")
    if not command:
        return
    deadline = time.time() + land["busyMaxMinutes"] * 60
    announced = False
    while shell(repo, command)[0] == 0:
        if time.time() > deadline:
            raise Stop(1, f"busy: a release is still running after {land['busyMaxMinutes']} min")
        if not announced:
            note("a release is running; waiting")
            announced = True
        time.sleep(land["pollSeconds"])


def mark_board(tree, land, task, sha, outcome):
    board = tree / land["board"]
    text = board.read_text()
    row = re.compile(r"^(\| \[" + re.escape(task) + r"\]\([^)]*\) \| )(\w+)( \| )([^|]*)( \| )([^|]*)(\|)$", re.M)
    match = row.search(text)
    if not match:
        raise Stop(1, f"board: no row for {task} in {land['board']}")
    new_outcome = outcome or match.group(4)
    text = text[:match.start()] + (
        match.group(1) + "done" + match.group(3) + new_outcome + match.group(5) + sha + " " + match.group(7)
    ) + text[match.end():]
    board.write_text(text)
    if land.get("boardCheck"):
        code, output = shell(tree, land["boardCheck"])
        if code != 0:
            raise Stop(1, f"boardCheck: {tail(output, 1)}")


def conflicts(tree):
    return git(tree, "diff", "--name-only", "--diff-filter=U", check=False).stdout.split()


def land_branch(repo, args, land):
    remote, main = land["remote"], land["mainBranch"]
    top = pathlib.Path(git(repo, "rev-parse", "--show-toplevel").stdout.strip())
    tree = top.parent / f".land-{args.task.split(',')[0]}"
    if tree.exists():
        raise Stop(3, f"{tree} already exists; remove it or land under another id")

    wait_while_busy(repo, land)
    git(repo, "fetch", "-q", remote)
    head = git(repo, "rev-parse", "--verify", args.branch).stdout.strip()
    git(repo, "worktree", "add", "-q", "--detach", str(tree), f"{remote}/{main}")
    try:
        merged = git(tree, "merge", "--no-ff", "--no-commit", args.branch, check=False)
        if merged.returncode != 0:
            files = conflicts(tree)
            git(tree, "merge", "--abort", check=False)
            if files:
                raise Stop(2, ", ".join(files))
            raise Stop(1, f"merge: {tail(merged.stderr or merged.stdout, 1)}")

        if land.get("check"):
            note(f"check: {land['check']}")
            code, output = shell(tree, land["check"])
            if code != 0:
                print(tail(output), file=sys.stderr)
                raise Stop(1, f"check: exit {code}")

        for task in args.task.split(","):
            mark_board(tree, land, task, head[:8], args.outcome)
        message = f"Merge branch '{args.branch}' ({args.task})"
        if land.get("commitTrailer"):
            message += "\n\n" + land["commitTrailer"]
        git(tree, "add", "-A")
        git(tree, "commit", "-q", "-m", message)

        for _ in range(3):
            git(tree, "fetch", "-q", remote)
            if git(tree, "merge-base", "--is-ancestor", f"{remote}/{main}", "HEAD", check=False).returncode != 0:
                moved = git(tree, "merge", "-q", "--no-edit", f"{remote}/{main}", check=False)
                if moved.returncode != 0:
                    files = conflicts(tree)
                    git(tree, "merge", "--abort", check=False)
                    raise Stop(2, "main moved: " + ", ".join(files))
            wait_while_busy(tree, land)
            if git(tree, "push", "-q", remote, f"HEAD:{main}", check=False).returncode == 0:
                break
        else:
            raise Stop(1, "push: rejected three times")
        sha = git(tree, "rev-parse", "--short=8", "HEAD").stdout.strip()

        rollout = "no watch configured"
        if land.get("watch"):
            note(f"watch: {land['watch']}")
            code, output = shell(tree, land["watch"])
            if code != 0:
                raise Stop(1, f"watch ({sha} pushed): {tail(output, 1)}")
            rollout = "rollout ok"
        return f"LANDED {args.task} {sha} · {rollout}"
    finally:
        if not args.keep:
            git(repo, "worktree", "remove", "--force", str(tree), check=False)
            shutil.rmtree(tree, ignore_errors=True)
            git(repo, "worktree", "prune", check=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("branch")
    parser.add_argument("task")
    parser.add_argument("--outcome", default="")
    parser.add_argument("--settings")
    parser.add_argument("--keep", action="store_true", help="keep the merge worktree")
    args = parser.parse_args()
    repo = pathlib.Path.cwd()
    try:
        land = load_settings(repo, args.settings)
        print(land_branch(repo, args, land))
        return 0
    except Stop as stop:
        if stop.code == 2:
            print(f"CONFLICT {args.task}: {stop.line}")
        else:
            print(f"FAILED {args.task} at {stop.line}")
        return stop.code
    except RuntimeError as error:
        print(f"FAILED {args.task} at git: {error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
