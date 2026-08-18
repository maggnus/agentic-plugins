#!/usr/bin/env python3
"""Validate a bounded Paseo CTO runtime checkpoint against settings and Git."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys

STATUSES = {"running", "waiting", "blocked", "idle", "reviewing", "rework", "stalled", "error", "done"}
ROLES = {"builder", "reviewer", "researcher"}
SHA_RE = re.compile(r"[0-9a-f]{40}")
TASK_RE = re.compile(r"W\d+(?:-[A-Z0-9][A-Za-z0-9.]*)*")
FAMILY_RE = re.compile(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?")
VERSION_RE = re.compile(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?")
TOP_KEYS = {
    "schema", "updatedAt", "project", "run", "settings", "plugin", "cto", "integration",
    "heartbeat", "releaseClock", "activeNodes", "agents", "workspaces", "tails",
    "materialEvents",
}
NATIVE_STATUSES = {"initializing", "idle", "running", "error", "closed"}


class InvalidRuntime(ValueError):
    pass


def fail(message: str) -> None:
    raise InvalidRuntime(message)


def object_keys(value: object, required: set[str], optional: set[str], where: str) -> dict:
    if not isinstance(value, dict):
        fail(f"{where} must be an object")
    missing = required - value.keys()
    extra = value.keys() - required - optional
    if missing or extra:
        fail(f"{where} fields differ: missing={sorted(missing)}, extra={sorted(extra)}")
    return value


def text(value: object, where: str, *, empty: bool = False, limit: int | None = None) -> str:
    if not isinstance(value, str) or (not empty and not value.strip()):
        fail(f"{where} must be {'a string' if empty else 'a non-empty string'}")
    if limit is not None and len(value) > limit:
        fail(f"{where} exceeds {limit} characters")
    return value


def timestamp(value: object, where: str) -> datetime:
    raw = text(value, where)
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        fail(f"{where} must be RFC3339")
    if parsed.tzinfo is None:
        fail(f"{where} must include an offset")
    return parsed


def natural(value: object, where: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        fail(f"{where} must be a non-negative integer")
    return value


def sha(value: object, where: str) -> str:
    value = text(value, where)
    if not SHA_RE.fullmatch(value):
        fail(f"{where} must be a full lowercase Git SHA")
    return value


def load_json(path: Path, where: str) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"cannot read {where}: {error}")
    if not isinstance(value, dict):
        fail(f"{where} must contain a JSON object")
    return value


def git(root: Path, *args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", "-C", str(root), *args], text=True, stderr=subprocess.STDOUT
        ).strip()
    except subprocess.CalledProcessError as error:
        fail(f"git {' '.join(args)} failed: {error.output.strip()}")


def paseo_json(*args: str) -> object:
    command = [os.environ.get("PASEO_CTO_PASEO_BIN", "paseo"), *args, "--json"]
    try:
        output = subprocess.check_output(command, text=True, stderr=subprocess.STDOUT)
        return json.loads(output)
    except FileNotFoundError:
        fail("paseo CLI is unavailable; runtime facts cannot be probed")
    except subprocess.CalledProcessError as error:
        fail(f"{' '.join(command)} failed: {error.output.strip()}")
    except json.JSONDecodeError as error:
        fail(f"{' '.join(command)} returned invalid JSON: {error}")


def observed_agent(raw: object, where: str) -> dict:
    if not isinstance(raw, dict):
        fail(f"{where} must be an object")
    provider = text(raw.get("Provider"), f"{where}.Provider")
    model = text(raw.get("Model"), f"{where}.Model")
    archived = raw.get("Archived")
    parent = raw.get("ParentAgentId")
    if not isinstance(archived, bool) or (parent is not None and not isinstance(parent, str)):
        fail(f"{where} has invalid archive or parent state")
    return {
        "id": text(raw.get("Id"), f"{where}.Id"),
        "title": text(raw.get("Name"), f"{where}.Name"),
        "provider": f"{provider}/{model}",
        "effort": text(raw.get("Thinking"), f"{where}.Thinking"),
        "modeId": text(raw.get("Mode"), f"{where}.Mode"),
        "nativeStatus": text(raw.get("Status"), f"{where}.Status"),
        "path": str(Path(text(raw.get("Cwd"), f"{where}.Cwd")).expanduser().resolve()),
        "archived": archived,
        "parentId": parent,
    }


def collect_paseo_observation(runtime: dict) -> dict:
    project, run = runtime["project"], runtime["run"]
    global_rows = paseo_json("ls", "--global")
    run_rows = paseo_json(
        "ls", "--global", "--label", f"paseo-cto.project={project}",
        "--label", f"paseo-cto.run={run}",
    )
    if not isinstance(global_rows, list) or not isinstance(run_rows, list):
        fail("paseo ls must return JSON arrays")

    def listed_agent_ids(rows: list, where: str) -> set[str]:
        values = set()
        for index, row in enumerate(rows):
            if not isinstance(row, dict):
                fail(f"{where}[{index}] must be an object")
            values.add(text(row.get("id"), f"{where}[{index}].id"))
        return values

    listed_ids = listed_agent_ids(global_rows, "paseo.globalAgents")
    run_ids = listed_agent_ids(run_rows, "paseo.runAgents")
    listed_ids.update(run_ids)
    cto_id = runtime["cto"]["agentId"]
    listed_ids.add(cto_id)
    with ThreadPoolExecutor(max_workers=min(8, len(listed_ids))) as pool:
        inspected = list(pool.map(lambda agent_id: paseo_json("inspect", agent_id), listed_ids))
    records = {
        record["id"]: record
        for record in (
            observed_agent(raw, f"paseo.inspect[{index}]")
            for index, raw in enumerate(inspected)
        )
    }
    owned_ids = run_ids | {
        agent_id for agent_id, record in records.items() if record["parentId"] == cto_id
    }
    owned_ids.discard(cto_id)
    workspaces = paseo_json("workspace", "ls")
    if not isinstance(workspaces, list):
        fail("paseo workspace ls must return a JSON array")
    normalized_workspaces = []
    for index, raw in enumerate(workspaces):
        if not isinstance(raw, dict):
            fail(f"paseo.workspaces[{index}] must be an object")
        normalized_workspaces.append({
            "id": text(raw.get("workspaceId"), f"paseo.workspaces[{index}].workspaceId"),
            "title": text(raw.get("name"), f"paseo.workspaces[{index}].name"),
            "path": str(Path(text(raw.get("cwd"), f"paseo.workspaces[{index}].cwd")).resolve()),
            "isolation": text(raw.get("isolation"), f"paseo.workspaces[{index}].isolation"),
        })
    return {
        "schema": 1,
        "observedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "project": project,
        "run": run,
        "cto": records.get(cto_id),
        "agents": [records[agent_id] for agent_id in sorted(owned_ids) if agent_id in records],
        "workspaces": normalized_workspaces,
    }


def validate_paseo_observation(
    runtime: dict, observation: object, project_root: Path, updated: datetime
) -> dict:
    observation = object_keys(
        observation,
        {"schema", "observedAt", "project", "run", "cto", "agents", "workspaces"},
        set(), "Paseo observation",
    )
    if observation["schema"] != 1:
        fail("Paseo observation schema must be 1")
    observed_at = timestamp(observation["observedAt"], "Paseo observation.observedAt")
    if abs((observed_at - updated).total_seconds()) > 120:
        fail("Paseo observation and runtime.updatedAt differ by more than two minutes")
    if (observation["project"], observation["run"]) != (runtime["project"], runtime["run"]):
        fail("Paseo observation belongs to another project or run")

    required_agent = {
        "id", "title", "provider", "effort", "modeId", "nativeStatus", "path",
        "archived", "parentId",
    }

    def checked_agent(value: object, where: str) -> dict:
        record = object_keys(value, required_agent, set(), where)
        for field in required_agent - {"archived", "parentId"}:
            text(record[field], f"{where}.{field}")
        if not isinstance(record["archived"], bool):
            fail(f"{where}.archived must be boolean")
        if record["parentId"] is not None and not isinstance(record["parentId"], str):
            fail(f"{where}.parentId must be a string or null")
        if record["nativeStatus"] not in NATIVE_STATUSES:
            fail(f"{where}.nativeStatus is unsupported")
        return record

    cto = checked_agent(observation["cto"], "Paseo observation.cto")
    expected_cto = runtime["cto"]
    if (
        cto["id"] != expected_cto["agentId"]
        or cto["provider"] != expected_cto["provider"]
        or cto["effort"] != expected_cto["effort"]
        or Path(cto["path"]).resolve() != project_root.resolve()
        or cto["archived"]
        or cto["nativeStatus"] in {"closed", "error"}
    ):
        fail("runtime CTO differs from the live Paseo agent")

    observed_agents = observation["agents"]
    if not isinstance(observed_agents, list):
        fail("Paseo observation.agents must be an array")
    observed_by_id = {}
    for index, value in enumerate(observed_agents):
        record = checked_agent(value, f"Paseo observation.agents[{index}]")
        if record["id"] in observed_by_id:
            fail("Paseo observation contains duplicate agent IDs")
        observed_by_id[record["id"]] = record
    runtime_by_id = {agent["id"]: agent for agent in runtime["agents"]}
    if observed_by_id.keys() != runtime_by_id.keys():
        missing = sorted(observed_by_id.keys() - runtime_by_id.keys())
        stale = sorted(runtime_by_id.keys() - observed_by_id.keys())
        fail(f"runtime/Paseo agent coverage differs: missing={missing}, stale={stale}")

    observed_workspaces = observation["workspaces"]
    if not isinstance(observed_workspaces, list):
        fail("Paseo observation.workspaces must be an array")
    workspace_by_id = {}
    for index, value in enumerate(observed_workspaces):
        workspace = object_keys(
            value, {"id", "title", "path", "isolation"}, set(),
            f"Paseo observation.workspaces[{index}]",
        )
        for field in workspace:
            text(workspace[field], f"Paseo observation.workspaces[{index}].{field}")
        if workspace["id"] in workspace_by_id:
            fail("Paseo observation contains duplicate workspace IDs")
        workspace_by_id[workspace["id"]] = workspace

    runtime_workspaces = {workspace["id"]: workspace for workspace in runtime["workspaces"]}
    for agent_id, agent in runtime_by_id.items():
        observed = observed_by_id[agent_id]
        workspace = runtime_workspaces[agent["workspaceId"]]
        live_workspace = workspace_by_id.get(agent["workspaceId"])
        if (
            observed["title"] != agent["title"]
            or observed["provider"] != agent["provider"]
            or observed["effort"] != agent["effort"]
            or observed["modeId"] != agent["modeId"]
            or observed["parentId"] != expected_cto["agentId"]
            or Path(observed["path"]).resolve() != Path(workspace["path"]).resolve()
            or observed["archived"]
            or observed["nativeStatus"] == "closed"
            or (observed["nativeStatus"] == "error" and agent["derivedStatus"] != "error")
            or (
                observed["nativeStatus"] == "running"
                and agent["derivedStatus"] in {"idle", "done", "error"}
            )
        ):
            fail(f"runtime agent differs from live Paseo state: {agent['title']}")
        if live_workspace is None or (
            live_workspace["title"] != workspace["title"]
            or Path(live_workspace["path"]).resolve() != Path(workspace["path"]).resolve()
            or live_workspace["isolation"] != "worktree"
        ):
            fail(f"runtime workspace differs from live Paseo state: {workspace['title']}")
    return observation


def validate_runtime(path: Path, project_root: Path | None = None) -> dict:
    runtime = load_json(path, "runtime checkpoint")
    if runtime.get("schema") != 2:
        fail("runtime.schema must be 2; rebuild legacy state from a fresh inventory")
    object_keys(runtime, TOP_KEYS, set(), "runtime")
    updated = timestamp(runtime["updatedAt"], "runtime.updatedAt")
    project = text(runtime["project"], "runtime.project")
    text(runtime["run"], "runtime.run")

    settings_ref = object_keys(runtime["settings"], {"path", "revision"}, set(), "runtime.settings")
    settings_path = Path(text(settings_ref["path"], "runtime.settings.path"))
    if not settings_path.is_absolute():
        fail("runtime.settings.path must be absolute")
    if (
        not isinstance(settings_ref["revision"], int)
        or isinstance(settings_ref["revision"], bool)
        or settings_ref["revision"] < 1
    ):
        fail("runtime.settings.revision must be a positive integer")
    settings = load_json(settings_path, "SETTINGS.json")
    if settings.get("schema") != 4:
        fail("SETTINGS.json schema must be 4")
    if settings.get("project") != project or settings.get("revision") != settings_ref["revision"]:
        fail("runtime project or settings revision differs from SETTINGS.json")
    charter = settings.get("charter", {})
    roles = charter.get("roleAssignments", {})
    budget = charter.get("fleetBudget", {})
    max_tasks = budget.get("max_live_tasks")
    max_agents = budget.get("max_live_agents")
    if any(
        not isinstance(value, int) or isinstance(value, bool) or value < 1
        for value in (max_tasks, max_agents)
    ):
        fail("SETTINGS.json fleet ceilings must be positive integers")

    plugin = object_keys(runtime["plugin"], {"version", "commit"}, {"tag", "host"}, "runtime.plugin")
    if not VERSION_RE.fullmatch(text(plugin["version"], "runtime.plugin.version")):
        fail("runtime.plugin.version must be the base release version")
    sha(plugin["commit"], "runtime.plugin.commit")

    cto = object_keys(
        runtime["cto"],
        {
            "agentId", "family", "provider", "effort", "sessionStartedAt", "derivedStatus",
            "stateSince", "action",
        },
        {"contextPercent", "lastReportAt", "stateSinceApproximate"},
        "runtime.cto",
    )
    for field in ("agentId", "family", "provider", "effort", "action"):
        text(cto[field], f"runtime.cto.{field}")
    if not FAMILY_RE.fullmatch(cto["family"]):
        fail("runtime.cto.family is not a slug")
    if cto["derivedStatus"] not in STATUSES:
        fail("runtime.cto.derivedStatus is unsupported")
    timestamp(cto["sessionStartedAt"], "runtime.cto.sessionStartedAt")
    if timestamp(cto["stateSince"], "runtime.cto.stateSince") > updated:
        fail("runtime.cto.stateSince is later than updatedAt")
    if "stateSinceApproximate" in cto and not isinstance(cto["stateSinceApproximate"], bool):
        fail("runtime.cto.stateSinceApproximate must be boolean")
    cto_role = roles.get("cto", {})
    for field in ("family", "provider", "effort"):
        if cto.get(field) != cto_role.get(field):
            fail(f"runtime.cto.{field} differs from SETTINGS.json")

    integration = object_keys(
        runtime["integration"], {"branch", "head", "acceptedHead"}, {"originHead", "workspaceId"},
        "runtime.integration",
    )
    text(integration["branch"], "runtime.integration.branch")
    head = sha(integration["head"], "runtime.integration.head")
    accepted_head = sha(integration["acceptedHead"], "runtime.integration.acceptedHead")

    heartbeat = object_keys(
        runtime["heartbeat"], {"id", "name", "status"}, {"createdAt"}, "runtime.heartbeat"
    )
    text(heartbeat["id"], "runtime.heartbeat.id")
    text(heartbeat["name"], "runtime.heartbeat.name")
    if heartbeat["status"] not in {"active", "stopped"}:
        fail("runtime.heartbeat.status must be active or stopped")

    clock = object_keys(
        runtime["releaseClock"],
        {
            "nearestOutcome", "criticalPath", "currentWave", "currentWaveName", "targetWindow",
            "nextObservableFinish", "acceptedMovement",
        },
        set(), "runtime.releaseClock",
    )
    for field, value in clock.items():
        text(value, f"runtime.releaseClock.{field}")

    active_nodes = runtime["activeNodes"]
    if not isinstance(active_nodes, list) or len(active_nodes) > max_tasks:
        fail("runtime.activeNodes is not an array within max_live_tasks")
    active_ids = set()
    for index, node in enumerate(active_nodes):
        node = object_keys(
            node, {"id", "ceremonyMinutes", "auxiliaryReturnsSinceMovement"}, set(),
            f"activeNodes[{index}]",
        )
        node_id = text(node["id"], f"activeNodes[{index}].id")
        if not TASK_RE.fullmatch(node_id) or node_id in active_ids:
            fail(f"activeNodes[{index}].id is invalid or duplicated")
        active_ids.add(node_id)
        natural(node["ceremonyMinutes"], f"activeNodes[{index}].ceremonyMinutes")
        auxiliary_returns = natural(
            node["auxiliaryReturnsSinceMovement"],
            f"activeNodes[{index}].auxiliaryReturnsSinceMovement",
        )
        if auxiliary_returns > 2:
            fail(f"activeNodes[{index}] exceeds the auxiliary-return ceiling")

    agents = runtime["agents"]
    workspaces = runtime["workspaces"]
    if not isinstance(agents, list) or len(agents) > max_agents:
        fail("runtime.agents is not an array within max_live_agents")
    if not isinstance(workspaces, list) or len(workspaces) != len(agents):
        fail("runtime.workspaces must contain exactly one record per live agent")

    agent_ids, titles, role_owners, workspace_ids = set(), set(), set(), set()
    for index, agent in enumerate(agents):
        required = {
            "id", "task", "role", "family", "title", "workspaceId", "baseline", "provider",
            "effort", "modeId", "derivedStatus", "stateSince", "returnSummary",
        }
        agent = object_keys(
            agent, required, {"candidate", "stateSinceApproximate"}, f"agents[{index}]"
        )
        agent_id = text(agent["id"], f"agents[{index}].id")
        task = text(agent["task"], f"agents[{index}].task")
        role = text(agent["role"], f"agents[{index}].role")
        family = text(agent["family"], f"agents[{index}].family")
        title = text(agent["title"], f"agents[{index}].title")
        workspace_id = text(agent["workspaceId"], f"agents[{index}].workspaceId")
        if (
            role not in ROLES or not TASK_RE.fullmatch(task) or not FAMILY_RE.fullmatch(family)
            or title != f"{task}-{family}-{role}"
        ):
            fail(f"agents[{index}] has inconsistent task, family, role, or title")
        assignment = roles.get(role, {})
        if family != assignment.get("family") or agent["provider"] != assignment.get("provider"):
            fail(f"agents[{index}] differs from the {role} assignment")
        configured_effort = assignment.get("effort", "")
        if ".." not in configured_effort and agent["effort"] != configured_effort:
            fail(f"agents[{index}].effort differs from SETTINGS.json")
        for field in ("provider", "effort", "modeId"):
            text(agent[field], f"agents[{index}].{field}")
        sha(agent["baseline"], f"agents[{index}].baseline")
        if "candidate" in agent:
            sha(agent["candidate"], f"agents[{index}].candidate")
        if agent["derivedStatus"] not in STATUSES:
            fail(f"agents[{index}].derivedStatus is unsupported")
        if timestamp(agent["stateSince"], f"agents[{index}].stateSince") > updated:
            fail(f"agents[{index}].stateSince is later than updatedAt")
        if "stateSinceApproximate" in agent and not isinstance(agent["stateSinceApproximate"], bool):
            fail(f"agents[{index}].stateSinceApproximate must be boolean")
        text(agent["returnSummary"], f"agents[{index}].returnSummary", empty=True, limit=1200)
        if (
            task not in active_ids or agent_id in agent_ids or title in titles
            or (task, role) in role_owners or workspace_id in workspace_ids
        ):
            fail(f"agents[{index}] is orphaned or duplicates a live identity")
        agent_ids.add(agent_id)
        titles.add(title)
        role_owners.add((task, role))
        workspace_ids.add(workspace_id)

    workspace_by_id = {}
    workspace_paths, workspace_branches = set(), set()
    for index, workspace in enumerate(workspaces):
        required = {"id", "task", "role", "title", "path", "branch", "baseline", "state"}
        workspace = object_keys(workspace, required, set(), f"workspaces[{index}]")
        workspace_id = text(workspace["id"], f"workspaces[{index}].id")
        for field in ("task", "role", "title", "path", "branch"):
            text(workspace[field], f"workspaces[{index}].{field}")
        sha(workspace["baseline"], f"workspaces[{index}].baseline")
        if (
            workspace["state"] not in {"active", "returned", "preserved", "error"}
            or workspace_id in workspace_by_id or workspace["path"] in workspace_paths
            or workspace["branch"] in workspace_branches
        ):
            fail(f"workspaces[{index}] has an unsupported state or duplicate identity")
        workspace_by_id[workspace_id] = workspace
        workspace_paths.add(workspace["path"])
        workspace_branches.add(workspace["branch"])
    for index, agent in enumerate(agents):
        workspace = workspace_by_id.get(agent["workspaceId"])
        if workspace is None or any(
            workspace[field] != agent[field] for field in ("task", "role", "title", "baseline")
        ):
            fail(f"agents[{index}] does not match its workspace")

    tails = runtime["tails"]
    events = runtime["materialEvents"]
    if not isinstance(tails, list) or len(tails) > 12:
        fail("runtime.tails must contain at most twelve records")
    for index, tail in enumerate(tails):
        text(tail, f"tails[{index}]", limit=1200)
    if not isinstance(events, list) or len(events) > 12:
        fail("runtime.materialEvents must contain at most twelve records")
    for index, event in enumerate(events):
        event = object_keys(event, {"at", "event"}, set(), f"materialEvents[{index}]")
        if timestamp(event["at"], f"materialEvents[{index}].at") > updated:
            fail(f"materialEvents[{index}].at is later than updatedAt")
        text(event["event"], f"materialEvents[{index}].event", limit=500)

    loc_by_title = {}
    observation = None
    if project_root is not None:
        root = project_root.resolve()
        if (
            git(root, "rev-parse", "HEAD") != head
            or git(root, "branch", "--show-current") != integration["branch"]
        ):
            fail("runtime integration branch or head differs from Git")
        git(root, "merge-base", "--is-ancestor", accepted_head, head)
        worktree_paths = {
            str(Path(line[9:]).resolve())
            for line in git(root, "worktree", "list", "--porcelain").splitlines()
            if line.startswith("worktree ")
        }
        missing = sorted(
            str(Path(item["path"]).resolve()) for item in workspaces
            if str(Path(item["path"]).resolve()) not in worktree_paths
        )
        if missing:
            fail(f"runtime contains missing Git worktrees: {', '.join(missing)}")
        if str(root) in {str(Path(item["path"]).resolve()) for item in workspaces}:
            fail("an agent workspace cannot be the integration worktree")
        for agent in agents:
            workspace = workspace_by_id[agent["workspaceId"]]
            workspace_root = Path(workspace["path"])
            if agent["role"] != "builder" and git(workspace_root, "status", "--porcelain"):
                fail(f"report-only workspace is dirty: {agent['title']}")
            additions = deletions = 0
            if agent["role"] == "builder":
                for line in git(workspace_root, "diff", "--numstat", agent["baseline"], "--").splitlines():
                    fields = line.split("\t", 2)
                    if len(fields) >= 2 and fields[0].isdigit() and fields[1].isdigit():
                        additions += int(fields[0])
                        deletions += int(fields[1])
            def amount(prefix: str, value: int) -> str:
                if value < 1000:
                    return f"{prefix}{value}"
                rounded = (value + 50) // 100
                return f"{prefix}{rounded // 10}.{rounded % 10}k"
            loc_by_title[agent["title"]] = (
                "—" if agent["role"] != "builder" or additions + deletions == 0
                else f"{amount('+', additions)} {amount('-', deletions)}"
            )
        observation = validate_paseo_observation(
            runtime, collect_paseo_observation(runtime), root, updated
        )

    return {
        "runtime": runtime, "settings": settings, "loc": loc_by_title,
        "observation": observation,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("--project-root", type=Path)
    args = parser.parse_args()
    try:
        state = validate_runtime(args.checkpoint, args.project_root)
    except InvalidRuntime as error:
        print(f"runtime check: {error}", file=sys.stderr)
        return 1
    runtime = state["runtime"]
    print(
        f"runtime check: valid schema 2 with {len(runtime['activeNodes'])} active nodes "
        f"and {len(runtime['agents'])} live agents"
        f"{' verified against Paseo and Git' if args.project_root else ''}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
