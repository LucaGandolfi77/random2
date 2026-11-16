/*
 * DEEP ORBIT — pure simulation.
 *
 * No DOM, no canvas: just state and numbers. `step()` advances the world by a
 * fixed dt, mutating `state` (and the player's `profile` for rewards/XP).
 * Rendering, audio and UI consume `state.events` through `drainEvents()`.
 */

import {
    AMMO, MAPS, ENEMY_BY_ID, SHIPS, RESOURCES, RESOURCE_IDS, BOX_TYPES,
    UPGRADES, UPGRADE_BY_ID, SKILLS, SKILL_BY_ID, ABILITIES, ABILITY_BY_ID,
    PICKUPS, PICKUP_IDS, GATE_CONFIG, ELITES, ELITE_BY_ID,
    PLAYER_RADIUS, PICKUP_RADIUS, DOCK_RADIUS, SAFE_STANDOFF, GATE_RADIUS,
    TARGET_RANGE, SPLASH_RADIUS, DOT_DURATION, MAGNET_RADIUS,
    OVERDRIVE_FIRE_MULT, DOCKED_SHIELD_REGEN_MULT,
    MAX_PARTICLES, MAX_ENEMY_BULLETS, DRONE_DAMAGE, DRONE_FIRE_CD,
    xpForLevel, clamp, rand, randInt, pick
} from "./config.js";

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export function deriveStats(profile) {
    const ship = SHIPS[clamp(profile.ship | 0, 0, SHIPS.length - 1)] || SHIPS[0];
    const u = profile.upgrades || {};
    const level = Math.max(1, profile.level | 0);

    const perks = ship.perks || {};
    const sk = profile.skills || {};
    return {
        ship,
        hpMax: Math.round(ship.hp + (u.hull | 0) * 480 + (level - 1) * 42),
        shieldMax: Math.round((ship.shield + (u.shield | 0) * 340 + (level - 1) * 32) * (1 + (sk.shield | 0) * 0.05)),
        speed: ship.speed + (u.generator | 0) * 13,
        cargoMax: Math.round((ship.cargo + (u.cargo | 0) * 260) * (1 + (sk.cargo | 0) * 0.08)),
        damageMult: (1 + (u.laser | 0) * 0.12 + (level - 1) * 0.025) * (1 + (sk.laser | 0) * 0.06),
        shieldRegen: (8 + (u.generator | 0) * 2.4) * (1 + (u.regen | 0) * 0.45),
        critChance: (u.critical | 0) * 0.04 + (perks.crit || 0),
        pickupRadius: PICKUP_RADIUS + (u.magnet | 0) * 28,
        evasion: perks.evasion || 0,
        rocketMult: perks.rocketDamage || 1,
        droneMult: (perks.droneDamage || 1) * (1 + (sk.drone | 0) * 0.08)
    };
}

export function refreshStats(state, profile, refill) {
    const stats = deriveStats(profile);
    const p = state.player;
    p.hpMax = stats.hpMax;
    p.shieldMax = stats.shieldMax;
    p.speed = stats.speed;
    p.cargoMax = stats.cargoMax;
    p.damageMult = stats.damageMult;
    p.shieldRegen = stats.shieldRegen;
    p.critChance = stats.critChance;
    p.pickupRadius = stats.pickupRadius;
    p.evasion = stats.evasion;
    p.rocketMult = stats.rocketMult;
    p.droneMult = stats.droneMult;
    p.ship = stats.ship;
    if (refill) {
        p.hp = stats.hpMax;
        p.shield = stats.shieldMax;
    } else {
        p.hp = Math.min(p.hp, stats.hpMax);
        p.shield = Math.min(p.shield, stats.shieldMax);
    }
    return stats;
}

/* ------------------------------------------------------------------ */
/* Position helpers                                                    */
/* ------------------------------------------------------------------ */

export function stationPos(state) {
    return { x: state.world.x / 2, y: state.world.y / 2 };
}

export function gatePos(state) {
    return { x: state.world.x / 2, y: 170 };
}

export function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getEnemy(state, id) {
    for (const e of state.enemies) {
        if (e.id === id && !e.dead) return e;
    }
    return null;
}

export function getTarget(state) {
    return state.player.targetId ? getEnemy(state, state.player.targetId) : null;
}

export function nearestEnemy(state, x, y, maxDist) {
    let best = null;
    let bestD = maxDist === undefined ? Infinity : maxDist;
    const point = { x, y };
    for (const e of state.enemies) {
        if (e.dead) continue;
        const d = distance(point, e);
        if (d < bestD) {
            bestD = d;
            best = e;
        }
    }
    return best;
}

/* ------------------------------------------------------------------ */
/* Creation                                                            */
/* ------------------------------------------------------------------ */

function emptyCargo() {
    const out = {};
    for (const id of RESOURCE_IDS) out[id] = 0;
    return out;
}

export function createState(profile, options = {}) {
    const mapIndex = clamp(
        options.mapIndex === undefined ? (profile.lastMap | 0) : options.mapIndex | 0,
        0, MAPS.length - 1
    );
    const map = MAPS[mapIndex];
    const stats = deriveStats(profile);
    const world = { x: map.world, y: map.world };
    const start = { x: world.x / 2, y: world.y / 2 };

    const state = {
        t: 0,
        mapIndex,
        map,
        world,
        mode: "sector",
        gate: null,
        bossPhaseTimer: 0,
        nextId: 1,
        player: {
            x: start.x, y: start.y, vx: 0, vy: 0,
            angle: -Math.PI / 2,
            radius: PLAYER_RADIUS,
            hp: stats.hpMax, hpMax: stats.hpMax,
            shield: stats.shieldMax, shieldMax: stats.shieldMax,
            speed: stats.speed, cargoMax: stats.cargoMax,
            damageMult: stats.damageMult, shieldRegen: stats.shieldRegen,
            critChance: stats.critChance, pickupRadius: stats.pickupRadius,
            evasion: stats.evasion, rocketMult: stats.rocketMult,
            droneMult: stats.droneMult,
            ship: stats.ship,
            firing: false,
            targetId: null,
            ammo: 0,
            ammoCd: AMMO.map(() => 0),
            abilityCd: { boost: 0, barrier: 0, repair: 0 },
            boost: 0,
            barrier: 0,
            boostPulse: 0,
            hurtFlash: 0,
            contactCd: 0,
            lastHit: -10,
            muzzle: 0
        },
        move: { x: 0, y: 0 },
        enemies: [],
        loot: [],
        boxes: [],
        pickups: [],
        bullets: [],
        enemyBullets: [],
        particles: [],
        drones: [],
        fx: { particles: MAX_PARTICLES, glow: true, shake: true, layers: true, text: true },
        pools: { bullets: [], enemyBullets: [], particles: [] },
        magnetTimer: 0,
        overdriveTimer: 0,
        safeNotice: 0,
        wasDocked: true,
        cargo: emptyCargo(),
        cargoUsed: 0,
        kills: 0,
        score: 0,
        creditsEarned: 0,
        events: [],
        spawnTimer: 1.2,
        boxTimer: 11,
        docked: true,
        atGate: false,
        destroyed: false,
        destroyedTimer: 0,
        bossSpawned: false,
        lowCargoNotified: false,
        timePlayed: 0
    };

    for (let i = 0; i < (profile.drones | 0); i++) {
        state.drones.push({
            id: state.nextId++,
            orbit: (i / Math.max(1, profile.drones | 0)) * TAU,
            x: start.x, y: start.y,
            angle: 0,
            fireCd: rand(0, DRONE_FIRE_CD)
        });
    }

    spawnInitial(state, profile);
    return state;
}

