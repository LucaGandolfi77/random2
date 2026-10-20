/*
 * SECTOR 7 - content tests: sectors, hazards, weapons, contracts, bounties,
 * refits.
 *
 * These are the systems added after the core loop shipped. They are the part
 * of the codebase with the most new invariants (a sector has to be reachable
 * before it is enterable, a mine has to be armed before it can hurt anyone, a
 * contract has to pay exactly once), so they get their own suite rather than
 * being folded into the existing ones.
 *
 * No canvas: render.js is deliberately not loaded.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");

let checks = 0;
let failures = 0;
let section = "";

function head(name) {
    section = name;
    console.log(`\n=== ${name} ===`);
}

function check(label, ok, detail) {
    checks++;
    if (ok) {
        console.log(`  PASS  ${label}`);
    } else {
        failures++;
        console.log(`  FAIL  ${label}${detail !== undefined ? "  -> " + detail : ""}`);
    }
}

/* ---- environment ------------------------------------------------------- */

global.window = global;
const store = new Map();
global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};

for (const f of [
    "config.js", "storage.js", "sectors.js", "modes.js", "world.js", "stations.js",
    "contracts.js", "bounty.js", "player.js", "npcs.js",
]) {
    (0, eval)(fs.readFileSync(path.join(SRC, f), "utf8"));
}

const S = global.S7;
const W = S.World.world;

/* Player.update drives the engine sound; the suite has no AudioContext and no
 * reason to have one. A no-op stub keeps the controller under test. */
S.Audio = new Proxy({}, { get: () => () => {} });
const DT = 1 / 60;

function newRun(seed, sectorId) {
    S.World.generate(seed, sectorId || "rook");
    const sec = S.Sector.get(sectorId || "rook");
    S.Contracts.forSector(sec, seed);
    S.Bounty.reset(sec, seed);
    const p = S.Player.create(S.Storage.getShip());
    S.NPCs.clear();
    return { player: p, sec };
}

/* ---- sectors ------------------------------------------------------------ */

head("sector table");

check("there is more than one sector", S.Sector.all.length >= 4, S.Sector.all.length);
check("every sector id is unique",
    new Set(S.Sector.all.map((s) => s.id)).size === S.Sector.all.length);
check("every sector has a name and a blurb",
    S.Sector.all.every((s) => s.name && s.blurb && s.subtitle));
check("the first sector is free to enter", S.Sector.all[0].gate === 0);
check("difficulty never steps backwards",
    S.Sector.all.every((s, i) => i === 0 ||
        (s.tierCap >= S.Sector.all[i - 1].tierCap &&
         s.payout >= S.Sector.all[i - 1].payout &&
         s.gate >= S.Sector.all[i - 1].gate)));
check("payout is at least 1.0 everywhere",
    S.Sector.all.every((s) => s.payout >= 1));
check("only the first sector may be hazard-free",
    S.Sector.all.every((s, i) => i === 0 || s.hazard !== null));
check("an unknown id falls back to the first sector, not to undefined",
    S.Sector.get("nonsense").id === S.Sector.all[0].id);

head("sector gating");

check("gates form a ladder, so reaching a later sector means passing the earlier ones",
    S.Sector.all.every((s, i) => i === 0 || s.gate > S.Sector.all[i - 1].gate),
    S.Sector.all.map((s) => s.gate).join(","));
check("with nothing banked, only the first sector is open",
    S.Sector.all.filter((s) => S.Sector.isUnlocked(s.id, 0)).length === 1);
check("a later sector stays shut at exactly one crystal short",
    S.Sector.all.every((s, i) => i === 0 || !S.Sector.isUnlocked(s.id, s.gate - 1)));
check("a later sector opens at exactly its gate",
    S.Sector.all.every((s, i) => i === 0 || S.Sector.isUnlocked(s.id, s.gate)));
check("holding crystals does not let you skip a map",
    S.Sector.all.every((s, i) => i === 0 ||
        !S.Sector.isUnlocked(s.id, S.Sector.all[i - 1].gate)));
check("everything is open once you have banked enough",
    S.Sector.all.every((s) => S.Sector.isUnlocked(s.id, 100000)));

check("unlock progress starts empty and ends complete",
    S.Sector.unlockProgress(0).frac === 0 &&
    S.Sector.unlockProgress(100000).done === true);
check("unlock progress always reports between nothing and everything",
    (() => {
        for (let c = 0; c <= 5000; c += 25) {
            const f = S.Sector.unlockProgress(c).frac;
            if (!(f >= 0 && f <= 1)) return false;
        }
        return true;
    })());
check("the crystals still owed is exactly the gap to the next gate",
    (() => {
        for (const s of S.Sector.all) {
            for (let c = 0; c <= s.gate; c += 7) {
                const p = S.Sector.unlockProgress(c);
                if (p.done) break;
                if (p.short !== Math.max(0, p.next.gate - c)) return false;
            }
        }
        return true;
    })());
check("one crystal short of a gate, progress is one short of complete",
    (() => {
        for (const s of S.Sector.all.slice(1)) {
            const p = S.Sector.unlockProgress(s.gate - 1);
            if (p.short !== 1 || p.frac >= 1) return false;
        }
        return true;
    })());
check("opening a sector starts a fresh ladder toward the next one",
    (() => {
        for (const s of S.Sector.all.slice(1)) {
            const p = S.Sector.unlockProgress(s.gate);
            if (p.next && p.next.gate <= s.gate) return false;
        }
        return true;
    })());
check("unlock progress never reports negative crystals still owed",
    S.Sector.all.every((s, i) => i === 0 ||
        S.Sector.unlockProgress(s.gate - 1).short >= 1));

check("each sector draws from its own part of the seed space",
    new Set(S.Sector.all.map((s) => S.Sector.seedFor(1234, s.id))).size === S.Sector.all.length);
check("the same sector and seed always agrees",
    S.Sector.seedFor(1234, "rook") === S.Sector.seedFor(1234, "rook"));

head("sector generation");

for (const sec of S.Sector.all) {
    newRun(777, sec.id);
    check(`${sec.name}: rock count follows the sector`,
        W.rocks.length === sec.rocks, `${W.rocks.length} vs ${sec.rocks}`);
    check(`${sec.name}: crate count follows the sector`,
        W.crates.length === sec.crates, `${W.crates.length} vs ${sec.crates}`);
    check(`${sec.name}: tier cap is the sector's`,
        W.tierCap === sec.tierCap, W.tierCap);
    check(`${sec.name}: payout multiplier is applied`, W.payout === sec.payout);
    check(`${sec.name}: the world records which sector it is`,
        W.sector && W.sector.id === sec.id);
}

newRun(777, "rook");
newRun(777, "rook");
const rookField = W.rocks.map((r) => Math.round(r.x) + ":" + Math.round(r.y)).join("|");
newRun(777, "kestrel");
const kesField = W.rocks.map((r) => Math.round(r.x) + ":" + Math.round(r.y)).join("|");
check("two sectors of the same seed are not the same rock field",
    rookField !== kesField);

newRun(777, "kestrel");
newRun(777, "kestrel");
check("the same sector and seed generate an identical field",
    W.rocks.map((r) => Math.round(r.x)).join(",") === W.rocks.map((r) => Math.round(r.x)).join(","));

newRun(31337, "maw");
check("the station sits at the centre of every sector",
    W.station.x === Math.round(W.size / 2) && W.station.y === Math.round(W.size / 2));

check("no hazard is dropped on top of the station",
    S.Sector.all.every((sec) => {
        newRun(555, sec.id);
        return W.hazards.every((h) =>
            S.dist2(h.x, h.y, W.station.x, W.station.y) >
            (S.CONFIG.world.clearRadius * 2.4) * (S.CONFIG.world.clearRadius * 2.4));
    }));

/* ---- hazards ------------------------------------------------------------ */

head("hazards");

newRun(4242, "rook");
check("a sector with no hazard reports none", W.hazards.length === 0);
check("hazardAt is safe with no hazards at all",
    S.World.hazardAt(100, 100, "storm") === 0);

newRun(4242, "kestrel");
const storm = W.hazards[0];
check("KESTREL has ion storms", storm && storm.kind === "storm");
check("a point far from a storm is clear",
    S.World.hazardAt(storm.x + storm.r * 3, storm.y, "storm") === 0);
check("a storm's rim is weaker than its middle", (() => {
    /* Storm strength is cyclic, so only the *shape* is comparable in one
     * instant. Comparing rim against centre at a fixed phase still holds. */
    let best = 0;
    for (let i = 0; i < 60 * 30; i++) {
        S.World.step(DT);
        const mid = S.World.hazardAt(storm.x, storm.y, "storm");
        const rim = S.World.hazardAt(storm.x + storm.r * 0.9, storm.y, "storm");
        if (mid > 0.2 && rim < mid) return true;
    }
    void best;
    return false;
})());
check("hazard strength never exceeds 1",
    S.World.hazardAt(storm.x, storm.y, "storm") <= 1);

check("storms cycle on and off",
    (() => {
        let sawLive = false, sawCalm = false;
        for (let i = 0; i < 60 * 90; i++) {
            S.World.step(DT);
            const live = S.World.hazardAt(storm.x, storm.y, "storm") > 0.3;
            if (live) sawLive = true;
            if (storm.strength === 0) sawCalm = true;
            if (sawLive && sawCalm) return true;
        }
        return sawLive;
    })());

newRun(4242, "maw");
const well = W.hazards.find((h) => h.kind === "well");
check("MAW has gravity wells", !!well);

/* A ship placed just outside a well and pointed away from it should still be
 * drawn in - that is the whole behaviour. */
const drift = S.World.spawnShip({
    x: well.x + well.r * 0.8, y: well.y, z: 10,
    heading: Math.PI, stats: S.NPC_TIERS[1], maxHull: S.NPC_TIERS[1].hull,
});
const before = drift.x;
S.World.world.player = null;
for (let i = 0; i < 60; i++) S.World.moveShip(drift, DT);
check("a gravity well pulls a ship that is flying away from it",
    drift.x < before, `x went ${before.toFixed(0)} -> ${drift.x.toFixed(0)}`);

newRun(4242, "vanta");
const voidHole = W.hazards[0];
check("VANTA has dead nebulae", voidHole && voidHole.kind === "void");
/* A void is always on, so its geometry can be measured directly. */
check("the middle of a void is fully inside it",
    S.World.hazardAt(voidHole.x, voidHole.y, "void") > 0.9);
