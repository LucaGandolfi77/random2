/*
 * SECTOR 7 - persistence.
 *
 * There is no server, so localStorage is the entire backend: your ship, your
 * crystals, your records. Death costs you energy, never progress.
 */
(function (S) {
    "use strict";

    var NS = "sector7.v1.";
    var SHIP_KEY = NS + "ship";
    var STATS_KEY = NS + "stats";
    var SETTINGS_KEY = NS + "settings";
    var SEED_KEY = NS + "seed";

    function read(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            /* Private mode / quota. The game still plays, it just forgets. */
        }
    }

    /* ===== Seed =====
     * One sector seed per device, so the rock fields and the named NPC
     * roster are the same every time you launch.
     */
    function getSeed() {
        var s = read(SEED_KEY, null);
        if (s === null) {
            s = (Math.random() * 4294967295) >>> 0;
            write(SEED_KEY, s);
        }
        return s >>> 0;
    }

    /* ===== Ship =====
     * The only thing that survives death. Modules start at 1 so a brand-new
     * player is immediately combat-capable.
     */
    function defaultShip() {
        var lv = {};
        for (var i = 0; i < S.MODULES.length; i++) lv[S.MODULES[i].key] = 1;
        return {
            name: "",
            modules: lv,
            /* Crystals are the persistent score and the escalation dial. */
            crystals: 0,
            energy: S.CONFIG.player.startEnergy,
            /* Which sector you launched into, and the best crystals you have
             * ever banked there. The gate is a high-water mark, so spending
             * crystals on refits can never lock a sector back up. */
            sector: "rook",
            sectorBest: {},
            /* Permanent crystal-bought perks. Paid for out of the same
             * crystal balance as everything else - levels only, no separate
             * budget to keep in step. */
            refits: {},
        };
    }

    function getShip() {
        var raw = read(SHIP_KEY, null);
        var d = defaultShip();
        if (!raw || typeof raw !== "object") return d;

        var out = { name: "", modules: {}, crystals: 0, energy: d.energy,
                    sector: d.sector, sectorBest: {}, refits: {} };
        if (typeof raw.name === "string") out.name = raw.name.slice(0, 14);
        out.crystals = Number.isFinite(raw.crystals) ? Math.max(0, Math.floor(raw.crystals)) : 0;
        out.energy = Number.isFinite(raw.energy) ? Math.max(0, Math.floor(raw.energy)) : d.energy;
        /* An unknown sector id in an old or hand-edited save falls back to
         * the first one rather than loading nothing. */
        if (S.Sector) out.sector = S.Sector.get(raw.sector).id;
        /* Every refit key is always present and always a valid level, so
         * nothing downstream has to handle a hole in the save. */
        for (var ri = 0; ri < S.REFITS.length; ri++) {
            var rk = S.REFITS[ri].key;
            var rv = raw.refits ? raw.refits[rk] : undefined;
            out.refits[rk] = Number.isFinite(rv)
                ? S.clamp(Math.floor(rv), 0, S.REFITS[ri].max)
                : 0;
        }
        if (raw.sectorBest && typeof raw.sectorBest === "object") {
            for (var sid in raw.sectorBest) {
                var v = raw.sectorBest[sid];
                if (Number.isFinite(v)) out.sectorBest[sid] = Math.max(0, Math.floor(v));
            }
        }

        /* Merge module levels over the defaults so a module added in a later
         * version shows up at 1 instead of NaN. */
        var lv = raw.modules || {};
        for (var i = 0; i < S.MODULES.length; i++) {
            var k = S.MODULES[i].key;
            var v = lv[k];
            out.modules[k] = Number.isFinite(v) ? S.clamp(Math.floor(v), 1, S.MODULE_MAX) : 1;
        }
        return out;
    }

    function saveShip(ship) { write(SHIP_KEY, ship); }

    /* ===== Stats ===== */
    function defaultStats() {
        return {
            kills: 0,
            deaths: 0,
            crystalsAllTime: 0,
            bestCrystals: 0,
            energyAllTime: 0,
            rocksBroken: 0,
            cratesOpened: 0,
            longestLife: 0,
            distance: 0,
            docked: 0,
        };
    }

    function getStats() {
        var s = read(STATS_KEY, null);
        var d = defaultStats();
        if (!s || typeof s !== "object") return d;
        for (var k in d) {
            if (Number.isFinite(s[k])) d[k] = s[k];
        }
        return d;
    }

    function saveStats(stats) { write(STATS_KEY, stats); }

    function bump(patch) {
        var s = getStats();
        for (var k in patch) s[k] = (s[k] || 0) + (patch[k] || 0);
        if (s.crystalsAllTime > s.bestCrystals) s.bestCrystals = s.crystalsAllTime;
        saveStats(s);
        return s;
    }

    /* ===== Settings =====
     * Sound and haptics live in the shared arcade blob when shared/arcade.js
     * is loaded, so the hub's toggles control this game too. Quality and the
     * auto-aim toggle are ours alone and stay local.
     */
    function getSettings() {
        var s = read(SETTINGS_KEY, null) || {};
        var shared = null;
        if (window.R2 && typeof window.R2.getSettings === "function") {
            try { shared = window.R2.getSettings(); } catch (e) { shared = null; }
        }
        return {
            sound: shared ? !!shared.sound : s.sound !== false,
            haptics: shared ? !!shared.haptics : s.haptics !== false,
            quality: s.quality || "auto",
            aimAssist: s.aimAssist !== false,
        };
    }

    function saveSettings(s) { write(SETTINGS_KEY, s); }

    function patchSetting(key, value) {
        var s = getSettings();
        s[key] = value;
        saveSettings(s);

        /* Mirror the two the hub owns back into the shared blob, so flipping
         * sound here also sticks on the hub. */
        if (window.R2 && window.R2.setSettings && (key === "sound" || key === "haptics")) {
            var patch = {};
            patch[key] = !!value;
            try { window.R2.setSettings(patch); } catch (e) { /* ignore */ }
        }
        return s;
    }

    /* Hand our best run to the hub so it shows in the records dashboard. */
    function publishBest(stats) {
        var s = stats || getStats();
        if (window.R2 && typeof window.R2.saveJSON === "function") {
            try {
                window.R2.saveJSON("sector7-pwa", {
                    highScore: s.bestCrystals,
                    crystals: s.crystalsAllTime,
                    kills: s.kills,
                });
            } catch (e) { /* private mode */ }
        }
        return s;
    }

    /* ===== Reset ===== */
    function wipe() {
        try {
            localStorage.removeItem(SHIP_KEY);
            localStorage.removeItem(STATS_KEY);
        } catch (e) { /* ignore */ }
    }

    S.Storage = {
        getSeed: getSeed,
        getShip: getShip,
        saveShip: saveShip,
        defaultShip: defaultShip,
        getStats: getStats,
        saveStats: saveStats,
        bump: bump,
        getSettings: getSettings,
        saveSettings: saveSettings,
        patchSetting: patchSetting,
        publishBest: publishBest,
        wipe: wipe,
    };

})(window.S7 = window.S7 || {});