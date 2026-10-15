#!/usr/bin/env python3
"""
Balance report for the LINEA ROSSA Monte-Carlo harness.

    python3 tools/balance/report.py tools/balance/out/runs.csv
    python3 tools/balance/report.py --baseline <prev.csv>   # for CI diffs

Reads the CSV written by tools/balance/run.mjs and prints a distribution
report, then writes an HTML file with inline SVG charts next to it.

Standard library only, like the rest of the analysis tooling in this repo:
no numpy, no matplotlib, no pandas. Charts are hand-written SVG so the
report is a single self-contained file that opens offline.
"""
import argparse
import csv
import html
import math
import os
import statistics
import sys
from collections import defaultdict

# ---------------------------------------------------------------- statistics


def quantiles(values):
    """Return (min, p10, p25, p50, p75, p90, max) using linear interpolation."""
    if not values:
        return None
    s = sorted(values)

    def q(p):
        if len(s) == 1:
            return s[0]
        idx = p * (len(s) - 1)
        lo = math.floor(idx)
        hi = math.ceil(idx)
        return s[lo] + (s[hi] - s[lo]) * (idx - lo)

    return {
        "n": len(s),
        "min": s[0],
        "p10": q(0.10),
        "p25": q(0.25),
        "p50": q(0.50),
        "p75": q(0.75),
        "p90": q(0.90),
        "max": s[-1],
        "mean": statistics.fmean(s),
        "stdev": statistics.stdev(s) if len(s) > 1 else 0.0,
    }


def fmt(v, places=None):
    """Compact human number. places=None means "keep it readable": no
    trailing zeros, at most 2 decimals, thousands separators."""
    if v is None:
        return "-"
    if isinstance(v, bool):
        return str(v)
    if isinstance(v, int):
        return f"{v:,}"
    if isinstance(v, float):
        if places is not None:
            return f"{v:,.{places}f}"
        if abs(v) >= 1000:
            return f"{v:,.0f}"
        if v != int(v):
            return f"{v:,.2f}".rstrip("0").rstrip(".")
        return f"{int(v):,}"
    return str(v)


def pct(n, d):
    return 100.0 * n / d if d else 0.0


# ---------------------------------------------------------------- svg charts
# A tiny SVG builder. Everything is inline so the report is one file that
# works from a file:// URL with no server and no assets.


class SVG:
    def __init__(self, width, height):
        self.w = width
        self.h = height
        self.parts = []
        self.bg = "#12141c"
        self.ink = "#e8eaf2"
        self.dim = "#8b93a7"
        self.grid = "#2a2f3d"
        self.accent = "#5b8def"
        self.accent2 = "#e8a924"
        self.accent3 = "#e0342c"

    def rect(self, x, y, w, h, fill, opacity=1.0, rx=0):
        o = f' opacity="{opacity}"' if opacity != 1.0 else ""
        r = f' rx="{rx}"' if rx else ""
        self.parts.append(
            f'<rect x="{x:.2f}" y="{y:.2f}" width="{max(0, w):.2f}" '
            f'height="{max(0, h):.2f}" fill="{fill}"{o}{r}/>'
        )

    def line(self, x1, y1, x2, y2, stroke, width=1, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.parts.append(
            f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" '
            f'stroke="{stroke}" stroke-width="{width}"{d}/>'
        )

    def text(self, x, y, s, fill=None, size=11, anchor="middle", weight="400"):
        fill = fill or self.dim
        self.parts.append(
            f'<text x="{x:.2f}" y="{y:.2f}" fill="{fill}" font-size="{size}" '
            f'text-anchor="{anchor}" font-family="-apple-system,BlinkMacSystemFont,'
            f'Segoe UI,Roboto,sans-serif" font-weight="{weight}">{html.escape(str(s))}</text>'
        )

    def polyline(self, pts, stroke, width=2):
        if len(pts) < 2:
            return
        d = " ".join(f"{x:.2f},{y:.2f}" for x, y in pts)
        self.parts.append(
            f'<polyline points="{d}" fill="none" stroke="{stroke}" '
            f'stroke-width="{width}" stroke-linejoin="round"/>'
        )

    def polyarea(self, pts, fill, opacity=0.25):
        if len(pts) < 2:
            return
        d = " ".join(f"{x:.2f},{y:.2f}" for x, y in pts)
        self.parts.append(
            f'<polygon points="{d}" fill="{fill}" opacity="{opacity}"/>'
        )

    def circle(self, x, y, r, fill):
        self.parts.append(
            f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r}" fill="{fill}"/>'
        )

    def render(self):
        return (
            f'<svg viewBox="0 0 {self.w} {self.h}" width="100%" '
            f'style="max-width:{self.w}px" xmlns="http://www.w3.org/2000/svg" '
            f'role="img">{("".join(self.parts))}</svg>'
        )


