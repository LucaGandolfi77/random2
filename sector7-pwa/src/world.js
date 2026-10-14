/*
 * SECTOR 7 - the sector itself.
 *
 * Owns entity lifecycle, pooling, collision and drop tables. Systems (player,
 * npcs, stations) set intent on ships; World integrates and resolves them.
 *
 * Every collection that churns - bullets, pickups, particles - is a fixed
 * pool allocated once. Mobile GC pauses are the single biggest cause of
 * jank in a canvas game, and this removes them from the hot path entirely.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;
    var P = S.PROJ;

    var world = {
        size: C.world.size,
        station: { x: C.world.station.x, y: C.world.station.y },
        /* The active sector definition, or null when running headless with no
         * sector table loaded. Everything that varies per map reads it from
         * here rather than branching on an id. */
        sector: null,
        sectorId: "rook",
        time: 0,
        rng: null,

        player: null,
        ships: [],          // player + npcs, alive only
        bullets: [],
        ammo: [],
        missiles: [],
        mines: [],
        pickups: [],
        particles: [],
        floaters: [],
        rocks: [],
        crates: [],
        stars: [],
        nebulae: [],
        /* A faction's base, on a faction map. It is a STRUCTURE, not a ship:
         * it cannot be locked, it cannot be docked at, and it is not in
         * world.ships - so none of the ship-targeting code has to learn about
         * it. On a frontier sector this is null and every base code path is
         * skipped. */
        base: null,
        events: [],

        /* The player's explicit lock. Distinct from the soft aim assist:
         * this is a choice the player made and it survives losing the target
         * to radar range. */
        target: null,

        roster: [],
        /* Recent hits on the player, for the directional damage indicator.
         * The shooter is not known at the point of impact - a bullet only
         * knows which way it is travelling - so the indicator points back
         * along the bullet's own path, which is where the shot came from. */
        hitMarks: [],
        docked: false,
        shake: 0,
        killCount: 0,
    };

    var nextId = 1;
    var STEP_SCRATCH = 0;
    var HIT_MARK_TTL = 1.6;

    /* ===== Pools ===== */
    function makePool(n, factory) {
        var arr = new Array(n);
        for (var i = 0; i < n; i++) arr[i] = factory();
        return arr;
    }

    function initPools() {
        world.bullets = makePool(C.pools.bullets, function () {
            return { on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, life: 0, ds: 0, da: 0, r: 4, friendly: true, ownerId: 0, color: "#fff", heavy: false };
        });
        world.ammo = makePool(C.pools.ammo, function () {
            return { on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, life: 0, ds: 0, da: 0, r: 7, ownerId: 0, friendly: true };
        });
        world.pickups = makePool(C.pools.pickups, function () {
            return { on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, kind: "energy", value: 0, life: 0, spin: 0, seed: 0 };
        });
        world.missiles = makePool(C.pools.missiles, function () {
            return { on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, life: 0,
                     ds: 0, da: 0, splash: 0, ownerId: 0, ownerIsPlayer: true, targetId: 0, arm: 0 };
        });
        world.mines = makePool(C.pools.mines, function () {
            return { on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, life: 0,
                     ds: 0, da: 0, radius: 90, ownerId: 0, ownerIsPlayer: true, arm: 0 };
        });
        world.particles = makePool(C.pools.particles, function () {
            return { on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 3, color: "#fff", grav: 0, kind: "spark" };
        });
        world.floaters = makePool(C.pools.floaters, function () {
            return { on: false, x: 0, y: 0, z: 0, life: 0, text: "", color: "#fff" };
        });
    }

    function claim(pool) {
        for (var i = 0; i < pool.length; i++) {
            if (!pool[i].on) { pool[i].on = true; return pool[i]; }
        }
        return null;
    }

    /* ===== Generation ===== */

    /* Two ring bands of rock so the map has landmarks instead of noise. */
    function buildRocks() {
        var rng = world.rng;
        var size = world.size;
        var target = world.sector ? world.sector.rocks : C.world.targets;
        var placed = [];
        var guard = 0;

        while (placed.length < target && guard++ < target * 60) {
            var x = rng() * size;
            var y = rng() * size;

            /* Keep the station's approach lanes clear. */
            if (S.dist2(x, y, world.station.x, world.station.y) < C.world.clearRadius * C.world.clearRadius) continue;
            /* And keep the base's footprint clear, or the structure comes up
             * out of a rock field and reads as scenery. */
            if (world.base) {
                var br = world.base.r + 120;
                if (S.dist2(x, y, world.base.x, world.base.y) < br * br) continue;
            }

            var r = 24 + rng() * 30;
            var clash = false;
            for (var i = 0; i < placed.length; i++) {
                var min = r + placed[i].r + 46;
                if (S.dist2(x, y, placed[i].x, placed[i].y) < min * min) { clash = true; break; }
            }
            if (clash) continue;

            var hull = Math.round(26 + r * 2.6);
            placed.push({
                x: x, y: y, z: 0,
                r: r,
                hull: hull,
                maxHull: hull,
                /* Every rock hides a different crystal cache, so breaking the
                 * field is a real payout rather than a formality. */
                cache: 1 + Math.floor(rng() * 4),
                energy: 8 + Math.floor(rng() * 14),
                seed: Math.floor(rng() * 100000),
                alive: true,
                respawn: 0,
                hitFlash: 0,
            });
        }

        /* Rocks holding a big crystal cache are worth marking. Without it the
         * field is undifferentiated scenery and the player has no way to tell
         * which rocks are worth shooting. */
        for (var i = 0; i < placed.length; i++) placed[i].rich = placed[i].cache >= 3;

        world.rocks = placed;
    }

    function buildCrates() {
        var rng = world.rng;
        var size = world.size;
        var count = world.sector ? world.sector.crates : C.world.crates;
        var list = [];
        for (var i = 0; i < count; i++) {
            var x, y, tries = 0;
            do {
                x = rng() * size;
                y = rng() * size;
                tries++;
            } while (
                tries < 24 &&
                S.dist2(x, y, world.station.x, world.station.y) < (C.world.clearRadius * 0.7) *
                (C.world.clearRadius * 0.7)
            );
            list.push({
                x: x, y: y, z: 6,
                alive: true,
                respawn: 0,
                value: C.world.crateValue + Math.floor(rng() * C.world.crateValueJitter),
                seed: Math.floor(rng() * 100000),
                spin: rng() * Math.PI * 2,
            });
        }
        world.crates = list;
    }

    /* A fixed-size field of stars that wraps around the camera, so there are
     * infinite stars without ever allocating one. */
    function buildStars() {
        var rng = world.rng;
        var FIELD = 2800;
        var layers = [
            { n: 150, size: 0.7, bright: 0.30 },
            { n: 110, size: 1.0, bright: 0.48 },
            { n: 64, size: 1.6, bright: 0.75 },
        ];
        var list = [];
        for (var l = 0; l < layers.length; l++) {
            for (var i = 0; i < layers[l].n; i++) {
                list.push({
                    x: rng() * FIELD,
                    y: rng() * FIELD,
                    layer: l,
                    size: layers[l].size * (0.7 + rng() * 0.6),
                    bright: layers[l].bright * (0.55 + rng() * 0.65),
                    tw: rng() * Math.PI * 2,
                });
            }
        }
        world.stars = list;
        world.starField = FIELD;

        var pal = world.sector ? world.sector.palette : null;
        world.nebulae = [];
        for (var n = 0; n < 4; n++) {
            world.nebulae.push({
                x: rng() * world.size,
                y: rng() * world.size,
                r: 300 + rng() * 340,
                hue: pal ? pal.nebula[n % pal.nebula.length] : "24,64,132",
                a: 0.08 + rng() * 0.06,
            });
        }
    }

    /* Hazards are placed once per sector, away from the station, so they are
     * landmarks the player learns rather than surprises they cannot read. */
    function buildHazards(sec) {
        var list = [];
        if (!sec || !sec.hazard) return list;
        var rng = world.rng;
        for (var i = 0; i < sec.hazard.count; i++) {
            var x = 0, y = 0, tries = 0;
            do {
                x = 300 + rng() * (world.size - 600);
                y = 300 + rng() * (world.size - 600);
                tries++;
            } while (tries < 30 && S.dist2(x, y, world.station.x, world.station.y) <
                (C.world.clearRadius * 2.4) * (C.world.clearRadius * 2.4));
            list.push({
                x: x, y: y,
                r: sec.hazard.radius,
                kind: sec.hazard.kind,
                pull: sec.hazard.pull || 0,
                /* Storm phases are offset per hazard so they never all fire
                 * at once and leave a safe window. */
                phase: rng() * (sec.hazard.period || 30),
                active: false,
                strength: 0,
            });
        }
        return list;
    }

    /* ===== Faction bases =====
     * One per faction map: a big structure you raid.
     *
     * It is shield-dominant on purpose, and it is shield-dominant *through
     * the same rule every ship obeys* - the armour component is held off
     * while a shield is up. A Hive base at 95% shields is therefore
     * effectively laser-proof, and the only way through is the capacitor
     * round. That is the Ammo track's payoff moment, and it is why the base
     * is built on the shared damage model rather than on its own.
     *
     * Deliberately NOT a station: you cannot dock here. If you could, a
     * faction territory would be a free teleport hub and travelling between
     * maps would stop being a decision.
     */
    function buildBase(sec) {
        if (!sec || sec.kind !== "faction" || !sec.faction) return null;
        var fac = S.faction(sec.faction);
        var rng = world.rng;

        /* Placed well off the station and off dead centre, so the dock ring
         * and the camera's opening shot are never about the base. */
        var a = 0.4 + rng() * Math.PI * 2;
        var d = world.size * (0.26 + rng() * 0.08);
        var x = S.clamp(world.station.x + Math.cos(a) * d, 320, world.size - 320);
        var y = S.clamp(world.station.y + Math.sin(a) * d, 320, world.size - 320);

        var r = sec.baseRadius || 260;
        var hull = Math.round(900 + sec.tierCap * 260);
        var maxShield = S.npcShieldFor(hull, fac.key);

        return {
            x: x, y: y, z: 26,
            r: r,
            faction: fac.key,
            color: fac.color,
            name: fac.name.toUpperCase() + " BASE",
            hull: hull,
            maxHull: hull,
            shield: maxShield,
            maxShield: maxShield,
            alive: true,
            respawn: 0,
            hitFlash: 0,
            called: false,
            /* Defenders it throws when you first hit it. Cleared once, and
             * never re-armed: the second attempt is on a rebuilt base. */
            guards: sec.raids || 1,
            reward: sec.baseReward || 60,
            seed: Math.floor(rng() * 100000),
            spin: 0,
        };
    }

    /* Named rivals, frozen per seed: the same roster hunts you every run. */
    function buildRoster(seed) {
        /* Derived from the seed rather than the world stream, so generating
         * rocks cannot shift which rivals you get. */
        var rng = S.mulberry32(S.hashString("sector7-roster:" + seed));
        var list = [];
        for (var i = 0; i < C.npc.maxAlive * 3; i++) {
            /* Faction is per-pilot and fixed for the seed, so Ash-9 is the
             * same Demaner every run rather than a different colour each
             * time you dock. */
            var fac = S.pickFaction(1 + Math.floor(rng() * (S.FACTION_MIX.length - 1)), rng);
            list.push({
                id: "n" + i,
                name: S.randomCallsign(rng),
                color: fac.color,
                faction: fac.key,
                skill: 0.25 + rng() * 0.75,
                greed: 0.2 + rng() * 0.8,
                phase: rng() * Math.PI * 2,
            });
        }
        world.roster = list;
    }

    function generate(seed, sectorId) {
        var sec = (S.Sector && sectorId) ? S.Sector.get(sectorId) : null;
        world.sector = sec;
        world.sectorId = sec ? sec.id : "rook";
        world.seed = S.Sector ? S.Sector.seedFor(seed, world.sectorId) : (seed >>> 0);
        world.rng = S.mulberry32(world.seed);

        world.size = sec ? sec.size : C.world.size;
        /* The station stays dead centre in EVERY map, frontier or faction
         * alike: the dock ring, the minimap and the "fly back to the station"
         * affordance all assume it, and it is the one thing every map shares. */
        world.station = { x: Math.round(world.size / 2), y: Math.round(world.size / 2) };
        world.tierCap = sec ? sec.tierCap : C.npc.maxTier;
        world.npcMax = sec ? sec.npcMax : C.npc.maxAlive;
        world.payout = sec ? sec.payout : 1;
        world.mapKind = sec ? sec.kind : "sector";
        /* Built BEFORE the rock field so the field can leave its footprint
         * clear - and exactly once, because a second call would burn an RNG
         * draw and leave the rocks laid out around a base nobody can see. */
        world.base = buildBase(sec);
        world.hazards = buildHazards(sec);
        world.time = 0;
        world.ships.length = 0;
        world.events.length = 0;
        world.docked = false;
        world.shake = 0;
        world.killCount = 0;
        world.player = null;
        world.target = null;
        nextId = 1;

        initPools();
        buildRocks();
        buildCrates();
        buildStars();
        buildRoster(world.seed);
    }

    /* ===== Ships ===== */

    function makeShip(opts) {
        var maxHull = opts.maxHull;
        var maxShield = opts.maxShield === undefined
            ? Math.round(maxHull * 0.45)
            : opts.maxShield;
        return {
            id: nextId++,
            isPlayer: !!opts.isPlayer,
            name: opts.name || "Unknown",
            color: opts.color || S.COLORS.player,
            tier: opts.tier || 1,
            /* Which mob this hull belongs to. The player is "you"; every NPC
             * is one of S.FACTIONS, and that decides its shield pool and
             * which weapons it will point at you. */
            faction: opts.faction || "you",

            x: opts.x || 0,
            y: opts.y || 0,
            z: opts.z === undefined ? 10 : opts.z,
            vx: 0, vy: 0,
            heading: opts.heading || 0,
            aim: opts.heading || 0,
            throttle: 0,

            /* Two pools, not one. Shields absorb and refill; armour never
             * comes back on its own. */
            shield: maxShield,
            maxShield: maxShield,
            hull: maxHull,
            maxHull: maxHull,
            radius: opts.radius || 15,
            stats: opts.stats,
            armor: opts.reduction || 0,

            /* The hold. Energy is carried, not owned. */
            hold: 0,
            holdMax: opts.holdMax === undefined ? 200 : opts.holdMax,

            cooldown: 0,
            cooldownAmmo: 0,
            cooldownMissiles: 0,
            cooldownMine: 0,
            cooldownCpu: 0,
            alive: true,
            docked: false,
            invuln: opts.invuln || 0,
            hitFlash: 0,
            /* Set by damageShip on every hit; shield regen reads it. */
            sinceHit: 99,
            idleFor: 0,
            kills: 0,
            energy: opts.energy || 0,
            crystals: 0,

            /* CPU state. Only the player ever has a fitted CPU, but the
             * fields live on every ship so the tick loop has one shape. */
            cpu: null,
            cpuKey: null,
            cpuTimer: 0,

            /* AI-only fields; harmless on the player. */
            state: "patrol",
            target: null,
            think: 0,
            wanderPhase: opts.phase || 0,
            fleeFor: 0,
            wobble: 0,
        };
    }

    function spawnShip(opts) {
        var s = makeShip(opts);
        world.ships.push(s);
        return s;
    }

    function removeShip(ship) {
        ship.alive = false;
        var i = world.ships.indexOf(ship);
        if (i >= 0) world.ships.splice(i, 1);

        /* Drop every reference to the wreck. AI re-targets nine times a
         * second anyway, but leaving a dangling pointer in between means a
         * ship can try to strafe at a hull that no longer exists. */
        for (var j = 0; j < world.ships.length; j++) {
            if (world.ships[j].target === ship) world.ships[j].target = null;
        }
        ship.target = null;
        if (world.target === ship) world.target = null;
    }

    /* ===== Combat =====
     * Every shot carries a packet - some damage to shields, some to armour -
     * rather than a single number. `S.packet` builds them, so a weapon's
     * identity lives in one table (config.js) instead of being retyped at
     * every call site.
     */

    function fire(ship, dirAngle, opts) {
        if (!ship.alive || ship.cooldown > 0) return false;
        var st = ship.stats;

        ship.cooldown = st.fireInterval;
        var a = dirAngle === undefined ? ship.aim : dirAngle;
        var b = claim(world.bullets);
        if (!b) return false;

        var muzzle = ship.radius + 6;
        b.x = ship.x + Math.cos(a) * muzzle;
        b.y = ship.y + Math.sin(a) * muzzle;
        b.z = ship.z;
        b.vx = Math.cos(a) * C.combat.bulletSpeed;
        b.vy = Math.sin(a) * C.combat.bulletSpeed;
        b.life = C.combat.bulletLife;
        b.ds = st.blasterPacket.shield;
        b.da = st.blasterPacket.armor;
        b.heavy = false;
        /* A mining round only ever hits rock. A pilot cutting an asteroid is
         * not shooting at the player who happens to fly through the beam -
         * you block its cut, you do not get shot for it - and without this a
         * map with five miners put a bullet into the rookie roughly every
         * second by pure accident, which is how the intro stopped being
         * survivable. A pilot that has been provoked stops mining and starts
         * shooting for real. */
        b.mining = !!(opts && opts.mining);
        b.r = ship.isPlayer ? C.combat.bulletRadius : C.combat.npcBulletRadius;
        b.friendly = ship.isPlayer;
        b.ownerId = ship.id;
        b.color = ship.isPlayer ? S.COLORS.bullet : S.COLORS.npcBullet;

        world.events.push({ type: "shoot", ship: ship });
        return true;
    }

    /* The capacitor round: one heavy shot, shield-first, on a long cooldown.
     * It is deliberately not a second blaster - it trades rate of fire for
     * the ability to hurt a shielded hull at all. */
    function fireAmmo(ship, dirAngle) {
        if (!ship.alive || ship.cooldownAmmo > 0) return false;
        var st = ship.stats;

        ship.cooldownAmmo = st.ammoCooldown;
        var a = dirAngle === undefined ? ship.aim : dirAngle;
        var b = claim(world.ammo);
        if (!b) return false;

        var muzzle = ship.radius + 10;
        b.x = ship.x + Math.cos(a) * muzzle;
        b.y = ship.y + Math.sin(a) * muzzle;
        b.z = ship.z;
        b.vx = Math.cos(a) * C.combat.ammoSpeed;
        b.vy = Math.sin(a) * C.combat.ammoSpeed;
        b.life = C.combat.ammoLife;
        b.ds = st.ammoPacket.shield;
        b.da = st.ammoPacket.armor;
        b.r = C.combat.ammoRadius;
        b.ownerId = ship.id;
        b.friendly = ship.isPlayer;

        world.events.push({ type: "ammo", ship: ship });
        return true;
    }

    function stepAmmo(dt) {
        var ships = world.ships;
        for (var i = 0; i < world.ammo.length; i++) {
            var a = world.ammo[i];
            if (!a.on) continue;

            a.life -= dt;
            if (a.life <= 0) { a.on = false; continue; }

            a.x += a.vx * dt;
            a.y += a.vy * dt;
            if (a.x < 0 || a.y < 0 || a.x > world.size || a.y > world.size) {
                a.on = false;
                continue;
            }

            for (var j = 0; j < ships.length; j++) {
                var ship = ships[j];
                if (ship.id === a.ownerId || !ship.alive || ship.docked) continue;
                if (!a.friendly && !ship.isPlayer && ship.target !== a.ownerId) continue;

                var sr = ship.radius + a.r;
                if (S.dist2(a.x, a.y, ship.x, ship.y) > sr * sr) continue;

                var owner = ownerById(a.ownerId);
                var res = damageShip(ship, { shield: a.ds, armor: a.da });
                applyLeech(owner, ship, res.hull);
                provoke(ship, owner);
                a.on = false;
                explode(a.x, a.y, a.z, "#c084fc", 7, "spark", 110);
                world.events.push({ type: "hit", ship: ship, dmg: res.hull, absorbed: res.absorbed });
                if (ship.isPlayer) {
                    floater(ship.x, ship.y, ship.z + 14, "-" + res.hull, "#ff8a9b");
                }
                if (ship.hull <= 0) {
                    if (ship.isPlayer) killPlayer(ship, owner);
                    else killShip(ship, owner);
                }
                break;
            }
        }
    }

    /* ===== Missiles and mines =====
     * The whole point of adding a second weapon and a defence is that the
     * blaster stops being the answer to everything: burst damage punches
     * through armour, and a mine is the only tool that helps while you are
     * running away from something faster than you.
     */

    /* Salvo: one missile per locked target, then the survivors go wherever
     * the turret is pointing so a lone target is never a wasted press. */
    function fireMissiles(ship, targets, count) {
        if (!ship.alive || ship.cooldownMissiles > 0) return 0;
        var st = ship.stats;
        if (!st.missiles) return 0;

        var n = Math.min(st.missiles, count || st.missiles);
        ship.cooldownMissiles = st.missileCooldown;

        var pool = [];
        for (var t = 0; t < n; t++) {
            var m = claim(world.missiles);
            if (!m) break;
            var target = targets && targets[t] ? targets[t] : null;
            var a = target
                ? Math.atan2(target.y - ship.y, target.x - ship.x)
                : (ship.aim || 0);
            /* Fan the salvo: identical launches are one target, not a volley. */
            a += ((t % 2 ? 1 : -1) * Math.floor(t / 2)) * 0.16;

            m.x = ship.x + Math.cos(a) * (ship.radius + 8);
            m.y = ship.y + Math.sin(a) * (ship.radius + 8);
            m.z = ship.z;
            m.vx = Math.cos(a) * 300;
            m.vy = Math.sin(a) * 300;
            m.life = 2.6;
            m.ds = st.missilePacket.shield;
            m.da = st.missilePacket.armor;
            /* Splash scales with the track too, so level 10 is a weapon that
             * can clear a formation rather than a bigger single hit. */
            m.splash = 42 + st.missiles * 6;
            m.ownerId = ship.id;
            m.ownerIsPlayer = ship.isPlayer;
            m.targetId = target ? target.id : 0;
            m.arm = 0.08;
            pool.push(m);
        }

        world.events.push({ type: "salvo", ship: ship, count: pool.length });
        return pool.length;
    }

    function dropMine(ship) {
        if (!ship.alive || ship.cooldownMine > 0) return false;
        var st = ship.stats;
        if (!st.mineCapacity) return false;

        var live = 0;
        for (var i = 0; i < world.mines.length; i++) {
            if (world.mines[i].on && world.mines[i].ownerId === ship.id) live++;
        }
        if (live >= st.mineCapacity) return false;

        var m = claim(world.mines);
        if (!m) return false;

        var back = ship.heading + Math.PI;
        m.x = ship.x + Math.cos(back) * (ship.radius + 6);
        m.y = ship.y + Math.sin(back) * (ship.radius + 6);
        m.z = ship.z;
        m.vx = ship.vx * 0.4;
        m.vy = ship.vy * 0.4;
        m.life = 26;
        m.ds = st.minePacket.shield;
        m.da = st.minePacket.armor;
        m.radius = st.mineRadius;
        m.ownerId = ship.id;
        m.ownerIsPlayer = ship.isPlayer;
        /* Arming delay: a mine that detonated the instant you dropped it
         * would be a liability, not a tool. */
        m.arm = 1.2;

        ship.cooldownMine = st.mineCooldown;
        world.events.push({ type: "mine", ship: ship });
        return true;
    }

    function stepMissiles(dt) {
        var ships = world.ships;
        for (var i = 0; i < world.missiles.length; i++) {
            var m = world.missiles[i];
            if (!m.on) continue;

            m.life -= dt;
            if (m.arm > 0) m.arm -= dt;
            if (m.life <= 0) { detonateMissile(m); continue; }

            /* Steer toward the locked target, with a turn rate you can outfly
             * at close range. Unlimited tracking turns a missile into a
             * homing ray and removes the reason to lead your shots. */
            if (m.targetId) {
                for (var k = 0; k < ships.length; k++) {
                    if (ships[k].id !== m.targetId || !ships[k].alive) continue;
                    var want = Math.atan2(ships[k].y - m.y, ships[k].x - m.x);
                    var cur = Math.atan2(m.vy, m.vx);
                    var turn = S.clamp(S.angleDiff(cur, want), -2.6 * dt, 2.6 * dt);
                    var speed = 430;
                    var a2 = cur + turn;
                    m.vx = Math.cos(a2) * speed;
                    m.vy = Math.sin(a2) * speed;
                    break;
                }
            }

            m.x += m.vx * dt;
            m.y += m.vy * dt;
            if (m.x < 0 || m.y < 0 || m.x > world.size || m.y > world.size) { m.on = false; continue; }

            if (m.arm > 0) continue;
            for (var j = 0; j < ships.length; j++) {
                var ship = ships[j];
                if (ship.id === m.ownerId || !ship.alive || ship.docked) continue;
                var reach = ship.radius + m.splash;
                if (S.dist2(m.x, m.y, ship.x, ship.y) > reach * reach) continue;
                detonateMissile(m);
                break;
            }
        }
    }

    /* Splash: the primary target at full damage, anything else inside the
     * blast at a falloff. Shields and armour scale the falloff exactly as
     * they scale a direct hit. */
    function detonateMissile(m) {
        m.on = false;
        explode(m.x, m.y, m.z, "#ffd166", 8, "spark", 130);
        explode(m.x, m.y, m.z, "#ff9f4f", 4, "shard", 90);

        for (var i = 0; i < world.ships.length; i++) {
            var ship = world.ships[i];
            if (ship.id === m.ownerId || !ship.alive) continue;
            var d = Math.sqrt(S.dist2(m.x, m.y, ship.x, ship.y));
            if (d > m.splash) continue;
            var k = S.clamp(1 - (d / m.splash) * 0.6, 0.25, 1);
            var owner = ownerById(m.ownerId);
            var res = damageShip(ship, { shield: m.ds * k, armor: m.da * k });
            applyLeech(owner, ship, res.hull);
                provoke(ship, owner);
            world.events.push({ type: "hit", ship: ship, dmg: res.hull, absorbed: res.absorbed });
            if (ship.isPlayer) floater(ship.x, ship.y, ship.z + 14, "-" + res.hull, "#ff8a9b");
            if (ship.hull <= 0) {
                if (ship.isPlayer) killPlayer(ship, ownerById(m.ownerId));
                else killShip(ship, ownerById(m.ownerId));
            }
        }
        world.shake = Math.max(world.shake, 5);
    }

    function stepMines(dt) {
        for (var i = 0; i < world.mines.length; i++) {
            var m = world.mines[i];
            if (!m.on) continue;
            m.life -= dt;
            if (m.arm > 0) m.arm -= dt;
            if (m.life <= 0) { m.on = false; continue; }

            m.x += m.vx * dt;
            m.y += m.vy * dt;
            var drag = Math.pow(0.2, dt);
            m.vx *= drag;
            m.vy *= drag;
            if (m.x < 0 || m.y < 0 || m.x > world.size || m.y > world.size) { m.on = false; continue; }
            if (m.arm > 0) continue;

            for (var j = 0; j < world.ships.length; j++) {
                var ship = world.ships[j];
                if (ship.id === m.ownerId || !ship.alive || ship.docked) continue;
                var reach = m.radius + ship.radius;
                if (S.dist2(m.x, m.y, ship.x, ship.y) > reach * reach) continue;
                m.on = false;
                explode(m.x, m.y, m.z, "#ffb45e", 12, "spark", 150);
                world.shake = Math.max(world.shake, 4);
                var owner = ownerById(m.ownerId);
                var res = damageShip(ship, { shield: m.ds, armor: m.da });
                applyLeech(owner, ship, res.hull);
                provoke(ship, owner);
                world.events.push({ type: "hit", ship: ship, dmg: res.hull, absorbed: res.absorbed });
                if (ship.isPlayer) floater(ship.x, ship.y, ship.z + 14, "-" + res.hull, "#ff8a9b");
                if (ship.hull <= 0) {
                    if (ship.isPlayer) killPlayer(ship, ownerById(m.ownerId));
                    else killShip(ship, ownerById(m.ownerId));
                }
                break;
            }
        }
    }

    function ownerById(id) {
        for (var i = 0; i < world.ships.length; i++) {
            if (world.ships[i].id === id) return world.ships[i];
        }
        return null;
    }

    /* ===== CPUs =====
     * One fitted at a time, activated by a single button. The cost model is
     * deliberate: the purchase is the commitment, the cooldown is the
     * throttle, and the per-use energy cost is small enough that a pilot who
     * has bought Insta-Shield is never confused about why it did nothing.
     */
    function activateCpu(ship) {
        var def = S.cpu(ship.cpu);
        if (!def) return { ok: false, reason: "no CPU fitted" };
        if (ship.cooldownCpu > 0) return { ok: false, reason: "CPU recharging" };
        if (ship.energy < def.energy) return { ok: false, reason: "not enough energy" };

        ship.energy -= def.energy;
        ship.cooldownCpu = def.cooldown;
        ship.cpuKey = def.key;

        switch (def.key) {
            case "insta":
                ship.invuln = Math.max(ship.invuln, C.cpu.instaShield);
                ship.cpuTimer = C.cpu.instaShield;
                break;
            case "radar":
                ship.cpuTimer = C.cpu.radarTime;
                break;
            case "leech":
                ship.cpuTimer = C.cpu.leechTime;
                break;
            case "repair":
                ship.cpuTimer = C.cpu.repairTime;
                break;
            case "warp": {
                /* Jump along the nose, not through the world boundary: a
                 * warp into a wall is a death the player cannot read coming. */
                var a = ship.heading;
                var m = 40, hi = world.size - m;
                ship.x = S.clamp(ship.x + Math.cos(a) * C.cpu.warpDistance, m, hi);
                ship.y = S.clamp(ship.y + Math.sin(a) * C.cpu.warpDistance, m, hi);
                ship.vx = Math.cos(a) * ship.stats.speed;
                ship.vy = Math.sin(a) * ship.stats.speed;
                ship.invuln = Math.max(ship.invuln, C.cpu.warpInvuln);
                explode(ship.x, ship.y, ship.z, "#a5f3fc", 14, "spark", 160);
                world.shake = Math.max(world.shake, 4);
                ship.cpuTimer = 0;
                break;
            }
            default:
                break;
        }

        world.events.push({ type: "cpu", ship: ship, key: def.key });
        return { ok: true, key: def.key };
    }

    /* Is a CPU effect running right now? Drives the HUD chip and the render
     * pass for the radar sweep. */
    function cpuActive(ship) {
        return !!(ship && ship.cpuTimer > 0 && ship.cpuKey);
    }

    /* Energy Leech: a share of what you land on a hostile comes back as
     * shield. Applied by the hit paths, which know both ends of the trade -
     * damageShip deliberately does not, because it cannot see the shooter. */
    function applyLeech(owner, victim, dealt) {
        if (!owner || !owner.isPlayer || !victim || victim.isPlayer) return 0;
        if (owner.cpuKey !== "leech" || owner.cpuTimer <= 0) return 0;
        if (!dealt) return 0;
        var before = owner.shield;
        owner.shield = Math.min(owner.maxShield, owner.shield + dealt * C.cpu.leechFraction);
        var gained = owner.shield - before;
        if (gained > 0) {
            floater(owner.x, owner.y, owner.z + 18, "+" + Math.round(gained), "#5eead4");
        }
        return gained;
    }

    /* ===== Damage resolution =====
     * The one place damage turns into hull loss. Every source - bullets, the
     * capacitor round, missile splash, mines, hazards - goes through here.
     *
     * The model is the genre one, and it is the reason there are two pools
     * at all:
     *
     *   - A shot carries a SHIELD component and an ARMOUR component.
     *   - The shield component is eaten by whatever shield is left.
     *   - The armour component is HELD OFF entirely while any shield remains.
     *
     * That last rule is the load-bearing one. Without it a fast armour weapon
     * simply kills through a shield wall - it strips nothing, it just outlasts
     * the shield by killing the hull underneath it - and the whole reason the
     * Ammo track exists evaporates. With it, a shielded hull genuinely has to
     * be answered with shield damage, and which gun you carry stops being a
     * matter of taste.
     *
     * Three invariants are asserted in the sim test:
     *
     *   1. A shield that absorbs everything takes ZERO hull damage.
     *   2. Armour damage does not land while a shield is still up.
     *   3. Anything that gets past the shield still lands at least one point,
     *      so stacked armour can never make a hull permanently unkillable.
     */
    function damageShip(ship, packet) {
        var out = { shield: 0, hull: 0, absorbed: 0, raw: 0, blocked: 0 };
        if (!ship.alive || ship.invuln > 0) return out;

        var sDmg = Math.max(0, packet && packet.shield || 0);
        var aDmg = Math.max(0, packet && packet.armor || 0);

        var maxS = ship.maxShield || 0;
        var absorbed = maxS > 0 ? Math.min(ship.shield, sDmg) : 0;
        if (absorbed > 0) ship.shield -= absorbed;
        out.absorbed = absorbed;

        /* A shot that a shield swallows entirely still counts as being hit.
         * Returning before this is what let a pilot regenerate straight
         * through incoming fire: the shield absorbed every round, `sinceHit`
         * never moved, and the regen delay never started. */
        if (absorbed > 0 || sDmg > 0 || aDmg > 0) {
            ship.hitFlash = C.player.hitFlashTime;
            ship.idleFor = 0;
            ship.sinceHit = 0;
        }

        var spill = sDmg - absorbed;
        var raw;
        if (ship.shield > 0) {
            /* Still shielded: the armour component has nowhere to land. */
            out.blocked = aDmg;
            raw = spill;
        } else {
            /* Shield is down (or was never up): the shot lands in full. */
            raw = spill + aDmg;
        }
        out.raw = raw;
        if (raw <= 0) return out;

        /* Armour can zero a weak attack outright - that is the point of the
         * module. But only for an attack that actually got through. */
        var dealt = Math.max(1, Math.round(raw - ship.armor));
        if (dealt > ship.hull) dealt = ship.hull;
        ship.hull -= dealt;
        out.hull = dealt;
        return out;
    }

    function dropPickup(x, y, z, kind, value) {
        var p = claim(world.pickups);
        if (!p) return null;
        /* A short scatter so a big drop reads as a pile, not a coin. */
        var a = Math.random() * Math.PI * 2;
        var s = 20 + Math.random() * 34;
        p.x = x + Math.cos(a) * s * 0.4;
        p.y = y + Math.sin(a) * s * 0.4;
        p.z = z + 4;
        p.vx = Math.cos(a) * s;
        p.vy = Math.sin(a) * s;
        p.kind = kind;
        p.value = value;
        p.life = C.world.pickupTTL;
        p.spin = Math.random() * Math.PI * 2;
        p.seed = Math.random();
        return p;
    }

    function explode(x, y, z, color, count, kind, speed) {
        /* Render may be absent (headless sim test), so fall back to full
         * quality rather than assuming a browser. */
        var q = (S.Render && S.Render.quality) ? S.Render.quality() : { particles: 1 };
        var n = Math.max(2, Math.round(count * (q.particles === undefined ? 1 : q.particles)));
        for (var i = 0; i < n; i++) {
            var pt = claim(world.particles);
            if (!pt) return;
            var a = Math.random() * Math.PI * 2;
            var b = (Math.random() - 0.5) * 1.3;
            var sp = (speed || 110) * (0.35 + Math.random() * 0.9);
            pt.x = x; pt.y = y; pt.z = z;
            pt.vx = Math.cos(a) * sp;
            pt.vy = Math.sin(a) * sp * 0.6;
            pt.vz = b * sp * 0.45;
            pt.max = 0.35 + Math.random() * 0.6;
            pt.life = pt.max;
            pt.size = kind === "shard" ? 5 + Math.random() * 7 : 2 + Math.random() * 3;
            pt.color = color;
            pt.grav = kind === "shard" ? 0 : 0;
            pt.kind = kind || "spark";
        }
    }

    function floater(x, y, z, text, color) {
        var f = claim(world.floaters);
        if (!f) return;
        f.x = x; f.y = y; f.z = z;
        f.life = 0.9;
        f.text = text;
        f.color = color;
    }

    /* Split an energy drop into `chunks` pickups around a point.
     *
     * The division has to be exact. Flooring the per-chunk value and handing
     * out `chunks` copies quietly destroys up to chunks-1 energy, which for a
     * wrecked player is the difference between getting your tank back and not
     * - and a bug like that is invisible until someone adds up the loot. The
     * remainder is spread one energy at a time across the first chunks. */
    function scatterEnergy(x, y, z, total, chunks) {
        if (total <= 0 || chunks <= 0) return;
        var per = Math.floor(total / chunks);
        var extra = total - per * chunks;
        for (var i = 0; i < chunks; i++) {
            dropPickup(x, y, z, "energy", per + (i < extra ? 1 : 0));
        }
    }

    function killShip(ship, killer) {
        if (!ship.alive) return;
        var payout = S.npcPayout(ship.tier);
        var mult = world.payout || 1;

        explode(ship.x, ship.y, ship.z, ship.color, 22, "shard", 150);
        explode(ship.x, ship.y, ship.z, "#ffd9a0", 12, "spark", 200);
        S.shake(ship.isPlayer ? 26 : ship.tier > 4 ? 10 : 4);
        world.shake = Math.max(world.shake, ship.isPlayer ? 26 : ship.tier > 4 ? 10 : 4);

        world.killCount++;
        if (killer) killer.kills++;

        /* Loot: energy and crystals scatter, and anyone can scoop them -
         * including the NPCs, which keeps the sector economy circulating. */
        var dropEnergy = Math.round(payout.energy * C.economy.energyPerKill * mult);
        var dropCrys = Math.round(payout.crystals * C.economy.crystalsPerKill * mult);
        var chunks = Math.min(6, Math.max(2, Math.round(dropEnergy / 14)));
        scatterEnergy(ship.x, ship.y, ship.z, dropEnergy, chunks);
        dropPickup(ship.x, ship.y, ship.z, "crystal", dropCrys);

        world.events.push({ type: "kill", killer: killer, victim: ship });
        removeShip(ship);
    }

    /* Player death is special: everything you were carrying is the *whole* run,
     * so the tank and the hold both hit the deck as collectable loot you can
     * fly back out and reclaim.
     *
     * The Salvage Rig pulls a share clear of BOTH before the wreck goes up,
     * which is what makes it worth buying early: the bigger your hold, the
     * more there is for it to save. What it recovers stays on the ship and is
     * banked with it; only the remainder spills.
     *
     * scatterEnergy divides exactly, so spilled + banked === tank + hold
     * holds to the point. The sim test asserts it. */
    function killPlayer(ship, killer) {
        var rig = S.refitLevel(ship.refits, "salvage");
        var carried = Math.floor(ship.energy) + Math.floor(ship.hold);
        var recovered = Math.floor(carried * rig * 0.14);
        var total = Math.floor((carried - recovered) * C.player.energyDropFraction);
        ship.energy = recovered;
        ship.hold = 0;
        scatterEnergy(ship.x, ship.y, ship.z, total,
            S.clamp(Math.round(total / 40), 1, C.cargo.maxChunks));
        explode(ship.x, ship.y, ship.z, S.COLORS.player, 30, "shard", 190);
        world.shake = 30;
        removeShip(ship);
        world.events.push({ type: "playerDeath", killer: killer });
    }

    /* ===== Motion =====
     * One integrator for every ship, player and NPC alike. Systems set
     * heading/throttle/fire; this turns that into motion and collisions.
     */
    function moveShip(ship, dt) {
        if (!ship.alive || ship.docked) return;

        var st = ship.stats;
        var targetSpeed = st.speed * ship.throttle;

        /* Ease into the commanded speed instead of snapping: a top-down ship
         * that instantly reaches full speed feels twitchy and unfair. */
        var k = S.damp(dt, 0.11);
        ship.vx = S.lerp(ship.vx, Math.cos(ship.heading) * targetSpeed, k);
        ship.vy = S.lerp(ship.vy, Math.sin(ship.heading) * targetSpeed, k);

        /* A gravity well bends the trajectory rather than teleporting:
         * steering into one still works, you just have to plan for it. */
        var hz = world.hazards;
        if (hz && hz.length) {
            for (var hi = 0; hi < hz.length; hi++) {
                var h = hz[hi];
                if (h.kind !== "well") continue;
                var hdx = h.x - ship.x, hdy = h.y - ship.y;
                var hd2 = hdx * hdx + hdy * hdy;
                if (hd2 > h.r * h.r || hd2 < 1) continue;
                var hd = Math.sqrt(hd2);
                var pull = (h.pull || 150) * (1 - hd / h.r) * dt;
                ship.vx += (hdx / hd) * pull;
                ship.vy += (hdy / hd) * pull;
            }
        }

        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;

        /* Soft walls. The ship is nudged back rather than stopped dead, so a
         * graze along the boundary is survivable. */
        var m = 40;
        var lo = m, hi = world.size - m;
        if (ship.x < lo) { ship.x = lo; ship.vx = Math.abs(ship.vx) * 0.4; }
        if (ship.x > hi) { ship.x = hi; ship.vx = -Math.abs(ship.vx) * 0.4; }
        if (ship.y < lo) { ship.y = lo; ship.vy = Math.abs(ship.vy) * 0.4; }
        if (ship.y > hi) { ship.y = hi; ship.vy = -Math.abs(ship.vy) * 0.4; }

        if (ship.cooldown > 0) ship.cooldown -= dt;
        if (ship.cooldownAmmo > 0) ship.cooldownAmmo -= dt;
        if (ship.cooldownMissiles > 0) ship.cooldownMissiles -= dt;
        if (ship.cooldownMine > 0) ship.cooldownMine -= dt;
        if (ship.cooldownCpu > 0) ship.cooldownCpu -= dt;
        if (ship.invuln > 0) ship.invuln -= dt;
        if (ship.hitFlash > 0) ship.hitFlash -= dt;
        if (ship.cpuTimer > 0) ship.cpuTimer -= dt;
        ship.idleFor += dt;
        ship.sinceHit += dt;
    }

    /* Repair Patch is the one CPU with a continuous effect, so it needs a tick.
     * It patches the hull while you keep flying, which means it competes with
     * dodging rather than with aiming - deliberately a different shape of
     * button press from the other four. */
    function stepCpu(dt) {
        var ships = world.ships;
        for (var i = 0; i < ships.length; i++) {
            var s = ships[i];
            if (!s.isPlayer || !s.alive || s.docked) continue;
            if (s.cpuTimer <= 0 || s.cpuKey !== "repair") continue;
            if (s.hull >= s.maxHull) continue;
            s.hull = Math.min(s.maxHull, s.hull + C.cpu.repairPerSec * dt);
        }
    }

    /* ===== Shield regeneration =====
     * Shields come back, armour never does, and the gap between them is the
     * whole reason to break contact instead of fighting to the death.
     *
     * It is gated on `sinceHit`, not on whether the ship is moving, because
     * a player who is being shot at in a straight line is not "out of
     * combat" and should not out-trade a firefight by holding still in it.
     */
    function stepShields(dt) {
        var ships = world.ships;
        var delay = C.shield.regenDelay;
        for (var i = 0; i < ships.length; i++) {
            var s = ships[i];
            if (!s.alive || s.docked || !s.maxShield) continue;
            if (s.shield >= s.maxShield) { s.shield = s.maxShield; continue; }
            if (s.sinceHit < delay) continue;
            /* VANTA's dead nebulae eat regeneration - shields included. Out
             * there a shield is something you bought, not something you get
             * back for free. */
            if (hazardAt(s.x, s.y, "void") > 0.25) continue;
            var st = s.stats;
            var rate = st && st.shieldRegen ? st.shieldRegen : C.shield.regenRate * 0.7;
            s.shield = Math.min(s.maxShield, s.shield + rate * dt);
        }
    }

    /* ===== Step ===== */
    function step(dt) {
        STEP_SCRATCH = Math.ceil(C.combat.bulletSpeed * dt) + C.combat.bulletRadius;

        world.time += dt;
        if (world.shake > 0) world.shake = Math.max(0, world.shake - C.camera.shakeDecay * 26 * dt);

        stepBullets(dt);
        stepAmmo(dt);
        stepMissiles(dt);
        stepMines(dt);
        stepPickups(dt);
        stepRocks(dt);
        stepCrates(dt);
        stepBase(dt);
        stepParticles(dt);
        stepFloaters(dt);
        stepHazards(dt);
        stepShields(dt);
        stepCpu(dt);
        stepHitMarks();
        stepZeroHull();
        resolveShipCollisions();
    }

    /* Safety net for the one invariant that must never break: no living ship
     * is ever at zero hull. Bullets kill through their own path (they need
     * the shooter for the kill feed), so this catches anything else that
     * happens to subtract the last point of hull - and stops a ship being
     * stranded alive, unkillable and unkillable-looking. */
    function stepZeroHull() {
        var doomed = null;
        for (var i = 0; i < world.ships.length; i++) {
            if (world.ships[i].hull > 0) continue;
            doomed = doomed || [];
            doomed.push(world.ships[i]);
        }
        if (!doomed) return;
        for (i = 0; i < doomed.length; i++) {
            if (doomed[i].isPlayer) killPlayer(doomed[i], null);
            else killShip(doomed[i], null);
        }
    }

    function stepBullets(dt) {
        var bullets = world.bullets;
        var ships = world.ships;
        var rocks = world.rocks;

        for (var i = 0; i < bullets.length; i++) {
            var b = bullets[i];
            if (!b.on) continue;

            b.life -= dt;
            if (b.life <= 0) { b.on = false; continue; }

            b.x += b.vx * dt;
            b.y += b.vy * dt;

            if (b.x < 0 || b.y < 0 || b.x > world.size || b.y > world.size) {
                b.on = false;
                continue;
            }

            var reach = b.r + STEP_SCRATCH;

            /* Rocks never care who shot them, so an NPC can clear a field
             * too - and its shots get harvested by whoever arrives first. */
            for (var r = 0; r < rocks.length; r++) {
                var rock = rocks[r];
                if (!rock.alive) continue;
                var rr = rock.r + reach;
                if (S.dist2(b.x, b.y, rock.x, rock.y) > rr * rr) continue;

                /* Rocks have no shields - they are a hull with a crystal cache inside, and
         * mining them is a single-pool problem. The whole packet counts, so
         * a capacitor round cracks one open as fast as it cracks a raider. */
                rock.hull -= (b.ds + b.da);
                rock.hitFlash = 0.16;
                explode(b.x, b.y, b.z, "#cbd5e1", 3, "spark", 70);
                if (rock.hull <= 0) breakRock(rock, b.friendly);
                b.on = false;
                break;
            }
            if (!b.on) continue;

            /* A mining round stops at the rock it was aimed at. */
            if (b.mining) continue;

            /* A faction base is a structure, not a ship: it sits outside
             * world.ships, so it is a separate check rather than a special
             * case inside the ship loop. Anything that can shoot a rock can
             * shoot this - which is exactly the point. */
            var base = world.base;
            if (base && base.alive) {
                var br = base.r + reach;
                if (S.dist2(b.x, b.y, base.x, base.y) <= br * br) {
                    damageBase({ shield: b.ds, armor: b.da });
                    explode(b.x, b.y, b.z, base.color, 3, "spark", 70);
                    b.on = false;
                    continue;
                }
            }

            for (var s = 0; s < ships.length; s++) {
                var ship = ships[s];
                if (ship.id === b.ownerId) continue;
                /* NPCs do not shoot each other out of the air on sight; they
                 * only trade once they have committed to a fight. */
                if (!b.friendly && !ship.isPlayer && ship.target !== b.ownerId) continue;

                var sr = ship.radius + reach;
                if (S.dist2(b.x, b.y, ship.x, ship.y) > sr * sr) continue;

                if (ship.isPlayer) {
                    world.hitMarks.push({ a: Math.atan2(-b.vy, -b.vx), t: world.time });
                    if (world.hitMarks.length > 8) world.hitMarks.shift();
                }

                var res = damageShip(ship, { shield: b.ds, armor: b.da });
                applyLeech(ownerOf(b, ships), ship, res.hull);
                provoke(ship, ownerOf(b, ships));
                explode(b.x, b.y, b.z, b.color, 3, "spark", 80);
                world.events.push({ type: "hit", ship: ship, dmg: res.hull, absorbed: res.absorbed });
                if (ship.isPlayer) {
                    floater(ship.x, ship.y, ship.z + 14, "-" + res.hull, "#ff8a9b");
                }

                if (ship.hull <= 0) {
                    if (ship.isPlayer) {
                        killPlayer(ship, ownerOf(b, ships));
                    } else {
                        killShip(ship, ownerOf(b, ships));
                    }
                }
                b.on = false;
                break;
            }
        }
    }

    function ownerOf(bullet, ships) {
        for (var i = 0; i < ships.length; i++) {
            if (ships[i].id === bullet.ownerId) return ships[i];
        }
        return null;
    }

    function breakRock(rock, byPlayer) {
        rock.alive = false;
        rock.respawn = C.world.targetRespawn;
        explode(rock.x, rock.y, rock.z, S.COLORS.rock, 16, "shard", 130);
        explode(rock.x, rock.y, rock.z, "#9aa4b2", 8, "spark", 90);
        world.events.push({ type: "rockBreak", rock: rock, byPlayer: !!byPlayer });

        dropPickup(rock.x, rock.y, rock.z, "crystal", rock.cache);
        /* Split the rock's own energy across a few drops. */
        var chunks = 3;
        for (var i = 0; i < chunks; i++) {
            dropPickup(rock.x, rock.y, rock.z, "energy", Math.round(rock.energy / chunks));
        }
    }

    function stepRocks(dt) {
        for (var i = 0; i < world.rocks.length; i++) {
            var rock = world.rocks[i];
            if (rock.hitFlash > 0) rock.hitFlash -= dt;
            if (rock.alive) continue;
            rock.respawn -= dt;
            if (rock.respawn <= 0) {
                rock.alive = true;
                rock.hull = rock.maxHull;
            }
        }
    }

    /* Crates are the sector's steady, low-risk income. They magnet exactly like
     * loose energy does, so on a phone you nudge toward one rather than
     * having to hit it precisely. */
    function stepCrates(dt) {
        var crates = world.crates;
        var ships = world.ships;
        var magR = C.world.pickupMagnet;
        var takeR = C.world.pickupRadius;

        for (var i = 0; i < crates.length; i++) {
            var crate = crates[i];
            crate.spin += dt * 1.1;

            if (!crate.alive) {
                crate.respawn -= dt;
                if (crate.respawn <= 0) {
                    crate.alive = true;
                    crate.value = C.world.crateValue +
                        Math.floor(Math.abs(Math.sin(world.time * 3.7 + crate.seed)) * C.world.crateValueJitter);
                }
                continue;
            }

            for (var s = 0; s < ships.length; s++) {
                var ship = ships[s];
                if (!ship.alive || ship.docked) continue;

                var d2 = S.dist2(crate.x, crate.y, ship.x, ship.y);
                if (d2 > magR * magR) continue;

                if (d2 <= takeR * takeR) {
                    var mult = ship.isPlayer ? ship.stats.energyBonus : 1;
                    var want = Math.round(crate.value * mult * (world.payout || 1));
                    var value = loadEnergy(ship, want);
                    /* A full hold does not consume the crate: it stays out
                     * there for whoever comes back with room. */
                    if (value <= 0) break;

                    crate.alive = false;
                    crate.respawn = C.world.crateRespawn;

                    floater(crate.x, crate.y, crate.z + 14, "+" + value, S.COLORS.energy);
                    explode(crate.x, crate.y, crate.z, S.COLORS.energy, 8, "spark", 90);

                    /* Only the player earns a stat; NPCs quietly bank theirs so
                     * the sector economy keeps circulating without you. */
                    if (ship.isPlayer) {
                        world.events.push({ type: "crate", value: value, ship: ship });
                    }
                    break;
                }

                /* Same pull curve as a loose energy drop. */
                var d = Math.sqrt(d2) || 1;
                var pull = S.clamp(1 - d / magR, 0, 1) * 260 * dt;
                crate.x += ((ship.x - crate.x) / d) * pull;
                crate.y += ((ship.y - crate.y) / d) * pull;
            }
        }
    }

    function stepPickups(dt) {
        var pickups = world.pickups;
        var ships = world.ships;

        for (var i = 0; i < pickups.length; i++) {
            var p = pickups[i];
            if (!p.on) continue;

            p.life -= dt;
            p.spin += dt * 2.4;
            if (p.life <= 0) { p.on = false; continue; }

            /* Drag the scatter to a halt. */
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= Math.pow(0.06, dt);
            p.vy *= Math.pow(0.06, dt);

            var magR = C.world.pickupMagnet;
            var takeR = C.world.pickupRadius;

            for (var s = 0; s < ships.length; s++) {
                var ship = ships[s];
                if (!ship.alive || ship.docked) continue;

                var d2 = S.dist2(p.x, p.y, ship.x, ship.y);
                if (d2 > magR * magR) continue;

                /* Magnet: pull harder the closer you are, so pickups feel
                 * collected rather than chased. */
                var d = Math.sqrt(d2) || 1;
                var pull = S.clamp(1 - d / magR, 0, 1);
                p.vx += ((ship.x - p.x) / d) * pull * 780 * dt;
                p.vy += ((ship.y - p.y) / d) * pull * 780 * dt;

                if (d2 <= takeR * takeR) {
                    /* collect() refuses when the hold is full. Only clear the
                     * pickup if it actually took something, so a full hold
                     * leaves the loot on the ground instead of eating it. */
                    if (collect(ship, p)) p.on = false;
                    break;
                }
            }
        }
    }

    /* ===== Base damage =====
     * The base resolves damage through exactly the same two-pool rule a ship
     * does, which is the point: a shield-dominant base is laser-proof for
     * the same reason a Demaner is.
     */
    function damageBase(packet) {
        var b = world.base;
        if (!b || !b.alive) return null;

        /* First contact calls the defenders out. Once. */
        if (!b.called && (packet.shield > 0 || packet.armor > 0)) {
            b.called = true;
            world.events.push({ type: "baseAlarm", base: b, guards: b.guards });
        }

        var absorbed = b.maxShield > 0 ? Math.min(b.shield, packet.shield) : 0;
        if (absorbed > 0) b.shield -= absorbed;

        var spill = packet.shield - absorbed;
        /* Held off entirely while any shield remains, exactly like a ship. */
        var raw = b.shield > 0 ? spill : spill + packet.armor;
        if (raw <= 0) return { shield: absorbed, hull: 0 };

        var dealt = Math.max(1, Math.round(raw));
        if (dealt > b.hull) dealt = b.hull;
        b.hull -= dealt;
        b.hitFlash = C.player.hitFlashTime;
        if (b.hull <= 0) breakBase(b);
        return { shield: absorbed, hull: dealt };
    }

    function breakBase(b) {
        b.alive = false;
        b.respawn = 45;
        b.shield = 0;
        b.called = false;
        b.guards = 0;
        explode(b.x, b.y, b.z, b.color, 34, "shard", 210);
        explode(b.x, b.y, b.z, "#ffe6a0", 20, "spark", 240);
        S.shake(22);
        world.shake = Math.max(world.shake, 22);
        /* The payout is a single crystal pickup rather than an instant
         * credit, so it can be lost if the run goes badly wrong - the same
         * rule as everything else you carry. */
        dropPickup(b.x, b.y, b.z, "crystal", b.reward);
        world.events.push({ type: "baseDown", base: b, reward: b.reward });
    }

    function stepBase(dt) {
        var b = world.base;
        if (!b) return;
        b.spin += dt * 0.35;
        if (b.hitFlash > 0) b.hitFlash -= dt;
        if (b.alive) return;
        b.respawn -= dt;
        if (b.respawn <= 0) {
            /* Rebuilt, and armed again: the second attempt at a Hive base is
             * meant to be a different fight from the first. */
            b.alive = true;
            b.hull = b.maxHull;
            b.shield = b.maxShield;
            b.called = false;
            b.guards = world.sector && world.sector.raids ? world.sector.raids : 1;
        }
    }

    /* ===== Cargo =====
     * Energy is carried, not owned. Everything you scoop up goes into the
     * hold; the hold goes into the tank when you dock, and the hold goes onto
     * the deck when you die. One rule, three places, and it is the reason
     * there is a station to go back to.
     */

    /* How much of `value` actually fits. Returns 0 when the hold is full, so
     * the caller can leave the pickup where it is rather than silently
     * destroying it - the player should be able to see the crate they could
     * not fit and go and dock. */
    function loadEnergy(ship, value) {
        var room = ship.holdMax - ship.hold;
        if (room <= 0) return 0;
        var take = Math.min(room, value);
        ship.hold += take;
        return take;
    }

    function holdFull(ship) {
        return ship.hold >= ship.holdMax - 0.5;
    }

    function collect(ship, p) {
        if (p.kind === "energy") {
            var mult = ship.isPlayer ? ship.stats.energyBonus : 1;
            var want = Math.round(p.value * mult);
            /* Half the value, or whatever fits - so a full hold still banks
             * the change rather than refusing the whole pickup. */
            var value = loadEnergy(ship, want);
            if (value <= 0) return false;
            if (ship.isPlayer) {
                world.events.push({ type: "pickup", kind: "energy", value: value, ship: ship });
            }
            floater(p.x, p.y, p.z + 10, "+" + value, S.COLORS.energy);
            explode(p.x, p.y, p.z, S.COLORS.energy, 4, "spark", 60);
            return true;
        }

        /* Crystals are banked, not carried: they go straight to the score
         * and can never be lost off a wreck. */
        ship.crystals += p.value;
        if (ship.isPlayer) {
            world.events.push({ type: "pickup", kind: "crystal", value: p.value, ship: ship });
        }
        floater(p.x, p.y, p.z + 10, "+" + p.value, S.COLORS.crystal);
        explode(p.x, p.y, p.z, S.COLORS.crystal, 4, "spark", 60);
        return true;
    }

    function stepParticles(dt) {
        var parts = world.particles;
        for (var i = 0; i < parts.length; i++) {
            var pt = parts[i];
            if (!pt.on) continue;
            pt.life -= dt;
            if (pt.life <= 0) { pt.on = false; continue; }
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.z += pt.vz * dt;
            var drag = Math.pow(0.12, dt);
            pt.vx *= drag;
            pt.vy *= drag;
            pt.vz *= drag;
        }
    }

    /* ===== Hazards =====
     * One function answers "how much hazard is this point in" and the
     * systems that care ask it. Putting the maths here means the player, the
     * NPCs, the renderer and the tests all agree about where the storm is.
     */
    function stepHazards(dt) {
        var hz = world.hazards;
        if (!hz || !hz.length) return;
        for (var i = 0; i < hz.length; i++) {
            var h = hz[i];
            h.strength = 0;

            if (h.kind === "storm") {
                /* Cyclic: a burst of ion storm every `period` seconds, with
                 * a short ramp so it is readable rather than a switch. */
                var period = h.cycle || 30;
                var activeFor = h.activeFor || 7;
                var t = (world.time + h.phase) % period;
                if (t < activeFor) {
                    var inRamp = Math.min(1, t / 0.9) * Math.min(1, (activeFor - t) / 1.2);
                    h.active = inRamp > 0.15;
                    h.strength = S.clamp(inRamp, 0, 1);
                } else {
                    h.active = false;
                }
                continue;
            }

            /* Wells and voids are static; only their intensity is animated so
             * the renderer has something to draw. */
            h.active = true;
            h.strength = 0.5 + 0.5 * Math.sin(world.time * 0.7 + h.phase);
        }
    }

    /* Combined strength of every hazard of `kind` covering a point. */
    function hazardAt(x, y, kind) {
        var hz = world.hazards;
        if (!hz || !hz.length) return 0;
        var total = 0;
        for (var i = 0; i < hz.length; i++) {
            var h = hz[i];
            if (h.kind !== kind) continue;
            var d2 = S.dist2(x, y, h.x, h.y);
            var r2 = h.r * h.r;
            if (d2 >= r2) continue;
            /* Falls off toward the rim so walking into a hazard feels like
             * walking into it rather than clipping a trigger. */
            var falloff = 1 - Math.sqrt(d2) / h.r;
            total = Math.max(total, falloff * (h.kind === "storm" ? h.strength : 1));
        }
        return S.clamp(total, 0, 1);
    }

    /* Hit marks age out on their own, so the indicator can never point at a
     * shot that landed half a minute ago. */
    function stepHitMarks() {
        for (var i = world.hitMarks.length - 1; i >= 0; i--) {
            if (world.time - world.hitMarks[i].t > HIT_MARK_TTL) world.hitMarks.splice(i, 1);
        }
    }

    function stepFloaters(dt) {
        for (var i = 0; i < world.floaters.length; i++) {
            var f = world.floaters[i];
            if (!f.on) continue;
            f.life -= dt;
            f.z += 26 * dt;
            if (f.life <= 0) f.on = false;
        }
    }

    /* Ship-vs-ship is a soft separation, not a crash: two hulls grinding
     * together shove each other apart instead of deleting a player. */
    function resolveShipCollisions() {
        var ships = world.ships;
        for (var i = 0; i < ships.length; i++) {
            var a = ships[i];
            if (!a.alive || a.docked) continue;
            for (var j = i + 1; j < ships.length; j++) {
                var b = ships[j];
                if (!b.alive || b.docked) continue;

                var min = a.radius + b.radius + 4;
                var dx = b.x - a.x, dy = b.y - a.y;
                var d2 = dx * dx + dy * dy;
                if (d2 >= min * min || d2 <= 0.0001) continue;

                var d = Math.sqrt(d2);
                var push = (min - d) * 0.5;
                var nx = dx / d, ny = dy / d;
                /* The player only gets nudged; NPCs take the full shove, so
                 * bumping a wall of raiders still moves you. */
                var wa = a.isPlayer ? 0.25 : 1;
                var wb = b.isPlayer ? 0.25 : 1;
                var sum = wa + wb || 1;
                a.x -= nx * push * 2 * (wa / sum);
                a.y -= ny * push * 2 * (wa / sum);
                b.x += nx * push * 2 * (wb / sum);
                b.y += ny * push * 2 * (wb / sum);
            }
        }
    }

    /* ===== Queries ===== */

    /* Nearest live ship to (x, y) that is not `self`, optionally filtered. */
    function nearestShip(x, y, self, maxDist, filter) {
        var best = null, bestD = maxDist * maxDist;
        for (var i = 0; i < world.ships.length; i++) {
            var s = world.ships[i];
            if (s === self || !s.alive || s.docked) continue;
            if (filter && !filter(s)) continue;
            var d2 = S.dist2(x, y, s.x, s.y);
            if (d2 < bestD) { bestD = d2; best = s; }
        }
        return best;
    }

    /* Anything shootable inside the aim cone - this is what makes one thumb
     * enough on a phone. */
    function coneTarget(ship, cone, range) {
        var best = null, bestScore = -Infinity;
        var range2 = range * range;
        for (var i = 0; i < world.ships.length; i++) {
            var s = world.ships[i];
            if (s === ship || !s.alive || s.docked) continue;
            var d2 = S.dist2(ship.x, ship.y, s.x, s.y);
            if (d2 > range2) continue;
            var a = Math.atan2(s.y - ship.y, s.x - ship.x);
            var off = Math.abs(S.angleDiff(ship.aim, a));
            if (off > cone) continue;
            /* Prefer centred, then close: a target dead ahead beats one at
             * the edge of the cone even if it is further away. */
            var score = (1 - off / cone) * 2 - Math.sqrt(d2) / range;
            if (score > bestScore) { bestScore = score; best = s; }
        }
        return best;
    }

    /* ===== Targeting =====
     * An explicit lock, separate from the aim assist. The assist picks
     * whatever is convenient this frame; the lock is the ship the player
     * chose and it survives losing the assist.
     */
    /* Hostility.
     *
     * Faction NPCs are hostile to everything, as always. Pilots are not:
     * they are working, and a map where five miners decide to lynch you on
     * sight is not a mining map. A pilot takes you on when you have hit it,
     * or when it is CLEARLY the stronger ship - two tiers, not one, because
     * at one tier every raider in the shallow sector outclasses a fresh
     * pilot and the intro stops being survivable.
     *
     * Pilots never chase: acquire() is range-bounded and nothing in the AI
     * paths toward the player, so being interesting buys you a fight, not a
     * chase. */
    function outclasses(a, b) {
        return a.tier >= b.tier + C.npc.pilotAggression;
    }

    function isHostileTo(ship, other) {
        if (!other || !other.alive) return false;
        /* Self-check first. Losing it is how a ship ends up trying to strafe
         * at its own position. */
        if (ship === other) return false;
        if (ship.isPlayer) return true;
        if (ship.isPilot) {
            /* Shot me, or I can take you. */
            if (other.provokedBy === ship.id || ship.provokedBy === other.id) return true;
            return outclasses(ship, other);
        }
        /* Not a pilot, so: faction war, plus the player, who is hostile to
         * everything. */
        if (other.isPlayer) return true;
        return S.factionHostile(ship.faction, other.faction);
    }

    /* Mark a pilot as having shot at somebody, so the pilot's own hostility
     * check can see it on the next think tick. Called from the hit paths,
     * which are the only place both ends of the shot are known. */
    function provoke(victim, shooter) {
        if (!victim || !victim.isPilot || !shooter) return;
        victim.provokedBy = shooter.id;
    }

    /* Nearest hostile to the player, optionally restricted to one faction. */
    function nearestHostile(from, maxDist, faction) {
        var best = null, bestD = maxDist * maxDist;
        for (var i = 0; i < world.ships.length; i++) {
            var s = world.ships[i];
            if (s === from || !s.alive || s.docked) continue;
            if (faction && s.faction !== faction) continue;
            var d2 = S.dist2(from.x, from.y, s.x, s.y);
            if (d2 < bestD) { bestD = d2; best = s; }
        }
        return best;
    }

    /* Cycle to the next hostile in range, ordered by bearing from the current
     * nose so the target moves the way the player is looking.
     *
     * Two guarantees, both of which the UI depends on: pressing cycle with
     * two or more hostiles in range always lands on a DIFFERENT one, and
     * pressing it with a single hostile leaves that hostile alone. Returning
     * the current lock from the wrap-around made the second press a no-op
     * whenever the sort happened to put the current target first. */
    function cycleTarget(from, maxDist) {
        if (!from) return null;
        var hostiles = [];
        var r2 = maxDist * maxDist;
        for (var i = 0; i < world.ships.length; i++) {
            var s = world.ships[i];
            if (s === from || !s.alive || s.docked) continue;
            var d2 = S.dist2(from.x, from.y, s.x, s.y);
            if (d2 > r2) continue;
            hostiles.push({ s: s, a: Math.atan2(s.y - from.y, s.x - from.x) });
        }
        if (!hostiles.length) return null;
        hostiles.sort(function (p, q) { return p.a - q.a; });

        var cur = world.target;
        if (!cur || cur === from || !cur.alive) return hostiles[0].s;
        var curA = Math.atan2(cur.y - from.y, cur.x - from.x);

        /* First pass: anything clockwise from the current lock. */
        for (var k = 0; k < hostiles.length; k++) {
            if (hostiles[k].s !== cur && S.angleDiff(curA, hostiles[k].a) > 0) {
                return hostiles[k].s;
            }
        }
        /* Wrapped past the end: restart from the beginning, still skipping
         * the current lock so the press is never swallowed. */
        for (k = 0; k < hostiles.length; k++) {
            if (hostiles[k].s !== cur) return hostiles[k].s;
        }
        /* Only one hostile in range: nothing to cycle to. */
        return cur;
    }

    function clearTarget() {
        world.target = null;
    }

    function inDockZone(x, y) {
        var r = C.world.dockRadius;
        return S.dist2(x, y, world.station.x, world.station.y) <= r * r;
    }

    /* Where a freshly launched ship should appear: a lane just outside the
     * station's clear radius, facing back toward it. */
    function launchPoint() {
        var a = Math.random() * Math.PI * 2;
        var r = C.world.clearRadius + 130 + Math.random() * 150;
        var dx = Math.cos(a), dy = Math.sin(a);
        return {
            x: S.clamp(world.station.x + dx * r, 90, world.size - 90),
            y: S.clamp(world.station.y + dy * r, 90, world.size - 90),
            /* Nose pointed back at the station you just undocked from. */
            heading: Math.atan2(-dy, -dx),
        };
    }

    /* A valid spawn point for an NPC: away from the station, away from the
     * player, not on top of another hull, and not inside a faction base. */
    function spawnPoint() {
        var size = world.size;
        var base = world.base;
        for (var i = 0; i < 40; i++) {
            var x = 90 + Math.random() * (size - 180);
            var y = 90 + Math.random() * (size - 180);
            if (S.dist2(x, y, world.station.x, world.station.y) <
                C.world.clearRadius * C.world.clearRadius) continue;
            if (world.player &&
                S.dist2(x, y, world.player.x, world.player.y) < 420 * 420) continue;
            /* Spawning inside a 300-unit structure would put a pilot inside
             * a wall of geometry with no way to tell what happened. */
            if (base && base.alive) {
                var br = base.r + 140;
                if (S.dist2(x, y, base.x, base.y) < br * br) continue;
            }

            var clash = false;
            for (var j = 0; j < world.ships.length; j++) {
                if (S.dist2(x, y, world.ships[j].x, world.ships[j].y) < 220 * 220) { clash = true; break; }
            }
            if (clash) continue;
            return { x: x, y: y };
        }
        return { x: size * 0.5, y: 120 };
    }

    function clearAll() {
        world.ships.length = 0;
        world.events.length = 0;
        world.player = null;
        world.target = null;
        for (var i = 0; i < world.bullets.length; i++) world.bullets[i].on = false;
        for (var ai = 0; ai < world.ammo.length; ai++) world.ammo[ai].on = false;
        for (var mi = 0; mi < world.missiles.length; mi++) world.missiles[mi].on = false;
        for (var ni = 0; ni < world.mines.length; ni++) world.mines[ni].on = false;
        for (var j = 0; j < world.pickups.length; j++) world.pickups[j].on = false;
        for (var k = 0; k < world.particles.length; k++) world.particles[k].on = false;
        for (var m = 0; m < world.floaters.length; m++) world.floaters[m].on = false;
    }

    S.World = {
        world: world,
        generate: generate,
        step: step,
        spawnShip: spawnShip,
        removeShip: removeShip,
        moveShip: moveShip,
        fire: fire,
        fireAmmo: fireAmmo,
        fireMissiles: fireMissiles,
        dropMine: dropMine,
        damageShip: damageShip,
        damageBase: damageBase,
        activateCpu: activateCpu,
        cpuActive: cpuActive,
        applyLeech: applyLeech,
        killPlayer: killPlayer,
        killShip: killShip,
        dropPickup: dropPickup,
        explode: explode,
        floater: floater,
        nearestShip: nearestShip,
        coneTarget: coneTarget,
        isHostileTo: isHostileTo,
        provoke: provoke,
        outclasses: outclasses,
        nearestHostile: nearestHostile,
        cycleTarget: cycleTarget,
        clearTarget: clearTarget,
        loadEnergy: loadEnergy,
        holdFull: holdFull,
        inDockZone: inDockZone,
        hitMarkTtl: function () { return HIT_MARK_TTL; },
        hazardAt: hazardAt,
        launchPoint: launchPoint,
        spawnPoint: spawnPoint,
        clearAll: clearAll,
    };

})(window.S7 = window.S7 || {});