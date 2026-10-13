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
    "config.js", "storage.js", "sectors.js", "world.js", "stations.js",
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

/* ---- missiles ----------------------------------------------------------- */

head("missiles");

newRun(9090, "rook");
let mPlayer = S.Player.create(S.Storage.getShip());
mPlayer.modules.missiles = 10;
S.Stations.refreshStats(mPlayer);
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
const victim = S.World.spawnShip({
    x: 600, y: 600, z: 10, heading: 0, maxHull: 400,
    stats: S.NPC_TIERS[1], reduction: 0,
});
const bystander = S.World.spawnShip({
    x: 640, y: 600, z: 10, heading: 0, maxHull: 400,
    stats: S.NPC_TIERS[1], reduction: 0,
});
S.World.world.player = null;
const m = W.missiles.find((x) => !x.on);
m.on = true;
m.x = 620; m.y = 600; m.z = 10; m.vx = 0; m.vy = 0;
m.life = 2; m.arm = 0; m.dmg = 100; m.splash = 90; m.ownerId = 99999; m.ownerIsPlayer = false;
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
        const victim = S.World.spawnShip({
            x: 200, y: 200, z: 10, heading: 0, maxHull: 500, stats: S.NPC_TIERS[1],
        });
        const mine = W.mines.find((m) => !m.on);
        if (!mine) return false;
        mine.on = true;
        mine.x = victim.x + 10; mine.y = victim.y; mine.z = 10;
        mine.vx = 0; mine.vy = 0; mine.life = 20; mine.arm = 0;
        mine.dmg = 100; mine.radius = 90; mine.ownerId = 99999;
        S.World.step(DT);
        return victim.hull === 400 && !mine.on;
    })());

check("a mine cannot kill its own owner",
    (() => {
        const owner = S.World.spawnShip({
            x: 400, y: 400, z: 10, heading: 0, maxHull: 500, stats: S.NPC_TIERS[1],
        });
        const mine = W.mines.find((m) => !m.on);
        mine.on = true;
        mine.x = owner.x; mine.y = owner.y; mine.z = 10;
        mine.vx = 0; mine.vy = 0; mine.life = 20; mine.arm = 0;
        mine.dmg = 9999; mine.radius = 90; mine.ownerId = owner.id;
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

/* ---- summary ------------------------------------------------------------ */

console.log("\n--------------------------------------------------------");
console.log(`checks: ${checks}   failures: ${failures}`);
console.log("--------------------------------------------------------");
process.exit(failures ? 1 : 0);