/* Deterministic PRNG. A run is reproducible from its seed, which is what
 * lets the headless suite assert on AI behaviour without flaking. */
(function (CB) {
    "use strict";

    function mulberry32(seed) {
        var a = seed >>> 0;
        return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function RNG(seed) {
        var next = mulberry32(seed || 1);
        return {
            next: next,
            range: function (lo, hi) { return lo + next() * (hi - lo); },
            int: function (lo, hi) { return Math.floor(lo + next() * (hi - lo + 1)); },
            pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
            chance: function (p) { return next() < p; },
            angle: function () { return next() * Math.PI * 2; },
            sign: function () { return next() < 0.5 ? -1 : 1; }
        };
    }

    CB.RNG = RNG;
    CB.mulberry32 = mulberry32;
})(window.CB = window.CB || {});
