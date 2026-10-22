/*
 * GULPER - biomes.
 *
 * Six places, each with its own palette, its own scenery, its own weather
 * and its own idea of where the lights are. A biome is not a skin: the
 * docks have cover and long sightlines, the downtown has open street and
 * crowds, the ward has corridors, the rig has darkness, the foundry has
 * heat, and the hive has no floor at all.
 */
(function (S) {
    "use strict";

    S.Biomes = {
        docks: {
            id: "docks", name: "Rust Docks", palette: "docks",
            sky: ["#0a0c10", "#2b323c"],
            ground: "#3a434f", ground2: "#2b323c",
            accent: "#c1703a", lamp: "#f2b23c", lampGlow: "#ffe9a8",
            /* How much of the ground is visible in the dark. Zero means the
             * level is lit only by its lamps. */
            darkness: 0.35,
            fog: 0.18,
            /* Multipliers applied to everything in this biome. */
            noise: 1.0, density: 1.0, speed: 1.0,
            props: { container: 14, crate: 16, barrel: 10, lamp: 8, rubble: 8 },
            hazards: { fence: 3, vent: 0 },
            brief: "Salt, diesel and fog. The cranes have not moved in years."
        },
        downtown: {
            id: "downtown", name: "Neon Downtown", palette: "downtown",
            sky: ["#05060d", "#242945"],
            ground: "#313759", ground2: "#242945",
            accent: "#b84394", lamp: "#66b3a4", lampGlow: "#7fe4ee",
            darkness: 0.28,
            fog: 0.1,
            noise: 1.25, density: 1.2, speed: 1.0,
            props: { container: 0, crate: 10, barrel: 8, lamp: 14, rubble: 4, console: 6 },
            hazards: { fence: 0, vent: 0 },
            brief: "The signs are always on. Everything is always awake."
        },
        ward: {
            id: "ward", name: "Quarantine Ward", palette: "ward",
            sky: ["#080a0c", "#22282e"],
            ground: "#3d474f", ground2: "#2e363d",
            accent: "#4fa87a", lamp: "#e6edf3", lampGlow: "#ffffff",
            darkness: 0.22,
            fog: 0.08,
            noise: 0.85, density: 0.9, speed: 1.0,
            props: { container: 0, crate: 14, barrel: 10, lamp: 16, rubble: 0, console: 12, pillar: 10 },
            hazards: { fence: 4, vent: 0 },
            brief: "Clean floors. Everything the floors have seen went in a bag."
        },
        arctic: {
            id: "arctic", name: "Arctic Rig", palette: "arctic",
            sky: ["#05070c", "#202a38"],
            ground: "#e6edf3", ground2: "#c2cdd8",
            accent: "#4a9aa8", lamp: "#e6edf3", lampGlow: "#ffffff",
            darkness: 0.62,
            fog: 0.42,
            noise: 0.9, density: 0.75, speed: 1.0,
            props: { container: 14, crate: 20, barrel: 16, lamp: 8, rubble: 12, console: 4 },
            hazards: { fence: 2, vent: 0 },
            brief: "Minus forty. The lights are the only thing that works."
        },
        foundry: {
            id: "foundry", name: "Foundry", palette: "foundry",
            sky: ["#070607", "#2a262a"],
            ground: "#383136", ground2: "#2a262a",
            accent: "#e06519", lamp: "#f98a2c", lampGlow: "#ffc94a",
            darkness: 0.3,
            fog: 0.24,
            noise: 1.15, density: 0.95, speed: 1.0,
            props: { container: 8, crate: 12, barrel: 14, lamp: 6, rubble: 10, console: 6, pillar: 6 },
            hazards: { fence: 2, vent: 5, spill: 2 },
            brief: "The floor is hot enough to melt a boot. It has melted worse."
        },
        hive: {
            id: "hive", name: "Orbital Hive", palette: "hive",
            sky: ["#04050a", "#131a2c"],
            ground: "#253048", ground2: "#1b2439",
            accent: "#1c9eac", lamp: "#38c4cf", lampGlow: "#7fe4ee",
            darkness: 0.4,
            fog: 0.05,
            noise: 1.0, density: 0.95, speed: 1.0,
            /* The hive is the one place with no gravity worth speaking of. */
            lowG: 0.72,
            props: { container: 10, crate: 12, barrel: 8, lamp: 10, rubble: 6, console: 8, pillar: 10 },
            hazards: { fence: 3, vent: 0, spill: 1 },
            brief: "Ninety minutes of orbit. Everything drifts, including you."
        },
        cathedral: {
            id: "cathedral", name: "Sunken Cathedral", palette: "cathedral",
            sky: ["#04030a", "#1a1224"],
            ground: "#2a2236", ground2: "#1e1828",
            accent: "#c9a84a", lamp: "#e8d4a8", lampGlow: "#f5e8c8",
            darkness: 0.5,
            fog: 0.12,
            noise: 0.95, density: 1.0, speed: 0.95,
            props: { container: 2, crate: 4, barrel: 2, lamp: 8, rubble: 2, console: 4, pillar: 6 },
            hazards: { fence: 1, vent: 0, spill: 0 },
            brief: "The nave is still lit. Something is still singing."
        }
    };

    /* Footprints of the props, so the layout can keep them from
     * overlapping and the collision code knows how big they are. */
    var FOOTPRINT = {
        container: { r: 23, solid: true },
        crate: { r: 11, solid: true },
        barrel: { r: 8, solid: true },
        pillar: { r: 8, solid: true },
        console: { r: 11, solid: true },
        lamp: { r: 4, solid: false, light: true },
        rubble: { r: 9, solid: false }
    };

    /*
     * Place the scenery.
     *
     * The centre of the arena is kept clear because that is where the
     * player starts, and because a level that begins with a container in
     * your face is a level that begins badly.
     */
    S.Biomes.layout = function (biomeId, rng, arena, density) {
        var b = S.Biomes[biomeId];
        var props = [];
        if (!b) return props;

        var kinds = ["container", "crate", "barrel", "pillar", "console", "rubble"];
        var plan = b.props;
        var mult = (density === undefined ? 1 : density);

        for (var ki = 0; ki < kinds.length; ki++) {
            var kind = kinds[ki];
            var count = Math.round((plan[kind] || 0) * mult);
            for (var i = 0; i < count; i++) {
                var fp = FOOTPRINT[kind];
                var pos = null;
                /* Try a few times for a spot that is not on top of
                 * something else. A couple of overlaps are fine; they read
                 * as clutter rather than as a bug. */
                for (var attempt = 0; attempt < 8; attempt++) {
                    var cand = rng.inRect(arena.x + 30, arena.y + 30, arena.w - 60, arena.h - 60);
                    if (S.dist(cand.x, cand.y, arena.x + arena.w / 2, arena.y + arena.h / 2) < 110) continue;
                    var ok = true;
                    for (var p = 0; p < props.length; p++) {
                        var q = props[p];
                        if (S.dist(cand.x, cand.y, q.x, q.y) < fp.r + q.r + 6) { ok = false; break; }
                    }
                    if (ok) { pos = cand; break; }
                }
                if (!pos) pos = rng.inRect(arena.x + 30, arena.y + 30, arena.w - 60, arena.h - 60);
                props.push({
                    kind: kind, x: pos.x, y: pos.y,
                    r: fp.r, solid: !!fp.solid, light: !!fp.light,
                    /* A small visual rotation so a row of crates does not
                     * look like a spreadsheet. */
                    rot: rng.range(-0.35, 0.35),
                    tint: rng.int(0, 3)
                });
            }
        }

        /* Lamps are placed after everything else, on the emptiest ground,
         * because they are the thing players navigate by. */
        var lamps = Math.round((plan.lamp || 0) * mult);
        for (var l = 0; l < lamps; l++) {
            var lp = null;
            for (var attempt2 = 0; attempt2 < 12; attempt2++) {
                var c2 = rng.inRect(arena.x + 40, arena.y + 40, arena.w - 80, arena.h - 80);
                var near = false;
                for (var p2 = 0; p2 < props.length; p2++) {
                    if (S.dist(c2.x, c2.y, props[p2].x, props[p2].y) < props[p2].r + 46) { near = true; break; }
                }
                if (!near) { lp = c2; break; }
            }
            if (!lp) lp = rng.inRect(arena.x + 40, arena.y + 40, arena.w - 80, arena.h - 80);
            props.push({
                kind: "lamp", x: lp.x, y: lp.y, r: FOOTPRINT.lamp.r,
                solid: false, light: true, rot: 0, tint: 0
            });
        }

        /* Hazards. */
        var haz = b.hazards || {};
        var hazards = [];
        var hcount = Math.round((haz.fence || 0) * mult);
        for (var f = 0; f < hcount; f++) {
            var horizontal = rng.chance(0.5);
            var len = rng.range(180, 420);
            var hx = rng.range(arena.x + 80, arena.x + arena.w - 80);
            var hy = rng.range(arena.y + 80, arena.y + arena.h - 80);
            hazards.push({
                kind: "fence", horizontal: horizontal,
                x: hx, y: hy, len: len, t: 0, phase: rng.range(0, 4)
            });
        }
        var vcount = Math.round((haz.vent || 0) * mult);
        for (var v = 0; v < vcount; v++) {
            hazards.push({
                kind: "vent",
                x: rng.range(arena.x + 70, arena.x + arena.w - 70),
                y: rng.range(arena.y + 70, arena.y + arena.h - 70),
                r: rng.range(22, 34), t: rng.range(0, 6), period: rng.range(3.5, 6.5)
            });
        }
        var scount = Math.round((haz.spill || 0) * mult);
        for (var s = 0; s < scount; s++) {
            hazards.push({
                kind: "spill",
                x: rng.range(arena.x + 90, arena.x + arena.w - 90),
                y: rng.range(arena.y + 90, arena.y + arena.h - 90),
                r: rng.range(34, 52), t: 0
            });
        }

        return { props: props, hazards: hazards };
    };

    /* The footprint table is exported so the world code can resolve
     * collisions without re-asking the biome. */
    S.Biomes.footprint = FOOTPRINT;

    S.Biomes.list = function () {
        var out = [];
        for (var k in S.Biomes) {
            if (S.Biomes[k] && S.Biomes[k].id) out.push(S.Biomes[k]);
        }
        return out;
    };
})(window.GU = window.GU || {});
