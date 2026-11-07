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


def findings_of(record):
    findings = list(unique_records(record.get("findings"), "findings"))
    for finding in findings:
        if finding.get("kind") not in {"defect", "suggestion"}:
            raise ValueError("finding kind must be defect or suggestion")
        if finding.get("state") not in {"open", "resolved", "excepted"}:
            raise ValueError("finding state must be open, resolved or excepted")
        if finding["state"] == "excepted":
            exception = finding.get("exception")
            if finding["kind"] != "defect" or not isinstance(exception, dict):
                raise ValueError("only a defect can be excepted, and it needs an exception record")
            for field in ("decision", "subject", "applies_to"):
                text(exception.get(field), f"exception {field}")
    return findings


def checks_of(record):
    checks = record.get("checks")
    if not isinstance(checks, list) or not all(isinstance(check, dict) for check in checks):
        raise ValueError("checks must be a list of objects")
    for check in checks:
        text(check.get("command"), "check command or observed procedure")
        text(check.get("revision"), "check revision")
        if check.get("result") not in {"pass", "fail"}:
            raise ValueError("check result must be pass or fail")
        if "exit" in check and (type(check["exit"]) is not int or (check["exit"] == 0) != (check["result"] == "pass")):
            raise ValueError("check exit status contradicts its result")
        if type(check.get("required", True)) is not bool:
            raise ValueError("check required must be boolean")
    return checks


def required_unchecked(record):
    unchecked = record.get("unchecked", [])
    if not isinstance(unchecked, list):
        raise ValueError("unchecked must be a list")
    required = []
    for entry in unchecked:
        if isinstance(entry, str):
            required.append(text(entry, "unchecked condition"))
        elif isinstance(entry, dict) and type(entry.get("required")) is bool:
            text(entry.get("condition"), "unchecked condition")
            required += [entry["condition"]] if entry["required"] else []
        else:
            raise ValueError("unchecked entries are text or objects with condition and boolean required")
    return required


def same_revision(left, right):
    shorter, longer = sorted((left, right), key=len)
    return left == right or (len(shorter) >= 7 and longer.startswith(shorter))


def verdict_line(record):
    """Format a review after checking that its record is consistent; this cannot judge code quality."""
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
    defects = [finding for finding in findings_of(record) if finding["kind"] == "defect"]
    open_defects = [finding for finding in defects if finding["state"] == "open"]
    excepted = [finding for finding in defects if finding["state"] == "excepted"]
    if verdict == "RETURN":
        if not open_defects or score > 8:
            raise ValueError("RETURN names an open defect and scores 8 or lower")
    else:
        commit = text(record.get("commit"), "commit")
        checks = checks_of(record)
        if open_defects:
            raise ValueError("ACCEPT cannot leave an open defect; only the owner defers one")
        required = [check for check in checks if check.get("required", True)]
        if not required or any(check["result"] != "pass" or not same_revision(check["revision"], commit)
                               for check in required):
            raise ValueError("ACCEPT requires passing required checks on the accepted commit")
        if required_unchecked(record):
            raise ValueError("ACCEPT cannot leave a required condition unchecked")
        if score < 9 or (score == 9) != bool(excepted):
            raise ValueError("ACCEPT scores 10, or 9 only with owner-authorized exceptions")
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
