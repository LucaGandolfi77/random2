// MYCEL runtime smoke test: runs the real game.js + arcade.js in a sandboxed
// DOM/canvas mock, drives frames, mouse steering, multi-touch and the branch
// button. Any thrown error fails the test.   node mycel-pwa/runtime.test.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
let fail = false;
const check = (name, cond) => { if (!cond) { console.log("FAIL:", name); fail = true; } };

function fakeGrad() {
  return new Proxy({}, { get: () => () => {}, set: () => true });
}
function fakeCtx() {
  const t = {};
  return new Proxy(t, {
    get(target, p) {
      if (p in target) return target[p];
      return () => {
        if (p === "createPattern" || p === "createLinearGradient" || p === "createRadialGradient") return fakeGrad();
        return undefined;
      };
    },
    set(target, p, v) { target[p] = v; return true; },
  });
}
function makeEl(id) {
  const el = {
    id, children: [], listeners: {}, style: {}, dataset: {},
    textContent: "", innerHTML: "", disabled: false, className: "",
    _classes: new Set(),
    classList: {
      add: (...c) => c.forEach((x) => el._classes.add(x)),
      remove: (...c) => c.forEach((x) => el._classes.delete(x)),
      contains: (c) => el._classes.has(c),
      toggle: (c, on) => { on ? el._classes.add(c) : el._classes.delete(c); },
    },
    width: 0, height: 0,
    clientWidth: 420, clientHeight: 640,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 640 }),
    addEventListener(t2, f) { (el.listeners[t2] = el.listeners[t2] || []).push(f); },
    removeEventListener() {},
    appendChild(c) { el.children.push(c); },
    getContext: () => fakeCtx(),
  };
  return el;
}

const els = {};
const byId = (id) => (els[id] ||= makeEl(id));
const created = [];
let rafCb = null;

const sandbox = {
  console,
  setTimeout: () => 0,
  clearTimeout: () => {},
  Math, Number, String, JSON, Object, Array, Infinity, isFinite,
  localStorage: (() => {
    const s = {};
    return { getItem: (k) => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); }, removeItem: (k) => { delete s[k]; } };
  })(),
  navigator: { vibrate: () => {} },
  location: { reload: () => {}, protocol: "https:", href: "", origin: "https://x", pathname: "/mycel-pwa/" },
  addEventListener() {},
  removeEventListener() {},
  requestAnimationFrame: (cb) => { rafCb = cb; return 1; },
  cancelAnimationFrame: () => {},
  devicePixelRatio: 2,
  matchMedia: () => ({ matches: false }),
  performance: { now: () => Date.now() },
  AudioContext: function () {
    this.currentTime = 0; this.sampleRate = 44100; this.destination = {}; this.state = "running";
    this.resume = () => {};
    this.createOscillator = () => ({ connect() {}, type: "", frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, start() {}, stop() {} });
    this.createGain = () => ({ connect() {}, gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} } });
    this.createBuffer = () => ({ getChannelData: () => new Float32Array(64) });
    this.createBufferSource = () => ({ connect() {}, buffer: null, start() {} });
    this.createBiquadFilter = () => ({ connect() {}, type: "", frequency: { value: 0 }, Q: { value: 0 } });
  },
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.document = {
  readyState: "complete",
  addEventListener() {},
  getElementById: byId,
  createElement: (tag) => { const e = makeEl("auto-" + tag + created.length); created.push(e); return e; },
  body: makeEl("body"),
};
["app", "hud", "bio", "len", "tips", "branch-btn", "sound-btn", "stage", "game", "leaderboard", "modal", "m-title", "m-body", "m-btns", "toast"].forEach(byId);

const vmctx = vm.createContext(sandbox);
vm.runInContext(readFileSync(join(root, "shared/arcade.js"), "utf8"), vmctx, { filename: "arcade.js" });
vm.runInContext(readFileSync(join(here, "game.js"), "utf8"), vmctx, { filename: "game.js" });

check("R2 exposed", !!sandbox.R2);
check("init ran (loop started)", typeof rafCb === "function");

let T = 0;
const stage = byId("stage");
try {
  for (let f = 0; f < 1500; f++) {
    T += 16.67;
    const cb = rafCb; rafCb = null;
    cb(T);
    if (f % 7 === 0) {
      const ev = { pointerType: "mouse", clientX: 210 + Math.sin(f / 40) * 160, clientY: 320 + Math.cos(f / 55) * 180, preventDefault() {} };
      stage.listeners.pointermove.forEach((fn) => fn(ev));
    }
    if (f === 300) {
      stage.listeners.pointerdown.forEach((fn) => fn({ preventDefault() {}, pointerType: "touch", pointerId: 11, clientX: 120, clientY: 200 }));
      stage.listeners.pointerdown.forEach((fn) => fn({ preventDefault() {}, pointerType: "touch", pointerId: 12, clientX: 320, clientY: 420 }));
    }
    if (f > 300 && f < 700 && f % 5 === 0) {
      stage.listeners.pointermove.forEach((fn) => fn({ pointerType: "touch", pointerId: 11, clientX: 120 + (f % 90), clientY: 200 + (f % 70), preventDefault() {} }));
      stage.listeners.pointermove.forEach((fn) => fn({ pointerType: "touch", pointerId: 12, clientX: 320 - (f % 80), clientY: 420 - (f % 60), preventDefault() {} }));
    }
    if (f === 720) {
      stage.listeners.pointerup.forEach((fn) => fn({ pointerType: "touch", pointerId: 11 }));
      stage.listeners.pointerup.forEach((fn) => fn({ pointerType: "touch", pointerId: 12 }));
    }
    if (f === 800 || f === 1000 || f === 1200) byId("branch-btn").listeners.click.forEach((fn) => fn());
  }
  check("1500 frames without exceptions", true);
} catch (e) {
  console.log("RUNTIME ERROR:", e.stack);
  check("no runtime exception", false);
}

const bio = Number(byId("bio").textContent);
const len = Number(byId("len").textContent);
check("biomassa renderizzata", bio >= 0 && !isNaN(bio));
check("rete cresciuta", len > 0);
check("leaderboard compilata", byId("leaderboard").innerHTML.includes("tu"));

byId("sound-btn").listeners.click.forEach((fn) => fn());
check("sound toggle ok", byId("sound-btn").textContent === "🔇");

console.log(fail ? "MYCEL RUNTIME TEST FAILED" : "MYCEL RUNTIME TEST PASSED — 25s simulated, no exceptions");
process.exit(fail ? 1 : 0);
