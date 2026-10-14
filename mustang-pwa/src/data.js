/*
 * Mustang PWA - data tables
 * Static configuration, palettes, enemy archetypes and the 32+32 stage tables.
 *
 * Shapes exported here:
 *   config      tuning values, all speeds in px per second, all timers in seconds
 *   difficulty  per-preset multipliers on top of every stage's own scaling
 *   themes      colour sets; art.js keys its tile caches off these objects
 *   archetypes  one entry per unit. kind: air | ground | sea | special | boss.
 *               w/h are the drawn size, r the collision radius, hp the hit
 *               points, pts the score, weight what it counts toward the
 *               shoot-down rate, art an airframe or armour shape name
 *   powerups    POW crates, keyed by the id used in the stage tables
 *   pilotRanks  score thresholds, highest first
 *   theatres    per-front roster, labels and the 32 rows of stage names
 *   allStages   the two expanded 32 stage tables, numbered 32 down to 1
 */
(function (global) {
    "use strict";

    const MUSTANG = (global.MUSTANG = global.MUSTANG || {});

    /* ===== Config ===== */
    const config = {
        reducedMotion: false,
        canvasWidth: 400,
        canvasHeight: 600,
        step: 1 / 60,
        maxFrameTime: 0.05,

        playerSpeed: 196,
        playerSpeedDiag: 140,
        shotSpeed: 520,
        shotGap: 0.085,
        playerRadius: 5.5,
        playerTopMargin: 76,
        playerBottomMargin: 22,

        loopDuration: 0.9,
        loopSpeed: 124,
        loopSteer: 0.35,
        loopsPerStage: 3,

        startLives: 3,
        maxEnemies: 22,
        maxParticles: 340,

        silentDuration: 9,
        bomberBaseScore: 2000,
        bomberComboStep: 500,
        bomberComboMax: 9000,
        formationBonus: 500,
        powBonus: 1000,
        yashichiBonus: 5000,
        loopBonus: 1000,

        scrollStart: 42,
        scrollMax: 108,
        curveSpeed: 0.018,
        shakeDecay: 7.5,
        shakeMax: 9,
        hitStopKill: 0.045,
        hitStopBoss: 0.09,
        hitStopDeath: 0.14,
        tallyAutoAdvance: 5.5,
        landingDuration: 1.6,
        seaLen: 1500,
        landLen: 2000,
        beachLen: 260,

        enemyBulletSpeed: 165,
        enemyBulletSpeedGround: 130,
    };

    /* ===== Difficulty ===== */
    const difficulty = {
        recruit: { label: "RECRUIT", speed: 0.82, hp: 0.6, fire: 0.7, bullet: 0.85, density: 0.8 },
        arcade: { label: "ARCADE", speed: 1.0, hp: 1.0, fire: 1.0, bullet: 1.0, density: 1.0 },
        ace: { label: "ACE", speed: 1.12, hp: 1.6, fire: 1.35, bullet: 1.15, density: 1.2 },
    };

    /* ===== Music ===== */
    const music = {
        tempo: 152,
        bass: [0, 0, 3, 0, 5, 3, 7, 5],
        lead: [12, 15, 19, 17, 15, 12, 10, 12],
    };

    /* ===== Themes ===== */
    const themes = {
        olive: {
            label: "Olive",
            bg: "#14180f", grid: "#232a1c", text: "#e8e4d4",
            plane: "#c8a44a", planeGrad: "#8a6d2f", planeAlt: "#aab4c4",
            bullet: "#ffe9a8", enemy: "#b03a2e", powerup: "#7fb069",
            accent: "#d4af37", accent2: "#6b7a3a",
            water: "#1d3550", waterDeep: "#14263a", foam: "#4a7fa5",
            land: "#2f3a22", landDark: "#243019", sand: "#7a6a45",
        },
        retro: {
            label: "Retro",
            bg: "#000000", grid: "#111111", text: "#f0f0f0",
            plane: "#00ffff", planeGrad: "#00ccff", planeAlt: "#ffff00",
            bullet: "#ffff00", enemy: "#ff00ff", powerup: "#00ff44",
            accent: "#00ffff", accent2: "#ff00ff",
            water: "#001a2e", waterDeep: "#000d18", foam: "#00aaff",
            land: "#0a2a00", landDark: "#061a00", sand: "#3a3a00",
        },
        night: {
            label: "Night",
            bg: "#050810", grid: "#0e1422", text: "#d6e4ff",
            plane: "#9ecbff", planeGrad: "#4a7fb5", planeAlt: "#b9d4ff",
            bullet: "#ffffff", enemy: "#ff5533", powerup: "#ffd166",
            accent: "#7fb2ff", accent2: "#2a3f66",
            water: "#0a1424", waterDeep: "#050b16", foam: "#3a5f8a",
            land: "#141a12", landDark: "#0d120c", sand: "#3a3524",
        },
        sepia: {
            label: "Sepia",
            bg: "#2b2118", grid: "#3a2e21", text: "#f0e0c0",
            plane: "#e8d5b0", planeGrad: "#b39c74", planeAlt: "#d8c49a",
            bullet: "#fff3d6", enemy: "#a4552a", powerup: "#c9a227",
            accent: "#c9a227", accent2: "#8a6d4a",
            water: "#3a3226", waterDeep: "#2a241b", foam: "#6b5f45",
            land: "#4a3d28", landDark: "#382e1e", sand: "#8a7550",
        },
    };

    /* ===== Enemy Archetypes ===== */
    const archetypes = {
        zero: {
            kind: "air", w: 17, h: 21, r: 5, hp: 1, pts: 100, weight: 1,
            speed: 152, ai: "weave", fire: 1.1, fireSpeed: 0.9, art: "radial",
        },
        fighter: {
            kind: "air", w: 20, h: 24, r: 6, hp: 2, pts: 1000, weight: 2,
            speed: 178, ai: "weave", fire: 1.5, fireSpeed: 1.0, art: "radial",
        },
        heavy: {
            kind: "air", w: 22, h: 27, r: 6.5, hp: 3, pts: 1500, weight: 3,
            speed: 138, ai: "swoop", fire: 1.9, fireSpeed: 1.0, art: "heavy",
        },
        jet: {
            kind: "air", w: 22, h: 25, r: 6, hp: 2, pts: 1500, weight: 3,
            speed: 300, ai: "cross", fire: 0.55, fireSpeed: 1.5, art: "jet",
        },
        diver: {
            kind: "air", w: 22, h: 26, r: 6, hp: 3, pts: 1500, weight: 3,
            speed: 250, ai: "dive", fire: 1.1, fireSpeed: 1.0, art: "heavy",
        },
        bomber: {
            kind: "air", w: 34, h: 38, r: 10, hp: 14, pts: 2000, weight: 6,
            speed: 92, ai: "climb", fire: 1.15, fireSpeed: 0.75, art: "bomber",
        },
        ace: {
            kind: "air", w: 20, h: 24, r: 6, hp: 4, pts: 3000, weight: 5,
            speed: 165, ai: "hunter", fire: 0.85, fireSpeed: 1.25, art: "radial",
        },
        kamikaze: {
            kind: "air", w: 19, h: 22, r: 5.5, hp: 1, pts: 800, weight: 1,
            speed: 285, ai: "suicide", fire: 0, fireSpeed: 1, art: "radial",
        },
        yashichi: {
            kind: "special", w: 16, h: 19, r: 5, hp: 1, pts: 0, weight: 4,
            speed: 68, ai: "yashichi", fire: 0, fireSpeed: 1, art: "light",
        },
        tank: {
            kind: "ground", w: 28, h: 17, r: 11, hp: 5, pts: 100, weight: 1,
            speed: 12, ai: "ground", fire: 0, fireSpeed: 1, art: "tank",
        },
        halftrack: {
            kind: "ground", w: 26, h: 16, r: 10, hp: 3, pts: 150, weight: 1,
            speed: 34, ai: "ground", fire: 0, fireSpeed: 1, art: "truck",
        },
        truck: {
            kind: "ground", w: 24, h: 14, r: 9, hp: 2, pts: 100, weight: 1,
            speed: 40, ai: "ground", fire: 0, fireSpeed: 1, art: "truck",
        },
        artillery: {
            kind: "ground", w: 26, h: 15, r: 10, hp: 4, pts: 200, weight: 2,
            speed: 6, ai: "ground", fire: 2.4, fireSpeed: 0.9, art: "gun",
        },
        flak: {
            kind: "ground", w: 24, h: 18, r: 9, hp: 4, pts: 300, weight: 2,
            speed: 0, ai: "flak", fire: 1.5, fireSpeed: 1.0, art: "flak",
        },
        radar: {
            kind: "ground", w: 22, h: 24, r: 8, hp: 3, pts: 300, weight: 2,
            speed: 0, ai: "ground", fire: 0, fireSpeed: 1, art: "radar",
        },
        ship: {
            kind: "sea", w: 44, h: 120, r: 18, hp: 26, pts: 1000, weight: 8,
            speed: 0, ai: "sea", fire: 1.7, fireSpeed: 0.8, art: "ship",
        },
        sub: {
            kind: "sea", w: 30, h: 56, r: 13, hp: 8, pts: 500, weight: 4,
            speed: 8, ai: "sea", fire: 2.2, fireSpeed: 0.85, art: "sub",
        },
        patrol: {
            kind: "sea", w: 26, h: 48, r: 11, hp: 5, pts: 400, weight: 3,
            speed: 58, ai: "patrol", fire: 1.6, fireSpeed: 1.1, art: "patrol",
        },
        boss: {
            kind: "boss", w: 96, h: 104, r: 26, hp: 120, pts: 20000, weight: 20,
            speed: 46, ai: "boss", fire: 0.9, fireSpeed: 1.0, art: "boss",
        },

        /* --- aggiunti: cinque IA nuove --- */
        charger: {
            kind: "air", w: 24, h: 28, r: 6.5, hp: 4, pts: 2000, weight: 4,
            speed: 170, ai: "charge", fire: 0.9, fireSpeed: 1.0, art: "heavy",
        },
        gunner: {
            kind: "air", w: 20, h: 24, r: 6, hp: 3, pts: 1800, weight: 3,
            speed: 120, ai: "strafe", fire: 1.1, fireSpeed: 0.9, art: "radial",
        },
        splitter: {
            kind: "air", w: 30, h: 32, r: 8, hp: 6, pts: 2500, weight: 5,
            speed: 140, ai: "weave", fire: 1.4, fireSpeed: 1.0, art: "bomber",
        },
        flanker: {
            kind: "air", w: 22, h: 26, r: 6, hp: 3, pts: 2200, weight: 4,
            speed: 230, ai: "flank", fire: 0.7, fireSpeed: 1.2, art: "light",
        },
        battery: {
            kind: "ground", w: 28, h: 16, r: 11, hp: 6, pts: 400, weight: 3,
            speed: 16, ai: "ground", fire: 1.8, fireSpeed: 0.9, art: "gun",
        },
    };

    const groundArt = ["tank", "truck", "gun", "flak", "radar"];
    const seaArt = ["ship", "sub", "patrol"];
    /* ===== Airframe Shapes ===== */
    const artShapes = {
        radial: { span: 13, sweep: 2.5, tail: 6.5, len: 13, nose: 4.4, eng: 1, prop: true, propSp: 8.5 },
        heavy: { span: 15, sweep: 1.5, tail: 7, len: 15, nose: 3.2, eng: 1, prop: true, propSp: 10 },
        bomber: { span: 26, sweep: 5, tail: 11, len: 21, nose: 4.6, eng: 2, prop: true, propSp: 15 },
        jet: { span: 15, sweep: 9, tail: 7.5, len: 15, nose: 2.8, eng: 0, prop: false, propSp: 12 },
        light: { span: 11, sweep: 3.5, tail: 5, len: 12, nose: 3.4, eng: 1, prop: true, propSp: 7.5 },
        boss: { span: 46, sweep: 9, tail: 17, len: 44, nose: 6, eng: 4, prop: true, propSp: 30 },
    };

    /* ===== Power-up Definitions ===== */
    const powerups = {
        green: { label: "FIREPOWER UP", mark: "P", color: "#4caf50", text: "#ffffff" },
        white: { label: "SMART BOMB", mark: "B", color: "#f5f5f5", text: "#111111" },
        grey: { label: "SIDE FIGHTERS", mark: "W", color: "#9e9e9e", text: "#111111" },
        orange: { label: "ENEMY GUNS JAMMED", mark: "J", color: "#ff8c1a", text: "#111111" },
        yellow: { label: "EXTRA AERIAL LOOP", mark: "L", color: "#ffd54f", text: "#111111" },
        black: { label: "1 UP", mark: "U", color: "#1c1c1c", text: "#ffffff" },
        red: { label: "1000 PTS", mark: "+", color: "#e53935", text: "#ffffff" },
    };

    /* ===== End of Stage Bonus ===== */
    const bonusTable = [
        { min: 100, label: "SPECIAL", pts: 50000 },
        { min: 95, label: "", pts: 20000 },
        { min: 90, label: "", pts: 10000 },
        { min: 85, label: "", pts: 5000 },
        { min: 80, label: "", pts: 4000 },
        { min: 70, label: "", pts: 3000 },
        { min: 60, label: "", pts: 2000 },
        { min: 50, label: "", pts: 1000 },
        { min: 0, label: "", pts: 0 },
    ];

    const pilotRanks = [
        { min: 300000, rank: "TRIPLE ACE" },
        { min: 150000, rank: "ACE" },
        { min: 60000, rank: "VETERAN" },
        { min: 20000, rank: "FIGHTER" },
        { min: 0, rank: "ROOKIE" },
    ];

    function rankFor(score) {
        for (const row of pilotRanks) {
            if (score >= row.min) return row.rank;
        }
        return pilotRanks[pilotRanks.length - 1].rank;
    }

    function bonusFor(accuracy) {
        for (const row of bonusTable) {
            if (accuracy >= row.min) return row;
        }
        return bonusTable[bonusTable.length - 1];
    }

    /* ===== Power-up Schedule ===== */
    const powPlan = {
        32: ["green"], 31: ["white"], 30: ["grey"], 29: ["red"],
        28: ["green"], 27: ["orange", "black"], 26: ["grey"], 25: ["red"],
        24: ["green"], 23: ["yellow"], 22: ["grey"], 21: ["white"],
        20: ["green", "black"], 19: ["white"], 18: ["white", "grey", "yellow"],
        17: ["yellow"], 16: ["green"], 15: ["orange", "black"], 14: ["grey"],
        13: ["yellow"], 12: ["green"], 11: ["white"], 10: ["grey"],
        9: ["yellow"], 8: ["green", "black"], 7: ["white"], 6: ["grey"],
        5: ["yellow"], 4: ["green", "black"], 3: ["white"], 2: ["grey"],
        1: ["white"],
    };

    const vFormationStages = [27, 20, 15, 8, 4];
    const yashichiStages = [29, 25, 21, 17, 13, 9, 5, 1];
    const bossStages = { 26: 1, 18: 2, 10: 3, 2: 4 };

    /* ===== Theatres ===== */
    const pacRows = [
        ["MIDWAY", "sea"], ["MIDWAY", "sea"], ["MIDWAY", "sea"], ["MIDWAY", "sea"],
        ["MARSHALL", "sea"], ["MARSHALL", "sea"], ["MARSHALL", "sea"], ["MARSHALL", "sea"],
        ["ATTU", "land"], ["ATTU", "land"], ["ATTU", "land"], ["ATTU", "land"],
        ["RABAUL", "mixed"], ["RABAUL", "mixed"], ["RABAUL", "mixed"], ["RABAUL", "mixed"],
        ["LEYTE", "sea"], ["LEYTE", "sea"], ["LEYTE", "sea"], ["LEYTE", "sea"],
        ["SAIPAN", "land"], ["SAIPAN", "land"], ["SAIPAN", "land"], ["SAIPAN", "land"],
        ["IWO JIMA", "land"], ["IWO JIMA", "land"], ["IWO JIMA", "land"], ["IWO JIMA", "land"],
        ["OKINAWA", "land"], ["OKINAWA", "land"], ["OKINAWA", "land"], ["OKINAWA", "land"],
    ];

    const eurRows = [
        ["CHANNEL", "sea"], ["CHANNEL", "sea"], ["CHANNEL", "sea"], ["CHANNEL", "sea"],
        ["NORTH SEA", "sea"], ["NORTH SEA", "sea"], ["NORTH SEA", "sea"], ["NORTH SEA", "sea"],
        ["NORMANDY", "mixed"], ["NORMANDY", "mixed"], ["NORMANDY", "mixed"], ["NORMANDY", "mixed"],
        ["BERLIN", "land"], ["BERLIN", "land"], ["BERLIN", "land"], ["BERLIN", "land"],
        ["ARDENNES", "land"], ["ARDENNES", "land"], ["ARDENNES", "land"], ["ARDENNES", "land"],
        ["RHINE", "mixed"], ["RHINE", "mixed"], ["RHINE", "mixed"], ["RHINE", "mixed"],
        ["ALPS", "land"], ["ALPS", "land"], ["ALPS", "land"], ["ALPS", "land"],
        ["VIENNA", "land"], ["VIENNA", "land"], ["VIENNA", "land"], ["VIENNA", "land"],
    ];

    const theatres = {
        overlord: {
            id: "overlord",
            name: "OPERATION OVERLORD",
            year: "1944",
            blurb: "Western Front, North Sea to the Alps. Fly the P-51 Mustang against the Luftwaffe.",
            plane: "P-51 MUSTANG",
            planeArt: "heavy",
            accent: "#c8a44a",
            sideArt: "light",
            labels: {
                zero: "Zero", fighter: "Fw 190", heavy: "Bf 109", jet: "Me 262",
                diver: "Ju 87", bomber: "He 111", ace: "Fw 190 D-9", kamikaze: "Mistel",
                tank: "Panzer IV", halftrack: "Sd.Kfz.251", truck: "Opel Blitz",
                artillery: "10.5cm leFH", flak: "Flak 88", radar: "Würzburg",
                ship: "Battleship", sub: "U-boat", patrol: "E-boat", boss: "Giant Bomber",
                charger: "Fw 190 Dive", gunner: "Stuka Stalker", splitter: "G-6 Rocket",
                flanker: "Blohm & Voss", battery: "88mm AT Gun",
            },
            rows: eurRows,
            cadence: { sea: 3.2, land: 2.6, mixed: 3.8 },
            shapes: ["line", "line", "v", "column", "stream", "echelon"],
            roster: {
                sea: ["zero", "fighter", "jet", "sub", "patrol", "ship", "kamikaze", "gunner", "flanker"],
                land: ["zero", "fighter", "jet", "ace", "tank", "halftrack", "truck", "artillery", "flak", "radar", "diver", "battery"],
                mixed: ["zero", "fighter", "jet", "ace", "heavy", "tank", "flak", "sub", "diver", "charger", "gunner", "splitter", "flanker"],
            },
        },
        rising: {
            id: "rising",
            name: "OPERATION RISING SUN",
            year: "1942",
            blurb: "South Pacific, Midway to Okinawa. Fly the A6M Zero against the USAAF.",
            plane: "A6M ZERO",
            planeArt: "radial",
            accent: "#d4af37",
            sideArt: "radial",
            labels: {
                zero: "F6F Hellcat", fighter: "P-40 Warhawk", heavy: "SB2C Helldiver",
                jet: "F4U Corsair", diver: "Dive Bomber", bomber: "B-24 Liberator",
                ace: "P-51D Mustang", kamikaze: "Kamikaze",
                tank: "M10 Tank Buster", halftrack: "Dingo Scout", truck: "Supply Truck",
                artillery: "155mm Gun", flak: "AA Battery", radar: "SC-2 Radar",
                ship: "Destroyer", sub: "PT Boat", patrol: "Patrol Boat", boss: "Super Fortress",
                charger: "Dive Bomber", gunner: "Strafing Fury", splitter: "Multi-Aircraft",
                flanker: "Turner-Hale", battery: "105mm Howitzer",
            },
            rows: pacRows,
            cadence: { sea: 2.7, land: 3.6, mixed: 3.0 },
            shapes: ["line", "v", "v", "column", "stream", "column"],
            roster: {
                sea: ["zero", "fighter", "jet", "sub", "patrol", "ship", "kamikaze", "bomber", "gunner", "flanker"],
                land: ["zero", "fighter", "jet", "ace", "tank", "halftrack", "truck", "artillery", "flak", "radar", "diver", "battery"],
                mixed: ["zero", "fighter", "jet", "ace", "heavy", "tank", "flak", "sub", "diver", "bomber", "charger", "gunner", "splitter", "flanker"],
            },
        },
    };

    /* ===== Stage Builder ===== */
    function buildStages(theatre) {
        const stages = [];
        for (let i = 0; i < 32; i++) {
            const n = 32 - i;
            const row = theatre.rows[i];
            const bossTier = bossStages[n] || 0;
            stages.push({
                n: n,
                name: row[0],
                biome: row[1],
                speed: Math.round(config.scrollStart + (32 - n) * ((config.scrollMax - config.scrollStart) / 31)),
                density: 1 + (32 - n) * 0.07,
                bossTier: bossTier,
                pows: (powPlan[n] || ["red"]).slice(),
                vFormation: vFormationStages.indexOf(n) >= 0,
                yashichi: yashichiStages.indexOf(n) >= 0,
                roster: theatre.roster[row[1]].slice(),
                cadence: theatre.cadence[row[1]],
                shapes: theatre.shapes.slice(),
            });
        }
        return stages;
    }

    const overlordStages = buildStages(theatres.overlord);
    const risingStages = buildStages(theatres.rising);

    const allStages = {
        overlord: overlordStages,
        rising: risingStages,
    };

    MUSTANG.data = {
        config: config,
        difficulty: difficulty,
        music: music,
        themes: themes,
        archetypes: archetypes,
        artShapes: artShapes,
        groundArt: groundArt,
        seaArt: seaArt,
        powerups: powerups,
        bonusTable: bonusTable,
        bonusFor: bonusFor,
        pilotRanks: pilotRanks,
        rankFor: rankFor,
        powPlan: powPlan,
        bossStages: bossStages,
        theatres: theatres,
        allStages: allStages,
    };

    if (typeof module === "object" && module.exports) {
        module.exports = MUSTANG.data;
    }
})(typeof window !== "undefined" ? window : globalThis);