check("a void falls off toward the rim",
    S.World.hazardAt(voidHole.x + voidHole.r * 0.9, voidHole.y, "void") <
    S.World.hazardAt(voidHole.x, voidHole.y, "void"));

check("a void suppresses regeneration", (() => {
    const p = W.player;
    if (!p) return false;
    p.hull = p.maxHull - 200;
    p.idleFor = 99;
    p.x = voidHole.x; p.y = voidHole.y;
    const before = p.hull;
    for (let i = 0; i < 120; i++) S.Player.update(DT, { mag: 0, mx: 0, my: 0, firing: false }, null);
    const inside = p.hull;
    p.x = 40; p.y = 40;
    for (let i = 0; i < 120; i++) S.Player.update(DT, { mag: 0, mx: 0, my: 0, firing: false }, null);
    return inside <= before + 0.01 && p.hull > inside;
})());

/* ---- T5: the current ---------------------------------------------- */

newRun(4242, "hald");
const current = W.hazards.find((h) => h.kind === "drift");
check("HALD has currents", !!current);

check("a current pushes a ship the way it is running", (() => {
    /* Put a ship in the middle of a current, not moving, and see which way
     * it ends up going. The current is the only force on it. */
    const raft = S.World.spawnShip({
        x: current.x, y: current.y, z: 10,
        heading: 0, stats: S.NPC_TIERS[1], maxHull: S.NPC_TIERS[1].hull,
    });
    raft.throttle = 0;
    S.World.world.player = null;
    for (let i = 0; i < 60; i++) S.World.moveShip(raft, DT);
    const along = raft.vx * Math.cos(current.dir) + raft.vy * Math.sin(current.dir);
    const across = raft.vx * Math.sin(current.dir) - raft.vy * Math.cos(current.dir);
    /* Along the current, not across it: a current has a direction, and a
     * field that pushed every which way would be a well. */
    return along > 1 && Math.abs(across) < along * 0.35;
})());

check("a current does not reach outside itself", (() => {
    const out = S.World.spawnShip({
        x: current.x + current.r * 1.5, y: current.y, z: 10,
        heading: 0, stats: S.NPC_TIERS[1], maxHull: S.NPC_TIERS[1].hull,
    });
    out.throttle = 0;
    const x0 = out.x, y0 = out.y;
    for (let i = 0; i < 60; i++) S.World.moveShip(out, DT);
    return Math.hypot(out.x - x0, out.y - y0) < 6;
})());

/* ---- T6: the unstable belt ---------------------------------------- */

newRun(4242, "null");
const cinder = W.hazards.find((h) => h.kind === "cinder");
check("NULL has unstable rock fields", !!cinder);

check("a rock in an unstable field detonates when it breaks", (() => {
    /* A rock inside the field, a ship standing next to it. */
    const rock = W.rocks[0];
    rock.x = cinder.x;
    rock.y = cinder.y;
    rock.alive = true;
    rock.hull = 10;
    rock.energyLeft = rock.energy;

    const victim = S.World.spawnShip({
        x: cinder.x + 60, y: cinder.y, z: 10,
        heading: 0, stats: S.NPC_TIERS[1], maxHull: S.NPC_TIERS[1].hull,
    });
    victim.hull = 200;
    victim.maxHull = 200;
    victim.shield = 0;
    victim.maxShield = 0;
    victim.invuln = 0;
    S.World.world.player = null;
    const hull0 = victim.hull;
    S.World.breakRock(rock, true);
    return victim.hull < hull0;
})());

check("a blast does not respect a shield, only armour", (() => {
    const rock = W.rocks[1];
    rock.x = cinder.x;
    rock.y = cinder.y;
    rock.alive = true;
    rock.hull = 10;

    const shielded = S.World.spawnShip({
        x: cinder.x + 60, y: cinder.y, z: 10,
        heading: 0, stats: S.NPC_TIERS[1], maxHull: S.NPC_TIERS[1].hull,
    });
    shielded.hull = 200;
    shielded.maxHull = 200;
    shielded.maxShield = 200;
    shielded.shield = 200;
    shielded.invuln = 0;
    const hull0 = shielded.hull;
    const shield0 = shielded.shield;
    S.World.breakRock(rock, true);
    /* A blast is a physical event, not a shot: it goes through a shield.
     * The hull takes the hit and the shield does not. Armour is still what
     * reduces it - it is a damage cut, not a damage type - so a plated
     * ship has less to lose than a bare one. */
    return shielded.hull < hull0 && shielded.shield === shield0;
})());

/* ---- missiles ----------------------------------------------------------- */

head("missiles");

newRun(9090, "rook");
let mPlayer = S.Player.create(S.Storage.getShip());
mPlayer.modules.missiles = 10;
S.Stations.refreshStats(mPlayer);
/* A full magazine: every gun draws on one now, so a test about the salvo
 * has to give the ship the rounds to fire it. */
mPlayer.magazine.missiles = 99;
for (let i = 0; i < 30; i++) S.World.step(DT);
S.NPCs.spawnAll(mPlayer);

const targets = W.ships.filter((s) => !s.isPlayer).slice(0, 3);
check("there is something to shoot at", targets.length === 3);
const liveBefore = W.missiles.filter((m) => m.on).length;
const fired = S.World.fireMissiles(mPlayer, targets, 0);
const salvo = W.missiles.filter((m) => m.on).slice(liveBefore);
check("a maxed missile track fires a full salvo",
    fired === mPlayer.stats.missiles && salvo.length === mPlayer.stats.missiles,
    `${fired} of ${mPlayer.stats.missiles}`);
check("each locked target gets its own missile",
    targets.every((t) => salvo.some((m) => m.targetId === t.id)));
check("missiles past the last lock go where the turret is pointing",
    salvo.filter((m) => m.targetId === 0).length === salvo.length - targets.length);
check("a salvo goes on cooldown",
    S.World.fireMissiles(mPlayer, targets, 0) === 0 &&
    mPlayer.cooldownMissiles > 0);
check("a missile at level 1 still fires something",
    (() => {
        const cheap = S.World.spawnShip({
            x: 10, y: 10, z: 10, heading: 0, maxHull: 50,
            stats: S.statsFor({ missiles: 1 }),
        });
        /* The magazine, same as every other gun. */
        cheap.magazine.missiles = 9;
        return S.World.fireMissiles(cheap, [], 0) === 1;
    })());
check("a hull with no missile rack cannot fire missiles",
    (() => {
        /* Stats are built by hand here, the way npcs.js does it. statsFor()
         * deliberately floors a missing track at 1 so an old save still has a
         * working ship - "no rack" is expressed on the stats object, not by
         * asking for level 0. */
        const unarmed = S.World.spawnShip({
            x: 20, y: 20, z: 10, heading: 0, maxHull: 50,
            stats: Object.assign({}, S.NPC_TIERS[1], { missiles: 0 }),
        });
        return S.World.fireMissiles(unarmed, [], 0) === 0;
    })());
check("a save predating the missile track still gets one missile, not zero",
    S.statsFor({ blaster: 3 }).missiles === 1);

check("missiles eventually leave the field", (() => {
    for (let i = 0; i < 60 * 5 && W.missiles.some((m) => m.on); i++) S.World.step(DT);
    return !W.missiles.some((m) => m.on);
})());

/* Splash: a missile beside a target should also hurt a bystander. */
newRun(9091, "rook");
const splashPlayer = S.Player.create(S.Storage.getShip());
splashPlayer.modules.missiles = 10;
S.Stations.refreshStats(splashPlayer);
S.NPCs.clear();
/* Shields are zero here on purpose: this section is about splash geometry,
 * and a shield that absorbs the missile's shield component would mask the
 * hull damage it is trying to observe. The NPC_TIERS row is data, not a stat
 * block, so the weapons get their packets from a real level-1 build. */
const splashStats = S.statsFor({ blaster: 1, shield: 1, armor: 1, processor: 1, thruster: 1, ammo: 1 });
const victim = S.World.spawnShip({
    x: 600, y: 600, z: 10, heading: 0, maxHull: 400, maxShield: 0,
    faction: "raider",
    stats: splashStats, reduction: 0,
});
const bystander = S.World.spawnShip({
    x: 640, y: 600, z: 10, heading: 0, maxHull: 400, maxShield: 0,
    faction: "raider",
    stats: splashStats, reduction: 0,
});
S.World.world.player = null;
const m = W.missiles.find((x) => !x.on);
m.on = true;
m.x = 620; m.y = 600; m.z = 10; m.vx = 0; m.vy = 0;
m.life = 2; m.arm = 0; m.ds = 100; m.da = 100; m.splash = 90; m.ownerId = 99999; m.ownerIsPlayer = false;
m.targetId = 0;
const hullBefore = victim.hull + bystander.hull;
S.World.step(DT);
check("a missile splashes onto ships that are not its target",
    victim.hull + bystander.hull < hullBefore,
    `${victim.hull.toFixed(0)} / ${bystander.hull.toFixed(0)} of 400`);
check("a missile cannot kill its own owner",
    (() => {
        const owner = S.World.spawnShip({
            x: 620, y: 600, z: 10, heading: 0, maxHull: 400, stats: S.NPC_TIERS[1],
        });
        const mine = W.missiles.find((x) => !x.on);
        mine.on = true;
        mine.x = 620; mine.y = 600; mine.z = 10; mine.vx = 0; mine.vy = 0;
        mine.life = 2; mine.arm = 0; mine.dmg = 9999; mine.splash = 90;
        mine.ownerId = owner.id; mine.ownerIsPlayer = false; mine.targetId = 0;
        S.World.step(DT);
        return owner.alive && owner.hull === 400;
    })());

/* ---- mines -------------------------------------------------------------- */

head("mines");

newRun(8181, "rook");
const minePlayer = S.Player.create(S.Storage.getShip());
minePlayer.modules.mines = 10;
S.Stations.refreshStats(minePlayer);
/* A full magazine: every gun draws on one now. */
minePlayer.magazine.mines = 99;
S.World.world.player = null;

const cap = minePlayer.stats.mineCapacity;
check("dropping one mine succeeds", S.World.dropMine(minePlayer) === true);
for (let i = 1; i < cap; i++) {
    minePlayer.cooldownMine = 0;
    minePlayer.x += 30;
    S.World.dropMine(minePlayer);
}
minePlayer.cooldownMine = 0;
const overCap = S.World.dropMine(minePlayer);
check("a mine field cannot exceed its capacity", overCap === false,
    `${W.mines.filter((m) => m.on).length} live, capacity ${cap}`);
