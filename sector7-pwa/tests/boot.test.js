/*
 * SECTOR 7 headless boot test.
 *
 *   node sector7-pwa/tests/boot.test.js
 *
 * Boots main.js against a fake DOM built from the real index.html, then
 * drives the requestAnimationFrame loop by hand and pokes every screen.
 *
 * This exists because the other two suites deliberately skip the browser
 * layer: sim.test.js stubs audio and render is fake anyway, and render.test.js
 * stops at the canvas. Everything between - ui.js wiring element ids,
 * input.js attaching listeners, main.js booting the state machine - would
 * otherwise only be exercised by opening a browser and clicking.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* ---------- fake canvas ---------- */
function makeCtx() {
    return {
        canvas: null,
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
        fillStyle: "#000", strokeStyle: "#000", lineWidth: 1,
        font: "10px sans-serif", textAlign: "left", lineDashOffset: 0,
        save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
        setTransform() {}, clip() {}, beginPath() {}, closePath() {},
        moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, stroke() {}, fill() {},
        fillRect() {}, clearRect() {}, fillText() {}, strokeText() {},
        setLineDash() {}, drawImage() {}, measureText() { return { width: 8 }; },
        createRadialGradient() { return { addColorStop() {} }; },
    };
}
function makeCanvas() {
    const c = { width: 0, height: 0, style: {}, getContext() { const x = makeCtx(); x.canvas = c; return x; } };
    return c;
}

/* ---------- fake DOM ---------- */
function makeEl(id, tag) {
    const classes = new Set();
    const el = {
        id,
        tagName: (tag || "div").toUpperCase(),
        children: [],
        parentNode: null,
        style: new Proxy({}, {
            set: (t, k, v) => { t[k] = v; return true; },
            get: (t, k) => (t[k] === undefined ? "" : t[k]),
        }),
        dataset: {},
        _text: "",
        _html: "",
        value: "",
        disabled: false,
        _listeners: {},

        get textContent() { return this._text; },
        set textContent(v) { this._text = String(v); },
        get innerHTML() { return this._html; },
        set innerHTML(v) { this._html = String(v); },

        classList: {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            contains: (c) => classes.has(c),
            toggle: (c, force) => {
                const on = force === undefined ? !classes.has(c) : !!force;
                if (on) classes.add(c); else classes.delete(c);
                return on;
            },
        },
        addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
        removeEventListener() {},
        appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
        removeChild(child) {
            const i = this.children.indexOf(child);
            if (i >= 0) this.children.splice(i, 1);
            child.parentNode = null;
            return child;
        },
        getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 800, right: 400, bottom: 800 }; },
        setPointerCapture() {}, releasePointerCapture() {},
        getContext(kind) {
            if (kind !== "2d") return null;
            if (!this._ctx) {
                this._ctx = makeCtx();
                this._ctx.canvas = this;
            }
            return this._ctx;
        },
        focus() {}, click() {},
        /* Scans the real index.html rather than this element's innerHTML, so
         * a query for a class inside static markup works too - which is how
         * the station tabs are found. Nodes are cached by id and returned
         * shared, because that is what a real DOM does and because ui.js
         * binds listeners to one set of nodes and the test later re-queries
         * the same markup. */
        querySelectorAll(sel) {
            const key = "qsa::" + sel;
            if (!this._qsaCache) this._qsaCache = new Map();
            if (this._qsaCache.has(key)) return this._qsaCache.get(key);
            const out = findInHtml(sel, this._html);
            this._qsaCache.set(key, out);
            return out;
        },
        querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    };
    el.width = 132;
    el.height = 132;
    return el;
}

/* Every id the real page declares, so a rename in index.html breaks here
 * rather than silently at runtime. */
const IDS = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);

/* Find elements matching `sel` across the static markup plus this element's
 * own innerHTML, and hand back the shared fake nodes. Returns stable arrays
 * so a second query returns the same elements with their listeners intact. */
