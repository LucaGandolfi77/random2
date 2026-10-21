/*
 * PIXEL CUP '96 — boot test
 *
 *   node pixel-cup-pwa/tests/boot.test.mjs
 *
 * The game is a set of plain scripts that talk to the DOM. This test
 * gives them a very small fake DOM, loads them in the order index.html
 * loads them, and then drives a few frames of a match. It is not a
 * browser, but it catches the mistakes a browser would only show up
 * with: a typo in a global, a missing element, a method that does not
 * exist.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let failures = 0;
let checks = 0;
function ok(label, condition, detail) {
  checks++;
  if (condition) return;
  failures++;
  console.error("  FAIL  " + label + (detail !== undefined ? " -> " : "") + (detail ?? ""));
}
function section(name) { console.log("\n" + name); }

/* ------------------------------------------------------------------ */
/* A DOM small enough to read, big enough to run the game.             */
/* ------------------------------------------------------------------ */

class FakeClassList {
  constructor() { this.set = new Set(); }
  add(c) { this.set.add(c); }
  remove(c) { this.set.delete(c); }
  contains(c) { return this.set.has(c); }
  toggle(c) { if (this.set.has(c)) this.set.delete(c); else this.set.add(c); }
}

class FakeElement {
  constructor(id, tag) {
    this.id = id;
    this.tagName = (tag || "div").toUpperCase();
    this.classList = new FakeClassList();
    this.attributes = {};
    this.innerHTML = "";
    this.textContent = "";
    this.style = {};
    this.children = [];
    this.value = "";
    this.width = 320;
    this.height = 180;
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  addEventListener(type, fn) { (this._handlers[type] = this._handlers[type] || []).push(fn); }
  removeEventListener(type, fn) {
    const list = this._handlers[type] || [];
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }
  dispatch(type, ev) {
    const list = this._handlers[type] || [];
    for (const fn of list) fn(ev || { preventDefault() {}, target: this });
  }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  focus() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 64, height: 48 }; }
  getContext() {
    const self = this;
    return {
      createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
      putImageData(img) { self._image = img; },
      getImageData(x, y, w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
      fillRect() {}, clearRect() {}, drawImage() {},
    };
  }
}
FakeElement.prototype._handlers = {};

const elements = {};
function el(id, tag) {
  if (!elements[id]) elements[id] = new FakeElement(id, tag);
  return elements[id];
}

