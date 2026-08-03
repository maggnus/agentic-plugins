#!/usr/bin/env bash
# Regression tests for the permanent-file work tree: generator, validator and scaffolder.

set -euo pipefail

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
plugin_root=$(CDPATH='' cd -- "$script_dir/.." && pwd)
templates="$plugin_root/skills/paseo-cto/templates"
work="$templates/work.py"
fixture="$plugin_root/tests/fixtures/work-tree"
scratch=$(mktemp -d "${TMPDIR:-/tmp}/paseo-cto-work.XXXXXX")
trap 'rm -rf "$scratch"' EXIT INT TERM

passes=0
tree="$scratch/tree"

fresh() {
  rm -rf "$tree"
  cp -R "$fixture" "$tree"
}

regenerate() {
  python3 "$work" --root "$tree" status > /dev/null
}

expect_pass() {
  label=$1
  shift
  if "$@" > "$scratch/output" 2>&1; then
    passes=$((passes + 1))
    return
  fi
  printf 'work test: expected pass: %s\n' "$label" >&2
  cat "$scratch/output" >&2
  exit 1
}

expect_fail() {
  label=$1
  pattern=$2
  shift 2
  if "$@" > "$scratch/output" 2>&1; then
    printf 'work test: expected failure: %s\n' "$label" >&2
    cat "$scratch/output" >&2
    exit 1
  fi
  if ! grep -q -- "$pattern" "$scratch/output"; then
    printf 'work test: %s failed for the wrong reason (wanted %s)\n' "$label" "$pattern" >&2
    cat "$scratch/output" >&2
    exit 1
  fi
  passes=$((passes + 1))
}

expect_row() {
  label=$1
  pattern=$2
  if grep -q -- "$pattern" "$tree/STATUS.md"; then
    passes=$((passes + 1))
    return
  fi
  printf 'work test: expected row: %s\n' "$label" >&2
  grep -n '^|' "$tree/STATUS.md" >&2
  exit 1
}

set_field() {
  file=$1
  key=$2
  value=$3
  python3 - "$file" "$key" "$value" <<'PY'
import re, sys
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path, encoding="utf-8").read()
head, sep, body = text.partition("\n---\n")
head = re.sub(rf"(?m)^{re.escape(key)}:.*$", f"{key}: {value}".rstrip(), head, count=1)
open(path, "w", encoding="utf-8").write(head + sep + body)
PY
}

# ---------------------------------------------------------------------------
# the fixture itself is the baseline: a valid tree whose STATUS.md is current
# ---------------------------------------------------------------------------

fresh
expect_pass "fixture tree validates" python3 "$work" --root "$tree" check

# 1. a planned task renders as ready
expect_row "planned task renders [ ]" '| `\[ \]` | \[`W1-LF-03b`\]'

# 2. an active task shows its start and its last significant update with the active duration
expect_row "active task shows start and time" \
  '\[`W1-LF-04a`\].*| 03/08 18:40 | 03/08 20:55 (2h15m) |'

# 3. an accepted task shows its closure commit and completion moment
expect_row "accepted task shows commit and completion" \
  '`\[x\]` | \[`W1-LF-03a`\].*\[`a14fc290`\].*| 01/08 12:05 (1h45m) |'

# 5. a paused task keeps the start it first had
expect_row "paused task keeps its original start" \
  '`\[=\]` | \[`W1-LF-04d`\].*| 02/08 14:00 |'

# 6. a returned task stays active and produces no new token
expect_row "returned task stays active" '`\[~\]` | \[`W1-LF-04e`\]'

# 15. duration counts active work, not the calendar span across a pause
expect_row "duration excludes the recorded pause" '\[`W1-LF-04d`\].*(45m) |'

# 7. an accepted task stays at the path it was created at
expect_pass "accepted task file stays in place" test -f "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03a.md"
expect_pass "accepted task keeps its state in that file" \
  grep -q '^state: accepted$' "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03a.md"

