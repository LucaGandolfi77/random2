/*
 * SECTOR 7 - the player ship.
 *
 * Reads Input, writes intent onto the ship, and owns the docking state
 * machine. World.moveShip / World.fire do the physics and the shooting, so
 * the player and the NPCs travel through exactly the same code.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    var player = {
        docked: false,
        dockProgress: 0,
        dockReady: false,
        undockLock: 0,
        firingWas: false,
    };

    function create(save) {
        var hull = S.hull(save.hullId);
        /* The hull sets the ship's paint. It is the only thing about the
         * silhouette that is not derivable from stats, and having it read
         * wrong on the minimap would undercut the whole point of choosing. */
        var stats = S.statsFor(save.modules, save.refits, save.parts, save.hullId);
        var ship = S.World.spawnShip({
            isPlayer: true,
            name: save.name || "YOU",
            color: hull.color,
            faction: "you",
            maxHull: stats.maxHull,
            maxShield: stats.maxShield,
            holdMax: stats.holdMax,
            stats: stats,
            reduction: stats.reduction,
            radius: 16,
            energy: save.energy,
            z: 12,
            invuln: C.player.invulnOnSpawn,
        });

        ship.modules = save.modules;
        ship.crystals = save.crystals;
        /* The live ship carries its refits and sector: the death path needs
         * them and reaching into storage from world.js would be a layering
         * violation. */
        ship.refits = save.refits || { crystals: 0 };
        ship.sector = S.World.world.sectorId;
        ship.cpus = save.cpus || {};
        ship.cpu = ship.cpus[save.cpu] ? save.cpu : null;
        /* Hangar: which hull, which components. statsFor already folded both
         * into the numbers above. */
        ship.hangar = save.hangar || null;
        ship.hullId = save.hullId || hull.id;
        /* `hullDef`, NOT `hull`: `ship.hull` is the armour pool everywhere
         * in the codebase and overwriting it with a definition object would
         * turn the health bar into NaN the moment anything read it. */
        ship.hullDef = S.hull(ship.hullId);
        ship.parts = save.parts || {};
        ship.stats = S.shipStats(ship);
        ship.reduction = ship.stats.reduction;
        ship.maxHull = ship.stats.maxHull;
        ship.maxShield = ship.stats.maxShield;
        ship.holdMax = ship.stats.holdMax;
        ship.shield = ship.maxShield;
        ship.hull = ship.maxHull;
        /* The hold always launches empty. Anything left in it was energy you
         * never docked, so it died with the ship - carrying it forward would
         * be a free re-roll on the worst possible moment. */
        ship.hold = 0;
        ship.lastDeposit = 0;

        var lp = S.World.launchPoint();
        ship.x = lp.x;
        ship.y = lp.y;
        ship.heading = lp.heading;
        ship.aim = lp.heading;

        S.World.world.player = ship;
        S.World.clearTarget();
        reset();
        return ship;
    }

    function reset() {
        player.docked = false;
        player.dockProgress = 0;
        player.dockReady = false;
        player.undockLock = 0;
        player.firingWas = false;
        player.lastCpuKey = null;
    }

    /* The blaster is a turret, not a gun bolted to the nose: it will swing
     * round to a target behind you, but only within this arc. Past that it
     * would spin the muzzle through the hull every time you turned. */
    var AIM_SWING = 2.2;

    function steer(dt, ship, st) {
        if (st.mag > 0.12) {
            var want = Math.atan2(st.my, st.mx);

            /* Ion storm: the stick fights you. Deliberately applied to the
             * heading and never to the throttle, so a storm costs you
             * control of your direction but never strands you in place. */
            var storm = S.World.hazardAt(ship.x, ship.y, "storm");
            if (storm > 0) {
                want += Math.sin(S.World.world.time * 4.7 + 1.3) * storm * 1.35 +
                    Math.sin(S.World.world.time * 11.3) * storm * 0.6;
            }
            /* Turn rate is a real stat, so a Thruster upgrade makes the ship
             * handle, not just travel faster. */
            var rate = 1 - Math.pow(0.0009, dt * ship.stats.turn * 0.34);
            ship.heading = S.lerpAngle(ship.heading, want, S.clamp(rate, 0, 1));
            ship.throttle = S.lerp(ship.throttle, S.clamp(st.mag, 0, 1), S.damp(dt, 0.09));
        } else {
            ship.throttle = S.lerp(ship.throttle, 0, S.damp(dt, 0.14));
        }
    }

    /* An explicit lock wins over the soft assist. The assist is a convenience
     * that re-picks every frame; the lock is a decision, so it is the one
     * that gets to move the turret - as long as the target is still there and
     * still inside the turret arc. */
    function aim(dt, ship, st, assist) {
        var base = ship.heading;
        var locked = S.World.world.target;
        var target = null;

        if (locked && locked.alive && !locked.docked && locked !== ship) {
            /* Drop the lock rather than swing the muzzle through the hull to
             * reach something behind you. */
            var toLocked = Math.atan2(locked.y - ship.y, locked.x - ship.x);
            if (Math.abs(S.angleDiff(base, toLocked)) <= AIM_SWING) target = locked;
        }
        if (!target && assist) {
            target = S.World.coneTarget(ship, C.combat.aimCone, C.combat.aimAssistRange);
        }

        if (target) {
            var want = Math.atan2(target.y - ship.y, target.x - ship.x);
            var off = S.clamp(S.angleDiff(base, want), -AIM_SWING, AIM_SWING);
            ship.aim = S.lerpAngle(ship.aim, base + off, S.damp(dt, 0.055));
            ship.lockTarget = target;
        } else {
            ship.aim = S.lerpAngle(ship.aim, base, S.damp(dt, 0.06));
            ship.lockTarget = null;
        }
    }

    /* Out-of-combat trickle-back. Only after a real lull, so you cannot
     * out-trade a firefight by simply holding still in it. */
    function regen(dt, ship) {
        if (ship.hull >= ship.maxHull) return;
        if (ship.idleFor < 4) return;
        /* VANTA's dead nebulae eat your shields entirely. Out there, a hull is
         * something you buy with crystals rather than something that comes
         * back on its own. */
        if (S.World.hazardAt(ship.x, ship.y, "void") > 0.25) return;
        ship.hull = Math.min(ship.maxHull, ship.hull + ship.stats.regen * dt);
    }

    /* Everything the soft aim has hold of, best first. Missiles go to the
     * closest of these; the salvos exist so a single weapon is still worth
     * something against a formation. */
    function lockTargets(ship, max) {
        var out = [];
        var range2 = 620 * 620;
        for (var i = 0; i < S.World.world.ships.length; i++) {
            var s = S.World.world.ships[i];
            if (s === ship || !s.alive || s.docked) continue;
            var d2 = S.dist2(ship.x, ship.y, s.x, s.y);
            if (d2 > range2) continue;
            out.push({ s: s, d2: d2 });
        }
        out.sort(function (a, b) { return a.d2 - b.d2; });
        return out.slice(0, max).map(function (e) { return e.s; });
    }

    function update(dt, inputState, assist) {
        var ship = S.World.world.player;
        if (!ship || !ship.alive) return;

        if (player.docked) {
            ship.throttle = 0;
            player.dockReady = true;
            S.Audio.setThrottle(0);
            return;
        }

        steer(dt, ship, inputState);
        aim(dt, ship, inputState, assist);
        regen(dt, ship);
        updateDocking(dt, ship, inputState);
        updateTargeting(inputState);

        S.Audio.setThrottle(ship.throttle);
        if (inputState.firing) S.World.fire(ship, ship.aim);
        if (inputState.ammoEdge) S.World.fireAmmo(ship, ship.aim);

        if (inputState.missileEdge) {
            S.World.fireMissiles(ship, lockTargets(ship, 3), 0);
        }
        if (inputState.mineEdge) {
            /* Dropped rather than fired: a mine behind you is the point. */
            S.World.dropMine(ship);
        }
        if (inputState.cpuEdge) useCpu(ship);
    }

    /* ===== Targeting =====
     * Tapping a ship locks it; T cycles to the next one in range. On touch
     * the tap doubles as a target-lock, which is the whole reason the stick
     * ignores the right half of the screen.
     */
    function updateTargeting(inputState) {
        var W = S.World.world;
        if (inputState.targetEdge) {
            W.target = W.target
                ? null
                : (S.World.nearestHostile(W.player, C.combat.aimAssistRange * 1.6) || null);
        }
        if (inputState.cycleEdge) {
            W.target = S.World.cycleTarget(W.player, C.combat.aimAssistRange * 2.2);
        }
        /* A lock on something that just died, or that is now a rock, is not a
         * lock. Clear it here rather than leaving the panel showing a ghost. */
        if (W.target && (!W.target.alive || W.target.docked)) W.target = null;
    }

    function useCpu(ship) {
        var res = S.World.activateCpu(ship);
        if (!res.ok) {
            S.Audio.error();
            S.UI.toast(res.reason.toUpperCase(), true);
            return res;
        }
        S.Audio.upgrade();
        var def = S.cpu(res.key);
        S.UI.toast((def ? def.name : res.key.toUpperCase()) + " ACTIVE");
        return res;
    }

    /* ===== Docking =====
     * Deliberate, not automatic: hold DOCK (or E) inside the station ring.
     * Flying through the mouth should not dock you by accident.
     */
    function updateDocking(dt, ship, inputState) {
        var W = S.World.world;

        if (player.undockLock > 0) {
            player.undockLock -= dt;
            if (player.undockLock <= 0) player.dockProgress = 0;
        }

        var inZone = S.World.inDockZone(ship.x, ship.y);

        if (inputState.docking && inZone) {
            player.dockProgress += dt;
            if (player.dockProgress >= C.world.dockTime) dock();
        } else if (player.dockProgress > 0) {
            /* Bleed back rather than snap to zero: a held button that drifts
             * out of the ring should feel like it is nearly there. */
            player.dockProgress = Math.max(0, player.dockProgress - dt * 1.6);
        }
    }

    function dock() {
        if (player.docked) return;
        var ship = S.World.world.player;
        if (!ship || !ship.alive) return;

        player.docked = true;
        player.dockReady = true;
        player.dockProgress = C.world.dockTime;
        ship.docked = true;
        ship.throttle = 0;
        ship.vx = 0;
        ship.vy = 0;

        /* Docking is where the hold becomes money. This has to happen on the
         * way in, not on the way out, so the station panel can show the real
         * balance and a player who undocks twice in a row cannot deposit the
         * same cargo twice. */
        var dep = S.Stations.deposit(ship);
        /* Kept on the ship so the station panel can say what the trip paid
         * instead of showing a hold that is now, necessarily, zero. */
        ship.lastDeposit = dep.deposited;

        S.World.world.docked = true;
        S.World.clearTarget();
        S.Audio.dock();
        S.shake(5);
        S.World.world.events.push({ type: "dock", deposited: dep.deposited });
    }

    function undock() {
        if (!player.docked) return null;
        var W = S.World.world;
        var ship = W.player;
        if (!ship || !ship.alive) return null;

        /* Whatever the pilot changed in the hangar has to reach the live
         * ship now. Undocking does not rebuild the ship, so without this a
         * hull bought two minutes ago would still fly the old silhouette and
         * the old hold. */
        S.Stations.applyHangar(ship);
        S.Stations.refreshStats(ship);

        var fee = S.Stations.payFee(ship);
        var saved = S.Stations.bank(ship);
        S.Storage.saveShip(saved);

        var lp = S.World.launchPoint();
        ship.x = lp.x;
        ship.y = lp.y;
        ship.heading = lp.heading;
        ship.aim = lp.heading;
        ship.vx = 0;
        ship.vy = 0;
        ship.docked = false;
        ship.throttle = 0;
        /* A moment of grace on the way out so you are not instantly shredded
         * by whatever was waiting at the dock mouth. */
        ship.invuln = Math.max(ship.invuln, 2.0);

        player.docked = false;
        player.dockReady = false;
        player.dockProgress = 0;
        player.undockLock = 1.2;
        W.docked = false;
        W.events.push({ type: "undock", fee: fee });

        S.Audio.undock();
        return saved;
    }

    /* Called from main when the player's ship is destroyed. */
    function onDeath() {
        player.docked = false;
        player.dockReady = false;
        player.dockProgress = 0;
        player.undockLock = 0;
        S.World.world.docked = false;
        S.World.clearTarget();
    }

    S.Player = {
        create: create,
        reset: reset,
        update: update,
        useCpu: useCpu,
        dock: dock,
        undock: undock,
        onDeath: onDeath,
        state: player,
    };

})(window.S7 = window.S7 || {});