const rafQueue = [];
globalThis.window = globalThis;
globalThis.document = {
  readyState: "complete",
  getElementById: (id) => elements[id] || null,
  createElement: (tag) => new FakeElement("", tag),
  addEventListener() {},
  removeEventListener() {},
  querySelectorAll: () => [],
  body: new FakeElement("body"),
};
globalThis.requestAnimationFrame = (fn) => { rafQueue.push(fn); return rafQueue.length; };
globalThis.cancelAnimationFrame = () => {};
/* Node has a read-only navigator, so it is patched rather than replaced. */
try {
  Object.defineProperty(globalThis, "navigator", {
    value: { maxTouchPoints: 0, getGamepads: () => [] },
    configurable: true,
    writable: true,
  });
} catch (e) {
  /* An older node without a navigator: the game only uses it for the
     gamepad, which this test does not exercise. */
}
globalThis.localStorage = {
  _data: {},
  getItem(k) { return k in this._data ? this._data[k] : null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
};
globalThis.performance = { now: () => Date.now() };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
globalThis.AudioContext = undefined;

/* The window needs an event target of its own. */
const winHandlers = {};
globalThis.addEventListener = (type, fn) => {
  (winHandlers[type] = winHandlers[type] || []).push(fn);
};
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = (ev) => {
  for (const fn of (winHandlers[ev.type] || [])) fn(ev);
};
function pressKey(code) {
  globalThis.dispatchEvent({ type: "keydown", code, repeat: false, preventDefault() {} });
  globalThis.dispatchEvent({ type: "keyup", code, repeat: false, preventDefault() {} });
}

el("game", "canvas");
el("screen");
el("live");
el("stick");
el("stick-base");
el("pause-btn", "button");

/* ------------------------------------------------------------------ */
/* Load the game exactly as index.html does.                          */
/* ------------------------------------------------------------------ */

section("boot");

const files = ["core.js", "raster.js", "font.js", "render.js", "input.js",
               "audio.js", "storage.js", "ui.js", "main.js"];
for (const f of files) {
  const code = readFileSync(resolve(here, "../src/" + f), "utf8");
  vm.runInThisContext(code, { filename: f });
}

ok("the model is on the window", typeof globalThis.PixelCupCore === "object");
ok("the rasteriser is on the window", typeof globalThis.PixelRaster === "object");
ok("the font is on the window", typeof globalThis.PixelFont === "object");
ok("the renderer is on the window", typeof globalThis.PixelRender === "object");
ok("the input is on the window", typeof globalThis.PixelInput === "object");
ok("the sound is on the window", typeof globalThis.PixelAudio === "object");
ok("the storage is on the window", typeof globalThis.PixelStorage === "object");
ok("the interface is on the window", typeof globalThis.PixelUI === "object");
ok("the game exposes a handle", typeof globalThis.PixelCupGame === "object");

const state0 = globalThis.PixelCupGame.state();
ok("the game starts on the title screen", state0.mode === "title", state0.mode);
ok("the title screen was written into the page",
  String(elements.screen.innerHTML).indexOf("PIXEL CUP") >= 0);

/* ------------------------------------------------------------------ */
/* Drive some frames.                                                  */
/* ------------------------------------------------------------------ */

section("frames");

let now = 0;
function frame(stepMs) {
  now += stepMs;
  const fns = rafQueue.splice(0, rafQueue.length);
  for (const fn of fns) fn(now);
}

frame(16);
ok("a frame runs without throwing", true);
ok("the canvas received a picture", !!elements.game._image);
ok("the picture is the right size",
  elements.game._image && elements.game._image.width === 320 &&
  elements.game._image.height === 180);

/* The menu is showing, so the title screen is drawn. */
const lit = (() => {
  const d = elements.game._image.data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4 * 101) if (d[i] + d[i + 1] + d[i + 2] > 60) n++;
  return n;
})();
ok("something was drawn", lit > 5, "lit samples: " + lit);

/* ------------------------------------------------------------------ */
/* Start a match through the interface, the way a player would.        */
/* ------------------------------------------------------------------ */

section("a match through the interface");

const screen = elements.screen;
const before = globalThis.PixelCupGame.state();
ok("the game starts at the title", before.mode === "title");

const menuHtml = screen.innerHTML;
ok("the menu offers the modes",
  /data-action="quick"/.test(menuHtml) &&
  /data-action="cup"/.test(menuHtml) &&
  /data-action="shootout"/.test(menuHtml),
  menuHtml.slice(0, 120));

/* The keyboard must reach the model: the human player is driven by it. */
pressKey("KeyW");
frame(16);
const input = globalThis.PixelInput;
ok("a key press does not throw", true);

/* ------------------------------------------------------------------ */
/* Walk the menus the way a player would.                             */
/* ------------------------------------------------------------------ */

section("the flow of a match");

const G = globalThis.PixelCupGame;
ok("the game exposes its button handler", typeof G.action === "function");