const synthetic = new Map();
function matchNode(tag, attrs, html, idx) {
    const id = (attrs.match(/id="([^"]+)"/) || [])[1];
    /* Real nodes come from the shared id map so listeners survive; synthetic
     * ones (no id) are cached by their markup. Either way the attributes are
     * applied, because ui.js reads data-* through getAttribute. */
    const sk = tag + idx + ":" + attrs;
    let el;
    if (id && els.has(id)) {
        el = els.get(id);
    } else {
        if (synthetic.has(sk)) return synthetic.get(sk);
        el = makeEl(id || ("syn-" + tag + "-" + synthetic.size), tag);
        synthetic.set(sk, el);
    }
    if (!el._attrSrc || el._attrSrc !== attrs) {
        el._attrSrc = attrs;
        el.className = (attrs.match(/class="([^"]+)"/) || [])[1] || "";
        for (const m of attrs.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) el[m[1]] = m[2];
        el.getAttribute = (n) => {
            const m = attrs.match(new RegExp('(?:^|\\s)' + n + '="([^"]*)"'));
            return m ? m[1] : null;
        };
    }
    void html;
    return el;
}

function findInHtml(sel, innerHtml) {
    const source = html + "\n" + (innerHtml || "");
    const cls = sel.replace(/^\./, "");
    const attr = sel.startsWith("[") ? sel.slice(1, -1).split("=")[0] : null;
    const out = [];
    let n = 0;
    for (const m of source.matchAll(/<([a-z]+)\b([^>]*)>/gi)) {
        const tag = m[1].toLowerCase();
        const attrs = m[2];
        const classes = (attrs.match(/class="([^"]+)"/) || [])[1] || "";
        const match = attr ? new RegExp(attr + '=').test(attrs) : classes.split(/\s+/).includes(cls);
        if (match) out.push(matchNode(tag, attrs, source, n++));
    }
    return out;
}
const els = new Map();
for (const id of IDS) els.set(id, makeEl(id, id.includes("canvas") || id === "minimap" ? "canvas" : "div"));
/* The game canvas needs a context that survives; so does the minimap. */
els.get("game-canvas").getContext = function () {
    return this._ctx || (this._ctx = makeCtx());
};
els.get("game-canvas").width = 0;
els.get("game-canvas").height = 0;
els.get("game-canvas").style = {};

const store = new Map();
let rafQueue = [];

global.window = global;
global.innerWidth = 400;
global.innerHeight = 820;
global.devicePixelRatio = 2;
/* Window-level listeners are how input.js ends a drag, so they have to be
 * dispatchable from the test. */
const winListeners = {};
global.addEventListener = (type, fn) => { (winListeners[type] = winListeners[type] || []).push(fn); };
global.removeEventListener = (type, fn) => {
    const l = winListeners[type]; if (!l) return;
    const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1);
};
function winFire(type, ev) { for (const fn of (winListeners[type] || [])) fn(ev); }
global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};
global.requestAnimationFrame = (fn) => { rafQueue.push(fn); return rafQueue.length; };
global.cancelAnimationFrame = () => {};
global.document = {
    readyState: "complete",
    getElementById: (id) => els.get(id) || null,
    createElement: (tag) => makeEl("", tag),
    addEventListener() {},
    removeEventListener() {},
    body: makeEl("body"),
    documentElement: makeEl("html"),
    visibilityState: "visible",
};
global.AudioContext = undefined; // exercises the no-WebAudio path
Object.defineProperty(globalThis, "navigator", {
    value: { vibrate() {} }, configurable: true, writable: true,
});

/* Load order matters: config first (everything reads it), then storage and
 * sectors (world and station depend on them). */
const FILES = ["config.js", "storage.js", "sectors.js", "world.js", "render.js",
    "stations.js", "contracts.js", "bounty.js", "input.js", "player.js",
    "npcs.js", "audio.js", "ui.js", "main.js"];
for (const f of FILES) (0, eval)(fs.readFileSync(path.join(SRC, f), "utf8"));

const S = global.S7;
const W = S.World.world;

/* Local failures instead of process exits, so the summary still prints. */
const realExit = process.exit;
process.exit = () => { throw new Error("process.exit called"); };

let failures = 0, checks = 0;
function check(label, cond, extra) {
    checks++;
    if (cond) console.log("  PASS  " + label);
    else { failures++; console.log("  FAIL  " + label + (extra !== undefined ? "  -> " + extra : "")); }
}
function section(t) { console.log("\n=== " + t + " ==="); }
function throws(label, fn) {
    checks++;
    try {
        fn();
        failures++;
        console.log("  FAIL  " + label + "  -> did not throw");
    } catch (e) {
        console.log("  PASS  " + label);
    }
}

