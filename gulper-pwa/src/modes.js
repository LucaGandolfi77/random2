/*
 * GULPER - the shrines outside the campaign.
 *
 * Three ways to feed that never touch the campaign map, its unlock
 * chain or its level records:
 *
 *   ENDLESS NIGHT  - one arena, no clock, no exit. The district keeps
 *                    producing and the response keeps escalating. The
 *                    run ends when you are hollowed out, so the score
 *                    is the biggest thing you ever became.
 *   DAILY HUNT     - one campaign mission, picked by the date, so every
 *                    player in the world eats the same street on the
 *                    same day. The seed is the date, so the level and
 *                    its layout match everywhere.
 *   THE PROCESSION - the six titans, one after another, each entered
 *                    with the biomass the campaign itself ends the
 *                    previous district with. A loss ends the run.
 *
 * The synthetic levels built here live outside S.Levels.list on
 * purpose: the map, the unlock chain and the save's level records must
 * not learn about them. They are handed to S.World.create directly
 * (opts.level), and they carry a modeTag so the end-of-level bookkeeping
 * knows which shrine it is closing.
 *
 * This module is pure: nothing here runs at load time, and nothing
 * here writes to the save except through S.Storage.
 */
(function (S) {
    "use strict";

    /* The campaign's own carrying values, one per level id: the mass
     * the campaign had in hand when it walked into that street, as
     * played by the bot the campaign suite proves can finish it. The
     * daily hunt hands you exactly that, so today's level arrives at
     * its front door rather than thrown into the cellar, whatever your
     * own campaign progress happens to be.
     *
     * Keyed by id, never by index: adding a level to the campaign must
     * not move the level a past date plays. The numbers come from the
     * chain the simulation proves, and tests/daily.test.js checks this
     * table against that chain - so if the campaign's balance moves,
     * the suite names the rotted level instead of letting the daily
     * drift into unwinnable streets.
     *
     * Regenerate with: node tools/ledger.js */
    /* LEDGER:BEGIN */
    var ENTRY_MASS = {
        "docks-1": 0, "docks-2": 12, "docks-3": 26, "docks-4": 52,
        "docks-5": 73, "docks-6": 75, "docks-boss": 106, "downtown-1": 120,
        "downtown-2": 136, "downtown-3": 152, "downtown-4": 183,
        "downtown-5": 207, "downtown-6": 209, "downtown-boss": 242,
        "ward-1": 245, "ward-2": 264, "ward-3": 266, "ward-4": 285,
        "ward-5": 328, "ward-6": 371, "ward-boss": 421, "arctic-1": 437,
        "arctic-2": 473, "arctic-3": 489, "arctic-4": 534, "arctic-5": 555,
        "arctic-6": 603, "arctic-boss": 605, "foundry-1": 624,
        "foundry-2": 672, "foundry-3": 698, "foundry-4": 736,
        "foundry-5": 738, "foundry-6": 786, "foundry-boss": 814,
        "hive-1": 830, "hive-2": 854, "hive-3": 892, "hive-4": 894,
        "hive-5": 954, "hive-6": 999, "hive-boss": 1032, "cathedral-1": 1035,
        "cathedral-2": 1066, "cathedral-3": 1085, "cathedral-4": 1133,
        "cathedral-5": 1166, "cathedral-6": 1168, "cathedral-boss": 1218,
    };
    /* LEDGER:END */

    /* The procession walks the titans in the order the campaign meets
     * them. It is derived from the campaign itself rather than written
     * out, so a new district brings its titan along automatically
     * instead of needing three edits in three files. */
    function titanOrder() {
        var out = [];
        var seen = {};
        for (var i = 0; i < S.Levels.list.length; i++) {
            var l = S.Levels.list[i];
            if (!l.boss) continue;
            if (seen[l.biome]) continue;
            seen[l.biome] = true;
            out.push(l.biome);
        }
        return out;
    }

    /* The biomass handed to you at each titan: the mass the campaign
     * itself ends that district with. modes.test walks the whole
     * procession at these numbers, so if the campaign's balance moves
     * and a stage stops being winnable, the suite names the rotted
     * stage instead of shipping it. */
    function stageCarry(i) {
        var biomes = titanOrder();
        var biome = biomes[i];
        if (!biome) return 0;
        var id = biome + "-boss";
        return ENTRY_MASS[id] !== undefined ? ENTRY_MASS[id] : 0;
    }

    S.Modes = {
        /* ENDLESS NIGHT. time 0 means the objective has no clock and no
         * win path: the run only ends when you are hollowed out.
         *
         * The seed can be handed in. The live game picks a fresh one
         * every night; a test asks for a fixed one, so that what it
         * measures is the rules and not the luck of the draw. */
        feastLevel: function (seed) {
            return {
                id: "endless", biome: "downtown", index: 0,
                name: "Endless Night",
                brief: "The district keeps producing. You keep taking.",
                objective: { type: "survive", count: 1, time: 0, label: "THE FEAST ETERNAL" },
                objectiveName: "ENDLESS", boss: false,
                noise: 1.1, density: 1.2,
                prey: 12, foes: 2, rivals: 0,
                seed: seed !== undefined ? seed : (Date.now() & 0xffff),
                starTime: 240, starAlarm: 70, starMass: 300,
                /* Starts the wave producer in World.create. */
                endless: true,
                modeTag: "feast"
            };
        },

        /* DAILY HUNT. The date picks one campaign mission; every device
         * that day plays the same street, entered with the biomass the
         * campaign had walked in with. The level keeps its own seed -
         * the layout the campaign itself tuned that street with - so
         * the hunt is the campaign's fight, not a seeded remix that the
         * handed-down mass was never tuned for. The clone is tagged
         * "daily" so it can never write a campaign record.
         *
         * The pick is hashed from the date, not taken modulo the level
         * count: adding a level to the campaign must not move the
         * street a past date played. */
        dailyLevel: function (date) {
            var seed = S.dailySeed(date);
            var ids = S.Levels.list.map(function (l) { return l.id; });
            var pick = ids[S.hashString("gulper-daily-" + seed) % ids.length];
            var src = S.Levels.get(pick);
            return {
                seed: src.seed,
                level: Object.assign({}, src, {
                    modeTag: "daily",
                    /* Enter with the biomass the campaign had walked in
                     * with. */
                    carry: S.Modes.entryMass(src.id)
                })
            };
        },

        /* THE PROCESSION. Stage i is the campaign's own titan for that
         * district, re-entered at the campaign's own handed-down mass
         * instead of save.carry, so a procession run can never disturb,
         * or be disturbed by, the campaign's spine. */
        stageCount: titanOrder().length,
        stageCarry: stageCarry,
        stageLevel: function (i) {
            var biomes = titanOrder();
            var src = S.Levels.get(biomes[i] + "-boss");
            return Object.assign({}, src, {
                id: "rush-" + biomes[i],
                modeTag: "rush"
            });
        },

        /* Which procession stage a world belongs to (-1 when none). */
        stageOf: function (level) {
            if (!level || level.modeTag !== "rush") return -1;
            return titanOrder().indexOf(level.biome);
        },

        /* The biomass the campaign had in hand when it walked into this
         * level. Zero when the ledger does not know the level yet. */
        entryMass: function (id) {
            return ENTRY_MASS[id] !== undefined ? ENTRY_MASS[id] : 0;
        },

        /* The biomass a level should be entered with. campaign levels
         * return undefined (use the save); the feast starts small; a
         * procession stage uses the handed-down table; the daily uses
         * the campaign ledger value carried on the level itself. */
        levelCarry: function (level) {
            if (!level || !level.modeTag) return undefined;
            if (level.carry !== undefined) return level.carry;
            if (level.modeTag === "rush") return stageCarry(titanOrder().indexOf(level.biome));
            if (level.modeTag === "feast") return 0;
            return undefined;
        }
    };

    /* Exposed so tests and the results screen can name stages. */
    S.Modes.STAGE_BIOMES = titanOrder();
    S.Modes.ENTRY_MASS = ENTRY_MASS;
})(window.GU = window.GU || {});
