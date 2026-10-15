#!/usr/bin/env python3
"""
Literary statistics for the repo's own bilingual corpus.

    python3 tools/corpora/analyze.py
    python3 tools/corpora/analyze.py tools/corpora/out/corpus.json
    python3 tools/corpora/analyze.py --svg-only

Reads the JSON written by tools/corpora/extract.mjs and computes real
descriptive statistics over the prose the literary PWAs actually ship:
sentence-length distributions, type/token ratio, hapax legomena,
lexical density, Zipf's law fits, and how much vocabulary the English and
Italian versions of the same passage share.

Standard library only. Charts are hand-written SVG so the output is a
single file that opens offline.

A note on scope, because it matters for how the numbers should be read:
this is statistics of the *hand-authored corpus in this repository*, which
is a few dozen short passages. It is not a measurement of Tolstoy,
Dostoevsky or Proust. The sample is far too small for the classic
descriptive statistics of literary corpora to mean what they would mean at
scale, and the report says so on its face.
"""
import argparse
import html
import json
import math
import os
import re
import statistics
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CORPUS = os.path.join(HERE, "out/corpus.json")

# ---------------------------------------------------------------- tokenising

# Sentence boundaries: terminal punctuation followed by whitespace and a
# capital or quote. Abbreviations are rare in this corpus, so the simple
# rule costs less than the false positives a full splitter would add.
SENT_SPLIT = re.compile(r'(?<=[.!?…])["”’\')\]]*\s+(?=["“\'(\[]*[A-ZÀ-Ý])')

WORD_RE = {
    "en": re.compile(r"[A-Za-z][A-Za-z'’-]*"),
    "it": re.compile(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’-]*"),
}

# Closed-class words are excluded from lexical density: "the" is a real
# token but it says nothing about how dense a passage's vocabulary is.
FUNCTION_WORDS = {
    "en": set("""a an the and or but if then than that this these those of in on at to
        for with without from by as is are was were be been being it its it's he she
        they them his her their we you i me my our your not no nor so such into over
        under again very can could would should will shall may might must do does did
        have has had having there here what which who whom when where why how all any
        both each few more most other some only own same too just about above below""".split()),
    "it": set("""il lo la i gli le un uno una di a da in con su per tra fra e o ma se
        che chi cui non né più come quando dove perché tutto tutto tutto tutti tutta
        tutte altro altra altri altre questo questa questi queste quello quella
        quelli quelle io tu lui lei noi voi loro mio mia tuo sua suo nostro vostro
        loro mio ti ci vi si ne è era sono era essere avere ha hanno aveva aveva
        fare fatto dice disse anche ancora già ancora solo sempre mai ogni qualche
        molto poco troppo assai già perché affinché benché come quindi allora""".split()),
}


def words(text, lang):
    return WORD_RE[lang].findall(text.lower())


def sentences(text):
    parts = SENT_SPLIT.split(text.strip())
    return [p.strip() for p in parts if p.strip()]


# ---------------------------------------------------------------- statistics

def ttr(tokens):
    """Type/token ratio: distinct forms over total tokens."""
    return len(set(tokens)) / len(tokens) if tokens else 0.0


def hapax(tokens):
    """Words appearing exactly once. The classic measure of a text's
    range: a text keeps inventing new words, or it does not."""
    c = Counter(tokens)
    return sum(1 for _, n in c.items() if n == 1)


def lexical_density(tokens, lang):
    fw = FUNCTION_WORDS[lang]
    content = [t for t in tokens if t not in fw]
    return len(content) / len(tokens) if tokens else 0.0


def zipf_fit(counter, top=50):
    """Least-squares fit of rank against log10(frequency).

    Zipf's law predicts frequency ~ 1/rank, so regressing log10(freq) on
    log10(rank) should give a slope near -1. Returns the slope, the
    intercept, r^2 and the count of ranks used.
    """
    items = counter.most_common(top)
    if len(items) < 3:
        return None
    xs, ys = [], []
    for rank, (_, freq) in enumerate(items, start=1):
        if freq <= 0:
            continue
        xs.append(math.log10(rank))
        ys.append(math.log10(freq))
    n = len(xs)
    if n < 3:
        return None
    mx = sum(xs) / n
    my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:
        return None
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    slope = sxy / sxx
    intercept = my - slope * mx
    syy = sum((y - my) ** 2 for y in ys)
    r2 = (sxy * sxy) / (sxx * syy) if syy > 0 else 0.0
    return {"slope": slope, "intercept": intercept, "r2": r2, "n": n}


