/*
 * DEEP ORBIT — deterministic daily contracts and login streak.
 *
 * The three goals for a day are derived from the local date, so every player
 * gets the same set without a server. Progress is stored in the profile and
 * reset at local midnight.
 */

const TEMPLATES = [
    { id: "kills", type: "kills", label: "Destroy {n} aliens", target: [12, 30], reward: [600, 1600] },
    { id: "sell", type: "sell", label: "Sell {n} units of ore", target: [20, 70], reward: [800, 1800] },
    { id: "box", type: "box", label: "Open {n} supply boxes", target: [2, 5], reward: [900, 2200] },
    { id: "boss", type: "boss", label: "Destroy {n} boss ship", target: [1, 1], reward: [1800, 3500] },
    { id: "critical", type: "critical", label: "Land {n} critical hits", target: [3, 10], reward: [700, 1700] }
];

export function dateKey(now) {
    const d = new Date(now === undefined ? Date.now() : now);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
}

function shiftDay(key, delta) {
    const parts = key.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + delta);
    return dateKey(d.getTime());
}

function seedFromKey(key) {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function rng(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pickIndex(list, random) {
    return Math.floor(random() * list.length);
}

function generateContracts(key) {
    const random = rng(seedFromKey(key));
    const pool = TEMPLATES.slice();
    const chosen = [];
    for (let i = 0; i < 3 && pool.length; i++) {
        const tpl = pool.splice(pickIndex(pool, random), 1)[0];
        const target = tpl.target[0] + Math.floor(random() * (tpl.target[1] - tpl.target[0] + 1));
        chosen.push({
            id: tpl.id + "-" + i,
            type: tpl.type,
            text: tpl.label.replace("{n}", String(target)),
            target,
            reward: tpl.reward[0] + Math.floor(random() * (tpl.reward[1] - tpl.reward[0] + 1)),
            progress: 0,
            done: false
        });
    }
    return chosen;
}

function touchStreak(profile, key) {
    if (profile.daily.lastDay === key) return false;
    profile.daily.streak = profile.daily.lastDay === shiftDay(key, -1)
        ? (profile.daily.streak | 0) + 1
        : 1;
    profile.daily.lastDay = key;
    return true;
}

export function ensureDaily(profile, now) {
    const key = dateKey(now);
    if (!profile.daily) {
        profile.daily = { date: "", contracts: [], progress: {}, completed: [], streak: 0, lastDay: "" };
    }
    if (profile.daily.date !== key || !profile.daily.contracts || profile.daily.contracts.length !== 3) {
        profile.daily.date = key;
        profile.daily.contracts = generateContracts(key);
        profile.daily.completed = [];
    }
    return profile.daily;
}

export function dailyContracts(profile, now) {
    return ensureDaily(profile, now).contracts;
}

export function contractProgress(profile, type, amount, now) {
    if (!amount || amount <= 0) return [];
    const key = dateKey(now);
    const daily = ensureDaily(profile, now);
    const completed = [];
    for (const c of daily.contracts) {
        if (c.type !== type || c.done) continue;
        c.progress += amount;
        if (c.progress >= c.target) {
            c.progress = c.target;
            c.done = true;
            profile.credits = (profile.credits | 0) + c.reward;
            if (!daily.completed.includes(c.id)) daily.completed.push(c.id);
            const first = touchStreak(profile, key);
            completed.push({ contract: c, first, streak: profile.daily.streak });
        }
    }
    return completed;
}

export function streakBonus(streak) {
    if (streak >= 7) return { urium: 12, credits: 2000 };
    if (streak >= 3) return { urium: 5, credits: 700 };
    return { urium: 0, credits: 0 };
}
