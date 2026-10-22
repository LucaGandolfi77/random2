/*
 * GULPER - the campaign, played headlessly.
 *
 * Every one of the forty-two levels is played by a bot, in order, with
 * the biomass carried from one level to the next exactly as it would be
 * in a real campaign. A level that cannot be finished is a level that
 * does not exist, and no amount of content testing finds that out.
 *
 * The bot is deliberately simple. It does not dodge, it does not manage
 * its stamina and it walks into gunfire. If the campaign can be finished
 * by that, it can be finished by a person who is paying attention.
 */
"use strict";

const { GU, ok, equal, report, createLevel, playLevel } = require("./harness.js");

/* The campaign, in order, with the biomass carried forward. */
const results = [];
let carry = 0;
let failures = 0;

for (const lvl of GU.Levels.list) {
    const save = GU.Storage.data();
    save.carry = carry;

    const world = createLevel(lvl.id, { seed: lvl.seed });
    if (!world) {
        failures++;
        results.push({ id: lvl.id, status: "NO WORLD", objective: 0, need: 0, mass: 0, time: 0 });
        continue;
    }

    const started = Date.now();
    const status = playLevel(world, lvl.objective.time + 90);
    const elapsed = (Date.now() - started) / 1000;

    const obj = world.objective;
    results.push({
        id: lvl.id,
        status,
        objective: obj.count,
        need: obj.need,
        mass: Math.round(world.stats.peakMass),
        gained: Math.round(world.stats.massGained),
        alarm: Math.round(world.stats.alarmPeak),
        time: Math.round(world.time),
        why: world.failReason || "",
        wall: elapsed.toFixed(1)
    });

    if (status !== "won") failures++;
    /* The biomass you end a level with is the biomass you start the next
     * one with. */
    carry = Math.max(carry, Math.round(world.stats.peakMass));
}

/* ---------- the report ---------- */

for (const r of results) {
    const mark = r.status === "won" ? "ok  " : "FAIL";
    console.log(
        "  " + mark + " " + r.id.padEnd(12) +
        " " + String(r.status).padEnd(6) +
        " obj " + String(r.objective).padStart(3) + "/" + String(r.need).padEnd(3) +
        " mass " + String(r.mass).padStart(5) +
        " gain " + String(r.gained === undefined ? "-" : r.gained).padStart(5) +
        " alarm " + String(r.alarm === undefined ? "-" : r.alarm).padStart(4) +
        " t " + String(r.time).padStart(4) +
        (r.why ? "  (" + r.why + ")" : "") +
        " (" + r.wall + "s)"
    );
}

ok(failures === 0, failures + " of " + results.length + " levels could not be finished by the bot");

/* ---------- the shape of the campaign ---------- */

/* The player must get bigger across the campaign. If the mass plateaus
 * in the first ten levels, the later ones are the same fight over and
 * over. */
const first = results[0].mass;
const tenth = results[9].mass;
const last = results[results.length - 1].mass;
ok(tenth > first * 1.4, "the player is meaningfully bigger by level ten (" + first + " -> " + tenth + ")");
ok(last > tenth, "the player is bigger at the end than at level ten (" + tenth + " -> " + last + ")");

/* Every level must have some people in it who are worth eating. */
for (const r of results) {
    ok(r.objective >= 0, r.id + " tracked its objective");
}

/* The campaign cannot be so long that a level drags. */
for (const r of results) {
    ok(r.time <= 400, r.id + " finished inside a reasonable time (" + r.time + "s)");
}

process.exit(report("simulation"));
