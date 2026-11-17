/*
 * DEEP ORBIT — gear score and sector recommendations.
 * A single readable number that tells the pilot how ready they are.
 */

import { SHIPS, MAPS } from "./config.js";

export function gearPower(profile) {
    const shipIndex = Math.max(0, SHIPS.findIndex((s) => s.id === (SHIPS[profile.ship] || {}).id));
    const upgrades = Object.values(profile.upgrades || {}).reduce((a, b) => a + (b | 0), 0);
    const skills = Object.values(profile.skills || {}).reduce((a, b) => a + (b | 0), 0);
    return Math.round(
        100 +
        Math.max(0, (profile.level | 0) - 1) * 120 +
        upgrades * 130 +
        skills * 180 +
        (profile.drones | 0) * 420 +
        (profile.prestige | 0) * 1200 +
        shipIndex * 160
    );
}

export function sectorStatus(profile, map) {
    const power = gearPower(profile);
    const need = map.recommendedPower || 0;
    if (power >= need * 1.25) return { label: "EASY", tone: "good", power, need };
    if (power >= need) return { label: "READY", tone: "ok", power, need };
    return { label: "UNDER-POWERED", tone: "warn", power, need };
}

export function sectorList(profile) {
    return MAPS.map((map, index) => ({ map, index, status: sectorStatus(profile, map) }));
}
