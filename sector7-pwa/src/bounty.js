/*
 * SECTOR 7 - bounty hunters.
 *
 * The sector occasionally sends something after you specifically. This is
 * Darkorbit's signature: a named rival with a price on its head that grows
 * while it lives, so ignoring it is a real option and fighting it is a real
 * decision.
 *
 * The hunter you killed last time comes back. That memory is the point - a
 * bounty that forgets is just a spawn timer.
 */
(function (S) {
    "use strict";

    var HUNTER_NAMES = [
        "ROOK-9", "ASH-3", "TALON-7", "VYRE", "NULL-2", "GRIST",
        "COIL-5", "MARROW", "HOLLOW-4", "PYRE-1", "SABLE", "KETT-8",
    ];

    var bounty = {
        active: false,
        name: "",
        color: "#ff5470",
        hull: 0,
        maxHull: 0,
        shipId: 0,
        bounty: 0,
        timer: 0,
        /* Seconds until the next hunter arrives. */
        nextIn: 45,
        sector: "rook",
        kills: 0,
    };

    var PREFIX = "sector7.v1.bounty";

    function interval(sec) {
        /* Busier sectors send hunters out more often. */
        var idx = S.Sector ? S.Sector.index(sec.id) : 0;
        return Math.max(24, 52 - idx * 8);
    }

    function baseBounty(sec) {
        var idx = S.Sector ? S.Sector.index(sec.id) : 0;
        return Math.round((28 + idx * 20) * (sec.payout || 1));
    }

    function tierFor(sec) {
        var idx = S.Sector ? S.Sector.index(sec.id) : 0;
        return S.clamp(4 + idx * 2, 4, S.NPC_TIERS.length - 1);
    }

    /* Persisted so "the one that killed me" is still a thing tomorrow. */
    function save() {
        try {
            localStorage.setItem(PREFIX, JSON.stringify({
                names: bounty.kills ? bounty : null,
                lastName: bounty.name,
                lastTier: bounty.tier,
                kills: bounty.kills,
            }));
        } catch (e) { /* private mode */ }
    }

    function load() {
        try {
            var raw = localStorage.getItem(PREFIX);
            if (!raw) return;
            var d = JSON.parse(raw);
            if (d && typeof d.lastName === "string") {
                bounty.name = d.lastName;
                bounty.lastTier = d.lastTier;
            }
            if (d && Number.isFinite(d.kills)) bounty.kills = d.kills;
        } catch (e) { /* corrupt */ }
    }

    function reset(sec, seed) {
        bounty.active = false;
        bounty.shipId = 0;
        bounty.sector = sec.id;
        bounty.timer = 0;
        bounty.bounty = 0;
        /* First one arrives sooner than the steady-state gap, so a fresh
         * player meets the mechanic early. */
        bounty.nextIn = interval(sec) * 0.6;
        bounty.rng = S.mulberry32(S.hashString("bounty:" + sec.id + ":" + seed));
    }

    /* Spawn a hunter just outside the player's view, so it arrives as a
     * threat on the radar rather than as a surprise on top of you. */
    function spawn(world, sec, player) {
        var tier = tierFor(sec);
        var def = S.NPC_TIERS[tier];
        var rng = bounty.rng || Math.random;
        var idx = (rng() * HUNTER_NAMES.length) | 0;

        var pt = S.World.spawnPoint();
        var ship = S.World.spawnShip({
            name: HUNTER_NAMES[idx],
            color: "#ff5470",
            tier: tier,
            x: pt.x,
            y: pt.y,
            z: 10,
            heading: Math.atan2(player.y - pt.y, player.x - pt.x),
            maxHull: def.hull * 1.4,
            stats: {
                damage: def.damage * 1.25,
                fireInterval: def.fire * 0.85,
                speed: def.speed * 1.12,
                turn: def.turn * 1.1,
                maxHull: def.hull * 1.4,
                regen: 0,
                missiles: 3,
                missileDamage: def.damage * 3,
                missileCooldown: 4.5,
                mineCapacity: 2,
                mineDamage: def.damage * 3.5,
                mineRadius: 100,
                mineCooldown: 5,
            },
            radius: def.hull_px * 1.15,
        });

        ship.isBounty = true;
        ship.bountyName = HUNTER_NAMES[idx];
        ship.aimError = def.aim * 0.6;
        ship.skill = 0.9;
        ship.patrol = { a: 0, r: 0 };
        ship.state = "attack";
        /* It knows where you are from the moment it appears. */
        ship.target = player;

        bounty.active = true;
        bounty.shipId = ship.id;
        bounty.name = HUNTER_NAMES[idx];
        bounty.color = "#ff5470";
        bounty.maxHull = ship.maxHull;
        bounty.bounty = baseBounty(sec);
        bounty.tier = tier;

        S.World.world.events.push({ type: "bountySpawn", name: bounty.name, value: bounty.bounty });
        return ship;
    }

    function update(world, sec, player, dt) {
        if (!player || !player.alive) {
            /* A hunter with nothing to hunt keeps circling until the player
             * relaunches; it does not simply vanish. */
            return;
        }

        if (!bounty.active) {
            bounty.nextIn -= dt;
            if (bounty.nextIn <= 0) {
                spawn(world, sec, player);
                bounty.nextIn = interval(sec);
            }
            return;
        }

        /* Track the live ship so the HUD can read its hull. */
        var ship = null;
        for (var i = 0; i < S.World.world.ships.length; i++) {
            if (S.World.world.ships[i].id === bounty.shipId) { ship = S.World.world.ships[i]; break; }
        }

        if (!ship) {
            /* It died, or it was never ours: either way the hunt is over. */
            bounty.active = false;
            bounty.shipId = 0;
            bounty.nextIn = interval(sec);
            return;
        }

        bounty.hull = ship.hull;
        /* The price climbs the longer it lives. Waiting it out is not free. */
        bounty.timer += dt;
        bounty.bounty = baseBounty(sec) + Math.round(bounty.timer * 1.6);

        /* It hunts you specifically, not whatever is nearest. */
        if (!ship.target || !ship.target.alive) ship.target = player;
    }

    /* Called from the kill path. Returns the payout if this kill ended the
     * hunt, otherwise null. */
    function onKill(victim) {
        if (!bounty.active || !victim.isBounty) return null;
        var pay = bounty.bounty;
        bounty.kills++;
        bounty.active = false;
        bounty.shipId = 0;
        bounty.hull = 0;
        save();
        return pay;
    }

    function status() {
        return {
            active: bounty.active,
            name: bounty.name,
            hull: bounty.hull,
            maxHull: bounty.maxHull,
            value: bounty.bounty,
            nextIn: Math.max(0, bounty.nextIn),
        };
    }

    S.Bounty = {
        reset: reset,
        update: update,
        onKill: onKill,
        status: status,
        load: load,
        save: save,
        HUNTER_NAMES: HUNTER_NAMES,
    };

})(window.S7 = window.S7 || {});