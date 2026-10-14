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
                delta: describeDelta(ship.modules, def.key, level, ship.refits),
                affordable: !isFinite(cost) ? false : ship.energy >= cost,
            });
        }
        return {
            modules: modules,
            repair: repairCost(ship),
            hull: ship.hull,
            maxHull: ship.maxHull,
            shield: ship.shield,
            maxShield: ship.maxShield,
            energy: ship.energy,
            hold: holdValue(ship),
            holdMax: ship.holdMax,
            fee: undockFee(ship),
        };
    }

    /* The concrete number a module buys, not a vague "damage up". Players
     * spend real currency and deserve to see what it converts into. */
    function describeDelta(modules, key, level, refits) {
        var next = {};
        for (var i = 0; i < S.MODULES.length; i++) next[S.MODULES[i].key] = modules[S.MODULES[i].key];
        next[key] = level + 1;

        /* Refits have to come along, or Frame Plating makes every Shield row
         * quote a hull gain the player will not actually get. */
        var a = S.statsFor(modules, refits);
        var b = S.statsFor(next, refits);

        switch (key) {
            case "blaster":
                return a.damage >= b.damage
                    ? null
                    : b.damage.toFixed(1) + " laser dmg";
            case "ammo":
                return a.ammoDamage >= b.ammoDamage
                    ? null
                    : b.ammoDamage.toFixed(0) + " shield dmg · " +
                      b.ammoCooldown.toFixed(1) + "s";
            case "shield":
                return a.maxShield >= b.maxShield
                    ? null
                    : "+" + Math.round(b.maxShield - a.maxShield) + " shield, +" +
                      Math.round(b.maxHull - a.maxHull) + " hull";
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
            case "cargo":
                return a.holdMax >= b.holdMax
                    ? null
                    : "+" + Math.round(b.holdMax - a.holdMax) + " hold";
            case "missiles":
                return a.missileDamage >= b.missileDamage
                    ? null
                    : b.missiles + " missiles · " + b.missileDamage.toFixed(0) + " dmg";
            case "mines":
                return a.mineDamage >= b.mineDamage
                    ? null
                    : b.mineCapacity + " mines · " + b.mineDamage.toFixed(0) + " dmg";
            default:
                return null;
        }
    }

    /* ===== Cargo =====
     * Docking is the only place a hold becomes money. The player flies out
     * with a tank and a hold, comes back with a fuller hold, and this is
     * where the difference between the two gets banked.
     *
     * Returns { deposited, overflow } and mutates the ship, because a docking
     * is not a transaction that can fail - there is no price to refuse.
     */
    function deposit(ship) {
        var amount = Math.max(0, Math.floor(ship.hold || 0));
        ship.hold = 0;
        ship.energy += amount;
        return { deposited: amount, overflow: 0 };
    }

    /* What docking is about to be worth, for the station header. */
    function holdValue(ship) {
        return Math.max(0, Math.floor(ship.hold || 0));
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

        /* Upgrades re-derive max hull, shield and hold, so a purchase has to
         * hand back the new capacity rather than silently shrink a bar. */
        rederive(ship);
        return { ok: true, spent: cost, level: ship.modules[key] };
    }

    /* One place that pushes derived stats onto the live ship. Every purchase
     * and every refit goes through here, so a track can never change a number
     * the ship is not actually carrying. */
    function rederive(ship) {
        var stats = S.shipStats(ship);

        var hullGain = stats.maxHull - ship.maxHull;
        ship.stats = stats;
        ship.reduction = stats.reduction;
        ship.maxHull = stats.maxHull;
        ship.maxShield = stats.maxShield;
        /* A bigger shield pool tops up as well as growing, so buying Shield
         * is never a downgrade in effective durability. */
        ship.shield = Math.min(stats.maxShield, (ship.shield || 0) + Math.max(0, hullGain * 0.45));
        if (hullGain > 0) ship.hull = Math.min(ship.maxHull, ship.hull + hullGain);
        /* Growing the hold leaves the cargo already in it alone. */
        ship.holdMax = stats.holdMax;
        return ship;
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
        ship.saved = ship.saved || { crystals: 0, modules: null, refits: {}, cpus: {}, cpu: null };
        ship.saved.crystals = ship.crystals;
        ship.saved.refits = ship.refits || { crystals: 0 };
        ship.saved.modules = {};
        for (var i = 0; i < S.MODULES.length; i++) {
            var k = S.MODULES[i].key;
            ship.saved.modules[k] = ship.modules[k];
        }
        ship.saved.cpus = {};
        for (var c = 0; c < S.CPUS.length; c++) {
            var ck = S.CPUS[c].key;
            ship.saved.cpus[ck] = !!(ship.cpus && ship.cpus[ck]);
        }
        ship.saved.cpu = ship.cpu || null;
        ship.saved.name = ship.name;
        ship.saved.sector = ship.sector;
        ship.saved.energy = Math.floor(ship.energy);
        /* The hangar has its own save key, but the live ship carries it so a
         * purchase made while docked cannot quietly drop the hull or the
         * parts the pilot just paid for. */
        ship.saved.hangar = ship.hangar || null;
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
        if (save.cpus) ship.cpus = save.cpus;
        ship.cpu = (ship.cpus && ship.cpu && ship.cpus[ship.cpu]) ? ship.cpu : null;
        /* Hangar changes are applied from storage, not from the saved blob:
         * the hangar key is authoritative because that is where the player
         * edits it, and a stale copy riding along in the ship save would
         * roll back a purchase made since. */
        if (save.hangar) ship.hangar = save.hangar;
        S.Stations.applyHangar(ship);
        refreshStats(ship);
        return ship;
    }

    /* Push the hangar's current fit onto a live ship: hull id and the
     * resolved part levels. One call site so a ship is never half-updated. */
    function applyHangar(ship) {
        var hangar = ship.hangar || S.Storage.getHangar();
        ship.hangar = hangar;
        ship.hullId = hangar.active;
        /* `hullDef`, not `hull` - that name is the armour pool. */
        ship.hullDef = S.hull(hangar.active);
        /* The hull sets the paint. Keeping the old colour after switching
         * ships would make the minimap lie about what you are flying.
         * applyHangar only ever runs on a player ship. */
        if (ship.hullDef && ship.hullDef.color) ship.color = ship.hullDef.color;
        ship.parts = S.Storage.resolveFit(hangar, hangar.active);
        return ship;
    }

    /* Kept separate so a refit or a purchase that changes max hull has one
     * obvious place to hand back the new capacity. */
    function refreshStats(ship) {
        ship.stats = S.shipStats(ship);
        ship.reduction = ship.stats.reduction;
        ship.maxHull = ship.stats.maxHull;
        ship.maxShield = ship.stats.maxShield;
        ship.shield = ship.stats.maxShield;
        ship.hull = ship.maxHull;
        ship.holdMax = ship.stats.holdMax;
        return ship;
    }

    /* ===== CPUs =====
     * Bought once with energy, fitted one at a time. Changing which one is
     * fitted is free and always allowed - that is the whole decision, and it
     * has to be reversible or it stops being one.
     */
    function cpuQuote(ship) {
        var owned = ship.cpus || {};
        var out = [];
        for (var i = 0; i < S.CPUS.length; i++) {
            var c = S.CPUS[i];
            var has = !!owned[c.key];
            out.push({
                key: c.key,
                name: c.name,
                glyph: c.glyph,
                blurb: c.blurb,
                detail: c.detail(),
                cost: c.cost,
                owned: has,
                fitted: ship.cpu === c.key,
                /* Buying is a transaction; fitting is not. */
                affordable: has ? true : ship.energy >= c.cost,
            });
        }
        return out;
    }

    function buyCpu(ship, key) {
        var c = S.cpu(key);
        if (!c) return { ok: false, reason: "unknown cpu" };
        ship.cpus = ship.cpus || {};
        if (ship.cpus[key]) return { ok: false, reason: "already installed" };
        if (ship.energy < c.cost) return { ok: false, reason: "not enough energy" };

        ship.energy -= c.cost;
        ship.cpus[key] = true;
        /* Buying one fits it, so the purchase is never inert. */
        ship.cpu = key;
        return { ok: true, spent: c.cost };
    }

    function fitCpu(ship, key) {
        if (key === null) { ship.cpu = null; return { ok: true }; }
        var c = S.cpu(key);
        if (!c) return { ok: false, reason: "unknown cpu" };
        if (!(ship.cpus && ship.cpus[key])) return { ok: false, reason: "not installed" };
        ship.cpu = key;
        return { ok: true };
    }

    /* ===== Hangar =====
     * Every transaction here returns { ok, ... } and mutates the hangar only
     * on success, exactly like a module purchase. The hangar is the pilot's
     * property; a failed purchase must never leave a half-installed part or
     * a hull the player does not own.
     */
    function hangarQuote(ship) {
        var hangar = ship.hangar || S.Storage.getHangar();
        var hulls = [];
        for (var i = 0; i < S.HULLS.length; i++) {
            var h = S.HULLS[i];
            var owned = S.Storage.ownsHull(hangar, h.id);
            hulls.push({
                id: h.id,
                name: h.name,
                tag: h.tag,
                glyph: h.glyph,
                color: h.color,
                passive: h.passive,
                blurb: h.blurb,
                detail: h.detail,
                cost: owned ? 0 : h.cost,
                owned: owned,
                active: hangar.active === h.id,
                affordable: owned ? true : ship.energy >= h.cost,
            });
        }

        var parts = [];
        for (var s = 0; s < S.HULL_SLOTS.length; s++) {
            var slot = S.HULL_SLOTS[s];
            var options = [];
            for (var p = 0; p < S.PARTS.length; p++) {
                var def = S.PARTS[p];
                if (def.slot !== slot) continue;
                var level = hangar.parts[def.key] || 0;
                var fittedKey = hangar.hulls[hangar.active]
                    ? hangar.hulls[hangar.active].parts[slot] : null;
                var nextCost = S.partCost(def.key, level);
                options.push({
                    key: def.key,
                    name: def.name,
                    glyph: def.glyph,
                    blurb: def.blurb,
                    detail: def.detail,
                    level: level,
                    max: S.PART_MAX,
                    owned: level > 0,
                    fitted: fittedKey === def.key,
                    maxed: level >= S.PART_MAX,
                    cost: level > 0 ? nextCost : def.cost,
                    /* Buying one installs it; upgrading one is a level. Both
                     * are energy, both are the same price curve. */
                    affordable: level > 0 ? ship.energy >= nextCost : ship.energy >= def.cost,
                });
            }
            parts.push({ slot: slot, options: options });
        }
        return { hulls: hulls, slots: parts, active: hangar.active };
    }

    function buyHull(ship, id) {
        var hangar = ship.hangar || S.Storage.getHangar();
        if (!hangar) return { ok: false, reason: "no hangar" };
        for (var i = 0; i < S.HULLS.length; i++) {
            if (S.HULLS[i].id !== id) continue;
            if (S.Storage.ownsHull(hangar, id)) return { ok: false, reason: "already owned" };
            var cost = S.HULLS[i].cost;
            if (ship.energy < cost) return { ok: false, reason: "not enough energy" };
            ship.energy -= cost;
            hangar.hulls[id] = { parts: emptyFit() };
            hangar.active = id;
            ship.hangar = hangar;
            applyHangar(ship);
            refreshStats(ship);
            return { ok: true, spent: cost };
        }
        return { ok: false, reason: "unknown hull" };
    }

    function buyPart(ship, key) {
        var hangar = ship.hangar || S.Storage.getHangar();
        var def = S.part(key);
        if (!def) return { ok: false, reason: "unknown part" };

        var level = hangar.parts[key] || 0;
        var cost = level > 0 ? S.partCost(key, level) : def.cost;
        if (!Number.isFinite(cost)) return { ok: false, reason: "already maxed" };
        if (ship.energy < cost) return { ok: false, reason: "not enough energy" };

        ship.energy -= cost;
        hangar.parts[key] = level + 1;
        /* A newly bought component goes straight into its slot if the slot is
         * empty. Buying something that does nothing would be a tax, and the
         * pilot would have to open the hangar twice to see it. */
        var slot = hangar.hulls[hangar.active]
            ? hangar.hulls[hangar.active].parts[def.slot] : null;
        if (!slot) {
            hangar.hulls[hangar.active].parts[def.slot] = key;
        }
        ship.hangar = hangar;
        applyHangar(ship);
        refreshStats(ship);
        return { ok: true, spent: cost, level: hangar.parts[key] };
    }

    /* Free, repeatable, and refused only when the part is not owned.
     * Same rule as fitting a CPU: a choice you cannot take back is not a
     * choice, so this charges nothing and never blocks a swap.
     *
     * Passing null for `key` empties the named slot. An empty slot is a legal
     * ship, just a worse one. */
    function fitPart(ship, key, slotName) {
        var hangar = ship.hangar || S.Storage.getHangar();
        if (!hangar) return { ok: false, reason: "no hangar" };
        var hullEntry = hangar.hulls[hangar.active];
        if (!hullEntry) return { ok: false, reason: "no hull" };

        if (key === null) {
            if (!slotName || S.HULL_SLOTS.indexOf(slotName) < 0) {
                return { ok: false, reason: "no slot named" };
            }
            hullEntry.parts[slotName] = null;
            ship.hangar = hangar;
            applyHangar(ship);
            refreshStats(ship);
            return { ok: true };
        }

        var def = S.part(key);
        if (!def) return { ok: false, reason: "unknown part" };
        if (slotName && def.slot !== slotName) return { ok: false, reason: "wrong slot" };
        if (!hangar.parts[key]) return { ok: false, reason: "not owned" };

        hullEntry.parts[def.slot] = key;
        ship.hangar = hangar;
        applyHangar(ship);
        refreshStats(ship);
        return { ok: true };
    }

    /* Select which hull to fly next. Free and always allowed - same
     * reversibility rule as swapping a CPU. */
    function setActiveHull(ship, id) {
        var hangar = ship.hangar || S.Storage.getHangar();
        if (!hangar) return { ok: false, reason: "no hangar" };
        if (!S.Storage.ownsHull(hangar, id)) return { ok: false, reason: "not owned" };
        hangar.active = id;
        ship.hangar = hangar;
        applyHangar(ship);
        refreshStats(ship);
        return { ok: true };
    }

    function emptyFit() {
        var fit = {};
        for (var i = 0; i < S.HULL_SLOTS.length; i++) fit[S.HULL_SLOTS[i]] = null;
        return fit;
    }

    S.Stations = {
        repairCost: repairCost,
        hangarQuote: hangarQuote,
        buyHull: buyHull,
        buyPart: buyPart,
        fitPart: fitPart,
        setActiveHull: setActiveHull,
        applyHangar: applyHangar,
        undockFee: undockFee,
        nextCost: nextCost,
        quote: quote,
        buyModule: buyModule,
        buyRepair: buyRepair,
        refitQuote: refitQuote,
        buyRefit: buyRefit,
        cpuQuote: cpuQuote,
        buyCpu: buyCpu,
        fitCpu: fitCpu,
        deposit: deposit,
        holdValue: holdValue,
        rederive: rederive,
        refreshStats: refreshStats,
        dockTick: dockTick,
        payFee: payFee,
        bank: bank,
        applySave: applySave,
    };

})(window.S7 = window.S7 || {});