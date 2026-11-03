/*
 * The law of the belt.
 *
 * The map is concentric. Outside-in: the Maw (black hole, PvP hazard), the
 * Scab (open PvP), the Drift (PvE frontier), and one safe bubble around the
 * Anchorage. Ship-to-ship fire inside the Drift is a crime unless one of the
 * two ships is already an outlaw; inside the bubble it is simply impossible.
 */
(function (CB) {
    "use strict";

    var C = CB.CONFIG;

    function dist2(ax, ay, bx, by) {
        var dx = ax - bx, dy = ay - by;
        return dx * dx + dy * dy;
    }

    function zoneAt(x, y) {
        if (dist2(x, y, C.HOME.x, C.HOME.y) <= C.SAFE_RADIUS * C.SAFE_RADIUS) {
            return C.ZONE.anchorage;
        }
        var d = Math.sqrt(x * x + y * y);
        if (d <= C.MAW_RADIUS) return C.ZONE.maw;
        if (d <= C.SCAB_RADIUS) return C.ZONE.scab;
        if (d <= C.DRIFT_RADIUS) return C.ZONE.drift;
        return C.ZONE.void;
    }

    function zoneId(x, y) { return zoneAt(x, y).id; }

    function inSafe(x, y) {
        return dist2(x, y, C.HOME.x, C.HOME.y) <= C.SAFE_RADIUS * C.SAFE_RADIUS;
    }

    function inMaw(x, y) {
        return x * x + y * y <= C.MAW_RADIUS * C.MAW_RADIUS;
    }

    function distanceFromCentre(x, y) {
        return Math.sqrt(x * x + y * y);
    }

    /* A ship may be hit only if the law where it currently is allows it. */
    function canHarm(attacker, target, time) {
        if (!attacker || !target || attacker === target) return false;
        if (attacker.alive === false || target.alive === false) return false;
        if (attacker.team === target.team) return false;

        var z = zoneAt(target.x, target.y);
        if (z.safe) {
            /* Turrets are allowed to answer an outlaw inside the bubble. */
            return target.outlawUntil > time || attacker.outlawUntil > time;
        }
        if (attacker.team === "feral" || target.team === "feral") return true;
        if (z.pvp) return true;
        return attacker.outlawUntil > time || target.outlawUntil > time;
    }

    /* Whether a station or capital structure can be attacked. */
    function canHarmStructure(attacker, structure, time) {
        if (!attacker || !structure) return false;
        if (structure.team === attacker.team) return false;
        if (attacker.team === "feral") return true;
        var z = zoneAt(structure.x, structure.y);
        if (structure.kind === "nexus") {
            /* The Nexus is always a valid target once you are in the Scab,
             * but its shield is the gate, not the law. */
            return z.pvp || attacker.outlawUntil > time;
        }
        if (z.safe) return attacker.outlawUntil > time;
        return z.pvp || attacker.outlawUntil > time;
    }

    function oreMultiplier(x, y) {
        return zoneAt(x, y).ore;
    }

    function bountyMultiplier(x, y) {
        return zoneAt(x, y).bounty;
    }

    CB.Zones = {
        zoneAt: zoneAt,
        zoneId: zoneId,
        inSafe: inSafe,
        inMaw: inMaw,
        distanceFromCentre: distanceFromCentre,
        canHarm: canHarm,
        canHarmStructure: canHarmStructure,
        oreMultiplier: oreMultiplier,
        bountyMultiplier: bountyMultiplier
    };
})(window.CB = window.CB || {});