def ttr_by_length(token_lists):
    """Type/token ratio computed over increasingly large samples.

    TTR falls as a text gets longer purely by arithmetic, so a single
    number says little without knowing the length it was computed over.
    This is the standard correction: plot TTR against token count and read
    the shape rather than one number.
    """
    pts = []
    for size in (25, 50, 100, 200, 400, 800):
        vals = []
        for tokens in token_lists:
            if len(tokens) < size:
                continue
            # Several windows per text so one long passage is not the only
            # contributor at the larger sizes.
            step = max(1, (len(tokens) - size) // 4)
            starts = range(0, len(tokens) - size + 1, step)
            for s in starts:
                vals.append(ttr(tokens[s:s + size]))
        if vals:
            pts.append({"size": size, "ttr": statistics.fmean(vals),
                        "n": len(vals)})
    return pts


def histogram(values, bins=14):
    if not values:
        return []
    lo, hi = min(values), max(values)
    if hi == lo:
        hi = lo + 1
    counts = [0] * bins
    for v in values:
        b = min(bins - 1, max(0, int((v - lo) / (hi - lo) * bins)))
        counts[b] += 1
    width = (hi - lo) / bins
    return [{"lo": lo + i * width, "hi": lo + (i + 1) * width, "count": counts[i]}
            for i in range(bins)]


def analyse_language(passages, lang):
    tokens, sent_lens = [], []
    per_passage = []
    for p in passages:
        text = p.get(lang)
        if not text:
            continue
        w = words(text, lang)
        if not w:
            continue
        tokens.extend(w)
        sl = [len(words(s, lang)) for s in sentences(text)]
        sent_lens.extend(sl)
        per_passage.append({"tokens": w, "sentences": sl, "text": text})

    if not tokens:
        return None

    counter = Counter(tokens)
    return {
        "tokens": len(tokens),
        "types": len(counter),
        "ttr": ttr(tokens),
        "hapax": hapax(tokens),
        "hapax_ratio": hapax(tokens) / len(counter) if counter else 0,
        "density": lexical_density(tokens, lang),
        "sentences": len(sent_lens),
        "sent_len_mean": statistics.fmean(sent_lens) if sent_lens else 0,
        "sent_len_median": statistics.median(sent_lens) if sent_lens else 0,
        "sent_len_stdev": statistics.stdev(sent_lens) if len(sent_lens) > 1 else 0,
        "sent_len_min": min(sent_lens) if sent_lens else 0,
        "sent_len_max": max(sent_lens) if sent_lens else 0,
        "sent_len_cv": (statistics.stdev(sent_lens) / statistics.fmean(sent_lens))
        if len(sent_lens) > 1 and sent_lens else 0,
        "zipf": zipf_fit(counter),
        "top": counter.most_common(15),
        "per_passage": per_passage,
        "sent_len_hist": histogram(sent_lens),
        "ttr_curve": ttr_by_length([p["tokens"] for p in per_passage]),
    }


def overlap(passage):
    """Lexical overlap between the two languages of one passage.

    There is no translation memory here, so this is not a semantic
    measure. It reports how many token *forms* the two versions share -
    which for English and Italian is dominated by proper nouns, cognates
    and loanwords (creation/creazione, madeleine/madeleine). That is the
    interesting part: it shows what a bilingual corpus does and does not
    share across languages.
    """
    en = set(words(passage.get("en", ""), "en"))
    it = set(words(passage.get("it", ""), "it"))
    if not en or not it:
        return None
    shared = en & it
    smaller = min(len(en), len(it))
    return {
        "shared": sorted(shared),
        "count": len(shared),
        "rate": len(shared) / smaller if smaller else 0,
        "en_size": len(en),
        "it_size": len(it),
    }


# ---------------------------------------------------------------- svg


class SVG:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.p = []
        self.ink, self.dim = "#e8eaf2", "#8b93a7"
        self.grid = "#2a2f3d"
        self.c = ["#5b8def", "#e8a924", "#e0342c", "#22a55e", "#9b59d0"]

    def rect(self, x, y, w, h, fill, o=1.0, rx=0):
        oo = f' opacity="{o}"' if o != 1.0 else ""
        rr = f' rx="{rx}"' if rx else ""
        self.p.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{max(0,w):.2f}" '
                      f'height="{max(0,h):.2f}" fill="{fill}"{oo}{rr}/>')

    def line(self, x1, y1, x2, y2, s, w=1, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.p.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" '
                      f'y2="{y2:.2f}" stroke="{s}" stroke-width="{w}"{d}/>')

    def text(self, x, y, s, fill=None, size=11, anchor="start", weight="400"):
        self.p.append(
            f'<text x="{x:.2f}" y="{y:.2f}" fill="{fill or self.dim}" '
            f'font-size="{size}" text-anchor="{anchor}" '
            f'font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" '
            f'font-weight="{weight}">{html.escape(str(s))}</text>')

    def polyline(self, pts, s, w=2):
        if len(pts) < 2:
            return
        d = " ".join(f"{x:.2f},{y:.2f}" for x, y in pts)
        self.p.append(f'<polyline points="{d}" fill="none" stroke="{s}" '
                      f'stroke-width="{w}" stroke-linejoin="round"/>')

    def circle(self, x, y, r, f):
        self.p.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r}" fill="{f}"/>')

    def render(self):
        return (f'<svg viewBox="0 0 {self.w} {self.h}" width="100%" '
                f'style="max-width:{self.w}px" xmlns="http://www.w3.org/2000/svg">'
                f'{"".join(self.p)}</svg>')


