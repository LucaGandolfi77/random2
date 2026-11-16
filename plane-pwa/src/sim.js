/*
 * Plane Shooter — pure simulation.
 *
 * No DOM, no Canvas, no localStorage. `step(state, dt)` advances a run and
 * pushes audio/UI events into `state.events`; the presentation layer drains
 * them. Keeping this file pure is what makes the game testable: the same
 * seed and the same sequence of steps always produce the same run.
 */

import {
    WIDTH,
    HEIGHT,
    PLAYER,
    BULLET,
    ENEMY_BULLET,
    ENEMY_TYPES,
    POWERUPS,
    WAVE,
    HIT,
    MAX_PARTICLES
} from "./config.js";

const TAU = Math.PI * 2;

/* mulberry32 — tiny, fast, deterministic 32-bit PRNG. */
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function rnd(state, min, max) {
    return min + state.rng() * (max - min);
}

function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
}

function dist2(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

function emit(state, type, data) {
    state.events.push({ type, ...(data || {}) });
}

export function createState(seed = Date.now()) {
    const safeSeed = (Number(seed) || Date.now()) >>> 0;
    return {
        seed: safeSeed,
        rng: mulberry32(safeSeed),
        time: 0,
        score: 0,
        lives: HIT.lives,
        wave: 1,
        player: {
            x: PLAYER.startX,
            y: PLAYER.startY,
            r: PLAYER.r,
            invuln: 0
        },
        bullets: [],
        enemies: [],
        enemyBullets: [],
        powerups: [],
        particles: [],
        floaters: [],
        buffs: {
            rapid: 0,
            spread: 0,
            shield: false
        },
        fireTimer: 0,
        spawnTimer: 0.7,
        waveTimer: 0,
        kills: 0,
        hits: 0,
        over: false,
        shake: 0,
        flash: 0,
        events: [],
        stats: {
            kills: 0,
            powerups: 0,
            hits: 0,
            escaped: 0
        }
    };
}

export function setPlayerPosition(state, x, y) {
    if (!state || state.over) return;
    state.player.x = clamp(Number(x) || 0, PLAYER.margin, WIDTH - PLAYER.margin);
    state.player.y = clamp(Number(y) || 0, PLAYER.minY, PLAYER.maxY);
}

export function movePlayer(state, dx, dy) {
    if (!state || state.over) return;
    setPlayerPosition(state, state.player.x + dx, state.player.y + dy);
}

export function spawnInterval(wave) {
    return Math.max(
        WAVE.spawnMin,
        WAVE.spawnBase * Math.pow(0.93, Math.max(0, wave - 1))
    );
}

export function step(state, dt) {
    if (!state || state.over) return;

    const d = clamp(Number(dt) || 0, 0, 0.1);
    if (d === 0) return;

    state.time += d;

    if (state.player.invuln > 0) {
        state.player.invuln = Math.max(0, state.player.invuln - d);
    }

    state.shake = Math.max(0, state.shake - d * 36);
    state.flash = Math.max(0, state.flash - d * 2.8);

    tickBuffs(state, d);
    tickWave(state, d);
    tickSpawn(state, d);
    tickFire(state, d);

    updateEnemies(state, d);
    updateBullets(state, d);
    updateEnemyBullets(state, d);
    updatePowerups(state, d);
    updateParticles(state, d);
    updateFloaters(state, d);

    collide(state);
}

function tickBuffs(state, dt) {
    if (state.buffs.rapid > 0) {
        state.buffs.rapid = Math.max(0, state.buffs.rapid - dt);
    }
    if (state.buffs.spread > 0) {
        state.buffs.spread = Math.max(0, state.buffs.spread - dt);
    }
}

function tickWave(state, dt) {
    state.waveTimer += dt;
    let guard = 0;
    while (state.waveTimer >= WAVE.duration && state.wave < 99 && guard++ < 4) {
        state.waveTimer -= WAVE.duration;
        state.wave += 1;
        state.score += WAVE.scoreBonus * state.wave;
        emit(state, "wave", { wave: state.wave });
    }
}

function tickSpawn(state, dt) {
    state.spawnTimer -= dt;
    if (state.spawnTimer > 0) return;

    if (state.enemies.length >= WAVE.maxEnemies) {
        state.spawnTimer = 0.35;
        return;
    }

    spawnFormation(state);
    state.spawnTimer = spawnInterval(state.wave) * rnd(state, 0.82, 1.18);
}

function tickFire(state, dt) {
    const interval = state.buffs.rapid > 0 ? BULLET.rapidInterval : BULLET.interval;
    state.fireTimer -= dt;

    let guard = 0;
    while (state.fireTimer <= 0 && state.bullets.length < BULLET.max && guard++ < 6) {
        fireVolley(state);
        state.fireTimer += interval;
    }

    /* If the bullet cap kept us from firing, do not accumulate a huge debt
       that turns into a burst as soon as the screen clears. */
    if (state.fireTimer < 0) state.fireTimer = 0;
}

function fireVolley(state) {
    const angles = state.buffs.spread > 0
        ? [-BULLET.spread, 0, BULLET.spread]
        : [0];

    for (let i = 0; i < angles.length; i++) {
        if (state.bullets.length >= BULLET.max) break;
        const angle = angles[i];
        state.bullets.push({
            x: state.player.x + Math.sin(angle) * 4,
            y: state.player.y - BULLET.offsetY,
            vx: Math.sin(angle) * BULLET.speed,
            vy: -Math.cos(angle) * BULLET.speed,
            r: BULLET.r,
            life: BULLET.life
        });
    }

    emit(state, "shoot");
}

function speedScale(wave) {
    return Math.min(WAVE.speedCap, 1 + (wave - 1) * 0.06);
}

function bulletSpeedScale(wave) {
    return Math.min(WAVE.bulletSpeedCap, 1 + (wave - 1) * 0.04);
}

function updateEnemies(state, dt) {
    const scale = speedScale(state.wave);

    for (let i = state.enemies.length - 1; i >= 0; i--) {
        const e = state.enemies[i];
        const def = ENEMY_TYPES[e.type];
        e.t += dt;

        if (e.type === "weaver") {
            e.y += e.speed * scale * dt;
            e.x = e.baseX + Math.sin(e.t * def.freq + e.phase) * def.amp;
        } else if (e.type === "diver") {
            e.y += e.speed * scale * dt;
            const dx = state.player.x - e.x;
            e.x += clamp(dx * 2.2, -def.track, def.track) * dt;
        } else if (e.type === "gunner") {
            if (e.y < def.stopY) {
                e.y += e.speed * scale * dt;
            } else {
                e.hold += dt;
                if (e.hold > def.hold) {
                    e.y += e.speed * scale * dt;
                }
            }

            if (e.y >= def.stopY * 0.75) {
                e.fireTimer -= dt;
                if (e.fireTimer <= 0) {
                    fireAimed(state, e, def);
                    e.fireTimer = Math.max(
                        0.8,
                        def.fireInterval - (state.wave - 1) * 0.08
                    );
                }
            }
        } else if (e.type === "tank") {
            e.y += e.speed * scale * dt;
            if (e.y > 80) {
                e.fireTimer -= dt;
                if (e.fireTimer <= 0) {
                    fireSpread(state, e, def);
                    e.fireTimer = def.fireInterval;
                }
            }
        } else {
            e.y += e.speed * scale * dt;
        }

        if (
            e.y - e.r > HEIGHT + 40 ||
            e.x < -120 ||
            e.x > WIDTH + 120
        ) {
            state.enemies.splice(i, 1);
            state.stats.escaped += 1;
        }
    }
}

function updateBullets(state, dt) {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;

        if (
            b.life <= 0 ||
            b.y < -20 ||
            b.x < -20 ||
            b.x > WIDTH + 20
        ) {
            state.bullets.splice(i, 1);
        }
    }
}

