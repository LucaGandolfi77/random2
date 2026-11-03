/*
 * CINDER BELT headless harness.
 *
 * Loads the real simulation files into node with just enough browser surface
 * to run them: a Map-backed localStorage, a silent audio module and a frozen
 * navigator. No canvas, no DOM - boot.test.js owns the browser layer.
 *
 * The shared check()/report() pair mirrors the other games in this repo so a
 * failing suite reads the same way everywhere.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");

const store = new Map();
global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
};
Object.defineProperty(globalThis, "navigator", {
    value: { vibrate() {} }, configurable: true, writable: true
});
global.window = global;

/* Load order: config first, then the pure helpers, then the world, then the
 * two brains that read it. */
const FILES = [
    "config.js", "rng.js", "storage.js", "shipyard.js", "zones.js",
    "world.js", "ai.js", "npcs.js"
];
for (const f of FILES) {
    (0, eval)(fs.readFileSync(path.join(SRC, f), "utf8"));
}

const CB = global.CB;

/* A silent audio surface. Audio is presentation, not simulation; testing its
 * oscillators under node would test node's lack of WebAudio. */
const silent = {};
for (const k of ["init", "resume", "setEnabled", "setZone", "ui", "click", "shoot",
    "hit", "mine", "crack", "pickup", "explode", "bigExplode", "playerHit",
    "death", "dock", "upgrade", "error", "alarm", "boss", "core", "win", "lose",
    "buzz", "respawn"]) {
    silent[k] = function () {};
}
CB.Audio = silent;

/* Runs must not write the player's real profile under test. Storage itself is
 * tested in content.test.js; the run recorder is silenced here. */
CB.Storage.recordRun = function () {};
CB.Storage.recordEvent = function () {};

function fresh(seed, difficulty) {
    const state = CB.World.initMatch(seed === undefined ? 1234 : seed, difficulty || "pilot");
    state.onEnd = null;
    return state;
}

/* Drive the simulation without a player, or with a simple scripted one. The
 * test passes the input itself because world.js deliberately does not know
 * about keyboards. */
function step(state, dt, input) {
    if (input) state.input = input;
    CB.World.update(dt === undefined ? 1 / 60 : dt);
}

function idleInput(state) {
    const p = state.player;
    return {
        moveX: 0, moveY: 0,
        aimX: p ? p.x + 1 : 1, aimY: p ? p.y : 0,
        fire: false, boost: false
    };
}

function runFor(state, seconds, opts) {
    opts = opts || {};
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i++) {
        if (state.phase !== "running") break;
        const input = opts.input ? opts.input(state, i) : idleInput(state);
        step(state, 1 / 60, input);
        if (opts.each) opts.each(state, i);
    }
    return state;
}

function nearAsteroid(state, maxDist) {
    const p = state.player;
    let best = null, bestD = (maxDist || Infinity) * (maxDist || Infinity);
    for (const a of state.asteroids) {
        if (!a.alive) continue;
        const d = (a.x - p.x) * (a.x - p.x) + (a.y - p.y) * (a.y - p.y);
        if (d < bestD) { bestD = d; best = a; }
    }
    return best;
}

function finiteShips(state) {
    return state.ships.every((s) =>
        Number.isFinite(s.x) && Number.isFinite(s.y) &&
        Number.isFinite(s.hull) && Number.isFinite(s.shield) &&
        Number.isFinite(s.vx) && Number.isFinite(s.vy));
}

/* ---------- reporting (same shape as the repo's other suites) ---------- */

let checks = 0;
let failures = 0;
const failLines = [];

function check(label, cond, extra) {
    checks++;
    if (cond) {
        console.log("  PASS  " + label);
    } else {
        failures++;
        const line = label + (extra === undefined ? "" : "  -> " + extra);
        failLines.push(line);
        console.log("  FAIL  " + line);
    }
}

function section(title) {
    console.log("\n=== " + title + " ===");
}

function report() {
    console.log("\n" + (checks - failures) + "/" + checks + " checks passed");
    if (failures) {
        console.log("FAILED:");
        failLines.forEach((l) => console.log("  - " + l));
        process.exitCode = 1;
    }
}

module.exports = {
    CB, C: CB.CONFIG, World: CB.World, Shipyard: CB.Shipyard,
    fresh, step, idleInput, runFor, nearAsteroid, finiteShips,
    check, section, report
};