export function spawnInitial(state, profile) {
    const map = state.map;
    const count = Math.min(7, Math.max(4, Math.round(map.max * 0.4)));
    for (let i = 0; i < count; i++) spawnEnemy(state, map, pick(map.pool));
    if (map.boss) spawnBoss(state, map, map.boss);
}

function spawnBoss(state, map, defId) {
    const boss = makeEnemy(state, map, defId);
    boss.x = state.world.x / 2 + 420;
    boss.y = state.world.y - 380;
    anchorEnemy(boss);
    state.enemies.push(boss);
    state.bossSpawned = true;
    emit(state, "message", { text: "WARNING: " + boss.def.name + " detected" });
}

function makeEnemy(state, map, defId, forceElite) {
    const def = ENEMY_BY_ID[defId] || ENEMY_BY_ID.swarm;
    const hp = Math.round(def.hp * map.hpMul);
    const shield = Math.round(def.shield * map.hpMul);
    const e = {
        id: state.nextId++,
        defId: def.id,
        def,
        x: 0, y: 0, vx: 0, vy: 0,
        angle: 0,
        radius: def.radius,
        hp, hpMax: hp,
        shield, shieldMax: shield,
        fireCd: rand(0.4, def.fireCd + 0.4),
        contactCd: 0,
        hitFlash: 0,
        orbitDir: Math.random() < 0.5 ? -1 : 1,
        wander: rand(0, TAU),
        homeX: 0, homeY: 0,
        cloakCd: rand(3, 7),
        cloaked: false,
        cloakAlpha: 1,
        dotTime: 0,
        dotDps: 0,
        charge: 0,
        elite: null,
        phase2: false,
        dead: false
    };

    if (!def.boss) {
        const chance = forceElite || (state.mode === "gate"
            ? GATE_CONFIG.eliteChance
            : 0.05 + Math.max(0, map.hpMul - 1) * 0.02);
        if (Math.random() < chance) {
            const affix = pick(ELITES);
            e.elite = affix;
            e.hpMax = Math.round(e.hpMax * affix.hp);
            e.hp = e.hpMax;
            e.shieldMax = Math.round(e.shieldMax * affix.shield);
            e.shield = e.shieldMax;
            e.radius = Math.round(e.radius * 1.08);
        }
    }
    return e;
}

function anchorEnemy(e) {
    e.homeX = e.x;
    e.homeY = e.y;
}

export function spawnEnemy(state, map, defId) {
    const e = makeEnemy(state, map, defId);
    const p = state.player;
    const angle = rand(0, TAU);
    const dist = rand(720, 1180);
    e.x = clamp(p.x + Math.cos(angle) * dist, 70, state.world.x - 70);
    e.y = clamp(p.y + Math.sin(angle) * dist, 70, state.world.y - 70);
    anchorEnemy(e);
    state.enemies.push(e);
    return e;
}

/* ------------------------------------------------------------------ */
/* Events & particles                                                  */
/* ------------------------------------------------------------------ */

export function emit(state, type, data) {
    state.events.push(Object.assign({ type }, data || {}));
}

export function drainEvents(state) {
    const out = state.events;
    state.events = [];
    return out;
}

function burst(state, x, y, color, count, speed, size) {
    const cap = state.fx && state.fx.particles ? state.fx.particles : MAX_PARTICLES;
    for (let i = 0; i < count; i++) {
        let pt;
        if (state.particles.length >= cap) {
            pt = state.particles.shift();
        } else {
            pt = state.pools.particles.pop() || {};
        }
        const a = rand(0, TAU);
        const s = rand(speed * 0.3, speed);
        pt.x = x;
        pt.y = y;
        pt.vx = Math.cos(a) * s;
        pt.vy = Math.sin(a) * s;
        pt.life = rand(0.25, 0.7);
        pt.maxLife = 0.7;
        pt.size = rand(size * 0.5, size);
        pt.color = color;
        state.particles.push(pt);
    }
}

function release(state, kind, obj) {
    const pool = state.pools && state.pools[kind];
    if (!pool) return;
    if (pool.length < 240) pool.push(obj);
}

/* ------------------------------------------------------------------ */
/* Player actions                                                      */
/* ------------------------------------------------------------------ */

export function setMove(state, x, y) {
    state.move.x = clamp(x || 0, -1, 1);
    state.move.y = clamp(y || 0, -1, 1);
}

export function setFiring(state, on) {
    state.player.firing = !!on;
}

export function selectTargetAt(state, x, y, radius) {
    const found = nearestEnemy(state, x, y, radius === undefined ? 80 : radius);
    state.player.targetId = found ? found.id : null;
    return found;
}

export function cycleAmmo(state, direction) {
    const p = state.player;
    p.ammo = (p.ammo + (direction || 1) + AMMO.length) % AMMO.length;
    emit(state, "ammo", { index: p.ammo, name: AMMO[p.ammo].name });
    return p.ammo;
}

export function useAbility(state, id) {
    const p = state.player;
    const def = ABILITY_BY_ID[id];
    if (!def || p.abilityCd[id] > 0 || state.destroyed) return false;

    p.abilityCd[id] = def.cd;
    if (id === "boost") {
        p.boost = def.dur;
        p.boostPulse = def.dur;
    } else if (id === "barrier") {
        p.barrier = def.dur;
    } else if (id === "repair") {
        p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.35);
        p.shield = Math.min(p.shieldMax, p.shield + p.shieldMax * 0.5);
    }
    burst(state, p.x, p.y, def.color, 12, 150, 4);
    emit(state, "ability", { id, name: def.name });
    return true;
}

