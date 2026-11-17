/*
 * Deep Orbit smoke test.
 *
 * Drives the real page in Chromium through the DevTools protocol:
 *   - the menu boots, the DPR-aware canvas is painted, no horizontal overflow
 *   - Play starts a run, firing kills a target and scores
 *   - the joystick flies the ship, abilities trigger, pause/resume works
 *   - the hangar buys an upgrade and persists it
 *   - destruction and respawn are reachable, the run is recorded
 *   - the service worker boots the game offline
 *
 * A missing Chromium prints SKIP and exits 0, matching other repo smoke tests.
 *
 *   npm run smoke             (expects a server on http://localhost:8099)
 *   npm run smoke -- <url>
 */

import { launch, sleep } from "../tools/cdp.mjs";

const base = process.argv[2] || "http://localhost:8099/darkorbit-pwa/";
const url = base + (base.includes("?") ? "&" : "?") + "debug=1";

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
    if (condition) console.log("  ok   " + label);
    else {
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
            result.exceptionDetails.text || "evaluation failed"
        );
    }
    return result.result?.value;
}

async function waitFor(expression, timeout = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
        try { if (await evaluate(expression)) return true; } catch (e) {}
        await sleep(80);
    }
    return false;
}

async function click(selector) {
    await evaluate("document.querySelector(" + JSON.stringify(selector) + ").click()");
}

