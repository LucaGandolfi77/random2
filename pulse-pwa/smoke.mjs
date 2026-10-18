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
  process.stdout.write("pulse smoke: skipped (playwright not installed)\n");
  process.exit(0);
}

if (!existsSync(path.join(here, "..", "shared", "arcade.js"))) {
  process.stderr.write("pulse smoke: shared/arcade.js missing\n");
  process.exit(1);
}

const base = (process.argv[2] || "file://" + here).replace(/\/$/, "") + "/";
process.stdout.write("pulse smoke: " + base + "\n");

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
  hasArcade: !!window.R2,
  hasSong: typeof window.R2P.song.generate === "function",
  hasChart: typeof window.R2P.chart.build === "function",
  hasAudio: typeof window.R2P.audio.render === "function",
  hasGame: typeof window.R2P.createGame === "function",
  seed: document.getElementById("seed-input").value,
  summary: document.getElementById("track-summary").textContent,
  menuVisible: document.getElementById("screen-menu").classList.contains("is-active")
}));

check("arcade.js loaded", boot.hasArcade);
check("song module loaded", boot.hasSong);
check("chart module loaded", boot.hasChart);
check("audio module loaded", boot.hasAudio);
check("game module loaded", boot.hasGame);
check("menu is visible", boot.menuVisible);
check("daily seed prefilled", /^\d{1,10}$/.test(boot.seed), boot.seed);
check("track summary is populated", /BPM.*notes/.test(boot.summary), boot.summary);

const seeded = await page.evaluate(() => {
  location.hash = "#seed=20261018";
  return new Promise((resolve) => setTimeout(() => resolve(document.getElementById("seed-input").value), 60));
});
check("hash seed is honoured", seeded === "20261018", seeded);

await page.screenshot({ path: path.join(here, "smoke-menu.png") });

await page.click('#difficulty button[data-difficulty="hard"]');
const hardPressed = await page.getAttribute('#difficulty button[data-difficulty="hard"]', "aria-pressed");
check("difficulty toggle works", hardPressed === "true");

await page.click("#btn-play");
try {
  await page.waitForSelector("#screen-play.is-active", { timeout: 60000 });
} catch (err) {
  const dump = await page.evaluate(() => ({
    screens: [...document.querySelectorAll(".screen")].map((s) => s.id + ":" + s.classList.contains("is-active")),
    summary: document.getElementById("track-summary").textContent,
    audio: window.R2P.audio.state()
  }));
  process.stderr.write("pulse smoke: never reached the playfield " + JSON.stringify(dump) + "\n");
  for (const e of errors) process.stderr.write("  " + e + "\n");
  await browser.close();
  process.exit(1);
}
check("play screen reached after rendering", true);

const rendered = await page.evaluate(() => ({
  state: window.R2P.audio.state(),
  chunks: window.R2P.audio.remaining() > 0,
  time: window.R2P.audio.currentTime()
}));
check("audio context running", rendered.state === "running", rendered.state);
check("audio is positioned", rendered.chunks, "no audio scheduled");

await page.waitForTimeout(900);
const playing = await page.evaluate(() => ({
  time: window.R2P.audio.currentTime(),
  playing: window.R2P.game.isPlaying()
}));
check("song clock advances", playing.time > 0.4, "t=" + playing.time);
check("game reports playing", playing.playing);

await page.keyboard.press("Escape");
await page.waitForTimeout(120);
const paused = await page.evaluate(() => ({
  playing: window.R2P.game.isPlaying(),
  t: window.R2P.audio.currentTime()
}));
check("escape pauses", paused.playing === false);
await page.waitForTimeout(400);
const stillPaused = await page.evaluate(() => window.R2P.audio.currentTime());
check("clock frozen while paused", Math.abs(stillPaused - paused.t) < 0.05, stillPaused + " vs " + paused.t);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
const resumed = await page.evaluate(() => window.R2P.audio.currentTime());
check("escape resumes from the same spot", resumed > stillPaused + 0.1, resumed + " vs " + stillPaused);

for (const key of ["KeyD", "KeyF", "KeyJ", "KeyK"]) {
  await page.keyboard.press(key.replace("Key", "").toLowerCase());
}
const afterKeys = await page.evaluate(() => {
  const stats = window.R2P.game.stats();
  return { judged: stats.judged, counts: stats.counts };
});
check("keypresses are accepted without error", typeof afterKeys.judged === "number");

const canvasOk = await page.evaluate(() => {
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let lit = 0;
  for (let i = 0; i < data.length; i += 4 * 97) {
    if (data[i] + data[i + 1] + data[i + 2] > 60) lit++;
  }
  return { sized: canvas.width > 0 && canvas.height > 0, lit: lit };
});
check("canvas has a backing store", canvasOk.sized);
check("playfield is actually drawn", canvasOk.lit > 40, "lit samples: " + canvasOk.lit);

