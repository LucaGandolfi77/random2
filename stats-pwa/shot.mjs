/*
 * Screenshot the dashboard with a seeded history, for visual review.
 *
 *   node stats-pwa/shot.mjs http://localhost:8099
 *
 * Writes stats-pwa/shot-<tab>.png for each panel plus a light-mode shot.
 * Kept separate from smoke.mjs so the test suite does not depend on
 * writing image files.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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
        } catch { /* next */ }
    }
    return null;
}

const chromium = await loadPlaywright();
if (!chromium) {
    console.log("SKIP  playwright not installed");
    process.exit(0);
}

const here = dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] || "http://localhost:8099").replace(/\/$/, "");
const URL_ = BASE + "/stats-pwa/";

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const D = (n) => new Date(today.getTime() - n * 86400000);

const SEED = {
    "random2-runs": [
        { t: D(6).getTime(), slug: "snake-pwa/", score: 38, durMs: 61000, wave: 3, outcome: "loss", meta: null },
        { t: D(6).getTime() + 90000, slug: "snake-pwa/", score: 61, durMs: 74000, wave: 4, outcome: "loss", meta: null },
        { t: D(5).getTime(), slug: "snake-pwa/", score: 44, durMs: 58000, wave: 3, outcome: "loss", meta: null },
        { t: D(4).getTime(), slug: "sector7-pwa/", score: 8600, durMs: 420000, wave: 4, outcome: "win", meta: { faction: "raider" } },
        { t: D(4).getTime() + 120000, slug: "sector7-pwa/", score: 12400, durMs: 510000, wave: 5, outcome: "win", meta: { faction: "pirate" } },
        { t: D(3).getTime(), slug: "snake-pwa/", score: 88, durMs: 91000, wave: 5, outcome: "win", meta: null },
        { t: D(3).getTime() + 60000, slug: "metro-pwa/", score: 9800, durMs: 780000, wave: 1, outcome: "loss", meta: { day: 8, lines: 4 } },
        { t: D(2).getTime(), slug: "viti-pwa/", score: 287, durMs: 96000, wave: 6, outcome: "win", meta: { stars: 3, ops: 9, par: 11 } },
        { t: D(2).getTime() + 40000, slug: "viti-pwa/", score: 264, durMs: 88000, wave: 6, outcome: "win", meta: { stars: 2, ops: 12, par: 11 } },
        { t: D(2).getTime() + 80000, slug: "viti-pwa/", score: 0, durMs: 40000, wave: 7, outcome: "loss", meta: { ops: 30, par: 9 } },
        { t: D(1).getTime(), slug: "metro-pwa/", score: 18700, durMs: 1050000, wave: 2, outcome: "win", meta: { day: 14, lines: 6 } },
        { t: today.getTime(), slug: "snake-pwa/", score: 112, durMs: 122000, wave: 6, outcome: "win", meta: null },
        { t: today.getTime() + 1000, slug: "metro-pwa/", score: 24100, durMs: 1320000, wave: 3, outcome: "win", meta: { day: 19, lines: 6 } },
        { t: today.getTime() + 2000, slug: "sector7-pwa/", score: 15200, durMs: 640000, wave: 6, outcome: "win", meta: { faction: "cruiser" } },
        { t: today.getTime() + 3000, slug: "king-shot-pwa/", score: 95, durMs: 84000, wave: 4, outcome: "loss", meta: null }
    ],
    "random2-runs-by-day": {
        [iso(D(6))]: { "snake-pwa/": { n: 2, best: 61, sum: 99, sec: 135 } },
        [iso(D(5))]: { "snake-pwa/": { n: 1, best: 44, sum: 44, sec: 58 } },
        [iso(D(4))]: { "sector7-pwa/": { n: 2, best: 12400, sum: 21000, sec: 930 } },
        [iso(D(3))]: { "snake-pwa/": { n: 1, best: 88, sum: 88, sec: 91 },
                        "metro-pwa/": { n: 1, best: 9800, sum: 9800, sec: 780 } },
        [iso(D(2))]: { "viti-pwa/": { n: 3, best: 287, sum: 551, sec: 224 } },
        [iso(D(1))]: { "metro-pwa/": { n: 1, best: 18700, sum: 18700, sec: 1050 } },
        [iso(today)]: { "snake-pwa/": { n: 1, best: 112, sum: 112, sec: 122 },
                        "metro-pwa/": { n: 1, best: 24100, sum: 24100, sec: 1320 },
                        "sector7-pwa/": { n: 1, best: 15200, sum: 15200, sec: 640 },
                        "king-shot-pwa/": { n: 1, best: 95, sum: 95, sec: 84 } }
    },
    "random2-events": { "snake-pwa/": { walls: 23 }, "sector7-pwa/": { destroyed: 61 } },
    "random2-playtime": {
        "snake-pwa/": {
            total: 4200,
            byHour: [0, 0, 0, 0, 0, 0, 0, 180, 420, 600, 300, 0, 0, 0, 0, 0, 60, 480, 720, 540, 600, 300, 0, 0],
            byDay: [600, 900, 600, 420, 0, 780, 900]
        },
        "metro-pwa/": {
            total: 9600,
            byHour: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 300, 900, 1200, 1500, 2100, 1800, 1200, 600, 0, 0],
            byDay: [1200, 0, 1800, 1800, 1800, 2400, 600]
        },
        "sector7-pwa/": {
            total: 5400,
            byHour: [0, 0, 0, 0, 0, 0, 0, 0, 120, 360, 600, 420, 0, 0, 0, 0, 180, 600, 900, 720, 540, 540, 360, 60],
            byDay: [1800, 900, 900, 900, 0, 900, 0]
        },
        "viti-pwa/": {
            total: 2400,
            byHour: [0, 0, 0, 0, 0, 0, 0, 120, 300, 240, 0, 0, 180, 300, 0, 0, 0, 240, 360, 0, 0, 0, 0, 0],
            byDay: [0, 420, 360, 300, 0, 420, 900]
        }
    },
    "random2-last-played": {
        "snake-pwa/": today.getTime(),
        "metro-pwa/": today.getTime() - 900000,
        "sector7-pwa/": today.getTime() - 2400000,
        "viti-pwa/": D(2).getTime()
    },
    "acqua-best": { best: 8420, plays: 17 },
    "madre-records": { totalRevenue: 128400, batches: 63 },
    "metro-best": 24100
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1240, height: 1100 }, deviceScaleFactor: 2 });