def svg_hist(title, bins, width=540, height=210, color="#5b8def", xlab=""):
    s = SVG(width, height)
    pl, pr, pt, pb = 44, 10, 24, 26
    pw, ph = width - pl - pr, height - pt - pb
    if not bins:
        return ""
    mx = max(b["count"] for b in bins) or 1
    s.text(0, 14, title, s.ink, 12, "start", "600")
    for f in (0, .5, 1):
        y = pt + ph * (1 - f)
        s.line(pl, y, pl + pw, y, s.grid)
        s.text(pl - 6, y, str(int(mx * f)), s.dim, 10, "end")
    slot = pw / len(bins)
    for i, b in enumerate(bins):
        h = (b["count"] / mx) * ph
        s.rect(pl + i * slot, pt + ph - h, slot * .86, h, color, rx=1)
        s.text(pl + slot * (i + .5), pt + ph + 13, f"{b['lo']:.0f}", s.dim, 9, "middle")
    s.text(pl + pw, pt + ph + 13, f"{bins[-1]['hi']:.0f}", s.dim, 9, "end")
    if xlab:
        s.text(pl + pw / 2, height - 2, xlab, s.dim, 10, "middle")
    return s.render()


def svg_curve(title, series, xlabel, ylabel, width=540, height=230, logy=False):
    """series: [{name, points:[(x,y)]}]"""
    s = SVG(width, height)
    pl, pr, pt, pb = 48, 12, 24, 30
    pw, ph = width - pl - pr, height - pt - pb
    pts = [p for sr in series for p in sr["points"]]
    if len(pts) < 2:
        return ""
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    lox, hix = min(xs), max(xs)
    loy, hiy = (min(ys), max(ys)) if not logy else (0.0, 1.0)

    def sx(v):
        return pl + (v - lox) / (hix - lox or 1) * pw

    def sy(v):
        return pt + ph - (v - loy) / (hiy - loy or 1) * ph

    s.text(0, 14, title, s.ink, 12, "start", "600")
    for f in (0, .25, .5, .75, 1):
        y = pt + ph * (1 - f)
        s.line(pl, y, pl + pw, y, s.grid)
        s.text(pl - 6, y, f"{loy + (hiy-loy)*f:.2f}", s.dim, 10, "end")
    for si, sr in enumerate(series):
        s.polyline([(sx(x), sy(y)) for x, y in sr["points"]],
                   s.c[si % len(s.c)], 2)
        for x, y in sr["points"]:
            s.circle(sx(x), sy(y), 2.5, s.c[si % len(s.c)])
    s.text(pl + pw, height - 2, xlabel, s.dim, 10, "end")
    s.text(0, pt - 8, ylabel, s.dim, 10, "start")
    return s.render()


def svg_bars(title, items, width=540, height=210, color="#5b8def", xlab=""):
    s = SVG(width, height)
    pl, pr, pt, pb = 44, 10, 24, 30
    pw, ph = width - pl - pr, height - pt - pb
    if not items:
        return ""
    mx = max(v for _, v in items) or 1
    s.text(0, 14, title, s.ink, 12, "start", "600")
    for f in (0, .5, 1):
        y = pt + ph * (1 - f)
        s.line(pl, y, pl + pw, y, s.grid)
        s.text(pl - 6, y, f"{mx*f:.0f}", s.dim, 10, "end")
    slot = pw / len(items)
    for i, (lab, v) in enumerate(items):
        h = (v / mx) * ph
        s.rect(pl + i * slot, pt + ph - h, slot * .8, h, color, rx=1)
        s.text(pl + slot * (i + .5), pt + ph + 13, lab, s.dim, 9, "middle")
    if xlab:
        s.text(pl + pw, height - 2, xlab, s.dim, 10, "end")
    return s.render()