function updateEnemyBullets(state, dt) {
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const b = state.enemyBullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;

        if (
            b.life <= 0 ||
            b.y < -30 ||
            b.y > HEIGHT + 30 ||
            b.x < -30 ||
            b.x > WIDTH + 30
        ) {
            state.enemyBullets.splice(i, 1);
        }
    }
}

function updatePowerups(state, dt) {
    for (let i = state.powerups.length - 1; i >= 0; i--) {
        const p = state.powerups[i];
        p.t += dt;

        const dx = state.player.x - p.x;
        const dy = state.player.y - p.y;
        const d = Math.hypot(dx, dy) || 1;

        if (d < 120) {
            p.x += (dx / d) * 150 * dt;
            p.y += (dy / d) * 150 * dt;
        } else {
            p.y += p.vy * dt;
        }

        if (d <= PLAYER.r + p.r + 6) {
            collectPowerup(state, p);
            state.powerups.splice(i, 1);
        } else if (p.y - p.r > HEIGHT + 24) {
            state.powerups.splice(i, 1);
        }
    }
}

function updateParticles(state, dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 160 * dt;
        p.life -= dt;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
}

function updateFloaters(state, dt) {
    for (let i = state.floaters.length - 1; i >= 0; i--) {
        const f = state.floaters[i];
        f.y -= 34 * dt;
        f.life -= dt;
        if (f.life <= 0) state.floaters.splice(i, 1);
    }
}