async function center(selector) {
    return evaluate(`(() => {
        const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
}

async function pointer(selector, dx, dy, holdMs = 0) {
    const c = await center(selector);
    const x1 = c.x;
    const y1 = c.y;
    const x2 = c.x + dx;
    const y2 = c.y + dy;
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: x1, y: y1, button: "left", buttons: 1, clickCount: 1 }, sessionId);
    if (dx || dy) {
        await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x2, y: y2, button: "left", buttons: 1 }, sessionId);
    }
    if (holdMs) await sleep(holdMs);
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x2, y: y2, button: "left", buttons: 0, clickCount: 1 }, sessionId);
}

cdp.on("Runtime.exceptionThrown", (params) => {
    errors.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || "uncaught exception");
});
cdp.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error") errors.push(params.args.map((a) => a.value || a.description).join(" "));
});

await cdp.send("Page.enable", {}, sessionId);
await cdp.send("Runtime.enable", {}, sessionId);
await cdp.send("Network.enable", {}, sessionId);

/* Portrait iPhone first. */
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sessionId);
await cdp.send("Page.navigate", { url }, sessionId);

if (!(await waitFor("typeof window.__DEEP_ORBIT__ === 'object'", 4000))) {
    await cdp.send("Page.reload", {}, sessionId);
}
ok(await waitFor("typeof window.__DEEP_ORBIT__ === 'object'", 10000), "the game boots");
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'menu'"), "the menu is active");
ok(await evaluate("!document.getElementById('overlay').classList.contains('hidden')"), "the menu overlay is visible");

const layout = await evaluate(`(() => {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] + data[i + 1] + data[i + 2] > 40) lit += 1;
    }
    return {
        innerWidth: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        cssWidth: rect.width,
        backingWidth: canvas.width,
        backingHeight: canvas.height,
        lit
    };
})()`);
ok(layout && layout.scrollWidth <= layout.innerWidth + 1, "portrait: no horizontal overflow", layout && layout.scrollWidth);
ok(layout && layout.lit > 1000, "the canvas is painted", layout && layout.lit + " lit pixels");
ok(layout && layout.backingWidth >= layout.cssWidth * 1.5, "the canvas backing store is DPR-aware", layout && layout.backingWidth + "x" + layout.backingHeight);

/* Debug HUD (?debug=1). */
await sleep(450);
ok(await evaluate("!document.getElementById('debug-hud').classList.contains('hidden')"), "the debug HUD is visible in debug mode");
ok(await evaluate("/FPS/.test(document.getElementById('debug-hud').textContent)"), "the debug HUD reports FPS");
ok(await evaluate("/HULL MESH/.test(document.getElementById('debug-hud').textContent)"), "high quality uses faceted 3D hulls");

/* Daily contracts and achievements panels. */
ok(await evaluate("!!document.querySelector('[data-action=mission-log]')"), "the menu has a Mission Log button");
await click('[data-action="mission-log"]');
ok(await evaluate("!!document.querySelector('.mission-active')"), "the mission log shows the active mission");
await click('[data-action="close-info"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'menu'"), "the mission log returns to the menu");
ok(await evaluate("!!document.querySelector('[data-action=contracts]')"), "the menu has a Contracts button");
await click('[data-action="contracts"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'info'"), "Contracts panel opens");
ok(await evaluate("document.querySelectorAll('.contract-row').length === 3"), "three daily contracts are shown");
await click('[data-action="close-info"]');
await click('[data-action="achievements"]');
ok(await evaluate("document.querySelectorAll('.upgrade-row').length >= 10"), "achievements are listed");
await click('[data-action="close-info"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'menu'"), "info panels return to the menu");

/* Hangar meta systems from the menu (where the preview ship is docked). */
await click('[data-action="hangar"]');
ok(await evaluate("!!document.querySelector('[data-action=dispatch]')"), "dispatch options are shown while docked");
await click('[data-action="dispatch"][data-value="short"]');
ok(await evaluate("!!window.__DEEP_ORBIT__.getProfile().dispatch.active"), "a retriever mission starts");
await evaluate("window.__DEEP_ORBIT__.getProfile().dispatch.active.endsAt = Date.now() - 1000");
await click('[data-action="close-hangar"]');
await click('[data-action="hangar"]');
await click('[data-action="claim-dispatch"]');
ok(await evaluate("window.__DEEP_ORBIT__.getProfile().dispatch.active === null"), "a completed dispatch can be claimed");
await evaluate("window.__DEEP_ORBIT__.getProfile().skillPoints = 3");
await click('[data-action="close-hangar"]');
await click('[data-action="hangar"]');
await click('[data-action="buy-skill"][data-value="laser"]');
ok(await evaluate("window.__DEEP_ORBIT__.getProfile().skills.laser === 1"), "a pilot skill can be purchased");
ok(await evaluate("!!document.querySelector('[data-action=refine]')"), "the refinery is shown while docked");
await evaluate("(() => { const s=window.__DEEP_ORBIT__.getState(); s.cargo.aetherium=6; s.cargoUsed=6; })()");
await click('[data-action="close-hangar"]');
await click('[data-action="hangar"]');
await click('[data-action="refine"][data-value="aetherium"]');
ok(await evaluate("window.__DEEP_ORBIT__.getProfile().refined.aetherium === 1"), "raw ore refines into material");
await click('[data-action="sell-refined"][data-value="aetherium"]');
ok(await evaluate("window.__DEEP_ORBIT__.getProfile().refined.aetherium === 0"), "refined material can be sold");
await click('[data-action="close-hangar"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'menu'"), "hangar returns to the menu");

/* Settings screen and persistence. */
await click('[data-action="settings"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'settings'"), "Settings opens from the menu");
await click('[data-action="setting"][data-key="fps"][data-value="30"]');
ok(await evaluate("window.__DEEP_ORBIT__.getSettings().fps === 30"), "30 fps mode is applied");
await click('[data-action="setting"][data-key="effects"][data-value="low"]');
ok(await waitFor("/HULL 2D/.test(document.getElementById('debug-hud').textContent)", 1500), "low quality falls back to 2D silhouettes");
await click('[data-action="setting"][data-key="effects"][data-value="high"]');
ok(await waitFor("/HULL MESH/.test(document.getElementById('debug-hud').textContent)", 1500), "high quality restores 3D hulls");
await click('[data-action="setting"][data-key="palette"][data-value="colorblind"]');
ok(await evaluate("document.body.classList.contains('cb')"), "colorblind palette is applied");
ok(await waitFor("JSON.parse(localStorage.getItem('darkorbit-settings') || '{}').palette === 'colorblind'"), "settings are persisted");
await click('[data-action="setting"][data-key="fps"][data-value="60"]');
await click('[data-action="setting"][data-key="palette"][data-value="normal"]');
await click('[data-action="setting"][data-key="effects"][data-value="auto"]');
await click('[data-action="close-settings"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'menu'"), "Settings returns to the menu");

await click('[data-action="play"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'coach'"), "first run shows onboarding");
ok(await evaluate("!document.getElementById('coach').classList.contains('hidden')"), "the coach card is visible");
for (let i = 0; i < 3; i++) await click('[data-action="coach-next"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'playing'"), "Play starts a run after onboarding");
ok(await evaluate("document.getElementById('overlay').classList.contains('hidden')"), "the overlay hides while playing");
ok(await evaluate("window.__DEEP_ORBIT__.getState().enemies.length > 0"), "enemies spawn in the sector");

const cfg = await evaluate("window.__DEEP_ORBIT__.getConfig()");
ok(cfg && cfg.maps === 6 && cfg.ammo === 5 && cfg.ships >= 8 && cfg.pickups >= 3,
    "v2 content is loaded", cfg && JSON.stringify(cfg));

/* Station safe haven: hostiles disengage and bullets fizzle. */
ok(await evaluate("window.__DEEP_ORBIT__.getState().docked === true"), "the run starts docked");
ok(await evaluate("!document.getElementById('safe-badge').classList.contains('hidden')"), "the safe-zone badge is shown");
ok(await evaluate("document.getElementById('fire-btn').classList.contains('locked')"), "FIRE is locked in the safe zone");
await evaluate(`(() => {
    const s = window.__DEEP_ORBIT__.getState();
    s.enemies = [{
        id: 8001, defId: 'swarm',
        def: { name: 'Lurker', tier: 1, color: '#f66', shape: 'triangle', speed: 160, range: 600, fireCd: 0.2, damage: 20, spread: 1, credits: [1, 2], xp: 1 },
        x: s.player.x + 240, y: s.player.y, vx: 0, vy: 0, angle: 0, radius: 16,
        hp: 10000, hpMax: 10000, shield: 1000, shieldMax: 1000,
        fireCd: 0.1, contactCd: 0, hitFlash: 0, orbitDir: 1, wander: 0,
        homeX: s.player.x + 240, homeY: s.player.y,
        cloakCd: 99, cloaked: false, cloakAlpha: 1, dotTime: 0, dotDps: 0, charge: 0, dead: false
    }];
    s.enemyBullets.push({ x: s.player.x + 130, y: s.player.y, vx: -200, vy: 0, dmg: 500, color: '#f00', radius: 5, life: 2 });
    s.spawnTimer = 99;
})()`);
const safeBefore = await evaluate("({ x: window.__DEEP_ORBIT__.getState().enemies[0].x, shield: window.__DEEP_ORBIT__.getState().player.shield })");
await sleep(700);
const safeAfter = await evaluate("({ x: window.__DEEP_ORBIT__.getState().enemies[0].x, bullets: window.__DEEP_ORBIT__.getState().enemyBullets.length, shield: window.__DEEP_ORBIT__.getState().player.shield })");
ok(safeAfter && safeAfter.x >= safeBefore.x - 12, "enemies do not close in while docked", safeBefore && safeAfter && (safeAfter.x - safeBefore.x).toFixed(1));
ok(safeAfter && safeAfter.bullets === 0, "hostile bullets fizzle at the station ring");
ok(safeAfter && safeAfter.shield >= safeBefore.shield, "no damage taken in the safe zone");

/* Leave the station so combat tests can fire. */
await evaluate(`(() => {
    const s = window.__DEEP_ORBIT__.getState();
    s.player.x = s.world.x / 2 + 430;
    s.player.y = s.world.y / 2 + 430;
})()`);
await sleep(120);
ok(await evaluate("window.__DEEP_ORBIT__.getState().docked === false"), "leaving the ring exits the safe zone");

/* Galaxy Gate arena. */
await evaluate("(() => { const s=window.__DEEP_ORBIT__.getState(); s.player.x=s.world.x/2; s.player.y=s.world.y/2; })()");
await sleep(120);
ok(await evaluate("!document.getElementById('btn-gate').classList.contains('hidden')"), "the gate button is shown while docked");
await click("#btn-gate");
ok(await waitFor("window.__DEEP_ORBIT__.getState().mode === 'gate'"), "Launch Gate starts an arena run");
ok(await waitFor("!document.getElementById('gate-hud').classList.contains('hidden')"), "the gate HUD is visible");
ok(await evaluate("/WAVE 1/.test(document.getElementById('gate-wave').textContent)"), "the gate HUD shows wave one");
const gateCredits = await evaluate("window.__DEEP_ORBIT__.getProfile().credits");
await evaluate("(() => { const g=window.__DEEP_ORBIT__.getState().gate; g.wave=3; g.kills=g.target; })()");
ok(await waitFor("window.__DEEP_ORBIT__.getState().mode === 'sector'", 3000), "clearing wave three exits the gate");
ok(await evaluate("window.__DEEP_ORBIT__.getProfile().credits > " + gateCredits), "gate rewards are paid");
ok(await evaluate("document.getElementById('gate-hud').classList.contains('hidden')"), "the gate HUD hides after the run");

/* Leave the station again for combat tests. */
await evaluate("(() => { const s=window.__DEEP_ORBIT__.getState(); s.player.x=s.world.x/2+430; s.player.y=s.world.y/2+430; })()");
await sleep(120);

/* Place a weak target in front of the ship and hold FIRE. */
await evaluate(`(() => {
    const s = window.__DEEP_ORBIT__.getState();
    s.enemies = [{
        id: 9001, defId: 'swarm',
        def: { name: 'Test Drone', tier: 1, color: '#fff', shape: 'triangle', speed: 0, range: 0, fireCd: 99, damage: 0, spread: 1, credits: [500, 500], xp: 10 },
        x: s.player.x + 90, y: s.player.y, vx: 0, vy: 0, angle: 0, radius: 16,
        hp: 1, hpMax: 1, shield: 0, shieldMax: 0,
        fireCd: 99, contactCd: 99, hitFlash: 0, orbitDir: 1, wander: 0,
        cloakCd: 99, cloaked: false, cloakAlpha: 1, dotTime: 0, dotDps: 0, charge: 0, dead: false
    }];
    s.player.targetId = 9001;
    s.spawnTimer = 99;
})()`);
await pointer("#fire-btn", 0, 0, 800);
const scored = await evaluate("({ kills: window.__DEEP_ORBIT__.getState().kills, score: window.__DEEP_ORBIT__.getState().score })");
ok(scored && scored.kills >= 1 && scored.score > 0, "firing kills the target and scores", scored && JSON.stringify(scored));
ok(await waitFor("window.__DEEP_ORBIT__.getProfile().achievements.includes('first_kill')"), "the first-kill achievement unlocks");

/* Joystick flight. */
const beforeMove = await evaluate("window.__DEEP_ORBIT__.getState().player.x");
await pointer("#joystick", 40, 0, 320);
await sleep(80);
const afterMove = await evaluate("window.__DEEP_ORBIT__.getState().player.x");
ok(afterMove > beforeMove + 5, "the joystick flies the ship", beforeMove.toFixed(1) + " -> " + afterMove.toFixed(1));

/* Ability + cooldown. */
await click('[data-ability="boost"]');
ok(await evaluate("window.__DEEP_ORBIT__.getState().player.boost > 0"), "Afterburner triggers");
ok(await evaluate("window.__DEEP_ORBIT__.getState().player.abilityCd.boost > 0"), "Afterburner goes on cooldown");

/* Pause / resume. */
await click("#btn-pause");
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'paused'"), "Pause works");
await click('[data-action="resume"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'playing'"), "Resume works");

/* Hangar purchase + persistence (open from pause, where docking is allowed). */
await evaluate("window.__DEEP_ORBIT__.getProfile().credits = 100000");
await click("#btn-pause");
await click('[data-action="hangar"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'hangar'"), "the hangar opens from pause");
ok(await evaluate("!!document.querySelector('.panel-wide')"), "the hangar panel renders");
const upBefore = await evaluate("window.__DEEP_ORBIT__.getProfile().upgrades.laser");
await click('[data-action="buy-upgrade"][data-value="laser"]');
const upAfter = await evaluate("window.__DEEP_ORBIT__.getProfile().upgrades.laser");
ok(upAfter === upBefore + 1, "buying an upgrade raises its level", upBefore + " -> " + upAfter);
await click('[data-action="close-hangar"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'paused'"), "leaving the hangar returns to pause");
await click('[data-action="resume"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'playing'"), "flight resumes after the hangar");

/* Destruction and respawn. */
await evaluate(`(() => {
    const s = window.__DEEP_ORBIT__.getState();
    s.enemyBullets.push({ x: s.player.x, y: s.player.y, vx: 0, vy: 0, dmg: 1e9, color: '#f00', radius: 5, life: 1 });
})()`);
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'destroyed'", 2500), "destruction is reachable");
await click('[data-action="respawn"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'playing'"), "respawn returns to flight");
ok(await evaluate("window.__DEEP_ORBIT__.getState().destroyed === false"), "the ship is restored");

/* Run autosave + Continue from the menu. */
await evaluate("window.__DEEP_ORBIT__.getState().score = 777; window.__DEEP_ORBIT__.saveRunNow()");
ok(await evaluate("window.__DEEP_ORBIT__.hasRun() === true"), "the run is saved");
await click("#btn-pause");
await click('[data-action="restart"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'menu'"), "Main Menu is reachable");
ok(await evaluate("!!document.querySelector('[data-action=continue]')"), "Continue Run is offered");
await click('[data-action="continue"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'playing'"), "Continue Run resumes play");
ok(await evaluate("window.__DEEP_ORBIT__.getState().score === 777"), "run score is restored");

/* Weekly challenge, leaderboard and ghost. */
await click("#btn-pause");
await click('[data-action="restart"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'menu'"), "back at the menu for the weekly run");
ok(await evaluate("!!document.querySelector('[data-action=weekly]')"), "the menu has a Weekly button");
await click('[data-action="weekly"]');
ok(await evaluate("!!document.querySelector('[data-action=start-weekly]')"), "the weekly panel shows the seeded run");
await click('[data-action="start-weekly"]');
ok(await waitFor("window.__DEEP_ORBIT__.getPhase() === 'playing' && !!window.__DEEP_ORBIT__.getChallenge()"), "the weekly challenge starts");
await sleep(400);
ok(await evaluate("window.__DEEP_ORBIT__.getReplayFrames() > 0"), "run frames are recorded for the ghost");
await click("#btn-pause");
await click('[data-action="restart"]');
ok(await waitFor("JSON.parse(localStorage.getItem('darkorbit-weekly') || '[]').length > 0"), "the weekly score is recorded locally");
await evaluate("window.__DEEP_ORBIT__.getProfile().level = 10");
await click('[data-action="hangar"]');
await click('[data-action="close-hangar"]');
ok(await evaluate("!!document.querySelector('[data-action=prestige]')"), "Galaxy Reset is offered at level 10");
await click('[data-action="play"]');
await sleep(250);
ok(await evaluate("!!window.__DEEP_ORBIT__.getState().ghostPose"), "a ghost appears from the saved run");

/* Landscape layout. */
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 2, mobile: true }, sessionId);
await sleep(300);
const landscape = await evaluate(`(() => ({
    w: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    canvasW: document.getElementById('game-canvas').getBoundingClientRect().width,
    fireVisible: document.getElementById('fire-btn').getBoundingClientRect().width > 0
}))()`);
ok(landscape && landscape.scrollWidth <= landscape.w + 1, "landscape: no horizontal overflow", landscape && landscape.scrollWidth);
ok(landscape && landscape.fireVisible && landscape.canvasW > 0, "landscape: controls and canvas remain visible");

/* Progression persists and the run is logged. */
ok(await waitFor("JSON.parse(localStorage.getItem('darkorbit-pwa') || '{}').upgrades && JSON.parse(localStorage.getItem('darkorbit-pwa')).upgrades.laser === " + upAfter, 2500), "the upgrade is persisted");
ok(await waitFor("JSON.parse(localStorage.getItem('random2-runs') || '[]').some(function (r) { return r.slug === 'darkorbit-pwa/'; })", 2500), "the run is recorded in the shared stats log");

/* Offline reload through the service worker. */
const swReady = await waitFor("navigator.serviceWorker && navigator.serviceWorker.controller !== null", 8000);
if (swReady) {
    await cdp.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }, sessionId);
    await cdp.send("Page.reload", {}, sessionId);
    await sleep(700);
    ok(await waitFor("typeof window.__DEEP_ORBIT__ === 'object'", 6000), "the game boots offline through its service worker");
    ok(await evaluate("window.__DEEP_ORBIT__.getProfile().upgrades.laser === " + upAfter), "progress survives the offline reload");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId);
} else {
    ok(false, "the service worker takes control of the page");
}

ok(errors.length === 0, "no uncaught errors or console errors", errors.slice(0, 3).join(" | "));

console.log("\n" + (checks - failures) + "/" + checks + " checks passed.");

try { browser.close(); } catch (e) {}
process.exit(failures === 0 ? 0 : 1);
