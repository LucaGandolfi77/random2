/*
 * DEEP ORBIT — boot, phase machine and wiring.
 *
 * A single requestAnimationFrame drives everything. The simulation runs at a
 * fixed 60 Hz step; rendering happens once per frame. Menu, hangar, pause and
 * destroyed are explicit phases so overlays can never become unreachable.
 */

import {
    SLUG, STEP, SPLASH_RADIUS, droneCost, MAPS, AMMO, SHIPS, PICKUP_IDS, QUALITY
} from "./config.js";
import {
    createState, step, drainEvents, setMove, setFiring, selectTargetAt,
    cycleAmmo, useAbility, refreshStats, refreshDrones, dock,
    repairAtStation, jumpGate, respawn, buyUpgrade, buyShip, selectShip,
    buySkill
} from "./sim.js";
import { hasRun, saveRun, loadRun, clearRun, restoreState } from "./run-save.js";
import { startDispatch, claimDispatch } from "./dispatch.js";
import { ensureDaily, contractProgress, streakBonus } from "./daily.js";
import { checkAchievements } from "./achievements.js";
import { createRenderer } from "./render.js";
import { createInput } from "./input.js";
import { createUI } from "./ui.js";
import { createQualityController } from "./quality.js";
import { createAudio } from "./audio.js";
import { loadProfile, saveProfile, loadSettings, saveSettings } from "./storage.js";

const R2 = typeof window !== "undefined" ? (window.R2 || null) : null;
const DEBUG = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debug");

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

function fmtNum(n) {
    return Math.floor(n || 0).toLocaleString("en-US");
}

function checkAwards() {
    const unlocked = checkAchievements(profile, state);
    for (const a of unlocked) {
        ui.toast("Achievement: " + a.name + " (+" + fmtNum(a.reward) + " CR)", "good");
        if (soundOn) Sound.levelup();
    }
    if (unlocked.length) markDirty();
}

const canvas = document.getElementById("game-canvas");
const minimap = document.getElementById("minimap");
const renderer = createRenderer(canvas, minimap);
const profile = loadProfile();

let state = createState(profile);
let phase = "menu";
let hangarFrom = "menu";
let settingsFrom = "menu";
let lastTs = 0;
let accumulator = 0;
let dirty = false;
let saveTimer = 0;
let deferredPrompt = null;
let fpsSmoothed = 60;
let debugTimer = 0;
let runSaveTimer = 0;
let infoFrom = "menu";
let coachStep = 0;
let currentTier = "high";

const settings = loadSettings();
const globalSettings = R2 && typeof R2.getSettings === "function" ? R2.getSettings() : {};
let soundOn = globalSettings.sound !== false;
let musicOn = globalSettings.music !== false;
let hapticsOn = globalSettings.haptics !== false;

const qualityCtl = createQualityController(settings);
const audio = createAudio(
    () => combatIntensity(),
    () => musicOn
);

function combatIntensity() {
    if (!state || state.destroyed) return 0;
    const p = state.player;
    let near = 0;
    for (const e of state.enemies) {
        if (Math.hypot(e.x - p.x, e.y - p.y) < 640) near += 1;
    }
    const threat = Math.min(1, near / 7);
    const boss = state.enemies.some((e) => e.def.boss) ? 0.25 : 0;
    const hurt = 1 - p.hp / p.hpMax;
    return Math.min(1, threat + boss + hurt * 0.35);
}

if (R2 && typeof R2.markPlayed === "function") R2.markPlayed(SLUG);

ensureDaily(profile);
const bootDispatch = claimDispatch(profile);
if (bootDispatch) dirty = true;

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

function markDirty() { dirty = true; }

function persist() {
    if (!dirty) return;
    saveProfile(profile);
    dirty = false;
}

function allSettings() {
    return {
        effects: settings.effects,
        fps: settings.fps,
        sensitivity: settings.sensitivity,
        palette: settings.palette,
        hud: settings.hud,
        showFps: settings.showFps,
        sound: soundOn,
        music: musicOn,
        haptics: hapticsOn
    };
}

function applySettings() {
    saveSettings(settings);
    if (R2 && typeof R2.setSettings === "function") {
        R2.setSettings({ sound: soundOn, music: musicOn, haptics: hapticsOn });
    }
    input.setSensitivity(settings.sensitivity);
    renderer.setColorblind(settings.palette === "colorblind");
    document.body.classList.toggle("cb", settings.palette === "colorblind");
    document.body.classList.toggle("large-hud", settings.hud === "large");
    audio.setEnabled(musicOn);

    const forced = qualityCtl.setSettings(settings);
    applyTier(forced);
    if (!settings.showFps) ui.setDebug("");
}

function applyTier(tier) {
    const changed = tier !== currentTier;
    currentTier = tier;
    if (changed) renderer.setQuality(tier);
    if (state) {
        const fx = (QUALITY[tier] || QUALITY.high).fx;
        state.fx = Object.assign({}, fx);
    }
}

function currentSettings() {
    return allSettings();
}

/* ------------------------------------------------------------------ */
/* Phase transitions                                                   */
/* ------------------------------------------------------------------ */

