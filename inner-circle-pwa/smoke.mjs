/*
 * Inner Circle — in-browser smoke test
 *
 *   node inner-circle-pwa/smoke.mjs [base-url]
 *
 * Drives the real page over the DevTools Protocol using the repository's
 * dependency-free browser helper. It skips cleanly when no Chromium is
 * available, like the other browser tests here.
 */
import { fileURLToPath } from "node:url";
import { launch, sleep } from "../tools/cdp.mjs";

const base = (process.argv[2] || "http://localhost:8099/inner-circle-pwa/").replace(/\/$/, "") + "/";
if (typeof WebSocket === "undefined") {
  process.stdout.write("inner-circle smoke: skipped (this Node has no global WebSocket)\n");
  process.exit(0);
}
const browser = await launch();
if (!browser) {
  process.stdout.write("inner-circle smoke: skipped (no Chromium found)\n");
  process.exit(0);
}

const { cdp, sessionId } = browser;
const failures = [];
let passed = 0;

function check(name, ok, detail) {
  if (ok) passed++;
  else failures.push(name + (detail ? " — " + detail : ""));
}

const pageErrors = [];
const cdpErrors = [];

cdp.on("Runtime.exceptionThrown", (event) => {
  pageErrors.push(event.exceptionDetails?.exception?.description || event.exceptionDetails?.text || "exception");
});
cdp.on("Runtime.consoleAPICalled", (event) => {
  if (event.type !== "error") return;
  const text = event.args.map((arg) => arg.value ?? arg.description ?? "").join(" ");
  if (!/navigator\.vibrate/i.test(text)) pageErrors.push("console: " + text);
});
cdp.on("Log.entryAdded", (event) => {
  if (event.entry?.level !== "error") return;
  const text = event.entry.text || "";
  if (/navigator\.vibrate/i.test(text)) return;
  cdpErrors.push(text);
});

async function send(method, params = {}) {
  return cdp.send(method, params, sessionId);
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result?.value;
}

