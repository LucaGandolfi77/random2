/*
 * DEEP ORBIT — one-time contextual tips.
 * Returns a tip only the first time it is triggered.
 */

import { TIPS } from "./config.js";

export function tipOnce(profile, key) {
    if (!TIPS[key]) return null;
    if (!Array.isArray(profile.tipsSeen)) profile.tipsSeen = [];
    if (profile.tipsSeen.includes(key)) return null;
    profile.tipsSeen.push(key);
    return { key, text: TIPS[key] };
}

export function seenTips(profile) {
    return Array.isArray(profile.tipsSeen) ? profile.tipsSeen : [];
}
