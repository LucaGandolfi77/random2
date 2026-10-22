/*
 * GULPER - the campaign chain, played headlessly.
 *
 * This is the one place that knows what the campaign is worth: it
 * plays every level in order, carrying the biomass from one to the
 * next exactly as a real campaign would, and reports the mass the
 * player was carrying when each level began.
 *
 * The daily hunt and the procession hand the player those numbers, so
 * they must come from here and not from a table someone typed. The
 * ledger in src/modes.js is checked against this chain by
 * tests/daily.test.js: if the campaign's balance moves, the test says
 * which level's number rotted instead of letting the game drift.
 */
"use strict";

const { GU, createLevel, playLevel } = require("./harness.js");

/* Play the whole campaign and report, for every level, the biomass
 * the player was carrying when it started and the peak they reached
 * inside it. */
function playChain() {
    const out = [];
    let carry = 0;

    for (const lvl of GU.Levels.list) {
        const save = GU.Storage.data();
        save.carry = carry;

        const world = createLevel(lvl.id, { seed: lvl.seed });
        if (!world) {
            out.push({ id: lvl.id, entry: carry, peak: 0, status: "NO WORLD", time: 0 });
            continue;
        }

        const status = playLevel(world, lvl.objective.time + 120);
        const peak = Math.round(world.stats.peakMass);
        out.push({
            id: lvl.id,
            entry: carry,
            peak: peak,
            status: status,
            time: Math.round(world.time),
            objective: world.objective.count,
            need: world.objective.need
        });

        /* The biomass you end a level with is the biomass you start the
         * next one with. */
        carry = Math.max(carry, peak);
    }
    return out;
}

/* The same chain, reduced to the numbers the game needs: the mass
 * carried INTO each level, keyed by level id. */
function entryMass() {
    const map = {};
    for (const row of playChain()) map[row.id] = row.entry;
    return map;
}

module.exports = { playChain, entryMass };
