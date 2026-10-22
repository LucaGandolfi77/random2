/*
 * GULPER test harness.
 *
 * Loads the real source files into a fake DOM and exposes a real world.
 * Every suite boots through this rather than through the game's boot(),
 * because boot() reaches for a canvas, a service worker and an
 * AudioContext, none of which exist under node - and a test that stubs
 * the game out is a test of the stub.
 *
 * The stubs are deliberately minimal and deliberately real where it
 * matters: localStorage is a real Map so a save round-trip tests the
 * save, and the rasteriser is the real one, so a NaN that reaches the
 * renderer is a failure rather than a silent nothing.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

/* Order matters: config and rng have no dependencies, raster is needed by
 * the renderer, storage reads the config, and world reads everything. */
const FILES = [
    "config.js", "rng.js", "raster.js", "palette.js", "meshes.js",
    "particles.js", "storage.js", "species.js", "weapons.js", "body.js",
    "biomes.js", "levels.js", "modes.js", "alarm.js", "combat.js", "absorb.js",
    "ai.js", "world.js", "audio.js", "render.js", "input.js"
];

/* ---------- browser stubs ---------- */

const store = new Map();
global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
};

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
global.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });

/* A recording 2D context. Every numeric argument is checked for NaN at
 * draw time, because a NaN that reaches the renderer is silent - Canvas
 * ignores it and draws nothing - and the only way to catch it is to
 * watch the values go past. */
let drawCalls = 0;
const badNumbers = [];

/* The pixels of the last frame the renderer blitted. */
let lastFrame = null;

function checkNum(v, where) {
    if (typeof v === "number" && !isFinite(v)) {
        badNumbers.push(where + " -> " + String(v));
        return true;
    }
    return false;
}

const ctxStub = {
    canvas: null,
    imageSmoothingEnabled: true,
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    putImageData(img) {
        drawCalls++;
        if (!img || !img.data) return;
        /* Keep the last frame: a test that wants to know what the game
         * actually painted needs the pixels, not a promise. */
        lastFrame = img.data;
        for (let i = 0; i < img.data.length; i += 4) {
            if (img.data[i + 3] === 0) continue;
            const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
            if (!isFinite(r) || !isFinite(g) || !isFinite(b)) {
                badNumbers.push("putImageData -> " + r + "," + g + "," + b);
                return;
            }
        }
    },
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    fillRect() { drawCalls++; },
    clearRect() { drawCalls++; },
    fillText() { drawCalls++; },
    save() {}, restore() {}, translate() {}, scale() {}, beginPath() {},
    closePath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {},
    arc() {}, rect() {}, setTransform() {},
    set fillStyle(v) { checkNum(v, "fillStyle"); },
    set strokeStyle(v) { checkNum(v, "strokeStyle"); },
    set globalAlpha(v) { checkNum(v, "globalAlpha"); },
    set font(v) { /* no-op */ }
};

function makeCanvas() {
    const c = {
        width: 390, height: 844,
        style: {},
        getContext: () => ctxStub,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
        addEventListener() {}, removeEventListener() {},
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        querySelector: () => null, querySelectorAll: () => [],
        setPointerCapture() {}, releasePointerCapture() {}
    };
    ctxStub.canvas = c;
    return c;
}

/* ImageData, which the renderer needs to blit its buffer. */
global.ImageData = class ImageData {
    constructor(data, w, h) {
        this.data = data;
        this.width = w;
        this.height = h;
    }
};

global.document = {
    getElementById: () => makeCanvas(),
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => makeCanvas(),
    addEventListener() {}, removeEventListener() {},
    readyState: "complete",
    body: { classList: { add() {}, remove() {}, toggle() {} } },
    hidden: false
};

global.window = global;

/* ---------- load the game ---------- */

for (const f of FILES) {
    (0, eval)(fs.readFileSync(path.join(SRC, f), "utf8"));
}

const GU = global.GU;

/* The renderer is initialised against the stub canvas so that draw() can
 * be exercised. Without this the render path is never tested at all, and
 * the render path is where a NaN would first appear. */
GU.Render.init(makeCanvas());

/* ---------- rasteriser instrumentation ----------
 * The renderer draws in software, so the honest measure of how expensive
 * a frame is is the number of polygons it rasterised, not the number of
 * Canvas calls. */
const rasterStats = { polys: 0, spans: 0, dots: 0, pixels: 0 };

const realPoly = GU.Raster.poly;
GU.Raster.poly = function (buf, pts, color) {
    rasterStats.polys++;
    if (typeof color === "number" && !isFinite(color)) {
        badNumbers.push("poly colour -> " + color);
    }
    for (let i = 0; i < pts.length; i++) {
        if (typeof pts[i] === "number" && !isFinite(pts[i])) {
            badNumbers.push("poly vertex -> " + pts[i]);
        }
    }
    return realPoly.apply(this, arguments);
};

