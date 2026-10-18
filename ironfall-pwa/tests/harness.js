/*
 * IRONFALL test harness.
 *
 * Loads the real source files into a fake DOM and exposes a real world. Every
 * suite boots through this rather than through the game's boot(), because
 * boot() reaches for a canvas, a service worker and an AudioContext, none of
 * which exist under node - and a test that stubs the game out is a test of
 * the stub.
 *
 * The stubs are deliberately minimal and deliberately real where it matters:
 * the canvas records every call so a NaN reaching the renderer is a failure,
 * and localStorage is a real Map so a save round-trip tests the save.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

/* Order matters: config and rng and mapdata have no dependencies, storage
 * reads S.Runes and S.Storage.doctrineStats, abilities reads config and
 * combat, world reads all of them, and ai reads world. */
const FILES = [
    "config.js", "rng.js", "mapdata.js", "storage.js", "champions.js",
    "runes.js", "items.js", "combat.js", "abilities.js", "world.js",
    "ai.js", "audio.js", "render.js", "minimap.js"
];

/* ---------- browser stubs ---------- */

const store = new Map();
global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
};

/* navigator and performance are getter-only on the modern node global, so
 * they have to be redefined rather than assigned. */
Object.defineProperty(global, "navigator", {
    value: { vibrate() {} }, configurable: true, writable: true
});
Object.defineProperty(global, "performance", {
    value: { now: () => Date.now() }, configurable: true, writable: true
});
global.requestAnimationFrame = () => 0;
global.devicePixelRatio = 2;
global.innerWidth = 390;
global.innerHeight = 844;

/* A recording 2D context. Every numeric argument is checked for NaN at draw
 * time, because a NaN that reaches the renderer is silent - Canvas ignores
 * it and draws nothing - and the only way to catch it is to watch the values
 * go past. */
let drawCalls = 0;
const badNumbers = [];
function checkNum(v, where) {
    if (typeof v === "number" && !isFinite(v)) {
        badNumbers.push(where + " -> " + String(v));
        return true;
    }
    return false;
}

const ctxStub = new Proxy({}, {
    get(_, prop) {
        if (prop === "canvas") return { width: 390, height: 844 };
        if (prop === "measureText") return () => ({ width: 10 });
        /* Properties that are assigned rather than called. */
        if (prop === "createLinearGradient") return () => ({ addColorStop() {} });
        if (typeof prop === "symbol") return undefined;
        return function () {
            drawCalls++;
            for (let i = 0; i < arguments.length; i++) checkNum(arguments[i], String(prop));
            return undefined;
        };
    },
    set(_, prop, value) {
        checkNum(value, "set " + String(prop));
        return true;
    }
});

function makeCanvas() {
    return {
        width: 390, height: 844,
        style: {},
        getContext: () => ctxStub,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
        addEventListener() {},
        removeEventListener() {},
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        querySelector: () => null,
        querySelectorAll: () => [],
        setPointerCapture() {},
        releasePointerCapture() {}
    };
}

global.window = global;
global.document = {
    getElementById: () => makeCanvas(),
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => makeCanvas(),
    addEventListener() {},
    removeEventListener() {},
    readyState: "complete",
    body: { classList: { add() {}, remove() {}, toggle() {} } },
    hidden: false
};

for (const f of FILES) {
    (0, eval)(fs.readFileSync(path.join(SRC, f), "utf8"));
}

/* ui.js and main.js are deliberately not loaded: both reach for
 * navigator.serviceWorker, performance.now and a real canvas layout, and
 * both are covered end-to-end by boot.test.js against a fake DOM built from
 * the real index.html. */

/* The renderer and the minimap are initialised against the stub canvas so
 * that draw() can be exercised. Without this the render path is never
 * tested at all, and the render path is where a NaN would first appear. */
const IF = global.IF;

IF.Render.init(makeCanvas());
IF.Minimap.init(makeCanvas());



/* ---------- match builder ---------- */

/* Build a full six-champion match. Same shape main.js builds, without the
 * record lookup and the DOM. */
