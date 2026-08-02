#!/usr/bin/env bash
# Reference check for an owner-facing Paseo CTO status message.
#
# Copy this into the project's own script home; do not call it from the plugin path, which carries a
# version and differs between Claude and Codex.
#
#   ./check-owner-status.sh status.txt
#   printf '%s' "$message" | ./check-owner-status.sh
#
# It judges FORM only — the part a script can decide. The real gate is the four questions in
# references/status-and-reporting.md: whether the owner can tell, from this text alone, what limits
# progress, what materially changed, why it matters, and what happens next. A message can pass every
# rule below and still fail that.
#
# Checked here:
#   - total length under the ceiling — there is no minimum, and a two-sentence status is complete;
#   - at most four paragraphs;
#   - the configured reporting language where it is mechanically distinguishable, with no first or
#     second person;
#   - no greeting, thanks, apology, praise, blame, or unsupported hedging;
#   - no banned emotional, literary or jargon framing;
#   - no internal mechanics vocabulary (commits, branches, agents, rounds, file names, counts);
#   - no mandated template headings (FRONTIER/DECISION/IMPACT/NEXT and friends);
#   - no trailing "separately/aside" paragraph carrying internal history.
#
# Exit status is the number of violations, so a caller can gate on zero.

set -uo pipefail

MAX_CHARS="${MAX_CHARS:-900}"              # a ceiling, never a target: shorter is better
HARD_MAX_CHARS="${HARD_MAX_CHARS:-1600}"   # owner decision or critical risk only
MAX_PARAGRAPHS="${MAX_PARAGRAPHS:-4}"      # one or two preferred
REPORTING_LANGUAGE="${REPORTING_LANGUAGE:-English}"

src="${1:-/dev/stdin}"
text="$(cat "$src")"
violations=0

fail() {
  printf '✗ %s\n' "$1" >&2
  violations=$((violations + 1))
}

# --- length -----------------------------------------------------------------
chars="$(printf '%s' "$text" | wc -m | tr -d ' ')"
if [ "$chars" -gt "$HARD_MAX_CHARS" ]; then
  fail "length $chars exceeds the hard ceiling $HARD_MAX_CHARS; no owner decision justifies this much"
elif [ "$chars" -gt "$MAX_CHARS" ]; then
  printf '! length %s over the %s ceiling — allowed only for an owner decision or a critical risk\n' \
    "$chars" "$MAX_CHARS" >&2
fi

# --- paragraph count --------------------------------------------------------
paragraphs="$(printf '%s\n' "$text" | awk 'BEGIN{n=0;blank=1} {if ($0 ~ /^[[:space:]]*$/) blank=1; else {if (blank) n++; blank=0}} END{print n}')"
if [ "$paragraphs" -gt "$MAX_PARAGRAPHS" ]; then
  fail "$paragraphs paragraphs; the policy allows $MAX_PARAGRAPHS"
fi

# --- first person -----------------------------------------------------------
# English and Russian are built in. A project using another language extends the pattern through
# FIRST_PERSON_PATTERN without modifying its local copy of this check.
first_person="${FIRST_PERSON_PATTERN:-(^|[^[:alnum:]])([Ii]|[Ww]e|[Oo]ur|[Mm]y|[Mm]ine|[Uu]s|я|мы|наш|наша|наше|наши|нами|нам|мною|меня|мне)([^[:alnum:]]|$)}"
if printf '%s' "$text" | grep -qiE "$first_person"; then
  fail "first person present: $(printf '%s' "$text" | grep -oiE "$first_person" | tr -d '\n' | head -c 60)"
fi

# --- configured language and reader address --------------------------------
# English is only the bootstrap default. Any project-local REPORTING_LANGUAGE value overrides it.
# Character detection is deliberately narrow: arbitrary human languages cannot be identified
# reliably by a shell check, so semantic review remains authoritative.
case "$REPORTING_LANGUAGE" in
  English|english|en|en-*)
    if printf '%s' "$text" | grep -qE '[А-Яа-яЁё]'; then
      fail "Cyrillic prose present while REPORTING_LANGUAGE is $REPORTING_LANGUAGE"
    fi
    ;;
esac