const realDot = GU.Raster.dot;
GU.Raster.dot = function () {
    rasterStats.dots++;
    return realDot.apply(this, arguments);
};

function resetStats() {
    rasterStats.polys = 0;
    rasterStats.spans = 0;
    rasterStats.dots = 0;
    rasterStats.pixels = 0;
    drawCalls = 0;
    badNumbers.length = 0;
}

/* ---------- assertions ---------- */

let assertions = 0;
const failures = [];

function ok(cond, message) {
    assertions++;
    if (!cond) failures.push(message);
    return !!cond;
}

function equal(actual, expected, message) {
    assertions++;
    if (actual !== expected) {
        failures.push(message + " (expected " + expected + ", got " + actual + ")");
        return false;
    }
    return true;
}

function report(label) {
    if (failures.length) {
        console.log("\n  FAIL " + label + " — " + failures.length + " of " + assertions + " assertions failed");
        for (const f of failures.slice(0, 25)) console.log("    · " + f);
        if (failures.length > 25) console.log("    … and " + (failures.length - 25) + " more");
        return 1;
    }
    console.log("  ok   " + label + " — " + assertions + " assertions");
    return 0;
}

/* ---------- the bot ----------
 *
 * A headless player. It is not good - it does not dodge, it does not
 * manage its stamina and it walks into gunfire - but it does the three
 * things the game is actually about: break a thing's will, hold it, and
 * swallow it. If a level cannot be finished by that, the level cannot be
 * finished.
 */
/* The bot remembers where it has been, so that a target it cannot reach
 * - behind an electric fence, say - does not keep it walking into the
 * wire for the whole level. */
const stuck = { lastX: 0, lastY: 0, t: 0, blocked: [], wander: 0, targetId: null };

