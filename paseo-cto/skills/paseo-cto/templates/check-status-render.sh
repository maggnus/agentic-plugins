#!/usr/bin/env bash
# Validate the deterministic current-wave status snapshot.

set -euo pipefail

status_file=${STATUS_FILE:-STATUS.md}
plan_file=${PLAN_FILE:-}
acceptance_file=${ACCEPTANCE_FILE:-}

if [[ ! -f "$status_file" ]]; then
  printf 'status render check: missing status file: %s\n' "$status_file" >&2
  exit 1
fi

if [[ -n "$plan_file" || -n "$acceptance_file" ]]; then
  if [[ -z "$plan_file" || -z "$acceptance_file" ]]; then
    printf 'status render check: PLAN_FILE and ACCEPTANCE_FILE must be supplied together\n' >&2
    exit 1
  fi
  if [[ ! -f "$plan_file" || ! -f "$acceptance_file" ]]; then
    printf 'status render check: plan or acceptance file is missing\n' >&2
    exit 1
  fi
fi

python3 - "$status_file" "$plan_file" "$acceptance_file" <<'PY'
from collections import Counter
from pathlib import Path
import re
import sys


def fail(message):
    print(f"status render check: {message}", file=sys.stderr)
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
lines = status_path.read_text(encoding="utf-8").splitlines()

if len(lines) < 8:
    fail("snapshot is incomplete")

if not re.fullmatch(r"# \S(?:.*\S)? update \d{4}-\d{2}-\d{2} \d{2}:\d{2} \S+", lines[0]):
    fail("line 1 must be '# <project> update <YYYY-MM-DD HH:MM TZ>'")

wave_match = re.fullmatch(r"Wave: (\S+) (\S(?:.*\S)?)", lines[1])
if not wave_match:
    fail("line 2 must be 'Wave: <wave-id> <wave name>'")
wave_id, wave_name = wave_match.groups()

cards_match = re.fullmatch(r"Cards: (\d+)/(\d+)", lines[2])
if not cards_match:
    fail("line 3 must be 'Cards: <done>/<total>'")
done, total = map(int, cards_match.groups())
if done > total:
    fail("Cards done cannot exceed total")

expected_prefix = [
    "",
    "## Active fleet",
    "| Agent | Task | Status | Time | LOC |",
    "| --- | --- | --- | --- | --- |",
]
if lines[3:7] != expected_prefix:
    fail("snapshot heading or fleet table header does not match the required shape")

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
        fail("an absent current wave must render 'Wave: — —' and 'Cards: 0/0'")
elif wave_name == "—":
    fail("a current wave requires a name")

if not plan_arg:
    print(f"status render check: valid snapshot with {len(fleet_rows)} fleet rows")
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
    card_heading = re.match(r"^####\s+(\S+)\s+[—-]\s+", line)
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
    f"status render check: valid snapshot with {len(fleet_rows)} fleet rows; "
    f"Cards {done}/{total}"
)
PY
