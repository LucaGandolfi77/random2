/*
 * SECTOR 7 headless simulation test.
 *
 *   node sector7-pwa/tests/sim.test.js
 *
 * Runs the real world / npc / station modules with no browser, no canvas and
 * no build step. Deterministic unit checks first, then a behavioural suite
 * aggregated over several fixed seeds - single-seed thresholds were hopelessly
 * flaky (one run reported 90% NPC deaths, the next 40%).
 *
 * render.js is deliberately NOT loaded: it needs a canvas. Anything the sim
 * calls into is either guarded in the source (S.shake, particle quality) or
 * stubbed here (S.Audio).
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const SEED_KEY = "sector7.v1.seed";
const SHIP_KEY = "sector7.v1.ship";
const STATS_KEY = "sector7.v1.stats";
const SEEDS = [1337, 90210, 2468013, 555001, 7777777, 31337, 424242, 8675309];

/* ---------- minimal browser stubs ---------- */
global.window = global;
const store = new Map();
global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};
Object.defineProperty(globalThis, "navigator", {
    value: { vibrate() {} },
    configurable: true,
    writable: true,
});

for (const f of ["config.js", "storage.js", "sectors.js", "world.js", "stations.js",
    "contracts.js", "bounty.js", "npcs.js"]) {
    (0, eval)(fs.readFileSync(path.join(SRC, f), "utf8"));
}

const S = global.S7;
const W = S.World.world;
const C = S.CONFIG;
const DT = 1 / 60;

/* Audio is the only system the sim touches that would otherwise reach for a
 * WebAudio context. Counted, not faked silently. */
const audioCalls = { throttle: 0 };
S.Audio = {
    setThrottle() { audioCalls.throttle++; },
    shoot() {}, hit() {}, kill() {}, rockBreak() {}, pickup() {},
    death() {}, respawn() {}, dock() {}, undock() {}, upgrade() {},
    error() {}, ui() {}, init() {}, resume() {}, setEnabled() {},
};

let failures = 0;
let checks = 0;
function check(label, cond, extra) {
    checks++;
    if (cond) {
        console.log("  PASS  " + label);
    } else {
        failures++;
        console.log("  FAIL  " + label + (extra !== undefined ? "  -> " + extra : ""));
    }
}
function section(t) { console.log("\n=== " + t + " ==="); }
function useSeed(seed) {
    store.set(SEED_KEY, JSON.stringify(seed));
    store.delete(SHIP_KEY);
    store.delete(STATS_KEY);
}

function finite(n) { return typeof n === "number" && Number.isFinite(n); }
function allFiniteShip(s) {
    return finite(s.x) && finite(s.y) && finite(s.z) &&
        finite(s.vx) && finite(s.vy) && finite(s.heading) && finite(s.hull);
}

function newRun(seed) {
    useSeed(seed);
    S.World.generate(seed);
    S.NPCs.clear();
    S.NPCs.resetRng(seed);
}

/* The player's ship, built the same way player.js builds it. */
function makePlayer(seed) {
    const save = S.Storage.getShip();
    save.energy = 400;
    save.crystals = 0;
    const stats = S.statsFor(save.modules);
    const ship = S.World.spawnShip({
        isPlayer: true,
        name: "TEST",
        maxHull: stats.maxHull,
        stats,
        reduction: stats.reduction,
        radius: 16,
        energy: save.energy,
        z: 12,
    });
    ship.modules = save.modules;
    ship.crystals = save.crystals;
    /* Launch exactly where player.js launches: a lane outside the station's
     * clear radius. Anything else and the player would start inside a rock
     * field or in a spot the game never actually produces. */
    const lp = S.World.launchPoint();
    ship.x = lp.x;
    ship.y = lp.y;
    ship.heading = lp.heading;
    ship.aim = lp.heading;
    W.player = ship;
    return ship;
}

/* One tick of main.js stepSim. The player flies a lazy pursuit of whatever
 * is closest - the crudest possible stand-in for a human, but unlike a
 * scripted circle it actually meets the NPCs and exercises the guns.
 * Returns the events it saw, so callers can assert on them before the queue
 * is drained (main.js drains it every frame too). */
