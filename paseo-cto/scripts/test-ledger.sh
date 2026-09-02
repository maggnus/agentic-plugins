#!/usr/bin/env bash
# Regression tests for the ledger command and for the validator's one-run diagnostics.

set -euo pipefail

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
plugin_root=$(CDPATH='' cd -- "$script_dir/.." && pwd)
templates="$plugin_root/skills/paseo-cto/templates"
fixture="$plugin_root/tests/fixtures/work-tree"
scratch=$(mktemp -d "${TMPDIR:-/tmp}/paseo-cto-ledger.XXXXXX")
trap 'rm -rf "$scratch"' EXIT INT TERM

passes=0
commit_url="https://github.com/example/project/commit"

expect_pass() {
  label=$1
  shift
  if "$@" > "$scratch/output" 2>&1; then
    passes=$((passes + 1))
    return
  fi
  printf 'ledger test: expected pass: %s\n' "$label" >&2
  cat "$scratch/output" >&2
  exit 1
}

expect_fail() {
  label=$1
  pattern=$2
  shift 2
  if "$@" > "$scratch/output" 2>&1; then
    printf 'ledger test: expected failure: %s\n' "$label" >&2
    cat "$scratch/output" >&2
    exit 1
  fi
  if ! grep -q -- "$pattern" "$scratch/output"; then
    printf 'ledger test: %s failed for the wrong reason (wanted %s)\n' "$label" "$pattern" >&2
    cat "$scratch/output" >&2
    exit 1
  fi
  passes=$((passes + 1))
}

expect_output() {
  label=$1
  pattern=$2
  shift 2
  if "$@" > "$scratch/output" 2>&1 && grep -q -- "$pattern" "$scratch/output"; then
    passes=$((passes + 1))
    return
  fi
  printf 'ledger test: expected output %s: %s\n' "$pattern" "$label" >&2
  cat "$scratch/output" >&2
  exit 1
}

fresh() {
  rm -rf "$scratch/work"
  cp -R "$fixture" "$scratch/work"
  cat > "$scratch/runtime.json" <<'JSON'
{
  "schema": 2,
  "updatedAt": "2026-08-27T09:00:00+08:00",
  "project": "demo",
  "run": "r1",
  "settings": {"path": "SETTINGS_PATH", "revision": 1},
  "plugin": {"version": "10.8.0", "commit": "0000000000000000000000000000000000000000"},
  "cto": {},
  "integration": {"branch": "main", "head": "0000000000000000000000000000000000000000"},
  "heartbeat": {},
  "releaseClock": {},
  "activeNodes": [],
  "agents": [],
  "workspaces": [],
  "tails": [],
  "materialEvents": []
}
JSON
  cat > "$scratch/SETTINGS.json" <<'JSON'
{"schema": 4, "sourceRepository": "https://github.com/example/project", "charter": {}}
JSON
  sed -i '' "s|SETTINGS_PATH|$scratch/SETTINGS.json|" "$scratch/runtime.json"
}

ledger() {
  python3 "$templates/ledger.py" --checkpoint "$scratch/runtime.json" \
    --work-root "$scratch/work" --no-fleet "$@"
}

field() {
  python3 - "$scratch/work/$1" "$2" <<'PY'
import sys
path, key = sys.argv[1], sys.argv[2]
head = open(path, encoding="utf-8").read().split("\n---\n", 1)[0]
for line in head.split("\n"):
    if line.split(":", 1)[0].strip() == key:
        print(line.split(":", 1)[1].strip())
        break
PY
}

# --- A: one full lifecycle in six calls, no hand edits -------------------------------------------
fresh
task=W1-LF-04a
node="waves/W1/W1-LF-04/tasks/W1-LF-04a.md"
expect_pass "candidate" ledger candidate --task "$task" --commit "$commit_url/1111111111111111111111111111111111111111"
expect_pass "return" ledger verdict --task "$task" --verdict RETURN --score 5 \
  --finding "negative half never failed" --reason proof --minutes 18
expect_pass "second candidate" ledger candidate --task "$task" --commit "$commit_url/2222222222222222222222222222222222222222"
expect_pass "accept" ledger verdict --task "$task" --verdict ACCEPT --score 9 \
  --finding "no open outcome-defect remains" --minutes 11
expect_pass "merge" ledger merge --task "$task" \
  --closure-commit "$commit_url/3333333333333333333333333333333333333333" \
  --evidence "$commit_url/3333333333333333333333333333333333333333" \
  --accepted "The boundary rejects an unauthorized caller." --minutes 6
