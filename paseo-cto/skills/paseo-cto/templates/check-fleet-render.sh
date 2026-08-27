#!/usr/bin/env bash
# Validate the deterministic current-wave fleet snapshot.
#
# The snapshot is the runtime render the heartbeat publishes: FLEET.md beside the runtime
# checkpoint. It is a different artifact from the work index docs/work/STATUS.md, which work.py
# generates from the permanent task files.

set -euo pipefail

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
fleet_file=${FLEET_FILE:-FLEET.md}
work_root=${WORK_ROOT:-}
plan_file=${PLAN_FILE:-}
acceptance_file=${ACCEPTANCE_FILE:-}
expected_version=${PASEO_CTO_VERSION:-}
runtime_file=${RUNTIME_FILE:-}
project_root=${PROJECT_ROOT:-}

if [[ ! -f "$fleet_file" ]]; then
  printf 'fleet render check: missing fleet snapshot: %s\n' "$fleet_file" >&2
  exit 1
fi

if [[ -n "$work_root" && -n "$plan_file" ]]; then
  printf 'fleet render check: supply WORK_ROOT or PLAN_FILE, not both\n' >&2
  exit 1
fi

if [[ -n "$plan_file" || -n "$acceptance_file" ]]; then
  if [[ -z "$plan_file" || -z "$acceptance_file" ]]; then
    printf 'fleet render check: PLAN_FILE and ACCEPTANCE_FILE must be supplied together\n' >&2
    exit 1
  fi
  if [[ ! -f "$plan_file" || ! -f "$acceptance_file" ]]; then
    printf 'fleet render check: plan or acceptance file is missing\n' >&2
    exit 1
  fi
fi

if [[ -n "$runtime_file" && ! -f "$runtime_file" ]]; then
  printf 'fleet render check: runtime checkpoint is missing: %s\n' "$runtime_file" >&2
  exit 1
fi
if [[ -n "$project_root" && -z "$runtime_file" ]] || [[ -n "$runtime_file" && -z "$project_root" ]]; then
  printf 'fleet render check: RUNTIME_FILE and PROJECT_ROOT must be supplied together\n' >&2
  exit 1
fi

python3 - "$fleet_file" "$plan_file" "$acceptance_file" "$expected_version" "$work_root" \
  "$script_dir" "$runtime_file" "$project_root" <<'PY'
from collections import Counter
from pathlib import Path
import re
import sys


def fail(message):
    print(f"fleet render check: {message}", file=sys.stderr)
    raise SystemExit(1)


def cells(line):
    if not line.startswith("|") or not line.endswith("|"):
        fail(f"malformed Markdown table row: {line}")
    return [cell.strip() for cell in line[1:-1].split("|")]


def token(value):
    return value.strip().strip("`").strip()


status_path = Path(sys.argv[1])
plan_arg = sys.argv[2]
acceptance_arg = sys.argv[3]
expected_version = sys.argv[4]
work_root = sys.argv[5]
tools_dir = sys.argv[6]
runtime_arg = sys.argv[7]
project_root_arg = sys.argv[8]
if expected_version.startswith("v"):
    expected_version = expected_version[1:]
lines = status_path.read_text(encoding="utf-8").splitlines()

if len(lines) < 8:
    fail("snapshot is incomplete")

if not re.fullmatch(r"# Update \d{4}-\d{2}-\d{2} \d{2}:\d{2} \S+", lines[0]):
    fail("line 1 must be '# Update <YYYY-MM-DD HH:MM TZ>'")

identity_match = re.fullmatch(
    r"paseo-cto: v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)"
    r" \| Model: ([^\s|()]+/[^\s|()]+) \(([^\s|()]+)\)"
    r"(?: \| Context: \d+(?:\.\d+)?[kKmM]\((?:100|[1-9]?\d)%\))?"
    r" \| Session: (?:\d+h(?:[0-5]?\dm)?|\d+m)",
    lines[1],
)
if not identity_match:
    fail(
        "line 2 must identify paseo-cto version, provider/model with effort, optional context, and session time"
    )
