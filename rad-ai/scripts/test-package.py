"""Exercise package constraints on temporary source fixtures, never installed plugins."""

import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SOURCE = Path(__file__).resolve().parents[1]


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="rad-package-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "rad-ai"
        for name in ("skills", ".claude-plugin", ".codex-plugin"):
            shutil.copytree(SOURCE / name, self.root / name)

    def result(self):
        return subprocess.run(["python3", str(SOURCE / "scripts/check-package.py"), str(self.root)],
                              capture_output=True, text=True)

    def assert_rejected(self):
        result = self.result()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)

    def test_valid_shared_package(self):
        result = self.result()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_main_instruction_limit(self):
        path = self.root / "skills/rad-ai/SKILL.md"
        path.write_text(path.read_text() + "\n" + "extra " * 501)
        self.assert_rejected()

    def test_total_includes_references_and_interface_metadata(self):
        paths = [*self.root.glob("skills/**/*.md"), *self.root.glob("skills/**/*.yaml")]
        total = sum(len(path.read_text().split()) for path in paths)
        path = self.root / "skills/rad-ai/agents/openai.yaml"
        path.write_text(path.read_text() + "\n# " + "extra " * (1201 - total))
        self.assert_rejected()

    def test_reference_must_remain_inside_operational_package(self):
        outside = self.root / "unbudgeted.md"
        outside.write_text("Unbudgeted instructions")
        path = self.root / "skills/rad-ai/references/contracts.md"
        path.write_text("[material](../../../unbudgeted.md)\n")
        self.assert_rejected()

    def test_required_metadata(self):
        (self.root / "skills/rad-ai-review/agents/openai.yaml").unlink()
        self.assert_rejected()

    def test_unquoted_description_cannot_pass_as_valid_yaml(self):
        path = self.root / "skills/rad-ai/SKILL.md"
        lines = path.read_text().splitlines()
        lines[2] = "description: A bounded cycle: implement and accept"
        path.write_text("\n".join(lines) + "\n")
        self.assert_rejected()

    def test_operational_language(self):
        path = self.root / "skills/rad-ai/references/contracts.md"
        path.write_text("\u0442\u0435\u043a\u0441\u0442\n")
        self.assert_rejected()

    def test_platform_versions_must_match(self):
        path = self.root / ".codex-plugin/plugin.json"
        data = json.loads(path.read_text())
        data["version"] = "0.0.0+codex.20000101000000"
        path.write_text(json.dumps(data))
        self.assert_rejected()


if __name__ == "__main__":
    unittest.main()
