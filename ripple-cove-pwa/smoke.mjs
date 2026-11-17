/*
 * Ripple Cove — in-browser smoke test (self-contained).
 *
 * Starts a tiny static server, launches headless Chromium via tools/cdp.mjs,
 * and drives the real game: onboarding, cast, bite, reel battle, catch card,
 * every panel, language switch and the cabin view. Fails on page errors.
 *
 *   node ripple-cove-pwa/smoke.mjs
 */
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { launch, sleep } from "../tools/cdp.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json"
};

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let path = join(root, url);
    if (!path.startsWith(root)) { res.writeHead(403).end(); return; }
    if (url === "/" || url.endsWith("/")) {
      const idx = await readFile(join(path, "index.html")).catch(() => null);
      if (idx) { res.writeHead(200, { "Content-Type": "text/html" }).end(idx); return; }
    }
    const stat = await readFile(path).catch(() => null);
    if (!stat) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[extname(path)] || "application/octet-stream" }).end(stat);
  } catch { res.writeHead(500).end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/ripple-cove-pwa/`;

const browser = await launch();
if (!browser) { console.log("SMOKE SKIPPED — no Chromium found."); server.close(); process.exit(0); }
const { cdp, sessionId } = browser;
let checks = 0, failures = 0;
const errors = [];
const ok = (cond, label, extra) => {
  checks++;
  if (cond) console.log("  ok   " + label);
  else { failures++; console.log("  FAIL " + label + (extra === undefined ? "" : `  (${extra})`)); }
};
const send = (method, params = {}) => cdp.send(method, params, sessionId);
async function ev(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
}
async function waitFor(expression, timeout = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (await ev(expression)) return true; } catch { /* navigating */ }
    await sleep(80);
  }
  return false;
}
const shotDir = join(tmpdir(), "ripple-cove-smoke");
await mkdir(shotDir, { recursive: true });
async function shot(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  if (r.data) { const p = join(shotDir, name); await writeFile(p, Buffer.from(r.data, "base64")); console.log("  shot " + p); }
}

cdp.on("Runtime.exceptionThrown", (p) => {
  const t = p.exceptionDetails?.exception?.description || p.exceptionDetails?.text;
  if (t) errors.push(t);
});
cdp.on("Log.entryAdded", (p) => {
  if (p.entry?.level === "error") errors.push(p.entry.text);
});

try {
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.navigate", { url });

  // ── boot + onboarding ──
  ok(await waitFor("!!window.__ripple"), "game boots");
  ok(await ev("window.__ripple.state().coins === 40"), "starting coins");
  ok(await ev("getComputedStyle(document.getElementById('view-cabin')).display === 'none'"), "hidden view stays hidden");
  ok(await ev("!document.getElementById('p-hello').hidden"), "onboarding shown on first run");
  await shot("01-onboarding.png");
  await ev("document.getElementById('hello-go').click()");
  ok(await ev("document.getElementById('p-hello').hidden"), "onboarding dismissed");
  ok(await ev("document.getElementById('scene').width > 0 && document.getElementById('scene').height > 0"), "canvas sized");
  await shot("02-scene.png");

  // ── cast → bite → battle → catch ──
  await ev("window.__ripple.cast()");
  ok(await ev("window.__ripple.phase() === 'wait'"), "cast enters wait phase");
  ok(await ev("window.__ripple.state().stats.casts === 1"), "cast counted");
  await ev("window.__ripple.forceBite()");
  ok(await ev("window.__ripple.phase() === 'battle' && !document.getElementById('battle').hidden"), "bite opens battle");
  await shot("03-battle.png");
  // force a win by putting the progress bar at the top and holding
  await ev("window.__ripple.battle().prog = 0.995; window.__ripple.setHold(true)");
  ok(await waitFor("window.__ripple.phase() === 'idle' && !document.getElementById('card').hidden"), "battle won → catch card");
  ok(await ev("window.__ripple.state().fishCaught === 1"), "catch recorded");
  await shot("04-catch.png");
  await ev("document.getElementById('c-keep').click()");
  ok(await ev("document.getElementById('card').hidden"), "card closes on Keep");
  ok(await ev("document.getElementById('bucket-n').textContent === '1'"), "fish lands in bucket");
  await ev("document.getElementById('c-sell').click()");

  // ── lose a battle (line snap) ──
  await ev("window.__ripple.cast(); window.__ripple.forceBite(); window.__ripple.setHold(true); window.__ripple.battle().ten = 0.99");
  ok(await waitFor("window.__ripple.state().stats.escapes === 1"), "taut line snaps → escape");

  // ── panels ──
  await ev("document.querySelector('#nav button[data-panel=shop]').click()");
  ok(await ev("!document.getElementById('p-shop').hidden && document.querySelectorAll('#shop-body .item').length > 0"), "shop panel lists items");
  await ev("document.querySelector('#shop-tabs button[data-tab=bait]').click()");
  ok(await ev("document.querySelectorAll('#shop-body .item').length > 0"), "bait shop tab renders");
  await ev("document.querySelector('.panel .close').click()");
  ok(await ev("document.getElementById('p-shop').hidden"), "panel closes");

  await ev("document.querySelector('#nav button[data-panel=fisho]').click()");
  ok(await ev("document.querySelectorAll('#fisho-list .fcard').length === 32"), "fishopedia has all 32 species");
  await ev("document.querySelector('#nav button[data-panel=fisho]').click()");
  await ev("document.querySelector('#nav button[data-panel=quests]').click()");
  ok(await ev("document.querySelectorAll('#quest-list .qcard').length === 10"), "quests render");
  await ev("document.querySelector('#nav button[data-panel=quests]').click()");
  await ev("document.getElementById('btn-bucket').click()");
  ok(await ev("!document.getElementById('p-bucket').hidden"), "bucket panel opens");
  await shot("05-bucket.png");
  await ev("document.querySelector('#p-bucket .close').click()");

  // ── settings / i18n ──
  await ev("document.querySelector('#nav button[data-panel=settings]').click()");
  await ev("var s=document.getElementById('set-lang'); s.value='en'; s.dispatchEvent(new Event('change'))");
  ok(await ev("document.querySelector('#nav button[data-view=fish] small').textContent === 'Fish'"), "language switch translates UI");
  await ev("document.querySelector('#nav button[data-panel=settings]').click()");

  // ── cabin view ──
  await ev("document.querySelector('#nav button[data-view=cabin]').click()");
  ok(await ev("!document.getElementById('view-cabin').hidden && document.getElementById('view-fish').hidden"), "cabin view opens");
  await shot("06-cabin.png");

  // ── deterministic visual sweep: all locations, times, weather ──
  await ev("document.querySelector('#nav button[data-view=fish]').click()");
  const scenes = [
    ["07-river-dawn", { loc: "river", time: 360, weather: "sunny", season: 0 }],
    ["08-lake-day", { loc: "lake", time: 720, weather: "sunny", season: 1 }],
    ["09-sea-dusk", { loc: "sea", time: 1110, weather: "cloudy", season: 2 }],
    ["10-ocean-night", { loc: "ocean", time: 1320, weather: "sunny", season: 3 }],
    ["11-storm", { loc: "sea", time: 900, weather: "storm", season: 2 }],
    ["12-snow", { loc: "lake", time: 600, weather: "snow", season: 3 }]
  ];
  for (const [name, sc] of scenes) {
    await ev(`window.__ripple.setScene(${JSON.stringify(sc)})`);
    await sleep(140);
    await shot(name + ".png");
  }
  ok(await ev("window.__ripple.phase() === 'idle'"), "visual sweep leaves game playable");
  await ev("window.__ripple.resumeTime()");

  // ── rarity card visuals ──
  await ev("window.__ripple.forceCatch(4)");
  ok(await ev("!document.getElementById('card').hidden && document.getElementById('card').dataset.rarity === '4'"), "legendary catch card styled");
  await sleep(420); // let the sheet entrance animation settle before capture
  await shot("13-legendary.png");
  await ev("document.getElementById('c-keep').click()");

  // ── persistence ──
  ok(await ev("!!localStorage.getItem('ripple-cove-save-v1')"), "progress saved to localStorage");
  ok(await ev("window.__ripple.state().seen === true"), "onboarding flag persisted");

  ok(errors.length === 0, "no page errors", errors.slice(0, 3).join(" | "));
  console.log(`\n${checks - failures}/${checks} checks passed`);
} catch (e) {
  failures++;
  console.error("SMOKE ERROR:", e);
} finally {
  await send("Browser.close").catch(() => {});
  server.close();
}
process.exit(failures ? 1 : 0);
