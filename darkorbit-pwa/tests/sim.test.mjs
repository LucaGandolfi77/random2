import test from "node:test";
import assert from "node:assert/strict";

import {
    createState, step, deriveStats, refreshStats, setMove, setFiring,
    selectTargetAt, cycleAmmo, useAbility, dock, jumpGate, respawn,
    buyUpgrade, buyShip, selectShip, getEnemy, stationPos, gatePos,
    drainEvents, emit, spawnPickup
} from "../src/sim.js";
import { DEFAULTS, loadProfile, saveProfile } from "../src/storage.js";
import {
    AMMO, MAPS, STEP, DOCK_RADIUS, SAFE_STANDOFF, GATE_RADIUS,
    RESOURCE_IDS, PICKUP_IDS, UPGRADES, SHIPS
} from "../src/config.js";

function profile(overrides = {}) {
    return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), overrides);
}

function quietState(p, options) {
    const s = createState(p, options);
    // Most combat tests need the pilot outside the safe haven.
    const st = stationPos(s);
    s.player.x = st.x + 430;
    s.player.y = st.y + 430;
    s.docked = false;
    s.wasDocked = false;
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

function run(state, p, seconds, input = { move: { x: 0, y: 0 }, firing: false }) {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i++) step(state, p, input, STEP);
}

test("deriveStats scales with upgrades and level", () => {
    const a = deriveStats(profile());
    const b = deriveStats(profile({ level: 5, upgrades: { laser: 3, generator: 2, shield: 1, hull: 1, cargo: 2 } }));
    assert.ok(b.hpMax > a.hpMax);
    assert.ok(b.shieldMax > a.shieldMax);
    assert.ok(b.speed > a.speed);
    assert.ok(b.cargoMax > a.cargoMax);
    assert.ok(b.damageMult > a.damageMult);
});

test("createState restores drones and starts at the station", () => {
    const p = profile({ drones: 3 });
    const s = createState(p, { mapIndex: 0 });
    assert.equal(s.drones.length, 3);
    assert.equal(s.player.x, stationPos(s).x);
    assert.equal(s.player.y, stationPos(s).y);
    assert.equal(s.docked, true);
});

test("movement is clamped to world bounds", () => {
    const p = profile();
    const s = quietState(p);
    s.player.x = 50;
    setMove(s, -1, -1);
    run(s, p, 2, { move: { x: -1, y: -1 }, firing: false });
    assert.ok(s.player.x >= 30);
    assert.ok(s.player.y >= 30);
});

test("firing respects cooldown and damages shield before hull", () => {
    const p = profile();
    const s = quietState(p);
    const px = s.player.x;
    const py = s.player.y;
    s.enemies.push({
        id: 999, defId: "swarm", def: { name: "Test", tier: 1, color: "#fff", shape: "triangle", speed: 100, range: 100, fireCd: 99, damage: 0, spread: 1, credits: [1, 2], xp: 1 },
        x: px + 120, y: py, vx: 0, vy: 0, angle: 0, radius: 16,
        hp: 100000, hpMax: 100000, shield: 5000, shieldMax: 5000,
        fireCd: 99, contactCd: 99, hitFlash: 0, orbitDir: 1, wander: 0, dead: false
    });
    setFiring(s, true);
    let shots = 0;
    for (let i = 0; i < 12; i++) {
        step(s, p, { move: { x: 0, y: 0 }, firing: true }, STEP);
        shots += drainEvents(s).filter((e) => e.type === "shoot").length;
    }
    assert.ok(shots >= 1, "at least one shot fired");
    assert.ok(shots <= 2, "cooldown prevented extra shots");
    assert.ok(s.enemies[0].shield < 5000, "shield absorbed damage");
    assert.equal(s.enemies[0].hp, 100000, "hull untouched while shield holds");
});

