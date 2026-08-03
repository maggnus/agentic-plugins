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

python3 - "$fleet_file" "$plan_file" "$acceptance_file" "$expected_version" "$work_root" \
  "$script_dir" <<'PY'
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

expected_prefix = [
    "",
    "| Agent | Task | Status | Time | LOC |",
    "| --- | --- | --- | --- | --- |",
]
if lines[4:7] != expected_prefix:
    fail("snapshot spacing or fleet table header does not match the required shape")

fleet_rows = lines[7:]
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
agents = []
for row in fleet_rows:
    row_cells = cells(row)
    if len(row_cells) != 5 or any(not value for value in row_cells):
        fail("every fleet row must contain five non-empty cells")
    agent = token(row_cells[0])
    status = token(row_cells[2])
    agents.append(agent)
    if status not in allowed_statuses:
        fail(f"unsupported derived status token: {status}")

if not re.fullmatch(r"cto-[a-z0-9][a-z0-9-]*", agents[0]):
    fail("the first fleet row must be the CTO")
if len(set(agents)) != len(agents):
    fail("fleet agent titles must be unique")

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
