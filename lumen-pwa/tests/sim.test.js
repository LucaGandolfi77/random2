/*
 * LUMEN headless simulation test.
 *
 *   node lumen-pwa/tests/sim.test.js
 *
 * Runs the real world + bot modules with no browser and no build step.
 * Deterministic unit checks first, then a behavioural suite aggregated over
 * several fixed seeds - single-seed thresholds were hopelessly flaky (one run
 * reported 56% rival deaths, the next 33%, and one produced an empty sample).
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const SEED_KEY = "lumen.v1.seed";
const ROSTER_KEY = "lumen.v1.roster";
const GRUDGE_KEY = "lumen.v1.grudges";
const SEEDS = [1337, 90210, 2468013, 555001, 7777777];

/* ---------- minimal browser stubs ---------- */
global.window = global;
const store = new Map();
global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};
/* Node 24 exposes a read-only globalThis.navigator, so patch it by define. */
Object.defineProperty(globalThis, "navigator", {
    value: { vibrate() {} },
    configurable: true,
    writable: true,
});

for (const f of ["config.js", "storage.js", "world.js", "bots.js"]) {
    (0, eval)(fs.readFileSync(path.join(SRC, f), "utf8"));
}

const L = global.LUMEN;
const W = L.World.world;
const C = L.CONFIG;
const DT = 1 / 60;

let failures = 0;
function check(label, cond, extra) {
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
    store.delete(ROSTER_KEY);
    store.delete(GRUDGE_KEY);
}
function angDiff(a, b) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
}
const finite = Number.isFinite;
function mean(a) {
    return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}

function freshWorld() {
    L.World.reset();
    L.World.generate(L.Storage.getSeed());
    L.Bots.clear(W);
    L.Bots.spawnAll(W);
}

/* ================================================================
 * 1. Roster - the persistent-rival trick
 * ================================================================ */
section("roster");
useSeed(SEEDS[0]);
const roster = L.Storage.getRoster(C.bots.count);
check("roster has 40 rivals", roster.length === 40, roster.length);
check("names unique", new Set(roster.map((r) => r.name)).size === 40);
check("names read like .io handles",
    roster.filter((r) => /\.exe|_77|404|_YT|Prime/.test(r.name)).length >= 8);
check("personalities in range", roster.every((r) =>
    ["aggression", "greed", "caution", "skill", "boostiness"].every((k) =>
        r.personality[k] >= 0 && r.personality[k] <= 1)));
check("clans assigned", roster.every((r) => r.clan >= 0 && r.clan < 6));
check("roster stable across reads",
    JSON.stringify(roster) === JSON.stringify(L.Storage.getRoster(C.bots.count)));

useSeed(SEEDS[1]);
const other = L.Storage.getRoster(C.bots.count);
check("a different seed gives a different roster",
    JSON.stringify(other.map((r) => r.name)) !== JSON.stringify(roster.map((r) => r.name)));

/* ================================================================
 * 2. World generation
 * ================================================================ */
section("world generation");
useSeed(SEEDS[0]);
freshWorld();
check("roster spawned", W.creatures.length === C.bots.count, W.creatures.length);
check("plankton count matches config",
    W.food.filter((f) => f.type === "plankton").length === C.world.planktonCount,
    W.food.filter((f) => f.type === "plankton").length);
check("krill count matches config",
    W.food.filter((f) => f.type === "krill").length === C.world.krillCount);
check("wreck count matches config", W.wrecks.length === C.world.wreckCount, W.wrecks.length);
check("angler count matches config", W.anglers.length === C.world.anglerCount, W.anglers.length);
check("anglers dwarf a rival",
    C.world.anglerMass >= 6 * C.bots.startMassMax,
    C.world.anglerMass + " vs rival " + C.bots.startMassMax);
L.World.addPlayer("Hero", "#8ff6ff");
check("player joins the world", W.creatures.length === C.bots.count + 1, W.creatures.length);