function step(dt, player, control) {
    const c = control || { fire: true, seek: true };
    if (player && player.alive) {
        if (c.seek) {
            const prey = S.World.nearestShip(player.x, player.y, player, 1e6, (s) => !s.isPlayer);
            if (prey) {
                const a = Math.atan2(prey.y - player.y, prey.x - player.x);
                player.heading = a;
                player.throttle = c.throttle === undefined ? 1 : c.throttle;
                player.aim = a;
            } else {
                const t = player.heading + 0.4 * dt * 60;
                player.heading = t;
                player.throttle = 0.6;
                player.aim = t;
            }
        } else if (c.mx !== undefined) {
            player.heading = Math.atan2(c.my, c.mx);
            player.throttle = Math.hypot(c.mx, c.my);
            player.aim = player.heading;
        }
        if (c.fire && player.cooldown <= 0) S.World.fire(player, player.aim);
    }
    S.NPCs.think(dt);
    S.NPCs.update(dt);
    for (const s of W.ships) S.World.moveShip(s, dt);
    S.World.step(dt);

    const seen = W.events.slice();
    W.events.length = 0;
    return seen;
}

/* =========================================================================
 * 1. Determinism
 * ====================================================================== */
section("determinism");
{
    const fingerprint = (seed) => {
        S.World.generate(seed);
        const rocks = W.rocks.map((r) => `${r.x | 0},${r.y | 0},${r.r | 0},${r.cache}`).join("|");
        const roster = W.roster.map((r) => r.name + r.color).join("|");
        const crates = W.crates.map((c) => `${c.x | 0},${c.value}`).join("|");
        return rocks + "#" + roster + "#" + crates;
    };

    const a = fingerprint(12345);
    const b = fingerprint(12345);
    const c = fingerprint(99999);

    check("same seed produces an identical sector", a === b);
    check("different seeds produce different sectors", a !== c);
    check("rock field is populated", W.rocks.length > 20, W.rocks.length);
    check("no rock spawns inside the station clear radius",
        W.rocks.every((r) => S.dist2(r.x, r.y, W.station.x, W.station.y) >
            C.world.clearRadius * C.world.clearRadius));
    check("roster is the same size on every generation", W.roster.length > 20, W.roster.length);
}

/* =========================================================================
 * 2. Module pricing and derived stats
 * ====================================================================== */
section("modules and economy");
{
    check("every module has a unique key",
        new Set(S.MODULES.map((m) => m.key)).size === S.MODULES.length);
    check("level 1 costs something, level MAX costs Infinity",
        S.moduleCost("blaster", 1) > 0 && !Number.isFinite(S.moduleCost("blaster", S.MODULE_MAX)));
    check("each level costs more than the last", (() => {
        for (const m of S.MODULES) {
            for (let lv = 1; lv < S.MODULE_MAX; lv++) {
                if (S.moduleCost(m.key, lv + 1) <= S.moduleCost(m.key, lv)) return false;
            }
        }
        return true;
    })());

    const lo = S.statsFor({ blaster: 1, shield: 1, armor: 1, processor: 1, thruster: 1 });
    const hi = S.statsFor({ blaster: 10, shield: 10, armor: 10, processor: 10, thruster: 10 });
    check("max modules beat level 1 on every axis",
        hi.damage > lo.damage && hi.maxHull > lo.maxHull &&
        hi.speed > lo.speed && hi.reduction > lo.reduction &&
        hi.energyBonus > lo.energyBonus && hi.fireInterval < lo.fireInterval);
    check("tier scales with levels", S.tierForShip({ blaster: 10, shield: 10, armor: 10, processor: 10, thruster: 10 }) >
        S.tierForShip({ blaster: 1, shield: 1, armor: 1, processor: 1, thruster: 1 }));
    check("sector threat caps at maxTier",
        S.tierForCrystals(1e9) === C.npc.maxTier);
}

/* =========================================================================
 * 3. Purchase invariants (property test over every module and level)
 * ====================================================================== */