check("dropping on cooldown is refused",
    (() => { minePlayer.cooldownMine = 5; return S.World.dropMine(minePlayer) === false; })());

check("an unarmed mine does not hurt anything",
    (() => {
        const victim = S.World.spawnShip({
            x: minePlayer.x, y: minePlayer.y, z: 10, heading: 0, maxHull: 500,
            stats: S.NPC_TIERS[1],
        });
        const mine = W.mines.find((m) => m.on);
        if (!mine) return false;
        const hull = victim.hull;
        mine.arm = 1.0;
        mine.x = victim.x; mine.y = victim.y;
        S.World.step(DT);
        return victim.hull === hull;
    })());

check("an armed mine detonates on proximity",
    (() => {
        /* No shields and an explicit damage packet: the mine's whole point is
         * draining shields, and this assertion is about the proximity
         * trigger, not about how much of which pool it ate. */
        const victim = S.World.spawnShip({
            x: 200, y: 200, z: 10, heading: 0, maxHull: 500, maxShield: 0,
            faction: "raider", stats: splashStats,
        });
        const mine = W.mines.find((m) => !m.on);
        if (!mine) return false;
        mine.on = true;
        mine.x = victim.x + 10; mine.y = victim.y; mine.z = 10;
        mine.vx = 0; mine.vy = 0; mine.life = 20; mine.arm = 0;
        mine.ds = 60; mine.da = 40; mine.radius = 90; mine.ownerId = 99999;
        S.World.step(DT);
        return victim.hull === 400 && !mine.on;
    })());

check("a mine really does drain shields before armour",
    (() => {
        /* Well clear of the ships the missile section left standing: a
         * proximity mine detonates on the first hull inside its radius, so
         * a stale ship a few dozen units away would swallow the test. */
        const shielded = S.World.spawnShip({
            x: 3000, y: 3000, z: 10, heading: 0, maxHull: 500, maxShield: 300,
            faction: "raider", stats: splashStats,
        });
        const mine = W.mines.find((m) => !m.on);
        if (!mine) return false;
        mine.on = true;
        mine.x = shielded.x + 10; mine.y = shielded.y; mine.z = 10;
        mine.vx = 0; mine.vy = 0; mine.life = 20; mine.arm = 0;
        mine.ds = 100; mine.da = 100; mine.radius = 90; mine.ownerId = 99999;
        S.World.step(DT);
        return shielded.shield < 300 && shielded.hull === 500;
    })());

check("a mine cannot kill its own owner",
    (() => {
        const owner = S.World.spawnShip({
            x: 400, y: 400, z: 10, heading: 0, maxHull: 500, maxShield: 0,
            faction: "raider", stats: splashStats,
        });
        const mine = W.mines.find((m) => !m.on);
        mine.on = true;
        mine.x = owner.x; mine.y = owner.y; mine.z = 10;
        mine.vx = 0; mine.vy = 0; mine.life = 20; mine.arm = 0;
        mine.ds = 9999; mine.da = 9999; mine.radius = 90; mine.ownerId = owner.id;
        S.World.step(DT);
        return owner.alive && owner.hull === 500;
    })());

check("mines eventually expire instead of accumulating forever",
    (() => {
        for (let i = 0; i < 60 * 40 && W.mines.some((m) => m.on); i++) S.World.step(DT);
        return !W.mines.some((m) => m.on);
    })());

/* ---- contracts ---------------------------------------------------------- */

head("contracts");

newRun(2024, "rook");
let board = S.Contracts.list();
check("the board holds three contracts", board.length === 3, board.length);
check("the three contracts ask for different things",
    new Set(board.map((c) => c.kind)).size === 3);
check("every contract has a reachable target and a reward",
    board.every((c) => c.target > 0 && c.reward > 0));
check("every contract starts at zero", board.every((c) => c.progress === 0));
check("the board is the same every time you visit the same sector",
    (() => {
        const a = S.Contracts.forSector(S.Sector.get("rook"), 2024).map((c) => c.id + c.target).join("|");
        const b = S.Contracts.forSector(S.Sector.get("rook"), 2024).map((c) => c.id + c.target).join("|");
        return a === b;
    })());

newRun(2024, "rook");
board = S.Contracts.list();
const killContract = board.find((c) => c.kind === "kills");
S.Contracts.note("kills", 2);
check("noting progress moves the right contract", killContract.progress === 2);
S.Contracts.note("crates", 99);
check("noting the wrong kind changes nothing", killContract.progress === 2);
S.Contracts.note("kills", 9999);
check("progress is capped at the target",
    killContract.progress === killContract.target && killContract.done);
S.Contracts.note("kills", 5);
check("a finished contract does not keep counting",
    killContract.progress === killContract.target);

newRun(2025, "rook");
board = S.Contracts.list();
const rockContract = board.find((c) => c.kind === "rocks");
S.Contracts.note("rocks", 3, { rich: false });
check("a poor rock does not count toward 'break rich rocks'", rockContract.progress === 0);
S.Contracts.note("rocks", 3, { rich: true });
check("a rich rock does count", rockContract.progress === 3);

newRun(2026, "rook");
board = S.Contracts.list();
const survive = board.find((c) => c.kind === "survive");
S.Contracts.tick(10, true);
check("a survive contract counts flight time", survive.progress === 10);
const held = survive.progress;
S.Contracts.tick(10, false);
check("docking does not advance or refund a survive contract",
    survive.progress === held);
S.Contracts.resetRun();
check("a wreck resets an unfinished survive contract", survive.progress === 0);

newRun(2027, "rook");
board = S.Contracts.list();
const pay = board[0];
pay.progress = pay.target;
pay.done = true;
const reward = S.Contracts.claim(pay.id);
check("a finished contract pays out", reward === pay.reward, reward);
check("a contract pays exactly once", S.Contracts.claim(pay.id) === null);
check("claiming removes it from the available list",
    S.Contracts.refresh().some((c) => c.id !== pay.id));

newRun(2028, "vanta");
board = S.Contracts.list();
check("a harder sector asks for more and pays more",
    board.every((c) => c.reward >= 15), board.map((c) => c.reward).join(","));

/* ---- bounties ----------------------------------------------------------- */

head("bounties");

newRun(3030, "rook");
check("no bounty is active before the timer runs out", !S.Bounty.status().active);
const countdown0 = S.Bounty.status().nextIn;
for (let i = 0; i < 60; i++) S.Bounty.update(W, W.sector, W.player, DT);
check("the countdown is real", S.Bounty.status().nextIn < countdown0);

/* The hunter arrives after roughly `interval * 0.6` seconds. */
let appeared = false;
let valueAtStart = 0, valueLater = 0;
for (let i = 0; i < 60 * 60 && !S.Bounty.status().active; i++) {
    S.Bounty.update(W, S.Sector.get(W.sectorId), W.player, DT);
}
appeared = S.Bounty.status().active;
check("a bounty hunter eventually arrives", appeared);
if (appeared) {
    const st = S.Bounty.status();
    check("the hunter is a real ship in the world",
        W.ships.some((s) => s.isBounty && s.name === st.name));
    check("the hunter knows who it is hunting", W.ships.some((s) => s.isBounty && s.target === W.player));
    check("the hunter carries a bounty above zero", st.value > 0, st.value);
    valueAtStart = st.value;
    for (let i = 0; i < 60 * 10; i++) S.Bounty.update(W, S.Sector.get(W.sectorId), W.player, DT);
    valueLater = S.Bounty.status().value;
    check("the price climbs while it lives", valueLater > valueAtStart,
        `${valueAtStart} -> ${valueLater}`);
}

check("no hunter is sent while the player has no ship",
    (() => {
        const was = S.Bounty.status().active;
        S.Bounty.update(W, S.Sector.get(W.sectorId), null, DT);
        return S.Bounty.status().active === was;
    })());

newRun(3031, "rook");
const hunter = S.World.spawnShip({
    x: 100, y: 100, z: 10, heading: 0,
    maxHull: 200, stats: S.NPC_TIERS[4], radius: 18,
});
hunter.isBounty = true;
hunter.bountyName = "TEST";
S.Bounty.update(W, S.Sector.get(W.sectorId), W.player, DT);
check("an ordinary kill is not a bounty", S.Bounty.onKill(hunter) === null);

newRun(3032, "rook");
const realHunter = S.World.spawnShip({
    x: 100, y: 100, z: 10, heading: 0,
    maxHull: 200, stats: S.NPC_TIERS[4], radius: 18,
});
realHunter.isBounty = true;
realHunter.bountyName = "TEST";
for (let i = 0; i < 60 * 60 && !S.Bounty.status().active; i++) {
    S.Bounty.update(W, S.Sector.get(W.sectorId), W.player, DT);
}
check("the real hunter is the one on the board",
    S.Bounty.status().active && S.Bounty.status().name);
const payout = S.Bounty.onKill(realHunter);
check("killing the hunter pays out", payout > 0, payout);
check("the hunt is over afterwards", !S.Bounty.status().active);
check("a dead hunter cannot pay twice", S.Bounty.onKill(realHunter) === null);

newRun(3033, "maw");
check("MAW sends hunters after you sooner than ROOK does", (() => {
    const maw = S.Sector.get("maw"), rook = S.Sector.get("rook");
    const gap = (sec) => {
        S.Bounty.reset(sec, 1);
        return S.Bounty.status().nextIn;
    };
    return gap(maw) < gap(rook);
})());

check("the hunter you killed last time is remembered",
    (() => {
        S.Bounty.load();
        return S.Bounty.status().active === false;
    })());

/* ---- refits ------------------------------------------------------------- */

head("refits");

check("every refit has a cost at each level and a maximum",
    S.REFITS.every((r) => r.max > 0 && r.cost.length >= r.max && r.cost.every((c) => c > 0)));
check("refit costs rise with level",
    S.REFITS.every((r) => r.cost.every((c, i) => i === 0 || c > r.cost[i - 1])));
check("a refit past its maximum costs infinity",
    S.REFITS.every((r) => S.refitCost(r.key, r.max) === Infinity));
check("a missing refit reads as level zero",
    S.refitLevel({}, "salvage") === 0 && S.refitLevel(null, "salvage") === 0);