/* Nothing may materialise inside something lethal. */
{
    let inWreck = 0, inAngler = 0;
    for (const c of W.creatures) {
        for (const wk of W.wrecks) if (L.World.wreckBlocks(wk, c.headX, c.headY, c.radius * 0.7)) inWreck++;
        for (const a of W.anglers) {
            const r = a.radius + 260;
            if (L.dist2(c.headX, c.headY, a.headX, a.headY) < r * r) inAngler++;
        }
    }
    check("nothing spawns inside a wreck", inWreck === 0, inWreck);
    check("nothing spawns inside an angler", inAngler === 0, inAngler);
}

/* ================================================================
 * 3. Grudges - deterministic, not incidental
 * ================================================================ */
section("grudges");
store.delete(GRUDGE_KEY);
freshWorld();
L.World.addPlayer("Hero", "#8ff6ff");
const victim = W.creatures.find((c) => !c.isPlayer);

L.Bots.onKill(W.player, victim);
check("killing a rival earns you a grudge",
    (L.Storage.getGrudges()[victim.botId] || 0) > 0, JSON.stringify(L.Storage.getGrudges()));

store.delete(GRUDGE_KEY);
L.Bots.onKill(victim, W.player);
check("dying to a rival earns them one on you",
    (L.Storage.getGrudges()[victim.botId] || 0) > 0, JSON.stringify(L.Storage.getGrudges()));

const before = L.Storage.getGrudges()[victim.botId];
L.Bots.onKill(victim, W.player);
check("grudges never exceed 1", L.Storage.getGrudges()[victim.botId] <= 1,
    L.Storage.getGrudges()[victim.botId]);

L.Storage.decayGrudges();
L.Storage.decayGrudges();
check("grudges fade over time", L.Storage.getGrudges()[victim.botId] < before);

/* A grudging rival must actually prioritise hunting the player - but only where
 * the fight is winnable, so the pair is isolated and the size gate is even. */
{
    const grudger = W.creatures.find((c) => c.botId === victim.botId);
    for (const c of W.creatures) {
        if (c !== grudger && !c.isPlayer) W.creatures.splice(W.creatures.indexOf(c), 1);
    }
    W.food.length = 0;
    L.World.addMass(W.player, grudger.mass * 0.6 - W.player.mass);
    W.player.headX = grudger.headX + 120;
    W.player.headY = grudger.headY;
    grudger.grudge = 1;
    grudger.ai.targetCreature = null;
    grudger.ai.modeHold = 0;
    let hunted = false;
    for (let i = 0; i < 240; i++) {
        L.Bots.update(W, DT);
        L.World.step(DT);
        W.events.length = 0;
        if (grudger.ai.mode === "hunt" && grudger.ai.targetCreature === W.player) { hunted = true; break; }
        if (!W.player.alive) break;
    }
    check("a grudging rival actually hunts the player", hunted,
        "mode=" + grudger.ai.mode + " grudgerMass=" + grudger.mass.toFixed(0) +
        " playerMass=" + W.player.mass.toFixed(0));
}

/* ================================================================
 * 3b. Anglerfish
 * ================================================================ */
