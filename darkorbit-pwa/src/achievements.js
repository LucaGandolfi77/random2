/*
 * DEEP ORBIT — achievement evaluation.
 *
 * Pure checks against the persistent profile and the live run. Newly unlocked
 * achievements are awarded credits once and returned for UI notification.
 */

import { ACHIEVEMENTS } from "./config.js";

export function checkAchievements(profile, state) {
    const unlocked = [];
    const has = (id) => (profile.achievements || []).includes(id);

    const tests = {
        first_kill: () => (profile.totalKills | 0) >= 1 || (state && state.kills > 0),
        kills_50: () => (profile.totalKills | 0) >= 50,
        kills_250: () => (profile.totalKills | 0) >= 250,
        boss: () => (profile.bossKills | 0) >= 1,
        cargo_100: () => !!(state && state.cargoUsed >= 100),
        sale_10000: () => (profile.bestSale | 0) >= 10000,
        level_5: () => (profile.level | 0) >= 5,
        level_10: () => (profile.level | 0) >= 10,
        sector_delta: () => (profile.lastMap | 0) >= 3,
        sector_epsilon: () => (profile.lastMap | 0) >= 4,
        drones_4: () => (profile.drones | 0) >= 4,
        score_20000: () => !!(state && state.score >= 20000)
    };

    for (const def of ACHIEVEMENTS) {
        if (has(def.id)) continue;
        let ok = false;
        try { ok = !!(tests[def.id] && tests[def.id]()); } catch (e) { ok = false; }
        if (!ok) continue;
        if (!Array.isArray(profile.achievements)) profile.achievements = [];
        profile.achievements.push(def.id);
        profile.credits = (profile.credits | 0) + def.reward;
        unlocked.push(def);
    }
    return unlocked;
}

export function achievementList(profile) {
    return ACHIEVEMENTS.map((def) => Object.assign({}, def, {
        unlocked: (profile.achievements || []).includes(def.id)
    }));
}

export function achievementCount(profile) {
    return (profile.achievements || []).length;
}