test("incoming fire drains shield then hull", () => {
    const p = profile();
    const s = quietState(p);
    s.enemyBullets.push({
        x: s.player.x, y: s.player.y, vx: 0, vy: 0,
        dmg: s.player.shield + 50, color: "#f00", radius: 5, life: 1
    });
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.equal(s.player.shield, 0);
    assert.ok(s.player.hp < s.player.hpMax, "overflow damaged hull");
});

test("pickups fill cargo and stop when full", () => {
    const p = profile();
    const s = quietState(p);
    s.player.cargoMax = 2;
    s.cargoUsed = 0;
    for (let i = 0; i < 5; i++) {
        s.loot.push({
            id: 100 + i, x: s.player.x, y: s.player.y, vx: 0, vy: 0,
            type: "aetherium", amount: 1, life: 20, spin: 0
        });
    }
    run(s, p, 0.1);
    assert.equal(s.cargoUsed, 2, "cargo capped at capacity");
    assert.equal(s.cargo.aetherium, 2);
    assert.equal(s.loot.length, 3, "uncollected crates remain");
});

test("docking sells ore for credits and clears cargo", () => {
    const p = profile({ credits: 100 });
    const s = quietState(p);
    s.docked = true;
    s.cargo.aetherium = 10;
    s.cargoUsed = 10;
    const report = dock(s, p);
    assert.ok(report.credits > 0);
    assert.equal(report.units, 10);
    assert.equal(p.credits, 100 + report.credits);
    assert.equal(s.cargoUsed, 0);
});

test("abilities apply effects and go on cooldown", () => {
    const p = profile();
    const s = quietState(p);
    assert.equal(useAbility(s, "boost"), true);
    assert.ok(s.player.boost > 0);
    assert.equal(useAbility(s, "boost"), false, "cannot recast during cooldown");
    s.player.hp = 10;
    assert.equal(useAbility(s, "repair"), true);
    assert.ok(s.player.hp > 10);
});

test("ammo cycles and target selection work", () => {
    const p = profile();
    const s = quietState(p);
    assert.equal(cycleAmmo(s, 1), 1);
    assert.equal(cycleAmmo(s, 1), 2);
    assert.equal(cycleAmmo(s, 1), 3);
    assert.equal(cycleAmmo(s, 1), 4);
    assert.equal(cycleAmmo(s, 1), 0);
    s.enemies.push({
        id: 42, def: { name: "Dummy" }, x: s.player.x + 40, y: s.player.y,
        radius: 10, hp: 10, hpMax: 10, shield: 0, shieldMax: 0, dead: false
    });
    const found = selectTargetAt(s, s.player.x + 40, s.player.y, 60);
    assert.equal(found.id, 42);
    assert.equal(s.player.targetId, 42);
});

test("kill grants xp, credits and can level the pilot up", () => {
    const p = profile({ credits: 0 });
    const s = quietState(p);
    p.xp = 0;
    p.level = 1;
    s.enemies.push({
        id: 77, defId: "swarm",
        def: { name: "Dummy", tier: 2, color: "#fff", shape: "triangle", speed: 100, range: 0, fireCd: 99, damage: 0, spread: 1, credits: [500, 500], xp: 400 },
        x: s.player.x + 60, y: s.player.y, radius: 16,
        hp: 1, hpMax: 1, shield: 0, shieldMax: 0,
        fireCd: 99, contactCd: 99, hitFlash: 0, orbitDir: 1, wander: 0, dead: false
    });
    s.bullets.push({
        x: s.player.x + 60, y: s.player.y, vx: 0, vy: 0, speed: 500,
        dmg: 1000, color: "#fff", radius: 3, life: 1, targetId: null, drone: false
    });
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.equal(getEnemy(s, 77), null, "enemy removed on death");
    assert.ok(p.credits >= 500);
    assert.ok(p.level >= 2, "large xp award leveled up");
});

