/*
 * Hulls and the upgrade tree.
 *
 * Tier 1 is a Sparrow. At the first upgrade the pilot picks a doctrine, and
 * from then on the line upgrades in a straight run. That keeps the tree
 * legible on a phone (one real decision, then commitment) while still giving
 * three genuinely different ways to play.
 */
(function (CB) {
    "use strict";

    var C = CB.CONFIG;

    function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

    function allHulls() {
        var out = [C.STARTER];
        Object.keys(C.LINES).forEach(function (line) {
            C.LINES[line].hulls.forEach(function (h) { out.push(h); });
        });
        return out;
    }

    var BY_ID = {};
    allHulls().forEach(function (h) { BY_ID[h.id] = h; });

    function getHull(id) {
        return BY_ID[id] || C.STARTER;
    }

    function lineOf(hull) {
        if (!hull || hull.tier === 1) return null;
        return C.LINES[hull.line] ? hull.line : null;
    }

    function lineColor(hull) {
        var line = lineOf(hull);
        return line ? C.LINES[line].color : "#e2e8f0";
    }

    function costToTier(tier) {
        return C.UPGRADE_COST[Math.max(0, Math.min(C.UPGRADE_COST.length - 1, tier - 1))] || 0;
    }

    /* Cost of the next hull in a line, or the three tier-2 hulls' shared cost. */
    function nextCost(ship) {
        if (!ship) return 0;
        if (ship.tier >= 6) return 0;
        return costToTier(ship.tier + 1);
    }

    function options(ship) {
        if (!ship) return [];
        if (ship.tier === 1) {
            return Object.keys(C.LINES).map(function (line) {
                return C.LINES[line].hulls[0];
            });
        }
        var line = C.LINES[ship.line];
        if (!line) return [];
        var idx = ship.tier - 1;
        return line.hulls[idx] ? [line.hulls[idx]] : [];
    }

    /* Rebuild the runtime stats from a hull definition, preserving the
     * percentage of hull and shield so an upgrade in the middle of a fight is
     * not also a free heal. */
    function applyHull(ship, hull) {
        var oldHullMax = ship.hullMax || hull.hull;
        var oldShieldMax = ship.shieldMax || hull.shield;
        var hullPct = ship.hullMax ? ship.hull / ship.hullMax : 1;
        var shieldPct = ship.shieldMax ? ship.shield / ship.shieldMax : 1;

        ship.hullId = hull.id;
        ship.name = hull.name;
        ship.tier = hull.tier;
        ship.line = hull.tier === 1 ? "lance" : (hull.line || ship.line);
        ship.stats = clone(hull);
        ship.hullMax = hull.hull;
        ship.shieldMax = hull.shield;
        ship.energyMax = hull.energy;
        ship.radius = hull.radius;
        ship.ability = hull.ability;
        ship.abilityName = hull.abilityName;
        ship.abilityCd = hull.abilityCd;
        ship.color = hull.color;

        if (ship.hullMax) ship.hull = Math.max(1, Math.round(hull.hull * hullPct));
        if (ship.shieldMax) ship.shield = Math.round(hull.shield * shieldPct);
        ship.energy = Math.min(ship.energyMax, ship.energy || ship.energyMax);
        ship.maxOld = { hull: oldHullMax, shield: oldShieldMax };
    }

    function abilityLabel(ship) {
        return ship && ship.abilityName ? ship.abilityName : "AFTERBURNER";
    }

    CB.Shipyard = {
        getHull: getHull,
        allHulls: allHulls,
        options: options,
        nextCost: nextCost,
        costToTier: costToTier,
        applyHull: applyHull,
        lineOf: lineOf,
        lineColor: lineColor,
        abilityLabel: abilityLabel,
        starter: function () { return clone(C.STARTER); }
    };
})(window.CB = window.CB || {});
