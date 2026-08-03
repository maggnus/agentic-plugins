#!/usr/bin/env bash
# Regression tests for document transfer, source references, and reporting register checks.

set -euo pipefail

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
plugin_root=$(CDPATH='' cd -- "$script_dir/.." && pwd)
templates="$plugin_root/skills/paseo-cto/templates"
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
  'Разрешение выпуска ожидает открытия производственного шлюза.' \
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

printf 'test: %s contract checks passed\n' "$passes"

bash "$script_dir/test-work-tree.sh"