function startGame() {
    clearRun();
    state = createState(profile);
    applyTier(currentTier);
    phase = "playing";
    accumulator = 0;
    lastTs = 0;
    renderer.resetCamera();
    ui.hideOverlay();
    input.clearKeys();
    persist();
    audio.unlock();
    if (!profile.tutorialDone) beginCoach();
}

function continueRun() {
    const saved = loadRun();
    if (!saved) {
        startGame();
        return;
    }
    state = restoreState(saved, profile);
    applyTier(currentTier);
    renderer.resetCamera();
    phase = state.destroyed ? "destroyed" : "playing";
    lastTs = 0;
    accumulator = 0;
    profile.tutorialDone = true;
    ui.hideOverlay();
    input.clearKeys();
    audio.unlock();
    markDirty();
    persist();
    if (phase === "destroyed") ui.showDestroyed(state, profile);
}

function toMenu() {
    if (state && !state.destroyed && phase !== "menu") saveRun(state);
    recordRun("quit");
    persist();
    phase = "menu";
    state = createState(profile);
    renderer.resetCamera();
    ui.showMenu(profile, hasRun());
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
        ui.showMenu(profile, hasRun());
        return;
    }
    phase = hangarFrom === "paused" ? "paused" : "playing";
    if (phase === "paused") ui.showPause(profile);
    else ui.hideOverlay();
    lastTs = 0;
}

function openSettings() {
    settingsFrom = phase;
    phase = "settings";
    ui.showSettings(currentSettings());
}

function closeSettings() {
    if (phase !== "settings") return;
    if (settingsFrom === "menu") {
        phase = "menu";
        ui.showMenu(profile, hasRun());
    } else if (settingsFrom === "paused") {
        phase = "paused";
        ui.showPause(profile);
    } else {
        phase = settingsFrom || "playing";
        ui.hideOverlay();
    }
    lastTs = 0;
}

function openInfo(kind) {
    infoFrom = phase;
    phase = "info";
    if (kind === "contracts") ui.showContracts(profile);
    else ui.showAchievements(profile);
}

function closeInfo() {
    if (phase !== "info") return;
    phase = infoFrom === "menu" || !infoFrom ? "menu" : infoFrom;
    if (phase === "menu") ui.showMenu(profile, hasRun());
    else if (phase === "paused") ui.showPause(profile);
    else if (phase === "hangar") ui.showHangar(state, profile);
    else ui.hideOverlay();
    lastTs = 0;
}

function replayTutorial() {
    profile.tutorialDone = false;
    markDirty();
    persist();
    closeSettings();
    beginCoach();
}

const COACH_STEPS = [
    { target: "#joystick", text: "Drag the joystick to fly. You can also drag on the left side of the screen." },
    { target: "#fire-btn", text: "Hold FIRE to shoot. Tap an alien to lock onto it. Weapons unlock outside the station." },
    { target: "#btn-dock", text: "Bring ore back to the station and press DOCK / SELL for credits and XP." }
];

function beginCoach() {
    coachStep = 0;
    phase = "coach";
    ui.hideOverlay();
    ui.showCoach(Object.assign({ index: 0 }, COACH_STEPS[0]), COACH_STEPS.length);
}

function nextCoach() {
    coachStep += 1;
    if (coachStep >= COACH_STEPS.length) {
        endCoach();
        return;
    }
    ui.showCoach(Object.assign({ index: coachStep }, COACH_STEPS[coachStep]), COACH_STEPS.length);
}

function endCoach() {
    ui.hideCoach();
    profile.tutorialDone = true;
    markDirty();
    phase = "playing";
    lastTs = 0;
    persist();
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
    onContinue: continueRun,
    onContracts: function () { openInfo("contracts"); },
    onAchievements: function () { openInfo("achievements"); },
    onCloseInfo: closeInfo,
    onDispatch: function (tier) {
        if (startDispatch(profile, tier)) {
            markDirty();
            persist();
            ui.refreshHangar(state, profile);
            ui.toast("Retriever launched — check back later", "good");
        }
    },
    onClaimDispatch: function () {
        const reward = claimDispatch(profile);
        if (reward) {
            markDirty();
            persist();
            ui.refreshHangar(state, profile);
            ui.toast("Dispatch: +" + fmtNum(reward.credits) + " credits" + (reward.urium ? ", +" + reward.urium + " urium" : ""), "good");
            checkAwards();
        }
    },
    onBuySkill: function (id) {
        if (buySkill(profile, id)) {
            refreshStats(state, profile, true);
            markDirty();
            persist();
            ui.refreshHangar(state, profile);
            ui.toast("Pilot skill improved");
            checkAwards();
        }
    },
    onHangar: openHangar,
    onCloseHangar: closeHangar,
    onSettings: openSettings,
    onCloseSettings: closeSettings,
    onReplayTutorial: replayTutorial,
    onCoachNext: nextCoach,
    onCoachSkip: endCoach,
    onSetting: changeSetting,
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

function changeSetting(key, value) {
    if (key === "effects") settings.effects = value;
    else if (key === "fps") settings.fps = Number(value) === 30 ? 30 : 60;
    else if (key === "sensitivity") settings.sensitivity = Number(value) || 1;
    else if (key === "palette") settings.palette = value === "colorblind" ? "colorblind" : "normal";
    else if (key === "hud") settings.hud = value === "large" ? "large" : "normal";
    else if (key === "showFps") settings.showFps = value === "on";
    else if (key === "sound") soundOn = value === "on";
    else if (key === "music") musicOn = value === "on";
    else if (key === "haptics") hapticsOn = value === "on";
    applySettings();
    ui.showSettings(currentSettings());
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
    const completed = [];
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

        if (e.type === "kill") {
            completed.push(...contractProgress(profile, "kills", 1));
            if (e.boss) completed.push(...contractProgress(profile, "boss", 1));
        }
        if (e.type === "dock" && e.units) completed.push(...contractProgress(profile, "sell", e.units));
        if (e.type === "box") completed.push(...contractProgress(profile, "box", 1));
        if (e.type === "crit") completed.push(...contractProgress(profile, "critical", 1));
    }

    for (const item of completed) {
        ui.toast("CONTRACT: " + item.contract.text + " (+" + fmtNum(item.contract.reward) + " CR)", "good");
        if (soundOn) Sound.levelup();
        if (item.first) {
            const bonus = streakBonus(item.streak);
            if (bonus.urium || bonus.credits) {
                profile.urium += bonus.urium;
                profile.credits += bonus.credits;
                ui.toast(item.streak + "-day streak! +" + bonus.urium + " urium", "good");
            }
        }
        markDirty();
    }
    if (completed.length || events.length) checkAwards();
}