function collide(state) {
    /* Player bullets vs enemies. */
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i];
        for (let j = state.enemies.length - 1; j >= 0; j--) {
            const e = state.enemies[j];
            const radius = b.r + e.r;
            if (dist2(b.x, b.y, e.x, e.y) <= radius * radius) {
                state.bullets.splice(i, 1);
                e.hp -= 1;
                spawnParticles(state, b.x, b.y, "enemy", 3, 0.7);

                if (e.hp <= 0) {
                    killEnemy(state, e, j);
                }
                break;
            }
        }
    }

    if (state.over) return;

    /* Enemy bodies vs the player. */
    if (state.player.invuln <= 0) {
        for (let j = state.enemies.length - 1; j >= 0; j--) {
            const e = state.enemies[j];
            const radius = PLAYER.r + e.r;
            if (dist2(state.player.x, state.player.y, e.x, e.y) <= radius * radius) {
                state.enemies.splice(j, 1);
                hitPlayer(state, e.x, e.y);
                break;
            }
        }
    }

    if (state.over) return;

    /* Enemy bullets vs the player. */
    if (state.player.invuln <= 0) {
        for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
            const b = state.enemyBullets[i];
            const radius = PLAYER.r + b.r;
            if (dist2(state.player.x, state.player.y, b.x, b.y) <= radius * radius) {
                state.enemyBullets.splice(i, 1);
                hitPlayer(state, b.x, b.y);
                break;
            }
        }
    }
}

function killEnemy(state, enemy, index) {
    const points = enemy.value * Math.min(state.wave, WAVE.maxMultiplier);
    state.score += points;
    state.kills += 1;
    state.stats.kills += 1;

    state.floaters.push({
        x: enemy.x,
        y: enemy.y,
        text: "+" + points,
        life: 0.9,
        maxLife: 0.9,
        color: "bullet"
    });

    spawnParticles(
        state,
        enemy.x,
        enemy.y,
        enemy.type === "tank" ? "enemyAlt" : "enemy",
        enemy.type === "tank" ? 18 : 10,
        1
    );

    emit(state, "kill", { enemy: enemy.type, points });

    const dropChance = enemy.type === "tank" ? 0.32 : 0.12;
    if (state.rng() < dropChance) {
        dropPowerup(state, enemy.x, enemy.y);
    }

    state.enemies.splice(index, 1);
}

export function hitPlayer(state, sourceX = state.player.x, sourceY = state.player.y) {
    if (!state || state.over || state.player.invuln > 0) return "immune";

    if (state.buffs.shield) {
        state.buffs.shield = false;
        state.player.invuln = HIT.shieldInvuln;
        state.flash = 0.7;
        state.shake = 7;
        spawnParticles(state, state.player.x, state.player.y, "shield", 16, 1);
        emit(state, "shield", { x: sourceX, y: sourceY });
        return "shield";
    }

    state.lives -= 1;
    state.hits += 1;
    state.stats.hits += 1;
    state.player.invuln = HIT.invuln;
    state.flash = 1;
    state.shake = 11;
    spawnParticles(state, state.player.x, state.player.y, "danger", 22, 1);

    /* A hit clears the local bullet cloud, so one mistake cannot cascade
       into three more hits while the player is still recovering. */
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const b = state.enemyBullets[i];
        if (dist2(b.x, b.y, state.player.x, state.player.y) <= HIT.clearRadius * HIT.clearRadius) {
            state.enemyBullets.splice(i, 1);
        }
    }

    emit(state, "hit", { lives: state.lives });

    if (state.lives <= 0) {
        state.lives = 0;
        state.over = true;
        emit(state, "gameover", { score: state.score, wave: state.wave });
    }

    return "hit";
}

export function spawnEnemy(state, type, x, y) {
    const def = ENEMY_TYPES[type];
    if (!def) return null;

    const hpBonus = type === "tank" && state.wave >= 8 ? 1 : 0;
    const enemy = {
        type,
        x,
        y,
        baseX: x,
        r: def.r,
        hp: def.hp + hpBonus,
        maxHp: def.hp + hpBonus,
        value: def.value,
        speed: def.speed,
        t: 0,
        phase: state.rng() * TAU,
        hold: 0,
        fireTimer: def.fireInterval || 0
    };

    state.enemies.push(enemy);
    return enemy;
}

