/*
 * DEEP ORBIT — persistent player profile.
 *
 * One localStorage key, validated on load so a corrupt or partial save can
 * never crash the game. Unknown keys are preserved for forward compatibility.
 */

import {
    STORAGE_KEY, STORAGE_VERSION, SETTINGS_KEY, SETTINGS_VERSION,
    SHIPS, UPGRADES, MAPS, clamp
} from "./config.js";

export const DEFAULTS = {
    version: STORAGE_VERSION,
    credits: 2500,
    urium: 10,
    xp: 0,
    level: 1,
    ship: 0,
    ownedShips: [0],
    upgrades: { laser: 0, generator: 0, shield: 0, hull: 0, cargo: 0, critical: 0, regen: 0, magnet: 0 },
    drones: 0,
    lastMap: 0,
    bestScore: 0,
    totalKills: 0,
    tutorialDone: false,
    installDismissed: false
};

function count(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function loadProfile(storage) {
    const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    let raw = null;
    try { raw = store ? store.getItem(STORAGE_KEY) : null; } catch (e) { raw = null; }

    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }

    const profile = JSON.parse(JSON.stringify(DEFAULTS));

    if (data && typeof data === "object") {
        profile.tutorialDone = data.tutorialDone === true;
        profile.credits = count(data.credits, profile.credits);
        profile.urium = count(data.urium, profile.urium);
        profile.level = Math.max(1, count(data.level, 1));
        profile.xp = count(data.xp, 0);
        profile.lastMap = clamp(count(data.lastMap, 0), 0, MAPS.length - 1);
        profile.bestScore = count(data.bestScore, 0);
        profile.totalKills = count(data.totalKills, 0);
        profile.installDismissed = data.installDismissed === true;

        profile.drones = clamp(count(data.drones, 0), 0, 4);

        if (Array.isArray(data.ownedShips)) {
            const owned = data.ownedShips
                .map((v) => count(v, -1))
                .filter((v) => v >= 0 && v < SHIPS.length);
            profile.ownedShips = Array.from(new Set([0, ...owned]));
        }
        profile.ship = profile.ownedShips.includes(count(data.ship, 0))
            ? count(data.ship, 0)
            : profile.ownedShips[0];

        if (data.upgrades && typeof data.upgrades === "object") {
            for (const def of UPGRADES) {
                profile.upgrades[def.id] = clamp(count(data.upgrades[def.id], 0), 0, def.max);
            }
        }
    }

    return profile;
}

export const SETTINGS_DEFAULTS = {
    version: SETTINGS_VERSION,
    effects: "auto",       // auto | high | low
    fps: 60,               // 60 | 30
    sensitivity: 1,        // 0.6 .. 1.4
    palette: "normal",     // normal | colorblind
    hud: "normal",         // normal | large
    showFps: false
};

export function loadSettings(storage) {
    const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    let data = null;
    try {
        const raw = store ? store.getItem(SETTINGS_KEY) : null;
        data = raw ? JSON.parse(raw) : null;
    } catch (e) {
        data = null;
    }
    const out = Object.assign({}, SETTINGS_DEFAULTS);
    if (data && typeof data === "object") {
        if (["auto", "high", "low"].indexOf(data.effects) >= 0) out.effects = data.effects;
        if (data.fps === 30 || data.fps === 60) out.fps = data.fps;
        const sens = Number(data.sensitivity);
        if (Number.isFinite(sens)) out.sensitivity = clamp(sens, 0.6, 1.4);
        if (data.palette === "colorblind") out.palette = data.palette;
        if (data.hud === "large") out.hud = data.hud;
        out.showFps = data.showFps === true;
    }
    return out;
}

export function saveSettings(settings, storage) {
    const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!store || !settings) return false;
    try {
        store.setItem(SETTINGS_KEY, JSON.stringify({
            version: SETTINGS_VERSION,
            effects: settings.effects,
            fps: settings.fps,
            sensitivity: settings.sensitivity,
            palette: settings.palette,
            hud: settings.hud,
            showFps: settings.showFps === true
        }));
        return true;
    } catch (e) {
        return false;
    }
}

export function saveProfile(profile, storage) {
    const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!store || !profile) return false;
    try {
        store.setItem(STORAGE_KEY, JSON.stringify({
            version: STORAGE_VERSION,
            credits: count(profile.credits, 0),
            urium: count(profile.urium, 0),
            xp: count(profile.xp, 0),
            level: Math.max(1, count(profile.level, 1)),
            ship: count(profile.ship, 0),
            ownedShips: Array.isArray(profile.ownedShips) ? profile.ownedShips : [0],
            upgrades: profile.upgrades || {},
            drones: clamp(count(profile.drones, 0), 0, 4),
            lastMap: count(profile.lastMap, 0),
            bestScore: count(profile.bestScore, 0),
            totalKills: count(profile.totalKills, 0),
            tutorialDone: profile.tutorialDone === true,
            installDismissed: profile.installDismissed === true
        }));
        return true;
    } catch (e) {
        return false;
    }
}
