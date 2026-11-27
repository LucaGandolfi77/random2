/* Prism Blocks — dependency-free browser smoke test. */
import { launch, sleep } from "../tools/cdp.mjs";

const base = (process.argv[2] || "http://localhost:8099/prism-blocks-pwa/").replace(/\/$/, "") + "/";
const browser = await launch();
if (!browser) {
  console.log("prism-blocks smoke: skipped (no Chromium)");
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
    booted = await evaluate(`!!window.PrismBlocks`);
    if (booted) break;
    await sleep(100);
  }

  const boot = await evaluate(`(() => ({
    app: !!window.PrismBlocks,
    menu: !document.getElementById('menuScreen').classList.contains('hidden'),
    manifest: !!document.querySelector('link[rel="manifest"]')
  }))()`);
  check("app booted", boot.app);
  check("menu visible", boot.menu);
  check("manifest linked", boot.manifest);

  const started = await evaluate(`(() => {
    window.PrismBlocks.startEndless();
    return { screen: window.PrismBlocks.state.screen, tray: window.PrismBlocks.game.getState().tray.length };
  })()`);
  check("game screen active", started.screen === "game");
  check("three-piece tray created", started.tray === 3);
  await sleep(150);

  const played = await evaluate(`(() => {
    const hint = window.PrismBlocks.game.hint();
    if (!hint) return { ok: false };
    window.PrismBlocks.selectPiece(hint.index);
    const ok = window.PrismBlocks.placeAt(hint.x, hint.y, hint.rotation);
    return { ok, pieces: window.PrismBlocks.game.getState().pieces, score: window.PrismBlocks.game.getState().score };
  })()`);
  check("hinted placement works", played.ok && played.pieces === 1, JSON.stringify(played));
  check("placement awards score", played.score > 0);

  const rotated = await evaluate(`(() => {
    window.PrismBlocks.selectPiece(0);
    const before = window.PrismBlocks.game.getState().tray[0].rotation;
    window.PrismBlocks.rotatePiece();
    return window.PrismBlocks.game.getState().tray[0].rotation !== before;
  })()`);
  check("piece rotation works", rotated === true);

  const painted = await evaluate(`document.getElementById('boardCanvas').toDataURL().length > 1000`);
  check("board canvas painted", painted === true);

  const paused = await evaluate(`(() => {
    document.getElementById('pauseButton').click();
    return window.PrismBlocks.state.paused && !document.getElementById('pauseDialog').classList.contains('hidden');
  })()`);
  check("pause dialog works", paused === true);
  await evaluate(`document.getElementById('resumeButton').click(); window.PrismBlocks.returnToMenu(); document.getElementById('challengesButton').click()`);
  const challenges = await evaluate(`document.getElementById('challengeGrid').children.length`);
  check("30 challenge levels listed", challenges === 30);
  await evaluate(`document.querySelector('[data-close="challengesDialog"]').click()`);

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
  const offline = await evaluate(`!!window.PrismBlocks && !document.getElementById('menuScreen').classList.contains('hidden')`);
  check("offline reload boots", offline === true);
  check("no runtime exceptions", errors.length === 0, errors.slice(0, 2).join(" | "));
} catch (error) {
  failures.push("smoke exception — " + error.message);
  if (errors.length) failures.push("runtime — " + errors.slice(0, 3).join(" | "));
} finally {
  try { browser.close(); } catch { /* Chrome may still be releasing its profile. */ }
}

for (const failure of failures) console.error("FAIL " + failure);
console.log(`prism-blocks smoke: ${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