export function refreshDrones(state, profile) {
    const count = clamp(profile.drones | 0, 0, 4);
    const p = state.player;
    while (state.drones.length < count) {
        state.drones.push({
            id: state.nextId++,
            orbit: (state.drones.length / count) * TAU,
            x: p.x, y: p.y, angle: 0,
            fireCd: rand(0, DRONE_FIRE_CD)
        });
    }
    while (state.drones.length > count) state.drones.pop();
}

/* ------------------------------------------------------------------ */
/* Damage & rewards                                                    */
/* ------------------------------------------------------------------ */

function gainXp(state, profile, amount) {
    profile.xp += amount;
    let levels = 0;
    while (profile.xp >= xpForLevel(profile.level)) {
        profile.xp -= xpForLevel(profile.level);
        profile.level += 1;
        levels += 1;
    }
    if (levels > 0) {
        profile.urium += levels * 3;
        profile.skillPoints += levels;
        refreshStats(state, profile, true);
        emit(state, "levelup", { level: profile.level });
        emit(state, "message", {
            text: "LEVEL " + profile.level + " — ship repaired, +" + (levels * 3) + " urium, +" + levels + " skill point"
        });
    }
}

function damageEnemy(state, enemy, dmg, profile, allowCrit) {
    if (enemy.dead) return 0;
    let crit = false;
    if (allowCrit && state.player.critChance > 0 && Math.random() < state.player.critChance) {
        dmg *= 2;
        crit = true;
    }
    let rest = dmg;
    if (enemy.shield > 0) {
        const absorbed = Math.min(enemy.shield, rest);
        enemy.shield -= absorbed;
        rest -= absorbed;
        if (enemy.shield <= 0) emit(state, "shieldbreak", { x: enemy.x, y: enemy.y });
    }
    enemy.hp -= rest;
    enemy.hitFlash = 0.14;
    if (crit) emit(state, "crit", { x: enemy.x, y: enemy.y, dmg: Math.round(dmg) });

    if (enemy.def.boss && !enemy.phase2 && enemy.hp > 0 && enemy.hp <= enemy.hpMax * 0.5) {
        enemy.phase2 = true;
        state.bossPhaseTimer = 1.4;
        enemy.fireCd = 0;
        for (let i = 0; i < 3; i++) {
            const add = makeEnemy(state, state.map, state.mode === "gate" ? "raider" : "swarm");
            add.elite = null;
            const a = (i / 3) * TAU;
            add.x = enemy.x + Math.cos(a) * 110;
            add.y = enemy.y + Math.sin(a) * 110;
            anchorEnemy(add);
            state.enemies.push(add);
        }
        emit(state, "bossphase", { x: enemy.x, y: enemy.y, name: enemy.def.name });
    }

    if (enemy.hp <= 0) killEnemy(state, enemy, profile);
    return dmg;
}

function killEnemy(state, enemy, profile) {
    enemy.dead = true;
    const def = enemy.def;
    const map = state.map;
    const tier = def.tier || 1;

    // Ore crates.
    const units = randInt(1 + Math.floor(tier / 2), 2 + tier);
    const type = pick(map.loot);
    for (let i = 0; i < units; i++) {
        state.loot.push({
            id: state.nextId++,
            x: enemy.x + rand(-26, 26),
            y: enemy.y + rand(-26, 26),
            vx: rand(-22, 22), vy: rand(-22, 22),
            type,
            amount: 1,
            life: 24,
            spin: rand(0, TAU)
        });
    }

    // Chance to drop a box or a temporary field pickup.
    if (Math.random() < 0.05 + tier * 0.025 || def.boss) {
        spawnBox(state, def.boss ? "gold" : null);
    }
    if (Math.random() < 0.06 + tier * 0.015 || def.boss) {
        spawnPickup(state, pick(PICKUP_IDS), enemy.x + rand(-18, 18), enemy.y + rand(-18, 18));
    }

    const mult = enemy.elite ? enemy.elite.reward : 1;
    const credits = Math.round(randInt(def.credits[0], def.credits[1]) * mult);
    profile.credits += credits;
    state.creditsEarned += credits;
    state.kills += 1;
    if (def.boss) profile.bossKills = (profile.bossKills | 0) + 1;
    state.score += Math.round((100 * tier) * mult) + (def.boss ? 2500 : 0);
    gainXp(state, profile, Math.round(def.xp * map.xpMul * mult));
    if (state.mode === "gate" && state.gate) state.gate.kills += 1;

    if (enemy.elite && enemy.elite.id === "splitter") {
        for (let i = 0; i < 2; i++) {
            const spawn = makeEnemy(state, map, "swarm");
            spawn.elite = null;
            spawn.x = enemy.x + rand(-30, 30);
            spawn.y = enemy.y + rand(-30, 30);
            anchorEnemy(spawn);
            state.enemies.push(spawn);
        }
        emit(state, "split", { x: enemy.x, y: enemy.y });
    }

    burst(state, enemy.x, enemy.y, def.color, def.boss ? 34 : 14, def.boss ? 320 : 210, def.boss ? 7 : 4);
    emit(state, "kill", {
        x: enemy.x, y: enemy.y, boss: !!def.boss, name: def.name,
        elite: enemy.elite ? enemy.elite.name : null
    });
    if (def.boss) {
        emit(state, "message", { text: def.name + " destroyed — bonus crate dropped" });
        spawnBox(state, "obsidian");
    }
}

function damagePlayer(state, dmg) {
    const p = state.player;
    if (p.barrier > 0 || state.destroyed) return;

    p.lastHit = state.t;
    let rest = dmg;
    if (p.shield > 0) {
        const absorbed = Math.min(p.shield, rest);
        p.shield -= absorbed;
        rest -= absorbed;
        if (p.shield <= 0) emit(state, "shieldbreak", { x: p.x, y: p.y });
    }
    p.hp -= rest;
    p.hurtFlash = 0.3;
    emit(state, "hurt", { x: p.x, y: p.y, dmg: dmg });

    if (p.hp <= 0) {
        p.hp = 0;
        state.destroyed = true;
        state.destroyedTimer = 1.5;
        state.cargo = emptyCargo();
        state.cargoUsed = 0;
        state.player.firing = false;
        burst(state, p.x, p.y, "#ff4d6d", 40, 380, 8);
        emit(state, "destroyed", { x: p.x, y: p.y });
    }
}

