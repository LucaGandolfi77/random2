/*
 * GULPER - persistent save.
 *
 * Everything lives on the device: there is no server, no account and no
 * network. The save holds the campaign map, the Genome (the persistent
 * upgrade tree), the Codex (which prey types you have swallowed and how
 * many times) and the settings.
 *
 * The schema is versioned. A save written by an older build is migrated
 * forward rather than discarded: throwing away a player's forty-two levels
 * of progress because a number moved is unforgivable.
 */
(function (S) {
    "use strict";

    var KEY = "gulper.save.v1";
    var VERSION = 1;

    function defaults() {
        return {
            version: VERSION,
            /* Campaign progress. id -> { stars, best, cleared } */
            levels: {},
            /* Persistent currency. */
            shards: 0,
            /* Biomass carried from one level to the next. This is the
             * campaign's spine: you keep the size you grew into, so the
             * thing that was too heavy for you last level is a mouthful
             * this one. */
            carry: 0,
            /* Unlocked weapon ids and their tier. */
            weapons: { lash: 1, grasp: 1 },
            /* Unlocked adaptation ids. */
            adaptations: [],
            /* Codex. preyTypeId -> count swallowed. */
            codex: {},
            /* Total prey swallowed, all types. */
            total: 0,
            /* Highest single-run biomass. */
            bestMass: 0,
            /* The shrines outside the campaign. feast: the best mass the
             * Everlasting Feast ever let you reach. daily: today's medal
             * (reset by the next midnight). rush: how far the best
             * Procession run walked. */
            feast: 0,
            daily: { ymd: null, best: 0 },
            rush: { stage: 0, mass: 0 },
            /* Lifetime counters. */
            stats: { runs: 0, deaths: 0, swallowed: 0, bosses: 0, alarms: 0 },
            /* Settings. */
            settings: {
                sound: true,
                music: true,
                haptics: true,
                quality: "auto",
                pixelSize: "auto",
                aimAssist: true,
                showDamage: true
            },
            /* Last level played, so the title screen can offer CONTINUE. */
            lastLevel: null
        };
    }

    var cache = null;

    function read() {
        if (cache) return cache;
        var data = null;
        try {
            var raw = localStorage.getItem(KEY);
            if (raw) data = JSON.parse(raw);
        } catch (e) {
            data = null;
        }
        cache = migrate(data);
        return cache;
    }

    /* Bring an older save up to the current schema. Missing keys take the
     * default; unknown keys are kept, because a newer build may have
     * written them and an older build should not destroy them. */
    function migrate(data) {
        var out = defaults();
        if (!data || typeof data !== "object") return out;

        var k;
        for (k in out) {
            if (data[k] !== undefined && data[k] !== null) {
                if (typeof out[k] === "object" && !Array.isArray(out[k]) && out[k] !== null &&
                    typeof data[k] === "object" && !Array.isArray(data[k])) {
                    for (var j in out[k]) {
                        if (data[k][j] !== undefined) out[k][j] = data[k][j];
                    }
                } else if (Array.isArray(out[k])) {
                    out[k] = Array.isArray(data[k]) ? data[k].slice() : out[k];
                } else {
                    out[k] = data[k];
                }
            }
        }
        /* Preserve unknown top-level keys so downgrading is not destructive. */
        for (k in data) {
            if (!(k in out)) out[k] = data[k];
        }
        out.version = VERSION;
        return out;
    }

    function write() {
        if (!cache) return;
        try {
            localStorage.setItem(KEY, JSON.stringify(cache));
        } catch (e) {
            /* Quota exceeded or storage disabled. The game keeps running
             * from memory; it just will not remember. */
        }
    }

    S.Storage = {
        /* The whole save object. Mutate it, then call save(). */
        data: function () { return read(); },

        save: function () { write(); },

        reset: function () {
            cache = defaults();
            write();
            return cache;
        },

        /* ===== Campaign ===== */
        levelRecord: function (id) {
            var d = read();
            return d.levels[id] || { stars: 0, best: 0, cleared: false };
        },

        recordLevel: function (id, stars, mass, cleared) {
            var d = read();
            var rec = d.levels[id] || { stars: 0, best: 0, cleared: false };
            rec.stars = Math.max(rec.stars, stars || 0);
            rec.best = Math.max(rec.best, mass || 0);
            rec.cleared = rec.cleared || !!cleared;
            d.levels[id] = rec;
            if (rec.best > d.bestMass) d.bestMass = rec.best;
            d.shards += (stars || 0) * S.CONFIG.shards.perStar;
            write();
            return rec;
        },

        /* ===== The shrines ===== */
        /* Endless Night: the biggest thing the tide ever let you become. */
        recordFeast: function (mass) {
            var d = read();
            d.feast = Math.max(d.feast || 0, Math.round(mass || 0));
            write();
            return d.feast;
        },

        /* Daily Hunt: the medal is the day's best mass, and a new day
         * starts a new medal. */
        recordDaily: function (ymd, mass) {
            var d = read();
            if (d.daily.ymd !== ymd) d.daily = { ymd: ymd, best: 0 };
            d.daily.best = Math.max(d.daily.best, Math.round(mass || 0));
            write();
            return d.daily.best;
        },

        /* The Procession: how many titans the best run put down, and the
         * biggest thing you became along the way. */
        recordRush: function (stages, mass) {
            var d = read();
            d.rush.stage = Math.max(d.rush.stage || 0, stages || 0);
            d.rush.mass = Math.max(d.rush.mass || 0, Math.round(mass || 0));
            write();
            return d.rush;
        },

        /* ===== Genome ===== */
        addShards: function (n) {
            var d = read();
            d.shards += Math.max(0, n | 0);
            write();
            return d.shards;
        },

        spendShards: function (n) {
            var d = read();
            if (d.shards < n) return false;
            d.shards -= n;
            write();
            return true;
        },

        unlockWeapon: function (id, tier) {
            var d = read();
            var have = d.weapons[id] || 0;
            if (tier > have) d.weapons[id] = tier;
            write();
            return d.weapons[id];
        },

        unlockAdaptation: function (id) {
            var d = read();
            if (d.adaptations.indexOf(id) < 0) {
                d.adaptations.push(id);
                write();
            }
            return d.adaptations;
        },

        hasAdaptation: function (id) {
            return read().adaptations.indexOf(id) >= 0;
        },

        /* ===== Codex ===== */
        noteSwallow: function (typeId, mass) {
            var d = read();
            d.codex[typeId] = (d.codex[typeId] || 0) + 1;
            d.total = (d.total || 0) + 1;
            d.stats.swallowed = (d.stats.swallowed || 0) + 1;
            write();
        },

        /* ===== Stats ===== */
        bump: function (name, by) {
            var d = read();
            d.stats[name] = (d.stats[name] || 0) + (by === undefined ? 1 : by);
            write();
        },

        /* ===== Settings ===== */
        setSetting: function (key, value) {
            var d = read();
            d.settings[key] = value;
            write();
        },

        /* Export the save as a string, so a player can move it to another
         * device without a server. */
        exportSave: function () {
            try {
                return btoa(unescape(encodeURIComponent(JSON.stringify(read()))));
            } catch (e) {
                return "";
            }
        },

        importSave: function (text) {
            try {
                var json = decodeURIComponent(escape(atob(text)));
                var data = JSON.parse(json);
                cache = migrate(data);
                write();
                return true;
            } catch (e) {
                return false;
            }
        }
    };
})(window.GU = window.GU || {});
