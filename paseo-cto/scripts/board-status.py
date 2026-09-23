#!/usr/bin/env python3
"""Print the owner's status line for the open milestone of a work board.

    python3 board-status.py <work dir> [--asks N]

The open milestone is the first `## <name> — …` section with a row that is neither done nor paused.
The line is `<name>(<done share>%) · ✅ <done>/<total> · 🛠 <in work> · 🙋 <blocked + asks>`, where
total counts every row of the section, `[~]` rows are in work, and `[!]` rows are blocked and count
as waiting for the owner together with the open questions passed as --asks.
"""
import argparse
import pathlib
import re

parser = argparse.ArgumentParser()
parser.add_argument("work", nargs="?", default="docs/work")
parser.add_argument("--asks", type=int, default=0, help="open owner questions not on the board")
args = parser.parse_args()

section = re.compile(r"^## (?P<name>.+?) — ")
row = re.compile(r"^\| \[(?P<mark>.)\] \| ")
milestones = []
for line in (pathlib.Path(args.work) / "BOARD.md").read_text().splitlines():
    head = section.match(line)
    if head:
        milestones.append((head["name"], []))
    elif milestones and (match := row.match(line)):
        milestones[-1][1].append(match["mark"])

for name, marks in milestones:
    if any(mark not in "x=" for mark in marks):
        done = marks.count("x")
        print(f"{name}({round(100 * done / len(marks))}%) · ✅ {done}/{len(marks)} · "
              f"🛠 {marks.count('~')} · 🙋 {marks.count('!') + args.asks}")
        break
else:
    print("no open milestone")
