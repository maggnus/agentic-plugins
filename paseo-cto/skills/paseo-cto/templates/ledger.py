#!/usr/bin/env python3
"""One command per lifecycle event: checkpoint, task files, index and fleet render in one write.

Accounting used to be several manual edits per event — the runtime checkpoint, the node's front
matter and sections, the round journal, the generated index, the fleet render — each followed by a
validation run. That cost is bookkeeping, not decisions, so it belongs to a command.

    ledger.py dispatch  --task <id> --agent <id> --workspace <id> --role builder --baseline <sha>
    ledger.py candidate --task <id> --commit <sha>
    ledger.py verdict   --task <id> --verdict RETURN --score 6 --finding "..." [--delta]
    ledger.py escalate  --task <id> --decision bounded_retry --reason "..."
    ledger.py block     --task <id> --blocker "..."
    ledger.py merge     --task <id> --closure-commit <url> --evidence <url>
    ledger.py retire    --task <id>

Every event stamps itself from the system clock; no command takes a time argument. `--task` may be
repeated, which is how a batch of homogeneous nodes shares one dispatch, one review and one closure.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
sys.path.insert(0, str(SCRIPT_DIR))

import work as worklib  # noqa: E402

RUNTIME_SCHEMA = 3
TAIL_LIMIT = 12
EVENT_LIMIT = 12
RETURN_REASONS = ("outcome_defect", "proof", "rule", "contract")
ROLE_MINUTES = ("builder", "reviewer", "researcher", "cto")


class LedgerError(RuntimeError):
    pass


class RenderUnavailable(RuntimeError):
    """The renderer exists but could not complete: a Paseo probe or Git check failed.

    The event is already recorded; the render is stale until the next successful one. That is a
    warning, because a daemon hiccup must not stop bookkeeping.
    """


# ------------------------------------------------------------------------------------------
# clock, checkpoint, migration
# ------------------------------------------------------------------------------------------


def now() -> datetime:
    return datetime.now().astimezone()


def default_timezone() -> str:
    """The machine's own timezone token, so a render needs no argument it can derive itself."""
    name = now().tzname() or ""
    return name if name and " " not in name else "UTC"


def stamp(moment: datetime) -> str:
    return moment.strftime("%d/%m %H:%M")


def iso(moment: datetime) -> str:
    return moment.isoformat(timespec="seconds")


def load_settings(runtime: dict) -> dict:
    """The project's SETTINGS.json, reached through the checkpoint; absent settings mean defaults."""
    reference = runtime.get("settings", {})
    path = Path(str(reference.get("path", "")))
    if not path.is_file():
        return {}
    try:
        settings = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    # The canonical repository may sit at the top level or under work; either is accepted.
    if "sourceRepository" not in settings:
        settings["sourceRepository"] = settings.get("work", {}).get("sourceRepository", "")
    return settings


def load_runtime(path: Path) -> dict:
    if not path.is_file():
        raise LedgerError(f"checkpoint does not exist: {path}")
    runtime = json.loads(path.read_text(encoding="utf-8"))
    return migrate(runtime)


def migrate(runtime: dict) -> dict:
    """Carry a schema-2 checkpoint forward without losing what it already recorded."""
    schema = runtime.get("schema")
    if schema == RUNTIME_SCHEMA:
        return runtime
    if schema != 2:
        raise LedgerError(f"unsupported runtime schema {schema!r}; rebuild from a fresh inventory")
    runtime["schema"] = RUNTIME_SCHEMA
    runtime.setdefault("resources", [])
    runtime.setdefault("accountingTotals", blank_accounting())
    for node in runtime.get("activeNodes", []):
        node.setdefault("accounting", blank_accounting())
    return runtime


def blank_accounting() -> dict:
    return {
        "roleMinutes": {role: 0 for role in ROLE_MINUTES},
        "rounds": 0,
        "returns": {reason: 0 for reason in RETURN_REASONS},
        "tokens": 0,
    }


