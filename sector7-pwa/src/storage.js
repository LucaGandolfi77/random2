/*
 * SECTOR 7 - persistence.
 *
 * There is no server, so localStorage is the entire backend: your ship, your
 * crystals, your records. Death costs you energy, never progress.
 */
(function (S) {
    "use strict";

    /* v2, not v1. Shields, the cargo hold, the ammo track, factions and CPUs
     * all changed the shape of a ship, and there is no honest way to read a
     * v1 save into them - the old "energy" number has no single new home,
     * because part of it is now a hold that has to be docked. Starting fresh
     * is the only conversion that cannot silently lose a pilot's record, so
     * the old keys are dropped rather than half-read.
     *
     * `wipe()` removes the v1 keys too, so a device that played v1 cannot end
     * up with two saves disagreeing about how much energy it has. */
    var NS = "sector7.v2.";
    var OLD_NS = "sector7.v1.";
    var SHIP_KEY = NS + "ship";
    var HANGAR_KEY = NS + "hangar";
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
            /* CPUs bought with energy, and which one is fitted. The hold is
             * deliberately NOT saved: energy is deposited at the dock and a
             * half-full hold is only ever lost energy, so persisting it would
             * let a crash return loot the player never docked. */
            cpus: {},
            cpu: null,
        };
    }

    function getShip() {
        var raw = read(SHIP_KEY, null);
        var d = defaultShip();
        /* The hangar is projected on EVERY path out of here, including the
         * no-save one. Returning early without it produced a ship with
         * hullId undefined, which statsFor correctly reads as "no hull" and
         * which made a brand new pilot fly the Wasp without its passive. */
        if (!raw || typeof raw !== "object") return withHangar(d, null);

        var out = { name: "", modules: {}, crystals: 0, energy: d.energy,
                    sector: d.sector, sectorBest: {}, refits: {}, cpus: {}, cpu: null };
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

        /* A CPU is only owned if it is one that still exists and it was paid
         * for; an unknown key in a save is dropped rather than granted. */
        for (var ci = 0; ci < S.CPUS.length; ci++) {
            var ck = S.CPUS[ci].key;
            out.cpus[ck] = !!(raw.cpus && raw.cpus[ck]);
        }
        /* The fitted CPU has to be one you own. A save claiming a CPU that
         * was never bought would otherwise equip it for free. */
        out.cpu = out.cpus[raw.cpu] ? raw.cpu : null;

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

        /* The hangar is projected onto the flat ship rather than stored in it:
         * every module downstream - player.create, the station, all four test
         * suites - keeps reading the same shape it always read. This is the
         * seam that makes a multi-ship game a storage change instead of a
         * rewrite. */
        return withHangar(out, raw.hangar);
    }

    /* One projection, two entry paths, so the no-save ship and a restored
     * one can never end up with different hulls.
     *
     * The hangar KEY is the source of truth. The hangar also used to ride
     * along inside the ship save, and that copy was preferred here - which
     * meant a save written before the hangar had a munitions reserve kept
     * handing back a hangar with no rounds in it, while the copy under the
     * key had them. Two copies of the same thing is two answers, and the
     * game eventually asks the wrong one.
     *
     * The inline copy is still written, for the sake of a save file a human
     * can read, but it is never read back. */
    function withHangar(ship, inline) {
        var hangar = getHangar();
        ship.hangar = hangar;
        ship.hullId = hangar.active;
        ship.hullDef = S.hull(hangar.active);
        ship.parts = resolveFit(hangar, hangar.active);
        return ship;
    }

    function saveShip(ship) { write(SHIP_KEY, ship); }

    /* ===== Hangar =====
     * Hulls you own, the parts you own, and how each hull is currently
     * fitted. Stored under its own key so the flat ship save keeps the shape
     * every other module already reads.
     *
     * Owned parts are account-level and fitted parts are per-hull: you buy
     * the Needle once and can bolt it onto the Wasp or the Hauler, which is
     * the same "buy once, swap free" rule the CPUs already use.
     */
    function defaultHangar() {
        return {
            active: S.HULLS[0].id,
            hulls: {},
            parts: {},
            /* The munitions reserve. Rounds you own, parked in the hangar.
             * The ship takes what it can carry out of this at launch and
             * gives the rest back at the dock. */
            munitions: S.CONFIG.munitions.starter,
            /* The auto-turret: 0 is not owned, 1 is. It is a thing that
             * shoots rather than a passive fitting, so it does not live in
             * the parts table. */
            turret: 0,
            sandbox: false,
        };
    }

    function getHangar() {
        var raw = read(HANGAR_KEY, null);
        var out = defaultHangar();
        if (!raw || typeof raw !== "object") {
            /* No hangar key. An older save keeps its hangar inline in the
             * ship save, so adopt that rather than throwing away a garage
             * full of hulls the pilot paid for. One-time reconciliation,
             * and from here on the key is the only copy that is read. */
            var ship = read(SHIP_KEY, null);
            var inline = ship && ship.hangar && typeof ship.hangar === "object"
                ? ship.hangar : null;
            if (inline) {
                write(HANGAR_KEY, inline);
                raw = inline;
            } else {
                /* A pilot with no hangar at all still owns the starter hull,
                 * otherwise a fresh save could not fly. */
                out.hulls[S.HULLS[0].id] = { parts: defaultFit() };
                return out;
            }
        }

        var owned = raw.hulls && typeof raw.hulls === "object" ? raw.hulls : {};

        /* Ownership is what decides who may be flown, so it is stored as
         * presence and presence ONLY. Creating an entry for every hull in the
         * table would make ownsHull() return true for the whole catalogue. */
        for (var i = 0; i < S.HULLS.length; i++) {
            var id = S.HULLS[i].id;
            var h = owned[id];
            var isStarter = id === S.HULLS[0].id;
            if (!h && !isStarter) continue;

            var cfg = defaultFit();
            if (h && typeof h === "object") {
                for (var s = 0; s < S.HULL_SLOTS.length; s++) {
                    var slot = S.HULL_SLOTS[s];
                    var key = h.parts ? h.parts[slot] : null;
                    /* A fitted part must exist AND be owned. The save is not
                     * assumed to have been written by this version. */
                    if (S.part(key) && Number.isFinite(raw.parts && raw.parts[key]) &&
                        raw.parts[key] >= 1) {
                        cfg[slot] = key;
                    }
                }
            }
            out.hulls[id] = { parts: cfg };
        }

        /* An active hull the pilot does not own is not an active hull. */
        out.active = out.hulls[raw.active] ? raw.active : S.HULLS[0].id;

        for (var p = 0; p < S.PARTS.length; p++) {
            var pk = S.PARTS[p].key;
            var lv = raw.parts && raw.parts[pk];
            out.parts[pk] = Number.isFinite(lv) ? S.clamp(Math.floor(lv), 0, S.PART_MAX) : 0;
        }

        /* The munitions reserve. A save from before the hangar had a
         * magazine gets the starter stock, so an old pilot is not left
         * unable to shoot; a save with a negative or nonsense count gets
         * clamped to zero, because a save is never trusted to be true. */
        var stock = raw.munitions && typeof raw.munitions === "object" ? raw.munitions : null;
        out.munitions = {};
        for (var m = 0; m < S.MUNITIONS.length; m++) {
            var mk = S.MUNITIONS[m].key;
            var mv = stock ? stock[mk] : undefined;
            out.munitions[mk] = Number.isFinite(mv)
                ? Math.max(0, Math.floor(mv))
                : S.CONFIG.munitions.starter[mk];
        }

        out.sandbox = !!raw.sandbox;
        /* The turret is owned or it is not. A save that says otherwise is
         * a save that never owned one. */
        out.turret = raw.turret > 0 ? 1 : 0;
        return out;
    }

    /* A bare fit: no components in any slot. An empty slot is a legal ship,
     * it is just a worse one - there is no "must fill three slots" rule to
     * trip over. */
    function defaultFit() {
        var fit = {};
        for (var i = 0; i < S.HULL_SLOTS.length; i++) fit[S.HULL_SLOTS[i]] = null;
        return fit;
    }

    function saveHangar(hangar) { write(HANGAR_KEY, hangar); }

    /* Does the pilot own this hull? The starter is never "bought", so it is
     * owned by definition rather than by a level in the save. */
    function ownsHull(hangar, id) {
        if (id === S.HULLS[0].id) return true;
        return !!(hangar && hangar.hulls && hangar.hulls[id]);
    }

    /* Turn a hangar fit into the `{ key, level }` shape statsFor reads. */
    function resolveFit(hangar, hullId) {
        var out = {};
        var hull = hangar && hangar.hulls ? hangar.hulls[hullId] : null;
        if (!hull) return out;
        for (var i = 0; i < S.HULL_SLOTS.length; i++) {
            var slot = S.HULL_SLOTS[i];
            var key = hull.parts ? hull.parts[slot] : null;
            if (!key) continue;
            var level = hangar.parts ? hangar.parts[key] : 0;
            if (!Number.isFinite(level) || level < 1) continue;
            out[slot] = { key: key, level: level };
        }
        return out;
    }

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
            localStorage.removeItem(HANGAR_KEY);
            localStorage.removeItem(STATS_KEY);
            /* v1 keys go too. Leaving them would mean a wiped device that
             * later downgrades the app still reads a stale pilot. */
            localStorage.removeItem(OLD_NS + "ship");
            localStorage.removeItem(OLD_NS + "stats");
        } catch (e) { /* ignore */ }
    }

    S.Storage = {
        getSeed: getSeed,
        getShip: getShip,
        saveShip: saveShip,
        defaultShip: defaultShip,
        /* Hangar. Kept beside the ship accessors so a caller that owns one
         * obviously owns the other. */
        getHangar: getHangar,
        saveHangar: saveHangar,
        defaultHangar: defaultHangar,
        resolveFit: resolveFit,
        ownsHull: ownsHull,
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