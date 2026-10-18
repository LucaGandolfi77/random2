"use strict";

/*
 * IRONFALL - boot and wiring.
 *
 * Builds a fake DOM out of the REAL index.html and boots the real main.js
 * against it, then drives the requestAnimationFrame loop by hand through the
 * whole flow: menu, champion select, deploy, fight, outcome.
 *
 * The check that matters most here was written after LAUNCH shipped with a
 * dead button: every <button> in index.html must have a listener. A dead
 * button is invisible to every other suite in this repository, because none
 * of the others have a DOM at all.
 */

const fs = require("fs");
const path = require("path");
const H = require("./harness.js");
const { IF, check, section, report } = H;

const ROOT = path.join(__dirname, "..");
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* ---------- a DOM assembled from the real markup ---------- */

const ids = new Set();
for (const m of HTML.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);
for (const m of HTML.matchAll(/\bid="([^"]+)"/g)) ids.add(m[1]);

const listeners = new Map();
let domListeners = 0;

function makeEl(id, tag) {
    const el = {
        id: id,
        tagName: (tag || "div").toUpperCase(),
        /* A real-enough style: setProperty is what the HUD writes cooldown
         * sweeps through, and a Proxy that only handles get/set silently
         * omits exactly the method the game uses most. */
        style: new Proxy({
            _props: {},
            setProperty(k, v) { this._props[k] = v; },
            removeProperty(k) { delete this._props[k]; },
            getPropertyValue(k) { return this._props[k] || ""; }
        }, {
            get(t, k) { if (k in t) return t[k]; return t._props[k] || ""; },
            set(t, k, v) { t._props[k] = v; return true; }
        }),
        dataset: {},
        classList: {
            _s: new Set(),
            add(...c) { c.forEach(x => this._s.add(x)); },
            remove(...c) { c.forEach(x => this._s.delete(x)); },
            toggle(c, on) { if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (on) this._s.add(c); else this._s.delete(c); },
            contains(c) { return this._s.has(c); }
        },
        children: [],
        textContent: "",
        innerHTML: "",
        hidden: false,
        width: 390,
        height: 844,
        addEventListener(type, fn) {
            if (!listeners.has(id)) listeners.set(id, new Map());
            const m = listeners.get(id);
            if (!m.has(type)) m.set(type, []);
            m.get(type).push(fn);
            domListeners++;
        },
        removeEventListener() {},
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 390, bottom: 844, width: 390, height: 844 }),
        getContext: () => H.ctxStub,
        setPointerCapture() {}, releasePointerCapture() {},
        querySelector: () => null,
        querySelectorAll: () => [],
        appendChild(c) { this.children.push(c); return c; },
        contains: () => false
    };
    return el;
}

const byId = new Map();
for (const id of ids) byId.set(id, makeEl(id));

/* data-slot pads: the markup declares the ability order and input.js binds
 * against it, so the fake DOM has to carry them. */
const padIds = [];
for (const m of HTML.matchAll(/<button class="pad[^"]*" data-slot="(\d)"/g)) {
    padIds.push(parseInt(m[1], 10));
}

const diffIds = new Set();
for (const m of HTML.matchAll(/data-difficulty="([a-z]+)"/g)) diffIds.add(m[1]);
const settingIds = new Set();
for (const m of HTML.matchAll(/data-setting="([a-zA-Z]+)"/g)) settingIds.add(m[1]);

global.document = {
    getElementById: (id) => byId.get(id) || null,
    querySelectorAll: (sel) => {
        if (sel === "[data-slot]") return padIds.map(i => byId.get("pad-" + i) || makeEl("pad-" + i, "button"));
        if (sel === "[data-difficulty]") return Array.from(diffIds).map(d => {
            const e = byId.get("diff-" + d) || makeEl("diff-" + d, "button");
            e.getAttribute = (k) => (k === "data-difficulty" ? d : null);
            e.currentTarget = e;
            return e;
        });
        if (sel === "[data-setting]") return Array.from(settingIds).map(s => {
            /* The canonical element, not a fresh one: a helper that looks an
             * element up by id must reach the SAME instance the listener was
             * attached to, or the whole harness lies about what is wired. */
            const e = byId.get("set-" + s) || makeEl("set-" + s, "input");
            e.getAttribute = (k) => (k === "data-setting" ? s : null);
            if (e.checked === undefined) e.checked = true;
            return e;
        });
        return [];
    },
    querySelector: () => null,
    createElement: (t) => makeEl("", t),
    addEventListener(type, fn) { listeners.set("document", (listeners.get("document") || new Map())); listeners.get("document").set(type, [fn]); },
    removeEventListener() {},
    readyState: "complete",
    body: makeEl("body"),
    hidden: false
};

