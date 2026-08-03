#!/usr/bin/env python3
"""Stamp the work tooling with the plugin release it belongs to, and record its digest.

A project keeps its own copy of work.py and work-schema.json, so nothing else notices that the copy
has fallen behind the plugin or was edited locally. The pair carries one version and one digest, and
this script writes both from the current manifest. Run it before validating a release; the
distribution check refuses a release whose stamp is stale.
"""

from __future__ import annotations

import json
import pathlib
import re
import sys

PLUGIN_ROOT = pathlib.Path(__file__).resolve().parent.parent
TEMPLATES = PLUGIN_ROOT / "skills/paseo-cto/templates"
WORK = TEMPLATES / "work.py"
SCHEMA = TEMPLATES / "work-schema.json"


def main() -> int:
    sys.path.insert(0, str(TEMPLATES))
    sys.dont_write_bytecode = True
    import work as worklib

    version = json.loads((PLUGIN_ROOT / ".claude-plugin/plugin.json").read_text())["version"]
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))

    if schema.get("tooling_digest") and worklib.tooling_digest(WORK, schema) == schema[
        "tooling_digest"
    ]:
        print(f"work tooling: unchanged since {schema['tooling_version']}; stamp retained")
        return 0

    schema["tooling_version"] = version
    schema["tooling_digest"] = ""
    SCHEMA.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    WORK.write_text(
        re.sub(r'(?m)^TOOLING_VERSION = ".*"$', f'TOOLING_VERSION = "{version}"',
               WORK.read_text(encoding="utf-8"), count=1),
        encoding="utf-8",
    )

    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    schema["tooling_digest"] = worklib.tooling_digest(WORK, schema)
    SCHEMA.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"work tooling: stamped {version} at {schema['tooling_digest'][:12]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