# 9. an open follow-up child does not reopen an honestly accepted card
expect_pass "open follow-up leaves the accepted card closed" \
  grep -q '^state: accepted$' "$tree/waves/W1/W1-LF-03/CARD.md"

# 18. every identifier in the index links to a file that exists
expect_pass "every status link resolves" python3 - "$tree" <<'PY'
import pathlib, re, sys
root = pathlib.Path(sys.argv[1])
missing = [
    target
    for target in re.findall(r"\]\(([^)]+)\)", (root / "STATUS.md").read_text(encoding="utf-8"))
    if not target.startswith("http") and not (root / target).is_file()
]
raise SystemExit("missing: " + ", ".join(missing) if missing else 0)
PY

# 14. the row order is the tree order, independent of filesystem traversal
expect_pass "row order is deterministic tree order" python3 - "$tree" <<'PY'
import pathlib, re, sys
root = pathlib.Path(sys.argv[1])
ids = [
    re.sub(r"[^`]*`([^`]+)`.*", r"\1", line.split("|")[2])
    for line in (root / "STATUS.md").read_text(encoding="utf-8").split("\n")
    if line.startswith("| `[")
]
expected = [
    "W1-LF-03", "W1-LF-03a", "W1-LF-03b",
    "W1-LF-04", "W1-LF-04a", "W1-LF-04b", "W1-LF-04c", "W1-LF-04c.1", "W1-LF-04c.2",
    "W1-LF-04d", "W1-LF-04e",
    "W2-CF-01", "W2-CF-01a",
]
raise SystemExit(f"order was {ids}" if ids != expected else 0)
PY

# the wave overview carries one row per wave with its accepted card count
expect_pass "waves overview lists every wave with its progress" python3 - "$tree" <<'PY'
import pathlib, sys
root = pathlib.Path(sys.argv[1])
lines = (root / "WAVES.md").read_text(encoding="utf-8").split("\n")
waves = [line for line in lines if line.startswith("| `[")]
totals = [line for line in lines if "**Total**" in line]
expected = [
    "| `[~]` | [`W1`](waves/W1/WAVE.md) | Launch readiness |",
    "| `[ ]` | [`W2`](waves/W2/WAVE.md) | Recovery readiness |",
]
problems = []
if len(waves) != 2 or not all(row.startswith(head) for row, head in zip(waves, expected)):
    problems.append(f"wave rows were {waves}")
if [row.rsplit("|", 3)[1].strip() for row in waves] != ["1/2", "0/1"]:
    problems.append(f"card counts were {waves}")
if [row.rsplit("|", 2)[1].strip() for row in waves] != ["50%", "0%"]:
    problems.append(f"percentages were {waves}")
if len(totals) != 1 or totals[0] != lines[len(lines) - 2]:
    problems.append("the total row is not the last row")
elif totals[0].rsplit("|", 3)[1].strip() != "1/3" or totals[0].rsplit("|", 2)[1].strip() != "33%":
    problems.append(f"total row was {totals[0]}")
raise SystemExit("; ".join(problems) if problems else 0)
PY

# the percentage rounds half up from integers, so it never depends on float repair
expect_pass "percentage rounding is exact" python3 - "$templates" <<'PY'
import importlib.util, pathlib, sys
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("work", pathlib.Path(sys.argv[1]) / "work.py")
work = importlib.util.module_from_spec(spec)
spec.loader.exec_module(work)
cases = {(0, 0): "—", (0, 4): "0%", (1, 3): "33%", (2, 3): "67%", (1, 2): "50%",
         (3, 6): "50%", (95, 156): "61%", (156, 156): "100%"}
wrong = {case: work.render_percent(*case, "—") for case in cases
         if work.render_percent(*case, "—") != cases[case]}
raise SystemExit(f"wrong: {wrong}" if wrong else 0)
PY