# Defect 1: merging integrates; it does not accept on the owner's behalf.
[ "$(field "$node" state)" = "review" ] || { echo "merge changed state to $(field "$node" state), want review" >&2; exit 1; }
[ -z "$(field "$node" accepted_at)" ] || { echo "merge filled accepted_at" >&2; exit 1; }
expect_pass "the tree is valid after merge" python3 "$templates/work.py" --root "$scratch/work" check
expect_pass "accept" ledger accept --task "$task"
[ "$(field "$node" state)" = "accepted" ] || { echo "state was not accepted" >&2; exit 1; }
[ -n "$(field "$node" accepted_at)" ] || { echo "accept left accepted_at empty" >&2; exit 1; }
[ "$(field "$node" review_rounds)" = "2" ] || { echo "rounds were not recorded" >&2; exit 1; }
passes=$((passes + 1))
expect_pass "retire" ledger retire --task "$task"
expect_pass "the tree is valid after the cycle" python3 "$templates/work.py" --root "$scratch/work" check
# Defect 2: a bare URL becomes one Markdown link the validator accepts.
expect_output "evidence is a single Markdown link" '^evidence:$' cat "$scratch/work/$node"
expect_output "the link carries the candidate caption" '  - \[Candidate 222222222222\](' cat "$scratch/work/$node"

# the checkpoint migrated itself and kept the accounting
expect_output "checkpoint migrated to schema 3" '"schema": 3' cat "$scratch/runtime.json"
expect_output "the return reason is classified" '"proof": 1' cat "$scratch/runtime.json"

# --- D: a delta pass counts as a round but not as a return ----------------------------------------
fresh
ledger candidate --task "$task" --commit "$commit_url/1111111111111111111111111111111111111111" > /dev/null
ledger verdict --task "$task" --verdict RETURN --score 6 --finding "manifest overstates the set" \
  --reason proof --delta --minutes 4 > /dev/null
expect_output "a delta return spends no budget" '"proof": 0' cat "$scratch/runtime.json"
expect_output "a delta round is journalled" '\[delta\]' cat "$scratch/work/$node"

# --- B: the budget warning arrives before the next round ------------------------------------------
fresh
ledger candidate --task "$task" --commit "$commit_url/1111111111111111111111111111111111111111" > /dev/null
ledger verdict --task "$task" --verdict RETURN --score 4 --finding "first" --minutes 9 > /dev/null
expect_output "the ledger warns when the budget is spent" "returns spent 2/2: next verdict is ESCALATE" \
  ledger verdict --task "$task" --verdict RETURN --score 4 --finding "second" --minutes 9
expect_output "the next candidate repeats the warning" "returns spent 2/2" \
  ledger candidate --task "$task" --commit "$commit_url/7777777777777777777777777777777777777777"
expect_pass "a bounded retry is recorded before the next round" \
  ledger escalate --task "$task" --decision bounded_retry --reason-text "acceptance closes on the reachability proof"
expect_pass "the third return is legal after the decision" \
  ledger verdict --task "$task" --verdict RETURN --score 5 --finding "third" --reset-from 1 --minutes 9

# --- F: a batch of three nodes moves in one set of calls -------------------------------------------
fresh
a=W1-LF-04c.1
b=W1-LF-04c.2
c=W1-LF-04d
expect_pass "batch candidate" ledger candidate --task "$a" --task "$b" --task "$c" \
  --commit "$commit_url/4444444444444444444444444444444444444444"
expect_pass "batch return" ledger verdict --task "$a" --task "$b" --task "$c" --verdict RETURN \
  --score 5 --finding "seed data missing for two of three" --reason outcome_defect --minutes 12
expect_pass "batch second candidate" ledger candidate --task "$a" --task "$b" --task "$c" \
  --commit "$commit_url/5555555555555555555555555555555555555555"
expect_pass "batch accept" ledger verdict --task "$a" --task "$b" --task "$c" --verdict ACCEPT \
  --score 9 --finding "all three nodes seed and render" --minutes 8
expect_pass "batch merge" ledger merge --task "$a" --task "$b" --task "$c" \
  --closure-commit "$commit_url/6666666666666666666666666666666666666666" --minutes 5
