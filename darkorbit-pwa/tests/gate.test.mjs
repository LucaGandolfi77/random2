import test from "node:test";
import assert from "node:assert/strict";

import {
    createState, step, launchGate, spawnEnemy, drainEvents
} from "../src/sim.js";
import { DEFAULTS } from "../src/storage.js";
import { GATE_CONFIG, ELITES, ELITE_BY_ID, STEP, setRandomSource } from "../src/config.js";

function profile() {
    return JSON.parse(JSON.stringify(DEFAULTS));
}

function run(state, p, seconds) {
    const n = Math.round(seconds / STEP);
    for (let i = 0; i < n; i++) step(state, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
}

function bulletKill(state, enemy, damage) {
    state.bullets.push({
        x: enemy.x, y: enemy.y, vx: 0, vy: 0, speed: 400,
        dmg: damage === undefined ? enemy.hp + enemy.shield + 100 : damage,
        color: "#fff", radius: 4,
        life: 1, targetId: null, drone: false, splash: false, dot: false
    });
    step(state, profile(), { move: { x: 0, y: 0 }, firing: false }, STEP);
}

test("gate launch requires the station and builds wave one", () => {
    const p = profile();
    const s = createState(p);
    s.enemies = [];
    s.spawnTimer = 999;
    assert.equal(launchGate(s, p), true);
    assert.equal(s.mode, "gate");
    assert.ok(s.gate);
    assert.equal(s.gate.wave, 1);
    assert.equal(s.gate.target, GATE_CONFIG.waves[0]);
    assert.equal(s.enemies.length, GATE_CONFIG.waves[0]);
    assert.equal(s.docked, false, "weapons are not locked inside a gate");
    drainEvents(s);

    assert.equal(launchGate(s, p), false, "cannot relaunch while one is active");
});

test("gate advances waves as kills accumulate", () => {
    const p = profile();
    const s = createState(p);
    launchGate(s, p);
    drainEvents(s);
    s.gate.kills = s.gate.target;
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.equal(s.mode, "gate");
    assert.equal(s.gate.wave, 2);
    assert.equal(s.gate.target, GATE_CONFIG.waves[1]);
    assert.ok(drainEvents(s).some((e) => e.type === "wave" && e.wave === 2));
});

test("clearing the final wave completes the gate and pays rewards", () => {
    const p = profile();
    const credits = p.credits;
    const s = createState(p);
    launchGate(s, p);
    s.gate.wave = GATE_CONFIG.waves.length;
    s.gate.target = 1;
    s.gate.kills = 1;
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.equal(s.mode, "sector");
    assert.equal(s.gate, null);
    assert.ok(p.credits > credits);
    assert.ok(s.boxes.some((b) => b.def.id === "astral"), "an Astral Cache is left behind");
    assert.ok(drainEvents(s).some((e) => e.type === "gatecomplete"));
});

test("running out of time fails the gate", () => {
    const p = profile();
    const s = createState(p);
    launchGate(s, p);
    s.gate.timeLeft = 0.001;
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.equal(s.mode, "sector");
    assert.ok(drainEvents(s).some((e) => e.type === "gatefail"));
});

test("elite enemies get affixes, tougher stats and better loot", () => {
    const original = Math.random;
    const stub = () => 0;
    Math.random = stub;
    setRandomSource(stub);
    try {
        const p = profile();
        const s = createState(p);
        s.enemies = [];
        s.mode = "gate";
        const e = spawnEnemy(s, s.map, "swarm");
        assert.ok(e.elite, "an elite was rolled inside a gate");
        assert.equal(e.elite.id, ELITES[0].id);
        assert.ok(e.shieldMax > 130, "armored shield was boosted");
        const high = () => 0.9;
        Math.random = high;
        setRandomSource(high);
        const normal = createState(p).enemies[0];
        assert.ok(!normal.elite);
        assert.ok(shieldOf(e) > shieldOf(normal));
    } finally {
        Math.random = original;
        setRandomSource(original);
    }
});

function shieldOf(e) {
    return e.shieldMax;
}

test("splitter elites spawn two fragments on death", () => {
    const p = profile();
    const s = createState(p);
    s.enemies = [];
    s.spawnTimer = 999;
    const e = spawnEnemy(s, s.map, "swarm");
    e.elite = ELITE_BY_ID.splitter;
    e.hp = 1;
    e.shield = 0;
    bulletKill(s, e);
    assert.equal(s.enemies.filter((enemy) => !enemy.dead).length, 2, "two living fragments");
    assert.ok(drainEvents(s).some((ev) => ev.type === "split"));
});

test("bosses enter phase two at half health and summon adds", () => {
    const p = profile();
    const s = createState(p);
    s.enemies = [];
    s.spawnTimer = 999;
    const boss = spawnEnemy(s, s.map, "leviathan");
    boss.hp = Math.ceil(boss.hpMax * 0.51);
    boss.shield = 0;
    bulletKill(s, boss, boss.hpMax * 0.1);
    assert.equal(boss.phase2, true);
    assert.equal(s.enemies.filter((e) => !e.dead).length, 4, "boss plus three summoned adds");
    const events = drainEvents(s);
    assert.ok(events.some((e) => e.type === "bossphase"));
    assert.ok(s.bossPhaseTimer > 0);
});