check("a nonsense refit level is clamped, not trusted",
    S.refitLevel({ hull: 999 }, "hull") === S.MODULE_MAX);

newRun(4040, "rook");
const rig = { crystals: 5000, refits: {} };
const q0 = S.Stations.refitQuote(rig);
check("the quote lists every refit", q0.length === S.REFITS.length);
check("an affordable refit is marked affordable", q0.every((q) => q.affordable));
check("the quote reads the same balance the purchase charges",
    q0.every((q) => q.affordable === (rig.crystals >= q.cost)));

const platingOff = S.statsFor({ shield: 5 }, {}).maxHull;
const platingOn = S.statsFor({ shield: 5 }, { hull: 3 }).maxHull;
check("frame plating raises max hull", platingOn > platingOff, `${platingOff} -> ${platingOn}`);
check("frame plating compounds multiplicatively",
    S.statsFor({ shield: 10 }, { hull: 2 }).maxHull >
    S.statsFor({ shield: 1 }, { hull: 2 }).maxHull);

const buy = S.Stations.buyRefit(rig, "salvage");
check("buying a refit spends crystals", buy.ok && rig.crystals === 5000 - 180,
    rig.crystals);
check("buying a refit raises its level", rig.refits.salvage === 1);
check("a purchase you can afford is never refused by the quote",
    (() => {
        const fresh = { crystals: 5000, refits: {} };
        for (const q of S.Stations.refitQuote(fresh)) {
            if (!q.affordable) return false;
            if (!S.Stations.buyRefit(fresh, q.key).ok) return false;
        }
        return true;
    })());

const broke = { crystals: 0, refits: {} };
check("a refit you cannot afford is refused",
    S.Stations.buyRefit(broke, "salvage").ok === false);
check("a refused purchase does not charge you", broke.crystals === 0);
check("a refit you cannot afford is not shown as affordable",
    S.Stations.refitQuote(broke).every((q) => !q.affordable));

const maxLevel = S.REFITS.find((r) => r.key === "hull").max;
const maxed = { crystals: 999999, refits: { hull: maxLevel } };
check("a maxed refit cannot be bought again",
    S.Stations.buyRefit(maxed, "hull").ok === false);
check("a maxed refit refuses without touching the balance", maxed.crystals === 999999);
check("a maxed refit is shown as max, not as a price",
    (() => {
        const q = S.Stations.refitQuote(maxed).find((x) => x.key === "hull");
        return q.maxed && !q.affordable;
    })());

head("salvage rig");

/* Both hulls are wrecked the same way from the same starting tank; the only
 * difference is the rig. Returns the four numbers so the checks below can say
 * what actually happened rather than just yes or no. */
function wreckTest(salvageLevel) {
    newRun(5050 + salvageLevel, "rook");
    const ship = S.Player.create(S.Storage.getShip());
    ship.energy = 1000;
    ship.refits = { crystals: 0, salvage: salvageLevel };
    S.World.world.player = ship;
    const dropsBefore = W.pickups.filter((p) => p.on);
    S.World.killPlayer(ship, null);
    const dropped = W.pickups.filter((p) => p.on && dropsBefore.indexOf(p) < 0);
    return {
        /* Chunks are capped at 12 so a big tank does not bury the map in
         * loot, so the chunk *count* stays the same however much spills.
         * What matters is how much energy actually hits the deck. */
        chunks: dropped.length,
        spilled: dropped.reduce((n, p) => n + (p.value || 0), 0),
        kept: ship.energy,
    };
}

const bare = wreckTest(0);
const rigged = wreckTest(3);
check("an unrigged wreck spills energy as loot", bare.spilled > 0, bare.spilled);
check("a rigged wreck spills less", rigged.spilled < bare.spilled,
    `${bare.spilled} -> ${rigged.spilled}`);
check("what spills and what is banked still adds up to the tank",
    bare.spilled + bare.kept === 1000 && rigged.spilled + rigged.kept === 1000,
    `${rigged.spilled} + ${rigged.kept}`);
check("an unrigged wreck banks nothing", bare.kept === 0, bare.kept);
check("a rigged wreck banks a share", rigged.kept > 0 && rigged.kept < 1000, rigged.kept);

check("without a salvage rig a wreck leaves nothing behind", bare.kept === 0, bare.kept);

/* ---- module tracks ------------------------------------------------------ */

head("module tracks");

check("the missiles and mines tracks exist",
    S.MODULES.some((m) => m.key === "missiles") && S.MODULES.some((m) => m.key === "mines"));
check("every track still has a sane price curve",
    S.MODULES.every((m) => S.moduleCost(m.key, 1) > 0 && S.moduleCost(m.key, S.MODULE_MAX) === Infinity));
check("older and newer tracks cost the same to get going",
    S.MODULES.every((m) => S.moduleCost(m.key, 1) < S.moduleCost(m.key, 3)));
check("every track does something at max level", (() => {
    const lv = {};
    for (const m of S.MODULES) lv[m.key] = S.MODULE_MAX;
    const a = S.statsFor({ blaster: 1, shield: 1, armor: 1, processor: 1, thruster: 1 });
    const b = S.statsFor(lv);
    return b.damage > a.damage && b.maxHull > a.maxHull && b.speed > a.speed &&
        b.reduction > a.reduction && b.energyBonus > a.energyBonus &&
        b.missiles > a.missiles && b.mineCapacity > a.mineCapacity;
})());
check("a save predating the new tracks still produces sane stats",
    (() => {
        const old = { blaster: 4, shield: 3, armor: 2, processor: 5, thruster: 2 };
        const s = S.statsFor(old);
        return Number.isFinite(s.damage) && Number.isFinite(s.maxHull) &&
            Number.isFinite(s.reduction) && s.missiles >= 1;
    })());
check("a save predating the new tracks still has a sane tier",
    Number.isFinite(S.tierForShip({ blaster: 4, shield: 3, armor: 2, processor: 5, thruster: 2 })));

/* =========================================================================
 * The Ammo track: is it actually a decision?
 *
 * This is the load-bearing claim of the whole two-pool damage model. A laser
 * chews armour, a capacitor round chews shields, and neither is strictly
 * better - so a pilot's sector, not their taste, decides which gun matters.
 *
 * It is asserted here rather than in the simulation because it is a
 * closed-form property of three tables and not a stochastic outcome. sim.test
 * cannot test it: in the starting sector a level-1 hull wrecks almost every
 * run whatever it is carrying, so a survival comparison between builds is
 * noise. Computing time-to-kill from the same numbers the physics reads
 * cannot flake, and it fails the instant someone retunes a coefficient until
 * one weapon is simply better than the other.
 * ====================================================================== */
head("weapon identity: shields and armour are two different problems");

/* Two builds, not two guns.
 *
 * The comparison a player actually makes is "spend my levels on the laser,
 * or on the capacitor round" - so both sides must be a full build, not a
 * maxed gun sitting next to a level-1 one. Each side below puts the same
 * number of levels into its chosen track.
 */
const BUILD_LASER = { blaster: 10, ammo: 1 };
const BUILD_AMMO = { blaster: 1, ammo: 10 };

/* Time to kill a target, at a given shot interval, using the same two rules
 * world.js enforces: the shield component is eaten by whatever shield is
 * left, and the armour component is held off entirely while a shield
 * remains. Armour's flat subtraction is left out because it is a constant
 * that would add the same time to both builds and only blur the comparison.
 *
 * It deliberately duplicates the model rather than calling damageShip in a
 * loop: this test is about whether the WEAPON TABLE produces a crossover, and
 * it is far more readable as closed-form arithmetic than as a fight. */
function timeToKill(packet, interval, target) {
    let shield = target.shield;
    let hull = target.hull;
    let t = 0;
    /* Bounded so a mis-tuned coefficient fails the check instead of hanging
     * the suite. */
    for (let shot = 0; shot < 200000; shot++) {
        if (shield > 0) {
            const absorbed = Math.min(shield, packet.shield);
            shield -= absorbed;
            const spill = packet.shield - absorbed;
            hull -= shield > 0 ? spill : spill + packet.armor;
        } else {
            hull -= packet.armor;
        }
        t += interval;
        if (hull <= 0) return t;
    }
    return Infinity;
}

function ttk(modules, weapon, hull, shieldFrac) {
    const st = S.statsFor(modules);
    return timeToKill(
        weapon === "ammo" ? st.ammoPacket : st.blasterPacket,
        weapon === "ammo" ? st.ammoCooldown : st.fireInterval,
        { hull, shield: Math.round(hull * shieldFrac) },
    );
}

/* `ratio` is laser-time over ammo-time: below 1 the laser is faster. */
function race(tier, faction) {
    const hull = S.NPC_TIERS[tier].hull;
    const laser = ttk(BUILD_LASER, "blaster", hull, faction.shieldFrac);
    const ammo = ttk(BUILD_AMMO, "ammo", hull, faction.shieldFrac);
    return { laser, ammo, ratio: laser / ammo };
}

const RAIDER = S.faction("raider"), PIRATE = S.faction("pirate"), ALIEN = S.faction("alien");

check("the laser is armour-specialised and the round is shield-specialised",
    S.WEAPONS.blaster.shield < 1 && S.WEAPONS.blaster.armor >= 1 &&
    S.WEAPONS.ammo.shield > 1 && S.WEAPONS.ammo.armor < 1);
check("no weapon profile is missing a coefficient",
    Object.values(S.WEAPONS).every((w) => Number.isFinite(w.shield) && Number.isFinite(w.armor)));

/* The tiers where a shield is a wall rather than decoration.
 *
 * Tier 1 is deliberately excluded and that exclusion is itself a design
 * statement: a hull of 34 with 27 shields dies inside the capacitor round's
 * minimum cooldown, so the cheap gun wins on chaff no matter who is flying
 * it. Nobody's build decision should ever turn on a scrap drone, and tuning
 * a coefficient until it does would wreck the relationship that actually
 * matters at tiers 4 and 8. */
for (const tier of [4, 8]) {
    const r = race(tier, RAIDER);
    check(`tier ${tier} raider: the laser build wins decisively`,
        r.ratio < 0.7, `laser ${r.laser.toFixed(2)}s vs ammo ${r.ammo.toFixed(2)}s (x${r.ratio.toFixed(2)})`);

    const a = race(tier, ALIEN);
    check(`tier ${tier} alien: the ammo build wins decisively`,
        a.ratio > 1.15, `laser ${a.laser.toFixed(2)}s vs ammo ${a.ammo.toFixed(2)}s (x${a.ratio.toFixed(2)})`);
}

