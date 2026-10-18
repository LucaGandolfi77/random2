/*
 * IRONFALL - seeded RNG.
 *
 * Every match runs off one seed so a loss can be replayed, and so the
 * balance harness can run a hundred matches and get the same hundred.
 */
(function (S) {
    "use strict";

    /* mulberry32: 32-bit, passes gjrand's basic suite, and it is four lines.
     * A heavier generator would buy nothing here because the only thing being
     * randomised is wave composition and waypoint jitter, and both are already
     * averaged over thousands of rolls per match. */
    function makeRng(seed) {
        var a = (seed >>> 0) || 1;

        function next() {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }

        next.range = function (lo, hi) { return lo + next() * (hi - lo); };
        next.int = function (lo, hi) { return Math.floor(lo + next() * (hi - lo + 1)); };
        next.pick = function (arr) { return arr[Math.floor(next() * arr.length)]; };
        next.chance = function (p) { return next() < p; };
        next.sign = function () { return next() < 0.5 ? -1 : 1; };
        /* Approximate normal, summed uniforms. Used for damage jitter and AI
         * personality scatter, where an exact bell is not needed and a true
         * Gaussian costs a Box-Muller. */
        next.gauss = function () {
            return (next() + next() + next() + next() - 2) * 1.1;
        };
        /* Fisher-Yates, in place. Shuffling a champion pool by sort-on-random
         * would bias it, and the bot lane assignment is exactly where a
         * biased pool would show up as a broken matchup. */
        next.shuffle = function (arr) {
            for (var i = arr.length - 1; i > 0; i--) {
                var j = Math.floor(next() * (i + 1));
                var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
            }
            return arr;
        };
        return next;
    }

    S.makeRng = makeRng;

    /* A shared instance for anything cosmetic (particles, UI jitter) that
     * nobody will ever need to reproduce. Kept separate from the match seed so
     * the match stream is not advanced by a spark. */
    S.rng = makeRng(0x1F0EF011);

})(window.IF = window.IF || {});