expect_pass "batch accept" ledger accept --task "$a" --task "$b" --task "$c"
expect_pass "batch retire" ledger retire --task "$a" --task "$b" --task "$c"
for id in "$a" "$b" "$c"; do
  path=$(python3 - "$scratch/work" "$id" <<'PY'
import sys, pathlib
root, node_id = pathlib.Path(sys.argv[1]), sys.argv[2]
print(next(p for p in root.rglob("*.md") if f"id: {node_id}\n" in p.read_text(encoding="utf-8")))
PY
)
  grep -q "R2(9/10) ACCEPT" "$path" || { echo "batch node $id lacks its round" >&2; exit 1; }
done
passes=$((passes + 1))
expect_pass "the batch leaves a valid tree" python3 "$templates/work.py" --root "$scratch/work" check

# --- E: an exclusive resource stops the second task ------------------------------------------------
fresh
python3 - "$scratch/runtime.json" <<'PY'
import json, sys
path = sys.argv[1]
data = json.loads(open(path, encoding="utf-8").read())
data["schema"] = 3
data["resources"] = [{"id": "local-stand", "mode": "exclusive", "owner": "", "note": ""}]
open(path, "w", encoding="utf-8").write(json.dumps(data, indent=2))
PY
expect_pass "first task claims the stand" ledger dispatch --task "$task" --resource local-stand
expect_fail "second task on an exclusive resource stops" "is held by" \
  ledger dispatch --task W1-LF-04b --resource local-stand
expect_pass "an acknowledged overlap is recorded" ledger dispatch --task W1-LF-04b \
  --resource local-stand --acknowledge

# --- Defect 2: several evidence links, and an invalid one refused -----------------------------
fresh
ledger candidate --task "$task" --commit "$commit_url/1111111111111111111111111111111111111111" > /dev/null
ledger verdict --task "$task" --verdict ACCEPT --score 9 --finding "clean" > /dev/null
expect_pass "merge with two evidence links" ledger merge --task "$task" \
  --closure-commit "$commit_url/3333333333333333333333333333333333333333" \
  --evidence "$commit_url/3333333333333333333333333333333333333333" \
  --evidence "[review report](https://example.com/reports/1)"
expect_output "front matter carries the first link only" '^  - \[Candidate 111111111111\](' cat "$scratch/work/$node"
count=$(sed -n '/^### Evidence/,/^## /p' "$scratch/work/$node" | grep -c '^- \[')
[ "$count" = "2" ] || { echo "Closure › Evidence holds $count links, want 2" >&2; exit 1; }
passes=$((passes + 1))
expect_pass "the tree is valid with two links" python3 "$templates/work.py" --root "$scratch/work" check
fresh
ledger candidate --task "$task" --commit "$commit_url/1111111111111111111111111111111111111111" > /dev/null
expect_fail "an evidence value that is neither URL nor link is refused" "neither a URL nor a Markdown link" \
  ledger merge --task "$task" --closure-commit "$commit_url/3333333333333333333333333333333333333333" \
  --evidence "see the report"
expect_pass "the refused merge wrote nothing" python3 "$templates/work.py" --root "$scratch/work" check
[ "$(field "$node" state)" = "review" ] || { echo "a refused merge changed state" >&2; exit 1; }
passes=$((passes + 1))

# --- Defect 1: a project may declare that merging is accepting ----------------------------------
fresh
cat > "$scratch/SETTINGS.json" <<'JSON'
{"schema": 4, "charter": {"acceptance": {"mergeIsAcceptance": true}}}
JSON
python3 - "$scratch/runtime.json" "$scratch/SETTINGS.json" <<'PY'
import json, sys
path, settings = sys.argv[1], sys.argv[2]
data = json.loads(open(path, encoding="utf-8").read())
data["settings"]["path"] = settings
open(path, "w", encoding="utf-8").write(json.dumps(data, indent=2))
PY
ledger candidate --task "$task" --commit "$commit_url/1111111111111111111111111111111111111111" > /dev/null
ledger verdict --task "$task" --verdict ACCEPT --score 9 --finding "clean" > /dev/null
expect_pass "merge under mergeIsAcceptance" ledger merge --task "$task" \
  --closure-commit "$commit_url/3333333333333333333333333333333333333333"
[ "$(field "$node" state)" = "accepted" ] || { echo "mergeIsAcceptance did not accept" >&2; exit 1; }
passes=$((passes + 1))

# --- 5: a batch verdict may carry one node's own finding ----------------------------------------
fresh
ledger candidate --task "$a" --task "$b" --commit "$commit_url/4444444444444444444444444444444444444444" > /dev/null
expect_pass "batch verdict with a per-node finding" ledger verdict --task "$a" --task "$b" \
  --verdict RETURN --score 5 --finding "seed rows missing" \
  --task-finding "$b=index page omits the new entry"