section("anglerfish");
{
    /* Open water, or the teleport lands inside a hull and the victim is dead
     * before the mechanic under test ever runs. */
    const clearSpot = () => {
        for (let i = 0; i < 4000; i++) {
            const x = 400 + Math.random() * (C.world.size - 800);
            const y = 400 + Math.random() * (C.world.size - 800);
            let ok = true;
            for (const wk of W.wrecks) {
                if (L.World.wreckBlocks(wk, x, y, 420)) { ok = false; break; }
            }
            if (ok) {
                for (const a2 of W.anglers) {
                    if (Math.hypot(x - a2.headX, y - a2.headY) < 500) { ok = false; break; }
                }
            }
            if (ok) return { x, y };
        }
        return { x: C.world.size / 2, y: C.world.size / 2 };
    };

    /* x/y is the authoritative position: stepAngler recomputes headX, the lure
     * and the body from it every frame. */
    const place = (a, x, y, angle) => {
        a.x = x; a.y = y; a.angle = angle;
        a.headX = x; a.headY = y;
        a.trail.length = 0; a.pts.length = 0;
        L.World.seedBody(a, a.bodyLen);
        a.lureX = x + Math.cos(angle) * (a.radius + 130);
        a.lureY = y + Math.sin(angle) * (a.radius + 130);
    };

    useSeed(SEEDS[0]);
    freshWorld();
    let spot = clearSpot();
    const p = L.World.addPlayer("Spear", "#8ff6ff");
    p.headX = spot.x; p.headY = spot.y;
    const a = W.anglers[0];
    a.state = "lurk"; a.lureOn = true;
    place(a, p.headX, p.headY, 0);
    L.World.step(DT);
    check("angler body is lethal", !p.alive);

    useSeed(SEEDS[0]);
    freshWorld();
    spot = clearSpot();
    const p2 = L.World.addPlayer("Spear", "#8ff6ff");
    L.World.addMass(p2, 300);
    p2.headX = spot.x; p2.headY = spot.y;
    const a2 = W.anglers[0];
    a2.state = "recover"; a2.timer = 5; a2.lureOn = false;
    place(a2, spot.x, spot.y, 0);
    p2.headX = a2.lureX; p2.headY = a2.lureY;
    p2.wantBoost = true;
    L.World.step(DT);
    check("a boosting player spears a stunned lure", W.anglers.indexOf(a2) < 0,
        "anglers=" + W.anglers.length + " alive=" + p2.alive);
    let meat = 0;
    for (const f of W.food) if (f.type === "meat") meat += f.value;
    check("spearing an angler drops meat", meat > 300, "total=" + meat.toFixed(0));

    /* Only that way. The lure is armoured whenever it is lit; only the recover
     * state puts it out, and stepAngler forces lureOn=false there. */
    useSeed(SEEDS[0]);
    freshWorld();
    spot = clearSpot();
    const p3 = L.World.addPlayer("Spear", "#8ff6ff");
    L.World.addMass(p3, 300);
    p3.headX = spot.x; p3.headY = spot.y;
    const a3 = W.anglers[0];
    a3.state = "stalk"; a3.timer = 5; a3.lureOn = true;
    place(a3, spot.x, spot.y, 0);
    p3.headX = a3.lureX; p3.headY = a3.lureY;
    p3.wantBoost = true;
    L.World.step(DT);
    check("the lure is armoured while it is lit", W.anglers.indexOf(a3) >= 0,
        "anglers=" + W.anglers.length);
}

/* ================================================================
 * 4. Behavioural suite, aggregated over fixed seeds
 * ================================================================ */
const agg = {
    lives: 0, liveSeconds: 0, kills: 0, anglerKills: 0, bestMass: 0,
    namedDeaths: 0, minPop: Infinity, wreck: 0, body: 0, angler: 0,
    lifespans: [], starvedFrames: 0, bestRanks: [],
};