# 20. regenerating an unchanged tree rewrites nothing
expect_pass "regeneration is a no-op" env - PATH="$PATH" bash -c \
  'digest() { md5 -q "$1" 2>/dev/null || md5sum "$1"; };
   before="$(digest "$2/STATUS.md")$(digest "$2/WAVES.md")";
   test "$(python3 "$1" --root "$2" status | grep -c "is current")" = "2";
   after="$(digest "$2/STATUS.md")$(digest "$2/WAVES.md")";
   test "$before" = "$after"' _ "$work" "$tree"

# ---------------------------------------------------------------------------
# refusals
# ---------------------------------------------------------------------------

# 4. a blocked task without a blocker
fresh
set_field "$tree/waves/W1/W1-LF-04/tasks/W1-LF-04b.md" blocker ""
regenerate
expect_fail "blocked task without blocker" "must name its blocker" \
  python3 "$work" --root "$tree" check

# 16. a trigger-gated task without a return trigger
fresh
set_field "$tree/waves/W1/W1-LF-04/tasks/W1-LF-04c/TASK.md" return_trigger ""
regenerate
expect_fail "trigger task without return trigger" "must name its return trigger" \
  python3 "$work" --root "$tree" check

# a paused task without a pause reason
fresh
set_field "$tree/waves/W1/W1-LF-04/tasks/W1-LF-04d.md" pause_reason ""
regenerate
expect_fail "paused task without pause reason" "must name its pause reason" \
  python3 "$work" --root "$tree" check

# 8. a card cannot close while a required child is open
fresh
set_field "$tree/waves/W1/W1-LF-04/CARD.md" state accepted
set_field "$tree/waves/W1/W1-LF-04/CARD.md" accepted_at "2026-08-03T21:00:00+08:00"
regenerate
expect_fail "card closed with an open required task" "while required task W1-LF-04a" \
  python3 "$work" --root "$tree" check

# a wave cannot close while a required card is open
fresh
set_field "$tree/waves/W2/WAVE.md" state accepted
set_field "$tree/waves/W2/WAVE.md" accepted_at "2026-08-03T22:00:00+08:00"
regenerate
expect_fail "wave closed with an open required card" "while required card W2-CF-01" \
  python3 "$work" --root "$tree" check

# an accepted task with an open acceptance checklist and no deliberate partial
fresh
python3 - "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03a.md" <<'PY'
import sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
open(path, "w", encoding="utf-8").write(text.replace("- [x] Removing", "- [ ] Removing", 1))
PY
regenerate
expect_fail "accepted task with an open acceptance item" "acceptance checklist still has" \
  python3 "$work" --root "$tree" check

# an accepted task without durable evidence
fresh
python3 - "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03a.md" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
head, sep, body = text.partition("\n---\n")
head = re.sub(r"(?m)^evidence:\n(  - .*\n)+", "evidence:\n", head)
open(path, "w", encoding="utf-8").write(head + sep + body)
PY
regenerate
expect_fail "accepted task without evidence" "must record durable evidence" \
  python3 "$work" --root "$tree" check

# the explicit Git waiver is accepted where a link is not available
fresh
python3 - "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03a.md" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
head, sep, body = text.partition("\n---\n")
head = re.sub(r"(?m)^evidence:\n(  - .*\n)+", "evidence: [Git]\n", head)
open(path, "w", encoding="utf-8").write(head + sep + body)
PY
regenerate
expect_pass "accepted task with the explicit Git waiver" python3 "$work" --root "$tree" check

# an evidence entry that is neither a link nor the waiver
fresh
python3 - "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03a.md" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
head, sep, body = text.partition("\n---\n")
head = re.sub(r"(?m)^evidence:\n(  - .*\n)+", "evidence: [see the CI run]\n", head)
open(path, "w", encoding="utf-8").write(head + sep + body)
PY
regenerate
expect_fail "evidence that is not a Markdown link" "is not a Markdown link" \
  python3 "$work" --root "$tree" check

# 19. a commit reference that is not an immutable full SHA
fresh
set_field "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03a.md" closure_commit \
  "https://github.com/example/project/commit/a14fc290"
