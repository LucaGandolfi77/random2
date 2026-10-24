/*
 * Sand Loop — in-browser smoke test
 *
 *   node sand-loop-pwa/smoke.mjs [base-url]
 *
 * Starts a built-in picture, loads a bucket and checks that the loop is
 * actually moving sand and clearing the artwork. Skips when Playwright is
 * not installed, like the other browser tests in this repository.
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
  process.stdout.write("sand-loop smoke: skipped (playwright not installed)\n");
  process.exit(0);
}

const base = (process.argv[2] || "file://" + here).replace(/\/$/, "") + "/";
process.stdout.write("sand-loop smoke: " + base + "\n");

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
await page.waitForFunction(() => !!window.SandLoop && !!window.R2, null, { timeout: 5000 });

const boot = await page.evaluate(() => ({
  arcade: !!window.R2,
  loop: !!window.SandLoop,
  artCards: document.querySelectorAll(".art-card").length,
  manifest: !!document.querySelector('link[rel="manifest"]')
}));
check("shared arcade library loaded", boot.arcade);
check("game module booted", boot.loop);
check("built-in pictures rendered", boot.artCards === 4, String(boot.artCards));
check("manifest link present", boot.manifest);

await page.evaluate(() => window.SandLoop.startBuiltin("dune"));
await page.waitForTimeout(300);
const started = await page.evaluate(() => ({
  screen: window.SandLoop.state.screen,
  hasEngine: !!window.SandLoop.engine,
  cups: document.querySelectorAll(".cup").length,
  art: !!document.querySelector("#artCanvas")
}));
check("game screen is active", started.screen === "game");
check("engine exists", started.hasEngine);
check("palette cups rendered", started.cups >= 4, String(started.cups));
check("art canvas exists", started.art);

const before = await page.evaluate(() => {
  const s = window.SandLoop.engine.getState();
  return { captured: s.captured, spilled: s.spilled };
});
await page.evaluate(() => {
  const s = window.SandLoop.engine.getState();
  window.SandLoop.deploy(s.currentColor);
});
await page.waitForTimeout(1800);
const after = await page.evaluate(() => {
  const s = window.SandLoop.engine.getState();
  return {
    captured: s.captured,
    spilled: s.spilled,
    status: s.status,
    painted: document.querySelector("#artCanvas").toDataURL().length > 8000
  };
});
check("sand was captured", after.captured > before.captured, JSON.stringify({ before, after }));
check("art canvas is painted", after.painted);

await page.evaluate(() => document.getElementById("btnPause").click());
const paused = await page.evaluate(() => ({
  overlay: !document.getElementById("pause").classList.contains("hidden"),
  paused: window.SandLoop.state.paused
}));
check("pause overlay opens", paused.overlay && paused.paused);

check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));

await browser.close();
for (const failure of failures) console.error("FAIL " + failure);
process.stdout.write(`sand-loop smoke: ${passed} passed, ${failures.length} failed\n`);
process.exit(failures.length ? 1 : 0);