# ---------------------------------------------------------------- report


def build(corpus):
    paired = []
    for src in corpus["sources"]:
        for p in src["paired"]:
            paired.append({**p, "source": src["id"]})
    singles = []
    for src in corpus["sources"]:
        for s in src["singles"]:
            singles.append({**s, "source": src["id"]})

    en_texts = [p for p in paired if p.get("en")]
    it_texts = [p for p in paired if p.get("it")]

    en = analyse_language(en_texts, "en")
    it = analyse_language(it_texts, "it")

    overlaps = [o for o in (overlap(p) for p in paired) if o]
    by_source = {}
    for src in corpus["sources"]:
        sp = [p for p in paired if p["source"] == src["id"]]
        se = analyse_language([p for p in sp if p.get("en")], "en")
        si = analyse_language([p for p in sp if p.get("it")], "it")
        if se:
            by_source[src["id"]] = {
                "passages": len(sp),
                "en_tokens": se["tokens"],
                "en_ttr": se["ttr"],
                "en_sent_mean": se["sent_len_mean"],
                "it_tokens": si["tokens"] if si else 0,
                "it_ttr": si["ttr"] if si else 0,
                "it_sent_mean": si["sent_len_mean"] if si else 0,
            }

    return {
        "paired": paired, "singles": singles,
        "en": en, "it": it,
        "overlaps": overlaps,
        "by_source": by_source,
        "generated": corpus.get("generated"),
    }


def caveats(r):
    n_en = r["en"]["tokens"] if r["en"] else 0
    return [
        (f"The corpus is {n_en:,} English tokens in {len(r['paired'])} paired "
         "passages. Published literary-corpus statistics usually run to "
         "hundreds of thousands of words; these are three orders of magnitude "
         "smaller, so treat every number as descriptive of this repository's "
         "text rather than of its authors."),
        ("The passages are hand-authored adaptations, not the complete works. "
         "Nothing here should be cited as a property of Dostoevsky or Proust."),
        ("Lexical overlap between the English and Italian versions is measured "
         "on token forms only, with no translation model. What it finds is "
         "proper nouns, cognates and loanwords - it is not semantic similarity."),
        ("Type/token ratio falls with length by arithmetic, so the single TTR "
         "figure is reported next to a TTR-against-length curve instead of on "
         "its own."),
    ]


