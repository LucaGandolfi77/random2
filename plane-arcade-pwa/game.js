/*
 * Plane Arcade PWA — portrait neon shoot-'em-up
 * Visual language adapted from plane-pwa (MIT).
 */
(function () {
    "use strict";

    /* ===== Config ===== */
    const W = 400;
    const H = 600;
    const STEP = 1 / 60;
    const STORAGE_KEY = "plane-arcade-pwa";
    const STORAGE_VERSION = 2;
    const SLUG = "plane-arcade-pwa/";

    const config = {
        width: W,
        height: H,
        step: STEP,
        maxDt: 0.1,
        player: { x: 200, y: 500, r: 6, w: 20, h: 12, minX: 20, maxX: 380, minY: 300, maxY: 560, keySpeed: 260 },
        bullet: { speed: 540, r: 3, life: 1.5 },
        enemyBullet: { r: 3, life: 6 },
        fireInterval: 0.18,
        rapidInterval: 0.11,
        maxBullets: 24,
        maxEnemyBullets: 60,
        maxEnemies: 14,
        powerup: { dropChance: 0.12, vy: 65, r: 7, life: 12 },
        comboWindow: 2.5,
        comboStep: 8,
        comboMax: 4,
        invulnTime: 1.8,
        shieldInvuln: 1.2,
        lives: 3,
        bombs: 2,
        maxBombs: 3,
        // Enemy unlock waves
        enemyUnlocks: {
            drifter: 1, weaver: 2, diver: 2, gunner: 4,
            stalker: 3, splitter: 5, minesweeper: 6, sniper: 7,
            carrier: 8, phase: 9, ram: 10, turret: 12
        },
        // Boss variants per sector
        bossVariants: ["swarm", "artillery", "mirror"],
        // Elite/Champion settings
        eliteBaseChance: 0.10,
        eliteWaveBonus: 0.02,
        eliteNgPlusBonus: 0.05,
        maxElites: 3,
        // Formation settings
        formationChance: 0.25,
        formationTypes: ["v", "circle", "wall", "spiral", "cross"],
        // Wingman evolution level
        wingmanEvolutionLevel: 3,
    };

    /* ===== Power-up & Ability Definitions ===== */
    const POWERUP_DEFS = {
        spread: { label: "SPREAD", key: "S", color: "powerup", duration: 8, icon: "spread" },
        rapid: { label: "RAPID", key: "R", color: "powerup", duration: 8, icon: "rapid" },
        shield: { label: "SHIELD", key: "H", color: "powerup", duration: 0, icon: "shield" },
        bomb: { label: "BOMB", key: "B", color: "powerup", duration: 0, icon: "bomb" },
        pierce: { label: "PIERCE", key: "P", color: "neon", duration: 10, icon: "pierce" },
        homing: { label: "HOMING", key: "H", color: "neon", duration: 10, icon: "homing" },
        multishot: { label: "MULTI", key: "M", color: "neon", duration: 10, icon: "multishot" },
        laser: { label: "LASER", key: "L", color: "accent", duration: 10, icon: "laser" },
        overdrive: { label: "OVERDRIVE", key: "O", color: "accent", duration: 10, icon: "overdrive" },
        timeDilation: { label: "TIME", key: "T", color: "powerup", duration: 10, icon: "time" },
        magnet: { label: "MAGNET", key: "G", color: "powerup", duration: 12, icon: "magnet" },
        scrap: { label: "SCRAP", key: "C", color: "accent", duration: 12, icon: "scrap" },
    };

    const ABILITY_DEFS = {
        wingman: { name: "WINGMAN", desc: "Drone orbits and fires", cost: 50, icon: "wingman", unlockMedal: "firstAlly" },
        autoBomb: { name: "AUTO-BOMB", desc: "Auto-bomb at 1 life", cost: 75, icon: "autoBomb", unlockMedal: "survivor" },
        vampire: { name: "VAMPIRE", desc: "5% heal on kill (1/run)", cost: 100, icon: "vampire", unlockMedal: "bloodletter" },
        overcharge: { name: "OVERCHARGE", desc: "Bomb -> Overdrive", cost: 75, icon: "overcharge", unlockMedal: "speedDemon" },
        phaseShift: { name: "PHASE SHIFT", desc: "Double-tap -> 1s invuln (30s CD)", cost: 100, icon: "phaseShift", unlockMedal: "ghost" },
        recall: { name: "RECALL", desc: "Hold bomb -> pull power-ups", cost: 50, icon: "recall", unlockMedal: "collector" },
    };

    const WINGMAN_DEFS = {
        gunner: { name: "GUNNER", desc: "Orbits, fires straight", fireInterval: 1.2, bulletSpeed: 480, color: "bullet", icon: "gunner" },
        sniper: { name: "SNIPER", desc: "Orbits, aims at nearest", fireInterval: 1.8, bulletSpeed: 520, color: "neon", icon: "sniper" },
        shield: { name: "SHIELD DRONE", desc: "Projects shield arc", fireInterval: 0, bulletSpeed: 0, color: "powerup", icon: "shieldDrone" },
        magnet: { name: "MAGNET DRONE", desc: "Widens pickup radius", fireInterval: 0, bulletSpeed: 0, color: "neon", icon: "magnetDrone" },
        bomber: { name: "BOMBER", desc: "Drops micro-bomb on kill", fireInterval: 0, bulletSpeed: 0, color: "accent", icon: "bomber" },
    };

    const MEDAL_DEFS = {
        // Combat
        firstBlood: { name: "FIRST BLOOD", desc: "Get your first kill", cat: "combat", tier: 1 },
        centurion: { name: "CENTURION", desc: "100 total kills", cat: "combat", tier: 1, req: { kills: 100 } },
        annihilator: { name: "ANNIHILATOR", desc: "1000 total kills", cat: "combat", tier: 2, req: { kills: 1000 } },
        bossSlayer: { name: "BOSS SLAYER", desc: "Defeat 10 bosses", cat: "combat", tier: 1, req: { bosses: 10 } },
        perfectWave: { name: "PERFECT WAVE", desc: "Clear a wave without being hit", cat: "combat", tier: 1 },
        comboMaster: { name: "COMBO MASTER", desc: "Reach x4 combo 10 times", cat: "combat", tier: 2, req: { combo4: 10 } },
        // Survival
        phoenix: { name: "PHOENIX", desc: "Die and continue", cat: "survival", tier: 1 },
        ironWill: { name: "IRON WILL", desc: "Reach wave 25", cat: "survival", tier: 1, req: { wave: 25 } },
        immortal: { name: "IMMORTAL", desc: "Reach wave 50", cat: "survival", tier: 2, req: { wave: 50 } },
        pacifist: { name: "PACIFIST", desc: "Clear wave 5 without killing", cat: "survival", tier: 1 },
        shieldBearer: { name: "SHIELD BEARER", desc: "Absorb 50 hits with shield", cat: "survival", tier: 2, req: { shieldHits: 50 } },
        // Collection
        hoarder: { name: "HOARDER", desc: "Collect 50 power-ups", cat: "collection", tier: 1, req: { powerups: 50 } },
        magnetMedal: { name: "MAGNET", desc: "Collect 20 power-ups in one run", cat: "collection", tier: 1 },
        alchemist: { name: "ALCHEMIST", desc: "Collect every type in one run", cat: "collection", tier: 2 },
        // Skill
        sniperMedal: { name: "SNIPER", desc: "20 aimed kills (gunner/sniper)", cat: "skill", tier: 1, req: { aimedKills: 20 } },
        speedrun: { name: "SPEEDRUN", desc: "Reach wave 10 under 3 minutes", cat: "skill", tier: 1 },
        noBombRun: { name: "NO-BOMB RUN", desc: "Reach wave 20 without using a bomb", cat: "skill", tier: 2 },
        oneLifeWonder: { name: "ONE-LIFE WONDER", desc: "Reach wave 15 on 1 life", cat: "skill", tier: 2 },
        // Social
        dailyStreak7: { name: "DAILY STREAK", desc: "7 day daily streak", cat: "social", tier: 1, req: { dailyStreak: 7 } },
        dailyStreak30: { name: "DEDICATED", desc: "30 day daily streak", cat: "social", tier: 2, req: { dailyStreak: 30 } },
        weeklyTop10: { name: "WEEKLY CHAMP", desc: "Top 10 in weekly challenge", cat: "social", tier: 1 },
        challengeChamp: { name: "CHALLENGE CHAMP", desc: "Win a weekly challenge", cat: "social", tier: 2 },
        // Unlock medals (hidden)
        firstAlly: { name: "FIRST ALLY", desc: "Unlock wingman slot", cat: "unlock", hidden: true, unlockAbility: "wingman", unlockWingman: "gunner" },
        survivor: { name: "SURVIVOR", desc: "Survive a close call", cat: "unlock", hidden: true, unlockAbility: "autoBomb" },
        bloodletter: { name: "BLOODLETTER", desc: "Heal from kills", cat: "unlock", hidden: true, unlockAbility: "vampire" },
        speedDemon: { name: "SPEED DEMON", desc: "Master of speed", cat: "unlock", hidden: true, unlockAbility: "overcharge" },
        ghost: { name: "GHOST", desc: "Phase through danger", cat: "unlock", hidden: true, unlockAbility: "phaseShift" },
        collector: { name: "COLLECTOR", desc: "Master of collection", cat: "unlock", hidden: true, unlockAbility: "recall", unlockWingman: "magnet" },
    };

    const MISSION_DEFS = {
        daily: [
            { id: "daily_kills", name: "Hunter", desc: "Kill 50 enemies", target: 50, stat: "kills", reward: 10 },
            { id: "daily_spread", name: "Spreader", desc: "Kill 30 with Spread active", target: 30, stat: "spreadKills", reward: 15 },
            { id: "daily_powerups", name: "Collector", desc: "Collect 10 power-ups", target: 10, stat: "powerups", reward: 10 },
            { id: "daily_bosses", name: "Boss Hunter", desc: "Defeat 3 bosses", target: 3, stat: "bosses", reward: 20 },
            { id: "daily_noHit", name: "Untouchable", desc: "Clear 5 waves no hit", target: 5, stat: "noHitWaves", reward: 15 },
            { id: "daily_wave", name: "Progress", desc: "Reach wave 15", target: 15, stat: "wave", reward: 10 },
            { id: "daily_combo", name: "Chain Reaction", desc: "Reach x4 combo 3 times", target: 3, stat: "combo4", reward: 15 },
        ],
        career: [
            { id: "career_kills", name: "Kill Count", desc: "Total enemies destroyed", tiers: [100, 500, 2000, 10000], stat: "kills", rewards: [25, 50, 100, 200] },
            { id: "career_waves", name: "Wave Rider", desc: "Waves cleared", tiers: [10, 25, 50, 100], stat: "waves", rewards: [25, 50, 100, 200] },
            { id: "career_bosses", name: "Boss Slayer", desc: "Bosses defeated", tiers: [1, 5, 15, 40], stat: "bosses", rewards: [25, 50, 100, 200] },
            { id: "career_powerups", name: "Power Collector", desc: "Power-ups collected", tiers: [20, 100, 500], stat: "powerups", rewards: [25, 50, 100] },
            { id: "career_distance", name: "Distance", desc: "Distance flown (px)", tiers: [50000, 250000, 1000000], stat: "distance", rewards: [25, 50, 100] },
            { id: "career_noHit", name: "Perfectionist", desc: "No-hit waves", tiers: [1, 3, 10], stat: "noHitWaves", rewards: [25, 50, 100] },
        ],
        weekly: { name: "Weekly Challenge", desc: "Fixed seed challenge", reward: 100 },
    };

    const SECTOR_DEFS = [
        { id: "neonCore", name: "NEON CORE", waves: "1-20", theme: "neon", unlocks: ["wingmanSlot1", "themeRetro"] },
        { id: "retroGrid", name: "RETRO GRID", waves: "21-40", theme: "retro", unlocks: ["abilitySlot1", "themeForest"] },
        { id: "forestDeep", name: "FOREST DEEP", waves: "41-60", theme: "forest", unlocks: ["wingmanSlot2", "themeOcean"] },
        { id: "oceanTrench", name: "OCEAN TRENCH", waves: "61-80", theme: "ocean", unlocks: ["abilitySlot2", "themeVoid"] },
        { id: "void", name: "VOID", waves: "81-100", theme: "neon", unlocks: ["ngPlus", "rainbowTheme"] },
    ];

    /* ===== Elite & Formation Systems ===== */
    const ELITE_MODIFIERS = {
        shielded: { name: "SHIELD", color: "powerup", chance: 0.08, effect: "absorbs 3 hits, then recharges after 5s", icon: "shield" },
        volatile: { name: "VOLATILE", color: "accent", chance: 0.06, effect: "on death explodes into 6 homing bullets", icon: "explosion" },
        teleporter: { name: "TELEPORTER", color: "neon", chance: 0.05, effect: "short-range blink on low HP", icon: "arrow-right" },
        spawner: { name: "SPAWNER", color: "neon", chance: 0.04, effect: "on death spawns 2 mini-enemies", icon: "plus" },
        mirror: { name: "MIRROR", color: "powerup", chance: 0.03, effect: "copies player movement and firing", icon: "sync" },
        juggernaut: { name: "JUGGERNAUT", color: "border", chance: 0.02, effect: "2× HP, 30% slower, deals contact damage", icon: "diamond" },
    };

    const FORMATION_DEFS = {
        v: { name: "V-FORMATION", shape: "V", spacing: 20, color: "neon" },
        circle: { name: "CIRCLE", shape: "circle", radius: 30, speed: 40, color: "accent" },
        wall: { name: "WALL", shape: "wall", length: 100, height: 20, speed: 30, color: "border" },
        spiral: { name: "SPIRAL", shape: "spiral", rotation: 1.5, spacing: 15, color: "powerup" },
        cross: { name: "CROSS", shape: "cross", armLen: 40, color: "neon" },
    };

    const POWERUP_COMBOS = {
        pierceHoming: { name: "SEEKING PIERCE", desc: "Bullets pierce AND homing", duration: 8, color: "neon" },
        laserOverdrive: { name: "SUSTAINED BEAM", desc: "Laser while Overdrive active", duration: 3, color: "accent" },
        timeMagnet: { name: "STASIS FIELD", desc: "Time Dilation + Magnet combo", duration: 5, color: "powerup" },
        spreadOverdrive: { name: "RAPID SPREAD", desc: "Multishot + 2× fire rate", duration: 8, color: "neon" },
    };

    const WINGMAN_EVOLUTIONS = {
        gunner: { level1: "Orbits, fires straight", level2: "Heavy: +50% damage", level3: "Spread: 3-way burst", level3Icon: "spread" },
        sniper: { level1: "Orbits, aims at nearest", level2: "Seeking: bullets lead target", level3: "Burst: 3 rapid shots", level3Icon: "rapid" },
        shield: { level1: "Projects shield arc", level2: "Reflect: 20% chance to reflect bullets", level3: "Absorb: converts damage to score", level3Icon: "shield" },
        magnet: { level1: "Widens pickup radius", level2: "Vacuum: pulls all nearby items", level3: "Share: shares with nearby players", level3Icon: "magnet" },
        bomber: { level1: "Drops micro-bomb on kill", level2: "Cluster: 3 micro-bombs per kill", level3: "Napalm: damage over time", level3Icon: "bomb" },
    };

    const RELIC_DEFS = {
        glassCannon: { name: "GLASS CANNON", desc: "×1.5 fire rate, -50% HP (1/run)", rarity: "rare", icon: "⚡" },
        vampiresKiss: { name: "VAMPIRE'S KISS", desc: "5% HP on kill, stacks to 15%", rarity: "rare", icon: "🩸" },
        kineticCapacitor: { name: "KINETIC CAPACITOR", desc: "Bullets have 2× piercing", rarity: "epic", icon: "🔋" },
        phaseAnchor: { name: "PHASE ANCHOR", desc: "15% chance to become invulnerable on hit", rarity: "epic", icon: "👻" },
        scrapMagnet: { name: "SCRAP MAGNET", desc: "Auto-collect 30% farther", rarity: "common", icon: "🧲" },
        mirrorShield: { name: "MIRROR SHIELD", desc: "Reflects 15% of damage back", rarity: "legendary", icon: "🪞" },
        voidWalker: { name: "VOID WALKER", desc: "10% chance to phase through bullets", rarity: "legendary", icon: "⚪" },
        celestialGuard: { name: "CELESTIAL GUARD", desc: "+1 max life, -10% fire rate", rarity: "rare", icon: "⛓️" },
    };

    const PET_DEFS = {
        droneCat: { name: "DRONE CAT", desc: "Follows player, occasional bomb assist", icon: "🐈", ability: "bombAssist" },
        voidJelly: { name: "VOID JELLY", desc: "Creates slow field around player", icon: "🌀", ability: "slowField" },
        scrapBot: { name: "SCRAP BOT", desc: "Auto-collects power-ups", icon: "🤖", ability: "autoCollect" },
        neonFish: { name: "NEON FISH", desc: "Swims around player, aesthetic", icon: "🐟", ability: "none" },
        pixelBird: { name: "PIXEL BIRD", desc: "Flies alongside, minor speed boost", icon: "🐦", ability: "speedBoost" },
    };

    const SKIN_DEFS = {
        neonCore: { name: "NEON CORE", pattern: "neon", unlock: "sector1" },
        retroGrid: { name: "RETRO GRID", pattern: "retro", unlock: "sector2" },
        forestDeep: { name: "FOREST DEEP", pattern: "forest", unlock: "sector3" },
        oceanTrench: { name: "OCEAN TRENCH", pattern: "ocean", unlock: "sector4" },
        void: { name: "VOID", pattern: "void", unlock: "sector5" },
        prestige1: { name: "PRESTIGE I", pattern: "gold", unlock: "ng+1" },
        prestige2: { name: "PRESTIGE II", pattern: "gold", unlock: "ng+2" },
        prestige3: { name: "PRESTIGE III", pattern: "gold", unlock: "ng+3" },
        weeklyChampion: { name: "WEEKLY CHAMPION", pattern: "rainbow", unlock: "weekly win" },
        firstBlood: { name: "FIRST BLOOD", pattern: "crimson", unlock: "first kill" },
        pacifist: { name: "PACIFIST", pattern: "blue", unlock: "no-hit wave 5" },
    };

    const TRAIL_DEFS = {
        neon: { name: "NEON", color: "#ffaa00", glow: true },
        pixel: { name: "PIXEL", color: "#f0f0f0", glow: false },
        fire: { name: "FIRE", color: "#ff6600", glow: true },
        void: { name: "VOID", color: "#0a0a1a", glow: false },
        ice: { name: "ICE", color: "#00ffff", glow: true },
        toxic: { name: "TOXIC", color: "#99ff99", glow: true },
        rainbow: { name: "RAINBOW", color: "gradient", glow: true },
        ghost: { name: "GHOST", color: "#ffffff", opacity: 0.5, glow: false },
        laser: { name: "LASER", color: "#ffff00", glow: true },
        spark: { name: "SPARK", color: "#ffd700", glow: true },
        ink: { name: "INK", color: "#ff00ff", glow: true },
        gold: { name: "GOLD", color: "#ffd700", glow: true },
    };

    const TITLE_DEFS = {
        firstBlood: { name: "FIRST BLOOD", req: { kills: 1 } },
        centurion: { name: "CENTURION", req: { kills: 100 } },
        annihilator: { name: "ANNIHILATOR", req: { kills: 1000 } },
        bossSlayer: { name: "BOSS SLAYER", req: { bosses: 10 } },
        perfectWave: { name: "PERFECT WAVE", req: { noHitThisWave: true, wave: 5 } },
        comboMaster: { name: "COMBO MASTER", req: { combo4: 10 } },
        phoenix: { name: "PHOENIX", req: { diedAndContinued: 1 } },
        ironWill: { name: "IRON WILL", req: { wave: 25 } },
        immortal: { name: "IMMORTAL", req: { wave: 50 } },
        pacifist: { name: "PACIFIST", req: { wave: 5, kills: 0 } },
        hoarder: { name: "HOARDER", req: { powerups: 50 } },
        magnetMedal: { name: "MAGNET", req: { powerups: 20 } },
        alchemist: { name: "ALCHEMIST", req: { powerupTypes: 8 } },
        sniperMedal: { name: "SNIPER", req: { aimedKills: 20 } },
        speedrun: { name: "SPEEDRUN", req: { wave: 10, time: "<180000" } },
        noBombRun: { name: "NO-BOMB RUN", req: { wave: 20, bombUsed: 0 } },
        oneLifeWonder: { name: "ONE-LIFE WONDER", req: { wave: 15, lives: 1 } },
        dailyStreak7: { name: "DAILY STREAK", req: { dailyStreak: 7 } },
        dailyStreak30: { name: "DEDICATED", req: { dailyStreak: 30 } },
        weeklyTop10: { name: "WEEKLY TOP 10", req: { weeklyScore: "top10" } },
        challengeChamp: { name: "CHALLENGE CHAMP", req: { weeklyWin: true } },
        firstAlly: { name: "FIRST ALLY", req: { wingmanUnlocked: "gunner" } },
        survivor: { name: "SURVIVOR", req: { autoBombUnlocked: true } },
        bloodletter: { name: "BLOODLETTER", req: { vampireUnlocked: true } },
        speedDemon: { name: "SPEED DEMON", req: { overchargeUnlocked: true } },
        ghost: { name: "GHOST", req: { phaseShiftUnlocked: true } },
        collector: { name: "COLLECTOR", req: { recallUnlocked: true } },
    };

    const MODE_DEFS = {
        normal: { name: "NORMAL", desc: "Standard gameplay", icon: "🎮" },
        bossRush: { name: "BOSS RUSH", desc: "5/10/15 boss gauntlet", icon: "👑" },
        endless: { name: "ENDLESS", desc: "Scaling waves, separate high score", icon: "↗" },
        gauntlet: { name: "ONE-LIFE GAUNTLET", desc: "50 waves, 1 life, no power-ups", icon: "⚔" },
        dailyDungeon: { name: "DAILY DUNGEON", desc: "Fixed seed 10 waves + modifier", icon: "📅" },
    };

    /* ===== Visual themes (same palette as plane-pwa) ===== */
    const THEMES = {
        neon: {
            label: "Neon", bg: "#0a0a1a", grid: "#1a1a2a", plane: "#ffaa00", planeGrad: "#cc8800",
            bullet: "#ffffff", enemy: "#ff3300", powerup: "#00ffff", text: "#f0f0f0",
            neon: "#ffaa00", accent: "#ff6600", panel: "#1a0a00", border: "#ffaa00",
            shadow: "rgba(255,170,0,0.5)",
        },
        retro: {
            label: "Retro", bg: "#000000", grid: "#111111", plane: "#00ffff", planeGrad: "#00ccff",
            bullet: "#ffff00", enemy: "#ff00ff", powerup: "#ff6600", text: "#f0f0f0",
            neon: "#00ffff", accent: "#00ccff", panel: "#001018", border: "#00ffff",
            shadow: "rgba(0,255,255,0.5)",
        },
        forest: {
            label: "Forest", bg: "#0a1a00", grid: "#112200", plane: "#00ff44", planeGrad: "#00cc33",
            bullet: "#ffffff", enemy: "#ffaa00", powerup: "#ff00aa", text: "#f0f0f0",
            neon: "#00ff44", accent: "#00cc33", panel: "#071400", border: "#00ff44",
            shadow: "rgba(0,255,68,0.4)",
        },
        ocean: {
            label: "Ocean", bg: "#0a0a1a", grid: "#12122a", plane: "#00aaff", planeGrad: "#0088cc",
            bullet: "#ff6600", enemy: "#ff00aa", powerup: "#00ffcc", text: "#f0f0f0",
            neon: "#00aaff", accent: "#0088cc", panel: "#00101a", border: "#00aaff",
            shadow: "rgba(0,170,255,0.5)",
        },
    };

    const POWER_LABELS = { spread: "S", rapid: "R", shield: "H", bomb: "B" };
    const POWER_NAMES = { spread: "SPREAD", rapid: "RAPID", shield: "SHIELD", bomb: "BOMB" };
    const SOUND_KEYS = ["shoot", "hit", "enemyShoot", "explosion", "powerup", "gameOver", "bomb", "wave"];

    /* ===== State ===== */
    const state = {
        mode: "menu",
        plane: { x: config.player.x, y: config.player.y },
        keys: Object.create(null),
        pointer: { active: false, id: null, ax: 0, ay: 0, px: 0, py: 0, x: 0, y: 0 },
        bullets: [],
        enemyBullets: [],
        enemies: [],
        powerups: [],
        floaters: [],
        wingmen: [],
        mines: [],
        laserActive: false,
        laserTimer: 0,
        laserTarget: null,
        score: 0,
        highScore: 0,
        bestWave: 0,
        wave: 1,
        lives: config.lives,
        bombs: config.bombs,
        combo: 0,
        comboTimer: 0,
        combo4Count: 0,
        invuln: 0,
        shield: false,
        spreadTime: 0,
        rapidTime: 0,
        pierceTime: 0,
        homingTime: 0,
        multishotTime: 0,
        laserTime: 0,
        overdriveTime: 0,
        timeDilationTime: 0,
        magnetTime: 0,
        scrapTime: 0,
        fireCooldown: 0,
        exhaustTimer: 0,
        wavePhase: "banner",
        waveTimer: 0,
        waveElapsed: 0,
        waveSpawnLeft: 0,
        spawnTimer: 0,
        waveBanner: "",
        waveSub: "",
        boss: null,
        bossVariant: "",
        gridScroll: 0,
        shake: 0,
        flash: 0,
        timeDilation: 1,
        toastTimer: 0,
        dbgTimer: 0,
        hudTimer: 0,
        tutorialSeen: false,
        muted: false,
        theme: "neon",
        installDismissed: false,
        deferredPrompt: null,
        runStart: 0,
        runRecorded: false,
        newHighScore: false,
        time: 0,
        fps: 60,
        lastTimestamp: 0,
        lastTapTime: 0,
        tapCount: 0,
        bombHoldTimer: 0,
        accumulator: 0,
        raf: 0,
        dpr: 1,
        debug: false,
        god: false,
        reduceMotion: false,
        // Career / persistent
        career: {
            kills: 0, waves: 0, bosses: 0, powerups: 0, distance: 0, noHitWaves: 0,
            tokens: 0, medals: {}, abilities: {}, wingmen: {},
            sector: 0, ngPlus: 0, dailyStreak: 0, lastDaily: 0,
            spreadKills: 0, aimedKills: 0, shieldHits: 0, combo4: 0, noBombWave: 0,
        },
        // Run-specific
        equippedAbilities: [],
        equippedWingmen: [],
        missionProgress: { daily: {}, career: {}, weekly: {} },
        dailyMission: null,
        weeklySeed: 0,
        noHitThisWave: true,
        bombUsedThisRun: false,
        powerupTypesCollected: {},
        vampireUsed: false,
        phaseShiftCD: 0,
        recallActive: false,
    };

    /* ===== Shared arcade helpers ===== */
    const Arcade = (typeof R2 !== "undefined") ? R2 : null;

    const Sound = (function () {
        const fallback = {};
        SOUND_KEYS.forEach(function (key) { fallback[key] = function () {}; });
        if (!Arcade || typeof Arcade.makeSound !== "function") return fallback;
        try {
            return Arcade.makeSound({
                shoot: [680, 0.04, "square"],
                hit: [190, 0.16, "sawtooth"],
                enemyShoot: [300, 0.05, "triangle"],
                explosion: [110, 0.22, "sawtooth"],
                powerup: [1320, 0.18, "sine"],
                gameOver: [140, 0.5, "sine"],
                bomb: [85, 0.38, "sawtooth"],
                wave: [880, 0.12, "triangle"],
            });
        } catch (err) {
            return fallback;
        }
    })();

    const Particles = (function () {
        if (Arcade && typeof Arcade.makeParticles === "function") {
            try { return Arcade.makeParticles(); } catch (err) { /* fall through */ }
        }
        const parts = [];
        return {
            spawn: function (x, y, color, count) {
                count = count || 8;
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = rand(18, 130);
                    const life = rand(0.22, 0.72);
                    parts.push({
                        x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: life, max: life, color: color, size: rand(1, 3),
                    });
                }
            },
            update: function (dt) {
                for (let i = parts.length - 1; i >= 0; i--) {
                    const p = parts[i];
                    p.life -= dt;
                    if (p.life <= 0) { parts.splice(i, 1); continue; }
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.vx *= 0.97;
                    p.vy = p.vy * 0.97 + 30 * dt;
                }
                if (parts.length > 220) parts.splice(0, parts.length - 220);
            },
            draw: function (ctx) {
                for (let i = 0; i < parts.length; i++) {
                    const p = parts[i];
                    ctx.globalAlpha = Math.max(0, p.life / p.max);
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            },
            clear: function () { parts.length = 0; },
        };
    })();

    /* ===== DOM ===== */
    const DOME = {};

    function cacheDom() {
        DOME.canvas = document.getElementById("game-canvas");
        DOME.ctx = DOME.canvas.getContext("2d");
        DOME.main = document.querySelector("main");
        DOME.score = document.getElementById("score");
        DOME.highScore = document.getElementById("high-score");
        DOME.wave = document.getElementById("wave");
        DOME.lives = document.getElementById("lives");
        DOME.pauseBtn = document.getElementById("pause-btn");
        DOME.muteBtn = document.getElementById("mute-btn");
        DOME.bombBtn = document.getElementById("bomb-btn");
        DOME.bombCount = document.getElementById("bomb-count");
        DOME.powerStatus = document.getElementById("power-status");
        DOME.overlay = document.getElementById("overlay");
        DOME.overlayTitle = document.getElementById("overlay-title");
        DOME.overlayMsg = document.getElementById("overlay-msg");
        DOME.overlayStats = document.getElementById("overlay-stats");
        DOME.overlayBadge = document.getElementById("overlay-badge");
        DOME.overlayPlay = document.getElementById("overlay-play");
        DOME.overlayRestart = document.getElementById("overlay-restart");
        DOME.overlayWeekly = document.getElementById("overlay-weekly");
        DOME.overlayTheme = document.getElementById("overlay-theme");
        DOME.overlaySound = document.getElementById("overlay-sound");
        DOME.overlayHangar = document.getElementById("overlay-hangar");
        DOME.hangarClose = document.getElementById("hangar-close");
        DOME.finalScore = document.getElementById("final-score");
        DOME.finalHigh = document.getElementById("final-high");
        DOME.finalWave = document.getElementById("final-wave");
        DOME.installPrompt = document.getElementById("install-prompt");
        DOME.installBtn = document.getElementById("install-btn");
        DOME.installLater = document.getElementById("install-later");
        DOME.toast = document.getElementById("toast");
        DOME.debug = document.getElementById("debug");
        DOME.rotateHint = document.getElementById("rotate-hint");
    }

    /* ===== Helpers ===== */
    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
    function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
    function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

    function sfx(name) {
        if (state.muted) return;
        const fn = Sound[name];
        if (typeof fn === "function") {
            try { fn(); } catch (err) { /* ignore audio failures */ }
        }
    }

    function haptic(pattern) {
        if (state.muted || !Arcade || typeof Arcade.buzz !== "function") return;
        try { Arcade.buzz(pattern); } catch (err) { /* ignore */ }
    }

    /* ===== Storage ===== */
    function loadStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data && typeof data === "object") {
                state.highScore = Math.max(0, Number(data.highScore) || 0);
                state.bestWave = Math.max(0, Number(data.bestWave) || 0);
                state.theme = THEMES[data.theme] ? data.theme : "neon";
                state.muted = !!data.muted;
                state.tutorialSeen = !!data.tutorialSeen;
                state.installDismissed = !!data.installDismissed;

                const version = Number(data.version) || 1;
                if (version < STORAGE_VERSION) {
                    migrateStorage(data, version);
                } else {
                    // Load challenge archives
                    state.challengeArchives = data.challengeArchives || {};
                    state.challengeArchivesWeekly = data.challengeArchivesWeekly || {};
                    state.challengeArchivesGhosts = data.challengeArchivesGhosts || {};
                    // Load career progress
                    if (data.career) state.career = { ...state.career, ...data.career };
                    // Load equipped abilities/wingmen
                    if (data.equippedAbilities) state.equippedAbilities = data.equippedAbilities;
                    if (data.equippedWingmen) state.equippedWingmen = data.equippedWingmen;
                }
            }
        } catch (err) { /* private mode / bad JSON */ }
    }

    function migrateStorage(data, fromVersion) {
        if (fromVersion < 2) {
            state.career = {
                kills: data.totalKills || 0,
                waves: data.totalWaves || 0,
                bosses: data.totalBosses || 0,
                powerups: data.totalPowerups || 0,
                distance: 0,
                noHitWaves: 0,
                tokens: 0,
                medals: {},
                abilities: { wingman: true, autoBomb: true, vampire: true, overcharge: true, phaseShift: true, recall: true },
                wingmen: { gunner: true, sniper: true, shield: true, magnet: true, bomber: true },
                sector: 0, ngPlus: 0, dailyStreak: 0, lastDaily: 0,
                spreadKills: 0, aimedKills: 0, shieldHits: 0, combo4: 0, noBombWave: 0,
            };
            state.equippedAbilities = ["wingman", "autoBomb"];
            state.equippedWingmen = ["gunner", "sniper"];
        } else if (fromVersion < 3) {
            // Migrate from v2 to v3: add challenge archives structure
            state.challengeArchives = state.challengeArchives || {};
            state.challengeArchivesWeekly = state.challengeArchivesWeekly || {};
            state.challengeArchivesGhosts = state.challengeArchivesGhosts || {};
        }
    }

    function saveStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                version: STORAGE_VERSION,
                highScore: state.highScore,
                bestWave: state.bestWave,
                theme: state.theme,
                muted: state.muted,
                tutorialSeen: state.tutorialSeen,
                installDismissed: state.installDismissed,
                career: state.career,
                equippedAbilities: state.equippedAbilities,
                equippedWingmen: state.equippedWingmen,
                challengeArchives: state.challengeArchives,
                challengeArchivesWeekly: state.challengeArchivesWeekly,
                challengeArchivesGhosts: state.challengeArchivesGhosts,
            }));
        } catch (err) { /* ignore */ }
    }

    /* ===== Theme ===== */
    function applyTheme(name) {
        if (!THEMES[name]) name = "neon";
        state.theme = name;
        const t = THEMES[name];
        const root = document.documentElement;
        root.setAttribute("data-theme", name);
        root.style.setProperty("--bg", t.bg);
        root.style.setProperty("--grid", t.grid);
        root.style.setProperty("--neon", t.neon);
        root.style.setProperty("--accent", t.accent);
        root.style.setProperty("--text", t.text);
        root.style.setProperty("--panel", t.panel);
        root.style.setProperty("--border", t.border);
        root.style.setProperty("--shadow", t.shadow);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", t.neon);
        updateHUD();
    }

    function cycleTheme() {
        const names = Object.keys(THEMES);
        const index = names.indexOf(state.theme);
        applyTheme(names[(index + 1) % names.length]);
        saveStorage();
        sfx("wave");
    }

    /* ===== Canvas / viewport ===== */
    function setupCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        state.dpr = dpr;
        DOME.canvas.width = Math.round(W * dpr);
        DOME.canvas.height = Math.round(H * dpr);
    }

    function resizeCanvas() {
        const rect = DOME.main.getBoundingClientRect();
        const availW = Math.max(120, rect.width - 12);
        const availH = Math.max(180, rect.height - 12);
        let width = availW;
        let height = width * (H / W);
        if (height > availH) {
            height = availH;
            width = height * (W / H);
        }
        DOME.canvas.style.width = Math.floor(width) + "px";
        DOME.canvas.style.height = Math.floor(height) + "px";
        if (DOME.rotateHint) {
            const landscape = window.innerWidth > window.innerHeight && window.innerHeight < 560;
            DOME.rotateHint.classList.toggle("hidden", !landscape);
            if (landscape && state.mode === "playing") pauseGame(true);
        }
    }

    function pointFromEvent(event) {
        const rect = DOME.canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (W / rect.width),
            y: (event.clientY - rect.top) * (H / rect.height),
        };
    }

    /* ===== Input ===== */
    function onPointerDown(event) {
        if (state.mode !== "playing") return;
        if (state.pointer.active) return;
        event.preventDefault();
        try { DOME.canvas.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
        const now = Date.now();
        if (now - state.lastTapTime < 300) {
            state.tapCount += 1;
            if (state.tapCount >= 2) {
                tryPhaseShift();
                state.tapCount = 0;
            }
        } else {
            state.tapCount = 1;
        }
        state.lastTapTime = now;

        state.bombHoldTimer = 0;
        const point = pointFromEvent(event);
        state.pointer.active = true;
        state.pointer.id = event.pointerId;
        state.pointer.ax = point.x;
        state.pointer.ay = point.y;
        state.pointer.px = state.plane.x;
        state.pointer.py = state.plane.y;
        state.pointer.x = point.x;
        state.pointer.y = point.y;
    }

    function onPointerMove(event) {
        if (!state.pointer.active || event.pointerId !== state.pointer.id) return;
        event.preventDefault();
        const point = pointFromEvent(event);
        state.pointer.x = point.x;
        state.pointer.y = point.y;
        state.plane.x = clamp(state.pointer.px + (point.x - state.pointer.ax), config.player.minX, config.player.maxX);
        state.plane.y = clamp(state.pointer.py + (point.y - state.pointer.ay), config.player.minY, config.player.maxY);
    }

    function onPointerUp(event) {
        if (!state.pointer.active || event.pointerId !== state.pointer.id) return;
        if (state.bombHoldTimer > 500) {
            tryRecall();
        }
        state.pointer.active = false;
        state.pointer.id = null;
    }

    function onKeyDown(event) {
        const key = event.key;
        if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown" || key === " ") {
            event.preventDefault();
        }
        if (event.repeat) return;
        if (key === "m" || key === "M") { toggleMute(); return; }
        if (key === "p" || key === "P" || key === "Escape") {
            if (state.mode === "playing") pauseGame(false);
            else if (state.mode === "paused") resumeGame();
            return;
        }
        if (key === " " || key === "Enter") {
            if (state.mode === "menu" || state.mode === "gameover") { startGame(); return; }
            if (state.mode === "paused") { resumeGame(); return; }
            if (state.mode === "playing" && key === " ") { useBomb(); return; }
        }
        if (state.debug) {
            if (key === "g" || key === "G") { state.god = !state.god; showToast(state.god ? "GOD MODE ON" : "GOD MODE OFF", 1.5); return; }
            if (key === "n" || key === "N") {
                state.enemies.length = 0;
                state.wavePhase = "clear";
                state.waveTimer = 0.1;
                return;
            }
            if (key === "b" || key === "B") { state.bombs = Math.min(config.maxBombs, state.bombs + 1); updateHUD(); return; }
        }
        if (state.mode === "playing") state.keys[key] = true;
    }

    function onKeyUp(event) {
        state.keys[event.key] = false;
    }

    function setupInput() {
        DOME.canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
        DOME.canvas.addEventListener("pointermove", onPointerMove, { passive: false });
        DOME.canvas.addEventListener("pointerup", onPointerUp);
        DOME.canvas.addEventListener("pointercancel", onPointerUp);
        DOME.canvas.addEventListener("lostpointercapture", onPointerUp);
        DOME.canvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("resize", resizeCanvas);
        window.addEventListener("orientationchange", function () { setTimeout(resizeCanvas, 120); });
        if (window.visualViewport) window.visualViewport.addEventListener("resize", resizeCanvas);
        document.addEventListener("visibilitychange", function () {
            if (document.hidden) {
                if (state.mode === "playing") pauseGame(true);
                else stopLoop();
            } else if (state.mode !== "paused") {
                startLoop();
            }
        });
    }

    /* ===== Game loop ===== */
    function startLoop() {
        if (state.raf || document.hidden) return;
        state.lastTimestamp = 0;
        state.raf = requestAnimationFrame(loop);
    }

    function stopLoop() {
        if (state.raf) cancelAnimationFrame(state.raf);
        state.raf = 0;
    }

    function loop(timestamp) {
        state.raf = 0;
        if (state.mode === "paused" || document.hidden) return;
        if (!state.lastTimestamp) state.lastTimestamp = timestamp;
        let dt = (timestamp - state.lastTimestamp) / 1000;
        state.lastTimestamp = timestamp;
        if (!isFinite(dt) || dt < 0) dt = 0;
        dt = Math.min(dt, config.maxDt);
        if (dt > 0) state.fps = state.fps * 0.92 + (1 / dt) * 0.08;
        state.time += dt;
        if (state.mode === "playing") {
            state.accumulator += dt;
            let steps = 0;
            while (state.accumulator >= STEP && steps < 5) {
                update(STEP);
                state.accumulator -= STEP;
                steps += 1;
            }
            if (steps >= 5) state.accumulator = 0;
        } else {
            updateAmbient(dt);
        }
        Particles.update(dt);
        draw();
        state.raf = requestAnimationFrame(loop);
    }

    /* ===== Lifecycle ===== */
    function startGame() {
        resetGame();
        state.mode = "playing";
        state.runStart = Date.now();
        state.runRecorded = false;
        hideOverlay();
        DOME.installPrompt.classList.add("hidden");
        resizeCanvas();
        updateHUD();
        startLoop();
        if (!state.tutorialSeen) {
            showToast("DRAG TO FLY · AUTO-FIRE · GRAB S / R / H / B", 5);
            state.tutorialSeen = true;
            saveStorage();
        }
    }

    function resetGame() {
        state.plane.x = config.player.x;
        state.plane.y = config.player.y;
        state.keys = Object.create(null);
        state.pointer.active = false;
        state.pointer.id = null;
        state.bullets.length = 0;
        state.enemyBullets.length = 0;
        state.enemies.length = 0;
        state.powerups.length = 0;
        state.floaters.length = 0;
        state.wingmen.length = 0;
        state.mines.length = 0;
        state.laserActive = false;
        state.laserTimer = 0;
        state.laserTarget = null;
        state.score = 0;
        state.wave = 1;
        
        const ngPlus = state.career.ngPlus || 0;
        const ngPlusMult = 1 + ngPlus * 0.5;
        state.lives = config.lives + ngPlus;
        state.bombs = config.bombs + Math.floor(ngPlus / 2);
        state.combo = 0;
        state.comboTimer = 0;
        state.combo4Count = 0;
        state.invuln = 0;
        state.shield = false;
        state.spreadTime = 0;
        state.rapidTime = 0;
        state.pierceTime = 0;
        state.homingTime = 0;
        state.multishotTime = 0;
        state.laserTime = 0;
        state.overdriveTime = 0;
        state.timeDilationTime = 0;
        state.magnetTime = 0;
        state.scrapTime = 0;
        state.fireCooldown = 0;
        state.exhaustTimer = 0;
        state.boss = null;
        state.bossVariant = "";
        state.shake = 0;
        state.flash = 0;
        state.gridScroll = 0;
        state.timeDilation = 1;
        state.newHighScore = false;
        state.time = 0;
        state.lastTimestamp = 0;
        state.accumulator = 0;
        state.toastTimer = 0;
        state.noHitThisWave = true;
        state.bombUsedThisRun = false;
        state.powerupTypesCollected = {};
        state.vampireUsed = false;
        state.phaseShiftCD = 0;
        state.recallActive = false;
        DOME.toast.classList.add("hidden");
        Particles.clear();

        const maxAbilities = 2 + ngPlus;
        state.equippedAbilities = state.equippedAbilities.slice(0, maxAbilities);
        
        for (const id of state.equippedWingmen) {
            const def = WINGMAN_DEFS[id];
            if (def) {
                state.wingmen.push({ type: id, level: 1 + ngPlus, xp: 0, x: 0, y: 0, orbitAngle: 0, fireTimer: 0 });
            }
        }

        beginWave(1);
    }

    function pauseGame(auto) {
        if (state.mode !== "playing") return;
        state.mode = "paused";
        state.keys = Object.create(null);
        state.pointer.active = false;
        state.pointer.id = null;
        state.accumulator = 0;
        stopLoop();
        showPauseOverlay(auto);
        updateHUD();
    }

    function resumeGame() {
        if (state.mode !== "paused") return;
        state.mode = "playing";
        hideOverlay();
        state.lastTimestamp = 0;
        state.accumulator = 0;
        updateHUD();
        startLoop();
    }

    function gameOver() {
        if (state.mode === "gameover") return;
        state.mode = "gameover";
        state.keys = Object.create(null);
        state.pointer.active = false;
        state.pointer.id = null;
        state.shake = 14;
        state.flash = 0.5;
        const previousHigh = state.highScore;
        state.newHighScore = state.score > previousHigh;
        state.highScore = Math.max(previousHigh, state.score);
        state.bestWave = Math.max(state.bestWave, state.wave);
        
        if (state.wave >= 100 && state.career.ngPlus === 0) {
            triggerNewGamePlus();
        }
        
        saveStorage();
        recordRun("loss");
        Particles.spawn(state.plane.x, state.plane.y, THEMES[state.theme].enemy, 26);
        sfx("gameOver");
        haptic([60, 40, 90]);
        showGameOverOverlay();
        updateHUD();
        if (state.deferredPrompt && !state.installDismissed) {
            DOME.installPrompt.classList.remove("hidden");
        }
    }

    function triggerNewGamePlus() {
        state.career.ngPlus += 1;
        state.career.tokens += 500 * state.career.ngPlus;
        if (!state.career.medals.prestige) {
            state.career.medals.prestige = { unlockedAt: Date.now(), level: state.career.ngPlus };
        } else {
            state.career.medals.prestige.level = state.career.ngPlus;
        }
        showToast("NEW GAME + " + state.career.ngPlus + " UNLOCKED! +" + (500 * state.career.ngPlus) + " TOKENS", 5);
        sfx("wave");
        haptic([50, 30, 80, 60]);
    }

    function recordRun(outcome) {
        if (state.runRecorded) return;
        state.runRecorded = true;
        if (!Arcade || !Arcade.stats || typeof Arcade.stats.run !== "function") return;
        try {
            Arcade.stats.run({
                slug: SLUG,
                score: state.score,
                durMs: Date.now() - (state.runStart || Date.now()),
                wave: state.wave,
                outcome: outcome,
            });
        } catch (err) { /* ignore */ }
    }

    /* ===== Waves ===== */
    function beginWave(number) {
        state.wave = number;
        state.wavePhase = "banner";
        state.waveTimer = 1.8;
        state.waveElapsed = 0;
        state.spawnTimer = 0;
        state.boss = null;
        state.noHitThisWave = true;
        
        applySectorTheme(number);
        
        const isBoss = number % 5 === 0;
        if (isBoss) {
            state.waveSpawnLeft = 0;
            state.waveBanner = "WARNING";
            state.waveSub = "BOSS INCOMING";
        } else {
            state.waveSpawnLeft = Math.min(8 + number * 2, 26);
            state.waveBanner = "WAVE " + number;
            state.waveSub = "GET READY";
        }
        sfx("wave");
        updateHUD();
    }

    function updateWave(dt) {
        if (state.wavePhase === "banner") {
            state.waveTimer -= dt;
            if (state.waveTimer <= 0) {
                state.wavePhase = "active";
                if (state.wave % 5 === 0) spawnBoss();
                state.spawnTimer = 0.25;
            }
            return;
        }

        if (state.wavePhase === "active") {
            state.waveElapsed += dt;
            if (state.wave % 5 === 0) {
                if (!state.enemies.some(function (enemy) { return enemy.type === "boss"; })) completeWave();
                return;
            }
            if (state.waveElapsed > 45) {
                completeWave();
                return;
            }
            if (state.waveSpawnLeft > 0) {
                state.spawnTimer -= dt;
                if (state.spawnTimer <= 0) {
                    if (state.enemies.length < config.maxEnemies) {
                        spawnEnemy();
                        state.waveSpawnLeft -= 1;
                    }
                    state.spawnTimer = spawnInterval();
                }
            } else if (state.enemies.length === 0) {
                completeWave();
            }
            return;
        }

        if (state.wavePhase === "clear") {
            state.waveTimer -= dt;
            if (state.waveTimer <= 0) beginWave(state.wave + 1);
        }
    }

    function spawnInterval() {
        const base = Math.max(0.42, 1.05 - state.wave * 0.035);
        return base * rand(0.72, 1.3);
    }

    function completeWave() {
        if (state.mode !== "playing" || state.wavePhase !== "active") return;
        const bonus = 50 * state.wave;
        state.score += bonus;
        addFloater(W / 2, H * 0.46, "+" + bonus, THEMES[state.theme].neon);
        
        if (state.noHitThisWave) {
            state.career.noHitWaves += 1;
        }
        state.career.waves += 1;
        state.career.distance += (state.plane.y * 2) + (state.time * 50);

        const nextWave = state.wave + 1;
        const sectorChanged = checkSectorTransition(nextWave);
        
        state.wavePhase = "clear";
        state.waveTimer = sectorChanged ? 3.0 : 1.6;
        state.waveBanner = sectorChanged ? "SECTOR COMPLETE" : ("WAVE " + state.wave + " CLEAR");
        state.waveSub = sectorChanged ? "ENTERING " + getSectorName(nextWave).toUpperCase() : ("+" + bonus);
        sfx("wave");
        updateHUD();
    }

    function checkSectorTransition(wave) {
        const sectorBoundaries = [20, 40, 60, 80, 100];
        return sectorBoundaries.includes(wave - 1);
    }

    function getSectorName(wave) {
        if (wave <= 20) return "Neon Core";
        if (wave <= 40) return "Retro Grid";
        if (wave <= 60) return "Forest Deep";
        if (wave <= 80) return "Ocean Trench";
        return "Void";
    }

    function getSectorIndex(wave) {
        if (wave <= 20) return 0;
        if (wave <= 40) return 1;
        if (wave <= 60) return 2;
        if (wave <= 80) return 3;
        return 4;
    }

    function applySectorTheme(wave) {
        const sectorIdx = getSectorIndex(wave);
        const sector = SECTOR_DEFS[sectorIdx];
        if (sector && sector.theme !== state.theme) {
            applyTheme(sector.theme);
            for (const unlock of sector.unlocks) {
                if (unlock.startsWith("theme")) {
                    const themeName = unlock.replace("theme", "").toLowerCase();
                    if (THEMES[themeName]) {
                        // Theme unlocked - could add notification
                    }
                } else if (unlock === "wingmanSlot1" || unlock === "wingmanSlot2") {
                    // Wingman slot unlocked
                } else if (unlock === "abilitySlot1" || unlock === "abilitySlot2") {
                    // Ability slot unlocked
                } else if (unlock === "ngPlus") {
                    // NG+ unlocked
                } else if (unlock === "rainbowTheme") {
                    // Rainbow theme unlocked
                }
            }
        }
    }

    /* ===== Simulation ===== */
    function updateAmbient(dt) {
        state.gridScroll = (state.gridScroll + 16 * dt) % 20;
        state.shake = Math.max(0, state.shake - 55 * dt);
        state.flash = Math.max(0, state.flash - 2.8 * dt);
        updateFloaters(dt);
        updateToast(dt);
    }

    function update(dt) {
        updateAmbient(dt);
        updateTimers(dt);
        updatePlayer(dt);
        updateBullets(dt);
        updateEnemyBullets(dt);
        updateEnemies(dt);
        updateMines(dt);
        updateWingmen(dt);
        updatePowerups(dt);
        updateWave(dt);
        updateCollisions();
        updateMissions(dt);
    }

    function updateTimers(dt) {
        if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - dt);
        if (state.spreadTime > 0) state.spreadTime = Math.max(0, state.spreadTime - dt);
        if (state.rapidTime > 0) state.rapidTime = Math.max(0, state.rapidTime - dt);
        if (state.pierceTime > 0) state.pierceTime = Math.max(0, state.pierceTime - dt);
        if (state.homingTime > 0) state.homingTime = Math.max(0, state.homingTime - dt);
        if (state.multishotTime > 0) state.multishotTime = Math.max(0, state.multishotTime - dt);
        if (state.laserTime > 0) state.laserTime = Math.max(0, state.laserTime - dt);
        if (state.overdriveTime > 0) state.overdriveTime = Math.max(0, state.overdriveTime - dt);
        if (state.timeDilationTime > 0) {
            state.timeDilationTime = Math.max(0, state.timeDilationTime - dt);
            state.timeDilation = 0.4;
        } else {
            state.timeDilation = 1;
        }
        if (state.magnetTime > 0) state.magnetTime = Math.max(0, state.magnetTime - dt);
        if (state.scrapTime > 0) state.scrapTime = Math.max(0, state.scrapTime - dt);
        if (state.comboTimer > 0) {
            state.comboTimer -= dt;
            if (state.comboTimer <= 0) breakCombo();
        }
        if (state.phaseShiftCD > 0) state.phaseShiftCD = Math.max(0, state.phaseShiftCD - dt);
        state.hudTimer -= dt;
        if (state.hudTimer <= 0) {
            state.hudTimer = 0.14;
            updateHUD();
        }
        if (state.debug) {
            state.dbgTimer -= dt;
            if (state.dbgTimer <= 0) {
                state.dbgTimer = 0.25;
                DOME.debug.textContent =
                    "FPS " + Math.round(state.fps) +
                    "\nENEMIES " + state.enemies.length +
                    "\nBULLETS " + state.bullets.length + " / " + state.enemyBullets.length +
                    "\nWAVE " + state.wave + "  " + state.wavePhase +
                    "\nGOD " + (state.god ? "ON" : "OFF");
            }
        }
    }

    function updatePlayer(dt) {
        let kx = 0;
        let ky = 0;
        if (state.keys.ArrowLeft || state.keys.a || state.keys.A) kx -= 1;
        if (state.keys.ArrowRight || state.keys.d || state.keys.D) kx += 1;
        if (state.keys.ArrowUp || state.keys.w || state.keys.W) ky -= 1;
        if (state.keys.ArrowDown || state.keys.s || state.keys.S) ky += 1;
        if (kx !== 0 || ky !== 0) {
            const length = Math.hypot(kx, ky) || 1;
            const speed = config.player.keySpeed;
            state.plane.x = clamp(state.plane.x + (kx / length) * speed * dt, config.player.minX, config.player.maxX);
            state.plane.y = clamp(state.plane.y + (ky / length) * speed * dt, config.player.minY, config.player.maxY);
        }

        state.fireCooldown -= dt;
        const baseInterval = state.rapidTime > 0 ? config.rapidInterval : config.fireInterval;
        state.fireCooldown = state.overdriveTime > 0 ? baseInterval * 0.5 : baseInterval;
        if (state.fireCooldown <= 0) {
            shootPlayer();
        }

        state.exhaustTimer -= dt;
        if (state.exhaustTimer <= 0) {
            state.exhaustTimer = 0.09;
            Particles.spawn(state.plane.x + rand(-2, 2), state.plane.y + 13, THEMES[state.theme].plane, 1);
        }
    }

    function shootPlayer() {
        if (state.bullets.length >= config.maxBullets) return;
        const speed = config.bullet.speed;
        const baseBullet = { x: state.plane.x, y: state.plane.y - 12, vx: 0, vy: -speed, r: config.bullet.r, life: config.bullet.life };
        
        if (state.homingTime > 0) {
            baseBullet.homing = true;
            baseBullet.pierce = state.pierceTime > 0;
        } else if (state.pierceTime > 0) {
            baseBullet.pierce = true;
        }
        
        state.bullets.push(baseBullet);
        
        if (state.spreadTime > 0) {
            const angle = 0.2;
            if (state.bullets.length < config.maxBullets) {
                state.bullets.push({ ...baseBullet, x: state.plane.x, y: state.plane.y - 10, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed });
            }
            if (state.bullets.length < config.maxBullets) {
                state.bullets.push({ ...baseBullet, x: state.plane.x, y: state.plane.y - 10, vx: -Math.sin(angle) * speed, vy: -Math.cos(angle) * speed });
            }
        }
        
        if (state.multishotTime > 0) {
            const angles = [-0.35, 0.35];
            for (const angle of angles) {
                if (state.bullets.length >= config.maxBullets) break;
                state.bullets.push({ ...baseBullet, x: state.plane.x, y: state.plane.y - 10, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed });
            }
        }
        
        if (state.laserTime > 0 && !state.laserActive) {
            state.laserActive = true;
            state.laserTimer = 0.8;
        }
        
        sfx("shoot");
    }

    function updateBullets(dt) {
        for (let i = state.bullets.length - 1; i >= 0; i--) {
            const bullet = state.bullets[i];
            bullet.life -= dt;
            
            if (bullet.homing) {
                let closest = null;
                let closestDist = 999999;
                for (const enemy of state.enemies) {
                    if (enemy.type === "boss" || enemy.type === "drone") continue;
                    const d = dist2(bullet.x, bullet.y, enemy.x, enemy.y);
                    if (d < closestDist) {
                        closestDist = d;
                        closest = enemy;
                    }
                }
                if (closest) {
                    const angle = Math.atan2(closest.y - bullet.y, closest.x - bullet.x);
                    const turnRate = 5;
                    const currentAngle = Math.atan2(bullet.vy, bullet.vx);
                    let diff = angle - currentAngle;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    diff = clamp(diff, -turnRate * dt, turnRate * dt);
                    const newAngle = currentAngle + diff;
                    const speed = Math.hypot(bullet.vx, bullet.vy);
                    bullet.vx = Math.cos(newAngle) * speed;
                    bullet.vy = Math.sin(newAngle) * speed;
                }
            }
            
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;
            if (bullet.life <= 0 || bullet.x < -20 || bullet.x > W + 20 || bullet.y < -20 || bullet.y > H + 20) {
                state.bullets.splice(i, 1);
            }
        }
        
        if (state.laserActive) {
            state.laserTimer -= dt;
            if (state.laserTimer <= 0) {
                state.laserActive = false;
            } else {
                fireLaser();
            }
        }
    }

    function fireLaser() {
        if (state.enemyBullets.length > 0) return;
        const theme = THEMES[state.theme];
        state.laserTarget = null;
        let closest = null;
        let closestY = -999999;
        for (const enemy of state.enemies) {
            if (enemy.x > state.plane.x - 20 && enemy.x < state.plane.x + 20 && enemy.y < state.plane.y) {
                if (enemy.y > closestY) {
                    closestY = enemy.y;
                    closest = enemy;
                }
            }
        }
        state.laserTarget = closest;
        if (closest) {
            closest.hp -= 3;
            closest.hitFlash = 0.05;
            if (closest.hp <= 0) destroyEnemy(closest, true);
        }
        spawnParticles(state.plane.x, state.plane.y - 12, theme.bullet, 2);
    }

    function updateEnemyBullets(dt) {
        for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = state.enemyBullets[i];
            bullet.life -= dt;
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;
            if (bullet.life <= 0 || bullet.x < -30 || bullet.x > W + 30 || bullet.y < -30 || bullet.y > H + 30) {
                state.enemyBullets.splice(i, 1);
            }
        }
    }

    function addEnemyBullet(x, y, vx, vy) {
        if (state.enemyBullets.length >= config.maxEnemyBullets) return;
        state.enemyBullets.push({ x: x, y: y, vx: vx, vy: vy, r: config.enemyBullet.r, life: config.enemyBullet.life });
    }

    /* ===== Enemies ===== */
    function getAvailableEnemyTypes() {
        const types = [];
        for (const [type, unlockWave] of Object.entries(config.enemyUnlocks)) {
            if (state.wave >= unlockWave) types.push(type);
        }
        return types;
    }

    function pickEnemyType() {
        const available = getAvailableEnemyTypes();
        const roll = Math.random();
        const weights = {
            drifter: 1.0,
            weaver: state.wave >= 4 ? 0.8 : 0.3,
            diver: state.wave >= 4 ? 0.7 : 0.2,
            gunner: state.wave >= 6 ? 0.6 : 0.15,
            stalker: state.wave >= 5 ? 0.5 : 0.1,
            splitter: state.wave >= 7 ? 0.4 : 0.08,
            minesweeper: state.wave >= 8 ? 0.35 : 0.05,
            sniper: state.wave >= 9 ? 0.3 : 0.05,
            carrier: state.wave >= 10 ? 0.25 : 0.03,
            phase: state.wave >= 12 ? 0.2 : 0.03,
            ram: state.wave >= 14 ? 0.15 : 0.02,
            turret: state.wave >= 16 ? 0.15 : 0.02,
        };
        let total = 0;
        for (const t of available) total += weights[t] || 0.01;
        let r = roll * total;
        for (const t of available) {
            r -= weights[t] || 0.01;
            if (r <= 0) return t;
        }
        return "drifter";
    }

    function hpBonus() {
        const ngPlus = state.career.ngPlus || 0;
        const base = (state.wave >= 8 ? 1 : 0) + (state.wave >= 12 ? 1 : 0) + (state.wave >= 16 ? 1 : 0) + (state.wave >= 20 ? 1 : 0);
        return base + ngPlus;
    }

    function spawnEnemy() {
        const type = pickEnemyType();
        const ngPlus = state.career.ngPlus || 0;
        const ngPlusMult = 1 + ngPlus * 0.5;
        const scale = Math.min(3.0, (1 + (state.wave - 1) * 0.06) * ngPlusMult);
        const bonus = hpBonus();
        const enemy = { type: type, age: 0, hitFlash: 0, fireTimer: 0, pattern: 0 };

        if (type === "drifter") {
            enemy.x = rand(30, W - 30);
            enemy.y = -18;
            enemy.vx = rand(-26, 26);
            enemy.vy = (72 + state.wave * 3) * scale;
            enemy.r = 8;
            enemy.hp = Math.ceil((1 + bonus) * ngPlusMult);
            enemy.points = Math.round(10 * ngPlusMult);
        } else if (type === "weaver") {
            enemy.x = rand(70, W - 70);
            enemy.baseX = enemy.x;
            enemy.amp = rand(28, 58);
            enemy.freq = rand(1.3, 2.4);
            enemy.phase = rand(0, Math.PI * 2);
            enemy.y = -18;
            enemy.vy = (62 + state.wave * 2.5) * scale;
            enemy.r = 8;
            enemy.hp = Math.ceil((1 + bonus) * ngPlusMult);
            enemy.points = Math.round(20 * ngPlusMult);
        } else if (type === "diver") {
            enemy.x = rand(45, W - 45);
            enemy.y = -18;
            enemy.vx = 0;
            enemy.vy = (56 + state.wave * 2) * scale;
            enemy.r = 9;
            enemy.hp = Math.ceil((2 + bonus) * ngPlusMult);
            enemy.points = Math.round(30 * ngPlusMult);
        } else if (type === "gunner") {
            enemy.x = rand(65, W - 65);
            enemy.baseX = enemy.x;
            enemy.y = -26;
            enemy.vy = 55;
            enemy.targetY = rand(90, 225);
            enemy.r = 10;
            enemy.hp = Math.ceil((3 + bonus) * ngPlusMult);
            enemy.points = Math.round(40 * ngPlusMult);
            enemy.fireTimer = rand(0.6, 1.4);
        } else if (type === "stalker") {
            enemy.x = rand(50, W - 50);
            enemy.y = -18;
            enemy.vx = 0;
            enemy.vy = (50 + state.wave * 2) * scale;
            enemy.r = 9;
            enemy.hp = Math.ceil((2 + bonus) * ngPlusMult);
            enemy.points = Math.round(25 * ngPlusMult);
            enemy.accel = 120 * ngPlusMult;
        } else if (type === "splitter") {
            enemy.x = rand(60, W - 60);
            enemy.y = -18;
            enemy.vx = rand(-20, 20);
            enemy.vy = (68 + state.wave * 2.5) * scale;
            enemy.r = 10;
            enemy.hp = Math.ceil((3 + bonus) * ngPlusMult);
            enemy.points = Math.round(35 * ngPlusMult);
            enemy.splitCount = 2;
        } else if (type === "minesweeper") {
            enemy.x = rand(50, W - 50);
            enemy.y = -22;
            enemy.vx = rand(-18, 18);
            enemy.vy = (45 + state.wave * 1.8) * scale;
            enemy.r = 9;
            enemy.hp = Math.ceil((2 + bonus) * ngPlusMult);
            enemy.points = Math.round(30 * ngPlusMult);
            enemy.mineTimer = 1.5;
            enemy.maxMines = 3;
            enemy.minesLaid = 0;
        } else if (type === "sniper") {
            enemy.x = rand(80, W - 80);
            enemy.y = -30;
            enemy.vy = 35 * scale;
            enemy.r = 8;
            enemy.hp = Math.ceil((1 + bonus) * ngPlusMult);
            enemy.points = Math.round(40 * ngPlusMult);
            enemy.fireTimer = rand(1.0, 2.0);
            enemy.telegraphTimer = 0;
        } else if (type === "carrier") {
            enemy.x = rand(70, W - 70);
            enemy.y = -40;
            enemy.vy = (30 + state.wave * 1.2) * scale;
            enemy.r = 14;
            enemy.hp = Math.ceil((5 + bonus) * ngPlusMult);
            enemy.points = Math.round(60 * ngPlusMult);
            enemy.droneTimer = 0;
            enemy.dronesReleased = 0;
        } else if (type === "phase") {
            enemy.x = rand(50, W - 50);
            enemy.y = -18;
            enemy.vx = rand(-40, 40);
            enemy.vy = (75 + state.wave * 3) * scale;
            enemy.r = 9;
            enemy.hp = Math.ceil((3 + bonus) * ngPlusMult);
            enemy.points = Math.round(45 * ngPlusMult);
            enemy.phaseTimer = 0;
            enemy.phased = false;
        } else if (type === "ram") {
            const side = Math.random() < 0.5 ? -1 : 1;
            enemy.x = side === -1 ? -20 : W + 20;
            enemy.y = rand(100, H - 100);
            enemy.vx = 0;
            enemy.vy = 0;
            enemy.r = 10;
            enemy.hp = Math.ceil((1 + bonus) * ngPlusMult);
            enemy.points = Math.round(50 * ngPlusMult);
            enemy.ramState = "approach";
            enemy.ramSide = side;
            enemy.ramTimer = 0;
            enemy.telegraphing = false;
        } else if (type === "turret") {
            enemy.x = rand(100, W - 100);
            enemy.y = -30;
            enemy.vy = 20 * scale;
            enemy.targetY = rand(60, 180);
            enemy.r = 12;
            enemy.hp = Math.ceil((4 + bonus) * ngPlusMult);
            enemy.points = Math.round(55 * ngPlusMult);
            enemy.fireTimer = rand(0.8, 1.5);
            enemy.armor = true;
        }

        enemy.maxHp = enemy.hp;
        state.enemies.push(enemy);
    }

    function spawnBoss() {
        const tier = Math.floor(state.wave / 5);
        const hp = 80 + tier * 40;
        const boss = {
            type: "boss", x: W / 2, y: -60, targetY: 116, vx: 0, vy: 0,
            r: 36, hp: hp, maxHp: hp, points: 500,
            age: 0, hitFlash: 0, fireTimer: 1.2, pattern: 0,
        };
        state.enemies.push(boss);
        state.boss = boss;
        sfx("wave");
        haptic(40);
    }

    function spawnSplitters(parent) {
        for (let i = 0; i < (parent.splitCount || 2); i++) {
            if (state.enemies.length >= config.maxEnemies) break;
            const angle = (Math.PI * 2 * i) / (parent.splitCount || 2);
            state.enemies.push({
                type: "drifter", x: parent.x, y: parent.y,
                vx: Math.cos(angle) * 80, vy: Math.sin(angle) * 80,
                r: 5, hp: 1, maxHp: 1, points: 5,
                age: 0, hitFlash: 0, fireTimer: 0, pattern: 0, isSplitter: true,
            });
        }
    }

    function updateEnemies(dt) {
        const effectiveDt = dt * state.timeDilation;
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const enemy = state.enemies[i];
            enemy.age += effectiveDt;
            if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - effectiveDt);

            if (enemy.type === "drifter") {
                enemy.x += enemy.vx * effectiveDt;
                enemy.y += enemy.vy * effectiveDt;
            } else if (enemy.type === "weaver") {
                enemy.y += enemy.vy * effectiveDt;
                enemy.x = enemy.baseX + Math.sin(enemy.age * enemy.freq + enemy.phase) * enemy.amp;
            } else if (enemy.type === "diver") {
                enemy.y += enemy.vy * effectiveDt;
                const dx = state.plane.x - enemy.x;
                enemy.vx += clamp(dx, -1, 1) * 100 * effectiveDt;
                enemy.vx = clamp(enemy.vx, -95, 95);
                enemy.x += enemy.vx * effectiveDt;
            } else if (enemy.type === "gunner") {
                if (enemy.y < enemy.targetY) {
                    enemy.y += enemy.vy * effectiveDt;
                } else {
                    enemy.x = enemy.baseX + Math.sin(enemy.age * 1.25) * 26;
                    enemy.fireTimer -= effectiveDt;
                    if (enemy.fireTimer <= 0) {
                        fireAimed(enemy);
                        state.career.aimedKills += 0;
                        enemy.fireTimer = Math.max(0.75, 1.85 - state.wave * 0.05);
                    }
                }
            } else if (enemy.type === "stalker") {
                enemy.y += enemy.vy * effectiveDt;
                const dx = state.plane.x - enemy.x;
                const dy = state.plane.y - enemy.y;
                const dist = Math.hypot(dx, dy) || 1;
                enemy.vx += (dx / dist) * enemy.accel * effectiveDt;
                enemy.vy += (dy / dist) * enemy.accel * effectiveDt;
                const maxSpeed = 180;
                const speed = Math.hypot(enemy.vx, enemy.vy);
                if (speed > maxSpeed) {
                    enemy.vx = (enemy.vx / speed) * maxSpeed;
                    enemy.vy = (enemy.vy / speed) * maxSpeed;
                }
                enemy.x += enemy.vx * effectiveDt;
            } else if (enemy.type === "splitter") {
                enemy.x += enemy.vx * effectiveDt;
                enemy.y += enemy.vy * effectiveDt;
            } else if (enemy.type === "minesweeper") {
                enemy.x += enemy.vx * effectiveDt;
                enemy.y += enemy.vy * effectiveDt;
                enemy.mineTimer -= effectiveDt;
                if (enemy.mineTimer <= 0 && enemy.minesLaid < enemy.maxMines) {
                    layMine(enemy.x, enemy.y);
                    enemy.minesLaid += 1;
                    enemy.mineTimer = rand(1.5, 3.0);
                }
            } else if (enemy.type === "sniper") {
                if (enemy.y < -10) {
                    enemy.y += enemy.vy * effectiveDt;
                } else {
                    enemy.telegraphTimer -= effectiveDt;
                    if (enemy.telegraphTimer <= 0) {
                        const angle = Math.atan2(state.plane.y - enemy.y, state.plane.x - enemy.x);
                        enemy.telegraphAngle = angle;
                        enemy.telegraphTimer = 0.8;
                        enemy.telegraphing = true;
                    } else if (enemy.telegraphing && enemy.telegraphTimer <= 0.2) {
                        const speed = 300 + state.wave * 5;
                        addEnemyBullet(enemy.x, enemy.y, Math.cos(enemy.telegraphAngle) * speed, Math.sin(enemy.telegraphAngle) * speed);
                        state.career.aimedKills += 0;
                        sfx("enemyShoot");
                        enemy.telegraphing = false;
                        enemy.fireTimer = rand(1.5, 2.5);
                        enemy.telegraphTimer = enemy.fireTimer;
                    }
                }
            } else if (enemy.type === "carrier") {
                enemy.y += enemy.vy * effectiveDt;
                enemy.droneTimer -= effectiveDt;
                if (enemy.droneTimer <= 0 && enemy.dronesReleased < 3) {
                    spawnDrone(enemy.x, enemy.y);
                    enemy.dronesReleased += 1;
                    enemy.droneTimer = 0.8;
                }
            } else if (enemy.type === "phase") {
                enemy.x += enemy.vx * effectiveDt;
                enemy.y += enemy.vy * effectiveDt;
                enemy.phaseTimer -= effectiveDt;
                if (enemy.phaseTimer <= 0) {
                    enemy.phased = !enemy.phased;
                    enemy.phaseTimer = rand(0.5, 1.5);
                }
            } else if (enemy.type === "ram") {
                if (enemy.ramState === "approach") {
                    enemy.ramTimer += effectiveDt;
                    if (!enemy.telegraphing && enemy.ramTimer > 0.5) {
                        enemy.telegraphing = true;
                        enemy.ramTimer = 0;
                    } else if (enemy.telegraphing && enemy.ramTimer > 1.0) {
                        enemy.ramState = "charge";
                        enemy.telegraphing = false;
                        enemy.vx = enemy.ramSide * 300;
                    }
                } else if (enemy.ramState === "charge") {
                    enemy.x += enemy.vx * effectiveDt;
                }
            } else if (enemy.type === "turret") {
                if (enemy.y < enemy.targetY) {
                    enemy.y += enemy.vy * effectiveDt;
                } else {
                    enemy.fireTimer -= effectiveDt;
                    if (enemy.fireTimer <= 0) {
                        fireTurretBurst(enemy);
                        enemy.fireTimer = rand(1.0, 1.8);
                    }
                }
            } else if (enemy.type === "boss") {
                updateBoss(enemy, effectiveDt);
            } else if (enemy.type === "drone") {
                enemy.y += enemy.vy * effectiveDt;
                enemy.x = enemy.baseX + Math.sin(enemy.age * 3) * 30;
                enemy.fireTimer -= effectiveDt;
                if (enemy.fireTimer <= 0) {
                    fireAimed(enemy);
                    enemy.fireTimer = 1.2;
                }
            }

            if (enemy.type !== "boss" && (enemy.y > H + 34 || enemy.x < -70 || enemy.x > W + 70)) {
                state.enemies.splice(i, 1);
                if (enemy.type !== "drone") breakCombo();
            }
        }
    }

    function fireAimed(enemy) {
        const speed = 145 + Math.min(80, state.wave * 3);
        const angle = Math.atan2(state.plane.y - enemy.y, state.plane.x - enemy.x);
        addEnemyBullet(enemy.x, enemy.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
        sfx("enemyShoot");
    }

    function updateBoss(boss, dt) {
        if (boss.y < boss.targetY) {
            boss.y += 72 * dt;
            return;
        }
        boss.x = W / 2 + Math.sin(boss.age * 0.62) * 108;
        boss.y = boss.targetY + Math.sin(boss.age * 1.15) * 9;
        boss.fireTimer -= dt;
        if (boss.fireTimer <= 0) {
            bossFire(boss);
            boss.fireTimer = Math.max(0.78, 1.4 - state.wave * 0.012);
        }
    }

    function bossFire(boss) {
        const speed = 112 + Math.min(70, state.wave * 2);
        if (boss.pattern === 0) {
            const count = 14;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + boss.age * 0.4;
                addEnemyBullet(boss.x, boss.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
            }
        } else if (boss.pattern === 1) {
            const angle = Math.atan2(state.plane.y - boss.y, state.plane.x - boss.x);
            for (let i = -1; i <= 1; i++) {
                const a = angle + i * 0.15;
                addEnemyBullet(boss.x, boss.y, Math.cos(a) * (speed + 35), Math.sin(a) * (speed + 35));
            }
        } else {
            const count = 7;
            for (let i = 0; i < count; i++) {
                const angle = Math.PI / 2 + (i - (count - 1) / 2) * 0.19;
                addEnemyBullet(boss.x, boss.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
            }
        }
        boss.pattern = (boss.pattern + 1) % 3;
        sfx("enemyShoot");
    }

    /* ===== New Enemy Helpers ===== */
    function layMine(x, y) {
        if (state.mines.length >= 8) return;
        state.mines.push({
            x: x, y: y, r: 6, age: 0, armed: false, armTime: 0.5,
            triggerRange: 35, damage: 1,
        });
    }

    function updateMines(dt) {
        for (let i = state.mines.length - 1; i >= 0; i--) {
            const mine = state.mines[i];
            mine.age += dt;
            if (!mine.armed && mine.age >= mine.armTime) mine.armed = true;
            if (mine.armed) {
                const dx = state.plane.x - mine.x;
                const dy = state.plane.y - mine.y;
                if (dx * dx + dy * dy <= mine.triggerRange * mine.triggerRange) {
                    explodeMine(mine);
                    state.mines.splice(i, 1);
                }
            }
            if (mine.age > 15) state.mines.splice(i, 1);
        }
    }

    function explodeMine(mine) {
        const theme = THEMES[state.theme];
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 180;
            addEnemyBullet(mine.x, mine.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
        }
        spawnParticles(mine.x, mine.y, theme.enemy, 12);
        sfx("explosion");
        haptic(12);
    }

    function updateWingmen(dt) {
        for (let i = 0; i < state.wingmen.length; i++) {
            const w = state.wingmen[i];
            const def = WINGMAN_DEFS[w.type];
            if (!def) continue;

            w.orbitAngle = (w.orbitAngle || 0) + dt * 1.5;
            w.fireTimer = (w.fireTimer || 0) - dt;

            if (w.type === "shield" && w.level >= 2) {
                const dx = state.plane.x - w.x;
                const dy = state.plane.y - w.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 60) {
                    const enemy = state.enemies.find(e => e.type !== "drone" && e.type !== "boss" && Math.hypot(e.x - state.plane.x, e.y - state.plane.y) < 60);
                    if (enemy) {
                        const angle = Math.atan2(state.plane.y - enemy.y, state.plane.x - enemy.x);
                        const shieldX = state.plane.x + Math.cos(angle) * 30;
                        const shieldY = state.plane.y + Math.sin(angle) * 30;
                        w.shieldX = shieldX; w.shieldY = shieldY;
                    }
                }
            }

            if (w.fireTimer <= 0 && def.fireInterval > 0) {
                let target = null;
                let closestDist = 999999;
                for (const enemy of state.enemies) {
                    if (enemy.type === "boss" || enemy.type === "drone") continue;
                    const d = dist2(w.x, w.y, enemy.x, enemy.y);
                    if (d < closestDist) {
                        closestDist = d;
                        target = enemy;
                    }
                }
                if (target) {
                    const speed = def.bulletSpeed;
                    const angle = Math.atan2(target.y - w.y, target.x - w.x);
                    addEnemyBullet(w.x, w.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
                    w.fireTimer = def.fireInterval / (w.level || 1);
                    if (w.type === "bomber" && Math.random() < 0.15) {
                        const theme = THEMES[state.theme];
                        spawnParticles(target.x, target.y, theme.accent, 8);
                    }
                } else if (w.type === "magnet" || w.type === "shield") {
                    w.fireTimer = def.fireInterval;
                }
            }

            if (w.type === "magnet") {
                for (let j = state.powerups.length - 1; j >= 0; j--) {
                    const p = state.powerups[j];
                    const d = dist2(w.x, w.y, p.x, p.y);
                    if (d < 150 * 150) {
                        const angle = Math.atan2(w.y - p.y, w.x - p.x);
                        p.vx += Math.cos(angle) * 200 * dt;
                        p.vy += Math.sin(angle) * 200 * dt;
                    }
                }
            }
        }
    }

    function drawMines(ctx, theme) {
        for (let i = 0; i < state.mines.length; i++) {
            const mine = state.mines[i];
            ctx.fillStyle = mine.armed ? theme.enemy : theme.accent;
            ctx.shadowColor = mine.armed ? theme.enemy : theme.accent;
            ctx.shadowBlur = mine.armed ? 8 : 4;
            ctx.globalAlpha = mine.armed ? 1 : 0.6;
            ctx.beginPath();
            ctx.arc(mine.x, mine.y, mine.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            if (mine.armed) {
                ctx.strokeStyle = theme.border;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(mine.x, mine.y, mine.triggerRange, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    function spawnDrone(x, y) {
        if (state.enemies.length >= config.maxEnemies) return;
        state.enemies.push({
            type: "drone", x: x, y: y, baseX: x,
            vx: 0, vy: 40, r: 6, hp: 1, maxHp: 1, points: 15,
            age: 0, hitFlash: 0, fireTimer: 0.8,
        });
    }

    function fireTurretBurst(enemy) {
        const speed = 130 + state.wave * 2;
        for (let i = -1; i <= 1; i++) {
            const angle = Math.PI / 2 + i * 0.25;
            addEnemyBullet(enemy.x, enemy.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
        }
        sfx("enemyShoot");
    }

    /* ===== Boss Variants ===== */
    function spawnBoss() {
        const tier = Math.floor(state.wave / 5);
        const hp = 80 + tier * 40;
        const variants = config.bossVariants;
        const variant = variants[(tier - 1) % variants.length];
        const boss = {
            type: "boss", variant: variant, x: W / 2, y: -60, targetY: 116, vx: 0, vy: 0,
            r: 36, hp: hp, maxHp: hp, points: 500,
            age: 0, hitFlash: 0, fireTimer: 1.2, pattern: 0,
        };
        state.enemies.push(boss);
        state.boss = boss;
        state.bossVariant = variant;
        sfx("wave");
        haptic(40);
    }

    function updateBoss(boss, dt) {
        if (boss.y < boss.targetY) {
            boss.y += 72 * dt;
            return;
        }
        if (boss.variant === "swarm") {
            updateSwarmBoss(boss, dt);
        } else if (boss.variant === "artillery") {
            updateArtilleryBoss(boss, dt);
        } else {
            updateMirrorBoss(boss, dt);
        }
    }

    function updateSwarmBoss(boss, dt) {
        boss.x = W / 2 + Math.sin(boss.age * 0.5) * 100;
        boss.y = boss.targetY + Math.sin(boss.age * 0.9) * 15;
        boss.fireTimer -= dt;
        if (boss.fireTimer <= 0) {
            swarmBossFire(boss);
            boss.fireTimer = Math.max(0.6, 1.2 - state.wave * 0.01);
        }
        if (boss.droneTimer === undefined) boss.droneTimer = 3;
        boss.droneTimer -= dt;
        if (boss.droneTimer <= 0 && state.enemies.filter(e => e.type === "drone").length < 6) {
            spawnDrone(boss.x, boss.y);
            boss.droneTimer = 2.5;
        }
    }

    function swarmBossFire(boss) {
        const speed = 100 + state.wave * 1.5;
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + boss.age * 0.5;
            addEnemyBullet(boss.x, boss.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
        }
        sfx("enemyShoot");
    }

    function updateArtilleryBoss(boss, dt) {
        boss.x = W / 2 + Math.sin(boss.age * 0.3) * 80;
        boss.y = boss.targetY + 10;
        boss.fireTimer -= dt;
        if (boss.fireTimer <= 0) {
            artilleryBossFire(boss);
            boss.fireTimer = Math.max(1.0, 2.0 - state.wave * 0.015);
        }
    }

    function artilleryBossFire(boss) {
        const speed = 90;
        const count = 5;
        for (let i = 0; i < count; i++) {
            const targetX = rand(50, W - 50);
            const angle = Math.atan2(H - boss.y, targetX - boss.x);
            addEnemyBullet(boss.x, boss.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
        }
        sfx("enemyShoot");
        state.shake = Math.max(state.shake, 8);
    }

    function updateMirrorBoss(boss, dt) {
        boss.x = clamp(state.plane.x, 80, W - 80);
        boss.y = boss.targetY + Math.sin(boss.age * 1.2) * 8;
        boss.fireTimer -= dt;
        if (boss.fireTimer <= 0) {
            mirrorBossFire(boss);
            boss.fireTimer = Math.max(0.7, 1.4 - state.wave * 0.01);
        }
    }

    function mirrorBossFire(boss) {
        const speed = 140 + state.wave * 2;
        const spread = state.spreadTime > 0 ? 3 : 1;
        for (let i = -Math.floor(spread/2); i <= Math.floor(spread/2); i++) {
            const angle = Math.PI / 2 + i * 0.15;
            addEnemyBullet(boss.x, boss.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
        }
        sfx("enemyShoot");
    }

    /* ===== Power-ups ===== */
    const BASIC_POWERUPS = ["spread", "rapid", "shield", "bomb"];
    const ADVANCED_POWERUPS = ["pierce", "homing", "multishot", "laser", "overdrive", "timeDilation", "magnet", "scrap"];

    function maybeDropPowerup(enemy, force) {
        if (!force && Math.random() > config.powerup.dropChance) return;
        let pool = [...BASIC_POWERUPS];
        if (state.wave >= 5) pool = pool.concat(ADVANCED_POWERUPS);
        if (state.bombs >= config.maxBombs) pool = pool.filter(function (type) { return type !== "bomb"; });
        if (state.shield) pool = pool.filter(function (type) { return type !== "shield"; });
        if (pool.length === 0) pool = ["spread", "rapid"];
        const type = pool[Math.floor(Math.random() * pool.length)];
        state.powerups.push({
            type: type, x: enemy.x, y: enemy.y, vx: rand(-16, 16),
            vy: config.powerup.vy, r: config.powerup.r, age: 0,
        });
    }

    function updatePowerups(dt) {
        for (let i = state.powerups.length - 1; i >= 0; i--) {
            const powerup = state.powerups[i];
            powerup.age += dt;
            powerup.x += powerup.vx * dt;
            powerup.y += powerup.vy * dt;
            if (powerup.age > config.powerup.life || powerup.y > H + 24) {
                state.powerups.splice(i, 1);
            }
        }
    }

    function collectPowerup(powerup) {
        if (!state.powerupTypesCollected[powerup.type]) {
            state.powerupTypesCollected[powerup.type] = true;
        }
        state.career.powerups += 1;

        const def = POWERUP_DEFS[powerup.type];
        if (def.duration > 0) {
            const timerName = powerup.type + "Time";
            state[timerName] = Math.min(15, (state[timerName] || 0) + def.duration);
        } else if (powerup.type === "shield") {
            state.shield = true;
        } else if (powerup.type === "bomb") {
            state.bombs = Math.min(config.maxBombs, state.bombs + 1);
        }
        spawnParticles(powerup.x, powerup.y, THEMES[state.theme][def.color] || THEMES[state.theme].powerup, 14);
        addFloater(powerup.x, powerup.y - 8, def.label, THEMES[state.theme][def.color] || THEMES[state.theme].powerup);
        sfx("powerup");
        haptic(18);
        updateHUD();
    }

    /* ===== Collisions ===== */
    function updateCollisions() {
        const theme = THEMES[state.theme];
        for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
            const bullet = state.bullets[bi];
            for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
                const enemy = state.enemies[ei];
                if (dist2(bullet.x, bullet.y, enemy.x, enemy.y) <= Math.pow(bullet.r + enemy.r, 2)) {
                    if (enemy.type === "phase" && enemy.phased) {
                        continue;
                    }
                    const pierce = state.pierceTime > 0 && bullet.pierce !== false;
                    if (!pierce) state.bullets.splice(bi, 1);
                    enemy.hp -= 1;
                    enemy.hitFlash = 0.08;
                    if (enemy.hp <= 0) {
                        if (enemy.type === "splitter") {
                            spawnSplitters(enemy);
                        }
                        destroyEnemy(enemy, true);
                    } else {
                        Particles.spawn(bullet.x, bullet.y, theme.bullet, 2);
                    }
                    if (!pierce) break;
                }
            }
        }

        const px = state.plane.x;
        const py = state.plane.y + 4;

        if (state.invuln <= 0 && state.mode === "playing") {
            for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
                const bullet = state.enemyBullets[i];
                if (dist2(px, py, bullet.x, bullet.y) <= Math.pow(config.player.r + bullet.r, 2)) {
                    state.enemyBullets.splice(i, 1);
                    hitPlayer();
                    break;
                }
            }
        }

        if (state.invuln <= 0 && state.mode === "playing") {
            for (let i = state.enemies.length - 1; i >= 0; i--) {
                const enemy = state.enemies[i];
                if (dist2(px, py, enemy.x, enemy.y) <= Math.pow(config.player.r + enemy.r, 2)) {
                    if (enemy.type !== "boss") destroyEnemy(enemy, false);
                    hitPlayer();
                    break;
                }
            }
        }

        if (state.mode !== "playing") return;

        for (let i = state.powerups.length - 1; i >= 0; i--) {
            const powerup = state.powerups[i];
            if (dist2(px, py, powerup.x, powerup.y) <= Math.pow(config.player.r + 15, 2)) {
                state.powerups.splice(i, 1);
                collectPowerup(powerup);
            }
        }
    }

    function destroyEnemy(enemy, award) {
        const index = state.enemies.indexOf(enemy);
        if (index === -1) return;
        state.enemies.splice(index, 1);
        const theme = THEMES[state.theme];
        const isBoss = enemy.type === "boss";

        if (award) {
            const multiplier = comboMultiplier();
            let gain = Math.round(enemy.points * multiplier);
            if (state.scrapTime > 0) gain = Math.round(gain * 2);
            state.score += gain;
            state.combo += 1;
            if (state.combo >= config.comboStep * 4) state.combo4Count += 1;
            state.comboTimer = config.comboWindow;
            addFloater(enemy.x, enemy.y - 4, "+" + gain, theme.neon);

            if (state.equippedAbilities.includes("vampire") && !state.vampireUsed && state.lives < config.lives && Math.random() < 0.05) {
                state.lives += 1;
                state.vampireUsed = true;
                spawnParticles(state.plane.x, state.plane.y, theme.powerup, 12);
                addFloater(state.plane.x, state.plane.y - 20, "VAMPIRE!", theme.powerup);
                sfx("powerup");
            }

            if (state.spreadTime > 0) state.career.spreadKills += 1;
        }

        spawnParticles(enemy.x, enemy.y, theme.powerup, isBoss ? 46 : 8);
        state.shake = Math.max(state.shake, isBoss ? 16 : 3);
        if (isBoss) {
            state.flash = Math.max(state.flash, 0.35);
            state.enemyBullets.length = 0;
            state.boss = null;
            sfx("explosion");
            haptic([35, 25, 60]);
        } else {
            sfx("hit");
            haptic(5);
        }

        maybeDropPowerup(enemy, isBoss);
        updateHUD();
    }

    function hitPlayer() {
        if (state.mode !== "playing" || state.invuln > 0 || state.god) return;
        const theme = THEMES[state.theme];

        if (state.shield) {
            state.shield = false;
            state.invuln = config.shieldInvuln;
            state.career.shieldHits += 1;
            state.shake = Math.max(state.shake, 5);
            state.flash = Math.max(state.flash, 0.18);
            spawnParticles(state.plane.x, state.plane.y, theme.powerup, 16);
            sfx("hit");
            haptic(20);
            updateHUD();
            return;
        }

        if (state.equippedAbilities.includes("autoBomb") && state.bombs > 0 && state.lives === 1) {
            useBomb();
            return;
        }

        state.lives -= 1;
        state.invuln = config.invulnTime;
        state.shake = 12;
        state.flash = 0.4;
        breakCombo();
        clearNearbyBullets(90);
        spawnParticles(state.plane.x, state.plane.y, theme.enemy, 18);
        sfx("hit");
        haptic([45, 30, 70]);
        updateHUD();

        if (state.lives <= 0) gameOver();
    }

    function clearNearbyBullets(radius) {
        for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = state.enemyBullets[i];
            if (dist2(bullet.x, bullet.y, state.plane.x, state.plane.y) <= radius * radius) {
                state.enemyBullets.splice(i, 1);
            }
        }
    }

    function useBomb() {
        if (state.mode !== "playing" || state.bombs <= 0) return;
        state.bombUsedThisRun = true;
        
        if (state.equippedAbilities.includes("overcharge")) {
            state.overdriveTime = 3;
            state.bombs -= 1;
            const theme = THEMES[state.theme];
            spawnParticles(state.plane.x, state.plane.y, theme.accent, 20);
            addFloater(state.plane.x, state.plane.y - 26, "OVERCHARGE!", theme.accent);
            sfx("bomb");
            haptic([50, 20, 60]);
            updateHUD();
            return;
        }

        state.bombs -= 1;
        state.invuln = Math.max(state.invuln, 1.1);
        state.enemyBullets.length = 0;
        state.shake = 14;
        state.flash = 0.45;
        const theme = THEMES[state.theme];
        const targets = state.enemies.slice();
        for (let i = 0; i < targets.length; i++) {
            const enemy = targets[i];
            enemy.hp -= 8;
            enemy.hitFlash = 0.12;
            if (enemy.hp <= 0) {
                destroyEnemy(enemy, true);
            } else {
                spawnParticles(enemy.x, enemy.y, theme.powerup, 8);
            }
        }
        spawnParticles(state.plane.x, state.plane.y, theme.neon, 24);
        addFloater(state.plane.x, state.plane.y - 26, "BOMB!", theme.neon);
        sfx("bomb");
        haptic([70, 30, 90]);
        updateHUD();
    }

    function tryPhaseShift() {
        if (!state.equippedAbilities.includes("phaseShift") || state.phaseShiftCD > 0) return false;
        state.invuln = 1;
        state.phaseShiftCD = 30;
        const theme = THEMES[state.theme];
        spawnParticles(state.plane.x, state.plane.y, theme.powerup, 16);
        addFloater(state.plane.x, state.plane.y - 20, "PHASE SHIFT!", theme.powerup);
        sfx("powerup");
        haptic(25);
        return true;
    }

    function tryRecall() {
        if (!state.equippedAbilities.includes("recall")) return;
        state.recallActive = true;
        setTimeout(() => { state.recallActive = false; }, 2000);
    }

    /* ===== Missions & Medals ===== */
    function getDailyMission() {
        const today = Math.floor(Date.now() / 86400000);
        if (state.dailyMission && state.career.lastDaily === today) return state.dailyMission;
        const missions = MISSION_DEFS.daily;
        const seed = today + 12345;
        const rng = mulberry32(seed);
        const mission = missions[Math.floor(rng() * missions.length)];
        state.dailyMission = { ...mission, progress: 0, claimed: false, date: today };
        state.career.lastDaily = today;
        state.missionProgress.daily[mission.id] = 0;
        return state.dailyMission;
    }

    function mulberry32(a) {
        return function() {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function getWeeklySeed() {
        const weekStart = Math.floor(Date.now() / 604800000);
        return weekStart + 54321;
    }

    function updateMissions(dt) {
        if (state.mode !== "playing") return;

        const daily = getDailyMission();
        if (daily && !daily.claimed) {
            const statValue = getStatValue(daily.stat);
            const newProgress = Math.min(daily.target, statValue - (state.missionProgress.daily[daily.id] || 0));
            if (newProgress > 0) {
                state.missionProgress.daily[daily.id] = (state.missionProgress.daily[daily.id] || 0) + newProgress;
                if (state.missionProgress.daily[daily.id] >= daily.target) {
                    completeDailyMission(daily);
                }
            }
        }

        for (const career of MISSION_DEFS.career) {
            const statValue = state.career[career.stat] || 0;
            const currentTier = career.tiers.findIndex(t => statValue < t);
            const completedTiers = currentTier >= 0 ? currentTier : career.tiers.length;
            const savedTiers = state.missionProgress.career[career.id] || 0;
            if (completedTiers > savedTiers) {
                for (let t = savedTiers; t < completedTiers; t++) {
                    completeCareerTier(career, t);
                }
                state.missionProgress.career[career.id] = completedTiers;
            }
        }

        checkMedals();
    }

    function getStatValue(stat) {
        switch (stat) {
            case "kills": return state.career.kills;
            case "spreadKills": return state.career.spreadKills;
            case "powerups": return state.career.powerups;
            case "bosses": return state.career.bosses;
            case "noHitWaves": return state.career.noHitWaves;
            case "wave": return state.wave;
            case "combo4": return state.career.combo4;
            case "aimedKills": return state.career.aimedKills;
            case "shieldHits": return state.career.shieldHits;
            case "dailyStreak": return state.career.dailyStreak;
            default: return 0;
        }
    }

    function completeDailyMission(mission) {
        mission.claimed = true;
        state.career.tokens += mission.reward;
        state.career.dailyStreak += 1;
        showToast("DAILY COMPLETE: +" + mission.reward + " TOKENS", 3);
        sfx("powerup");
        saveStorage();
    }

    function completeCareerTier(mission, tierIndex) {
        const reward = mission.rewards[tierIndex];
        state.career.tokens += reward;
        showToast("CAREER: " + mission.name + " TIER " + (tierIndex + 1) + " +" + reward, 3);
        sfx("wave");
        saveStorage();
    }

    function checkMedals() {
        for (const [id, medal] of Object.entries(MEDAL_DEFS)) {
            if (state.career.medals[id]) continue;
            if (checkMedalCondition(medal)) {
                unlockMedal(id);
            }
        }
    }

    /* ===== Weekly Challenge ===== */
    function startWeeklyChallenge() {
        state.weeklySeed = getWeeklySeed();
        state.mode = "weekly";
        state.wave = 1;
        state.score = 0;
        state.lives = config.lives;
        state.bombs = config.bombs;
        state.combo = 0;
        state.comboTimer = 0;
        state.weeklyChallengeActive = true;
        state.weeklyChallengeWaves = generateWeeklyWaves(state.weeklySeed);
        state.weeklyChallengeWaveIndex = 0;
        showToast("WEEKLY CHALLENGE STARTED", 3);
        sfx("wave");
        startLoop();
    }

    function generateWeeklyWaves(seed) {
        const rng = mulberry32(seed);
        const waves = [];
        for (let w = 1; w <= 15; w++) {
            const wave = {
                number: w,
                enemies: [],
                isBoss: w % 5 === 0,
            };
            if (wave.isBoss) {
                wave.bossVariant = ["swarm", "artillery", "mirror"][Math.floor(rng() * 3)];
            } else {
                const count = 5 + Math.floor(rng() * 6);
                for (let i = 0; i < count; i++) {
                    const types = ["drifter", "weaver", "diver", "gunner", "stalker", "splitter", "minesweeper", "sniper", "carrier", "phase", "ram", "turret"];
                    wave.enemies.push(types[Math.floor(rng() * types.length)]);
                }
            }
            waves.push(wave);
        }
        return waves;
    }

    function getWeeklyChallengeState() {
        return {
            seed: state.weeklySeed,
            score: state.score,
            wave: state.wave,
            completed: state.weeklyChallengeWaveIndex >= state.weeklyChallengeWaves.length,
        };
    }

    function completeWeeklyChallenge() {
        if (!state.weeklyChallengeActive) return;
        state.weeklyChallengeActive = false;
        const wc = getWeeklyChallengeState();
        if (Arcade && Arcade.stats && Arcade.stats.run) {
            try {
                Arcade.stats.run({
                    slug: SLUG,
                    score: state.score,
                    durMs: Date.now() - state.runStart,
                    wave: state.wave,
                    outcome: "weekly",
                    challenge: "weekly-" + Math.floor(Date.now() / 604800000),
                });
            } catch (err) {}
        }
        state.career.tokens += 100;
        showToast("WEEKLY COMPLETE! +" + state.score + " SCORE, +100 TOKENS", 4);
        sfx("wave");
        haptic([40, 30, 60, 80]);
        saveStorage();
        state.mode = "gameover";
        showGameOverOverlay();
    }

    function checkMedalCondition(medal) {
        if (!medal.req) {
            if (medal.id === "firstBlood") return state.career.kills >= 1;
            if (medal.id === "perfectWave") return state.noHitThisWave && state.wave > 1;
            if (medal.id === "pacifist") return state.wave >= 5 && state.career.kills === 0;
            if (medal.id === "phoenix") return false;
            if (medal.id === "speedrun") return state.wave >= 10 && (Date.now() - state.runStart) < 180000;
            if (medal.id === "noBombRun") return state.wave >= 20 && !state.bombUsedThisRun;
            if (medal.id === "oneLifeWonder") return state.wave >= 15 && state.lives === 1;
            if (medal.id === "weeklyTop10") return false;
            if (medal.id === "challengeChamp") return false;
            return false;
        }
        for (const [stat, value] of Object.entries(medal.req)) {
            if ((state.career[stat] || 0) < value) return false;
        }
        return true;
    }

    function unlockMedal(id) {
        state.career.medals[id] = { unlockedAt: Date.now() };
        const medal = MEDAL_DEFS[id];
        showToast("MEDAL UNLOCKED: " + medal.name, 4);
        sfx("wave");
        haptic(30);

        if (medal.unlockAbility) {
            if (!state.career.abilities[medal.unlockAbility]) {
                state.career.abilities[medal.unlockAbility] = true;
                showToast("ABILITY UNLOCKED: " + ABILITY_DEFS[medal.unlockAbility].name, 3);
            }
        }
        if (medal.unlockWingman) {
            if (!state.career.wingmen[medal.unlockWingman]) {
                state.career.wingmen[medal.unlockWingman] = true;
                showToast("WINGMAN UNLOCKED: " + WINGMAN_DEFS[medal.unlockWingman].name, 3);
            }
        }
        saveStorage();
    }

    /* ===== Combo / floaters / toast ===== */
    function comboMultiplier() {
        return Math.min(config.comboMax, 1 + Math.floor(state.combo / config.comboStep));
    }

    function breakCombo() {
        if (state.combo !== 0 || state.comboTimer !== 0) {
            state.combo = 0;
            state.comboTimer = 0;
            updateHUD();
        }
    }

    function addFloater(x, y, text, color) {
        state.floaters.push({ x: x, y: y, text: text, color: color, life: 0.9, max: 0.9 });
        if (state.floaters.length > 20) state.floaters.shift();
    }

    function updateFloaters(dt) {
        for (let i = state.floaters.length - 1; i >= 0; i--) {
            const floater = state.floaters[i];
            floater.life -= dt;
            floater.y -= 26 * dt;
            if (floater.life <= 0) state.floaters.splice(i, 1);
        }
    }

    function showToast(text, seconds) {
        DOME.toast.textContent = text;
        DOME.toast.classList.remove("hidden", "fade");
        state.toastTimer = seconds || 3;
    }

    function updateToast(dt) {
        if (state.toastTimer <= 0) return;
        state.toastTimer -= dt;
        if (state.toastTimer <= 0.3) DOME.toast.classList.add("fade");
        if (state.toastTimer <= 0) {
            DOME.toast.classList.add("hidden");
            DOME.toast.classList.remove("fade");
        }
    }

    function spawnParticles(x, y, color, count) {
        Particles.spawn(x, y, color, count);
    }

    /* ===== Rendering ===== */
    function draw() {
        const ctx = DOME.ctx;
        const theme = THEMES[state.theme];
        ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        if (state.shake > 0.1 && !state.reduceMotion) {
            ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
        }
        drawGrid(ctx, theme);
        drawPowerups(ctx, theme);
        drawEnemies(ctx, theme);
        drawMines(ctx, theme);
        drawEnemyBullets(ctx, theme);
        drawPlayerBullets(ctx, theme);
        drawWingmen(ctx, theme);
        drawPlane(ctx, theme);
        Particles.draw(ctx);
        drawFloaters(ctx);
        if (state.pointer.active) drawThumbRing(ctx, theme);
        if (state.debug) drawHitboxes(ctx, theme);
        ctx.restore();

        drawBossBar(ctx, theme);
        drawWaveBanner(ctx, theme);
        drawCombo(ctx, theme);

        if (state.flash > 0.01 && !state.reduceMotion) {
            ctx.fillStyle = "rgba(255,255,255," + Math.min(0.45, state.flash * 0.6) + ")";
            ctx.fillRect(0, 0, W, H);
        }
    }

    function drawGrid(ctx, theme) {
        ctx.strokeStyle = theme.grid;
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = 1;
        for (let x = 0; x <= W; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
        const offset = state.gridScroll % 20;
        for (let y = -20 + offset; y <= H; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    function drawPowerups(ctx, theme) {
        for (let i = 0; i < state.powerups.length; i++) {
            const powerup = state.powerups[i];
            const def = POWERUP_DEFS[powerup.type];
            const blink = powerup.age > config.powerup.life - 2 && Math.floor(powerup.age * 8) % 2 === 0;
            if (blink) continue;
            const color = theme[def?.color] || theme.powerup;
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(powerup.x, powerup.y, powerup.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = theme.border;
            ctx.globalAlpha = 0.75;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(powerup.x, powerup.y, powerup.r + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = theme.bg;
            ctx.font = "bold 9px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(def?.key || "?", powerup.x, powerup.y + 0.5);
        }
    }

    function drawEnemies(ctx, theme) {
        for (let i = 0; i < state.enemies.length; i++) {
            const enemy = state.enemies[i];
            if (enemy.type === "boss") { drawBossBody(ctx, theme, enemy); continue; }
            if (enemy.type === "drone") { drawDrone(ctx, theme, enemy); continue; }

            const isPhased = enemy.type === "phase" && enemy.phased;
            if (isPhased) ctx.globalAlpha = 0.3;

            ctx.fillStyle = theme.enemy;
            ctx.shadowColor = theme.enemy;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            if (enemy.type === "weaver") {
                ctx.strokeStyle = theme.enemy;
                ctx.globalAlpha = 0.65;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.r + 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (enemy.type === "diver") {
                ctx.fillStyle = theme.bg;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, 2.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (enemy.type === "gunner") {
                ctx.strokeStyle = theme.enemy;
                ctx.globalAlpha = 0.8;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.r + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (enemy.type === "stalker") {
                ctx.strokeStyle = theme.accent;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.r + 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = theme.accent;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (enemy.type === "splitter") {
                ctx.strokeStyle = theme.enemy;
                ctx.globalAlpha = 0.5;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.r + 6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.fillStyle = theme.bg;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (enemy.type === "minesweeper") {
                ctx.fillStyle = theme.accent;
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y - enemy.r);
                ctx.lineTo(enemy.x - enemy.r * 0.7, enemy.y + enemy.r * 0.7);
                ctx.lineTo(enemy.x + enemy.r * 0.7, enemy.y + enemy.r * 0.7);
                ctx.closePath();
                ctx.fill();
            } else if (enemy.type === "sniper") {
                ctx.strokeStyle = theme.neon;
                ctx.lineWidth = 1;
                ctx.globalAlpha = enemy.telegraphing ? 1 : 0.4;
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y);
                const tx = enemy.x + Math.cos(enemy.telegraphAngle || 0) * 200;
                const ty = enemy.y + Math.sin(enemy.telegraphAngle || 0) * 200;
                ctx.lineTo(tx, ty);
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.fillStyle = theme.neon;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (enemy.type === "carrier") {
                ctx.strokeStyle = theme.border;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.r + 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
                for (let d = 0; d < 3; d++) {
                    const a = (Math.PI * 2 * d) / 3 + enemy.age * 2;
                    ctx.fillStyle = theme.enemy;
                    ctx.beginPath();
                    ctx.arc(enemy.x + Math.cos(a) * 18, enemy.y + Math.sin(a) * 18, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (enemy.type === "phase") {
                ctx.strokeStyle = theme.powerup;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.r + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            } else if (enemy.type === "ram") {
                ctx.fillStyle = theme.accent;
                ctx.beginPath();
                ctx.moveTo(enemy.x + enemy.r, enemy.y);
                ctx.lineTo(enemy.x - enemy.r * 0.8, enemy.y - enemy.r * 0.5);
                ctx.lineTo(enemy.x - enemy.r * 0.8, enemy.y + enemy.r * 0.5);
                ctx.closePath();
                ctx.fill();
                if (enemy.telegraphing) {
                    ctx.strokeStyle = theme.neon;
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = 0.5 + Math.sin(enemy.age * 20) * 0.5;
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, enemy.r + 8, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            } else if (enemy.type === "turret") {
                ctx.fillStyle = enemy.armor ? theme.border : theme.enemy;
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y - enemy.r);
                ctx.lineTo(enemy.x - enemy.r * 0.85, enemy.y + enemy.r * 0.5);
                ctx.lineTo(enemy.x + enemy.r * 0.85, enemy.y + enemy.r * 0.5);
                ctx.closePath();
                ctx.fill();
                if (enemy.armor) {
                    ctx.strokeStyle = theme.neon;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, enemy.r + 2, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            if (enemy.hitFlash > 0 && !isPhased) {
                ctx.fillStyle = "#ffffff";
                ctx.globalAlpha = 0.75;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            if (isPhased) ctx.globalAlpha = 1;
        }
    }

    function drawDrone(ctx, theme, drone) {
        ctx.fillStyle = theme.bullet;
        ctx.shadowColor = theme.bullet;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(drone.x, drone.y - drone.r);
        ctx.lineTo(drone.x - drone.r * 0.7, drone.y + drone.r * 0.7);
        ctx.lineTo(drone.x + drone.r * 0.7, drone.y + drone.r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function drawWingmen(ctx, theme) {
        for (let i = 0; i < state.wingmen.length; i++) {
            const w = state.wingmen[i];
            const def = WINGMAN_DEFS[w.type];
            if (!def) continue;
            const angle = w.orbitAngle || 0;
            const orbitR = 48;
            const wx = state.plane.x + Math.cos(angle) * orbitR;
            const wy = state.plane.y + Math.sin(angle) * orbitR;
            w.x = wx; w.y = wy;

            ctx.fillStyle = theme[def.color] || theme.bullet;
            ctx.shadowColor = theme[def.color] || theme.bullet;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(wx, wy - w.r);
            ctx.lineTo(wx - w.r * 0.7, wy + w.r * 0.7);
            ctx.lineTo(wx + w.r * 0.7, wy + w.r * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;

            if (w.level >= 2) {
                ctx.strokeStyle = theme.neon;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(wx, wy, w.r + 3, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    function drawBossBody(ctx, theme, boss) {
        ctx.fillStyle = theme.enemy;
        ctx.shadowColor = theme.enemy;
        ctx.shadowBlur = 14;
        for (let i = 0; i < 3; i++) {
            const angle = boss.age * 1.5 + i * (Math.PI * 2 / 3);
            ctx.beginPath();
            ctx.arc(boss.x + Math.cos(angle) * 54, boss.y + Math.sin(angle) * 54, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.strokeStyle = theme.border;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.r + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    function drawEnemyBullets(ctx, theme) {
        ctx.fillStyle = theme.enemy;
        ctx.shadowColor = theme.enemy;
        ctx.shadowBlur = 4;
        for (let i = 0; i < state.enemyBullets.length; i++) {
            const bullet = state.enemyBullets[i];
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    function drawPlayerBullets(ctx, theme) {
        for (let i = 0; i < state.bullets.length; i++) {
            const bullet = state.bullets[i];
            if (bullet.homing) {
                ctx.fillStyle = theme.neon;
                ctx.shadowColor = theme.neon;
            } else if (bullet.pierce) {
                ctx.fillStyle = theme.accent;
                ctx.shadowColor = theme.accent;
            } else {
                ctx.fillStyle = theme.bullet;
                ctx.shadowColor = theme.bullet;
            }
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
            ctx.fill();
            if (bullet.pierce) {
                ctx.strokeStyle = theme.neon;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.r + 1, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;

        if (state.laserActive) {
            ctx.fillStyle = theme.accent;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(state.plane.x - 2, 0, 4, state.plane.y);
            ctx.globalAlpha = 1;
            if (state.laserTarget) {
                ctx.strokeStyle = theme.accent;
                ctx.lineWidth = 3;
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.moveTo(state.plane.x, state.plane.y);
                ctx.lineTo(state.laserTarget.x, state.laserTarget.y);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }

    function drawPlane(ctx, theme) {
        const plane = state.plane;
        ctx.save();
        ctx.translate(plane.x, plane.y);
        if (state.invuln > 0 && Math.floor(state.time * 18) % 2 === 0) ctx.globalAlpha = 0.38;
        const gradient = ctx.createLinearGradient(-6, -6, 6, 6);
        gradient.addColorStop(0, theme.plane);
        gradient.addColorStop(1, theme.planeGrad);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-config.player.w / 2, config.player.h);
        ctx.lineTo(config.player.w / 2, config.player.h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        if (state.shield) {
            const pulse = 0.55 + Math.sin(state.time * 5) * 0.15;
            ctx.strokeStyle = theme.powerup;
            ctx.globalAlpha = pulse;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(plane.x, plane.y + 4, 23, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    function drawFloaters(ctx) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "bold 12px Arial";
        for (let i = 0; i < state.floaters.length; i++) {
            const floater = state.floaters[i];
            ctx.globalAlpha = Math.max(0, floater.life / floater.max);
            ctx.fillStyle = floater.color;
            ctx.fillText(floater.text, floater.x, floater.y);
        }
        ctx.globalAlpha = 1;
    }

    function drawThumbRing(ctx, theme) {
        const pointer = state.pointer;
        ctx.strokeStyle = theme.neon;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pointer.x - 8, pointer.y);
        ctx.lineTo(pointer.x + 8, pointer.y);
        ctx.moveTo(pointer.x, pointer.y - 8);
        ctx.lineTo(pointer.x, pointer.y + 8);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    function drawBossBar(ctx, theme) {
        if (!state.boss) return;
        const index = state.enemies.indexOf(state.boss);
        if (index === -1) return;
        const boss = state.boss;
        const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(18, 12, 364, 11);
        ctx.fillStyle = theme.enemy;
        ctx.fillRect(20, 14, 360 * ratio, 7);
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(18.5, 12.5, 363, 10);
        ctx.fillStyle = theme.text;
        ctx.globalAlpha = 0.75;
        ctx.font = "bold 9px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText("BOSS", 20, 34);
        ctx.globalAlpha = 1;
    }

    function drawWaveBanner(ctx, theme) {
        if (state.wavePhase === "active") return;
        const total = state.wavePhase === "clear" ? 1.6 : 1.8;
        const elapsed = total - state.waveTimer;
        const alpha = clamp(Math.min(elapsed / 0.18, state.waveTimer / 0.18), 0, 1);
        if (alpha <= 0) return;
        const isWarning = state.waveBanner === "WARNING";
        const color = isWarning ? theme.enemy : theme.neon;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 190, W, 82);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.font = "bold 28px Arial";
        ctx.fillText(state.waveBanner, W / 2, 224);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = theme.text;
        ctx.font = "bold 11px Arial";
        ctx.fillText(state.waveSub, W / 2, 250);
        ctx.restore();
    }

    function drawCombo(ctx, theme) {
        if (state.combo <= 0) return;
        const multiplier = comboMultiplier();
        ctx.textAlign = "right";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = multiplier > 1 ? theme.neon : theme.text;
        ctx.globalAlpha = multiplier > 1 ? 1 : 0.55;
        ctx.shadowColor = theme.neon;
        ctx.shadowBlur = multiplier > 1 ? 8 : 0;
        ctx.font = "bold 18px Arial";
        ctx.fillText("x" + multiplier, W - 12, 30);
        ctx.shadowBlur = 0;
        ctx.font = "bold 8px Arial";
        ctx.fillText("COMBO", W - 12, 40);
        ctx.globalAlpha = 1;
    }

    function drawHitboxes(ctx, theme) {
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(state.plane.x, state.plane.y + 4, config.player.r, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < state.enemies.length; i++) {
            const enemy = state.enemies[i];
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    /* ===== HUD / overlays ===== */
    function updateHUD() {
        if (!DOME.score) return;
        const displayHigh = Math.max(state.highScore, state.score);
        DOME.score.textContent = String(state.score);
        DOME.highScore.textContent = String(displayHigh);
        DOME.wave.textContent = String(state.wave);
        DOME.lives.textContent = state.lives > 0 ? "♥".repeat(Math.min(3, state.lives)) : "—";
        DOME.bombCount.textContent = String(state.bombs);
        DOME.bombBtn.disabled = state.bombs <= 0 || state.mode !== "playing";
        DOME.muteBtn.textContent = state.muted ? "🔇" : "🔊";
        DOME.muteBtn.setAttribute("aria-label", state.muted ? "Unmute sound" : "Mute sound");
        DOME.pauseBtn.textContent = state.mode === "paused" ? "▶" : "⏸";
        DOME.pauseBtn.setAttribute("aria-label", state.mode === "paused" ? "Resume game" : "Pause game");
        if (DOME.overlaySound) DOME.overlaySound.textContent = state.muted ? "🔇 SOUND OFF" : "🔊 SOUND ON";

        const parts = [];
        if (state.spreadTime > 0) parts.push("S " + Math.ceil(state.spreadTime) + "s");
        if (state.rapidTime > 0) parts.push("R " + Math.ceil(state.rapidTime) + "s");
        if (state.pierceTime > 0) parts.push("P " + Math.ceil(state.pierceTime) + "s");
        if (state.homingTime > 0) parts.push("H " + Math.ceil(state.homingTime) + "s");
        if (state.multishotTime > 0) parts.push("M " + Math.ceil(state.multishotTime) + "s");
        if (state.laserTime > 0) parts.push("L " + Math.ceil(state.laserTime) + "s");
        if (state.overdriveTime > 0) parts.push("O " + Math.ceil(state.overdriveTime) + "s");
        if (state.timeDilationTime > 0) parts.push("T " + Math.ceil(state.timeDilationTime) + "s");
        if (state.magnetTime > 0) parts.push("G " + Math.ceil(state.magnetTime) + "s");
        if (state.scrapTime > 0) parts.push("C " + Math.ceil(state.scrapTime) + "s");
        if (state.shield) parts.push("SHIELD");
        if (parts.length > 0) {
            DOME.powerStatus.textContent = parts.join(" · ");
            DOME.powerStatus.classList.add("active");
        } else {
            DOME.powerStatus.textContent = "DRAG TO FLY · AUTO-FIRE";
            DOME.powerStatus.classList.remove("active");
        }
    }

    function showStartOverlay() {
        DOME.overlayTitle.textContent = "PLANE ARCADE";
        DOME.overlayMsg.textContent = "Drag to fly. Auto-fire. Survive.";
        DOME.overlayStats.classList.add("hidden");
        DOME.overlayBadge.classList.add("hidden");
        DOME.overlayPlay.textContent = "▶ PLAY";
        DOME.overlayRestart.classList.add("hidden");
        DOME.overlay.classList.remove("hidden");
        updateHUD();
    }

    function showPauseOverlay(auto) {
        DOME.overlayTitle.textContent = "PAUSED";
        DOME.overlayMsg.textContent = auto ? "Game paused while you were away." : "Take a breath. The sky can wait.";
        DOME.overlayStats.classList.add("hidden");
        DOME.overlayBadge.classList.add("hidden");
        DOME.overlayPlay.textContent = "▶ RESUME";
        DOME.overlayRestart.classList.remove("hidden");
        DOME.overlay.classList.remove("hidden");
        updateHUD();
    }

    function showGameOverOverlay() {
        DOME.overlayTitle.textContent = "GAME OVER";
        DOME.overlayMsg.textContent = state.newHighScore ? "New personal best. The sky is yours." : "The sky wins this round.";
        DOME.overlayStats.classList.remove("hidden");
        DOME.finalScore.textContent = String(state.score);
        DOME.finalHigh.textContent = String(state.highScore);
        DOME.finalWave.textContent = String(state.wave);
        DOME.overlayBadge.classList.toggle("hidden", !state.newHighScore);
        DOME.overlayPlay.textContent = "▶ PLAY AGAIN";
        DOME.overlayRestart.classList.add("hidden");
        DOME.overlay.classList.remove("hidden");
        updateHUD();
    }

    function hideOverlay() {
        DOME.overlay.classList.add("hidden");
    }

    /* ===== Hangar ===== */
    function showHangar() {
        DOME.hangarOverlay = DOME.hangarOverlay || document.getElementById("hangar-overlay");
        DOME.hangarContent = DOME.hangarContent || document.getElementById("hangar-content");
        renderHangar();
        DOME.hangarOverlay.classList.remove("hidden");
    }

    function hideHangar() {
        if (DOME.hangarOverlay) DOME.hangarOverlay.classList.add("hidden");
    }

    function renderHangar() {
        const content = DOME.hangarContent;
        const activeTab = content.querySelector(".hangar-tab.active")?.dataset.tab || "loadout";
        content.innerHTML = `
            <div class="hangar-section ${activeTab === 'loadout' ? 'active' : ''}" data-tab="loadout">${renderLoadout()}</div>
            <div class="hangar-section ${activeTab === 'medals' ? 'active' : ''}" data-tab="medals">${renderMedals()}</div>
            <div class="hangar-section ${activeTab === 'missions' ? 'active' : ''}" data-tab="missions">${renderMissions()}</div>
            <div class="hangar-section ${activeTab === 'career' ? 'active' : ''}" data-tab="career">${renderCareer()}</div>
            <div class="hangar-section ${activeTab === 'weekly' ? 'active' : ''}" data-tab="weekly">${renderWeekly()}</div>
        `;
        content.querySelectorAll(".hangar-tab").forEach(btn => {
            btn.addEventListener("click", () => switchHangarTab(btn.dataset.tab));
        });
        content.querySelectorAll(".loadout-slot select").forEach(sel => {
            sel.addEventListener("change", (e) => changeLoadout(e.target.dataset.slot, e.target.value));
        });
    }

    function switchHangarTab(tab) {
        DOME.hangarContent.querySelectorAll(".hangar-tab").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.tab === tab);
        });
        DOME.hangarContent.querySelectorAll(".hangar-section").forEach(sec => {
            sec.classList.toggle("active", sec.dataset.tab === tab);
        });
    }

    function renderLoadout() {
        const abilities = Object.keys(ABILITY_DEFS);
        const wingmen = Object.keys(WINGMAN_DEFS);
        const abilityOptions = abilities.map(id => {
            const def = ABILITY_DEFS[id];
            const unlocked = state.career.abilities[id];
            return `<option value="${id}" ${state.equippedAbilities.includes(id) ? "selected" : ""} ${!unlocked ? "disabled" : ""}>${def.name}${!unlocked ? " 🔒" : ""}</option>`;
        }).join("");
        const wingmanOptions = wingmen.map(id => {
            const def = WINGMAN_DEFS[id];
            const unlocked = state.career.wingmen[id];
            return `<option value="${id}" ${state.equippedWingmen.includes(id) ? "selected" : ""} ${!unlocked ? "disabled" : ""}>${def.name}${!unlocked ? " 🔒" : ""}</option>`;
        }).join("");

        return `
            <div class="loadout-grid">
                <div class="loadout-slot ${state.equippedAbilities[0] ? "" : "empty"}">
                    <label>ABILITY 1</label>
                    <select data-slot="ability-0">${abilityOptions}</select>
                    ${state.equippedAbilities[0] ? `<div class="ability-desc">${ABILITY_DEFS[state.equippedAbilities[0]].desc}</div>` : `<div class="locked">Unlock via medals</div>`}
                </div>
                <div class="loadout-slot ${state.equippedAbilities[1] ? "" : "empty"}">
                    <label>ABILITY 2</label>
                    <select data-slot="ability-1">${abilityOptions}</select>
                    ${state.equippedAbilities[1] ? `<div class="ability-desc">${ABILITY_DEFS[state.equippedAbilities[1]].desc}</div>` : `<div class="locked">Unlock via medals</div>`}
                </div>
                <div class="loadout-slot ${state.equippedWingmen[0] ? "" : "empty"}">
                    <label>WINGMAN 1</label>
                    <select data-slot="wingman-0">${wingmanOptions}</select>
                    ${state.equippedWingmen[0] ? `<div class="wingman-desc">${WINGMAN_DEFS[state.equippedWingmen[0]].desc}</div>` : `<div class="locked">Unlock via medals</div>`}
                </div>
                <div class="loadout-slot ${state.equippedWingmen[1] ? "" : "empty"}">
                    <label>WINGMAN 2</label>
                    <select data-slot="wingman-1">${wingmanOptions}</select>
                    ${state.equippedWingmen[1] ? `<div class="wingman-desc">${WINGMAN_DEFS[state.equippedWingmen[1]].desc}</div>` : `<div class="locked">Unlock via medals</div>`}
                </div>
            </div>
            <p style="font-size:0.6rem;opacity:0.6;margin-top:10px;text-align:center;">Tokens: ${state.career.tokens}</p>
        `;
    }

    function changeLoadout(slot, value) {
        if (slot.startsWith("ability")) {
            const idx = parseInt(slot.split("-")[1]);
            if (value && !state.career.abilities[value]) return;
            state.equippedAbilities[idx] = value;
        } else {
            const idx = parseInt(slot.split("-")[1]);
            if (value && !state.career.wingmen[value]) return;
            state.equippedWingmen[idx] = value;
        }
        saveStorage();
        renderHangar();
    }

    function renderMedals() {
        return Object.entries(MEDAL_DEFS).map(([id, medal]) => {
            const unlocked = state.career.medals[id];
            const tier = medal.tier || 1;
            return `
                <div class="medal-card ${unlocked ? "" : "locked"} tier-${tier}">
                    ${medal.hidden && !unlocked ? "" : `
                        <div class="medal-tier t${tier}">T${tier}</div>
                        <div class="medal-icon">${getMedalIcon(id)}</div>
                        <div class="medal-name">${medal.name}</div>
                        <div class="medal-desc">${medal.desc}</div>
                    `}
                </div>
            `;
        }).join("");
    }

    function getMedalIcon(id) {
        const icons = {
            firstBlood: "🩸", centurion: "💯", annihilator: "💀", bossSlayer: "👑", perfectWave: "🌊", comboMaster: "🔗",
            phoenix: "🔥", ironWill: "🛡️", immortal: "♾️", pacifist: "☮️", shieldBearer: "🛡️",
            hoarder: "📦", magnetMedal: "🧲", alchemist: "⚗️",
            sniperMedal: "🎯", speedrun: "⚡", noBombRun: "🚫", oneLifeWonder: "❤️",
            dailyStreak7: "📅", dailyStreak30: "🗓️", weeklyTop10: "🏆", challengeChamp: "🥇",
            firstAlly: "🤖", survivor: "💪", bloodletter: "🩸", speedDemon: "💨", ghost: "👻", collector: "💎"
        };
        return icons[id] || "🏅";
    }

    function renderMissions() {
        const daily = getDailyMission();
        let html = `<h4 style="color:var(--neon);margin-bottom:8px;font-size:0.7rem;">DAILY MISSION</h4>`;
        if (daily) {
            const progress = state.missionProgress.daily[daily.id] || 0;
            const pct = Math.min(100, (progress / daily.target) * 100);
            html += `
                <div class="mission-card ${daily.claimed ? "completed" : ""}">
                    <div class="mission-header">
                        <span class="mission-name">${daily.name}</span>
                        <span class="mission-reward">+${daily.reward} 🪙</span>
                    </div>
                    <div class="mission-desc">${daily.desc}</div>
                    <div class="mission-progress"><div class="mission-progress-bar" style="width:${pct}%"></div></div>
                    <div class="mission-progress-text">${Math.min(progress, daily.target)} / ${daily.target}</div>
                </div>
            `;
        }
        html += `<h4 style="color:var(--neon);margin:16px 0 8px;font-size:0.7rem;">CAREER MISSIONS</h4>`;
        html += MISSION_DEFS.career.map(m => {
            const completedTiers = state.missionProgress.career[m.id] || 0;
            const statValue = state.career[m.stat] || 0;
            const nextTier = m.tiers[completedTiers];
            const nextTarget = nextTier || m.tiers[m.tiers.length - 1];
            const pct = Math.min(100, (statValue / nextTarget) * 100);
            return `
                <div class="mission-card ${completedTiers >= m.tiers.length ? "completed" : ""}">
                    <div class="mission-header">
                        <span class="mission-name">${m.name} (${completedTiers}/${m.tiers.length})</span>
                        <span class="mission-reward">${m.rewards[completedTiers] || m.rewards[m.rewards.length-1]} 🪙</span>
                    </div>
                    <div class="mission-desc">${m.desc}</div>
                    <div class="mission-progress"><div class="mission-progress-bar" style="width:${pct}%"></div></div>
                    <div class="mission-progress-text">${statValue} / ${nextTarget}</div>
                </div>
            `;
        }).join("");
        return html;
    }

    function renderCareer() {
        const c = state.career;
        const sector = SECTOR_DEFS[c.sector] || SECTOR_DEFS[SECTOR_DEFS.length - 1];
        const sectorPct = Math.min(100, ((c.waves % 20) / 20) * 100);
        return `
            <div class="career-stats">
                <div class="career-tokens">
                    <div class="career-stat-value">${c.tokens}</div>
                    <div class="career-stat-label">MISSION TOKENS</div>
                </div>
                <div class="career-stat">
                    <div class="career-stat-value">${c.kills}</div>
                    <div class="career-stat-label">TOTAL KILLS</div>
                </div>
                <div class="career-stat">
                    <div class="career-stat-value">${c.waves}</div>
                    <div class="career-stat-label">WAVES CLEARED</div>
                </div>
                <div class="career-stat">
                    <div class="career-stat-value">${c.bosses}</div>
                    <div class="career-stat-label">BOSSES DEFEATED</div>
                </div>
                <div class="career-stat">
                    <div class="career-stat-value">${c.powerups}</div>
                    <div class="career-stat-label">POWER-UPS</div>
                </div>
                <div class="career-stat">
                    <div class="career-stat-value">${Math.floor(c.distance / 1000)}K</div>
                    <div class="career-stat-label">DISTANCE</div>
                </div>
                <div class="career-stat">
                    <div class="career-stat-value">${c.noHitWaves}</div>
                    <div class="career-stat-label">NO-HIT WAVES</div>
                </div>
                <div class="career-stat">
                    <div class="career-stat-value">${Object.keys(c.medals).length}/30</div>
                    <div class="career-stat-label">MEDALS</div>
                </div>
                <div class="sector-progress">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <span style="font-size:0.6rem;">CURRENT SECTOR: ${sector.name}</span>
                        <span style="font-size:0.6rem;color:var(--neon);">${c.waves % 20}/20</span>
                    </div>
                    <div class="sector-bar"><div class="sector-bar-fill" style="width:${sectorPct}%"></div></div>
                </div>
                ${c.ngPlus > 0 ? `<div class="career-stat" style="grid-column:span 2;border-color:#ffd700;">
                    <div class="career-stat-value" style="color:#ffd700;">NEW GAME +${c.ngPlus}</div>
                    <div class="career-stat-label">PRESTIGE LEVEL</div>
                </div>` : ""}
            </div>
        `;
    }

    function renderWeekly() {
        const weekNum = Math.floor(Date.now() / 604800000);
        const hasRun = state.weeklySeed > 0;
        const completed = hasRun && state.weeklyChallengeWaveIndex >= 15;
        return `
            <div style="text-align:center;margin-bottom:16px;">
                <h4 style="color:var(--neon);font-size:0.7rem;margin-bottom:4px;">WEEKLY CHALLENGE #${weekNum}</h4>
                <p style="font-size:0.6rem;opacity:0.7;">Fixed seed · 15 waves · One shot · Global leaderboard</p>
            </div>
            ${!hasRun ? `
                <div class="mission-card" style="text-align:center;padding:24px 16px;">
                    <div style="font-size:2rem;margin-bottom:8px;">🏆</div>
                    <div style="font-size:0.8rem;font-weight:bold;margin-bottom:4px;">NEW CHALLENGE AVAILABLE</div>
                    <div style="font-size:0.6rem;opacity:0.7;margin-bottom:16px;">Same seed for everyone. Compete for the top score.</div>
                    <button class="btn primary" type="button" onclick="window.PlaneArcadeDebug?.startWeeklyChallenge?.()">▶ START WEEKLY</button>
                </div>
            ` : completed ? `
                <div class="mission-card completed" style="text-align:center;padding:24px 16px;">
                    <div style="font-size:2rem;margin-bottom:8px;">✅</div>
                    <div style="font-size:0.8rem;font-weight:bold;color:var(--neon);margin-bottom:4px;">CHALLENGE COMPLETE</div>
                    <div style="font-size:0.7rem;margin-bottom:4px;">Final Score: <span style="color:var(--neon);">${state.score}</span></div>
                    <div style="font-size:0.7rem;margin-bottom:4px;">Wave Reached: <span style="color:var(--neon);">${state.wave}/15</span></div>
                    <div style="font-size:0.6rem;opacity:0.7;margin-top:8px;">+100 Tokens awarded</div>
                </div>
            ` : `
                <div class="mission-card" style="text-align:center;padding:24px 16px;">
                    <div style="font-size:2rem;margin-bottom:8px;">⏳</div>
                    <div style="font-size:0.8rem;font-weight:bold;margin-bottom:4px;">IN PROGRESS</div>
                    <div style="font-size:0.7rem;margin-bottom:4px;">Current Score: <span style="color:var(--neon);">${state.score}</span></div>
                    <div style="font-size:0.7rem;margin-bottom:4px;">Wave: <span style="color:var(--neon);">${state.wave}/15</span></div>
                    <div style="font-size:0.6rem;opacity:0.7;margin-top:8px;">Continue your run from the main menu</div>
                </div>
            `}
            <div style="margin-top:16px;padding:12px;background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:8px;font-size:0.55rem;opacity:0.7;">
                <strong>Rules:</strong> No continues · Fixed power-up spawns · Same enemies for all players · Score submitted to global leaderboard
            </div>
        `;
    }

    function toggleMute() {
        state.muted = !state.muted;
        saveStorage();
        updateHUD();
        if (!state.muted) sfx("wave");
    }

    /* ===== PWA ===== */
    function setupServiceWorker() {
        if (!("serviceWorker" in navigator) || !navigator.serviceWorker) return;
        if (!/^https?:$/.test(location.protocol)) return;
        navigator.serviceWorker.register("./service-worker.js").catch(function () { /* offline still works after first load */ });
    }

    function setupInstallPrompt() {
        if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return;
        if (navigator.standalone) return;
        window.addEventListener("beforeinstallprompt", function (event) {
            event.preventDefault();
            state.deferredPrompt = event;
            if (state.mode === "gameover" && !state.installDismissed) {
                DOME.installPrompt.classList.remove("hidden");
            }
        });
        window.addEventListener("appinstalled", function () {
            state.deferredPrompt = null;
            DOME.installPrompt.classList.add("hidden");
        });
    }

    function installApp() {
        DOME.installPrompt.classList.add("hidden");
        if (!state.deferredPrompt) return;
        const prompt = state.deferredPrompt;
        state.deferredPrompt = null;
        try {
            prompt.prompt();
            if (prompt.userChoice && prompt.userChoice.then) prompt.userChoice.then(function () {});
        } catch (err) { /* ignore */ }
    }

    function dismissInstall() {
        DOME.installPrompt.classList.add("hidden");
        state.installDismissed = true;
        saveStorage();
    }

    /* ===== Init ===== */
    function init() {
        cacheDom();
        state.debug = /(?:^|[?&])debug=1(?:&|$)/.test(location.search);
        state.reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        loadStorage();

        setupCanvas();
        resizeCanvas();
        applyTheme(state.theme);
        setupInput();
        setupServiceWorker();
        setupInstallPrompt();

        DOME.pauseBtn.addEventListener("click", function () {
            if (state.mode === "playing") pauseGame(false);
            else if (state.mode === "paused") resumeGame();
        });
        DOME.muteBtn.addEventListener("click", toggleMute);
        DOME.bombBtn.addEventListener("click", useBomb);
        DOME.bombBtn.addEventListener("mousedown", function () { state.bombHoldStart = Date.now(); });
        DOME.bombBtn.addEventListener("mouseup", function () { 
            if (state.bombHoldStart && Date.now() - state.bombHoldStart > 500) tryRecall(); 
            state.bombHoldStart = 0; 
        });
        DOME.bombBtn.addEventListener("mouseleave", function () { state.bombHoldStart = 0; });
        DOME.bombBtn.addEventListener("touchstart", function () { state.bombHoldStart = Date.now(); });
        DOME.bombBtn.addEventListener("touchend", function () { 
            if (state.bombHoldStart && Date.now() - state.bombHoldStart > 500) tryRecall(); 
            state.bombHoldStart = 0; 
        });
        DOME.overlayPlay.addEventListener("click", function () {
            if (state.mode === "paused") resumeGame();
            else startGame();
        });
        DOME.overlayRestart.addEventListener("click", startGame);
        DOME.overlayWeekly.addEventListener("click", function() {
            if (state.mode === "menu") startWeeklyChallenge();
            else if (state.mode === "weekly") showHangar();
        });
        DOME.overlayTheme.addEventListener("click", cycleTheme);
        DOME.overlaySound.addEventListener("click", toggleMute);
        DOME.overlayHangar.addEventListener("click", showHangar);
        DOME.hangarClose.addEventListener("click", hideHangar);
        DOME.installBtn.addEventListener("click", installApp);
        DOME.installLater.addEventListener("click", dismissInstall);

        if (state.debug) {
            DOME.debug.classList.remove("hidden");
            window.PlaneArcadeDebug = {
                state: state,
                startGame: startGame,
                useBomb: useBomb,
                beginWave: beginWave,
                spawnBoss: spawnBoss,
                pauseGame: pauseGame,
                resumeGame: resumeGame,
                cycleTheme: cycleTheme,
                toggleMute: toggleMute,
                updateHUD: updateHUD,
                checkMedals: checkMedals,
                getDailyMission: getDailyMission,
                updateMissions: updateMissions,
                startWeeklyChallenge: startWeeklyChallenge,
                resetGame: resetGame,
            };
        }

        if (Arcade && typeof Arcade.markPlayed === "function") {
            try { Arcade.markPlayed(SLUG); } catch (err) { /* ignore */ }
        }
        if (Arcade && typeof Arcade.trackPlaytime === "function") {
            try { Arcade.trackPlaytime(SLUG); } catch (err) { /* ignore */ }
        }

        showStartOverlay();
        updateHUD();
        startLoop();
    }

    if (document.readyState === "complete") {
        setTimeout(init, 40);
    } else {
        window.addEventListener("load", function () { setTimeout(init, 40); });
    }
})();