section("purchase invariants");
{
    let negEnergy = 0, outOfRange = 0, failedMutated = 0, overcharged = 0, repairedTooMuch = 0;
    let attempts = 0;

    for (const key of S.MODULES.map((m) => m.key)) {
        for (let energy = 0; energy <= 4000; energy += 37) {
            const base = {};
            for (let i = 0; i < S.MODULES.length; i++) base[S.MODULES[i].key] = 1;
            const ship = { energy, hull: 30, maxHull: 200, modules: base };
            ship.stats = S.statsFor(ship.modules);
            ship.reduction = ship.stats.reduction;

            const before = JSON.stringify(ship);
            const res = S.Stations.buyModule(ship, key);
            attempts++;

            if (ship.energy < 0) negEnergy++;
            if (ship.modules[key] < 1 || ship.modules[key] > S.MODULE_MAX) outOfRange++;
            if (!res.ok && JSON.stringify(ship) !== before) failedMutated++;
            if (res.ok && ship.energy !== energy - res.spent) overcharged++;
        }
    }

    check("no failed or successful purchase drives energy negative", negEnergy === 0, negEnergy);
    check("module levels stay within 1..MAX", outOfRange === 0, outOfRange);
    check("a failed purchase changes nothing at all", failedMutated === 0, failedMutated);
    check("a successful purchase costs exactly its quoted price", overcharged === 0, overcharged);
    check("purchases were actually exercised", attempts > 500, attempts);

    /* Repair. */
    const baseMods = {};
    for (let i = 0; i < S.MODULES.length; i++) baseMods[S.MODULES[i].key] = 1;
    const ship = { energy: 1000, hull: 40, maxHull: 200, modules: baseMods };
    ship.stats = S.statsFor(ship.modules);
    const rr = S.Stations.buyRepair(ship);
    check("repair restores hull to full", rr.ok && ship.hull === ship.maxHull);
    check("repair on a full hull is refused", S.Stations.repairCost(ship) === 0 &&
        !S.Stations.buyRepair(ship).ok);
    check("repair on an empty wallet is refused", (() => {
        const broke = { energy: 0, hull: 10, maxHull: 200, modules: baseMods };
        broke.stats = S.statsFor(broke.modules);
        const r = S.Stations.buyRepair(broke);
        return !r.ok && broke.hull === 10 && broke.energy === 0;
    })());

    const broke = { energy: 10, hull: 10, maxHull: 200, modules: baseMods };
    broke.stats = S.statsFor(broke.modules);
    S.Stations.buyRepair(broke);
    repairedTooMuch = broke.hull > broke.maxHull ? 1 : 0;
    check("repair never overshoots max hull", repairedTooMuch === 0);

    check("dock fee has a floor", S.Stations.undockFee({ energy: 0 }) >= C.world.dockFeeMin);
    check("dock fee scales with energy",
        S.Stations.undockFee({ energy: 10000 }) > S.Stations.undockFee({ energy: 1000 }));
}

/* =========================================================================
 * 4. Banking round-trip
 * ====================================================================== */