test("destroy and respawn restores the ship at the station", () => {
    const p = profile();
    const s = quietState(p);
    s.cargo.aetherium = 5;
    s.cargoUsed = 5;
    s.enemyBullets.push({
        x: s.player.x, y: s.player.y, vx: 0, vy: 0,
        dmg: 1e9, color: "#f00", radius: 5, life: 1
    });
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.equal(s.destroyed, true);
    assert.equal(s.cargoUsed, 0, "cargo lost on death");

    respawn(s, p);
    assert.equal(s.destroyed, false);
    assert.equal(s.player.hp, s.player.hpMax);
    assert.equal(s.player.x, stationPos(s).x);
});

test("jump gate requires level and travels between maps", () => {
    const p = profile({ level: 1 });
    const s = quietState(p, { mapIndex: 0 });
    s.atGate = true;
    assert.equal(jumpGate(s, p), false, "level 2 map locked");
    p.level = 3;
    s.atGate = true;
    assert.equal(jumpGate(s, p), true);
    assert.equal(s.mapIndex, 1);
    assert.equal(s.map.name, MAPS[1].name);
    assert.equal(p.lastMap, 1);
});

test("hangar purchases deduct currency and change stats", () => {
    const p = profile({ credits: 100000, urium: 100, level: 10 });
    const before = deriveStats(p).hpMax;
    assert.equal(buyUpgrade(p, "hull"), true);
    assert.ok(deriveStats(p).hpMax > before);
    assert.ok(p.credits < 100000);

    const ownedBefore = p.ownedShips.length;
    assert.equal(buyShip(p, 2), true);
    assert.equal(p.ownedShips.length, ownedBefore + 1);
    assert.equal(p.ship, 2);
    assert.equal(selectShip(p, 0), true);
    assert.equal(p.ship, 0);
});

test("profile save/load round trip with validation", () => {
    const store = new Map();
    const storage = {
        getItem: (k) => store.has(k) ? store.get(k) : null,
        setItem: (k, v) => store.set(k, v)
    };
    const p = profile({ credits: 1234, level: 6, drones: 2 });
    p.ownedShips = [0, 1, 2];
    p.ship = 2;
    p.upgrades.laser = 4;
    assert.equal(saveProfile(p, storage), true);
    const loaded = loadProfile(storage);
    assert.equal(loaded.credits, 1234);
    assert.equal(loaded.level, 6);
    assert.equal(loaded.drones, 2);
    assert.equal(loaded.ship, 2);
    assert.equal(loaded.upgrades.laser, 4);
});

test("events can be drained once", () => {
    const p = profile();
    const s = quietState(p);
    emit(s, "message", { text: "hello" });
    const events = drainEvents(s);
    assert.equal(events.length, 1);
    assert.equal(events[0].text, "hello");
    assert.equal(drainEvents(s).length, 0);
});

test("all map gates and dock radii constants are sane", () => {
    assert.ok(DOCK_RADIUS > 0 && GATE_RADIUS > 0);
    assert.ok(RESOURCE_IDS.length >= 1);
    assert.ok(AMMO.length >= 2);
});

/* ------------------------------------------------------------------ */
/* v2: safe haven, new ammo, pickups and content                       */
/* ------------------------------------------------------------------ */

function dummyEnemy(id, x, y, overrides = {}) {
    return Object.assign({
        id,
        defId: "swarm",
        def: {
            name: "Dummy", tier: 1, color: "#fff", shape: "triangle",
            speed: 120, range: 600, fireCd: 0.5, damage: 20, spread: 1,
            credits: [10, 20], xp: 5
        },
        x, y, vx: 0, vy: 0, angle: 0, radius: 16,
        hp: 100000, hpMax: 100000, shield: 5000, shieldMax: 5000,
        fireCd: 0.25, contactCd: 0, hitFlash: 0,
        orbitDir: 1, wander: 0, homeX: x, homeY: y,
        cloakCd: 9, cloaked: false, cloakAlpha: 1,
        dotTime: 0, dotDps: 0, charge: 0, dead: false
    }, overrides);
}