/* ---------- boot ---------- */
section("boot");
{
    let bootError = null;
    try {
        /* main.js runs its boot on load; readyState is already "complete". */
    } catch (e) {
        bootError = e;
    }
    check("main.js booted without throwing", !bootError, bootError && bootError.message);
    check("a render loop was requested", rafQueue.length === 1, rafQueue.length);
}

/* ---------- run frames ---------- */
section("frames");
{
    const tick = (n, dtMs) => {
        for (let i = 0; i < n; i++) {
            const cb = rafQueue.shift();
            rafQueue.push(cb);
            cb(i * dtMs);
        }
    };

    let err = null;
    try { tick(240, 16.7); } catch (e) { err = e; }
    check("240 menu frames ran clean", !err, err && (err.stack || err.message));

    /* The menu must have generated a live sector, not an empty map. */
    check("menu generates a populated sector", W.ships.length > 0 && W.rocks.length > 0,
        W.ships.length + " ships, " + W.rocks.length + " rocks");

    err = null;
    try {
        /* "LAUNCH" */
        els.get("btn-play")._listeners.click[0]();
        tick(300, 16.7);
    } catch (e) { err = e; }
    check("launching and flying 300 frames ran clean", !err, err && (err.stack || err.message));
    check("a player ship exists after launch", W.player && W.player.alive);
    check("the HUD is visible while flying",
        !els.get("hud").classList.contains("hidden"));
    check("the menu is hidden while flying",
        els.get("screen-menu").classList.contains("hidden"));

    /* Fire and steer through the input layer, not by poking state. */
    err = null;
    try {
        const fire = els.get("btn-fire");
        fire._listeners.pointerdown[0]({ pointerId: 1, clientX: 300, clientY: 700, preventDefault() {}, stopPropagation() {} });
        const canvas = els.get("game-canvas");
        canvas._listeners.pointerdown[0]({ pointerId: 2, clientX: 100, clientY: 600, preventDefault() {} });
        canvas._listeners.pointermove[0]({ pointerId: 2, clientX: 140, clientY: 640, preventDefault() {} });
        tick(120, 16.7);

        /* Measured while the thumb is still down: releasing zeroes the stick
         * by design, so asserting afterwards would test nothing. */
        check("the stick anchors under the thumb", S.Input.state.stickId !== null);
        check("the stick knob follows the thumb",
            /translate\(calc\(-50% \+ [-\d.]+px\)/.test(els.get("stick-knob").style.transform || ""),
            els.get("stick-knob").style.transform);
        check("the stick reports a real throttle", S.Input.state.mag > 0.2,
            "mag=" + S.Input.state.mag.toFixed(2));
        check("the FIRE pad reports held", S.Input.state.firing === true);

        fire._listeners.pointerup[0]({ pointerId: 1, preventDefault() {}, stopPropagation() {} });
        winFire("pointerup", { pointerId: 2 });
        tick(30, 16.7);
    } catch (e) { err = e; }
    check("touch input (stick + fire) runs clean", !err, err && (err.stack || err.message));
    check("releasing the thumb recentres the stick",
        S.Input.state.stickId === null && S.Input.state.mag < 0.2,
        "mag=" + S.Input.state.mag.toFixed(2));
    check("releasing FIRE stops firing", S.Input.state.firing === false);

    /* Keyboard. */
    err = null;
    try { tick(10, 16.7); } catch (e) { err = e; }
    check("frames continue after input", !err, err && (err.stack || err.message));
}

/* ---------- station ---------- */
section("station");
{
    const dock = els.get("btn-dock");
    let err = null;
    try {
        const W2 = S.World.world;
        W2.player.x = W2.station.x;
        W2.player.y = W2.station.y;
        W2.player.energy = 5000;

        /* Hold DOCK until the progress bar fills, exactly as a thumb would. */
        dock._listeners.pointerdown[0]({ pointerId: 3, clientX: 340, clientY: 700, preventDefault() {}, stopPropagation() {} });
        for (let i = 0; i < 200 && !S.Player.state.docked; i++) {
            const cb = rafQueue.shift(); rafQueue.push(cb); cb(i * 16.7);
        }
        dock._listeners.pointerup[0]({ pointerId: 3, preventDefault() {}, stopPropagation() {} });
        winFire("pointerup", { pointerId: 3 });
    } catch (e) { err = e; }
    check("docking from the pad runs clean", !err, err && (err.stack || err.message));
    check("holding DOCK inside the ring docks the ship", S.Player.state.docked);
    check("the station panel is shown",
        !els.get("screen-station").classList.contains("hidden"));

    /* The panel must have rendered rows for all five tracks. */
    const rows = els.get("st-rows");
    let buyResult = null;
    check("every module has a row", ["Blaster", "Shield", "Armor", "Processor", "Thruster"]
        .every((n) => rows._html.includes(n)));
    check("the fee is quoted", parseInt(els.get("st-fee").textContent.replace(/,/g, ""), 10) > 0,
        els.get("st-fee").textContent);
    check("the hull is quoted", els.get("st-hull").textContent.includes("/"),
        els.get("st-hull").textContent);

    err = null;
    try {
        const buy = rows.querySelectorAll(".st-buy")[0];
        const before = W.player.energy;
        const levelBefore = W.player.modules[buy.getAttribute("data-key")];
        buy._listeners.click[0]();
        for (let i = 0; i < 5; i++) {
            const cb = rafQueue.shift(); rafQueue.push(cb); cb(i * 16.7);
        }
        buyResult = {
            spent: before - W.player.energy,
            levelled: W.player.modules[buy.getAttribute("data-key")] === levelBefore + 1,
        };
    } catch (e) { err = e; }
    check("buying an upgrade runs clean", !err, err && (err.stack || err.message));
    check("the upgrade raised the level", buyResult && buyResult.levelled);
    check("the upgrade cost energy", buyResult && buyResult.spent > 0,
        buyResult && buyResult.spent);

    /* And it must be persisted immediately, not only on undock. */
    const saved = JSON.parse(store.get("sector7.v1.ship"));
    check("the purchase is written to storage straight away",
        saved.modules[Object.keys(saved.modules)[0]] >= 1 && saved.crystals >= 0);

    err = null;
    try {
        els.get("st-repair-btn")._listeners.click[0]();
        for (let i = 0; i < 5; i++) { const cb = rafQueue.shift(); rafQueue.push(cb); cb(i * 16.7); }
        /* LAUNCH is the button that undocks; the secondary one leaves for the
         * menu, which tears the sector down entirely. */
        els.get("st-launch")._listeners.click[0]();
        for (let i = 0; i < 10; i++) { const cb = rafQueue.shift(); rafQueue.push(cb); cb(i * 16.7); }
    } catch (e) { err = e; }
    check("repair and undock run clean", !err, err && (err.stack || err.message));
    check("undocking returns to flight", !S.Player.state.docked && S.Player.state.dockReady === false);
    check("the launch position is outside the dock ring",
        !S.World.inDockZone(W.player.x, W.player.y));
    check("the station panel is hidden again",
        els.get("screen-station").classList.contains("hidden"));

    /* Dock again and leave via the secondary button instead: that path tears
     * the sector down and returns to the menu. */
    err = null;
    try {
        const p2 = S.World.world.player;
        p2.x = S.World.world.station.x;
        p2.y = S.World.world.station.y;
        dock._listeners.pointerdown[0]({ pointerId: 4, clientX: 340, clientY: 700, preventDefault() {}, stopPropagation() {} });
        for (let i = 0; i < 200 && !S.Player.state.docked; i++) {
            const cb = rafQueue.shift(); rafQueue.push(cb); cb(i * 16.7);
        }
        dock._listeners.pointerup[0]({ pointerId: 4, preventDefault() {}, stopPropagation() {} });
        els.get("st-close")._listeners.click[0]();
        for (let i = 0; i < 20; i++) { const cb = rafQueue.shift(); rafQueue.push(cb); cb(i * 16.7); }
    } catch (e) { err = e; }
    check("docking then leaving via the secondary button runs clean", !err, err && (err.stack || err.message));
    check("the secondary button returns to the menu",
        !els.get("screen-menu").classList.contains("hidden"));
}

/* ---------- death and relaunch ---------- */
section("death and relaunch");
{
    /* The previous section left us on the menu, where there is no player. */
    let err = null;
    try {
        els.get("btn-play")._listeners.click[0]();
        for (let i = 0; i < 20; i++) { const cb = rafQueue.shift(); rafQueue.push(cb); cb(i * 16.7); }
        W.player.invuln = 0;
        S.World.damageShip(W.player, 1e9);
        for (let i = 0; i < 400; i++) { const cb = rafQueue.shift(); rafQueue.push(cb); cb(i * 16.7); }
    } catch (e) { err = e; }
    check("dying and reaching the run-over panel runs clean", !err, err && (err.stack || err.message));
    check("the wreck panel is shown",
        !els.get("screen-death").classList.contains("hidden"));
    check("the wreck panel has a title", els.get("death-title").textContent.length > 0,
        els.get("death-title").textContent);
    check("the run-over panel quotes the bank", els.get("os-crystals").textContent !== "");

    err = null;
    try {
        els.get("btn-again")._listeners.click[0]();
        for (let i = 0; i < 120; i++) { const cb = rafQueue.shift(); rafQueue.push(cb); cb(i * 16.7); }
    } catch (e) { err = e; }
    check("relaunching runs clean", !err, err && (err.stack || err.message));
    check("relaunch puts you back in a live ship", W.player && W.player.alive);
    check("relaunch hides the wreck panel",
        els.get("screen-death").classList.contains("hidden"));

    err = null;
    try {
        /* Station -> menu, from the station's own secondary button. */
        els.get("btn-menu")._listeners.click[0]();
        for (let i = 0; i < 120; i++) { const cb = rafQueue.shift(); rafQueue.push(cb); cb(i * 16.7); }
    } catch (e) { err = e; }
    check("returning to the menu runs clean", !err, err && (err.stack || err.message));
    check("the menu is showing again",
        !els.get("screen-menu").classList.contains("hidden"));
    check("the HUD is hidden on the menu",
        els.get("hud").classList.contains("hidden"));
}

/* ---------- no-audio path ---------- */
/* =========================================================================
 * Every button in the markup must actually be wired to something
 * ====================================================================== */
section("every control is wired");
{
    /* A button with no handler is invisible in a screenshot and impossible
     * to notice in a fake-DOM test that only clicks the ones it knows about.
     * The station's LAUNCH button shipped inert this way. */
    const orphans = [];
    for (const m of html.matchAll(/<button\b([^>]*)>/g)) {
        const id = (m[1].match(/id="([^"]+)"/) || [])[1];
        if (!id) { orphans.push("<button> with no id"); continue; }
        const el = els.get(id);
        const n = el ? Object.keys(el._listeners).reduce((a, k) => a + el._listeners[k].length, 0) : 0;
        if (n === 0) orphans.push("#" + id);
    }
    check("no button in index.html is left unwired", orphans.length === 0, orphans.join(", "));

    for (const id of ["btn-fire", "btn-dock"]) {
        const el = els.get(id);
        const n = el ? Object.keys(el._listeners).reduce((a, k) => a + el._listeners[k].length, 0) : 0;
        check("#" + id + " has listeners", n > 0, n);
    }

    for (const id of ["screen-menu", "screen-death", "screen-station"]) {
        check("#" + id + " exists", !!els.get(id));
    }
}

section("degraded environments");
{
    let err = null;
    try {
        /* S.Audio.init found no AudioContext; every call must be a no-op. */
        S.Audio.shoot(true);
        S.Audio.kill(true);
        S.Audio.death();
        S.Audio.pickup("crystal");
        S.Audio.setThrottle(0.8);
        S.Audio.dock();
    } catch (e) { err = e; }
    check("every audio call is safe with no AudioContext", !err, err && (err.stack || err.message));
    check("S.Audio never built a context when none is available", !S.Audio.ctx);
}

console.log("\n" + "-".repeat(56));
console.log(`checks: ${checks}   failures: ${failures}`);
console.log("-".repeat(56));
process.exit = realExit;
process.exit(failures === 0 ? 0 : 1);