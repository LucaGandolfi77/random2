/*
 * GULPER - the shrines outside the campaign, played headlessly.
 *
 * The same bot that walks the campaign walks the shrines. A shrine
 * nobody can finish is not a shrine, it is a door painted on a wall -
 * so Endless Night must hold for minutes against the escalation, the
 * daily hunt must be winnable at exactly the biomass it hands you, and
 * the procession must be winnable stage by stage against the world.
 */
"use strict";

const { GU, ok, equal, report, createLevel, playLevel } = require("./harness.js");

/* ---------- the three shrines stay out of the campaign ---------- */

/* Synthetic levels must never leak into the map, the unlock chain or
 * the level records. */
ok(GU.Levels.total() === 42, "the campaign still has exactly 42 levels");
ok(GU.Modes.STAGE_BIOMES.length === 6, "the procession has six titans");
ok(GU.Modes.STAGE_CARRY.length === 6, "the procession has six entry masses");

/* The feast enters small: the save's carry must not reach it. */
equal(GU.Modes.levelCarry({ modeTag: "feast", id: "endless" }), 0,
    "the feast ignores the save's carry");
equal(GU.Modes.levelCarry({ id: "docks-1" }), undefined,
    "campaign levels keep using the save's carry");
equal(GU.Modes.levelCarry({ modeTag: "rush", biome: "docks", id: "rush-docks" }), 106,
    "procession stage 1 uses the handed-down table");

/* ---------- ENDLESS NIGHT ---------- */

{
    const lv = GU.Modes.feastLevel();
    const w = createLevel(lv.id, { level: lv, seed: lv.seed, carry: GU.Modes.levelCarry(lv) });

    ok(!!w, "Endless Night builds a world from its synthetic level");
    ok(w.endless === true, "Endless Night starts the wave producer");
    equal(w.timeLeft, 0, "the feast runs with no clock");
    equal(w.modeTag, "feast", "the feast is tagged for its own bookkeeping");
    ok(w.entryMass <= 4, "the feast starts small (entry " + Math.round(w.entryMass) + ")");

    /* Three minutes at the tide. playLevel only stops when the level
     * ends: surviving it means the world never produced a win or a
     * time-out, which is the whole point of survive-with-no-clock. */
    const status = playLevel(w, 180);
    equal(status, "playing", "the bot survives three minutes without a win or a time-out");
    ok(w.endlessWave >= 40, "the district kept producing (" + w.endlessWave + " waves in 180s)");
    ok(w.stats.peakMass > w.entryMass * 8,
        "the bot grew well beyond its entry mass (" +
        Math.round(w.entryMass) + " -> " + Math.round(w.stats.peakMass) + ")");
    ok(w.stats.swallowed >= 10, "the bot was eating (" + w.stats.swallowed + " swallowed)");
}

/* ---------- DAILY HUNT ---------- */

{
    /* Same date, same hunt: level, seed and entry biomass. */
    const a = GU.Modes.dailyLevel(new Date(2026, 9, 22));
    const b = GU.Modes.dailyLevel(new Date(2026, 9, 22));
    equal(a.level.id, b.level.id, "the daily pick is deterministic within a day");
    equal(a.seed, b.seed, "the daily seed is deterministic within a day");
    equal(a.level.carry, b.level.carry, "the daily's entry biomass is deterministic");
    ok(a.level !== b.level, "each daily handout is its own level object");

    /* The pick really is the date's slice of the list, and it is a real
     * campaign street under it. */
    equal(a.level.id, GU.Levels.list[GU.dailySeed(new Date(2026, 9, 22)) % GU.Levels.list.length].id,
        "the daily pick is the date's slice of the campaign");
    equal(a.seed, GU.Levels.get(a.level.id).seed,
        "the daily keeps the campaign's tuned layout");
    ok(GU.Levels.get(a.level.id) !== null, "the daily pick is a real campaign level");

    /* The week produces more than one street: a daily that landed on
     * the same mission every day would be a second campaign. */
    const picks = new Set();
    for (let d = 0; d < 7; d++) {
        picks.add(GU.Modes.dailyLevel(new Date(2026, 9, 15 + d)).level.id);
    }
    ok(picks.size >= 4, "a week of dailies spreads across the campaign (" +
        picks.size + " of 7)");

    /* The bot wins today's hunt at exactly the handed-down biomass. */
    const today = GU.Modes.dailyLevel();
    const w = createLevel(today.level.id, {
        level: today.level, seed: today.seed, carry: today.level.carry
    });
    ok(!!w, "today's daily builds a world");
    equal(w.modeTag, "daily", "the daily is tagged so it can never write a campaign record");
    const status = playLevel(w, (w.level.objective.time || 0) + 120);
    equal(status, "won", "the bot wins today's daily (" + today.level.id +
        " at entry mass " + Math.round(w.entryMass) + ")");

    /* The dates reset the medal. */
    const d = GU.Storage.data();
    GU.Storage.recordDaily(20261022, 300);
    ok(GU.Storage.recordDaily(20261022, 200) === 300, "same day keeps the best mass");
    ok(GU.Storage.recordDaily(20261023, 140) === 140, "a new day starts a new medal");
    equal(d.daily.ymd, 20261023, "the medal belongs to the newest day");
}

/* ---------- THE PROCESSION ---------- */

{
    const peaks = [];
    for (let i = 0; i < GU.Modes.stageCount; i++) {
        const lv = GU.Modes.stageLevel(i);
        const w = createLevel(lv.id, { level: lv, carry: GU.Modes.stageCarry(i) });

        ok(!!w, "procession stage " + (i + 1) + " builds a world");
        equal(w.modeTag, "rush", "stage " + (i + 1) + " is tagged for its own bookkeeping");
        equal(GU.Modes.stageOf(w.level), i, "stage " + (i + 1) + " knows its place in the line");
        ok(w.entryMass >= GU.Modes.stageCarry(i), "stage " + (i + 1) +
            " enters at its handed-down mass (entry " + Math.round(w.entryMass) + ")");
        equal(w.level.biome, GU.Modes.STAGE_BIOMES[i],
            "stage " + (i + 1) + " is the campaign's titan for that district");

        const status = playLevel(w, w.level.objective.time + 120);
        equal(status, "won", "the bot puts down titan " + (i + 1) +
            " of 6 (" + lv.id + " at entry " + Math.round(w.entryMass) + ")");
        ok(w.objective.count >= w.objective.need, "titan " + (i + 1) + " met its objective");
        peaks.push(Math.round(w.stats.peakMass));

        /* A synthetically cloned titan must not have renamed the
         * campaign's own. */
        ok(GU.Levels.get("rush-" + GU.Modes.STAGE_BIOMES[i]) === null,
            "rush levels live outside the campaign lookup");
    }

    /* The line of titans ascends: stage 6's peak cannot be smaller than
     * stage 2's. */
    ok(peaks[5] >= peaks[1], "the procession ascends (" + peaks.join(", ") + ")");

    /* The medals are kept, and a better run replaces a worse one. */
    GU.Storage.recordRush(3, 500);
    ok(GU.Storage.recordRush(5, 400).stage === 5, "the best run reaches furthest");
    ok(GU.Storage.recordRush(2, 900).mass === 900, "the best mass is kept across runs");
}

process.exit(report("modes"));