regenerate
expect_fail "short commit reference" "full 40-character SHA" \
  python3 "$work" --root "$tree" check

# a branch link where an immutable commit link is required
fresh
python3 - "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03a.md" <<'PY'
import sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
text = text.replace(
    "blob/a14fc2900000000000000000000000000000abcd/docs/evidence/W1-LF-03a.md",
    "blob/main/docs/evidence/W1-LF-03a.md",
)
open(path, "w", encoding="utf-8").write(text)
PY
regenerate
expect_fail "branch link instead of a commit" "not to an immutable commit" \
  python3 "$work" --root "$tree" check

# 10. a dependency cycle
fresh
set_field "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03a.md" depends_on "[W1-LF-04a]"
regenerate
expect_fail "dependency cycle" "dependency cycle" python3 "$work" --root "$tree" check

# a dependency that has no file
fresh
set_field "$tree/waves/W2/W2-CF-01/tasks/W2-CF-01a.md" depends_on "[W9-ZZ-99a]"
regenerate
expect_fail "dependency without a file" "has no file" python3 "$work" --root "$tree" check

# 11. a duplicate identifier
fresh
cp "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03b.md" "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03c.md"
expect_fail "duplicate identifier" "duplicate id W1-LF-03b" python3 "$work" --root "$tree" check

# 12. an identifier whose wave prefix disagrees with its directory
fresh
mkdir -p "$tree/waves/W2/W2-CF-01/tasks"
sed -e 's/^id: W1-LF-03b$/id: W1-LF-04f/' -e 's/^card: W1-LF-03$/card: W1-LF-04/' \
  -e 's/^# W1-LF-03b/# W1-LF-04f/' \
  "$tree/waves/W1/W1-LF-03/tasks/W1-LF-03b.md" > "$tree/waves/W2/W2-CF-01/tasks/W1-LF-04f.md"
expect_fail "identifier under the wrong wave directory" "the file is somewhere else" \
  python3 "$work" --root "$tree" check

# an unknown state value
fresh
set_field "$tree/waves/W2/W2-CF-01/tasks/W2-CF-01a.md" state "in-progress"
expect_fail "unknown state" "unknown state" python3 "$work" --root "$tree" check

# an unknown maturity
fresh
set_field "$tree/waves/W2/W2-CF-01/tasks/W2-CF-01a.md" maturity "IMPLEMENTATION"
expect_fail "unknown maturity" "unknown maturity" python3 "$work" --root "$tree" check

# a task with no maturity at all
fresh
python3 - "$tree/waves/W2/W2-CF-01/tasks/W2-CF-01a.md" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
open(path, "w", encoding="utf-8").write(re.sub(r"(?m)^maturity: .*\n", "", text, count=1))
PY
expect_fail "task without maturity" "required field 'maturity' is missing" \
  python3 "$work" --root "$tree" check

# an unknown metadata field
fresh
python3 - "$tree/waves/W2/W2-CF-01/tasks/W2-CF-01a.md" <<'PY'
import sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
open(path, "w", encoding="utf-8").write(text.replace("state: ready", "priority: high\nstate: ready", 1))
PY
expect_fail "unknown metadata field" "unknown field" python3 "$work" --root "$tree" check

# a negative duration
fresh
set_field "$tree/waves/W1/W1-LF-04/tasks/W1-LF-04d.md" duration_minutes "-5"
expect_fail "negative duration" "is negative" python3 "$work" --root "$tree" check

# a malformed timestamp
fresh
set_field "$tree/waves/W1/W1-LF-04/tasks/W1-LF-04a.md" started_at "03/08 18:40"
expect_fail "malformed timestamp" "is not an ISO 8601 time" python3 "$work" --root "$tree" check

# a title that names an activity instead of an outcome
fresh
python3 - "$tree/waves/W2/W2-CF-01/tasks/W2-CF-01a.md" <<'PY'
import sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
open(path, "w", encoding="utf-8").write(
    text.replace("# W2-CF-01a — Recovery drill fails on partial state",
                 "# W2-CF-01a — Work on the recovery drill", 1)
)
PY
expect_fail "activity title" "names an activity" python3 "$work" --root "$tree" check

