/*
 * Small deterministic helpers. No dependencies, no DOM.
 */
(function (LC) {
    "use strict";

    var U = {};

    U.clamp = function (v, lo, hi) {
        return v < lo ? lo : (v > hi ? hi : v);
    };

    U.lerp = function (a, b, t) {
        return a + (b - a) * t;
    };

    U.dist2 = function (ax, ay, bx, by) {
        var dx = ax - bx;
        var dy = ay - by;
        return dx * dx + dy * dy;
    };

    U.dist = function (ax, ay, bx, by) {
        return Math.sqrt(U.dist2(ax, ay, bx, by));
    };

    U.pointInRect = function (x, y, r) {
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    };

    U.formatTime = function (seconds) {
        var s = Math.max(0, Math.ceil(seconds));
        var m = Math.floor(s / 60);
        var rest = s % 60;
        return m + ":" + (rest < 10 ? "0" : "") + rest;
    };

    U.round = function (v, places) {
        var p = Math.pow(10, places || 0);
        return Math.round(v * p) / p;
    };

    U.pick = function (rng, list) {
        return list[Math.floor(rng.next() * list.length)];
    };

    LC.U = U;
})(window.LC = window.LC || {});