function botStep(world) {
    const p = world.player;
    const inp = world.input;

    inp.mx = 0; inp.my = 0;
    inp.attack = false; inp.attackHeld = false;
    inp.swallow = false; inp.swap = false; inp.frenzy = false;
    inp.aimActive = false;

    if (p.state === "swallowing" || p.state === "choking" || p.state === "downed") return;

    const obj = world.objective;
    const gape = GU.Body.effectiveGape(p);

    /* Holding something. */
    if (p.gripping) {
        if (obj.type === "snatch" && world.objective.extraction) {
            /* Carry it to the drop. The level does the rest. */
            const ex = world.objective.extraction;
            const dx = ex.x - p.x, dy = ex.y - p.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;

            /* A laden carrier that wedges in a corner of crates is no
             * use to anybody: the same escape the chase uses - measure
             * movement, and slide for a moment until the way opens. */
            const movedCarry = Math.sqrt((p.x - stuck.lastX) * (p.x - stuck.lastX) + (p.y - stuck.lastY) * (p.y - stuck.lastY));
            if (movedCarry > 18) {
                stuck.t = 0; stuck.lastX = p.x; stuck.lastY = p.y; stuck.wander = 0;
            } else {
                stuck.t += 1 / 30;
                if (stuck.t > 0.9) {
                    stuck.t = 0; stuck.lastX = p.x; stuck.lastY = p.y; stuck.wander = 0.85;
                }
            }
            if (stuck.wander > 0) {
                stuck.wander -= 1 / 30;
                const a = ((stuck.lastX * 0.31 + stuck.lastY * 0.77) + stuck.wander * 7) % 6.283;
                inp.mx = Math.cos(a); inp.my = Math.sin(a);
                steerAroundFences(world, inp);
                return;
            }

            inp.mx = dx / d; inp.my = dy / d;
            /* A laden carrier that walks straight into the wire only
             * makes stun soup of itself. Steer around the fences. */
            steerAroundFences(world, inp);
            return;
        }
        /* Do not try to swallow something that is too big. That is how
         * you choke, and choking is not a strategy. */
        if (p.gripping.mass <= gape) inp.swallow = true;
        return;
    }

    /* Every candidate, best first. */
    const candidates = [];
    for (const e of world.entities) {
        if (e.dead || e.removed || e.heldBy) continue;
        let want = false;
        if (e.kind === "prey") {
            if (obj.type === "cull") {
                /* Only the marked ones count, but the unmarked ones are
                 * still worth eating between them. */
                want = e.marked ? (e.mass <= gape) : (gape < 2);
            } else if (obj.type === "elite") {
                /* The marked ones are the objective; everything else is a
                 * meal between appointments. Filter that ruled out the
                 * buffet used to hollow out a body that took a few
                 * knockdowns and had nothing to eat back with. */
                want = e.marked ? (e.mass <= gape) : true;
            } else if (obj.type === "snatch") {
                want = !!e.marked;
            } else {
                want = e.mass <= gape;
            }
        } else if (e.kind === "boss") {
            want = true;
        }
        if (!want) continue;
        const d = Math.sqrt((e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y));
        /* A marked target is worth a long walk, but not an impossible
         * one: if it is behind a fence it is still preferred, just less. */
        /* The boss comes first, and the marked ones come before the
         * rest. */
        const score = d - (e.kind === "boss" ? 2000 : 0) - (e.marked ? 500 : 0)
            + (behindFence(world, e.x, e.y) ? 2500 : 0);
        candidates.push({ e: e, d: d, score: score });
    }
    candidates.sort((a, b) => a.score - b.score);

    /* Stuck? The last target is behind something. Drop it and take the
     * next one. */
    const moved = Math.sqrt((p.x - stuck.lastX) * (p.x - stuck.lastX) + (p.y - stuck.lastY) * (p.y - stuck.lastY));
    if (moved > 18) {
        stuck.t = 0;
        stuck.lastX = p.x; stuck.lastY = p.y;
        stuck.blocked.length = 0;
        stuck.wander = 0;
    } else {
        stuck.t += 1 / 30;
        if (stuck.t > 0.9) {
            stuck.t = 0;
            stuck.lastX = p.x; stuck.lastY = p.y;
            stuck.blocked.push(stuck.targetId);
            stuck.targetId = null;
            stuck.wander = 0.9;
        }
    }

    if (stuck.wander > 0) {
        /* Walk away from whatever is in the way. */
        stuck.wander -= 1 / 30;
        const a = ((stuck.lastX * 0.31 + stuck.lastY * 0.77) + stuck.wander * 7) % 6.283;
        inp.mx = Math.cos(a);
        inp.my = Math.sin(a);
        steerAroundFences(world, inp);
        return;
    }

    let target = null;
    /* Commit to a target. Spreading the damage over four different
     * people is what a panicking player does, and it never breaks
     * anybody's nerve. */
    if (stuck.targetId) {
        for (const c of candidates) {
            if (c.e.id === stuck.targetId) { target = c.e; break; }
        }
        if (!target) stuck.targetId = null;
    }
    if (!target) {
        for (const c of candidates) {
            if (stuck.blocked.indexOf(c.e.id) >= 0) continue;
            target = c.e;
            break;
        }
        if (target) stuck.targetId = target.id;
    }
    if (!target) {
        /* Everything is blocked. Take the nearest one anyway and hope. */
        if (!candidates.length) return;
        target = candidates[0].e;
        stuck.blocked.length = 0;
    }

    const dx = target.x - p.x, dy = target.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;

    inp.aimActive = true;
    inp.aimX = target.x;
    inp.aimY = target.y;

    /* Stop closing when you are in range. The range is the weapon's
     * real range, which grows with the player's size - a big creature
     * does not need to walk into the boss's face to hurt it. */
    const wdef = GU.Weapons.stats(p.current, p.tiers[p.current] || 1);
    /* The real reach: world.js scales the weapon's reach with the
     * player's size (p.reach / base radius), and the HUD ring is where
     * that lands. The bot stops at the same ring — a body this size
     * that walks into a fleeing crowd's face only teaches the crowd to
     * run. At the ring's edge the sweep still lands, and the panic never
     * quite catches to begin. */
    const reachScale = p.radius / GU.CONFIG.player.radius;
    const reach = (wdef ? wdef.reach : 54) * reachScale * 0.85 + target.r;
    if (d > reach) {
        inp.mx = dx / d; inp.my = dy / d;
    }

    if (d < reach + 10) {
        const wantGrasp = target.kind === "boss" ? target.will <= 0.06 : target.will <= 0.3;
        if (wantGrasp && p.slots.indexOf("grasp") >= 0) p.current = "grasp";
        else if (p.slots.indexOf("lash") >= 0) p.current = "lash";
        inp.attack = true;
    }
    steerAroundFences(world, inp);
}

/* Do two segments cross? Used to work out whether a target is on the
 * other side of an electric fence. */
function segIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const r1 = bx - ax, r2 = by - ay;
    const s1 = dx - cx, s2 = dy - cy;
    const denom = r1 * s2 - r2 * s1;
    if (Math.abs(denom) < 1e-9) return false;
    const t = ((cx - ax) * s2 - (cy - ay) * s1) / denom;
    const u = ((cx - ax) * r2 - (cy - ay) * r1) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/* Would the straight line from the player to this target cross a fence?
 * If it would, the target is behind a wall of electricity and is a much
 * worse choice than one you can simply walk to. */