# a section set that does not match the schema
fresh
python3 - "$tree/waves/W2/W2-CF-01/tasks/W2-CF-01a.md" <<'PY'
import sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
open(path, "w", encoding="utf-8").write(text.replace("## Guardrails", "## Notes", 1))
PY
expect_fail "wrong section set" "sections must be exactly" python3 "$work" --root "$tree" check

# a current-state section that has turned into a chronology
fresh
python3 - "$tree/waves/W1/W1-LF-04/tasks/W1-LF-04a.md" <<'PY'
import sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
chronology = "## Current state\n\n" + "\n".join(f"Round {n} happened." for n in range(1, 8))
open(path, "w", encoding="utf-8").write(
    text.replace("## Current state", chronology, 1).replace(chronology + "\n\nThe positive",
                                                            chronology + "\n\n<!--", 1)
)
PY
regenerate
expect_fail "current state accumulated a chronology" "the limit is 5" \
  python3 "$work" --root "$tree" check

# a wave whose first task started before the plan review was accepted
fresh
set_field "$tree/waves/W1/WAVE.md" plan_review_state "pending"
set_field "$tree/waves/W1/WAVE.md" plan_review_evidence ""
expect_fail "work started before the plan review" "while the wave plan review is" \
  python3 "$work" --root "$tree" check

# 13. a hand edit to the generated index
fresh
sed 's/Recovery drill fails on partial state/Recovery drill done/' "$tree/STATUS.md" \
  > "$tree/STATUS.next" && mv "$tree/STATUS.next" "$tree/STATUS.md"
expect_fail "hand-edited status" "STATUS.md disagrees with the tree" \
  python3 "$work" --root "$tree" check

# a hand edit to the generated wave overview
fresh
sed 's/| 0\/1 |/| 1\/1 |/' "$tree/WAVES.md" > "$tree/WAVES.next" && mv "$tree/WAVES.next" "$tree/WAVES.md"
expect_fail "hand-edited wave overview" "WAVES.md disagrees with the tree" \
  python3 "$work" --root "$tree" check

# 17. one identifier live in both the tree and the frozen legacy document
fresh
cat > "$scratch/EXECUTION.md" <<'EOF'
# Frozen execution document

#### [~] W1-LF-04a — Sandbox output boundary verified

**Current state.** `active` — migrated to the work tree.
EOF
expect_fail "identifier live in two systems" "is live in both the work tree" \
  python3 "$work" --root "$tree" check --legacy-plan "$scratch/EXECUTION.md"

fresh
cat > "$scratch/EXECUTION-clean.md" <<'EOF'
# Frozen execution document

#### [x] OLD-12 — Historical accepted outcome

**Current state.** `done` — frozen history.
EOF
expect_pass "frozen legacy history without overlap" \
  python3 "$work" --root "$tree" check --legacy-plan "$scratch/EXECUTION-clean.md"

# ---------------------------------------------------------------------------
# templates and scaffolding agree with the schema
# ---------------------------------------------------------------------------

built="$scratch/built"
expect_pass "init creates the standing files" \
  python3 "$work" --root "$built" init
expect_pass "workflow template is installed" test -f "$built/WORKFLOW.md"
expect_pass "owner gate registry is installed" test -f "$built/backlog/OWNER_GATES.md"

expect_pass "scaffold a wave" python3 "$work" --root "$built" new wave \
  --id W1 --title "Launch readiness" --areas LF --now 2026-08-01T09:00:00+08:00
expect_pass "scaffold a card" python3 "$work" --root "$built" new card \
  --id W1-LF-01 --title "Launch contract frozen" --risk significant \
  --now 2026-08-01T09:05:00+08:00
expect_pass "scaffold a task" python3 "$work" --root "$built" new task \
  --parent W1-LF-01 --title "Launch contract frozen" --now 2026-08-01T09:06:00+08:00
