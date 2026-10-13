/*
 * SECTOR 7 - the space station: docking rules and the whole energy economy.
 *
 * Every spend, refund and price lives here and nowhere else, so the station
 * screen and the headless sim test are provably talking about the same
 * numbers. Nothing in this file touches the DOM or the canvas.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    /* ===== Pricing ===== */

    /* Repair is priced off missing hull, not off raw hull, so a nearly-dead
     * ship is cheap to save and a badly hurt one is a real decision. The
     * coefficient climbs with your tier, so field repairs get more expensive
     * as the sector escalates - exactly when you can least afford them. */
    function repairCost(ship) {
        var missing = ship.maxHull - ship.hull;
        if (missing <= 0.5) return 0;
        var rate = 0.55 + 0.09 * S.tierForShip(ship.modules);
        return Math.ceil(missing * rate);
    }

    /* Docking is a loan, not a gift: a slice of your energy is the toll for
     * launching from the station. */
    function undockFee(ship) {
        return Math.max(C.world.dockFeeMin, Math.ceil(ship.energy * C.world.dockFeeRate));
    }

    function nextCost(ship, key) {
        return S.moduleCost(key, S.moduleLevel(ship.modules, key));
    }

    /* Everything the station panel needs, computed in one pass so the UI
     * never has to derive a price the economy would not honour. */
    function quote(ship) {
        var modules = [];
        for (var i = 0; i < S.MODULES.length; i++) {
            var def = S.MODULES[i];
            var level = S.moduleLevel(ship.modules, def.key);
            var cost = nextCost(ship, def.key);
            modules.push({
                key: def.key,
                name: def.name,
                glyph: def.glyph,
                blurb: def.blurb,
                level: level,
                max: S.MODULE_MAX,
                cost: cost,
                maxed: level >= S.MODULE_MAX,
                /* Level 2..10 shown as pips: at a glance you can see how far
                 * along a track you are without reading a number. */
                delta: describeDelta(ship.modules, def.key, level),
                affordable: !isFinite(cost) ? false : ship.energy >= cost,
            });
        }
        return {
            modules: modules,
            repair: repairCost(ship),
            hull: ship.hull,
            maxHull: ship.maxHull,
            energy: ship.energy,
            fee: undockFee(ship),
        };
    }

    /* The concrete number a module buys, not a vague "damage up". Players
     * spend real currency and deserve to see what it converts into. */
    function describeDelta(modules, key, level) {
        var next = {};
        for (var i = 0; i < S.MODULES.length; i++) next[S.MODULES[i].key] = modules[S.MODULES[i].key];
        next[key] = level + 1;

        var a = S.statsFor(modules);
        var b = S.statsFor(next);

        switch (key) {
            case "blaster":
                return a.damage >= b.damage
                    ? null
                    : b.damage.toFixed(1) + " dmg · " + b.fireInterval.toFixed(2) + "s";
            case "shield":
                return a.maxHull >= b.maxHull
                    ? null
                    : "+" + Math.round(b.maxHull - a.maxHull) + " hull";
            case "armor":
                return a.reduction >= b.reduction
                    ? null
                    : "+" + (b.reduction - a.reduction).toFixed(1) + " armour";
            case "processor":
                return a.energyBonus >= b.energyBonus
                    ? null
                    : "+" + Math.round((b.energyBonus - a.energyBonus) * 100) + "% energy";
            case "thruster":
                return a.speed >= b.speed
                    ? null
                    : "+" + Math.round(b.speed - a.speed) + " speed";
            default:
                return null;
        }
    }

    /* ===== Transactions =====
     * Every one of these returns { ok, spent } and mutates the ship only on
     * success. That invariant - no failed purchase ever changes a number -
     * is what the sim test asserts.
     */

    function buyModule(ship, key) {
        var idx = S.moduleIndex(key);
        if (idx < 0) return { ok: false, reason: "unknown module" };

        var level = S.moduleLevel(ship.modules, key);
        if (level >= S.MODULE_MAX) return { ok: false, reason: "already maxed" };

        var cost = S.moduleCost(key, level);
        if (ship.energy < cost) return { ok: false, reason: "not enough energy" };

        ship.energy -= cost;
        ship.modules[key] = level + 1;

        /* Upgrades re-derive max hull and armour, so a Shield purchase has to
         * hand back the new capacity rather than silently shrink the bar. */
        var stats = S.statsFor(ship.modules);
        var gain = stats.maxHull - ship.maxHull;
        ship.maxHull = stats.maxHull;
        ship.stats = stats;
        ship.reduction = stats.reduction;
        if (gain > 0) ship.hull = Math.min(ship.maxHull, ship.hull + gain);

        return { ok: true, spent: cost, level: ship.modules[key] };
    }

    function buyRepair(ship) {
        var missing = ship.maxHull - ship.hull;
        if (missing <= 0.5) return { ok: false, reason: "hull is intact" };

        var cost = repairCost(ship);
        if (ship.energy < cost) return { ok: false, reason: "not enough energy" };

        ship.energy -= cost;
        ship.hull = ship.maxHull;
        return { ok: true, spent: cost };
    }

    /* A free trickle-back while you loiter in the dock, so a dock visit is
     * never a total waste even when you cannot afford a full repair. */
    function dockTick(ship, dt) {
        if (ship.hull >= ship.maxHull) return 0;
        if (ship.energy < 1) return 0;

        var rate = ship.stats.regen * 6;
        var want = ship.maxHull - ship.hull;
        var healed = Math.min(want, rate * dt);
        var paid = Math.ceil(healed * 0.6);

        ship.hull += healed;
        ship.energy = Math.max(0, ship.energy - paid);
        return healed;
    }

    function payFee(ship) {
        var fee = undockFee(ship);
        ship.energy = Math.max(0, ship.energy - fee);
        return fee;
    }

    /* ===== Refits =====
     * Bought with crystals, permanent, and deliberately not refundable: the
     * whole point is that spending crystals early should feel like a
     * commitment rather than a bet you can undo.
     *
     * Refits are paid for out of the ship's crystal balance - the same balance
     * contracts pay into. There is deliberately no second "refit budget": the
     * quote and the purchase have to read the same number, or the station
     * shows an affordable price and then quietly refuses.
     */
    function refitQuote(ship) {
        var refits = ship.refits || {};
        var out = [];
        for (var i = 0; i < S.REFITS.length; i++) {
            var r = S.REFITS[i];
            var lv = S.refitLevel(refits, r.key);
            var cost = S.refitCost(r.key, lv);
            out.push({
                key: r.key,
                name: r.name,
                glyph: r.glyph,
                level: lv,
                max: r.max,
                cost: cost,
                maxed: lv >= r.max,
                affordable: !Number.isFinite(cost) ? false : (ship.crystals || 0) >= cost,
                detail: r.detail(lv + 1),
                blurb: r.blurb,
            });
        }
        return out;
    }

    function buyRefit(ship, key) {
        var refits = ship.refits;
        var lv = S.refitLevel(refits, key);
        var cost = S.refitCost(key, lv);
        if (!Number.isFinite(cost)) return { ok: false, reason: "already fitted" };
        if ((ship.crystals || 0) < cost) return { ok: false, reason: "not enough crystals" };

        ship.crystals -= cost;
        refits[key] = lv + 1;
        return { ok: true, spent: cost, level: lv + 1 };
    }

    /* Crystals are banked, not carried: this is the only place they move
     * between the live ship and storage. */
    function bank(ship, save) {
        ship.saved = ship.saved || { crystals: 0, modules: null, refits: {} };
        ship.saved.crystals = ship.crystals;
        ship.saved.refits = ship.refits || { crystals: 0 };
        ship.saved.modules = {};
        for (var i = 0; i < S.MODULES.length; i++) {
            var k = S.MODULES[i].key;
            ship.saved.modules[k] = ship.modules[k];
        }
        ship.saved.name = ship.name;
        ship.saved.sector = ship.sector;
        ship.saved.energy = Math.floor(ship.energy);
        return ship.saved;
    }

    function applySave(ship, save) {
        ship.crystals = save.crystals || 0;
        ship.energy = save.energy === undefined ? ship.energy : save.energy;
        if (save.modules) {
            for (var i = 0; i < S.MODULES.length; i++) {
                var k = S.MODULES[i].key;
                if (Number.isFinite(save.modules[k])) ship.modules[k] = save.modules[k];
            }
        }
        if (save.refits) ship.refits = save.refits;
        ship.stats = S.statsFor(ship.modules, ship.refits);
        ship.reduction = ship.stats.reduction;
        ship.maxHull = ship.stats.maxHull;
        ship.hull = ship.maxHull;
        return ship;
    }

    /* Kept separate so a refit that changes max hull has one obvious place
     * to hand back the new capacity. */
    function refreshStats(ship) {
        var stats = S.statsFor(ship.modules, ship.refits);
        ship.stats = stats;
        ship.reduction = stats.reduction;
        ship.maxHull = stats.maxHull;
        ship.hull = ship.maxHull;
        return ship;
    }

    S.Stations = {
        repairCost: repairCost,
        undockFee: undockFee,
        nextCost: nextCost,
        quote: quote,
        buyModule: buyModule,
        buyRepair: buyRepair,
        refitQuote: refitQuote,
        buyRefit: buyRefit,
        refreshStats: refreshStats,
        dockTick: dockTick,
        payFee: payFee,
        bank: bank,
        applySave: applySave,
    };

})(window.S7 = window.S7 || {});