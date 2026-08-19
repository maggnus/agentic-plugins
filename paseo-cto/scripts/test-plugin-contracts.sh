#!/usr/bin/env bash
# Regression tests for document transfer, source references, and reporting register checks.

set -euo pipefail

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
plugin_root=$(CDPATH='' cd -- "$script_dir/.." && pwd)
templates="$plugin_root/skills/paseo-cto/templates"
work_fixture="$plugin_root/tests/fixtures/work-tree"
scratch=$(mktemp -d "${TMPDIR:-/tmp}/paseo-cto-contracts.XXXXXX")
trap 'rm -rf "$scratch"' EXIT INT TERM

passes=0

expect_pass() {
  label=$1
  shift
  if "$@" > "$scratch/output" 2>&1; then
    passes=$((passes + 1))
    return
  fi
  printf 'test: expected pass: %s\n' "$label" >&2
  cat "$scratch/output" >&2
  exit 1
}

expect_fail() {
  label=$1
  shift
  if "$@" > "$scratch/output" 2>&1; then
    printf 'test: expected failure: %s\n' "$label" >&2
    cat "$scratch/output" >&2
    exit 1
  fi
  passes=$((passes + 1))
}

cp "$templates/PLAN.md" "$scratch/EXECUTION.md"
cp "$templates/ACCEPTANCE.md" "$scratch/ACCEPTANCE.md"
expect_pass "canonical document templates" env \
  PLAN_FILE="$scratch/EXECUTION.md" ACCEPTANCE_FILE="$scratch/ACCEPTANCE.md" \
  "$templates/check-plan-shape.sh"

sed '/^\*\*Maturity/d' "$templates/PLAN.md" > "$scratch/missing-maturity.md"
expect_fail "active card without maturity" env \
  PLAN_FILE="$scratch/missing-maturity.md" ACCEPTANCE_FILE="$scratch/ACCEPTANCE.md" \
  "$templates/check-plan-shape.sh"

# shellcheck disable=SC2016 # Backticks are literal Markdown syntax.
sed 's/`active` — <where/`ready` — <where/' "$templates/PLAN.md" > "$scratch/state-mismatch.md"
expect_fail "marker and current state mismatch" env \
  PLAN_FILE="$scratch/state-mismatch.md" ACCEPTANCE_FILE="$scratch/ACCEPTANCE.md" \
  "$templates/check-plan-shape.sh"

sed 's/^#### \[ \] EX-1 — <outcome-oriented title>$/#### EX-1 — <outcome-oriented title> — [ ]/' \
  "$templates/PLAN.md" > "$scratch/marker-at-end.md"
expect_fail "card marker at end of heading" env \
  PLAN_FILE="$scratch/marker-at-end.md" ACCEPTANCE_FILE="$scratch/ACCEPTANCE.md" \
  "$templates/check-plan-shape.sh"

# shellcheck disable=SC2016 # Backticks are literal Markdown syntax.
printf '%s\n' \
  'Accepted by [abc1234](https://github.com/example/project/commit/abc1234567890).' \
  'Evidence: [`src/app.ts`](https://github.com/example/project/blob/abc1234567890/src/app.ts#L1-L8).' \
  > "$scratch/linked.md"
expect_pass "source-linked commit and file" "$templates/check-source-links.sh" "$scratch/linked.md"

printf '%s\n' 'Accepted by abc1234; evidence is src/app.ts:4.' > "$scratch/bare.md"
expect_fail "bare commit and file" "$templates/check-source-links.sh" "$scratch/bare.md"

printf '%s\n' \
  'Recovery behavior is established by the negative-path measurement.' \
  'Release authorization remains pending until the production gate opens.' \
  > "$scratch/status-en.txt"
expect_pass "formal English status" env REPORTING_LANGUAGE=English \
  "$templates/check-owner-status.sh" "$scratch/status-en.txt"

printf '%s\n' \
  'Восстановление подтверждено измерением отрицательного сценария.' \
  'Разрешение выпуска ожидает успешной проверки готовности.' \
  > "$scratch/status-ru.txt"
expect_pass "local Russian language overrides English default" env REPORTING_LANGUAGE=Russian \
  "$templates/check-owner-status.sh" "$scratch/status-ru.txt"
expect_fail "English default rejects Russian prose" env REPORTING_LANGUAGE=English \
  "$templates/check-owner-status.sh" "$scratch/status-ru.txt"

printf '%s\n' \
  'Le comportement de reprise est établi par la mesure du scénario négatif.' \
  "L'autorisation de mise en production reste en attente." \
  > "$scratch/status-fr.txt"
expect_pass "another project-local language overrides English default" env REPORTING_LANGUAGE=French \
  "$templates/check-owner-status.sh" "$scratch/status-fr.txt"

printf '%s\n' 'Мы проверили восстановление; результат подтверждён.' > "$scratch/status-ru-personal.txt"
expect_fail "Russian first person" env REPORTING_LANGUAGE=Russian \
  "$templates/check-owner-status.sh" "$scratch/status-ru-personal.txt"

printf '%s\n' 'Разрешение выпуска ожидает открытия производственного шлюза.' \
  > "$scratch/status-ru-calque.txt"
expect_fail "Russian quality-gate calque" env REPORTING_LANGUAGE=Russian \
  "$templates/check-owner-status.sh" "$scratch/status-ru-calque.txt"

# Regression: a session leak showed owner prose built from first-person verbs
# ("Возобновляю", "Проверяю", "сверяю") with no pronoun at all; the pronoun-only
# pattern passed it. Ordinary words ending in -ю/-им ("очередью", "необходим")
# must keep passing.
printf '%s\n' 'Возобновляю только W0-OP-10. Сначала сверяю состояние Git.' \
  'Проверяю итог задачи миграции.' > "$scratch/status-ru-verbs.txt"
expect_fail "Russian first-person verbs without pronouns" env REPORTING_LANGUAGE=Russian \
  "$templates/check-owner-status.sh" "$scratch/status-ru-verbs.txt"

printf '%s\n' 'Функционал необходим; выпуск идёт одной очередью.' \
  > "$scratch/status-ru-neutral.txt"
expect_pass "Russian ordinary -ю/-им words are not first person" env REPORTING_LANGUAGE=Russian \
  "$templates/check-owner-status.sh" "$scratch/status-ru-neutral.txt"