def save_runtime(path: Path, runtime: dict, moment: datetime) -> None:
    runtime["updatedAt"] = iso(moment)
    runtime["tails"] = runtime.get("tails", [])[-TAIL_LIMIT:]
    runtime["materialEvents"] = runtime.get("materialEvents", [])[-EVENT_LIMIT:]
    path.write_text(json.dumps(runtime, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def record_event(runtime: dict, moment: datetime, description: str) -> None:
    events = runtime.setdefault("materialEvents", [])
    events.append({"at": iso(moment), "event": description[:500]})
    del events[:-EVENT_LIMIT]


def totals(runtime: dict) -> dict:
    """Run-level accounting. A retired node takes its record away; the totals must outlive it."""
    record = runtime.setdefault("accountingTotals", blank_accounting())
    record.setdefault("roleMinutes", {role: 0 for role in ROLE_MINUTES})
    record.setdefault("returns", {reason: 0 for reason in RETURN_REASONS})
    record.setdefault("rounds", 0)
    return record


def active_node(runtime: dict, task: str) -> dict:
    for node in runtime.setdefault("activeNodes", []):
        if node.get("id") == task:
            node.setdefault("accounting", blank_accounting())
            return node
    node = {"id": task, "ceremonyMinutes": 0, "auxiliaryReturnsSinceMovement": 0,
            "accounting": blank_accounting()}
    runtime["activeNodes"].append(node)
    return node


# ------------------------------------------------------------------------------------------
# work tree
# ------------------------------------------------------------------------------------------


def load_nodes(schema: dict, work_root: Path) -> dict:
    nodes, errors = worklib.load_tree(schema, work_root)
    if errors:
        raise LedgerError("; ".join(errors))
    return {node.id: node for node in nodes}


def set_field(text: str, key: str, value: str) -> str:
    head, sep, body = text.partition("\n---\n")
    lines = head.split("\n")
    for index, line in enumerate(lines):
        if line.split(":", 1)[0].strip() == key:
            lines[index] = f"{key}: {value}".rstrip()
            return "\n".join(lines) + sep + body
    lines.append(f"{key}: {value}".rstrip())
    return "\n".join(lines) + sep + body


def set_list_field(text: str, key: str, items: list[str]) -> str:
    """Rewrite a block-list field in place; its items belong under the key, not at the block's end."""
    head, sep, body = text.partition("\n---\n")
    lines = head.split("\n")
    start = next((i for i, line in enumerate(lines) if line.split(":", 1)[0].strip() == key), None)
    if start is None:
        raise LedgerError(f"front matter has no {key!r} field")
    end = start + 1
    while end < len(lines) and lines[end].startswith(("  - ", "- ")):
        end += 1
    replacement = [f"{key}:"] + [f"  - {item}" for item in items]
    return "\n".join(lines[:start] + replacement + lines[end:]) + sep + body


def replace_section(text: str, heading: str, body: str) -> str:
    lines = text.split("\n")
    start = next((i for i, line in enumerate(lines) if line.strip() == f"## {heading}"), None)
    if start is None:
        raise LedgerError(f"section '{heading}' is absent")
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    replacement = [f"## {heading}", ""] + body.rstrip("\n").split("\n") + [""]
    return "\n".join(lines[:start] + replacement + lines[end:])


def append_journal(text: str, line: str, limit: int) -> str:
    lines = text.split("\n")
    start = next((i for i, item in enumerate(lines) if item.strip() == "## Review rounds"), None)
    trimmed = worklib.trim_journal_line(line, limit)
    if start is None:
        closure = next((i for i, item in enumerate(lines) if item.startswith("## Closure")), None)
        if closure is None:
            raise LedgerError("the node has no 'Closure' section to place the journal before")
        block = ["## Review rounds", "", trimmed, ""]
        return "\n".join(lines[:closure] + block + lines[closure:])
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    tail = end
    while tail > start + 1 and not lines[tail - 1].strip():
        tail -= 1
    return "\n".join(lines[:tail] + [trimmed] + lines[tail:])


def ensure_started(text: str, moment: datetime) -> str:
    """A node that reaches a started state carries the moment it started, whatever moved it there."""
    head = text.partition("\n---\n")[0]
    for line in head.split("\n"):
        key, _, value = line.partition(":")
        if key.strip() == "started_at":
            return text if value.strip() else set_field(text, "started_at", iso(moment))
    return set_field(text, "started_at", iso(moment))


def edit_node(node, mutate) -> None:
    node.path.write_text(mutate(node.path.read_text(encoding="utf-8")), encoding="utf-8")


# ------------------------------------------------------------------------------------------
# events
# ------------------------------------------------------------------------------------------


LINK_RE = worklib.LINK_RE
URL_RE = re.compile(r"^https?://\S+$")
FULL_SHA_RE = re.compile(r"^[0-9a-f]{40}$")


def commit_link(value: str, schema: dict, settings: dict, runtime: dict, what: str) -> str:
    """Accept a full SHA or a commit-pinned URL; refuse everything else before it is written.

    A short SHA passes a glance and fails the render one step later, and a bare SHA in a node
    violates the source-reference rule. The canonical repository URL comes from the project's
    settings (`sourceRepository`) or the checkpoint (`integration.sourceRepository`).
    """
    value = value.strip()
    if re.match(schema["commit_url_pattern"], value):
        return value
    if FULL_SHA_RE.fullmatch(value):
        base = (settings.get("sourceRepository")
                or runtime.get("integration", {}).get("sourceRepository", "")).rstrip("/")
        if not base:
            raise LedgerError(
                f"{what} {value[:12]} needs the canonical repository URL to become a link; set "
                "`sourceRepository` in SETTINGS.json (https://<forge>/<owner>/<repo>)"
            )
        return f"{base}/commit/{value}"
    raise LedgerError(
        f"{what} {value!r} is neither a 40-character lowercase SHA nor a commit-pinned URL; "
        "a short or abbreviated SHA is refused because the render and the source-reference "
        "rule both require the full one"
    )


def bounded_line(line: str, limit: int, what: str) -> str:
    """Trim a journal line to the schema limit before it reaches a file, and say so."""
    if len(line) <= limit:
        return line
    trimmed = worklib.trim_journal_line(line, limit)
    print(f"ledger: {what} exceeded {limit} characters and was trimmed to fit the journal",
          file=sys.stderr)
    return trimmed


def evidence_links(values: list[str], candidate: str, label: str) -> list[str]:
    """Turn each --evidence into one Markdown link the validator accepts, or refuse it.

    A bare URL gets a caption built from the candidate; a ready link passes through; anything else
    is a mistake to report before it reaches a file, because a broken front matter blocks every
    later check until someone edits it by hand.
    """
    links = []
    for value in values:
        value = value.strip()
        if LINK_RE.fullmatch(value):
            links.append(value)
            continue
        if URL_RE.fullmatch(value):
            short = candidate.rsplit("/", 1)[-1][:12] if candidate else "commit"
            caption = label or f"Candidate {short}"
            links.append(f"[{caption}]({value})")
            continue
        raise LedgerError(
            f"--evidence {value!r} is neither a URL nor a Markdown link; write it as "
            "https://… or [caption](https://…)"
        )
    return links


def node_summary(context, tasks: list[str]) -> list[str]:
    """One line per touched node, so the CTO reads the result instead of the files."""
    schema = context["schema"]
    fresh = load_nodes(schema, context["work_root"])
    head = context["runtime"].get("integration", {}).get("head", "")[:12] or "—"
    lines = []
    for task in tasks:
        node = fresh.get(task)
        if node is None:
            lines.append(f"  {task}: retired · head {head}")
            continue
        rounds = node.integer("review_rounds") or 0
        candidate = node.text("candidate_commit").rsplit("/", 1)[-1][:12] or "—"
        lines.append(f"  {task}: {node.state} · R{rounds} · candidate {candidate} · head {head}")
    return lines


def event_dispatch(args, context) -> str:
    runtime, moment = context["runtime"], context["moment"]
    for task in args.task:
        node = active_node(runtime, task)
        node["ceremonyMinutes"] = node.get("ceremonyMinutes", 0) + args.ceremony_minutes
        edit_node(context["nodes"][task], lambda text: ensure_started(
            set_field(text, "state", "active"), moment))
    if args.resource:
        warn = claim_resources(runtime, args.resource, args.task[0], args.acknowledge)
        if warn:
            raise LedgerError(warn)
    if args.agent:
        runtime.setdefault("agents", []).append({
            "id": args.agent, "task": args.task[0], "role": args.role, "family": args.family,
            "title": f"{args.task[0]}-{args.family}-{args.role}", "workspaceId": args.workspace,
            "baseline": args.baseline, "provider": args.provider, "effort": args.effort,
            "modeId": args.mode_id, "derivedStatus": "running", "stateSince": iso(moment),
            "returnSummary": "",
        })
        runtime.setdefault("workspaces", []).append({
            "id": args.workspace, "task": args.task[0], "role": args.role,
            "title": f"{args.task[0]}-{args.family}-{args.role}", "path": args.workspace_path or "",
            "branch": args.branch or "", "baseline": args.baseline, "state": "active",
        })
    return f"dispatch {' '.join(args.task)}"


def claim_resources(runtime: dict, resources: list[str], task: str, acknowledged: bool) -> str:
    declared = {item["id"]: item for item in runtime.setdefault("resources", [])}
    for name in resources:
        item = declared.get(name)
        if item is None:
            item = {"id": name, "mode": "consumable", "owner": "", "note": ""}
            runtime["resources"].append(item)
            declared[name] = item
        owner = item.get("owner", "")
        if item.get("mode") == "exclusive" and owner and owner != task and not acknowledged:
            return (f"resource {name!r} is held by {owner}; it is exclusive, so either wait, "
                    "reassign it, or repeat with --acknowledge to record a deliberate overlap")
        item["owner"] = task
    return ""


def budget_notice(context, tasks: list[str], *, spent_now: bool = False) -> None:
    """Say the budget is spent while the next round can still be planned.

    `spent_now` counts the return being written in this call. The notice names the two decisions
    that extend the loop, because recording one of them *before* the next round is what makes it
    legal; recording it afterwards only documents an overrun.
    """
    schema = context["schema"]
    budget = schema["limits"]["review_return_budget"]
    for task in tasks:
        node = context["nodes"][task]
        if node.text("escalation_decision"):
            continue
        spent = (node.integer("review_rounds") or 0) + (1 if spent_now else 0)
        if spent >= budget:
            print(
                f"ledger: {task}: returns spent {spent}/{budget}: next verdict is ESCALATE "
                "unless bounded_retry/independent_review is recorded — "
                "`ledger.py escalate --decision bounded_retry` before the next round",
                file=sys.stderr,
            )


def event_candidate(args, context) -> str:
    runtime, moment = context["runtime"], context["moment"]
    args.commit = commit_link(args.commit, context["schema"], context["settings"], runtime,
                              "--commit")
    for task in args.task:
        edit_node(context["nodes"][task], lambda text: ensure_started(set_field(
            set_field(text, "candidate_commit", args.commit), "state", "review"), moment))
        active_node(runtime, task)
    for agent in runtime.get("agents", []):
        if agent["task"] in args.task and agent["role"] == "builder":
            agent["candidate"] = args.commit.rsplit("/", 1)[-1]
            agent["derivedStatus"] = "reviewing"
            agent["stateSince"] = iso(moment)
    budget_notice(context, args.task)
    return f"candidate {args.commit.rsplit('/', 1)[-1][:12]} on {' '.join(args.task)}"


def event_verdict(args, context) -> str:
    runtime, moment, schema = context["runtime"], context["moment"], context["schema"]
    limit = schema["limits"]["review_round_line_chars"]
    per_task = {}
    for item in args.task_finding:
        task_id, sep, text = item.partition("=")
        if not sep or task_id not in args.task:
            raise LedgerError(f"--task-finding {item!r} must read <task>=<finding> for a task in --task")
        per_task[task_id] = text
    for task in args.task:
        node = context["nodes"][task]
        rounds = (node.integer("review_rounds") or 0) + 1
        marker = f"- R{rounds}({args.score}/10) {args.verdict} {stamp(moment)} "
        if args.reset_from:
            marker += f"[reset R{args.reset_from}] "
        detail = per_task.get(task, args.finding)
        if args.answer:
            detail += f" → {args.answer}"
        if args.changed:
            detail += f" → {args.changed}"
        line = bounded_line(f"{marker}— {'[delta] ' if args.delta else ''}{detail}", limit,
                            f"--finding for {task}")
        state = "accepted" if args.verdict == "ACCEPT" else "rework"
        edit_node(node, lambda text: append_journal(
            ensure_started(
                set_field(set_field(text, "review_rounds", str(rounds)), "state",
                          state if state != "accepted" else "review"),
                moment),
            line, limit))
        counted_return = args.verdict == "RETURN" and not args.delta
        for record in (active_node(runtime, task)["accounting"], totals(runtime)):
            record["rounds"] = record.get("rounds", 0) + 1
            record["roleMinutes"]["reviewer"] = (
                record["roleMinutes"].get("reviewer", 0) + args.minutes
            )
            if counted_return:
                record["returns"][args.reason] = record["returns"].get(args.reason, 0) + 1
    for agent in runtime.get("agents", []):
        if agent["task"] in args.task:
            agent["derivedStatus"] = "rework" if args.verdict == "RETURN" else "reviewing"
            agent["stateSince"] = iso(moment)
    budget_notice(context, args.task, spent_now=args.verdict == "RETURN" and not args.delta)
    delta = " (delta)" if args.delta else ""
    return f"{args.verdict}{delta} R{args.score}/10 on {' '.join(args.task)}"


def event_escalate(args, context) -> str:
    runtime, moment, schema = context["runtime"], context["moment"], context["schema"]
    limit = schema["limits"]["review_round_line_chars"]
    vocabulary = schema["escalation_decisions"]
    if args.decision not in vocabulary:
        raise LedgerError(
            f"--decision {args.decision!r} is not a decision; the vocabulary is "
            f"{sorted(vocabulary)}"
        )
    line = bounded_line(f"- CTO {args.decision} {stamp(moment)} — {args.reason}", limit,
                        "--reason-text")
    for task in args.task:
        edit_node(context["nodes"][task], lambda text: append_journal(
            set_field(text, "escalation_decision", args.decision), line, limit))
        active_node(runtime, task)
    return f"escalation {args.decision} on {' '.join(args.task)}"


def event_block(args, context) -> str:
    runtime, moment = context["runtime"], context["moment"]
    for task in args.task:
        edit_node(context["nodes"][task], lambda text: set_field(
            set_field(text, "state", "blocked"), "blocker", args.blocker))
        active_node(runtime, task)
    runtime.setdefault("tails", []).append(f"{' '.join(args.task)}: {args.blocker}"[:1200])
    del runtime["tails"][:-TAIL_LIMIT]
    return f"blocked {' '.join(args.task)}"


def close_acceptance(text: str) -> str:
    """Tick the acceptance checklist: an accepted node cannot carry open boxes."""
    lines = text.split("\n")
    start = next((i for i, line in enumerate(lines) if line.strip() == "## Acceptance"), None)
    if start is None:
        return text
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    for index in range(start, end):
        lines[index] = lines[index].replace("- [ ]", "- [x]", 1)
    return "\n".join(lines)


def subsection(text: str, heading: str, body: str) -> str:
    """Replace the body of an h3 inside Closure without touching its siblings."""
    lines = text.split("\n")
    start = next((i for i, line in enumerate(lines) if line.strip() == f"### {heading}"), None)
    if start is None:
        return text
    end = next(
        (i for i in range(start + 1, len(lines)) if lines[i].startswith(("## ", "### "))),
        len(lines),
    )
    return "\n".join(lines[: start + 1] + ["", body, ""] + lines[end:])


def event_merge(args, context) -> str:
    """Integration: the candidate is on the integration branch and waits for acceptance.

    Merging is not accepting. Unless the project's settings say the two coincide, the node stays
    `review` with its closure commit recorded, and `accept` moves it on when the owner does.
    """
    runtime, moment, settings = context["runtime"], context["moment"], context["settings"]
    merge_accepts = bool(settings.get("charter", {}).get("acceptance", {}).get(
        "mergeIsAcceptance", False))
    args.closure_commit = commit_link(args.closure_commit, context["schema"], settings, runtime,
                                      "--closure-commit")
    links = evidence_links(args.evidence, "", args.evidence_label)
    for task in args.task:
        node = context["nodes"][task]
        candidate = node.text("candidate_commit")
        links = evidence_links(args.evidence, candidate, args.evidence_label)

        def mutate(text: str) -> str:
            text = set_field(text, "closure_commit", args.closure_commit)
            text = set_list_field(text, "evidence", [links[0] if links else "Git"])
            text = subsection(text, "Evidence", "\n".join(f"- {link}" for link in links) or "- Git")
            if args.accepted:
                text = subsection(text, "Accepted outcome", args.accepted)
            if merge_accepts:
                text = accept_text(text, moment, args)
            else:
                text = set_field(text, "state", "review")
            return text
        edit_node(node, mutate)
        for record in (active_node(runtime, task)["accounting"], totals(runtime)):
            record["roleMinutes"]["cto"] = record["roleMinutes"].get("cto", 0) + args.minutes
    if args.head:
        runtime.setdefault("integration", {})["head"] = args.head
    verb = "merged and accepted" if merge_accepts else "merged"
    return f"{verb} {' '.join(args.task)}"


def accept_text(text: str, moment: datetime, args) -> str:
    text = set_field(text, "state", "accepted")
    text = set_field(text, "accepted_at", iso(moment))
    residue = getattr(args, "residue", "")
    if residue:
        text = set_field(text, "deliberate_partial", "true")
        text = set_field(text, "return_trigger", getattr(args, "return_trigger", ""))
        text = subsection(text, "Residuals", f"- {residue}")
    else:
        text = close_acceptance(text)
    return text


def event_accept(args, context) -> str:
    """The owner accepted the integrated outcome; the node becomes `accepted` from the clock."""
    moment = context["moment"]
    for task in args.task:
        node = context["nodes"][task]
        if not node.text("closure_commit"):
            raise LedgerError(f"{task} has no closure_commit; merge it before accepting it")
        edit_node(node, lambda text: accept_text(text, moment, args))
        active_node(context["runtime"], task)
    return f"accepted {' '.join(args.task)}"


def event_retire(args, context) -> str:
    runtime = context["runtime"]
    tasks = set(args.task)
    runtime["agents"] = [a for a in runtime.get("agents", []) if a["task"] not in tasks]
    runtime["workspaces"] = [w for w in runtime.get("workspaces", []) if w["task"] not in tasks]
    runtime["activeNodes"] = [n for n in runtime.get("activeNodes", []) if n["id"] not in tasks]
    for item in runtime.setdefault("resources", []):
        if item.get("owner") in tasks:
            item["owner"] = ""
    return f"retired {' '.join(args.task)}"


EVENTS = {
    "dispatch": event_dispatch,
    "candidate": event_candidate,
    "verdict": event_verdict,
    "escalate": event_escalate,
    "block": event_block,
    "merge": event_merge,
    "accept": event_accept,
    "retire": event_retire,
}


# ------------------------------------------------------------------------------------------
# driver
# ------------------------------------------------------------------------------------------


def regenerate(schema: dict, work_root: Path) -> list[str]:
    nodes, errors = worklib.load_tree(schema, work_root)
    if errors:
        return errors
    for name, rendered in (
        (schema["status"]["file"], worklib.render_status(schema, work_root, nodes)),
        (schema["waves"]["file"], worklib.render_waves(schema, nodes)),
    ):
        (work_root / name).write_text(rendered, encoding="utf-8")
    return []


def locate_tool(name: str, runtime: dict) -> Path:
    """Find a plugin script beside this file, or in the installed plugin the checkpoint names.

    The project copy is authoritative when it exists. When the copy is missing, the installed
    plugin at the checkpoint's `plugin.version` is used and the choice is reported, so a run never
    depends on which host happened to be current. A script found nowhere is an error, not a skip.
    """
    local = SCRIPT_DIR / name
    if local.is_file():
        return local
    version = runtime.get("plugin", {}).get("version", "")
    candidates = []
    home = Path.home()
    for root in (
        home / ".claude/plugins/marketplaces/maggnus/paseo-cto/skills/paseo-cto/templates",
        home / ".codex/plugins/marketplaces/maggnus/paseo-cto/skills/paseo-cto/templates",
    ):
        candidate = root / name
        if candidate.is_file():
            candidates.append(candidate)
    for candidate in candidates:
        manifest = candidate.parents[3] / ".claude-plugin/plugin.json"
        try:
            installed = json.loads(manifest.read_text(encoding="utf-8")).get("version", "")
        except (OSError, ValueError):
            installed = ""
        if not version or installed == version:
            print(f"ledger: {name} taken from the installed plugin at {candidate.parent}",
                  file=sys.stderr)
            return candidate
    raise LedgerError(
        f"{name} is not in {SCRIPT_DIR} and no installed plugin at version {version or '?'} "
        f"provides it; copy it from the plugin's templates directory beside work.py"
    )


def render_fleet(args, runtime: dict) -> str:
    """Render FLEET.md through the plugin renderer.

    A renderer that is missing is a setup error and fails the call; a renderer that runs and
    cannot complete leaves FLEET.md unchanged and is reported as stale.
    """
    renderer = locate_tool("render_fleet.py", runtime)
    locate_tool("check_runtime.py", runtime)
    locate_tool("check-fleet-render.sh", runtime)
    command = [
        sys.executable, str(renderer), str(args.checkpoint),
        "--project-root", str(args.project_root), "--work-root", str(args.work_root),
        "--timezone", args.timezone or default_timezone(),
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        detail = result.stderr.strip().splitlines()[-1] if result.stderr.strip() else "failed"
        raise RenderUnavailable(f"fleet render failed: {detail}")
    return result.stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser(prog="ledger.py", description=__doc__)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--work-root", type=Path, required=True)
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--schema", type=Path, default=SCRIPT_DIR / "work-schema.json")
    parser.add_argument("--timezone", default="",
                        help="timezone token for the render; defaults to the machine's own")
    parser.add_argument("--no-fleet", action="store_true")
    sub = parser.add_subparsers(dest="event", required=True)

    def common(name: str):
        target = sub.add_parser(name)
        target.add_argument("--task", action="append", required=True)
        target.add_argument("--minutes", type=int, default=0)
        return target

    dispatch = common("dispatch")
    dispatch.add_argument("--agent")
    dispatch.add_argument("--workspace")
    dispatch.add_argument("--workspace-path")
    dispatch.add_argument("--branch")
    dispatch.add_argument("--role", default="builder")
    dispatch.add_argument("--family", default="")
    dispatch.add_argument("--provider", default="")
    dispatch.add_argument("--effort", default="")
    dispatch.add_argument("--mode-id", default="")
    dispatch.add_argument("--baseline", default="")
    dispatch.add_argument("--resource", action="append", default=[])
    dispatch.add_argument("--acknowledge", action="store_true")
    dispatch.add_argument("--ceremony-minutes", type=int, default=0)

    candidate = common("candidate")
    candidate.add_argument("--commit", required=True)

    verdict = common("verdict")
    verdict.add_argument("--verdict", required=True, choices=("ACCEPT", "RETURN", "ESCALATE"))
    verdict.add_argument("--score", required=True, type=int, choices=range(1, 11))
    verdict.add_argument("--finding", required=True)
    verdict.add_argument("--task-finding", action="append", default=[],
                         help="<task>=<finding> for one node of a batch; repeatable")
    verdict.add_argument("--answer", default="")
    verdict.add_argument("--changed", default="")
    verdict.add_argument("--delta", action="store_true")
    verdict.add_argument("--reset-from", type=int)
    verdict.add_argument("--reason", default="outcome_defect", choices=RETURN_REASONS)

    escalate = common("escalate")
    escalate.add_argument("--decision", required=True)
    escalate.add_argument("--reason-text", dest="reason", required=True)

    block = common("block")
    block.add_argument("--blocker", required=True)

    merge = common("merge")
    merge.add_argument("--closure-commit", required=True)
    merge.add_argument("--evidence", action="append", default=[],
                       help="a URL, or a ready [caption](url); repeatable")
    merge.add_argument("--evidence-label", default="")
    merge.add_argument("--accepted", default="")
    merge.add_argument("--residue", default="")
    merge.add_argument("--return-trigger", default="")
    merge.add_argument("--head")

    accept = common("accept")
    accept.add_argument("--residue", default="")
    accept.add_argument("--return-trigger", default="")

    common("retire")

    args = parser.parse_args()
    try:
        schema = worklib.load_schema(args.schema)
        runtime = load_runtime(args.checkpoint)
        moment = now()
        nodes = load_nodes(schema, args.work_root)
        for task in args.task:
            if task not in nodes and args.event != "retire":
                raise LedgerError(f"{task} is not a node in {args.work_root}")
        settings = load_settings(runtime)
        context = {"runtime": runtime, "moment": moment, "nodes": nodes, "schema": schema,
                   "settings": settings, "work_root": args.work_root}
        description = EVENTS[args.event](args, context)
        summary = node_summary(context, args.task)
        record_event(runtime, moment, description)
        save_runtime(args.checkpoint, runtime, moment)
        errors = regenerate(schema, args.work_root)
        if errors:
            raise LedgerError("; ".join(errors))
    except LedgerError as error:
        print(f"ledger: {error}", file=sys.stderr)
        return 1

    print(f"ledger: {description} at {stamp(moment)}")
    for line in summary:
        print(line)
    if not args.no_fleet:
        try:
            print(f"ledger: {render_fleet(args, runtime)}")
        except LedgerError as error:
            print(f"ledger: {error}", file=sys.stderr)
            return 1
        except RenderUnavailable as error:
            print(f"ledger: warning: {error}; FLEET.md is stale until the next successful render",
                  file=sys.stderr)
    check = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "work.py"), "--root", str(args.work_root),
         "--schema", str(args.schema), "check", "--fix"],
        capture_output=True, text=True,
    )
    sys.stdout.write(check.stdout)
    sys.stderr.write(check.stderr)
    return check.returncode


if __name__ == "__main__":
    raise SystemExit(main())