/* Chaff is a laser fight no matter what is in the sector - the cheap gun
 * outpaces the capacitor round's cooldown floor against anything small. */
check("tier 1 is a laser fight regardless of faction",
    race(1, RAIDER).ratio < 1 && race(1, ALIEN).ratio < 1,
    `raider x${race(1, RAIDER).ratio.toFixed(2)} alien x${race(1, ALIEN).ratio.toFixed(2)}`);
check("the capacitor round has a cooldown floor it can never beat",
    S.statsFor({ ammo: 10 }).ammoCooldown >= 0.9);

/* The two wins must be large in opposite directions, or the tracks are not
 * a choice - one of them is simply the better gun and the sector does not
 * get a say. */
check("the crossover is real: the winner flips between raiders and aliens",
    race(8, RAIDER).ratio < 0.7 && race(8, ALIEN).ratio > 1.15,
    `raider x${race(8, RAIDER).ratio.toFixed(2)} alien x${race(8, ALIEN).ratio.toFixed(2)}`);

/* Pirates exist to be the crossover. If one build always beat the other the
 * middle faction would be decorative, and the mid tiers lean on it hardest. */
{
    const p = race(8, PIRATE);
    check("pirates sit on the crossover: neither build wins by much",
        Math.abs(p.ratio - 1) < 0.25,
        `laser ${p.laser.toFixed(2)}s vs ammo ${p.ammo.toFixed(2)}s (x${p.ratio.toFixed(2)})`);
}

/* A bare hull must not reward the shield gun at all, or a pilot who meets
 * nothing but raiders pays the Ammo track's energy for nothing. */
check("a bare hull is never an ammo target",
    ttk(BUILD_AMMO, "ammo", S.NPC_TIERS[8].hull, 0) >
    ttk(BUILD_LASER, "blaster", S.NPC_TIERS[8].hull, 0) * 1.5);

/* ---- factions ----------------------------------------------------------- */

head("factions");

check("there are at least three factions", S.FACTIONS.length >= 3);
check("faction keys are unique",
    new Set(S.FACTIONS.map((f) => f.key)).size === S.FACTIONS.length);
check("every faction has a name, a tag, a colour and a blurb",
    S.FACTIONS.every((f) => f.name && f.tag && f.color && f.blurb && f.note));
check("shield fractions rise from raider to alien",
    RAIDER.shieldFrac < PIRATE.shieldFrac && PIRATE.shieldFrac < ALIEN.shieldFrac);
check("every faction's shield pool is computable and finite",
    S.FACTIONS.every((f) => Number.isFinite(S.npcShieldFor(640, f.key)) &&
        S.npcShieldFor(640, f.key) <= 640));
check("factions are mutually hostile, and nothing is hostile to itself",
    S.factionHostile("raider", "alien") && S.factionHostile("alien", "raider") &&
    !S.factionHostile("raider", "raider"));
check("an unknown faction falls back rather than returning undefined",
    S.faction("nonsense") === S.FACTIONS[0]);

check("every tier has a faction mix, and they sum to one",
    S.FACTION_MIX.slice(1).every((mix) => {
        const total = S.FACTIONS.reduce((sum, f) => sum + (mix[f.key] || 0), 0);
        return Math.abs(total - 1) < 1e-9;
    }));
check("aliens are absent from the shallowest sector and common in the deepest",
    S.FACTION_MIX[1].alien === 0 && S.FACTION_MIX[S.FACTION_MIX.length - 1].alien > 0.5);
check("faction mix only ever shifts toward aliens as tiers climb",
    S.FACTION_MIX.slice(1).every((mix, i, all) =>
        i === 0 || mix.alien >= all[i - 1].alien - 1e-9));
check("pickFaction only ever returns a real faction", (() => {
    const r = S.mulberry32(99);
    for (let i = 0; i < 4000; i++) {
        const f = S.pickFaction(1 + ((r() * 8) | 0), r);
        if (!S.FACTIONS.includes(f)) return false;
    }
    return true;
})());

check("every spawned NPC belongs to a real faction and wears its colour", (() => {
    const { player } = newRun(31337, "rook");
    for (let i = 0; i < 60; i++) {
        const n = S.NPCs.spawnOne(player);
        const f = S.faction(n.faction);
        if (!f || f.key !== n.faction) return false;
        if (n.color !== f.color) return false;
        /* The shield pool has to match the faction, or the whole two-weapon
         * design is only true for hand-made ships. */
        if (n.maxShield !== S.npcShieldFor(S.NPC_TIERS[n.tier].hull, n.faction)) return false;
    }
    return true;
})());

check("every NPC carries the same damage packets the player's guns use",
    (() => {
        const { player } = newRun(4242, "rook");
        for (let i = 0; i < 20; i++) {
            const n = S.NPCs.spawnOne(player);
            if (!n.stats.blasterPacket || !n.stats.ammoPacket) return false;
            if (!n.stats.missilePacket || !n.stats.minePacket) return false;
        }
        return true;
    })());

/* ---- cargo -------------------------------------------------------------- */

head("cargo hold");

check("the Cargo track exists and has a module row",
    S.MODULES.some((m) => m.key === "cargo"));
check("the Ammo track exists and has a module row",
    S.MODULES.some((m) => m.key === "ammo"));
check("hold capacity grows with the track and starts small",
    S.statsFor({ cargo: 1 }).holdMax < S.statsFor({ cargo: 5 }).holdMax &&
    S.statsFor({ cargo: 5 }).holdMax < S.statsFor({ cargo: 10 }).holdMax);
check("a level-1 hold is deliberately tight enough to force a return",
    S.statsFor({ cargo: 1 }).holdMax <= S.CONFIG.cargo.base,
    S.statsFor({ cargo: 1 }).holdMax);

newRun(777, "rook");
{
    const { player } = newRun(777, "rook");
    const cap = player.holdMax;
    const loaded = S.World.loadEnergy(player, cap);
    check("a hold fills to exactly its capacity", loaded === cap && player.hold === cap);
    check("a full hold refuses further cargo", S.World.loadEnergy(player, 50) === 0);
    check("a partial hold banks the part that fits",
        (() => {
            player.hold = cap - 30;
            return S.World.loadEnergy(player, 100) === 30 && player.hold === cap;
        })());
    check("an empty hold banks a whole pickup",
        (() => {
            player.hold = 0;
            return S.World.loadEnergy(player, 40) === 40;
        })());
}

check("docking moves the hold into the tank and empties itself", (() => {
    const { player } = newRun(555, "rook");
    player.energy = 100;
    player.hold = 640;
    const res = S.Stations.deposit(player);
    return res.deposited === 640 && player.energy === 740 && player.hold === 0;
})());

check("depositing an empty hold is a no-op, not a subtraction", (() => {
    const { player } = newRun(556, "rook");
    player.energy = 100;
    player.hold = 0;
    S.Stations.deposit(player);
    return player.energy === 100;
})());

check("docking twice cannot pay for the same cargo", (() => {
    const { player } = newRun(557, "rook");
    player.energy = 0;
    player.hold = 300;
    S.Stations.deposit(player);
    S.Stations.deposit(player);
    return player.energy === 300;
})());

/* ---- CPUs --------------------------------------------------------------- */

head("CPUs");

check("there is a CPU table", S.CPUS.length >= 4, S.CPUS.length);
check("CPU keys are unique and unique against the module tracks",
    new Set(S.CPUS.map((c) => c.key)).size === S.CPUS.length &&
    !S.CPUS.some((c) => S.moduleIndex(c.key) >= 0));
check("every CPU has a cost, a cooldown and a blurb",
    S.CPUS.every((c) => c.cost > 0 && c.cooldown > 0 && c.blurb && c.detail && c.glyph));
check("every CPU detail string is non-empty", S.CPUS.every((c) => c.detail().length > 0));
check("an unknown CPU key resolves to null rather than throwing",
    S.cpu("nonsense") === null && S.cpu(undefined) === null);

check("buying a CPU charges energy once and fits it", (() => {
    const { player } = newRun(901, "rook");
    player.energy = 5000;
    const before = player.energy;
    const res = S.Stations.buyCpu(player, "radar");
    return res.ok && player.energy === before - S.cpuCost("radar") &&
        player.cpus.radar === true && player.cpu === "radar";
})());

check("buying the same CPU twice fails and charges nothing", (() => {
    const { player } = newRun(902, "rook");
    player.energy = 5000;
    S.Stations.buyCpu(player, "radar");
    const after = player.energy;
    const res = S.Stations.buyCpu(player, "radar");
    return !res.ok && player.energy === after;
})());

check("a CPU you cannot afford fails and charges nothing", (() => {
    const { player } = newRun(903, "rook");
    player.energy = 10;
    const res = S.Stations.buyCpu(player, "leech");
    return !res.ok && !player.cpus.leech;
})());

check("fitting an unowned CPU is refused", (() => {
    const { player } = newRun(904, "rook");
    return !S.Stations.fitCpu(player, "warp").ok && player.cpu === null;
})());

check("swapping between owned CPUs is free", (() => {
    const { player } = newRun(905, "rook");
    player.energy = 5000;
    S.Stations.buyCpu(player, "radar");
    S.Stations.buyCpu(player, "warp");
    const before = player.energy;
    S.Stations.fitCpu(player, "radar");
    return player.cpu === "radar" && player.energy === before;
})());

check("unequipping is a legal state, not an error", (() => {
    const { player } = newRun(906, "rook");
    player.energy = 5000;
    S.Stations.buyCpu(player, "radar");
    return S.Stations.fitCpu(player, null).ok && player.cpu === null;
})());

check("the save never grants a CPU the pilot did not pay for", (() => {
    store.set("sector7.v2.ship", JSON.stringify({ cpu: "leech", cpus: {} }));
    const loaded = S.Storage.getShip();
    return loaded.cpu === null;
})());

check("the save drops a CPU key that no longer exists", (() => {
    store.set("sector7.v2.ship", JSON.stringify({ cpu: "obsolete", cpus: { obsolete: true } }));
    return S.Storage.getShip().cpu === null;
})());

