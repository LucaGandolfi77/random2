/*
 * Pixel Ants — in-browser smoke test
 *
 *   node pixel-ants-pwa/smoke.mjs [base-url]
 *
 * Starts a built-in picture, sends a bucket of ants, and checks that exposed
 * pixels are actually being carried away. Skips when Playwright is not
 * installed, like the other browser tests in this repository.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

let chromium;
for (const candidate of ["playwright", process.env.PLAYWRIGHT_PATH].filter(Boolean)) {
  try {
    ({ chromium } = require(candidate));
    break;
  } catch (e) { /* next */ }
}

if (!chromium) {
  process.stdout.write("pixel-ants smoke: skipped (playwright not installed)\n");
  process.exit(0);
}

const base = (process.argv[2] || "file://" + here).replace(/\/$/, "") + "/";
process.stdout.write("pixel-ants smoke: " + base + "\n");

const failures = [];
let passed = 0;
function check(name, ok, detail) {
  if (ok) passed++;
  else failures.push(name + (detail ? " — " + detail : ""));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => { if (msg.type() === "error") errors.push("console: " + msg.text()); });

await page.goto(base + "index.html", { waitUntil: "load" });
await page.waitForFunction(() => !!window.PixelAnts && !!window.R2, null, { timeout: 5000 });

const boot = await page.evaluate(() => ({
  arcade: !!window.R2,
  ants: !!window.PixelAnts,
  artCards: document.querySelectorAll(".art-card").length,
  manifest: !!document.querySelector('link[rel="manifest"]')
}));
check("shared arcade library loaded", boot.arcade);
check("game module booted", boot.ants);
check("built-in pictures rendered", boot.artCards === 4, String(boot.artCards));
check("manifest link present", boot.manifest);

await page.evaluate(() => window.PixelAnts.startBuiltin("dune"));
await page.waitForTimeout(300);
const started = await page.evaluate(() => ({
  screen: window.PixelAnts.state.screen,
  hasEngine: !!window.PixelAnts.engine,
  cups: document.querySelectorAll(".cup").length,
  scene: !!document.querySelector("#sceneCanvas"),
  exposed: [0, 1, 2, 3, 4, 5, 6, 7].map((c) => window.PixelAnts.engine.exposedColor(c))
}));
check("game screen is active", started.screen === "game");
check("engine exists", started.hasEngine);
check("palette cups rendered", started.cups >= 4, String(started.cups));
check("scene canvas exists", started.scene);
check("edge pixels are exposed", started.exposed.some((n) => n > 0), JSON.stringify(started.exposed));

const before = await page.evaluate(() => {
  const board = window.PixelAnts.board;
  const color = [0, 1, 2, 3, 4, 5, 6, 7]
    .find((c) => window.PixelAnts.engine.exposedColor(c) > 0);
  window.PixelAnts.deploy(color);
  return { captured: board.captured, color };
});
await page.waitForTimeout(1800);
const after = await page.evaluate(() => {
  const board = window.PixelAnts.board;
  const engine = window.PixelAnts.engine;
  return {
    captured: board.captured,
    stolen: engine.state.stolen,
    delivered: engine.state.delivered,
    ants: engine.state.ants.length,
    painted: document.querySelector("#sceneCanvas").toDataURL().length > 8000
  };
});
check("ants stole exposed pixels", after.captured > before.captured, JSON.stringify({ before, after }));
check("carried pixels are delivered", after.delivered > 0, JSON.stringify(after));
check("scene canvas is painted", after.painted);

await page.evaluate(() => document.getElementById("btnPause").click());
const paused = await page.evaluate(() => ({
  overlay: !document.getElementById("pause").classList.contains("hidden"),
  paused: window.PixelAnts.state.paused
}));
check("pause overlay opens", paused.overlay && paused.paused);

check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));

await browser.close();
for (const failure of failures) console.error("FAIL " + failure);
process.stdout.write(`pixel-ants smoke: ${passed} passed, ${failures.length} failed\n`);
process.exit(failures.length ? 1 : 0);