const notesInFlight = await page.evaluate(async () => {
  const song = window.R2P.song.generate(20261018);
  const chart = window.R2P.chart.build(song, "hard");
  const first = chart.notes[0].t;
  window.R2P.game.seek(first - 0.9);
  await new Promise((r) => setTimeout(r, 600));
  const ctx = document.getElementById("stage").getContext("2d");
  const data = ctx.getImageData(0, 0, document.getElementById("stage").width, document.getElementById("stage").height).data;
  let colour = 0;
  for (let i = 0; i < data.length; i += 4 * 53) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 45) colour++;
  }
  return { colour: colour, firstNote: first };
});
check("notes are drawn on the playfield", notesInFlight.colour > 10, "colour samples: " + notesInFlight.colour);
await page.screenshot({ path: path.join(here, "smoke-play.png") });

const fitsViewport = await page.evaluate(() => {
  const canvas = document.getElementById("stage");
  const rect = canvas.getBoundingClientRect();
  return { w: Math.round(rect.width), h: Math.round(rect.height) };
});
check("playfield keeps its 3:2 shape", Math.abs(fitsViewport.w / fitsViewport.h - 1.5) < 0.02, JSON.stringify(fitsViewport));



const ending = await page.evaluate(async () => {
  const song = window.R2P.song.generate(20261018);
  const chart = window.R2P.chart.build(song, "hard");
  window.R2P.game.seek(song.duration - 5);
  const keys = ["KeyD", "KeyF", "KeyJ", "KeyK"];
  let next = 0;
  const started = performance.now();
  while (performance.now() - started < 9000) {
    const now = window.R2P.audio.currentTime();
    while (next < chart.notes.length && chart.notes[next].t < now - 0.25) next++;
    if (next < chart.notes.length && chart.notes[next].t <= now + 0.004) {
      const lane = chart.notes[next].lane;
      window.dispatchEvent(new KeyboardEvent("keydown", { code: keys[lane] }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code: keys[lane] }));
      next++;
    }
    if (document.getElementById("screen-result").classList.contains("is-active")) break;
    await new Promise((r) => setTimeout(r, 4));
  }
  return {
    resultVisible: document.getElementById("screen-result").classList.contains("is-active"),
    grade: document.getElementById("result-grade").textContent,
    score: document.getElementById("result-score").textContent,
    accuracy: document.getElementById("result-accuracy").textContent,
    counts: [...document.querySelectorAll("#result-counts li")].map((li) => li.textContent),
    tracks: document.querySelectorAll("#tracks li").length
  };
});

await page.waitForTimeout(1800);
const runs = await page.evaluate(() => (window.R2.stats.runs("pulse") || []).length);

check("the song runs to the end", ending.resultVisible);
check("a grade is awarded", /^[SABCD]$/.test(ending.grade), ending.grade);
check("auto-play hits notes", ending.counts.join(" ").includes("perfect"), ending.counts.join(" "));
check("a score is shown", /[1-9]/.test(ending.score), ending.score);
check("the run is logged to R2.stats", runs > 0, "runs: " + runs);
check("the track lands in the catalogue", ending.tracks > 0, "tracks: " + ending.tracks);

await page.screenshot({ path: path.join(here, "smoke-result.png") });

const realErrors = errors.filter((e) => !/favicon|service-worker|Failed to load resource/i.test(e));
check("no page errors", realErrors.length === 0, realErrors.join(" | "));

const a11y = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("button")];
  const unlabelled = buttons.filter((b) => !(b.textContent || "").trim() && !b.getAttribute("aria-label"));
  const canvas = document.getElementById("stage");
  return {
    buttons: buttons.length,
    unlabelled: unlabelled.length,
    canvasRole: canvas.getAttribute("role"),
    canvasLabel: (canvas.getAttribute("aria-label") || "").length,
    live: !!document.querySelector('[aria-live="polite"]'),
    h1: document.querySelectorAll("h1").length,
    lang: document.documentElement.lang
  };
});
check("every button has a visible label", a11y.unlabelled === 0, a11y.unlabelled + " unlabelled");
check("the playfield is described for screen readers", a11y.canvasRole === "img" && a11y.canvasLabel > 20);
check("there is a live region for state changes", a11y.live);
check("the document declares its language", a11y.lang === "en", a11y.lang);

const reducedPage = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  reducedMotion: "reduce"
});
const reducedErrors = [];
reducedPage.on("pageerror", (err) => reducedErrors.push(String(err)));
await reducedPage.goto(base + "index.html", { waitUntil: "load" });
const reducedOk = await reducedPage.evaluate(() => !!document.getElementById("track-summary").textContent);
check("the menu renders under prefers-reduced-motion", reducedOk);
check("no errors under prefers-reduced-motion", reducedErrors.length === 0, reducedErrors.join(" | "));
await reducedPage.close();

await browser.close();

if (failures.length) {
  for (const f of failures) process.stderr.write("FAIL  " + f + "\n");
  process.stderr.write("\n" + failures.length + " failed, " + passed + " passed\n");
  process.exit(1);
}

process.stdout.write("pulse smoke: " + passed + " checks passed\n");