def bar_chart(title, groups, value_key, width=560, height=240, fmtv=None):
    """Horizontal bars: one row per group, labelled."""
    fmtv = fmtv or fmt
    s = SVG(width, height)
    pad_l, pad_r, pad_t = 120, 56, 26
    rows = list(groups)
    if not rows:
        return ""
    plot_h = height - pad_t - 24
    row_h = plot_h / max(1, len(rows))
    vals = [r[value_key] for r in rows]
    vmax = max(vals) if vals else 1
    vmax = vmax if vmax > 0 else 1

    s.text(pad_l - 110, 14, title, s.ink, 12, "start", "600")
    for i, r in enumerate(rows):
        y = pad_t + i * row_h
        bh = row_h * 0.62
        by = y + (row_h - bh) / 2
        w = (r[value_key] / vmax) * (width - pad_l - pad_r)
        color = r.get("color", s.accent)
        s.rect(pad_l, by, w, bh, color, rx=2)
        s.text(pad_l - 8, by + bh / 2, r["label"], s.dim, 11, "end")
        s.text(pad_l + w + 6, by + bh / 2, fmtv(r[value_key]), s.ink, 11, "start")
    return s.render()


def dist_chart(title, values, bins=24, width=560, height=220, color="#5b8def",
               marks=None):
    """Histogram with optional vertical markers (e.g. goal thresholds)."""
    if not values:
        return ""
    s = SVG(width, height)
    pad_l, pad_r, pad_t, pad_b = 46, 12, 26, 26
    lo, hi = min(values), max(values)
    if hi == lo:
        hi = lo + 1
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b

    counts = [0] * bins
    for v in values:
        b = min(bins - 1, max(0, int((v - lo) / (hi - lo + 1e-12) * bins)))
        counts[b] += 1
    cmax = max(counts) or 1

    s.text(pad_l - 40, 14, title, s.ink, 12, "start", "600")

    # y grid at quarters
    for frac in (0, 0.25, 0.5, 0.75, 1.0):
        y = pad_t + plot_h * (1 - frac)
        s.line(pad_l, y, pad_l + plot_w, y, s.grid, 1)
        s.text(pad_l - 6, y, str(int(cmax * frac)), s.dim, 10, "end")

    slot = plot_w / bins
    for i, c in enumerate(counts):
        h = (c / cmax) * plot_h
        s.rect(pad_l + i * slot, pad_t + plot_h - h, slot * 0.88, h, color, rx=1)

    # markers
    for m in (marks or []):
        v, label, mcolor = m
        if not (lo <= v <= hi):
            continue
        x = pad_l + (v - lo) / (hi - lo) * plot_w
        s.line(x, pad_t, x, pad_t + plot_h, mcolor, 1.5, dash="3,3")
        s.text(x, pad_t - 6, label, mcolor, 10)

    s.text(pad_l, height - 8, fmt(lo), s.dim, 10, "start")
    s.text(pad_l + plot_w, height - 8, fmt(hi), s.dim, 10, "end")
    return s.render()


