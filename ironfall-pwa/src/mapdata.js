/*
 * IRONFALL - the map: three lanes, the river, structures, jungle camps.
 *
 * All geometry lives here as data so the renderer, the pathfinder and the
 * tests all read the same numbers. Nothing in this file mutates at runtime.
 *
 * Coordinate note: world +x runs down-right on screen and world +y runs
 * down-left, so the map projects to a diamond with the Emperor's Bastion at
 * the top corner and the Hive Terminus at the bottom. That is deliberately
 * taller than it is wide, because the target device is a phone held upright.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;

    var SIZE = C.map.size;
    var MID = SIZE / 2;
    var INSET = C.map.baseInset;
    var CORNER = SIZE - INSET;

    /* Lane polylines, own base first. Two lanes take the long way round the
     * diamond edge; mid cuts straight through. The order of the corners is
     * what makes this mirror-symmetric under the 180-degree rotation about
     * the map centre, which is the property the balance harness relies on. */
    function base(b) { return { x: b, y: b }; }
    function corner(c) { return { x: c, y: c }; }

    var L = {
        blue: { x: INSET, y: INSET },
        red: { x: CORNER, y: CORNER }
    };

    /* Mid is the diagonal. Flanks leave the base heading straight along one
     * axis, turn at the far corner, and come back. */
    var lanes = {
        top: [
            { x: L.blue.x, y: L.blue.y },
            { x: CORNER, y: INSET },
            { x: CORNER, y: CORNER },
            { x: L.red.x, y: L.red.y }
        ],
        mid: [
            { x: L.blue.x, y: L.blue.y },
            { x: L.red.x, y: L.red.y }
        ],
        bot: [
            { x: L.blue.x, y: L.blue.y },
            { x: INSET, y: CORNER },
            { x: CORNER, y: CORNER },
            { x: L.red.x, y: L.red.y }
        ]
    };

    /* Squared distance from a point to a polyline. Every "is this unit on the
     * lane" test in the game routes through here, so if it were wrong the
     * whole map would be wrong. */
    function polyDist2(pts, x, y) {
        var best = Infinity;
        for (var i = 0; i < pts.length - 1; i++) {
            var d = S.segDist2(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
            if (d < best) best = d;
        }
        return best;
    }

    /* Nearest lane to a point, plus how far away it is. */
    function nearestLane(x, y) {
        var bestName = "mid", best = Infinity;
        for (var name in lanes) {
            if (!Object.prototype.hasOwnProperty.call(lanes, name)) continue;
            var d = polyDist2(lanes[name], x, y);
            if (d < best) { best = d; bestName = name; }
        }
        return { lane: bestName, dist: Math.sqrt(best) };
    }

    /* On-lane is a threshold, not a boundary: the wilds are slower rather
     * than impassable. A hard wall would make retreats one-dimensional and
     * every gank the same shape. */
    function isOnLane(x, y) {
        return nearestLane(x, y).dist <= C.map.laneHalf;
    }

    /* Lane walk speed multiplier. Off-lane is a real cost but never a wall. */
    function terrainSpeed(x, y) {
        return isOnLane(x, y) ? 1 : C.map.wildSpeed;
    }

    /* ===== The river =====
     * A band perpendicular to mid, centred on the map's anti-diagonal, so it
     * crosses all three lanes at their midpoints. That is what makes the
     * Reliquary contestable from any lane rather than a mid-only affair. */
    function riverDepth(x, y) {
        return Math.abs((x + y) - SIZE) / Math.SQRT2;
    }

    function inRiver(x, y) {
        return riverDepth(x, y) <= C.map.riverHalf;
    }

    /* The Reliquary sits where mid meets the river. */
    var RELIQUARY = { x: MID, y: MID, r: 300 };

    /* ===== Bases =====
     *
     * A base is a footprint, a fountain and a shop. The fountain is the only
     * place on the map where you cannot be killed, which is exactly why it
     * is a place you must be able to walk out of: the spawn point sits
     * OUTSIDE its radius, and the fountain heals rather than roots. A bot
     * that respawns inside its own fountain and cannot leave is a bot that
     * never plays the game. */
    var bases = {
        0: {
            team: 0,
            name: "Emperor's Bastion",
            x: L.blue.x, y: L.blue.y,
            /* Fountain centre sits behind the base, so walking out of it is
             * one straight step rather than a turn. */
            fountain: { x: L.blue.x - 330, y: L.blue.y - 330, r: 460, healPerSec: 260 },
            coreRadius: 330,
            /* Just outside the fountain, toward the map centre. */
            spawn: { x: L.blue.x + 110, y: L.blue.y + 110 },
            shop: { x: L.blue.x - 320, y: L.blue.y - 60, r: 900 }
        },
        1: {
            team: 1,
            name: "Hive Terminus",
            x: L.red.x, y: L.red.y,
            fountain: { x: L.red.x + 330, y: L.red.y + 330, r: 460, healPerSec: 260 },
            coreRadius: 330,
            spawn: { x: L.red.x - 110, y: L.red.y - 110 },
            shop: { x: L.red.x + 320, y: L.red.y + 60, r: 900 }
        }
    };

    /* ===== Structures =====
     * Three Bastion Towers per side, one per lane, at the lane's quarter point
     * measured along its own path. A quarter point rather than a world-space
     * distance from base, because on a lane that wraps a corner the two are
     * completely different numbers and the path is the one the player sees. */
    function lanePointAt(laneName, t) {
        var pts = lanes[laneName];
        var total = 0, i;
        var segs = [];
        for (i = 0; i < pts.length - 1; i++) {
            var len = S.dist(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
            segs.push(len);
            total += len;
        }
        var want = total * S.clamp01(t);
        for (i = 0; i < segs.length; i++) {
            if (want <= segs[i] || i === segs.length - 1) {
                var f = segs[i] < 1e-6 ? 0 : want / segs[i];
                return {
                    x: S.lerp(pts[i].x, pts[i + 1].x, f),
                    y: S.lerp(pts[i].y, pts[i + 1].y, f)
                };
            }
            want -= segs[i];
        }
        return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
    }

    var TOWER_Q = 0.25;

    /* Built out rather than hand-listed, so the symmetry is structural: the
     * enemy tower at quarter-from-their-base is a reflection, not a number
     * someone typed twice and got one of wrong. */
    function buildTowers() {
        var out = [];
        var order = ["top", "mid", "bot"];
        for (var s = 0; s < 2; s++) {
            for (var i = 0; i < order.length; i++) {
                var lane = order[i];
                /* s===0 is the blue side and owns the start of every polyline;
                 * s===1 owns the end. */
                var p = lanePointAt(lane, s === 0 ? TOWER_Q : 1 - TOWER_Q);
                out.push({
                    kind: "tower",
                    team: s,
                    lane: lane,
                    x: p.x, y: p.y,
                    /* Towers push slightly toward the middle of the map so a
                     * pushed front line is the one that dies, which is the
                     * whole point of a turret. */
                    facing: s === 0 ? 1 : -1
                });
            }
        }
        return out;
    }

    var structures = buildTowers();
    structures.push({ kind: "core", team: 0, lane: "mid", x: L.blue.x, y: L.blue.y });
    structures.push({ kind: "core", team: 1, lane: "mid", x: L.red.x, y: L.red.y });

    /* ===== Jungle =====
     * Two camps per quadrant per side, tucked into the wedges between the
     * mid lane and each flank. Four per side total. Placement is off every
     * lane corridor by more than laneHalf, which the map test asserts - a
     * camp sitting on the lane would be free gold for whoever farms the wave
     * instead of paying for the detour. */
    var CAMPS = [
        { team: 0, x: 2450, y: 4100, kind: "husk" },
        { team: 0, x: 4100, y: 2450, kind: "husk" },
        { team: 0, x: 2180, y: 4180, kind: "chamber" },
        { team: 0, x: 4180, y: 2180, kind: "chamber" },
        { team: 1, x: 4550, y: 2900, kind: "husk" },
        { team: 1, x: 2900, y: 4550, kind: "husk" },
        { team: 1, x: 5480, y: 2380, kind: "chamber" },
        { team: 1, x: 2380, y: 5480, kind: "chamber" }
    ];

    /* Keep the map inside its own box. Units are clamped rather than walled:
     * an invisible wall at the very edge of a lane nobody ever visits is
     * cheaper than a collision system and cannot be seen. */
    function clampToMap(p) {
        var m = 90;
        p.x = S.clamp(p.x, m, SIZE - m);
        p.y = S.clamp(p.y, m, SIZE - m);
        return p;
    }

    S.Map = {
        size: SIZE,
        mid: MID,
        lanes: lanes,
        laneNames: ["top", "mid", "bot"],
        bases: bases,
        structures: structures,
        camps: CAMPS,
        reliquary: RELIQUARY,
        towerQuarter: TOWER_Q,

        polyDist2: polyDist2,
        nearestLane: nearestLane,
        isOnLane: isOnLane,
        terrainSpeed: terrainSpeed,
        riverDepth: riverDepth,
        inRiver: inRiver,
        lanePointAt: lanePointAt,
        clampToMap: clampToMap,

        /* A point partway along a lane from `t`, in either direction. Used by
         * wave spawning, AI lane walking and the "go here" pings. */
        pointOn: function (laneName, t) { return lanePointAt(laneName, t); },

        /* The progress value of a unit along its lane, 0 at the blue end and
         * 1 at the red end. Minions use it to decide who is winning the push
         * and whether to keep walking or start hitting structures. */
        laneProgress: function (laneName, x, y) {
            var pts = lanes[laneName];
            var total = 0, segs = [], i;
            for (i = 0; i < pts.length - 1; i++) {
                var len = S.dist(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
                segs.push(len);
                total += len;
            }
            /* Walk the polyline accumulating, keeping the closest point's
             * fraction. Sampling the nearest segment only would be wrong on a
             * lane where two legs pass close to each other. */
            var bestD = Infinity, bestT = 0, walked = 0;
            for (i = 0; i < pts.length - 1; i++) {
                var a = pts[i], b = pts[i + 1];
                var dx = b.x - a.x, dy = b.y - a.y;
                var len2 = dx * dx + dy * dy;
                var t = len2 < 1e-6 ? 0 : S.clamp01(((x - a.x) * dx + (y - a.y) * dy) / len2);
                var px = a.x + dx * t, py = a.y + dy * t;
                var d = S.dist2(x, y, px, py);
                if (d < bestD) {
                    bestD = d;
                    bestT = (walked + Math.sqrt(len2) * t) / total;
                }
                walked += Math.sqrt(len2);
            }
            return bestT;
        },

        /* A team's own half is progress < 0.5 for blue and > 0.5 for red. Used
         * by AI retreat logic and by the "safe to push" check. */
        inOwnHalf: function (laneName, x, y, team) {
            var p = S.Map.laneProgress(laneName, x, y);
            return team === 0 ? p < 0.5 : p > 0.5;
        }
    };

})(window.IF = window.IF || {});