function spawnFormation(state) {
    const capacity = WAVE.maxEnemies - state.enemies.length;
    if (capacity <= 0) return;

    const roll = state.rng();
    const wave = state.wave;

    if (wave >= 4 && roll < 0.08) {
        spawnEnemy(state, "tank", rnd(state, 80, WIDTH - 80), -34);
        return;
    }

    if (wave >= 2 && roll < 0.26) {
        spawnEnemy(state, "gunner", rnd(state, 100, WIDTH - 100), -32);
        if (state.enemies.length < WAVE.maxEnemies) {
            spawnEnemy(state, "gunner", rnd(state, 100, WIDTH - 100), -62);
        }
        return;
    }

    if (wave >= 2 && roll < 0.5) {
        const cx = rnd(state, 120, WIDTH - 120);
        for (let i = -2; i <= 2; i++) {
            if (state.enemies.length >= WAVE.maxEnemies) break;
            spawnEnemy(state, "weaver", cx + i * 34, -30 - Math.abs(i) * 18);
        }
        return;
    }

    if (wave >= 3 && roll < 0.65) {
        spawnEnemy(state, "diver", rnd(state, 60, WIDTH - 60), -30);
        if (state.enemies.length < WAVE.maxEnemies) {
            spawnEnemy(state, "diver", rnd(state, 60, WIDTH - 60), -60);
        }
        return;
    }

    const cx = rnd(state, 100, WIDTH - 100);
    for (let i = -2; i <= 2; i++) {
        if (state.enemies.length >= WAVE.maxEnemies) break;
        spawnEnemy(state, "drifter", cx + i * 36, -30 - Math.abs(i) * 12);
    }
}

function fireAimed(state, enemy, def) {
    if (state.enemyBullets.length >= ENEMY_BULLET.max) return;

    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const base = Math.atan2(dy, dx);
    const speed = (def.bulletSpeed || ENEMY_BULLET.speed) * bulletSpeedScale(state.wave);

    state.enemyBullets.push({
        x: enemy.x,
        y: enemy.y + enemy.r * 0.4,
        vx: Math.cos(base) * speed,
        vy: Math.sin(base) * speed,
        r: ENEMY_BULLET.r,
        life: ENEMY_BULLET.life
    });
}

function fireSpread(state, enemy, def) {
    if (state.enemyBullets.length >= ENEMY_BULLET.max) return;

    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const base = Math.atan2(dy, dx);
    const speed = (def.bulletSpeed || ENEMY_BULLET.speed) * bulletSpeedScale(state.wave);

    for (let i = -1; i <= 1; i++) {
        if (state.enemyBullets.length >= ENEMY_BULLET.max) break;
        const angle = base + i * def.spread;
        state.enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.r * 0.4,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: ENEMY_BULLET.r,
            life: ENEMY_BULLET.life
        });
    }
}

export function dropPowerup(state, x, y, forcedKind) {
    const kind = forcedKind || weightedPowerup(state);
    state.powerups.push({
        kind,
        x,
        y,
        r: 9,
        vy: 70,
        t: 0
    });
    emit(state, "drop", { kind });
    return kind;
}

function weightedPowerup(state) {
    const entries = Object.entries(POWERUPS);
    const total = entries.reduce((sum, [, def]) => sum + def.weight, 0);
    let roll = state.rng() * total;

    for (let i = 0; i < entries.length; i++) {
        roll -= entries[i][1].weight;
        if (roll <= 0) return entries[i][0];
    }
    return entries[0][0];
}

function collectPowerup(state, pickup) {
    const kind = pickup.kind;
    const def = POWERUPS[kind];

    state.stats.powerups += 1;

    if (kind === "rapid" || kind === "spread") {
        state.buffs[kind] = def.duration;
    } else if (kind === "shield") {
        state.buffs.shield = true;
    } else if (kind === "repair") {
        if (state.lives < HIT.maxLives) {
            state.lives += 1;
        } else {
            state.score += 50;
        }
    }

    state.floaters.push({
        x: pickup.x,
        y: pickup.y,
        text: def.label,
        life: 1,
        maxLife: 1,
        color: kind === "repair" ? "plane" : "powerup"
    });

    spawnParticles(state, pickup.x, pickup.y, "powerup", 12, 1);
    emit(state, "powerup", { kind });
}

export function spawnParticles(state, x, y, color, count = 8, power = 1) {
    const n = Math.max(1, Math.min(28, count));
    for (let i = 0; i < n; i++) {
        if (state.particles.length >= MAX_PARTICLES) {
            state.particles.shift();
        }
        const life = 0.45 + state.rng() * 0.55;
        state.particles.push({
            x,
            y,
            vx: (state.rng() - 0.5) * 180 * power,
            vy: (state.rng() - 0.5) * 180 * power - 40,
            life,
            maxLife: life,
            color,
            size: 1.5 + state.rng() * 2.5
        });
    }
}

export function drainEvents(state) {
    if (!state || !Array.isArray(state.events) || state.events.length === 0) {
        return [];
    }
    const events = state.events;
    state.events = [];
    return events;
}
