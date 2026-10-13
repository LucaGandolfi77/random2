/*
 * LUMEN - persistence. There is no server, so localStorage is the entire
 * backend: the bot roster, your records, and who is hunting you.
 */
(function (L) {
    "use strict";

    var NS = "lumen.v1.";
    var SEED_KEY = NS + "seed";
    var ROSTER_KEY = NS + "roster";
    var STATS_KEY = NS + "stats";
    var GRUDGE_KEY = NS + "grudges";
    var SETTINGS_KEY = NS + "settings";
    var PROFILE_KEY = NS + "profile";

    var NAME_ROOTS = [
        "Vortex", "Abyss", "Nyx", "Siphon", "Kraken", "Biolum", "Drift",
        "Umbra", "Halcyon", "Glimmer", "Therm", "Abyssal", "Nautilus",
        "Medusa", "Echo", "Rift", "Trench", "Vent", "Chasm", "Fathom",
        "Krill", "Squid", "Angler", "Gulper", "Viper", "Maw", "Gorgon",
        "Cyanide", "Lantern", "Isopod", "Radiant", "Noctiluca",
    ];

    var NAME_TAGS = [
        "", "", "", "_77", "_99", "_x", "404", "_YT", ".exe", "_01",
        "zz", "_o7", "Prime", "Z", "_QQ", "-hd", "v2", "xx", "_raw", "99",
    ];

    var CLANS = [
        { id: 0, name: "Trench", hue: "#4ff5ff" },
        { id: 1, name: "Bloom", hue: "#ff4fd8" },
        { id: 2, name: "Vent", hue: "#a8ff5f" },
        { id: 3, name: "Gulper", hue: "#ff8a5c" },
        { id: 4, name: "Coldlight", hue: "#8f7bff" },
        { id: 5, name: "Lantern", hue: "#ffd24f" },
    ];

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
            /* private mode / quota - the game still plays, it just forgets */
        }
    }

    /* ===== Seed ===== */
    function getSeed() {
        var s = read(SEED_KEY, null);
        if (s === null) {
            s = (Math.random() * 4294967295) >>> 0;
            write(SEED_KEY, s);
        }
        return s >>> 0;
    }

    /* ===== Bot roster =====
     * Generated once from the seed and then frozen. This is the trick that
     * makes a serverless game feel like it has a server: the same rivals,
     * with the same names, hunt you every single session.
     */
    function buildRoster(seed, count) {
        var rng = L.mulberry32(seed);
        var roster = [];
        var usedNames = {};

        for (var i = 0; i < count; i++) {
            var name, tries = 0;
            do {
                var root = NAME_ROOTS[(rng() * NAME_ROOTS.length) | 0];
                var tag = NAME_TAGS[(rng() * NAME_TAGS.length) | 0];
                name = root + tag;
                tries++;
            } while (usedNames[name] && tries < 24);
            usedNames[name] = true;

            /* Personality weights drive the steering blend, so each bot
             * genuinely plays differently rather than sharing one brain. */
            var skillBias = rng();
            roster.push({
                id: "b" + i,
                name: name,
                clan: i % CLANS.length,
                color: L.PALETTE[(rng() * L.PALETTE.length) | 0],
                personality: {
                    aggression: 0.15 + rng() * 0.85,
                    greed: 0.2 + rng() * 0.8,
                    caution: 0.15 + rng() * 0.85,
                    skill: 0.15 + skillBias * 0.8,
                    boostiness: 0.1 + rng() * 0.9,
                },
            });
        }
        return roster;
    }

    function getRoster(count) {
        var roster = read(ROSTER_KEY, null);
        if (!Array.isArray(roster) || roster.length !== count) {
            roster = buildRoster(getSeed(), count);
            write(ROSTER_KEY, roster);
        }
        return roster;
    }

    L.getClans = function () { return CLANS; };

    /* ===== Stats ===== */
    function defaultStats() {
        return { best: 0, bestRank: 999, kills: 0, deaths: 0, time: 0, runs: 0 };
    }

    function getStats() {
        var s = read(STATS_KEY, null);
        if (!s || typeof s.best !== "number") return defaultStats();
        var d = defaultStats();
        for (var k in d) if (typeof s[k] !== "number") s[k] = d[k];
        return s;
    }

    function saveStats(stats) { write(STATS_KEY, stats); }

    function recordRun(mass, rank, kills, seconds) {
        var s = getStats();
        s.runs++;
        s.kills += kills || 0;
        s.time += seconds || 0;
        if (mass > s.best) s.best = Math.floor(mass);
        if (rank < s.bestRank) s.bestRank = rank;
        saveStats(s);
        return s;
    }

    /* ===== Grudges =====
     * Kill a player and that bot respawns hunting them. Grudges survive
     * across sessions and fade slowly, so old rivals eventually cool off.
     */
    function getGrudges() {
        var g = read(GRUDGE_KEY, null);
        return g && typeof g === "object" ? g : {};
    }

    function addGrudge(botId, weight) {
        var g = getGrudges();
        g[botId] = Math.min(1, (g[botId] || 0) + (weight === undefined ? 1 : weight));
        write(GRUDGE_KEY, g);
    }

    function decayGrudges() {
        var g = getGrudges();
        var changed = false;
        for (var id in g) {
            g[id] *= 0.985;
            if (g[id] < 0.05) { delete g[id]; changed = true; }
            else changed = true;
        }
        write(GRUDGE_KEY, g);
    }

    function strongestGrudge() {
        var g = getGrudges();
        var best = null, bestV = 0;
        for (var id in g) if (g[id] > bestV) { bestV = g[id]; best = id; }
        return best ? { id: best, weight: bestV } : null;
    }

    /* ===== Settings =====
     * Sound and haptics live in the shared arcade blob when shared/arcade.js
     * is present, so the hub's toggles control this game too. LUMEN keeps its
     * own key for anything the hub does not own.
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
        };
    }

    function saveSettings(s) { write(SETTINGS_KEY, s); }

    /* Push a change back to the shared blob when there is one, so flipping
     * sound inside LUMEN also sticks on the hub. */
    function setSound(on) {
        var s = getSettings();
        s.sound = !!on;
        saveSettings(s);
        if (window.R2 && typeof window.R2.setSettings === "function") {
            try { window.R2.setSettings({ sound: !!on }); } catch (e) { /* ignore */ }
        }
        return s;
    }

    function setHaptics(on) {
        var s = getSettings();
        s.haptics = !!on;
        saveSettings(s);
        if (window.R2 && typeof window.R2.setSettings === "function") {
            try { window.R2.setSettings({ haptics: !!on }); } catch (e) { /* ignore */ }
        }
        return s;
    }

    /* Hand our best glow to the hub so it shows up in the records dashboard. */
    function publishBest(best) {
        var s = getStats();
        if (typeof best === "number" && best > s.best) {
            s.best = Math.floor(best);
            saveStats(s);
        }
        if (window.R2 && typeof window.R2.saveJSON === "function") {
            try {
                window.R2.saveJSON("lumen-pwa", {
                    highScore: s.best,
                    bestRank: s.bestRank,
                    kills: s.kills,
                });
            } catch (e) { /* private mode */ }
        }
        return s;
    }

    /* ===== Profile ===== */
    function getProfile() {
        var p = read(PROFILE_KEY, null);
        return p && typeof p.name === "string" ? p : { name: "" };
    }

    function saveProfile(name) { write(PROFILE_KEY, { name: name }); }

    L.Storage = {
        getRoster: getRoster,
        getStats: getStats,
        saveStats: saveStats,
        recordRun: recordRun,
        getGrudges: getGrudges,
        addGrudge: addGrudge,
        decayGrudges: decayGrudges,
        strongestGrudge: strongestGrudge,
        getSettings: getSettings,
        saveSettings: saveSettings,
        setSound: setSound,
        setHaptics: setHaptics,
        publishBest: publishBest,
        getProfile: getProfile,
        saveProfile: saveProfile,
        getSeed: getSeed,
        randomName: function () {
            return NAME_ROOTS[(Math.random() * NAME_ROOTS.length) | 0] +
                NAME_TAGS[(Math.random() * NAME_TAGS.length) | 0];
        },
    };

})(window.LUMEN = window.LUMEN || {});