expect_output "the shared finding reached the first node" "seed rows missing" \
  cat "$scratch/work/waves/W1/W1-LF-04/tasks/W1-LF-04c/subtasks/W1-LF-04c.1.md"
expect_output "the node-specific finding reached the second" "index page omits the new entry" \
  cat "$scratch/work/waves/W1/W1-LF-04/tasks/W1-LF-04c/subtasks/W1-LF-04c.2.md"
expect_fail "a per-node finding for a task outside the batch is refused" "must read <task>=<finding>" \
  ledger verdict --task "$a" --verdict RETURN --score 5 --finding "x" --task-finding "W9-XX-99a=y"

# --- 6: the event prints one result line per node --------------------------------------------------
fresh
expect_output "the result names state, round and candidate" "W1-LF-04a: review · R0 · candidate 111111111111" \
  ledger candidate --task "$task" --commit "$commit_url/1111111111111111111111111111111111111111"

# --- Defect 3: a missing renderer is an error, never a skip ------------------------------------------
fresh
mkdir -p "$scratch/tools"
cp "$templates/ledger.py" "$templates/work.py" "$templates/work-schema.json" "$scratch/tools/"
render_missing() {
  HOME="$scratch/nohome" python3 "$scratch/tools/ledger.py" --checkpoint "$scratch/runtime.json" \
    --work-root "$scratch/work" --timezone HKT candidate --task "$task" \
    --commit "$commit_url/1111111111111111111111111111111111111111"
}
expect_fail "no renderer beside the tooling and none installed is an error" \
  "render_fleet.py is not in" render_missing
if grep -q "skipped" "$scratch/output"; then
  echo "ledger test: a missing renderer was reported as skipped" >&2
  exit 1
fi
passes=$((passes + 1))
# A renderer that runs and cannot complete — here the checkpoint is too bare for the live probe —
# leaves FLEET.md stale and the event recorded; the timezone comes from the machine when omitted.
fresh
expect_output "a render that cannot complete warns instead of failing the event" \
  "FLEET.md is stale until the next successful render" \
  python3 "$templates/ledger.py" --checkpoint "$scratch/runtime.json" --work-root "$scratch/work" \
  candidate --task "$task" --commit "$commit_url/1111111111111111111111111111111111111111"
[ "$(field "$node" candidate_commit)" = "$commit_url/1111111111111111111111111111111111111111" ] \
  || { echo "the event was lost behind the failed render" >&2; exit 1; }
passes=$((passes + 1))
if grep -q "timezone is required" "$scratch/output"; then
  echo "ledger test: the timezone was demanded instead of derived" >&2
  exit 1
fi
passes=$((passes + 1))

# --- A1: a short SHA is refused; a full SHA becomes a commit-pinned link ------------------------
fresh
before=$(field "$node" candidate_commit)
expect_fail "a short SHA is refused at the door" "neither a 40-character lowercase SHA" \
  ledger candidate --task "$task" --commit 0fa0fe80
[ "$(field "$node" candidate_commit)" = "$before" ] || { echo "a refused candidate was written" >&2; exit 1; }
passes=$((passes + 1))
expect_pass "a full SHA is accepted" ledger candidate --task "$task" \
  --commit 0fa0fe80aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
[ "$(field "$node" candidate_commit)" = "$commit_url/0fa0fe80aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" ] \
  || { echo "candidate_commit is not the canonical link: $(field "$node" candidate_commit)" >&2; exit 1; }
passes=$((passes + 1))
ledger verdict --task "$task" --verdict ACCEPT --score 9 --finding "clean" > /dev/null
expect_fail "a short closure SHA is refused too" "neither a 40-character lowercase SHA" \
  ledger merge --task "$task" --closure-commit 3333333
expect_pass "a full closure SHA becomes a link" ledger merge --task "$task" \
  --closure-commit 3333333333333333333333333333333333333333
[ "$(field "$node" closure_commit)" = "$commit_url/3333333333333333333333333333333333333333" ] \
  || { echo "closure_commit is not the canonical link" >&2; exit 1; }
