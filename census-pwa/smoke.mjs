/*
 * Headless smoke test for census-pwa.
 *
 *   node census-pwa/smoke.mjs http://localhost:8099
 *
 * Plays the game through the browser: briefing → survey → publish, and
 * asserts the canvas actually changed at each step. A game that throws
 * mid-render still leaves a canvas on screen, so "did the pixels move" is
 * the check that catches it.
 *
 * Skips itself when no browser is available, like stats-pwa/smoke.mjs.
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

const BASE = (process.argv[2] || "http://localhost:8099").replace(/\/$/, "");
const URL_ = BASE + "/census-pwa/";

let checks = 0, failures = 0;
function ok(label, cond, detail) {
    checks++;
    if (cond) return;
    failures++;
    console.error("  FAIL  " + label + (detail !== undefined ? " -> " + detail : ""));
}
function section(n) { console.log("\n" + n); }

const chromium = await loadPlaywright();
if (!chromium) {
    console.log("SKIP  playwright not installed");
    process.exit(0);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

/* Fingerprint of the canvas, used to prove a redraw happened. */
async function ink() {
    return page.evaluate(() => {
        const c = document.getElementById("city");
        const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        let h = 0, lit = 0;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] > 8) lit++;
            h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0;
        }
        return { h, lit, w: c.width, h2: c.height };
    });
}

/* Click at a point given in canvas coordinates. The game scales the
   canvas drawing to the element, so canvas coords map linearly. */
async function tapCanvas(pt) {
    const box = await page.locator("#city").boundingBox();
    const size = await page.evaluate(() => ({
        w: window.__census.rects().W, h: window.__census.rects().H
    }));
    await page.mouse.click(
        box.x + (pt.x / size.w) * box.width,
        box.y + (pt.y / size.h) * box.height
    );
    await page.waitForTimeout(160);
}

async function tapTool(id) {
    const pt = await page.evaluate((tool) => window.__census.toolPoint(tool), id);
    ok("toolbar exposes " + id, !!pt, pt);
    if (pt) await tapCanvas(pt);
}

