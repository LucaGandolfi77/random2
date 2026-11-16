/*
 * DEEP ORBIT — content and tuning tables.
 *
 * Every designer-facing number lives here. The simulation and renderer read
 * from this file; nothing else should hard-code game feel. Inspired by the
 * mechanics of DarkOrbit (shields over hull, X4/X6 ammo, drones, cargo,
 * jump gates) but with original names, art and balance.
 */

export const SLUG = "darkorbit-pwa/";
export const STORAGE_KEY = "darkorbit-pwa";
export const STORAGE_VERSION = 1;
export const STEP = 1 / 60;
export const MAX_DPR = 2;

export const VIEW_BASE = 700;          // world units across the smaller screen axis
export const PLAYER_RADIUS = 18;
export const PICKUP_RADIUS = 62;
export const DOCK_RADIUS = 150;
export const GATE_RADIUS = 110;
export const TARGET_RANGE = 560;
export const MAX_PARTICLES = 220;
export const MAX_ENEMY_BULLETS = 260;

/* ------------------------------------------------------------------ */
/* Palettes                                                            */
/* ------------------------------------------------------------------ */

export const PALETTES = {
    alpha: {
        bg: "#050b18", bg2: "#01030a", nebula: "rgba(46,120,200,0.20)",
        grid: "rgba(120,180,240,0.09)", hazard: "#ff4d6d", accent: "#5ce1e6",
        star: "#dff2ff", ground: "#081426"
    },
    beta: {
        bg: "#031315", bg2: "#000707", nebula: "rgba(30,180,160,0.18)",
        grid: "rgba(110,240,210,0.08)", hazard: "#ff5e7a", accent: "#4ade80",
        star: "#d9fff4", ground: "#05191c"
    },
    gamma: {
        bg: "#0d0720", bg2: "#04010d", nebula: "rgba(150,80,220,0.22)",
        grid: "rgba(190,150,255,0.09)", hazard: "#ff5ea8", accent: "#c08bff",
        star: "#f0e4ff", ground: "#120a28"
    },
    delta: {
        bg: "#1a0a06", bg2: "#080301", nebula: "rgba(220,90,40,0.20)",
        grid: "rgba(255,170,120,0.08)", hazard: "#ff3b30", accent: "#ffb457",
        star: "#fff0dd", ground: "#1e0c08"
    }
};

/* ------------------------------------------------------------------ */
/* Ammunition — light / medium / heavy with escalating cooldowns       */
/* ------------------------------------------------------------------ */

export const AMMO = [
    { id: "ucb", name: "UCB-100", tag: "X4", dmg: 11, cd: 0.17, speed: 1320, color: "#8ff6ff", radius: 3 },
    { id: "rsb", name: "RSB-75", tag: "X6", dmg: 30, cd: 0.52, speed: 1020, color: "#ffd166", radius: 5 },
    { id: "rcb", name: "RCB-140", tag: "X7", dmg: 52, cd: 0.86, speed: 900, color: "#ff7ad9", radius: 6 }
];

/* ------------------------------------------------------------------ */
/* Ships                                                               */
/* ------------------------------------------------------------------ */

export const SHIPS = [
    {
        id: "kestrel", name: "KESTREL", role: "Starter scout",
        speed: 252, hp: 2600, shield: 1900, cargo: 420, cargoBay: 0,
        lasers: 4, color: "#7ad7ff", shape: "arrow",
        price: 0, urium: 0, level: 1
    },
    {
        id: "viper", name: "VIPER", role: "Fast interceptor",
        speed: 310, hp: 3200, shield: 2400, cargo: 560, cargoBay: 0,
        lasers: 6, color: "#8affc1", shape: "dart",
        price: 14000, urium: 0, level: 2
    },
    {
        id: "warden", name: "WARDEN", role: "Balanced gunship",
        speed: 274, hp: 4600, shield: 3800, cargo: 980, cargoBay: 1,
        lasers: 9, color: "#c08bff", shape: "wing",
        price: 52000, urium: 6, level: 4
    },
    {
        id: "bulwark", name: "BULWARK", role: "Heavy tank",
        speed: 228, hp: 7600, shield: 5600, cargo: 1500, cargoBay: 2,
        lasers: 12, color: "#ffb457", shape: "tank",
        price: 140000, urium: 18, level: 7
    }
];

/* ------------------------------------------------------------------ */
/* Enemies                                                             */
/* ------------------------------------------------------------------ */

export const ENEMIES = [
    {
        id: "swarm", name: "Swarm Drone", tier: 1,
        hp: 280, shield: 130, speed: 148, damage: 13, fireCd: 1.9,
        range: 340, radius: 16, xp: 16, credits: [40, 95],
        color: "#ff6b6b", shape: "triangle"
    },
    {
        id: "scout", name: "Hive Scout", tier: 1,
        hp: 460, shield: 220, speed: 196, damage: 19, fireCd: 1.5,
        range: 390, radius: 19, xp: 26, credits: [70, 150],
        color: "#ff9f43", shape: "diamond"
    },
    {
        id: "sentinel", name: "Crystal Sentinel", tier: 2,
        hp: 980, shield: 560, speed: 118, damage: 29, fireCd: 1.7,
        range: 470, radius: 25, xp: 62, credits: [190, 340],
        color: "#b07cff", shape: "hex"
    },
    {
        id: "raider", name: "Void Raider", tier: 2,
        hp: 780, shield: 420, speed: 236, damage: 35, fireCd: 1.15,
        range: 410, radius: 22, xp: 70, credits: [230, 400],
        color: "#ff5ea8", shape: "arrow"
    },
    {
        id: "leviathan", name: "Leviathan", tier: 3, boss: true,
        hp: 3200, shield: 1800, speed: 104, damage: 56, fireCd: 1.25,
        range: 540, radius: 40, xp: 280, credits: [900, 1500],
        color: "#5ce1e6", shape: "boss", spread: 3
    },
    {
        id: "devourer", name: "Star Devourer", tier: 4, boss: true,
        hp: 6400, shield: 3400, speed: 112, damage: 84, fireCd: 1.05,
        range: 600, radius: 50, xp: 620, credits: [1800, 3000],
        color: "#ffd166", shape: "boss", spread: 5
    }
];

