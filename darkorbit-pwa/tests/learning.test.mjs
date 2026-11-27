import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULTS } from "../src/storage.js";
import { createState, step } from "../src/sim.js";
import { academyProgress, currentLesson, academyDone, academyList } from "../src/academy.js";
import { gearPower, sectorStatus, sectorList } from "../src/gear.js";
import { tipOnce, seenTips } from "../src/tips.js";
import { addScore, loadBoard } from "../src/challenge.js";
import { ACADEMY_LESSONS, MAPS, STEP, PRESTIGE_MIN_LEVEL } from "../src/config.js";

function profile(overrides = {}) {
    return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), overrides);
}

test("academy advances through lessons and pays rewards", () => {
    const p = profile();
    assert.equal(currentLesson(p).id, "move");
    const credits = p.credits;
    assert.equal(academyProgress(p, "kills", 1), null, "wrong lesson type is ignored");
    let done = null;
    for (let i = 0; i < 2 && !done; i++) done = academyProgress(p, "distance", 100);
    assert.equal(done.lesson.id, "move");
    assert.ok(p.credits > credits);
    assert.equal(academyDone(p), 1);
    assert.equal(currentLesson(p).id, "shoot");
    assert.equal(academyList(p)[0].state, "completed");
    assert.equal(academyList(p)[1].state, "active");
});

test("ability lesson needs three distinct abilities", () => {
    const p = profile();
    p.academy.index = ACADEMY_LESSONS.findIndex((l) => l.id === "abilities");
    assert.equal(academyProgress(p, "ability", 1, "boost"), null);
    assert.equal(academyProgress(p, "ability", 1, "boost"), null, "repeat ignored");
    academyProgress(p, "ability", 1, "barrier");
    const done = academyProgress(p, "ability", 1, "repair");
    assert.ok(done);
    assert.equal(p.academy.progress, 0);
});

test("ammo lesson only counts the specified weapon", () => {
    const p = profile();
    p.academy.index = ACADEMY_LESSONS.findIndex((l) => l.id === "ammo");
    assert.equal(academyProgress(p, "ammo", 1, "ucb"), null);
    assert.ok(academyProgress(p, "ammo", 1, "rsb"));
});

test("gear power rises with progression and maps have recommendations", () => {
    const base = profile();
    const geared = profile({ level: 10, drones: 4, prestige: 2 });
    geared.upgrades.laser = 5;
    assert.ok(gearPower(geared) > gearPower(base));
    assert.ok(MAPS.every((m) => m.recommendedPower > 0));
    assert.equal(sectorList(base).length, MAPS.length);
    assert.equal(sectorStatus(base, MAPS[5]).tone, "warn");
});

test("tips only fire once", () => {
    const p = profile();
    const first = tipOnce(p, "cargo_full");
    assert.ok(first && first.text);
    assert.equal(tipOnce(p, "cargo_full"), null);
    assert.ok(seenTips(p).includes("cargo_full"));
    assert.equal(tipOnce(p, "unknown_tip"), null);
});

test("dev-flagged scores are excluded from the weekly board", () => {
    const store = new Map();
    globalThis.localStorage = {
        getItem: (k) => store.has(k) ? store.get(k) : null,
        setItem: (k, v) => store.set(k, v),
        removeItem: (k) => store.delete(k)
    };
    addScore({ score: 9000, kills: 10, mapIndex: 0, dev: true }, Date.now());
    assert.equal(loadBoard().length, 0);
    addScore({ score: 1000, kills: 2, mapIndex: 0, dev: false }, Date.now());
    assert.equal(loadBoard().length, 1);
});

test("run metrics accumulate from combat", () => {
    const p = profile();
    const s = createState(p);
    s.enemies = [];
    s.spawnTimer = 999;
    const e = {
        id: 1, defId: "swarm",
        def: { name: "t", tier: 1, color: "#fff", shape: "triangle", speed: 0, range: 0, fireCd: 99, damage: 0, spread: 1, credits: [1, 2], xp: 1, armor: 0 },
        x: s.player.x + 60, y: s.player.y, radius: 18,
        hp: 500, hpMax: 500, shield: 0, shieldMax: 0,
        fireCd: 99, contactCd: 99, hitFlash: 0, orbitDir: 1, wander: 0,
        homeX: 0, homeY: 0, cloakCd: 99, cloaked: false, cloakAlpha: 1,
        dotTime: 0, dotDps: 0, charge: 0, elite: null, phase2: false, aggro: true, dead: false
    };
    s.enemies.push(e);
    s.bullets.push({
        x: e.x, y: e.y, vx: 0, vy: 0, speed: 400, dmg: 50,
        color: "#fff", radius: 4, life: 1, targetId: null,
        drone: false, splash: false, dot: false, ammoId: "ucb"
    });
    step(s, p, { move: { x: 0, y: 0 }, firing: false }, STEP);
    assert.ok(s.damageDealt > 0);
    assert.equal(s.shotsHit, 1, "manually injected bullet still counts as a hit");
    assert.equal(s.boxesOpened, 0);
    assert.ok(PRESTIGE_MIN_LEVEL === 10);
});
