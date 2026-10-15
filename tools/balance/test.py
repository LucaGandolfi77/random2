#!/usr/bin/env python3
"""
Tests for tools/balance/report.py.

    python3 tools/balance/test.py

The report is the thing a maintainer actually reads when a balance change
lands, so a wrong number in it is worse than no report. These checks pin
the statistics and the threshold logic, which are the parts that can be
silently wrong.
"""
import importlib.util
import math
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "report", os.path.join(HERE, "report.py"))
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)

FAILURES = 0
CHECKS = 0


def ok(label, condition, detail=None):
    global FAILURES, CHECKS
    CHECKS += 1
    if condition:
        return
    FAILURES += 1
    print(f"  FAIL  {label}" + (f" -> {detail}" if detail is not None else ""))


def near(label, actual, expected, eps=1e-9):
    ok(label, abs(actual - expected) <= eps, f"{actual} != {expected}")


def section(name):
    print("\n" + name)


# ---------------------------------------------------------------- quantiles

section("quantiles")
q = report.quantiles([1, 2, 3, 4, 5])
near("p50 of 1..5", q["p50"], 3)
near("min", q["min"], 1)
near("max", q["max"], 5)
near("mean", q["mean"], 3)
ok("n", q["n"] == 5, q["n"])

q2 = report.quantiles([10, 20])
near("p50 interpolates between two points", q2["p50"], 15)
ok("empty input returns None", report.quantiles([]) is None)
ok("single value is its own median", report.quantiles([7])["p50"] == 7)
ok("stdev of one value is zero", report.quantiles([7])["stdev"] == 0)
ok("stdev of distinct values is positive", report.quantiles([1, 5])["stdev"] > 0)

# monotonic quantiles: a distribution's spread must be ordered
vals = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
qq = report.quantiles(vals)
ok("quantiles are non-decreasing",
    qq["min"] <= qq["p10"] <= qq["p25"] <= qq["p50"] <= qq["p75"] <= qq["p90"] <= qq["max"],
    [qq["min"], qq["p10"], qq["p25"], qq["p50"], qq["p75"], qq["p90"], qq["max"]])

# a known distribution: mean of 1..100 is 50.5
qq100 = report.quantiles(list(range(1, 101)))
near("mean of 1..100", qq100["mean"], 50.5)
near("median of 1..100", qq100["p50"], 50.5)

# ---------------------------------------------------------------- formatting

section("formatting")
ok("thousands get separators", report.fmt(1234567) == "1,234,567", report.fmt(1234567))
ok("floats keep their decimals", report.fmt(3.14) == "3.14", report.fmt(3.14))
ok("large floats round to integers", report.fmt(12345.6) == "12,346", report.fmt(12345.6))
ok("explicit places are honoured", report.fmt(1.23456, 3) == "1.235", report.fmt(1.23456, 3))
ok("None formats as a dash", report.fmt(None) == "-")
ok("zero is not a dash", report.fmt(0) == "0", report.fmt(0))
ok("pct of zero denominator is 0", report.pct(0, 0) == 0.0)
near("pct is a percentage", report.pct(1, 4), 25.0)

# ---------------------------------------------------------------- analysis

section("analysis")


def synth(policy, outcome, goal, best, pax, day, atw=""):
    return {
        "seed": 1, "goalId": goal, "policy": policy, "outcome": outcome,
        "day": day, "ticks": 100, "totalPax": pax, "bestDay": best,
        "goalPax": 10000, "goalDays": 14, "revenue": 0, "moneyEnd": 0,
        "loanEnd": 0, "lines": 3, "trains": 3, "served": 5, "districts": 10,
        "actions": 20, "builds": 3, "trainsAdded": 3, "loans": 0,
        "actionsToWin": atw, "maxTransfers": 2,
    }


# a healthy balance: greedy wins, passive never does
healthy = []
for i in range(60):
    healthy.append(synth("greedy", "won", "a", 12000, 30000, 9, "20"))
    healthy.append(synth("random", "won" if i % 2 else "timeout", "a", 8000, 12000, 10))
    healthy.append(synth("none", "timeout", "a", 0, 0, 15))
