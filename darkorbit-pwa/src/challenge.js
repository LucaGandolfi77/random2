/*
 * DEEP ORBIT — weekly seeded challenge, local leaderboard and replay storage.
 *
 * The week key and seed are derived from the local date, so every player gets
 * the same challenge without a server. Scores and the best-run replay live in
 * localStorage only.
 */

const BOARD_KEY = "darkorbit-weekly";
const REPLAY_KEY = "darkorbit-replay";

function storage() {
    return typeof localStorage !== "undefined" ? localStorage : null;
}

export function weekKey(now) {
    const d = new Date(now === undefined ? Date.now() : now);
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
    return utc.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
}

export function hashString(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function weeklyConfig(now, mapCount) {
    const key = weekKey(now);
    const seed = hashString(key);
    return {
        key,
        seed,
        mapIndex: seed % Math.max(1, mapCount || 1),
        ship: 0,
        label: key.replace("-W", " WEEK ")
    };
}

export function loadBoard() {
    const s = storage();
    if (!s) return [];
    try {
        const data = JSON.parse(s.getItem(BOARD_KEY) || "[]");
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
}

export function addScore(entry, now) {
    const key = weekKey(now);
    const all = loadBoard();
    const current = all.filter((e) => e.week === key);
    current.push({
        week: key,
        score: Math.round(entry.score || 0),
        kills: Math.round(entry.kills || 0),
        mapIndex: entry.mapIndex | 0,
        at: Date.now()
    });
    current.sort((a, b) => b.score - a.score);
    const merged = all.filter((e) => e.week !== key).concat(current.slice(0, 10)).slice(0, 50);
    const s = storage();
    if (s) {
        try { s.setItem(BOARD_KEY, JSON.stringify(merged)); } catch (e) {}
    }
    return current.slice(0, 10);
}

export function bestScore(now) {
    const key = weekKey(now);
    const scores = loadBoard().filter((e) => e.week === key).map((e) => e.score);
    return scores.length ? Math.max(...scores) : 0;
}

export function saveBestReplay(run) {
    const s = storage();
    if (!s || !run) return false;
    const existing = loadBestReplay();
    if (existing && (existing.score || 0) >= (run.score || 0)) return false;
    try {
        s.setItem(REPLAY_KEY, JSON.stringify({
            score: Math.round(run.score || 0),
            mapIndex: run.mapIndex | 0,
            frames: (run.frames || []).slice(0, 4000)
        }));
        return true;
    } catch (e) {
        return false;
    }
}

export function loadBestReplay() {
    const s = storage();
    if (!s) return null;
    try {
        const data = JSON.parse(s.getItem(REPLAY_KEY) || "null");
        return data && Array.isArray(data.frames) ? data : null;
    } catch (e) {
        return null;
    }
}

export async function shareResult(score, week) {
    const text = "Deep Orbit · " + week + " — I scored " + Math.round(score).toLocaleString("en-US") + " points. Can you beat me?";
    if (typeof navigator !== "undefined" && navigator.share) {
        try {
            await navigator.share({ title: "Deep Orbit", text });
            return true;
        } catch (e) {
            if (e && e.name === "AbortError") return false;
        }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (e) {}
    }
    return false;
}