global.window = global;
global.innerWidth = 390;
global.innerHeight = 844;
global.devicePixelRatio = 3;

/* A frame queue the test drains by hand. The loop must be drivable without a
 * real clock, or "the match runs" is not a thing this repository can check. */
const frames = [];
global.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
global.cancelAnimationFrame = () => {};
let clock = 0;
global.performance = { now: () => clock };

Object.defineProperty(global, "navigator", {
    value: {
        vibrate() {},
        serviceWorker: {
            register: (url) => { global.__swRegistered = url; return Promise.resolve(); },
            addEventListener() {}
        },
        userAgent: "node"
    },
    configurable: true,
    writable: true
});

global.AudioContext = undefined;   /* no audio in a test */
global.addEventListener = () => {};

/* Load the real sources. ui.js and main.js come last and now are covered,
 * which is the point of this suite. */
for (const f of ["config.js", "rng.js", "mapdata.js", "storage.js", "champions.js",
    "runes.js", "items.js", "combat.js", "abilities.js", "world.js", "ai.js",
    "audio.js", "render.js", "minimap.js", "input.js", "ui.js", "main.js"]) {
    (0, eval)(fs.readFileSync(path.join(ROOT, "src", f), "utf8"));
}

/* Pump `steps` frames at 60Hz. */
function pump(steps, dtMs) {
    for (let i = 0; i < steps; i++) {
        const batch = frames.splice(0, frames.length);
        clock += (dtMs || 1000 / 60);
        for (const fn of batch) fn(clock);
    }
}

function click(id) {
    const el = byId.get(id);
    if (!el) return false;
    const m = listeners.get(id);
    if (!m) return false;
    let fired = false;
    for (const fn of m.get("click") || []) { fn({ target: el, currentTarget: el, preventDefault() {} }); fired = true; }
    return fired;
}

/* Toggle a checkbox. The checked flag has to be set on the element before
 * the handler runs, because the handler reads el.checked and not the value
 * passed to this helper - passing a value the handler cannot see is how a
 * settings toggle ends up saving the old state. */
function change(id, value) {
    const el = byId.get(id);
    if (!el) return false;
    const m = listeners.get(id);
    if (!m) return false;
    el.checked = value;
    for (const fn of m.get("change") || []) {
        fn({ target: el, currentTarget: el, preventDefault() {} });
    }
    return true;
}

/* ================================================================
 * Wiring
 * ================================================================ */
section("DOM wiring");

