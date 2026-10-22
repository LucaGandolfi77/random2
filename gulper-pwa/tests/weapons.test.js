/*
 * GULPER - the weapons.
 *
 * Seven weapons, and the seventh was the one nobody could hold: it was
 * in the table, in the shop and in the order, but not in the loadout
 * preference, so buying it bought nothing.
 */
"use strict";

const { GU, ok, equal, report, createLevel } = require("./harness.js");

/* ---------- every weapon can be held ---------- */

{
    const order = GU.Weapons.order;
    ok(order.length === 7, "there are seven weapons (" + order.length + ")");

    /* Every weapon that can be bought must be able to end up in the
     * player's hands. The second hand is theirs to choose. */
    for (const id of order) {
        GU.Storage.reset();
        GU.Storage.unlockWeapon(id, 1);
        GU.Storage.setLoadout(id);
        const slots = GU.Body.loadout(GU.Storage.data());
        ok(slots.indexOf(id) >= 0,
            "the " + GU.Weapons.get(id).name + " can be equipped (" + slots.join(",") + ")");
    }
}

/* A weapon you do not own cannot be equipped. */
{
    GU.Storage.reset();
    GU.Storage.setLoadout("drag");
    const slots = GU.Body.loadout(GU.Storage.data());
    ok(slots.indexOf("drag") < 0, "a weapon you have not bought stays out of your hands");
    ok(slots.indexOf("lash") >= 0, "the lash is always in your hands");
}

/* The lash is the first hand and cannot be put in the second. */
{
    GU.Storage.reset();
    GU.Storage.unlockWeapon("blade", 1);
    GU.Storage.setLoadout("lash");
    const slots = GU.Body.loadout(GU.Storage.data());
    ok(slots[1] !== "lash", "the lash is the first hand, not the second");
}

/* ---------- the Barbed Drag actually drags ---------- */

{
    const world = createLevel("docks-1", { seed: 1 });
    const p = world.player;

    /* Put a target inside the weapon's reach, straight ahead. */
    const w = GU.Weapons.stats("drag", 1);
    const prey = world.entities.find(function (e) { return e.kind === "prey"; });
    ok(!!prey, "there is somebody to grab");
    prey.x = p.x + w.reach * 0.6;
    prey.y = p.y;
    const before = { x: prey.x, y: prey.y };

    GU.World.drag(world, w, 0, 1);

    /* The haul is a pull: the target's velocity points at the player,
     * so it comes closer. */
    ok(prey.vx < 0, "the barbed drag hauls the target toward the player (vx " +
        prey.vx.toFixed(1) + ")");
    ok(prey.x + prey.vx * 0.1 < before.x, "the target comes closer, not further");
}

/* It bites: a dragged target loses its nerve. */
{
    const world = createLevel("docks-1", { seed: 1 });
    const p = world.player;
    const prey = world.entities.find(function (e) { return e.kind === "prey"; });
    prey.x = p.x + 40;
    prey.y = p.y;
    const willBefore = prey.will;

    const w = GU.Weapons.stats("drag", 1);
    GU.World.drag(world, w, 0, 1);
    ok(prey.will < willBefore, "the barbed drag breaks the target's nerve");
}

/* ---------- every weapon has a tier table and a mode ---------- */

{
    for (const id of GU.Weapons.order) {
        const def = GU.Weapons.get(id);
        ok(!!def, id + " is defined");
        ok(!!def.mode, id + " has a mode");
        ok(def.tiers.length === 3, id + " has three tiers");
        ok(def.desc && def.desc.length > 10, id + " describes itself");

        /* The tier table has to be a real upgrade, not a rename. */
        const t1 = GU.Weapons.stats(id, 1);
        const t3 = GU.Weapons.stats(id, 3);
        const better = (t3.damage || 0) > (t1.damage || 0) ||
            (t3.drain || 0) > (t1.drain || 0) ||
            (t3.reach || 0) > (t1.reach || 0) ||
            (t3.will || 0) > (t1.will || 0);
        ok(better, id + " is stronger at tier 3 than at tier 1");
    }
}

process.exit(report("weapons"));
