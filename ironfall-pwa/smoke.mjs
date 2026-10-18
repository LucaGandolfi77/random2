/*
 * IRONFALL in-browser smoke test.
 *
 * Drives the real game in a real browser: opens the page, deploys, plays a
 * match with synthetic touch input, and asserts on what the screen actually
 * shows. The node suites prove the simulation is correct; this proves the
 * simulation is connected to a canvas.
 *
 * Skips cleanly when Playwright is not installed, so it is safe to wire into
 * a checkout that does not have it.
 *
 *   node ironfall-pwa/smoke.mjs http://localhost:8099/ironfall-pwa/
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

let chromium = null;
for (const spec of [join(here, "..", "bucio", "node_modules", "playwright"),
                    join(here, "..", "bucio", "node_modules", "playwright-core"),
                    "playwright"]) {
    try { chromium = require(spec).chromium; break; } catch { /* try the next */ }
}

const url = process.argv[2] || "http://localhost:8099/ironfall-pwa/";

if (!chromium) {
    console.log("SMOKE SKIPPED — playwright is not available.");
    console.log("  npm i playwright && npx playwright install chromium");
    console.log("  then: python3 -m http.server 8099");
    console.log("        node ironfall-pwa/smoke.mjs http://localhost:8099/ironfall-pwa/");
    process.exit(0);
}

let checks = 0, failures = 0;
const ok = (cond, label, extra) => {
    checks++;
    if (cond) console.log("  PASS  " + label);
    else { failures++; console.log("  FAIL  " + label + (extra !== undefined ? "  ->  " + extra : "")); }
};

const browser = await chromium.launch();
const page = await browser.newPage({
    viewport: { width: 390, height: 844 },      // iPhone 14-ish
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true
});

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

console.log("IRONFALL smoke — " + url);
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

/* ---- boot ---- */
ok(await page.title() !== "", "the page has a title", await page.title());
ok(await page.locator("#screen-menu.is-on").count() === 1, "the menu is showing");
ok(await page.locator("#game-canvas").count() === 1, "the canvas exists");
ok(errors.length === 0, "no page errors on boot", errors.join(" | "));

const canvasBox = await page.locator("#game-canvas").boundingBox();
ok(canvasBox && canvasBox.width > 300 && canvasBox.height > 600,
    "the canvas fills the viewport",
    canvasBox ? canvasBox.width + "x" + canvasBox.height : "none");

/* The menu is dark by design, so the launcher icon being dark too is fine -
   but the canvas must not be blank, or nothing was ever drawn. */
const notBlank = await page.evaluate(() => {
    const c = document.getElementById("game-canvas");
    const ctx = c.getContext("2d");
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 997) {
        seen.add(d[i] + "," + d[i + 1] + "," + d[i + 2]);
    }
    return seen.size;
});
ok(notBlank > 1, "the canvas is being painted", notBlank + " distinct sampled colours");

/* ---- champion select ---- */
await page.locator("#btn-play").click();
await page.waitForTimeout(500);
ok(errors.length === 0, "no page errors entering the match", errors.join(" | "));
ok(await page.locator("#hud.is-on").count() === 1, "the HUD is up");
ok(await page.locator(".pad").count() === 4, "four ability pads are on screen");

/* ---- the canvas is alive ---- */
const before = await page.evaluate(() => window.IF && window.IF.Main.world ? window.IF.Main.world.time : -1);
await page.waitForTimeout(2500);
const after = await page.evaluate(() => window.IF && window.IF.Main.world ? window.IF.Main.world.time : -1);
ok(after > before, "the match clock is running", before + " -> " + after);
ok(errors.length === 0, "no page errors while playing", errors.join(" | "));

/* ---- synthetic touch: the left half drives the stick ---- */
const cx = canvasBox.x, cy = canvasBox.y;
const H = canvasBox.height;

/* Move: press and drag in the lower-left quadrant, then check the world
   position actually changed. */
const posBefore = await page.evaluate(() => {
    const w = window.IF.Main.world;
    return { x: w.player.x, y: w.player.y };
});
await page.mouse.move(cx + 90, cy + H - 200);
await page.mouse.down();
await page.mouse.move(cx + 150, cy + H - 260, { steps: 8 });
await page.waitForTimeout(1600);
/* Checked BEFORE the release: the stick is hidden on pointerup, so asserting
 * after the mouse comes up tests nothing. */
const stickShown = await page.locator("#stick.is-on").count();
const stickAt = await page.evaluate(() => {
    const el = document.getElementById("stick");
    return { left: el.style.left, top: el.style.top };
});
const posAfter = await page.evaluate(() => {
    const w = window.IF.Main.world;
    return { x: w.player.x, y: w.player.y };
});
await page.mouse.up();
const moved = Math.hypot(posAfter.x - posBefore.x, posAfter.y - posBefore.y);
ok(moved > 60, "the stick moves the champion", moved.toFixed(0) + " world units");
ok(stickShown === 1, "the floating stick appears where the thumb went");
ok(parseFloat(stickAt.left) > 40 && parseFloat(stickAt.left) < 160 &&
    parseFloat(stickAt.top) > 500,
    "the stick is anchored under the thumb, not in a fixed corner",
    stickAt.left + "," + stickAt.top);

