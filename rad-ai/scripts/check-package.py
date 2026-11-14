#!/usr/bin/env python3
"""Check the shared package, instruction line limit and contained references; install nothing."""

import argparse
import json
from pathlib import Path
import re


def heading_slugs(markdown: str) -> set[str]:
    slugs = set()
    in_fence = False
    for line in markdown.splitlines():
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        match = re.match(r"^#{1,6}\s+(.+?)\s*$", line)
        if match:
            raw = re.sub(r"[`*_~]", "", match.group(1).strip().lower())
            slug = re.sub(r"[^a-z0-9\s-]", "", raw)
            slug = re.sub(r"\s+", "-", slug).strip("-")
            if slug:
                slugs.add(slug)
    return slugs


def strip_code(markdown: str) -> str:
    without_fences = re.sub(r"```.*?```", "", markdown, flags=re.S)
    return re.sub(r"`[^`\n]*`", "", without_fences)


def check(root: Path) -> list[str]:
    errors = []

    def require(condition, message):
        if not condition:
            errors.append(message)

    manifests = []
    for platform in (".claude-plugin", ".codex-plugin"):
        path = root / platform / "plugin.json"
        try:
            manifests.append(json.loads(path.read_text(encoding="utf-8")))
        except (OSError, ValueError) as error:
            errors.append(f"{path}: {error}")
    if len(manifests) == 2:
        claude, codex = manifests
        for field in ("name", "description", "author"):
            require(claude.get(field) == codex.get(field), f"manifest {field} differs")
        require(claude.get("name") == "rad-ai", "manifest name must be rad-ai")
        version = claude.get("version", "")
        require(bool(re.fullmatch(r"\d+\.\d+\.\d+", version)), "invalid shared base version")
        require(bool(re.fullmatch(re.escape(version) + r"\+codex\.\d{14}", codex.get("version", ""))),
                "Codex version must use the shared base and timestamp suffix")
        require(codex.get("skills") == "./skills/", "Codex must expose the shared skills")
        for manifest in manifests:
            require(not manifest.get("dependencies") and not manifest.get("mcpServers"),
                    "the package must not require an external runtime")
            require("hooks" not in manifest, "hooks are platform-specific; shared rules cannot depend on them")
    require(not (root / "hooks").exists(), "hooks are platform-specific; shared rules cannot depend on them")

    skills = root / "skills"
    require((skills / "rad-ai/SKILL.md").is_file(), "main skill missing")
    operational = sorted([*skills.rglob("*.md"), *skills.rglob("*.yaml")])
    for path in operational:
        body = path.read_text(encoding="utf-8")
        prose = body.translate(str.maketrans("", "", "✅📋⚙️🙋⛔"))
        require(prose.isascii(), f"{path}: operational prose must be English; only reporting icons are allowed")
        require(len(body.splitlines()) <= 500, f"{path}: exceeds 500 lines; agents weigh the first 500 most")
        if path.name == "SKILL.md":
            require(body.startswith("---\n") and "\n---\n" in body[4:], f"{path}: frontmatter missing")
            frontmatter = body.split("---", 2)[1] if body.startswith("---") else ""
            require(f"name: {path.parent.name}\n" in frontmatter, f"{path}: name differs from directory")
            require("\nhooks:" not in "\n" + frontmatter, f"{path}: hooks are platform-specific")
            description = re.search(r"^description: (.+)$", frontmatter, re.M)
            try:
                value = json.loads(description.group(1)) if description else None
                require(isinstance(value, str) and bool(value), f"{path}: description must be a nonempty string")
            except ValueError:
                errors.append(f"{path}: description must be JSON-quoted for valid single-line YAML")
            require((path.parent / "agents/openai.yaml").is_file(), f"{path}: Codex metadata missing")
        for target in re.findall(r"\]\(([^)]+)\)", strip_code(body)):
            rel_path, _, fragment = target.partition("#")
            resolved = (path.parent / rel_path).resolve() if rel_path else path.resolve()
            require(resolved.is_relative_to(skills.resolve()), f"{path}: reference escapes operational package")
            require(resolved.is_file(), f"{path}: missing reference {target}")
            if fragment and resolved.is_file() and resolved.suffix == ".md":
                require(fragment in heading_slugs(resolved.read_text(encoding="utf-8")),
                        f"{path}: missing heading #{fragment} in {target}")
    require(bool(operational), "no operational material")
    if not errors:
        print(f"rad-ai package: {len(operational)} operational files within 500 lines; two shared platform manifests")
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    problems = check(args.root.resolve())
    for problem in problems:
        print(problem)
    raise SystemExit(bool(problems))
