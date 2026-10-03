"""Verify calculated reports against task mutations and review protocol boundaries."""

from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "skills/rad-ai/scripts/report.py"
spec = importlib.util.spec_from_file_location("rad_report", SCRIPT)
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


def snapshot():
    tasks = [{"id": f"T{i}", "state": "done" if i <= 20 else "ready"} for i in range(1, 36)]
    for index, state in ((20, "active"), (21, "active"), (22, "review"), (23, "blocked")):
        tasks[index]["state"] = state
    return {"stage": "W5", "tasks": tasks, "decisions": [
        {"id": "D1", "state": "open", "requires_human": True},
        {"id": "D2", "state": "resolved", "requires_human": True},
        {"id": "D3", "state": "open", "requires_human": False}],
        "percent": 100, "total": 999}


class ReportTests(unittest.TestCase):
    def test_status_is_derived_not_cached(self):
        value = snapshot()
        self.assertEqual(report.status_line(value), "W5(57%) 📋 35 ⚙️ 3 🙋 1")
        value["tasks"][20]["state"] = "done"
        value["decisions"][0]["state"] = "resolved"
        self.assertEqual(report.status_line(value), "W5(60%) 📋 35 ⚙️ 2 🙋 0")
        value["tasks"][0]["state"] = "active"
        value["tasks"].append({"id": "T36", "state": "ready"})
        self.assertEqual(report.status_line(value), "W5(56%) 📋 36 ⚙️ 3 🙋 0")

    def test_unique_ids_and_cancelled_tasks(self):
        value = snapshot()
        value["tasks"].append(deepcopy(value["tasks"][0]))
        value["tasks"].append({"id": "cancelled", "state": "cancelled"})
        value["decisions"].append(deepcopy(value["decisions"][0]))
        self.assertEqual(report.status_line(value), "W5(57%) 📋 35 ⚙️ 3 🙋 1")
        value["tasks"][-2]["state"] = "active"
        with self.assertRaises(ValueError):
            report.status_line(value)

    def test_empty_stage_and_half_up_rounding(self):
        self.assertEqual(report.status_line({"stage": "W0", "tasks": [], "decisions": []}),
                         "W0(0%) 📋 0 ⚙️ 0 🙋 0")
        for count in range(1, 71):
            for done in range(count + 1):
                value = {"stage": "W", "decisions": [], "tasks": [
                    {"id": str(i), "state": "done" if i < done else "ready"} for i in range(count)]}
                quotient, remainder = divmod(100 * done, count)
                expected = quotient + (2 * remainder >= count)
                self.assertTrue(report.status_line(value).startswith(f"W({expected}%) "))

    def test_missing_or_contradictory_records_are_not_zero(self):
        for value in ({"stage": "W5"}, {"stage": "W5", "tasks": [], "decisions": [
            {"id": "D", "state": "open"}]}, {"stage": "W5", "tasks": [
            {"id": "T", "state": "unknown"}], "decisions": []}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                report.status_line(value)

    def test_scores_do_not_choose_verdict(self):
        self.assertEqual(report.verdict_line({"verdict": "RETURN", "round": 2, "score": 8}),
                         "RETURN R2 (8/10)")
        self.assertEqual(report.verdict_line({"verdict": "ACCEPT", "round": 3, "score": 7}),
                         "ACCEPT R3 (7/10)")
        self.assertEqual(report.verdict_line({"verdict": "UNVERIFIED", "round": 1, "score": None}),
                         "UNVERIFIED R1 (n/a)")
        for field, value in (("round", 0), ("round", True), ("score", 11), ("score", 0), ("score", True)):
            record = {"verdict": "ACCEPT", "round": 1, "score": 9, field: value}
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                report.verdict_line(record)

    def test_cli_reloads_current_file_each_invocation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "record.json"
            value = snapshot()
            path.write_text(json.dumps(value))
            result = subprocess.run([sys.executable, str(SCRIPT), "status", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(result.stdout.strip(), "W5(57%) 📋 35 ⚙️ 3 🙋 1")
            value["tasks"][20]["state"] = "done"
            path.write_text(json.dumps(value))
            result = subprocess.run([sys.executable, str(SCRIPT), "status", str(path)], capture_output=True, text=True)
            self.assertEqual(result.stdout.strip(), "W5(60%) 📋 35 ⚙️ 2 🙋 1")
            path.write_text("{}")
            result = subprocess.run([sys.executable, str(SCRIPT), "status", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(result.stdout, "")


if __name__ == "__main__":
    unittest.main()