async function waitFor(expression, timeout = 8000, every = 120) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(expression).catch(() => false)) return true;
    await sleep(every);
  }
  return false;
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("DOM.enable");
  await send("Log.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  const loaded = cdp.once("Page.loadEventFired");
  await send("Page.navigate", { url: base });
  await Promise.race([loaded, sleep(12000)]);
  const booted = await waitFor("!!window.InnerCircle && !!window.R2", 8000);
  check("page boots with the shared arcade library", booted);

  const boot = await evaluate(`({
    title: document.title,
    cast: document.querySelectorAll('.cast-item').length,
    badges: document.querySelectorAll('.badge-item').length,
    manifest: !!document.querySelector('link[rel="manifest"]'),
    screen: document.querySelector('.screen.is-active')?.id,
    sound: !!window.R2.getSettings,
    nextCanvas: !!document.getElementById('nextPreview'),
    overflow: document.documentElement.scrollWidth - window.innerWidth
  })`);
  check("eleven cast tiers render", boot.cast === 11, String(boot.cast));
  check("ten achievement badges render", boot.badges === 10, String(boot.badges));
  check("manifest is linked", boot.manifest);
  check("home screen is active", boot.screen === "homeScreen", boot.screen);
  check("no horizontal overflow on a phone", boot.overflow <= 0, String(boot.overflow));

  /* The actual photo pipeline: make sure the multi-file input reaches the
     crop/compress/storage code, not just that the card exists. */
  await evaluate("document.getElementById('btnSquad').click(); true");
  await sleep(250);
  const squadState = await evaluate(`({
    cards: document.querySelectorAll('.squad-card').length,
    screen: document.querySelector('.screen.is-active')?.id
  })`);
  check("photo booth opens with eleven slots", squadState.cards === 11, String(squadState.cards));
  check("photo booth screen is active", squadState.screen === "squadScreen", squadState.screen);

  const root = await send("DOM.getDocument");
  const input = await send("DOM.querySelector", { nodeId: root.root.nodeId, selector: "#multiUpload" });
  if (input.nodeId) {
    await send("DOM.setFileInputFiles", {
      nodeId: input.nodeId,
      files: [fileURLToPath(new URL("../icons/icon-192.png", import.meta.url))],
    });
    await sleep(1200);
    const photo = await evaluate(`({
      custom: window.InnerCircle.getSquad().filter((s) => s.photo).length,
      cards: document.querySelectorAll('.squad-photo-dot').length,
      status: document.getElementById('squadStatus').textContent
    })`);
    check("a photo is cropped and stored locally", photo.custom >= 1 && photo.cards >= 1, JSON.stringify(photo));
    check("photo status reports local storage", /saved in this browser/i.test(photo.status), photo.status);
  }

  await evaluate("document.getElementById('btnSquadDone').click(); true");
  await sleep(250);
  await evaluate("document.getElementById('btnPlay').click(); true");
  const tutorial = await waitFor("!document.getElementById('helpModal').hidden", 3000);
  check("first run opens the tutorial", tutorial);
  if (tutorial) {
    await evaluate("document.getElementById('btnHelpPlay').click(); true");
    await sleep(300);
  }

  const started = await evaluate(`({
    screen: document.querySelector('.screen.is-active')?.id,
    paused: !document.getElementById('pauseModal').hidden,
    state: window.InnerCircle.getState(),
    canvasPainted: document.getElementById('gameCanvas').toDataURL().length > 10000
  })`);
  check("game screen starts", started.screen === "gameScreen", started.screen);
  check("game loop has a state with a queue", started.state && started.state.discs.length === 0);
  check("canvas is painted", started.canvasPainted);

  const merge = await evaluate(`(() => {
    const engine = window.InnerCircle.getEngine();
    engine.state.currentTier = 0;
    engine.state.nextTier = 0;
    engine.drop(200);
    for (let i = 0; i < 100; i++) engine.tick(1 / 60);
    engine.drop(200);
    for (let i = 0; i < 120; i++) engine.tick(1 / 60);
    return {
      score: engine.state.score,
      merges: engine.state.merges,
      top: engine.state.maxTier,
      discs: engine.state.discs.length
    };
  })()`);
  check("two matching friends merge", merge.merges >= 1 && merge.top >= 1, JSON.stringify(merge));
  check("merge awards score", merge.score > 0, String(merge.score));

  await sleep(500);
  const hud = await evaluate(`({
    score: document.getElementById('gameScore').textContent,
    next: document.getElementById('nextPreview').toDataURL().length > 200,
    board: document.getElementById('gameCanvas').toDataURL().length > 10000
  })`);
  check("HUD reflects the score", Number(hud.score.replace(/,/g, "")) > 0, hud.score);
  check("next preview is painted", hud.next);
  check("game canvas is still painted after merging", hud.board);

  const chat = await evaluate(`({
    toggle: !!document.getElementById('btnChatToggle'),
    log: document.getElementById('chatLog').textContent.trim(),
    pop: document.getElementById('chatPop').textContent.trim()
  })`);
  check("group chat panel is present", chat.toggle);
  check("group chat has a voice", chat.log.length > 5, chat.log.slice(0, 60));

  await evaluate(`(() => {
    const engine = window.InnerCircle.getEngine();
    engine.state.hype = 100;
    engine.usePower('plus');
    return true;
  })()`);
  await sleep(150);
  check("Plus One arms a wildcard", await evaluate("window.InnerCircle.getState().heldWildcard === true"));

  /* End the run through the public event path and make sure the result modal,
     progress save and leaderboard write all happen. */
  const over = await evaluate(`(() => {
    const engine = window.InnerCircle.getEngine();
    engine.state.config.dangerLimit = 0.2;
    engine.state.config.dangerGrace = 0.01;
    engine.state.discs.push({
      id: 9999, tier: 10, wildcard: false, radius: 107,
      x: 200, y: 112, vx: 0, vy: 0, age: 2, touched: true,
      cooldown: 0, dropId: 9, spin: 0, squash: 0, dying: false,
      bornAt: 0, merged: false
    });
    for (let i = 0; i < 30; i++) engine.tick(1 / 60);
    return engine.state.status;
  })()`);
  check("danger line ends the run", over === "over", String(over));
  const resultOpen = await waitFor("!document.getElementById('resultModal').hidden", 3000);
  check("results modal opens", resultOpen);
  if (resultOpen) {
    const result = await evaluate(`({
      score: document.getElementById('resultScore').textContent,
      tier: document.getElementById('resultTier').textContent,
      best: !document.getElementById('resultBestTag').hidden,
      progress: JSON.parse(localStorage.getItem('inner-circle-progress-v1') || '{}')
    })`);
    check("result score is present", Number(result.score.replace(/,/g, "")) > 0, result.score);
    check("personal best is recorded", result.best);
    check("run is saved locally", (result.progress.runs || 0) >= 1 && (result.progress.hall || []).length >= 1);
    check("run history is saved", (result.progress.history || []).length >= 1);
    check("tier merge stats are saved", !!result.progress.tierMerges && Object.keys(result.progress.tierMerges).length >= 1);

    /* A dare link is the run's seed plus a target and a display name. */
    await evaluate("document.getElementById('btnDare').click(); true");
    await sleep(250);
    const dare = await evaluate(`({
      open: !document.getElementById('dareModal').hidden,
      link: document.getElementById('dareLink').value,
      name: document.getElementById('darePlayerName').value
    })`);
    check("dare modal opens", dare.open);
    check("dare link contains a challenge code", /[?&]dare=[A-Za-z0-9_-]+/.test(dare.link), dare.link.slice(0, 70));
    check("dare has a display name", dare.name.length > 0, dare.name);
    await evaluate("document.querySelector('#dareModal [data-close]').click(); true");
    await sleep(150);

    await evaluate("document.getElementById('btnResultHome').click(); true");
    await sleep(300);
    await evaluate("document.getElementById('btnYearbook').click(); true");
    await sleep(350);
    const yearbook = await evaluate(`({
      screen: document.querySelector('.screen.is-active')?.id,
      summary: document.querySelectorAll('.yb-stat').length,
      superlatives: document.querySelectorAll('.superlative-card').length,
      memories: document.querySelectorAll('.memory-card').length,
      wrapped: !document.getElementById('btnShareWrapped').disabled
    })`);
    check("yearbook opens", yearbook.screen === "yearbookScreen", yearbook.screen);
    check("yearbook shows totals and awards", yearbook.summary === 4 && yearbook.superlatives === 6);
    check("yearbook keeps the run in the memory wall", yearbook.memories >= 1, String(yearbook.memories));
    check("circle wrapped can be shared", yearbook.wrapped);
  }

  check("no page errors", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
  check("no browser log errors", cdpErrors.length === 0, cdpErrors.slice(0, 2).join(" | "));
} catch (e) {
  failures.push("smoke crashed — " + (e && e.message ? e.message : String(e)));
} finally {
  browser.close();
}

for (const failure of failures) console.error("FAIL " + failure);
process.stdout.write(`inner-circle smoke: ${passed} passed, ${failures.length} failed\n`);
process.exit(failures.length ? 1 : 0);
