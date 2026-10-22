/*
 * GULPER - shared base: tuning constants, projection, states, shaders of
 * convenience (the small math every other module reaches for), and the
 * state enums that describe what a body is doing.
 *
 * Loaded first. Balance passes edit CONFIG, not the systems.
 */
(function (S) {
    "use strict";

    /* ===== projection =====
     * Axonometric: world +x runs down-right, +y down-left, +z up. Depth is
     * x+y. Staying linear means a constant world-space normal maps to a
     * constant screen gradient, so flat shading is one dot product and
     * there is no matrix anywhere.
     */
    S.PROJ = {
        xScale: 0.82,
        yScale: 0.46,
        zScale: 0.78
    };
    /* Direction toward the camera, derived from the projection axes: a face
     * is front-facing when normal dot view is positive. */
    S.PROJ.viewX = S.PROJ.yScale;
    S.PROJ.viewY = S.PROJ.yScale;
    S.PROJ.viewZ = -S.PROJ.xScale;

    S.LIGHT = [-0.42, -0.55, 0.72];

    /* ===== state enums ===== */
    S.STATE = {
        player: {
            idle: "idle",
            gripping: "gripping",
            swallowing: "swallowing",
            stunned: "stunned",
            choking: "choking",
            downed: "downed"
        },
        prey: {
            wander: "wander",
            suspicious: "suspicious",
            flee: "flee",
            panic: "panic",
            cower: "cower",
            down: "down",
            held: "held",
            swallowed: "swallowed",
            dead: "dead"
        }
    };

    S.EFFECT = {
        stun: 1,
        corrode: 2,
        bleed: 3,
        burn: 4,
        chill: 5
    };

    /* ===== tuning ===== */
    S.CONFIG = {
        fixedStep: 1 / 60,
        maxDt: 0.05,
        maxCatchupSteps: 5,
        perfSampleFrames: 60,
        perfDowngradeMs: 22,
        perfUpgradeMs: 13,

        arena: { w: 920, h: 640 },

        /* ENDLESS NIGHT caps. The district keeps producing, but the
         * arena stays a street: without a ceiling the waves fill it
         * into a landfill and the run becomes a lockdown instead of a
         * meal. */
        endless: { preyCap: 14, foeCap: 6, rivalCap: 2 },

        player: {
            mass: 2, radius: 10, hp: 40, regen: 1.6,
            speed: 78, reach: 30,
            gape: 1, hold: 1.2, chitin: 1, acid: 2,
            stamina: 6, staminaRegen: 2.4, staminaDelay: 0.7,
            frenzySpeed: 1.28, frenzyDrain: 0.9, frenzyDamage: 1.25
        },

        growth: {
            /* xp thresholds on accumulated biomass */
            xpFor: function (level) {
                return Math.round(12 * Math.pow(1.5, Math.max(0, level - 1)));
            },
            massToBiomass: 2.4,
            radiusPow: 0.5,
            respawnDelay: 2.4,
            deathPenalty: 0.72,
            deathMassLoss: 0.28,
            stages: [
                { id: "spawn", name: "SPAWN", at: 0, gape: 1 },
                { id: "hatchling", name: "HATCHLING", at: 10, gape: 2 },
                { id: "hunter", name: "HUNTER", at: 26, gape: 3 },
                { id: "stalker", name: "STALKER", at: 52, gape: 4 },
                { id: "apex", name: "APEX", at: 92, gape: 5 },
                { id: "titan", name: "TITAN", at: 150, gape: 6 },
                { id: "colossus", name: "COLOSSUS", at: 235, gape: 7 }
            ]
        },

        alarm: {
            max: 100,
            /* Each tier is both a threshold and a response: which foes may
             * answer, and a cap on how many can be in the street at once. */
            tiers: [
                { at: 0, foes: ["cop"], cap: 2 },
                { at: 25, foes: ["cop", "rifleman"], cap: 3 },
                { at: 50, foes: ["rifleman", "swat", "drone"], cap: 4 },
                { at: 75, foes: ["swat", "heavy", "flame"], cap: 5 },
                { at: 100, foes: ["purifier", "flame", "rifleman"], cap: 6 }
            ],
            spawnDelay: 10,
            spawnEvery: 11,
            seenByPrey: 3.2,
            scream: 3.4,
            gunfire: 2.4,
            bodyFound: 6,
            decayDelay: 7,
            decay: 2.6
        },

        prey: {
            downTime: 3.2,
            panicRadius: 95
        },

        engulf: {
            promptRange: 26,
            swallowTime: 1.1,
            holdDrain: 0.3,
            holdBreak: 3.2,
            chokeTime: 1.5,
            chokeMassLoss: 0.05,
            chokeAlarm: 14,
            interruptDamage: 9
        },

        difficulty: {
            instinct: { alarm: 1.4, speed: 1.08, sight: 1.12 }
        },

        shards: { perStar: 2, perLevel: 4, eliteBonus: 2 },

        camera: {
            unitsPerPixel: 1.4,
            follow: 6.5,
            lead: 0.16,
            shake: 3.0,
            maxShake: 12,
            shakeDecay: 2.2
        },

        render: {
            targetChunk: 2,
            targetChunkLarge: 2,
            minBufferW: 240,
            minBufferH: 160,
            maxBufferW: 640,
            maxBufferH: 420,
            speckle: 24,
            bayer: [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
        },

        quality: {
            low: { speckle: false, glow: 0, shadow: false },
            med: { speckle: true, glow: 0.6, shadow: true },
            high: { speckle: true, glow: 1, shadow: true }
        }
    };

    /* ===== the small math ===== */

    S.epsilon = 0.000001;

    S.clamp = function (v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    };

    S.clamp01 = function (v) {
        return v < 0 ? 0 : (v > 1 ? 1 : v);
    };

    S.lerp = function (a, b, t) {
        return a + (b - a) * t;
    };

    /* Exponential ease toward a target. The k is a half-life in disguise:
     * values near 8..16 feel "gamey smooth", larger feels heavier. */
    S.damp = function (v, target, k, dt) {
        return target + (v - target) * Math.exp(-k * dt);
    };

    S.dist = function (ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        return Math.sqrt(dx * dx + dy * dy);
    };

    S.dist2 = function (ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        return dx * dx + dy * dy;
    };

    /* Shortest signed angle from a to b, in radians. */
    S.angleDelta = function (a, b) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return d;
    };

    S.angleLerp = function (a, b, t) {
        return a + S.angleDelta(a, b) * t;
    };

    /* A clock reads as "1:07", never as "67 seconds" or "1.1 minutes". */
    S.fmtTime = function (sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return m + ":" + (s < 10 ? "0" : "") + s;
    };

    /* Squared distance from point (px,py) to segment (ax,ay)-(bx,by). */
    S.segDist2 = function (ax, ay, bx, by, px, py) {
        var dx = bx - ax, dy = by - ay;
        var len2 = dx * dx + dy * dy;
        var t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
        t = S.clamp01(t);
        var qx = ax + dx * t, qy = ay + dy * t;
        return S.dist2(px, py, qx, qy);
    };

    /* Deterministic 2D hash in [0,1). Used for ground speckle, which must
     * not shimmer when the camera moves. */
    S.hash2 = function (x, y) {
        var h = (x * 374761393 + y * 668265263) >>> 0;
        h = (h ^ (h >>> 13)) >>> 0;
        h = (Math.imul(h, 1274126177) >>> 0) >>> 0;
        h = (h ^ (h >>> 16)) >>> 0;
        return h / 4294967296;
    };
})(window.GU = window.GU || {});
