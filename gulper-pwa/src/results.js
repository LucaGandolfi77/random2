/*
 * GULPER - the books.
 *
 * What happens when a level ends.
 *
 * This used to live in main.js, which is browser-only: the medals, the
 * shards, the carry and the shrine records could not be tested, because
 * the only way to run them was to open a page. Here they are a module
 * the test harness can call, and main.js only has to show what this
 * decided.
 *
 * The rule the whole game rests on: the campaign's spine is save.carry,
 * the biomass you carry from one level to the next. The shrines play
 * outside the campaign and must never touch it, so a shrine run never
 * writes a level record, never grants campaign shards and never moves
 * the carry.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    /* What a finished level is worth.
     *
     * Returns the numbers the results screen needs, so the screen and
     * the books can never disagree about what happened. */
    function settle(world) {
        var tag = world.modeTag || null;
        var peak = Math.round(world.stats.peakMass);
        var won = world.status === "won";
        var out = {
            mode: tag,
            won: won,
            stars: 0,
            shards: 0,
            peak: peak,
            levelId: world.level ? world.level.id : null
        };

        /* The shrines settle their own accounts: no campaign stars, no
         * campaign shards, and never a touch of save.carry. */
        if (tag) {
            if (tag === "feast") {
                out.best = S.Storage.recordFeast(peak);
            } else if (tag === "daily") {
                out.best = S.Storage.recordDaily(S.dailySeed(), peak);
            } else if (tag === "rush") {
                var stage = S.Modes.stageOf(world.level) + 1;
                out.stage = stage;
                out.stages = S.Modes.stageCount;
                S.Storage.recordRush(won ? stage : 0, peak);
            }
            S.Storage.save();
            return out;
        }

        /* The campaign. */
        out.stars = S.World.rate(world);
        if (won) {
            S.Storage.recordLevel(world.level.id, out.stars, peak, true);
            /* What the level is worth, decided in one place: a fixed
             * sum for finishing it, a little more for each star, and a
             * bonus for putting a titan down. The screen shows this
             * number and the purse receives this number. */
            out.shards += C.shards.perLevel;
            out.shards += out.stars * C.shards.perStar;
            /* A medal is a level finished with all three stars. The
             * first time you earn it on a level is the first time it
             * counts; farming the same level again does not make you
             * more decorated. */
            if (out.stars === 3) S.Storage.recordMedal(world.level.id);
        }
        if (world.level.boss && won) {
            S.Storage.bump("bosses");
            out.shards += C.shards.eliteBonus;
        }
        if (out.shards) S.Storage.addShards(out.shards);

        /* Keep the size you grew into. The campaign's spine is that
         * the thing which was too heavy for you last level is a
         * mouthful this one. */
        var save = S.Storage.data();
        save.carry = Math.max(save.carry || 0, peak);
        S.Storage.save();
        return out;
    }

    /* A run that started. Counted when the level begins, not when it
     * is won: a run that ended badly is still a run, and a stats
     * screen that only counts victories is not a stats screen. */
    function begin(world) {
        if (world && world.modeTag) return;
        S.Storage.bump("runs");
    }

    /* A run that ended badly. */
    function ended(world) {
        if (!world || world.status !== "lost") return;
        if (world.modeTag) return;
        S.Storage.bump("deaths");
    }

    S.Results = {
        settle: settle,
        begin: begin,
        ended: ended,

        /* The numbers the stats screen shows, computed in one place so
         * the screen cannot disagree with the books. */
        summary: function () {
            var save = S.Storage.data();
            var cleared = 0, stars = 0, medals = 0;
            for (var k in save.levels) {
                var rec = save.levels[k];
                if (rec.cleared) cleared++;
                stars += rec.stars || 0;
                if (rec.stars >= 3) medals++;
            }
            return {
                levels: cleared,
                totalLevels: S.Levels.total(),
                stars: stars,
                maxStars: S.Levels.total() * 3,
                medals: medals,
                shards: save.shards,
                swallowed: save.total || 0,
                bestMass: save.bestMass || 0,
                bosses: save.stats.bosses || 0,
                runs: save.stats.runs || 0,
                deaths: save.stats.deaths || 0,
                downs: save.stats.downs || 0,
                feast: save.feast || 0,
                rush: save.rush.stage || 0,
                rushTotal: S.Modes.stageCount,
                daily: save.daily.best || 0
            };
        }
    };
})(window.GU = window.GU || {});
