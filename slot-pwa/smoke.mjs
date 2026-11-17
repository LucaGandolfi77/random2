/*
 * Headless smoke test for the Lucky Seven Slot Arcade.
 *
 *   python3 -m http.server 8099 --directory .
 *   node slot-pwa/smoke.mjs http://localhost:8099/slot-pwa/
 */
import { launch, sleep } from '../tools/cdp.mjs';

const url = process.argv[2] || 'http://localhost:8099/slot-pwa/';
const browser = await launch();
if (!browser) { console.log('SMOKE SKIPPED — no Chromium found.'); process.exit(0); }

const { cdp, sessionId } = browser;
let checks = 0, failures = 0;
const errors = [];
const ok = (cond, label, extra) => {
  checks++;
  if (cond) console.log('  ok   ' + label);
  else { failures++; console.log('  FAIL ' + label + (extra === undefined ? '' : `  (${extra})`)); }
};

cdp.on('Runtime.exceptionThrown', (p) => {
  const t = p.exceptionDetails?.exception?.description || p.exceptionDetails?.text;
  if (t) errors.push(t);
});

const send = (method, params = {}) => cdp.send(method, params, sessionId);
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
}
async function waitFor(expression, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { if (await evaluate(expression)) return true; } catch (e) { /* navigating */ }
    await sleep(90);
  }
  return false;
}

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url });

  ok(await waitFor('!!window.__slot'), 'game boots');
  ok(await evaluate('document.getElementById("game-canvas").width === 540'), 'canvas logical size');
  ok(await evaluate('window.__slot.machines.length === 8'), 'eight machines registered');
  ok(await evaluate('window.__slot.state().credits === 1000'), 'starting credits');

  // Click the welcome CTA like a real user (regression: unbound close action).
  await evaluate('document.querySelector("#panel-body [data-action=\'close\']").click()');
  ok(await evaluate('document.getElementById("panel-overlay").classList.contains("hidden")'), 'welcome CTA closes panel');
  await evaluate('window.__slot.action("lobby")');
  ok(await evaluate('!document.getElementById("lobby-overlay").classList.contains("hidden")'), 'lobby opens');
  ok(await evaluate('document.querySelectorAll(".machine-card").length === 8'), 'lobby lists eight machines');
  ok(await evaluate('document.querySelectorAll(".machine-card.locked").length === 6'), 'six machines locked at VIP 1');

  await evaluate('window.__slot.action("selectMachine"); window.__slot.action("togglePractice")');
  ok(await evaluate('window.__slot.practice() === true'), 'practice mode toggles');
  await evaluate('window.__slot.action("togglePractice"); window.__slot.action("close")');

  await evaluate('window.__slot.action("paytable")');
  ok(await evaluate('document.getElementById("panel-title").textContent.includes("Paytable")'), 'paytable panel');
  await evaluate('window.__slot.action("close")');

  await evaluate('window.__slot.action("stats")');
  ok(await evaluate('document.getElementById("panel-title").textContent === "Your Stats"'), 'stats panel');
  await evaluate('window.__slot.action("close")');

  await evaluate('window.__slot.action("collections")');
  ok(await evaluate('document.getElementById("panel-title").textContent === "Symbol Collections"'), 'collections panel');
  await evaluate('window.__slot.action("close")');

  await evaluate('window.__slot.action("bet")');
  ok(await evaluate('window.__slot.state().betIndex === 2'), 'bet cycles');
  await evaluate('window.__slot.action("lines")');
  ok(await evaluate('window.__slot.state().linesIndex === 0'), 'lines cycle');

  const before = await evaluate('window.__slot.state().credits');
  await evaluate('window.__slot.action("spin")');
  ok(await waitFor('window.__slot.state().stats.spins >= 1', 15000), 'spin resolves');
  ok(await evaluate('window.__slot.state().credits !== 1000'), 'economy changes on spin', before);
  ok(await evaluate('window.__slot.state().stats.totalWagered > 0'), 'wager recorded');
  ok(await evaluate('window.__slot.state().xp > 0'), 'XP earned');

  await evaluate('window.__slot.action("daily")');
  ok(await evaluate('window.__slot.state().daily.last.length === 10'), 'daily bonus claimed');
  await evaluate('document.querySelector("#panel-body [data-action=\'close\']").click()');
  ok(await evaluate('document.getElementById("panel-overlay").classList.contains("hidden")'), 'daily CTA closes panel');

  await evaluate('window.__slot.action("challenge")');
  ok(await evaluate('window.__slot.mode() === "challenge"'), 'daily challenge starts');
  let challengeDone = false;
  for (let i = 0; i < 320; i++) {
    if (await evaluate('window.__slot.mode() === "normal"')) { challengeDone = true; break; }
    await evaluate('document.getElementById("panel-overlay").classList.contains("hidden") || window.__slot.action("close")');
    await sleep(150);
  }
  ok(challengeDone, 'daily challenge completes');
  ok(await evaluate('window.__slot.state().stats.challenges === 1'), 'challenge recorded');
  await evaluate('window.__slot.action("close")');

  // Mode tabs
  await evaluate('window.__slot.action("lobby")');
  ok(await evaluate('document.querySelectorAll(".mode-tab").length === 6'), 'six lobby mode tabs');
  await evaluate('window.__slot.action("modeTab", {tab:"quest"})');
  ok(await evaluate('document.querySelectorAll(".quest-card").length >= 9'), 'quest board renders stages');
  await evaluate('window.__slot.action("activateQuest", {id:"q1"})');
  ok(await evaluate('window.__slot.state().modes.quest.active === "q1"'), 'quest activates');
  await evaluate('window.__slot.action("modeTab", {tab:"profile"})');
  ok(await evaluate('document.querySelectorAll(".trophy").length >= 11'), 'trophy gallery renders');
  await evaluate('window.__slot.action("modeTab", {tab:"tournament"})');
  ok(await evaluate('document.querySelectorAll("[data-action=\'startMode\']").length >= 2'), 'tournament machine list');

  // Tournament (fast-forward the last spin)
  await evaluate('window.__slot.action("startMode", {mode:"tournament", machine:"lucky-seven"})');
  ok(await evaluate('window.__slot.mode() === "tournament"'), 'tournament starts');
  await sleep(1500);
  await evaluate('if (window.__slot.modeSession()) window.__slot.modeSession().spinsLeft = 1');
  await evaluate('document.getElementById("panel-overlay").classList.contains("hidden") || window.__slot.action("close")');
  ok(await waitFor('Object.keys(window.__slot.state().modes.tournament.results).length > 0', 15000), 'tournament finishes');
  await evaluate('window.__slot.action("close")');

  // Spin Rush (fast-forward the timer)
  await evaluate('window.__slot.action("lobby"); window.__slot.action("modeTab", {tab:"rush"}); window.__slot.action("startMode", {mode:"rush"})');
  ok(await evaluate('window.__slot.mode() === "rush"'), 'rush starts');
  await sleep(900);
  await evaluate('if (window.__slot.modeSession()) { window.__slot.modeSession().startedAt -= 61000; window.__slot.modeSession().score = 6000; }');
  ok(await waitFor('window.__slot.state().modes.rush.runs > 0', 12000), 'rush finishes');
  ok(await evaluate('window.__slot.state().trophies.includes("rush")'), 'rush trophy awarded');
  await evaluate('window.__slot.action("close")');

  await send('Network.enable');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send('Page.navigate', { url });
  ok(await waitFor('!!window.__slot', 12000), 'offline reload boots');
  ok(await evaluate('navigator.onLine === false'), 'offline detected');
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  ok(errors.length === 0, 'no uncaught page errors', errors.slice(0, 2).join(' | '));
} catch (err) {
  failures++;
  console.log('  FAIL smoke threw: ' + err.message);
} finally {
  console.log(`\n${checks - failures}/${checks} checks passed`);
  browser.close();
  process.exit(failures ? 1 : 0);
}