function handleCritStats() {
    if (R2 && R2.stats && typeof R2.stats.event === "function") {
        R2.stats.event(SLUG, "criticals", 1);
    }
}

/* ------------------------------------------------------------------ */
/* Loop                                                                */
/* ------------------------------------------------------------------ */

let lastDrawTs = 0;

function frame(ts) {
    const rawDt = lastTs ? (ts - lastTs) / 1000 : 1 / 60;
    lastTs = ts;

    // Power-save: keep the 60 Hz simulation but draw at 30 fps.
    if (settings.fps === 30 && lastDrawTs && ts - lastDrawTs < 32) {
        requestAnimationFrame(frame);
        return;
    }
    lastDrawTs = ts;
    const dt = Math.min(0.05, rawDt);

    if (rawDt > 0.001) {
        const instant = Math.min(120, 1 / rawDt);
        fpsSmoothed += (instant - fpsSmoothed) * 0.08;
        const tier = qualityCtl.sample(fpsSmoothed, dt);
        if (tier !== currentTier) applyTier(tier);
    }
    audio.update(dt);

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
                clearRun();
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

    runSaveTimer += dt;
    if (runSaveTimer > 5 && (phase === "playing" || phase === "paused")) {
        runSaveTimer = 0;
        saveRun(state);
    }

    if (state) {
        renderer.render(state, profile, dt);
        renderer.renderMinimap(state);
        ui.update(state, profile);
    }

    debugTimer += dt;
    if (debugTimer > 0.25) {
        debugTimer = 0;
        if (settings.showFps || DEBUG) {
            ui.setDebug(
                "FPS  " + fpsSmoothed.toFixed(0) +
                "\nTIER " + currentTier + (qualityCtl.isForced() ? " (forced)" : "") +
                "\nPTCL " + (state ? state.particles.length : 0) +
                "\nBULL " + (state ? state.bullets.length + state.enemyBullets.length : 0) +
                "\nAUD  " + (audio.isReady() ? "on" : "off") +
                "\nHULL " + renderer.getRenderMode().toUpperCase()
            );
        }
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
        audio.suspend();
        if (state && !state.destroyed && phase !== "menu") saveRun(state);
        persist();
    } else {
        lastTs = 0;
        audio.resume();
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

function unlockAudioOnce() {
    audio.unlock();
    window.removeEventListener("pointerdown", unlockAudioOnce);
    window.removeEventListener("keydown", unlockAudioOnce);
}
window.addEventListener("pointerdown", unlockAudioOnce);
window.addEventListener("keydown", unlockAudioOnce);

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker.register("service-worker.js").catch(function () {});
    });
}

renderer.resize();
applySettings();
ui.showMenu(profile, hasRun());
if (bootDispatch) {
    ui.toast("Dispatch returned: +" + fmtNum(bootDispatch.credits) + " credits" +
        (bootDispatch.urium ? ", +" + bootDispatch.urium + " urium" : ""), "good");
}
checkAwards();
requestAnimationFrame(frame);

/* Debug hooks for smoke tests. */
window.__DEEP_ORBIT__ = {
    getState: () => state,
    getProfile: () => profile,
    getPhase: () => phase,
    getConfig: () => ({ maps: MAPS.length, ammo: AMMO.length, ships: SHIPS.length, pickups: PICKUP_IDS.length }),
    getSettings: currentSettings,
    getTier: () => currentTier,
    hasRun: () => hasRun(),
    saveRunNow: () => saveRun(state),
    start: startGame,
    render: () => renderer.render(state, profile, 1 / 60)
};
