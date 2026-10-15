#!/usr/bin/env python3
"""
Tests for tools/corpora/analyze.py.

    python3 tools/corpora/test.py

The corpus report makes claims about text, and a text statistic that is
wrong is wrong silently. These check the tokeniser, the sentence splitter,
the vocabulary measures and the regressions against cases where the right
answer is known by hand.
"""
import importlib.util
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "analyze", os.path.join(HERE, "analyze.py"))
analyze = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analyze)

FAILURES = 0
CHECKS = 0


def ok(label, cond, detail=None):
    global FAILURES, CHECKS
    CHECKS += 1
    if cond:
        return
    FAILURES += 1
    print(f"  FAIL  {label}" + (f" -> {detail}" if detail is not None else ""))


def near(label, a, b, eps=1e-9):
    ok(label, abs(a - b) <= eps, f"{a} != {b}")


def section(n):
    print("\n" + n)


# ---------------------------------------------------------------- tokenising

section("tokenising")
w = analyze.words("In the beginning God created the heavens.", "en")
ok("splits on whitespace and punctuation", len(w) == 7, w)
ok("lowercases", "beginning" in w, w)
ok("keeps internal apostrophes", "don't" in analyze.words("Don't go.", "en"))
ok("keeps hyphenated forms as one token",
   analyze.words("a well-known fact", "en") == ["a", "well-known", "fact"],
   analyze.words("a well-known fact", "en"))

w_it = analyze.words("Nel principio Dio creò i cieli e la terra.", "it")
ok("italian keeps accented letters", "creò" in w_it, w_it)
ok("italian drops punctuation", "terra" in w_it and "." not in w_it, w_it)
ok("empty text yields no tokens", analyze.words("", "en") == [])

# ---------------------------------------------------------------- sentences

section("sentences")
s = analyze.sentences("One. Two! Three?")
ok("splits on . ! ?", len(s) == 3, s)
s2 = analyze.sentences('He said "Go." Then he left.')
ok("splits after a closing quote", len(s2) == 2, s2)
s3 = analyze.sentences("No terminal punctuation here")
ok("a sentence without terminator is one sentence", len(s3) == 1, s3)
ok("empty input yields no sentences", analyze.sentences("   ") == [])
s4 = analyze.sentences("Wait. What? Really!")
ok("short fragments still split", len(s4) == 3, s4)
# an ellipsis mid-sentence should not split: "The old pawnbroker... a man"
s5 = analyze.sentences("The old pawnbroker... a grey man arrived.")
ok("an ellipsis does not split mid-sentence", len(s5) == 1, s5)

# ---------------------------------------------------------------- vocabulary

section("vocabulary measures")
toks = "a b c a b a".split()
near("TTR of 6 tokens with 3 types", analyze.ttr(toks), 3 / 6)
near("TTR of a constant text is 1/small", analyze.ttr("x x x".split()), 1 / 3)
ok("TTR of nothing is 0", analyze.ttr([]) == 0)

# hapax: exactly-once words
c = {"a": 3, "b": 1, "c": 1, "d": 2}
ok("hapax counts words appearing once", analyze.hapax(["a"] * 3 + ["b"] + ["c"] + ["d"] * 2) == 2)
# A word repeated five times appears zero times only: nothing in it occurs
# exactly once, so it is not a hapax at all.
ok("a constant text has no hapax", analyze.hapax(["a"] * 5) == 0)
ok("a text of one word repeated five times has one type",
   len(set(["a"] * 5)) == 1)
ok("no hapax when every word repeats",
   analyze.hapax(["a", "b"] * 3) == 0)

# lexical density excludes closed-class words
near("all function words gives density 0",
     analyze.lexical_density(analyze.words("the and of", "en"), "en"), 0.0)
near("no function words gives density 1",
     analyze.lexical_density(["cat", "dog"], "en"), 1.0)
d = analyze.lexical_density(["the", "cat", "dog"], "en")
near("mixed density is content over total", d, 2 / 3)

# ---------------------------------------------------------------- Zipf

section("Zipf fit")
from collections import Counter


def synth_zipf(n=50, slope=-1.0, scale=100000):
    """Build a counter whose rank-frequency relation is exactly
    log10(f) = intercept + slope*log10(rank).

    The scale matters: with a small one, integer rounding flattens the tail
    to a run of 1s and the regression no longer sees the line it started
    from. Scaling up keeps the quantisation error negligible.
    """
    words = [f"w{i}" for i in range(n)]
    counts = [max(1, int(round(scale * 10 ** (slope * math.log10(r)))))
              for r in range(1, n + 1)]
    c = Counter()
    for w_, k in zip(words, counts):
        c[w_] = k
    return c


# Integer counts cannot realise a power law exactly, so the tolerance is
# the rounding error over the frequency range, not zero.
fit = analyze.zipf_fit(synth_zipf(slope=-1.0))
near("a synthetic Zipf-1 slope is recovered", fit["slope"], -1.0, 1e-4)
near("a perfect fit has R2 = 1", fit["r2"], 1.0, 1e-4)

fit2 = analyze.zipf_fit(synth_zipf(slope=-0.8))
near("a synthetic -0.8 slope is recovered", fit2["slope"], -0.8, 1e-4)

ok("too few types is not a fit", analyze.zipf_fit(Counter({"a": 5})) is None)
ok("an empty counter is not a fit", analyze.zipf_fit(Counter()) is None)
ok("a single type is not a fit", analyze.zipf_fit(Counter({"a": 1})) is None)

