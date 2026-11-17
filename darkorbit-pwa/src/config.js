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
export const SETTINGS_KEY = "darkorbit-settings";
export const SETTINGS_VERSION = 1;
export const RUN_KEY = "darkorbit-run";
export const RUN_VERSION = 1;

/* Refining: three raw ore units become one refined unit worth 3× at sale. */
/* Galaxy Reset: trade level and gear for a permanent bonus tier. */
export const PRESTIGE_MIN_LEVEL = 10;
export const PRESTIGE_BONUS = { damage: 0.1, shield: 0.1, cargo: 0.1 };

export const REFINE_RATIO = 3;
export const REFINED_PRICE_MULT = 3;

/* Assembly recipes turn refined materials into immediate field effects. */
export const CRAFTS = [
    { id: "nanite", name: "Nanite Repair", desc: "Restore 50% hull", cost: { aetherium: 4 }, effect: "repair" },
    { id: "barrier", name: "Barrier Cell", desc: "Restore 60% shield", cost: { cryolite: 3, xenon: 2 }, effect: "shield" },
    { id: "magnet", name: "Ore Magnet", desc: "12 s auto-collect field", cost: { cryolite: 5 }, effect: "magnet" },
    { id: "overdrive", name: "Overdrive Core", desc: "10 s rapid fire", cost: { xenon: 4, aetherium: 2 }, effect: "overdrive" }
];

/* Story missions. Objectives are checked against live play + the profile. */
export const MISSIONS = [
    { id: "m01", chapter: "I · FIRST CONTACT", title: "Shakedown", brief: "The station sensors picked up a swarm drifting through Alpha Sector. Clear them out and prove the hull holds.", objective: { type: "kills", target: 5 }, reward: { credits: 800, urium: 1 } },
    { id: "m02", chapter: "I · FIRST CONTACT", title: "Cargo Run", brief: "Ore is worthless in the hold. Haul it back to the station and sell a full load.", objective: { type: "sell", target: 20 }, reward: { credits: 1200, urium: 1 } },
    { id: "m03", chapter: "I · FIRST CONTACT", title: "Pest Control", brief: "The swarm is multiplying. Destroy twenty-five hostiles before they reach the shipping lanes.", objective: { type: "kills", target: 25 }, reward: { credits: 2000, urium: 2 } },
    { id: "m04", chapter: "II · THE GATES", title: "First Jump", brief: "A gate has activated near the station. Enter it and survive three waves.", objective: { type: "gate", target: 1 }, reward: { credits: 3000, urium: 3 } },
    { id: "m05", chapter: "II · THE GATES", title: "Big Game", brief: "Something large is guarding the deeper sectors. Bring down a boss ship.", objective: { type: "boss", target: 1 }, reward: { credits: 4000, urium: 4 } },
    { id: "m06", chapter: "II · THE GATES", title: "Veteran", brief: "Your flight record is getting noticed. Reach pilot level five.", objective: { type: "level", target: 5 }, reward: { credits: 3500, urium: 4 } },
    { id: "m07", chapter: "III · THE DEEP", title: "Extermination", brief: "Command wants the sector swept. Sixty more hostiles, no questions asked.", objective: { type: "kills", target: 60 }, reward: { credits: 6000, urium: 5 } },
    { id: "m08", chapter: "III · THE DEEP", title: "Trade War", brief: "Refined ore is worth a fortune out here. Sell a hundred units and corner the market.", objective: { type: "sell", target: 100 }, reward: { credits: 7000, urium: 6 } },
    { id: "m09", chapter: "III · THE DEEP", title: "Gate Runner", brief: "Three more gates, three more chances to prove you can handle the pressure.", objective: { type: "gate", target: 3 }, reward: { credits: 9000, urium: 7 } },
    { id: "m10", chapter: "IV · OBLIVION", title: "Into Delta", brief: "The radiation is getting worse. Jump to Delta Core and map the hazards.", objective: { type: "sector", target: 3 }, reward: { credits: 10000, urium: 8 } },
    { id: "m11", chapter: "IV · OBLIVION", title: "Hunt the Giants", brief: "Three boss signatures are moving through the outer sectors. Silence them.", objective: { type: "boss", target: 3 }, reward: { credits: 14000, urium: 10 } },
    { id: "m12", chapter: "IV · OBLIVION", title: "Beyond the Veil", brief: "The last jump. Epsilon Veil, then Z Oblivion. No one has come back from the far side.", objective: { type: "sector", target: 5 }, reward: { credits: 20000, urium: 15 } }
];

