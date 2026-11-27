/* Vial Garden — dependency-free browser smoke test. */
import { launch, sleep } from "../tools/cdp.mjs";

const base = (process.argv[2] || "http://localhost:8099/vial-garden-pwa/").replace(/\/$/, "") + "/";
const browser = await launch();
if (!browser) {
  console.log("vial-garden smoke: skipped (no Chromium)");
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
    booted = await evaluate(`!!window.VialGarden`);
    if (booted) break;
    await sleep(100);
  }

  const boot = await evaluate(`(() => ({
    app: !!window.VialGarden,
    menu: !document.getElementById('menuScreen').classList.contains('hidden'),
    manifest: !!document.querySelector('link[rel="manifest"]')
  }))()`);
  check("app booted", boot.app);
  check("menu visible", boot.menu);
  check("manifest linked", boot.manifest);

  const started = await evaluate(`(() => {
    window.VialGarden.startLevel(window.VialGarden.makeLevel(0, 0));
    return { screen: window.VialGarden.state.screen, tubes: window.VialGarden.game.getState().tubes.length };
  })()`);
  check("game screen active", started.screen === "game");
  check("level tubes created", started.tubes === 6);
  await sleep(150);

  const played = await evaluate(`(() => {
    const hint = window.VialGarden.game.hint();
    if (!hint) return { ok: false };
    window.VialGarden.game.select(hint.from);
    const result = window.VialGarden.game.pour(hint.to);
    return { ok: result.ok, moves: window.VialGarden.game.getState().moves };
  })()`);
  check("hinted pour works", played.ok && played.moves === 1, JSON.stringify(played));

  const undone = await evaluate(`(() => {
    document.getElementById('undoButton').click();
    return window.VialGarden.game.getState().moves === 0 && window.VialGarden.game.getState().undosLeft === 4;
  })()`);
  check("undo works", undone === true);

  const boosted = await evaluate(`(() => {
    const before = window.VialGarden.game.getState().tubes.length;
    document.getElementById('extraButton').click();
    const extra = window.VialGarden.game.getState().tubes.length === before + 1;
    document.getElementById('shuffleButton').click();
    return {
      extra,
      shuffle: window.VialGarden.game.getState().shufflesLeft === 1
    };
  })()`);
  check("extra tube booster works", boosted.extra === true);
  check("shuffle booster works", boosted.shuffle === true);

  const painted = await evaluate(`document.getElementById('gameCanvas').toDataURL().length > 1000`);
  check("canvas painted", painted === true);

  const paused = await evaluate(`(() => {
    document.getElementById('pauseButton').click();
    return window.VialGarden.state.paused && !document.getElementById('pauseDialog').classList.contains('hidden');
  })()`);
  check("pause dialog works", paused === true);
  await evaluate(`document.getElementById('resumeButton').click(); window.VialGarden.returnToMenu(); document.getElementById('gardensButton').click()`);
  const gardens = await evaluate(`({ tabs: document.querySelectorAll('#areaTabs button').length, levels: document.getElementById('levelGrid').children.length })`);
  check("ten gardens listed", gardens.tabs === 10);
  check("ten levels per garden listed", gardens.levels === 10);
  await evaluate(`document.querySelector('[data-close="gardensDialog"]').click()`);

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
  const offline = await evaluate(`!!window.VialGarden && !document.getElementById('menuScreen').classList.contains('hidden')`);
  check("offline reload boots", offline === true);
  check("no runtime exceptions", errors.length === 0, errors.slice(0, 2).join(" | "));
} catch (error) {
  failures.push("smoke exception — " + error.message);
  if (errors.length) failures.push("runtime — " + errors.slice(0, 3).join(" | "));
} finally {
  try { browser.close(); } catch { /* Chrome may still be releasing its profile. */ }
}

for (const failure of failures) console.error("FAIL " + failure);
console.log(`vial-garden smoke: ${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
