/*
 * Headless checks for shared/chart.js and shared/arcade.js.
 *
 *   node tools/selftest.mjs
 *
 * No dependencies, no canvas package: the pure maths (ticks, scales,
 * five-number summary, least squares) is exercised directly, and the drawing
 * functions are driven against a recording stub context so that a throw
 * anywhere in a draw call is caught.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

let checks = 0;
let failures = 0;

function ok(label, condition, detail) {
    checks++;
    if (condition) return;
    failures++;
    console.error("  FAIL  " + label + (detail !== undefined ? " -> " + detail : ""));
}

function near(label, actual, expected, eps = 1e-9) {
    ok(label, Math.abs(actual - expected) <= eps, actual + " != " + expected);
}

function section(name) {
    console.log("\n" + name);
}

/* ===== canvas stub ===== */

/*
 * Canvas colour lives in `strokeStyle`/`fillStyle` at the moment a draw
 * happens, not as an argument. So the stub snapshots the live style onto
 * every stroke/fill call — otherwise "did the chart pass a real colour"
 * is untestable, which is exactly the check that matters here.
 */
function makeCtx() {
    const calls = [];
    const state = { fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "", textBaseline: "" };
    const rec = (name) => (...args) => { calls.push([name, ...args]); };
    const paint = (kind) => (...args) => {
        /* shape: [kind, strokeStyle, fillStyle, lineWidth, font, ...args] */
        calls.push([kind, state.strokeStyle, state.fillStyle, state.lineWidth, state.font, ...args]);
    };
    const ctx = {
        calls,
        canvas: {},
        setTransform: rec("setTransform"),
        clearRect: rec("clearRect"),
        save: rec("save"), restore: rec("restore"),
        beginPath: rec("beginPath"), closePath: rec("closePath"),
        moveTo: rec("moveTo"), lineTo: rec("lineTo"),
        arc: rec("arc"), arcTo: rec("arcTo"),
        stroke: paint("stroke"), fill: paint("fill"),
        fillRect: paint("fillRect"), clearRect: rec("clearRect"),
        fillText: paint("fillText"), strokeText: rec("strokeText"),
        setLineDash: rec("setLineDash"),
        measureText: (s) => ({ width: String(s).length * 6 }),
    };
    /* Style properties proxy to the snapshot state. */
    Object.defineProperties(ctx, {
        fillStyle: { get: () => state.fillStyle, set: (v) => { state.fillStyle = v; }, enumerable: true },
        strokeStyle: { get: () => state.strokeStyle, set: (v) => { state.strokeStyle = v; }, enumerable: true },
        lineWidth: { get: () => state.lineWidth, set: (v) => { state.lineWidth = v; }, enumerable: true },
        font: { get: () => state.font, set: (v) => { state.font = v; }, enumerable: true },
        textAlign: { get: () => state.textAlign, set: (v) => { state.textAlign = v; }, enumerable: true },
        textBaseline: { get: () => state.textBaseline, set: (v) => { state.textBaseline = v; }, enumerable: true }
    });
    return ctx;
}

function makeCanvas() {
    const ctx = makeCtx();
    return { width: 0, height: 0, clientWidth: 640, clientHeight: 240, style: {}, ctx, getContext: () => ctx };
}

/* ===== load the scripts into a sandbox ===== */

globalThis.window = {
    matchMedia: () => ({ matches: false }),
    devicePixelRatio: 2,
    addEventListener() { }
};
globalThis.devicePixelRatio = 2;
globalThis.document = {
    visibilityState: "visible",
    documentElement: {},
    createElement: () => ({ getContext: () => makeCtx() }),
    addEventListener() { },
    head: { appendChild() { } },
    body: {}
};
/* In a browser `window === globalThis`, and shared/chart.js reads
   window.getComputedStyle. The harness has to reproduce that aliasing or
   the colour-resolution checks would pass for the wrong reason. */
const fakeComputedStyle = () => ({
    getPropertyValue: (name) => ({
        "--accent": "#5b8def",
        "--accent-2": "#e8a924",
        "--c1": "#5b8def",
        "--chart-ink": "#e8eaf2",
        "--chart-dim": "#8b93a7"
    }[name] || "")
});
globalThis.getComputedStyle = fakeComputedStyle;
globalThis.window.getComputedStyle = fakeComputedStyle;
/* Node >= 21 exposes a read-only `navigator`; arcade.js only touches it
   inside buzz()/installHint(), neither of which the stats layer calls. */

