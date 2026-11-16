/*
 * DEEP ORBIT — boot, phase machine and wiring.
 *
 * A single requestAnimationFrame drives everything. The simulation runs at a
 * fixed 60 Hz step; rendering happens once per frame. Menu, hangar, pause and
 * destroyed are explicit phases so overlays can never become unreachable.
 */

import {
    SLUG, STEP, SPLASH_RADIUS, droneCost, MAPS, AMMO, SHIPS, PICKUP_IDS
} from "./config.js";
import {
    createState, step, drainEvents, setMove, setFiring, selectTargetAt,
    cycleAmmo, useAbility, refreshStats, refreshDrones, dock,
    repairAtStation, jumpGate, respawn, buyUpgrade, buyShip, selectShip
} from "./sim.js";
import { createRenderer } from "./render.js";
import { createInput } from "./input.js";
import { createUI } from "./ui.js";
import { loadProfile, saveProfile } from "./storage.js";

const R2 = typeof window !== "undefined" ? (window.R2 || null) : null;

function noop() {}

const Sound = R2 && typeof R2.makeSound === "function"
    ? R2.makeSound({
        shoot: [640, 0.035, "square"],
        hit: [900, 0.05, "triangle"],
        kill: [220, 0.14, "sawtooth"],
        hurt: [120, 0.24, "sawtooth"],
        pickup: [1040, 0.08, "sine"],
        box: [1320, 0.18, "sine"],
        ability: [540, 0.16, "triangle"],
        shieldbreak: [300, 0.22, "square"],
        levelup: [880, 0.3, "sine"],
        destroyed: [90, 0.6, "sawtooth"],
        dock: [660, 0.2, "sine"],
        jump: [420, 0.3, "sine"],
        enemyshoot: [180, 0.05, "square"],
        splash: [140, 0.16, "sawtooth"],
        crit: [1240, 0.1, "square"],
        block: [720, 0.07, "sine"],
        effect: [980, 0.22, "triangle"],
        cloak: [300, 0.14, "sine"]
    })
    : new Proxy({}, { get: () => noop });

function buzz(pattern) {
    if (R2 && typeof R2.buzz === "function") R2.buzz(pattern);
}

const canvas = document.getElementById("game-canvas");
const minimap = document.getElementById("minimap");
const renderer = createRenderer(canvas, minimap);
const profile = loadProfile();

let state = createState(profile);
let phase = "menu";
let hangarFrom = "menu";
let lastTs = 0;
let accumulator = 0;
let dirty = false;
let saveTimer = 0;
let deferredPrompt = null;

let soundOn = R2 && typeof R2.getSettings === "function"
    ? R2.getSettings().sound !== false
    : true;

if (R2 && typeof R2.markPlayed === "function") R2.markPlayed(SLUG);

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

function markDirty() { dirty = true; }

function persist() {
    if (!dirty) return;
    saveProfile(profile);
    dirty = false;
}

/* ------------------------------------------------------------------ */
/* Phase transitions                                                   */
/* ------------------------------------------------------------------ */

function startGame() {
    if (state.destroyed) respawn(state, profile);
    phase = "playing";
    accumulator = 0;
    lastTs = 0;
    renderer.resetCamera();
    ui.hideOverlay();
    input.clearKeys();
    persist();
}

function toMenu() {
    recordRun("quit");
    persist();
    phase = "menu";
    state = createState(profile);
    renderer.resetCamera();
    ui.showMenu(profile);
}

function openHangar() {
    if (phase === "playing" && !state.docked) {
        ui.toast("Dock at the station to open the hangar");
        return;
    }
    hangarFrom = phase;
    phase = "hangar";
    ui.showHangar(state, profile);
    persist();
}

function closeHangar() {
    if (phase !== "hangar") return;
    if (hangarFrom === "menu" || !state) {
        phase = "menu";
        ui.showMenu(profile);
        return;
    }
    phase = hangarFrom === "paused" ? "paused" : "playing";
    if (phase === "paused") ui.showPause(profile);
    else ui.hideOverlay();
    lastTs = 0;
}

function togglePause() {
    if (phase === "playing") {
        phase = "paused";
        ui.showPause(profile);
        persist();
    } else if (phase === "paused") {
        phase = "playing";
        lastTs = 0;
        ui.hideOverlay();
    }
}

function recordRun(outcome) {
    if (!R2 || !R2.stats || !state) return;
    R2.stats.run({
        slug: SLUG,
        score: state.score,
        durMs: Math.round(state.timePlayed * 1000),
        wave: state.mapIndex + 1,
        outcome,
        meta: { kills: state.kills, level: profile.level }
    });
}

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */

