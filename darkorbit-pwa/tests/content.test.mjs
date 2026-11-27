import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULTS, loadProfile, saveProfile } from "../src/storage.js";
import { createState, deriveStats, drainEvents } from "../src/sim.js";
import { refineOre, sellRefined, craftItem, canCraft, refinedValue } from "../src/refinery.js";
import { currentMission, missionProgress, missionLog, missionsDone } from "../src/missions.js";
import {
    MAPS, SHIPS, ENEMIES, PALETTES, CRAFTS, MISSIONS,
    REFINE_RATIO, REFINED_PRICE_MULT, RESOURCES
} from "../src/config.js";

function profile(overrides = {}) {
    return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), overrides);
}

test("refining consumes raw ore and stores refined material", () => {
    const p = profile();
    const s = createState(p);
    s.cargo.aetherium = 3;
    s.cargoUsed = 3;
    assert.equal(refineOre(s, p, "aetherium"), true);
    assert.equal(s.cargo.aetherium, 0);
    assert.equal(s.cargoUsed, 0);
    assert.equal(p.refined.aetherium, 1);
    assert.equal(refineOre(s, p, "aetherium"), false, "not enough raw ore");
    assert.ok(drainEvents(s).some((e) => e.type === "message"));
});

test("refined ore sells for three times the raw price", () => {
    const p = profile();
    p.refined.xenon = 2;
    const credits = p.credits;
    const value = sellRefined(p, "xenon");
    assert.equal(value, RESOURCES.xenon.price * REFINED_PRICE_MULT);
    assert.equal(p.credits, credits + value);
    assert.equal(p.refined.xenon, 1);
    assert.equal(refinedValue("xenon"), value);
});

test("assembly checks costs and applies field effects", () => {
    const p = profile();
    const s = createState(p);
    const recipe = CRAFTS.find((c) => c.effect === "magnet");
    assert.equal(canCraft(p, recipe), false);
    p.refined.cryolite = 10;
    assert.equal(canCraft(p, recipe), true);
    s.player.hp = s.player.hpMax * 0.4;
    assert.equal(craftItem(s, p, "nanite"), false, "nanite needs aetherium");
    p.refined.aetherium = 8;
    assert.equal(craftItem(s, p, "nanite"), true);
    assert.ok(s.player.hp > s.player.hpMax * 0.4);
    assert.equal(craftItem(s, p, "magnet"), true);
    assert.ok(s.magnetTimer > 0);
    assert.equal(craftItem(s, p, "unknown"), false);
});

test("missions advance and pay out", () => {
    const p = profile();
    assert.equal(currentMission(p).objective.type, "kills");
    assert.equal(missionProgress(p, "sell", 5), null, "wrong objective type is ignored");
    const done = missionProgress(p, "kills", 5);
    assert.ok(done);
    assert.equal(done.mission.id, MISSIONS[0].id);
    assert.equal(p.missions.active, 1);
    assert.equal(p.missions.progress, 0);
    assert.ok(p.credits > DEFAULTS.credits);
    assert.equal(missionsDone(p), 1);
});

test("absolute objectives use the highest value reached", () => {
    const p = profile();
    p.missions.active = MISSIONS.findIndex((m) => m.objective.type === "sector");
    const mission = currentMission(p);
    assert.equal(missionProgress(p, "sector", 2, true), null);
    assert.equal(p.missions.progress, 2);
    assert.equal(missionProgress(p, "sector", 1, true), null);
    assert.equal(p.missions.progress, 2, "does not go backwards");
    missionProgress(p, "sector", mission.objective.target, true);
    assert.ok(p.missions.completed.includes(mission.id));
});

test("mission log reports active and completed states", () => {
    const p = profile();
    const log = missionLog(p);
    assert.equal(log.length, MISSIONS.length);
    assert.equal(log[0].state, "active");
    assert.equal(log[1].state, "locked");
    missionProgress(p, "kills", 5);
    assert.equal(missionLog(p)[0].state, "completed");
    assert.equal(missionLog(p)[1].state, "active");
});

test("new content is registered", () => {
    assert.equal(MAPS.length, 6);
    assert.equal(MAPS[5].id, "zeta");
    assert.ok(PALETTES.zeta);
    assert.ok(SHIPS.length >= 8);
    assert.ok(ENEMIES.some((e) => e.id === "lancer"));
    assert.ok(ENEMIES.some((e) => e.id === "queen" && e.boss));
    assert.ok(SHIPS.some((s) => s.id === "ranger" && s.perks.crit));
});

test("ranger perk increases critical chance", () => {
    const base = deriveStats(profile());
    const ranger = deriveStats(profile({ ship: 6 }));
    assert.ok(ranger.critChance > base.critChance);
});

test("mission and refined data survive a profile round trip", () => {
    const store = new Map();
    const storage = {
        getItem: (k) => store.has(k) ? store.get(k) : null,
        setItem: (k, v) => store.set(k, v)
    };
    const p = profile();
    p.refined.phantomite = 4;
    p.missions.active = 3;
    p.missions.completed = ["m01", "m02"];
    saveProfile(p, storage);
    const loaded = loadProfile(storage);
    assert.equal(loaded.refined.phantomite, 4);
    assert.equal(loaded.missions.active, 3);
    assert.deepEqual(loaded.missions.completed, ["m01", "m02"]);
});

test("refining constants are consistent", () => {
    assert.equal(REFINE_RATIO, 3);
    assert.equal(REFINED_PRICE_MULT, 3);
    assert.ok(CRAFTS.length >= 3);
    assert.ok(MISSIONS.length === 12);
});
