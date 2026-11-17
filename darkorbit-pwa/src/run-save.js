/*
 * DEEP ORBIT — versioned run persistence.
 *
 * A run is the whole simulation state minus transient render/audio caches.
 * It is saved every few seconds and on tab hide, so closing the app never
 * loses progress. Restoring rehydrates maps/pools and fills in fields added
 * by later versions.
 */

import { RUN_KEY, RUN_VERSION, MAPS, AMMO, MAX_PARTICLES } from "./config.js";
import { createState } from "./sim.js";

function storage() {
    return typeof localStorage !== "undefined" ? localStorage : null;
}

export function hasRun() {
    const s = storage();
    if (!s) return false;
    try {
        const raw = s.getItem(RUN_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        return data && data.version === RUN_VERSION && !!data.state;
    } catch (e) {
        return false;
    }
}

export function saveRun(state) {
    const s = storage();
    if (!s || !state || state.destroyed) return false;
    try {
        const copy = JSON.parse(JSON.stringify(state));
        delete copy.events;
        delete copy.pools;
        delete copy.fx;
        s.setItem(RUN_KEY, JSON.stringify({
            version: RUN_VERSION,
            savedAt: Date.now(),
            state: copy
        }));
        return true;
    } catch (e) {
        return false;
    }
}

export function loadRun() {
    const s = storage();
    if (!s) return null;
    try {
        const raw = s.getItem(RUN_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || data.version !== RUN_VERSION || !data.state) return null;
        return data.state;
    } catch (e) {
        return null;
    }
}

export function clearRun() {
    const s = storage();
    if (!s) return;
    try { s.removeItem(RUN_KEY); } catch (e) {}
}

export function restoreState(saved, profile) {
    const state = createState(profile, { mapIndex: saved.mapIndex || 0 });
    for (const key of Object.keys(saved)) {
        if (key === "map" || key === "world" || key === "events" || key === "pools" || key === "fx") continue;
        state[key] = saved[key];
    }

    state.map = MAPS[state.mapIndex] || MAPS[0];
    state.world = { x: state.map.world, y: state.map.world };
    state.events = [];
    state.pools = { bullets: [], enemyBullets: [], particles: [] };
    state.fx = { particles: MAX_PARTICLES, glow: true, shake: true, layers: true, text: true, mesh: true };

    // Forward-compatible defaults.
    const p = state.player;
    if (!p.ammoCd || p.ammoCd.length !== AMMO.length) {
        p.ammoCd = AMMO.map(() => 0);
    }
    if (!p.abilityCd) p.abilityCd = { boost: 0, barrier: 0, repair: 0 };
    if (p.critChance === undefined) p.critChance = 0;
    if (p.pickupRadius === undefined) p.pickupRadius = 62;
    if (state.magnetTimer === undefined) state.magnetTimer = 0;
    if (state.overdriveTimer === undefined) state.overdriveTimer = 0;
    if (state.safeNotice === undefined) state.safeNotice = 0;
    if (state.wasDocked === undefined) state.wasDocked = !!state.docked;
    if (!state.mode) state.mode = "sector";
    if (!state.event) state.event = null;
    if (state.mode === "gate" && !state.gate) state.mode = "sector";
    if (state.bossPhaseTimer === undefined) state.bossPhaseTimer = 0;
    if (!state.pickups) state.pickups = [];
    if (!state.cargo) state.cargo = {};

    for (const e of state.enemies || []) {
        if (e.cloakAlpha === undefined) e.cloakAlpha = 1;
        if (e.cloakCd === undefined) e.cloakCd = 99;
        if (e.dotTime === undefined) { e.dotTime = 0; e.dotDps = 0; }
        if (e.charge === undefined) e.charge = 0;
        if (e.homeX === undefined) { e.homeX = e.x; e.homeY = e.y; }
    }
    return state;
}