/* ------------------------------------------------------------------ */
/* Boxes                                                               */
/* ------------------------------------------------------------------ */

function weightedBox() {
    const total = BOX_TYPES.reduce((sum, b) => sum + b.weight, 0);
    let roll = Math.random() * total;
    for (const b of BOX_TYPES) {
        roll -= b.weight;
        if (roll <= 0) return b;
    }
    return BOX_TYPES[0];
}

export function spawnBox(state, forcedId) {
    if (state.boxes.length >= 5) return null;
    const def = forcedId
        ? BOX_TYPES.find((b) => b.id === forcedId) || BOX_TYPES[0]
        : weightedBox();
    const p = state.player;
    const a = rand(0, TAU);
    const d = rand(360, 820);
    const box = {
        id: state.nextId++,
        def,
        x: clamp(p.x + Math.cos(a) * d, 60, state.world.x - 60),
        y: clamp(p.y + Math.sin(a) * d, 60, state.world.y - 60),
        vx: rand(-14, 14), vy: rand(-14, 14),
        life: 38,
        spin: rand(0, TAU)
    };
    state.boxes.push(box);
    return box;
}

function openBox(state, box, profile) {
    const def = box.def;
    const credits = randInt(def.credits[0], def.credits[1]);
    profile.credits += credits;
    state.creditsEarned += credits;
    state.score += 200;

    let urium = 0;
    if (Array.isArray(def.urium)) {
        urium = randInt(def.urium[0], def.urium[1]);
        profile.urium += urium;
    }

    const p = state.player;
    if (def.shield) p.shield = Math.min(p.shieldMax, p.shield + p.shieldMax * def.shield);
    if (def.pickup) spawnPickup(state, pick(PICKUP_IDS), box.x, box.y);

    burst(state, box.x, box.y, def.color, 16, 240, 5);
    emit(state, "box", { x: box.x, y: box.y, id: def.id, name: def.name, credits, urium });
    emit(state, "message", {
        text: def.name + ": +" + credits + " credits" + (urium ? ", +" + urium + " urium" : "")
    });
}

/* ------------------------------------------------------------------ */
/* Dock, repair, jump, respawn                                         */
/* ------------------------------------------------------------------ */

export function dock(state, profile) {
    if (!state.docked || state.destroyed) return null;
    let total = 0;
    let units = 0;
    for (const id of RESOURCE_IDS) {
        const amount = state.cargo[id] | 0;
        if (!amount) continue;
        total += amount * RESOURCES[id].price;
        units += amount;
        state.cargo[id] = 0;
    }
    if (!units) {
        emit(state, "message", { text: "Cargo hold is empty" });
        return null;
    }
    profile.credits += total;
    profile.totalSales = (profile.totalSales | 0) + total;
    profile.bestSale = Math.max(profile.bestSale | 0, total);
    state.creditsEarned += total;
    state.cargoUsed = 0;
    state.lowCargoNotified = false;
    state.score += units * 5;
    gainXp(state, profile, Math.max(4, Math.round(units * 1.5)));
    emit(state, "dock", { credits: total, units });
    emit(state, "message", { text: "Cargo sold: +" + total + " credits" });
    return { credits: total, units };
}

export function repairAtStation(state, profile) {
    if (!state.docked || state.destroyed) return false;
    const p = state.player;
    const missing = (p.hpMax - p.hp) + (p.shieldMax - p.shield);
    if (missing < 1) {
        emit(state, "message", { text: "Ship already at full status" });
        return false;
    }
    const cost = Math.max(120, Math.round(missing * 0.22));
    if (profile.credits < cost) {
        emit(state, "message", { text: "Need " + cost + " credits to repair" });
        return false;
    }
    profile.credits -= cost;
    p.hp = p.hpMax;
    p.shield = p.shieldMax;
    emit(state, "repair", { cost });
    emit(state, "message", { text: "Ship repaired for " + cost + " credits" });
    return true;
}

export function jumpGate(state, profile) {
    if (!state.atGate || state.destroyed) return false;
    const nextIndex = state.mapIndex + 1;
    const next = MAPS[nextIndex];
    if (!next) return false;
    if (profile.level < next.level) {
        emit(state, "message", { text: "Requires level " + next.level + " to jump" });
        return false;
    }

    state.mapIndex = nextIndex;
    state.map = next;
    state.world = { x: next.world, y: next.world };
    profile.lastMap = nextIndex;

    const start = stationPos(state);
    Object.assign(state.player, {
        x: start.x, y: start.y, vx: 0, vy: 0,
        hp: state.player.hpMax, shield: state.player.shieldMax,
        targetId: null, firing: false, boost: 0, barrier: 0
    });
    state.enemies = [];
    state.loot = [];
    state.boxes = [];
    state.pickups = [];
    for (const b of state.bullets) release(state, "bullets", b);
    for (const b of state.enemyBullets) release(state, "enemyBullets", b);
    state.bullets = [];
    state.enemyBullets = [];
    state.drones.forEach((d) => { d.x = start.x; d.y = start.y; });
    state.spawnTimer = 1;
    state.boxTimer = 9;
    state.magnetTimer = 0;
    state.overdriveTimer = 0;
    state.bossSpawned = false;
    state.docked = true;
    state.wasDocked = true;
    state.atGate = false;
    state.cargo = emptyCargo();
    state.cargoUsed = 0;

    spawnInitial(state, profile);
    emit(state, "jump", { map: next.name });
    emit(state, "message", { text: "Jumped to " + next.name });
    return true;
}

export function respawn(state, profile) {
    const start = stationPos(state);
    state.destroyed = false;
    state.destroyedTimer = 0;
    Object.assign(state.player, {
        x: start.x, y: start.y, vx: 0, vy: 0,
        hp: state.player.hpMax, shield: state.player.shieldMax,
        hurtFlash: 0, targetId: null, firing: false,
        boost: 0, barrier: 0, lastHit: state.t
    });
    for (const b of state.bullets) release(state, "bullets", b);
    for (const b of state.enemyBullets) release(state, "enemyBullets", b);
    state.bullets = [];
    state.enemyBullets = [];
    state.pickups = [];
    state.magnetTimer = 0;
    state.overdriveTimer = 0;
    state.docked = true;
    state.wasDocked = true;
    state.enemies = state.enemies.filter((e) => distance(e, start) > 620);
    refreshDrones(state, profile);
    emit(state, "message", { text: "Respawned at station — cargo lost" });
}

/* ------------------------------------------------------------------ */
/* Galaxy Gate arena                                                   */
/* ------------------------------------------------------------------ */

