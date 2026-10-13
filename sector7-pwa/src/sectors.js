/*
 * SECTOR 7 - sector definitions.
 *
 * One file that says what each map is. The generator, the renderer, the AI
 * and the station all read from here, so a new sector is one row rather than
 * a branch in five systems.
 *
 * Sectors are gated on lifetime crystals, not spendable ones: refits spend
 * crystals, and a sector that locked itself the moment you spent would be a
 * trap rather than a goal.
 */
(function (S) {
    "use strict";

    var SECTORS = [
        {
            id: "rook",
            name: "ROOK",
            subtitle: "Outer shelf",
            blurb: "Shallow rock shelf and light patrols. Learn the sector here.",
            gate: 0,
            size: 4600,
            rocks: 34,
            crates: 20,
            npcMax: 10,
            tierCap: 3,
            npcSpeed: 1.0,
            /* Reward multiplier: the outer shelf pays less because it is the
             * place you start, not because it is harder to clear. */
            payout: 1.0,
            hazard: null,
            palette: {
                nebula: ["26,58,112", "58,38,104"],
                rock: "#6b6f7a",
                rockRich: "#7c7186",
                grid: "rgba(70,120,180,0.10)",
                wall: "rgba(90,150,220,0.45)",
                accent: "#67e8f9",
            },
        },
        {
            id: "kestrel",
            name: "KESTREL",
            subtitle: "Ion shelf",
            blurb: "Thin atmosphere, bad weather. Ion storms scramble your stick.",
            gate: 140,
            size: 5000,
            rocks: 28,
            crates: 22,
            npcMax: 13,
            tierCap: 5,
            npcSpeed: 1.05,
            payout: 1.35,
            hazard: { kind: "storm", count: 2, radius: 620, cycle: 26, activeFor: 7 },
            palette: {
                nebula: ["18,86,86", "22,54,120"],
                rock: "#6a7278",
                rockRich: "#79718a",
                grid: "rgba(60,150,150,0.10)",
                wall: "rgba(80,190,180,0.45)",
                accent: "#5eead4",
            },
        },
        {
            id: "vanta",
            name: "VANTA",
            subtitle: "Dead nebula",
            blurb: "A dead nebula that eats your shields. Nothing regenerates out here.",
            gate: 420,
            size: 5200,
            rocks: 40,
            crates: 26,
            npcMax: 14,
            tierCap: 7,
            npcSpeed: 1.08,
            payout: 1.8,
            hazard: { kind: "void", count: 4, radius: 520 },
            palette: {
                nebula: ["92,42,124", "40,30,110"],
                rock: "#5f5a6e",
                rockRich: "#7a6488",
                grid: "rgba(130,90,180,0.10)",
                wall: "rgba(180,110,220,0.45)",
                accent: "#c4b5fd",
            },
        },
        {
            id: "maw",
            name: "MAW",
            subtitle: "The gravity well",
            blurb: "Gravity wells bend every trajectory. Everything in here wants you gone.",
            gate: 900,
            size: 5400,
            rocks: 24,
            crates: 18,
            npcMax: 15,
            tierCap: 8,
            npcSpeed: 1.12,
            payout: 2.4,
            hazard: { kind: "well", count: 3, radius: 700, pull: 150 },
            palette: {
                nebula: ["120,40,60", "70,26,96"],
                rock: "#5a5560",
                rockRich: "#7d5f6e",
                grid: "rgba(190,90,110,0.10)",
                wall: "rgba(230,110,120,0.45)",
                accent: "#fda4af",
            },
        },
    ];

    var byId = {};
    for (var i = 0; i < SECTORS.length; i++) byId[SECTORS[i].id] = SECTORS[i];

    function get(id) {
        return byId[id] || SECTORS[0];
    }

    function index(id) {
        for (var k = 0; k < SECTORS.length; k++) if (SECTORS[k].id === id) return k;
        return 0;
    }

    /* Sectors unlock on lifetime crystals, and the gates are a ladder: each
     * one is higher than the last, so reaching a later sector means passing
     * the earlier ones. Ordering therefore falls out of the numbers, and
     * there is no second condition to keep in step with the first.
     *
     * The gate is on *lifetime* crystals, never the spendable balance -
     * refits spend crystals, and a sector that locked itself the moment you
     * bought something would be a trap rather than a goal. */
    function gateOf(s) {
        return index(s.id) === 0 ? 0 : s.gate;
    }

    function isUnlocked(id, lifetimeCrystals) {
        return lifetimeCrystals >= gateOf(get(id));
    }

    function nextLocked(lifetimeCrystals) {
        for (var k = 0; k < SECTORS.length; k++) {
            if (!isUnlocked(SECTORS[k].id, lifetimeCrystals)) return SECTORS[k];
        }
        return null;
    }

    /* Progress toward the next unlock, for the station list. */
    function unlockProgress(lifetimeCrystals) {
        var next = nextLocked(lifetimeCrystals);
        if (!next) return { done: true, next: null, frac: 1, short: 0 };

        var k = index(next.id);
        var prevGate = k === 0 ? 0 : SECTORS[k - 1].gate;
        var span = Math.max(1, next.gate - prevGate);
        return {
            done: false,
            next: next,
            frac: S.clamp((lifetimeCrystals - prevGate) / span, 0, 1),
            short: Math.max(0, next.gate - lifetimeCrystals),
        };
    }

    S.SECTORS = SECTORS;
    S.Sector = {
        all: SECTORS,
        get: get,
        index: index,
        gateOf: gateOf,
        isUnlocked: isUnlocked,
        nextLocked: nextLocked,
        unlockProgress: unlockProgress,
        /* Every sector gets its own sector of the seed space, so two maps
         * never roll the same rock field. */
        seedFor: function (base, id) {
            return (S.hashString("sector7:" + id) ^ (base >>> 0)) >>> 0;
        },
    };

})(window.S7 = window.S7 || {});