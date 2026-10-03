"""Reproduce recorded baseline observations without invoking or installing an agent."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile


root = Path(__file__).resolve().parent / "importer"
hashes = json.loads((root / "source-hashes.json").read_text())
for name, expected in hashes.items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, name

observations = []
cases = [
    ("valid", "id,value\na,1\nb,2\n", 0, {"a": 1, "b": 2}),
    ("duplicate_batch", "id,value\na,1\na,2\n", 2, {"a": 1}),
    ("invalid_later", "id,value\na,1\nb,invalid\n", 2, {"a": 1}),
    ("missing_value", "id,value\na\n", 1, None),
]
for name, content, status, expected in cases:
    with tempfile.TemporaryDirectory(prefix="rad-import-observation-") as directory:
        directory = Path(directory)
        source, store = directory / "input.csv", directory / "store.json"
        source.write_text(content)
        result = subprocess.run([sys.executable, "-B", "-m", "inbox", str(source), "--store", str(store)],
                                cwd=root, capture_output=True, text=True)
        actual = json.loads(store.read_text()) if store.exists() else None
        assert result.returncode == status and actual == expected, name
        observations.append({"case": name, "exit_status": status, "store": actual})
print(json.dumps(observations, indent=2))