export function launchGate(state, profile) {
    if (state.mode === "gate" || state.destroyed || !state.docked) return false;
    state.mode = "gate";
    state.gate = {
        wave: 1,
        kills: 0,
        target: GATE_CONFIG.waves[0],
        timeLeft: GATE_CONFIG.duration,
        bossSpawned: false,
        done: false
    };

    for (const b of state.bullets) release(state, "bullets", b);
    for (const b of state.enemyBullets) release(state, "enemyBullets", b);
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.loot = [];
    state.boxes = [];
    state.pickups = [];

    const start = stationPos(state);
    Object.assign(state.player, {
        x: start.x, y: start.y, vx: 0, vy: 0,
        hp: state.player.hpMax, shield: state.player.shieldMax,
        targetId: null, firing: false, boost: 0, barrier: 0
    });
    state.docked = false;
    state.wasDocked = false;
    state.atGate = false;

    spawnGateWave(state);
    emit(state, "message", { text: "GATE OPEN — 3 waves, " + GATE_CONFIG.duration + " seconds" });
    return true;
}

function spawnGateWave(state) {
    const g = state.gate;
    if (!g) return;
    const count = GATE_CONFIG.waves[g.wave - 1] || GATE_CONFIG.waves[0];
    const pool = state.map.pool.filter((id) => !ENEMY_BY_ID[id].boss);
    const p = state.player;

    for (let i = 0; i < count; i++) {
        const boss = g.wave === GATE_CONFIG.bossWave && i === 0;
        const id = boss
            ? (state.map.boss || (state.mapIndex >= 3 ? "devourer" : "leviathan"))
            : pick(pool.length ? pool : ["swarm"]);
        const e = makeEnemy(state, state.map, id);
        const a = (i / count) * TAU + rand(-0.2, 0.2);
        const d = rand(420, 700);
        e.x = clamp(p.x + Math.cos(a) * d, 60, state.world.x - 60);
        e.y = clamp(p.y + Math.sin(a) * d, 60, state.world.y - 60);
        anchorEnemy(e);
        state.enemies.push(e);
        if (boss) g.bossSpawned = true;
    }
    g.target = count;
    g.kills = 0;
    emit(state, "wave", { wave: g.wave, count });
}

export function updateGate(state, profile, dt) {
    if (state.mode !== "gate" || !state.gate) return;
    const g = state.gate;
    g.timeLeft = Math.max(0, g.timeLeft - dt);
    if (g.timeLeft <= 0) {
        finishGate(state, profile, false);
        return;
    }
    if (g.kills >= g.target) {
        if (g.wave < GATE_CONFIG.waves.length) {
            g.wave += 1;
            spawnGateWave(state);
        } else {
            finishGate(state, profile, true);
        }
    }
}

function finishGate(state, profile, success) {
    const g = state.gate;
    let reward = { credits: 0, urium: 0 };
    if (success) {
        reward = {
            credits: randInt(GATE_CONFIG.reward.credits[0], GATE_CONFIG.reward.credits[1]),
            urium: randInt(GATE_CONFIG.reward.urium[0], GATE_CONFIG.reward.urium[1])
        };
        profile.credits += reward.credits;
        profile.urium += reward.urium;
        state.score += 4000;
    }

    state.mode = "sector";
    state.gate = null;
    state.enemies = [];
    state.loot = [];
    state.boxes = [];
    state.pickups = [];
    const start = stationPos(state);
    Object.assign(state.player, {
        x: start.x, y: start.y, vx: 0, vy: 0,
        hp: state.player.hpMax, shield: state.player.shieldMax,
        targetId: null, firing: false
    });
    state.docked = true;
    state.wasDocked = true;
    state.spawnTimer = 1.5;
    state.boxTimer = 12;

    if (success) {
        const chest = spawnBox(state, "astral");
        if (chest) {
            chest.x = start.x + 90;
            chest.y = start.y;
        }
        emit(state, "gatecomplete", reward);
    } else {
        emit(state, "gatefail", { wave: g ? g.wave : 1 });
    }
    spawnInitial(state, profile);
}

/* ------------------------------------------------------------------ */
/* Projectiles                                                         */
/* ------------------------------------------------------------------ */

function firePlayerBullet(state, target, ammo, fromDrone, rocketMult) {
    const p = state.player;
    const angle = Math.atan2(target.y - p.y, target.x - p.x);
    const speed = ammo.speed;
    const mult = ammo.splash ? (rocketMult || 1) : 1;
    const b = state.pools.bullets.pop() || {};
    b.x = p.x + Math.cos(angle) * 22;
    b.y = p.y + Math.sin(angle) * 22;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.speed = speed;
    b.dmg = ammo.dmg * p.damageMult * mult * (fromDrone ? 0.55 : 1);
    b.color = ammo.color;
    b.radius = fromDrone ? 2.5 : ammo.radius;
    b.life = 1.35;
    b.targetId = target.id;
    b.drone = !!fromDrone;
    b.splash = !!ammo.splash;
    b.dot = !!ammo.dot;
    b.ammoId = ammo.id;
    state.bullets.push(b);
}

function fireEnemyBullet(state, enemy) {
    const p = state.player;
    const base = Math.atan2(p.y - enemy.y, p.x - enemy.x);
    const spread = enemy.def.spread || 1;
    const speed = 300 + (enemy.def.tier || 1) * 26;
    const dmg = enemy.def.damage * state.map.dmgMul;

    for (let i = 0; i < spread; i++) {
        if (state.enemyBullets.length >= MAX_ENEMY_BULLETS) break;
        const a = base + (i - (spread - 1) / 2) * 0.19;
        const b = state.pools.enemyBullets.pop() || {};
        b.x = enemy.x + Math.cos(a) * (enemy.radius + 6);
        b.y = enemy.y + Math.sin(a) * (enemy.radius + 6);
        b.vx = Math.cos(a) * speed;
        b.vy = Math.sin(a) * speed;
        b.dmg = dmg;
        b.color = enemy.def.color;
        b.radius = enemy.def.boss ? 7 : 5;
        b.life = 3.4;
        state.enemyBullets.push(b);
    }
    emit(state, "enemyshoot", { x: enemy.x, y: enemy.y });
}

/* ------------------------------------------------------------------ */
/* Main step                                                           */
/* ------------------------------------------------------------------ */

