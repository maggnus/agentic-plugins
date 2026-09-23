"""Check shared version writes without installing plugins or publishing."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


class PrepareReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        scripts = self.root / ".github/scripts"
        scripts.mkdir(parents=True)
        self.script = scripts / "prepare_release.py"
        shutil.copyfile(Path(__file__).with_name("prepare_release.py"), self.script)
        marketplace = self.root / ".claude-plugin/marketplace.json"
        marketplace.parent.mkdir()
        marketplace.write_text(json.dumps({"plugins": [
            {"name": name, "source": "./" + name} for name in ("one", "two")]}))
        self.paths = []
        for name in ("one", "two"):
            for platform in (".claude-plugin", ".codex-plugin"):
                path = self.root / name / platform / "plugin.json"
                path.parent.mkdir(parents=True)
                path.write_text(json.dumps({"name": name, "version": "12.0.4", "skills": "./skills/"}))
                self.paths.append(path)
            (self.root / name / "README.md").write_text("Install v12.0.4")
        (self.root / "README.md").write_text("Install v12.0.4")

    def run_prepare(self, version):
        return subprocess.run(["python3", str(self.script), version], capture_output=True, text=True)

    def test_shared_versions_and_readmes(self):
        result = self.run_prepare("12.1.0")
        self.assertEqual(result.returncode, 0, result.stderr)
        codex = set()
        for path in self.paths:
            data = json.loads(path.read_text())
            self.assertEqual(data["skills"], "./skills/")
            if path.parent.name == ".codex-plugin":
                self.assertRegex(data["version"], r"^12\.1\.0\+codex\.\d{14}$")
                codex.add(data["version"])
            else:
                self.assertEqual(data["version"], "12.1.0")
        self.assertEqual(len(codex), 1)
        for path in [self.root / "README.md", *self.root.glob("*/README.md")]:
            self.assertEqual(path.read_text(), "Install v12.1.0")

    def test_invalid_version_or_mismatched_manifests_write_nothing(self):
        original = {path: path.read_bytes() for path in self.paths}
        self.assertNotEqual(self.run_prepare("invalid").returncode, 0)
        self.assertEqual(original, {path: path.read_bytes() for path in self.paths})
        self.paths[0].write_text('{"version": "1.0.0"}')
        original = {path: path.read_bytes() for path in self.paths}
        self.assertNotEqual(self.run_prepare("12.1.0").returncode, 0)
        self.assertEqual(original, {path: path.read_bytes() for path in self.paths})


if __name__ == "__main__":
    unittest.main()