printf '%s\n' 'I checked the path; you should probably rerun it. Great work.' > "$scratch/status-bad.txt"
expect_fail "personal social and hedged status" env REPORTING_LANGUAGE=English \
  "$templates/check-owner-status.sh" "$scratch/status-bad.txt"

cat > "$scratch/FLEET.md" <<'EOF'
# Update 2026-08-02 22:30 HKT
paseo-cto: v8.0.1 | Model: openai/gpt-5.6-sol (xhigh) | Context: 201k(15%) | Session: 1h24m
Wave: [W5] Recovery readiness
Cards: 3/5

| Agent | Task | Status | Time | LOC |
| --- | --- | --- | --- | --- |
| `cto-sol` | `—` Integrate recovery path | `reviewing` | 8m | — |
| `W5-4-sol-builder` | `W5-4` Complete recovery | `running` | 18m | +24 -3 |
EOF

cat > "$scratch/status-plan.md" <<'EOF'
# Example — Execution

## 3. Cards

### W5 — Recovery readiness

#### [~] W5-4 — Complete recovery

**Outcome.** Recovery completes.

#### [ ] W5-5 — Prove recovery

**Outcome.** Recovery is proved.
EOF

cat > "$scratch/status-acceptance.md" <<'EOF'
# Example — Acceptance

| Card | Wave | Risk | Accepted outcome | Closure record | Durable evidence | Time |
|---|---|---|---|---|---|---|
| W5-1 | W5 | Routine | First result. | closure | evidence | 02/08 20:00 (5m) |
| W5-2 | W5 | Routine | Second result. | closure | evidence | 02/08 20:05 (5m) |
| W5-3 | W5 | Routine | Third result. | closure | evidence | 02/08 20:10 (5m) |
EOF

expect_pass "current-wave snapshot and semantic card counts" env \
  PASEO_CTO_VERSION=v8.0.1 \
  FLEET_FILE="$scratch/FLEET.md" PLAN_FILE="$scratch/status-plan.md" \
  ACCEPTANCE_FILE="$scratch/status-acceptance.md" \
  "$templates/check-fleet-render.sh"

sed 's/ | Context: 201k(15%)//' "$scratch/FLEET.md" > "$scratch/fleet-no-context.md"
expect_pass "snapshot may omit unavailable host context" env \
  PASEO_CTO_VERSION=v8.0.1 FLEET_FILE="$scratch/fleet-no-context.md" \
  PLAN_FILE="$scratch/status-plan.md" ACCEPTANCE_FILE="$scratch/status-acceptance.md" \
  "$templates/check-fleet-render.sh"

sed 's/# Update 2026-08-02 22:30 HKT/# Example update 2026-08-02 22:30 HKT/' \
  "$scratch/FLEET.md" > "$scratch/fleet-old-header.md"
expect_fail "old status heading" env FLEET_FILE="$scratch/fleet-old-header.md" \
  "$templates/check-fleet-render.sh"

awk '{ if ($0 == "| Agent | Task | Status | Time | LOC |") print "## Active fleet"; print }' \
  "$scratch/FLEET.md" > "$scratch/fleet-table-heading.md"
expect_fail "fleet table section heading" env FLEET_FILE="$scratch/fleet-table-heading.md" \
  "$templates/check-fleet-render.sh"

sed 's/Wave: \[W5\]/Wave: W5/' "$scratch/FLEET.md" > "$scratch/fleet-unbracketed-wave.md"
expect_fail "unbracketed wave index" env FLEET_FILE="$scratch/fleet-unbracketed-wave.md" \
  "$templates/check-fleet-render.sh"

sed 's/paseo-cto: v8\.0\.1/paseo-cto: v8.0.0/' \
  "$scratch/FLEET.md" > "$scratch/fleet-wrong-plugin-version.md"
expect_fail "status plugin version differs from selected release" env \
  PASEO_CTO_VERSION=v8.0.1 FLEET_FILE="$scratch/fleet-wrong-plugin-version.md" \
  "$templates/check-fleet-render.sh"

sed 's/Cards: 3\/5/Cards: 4\/5/' "$scratch/FLEET.md" > "$scratch/fleet-wrong-count.md"
expect_fail "status card count differs from plan and acceptance" env \
  FLEET_FILE="$scratch/fleet-wrong-count.md" PLAN_FILE="$scratch/status-plan.md" \
  ACCEPTANCE_FILE="$scratch/status-acceptance.md" \
  "$templates/check-fleet-render.sh"

# shellcheck disable=SC2016 # Backticks are literal Markdown syntax.
sed 's/`cto-sol`/`W5-0-sol-builder`/' "$scratch/FLEET.md" > "$scratch/fleet-no-cto.md"
expect_fail "fleet table without CTO first" env FLEET_FILE="$scratch/fleet-no-cto.md" \
  "$templates/check-fleet-render.sh"

# shellcheck disable=SC2016 # Backticks are literal Markdown syntax.
sed 's/`W5-4-sol-builder`/`W5-5-sol-builder`/' "$scratch/FLEET.md" \
  > "$scratch/fleet-wrong-agent-title.md"
expect_fail "fleet agent title differs from task" env FLEET_FILE="$scratch/fleet-wrong-agent-title.md" \
  "$templates/check-fleet-render.sh"

sed 's/ | 18m | +24 -3 |/ | 18 minutes | +24 -3 |/' "$scratch/FLEET.md" \
  > "$scratch/fleet-bad-time.md"
expect_fail "fleet state time grammar" env FLEET_FILE="$scratch/fleet-bad-time.md" \
  "$templates/check-fleet-render.sh"

sed 's/ | 18m | +24 -3 |/ | 18m | 4 files |/' "$scratch/FLEET.md" \
  > "$scratch/fleet-bad-loc.md"
expect_fail "fleet LOC grammar" env FLEET_FILE="$scratch/fleet-bad-loc.md" \
  "$templates/check-fleet-render.sh"

# shellcheck disable=SC2016 # Backticks are literal Markdown syntax.
sed 's/`reviewing`/`coordinating`/' "$scratch/FLEET.md" > "$scratch/fleet-native-status.md"
expect_fail "fleet rejects native provider status" env FLEET_FILE="$scratch/fleet-native-status.md" \
  "$templates/check-fleet-render.sh"

