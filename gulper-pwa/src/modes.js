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

    /* The biomass handed to you at each titan, exactly as the campaign
     * ends those districts with it. modes.test walks the whole
     * procession at these numbers, so if the campaign's balance moves
     * and a stage stops being winnable, the suite names the rotted
     * stage instead of shipping it. */
    var STAGE_CARRY = [106, 242, 421, 608, 834, 1042];
    var STAGE_BIOMES = ["docks", "downtown", "ward", "arctic", "foundry", "hive"];

    /* The campaign's own carrying values: one per level, the mass the
     * campaign had in hand when it walked into that street, as played
     * by the bot the campaign suite proves can finish it. The daily
     * hunt hands you exactly that, so today's level arrives at its
     * front door rather than thrown into the cellar, whatever your own
     * campaign progress happens to be. */
    var CAMPAIGN_MASS = [
        12, 26, 52, 73, 75, 106, 120, 136, 152, 183,
        207, 209, 242, 245, 264, 266, 285, 328, 371, 421,
        437, 473, 489, 534, 558, 606, 608, 627, 672, 708,
        763, 765, 810, 834, 850, 881, 912, 914, 957, 1021,
        1042, 1045
    ];

    S.Modes = {
        /* ENDLESS NIGHT. time 0 means the objective has no clock and no
         * win path: the run only ends when you are hollowed out. */
        feastLevel: function () {
            return {
                id: "endless", biome: "downtown", index: 0,
                name: "Endless Night",
                brief: "The district keeps producing. You keep taking.",
                objective: { type: "survive", count: 1, time: 0, label: "THE FEAST ETERNAL" },
                objectiveName: "ENDLESS", boss: false,
                noise: 1.1, density: 1.2,
                prey: 12, foes: 2, rivals: 0,
                seed: Date.now() & 0xffff,
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
         * "daily" so it can never write a campaign record. */
        dailyLevel: function (date) {
            var seed = S.dailySeed(date);
            var ids = S.Levels.list.map(function (l) { return l.id; });
            var pick = ids[seed % ids.length];
            var src = S.Levels.get(pick);
            var index = S.Levels.list.indexOf(src);
            return {
                seed: src.seed,
                level: Object.assign({}, src, {
                    modeTag: "daily",
                    /* Enter with the biomass the campaign had walked in
                     * with. */
                    carry: index > 0 ? CAMPAIGN_MASS[index - 1] : 0
                })
            };
        },

        /* THE PROCESSION. Stage i is the campaign's own titan for that
         * district, re-entered at the campaign's own handed-down mass
         * instead of save.carry, so a procession run can never disturb,
         * or be disturbed by, the campaign's spine. */
        stageCount: STAGE_BIOMES.length,
        stageCarry: function (i) { return STAGE_CARRY[i]; },
        stageLevel: function (i) {
            var src = S.Levels.get(STAGE_BIOMES[i] + "-boss");
            return Object.assign({}, src, {
                id: "rush-" + STAGE_BIOMES[i],
                modeTag: "rush"
            });
        },

        /* Which procession stage a world belongs to (-1 when none). */
        stageOf: function (level) {
            if (!level || level.modeTag !== "rush") return -1;
            return STAGE_BIOMES.indexOf(level.biome);
        },

        /* The biomass a level should be entered with. campaign levels
         * return undefined (use the save); the feast starts small; a
         * procession stage uses the handed-down table; the daily uses
         * the campaign ledger value carried on the level itself. */
        levelCarry: function (level) {
            if (!level || !level.modeTag) return undefined;
            if (level.carry !== undefined) return level.carry;
            if (level.modeTag === "rush") return STAGE_CARRY[STAGE_BIOMES.indexOf(level.biome)];
            if (level.modeTag === "feast") return 0;
            return undefined;
        }
    };

    /* Exposed so tests and the results screen can name stages. */
    S.Modes.STAGE_CARRY = STAGE_CARRY;
    S.Modes.STAGE_BIOMES = STAGE_BIOMES;
    S.Modes.CAMPAIGN_MASS = CAMPAIGN_MASS;
})(window.GU = window.GU || {});
