/*
 * GULPER - the daily hunt, proven.
 *
 * The daily hunt promises two things: everybody in the world eats the
 * same street on the same day, and that street can be finished. The
 * first is a property of the code; the second has to be proven, so
 * every level the daily can pick is played here by the same bot that
 * walks the campaign.
 *
 * The ledger in src/modes.js is measured from the campaign chain, not
 * typed. The last test in this file checks the two against each other,
 * so a campaign whose balance moves cannot quietly leave the daily
 * pointing at unwinnable streets.
 */
"use strict";

const { GU, ok, equal, report, createLevel, playLevel } = require("./harness.js");
const { playChain } = require("./chain.js");

/* ---------- the ledger matches the campaign ---------- */

const chain = playChain();
const chainEntries = {};
for (const row of chain) chainEntries[row.id] = row.entry;

/* Every level the campaign has must be in the ledger. */
let missing = 0;
for (const lvl of GU.Levels.list) {
    if (GU.Modes.ENTRY_MASS[lvl.id] === undefined) missing++;
}
ok(missing === 0, "the ledger knows every level of the campaign (" +
    missing + " missing)");

/* And the ledger must agree with the chain the campaign actually
 * plays. A tolerance of a few mass is allowed: the campaign's own
 * balance wobbles a little between runs, and a daily that hands out
 * three mass more or less is still the same street. */
let drift = 0;
let worst = 0;
for (const row of chain) {
    const have = GU.Modes.ENTRY_MASS[row.id];
    if (have === undefined) continue;
    const diff = Math.abs(have - row.entry);
    if (diff > 4) { drift++; }
    if (diff > worst) worst = diff;
}
ok(drift === 0, "the ledger still matches the campaign chain (" +
    drift + " levels drifted, worst " + worst + ")");

/* ---------- every street the daily can pick is winnable ---------- */

/* The daily picks by hashing the date, so a year of dates reaches
 * every level in the campaign. Each of those levels is played here at
 * the biomass the daily would hand it. */
const failures = [];
let played = 0;

for (const lvl of GU.Levels.list) {
    const carry = GU.Modes.entryMass(lvl.id);
    const save = GU.Storage.data();
    save.carry = 0;

    const world = createLevel(lvl.id, { seed: lvl.seed, carry: carry });
    if (!world) {
        failures.push(lvl.id + " (no world)");
        continue;
    }
    const status = playLevel(world, lvl.objective.time + 120);
    played++;
    if (status !== "won") {
        failures.push(lvl.id + " (" + status + " at entry " + Math.round(world.entryMass) + ")");
    }
}
ok(failures.length === 0, "every level the daily can pick is winnable: " +
    failures.slice(0, 4).join(", "));
ok(played === GU.Levels.list.length, "the daily can reach every level of the campaign (" +
    played + "/" + GU.Levels.list.length + ")");

/* ---------- a year of dates ---------- */

/* Every date of a non-leap year must produce a finite entry mass and
 * a real level. The old ledger was indexed by position and had seven
 * holes in it, which is how twelve days out of forty-nine became
 * unwinnable without anybody noticing. */
let badDates = 0;
let badCarry = 0;
const seen = new Set();

for (let day = 0; day < 365; day++) {
    const date = new Date(2026, 0, 1 + day);
    const daily = GU.Modes.dailyLevel(date);
    if (!daily || !daily.level) { badDates++; continue; }
    if (!GU.Levels.get(daily.level.id)) { badDates++; continue; }
    if (typeof daily.level.carry !== "number" || !isFinite(daily.level.carry)) { badCarry++; }
    seen.add(daily.level.id);
}
ok(badDates === 0, "every day of the year picks a real level (" + badDates + " broken)");
ok(badCarry === 0, "every day of the year has a finite entry mass (" + badCarry + " broken)");
ok(seen.size >= 30, "a year of dailies spreads across the campaign (" +
    seen.size + " different levels)");

/* The same date, the same street - on every device. */
{
    const a = GU.Modes.dailyLevel(new Date(2026, 9, 22));
    const b = GU.Modes.dailyLevel(new Date(2026, 9, 22));
    equal(a.level.id, b.level.id, "the same date picks the same street");
    equal(a.seed, b.seed, "the same date picks the same layout");
    equal(a.level.carry, b.level.carry, "the same date hands the same biomass");
}

/* A different date picks a different street at least sometimes, and
 * never a broken one. */
{
    let different = 0;
    const first = GU.Modes.dailyLevel(new Date(2026, 9, 22)).level.id;
    for (let day = 1; day <= 30; day++) {
        const other = GU.Modes.dailyLevel(new Date(2026, 9, 22 + day)).level.id;
        if (other !== first) different++;
        ok(GU.Modes.entryMass(other) > 0 || other === "docks-1",
            "the street " + other + " has a sane entry mass");
    }
    ok(different > 10, "a month of dailies spreads across the campaign (" +
        different + "/30 different)");
}

/* ---------- the daily never touches the campaign ---------- */

{
    const before = JSON.stringify(GU.Storage.data().levels);
    const daily = GU.Modes.dailyLevel(new Date(2026, 9, 22));
    const world = createLevel(daily.level.id, {
        level: daily.level, seed: daily.seed, carry: daily.level.carry
    });
    playLevel(world, daily.level.objective.time + 120);
    equal(JSON.stringify(GU.Storage.data().levels), before,
        "playing a daily writes no campaign record");
    ok(world.modeTag === "daily", "the daily is tagged so it cannot pollute the map");
}

process.exit(report("daily"));
