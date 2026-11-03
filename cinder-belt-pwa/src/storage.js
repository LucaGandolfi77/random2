/*
 * CINDER BELT persistence.
 *
 * Two layers:
 *  - the profile (best run, unlocks, settings) is this game's own key
 *  - completed runs are written through R2.stats so the hub dashboard can
 *    chart them like every other game in the repo
 *
 * Nothing here trusts a saved blob: a hand-edited profile can unlock a paint
 * job, which is harmless, but it cannot grant a hull tier inside a run.
 */
(function (CB) {
    "use strict";

    var C = CB.CONFIG;
    var KEY = "cinder-belt-pwa";
    var VERSION = 2;

    var DEFAULTS = {
        version: VERSION,
        bestScore: 0,
        bestTime: 0,
        wins: 0,
        runs: 0,
        kills: 0,
        ore: 0,
        bossKills: 0,
        difficulty: "pilot",
        settings: {
            sound: true,
            haptics: true,
            music: true,
            shake: true,
            quality: "high",
            aimAssist: false
        },
        unlocks: {
            paints: ["default"],
            trails: ["ion"],
            relics: []
        },
        seenTutorial: false
    };

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function merge(base, saved) {
        var out = clone(base);
        if (!saved || typeof saved !== "object") return out;
        Object.keys(out).forEach(function (k) {
            if (saved[k] !== undefined) {
                if (out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
                    out[k] = merge(out[k], saved[k]);
                } else {
                    out[k] = saved[k];
                }
            }
        });
        /* Unknown keys are intentionally dropped: this save belongs to this
         * game, and carrying dead settings forward is how they rot. */
        return out;
    }

    var cache = null;

    function loadProfile() {
        if (cache) return cache;
        var raw = null;
        try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { raw = null; }
        cache = merge(DEFAULTS, raw);
        if (cache.version !== VERSION) {
            cache = merge(DEFAULTS, cache);
            cache.version = VERSION;
        }
        return cache;
    }

    function saveProfile(p) {
        cache = p;
        try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* quota */ }
    }

    function patchProfile(fn) {
        var p = loadProfile();
        fn(p);
        saveProfile(p);
        return p;
    }

    function sharedSettings() {
        if (window.R2 && typeof window.R2.getSettings === "function") {
            try { return window.R2.getSettings(); } catch (e) { return null; }
        }
        return null;
    }

    function soundOn() {
        var p = loadProfile();
        var shared = sharedSettings();
        if (shared && shared.sound === false) return false;
        return p.settings.sound !== false;
    }

    function hapticsOn() {
        var p = loadProfile();
        var shared = sharedSettings();
        if (shared && shared.haptics === false) return false;
        return p.settings.haptics !== false;
    }

    function setSetting(key, value) {
        patchProfile(function (p) { p.settings[key] = value; });
        if (window.R2 && typeof window.R2.setSettings === "function" &&
            (key === "sound" || key === "haptics" || key === "music")) {
            var patch = {};
            patch[key] = value;
            try { window.R2.setSettings(patch); } catch (e) { /* ignore */ }
        }
    }

    function recordRun(spec) {
        var p = loadProfile();
        p.runs += 1;
        if (spec.score > p.bestScore) p.bestScore = Math.round(spec.score);
        if (spec.duration > p.bestTime) p.bestTime = Math.round(spec.duration);
        if (spec.outcome === "win") p.wins += 1;
        p.kills += spec.kills || 0;
        p.ore += spec.ore || 0;
        p.bossKills += spec.bossKills || 0;
        saveProfile(p);
        if (window.R2 && typeof window.R2.recordRun === "function") {
            try {
                window.R2.recordRun({
                    slug: C.SLUG,
                    score: Math.round(spec.score || 0),
                    durMs: Math.round((spec.duration || 0) * 1000),
                    outcome: spec.outcome,
                    meta: {
                        hull: spec.hull || "sparrow",
                        tier: spec.tier || 1,
                        kills: spec.kills || 0,
                        ore: spec.ore || 0,
                        difficulty: spec.difficulty || "pilot"
                    }
                });
            } catch (e) { /* ignore */ }
        }
    }

    function recordEvent(name, value) {
        if (window.R2 && typeof window.R2.recordEvent === "function") {
            try { window.R2.recordEvent(C.SLUG, name, value); } catch (e) { /* ignore */ }
        }
    }

    CB.Storage = {
        loadProfile: loadProfile,
        saveProfile: saveProfile,
        patchProfile: patchProfile,
        setSetting: setSetting,
        soundOn: soundOn,
        hapticsOn: hapticsOn,
        recordRun: recordRun,
        recordEvent: recordEvent
    };
})(window.CB = window.CB || {});
