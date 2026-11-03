/*
 * CINDER BELT headless boot test.
 *
 *   node cinder-belt-pwa/tests/boot.test.js
 *
 * Boots the real index.html DOM (as a fake, id-for-id) through the real
 * scripts, then drives requestAnimationFrame by hand. This is the layer the
 * other suites skip: ui.js binding ids, input.js listeners, main.js's
 * menu/run/dock/pause/over state machine and the renderer's canvas calls.
 *
 * A renamed id or an unwired button should fail here, not in a browser
 * console a week later.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* ---------- canvas ---------- */
function makeCtx(canvas) {
    const ctx = {
        canvas,
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
        fillStyle: "#000",
        strokeStyle: "#000",
        lineWidth: 1,
        lineDashOffset: 0,
        font: "10px sans-serif",
        textAlign: "left",
        shadowBlur: 0,
        shadowColor: "#000",
        save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
        setTransform() {}, resetTransform() {}, clip() {},
        beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
        arc() {}, arcTo() {}, ellipse() {}, rect() {}, roundRect() {},
        stroke() {}, fill() {}, fillRect() {}, strokeRect() {}, clearRect() {},
        fillText() {}, strokeText() {},
        setLineDash() {}, drawImage() {},
        measureText() { return { width: 8 }; },
        createRadialGradient() { return { addColorStop() {} }; },
        createLinearGradient() { return { addColorStop() {} }; },
        createPattern() { return null; }
    };
    return ctx;
}

/* ---------- fake DOM ---------- */
const staticNodes = new Map();   /* id -> element */
const classNodes = new Map();    /* class name -> synthetic element */
const attrNodes = new Map();     /* "data-diff" -> [elements] */
const winListeners = {};
const docListeners = {};
let clock = 0;
let rafQueue = [];

function classListFor(set) {
    return {
        add: (c) => set.add(c),
        remove: (c) => set.delete(c),
        contains: (c) => set.has(c),
        toggle: (c, force) => {
            const on = force === undefined ? !set.has(c) : !!force;
            if (on) set.add(c); else set.delete(c);
            return on;
        }
    };
}

function makeEl(id, tag, attrs) {
    attrs = attrs || {};
    const classes = new Set((attrs.class || "").split(/\s+/).filter(Boolean));
    const listeners = {};
    const attributes = Object.assign({}, attrs);
    const el = {
        id: id || "",
        tagName: (tag || "div").toUpperCase(),
        style: {},
        dataset: {},
        children: [],
        parentNode: null,
        hidden: Object.prototype.hasOwnProperty.call(attrs, "hidden"),
        disabled: false,
        _text: "",
        _html: "",
        _listeners: listeners,
        classList: classListFor(classes),
        addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
        removeEventListener() {},
        appendChild(child) { child.parentNode = el; el.children.push(child); return child; },
        removeChild(child) { const i = el.children.indexOf(child); if (i >= 0) el.children.splice(i, 1); return child; },
        setAttribute(name, value) {
            attributes[name] = String(value);
            if (name === "hidden") el.hidden = true;
        },
        removeAttribute(name) {
            delete attributes[name];
            if (name === "hidden") el.hidden = false;
        },
        getAttribute(name) {
            return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
        },
        getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 800, right: 400, bottom: 800 }; },
        setPointerCapture() {}, releasePointerCapture() {},
        focus() {}, click() {},
        getContext(kind) {
            if (kind !== "2d") return null;
            if (!el._ctx) el._ctx = makeCtx(el);
            return el._ctx;
        },
        closest(sel) {
            const attr = sel.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
            if (attr && el.getAttribute(attr[1]) !== null) {
                if (attr[2] === undefined || el.getAttribute(attr[1]) === attr[2]) return el;
            }
            return null;
        },
        querySelector(sel) {
            const list = el.querySelectorAll(sel);
            return list[0] || null;
        },
        querySelectorAll(sel) {
            if (sel.startsWith(".")) {
                const name = sel.slice(1);
                if (!classNodes.has(name)) classNodes.set(name, makeEl("", "span", { class: name }));
                return [classNodes.get(name)];
            }
            const attr = sel.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
            if (attr) {
                if (el._html) return parseMarkup(el._html, attr[1], attr[2]);
                return attrNodes.get(attr[1]) || [];
            }
            return [];
        }
    };
    Object.defineProperty(el, "textContent", {
        get() { return el._text; },
        set(v) { el._text = String(v); }
    });
    Object.defineProperty(el, "innerHTML", {
        get() { return el._html; },
        set(v) { el._html = String(v); }
    });
    if (tag === "canvas") {
        el.width = 180;
        el.height = 180;
        el.clientWidth = 170;
        el.clientHeight = 170;
    }
    return el;
}

