#!/usr/bin/env python3
"""Format a review or recalculate stage status from current records; write no state."""

import argparse
import json
from pathlib import Path
import sys


def text(value, label):
    if not isinstance(value, str) or not value or value != value.strip() or any(c in value for c in "\r\n\t"):
        raise ValueError(f"{label} must be nonempty single-line text")
    return value


def unique_records(records, label):
    if not isinstance(records, list):
        raise ValueError(f"{label} must be a list")
    result = {}
    for record in records:
        if not isinstance(record, dict):
            raise ValueError(f"{label} entries must be objects")
        key = text(record.get("id"), f"{label} ID")
        if key in result and result[key] != record:
            raise ValueError(f"conflicting {label} ID: {key}")
        result[key] = record
    return result.values()


def status_line(snapshot):
    if not isinstance(snapshot, dict):
        raise ValueError("stage snapshot must be an object")
    stage = text(snapshot.get("stage"), "stage")
    tasks = list(unique_records(snapshot.get("tasks"), "tasks"))
    decisions = list(unique_records(snapshot.get("decisions"), "decisions"))
    states = {"ready", "active", "review", "blocked", "done", "cancelled"}
    for task in tasks:
        if task.get("state") not in states:
            raise ValueError(f"invalid task state: {task.get('state')}")
    for decision in decisions:
        if decision.get("state") not in {"open", "resolved"} or type(decision.get("requires_human")) is not bool:
            raise ValueError("decisions require open/resolved state and boolean requires_human")
    eligible = [task for task in tasks if task["state"] != "cancelled"]
    total = len(eligible)
    done = sum(task["state"] == "done" for task in eligible)
    active = sum(task["state"] in {"active", "review"} for task in eligible)
    human = sum(decision["state"] == "open" and decision["requires_human"] for decision in decisions)
    percent = (200 * done + total) // (2 * total) if total else 0
    return f"{stage}({percent}%) 📋 {total} ⚙️ {active} 🙋 {human}"


def verdict_line(record):
    if not isinstance(record, dict):
        raise ValueError("review must be an object")
    verdict, round_number, score = record.get("verdict"), record.get("round"), record.get("score")
    if type(round_number) is not int or round_number < 1:
        raise ValueError("round must be a positive integer")
    if verdict == "UNVERIFIED":
        if score is not None:
            raise ValueError("unavailable assessment must not invent a score")
        return f"UNVERIFIED R{round_number} (n/a)"
    if verdict not in {"ACCEPT", "RETURN"} or type(score) is not int or not 1 <= score <= 10:
        raise ValueError("review requires ACCEPT/RETURN and an integer score from 1 to 10")
    return f"{verdict} R{round_number} ({score}/10)"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=("status", "verdict"))
    parser.add_argument("source", nargs="?", default="-", help="current JSON record; '-' reads stdin")
    args = parser.parse_args()
    try:
        value = json.load(sys.stdin) if args.source == "-" else json.loads(Path(args.source).read_text())
        print(status_line(value) if args.kind == "status" else verdict_line(value))
    except (OSError, ValueError, TypeError) as error:
        print(f"report unavailable: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