await page.addInitScript((seed) => {
    if (sessionStorage.getItem("shot-seeded")) return;
    sessionStorage.setItem("shot-seeded", "1");
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
}, SEED);

await page.goto(URL_, { waitUntil: "networkidle" });
await page.waitForTimeout(700);

mkdirSync(join(here, "shots"), { recursive: true });

for (const tab of ["p-overview", "p-runs", "p-time", "p-library", "p-data"]) {
    await page.click(`.tab[data-panel="${tab}"]`);
    /* Pick the game with the most runs, so the Runs panel shows real
       charts rather than a single-run placeholder. */
    if (tab === "p-runs") {
        await page.selectOption("#run-game", "sector7-pwa/");
    }
    await page.waitForTimeout(450);
    const name = tab.replace("p-", "");
    await page.screenshot({ path: join(here, "shots", `${name}.png`), fullPage: false });
    console.log("  wrote shots/" + name + ".png");
}

/* light mode, on the overview */
await page.click('.tab[data-panel="p-overview"]');
await page.waitForTimeout(250);
const isLight = (await page.getAttribute("html", "data-theme")) === "light";
if (isLight) await page.click("#theme-btn");
else { await page.click("#theme-btn"); await page.waitForTimeout(200); await page.click("#theme-btn"); }
await page.waitForTimeout(500);
await page.screenshot({ path: join(here, "shots", "overview-light.png"), fullPage: false });
console.log("  wrote shots/overview-light.png");

/* mobile */
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.addInitScript((seed) => {
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
}, SEED);
await m.goto(URL_, { waitUntil: "networkidle" });
await m.waitForTimeout(700);
await m.screenshot({ path: join(here, "shots", "mobile.png"), fullPage: false });
console.log("  wrote shots/mobile.png");

await browser.close();