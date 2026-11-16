/*
 * In-browser smoke test for STRICTLY TYPED.
 *
 *   python3 -m http.server 8099          # from the repository root
 *   node strictly-typed-pwa/smoke.mjs    # optional URL as first argument
 *
 * Skips cleanly when no Chromium is available, like the other PWAs here.
 */
import { launch, sleep } from "../tools/cdp.mjs";
import { NODE_BY_ID, ORDER } from "./src/content.js";

const requested = process.argv[2] || "http://localhost:8099/strictly-typed-pwa/";
const url = /\/strictly-typed-pwa\/?$/.test(requested)
  ? requested.replace(/\/?$/, "/")
  : requested.replace(/\/?$/, "/") + "strictly-typed-pwa/";
const browser = await launch();
if (!browser) {
  console.log("SMOKE SKIPPED — no Chromium found.");
  process.exit(0);
}

const { cdp, sessionId } = browser;
let checks = 0;
let failures = 0;
const errors = [];

cdp.on("Runtime.exceptionThrown", (params) => {
  errors.push(params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || "uncaught exception");
});
cdp.on("Runtime.consoleAPICalled", (params) => {
  if (params.type === "error") errors.push(params.args.map((arg) => arg.value || arg.description).join(" "));
});

function ok(condition, label, extra) {
  checks++;
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${extra === undefined ? "" : `  (${extra})`}`);
  }
}

async function evaluate(expression) {
  const result = await cdp.send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result?.value;
}

async function load(hash = "") {
  await cdp.send("Page.navigate", { url: `${url}?smoke=${Date.now()}${hash}` }, sessionId);
  await sleep(900);
}

async function seed(ids, endings = []) {
  const completed = {};
  for (const id of ids) completed[id] = { stars: 3, mistakes: 0, hints: 0 };
  const state = {
    version: 1,
    started: true,
    completed,
    fragments: ids,
    endings,
    settings: { sound: false, haptics: false, reduceMotion: true },
    installDismissed: true
  };
  await evaluate(`localStorage.setItem('strictlyTyped.v1', ${JSON.stringify(JSON.stringify(state))})`);
}

async function screenInfo() {
  return evaluate(`({
    screen: document.body.dataset.screen,
    h1: document.querySelector('h1')?.innerText?.replace(/\\n/g, ' / ') || "",
    overflow: document.documentElement.scrollWidth - innerWidth,
    actbar: (() => {
      const bar = document.querySelector('.actbar');
      if (!bar) return null;
      const r = bar.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight };
    })()
  })`);
}

async function clickLine(text) {
  return evaluate(`(() => {
    const wanted = ${JSON.stringify(text.trim())};
    const card = [...document.querySelectorAll('[data-card]')].find(
      (button) => button.querySelector('code')?.innerText.trim() === wanted
    );
    if (!card) return false;
    card.click();
    return true;
  })()`);
}

await cdp.send("Page.enable", {}, sessionId);
await cdp.send("Runtime.enable", {}, sessionId);
await cdp.send("Network.enable", {}, sessionId);
await cdp.send(
  "Emulation.setDeviceMetricsOverride",
  { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, screenWidth: 390, screenHeight: 844 },
  sessionId
);

console.log("\nSTRICTLY TYPED — browser smoke\n");

await load();
ok((await screenInfo()).screen === "title", "boots to the title screen");
ok((await screenInfo()).overflow === 0, "title has no horizontal overflow");
ok(await evaluate(`!!document.querySelector('[data-primary]')`), "the primary inspection button is present");

await evaluate(`document.querySelector('[data-primary]')?.click()`);
await sleep(500);
ok((await screenInfo()).screen === "intro", "the prologue opens");
ok(await evaluate(`!!document.querySelector('[data-enter]')`), "the prologue has a way into the House");

await evaluate(`document.querySelector('[data-enter]')?.click()`);
await sleep(600);
ok((await screenInfo()).screen === "map", "the inspection map opens");
ok((await screenInfo()).overflow === 0, "the map has no horizontal overflow");
ok(await evaluate(`document.querySelectorAll('[data-node]').length === 20`), "all twenty nodes are listed");
ok(await evaluate(`document.querySelector('[data-node="1-1"]')?.getAttribute('aria-disabled') === 'false'`), "the first declaration is unlocked");
ok(await evaluate(`document.querySelector('[data-node="1-2"]')?.getAttribute('aria-disabled') === 'true'`), "the second declaration starts locked");

await evaluate(`document.querySelector('[data-node="1-1"]')?.click()`);
await sleep(450);
ok((await screenInfo()).h1.includes("Hello"), "the first lesson opens");
const briefBar = await screenInfo();
ok(briefBar.actbar && briefBar.actbar.bottom <= briefBar.actbar.vh + 1, "the lesson action bar is fixed on screen");

await evaluate(`document.querySelector('[data-begin]')?.click()`);
await sleep(400);
ok(await evaluate(`!!document.querySelector('[data-card]')`), "the rite deals code cards");
ok(await evaluate(`document.querySelector('[data-run]')?.disabled === true`), "RUN is disabled until the rite is complete");

const firstSolution = NODE_BY_ID.get("1-1").puzzle.solution;
await evaluate(`(() => {
  const cards = [...document.querySelectorAll('[data-card]')];
  const wrong = cards.find((button) => button.querySelector('code')?.innerText.trim() !== ${JSON.stringify(
    firstSolution[0].trim()
  )});
  wrong?.click();
  return !!wrong;
})()`);
await sleep(200);
ok(await evaluate(`!!document.querySelector('.feedback--error')`), "a wrong line produces a diagnostic");
ok(await evaluate(`document.querySelector('.rite-stats')?.innerText.includes('MISTAKES 1')`), "the mistake counter updates");

await evaluate(`document.querySelector('[data-hint]')?.click()`);
await sleep(250);
ok(await evaluate(`!!document.querySelector('.pool-card.is-hinted')`), "the hint reveals the next line's card");
ok(await evaluate(`document.querySelector('.hint-btn')?.innerText.includes('2')`), "the hint budget updates");

for (const line of firstSolution) {
  await clickLine(line);
  await sleep(100);
}
ok(await evaluate(`document.querySelector('[data-run]')?.disabled === false`), "RUN enables when the rite is complete");
await evaluate(`document.querySelector('[data-run]')?.click()`);
await sleep(800);
ok((await screenInfo()).h1.includes("rite holds"), "the compiled result opens");
ok(await evaluate(`document.querySelectorAll('.result-stars .star.is-on').length >= 1`), "the result shows stars");
ok(
  await evaluate(`(() => {
    const state = JSON.parse(localStorage.getItem('strictlyTyped.v1'));
    return !!state.completed['1-1'] && state.fragments.includes('1-1');
  })()`),
  "stars and the field note persist"
);
ok((await screenInfo()).actbar && (await screenInfo()).actbar.bottom <= 845, "the result action bar is fixed on screen");

await evaluate(`document.querySelector('[data-next]')?.click()`);
await sleep(500);
ok((await screenInfo()).h1.includes("A Name"), "NEXT moves to the next declaration");

await cdp.send("Page.reload", {}, sessionId);
await sleep(900);
ok(
  await evaluate(`JSON.parse(localStorage.getItem('strictlyTyped.v1')).completed['1-1'] !== undefined`),
  "progress survives a reload"
);

/* --------------------------------------------------------------------------
 * Boss: fail once, retry, then close the audit.
 * ----------------------------------------------------------------------- */
await seed(["1-1", "1-2", "1-3"]);
await load("#/play/boss-1");
await sleep(300);
ok((await screenInfo()).h1 === "THE NULL", "the chapter audit briefing opens");
await evaluate(`document.querySelector('[data-face]')?.click()`);
await sleep(350);
ok(await evaluate(`document.querySelectorAll('.heart.is-full').length === 3`), "the audit starts with three hearts");

const boss = NODE_BY_ID.get("boss-1");
for (let i = 0; i < 3; i++) {
  const round = boss.rounds[i];
  const correct = round.type === "find" ? round.fault : round.answer;
  const total = round.type === "find" ? round.lines.length : round.options.length;
  const wrong = [...Array(total).keys()].find((n) => n !== correct);
  await evaluate(`document.querySelector('[data-boss-choice="${wrong}"]')?.click()`);
  await sleep(220);
  if (i < 2) {
    await evaluate(`document.querySelector('[data-boss-next]')?.click()`);
    await sleep(320);
  }
}
ok(await evaluate(`!!document.querySelector('.boss-failure')`), "three wrong answers exhaust the hearts");
ok(await evaluate(`document.querySelector('[data-boss-next]')?.innerText.includes('RECOMPILE')`), "the audit offers a retry");
await evaluate(`document.querySelector('[data-boss-next]')?.click()`);
await sleep(350);
ok(
  await evaluate(
    `document.querySelectorAll('.heart.is-full').length === 3 && document.querySelector('.round-count')?.innerText.includes('1 / 5')`
  ),
  "retry resets hearts and round"
);

for (let i = 0; i < boss.rounds.length; i++) {
  const round = boss.rounds[i];
  const correct = round.type === "find" ? round.fault : round.answer;
  await evaluate(`document.querySelector('[data-boss-choice="${correct}"]')?.click()`);
  await sleep(200);
  await evaluate(`document.querySelector('[data-boss-next]')?.click()`);
  await sleep(300);
}
ok((await screenInfo()).h1.includes("quiet"), "the boss victory screen opens");
ok(await evaluate(`document.querySelectorAll('.result-stars .star.is-on').length === 3`), "a flawless audit earns three stars");
ok(
  await evaluate(`(() => {
    const state = JSON.parse(localStorage.getItem('strictlyTyped.v1'));
    return !!state.completed['boss-1'] && state.fragments.includes('boss-1');
  })()`),
  "the boss field note persists"
);

/* --------------------------------------------------------------------------
 * Reference, Book and Settings.
 * ----------------------------------------------------------------------- */
await load("#/codex");
ok((await screenInfo()).screen === "codex" && (await screenInfo()).h1 === "THE CODEX", "the Codex opens");
ok(await evaluate(`document.querySelectorAll('.codex-entry').length === 15`), "the Codex contains all fifteen concepts");
await evaluate(`document.querySelector('.codex-entry')?.setAttribute('open','')`);
await sleep(150);
ok(await evaluate(`document.querySelector('.codex-entry[open] .codex-body')?.innerText.length > 100`), "a Codex entry expands");

await load("#/book");
ok((await screenInfo()).screen === "book" && (await screenInfo()).h1.includes("BOOK"), "the Book of Declarations opens");
ok(await evaluate(`document.querySelectorAll('.fragment-card').length === 20`), "the Book lists twenty field notes");
ok(await evaluate(`document.querySelectorAll('.ending-card').length === 4`), "the Book lists four endings");

await load("#/settings");
ok((await screenInfo()).screen === "settings" && (await screenInfo()).h1 === "SETTINGS", "settings open");
ok(await evaluate(`!!document.querySelector('[data-setting="sound"]') && !!document.querySelector('[data-setting="haptics"]')`), "feedback settings are present");
await evaluate(`document.querySelector('[data-setting="sound"]')?.click()`);
await sleep(100);
ok(await evaluate(`JSON.parse(localStorage.getItem('strictlyTyped.v1')).settings.sound === true`), "a setting toggle persists");

/* --------------------------------------------------------------------------
 * Finale, secret ending, responsive layouts.
 * ----------------------------------------------------------------------- */
await seed(ORDER, []);
await load("#/finale");
ok((await screenInfo()).screen === "finale", "the last question opens with every fragment");
ok(await evaluate(`document.querySelectorAll('[data-ending]').length === 4`), "the secret answer appears with all twenty fragments");
await evaluate(`document.querySelector('[data-ending="gnat"]')?.click()`);
await sleep(800);
ok((await screenInfo()).screen === "ending" && (await screenInfo()).h1.includes("Debugger"), "the secret ending opens");
ok(await evaluate(`JSON.parse(localStorage.getItem('strictlyTyped.v1')).endings.includes('gnat')`), "the ending is recorded");

await cdp.send(
  "Emulation.setDeviceMetricsOverride",
  { width: 320, height: 700, deviceScaleFactor: 2, mobile: true, screenWidth: 320, screenHeight: 700 },
  sessionId
);
for (const route of ["#/", "#/map", "#/codex", "#/book", "#/settings", "#/play/1-1", "#/play/boss-1", "#/finale", "#/ending/gnat"]) {
  await load(route);
  const info = await screenInfo();
  ok(info.overflow <= 1, `320px layout is clean at ${route}`, `${info.overflow}px overflow`);
}

/* --------------------------------------------------------------------------
 * PWA contract and offline reload.
 * ----------------------------------------------------------------------- */
await cdp.send(
  "Emulation.setDeviceMetricsOverride",
  { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, screenWidth: 390, screenHeight: 844 },
  sessionId
);
await load("#/");
for (let i = 0; i < 24; i++) {
  if (await evaluate(`!!navigator.serviceWorker?.controller`)) break;
  await sleep(250);
}
ok(await evaluate(`!!navigator.serviceWorker?.controller`), "the service worker controls the page");
ok(await evaluate(`(async () => (await caches.keys()).includes('strictly-typed-pwa-v1'))()`), "the app shell is precached");
const manifest = await cdp.send("Page.getAppManifest", {}, sessionId);
ok(Array.isArray(manifest.errors) && manifest.errors.length === 0, "the web app manifest has no errors");
const icons = await evaluate(`Promise.all([
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'shots/map.png', 'shots/rite.png', 'og-cover.png'
].map(async (path) => (await fetch(path)).ok))`);
ok(icons.every(Boolean), "all install icons and screenshots are served");

await evaluate(`location.hash = '#/'`);
await sleep(250);
await cdp.send(
  "Network.emulateNetworkConditions",
  { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
  sessionId
);
await cdp.send("Page.reload", {}, sessionId);
await sleep(1200);
ok((await screenInfo()).screen === "title", "the game reloads offline from cache");
ok((await screenInfo()).h1.includes("STRICTLY"), "the offline title screen renders");
await cdp.send(
  "Network.emulateNetworkConditions",
  { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
  sessionId
);

console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} checks passed`);
if (errors.length) {
  console.log(`Console errors (${errors.length}):`);
  for (const error of errors.slice(0, 8)) console.log("  -", error.split("\n")[0]);
}
else console.log("No console errors.");

try {
  browser.close();
} catch {
  /* Chromium occasionally loses the cache flush race on exit. */
}
process.exit(failures === 0 && errors.length === 0 ? 0 : 1);