/* Create fake nodes for every tag in index.html that declares an id, a
 * data-* attribute or a class we actually query. */
const TAG_RE = /<([a-z][a-z0-9]*)\b([^>]*)>/gi;
let tagMatch;
while ((tagMatch = TAG_RE.exec(html))) {
    const tag = tagMatch[1].toLowerCase();
    const raw = tagMatch[2];
    const attrs = {};
    for (const m of raw.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
    const id = attrs.id;
    if (id && !staticNodes.has(id)) staticNodes.set(id, makeEl(id, tag, attrs));
    if (tag === "button") {
        ["data-diff", "data-setting", "data-hull"].forEach((key) => {
            if (attrs[key] !== undefined) {
                const node = makeEl("", "button", attrs);
                if (!attrNodes.has(key)) attrNodes.set(key, []);
                attrNodes.get(key).push(node);
            }
        });
    }
    if (attrs.class) {
        attrs.class.split(/\s+/).forEach((name) => {
            if (!classNodes.has(name)) classNodes.set(name, makeEl("", tag, attrs));
        });
    }
}

/* Render generated markup (hangar upgrade cards) into addressable fake nodes. */
function parseMarkup(markup, attrName, attrValue) {
    const out = [];
    let m;
    const re = /<([a-z][a-z0-9]*)\b([^>]*)>/gi;
    while ((m = re.exec(markup))) {
        const tag = m[1].toLowerCase();
        const attrs = {};
        for (const a of m[2].matchAll(/([a-zA-Z-]+)=['"]?([^'"\s>]+)['"]?/g)) attrs[a[1]] = a[2];
        if (attrs[attrName] === undefined) continue;
        if (attrValue !== undefined && attrs[attrName] !== attrValue) continue;
        out.push(makeEl("", tag, attrs));
    }
    return out;
}

const body = makeEl("body", "body");
const document = {
    readyState: "complete",
    visibilityState: "visible",
    body,
    documentElement: makeEl("html", "html"),
    getElementById: (id) => staticNodes.get(id) || null,
    createElement: (tag) => makeEl("", tag),
    querySelector: (sel) => document.querySelectorAll(sel)[0] || null,
    querySelectorAll: (sel) => {
        const attr = sel.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
        if (attr) return attrNodes.get(attr[1]) || [];
        if (sel.startsWith(".")) {
            const name = sel.slice(1);
            return classNodes.has(name) ? [classNodes.get(name)] : [];
        }
        return [];
    },
    addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
    removeEventListener() {}
};

global.window = global;
global.document = document;
global.innerWidth = 1280;
global.innerHeight = 800;
global.devicePixelRatio = 1;
global.performance = { now: () => clock };
global.requestAnimationFrame = (fn) => { rafQueue.push(fn); return rafQueue.length; };
global.cancelAnimationFrame = () => {};
global.addEventListener = (type, fn) => { (winListeners[type] = winListeners[type] || []).push(fn); };
global.removeEventListener = (type, fn) => {
    const list = winListeners[type];
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
};
function fireWindow(type, ev) { (winListeners[type] || []).forEach((fn) => fn(ev)); }
function fireDoc(type, ev) { (docListeners[type] || []).forEach((fn) => fn(ev)); }

const store = new Map();
global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
};
Object.defineProperty(globalThis, "navigator", {
    value: { maxTouchPoints: 0, vibrate() {} },
    configurable: true, writable: true
});
global.AudioContext = undefined;   /* exercises the silent-audio path */
global.R2 = undefined;

/* Deterministic scatter: render background stars and particles use
 * Math.random directly, and a render test should fail on code, not dice. */
{
    let s = 0x1a2b3c4d;
    Math.random = function () {
        s ^= s << 13; s >>>= 0;
        s ^= s >>> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
    };
}

/* ---------- load the real game ---------- */
const FILES = ["config.js", "rng.js", "storage.js", "audio.js", "input.js",
    "shipyard.js", "zones.js", "world.js", "ai.js", "npcs.js",
    "render.js", "minimap.js", "ui.js", "main.js"];