const ui = createUI({
    onPlay: startGame,
    onHangar: openHangar,
    onCloseHangar: closeHangar,
    onResume: function () { phase = "playing"; lastTs = 0; ui.hideOverlay(); },
    onRestart: toMenu,
    onRespawn: function () {
        respawn(state, profile);
        renderer.resetCamera();
        phase = "playing";
        lastTs = 0;
        ui.hideOverlay();
    },
    onMute: toggleSound,
    onRepair: function () {
        if (repairAtStation(state, profile)) {
            refreshStats(state, profile, false);
            handleEvents(drainEvents(state));
            markDirty();
            ui.refreshHangar(state, profile);
        }
    },
    onSell: function () {
        if (dock(state, profile)) {
            handleEvents(drainEvents(state));
            markDirty();
            ui.refreshHangar(state, profile);
        }
    },
    onJump: doJump,
    onBuyUpgrade: function (id) {
        if (buyUpgrade(profile, id)) {
            refreshStats(state, profile, true);
            markDirty();
            persist();
            ui.refreshHangar(state, profile);
            ui.toast("Upgrade installed");
            buzz(25);
        }
    },
    onBuyShip: function (index) {
        if (buyShip(profile, index)) {
            refreshStats(state, profile, true);
            markDirty();
            persist();
            ui.refreshHangar(state, profile);
            ui.toast("Ship acquired: " + state.player.ship.name);
            buzz([20, 30, 30]);
        }
    },
    onSelectShip: function (index) {
        if (selectShip(profile, index)) {
            refreshStats(state, profile, true);
            markDirty();
            persist();
            ui.refreshHangar(state, profile);
        }
    },
    onBuyDrone: function () {
        const cost = droneCost(profile.drones);
        if (profile.drones >= 4 || profile.credits < cost) return;
        profile.credits -= cost;
        profile.drones += 1;
        refreshDrones(state, profile);
        markDirty();
        persist();
        ui.refreshHangar(state, profile);
        ui.toast("Drone deployed");
        buzz(20);
    }
});

