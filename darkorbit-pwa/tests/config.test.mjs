import test from "node:test";
import assert from "node:assert/strict";

import {
    AMMO, SHIPS, MAPS, ENEMIES, ENEMY_BY_ID, UPGRADES, RESOURCE_IDS,
    ABILITIES, xpForLevel, upgradeCost, droneCost, clamp
} from "../src/config.js";
import { DEFAULTS } from "../src/storage.js";

test("ammo, ships, maps and enemies have unique ids", () => {
    const unique = (list) => new Set(list.map((x) => x.id)).size === list.length;
    assert.ok(unique(AMMO));
    assert.ok(unique(SHIPS));
    assert.ok(unique(MAPS));
    assert.ok(unique(ENEMIES));
    assert.ok(unique(ABILITIES));
});

test("ammo cooldowns and damage escalate together", () => {
    for (let i = 1; i < AMMO.length; i++) {
        assert.ok(AMMO[i].dmg > AMMO[i - 1].dmg);
        assert.ok(AMMO[i].cd > AMMO[i - 1].cd);
    }
});

test("maps gate progression by level and grow in size", () => {
    for (let i = 1; i < MAPS.length; i++) {
        assert.ok(MAPS[i].level >= MAPS[i - 1].level);
        assert.ok(MAPS[i].world > MAPS[i - 1].world);
    }
    assert.ok(MAPS[0].level <= DEFAULTS.level, "starter map available at level 1");
});

test("every map enemy pool and boss resolves", () => {
    for (const map of MAPS) {
        for (const id of map.pool) assert.ok(ENEMY_BY_ID[id], map.id + " pool: " + id);
        if (map.boss) assert.ok(ENEMY_BY_ID[map.boss]);
        for (const r of map.loot) assert.ok(RESOURCE_IDS.includes(r));
    }
});

test("upgrade costs rise with level", () => {
    for (const def of UPGRADES) {
        assert.ok(upgradeCost(def, 1) > upgradeCost(def, 0));
        assert.ok(upgradeCost(def, 5) > upgradeCost(def, 4));
    }
    assert.ok(droneCost(1) > droneCost(0));
});

test("xp curve is increasing", () => {
    for (let level = 1; level < 12; level++) {
        assert.ok(xpForLevel(level + 1) > xpForLevel(level));
    }
});

test("clamp behaves", () => {
    assert.equal(clamp(-5, 0, 10), 0);
    assert.equal(clamp(15, 0, 10), 10);
    assert.equal(clamp(4, 0, 10), 4);
});