/* ---- an ability actually casts ---- */
const cdBefore = await page.evaluate(() => {
    const p = window.IF.Main.world.player;
    return p.abilities.map(a => a.cdLeft);
});
const manaBefore = await page.evaluate(() => window.IF.Main.world.player.mana);
/* W is the only ability every champion has unlocked at level 1 alongside Q. */
await page.locator('.pad[data-slot="0"]').dispatchEvent("pointerdown");
await page.waitForTimeout(500);
await page.locator('.pad[data-slot="0"]').dispatchEvent("pointerup");
await page.waitForTimeout(700);
const afterCast = await page.evaluate(() => {
    const p = window.IF.Main.world.world === undefined ? null : null;
    const w = window.IF.Main.world;
    return { cd: w.player.abilities.map(a => a.cdLeft), mana: w.player.mana,
             fx: w.fx.length, effects: w.effects.length };
});
ok(afterCast.cd[0] > cdBefore[0] || afterCast.mana < manaBefore,
    "tapping Q spends mana or starts a cooldown",
    JSON.stringify({ cd: afterCast.cd[0], mana: Math.round(afterCast.mana) }));

/* ---- let the match run and confirm it is still healthy ---- */
await page.waitForTimeout(9000);
const state = await page.evaluate(() => {
    const w = window.IF.Main.world;
    return {
        time: w.time,
        over: w.over,
        units: w.units.length,
        minions: w.units.filter(u => u.kind === "minion").length,
        cs: w.player.cs,
        gold: Math.round(w.player.gold),
        level: w.player.level,
        allFinite: w.champs.every(c =>
            isFinite(c.x) && isFinite(c.y) && isFinite(c.hp) && isFinite(c.mana) && isFinite(c.gold))
    };
});
ok(state.allFinite, "no champion state went non-finite");
ok(state.units < 300, "the unit count stays inside budget", state.units);
ok(state.minions > 0, "waves have spawned", state.minions);
ok(state.time > 8, "the match has been running", state.time.toFixed(1) + "s");
ok(state.gold > 0 || state.cs > 0, "the champion has earned something",
    state.cs + " cs, " + state.gold + " gold");
ok(errors.length === 0, "no page errors over a full run", errors.join(" | "));

/* ---- frame rate ----
 *
 * The README claims 60fps on a phone and the node suites cannot measure it.
 * Measured here over a real second of real frames with real rendering, in a
 * headless browser, which is a floor rather than a ceiling: it proves nothing
 * is accidentally quadratic, and the node suite's O(n) grid work is what
 * makes the number on real hardware match the one here. */
const fps = await page.evaluate(async () => {
    return await new Promise((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        function tick() {
            frames++;
            if (performance.now() - t0 < 1500) requestAnimationFrame(tick);
            else resolve(Math.round(frames / ((performance.now() - t0) / 1000)));
        }
        requestAnimationFrame(tick);
    });
});
ok(fps >= 30, "the frame loop sustains at least 30fps in a headless browser", fps + "fps");

/* ---- the minimap is painting ---- */
const mmNonBlank = await page.evaluate(() => {
    const c = document.getElementById("minimap");
    const ctx = c.getContext("2d");
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 331) seen.add(d[i] + "," + d[i + 1] + "," + d[i + 2]);
    return seen.size;
});
ok(mmNonBlank > 3, "the minimap is painting", mmNonBlank + " distinct sampled colours");

/* ---- pause ---- */
await page.locator("#btn-pause").click();
await page.waitForTimeout(150);
const tPaused = await page.evaluate(() => window.IF.Main.world.time);
await page.waitForTimeout(900);
const tStillPaused = await page.evaluate(() => window.IF.Main.world.time);
ok(Math.abs(tStillPaused - tPaused) < 0.01, "pause stops the simulation",
    tPaused.toFixed(2) + " vs " + tStillPaused.toFixed(2));
await page.locator("#btn-resume").click();
await page.waitForTimeout(600);
const tResumed = await page.evaluate(() => window.IF.Main.world.time);
ok(tResumed > tPaused + 0.3, "resume restarts the simulation", tResumed.toFixed(2));

/* ---- the service worker registered, which is the offline promise ---- */
const swState = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return "unsupported";
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length ? regs[0].scope : "none";
});
ok(swState !== "none" && swState !== "unsupported",
    "a service worker is registered", String(swState));

/* ---- screenshots, for a human to look at ---- */
const shotDir = join(here, "shots");
try {
    const { mkdirSync } = require("node:fs");
    mkdirSync(shotDir, { recursive: true });
    await page.screenshot({ path: join(shotDir, "match-portrait.png") });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(shotDir, "match-landscape.png") });
    console.log("  screenshots -> shots/match-portrait.png, shots/match-landscape.png");
} catch (e) {
    console.log("  (screenshots skipped: " + e.message + ")");
}

await browser.close();

console.log("\n" + "=".repeat(58));
if (failures === 0) {
    console.log("IRONFALL smoke: ALL " + checks + " CHECKS PASSED");
    process.exit(0);
}
console.log("IRONFALL smoke: " + failures + " of " + checks + " CHECKS FAILED");
process.exit(1);
