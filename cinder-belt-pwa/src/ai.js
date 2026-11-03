/*
 * Bot pilots.
 *
 * Each one runs the same economy as the player: mine, bank, upgrade, pick
 * fights it thinks it can win, run when it cannot. Personality is a few
 * numbers (greed, aggression, caution, skill) and a doctrine preference, not
 * a script. That is enough for a corsair miner to feel different from the ace
 * hunting the score leader.
 */
(function (CB) {
    "use strict";

    var C = CB.CONFIG;
    var Z = CB.Zones;

    function rand(state) { return state.rng ? state.rng.next() : Math.random(); }

    function angleDiff(a, b) {
        var d = a - b;
        while (d > Math.PI) d -= C.TAU;
        while (d < -Math.PI) d += C.TAU;
        return Math.abs(d);
    }

    function steer(ship, tx, ty, brakeDist, state, avoidHole) {
        var dx = tx - ship.x, dy = ty - ship.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / d, uy = dy / d;
        var speed = Math.hypot(ship.vx, ship.vy);
        var closing = (ship.vx * ux + ship.vy * uy);
        var thrust = 1;

        if (d < brakeDist && closing > d * 1.1) {
            /* Flip and burn rather than orbit the waypoint forever. */
            ux = -ship.vx / (speed || 1);
            uy = -ship.vy / (speed || 1);
            thrust = 0.85;
        }

        if (avoidHole) {
            var dc = Math.hypot(ship.x, ship.y);
            if (dc < C.BLACK_HOLE.gravity + 300) {
                var push = 1 - dc / (C.BLACK_HOLE.gravity + 300);
                ux += (ship.x / (dc || 1)) * push * 2.4;
                uy += (ship.y / (dc || 1)) * push * 2.4;
                var l = Math.hypot(ux, uy) || 1;
                ux /= l; uy /= l;
            }
        }

        ship.thrustX = ux * thrust;
        ship.thrustY = uy * thrust;
        if (d > 850 && ship.energy > 45) ship.boost = true;
    }

    function brake(ship) {
        var s = Math.hypot(ship.vx, ship.vy);
        if (s > 20) {
            ship.thrustX = -ship.vx / s;
            ship.thrustY = -ship.vy / s;
        } else {
            ship.thrustX = 0; ship.thrustY = 0;
        }
    }

    function aimAt(ship, tx, ty, lead, state, error) {
        var dx = tx - ship.x, dy = ty - ship.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var px = tx, py = ty;
        if (lead) {
            var t = d / (ship.stats.bulletSpeed || 800);
            px += lead.vx * t * 0.72;
            py += lead.vy * t * 0.72;
        }
        var a = Math.atan2(py - ship.y, px - ship.x);
        if (error) {
            a += (rand(state) - 0.5) * error;
        }
        ship.aimX = Math.cos(a);
        ship.aimY = Math.sin(a);
        return { angle: a, dist: d };
    }

    function useTacticalAbility(ship, state, target, dist) {
        if (ship.abilityCdLeft > 0) return;
        var hpPct = ship.hull / ship.hullMax;
        if (ship.ability === "dash") {
            if (hpPct < 0.55 || (target && dist > 850)) CB.World.useAbility(ship);
        } else if (ship.ability === "barrier") {
            if (hpPct < 0.7 || (state.time - ship.lastHit < 0.5)) CB.World.useAbility(ship);
        } else if (ship.ability === "tractor") {
            if (ship.hull < ship.hullMax * 0.6) CB.World.useAbility(ship);
        }
    }

    function dockAt(ship, station, state) {
        var d = CB.World.dist(ship.x, ship.y, station.x, station.y);
        if (d < station.dockRadius * 0.92) {
            CB.World.botService(ship);
            ship.docked = true;
            ship.undockAt = state.time + 1.2 + rand(state) * 0.8;
            ship.thrustX = 0; ship.thrustY = 0;
            ship.wantFire = false;
            ship.boost = false;
            return true;
        }
        steer(ship, station.x, station.y, 120, state, true);
        ship.aimX = (station.x - ship.x);
        ship.aimY = (station.y - ship.y);
        var l = Math.hypot(ship.aimX, ship.aimY) || 1;
        ship.aimX /= l; ship.aimY /= l;
        ship.wantFire = false;
        return false;
    }

    function nearbyPickup(ship, state, range) {
        var best = null, bestD = range * range;
        for (var i = 0; i < state.pickups.length; i++) {
            var p = state.pickups[i];
            if (p.core && ship.team === "corsair" && !state.flags.nexusShieldBroken) {
                /* Corsairs will still grab a core to deny it, but not before
                 * they understand it matters. */
            }
            var d = (p.x - ship.x) * (p.x - ship.x) + (p.y - ship.y) * (p.y - ship.y);
            if (d < bestD) { bestD = d; best = p; }
        }
        return best;
    }

    function fight(ship, target, state, ally) {
        var d = CB.World.dist(ship.x, ship.y, target.x, target.y);
        var line = ship.line || "lance";
        var preferred = line === "lance" ? 460 : line === "bulwark" ? 280 : 500;
        var ux = (target.x - ship.x) / (d || 1);
        var uy = (target.y - ship.y) / (d || 1);
        var perpX = -uy, perpY = ux;
        var dir = ship.id % 2 === 0 ? 1 : -1;
        var approach = 0, strafe = 0;
        if (d > preferred + 110) approach = 1;
        else if (d < preferred - 90) approach = -1;
        else strafe = 0.75 * dir;

        ship.thrustX = ux * approach + perpX * strafe;
        ship.thrustY = uy * approach + perpY * strafe;

        var error = (1 - ship.skill) * 0.22;
        if (ally) error *= 0.9;
        aimAt(ship, target.x, target.y, target, state, error);
        var aimed = angleDiff(ship.angle, Math.atan2(ship.aimY, ship.aimX));
        ship.wantFire = d < ship.stats.range * 1.02 && aimed < 0.2 + (1 - ship.skill) * 0.1;
        if (d > 700 && ship.energy > 55) ship.boost = true;

        /* Lead the target's movement; the error term is applied inside aimAt. */
        if (target.isAlien && d < 260) {
            /* Aliens ram, so a fragile hull should back off rather than joust. */
            if (ship.line === "lance") {
                ship.thrustX -= ux * 0.6;
                ship.thrustY -= uy * 0.6;
            }
        }
        useTacticalAbility(ship, state, target, d);
    }

    function attackStructure(ship, station, state) {
        var d = CB.World.dist(ship.x, ship.y, station.x, station.y);
        var range = station.kind === "nexus" ? 720 : 640;
        if (d > range * 0.88) {
            steer(ship, station.x, station.y, 100, state, true);
        } else {
            var ux = (station.x - ship.x) / (d || 1);
            var uy = (station.y - ship.y) / (d || 1);
            ship.thrustX = -uy * (ship.id % 2 ? 1 : -1) + ux * 0.15;
            ship.thrustY = ux * (ship.id % 2 ? 1 : -1) + uy * 0.15;
        }
        aimAt(ship, station.x, station.y, null, state, 0.02);
        ship.wantFire = d < range;
        ship.boost = false;
    }

    function patrolRelay(ship, relay, state) {
        var d = CB.World.dist(ship.x, ship.y, relay.x, relay.y);
        if (d > relay.radius * 0.6) {
            steer(ship, relay.x, relay.y, 90, state, true);
        } else {
            var ux = (relay.x - ship.x) / (d || 1);
            var uy = (relay.y - ship.y) / (d || 1);
            ship.thrustX = -uy * 0.45;
            ship.thrustY = ux * 0.45;
        }
        var target = CB.World.nearestEnemy(ship, 1000, state.time);
        if (target) {
            fight(ship, target, state, true);
        } else {
            ship.wantFire = false;
        }
    }

    function mine(ship, state) {
        var target = CB.World.nearestAsteroid(ship, 2600);
        var pickup = nearbyPickup(ship, state, 700);
        if (!target) {
            var angle = (ship.id * 2.399) % C.TAU;
            var radius = 5600 + (ship.id % 5) * 300;
            steer(ship, Math.cos(angle) * radius, Math.sin(angle) * radius, 200, state, true);
            ship.wantFire = false;
            return;
        }
        var d = CB.World.dist(ship.x, ship.y, target.x, target.y);
        if (d > 260) {
            steer(ship, target.x, target.y, 100, state, true);
        } else if (pickup && CB.World.dist(ship.x, ship.y, pickup.x, pickup.y) < 240) {
            steer(ship, pickup.x, pickup.y, 60, state, true);
        } else {
            brake(ship);
        }
        aimAt(ship, target.x, target.y, null, state, 0.02);
        var aimed = angleDiff(ship.angle, Math.atan2(ship.aimY, ship.aimX));
        ship.wantFire = d < ship.stats.range * 0.95 && aimed < 0.3;
        ship.boost = false;
        if (pickup) {
            if (ship.energy > 60 && ship.ability === "tractor" && ship.hull < ship.hullMax * 0.75) {
                CB.World.useAbility(ship);
            }
        }
    }

    function think(ship, state) {
        var st = ship.stats;
        var zone = Z.zoneAt(ship.x, ship.y);
        var station = CB.World.stationFor(ship.team);
        var hpPct = ship.hull / ship.hullMax;
        var cargoPct = ship.cargoUnits / st.cargo;
        var ally = ship.team === "free" && ship.ai && ship.ai.role === "ally";
        var order = ally ? (state.playerOrder || 0) : 0;
        var target = CB.World.nearestEnemy(ship, ship.ai && ship.ai.ace ? 2100 : 1450, state.time);
        var isCarrier = ship.carrierCore;
        var freeHeld = CB.World.freeRelays();

        ship.aiState = "mine";
        ship.wantFire = false;
        ship.boost = false;

        /* A corsair ace hunts the score leader; everyone else takes what is
         * in front of them. */
        if (ship.ai && ship.ai.ace && !isCarrier) {
            var leader = state.player && state.player.alive ? state.player : null;
            if (leader && Z.canHarm(ship, leader, state.time)) target = leader;
        }

        if (isCarrier) {
            var dest = ship.team === "corsair" ? state.home : state.nexus;
            if (dest && dest.alive) {
                if (CB.World.dist(ship.x, ship.y, dest.x, dest.y) < dest.dockRadius) {
                    /* World.updateCore scores this on the next tick. */
                    brake(ship);
                } else {
                    steer(ship, dest.x, dest.y, 80, state, true);
                }
                ship.aiState = "core";
                if (target && CB.World.dist(ship.x, ship.y, target.x, target.y) < 800) {
                    aimAt(ship, target.x, target.y, target, state, 0.05);
                    ship.wantFire = true;
                }
                return;
            }
        }

        /* Run home with a full hold or a broken hull. */
        var wantsDock = cargoPct >= 0.96 || (hpPct < 0.28 && !(target && hPctCloser(ship, target, state)));
        if (ship.outlawUntil > state.time) wantsDock = false;
        if (wantsDock && station) {
            ship.aiState = "return";
            dockAt(ship, station, state);
            return;
        }

        /* Fight: aliens are always fair game; ships only where the law says so. */
        var shouldFight = false;
        if (target) {
            var td = CB.World.dist(ship.x, ship.y, target.x, target.y);
            if (target.isAlien && zone.safe) target = null;
            else if (target.isAlien) shouldFight = td < 900 || hpPct > 0.5;
            else {
                var aggression = (ship.ai && ship.ai.personality ? ship.ai.personality.aggression : 0.5);
                shouldFight = zone.pvp || target.outlawUntil > state.time ||
                    (order === 2) || (order === 4 && td < 900) ||
                    (ship.ai && ship.ai.ace);
                if (ship.line === "harvester" && aggression < 0.45 && td > 500) shouldFight = false;
                if (hpPct < 0.35 && aggression < 0.7 && td > 300) shouldFight = false;
            }
            if (shouldFight) {
                ship.aiState = "fight";
                fight(ship, target, state, ally);
                return;
            }
        }

        /* Player orders override the default economy for wingmen. */
        if (ally) {
            if (order === 4 && state.player) {
                var pd = CB.World.dist(ship.x, ship.y, state.player.x, state.player.y);
                if (pd > 620) {
                    steer(ship, state.player.x, state.player.y, 180, state, true);
                    ship.aiState = "follow";
                    return;
                }
            }
            if (order === 3 && station) {
                var guard = CB.World.nearestRelay(ship, 2600) || station;
                if (CB.World.dist(ship.x, ship.y, guard.x, guard.y) > 500) {
                    steer(ship, guard.x, guard.y, 150, state, true);
                    ship.aiState = "guard";
                    return;
                }
            }
            if (order === 1) {
                mine(ship, state);
                return;
            }
        }

        /* Objective play. */
        if (ship.team === "free") {
            if ((freeHeld >= 2 || state.flags.nexusShieldBroken || state.flags.coreDelivered) &&
                ship.tier >= 3 && (ship.line !== "harvester" || ship.ai.ace)) {
                ship.aiState = "nexus";
                attackStructure(ship, state.nexus, state);
                return;
            }
            if (ship.tier >= 2 && ship.line !== "harvester" && freeHeld < 2 &&
                (zone.id === "scab" || zone.id === "maw")) {
                var relay = CB.World.nearestRelay(ship, 2200);
                if (relay && relay.owner !== "free") {
                    ship.aiState = "relay";
                    patrolRelay(ship, relay, state);
                    return;
                }
            }
        } else if (ship.team === "corsair") {
            if (freeHeld >= 1 && ship.tier >= 3 && (zone.id === "scab" || zone.id === "maw")) {
                var relay2 = CB.World.nearestRelay(ship, 2400);
                if (relay2 && relay2.owner !== "corsair") {
                    ship.aiState = "relay";
                    patrolRelay(ship, relay2, state);
                    return;
                }
            }
            if (ship.tier >= 4 && state.time > 520 && freeHeld >= 2) {
                ship.aiState = "nexus";
                attackStructure(ship, state.nexus, state);
                return;
            }
        }

        mine(ship, state);
    }

    function hPctCloser(ship, target, state) {
        return CB.World.dist(ship.x, ship.y, target.x, target.y) < 260;
    }

    function update(dt, state) {
        for (var i = 0; i < state.ships.length; i++) {
            var ship = state.ships[i];
            if (!ship.alive || ship.isPlayer || ship.isAlien || ship.docked) continue;
            ship.aiTimer -= dt;
            if (ship.aiTimer > 0) continue;
            ship.aiTimer = C.BOT.think + rand(state) * 0.08;
            think(ship, state);
        }
    }

    CB.AI = { update: update, think: think };
})(window.CB = window.CB || {});