export function step(state, profile, input, dt) {
    dt = clamp(dt, 0, 0.05);
    if (state.destroyed) {
        state.destroyedTimer -= dt;
        updateParticles(state, dt);
        return;
    }

    state.t += dt;
    state.timePlayed += dt;
    const p = state.player;
    const map = state.map;

    // Zone presence is computed FIRST so enemy AI sees the current safe zone.
    const station = stationPos(state);
    const gate = gatePos(state);
    state.docked = state.mode !== "gate" && distance(p, station) < DOCK_RADIUS;
    state.atGate = state.mode !== "gate" && map.gateTo >= 0 && distance(p, gate) < GATE_RADIUS;
    if (state.docked !== state.wasDocked && state.mode !== "gate") {
        state.wasDocked = state.docked;
        emit(state, state.docked ? "safeenter" : "safeleave", {});
    }

    // Cooldowns & transient effects.
    for (let i = 0; i < p.ammoCd.length; i++) p.ammoCd[i] = Math.max(0, p.ammoCd[i] - dt);
    for (const id of Object.keys(p.abilityCd)) p.abilityCd[id] = Math.max(0, p.abilityCd[id] - dt);
    p.boost = Math.max(0, p.boost - dt);
    p.boostPulse = Math.max(0, p.boostPulse - dt);
    p.barrier = Math.max(0, p.barrier - dt);
    p.hurtFlash = Math.max(0, p.hurtFlash - dt);
    p.contactCd = Math.max(0, p.contactCd - dt);
    p.muzzle = Math.max(0, p.muzzle - dt);
    state.magnetTimer = Math.max(0, state.magnetTimer - dt);
    state.overdriveTimer = Math.max(0, state.overdriveTimer - dt);
    state.safeNotice = Math.max(0, state.safeNotice - dt);
    state.bossPhaseTimer = Math.max(0, (state.bossPhaseTimer || 0) - dt);

    // Movement.
    let mx = input && input.move ? input.move.x : 0;
    let my = input && input.move ? input.move.y : 0;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }
    const speed = p.speed * (p.boost > 0 ? 1.55 : 1);
    p.vx = mx * speed;
    p.vy = my * speed;
    p.x = clamp(p.x + p.vx * dt, 30, state.world.x - 30);
    p.y = clamp(p.y + p.vy * dt, 30, state.world.y - 30);
    if (mag > 0.05) p.angle = Math.atan2(my, mx);

    // Docked shields regenerate immediately and much faster (safe haven).
    const regenMult = state.docked ? DOCKED_SHIELD_REGEN_MULT : 1;
    if ((state.docked || state.t - p.lastHit > 3.5) && p.shield < p.shieldMax) {
        p.shield = Math.min(p.shieldMax, p.shield + p.shieldRegen * regenMult * dt);
    }

    // Firing: keep a valid target and fire the selected ammo when ready.
    // Weapons are locked inside the station so it cannot be used as a free kill zone.
    const ammo = AMMO[p.ammo];
    let target = getTarget(state);
    if (target && (distance(p, target) > TARGET_RANGE * 1.15)) {
        p.targetId = null;
        target = null;
    }
    if (!target) {
        target = nearestEnemy(state, p.x, p.y, TARGET_RANGE);
        if (target) p.targetId = target.id;
    }
    if (input && input.firing && state.docked && state.safeNotice <= 0) {
        state.safeNotice = 3;
        emit(state, "message", { text: "Safe zone — weapons locked" });
    }
    if (input && input.firing && !state.docked && p.ammoCd[p.ammo] <= 0 && target) {
        firePlayerBullet(state, target, ammo, false, p.rocketMult);
        p.ammoCd[p.ammo] = ammo.cd * (state.overdriveTimer > 0 ? OVERDRIVE_FIRE_MULT : 1);
        p.muzzle = 0.08;
        emit(state, "shoot", { ammo: ammo.id });
    }

    updateEnemies(state, dt, profile);
    updateBullets(state, dt, profile);
    updateEnemyBullets(state, dt);
    updateDrones(state, dt, state.docked ? null : getTarget(state));
    updateLoot(state, dt, profile);
    updateBoxes(state, dt, profile);
    updatePickups(state, dt, profile);
    updateParticles(state, dt);

    if (state.mode === "gate") {
        updateGate(state, profile, dt);
    } else {
        // Ambient sector spawns.
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
            if (state.enemies.length < map.max) spawnEnemy(state, map, pick(map.pool));
            state.spawnTimer = map.interval * rand(0.8, 1.3);
        }
        state.boxTimer -= dt;
        if (state.boxTimer <= 0) {
            spawnBox(state);
            state.boxTimer = rand(12, 21);
        }
    }

    if (state.cargoUsed >= p.cargoMax && !state.lowCargoNotified) {
        state.lowCargoNotified = true;
        emit(state, "message", { text: "Cargo full — return to the station to sell" });
    }
}

