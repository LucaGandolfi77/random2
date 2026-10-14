/*
 * SECTOR 7 - the map table.
 *
 * One table says what every place you can fly is. There are two kinds:
 *
 *   kind "sector"  - the graded frontier, gated on lifetime crystals, with
 *                    a hazard and a payout multiplier.
 *   kind "faction" - one faction's territory. Same generator, same station,
 *                    same contract board; the difference is who lives there,
 *                    what their base is worth, and that they do not all pay
 *                    the same.
 *
 * Both kinds live in one list on purpose. A travel screen that lists one
 * thing is a travel screen you understand; two lists with two unlock rules
 * is a menu you have to be taught.
 *
 * The field on the ship is still called `sector` because `bank()`,
 * `applySave()`, `getShip()`, `travelTo`, the contract board and the bounty
 * all read it. Widening the set of values it can hold costs one line;
 * renaming it would touch six modules for tidiness nobody would notice.
 */
(function (S) {
    "use strict";

    /* Ordered by gate, and tier cap and payout both climb with it. The
     * ladder is the point: reaching a later map means passing the earlier
     * ones, so ordering falls out of the numbers and there is no second
     * condition to keep in step with the first. */
    var MAPS = [
        /* ===== Frontier sectors ===== */
        {
            id: "rook", kind: "sector",
            name: "ROOK", subtitle: "Outer shelf",
            blurb: "Shallow rock shelf and light patrols. Learn the sector here.",
            gate: 0,
            size: 4600, rocks: 34, crates: 20,
            npcMax: 10, tierCap: 3, npcSpeed: 1.0,
            payout: 1.0,
            hazard: null,
            palette: {
                nebula: ["26,58,112", "58,38,104"],
                rock: "#6b6f7a", rockRich: "#7c7186",
                grid: "rgba(70,120,180,0.10)",
                wall: "rgba(90,150,220,0.45)",
                accent: "#67e8f9",
            },
        },
        /* ===== Faction territories =====
         * One per faction, interleaved with the frontier by difficulty.
         * Each carries a `faction` key and that faction s BASE, a structure
         * big enough to be a landmark and worth enough to be a raid.
         *
         * `baseReward` is crystals for taking the base down. `raids` is how
         * many defender waves it throws before its core is exposed, which is
         * what makes a Hive base a fight rather than a formality. */
        {
            id: "f_raider", kind: "faction", faction: "raider",
            name: "SCRAPYARD", subtitle: "Raider territory",
            blurb: "Where the raiders strip wrecks. Nothing here is shielded, so bring the laser.",
            gate: 60,
            size: 4400, rocks: 30, crates: 24,
            npcMax: 12, tierCap: 3, npcSpeed: 1.0,
            payout: 1.15,
            baseRadius: 230, baseReward: 40, raids: 1,
            hazard: { kind: "storm", count: 1, radius: 560, cycle: 30, activeFor: 5 },
            palette: {
                nebula: ["96,72,24", "62,44,26"],
                rock: "#77715f", rockRich: "#8a7a52",
                grid: "rgba(200,160,80,0.10)",
                wall: "rgba(230,190,110,0.45)",
                accent: "#f4a23f",
            },
        },
        {
            id: "kestrel", kind: "sector",
            name: "KESTREL", subtitle: "Ion shelf",
            blurb: "Thin atmosphere, bad weather. Ion storms scramble your stick.",
            gate: 140,
            size: 5000, rocks: 28, crates: 22,
            npcMax: 13, tierCap: 5, npcSpeed: 1.05,
            payout: 1.35,
            hazard: { kind: "storm", count: 2, radius: 620, cycle: 26, activeFor: 7 },
            palette: {
                nebula: ["18,86,86", "22,54,120"],
                rock: "#6a7278", rockRich: "#79718a",
                grid: "rgba(60,150,150,0.10)",
                wall: "rgba(80,190,180,0.45)",
                accent: "#5eead4",
            },
        },
        {
            id: "f_drone", kind: "faction", faction: "drone",
            name: "THE PIN", subtitle: "Drone territory",
            blurb: "Paper hulls, endless numbers, and nothing that ever retreats.",
            gate: 220,
            size: 4800, rocks: 26, crates: 28,
            npcMax: 17, tierCap: 5, npcSpeed: 1.14,
            payout: 1.40,
            baseRadius: 250, baseReward: 70, raids: 2,
            hazard: { kind: "storm", count: 3, radius: 480, cycle: 22, activeFor: 8 },
            palette: {
                nebula: ["40,110,50", "24,70,80"],
                rock: "#5f7160", rockRich: "#6f8a62",
                grid: "rgba(140,220,120,0.10)",
                wall: "rgba(170,240,130,0.45)",
                accent: "#9ae66e",
            },
        },
        {
            id: "f_pirate", kind: "faction", faction: "pirate",
            name: "POGO REACH", subtitle: "Pirate territory",
            blurb: "Half-shielded raiders, and either gun works on them. Bring whatever you like.",
            gate: 300,
            size: 5000, rocks: 30, crates: 22,
            npcMax: 14, tierCap: 5, npcSpeed: 1.06,
            payout: 1.55,
            baseRadius: 260, baseReward: 110, raids: 2,
            hazard: { kind: "storm", count: 2, radius: 600, cycle: 24, activeFor: 6 },
            palette: {
                nebula: ["120,30,50", "70,20,80"],
                rock: "#6b5f6a", rockRich: "#876a72",
                grid: "rgba(220,90,110,0.10)",
                wall: "rgba(255,120,140,0.45)",
                accent: "#ff5470",
            },
        },
        {
            id: "f_cruiser", kind: "faction", faction: "cruiser",
            name: "LONG REACH", subtitle: "Cruiser territory",
            blurb: "Big hulls with long guns that fight at the far edge of their range.",
            gate: 400,
            size: 5400, rocks: 32, crates: 20,
            npcMax: 13, tierCap: 6, npcSpeed: 1.12,
            payout: 1.70,
            baseRadius: 280, baseReward: 150, raids: 2,
            hazard: { kind: "void", count: 2, radius: 540 },
            palette: {
                nebula: ["26,66,120", "20,44,90"],
                rock: "#5f6675", rockRich: "#6f7a90",
                grid: "rgba(90,160,240,0.10)",
                wall: "rgba(110,180,255,0.45)",
                accent: "#4a9fe0",
            },
        },
        {
            id: "vanta", kind: "sector",
            name: "VANTA", subtitle: "Dead nebula",
            blurb: "A dead nebula that eats your shields. Nothing regenerates out here.",
            gate: 420,
            size: 5200, rocks: 40, crates: 26,
            npcMax: 14, tierCap: 7, npcSpeed: 1.08,
            payout: 1.8,
            hazard: { kind: "void", count: 4, radius: 520 },
            palette: {
                nebula: ["92,42,124", "40,30,110"],
                rock: "#5f5a6e", rockRich: "#7a6488",
                grid: "rgba(130,90,180,0.10)",
                wall: "rgba(180,110,220,0.45)",
                accent: "#c4b5fd",
            },
        },
        {
            id: "f_alien", kind: "faction", faction: "alien",
            name: "DEMANER", subtitle: "Alien territory",
            blurb: "Shield-dominant Demaner. The laser bounces here; only the round bites.",
            gate: 540,
            size: 5600, rocks: 38, crates: 24,
            npcMax: 14, tierCap: 7, npcSpeed: 1.02,
            payout: 1.95,
            baseRadius: 300, baseReward: 210, raids: 3,
            hazard: { kind: "void", count: 3, radius: 560 },
            palette: {
                nebula: ["88,36,130", "38,26,110"],
                rock: "#5b5570", rockRich: "#7a6494",
                grid: "rgba(150,100,210,0.10)",
                wall: "rgba(190,120,240,0.45)",
                accent: "#8a5fd0",
            },
        },
        {
            id: "f_hive", kind: "faction", faction: "hive",
            name: "THE HIVE", subtitle: "Hive territory",
            blurb: "Almost pure shield, and it builds its own. The hardest place to shoot.",
            gate: 780,
            size: 5800, rocks: 28, crates: 20,
            npcMax: 16, tierCap: 8, npcSpeed: 1.08,
            payout: 2.25,
            baseRadius: 320, baseReward: 320, raids: 4,
            hazard: { kind: "well", count: 2, radius: 620, pull: 120 },
            palette: {
                nebula: ["140,36,110", "60,20,90"],
                rock: "#5e5266", rockRich: "#8a5a80",
                grid: "rgba(230,90,180,0.10)",
                wall: "rgba(240,120,190,0.45)",
                accent: "#e05fa8",
            },
        },
        {
            id: "maw", kind: "sector",
            name: "MAW", subtitle: "The gravity well",
            blurb: "Gravity wells bend every trajectory. Everything in here wants you gone.",
            gate: 900,
            size: 5400, rocks: 24, crates: 18,
            npcMax: 15, tierCap: 8, npcSpeed: 1.12,
            payout: 2.4,
            hazard: { kind: "well", count: 3, radius: 700, pull: 150 },
            palette: {
                nebula: ["120,40,60", "70,26,96"],
                rock: "#5a5560", rockRich: "#7d5f6e",
                grid: "rgba(190,90,110,0.10)",
                wall: "rgba(230,110,120,0.45)",
                accent: "#fda4af",
            },
        },
    ];

    var byId = {};
    for (var i = 0; i < MAPS.length; i++) byId[MAPS[i].id] = MAPS[i];

    function get(id) {
        return byId[id] || MAPS[0];
    }

    function index(id) {
        for (var k = 0; k < MAPS.length; k++) if (MAPS[k].id === id) return k;
        return 0;
    }

    /* Sectors are gated on LIFETIME crystals, never the spendable balance:
     * refits spend crystals, and a map that locked itself the moment you
     * bought something would be a trap rather than a goal. */
    function gateOf(m) {
        return index(m.id) === 0 ? 0 : m.gate;
    }

    function isUnlocked(id, lifetimeCrystals) {
        return lifetimeCrystals >= gateOf(get(id));
    }

    function nextLocked(lifetimeCrystals) {
        for (var k = 0; k < MAPS.length; k++) {
            if (!isUnlocked(MAPS[k].id, lifetimeCrystals)) return MAPS[k];
        }
        return null;
    }

    /* Progress toward the next unlock, for the station list. */
    function unlockProgress(lifetimeCrystals) {
        var next = nextLocked(lifetimeCrystals);
        if (!next) return { done: true, next: null, frac: 1, short: 0 };

        var k = index(next.id);
        var prevGate = k === 0 ? 0 : MAPS[k - 1].gate;
        var span = Math.max(1, next.gate - prevGate);
        return {
            done: false,
            next: next,
            frac: S.clamp((lifetimeCrystals - prevGate) / span, 0, 1),
            short: Math.max(0, next.gate - lifetimeCrystals),
        };
    }

    S.MAPS = MAPS;

    /* `S.Sector` is kept as the accessor name. Renaming it would touch the
     * generator, the station travel list, the contract board, the bounty and
     * the minimap, and none of those care whether the thing they are reading
     * is a frontier sector or a faction's territory. */
    S.Sector = {
        all: MAPS,
        get: get,
        index: index,
        gateOf: gateOf,
        isUnlocked: isUnlocked,
        nextLocked: nextLocked,
        unlockProgress: unlockProgress,

        isFaction: function (id) { return get(id).kind === "faction"; },
        factionOf: function (id) { return get(id).faction || null; },

        /* Only one map is free, and it is the first. */
        byKind: function (kind) {
            return MAPS.filter(function (m) { return m.kind === kind; });
        },

        /* Every sector gets its own sector of the seed space, so two maps
         * never roll the same rock field. The map id is in the hash, so a
         * faction territory cannot collide with the sector it sits between. */
        seedFor: function (base, id) {
            return (S.hashString("sector7:" + id) ^ (base >>> 0)) >>> 0;
        },
    };

})(window.S7 = window.S7 || {});