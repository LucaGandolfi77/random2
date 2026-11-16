/*
 * DEEP ORBIT — authored story missions.
 *
 * One mission is active at a time. Progress comes from ordinary play (kills,
 * sales, gates, bosses, levels and sectors); completing one pays out and
 * advances the chain. No quest NPC and no dialogue boxes in combat.
 */

import { MISSIONS } from "./config.js";

export function currentMission(profile) {
    const index = profile.missions.active | 0;
    return index < MISSIONS.length ? MISSIONS[index] : null;
}

export function missionProgress(profile, type, amount, absolute) {
    const mission = currentMission(profile);
    if (!mission || mission.objective.type !== type || !amount) return null;

    const m = profile.missions;
    if (absolute) m.progress = Math.max(m.progress | 0, amount);
    else m.progress = (m.progress | 0) + amount;

    if (m.progress < mission.objective.target) return null;

    const reward = mission.reward;
    profile.credits = (profile.credits | 0) + reward.credits;
    profile.urium = (profile.urium | 0) + reward.urium;
    if (!m.completed.includes(mission.id)) m.completed.push(mission.id);
    m.active += 1;
    m.progress = 0;
    return { mission, reward };
}

export function missionLog(profile) {
    return MISSIONS.map((m, index) => ({
        id: m.id,
        chapter: m.chapter,
        title: m.title,
        brief: m.brief,
        objective: m.objective,
        reward: m.reward,
        state: profile.missions.completed.includes(m.id)
            ? "completed"
            : index === (profile.missions.active | 0) ? "active" : "locked"
    }));
}

export function missionsDone(profile) {
    return (profile.missions.completed || []).length;
}
