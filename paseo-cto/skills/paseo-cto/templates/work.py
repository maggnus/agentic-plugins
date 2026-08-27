#!/usr/bin/env python3
"""Work tree generator, validator and scaffolder for the Paseo CTO permanent-file work model.

One work unit is one permanent file. The file is created once, keeps its identifier for its whole
lifecycle, and is never moved or copied on acceptance. `work-schema.json` beside this script is the
single source of truth for identifiers, paths, vocabularies, field sets and section shape; the
templates, the generator and the validator all read it, so none of them can drift from the others.

Subcommands:

    work.py init                       create the work root, the backlog registries and WORKFLOW.md
    work.py new wave|card|task|subtask create one node from its template at its derived path
    work.py status                     regenerate STATUS.md deterministically from the tree
    work.py check                      validate the tree and refuse on any structural defect
    work.py fix-links                  repin short or branch forge references to full commit SHAs

Nothing in `status` reads the clock: every rendered value comes from file metadata, so regenerating
an unchanged tree produces an identical file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# The plugin release in which this tooling last changed. A project keeps its own copy of work.py and
# work-schema.json, so nothing else would notice that the copy fell behind the plugin or was edited
# locally; the pair is stamped together and verified on every run.
TOOLING_VERSION = "10.8.0"

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_SCHEMA = SCRIPT_DIR / "work-schema.json"
DEFAULT_TEMPLATES = SCRIPT_DIR / "work"

LINK_RE = re.compile(r"\[(?P<text>[^\]\[]*)\]\((?P<target>[^)\s]+)\)")
NESTED_LINK_RE = re.compile(r"\]\([^)]*\)\]\(|\[[^\]]*\[")
FORGE_COMMIT_RE = re.compile(r"/(?:commit|commits)/([0-9A-Za-z]+)")
FORGE_FILE_RE = re.compile(r"/(?:blob|raw|tree)/([0-9A-Za-z._-]+)/")
SHA40_RE = re.compile(r"^[0-9a-f]{40}$")


# --------------------------------------------------------------------------------------
# schema and front matter
# --------------------------------------------------------------------------------------


def load_schema(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def tooling_digest(script: Path, schema: dict) -> str:
    """One digest over the executable and its schema, canonical and independent of formatting."""
    body = dict(schema)
    body.pop("tooling_digest", None)
    material = script.read_bytes() + json.dumps(
        body, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def in_plugin_tree(script: Path) -> bool:
    """True for the origin copy inside the plugin, where the stamp is written rather than checked."""
    return (
        len(script.parents) > 3
        and (script.parents[3] / ".claude-plugin/plugin.json").is_file()
    )


def verify_tooling(script: Path, schema: dict) -> list[str]:
    problems = []
    stamped = str(schema.get("tooling_version", "")).strip()
    if stamped != TOOLING_VERSION:
        problems.append(
            f"work.py is stamped {TOOLING_VERSION} and work-schema.json is stamped "
            f"{stamped or 'nothing'}; copy both from one plugin release"
        )
    expected = str(schema.get("tooling_digest", "")).strip()
    actual = tooling_digest(script, schema)
    if expected and expected != actual and not in_plugin_tree(script):
        problems.append(
            "the work tooling was modified after it was copied; restore it from the plugin or "
            "carry the change into the plugin instead of the copy"
        )
    return problems


def parse_front_matter(text: str) -> tuple[dict, str, list[str]]:
    """Parse the restricted YAML subset the schema allows: scalars, inline lists, block lists."""
    errors: list[str] = []
    if not text.startswith("---\n"):
        return {}, text, ["file does not start with a YAML front matter block"]
    end = text.find("\n---\n", 3)
    if end == -1:
        return {}, text, ["front matter block is not terminated by ---"]
    block = text[4:end]
    body = text[end + 5 :]

    data: dict[str, object] = {}
    current_list: str | None = None
    for number, raw in enumerate(block.split("\n"), start=2):
        line = raw.rstrip()
        if not line.strip():
            current_list = None
            continue
        if line.startswith("  - ") or line.startswith("- "):
            item = line.split("- ", 1)[1].strip()
            if current_list is None:
                errors.append(f"front matter line {number}: list item outside a key")
                continue
            if item:
                data.setdefault(current_list, [])
                if not isinstance(data[current_list], list):
                    data[current_list] = []
                data[current_list].append(strip_quotes(item))  # type: ignore[union-attr]
            continue
        if ":" not in line:
            errors.append(f"front matter line {number}: not a key/value pair")
            continue
        if line != line.lstrip():
            errors.append(f"front matter line {number}: nested keys are not allowed")
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        current_list = None
        if value == "":
            data[key] = ""
            current_list = key
        elif value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            data[key] = [strip_quotes(part.strip()) for part in inner.split(",") if part.strip()]
        else:
            data[key] = strip_quotes(value)
    return data, body, errors


def strip_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


# --------------------------------------------------------------------------------------
# node model
# --------------------------------------------------------------------------------------


class Node:
    def __init__(self, path: Path, root: Path, data: dict, body: str):
        self.path = path
        self.rel = path.relative_to(root).as_posix()
        self.data = data
        self.body = body
        self.id = str(data.get("id", "")).strip()
        self.kind = str(data.get("kind", "")).strip()
        self.state = str(data.get("state", "")).strip()
        prefix = f"# {self.id} — "
        self.title = next(
            (line[len(prefix) :].strip() for line in body.split("\n") if line.startswith(prefix)),
            "",
        )

    def text(self, key: str) -> str:
        value = self.data.get(key, "")
        return value.strip() if isinstance(value, str) else ""

    def list(self, key: str) -> list[str]:
        value = self.data.get(key, [])
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        return [value.strip()] if isinstance(value, str) and value.strip() else []

    def integer(self, key: str) -> int | None:
        value = self.data.get(key, "")
        if isinstance(value, str) and value.strip():
            try:
                return int(value.strip())
            except ValueError:
                return None
        if isinstance(value, int):
            return value
        return None


def id_parts(schema: dict, identifier: str) -> tuple[str, tuple] | None:
    for kind in ("subtask", "task", "card", "wave"):
        match = re.match(schema["id_patterns"][kind], identifier)
        if match:
            return kind, match.groups()
    return None


def sort_key(schema: dict, identifier: str) -> tuple:
    parsed = id_parts(schema, identifier)
    if parsed is None:
        return (10**9, "", 10**9, "", 0)
    kind, groups = parsed
    if kind == "wave":
        return (int(groups[0]), "", 0, "", 0)
    if kind == "card":
        return (int(groups[0]), groups[1], int(groups[2]), "", 0)
    if kind == "task":
        return (int(groups[0]), groups[1], int(groups[2]), groups[3], 0)
    return (int(groups[0]), groups[1], int(groups[2]), groups[3], int(groups[4]))


def owning_wave(schema: dict, identifier: str) -> str:
    parsed = id_parts(schema, identifier)
    return f"W{parsed[1][0]}" if parsed else ""


def owning_card(schema: dict, identifier: str) -> str:
    parsed = id_parts(schema, identifier)
    if not parsed:
        return ""
    kind, groups = parsed
    if kind in ("task", "subtask", "card"):
        return f"W{groups[0]}-{groups[1]}-{groups[2]}"
    return ""


def owning_task(schema: dict, identifier: str) -> str:
    parsed = id_parts(schema, identifier)
    if not parsed or parsed[0] != "subtask":
        return ""
    groups = parsed[1]
    return f"W{groups[0]}-{groups[1]}-{groups[2]}{groups[3]}"


def derived_paths(schema: dict, identifier: str, kind: str) -> list[str]:
    """Every path the identifier may legally occupy. A task has two legal forms."""
    wave = owning_wave(schema, identifier)
    card = owning_card(schema, identifier)
    if kind == "wave":
        return [f"waves/{identifier}/WAVE.md"]
    if kind == "card":
        return [f"waves/{wave}/{identifier}/CARD.md"]
    if kind == "task":
        return [
            f"waves/{wave}/{card}/tasks/{identifier}.md",
            f"waves/{wave}/{card}/tasks/{identifier}/TASK.md",
        ]
    task = owning_task(schema, identifier)
    return [f"waves/{wave}/{card}/tasks/{task}/subtasks/{identifier}.md"]


# --------------------------------------------------------------------------------------
# loading
# --------------------------------------------------------------------------------------


def load_tree(schema: dict, root: Path) -> tuple[list[Node], list[str]]:
    errors: list[str] = []
    nodes: list[Node] = []
    waves_dir = root / "waves"
    if not waves_dir.is_dir():
        return nodes, [f"{root.as_posix()}/waves does not exist"]

    for path in sorted(waves_dir.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        data, body, parse_errors = parse_front_matter(text)
        rel = path.relative_to(root).as_posix()
        for message in parse_errors:
            errors.append(f"{rel}: {message}")
        if parse_errors:
            continue
        node = Node(path, root, data, body)
        if not node.id or not node.kind:
            errors.append(f"{rel}: front matter must carry both id and kind")
            continue
        nodes.append(node)

    nodes.sort(key=lambda item: (sort_key(schema, item.id), item.rel))
    return nodes, errors


# --------------------------------------------------------------------------------------
# validation
# --------------------------------------------------------------------------------------


def validate(schema: dict, root: Path, nodes: list[Node], load_errors: list[str],
             legacy_plan: Path | None) -> list[str]:
    errors = list(load_errors)
    by_id: dict[str, Node] = {}

    for node in nodes:
        rel = node.rel
        prefix = f"{rel}"

        if node.kind not in schema["kinds"]:
            errors.append(f"{prefix}: unknown kind {node.kind!r}")
            continue

        parsed = id_parts(schema, node.id)
        if parsed is None or parsed[0] != node.kind:
            errors.append(
                f"{prefix}: id {node.id!r} does not match the {node.kind} identifier grammar"
            )
            continue

        if node.id in by_id:
            errors.append(f"{prefix}: duplicate id {node.id} (also {by_id[node.id].rel})")
            continue
        by_id[node.id] = node

        legal = derived_paths(schema, node.id, node.kind)
        if rel not in legal:
            errors.append(
                f"{prefix}: id {node.id} derives {' or '.join(legal)}; the file is somewhere else. "
                f"fix: git mv {rel} {legal[0]}"
            )
            # The path is wrong, not the content: keep checking so one run reports everything.

        wave_segment = rel.split("/")[1] if rel.startswith("waves/") else ""
        if wave_segment != owning_wave(schema, node.id):
            errors.append(
                f"{prefix}: wave prefix of {node.id} disagrees with directory {wave_segment}"
            )

        errors.extend(validate_fields(schema, node))
        errors.extend(validate_sections(schema, node))
        errors.extend(validate_body_links(schema, root, node))
        errors.extend(validate_state_rules(schema, node))
        errors.extend(validate_review_rounds(schema, node))

    errors.extend(validate_relations(schema, by_id))
    errors.extend(validate_task_directories(schema, root, by_id))
    errors.extend(validate_dependencies(schema, by_id))
    errors.extend(validate_closure(schema, by_id))
    errors.extend(validate_plan_review(schema, by_id))
    if legacy_plan is not None:
        errors.extend(validate_legacy_overlap(by_id, legacy_plan))
    return errors


def validate_fields(schema: dict, node: Node) -> list[str]:
    errors: list[str] = []
    spec = schema["fields"][node.kind]
    allowed = set(spec["required"]) | set(spec["optional"])
    for key in node.data:
        if key not in allowed:
            errors.append(f"{node.rel}: unknown field {key!r} for kind {node.kind}")
    for key in spec["required"]:
        if key not in node.data:
            errors.append(f"{node.rel}: required field {key!r} is missing")
        elif key not in schema["list_fields"] and not str(node.data[key]).strip():
            errors.append(f"{node.rel}: required field {key!r} is empty")

    if node.state and node.state not in schema["states"]:
        errors.append(f"{node.rel}: unknown state {node.state!r}")
    risk = node.text("risk")
    if risk and risk not in schema["risks"]:
        errors.append(f"{node.rel}: unknown risk {risk!r}")
    maturity = node.text("maturity")
    if maturity and maturity not in schema["maturities"]:
        errors.append(f"{node.rel}: unknown maturity {maturity!r}")
    relation = node.text("relation")
    if relation and relation not in schema["relations"]:
        errors.append(f"{node.rel}: unknown relation {relation!r}")
    review = node.text("plan_review_state")
    if review and review not in schema["plan_review_states"]:
        errors.append(f"{node.rel}: unknown plan_review_state {review!r}")
    escalation = node.text("escalation_decision")
    if escalation and escalation not in schema["escalation_decisions"]:
        errors.append(f"{node.rel}: unknown escalation_decision {escalation!r}")

    for key in schema["timestamp_fields"]:
        value = node.text(key)
        if value and parse_timestamp(value) is None:
            errors.append(f"{node.rel}: {key} {value!r} is not an ISO 8601 time with an offset")
    for key in schema["integer_fields"]:
        if key in node.data and str(node.data[key]).strip():
            value = node.integer(key)
            if value is None:
                errors.append(f"{node.rel}: {key} is not an integer")
            elif value < 0:
                errors.append(f"{node.rel}: {key} is negative")
    for key in schema["boolean_fields"]:
        value = node.text(key)
        if value and value not in ("true", "false"):
            errors.append(f"{node.rel}: {key} must be true or false")
    for key in schema["commit_fields"]:
        value = node.text(key)
        if value and not re.match(schema["commit_url_pattern"], value):
            errors.append(
                f"{node.rel}: {key} must be a commit URL ending in a full 40-character SHA"
            )

    if node.kind in ("card", "task", "subtask"):
        expected_wave = owning_wave(schema, node.id)
        if node.text("wave") != expected_wave:
            errors.append(f"{node.rel}: wave field must be {expected_wave}")
    if node.kind in ("task", "subtask"):
        expected_card = owning_card(schema, node.id)
        if node.text("card") != expected_card:
            errors.append(f"{node.rel}: card field must be {expected_card}")
    if node.kind == "subtask":
        expected_parent = owning_task(schema, node.id)
        if node.text("parent") != expected_parent:
            errors.append(f"{node.rel}: parent field must be {expected_parent}")
    return errors


def validate_sections(schema: dict, node: Node) -> list[str]:
    errors: list[str] = []
    lines = node.body.split("\n")
    if not node.title:
        errors.append(f"{node.rel}: title must read '# {node.id} — <outcome title>'")
    else:
        errors.extend(validate_title(schema, node))

    found_h2 = [line[3:].strip() for line in lines if line.startswith("## ")]
    expected_h2 = schema["sections"][node.kind]["h2"]
    optional_h2 = schema["sections"][node.kind].get("optional_h2", [])
    # An optional section may be absent, so a tree written before it existed still validates; when
    # present it keeps its place in the fixed order.
    required_h2 = [name for name in expected_h2 if name not in optional_h2]
    if ([name for name in found_h2 if name not in optional_h2] != required_h2
            or not ordered_subsequence(found_h2, expected_h2)):
        missing = [name for name in required_h2 if name not in found_h2]
        unknown = [name for name in found_h2 if name not in expected_h2]
        repair = []
        if missing:
            repair.append(f"add {missing}")
        if unknown:
            repair.append(f"remove or rename {unknown}")
        if not repair:
            repair.append("reorder them")
        errors.append(
            f"{node.rel}: sections must be exactly {required_h2} in that order, with "
            f"{optional_h2} optional in place, found {found_h2}. fix: {'; '.join(repair)}"
            if optional_h2 else
            f"{node.rel}: sections must be exactly {expected_h2} in that order, found {found_h2}. "
            f"fix: {'; '.join(repair)}"
        )
    for parent, expected_h3 in schema["sections"][node.kind]["h3"].items():
        found_h3 = [line[4:].strip() for line in section_lines(node.body, parent)
                    if line.startswith("### ")]
        if found_h3 != expected_h3:
            errors.append(
                f"{node.rel}: '{parent}' must contain exactly {expected_h3}, found {found_h3}"
            )

    if node.kind in ("task", "subtask"):
        limit = schema["limits"]["current_state_lines"]
        body_lines = [line for line in section_lines(node.body, "Current state") if line.strip()]
        if len(body_lines) > limit:
            errors.append(
                f"{node.rel}: 'Current state' holds {len(body_lines)} lines; the limit is {limit}. "
                "It records the position, not a chronology."
            )
    return errors


def validate_title(schema: dict, node: Node) -> list[str]:
    lowered = node.title.lower()
    for opening in schema["banned_title_openings"]:
        if lowered.startswith(opening):
            return [
                f"{node.rel}: title {node.title!r} names an activity; state the outcome instead"
            ]
    return []


def ordered_subsequence(found: list[str], expected: list[str]) -> bool:
    """True when `found` appears inside `expected` in order and without repetition."""
    position = 0
    for name in found:
        while position < len(expected) and expected[position] != name:
            position += 1
        if position == len(expected):
            return False
        position += 1
    return True


# "- R2(5/10) RETURN 25/08 14:20 — ..." — the round, its score, the verdict, and its moment.
MOMENT = (r"(?P<moment>(?:0[1-9]|[12][0-9]|3[01])/(?:0[1-9]|1[0-2]) (?:[01][0-9]|2[0-3]):[0-5][0-9])")
# "[reset R1]" marks the round a CTO-granted budget restarted from, so a reset loop still numbers
# its rounds continuously while showing where the new budget began.
RESET_MARKER = r"(?:\[reset R(?P<reset>[1-9][0-9]*)\] )?"
ROUND_ENTRY_RE = re.compile(
    r"^- R(?P<round>[1-9][0-9]*)\((?P<score>10|[1-9])/10\) "
    r"(?P<verdict>ACCEPT|RETURN|ESCALATE) " + MOMENT + r" " + RESET_MARKER
)
ROUND_UNSCORED_RE = re.compile(r"^- R([1-9][0-9]*)[ (]")
ROUND_DECISION_RE = re.compile(r"^- CTO (?P<decision>[a-z_]+) " + MOMENT + r" ")


def trim_journal_line(line: str, limit: int) -> str:
    """Keep the machine-readable head of a journal line and elide the tail.

    A ledger line that outgrew the limit is a formatting accident, not a defect in the record, so
    the writer shortens it instead of refusing the write.
    """
    if len(line) <= limit:
        return line
    head = ROUND_ENTRY_RE.match(line) or ROUND_DECISION_RE.match(line)
    keep = head.end() if head else 0
    if keep >= limit - 1:
        return line[: limit - 1] + "…"
    return line[: limit - 1].rstrip() + "…"
ROUND_DECISION_LOOSE_RE = re.compile(r"^- CTO ")


def validate_review_rounds(schema: dict, node: Node) -> list[str]:
    """The round journal, its count, and the escalation decision must tell the same story.

    The convergence loop is owned by the reviewer and the author; this check only refuses a record
    that contradicts itself — a count without its journal, a journal that grew into a transcript, a
    loop past the ceiling, or an extension nobody decided.
    """
    sections = schema["sections"].get(node.kind, {})
    if "Review rounds" not in sections.get("h2", []):
        return []

    errors: list[str] = []
    budget = schema["limits"]["review_return_budget"]
    ceiling = budget + schema["limits"]["escalated_return_budget"]
    line_limit = schema["limits"]["review_round_line_chars"]

    rounds = node.integer("review_rounds") or 0
    escalation = node.text("escalation_decision")
    has_section = "## Review rounds" in node.body
    body_lines = [line.rstrip() for line in section_lines(node.body, "Review rounds")
                  if line.strip()]
    entries = [line for line in body_lines if ROUND_ENTRY_RE.match(line)]
    decisions = [line for line in body_lines if ROUND_DECISION_RE.match(line)]
    unscored = [line for line in body_lines
                if ROUND_UNSCORED_RE.match(line) and not ROUND_ENTRY_RE.match(line)]
    malformed_decisions = [line for line in body_lines
                           if ROUND_DECISION_LOOSE_RE.match(line) and line not in decisions]
    stray = [line for line in body_lines
             if line.startswith("- ") and line not in entries and line not in decisions
             and line not in unscored and line not in malformed_decisions]

    if rounds > ceiling:
        errors.append(
            f"{node.rel}: review_rounds is {rounds}; the ceiling is {ceiling} "
            f"({budget} inside the loop plus {ceiling - budget} in the granted budget)"
        )
    if rounds and not has_section:
        errors.append(
            f"{node.rel}: review_rounds is {rounds} but there is no 'Review rounds' journal. "
            "fix: add '## Review rounds' between '## Findings' and '## Closure', one line per round"
        )
    if rounds != len(entries) and has_section:
        errors.append(
            f"{node.rel}: review_rounds is {rounds} but the journal holds {len(entries)} "
            f"'- R<n>' entries; one round is one line. fix: set review_rounds: {len(entries)} "
            "or add the missing line"
        )
    numbers = [int(ROUND_ENTRY_RE.match(line).group(1)) for line in entries]
    if numbers != list(range(1, len(entries) + 1)):
        errors.append(
            f"{node.rel}: journal rounds must be numbered 1..{len(entries)} in order, "
            f"found {numbers}"
        )
    for line in entries + decisions:
        if len(line) > line_limit:
            errors.append(
                f"{node.rel}: journal line {line[:40]!r} is {len(line)} characters; the limit is "
                f"{line_limit}. The journal is a ledger, not the review dialogue. "
                "fix: work.py check --fix trims it to "
                f"{trim_journal_line(line, line_limit)[:60]!r}…"
            )
    for line in unscored:
        errors.append(
            f"{node.rel}: journal entry {line[:40]!r} is not a complete round record; a verdict "
            "reads '- R<n>(<score>/10) ACCEPT|RETURN|ESCALATE dd/mm hh:mm — ...', with a score of "
            "1 to 10 and the local moment the verdict arrived"
        )
    for line in malformed_decisions:
        errors.append(
            f"{node.rel}: decision line {line[:40]!r} must read "
            "'- CTO <decision> dd/mm hh:mm — <reason>'"
        )
    for line in stray:
        errors.append(
            f"{node.rel}: journal entry {line[:40]!r} must start with '- R<n>(<score>/10)' "
            "or '- CTO'"
        )
    if rounds > budget and escalation not in ("bounded_retry", "independent_review"):
        errors.append(
            f"{node.rel}: {rounds} returns exceed the reviewer's budget of {budget}; only a "
            "recorded escalation_decision of bounded_retry or independent_review extends it. "
            "fix: record the decision and its '- CTO <decision> dd/mm hh:mm — <reason>' line"
        )
    if escalation and decisions:
        last = ROUND_DECISION_RE.match(decisions[-1]).group("decision")
        if last != escalation:
            errors.append(
                f"{node.rel}: the last journal decision is {last!r} but escalation_decision is "
                f"{escalation!r}; the field records the decision the journal shows"
            )
    if escalation and not decisions:
        errors.append(
            f"{node.rel}: escalation_decision {escalation!r} needs its '- CTO ...' line in the "
            "journal, so the decision is readable where the rounds are"
        )
    if decisions and not escalation:
        errors.append(
            f"{node.rel}: the journal records a CTO decision but escalation_decision is empty"
        )
    return errors


def section_lines(body: str, heading: str) -> list[str]:
    lines = body.split("\n")
    collected: list[str] = []
    inside = False
    for line in lines:
        if line.startswith("## "):
            inside = line[3:].strip() == heading
            continue
        if inside:
            collected.append(line)
    return collected


def validate_body_links(schema: dict, root: Path, node: Node) -> list[str]:
    errors: list[str] = []
    if NESTED_LINK_RE.search(node.body):
        errors.append(f"{node.rel}: body contains a nested Markdown link")
    for match in LINK_RE.finditer(node.body):
        target = match.group("target")
        if target.startswith("#"):
            continue
        if target.startswith("http://") or target.startswith("https://"):
            errors.extend(validate_forge_url(node.rel, target))
            continue
        if target.startswith("mailto:"):
            continue
        resolved = (node.path.parent / target.split("#")[0]).resolve()
        if not resolved.exists():
            errors.append(f"{node.rel}: link target {target} does not exist")
        elif root.resolve() not in resolved.parents and resolved != root.resolve():
            errors.append(f"{node.rel}: link target {target} leaves the work root")
    return errors


def validate_forge_url(rel: str, url: str) -> list[str]:
    commit = FORGE_COMMIT_RE.search(url)
    if commit and not SHA40_RE.match(commit.group(1)):
        return [f"{rel}: commit link {url} does not carry a full 40-character SHA"]
    blob = FORGE_FILE_RE.search(url)
    if blob and not SHA40_RE.match(blob.group(1)):
        return [f"{rel}: source link {url} is pinned to {blob.group(1)}, not to an immutable commit"]
    return []


def resolve_commit(repo: Path, ref: str) -> str | None:
    """Resolve a ref to its full commit SHA in the repository containing the work root."""
    try:
        result = subprocess.run(
            ["git", "-C", str(repo), "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"],
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return None
    sha = result.stdout.strip()
    if result.returncode != 0 or not SHA40_RE.match(sha):
        return None
    return sha


def repin_forge_url(repo: Path, url: str) -> str | None:
    """Rewrite a forge URL whose commit or file segment is not a full SHA; None if unresolvable."""
    for pattern in (FORGE_COMMIT_RE, FORGE_FILE_RE):
        match = pattern.search(url)
        if match and not SHA40_RE.match(match.group(1)):
            sha = resolve_commit(repo, match.group(1))
            if not sha:
                return None
            return url[: match.start(1)] + sha + url[match.end(1) :]
    return url


def validate_state_rules(schema: dict, node: Node) -> list[str]:
    errors: list[str] = []
    state = node.state
    relation = node.text("relation")
    historical = node.text("historical_acceptance") == "true"
    incomplete = node.text("historical_acceptance_metadata_incomplete") == "true"

    if node.text("risk") == "pre_policy" and not historical:
        errors.append(f"{node.rel}: risk pre_policy is reserved for imported historical acceptance")
    if historical and (node.kind != "card" or state != "accepted"):
        errors.append(f"{node.rel}: historical_acceptance is valid only on an accepted card")
    if node.text("historical_time_record") and not historical:
        errors.append(f"{node.rel}: historical_time_record requires historical_acceptance: true")
    if incomplete and not historical:
        errors.append(
            f"{node.rel}: historical_acceptance_metadata_incomplete requires "
            "historical_acceptance: true"
        )
    if incomplete and (node.text("accepted_at") or node.text("closure_commit")):
        errors.append(
            f"{node.rel}: historical_acceptance_metadata_incomplete requires both accepted_at "
            "and closure_commit to be empty; it records their joint absence in the source, not one "
            "accidental omission"
        )

    if (node.kind != "wave" and state in schema["started_states"]
            and not node.text("started_at") and not historical):
        errors.append(f"{node.rel}: state {state} requires started_at")
    if state == "blocked" and not node.text("blocker"):
        errors.append(f"{node.rel}: a blocked node must name its blocker")
    if state == "deferred":
        if not node.text("return_trigger"):
            errors.append(f"{node.rel}: a deferred node must name its return trigger")
        if relation != "trigger" and not node.text("pause_reason"):
            errors.append(f"{node.rel}: a paused node must name its pause reason")
    if state == "rejected" and not node.text("return_trigger"):
        errors.append(f"{node.rel}: a rejected node must name its return trigger")
    if relation == "trigger" and not node.text("return_trigger"):
        errors.append(f"{node.rel}: a trigger-gated node must name its return trigger")

    if state == "accepted":
        if not node.text("accepted_at") and not incomplete:
            errors.append(f"{node.rel}: an accepted node must record accepted_at")
        if node.kind in ("task", "subtask"):
            if not node.text("closure_commit"):
                errors.append(f"{node.rel}: an accepted task must record its closure commit")
            evidence = node.list("evidence")
            if not evidence:
                errors.append(
                    f"{node.rel}: an accepted task must record durable evidence, or the explicit "
                    f"{schema['evidence_waiver']!r} waiver"
                )
            for item in evidence:
                if item == schema["evidence_waiver"]:
                    continue
                if not LINK_RE.fullmatch(item):
                    errors.append(f"{node.rel}: evidence entry {item!r} is not a Markdown link")
            open_boxes = [line for line in section_lines(node.body, "Acceptance")
                          if line.strip().startswith("- [ ]")]
            if open_boxes and node.text("deliberate_partial") != "true":
                errors.append(
                    f"{node.rel}: acceptance checklist still has {len(open_boxes)} open items; "
                    "close them or record deliberate_partial: true with its residue"
                )
    return errors


def validate_relations(schema: dict, by_id: dict[str, Node]) -> list[str]:
    errors: list[str] = []
    parent_of = {
        "card": owning_wave,
        "task": owning_card,
        "subtask": owning_task,
    }
    for node in by_id.values():
        if node.kind not in parent_of:
            continue
        parent = parent_of[node.kind](schema, node.id)
        if parent and parent not in by_id:
            errors.append(f"{node.rel}: parent {parent} has no file")
    return errors


def validate_task_directories(schema: dict, root: Path, by_id: dict[str, Node]) -> list[str]:
    errors: list[str] = []
    for node in by_id.values():
        if node.kind != "task":
            continue
        has_children = any(
            other.kind == "subtask" and owning_task(schema, other.id) == node.id
            for other in by_id.values()
        )
        directory_form = node.rel.endswith("/TASK.md")
        if has_children and not directory_form:
            errors.append(f"{node.rel}: a task with subtasks lives at tasks/{node.id}/TASK.md")
        if not has_children and directory_form:
            errors.append(f"{node.rel}: a task without subtasks lives at tasks/{node.id}.md")
    return errors


def validate_dependencies(schema: dict, by_id: dict[str, Node]) -> list[str]:
    errors: list[str] = []
    graph: dict[str, list[str]] = {}
    for node in by_id.values():
        depends = node.list("depends_on")
        for other in depends:
            if other not in by_id:
                errors.append(f"{node.rel}: depends_on {other} has no file")
            if other == node.id:
                errors.append(f"{node.rel}: depends_on names itself")
        for other in node.list("blocks"):
            if other not in by_id:
                errors.append(f"{node.rel}: blocks {other} has no file")
        graph[node.id] = [item for item in depends if item in by_id]

    state = {identifier: 0 for identifier in graph}
    stack: list[str] = []

    def visit(identifier: str) -> str | None:
        state[identifier] = 1
        stack.append(identifier)
        for other in sorted(graph.get(identifier, [])):
            if state.get(other, 0) == 1:
                cycle = stack[stack.index(other) :] + [other]
                return " -> ".join(cycle)
            if state.get(other, 0) == 0:
                found = visit(other)
                if found:
                    return found
        stack.pop()
        state[identifier] = 2
        return None

    for identifier in sorted(graph):
        if state[identifier] == 0:
            cycle = visit(identifier)
            if cycle:
                errors.append(f"dependency cycle: {cycle}")
                break
    return errors


def validate_closure(schema: dict, by_id: dict[str, Node]) -> list[str]:
    errors: list[str] = []
    for node in by_id.values():
        if node.state != "accepted":
            continue
        if node.kind == "card":
            children = [other for other in by_id.values()
                        if other.kind == "task" and owning_card(schema, other.id) == node.id]
            label = "task"
        elif node.kind == "wave":
            children = [other for other in by_id.values()
                        if other.kind == "card" and owning_wave(schema, other.id) == node.id]
            label = "card"
        elif node.kind == "task":
            children = [other for other in by_id.values()
                        if other.kind == "subtask" and owning_task(schema, other.id) == node.id]
            label = "subtask"
        else:
            continue
        for child in sorted(children, key=lambda item: item.id):
            if child.text("relation") == "required" and child.state != "accepted":
                errors.append(
                    f"{node.rel}: cannot be accepted while required {label} {child.id} "
                    f"is {child.state}"
                )
    return errors


def validate_plan_review(schema: dict, by_id: dict[str, Node]) -> list[str]:
    errors: list[str] = []
    for node in by_id.values():
        if node.kind != "wave":
            continue
        started = [
            other for other in by_id.values()
            if other.kind in ("card", "task", "subtask")
            and owning_wave(schema, other.id) == node.id
            and other.state in schema["started_states"]
            and other.text("historical_acceptance") != "true"
        ]
        if started and node.text("plan_review_state") != "accepted":
            first = sorted(started, key=lambda item: item.id)[0].id
            errors.append(
                f"{node.rel}: {first} has started while the wave plan review is "
                f"{node.text('plan_review_state') or 'unrecorded'}"
            )
        if node.text("plan_review_state") == "accepted" and not node.text("plan_review_evidence"):
            errors.append(f"{node.rel}: an accepted plan review must link its review evidence")
    return errors


def validate_legacy_overlap(by_id: dict[str, Node], legacy_plan: Path) -> list[str]:
    if not legacy_plan.is_file():
        return [f"legacy plan {legacy_plan} does not exist"]
    text = legacy_plan.read_text(encoding="utf-8")
    legacy_ids = set(re.findall(r"^#+ \[[ x~?=!]\] (\S+) [—-] ", text, re.MULTILINE))
    overlap = sorted(legacy_ids & set(by_id))
    return [
        f"{identifier} is live in both the work tree and {legacy_plan.name}; "
        "one live task has exactly one home"
        for identifier in overlap
    ]


# --------------------------------------------------------------------------------------
# rendering
# --------------------------------------------------------------------------------------


def parse_timestamp(value: str) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo is not None else None


def render_moment(value: str) -> str:
    parsed = parse_timestamp(value)
    return parsed.strftime("%d/%m %H:%M") if parsed else ""


def render_duration(minutes: int) -> str:
    hours, rest = divmod(max(minutes, 0), 60)
    if hours and rest:
        return f"{hours}h{rest:02d}m"
    if hours:
        return f"{hours}h"
    return f"{rest}m"


def render_commit(schema: dict, node: Node) -> str:
    closure = node.text("closure_commit")
    candidate = node.text("candidate_commit")
    if node.state == "accepted":
        url = closure or candidate
    elif node.state in schema["started_states"]:
        url = candidate or closure
    else:
        url = ""
    if not url:
        return schema["status"]["empty_cell"]
    sha = url.rstrip("/").rsplit("/", 1)[-1]
    return f"[`{sha[:8]}`]({url})"


def render_status(schema: dict, root: Path, nodes: list[Node]) -> str:
    empty = schema["status"]["empty_cell"]
    rows: list[str] = []
    for node in nodes:
        if node.kind == "wave":
            continue
        marker = schema["markers"].get(node.state, "[ ]")
        link = f"[`{node.id}`]({node.rel})"
        started = node.text("started_at")
        start_cell = render_moment(started) or empty

        if node.state == "accepted":
            moment = render_moment(node.text("accepted_at"))
        elif started:
            moment = render_moment(node.text("updated_at"))
        else:
            moment = ""

        historical_time = node.text("historical_time_record")
        if historical_time:
            # The imported record keeps the form it was written in, including a bare `n/a`.
            if re.match(r"^\d{2}/\d{2}\s+\d{2}:\d{2}", historical_time):
                time_cell = historical_time
            elif moment and historical_time != "n/a":
                time_cell = f"{moment} ({historical_time})"
            elif moment:
                time_cell = moment
            else:
                time_cell = historical_time
        elif moment:
            minutes = node.integer("duration_minutes") or 0
            time_cell = f"{moment} ({render_duration(minutes)})"
        else:
            time_cell = empty

        rows.append(
            f"| `{marker}` | {link} | {node.title or empty} | "
            f"{render_commit(schema, node)} | {start_cell} | {time_cell} |"
        )

    status = schema["status"]
    lines = [
        status["title"],
        "",
        status["generated_marker"],
        "",
        status["header"],
        status["separator"],
    ]
    lines.extend(rows)
    return "\n".join(lines) + "\n"


def cell(value: str) -> str:
    """A table cell never breaks the table, whatever the source text holds."""
    return value.replace("|", "\\|").strip()


def first_line(body: str, heading: str) -> str:
    return next((line.strip() for line in section_lines(body, heading) if line.strip()), "")


def render_percent(done: int, total: int, empty: str) -> str:
    """Round half up with integers, so the rendered percentage never depends on float repair."""
    if total <= 0:
        return empty
    return f"{(200 * done + total) // (2 * total)}%"


def render_waves(schema: dict, nodes: list[Node]) -> str:
    waves = schema["waves"]
    empty = schema["status"]["empty_cell"]
    rows: list[str] = []
    total_done = 0
    total_cards = 0
    for node in nodes:
        if node.kind != "wave":
            continue
        cards = [other for other in nodes
                 if other.kind == "card" and owning_wave(schema, other.id) == node.id]
        done = sum(1 for card in cards if card.state == "accepted")
        total_done += done
        total_cards += len(cards)
        marker = schema["markers"].get(node.state, "[ ]")
        outcome = cell(first_line(node.body, "Outcome")) or empty
        rows.append(
            f"| `{marker}` | [`{node.id}`]({node.rel}) | {cell(node.title) or empty} | "
            f"{outcome} | {done}/{len(cards)} | {render_percent(done, len(cards), empty)} |"
        )

    rows.append(
        f"| {empty} | {empty} | {waves['total_label']} | {empty} | "
        f"{total_done}/{total_cards} | {render_percent(total_done, total_cards, empty)} |"
    )

    # Imported history was accepted before the tree existed, so the gate never saw it. The total
    # still counts it — it is real completed work — but says how much of itself it is.
    imported = sum(1 for node in nodes
                   if node.kind == "card" and node.text("historical_acceptance") == "true")
    if imported:
        rows.append(
            f"| {empty} | {empty} | {waves['imported_label']} | {empty} | "
            f"{imported}/{total_cards} | {empty} |"
        )

    lines = [
        waves["title"],
        "",
        waves["generated_marker"],
        "",
        waves["header"],
        waves["separator"],
    ]
    lines.extend(rows)
    return "\n".join(lines) + "\n"


# --------------------------------------------------------------------------------------
# scaffolding
# --------------------------------------------------------------------------------------


def read_template(templates: Path, name: str) -> str:
    return (templates / name).read_text(encoding="utf-8")


def fill(template: str, values: dict[str, str]) -> str:
    rendered = template
    for key, value in values.items():
        rendered = rendered.replace("{{" + key + "}}", value)
    return rendered


def now_stamp(explicit: str | None) -> str:
    if explicit:
        return explicit
    return datetime.now(timezone.utc).astimezone().replace(microsecond=0).isoformat()


def append_child_row(path: Path, heading: str, row: str) -> None:
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    start = next((index for index, line in enumerate(lines)
                  if line.strip() == f"## {heading}"), None)
    if start is None:
        raise SystemExit(f"work: {path} has no '## {heading}' section")
    end = len(lines)
    for index in range(start + 1, len(lines)):
        if lines[index].startswith("## "):
            end = index
            break
    insert = end
    while insert > start + 1 and not lines[insert - 1].strip():
        insert -= 1
    lines.insert(insert, row)
    path.write_text("\n".join(lines), encoding="utf-8")


def command_new(args, schema: dict) -> int:
    root = Path(args.root)
    templates = Path(args.templates)
    stamp = now_stamp(args.now)
    kind = args.kind

    if kind == "wave":
        identifier = args.id
        if not re.match(schema["id_patterns"]["wave"], identifier):
            raise SystemExit(f"work: {identifier} is not a wave identifier")
        target = root / f"waves/{identifier}/WAVE.md"
        values = {
            "ID": identifier,
            "TITLE": args.title,
            "AREAS": ", ".join(args.areas or []),
            "NOW": stamp,
        }
        write_node(target, fill(read_template(templates, "WAVE.md"), values))
        return 0

    if kind == "card":
        identifier = args.id
        if not re.match(schema["id_patterns"]["card"], identifier):
            raise SystemExit(f"work: {identifier} is not a card identifier")
        wave = owning_wave(schema, identifier)
        wave_file = root / f"waves/{wave}/WAVE.md"
        if not wave_file.is_file():
            raise SystemExit(f"work: wave {wave} does not exist; create it first")
        target = root / f"waves/{wave}/{identifier}/CARD.md"
        values = {
            "ID": identifier,
            "TITLE": args.title,
            "WAVE": wave,
            "RISK": args.risk,
        "MATURITY": args.maturity,
            "MATURITY": args.maturity,
            "RELATION": args.relation,
            "NOW": stamp,
        }
        write_node(target, fill(read_template(templates, "CARD.md"), values))
        append_child_row(wave_file, "Cards",
                         f"- [{identifier}]({identifier}/CARD.md) — {args.relation}")
        return 0

    if kind == "task":
        card = args.parent
        if not re.match(schema["id_patterns"]["card"], card):
            raise SystemExit(f"work: {card} is not a card identifier")
        wave = owning_wave(schema, card)
        card_file = root / f"waves/{wave}/{card}/CARD.md"
        if not card_file.is_file():
            raise SystemExit(f"work: card {card} does not exist; create it first")
        tasks_dir = root / f"waves/{wave}/{card}/tasks"
        identifier = args.id or allocate_task_id(schema, tasks_dir, card)
        target = tasks_dir / f"{identifier}.md"
        values = {
            "ID": identifier,
            "TITLE": args.title,
            "WAVE": wave,
            "CARD": card,
            "RISK": args.risk,
        "MATURITY": args.maturity,
            "MATURITY": args.maturity,
            "RELATION": args.relation,
            "NOW": stamp,
        }
        write_node(target, fill(read_template(templates, "TASK.md"), values))
        append_child_row(card_file, "Tasks",
                         f"- [{identifier}](tasks/{identifier}.md) — {args.relation}")
        return 0

    task = args.parent
    if not re.match(schema["id_patterns"]["task"], task):
        raise SystemExit(f"work: {task} is not a task identifier")
    wave = owning_wave(schema, task)
    card = owning_card(schema, task)
    tasks_dir = root / f"waves/{wave}/{card}/tasks"
    leaf = tasks_dir / f"{task}.md"
    directory = tasks_dir / task
    if leaf.is_file():
        directory.mkdir(parents=True, exist_ok=True)
        leaf.rename(directory / "TASK.md")
        card_file = root / f"waves/{wave}/{card}/CARD.md"
        if card_file.is_file():
            card_file.write_text(
                card_file.read_text(encoding="utf-8").replace(
                    f"](tasks/{task}.md)", f"](tasks/{task}/TASK.md)"
                ),
                encoding="utf-8",
            )
    task_file = directory / "TASK.md"
    if not task_file.is_file():
        raise SystemExit(f"work: task {task} does not exist; create it first")
    identifier = args.id or allocate_subtask_id(schema, directory / "subtasks", task)
    target = directory / "subtasks" / f"{identifier}.md"
    values = {
        "ID": identifier,
        "TITLE": args.title,
        "WAVE": wave,
        "CARD": card,
        "PARENT": task,
        "RISK": args.risk,
        "MATURITY": args.maturity,
        "RELATION": args.relation,
        "NOW": stamp,
    }
    write_node(target, fill(read_template(templates, "SUBTASK.md"), values))
    return 0


def allocate_task_id(schema: dict, tasks_dir: Path, card: str) -> str:
    used = set()
    if tasks_dir.is_dir():
        for entry in tasks_dir.iterdir():
            name = entry.name[:-3] if entry.name.endswith(".md") else entry.name
            match = re.match(schema["id_patterns"]["task"], name)
            if match:
                used.add(match.group(4))
    for code in range(ord("a"), ord("z") + 1):
        if chr(code) not in used:
            return f"{card}{chr(code)}"
    raise SystemExit(f"work: card {card} has no free task letter; split the card")


def allocate_subtask_id(schema: dict, subtasks_dir: Path, task: str) -> str:
    used = set()
    if subtasks_dir.is_dir():
        for entry in subtasks_dir.glob("*.md"):
            match = re.match(schema["id_patterns"]["subtask"], entry.name[:-3])
            if match:
                used.add(int(match.group(5)))
    index = 1
    while index in used:
        index += 1
    return f"{task}.{index}"


def write_node(target: Path, content: str) -> None:
    if target.exists():
        raise SystemExit(f"work: {target} already exists; an identifier is never reused")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    print(f"work: created {target}")


def command_init(args, schema: dict) -> int:
    root = Path(args.root)
    templates = Path(args.templates)
    (root / "waves").mkdir(parents=True, exist_ok=True)
    (root / "backlog").mkdir(parents=True, exist_ok=True)
    for name, relative in (
        ("WORKFLOW.md", "WORKFLOW.md"),
        ("TRIGGERS.md", "backlog/TRIGGERS.md"),
        ("OWNER_GATES.md", "backlog/OWNER_GATES.md"),
        ("REJECTED.md", "backlog/REJECTED.md"),
    ):
        target = root / relative
        if not target.exists():
            target.write_text(read_template(templates, name), encoding="utf-8")
            print(f"work: created {target}")
    for target, rendered in (
        (root / schema["status"]["file"], render_status(schema, root, [])),
        (root / schema["waves"]["file"], render_waves(schema, [])),
    ):
        if not target.exists():
            target.write_text(rendered, encoding="utf-8")
            print(f"work: created {target}")
    return 0


# --------------------------------------------------------------------------------------
# entry points
# --------------------------------------------------------------------------------------


def command_status(args, schema: dict) -> int:
    root = Path(args.root)
    nodes, load_errors = load_tree(schema, root)
    if load_errors and not args.force:
        for message in load_errors:
            print(f"work status: {message}", file=sys.stderr)
        return 1
    renders = [
        (root / schema["status"]["file"], render_status(schema, root, nodes)),
        (root / schema["waves"]["file"], render_waves(schema, nodes)),
    ]
    if args.print:
        sys.stdout.write("\n".join(rendered for _, rendered in renders))
        return 0
    for target, rendered in renders:
        if target.is_file() and target.read_text(encoding="utf-8") == rendered:
            print(f"work status: {target} is current")
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(rendered, encoding="utf-8")
        print(f"work status: wrote {target}")
    return 0


def command_counts(args, schema: dict) -> int:
    """Print `<done>/<total>\t<wave title>` for one wave, for the fleet snapshot check."""
    root = Path(args.root)
    nodes, load_errors = load_tree(schema, root)
    if load_errors:
        for message in load_errors:
            print(f"work counts: {message}", file=sys.stderr)
        return 1
    cards = [node for node in nodes
             if node.kind == "card" and owning_wave(schema, node.id) == args.wave]
    wave = next((node for node in nodes if node.kind == "wave" and node.id == args.wave), None)
    if wave is None:
        print(f"work counts: wave {args.wave} has no file", file=sys.stderr)
        return 1
    done = sum(1 for card in cards if card.state == "accepted")
    print(f"{done}/{len(cards)}\t{wave.title}")
    return 0


def compare_with_plugin(schema: dict, plugin_templates: Path) -> list[str]:
    reference_path = plugin_templates / "work-schema.json"
    if not reference_path.is_file():
        return [f"{reference_path} does not exist; name the plugin's templates directory"]
    reference = load_schema(reference_path)
    stamped = str(reference.get("tooling_version", "")).strip()
    if stamped != TOOLING_VERSION:
        return [
            f"this work tooling is {TOOLING_VERSION} and the installed plugin ships {stamped}; "
            "copy work.py, work-schema.json and work/ from the plugin"
        ]
    return []


def fix_journal_lines(schema: dict, root: Path, nodes: list[Node]) -> list[str]:
    """Trim over-long journal lines in place and report what was shortened."""
    limit = schema["limits"]["review_round_line_chars"]
    repaired: list[str] = []
    for node in nodes:
        sections = schema["sections"].get(node.kind, {})
        if "Review rounds" not in sections.get("h2", []) or "## Review rounds" not in node.body:
            continue
        lines = node.path.read_text(encoding="utf-8").split("\n")
        inside, changed = False, False
        for index, line in enumerate(lines):
            if line.startswith("## "):
                inside = line[3:].strip() == "Review rounds"
                continue
            if not inside or len(line) <= limit:
                continue
            if not (ROUND_ENTRY_RE.match(line) or ROUND_DECISION_RE.match(line)):
                continue
            lines[index] = trim_journal_line(line, limit)
            changed = True
        if changed:
            node.path.write_text("\n".join(lines), encoding="utf-8")
            repaired.append(node.rel)
    return repaired


def review_budget_warnings(schema: dict, nodes: list[Node]) -> list[str]:
    """Say that the budget is spent while a round can still be planned, not after it is paid for."""
    budget = schema["limits"]["review_return_budget"]
    warnings = []
    for node in nodes:
        sections = schema["sections"].get(node.kind, {})
        if "Review rounds" not in sections.get("h2", []):
            continue
        rounds = node.integer("review_rounds") or 0
        if rounds == budget and not node.text("escalation_decision"):
            warnings.append(
                f"notice {node.rel}: {rounds} of {budget} returns are spent; the next reviewer "
                "verdict is ESCALATE, and the decision after it is the CTO's"
            )
    return warnings


def command_check(args, schema: dict) -> int:
    root = Path(args.root)
    nodes, load_errors = load_tree(schema, root)
    if getattr(args, "fix", False) and not load_errors:
        for rel in fix_journal_lines(schema, root, nodes):
            print(f"work check: trimmed journal lines in {rel}")
        nodes, load_errors = load_tree(schema, root)
    legacy = Path(args.legacy_plan) if args.legacy_plan else None
    errors = validate(schema, root, nodes, load_errors, legacy)
    if args.plugin_templates:
        errors.extend(compare_with_plugin(schema, Path(args.plugin_templates)))

    for name, rendered in (
        (schema["status"]["file"], render_status(schema, root, nodes)),
        (schema["waves"]["file"], render_waves(schema, nodes)),
    ):
        generated = root / name
        if not generated.is_file():
            errors.append(f"{name} does not exist; run work.py status")
        elif generated.read_text(encoding="utf-8") != rendered:
            errors.append(f"{name} disagrees with the tree; it is generated, not edited")

    for message in review_budget_warnings(schema, nodes):
        print(f"work check: {message}", file=sys.stderr)
    if errors:
        for message in errors:
            print(f"work check: {message}", file=sys.stderr)
        return 1
    print(f"work check: {len(nodes)} nodes valid")
    return 0


def command_fix_links(args, schema: dict) -> int:
    root = Path(args.root)
    nodes, _ = load_tree(schema, root)
    repinned = 0
    unresolved = 0
    for node in nodes:
        text = node.path.read_text(encoding="utf-8")
        replacements: dict[str, str] = {}
        for match in LINK_RE.finditer(text):
            url = match.group("target")
            if not url.startswith(("http://", "https://")):
                continue
            if not validate_forge_url(node.rel, url):
                continue
            fixed = repin_forge_url(root, url)
            if fixed and fixed != url:
                replacements[url] = fixed
            else:
                unresolved += 1
                print(f"work fix-links: {node.rel}: cannot resolve {url}", file=sys.stderr)
        for old, new in replacements.items():
            text = text.replace(old, new)
            repinned += 1
            print(f"work fix-links: {node.rel}: {old} -> {new}")
        if replacements:
            node.path.write_text(text, encoding="utf-8")
    print(f"work fix-links: {repinned} link(s) repinned, {unresolved} unresolved")
    return 0 if unresolved == 0 else 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="work.py", description=__doc__)
    parser.add_argument("--root", default=None, help="work root (default docs/work)")
    parser.add_argument("--schema", default=str(DEFAULT_SCHEMA))
    parser.add_argument("--templates", default=str(DEFAULT_TEMPLATES))
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="create the work root and its standing files")

    status = sub.add_parser("status", help="regenerate STATUS.md from the tree")
    status.add_argument("--print", action="store_true", help="write to stdout instead of the file")
    status.add_argument("--force", action="store_true", help="render despite load errors")

    counts = sub.add_parser("counts", help="print one wave's accepted/total card count")
    counts.add_argument("--wave", required=True)

    sub.add_parser("version", help="print the plugin release this tooling was copied from")

    sub.add_parser("fix-links",
                   help="repin short-SHA or branch forge references to full commit SHAs")

    check = sub.add_parser("check", help="validate the tree")
    check.add_argument("--fix", action="store_true",
                       help="repair what is mechanically repairable (over-long journal lines)")
    check.add_argument("--legacy-plan", default=None,
                       help="frozen legacy execution document to test for live-id overlap")
    check.add_argument("--plugin-templates", default=None,
                       help="the installed plugin's templates directory, to detect an outdated copy")

    new = sub.add_parser("new", help="create one node from its template")
    new.add_argument("kind", choices=["wave", "card", "task", "subtask"])
    new.add_argument("--id", default=None, help="explicit identifier (required for wave and card)")
    new.add_argument("--parent", default=None, help="parent card for a task, parent task for a subtask")
    new.add_argument("--title", required=True, help="outcome title")
    new.add_argument("--areas", nargs="*", default=None, help="area codes a wave registers")
    new.add_argument("--risk", default="routine", help="routine, significant or critical")
    new.add_argument("--maturity", default="BUILD",
                     help="RESEARCH, DESIGN, BUILD or OPERATIONALIZATION")
    new.add_argument("--relation", default="required",
                     help="required, follow_up, expansion or trigger")
    new.add_argument("--now", default=None, help="explicit RFC3339 creation stamp")

    args = parser.parse_args(argv)
    schema_path = Path(args.schema)
    schema = load_schema(schema_path)
    if args.root is None:
        args.root = schema["root_default"]

    if args.command == "version":
        print(f"work tooling {TOOLING_VERSION}")
        return 0
    problems = verify_tooling(Path(__file__).resolve(), schema)
    if problems:
        for problem in problems:
            print(f"work: {problem}", file=sys.stderr)
        return 1

    if args.command == "new":
        if args.kind in ("wave", "card") and not args.id:
            parser.error(f"--id is required for a {args.kind}")
        if args.kind in ("task", "subtask") and not args.parent:
            parser.error(f"--parent is required for a {args.kind}")
        if args.risk not in schema["risks"]:
            parser.error(f"--risk must be one of {schema['risks']}")
        if args.maturity not in schema["maturities"]:
            parser.error(f"--maturity must be one of {schema['maturities']}")
        if args.relation not in schema["relations"]:
            parser.error(f"--relation must be one of {schema['relations']}")
        return command_new(args, schema)
    if args.command == "init":
        return command_init(args, schema)
    if args.command == "status":
        return command_status(args, schema)
    if args.command == "counts":
        return command_counts(args, schema)
    if args.command == "fix-links":
        return command_fix_links(args, schema)
    return command_check(args, schema)


if __name__ == "__main__":
    sys.exit(main())