/* Pilot skills — one point per level, spent in the hangar. */
export const SKILLS = [
    { id: "laser", name: "Laser Mastery", desc: "+6% laser damage / point", max: 5 },
    { id: "shield", name: "Shield Tuning", desc: "+5% max shield / point", max: 5 },
    { id: "drone", name: "Drone Control", desc: "+8% drone damage / point", max: 5 },
    { id: "cargo", name: "Logistics", desc: "+8% cargo capacity / point", max: 5 }
];
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

/* Offline retriever dispatch. Duration is in hours. */
export const DISPATCH_TIERS = [
    { id: "short", name: "Short Run", hours: 2, credits: [1400, 2600], urium: 0 },
    { id: "long", name: "Deep Run", hours: 4, credits: [3600, 6200], urium: [1, 2] },
    { id: "epic", name: "Epic Expedition", hours: 8, credits: [9000, 15000], urium: [3, 6] }
];

export const ACHIEVEMENTS = [
    { id: "first_kill", name: "First Blood", desc: "Destroy your first alien", reward: 250 },
    { id: "kills_50", name: "Exterminator", desc: "Destroy 50 aliens (lifetime)", reward: 1500 },
    { id: "kills_250", name: "Swarm Breaker", desc: "Destroy 250 aliens (lifetime)", reward: 6000 },
    { id: "boss", name: "Giant Slayer", desc: "Destroy a boss", reward: 3000 },
    { id: "cargo_100", name: "Full Hold", desc: "Carry 100 units of ore at once", reward: 1200 },
    { id: "sale_10000", name: "Merchant", desc: "Earn 10,000 credits in one sale", reward: 2000 },
    { id: "level_5", name: "Veteran", desc: "Reach pilot level 5", reward: 1000 },
    { id: "level_10", name: "Ace Pilot", desc: "Reach pilot level 10", reward: 4000 },
    { id: "sector_delta", name: "Deep Space", desc: "Reach Delta Core", reward: 2500 },
    { id: "sector_epsilon", name: "Beyond the Veil", desc: "Reach Epsilon Veil", reward: 6000 },
    { id: "drones_4", name: "Hive Mind", desc: "Own four combat drones", reward: 3000 },
    { id: "score_20000", name: "High Roller", desc: "Score 20,000 in a single run", reward: 2500 }
];

/* Quality tiers. `auto` picks between high and low from measured FPS. */
export const QUALITY = {
    high: {
        fx: { particles: 220, glow: true, shake: true, layers: true, text: true, mesh: true },
        dprCap: 2
    },
    low: {
        fx: { particles: 70, glow: false, shake: false, layers: false, text: false, mesh: false },
        dprCap: 1.25
    }
};

/* Colorblind-friendly substitutions (applied when palette = "colorblind"). */
export const CB_COLORS = {
    "#ff6b6b": "#4db8ff", "#ff5d73": "#4db8ff", "#ff4d6d": "#4db8ff",
    "#ff5e7a": "#ffb457", "#ff5ea8": "#ffb457", "#ff7ad9": "#ffb457",
    "#ff9f43": "#ffd166", "#ff8a5c": "#ffd166", "#ff3b30": "#ffd166",
    "#ff4d8d": "#4db8ff", "#b07cff": "#7df9ff"
};