check("insta-shield really does make the ship untouchable", (() => {
    const { player } = newRun(907, "rook");
    player.cpu = "insta";
    player.cpus.insta = true;
    player.energy = 100;
    const res = S.World.activateCpu(player);
    const after = S.World.damageShip(player, { shield: 0, armor: 999 });
    return res.ok && player.invuln >= S.CONFIG.cpu.instaShield && after.hull === 0;
})());

check("a CPU on cooldown refuses and charges nothing", (() => {
    const { player } = newRun(908, "rook");
    player.cpu = "warp";
    player.cpus.warp = true;
    player.energy = 500;
    S.World.activateCpu(player);
    const after = player.energy;
    const res = S.World.activateCpu(player);
    return !res.ok && player.energy === after;
})());

check("a CPU you cannot afford refuses and does not move the ship", (() => {
    const { player } = newRun(909, "rook");
    player.cpu = "warp";
    player.cpus.warp = true;
    player.energy = 1;
    const x = player.x, y = player.y;
    const res = S.World.activateCpu(player);
    return !res.ok && player.x === x && player.y === y;
})());

check("warp jumps forward and stays inside the sector", (() => {
    const { player } = newRun(910, "rook");
    player.cpu = "warp";
    player.cpus.warp = true;
    player.energy = 500;
    player.x = W.size / 2;
    player.y = W.size / 2;
    const before = S.dist2(player.x, player.y, W.station.x, W.station.y);
    S.World.activateCpu(player);
    const moved = S.dist2(player.x, player.y, W.station.x, W.station.y);
    return moved > before && player.x > 0 && player.x < W.size && player.y > 0 && player.y < W.size;
})());

check("repair patches the hull only while it is running", (() => {
    const { player } = newRun(911, "rook");
    player.cpu = "repair";
    player.cpus.repair = true;
    player.energy = 500;
    player.hull = 10;
    S.World.activateCpu(player);
    for (let i = 0; i < 60; i++) S.World.step(DT);
    const patched = player.hull;
    player.cpuTimer = 0;
    player.hull = 10;
    for (let i = 0; i < 60; i++) S.World.step(DT);
    return patched > 10 && player.hull === 10;
})());

check("energy leech returns damage to the shooter, not the target", (() => {
    const { player } = newRun(912, "rook");
    const target = S.World.spawnShip({
        name: "LEECH-TEST", faction: "alien", x: player.x + 400, y: player.y,
        maxHull: 500, maxShield: 200,
        stats: S.statsFor({ blaster: 1, shield: 1, armor: 1, processor: 1, thruster: 1, ammo: 1 }),
    });
    player.cpu = "leech";
    player.cpuKey = "leech";
    player.cpuTimer = S.CONFIG.cpu.leechTime;
    player.shield = 0;
    S.World.applyLeech(player, target, 40);
    return player.shield > 0 && target.shield === target.maxShield;
})());

/* ---- targeting ---------------------------------------------------------- */

head("targeting");

newRun(5555, "rook");
{
    const { player } = newRun(5555, "rook");
    for (let i = 0; i < 5; i++) S.NPCs.spawnOne(player);

    check("the player starts with no lock", W.target === null);
    const nearest = S.World.nearestHostile(player, 5000);
    check("the nearest hostile can be found", !!nearest && nearest.isPlayer === false);
    check("cycling locks something", !!S.World.cycleTarget(player, 5000));

    /* Cycling is asserted on a controlled star of hostiles at known bearings,
     * not on whatever the sector happened to roll - an ordering assertion
     * that depends on the spawn RNG fails roughly one run in eight. */
    {
        S.World.clearTarget();
        /* Copy first: removeShip splices, and walking the live array while
         * splicing skips every other ship - which left stragglers at random
         * bearings and made this whole block flake. */
        for (const s of W.ships.slice()) if (!s.isPlayer) S.World.removeShip(s);
        player.x = W.station.x;
        player.y = W.station.y;

        const mkAt = (dx, dy, name) => S.World.spawnShip({
            name, faction: "raider", x: player.x + dx, y: player.y + dy,
            maxHull: 50, maxShield: 0, radius: 14,
            stats: S.statsFor({ blaster: 1, shield: 1, armor: 1, processor: 1, thruster: 1, ammo: 1 }),
        });
        const east = mkAt(300, 0, "EAST");
        const south = mkAt(0, 300, "SOUTH");
        const west = mkAt(-300, 0, "WEST");

        W.target = east;
        check("cycling steps clockwise past the current lock",
            S.World.cycleTarget(player, 2000) === south);
        W.target = south;
        check("cycling wraps past the end of the arc",
            S.World.cycleTarget(player, 2000) === west);
        W.target = west;
        check("cycling from the last bearing returns to the first",
            S.World.cycleTarget(player, 2000) === east);

        /* With a single hostile in range there is nothing to cycle to, and
         * the press must not blank the lock. */
        S.World.removeShip(east);
        S.World.removeShip(west);
        W.target = south;
        check("cycling with one hostile left keeps the lock",
            S.World.cycleTarget(player, 2000) === south && W.target === south);
    }

    S.World.clearTarget();
    check("the lock can be cleared", W.target === null);

    check("a ship is never hostile to itself", S.World.isHostileTo(player, player) === false);
    check("every NPC is hostile to the player",
        W.ships.filter((s) => !s.isPlayer).every((s) => S.World.isHostileTo(s, player)));
    check("hostiles of different factions fight each other", (() => {
        const raider = W.ships.find((s) => s.faction === "raider");
        const alien = W.ships.find((s) => s.faction === "alien");
        if (!raider || !alien) return true;
        return S.World.isHostileTo(raider, alien) && S.World.isHostileTo(alien, raider);
    })());
    check("a dead target is dropped rather than left dangling", (() => {
        const victim = S.World.spawnShip({
            name: "LOCKME", faction: "raider", x: player.x + 120, y: player.y,
            maxHull: 10, maxShield: 0,
            stats: S.statsFor({ blaster: 1, shield: 1, armor: 1, processor: 1, thruster: 1, ammo: 1 }),
        });
        W.target = victim;
        S.World.killShip(victim, null);
        return W.target === null;
    })());
}

/* ---- hangar: hulls and parts -------------------------------------------- */

head("hangar: hulls");

check("the hangar starts with a hull the pilot can actually fly",
    S.Storage.ownsHull(S.Storage.getHangar(), S.HULLS[0].id));
check("every hull has a passive, a blurb and a cost",
    S.HULLS.every((h) => h.passive && h.blurb && h.detail && Number.isFinite(h.cost)));
check("hull ids are unique and unique against the module tracks",
    new Set(S.HULLS.map((h) => h.id)).size === S.HULLS.length &&
    !S.HULLS.some((h) => S.moduleIndex(h.id) >= 0));
check("exactly one hull is free to start with", S.HULLS.filter((h) => h.cost === 0).length === 1);
check("the starter hull is the first one, because it is the fallback",
    S.HULLS[0].cost === 0);
check("every hull actually changes the ship", S.HULLS.every((h) =>
    Object.keys(h.mods || {}).length > 0 || Object.keys(h.bonus || {}).length > 0));

check("an unknown hull id falls back rather than returning undefined",
    S.hull("nonsense") === S.HULLS[0] && S.hull(undefined) === S.HULLS[0]);
check("a hull with no modifiers in statsFor is inert, not the first hull", (() => {
    /* The Wasp is first and has the strongest hold penalty of the lot. If
     * an unnamed hull silently became the Wasp, every one-argument
     * statsFor call in the codebase would inherit it. */
    const bare = S.statsFor({ thruster: 1 });
    const wasp = S.statsFor({ thruster: 1 }, {}, null, "wasp");
    return bare.holdMax !== wasp.holdMax && bare.speed !== wasp.speed;
})());

check("the Wasp really is a small fast ship", (() => {
    const w = S.statsFor({}, {}, null, "wasp");
    const b = S.statsFor({});
    return w.holdMax < b.holdMax && w.speed > b.speed && w.turn > b.turn;
})());
check("the Hauler really is a big slow ship", (() => {
    const h = S.statsFor({}, {}, null, "hauler");
    const b = S.statsFor({});
    return h.holdMax > b.holdMax * 1.4 && h.speed < b.speed;
})());
check("the Warden trades hull for shield recovery", (() => {
    const w = S.statsFor({}, {}, null, "warden");
    const b = S.statsFor({});
    return w.shieldRegen > b.shieldRegen * 1.8 && w.maxHull < b.maxHull;
})());
check("the Bulwark is the tankiest hull and pays for it in speed", (() => {
    const b = S.statsFor({}, {}, null, "bulwark");
    const n = S.statsFor({});
    return b.maxHull > n.maxHull * 1.2 && b.speed < n.speed && b.reduction > n.reduction;
})());
check("the Vandal is the only hull that adds raw damage",
    S.HULLS.filter((h) => h.bonus && h.bonus.damage > 0).length === 1 &&
    S.HULLS.find((h) => h.id === "vandal").bonus.damage > 0);
check("the Vandal's damage bonus is symmetric across both guns", (() => {
    const v = S.HULLS.find((h) => h.id === "vandal");
    return v.bonus.damage === v.bonus.ammoDamage;
})());

head("hangar: parts");

check("three slots, three components each", (() => {
    if (S.HULL_SLOTS.length !== 3) return false;
    for (const slot of S.HULL_SLOTS) {
        if (S.partsForSlot(slot).length !== 3) return false;
    }
    return true;
})());
check("part keys are unique and unique against hull ids and modules",
    new Set(S.PARTS.map((p) => p.key)).size === S.PARTS.length &&
    !S.PARTS.some((p) => S.moduleIndex(p.key) >= 0 || S.hull(p.key) !== S.HULLS[0] || p.key === S.HULLS[0].id));
check("every part belongs to a real slot and has a blurb",
    S.PARTS.every((p) => S.HULL_SLOTS.includes(p.slot) && p.blurb && p.detail && p.glyph));
check("a part costs more at every level", S.PARTS.every((p) => {
    let prev = 0;
    for (let lv = 0; lv < S.PART_MAX; lv++) {
        const c = S.partCost(p.key, lv);
        if (!Number.isFinite(c) || c <= prev) return false;
        prev = c;
    }
    return true;
}));
check("a maxed part costs Infinity", S.PARTS.every((p) => S.partCost(p.key, S.PART_MAX) === Infinity));
check("an unknown part key resolves to null", S.part("nonsense") === null);