def render(r):
    en, it = r["en"], r["it"]
    p = []
    p.append("""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Corpus report — random2 literary PWAs</title><style>
:root{color-scheme:dark}
body{margin:0;padding:32px 20px 64px;background:#0d0f16;color:#e8eaf2;
 font:15px/1.62 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}
.wrap{max-width:900px;margin:0 auto}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:15px;margin:34px 0 12px;color:#c6ccdb;text-transform:uppercase;
 letter-spacing:.08em;font-weight:700}
h3{font-size:13px;margin:18px 0 8px;color:#9aa3b8;font-weight:600}
p{margin:0 0 10px;color:#b6bccd}
.sub{color:#8b93a7;font-size:13px;margin-bottom:22px}
table{border-collapse:collapse;width:100%;font-size:13px;margin:6px 0}
th,td{text-align:right;padding:7px 10px;border-bottom:1px solid #232838}
th:first-child,td:first-child{text-align:left}
th{color:#8b93a7;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
td{font-variant-numeric:tabular-nums}
figure{margin:0 0 16px;padding:14px;background:#12141c;border:1px solid #232838;border-radius:10px}
.caveat{border-left:3px solid #e0342c;background:#151824;padding:11px 14px;margin:7px 0;
 border-radius:0 8px 8px 0;color:#c3c9d8;font-size:13.5px}
code{background:#1a1e2b;padding:1px 5px;border-radius:4px;font-size:12px}
.grid{display:grid;gap:16px}
@media(min-width:740px){.grid{grid-template-columns:1fr 1fr}}
.kv{display:flex;gap:10px;font-size:13px;flex-wrap:wrap;margin:6px 0}
.kv span{background:#171b27;border:1px solid #232838;border-radius:6px;padding:4px 9px}
.kv b{color:#e8eaf2;font-variant-numeric:tabular-nums}
</style></head><body><div class="wrap">""")

    p.append("<h1>Corpus report</h1>")
    p.append(f'<p class="sub">{len(r["paired"])} paired passages, '
             f'{len(r["singles"])} single-language strings, from the literary '
             f'PWAs in this repository.</p>')

    # caveats first and unmissable
    p.append("<h2>Read this before the numbers</h2>")
    for c in caveats(r):
        p.append(f'<div class="caveat">{html.escape(c)}</div>')

    # headline
    p.append("<h2>Summary</h2><table><tr><th>metric</th><th>English</th>"
             "<th>Italian</th></tr>")
    def row(label, a, b):
        p.append(f"<tr><td>{html.escape(label)}</td><td>{a}</td><td>{b}</td></tr>")
    row("tokens", f'{en["tokens"]:,}', f'{it["tokens"]:,}')
    row("types", f'{en["types"]:,}', f'{it["types"]:,}')
    row("type/token ratio", f'{en["ttr"]:.3f}', f'{it["ttr"]:.3f}')
    row("hapax legomena", f'{en["hapax"]:,}', f'{it["hapax"]:,}')
    row("hapax share of types", f'{en["hapax_ratio"]*100:.1f}%', f'{it["hapax_ratio"]*100:.1f}%')
    row("lexical density", f'{en["density"]*100:.1f}%', f'{it["density"]*100:.1f}%')
    row("sentences", f'{en["sentences"]:,}', f'{it["sentences"]:,}')
    row("mean sentence length", f'{en["sent_len_mean"]:.1f}', f'{it["sent_len_mean"]:.1f}')
    row("median sentence length", f'{en["sent_len_median"]:.1f}', f'{it["sent_len_median"]:.1f}')
    row("sentence length sd", f'{en["sent_len_stdev"]:.1f}', f'{it["sent_len_stdev"]:.1f}')
    row("sentence length cv", f'{en["sent_len_cv"]:.2f}', f'{it["sent_len_cv"]:.2f}')
    if en["zipf"] and it["zipf"]:
        row("Zipf slope (top 50)",
            f'{en["zipf"]["slope"]:.3f} (R² {en["zipf"]["r2"]:.3f})',
            f'{it["zipf"]["slope"]:.3f} (R² {it["zipf"]["r2"]:.3f})')
    p.append("</table>")

    # sentence length
    p.append("<h2>Sentence length</h2><div class='grid'>")
    p.append("<figure>" + svg_hist(
        "English: words per sentence", en["sent_len_hist"],
        xlab="words per sentence") + "</figure>")
    p.append("<figure>" + svg_hist(
        "Italian: words per sentence", it["sent_len_hist"],
        color="#e8a924", xlab="words per sentence") + "</figure>")
    p.append("</div>")

    # TTR curve
    curve = []
    for name, lang in (("English", en), ("Italian", it)):
        if lang and lang["ttr_curve"]:
            curve.append({"name": name,
                          "points": [(c["size"], c["ttr"]) for c in lang["ttr_curve"]]})
    p.append("<h2>Vocabulary richness against length</h2>")
    p.append("<p>Type/token ratio falls as a sample grows, whatever the text. "
             "The informative quantity is the shape of the fall, so it is "
             "plotted over equal-length windows instead of reported as one "
             "number.</p>")
    p.append("<figure>" + svg_curve(
        "type/token ratio vs window size", curve,
        "tokens in window", "TTR") + "</figure>")

    # top words
    p.append("<h2>Most frequent words</h2><div class='grid'>")
    p.append("<figure>" + svg_bars(
        "English", [(w, n) for w, n in en["top"][:10]], xlab="word") + "</figure>")
    p.append("<figure>" + svg_bars(
        "Italian", [(w, n) for w, n in it["top"][:10]],
        color="#e8a924", xlab="word") + "</figure>")
    p.append("</div>")

    # per source
    if r["by_source"]:
        p.append("<h2>By source</h2><table><tr><th>PWA</th><th>passages</th>"
                 "<th>EN tokens</th><th>EN TTR</th><th>EN sent len</th>"
                 "<th>IT TTR</th><th>IT sent len</th></tr>")
        for sid in sorted(r["by_source"]):
            b = r["by_source"][sid]
            p.append(f'<tr><td>{html.escape(sid)}</td><td>{b["passages"]}</td>'
                     f'<td>{b["en_tokens"]:,}</td><td>{b["en_ttr"]:.3f}</td>'
                     f'<td>{b["en_sent_mean"]:.1f}</td><td>{b["it_ttr"]:.3f}</td>'
                     f'<td>{b["it_sent_mean"]:.1f}</td></tr>')
        p.append("</table>")

    # overlap
    p.append("<h2>English / Italian overlap</h2>")
    if r["overlaps"]:
        rates = [o["rate"] for o in r["overlaps"]]
        p.append(f'<p>Across {len(r["overlaps"])} passages, the two language '
                 f'versions share on average '
                 f'{statistics.fmean(rates)*100:.1f}% of the smaller '
                 f'vocabulary. These are matching word forms, not translated '
                 f'content: proper nouns, cognates and loanwords.</p>')
        p.append("<figure>" + svg_bars(
            "shared forms per passage",
            [(str(i + 1), o["count"]) for i, o in enumerate(r["overlaps"][:20])],
            xlab="passage") + "</figure>")
        allshared = Counter()
        for o in r["overlaps"]:
            allshared.update(o["shared"])
        top = allshared.most_common(18)
        p.append("<h3>Most shared forms</h3><div class='kv'>" +
                 "".join(f"<span>{html.escape(w)} <b>{n}</b></span>"
                         for w, n in top) + "</div>")
    else:
        p.append("<p>No paired passages available.</p>")

    p.append('<p class="sub" style="margin-top:30px">standard library only; '
             'charts are inline SVG, so this file opens offline with no '
             'assets and no network.</p>')
    p.append("</div></body></html>")
    return "".join(p)