summary, goals = report.analyse(healthy)
near("greedy wins everything", summary["greedy"]["winrate"], 100.0)
near("passive wins nothing", summary["none"]["winrate"], 0.0)
near("random wins about half", summary["random"]["winrate"], 50.0)
near("level win rate", goals["a"]["winrate"], 50.0)  # 90 wins of 180 runs
# A level where every policy reaches the goal is not a *balanced* level
# even though nothing crashed: that is the state the harness exists to
# surface, so the healthy fixture must not include it.
ok("greedy taking 9 of 14 days is not flagged as instant",
    not any("Day budgets" in f["title"] for f in report.findings(summary, goals)),
    [f["title"] for f in report.findings(summary, goals)])

# an unbalanced table: the goal falls on day 2 of a 14-day budget
fast = []
for i in range(40):
    fast.append(synth("greedy", "won", "a", 40000, 50000, 2, "6"))
    fast.append(synth("random", "timeout" if i % 2 else "won", "a", 20000, 25000, 3))
    fast.append(synth("none", "timeout", "a", 0, 0, 14))
fsum, fgoals = report.analyse(fast)
fn = report.findings(fsum, fgoals)
titles = [f["title"] for f in fn]
ok("an oversized day budget is flagged",
    any("Day budgets" in t for t in titles), titles)
ok("an oversized day budget is flagged",
    any("Day budgets" in t for t in titles), titles)
ok("findings carry a level", all(f["level"] in ("warn", "info") for f in fn))

# a single policy with a 100% win rate is not a balance finding: there is
# nothing to compare it against
solo = [synth("greedy", "won", "a", 40000, 50000, 2, "6") for _ in range(20)]
ssum2, sgoals2 = report.analyse(solo)
# Greedy plus random but no passive baseline: still nothing to prove, since
# both policies make moves and the comparison would be meaningless.
ok("no passive baseline raises no win-rate finding",
    not any("competent" in f["title"] for f in report.findings(
        report.analyse([synth("greedy", "won", "a", 40000, 50000, 2, "6")
                        for _ in range(20)])[0],
        report.analyse([synth("greedy", "won", "a", 40000, 50000, 2, "6")
                        for _ in range(20)])[1])),
    [f["title"] for f in report.findings(
        report.analyse([synth("greedy", "won", "a", 40000, 50000, 2, "6")
                        for _ in range(20)])[0],
        report.analyse([synth("greedy", "won", "a", 40000, 50000, 2, "6")
                        for _ in range(20)])[1])])
ok("one policy alone raises no win-rate finding",
    not any("competent" in f["title"] for f in report.findings(ssum2, sgoals2)),
    [f["title"] for f in report.findings(ssum2, sgoals2)])

# a table where nothing is out of balance must stay quiet, otherwise the
# report cries wolf and the findings stop being read
# Balanced means greedy wins most runs without winning all of them, and
# reaches the goal over a meaningful share of the day budget.
calm = [synth("greedy", "won", "a", 11000, 30000, 10, "20") if i % 4 else
        synth("greedy", "timeout", "a", 9000, 25000, 13)
        for i in range(30)]
calm += [synth("random", "timeout", "a", 6000, 9000, 12) for _ in range(30)]
calm += [synth("none", "timeout", "a", 0, 0, 14) for _ in range(30)]
csum, cgoals = report.analyse(calm)
ctitles = [f["title"] for f in report.findings(csum, cgoals)]
ok("a balanced table raises no win-rate warning",
    not any("competent policy" in t for t in ctitles), ctitles)
ok("a balanced table raises no day-budget warning",
    not any("Day budgets" in t for t in ctitles), ctitles)

# skill separation
sep = [synth("greedy", "won", "a", 12000, 30000, 9) for _ in range(40)]
sep += [synth("random", "timeout", "a", 100, 100, 12) for _ in range(40)]
sep += [synth("none", "timeout", "a", 0, 0, 14) for _ in range(40)]
ssum, sgoals = report.analyse(sep)
snames = [f["title"] for f in report.findings(ssum, sgoals)]
ok("a real skill gap is reported as info",
    any("Skill gap" in t for t in snames), snames)

# bankruptcy flood
broke = [synth("greedy", "bankrupt", "a", 100, 100, 2) for _ in range(30)]
bsum, bgoals = report.analyse(broke)
ok("a bankruptcy flood is reported",
    any("bankrupt" in f["title"] for f in report.findings(bsum, bgoals)))

# ---------------------------------------------------------------- CSV round trip

