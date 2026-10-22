/*
 * GULPER - the books.
 *
 * What a finished level is worth, and what the stats screen is
 * allowed to say about it.
 *
 * This bookkeeping used to live in main.js, which is browser-only: the
 * medals, the shards, the carry and the shrine records could not be
 * tested at all. It is a module now, and this suite is the proof.
 */
"use strict";

const { GU, ok, equal, report, createLevel, playLevel } = require("./harness.js");

/* ---------- the campaign settles its books ---------- */

{
    GU.Storage.reset();

    const world = createLevel("docks-1", { seed: GU.Levels.get("docks-1").seed });
    GU.Results.begin(world);
    playLevel(world, 300);

    const out = GU.Results.settle(world);
    equal(out.mode, null, "a campaign level settles as a campaign level");
    equal(out.won, true, "the level was won");
    ok(out.stars >= 1, "a won level is rated (" + out.stars + " stars)");
    ok(out.shards > 0, "a won level pays shards (" + out.shards + ")");

    const save = GU.Storage.data();
    equal(save.shards, out.shards, "the shards are in the save");
    ok(save.levels["docks-1"].cleared, "the level is recorded as cleared");
    equal(save.levels["docks-1"].stars, out.stars, "the stars are recorded");
    ok(save.carry > 0, "the carry moved on (" + save.carry + ")");
}

/* ---------- the counters tell the truth ---------- */

{
    GU.Storage.reset();

    /* A run that was started and won. */
    const won = createLevel("docks-1", { seed: GU.Levels.get("docks-1").seed });
    GU.Results.begin(won);
    playLevel(won, 300);
    GU.Results.settle(won);

    let s = GU.Results.summary();
    equal(s.runs, 1, "a run that was started is counted, won or not");
    equal(s.deaths, 0, "a won run is not a death");
    equal(s.levels, 1, "one level is cleared");

    /* A run that was started and lost. */
    const lost = createLevel("docks-1", { seed: GU.Levels.get("docks-1").seed });
    GU.Results.begin(lost);
    /* Hollow the player out: the level ends badly. */
    lost.player.mass = 0;
    lost.player.hp = 0;
    GU.World.fail(lost, "You were hollowed out.");
    GU.Results.settle(lost);

    s = GU.Results.summary();
    equal(s.runs, 2, "a lost run still counts as a run");
    equal(s.deaths, 1, "a lost level counts as a death");
    equal(s.levels, 1, "a lost level is not cleared");
}

/* The old counter counted victories as runs and knockdowns as deaths.
 * Both were lies the stats screen repeated. */
{
    GU.Storage.reset();
    const w = createLevel("docks-1", { seed: GU.Levels.get("docks-1").seed });
    GU.Results.begin(w);
    equal(GU.Results.summary().runs, 1, "the run counter moves when the level starts");

    /* A knockdown is not a death. */
    GU.Combat.downPlayer(w);
    let s = GU.Results.summary();
    equal(s.downs, 1, "a knockdown counts as a down");
    equal(s.deaths, 0, "a knockdown is not a death");
}

/* ---------- medals are earned once per level ---------- */

{
    GU.Storage.reset();
    equal(GU.Storage.recordMedal("docks-1"), 1, "a medal is awarded");
    equal(GU.Storage.recordMedal("docks-1"), 1, "farming the same level does not award a second medal");
    equal(GU.Storage.recordMedal("docks-2"), 2, "a different level awards its own medal");
    equal(GU.Storage.data().medals, 2, "the medal count is the number of levels decorated");
    ok(GU.Storage.hasMedal("docks-1"), "the medal is remembered");
    ok(!GU.Storage.hasMedal("docks-9"), "a level without a medal does not have one");
}

/* ---------- the shrines never touch the campaign ---------- */