sed -e 's/Wave: \[W5\] Recovery readiness/Wave: [—] —/' -e 's/Cards: 3\/5/Cards: 0\/0/' \
  "$scratch/FLEET.md" > "$scratch/fleet-no-wave.md"
expect_fail "current plan cards without a current wave" env \
  FLEET_FILE="$scratch/fleet-no-wave.md" PLAN_FILE="$scratch/status-plan.md" \
  ACCEPTANCE_FILE="$scratch/status-acceptance.md" \
  "$templates/check-fleet-render.sh"

transfer_repo="$scratch/transfer"
mkdir -p "$transfer_repo"
git -C "$transfer_repo" init -q
git -C "$transfer_repo" config user.name "Paseo CTO test"
git -C "$transfer_repo" config user.email "paseo-cto-test@example.invalid"

cat > "$transfer_repo/EXECUTION.md" <<'EOF'
# Execution

#### [~] A-1 — Accepted outcome

**Outcome.** One accepted result.

**Risk.** `Routine`: bounded consequence.

**Maturity.** `BUILD`

**Acceptance.** The observable result exists.

**Current state.** `active` — implementation complete.

#### [ ] B-1 — Remaining outcome

**Outcome.** One remaining result.

**Risk.** `Routine`: bounded consequence.

**Maturity.** `BUILD`

**Acceptance.** The observable result exists.

**Current state.** `ready` — not started.
EOF
cat > "$transfer_repo/ACCEPTANCE.md" <<'EOF'
# Acceptance

| Card | Wave | Risk | Accepted outcome | Closure record | Durable evidence | Time |
|---|---|---|---|---|---|---|
EOF
git -C "$transfer_repo" add EXECUTION.md ACCEPTANCE.md
git -C "$transfer_repo" commit -qm "base"
base_ref=$(git -C "$transfer_repo" rev-parse HEAD)
runtime_branch=$(git -C "$transfer_repo" branch --show-current)
runtime_workspace="$scratch/runtime-worker"
git -C "$transfer_repo" worktree add -q -b runtime-worker "$runtime_workspace" "$base_ref"

cat > "$scratch/SETTINGS.json" <<EOF
{
  "schema": 4,
  "project": "runtime-test",
  "revision": 1,
  "confirmedAt": "2026-08-02T20:00:00+08:00",
  "charter": {
    "strategy": "alpha",
    "roleAssignments": {
      "cto": { "family": "sol", "provider": "openai/gpt-5.6-sol", "effort": "xhigh" },
      "builder": { "family": "sol", "provider": "openai/gpt-5.6-sol", "effort": "high" },
      "reviewer": { "family": "sol", "provider": "openai/gpt-5.6-sol", "effort": "high" },
      "researcher": { "family": "sol", "provider": "openai/gpt-5.6-sol", "effort": "high" }
    },
    "permissionPolicy": "full-access-writers",
    "fleetBudget": { "max_live_tasks": 2, "max_live_agents": 3 },
    "autonomyHorizon": "until-gate",
    "reviewDepth": "risk-based",
    "reportingLanguage": "English",
    "modeMap": {}
  },
  "work": { "root": "docs/work", "scriptHome": "scripts" },
  "ownerOverrides": {}
}
EOF

cat > "$scratch/runtime.json" <<EOF
{
  "schema": 2,
  "updatedAt": "2026-08-02T22:30:00+08:00",
  "project": "runtime-test",
  "run": "runtime-test-1",
  "settings": { "path": "$scratch/SETTINGS.json", "revision": 1 },
  "plugin": { "version": "8.0.1", "commit": "$base_ref" },
  "cto": {
    "agentId": "cto-1", "family": "sol", "provider": "openai/gpt-5.6-sol",
    "effort": "xhigh", "sessionStartedAt": "2026-08-02T21:06:00+08:00",
    "derivedStatus": "reviewing", "stateSince": "2026-08-02T22:22:00+08:00",
    "action": "Integrate recovery path"
  },
  "integration": { "branch": "$runtime_branch", "head": "$base_ref", "acceptedHead": "$base_ref" },
  "heartbeat": { "id": "heartbeat-1", "name": "paseo-cto:runtime-test:cto-1", "status": "active" },
  "releaseClock": {
    "nearestOutcome": "Recovery readiness", "criticalPath": "W5-4",
    "currentWave": "W5", "currentWaveName": "Recovery readiness",
    "targetWindow": "one hour", "nextObservableFinish": "Recovery integrated",
    "acceptedMovement": "Three cards accepted"
  },
  "activeNodes": [
    { "id": "W5-4", "ceremonyMinutes": 6, "auxiliaryReturnsSinceMovement": 1 }
  ],
  "agents": [
    {
      "id": "agent-1", "task": "W5-4", "role": "builder", "family": "sol",
      "title": "W5-4-sol-builder", "workspaceId": "workspace-1", "baseline": "$base_ref",
      "provider": "openai/gpt-5.6-sol", "effort": "high", "modeId": "full-access",
      "derivedStatus": "running", "stateSince": "2026-08-02T22:12:00+08:00",
      "returnSummary": ""
    }
  ],
  "workspaces": [
    {
      "id": "workspace-1", "task": "W5-4", "role": "builder",
      "title": "W5-4-sol-builder", "path": "$runtime_workspace", "branch": "runtime-worker",
      "baseline": "$base_ref", "state": "active"
    }
  ],
  "tails": [],
  "materialEvents": []
}
EOF

python3 - "$scratch/runtime.json" <<'PY'
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys

path = Path(sys.argv[1])
runtime = json.loads(path.read_text())
now = datetime.now(timezone.utc).replace(microsecond=0)
runtime["updatedAt"] = now.isoformat()
runtime["cto"]["sessionStartedAt"] = (now - timedelta(minutes=84)).isoformat()
runtime["cto"]["stateSince"] = (now - timedelta(minutes=8)).isoformat()
runtime["agents"][0]["stateSince"] = (now - timedelta(minutes=18)).isoformat()
path.write_text(json.dumps(runtime, indent=2) + "\n")
PY