def main():
    ap = argparse.ArgumentParser(description="Corpus statistics")
    ap.add_argument("corpus", nargs="?", default=DEFAULT_CORPUS)
    ap.add_argument("--out", default=None)
    ap.add_argument("--json", action="store_true",
                    help="also print the summary as JSON")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(args.corpus):
        print(f"no corpus at {args.corpus}", file=sys.stderr)
        print("run: node tools/corpora/extract.mjs", file=sys.stderr)
        return 2

    with open(args.corpus, encoding="utf-8") as fh:
        corpus = json.load(fh)

    r = build(corpus)
    if not r["en"] or not r["it"]:
        print("corpus has no bilingual passages", file=sys.stderr)
        return 2

    en, it = r["en"], r["it"]

    if not args.quiet:
        print(f"\nCorpus report — {len(r['paired'])} paired passages\n")
        print(f"{'metric':<28}{'EN':>12}{'IT':>12}")
        def line(label, a, b):
            print(f"{label:<28}{a:>12}{b:>12}")
        line("tokens", f'{en["tokens"]:,}', f'{it["tokens"]:,}')
        line("types", f'{en["types"]:,}', f'{it["types"]:,}')
        line("TTR", f"{en['ttr']:.3f}", f"{it['ttr']:.3f}")
        line("hapax legomena", f'{en["hapax"]:,}', f'{it["hapax"]:,}')
        line("lexical density",
             f'{en["density"]*100:.1f}%', f'{it["density"]*100:.1f}%')
        line("sentences", f'{en["sentences"]:,}', f'{it["sentences"]:,}')
        line("mean sentence length",
             f'{en["sent_len_mean"]:.1f}', f'{it["sent_len_mean"]:.1f}')
        line("sentence length cv",
             f'{en["sent_len_cv"]:.2f}', f'{it["sent_len_cv"]:.2f}')
        if en["zipf"] and it["zipf"]:
            line("Zipf slope",
                 f'{en["zipf"]["slope"]:.3f}', f'{it["zipf"]["slope"]:.3f}')
            line("Zipf R2",
                 f'{en["zipf"]["r2"]:.3f}', f'{it["zipf"]["r2"]:.3f}')
        if r["overlaps"]:
            line("mean EN/IT overlap",
                 f'{statistics.fmean([o["rate"] for o in r["overlaps"]])*100:.1f}%', "")
        print("\ncaveats")
        for c in caveats(r):
            print("  - " + c)

    out = args.out or os.path.splitext(args.corpus)[0] + "-report.html"
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(render(r))
    if not args.quiet:
        print(f"\nwrote {out}")

    if args.json:
        print(json.dumps({
            "tokens": {"en": en["tokens"], "it": it["tokens"]},
            "ttr": {"en": en["ttr"], "it": it["ttr"]},
            "zipf": {
                "en": en["zipf"], "it": it["zipf"],
            },
        }, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())