for (const f of FILES) (0, eval)(fs.readFileSync(path.join(SRC, f), "utf8"));

const CB = global.CB;
const World = CB.World;

/* ---------- tiny test harness ---------- */
let checks = 0, failures = 0;
const failed = [];
function check(label, cond, extra) {
    checks++;
    if (cond) {
        console.log("  PASS  " + label);
    } else {
        failures++;
        const line = label + (extra === undefined ? "" : "  -> " + extra);
        failed.push(line);
        console.log("  FAIL  " + line);
    }
}
function section(t) { console.log("\n=== " + t + " ==="); }
function tick(n, dt) {
    dt = dt === undefined ? 16.7 : dt;
    for (let i = 0; i < n; i++) {
        const cb = rafQueue.shift();
        if (!cb) throw new Error("no frame callback queued");
        clock += dt;
        cb(clock);
    }
}
function click(id) {
    const el = staticNodes.get(id);
    if (!el) throw new Error("no element #" + id);
    const list = el._listeners.click || [];
    if (!list.length) throw new Error("#" + id + " has no click handler");
    list.forEach((fn) => fn({ target: el, preventDefault() {}, stopPropagation() {} }));
}
function key(k) {
    fireWindow("keydown", { key: k, preventDefault() {}, target: body });
}
function keyUp(k) {
    fireWindow("keyup", { key: k, target: body });
}

/* ---------- boot ---------- */
section("Boot");
let bootError = null;
try { /* main.js boots on evaluation because readyState is complete */ }
catch (e) { bootError = e; }
check("boot ran without throwing", !bootError, bootError && bootError.stack);
check("a frame was requested", rafQueue.length === 1, rafQueue.length);
check("the menu is visible", staticNodes.get("menu").hidden === false);
check("the HUD starts hidden", staticNodes.get("hud").hidden === true);

let frameError = null;
try { tick(20); } catch (e) { frameError = e; }
check("menu frames run clean", !frameError, frameError && frameError.stack);
check("the canvas was sized", staticNodes.get("game").width === 1280,
    staticNodes.get("game").width + "x" + staticNodes.get("game").height);

/* ---------- launch ---------- */
section("Launch and flight");
try {
    click("btn-launch");
    tick(90);
} catch (e) { frameError = e; }
check("launch runs clean", !frameError, frameError && frameError.stack);
check("a run is live", World.state.phase === "running", World.state.phase);
check("the player exists", !!World.state.player && World.state.player.alive);
check("the HUD is shown", staticNodes.get("hud").hidden === false);
check("the menu is hidden", staticNodes.get("menu").hidden === true);
check("the clock is running", World.state.time > 1, World.state.time.toFixed(2));
check("the timer is rendered", /^\d+:\d\d$/.test(staticNodes.get("timer").textContent),
    staticNodes.get("timer").textContent);

const p0 = World.state.player;
const startY = p0.y;
try {
    key("w");
    tick(45);
    keyUp("w");
} catch (e) { frameError = e; }
check("keyboard thrust moves the ship", p0.y < startY - 1,
    startY.toFixed(1) + " -> " + p0.y.toFixed(1));
check("flight frames run clean", !frameError, frameError && frameError.stack);

const bulletsBefore = World.state.bullets.length;
try {
    key("f");
    tick(25);
    key("f");
} catch (e) { frameError = e; }
check("fire spawns bullets", World.state.bullets.length > bulletsBefore,
    bulletsBefore + " -> " + World.state.bullets.length);
check("the HUD shows the hull", staticNodes.get("hull-name").textContent === "YOU",
    staticNodes.get("hull-name").textContent);
check("the hull bar is finite", /%$/.test(staticNodes.get("bar-hull").style.width),
    staticNodes.get("bar-hull").style.width);

/* ---------- docking ---------- */
section("Drydock");
const p = World.state.player;
p.x = World.state.home.x + 40;
p.y = World.state.home.y + 40;
try {
    key("e");
    tick(2);
} catch (e) { frameError = e; }
check("docking runs clean", !frameError, frameError && frameError.stack);
check("the ship is docked", p.docked === true);
check("the drydock screen is open", staticNodes.get("hangar").hidden === false);
check("the upgrade cards rendered", staticNodes.get("upgrade-options")._html.indexOf("data-hull") >= 0);
check("three doctrines are offered",
    staticNodes.get("upgrade-options").querySelectorAll("[data-hull]").length === 3);
