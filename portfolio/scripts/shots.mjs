/*
 * portfolio · case-study screenshots
 *
 * Generates the images used by the case studies on ../index.html.
 *
 *   python3 -m http.server 8099 &            # from the repo root
 *   node portfolio/scripts/shots.mjs http://localhost:8099
 *
 * Every game in this repo draws itself procedurally on a canvas, so there is
 * nothing to screenshot until it is running. That is what this script is for.
 *
 * No dependencies, on purpose: the repo has no node_modules at the root and
 * the house rule is that a static page ships zero of them. It drives a
 * Chromium over the DevTools Protocol using Node's built-in WebSocket, and
 * it skips cleanly when no browser is installed rather than failing.
 *
 * The trick that makes the shots worth looking at is `before`: each one puts
 * the app into a state that shows the product *doing* something, rather than
 * a title screen. census-pwa/shot.mjs does the same thing with Playwright.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "shots");
const BASE = (process.argv[2] || "http://localhost:8099").replace(/\/$/, "");
/* Any extra arguments re-shoot only those cases, so iterating on one frame
 * does not cost a full run:  node shots.mjs http://localhost:8099 pulse */
const ONLY = process.argv.slice(3);

/* ---------------------------------------------------------------- browser */

/* Playwright's cache is the usual place a Chromium already exists on a
 * developer machine. Chrome is the fallback so the script works without it. */
function findChromium() {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;

    const cache = join(
        process.env.HOME || "",
        "Library/Caches/ms-playwright"
    );
    if (existsSync(cache)) {
        for (const dir of readdirSync(cache).sort().reverse()) {
            if (!dir.startsWith("chromium")) continue;
            for (const rel of [
                "chrome-headless-shell-mac-arm64/chrome-headless-shell",
                "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
                "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
            ]) {
                const p = join(cache, dir, rel);
                if (existsSync(p)) return p;
            }
        }
    }
    for (const p of [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/usr/bin/chromium",
    ]) {
        if (existsSync(p)) return p;
    }
    return null;
}

/* ------------------------------------------------------------- CDP client */

/* A promise-per-id client. Flat sessions are used, so every message from a
 * page carries the same sessionId and the routing stays trivial. */
