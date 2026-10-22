/*
 * GULPER in-browser smoke test.
 *
 * Drives the real game in a real browser: opens the page, picks a level,
 * hunts, and asserts on what the screen actually shows. The node suites
 * prove the simulation is correct; this proves the simulation is
 * connected to a canvas.
 *
 * Skips cleanly when Playwright is not installed, so it is safe to wire
 * into a checkout that does not have it.
 *
 *   python3 -m http.server 8099
 *   node gulper-pwa/smoke.mjs http://localhost:8099/gulper-pwa/
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

let chromium = null;
const candidates = [
    join(here, "..", "bucio", "node_modules", "playwright"),
    join(here, "..", "bucio", "node_modules", "playwright-core"),
    "playwright",
    "playwright-core"
];

/* A checkout that has used npx keeps the browser driver in the npx cache
 * rather than in the project, so look there too. */
try {
    const npx = join(homedir(), ".npm", "_npx");
    if (existsSync(npx)) {
        for (const dir of readdirSync(npx)) {
            candidates.push(join(npx, dir, "node_modules", "playwright-core"));
            candidates.push(join(npx, dir, "node_modules", "playwright"));
        }
    }
} catch { /* the cache is optional */ }

for (const spec of candidates) {
    try { chromium = require(spec).chromium; break; } catch { /* try the next */ }
}

/* A browser to drive. Playwright normally installs its own; a machine
 * that already has a Chrome from another tool will do just as well. */
function findChrome() {
    const roots = [
        join(homedir(), ".cache", "puppeteer", "chrome"),
        join(homedir(), ".cache", "ms-playwright")
    ];
    for (const root of roots) {
        if (!existsSync(root)) continue;
        const stack = [root];
        while (stack.length) {
            const dir = stack.pop();
            let names;
            try { names = readdirSync(dir); } catch { continue; }
            for (const name of names) {
                const full = join(dir, name);
                let stat;
                try { stat = statSync(full); } catch { continue; }
                if (stat.isDirectory()) {
                    if (name === "chrome-linux64" || name.startsWith("chromium")) stack.push(full);
                    continue;
                }
                if (name === "chrome" || name === "headless_shell" || name === "chrome-headless-shell") {
                    return full;
                }
            }
        }
    }
    return null;
}

const url = process.argv[2] || "http://localhost:8099/gulper-pwa/";

if (!chromium) {
    console.log("SMOKE SKIPPED — playwright is not available.");
    console.log("  npm i playwright && npx playwright install chromium");
    console.log("  then: python3 -m http.server 8099");
    console.log("        node gulper-pwa/smoke.mjs http://localhost:8099/gulper-pwa/");
    process.exit(0);
}

let checks = 0, failures = 0;
const ok = (cond, label, extra) => {
    checks++;
    if (cond) {
        console.log("  ok   " + label);
    } else {
        failures++;
        console.log("  FAIL " + label + (extra === undefined ? "" : "  (" + extra + ")"));
    }
};

const launchOptions = { args: ["--no-sandbox", "--disable-gpu"] };
const chrome = findChrome();
if (chrome) launchOptions.executablePath = chrome;

const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({ viewport: { width: 420, height: 860 } });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(600);

/* ---------- the title ---------- */

ok(await page.isVisible("#screen-title"), "the title screen is shown");
ok(!(await page.isVisible("#hud")), "the HUD is hidden in the menus");
ok(await page.evaluate(() => !!window.GU && !!window.GU.World), "the game loaded");

/* The canvas must have drawn something. */
const titlePixels = await page.evaluate(() => {
    const c = document.getElementById("game-canvas");
    const g = c.getContext("2d");
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
    return { lit: lit, w: c.width, h: c.height };
});
ok(titlePixels.lit > 100, "the attract scene is drawn", titlePixels.lit + " lit pixels");
ok(titlePixels.w >= 176, "the pixel buffer has a sane width", titlePixels.w);

/* ---------- into a level ---------- */

await page.click("#btn-play");
await page.waitForTimeout(300);
ok(await page.isVisible("#screen-map"), "the campaign map opened");
const levelButtons = await page.$$(".level-btn:not(.locked)");
ok(levelButtons.length > 0, "there is a level to play");
await levelButtons[0].click();
await page.waitForTimeout(300);
ok(await page.isVisible("#screen-intro"), "the level intro opened");

/* Pick an adaptation if there is one, then hunt. */
const adapt = await page.$(".adapt-card");
if (adapt) await adapt.click();
else await page.click("#btn-intro-go");
await page.waitForTimeout(700);

ok(await page.isVisible("#hud"), "the HUD is shown while playing");
ok(!(await page.isVisible("#screen-intro")), "the intro closed");

/* ---------- play ---------- */

/* Drive it: move, aim, attack. */
const canvas = await page.$("#game-canvas");
const box = await canvas.boundingBox();
await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.4);
await page.mouse.down();
await page.waitForTimeout(120);
await page.mouse.up();
await page.keyboard.down("d");
await page.waitForTimeout(600);
await page.keyboard.up("d");
await page.keyboard.press("Space");
await page.waitForTimeout(400);

/* The objective has to move, or the game is not running. */
const state = await page.evaluate(() => {
    const w = window.GU.Main.world();
    return {
        mode: window.GU.Main.mode(),
        status: w.status,
        time: w.time,
        entities: w.entities.length,
        playerX: w.player.x,
        playerY: w.player.y
    };
});
ok(state.mode === "playing", "the game is in play", state.mode);
ok(state.time > 0.5, "the clock is running", state.time.toFixed(2) + "s");
ok(state.entities > 5, "the level has people in it", state.entities);
ok(Math.abs(state.playerX) > 0 && Math.abs(state.playerY) > 0, "the player has a position");

/* The world really moved. */
const moved = await page.evaluate(() => {
    const w = window.GU.Main.world();
    return w.time > 0;
});
ok(moved, "the simulation advanced");

/* ---------- the pixels ---------- */

const playPixels = await page.evaluate(() => {
    const c = document.getElementById("game-canvas");
    const g = c.getContext("2d");
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let lit = 0, colours = new Set();
    for (let i = 0; i < d.length; i += 4) {
        if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
        colours.add((d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4));
    }
    return { lit: lit, colours: colours.size };
});
ok(playPixels.lit > 200, "the battle is drawn", playPixels.lit + " lit pixels");
ok(playPixels.colours > 8, "the scene uses a range of colours", playPixels.colours);

/* ---------- no errors ---------- */

ok(errors.length === 0, "the page raised no errors", errors.slice(0, 3).join(" | "));

/* ---------- screenshots ---------- */

await page.screenshot({ path: join(here, "shots", "title.png") });
await page.screenshot({ path: join(here, "shots", "play.png") });

await browser.close();

console.log("\n  " + (checks - failures) + "/" + checks + " checks passed");
if (failures) {
    console.log("  SMOKE FAILED");
    process.exit(1);
}
console.log("  SMOKE OK");
