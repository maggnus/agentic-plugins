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

    def test_instruction_line_limit(self):
        for name in ("skills/rad-ai/SKILL.md", "skills/rad-ai-review/SKILL.md", "skills/rad-ai/references/contracts.md"):
            path = self.root / name
            original = path.read_text(encoding="utf-8")
            base = original.rstrip("\n")
            padding = 500 - len(base.splitlines())
            with self.subTest(name, lines=500):
                path.write_text(base + "\nextra" * padding, encoding="utf-8")
                self.assertEqual(self.result().returncode, 0)
            with self.subTest(name, lines=501):
                path.write_text(base + "\nextra" * (padding + 1), encoding="utf-8")
                self.assert_rejected()
            path.write_text(original, encoding="utf-8")

    def test_platform_hooks_are_rejected(self):
        for platform in (".claude-plugin", ".codex-plugin"):
            path = self.root / platform / "plugin.json"
            original = path.read_text(encoding="utf-8")
            with self.subTest(platform):
                path.write_text(json.dumps({**json.loads(original), "hooks": "./hooks/hooks.json"}), encoding="utf-8")
                self.assert_rejected()
            path.write_text(original, encoding="utf-8")
        path = self.root / "skills/rad-ai/SKILL.md"
        original = path.read_text(encoding="utf-8")
        path.write_text(original.replace("---\n", "---\nhooks:\n  Stop: []\n", 1), encoding="utf-8")
        self.assert_rejected()
        path.write_text(original, encoding="utf-8")
        (self.root / "hooks").mkdir()
        self.assert_rejected()

    def test_length_is_not_limited_by_words(self):
        path = self.root / "skills/rad-ai/SKILL.md"
        path.write_text(path.read_text(encoding="utf-8") + "\n" + "extra " * 2000, encoding="utf-8")
        result = self.result()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_reference_must_remain_inside_operational_package(self):
        outside = self.root / "unbudgeted.md"
        outside.write_text("Unbudgeted instructions", encoding="utf-8")
        path = self.root / "skills/rad-ai/references/contracts.md"
        path.write_text("[material](../../../unbudgeted.md)\n", encoding="utf-8")
        self.assert_rejected()

    def test_broken_heading_fragment_is_rejected(self):
        path = self.root / "skills/rad-ai-review/SKILL.md"
        path.write_text(path.read_text(encoding="utf-8") + "\nSee [missing](../rad-ai/references/contracts.md#no-such-heading).\n",
                        encoding="utf-8")
        self.assert_rejected()

    def test_required_metadata(self):
        (self.root / "skills/rad-ai-review/agents/openai.yaml").unlink()
        self.assert_rejected()

    def test_unquoted_description_cannot_pass_as_valid_yaml(self):
        path = self.root / "skills/rad-ai/SKILL.md"
        lines = path.read_text(encoding="utf-8").splitlines()
        lines[2] = "description: A bounded cycle: implement and accept"
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        self.assert_rejected()

    def test_operational_language(self):
        path = self.root / "skills/rad-ai/references/contracts.md"
        path.write_text("\u0442\u0435\u043a\u0441\u0442\n", encoding="utf-8")
        self.assert_rejected()

    def test_platform_versions_must_match(self):
        path = self.root / ".codex-plugin/plugin.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data["version"] = "0.0.0+codex.20000101000000"
        path.write_text(json.dumps(data), encoding="utf-8")
        self.assert_rejected()


if __name__ == "__main__":
    unittest.main()
