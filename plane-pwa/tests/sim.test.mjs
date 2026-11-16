import test from "node:test";
import assert from "node:assert/strict";

import {
    createState,
    step,
    setPlayerPosition,
    movePlayer,
    spawnEnemy,
    hitPlayer,
    dropPowerup,
    drainEvents,
    spawnInterval
} from "../src/sim.js";
import {
    PLAYER,
    WIDTH,
    HEIGHT,
    HIT,
    WAVE
} from "../src/config.js";

const DT = 1 / 60;

function runFor(state, seconds, onStep) {
    const steps = Math.round(seconds / DT);
    for (let i = 0; i < steps; i++) {
        if (onStep) onStep(state, i * DT);
        step(state, DT);
        if (state.over) break;
    }
    return state;
}

function finiteState(state) {
    const values = [
        state.time,
        state.score,
        state.lives,
        state.wave,
        state.player.x,
        state.player.y,
        state.player.invuln
    ];
    assert.ok(values.every(Number.isFinite), "state contains a non-finite value");
}

test("createState starts with three lives, wave 1 and the plane at the bottom", () => {
    const state = createState(123);
    assert.equal(state.lives, HIT.lives);
    assert.equal(state.wave, 1);
    assert.equal(state.score, 0);
    assert.equal(state.over, false);
    assert.equal(state.player.x, PLAYER.startX);
    assert.equal(state.player.y, PLAYER.startY);
    assert.ok(state.player.y > HEIGHT * 0.8);
});

test("the player is clamped to the playfield", () => {
    const state = createState(1);
    setPlayerPosition(state, -100, -100);
    assert.equal(state.player.x, PLAYER.margin);
    assert.equal(state.player.y, PLAYER.minY);

    setPlayerPosition(state, WIDTH + 100, HEIGHT + 100);
    assert.equal(state.player.x, WIDTH - PLAYER.margin);
    assert.equal(state.player.y, PLAYER.maxY);

    movePlayer(state, -5, -5);
    assert.equal(state.player.x, WIDTH - PLAYER.margin - 5);
});

test("auto-fire spawns upward bullets without any input", () => {
    const state = createState(2);
    runFor(state, 0.5);
    assert.ok(state.bullets.length > 0);
    assert.ok(state.bullets.every((bullet) => bullet.vy < 0));
    assert.ok(drainEvents(state).some((event) => event.type === "shoot"));
});

test("a bullet kills a drifter and adds score", () => {
    const state = createState(3);
    const enemy = spawnEnemy(state, "drifter", state.player.x, state.player.y - 140);
    assert.ok(enemy);
    runFor(state, 1);
    assert.ok(state.score >= 10);
    assert.ok(state.stats.kills >= 1);
    assert.equal(state.enemies.includes(enemy), false);
});

test("a tank takes several hits before it dies", () => {
    const state = createState(4);
    const tank = spawnEnemy(state, "tank", state.player.x, state.player.y - 220);
    assert.ok(tank);

    runFor(state, 0.35);
    assert.ok(tank.hp < tank.maxHp, "the tank should have taken a hit");
    assert.ok(tank.hp > 0, "the first hits should not kill a tank");

    runFor(state, 2.5);
    assert.equal(state.enemies.includes(tank), false);
    assert.ok(state.score >= 70);
});

test("a collision costs exactly one life and grants invulnerability", () => {
    const state = createState(5);
    spawnEnemy(state, "drifter", state.player.x, state.player.y);
    step(state, DT);

    assert.equal(state.lives, HIT.lives - 1);
    assert.ok(state.player.invuln > 0);

    spawnEnemy(state, "drifter", state.player.x, state.player.y);
    step(state, DT);
    assert.equal(state.lives, HIT.lives - 1, "invulnerability blocks the second hit");

    state.player.invuln = 0;
    spawnEnemy(state, "drifter", state.player.x, state.player.y);
    step(state, DT);
    assert.equal(state.lives, HIT.lives - 2);
});

test("a shield absorbs one hit and is consumed", () => {
    const state = createState(6);
    state.buffs.shield = true;
    const result = hitPlayer(state);

    assert.equal(result, "shield");
    assert.equal(state.buffs.shield, false);
    assert.equal(state.lives, HIT.lives);
    assert.ok(state.player.invuln > 0);
    assert.ok(drainEvents(state).some((event) => event.type === "shield"));

    state.player.invuln = 0;
    hitPlayer(state);
    assert.equal(state.lives, HIT.lives - 1);
});

test("an enemy bullet costs a life when it reaches the player", () => {
    const state = createState(61);
    state.enemyBullets.push({
        x: state.player.x,
        y: state.player.y - 2,
        vx: 0,
        vy: 0,
        r: 3,
        life: 1
    });

    step(state, DT);
    assert.equal(state.lives, HIT.lives - 1);
    assert.equal(state.enemyBullets.length, 0);
});

