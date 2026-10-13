/*
 * SECTOR 7 - shared tuning constants, palette and math helpers.
 *
 * Loaded first; every other module reads from window.S7. Balance passes edit
 * this file, not the systems.
 */
(function (S) {
    "use strict";

    /* ===== Projection =====
     * Oblique, not true isometric: world +x is screen right, world +y is
     * screen down (squashed), world +z is screen up. The map never rotates,
     * so north stays north on screen and lining up the blaster never fights
     * the camera.
     *
     * That map is linear, so a constant 3D face normal maps to a constant
     * screen gradient - which is precisely what flat shading needs. One dot
     * product per face, no per-pixel lighting.
     */
    S.PROJ = {
        ySquash: 0.62,
        zTilt: 0.82,
        /* Height also shears sideways. Without this, faces pointing along x
         * project to exactly zero width and every box renders as two
         * polygons and an outline; with it, one side face opens up and solids
         * read as solids. */
        yaw: 0.45,
    };

    /* Direction from the scene toward the camera, derived from the three
     * projection axes above. A face is front-facing when its normal points
     * this way, and a point's occlusion key is its dot product with it.
     * Renderer and world share these numbers so sorting can never disagree
     * with what is actually visible. */
    (function (P) {
        P.viewX = -P.yaw * P.ySquash;
        P.viewY = P.zTilt;
        P.viewZ = P.ySquash;
    })(S.PROJ);

    /* Key light, world space. Roughly normalised; used for face shading. */
    S.LIGHT = [-0.45, -0.6, 0.66];

    S.CONFIG = {
        world: {
            size: 4800,
            station: { x: 2400, y: 2400 },

            /* Nothing spawns inside this radius: a station you can never
             * escape a firefight in is worse than a slightly emptier map. */
            clearRadius: 470,
            /* The station's own disc is 152 units across its radius, so the
             * dock ring has to sit outside that or the ring is drawn on top
             * of the structure and reads as nothing at all. */
            dockRadius: 205,
            dockTime: 1.5,
            /* Docking is not free. The fee is charged on undocking, which is
             * when Darkorbit-style players feel it. */
            dockFeeRate: 0.04,
            dockFeeMin: 12,

            /* Harvestable destructibles, and the loose energy crates. */
            targets: 32,
            targetRespawn: 15,
            crates: 24,
            /* Was 8s, which meant the map never ran dry: once a player knew
             * three good crate spots, combat was optional. Crates are a
             * top-up now, not the economy. */
            crateRespawn: 30,
            crateValue: 60,
            crateValueJitter: 25,

            pickupTTL: 26,
            pickupMagnet: 120,
            pickupRadius: 30,
            deathRespawn: 3.0,
        },

        player: {
            startEnergy: 250,
            /* Per the genre: energy is lost with the wreck and has to be
             * collected again. Crystals are the safe, persistent score. */
            energyDropFraction: 1.0,
            hitFlashTime: 0.18,
            invulnOnSpawn: 2.5,
        },

        combat: {
            bulletSpeed: 620,
            bulletLife: 1.1,
            bulletRadius: 4,
            npcBulletRadius: 5,
            /* Soft auto-aim: the blaster tracks a target inside this cone
             * without ever taking the steering away from the player. */
            aimCone: Math.PI / 4,
            /* Kept inside the fitted view span: the turret should never snap
             * onto something the player cannot see. */
            aimAssistRange: 430,
        },

        npc: {
            maxAlive: 13,
            spawnInterval: 3.4,
            /* Tiers above this are never rolled, however rich you get. */
            maxTier: 8,
            thinkInterval: 0.11,
            fleeHullFrac: 0.26,
            /* The band an attacker tries to hold. Deliberately well inside
             * the aggro range below, or an NPC would reacquire a target and
             * immediately drop it again the moment it arrived. */
            preferredRange: 190,
        },

        /* Energy is the upgrade currency; crystals are progress + score and
         * drive which NPC tiers the sector rolls. */
        economy: {
            energyPerKill: 1.0,
            crystalsPerKill: 1.0,
            /* Crystals earned -> the highest NPC tier the sector will spawn.
             * This has to track the energy curve. At 190 the sector took
             * nearly four hours to escalate while a ship took 45 minutes to
             * max out, so you finished the game hours before it noticed. */
            tierStep: 45,
        },

        camera: {
            /* The camera is fitted to the viewport instead of being a fixed
             * zoom, so a phone and a desktop frame the same slice of the
             * sector. A fixed zoom that reads well on a phone shows three
             * times the world on a monitor, and a fixed zoom that reads well
             * on a monitor makes phones fight inside a letterbox. */
            viewSpan: 900,
            zoomMin: 0.34,
            zoomMax: 1.15,
            lead: 0.34,
            shakeDecay: 5.0,
        },

        pools: {
            bullets: 360,
            missiles: 120,
            mines: 40,
            pickups: 320,
            particles: 420,
            floaters: 40,
        },

        quality: {
            /* Sampled over the first N frames to pick a tier on weak phones. */
            sampleFrames: 90,
            slowFrameMs: 23,
            tiers: {
                high: { stars: 3, particles: 1.0, outlines: true, nebula: true },
                medium: { stars: 2, particles: 0.55, outlines: true, nebula: true },
                low: { stars: 1, particles: 0.25, outlines: false, nebula: false },
            },
        },
    };

    /* ===== Modules =====
     * Five upgrade tracks, levels 1..10. Level 1 is free and is what you
     * respawn with, so there is never a dead end.
     */
    S.MODULES = [
        {
            key: "blaster", name: "Blaster", glyph: "⌖",
            base: 30, mul: 1.44,
            blurb: "Bigger hits, shorter gaps between shots.",
        },
        {
            key: "shield", name: "Shield", glyph: "◈",
            base: 34, mul: 1.44,
            blurb: "More hull, and a faster out-of-combat trickle-back.",
        },
        {
            key: "armor", name: "Armor", glyph: "▤",
            base: 40, mul: 1.46,
            blurb: "Flat damage cut. Useless against swarms, decisive against elites.",
        },
        {
            key: "processor", name: "Processor", glyph: "◎",
            base: 36, mul: 1.46,
            blurb: "Lifts the energy you pull out of every wreck.",
        },
        {
            key: "thruster", name: "Thruster", glyph: "➤",
            base: 26, mul: 1.40,
            blurb: "Raw speed and a tighter turn.",
        },
        {
            key: "missiles", name: "Missiles", glyph: "⋀",
            base: 70, mul: 1.46,
            blurb: "Lock-on burst. The answer to armour: burst damage ignores it.",
        },
        {
            key: "mines", name: "Mines", glyph: "◉",
            base: 45, mul: 1.44,
            blurb: "Drop proximity mines. The only defence that works while you flee.",
        },
    ];

    S.MODULE_MAX = 10;

    /* ===== Refits =====
     * The crystal sink. Crystals used to be pure score, which meant the only
     * thing they did was make the sector harder - a number going up with no
     * choice attached to it. Refits are permanent, non-stackable-with-
     * everything purchases, and each one changes how the rest of the game
     * behaves rather than adding a bigger number to a stat.
     */
    S.REFITS = [
        {
            key: "salvage", name: "Salvage Rig", glyph: "⌾", max: 3,
            cost: [180, 520, 1400],
            blurb: "Recovers part of the energy you lose when you are wrecked.",
            detail: function (n) { return Math.round(14 * n) + "% of lost energy recovered"; },
        },
        {
            key: "hull", name: "Frame Plating", glyph: "▦", max: 3,
            cost: [150, 430, 1150],
            blurb: "Bolted-on plate. Permanent, applies to every rebuild.",
            detail: function (n) { return "+" + (4 * n) + "% max hull"; },
        },
        {
            key: "tow", name: "Tractor Field", glyph: "⊂", max: 2,
            cost: [220, 640],
            blurb: "Pulls loot in from further away.",
            detail: function (n) { return "+" + (35 * n) + "% pickup radius"; },
        },
        {
            key: "survey", name: "Survey Suite", glyph: "⊞", max: 2,
            cost: [260, 720],
            blurb: "Better contract terms from the station.",
            detail: function (n) { return "contracts pay +" + (20 * n) + "%"; },
        },
        {
            key: "broker", name: "Broker Contact", glyph: "§", max: 2,
            cost: [300, 820],
            blurb: "Bounties on your head are worth more to everyone.",
            detail: function (n) { return "bounty value +" + (30 * n) + "%"; },
        },
    ];

    S.refitLevel = function (refits, key) {
        var v = refits && refits[key];
        return Number.isFinite(v) ? S.clamp(Math.floor(v), 0, S.MODULE_MAX) : 0;
    };

    S.refitCost = function (key, level) {
        for (var i = 0; i < S.REFITS.length; i++) {
            if (S.REFITS[i].key !== key) continue;
            var r = S.REFITS[i];
            if (level >= r.max) return Infinity;
            return r.cost[Math.min(level, r.cost.length - 1)];
        }
        return Infinity;
    };

    /* Safe level read. A save written before a track existed has no entry
     * for it, and reading undefined here produced NaN prices and NaN tiers
     * rather than a missing module. */
    S.moduleLevel = function (modules, key) {
        var v = modules && modules[key];
        return Number.isFinite(v) ? S.clamp(Math.floor(v), 1, S.MODULE_MAX) : 1;
    };

    S.moduleIndex = function (key) {
        for (var i = 0; i < S.MODULES.length; i++) if (S.MODULES[i].key === key) return i;
        return -1;
    };

    /* Price of the *next* level, given the level you already own. */
    S.moduleCost = function (key, level) {
        var m = null;
        for (var i = 0; i < S.MODULES.length; i++) {
            if (S.MODULES[i].key === key) { m = S.MODULES[i]; break; }
        }
        if (!m || level >= S.MODULE_MAX) return Infinity;
        return Math.round(m.base * Math.pow(m.mul, level - 1));
    };

    /* Total cost of taking a fresh level-1 ship to `level` on every track. */
    S.shipCost = function (level) {
        var total = 0;
        for (var i = 0; i < S.MODULES.length; i++) {
            for (var lv = 1; lv < level; lv++) {
                total += S.moduleCost(S.MODULES[i].key, lv);
            }
        }
        return total;
    };

    /* ===== Derived ship stats =====
     * One place that turns module levels into the numbers the sim reads, so
     * the station screen and the physics can never disagree.
     */
    S.statsFor = function (lv, refits) {
        /* `lv` may come from an older save that predates the missiles and
         * mines tracks; treat a missing level as 1 rather than NaN. */
        var g = function (k) { return S.moduleLevel(lv, k); };
        return {
            damage: 3 + g("blaster") * 2.3,
            fireInterval: Math.max(0.1, 0.44 - g("blaster") * 0.032),
            /* Missiles: a burst rather than a stream. Count and per-missile
             * damage scale together, so the track keeps mattering at level 10
             * instead of being a one-shot unlock. */
            missiles: Math.round(g("missiles") * 0.9),
            missileDamage: 6 + g("missiles") * 5.5,
            missileCooldown: Math.max(1.1, 6.5 - g("missiles") * 0.55),
            /* Mines: how many fit in the field and how much one hurts. */
            mineCapacity: Math.round(g("mines") * 0.8),
            mineDamage: 10 + g("mines") * 8,
            mineRadius: 90 + g("mines") * 8,
            mineSpeed: 118,
            mineCooldown: Math.max(0.7, 3.2 - g("mines") * 0.25),
            /* Frame Plating is multiplicative on purpose: it stays the
             * cheapest-per-point option once Shield is invested in, which is
             * the decision a player is actually making. */
            maxHull: Math.round((58 + g("shield") * 27) * (1 + S.refitLevel(refits, "hull") * 0.04)),
            /* Regen only trickles back once Shield 3 is fitted, so the first
             * two shield levels feel like the real purchases. */
            regen: g("shield") >= 3 ? 0.9 + (g("shield") - 2) * 0.75 : 0.55,
            /* Flat cut, deliberately allowed to exceed a cheap NPC's whole
             * shot - armour is an anti-elite tool, not an anti-tier-1 tool. */
            reduction: g("armor") * 3.4,
            energyBonus: 1 + g("processor") * 0.075,
            speed: 122 + g("thruster") * 7.5,
            turn: 3.0 + g("thruster") * 0.17,
        };
    };

    S.levelSum = function (lv) {
        var n = 0;
        for (var i = 0; i < S.MODULES.length; i++) n += S.moduleLevel(lv, S.MODULES[i].key);
        return n;
    };

    /* Tier 1..5 over levels 5..50. Feeds the "sector escalation" readout. */
    S.tierForShip = function (lv) {
        return S.clamp(1 + Math.floor((S.levelSum(lv) - 5) / 15.5), 1, 5);
    };

    /* Highest NPC tier the sector will roll, given lifetime crystals. */
    S.tierForCrystals = function (crystals) {
        return S.clamp(
            1 + Math.floor(crystals / S.CONFIG.economy.tierStep),
            1, S.CONFIG.npc.maxTier
        );
    };

    /* ===== NPC tiers =====
     * One table drives hull, damage, speed and payout, so a new tier is a
     * single row and the AI never has to know the formula.
     */
    S.NPC_TIERS = [
        null,
        { name: "Scrap Drone",   hull: 34,  damage: 2.2, speed: 104, turn: 2.3, fire: 0.58, aim: 0.30, hull_px: 13 },
        { name: "Raider",        hull: 58,  damage: 3.3, speed: 112, turn: 2.4, fire: 0.53, aim: 0.26, hull_px: 15 },
        { name: "Corsair",       hull: 92,  damage: 4.8, speed: 119, turn: 2.5, fire: 0.47, aim: 0.22, hull_px: 17 },
        { name: "Interceptor",   hull: 142, damage: 6.8, speed: 125, turn: 2.7, fire: 0.42, aim: 0.18, hull_px: 19 },
        { name: "Frigate",       hull: 214, damage: 9.4, speed: 130, turn: 2.9, fire: 0.37, aim: 0.15, hull_px: 22 },
        { name: "Dreadnought",   hull: 318, damage: 13.0, speed: 133, turn: 3.1, fire: 0.33, aim: 0.12, hull_px: 25 },
        { name: "Warlord",       hull: 452, damage: 17.5, speed: 137, turn: 3.3, fire: 0.29, aim: 0.10, hull_px: 28 },
        { name: "Reaper",        hull: 640, damage: 23.5, speed: 141, turn: 3.5, fire: 0.25, aim: 0.08, hull_px: 31 },
    ];

    /* The range at which an NPC will commit to a fight. It lives here rather
     * than inline in npcs.js because the render test asserts that it always
     * fits inside the fitted camera view - a duplicated literal would drift
     * the moment either side was tuned. */
    S.aggroRange = function (tier) {
        return 260 + tier * 22;
    };

    S.npcPayout = function (tier) {
        return {
            energy: Math.round(16 * Math.pow(tier, 1.28)),
            crystals: Math.round(2 + tier * 1.7),
        };
    };

    /* ===== Hull colours =====
     * Facet shading multiplies these, so they are picked a shade darker than
     * you want them to read on screen.
     */
    S.SHIP_COLORS = [
        "#e2604f", "#e8913f", "#d9c046", "#7fc45a", "#43b58c",
        "#3f9ed4", "#5a76d6", "#8a5fd0", "#c25fb0", "#d94f76",
    ];

    S.PALETTE = S.SHIP_COLORS;

    S.COLORS = {
        void: "#05070f",
        deep: "#0a1020",
        nebula: "#152242",
        grid: "#1d2b46",
        wall: "#3f6ea8",
        player: "#67e8f9",
        bullet: "#a5f3fc",
        npcBullet: "#ffb45e",
        energy: "#ffd166",
        crystal: "#7dd3fc",
        danger: "#ff5470",
        station: "#9fb3c8",
        stationLight: "#5eead4",
        rock: "#6b6f7a",
        rockRich: "#7c7186",
    };

    /* ===== Math helpers ===== */
    S.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
    S.lerp = function (a, b, t) { return a + (b - a) * t; };

    /* Camera shake, safe to call with no renderer attached (headless tests). */
    S.shake = function (n) {
        if (S.Render && typeof S.Render.shake === "function") S.Render.shake(n);
    };

    /* Shortest-arc angle interpolation, always in (-PI, PI]. */
    S.lerpAngle = function (a, b, t) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return a + d * t;
    };

    /* Signed shortest-arc difference from a to b. */
    S.angleDiff = function (a, b) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return d;
    };

    S.rand = function (a, b) { return a + Math.random() * (b - a); };
    S.randInt = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
    S.pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };

    S.dist2 = function (ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        return dx * dx + dy * dy;
    };

    /* Frame-rate independent smoothing factor. */
    S.damp = function (dt, halfLife) {
        return 1 - Math.pow(2, -dt / Math.max(1e-4, halfLife));
    };

    /* ===== Deterministic RNG =====
     * Used to build the sector and the NPC roster so the same named rivals
     * show up on every run, on every device.
     */
    S.mulberry32 = function (seed) {
        var t = seed >>> 0;
        return function () {
            t = (t + 0x6d2b79f5) >>> 0;
            var r = Math.imul(t ^ (t >>> 15), 1 | t);
            r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    };

    S.hashString = function (str) {
        var h = 2166136261 >>> 0;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    };

    /* Smooth value-noise wobble so bots never fly like clockwork. */
    S.wander = function (t, phase) {
        return (
            Math.sin(t * 0.53 + phase) * 1.5 +
            Math.sin(t * 0.21 + phase * 2.7) * 2.1 +
            Math.sin(t * 0.097 + phase * 4.3) * 1.1
        );
    };

    S.fmt = function (n) {
        return Math.floor(n).toLocaleString("en-US");
    };

    /* Short callsigns so killfeed lines stay readable. */
    S.CALLSIGNS = [
        "Ash", "Vex", "Nomad", "Kite", "Drift", "Slate", "Pyre", "Husk",
        "Coil", "Verge", "Null", "Talon", "Quill", "Brine", "Cinder",
    ];
    S.SUFFIX = [
        "-1", "-7", "-9", "-X", "-Z", "MK2", "MK3", "II", "III", "IV",
        ".5", ".9", "_r", "_v2", "_s",
    ];

    /* Pass a seeded rng for a reproducible callsign, omit it for a fresh one.
     * The NPC roster uses the seeded form so the same named rivals turn up
     * on every run, on every device. */
    S.randomCallsign = function (rng) {
        var r = rng || Math.random;
        return S.CALLSIGNS[(r() * S.CALLSIGNS.length) | 0] +
            S.SUFFIX[(r() * S.SUFFIX.length) | 0];
    };

})(window.S7 = window.S7 || {});