plugin_version = identity_match.group(1)
if expected_version and plugin_version != expected_version:
    fail(
        f"paseo-cto version v{plugin_version} differs from expected v{expected_version}"
    )

wave_match = re.fullmatch(r"Wave: \[([^\[\]\s]+)\] (\S(?:.*\S)?)", lines[2])
if not wave_match:
    fail("line 3 must be 'Wave: [<wave-id>] <wave name>'")
wave_id, wave_name = wave_match.groups()

cards_match = re.fullmatch(r"Cards: (\d+)/(\d+)", lines[3])
if not cards_match:
    fail("line 4 must be 'Cards: <done>/<total>'")
done, total = map(int, cards_match.groups())
if done > total:
    fail("Cards done cannot exceed total")

progress = re.fullmatch(
    r"Nodes: (\d+) accepted / (\d+) merged / (\d+) in flight / (\d+) remaining · "
    r"(\d+(?:\.\d)?%) by risk weight · round (—|\d+m) · proof returns (—|\d+%)",
    lines[4],
)
if not progress:
    fail(
        "line 5 must be 'Nodes: <a> accepted / <m> merged / <f> in flight / <r> remaining · "
        "<p>% by risk weight · round <n>m · proof returns <n>%'"
    )
if int(progress.group(2)) > int(progress.group(1)):
    fail("merged nodes cannot exceed accepted nodes")

expected_prefix = [
    "",
    "| Agent | Task | Status | Time | LOC |",
    "| --- | --- | --- | --- | --- |",
]
if lines[5:8] != expected_prefix:
    fail("snapshot spacing or fleet table header does not match the required shape")

fleet_rows = lines[8:]
if not fleet_rows or any(not row.strip() for row in fleet_rows):
    fail("fleet table must contain consecutive rows and no trailing content")

allowed_statuses = {
    "running",
    "waiting",
    "blocked",
    "idle",
    "reviewing",
    "rework",
    "stalled",
    "error",
    "done",
}
fleet = []
for index, row in enumerate(fleet_rows):
    row_cells = cells(row)
    if len(row_cells) != 5 or any(not value for value in row_cells):
        fail("every fleet row must contain five non-empty cells")
    agent_match = re.fullmatch(r"`([^`]+)`", row_cells[0])
    status_match = re.fullmatch(r"`([^`]+)`", row_cells[2])
    task_match = re.fullmatch(r"`([^`]+)` (\S(?:.*\S)?)", row_cells[1])
    if not agent_match or not status_match or not task_match:
        fail("Agent, Task, and Status must use the exact backtick-wrapped shape")
    agent = agent_match.group(1)
    task_id, task_title = task_match.groups()
    status = status_match.group(1)
    if status not in allowed_statuses:
        fail(f"unsupported derived status token: {status}")
    if not re.fullmatch(r"~?(?:\d+h(?:[0-5]?\dm)?|\d+m)", row_cells[3]):
        fail(f"invalid Time value for {agent}: {row_cells[3]}")
    if row_cells[4] != "—" and not re.fullmatch(
        r"(?:\+\d{1,3}|\+[1-9]\d*\.\dk) (?:-\d{1,3}|-[1-9]\d*\.\dk)", row_cells[4]
    ):
        fail(f"invalid LOC value for {agent}: {row_cells[4]}")
    if index == 0:
        if task_id != "—":
            fail("the CTO Task token must be —")
    else:
        prefix = f"{task_id}-"
        if task_id == "—" or not agent.startswith(prefix) or not re.fullmatch(
            r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-(?:builder|reviewer|researcher)",
            agent[len(prefix):],
        ):
            fail(f"agent title does not derive from its task and role: {agent}")
    fleet.append({
        "agent": agent, "task": task_id, "title": task_title, "status": status,
        "time": row_cells[3], "loc": row_cells[4],
    })

agents = [entry["agent"] for entry in fleet]
if not re.fullmatch(r"cto-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", agents[0]):
    fail("the first fleet row must be the CTO")
if len(set(agents)) != len(agents):
    fail("fleet agent titles must be unique")