test("the last hit ends the run and emits gameover", () => {
    const state = createState(7);
    state.lives = 1;
    hitPlayer(state);

    assert.equal(state.lives, 0);
    assert.equal(state.over, true);
    assert.ok(drainEvents(state).some((event) => event.type === "gameover"));
});

test("an enemy leaving the bottom is removed without costing a life", () => {
    const state = createState(8);
    const enemy = spawnEnemy(state, "drifter", state.player.x, HEIGHT + 100);
    step(state, DT);

    assert.equal(state.enemies.includes(enemy), false);
    assert.equal(state.lives, HIT.lives);
    assert.equal(state.stats.escaped, 1);
});

test("power-ups are collected by the plane and apply their buff", () => {
    const state = createState(9);
    dropPowerup(state, state.player.x, state.player.y - 12, "rapid");
    step(state, DT);

    assert.equal(state.powerups.length, 0);
    assert.ok(state.buffs.rapid > 0);
    assert.equal(state.stats.powerups, 1);
    assert.ok(drainEvents(state).some((event) => event.type === "powerup"));
});

test("a repair power-up heals one life and caps at five", () => {
    const state = createState(10);
    state.lives = 2;
    dropPowerup(state, state.player.x, state.player.y - 12, "repair");
    step(state, DT);
    assert.equal(state.lives, 3);

    state.lives = HIT.maxLives;
    dropPowerup(state, state.player.x, state.player.y - 12, "repair");
    step(state, DT);
    assert.equal(state.lives, HIT.maxLives);
});

test("timed buffs expire", () => {
    const state = createState(11);
    state.buffs.rapid = 0.02;
    state.buffs.spread = 0.02;
    step(state, 0.05);

    assert.equal(state.buffs.rapid, 0);
    assert.equal(state.buffs.spread, 0);
});

test("a wave advances after its duration and pays a bonus", () => {
    const state = createState(12);
    const before = state.score;
    state.waveTimer = WAVE.duration - 0.01;
    step(state, 0.02);

    assert.equal(state.wave, 2);
    assert.equal(state.score, before + WAVE.scoreBonus * 2);
    assert.ok(drainEvents(state).some((event) => event.type === "wave" && event.wave === 2));
});

test("difficulty ramps but stays inside the cap", () => {
    assert.ok(spawnInterval(2) < spawnInterval(1));
    assert.equal(spawnInterval(1), WAVE.spawnBase);
    assert.equal(spawnInterval(999), WAVE.spawnMin);
});

test("the same seed produces the same run", () => {
    const a = createState(4242);
    const b = createState(4242);

    runFor(a, 3);
    runFor(b, 3);

    assert.deepEqual(
        {
            score: a.score,
            lives: a.lives,
            wave: a.wave,
            player: a.player,
            bullets: a.bullets,
            enemies: a.enemies,
            enemyBullets: a.enemyBullets,
            powerups: a.powerups
        },
        {
            score: b.score,
            lives: b.lives,
            wave: b.wave,
            player: b.player,
            bullets: b.bullets,
            enemies: b.enemies,
            enemyBullets: b.enemyBullets,
            powerups: b.powerups
        }
    );
});

test("a long unattended run eventually ends and never produces NaN", () => {
    const state = createState(1);
    runFor(state, 120);
    finiteState(state);
    assert.equal(state.over, true, "auto-fire alone should not survive forever");
});

test("a simple moving bot survives and scores", () => {
    const state = createState(7);

    runFor(state, 30, (game) => {
        let targetX = game.player.x;
        let nearest = null;
        let nearestDistance = Infinity;

        for (const enemy of game.enemies) {
            const distance =
                Math.abs(enemy.y - game.player.y) +
                Math.abs(enemy.x - game.player.x);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = enemy;
            }
        }

        if (nearest) targetX = nearest.x;

        let threat = null;
        let threatDistance = Infinity;
        for (const bullet of game.enemyBullets) {
            const distance = Math.hypot(
                bullet.x - game.player.x,
                bullet.y - game.player.y
            );
            if (distance < threatDistance) {
                threatDistance = distance;
                threat = bullet;
            }
        }

        if (threat && threatDistance < 100) {
            targetX = game.player.x + (game.player.x < threat.x ? -90 : 90);
        }

        const stepX = Math.max(
            -PLAYER.speed * DT,
            Math.min(PLAYER.speed * DT, targetX - game.player.x)
        );
        setPlayerPosition(game, game.player.x + stepX, game.player.y);
    });

    finiteState(state);
    assert.equal(state.over, false, "the bot should survive 30 seconds");
    assert.ok(state.score > 500, "the bot should be scoring");
});
