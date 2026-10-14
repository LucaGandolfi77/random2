/*
 * FORMICA - persistenza. Non esiste un server: localStorage è l'intero
 * backend. Il roster delle colonie nemiche, i tuoi record, e chi ha rastrellato
 * il tuo nido l'ultima volta.
 */
(function (L) {
    "use strict";

    var NS = "formica.v1.";
    var SEED_KEY = NS + "seed";
    var ROSTER_KEY = NS + "roster";
    var STATS_KEY = NS + "stats";
    var GRUDGE_KEY = NS + "grudges";
    var SETTINGS_KEY = NS + "settings";
    var PROFILE_KEY = NS + "profile";

    /* Nomi da .io, ma con l'immaginario del formicaio: radici italiane +
     * tag da handle. */
    var NAME_ROOTS = [
        "Rossa", "Nera", "Tagliafoglie", "Corazzata", "Faraone", "Boscaiolo",
        "Carpentiera", "Mietitrice", "Bruciante", "Cieca", "Vespa", "Zigante",
        "Cucitrice", "Milza", "Bulldog", "Legnaiola", "Velenosa", "Corsara",
        "Scintilla", "Raminga", "Fossoria", "Cavatrice", "Salina", "Tessitrice",
    ];

    var NAME_TAGS = [
        "", "", "", "_77", "_99", "404", "_x", "_01", "v2", "zz",
        "-hd", "exe", "_y", "Prime", "xx", "_o7", "88", "_raw", "9", "zZ",
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
            /* modalità privata / quota: il gioco gira, solo scorda */
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

    /* ===== Roster colonie =====
     * Generato una volta dal seed e poi congelato. È il trucco che fa sembrare
     * che esista un server: le stesse colonie nemiche, con gli stessi nomi,
     * ogni sessione.
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
                name = "Colonia " + root + tag;
                tries++;
            } while (usedNames[name] && tries < 24);
            usedNames[name] = true;

            /* I pesi della personalità guidano il blend di sterzata: ogni
             * colonia gioca davvero in modo diverso. */
            roster.push({
                id: "c" + i,
                name: name,
                color: L.PALETTE[i % L.PALETTE.length],
                personality: {
                    expansion: rng(),   /* quanto ama dipingere territorio */
                    farming: rng(),     /* quanto raccoglie briciole */
                    raiding: rng(),     /* quanto spesso lancia razzie */
                    defense: rng(),     /* quanto resta vicino al nido */
                    caution: rng(),     /* quanto evita gocce e inchiostri */
                    skill: rng(),
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

    /* ===== Statistiche ===== */
    function defaultStats() {
        return {
            best: 0, bestRank: 999, raidsBeaten: 0, raidsLost: 0,
            annexed: 0, crumbs: 0, time: 0, runs: 0,
        };
    }

    function getStats() {
        var s = read(STATS_KEY, null);
        if (!s || typeof s.best !== "number") return defaultStats();
        var d = defaultStats();
        for (var k in d) if (typeof s[k] !== "number") s[k] = d[k];
        return s;
    }

    function saveStats(stats) { write(STATS_KEY, stats); }

    function recordRun(result) {
        var s = getStats();
        s.runs++;
        s.raidsBeaten += result.raidsBeaten || 0;
        s.raidsLost += result.raidsLost || 0;
        s.annexed += result.annexed || 0;
        s.crumbs += result.crumbs || 0;
        s.time += result.seconds || 0;
        if (result.territory > s.best) s.best = result.territory;
        if (result.rank < s.bestRank) s.bestRank = result.rank;
        saveStats(s);
        return s;
    }

    /* ===== Grudges =====
     * Una colonia che ti ha rastrellato il nido ricomincia a cacciarti.
     * I rancori sopravvivono tra le sessioni e svaniscono lentamente.
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

    /* ===== Impostazioni =====
     * Suono e haptics vivono nel blob condiviso quando c'è shared/arcade.js,
     * così i toggle dell'hub controllano anche questo gioco.
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
        };
    }

    function saveSettings(s) { write(SETTINGS_KEY, s); }

    function setSound(on) {
        var s = getSettings();
        s.sound = !!on;
        saveSettings(s);
        if (window.R2 && typeof window.R2.setSettings === "function") {
            try { window.R2.setSettings({ sound: !!on }); } catch (e) { /* ignore */ }
        }
        return s;
    }

    /* Passa il miglior territorio all'hub, così compare nella dashboard. */
    function publishBest(best) {
        var s = getStats();
        if (typeof best === "number" && best > s.best) {
            s.best = best;
            saveStats(s);
        }
        if (window.R2 && typeof window.R2.saveJSON === "function") {
            try {
                window.R2.saveJSON("formica-pwa", {
                    highScore: s.best,
                    bestRank: s.bestRank,
                    raidsBeaten: s.raidsBeaten,
                });
            } catch (e) { /* private mode */ }
        }
        return s;
    }

    /* ===== Profilo ===== */
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
        publishBest: publishBest,
        getProfile: getProfile,
        saveProfile: saveProfile,
        getSeed: getSeed,
        randomName: function () {
            return "Colonia " + NAME_ROOTS[(Math.random() * NAME_ROOTS.length) | 0] +
                NAME_TAGS[(Math.random() * NAME_TAGS.length) | 0];
        },
    };

})(window.FORMICA = window.FORMICA || {});
