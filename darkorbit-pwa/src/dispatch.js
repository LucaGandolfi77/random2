/*
 * DEEP ORBIT — offline retriever dispatch.
 *
 * Missions are resolved at launch time and settle by wall-clock deadline, so
 * the game can be closed for hours and still reward the player on return.
 */

import { DISPATCH_TIERS } from "./config.js";

function rand(min, max) {
    return min + Math.random() * (max - min);
}

export function tierById(id) {
    return DISPATCH_TIERS.find((t) => t.id === id) || null;
}

export function startDispatch(profile, tierId, now) {
    if (!profile || profile.dispatch.active) return false;
    const tier = tierById(tierId);
    if (!tier) return false;
    const credits = Math.round(rand(tier.credits[0], tier.credits[1]) * (1 + (profile.level - 1) * 0.04));
    const urium = tier.urium ? Math.round(rand(tier.urium[0], tier.urium[1])) : 0;
    profile.dispatch.active = {
        tier: tier.id,
        endsAt: (now || Date.now()) + tier.hours * 3600 * 1000,
        rewards: { credits, urium }
    };
    profile.dispatch.totalSent = (profile.dispatch.totalSent | 0) + 1;
    return true;
}

export function dispatchStatus(profile, now) {
    const active = profile && profile.dispatch && profile.dispatch.active;
    if (!active) return { active: false };
    const tier = tierById(active.tier);
    const remaining = Math.max(0, active.endsAt - (now || Date.now()));
    return {
        active: true,
        tier: tier ? tier.name : active.tier,
        remaining,
        hours: remaining / 3600000,
        done: remaining <= 0,
        rewards: active.rewards
    };
}

export function claimDispatch(profile, now) {
    const status = dispatchStatus(profile, now);
    if (!status.active || !status.done) return null;
    const rewards = status.rewards || { credits: 0, urium: 0 };
    profile.credits = (profile.credits | 0) + (rewards.credits | 0);
    profile.urium = (profile.urium | 0) + (rewards.urium | 0);
    profile.dispatch.active = null;
    return {
        credits: rewards.credits | 0,
        urium: rewards.urium | 0
    };
}

export function dispatchTiers() {
    return DISPATCH_TIERS;
}
