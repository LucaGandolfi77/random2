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
        pilotTimer: 6,
        thinkTimer: 0,
        rng: null,
    };

    function clear() {
        state.spawnTimer = 1.0;
        state.pilotTimer = 6;
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
        /* Pilots are counted separately: a map with five miners on it is
         * not a map with eighteen hostiles, and the population cap is a
         * balance number for hostiles. */
        for (var i = 0; i < ships.length; i++) {
            if (!ships[i].isPlayer && !ships[i].isPilot) n++;
        }
        return n;
    }

    function pilotCount() {
        var n = 0;
        var ships = S.World.world.ships;
        for (var i = 0; i < ships.length; i++) if (ships[i].isPilot) n++;
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

    function spawnOne(player, forceFaction) {
        var W = S.World.world;
        var cap = Math.min(
            W.tierCap || C.npc.maxTier,
            S.tierForCrystals(player ? player.crystals : 0));
        var tier = rollTier(cap);
        var def = S.NPC_TIERS[tier];

        var roster = W.roster;
        var who = roster[(state.rng() * roster.length) | 0];
        /* The roster seeds a *bias*; the tier mix decides the actual faction,
         * so a named raider can turn up Demaner in the deep sectors and
         * pirate in the shallow ones without losing who it is.
         * `forceFaction` is how a faction base calls its own defenders:
         * the Hive does not send you raiders. */
        var fac = forceFaction
            ? S.faction(forceFaction)
            : S.pickFaction(tier, state.rng);

        /* Faction identity is three multipliers on top of the tier table.
         * A Drone is a paper hull that hits softly and moves fast; a Hive is
         * a fortress that barely turns. The tier keeps its own progression,
         * so difficulty still climbs with the sector - the faction only
         * decides what kind of problem it is. */
        var hull = Math.max(8, Math.round(def.hull * fac.hullMul));
        var damage = def.damage * fac.dmgMul;
        var shieldPool = S.npcShieldFor(hull, fac.key);
        var missileDmg = damage * 2.4;
        var mineDmg = damage * 3.2;
        var ammoDmg = damage * 2.8;

        var pt = S.World.spawnPoint();
        var ship = S.World.spawnShip({
            name: who.name,
            color: fac.color,
            faction: fac.key,
            tier: tier,
            x: pt.x,
            y: pt.y,
            z: 8 + state.rng() * 14,
            heading: state.rng() * Math.PI * 2,
            maxHull: hull,
            maxShield: shieldPool,
            stats: {
                damage: damage,
                blasterPacket: S.packet("blaster", damage),
                fireInterval: def.fire,
                speed: def.speed * fac.speedMul * (W.sector ? W.sector.npcSpeed : 1),
                turn: def.turn,
                maxHull: hull,
                maxShield: shieldPool,
                shieldRegen: 0,
                regen: 0,
                holdMax: 200,
                /* Mirrors the player's missile curve, softened by tier so a
                 * warlord's salvo hurts without deleting a fresh ship. */
                missiles: tier >= 5 ? Math.max(1, Math.round(tier / 2)) : 0,
                missileDamage: missileDmg,
                missilePacket: S.packet("missile", missileDmg),
                missileCooldown: 5.5,
                /* The capacitor round only turns up on the upper tiers, which
                 * is what makes a shielded elite feel shielded. */
                ammoDamage: ammoDmg,
                ammoPacket: S.packet("ammo", ammoDmg),
                ammoCooldown: 3.2,
                mineCapacity: tier >= 3 ? 1 : 0,
                mineDamage: mineDmg,
                minePacket: S.packet("mine", mineDmg),
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
        /* A swarm pilot does not run: the whole threat is that they keep
         * arriving. A kite pilot holds a band far wider than anyone else. */
        ship.fleeAt = fac.ai === "swarm" ? 0 : C.npc.fleeHullFrac;
        ship.range = fac.ai === "kite" ? 340
            : fac.ai === "wall" ? 210
            : fac.ai === "boss" ? 260
            : C.npc.preferredRange;
        return ship;
    }

    /* ===== Pilots =====
     * Other ships, not another mob. They fly hulls you could buy, they wear a
     * pilot's colour, and they spend their time doing the one thing that
     * makes a mining game a mining game: mining the same rocks you are.
     *
     * They are never in world.ships' way of the hostile budget, and they
     * are never counted by npcCount() - a map with five miners on it is not
     * a map with eighteen hostiles.
     */
    function spawnPilots(player, n) {
        var W = S.World.world;
        var made = [];
        var count = Math.max(0, n === undefined ? C.npc.pilots : n);

        for (var i = 0; i < count; i++) {
            /* They are built from the real hull table, so a pilot flying a
             * Wasp is genuinely a Wasp with a Wasp's hold, and a pilot on a
             * Hauler really does go home with a mountain. */
            var hull = S.HULLS[(state.rng() * S.HULLS.length) | 0];
            var fit = {};
            for (var s = 0; s < S.HULL_SLOTS.length; s++) {
                var slot = S.HULL_SLOTS[s];
                var opts = S.partsForSlot(slot);
                var pick = opts[(state.rng() * opts.length) | 0];
                /* Component level is cosmetic here - it does not touch the
                 * numbers - but it is honest about the ship looking fitted. */
                fit[slot] = { key: pick.key, level: 1 + Math.floor(state.rng() * 4) };
            }

            /* A pilot flies a mid build, not a fresh one. A level-1 pilot is
             * a miner who dies to the first raider and never gets to fill a
             * hold. */
            var lv = { blaster: 3 + Math.floor(state.rng() * 4) };
            lv.ammo = 2 + Math.floor(state.rng() * 3);
            lv.shield = 3 + Math.floor(state.rng() * 4);
            lv.armor = 2 + Math.floor(state.rng() * 3);
            lv.thruster = 3 + Math.floor(state.rng() * 4);
            lv.cargo = 3 + Math.floor(state.rng() * 4);
            lv.processor = 2 + Math.floor(state.rng() * 3);
            lv.missiles = 1;
            lv.mines = 1;

            var stats = S.statsFor(lv, {}, fit, hull.id);
            var pt = S.World.spawnPoint();
            var roster = W.roster;
            var who = roster[(state.rng() * roster.length) | 0];

            var ship = S.World.spawnShip({
                name: S.randomCallsign(state.rng),
                color: S.PILOT_COLORS[(state.rng() * S.PILOT_COLORS.length) | 0],
                faction: "pogo",
                tier: S.tierForShip(lv),
                x: pt.x,
                y: pt.y,
                z: 10,
                heading: state.rng() * Math.PI * 2,
                maxHull: stats.maxHull,
                maxShield: stats.maxShield,
                holdMax: stats.holdMax,
                stats: stats,
                reduction: stats.reduction,
                radius: 15,
                phase: who.phase,
            });

            ship.isPilot = true;
            ship.hullId = hull.id;
            ship.hullDef = hull;
            ship.parts = fit;
            ship.energy = stats.holdMax;
            /* Pilots work the same loop: out to a rock, fill the hold, come
             * home. `work` is the default so a fresh pilot is already doing
             * something rather than drifting. */
            ship.state = "work";
            ship.rock = null;
            ship.provokedBy = 0;
            /* Both of these are timers the pilot loop reads every frame, so
             * they have to start at a number and not at undefined: `NaN - dt`
             * stays NaN, and `NaN <= 0` is false, which is a mining bot that
             * flies to a rock and then sits there forever doing nothing. */
            ship.mineTimer = state.rng() * C.npc.mineTime;
            ship.bankFor = 0;
            ship.skill = 0.4 + state.rng() * 0.4;
            ship.aimError = 0.14;
            ship.range = C.npc.preferredRange;
            /* A miner who gets hit shoots back - and then leaves. Civilians
             * do not press an attack, and this is what makes provoking one
             * survivable: without it, five pilots you annoyed at once is a
             * gang fight you cannot win and did not ask for. */
            ship.fleeAt = 0.45;
            made.push(ship);
        }
        return made;
    }

    /* Nearest rock worth cutting, with a standing preference for the ones
     * holding a crystal cache. A pilot that only ever mined empty rocks would
     * be scenery. */
    function findRock(ship) {
        var rocks = S.World.world.rocks;
        var best = null, bestD = C.npc.mineRange * C.npc.mineRange * 36;
        var fallback = null, fbD = bestD;
        for (var i = 0; i < rocks.length; i++) {
            var r = rocks[i];
            if (!r.alive) continue;
            var d = S.dist2(ship.x, ship.y, r.x, r.y);
            if (r.rich) {
                if (d < bestD) { bestD = d; best = r; }
            } else if (d < fbD) {
                fbD = d; fallback = r;
            }
        }
        return best || fallback;
    }

    /* Out to a rock and cut it. This is the whole point of the class: it
     * makes the rock field a contested resource instead of scenery. */
    function driveWork(ship, dt) {
        /* Defensive: a pilot that entered this state by any route other than
         * spawnPilots still needs a numeric timer. */
        if (!Number.isFinite(ship.mineTimer)) ship.mineTimer = 0;
        var rock = ship.rock && ship.rock.alive ? ship.rock : findRock(ship);
        if (!rock) {
            /* Field is bare. Idle rather than hunt: a pilot with nothing to
             * mine should wander, not pick a fight it did not ask for. */
            drivePatrol(ship, dt);
            return;
        }
        ship.rock = rock;

        var dx = rock.x - ship.x, dy = rock.y - ship.y;
        var d = Math.sqrt(dx * dx + dy * 0.62 * dy) || 1;
        var want = Math.atan2(dy, dx);
        turnTo(ship, want, dt, 0.36);
        ship.throttle = d > C.npc.mineRange * 0.75 ? 0.95 : 0.3;
        ship.aim = S.lerpAngle(ship.aim, want, S.damp(dt, 0.1));

        /* Cut it while sitting on top of it, so a pilot's arrival actually
         * changes the map rather than hovering at the edge of its range. */
        ship.mineTimer -= dt;
        if (d < C.npc.mineRange && ship.mineTimer <= 0) {
            ship.mineTimer = C.npc.mineTime;
            /* Flagged as mining: see World.fire. A round aimed at a rock is
             * not a round aimed at whoever flies past. */
            S.World.fire(ship, ship.aim + (state.rng() * 2 - 1) * 0.08, { mining: true });
        }

        if (ship.hold >= ship.holdMax - 1) ship.state = "bank";
    }

    /* Home, unload, back out. The energy lands on the pilot, not on the
     * ground: this is a closed loop, and the map stays a level the player can
     * keep coming back to. */
    function driveBank(ship, dt) {
        var st = S.World.world.station;
        var dx = st.x - ship.x, dy = st.y - ship.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var want = Math.atan2(dy, dx);
        turnTo(ship, want, dt, 0.42);
        ship.throttle = d > C.npc.dockRange * 0.6 ? 1 : 0.2;

        if (d < C.npc.dockRange) {
            var paid = Math.floor(ship.hold);
            ship.hold = 0;
            ship.energy += paid;
            ship.rock = null;
            ship.state = "work";
        }
        /* Never stuck: if the bank takes too long, go back to work with
         * whatever is aboard rather than orbiting the station forever. */
        ship.bankFor = (ship.bankFor || 0) + dt;
        if (ship.bankFor > 45) {
            ship.bankFor = 0;
            ship.hold = 0;
            ship.state = "work";
        }
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

        /* Pilots top themselves up slowly and separately, so a map that has
         * been shot through for five minutes still has somebody mining. */
        state.pilotTimer -= dt;
        if (state.pilotTimer <= 0) {
            state.pilotTimer = 6;
            if (pilotCount() < pilotBudget() && W.player) {
                spawnPilots(W.player, 1);
            }
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
         * the kills stop meaning anything. A swarm does not: the whole
         * threat of a Drone wave is that it never breaks off. */
        var fleeAt = ship.fleeAt === undefined ? C.npc.fleeHullFrac : ship.fleeAt;
        if (fleeAt > 0 && hullFrac < fleeAt) {
            ship.state = "flee";
            ship.fleeFor += C.npc.thinkInterval;
        } else if (ship.fleeFor > 0) {
            ship.fleeFor = Math.max(0, ship.fleeFor - C.npc.thinkInterval * 2);
        }

        var acquired = acquire(ship, def);

        if (ship.state !== "flee") {
            if (acquired) {
                ship.state = "attack";
            } else if (ship.state === "attack") {
                /* Nothing to shoot: a pilot goes back to work, anyone else
                 * goes back to patrolling. A miner that abandoned its trade
                 * to chase would just be a pirate with a smaller gun. */
                ship.state = ship.isPilot ? "work" : "patrol";
                ship.target = null;
            }
        }

        if (ship.state === "patrol") pickPatrol(ship);
    }

    /* How many pilots a map gets. Scaled by the tier cap rather than flat,
     * because the pilot count is a difficulty dial: five miners working a
     * shallow sector is more crossfire than the intro is tuned for, and five
     * in a gravity well is atmosphere. */
    function pilotBudget() {
        var cap = S.World.world.tierCap || C.npc.maxTier;
        return S.clamp(Math.round(2 + cap * 0.45), 2, C.npc.pilots);
    }

    function spawnAll(player) {
        var n = Math.floor(C.npc.maxAlive * 0.8);
        for (var i = 0; i < n; i++) spawnOne(player);
        spawnPilots(player, pilotBudget());
    }

    /* Pick something worth shooting. Weak hulls on anything are priority
     * targets, which is what makes a crowded sector self-sorting.
     *
     * A pilot will happily open fire on a *different* faction: the six are
     * mutually hostile, so a quiet corner of the map runs its own war while
     * you are docked, and the kill feed has something true to say when you
     * fly back in. */
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
            /* A cloaked ship cannot be acquired. The NPC forgets it on the
             * next think tick, which is where an existing fight is broken
             * too - the cloak does not have to be fired at the moment the
             * fight starts to be worth having. */
            if (S.World.isCloaked(s)) continue;
            /* Mutually hostile factions, plus the player, who is hostile to
             * everything. */
            if (!S.World.isHostileTo(ship, s)) continue;

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
                case "work": driveWork(ship, dt); break;
                case "bank": driveBank(ship, dt); break;
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
        useAmmo(ship);
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
         * at each other.
         *
         * A KITE holds a much wider band and leans hard into the retreat,
         * which is what makes it feel like it is fighting at the far edge of
         * its range rather than closing. */
        var band = ship.range || C.npc.preferredRange;
        var desired = band + (ship.tier % 3) * 28;
        var radial = (d - desired) / Math.max(d, 1);
        var tangent = S.angleDiff(toTarget, ship.heading) > 0 ? -1 : 1;
        var strafe = S.clamp(radial, -1, 1) * 0.9 + tangent * 0.42;
        var breakHard = band >= 340 ? -1.25 : 0.55;
        var want = toTarget + S.clamp(strafe, -1.2, 1.2) * (d < desired ? -0.9 : breakHard);

        turnTo(ship, want, dt, 0.42);
        /* A kite spends its throttle running, not closing. */
        ship.throttle = d < desired * 0.65 ? 0.85
            : (ship.range || 0) >= 340 ? 1 : 0.6;

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
        useAmmo(ship);
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

    /* The capacitor round, spent deliberately: an NPC only looses one at a
     * target that actually has shields left to chew. Firing it at a bare
     * raider would make the enemy smarter than the player about it. */
    function useAmmo(ship) {
        if (ship.tier < 4 || ship.cooldownAmmo > 0) return;
        var t = ship.target;
        if (!t || !t.alive || t.docked) return;
        if (!t.maxShield || t.shield <= t.maxShield * 0.1) return;
        S.World.fireAmmo(ship, Math.atan2(t.y - ship.y, t.x - ship.x));
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
        spawnPilots: spawnPilots,
        npcCount: npcCount,
        pilotCount: pilotCount,
        /* A base calls its OWN defenders out when you first hit it. The Hive
         * does not send raiders, which is why this takes the faction rather
         * than going back through the tier mix. */
        callDefenders: function (base, n) {
            var out = [];
            for (var i = 0; i < n; i++) out.push(spawnOne(S.World.world.player, base.faction));
            return out;
        },
    };

})(window.S7 = window.S7 || {});