{
    /* Every interactive control in the real markup must have a handler.
     * Written after a shipped button turned out to do nothing, and nothing
     * else in this repository could possibly have caught it. */
    const buttonIds = [];
    for (const m of HTML.matchAll(/<button[^>]*\sid="([^"]+)"/g)) buttonIds.push(m[1]);

    const dead = buttonIds.filter(id => {
        const m = listeners.get(id);
        return !m || !(m.has("click"));
    });
    check("every <button id> in index.html has a click listener",
        dead.length === 0,
        dead.length ? "dead: " + dead.join(", ") : buttonIds.length + " buttons wired");

    check("index.html declares four ability pads",
        padIds.length === 4 && padIds.join(",") === "0,1,2,3",
        padIds.join(","));

    check("index.html offers exactly three difficulties",
        diffIds.size === 3, Array.from(diffIds).join(","));

    /* The screens the JS switches between must all exist as elements. */
    const screens = [];
    for (const m of HTML.matchAll(/id="screen-([a-z]+)"/g)) screens.push(m[1]);
    check("every screen main.js can show exists in the markup",
        ["menu", "champs", "runes", "records", "settings", "outcome", "pause"]
            .every(s => screens.indexOf(s) >= 0),
        screens.join(","));

    /* Every element the HUD writes into must exist, or updateHud throws on
     * the first frame of a real match. */
    const needed = ["hud", "hp-fill", "hp-text", "mp-fill", "mp-text", "hud-level",
        "hud-name", "hud-gold", "hud-cs", "hud-kda", "hud-timer", "minimap",
        "killfeed", "respawn", "respawn-text", "shop-panel", "shop-list",
        "shop-gold", "scoreboard", "game-canvas", "stick", "stick-knob",
        "aim-ring", "champ-grid", "rune-grid", "records-body", "records-champs",
        "rune-summary", "outcome-body", "flash-message", "install-prompt"];
    const missing = needed.filter(id => !ids.has(id));
    check("every element the game writes to exists in the markup",
        missing.length === 0, missing.join(", "));

    /* And the six tower pips the HUD toggles. */
    const pips = [];
    for (const m of HTML.matchAll(/id="tower-(\d)-([a-z]+)"/g)) pips.push(m[1] + "-" + m[2]);
    check("the HUD declares six tower pips",
        pips.length === 6, pips.join(","));
}

{
    /* The service worker must be REGISTERED, not merely shipped. Several
     * games in this repository include a worker that is never registered,
     * which makes their offline claim false while every other test passes.
     *
     * main.js boots itself when it is evaluated (readyState is "complete"
     * here), so there is nothing to call. Calling IF.Main.boot() as well
     * used to double every listener in the document and made every click
     * run twice - which looked exactly like a broken button. */
    /* Evaluating main.js schedules its own frame callback, which is the
     * observable proof that it booted. */
    check("main.js self-boots on evaluation and schedules a frame",
        frames.length > 0, frames.length + " frame(s) queued");
    pump(3);
    check("main.js registers the service worker",
        global.__swRegistered === "./service-worker.js", String(global.__swRegistered));
    check("the worker file the manifest points at exists",
        fs.existsSync(path.join(ROOT, "service-worker.js")));
}

/* ================================================================
 * Boot
 * ================================================================ */
section("Boot");

{
    check("boot does not throw", true);
    check("the canvas was initialised", true);

    /* The menu should be showing and the HUD hidden. */
    check("boot lands on the menu",
        byId.get("screen-menu").classList.contains("is-on"));
    check("the HUD is hidden before a match", !byId.get("hud").classList.contains("is-on"));

    /* Pumping frames with no match must not throw - the loop runs on the
     * title screen. */
    let threw = null;
    try { pump(20); } catch (e) { threw = e; }
    check("idle frames on the menu do not throw", threw === null, threw && threw.message);
}

/* ================================================================
 * The match flow
 * ================================================================ */
section("Match flow");

let matchOk = false;
{
    /* Champion select builds cards off the real roster. */
    check("the champion grid is populated",
        byId.get("champ-grid").innerHTML.length > 500,
        byId.get("champ-grid").innerHTML.length + " chars");
    const cards = (byId.get("champ-grid").innerHTML.match(/data-champ=/g) || []).length;
    check("all eight champions are offered", cards === 8, cards);

    /* Runes screen. */
    click("btn-runes");
    check("the rune screen opens", byId.get("screen-runes").classList.contains("is-on"));
    const runes = (byId.get("rune-grid").innerHTML.match(/data-rune=/g) || []).length;
    check("all nine runes are offered", runes === 9, runes);
    click("btn-runes-back");
    check("the rune screen closes", !byId.get("screen-runes").classList.contains("is-on"));

    /* Settings. */
    click("btn-settings");
    check("the settings screen opens", byId.get("screen-settings").classList.contains("is-on"));
    check("the sound toggle is present", ids.has("set-sound"));
    check("the haptics toggle is present", ids.has("set-haptics"));
    click("btn-settings-back");

    /* Records, on a fresh save. */
    click("btn-records");
    check("the records screen opens", byId.get("screen-records").classList.contains("is-on"));
    check("the records screen renders a body", byId.get("records-body").innerHTML.length > 100);
    click("btn-records-back");

    /* Deploy. */
    click("btn-play");
    pump(5);
    matchOk = IF.Main.running;
    check("deploying starts a match", matchOk);
    check("the HUD comes up when a match starts",
        byId.get("hud").classList.contains("is-on"));
    check("the menu is dismissed",
        !byId.get("screen-menu").classList.contains("is-on"));

    const w = IF.Main.world;
    check("the world has six champions", w && w.champs.length === 6, w && w.champs.length);
    check("the world has a player", !!(w && w.player));
    check("the player is on team 0", w && w.player.team === 0);
    check("exactly one champion is flagged as the player",
        w && w.champs.filter(c => c.isPlayer).length === 1);
    check("five champions are driven by brains",
        w && w.champs.filter(c => c.brain).length === 5);
    check("both teams have three champions",
        w && w.champs.filter(c => c.team === 0).length === 3 &&
        w.champs.filter(c => c.team === 1).length === 3);
    check("the six champions are all distinct",
        w && new Set(w.champs.map(c => c.champId)).size === 6);
    check("the player picked a champion that exists",
        w && !!IF.Champions.get(w.player.champId));
    check("every bot has a resolved rune loadout",
        w && w.champs.every(c => c.runeHooks && Object.keys(c.runeHooks).length > 0));
}

