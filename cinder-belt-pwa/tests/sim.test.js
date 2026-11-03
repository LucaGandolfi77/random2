/*
 * CINDER BELT simulation suite.
 *
 *   node cinder-belt-pwa/tests/sim.test.js
 *
 * These are the properties the game cannot show you by looking at it: that a
 * seed replays, that ore reaches the hold, that the law does what the zone
 * signs say, that relays open the Nexus, that the core can end a run, and
 * that the AI economy does not quietly stall or produce NaN.
 */
"use strict";

const H = require("./harness.js");
const { CB, C, World, Shipyard, fresh, step, runFor, nearAsteroid, check, section, report } = H;

function aimAt(state, x, y, fire) {
    const p = state.player;
    return { moveX: 0, moveY: 0, aimX: x, aimY: y, fire: !!fire, boost: false };
}

/* ================================================================
 * Determinism
 * ================================================================ */
section("Determinism");
{
    /* World.state is a singleton, so a second initMatch() rewrites the first
     * match in place. Snapshot the parts we want to compare. */
    function snapshot(state) {
        return {
            time: state.time,
            score: state.teamScore.free + "/" + state.teamScore.corsair,
            ships: state.ships.map((s) => s.name + ":" +
                s.x.toFixed(4) + ":" + s.y.toFixed(4) + ":" +
                s.hull.toFixed(3) + ":" + s.credits),
            rocks: state.asteroids.map((a) => a.x.toFixed(3) + ":" + a.y.toFixed(3))
        };
    }

    const a = fresh(4242);
    runFor(a, 75);
    const snapA = snapshot(a);

    const b = fresh(4242);
    runFor(b, 75);
    const snapB = snapshot(b);

    check("same seed -> same clock", Math.abs(snapA.time - snapB.time) < 1e-9,
        snapA.time + " vs " + snapB.time);
    check("same seed -> same team score",
        snapA.score === snapB.score, snapA.score + " vs " + snapB.score);
    check("same seed -> identical fleet state",
        snapA.ships.join("|") === snapB.ships.join("|"), "fleet drifted");
    check("same seed -> identical belt", snapA.rocks.join("|") === snapB.rocks.join("|"));

    const c = fresh(9999);
    runFor(c, 75);
    const snapC = snapshot(c);
    check("different seed -> different match",
        snapA.ships.join("|") !== snapC.ships.join("|") || snapA.score !== snapC.score,
        "two seeds produced the same match");
}

/* ================================================================
 * Map and starting state
 * ================================================================ */
section("Map and starting state");
{
    const s = fresh(7);
    check("both stations exist", !!s.home && !!s.nexus);
    check("the Nexus has real coordinates",
        Number.isFinite(s.nexus.x) && Number.isFinite(s.nexus.y),
        s.nexus.x + "," + s.nexus.y);
    check("three relays exist", s.relays.length === 3, s.relays.length);
    check("the belt has a starter field near the Anchorage",
        s.asteroids.some((a) => Math.hypot(a.x - s.home.x, a.y - s.home.y) < C.SAFE_RADIUS),
        "closest " + Math.round(Math.min.apply(null, s.asteroids.map((a) =>
            Math.hypot(a.x - s.home.x, a.y - s.home.y)))));
    check("aliens are seeded into the Drift",
        s.ships.filter((x) => x.isAlien).length > 8,
        s.ships.filter((x) => x.isAlien).length);

    check("zone law is distinct per ring",
        CB.Zones.zoneId(0, 0) === "maw" &&
        CB.Zones.zoneId(0, 3300) === "scab" &&
        CB.Zones.zoneId(0, 6000) === "drift" &&
        CB.Zones.zoneId(s.home.x, s.home.y) === "anchorage",
        ["maw", "scab", "drift", "anchorage"].map((z) =>
            z + "=" + CB.Zones.zoneId(z === "anchorage" ? s.home.x : (z === "maw" ? 0 : (z === "scab" ? 3300 : 6000)), 0)).join(","));
}

/* ================================================================
 * Mining, pickups and banking
 * ================================================================ */