/* Galaxy Gate arena: three timed waves ending in a boss. */
export const GATE_CONFIG = {
    duration: 90,
    waves: [4, 6, 8],
    bossWave: 3,
    eliteChance: 0.22,
    reward: { credits: [5000, 9000], urium: [4, 9] }
};

/* Elite affixes give ordinary enemies a visual tell, tougher stats and loot. */
export const ELITES = [
    { id: "armored", name: "Armored", color: "#ffd166", hp: 1.35, shield: 2.2, speed: 0.85, fire: 1, reward: 1.8, regen: 0 },
    { id: "swift", name: "Swift", color: "#7df9ff", hp: 0.85, shield: 0.9, speed: 1.6, fire: 0.75, reward: 1.6, regen: 0 },
    { id: "regen", name: "Regenerator", color: "#8affc1", hp: 1.1, shield: 1.1, speed: 0.95, fire: 1, reward: 1.7, regen: 0.025 },
    { id: "splitter", name: "Splitter", color: "#ff7ad9", hp: 1.15, shield: 1.2, speed: 1.05, fire: 1, reward: 1.5, regen: 0 }
];
export const ELITE_BY_ID = Object.fromEntries(ELITES.map((e) => [e.id, e]));

/* Station safe haven. Enemies disengage inside DOCK_RADIUS and keep a wider
   standoff; incoming fire fizzles at the ring boundary. */
export const SAFE_STANDOFF = DOCK_RADIUS + 100;
export const SPLASH_RADIUS = 95;
export const DOT_DURATION = 4.5;
export const MAGNET_RADIUS = 430;
export const OVERDRIVE_FIRE_MULT = 0.55;
export const DOCKED_SHIELD_REGEN_MULT = 6;
export const MAX_DAMAGE_TEXT = 22;
export const MAX_SHOCKWAVES = 14;

/* ------------------------------------------------------------------ */
/* Palettes                                                            */
/* ------------------------------------------------------------------ */

export const PALETTES = {
    alpha: {
        bg: "#050b18", bg2: "#01030a", nebula: "rgba(46,130,210,0.30)",
        grid: "rgba(120,180,240,0.09)", hazard: "#ff4d6d", accent: "#5ce1e6",
        star: "#dff2ff", ground: "#0d2233", planet: "#163b5c"
    },
    beta: {
        bg: "#031315", bg2: "#000707", nebula: "rgba(30,190,170,0.27)",
        grid: "rgba(110,240,210,0.08)", hazard: "#ff5e7a", accent: "#4ade80",
        star: "#d9fff4", ground: "#0a2426", planet: "#12544a"
    },
    gamma: {
        bg: "#0d0720", bg2: "#04010d", nebula: "rgba(150,90,230,0.32)",
        grid: "rgba(190,150,255,0.09)", hazard: "#ff5ea8", accent: "#c08bff",
        star: "#f0e4ff", ground: "#1c1038", planet: "#3a2160"
    },
    delta: {
        bg: "#1a0a06", bg2: "#080301", nebula: "rgba(220,100,50,0.30)",
        grid: "rgba(255,170,120,0.08)", hazard: "#ff3b30", accent: "#ffb457",
        star: "#fff0dd", ground: "#1e0c08", planet: "#7a2e1c"
    },
    epsilon: {
        bg: "#061a1e", bg2: "#01080b", nebula: "rgba(60,220,230,0.30)",
        grid: "rgba(150,255,250,0.09)", hazard: "#ff4d8d", accent: "#7df9ff",
        star: "#e6ffff", ground: "#08262c", planet: "#14545e"
    },
    zeta: {
        bg: "#0d051c", bg2: "#02010a", nebula: "rgba(180,70,220,0.34)",
        grid: "rgba(220,180,255,0.09)", hazard: "#5ce1e6", accent: "#ff7ad9",
        star: "#f8e8ff", ground: "#1a0d2e", planet: "#3a1250"
    }
};

