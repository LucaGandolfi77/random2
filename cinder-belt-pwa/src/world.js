/*
 * CINDER BELT simulation.
 *
 * Fixed 60 Hz, plain objects, no hidden state in the renderer. Everything the
 * player can lose - cargo, hull, relays, the Nexus - lives here so the
 * headless suite can play the game without a canvas.
 */
(function (CB) {
    "use strict";

    var C = CB.CONFIG;
    var Z = CB.Zones;
    var S = CB.Shipyard;

    var state = {
        phase: "menu",
        seed: 1,
        time: 0,
        remaining: C.MATCH_TIME,
        difficulty: "pilot",
        rng: null,
        ships: [],
        asteroids: [],
        bullets: [],
        pickups: [],
        particles: [],
        stations: [],
        relays: [],
        feed: [],
        comms: "",
        commsUntil: 0,
        player: null,
        home: null,
        nexus: null,
        boss: null,
        coreCarrier: null,
        input: null,
        camera: { x: 0, y: 0, zoom: 1 },
        teamScore: { free: 0, corsair: 0 },
        stats: { kills: 0, deaths: 0, ore: 0, banked: 0, bossKills: 0, relays: 0, core: 0 },
        events: {},
        flags: {},
        playerOrder: 0,
        lastZone: "anchorage",
        outcome: null,
        endReason: null,
        onEnd: null,
        onDock: null,
        onZone: null,
        nextId: 1,
        shake: 0,
        message: "",
        messageUntil: 0
    };

    function rnd() { return state.rng ? state.rng.next() : Math.random(); }
    function range(lo, hi) { return lo + rnd() * (hi - lo); }
    function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function lerp(a, b, t) { return a + (b - a) * t; }

    function addFeed(text, color) {
        state.feed.unshift({ text: text, color: color || "#cbd5e1", t: state.time });
        if (state.feed.length > 7) state.feed.length = 7;
    }

    function setMessage(text, life) {
        state.message = text;
        state.messageUntil = state.time + (life || 3);
    }

    /* ===== entities ===== */

    function hullFor(line, tier) {
        if (tier <= 1 || !line) return C.STARTER;
        var l = C.LINES[line];
        if (!l) return C.STARTER;
        return l.hulls[Math.min(l.hulls.length - 1, Math.max(0, tier - 2))];
    }

    function makeShip(cfg) {
        var hull = cfg.hullId ? S.getHull(cfg.hullId) : hullFor(cfg.line, cfg.tier || 1);
        var ship = {
            id: state.nextId++,
            team: cfg.team || "free",
            name: cfg.name || "PILOT",
            isPlayer: !!cfg.isPlayer,
            isBot: !cfg.isPlayer,
            isAlien: !!cfg.isAlien,
            ai: cfg.ai || null,
            hullId: hull.id,
            line: hull.tier === 1 ? "lance" : (hull.line || "lance"),
            tier: hull.tier,
            stats: JSON.parse(JSON.stringify(hull)),
            color: cfg.color || hull.color || "#e2e8f0",
            x: cfg.x || 0, y: cfg.y || 0,
            vx: 0, vy: 0,
            angle: cfg.angle || 0,
            aimX: 1, aimY: 0,
            thrustX: 0, thrustY: 0,
            wantFire: false, boost: false,
            docked: false,
            alive: true,
            respawnAt: 0,
            invuln: 0,
            outlawUntil: 0,
            credits: cfg.credits || 0,
            cargoUnits: 0,
            cargoValue: 0,
            cargoCounts: {},
            kills: 0,
            deaths: 0,
            damageDone: 0,
            score: 0,
            carrierCore: false,
            fireCd: 0,
            abilityCdLeft: 0,
            abilityActive: 0,
            barrierHp: 0,
            dashTime: 0,
            lastHit: -99,
            shieldHit: 0,
            hitFlash: 0,
            engine: 0,
            spawn: state.time,
            undockAt: 0,
            aiTarget: null,
            aiState: "mine",
            aiTimer: 0,
            aiGoal: null,
            skill: cfg.skill == null ? 0.5 : cfg.skill,
            aggro: cfg.aggro == null ? 0.5 : cfg.aggro
        };
        ship.hullMax = ship.stats.hull;
        ship.shieldMax = ship.stats.shield;
        ship.energyMax = ship.stats.energy;
        ship.hull = ship.hullMax;
        ship.shield = ship.shieldMax;
        ship.energy = ship.energyMax;
        ship.radius = ship.stats.radius;
        ship.ability = ship.stats.ability;
        ship.abilityName = ship.stats.abilityName;
        ship.abilityCd = ship.stats.abilityCd;
        ship.mining = ship.stats.mining || 1;
        state.ships.push(ship);
        return ship;
    }

    function makeStation(cfg) {
        var st = {
            id: state.nextId++,
            kind: cfg.kind,
            team: cfg.team,
            x: cfg.x, y: cfg.y,
            radius: cfg.radius,
            dockRadius: cfg.dockRadius,
            hp: cfg.hp, hpMax: cfg.hp,
            shield: cfg.shield || 0,
            shieldMax: cfg.shield || 0,
            shieldRegen: cfg.shieldRegen || 0,
            shieldDownUntil: 0,
            alive: true,
            turretCd: 0,
            turretAngle: 0,
            hitFlash: 0,
            pulse: 0
        };
        state.stations.push(st);
        return st;
    }

    function makeRelay(x, y, index) {
        var relay = {
            id: state.nextId++,
            x: x, y: y,
            index: index,
            owner: "neutral",
            control: 0,
            radius: 300,
            pulse: 0,
            hitFlash: 0
        };
        state.relays.push(relay);
        return relay;
    }

    /* ===== generation ===== */

    function asteroidAt(x, y, oreName, radius) {
        var ore = C.ORES[oreName];
        var verts = [];
        var n = 8 + Math.floor(rnd() * 5);
        for (var i = 0; i < n; i++) {
            verts.push({ a: (i / n) * C.TAU, r: radius * (0.72 + rnd() * 0.34) });
        }
        return {
            id: state.nextId++,
            x: x, y: y,
            radius: radius,
            ore: oreName,
            oreValue: ore.value,
            hp: 34 + radius * 2.1,
            hpMax: 34 + radius * 2.1,
            verts: verts,
            rot: rnd() * C.TAU,
            spin: range(-0.18, 0.18),
            alive: true,
            respawnAt: 0,
            hitFlash: 0,
            rich: rnd() < 0.16
        };
    }

    function safeSpawnPoint(minR, maxR) {
        for (var attempt = 0; attempt < 40; attempt++) {
            var a = rnd() * C.TAU;
            var r = range(minR, maxR);
            var x = Math.cos(a) * r;
            var y = Math.sin(a) * r;
            if (dist(x, y, state.home.x, state.home.y) < C.SAFE_RADIUS + 160) continue;
            if (dist(x, y, C.NEXUS.x, C.NEXUS.y) < 360) continue;
            if (Math.hypot(x, y) < 650) continue;
            var ok = true;
            for (var j = 0; j < state.relays.length; j++) {
                if (dist(x, y, state.relays[j].x, state.relays[j].y) < 380) { ok = false; break; }
            }
            if (!ok) continue;
            return { x: x, y: y };
        }
        var fallbackAngle = rnd() * C.TAU;
        return { x: Math.cos(fallbackAngle) * maxR, y: Math.sin(fallbackAngle) * maxR };
    }

    function spawnAsteroids() {
        var i;
        var specs = [
            { count: 52, min: 2350, max: 4300, ores: ["cobalt", "cobalt", "prism", "ferrite"] },
            { count: 72, min: 4650, max: 7500, ores: ["ferrite", "ferrite", "ferrite", "cobalt"] },
            { count: 46, min: 760, max: 1950, ores: ["prism", "prism", "voidglass", "cobalt"] }
        ];
        specs.forEach(function (spec) {
            for (i = 0; i < spec.count; i++) {
                var p = safeSpawnPoint(spec.min, spec.max);
                var ore = spec.ores[Math.floor(rnd() * spec.ores.length)];
                var radius = range(22, 54);
                state.asteroids.push(asteroidAt(p.x, p.y, ore, radius));
            }
        });
        /* A couple of decorative rocks just outside the safe bubble. */
        for (i = 0; i < 12; i++) {
            var a = rnd() * C.TAU;
            var r = C.SAFE_RADIUS + range(80, 500);
            state.asteroids.push(asteroidAt(state.home.x + Math.cos(a) * r, state.home.y + Math.sin(a) * r, "ferrite", range(18, 34)));
        }
        /* Starter field inside the bubble: a new pilot can mine something
         * without crossing into PvP on their first sortie. */
        for (i = 0; i < 11; i++) {
            var sa = rnd() * C.TAU;
            var sr = range(470, 1130);
            var ore = i % 3 === 1 ? "cobalt" : "ferrite";
            state.asteroids.push(asteroidAt(
                state.home.x + Math.cos(sa) * sr,
                state.home.y + Math.sin(sa) * sr,
                ore, range(20, 38)
            ));
        }
    }

    function spawnStarterFleet() {
        state.player = makeShip({
            team: "free", name: "YOU", isPlayer: true,
            x: state.home.x + 250, y: state.home.y + 40, angle: 0,
            tier: 1, hullId: "sparrow", color: "#fef3c7"
        });
        state.player.credits = 0;
        state.player.aggro = 0.6;

        var allies = C.BOT_NAMES.free;
        allies.forEach(function (b, i) {
            var ship = makeShip({
                team: "free", name: b.name,
                x: state.home.x + 180 + i * 70, y: state.home.y - 150 - i * 40,
                angle: 0, line: b.line, tier: i === 2 ? 2 : 1,
                color: C.COLORS.free,
                ai: { kind: "bot", role: "ally", personality: b },
                skill: b.skill, aggro: b.aggression, credits: i === 2 ? 50 : 20
            });
            ship.ai.greed = b.greed;
            ship.ai.caution = b.caution;
            ship.ai.ace = false;
        });

        C.BOT_NAMES.neutral.forEach(function (b, i) {
            var ship = makeShip({
                team: "neutral", name: b.name,
                x: state.home.x + 500, y: state.home.y + 380 + i * 90,
                line: "harvester", tier: 2, color: C.COLORS.neutral,
                ai: { kind: "bot", role: "neutral", personality: b },
                skill: b.skill, aggro: 0.1, credits: 40
            });
            ship.ai.greed = b.greed;
            ship.ai.caution = b.caution;
        });

        C.BOT_NAMES.corsair.forEach(function (b, i) {
            var ship = makeShip({
                team: "corsair", name: b.name,
                x: C.NEXUS.x + range(-300, 300), y: C.NEXUS.y + range(240, 520),
                angle: Math.PI / 2, line: b.line,
                tier: b.ace ? 4 : (i < 3 ? 3 : 2),
                color: C.COLORS.corsair,
                ai: { kind: "bot", role: "corsair", personality: b },
                skill: b.skill, aggro: b.aggression,
                credits: b.ace ? 160 : 60
            });
            ship.ai.greed = b.greed;
            ship.ai.caution = b.caution;
            ship.ai.ace = !!b.ace;
        });
    }

    function initMatch(seed, difficulty) {
        state.phase = "running";
        state.seed = seed >>> 0 || 1;
        state.rng = CB.RNG(state.seed);
        state.time = 0;
        state.remaining = C.MATCH_TIME;
        state.difficulty = difficulty || "pilot";
        state.ships = [];
        state.asteroids = [];
        state.bullets = [];
        state.pickups = [];
        state.particles = [];
        state.stations = [];
        state.relays = [];
        state.feed = [];
        state.comms = "";
        state.commsUntil = 0;
        state.player = null;
        state.boss = null;
        state.coreCarrier = null;
        state.teamScore = { free: 0, corsair: 0 };
        state.stats = { kills: 0, deaths: 0, ore: 0, banked: 0, bossKills: 0, relays: 0, core: 0 };
        state.events = {
            bountyOne: false, bountyTwo: false,
            ion: false, ionUntil: 0,
            raidOne: false, raidTwo: false,
            leviathan: false, leviathanDead: false,
            collapseWarning: false,
            commsTimer: 12
        };
        state.flags = { nexusShieldBroken: false, coreDelivered: false };
        state.playerOrder = 0;
        state.lastZone = "anchorage";
        state.outcome = null;
        state.endReason = null;
        state.nextId = 1;
        state.shake = 0;
        state.message = "";
        state.messageUntil = 0;

        state.home = makeStation({
            kind: "station", team: "free",
            x: C.HOME.x, y: C.HOME.y,
            radius: C.STATION.radius, dockRadius: C.STATION.dockRadius,
            hp: C.STATION.hp
        });
        state.nexus = makeStation({
            kind: "nexus", team: "corsair",
            x: C.NEXUS.x, y: C.NEXUS.y,
            radius: C.NEXUS.radius, dockRadius: C.NEXUS.dockRadius,
            hp: C.NEXUS.hp, shield: C.NEXUS.shield,
            shieldRegen: C.NEXUS.shieldRegen
        });

        [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6].forEach(function (a, i) {
            makeRelay(Math.cos(a) * C.RELAY_RADIUS, Math.sin(a) * C.RELAY_RADIUS, i);
        });

        spawnAsteroids();
        spawnStarterFleet();
        if (CB.NPCs) CB.NPCs.spawnInitial(state);
        state.camera.x = state.player.x;
        state.camera.y = state.player.y;

        addFeed("Anchorage control: welcome back, salvager.", "#5eead4");
        addFeed("Objective: hold two relays, then break the Nexus.", "#fde68a");
        if (CB.Audio) CB.Audio.setZone("anchorage");
        if (CB.Audio) CB.Audio.dock();
        return state;
    }

    /* ===== helpers ===== */

    function player() { return state.player; }

    function nearestShip(from, maxDist, filter) {
        var best = null, bestD = maxDist * maxDist;
        for (var i = 0; i < state.ships.length; i++) {
            var s = state.ships[i];
            if (!s.alive || s === from || s.docked) continue;
            if (filter && !filter(s)) continue;
            var d = (s.x - from.x) * (s.x - from.x) + (s.y - from.y) * (s.y - from.y);
            if (d < bestD) { bestD = d; best = s; }
        }
        return best;
    }

    function nearestEnemy(from, maxDist, time) {
        return nearestShip(from, maxDist, function (s) {
            return Z.canHarm(from, s, time == null ? state.time : time);
        });
    }

    function nearestAsteroid(from, maxDist, oreFilter) {
        var best = null, bestD = maxDist * maxDist;
        for (var i = 0; i < state.asteroids.length; i++) {
            var a = state.asteroids[i];
            if (!a.alive) continue;
            if (oreFilter && oreFilter.indexOf(a.ore) < 0) continue;
            var d = (a.x - from.x) * (a.x - from.x) + (a.y - from.y) * (a.y - from.y);
            if (d < bestD) { bestD = d; best = a; }
        }
        return best;
    }

    function nearestStation(from, team) {
        var best = null, bestD = Infinity;
        state.stations.forEach(function (st) {
            if (!st.alive) return;
            if (team && st.team !== team) return;
            var d = dist(from.x, from.y, st.x, st.y);
            if (d < bestD) { bestD = d; best = st; }
        });
        return best;
    }

    function nearestRelay(from, maxDist) {
        var best = null, bestD = (maxDist || 99999) * (maxDist || 99999);
        state.relays.forEach(function (r) {
            var d = dist(from.x, from.y, r.x, r.y);
            if (d < bestD) { bestD = d; best = r; }
        });
        return best;
    }

    function freeRelays() {
        return state.relays.filter(function (r) { return r.owner === "free"; }).length;
    }

    function stationFor(team) {
        if (team === "corsair") return state.nexus;
        if (team === "free" || team === "neutral") return state.home;
        return null;
    }

    function markOutlaw(ship, reason) {
        if (!ship || ship.team === "feral" || ship.isAlien) return;
        if (ship.outlawUntil > state.time) return;
        ship.outlawUntil = state.time + 45;
        addFeed(ship.name + " is OUTLAW — " + (reason || "weapons free in the Drift"), "#f87171");
        if (ship.isPlayer) {
            setMessage("OUTLAW: turrets will fire. Dock is denied until it clears.", 5);
            if (CB.Audio) CB.Audio.alarm();
            if (CB.Audio) CB.Audio.buzz([40, 60, 40]);
        }
    }

    function considerOutlaw(source, target) {
        if (!source || !target || source.team === target.team) return;
        if (source.team === "feral" || target.team === "feral") return;
        if (target.outlawUntil > state.time) return;
        var z = Z.zoneAt(target.x, target.y);
        if (z.pvp) return;
        if (source.team === "neutral") return;
        markOutlaw(source, "firing in " + z.name);
    }

    /* ===== damage ===== */

    function damageShip(target, amount, source, kind) {
        if (!target || !target.alive || target.docked) return 0;
        if (target.invuln > state.time) return 0;
        if (source && source.team && source.team !== target.team && !Z.canHarm(source, target, state.time)) {
            if (target.isPlayer && kind !== "hazard") spark(target.x, target.y, "#94a3b8", 3);
            return 0;
        }
        var dmg = amount;
        if (source && source.isBot && target.isPlayer) {
            var diff = C.DIFFICULTY[state.difficulty] || C.DIFFICULTY.pilot;
            dmg *= diff.damage;
        }
        if (target.barrierHp > 0) {
            var absorbed = Math.min(target.barrierHp, dmg);
            target.barrierHp -= absorbed;
            dmg -= absorbed;
            if (target.barrierHp <= 0) target.abilityActive = 0;
        }
        if (dmg <= 0) { target.shieldHit = 0.12; return 0; }
        target.lastHit = state.time;
        target.shieldHit = 0.18;
        target.hitFlash = 0.15;
        if (target.shield > 0) {
            var sh = Math.min(target.shield, dmg);
            target.shield -= sh;
            dmg -= sh;
        }
        if (dmg > 0) target.hull -= dmg;
        if (source && source.isPlayer) {
            state.stats.damage = (state.stats.damage || 0) + amount;
        }
        if (source) {
            source.damageDone = (source.damageDone || 0) + amount;
            if (target.isPlayer && CB.Audio && amount > 2) CB.Audio.playerHit();
        }
        if (target.hull <= 0) killShip(target, source, kind);
        return amount;
    }

    function damageStructure(structure, amount, source) {
        if (!structure || !structure.alive) return;
        if (structure.kind === "nexus") {
            var relays = freeRelays();
            if (structure.shield > 0) {
                structure.shield = Math.max(0, structure.shield - amount);
                structure.hitFlash = 0.15;
                if (structure.shield <= 0) {
                    state.flags.nexusShieldBroken = true;
                    addFeed("NEXUS SHIELD DOWN — hit the core.", "#fde68a");
                    if (CB.Audio) CB.Audio.alarm();
                }
                return;
            }
            if (relays < 2 && !state.flags.coreDelivered && structure.shieldDownUntil < state.time) {
                /* Hull is only exposed while the shield is broken. */
                structure.shield = Math.min(structure.shieldMax, structure.shield + amount * 0.25);
                return;
            }
        }
        structure.hp -= amount;
        structure.hitFlash = 0.15;
        if (structure.hp <= 0) structure.hp = 0;
        if (source && source.isPlayer) state.stats.damage = (state.stats.damage || 0) + amount;
    }

    function killShip(ship, source, kind) {
        if (!ship.alive) return;
        ship.alive = false;
        ship.hull = 0;
        ship.deaths += 1;
        ship.respawnAt = state.time + (ship.isPlayer ? C.PLAYER.respawn : C.BOT.respawn);
        ship.docked = false;
        dropCargo(ship);
        if (ship.carrierCore) {
            ship.carrierCore = false;
            state.coreCarrier = null;
            spawnCore(ship.x, ship.y);
            addFeed("THE CORE IS LOOSE — someone pick it up.", "#fde68a");
        }
        boom(ship.x, ship.y, ship.isAlien ? "#c084fc" : ship.color, ship.isAlien ? 12 : 26);
        if (CB.Audio) {
            if (ship.isPlayer) CB.Audio.death();
            else if (distanceToPlayer(ship.x, ship.y) < 1800) CB.Audio.explode();
        }
        if (distanceToPlayer(ship.x, ship.y) < 900) state.shake = Math.min(14, state.shake + 6);

        if (source && source.team && source.team !== ship.team) {
            var zone = Z.zoneAt(ship.x, ship.y);
            var bounty = Math.round((70 + ship.tier * 55) * zone.bounty);
            if ((state.events.bountyOne || state.events.bountyTwo) && Z.zoneAt(ship.x, ship.y).id === "scab") bounty = Math.round(bounty * 1.5);
            state.teamScore[source.team === "corsair" ? "corsair" : "free"] += bounty;
            if (source.id) {
                source.kills += 1;
                source.score += bounty;
            }
            if (source.isPlayer) {
                state.stats.kills += 1;
                state.player.credits += bounty;
                addFeed("You destroyed " + ship.name + "  +" + bounty + " cr", "#fde68a");
                if (CB.Audio) CB.Audio.buzz(30);
                if (CB.Storage) CB.Storage.recordEvent("kill", 1);
            } else if (source.id && (source.team === "free" || source.team === "corsair")) {
                source.credits += Math.round(bounty * 0.6);
                addFeed(source.name + " destroyed " + ship.name, source.team === "free" ? "#5eead4" : "#fb7185");
            } else if (source.isStructure) {
                addFeed((source.name || "TURRETS") + " destroyed " + ship.name, "#94a3b8");
            }
        } else {
            addFeed(ship.name + " was lost", "#94a3b8");
        }
        if (ship.isBoss) {
            state.boss = null;
            state.events.leviathanDead = true;
            spawnCore(ship.x, ship.y);
            addFeed("THE LEVIATHAN IS DEAD — the Singularity Core is loose.", "#fde68a");
            state.teamScore[source && source.team === "corsair" ? "corsair" : "free"] += 500;
            if (source && source.isPlayer) {
                state.stats.bossKills += 1;
                state.player.credits += 300;
                if (CB.Storage) CB.Storage.recordEvent("leviathan", 1);
            }
            state.shake = 22;
            if (CB.Audio) CB.Audio.bigExplode();
        }
        if (ship.isAlien && !ship.isBoss) {
            var zoneOre = Z.zoneAt(ship.x, ship.y).id === "scab" ? "cobalt" : "ferrite";
            for (var oi = 0; oi < 2; oi++) {
                spawnPickup(ship.x + range(-20, 20), ship.y + range(-20, 20), zoneOre, false);
            }
        }
        if (ship.isPlayer) {
            state.stats.deaths += 1;
            state.player.credits = Math.floor(state.player.credits * (1 - C.PLAYER.creditLoss));
            setMessage("HULL LOST — respawning at the Anchorage.", 4);
            if (CB.Storage) CB.Storage.recordEvent("death", 1);
        }
        if (ship.isAlien && !ship.isBoss && source && source.isPlayer) {
            state.player.credits += Math.round(12 + ship.tier * 8);
        }
    }

    function dropCargo(ship) {
        var count = Math.min(22, ship.cargoUnits);
        if (!count) return;
        var ores = Object.keys(ship.cargoCounts);
        var total = 0;
        ores.forEach(function (k) { total += ship.cargoCounts[k]; });
        for (var i = 0; i < count; i++) {
            var pick = ores[Math.floor(rnd() * ores.length)] || "ferrite";
            if (total <= 0) break;
            spawnPickup(ship.x + range(-36, 36), ship.y + range(-36, 36), pick, false);
        }
        ship.cargoUnits = 0;
        ship.cargoValue = 0;
        ship.cargoCounts = {};
    }

    function spawnPickup(x, y, oreName, fromAsteroid) {
        if (state.pickups.length > C.PICKUP_CAP) {
            var dropIdx = 0;
            for (var di = 0; di < state.pickups.length; di++) {
                if (!state.pickups[di].core) { dropIdx = di; break; }
            }
            state.pickups.splice(dropIdx, 1);
        }
        var ore = C.ORES[oreName] || C.ORES.ferrite;
        state.pickups.push({
            x: x, y: y,
            vx: range(-90, 90),
            vy: range(-90, 90),
            ore: oreName,
            value: ore.value,
            color: ore.color,
            life: fromAsteroid === false ? 80 : 55,
            radius: 6,
            core: false
        });
    }

    function spawnCore(x, y) {
        state.pickups.push({
            x: x, y: y, vx: 0, vy: 0,
            ore: "core", value: 0, color: "#fde68a",
            life: 180, radius: 14, core: true
        });
        if (CB.Audio) CB.Audio.core();
    }

    /* ===== particles ===== */

    function spark(x, y, color, count, speed) {
        count = count || 6;
        var max = C.PARTICLE_CAP;
        for (var i = 0; i < count && state.particles.length < max; i++) {
            var a = rnd() * C.TAU;
            var v = (speed || 170) * (0.35 + rnd());
            state.particles.push({
                x: x, y: y,
                vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                life: 0.35 + rnd() * 0.55,
                maxLife: 0.9,
                color: color,
                size: 1.5 + rnd() * 2.2
            });
        }
    }

    function boom(x, y, color, count) {
        count = count || 20;
        for (var i = 0; i < count && state.particles.length < C.PARTICLE_CAP; i++) {
            var a = rnd() * C.TAU;
            var v = 60 + rnd() * 340;
            state.particles.push({
                x: x, y: y,
                vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                life: 0.5 + rnd() * 0.9,
                maxLife: 1.4,
                color: i % 3 === 0 ? "#fef3c7" : color,
                size: 2 + rnd() * 4
            });
        }
    }

    function distanceToPlayer(x, y) {
        return state.player ? dist(x, y, state.player.x, state.player.y) : Infinity;
    }

    /* ===== weapons ===== */

    function fireWeapon(ship, aimX, aimY) {
        if (!ship.alive || ship.docked || ship.fireCd > 0) return false;
        if (ship.energy < 3) return false;
        var st = ship.stats;
        var baseAngle = Math.atan2(aimY, aimX);
        var pellets = st.pellets || 1;
        for (var i = 0; i < pellets; i++) {
            var offset = (i - (pellets - 1) / 2) * (st.spread || 0.02);
            var a = baseAngle + offset + range(-0.006, 0.006);
            var speed = st.bulletSpeed || 780;
            var muzzle = ship.radius + 6;
            state.bullets.push({
                x: ship.x + Math.cos(a) * muzzle,
                y: ship.y + Math.sin(a) * muzzle,
                vx: Math.cos(a) * speed + ship.vx * 0.25,
                vy: Math.sin(a) * speed + ship.vy * 0.25,
                damage: st.damage,
                life: (st.range || 900) / speed,
                maxLife: (st.range || 900) / speed,
                team: ship.team,
                owner: ship,
                color: st.color || ship.color,
                radius: 3.2,
                mining: ship.mining || 1,
                pierce: 0
            });
        }
        if (state.bullets.length > C.BULLET_CAP) state.bullets.splice(0, state.bullets.length - C.BULLET_CAP);
        ship.fireCd = 1 / st.rate;
        ship.energy = Math.max(0, ship.energy - (1.2 + st.damage * 0.12));
        ship.engine = 1;
        if (CB.Audio && distanceToPlayer(ship.x, ship.y) < 900) CB.Audio.shoot(ship.line);
        return true;
    }

    function useAbility(ship) {
        if (!ship || !ship.alive || ship.docked) return false;
        if (ship.abilityCdLeft > 0) {
            if (ship.isPlayer && CB.Audio) CB.Audio.error();
            return false;
        }
        ship.abilityCdLeft = ship.abilityCd || 6;
        if (ship.ability === "dash") {
            ship.vx += ship.aimX * 620;
            ship.vy += ship.aimY * 620;
            ship.invuln = Math.max(ship.invuln, state.time + 0.45);
            ship.dashTime = 0.3;
            spark(ship.x, ship.y, "#67e8f9", 18, 260);
            if (CB.Audio) CB.Audio.ui();
        } else if (ship.ability === "barrier") {
            ship.barrierHp = 70 + ship.tier * 55;
            ship.abilityActive = 3.4;
            spark(ship.x, ship.y, "#fbbf24", 20, 120);
            if (CB.Audio) CB.Audio.ui();
        } else if (ship.ability === "tractor") {
            for (var i = 0; i < state.pickups.length; i++) {
                var p = state.pickups[i];
                var d = dist(p.x, p.y, ship.x, ship.y);
                if (d < 900) {
                    var a = Math.atan2(ship.y - p.y, ship.x - p.x);
                    p.vx += Math.cos(a) * 460;
                    p.vy += Math.sin(a) * 460;
                }
            }
            ship.hull = Math.min(ship.hullMax, ship.hull + ship.hullMax * 0.05);
            ship.energy = Math.min(ship.energyMax, ship.energy + 25);
            spark(ship.x, ship.y, "#a3e635", 24, 190);
            if (CB.Audio) CB.Audio.pickup();
        }
        return true;
    }

    /* ===== docking / economy ===== */

    function bankCargo(ship) {
        if (ship.cargoValue <= 0) return 0;
        var value = Math.round(ship.cargoValue);
        ship.credits += value;
        ship.score += value;
        state.teamScore[ship.team === "corsair" ? "corsair" : "free"] += value;
        if (ship.isPlayer) {
            state.stats.banked += value;
            state.stats.ore += ship.cargoUnits;
            addFeed("Banked " + ship.cargoUnits + " ore  +" + value + " cr", "#5eead4");
        }
        ship.cargoUnits = 0;
        ship.cargoValue = 0;
        ship.cargoCounts = {};
        return value;
    }

    function serviceDock(ship) {
        var station = stationFor(ship.team);
        if (!station || !station.alive) return false;
        if (dist(ship.x, ship.y, station.x, station.y) > station.dockRadius) return false;
        if (ship.outlawUntil > state.time) return false;
        bankCargo(ship);
        ship.hull = ship.hullMax;
        ship.shield = ship.shieldMax;
        ship.energy = ship.energyMax;
        ship.respawnAt = 0;
        return true;
    }

    function dockPlayer() {
        var p = state.player;
        if (!p || !p.alive || p.docked) return false;
        if (dist(p.x, p.y, state.home.x, state.home.y) > state.home.dockRadius) {
            if (CB.Audio) CB.Audio.error();
            setMessage("Too far from the Anchorage docking ring.", 2);
            return false;
        }
        if (p.outlawUntil > state.time) {
            if (CB.Audio) CB.Audio.alarm();
            setMessage("TURRETS DENY: outlaw status blocks docking.", 3);
            return false;
        }
        serviceDock(p);
        p.docked = true;
        p.vx = 0; p.vy = 0;
        p.shield = p.shieldMax;
        p.hull = p.hullMax;
        if (CB.Audio) CB.Audio.dock();
        addFeed("Docked at Anchorage. Hull and hold reset.", "#5eead4");
        if (state.onDock) state.onDock();
        return true;
    }

    function undockPlayer() {
        var p = state.player;
        if (!p || !p.docked) return;
        p.docked = false;
        p.x = state.home.x + 230;
        p.y = state.home.y + 40;
        p.vx = 40;
        p.vy = 0;
        p.invuln = state.time + C.PLAYER.invuln;
        p.fireCd = 0;
        if (CB.Audio) CB.Audio.dock();
    }

    function upgradePlayer(hullId) {
        var p = state.player;
        if (!p || !p.docked) return false;
        var opts = S.options(p);
        var chosen = null;
        for (var i = 0; i < opts.length; i++) {
            if (opts[i].id === hullId) { chosen = opts[i]; break; }
        }
        if (!chosen) return false;
        var cost = S.nextCost(p);
        if (p.credits < cost) {
            if (CB.Audio) CB.Audio.error();
            setMessage("Need " + (cost - p.credits) + " more credits.", 2);
            return false;
        }
        p.credits -= cost;
        S.applyHull(p, chosen);
        p.hull = p.hullMax;
        p.shield = p.shieldMax;
        p.energy = p.energyMax;
        if (CB.Audio) CB.Audio.upgrade();
        addFeed("Upgraded to " + chosen.name + " (tier " + chosen.tier + ")", "#fde68a");
        if (CB.Storage) CB.Storage.recordEvent("upgrade", 1);
        return true;
    }

    function botService(ship) {
        var station = stationFor(ship.team);
        if (!station || !station.alive) return;
        if (dist(ship.x, ship.y, station.x, station.y) > station.dockRadius) return;
        if (ship.outlawUntil > state.time) return;
        serviceDock(ship);
        if (ship.tier < 6) {
            var opts = S.options(ship);
            if (opts.length) {
                var cost = S.nextCost(ship);
                if (ship.credits >= cost) {
                    var chosen = opts[0];
                    if (ship.tier === 1) {
                        var pref = ship.ai && ship.ai.personality ? ship.ai.personality.line : "lance";
                        opts.forEach(function (o) { if (o.line === pref) chosen = o; });
                    }
                    ship.credits -= cost;
                    S.applyHull(ship, chosen);
                    ship.hull = ship.hullMax;
                    ship.shield = ship.shieldMax;
                    if (ship.team === "free" && distanceToPlayer(ship.x, ship.y) < 1200) {
                        addFeed(ship.name + " upgraded to " + chosen.name, "#5eead4");
                    }
                }
            }
        }
        ship.undockAt = state.time + 1.2;
    }

    /* ===== asteroids ===== */

    function damageAsteroid(asteroid, amount, source) {
        if (!asteroid.alive) return;
        asteroid.hp -= amount;
        asteroid.hitFlash = 0.12;
        if (asteroid.hp <= 0) breakAsteroid(asteroid, source);
    }

    function breakAsteroid(asteroid, source) {
        asteroid.alive = false;
        asteroid.respawnAt = state.time + 55 + rnd() * 55;
        var chunks = 2 + Math.floor(asteroid.radius / 16);
        if (asteroid.rich) chunks += 2;
        for (var i = 0; i < chunks; i++) {
            var p = spawnPickup(asteroid.x + range(-18, 18), asteroid.y + range(-18, 18), asteroid.ore, true);
        }
        boom(asteroid.x, asteroid.y, C.ORES[asteroid.ore].color, 14);
        if (CB.Audio && distanceToPlayer(asteroid.x, asteroid.y) < 1000) CB.Audio.crack();
        if (source && source.isPlayer) {
            state.stats.rocks = (state.stats.rocks || 0) + 1;
        }
    }

    /* ===== update: ships ===== */

    function updateShipDynamics(ship, dt) {
        var st = ship.stats;
        ship.fireCd = Math.max(0, ship.fireCd - dt);
        ship.abilityCdLeft = Math.max(0, ship.abilityCdLeft - dt);
        ship.abilityActive = Math.max(0, ship.abilityActive - dt);
        if (ship.abilityActive <= 0) ship.barrierHp = 0;
        ship.hitFlash = Math.max(0, ship.hitFlash - dt);
        ship.shieldHit = Math.max(0, ship.shieldHit - dt);
        ship.dashTime = Math.max(0, ship.dashTime - dt);
        ship.engine = Math.max(0, ship.engine - dt * 3);

        if (!ship.alive) return;
        if (ship.docked) {
            ship.vx = 0; ship.vy = 0;
            return;
        }

        var power = ship.boost ? 1.45 : 1;
        var ax = (ship.thrustX || 0) * st.accel * power;
        var ay = (ship.thrustY || 0) * st.accel * power;
        ship.vx += ax * dt;
        ship.vy += ay * dt;
        var drag = 1.25;
        ship.vx *= Math.max(0, 1 - drag * dt);
        ship.vy *= Math.max(0, 1 - drag * dt);

        /* Boost costs energy; no energy means no boost. */
        if (ship.boost) {
            ship.energy = Math.max(0, ship.energy - 13 * dt);
            if (ship.energy <= 0) ship.boost = false;
        }
        ship.energy = Math.min(ship.energyMax, ship.energy + (ship.boost ? 2 : 24) * dt);

        /* Black hole gravity and ring-break pull. */
        var dCentre = Math.hypot(ship.x, ship.y);
        if (dCentre < C.BLACK_HOLE.gravity && dCentre > 1) {
            var pull = (1 - dCentre / C.BLACK_HOLE.gravity) * 520;
            ship.vx -= (ship.x / dCentre) * pull * dt;
            ship.vy -= (ship.y / dCentre) * pull * dt;
            if (dCentre < C.BLACK_HOLE.killRadius) {
                damageShip(ship, 55 * dt, null, "hazard");
                if (rnd() < 0.08) spark(ship.x, ship.y, "#fb7185", 1, 80);
            }
        }
        if (dCentre > C.WORLD_RADIUS) {
            ship.vx -= (ship.x / dCentre) * 600 * dt;
            ship.vy -= (ship.y / dCentre) * 600 * dt;
            damageShip(ship, 28 * dt, null, "hazard");
            if (ship.isPlayer && rnd() < 0.02) setMessage("RING BREAK — turn back.", 1.5);
        }

        var maxSpeed = st.speed * (ship.boost ? 1.4 : 1);
        if (ship.carrierCore) maxSpeed *= 0.86;
        var sp = Math.hypot(ship.vx, ship.vy);
        if (sp > maxSpeed) {
            ship.vx = ship.vx / sp * maxSpeed;
            ship.vy = ship.vy / sp * maxSpeed;
        }
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;
        if (ship.x * ship.x + ship.y * ship.y > (C.WORLD_RADIUS + 700) * (C.WORLD_RADIUS + 700)) {
            var ang = Math.atan2(ship.y, ship.x);
            ship.x = Math.cos(ang) * (C.WORLD_RADIUS + 690);
            ship.y = Math.sin(ang) * (C.WORLD_RADIUS + 690);
        }

        var aimAngle = Math.atan2(ship.aimY, ship.aimX);
        var diff = aimAngle - ship.angle;
        while (diff > Math.PI) diff -= C.TAU;
        while (diff < -Math.PI) diff += C.TAU;
        ship.angle += clamp(diff, -12 * dt, 12 * dt);

        /* Collide with rocks. */
        for (var i = 0; i < state.asteroids.length; i++) {
            var a = state.asteroids[i];
            if (!a.alive) continue;
            var dx = ship.x - a.x, dy = ship.y - a.y;
            var minD = ship.radius + a.radius;
            if (dx * dx + dy * dy < minD * minD) {
                var d = Math.sqrt(dx * dx + dy * dy) || 1;
                var push = (minD - d) + 1;
                ship.x += (dx / d) * push;
                ship.y += (dy / d) * push;
                var impact = Math.hypot(ship.vx, ship.vy);
                if (impact > 150) {
                    damageShip(ship, impact * 0.035, null, "impact");
                    spark(ship.x, ship.y, "#cbd5e1", 5, 110);
                    if (ship.isPlayer) { state.shake = Math.min(10, state.shake + 2); if (CB.Audio) CB.Audio.playerHit(); }
                }
                ship.vx *= 0.55;
                ship.vy *= 0.55;
            }
        }

        /* Shield regen, but not while the Scab is ion-stormed. */
        var zone = Z.zoneAt(ship.x, ship.y);
        var ion = state.events.ion && state.events.ionUntil > state.time && zone.id === "scab";
        if (state.time - ship.lastHit > 4 && ship.shield < ship.shieldMax && !ion) {
            ship.shield = Math.min(ship.shieldMax, ship.shield + ship.shieldMax * 0.11 * dt);
        }
        if (state.time - ship.lastHit > 6 && ship.energy < ship.energyMax) {
            ship.energy = Math.min(ship.energyMax, ship.energy + 4 * dt);
        }
    }

    function updateShips(dt) {
        for (var i = 0; i < state.ships.length; i++) {
            var ship = state.ships[i];
            if (!ship.alive) {
                if (!ship.noRespawn && state.time >= ship.respawnAt && ship.respawnAt > 0) respawnShip(ship);
                continue;
            }
            if (ship.docked) {
                if (ship.isPlayer) { ship.vx = 0; ship.vy = 0; }
                else if (ship.undockAt && state.time >= ship.undockAt) {
                    ship.docked = false;
                    var stn = stationFor(ship.team);
                    if (stn) {
                        var ang = Math.atan2(ship.y - stn.y, ship.x - stn.x);
                        ship.x = stn.x + Math.cos(ang) * (stn.dockRadius + 25);
                        ship.y = stn.y + Math.sin(ang) * (stn.dockRadius + 25);
                    }
                    ship.invuln = state.time + 1.4;
                    ship.undockAt = 0;
                }
                updateShipDynamics(ship, dt);
                continue;
            }
            updateShipDynamics(ship, dt);
            if (ship.wantFire && !ship.docked) {
                var aimX = ship.aimX, aimY = ship.aimY;
                fireWeapon(ship, aimX, aimY);
            }
        }

        /* Ship-to-ship collision (small fleet, plain pairs). */
        for (var a = 0; a < state.ships.length; a++) {
            var s1 = state.ships[a];
            if (!s1.alive || s1.docked) continue;
            for (var b = a + 1; b < state.ships.length; b++) {
                var s2 = state.ships[b];
                if (!s2.alive || s2.docked) continue;
                var dx = s2.x - s1.x, dy = s2.y - s1.y;
                var minD = s1.radius + s2.radius;
                var d2 = dx * dx + dy * dy;
                if (d2 < minD * minD && d2 > 0.01) {
                    var d = Math.sqrt(d2);
                    var push = (minD - d) * 0.5;
                    s1.x -= (dx / d) * push;
                    s1.y -= (dy / d) * push;
                    s2.x += (dx / d) * push;
                    s2.y += (dy / d) * push;
                    if (s1.team !== s2.team) {
                        var impact = Math.hypot(s1.vx - s2.vx, s1.vy - s2.vy);
                        if (impact > 190) {
                            damageShip(s1, impact * 0.02, s2, "ram");
                            damageShip(s2, impact * 0.02, s1, "ram");
                            spark((s1.x + s2.x) / 2, (s1.y + s2.y) / 2, "#fde68a", 8, 160);
                        }
                    }
                    s1.vx *= 0.7; s1.vy *= 0.7;
                    s2.vx *= 0.7; s2.vy *= 0.7;
                }
            }
        }
    }

    function respawnShip(ship) {
        if (ship.noRespawn) return;
        var station = stationFor(ship.team);
        if (!station || !station.alive) return;
        ship.alive = true;
        ship.docked = false;
        ship.x = station.x + range(-station.dockRadius * 0.7, station.dockRadius * 0.7);
        ship.y = station.y + range(-station.dockRadius * 0.7, station.dockRadius * 0.7);
        ship.vx = 0; ship.vy = 0;
        ship.hull = ship.hullMax;
        ship.shield = ship.shieldMax;
        ship.energy = ship.energyMax;
        ship.cargoUnits = 0; ship.cargoValue = 0; ship.cargoCounts = {};
        ship.invuln = state.time + (ship.isPlayer ? C.PLAYER.invuln : 1.6);
        ship.respawnAt = 0;
        ship.outlawUntil = 0;
        ship.aimX = 1; ship.aimY = 0;
        ship.wantFire = false;
        if (ship.isPlayer) {
            state.camera.x = ship.x;
            state.camera.y = ship.y;
            setMessage("Hull restored. The belt is still hungry.", 3);
            if (CB.Audio) CB.Audio.respawn && CB.Audio.respawn();
        }
    }

    /* ===== update: bullets ===== */

    function updateBullets(dt) {
        for (var i = state.bullets.length - 1; i >= 0; i--) {
            var b = state.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            var dead = b.life <= 0;
            if (!dead && b.x * b.x + b.y * b.y < 360 * 360) {
                dead = true;
                spark(b.x, b.y, "#f472b6", 2, 40);
            }
            if (!dead) {
                for (var a = 0; a < state.asteroids.length; a++) {
                    var ast = state.asteroids[a];
                    if (!ast.alive) continue;
                    var dx = b.x - ast.x, dy = b.y - ast.y;
                    var rr = ast.radius + 4;
                    if (dx * dx + dy * dy < rr * rr) {
                        damageAsteroid(ast, b.damage * (b.mining || 1), b.owner);
                        if (b.owner && b.owner.isPlayer) {
                            if (CB.Audio && distanceToPlayer(b.x, b.y) < 700) CB.Audio.mine();
                        }
                        spark(b.x, b.y, C.ORES[ast.ore].color, 2, 70);
                        dead = true;
                        break;
                    }
                }
            }
            if (!dead) {
                for (var s = 0; s < state.ships.length; s++) {
                    var ship = state.ships[s];
                    if (!ship.alive || ship.docked || ship === b.owner) continue;
                    var turretVsOutlaw = b.owner && b.owner.isStructure && ship.outlawUntil > state.time;
                    if (ship.team === b.team && !turretVsOutlaw) continue;
                    var sdx = b.x - ship.x, sdy = b.y - ship.y;
                    var sr = ship.radius + b.radius;
                    if (sdx * sdx + sdy * sdy < sr * sr) {
                        var source = b.owner || { team: b.team, isStructure: true };
                        var legal = Z.canHarm(source, ship, state.time) || turretVsOutlaw;
                        if (!legal && b.owner && b.owner.id &&
                            Z.zoneAt(ship.x, ship.y).id === "drift" &&
                            ship.team !== "feral" && b.owner.team !== "feral") {
                            considerOutlaw(b.owner, ship);
                            legal = Z.canHarm(source, ship, state.time);
                        }
                        if (legal) {
                            damageShip(ship, b.damage, source, "shot");
                            spark(b.x, b.y, ship.shield > 0 ? "#67e8f9" : "#f87171", 4, 100);
                            if (CB.Audio && distanceToPlayer(b.x, b.y) < 800) CB.Audio.hit();
                        } else {
                            spark(b.x, b.y, "#94a3b8", 2, 60);
                        }
                        dead = true;
                        break;
                    }
                }
            }
            if (!dead) {
                for (var st = 0; st < state.stations.length; st++) {
                    var station = state.stations[st];
                    if (!station.alive || station.team === b.team) continue;
                    var stx = b.x - station.x, sty = b.y - station.y;
                    var str = station.radius + b.radius;
                    if (stx * stx + sty * sty < str * str) {
                        var src = b.owner || { team: b.team, isStructure: true };
                        if (Z.canHarmStructure(src, station, state.time)) {
                            damageStructure(station, b.damage, src);
                            spark(b.x, b.y, "#f87171", 3, 90);
                        }
                        dead = true;
                        break;
                    }
                }
            }
            if (dead) {
                state.bullets.splice(i, 1);
            }
        }
    }

    /* ===== update: pickups ===== */

    function updatePickups(dt) {
        for (var i = state.pickups.length - 1; i >= 0; i--) {
            var p = state.pickups[i];
            p.life -= dt;
            if (p.life <= 0) { state.pickups.splice(i, 1); continue; }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= Math.max(0, 1 - 2.2 * dt);
            p.vy *= Math.max(0, 1 - 2.2 * dt);

            var collected = false;
            for (var s = 0; s < state.ships.length; s++) {
                var ship = state.ships[s];
                if (!ship.alive || ship.docked) continue;
                var dx = ship.x - p.x, dy = ship.y - p.y;
                var d = Math.sqrt(dx * dx + dy * dy) || 1;
                var magnet = p.core ? 150 : (ship.stats.magnet || 260);
                if (p.core && ship.carrierCore) continue;
                if (d < magnet) {
                    var pull = (1 - d / magnet) * 900 + 120;
                    p.vx += (dx / d) * pull * dt;
                    p.vy += (dy / d) * pull * dt;
                }
                if (d < ship.radius + p.radius + 12) {
                    if (p.core) {
                        p.core = false;
                        ship.carrierCore = true;
                        state.coreCarrier = ship;
                        state.pickups.splice(i, 1);
                        collected = true;
                        addFeed(ship.name + " HAS THE SINGULARITY CORE — protect or hunt.", "#fde68a");
                        setMessage(ship.isPlayer ? "CORE SECURED. Fly it into the Nexus." : ship.name + " has the core.", 5);
                        if (CB.Audio) CB.Audio.core();
                        state.shake = Math.min(16, state.shake + 8);
                        break;
                    }
                    if (ship.cargoUnits + 1 <= ship.stats.cargo) {
                        ship.cargoUnits += 1;
                        ship.cargoValue += p.value;
                        ship.cargoCounts[p.ore] = (ship.cargoCounts[p.ore] || 0) + 1;
                        state.pickups.splice(i, 1);
                        collected = true;
                        if (ship.isPlayer) {
                            if (CB.Audio) CB.Audio.pickup();
                            spark(p.x, p.y, p.color, 3, 60);
                        }
                        break;
                    }
                }
            }
            if (collected) continue;
            if (p.x * p.x + p.y * p.y < 330 * 330) {
                state.pickups.splice(i, 1);
            }
        }
    }

    /* ===== update: asteroids / structures / relays ===== */

    function updateAsteroids(dt) {
        for (var i = 0; i < state.asteroids.length; i++) {
            var a = state.asteroids[i];
            a.rot += a.spin * dt;
            a.hitFlash = Math.max(0, a.hitFlash - dt);
            if (!a.alive && state.time >= a.respawnAt) {
                a.alive = true;
                a.hp = a.hpMax;
                a.rich = rnd() < 0.16;
            }
        }
    }

    function fireStructure(structure, target, dt) {
        structure.turretCd -= dt;
        if (structure.turretCd > 0) return;
        var range = structure.kind === "nexus" ? C.NEXUS.turretRange : C.STATION.turretRange;
        var d = dist(structure.x, structure.y, target.x, target.y);
        if (d > range) return;
        var dmg = structure.kind === "nexus" ? C.NEXUS.turretDamage : C.STATION.turretDamage;
        var rate = structure.kind === "nexus" ? C.NEXUS.turretRate : C.STATION.turretRate;
        var a = Math.atan2(target.y - structure.y, target.x - structure.x);
        structure.turretAngle = a;
        state.bullets.push({
            x: structure.x + Math.cos(a) * (structure.radius + 10),
            y: structure.y + Math.sin(a) * (structure.radius + 10),
            vx: Math.cos(a) * 820,
            vy: Math.sin(a) * 820,
            damage: dmg,
            life: 1.3,
            maxLife: 1.3,
            team: structure.team,
            owner: { team: structure.team, isStructure: true, name: structure.kind === "nexus" ? "NEXUS" : "ANCHORAGE" },
            color: structure.team === "free" ? "#5eead4" : "#fb7185",
            radius: 4,
            mining: 1
        });
        structure.turretCd = rate;
        if (CB.Audio && distanceToPlayer(structure.x, structure.y) < 1000) CB.Audio.shoot("bulwark");
    }

    function updateStructures(dt) {
        state.stations.forEach(function (st) {
            if (!st.alive) return;
            st.turretCd -= dt;
            st.hitFlash = Math.max(0, st.hitFlash - dt);
            st.pulse += dt;
            var target = null;
            var best = Infinity;
            for (var i = 0; i < state.ships.length; i++) {
                var s = state.ships[i];
                if (!s.alive || s.docked || s.team === st.team) continue;
                var d2 = (s.x - st.x) * (s.x - st.x) + (s.y - st.y) * (s.y - st.y);
                var range = st.kind === "nexus" ? C.NEXUS.turretRange : C.STATION.turretRange;
                if (d2 > range * range) continue;
                var legal;
                if (st.kind === "nexus") legal = true;
                else legal = s.outlawUntil > state.time ||
                    (Z.inSafe(s.x, s.y) && (s.team === "corsair" || s.isAlien));
                if (legal && d2 < best) { best = d2; target = s; }
            }
            if (target) fireStructure(st, target, dt);

            if (st.kind === "nexus") {
                var relays = freeRelays();
                if (relays < 2 && st.shieldDownUntil < state.time && st.shield < st.shieldMax) {
                    st.shield = Math.min(st.shieldMax, st.shield + st.shieldRegen * dt);
                    if (st.shield > st.shieldMax * 0.98) state.flags.nexusShieldBroken = false;
                }
            }
        });
    }

    function updateRelays(dt) {
        state.relays.forEach(function (relay) {
            relay.pulse += dt;
            var free = 0, corsair = 0;
            state.ships.forEach(function (s) {
                if (!s.alive || s.docked || s.isAlien) return;
                if (dist(s.x, s.y, relay.x, relay.y) > relay.radius) return;
                if (s.team === "free" || s.team === "neutral") free += 1;
                if (s.team === "corsair") corsair += 1;
            });
            if (free > corsair) relay.control = Math.min(1, relay.control + dt * 0.16);
            else if (corsair > free) relay.control = Math.max(-1, relay.control - dt * 0.16);
            else relay.control *= Math.max(0, 1 - dt * 0.15);

            var old = relay.owner;
            if (relay.control >= 0.995) relay.owner = "free";
            else if (relay.control <= -0.995) relay.owner = "corsair";
            else if (relay.owner !== "neutral" && Math.abs(relay.control) < 0.35) relay.owner = "neutral";

            if (old !== relay.owner) {
                if (relay.owner === "free") {
                    addFeed("Relay " + (relay.index + 1) + " secured by FREE.", "#5eead4");
                    state.teamScore.free += 100;
                    if (state.player) {
                        if (dist(state.player.x, state.player.y, relay.x, relay.y) < relay.radius + 200) {
                            state.stats.relays += 1;
                            state.player.credits += 60;
                        }
                    }
                } else if (relay.owner === "corsair") {
                    addFeed("Relay " + (relay.index + 1) + " taken by CORSAIR.", "#fb7185");
                    state.teamScore.corsair += 100;
                } else {
                    addFeed("Relay " + (relay.index + 1) + " is neutral.", "#cbd5e1");
                }
                if (CB.Audio && distanceToPlayer(relay.x, relay.y) < 1600) CB.Audio.dock();
            }
        });
        var held = freeRelays();
        if (held >= 2 && !state.flags.relayDrop) {
            state.flags.relayDrop = true;
            addFeed("TWO RELAYS HELD — the Nexus shield is vulnerable.", "#fde68a");
            setMessage("Nexus shield vulnerable. Push the Scab.", 3.5);
        } else if (held < 2) {
            state.flags.relayDrop = false;
        }
    }

    /* ===== update: events / comms / end ===== */

    function updateEvents(dt) {
        var e = state.events;

        if (!e.bountyOne && state.time >= 240) {
            e.bountyOne = true;
            addFeed(C.COMMS.events[0], "#fbbf24");
            setMessage("BOUNTY HOUR — the Scab pays triple.", 4);
        }
        if (!e.bountyTwo && state.time >= 660) {
            e.bountyTwo = true;
            addFeed(C.COMMS.events[0], "#fbbf24");
            setMessage("FINAL BOUNTY HOUR — finish it.", 4);
        }
        if (!e.ion && state.time >= 480) {
            e.ion = true;
            e.ionUntil = state.time + 38;
            addFeed(C.COMMS.events[1], "#67e8f9");
            setMessage("ION STORM in the Scab — shields offline.", 4);
            if (CB.Audio) CB.Audio.alarm();
        }
        if (!e.raidOne && state.time >= 300) {
            e.raidOne = true;
            if (CB.NPCs) CB.NPCs.spawnRaid(state);
            addFeed(C.COMMS.events[2], "#c084fc");
            setMessage("FERAL RAID — defend the Anchorage.", 4);
            if (CB.Audio) CB.Audio.alarm();
        }
        if (!e.raidTwo && state.time >= 690) {
            e.raidTwo = true;
            if (CB.NPCs) CB.NPCs.spawnRaid(state);
            addFeed(C.COMMS.events[2], "#c084fc");
            setMessage("SECOND FERAL RAID — Anchorage under attack.", 4);
            if (CB.Audio) CB.Audio.alarm();
        }
        if (!e.leviathan && state.time >= 420) {
            e.leviathan = true;
            if (CB.NPCs) CB.NPCs.spawnLeviathan(state);
            addFeed(C.COMMS.events[3], "#fde68a");
            setMessage("THE LEVIATHAN HAS SURFACED. Kill it, take the core.", 6);
            if (CB.Audio) CB.Audio.boss();
            state.shake = 18;
        }
        if (!e.collapseWarning && state.remaining <= 60) {
            e.collapseWarning = true;
            addFeed(C.COMMS.events[4], "#f87171");
            setMessage("ONE MINUTE TO COLLAPSE.", 4);
            if (CB.Audio) CB.Audio.alarm();
        }
        e.commsTimer -= dt;
        if (e.commsTimer <= 0) {
            e.commsTimer = 38 + rnd() * 26;
            var pool = (state.teamScore.free >= state.teamScore.corsair) ? C.COMMS.corsair : C.COMMS.free;
            state.comms = pool[Math.floor(rnd() * pool.length)];
            state.commsUntil = state.time + 7;
        }
    }

    function updateCore(dt) {
        if (!state.coreCarrier) return;
        var s = state.coreCarrier;
        if (!s.alive) { state.coreCarrier = null; return; }
        var target = s.team === "corsair" ? state.home : state.nexus;
        if (!target || !target.alive) return;
        if (dist(s.x, s.y, target.x, target.y) < target.dockRadius) {
            s.carrierCore = false;
            state.coreCarrier = null;
            if (s.team === "corsair") {
                damageStructure(state.home, 1800, s);
                addFeed("CORE DETONATED ON THE ANCHORAGE — hull breached.", "#f87171");
                setMessage("The Anchorage took a direct core hit.", 4);
            } else {
                state.nexus.shield = 0;
                state.nexus.shieldDownUntil = state.time + 30;
                state.flags.coreDelivered = true;
                damageStructure(state.nexus, 1600, s);
                addFeed("CORE DELIVERED — the Nexus shield is GONE.", "#fde68a");
                setMessage("Nexus shield destroyed. Finish the core.", 4);
                state.stats.core += 1;
                state.teamScore.free += 400;
            }
            boom(target.x, target.y, "#fde68a", 40);
            state.shake = 24;
            if (CB.Audio) CB.Audio.bigExplode();
            if (CB.Audio) CB.Audio.core();
        }
    }

    function updateComms() {
        if (state.commsUntil && state.time > state.commsUntil) {
            state.comms = "";
            state.commsUntil = 0;
        }
    }

    function endMatch(reason) {
        if (state.phase !== "running") return;
        state.phase = "over";
        var outcome = "loss";
        if (reason === "nexus") outcome = "win";
        else if (reason === "home") outcome = "loss";
        else {
            if (state.teamScore.free > state.teamScore.corsair) outcome = "win";
            else if (state.teamScore.free === state.teamScore.corsair) outcome = "draw";
            else outcome = "loss";
        }
        state.outcome = outcome;
        state.endReason = reason;
        if (CB.Audio) {
            if (outcome === "win") CB.Audio.win();
            else CB.Audio.lose();
        }
        if (state.onEnd) state.onEnd(outcome, reason);
    }

    function checkEnd() {
        if (state.home && state.home.hp <= 0 && state.home.alive) {
            state.home.alive = false;
            boom(state.home.x, state.home.y, "#5eead4", 80);
            endMatch("home");
            return;
        }
        if (state.nexus && state.nexus.hp <= 0 && state.nexus.alive) {
            state.nexus.alive = false;
            boom(state.nexus.x, state.nexus.y, "#fb7185", 100);
            state.shake = 30;
            if (CB.Audio) CB.Audio.bigExplode();
            endMatch("nexus");
            return;
        }
        if (state.remaining <= 0) endMatch("time");
    }

    /* ===== main update ===== */

    function update(dt) {
        if (state.phase !== "running") return;
        state.time += dt;
        state.remaining = Math.max(0, state.remaining - dt);
        state.shake *= Math.max(0, 1 - 5 * dt);

        /* Player intention is written by main.js each frame. */
        var p = state.player;
        if (p && p.alive && !p.docked && state.input) {
            var inp = state.input;
            p.thrustX = inp.moveX;
            p.thrustY = inp.moveY;
            /* input.aim is a world-space point; the ship needs a unit vector. */
            var adx = inp.aimX - p.x;
            var ady = inp.aimY - p.y;
            var alen = Math.sqrt(adx * adx + ady * ady) || 1;
            p.aimX = adx / alen;
            p.aimY = ady / alen;
            p.wantFire = !!inp.fire;
            p.boost = !!inp.boost;
        } else if (p) {
            p.thrustX = 0; p.thrustY = 0; p.wantFire = false; p.boost = false;
        }

        if (CB.AI) CB.AI.update(dt, state);
        if (CB.NPCs) CB.NPCs.update(dt, state);

        updateShips(dt);
        updateBullets(dt);
        updatePickups(dt);
        updateAsteroids(dt);
        updateStructures(dt);
        updateRelays(dt);
        updateEvents(dt);
        updateCore(dt);
        updateComms();

        for (var i = state.particles.length - 1; i >= 0; i--) {
            var part = state.particles[i];
            part.x += part.vx * dt;
            part.y += part.vy * dt;
            part.vx *= Math.max(0, 1 - 1.6 * dt);
            part.vy *= Math.max(0, 1 - 1.6 * dt);
            part.life -= dt;
            if (part.life <= 0) state.particles.splice(i, 1);
        }

        var zone = p ? Z.zoneAt(p.x, p.y) : null;
        if (zone && state.lastZone !== zone.id) {
            state.lastZone = zone.id;
            if (state.onZone) state.onZone(zone);
            if (CB.Audio) CB.Audio.setZone(zone.id);
        }
        checkEnd();
    }

    CB.World = {
        state: state,
        initMatch: initMatch,
        update: update,
        makeShip: makeShip,
        fireWeapon: fireWeapon,
        useAbility: useAbility,
        damageShip: damageShip,
        damageStructure: damageStructure,
        damageAsteroid: damageAsteroid,
        serviceDock: serviceDock,
        botService: botService,
        dockPlayer: dockPlayer,
        undockPlayer: undockPlayer,
        upgradePlayer: upgradePlayer,
        bankCargo: bankCargo,
        spawnPickup: spawnPickup,
        spawnCore: spawnCore,
        nearestShip: nearestShip,
        nearestEnemy: nearestEnemy,
        nearestAsteroid: nearestAsteroid,
        nearestStation: nearestStation,
        nearestRelay: nearestRelay,
        stationFor: stationFor,
        freeRelays: freeRelays,
        addFeed: addFeed,
        setMessage: setMessage,
        markOutlaw: markOutlaw,
        considerOutlaw: considerOutlaw,
        spark: spark,
        boom: boom,
        distanceToPlayer: distanceToPlayer,
        endMatch: endMatch,
        player: player,
        clamp: clamp,
        dist: dist
    };
})(window.CB = window.CB || {});
