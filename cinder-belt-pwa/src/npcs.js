/*
 * The Feral: the belt's original tenants.
 *
 * Aliens are not a difficulty slider. They are a third faction with their own
 * simple wants - food, territory, and the Anchorage's reactor - and they will
 * happily eat a corsair as readily as a salvager. The Leviathan is the only
 * creature that can hand either side the key to the Nexus.
 */
(function (CB) {
    "use strict";

    var C = CB.CONFIG;
    var Z = CB.Zones;

    function rand(state) { return state.rng ? state.rng.next() : Math.random(); }

    function alienStats(type, tier) {
        if (type === "mite") {
            return {
                id: "mite", name: "MITE", tier: 1, line: "lance",
                hull: 46, shield: 0, energy: 40, speed: 300, accel: 720,
                cargo: 0, damage: 0, rate: 1, pellets: 0, spread: 0,
                bulletSpeed: 500, range: 0, radius: 12, magnet: 80, mining: 0,
                ability: "dash", abilityName: "LUNGE", abilityCd: 6, color: "#c084fc"
            };
        }
        if (type === "lurker") {
            return {
                id: "lurker", name: "LURKER", tier: 2, line: "lance",
                hull: 115, shield: 20, energy: 70, speed: 195, accel: 430,
                cargo: 0, damage: 7, rate: 1.5, pellets: 1, spread: 0.03,
                bulletSpeed: 640, range: 600, radius: 16, magnet: 100, mining: 0,
                ability: "dash", abilityName: "LUNGE", abilityCd: 7, color: "#a78bfa"
            };
        }
        if (type === "warden") {
            return {
                id: "warden", name: "WARDEN", tier: 5, line: "bulwark",
                hull: 430, shield: 140, energy: 140, speed: 155, accel: 340,
                cargo: 0, damage: 12, rate: 1.15, pellets: 3, spread: 0.22,
                bulletSpeed: 590, range: 720, radius: 26, magnet: 140, mining: 0,
                ability: "barrier", abilityName: "CARAPACE", abilityCd: 12, color: "#8b5cf6"
            };
        }
        if (type === "leviathan") {
            return {
                id: "leviathan", name: "LEVIATHAN", tier: 8, line: "harvester",
                hull: 5200, shield: 900, energy: 500, speed: 100, accel: 230,
                cargo: 0, damage: 20, rate: 0.72, pellets: 12, spread: 6.1,
                bulletSpeed: 540, range: 980, radius: 88, magnet: 200, mining: 0,
                ability: "barrier", abilityName: "CARAPACE", abilityCd: 16, color: "#d8b4fe",
                speedCap: 110
            };
        }
        return alienStats("mite", tier);
    }

    function spawnAlien(state, type, x, y, opts) {
        var stats = alienStats(type);
        var ship = CB.World.makeShip({
            team: "feral", name: stats.name,
            x: x, y: y,
            color: stats.color,
            skill: type === "leviathan" ? 0.7 : 0.4,
            aggro: 0.8
        });
        ship.isAlien = true;
        ship.isBoss = type === "leviathan";
        ship.noRespawn = true;
        ship.alienType = type;
        ship.stats = stats;
        ship.hullId = stats.id;
        ship.line = stats.line;
        ship.tier = stats.tier;
        ship.hullMax = stats.hull;
        ship.shieldMax = stats.shield;
        ship.energyMax = stats.energy;
        ship.hull = stats.hull;
        ship.shield = stats.shield;
        ship.energy = stats.energy;
        ship.radius = stats.radius;
        ship.ability = stats.ability;
        ship.abilityName = stats.abilityName;
        ship.abilityCd = stats.abilityCd;
        ship.mining = 0;
        ship.cargoUnits = 0;
        ship.ai = { kind: "alien", type: type };
        ship.anchorX = x;
        ship.anchorY = y;
        ship.raid = !!(opts && opts.raid);
        ship.meleeCd = 0;
        ship.spawnCd = 5 + rand(state) * 4;
        if (type === "leviathan") {
            state.boss = ship;
            if (CB.Audio) CB.Audio.boss();
        }
        return ship;
    }

    function safeDriftPoint(state, minR, maxR) {
        for (var i = 0; i < 30; i++) {
            var a = rand(state) * C.TAU;
            var r = minR + rand(state) * (maxR - minR);
            var x = Math.cos(a) * r;
            var y = Math.sin(a) * r;
            if (Z.inSafe(x, y)) continue;
            if (CB.World.dist(x, y, state.home.x, state.home.y) < C.SAFE_RADIUS + 300) continue;
            return { x: x, y: y };
        }
        return { x: 0, y: 5000 };
    }

    function spawnInitial(state) {
        var i;
        for (i = 0; i < 13; i++) {
            var p = safeDriftPoint(state, 4800, 7400);
            spawnAlien(state, "mite", p.x, p.y);
        }
        for (i = 0; i < 8; i++) {
            var p2 = safeDriftPoint(state, 4700, 7200);
            spawnAlien(state, "lurker", p2.x, p2.y);
        }
        for (i = 0; i < 4; i++) {
            var p3 = safeDriftPoint(state, 5000, 7000);
            spawnAlien(state, "warden", p3.x, p3.y);
        }
        /* A couple of Scab residents, so PvP has a third party. */
        for (i = 0; i < 4; i++) {
            var a = rand(state) * C.TAU;
            var r = 2700 + rand(state) * 1300;
            spawnAlien(state, i % 2 ? "lurker" : "mite", Math.cos(a) * r, Math.sin(a) * r);
        }
        state.events.alienSpawnTimer = 12;
    }

    function spawnRaid(state) {
        var count = 6;
        for (var i = 0; i < count; i++) {
            var a = (i / count) * C.TAU + rand(state) * 0.3;
            var r = C.SAFE_RADIUS + 220 + rand(state) * 160;
            var x = state.home.x + Math.cos(a) * r;
            var y = state.home.y + Math.sin(a) * r;
            var type = i % 4 === 0 ? "lurker" : "mite";
            var raider = spawnAlien(state, type, x, y, { raid: true });
            /* A raid is a punch, not a permanent siege. If it cannot break
             * the Anchorage it disperses back into the Drift. */
            raider.raidUntil = state.time + 62;
        }
        CB.World.addFeed("Feral signatures inbound on the Anchorage.", "#c084fc");
    }

    function spawnLeviathan(state) {
        var p = safeDriftPoint(state, 5700, 7000);
        var boss = spawnAlien(state, "leviathan", p.x, p.y);
        boss.aimX = -1;
        boss.aimY = 0;
        CB.World.addFeed("LEVIATHAN sighted in the Drift. Its core is worth a war.", "#d8b4fe");
        return boss;
    }

    function steerAlien(ship, tx, ty, state, keepDistance) {
        var dx = tx - ship.x, dy = ty - ship.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / d, uy = dy / d;
        var speed = Math.hypot(ship.vx, ship.vy);
        if (keepDistance && d < keepDistance && speed > 40) {
            ux = -ship.vx / speed;
            uy = -ship.vy / speed;
        }
        var dc = Math.hypot(ship.x, ship.y);
        if (dc < C.BLACK_HOLE.gravity + 200) {
            var push = 1 - dc / (C.BLACK_HOLE.gravity + 200);
            ux += (ship.x / (dc || 1)) * push * 2;
            uy += (ship.y / (dc || 1)) * push * 2;
            var l = Math.hypot(ux, uy) || 1;
            ux /= l; uy /= l;
        }
        ship.thrustX = ux;
        ship.thrustY = uy;
        ship.boost = false;
    }

    function aimAlien(ship, target, state) {
        var d = CB.World.dist(ship.x, ship.y, target.x, target.y);
        var lead = d / (ship.stats.bulletSpeed || 600);
        var px = target.x + (target.vx || 0) * lead * 0.65;
        var py = target.y + (target.vy || 0) * lead * 0.65;
        var error = (1 - ship.skill) * 0.18;
        var a = Math.atan2(py - ship.y, px - ship.x) + (rand(state) - 0.5) * error;
        ship.aimX = Math.cos(a);
        ship.aimY = Math.sin(a);
        var diff = a - ship.angle;
        while (diff > Math.PI) diff -= C.TAU;
        while (diff < -Math.PI) diff += C.TAU;
        return Math.abs(diff);
    }

    function update(dt, state) {
        var aliensAlive = 0;

        for (var i = 0; i < state.ships.length; i++) {
            var ship = state.ships[i];
            if (!ship.isAlien) continue;
            if (!ship.alive) continue;
            aliensAlive += 1;
            if (ship.docked) continue;

            var zone = Z.zoneAt(ship.x, ship.y);
            var detect = ship.isBoss ? 1800 : ship.alienType === "mite" ? 760 :
                ship.alienType === "warden" ? 1050 : 900;
            var target = null;
            var bestD = detect * detect;

            if (ship.raid && state.time > (ship.raidUntil || Infinity)) {
                ship.raid = false;
                ship.anchorX = ship.x;
                ship.anchorY = ship.y;
            }
            if (ship.raid) {
                if (state.home && state.home.alive) target = state.home;
            } else {
                for (var s = 0; s < state.ships.length; s++) {
                    var other = state.ships[s];
                    if (!other.alive || other.docked || other.team === "feral") continue;
                    if (Z.inSafe(other.x, other.y)) continue;
                    var d2 = (other.x - ship.x) * (other.x - ship.x) + (other.y - ship.y) * (other.y - ship.y);
                    if (d2 < bestD) { bestD = d2; target = other; }
                }
            }

            if (ship.isBoss) {
                ship.spawnCd -= dt;
                if (ship.spawnCd <= 0) {
                    ship.spawnCd = 7.5;
                    for (var m = 0; m < 2; m++) {
                        var ma = rand(state) * C.TAU;
                        spawnAlien(state, "mite", ship.x + Math.cos(ma) * 130, ship.y + Math.sin(ma) * 130);
                    }
                }
            }

            if (target) {
                var td = CB.World.dist(ship.x, ship.y, target.x, target.y);
                var keep = ship.alienType === "mite" ? 0 : ship.alienType === "warden" ? 480 : 350;
                if (ship.raid && target.isStructure) keep = 300;
                steerAlien(ship, target.x, target.y, state, keep);
                var aimed = aimAlien(ship, target, state);

                if (ship.alienType !== "mite") {
                    ship.wantFire = td < ship.stats.range && aimed < 0.35;
                } else {
                    ship.wantFire = false;
                    if (td < ship.radius + (target.radius || 18) + 8) {
                        ship.meleeCd -= dt;
                        if (ship.meleeCd <= 0) {
                            ship.meleeCd = 0.75;
                            if (target.isStructure) {
                                CB.World.damageStructure(target, 9, ship);
                            } else {
                                CB.World.damageShip(target, 13, ship, "melee");
                            }
                            CB.World.spark(ship.x, ship.y, "#c084fc", 5, 120);
                        }
                    }
                }
                if (ship.alienType === "warden" && ship.abilityCdLeft <= 0 && ship.hull < ship.hullMax * 0.7) {
                    CB.World.useAbility(ship);
                }
            } else {
                /* Patrol the nest. */
                var wander = state.time * 0.08 + ship.id;
                var wx = ship.anchorX + Math.cos(wander) * 220;
                var wy = ship.anchorY + Math.sin(wander) * 220;
                var wd = CB.World.dist(ship.x, ship.y, wx, wy);
                if (wd > 50) steerAlien(ship, wx, wy, state, 0);
                else {
                    ship.thrustX = 0;
                    ship.thrustY = 0;
                }
                ship.aimX = Math.cos(wander);
                ship.aimY = Math.sin(wander);
                ship.wantFire = false;
            }

            if (Z.inSafe(ship.x, ship.y) && !ship.raid) {
                var out = Math.atan2(ship.y - state.home.y, ship.x - state.home.x);
                ship.thrustX = Math.cos(out);
                ship.thrustY = Math.sin(out);
            }
        }

        /* Keep the Drift populated, but never spawn inside the safe bubble. */
        state.events.alienSpawnTimer -= dt;
        if (state.events.alienSpawnTimer <= 0) {
            state.events.alienSpawnTimer = 9 + rand(state) * 5;
            if (aliensAlive < 32) {
                var p = safeDriftPoint(state, 4700, 7400);
                var roll = rand(state);
                spawnAlien(state, roll < 0.58 ? "mite" : roll < 0.9 ? "lurker" : "warden", p.x, p.y);
            }
        }
    }

    CB.NPCs = {
        update: update,
        spawnInitial: spawnInitial,
        spawnRaid: spawnRaid,
        spawnLeviathan: spawnLeviathan,
        spawnAlien: spawnAlien,
        alienStats: alienStats
    };
})(window.CB = window.CB || {});