section("save / load round trip");
{
    newRun(4242);
    const ship = makePlayer(4242);
    /* Every track at a different level, so the round trip has to carry each
     * one individually rather than a hand-picked subset. */
    ship.modules = {};
    for (let i = 0; i < S.MODULES.length; i++) {
        ship.modules[S.MODULES[i].key] = (i * 2 + 3) % S.MODULE_MAX + 1;
    }
    ship.refits = { hull: 2, salvage: 1 };
    ship.crystals = 1234;
    ship.energy = 987;

    const save = S.Stations.bank(ship);
    S.Storage.saveShip(save);

    const loaded = S.Storage.getShip();
    check("modules survive the round trip",
        S.MODULES.every((m) => loaded.modules[m.key] === ship.modules[m.key]));
    check("crystals survive the round trip", loaded.crystals === 1234, loaded.crystals);
    check("energy survives the round trip", loaded.energy === 987, loaded.energy);
    check("refits survive the round trip",
        loaded.refits.hull === 2 && loaded.refits.salvage === 1,
        JSON.stringify(loaded.refits));
    check("every refit key is present in the save, even at zero",
        S.REFITS.every((r) => typeof loaded.refits[r.key] === "number"));
    check("refit levels are clamped to their maximum", (() => {
        store.set(SHIP_KEY, JSON.stringify({ refits: { hull: 99 } }));
        const r = S.Storage.getShip();
        for (let i = 0; i < S.REFITS.length; i++) {
            const k = S.REFITS[i].key;
            if (r.refits[k] > S.REFITS[i].max) return false;
        }
        return true;
    })());

    /* A corrupt or partial save must degrade to something playable. */
    store.set(SHIP_KEY, JSON.stringify({ modules: { blaster: 999 }, crystals: -5 }));
    const bad = S.Storage.getShip();
    check("out-of-range module levels are clamped",
        bad.modules.blaster === S.MODULE_MAX && bad.modules.shield === 1);
    check("negative crystals are clamped to zero", bad.crystals === 0, bad.crystals);

    store.set(SHIP_KEY, JSON.stringify({ modules: { blaster: "nope" } }));
    const bad2 = S.Storage.getShip();
    check("a non-numeric module level falls back to 1", bad2.modules.blaster === 1);
    check("tracks added after a save was written default to level 1",
        S.MODULES.every((m) => bad2.modules[m.key] === 1));
    check("a pre-refit save still loads, with every refit at zero",
        bad2.refits && S.REFITS.every((r) => bad2.refits[r.key] === 0),
        JSON.stringify(bad2.refits));

    store.set(SHIP_KEY, "{ not json");
    const bad3 = S.Storage.getShip();
    check("corrupt JSON falls back to a default ship", bad3.crystals === 0 &&
        bad3.modules.blaster === 1);
}

/* =========================================================================
 * 5. A long simulated battle loop, aggregated over seeds
 * ====================================================================== */
section("simulated sector behaviour");

/* One minute of play against a live sector, run as two very different
 * pilots. This is the difficulty-curve test as much as a stability test: a
 * fresh pilot has to survive the intro, and a banked pilot has to feel the
 * sector it escalated into.
 */
section("simulated sector behaviour");

const FRAMES = 3600; // one minute of play per run
const stats = { kills: 0, deaths: 0, nan: 0, oob: 0, npcExtinct: 0, badState: 0, maxNpc: 0 };
const byProfile = {
    rookie: { kills: 0, deaths: 0, runs: SEEDS.length },
    veteran: { kills: 0, deaths: 0, runs: SEEDS.length },
};
let npcSamples = 0;
let npcSum = 0;

function runProfile(label, crystals) {
    for (const seed of SEEDS) {
        newRun(seed);
        const player = makePlayer(seed);
        /* Crystals decide which NPC tiers the sector rolls, so setting them
         * is how a run is put into the late game. */
        player.crystals = crystals;
        S.NPCs.spawnAll(player);

        let sawDeath = false;
        const before = { nan: stats.nan, oob: stats.oob, badState: stats.badState };

        for (let f = 0; f < FRAMES; f++) {
            /* Fly at whatever is closest: the crudest possible stand-in for a
             * human, but unlike a scripted circle it actually meets the NPCs
             * and exercises the guns. */
            const seen = step(DT, player, { fire: true, seek: true });
            for (const e of seen) {
                if (e.type === "kill") {
                    stats.kills++;
                    byProfile[label].kills++;
                }
            }

            for (const s of W.ships) {
                if (!allFiniteShip(s)) stats.nan++;
                if (s.x < -200 || s.x > W.size + 200 || s.y < -200 || s.y > W.size + 200) stats.oob++;
                if (!s.isPlayer) {
                    if (s.state !== "patrol" && s.state !== "attack" && s.state !== "flee") {
                        stats.badState++;
                    }
                    if (s.target && (!s.target.alive || !W.ships.includes(s.target))) stats.badState++;
                }
            }

            const npcs = S.NPCs.npcCount();
            npcSum += npcs;
            npcSamples++;
            if (npcs > stats.maxNpc) stats.maxNpc = npcs;
            if (npcs === 0) stats.npcExtinct++;

            if (!player.alive && !sawDeath) {
                sawDeath = true;
                stats.deaths++;
                byProfile[label].deaths++;
            }
        }

        check(label + " seed " + seed + ": no NaN in any ship state",
            stats.nan === before.nan, stats.nan - before.nan);
        check(label + " seed " + seed + ": no ship escaped the sector",
            stats.oob === before.oob, stats.oob - before.oob);
        check(label + " seed " + seed + ": every AI state and target is legal",
            stats.badState === before.badState, stats.badState - before.badState);
        check(label + " seed " + seed + ": NPCs respawn (population never stuck at 0)",
            stats.npcExtinct < npcSamples * 0.1, stats.npcExtinct);
        check(label + " seed " + seed + ": NPC population respects maxAlive",
            stats.maxNpc <= C.npc.maxAlive, stats.maxNpc);
    }
}