if runtime_arg:
    sys.dont_write_bytecode = True
    sys.path.insert(0, tools_dir)
    import check_runtime

    try:
        validated = check_runtime.validate_runtime(
            Path(runtime_arg), Path(project_root_arg) if project_root_arg else None
        )
    except check_runtime.InvalidRuntime as error:
        fail(str(error))
    runtime = validated["runtime"]
    expected_cto = f"cto-{runtime['cto']['family']}"
    if runtime["plugin"]["version"] != plugin_version:
        fail("fleet plugin version differs from runtime")
    if identity_match.group(2) != runtime["cto"]["provider"] or identity_match.group(3) != runtime["cto"]["effort"]:
        fail("fleet CTO provider or effort differs from runtime")
    clock = runtime["releaseClock"]
    if (wave_id, wave_name) != (clock["currentWave"], clock["currentWaveName"]):
        fail("fleet current wave differs from runtime")
    updated = check_runtime.timestamp(runtime["updatedAt"], "runtime.updatedAt")
    if lines[0][9:25] != updated.strftime("%Y-%m-%d %H:%M"):
        fail("fleet update minute differs from runtime.updatedAt")

    def elapsed(record):
        since = check_runtime.timestamp(record["stateSince"], "stateSince")
        minutes = int((updated - since).total_seconds() // 60)
        hours, remainder = divmod(minutes, 60)
        value = f"{hours}h{remainder}m" if hours and remainder else f"{hours}h" if hours else f"{minutes}m"
        return f"~{value}" if record.get("stateSinceApproximate") else value

    if fleet[0]["agent"] != expected_cto or fleet[0]["status"] != runtime["cto"]["derivedStatus"]:
        fail("CTO identity or status differs from runtime")
    if fleet[0]["title"] != runtime["cto"]["action"] or fleet[0]["time"] != elapsed(runtime["cto"]):
        fail("CTO action or state time differs from runtime")
    runtime_agents = {agent["title"]: agent for agent in runtime["agents"]}
    rendered_agents = {entry["agent"]: entry for entry in fleet[1:]}
    if rendered_agents.keys() != runtime_agents.keys():
        missing = sorted(runtime_agents.keys() - rendered_agents.keys())
        extra = sorted(rendered_agents.keys() - runtime_agents.keys())
        fail(f"fleet/runtime agent coverage differs: missing={missing}, extra={extra}")
    for title, agent in runtime_agents.items():
        rendered = rendered_agents[title]
        if (
            rendered["task"] != agent["task"] or rendered["status"] != agent["derivedStatus"]
            or rendered["time"] != elapsed(agent) or rendered["loc"] != validated["loc"][title]
        ):
            fail(f"fleet task, status, time, or LOC differs from runtime for {title}")

if wave_id == "—":
    if wave_name != "—" or (done, total) != (0, 0):
        fail("an absent current wave must render 'Wave: [—] —' and 'Cards: 0/0'")
elif wave_name == "—":
    fail("a current wave requires a name")

if work_root:
    sys.dont_write_bytecode = True
    sys.path.insert(0, tools_dir)
    import work as worklib

    schema = worklib.load_schema(Path(tools_dir) / "work-schema.json")
    nodes, load_errors = worklib.load_tree(schema, Path(work_root))
    if load_errors:
        fail("; ".join(load_errors))
    node_by_id = {node.id: node for node in nodes}
    for entry in fleet[1:]:
        node = node_by_id.get(entry["task"])
        if node is None or node.title != entry["title"]:
            fail(f"fleet task is absent from the work tree or has the wrong title: {entry['task']}")
    if wave_id == "—":
        started = [node for node in nodes if node.kind == "card"
                   and node.state in schema["open_states"]]
        if started:
            fail("a snapshot with open cards must identify the current wave")
        if (done, total) != (0, 0):
            fail("an absent current wave renders 'Cards: 0/0'")
    else:
        wave = next((node for node in nodes
                     if node.kind == "wave" and node.id == wave_id), None)
        if wave is None:
            fail(f"current wave {wave_id} has no file in the work tree")
        if wave.title != wave_name:
            fail(f"wave name does not match the work tree: expected '{wave.title}'")
        cards = [node for node in nodes if node.kind == "card"
                 and worklib.owning_wave(schema, node.id) == wave_id]
        expected_done = sum(1 for card in cards if card.state == "accepted")
        if (done, total) != (expected_done, len(cards)):
            fail(
                "Cards count disagrees with the work tree: "
                f"rendered {done}/{total}, expected {expected_done}/{len(cards)}"
            )
    print(
        f"fleet render check: valid snapshot with {len(fleet_rows)} fleet rows; "
        f"Cards {done}/{total}"
    )
    raise SystemExit(0)

if not plan_arg:
    print(f"fleet render check: valid snapshot with {len(fleet_rows)} fleet rows")
    raise SystemExit(0)

plan_lines = Path(plan_arg).read_text(encoding="utf-8").splitlines()
acceptance_lines = Path(acceptance_arg).read_text(encoding="utf-8").splitlines()

wave_titles = {}
current_heading_wave = None
current_cards = []
all_plan_ids = []
for line in plan_lines:
    wave_heading = re.match(r"^###\s+(\S+)\s+[—-]\s+(.+?)\s*$", line)
    if wave_heading:
        current_heading_wave = token(wave_heading.group(1))
        wave_titles[current_heading_wave] = wave_heading.group(2).strip()
        continue
    card_heading = re.match(r"^####\s+\[(?: |~|x)\]\s+(\S+)\s+[—-]\s+", line)
    if card_heading:
        card_id = token(card_heading.group(1))
        all_plan_ids.append(card_id)
        if current_heading_wave is not None:
            current_cards.append((card_id, current_heading_wave))

duplicate_plan_ids = [card for card, count in Counter(all_plan_ids).items() if count > 1]
if duplicate_plan_ids:
    fail(f"duplicate current plan card IDs: {', '.join(sorted(duplicate_plan_ids))}")

header_index = None
acceptance_header = []
for index, line in enumerate(acceptance_lines):
    if line.startswith("|"):
        candidate = cells(line)
        if "Card" in candidate and "Wave" in candidate:
            header_index = index
            acceptance_header = candidate
            break
if header_index is None:
    fail("acceptance table with Card and Wave columns was not found")

card_column = acceptance_header.index("Card")
wave_column = acceptance_header.index("Wave")
accepted_pairs = []
for line in acceptance_lines[header_index + 2 :]:
    if not line.startswith("|"):
        break
    row = cells(line)
    if len(row) != len(acceptance_header):
        fail("acceptance row has the wrong column count")
    accepted_pairs.append((token(row[card_column]), token(row[wave_column])))

accepted_ids = [card for card, _ in accepted_pairs]
duplicate_accepted_ids = [card for card, count in Counter(accepted_ids).items() if count > 1]
if duplicate_accepted_ids:
    fail(f"duplicate acceptance card IDs: {', '.join(sorted(duplicate_accepted_ids))}")

overlap = set(all_plan_ids) & set(accepted_ids)
if overlap:
    fail(f"card IDs exist in both current plan and acceptance: {', '.join(sorted(overlap))}")

if wave_id == "—":
    expected_done = 0
    expected_total = 0
    if all_plan_ids:
        fail("a snapshot with current plan cards must identify the current wave")
else:
    if wave_id in wave_titles and wave_titles[wave_id] != wave_name:
        fail(
            f"wave name does not match the plan heading: expected '{wave_titles[wave_id]}'"
        )
    accepted_for_wave = {card for card, wave in accepted_pairs if wave == wave_id}
    current_for_wave = {card for card, wave in current_cards if wave == wave_id}
    expected_done = len(accepted_for_wave)
    expected_total = len(accepted_for_wave | current_for_wave)

if (done, total) != (expected_done, expected_total):
    fail(
        "Cards count disagrees with plan and acceptance truth: "
        f"rendered {done}/{total}, expected {expected_done}/{expected_total}"
    )

print(
    f"fleet render check: valid snapshot with {len(fleet_rows)} fleet rows; "
    f"Cards {done}/{total}"
)
PY
