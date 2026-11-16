/*
 * Plane Shooter smoke test.
 *
 * Drives the real page in Chromium through the DevTools protocol:
 *   - the menu boots and the canvas has a real backing buffer
 *   - a pointer drag moves the plane with the right scaling
 *   - auto-fire kills an enemy and raises the score
 *   - pause/resume, game over and restart are reachable
 *   - the theme survives a reload
 *   - the service worker can boot the game offline
 *
 * A missing Chromium prints SKIP and exits 0, matching the other smoke
 * scripts in this repository.
 */

import { launch, sleep } from "../tools/cdp.mjs";

const url = process.argv[2] || "http://localhost:8099/plane-pwa/";
const target = url + (url.includes("?") ? "&" : "?") + "debug=1";

const browser = await launch();
if (!browser) {
    console.log("SMOKE SKIPPED — no Chromium found.");
    process.exit(0);
}

const { cdp, sessionId } = browser;
let checks = 0;
let failures = 0;
const errors = [];

function ok(condition, label, extra) {
    checks += 1;
    if (condition) {
        console.log("  ok   " + label);
    } else {
        failures += 1;
        console.log("  FAIL " + label + (extra === undefined ? "" : "  (" + extra + ")"));
    }
}

async function evaluate(expression) {
    const result = await cdp.send(
        "Runtime.evaluate",
        { expression, returnByValue: true, awaitPromise: true },
        sessionId
    );

    if (result.exceptionDetails) {
        throw new Error(
            result.exceptionDetails.exception?.description ||
            result.exceptionDetails.text ||
            "evaluation failed"
        );
    }

    return result.result?.value;
}

async function waitFor(expression, timeout = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
        try {
            if (await evaluate(expression)) return true;
        } catch (error) {
            /* The page may still be navigating. */
        }
        await sleep(80);
    }
    return false;
}

async function click(selector) {
    await evaluate("document.querySelector(" + JSON.stringify(selector) + ").click()");
}

cdp.on("Runtime.exceptionThrown", (params) => {
    errors.push(
        params.exceptionDetails?.exception?.description ||
        params.exceptionDetails?.text ||
        "uncaught exception"
    );
});

cdp.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error") {
        errors.push(params.args.map((arg) => arg.value || arg.description).join(" "));
    }
});

await cdp.send("Page.enable", {}, sessionId);
await cdp.send("Runtime.enable", {}, sessionId);
await cdp.send("Network.enable", {}, sessionId);
await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
    sessionId
);

await cdp.send("Page.navigate", { url: target }, sessionId);
ok(await waitFor("typeof window.PlaneShooter === 'object'"), "the game boots");
ok(await waitFor("window.PlaneShooter.snapshot().phase === 'menu'"), "the menu is active");
ok(
    await evaluate("!document.getElementById('overlay').classList.contains('hidden')"),
    "the menu overlay is visible"
);

const layout = await evaluate(`(() => {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] + data[i + 1] + data[i + 2] > 40) lit += 1;
    }
    return {
        innerWidth: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        cssWidth: rect.width,
        cssHeight: rect.height,
        backingWidth: canvas.width,
        backingHeight: canvas.height,
        lit: lit
    };
})()`);

ok(layout && layout.scrollWidth <= layout.innerWidth + 1, "the page has no horizontal overflow", layout && layout.scrollWidth);
ok(layout && layout.lit > 1000, "the canvas is painted", layout && layout.lit + " lit pixels");
ok(
    layout && layout.backingWidth >= layout.cssWidth * 1.5,
    "the canvas has a DPR-aware backing store",
    layout && layout.backingWidth + "x" + layout.backingHeight
);

await click("#overlay-primary");
ok(await waitFor("window.PlaneShooter.snapshot().phase === 'playing'"), "Play starts a run");
ok(
    await evaluate("document.getElementById('overlay').classList.contains('hidden')"),
    "the overlay hides while playing"
);
ok(await waitFor("window.PlaneShooter.snapshot().bullets > 0", 2000), "auto-fire starts without input");

const rect = await evaluate(`(() => {
    const r = document.getElementById('game-canvas').getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
})()`);
const before = await evaluate("window.PlaneShooter.snapshot().player");

const startX = rect.left + rect.width * 0.5;
const startY = rect.top + rect.height * 0.5;
await cdp.send(
    "Input.dispatchMouseEvent",
    { type: "mousePressed", x: startX, y: startY, button: "left", buttons: 1, clickCount: 1 },
    sessionId
);
await cdp.send(
    "Input.dispatchMouseEvent",
    { type: "mouseMoved", x: startX + 40, y: startY - 20, button: "left", buttons: 1 },
    sessionId
);
await cdp.send(
    "Input.dispatchMouseEvent",
    { type: "mouseReleased", x: startX + 40, y: startY - 20, button: "left", buttons: 0, clickCount: 1 },
    sessionId
);
await sleep(120);