/* Colorblind variants: danger cues move from red/pink to amber and blue. */
export const PALETTES_CB = Object.fromEntries(
    Object.entries(PALETTES).map(([id, p]) => [id, Object.assign({}, p, {
        hazard: "#ffd166",
        accent: id === "delta" || id === "gamma" ? "#7df9ff" : p.accent
    })])
);

/* ------------------------------------------------------------------ */
/* Ammunition — light / medium / heavy with escalating cooldowns       */
/* ------------------------------------------------------------------ */

export const AMMO = [
    { id: "ucb", name: "UCB-100", tag: "X4", dmg: 11, cd: 0.17, speed: 1320, color: "#8ff6ff", radius: 3 },
    { id: "rsb", name: "RSB-75", tag: "X6", dmg: 30, cd: 0.52, speed: 1020, color: "#ffd166", radius: 5 },
    { id: "rcb", name: "RCB-140", tag: "X7", dmg: 52, cd: 0.86, speed: 900, color: "#ff7ad9", radius: 6 },
    { id: "plt", name: "PLT-3030", tag: "AOE", dmg: 95, cd: 1.25, speed: 760, color: "#ff9f43", radius: 8, splash: true },
    { id: "pib", name: "PIB-100", tag: "DOT", dmg: 130, cd: 1.6, speed: 840, color: "#8affc1", radius: 7, dot: true }
];

/* ------------------------------------------------------------------ */
/* Ships                                                               */
/* ------------------------------------------------------------------ */

