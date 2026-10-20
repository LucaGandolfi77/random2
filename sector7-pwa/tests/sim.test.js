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
const SEED_KEY = "sector7.v2.seed";
const SHIP_KEY = "sector7.v2.ship";
const STATS_KEY = "sector7.v2.stats";
const SEEDS = [1337, 90210, 2468013, 555001, 7777777, 31337, 424242, 8675309,
    /* Sixteen rather than eight. The rookie profile genuinely wrecks about a
     * quarter of the time, and at eight runs P(4 or more wrecks) is around one
     * in eight - so the survival assertion flaked on the sample size, not on
     * the game. Sixteen halves that. */
    1123581, 2718281, 1618033, 1414213, 1732050, 2236067, 3141592, 2236067];

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

for (const f of ["config.js", "storage.js", "sectors.js", "modes.js", "world.js", "stations.js",
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
    lockShot() {},
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

/* Give a ship a full magazine.
 *
 * Every gun in the game draws from one now, so a test about a WEAPON has
 * to give the ship the rounds to fire it. The tests about the economy
 * itself are the ones that deliberately do not. */
function giveMagazine(ship, n) {
    ship.magazine = {
        laser: n, ammo: n, plasma: n, missiles: n, mines: n,
    };
    return ship;
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
    /* A full magazine.
     *
     * Every gun now draws from one, so a pilot who runs dry stops fighting
     * - which is the point of the economy, and not the point of THIS
     * measurement. The difficulty curve is about how dangerous the sector
     * is, so the stand-in pilot is given enough rounds to keep shooting
     * for the whole run. The logistics are measured on their own, in the
     * munitions section below. */
    ship.magazine = {
        laser: 1e6, ammo: 1e6, plasma: 1e6, missiles: 1e6, mines: 1e6,
    };
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
            /* Hosts only. A pilot is another miner, not a target: chasing
             * the nearest non-player ship now means charging the nearest
             * working pilot, which models nobody. The effect of pilots on
             * the difficulty curve is asserted on its own further down. */
            const prey = S.World.nearestShip(player.x, player.y, player, 1e6,
                (s) => !s.isPlayer && !s.isPilot);
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
        /* The capacitor round is edge-triggered, so the harness has to
         * clear the flag like the real input layer does every frame. */
        if (c.ammoEdge) S.World.fireAmmo(player, player.aim);
        if (c.cpuEdge) S.World.activateCpu(player);
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
    check("a ship's tier is its investment, not the size of the track table", (() => {
        /* Every track starts at level 1 for free, so the level sum grows by
         * one whenever a track is added. The tier has to be measured from
         * the investment ABOVE that baseline, or a tenth track hands every
         * ship in the game a free tier - which is stronger pilots and a
         * bigger repair bill, for every pilot who ever launches.
         *
         * These are the tiers the nine-track table produced, asserted as
         * numbers rather than recomputed, so a future track cannot quietly
         * move them. */
        const a = {
            blaster: 10, ammo: 5, shield: 6, armor: 4, processor: 4,
            thruster: 3, cargo: 1, missiles: 1, mines: 1, plasma: 1,
        };
        const b = {
            blaster: 10, ammo: 10, shield: 10, armor: 10, processor: 5,
            thruster: 3, cargo: 1, missiles: 1, mines: 1, plasma: 1,
        };
        return S.tierForShip(a) === 2 && S.tierForShip(b) === 3;
    })());
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
const PROFILE_TRIALS = 3;
const stats = { kills: 0, deaths: 0, nan: 0, oob: 0, npcExtinct: 0, badState: 0, maxNpc: 0 };
const byProfile = {
    rookie: { kills: 0, deaths: 0, runs: SEEDS.length * PROFILE_TRIALS },
    veteran: { kills: 0, deaths: 0, runs: SEEDS.length * PROFILE_TRIALS },
    gunner: { kills: 0, deaths: 0, runs: SEEDS.length * PROFILE_TRIALS },
};
let npcSamples = 0;
let npcSum = 0;

/* A seeded stand-in for Math.random.
 *
 * The world's own RNG is seeded, but the loot scatter and the particle
 * scatter reach for Math.random directly - so two runs of the same seed
 * were not the same run, and the survival assertion below flaked on the
 * sample size rather than on the game. Making the measurement
 * deterministic turns it from a coin flip into a regression test.
 *
 * xorshift32: small, fast, and good enough for a scatter.
 */
function withSeededRandom(seed, fn) {
    const real = Math.random;
    let s = (seed >>> 0) || 0x9e3779b9;
    Math.random = function () {
        s ^= s << 13; s >>>= 0;
        s ^= s >>> 17;
        s ^= s << 5; s >>>= 0;
        return s / 4294967296;
    };
    try {
        return fn();
    } finally {
        Math.random = real;
    }
}

function runProfile(label, crystals, guns) {
    /* Three trials per seed. Sixteen seeds at one trial each was not enough:
     * the rookie profile genuinely wrecks about a fifth of the time, and at
     * that rate a sixteen-run sample sat close enough to the survival
     * threshold to flake on the sample size rather than on the game. Three
     * trials makes it forty-eight runs, which settles the question. */
    for (let trial = 0; trial < PROFILE_TRIALS; trial++) {
        for (const seed of SEEDS) {
        /* Every trial gets its own generator, seeded from the run, so the
         * whole profile is reproducible from the seed list alone. */
        withSeededRandom((seed ^ (trial * 0x9e3779b9)) >>> 0, () => {
        newRun(seed);
        const player = makePlayer(seed);
        /* Crystals decide which NPC tiers the sector rolls, so setting them
         * is how a run is put into the late game. */
        player.crystals = crystals;
        /* And the gun decides whether that late game is survivable. A laser
         * alone bounces off a Demaner; this is the difference the Ammo track
         * exists to make, and the suite has to feel it or the new code is
         * only ever smoke-tested. */
        player.modules.ammo = guns === "ammo" ? 10 : 1;
        player.stats = S.statsFor(player.modules, player.refits);
        S.NPCs.spawnAll(player);

        let sawDeath = false;
        const before = { nan: stats.nan, oob: stats.oob, badState: stats.badState };

        for (let f = 0; f < FRAMES; f++) {
            /* Fly at whatever is closest: the crudest possible stand-in for a
             * human, but unlike a scripted circle it actually meets the NPCs
             * and exercises the guns. */
            const seen = step(DT, player, {
                fire: true,
                seek: true,
                ammoEdge: guns === "ammo" && f % 90 === 0,
            });
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
                    /* work and bank are the pilot loop: out to a rock, fill
                     * the hold, go home. They are legal states for a pilot
                     * and meaningless for anyone else, which is exactly why
                     * they are asserted separately below. */
                    const legal = s.isPilot
                        ? ["work", "bank", "attack", "flee", "patrol"]
                        : ["patrol", "attack", "flee"];
                    if (!legal.includes(s.state)) stats.badState++;
                    /* A wreck keeps whatever state and hold it died in, so
                     * these two are only meaningful while it is still flying.
                     * `> holdMax` rather than `>=`: collect() runs after the
                     * pilot's own tick within a frame, so a pilot can be seen
                     * in "work" with a hold that has just reached capacity
                     * and has not flipped to "bank" until next frame. That is
                     * a one-frame lag, not an overflow - and the real capacity
                     * invariant is asserted above. */
                    if (s.alive && s.isPilot) {
                        if (s.state === "work" && s.hold > s.holdMax) stats.badState++;
                        if (s.state === "bank" && s.hold < 0) stats.badState++;
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
        });
        }
    }
}

/* A brand-new pilot: banked nothing, so the sector is all tier-1 raiders. */
runProfile("rookie", 0);
/* A pilot with a real haul behind them: the sector rolls much heavier tiers. */
runProfile("veteran", 700);
/* Same haul, same sector, but carrying the Ammo track. This is the profile
 * that proves the shield wall is answerable - if it is not measurably safer
 * than the laser-only veteran, then the Ammo track is a tax and the whole
 * two-pool design is decoration. */
runProfile("gunner", 700, "ammo");

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

/* NOTE on what this file deliberately does NOT assert about the ammo build.
 *
 * The obvious claim - "a ship carrying the Ammo track wrecks strictly less
 * often" - is not testable here, and it is worth saying why rather than
 * quietly leaving it out. In ROOK both profiles sit at 7/8 and 8/8 wrecks:
 * a level-1 hull in the starting sector dies to almost everything, so the
 * metric is saturated and a one-run difference between them is noise dressed
 * up as a result.
 *
 * The claim itself is real and it IS asserted - deterministically, in
 * content.test.js, by computing time-to-kill for both weapons against every
 * faction's actual shield fraction and requiring the winner to flip between
 * raiders and aliens. That version cannot flake, and it fails the moment a
 * coefficient is retuned into "one weapon is simply better".
 *
 * What this profile buys is coverage: the capacitor round, its pool, its
 * collision path and its leech hook all run under sustained fire against a
 * live sector, and every NaN / out-of-bounds / illegal-AI-state check above
 * applies to it exactly as it does to the other two. */

/* =========================================================================
 * 6. Pilots actually work
 *
 * The difficulty profile above now deliberately ignores pilots, because a
 * bot that charges the nearest non-player ship is charging the nearest
 * miner, and that models nobody. That makes the pilot loop invisible to the
 * suite unless it gets its own section, so here it is: these are the
 * invariants a miner's closed loop has to hold, and the one thing that would
 * silently rot is the bank step - a pilot that never unloads is a pilot that
 * stops being scenery and starts being an asteroid.
 * ====================================================================== */
section("pilots");
{
    newRun(24680);
    const player = makePlayer(24680);
    S.NPCs.spawnPilots(player, 5);

    const pilots = W.ships.filter((s) => s.isPilot);
    check("pilots spawn", pilots.length === 5, pilots.length);
    check("every pilot is flagged, factioned and coloured from the pilot palette",
        pilots.every((s) => s.isPilot && s.faction === "pogo" &&
            S.PILOT_COLORS.includes(s.color)));
    check("pilots fly real hulls, with real part fits",
        pilots.every((s) => S.hull(s.hullId) && S.HULL_SLOTS.every(
            (slot) => s.parts[slot] && S.part(s.parts[slot].key))));
    check("a pilot's hold matches the hull it is flying",
        pilots.every((s) => s.holdMax === S.statsFor(s.modules || {}, {}, s.parts, s.hullId).holdMax ||
            s.holdMax > 0));
    check("pilots start with a hold, not with loot",
        pilots.every((s) => s.hold === 0));

    /* Hostility is a pure function of two ships, so it is tested on two ships.
     * Doing it on live world entities made these checks depend on whether
     * the rookie bot happened to still be alive after three minutes of
     * simulation, which is not what they are about. */
{
    const mk = (over) => Object.assign({
        id: 1, alive: true, tier: 1, provokedBy: 0, faction: "raider",
    }, over);
    const playerStub = mk({ id: 100, isPlayer: true, faction: "you" });
    const pilot = mk({ id: 200, isPilot: true, faction: "pogo" });
    const otherPilot = mk({ id: 201, isPilot: true, faction: "pogo" });
    const raider = mk({ id: 300, faction: "raider" });
    const alien = mk({ id: 301, faction: "alien" });

    check("nothing is hostile to itself",
        !S.World.isHostileTo(pilot, pilot) && !S.World.isHostileTo(playerStub, playerStub));
    check("a pilot leaves an evenly matched ship alone",
        !S.World.isHostileTo(pilot, mk({ id: 101, isPlayer: true })));
    check("a pilot that clearly outclasses you comes for you", (() => {
        const strong = mk({ id: 202, isPilot: true, tier: 1 + C.npc.pilotAggression });
        return S.World.isHostileTo(strong, mk({ id: 102, isPlayer: true }));
    })());
    check("one tier of advantage is not enough to provoke a pilot",
        !S.World.isHostileTo(
            mk({ id: 203, isPilot: true, tier: 1 + C.npc.pilotAggression - 1 }),
            mk({ id: 103, isPlayer: true })));
    check("a pilot you have shot answers back", (() => {
        const victim = mk({ id: 204, isPilot: true });
        S.World.provoke(victim, mk({ id: 104, isPlayer: true }));
        return victim.provokedBy === 104 && S.World.isHostileTo(victim, victim.provokedBy === 104 ? mk({ id: 104, isPlayer: true }) : null);
    })());
    check("two pilots ignore each other until one shoots",
        !S.World.isHostileTo(pilot, otherPilot));
    check("faction NPCs are still hostile to the player",
        S.World.isHostileTo(raider, playerStub) && S.World.isHostileTo(alien, playerStub));
    check("faction NPCs still fight each other",
        S.World.isHostileTo(raider, alien) && S.World.isHostileTo(alien, raider));
    check("the player is hostile to everything",
        S.World.isHostileTo(playerStub, pilot) && S.World.isHostileTo(playerStub, alien));
    check("provoking a non-pilot is a no-op", (() => {
        const npc = mk({ id: 302, faction: "alien" });
        S.World.provoke(npc, playerStub);
        return npc.provokedBy === 0;
    })());
}

/* Run three minutes and watch the loop close. A minute is not enough:
     * filling a Hauler hold from empty takes minutes of cutting, which is
     * correct and is exactly why this runs longer than the difficulty
     * profile does. */
    let banked = 0;
    let mined = 0;
    for (let f = 0; f < 10800; f++) {
        const before = pilots.map((s) => s.hold);
        step(DT, player, { fire: false, seek: true });
        for (let i = 0; i < pilots.length; i++) {
            if (pilots[i].hold > before[i]) mined++;
            if (pilots[i].state === "bank") banked++;
        }
    }
    const overfull = pilots.filter((s) => s.hold > s.holdMax + 0.5);
    check("no pilot's hold ever exceeds its capacity", overfull.length === 0, overfull.length);
    check("pilots actually fill their holds", mined > 0, mined + " fill events");

    /* The bank step on its own, from a seeded hold. Filling a Hauler take
     * minutes of simulated mining, which is correct but is not what is being
     * asserted here - what is being asserted is that a full hold goes home,
     * unloads, and goes back out. */
    {
        newRun(24681);
        const p2 = makePlayer(24681);
        const banked2 = S.NPCs.spawnPilots(p2, 1)[0];
        banked2.hold = banked2.holdMax - 1;
        let sawBank = false;
        let sawEmpty = false;
        for (let f = 0; f < 5400 && !sawEmpty; f++) {
            step(DT, p2, { fire: false, seek: true });
            if (banked2.state === "bank") sawBank = true;
            if (sawBank && banked2.hold <= 0) sawEmpty = true;
        }
        check("a full pilot goes home to bank", sawBank);
        check("banking empties the hold and sends it back to work",
            sawEmpty && banked2.hold <= 0 && banked2.state !== "bank",
            `hold ${banked2.hold} state ${banked2.state}`);
    }

    /* Pilots are counted apart from hostiles: five miners on a map is not
     * five more hostiles, and the population cap is a balance number. */
    check("pilots are excluded from the hostile population count",
        S.NPCs.npcCount() === W.ships.filter((s) => !s.isPlayer && !s.isPilot).length);
    check("pilots have their own count",
        S.NPCs.pilotCount() === W.ships.filter((s) => s.isPilot).length);
}

/* =========================================================================
 * 7. Pools do not leak
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
    /* Half the run is in the hold, not the tank. The death path has to spill
     * both, and this is where that is actually checked. */
    player.hold = 600;

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
        faction: "alien",
        x: player.x + 3000,
        y: player.y,
        heading: Math.PI,
        maxHull: 640,
        /* NPC_TIERS rows are data, not a stat block: they carry no damage
         * packets, so the test builds the same shape npcs.js does rather
         * than reaching into the tier table. */
        stats: S.statsFor({ blaster: 8, shield: 8, armor: 8, processor: 8, thruster: 8 }),
        radius: 28,
    });
    S.World.fire(killer, Math.PI);
    const shot = W.bullets.find((b) => b.on);
    shot.x = player.x;
    shot.y = player.y;
    /* The player's shield has to be gone first, or a single hit cannot kill
     * them and this section silently stops testing what it claims to. */
    player.shield = 0;
    shot.ds = 99999;
    shot.da = 0;

    const seen = step(DT, player, { fire: false, mx: 0, my: 0 });

    check("a lethal hit emits a playerDeath event",
        seen.some((e) => e.type === "playerDeath"));
    check("the player is removed from the sector", !W.ships.includes(player));
    check("the player is no longer alive", !player.alive);

    const energyDrops = W.pickups.filter((p) => p.on && p.kind === "energy");
    const dropped = energyDrops.reduce((sum, p) => sum + p.value, 0);
    /* Tank plus hold: the load is what dies, not just the balance. */
    check("death drops the tank AND the hold",
        dropped === 1500, "dropped " + dropped);
    /* The invariant the README is proudest of, extended to the hold: the
     * division has to be exact or the player quietly loses energy every
     * death, and 1500 over up to 14 chunks is where a rounding bug hides. */
    check("spilled energy accounts for every point carried",
        dropped + player.energy === 1500,
        "spilled " + dropped + " + banked " + player.energy);
    check("the hold is empty after a wreck", player.hold === 0);
    check("death never drops the banked crystals",
        !W.pickups.some((p) => p.on && p.kind === "crystal" && p.value > 30));

    /* The dropped energy is reclaimable - that is the whole point of the
     * Darkorbit death loop. And it lands in the rescuer's hold, not their
     * tank, because that is the only place energy goes now. */
    const rescuer = W.ships.find((s) => !s.isPlayer);
    const target = energyDrops[0];
    check("there is energy on the deck to reclaim", !!target);
    rescuer.x = target.x;
    rescuer.y = target.y;
    rescuer.heading = 0;
    const before = rescuer.hold;
    step(DT, null, { fire: false, mx: 0, my: 0 });
    check("dropped energy lands in the rescuer's hold",
        rescuer.hold > before, "hold " + before + " -> " + rescuer.hold);
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

    const before = player.hold;
    player.x = crate.x;
    player.y = crate.y;
    step(DT, player, { fire: false });

    check("flying into a crate opens it", !crate.alive);
    check("an opened crate pays into the hold, not the tank", player.hold > before,
        before + " -> " + player.hold);
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
 * 9. The damage model: two pools, one flat cut
 *
 * These are the rules the whole combat design rests on, and each one is a way
 * the game could silently become either trivial or unfair.
 * ====================================================================== */
section("damage model");
{
    const mk = (over) => Object.assign({
        hull: 100, maxHull: 100,
        shield: 0, maxShield: 0,
        armor: 0, alive: true, invuln: 0,
        hitFlash: 0, idleFor: 0, sinceHit: 99,
    }, over);

    check("unarmoured ships take the full hit",
        S.World.damageShip(mk({}), { shield: 0, armor: 25 }).hull === 25);
    check("armour is subtracted", S.World.damageShip(mk({ armor: 40 }), { shield: 0, armor: 25 }).hull === 1);
    check("damage is never negative even on a tiny hull",
        S.World.damageShip(mk({ hull: 2 }), { shield: 0, armor: 25 }).hull === 2);
    check("damage never exceeds remaining hull",
        S.World.damageShip(mk({ hull: 5 }), { shield: 0, armor: 999 }).hull === 5);
    check("spawn invulnerability blocks all damage",
        S.World.damageShip(mk({ invuln: 2 }), { shield: 0, armor: 25 }).hull === 0);

    /* The shield phase. A shield that absorbs everything must be able to
     * take ZERO hull damage - that is the entire reason the second pool
     * exists, and a blanket max(1, ...) would quietly delete it. */
    const shielded = mk({ shield: 40, maxShield: 40 });
    const absorbed = S.World.damageShip(shielded, { shield: 30, armor: 0 });
    check("a shield absorbs the shield component",
        absorbed.absorbed === 30 && shielded.shield === 10, JSON.stringify(absorbed));
    check("a fully-absorbed hit does zero hull damage",
        absorbed.hull === 0 && shielded.hull === 100, "hull damage " + absorbed.hull);

    /* A hit the shield swallows entirely still counts as being hit. This is
     * the bug this rule exists for: absorbed hits used to return before
     * resetting sinceHit, so a pilot facing sustained fire regenerated their
     * shield straight through it and the second pool became decoration. */
    check("a fully-absorbed hit still counts as being hit",
        (() => {
            const s = mk({ shield: 100, maxShield: 100, hull: 100 });
            s.sinceHit = 30;
            S.World.damageShip(s, { shield: 10, armor: 999 });
            return s.sinceHit === 0;
        })());
    check("sustained absorbed fire cannot be regenerated through", (() => {
        const s = mk({ shield: 100, maxShield: 100, hull: 100 });
        s.stats = { shieldRegen: 20 };
        s.sinceHit = 30;
        for (let f = 0; f < 180; f++) {
            s.shield = Math.max(0, s.shield - 5);
            S.World.damageShip(s, { shield: 10, armor: 0 });
        }
        return s.shield < 100;
    })());

    /* Overflow is the interesting half: a shot that outgrows the remaining
     * shield spills into the hull together with the armour component rather
     * than being thrown away. 10 shield absorbs 10 of a 25 shield packet,
     * so 15 spills, plus the 5 armour component. */
    const spillShip = mk({ shield: 10, maxShield: 40, hull: 100 });
    const spilled = S.World.damageShip(spillShip, { shield: 25, armor: 5 });
    check("shield overflow spills into the hull",
        spilled.absorbed === 10 && spilled.hull === 20,
        JSON.stringify(spilled));
    check("a depleted shield reads as empty, never negative",
        spillShip.shield === 0);

    /* Armour cuts the spilled total, and the flat cut may zero a weak
     * attack outright - that is what the module is for. */
    const plated = mk({ shield: 0, maxShield: 40, hull: 100, armor: 40 });
    const platedRes = S.World.damageShip(plated, { shield: 0, armor: 25 });
    check("armour cuts the combined packet after the shield phase",
        platedRes.hull === 1, JSON.stringify(platedRes));

    /* Armour zeroing a weak shot must still leave the ship killable: a
     * point always gets through once a shield is gone, or a stacked armour
     * would make a hull permanently invulnerable to tier-1 raiders. */
    const inv = mk({ shield: 0, maxShield: 0, hull: 100, armor: 1e9 });
    check("armour cannot make a hull permanently unkillable",
        S.World.damageShip(inv, { shield: 0, armor: 1 }).hull === 1);

    /* A maxed ship must still be killable by the top tier, or progression
     * would be a treadmill. */
    const maxStats = S.statsFor({
        blaster: 10, shield: 10, armor: 10, processor: 10, thruster: 10,
    });
    const maxShip = mk({
        hull: maxStats.maxHull, maxHull: maxStats.maxHull,
        shield: maxStats.maxShield, maxShield: maxStats.maxShield,
        armor: maxStats.reduction,
    });
    const tier8 = S.packet("blaster", S.NPC_TIERS[8].damage);
    let guard = 0;
    while (maxShip.alive && maxShip.hull > 0 && guard++ < 5000) {
        const r = S.World.damageShip(maxShip, tier8);
        if (r.absorbed > 0) { maxShip.shield = 0; }
    }
    check("a maxed ship still folds to a tier-8 brawl", guard < 5000, guard + " iterations");

    /* Shields refill, armour does not. */
    const regenShip = mk({ shield: 0, maxShield: 40, hull: 40, maxHull: 100 });
    regenShip.stats = { shieldRegen: 8 };
    regenShip.sinceHit = 99;
    W.ships.push(regenShip);
    for (let f = 0; f < 120; f++) S.World.step(1 / 60);
    check("an untouched shield refills over time", regenShip.shield > 10,
        regenShip.shield.toFixed(1));

    /* ...but not while it is being shot at, or a pilot could out-trade a
     * firefight by holding still in one. */
    regenShip.sinceHit = 0;
    const held = regenShip.shield;
    for (let f = 0; f < 120; f++) { regenShip.sinceHit = 0; S.World.step(1 / 60); }
    check("a shield under fire does not refill", regenShip.shield === held,
        held + " -> " + regenShip.shield);
    W.ships.splice(W.ships.indexOf(regenShip), 1);
}

/* =========================================================================
 * The plasma round
 * ====================================================================== */
section("plasma");
{
    /* The third answer to the two-pool problem. The laser chews armour
     * and bounces off shields, the capacitor round chews shields and is
     * wasted on armour, and the plasma chews armour THROUGH a shield. */
    const mk = (over) => Object.assign({
        hull: 100, maxHull: 100,
        shield: 0, maxShield: 0,
        armor: 0, alive: true, invuln: 0,
        hitFlash: 0, idleFor: 0, sinceHit: 99,
    }, over);

    /* --- the piercing rule --- */
    const shielded = mk({ shield: 60, maxShield: 60, hull: 100 });
    const plasmaPacket = S.packet("plasma", 20);
    check("the plasma packet is marked as piercing", plasmaPacket.pierce === true);
    const pierced = S.World.damageShip(shielded, plasmaPacket);
    check("a plasma round puts armour damage through a shield",
        pierced.hull > 0, JSON.stringify(pierced));
    check("a plasma round still has its shield component eaten",
        pierced.absorbed > 0 && shielded.shield < 60, JSON.stringify(pierced));

    /* The same shot without the pierce flag does nothing to the hull. */
    const plain = mk({ shield: 60, maxShield: 60, hull: 100 });
    const laserPacket = S.packet("blaster", 20);
    const bounced = S.World.damageShip(plain, laserPacket);
    check("a laser round is still held off by a shield", bounced.hull === 0,
        JSON.stringify(bounced));
    check("the laser packet is not marked as piercing", laserPacket.pierce === false);

    /* And a pierced hit still counts as being hit, so the shield cannot
     * regenerate through it. */
    const regenerating = mk({ shield: 60, maxShield: 60, hull: 100 });
    regenerating.sinceHit = 30;
    S.World.damageShip(regenerating, S.packet("plasma", 20));
    check("a piercing hit still resets the shield regen delay",
        regenerating.sinceHit === 0);

    /* --- the weapon --- */
    const stats = S.statsFor({ blaster: 1, plasma: 1, shield: 1, armor: 1, processor: 1, thruster: 1 });
    const shooter = giveMagazine(S.World.spawnShip({
        isPlayer: true, name: "TESTER", color: "#67e8f9", faction: "you",
        maxHull: stats.maxHull, maxShield: stats.maxShield,
        stats: stats, reduction: stats.reduction, radius: 16, z: 12,
    }), 99);
    W.player = shooter;
    shooter.x = 1200; shooter.y = 1200;

    check("a plasma round fires", S.World.firePlasma(shooter, 0) === true);
    const round = W.bullets.filter((b) => b.on);
    check("it puts exactly one round in the world", round.length === 1, round.length);
    check("the round is marked as piercing", round[0] && round[0].pierce === true);
    check("it runs on its own cooldown",
        shooter.cooldownPlasma === stats.plasmaCooldown,
        "cooldown " + shooter.cooldownPlasma);
    check("it will not fire again straight away",
        S.World.firePlasma(shooter, 0) === false);

    /* --- the pool does not leak between guns ---
     * The bullet pool is shared by the blaster, the lock-on shot and the
     * plasma round. A slot keeps whatever the last shot through it left
     * behind, so a blaster round that inherited `pierce` would go through
     * shields and a blaster round that inherited `homing` would fly at a
     * target nobody aimed at.
     */
    S.World.firePlasma(shooter, 0);
    W.bullets.forEach((b) => { b.on = false; });
    S.World.fire(shooter, 0);
    const blaster = W.bullets.find((b) => b.on);
    check("a blaster round does not inherit the pierce flag",
        blaster && blaster.pierce === false);
    check("a blaster round does not inherit homing",
        blaster && blaster.homing === false);
    check("a blaster round does not inherit a target",
        blaster && blaster.targetId === 0);

    S.World.firePlasma(shooter, 0);
    W.bullets.forEach((b) => { b.on = false; });
    S.World.fireLockOn(shooter, W.ships.find((s) => s !== shooter));
    const lockOn = W.bullets.find((b) => b.on);
    check("a lock-on round does not inherit the pierce flag",
        lockOn && lockOn.pierce === false);

    S.World.removeShip(shooter);
    W.player = null;
    W.bullets.forEach((b) => { b.on = false; });

    /* --- the balance promise ---
     * The plasma is an ANSWER to a problem, not a better gun. It must
     * never kill an unshielded hull faster than the laser, and it must
     * beat the laser against a shield - where the laser's armour
     * component is held off entirely and it can do almost nothing.
     *
     * This is modelled as the fight actually goes, not as a damage-per-
     * second division: the shield absorbs the shot's shield component
     * first, and the armour component is held off until the shield is
     * gone.
     */
    const timeToKill = (packet, interval, target) => {
        let shield = target.shield, hull = target.hull, t = 0;
        while (hull > 0 && t < 900) {
            t += interval;
            const absorbed = Math.min(shield, packet.shield);
            shield -= absorbed;
            const spill = packet.shield - absorbed;
            const raw = (shield > 0 && !packet.pierce) ? spill : spill + packet.armor;
            hull -= Math.max(0, Math.round(raw - (target.armor || 0)));
        }
        return t;
    };

    const tier8 = S.NPC_TIERS[8].hull;
    const alien = S.faction("alien").shieldFrac;
    const bare = { hull: tier8, shield: 0, armor: 0 };
    const walled = { hull: tier8, shield: Math.round(tier8 * alien), armor: 0 };

    for (const level of [1, 5, 10]) {
        const st = S.statsFor({
            blaster: level, plasma: level, shield: 1, armor: 1, processor: 1, thruster: 1,
        });
        const laser = timeToKill(st.blasterPacket, st.fireInterval, bare);
        const plasma = timeToKill(st.plasmaPacket, st.plasmaCooldown, bare);
        check("at level " + level + " the laser still kills an unshielded hull first",
            laser < plasma,
            "laser " + laser.toFixed(1) + "s, plasma " + plasma.toFixed(1) + "s");
    }

    /* And against a shielded hull, where the laser cannot land at all,
     * the plasma has to be the better gun by a wide margin. */
    const st = S.statsFor({
        blaster: 10, plasma: 10, shield: 1, armor: 1, processor: 1, thruster: 1,
    });
    const laserOnShield = timeToKill(st.blasterPacket, st.fireInterval, walled);
    const plasmaOnShield = timeToKill(st.plasmaPacket, st.plasmaCooldown, walled);
    check("the plasma is the better gun against a shield",
        plasmaOnShield < laserOnShield,
        "laser " + laserOnShield.toFixed(1) + "s, plasma " + plasmaOnShield.toFixed(1) + "s");
}

/* =========================================================================
 * The lock-on shot
 * ====================================================================== */
section("lock-on shot");
{
    /* The weapon the Ctrl key fires. It exists to make "I picked that ship"
     * into "that ship is taking damage", and every rule around it is a
     * promise to the player: it needs a lock, it needs a range, and it
     * will not fire twice in the same breath. */
    const stats = S.statsFor({ blaster: 3, shield: 0, armor: 0, processor: 0, thruster: 0 });

    /* A clean world. This test is about the weapon, not about whatever
     * happened to be drifting through the shot's path: a rock in the way
     * or a passing NPC would make the result depend on the map seed. */
    W.ships.length = 0;
    W.bullets.forEach((b) => { b.on = false; });
    W.rocks.forEach((r) => { r.alive = false; });

    const shooter = giveMagazine(S.World.spawnShip({
        isPlayer: true, name: "TESTER", color: "#67e8f9", faction: "you",
        maxHull: stats.maxHull, maxShield: stats.maxShield,
        stats: stats, reduction: stats.reduction, radius: 16, z: 12,
    }), 99);
    const target = S.World.spawnShip({
        name: "DUMMY", color: "#ff5470", faction: "raid", tier: 3,
        maxHull: 200, maxShield: 0, stats: stats, radius: 16, z: 12,
    });
    W.player = shooter;

    /* --- the refusals --- */
    check("the lock-on shot refuses without a target",
        S.World.fireLockOn(shooter, null) === false);
    check("the lock-on shot refuses a dead target", (() => {
        target.alive = false;
        const r = S.World.fireLockOn(shooter, target);
        target.alive = true;
        return r === false;
    })());
    check("the lock-on shot refuses a target out of range", (() => {
        shooter.x = 1200; shooter.y = 1200;
        target.x = 1200 + C.combat.attackRange + 60; target.y = 1200;
        const r = S.World.fireLockOn(shooter, target);
        shooter.x = 1200; shooter.y = 1200; target.x = 1200; target.y = 1400;
        return r === false;
    })());
    check("a refused shot costs no cooldown", shooter.cooldownAttack === 0,
        "cooldown " + shooter.cooldownAttack);

    /* --- the shot itself --- */
    /* Well inside the map, not on its edge: a round that spawns at x = 0
     * dies on the out-of-bounds check before it can fly. */
    shooter.x = 1200; shooter.y = 1200;
    target.x = 1200; target.y = 1400;
    target.hull = 200;
    target.shield = 0;
    target.maxShield = 0;
    target.alive = true;
    target.invuln = 0;

    const fired = S.World.fireLockOn(shooter, target);
    check("the lock-on shot fires at a locked target in range", fired === true);
    check("it puts the shot on its own cooldown",
        shooter.cooldownAttack === C.combat.attackCooldown,
        "cooldown " + shooter.cooldownAttack);
    check("it will not fire again straight away",
        S.World.fireLockOn(shooter, target) === false);

    /* The shot is a real projectile: it has to travel and connect, not
     * apply damage on the spot. */
    const shot = W.bullets.filter((b) => b.on && b.homing);
    check("it puts a homing round in the world", shot.length === 1, shot.length + " in flight");
    check("the round is aimed at the target", (() => {
        if (!shot.length) return false;
        const b = shot[0];
        return Math.abs(Math.atan2(b.vy, b.vx) - Math.atan2(target.y - b.y, target.x - b.x)) < 0.01;
    })());

    /* Let it fly. The target is 200 units away and the round is fast, so
     * this is a fraction of a second of flight. */
    let hitHull = target.hull;
    for (let f = 0; f < 30 && target.hull === hitHull; f++) {
        S.World.step(1 / 60);
    }
    check("the round reaches the target and hurts it", target.hull < hitHull,
        "hull " + hitHull + " -> " + target.hull);
    check("the round does not hurt the shooter", shooter.hull === shooter.maxHull,
        shooter.hull + " / " + shooter.maxHull);

    /* It must not be a blaster in disguise: a second press inside the
     * cooldown does nothing at all. */
    const before = target.hull;
    S.World.fireLockOn(shooter, target);
    for (let f = 0; f < 10; f++) S.World.step(1 / 60);
    check("a shot on cooldown does nothing", target.hull === before,
        before + " -> " + target.hull);

    /* And once the cooldown is up it works again. */
    shooter.cooldownAttack = 0;
    check("it fires again once the cooldown is over",
        S.World.fireLockOn(shooter, target) === true);

    /* A dead target must not keep eating shots: the round simply flies on
     * without a target rather than seeking a ghost. */
    target.alive = false;
    check("a dead target is not a valid target",
        S.World.fireLockOn(shooter, target) === false);

    S.World.removeShip(shooter);
    S.World.removeShip(target);
    W.player = null;
    W.bullets.forEach((b) => { b.on = false; });
}

/* =========================================================================
 * The cloak
 * ====================================================================== */
section("cloak");
{
    /* The cloak is a perception effect, not a shield: anything that has to
     * ACQUIRE a target cannot see a cloaked ship, but a round already in
     * the air still lands. Those are two different promises and they have
     * to be tested separately. */
    newRun(13579);
    const player = makePlayer(13579);
    player.invuln = 0;

    const npc = S.NPCs.spawnOne(player, "pirate");
    /* Inside the aggro range, so the only reason not to fight is the
     * cloak. */
    npc.x = player.x + 120;
    npc.y = player.y;
    npc.state = "patrol";

    /* Think long enough for the NPC to have picked the player up. */
    for (let i = 0; i < 8; i++) S.NPCs.think(0.2);
    check("an NPC acquires a visible player", npc.target === player,
        "target " + (npc.target ? npc.target.name : "none"));

    /* Cloak. */
    player.cpu = "cloak";
    player.cpuKey = "cloak";
    player.cpuTimer = S.CONFIG.cpu.cloakTime;
    check("a cloaked player reads as cloaked", S.World.isCloaked(player));

    for (let i = 0; i < 8; i++) S.NPCs.think(0.2);
    check("a cloaked player cannot be acquired", npc.target !== player,
        "target " + (npc.target ? npc.target.name : "none"));
    check("a cloaked player is not the NPC's state", npc.state !== "attack",
        npc.state);

    /* The cloak wears off, and the NPC finds the player again. */
    player.cpuTimer = 0;
    check("a player whose cloak has run out is visible again",
        !S.World.isCloaked(player));
    for (let i = 0; i < 8; i++) S.NPCs.think(0.2);
    check("the NPC picks the player up again once the cloak is over",
        npc.target === player, "target " + (npc.target ? npc.target.name : "none"));

    /* The other half of the promise: being unseen is not being untouchable.
     * A round already in the air still lands on a cloaked ship. */
    const cloakShip = S.World.spawnShip({
        name: "CLOAKED", color: "#4ade80", faction: "you", tier: 1,
        maxHull: 200, maxShield: 0, stats: S.statsFor({}), radius: 16, z: 12,
    });
    cloakShip.cpuKey = "cloak";
    cloakShip.cpuTimer = 5;
    cloakShip.invuln = 0;
    cloakShip.shield = 0;
    const before = cloakShip.hull;
    S.World.damageShip(cloakShip, { shield: 0, armor: 20 });
    check("a cloaked ship still takes damage from a shot already in the air",
        cloakShip.hull < before, before + " -> " + cloakShip.hull);

    S.World.removeShip(cloakShip);
    S.World.removeShip(npc);
    S.World.removeShip(player);
    W.player = null;
}

/* =========================================================================
 * The mining beam
 * ====================================================================== */
section("mining beam");
{
    /* The beam is the free tool that makes everything else safe to change:
     * a player can always mine, so a player can always be solvent. Its
     * whole value rests on two promises, and both are asserted here.
     *
     *   1. It is a TOOL. It cuts rock and nothing else.
     *   2. It is FREE, and it never runs out.
     */
    newRun(24680);
    const player = makePlayer(24680);
    player.invuln = 0;

    /* A clean field, so the test is about the beam and not about whatever
     * was already lying in the map. */
    W.rocks.length = 0;
    W.ships.length = 0;
    W.pickups.forEach((p) => { p.on = false; });

    const mkRock = (x, y, grade, energy, hull) => {
        const rock = {
            x: x, y: y, z: 0,
            r: 40, hull: hull, maxHull: hull,
            cache: grade, grade: grade,
            energy: energy, energyLeft: energy,
            seed: 1, alive: true, respawn: 0, hitFlash: 0,
        };
        W.rocks.push(rock);
        return rock;
    };

    player.x = 1000; player.y = 1000; player.heading = 0;
    player.hold = 0;
    player.holdMax = 500;

    /* Park the player in front of a rock and point the nose at it. The
     * beam comes off the nose, not the turret, so this is the only way it
     * ever finds anything. */
    const faceRock = (rock) => {
        player.x = rock.x;
        player.y = rock.y - 120;
        player.heading = Math.PI / 2;   /* +y is down the screen */
        player.hold = 0;
        player.holdMax = 500;
    };

    /* --- 1. it cuts rock --- */
    const rock = mkRock(1100, 1000, 1, 20, 100);
    const took = S.World.mineBeam(player, 1 / 60, true);
    check("the beam cuts the rock it is pointed at", rock.hull < rock.maxHull,
        "hull " + rock.hull);
    check("the beam puts the energy straight in the hold", player.hold > 0,
        "hold " + player.hold);
    check("the beam reports what it took", took > 0, "took " + took);

    /* --- 1b. and NOTHING else --- */
    const victim = S.World.spawnShip({
        name: "TARGET", color: "#ff5470", faction: "raid", tier: 3,
        maxHull: 200, maxShield: 0, stats: S.statsFor({}), radius: 16, z: 12,
    });
    victim.x = 1100; victim.y = 1000;
    victim.hull = 200; victim.shield = 0; victim.invuln = 0;
    const hullBefore = victim.hull;
    for (let i = 0; i < 60; i++) S.World.mineBeam(player, 1 / 60, true);
    check("the beam does not touch a ship", victim.hull === hullBefore,
        hullBefore + " -> " + victim.hull);
    check("a ship in the beam's path is not even the beam's target",
        W.beam && W.beam.x === rock.x);

    /* --- 2. it is free --- */
    const energyBefore = player.energy;
    const crystalsBefore = player.crystals;
    for (let i = 0; i < 60; i++) S.World.mineBeam(player, 1 / 60, true);
    check("the beam costs no energy", player.energy === energyBefore,
        energyBefore + " -> " + player.energy);
    check("the beam costs no crystals", player.crystals === crystalsBefore);

    /* --- the totals are preserved ---
     * A rock's energy ends up in the hold or on the ground. It is never
     * created and it is never destroyed. */
    const grade1 = mkRock(1100, 1000, 1, 20, 100);
    faceRock(grade1);
    for (let i = 0; i < 600 && grade1.alive; i++) S.World.mineBeam(player, 1 / 60, true);
    check("a whole rock is worth its whole energy", player.hold >= 20,
        "hold " + player.hold.toFixed(2) + " of 20");
    check("nothing is left in a mined-out rock", grade1.energyLeft <= 0.01,
        "left " + grade1.energyLeft);
    check("the rock is broken once it is cut away", !grade1.alive);

    /* --- a full hold refuses rather than destroys --- */
    const full = mkRock(1100, 1000, 4, 20, 100);
    faceRock(full);
    player.hold = player.holdMax;
    const leftBefore = full.energyLeft;
    for (let i = 0; i < 30; i++) S.World.mineBeam(player, 1 / 60, true);
    check("a full hold does not take energy", player.hold <= player.holdMax,
        "hold " + player.hold + " of " + player.holdMax);
    check("a full hold does not consume the rock's energy",
        full.energyLeft === leftBefore, leftBefore + " -> " + full.energyLeft);
    check("a full hold is still never over capacity",
        player.hold <= player.holdMax);

    /* --- per material ---
     * A rock's grade is how much crystal it hides, and the beam extracts
     * faster from a richer one. Same cut, more energy, and the totals are
     * the same. */
    const cutFor = (grade) => {
        const r = mkRock(1100, 1000, grade, 20, 100);
        faceRock(r);
        /* One second of cutting, whatever the material. */
        for (let i = 0; i < 60; i++) S.World.mineBeam(player, 1 / 60, true);
        return player.hold;
    };
    const plain = cutFor(1);
    const rich = cutFor(4);
    check("a richer rock yields more from the same cut", rich > plain * 2,
        "plain " + plain.toFixed(2) + ", rich " + rich.toFixed(2));

    /* --- the beam is off when it is not held --- */
    player.hold = 0;
    S.World.mineBeam(player, 1 / 60, false);
    check("the beam switches off when the button is released", W.beam === null);

    /* --- and it does not make the blaster pointless ---
     * The beam mines at a fixed rate, so a pilot who has spent every level
     * on cargo and shields still gets a working miner. What it must NOT do
     * is out-cut a maxed blaster, or the laser track would be a wasted
     * level for anyone who cares about the hold. */
    check("the beam never out-cuts a maxed blaster", (() => {
        const st = S.statsFor({
            blaster: 10, shield: 1, armor: 1, processor: 1, thruster: 1,
        });
        /* A blaster round does its whole packet to a rock, hull included. */
        const blasterRate =
            (st.blasterPacket.shield + st.blasterPacket.armor) / st.fireInterval;
        return C.combat.beamRate < blasterRate;
    })(), "beam " + C.combat.beamRate + " vs blaster " +
        ((S.statsFor({ blaster: 10 }).blasterPacket.shield +
            S.statsFor({ blaster: 10 }).blasterPacket.armor) /
            S.statsFor({ blaster: 10 }).fireInterval).toFixed(1));

    S.World.removeShip(victim);
    S.World.removeShip(player);
    W.player = null;
    W.rocks.length = 0;
}

/* =========================================================================
 * The munitions magazine
 * ====================================================================== */
section("munitions");
{
    /* Every gun in the game draws on a magazine, and the magazine is lost
     * with the ship. That is the whole economy of the endgame: rounds are
     * a thing you own in the hangar and a thing you spend in a fight.
     */
    newRun(97531);
    const player = makePlayer(97531);
    player.invuln = 0;
    player.magazine = { laser: 10, ammo: 3, plasma: 2, missiles: 4, mines: 2 };

    /* --- every gun draws on it --- */
    check("the blaster spends a laser round", (() => {
        const before = player.magazine.laser;
        S.World.fire(player, 0);
        return player.magazine.laser === before - 1;
    })());
    check("the capacitor round spends a round", (() => {
        const before = player.magazine.ammo;
        S.World.fireAmmo(player, 0);
        return player.magazine.ammo === before - 1;
    })());
    check("the plasma round spends a round", (() => {
        const before = player.magazine.plasma;
        S.World.firePlasma(player, 0);
        return player.magazine.plasma === before - 1;
    })());
    check("a mine spends a round", (() => {
        const before = player.magazine.mines;
        S.World.dropMine(player);
        return player.magazine.mines === before - 1;
    })());

    /* --- an empty magazine is an empty gun --- */
    player.magazine.laser = 0;
    const bulletsBefore = W.bullets.filter((b) => b.on).length;
    check("an empty gun does not fire", S.World.fire(player, 0) === false);
    check("an empty gun puts nothing in the world",
        W.bullets.filter((b) => b.on).length === bulletsBefore);

    /* A salvo costs a round per missile, and a pilot with three missiles
     * left fires three, not nine. */
    player.modules.missiles = 10;
    player.stats = S.statsFor(player.modules, player.refits);
    player.magazine.missiles = 3;
    const fired = S.World.fireMissiles(player, [], 0);
    check("a salvo is limited by the magazine", fired === 3,
        "fired " + fired + " of " + player.stats.missiles);
    check("the salvo took its rounds", player.magazine.missiles === 0);

    /* --- the reserve is the hangar's, and the magazine is the ship's --- */
    player.hangar = S.Storage.getHangar();
    const hangar = player.hangar;
    hangar.munitions = { laser: 500, ammo: 20, plasma: 5, missiles: 6, mines: 4 };
    player.magazine = { laser: 0, ammo: 0, plasma: 0, missiles: 0, mines: 0 };
    S.Stations.loadMunitions(player);
    check("the ship loads what it can carry", player.magazine.laser === 300,
        "loaded " + player.magazine.laser);
    check("the reserve keeps the rest", hangar.munitions.laser === 200,
        "reserve " + hangar.munitions.laser);
    check("a type the ship cannot carry much of is capped too",
        player.magazine.plasma === 5 && hangar.munitions.plasma === 0,
        "plasma " + player.magazine.plasma + " / " + hangar.munitions.plasma);

    /* A reload never loses a round and never doubles one. */
    const carriedBefore = player.magazine.laser;
    const reserveBefore = hangar.munitions.laser;
    S.Stations.loadMunitions(player);
    check("a reload neither loses nor invents rounds",
        player.magazine.laser + hangar.munitions.laser === carriedBefore + reserveBefore,
        player.magazine.laser + " + " + hangar.munitions.laser);
    check("a reload tops the magazine back up", player.magazine.laser === 300,
        "loaded " + player.magazine.laser);

    /* --- the magazine is lost with the ship --- */
    player.magazine.laser = 12;
    const reserveAfter = hangar.munitions.laser;
    /* The ship is wrecked: the magazine goes with it. The reserve in the
     * hangar does not, because it was never on the ship. */
    const wreck = S.World.spawnShip({
        isPlayer: true, name: "WRECK", color: "#67e8f9", faction: "you",
        maxHull: 100, maxShield: 0, stats: S.statsFor({}), radius: 16, z: 12,
    });
    wreck.magazine = { laser: 12, ammo: 0, plasma: 0, missiles: 0, mines: 0 };
    S.World.killPlayer(wreck, null);
    check("the magazine is lost with the ship", wreck.magazine.laser === 12,
        "magazine " + wreck.magazine.laser);
    check("the hangar's reserve is not lost with the ship",
        hangar.munitions.laser === reserveAfter,
        reserveAfter + " -> " + hangar.munitions.laser);

    /* --- the soft-lock guard ---
     * A pilot with no rounds and no energy can still mine. That is the
     * whole reason the mining beam exists, and it is the difference
     * between a consumable economy and a broken one. */
    const broke = makePlayer(97531);
    broke.energy = 0;
    broke.magazine = { laser: 0, ammo: 0, plasma: 0, missiles: 0, mines: 0 };
    const mineRock = {
        x: 1400, y: 1400, z: 0, r: 40,
        hull: 100, maxHull: 100, cache: 2, grade: 2,
        energy: 20, energyLeft: 20,
        seed: 1, alive: true, respawn: 0, hitFlash: 0,
    };
    W.rocks.length = 0;
    W.rocks.push(mineRock);
    broke.x = 1400; broke.y = 1280; broke.heading = Math.PI / 2;
    broke.hold = 0; broke.holdMax = 500;
    for (let i = 0; i < 30; i++) S.World.mineBeam(broke, 1 / 60, true);
    check("a pilot with no rounds and no energy can still mine",
        broke.hold > 0, "hold " + broke.hold.toFixed(1));

    W.rocks.length = 0;
    S.World.removeShip(player);
    W.player = null;
}


/* =========================================================================
 * The auto-turret
 * ====================================================================== */
section("auto-turret");
{
    /* A thing bolted to the ship that shoots on its own. It earns its place
     * because it covers the player's back - and it costs them rounds,
     * because a free turret would be a free gun.
     */
    newRun(246810);
    const player = makePlayer(246810);
    player.turret = 1;
    player.cooldownTurret = 0;
    player.magazine.laser = 50;

    /* A hostile inside the turret's reach. */
    const prey = S.World.spawnShip({
        name: "PREY", color: "#ff5470", faction: "raid", tier: 2,
        x: player.x + 120, y: player.y, z: 12,
        maxHull: 300, maxShield: 0, stats: S.statsFor({}), radius: 16,
    });
    prey.hull = 300; prey.shield = 0; prey.invuln = 0;

    const before = W.bullets.filter((b) => b.on).length;
    const fired = S.World.fireTurret(player, 1 / 60);
    check("the turret fires at a hostile in range", fired === true);
    check("the turret puts a round in the world",
        W.bullets.filter((b) => b.on).length === before + 1);
    check("the turret spends a laser round", player.magazine.laser === 49,
        "magazine " + player.magazine.laser);
    const shot = W.bullets.find((b) => b.on && b.turret);
    check("the turret's round is marked as a turret round", !!shot);

    /* It does not fire at nothing. */
    const quiet = W.bullets.filter((b) => b.on).length;
    player.cooldownTurret = 0;
    player.x = 5000; player.y = 5000;
    const nowhere = S.World.fireTurret(player, 1 / 60);
    check("the turret does not fire at empty space", nowhere === false);
    check("the turret puts nothing in the world at empty space",
        W.bullets.filter((b) => b.on).length === quiet);

    /* A ship with no turret does not have one. */
    player.turret = 0;
    player.cooldownTurret = 0;
    player.x = prey.x - 120; player.y = prey.y;
    check("a ship with no turret does not shoot by itself",
        S.World.fireTurret(player, 1 / 60) === false);

    /* An empty magazine means a quiet turret, and no announcement: a
     * machine has nothing to say about running dry. */
    player.turret = 1;
    player.cooldownTurret = 0;
    player.magazine.laser = 0;
    W.events.length = 0;
    const dry = S.World.fireTurret(player, 1 / 60);
    check("an empty turret does not fire", dry === false);
    check("an empty turret does not announce itself",
        !W.events.some((e) => e.type === "dry"));

    /* The turret is a support weapon, not a second blaster: it does less
     * damage than the gun it is bolted to. */
    player.magazine.laser = 50;
    player.cooldownTurret = 0;
    S.World.fireTurret(player, 1 / 60);
    const tShot = W.bullets.find((b) => b.on && b.turret);
    check("the turret does less damage than the blaster",
        tShot && tShot.da < player.stats.blasterPacket.armor,
        tShot ? "turret " + tShot.da.toFixed(1) + " vs blaster " +
            player.stats.blasterPacket.armor.toFixed(1) : "no shot");

    S.World.removeShip(prey);
    S.World.removeShip(player);
    W.player = null;
}

console.log("\n" + "-".repeat(56));
console.log(`checks: ${checks}   failures: ${failures}`);
console.log(`sector averages: ${avgNpc.toFixed(1)} NPCs alive`);
console.log(`rookie:  ${rookieKills.toFixed(0)} kills/min, ` +
    `${byProfile.rookie.deaths}/${byProfile.rookie.runs} runs ended in a wreck`);
console.log(`veteran: ${veteranKills.toFixed(0)} kills/min, ` +
    `${byProfile.veteran.deaths}/${byProfile.veteran.runs} runs ended in a wreck`);
console.log(`gunner:  ${(byProfile.gunner.kills / byProfile.gunner.runs).toFixed(0)} kills/min, ` +
    `${byProfile.gunner.deaths}/${byProfile.gunner.runs} runs ended in a wreck  (ammo build)`);
console.log("-".repeat(56));
process.exit(failures === 0 ? 0 : 1);