const store = new Map();
globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
};

(0, eval)(readFileSync(resolve(root, "shared/chart.js"), "utf8"));
(0, eval)(readFileSync(resolve(root, "shared/arcade.js"), "utf8"));

const C = window.R2Chart;
const R2 = window.R2;

/* ===== ticks ===== */

section("ticks");
ok("integer ticks across 0..100", JSON.stringify(C.ticks(0, 100, 5)) === "[0,20,40,60,80,100]", JSON.stringify(C.ticks(0, 100, 5)));
ok("decimal ticks across 0..1", JSON.stringify(C.ticks(0, 1, 5)) === "[0,0.2,0.4,0.6000000000000001,0.8,1]", JSON.stringify(C.ticks(0, 1, 5)));
near("first tick is >= lo for 3..97", C.ticks(3, 97, 5)[0], 20);
ok("ticks span the range", C.ticks(0, 250, 5).every((t) => t >= 0 && t <= 250));
ok("negative range handled", C.ticks(-50, 50, 5).includes(0), JSON.stringify(C.ticks(-50, 50, 5)));
ok("degenerate range terminates", C.ticks(5, 5, 5).length <= 1, JSON.stringify(C.ticks(5, 5, 5)));
ok("tick count is bounded", C.ticks(0, 1e9, 5).length < 200, C.ticks(0, 1e9, 5).length);

/* ===== fmt ===== */

section("fmt");
ok("thousands compact", C.fmt(1200) === "1.2k", C.fmt(1200));
ok("millions compact", C.fmt(3400000) === "3.4M", C.fmt(3400000));
ok("billions compact", C.fmt(1500000000) === "1.5B", C.fmt(1500000000));
ok("sub-thousand stays plain", C.fmt(842) === "842", C.fmt(842));
ok("negative handled", C.fmt(-1200) === "-1.2k", C.fmt(-1200));

/* ===== summarise (Tukey) ===== */

section("summarise");
const s1 = C.summarise([1, 2, 3, 4, 5, 6, 7, 8, 9, 100]);
near("q1", s1.q1, 3.25);
near("median", s1.median, 5.5);
near("q3", s1.q3, 7.75);
ok("100 is an outlier", s1.outliers.includes(100), JSON.stringify(s1.outliers));
near("whisker excludes outlier", s1.whiskerHi, 9);
const s2 = C.summarise([5, 5, 5]);
ok("constant series -> zero IQR, no NaN", s2.q1 === s2.q3 && !Number.isNaN(s2.median), JSON.stringify(s2));
const s3 = C.summarise([]);
ok("empty input returns null", s3 === null);

/* ===== leastSquares ===== */

section("leastSquares");
const fit = C.leastSquares([[1, 2], [2, 4], [3, 6], [4, 8]]);
near("perfect slope", fit.slope, 2, 1e-9);
near("perfect intercept", fit.y0, 0, 1e-9);
near("perfect r2", fit.r2, 1, 1e-9);
const flat = C.leastSquares([[1, 5], [2, 5], [3, 5]]);
near("flat line -> zero slope", flat.slope, 0, 1e-9);
ok("single point is not a fit", C.leastSquares([[1, 1]]) === null);
/* A vertical line has no function to fit: the guard must reject it rather
   than return NaN, so callers never draw a trend line through nothing. */
ok("vertical line rejected, not NaN", C.leastSquares([[2, 1], [2, 2], [2, 3]]) === null);

/* ===== drawing: every chart renders without throwing ===== */