passes=$((passes + 1))
fresh
python3 - "$scratch/SETTINGS.json" <<'PY'
import json, sys
path = sys.argv[1]
data = json.loads(open(path, encoding="utf-8").read())
data.pop("sourceRepository")
open(path, "w", encoding="utf-8").write(json.dumps(data))
PY
expect_fail "a bare SHA without a repository URL names the missing setting" "sourceRepository" \
  ledger candidate --task "$task" --commit 0fa0fe80aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

# --- A2: the decision vocabulary is one, and it lives in the schema ---------------------------------
fresh
ledger candidate --task "$task" --commit "$commit_url/1111111111111111111111111111111111111111" > /dev/null
ledger verdict --task "$task" --verdict RETURN --score 4 --finding "first" > /dev/null
ledger verdict --task "$task" --verdict RETURN --score 4 --finding "second" > /dev/null 2>&1
expect_fail "an unknown decision is refused before writing" "is not a decision" \
  ledger escalate --task "$task" --decision postponed --reason-text "later"
expect_pass "split is a decision the schema knows" \
  ledger escalate --task "$task" --decision split --reason-text "the settled half lands"
expect_pass "the tree accepts a split after a spent budget" \
  python3 "$templates/work.py" --root "$scratch/work" check
fresh
ledger candidate --task "$task" --commit "$commit_url/1111111111111111111111111111111111111111" > /dev/null
ledger verdict --task "$task" --verdict RETURN --score 4 --finding "first" > /dev/null
ledger verdict --task "$task" --verdict RETURN --score 4 --finding "second" > /dev/null 2>&1
ledger escalate --task "$task" --decision split --reason-text "the settled half lands" > /dev/null
ledger candidate --task "$task" --commit "$commit_url/2222222222222222222222222222222222222222" > /dev/null
expect_fail "split does not extend the loop: a third return still exceeds the budget" \
  "exceed the reviewer's budget" \
  ledger verdict --task "$task" --verdict RETURN --score 4 --finding "third"

# --- A3: an over-long finding is trimmed before it reaches the file ---------------------------------
fresh
ledger candidate --task "$task" --commit "$commit_url/1111111111111111111111111111111111111111" > /dev/null
long=$(printf 'the harness rebuilt the stand and the measurement window moved %.0s' $(seq 1 12))
expect_output "the finding is trimmed and the trim is announced" "was trimmed to fit the journal" \
  ledger verdict --task "$task" --verdict RETURN --score 5 --finding "$long"
expect_pass "the tree is valid after the trimmed write" python3 "$templates/work.py" --root "$scratch/work" check

# --- B: five defects, one run --------------------------------------------------------------------
fresh
python3 - "$scratch/work" <<'PY'
import pathlib, sys
root = pathlib.Path(sys.argv[1])
# 1. an over-long journal line, 2. a count that disagrees with it
node = root / "waves/W1/W1-LF-04/tasks/W1-LF-04e.md"
text = node.read_text(encoding="utf-8")
text = text.replace("review_rounds: 2", "review_rounds: 4")
text = text.replace("- R2(6/10) RETURN 03/08 18:40 — comparison",
                    "- R2(6/10) RETURN 03/08 18:40 — " + "comparison " * 40)
node.write_text(text, encoding="utf-8")
# 3. a renamed section
other = root / "waves/W2/W2-CF-01/tasks/W2-CF-01a.md"
other.write_text(other.read_text(encoding="utf-8").replace("## Guardrails", "## Notes", 1), encoding="utf-8")
# 4. a journal entry without its score, 5. an escalation decision with no CTO line
third = root / "waves/W1/W1-LF-04/tasks/W1-LF-04a.md"
text = third.read_text(encoding="utf-8")
text = text.replace("review_rounds: 0", "review_rounds: 1")
text = text.replace("escalation_decision:", "escalation_decision: split")
text = text.replace("## Closure", "## Review rounds\n\n- R1 RETURN 03/08 10:00 — unscored\n\n## Closure", 1)
third.write_text(text, encoding="utf-8")
PY
python3 "$templates/work.py" --root "$scratch/work" check > "$scratch/five" 2>&1 || true
found=0
for pattern in "is 4 but the journal holds" "characters; the limit is" "sections must be exactly" \
               "not a complete round record" "needs its"; do
  grep -q -- "$pattern" "$scratch/five" && found=$((found + 1))
done
if [ "$found" -lt 5 ]; then
  printf 'ledger test: one run reported %s of 5 defects\n' "$found" >&2
  cat "$scratch/five" >&2
  exit 1
fi
passes=$((passes + 1))

printf 'ledger test: %s ledger checks passed\n' "$passes"