function updateEnemies(state, dt, profile) {
    const p = state.player;
    const station = stationPos(state);
    const safe = state.docked;

    for (const e of state.enemies) {
        if (e.dead) continue;
        e.fireCd -= dt;
        e.contactCd -= dt;
        e.hitFlash = Math.max(0, e.hitFlash - dt);
        e.wander += dt * 0.7;

        // Phase Phantom cloak cycle.
        if (e.def.cloak) {
            e.cloakCd -= dt;
            if (e.cloakCd <= 0) {
                e.cloaked = !e.cloaked;
                e.cloakCd = e.cloaked ? rand(2.6, 4.2) : rand(3.5, 6);
                emit(state, "cloak", { x: e.x, y: e.y, cloaked: e.cloaked });
            }
        }
        const targetAlpha = e.cloaked ? 0.32 : 1;
        e.cloakAlpha += (targetAlpha - e.cloakAlpha) * Math.min(1, dt * 6);

        // Infection damage-over-time.
        if (e.dotTime > 0) {
            e.dotTime -= dt;
            let rest = e.dotDps * dt;
            if (e.shield > 0) {
                const absorbed = Math.min(e.shield, rest);
                e.shield -= absorbed;
                rest -= absorbed;
            }
            e.hp -= rest;
            if (e.hp <= 0) {
                killEnemy(state, e, profile);
                continue;
            }
        }

        // Regenerator elites slowly repair themselves.
        if (e.elite && e.elite.regen) {
            e.hp = Math.min(e.hpMax, e.hp + e.hpMax * e.elite.regen * dt);
            e.shield = Math.min(e.shieldMax, e.shield + e.shieldMax * e.elite.regen * dt);
        }

        const d = distance(e, p);
        const preferred = e.def.boss ? 320 : 215;

        if (safe) {
            // SAFE HAVEN: ignore the pilot completely. Drift around a home
            // point and give the station ring a wide berth.
            const ds = distance(e, station);
            let angle;
            if (ds < SAFE_STANDOFF) {
                angle = ds > 12
                    ? Math.atan2(e.y - station.y, e.x - station.x)
                    : e.wander;
            } else {
                const hx = e.homeX - e.x;
                const hy = e.homeY - e.y;
                angle = Math.hypot(hx, hy) > 170
                    ? Math.atan2(hy, hx)
                    : e.wander + (Math.PI / 2) * e.orbitDir;
            }
            e.angle = angle;
            const es = e.def.speed * 0.55;
            e.x += Math.cos(angle) * es * dt;
            e.y += Math.sin(angle) * es * dt;
            e.charge = 0;
        } else if (d < 1350) {
            let angle;
            if (d > preferred) {
                angle = Math.atan2(p.y - e.y, p.x - e.x);
            } else if (d < preferred * 0.62) {
                angle = Math.atan2(e.y - p.y, e.x - p.x);
            } else {
                angle = Math.atan2(p.y - e.y, p.x - e.x) + (Math.PI / 2) * e.orbitDir;
            }
            const wobble = Math.sin(e.wander) * 0.28;
            angle += wobble;
            e.angle = angle;
            const es = e.def.speed * (e.cloaked ? 1.1 : 1) * (e.elite ? e.elite.speed : 1) * (e.phase2 ? 1.2 : 1);
            e.x += Math.cos(angle) * es * dt;
            e.y += Math.sin(angle) * es * dt;

            e.charge = (d < e.def.range && e.fireCd > 0 && e.fireCd < 0.45)
                ? 1 - e.fireCd / 0.45 : 0;

            if (e.fireCd <= 0 && d < e.def.range) {
                fireEnemyBullet(state, e);
                e.fireCd = e.def.fireCd * (e.cloaked ? 1.7 : 1) *
                    (e.elite ? e.elite.fire : 1) * (e.phase2 ? 0.62 : 1) * rand(0.85, 1.2);
            }
            if (d < p.radius + e.radius + 2 && e.contactCd <= 0) {
                if (Math.random() >= p.evasion) {
                    damagePlayer(state, e.def.damage * state.map.dmgMul * 0.7);
                } else {
                    emit(state, "evade", { x: p.x, y: p.y });
                }
                e.contactCd = 1.1;
            }
        } else {
            e.angle = e.wander;
            e.x += Math.cos(e.wander) * e.def.speed * 0.3 * dt;
            e.y += Math.sin(e.wander) * e.def.speed * 0.3 * dt;
            e.charge = 0;
        }

        e.x = clamp(e.x, 24, state.world.x - 24);
        e.y = clamp(e.y, 24, state.world.y - 24);
    }

    const before = state.enemies.length;
    state.enemies = state.enemies.filter((e) => !e.dead);
    if (state.enemies.length !== before && state.player.targetId) {
        if (!getEnemy(state, state.player.targetId)) state.player.targetId = null;
    }
}