for (const seed of SEEDS) {
    useSeed(seed);

    /* --- ecology: 90s of rivals alone --- */
    freshWorld();
    const born = {};
    for (const c of W.creatures) born[c.botId] = 0;
    for (let s = 0; s < 90 * 60; s++) {
        L.Bots.update(W, DT);
        L.World.step(DT);
        for (const e of W.events) {
            const b = e.victim && e.victim.botId;
            if (!b) continue;
            if (e.type === "kill") agg.body++;
            else if (e.type === "anglerContact") agg.angler++;
            else if (e.type === "wreck") agg.wreck++;
            else continue;
            agg.lifespans.push(s * DT - born[b]);
            delete born[b];
        }
        W.events.length = 0;
        for (const c of W.creatures) if (born[c.botId] === undefined) born[c.botId] = s * DT;
        if (s % 600 === 0) agg.minPop = Math.min(agg.minPop, W.creatures.length);
    }

    /* --- player session: 150s, respawning like a real session --- */
    freshWorld();
    const scratch = [];
    let player = L.World.addPlayer("Script", "#8ff6ff");
    let lifeStart = 0, bestMass = 0, bestRank = 999;
    const causes = {};

    for (let step = 0; step < 150 * 60; step++) {
        L.Bots.update(W, DT);

        /* an anglerfish outranks everything: a 400px body and a 330px/s lunge
         * are unsurvivable up close, and a human reads the flare */
        let angler = null, anglerD = 1e9;
        for (const a of W.anglers) {
            if (a.state === "recover") continue;
            const d = Math.sqrt(L.dist2(player.headX, player.headY, a.x, a.y));
            if (d < anglerD) { anglerD = d; angler = a; }
        }

        let prey = null, preyD = 1e9, food = null, foodScore = -Infinity;
        let threat = null, threatD = 1e9;
        W.cGrid.query(player.headX, player.headY, 520, scratch);
        for (const o of scratch) {
            if (o === player || !o.alive) continue;
            const d = Math.sqrt(L.dist2(player.headX, player.headY, o.headX, o.headY));
            if (o.mass > player.mass * 1.2 && d < threatD) { threatD = d; threat = o; }
            if (o.mass < player.mass * 0.85 && d < preyD) { preyD = d; prey = o; }
        }
        W.foodGrid.query(player.headX, player.headY, 460, scratch);
        for (const f of scratch) {
            if (f.ttl !== Infinity && f.ttl <= 0) continue;
            const d = Math.sqrt(L.dist2(player.headX, player.headY, f.x, f.y));
            const sc = f.value / (d + 45);
            if (sc > foodScore) { foodScore = sc; food = f; }
        }

        let aim;
        player.wantBoost = false;
        if (angler && anglerD < 430) {
            const away = Math.atan2(player.headY - angler.y, player.headX - angler.x);
            const tang = away + Math.PI / 2;
            aim = Math.abs(angDiff(away, tang)) < 1.2 ? tang : away;
            player.wantBoost = player.mass > 60;
        } else if (threat && threatD < 260) {
            aim = Math.atan2(player.headY - threat.headY, player.headX - threat.headX);
            player.wantBoost = true;
        } else if (prey && preyD < 420) {
            /* lead the target so the body is cut, not the head */
            const lead = preyD / C.player.baseSpeed + 0.4;
            aim = Math.atan2(prey.headY + prey.vy * lead - player.headY,
                             prey.headX + prey.vx * lead - player.headX);
            if (preyD < 200) player.wantBoost = true;
        } else if (food) {
            aim = Math.atan2(food.y - player.headY, food.x - player.headX);
        } else {
            aim = player.angle + 0.4;
            agg.starvedFrames++;
        }

        /* looking ahead, the way a person does */
        for (const pd of [150, 260, 380]) {
            const qx = player.headX + Math.cos(aim) * pd;
            const qy = player.headY + Math.sin(aim) * pd;
            W.wreckGrid.query(qx, qy, 150, scratch);
            for (const wk of scratch) {
                if (!L.World.wreckBlocks(wk, qx, qy, player.radius + 30)) continue;
                const away = angDiff(aim, Math.atan2(player.headY - wk.y, player.headX - wk.x));
                aim += Math.max(-1.6, Math.min(1.6, away * 1.4));
            }
        }
        player.targetAngle = aim;

        L.World.step(DT);
        agg.liveSeconds += DT;
        lifeStart += DT;
        if (player.mass > bestMass) bestMass = player.mass;

        let cause = null;
        for (const e of W.events) {
            if (e.type === "kill" && e.killer === player) agg.kills++;
            if (e.type === "anglerKill" && e.killer === player) agg.anglerKills++;
            /* Only the player's own death ends a life, and the specific event
             * arrives before the generic playerDeath - without both guards
             * this reports a session that never happened. */
            if (e.victim !== player || cause) continue;
            if (e.type === "wreck") cause = "wreck";
            else if (e.type === "anglerContact") cause = "angler";
            else if (e.type === "playerDeath") cause = e.killer ? "named" : "unknown";
        }
        W.events.length = 0;

        if (cause) {
            agg.lives++;
            causes[cause] = (causes[cause] || 0) + 1;
            if (cause === "named") agg.namedDeaths++;
            for (const c of W.creatures) if (c.isPlayer) W.creatures.splice(W.creatures.indexOf(c), 1);
            player = L.World.addPlayer("Script", "#8ff6ff");
            lifeStart = 0;
        }
        if (step % 15 === 0) {
            L.World.updateRanks();
            /* rank right after a respawn is meaningless - keep the best */
            if (player.alive && W.rank < bestRank) bestRank = W.rank;
        }
        if (step % 900 === 0 && (!finite(player.headX) || !finite(player.mass))) {
            failures++;
            console.log("  FAIL  player state went non-finite");
            break;
        }
    }
    agg.bestMass = Math.max(agg.bestMass, bestMass);
    agg.bestRanks.push(bestRank);
    console.log("  seed " + seed + ": +" + agg.lives + " lives so far, best glow " +
        Math.floor(bestMass) + ", best rank #" + bestRank + ", deaths " + JSON.stringify(causes));
}

