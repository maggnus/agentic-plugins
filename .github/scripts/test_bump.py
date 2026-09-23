#!/usr/bin/env python3
"""Exercise shared releases in temporary Git repositories without publishing."""

import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


class SharedReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.names = ("paseo-cto", "russian-speech", "brief", "team")
        scripts = self.root / ".github/scripts"
        scripts.mkdir(parents=True)
        shutil.copyfile(Path(__file__).with_name("bump.py"), scripts / "bump.py")
        marketplace = self.root / ".claude-plugin/marketplace.json"
        marketplace.parent.mkdir()
        marketplace.write_text(json.dumps({"plugins": [
            {"name": name, "source": f"./{name}"} for name in self.names]}))
        for name in self.names:
            # Include the old independent versions to exercise the migration.
            version = "12.0.3" if name == "paseo-cto" else "1.1.2"
            for platform in (".claude-plugin", ".codex-plugin"):
                path = self.root / name / platform / "plugin.json"
                path.parent.mkdir(parents=True)
                path.write_text(json.dumps({"name": name, "version": version}))
            (self.root / name / "README.md").write_text("Install v12.0.3\n")
        (self.root / "README.md").write_text("Install v12.0.3\n")
        self.git("init", "-q")
        self.git("config", "user.name", "Release test")
        self.git("config", "user.email", "test@example.invalid")
        self.commit("initial")
        self.git("tag", "v12.0.3")

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.root, check=True,
                              capture_output=True, text=True).stdout

    def commit(self, message):
        self.git("add", "-A")
        self.git("commit", "-qm", message, "--allow-empty")

    def run_bump(self, *args, expected=0):
        result = subprocess.run([sys.executable, str(self.root / ".github/scripts/bump.py"),
                                 *args], cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
        return result

    def assert_version(self, version):
        codex_versions = set()
        for name in self.names:
            claude = json.loads((self.root / name / ".claude-plugin/plugin.json").read_text())
            codex = json.loads((self.root / name / ".codex-plugin/plugin.json").read_text())
            self.assertEqual(claude["version"], version)
            self.assertTrue(codex["version"].startswith(version + "+codex."))
            codex_versions.add(codex["version"])
            self.assertEqual((self.root / name / "README.md").read_text(), f"Install v{version}\n")
        self.assertEqual(len(codex_versions), 1)
        self.assertEqual((self.root / "README.md").read_text(), f"Install v{version}\n")

    def test_scoped_feature_updates_every_plugin(self):
        (self.root / "russian-speech/rule.md").write_text("changed")
        self.commit("feat(russian-speech): improve explanations")
        self.run_bump()
        self.assert_version("12.1.0")

    def test_repository_only_change_updates_every_plugin(self):
        (self.root / "AGENTS.md").write_text("GitHub only")
        self.commit("docs: installation policy")
        self.run_bump()
        self.assert_version("12.0.4")

    def test_highest_change_level_applies_globally(self):
        self.commit("fix(brief): correction")
        self.commit("feat(team): new rule\n\nBREAKING CHANGE: replace the workflow")
        self.run_bump()
        self.assert_version("13.0.0")

    def test_dry_run_is_read_only_and_level_override_is_global(self):
        self.commit("feat(team): new rule")
        self.run_bump("--dry-run")
        self.assertEqual(self.git("status", "--porcelain"), "")
        self.run_bump("--level", "patch")
        self.assert_version("12.0.4")

    def test_no_changes_produce_no_release(self):
        self.run_bump(expected=2)
        self.assertEqual(self.git("status", "--porcelain"), "")

    def test_refresh_updates_all_codex_manifests_only(self):
        self.commit("fix: release")
        self.run_bump()
        for name in self.names:
            path = self.root / name / ".codex-plugin/plugin.json"
            data = json.loads(path.read_text())
            data["version"] = "12.0.4+codex.20000101000000"
            path.write_text(json.dumps(data))
        self.commit("prepared")
        self.run_bump("--refresh-codex")
        self.assert_version("12.0.4")
        changed = set(self.git("diff", "--name-only").splitlines())
        self.assertEqual(changed, {f"{name}/.codex-plugin/plugin.json" for name in self.names})

    def test_refresh_rejects_mismatched_plugin_before_writing(self):
        self.commit("fix: release")
        self.run_bump()
        # Matching platform versions for one plugin must still fail globally.
        for platform in (".claude-plugin", ".codex-plugin"):
            path = self.root / "brief" / platform / "plugin.json"
            data = json.loads(path.read_text())
            data["version"] = "1.0.0"
            path.write_text(json.dumps(data))
        self.commit("mismatch")
        result = self.run_bump("--refresh-codex", expected=1)
        self.assertIn("all plugins must share one base version", result.stderr)
        self.assertEqual(self.git("status", "--porcelain"), "")


if __name__ == "__main__":
    unittest.main()
