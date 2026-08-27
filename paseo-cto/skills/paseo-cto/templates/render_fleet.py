#!/usr/bin/env python3
"""Generate FLEET.md atomically from verified runtime, Paseo, Git, and work-tree state."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

SCRIPT_DIR = Path(__file__).resolve().parent
sys.dont_write_bytecode = True
sys.path.insert(0, str(SCRIPT_DIR))

import check_runtime  # noqa: E402
import work as worklib  # noqa: E402


def fail(message: str) -> None:
    raise check_runtime.InvalidRuntime(message)


def elapsed(updated, started, *, approximate: bool = False) -> str:
    minutes = int((updated - started).total_seconds() // 60)
    if minutes < 0:
        fail("fleet time cannot start after runtime.updatedAt")
    hours, remainder = divmod(minutes, 60)
    value = f"{hours}h{remainder}m" if hours and remainder else f"{hours}h" if hours else f"{minutes}m"
    return f"~{value}" if approximate else value


# A defect in a critical node costs more than one in a routine node, so remaining work is weighed
# by risk rather than counted by heads.
RISK_WEIGHT = {"routine": 1, "significant": 2, "critical": 3, "pre_policy": 1}


def progress_line(schema: dict, nodes: list, runtime: dict, wave_id: str) -> str:
    """Accepted, merged, in flight and remaining for the current wave, with the round economics."""
    leaves = [
        node for node in nodes
        if node.kind in ("task", "subtask")
        and (wave_id == "—" or worklib.owning_wave(schema, node.id) == wave_id)
    ]
    accepted = [node for node in leaves if node.state == "accepted"]
    merged = [node for node in accepted if node.text("closure_commit")]
    in_flight = [node for node in leaves if node.state in ("active", "review", "rework")]
    remaining = [node for node in leaves if node not in accepted and node not in in_flight]
    weight = sum(RISK_WEIGHT.get(node.text("risk"), 1) for node in leaves)
    done_weight = sum(RISK_WEIGHT.get(node.text("risk"), 1) for node in accepted)
    percent = worklib.render_percent(done_weight, weight, "0%") if weight else "0%"

    sources = [runtime["accountingTotals"]] if "accountingTotals" in runtime else [
        node["accounting"] for node in runtime.get("activeNodes", []) if node.get("accounting")
    ]
    rounds = minutes = proof_returns = all_returns = 0
    for record in sources:
        rounds += record.get("rounds", 0)
        minutes += sum(record.get("roleMinutes", {}).values())
        returns = record.get("returns", {})
        proof_returns += returns.get("proof", 0)
        all_returns += sum(returns.values())
    per_round = f"{minutes // rounds}m" if rounds else "—"
    proof_share = f"{round(100 * proof_returns / all_returns)}%" if all_returns else "—"
    return (
        f"Nodes: {len(accepted)} accepted / {len(merged)} merged / {len(in_flight)} in flight / "
        f"{len(remaining)} remaining · {percent} by risk weight · round {per_round} · "
        f"proof returns {proof_share}"
    )


def render(args: argparse.Namespace) -> tuple[Path | None, int, int]:
    state = check_runtime.validate_runtime(args.checkpoint, args.project_root)
    runtime, settings = state["runtime"], state["settings"]
    updated = check_runtime.timestamp(runtime["updatedAt"], "runtime.updatedAt")

    work_root = args.work_root
    if work_root is None:
        configured = settings.get("work", {}).get("root")
        if not isinstance(configured, str) or not configured.strip():
            fail("SETTINGS.json work.root is required to render FLEET.md")
        work_root = args.project_root / configured
    work_root = work_root.resolve()
    schema = worklib.load_schema(SCRIPT_DIR / "work-schema.json")
    nodes, errors = worklib.load_tree(schema, work_root)
    if errors:
        fail("; ".join(errors))
    node_by_id = {node.id: node for node in nodes}

    clock = runtime["releaseClock"]
    wave_id, wave_name = clock["currentWave"], clock["currentWaveName"]
    if wave_id == "—":
        if wave_name != "—":
            fail("an absent current wave must use name —")
        done = total = 0
    else:
        wave = node_by_id.get(wave_id)
        if wave is None or wave.kind != "wave" or wave.title != wave_name:
            fail("runtime current wave differs from the work tree")
        cards = [
            node for node in nodes
            if node.kind == "card" and worklib.owning_wave(schema, node.id) == wave_id
        ]
        done, total = sum(card.state == "accepted" for card in cards), len(cards)

    if not re.fullmatch(r"\S+", args.timezone):
        fail("timezone must be one unambiguous token")
    if args.context and not re.fullmatch(r"\d+(?:\.\d+)?[kKmM]\((?:100|[1-9]?\d)%\)", args.context):
        fail("context must match <amount>(<percent>%)")

    cto = runtime["cto"]
    session = elapsed(
        updated, check_runtime.timestamp(cto["sessionStartedAt"], "runtime.cto.sessionStartedAt")
    )
    identity = f"paseo-cto: v{runtime['plugin']['version']} | Model: {cto['provider']} ({cto['effort']})"
    if args.context:
        identity += f" | Context: {args.context}"
    identity += f" | Session: {session}"

    rows = [{
        "agent": f"cto-{cto['family']}",
        "task": "—",
        "title": cto["action"],
        "status": cto["derivedStatus"],
        "time": elapsed(
            updated,
            check_runtime.timestamp(cto["stateSince"], "runtime.cto.stateSince"),
            approximate=cto.get("stateSinceApproximate", False),
        ),
        "loc": "—",
    }]

    def agent_order(agent: dict) -> tuple[bool, str]:
        return (worklib.owning_wave(schema, agent["task"]) != wave_id, agent["title"])

    for agent in sorted(runtime["agents"], key=agent_order):
        node = node_by_id.get(agent["task"])
        if node is None:
            fail(f"runtime task is absent from the work tree: {agent['task']}")
        rows.append({
            "agent": agent["title"],
            "task": agent["task"],
            "title": node.title,
            "status": agent["derivedStatus"],
            "time": elapsed(
                updated,
                check_runtime.timestamp(agent["stateSince"], f"{agent['title']}.stateSince"),
                approximate=agent.get("stateSinceApproximate", False),
            ),
            "loc": state["loc"][agent["title"]],
        })

    lines = [
        f"# Update {updated.strftime('%Y-%m-%d %H:%M')} {args.timezone}",
        identity,
        f"Wave: [{wave_id}] {wave_name}",
        f"Cards: {done}/{total}",
        progress_line(schema, nodes, runtime, wave_id),
        "",
        "| Agent | Task | Status | Time | LOC |",
        "| --- | --- | --- | --- | --- |",
    ]
    lines.extend(
        f"| `{row['agent']}` | `{row['task']}` {row['title']} | `{row['status']}` | "
        f"{row['time']} | {row['loc']} |"
        for row in rows
    )

    document = "\n".join(lines) + "\n"
    output = (
        None
        if args.stdout
        else (args.output or args.checkpoint.parent / "FLEET.md").resolve()
    )
    if output is not None and not output.parent.is_dir():
        fail(f"fleet output directory does not exist: {output.parent}")
    fleet_temp = None
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=output.parent if output else None,
            prefix=".FLEET.",
            delete=False,
        ) as handle:
            handle.write(document)
            fleet_temp = Path(handle.name)
        environment = os.environ.copy()
        environment.update({
            "FLEET_FILE": str(fleet_temp),
            "WORK_ROOT": str(work_root),
            "PASEO_CTO_VERSION": f"v{runtime['plugin']['version']}",
        })
        subprocess.run(
            [str(SCRIPT_DIR / "check-fleet-render.sh")], check=True, env=environment,
            stdout=subprocess.DEVNULL if args.stdout else None,
        )
        if args.stdout:
            sys.stdout.write(document)
        else:
            os.chmod(fleet_temp, 0o644)
            os.replace(fleet_temp, output)
            fleet_temp = None
    finally:
        if fleet_temp is not None:
            fleet_temp.unlink(missing_ok=True)
    return output, done, total


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("--project-root", type=Path, required=True)
    parser.add_argument("--work-root", type=Path)
    parser.add_argument("--timezone", required=True)
    parser.add_argument("--context")
    destination = parser.add_mutually_exclusive_group()
    destination.add_argument("--output", type=Path)
    destination.add_argument("--stdout", action="store_true")
    args = parser.parse_args()
    try:
        output, done, total = render(args)
    except (check_runtime.InvalidRuntime, OSError, subprocess.CalledProcessError) as error:
        print(f"fleet render: {error}", file=sys.stderr)
        return 1
    if output is not None:
        print(f"fleet render: wrote {output}; Cards {done}/{total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