function connect(url) {
    const ws = new WebSocket(url);
    const pending = new Map();
    const waiters = new Map();
    let id = 0;

    const ready = new Promise((res, rej) => {
        ws.addEventListener("open", () => res());
        ws.addEventListener("error", (e) => rej(new Error("devtools socket failed: " + e.message)));
    });

    ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id !== undefined) {
            const slot = pending.get(msg.id);
            if (!slot) return;
            pending.delete(msg.id);
            if (msg.error) slot.reject(new Error(msg.error.message));
            else slot.resolve(msg.result);
            return;
        }
        const list = waiters.get(msg.method);
        if (list) for (const fn of list.splice(0)) fn(msg.params);
    });

    const send = (method, params = {}, sessionId) => {
        const mid = ++id;
        return new Promise((resolve, reject) => {
            pending.set(mid, { resolve, reject });
            ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
        });
    };

    const once = (method) => new Promise((resolve) => {
        const list = waiters.get(method) || [];
        list.push(resolve);
        waiters.set(method, list);
    });

    return { ready, send, once, close: () => ws.close() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* -------------------------------------------------------------- the shots */

/* `seed` is installed before any page script runs, which is how the data
 * apps get something to draw: STATS reads the arcade's own localStorage, so
 * an empty profile would screenshot as an empty dashboard. */
const STATS_SEED = {
    /* The run log is {t, slug, score, durMs, wave, outcome} and the daily
     * rollup is {day, slugs: {slug: n}} - see R2.stats in shared/arcade.js.
     * Getting `slug` wrong renders every chart empty, because the dashboard
     * groups by slug before it draws anything. */
    "random2-runs": Array.from({ length: 74 }, (_, i) => ({
        t: Date.UTC(2026, 8, 1 + (i % 27), (i * 7) % 24, (i * 11) % 60),
        slug: ["sector7-pwa/", "lumen-pwa/", "metro-pwa/", "census-pwa/", "pulse-pwa/"][i % 5],
        score: [420, 1800, 960, 3310, 740, 5210, 1120, 2640, 1980, 6030][i % 10],
        durMs: 60000 + ((i * 37) % 900) * 1000,
        wave: 1 + ((i * 3) % 24),
        outcome: ["win", "loss", "loss", "abort", "win"][i % 5],
    })),
    "random2-runs-by-day": Array.from({ length: 27 }, (_, i) => ({
        day: "2026-09-" + String(1 + i).padStart(2, "0"),
        slugs: { "sector7-pwa/": 1 + ((i * 3) % 4), "lumen-pwa/": (i % 2) + 1 },
    })),
    "random2-events": {
        "snake-pwa/": { walls: 23, apples: 412 },
        "sector7-pwa/": { destroyed: 61, dock: 18 },
    },
    "random2-playtime": Object.fromEntries(
        ["sector7-pwa/", "lumen-pwa/", "metro-pwa/", "census-pwa/", "pulse-pwa/"].map((slug, i) => [
            slug,
            {
                total: 4200 + i * 2600,
                byHour: Array.from({ length: 24 }, (_, h) => (h > 19 || h < 2 ? 300 : 40) * (1 + i)),
                byDay: Array.from({ length: 7 }, (_, d) => (d === 2 || d === 6 ? 900 : 300) * (1 + i)),
                last: Date.UTC(2026, 9, 14, 21, 30),
            },
        ])
    ),
    "random2-last-played": Object.fromEntries(
        ["sector7-pwa/", "lumen-pwa/", "metro-pwa/", "pulse-pwa/"].map((slug) => [
            slug,
            Date.UTC(2026, 9, 14, 20, 0),
        ])
    ),
};

/* BUCIO is not in this list. It is the one project built with a bundler, so
 * its page does not run from the repo root; CI only publishes bucio/dist/ into
 * the site. Its case study reuses the committed screenshot in
 * bucio/public/screens/, which is a real frame from a real run. */
const SHOTS = [
    {
        name: "census",
        path: "/census-pwa/",
        note: "the published return, after a partial survey",
        h: 660,
        before: `(() => {
            window.__census.start("sospetto", 20261015);
            window.__census.begin();
            for (const i of [0, 1, 2, 4]) {
                const s = window.__census.state();
                window.CensusSim.survey(s, i, 14);
            }
            window.CensusSim.publish(window.__census.state());
            window.__census.draw();
        })()`,
    },
    {
        name: "stats",
        path: "/stats-pwa/",
        note: "a seeded profile, runs tab",
        h: 900,
        seed: STATS_SEED,
        /* Theme first, then the tab: charts read their colours out of the CSS
         * custom properties at draw time, so switching panels after the theme
         * is what repaints them in the right palette. */
        after: `(() => {
            const html = document.documentElement;
            const theme = document.getElementById('theme-btn');
            if (theme && html.getAttribute('data-theme') !== 'dark') theme.click();
            const tab = document.querySelector('.tab[data-panel="p-runs"]');
            if (tab) tab.click();
        })()`,
    },
    {
        name: "sector7",
        path: "/sector7-pwa/",
        note: "in-sector flight",
        after: `document.getElementById("btn-play").click()`,
        hold: 5200,
    },
    {
        name: "ironfall",
        path: "/ironfall-pwa/",
        note: "the lane MOBA",
        after: `document.getElementById("btn-play").click()`,
        hold: 5200,
    },
    {
        name: "pulse",
        path: "/pulse-pwa/",
        note: "the rhythm chart",
        after: `document.getElementById("btn-play").click()`,
        /* PULSE synthesises the track in 12-second chunks and schedules each
         * one as the previous finishes, so the lanes are empty until the
         * first chunk has been rendered and handed to WebAudio. */
        hold: 17000,
    },
    {
        name: "portfolio",
        path: "/portfolio/",
        note: "this page, for the README and the social card",
        settle: 2500,
    },
];

/* ------------------------------------------------------------------- main */

const bin = findChromium();
if (!bin) {
    console.log("SKIP  no Chromium found (set CHROMIUM_PATH to point at one)");
    process.exit(0);
}

mkdirSync(out, { recursive: true });
const profile = join(tmpdir(), "r2-portfolio-shots-" + process.pid);

const child = spawn(
    bin,
    [
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        /* PULSE schedules its note chart against audioCtx.currentTime. A
         * headless AudioContext stays suspended without a user gesture, so
         * currentTime never advances and the lanes stay empty forever. */
        "--autoplay-policy=no-user-gesture-required",
        "--mute-audio",
        "--remote-debugging-port=0",
        "--user-data-dir=" + profile,
        "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
);

/* Chromium prints the DevTools endpoint on stderr once it is listening. */
const wsURL = await new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error("no devtools endpoint")), 20000);
    child.stderr.on("data", (d) => {
        buf += d.toString();
        const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) {
            clearTimeout(timer);
            resolve(m[1].trim());
        }
    });
    child.on("exit", (code) => {
        clearTimeout(timer);
        reject(new Error("browser exited early (" + code + ")\n" + buf.slice(-400)));
    });
});

