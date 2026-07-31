#!/usr/bin/env bash
# Reference check for the Paseo CTO document standard.
#
# Copy this into the project's own script home and bind it to the project's validation gate. Do not
# call it from the plugin path: that path carries a version and differs between Claude and Codex.
#
#   PLAN_FILE=docs/EXECUTION.md ACCEPTANCE_FILE=docs/ACCEPTANCE.md ./check-plan-shape.sh
#
# It verifies the shape the CTO loop depends on, not the content:
#   - every card heading carries a stable ID and one of the three states;
#   - every card declares Outcome and Acceptance;
#   - a card in progress or done also declares Risk, from the allowed set — a not-started card may
#     still be unclassified, but nothing may be dispatched without a classification;
#   - a card declaring Residue also declares its Return condition, so an accepted defect is tracked
#     rather than remembered;
#   - a card at two or more review Rounds also declares Convergence, so the decision the second
#     return forces is visible in the plan and not only in the review;
#   - the acceptance table has a uniform column count and a non-empty time field per row.
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

fail=0
note() { printf '%s\n' "$1" >&2; fail=1; }

# Private scratch directory: a predictable /tmp name is writable by anyone on the machine.
work=$(mktemp -d "${TMPDIR:-/tmp}/plan-shape.XXXXXX")
trap 'rm -rf "$work"' EXIT INT TERM

[ -f "$PLAN_FILE" ] || { note "plan shape: $PLAN_FILE not found"; exit 1; }

# --- cards -------------------------------------------------------------------------------------
# A card runs from its heading to the next heading of the same or a higher level.
awk -v level="$CARD_HEADING_LEVEL" -v idpat="$CARD_ID_PATTERN" -v risks="$RISK_PATTERN" '
  function flush(   missing) {
    if (id == "") return
    missing = ""
    if (!has_outcome)    missing = missing " Outcome"
    if (!has_acceptance) missing = missing " Acceptance"
    # A not-started card may still be unclassified; anything in progress or done may not.
    if (!has_risk && state != "todo") missing = missing " Risk"
    # A residue is an accepted defect: without its return condition nobody is tracking it.
    if (has_residue && !has_return_condition) missing = missing " Return-condition (required by Residue)"
    # The second return forces a decision; record which one, in the plan, not only in the review.
    if (rounds >= 2 && !has_convergence) missing = missing " Convergence (required at Rounds >= 2)"
    if (missing != "") printf "plan shape: card %s (line %d) is missing:%s\n", id, start, missing
    if (has_risk && !risk_ok) printf "plan shape: card %s (line %d) has a risk outside {%s}\n", id, start, risks
    cards++
  }
  {
    if ($0 ~ ("^" level " ")) {
      flush()
      id = ""
      if ($2 ~ idpat) {
        id = $2; start = NR
        has_outcome = has_risk = has_acceptance = risk_ok = 0
        has_residue = has_return_condition = has_convergence = rounds = 0
        if      ($0 ~ /`\[x\]`[[:space:]]*$/) state = "done"
        else if ($0 ~ /`\[~\]`[[:space:]]*$/) state = "active"
        else if ($0 ~ /`\[ \]`[[:space:]]*$/) state = "todo"
        else {
          state = "todo"
          printf "plan shape: card %s (line %d) has no [ ] / [~] / [x] state\n", id, NR
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
  awk -v risks="$RISK_PATTERN" '
    /^\|/ {
      n = split($0, cell, "|") - 2
      if (width == 0) { width = n; header = NR; next }
      if ($2 ~ /^-+$/ || $0 ~ /^\|[-|: ]+\|$/) next
      if (n != width)
        printf "acceptance shape: line %d has %d columns, header has %d\n", NR, n, width
      gsub(/^[ \t]+|[ \t]+$/, "", cell[4]); gsub(/`/, "", cell[4])
      if (cell[4] != "" && cell[4] !~ "^(" risks ")$")
        printf "acceptance shape: line %d has risk \"%s\" outside {%s}\n", NR, cell[4], risks
      last = cell[n + 1]
      gsub(/^[ \t]+|[ \t]+$/, "", last)
      # DD/MM HH:MM (cost), local time; a bare n/a is reserved for rows that
      # predate the column.
      if (last != "n/a" && last !~ /^[0-9][0-9]\/[0-9][0-9] [0-9][0-9]:[0-9][0-9] \([^()]+\)$/)
        printf "acceptance shape: line %d has time \"%s\", want \"DD/MM HH:MM (<cost>)\" or n/a\n", NR, last
    }
  ' "$ACCEPTANCE_FILE" > "$work/acc-shape" || true
  if [ -s "$work/acc-shape" ]; then cat "$work/acc-shape" >&2; fail=1; fi
else
  note "plan shape: $ACCEPTANCE_FILE not found"
fi

if [ "$fail" -ne 0 ]; then
  echo "document standard: shape violations above" >&2
  exit 1
fi
echo "document standard: $cards cards and the acceptance table match the required shape"