export const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

/* ------------------------------------------------------------------ */
/* Maps (sectors)                                                      */
/* ------------------------------------------------------------------ */

export const MAPS = [
    {
        id: "alpha", name: "ALPHA SECTOR", level: 1, world: 2000,
        palette: "alpha", pool: ["swarm", "swarm", "scout"], max: 14,
        interval: 1.15, hpMul: 1, dmgMul: 1, xpMul: 1, gateTo: 1,
        loot: ["aetherium", "aetherium", "cryolite"]
    },
    {
        id: "beta", name: "BETA BELT", level: 3, world: 2300,
        palette: "beta", pool: ["swarm", "scout", "scout", "sentinel"], max: 17,
        interval: 1.0, hpMul: 1.5, dmgMul: 1.35, xpMul: 1.5, gateTo: 2,
        loot: ["aetherium", "cryolite", "cryolite", "xenon"]
    },
    {
        id: "gamma", name: "GAMMA RIFT", level: 5, world: 2600,
        palette: "gamma", pool: ["scout", "sentinel", "sentinel", "raider"], max: 19,
        interval: 0.9, hpMul: 2.2, dmgMul: 1.8, xpMul: 2.2, gateTo: 3,
        loot: ["cryolite", "xenon", "xenon"]
    },
    {
        id: "delta", name: "DELTA CORE", level: 7, world: 2900,
        palette: "delta", pool: ["sentinel", "raider", "raider", "leviathan"], max: 20,
        interval: 0.82, hpMul: 3.0, dmgMul: 2.3, xpMul: 3.0, gateTo: -1,
        boss: "devourer", loot: ["xenon", "xenon", "cryolite"]
    }
];

/* ------------------------------------------------------------------ */
/* Resources & crates                                                  */
/* ------------------------------------------------------------------ */

export const RESOURCES = {
    aetherium: { name: "Aetherium", price: 9, color: "#5ce1e6", glyph: "◆" },
    cryolite: { name: "Cryolite", price: 15, color: "#8affc1", glyph: "◈" },
    xenon: { name: "Xenon Ore", price: 24, color: "#c08bff", glyph: "✦" }
};
export const RESOURCE_IDS = Object.keys(RESOURCES);

export const BOX_TYPES = [
    { id: "normal", name: "Supply Crate", color: "#9fb4c8", weight: 58, credits: [220, 620], urium: 0, shield: 0 },
    { id: "green", name: "Green Box", color: "#4ade80", weight: 27, credits: [650, 1500], urium: 0, shield: 0.35 },
    { id: "gold", name: "Gold Box", color: "#ffd166", weight: 12, credits: [1900, 4200], urium: [1, 4], shield: 0 },
    { id: "obsidian", name: "Obsidian Box", color: "#c08bff", weight: 3, credits: [5200, 9000], urium: [5, 11], shield: 0 }
];

/* ------------------------------------------------------------------ */
/* Upgrades                                                            */
/* ------------------------------------------------------------------ */

export const UPGRADES = [
    { id: "laser", name: "Laser Cannon", desc: "+12% laser damage", base: 3600, scale: 1.52, max: 12 },
    { id: "generator", name: "Generators", desc: "+5% speed, +shield regen", base: 3200, scale: 1.5, max: 12 },
    { id: "shield", name: "Shield Cells", desc: "+340 max shield", base: 3900, scale: 1.54, max: 12 },
    { id: "hull", name: "Hull Plating", desc: "+480 max hull", base: 4300, scale: 1.54, max: 12 },
    { id: "cargo", name: "Cargo Bay", desc: "+260 cargo capacity", base: 2700, scale: 1.45, max: 12 }
];
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export const DRONE_COST_BASE = 9000;
export const DRONE_COST_SCALE = 2.05;
export const DRONE_MAX = 4;
export const DRONE_DAMAGE = 16;
export const DRONE_FIRE_CD = 0.42;

export function droneCost(owned) {
    return Math.round((DRONE_COST_BASE * Math.pow(DRONE_COST_SCALE, owned)) / 100) * 100;
}

export function upgradeCost(def, level) {
    return Math.round((def.base * Math.pow(def.scale, level)) / 100) * 100;
}

/* ------------------------------------------------------------------ */
/* Abilities                                                           */
/* ------------------------------------------------------------------ */

export const ABILITIES = [
    { id: "boost", name: "Afterburner", short: "BOOST", key: "1", cd: 16, dur: 4, color: "#ffd166", glyph: "»" },
    { id: "barrier", name: "Insta-Shield", short: "SHIELD", key: "2", cd: 26, dur: 3, color: "#5ce1e6", glyph: "⬡" },
    { id: "repair", name: "Nano Repair", short: "REPAIR", key: "3", cd: 34, dur: 0, color: "#8affc1", glyph: "+" }
];
export const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));

/* ------------------------------------------------------------------ */
/* Progression helpers                                                 */
/* ------------------------------------------------------------------ */

export function xpForLevel(level) {
    return Math.round(80 * Math.pow(level, 1.55));
}

export function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function rand(min, max) {
    return min + Math.random() * (max - min);
}

export function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

export function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}