/* A brand-new pilot: banked nothing, so the sector is all tier-1 raiders. */
runProfile("rookie", 0);
/* A pilot with a real haul behind them: the sector rolls much heavier tiers. */
runProfile("veteran", 700);

const avgNpc = npcSum / npcSamples;
const rookieKills = byProfile.rookie.kills / byProfile.rookie.runs;
const veteranKills = byProfile.veteran.kills / byProfile.veteran.runs;

check("sector produced combat", stats.kills > 0, stats.kills);
check("combat rate is plausible (2-400 kills/min per profile)",
    rookieKills > 2 && rookieKills < 400 && veteranKills < 400,
    rookieKills.toFixed(1) + " rookie / " + veteranKills.toFixed(1) + " veteran");
check("average NPC population is healthy", avgNpc >= 4 && avgNpc <= C.npc.maxAlive,
    avgNpc.toFixed(2));

/* The claims that matter are about contrast, not about absolute counts.
 * Spawn points and loot scatter use Math.random, so a single count threshold
 * on five runs is a coin flip - asserting the difference between the two
 * profiles is both the real statement and a stable one. */
check("the intro is survivable: a rookie rarely wrecks",
    byProfile.rookie.deaths / byProfile.rookie.runs <= 0.4,
    (byProfile.rookie.deaths + "/" + byProfile.rookie.runs));
check("the late game bites: a banked pilot wrecks more often",
    byProfile.veteran.deaths / byProfile.veteran.runs >= 0.4,
    (byProfile.veteran.deaths + "/" + byProfile.veteran.runs));
check("escalation is real: the veteran profile is strictly more dangerous",
    byProfile.veteran.deaths > byProfile.rookie.deaths,
    byProfile.rookie.deaths + " rookie vs " + byProfile.veteran.deaths + " veteran wrecks");

/* =========================================================================
 * 6. Pools do not leak
 * ====================================================================== */
section("pool integrity");
{
    newRun(777);
    const player = makePlayer(777);
    S.NPCs.spawnAll(player);

    for (let f = 0; f < 3600; f++) {
        step(DT, player, { fire: true, mx: Math.cos(f * 0.01), my: Math.sin(f * 0.01) });
        /* Stress it: keep firing even while the pool is saturated. */
        for (let k = 0; k < 6; k++) S.World.fire(player, f * 0.01);
    }

    check("bullet pool is bounded", W.bullets.length === C.pools.bullets);
    check("pickup pool is bounded", W.pickups.length === C.pools.pickups);
    check("particle pool is bounded", W.particles.length === C.pools.particles);
    check("no live pickup is NaN",
        W.pickups.every((p) => !p.on || (finite(p.x) && finite(p.y) && finite(p.life))));
    check("no live bullet is NaN",
        W.bullets.every((b) => !b.on || (finite(b.x) && finite(b.y) && finite(b.vx))));
    check("events queue is drained, not accumulated",
        W.events.length < C.pools.bullets + 64, W.events.length);
}

/* =========================================================================
 * 7. Docking and undocking
 * ====================================================================== */