def stack_chart(title, series, labels, width=560, height=240, fmtv=None):
    """Stacked bars over an ordinal axis (levels, days).

    `series` is a list of {name, values:[...]} dicts; each values list is
    indexed by position in `labels`.
    """
    fmtv = fmtv or fmt
    s = SVG(width, height)
    pad_l, pad_r, pad_t, pad_b = 46, 12, 26, 28
    n = len(labels)
    if n == 0 or not series:
        return ""
    plot_w = width - pad_l - pad_r
    plot_h = height - pad_t - pad_b
    totals = [sum(sr["values"][i] for sr in series) for i in range(n)]
    vmax = max(totals) or 1

    s.text(pad_l - 40, 14, title, s.ink, 12, "start", "600")
    for frac in (0, 0.25, 0.5, 0.75, 1.0):
        y = pad_t + plot_h * (1 - frac)
        s.line(pad_l, y, pad_l + plot_w, y, s.grid, 1)
        s.text(pad_l - 6, y, fmtv(vmax * frac), s.dim, 10, "end")

    slot = plot_w / n
    bw = slot * 0.82
    for i in range(n):
        base = pad_t + plot_h
        for si, sr in enumerate(series):
            h = (sr["values"][i] / vmax) * plot_h
            color = [s.accent, s.accent2, s.accent3, "#22a55e", "#9b59d0"][si % 5]
            s.rect(pad_l + i * slot + (slot - bw) / 2, base - h, bw, h, color, rx=1)
            base -= h
        s.text(pad_l + slot * (i + 0.5), pad_t + plot_h + 14, labels[i], s.dim, 9)

    # legend
    lx = pad_l
    for si, sr in enumerate(series):
        color = [s.accent, s.accent2, s.accent3, "#22a55e", "#9b59d0"][si % 5]
        s.rect(lx, height - 12, 8, 8, color, rx=1)
        s.text(lx + 12, height - 8, sr["name"], s.dim, 9, "start")
        lx += 12 + len(sr["name"]) * 5.5 + 14
    return s.render()


def series_names(series):
    return [sr.get("name", "?") for sr in series]


def unwrap(series):
    """Accept {name, values} dicts; return plain lists for the maths."""
    return [[sr["values"][i] for sr in series] for i in range(len(series[0]["values"]))]


# ---------------------------------------------------------------- analysis