const cdp = connect(wsURL);
await cdp.ready;

const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

await cdp.send("Page.enable", {}, sessionId);
await cdp.send("Runtime.enable", {}, sessionId);

let ok = 0;
let failed = 0;

const queue = ONLY.length ? SHOTS.filter((sh) => ONLY.includes(sh.name)) : SHOTS;
if (!queue.length) {
    console.log("no case matches " + ONLY.join(", "));
    process.exit(1);
}

for (const shot of queue) {
    const label = shot.name.padEnd(11);
    try {
        await cdp.send(
            "Emulation.setDeviceMetricsOverride",
            {
                width: shot.w || 1280,
                height: shot.h || 800,
                /* 1.5, not 2. The shots are shown in a card about 700px wide,
                 * so 2x produced 2560px PNGs and ~1.9MB of page weight - which
                 * would undercut the performance claim the portfolio is making.
                 * 1.5 is still sharper than the display and lands near 700KB. */
                deviceScaleFactor: shot.dpr || 1.5,
                mobile: false,
            },
            sessionId
        );

        if (shot.seed) {
            await cdp.send(
                "Page.addScriptToEvaluateOnNewDocument",
                {
                    source: `try { for (const [k, v] of Object.entries(${JSON.stringify(
                        shot.seed
                    )})) localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}`,
                },
                sessionId
            );
        }

        const loaded = cdp.once("Page.loadEventFired");
        await cdp.send("Page.navigate", { url: BASE + shot.path }, sessionId);
        await Promise.race([loaded, sleep(12000)]);

        await sleep(shot.settle || 1200);

        if (shot.before) {
            await cdp.send(
                "Runtime.evaluate",
                { expression: shot.before, awaitPromise: true },
                sessionId
            );
            await sleep(700);
        }
        if (shot.after) {
            await cdp.send(
                "Runtime.evaluate",
                { expression: shot.after, awaitPromise: true },
                sessionId
            );
            /* Games need real frames, not just a settle delay: the start
             * button hands over to a loop that draws nothing on frame one. */
            await sleep(shot.hold || 900);
        }

        const res = await cdp.send(
            "Page.captureScreenshot",
            { format: "png" },
            sessionId
        );
        writeFileSync(join(out, shot.name + ".png"), Buffer.from(res.data, "base64"));
        console.log("  OK   " + label + shot.note);
        ok++;
    } catch (err) {
        console.log("  FAIL " + label + err.message);
        failed++;
    }
}

cdp.close();
child.kill();
rmSync(profile, { recursive: true, force: true });

console.log(`\n${ok} written, ${failed} failed → portfolio/shots/`);
process.exit(failed ? 1 : 0);