function buildMatch(opts) {
    opts = opts || {};
    const seed = opts.seed === undefined ? 1337 : opts.seed;
    const world = IF.World.createWorld({ seed, difficulty: opts.difficulty || "guardsman" });
    IF.AI.resetStream(seed ^ 0x5eed);

    const teams = { 0: [], 1: [] };
    const taken = [];
    teams[0].push(opts.player || IF.Champions.ids()[0]);
    taken.push(teams[0][0]);

    for (let i = 0; i < 5; i++) {
        const team = i < 2 ? 0 : 1;
        const comp = {};
        for (const id of teams[team]) {
            const c = IF.Champions.get(id);
            comp[c.role] = (comp[c.role] || 0) + 1;
        }
        const chosen = IF.Champions.draftPick(world.seed, taken, comp);
        if (!chosen) break;
        taken.push(chosen.id);
        teams[team].push(chosen.id);
    }

    let me = null;
    for (let t = 0; t < 2; t++) {
        for (let i = 0; i < teams[t].length; i++) {
            const id = teams[t][i];
            const base = IF.Map.bases[t];
            const isPlayer = t === 0 && i === 0;
            const lane = IF.AI.laneForRole[(IF.Champions.get(id) || {}).role] || "mid";
            const runes = isPlayer ? IF.Runes.resolve(null).reduce((acc, r) => {
                acc["row" + r.row] = r.id;
                return acc;
            }, {}) : loadout(world.seed, t);
            const u = IF.World.makeChampion(world, {
                champId: id, team: t, lane, isPlayer, runes, doctrineTier: 0,
                x: base.spawn.x + (i - 1) * 90,
                y: base.spawn.y + (i - 1) * 90
            });
            if (isPlayer) me = u;
            /* In the real game the player champion is driven by a human. For
             * the balance harness there is no human, and a match where one of
             * six champions stands in its fountain forever measures nothing
             * useful - so give it a brain unless the caller wants to drive it
             * from `beforeStep`. */
            if (isPlayer && opts.playerIsIdle) continue;
            IF.AI.makeBrain(world, u, opts.difficulty || "guardsman");
        }
    }

    IF.AI.assignLanes(world.champs);
    world.player = me;
    IF.Render.setTeam(me.team);
    return world;
}

function loadout(rng, team) {
    const out = {};
    for (let r = 0; r < 3; r++) {
        const row = IF.Runes.byRow(r);
        out["row" + r] = row[Math.floor(rng() * row.length)].id;
    }
    return out;
}

/* Run a match forward. Every step also drains combat events and checks the
 * renderer for NaN every `renderEvery` steps, because the two ways this
 * simulation breaks are "it throws" and "it quietly produces a number nobody
 * can use". */
function run(world, seconds, opts) {
    opts = opts || {};
    const dt = IF.CONFIG.fixedStep;
    const steps = Math.floor(seconds / dt);
    const renderEvery = opts.renderEvery || 30;
    const stats = { kills: 0, waves: 0, errors: [] };

    for (let i = 0; i < steps; i++) {
        if (world.over && !opts.continueAfterOver) break;
        try {
            if (opts.beforeStep) opts.beforeStep(world, i * dt);
            IF.World.step(world, dt);
            const evts = IF.Combat.drainEvents();
            for (const e of evts) if (e.type === "kill") stats.kills++;
            IF.Combat.drainHeals();
        } catch (err) {
            stats.errors.push("step " + i + ": " + (err && err.stack ? err.stack : String(err)));
            break;
        }
        if (i % renderEvery === 0) {
            try {
                IF.Render.draw(world, dt);
                IF.Minimap.draw(world);
            } catch (err) {
                stats.errors.push("render " + i + ": " + (err && err.stack ? err.stack : String(err)));
                break;
            }
        }
    }
    return stats;
}

/* ---------- assertions ---------- */

let failures = 0;
let checks = 0;

function check(label, cond, extra) {
    checks++;
    if (cond) {
        console.log("  PASS  " + label);
    } else {
        failures++;
        console.log("  FAIL  " + label + (extra !== undefined ? "  ->  " + extra : ""));
    }
    return !!cond;
}

function section(name) {
    console.log("\n" + name);
    console.log("-".repeat(name.length));
}

function report(name) {
    console.log("\n" + "=".repeat(58));
    if (failures === 0) {
        console.log(name + ": ALL " + checks + " CHECKS PASSED");
        console.log("=".repeat(58));
        process.exit(0);
    }
    console.log(name + ": " + failures + " of " + checks + " CHECKS FAILED");
    console.log("=".repeat(58));
    process.exit(1);
}

module.exports = {
    IF: IF, buildMatch, run, check, section, report,
    makeCanvas, ctxStub,
    get draws() { return drawCalls; },
    get badNumbers() { return badNumbers; },
    resetDrawCount() { drawCalls = 0; },
    store
};