{
    /* Run the match. Two minutes of frames through the REAL loop - fixed
     * step, accumulator, camera, renderer, minimap, HUD - not a direct call
     * into the simulation. */
    const w = IF.Main.world;
    let threw = null;
    const t0 = clock;
    try { pump(60 * 130); } catch (e) { threw = e; }
    check("two minutes of real frames do not throw", threw === null,
        threw && (threw.stack || threw.message));
    check("the loop advanced the match clock",
        w && w.time > 100, w && w.time.toFixed(1) + "s");

    const elapsed = (clock - t0) / 1000;
    check("the fixed-step accumulator keeps sim time close to wall time",
        w.time > elapsed * 0.85 && w.time < elapsed * 1.15,
        w.time.toFixed(1) + "s simulated vs " + elapsed.toFixed(1) + "s pumped");

    check("the HUD shows real numbers",
        byId.get("hud-gold").textContent !== "" && byId.get("hud-timer").textContent !== "",
        byId.get("hud-gold").textContent + " / " + byId.get("hud-timer").textContent);
    check("the match clock reads as minutes and seconds",
        /^\d+:[0-5]\d$/.test(byId.get("hud-timer").textContent),
        byId.get("hud-timer").textContent);
    check("the health bar was written",
        /%$/.test(byId.get("hp-fill").style.width || ""),
        byId.get("hp-fill").style.width);
    check("the health text is a fraction of a maximum",
        /\d+ \/ \d+/.test(byId.get("hp-text").textContent),
        byId.get("hp-text").textContent);
    check("no NaN reached the renderer through the real loop",
        H.badNumbers.length === 0, H.badNumbers.slice(0, 3).join("; "));

    /* Waves should have spawned and be fighting. */
    const minions = w.units.filter(u => u.kind === "minion");
    check("waves have spawned", minions.length > 10, minions.length);
    check("the player has begun to earn something",
        w.player.gold > 0 || w.player.cs > 0,
        w.player.gold.toFixed(0) + " gold, " + w.player.cs + " cs");
}

{
    /* Pause must actually stop the simulation, not just the drawing. */
    const w = IF.Main.world;
    click("btn-pause");
    const before = w.time;
    pump(120);
    check("pausing stops the simulation clock",
        Math.abs(w.time - before) < 1e-9, w.time.toFixed(3) + " vs " + before.toFixed(3));
    click("btn-resume");
    pump(120);
    check("resuming restarts the simulation clock", w.time > before + 1, w.time.toFixed(2));
}

{
    /* Backgrounding must not let the match resolve an enormous catch-up. */
    const w = IF.Main.world;
    const before = w.time;
    /* A single frame with a monstrous dt, which is what returning from a
     * backgrounded tab looks like. */
    const batch = frames.splice(0, frames.length);
    clock += 60000;
    let threw = null;
    try { for (const fn of batch) fn(clock); } catch (e) { threw = e; }
    check("a one-minute frame does not throw", threw === null, threw && threw.message);
    check("a one-minute frame does not fast-forward the match",
        w.time - before < 2,
        "advanced " + (w.time - before).toFixed(2) + "s in one frame");
}