section("Mining and banking");
{
    const s = fresh(11);
    const rock = nearAsteroid(s);
    const p = s.player;
    /* Park the fleet well clear: allied bots share the starter field and will
     * otherwise magnet the chunks out from under the test. */
    s.ships.forEach((ship) => {
        if (ship === p) return;
        ship.x = 0; ship.y = 16000;
    });
    p.x = rock.x + 90;
    p.y = rock.y;
    p.vx = 0; p.vy = 0;
    const hpBefore = rock.hp;

    runFor(s, 10, {
        input: () => aimAt(s, rock.x, rock.y, true)
    });

    check("fire cracks the rock", !rock.alive || rock.hp < hpBefore,
        "hp " + hpBefore.toFixed(0) + " -> " + rock.hp.toFixed(0) + ", alive=" + rock.alive);
    check("chunks reach the hold", p.cargoUnits > 0, "cargo " + p.cargoUnits);
    check("cargo carries value", p.cargoValue > 0, p.cargoValue);

    const cargoUnits = p.cargoUnits;
    const cargoValue = p.cargoValue;
    p.x = s.home.x + 60;
    p.y = s.home.y + 60;
    const docked = World.dockPlayer();
    check("docking banks the hold", docked && p.credits >= Math.round(cargoValue),
        "credits " + p.credits + ", value " + cargoValue);
    check("banking empties the hold", p.cargoUnits === 0 && p.cargoValue === 0,
        p.cargoUnits + " / " + p.cargoValue);
    check("docking repairs the hull", p.hull === p.hullMax, p.hull + "/" + p.hullMax);
    check("stats count banked ore", s.stats.ore >= cargoUnits, s.stats.ore);
}

/* ================================================================
 * Law
 * ================================================================ */
section("Law and outlaw status");
{
    const s = fresh(13);
    const p = s.player;

    /* Move the player into the Drift and manufacture a neutral witness. */
    p.x = 6000; p.y = 0;
    const witness = World.makeShip({ team: "neutral", name: "WITNESS", x: p.x + 140, y: p.y });
    check("PvE ship fire is illegal before a crime",
        !CB.Zones.canHarm(p, witness, s.time), "Drift allowed a clean kill");
    World.considerOutlaw(p, witness);
    check("firing in the Drift marks OUTLAW", p.outlawUntil > s.time,
        p.outlawUntil + " vs " + s.time);

    p.outlawUntil = 0;
    p.x = 3300; p.y = 0;
    const enemy = World.makeShip({ team: "corsair", name: "TARGET", x: p.x + 120, y: p.y });
    check("PvP fire is legal in the Scab", CB.Zones.canHarm(p, enemy, s.time));

    p.x = s.home.x; p.y = s.home.y;
    enemy.x = p.x + 120; enemy.y = p.y;
    check("fire is impossible inside the Anchorage bubble",
        !CB.Zones.canHarm(p, enemy, s.time));

    p.outlawUntil = s.time + 10;
    check("an outlaw can be answered inside the bubble",
        CB.Zones.canHarm(p, enemy, s.time), "turrets would stay silent");

    p.outlawUntil = 0;
    p.outlawUntil = s.time + 10;
    p.x = s.home.x; p.y = s.home.y;
    p.docked = false;
    check("outlaws cannot dock", World.dockPlayer() === false && !p.docked);
}

/* ================================================================
 * Relays and the Nexus
 * ================================================================ */