function toggleSound() {
    soundOn = !soundOn;
    if (R2 && typeof R2.setSettings === "function") R2.setSettings({ sound: soundOn });
    ui.toast(soundOn ? "Sound on" : "Sound off");
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

const input = createInput(canvas, renderer, {
    onTarget: function (point) {
        if (phase === "playing") selectTargetAt(state, point.x, point.y, 80);
    },
    onAmmo: function () {
        if (phase === "playing") cycleAmmo(state, 1);
    },
    onAbility: function (id) {
        if (phase === "playing" && useAbility(state, id)) markDirty();
    },
    onPause: togglePause,
    onMute: toggleSound,
    onDock: function () {
        if (phase !== "playing") return;
        if (dock(state, profile)) markDirty();
    },
    onJump: doJump,
    onConfirm: function () {
        if (phase === "menu") startGame();
        else if (phase === "paused") togglePause();
        else if (phase === "destroyed") {
            respawn(state, profile);
            renderer.resetCamera();
            phase = "playing";
            lastTs = 0;
            ui.hideOverlay();
        }
    }
});

function doJump() {
    if (phase !== "playing") return;
    if (jumpGate(state, profile)) {
        renderer.resetCamera();
        markDirty();
        persist();
    }
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

function handleEvents(events) {
    for (const e of events) {
        switch (e.type) {
            case "shoot": if (soundOn) Sound.shoot(); break;
            case "hit":
                if (soundOn) Sound.hit();
                if (e.dmg) renderer.addDamageNumber(e.x, e.y, e.dmg, e.color || "#ffffff", false);
                renderer.addShake(0.7);
                break;
            case "crit":
                if (soundOn) Sound.crit();
                renderer.addDamageNumber(e.x, e.y, e.dmg, "#ffd166", true);
                renderer.addShake(2.5);
                handleCritStats();
                break;
            case "enemyshoot": if (soundOn) Sound.enemyshoot(); break;
            case "kill":
                if (soundOn) Sound.kill();
                renderer.addShockwave(e.x, e.y, e.boss ? "#ffd166" : "#ff8a8a", e.boss ? 260 : 110);
                renderer.addShake(e.boss ? 13 : 3);
                if (e.boss) buzz([30, 50, 30, 50, 60]);
                break;
            case "hurt":
                if (soundOn) Sound.hurt();
                renderer.addShake(5);
                buzz(35);
                break;
            case "shieldbreak":
                if (soundOn) Sound.shieldbreak();
                renderer.addShockwave(e.x, e.y, "#6fd8ff", 130);
                renderer.addShake(4);
                break;
            case "splash":
                if (soundOn) Sound.splash();
                renderer.addShockwave(e.x, e.y, e.color || "#ff9f43", SPLASH_RADIUS);
                renderer.addShake(3);
                break;
            case "bulletblock": if (soundOn) Sound.block(); break;
            case "cloak": if (soundOn && e.cloaked) Sound.cloak(); break;
            case "pickup": if (soundOn) Sound.pickup(); break;
            case "pickup-effect": if (soundOn) Sound.effect(); break;
            case "box": if (soundOn) Sound.box(); buzz([15, 20, 30]); break;
            case "ability": if (soundOn) Sound.ability(); buzz(18); break;
            case "levelup":
                if (soundOn) Sound.levelup();
                ui.toast("LEVEL UP — " + profile.level, "good");
                buzz([25, 40, 25]);
                break;
            case "dock": if (soundOn) Sound.dock(); break;
            case "jump": if (soundOn) Sound.jump(); break;
            case "safeenter": ui.toast("Safe zone — shields recharging", "good"); break;
            case "destroyed":
                if (soundOn) Sound.destroyed();
                renderer.addShockwave(e.x, e.y, "#ff4d6d", 320);
                renderer.addShake(20);
                buzz([60, 80, 120]);
                break;
            case "message": ui.toast(e.text); break;
            default: break;
        }
    }
}

function handleCritStats() {
    if (R2 && R2.stats && typeof R2.stats.event === "function") {
        R2.stats.event(SLUG, "criticals", 1);
    }
}

/* ------------------------------------------------------------------ */
/* Loop                                                                */
/* ------------------------------------------------------------------ */

function frame(ts) {
    const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 1 / 60;
    lastTs = ts;

    if (phase === "playing") {
        accumulator += dt;
        let guard = 0;
        while (accumulator >= STEP && guard < 5) {
            const inputState = {
                move: input.getMove(),
                firing: input.isFiring()
            };
            setMove(state, inputState.move.x, inputState.move.y);
            setFiring(state, inputState.firing);
            step(state, profile, inputState, STEP);
            handleEvents(drainEvents(state));
            markDirty();
            accumulator -= STEP;
            guard += 1;
            if (state.destroyed) {
                phase = "destroyed";
                profile.totalKills += state.kills;
                if (state.score > profile.bestScore) profile.bestScore = state.score;
                recordRun("destroyed");
                markDirty();
                persist();
                ui.showDestroyed(state, profile);
                break;
            }
        }
        if (guard >= 5) accumulator = 0;
    } else if (state && (phase === "menu" || phase === "hangar" || phase === "paused")) {
        state.t += dt * 0.35;
    }

    saveTimer += dt;
    if (saveTimer > 2.5 && dirty) {
        saveTimer = 0;
        persist();
    }

    if (state) {
        renderer.render(state, profile, dt);
        renderer.renderMinimap(state);
        ui.update(state, profile);
    }
    requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ */
/* Browser wiring                                                      */
/* ------------------------------------------------------------------ */

function onResize() {
    renderer.resize();
}
window.addEventListener("resize", onResize);
window.addEventListener("orientationchange", onResize);
if (window.visualViewport) window.visualViewport.addEventListener("resize", onResize);

document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
        if (phase === "playing") {
            phase = "paused";
            ui.showPause(profile);
        }
        persist();
    } else {
        lastTs = 0;
    }
});

window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    if (!profile.installDismissed) ui.showInstall();
});

if (el("install-btn")) {
    el("install-btn").addEventListener("click", async function () {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            try { await deferredPrompt.userChoice; } catch (e) {}
            deferredPrompt = null;
        }
        profile.installDismissed = true;
        markDirty();
        persist();
        ui.hideInstall();
    });
}
if (el("install-later")) {
    el("install-later").addEventListener("click", function () {
        profile.installDismissed = true;
        markDirty();
        persist();
        ui.hideInstall();
    });
}

function el(id) { return document.getElementById(id); }

if (el("btn-pause")) {
    el("btn-pause").addEventListener("click", togglePause);
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker.register("service-worker.js").catch(function () {});
    });
}

renderer.resize();
ui.showMenu(profile);
requestAnimationFrame(frame);

/* Debug hooks for smoke tests. */
window.__DEEP_ORBIT__ = {
    getState: () => state,
    getProfile: () => profile,
    getPhase: () => phase,
    getConfig: () => ({ maps: MAPS.length, ammo: AMMO.length, ships: SHIPS.length, pickups: PICKUP_IDS.length }),
    start: startGame,
    render: () => renderer.render(state, profile, 1 / 60)
};
