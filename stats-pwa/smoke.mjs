/*
 * Headless smoke test for stats-pwa.
 *
 *   node stats-pwa/smoke.mjs
 *
 * Serves nothing itself — point it at a running server:
 *   python3 -m http.server 8099
 *   node stats-pwa/smoke.mjs http://localhost:8099
 *
 * Seeds localStorage with a synthetic history, loads the dashboard, and
 * asserts that each canvas actually received drawing commands. A chart
 * that throws, or that draws nothing because its panel was hidden, looks
 * identical to a working one from the outside — this is the check that
 * catches both.
 *
 * Playwright is used from whatever is already on the machine (npx cache or
 * a local install). The script skips itself rather than failing the build
 * when no browser is available, because the repo has no node_modules and
 * this test must never be the reason CI goes red.
 */
/* Playwright is not a dependency of this repo. Resolve it from wherever it
   happens to be installed (a local install, a npx cache, an env hint) and
   skip cleanly when it is nowhere to be found, so this test can never be
   the reason a build goes red. */
const PW_PATHS = [
    process.env.PLAYWRIGHT_PATH,
    "playwright",
    "/tmp/opencode/pwtest/node_modules/playwright/index.js"
].filter(Boolean);

async function loadPlaywright() {
    for (const p of PW_PATHS) {
        try {
            const mod = await import(p);
            return mod.chromium || (mod.default && mod.default.chromium);
        } catch { /* try the next candidate */ }
    }
    return null;
}

const BASE = process.argv[2] || "http://localhost:8099";
const URL_ = BASE.replace(/\/$/, "") + "/stats-pwa/";

let checks = 0, failures = 0;
function ok(label, cond, detail) {
    checks++;
    if (cond) return;
    failures++;
    console.error("  FAIL  " + label + (detail !== undefined ? " -> " + detail : ""));
}
function section(n) { console.log("\n" + n); }

/* A day in the future keeps the fixtures stable over time. */
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const dayAgo = new Date(today.getTime() - 86400000);
const dayPrev = new Date(today.getTime() - 172800000);

const SEED = {
    "random2-runs": [
        { t: dayPrev.getTime(), slug: "snake-pwa/", score: 40, durMs: 61000, wave: 3, outcome: "loss", meta: null },
        { t: dayPrev.getTime() + 60000, slug: "snake-pwa/", score: 77, durMs: 90000, wave: 5, outcome: "loss", meta: null },
        { t: dayAgo.getTime(), slug: "snake-pwa/", score: 55, durMs: 70000, wave: 4, outcome: "win", meta: null },
        { t: today.getTime(), slug: "snake-pwa/", score: 120, durMs: 140000, wave: 7, outcome: "win", meta: null },
        { t: today.getTime() + 1000, slug: "metro-pwa/", score: 12400, durMs: 900000, wave: 1, outcome: "loss", meta: { day: 9, lines: 4 } },
        { t: today.getTime() + 2000, slug: "metro-pwa/", score: 22100, durMs: 1200000, wave: 2, outcome: "win", meta: { day: 12, lines: 5 } }
    ],
    "random2-runs-by-day": {
        [iso(dayPrev)]: { "snake-pwa/": { n: 2, best: 77, sum: 117, sec: 151 } },
        [iso(dayAgo)]: { "snake-pwa/": { n: 1, best: 55, sum: 55, sec: 70 } },
        [iso(today)]: {
            "snake-pwa/": { n: 1, best: 120, sum: 120, sec: 140 },
            "metro-pwa/": { n: 2, best: 22100, sum: 34500, sec: 3500 }
        }
    },
    "random2-events": { "snake-pwa/": { walls: 11 } },
    "random2-playtime": {
        "snake-pwa/": { total: 3600, byHour: [0, 0, 0, 0, 0, 0, 0, 300, 600, 900, 0, 0, 0, 0, 0, 0, 0, 600, 900, 300, 0, 0, 0, 0], byDay: [0, 1200, 900, 600, 0, 900, 0] },
        "metro-pwa/": { total: 7200, byHour: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 600, 900, 1200, 900, 1800, 1800, 0, 0, 0, 0], byDay: [1800, 0, 1200, 1200, 1200, 1800, 0] }
    },
    "random2-last-played": {
        "snake-pwa/": today.getTime(),
        "metro-pwa/": today.getTime() - 3600000
    },
    "acqua-best": { best: 1234, plays: 9 },
    "madre-records": { totalRevenue: 55500 }
};

const chromium = await loadPlaywright();
if (!chromium) {
    console.log("SKIP  playwright not installed — run `npm i playwright` or set PLAYWRIGHT_PATH");
    process.exit(0);
}

let browser;
try {
    browser = await chromium.launch();
} catch (e) {
    console.log("SKIP  no browser available (" + e.message.split("\n")[0] + ")");
    process.exit(0);
}

const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });

const consoleErrors = [];
page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

section("load with seeded data");
/* addInitScript runs on every navigation, including reloads, so the seed is
   gated on a one-shot flag. Without this the empty-state case below can
   never be reached: the reload just re-seeds the store. */
await page.addInitScript((seed) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    for (const [k, v] of Object.entries(seed)) {
        localStorage.setItem(k, JSON.stringify(v));
    }
}, SEED);