test("station safe haven: enemies disengage and stop firing", () => {
    const p = profile();
    const s = createState(p);
    s.enemies = [];
    s.loot = [];
    s.boxes = [];
    s.spawnTimer = 999;
    s.boxTimer = 999;
    const st = stationPos(s);
    const e = dummyEnemy(500, st.x + 260, st.y);
    s.enemies.push(e);
    const startDist = Math.hypot(e.x - s.player.x, e.y - s.player.y);
    const startShield = s.player.shield;

    run(s, p, 1.2);

    const endDist = Math.hypot(e.x - s.player.x, e.y - s.player.y);
    assert.ok(endDist >= startDist - 12, "enemy does not close in while player is docked");
    assert.equal(s.enemyBullets.length, 0, "enemy never fires into the safe zone");
    assert.ok(s.player.shield >= startShield, "no damage taken in the safe zone");
});

test("station safe haven: enemies keep their distance from the ring", () => {
    const p = profile();
    const s = createState(p);
    s.enemies = [];
    s.spawnTimer = 999;
    s.boxTimer = 999;
    const st = stationPos(s);
    s.enemies.push(dummyEnemy(501, st.x + 60, st.y));
    run(s, p, 2.5);
    const e = s.enemies[0];
    assert.ok(Math.hypot(e.x - st.x, e.y - st.y) > DOCK_RADIUS + 30, "enemy steered outside the safe ring");
    assert.ok(SAFE_STANDOFF > DOCK_RADIUS);
});

test("station safe haven: hostile bullets fizzle at the boundary", () => {
    const p = profile();
    const s = createState(p);
    s.enemies = [];
    s.spawnTimer = 999;
    s.boxTimer = 999;
    const st = stationPos(s);
    s.enemyBullets.push({
        x: st.x + DOCK_RADIUS - 10, y: st.y, vx: -200, vy: 0,
        dmg: 500, color: "#f00", radius: 5, life: 2
    });
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.equal(s.enemyBullets.length, 0, "bullet removed at the station ring");
    assert.ok(drainEvents(s).some((e) => e.type === "bulletblock"));
});

test("station safe haven: weapons are locked while docked", () => {
    const p = profile();
    const s = createState(p);
    s.enemies = [dummyEnemy(502, s.player.x + 120, s.player.y)];
    s.spawnTimer = 999;
    s.boxTimer = 999;
    step(s, p, { move: { x: 0, y: 0 }, firing: true }, STEP);
    assert.equal(s.bullets.length, 0, "no player shots in the safe zone");
    assert.ok(!drainEvents(s).some((e) => e.type === "shoot"), "auto-fire does not shoot while docked");
});

test("docked shields regenerate much faster", () => {
    const p = profile();
    const docked = createState(p);
    docked.enemies = [];
    docked.spawnTimer = 999;
    docked.player.shield = docked.player.shieldMax / 2;
    const field = quietState(p);
    field.player.shield = field.player.shieldMax / 2;
    run(docked, p, 0.5);
    run(field, p, 0.5);
    assert.ok(docked.player.shield > field.player.shield);
});

test("PLT splash damages nearby enemies", () => {
    const p = profile();
    const s = quietState(p);
    s.player.ammo = 3;
    const a = s.player.x + 100;
    const b = s.player.y;
    const e1 = dummyEnemy(600, a, b, { hp: 900, hpMax: 900, shield: 0, shieldMax: 0 });
    const e2 = dummyEnemy(601, a + 40, b + 20, { hp: 900, hpMax: 900, shield: 0, shieldMax: 0 });
    s.enemies = [e1, e2];
    s.bullets.push({
        x: a, y: b, vx: 0, vy: 0, speed: 500, dmg: 100, color: "#f90",
        radius: 5, life: 1, targetId: null, drone: false, splash: true, dot: false
    });
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.ok(e1.hp < 900, "primary target damaged");
    assert.ok(e2.hp < 900, "splash damaged a nearby enemy");
});

