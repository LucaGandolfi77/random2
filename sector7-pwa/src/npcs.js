/*
 * SECTOR 7 - NPC pilots.
 *
 * A four-state machine per ship: patrol, hunt, attack, flee. NPCs fight the
 * player and each other, so the sector keeps moving even when you are docked
 * and the whole economy circulates instead of piling loot in one corner.
 *
 * The tier roll is weighted by the player's banked crystals, which is the
 * escalation dial: earning crystals genuinely raises the sector's ceiling.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    var state = {
        spawnTimer: 1.0,
        thinkTimer: 0,
        rng: null,
    };

    function clear() {
        state.spawnTimer = 1.0;
        state.thinkTimer = 0;
        state.rng = Math.random;
    }

    function resetRng(seed) {
        state.rng = S.mulberry32(S.hashString("npc:" + seed));
    }

    /* ===== Spawning ===== */

    function npcCount() {
        var n = 0;
        var ships = S.World.world.ships;
        for (var i = 0; i < ships.length; i++) if (!ships[i].isPlayer) n++;
        return n;
    }

    /* Weighted roll over tiers 1..cap. Higher tiers are rarer, and the cap
     * climbs with the player's lifetime crystals. */
    function rollTier(cap) {
        var total = 0;
        var weights = [];
        for (var t = 1; t <= cap; t++) {
            var w = 1 / Math.pow(t, 1.25);
            weights.push(w);
            total += w;
        }
        var r = state.rng() * total;
        for (var i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0) return i + 1;
        }
        return 1;
    }

    function spawnOne(player) {
        var W = S.World.world;
        var cap = Math.min(
            W.tierCap || C.npc.maxTier,
            S.tierForCrystals(player ? player.crystals : 0));
        var tier = rollTier(cap);
        var def = S.NPC_TIERS[tier];

        var roster = W.roster;
        var who = roster[(state.rng() * roster.length) | 0];

        var pt = S.World.spawnPoint();
        var ship = S.World.spawnShip({
            name: who.name,
            color: who.color,
            tier: tier,
            x: pt.x,
            y: pt.y,
            z: 8 + state.rng() * 14,
            heading: state.rng() * Math.PI * 2,
            maxHull: def.hull,
            stats: {
                damage: def.damage,
                fireInterval: def.fire,
                speed: def.speed * (W.sector ? W.sector.npcSpeed : 1),
                turn: def.turn,
                maxHull: def.hull,
                regen: 0,
                /* Mirrors the player's missile curve, softened by tier so a
                 * warlord's salvo hurts without deleting a fresh ship. */
                missiles: tier >= 5 ? Math.max(1, Math.round(tier / 2)) : 0,
                missileDamage: def.damage * 2.4,
                missileCooldown: 5.5,
                mineCapacity: tier >= 3 ? 1 : 0,
                mineDamage: def.damage * 3.2,
                mineRadius: 90,
                mineCooldown: 6,
            },
            reduction: 0,
            radius: def.hull_px,
            phase: who.phase,
        });

        /* Personality travels with the pilot, so the same named raider
         * always fights the same way. */
        ship.skill = who.skill;
        ship.greed = who.greed;
        ship.aimError = def.aim * (1.25 - who.skill * 0.6);
        ship.patrol = { a: state.rng() * Math.PI * 2, r: 0 };
        ship.state = "patrol";
        ship.target = null;
        return ship;
    }

    function spawnAll(player) {
        var n = Math.floor(C.npc.maxAlive * 0.8);
        for (var i = 0; i < n; i++) spawnOne(player);
    }

    function think(dt) {
        var W = S.World.world;
        state.thinkTimer -= dt;

        if (state.spawnTimer > 0) {
            state.spawnTimer -= dt;
        } else if (npcCount() < (W.npcMax || C.npc.maxAlive)) {
            spawnOne(W.player);
            state.spawnTimer = C.npc.spawnInterval * (0.6 + state.rng() * 0.9);
        }

        if (state.thinkTimer > 0) return;
        state.thinkTimer = C.npc.thinkInterval;

        /* Thinking is staggered: every pilot re-decides on the same tick
         * would make the whole fleet turn in unison. */
        for (var i = 0; i < W.ships.length; i++) {
            var s = W.ships[i];
            if (s.isPlayer) continue;
            decide(s);
        }
    }

    /* ===== Decisions =====
     * Run 9x a second, not every frame. Cheap per-pilot intent, then the
     * shared integrator smooths it out over the frames in between.
     */
    function decide(ship) {
        var W = S.World.world;
        var def = S.NPC_TIERS[ship.tier];
        var hullFrac = ship.hull / ship.maxHull;

        /* A damaged pilot that can still reach help disengages instead of
         * dying - otherwise every fight ends with both hulls at zero and
         * the kills stop meaning anything. */
        if (hullFrac < C.npc.fleeHullFrac) {
            ship.state = "flee";
            ship.fleeFor += C.npc.thinkInterval;
        } else if (ship.fleeFor > 0) {
            ship.fleeFor = Math.max(0, ship.fleeFor - C.npc.thinkInterval * 2);
        }

        var acquired = acquire(ship, def);

        if (ship.state !== "flee" && !acquired) {
            ship.state = "patrol";
            ship.target = null;
        } else if (ship.state !== "flee" && acquired) {
            ship.state = "attack";
        }

        if (ship.state === "patrol") pickPatrol(ship);
    }

    /* Pick something worth shooting. Weak hulls on anything are priority
     * targets, which is what makes a crowded sector self-sorting. */
    function acquire(ship, def) {
        var W = S.World.world;
        /* Bounded by what the camera can actually show (CONFIG.camera
         * .viewSpan). An NPC that commits from further away than you can see
         * is just incoming damage with no counterplay. */
        var range = S.aggroRange(ship.tier);
        var best = null;
        var bestScore = -Infinity;

        for (var i = 0; i < W.ships.length; i++) {
            var s = W.ships[i];
            if (s === ship || !s.alive || s.docked) continue;

            var d = Math.sqrt(S.dist2(ship.x, ship.y, s.x, s.y));
            if (d > range) continue;

            /* Cheap ships do not pick fights with the local warlord. */
            var canFight = (d > 260) || ship.tier + 1 >= s.tier || state.rng() < ship.skill;
            if (!canFight) continue;

            var score = -d * 0.01 + (1 - s.hull / s.maxHull) * 2.4;
            if (s.isPlayer) score += 0.6;
            if (score > bestScore) { bestScore = score; best = s; }
        }

        ship.target = best;
        return !!best;
    }

    /* Loose circular patrol: pick an angle on a ring around the station and
     * drift along it. Slow enough to be interceptable, varied enough that a
     * sector never feels like a racetrack. */
    function pickPatrol(ship) {
        if (!ship.patrol) ship.patrol = { a: 0, r: 0 };
        if (state.rng() < 0.22) {
            ship.patrol.a = state.rng() * Math.PI * 2;
            ship.patrol.r = 900 + state.rng() * (S.World.world.size * 0.36);
        }
        var st = S.World.world.station;
        ship.patrolX = st.x + Math.cos(ship.patrol.a) * ship.patrol.r;
        ship.patrolY = st.y + Math.sin(ship.patrol.a) * ship.patrol.r;
    }

    /* ===== Steering ===== */

    function update(dt) {
        var W = S.World.world;

        for (var i = 0; i < W.ships.length; i++) {
            var ship = W.ships[i];
            if (ship.isPlayer || !ship.alive || ship.docked) continue;

            switch (ship.state) {
                case "attack": driveAttack(ship, dt); break;
                case "flee": driveFlee(ship, dt); break;
                default: drivePatrol(ship, dt); break;
            }
        }
    }

    function turnTo(ship, want, dt, rate) {
        /* An ion storm in KESTREL makes the stick lie. Pilots fight it worse
         * the more they're upgraded, which reads as storm interference rather
         * than as a slower ship. */
        var storm = S.World.hazardAt(ship.x, ship.y, "storm");
        if (storm > 0) {
            want += Math.sin(S.World.world.time * 5.5 + ship.wanderPhase * 3.1) * storm * 1.5;
        }
        var k = S.clamp(1 - Math.pow(0.0008, dt * ship.stats.turn * rate), 0, 1);
        ship.heading = S.lerpAngle(ship.heading, want, k);
    }

    function drivePatrol(ship, dt) {
        if (ship.patrolX === undefined) pickPatrol(ship);
        ship.wobble += dt;
        var want = Math.atan2(
            ship.patrolY - ship.y + Math.sin(ship.wobble * 0.5 + ship.wanderPhase) * 180,
            ship.patrolX - ship.x + Math.cos(ship.wobble * 0.37 + ship.wanderPhase) * 180
        );
        turnTo(ship, want, dt, 0.3);
        ship.throttle = 0.55;
        /* Idle sweep: a patrol that never fires at all looks like scenery. */
        if (ship.target && Math.random() < 0.3) shootAt(ship);
    }

    function driveAttack(ship, dt) {
        useHeavyWeapons(ship);
        var t = ship.target;
        if (!t || !t.alive || t.docked) {
            ship.state = "patrol";
            ship.target = null;
            return;
        }

        var dx = t.x - ship.x, dy = t.y - ship.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var toTarget = Math.atan2(dy, dx);

        /* Strafe: hold a band around preferredRange and slide along it. The
         * tangential term is what stops every NPC flying in straight lines
         * at each other. */
        var desired = C.npc.preferredRange + (ship.tier % 3) * 28;
        var radial = (d - desired) / Math.max(d, 1);
        var tangent = S.angleDiff(toTarget, ship.heading) > 0 ? -1 : 1;
        var strafe = S.clamp(radial, -1, 1) * 0.9 + tangent * 0.42;
        var want = toTarget + S.clamp(strafe, -1.2, 1.2) * (d < desired ? -0.9 : 0.55);

        turnTo(ship, want, dt, 0.42);
        ship.throttle = d < desired * 0.65 ? 0.85 : 0.6;

        ship.aim = S.lerpAngle(ship.aim, toTarget, S.damp(dt, 0.09));
        shootAt(ship);
    }

    function driveFlee(ship, dt) {
        ship.wobble += dt;
        /* Run for open space, not back toward the last threat. */
        var away = Math.atan2(ship.y - S.World.world.station.y, ship.x - S.World.world.station.x);
        if (ship.target) {
            away = Math.atan2(ship.y - ship.target.y, ship.x - ship.target.x);
        }
        var want = away + Math.sin(ship.wobble * 1.6 + ship.wanderPhase) * 0.6;
        turnTo(ship, want, dt, 0.5);
        ship.throttle = 1;

        /* Kept shooting over its shoulder, so fleeing is not a free escape. */
        useHeavyWeapons(ship);
        if (ship.target && ship.target.alive) shootAt(ship);
        if (ship.fleeFor > 6) {
            ship.fleeFor = 0;
            ship.state = "patrol";
        }
    }

    /* Higher tiers carry missiles and lay mines, so the new tools appear on
     * the hostile side of the fight and not only in the player's hands. */
    function useHeavyWeapons(ship) {
        if (ship.tier < 5) return;
        if (ship.target && ship.target.alive && ship.cooldownMissiles <= 0) {
            S.World.fireMissiles(ship, [ship.target], 0);
        }
        /* Fleeing is exactly when a mine is worth its cooldown. */
        if (ship.state === "flee" && ship.tier >= 3 && ship.cooldownMine <= 0) {
            S.World.dropMine(ship);
        }
    }

    function shootAt(ship) {
        if (ship.cooldown > 0) return;
        var t = ship.target;
        if (!t || !t.alive) return;

        var toTarget = Math.atan2(t.y - ship.y, t.x - ship.x);
        /* A fixed aim error that shrinks with skill. Tier is the floor: even
         * a max-skill raider misses, or the top tiers would be trivial. */
        var err = (ship.aimError || 0.2) * (Math.random() * 2 - 1);
        S.World.fire(ship, toTarget + err);
    }

    S.NPCs = {
        clear: clear,
        resetRng: resetRng,
        think: think,
        update: update,
        spawnAll: spawnAll,
        spawnOne: spawnOne,
        npcCount: npcCount,
    };

})(window.S7 = window.S7 || {});