section("Relays and the Nexus shield");
{
    const s = fresh(17);
    const p = s.player;
    const allies = s.ships.filter((x) => x.team === "free" && !x.isPlayer && x.alive).slice(0, 2);

    /* Clear the rings of wandering bots so this measures capture, not a
     * three-way brawl that happened to start on top of relay one. */
    s.ships.forEach((ship) => {
        if (ship === p || ship === allies[0]) return;
        ship.x = 0; ship.y = 16000;
    });

    /* Put one free hull inside each of the first two capture rings. */
    p.x = s.relays[0].x; p.y = s.relays[0].y;
    allies[0].x = s.relays[1].x; allies[0].y = s.relays[1].y;
    s.relays[0].control = 0.99;
    s.relays[1].control = 0.99;
    runFor(s, 0.6);

    check("two relays fall to FREE", World.freeRelays() >= 2,
        s.relays.map((r) => r.owner).join(","));
    check("the shield-vulnerable flag fires", s.flags.relayDrop === true);

    const shieldBefore = s.nexus.shield;
    World.damageStructure(s.nexus, 200, p);
    check("the Nexus shield takes damage", s.nexus.shield < shieldBefore,
        shieldBefore + " -> " + s.nexus.shield);

    s.nexus.shield = 0;
    const hpBefore = s.nexus.hp;
    World.damageStructure(s.nexus, 250, p);
    check("with two relays the hull is exposed", s.nexus.hp < hpBefore,
        hpBefore + " -> " + s.nexus.hp);

    /* One relay is not enough: the shield regenerates instead. */
    const s2 = fresh(18);
    s2.relays.forEach((r) => { r.owner = "neutral"; r.control = 0; });
    s2.nexus.shield = 0;
    s2.nexus.shieldDownUntil = -1;
    World.damageStructure(s2.nexus, 400, s2.player);
    check("one relay leaves the shield regenerating",
        s2.nexus.shield > 0 && s2.nexus.hp === s2.nexus.hpMax,
        "shield " + s2.nexus.shield.toFixed(0) + ", hp " + s2.nexus.hp);
}

/* ================================================================
 * Leviathan and the Singularity Core
 * ================================================================ */
section("Leviathan and the core");
{
    const s = fresh(19);
    const p = s.player;
    const boss = CB.NPCs.spawnLeviathan(s);
    check("the Leviathan spawns", !!boss && boss.isBoss && boss.alive);

    World.damageShip(boss, 1e9, p, "shot");
    check("killing the boss drops a core", !boss.alive &&
        s.pickups.some((x) => x.core), "core pickups " + s.pickups.filter((x) => x.core).length);
    check("the boss cannot respawn", boss.noRespawn === true);
    check("the boss is removed from the boss slot", s.boss === null);

    const core = s.pickups.find((x) => x.core);
    p.x = core.x + 10; p.y = core.y;
    runFor(s, 0.5);
    check("the player picks up the core", p.carrierCore === true && s.coreCarrier === p,
        "carrier=" + (s.coreCarrier ? s.coreCarrier.name : "none"));

    p.x = s.nexus.x; p.y = s.nexus.y;
    runFor(s, 0.2);
    check("delivering the core breaches the Nexus",
        s.flags.coreDelivered === true && s.nexus.shield === 0 && s.stats.core === 1,
        "delivered=" + s.flags.coreDelivered + ", shield=" + s.nexus.shield);
}

/* ================================================================
 * Upgrade tree
 * ================================================================ */
section("Upgrade tree");
{
    const s = fresh(23);
    const p = s.player;
    p.x = s.home.x; p.y = s.home.y;
    World.dockPlayer();

    p.credits = 10;
    check("upgrades are refused without credits", World.upgradePlayer("dart") === false && p.tier === 1);
    check("the drydock keeps the ship docked when refused", p.docked === true);

    p.credits = 5000;
    check("tier 2 accepts a doctrine", World.upgradePlayer("dart") === true && p.hullId === "dart",
        p.hullId + " t" + p.tier);
    check("the doctrine is remembered", p.line === "lance", p.line);

    for (let tier = 3; tier <= 6; tier++) {
        const opt = Shipyard.options(p)[0];
        p.credits = 5000;
        const ok = opt && World.upgradePlayer(opt.id);
        check("can reach tier " + tier, !!ok && p.tier === tier, "tier " + p.tier);
    }
    check("tier 6 has no further options", Shipyard.options(p).length === 0);
    check("the final hull keeps its doctrine", p.line === "lance" && p.tier === 6, p.hullId);

    const s2 = fresh(24);
    s2.player.x = s2.home.x; s2.player.y = s2.home.y;
    World.dockPlayer();
    s2.player.credits = 5000;
    World.upgradePlayer("monolith");
    check("a tier-1 pilot can only pick a tier-2 hull", s2.player.tier === 1,
        "tier " + s2.player.tier);
}

/* ================================================================
 * AI economy
 * ================================================================ */