test("PIB infection applies damage over time", () => {
    const p = profile();
    const s = quietState(p);
    s.player.ammo = 4;
    const e = dummyEnemy(610, s.player.x + 60, s.player.y, { hp: 900, hpMax: 900, shield: 0, shieldMax: 0 });
    s.enemies = [e];
    s.bullets.push({
        x: s.player.x + 60, y: s.player.y, vx: 0, vy: 0, speed: 500, dmg: 50,
        color: "#0f0", radius: 4, life: 1, targetId: null, drone: false,
        splash: false, dot: true
    });
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.ok(e.dotTime > 0, "infection applied");
    const hpAfterHit = e.hp;
    run(s, p, 1.0);
    assert.ok(e.hp < hpAfterHit, "infection keeps ticking");
});

test("field pickups apply temporary effects", () => {
    const p = profile();
    const s = quietState(p);
    s.player.hp = s.player.hpMax * 0.4;
    spawnPickup(s, "magnet", s.player.x, s.player.y);
    spawnPickup(s, "repair", s.player.x, s.player.y);
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.ok(s.magnetTimer > 0, "magnet timer started");
    assert.ok(s.player.hp > s.player.hpMax * 0.4, "repair kit healed the hull");
});

test("v2 content tables are wired up", () => {
    assert.equal(MAPS.length, 6);
    assert.equal(MAPS[4].id, "epsilon");
    assert.equal(MAPS[3].gateTo, 4, "Delta jumps to Epsilon");
    assert.ok(MAPS[4].level > MAPS[3].level);
    assert.equal(AMMO.length, 5);
    assert.ok(AMMO.some((a) => a.splash));
    assert.ok(AMMO.some((a) => a.dot));
    assert.ok(SHIPS.length >= 6);
    assert.ok(SHIPS.some((ship) => ship.perks && ship.perks.evasion));
    assert.ok(UPGRADES.some((u) => u.id === "critical"));
    assert.ok(PICKUP_IDS.length >= 3);
});

test("projectiles and particles are recycled through pools", () => {
    const p = profile();
    const s = quietState(p);
    const e = dummyEnemy(700, s.player.x + 200, s.player.y, { hp: 500000, hpMax: 500000 });
    s.enemies = [e];
    setFiring(s, true);
    run(s, p, 2.5, { move: { x: 0, y: 0 }, firing: true });
    setFiring(s, false);
    run(s, p, 2, { move: { x: 0, y: 0 }, firing: false });
    assert.ok(s.pools, "pools exist");
    assert.ok(s.pools.bullets.length > 0, "expired bullets were returned to the pool");
    assert.ok(s.pools.particles.length > 0, "expired particles were returned to the pool");
});

test("quality fx caps particle bursts", () => {
    const p = profile();
    const s = quietState(p);
    s.fx.particles = 8;
    for (let i = 0; i < 12; i++) {
        s.particles.push({ id: i, x: 0, y: 0, vx: 0, vy: 0, life: 1, maxLife: 1, size: 1, color: "#fff" });
    }
    // Force a burst via a kill at a known spot.
    const e = dummyEnemy(701, s.player.x + 40, s.player.y, { hp: 1, hpMax: 1, shield: 0, shieldMax: 0 });
    s.enemies = [e];
    s.bullets.push({
        x: e.x, y: e.y, vx: 0, vy: 0, speed: 400, dmg: 100, color: "#fff",
        radius: 3, life: 1, targetId: null, drone: false, splash: false, dot: false
    });
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.ok(s.particles.length <= 8 + 20, "particle cap respected within one burst");
});

test("ship perks and critical upgrade feed into stats", () => {
    const plain = deriveStats(profile());
    const spectre = deriveStats(profile({ ship: 4 }));
    assert.ok(spectre.evasion > plain.evasion);
    assert.ok(spectre.droneMult > plain.droneMult);
    const colossus = deriveStats(profile({ ship: 5 }));
    assert.ok(colossus.rocketMult > plain.rocketMult);
    const crit = deriveStats(profile({ upgrades: Object.assign({}, DEFAULTS.upgrades, { critical: 3 }) }));
    assert.ok(crit.critChance > 0);
});