def load(path):
    with open(path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    out = []
    for r in rows:
        row = {}
        for k, v in r.items():
            try:
                row[k] = float(v) if "." in v else int(v)
            except (ValueError, TypeError):
                row[k] = v
        out.append(row)
    return out


def analyse(rows):
    summary = {}
    by_policy = defaultdict(list)
    by_goal = defaultdict(list)
    for r in rows:
        by_policy[r["policy"]].append(r)
        by_goal[r["goalId"]].append(r)

    for pol, rs in by_policy.items():
        outcomes = defaultdict(int)
        for r in rs:
            outcomes[r["outcome"]] += 1
        summary[pol] = {
            "n": len(rs),
            "outcomes": dict(outcomes),
            "winrate": pct(outcomes.get("won", 0), len(rs)),
            "bankrupt": pct(outcomes.get("bankrupt", 0), len(rs)),
            "pax": quantiles([r["totalPax"] for r in rs]),
            "best": quantiles([r["bestDay"] for r in rs]),
            "day": quantiles([r["day"] for r in rs]),
            "lines": quantiles([r["lines"] for r in rs]),
        }

    goals = {}
    for gid, rs in by_goal.items():
        goals[gid] = {
            "n": len(rs),
            "winrate": pct(sum(1 for r in rs if r["outcome"] == "won"), len(rs)),
            "goalPax": rs[0]["goalPax"],
            "goalDays": rs[0]["goalDays"],
            "best": quantiles([r["bestDay"] for r in rs]),
            "day": quantiles([r["day"] for r in rs]),
            # actionsToWin is "" for runs that never won, so filter rather
            # than let an empty string reach the quantile maths.
            "atw": quantiles([r["actionsToWin"] for r in rs
                             if isinstance(r["actionsToWin"], (int, float))]),
        }
    return summary, goals


def findings(summary, goals):
    """Turn the numbers into statements a maintainer can act on.

    Each finding is a dict with `level` (warn/info), `title` and `body`.
    Thresholds are deliberately blunt: a balance report that produces
    hedged prose nobody reads is worse than one that flags a number.
    """
    out = []

    # "Wins every run" is only a finding when a passive policy also exists
    # to compare against: with one policy there is nothing to prove.
    if "greedy" in summary and summary.get("none"):
        g = summary["greedy"]
        if g["winrate"] >= 95:
            out.append({
                "level": "warn",
                "title": f"A competent policy wins {g['winrate']:.0f}% of runs",
                "body": (
                    "The greedy policy is a rough stand-in for a player who picks "
                    "well. If it wins nearly every level, the paxDay thresholds are "
                    "not doing any work: the goal is a formality rather than a "
                    "target. Compare with the actionsToWin column - if the goal "
                    "falls in a handful of decisions, the real difficulty in the "
                    "game is player attention, not the economy."
                ),
            })

    # Goals beaten long before the day budget expires.
    fast = []
    for gid, gi in goals.items():
        if gi["day"]["p50"] is not None and gi["goalDays"]:
            ratio = gi["day"]["p50"] / gi["goalDays"]
            if ratio < 0.5:
                fast.append((gid, gi["day"]["p50"], gi["goalDays"]))
    if fast:
        worst = sorted(fast, key=lambda x: x[1] / x[2])[:4]
        body = "; ".join(f"{g} in {d:g} of {gd} days" for g, d, gd in worst)
        out.append({
            "level": "warn",
            "title": "Day budgets are far larger than the time a goal needs",
            "body": (
                f"Median day at victory vs the level's day limit - {body}. "
                "Either raise paxDay, cut the day limits, or accept that the "
                "levels are a sandbox. Note the simulation does not charge for "
                "the clicks a player spends drawing a line, so treat this as an "
                "upper bound on how easy the goal is."
            ),
        })

    if "random" in summary and "greedy" in summary:
        r, g = summary["random"], summary["greedy"]
        gap = g["winrate"] - r["winrate"]
        if gap < 10:
            out.append({
                "level": "warn",
                "title": "Skill barely separates the outcomes",
                "body": (
                    f"Greedy wins {g['winrate']:.0f}%, random wins {r['winrate']:.0f}%. "
                    "A gap this small means the decisions do not matter much, so "
                    "the tycoon is closer to a screensaver than a game."
                ),
            })
        else:
            out.append({
                "level": "info",
                "title": f"Skill gap is {gap:.0f} points",
                "body": (
                    f"Greedy wins {g['winrate']:.0f}%, random {r['winrate']:.0f}%, "
                    f"passive {summary.get('none', {}).get('winrate', 0):.0f}%. "
                    "Decisions matter, which is the property that makes the tycoon "
                    "worth playing."
                ),
            })

    for pol, s in summary.items():
        if s["bankrupt"] > 60:
            out.append({
                "level": "info",
                "title": f"{pol}: {s['bankrupt']:.0f}% of runs go bankrupt",
                "body": (
                    "Bankruptcy should be a real risk but not the default ending. "
                    "If almost every run ends in the creditors seizing the network, "
                    "the starting treasury or the upkeep rate is too harsh."
                ),
            })
    return out


# ---------------------------------------------------------------- rendering


def render_html(rows, summary, goals, fs, src):
    found = findings(summary, goals)
    parts = []
    parts.append("""<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LINEA ROSSA balance report</title><style>
:root{color-scheme:dark}
body{margin:0;padding:32px 20px 64px;background:#0d0f16;color:#e8eaf2;
 font:15px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}
.wrap{max-width:900px;margin:0 auto}
h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:32px 0 12px;color:#c6ccdb;
 text-transform:uppercase;letter-spacing:.08em;font-weight:700}
p{margin:0 0 10px;color:#b6bccd}.sub{color:#8b93a7;font-size:13px;margin-bottom:24px}
table{border-collapse:collapse;width:100%;margin:8px 0 4px;font-size:13px}
th,td{text-align:right;padding:7px 10px;border-bottom:1px solid #232838}
th:first-child,td:first-child{text-align:left}
th{color:#8b93a7;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
td{font-variant-numeric:tabular-nums}
figure{margin:0 0 20px;padding:14px;background:#12141c;border:1px solid #232838;border-radius:10px}
.finding{border-left:3px solid #e8a924;background:#151824;padding:12px 14px;margin:8px 0;border-radius:0 8px 8px 0}
.finding.warn{border-left-color:#e8a924}.finding.info{border-left-color:#5b8def}
.finding b{display:block;margin-bottom:4px;font-size:14px}
code{background:#1a1e2b;padding:1px 5px;border-radius:4px;font-size:12px}
.grid{display:grid;gap:16px}
@media(min-width:720px){.grid{grid-template-columns:1fr 1fr}}
</style></head><body><div class="wrap">""")

    parts.append("<h1>LINEA ROSSA balance report</h1>")
    parts.append(f'<p class="sub">{len(rows):,} sessions from <code>{html.escape(src)}</code></p>')

    # findings first: the report exists to be acted on
    parts.append("<h2>Findings</h2>")
    if not found:
        parts.append("<p>No threshold breached. The balance looks where it was left.</p>")
    for f in found:
        parts.append(
            f'<div class="finding {f["level"]}"><b>{html.escape(f["title"])}</b>'
            f'{html.escape(f["body"])}</div>'
        )

    # per-policy table
    parts.append("<h2>Outcomes by policy</h2><table><tr><th>policy</th><th>n</th>"
                 "<th>win %</th><th>bankrupt %</th><th>pax p50</th><th>pax p90</th>"
                 "<th>days p50</th><th>lines p50</th></tr>")
    for pol in sorted(summary):
        s = summary[pol]
        parts.append(
            f"<tr><td>{html.escape(pol)}</td><td>{s['n']:,}</td>"
            f"<td>{s['winrate']:.1f}</td><td>{s['bankrupt']:.1f}</td>"
            f"<td>{fmt(s['pax']['p50'])}</td><td>{fmt(s['pax']['p90'])}</td>"
            f"<td>{fmt(s['day']['p50'], 1)}</td><td>{fmt(s['lines']['p50'], 1)}</td></tr>"
        )
    parts.append("</table>")

    # per-goal table
    parts.append("<h2>Outcomes by level</h2><table><tr><th>level</th><th>n</th>"
                 "<th>win %</th><th>goal pax/day</th><th>median best day</th>"
                 "<th>margin</th><th>day limit</th><th>median win day</th>"
                 "<th>actions to win</th></tr>")
    for gid in sorted(goals):
        gi = goals[gid]
        margin = (gi["best"]["p50"] / gi["goalPax"] * 100) if gi["goalPax"] else 0
        atw = gi["atw"]["p50"] if gi["atw"] else None
        parts.append(
            f"<tr><td>{html.escape(gid)}</td><td>{gi['n']:,}</td>"
            f"<td>{gi['winrate']:.1f}</td><td>{fmt(gi['goalPax'])}</td>"
            f"<td>{fmt(gi['best']['p50'])}</td><td>{margin:.0f}%</td>"
            f"<td>{fmt(gi['goalDays'])}</td><td>{fmt(gi['day']['p50'], 1)}</td>"
            f"<td>{fmt(atw, 1) if atw is not None else '-'}</td></tr>"
        )
    parts.append("</table>")

    # charts
    parts.append("<h2>Charts</h2><div class='grid'>")

    greedy = [r for r in rows if r["policy"] == "greedy"]
    if greedy:
        vals = [r["bestDay"] for r in greedy]
        gvals = sorted({r["goalPax"] for r in greedy})
        marks = [(g, f"goal {fmt(g)}", "#e8a924") for g in gvals[:3]]
        parts.append("<figure>" + dist_chart(
            "greedy: best passengers in one day", vals, marks=marks) + "</figure>")

    allpax = [r["totalPax"] for r in rows]
    parts.append("<figure>" + dist_chart(
        "all policies: total passengers per run", allpax) + "</figure>")

    # win day distribution per level
    labels, wins, losses = [], [], []
    for gid in sorted(goals):
        rs = [r for r in rows if r["goalId"] == gid]
        labels.append(gid)
        wins.append(sum(1 for r in rs if r["outcome"] == "won"))
        losses.append(sum(1 for r in rs if r["outcome"] != "won"))
    parts.append("<figure>" + stack_chart(
        "wins vs other outcomes, by level",
        [{"name": "won", "values": wins}, {"name": "other", "values": losses}],
        labels) + "</figure>")

    if "greedy" in summary and greedy:
        groups = []
        for gid in sorted(goals):
            gi = goals[gid]
            groups.append({
                "label": gid,
                "median day to win": gi["day"]["p50"] or 0,
                "color": "#5b8def",
            })
        parts.append("<figure>" + bar_chart(
            "median day at victory, vs level day limit", groups,
            "median day to win", fmtv=lambda v: f"{v:g} d") + "</figure>")

    parts.append("</div>")

    parts.append(f'<p class="sub" style="margin-top:28px">charts are inline SVG - '
                 f'this file opens offline with no assets and no network.</p>')
    parts.append("</div></body></html>")
    return "".join(parts)


# ---------------------------------------------------------------- main


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("csv", nargs="?",
                    default="tools/balance/out/runs.csv")
    ap.add_argument("--out", default=None,
                    help="write the HTML report here "
                         "(default: alongside the CSV)")
    ap.add_argument("--baseline", default=None,
                    help="a previous CSV to compare against")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(args.csv):
        print(f"no such file: {args.csv}", file=sys.stderr)
        print("run tools/balance/run.mjs first", file=sys.stderr)
        return 2

    rows = load(args.csv)
    if not rows:
        print(f"{args.csv} has no data rows", file=sys.stderr)
        return 2

    summary, goals = analyse(rows)

    if not args.quiet:
        print(f"\nLINEA ROSSA balance — {len(rows):,} sessions from {args.csv}\n")
        print(f"{'policy':<10}{'n':>6}{'win%':>8}{'bank%':>8}"
              f"{'pax p50':>10}{'pax p90':>10}{'days':>8}")
        for pol in sorted(summary):
            s = summary[pol]
            print(f"{pol:<10}{s['n']:>6}{s['winrate']:>8.1f}{s['bankrupt']:>8.1f}"
                  f"{fmt(s['pax']['p50']):>10}{fmt(s['pax']['p90']):>10}"
                  f"{fmt(s['day']['p50'], 1):>8}")

        print(f"\n{'level':<12}{'n':>5}{'win%':>8}{'goal':>9}"
              f"{'best p50':>11}{'margin':>9}{'days':>7}{'win day':>10}{'acts':>7}")
        for gid in sorted(goals):
            gi = goals[gid]
            m = (gi["best"]["p50"] / gi["goalPax"] * 100) if gi["goalPax"] else 0
            atw = gi["atw"]["p50"] if gi["atw"] else None
            print(f"{gid:<12}{gi['n']:>5}{gi['winrate']:>8.1f}"
                  f"{fmt(gi['goalPax']):>9}{fmt(gi['best']['p50']):>11}"
                  f"{m:>8.0f}%{fmt(gi['goalDays']):>7}"
                  f"{fmt(gi['day']['p50'], 1):>10}"
                  f"{(fmt(atw, 1) if atw is not None else '-'):>7}")

        print("\nfindings")
        fs = findings(summary, goals)
        if not fs:
            print("  none: no threshold breached")
        for f in fs:
            print(f"  [{f['level']}] {f['title']}")

    out = args.out or os.path.splitext(args.csv)[0] + "-report.html"
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(render_html(rows, summary, goals, findings(summary, goals), args.csv))
    if not args.quiet:
        print(f"\nwrote {out}")

    if args.baseline:
        try:
            base_rows = load(args.baseline)
            bsum, bgoals = analyse(base_rows)
        except OSError as e:
            print(f"baseline unreadable: {e}", file=sys.stderr)
            return 2
        print("\nvs baseline")
        drift = 0.0
        for pol in sorted(summary):
            if pol not in bsum:
                continue
            d = summary[pol]["winrate"] - bsum[pol]["winrate"]
            drift = max(drift, abs(d))
            flag = "  <-- moved" if abs(d) >= 5 else ""
            print(f"  {pol:<10} win {bsum[pol]['winrate']:.1f}% -> "
                  f"{summary[pol]['winrate']:.1f}%  ({d:+.1f}){flag}")
        print(f"\nmax drift {drift:.1f} points")
        if drift >= 10:
            print("FAIL  balance moved sharply; this is probably a rules change",
                  file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())