{
    GU.Storage.reset();
    const before = JSON.stringify(GU.Storage.data().levels);
    const carryBefore = GU.Storage.data().carry;

    /* A feast. */
    const feast = GU.Modes.feastLevel();
    const fw = createLevel(feast.id, { level: feast, seed: feast.seed, carry: 0 });
    GU.Results.begin(fw);
    fw.status = "lost";
    fw.stats.peakMass = 900;
    const fout = GU.Results.settle(fw);
    equal(fout.mode, "feast", "the feast settles as a feast");
    equal(fout.shards, 0, "a feast grants no campaign shards");
    equal(GU.Storage.data().feast, 900, "the feast keeps its own best");
    equal(GU.Storage.data().carry, carryBefore, "a feast never moves the campaign's carry");
    equal(JSON.stringify(GU.Storage.data().levels), before, "a feast writes no campaign record");

    /* A daily. */
    const daily = GU.Modes.dailyLevel(new Date(2026, 9, 22));
    const dw = createLevel(daily.level.id, {
        level: daily.level, seed: daily.seed, carry: daily.level.carry
    });
    GU.Results.begin(dw);
    dw.status = "won";
    dw.stats.peakMass = 400;
    const dout = GU.Results.settle(dw);
    equal(dout.mode, "daily", "the daily settles as a daily");
    equal(dout.shards, 0, "a daily grants no campaign shards");
    equal(GU.Storage.data().carry, carryBefore, "a daily never moves the campaign's carry");
    equal(JSON.stringify(GU.Storage.data().levels), before, "a daily writes no campaign record");
    ok(GU.Storage.data().daily.best > 0, "the daily keeps its own medal");

    /* A procession stage. */
    const stage = GU.Modes.stageLevel(0);
    const rw = createLevel(stage.id, {
        level: stage, carry: GU.Modes.stageCarry(0)
    });
    GU.Results.begin(rw);
    rw.status = "won";
    rw.stats.peakMass = 300;
    const rout = GU.Results.settle(rw);
    equal(rout.mode, "rush", "the procession settles as a procession");
    equal(rout.stage, 1, "the first titan was the one fought");
    equal(GU.Storage.data().rush.stage, 1, "the procession remembers how far it got");
    equal(GU.Storage.data().carry, carryBefore, "a procession never moves the campaign's carry");
    equal(JSON.stringify(GU.Storage.data().levels), before, "a procession writes no campaign record");
}

/* ---------- the summary agrees with the books ---------- */

{
    GU.Storage.reset();
    const w = createLevel("docks-1", { seed: GU.Levels.get("docks-1").seed });
    GU.Results.begin(w);
    playLevel(w, 300);
    const out = GU.Results.settle(w);
    const s = GU.Results.summary();

    const save = GU.Storage.data();
    equal(s.shards, save.shards, "the summary's shards are the save's shards");
    equal(s.swallowed, save.total, "the summary's swallowed count is the save's");
    equal(s.bestMass, save.bestMass, "the summary's best mass is the save's");
    equal(s.levels, Object.keys(save.levels).filter(function (k) {
        return save.levels[k].cleared;
    }).length, "the summary's cleared count is the save's");
    equal(s.totalLevels, GU.Levels.total(), "the summary knows how many levels there are");
    equal(s.maxStars, GU.Levels.total() * 3, "the summary knows the maximum stars");
}

/* ---------- the Bill of Fare knows what it has met ---------- */

{
    GU.Storage.reset();
    equal(GU.Storage.encounters("champion"), 0, "a titan that was never met is not in the book");
    GU.Storage.noteEncounter("champion");
    equal(GU.Storage.encounters("champion"), 1, "a titan that was met is in the book");
    GU.Storage.noteEncounter("champion");
    equal(GU.Storage.encounters("champion"), 2, "the book counts how many times");
    ok(GU.Storage.encounters("harbormaster") === 0, "another titan is still unknown");
}

/* Every rival and titan in the game has a description: the Bill of
 * Fare is a book about things you have met, and an entry with no
 * words in it is a hole in the book. */
{
    let missing = 0;
    for (const k in GU.Species.rivals) {
        if (!GU.Species.rivals[k].bio) missing++;
    }
    for (const k in GU.Species.bosses) {
        if (!GU.Species.bosses[k].bio) missing++;
    }
    equal(missing, 0, "every rival and titan has something to say about itself");
}

/* ---------- every titan in the campaign is in the book ---------- */

{
    const titans = GU.Levels.list.filter(function (l) { return l.boss; });
    ok(titans.length >= 7, "the campaign has its titans (" + titans.length + ")");
    for (const t of titans) {
        ok(!!GU.Species.bosses[t.bossId], "the " + t.bossId + " has a species entry");
    }
}

process.exit(report("results"));