cat > "$scratch/paseo-observation.json" <<EOF
{
  "labelledAgentIds": [],
  "cto": {
    "id": "cto-1", "title": "cto-test", "provider": "openai/gpt-5.6-sol",
    "effort": "xhigh", "modeId": "full-access", "nativeStatus": "running",
    "path": "$transfer_repo", "archived": false, "parentId": null
  },
  "agents": [
    {
      "id": "agent-1", "title": "W5-4-sol-builder",
      "provider": "openai/gpt-5.6-sol", "effort": "high",
      "modeId": "full-access", "nativeStatus": "running",
      "path": "$runtime_workspace", "archived": false, "parentId": "cto-1"
    }
  ],
  "workspaces": [
    {
      "id": "workspace-1", "title": "W5-4-sol-builder",
      "path": "$runtime_workspace", "isolation": "worktree"
    }
  ]
}
EOF

cat > "$scratch/fake-paseo" <<'PY'
#!/usr/bin/env python3
import json
import os
from pathlib import Path
import sys

source = Path(os.environ["PASEO_CTO_FAKE_OBSERVATION"])
state = json.loads(source.read_text())
args = sys.argv[1:]
if args and args[-1] == "--json":
    args.pop()

if args[:2] == ["ls", "--global"]:
    records = [state["cto"], *state["agents"]]
    ids = state["labelledAgentIds"] if "--label" in args else [item["id"] for item in records]
    value = [{"id": agent_id} for agent_id in ids]
elif args[:1] == ["inspect"] and len(args) == 2:
    records = [state["cto"], *state["agents"]]
    record = next((item for item in records if item["id"] == args[1]), None)
    if record is None:
        raise SystemExit(f"unknown agent: {args[1]}")
    provider, model = record["provider"].split("/", 1)
    value = {
        "Id": record["id"], "Name": record["title"], "Provider": provider,
        "Model": model, "Thinking": record["effort"], "Mode": record["modeId"],
        "Status": record["nativeStatus"], "Cwd": record["path"],
        "Archived": record["archived"], "ParentAgentId": record["parentId"],
    }
elif args == ["workspace", "ls"]:
    value = [
        {
            "workspaceId": item["id"], "name": item["title"], "cwd": item["path"],
            "isolation": item["isolation"],
        }
        for item in state["workspaces"]
    ]
else:
    raise SystemExit(f"unsupported paseo arguments: {args}")
print(json.dumps(value))
PY
chmod +x "$scratch/fake-paseo"
export PASEO_CTO_PASEO_BIN="$scratch/fake-paseo"
export PASEO_CTO_FAKE_OBSERVATION="$scratch/paseo-observation.json"

expect_pass "runtime schema agrees with settings and Git" \
  python3 "$templates/check_runtime.py" "$scratch/runtime.json" --project-root "$transfer_repo"
expect_fail "unavailable Paseo probe blocks runtime validation" env \
  PASEO_CTO_PASEO_BIN="$scratch/missing-paseo" \
  python3 "$templates/check_runtime.py" "$scratch/runtime.json" --project-root "$transfer_repo"
python3 - "$scratch/runtime.json" "$scratch/FLEET.md" "$scratch/FLEET-runtime.md" <<'PY'
from datetime import datetime
import json
from pathlib import Path
import sys

runtime = json.loads(Path(sys.argv[1]).read_text())
lines = Path(sys.argv[2]).read_text().replace("+24 -3", "—").splitlines()
updated = datetime.fromisoformat(runtime["updatedAt"])
lines[0] = f"# Update {updated:%Y-%m-%d %H:%M} UTC"
Path(sys.argv[3]).write_text("\n".join(lines) + "\n")
PY
expect_pass "fleet covers validated runtime exactly" env \
  PASEO_CTO_VERSION=v8.0.1 RUNTIME_FILE="$scratch/runtime.json" PROJECT_ROOT="$transfer_repo" \
  FLEET_FILE="$scratch/FLEET-runtime.md" PLAN_FILE="$scratch/status-plan.md" \
  ACCEPTANCE_FILE="$scratch/status-acceptance.md" "$templates/check-fleet-render.sh"

sed 's/ | 18m | — |/ | 19m | — |/' "$scratch/FLEET-runtime.md" \
  > "$scratch/fleet-stale-state-time.md"
expect_fail "fleet state time is derived from runtime" env \
  RUNTIME_FILE="$scratch/runtime.json" PROJECT_ROOT="$transfer_repo" \
  FLEET_FILE="$scratch/fleet-stale-state-time.md" "$templates/check-fleet-render.sh"

sed 's/ | 18m | — |/ | 18m | +1 -0 |/' "$scratch/FLEET-runtime.md" \
  > "$scratch/fleet-fabricated-loc.md"
expect_fail "fleet LOC is derived from the workspace" env \
  RUNTIME_FILE="$scratch/runtime.json" PROJECT_ROOT="$transfer_repo" \
  FLEET_FILE="$scratch/fleet-fabricated-loc.md" "$templates/check-fleet-render.sh"

python3 - "$scratch/paseo-observation.json" "$scratch" <<'PY'
from copy import deepcopy
import json
from pathlib import Path
import sys

observation = json.loads(Path(sys.argv[1]).read_text())
target = Path(sys.argv[2])

extra = deepcopy(observation)
agent = deepcopy(extra["agents"][0])
agent.update(id="agent-extra", title="W5-5-sol-builder")
extra["agents"].append(agent)
(target / "paseo-extra-agent.json").write_text(json.dumps(extra))

missing_workspace = deepcopy(observation)
missing_workspace["workspaces"] = []
(target / "paseo-missing-workspace.json").write_text(json.dumps(missing_workspace))
PY
expect_fail "unlabelled CTO child cannot be omitted from runtime" env \
  PASEO_CTO_FAKE_OBSERVATION="$scratch/paseo-extra-agent.json" \
  python3 "$templates/check_runtime.py" "$scratch/runtime.json" --project-root "$transfer_repo"
expect_fail "runtime workspace must exist in Paseo" env \
  PASEO_CTO_FAKE_OBSERVATION="$scratch/paseo-missing-workspace.json" \
  python3 "$templates/check_runtime.py" "$scratch/runtime.json" --project-root "$transfer_repo"

python3 - "$scratch/runtime.json" "$scratch/paseo-observation.json" "$scratch" <<'PY'
from copy import deepcopy
import json
from pathlib import Path
import sys

