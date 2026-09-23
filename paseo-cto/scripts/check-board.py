#!/usr/bin/env python3
"""Check a work board: unique ids, known marks, one file per open linked task, a commit on done rows,
a time on every row, links that resolve.

    python3 check-board.py <work dir>     # the directory holding BOARD.md and tasks/
"""
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "docs/work")
line_re = re.compile(r"^\| \[(?P<mark>.)\] \| (?:\[(?P<linked>[^\]]+)\]\((?P<path>[^)]+)\)|(?P<plain>[A-Z][\w.-]+)) \| [^|]+ \| (?P<commit>[0-9a-f]*) ?\| (?P<time>\d\d\.\d\d \d\d:\d\d) \|$")
marks = {" ": "ready", "~": "active", "x": "done", "!": "blocked", "=": "deferred"}
errors = []
seen = {}
linked_files = set()

for number, line in enumerate((root / "BOARD.md").read_text().splitlines(), 1):
    match = line_re.match(line)
    if not match:
        if re.match(r"^\| \[.\] \|", line):
            errors.append(f"BOARD.md:{number}: malformed row (mark, task, outcome, commit, time): {line[:70]}")
        continue
    task = match["linked"] or match["plain"]
    if task in seen:
        errors.append(f"BOARD.md:{number}: {task} also on line {seen[task]}")
    seen[task] = number
    if match["mark"] not in marks:
        errors.append(f"BOARD.md:{number}: {task} has unknown mark [{match['mark']}]")
    if match["path"]:
        target = (root / match["path"]).resolve()
        linked_files.add(target)
        if not target.is_file():
            errors.append(f"BOARD.md:{number}: {task} links {match['path']}, which does not exist")
        if match["mark"] == "x":
            errors.append(f"BOARD.md:{number}: {task} is done but still links a task file")
    if match["mark"] == "x" and not match["commit"]:
        errors.append(f"BOARD.md:{number}: {task} is done without a commit")

for task_file in sorted((root / "tasks").glob("*.md")):
    if task_file.resolve() not in linked_files:
        errors.append(f"{task_file.relative_to(root)} has no linked line on the board")

for doc in [root / name for name in ("BOARD.md", "ROADMAP.md", "WORKFLOW.md", "FINDINGS.md") if (root / name).is_file()] + sorted((root / "tasks").glob("*.md")):
    prose = re.sub(r"`[^`\n]*`", "", re.sub(r"```.*?```", "", doc.read_text(), flags=re.S))
    for target in re.findall(r"\]\(([^)#:\s]+)(?:#[^)]*)?\)", prose):
        if not (doc.parent / target).exists():
            errors.append(f"{doc.relative_to(root)}: link {target} does not resolve")

for message in errors:
    print(f"board check: {message}", file=sys.stderr)
if errors:
    sys.exit(1)
print(f"board check: {len(seen)} tasks, {len(linked_files)} open task files")