section("ecology (aggregated over " + SEEDS.length + " seeds)");
const totalBotDeaths = agg.body + agg.angler + agg.wreck;
const pct = (n) => (totalBotDeaths ? (n / totalBotDeaths * 100).toFixed(0) : "0") + "%";
console.log("  rival deaths: body=" + agg.body + " (" + pct(agg.body) + ")" +
    "  angler=" + agg.angler + " (" + pct(agg.angler) + ")" +
    "  wreck=" + agg.wreck + " (" + pct(agg.wreck) + ")");
console.log("  rival lifespan mean " + mean(agg.lifespans).toFixed(1) + "s  (n=" + agg.lifespans.length + ")");
check("rival sample is big enough to be meaningful", agg.lifespans.length > 150, agg.lifespans.length);
check("every rival lifespan is a real number",
    agg.lifespans.every(Number.isFinite), agg.lifespans.filter((x) => !Number.isFinite(x)).length);
/* Individual lifespans stay short by design - the roster is persistent, so a
 * rival is absent for only ~3s and you meet the same names constantly. */
check("rivals are around often enough to be familiar", mean(agg.lifespans) > 10, mean(agg.lifespans).toFixed(1) + "s");
check("scenery is not absurdly dominant", agg.wreck / totalBotDeaths < 0.72, pct(agg.wreck));
check("population holds up", agg.minPop > 24, "min=" + agg.minPop);

section("player experience (aggregated over " + SEEDS.length + " seeds)");
const avgLife = agg.liveSeconds / Math.max(1, agg.lives);
const namedShare = agg.lives ? agg.namedDeaths / agg.lives : 0;
console.log("  lives: " + agg.lives + "   avg survival: " + avgLife.toFixed(1) + "s");
console.log("  best glow: " + Math.floor(agg.bestMass) + "   best ranks: " +
    agg.bestRanks.map((r) => "#" + r).join(", ") + "   kills: " + agg.kills +
    "   anglers speared: " + agg.anglerKills);
console.log("  died to a named rival: " + agg.namedDeaths + "/" + agg.lives +
    " (" + (namedShare * 100).toFixed(0) + "%)");

check("a skilled player can feed", agg.bestMass > 500, Math.floor(agg.bestMass));
check("a skilled player can hunt", agg.kills > 0, agg.kills);
check("a skilled player has real runs", avgLife > 12, avgLife.toFixed(1) + "s");
check("rivals are what kill you, not scenery", namedShare > 0.4, (namedShare * 100).toFixed(0) + "%");
check("a skilled player can reach the top of the board",
    Math.min(...agg.bestRanks) <= 12, agg.bestRanks.join(","));
check("food is essentially always in reach", agg.starvedFrames < 60, agg.starvedFrames);

/* ================================================================
 * 5. Performance
 * ================================================================ */
section("performance");
useSeed(SEEDS[0]);
freshWorld();
L.World.addPlayer("Perf", "#8ff6ff");
for (let i = 0; i < 60; i++) { L.Bots.update(W, DT); L.World.step(DT); W.events.length = 0; }
const t0 = process.hrtime.bigint();
for (let i = 0; i < 600; i++) { L.Bots.update(W, DT); L.World.step(DT); W.events.length = 0; }
const t1 = process.hrtime.bigint();
const ms = Number(t1 - t0) / 1e6 / 600;
console.log("  sim step: " + ms.toFixed(3) + " ms/frame (budget 16.7)");
check("simulation fits comfortably in a 60fps frame", ms < 8, ms.toFixed(3));

console.log("\n" + (failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"));
process.exit(failures === 0 ? 0 : 1);