runtime = json.loads(Path(sys.argv[1]).read_text())
observation = json.loads(Path(sys.argv[2]).read_text())
target = Path(sys.argv[3])
runtime["activeNodes"] = []
runtime["agents"] = []
runtime["workspaces"] = []
runtime["releaseClock"].update(currentWave="W1", currentWaveName="Launch readiness")
(target / "runtime-render.json").write_text(json.dumps(runtime))
observation["agents"] = []
observation["workspaces"] = []
(target / "paseo-render.json").write_text(json.dumps(observation))
PY
expect_pass "fleet is generated only from verified state" env \
  PASEO_CTO_FAKE_OBSERVATION="$scratch/paseo-render.json" \
  python3 "$templates/render_fleet.py" "$scratch/runtime-render.json" \
  --project-root "$transfer_repo" --work-root "$work_fixture" --timezone UTC \
  --output "$scratch/FLEET-generated.md"
cp "$scratch/FLEET.md" "$scratch/FLEET-before-status.md"
expect_pass "read-only status renders without replacing fleet" env \
  PASEO_CTO_FAKE_OBSERVATION="$scratch/paseo-render.json" \
  python3 "$templates/render_fleet.py" "$scratch/runtime-render.json" \
  --project-root "$transfer_repo" --work-root "$work_fixture" --timezone UTC --stdout
expect_pass "read-only status preserves the durable fleet" \
  cmp "$scratch/FLEET-before-status.md" "$scratch/FLEET.md"
printf '%s\n' 'previous fleet snapshot' > "$scratch/FLEET-before-failure.md"
cp "$scratch/FLEET-before-failure.md" "$scratch/FLEET-preserved.md"
expect_fail "failed live probe cannot replace fleet" env \
  PASEO_CTO_FAKE_OBSERVATION="$scratch/paseo-extra-agent.json" \
  python3 "$templates/render_fleet.py" "$scratch/runtime-render.json" \
  --project-root "$transfer_repo" --work-root "$work_fixture" --timezone UTC \
  --output "$scratch/FLEET-preserved.md"
expect_pass "failed fleet generation preserves the prior file" \
  cmp "$scratch/FLEET-before-failure.md" "$scratch/FLEET-preserved.md"

sed 's/"schema": 2/"schema": 1/' "$scratch/runtime.json" > "$scratch/runtime-legacy.json"
expect_fail "legacy runtime is rebuilt rather than trusted" \
  python3 "$templates/check_runtime.py" "$scratch/runtime-legacy.json" --project-root "$transfer_repo"

sed 's/"head": "[0-9a-f]*"/"head": "0000000000000000000000000000000000000000"/' \
  "$scratch/runtime.json" > "$scratch/runtime-stale-head.json"
expect_fail "runtime head must match the integration tree" \
  python3 "$templates/check_runtime.py" "$scratch/runtime-stale-head.json" \
  --project-root "$transfer_repo"

python3 - "$scratch/SETTINGS.json" "$scratch/runtime.json" "$scratch" <<'PY'
from copy import deepcopy
import json
from pathlib import Path
import sys

settings = json.loads(Path(sys.argv[1]).read_text())
runtime = json.loads(Path(sys.argv[2]).read_text())
target = Path(sys.argv[3])

task_settings = deepcopy(settings)
task_settings["charter"]["fleetBudget"]["max_live_tasks"] = 1
(target / "SETTINGS-task-cap.json").write_text(json.dumps(task_settings))
task_runtime = deepcopy(runtime)
task_runtime["settings"]["path"] = str(target / "SETTINGS-task-cap.json")
task_runtime["activeNodes"].append(
    {"id": "W5-5", "ceremonyMinutes": 0, "auxiliaryReturnsSinceMovement": 0}
)
(target / "runtime-task-overflow.json").write_text(json.dumps(task_runtime))

agent_settings = deepcopy(settings)
agent_settings["charter"]["fleetBudget"]["max_live_agents"] = 1
(target / "SETTINGS-agent-cap.json").write_text(json.dumps(agent_settings))
agent_runtime = deepcopy(runtime)
agent_runtime["settings"]["path"] = str(target / "SETTINGS-agent-cap.json")
agent = deepcopy(agent_runtime["agents"][0])
agent.update(id="agent-2", role="reviewer", title="W5-4-sol-reviewer", workspaceId="workspace-2")
workspace = deepcopy(agent_runtime["workspaces"][0])
workspace.update(id="workspace-2", role="reviewer", title="W5-4-sol-reviewer")
agent_runtime["agents"].append(agent)
agent_runtime["workspaces"].append(workspace)
(target / "runtime-agent-overflow.json").write_text(json.dumps(agent_runtime))
PY
expect_fail "runtime enforces the live-task ceiling" \
  python3 "$templates/check_runtime.py" "$scratch/runtime-task-overflow.json"
expect_fail "runtime enforces the live-agent ceiling" \
  python3 "$templates/check_runtime.py" "$scratch/runtime-agent-overflow.json"

sed "s#\"path\": \"$runtime_workspace\"#\"path\": \"$scratch/missing-worktree\"#" \
  "$scratch/runtime.json" > "$scratch/runtime-stale-worktree.json"
expect_fail "runtime cannot retain a missing worktree" \
  python3 "$templates/check_runtime.py" "$scratch/runtime-stale-worktree.json" \
  --project-root "$transfer_repo"

sed '/W5-4-sol-builder/d' "$scratch/FLEET-runtime.md" > "$scratch/fleet-missing-runtime-agent.md"
expect_fail "fleet cannot omit a live runtime agent" env \
  RUNTIME_FILE="$scratch/runtime.json" PROJECT_ROOT="$transfer_repo" \
  FLEET_FILE="$scratch/fleet-missing-runtime-agent.md" "$templates/check-fleet-render.sh"

cat > "$transfer_repo/EXECUTION.md" <<'EOF'
# Execution

#### [ ] B-1 — Remaining outcome

**Outcome.** One remaining result.

**Risk.** `Routine`: bounded consequence.

**Maturity.** `BUILD`

**Acceptance.** The observable result exists.

