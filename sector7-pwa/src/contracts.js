/*
 * SECTOR 7 - station contracts.
 *
 * Without these the station is a shop you visit when you happen to run out
 * of energy. A board of rotating objectives is what makes docking a decision
 * instead of a chore, and it gives crystals - which are otherwise only a
 * score - somewhere to go.
 *
 * The board is seeded per sector, so it is the same set of three on every
 * visit and the player can plan around it rather than reroll for free.
 */
(function (S) {
    "use strict";

    var KINDS = {
        rocks: {
            label: "Strip the shelf",
            verb: "break rich rocks",
            unit: "rocks",
            /* Measured per sector so the payout scales with the map. */
            count: function (sec) { return 5 + S.Sector.index(sec.id) * 2; },
        },
        kills: {
            label: "Clear the airspace",
            verb: "destroy pirates",
            unit: "pirates",
            count: function (sec) { return 3 + S.Sector.index(sec.id) * 2; },
        },
        crates: {
            label: "Salvage run",
            verb: "open crates",
            unit: "crates",
            count: function () { return 6; },
        },
        survive: {
            label: "Hold the line",
            verb: "survive without wrecking",
            unit: "seconds",
            count: function (sec) { return 45 + S.Sector.index(sec.id) * 15; },
        },
        crystals: {
            label: "Haul",
            verb: "bank crystals",
            unit: "crystals",
            count: function (sec) { return 12 + S.Sector.index(sec.id) * 10; },
        },
    };

    var board = null;
    var sectorId = null;

    function makeBoard(sec, seed) {
        var rng = S.mulberry32(S.hashString("contract:" + sec.id + ":" + seed));
        var keys = Object.keys(KINDS);
        var picked = [];
        /* Shuffle, then take three. Distinct kinds so the three objectives
         * never ask for the same thing twice. */
        for (var i = keys.length - 1; i > 0; i--) {
            var j = (rng() * (i + 1)) | 0;
            var t = keys[i]; keys[i] = keys[j]; keys[j] = t;
        }
        for (i = 0; i < 3; i++) {
            var key = keys[i];
            var kind = KINDS[key];
            var target = kind.count(sec);
            board_push({
                id: sec.id + ":" + key,
                kind: key,
                label: kind.label,
                verb: kind.verb,
                unit: kind.unit,
                target: target,
                progress: 0,
                done: false,
                claimed: false,
                /* Crystals scale with the sector's payout multiplier, which
                 * is the whole reason a harder map is worth the detour. */
                reward: Math.round((10 + target * 1.5) * (sec.payout || 1)),
            });
        }
    }

    function board_push(c) {
        board.push(c);
        return c;
    }

    /* Build (or rebuild) the board for a sector. */
    function forSector(sec, seed) {
        sectorId = sec.id;
        board = [];
        makeBoard(sec, seed);
        return board;
    }

    function list() { return board || []; }

    function find(id) {
        var l = list();
        for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
        return null;
    }

    /* Feed world events in. Kept as a single entry point so the contract
     * logic never has to reach into the simulation. */
    function note(kind, amount, payload) {
        var l = list();
        for (var i = 0; i < l.length; i++) {
            var c = l[i];
            if (c.done || c.kind !== kind) continue;
            var gain = amount;
            /* "rich rocks" only counts the marked ones, otherwise the cheapest
             * possible rock clears the contract and the objective is a lie. */
            if (kind === "rocks" && payload && payload.rich === false) continue;
            c.progress = Math.min(c.target, c.progress + gain);
            if (c.progress >= c.target) c.done = true;
        }
    }

    /* Survive contracts only run while the player is actually flying: docking
     * to top up must not silently refund them, and dying is handled
     * separately by resetRun() so the reset is a visible event rather than a
     * side effect of "not currently flying". */
    function tick(dt, flying) {
        if (!flying) return;
        var l = list();
        for (var i = 0; i < l.length; i++) {
            var c = l[i];
            if (c.done || c.kind !== "survive") continue;
            c.progress = Math.min(c.target, c.progress + dt);
            if (c.progress >= c.target) c.done = true;
        }
    }

    /* Called when the player is wrecked. Uncompleted survive contracts go
     * back to zero - the run they were about is over - but everything else
     * keeps its progress, because you did the work before you died. */
    function resetRun() {
        var l = list();
        for (var i = 0; i < l.length; i++) {
            if (l[i].kind === "survive" && !l[i].done) l[i].progress = 0;
        }
    }

    function claim(id) {
        var c = find(id);
        if (!c || !c.done || c.claimed) return null;
        c.claimed = true;
        return c.reward;
    }

    /* A finished contract leaves a hole in the board; refill from the same
     * seeded pool so the player cannot farm the easiest one repeatedly. */
    function refresh() {
        var l = list();
        var sec = S.Sector.get(sectorId);
        var all = [];
        for (var k in KINDS) {
            var kind = KINDS[k];
            all.push({
                id: sec.id + ":" + k, kind: k, label: kind.label, verb: kind.verb,
                unit: kind.unit, target: kind.count(sec), progress: 0,
                done: false, claimed: false,
                reward: Math.round((10 + kind.count(sec) * 1.5) * (sec.payout || 1)),
            });
        }
        for (var i = 0; i < l.length; i++) {
            if (!l[i].claimed) continue;
            var used = {};
            for (var j = 0; j < l.length; j++) if (l[j].kind) used[l[j].kind] = true;
            var open = null;
            for (var n = 0; n < all.length; n++) {
                if (!used[all[n].kind]) { open = all.splice(n, 1)[0]; break; }
            }
            if (open) l[i] = open;
        }
        return l;
    }

    function clear() { board = null; sectorId = null; }

    S.Contracts = {
        KINDS: KINDS,
        forSector: forSector,
        list: list,
        find: find,
        note: note,
        tick: tick,
        resetRun: resetRun,
        claim: claim,
        refresh: refresh,
        clear: clear,
    };

})(window.S7 = window.S7 || {});