second_person="${SECOND_PERSON_PATTERN:-(^|[^[:alnum:]])([Yy]ou|[Yy]our|[Yy]ours|[Yy]ourself|[Yy]ourselves|вы|ваш|ваша|ваше|ваши|вам|вами)([^[:alnum:]]|$)}"
if printf '%s' "$text" | grep -qiE "$second_person"; then
  fail "second person present: $(printf '%s' "$text" | grep -oiE "$second_person" | tr -d '\n' | head -c 60)"
fi

social_or_hedged="${SOCIAL_OR_HEDGED_PATTERN:-(^|[^[:alnum:]])(hello|hi|thanks|thank you|sorry|apolog(y|ize|ise|etic)|please|great work|well done|seems?|probably|apparently|hopefully|likely|привет|спасибо|пожалуйста|извин(ите|яюсь|ения)|кажется|вероятно|надеюсь)([^[:alnum:]]|$)}"
if printf '%s' "$text" | grep -qiE "$social_or_hedged"; then
  fail "social, evaluative, or unsupported hedging language present: $(printf '%s' "$text" | grep -oiE "$social_or_hedged" | tr -d '\n' | head -c 80)"
fi

# --- banned framing and evaluation ------------------------------------------
# Patterns, not fixed strings: the failures seen in practice inflect and split.
banned_re=(
  'тяж[еёо][лf]'                       # "самых тяжёлых пунктов" — an evaluation of effort
  'самы[йея] (содержательн|ценн|важн|значим)'
  'поразительн|удивительн|впечатля|блестящ|прекрасн|отличн'
  'к сожалению|к счастью|наконец-то|увы'
  'гипотеза[^.]{0,60}выжил|выжил[^.]{0,30}гипотеза'
  'заслужил|оправдал себя|окупил'
  'приземл|карта ушла|ушла на|ушёл с|ушел с'
  'most (substantial|valuable|important)|strikingly|remarkably|impressive'
  '(un)?fortunately|earned its|survived the|heavy lift|finally,'
)
for re in "${banned_re[@]}"; do
  hit="$(printf '%s' "$text" | grep -oiE "$re" | head -1 || true)"
  [ -n "$hit" ] && fail "banned framing: \"$hit\""
done

# --- internal mechanics -----------------------------------------------------
# Vocabulary that only means something to someone reading the run, not the product.
# shellcheck disable=SC2016 # Backticks in the final pattern are literal Markdown syntax.
internal_re=(
  'коммит|commit'
  'идентификатор|identifier'
  'рецензент|reviewer|исполнитель|builder|агент[а-я]*|agent'
  'ветк[аиуе]|branch|перемотк|fast-forward|rebase'
  'рабоч[а-я]+ (дерев|копи)|working tree|worktree|porcelain'
  'карточк|card|раунд|round [0-9]|верн(ул|ула|ули)[^.]{0,20}карт'
  '(зафиксировано|committed) [0-9]|[0-9]+ (шаг|коммит|файл|раунд|пункт|commits?|files?|rounds?)'
  'make check|git |exit=|`[a-z_]+\.(sh|go|ts|py|md)`|[a-z_/]+\.go:[0-9]'
)
for re in "${internal_re[@]}"; do
  hit="$(printf '%s' "$text" | grep -oiE "$re" | head -1 || true)"
  [ -n "$hit" ] && fail "internal mechanics: \"$hit\" — belongs in the review report"
done

# --- mandated headings ------------------------------------------------------
if printf '%s' "$text" | grep -qE '(^|[^[:alnum:]])(FRONTIER|DECISION|IMPACT|NEXT|STATUS|SUMMARY)[[:space:]]*:'; then
  fail "template heading present; an owner status has no mandated headings"
fi

# --- trailing internal-history paragraph ------------------------------------
tail_para="$(printf '%s\n' "$text" | awk -v RS='' 'END{print}')"
if printf '%s' "$tail_para" | grep -qiE '^(отдельно|к слову|попутно|between the|separately|as an aside|aside from)'; then
  fail "trailing aside paragraph: internal history belongs in the review report, not the status"
fi

if [ "$violations" -eq 0 ]; then
  printf '✓ owner status: form holds for %s (%s chars, %s paragraph(s))\n' \
    "$REPORTING_LANGUAGE" "$chars" "$paragraphs"
else
  printf '%s form violation(s); the four content questions are still unchecked\n' "$violations" >&2
fi
exit "$violations"
