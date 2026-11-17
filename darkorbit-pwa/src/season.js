/*
 * DEEP ORBIT — offline season pass, voucher codes and daily event modifiers.
 * Everything is date-derived and local; no account or backend required.
 */

import {
    SEASON_LENGTH_DAYS, SEASON_TIERS, SEASON_XP_PER_TIER,
    SEASON_REWARDS, VOUCHERS, EVENT_TYPES
} from "./config.js";
import { dateKey } from "./daily.js";

function hash(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function seasonKey(now) {
    const days = Math.floor((now === undefined ? Date.now() : now) / (SEASON_LENGTH_DAYS * 86400000));
    return "S" + (days + 1);
}

export function ensureSeason(profile, now) {
    const key = seasonKey(now);
    if (!profile.season || profile.season.key !== key) {
        profile.season = { key, xp: 0, claimed: [] };
    }
    return profile.season;
}

export function addSeasonXp(profile, amount, now) {
    if (!amount) return [];
    const season = ensureSeason(profile, now);
    season.xp += amount;
    const unlocked = [];
    for (let tier = 1; tier <= SEASON_TIERS; tier++) {
        if (season.xp >= tier * SEASON_XP_PER_TIER && !season.claimed.includes(tier)) {
            unlocked.push(tier);
        }
    }
    return unlocked;
}

export function claimSeasonTier(profile, tier, now) {
    const season = ensureSeason(profile, now);
    if (tier < 1 || tier > SEASON_TIERS || season.claimed.includes(tier)) return null;
    if (season.xp < tier * SEASON_XP_PER_TIER) return null;
    const reward = SEASON_REWARDS[tier - 1];
    season.claimed.push(tier);
    profile.credits = (profile.credits | 0) + reward.credits;
    profile.urium = (profile.urium | 0) + reward.urium;
    if (reward.tint) {
        if (!profile.tints) profile.tints = [];
        if (!profile.tints.includes(reward.tint)) profile.tints.push(reward.tint);
    }
    return reward;
}

export function seasonProgress(profile, now) {
    const season = ensureSeason(profile, now);
    const tier = Math.min(SEASON_TIERS, Math.floor(season.xp / SEASON_XP_PER_TIER));
    return {
        key: season.key,
        xp: season.xp,
        tier,
        into: season.xp - tier * SEASON_XP_PER_TIER,
        needed: SEASON_XP_PER_TIER,
        claimed: season.claimed || []
    };
}

export function dailyEvent(now) {
    const seed = hash(dateKey(now));
    return EVENT_TYPES[seed % EVENT_TYPES.length];
}

export function redeemVoucher(profile, code) {
    const normalized = String(code || "").trim().toUpperCase();
    if (!normalized) return null;
    if (!Array.isArray(profile.vouchers)) profile.vouchers = [];
    if (profile.vouchers.includes(normalized)) return null;
    const voucher = VOUCHERS.find((v) => v.code === normalized);
    if (!voucher) return null;
    profile.vouchers.push(normalized);
    profile.credits = (profile.credits | 0) + voucher.credits;
    profile.urium = (profile.urium | 0) + voucher.urium;
    return voucher;
}