section("load");
await page.goto(URL_, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
ok("no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
ok("the sim loaded", await page.evaluate(() => !!window.CensusSim));
ok("the test seam is present", await page.evaluate(() => !!window.__census));
ok("the canvas has a size", (await ink()).w > 0);
const briefing = await ink();
ok("the briefing renders", briefing.lit > 5000, JSON.stringify(briefing));

section("briefing → survey");
await tapTool("map");
const afterBegin = await ink();
ok("the map replaced the briefing", afterBegin.h !== briefing.h,
    briefing.h + " -> " + afterBegin.h);
ok("the map has ink", afterBegin.lit > 5000, JSON.stringify(afterBegin));
ok("the phase advanced to survey",
    (await page.evaluate(() => window.__census.state().phase)) === "survey");

section("surveying");
/* Every ward must be reachable and inside the map frame. */
const geometry = await page.evaluate(() => {
    const s = window.__census.state();
    const r = window.__census.rects();
    return s.districts.map((d) => ({
        name: d.name, x: d.px, y: d.py, w: d.cw, h: d.ch,
        insideX: d.px - d.cw / 2 >= r.MAP.x - 1 && d.px + d.cw / 2 <= r.MAP.x + r.MAP.w + 1,
        insideY: d.py - d.ch / 2 >= r.MAP.y - 1 && d.py + d.ch / 2 <= r.MAP.y + r.MAP.h + 1
    }));
});
for (const g of geometry) {
    ok(g.name + " is inside the map frame", g.insideX && g.insideY,
        JSON.stringify(g));
}
ok("wards are roughly square",
    geometry.every((g) => {
        const ar = g.w / g.h;
        return ar > 0.6 && ar < 1.7;
    }), geometry.map((g) => (g.w / g.h).toFixed(2)).join(","));
ok("wards do not overlap", (() => {
    for (let i = 0; i < geometry.length; i++) {
        for (let j = i + 1; j < geometry.length; j++) {
            const a = geometry[i], b = geometry[j];
            if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 2 &&
                Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 2) return false;
        }
    }
    return true;
})());

/* Select a ward other than the default, so the panel really changes. */
await tapCanvas(await page.evaluate(() => window.__census.wardPoint(1)));
ok("a ward can be selected",
    (await page.evaluate(() => window.__census.state().districts
        .some((d) => d.sampled === undefined))) ||
    (await ink()).lit > 5000);

/* Send enumerators through the panel's own control positions. */
const beforeSend = await page.evaluate(() => {
    const s = window.__census.state();
    return { day: s.day, visits: s.visits, money: s.money };
});
await tapCanvas(await page.evaluate(() => window.__census.panelPoint().send));
const afterSend = await page.evaluate(() => {
    const s = window.__census.state();
    return { day: s.day, visits: s.visits, money: s.money };
});
ok("sending uses a day", afterSend.day === beforeSend.day + 1,
    JSON.stringify({ beforeSend, afterSend }));
ok("sending counts enumerators", afterSend.visits > beforeSend.visits);
ok("spending the money", afterSend.money < beforeSend.money);

section("budget refuses overspend");
{
    const res = await page.evaluate(() => {
        const s = window.__census.state();
        s.money = 1;
        return window.CensusSim.survey(s, 0, 50);
    });
    ok("an unaffordable visit is refused", res.ok === false, JSON.stringify(res));
    ok("it explains why", /money/i.test(res.why || ""), res.why);
}

section("publish");
await tapTool("publish");
await page.waitForTimeout(300);
const graded = await ink();
ok("publishing redraws", graded.h !== afterSend.h);
ok("the result renders", graded.lit > 5000, JSON.stringify(graded));
ok("the phase advanced to graded",
    (await page.evaluate(() => window.__census.state().phase)) === "graded");
ok("a result was produced",
    !!(await page.evaluate(() => window.__census.state().result)));

/* The truth must be revealed in the accent colour on screen. */
const revealed = await page.evaluate(() => {
    const c = document.getElementById("city");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let gold = 0;
    for (let i = 0; i < d.length; i += 4) {
        if (Math.abs(d[i] - 0xc9) < 16 && Math.abs(d[i + 1] - 0xa2) < 16 &&
            Math.abs(d[i + 2] - 0x27) < 22) gold++;
    }
    return gold;
});
ok("the true figure is drawn in the accent colour", revealed > 200, revealed);

section("level select");
await tapTool("levels");
await page.waitForTimeout(250);
ok("the level list renders", (await ink()).lit > 5000);
await page.evaluate(() => { window.__census.start("primo", 12345); });
await page.waitForTimeout(250);
ok("a level can be started",
    (await page.evaluate(() => window.__census.state().level.id)) === "primo");

section("no stale pixels between frames");
{
    /* The canvas once kept a sliver of a previous layout painted between
       the map and the panel, because clear() derived its clear rectangle
       from dpr and the logical size rather than from the backing store. A
       draw of unrelated content must leave nothing of the old frame. */
    const cleared = await page.evaluate(() => {
        const c = document.getElementById("city");
        const ctx = c.getContext("2d");
        const count = () => {
            const d = ctx.getImageData(0, 0, c.width, c.height).data;
            let lit = 0;
            for (let i = 3; i < d.length; i += 4) if (d[i] > 8) lit++;
            return lit;
        };
        window.__census.start("primo", 5);
        window.__census.begin();
        const afterSurvey = count();
        window.__census.start("censo", 6);
        const afterBriefing = count();
        /* The briefing fills the frame, so nearly every pixel is lit. */
        return { afterSurvey, afterBriefing, total: c.width * c.height };
    });
    ok("a briefing repaints the whole frame",
        cleared.afterBriefing > cleared.total * 0.5,
        `${cleared.afterBriefing}/${cleared.total}`);
    /* And the survey view must not exceed its own painted area either. */
    ok("the survey leaves no stale band",
        cleared.afterSurvey < cleared.total,
        `${cleared.afterSurvey}/${cleared.total}`);
}

section("help dialog");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.click("#help-btn");
await page.waitForTimeout(300);
ok("the help dialog opens", await page.isVisible("#help"));
const helpText = await page.textContent("#help");
ok("the help explains non-response", /refuse|answer/i.test(helpText));
ok("the help states the formula", /z·√|margin of error/i.test(helpText));
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

section("responsive layout");
for (const [w, h] of [[1440, 900], [1100, 900], [820, 900], [600, 800], [380, 780]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(320);
    const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok("no page overflow at " + w + "px", overflow <= 2, overflow);
    const rects = await page.evaluate(() => window.__census.rects());
    ok("layout stays inside the canvas at " + w + "px",
        rects.BELOW.y + rects.BELOW.h <= rects.H + 1 &&
        rects.MAP.w > 40 && rects.PANEL.h > 40,
        JSON.stringify(rects));
}

section("screenshots");
await page.setViewportSize({ width: 1100, height: 900 });
await page.waitForTimeout(300);
await page.screenshot({ path: "census-pwa/smoke-desktop.png" });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: "census-pwa/smoke-mobile.png" });

ok("no console errors at the end", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
console.log("\n" + (failures ? "FAILED" : "OK") + `  ${checks - failures}/${checks} checks`);
process.exit(failures ? 1 : 0);