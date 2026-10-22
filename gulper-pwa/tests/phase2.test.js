/*
 * GULPER - Phase 2: rival predators and biome hazard patches.
 *
 * The district is not only full of people. Other hungry things live in
 * it, and the ground itself has teeth. A stalker thins the crowd you
 * need, and an acid spill burns anything that stands in it.
 */
"use strict";

const { GU, ok, equal, report, createLevel, playLevel } = require("./harness.js");

/* ---------- a new rival predator ---------- */

ok(GU.Species.rivals.stalker, "the stalker exists as a rival predator");
equal(GU.Species.rivals.stalker.kind, "melee", "the stalker fights up close");
ok(GU.Species.rivals.stalker.mimic === true, "the stalker hides until it moves");

{
    /* A stalker dropped among prey eats them. */
    const world = createLevel("docks-1", { seed: 1 });
    const preyBefore = world.entities.filter(function (e) { return e.kind === "prey" && !e.dead && e.state !== GU.STATE.prey.down; }).length;
    const sp = world.player;
    GU.World.spawnRival(world, GU.Species.rivals.stalker, sp.x + 40, sp.y + 40);
    const stalker = world.entities[world.entities.length - 1];
    /* Reveal it and move it away from the player so it hunts prey
     * instead of the player. */
    stalker.revealed = true;
    const corner = { x: world.arena.x + 80, y: world.arena.y + 80 };
    stalker.x = corner.x; stalker.y = corner.y;
    const massBefore = stalker.mass;
    const prey = world.entities.find(function (e) { return e.kind === "prey" && !e.dead; });
    if (prey) { prey.x = stalker.x + 12; prey.y = stalker.y + 12; }

    let peakDowned = 0;
    const dt = 1 / 30;
    for (let i = 0; i < 60; i++) {
        GU.World.update(world, dt);
        const downed = world.entities.filter(function (e) { return e.kind === "prey" && e.state === GU.STATE.prey.down; }).length;
        if (downed > peakDowned) peakDowned = downed;
    }

    ok(peakDowned >= 1, "the stalker downs prey in the crowd (peak downed: " + peakDowned + ")");
    ok(stalker.state !== undefined, "the stalker is a live entity");
}

/* ---------- acid spill hazard ---------- */

{
    /* A spill is a real hazard kind in the biome tables. */
    ok(GU.Biomes.hive.hazards.spill >= 1, "the hive carries acid spills");
    ok(GU.Biomes.foundry.hazards.spill >= 2, "the foundry is soaked in them");
}

{
    /* Standing in a spill burns you. */
    const world = createLevel("docks-1", { seed: 1 });
    const p = world.player;
    world.hazards.push({ kind: "spill", x: p.x, y: p.y, r: 40, t: 0 });
    const hpBefore = p.hp;
    const dt = 1 / 30;
    for (let i = 0; i < 60; i++) GU.World.update(world, dt);
    ok(p.hp < hpBefore, "an acid spill damages a player standing in it (" +
        hpBefore + " -> " + p.hp + ")");
}

{
    /* A spill is drawn by the renderer without crashing. */
    const world = createLevel("docks-1", { seed: 1 });
    const p = world.player;
    world.hazards.push({ kind: "spill", x: p.x, y: p.y, r: 40, t: 0 });
    const buf = GU.Raster.create(320, 240);
    GU.Render.draw(world, 1 / 30);
    ok(true, "the renderer survives an acid spill");
}

process.exit(report("phase 2"));