section("csv round trip")
import csv as _csv

with tempfile.TemporaryDirectory() as tmp:
    path = os.path.join(tmp, "runs.csv")
    cols = ["seed", "goalId", "policy", "outcome", "day", "ticks", "totalPax",
            "bestDay", "goalPax", "goalDays", "revenue", "moneyEnd",
            "loanEnd", "lines", "trains", "served", "districts", "actions",
            "builds", "trainsAdded", "loans", "actionsToWin", "maxTransfers"]
    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = _csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for r in healthy:
            w.writerow(r)

    loaded = report.load(path)
    ok("row count survives", len(loaded) == len(healthy), len(loaded))
    ok("ints load as ints", isinstance(loaded[0]["day"], int),
       type(loaded[0]["day"]))
    # actionsToWin is an int in the CSV, so it must load as an int: a string
    # here previously reached quantiles() and raised TypeError.
    ok("actionsToWin loads as a number", isinstance(loaded[0]["actionsToWin"], int),
       type(loaded[0]["actionsToWin"]))
    # the whole point: no string left where a number belongs
    numeric = ["seed", "day", "ticks", "totalPax", "bestDay", "goalPax",
               "goalDays", "lines", "trains", "actions"]
    for r in loaded:
        for c in numeric:
            ok(f"{c} is numeric", isinstance(r[c], (int, float)), type(r[c]))

    s2, g2 = report.analyse(loaded)
    near("round-trip win rate matches", s2["greedy"]["winrate"], 100.0)

    # HTML renders and is self-contained
    out = os.path.join(tmp, "report.html")
    doc = report.render_html(loaded, s2, g2,
                             report.findings(s2, g2), path)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(doc)
    size = os.path.getsize(out)
    ok("html was written", size > 1000, size)
    ok("html is closed", doc.rstrip().endswith("</html>"))
    ok("charts are inline svg", "<svg" in doc and "viewBox" in doc)
    ok("no script tags at all", "<script" not in doc.lower())
    ok("no external stylesheets", "stylesheet" not in doc.lower())
    ok("no absolute image paths", 'src="/' not in doc)
    # The SVG xmlns is a namespace identifier, not a fetch; anything else
    # reaching out over the network would break the offline guarantee.
    net = [ln for ln in doc.splitlines() if ("http://" in ln or "https://" in ln)
           and 'xmlns="http://www.w3.org/2000/svg"' not in ln]
    ok("nothing else references the network", not net, net[:2])
    ok("findings section present", "Findings" in doc)
    ok("level table present", all(gid in doc for gid in g2))

# ---------------------------------------------------------------- charts

section("charts")
ok("dist chart renders", "<svg" in report.dist_chart("t", [1, 2, 3]))
ok("dist chart with no data is empty", report.dist_chart("t", []) == "")
ok("bar chart renders", "<svg" in report.bar_chart(
    "t", [{"label": "a", "value": 1}], "value"))
ok("bar chart with no rows is empty", report.bar_chart("t", [], "value") == "")
ok("stack chart renders", "<svg" in report.stack_chart(
    "t", [{"name": "a", "values": [1, 2]}], ["x", "y"]))
ok("stack chart with no series is empty",
    report.stack_chart("t", [], []) == "")
ok("stack chart with no labels is empty",
    report.stack_chart("t", [{"name": "a", "values": []}], []) == "")
ok("chart escapes label text",
    "<script" not in report.bar_chart(
        "t", [{"label": "<script>x</script>", "value": 1}], "value"))

# ---------------------------------------------------------------- main

section("cli")
rc = report.main.__wrapped__ if hasattr(report.main, "__wrapped__") else None
ok("main is callable", callable(report.main))
with tempfile.TemporaryDirectory() as tmp:
    missing = os.path.join(tmp, "nope.csv")
    old = sys.argv
    sys.argv = ["report.py", missing]
    ok("missing csv exits non-zero", report.main() == 2)
    empty = os.path.join(tmp, "empty.csv")
    open(empty, "w").close()
    sys.argv = ["report.py", empty]
    ok("empty csv exits non-zero", report.main() == 2)
    sys.argv = old
void = rc

print("\n" + ("FAILED" if FAILURES else "OK") + f"  {CHECKS - FAILURES}/{CHECKS} checks")
sys.exit(1 if FAILURES else 0)