**Current state.** `ready` — not started.
EOF
cat >> "$transfer_repo/ACCEPTANCE.md" <<EOF
| A-1 | W1 | Routine | One accepted result. | [abc1234](https://github.com/example/project/commit/abc1234567890) | [source](https://github.com/example/project/blob/abc1234567890/src/app.ts) | 02/08 10:00 (15m) |
EOF
# shellcheck disable=SC2016 # Positional parameters are expanded by the inner shell.
expect_pass "atomic execution-to-acceptance transfer" env \
  BASE_REF="$base_ref" PLAN_FILE=EXECUTION.md ACCEPTANCE_FILE=ACCEPTANCE.md \
  bash -c 'cd "$1" && exec "$2"' _ "$transfer_repo" "$templates/check-plan-shape.sh"

cp "$transfer_repo/EXECUTION.md" "$transfer_repo/EXECUTION.good.md"
git -C "$transfer_repo" show "$base_ref:EXECUTION.md" > "$transfer_repo/EXECUTION.md"
# shellcheck disable=SC2016 # Positional parameters are expanded by the inner shell.
expect_fail "accepted card duplicated in current execution" env \
  BASE_REF="$base_ref" PLAN_FILE=EXECUTION.md ACCEPTANCE_FILE=ACCEPTANCE.md \
  bash -c 'cd "$1" && exec "$2"' _ "$transfer_repo" "$templates/check-plan-shape.sh"
mv "$transfer_repo/EXECUTION.good.md" "$transfer_repo/EXECUTION.md"

cp "$transfer_repo/ACCEPTANCE.md" "$transfer_repo/ACCEPTANCE.good.md"
cat >> "$transfer_repo/ACCEPTANCE.md" <<'EOF'
| C-1 | W1 | Routine | Orphan result. | [abc1234](https://github.com/example/project/commit/abc1234567890) | [source](https://github.com/example/project/blob/abc1234567890/src/app.ts) | 02/08 10:05 (5m) |
EOF
# shellcheck disable=SC2016 # Positional parameters are expanded by the inner shell.
expect_fail "acceptance row without a prior execution card" env \
  BASE_REF="$base_ref" PLAN_FILE=EXECUTION.md ACCEPTANCE_FILE=ACCEPTANCE.md \
  bash -c 'cd "$1" && exec "$2"' _ "$transfer_repo" "$templates/check-plan-shape.sh"
mv "$transfer_repo/ACCEPTANCE.good.md" "$transfer_repo/ACCEPTANCE.md"

sed '/^| A-1 /d' "$transfer_repo/ACCEPTANCE.md" > "$transfer_repo/ACCEPTANCE.next.md"
mv "$transfer_repo/ACCEPTANCE.next.md" "$transfer_repo/ACCEPTANCE.md"
# shellcheck disable=SC2016 # Positional parameters are expanded by the inner shell.
expect_fail "removed card without acceptance row" env \
  BASE_REF="$base_ref" PLAN_FILE=EXECUTION.md ACCEPTANCE_FILE=ACCEPTANCE.md \
  bash -c 'cd "$1" && exec "$2"' _ "$transfer_repo" "$templates/check-plan-shape.sh"

fixture="$plugin_root/tests/fixtures/work-tree"
cat > "$scratch/FLEET-work.md" <<'EOF'
# Update 2026-08-03 21:00 HKT
paseo-cto: v9.0.0 | Model: openai/gpt-5.6-sol (xhigh) | Context: 201k(15%) | Session: 1h24m
Wave: [W1] Launch readiness
Cards: 1/2

| Agent | Task | Status | Time | LOC |
| --- | --- | --- | --- | --- |
| `cto-sol` | `—` Integrate sandbox boundary | `reviewing` | 8m | — |
| `W1-LF-04a-sol-builder` | `W1-LF-04a` Sandbox output boundary verified | `running` | 18m | +24 -3 |
EOF

expect_pass "fleet snapshot counts derived from the work tree" env \
  FLEET_FILE="$scratch/FLEET-work.md" WORK_ROOT="$fixture" \
  "$templates/check-fleet-render.sh"

sed 's/Cards: 1\/2/Cards: 2\/2/' "$scratch/FLEET-work.md" > "$scratch/fleet-work-count.md"
expect_fail "fleet card count differs from the work tree" env \
  FLEET_FILE="$scratch/fleet-work-count.md" WORK_ROOT="$fixture" \
  "$templates/check-fleet-render.sh"

sed 's/Wave: \[W1\] Launch readiness/Wave: [W1] Something else/' "$scratch/FLEET-work.md" \
  > "$scratch/fleet-work-name.md"
expect_fail "fleet wave name differs from the work tree" env \
  FLEET_FILE="$scratch/fleet-work-name.md" WORK_ROOT="$fixture" \
  "$templates/check-fleet-render.sh"

expect_fail "work tree and frozen plan supplied together" env \
  FLEET_FILE="$scratch/FLEET-work.md" WORK_ROOT="$fixture" \
  PLAN_FILE="$scratch/status-plan.md" ACCEPTANCE_FILE="$scratch/status-acceptance.md" \
  "$templates/check-fleet-render.sh"

expect_pass "upgrade plan, tag grammar and version comparison" python3 - "$plugin_root" <<'PY'
import importlib.util
import pathlib
import sys

sys.dont_write_bytecode = True
path = pathlib.Path(sys.argv[1]) / "skills/paseo-cto/scripts/upgrade.py"
spec = importlib.util.spec_from_file_location("upgrade", path)
upgrade = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upgrade)

problems = []
if upgrade.base_version("9.2.0+codex.20260803174558") != "9.2.0":
    problems.append("the Codex cachebuster suffix is not stripped")
if upgrade.base_version(None) is not None:
    problems.append("an absent version is not None")
for good in ("v9.2.0", "v10.0.1"):
    if not upgrade.TAG_RE.match(f"refs/tags/{good}"):
        problems.append(f"{good} rejected")
for bad in ("v9.2", "main", "v9.2.0-rc1"):
    if upgrade.TAG_RE.match(f"refs/tags/{bad}"):
        problems.append(f"{bad} accepted")

state = {"host": "Claude", "ref": None, "version": None, "commit": None,
         "siblings": ["team@maggnus"]}
claude = upgrade.claude_plan("v9.2.0", state)
codex = upgrade.codex_plan("v9.2.0", {**state, "host": "Codex"})
if ["claude", "plugin", "install", "team@maggnus", "--scope", "user"] != claude[-1]:
    problems.append("a sibling plugin from the same marketplace is not reinstalled on Claude")
if ["codex", "plugin", "add", "team@maggnus"] != codex[-1]:
    problems.append("a sibling plugin from the same marketplace is not reinstalled on Codex")
if not any("maggnus/agentic-plugins@v9.2.0" in command for command in claude):
    problems.append("the Claude marketplace is not re-pinned to the tag")
if not any(command[-2:] == ["--ref", "v9.2.0"] for command in codex):
    problems.append("the Codex marketplace is not re-pinned to the tag")
if not upgrade.TOLERATED & set(claude[0]) or not upgrade.TOLERATED & set(codex[0]):
    problems.append("removal failures are not tolerated")
if upgrade.TOLERATED & set(claude[-1]):
    problems.append("an install failure would be tolerated")

raise SystemExit("; ".join(problems) if problems else 0)
PY

expect_pass "token economy policy is shared by every role" python3 - "$plugin_root" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
files = {
    "assignment": root / "skills/paseo-cto/references/assignment-contract.md",
    "validation": root / "skills/paseo-cto/references/validation-budget.md",
    "review": root / "skills/paseo-cto/references/review-gate.md",
    "runtime": root / "skills/paseo-cto/references/execution-plan.md",
    "fleet": root / "skills/paseo-cto/references/fleet-operations.md",
    "roles": root / "skills/paseo-cto/references/roles-and-providers.md",
    "builder": root / "skills/paseo-builder/SKILL.md",
    "reviewer": root / "skills/paseo-reviewer/SKILL.md",
    "researcher": root / "skills/paseo-researcher/SKILL.md",
}
text = {name: " ".join(path.read_text().split()) for name, path in files.items()}
required = {
    "assignment": ("hard ceiling of 1800 characters", "one negative half per load-bearing claim"),
    "validation": ("composition preflight runs after integration", "not to every command"),
    "review": ("not inherited from its parent card", "ceremonial mutation"),
    "runtime": ("returnSummary", "at most twelve material events", "ceremonyMinutes"),
    "fleet": ("An unrelated atom always starts a fresh session",),
    "roles": ("<minimum>..<maximum>", "Critical work and review use the maximum tier"),
    "builder": ("Return within 1800 characters",),
    "reviewer": ("Return within 1800 characters",),
    "researcher": ("Return within 1800 characters",),
}
problems = []
for name, needles in required.items():
    for needle in needles:
        if needle not in text[name]:
            problems.append(f"{name} lacks {needle!r}")
for name in ("assignment", "builder", "reviewer", "researcher"):
    if "2500 characters" in text[name]:
        problems.append(f"{name} retains the old return budget")
raise SystemExit("; ".join(problems) if problems else 0)
PY

expect_pass "review scope prevents orchestration amplification" python3 - "$plugin_root" <<'PY'
from pathlib import Path
import json
import sys

root = Path(sys.argv[1])
skill = " ".join((root / "skills/paseo-cto/SKILL.md").read_text().split())
review = " ".join((root / "skills/paseo-cto/references/review-gate.md").read_text().split())
bootstrap = " ".join((root / "skills/paseo-cto/references/project-bootstrap.md").read_text().split())
assignment = " ".join((root / "skills/paseo-cto/references/assignment-contract.md").read_text().split())
settings = json.loads((root / "skills/paseo-cto/templates/SETTINGS.template.json").read_text())
problems = []
required = {
    "skill": (
        "Read-only intent always takes precedence",
        "stop the operating heartbeat",
        "does not reconfigure an existing run",
        "without a standalone review",
        "After two auxiliary research or review returns",
        "Do not turn a product blocker into a process project",
    ),
    "review": (
        "does not receive a separate review",
        "Ordinary CTO work-tree and contract edits",
        "does not trigger a separate contract review",
        "same reviewer and retained evidence",
        "a realistic defect could directly violate security",
        "Uncertainty prevents a Routine classification but never creates Critical by itself",
    ),
    "bootstrap": (
        "not to each task contract",
        "Repeat it only for a material rewrite",
    ),
    "assignment": ("otherwise the CTO verifies its sources",),
}
for name, body in (("skill", skill), ("review", review), ("bootstrap", bootstrap), ("assignment", assignment)):
    for needle in required[name]:
        if needle not in body:
            problems.append(f"{name} lacks {needle!r}")
for body_name, body in (("skill", skill), ("review", review)):
    if "every returned outcome" in body.lower():
        problems.append(f"{body_name} retains unconditional returned-outcome review")
budget = settings.get("charter", {}).get("fleetBudget", {})
if settings.get("schema") != 4 or set(budget) != {"max_live_tasks", "max_live_agents"}:
    problems.append("settings template lacks the two schema-4 fleet ceilings")
raise SystemExit("; ".join(problems) if problems else 0)
PY

expect_pass "release tags remain immutable" python3 - "$plugin_root" <<'PY'
from pathlib import Path
import sys

release = (Path(sys.argv[1]) / "scripts/release.sh").read_text()
problems = []
for forbidden in ("git tag -d", 'git push origin "$tag" --force'):
    if forbidden in release:
        problems.append(f"release script retains {forbidden!r}")
for required in ('refs/tags/$tag', "bump the manifest version", "git status --porcelain"):
    if required not in release:
        problems.append(f"release script lacks {required!r}")
raise SystemExit("; ".join(problems) if problems else 0)
PY

expect_pass "workspace and agent titles share one strict identity" python3 - "$plugin_root" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1]) / "skills/paseo-cto/references"
files = {
    "roles": " ".join((root / "roles-and-providers.md").read_text().split()),
    "fleet": " ".join((root / "fleet-operations.md").read_text().split()),
    "core": " ".join((root / "paseo-core-commands.md").read_text().split()),
    "catalog": " ".join((root / "paseo-command-catalog.md").read_text().split()),
}
required = {
    "roles": (
        "create_workspace.title",
        "create_agent.title",
        "byte-identical string",
        "rename_workspace",
    ),
    "fleet": (
        "create_workspace(title:<derived-agent-title>)",
        "create_agent(workspaceId, title:<the-same-derived-agent-title>)",
        "This equality is strict",
    ),
    "core": (
        'title:<agentTitle>',
        'verify returned workspace.title == agentTitle',
        "must be byte-identical",
    ),
    "catalog": (
        "Set `title` to the exact derived agent title",
        "equal the workspace title exactly",
    ),
}
problems = [
    f"{name} lacks {needle!r}"
    for name, needles in required.items()
    for needle in needles
    if needle not in files[name]
]
raise SystemExit("; ".join(problems) if problems else 0)
PY