check("docking banks the hold", p.cargoUnits === 0 && p.credits >= 0);

const frozen = World.state.time;
try { tick(30); } catch (e) { frameError = e; }
check("the drydock freezes the match clock", World.state.time === frozen,
    frozen.toFixed(2) + " vs " + World.state.time.toFixed(2));
check("docked frames run clean", !frameError, frameError && frameError.stack);

/* Buy a doctrine through the real click path. The button is disabled until
 * the pilot can afford it, so top up the wallet first. */
p.credits = 500;
CB.UI.refreshHangar(World.state);
let upgradeError = null;
try {
    const buy = staticNodes.get("upgrade-options").querySelectorAll("[data-hull]")[0];
    (staticNodes.get("upgrade-options")._listeners.click || [])
        .forEach((fn) => fn({ target: buy, preventDefault() {}, stopPropagation() {} }));
} catch (e) { upgradeError = e; }
check("upgrading through the UI runs clean", !upgradeError, upgradeError && upgradeError.stack);
check("the hull changed", p.hullId !== "sparrow" && p.tier === 2, p.hullId + " t" + p.tier);
check("the hangar refreshed its quote", staticNodes.get("upgrade-title").textContent.length > 0,
    staticNodes.get("upgrade-title").textContent);

try { click("btn-undock"); tick(20); } catch (e) { frameError = e; }
check("undocking returns to flight", p.docked === false && p.alive);
check("the drydock screen closed", staticNodes.get("hangar").hidden === true);
check("undocking resumes the clock", World.state.time > frozen,
    frozen.toFixed(2) + " -> " + World.state.time.toFixed(2));

/* ---------- pause ---------- */
section("Pause");
try { click("pause-btn"); tick(4); } catch (e) { frameError = e; }
check("pause opens the modal", staticNodes.get("pause").hidden === false);
const pausedAt = World.state.time;
try { tick(30); } catch (e) { frameError = e; }
check("pause stops the clock", World.state.time === pausedAt);
try { click("btn-resume"); tick(15); } catch (e) { frameError = e; }
check("resume closes the modal", staticNodes.get("pause").hidden === true);
check("resume restarts the clock", World.state.time > pausedAt);

/* ---------- end of run ---------- */
section("Game over");
try {
    const s = World.state;
    s.nexus.shield = 0;
    s.nexus.shieldDownUntil = s.time + 30;
    World.damageStructure(s.nexus, 1e9, s.player);
    tick(3);
} catch (e) { frameError = e; }
check("the end screen appears", !frameError && staticNodes.get("gameover").hidden === false,
    frameError && frameError.stack);
check("the Nexus falls", World.state.phase === "over" && World.state.outcome === "win",
    World.state.phase + "/" + World.state.outcome);
check("the result title is set", staticNodes.get("result-title").textContent === "THE NEXUS FALLS",
    staticNodes.get("result-title").textContent);
check("the result score is rendered", /^[\d.k]+$/.test(staticNodes.get("result-score").textContent),
    staticNodes.get("result-score").textContent);
check("the HUD is hidden on the result screen", staticNodes.get("hud").hidden === true);

try { click("btn-retry"); tick(30); } catch (e) { frameError = e; }
check("retry starts a fresh run", !frameError && World.state.phase === "running" &&
    staticNodes.get("gameover").hidden === true && staticNodes.get("hud").hidden === false);
check("a fresh run has a fresh player", World.state.player && World.state.player.tier === 1,
    World.state.player && World.state.player.tier);

/* ---------- abandon ---------- */
section("Abandon");
try { click("pause-btn"); tick(2); click("btn-pause-menu"); tick(4); } catch (e) { frameError = e; }
check("abandoning returns to the menu", !frameError && staticNodes.get("menu").hidden === false,
    frameError && frameError.stack);
check("abandoning hides the HUD", staticNodes.get("hud").hidden === true);
check("abandoning closes the pause modal", staticNodes.get("pause").hidden === true);

/* ---------- report ---------- */
console.log("\n" + (checks - failures) + "/" + checks + " checks passed");
if (failures) {
    console.log("FAILED:");
    failed.forEach((l) => console.log("  - " + l));
    process.exitCode = 1;
}
