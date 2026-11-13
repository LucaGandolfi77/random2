/*
 * Seeded RNG. Same seed, same hand, same AI mistakes — which is what makes
 * the balance and AI tests meaningful.
 */
(function (LC) {
    "use strict";

    function RNG(seed) {
        this.seed = (seed >>> 0) || 1;
        this.a = this.seed;
    }

    RNG.prototype.next = function () {
        var a = this.a | 0;
        a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        this.a = a;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    RNG.prototype.range = function (min, max) {
        return min + this.next() * (max - min);
    };

    RNG.prototype.int = function (min, max) {
        return Math.floor(this.range(min, max + 1));
    };

    RNG.prototype.pick = function (list) {
        return list[Math.floor(this.next() * list.length)];
    };

    RNG.prototype.shuffle = function (list) {
        var copy = list.slice();
        for (var i = copy.length - 1; i > 0; i--) {
            var j = Math.floor(this.next() * (i + 1));
            var tmp = copy[i];
            copy[i] = copy[j];
            copy[j] = tmp;
        }
        return copy;
    };

    RNG.prototype.chance = function (p) {
        return this.next() < p;
    };

    LC.RNG = RNG;
    LC.makeRng = function (seed) {
        return new RNG(seed);
    };
})(window.LC = window.LC || {});