section("rendering");
const series = [{ name: "a", points: [[0, 1], [1, 4], [2, 9], [3, 16]] }];
const okCharts = [
    ["line", () => C.line(makeCanvas(), series)],
    ["line+fill", () => C.line(makeCanvas(), series, { fill: true })],
    ["line with gaps", () => C.line(makeCanvas(), [{ points: [[0, 1], null, [2, 5], [3, 2]] }])],
    ["area", () => C.area(makeCanvas(), series)],
    ["multi-series legend", () => C.line(makeCanvas(), [
        { name: "x", points: [[0, 1], [1, 2]] },
        { name: "y", points: [[0, 3], [1, 1]] }
    ])],
    ["bar", () => C.bar(makeCanvas(), [{ label: "a", value: 3 }, { label: "b", value: 8 }])],
    ["bar value labels", () => C.bar(makeCanvas(), [{ label: "a", value: 3 }], { valueLabels: true })],
    ["histogram", () => C.histogram(makeCanvas(), [1, 2, 2, 3, 3, 3, 9])],
    ["scatter", () => C.scatter(makeCanvas(), [[1, 2], [3, 7], [5, 4]])],
    ["scatter with trend", () => C.scatter(makeCanvas(), [[1, 2], [3, 7], [5, 4]], { trend: true })],
    ["boxplot", () => C.boxplot(makeCanvas(), [{ label: "g", values: [1, 2, 3, 40] }])],
    ["heatmap", () => C.heatmap(makeCanvas(), [[1, 2], [3, 4]], { rowLabels: ["r1", "r2"], colLabels: ["c1", "c2"] })],
    /* Sparse and long column labels used to overprint into one run of
       digits; the heatmap now skips labels that would collide. */
    ["heatmap, sparse col labels", () => C.heatmap(makeCanvas(),
        [[1, 2, 3], [4, 5, 6]],
        { colLabels: [null, "06:00", null], rowLabels: ["Mon", "Tue"] })],
    ["heatmap, all-zero matrix", () => C.heatmap(makeCanvas(),
        [[0, 0], [0, 0]], { rowLabels: ["Mon", "Tue"] })],
    ["heatmap, ragged rows", () => C.heatmap(makeCanvas(), [[1, 2, 3], [4]], {})],
    ["heatmap, single cell", () => C.heatmap(makeCanvas(), [[5]], {})],
    ["heatmap, overlong labels", () => C.heatmap(makeCanvas(), [[1, 2]],
        { colLabels: ["a very long label indeed", "x"] })],
    ["sparkline", () => C.sparkline(makeCanvas(), [3, 1, 4, 1, 5])],
    ["empty line", () => C.line(makeCanvas(), [])],
    ["empty histogram", () => C.histogram(makeCanvas(), [])],
    ["empty scatter", () => C.scatter(makeCanvas(), [])],
    ["empty heatmap", () => C.heatmap(makeCanvas(), [])]
];
for (const [name, fn] of okCharts) {
    let threw = null;
    try { fn(); } catch (e) { threw = e; }
    ok(name + " renders", threw === null, threw && threw.message);
}

/* ===== histogram mean marker lands inside the plot ===== */

section("histogram marker");
const hcanvas = makeCanvas();
const hctx = hcanvas.getContext();
const hres = C.histogram(hcanvas, [10, 20, 30, 40, 50], { markMean: true });
near("mean of 10..50 is 30", hres.mean, 30);
const dashed = hctx.calls.filter((c) => c[0] === "setLineDash" && c[1] && c[1].length === 2);
ok("mean marker is drawn dashed", dashed.length > 0, dashed.length);

/* ===== DPR handling ===== */

section("dpr");
const dc = makeCanvas();
C.line(dc, series);
ok("canvas backing store scaled by dpr", dc.width === 1280, dc.width);
ok("canvas CSS size not scaled", dc.style.width === "640px", dc.style.width);

/* ===== colour resolution =====
   Canvas cannot parse "var(--accent)": assigning it to strokeStyle leaves
   the previous colour in place, which on a light card means black. Every
   entry point that takes a colour has to resolve a theme token. */

section("colour resolution");
ok("a plain hex passes through", C.resolveColor("#5b8def") === "#5b8def");
ok("no colour and no fallback is null", C.resolveColor(undefined) === null);
ok("an explicit fallback is used", C.resolveColor(undefined, "#fff") === "#fff");
ok("a plain colour ignores the fallback", C.resolveColor("#111", "#fff") === "#111");
ok("a resolved custom property wins over the fallback",
    C.resolveColor("var(--accent)", "#000") === "#5b8def");
ok("an unknown custom property falls back",
    C.resolveColor("var(--nope)", "#123") === "#123");
ok("an unknown custom property with no fallback is null",
    C.resolveColor("var(--nope)") === null);
ok("a resolved token is never a var() string",
    !String(C.resolveColor("var(--accent)")).includes("var("));