# a real Zipf-ish text should land near -1 and fit well
import random
random.seed(1)
zipf_text = []
ranks = list(range(1, 60))
probs = [1 / r for r in ranks]
tot = sum(probs)
for _ in range(20000):
    zipf_text.append(random.choices([f"w{r}" for r in ranks],
                                    weights=probs)[0])
zf = analyze.zipf_fit(Counter(zipf_text))
ok("sampled Zipf text slopes near -1", -1.25 < zf["slope"] < -0.85, zf["slope"])
ok("sampled Zipf text fits well", zf["r2"] > 0.9, zf["r2"])

# ---------------------------------------------------------------- TTR curve

section("TTR vs length")
pts = analyze.ttr_by_length([[f"w{i%40}" for i in range(800)]])
ok("curve has points", len(pts) > 0)
ok("TTR falls as the window grows",
   all(pts[i]["ttr"] > pts[i + 1]["ttr"] for i in range(len(pts) - 1)),
   [(c["size"], round(c["ttr"], 3)) for c in pts])
ok("texts shorter than the largest window are skipped",
   analyze.ttr_by_length([["a", "b", "c"]]) == [] or
   max(c["size"] for c in analyze.ttr_by_length([["a", "b", "c"]])) < 800)

# ---------------------------------------------------------------- histogram

section("histogram")
h = analyze.histogram([1, 1, 1, 2, 3, 10])
ok("counts total the input", sum(b["count"] for b in h) == 6,
   sum(b["count"] for b in h))
ok("bins are ordered", all(h[i]["lo"] < h[i + 1]["lo"] for i in range(len(h) - 1)))
ok("a constant input still bins", len(analyze.histogram([5, 5, 5])) > 0)
ok("empty input yields no bins", analyze.histogram([]) == [])
h1 = analyze.histogram([7])
ok("a single value lands in one bin", sum(b["count"] for b in h1) == 1)

# ---------------------------------------------------------------- overlap

section("bilingual overlap")
o = analyze.overlap({"en": "The madeleine and the tea.",
                     "it": "La madeleine e il te."})
ok("shared forms are found", "madeleine" in o["shared"], o)
ok("an English-only word is not shared", "the" not in o["shared"], o)
ok("rate is a fraction", 0 <= o["rate"] <= 1, o["rate"])
ok("a passage with one empty language is skipped",
   analyze.overlap({"en": "hello world", "it": ""}) is None)
ok("an entirely empty passage is skipped",
   analyze.overlap({"en": "", "it": ""}) is None)
# Italian shares cognates English does not; the point of the measure
o2 = analyze.overlap({"en": "creazione and creation",
                      "it": "creazione e creazione"})
ok("exact cognate matches count", o2["count"] >= 1, o2)

# ---------------------------------------------------------------- report

section("report")
corpus = {
    "generated": "2026-01-01T00:00:00Z",
    "sources": [{
        "id": "demo",
        "paired": [
            {"en": "In the beginning God created the heavens and the earth. "
                   "The earth was formless and empty.",
             "it": "Nel principio Dio creò i cieli e la terra. "
                   "Ora la terra era informe e vuota."},
            {"en": "The madeleine. It brought back everything, all at once, "
                   "a forgotten memory of a distant summer afternoon.",
             "it": "La madeleine. Riportò tutto, tutto insieme, un ricordo "
                   "dimenticato di un pomeriggio estivo lontano."},
        ],
        "singles": [{"en": "A label that is long enough to count"}],
    }],
}
r = analyze.build(corpus)
ok("pairs are collected", len(r["paired"]) == 2)
ok("singles are collected", len(r["singles"]) == 1)
ok("english is analysed", r["en"] is not None and r["en"]["tokens"] > 0)
ok("italian is analysed", r["it"] is not None and r["it"]["tokens"] > 0)
ok("by_source is keyed", "demo" in r["by_source"])
ok("overlaps are computed", len(r["overlaps"]) == 2)

doc = analyze.render(r)
ok("html is closed", doc.rstrip().endswith("</html>"))
ok("charts are inline svg", doc.count("<svg") >= 4, doc.count("<svg"))
ok("no script tags", "<script" not in doc.lower())
ok("no external stylesheets", "stylesheet" not in doc.lower())
ok("caveats are present", "Read this before the numbers" in doc)
ok("caveats name the sample size", "tokens" in doc)
ok("summary table present", "type/token ratio" in doc)

# an empty corpus must not silently produce a report
empty = {"generated": "", "sources": []}
er = analyze.build(empty)
ok("an empty corpus analyses to nothing", er["en"] is None and er["it"] is None)

# ---------------------------------------------------------------- svg safety

section("svg safety")
svg = analyze.svg_hist("t", analyze.histogram([1, 2, 3]))
ok("histogram svg escapes nothing harmful", "<script" not in svg.lower())
svg2 = analyze.svg_bars("t", [("<img src=x>", 5)])
ok("bar labels are escaped", "&lt;img" in svg2, svg2[-200:])
ok("svg declares its namespace", 'xmlns="http://www.w3.org/2000/svg"' in svg)
ok("empty histogram chart is empty", analyze.svg_hist("t", []) == "")
ok("empty bar chart is empty", analyze.svg_bars("t", []) == "")
ok("curve needs two points", analyze.svg_curve("t", [{"name": "x", "points": [(1, 1)]}],
                                                "x", "y") == "")

print("\n" + ("FAILED" if FAILURES else "OK") + f"  {CHECKS - FAILURES}/{CHECKS} checks")
sys.exit(1 if FAILURES else 0)