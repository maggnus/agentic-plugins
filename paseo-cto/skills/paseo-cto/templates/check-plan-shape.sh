#!/usr/bin/env bash
# Reference check for a frozen pre-work-tree execution document and its acceptance history.
#
# Current work lives in the permanent work tree and is validated by work.py check. This script
# describes the older shape — one execution document, one acceptance history, and the atomic
# transfer between them — and stays available for a project that keeps such documents as frozen
# history after adoption. Do not apply it to the work tree.
#
# Copy this into the project's own script home and bind it to the project's validation gate. Do not
# call it from the plugin path: that path carries a version and differs between Claude and Codex.
#
#   PLAN_FILE=docs/EXECUTION.md ACCEPTANCE_FILE=docs/ACCEPTANCE.md ./check-plan-shape.sh
#
# It verifies the shape the CTO loop depends on, not the content:
#   - every card heading starts with one of the three markers, followed by a stable ID;
#   - every card declares Outcome and Acceptance;
#   - every card declares an exact Current state token whose value matches its heading marker;
#   - a card in progress or done also declares Risk, from the allowed set — a not-started card may
#     still be unclassified, but nothing may be dispatched without a classification;
#   - the same card also declares Maturity, from the allowed set: Risk says what a defect would cost,
#     Maturity says what the card promised to produce, and a landing decision needs both;
#   - a card declaring Residue also declares its Return condition, so an accepted defect is tracked
#     rather than remembered;
#   - a card past the reviewer's two-return budget also declares Convergence, so the decision that
#     extended or ended the loop is visible in the plan and not only in the review, and no card
#     records more returns than the four-return ceiling allows;
#   - the acceptance table has a uniform column count and a non-empty time field per row.
#   - closure and durable-evidence cells are Markdown source links;
#   - a stable ID cannot exist in both current execution and acceptance history;
#   - with BASE_REF set, every removed card is added to acceptance and every new acceptance row came
#     from the prior execution plan in the same change.
#
# A card is a heading at CARD_HEADING_LEVEL whose first token matches CARD_ID_PATTERN, so ordinary
# subsections in the same document are left alone.
#
# Extend the copy with what only the project knows — a dashboard-versus-cards cross-check is the
# usual first addition.

set -euo pipefail

PLAN_FILE="${PLAN_FILE:-EXECUTION.md}"
ACCEPTANCE_FILE="${ACCEPTANCE_FILE:-ACCEPTANCE.md}"
CARD_HEADING_LEVEL="${CARD_HEADING_LEVEL:-####}"
# A stable plan ID: a prefix, a dash, then digits and optional child suffixes (LF-03d, A-14.2, W2/3).
CARD_ID_PATTERN="${CARD_ID_PATTERN:-^[A-Za-z][A-Za-z0-9]*-[0-9][0-9A-Za-z./]*$}"
# Rows accepted before a policy existed may carry a historical classification.
RISK_PATTERN="${RISK_PATTERN:-Routine|Significant|Critical|pre-policy}"
MATURITY_PATTERN="${MATURITY_PATTERN:-RESEARCH|DESIGN|BUILD|OPERATIONALIZATION|pre-policy}"
# The reviewer's own budget, and the ceiling once the CTO has granted the bounded second budget.
RETURN_BUDGET="${RETURN_BUDGET:-2}"
RETURN_CEILING="${RETURN_CEILING:-4}"
BASE_REF="${BASE_REF:-}"

fail=0
note() { printf '%s\n' "$1" >&2; fail=1; }

# Private scratch directory: a predictable /tmp name is writable by anyone on the machine.
work=$(mktemp -d "${TMPDIR:-/tmp}/plan-shape.XXXXXX")
trap 'rm -rf "$work"' EXIT INT TERM
touch "$work/plan-ids" "$work/acceptance-ids"

[ -f "$PLAN_FILE" ] || { note "plan shape: $PLAN_FILE not found"; exit 1; }

