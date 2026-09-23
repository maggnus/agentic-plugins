#!/usr/bin/env bash
# Plugin invariants and the four land.py cases. Checks properties, not phrasings.

set -euo pipefail

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
plugin_root=$(CDPATH='' cd -- "$script_dir/.." && pwd)
fail=0
problem() { echo "contracts: $*" >&2; fail=1; }

# --- text invariants -------------------------------------------------------------------------
python3 - "$plugin_root" <<'PY' || fail=1
import json, pathlib, re, sys
root = pathlib.Path(sys.argv[1])
errors = []
limits = {"paseo-cto": 250}
for skill in sorted(root.glob("skills/*/SKILL.md")):
    text = skill.read_text()
    name = skill.parent.name
    head = re.match(r"^---\nname: (.+)\ndescription: (.+)\n---\n", text)
    if not head or head.group(1) != name:
        errors.append(f"{skill}: front matter must name {name} and carry a description")
    lines = text.count("\n")
    if lines > limits.get(name, 60):
        errors.append(f"{skill}: {lines} lines, limit {limits.get(name, 60)}")
for doc in list(root.glob("skills/**/*.md")) + [root / "README.md"]:
    text = doc.read_text()
    prose = re.sub(r"`[^`\n]*`", "", re.sub(r"```.*?```", "", text, flags=re.S))
    for target in re.findall(r"\]\(([^)#:]+)(?:#[^)]*)?\)", prose):
        if not (doc.parent / target).exists():
            errors.append(f"{doc}: link {target} does not resolve")
    for retired in ("work.py", "ledger.py", "STATUS.md", "render_fleet", "references/"):
        if retired in text:
            errors.append(f"{doc}: mentions retired {retired}")
    for neighbour in ("russian-speech", "brief:", "team:", "/team", "/brief"):
        if neighbour in text:
            errors.append(f"{doc}: names another plugin ({neighbour})")
claude = json.loads((root / ".claude-plugin/plugin.json").read_text())
codex = json.loads((root / ".codex-plugin/plugin.json").read_text())
if claude["version"] != codex["version"].split("+codex.", 1)[0]:
    errors.append("Claude and Codex manifest versions differ")
for message in errors:
    print(f"contracts: {message}", file=sys.stderr)
sys.exit(1 if errors else 0)
PY

# --- land.py ---------------------------------------------------------------------------------
land="$plugin_root/scripts/land.py"
sandbox=$(mktemp -d)
trap 'rm -rf "$sandbox"' EXIT
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

git init -q --bare -b main "$sandbox/origin.git"
git clone -q "$sandbox/origin.git" "$sandbox/repo" 2>/dev/null
repo="$sandbox/repo"
cat > "$repo/BOARD.md" <<'MD'
| Task | State | Outcome | Commit |
|---|---|---|---|
| [T-1](t1.md) | active | first |  |
| [T-2](t2.md) | active | second |  |
| [T-3](t3.md) | active | third |  |
| [T-4](t4.md) | active | fourth |  |
MD
printf 'base\n' > "$repo/shared.txt"
printf '# T-1\n' > "$repo/t1.md"
git -C "$repo" add -A && git -C "$repo" commit -qm base && git -C "$repo" push -q origin HEAD:main

branch() { # name file content [base]
  git -C "$repo" switch -q -c "$1" "${4:-origin/main}"
  printf '%s\n' "$3" > "$repo/$2"
  git -C "$repo" add -A && git -C "$repo" commit -qm "$1"
  git -C "$repo" switch -q --detach origin/main
}
settings() { # check busy
  printf '{"land":{"board":"BOARD.md","check":"%s","busy":"%s","pollSeconds":1,"busyMaxMinutes":1,"deleteTaskFile":true}}' "$1" "$2" \
    > "$sandbox/settings.json"
}
run() { (cd "$repo" && python3 "$land" "$@" --settings "$sandbox/settings.json" 2>/dev/null); }
origin_head() { git -C "$sandbox/origin.git" rev-parse main; }