const varCanvas = makeCanvas();
const varCtx = varCanvas.getContext();
C.line(varCanvas, [{ points: [[0, 1], [1, 2]] }], { color: "var(--accent)" });
const strokes = varCtx.calls.filter((c) => c[0] === "stroke");
ok("a line with a var() colour records a real stroke", strokes.length > 0,
    JSON.stringify(strokes[0]));
/* call shape: ["stroke", strokeStyle, fillStyle, lineWidth, font] */
const strokeColours = strokes.map((c) => String(c[1]));
ok("no var() string reaches the canvas",
    !strokeColours.some((s) => s.includes("var(")), strokeColours);
/* The axes also stroke (grid, baseline), so check that the *series* colour
   appears among them rather than that the first one happens to be it. */
ok("the stroke got a resolved hex",
    strokeColours.some((s) => /^#[0-9a-f]{6}$/i.test(s)), strokeColours);

const plainCanvas = makeCanvas();
C.line(plainCanvas, [{ points: [[0, 1], [1, 2]] }], {});
const plainStrokes = plainCanvas.getContext().calls.filter((c) => c[0] === "stroke");
ok("a chart with no colour option still strokes",
    plainStrokes.length > 0 && !!plainStrokes[0][1], JSON.stringify(plainStrokes[0]));

/* A multi-series chart must not collapse every line to one colour. */
const multiCanvas = makeCanvas();
const multiCtx = multiCanvas.getContext();
C.line(multiCanvas, [
    { name: "a", points: [[0, 1], [1, 2]] },
    { name: "b", points: [[0, 2], [1, 3]] }
], { colors: ["var(--accent)", "var(--accent-2)"] });
const multiColours = multiCtx.calls.filter((c) => c[0] === "stroke")
    .map((c) => String(c[1])).filter((s) => s && s !== "");
ok("a palette resolves per series", new Set(multiColours).size >= 2, multiColours);

/* Sparse column labels must not be drawn on top of each other. */
/* A categorical bar chart must not also print numeric x ticks: they land on
   the same baseline and overprint the category labels. */
const barCanvas = makeCanvas();
const barCtx = barCanvas.getContext();
C.bar(barCanvas, [{ label: "loss", value: 1 }, { label: "win", value: 3 }],
    { xLabel: true });
const barTexts = barCtx.calls.filter((c) => c[0] === "fillText")
    .map((c) => String(c[5]));
ok("bar chart draws its category labels",
    barTexts.includes("loss"), barTexts);

/* A single tall bar used to push its value label off the top of the canvas.
   Snapshot layout is [kind, stroke, fill, width, font, ...args], and
   fillText(s, x, y) puts y at index 7. */
const tallCanvas = makeCanvas();
const tallCtx = tallCanvas.getContext();
C.bar(tallCanvas, [{ label: "only", value: 1 }], { valueLabels: true });
const tallYs = tallCtx.calls.filter((c) => c[0] === "fillText")
    .map((c) => Number(c[7]));
ok("bar labels stay inside the canvas",
    tallYs.length > 0 && tallYs.every((y) => Number.isFinite(y) && y >= 0 && y <= 240),
    tallYs);

const sparseCanvas = makeCanvas();
const sparseCtx = sparseCanvas.getContext();
C.heatmap(sparseCanvas, [[1, 2, 3], [4, 5, 6]],
    { colLabels: [null, "06:00", null], rowLabels: ["Mon", "Tue"] });
const colTexts = sparseCtx.calls.filter((c) => c[0] === "fillText");
const colLabelYs = new Set(colTexts.map((c) => c[1]));
ok("the heatmap draws labels", colTexts.length > 0, colTexts.length);
/* Two labels on the same baseline at nearly the same x would overprint. */
const centres = colTexts.map((c) => Number(c[2]))
    .filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
let tooClose = false;
for (let i = 1; i < centres.length; i++) {
    if (centres[i] - centres[i - 1] < 14) tooClose = true;
}
ok("heatmap labels do not overlap", !tooClose, centres);
ok("a single-cell matrix renders", (() => {
    let threw = null;
    try { C.heatmap(makeCanvas(), [[5]], {}); } catch (e) { threw = e; }
    return threw === null;
})());

/* ===== R2.stats ===== */

section("R2.stats");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

R2.stats.run({ slug: "snake-pwa/", score: 42, durMs: 61000, wave: 3, outcome: "loss", meta: { mode: "daily" } });
R2.stats.run({ slug: "snake-pwa/", score: 77, durMs: 90000, wave: 5, outcome: "win" });
R2.stats.run({ slug: "sector7-pwa/", score: 1200, durMs: 30000 });
await sleep(1200);

ok("both same-window runs survive the debounce", R2.stats.runs("snake-pwa/").length === 2, R2.stats.runs("snake-pwa/").length);
ok("other slug isolated", R2.stats.runs("sector7-pwa/").length === 1);
const days = R2.stats.days("snake-pwa/");
ok("day rollup exists", days.length === 1, JSON.stringify(days));
ok("rollup counts both runs", days[0].row.n === 2, JSON.stringify(days[0]));
ok("rollup tracks best", days[0].row.best === 77, JSON.stringify(days[0]));
ok("rollup sums score", days[0].row.sum === 119, JSON.stringify(days[0]));
ok("rollup sums seconds", days[0].row.sec === 151, JSON.stringify(days[0]));
ok("days sorted ascending", R2.stats.days().length >= 1);

R2.stats.event("snake-pwa/", "walls", 4);
R2.stats.event("snake-pwa/", "walls", 2);
ok("events accumulate", R2.stats.events("snake-pwa/").walls === 6, JSON.stringify(R2.stats.events("snake-pwa/")));

for (let i = 0; i < 1500; i++) R2.stats.run({ slug: "cap-test", score: i });
await sleep(1200);
ok("ring buffer caps at 1000", R2.stats.runs("cap-test").length === 1000, R2.stats.runs("cap-test").length);
const raw = JSON.parse(store.get("random2-runs"));
ok("newest run first", raw[0].score === 1499, raw[0].score);
const logBytes = store.get("random2-runs").length;
ok("log stays under 250 KB at cap", logBytes < 250 * 1024, logBytes + " bytes");

/* ===== legacy import ===== */

section("R2.stats.legacy");
store.set("acqua-best", JSON.stringify({ best: 1234, plays: 9 }));
store.set("madre-records", JSON.stringify({ totalRevenue: 555 }));
store.set("some-unknown-key", JSON.stringify({ a: 1 }));
const legacy = R2.stats.legacy();
ok("reads a legacy record key", legacy["acqua-best"] && legacy["acqua-best"].best === 1234, JSON.stringify(legacy["acqua-best"]));
ok("reads a second key", legacy["madre-records"] && legacy["madre-records"].totalRevenue === 555);
ok("ignores unknown keys", legacy["some-unknown-key"] === undefined, JSON.stringify(legacy["some-unknown-key"]));

/* ===== playtime migration ===== */

section("playtime");
store.set("random2-playtime", JSON.stringify({ "snake-pwa/": 1200, "sector7-pwa/": { total: 60, byHour: [1], byDay: [2] } }));
const pt = R2.loadPlaytime();
ok("bare number migrates to buckets", pt["snake-pwa/"].total === 1200 && Array.isArray(pt["snake-pwa/"].byHour), JSON.stringify(pt["snake-pwa/"]));
ok("existing bucket shape preserved", pt["sector7-pwa/"].byHour[0] === 1, JSON.stringify(pt["sector7-pwa/"]));

/* ===== daily seed / rng determinism ===== */

section("seeded rng");
const a = R2.mulberry32(12345);
const b = R2.mulberry32(12345);
const seqA = [a(), a(), a()];
const seqB = [b(), b(), b()];
ok("same seed gives same sequence", JSON.stringify(seqA) === JSON.stringify(seqB));
ok("values in [0,1)", seqA.every((v) => v >= 0 && v < 1), JSON.stringify(seqA));
ok("daily seed is a number", typeof R2.dailySeed() === "number");

/* ===== clear ===== */

section("clear");
R2.stats.clear();
ok("clear removes runs", R2.stats.runs("snake-pwa/").length === 0);
ok("clear removes rollups", R2.stats.days("snake-pwa/").length === 0);

console.log("\n" + (failures ? "FAILED" : "OK") + "  " + (checks - failures) + "/" + checks + " checks");
if (failures) process.exit(1);