function updateBullets(state, dt, profile) {
    const kept = [];
    for (const b of state.bullets) {
        b.life -= dt;
        if (b.life <= 0) { release(state, "bullets", b); continue; }

        // Light homing keeps fast mobile play satisfying; cloaked/evasive
        // targets are harder for the guidance to track.
        if (b.targetId) {
            const target = getEnemy(state, b.targetId);
            if (target) {
                const desired = Math.atan2(target.y - b.y, target.x - b.x);
                const current = Math.atan2(b.vy, b.vx);
                let diff = desired - current;
                while (diff > Math.PI) diff -= TAU;
                while (diff < -Math.PI) diff += TAU;
                const tracking = target.cloaked ? 1.6 : 5.5;
                const turn = clamp(diff, -tracking * dt, tracking * dt);
                const angle = current + turn;
                b.vx = Math.cos(angle) * b.speed;
                b.vy = Math.sin(angle) * b.speed;
            }
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        let hit = false;
        for (const e of state.enemies) {
            if (e.dead) continue;
            if (distance(b, e) < e.radius + b.radius + 2) {
                if (e.def.evade && Math.random() < e.def.evade) {
                    emit(state, "evade", { x: e.x, y: e.y });
                    release(state, "bullets", b);
                    hit = true;
                    break;
                }
                const dealt = damageEnemy(state, e, b.dmg, profile, !b.drone);
                burst(state, b.x, b.y, b.color, b.drone ? 2 : 4, 120, 2.5);
                emit(state, "hit", { x: b.x, y: b.y, dmg: Math.round(dealt), color: b.color });

                if (b.splash) {
                    emit(state, "splash", { x: b.x, y: b.y, color: b.color });
                    for (const other of state.enemies) {
                        if (other === e || other.dead) continue;
                        if (distance(b, other) < SPLASH_RADIUS + other.radius) {
                            damageEnemy(state, other, b.dmg * 0.6, profile, false);
                        }
                    }
                }
                if (b.dot && !e.dead) {
                    e.dotTime = DOT_DURATION;
                    e.dotDps = b.dmg * 0.16;
                    emit(state, "infect", { x: e.x, y: e.y });
                }
                release(state, "bullets", b);
                hit = true;
                break;
            }
        }
        if (!hit) kept.push(b);
    }
    state.bullets = kept;
}

function updateEnemyBullets(state, dt) {
    const p = state.player;
    const station = stationPos(state);
    const kept = [];
    for (const b of state.enemyBullets) {
        b.life -= dt;
        if (b.life <= 0) { release(state, "enemyBullets", b); continue; }
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // Hostile fire dissipates against the station's shield bubble.
        if (distance(b, station) < DOCK_RADIUS) {
            burst(state, b.x, b.y, "#8affc1", 5, 90, 2.5);
            emit(state, "bulletblock", { x: b.x, y: b.y });
            release(state, "enemyBullets", b);
            continue;
        }

        if (distance(b, p) < p.radius + b.radius) {
            if (state.docked || Math.random() < p.evasion) {
                emit(state, "evade", { x: p.x, y: p.y });
            } else {
                damagePlayer(state, b.dmg);
            }
            release(state, "enemyBullets", b);
            continue;
        }
        kept.push(b);
    }
    state.enemyBullets = kept;
}

function updateDrones(state, dt, lockedTarget) {
    const p = state.player;
    const ammo = AMMO[Math.min(AMMO.length - 1, p.ammo + 1)];
    for (const d of state.drones) {
        d.orbit += dt * 1.5;
        const radius = 60 + (d.id % 3) * 9;
        d.x = p.x + Math.cos(d.orbit) * radius;
        d.y = p.y + Math.sin(d.orbit) * radius;
        d.angle = d.orbit + Math.PI / 2;

        // Drones stand down in the safe haven along with the pilot.
        let target = lockedTarget === undefined ? getTarget(state) : lockedTarget;
        if (target && distance(target, d) > 480) target = null;
        if (!target && lockedTarget !== null) {
            target = nearestEnemy(state, d.x, d.y, 420);
        }
        if (target) {
            d.angle = Math.atan2(target.y - d.y, target.x - d.x);
            d.fireCd -= dt;
            if (d.fireCd <= 0) {
                firePlayerBulletFrom(d, target, ammo, state);
                d.fireCd = DRONE_FIRE_CD;
            }
        }
    }
}

function firePlayerBulletFrom(d, target, ammo, state) {
    const p = state.player;
    const angle = Math.atan2(target.y - d.y, target.x - d.x);
    const b = state.pools.bullets.pop() || {};
    b.x = d.x + Math.cos(angle) * 10;
    b.y = d.y + Math.sin(angle) * 10;
    b.vx = Math.cos(angle) * ammo.speed;
    b.vy = Math.sin(angle) * ammo.speed;
    b.speed = ammo.speed;
    b.dmg = DRONE_DAMAGE * p.damageMult * p.droneMult;
    b.color = "#b8f7ff";
    b.radius = 2.5;
    b.life = 1.1;
    b.targetId = target.id;
    b.drone = true;
    b.splash = false;
    b.dot = false;
    b.ammoId = ammo.id;
    state.bullets.push(b);
}

function updateLoot(state, dt, profile) {
    const p = state.player;
    const kept = [];
    for (const item of state.loot) {
        item.life -= dt;
        if (item.life <= 0) continue;
        item.vx *= 0.96;
        item.vy *= 0.96;

        const d = distance(item, p);
        if (state.magnetTimer > 0 && d < MAGNET_RADIUS && d > 1) {
            const pull = 420 * (1 - d / MAGNET_RADIUS) + 90;
            item.vx += ((p.x - item.x) / d) * pull * dt;
            item.vy += ((p.y - item.y) / d) * pull * dt;
        }
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        item.spin += dt * 2;

        if (distance(item, p) < p.pickupRadius) {
            const space = p.cargoMax - state.cargoUsed;
            if (space > 0) {
                const added = Math.min(space, item.amount);
                state.cargo[item.type] += added;
                state.cargoUsed += added;
                emit(state, "pickup", { type: item.type, amount: added });
                continue;
            }
        }
        kept.push(item);
    }
    state.loot = kept;
}

function updateBoxes(state, dt, profile) {
    const p = state.player;
    const kept = [];
    for (const box of state.boxes) {
        box.life -= dt;
        if (box.life <= 0) continue;
        box.vx *= 0.985;
        box.vy *= 0.985;
        box.x = clamp(box.x + box.vx * dt, 40, state.world.x - 40);
        box.y = clamp(box.y + box.vy * dt, 40, state.world.y - 40);
        box.spin += dt * 1.2;
        if (distance(box, p) < p.pickupRadius + 8) {
            openBox(state, box, profile);
            continue;
        }
        kept.push(box);
    }
    state.boxes = kept;
}

export function spawnPickup(state, kind, x, y) {
    const def = PICKUPS[kind];
    if (!def) return null;
    if (state.pickups.length >= 10) state.pickups.shift();
    const pickup = {
        id: state.nextId++,
        kind,
        def,
        x: x === undefined ? state.player.x + rand(-120, 120) : x,
        y: y === undefined ? state.player.y + rand(-120, 120) : y,
        vx: rand(-20, 20), vy: rand(-20, 20),
        life: 26,
        spin: rand(0, TAU)
    };
    state.pickups.push(pickup);
    return pickup;
}

function updatePickups(state, dt, profile) {
    const p = state.player;
    const kept = [];
    for (const item of state.pickups) {
        item.life -= dt;
        if (item.life <= 0) continue;
        item.vx *= 0.95;
        item.vy *= 0.95;
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        item.spin += dt * 2.4;

        if (distance(item, p) < p.pickupRadius + 10) {
            const def = item.def;
            if (item.kind === "repair") {
                p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.25);
            } else if (item.kind === "magnet") {
                state.magnetTimer = Math.max(state.magnetTimer, def.duration);
            } else if (item.kind === "overdrive") {
                state.overdriveTimer = Math.max(state.overdriveTimer, def.duration);
            }
            burst(state, item.x, item.y, def.color, 12, 150, 4);
            emit(state, "pickup-effect", { kind: item.kind, name: def.name });
            emit(state, "message", { text: def.name + " collected" });
            continue;
        }
        kept.push(item);
    }
    state.pickups = kept;
}

function updateParticles(state, dt) {
    const kept = [];
    for (const pt of state.particles) {
        pt.life -= dt;
        if (pt.life <= 0) { release(state, "particles", pt); continue; }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= 0.94;
        pt.vy *= 0.94;
        kept.push(pt);
    }
    state.particles = kept;
}

/* ------------------------------------------------------------------ */
/* Hangar helpers (kept here so tests can exercise costs in one place) */
/* ------------------------------------------------------------------ */

export function buyUpgrade(profile, id) {
    const def = UPGRADE_BY_ID[id];
    if (!def) return false;
    const level = profile.upgrades[id] | 0;
    if (level >= def.max) return false;
    const cost = Math.round((def.base * Math.pow(def.scale, level)) / 100) * 100;
    if (profile.credits < cost) return false;
    profile.credits -= cost;
    profile.upgrades[id] = level + 1;
    return true;
}

export function buyShip(profile, index) {
    const ship = SHIPS[index];
    if (!ship || profile.ownedShips.includes(index)) return false;
    if (profile.level < ship.level) return false;
    if (profile.credits < ship.price || profile.urium < ship.urium) return false;
    profile.credits -= ship.price;
    profile.urium -= ship.urium;
    profile.ownedShips.push(index);
    profile.ship = index;
    return true;
}

export function buySkill(profile, id) {
    const def = SKILL_BY_ID[id];
    if (!def || profile.skillPoints <= 0) return false;
    const level = profile.skills[id] | 0;
    if (level >= def.max) return false;
    profile.skillPoints -= 1;
    profile.skills[id] = level + 1;
    return true;
}

export function selectShip(profile, index) {
    if (!profile.ownedShips.includes(index)) return false;
    profile.ship = index;
    return true;
}