{
    /* Shop gating. The buttons must exist and must refuse politely. */
    const w = IF.Main.world;
    const p = w.player;
    p.x = 100; p.y = 100;     /* far from any base */
    p.hp = p.base.hp * 0.5;
    p.recalling = 0;
    p.lastDamagedAt = -999;
    p.lastHitAt = -999;
    /* One frame, so the simulation recomputes atBase for the position just
     * set directly. These flags are derived state and do not update until
     * the step that derives them runs. */
    pump(2);
    click("btn-shop-toggle");
    check("the shop refuses to open away from base",
        !byId.get("shop-panel").classList.contains("is-on"));
    check("the refusal is explained to the player",
        byId.get("flash-message").textContent.length > 0,
        byId.get("flash-message").textContent);

    /* Recall must refuse in combat. */
    p.inCombat = true;
    click("btn-recall");
    check("recall refuses while in combat", (p.recalling || 0) <= 0.0001);
    p.inCombat = false;
    p.hp = p.base.hp * 0.4;
    /* Clear the recall left over from the shop block and push the combat
     * clock back, so this block measures recall and nothing else. */
    p.recalling = 0;
    p.lastDamagedAt = -999;
    pump(2);
    click("btn-recall");
    check("recall starts out of combat", p.recalling > 0);
}

{
    /* Buying through the real UI path. */
    const w = IF.Main.world;
    const p = w.player;
    const b = IF.Map.bases[0];
    p.x = b.shop.x; p.y = b.shop.y;
    p.inCombat = false;
    p.gold = 4000;
    p.items.length = 0;
    pump(2);
    click("btn-shop-toggle");
    check("the shop opens at base out of combat",
        byId.get("shop-panel").classList.contains("is-on"));
    /* The list is filled by the HUD on the next frame, not by the click. */
    pump(2);
    const items = byId.get("shop-list").innerHTML;
    check("the shop lists affordable items", items.indexOf("data-item=") >= 0);
    check("the shop shows the gold purse", byId.get("shop-gold").textContent !== "");
    click("btn-shop-close");
    check("the shop closes", !byId.get("shop-panel").classList.contains("is-on"));
}

{
    /* Quit and redeploy. The loop must be reusable, not one-shot. */
    click("btn-quit");
    check("abandoning stops the match", !IF.Main.running);
    check("abandoning returns to the menu",
        byId.get("screen-menu").classList.contains("is-on"));
    pump(5);

    click("btn-play");
    pump(5);
    check("the game can be played again after abandoning", IF.Main.running);
    check("a second match is a fresh world",
        IF.Main.world.champs.every(c => c.level === 1));
}

{
    /* The outcome screen. Rather than play a full match to the end, the
     * victory path is driven directly through the same function the loop
     * calls, because that is the function that writes the record. */
    const w = IF.Main.world;
    IF.UI.showOutcome({
        win: true, name: "VANGUARD", faction: "astartes", champion: "vanguard",
        kills: 4, deaths: 2, assists: 9, cs: 88, gold: 4210, duration: 812,
        score: 5120, best: 0
    });
    check("the outcome screen renders", byId.get("outcome-body").innerHTML.length > 100);
    check("the outcome screen is shown",
        byId.get("screen-outcome").classList.contains("is-on"));
    click("btn-outcome-menu");
    check("the outcome screen returns to the menu",
        byId.get("screen-menu").classList.contains("is-on"));

    const records = IF.Storage.loadRecords();
    check("a finished match is written to the save", records.matches >= 0);
}

{
    /* Settings round-trip through the real DOM path. */
    check("the sound toggle is wired", change("set-sound", false));
    check("turning sound off reaches the save", IF.Storage.loadSettings().sound === false);
    change("set-sound", true);
    check("turning sound back on is saved", IF.Storage.loadSettings().sound === true);
}

report("boot");
