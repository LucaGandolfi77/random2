/*
 * GULPER - seeded random numbers.
 *
 * Every level is reproducible from its seed, which is what makes the Daily
 * Hunt fair: everyone gets the same city, the same people in the same
 * places, and the same boss. A player can hand their string to a friend
 * and both are hunting the identical district.
 */
(function (S) {
    "use strict";

    /* mulberry32 - tiny, fast, good-enough 32-bit PRNG. */
    S.mulberry32 = function (seed) {
        var a = seed >>> 0;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };

    /* A named random source with the helpers the game actually needs.
     * Every consumer takes `rng` explicitly rather than reaching for
     * Math.random, so a whole level can be replayed. */
    S.Rng = function (seed) {
        var next = S.mulberry32(seed >>> 0);
        var r = {
            seed: seed >>> 0,

            /* Float in [0,1). */
            next: next,

            /* Float in [lo,hi). */
            range: function (lo, hi) { return lo + next() * (hi - lo); },

            /* Integer in [lo,hi] inclusive. */
            int: function (lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },

            /* True with probability p. */
            chance: function (p) { return next() < p; },

            /* Uniform pick from an array. */
            pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },

            /* Weighted pick. `weightOf` maps an item to a positive number. */
            weighted: function (arr, weightOf) {
                var total = 0, i;
                for (i = 0; i < arr.length; i++) total += Math.max(0, weightOf(arr[i]));
                if (total <= 0) return arr[0];
                var roll = next() * total;
                for (i = 0; i < arr.length; i++) {
                    roll -= Math.max(0, weightOf(arr[i]));
                    if (roll <= 0) return arr[i];
                }
                return arr[arr.length - 1];
            },

            /* Fisher-Yates, in place. */
            shuffle: function (arr) {
                for (var i = arr.length - 1; i > 0; i--) {
                    var j = Math.floor(next() * (i + 1));
                    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
                }
                return arr;
            },

            /* A point uniformly inside a rectangle. */
            inRect: function (x, y, w, h) {
                return { x: x + next() * w, y: y + next() * h };
            },

            /* A direction, radians. */
            angle: function () { return next() * Math.PI * 2; }
        };
        return r;
    };

    /* Turn an arbitrary string into a 32-bit seed. Used for share codes
     * and for the daily seed. */
    S.hashString = function (str) {
        var h = 2166136261 >>> 0;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    };

    /* YYYYMMDD as a number - same value everywhere, changes at midnight. */
    S.dailySeed = function (date) {
        var d = date || new Date();
        return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    };

    /* The alphabet used for share codes. No vowels, no 0/O/1/I, because
     * these get read out loud and typed by hand. */
    S.CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ23456789";

    /* Encode a seed as a short, speakable code. */
    S.seedToCode = function (seed) {
        var s = seed >>> 0;
        var out = "";
        for (var i = 0; i < 6; i++) {
            out += S.CODE_ALPHABET.charAt(s % 32);
            s = Math.floor(s / 32);
        }
        return out;
    };

    /* Decode a share code back to a seed. Returns null when the code is
     * not one of ours, rather than quietly producing a different city. */
    S.codeToSeed = function (code) {
        if (!code) return null;
        var c = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (c.length !== 6) return null;
        var s = 0;
        for (var i = 0; i < 6; i++) {
            var idx = S.CODE_ALPHABET.indexOf(c.charAt(i));
            if (idx < 0) return null;
            s += idx * Math.pow(32, i);
        }
        return s >>> 0;
    };
})(window.GU = window.GU || {});