# --- cards -------------------------------------------------------------------------------------
# A card runs from its heading to the next heading of the same or a higher level.
awk -v level="$CARD_HEADING_LEVEL" -v idpat="$CARD_ID_PATTERN" -v risks="$RISK_PATTERN" \
    -v maturities="$MATURITY_PATTERN" -v cardsfile="$work/plan-ids" \
    -v return_budget="$RETURN_BUDGET" -v return_ceiling="$RETURN_CEILING" '
  function begin_card(card_id, card_state, line_number) {
    id = card_id; state = card_state; start = line_number
    has_outcome = has_risk = has_acceptance = risk_ok = 0
    has_maturity = maturity_ok = 0
    has_current_state = current_state_ok = 0
    has_residue = has_return_condition = has_convergence = rounds = 0
  }
  function flush(   missing) {
    if (id == "") return
    print id > cardsfile
    missing = ""
    if (!has_outcome)    missing = missing " Outcome"
    if (!has_acceptance) missing = missing " Acceptance"
    if (!has_current_state) missing = missing " Current-state"
    # A not-started card may still be unclassified; anything in progress or done may not.
    if (!has_risk && state != "todo") missing = missing " Risk"
    # Without it the next session guesses what the card promised, and judges it at the wrong level.
    if (!has_maturity && state != "todo") missing = missing " Maturity"
    # A residue is an accepted defect: without its return condition nobody is tracking it.
    if (has_residue && !has_return_condition) missing = missing " Return-condition (required by Residue)"
    # Two returns belong to the reviewer; going past them is a CTO decision, recorded in the plan.
    if (rounds > return_budget && !has_convergence)
      missing = missing " Convergence (required above Rounds " return_budget ")"
    if (missing != "") printf "plan shape: card %s (line %d) is missing:%s\n", id, start, missing
    if (rounds > return_ceiling)
      printf "plan shape: card %s (line %d) records %d returns; the ceiling is %d\n", id, start, rounds, return_ceiling
    if (has_risk && !risk_ok) printf "plan shape: card %s (line %d) has a risk outside {%s}\n", id, start, risks
    if (has_maturity && !maturity_ok) printf "plan shape: card %s (line %d) has a maturity outside {%s}\n", id, start, maturities
    if (has_current_state && !current_state_ok) printf "plan shape: card %s (line %d) has an invalid or marker-mismatched Current state\n", id, start
    if (state == "done") printf "plan shape: card %s (line %d) is [x]; transfer it atomically to acceptance before this gate\n", id, start
    cards++
  }
  {
    if ($0 ~ ("^" level " ")) {
      flush()
      id = ""
      raw = $0
      sub("^" level "[[:space:]]+", "", raw)
      heading = raw
      marker_state = ""
      if      (heading ~ /^\[x\][[:space:]]+/) { marker_state = "done";   sub(/^\[x\][[:space:]]+/, "", heading) }
      else if (heading ~ /^\[~\][[:space:]]+/) { marker_state = "active"; sub(/^\[~\][[:space:]]+/, "", heading) }
      else if (heading ~ /^\[ \][[:space:]]+/) { marker_state = "todo";   sub(/^\[ \][[:space:]]+/, "", heading) }

      candidate = heading
      sub(/[[:space:]].*$/, "", candidate)
      if (candidate ~ idpat && marker_state != "") {
        begin_card(candidate, marker_state, NR)
      } else {
        # Find a stable ID so a legacy suffix marker fails explicitly instead of disappearing as a
        # non-card heading. The canonical current form is still accepted only by the branch above.
        count = split(raw, part, /[[:space:]]+/)
        card_id = ""
        for (part_index = 1; part_index <= count; part_index++) {
          if (part[part_index] ~ idpat) { card_id = part[part_index]; break }
        }
        if (card_id != "") {
          inferred_state = "todo"
          if      (raw ~ /`?\[x\]`?[[:space:]]*$/) inferred_state = "done"
          else if (raw ~ /`?\[~\]`?[[:space:]]*$/) inferred_state = "active"
          begin_card(card_id, inferred_state, NR)
          printf "plan shape: card %s (line %d) must start with [ ] / [~] / [x] before its ID\n", id, NR
        }
      }
      next
    }
    # A shallower heading closes the current card.
    if ($0 ~ /^#{1,6} / && length($0) - length(substr($0, index($0, " "))) < length(level)) { flush(); id = "" }
    if (id == "") next
    # Anchored at line start: a field nested in a child bullet describes the child, not this card.
    if ($0 ~ /^\*\*Outcome/)    has_outcome = 1
    if ($0 ~ /^\*\*Acceptance/) has_acceptance = 1
    if ($0 ~ /^\*\*Risk/) {
      has_risk = 1
      if ($0 ~ "(" risks ")") risk_ok = 1
    }
    if ($0 ~ /^\*\*Maturity/) {
      has_maturity = 1
      if ($0 ~ "(" maturities ")") maturity_ok = 1
    }
    if ($0 ~ /^\*\*Current state/) {
      has_current_state = 1
      token = $0
      sub(/^[^`]*`/, "", token)
      sub(/`.*/, "", token)
      if (state == "todo" && token ~ /^(ready|blocked|deferred)$/) current_state_ok = 1
      if (state == "active" && token ~ /^(active|review|rework)$/) current_state_ok = 1
      if (state == "done" && token == "done") current_state_ok = 1
    }
    if ($0 ~ /^\*\*Residue/)          has_residue = 1
    if ($0 ~ /^\*\*Return condition/) has_return_condition = 1
    if ($0 ~ /^\*\*Convergence/)      has_convergence = 1
    # "**Rounds.** 3" or "**Rounds:** 3 — ..." — the first integer on the line is the count.
    if ($0 ~ /^\*\*Rounds/) {
      line = $0
      sub(/^\*\*Rounds[^0-9]*/, "", line)
      rounds = line + 0
    }
  }
  END { flush(); printf "cards=%d\n", cards > "/dev/stderr" }
' "$PLAN_FILE" > "$work/plan-shape" 2>"$work/plan-count" || true

cards=$(sed -n 's/^cards=//p' "$work/plan-count")

if [ -s "$work/plan-shape" ]; then cat "$work/plan-shape" >&2; fail=1; fi

[ "${cards:-0}" -gt 0 ] || note "plan shape: $PLAN_FILE declares no cards at level '$CARD_HEADING_LEVEL'"

# --- acceptance table --------------------------------------------------------------------------
if [ -f "$ACCEPTANCE_FILE" ]; then
  awk -v risks="$RISK_PATTERN" -v idsfile="$work/acceptance-ids" '
    /^\|/ {
      n = split($0, cell, "|") - 2
      if (width == 0) { width = n; header = NR; next }
      if ($2 ~ /^-+$/ || $0 ~ /^\|[-|: ]+\|$/) next
      if (n != width)
        printf "acceptance shape: line %d has %d columns, header has %d\n", NR, n, width
      id = cell[2]
      gsub(/^[ \t]+|[ \t]+$/, "", id); gsub(/`/, "", id)
      if (id != "") print id > idsfile
      gsub(/^[ \t]+|[ \t]+$/, "", cell[4]); gsub(/`/, "", cell[4])
      if (cell[4] != "" && cell[4] !~ "^(" risks ")$")
        printf "acceptance shape: line %d has risk \"%s\" outside {%s}\n", NR, cell[4], risks
      last = cell[n + 1]
      gsub(/^[ \t]+|[ \t]+$/, "", last)
      # DD/MM HH:MM (cost), local time; a bare n/a is reserved for rows that
      # predate the column.
      if (last != "n/a" && last !~ /^[0-9][0-9]\/[0-9][0-9] [0-9][0-9]:[0-9][0-9] \([^()]+\)$/)
        printf "acceptance shape: line %d has time \"%s\", want \"DD/MM HH:MM (<cost>)\" or n/a\n", NR, last
      closure = cell[6]; evidence = cell[7]
      if (closure !~ /\[[^][]+\]\([^()]+\)/)
        printf "acceptance shape: line %d closure record is not a Markdown source link\n", NR
      if (evidence !~ /\[[^][]+\]\([^()]+\)/)
        printf "acceptance shape: line %d durable evidence is not a Markdown source link\n", NR
    }
  ' "$ACCEPTANCE_FILE" > "$work/acc-shape" || true
  if [ -s "$work/acc-shape" ]; then cat "$work/acc-shape" >&2; fail=1; fi
else
  note "plan shape: $ACCEPTANCE_FILE not found"
fi

sort -u "$work/plan-ids" -o "$work/plan-ids"
sort -u "$work/acceptance-ids" -o "$work/acceptance-ids"

comm -12 "$work/plan-ids" "$work/acceptance-ids" > "$work/duplicate-ids"
if [ -s "$work/duplicate-ids" ]; then
  while IFS= read -r id; do note "document transfer: $id exists in both execution and acceptance"; done < "$work/duplicate-ids"
fi

extract_plan_ids() {
  awk -v level="$CARD_HEADING_LEVEL" -v idpat="$CARD_ID_PATTERN" \
    '$0 ~ ("^" level " ") {
      raw = $0
      sub("^" level "[[:space:]]+", "", raw)
      heading = raw
      sub(/^\[x\][[:space:]]+/, "", heading)
      sub(/^\[~\][[:space:]]+/, "", heading)
      sub(/^\[ \][[:space:]]+/, "", heading)
      candidate = heading
      sub(/[[:space:]].*$/, "", candidate)
      if (candidate ~ idpat) { print candidate; next }
      count = split(raw, part, /[[:space:]]+/)
      for (part_index = 1; part_index <= count; part_index++) {
        if (part[part_index] ~ idpat) { print part[part_index]; next }
      }
    }' "$1" | sort -u
}

extract_acceptance_ids() {
  awk '/^\|/ { n = split($0, cell, "|") - 2; if (!seen++) next; if ($0 ~ /^\|[-|: ]+\|$/) next; id = cell[2]; gsub(/^[ \t]+|[ \t]+|`/, "", id); if (id != "") print id }' "$1" | sort -u
}

if [ -n "$BASE_REF" ]; then
  case "$PLAN_FILE:$ACCEPTANCE_FILE" in
    /*|*:/*) note "document transfer: BASE_REF requires repository-relative PLAN_FILE and ACCEPTANCE_FILE" ;;
    *)
      git_prefix=$(git rev-parse --show-prefix 2>/dev/null || true)
      git_plan_path="${git_prefix}${PLAN_FILE#./}"
      git_acceptance_path="${git_prefix}${ACCEPTANCE_FILE#./}"
      if [ -z "$(git rev-parse --show-toplevel 2>/dev/null || true)" ]; then
        note "document transfer: BASE_REF requires a Git worktree"
      elif ! git show "$BASE_REF:$git_plan_path" > "$work/prior-plan" 2>/dev/null; then
        note "document transfer: cannot read $PLAN_FILE at BASE_REF $BASE_REF"
      elif ! git show "$BASE_REF:$git_acceptance_path" > "$work/prior-acceptance" 2>/dev/null; then
        note "document transfer: cannot read $ACCEPTANCE_FILE at BASE_REF $BASE_REF"
      else
        extract_plan_ids "$work/prior-plan" > "$work/prior-plan-ids"
        extract_acceptance_ids "$work/prior-acceptance" > "$work/prior-acceptance-ids"
        comm -23 "$work/prior-plan-ids" "$work/plan-ids" > "$work/removed-plan-ids"
        comm -13 "$work/prior-acceptance-ids" "$work/acceptance-ids" > "$work/new-acceptance-ids"
        while IFS= read -r id; do
          grep -Fxq "$id" "$work/acceptance-ids" || note "document transfer: removed card $id has no acceptance row"
        done < "$work/removed-plan-ids"
        while IFS= read -r id; do
          grep -Fxq "$id" "$work/prior-plan-ids" || note "document transfer: new acceptance row $id was not in the prior execution plan"
          grep -Fxq "$id" "$work/plan-ids" && note "document transfer: accepted card $id remains in execution"
        done < "$work/new-acceptance-ids"
      fi
      ;;
  esac
fi

if [ "$fail" -ne 0 ]; then
  echo "document standard: shape violations above" >&2
  exit 1
fi
echo "document standard: $cards cards and the acceptance table match the required shape"
