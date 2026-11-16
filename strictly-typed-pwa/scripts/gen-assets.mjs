/*
 * Generate install screenshots and the social cover.
 * Serve the repo root, then: node strictly-typed-pwa/scripts/gen-assets.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "../../tools/cdp.mjs";
import { NODE_BY_ID, ORDER } from "../src/content.js";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const base = process.argv[2] || "http://localhost:8099/strictly-typed-pwa/";
const browser = await launch();
if (!browser) {
  console.log("No Chromium found; screenshots skipped.");
  process.exit(0);
}
const { cdp, sessionId } = browser;
await cdp.send("Page.enable", {}, sessionId);
await cdp.send("Runtime.enable", {}, sessionId);

async function ev(expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  return result.result?.value;
}
async function shot(name) {
  const result = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
  mkdirSync(dirname(name), { recursive: true });
  writeFileSync(name, Buffer.from(result.data, "base64"));
  console.log("ok", name);
}
async function viewport(width, height, mobile = true) {
  await cdp.send(
    "Emulation.setDeviceMetricsOverride",
    { width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height },
    sessionId
  );
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
  await ev(`localStorage.setItem('strictlyTyped.v1', ${JSON.stringify(JSON.stringify(state))})`);
}
async function load(path) {
  await cdp.send("Page.navigate", { url: `${base}?shot=${Date.now()}${path}` }, sessionId);
  await sleep(1000);
  await ev("window.scrollTo(0,0)");
}

await viewport(390, 844);
await cdp.send("Page.navigate", { url: base }, sessionId);
await sleep(800);
await seed(["1-1", "1-2", "1-3", "boss-1", "2-1", "2-2", "2-3"]);
await load("#/map");
await shot(join(here, "shots/map.png"));

await seed(["1-1"]);
await load("#/play/1-2");
await ev("document.querySelector('[data-begin]')?.click()");
await sleep(450);
const solution = NODE_BY_ID.get("1-2").puzzle.solution;
for (const line of solution.slice(0, 4)) {
  await ev(`(() => {
    const wanted = ${JSON.stringify(line.trim())};
    const card = [...document.querySelectorAll('[data-card]')].find(b => b.querySelector('code')?.innerText.trim() === wanted);
    if (card) { card.click(); return true; }
    return false;
  })()`);
  await sleep(160);
}
await ev("window.scrollTo(0,0)");
await sleep(200);
await shot(join(here, "shots/rite.png"));

await viewport(1280, 800, false);
await seed(["1-1", "1-2", "1-3", "boss-1", "2-1", "2-2", "2-3", "boss-2", "3-1", "3-2"]);
await load("#/");
await shot(join(here, "shots/desktop.png"));

await viewport(1200, 630, false);
await cdp.send("Page.navigate", { url: `${base}scripts/og.html?shot=${Date.now()}` }, sessionId);
await sleep(700);
await shot(join(here, "og-cover.png"));

try { browser.close(); } catch { /* Chromium cache race on exit */ }