# 1. clean merge lands and marks the board
settings "true" ""
branch build/t1 one.txt one
out=$(run build/t1 T-1 --outcome "done well") || problem "clean merge exited $?"
[[ $out == "LANDED T-1 "* ]] || problem "clean merge printed: $out"
git -C "$repo" fetch -q origin
git -C "$repo" show origin/main:BOARD.md | grep -q '^| T-1 | done | done well | [0-9a-f]\{8\} |$' \
  || problem "board row of T-1 not marked done and unlinked"
git -C "$repo" cat-file -e origin/main:t1.md 2>/dev/null && problem "task file of T-1 not deleted"
[ ! -e "$sandbox/.land-T-1" ] || problem "merge worktree left behind"

# 2. conflict goes back to the author and leaves origin untouched
branch build/t2a shared.txt left
before=$(origin_head)
branch build/t2b shared.txt right
run build/t2a T-2 >/dev/null || problem "first half of the conflict case failed"
before=$(origin_head)
set +e; out=$(run build/t2b T-3); code=$?; set -e
[ "$code" -eq 2 ] || problem "conflict exited $code, expected 2"
[[ $out == "CONFLICT T-3: shared.txt" ]] || problem "conflict printed: $out"
[ "$(origin_head)" = "$before" ] || problem "conflict changed origin"

# 3. a failing check stops before the push
settings "false" ""
git -C "$repo" fetch -q origin
branch build/t4 four.txt four
before=$(origin_head)
set +e; out=$(run build/t4 T-4); code=$?; set -e
[ "$code" -eq 1 ] || problem "failing check exited $code, expected 1"
[[ $out == "FAILED T-4 at check: exit 1" ]] || problem "failing check printed: $out"
[ "$(origin_head)" = "$before" ] || problem "failing check changed origin"

# 4. a busy release is waited out, then the branch lands
touch "$sandbox/busy"
settings "true" "test -e $sandbox/busy"
( sleep 2; rm -f "$sandbox/busy" ) &
out=$(run build/t4 T-4) || problem "busy case exited $?"
[[ $out == "LANDED T-4 "* ]] || problem "busy case printed: $out"
wait

# 5. a checkbox board line is marked done the same way
git -C "$repo" fetch -q origin; git -C "$repo" switch -q --detach origin/main
printf -- '- [~] [T-5](t5.md) — fifth · 23.09 18:42\n' >> "$repo/BOARD.md"; printf '# T-5\n' > "$repo/t5.md"
git -C "$repo" add -A && git -C "$repo" commit -qm t5-board && git -C "$repo" push -q origin HEAD:main
branch build/t5 five.txt five
out=$(run build/t5 T-5) || problem "checkbox case exited $?"
git -C "$repo" fetch -q origin
git -C "$repo" show origin/main:BOARD.md | grep -q '^- \[x\] T-5 — fifth · [0-9a-f]\{8\} · [0-9][0-9]\.[0-9][0-9] [0-9][0-9]:[0-9][0-9]$' || problem "checkbox line of T-5 not marked done"

# 6. a table row with a mark column is marked done with commit and time
git -C "$repo" fetch -q origin; git -C "$repo" switch -q --detach origin/main
printf '| [ ] | [T-6](t6.md) | sixth |  | 23.09 18:42 |\n' >> "$repo/BOARD.md"; printf '# T-6\n' > "$repo/t6.md"
git -C "$repo" add -A && git -C "$repo" commit -qm t6-board && git -C "$repo" push -q origin HEAD:main
branch build/t6 six.txt six
out=$(run build/t6 T-6) || problem "mark-table case exited $?"
git -C "$repo" fetch -q origin
git -C "$repo" show origin/main:BOARD.md | grep -q '^| \[x\] | T-6 | sixth | [0-9a-f]\{8\} | [0-9][0-9]\.[0-9][0-9] [0-9][0-9]:[0-9][0-9] |$' || problem "mark-table row of T-6 not marked done"

if [ "$fail" -ne 0 ]; then
  echo "contracts: FAILED" >&2
  exit 1
fi
echo "contracts: ok"
