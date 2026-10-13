/*
 * LUMEN - shared tuning constants, palette and math helpers.
 * Loaded first; every other module reads from window.LUMEN.
 */
(function (L) {
    "use strict";

    /* ===== Tuning =====
     * Every number the game feels like is here. Balance passes edit this
     * file, not the systems.
     */
    L.CONFIG = {
        world: {
            size: 4500,
            borderPad: 150,
            planktonCount: 2600,
            planktonValue: 1,
            krillCount: 45,
            krillValue: 14,
            krillRespawn: 25,
            krillSpeed: 11,
            /* Hulls are landmarks, not a minefield. At 48 they were killing
             * two thirds of everything alive and players died to scenery more
             * often than to rivals, which is the wrong fantasy. */
            wreckCount: 36,
            jellyCount: 26,
            jellySpeed: 13,
            jellyStun: 1.6,
            anglerCount: 6,
            anglerRespawn: 38,
            anglerMass: 900,
            meatTTL: 12,
            meatMin: 3,
            meatMax: 40,
            corpseFraction: 0.6,
            killFraction: 0.4,
        },

        player: {
            startMass: 20,
            baseSpeed: 190,
            boostSpeed: 330,
            turnFast: 4.6,
            turnSlow: 2.4,
            massForTurnCap: 800,
            boostDrain: 9,
            minBoostMass: 20,
            decayAbove: 60,
            decayRate: 0.012,
        },

        body: {
            spacing: 7,
            lenBase: 60,
            lenPerMass: 0.42,
            lenMax: 620,
            radBase: 5,
            radPerSqrtMass: 0.85,
            radMax: 38,
        },

        /* The signature mechanic: your light is your eyes, and it scales
         * with mass. Big players see everything and are seen by everyone. */
        light: {
            base: 110,
            perSqrtMass: 18,
            min: 110,
            max: 420,
            enemyGlowFactor: 0.40,
            enemyGlowAlpha: 0.55,
            foodGlowAlpha: 0.5,
            maskScale: 0.5,
            darkness: 1.0,
        },

        camera: {
            zoomAtMin: 1.05,
            zoomAtHundred: 0.18,
            zoomMin: 0.62,
            shakeDecay: 4.5,
        },

        bots: {
            count: 40,
            thinkInterval: 0.1,
            /* Death rate among rivals is high by design; the queue has to
             * refill faster than it drains or the leaderboard empties out. */
            respawnMin: 1.2,
            respawnMax: 3.5,
            startMassMin: 25,
            startMassMax: 90,
            rubberBandFloor: 0.35,
        },
    };

    /* ===== Bioluminescent palette ===== */
    L.PALETTE = [
        "#4ff5ff", "#7ce8ff", "#38d9ff", "#5c8bff", "#8f7bff",
        "#c46bff", "#ff4fd8", "#ff6b9d", "#ff8a5c", "#ffd24f",
        "#a8ff5f", "#5cffc4",
    ];

    L.COLORS = {
        abyss: "#02060e",
        deep: "#061426",
        wreck: "#08111c",
        wreckLine: "#12293d",
        meat: "#ff7a5c",
        krill: "#ffd24f",
        jelly: "#c46bff",
        angler: "#8f7bff",
        lure: "#eaf6ff",
        danger: "#ff4f6b",
    };

    /* ===== Math helpers ===== */
    L.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
    L.lerp = function (a, b, t) { return a + (b - a) * t; };

    /* Shortest-arc angle interpolation, always in (-PI, PI]. */
    L.lerpAngle = function (a, b, t) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return a + d * t;
    };

    L.rand = function (a, b) { return a + Math.random() * (b - a); };
    L.randInt = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
    L.pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };
    L.dist2 = function (ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        return dx * dx + dy * dy;
    };

    /* ===== Deterministic RNG =====
     * Used to build the persistent bot roster so the same 40 rivals show up
     * on every run, on every device.
     */
    L.mulberry32 = function (seed) {
        var t = seed >>> 0;
        return function () {
            t = (t + 0x6d2b79f5) >>> 0;
            var r = Math.imul(t ^ (t >>> 15), 1 | t);
            r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    };

    L.hashString = function (str) {
        var h = 2166136261 >>> 0;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    };

    /* Value-noise style smooth wander, used so bots never move like robots. */
    L.wanderAngle = function (t, phase) {
        return (
            Math.sin(t * 0.61 + phase) * 1.9 +
            Math.sin(t * 0.23 + phase * 2.3) * 2.6 +
            Math.sin(t * 0.11 + phase * 5.1) * 1.4
        );
    };

})(window.LUMEN = window.LUMEN || {});