await page.goto(URL_, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

ok("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
ok("the shared libraries loaded",
    await page.evaluate(() => !!(window.R2 && window.R2Chart)));
ok("title is set", (await page.title()).includes("Stats"));

section("tiles");
const t = await page.evaluate(() => ({
    runs: document.getElementById("t-runs").textContent,
    time: document.getElementById("t-time").textContent,
    games: document.getElementById("t-games").textContent,
    days: document.getElementById("t-days").textContent,
    best: document.getElementById("t-best").textContent
}));
ok("run count is seeded", t.runs === "6", t.runs);
ok("playtime sums to 3 hours", t.time === "3.0h", t.time);
ok("two games are counted", t.games === "2", t.games);
ok("three active days", t.days === "3", t.days);
ok("top score is the metro record", t.best === "22,100", t.best);

section("canvases receive drawing commands");
async function drawn(id) {
    return page.evaluate((cid) => {
        const c = document.getElementById(cid);
        if (!c) return { missing: true };
        const ctx = c.getContext("2d");
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let lit = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 8) lit++;
        return { w: c.width, h: c.height, lit };
    }, id);
}
for (const id of ["c-runsday", "c-timeday", "c-hist", "c-best", "c-outcome"]) {
    const r = await drawn(id);
    ok(id + " has a size", !r.missing && r.w > 0 && r.h > 0, JSON.stringify(r));
    ok(id + " has ink on it", r.lit > 200, JSON.stringify(r));
}

section("tabs switch panels and draw");
for (const tab of ["p-runs", "p-time", "p-library", "p-records", "p-data"]) {
    await page.click(`.tab[data-panel="${tab}"]`);
    await page.waitForTimeout(320);
    ok(tab + " becomes visible", await page.isVisible("#" + tab));
}
for (const id of ["c-heat", "c-hour", "c-day", "c-share", "c-g-hist", "c-g-outcome"]) {
    await page.evaluate((cid) => {
        document.querySelectorAll(".panel").forEach((p) => p.classList.add("on"));
        document.getElementById(cid).scrollIntoView();
    }, id);
    await page.waitForTimeout(120);
    const r = await drawn(id);
    ok(id + " has ink once visible", r.lit > 100, JSON.stringify(r));
}

section("tables");
const libRows = await page.evaluate(() =>
    document.querySelectorAll("#t-lib tbody tr").length);
ok("library lists both games", libRows === 2, libRows);
const runRows = await page.evaluate(() =>
    document.querySelectorAll("#t-runs-table tbody tr").length);
ok("run table shows runs for the selected game", runRows === 2, runRows);
const selected = await page.evaluate(() =>
    document.getElementById("run-game").value);
ok("first game is selected by default", selected === "metro-pwa/", selected);
await page.selectOption("#run-game", "snake-pwa/");
await page.waitForTimeout(300);
const snakeRows = await page.evaluate(() =>
    document.querySelectorAll("#t-runs-table tbody tr").length);
ok("switching game reloads the table", snakeRows === 4, snakeRows);
const legacyRows = await page.evaluate(() =>
    document.querySelectorAll("#t-legacy tbody tr").length);
ok("legacy table reads both save keys", legacyRows === 2, legacyRows);

section("theme");
// The page follows the OS preference until the user toggles it, so start
// from whatever the browser reported and assert that a click flips it.
const themeBefore = await page.getAttribute("html", "data-theme");
await page.click("#theme-btn");
await page.waitForTimeout(300);
const themeAfter = await page.getAttribute("html", "data-theme");
ok("a click flips the theme", themeAfter !== themeBefore,
    themeBefore + " -> " + themeAfter);
const afterTheme = await drawn("c-hist");
ok("charts redraw after a theme change", afterTheme.lit > 200, JSON.stringify(afterTheme));
ok("the choice persists across a reload", await page.evaluate(() =>
    localStorage.getItem("random2-stats-theme") !== null));

section("empty state");
/* The seed is one-shot, so clearing the keys here survives the reload. */
await page.evaluate(() => {
    ["random2-runs", "random2-runs-by-day", "random2-events",
        "random2-playtime", "random2-last-played", "random2-stats-theme",
        "acqua-best", "madre-records"]
        .forEach((k) => localStorage.removeItem(k));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
ok("no errors with an empty store", consoleErrors.length === 0,
    consoleErrors.slice(0, 2).join(" | "));
const e = await page.evaluate(() => ({
    runs: document.getElementById("t-runs").textContent,
    games: document.getElementById("t-games").textContent
}));
ok("zero runs shown", e.runs === "0", e.runs);
ok("zero games shown", e.games === "0", e.games);
const emptyMsg = await page.textContent("#n-hist");
ok("a chart explains what it needs", emptyMsg.length > 0, emptyMsg);
const emptyCanvas = await drawn("c-hist");
ok("an empty chart draws its placeholder", emptyCanvas.lit > 20,
    JSON.stringify(emptyCanvas));

section("narrow viewport");
await page.setViewportSize({ width: 380, height: 800 });
await page.waitForTimeout(400);
const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok("no horizontal overflow at 380px", overflow <= 2, overflow);
await page.screenshot({ path: "stats-pwa/smoke-mobile.png", fullPage: false });

await page.setViewportSize({ width: 1200, height: 1000 });
await page.waitForTimeout(300);
await page.screenshot({ path: "stats-pwa/smoke-desktop.png", fullPage: false });

await browser.close();
console.log("\n" + (failures ? "FAILED" : "OK") + `  ${checks - failures}/${checks} checks`);
process.exit(failures ? 1 : 0);