import test from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k)
};

const { saveRun, loadRun, hasRun, clearRun, restoreState } = await import("../src/run-save.js");
const { createState } = await import("../src/sim.js");
const { DEFAULTS } = await import("../src/storage.js");
const { MAPS } = await import("../src/config.js");

test("run save/load/clear round trip", () => {
    clearRun();
    assert.equal(hasRun(), false);
    const p = JSON.parse(JSON.stringify(DEFAULTS));
    const state = createState(p);
    state.score = 1234;
    state.kills = 7;
    state.cargo.aetherium = 5;
    state.cargoUsed = 5;
    assert.equal(saveRun(state), true);
    assert.equal(hasRun(), true);
    const saved = loadRun();
    assert.equal(saved.score, 1234);
    assert.equal(saved.kills, 7);
    assert.equal(saved.cargo.aetherium, 5);
    assert.equal(saved.events, undefined, "transient events not persisted");
    assert.equal(saved.pools, undefined, "object pools not persisted");
    clearRun();
    assert.equal(hasRun(), false);
    assert.equal(loadRun(), null);
});

test("restored run rebuilds derived map and fields", () => {
    const p = JSON.parse(JSON.stringify(DEFAULTS));
    p.lastMap = 2;
    const state = createState(p);
    state.score = 99;
    state.enemies[0].cloakAlpha = 0.5;
    saveRun(state);
    const restored = restoreState(loadRun(), p);
    assert.equal(restored.mapIndex, 2);
    assert.equal(restored.map, MAPS[2]);
    assert.equal(restored.world.x, MAPS[2].world);
    assert.equal(restored.score, 99);
    assert.ok(Array.isArray(restored.events));
    assert.ok(restored.pools.bullets);
    assert.ok(restored.fx.mesh === true || restored.fx.mesh === false);
    assert.ok(restored.enemies.every((e) => e.cloakAlpha !== undefined));
});

test("a destroyed run is not saved", () => {
    const p = JSON.parse(JSON.stringify(DEFAULTS));
    const state = createState(p);
    state.destroyed = true;
    clearRun();
    assert.equal(saveRun(state), false);
    assert.equal(hasRun(), false);
});