section("docking");
{
    newRun(31337);
    const player = makePlayer(31337);
    player.energy = 5000;

    /* Fly the player onto the station. */
    player.x = W.station.x;
    player.y = W.station.y;
    check("station centre counts as inside the dock zone", S.World.inDockZone(player.x, player.y));
    player.x = W.station.x + C.world.dockRadius + 5;
    check("just outside the ring does not", !S.World.inDockZone(player.x, player.y));

    const feeBefore = S.Stations.undockFee(player);
    const save = S.Stations.bank(player);
    S.Storage.saveShip(save);

    const energyBefore = player.energy;
    const fee = S.Stations.payFee(player);
    check("undock fee matches the quote", fee === feeBefore);
    check("undock fee is deducted", player.energy === energyBefore - fee);

    const lp = S.World.launchPoint();
    check("launch point is outside the dock ring", !S.World.inDockZone(lp.x, lp.y));
    check("launch point is inside the sector",
        lp.x > 0 && lp.x < W.size && lp.y > 0 && lp.y < W.size);
    check("launch point faces back toward the station",
        Math.abs(S.angleDiff(lp.heading,
            Math.atan2(W.station.y - lp.y, W.station.x - lp.x))) < 1e-6);
}

/* =========================================================================
 * 8. Death drops the energy it should
 * ====================================================================== */
section("death and loot");
{
    newRun(5151);
    const player = makePlayer(5151);
    player.energy = 900;
    player.crystals = 500;

    /* Move somewhere provably clear of rock. The killing blow is a bullet,
     * and a bullet that meets a rock first kills the rock instead - which
     * made this section fail roughly one run in twenty. */
    {
        let placed = false;
        for (let attempt = 0; attempt < 400 && !placed; attempt++) {
            const x = 400 + Math.random() * (W.size - 800);
            const y = 400 + Math.random() * (W.size - 800);
            const blocked = W.rocks.some((r) => r.alive &&
                S.dist2(x, y, r.x, r.y) < (r.r + 40) * (r.r + 40));
            if (blocked) continue;
            player.x = x;
            player.y = y;
            placed = true;
        }
        check("the test could find a clear patch of sector", placed);
    }
    S.NPCs.spawnAll(player);

    /* Kill the player through the real code path: a tier-8 NPC puts a bullet
     * through them. Anything less and we would not be testing the real
     * teardown. */
    const killer = S.World.spawnShip({
        name: "TEST-KILLER",
        tier: 8,
        x: player.x + 3000,
        y: player.y,
        heading: Math.PI,
        maxHull: 640,
        stats: S.NPC_TIERS[8],
        radius: 28,
    });
    S.World.fire(killer, Math.PI);
    const shot = W.bullets.find((b) => b.on);
    shot.x = player.x;
    shot.y = player.y;
    shot.dmg = 99999;

    const seen = step(DT, player, { fire: false, mx: 0, my: 0 });

    check("a lethal hit emits a playerDeath event",
        seen.some((e) => e.type === "playerDeath"));
    check("the player is removed from the sector", !W.ships.includes(player));
    check("the player is no longer alive", !player.alive);

    const energyDrops = W.pickups.filter((p) => p.on && p.kind === "energy");
    const dropped = energyDrops.reduce((sum, p) => sum + p.value, 0);
    check("death drops the energy that was on the deck",
        Math.abs(dropped - 900) <= 12, dropped);
    check("death never drops the banked crystals",
        !W.pickups.some((p) => p.on && p.kind === "crystal" && p.value > 30));

    /* The dropped energy is reclaimable - that is the whole point of the
     * Darkorbit death loop. */
    const rescuer = W.ships.find((s) => !s.isPlayer);
    const target = energyDrops[0];
    check("there is energy on the deck to reclaim", !!target);
    rescuer.x = target.x;
    rescuer.y = target.y;
    rescuer.heading = 0;
    const before = rescuer.energy;
    step(DT, null, { fire: false, mx: 0, my: 0 });
    check("dropped energy can be picked back up", rescuer.energy > before,
        before + " -> " + rescuer.energy);
    check("pickups expire instead of accumulating forever",
        energyDrops.every((p) => p.life <= C.world.pickupTTL));
}

/* =========================================================================
 * 8b. Crates are income, not scenery
 * ====================================================================== */