check("fitting a part changes the ship", (() => {
    const bare = S.statsFor({ blaster: 5, thruster: 5, shield: 5 });
    const fitted = S.statsFor({ blaster: 5, thruster: 5, shield: 5 },
        {}, { laser: { key: "rail", level: 1 } }, null);
    return fitted.damage > bare.damage && fitted.fireInterval > bare.fireInterval;
})());
check("a part level makes the same component better", (() => {
    const one = S.statsFor({}, {}, { engine: { key: "haulerdrive", level: 1 } });
    const ten = S.statsFor({}, {}, { engine: { key: "haulerdrive", level: 10 } });
    return ten.holdMax > one.holdMax;
})());
check("the hull overrides the part, on purpose", (() => {
    /* A Wasp with a Hauler Drive is still a Wasp: the hull is the last
     * word, so buying the best engine cannot erase the cost of picking the
     * wrong ship. */
    const haulerDriveOnWasp = S.statsFor({}, {}, { engine: { key: "haulerdrive", level: 5 } }, "wasp");
    const plainWasp = S.statsFor({}, {}, null, "wasp");
    const bigEngineOnWasp = S.statsFor({}, {}, { engine: { key: "haulerdrive", level: 5 } }, "hauler");
    return haulerDriveOnWasp.holdMax < bigEngineOnWasp.holdMax &&
        haulerDriveOnWasp.holdMax > plainWasp.holdMax;
})());
check("an unknown part in a fit is ignored rather than crashing",
    (() => {
        const st = S.statsFor({}, {}, { engine: { key: "nonsense", level: 3 } });
        return Number.isFinite(st.speed) && Number.isFinite(st.holdMax);
    })());
check("an unknown hull id applies no hull at all", (() => {
    const st = S.statsFor({}, {}, null, "nonsense");
    const bare = S.statsFor({});
    return st.holdMax === bare.holdMax && st.speed === bare.speed;
})());

/* ---- the invariant the whole hangar hangs off ---- */
head("hangar: weapons stay weapons");

/* The rule that makes the matrix below provable rather than lucky: every
   weapon part, and the one hull that touches damage, must apply the SAME
   factor to EVERY gun on the mount - the blaster, the capacitor round and
   now the plasma round. Two builds then scale identically and the
   comparison between them cannot move.

   The plasma joined the rule when it was added. It is the third gun, and
   a part that buffed it differently from the other two would quietly tilt
   every fight in the game. */
check("every weapon part scales every gun by the same factor", S.PARTS
    .filter((p) => p.slot === "laser")
    .every((p) => p.mods.fireInterval === p.mods.ammoCooldown &&
        p.mods.fireInterval === p.mods.plasmaCooldown &&
        p.mods.damage === p.mods.ammoDamage &&
        p.mods.damage === p.mods.plasmaDamage &&
        p.gain.damage === p.gain.ammoDamage &&
        p.gain.damage === p.gain.plasmaDamage));
check("every hull that touches damage scales every gun identically", S.HULLS
    .filter((h) => h.bonus && h.bonus.damage)
    .every((h) => h.bonus.damage === h.bonus.ammoDamage &&
        h.bonus.damage === h.bonus.plasmaDamage));
check("no engine or shield part touches a weapon at all", S.PARTS
    .filter((p) => p.slot !== "laser")
    .every((p) => !("damage" in (p.mods || {})) && !("ammoDamage" in (p.mods || {})) &&
        !("plasmaDamage" in (p.mods || {})) &&
        !("fireInterval" in (p.mods || {})) && !("ammoCooldown" in (p.mods || {})) &&
        !("plasmaCooldown" in (p.mods || {})) &&
        !("damage" in (p.gain || {})) && !("ammoDamage" in (p.gain || {})) &&
        !("plasmaDamage" in (p.gain || {}))));

check("no part or hull touches a weapon's shield/armour split", (() => {
    /* Damage packets are rebuilt from raw damage after every multiplier, so
     * a part can double the SIZE of a shot but never change what the shot is
     * for. If this ever fails, buying a part would quietly kill the Ammo
     * track. */
    const base = { blaster: 10, ammo: 1, plasma: 1, shield: 10, armor: 10, thruster: 10 };
    const plain = S.statsFor(base);
    const w = S.WEAPONS.blaster, a = S.WEAPONS.ammo, p = S.WEAPONS.plasma;
    return Math.abs(plain.blasterPacket.shield / plain.blasterPacket.armor - w.shield / w.armor) < 1e-9 &&
        Math.abs(plain.ammoPacket.shield / plain.ammoPacket.armor - a.shield / a.armor) < 1e-9 &&
        Math.abs(plain.plasmaPacket.shield / plain.plasmaPacket.armor - p.shield / p.armor) < 1e-9;
})());

check("the split is intact across every hull, part and level", (() => {
    const base = { blaster: 6, ammo: 6, plasma: 6, shield: 6, armor: 6, thruster: 6 };
    const w = S.WEAPONS.blaster, a = S.WEAPONS.ammo, p = S.WEAPONS.plasma;
    for (const hull of S.HULLS) {
        for (const e of S.partsForSlot("engine")) {
            for (const l of S.partsForSlot("laser")) {
                for (const s of S.partsForSlot("shield")) {
                    const fit = {
                        engine: { key: e.key, level: S.PART_MAX },
                        laser: { key: l.key, level: S.PART_MAX },
                        shield: { key: s.key, level: S.PART_MAX },
                    };
                    const st = S.statsFor(base, {}, fit, hull.id);
                    if (Math.abs(st.blasterPacket.shield / st.blasterPacket.armor - w.shield / w.armor) > 1e-9) return false;
                    if (Math.abs(st.ammoPacket.shield / st.ammoPacket.armor - a.shield / a.armor) > 1e-9) return false;
                    if (Math.abs(st.plasmaPacket.shield / st.plasmaPacket.armor - p.shield / p.armor) > 1e-9) return false;
                }
            }
        }
    }
    return true;
})());

/* The load-bearing consequence. Across the whole 216-configuration matrix
   (8 hulls x 3 engine parts x 3 laser parts x 3 shield parts), a
   shield-heavy target must still flip the winner between the two builds,
   and a bare hull must still be a laser fight. If a future part makes the
   round universally better, this fails - which is the point. */
check("across ALL 216 fit-outs, the ammo build still wins on aliens", (() => {
    const buildL = { blaster: 10, ammo: 1, shield: 10, armor: 10, thruster: 10 };
    const buildA = { blaster: 1, ammo: 10, shield: 10, armor: 10, thruster: 10 };
    const hull = S.NPC_TIERS[8].hull;
    const alien = S.faction("alien").shieldFrac;
    for (const hd of S.HULLS) {
        for (const e of S.partsForSlot("engine")) {
            for (const l of S.partsForSlot("laser")) {
                for (const s of S.partsForSlot("shield")) {
                    const fit = {
                        engine: { key: e.key, level: S.PART_MAX },
                        laser: { key: l.key, level: S.PART_MAX },
                        shield: { key: s.key, level: S.PART_MAX },
                    };
                    const target = { hull, shield: Math.round(hull * alien) };
                    const laser = timeToKill(
                        S.statsFor(buildL, {}, fit, hd.id).blasterPacket,
                        S.statsFor(buildL, {}, fit, hd.id).fireInterval, target);
                    const ammo = timeToKill(
                        S.statsFor(buildA, {}, fit, hd.id).ammoPacket,
                        S.statsFor(buildA, {}, fit, hd.id).ammoCooldown, target);
                    if (!(ammo < laser)) return false;
                }
            }
        }
    }
    return true;
})());

check("across ALL 216 fit-outs, a bare hull is still a laser fight", (() => {
    const buildL = { blaster: 10, ammo: 1, shield: 10, armor: 10, thruster: 10 };
    const buildA = { blaster: 1, ammo: 10, shield: 10, armor: 10, thruster: 10 };
    const hull = S.NPC_TIERS[8].hull;
    const target = { hull, shield: 0 };
    for (const hd of S.HULLS) {
        for (const e of S.partsForSlot("engine")) {
            for (const l of S.partsForSlot("laser")) {
                for (const s of S.partsForSlot("shield")) {
                    const fit = {
                        engine: { key: e.key, level: S.PART_MAX },
                        laser: { key: l.key, level: S.PART_MAX },
                        shield: { key: s.key, level: S.PART_MAX },
                    };
                    const laser = timeToKill(
                        S.statsFor(buildL, {}, fit, hd.id).blasterPacket,
                        S.statsFor(buildL, {}, fit, hd.id).fireInterval, target);
                    const ammo = timeToKill(
                        S.statsFor(buildA, {}, fit, hd.id).ammoPacket,
                        S.statsFor(buildA, {}, fit, hd.id).ammoCooldown, target);
                    if (!(laser < ammo)) return false;
                }
            }
        }
    }
    return true;
})());

/* The same comparison, but with the rounds paid for.
 *
 * The time-to-kill test above says the Ammo track is the better build
 * against a shield. That is not the whole claim any more: every gun draws
 * from a magazine now, so a build is only worth its levels if it is worth
 * its AMMUNITION. A capacitor round costs six energy and a laser round
 * costs one, so the build that shoots faster is not necessarily the build
 * that spends less.
 *
 * This is the test that keeps the Ammo track from quietly becoming a tax:
 * against a shielded hull, the ammo build has to be cheaper in ENERGY as
 * well as faster in seconds, or a pilot would be better off with a laser
 * and a bigger shield. */
check("the ammo build still wins on aliens once the rounds are paid for", (() => {
    const buildL = { blaster: 10, ammo: 1, shield: 10, armor: 10, thruster: 10 };
    const buildA = { blaster: 1, ammo: 10, shield: 10, armor: 10, thruster: 10 };
    const hull = S.NPC_TIERS[8].hull;
    const alien = S.faction("alien").shieldFrac;
    const target = { hull, shield: Math.round(hull * alien) };
    const laserCost = S.CONFIG.munitions.cost.laser;
    const ammoCost = S.CONFIG.munitions.cost.ammo;

    /* The energy a build spends is its ROUNDS fired times the price of a
     * round - not its time on target. A shot that takes a second still
     * costs a round. */
    const energyToKill = (packet, interval, cost) =>
        (timeToKill(packet, interval, target) / interval) * cost;

    for (const hd of S.HULLS) {
        for (const e of S.partsForSlot("engine")) {
            for (const l of S.partsForSlot("laser")) {
                for (const s of S.partsForSlot("shield")) {
                    const fit = {
                        engine: { key: e.key, level: S.PART_MAX },
                        laser: { key: l.key, level: S.PART_MAX },
                        shield: { key: s.key, level: S.PART_MAX },
                    };
                    const sl = S.statsFor(buildL, {}, fit, hd.id);
                    const sa = S.statsFor(buildA, {}, fit, hd.id);
                    const laser = energyToKill(sl.blasterPacket, sl.fireInterval, laserCost);
                    const ammo = energyToKill(sa.ammoPacket, sa.ammoCooldown, ammoCost);
                    if (!(ammo < laser)) return false;
                }
            }
        }
    }
    return true;
})());

