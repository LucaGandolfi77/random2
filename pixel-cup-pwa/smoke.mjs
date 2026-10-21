/*
 * PIXEL CUP '96 — in-browser smoke test
 *
 *   node pixel-cup-pwa/smoke.mjs [base-url]
 *
 * It drives the real page in a real browser: it starts a match, plays a
 * few seconds of it with the keyboard, and checks that the picture on the
 * canvas actually changes and that nothing threw on the way.
 *
 * The test skips itself when playwright is not installed, which is what
 * the other games in this repository do too.
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

let chromium;
for (const candidate of ["playwright", process.env.PLAYWRIGHT_PATH].filter(Boolean)) {
  try {
    ({ chromium } = require(candidate));
    break;
  } catch {
    /* try the next candidate */
  }
}

if (!chromium) {
  process.stdout.write("pixel-cup smoke: skipped (playwright not installed)\n");
  process.exit(0);
}

if (!existsSync(path.join(here, "..", "shared", "arcade.js"))) {
  process.stderr.write("pixel-cup smoke: shared/arcade.js missing\n");
  process.exit(1);
}

const base = (process.argv[2] || "file://" + here).replace(/\/$/, "") + "/";
process.stdout.write("pixel-cup smoke: " + base + "\n");

const failures = [];
let passed = 0;

function check(name, ok, detail) {
  if (ok) passed++;
  else failures.push(name + (detail ? " — " + detail : ""));
}

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
page.on("requestfailed", (req) => errors.push("requestfailed: " + req.url()));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console: " + msg.text());
});

await page.goto(base + "index.html", { waitUntil: "load" });

const boot = await page.evaluate(() => ({
  arcade: !!window.R2,
  core: typeof window.PixelCupCore === "object",
  raster: typeof window.PixelRaster === "object",
  font: typeof window.PixelFont === "object",
  render: typeof window.PixelRender === "object",
  input: typeof window.PixelInput === "object",
  audio: typeof window.PixelAudio === "object",
  storage: typeof window.PixelStorage === "object",
  ui: typeof window.PixelUI === "object",
  title: !!document.querySelector("#screen h1.logo"),
  menuVisible: !document.getElementById("screen").classList.contains("hidden"),
  live: !!document.querySelector('[aria-live="polite"]'),
  lang: document.documentElement.lang,
}));

check("arcade.js loaded", boot.arcade);
check("the model loaded", boot.core);
check("the rasteriser loaded", boot.raster);
check("the font loaded", boot.font);
check("the renderer loaded", boot.render);
check("the input loaded", boot.input);
check("the sound loaded", boot.audio);
check("the storage loaded", boot.storage);
check("the interface loaded", boot.ui);
check("the title screen is showing", boot.title && boot.menuVisible);
check("there is a live region", boot.live);
check("the document declares its language", boot.lang === "en", boot.lang);

await page.screenshot({ path: path.join(here, "smoke-title.png") });

/* ---- into a match ---- */

await page.click('button[data-action="quick"]');
await page.waitForSelector("#screen .team", { timeout: 5000 });
check("the team picker opened", true);

await page.click("#screen .team[data-team='0']");
await page.click('button[data-action="start"]');
await page.waitForTimeout(700);

const started = await page.evaluate(() => window.PixelCupGame.state());
check("the match started", started.mode === "match", JSON.stringify(started));
check("the menu is out of the way",
  await page.evaluate(() => document.getElementById("screen").classList.contains("hidden")));
check("the clock is running", started.clock > 0, "clock " + started.clock);

/* ---- the picture is alive ---- */

function sample() {
  return page.evaluate(() => {
    const canvas = document.getElementById("game");
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0, green = 0, sum = 0;
    for (let i = 0; i < data.length; i += 4 * 37) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      sum += r + g + b;
      if (r + g + b > 90) lit++;
      if (g > r + 10 && g > b + 10) green++;
    }
    return { lit, green, sum, samples: Math.floor(data.length / (4 * 37)) };
  });
}

const before = await sample();
check("the pitch is drawn", before.green > 20, "green samples: " + before.green);
check("the screen is not black", before.lit > 30, "lit samples: " + before.lit);

/* ---- play for a while ---- */

for (const key of ["KeyW", "KeyD", "KeyS", "KeyA"]) {
  await page.keyboard.down(key);
  await page.waitForTimeout(180);
  await page.keyboard.up(key);
}
await page.keyboard.press("KeyJ");
await page.waitForTimeout(120);
await page.keyboard.press("Space");
await page.waitForTimeout(900);

const after = await sample();
check("the picture changes while playing", after.sum !== before.sum,
  before.sum + " vs " + after.sum);

const state = await page.evaluate(() => window.PixelCupGame.state());
check("the match is still running", state.mode === "match" && state.phase !== "fulltime",
  JSON.stringify(state));
check("the ball moved", state.clock > started.clock, state.clock + " vs " + started.clock);

await page.screenshot({ path: path.join(here, "smoke-match.png") });

/* ---- the menus have names and big targets ---- */

const a11y = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("#screen button")];
  return {
    buttons: buttons.length,
    unlabelled: buttons.filter((b) => !(b.textContent || "").trim() && !b.getAttribute("aria-label")).length,
    small: buttons.filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.width < 48 || r.height < 48);
    }).length,
    canvasRole: document.getElementById("game").getAttribute("role"),
    canvasLabel: (document.getElementById("game").getAttribute("aria-label") || "").length,
  };
});
check("every menu button has a label", a11y.unlabelled === 0, a11y.unlabelled + " unlabelled");
check("every menu button is a big target", a11y.small === 0, a11y.small + " too small");
check("the pitch is described for screen readers",
  a11y.canvasRole === "img" && a11y.canvasLabel > 20);

/* ---- the service worker and the manifest ---- */

const pwa = await page.evaluate(async () => {
  const res = await fetch("manifest.json");
  const manifest = await res.json();
  return {
    name: manifest.name,
    icons: manifest.icons.length,
    display: manifest.display,
    sw: !!navigator.serviceWorker,
  };
});
check("the manifest is served", !!pwa.name && pwa.icons >= 2, JSON.stringify(pwa));
check("the manifest names the game", /PIXEL CUP/.test(pwa.name || ""), pwa.name);
check("the service worker is registered", pwa.sw);

const realErrors = errors.filter((e) => !/favicon|service-worker|Failed to load resource/i.test(e));
check("no page errors", realErrors.length === 0, realErrors.join(" | "));

await browser.close();

if (failures.length) {
  for (const f of failures) process.stderr.write("FAIL  " + f + "\n");
  process.stderr.write("\n" + failures.length + " failed, " + passed + " passed\n");
  process.exit(1);
}

process.stdout.write("pixel-cup smoke: " + passed + " checks passed\n");