export const SHIPS = [
    {
        id: "kestrel", name: "KESTREL", role: "Starter scout",
        speed: 252, hp: 2600, shield: 1900, cargo: 420, cargoBay: 0,
        lasers: 4, color: "#7ad7ff", shape: "arrow",
        price: 0, urium: 0, level: 1, perks: {}, perkText: null
    },
    {
        id: "viper", name: "VIPER", role: "Fast interceptor",
        speed: 310, hp: 3200, shield: 2400, cargo: 560, cargoBay: 0,
        lasers: 6, color: "#8affc1", shape: "dart",
        price: 14000, urium: 0, level: 2, perks: {}, perkText: null
    },
    {
        id: "warden", name: "WARDEN", role: "Balanced gunship",
        speed: 274, hp: 4600, shield: 3800, cargo: 980, cargoBay: 1,
        lasers: 9, color: "#c08bff", shape: "wing",
        price: 52000, urium: 6, level: 4, perks: {}, perkText: null
    },
    {
        id: "bulwark", name: "BULWARK", role: "Heavy tank",
        speed: 228, hp: 7600, shield: 5600, cargo: 1500, cargoBay: 2,
        lasers: 12, color: "#ffb457", shape: "tank",
        price: 140000, urium: 18, level: 7, perks: {}, perkText: null
    },
    {
        id: "spectre", name: "SPECTRE", role: "Evasive phantom hunter",
        speed: 336, hp: 4100, shield: 3400, cargo: 1100, cargoBay: 1,
        lasers: 10, color: "#7df9ff", shape: "stealth",
        price: 260000, urium: 34, level: 9,
        perks: { evasion: 0.12, droneDamage: 1.3 },
        perkText: "+12% evasion · +30% drone damage"
    },
    {
        id: "colossus", name: "COLOSSUS", role: "Siege artillery platform",
        speed: 206, hp: 9200, shield: 6800, cargo: 1800, cargoBay: 2,
        lasers: 14, color: "#ff8a5c", shape: "siege",
        price: 420000, urium: 52, level: 11,
        perks: { rocketDamage: 1.35 },
        perkText: "+35% rocket (PLT) damage"
    },
    {
        id: "ranger", name: "RANGER", role: "Precision marksman",
        speed: 292, hp: 6400, shield: 5200, cargo: 1300, cargoBay: 1,
        lasers: 11, color: "#ff9ff3", shape: "lancer",
        price: 620000, urium: 80, level: 12,
        perks: { crit: 0.08 },
        perkText: "+8% critical hit chance"
    },
    {
        id: "monolith", name: "MONOLITH", role: "Fortress-class juggernaut",
        speed: 198, hp: 12500, shield: 9200, cargo: 2200, cargoBay: 2,
        lasers: 16, color: "#b39aff", shape: "monolith",
        price: 900000, urium: 120, level: 14,
        perks: { rocketDamage: 1.2, droneDamage: 1.2 },
        perkText: "+20% rockets · +20% drones"
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
    },
    {
        id: "wisp", name: "Nebula Wisp", tier: 2,
        hp: 420, shield: 300, speed: 288, damage: 22, fireCd: 1.3,
        range: 330, radius: 15, xp: 74, credits: [190, 360],
        color: "#7df9ff", shape: "wisp", evade: 0.35
    },
    {
        id: "crawler", name: "Siege Crawler", tier: 3,
        hp: 2100, shield: 1500, speed: 78, damage: 52, fireCd: 2.1,
        range: 440, radius: 31, xp: 190, credits: [520, 980],
        color: "#b66bff", shape: "crawler"
    },
    {
        id: "phantom", name: "Phase Phantom", tier: 3,
        hp: 1180, shield: 800, speed: 232, damage: 44, fireCd: 1.25,
        range: 430, radius: 23, xp: 180, credits: [420, 780],
        color: "#c9d6ff", shape: "phantom", cloak: true
    },
    {
        id: "obelisk", name: "Void Obelisk", tier: 4, boss: true,
        hp: 8800, shield: 4600, speed: 92, damage: 96, fireCd: 1.15,
        range: 640, radius: 54, xp: 880, credits: [2400, 4200],
        color: "#7df9ff", shape: "obelisk", spread: 7
    },
    {
        id: "lancer", name: "Void Lancer", tier: 3,
        hp: 1700, shield: 1050, speed: 184, damage: 72, fireCd: 1.45,
        range: 640, radius: 24, xp: 280, credits: [750, 1400],
        color: "#ff9ff3", shape: "lancer"
    },
    {
        id: "queen", name: "Swarm Queen", tier: 4, boss: true,
        hp: 11500, shield: 6400, speed: 98, damage: 112, fireCd: 1.0,
        range: 690, radius: 56, xp: 1300, credits: [3200, 5800],
        color: "#ff7ad9", shape: "queen", spread: 9
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
        palette: "beta", pool: ["swarm", "scout", "scout", "wisp", "sentinel"], max: 17,
        interval: 1.0, hpMul: 1.5, dmgMul: 1.35, xpMul: 1.5, gateTo: 2,
        loot: ["aetherium", "cryolite", "cryolite", "xenon"]
    },
    {
        id: "gamma", name: "GAMMA RIFT", level: 5, world: 2600,
        palette: "gamma", pool: ["scout", "sentinel", "wisp", "raider", "crawler"], max: 19,
        interval: 0.9, hpMul: 2.2, dmgMul: 1.8, xpMul: 2.2, gateTo: 3,
        boss: "leviathan", loot: ["cryolite", "xenon", "xenon"]
    },
    {
        id: "delta", name: "DELTA CORE", level: 7, world: 2900,
        palette: "delta", pool: ["sentinel", "raider", "crawler", "phantom", "leviathan"], max: 20,
        interval: 0.82, hpMul: 3.0, dmgMul: 2.3, xpMul: 3.0, gateTo: 4,
        boss: "devourer", loot: ["xenon", "xenon", "cryolite"]
    },
    {
        id: "epsilon", name: "EPSILON VEIL", level: 10, world: 3200,
        palette: "epsilon", pool: ["crawler", "phantom", "wisp", "raider", "obelisk"], max: 22,
        interval: 0.74, hpMul: 4.2, dmgMul: 3.0, xpMul: 4.2, gateTo: 5,
        boss: "obelisk", loot: ["phantomite", "phantomite", "xenon"]
    },
    {
        id: "zeta", name: "ZETA OBLIVION", level: 12, world: 3500,
        palette: "zeta", pool: ["lancer", "crawler", "phantom", "wisp", "queen"], max: 24,
        interval: 0.68, hpMul: 5.4, dmgMul: 3.8, xpMul: 5.4, gateTo: -1,
        boss: "queen", loot: ["phantomite", "phantomite", "phantomite"]
    }
];

