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
        self.assertEqual(report.status_line(value), "W5 (57%) ✅ 20 📋 11 ⚙️ 3 ⛔ 1 🙋 1")
        value["tasks"][20]["state"] = "done"
        value["decisions"][0]["state"] = "resolved"
        self.assertEqual(report.status_line(value), "W5 (60%) ✅ 21 📋 11 ⚙️ 2 ⛔ 1 🙋 0")
        value["tasks"][0]["state"] = "active"
        value["tasks"].append({"id": "T36", "state": "ready"})
        self.assertEqual(report.status_line(value), "W5 (56%) ✅ 20 📋 12 ⚙️ 3 ⛔ 1 🙋 0")

    def test_unique_ids_and_cancelled_tasks(self):
        value = snapshot()
        value["tasks"].append(deepcopy(value["tasks"][0]))
        value["tasks"].append({"id": "cancelled", "state": "cancelled"})
        value["decisions"].append(deepcopy(value["decisions"][0]))
        self.assertEqual(report.status_line(value), "W5 (57%) ✅ 20 📋 11 ⚙️ 3 ⛔ 1 🙋 1")
        value["tasks"][-2]["state"] = "active"
        with self.assertRaises(ValueError):
            report.status_line(value)

    def test_blocked_tasks_show_only_when_present(self):
        tasks = [{"id": "a", "state": "done"}, {"id": "b", "state": "blocked"}, {"id": "c", "state": "blocked"},
                 {"id": "d", "state": "ready"}]
        self.assertEqual(report.status_line({"stage": "W5", "tasks": tasks, "decisions": []}),
                         "W5 (25%) \u2705 1 \U0001F4CB 1 \u2699\ufe0f 0 \u26d4 2 \U0001F64B 0")
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
                self.assertTrue(report.status_line(value).startswith(f"W ({expected}%) ✅ {done} 📋 {count - done} "))

    def test_missing_or_contradictory_records_are_not_zero(self):
        for value in ({"stage": "W5"}, {"stage": "W5 depth", "tasks": [], "decisions": []},
                      {"stage": "W5", "tasks": [], "decisions": [
            {"id": "D", "state": "open"}]}, {"stage": "W5", "tasks": [
            {"id": "T", "state": "unknown"}], "decisions": []}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                report.status_line(value)

    def test_only_blocking_defects_return_an_outcome(self):
        sha = "3f9c2e1a7b"
        check = {"command": "make test", "exit": 0, "result": "pass", "revision": sha}
        observed = {"command": "open /claims and submit the form", "result": "pass", "revision": sha[:7]}
        blocking = {"id": "F1", "kind": "blocking", "state": "open",
                    "requirement": "owner: status visible in the portal", "reproduction": "GET /status returns 500"}
        correction = {"id": "F2", "kind": "correction", "state": "open", "check": "grep -c fork docs/record.md"}
        closed = {**correction, "state": "resolved", "revision": sha, "result": "pass"}
        note = {"id": "F3", "kind": "note", "state": "open"}
        def review(**fields):
            return {"verdict": "ACCEPT", "round": 1, "commit": sha, "findings": [], "checks": [check], **fields}
        def returned(*findings, round=1, **fields):
            return {"verdict": "RETURN", "round": round, "findings": list(findings), **fields}
        accepted = {
            "ACCEPT R1 (blocking 0, corrections 0)": [
                review(), review(checks=[check, observed]), review(findings=[note]), review(findings=[closed]),
                review(findings=[{**blocking, "state": "resolved"}]),
                review(checks=[check, {**check, "exit": 1, "result": "fail", "required": False}]),
                review(unchecked=[{"condition": "Safari", "required": False}]),
                review(commit="r42", checks=[{**check, "revision": "r42"}]),
                review(commit=sha.upper(), checks=[{**check, "revision": sha[:7]}])],
            "ACCEPT R1 (blocking 0, corrections 2)": [
                review(findings=[correction, {**correction, "id": "F4"}, note, closed | {"id": "F5"}])],
            "RETURN R2 (blocking 1, corrections 1)": [returned(blocking, correction, note, round=2)],
            "RETURN R1 (blocking 2, corrections 0)": [returned(blocking, {**blocking, "id": "F9"})],
            "UNVERIFIED R1": [{"verdict": "UNVERIFIED", "round": 1}],
        }
        for line, records in accepted.items():
            for record in records:
                with self.subTest(line=line, record=record):
                    self.assertEqual(report.verdict_line(record), line)
        rejected = {
            "accept with a blocking defect": review(findings=[blocking]),
            "return for corrections only": returned(correction),
            "return for a note": returned(note),
            "return without findings": returned(),
            "return for a resolved blocking defect": returned({**blocking, "state": "resolved"}),
            "score on accept": review(score=10),
            "score on return": {**returned(blocking), "score": 8},
            "score on unverified": {"verdict": "UNVERIFIED", "round": 1, "score": None},
            "malformed checks on unverified": {"verdict": "UNVERIFIED", "round": 1, "checks": "broken"},
            "malformed findings on unverified": {"verdict": "UNVERIFIED", "round": 1, "findings": "broken"},
            "contradictory check on return": returned(blocking, checks=[{**check, "exit": 1}]),
            "empty commit on return": returned(blocking, commit=""),
            "finding round exceeds review round": review(findings=[{**note, "round": 2}]),
            "nonpositive finding round": review(findings=[{**note, "round": 0}]),
            "boolean finding round": review(findings=[{**note, "round": True}]),
            "correction without a check": review(findings=[{"id": "F2", "kind": "correction", "state": "open"}]),
            "correction with an empty check": review(findings=[{**correction, "check": ""}]),
            "resolved correction without a revision": review(findings=[
                {**correction, "state": "resolved", "result": "pass"}]),
            "resolved correction without a passing result": review(findings=[
                {**correction, "state": "resolved", "revision": sha}]),
            "resolved correction with a failed result": review(findings=[{**closed, "result": "fail"}]),
            "blocking defect without a requirement": returned({k: v for k, v in blocking.items() if k != "requirement"}),
            "blocking defect without a reproduction": returned({**blocking, "reproduction": ""}),
            "conflicting finding IDs": returned(blocking, {**blocking, "reproduction": "another"}),
            "unhashable finding kind": review(findings=[{"id": "F1", "kind": ["note"], "state": "open"}]),
            "unhashable finding state": review(findings=[{"id": "F1", "kind": "note", "state": {}}]),
            "old defect kind": review(findings=[{"id": "F1", "kind": "defect", "state": "resolved"}]),
            "old excepted state": review(findings=[{**blocking, "state": "excepted"}]),
            "unknown verdict": review(verdict="PASS"),
            "no checks": review(checks=[]),
            "only optional checks": review(checks=[{**check, "required": False}]),
            "failed check": review(checks=[{**check, "exit": 1, "result": "fail"}]),
            "failed observation": review(checks=[check, {**observed, "result": "fail"}]),
            "exit contradicts result": review(checks=[{**check, "exit": 1}]),
            "check without result": review(checks=[{"command": "make test", "revision": sha}]),
            "check without command": review(checks=[{**check, "command": ""}]),
            "stale check": review(checks=[{**check, "revision": "0a1b2c3d4e"}]),
            "ambiguous short revision": review(checks=[{**check, "revision": sha[:4]}]),
            "non-hex symbolic prefix collision": review(commit="release-10",
                                                        checks=[{**check, "revision": "release-1"}]),
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
        }
        for name, record in rejected.items():
            with self.subTest(name), self.assertRaises(ValueError):
                report.verdict_line(record)
        for value in (0, True, "1"):
            with self.subTest(round=value), self.assertRaises(ValueError):
                report.verdict_line(review(round=value))

    def test_completion_closes_every_correction_on_the_final_revision(self):
        earlier_sha, sha, fixed = "1a2b3c4d5e", "3f9c2e1a7b", "9d04c7e5b1"
        check = {"command": "make test", "exit": 0, "result": "pass", "revision": sha}
        correction = {"id": "F2", "kind": "correction", "state": "open", "check": "grep -c fork docs/record.md"}
        def closed(revision, **fields):
            return {**correction, "state": "resolved", "revision": revision, "result": "pass", **fields}
        def review(*findings, **fields):
            return {"verdict": "ACCEPT", "round": 2, "commit": sha, "findings": list(findings),
                    "checks": [check], **fields}
        complete = [
            review(),
            review({"id": "F3", "kind": "note", "state": "open"}, closed(sha[:7])),
            review(closed(fixed), closed(fixed[:7], id="F4"), final=fixed),
            review(closed(earlier_sha, id="F1", round=1)),
            review(closed(earlier_sha, id="F1", round=1), closed(fixed, id="F2", round=2), final=fixed),
        ]
        for record in complete:
            with self.subTest(record=record):
                self.assertEqual(report.closure_line(record), "COMPLETE R2")
        rejected = {
            "open correction": review(correction),
            "open correction of an earlier round beside a closed one": review(
                closed(fixed), {**correction, "id": "F4", "round": 1}, final=fixed),
            "fix revision not declared final": review(closed(fixed)),
            "corrections closed on different revisions in the final round": review(
                closed(fixed), closed(sha, id="F4"), final=fixed),
            "final differs from commit with only an earlier-round closed correction": review(
                closed(earlier_sha, id="F1", round=1), final=fixed),
            "empty final revision": review(final=""),
            "final revision without a correction fix": review(final=fixed),
            "final revision with only a note": review({"id": "F3", "kind": "note", "state": "open"}, final=fixed),
            "returned outcome": {"verdict": "RETURN", "round": 1, "findings": [
                {"id": "F1", "kind": "blocking", "state": "open", "requirement": "r", "reproduction": "x"}]},
            "unverified outcome": {"verdict": "UNVERIFIED", "round": 1},
            "accepted record that is inconsistent": review(checks=[]),
        }
        for name, record in rejected.items():
            with self.subTest(name), self.assertRaises(ValueError):
                report.closure_line(record)

    def test_cli_verdict_and_complete(self):
        blocking = {"id": "F1", "kind": "blocking", "state": "open", "requirement": "r", "reproduction": "x"}
        accepted = {"verdict": "ACCEPT", "round": 1, "commit": "3f9c2e1a7b", "findings": [],
                    "checks": [{"command": "make test", "result": "pass", "revision": "3f9c2e1a7b"}]}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "review.json"
            def run(kind, record):
                path.write_text(json.dumps(record), encoding="utf-8")
                return subprocess.run([sys.executable, str(SCRIPT), kind, str(path)], capture_output=True, text=True)
            for kind, line in (("verdict", "ACCEPT R1 (blocking 0, corrections 0)"), ("complete", "COMPLETE R1")):
                result = run(kind, accepted)
                self.assertEqual((result.returncode, result.stdout.strip()), (0, line))
                result = run(kind, {**accepted, "findings": [blocking], "checks": []})
                self.assertEqual((result.returncode, result.stdout), (2, ""))
            result = run("complete", {**accepted, "findings": [
                {"id": "F2", "kind": "correction", "state": "open", "check": "make lint"}]})
            self.assertEqual((result.returncode, result.stdout), (2, ""))
            self.assertIn("make lint", result.stderr)
            result = run("complete", {**accepted, "findings": [
                {"id": "F2", "kind": "correction", "state": "resolved", "check": "make lint",
                 "result": "pass", "revision": "9d04c7e5b1"}]})
            self.assertEqual((result.returncode, result.stdout), (2, ""))
            self.assertIn("`final`", result.stderr)

    def test_acceptance_list_changes_only_by_passes_or_appended_amendments(self):
        def item(key="A1", **fields):
            return {"id": key, "behavior": "A visitor resets a forgotten password",
                    "steps": ["Open /login and choose Forgot password", "Submit the address: a reset message arrives"],
                    "passes": False, **fields}
        def listed(*items):
            return {"stage": "W5", "items": list(items)}
        passed = item(passes=True, revision="3f9c2e1a7b")
        base = listed(item(), item("A2"))
        self.assertEqual(report.acceptance_line(base), "W5 acceptance 0/2")
        amended = {"steps": ["Open /sign-in and choose Forgot password", "Submit the address: a reset message arrives"],
                   "amended": ["R1 F4: the form moved to /sign-in"]}
        allowed = {
            "W5 acceptance 1/2": [listed(passed, item("A2")), listed(item("A2"), passed)],
            "W5 acceptance 0/2": [deepcopy(base),
                                  listed(item(**amended), item("A2")),
                                  listed(item(behavior="Owner decision D7", amended=["D7"]), item("A2"))],
            "W5 acceptance 1/3": [listed(passed, item("A2"), item("A3", behavior="Added by the contract amendment"))],
            "W5 acceptance 1/1": [listed(passed, item("A2", removed="Owner decision D9: deferred to W6"))],
        }
        for line, values in allowed.items():
            for value in values:
                with self.subTest(line=line, value=value):
                    self.assertEqual(report.acceptance_line(value, base), line)
        self.assertEqual(report.acceptance_line(base, listed(passed, item("A2"))), "W5 acceptance 0/2")
        edited = {
            "deleted item": listed(item("A2")),
            "reworded behavior": listed(item(behavior="A visitor sees the login page"), item("A2")),
            "dropped step": listed(item(steps=["Open /login and choose Forgot password"]), item("A2")),
            "weakened step": listed(item(steps=["Open /login and choose Forgot password", "Submit the address"]),
                                    item("A2")),
            "amended without changing text": listed(item(amended=["R1 F4"]), item("A2")),
            "renamed item": listed(item("A9"), item("A2")),
            "another stage": {**deepcopy(base), "stage": "W6"},
        }
        for name, value in edited.items():
            with self.subTest(name):
                with self.assertRaises(ValueError):
                    report.acceptance_line(value, base)
        malformed = {
            "not an object": [], "no items": {"stage": "W5"}, "empty list": listed(),
            "items not a list": {"stage": "W5", "items": {}}, "item not an object": listed("A1"),
            "missing stage": {"items": [item()]}, "stage with words": {**listed(item()), "stage": "W5 login"},
            "empty amendment list": listed(item(amended=[])),
            "amendment as string": listed(item(amended="R1 F4")),
            "amendment entry empty": listed(item(amended=[""])),
            "duplicate amendment entry": listed(item(amended=["R1 F4", "R1 F4"])),
            "amendment record not text": listed(item(amended=[True])),
            "empty removed decision": listed(item(removed="")),
            "removed item passing": listed(item(passes=True, revision="3f9c2e1a7b", removed="D9")),
            "all items removed": listed(item(removed="D9")),
            "duplicate ID": listed(item(), item()),
            "missing ID": listed({k: v for k, v in item().items() if k != "id"}),
            "missing behavior": listed({k: v for k, v in item().items() if k != "behavior"}),
            "no steps": listed(item(steps=[])), "steps as text": listed(item(steps="abc")),
            "empty step": listed(item(steps=["Open /login", ""])),
            "passes as text": listed(item(passes="true")), "passes as a number": listed(item(passes=0)),
            "missing passes": listed({k: v for k, v in item().items() if k != "passes"}),
            "passing without the accepted revision": listed(item(passes=True)),
            "passing with an empty revision": listed(item(passes=True, revision="")),
        }
        for name, value in malformed.items():
            with self.subTest(name), self.assertRaises(ValueError):
                report.acceptance_line(value)
        with self.assertRaises(ValueError):
            report.acceptance_line(base, listed())
        with self.assertRaises(ValueError):
            report.acceptance_line(base, {"items": deepcopy(base["items"])})

        once = listed(item(**amended), item("A2"))
        again = ["Open /account and choose Forgot password", "Submit the address: a reset message arrives"]
        second_valid = listed(
            item(steps=again, amended=["R1 F4: the form moved to /sign-in", "R2 F1: the form moved to /account"]),
            item("A2"))
        self.assertEqual(report.acceptance_line(deepcopy(once), once), "W5 acceptance 0/2")
        self.assertEqual(report.acceptance_line(second_valid, [base, once]), "W5 acceptance 0/2")
        # Returning to the original base steps via a second recorded amendment is valid against [base, once]
        reverted_valid = listed(
            item(amended=["R1 F4: the form moved to /sign-in", "R2 F3: restored /login route"]),
            item("A2"))
        self.assertEqual(report.acceptance_line(reverted_valid, [base, once]), "W5 acceptance 0/2")

        for name, entry in (
            ("the earlier amendment reused silently", item(steps=again, amended=amended["amended"])),
            ("the earlier amendment overwritten", item(steps=again, amended=["R2 F1: overwrote R1"])),
            ("the amendment list dropped", item(steps=again)),
            ("restored to base without recording", item()),
            ("padded amendment without text change", item(steps=amended["steps"],
                                                          amended=["R1 F4: the form moved to /sign-in", "R2 pad"])),
        ):
            with self.subTest(name), self.assertRaises(ValueError):
                report.acceptance_line(listed(entry, item("A2")), [base, once])

        with_removed = listed(item(), item("A2", removed="Owner decision D9"))
        with self.assertRaises(ValueError):
            report.acceptance_line(listed(item(), item("A2")), with_removed)
        with self.assertRaises(ValueError):
            report.acceptance_line(listed(item(), item("A2", removed="Changed decision")), with_removed)

    def test_cli_acceptance_compares_with_multiple_previous_snapshots(self):
        def listed(steps, passes=False, **extra):
            entry = {"id": "A1", "behavior": "A visitor signs in", "steps": steps, "passes": passes, **extra}
            return {"stage": "W5", "items": [{**entry, "revision": "3f9c2e1a7b"} if passes else entry]}
        with tempfile.TemporaryDirectory() as directory:
            current = Path(directory) / "acceptance.json"
            base = Path(directory) / "base.json"
            head = Path(directory) / "head.json"
            base.write_text(json.dumps(listed(["Open /login", "Submit valid credentials: the dashboard opens"])),
                            encoding="utf-8")
            head.write_text(json.dumps(listed(["Open /sign-in", "Submit valid credentials: the dashboard opens"],
                                              amended=["R1 F1: path is /sign-in"])), encoding="utf-8")
            def run(value, *arguments):
                current.write_text(json.dumps(value), encoding="utf-8")
                return subprocess.run([sys.executable, str(SCRIPT), "acceptance", str(current), *arguments],
                                      capture_output=True, text=True)
            toggled = listed(["Open /sign-in", "Submit valid credentials: the dashboard opens"],
                             passes=True, amended=["R1 F1: path is /sign-in"])
            result = run(toggled, "--previous", str(base), "--previous", str(head))
            self.assertEqual((result.returncode, result.stdout.strip()), (0, "W5 acceptance 1/1"))

            tampered = listed(["Open /sign-in"], passes=True, amended=["R1 F1: path is /sign-in"])
            self.assertEqual(run(tampered).stdout.strip(), "W5 acceptance 1/1")
            result = run(tampered, "--previous", str(base), "--previous", str(head))
            self.assertEqual((result.returncode, result.stdout), (2, ""))
            self.assertIn("`amended`", result.stderr)

            result = run(toggled, "--previous", str(Path(directory) / "absent.json"))
            self.assertEqual((result.returncode, result.stdout), (2, ""))
            current.write_text(json.dumps(snapshot()), encoding="utf-8")
            result = subprocess.run([sys.executable, str(SCRIPT), "status", str(current)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0)
            result = subprocess.run([sys.executable, str(SCRIPT), "status", str(current), "--previous", str(base)],
                                    capture_output=True, text=True)
            self.assertEqual((result.returncode, result.stdout), (2, ""))
            self.assertIn("--previous applies to acceptance only", result.stderr)

    def test_cli_reloads_current_file_each_invocation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "record.json"
            value = snapshot()
            path.write_text(json.dumps(value), encoding="utf-8")
            result = subprocess.run([sys.executable, str(SCRIPT), "status", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(result.stdout.strip(), "W5 (57%) ✅ 20 📋 11 ⚙️ 3 ⛔ 1 🙋 1")
            value["tasks"][20]["state"] = "done"
            path.write_text(json.dumps(value), encoding="utf-8")
            result = subprocess.run([sys.executable, str(SCRIPT), "status", str(path)], capture_output=True, text=True)
            self.assertEqual(result.stdout.strip(), "W5 (60%) ✅ 21 📋 11 ⚙️ 2 ⛔ 1 🙋 1")
            path.write_text("{}", encoding="utf-8")
            result = subprocess.run([sys.executable, str(SCRIPT), "status", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(result.stdout, "")


if __name__ == "__main__":
    unittest.main()
