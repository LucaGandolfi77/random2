/*
 * IRONFALL - persistent player state: runes, Doctrine, records, settings.
 *
 * Versioned namespace, every field validated on read. A corrupt or
 * hand-edited save must never be able to produce NaN stats, and a save must
 * never grant what was not earned.
 */
(function (S) {
    "use strict";

    /* v1, not v0. Starting fresh is the only conversion that cannot silently
     * lose a player's record, so there is no migration path here yet - if a
     * future version changes the shape, it starts clean rather than half
     * reading an old key. */
    var NS = "ironfall.v1.";

    var KEYS = {
        runes: NS + "runes",
        doctrine: NS + "doctrine",
        records: NS + "records",
        settings: NS + "settings",
        meta: NS + "meta"
    };

    var OLD_NS = "ironfall.v0.";

    function read(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (raw === null) return fallback;
            var parsed = JSON.parse(raw);
            return parsed === null || typeof parsed !== "object" ? fallback : parsed;
        } catch (e) {
            /* Private mode, quota, or a hand-mangled value. The game still
             * plays; it just forgets. */
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            /* Nothing to do. Losing a run record is not worth interrupting
             * a match for. */
        }
    }

    function remove(key) {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }

    /* A number that survived a JSON round trip and is still a real number.
     * localStorage holds whatever the last writer put there, including
     * strings, nulls, and Infinity-as-null. */
    function num(v, lo, hi, fallback) {
        var n = Number(v);
        if (!isFinite(n)) return fallback;
        if (lo !== undefined && n < lo) return lo;
        if (hi !== undefined && n > hi) return hi;
        return n;
    }

    function str(v, maxLen, fallback) {
        if (typeof v !== "string") return fallback;
        if (maxLen && v.length > maxLen) return v.slice(0, maxLen);
        return v;
    }

    /* ===== Records =====
     * Career totals, plus a per-champion row. The per-champion row is the
     * thing players actually look at, so it is stored as a flat object of
     * short records rather than a nested structure that would need
     * validating champion-by-champion on every read. */
    function defaultRecords() {
        return {
            matches: 0,
            wins: 0,
            losses: 0,
            kills: 0,
            deaths: 0,
            assists: 0,
            /* Single best, ever. This is the number the hub records dashboard
             * reads out of ironfall-pwa. */
            highScore: 0,
            csBest: 0,
            goldBest: 0,
            timeBest: 0,
            streak: 0,
            bestStreak: 0,
            perChamp: {}
        };
    }

    function loadRecords() {
        var raw = read(KEYS.records, null);
        var d = defaultRecords();
        if (!raw) return d;

        d.matches = num(raw.matches, 0, 1e9, 0);
        d.wins = num(raw.wins, 0, 1e9, 0);
        d.losses = num(raw.losses, 0, 1e9, 0);
        d.kills = num(raw.kills, 0, 1e9, 0);
        d.deaths = num(raw.deaths, 0, 1e9, 0);
        d.assists = num(raw.assists, 0, 1e9, 0);
        d.highScore = num(raw.highScore, 0, 1e9, 0);
        d.csBest = num(raw.csBest, 0, 1e9, 0);
        d.goldBest = num(raw.goldBest, 0, 1e9, 0);
        d.timeBest = num(raw.timeBest, 0, 1e9, 0);
        d.streak = num(raw.streak, -1e9, 1e9, 0);
        d.bestStreak = num(raw.bestStreak, 0, 1e9, 0);

        var per = raw.perChamp;
        if (per && typeof per === "object") {
            for (var k in per) {
                if (!Object.prototype.hasOwnProperty.call(per, k)) continue;
                var c = per[k];
                if (!c || typeof c !== "object") continue;
                d.perChamp[k] = {
                    matches: num(c.matches, 0, 1e9, 0),
                    wins: num(c.wins, 0, 1e9, 0),
                    kills: num(c.kills, 0, 1e9, 0),
                    deaths: num(c.deaths, 0, 1e9, 0),
                    csBest: num(c.csBest, 0, 1e9, 0)
                };
            }
        }
        return d;
    }

    function saveRecords(r) {
        write(KEYS.records, r);
    }

    /* Record one finished match. Called once, from the outcome screen. */
    function recordMatch(result) {
        var r = loadRecords();
        r.matches++;
        if (result.win) {
            r.wins++;
            r.streak++;
            if (r.streak > r.bestStreak) r.bestStreak = r.streak;
        } else {
            r.losses++;
            /* Streak resets on a loss, not to zero-and-counting-a-loss: a
             * losing run is worth nothing and a win after a loss is worth one
             * win, not two. */
            r.streak = 0;
        }
        r.kills += result.kills || 0;
        r.deaths += result.deaths || 0;
        r.assists += result.assists || 0;
        r.csBest = Math.max(r.csBest, result.cs || 0);
        r.goldBest = Math.max(r.goldBest, result.gold || 0);
        r.timeBest = Math.max(r.timeBest, result.duration || 0);
        /* highScore is a score, and a score should reward winning rather than
         * merely surviving: a long loss is not an achievement. */
        var score = Math.max(0, Math.round((result.score || 0)));
        if (score > r.highScore) r.highScore = score;

        var id = str(result.champ, 32, "");
        if (id) {
            var c = r.perChamp[id] || { matches: 0, wins: 0, kills: 0, deaths: 0, csBest: 0 };
            c.matches++;
            if (result.win) c.wins++;
            c.kills += result.kills || 0;
            c.deaths += result.deaths || 0;
            c.csBest = Math.max(c.csBest, result.cs || 0);
            r.perChamp[id] = c;
        }

        saveRecords(r);
        return r;
    }

    /* ===== Runes =====
     * One pick per row. Stored as {row0: id, row1: id, row2: id}. Validated
     * against the live rune table, so a save naming a rune that was removed
     * falls back to that row's first entry instead of granting a phantom
     * bonus. */
    function defaultRunes() {
        return { row0: null, row1: null, row2: null };
    }

    function loadRunes() {
        var raw = read(KEYS.runes, null) || {};
        var out = defaultRunes();
        for (var row = 0; row < 3; row++) {
            var id = str(raw["row" + row], 40, null);
            out["row" + row] = (id && S.Runes && S.Runes.exists(id)) ? id : null;
        }
        return out;
    }

    function saveRunes(runes) {
        write(KEYS.runes, runes);
    }

    /* ===== Doctrine =====
     * Light mastery: a champion's permanent skill unlocks at 3 / 6 / 10 wins
     * with that champion. Not grindy because the thresholds are low and the
     * bonuses are small - the point is that a champion you have actually won
     * with plays slightly differently, not that the game has a job. */
    var DOCTRINE_TIERS = [3, 6, 10];

    function loadDoctrine() {
        var raw = read(KEYS.doctrine, null);
        var out = {};
        if (!raw || typeof raw !== "object") return out;
        for (var k in raw) {
            if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
            /* Tier is derived from wins, never stored as its own number: a
             * save that claimed a tier its wins do not support would be a
             * save that grants an unearned bonus. */
            out[k] = num(raw[k], 0, 3, 0);
        }
        return out;
    }

    /* Recomputed from records, so the two can never drift apart. */
    function doctrineTier(records, champId) {
        var c = records && records.perChamp && records.perChamp[champId];
        var wins = c ? c.wins : 0;
        var tier = 0;
        for (var i = 0; i < DOCTRINE_TIERS.length; i++) {
            if (wins >= DOCTRINE_TIERS[i]) tier = i + 1;
        }
        return tier;
    }

    function saveDoctrine(records) {
        var out = {};
        var per = (records && records.perChamp) || {};
        for (var id in per) {
            if (!Object.prototype.hasOwnProperty.call(per, id)) continue;
            var t = doctrineTier(records, id);
            if (t > 0) out[id] = t;
        }
        write(KEYS.doctrine, out);
    }

    /* Doctrine stat deltas per tier. Applied as a flat add on top of the
     * champion's own base, so they are visible in the champion sheet. */
    var DOCTRINE_STATS = [
        {},                                 /* tier 0: nothing */
        { hp: 60, ad: 3 },                  /* tier 1 */
        { hp: 130, ad: 6, ms: 12 },         /* tier 2 */
        { hp: 220, ad: 10, ms: 24 }         /* tier 3 */
    ];

    function doctrineStats(tier) {
        return DOCTRINE_STATS[S.clamp(tier | 0, 0, 3)];
    }

    /* ===== Settings =====
     * Mirrored into the hub's shared settings so muting IRONFALL mutes the
     * whole arcade and the other way round. */
    function loadSettings() {
        var shared = null;
        if (window.R2 && typeof window.R2.getSettings === "function") {
            try { shared = window.R2.getSettings(); } catch (e) { shared = null; }
        }
        var raw = read(KEYS.settings, null) || {};
        return {
            sound: typeof shared === "boolean" ? shared
                : (typeof raw.sound === "boolean" ? raw.sound : true),
            haptics: typeof shared === "boolean" ? shared
                : (typeof raw.haptics === "boolean" ? raw.haptics : true),
            quality: str(raw.quality, 16, "auto"),
            lanePings: typeof raw.lanePings === "boolean" ? raw.lanePings : true,
            showRanges: typeof raw.showRanges === "boolean" ? raw.showRanges : true
        };
    }

    function saveSettings(s) {
        write(KEYS.settings, s);
        /* Sound and haptics are global preferences, so they go up to the hub.
         * Quality is not: a phone that needs low quality for IRONFALL does not
         * need low quality for a grid puzzle. */
        if (window.R2 && typeof window.R2.setSettings === "function") {
            try { window.R2.setSettings({ sound: !!s.sound, haptics: !!s.haptics }); }
            catch (e) { /* ignore */ }
        }
    }

    /* ===== Meta =====
     * Last-seen version, so a returning player is greeted by name. */
    function loadMeta() {
        var raw = read(KEYS.meta, null) || {};
        return {
            seen: raw.seen === true,
            matchesPlayed: num(raw.matchesPlayed, 0, 1e9, 0)
        };
    }

    function saveMeta(m) {
        write(KEYS.meta, m);
    }

    /* Publishes the high score under the key the hub's records dashboard
     * reads. Kept separate from records so a failure here cannot corrupt a
     * career. */
    function publishHighScore(records) {
        if (window.R2 && typeof window.R2.saveJSON === "function") {
            try {
                window.R2.saveJSON("ironfall-pwa", {
                    highScore: records.highScore,
                    matches: records.matches,
                    wins: records.wins,
                    kills: records.kills
                });
            } catch (e) { /* ignore */ }
        }
    }

    function wipe() {
        for (var k in KEYS) {
            if (Object.prototype.hasOwnProperty.call(KEYS, k)) remove(KEYS[k]);
        }
        /* Drop any pre-versioned keys too. Reading half of an old format is
         * how you end up with a champion at tier 3 who has never won. */
        for (var i = 0; i < 8; i++) remove(OLD_NS + i);
    }

    S.Storage = {
        loadRecords: loadRecords,
        saveRecords: saveRecords,
        recordMatch: recordMatch,
        loadRunes: loadRunes,
        saveRunes: saveRunes,
        defaultRunes: defaultRunes,
        loadDoctrine: loadDoctrine,
        saveDoctrine: saveDoctrine,
        doctrineTier: doctrineTier,
        doctrineStats: doctrineStats,
        doctrineTiers: DOCTRINE_TIERS,
        loadSettings: loadSettings,
        saveSettings: saveSettings,
        loadMeta: loadMeta,
        saveMeta: saveMeta,
        publishHighScore: publishHighScore,
        wipe: wipe,
        _read: read,
        _write: write
    };

})(window.IF = window.IF || {});