section("AI economy");
{
    const s = fresh(31);
    const startTiers = {};
    s.ships.filter((x) => x.ai && !x.isAlien).forEach((x) => { startTiers[x.name] = x.tier; });

    let nan = false;
    runFor(s, 150, {
        each: (st) => {
            for (const ship of st.ships) {
                if (!Number.isFinite(ship.x) || !Number.isFinite(ship.y) ||
                    !Number.isFinite(ship.hull) || !Number.isFinite(ship.credits)) {
                    nan = true;
                }
            }
        }
    });

    check("150 s of AI runs without NaN", !nan);
    const bots = s.ships.filter((x) => x.ai && !x.isAlien && x.team !== "feral");
    check("bots still exist", bots.length >= 8, bots.length);
    check("bots earned credits", bots.some((b) => b.credits > 0),
        bots.map((b) => b.name + ":" + Math.round(b.credits)).join(" "));
    check("bots upgraded beyond their start", bots.some((b) => b.tier > (startTiers[b.name] || 1)),
        bots.map((b) => b.name + ":t" + b.tier).join(" "));
    check("team scores move", s.teamScore.free > 0 || s.teamScore.corsair > 0,
        JSON.stringify(s.teamScore));
    check("aliens are not infinitely spawning", s.ships.filter((x) => x.isAlien).length < 80,
        s.ships.filter((x) => x.isAlien).length);
}

/* ================================================================
 * End conditions
 * ================================================================ */
section("End conditions");
{
    const win = fresh(37);
    win.nexus.shield = 0;
    win.nexus.shieldDownUntil = win.time + 30;
    World.damageStructure(win.nexus, 1e9, win.player);
    step(win);
    check("destroying the Nexus wins", win.phase === "over" && win.outcome === "win",
        win.phase + "/" + win.outcome);

    const lose = fresh(38);
    World.damageStructure(lose.home, 1e9, { team: "feral", isAlien: true });
    step(lose);
    check("losing the Anchorage loses", lose.phase === "over" && lose.outcome === "loss",
        lose.phase + "/" + lose.outcome + "/" + lose.endReason);

    const timed = fresh(39);
    timed.remaining = 0.005;
    timed.teamScore.free = 100;
    timed.teamScore.corsair = 50;
    step(timed);
    check("the collapse decides on score", timed.phase === "over" && timed.outcome === "win",
        timed.phase + "/" + timed.outcome);

    const reached = [];
    const ends = fresh(40);
    ends.onEnd = (outcome, reason) => reached.push(outcome + ":" + reason);
    ends.remaining = 0.005;
    step(ends);
    check("the end callback fires once", reached.length === 1, reached.join(","));
}

/* ================================================================
 * Long-run stability
 * ================================================================ */
section("Long-run stability");
{
    const s = fresh(41);
    const p = s.player;
    let bad = null;

    runFor(s, 300, {
        each: (st, i) => {
            if (bad) return;
            if (!Number.isFinite(st.player.x) || !Number.isFinite(st.player.y) ||
                !Number.isFinite(st.player.hull)) bad = "player NaN at step " + i;
            if (st.asteroids.some((a) => !Number.isFinite(a.hp))) bad = "asteroid NaN at step " + i;
            if (st.relays.some((r) => !Number.isFinite(r.control))) bad = "relay NaN at step " + i;
        },
        input: (st) => {
            /* Alternate between the starter field and the dock so the player
             * actually lives through five minutes. */
            if (st.player.cargoUnits > 20) {
                const dx = st.home.x - st.player.x, dy = st.home.y - st.player.y;
                const d = Math.hypot(dx, dy) || 1;
                return { moveX: dx / d, moveY: dy / d, aimX: st.home.x, aimY: st.home.y, fire: false, boost: false };
            }
            const a = nearAsteroid(st);
            if (!a) return { moveX: 0, moveY: 0, aimX: st.player.x + 1, aimY: st.player.y, fire: false, boost: false };
            const dx = a.x - st.player.x, dy = a.y - st.player.y, d = Math.hypot(dx, dy) || 1;
            return { moveX: dx / d, moveY: dy / d, aimX: a.x, aimY: a.y, fire: d < 700, boost: d > 1200 };
        }
    });

    check("five minutes of play stays numerically sane", !bad, bad);
    check("the player survives or respawns cleanly",
        s.player.alive || s.player.respawnAt > 0,
        "alive=" + s.player.alive + " hull=" + s.player.hull);
    check("the match clock still advances", s.time > 250, s.time.toFixed(1));
}

report();
