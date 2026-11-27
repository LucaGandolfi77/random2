import test from "node:test";
import assert from "node:assert/strict";

import { createState, step, deriveStats, drainEvents, launchGate } from "../src/sim.js";
import { DEFAULTS } from "../src/storage.js";
import { SHIPS, ENEMIES, STEP, MAPS, DOCK_RADIUS, TARGET_RANGE } from "../src/config.js";

function profile(overrides = {}) {
    return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), overrides);
}

function run(state, p, seconds, input) {
    const n = Math.round(seconds / STEP);
    for (let i = 0; i < n; i++) {
        step(state, p, input || { move: { x: 0, y: 0 }, firing: false }, STEP);
    }
}

function field(p, x, y) {
    const s = createState(p);
    s.player.x = s.world.x / 2 + x;
    s.player.y = s.world.y / 2 + y;
    s.docked = Math.hypot(x, y) < DOCK_RADIUS;
    s.wasDocked = s.docked;
    s.enemies = [];
    s.loot = [];
    s.boxes = [];
    s.pickups = [];
    s.bullets = [];
    s.enemyBullets = [];
    s.spawnTimer = 999;
    s.boxTimer = 999;
    return s;
}

function enemy(state, id, dx, dy, overrides = {}) {
    const def = ENEMIES.find((e) => e.id === id);
    return Object.assign({
        id: state.nextId++, defId: id, def,
        x: state.player.x + dx, y: state.player.y + dy,
        vx: 0, vy: 0, angle: 0, radius: def.radius,
        hp: def.hp * 4, hpMax: def.hp * 4,
        shield: 0, shieldMax: 0,
        fireCd: 0.2, contactCd: 0, hitFlash: 0,
        orbitDir: 1, wander: 0,
        homeX: state.player.x + dx, homeY: state.player.y + dy,
        cloakCd: 99, cloaked: false, cloakAlpha: 1,
        dotTime: 0, dotDps: 0, charge: 0,
        elite: null, phase2: false, aggro: true, dead: false
    }, overrides);
}

test("ships have distinct radii, fire rates and ranges", () => {
    const radii = new Set(SHIPS.map((s) => s.radius));
    const rates = new Set(SHIPS.map((s) => s.fireRate));
    const ranges = new Set(SHIPS.map((s) => s.range));
    assert.ok(radii.size >= 6, "sizes differ across the fleet");
    assert.ok(rates.size >= 6, "fire rates differ");
    assert.ok(ranges.size >= 5, "ranges differ");
    assert.ok(Math.min(...SHIPS.map((s) => s.radius)) >= 17);
});

test("derived stats and player state use the ship's own size", () => {
    const small = deriveStats(profile({ ship: 1 }));   // Viper
    const large = deriveStats(profile({ ship: 7 }));   // Monolith
    assert.ok(large.radius > small.radius);
    assert.ok(large.fireRate > small.fireRate);
    assert.ok(deriveStats(profile({ ship: 6 })).rangeMul > small.rangeMul);
    const s = createState(profile({ ship: 7 }));
    assert.equal(s.player.radius, large.radius);
});

test("enemies are bigger and have differentiated armour", () => {
    assert.ok(ENEMIES.every((e) => e.armor !== undefined));
    assert.ok(ENEMIES.every((e) => e.radius >= 17));
    const swarm = ENEMIES.find((e) => e.id === "swarm");
    const queen = ENEMIES.find((e) => e.id === "queen");
    assert.ok(queen.armor > swarm.armor);
    assert.ok(queen.radius > swarm.radius);
});

test("armour reduces incoming damage", () => {
    function hpAfter(armor) {
        const p = profile();
        const s = field(p, 430, 430);
        const e = enemy(s, "swarm", 40, 0, {
            def: Object.assign({}, ENEMIES.find((d) => d.id === "swarm"), { armor }),
            hp: 400, hpMax: 400
        });
        s.enemies = [e];
        s.bullets.push({
            x: e.x, y: e.y, vx: 0, vy: 0, speed: 400, dmg: 100,
            color: "#fff", radius: 4, life: 1, targetId: null,
            drone: false, splash: false, dot: false
        });
        step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
        return e.hp;
    }
    assert.ok(hpAfter(20) > hpAfter(0), "armoured enemy keeps more hull");
});

test("Alpha enemies stay neutral until damaged", () => {
    const p = profile();
    const s = field(p, 430, 430);
    assert.equal(s.map.passive, true);
    const e = enemy(s, "scout", 260, 0, { aggro: false, fireCd: 0.1 });
    s.enemies = [e];
    const shield = s.player.shield;

    run(s, p, 2.5, { move: { x: 0, y: 0 }, firing: false });
    assert.equal(s.enemyBullets.length, 0, "neutral enemy never fires");
    assert.ok(s.player.shield >= shield, "neutral enemy never damages the pilot");
    assert.equal(e.aggro, false);

    s.bullets.push({
        x: e.x, y: e.y, vx: 0, vy: 0, speed: 400, dmg: 50,
        color: "#fff", radius: 4, life: 1, targetId: null,
        drone: false, splash: false, dot: false
    });
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.equal(e.aggro, true, "damage provokes the enemy");
    assert.ok(drainEvents(s).some((ev) => ev.type === "aggro"));

    let shots = 0;
    for (let i = 0; i < 60; i++) {
        step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
        shots += drainEvents(s).filter((ev) => ev.type === "enemyshoot").length;
    }
    assert.ok(shots > 0, "provoked enemy opens fire");
});

test("auto-fire ignores neutrals unless the pilot locks them", () => {
    const p = profile();
    const s = field(p, 430, 430);
    const e = enemy(s, "swarm", 120, 0, { aggro: false, hp: 4000, hpMax: 4000 });
    s.enemies = [e];

    run(s, p, 0.5, { move: { x: 0, y: 0 }, firing: true });
    assert.equal(s.bullets.length, 0, "auto-fire does not engage neutrals");
    assert.equal(s.player.targetId, null);

    s.player.targetId = e.id;
    step(s, p, { move: { x: 0, y: 0 }, firing: true }, STEP);
    assert.ok(s.bullets.length > 0, "a locked neutral is engaged");
});

test("gate enemies on Alpha are hostile immediately", () => {
    const p = profile();
    const s = field(p, 0, 0);
    s.docked = true;
    s.wasDocked = true;
    assert.equal(launchGate(s, p), true);
    assert.equal(s.mode, "gate");
    assert.ok(s.enemies.length > 0);
    assert.ok(s.enemies.every((e) => e.aggro === true), "arena ignores the neutral rule");
});