G.action("quick");
ok("the team picker opened", /data-team="0"/.test(String(screen.innerHTML)));
ok("the picker offers eight teams",
  (String(screen.innerHTML).match(/data-team="/g) || []).length === 8);

G.action("start", 2);
ok("the squad picker opened", /class="xi"/.test(String(screen.innerHTML)));
ok("the squad picker lists ten players",
  (String(screen.innerHTML).match(/data-id="/g) || []).length >= 10);

/* Pick the best five and kick off. */
const squad = globalThis.PixelCupCore.makeSquad(globalThis.PixelCupCore.teamById("verdi"));
const ids = globalThis.PixelCupCore.autoSelection(squad).map((p) => p.id);
G.action("kickoff", ids);
let st = G.state();
ok("the match started", st.mode === "match", JSON.stringify(st));
ok("the menu is out of the way", screen.classList.contains("hidden"));

for (let i = 0; i < 30; i++) frame(16);
st = G.state();
ok("the clock runs", st.clock > 0.2, "clock " + st.clock);

G.action("__none__");   /* an unknown action must do nothing */
ok("an unknown action changes nothing", G.state().mode === "match");

/* Half time: push the clock to the break and read the card. */
const live = G.match();
live.clock = live.halfSeconds - 0.02;
frame(16);
frame(16);
ok("the half-time card appears", /Half time/.test(String(screen.innerHTML)),
   String(screen.innerHTML).slice(0, 80));
G.action("continue");
st = G.state();
ok("the second half kicks off", st.half === 2 && st.phase === "kickoff", JSON.stringify(st));
ok("the menu is hidden again", screen.classList.contains("hidden"));

/* Full time: run out the second half. */
live.clock = live.halfSeconds - 0.02;
for (let i = 0; i < 4; i++) frame(16);
ok("the full-time card appears", /class="score big"/.test(String(screen.innerHTML)),
   String(screen.innerHTML).slice(0, 80));
G.action("continue");
ok("back to the title after the match", G.state().mode === "title", G.state().mode);

/* ------------------------------------------------------------------ */
/* The shoot-out                                                       */
/* ------------------------------------------------------------------ */

section("the shoot-out");

G.action("shootout");
ok("the shoot-out intro is showing", /Penalty shoot-out/.test(String(screen.innerHTML)));
G.action("go");
st = G.state();
ok("the shoot-out started", st.mode === "shootout", JSON.stringify(st));
ok("the shoot-out has a round", st.shootout && st.shootout.round === 1);

/* Play it: tap on the aim and on the power, over and over. */
let guard = 0;
while (!G.state().shootout.finished && guard++ < 3000) {
  pressKey("Space");
  frame(16);
}
st = G.state();
ok("the shoot-out finishes", st.shootout && st.shootout.finished, "guard " + guard);

G.action("continue");
ok("back to the title", G.state().mode === "title", G.state().mode);

/* ------------------------------------------------------------------ */
/* The cup                                                             */
/* ------------------------------------------------------------------ */

section("the cup");

G.action("cup");
ok("the cup picker opened", /data-team="0"/.test(String(screen.innerHTML)));
G.action("start", 1);
ok("the cup squad picker opened", /class="xi"/.test(String(screen.innerHTML)));
const cupIds = globalThis.PixelCupCore.autoSelection(
  globalThis.PixelCupCore.makeSquad(globalThis.PixelCupCore.teamById("verdi"))).map((p) => p.id);
G.action("kickoff", cupIds);
st = G.state();
ok("the cup match started", st.mode === "match", JSON.stringify(st));
ok("the cup is in play", st.cup && st.cup.round === 0, JSON.stringify(st.cup));

/* Start a match directly through the model + the renderer, which is the
   part a broken wiring would break. */
const Core = globalThis.PixelCupCore;
const Render = globalThis.PixelRender;
const Raster = globalThis.PixelRaster;
const m = Core.createMatch({ seed: 5 });
const buf = Raster.createBuffer(320, 180);
const cam = Render.createCamera();
Raster.beginFrame(buf);
Render.updateCamera(cam, buf, 1 / 60, { x: m.ball.x, z: m.ball.z });
Render.drawScene(buf, cam, m, {
  homeKit: m.home.kit, awayKit: m.away.kit,
  homeShorts: m.home.shorts, awayShorts: m.away.shorts,
});
let green = 0, white = 0;
for (let i = 0; i < buf.data.length; i += 4) {
  if (buf.data[i + 1] > buf.data[i] + 8 && buf.data[i + 1] > buf.data[i + 2] + 8) green++;
  if (buf.data[i] > 200 && buf.data[i + 1] > 200 && buf.data[i + 2] > 200) white++;
}
ok("the pitch is drawn", green > 2000, "green pixels: " + green);
ok("the lines are drawn", white > 200, "white pixels: " + white);

for (let i = 0; i < 600; i++) Core.stepMatch(m, 1 / 60, { mx: 0.3, my: 1 });
ok("six hundred steps of a match stay finite",
  Number.isFinite(m.ball.x) && Number.isFinite(m.ball.z) &&
  m.players.every((p) => Number.isFinite(p.x)));

section("pausing");

G.action("quick");
G.action("start", 0);
G.action("kickoff", globalThis.PixelCupCore.autoSelection(
  globalThis.PixelCupCore.makeSquad(globalThis.PixelCupCore.teamById("verdi"))).map((p) => p.id));
ok("a match is running", G.state().mode === "match");

/* Escape opens the pause sheet. */
pressKey("Escape");
frame(20);
ok("the pause sheet opened", /Paused/.test(String(screen.innerHTML)),
   String(screen.innerHTML).slice(0, 70));

/* And the clock genuinely stops. */
const frozen = G.state().clock;
for (let i = 0; i < 40; i++) frame(20);
ok("the clock is stopped while paused", G.state().clock === frozen,
   frozen + " vs " + G.state().clock);

/* Escape again, and the match is live. */
pressKey("Escape");
frame(20);
ok("the pause sheet closed", screen.classList.contains("hidden"));
for (let i = 0; i < 20; i++) frame(20);
ok("the clock runs again", G.state().clock > frozen);

/* The pause button does the same. */
const pauseBtn = elements["pause-btn"];
ok("there is a pause button", !!pauseBtn);
if (pauseBtn) {
  pauseBtn.dispatch("click", { target: pauseBtn });
  frame(20);
  ok("the pause button opens the sheet", /Paused/.test(String(screen.innerHTML)));
}

/* And there is a way out. */
G.action("quit");
ok("quitting returns to the title", G.state().mode === "title", G.state().mode);
ok("the pause sheet is replaced by the title", /PIXEL CUP/.test(String(screen.innerHTML)));

/* Restarting from the pause sheet starts a fresh match. */
G.action("quick");
G.action("start", 0);
G.action("kickoff", globalThis.PixelCupCore.autoSelection(
  globalThis.PixelCupCore.makeSquad(globalThis.PixelCupCore.teamById("verdi"))).map((p) => p.id));
pressKey("Escape");
frame(20);
G.action("restart");
ok("the match restarts", G.state().mode === "match");
ok("the restart clears the pause", screen.classList.contains("hidden"));

/* ------------------------------------------------------------------ */
/* The settings and the difficulty                                   */
/* ------------------------------------------------------------------ */

section("settings and difficulty");

G.action("quit");
ok("back at the title", G.state().mode === "title");
ok("the title screen offers the settings", /data-setting="sound"/.test(String(screen.innerHTML)));

G.action("quick");
ok("the picker offers three difficulties",
  (String(screen.innerHTML).match(/data-diff="/g) || []).length === 3);

/* Choosing Legend and kicking off must reach the match. */
G.action("start", 1, 2);
G.action("kickoff", globalThis.PixelCupCore.autoSelection(
  globalThis.PixelCupCore.makeSquad(globalThis.PixelCupCore.teamById("verdi"))).map((p) => p.id));
ok("the match starts with the chosen difficulty", G.state().mode === "match");

section("the replay");

G.action("quick");
G.action("start", 0);
G.action("kickoff", globalThis.PixelCupCore.autoSelection(
  globalThis.PixelCupCore.makeSquad(globalThis.PixelCupCore.teamById("verdi"))).map((p) => p.id));
const reel = G.match();
const CoreM = globalThis.PixelCupCore;
/* Move the keeper out of the way and put the ball in front of the goal. */
const gk = reel.players.find((p) => p.role === "GK" && p.team === 1);
gk.z = -13; gk.x = 22;
reel.phase = "play";
reel.ball.owner = -1;
reel.ball.kickLock = 999;
reel.ball.x = CoreM.C.GOAL_LINE - 2;
reel.ball.z = 0;
reel.ball.y = CoreM.C.BALL_R;
reel.ball.vx = 20; reel.ball.vy = 0; reel.ball.vz = 0;
for (let i = 0; i < 60; i++) frame(20);
ok("the goal went in", reel.score[0] === 1, reel.score.join("-"));

ok("a goal was recorded", G.state().bestGoal && G.state().bestGoal.frames > 4,
   JSON.stringify(G.state().bestGoal));

/* Let the goal celebration finish, then run the match out so the card
   appears: past the half-time first, then out of the second half. */
for (let i = 0; i < 200; i++) frame(20);
reel.clock = reel.halfSeconds - 0.02;
for (let i = 0; i < 6; i++) frame(20);
ok("the half-time card appears", /Half time/.test(String(screen.innerHTML)));
G.action("continue");
for (let i = 0; i < 10; i++) frame(20);
reel.clock = reel.halfSeconds - 0.02;
for (let i = 0; i < 8; i++) frame(20);
ok("the full-time card appears", /class="score big"/.test(String(screen.innerHTML)));
ok("the card offers the replay", /Watch the best goal/.test(String(screen.innerHTML)));

G.action("replay");
ok("the replay starts", G.state().mode === "replay", G.state().mode);
const wasAt = G.state().replay ? G.state().replay.index : -1;
for (let i = 0; i < 20; i++) frame(20);
ok("the replay plays", G.state().replay && G.state().replay.index > wasAt,
   JSON.stringify(G.state().replay));

section("the screens");

/* Every screen is built into the same element. If the handlers of the
   old screen are still attached, clicking a button on the new one
   answers a question the old screen was asking — which is how the
   squad picker's "Kick off" ended up in the team picker's handler and
   crashed the game. */
const screenEl = elements.screen;
function handlerCount() {
  return (screenEl._handlers.click || []).length;
}
G.action("quick");
G.action("start", 2);
ok("the squad picker is showing", /class="xi"/.test(String(screen.innerHTML)));
const afterSquad = handlerCount();
G.action("back");
G.action("quick");
G.action("start", 2);
ok("going back and forth does not pile handlers up", handlerCount() <= afterSquad,
   handlerCount() + " vs " + afterSquad);

/* And the game still works after all that. */
const squadIds = globalThis.PixelCupCore.autoSelection(
  globalThis.PixelCupCore.makeSquad(globalThis.PixelCupCore.teamById("verdi"))).map((p) => p.id);
G.action("kickoff", squadIds);
ok("the match still starts", G.state().mode === "match", G.state().mode);

section("the camera");

const Camera = globalThis.PixelRender;

/* The picture and the rules have to agree about the size of the pitch. */
ok("the renderer draws the pitch the model plays on",
   Camera.pitchOf(globalThis.PixelCupCore.createMatch({ seed: 3 })).half ===
   globalThis.PixelCupCore.C.GOAL_LINE);
const wide = globalThis.PixelCupCore.createMatch({ seed: 71 });
wide.ball.x = 0; wide.ball.z = 0;
ok("play down the middle uses the top camera", Camera.chooseShot(wide) === "top",
   Camera.chooseShot(wide));
wide.ball.z = 18;
ok("play out wide uses the side camera", Camera.chooseShot(wide) === "side",
   Camera.chooseShot(wide));
wide.ball.x = 30; wide.ball.z = 9;
ok("a corner uses the side camera", Camera.chooseShot(wide) === "side",
   Camera.chooseShot(wide));

/* The camera in the game follows the director. */
G.action("quick");
G.action("start", 0);
G.action("kickoff", squadIds);
const live2 = G.match();
live2.ball.z = 20;
for (let i = 0; i < 120; i++) frame(20);
ok("the director changes the camera", G.state().shot === "side", G.state().shot);

section("storage");
const Storage = globalThis.PixelStorage;
/* The flow above has already played matches, so start from a clean
   record book. */
Storage.save(Storage.KEY_RECORDS, null);
const records = Storage.getRecords();
ok("the record book starts empty", records.matches === 0, records.matches);
Storage.addMatch({ win: true, draw: false, goals: 3, conceded: 1 });
const after2 = Storage.getRecords();
ok("a win is recorded", after2.matches === 1 && after2.wins === 1, JSON.stringify(after2));
ok("the best margin is recorded", after2.bestWin === 2, after2.bestWin);
ok("the hub can read a high score", after2.highScore === 2, after2.highScore);
ok("the settings round-trip", Storage.setSettings({ sound: false }).sound === false);
ok("the settings come back", Storage.getSettings().sound === false);

console.log("\n" + (failures ? "FAILED" : "OK") + "  " + (checks - failures) + "/" + checks + " checks passed");
process.exit(failures ? 1 : 0);