section("crates");
{
    newRun(8642);
    const player = makePlayer(8642);
    player.crystals = 0;

    const crate = W.crates.find((c) => c.alive);
    check("the sector is seeded with crates", !!crate);
    check("crates have a positive payout", crate.value > 0, crate.value);

    const before = player.energy;
    player.x = crate.x;
    player.y = crate.y;
    step(DT, player, { fire: false });

    check("flying into a crate opens it", !crate.alive);
    check("an opened crate pays energy", player.energy > before,
        before + " -> " + player.energy);
    check("an opened crate goes on a respawn timer",
        crate.respawn > 0 && crate.respawn <= C.world.crateRespawn);

    /* Run the timer out and confirm the field refills, so the player's
     * baseline income never dries up. */
    crate.respawn = 0.001;
    step(DT, player, { fire: false });
    check("an opened crate comes back", crate.alive);
    check("a respawned crate still pays", crate.value >= C.world.crateValue);

    /* The magnet should pull a crate in from just outside touch range. */
    const far = W.crates.find((c) => c.alive);
    const fx = far.x, fy = far.y;
    player.x = far.x + C.world.pickupMagnet * 0.8;
    player.y = far.y;
    for (let f = 0; f < 180 && far.alive; f++) {
        /* Hold station over it so the test measures the magnet, not the
         * player's ability to steer. */
        player.x = far.x + C.world.pickupMagnet * 0.8;
        player.y = far.y;
        step(DT, player, { fire: false });
    }
    check("crates magnet toward the player", !far.alive ||
        Math.sqrt(S.dist2(far.x, far.y, fx, fy)) > 1,
        far.alive ? "moved " + Math.sqrt(S.dist2(far.x, far.y, fx, fy)).toFixed(1) + " units" : "collected");
}

/* =========================================================================
 * 9. Armour cannot be cheesed into invulnerability
 * ====================================================================== */
section("damage model");
{
    const plain = { hull: 100, maxHull: 100, armor: 0, alive: true, invuln: 0, hitFlash: 0, idleFor: 0 };
    const armoured = { hull: 100, maxHull: 100, armor: 40, alive: true, invuln: 0, hitFlash: 0, idleFor: 0 };

    check("unarmoured ships take the full hit", S.World.damageShip(plain, 25) === 25);
    check("armour is subtracted", S.World.damageShip(armoured, 25) === 1);
    check("damage is never negative even on a tiny hull",
        S.World.damageShip({ hull: 2, maxHull: 100, armor: 0, alive: true, invuln: 0, hitFlash: 0, idleFor: 0 }, 25) === 2);
    check("damage never exceeds remaining hull",
        S.World.damageShip({ hull: 5, maxHull: 100, armor: 0, alive: true, invuln: 0, hitFlash: 0, idleFor: 0 }, 999) === 5);
    check("spawn invulnerability blocks all damage",
        S.World.damageShip({ hull: 100, maxHull: 100, armor: 0, alive: true, invuln: 2, hitFlash: 0, idleFor: 0 }, 25) === 0);

    /* A maxed ship must still be killable by the top tier, or progression
     * would be a treadmill. */
    const maxShip = { hull: 100, maxHull: 100, armor: S.statsFor({
        blaster: 10, shield: 10, armor: 10, processor: 10, thruster: 10,
    }).reduction, alive: true, invuln: 0, hitFlash: 0, idleFor: 0 };
    check("max armour still folds to tier 8 damage",
        S.World.damageShip(maxShip, S.NPC_TIERS[8].damage) > 0,
        S.World.damageShip({ ...maxShip }, S.NPC_TIERS[8].damage));
}

/* ---------- summary ---------- */
console.log("\n" + "-".repeat(56));
console.log(`checks: ${checks}   failures: ${failures}`);
console.log(`sector averages: ${avgNpc.toFixed(1)} NPCs alive`);
console.log(`rookie:  ${rookieKills.toFixed(0)} kills/min, ` +
    `${byProfile.rookie.deaths}/${byProfile.rookie.runs} runs ended in a wreck`);
console.log(`veteran: ${veteranKills.toFixed(0)} kills/min, ` +
    `${byProfile.veteran.deaths}/${byProfile.veteran.runs} runs ended in a wreck`);
console.log("-".repeat(56));
process.exit(failures === 0 ? 0 : 1);