expect_pass "one snapshot cadence across every document" python3 - "$plugin_root" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
files = {
    "skill": root / "skills/paseo-cto/SKILL.md",
    "status": root / "skills/paseo-cto/references/status-and-reporting.md",
    "fleet": root / "skills/paseo-cto/references/fleet-operations.md",
    "readme": root / "README.md",
}
text = {name: " ".join(path.read_text().split()) for name, path in files.items()}
required = {
    "skill": ("otherwise post one quiet liveness line",),
    "status": ("Fleet steady ·", "on each heartbeat reconcile and on a material event"),
    "fleet": ("otherwise post one quiet liveness line",),
    "readme": ("a single quiet liveness line otherwise",),
}
retired = (
    "even when no state changed",
    "always posts the snapshot",
    "deliberately repeated",
    "even when nothing changed",
)
problems = []
for name, needles in required.items():
    for needle in needles:
        if needle not in text[name]:
            problems.append(f"{name} lacks {needle!r}")
for name, body in text.items():
    for needle in retired:
        if needle in body:
            problems.append(f"{name} retains the retired rule {needle!r}")
raise SystemExit("; ".join(problems) if problems else 0)
PY

expect_pass "a retired record is deleted, not archived forever" python3 - "$plugin_root" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1]) / "skills/paseo-cto"
cleanup = " ".join((root / "references/cleanup-and-close.md").read_text().split())
skill = " ".join((root / "SKILL.md").read_text().split())
problems = []
for needle in (
    "Delete the record once the card is integrated",
    "drop both records from the runtime checkpoint",
    "Paseo archival preserves the session journal",
    "not a substitute for the source-linked evidence",
    "the working copy goes, the history does not",
):
    if needle not in cleanup:
        problems.append(f"cleanup lacks {needle!r}")