expect_pass "scaffold a second task" python3 "$work" --root "$built" new task \
  --parent W1-LF-01 --title "Contract examples published" --relation follow_up \
  --now 2026-08-01T09:07:00+08:00
expect_pass "scaffold a subtask" python3 "$work" --root "$built" new subtask \
  --parent W1-LF-01a --title "Obligation list enumerated" --now 2026-08-01T09:08:00+08:00

expect_pass "scaffolded tree renders" python3 "$work" --root "$built" status
expect_pass "scaffolded tree validates" python3 "$work" --root "$built" check
expect_pass "allocated identifiers are sequential" \
  test -f "$built/waves/W1/W1-LF-01/tasks/W1-LF-01b.md"
expect_pass "a task with subtasks moved to its directory form" \
  test -f "$built/waves/W1/W1-LF-01/tasks/W1-LF-01a/TASK.md"
expect_pass "an identifier is never reused" \
  bash -c '! python3 "$1" --root "$2" new card --id W1-LF-01 --title "Duplicate" 2>/dev/null' \
  _ "$work" "$built"

expect_pass "generated templates match the generated shape" python3 - "$templates" <<'PY'
import json, pathlib, sys
templates = pathlib.Path(sys.argv[1])
schema = json.loads((templates / "work-schema.json").read_text(encoding="utf-8"))
problems = []
for key, name in (("status", "STATUS.md"), ("waves", "WAVES.md")):
    block = schema[key]
    example = (templates / "work" / name).read_text(encoding="utf-8").split("\n")
    expected = [block["title"], "", block["generated_marker"], "", block["header"],
                block["separator"]]
    if example[:6] != expected:
        problems.append(f"{name} head is {example[:6]}")
raise SystemExit("; ".join(problems) if problems else 0)
PY

# ---------------------------------------------------------------------------
# a project's copy of the tooling is stamped, and drift from the plugin is refused
# ---------------------------------------------------------------------------

copy="$scratch/tools"
mkdir -p "$copy"
cp "$work" "$templates/work-schema.json" "$copy/"
cp -R "$templates/work" "$copy/work"
copied="$copy/work.py"

expect_pass "a faithful copy validates the tree" \
  python3 "$copied" --root "$fixture" check
expect_pass "the copy reports the release it came from" \
  bash -c 'python3 "$1" version | grep -q "work tooling"' _ "$copied"
expect_pass "a faithful copy agrees with the plugin" \
  python3 "$copied" --root "$fixture" check --plugin-templates "$templates"

python3 - "$copy/work-schema.json" <<'PY'
import json, sys
path = sys.argv[1]
schema = json.loads(open(path, encoding="utf-8").read())
schema["tooling_version"] = "0.0.1"
open(path, "w", encoding="utf-8").write(json.dumps(schema, indent=2, ensure_ascii=False) + "\n")
PY
expect_fail "half-copied tooling" "copy both from one plugin release" \
  python3 "$copied" --root "$fixture" check

cp "$templates/work-schema.json" "$copy/work-schema.json"
printf '\n# local edit\n' >> "$copied"
expect_fail "locally modified tooling" "modified after it was copied" \
  python3 "$copied" --root "$fixture" check

cp "$work" "$copied"
reference="$scratch/newer"
mkdir -p "$reference"
python3 - "$templates/work-schema.json" "$reference/work-schema.json" <<'PY'
import json, sys
schema = json.loads(open(sys.argv[1], encoding="utf-8").read())
schema["tooling_version"] = "99.0.0"
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(schema, indent=2, ensure_ascii=False) + "\n")
PY
expect_fail "copy older than the installed plugin" "the installed plugin ships 99.0.0" \
  python3 "$copied" --root "$fixture" check --plugin-templates "$reference"

expect_fail "plugin templates directory that does not exist" "does not exist" \
  python3 "$copied" --root "$fixture" check --plugin-templates "$scratch/absent"

printf 'work test: %s work-tree checks passed\n' "$passes"
