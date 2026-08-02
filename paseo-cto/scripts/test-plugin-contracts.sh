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

transfer_repo="$scratch/transfer"
mkdir -p "$transfer_repo"
git -C "$transfer_repo" init -q
git -C "$transfer_repo" config user.name "Paseo CTO test"
git -C "$transfer_repo" config user.email "paseo-cto-test@example.invalid"

cat > "$transfer_repo/EXECUTION.md" <<'EOF'
# Execution

#### A-1 — Accepted outcome — `[~]`

**Outcome.** One accepted result.

**Risk.** `Routine`: bounded consequence.

**Maturity.** `BUILD`

**Acceptance.** The observable result exists.

**Current state.** `active` — implementation complete.

#### B-1 — Remaining outcome — `[ ]`

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

#### B-1 — Remaining outcome — `[ ]`

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

printf 'test: %s contract checks passed\n' "$passes"