const after = await evaluate("window.PlaneShooter.snapshot().player");
ok(after && before && after.x - before.x > 15, "a relative drag moves the plane horizontally", before && after && (after.x - before.x).toFixed(1));
ok(after && before && after.y - before.y < -5, "a relative drag moves the plane vertically", before && after && (after.y - before.y).toFixed(1));

const playerNow = await evaluate("window.PlaneShooter.snapshot().player");
await evaluate(
    "window.PlaneShooter.spawn('drifter', " +
    playerNow.x + ", " + (playerNow.y - 140) + ")"
);
await sleep(1200);
const scored = await evaluate("window.PlaneShooter.snapshot()");
ok(scored && scored.score > 0, "auto-fire kills an enemy and scores", scored && scored.score);

await click("#pause-btn");
ok(await waitFor("window.PlaneShooter.snapshot().phase === 'paused'"), "Pause works");
ok(
    await evaluate("document.getElementById('overlay-title').textContent === 'PAUSED'"),
    "the pause overlay is shown"
);

await click("#overlay-primary");
ok(await waitFor("window.PlaneShooter.snapshot().phase === 'playing'"), "Resume works");

const themeBefore = await evaluate("document.documentElement.dataset.theme");
await click("#pause-btn");
await click("#overlay-theme");
await sleep(100);
const themeAfter = await evaluate("document.documentElement.dataset.theme");
ok(themeAfter !== themeBefore, "the theme button rounds through a new palette", themeBefore + " -> " + themeAfter);
ok(
    await evaluate("JSON.parse(localStorage.getItem('plane-pwa')).theme === " + JSON.stringify(themeAfter)),
    "the theme is persisted"
);
await click("#overlay-primary");
ok(await waitFor("window.PlaneShooter.snapshot().phase === 'playing'"), "Resume after the theme change");

const keyboardBefore = await evaluate("window.PlaneShooter.snapshot().player.x");
await cdp.send(
    "Input.dispatchKeyEvent",
    { type: "keyDown", key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37 },
    sessionId
);
await sleep(220);
await cdp.send(
    "Input.dispatchKeyEvent",
    { type: "keyUp", key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37 },
    sessionId
);
await sleep(80);
const keyboardAfter = await evaluate("window.PlaneShooter.snapshot().player.x");
ok(
    keyboardAfter < keyboardBefore - 5,
    "the arrow keys fly the plane",
    keyboardBefore.toFixed(1) + " -> " + keyboardAfter.toFixed(1)
);

await evaluate("window.PlaneShooter.forceGameOver()");
ok(await waitFor("window.PlaneShooter.snapshot().phase === 'over'"), "the run reaches game over");
ok(
    await evaluate("document.getElementById('overlay-title').textContent === 'GAME OVER'"),
    "the game-over overlay is shown"
);

const overState = await evaluate("window.PlaneShooter.snapshot()");
const finalScore = await evaluate("document.getElementById('final-score').textContent");
ok(String(overState.score) === finalScore, "the final score is printed in the overlay", finalScore);
ok(
    await evaluate("JSON.parse(localStorage.getItem('plane-pwa')).highScore >= " + overState.score),
    "the high score is saved"
);

await click("#overlay-primary");
ok(await waitFor("window.PlaneShooter.snapshot().phase === 'playing'"), "Play Again starts a fresh run");
const restarted = await evaluate("window.PlaneShooter.snapshot()");
ok(restarted && restarted.score === 0 && restarted.lives === 3, "the restart resets score and lives");
ok(
    await waitFor(
        "JSON.parse(localStorage.getItem('random2-runs') || '[]').some(function (run) { return run.slug === 'plane-pwa/'; })",
        2500
    ),
    "the finished run is recorded in the shared stats log"
);

/* Offline reload through the service worker. */
const swReady = await waitFor("navigator.serviceWorker && navigator.serviceWorker.controller !== null", 8000);
if (swReady) {
    await cdp.send(
        "Network.emulateNetworkConditions",
        { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
        sessionId
    );
    await cdp.send("Page.reload", {}, sessionId);
    await sleep(700);
    const offlineBoots = await waitFor("typeof window.PlaneShooter === 'object'", 6000);
    ok(offlineBoots, "the game boots offline through its service worker");
    ok(
        await evaluate("document.documentElement.dataset.theme === " + JSON.stringify(themeAfter)),
        "the chosen theme survives the offline reload"
    );
    await cdp.send(
        "Network.emulateNetworkConditions",
        { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
        sessionId
    );
} else {
    ok(false, "the service worker takes control of the page");
}

ok(errors.length === 0, "no uncaught errors or console errors", errors.slice(0, 3).join(" | "));

console.log("\n" + (checks - failures) + "/" + checks + " checks passed.");

try {
    browser.close();
} catch (error) {
    /* The temporary profile can still be releasing files on macOS. */
}

process.exit(failures === 0 ? 0 : 1);