/* ------------------------------------------------------------------ */
/* Resources & crates                                                  */
/* ------------------------------------------------------------------ */

export const RESOURCES = {
    aetherium: { name: "Aetherium", price: 9, color: "#5ce1e6", glyph: "◆" },
    cryolite: { name: "Cryolite", price: 15, color: "#8affc1", glyph: "◈" },
    xenon: { name: "Xenon Ore", price: 24, color: "#c08bff", glyph: "✦" },
    phantomite: { name: "Phantomite", price: 42, color: "#7df9ff", glyph: "✧" }
};
export const RESOURCE_IDS = Object.keys(RESOURCES);

export const BOX_TYPES = [
    { id: "normal", name: "Supply Crate", color: "#9fb4c8", weight: 56, credits: [220, 620], urium: 0, shield: 0 },
    { id: "green", name: "Green Box", color: "#4ade80", weight: 26, credits: [650, 1500], urium: 0, shield: 0.35 },
    { id: "gold", name: "Gold Box", color: "#ffd166", weight: 12, credits: [1900, 4200], urium: [1, 4], shield: 0 },
    { id: "obsidian", name: "Obsidian Box", color: "#c08bff", weight: 4, credits: [5200, 9000], urium: [5, 11], shield: 0 },
    { id: "astral", name: "Astral Cache", color: "#7df9ff", weight: 2, credits: [9000, 16000], urium: [12, 24], shield: 0.5, pickup: true }
];

/* Temporary field pickups. */
export const PICKUPS = {
    repair: { name: "Repair Kit", color: "#8affc1", glyph: "+" },
    magnet: { name: "Ore Magnet", color: "#ffd166", glyph: "◎", duration: 12 },
    overdrive: { name: "Overdrive", color: "#ff7ad9", glyph: "»", duration: 10 }
};
export const PICKUP_IDS = Object.keys(PICKUPS);

/* ------------------------------------------------------------------ */
/* Upgrades                                                            */
/* ------------------------------------------------------------------ */

export const UPGRADES = [
    { id: "laser", name: "Laser Cannon", desc: "+12% laser damage", base: 3600, scale: 1.52, max: 12 },
    { id: "generator", name: "Generators", desc: "+5% speed, +shield regen", base: 3200, scale: 1.5, max: 12 },
    { id: "shield", name: "Shield Cells", desc: "+340 max shield", base: 3900, scale: 1.54, max: 12 },
    { id: "hull", name: "Hull Plating", desc: "+480 max hull", base: 4300, scale: 1.54, max: 12 },
    { id: "cargo", name: "Cargo Bay", desc: "+260 cargo capacity", base: 2700, scale: 1.45, max: 12 },
    { id: "critical", name: "Targeting Array", desc: "+4% critical hit chance", base: 8200, scale: 1.62, max: 8 },
    { id: "regen", name: "Flux Regulators", desc: "+45% shield regeneration", base: 6400, scale: 1.55, max: 8 },
    { id: "magnet", name: "Cargo Magnet", desc: "+28 pickup range", base: 4800, scale: 1.48, max: 8 }
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

let randomSource = Math.random;

export function setRandomSource(fn) {
    randomSource = typeof fn === "function" ? fn : Math.random;
}

export function rand(min, max) {
    return min + randomSource() * (max - min);
}

export function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

export function pick(list) {
    return list[Math.floor(randomSource() * list.length)];
}