function behindFence(world, x, y) {
    const p = world.player;
    for (const h of world.hazards) {
        if (h.kind !== "fence") continue;
        let ax, ay, bx, by;
        if (h.horizontal) {
            ax = h.x - h.len / 2; ay = h.y; bx = h.x + h.len / 2; by = h.y;
        } else {
            ax = h.x; ay = h.y - h.len / 2; bx = h.x; by = h.y + h.len / 2;
        }
        if (segIntersect(p.x, p.y, x, y, ax, ay, bx, by)) return true;
    }
    return false;
}

/* Steer around the electric fences.
 *
 * They are line segments, so the way around one is perpendicular to it.
 * A bot that does not know this walks into the wire and dies, which
 * measures the bot and not the game - so the bot knows this.
 */
function steerAroundFences(world, inp) {
    const p = world.player;
    for (const h of world.hazards) {
        if (h.kind !== "fence") continue;
        const half = h.len / 2;
        const along = h.horizontal ? (p.x - h.x) : (p.y - h.y);
        const across = h.horizontal ? (p.y - h.y) : (p.x - h.x);
        if (Math.abs(along) > half + 24) continue;
        const band = 26;
        if (Math.abs(across) > band) continue;
        const push = (band - Math.abs(across)) / band;
        const sign = across >= 0 ? 1 : -1;
        if (h.horizontal) inp.my += sign * push * 1.8;
        else inp.mx += sign * push * 1.8;
    }
    /* And around the furniture. A body this size wedges against a barrel
     * cluster and dies there; slide past, staying just outside the
     * resolve zone, the way a player with two thumbs and a sense of
     * self preservation would. */
    for (const pr of world.props || []) {
        if (!pr.solid) continue;
        const dxp = p.x - pr.x, dyp = p.y - pr.y;
        const need = (pr.r || 8) + p.r * 0.8 + 12;
        const d2 = dxp * dxp + dyp * dyp;
        if (d2 > need * need || d2 < 0.0001) continue;
        const d = Math.sqrt(d2);
        const pressure = (need - d) / need;
        inp.mx += (dxp / d) * pressure * 1.2;
        inp.my += (dyp / d) * pressure * 1.2;
    }
    const m = Math.sqrt(inp.mx * inp.mx + inp.my * inp.my);
    if (m > 1) { inp.mx /= m; inp.my /= m; }
}

/* Build a level with the callbacks main.js would have wired up. */
function createLevel(id, opts) {
    opts = opts || {};
    /* The bot's memory does not survive a level change: entity ids
     * restart at one, so a remembered target from the last level would
     * point at somebody entirely different. */
    stuck.lastX = 0; stuck.lastY = 0; stuck.t = 0;
    stuck.blocked.length = 0; stuck.wander = 0; stuck.targetId = null;
    const world = GU.World.create(id, {
        seed: opts.seed,
        /* Synthetic levels (the shrines) can be passed whole, with
         * their own entry biomass. */
        level: opts.level,
        carry: opts.carry,
        adaptations: opts.adaptations || [],
        weapons: opts.weapons || { lash: 1, grasp: 1 },
        slots: opts.slots || GU.Body.loadout(GU.Storage.data()),
        difficulty: opts.difficulty || "standard",
        showDamage: opts.showDamage !== false
    });
    if (!world) return null;
    world.aimAssist = true;
    world.onSwallow = (e) => GU.World.onSwallow(world, e);
    world.onStage = () => { };
    world.onLockdown = () => { };
    return world;
}

/* Run a level with the bot until it ends or the clock runs out. */
function playLevel(world, maxSeconds) {
    const dt = 1 / 30;
    const steps = Math.floor((maxSeconds || 400) / dt);
    for (let i = 0; i < steps; i++) {
        if (world.status !== "playing") break;
        botStep(world);
        GU.World.update(world, dt);
    }
    return world.status;
}

module.exports = {
    GU,
    ok,
    equal,
    report,
    botStep,
    playLevel,
    createLevel,
    rasterStats,
    resetStats,
    badNumbers,
    /* The pixels of the last frame, and a cheap fingerprint of them so
     * two frames can be compared without keeping them around. */
    lastFrame: () => lastFrame,
    frameHash: () => {
        if (!lastFrame) return "";
        let h = 5381;
        for (let i = 0; i < lastFrame.length; i += 4) {
            h = ((h * 33) ^ lastFrame[i]) >>> 0;
            h = ((h * 33) ^ lastFrame[i + 1]) >>> 0;
            h = ((h * 33) ^ lastFrame[i + 2]) >>> 0;
        }
        return String(h);
    },
    getDrawCalls: () => drawCalls
};
