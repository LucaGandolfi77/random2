/*
 * GULPER - Phase 4: meta. Medals, the Bill of Fare, stats, palettes.
 */
"use strict";

const { GU, ok, equal, report } = require("./harness.js");

/* Medals are a lifetime count of perfect clears. */
{
    const before = GU.Storage.data().medals || 0;
    GU.Storage.recordMedal();
    GU.Storage.recordMedal();
    equal(GU.Storage.data().medals, before + 2, "medals accumulate across perfect clears");
}

/* Palettes: every biome palette ships, plus the override setting. */
{
    const ids = GU.Palette.ids();
    ok(ids.length >= 7, "at least seven palettes ship (" + ids.length + ")");
    ok(ids.indexOf("cathedral") >= 0, "the cathedral palette ships");
    /* An override palette id resolves instead of falling back. */
    ok(GU.Palette.get("cathedral").colors.length === 32, "a palette carries 32 colours");
    ok(GU.Palette.snap("cathedral", "#000000") !== null, "snap resolves on a palette");
}

/* Settings carry a palette choice and migrate forward. */
{
    GU.Storage.setSetting("palette", "hive");
    equal(GU.Storage.data().settings.palette, "hive", "the palette choice persists");
    GU.Storage.setSetting("palette", "auto");
}

/* Lifetime stats are readable and consistent. */
{
    const d = GU.Storage.data();
    ok(typeof d.stats.runs === "number", "runs is a number");
    ok(typeof d.stats.deaths === "number", "deaths is a number");
    ok(typeof d.stats.bosses === "number", "bosses is a number");
    ok((d.medals || 0) >= 0, "medals is non-negative");
}

process.exit(report("meta"));