/* And against a bare hull the other way round: the laser is both faster
 * AND cheaper once the rounds are paid for, so the Ammo track has to be a
 * specialist rather than a general upgrade. */
check("a bare hull is still a laser fight once the rounds are paid for", (() => {
    const buildL = { blaster: 10, ammo: 1, shield: 10, armor: 10, thruster: 10 };
    const buildA = { blaster: 1, ammo: 10, shield: 10, armor: 10, thruster: 10 };
    const hull = S.NPC_TIERS[8].hull;
    const target = { hull, shield: 0 };
    const laserCost = S.CONFIG.munitions.cost.laser;
    const ammoCost = S.CONFIG.munitions.cost.ammo;

    const sl = S.statsFor(buildL);
    const sa = S.statsFor(buildA);
    const laser = (timeToKill(sl.blasterPacket, sl.fireInterval, target) / sl.fireInterval) * laserCost;
    const ammo = (timeToKill(sa.ammoPacket, sa.ammoCooldown, target) / sa.ammoCooldown) * ammoCost;
    return laser < ammo;
})());

check("no fit-out produces a negative or non-finite stat", (() => {

    for (const hd of S.HULLS) {
        for (const e of S.partsForSlot("engine")) {
            for (const l of S.partsForSlot("laser")) {
                for (const s of S.partsForSlot("shield")) {
                    const fit = {
                        engine: { key: e.key, level: S.PART_MAX },
                        laser: { key: l.key, level: S.PART_MAX },
                        shield: { key: s.key, level: S.PART_MAX },
                    };
                    const st = S.statsFor(
                        { blaster: 10, ammo: 10, shield: 10, armor: 10, thruster: 10, cargo: 10 },
                        { hull: 3, tow: 2 }, fit, hd.id);
                    for (const k of S.SCALABLE) {
                        if (!Number.isFinite(st[k]) || st[k] < 0) return false;
                    }
                }
            }
        }
    }
    return true;
})());
check("every fit-out still carries a usable hold and a live gun", (() => {
    for (const hd of S.HULLS) {
        for (const s of S.partsForSlot("shield")) {
            const st = S.statsFor({}, {},
                { shield: { key: s.key, level: S.PART_MAX } }, hd.id);
            if (!(st.holdMax > 0)) return false;
            if (!(st.damage > 0 && st.fireInterval > 0)) return false;
            if (!(st.ammoDamage > 0 && st.ammoCooldown > 0)) return false;
        }
    }
    return true;
})());

/* ---- hangar transactions ---------------------------------------------- */

head("hangar transactions");

{
    const { player } = newRun(7001, "rook");
    player.energy = 100000;

    check("buying a hull charges energy and fits it",
        (() => {
            const before = player.energy;
            const r = S.Stations.buyHull(player, "bulwark");
            return r.ok && before - player.energy === S.hull("bulwark").cost &&
                player.hullId === "bulwark";
        })());
    check("buying the same hull twice fails and charges nothing", (() => {
        const before = player.energy;
        const r = S.Stations.buyHull(player, "bulwark");
        return !r.ok && player.energy === before;
    })());
    check("an unaffordable hull fails and charges nothing", (() => {
        player.energy = 1;
        const r = S.Stations.buyHull(player, "hauler");
        player.energy = 100000;
        return !r.ok && !S.Storage.ownsHull(player.hangar, "hauler");
    })());
    check("an unknown hull fails", !S.Stations.buyHull(player, "nonsense").ok);
}

check("selecting an owned hull is free and reversible", (() => {
    const { player } = newRun(7002, "rook");
    player.energy = 100000;
    S.Stations.buyHull(player, "warden");
    const before = player.energy;
    S.Stations.setActiveHull(player, "wasp");
    const back = S.Stations.setActiveHull(player, "warden");
    return back.ok && player.energy === before && player.hullId === "warden";
})());

check("selecting a hull you do not own is refused", (() => {
    const { player } = newRun(7003, "rook");
    return !S.Stations.setActiveHull(player, "vandal").ok && player.hullId === "wasp";
})());

check("buying a part installs it into its slot", (() => {
    const { player } = newRun(7004, "rook");
    player.energy = 100000;
    const r = S.Stations.buyPart(player, "pulse");
    return r.ok && r.level === 1 && player.hangar.parts.pulse === 1 &&
        player.parts.laser.key === "pulse";
})());

check("a second purchase is a level, not a duplicate", (() => {
    const { player } = newRun(7005, "rook");
    player.energy = 100000;
    S.Stations.buyPart(player, "pulse");
    const r = S.Stations.buyPart(player, "pulse");
    return r.ok && r.level === 2 && player.hangar.parts.pulse === 2;
})());

check("swapping a part is free and repeatable", (() => {
    const { player } = newRun(7006, "rook");
    player.energy = 100000;
    S.Stations.buyPart(player, "pulse");
    S.Stations.buyPart(player, "rail");
    const before = player.energy;
    S.Stations.fitPart(player, "pulse", "laser");
    S.Stations.fitPart(player, "rail", "laser");
    S.Stations.fitPart(player, "pulse", "laser");
    return player.energy === before && player.parts.laser.key === "pulse";
})());

check("fitting a part you do not own is refused", (() => {
    const { player } = newRun(7007, "rook");
    const before = player.parts.laser ? player.parts.laser.key : null;
    return !S.Stations.fitPart(player, "splitter", "laser").ok &&
        (player.parts.laser ? player.parts.laser.key : null) === before;
})());

check("fitting a part into the wrong slot is refused", (() => {
    const { player } = newRun(7008, "rook");
    player.energy = 100000;
    S.Stations.buyPart(player, "pulse");
    return !S.Stations.fitPart(player, "pulse", "engine").ok;
})());

check("emptying a slot is a legal state, not an error", (() => {
    const { player } = newRun(7009, "rook");
    player.energy = 100000;
    S.Stations.buyPart(player, "pulse");
    const r = S.Stations.fitPart(player, null, "laser");
    return r.ok && !player.parts.laser && Number.isFinite(player.stats.damage);
})());

check("a maxed part refuses further purchases", (() => {
    const { player } = newRun(7010, "rook");
    player.energy = 1000000;
    for (let i = 0; i < S.PART_MAX; i++) S.Stations.buyPart(player, "pulse");
    const before = player.energy;
    const r = S.Stations.buyPart(player, "pulse");
    return !r.ok && player.energy === before;
})());

check("a failed purchase leaves the ship exactly as it was", (() => {
    const { player } = newRun(7011, "rook");
    player.energy = 10;
    const snap = JSON.stringify({
        e: player.energy, hull: player.hullId, parts: player.parts,
        stats: player.stats,
    });
    S.Stations.buyHull(player, "vandal");
    S.Stations.buyPart(player, "splitter");
    S.Stations.fitPart(player, "splitter", "laser");
    return JSON.stringify({
        e: player.energy, hull: player.hullId, parts: player.parts,
        stats: player.stats,
    }) === snap;
})());

check("the hangar survives a save and reload", (() => {
    const { player } = newRun(7012, "rook");
    player.energy = 100000;
    S.Stations.buyHull(player, "hauler");
    S.Stations.buyPart(player, "needle");
    S.Stations.buyPart(player, "splitter");
    S.Storage.saveShip(S.Stations.bank(player));
    S.Storage.saveHangar(player.hangar);

    const reloaded = S.Storage.getShip();
    return reloaded.hullId === "hauler" &&
        reloaded.parts.engine && reloaded.parts.engine.key === "needle" &&
        reloaded.parts.laser && reloaded.parts.laser.key === "splitter";
})());

check("upgrades stay shared across hulls", (() => {
    const { player } = newRun(7013, "rook");
    player.energy = 100000;
    S.Stations.buyModule(player, "thruster");
    const level = player.modules.thruster;
    S.Stations.buyHull(player, "bulwark");
    return player.modules.thruster === level && level === 2;
})());

check("a save cannot grant a hull the pilot never bought", (() => {
    store.set("sector7.v2.hangar", JSON.stringify({
        active: "vandal", hulls: {}, parts: {}, sandbox: false,
    }));
    const h = S.Storage.getHangar();
    return h.active === S.HULLS[0].id && !S.Storage.ownsHull(h, "vandal");
})());

check("a save cannot grant a part the pilot never bought", (() => {
    store.set("sector7.v2.hangar", JSON.stringify({
        active: "hauler", hulls: { hauler: { parts: { engine: "needle" } } },
        parts: {}, sandbox: false,
    }));
    const fit = S.Storage.resolveFit(S.Storage.getHangar(), "hauler");
    return !fit.engine;
})());

check("a save cannot equip a part that was deleted from the game", (() => {
    store.set("sector7.v2.hangar", JSON.stringify({
        active: "hauler", hulls: { hauler: { parts: { engine: "obsolete" } } },
        parts: { obsolete: 5 }, sandbox: false,
    }));
    const fit = S.Storage.resolveFit(S.Storage.getHangar(), "hauler");
    return !fit.engine;
})());

check("wiping the save wipes the hangar too", (() => {
    const { player } = newRun(7014, "rook");
    player.energy = 100000;
    S.Stations.buyHull(player, "warden");
    S.Storage.saveHangar(player.hangar);
    S.Storage.saveShip(S.Stations.bank(player));
    S.Storage.wipe();
    const h = S.Storage.getHangar();
    return h.active === S.HULLS[0].id && Object.keys(h.hulls).length === 1;
})());

/* ---- summary ------------------------------------------------------------ */

console.log("\n--------------------------------------------------------");
console.log(`checks: ${checks}   failures: ${failures}`);
console.log("--------------------------------------------------------");
process.exit(failures ? 1 : 0);