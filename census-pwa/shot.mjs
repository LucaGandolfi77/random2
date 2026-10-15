/*
 * Screenshots of CENSUS for visual review.
 *
 *   node census-pwa/shot.mjs http://localhost:8099
 */
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

import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const chromium = await loadPlaywright();
if (!chromium) { console.log("SKIP  playwright not installed"); process.exit(0); }

const BASE = (process.argv[2] || "http://localhost:8099").replace(/\/$/, "");
mkdirSync(join(here, "shots"), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1240, height: 980 }, deviceScaleFactor: 2 });
await page.goto(BASE + "/census-pwa/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const shot = async (name) => {
    await page.screenshot({ path: join(here, "shots", name + ".png") });
    console.log("  wrote shots/" + name + ".png");
};

await shot("briefing");

/* Start a survey and work through a realistic round on a later level. */
await page.evaluate(() => {
    window.__census.start("sospetto", 20261015);
    window.__census.begin();
});
await page.waitForTimeout(300);

/* Survey four wards, skipping the reluctant one, to show a partial return. */
for (const i of [0, 1, 2, 4]) {
    await page.evaluate((idx) => {
        const g = window.__census;
        const s = g.state();
        window.CensusSim.survey(s, idx, 14);
        g.draw();
    }, i);
}
await page.waitForTimeout(300);
await shot("survey");

await page.evaluate(() => window.CensusSim.publish(window.__census.state()));
await page.evaluate(() => window.__census.draw());
await page.waitForTimeout(300);
await shot("published");

await page.evaluate(() => { window.__census.state().phase = "levels"; window.__census.draw(); });
await page.waitForTimeout(250);
await shot("levels");

await page.click("#help-btn");
await page.waitForTimeout(300);
await shot("help");
await page.keyboard.press("Escape");

const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.goto(BASE + "/census-pwa/", { waitUntil: "networkidle" });
await m.waitForTimeout(500);
await m.evaluate(() => { window.__census.start("quartieri", 7); window.__census.begin(); });
await m.waitForTimeout(300);
await m.screenshot({ path: join(here, "shots", "mobile.png") });
console.log("  wrote shots/mobile.png");

await browser.close();