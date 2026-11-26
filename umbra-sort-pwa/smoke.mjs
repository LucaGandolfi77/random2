/*
 * Umbra Sort — dependency-free browser smoke test.
 * Uses the repository's DevTools client and skips cleanly without Chromium.
 */
import { launch, sleep } from "../tools/cdp.mjs";

const base = (process.argv[2] || "http://localhost:8099/umbra-sort-pwa/").replace(/\/$/, "") + "/";
const browser = await launch();
if (!browser) {
  console.log("umbra-sort smoke: skipped (no Chromium)");
  process.exit(0);
}

const { cdp, sessionId } = browser;
const send = (method, params) => cdp.send(method, params || {}, sessionId);
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};

const failures = [];
let passed = 0;
function check(name, ok, detail) {
  if (ok) passed++;
  else failures.push(name + (detail ? " — " + detail : ""));
}

const errors = [];
cdp.on("Runtime.exceptionThrown", (event) => errors.push(JSON.stringify(event.exceptionDetails)));

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send("Page.navigate", { url: base + "index.html" });
  let booted = false;
  for (let i = 0; i < 40; i++) {
    booted = await evaluate(`!!window.UmbraSort`);
    if (booted) break;
    await sleep(100);
  }

  const boot = await evaluate(`(() => ({
    app: !!window.UmbraSort,
    menu: !document.getElementById('menuScreen').classList.contains('hidden'),
    manifest: !!document.querySelector('link[rel="manifest"]'),
    canvas: document.getElementById('gameCanvas').width > 0
  }))()`);
  check("app booted", boot.app);
  check("menu visible", boot.menu);
  check("manifest linked", boot.manifest);
  check("canvas sized", boot.canvas);

  const levelModes = await evaluate(`(() => {
    window.UmbraSort.openLevels();
    const tabs = [...document.querySelectorAll('#levelModeTabs button')];
    tabs.find((button) => button.textContent === 'Speciali').click();
    return { tabs: tabs.length, specials: document.getElementById('levelGrid').children.length };
  })()`);
  check("campaign, special and boss tabs exist", levelModes.tabs === 3);
  check("ten special levels are listed", levelModes.specials === 10);
  await evaluate(`document.querySelector('[data-close="levelsDialog"]').click()`);

  const started = await evaluate(`(() => {
    const level = window.UmbraSort.makeLevel(0, 0);
    window.UmbraSort.startLevel(level);
    return { screen: window.UmbraSort.state.screen };
  })()`);
  check("game screen active", started.screen === "game");
  const pulse = await evaluate(`(() => {
    window.UmbraSort.activatePulse();
    return window.UmbraSort.game.pulseActive();
  })()`);
  check("Pulse ability activates", pulse === true);
  await sleep(120);

  const drag = await evaluate(`(() => {
    const game = window.UmbraSort.game;
    const state = game.getState();
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    for (let y = 1; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.cells[y * state.width + x];
        if (!cell || cell.kind !== 'block' || game.blackoutAt(x, y)) continue;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) continue;
          if (state.cells[ny * state.width + nx] || game.doorAt(nx, ny) || game.blackoutAt(nx, ny)) continue;
          const a = window.UmbraSort.state.renderer.cellRect(x, y);
          const b = window.UmbraSort.state.renderer.cellRect(nx, ny);
          return {
            from: { x: rect.left + a.x + a.w / 2, y: rect.top + a.y + a.h / 2 },
            to: { x: rect.left + b.x + b.w / 2, y: rect.top + b.y + b.h / 2 }
          };
        }
      }
    }
    return null;
  })()`);
  if (drag) {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: drag.from.x, y: drag.from.y, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: drag.to.x, y: drag.to.y, button: "left", buttons: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: drag.to.x, y: drag.to.y, button: "left", buttons: 0, clickCount: 1 });
  }
  const dragged = await evaluate(`window.UmbraSort.game.getState().moves > 0`);
  check("pointer drag moves a block", dragged === true);

  const hinted = await evaluate(`(() => {
    const hint = window.UmbraSort.game.findHint();
    const moved = hint && hint.type === 'path' ? window.UmbraSort.game.moveAlongPath(hint.id, hint.path) : null;
    return {
      captured: window.UmbraSort.game.capturedCount(),
      moved: moved && moved.ok,
      blocks: window.UmbraSort.game.remainingBlocks()
    };
  })()`);
  check("hint produced a legal move", hinted.moved === true, JSON.stringify(hinted));
  check("matching block captured", hinted.captured > 0, JSON.stringify(hinted));

  const paintedLength = await evaluate(`document.getElementById('gameCanvas').toDataURL().length`);
  check("canvas painted", paintedLength > 1000, String(paintedLength));

  const paused = await evaluate(`(() => {
    document.getElementById('pauseButton').click();
    return {
      paused: window.UmbraSort.state.paused,
      dialog: !document.getElementById('pauseDialog').classList.contains('hidden')
    };
  })()`);
  check("pause dialog works", paused.paused && paused.dialog);

  const boss = await evaluate(`(() => {
    document.getElementById('resumeButton').click();
    window.UmbraSort.startLevel(window.UmbraSort.makeBossLevel(0));
    return {
      boss: !!window.UmbraSort.game.getState().boss,
      bar: !document.getElementById('bossBar').classList.contains('hidden'),
      scan: window.UmbraSort.game.useScan().ok
    };
  })()`);
  check("boss level and HUD load", boss.boss && boss.bar);
  check("Scan ability activates", boss.scan === true);

  const sw = await evaluate(`navigator.serviceWorker.ready.then(() => true).catch(() => false)`);
  check("service worker active", sw === true);
  let controlled = false;
  for (let i = 0; i < 30; i++) {
    controlled = await evaluate(`!!navigator.serviceWorker?.controller`);
    if (controlled) break;
    await sleep(100);
  }
  check("service worker controls page", controlled === true);

  await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send("Page.reload", {});
  await sleep(800);
  const offline = await evaluate(`(() => ({
    app: !!window.UmbraSort,
    menu: !!document.getElementById('menuScreen') && !document.getElementById('menuScreen').classList.contains('hidden'),
    controlled: !!navigator.serviceWorker?.controller,
    ready: document.readyState
  }))()`);
  check("offline reload boots", offline.app === true && offline.menu === true, JSON.stringify(offline));
  check("no runtime exceptions", errors.length === 0, errors.slice(0, 2).join(" | "));
} catch (error) {
  failures.push("smoke exception — " + error.message);
  if (errors.length) failures.push("runtime — " + errors.slice(0, 3).join(" | "));
} finally {
  try { browser.close(); } catch { /* Chrome may still be releasing its temporary profile. */ }
}

for (const failure of failures) console.error("FAIL " + failure);
console.log(`umbra-sort smoke: ${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
