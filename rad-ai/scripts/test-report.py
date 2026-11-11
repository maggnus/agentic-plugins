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
        self.assertEqual(report.status_line(value), "W5 (57%) ✅ 20 📋 35 ⚙️ 3 🙋 1 ⛔ 1")
        value["tasks"][20]["state"] = "done"
        value["decisions"][0]["state"] = "resolved"
        self.assertEqual(report.status_line(value), "W5 (60%) ✅ 21 📋 35 ⚙️ 2 🙋 0")
        value["tasks"][0]["state"] = "active"
        value["tasks"].append({"id": "T36", "state": "ready"})
        self.assertEqual(report.status_line(value), "W5 (56%) ✅ 20 📋 36 ⚙️ 3 🙋 0")

    def test_unique_ids_and_cancelled_tasks(self):
        value = snapshot()
        value["tasks"].append(deepcopy(value["tasks"][0]))
        value["tasks"].append({"id": "cancelled", "state": "cancelled"})
        value["decisions"].append(deepcopy(value["decisions"][0]))
        self.assertEqual(report.status_line(value), "W5 (57%) ✅ 20 📋 35 ⚙️ 3 🙋 1 ⛔ 1")
        value["tasks"][-2]["state"] = "active"
        with self.assertRaises(ValueError):
            report.status_line(value)

    def test_blocked_tasks_show_only_when_present(self):
        tasks = [{"id": "a", "state": "done"}, {"id": "b", "state": "blocked"}, {"id": "c", "state": "blocked"},
                 {"id": "d", "state": "ready"}]
        self.assertEqual(report.status_line({"stage": "W5", "tasks": tasks, "decisions": []}),
                         "W5 (25%) \u2705 1 \U0001F4CB 4 \u2699\ufe0f 0 \U0001F64B 0 \u26d4 2")
        self.assertNotIn("\u26d4", report.status_line({"stage": "W5", "tasks": tasks[:1], "decisions": []}))

    def test_empty_stage_and_half_up_rounding(self):
        self.assertEqual(report.status_line({"stage": "W0", "tasks": [], "decisions": []}),
                         "W0 (0%) ✅ 0 📋 0 ⚙️ 0 🙋 0")
        for count in range(1, 71):
            for done in range(count + 1):
                value = {"stage": "W", "decisions": [], "tasks": [
                    {"id": str(i), "state": "done" if i < done else "ready"} for i in range(count)]}
                quotient, remainder = divmod(100 * done, count)
                expected = quotient + (2 * remainder >= count)
                self.assertTrue(report.status_line(value).startswith(f"W ({expected}%) ✅ {done} 📋 {count} "))

    def test_missing_or_contradictory_records_are_not_zero(self):
        for value in ({"stage": "W5"}, {"stage": "W5 depth", "tasks": [], "decisions": []},
                      {"stage": "W5", "tasks": [], "decisions": [
            {"id": "D", "state": "open"}]}, {"stage": "W5", "tasks": [
            {"id": "T", "state": "unknown"}], "decisions": []}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                report.status_line(value)

    def test_acceptance_requires_completion_conditions(self):
        sha = "3f9c2e1a7b"
        check = {"command": "make test", "exit": 0, "result": "pass", "revision": sha}
        observed = {"command": "open /claims and submit the form", "result": "pass", "revision": sha[:7]}
        exception = {"decision": "owner D4 2026-11-07", "subject": "label wording", "applies_to": "T7 3f9c2e1"}
        excepted = {"id": "F1", "kind": "defect", "state": "excepted", "exception": exception}
        open_defect = {"id": "F1", "kind": "defect", "state": "open"}
        def review(**fields):
            return {"verdict": "ACCEPT", "round": 1, "score": 10, "commit": sha,
                    "findings": [], "checks": [check], **fields}
        accepted = {
            "ACCEPT R1 (10/10)": [review(), review(checks=[check, observed]),
                                  review(findings=[{"id": "F1", "kind": "suggestion", "state": "open"}]),
                                  review(checks=[check, {**check, "exit": 1, "result": "fail", "required": False}]),
                                  review(unchecked=[{"condition": "Safari", "required": False}]),
                                  review(commit="r42", checks=[{**check, "revision": "r42"}])],
            "ACCEPT R2 (9/10)": [review(round=2, score=9, findings=[excepted])],
            "RETURN R2 (8/10)": [{"verdict": "RETURN", "round": 2, "score": 8, "findings": [open_defect]}],
            "UNVERIFIED R1 (n/a)": [{"verdict": "UNVERIFIED", "round": 1, "score": None}],
        }
        for line, records in accepted.items():
            for record in records:
                with self.subTest(line=line, record=record):
                    self.assertEqual(report.verdict_line(record), line)
        def exception_without(field, value=None):
            return review(score=9, findings=[{**excepted, "exception": {**exception, field: value}}])
        rejected = {
            "passing score with a known defect": review(score=8, findings=[open_defect]),
            "open defect at 10": review(findings=[open_defect]),
            "7 without defects": review(score=7),
            "9 without an exception": review(score=9),
            "10 hiding an exception": review(findings=[excepted]),
            "bare authorized_by": review(score=9, findings=[
                {"id": "F1", "kind": "defect", "state": "excepted", "authorized_by": "owner"}]),
            "exception without decision": exception_without("decision"),
            "exception with empty decision": exception_without("decision", ""),
            "exception without subject": exception_without("subject"),
            "exception without applicability": exception_without("applies_to"),
            "excepted suggestion": review(score=9, findings=[{**excepted, "kind": "suggestion"}]),
            "unknown finding kind": review(findings=[{"id": "F1", "kind": "nit", "state": "resolved"}]),
            "unknown finding state": review(findings=[{"id": "F1", "kind": "defect", "state": "deferred"}]),
            "no checks": review(checks=[]),
            "only optional checks": review(checks=[{**check, "required": False}]),
            "failed check": review(checks=[{**check, "exit": 1, "result": "fail"}]),
            "failed observation": review(checks=[check, {**observed, "result": "fail"}]),
            "exit contradicts result": review(checks=[{**check, "exit": 1}]),
            "check without result": review(checks=[{"command": "make test", "revision": sha}]),
            "check without command": review(checks=[{**check, "command": ""}]),
            "stale check": review(checks=[{**check, "revision": "0a1b2c3d4e"}]),
            "ambiguous short revision": review(checks=[{**check, "revision": sha[:4]}]),
            "required condition unchecked": review(unchecked=[{"condition": "e2e", "required": True}]),
            "malformed unchecked": review(unchecked=[{"condition": "e2e"}]),
            "plain unchecked text is required": review(unchecked=["e2e not run"]),
            "empty unchecked text": review(unchecked=[""]),
            "unchecked not a list": review(unchecked="e2e"),
            "unchecked as an object": review(unchecked={}),
            "required as text": review(checks=[{**check, "required": "false"}]),
            "check without revision": review(checks=[{k: v for k, v in check.items() if k != "revision"}]),
            "missing findings": {k: v for k, v in review().items() if k != "findings"},
            "missing commit": {k: v for k, v in review().items() if k != "commit"},
            "empty commit": review(commit=""),
            "return without a defect": {"verdict": "RETURN", "round": 1, "score": 6, "findings": []},
            "return at 9": {"verdict": "RETURN", "round": 1, "score": 9, "findings": [open_defect]},
            "unverified with a score": {"verdict": "UNVERIFIED", "round": 1, "score": 5},
        }
        for name, record in rejected.items():
            with self.subTest(name), self.assertRaises(ValueError):
                report.verdict_line(record)
        for field, value in (("round", 0), ("round", True), ("score", 11), ("score", 0), ("score", True)):
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                report.verdict_line(review(**{field: value}))

    def test_cli_rejects_inconsistent_verdict(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "review.json"
            path.write_text(json.dumps({"verdict": "ACCEPT", "round": 1, "score": 8, "commit": "3f9c2e1a7b",
                                        "findings": [{"id": "F1", "kind": "defect", "state": "open"}],
                                        "checks": []}))
            result = subprocess.run([sys.executable, str(SCRIPT), "verdict", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(result.stdout, "")

    def test_cli_reloads_current_file_each_invocation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "record.json"
            value = snapshot()
            path.write_text(json.dumps(value))
            result = subprocess.run([sys.executable, str(SCRIPT), "status", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(result.stdout.strip(), "W5 (57%) ✅ 20 📋 35 ⚙️ 3 🙋 1 ⛔ 1")
            value["tasks"][20]["state"] = "done"
            path.write_text(json.dumps(value))
            result = subprocess.run([sys.executable, str(SCRIPT), "status", str(path)], capture_output=True, text=True)
            self.assertEqual(result.stdout.strip(), "W5 (60%) ✅ 21 📋 35 ⚙️ 2 🙋 1")
            path.write_text("{}")
            result = subprocess.run([sys.executable, str(SCRIPT), "status", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(result.stdout, "")


if __name__ == "__main__":
    unittest.main()