if "Spend context deliberately" not in skill:
    problems.append("SKILL.md lacks the context policy section")
raise SystemExit("; ".join(problems) if problems else 0)
PY

expect_pass "review depth names one performer everywhere" python3 - "$plugin_root" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
files = {
    "gate": root / "skills/paseo-cto/references/review-gate.md",
    "skill": root / "skills/paseo-cto/SKILL.md",
    "contract": root / "skills/paseo-cto/references/assignment-contract.md",
    "budget": root / "skills/paseo-cto/references/validation-budget.md",
}
text = {name: " ".join(path.read_text().split()) for name, path in files.items()}
required = {
    "gate": (
        "The CTO accepts a `Routine` or plain `Significant` outcome itself",
        "go to a non-author reviewer",
        "A change the CTO authored",
        "Whoever performs the inspection",
    ),
    "skill": (
        "it accepts a `Routine` or plain `Significant` outcome on the diff itself",
        "and of any change it authored",
    ),
    "contract": ("name the review owner",),
    "budget": ("CTO acceptance read",),
}
retired = (
    "A gate review is always delegated",
    "never performs that review itself",
    "always delegated to a non-author agent",
    "Routine second look",
    "lightweight second look",
)
problems = [
    f"{name} lacks {needle!r}"
    for name, needles in required.items()
    for needle in needles
    if needle not in text[name]
]
for path in sorted(root.glob("skills/**/*.md")):
    body = " ".join(path.read_text().split())
    problems += [
        f"{path.name} retains the retired rule {needle!r}"
        for needle in retired
        if needle in body
    ]
raise SystemExit("; ".join(problems) if problems else 0)
PY

expect_pass "the additive-edit exception is stated on every side" python3 - "$plugin_root" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1]) / "skills"
text = {
    name: " ".join((root / path).read_text().split())
    for name, path in {
        "contract": "paseo-cto/references/assignment-contract.md",
        "builder": "paseo-builder/SKILL.md",
        "reviewer": "paseo-reviewer/SKILL.md",
        "gate": "paseo-cto/references/review-gate.md",
        "roles": "paseo-cto/references/roles-and-providers.md",
    }.items()
}
required = {
    "contract": (
        "a purely additive edit to a file no running task owns",
        "is named in `No-touch`",
        "at most one running task is admitted per such file",
    ),
    "builder": (
        "a purely additive edit the contracted change forces",
        "Declare each such edit as its own item in the return",
        "is not named in `No-touch`",
    ),
    "reviewer": ("against the contract's write zone and `No-touch`",),
    "gate": ("checks every changed path against",),
    "roles": ("A write outside its write zone but inside its worktree",),
}
problems = [
    f"{name} lacks {needle!r}"
    for name, needles in required.items()
    for needle in needles
    if needle not in text[name]
]
raise SystemExit("; ".join(problems) if problems else 0)
PY

expect_pass "every role is invocable from both hosts" python3 - "$plugin_root" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
problems = []
for skill_file in sorted(root.glob("skills/*/SKILL.md")):
    name = skill_file.parent.name
    header = " ".join(skill_file.read_text().split())
    if not (skill_file.parent / "agents/openai.yaml").is_file():
        problems.append(f"{name} has no Codex interface metadata")
    if name == "paseo-cto":
        continue
    for form in (f"$paseo-cto:{name}", f"/paseo-cto:{name}"):
        if form not in header:
            problems.append(f"{name} does not name the {form!r} invocation")
contract = " ".join(
    (root / "skills/paseo-cto/references/assignment-contract.md").read_text().split()
)
for form in ("`$paseo-cto:paseo-<role>` in Codex", "`/paseo-cto:paseo-<role>` in Claude"):
    if form not in contract:
        problems.append(f"the assignment contract does not name {form!r}")
raise SystemExit("; ".join(problems) if problems else 0)
PY

printf 'test: %s contract checks passed\n' "$passes"

bash "$script_dir/test-work-tree.sh"
