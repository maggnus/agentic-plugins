#!/usr/bin/env bash
# Reference check for source evidence in durable Paseo CTO Markdown documents.
#
# Copy this file into the project's script home. Pass the execution plan, acceptance history, review
# reports, research reports, and decision records that belong to the gate:
#
#   ./check-source-links.sh docs/EXECUTION.md docs/ACCEPTANCE.md artifacts/review-A-14.md
#
# The check ignores fenced examples and complete Markdown links. Outside those regions it rejects
# mechanically recognizable bare Git SHAs and repository file paths. It cannot prove that a link
# points to the correct commit; the reviewer still verifies the target.

set -uo pipefail

if [ "$#" -eq 0 ]; then
  set -- EXECUTION.md ACCEPTANCE.md
fi

violations=0

for source_doc in "$@"; do
  if [ ! -f "$source_doc" ]; then
    printf 'source links: %s not found\n' "$source_doc" >&2
    violations=$((violations + 1))
    continue
  fi

  while IFS= read -r violation; do
    [ -n "$violation" ] || continue
    printf '%s\n' "$violation" >&2
    violations=$((violations + 1))
  done < <(
    awk -v file="$source_doc" '
      /^```/ { fenced = !fenced; next }
      fenced { next }
      {
        line = $0
        # Remove complete Markdown links and URLs before looking for bare source identities.
        while (match(line, /\[[^][]*\]\([^()]*\)/))
          line = substr(line, 1, RSTART - 1) substr(line, RSTART + RLENGTH)
        gsub(/https?:\/\/[^[:space:])]+/, "", line)
        # Placeholder syntax describes a format and does not identify a real source.
        gsub(/<[^<>]*>/, "", line)

        if (line ~ /(^|[^[:alnum:]])[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]([0-9a-f]{1,33})?([^[:alnum:]]|$)/)
          printf "source links: %s:%d contains a bare commit identity\n", file, NR

        if (line ~ /([[:alnum:]_.-]+\/)+[[:alnum:]_.-]+\.(go|rs|py|ts|tsx|js|jsx|java|kt|swift|c|h|cpp|hpp|rb|php|cs|sql|proto|json|ya?ml|toml|md|sh)(:[0-9]+(-[0-9]+)?)?/ ||
            line ~ /(^|[^[:alnum:]_.-])[[:alnum:]_.-]+\.(go|rs|py|ts|tsx|js|jsx|java|kt|swift|c|h|cpp|hpp|rb|php|cs|sql|proto|json|ya?ml|toml|md|sh)(:[0-9]+(-[0-9]+)?)?([^[:alnum:]_.-]|$)/)
          printf "source links: %s:%d contains a bare repository file reference\n", file, NR
      }
    ' "$source_doc"
  )
done

if [ "$violations" -ne 0 ]; then
  printf 'source links: %d violation(s)\n' "$violations" >&2
  exit 1
fi

printf 'source links: all selected documents use Markdown links for recognizable source evidence\n'
