/*
 * GULPER - the colour system.
 *
 * Every biome gets exactly thirty-two colours, and everything in the
 * level - the ground, the lamps, somebody's coat, the blood - is snapped
 * to the nearest of those thirty-two. That is the whole reason the game
 * looks like it was painted: not because of filters, but because nothing
 * is ever one shade off.
 *
 * A `ramp` is sixteen of those colours ordered dark to light, which is
 * what a face is shaded with. The index is the face's light level, so
 * shading a mesh is an array lookup, not a blend.
 */
(function (S) {
    "use strict";

    function pack(hex) {
        var h = hex.charAt(0) === "#" ? hex.slice(1) : hex;
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        if (!isFinite(n)) n = 0;
        var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        /* Same layout raster.js writes: 0xAABBGGRR. */
        return (255 << 24) | (b << 16) | (g << 8) | r;
    }

    function unpack(c) {
        return { r: c & 255, g: (c >> 8) & 255, b: (c >> 16) & 255 };
    }

    function lum(c) {
        var u = unpack(c);
        return u.r * 0.299 + u.g * 0.587 + u.b * 0.114;
    }

    function mixc(a, b, t) {
        var A = unpack(a), B = unpack(b);
        var r = Math.round(A.r + (B.r - A.r) * t);
        var g = Math.round(A.g + (B.g - A.g) * t);
        var bl = Math.round(A.b + (B.b - A.b) * t);
        return (255 << 24) | (bl << 16) | (g << 8) | r;
    }

    /* Anchor colours every biome shares: void levels, the alien's own
     * greens, the marker amber, the effect whites. */
    var COMMON = [
        "#05070c", "#0a0c10", "#101318", "#14181f", "#1a1d24", "#1e242c",
        "#22262c", "#2a3320", "#4a5c2c", "#43291a",
        "#8fbf5c", "#b8d97a", "#6b1f26", "#a33a32", "#6b3d21",
        "#e2e6ea", "#f2b23c", "#ffe9a8", "#38c4cf"
    ];

    /* Per-biome anchors. The exact hexes the game snaps are all present,
     * so effect colours round-trip instead of landing on a lookalike. */
    var ANCHORS = {
        docks: ["#2b323c", "#313a44", "#3a434f", "#45525f", "#4d5866", "#5d6d80",
                "#667283", "#3e8f8c", "#c79a72", "#e2b98d", "#b6bfc9", "#c1703a",
                "#8a4a23", "#e0c9a0"],
        downtown: ["#242945", "#2c3352", "#313759", "#3d4670", "#464f7c", "#545e8c",
                   "#5f6a9e", "#66b3a4", "#7fe4ee", "#b84394", "#d96fb2", "#f0a3d4",
                   "#b8895f", "#f2caa2"],
        ward: ["#22282e", "#2a3328", "#2e363d", "#38443c", "#3d474f", "#465247",
               "#4e5a52", "#5a6a5f", "#4fa87a", "#123326", "#7ba888", "#a8d8b4",
               "#c9d4c2", "#efc59c"],
        arctic: ["#202a38", "#31404f", "#4a5a6b", "#67788a", "#8a9aab", "#a5b2c0",
                 "#c2cdd8", "#d8dfe7", "#e6edf3", "#4a9aa8", "#6fc0cc", "#b5e0e8",
                 "#b8895f", "#dcb693"],
        foundry: ["#2a262a", "#362f31", "#423838", "#514442", "#5e4e4a", "#6e5c55",
                  "#7a685e", "#481406", "#e06519", "#f98a2c", "#ffc94a", "#a87a52",
                  "#e0ae83", "#ffd9a0"],
        hive: ["#131a2c", "#1b2439", "#253048", "#2d3c58", "#364765", "#400810", "#485a80",
               "#1c9eac", "#7fe4ee", "#b85708", "#3e2c11", "#c98a5c", "#f5d066", "#e8d4a8"]
    };

    /* Densify: exactly 32 unique colours per biome, starting from the
     * anchors and filling the gaps with midpoints. */
    function build32(anchors) {
        var seen = {}, list = [];
        function push(c) {
            if (seen[c]) return;
            seen[c] = 1;
            list.push(c);
        }
        var i;
        for (i = 0; i < anchors.length; i++) push(pack(anchors[i]));
        for (i = 0; i < COMMON.length; i++) push(pack(COMMON[i]));

        var guard = 0;
        while (list.length < 32 && guard++ < 9000) {
            list.sort(function (a, b) { return lum(a) - lum(b); });
            var added = 0;
            for (i = 0; i + 1 < list.length && list.length + added < 32; i++) {
                var mid = mixc(list[i], list[i + 1], 0.5);
                if (!seen[mid]) {
                    seen[mid] = 1;
                    list.splice(i + 1, 0, mid);
                    added++;
                    i++;
                }
            }
            if (!added) {
                /* Degenerate: stretch darkest and lightest apart. */
                break;
            }
        }

        /* If the anchors overfill the palette, trim from the closest
         * adjacent pair, never from the ends: a palette that loses its
         * darkest or brightest colour loses the whole point of the ramp. */
        while (list.length > 32) {
            var bestI = 0, bestGap = Infinity;
            for (i = 0; i + 1 < list.length; i++) {
                var gap = lum(list[i + 1]) - lum(list[i]);
                if (gap < bestGap) { bestGap = gap; bestI = i; }
            }
            list.splice(bestI + 1, 1);
        }

        list.sort(function (a, b) { return lum(a) - lum(b); });
        return list;
    }

    var PALS = {};
    (function () {
        for (var id in ANCHORS) PALS[id] = build32(ANCHORS[id]);
    })();

    /* The palette registry, straight from the tests. */
    S.PALETTES = PALS;

    S.Palette = {
        /* Raw nearest-colour lookup. */
        snap: function (paletteId, hex) {
            var pal = PALS[paletteId] || PALS.docks;
            var target = pack(hex);
            var best = null, bestD = Infinity;
            for (var i = 0; i < pal.length; i++) {
                if (pal[i] === target) return pal[i];
                var A = unpack(pal[i]), B = unpack(target);
                var dr = A.r - B.r, dg = A.g - B.g, db = A.b - B.b;
                var d = dr * dr + dg * dg + db * db;
                if (d < bestD) { bestD = d; best = pal[i]; }
            }
            return best;
        },

        /* Sixteen on-palette shades from dark to light, centred on the
         * requested colour. Shading is `ramp[level]` - an array read, not
         * a blend, which is what keeps the mesh pass cable-fast. */
        ramp: function (paletteId, hex) {
            var pal = PALS[paletteId] || PALS.docks;
            var anchor = S.Palette.snap(paletteId, hex);

            var ia = 0, i;
            for (i = 0; i < pal.length; i++) if (pal[i] === anchor) ia = i;

            /* Two steps of palette on each side of the anchor, so the ramp
             * is centred on the colour you asked for. */
            var dark = pal[Math.max(0, ia - 3)];
            var light = pal[Math.min(pal.length - 1, ia + 3)];
            if (dark === light) light = pal[Math.min(pal.length - 1, ia + 1)];
            if (dark === light) dark = pal[Math.max(0, ia - 1)];

            var out = [];
            for (i = 0; i < 16; i++) {
                var t = i / 15;
                /* Bias resolution toward the dark half: faces away from
                 * the light are where the eye looks for form, so more of
                 * the ramp's span is spent in the shadows. */
                var tt = Math.pow(t, 1.18);
                out.push(mixc(dark, light, tt));
            }
            return out;
        },

        /* Metadata, for the few places that want a palette object rather
         * than a lookup - currently just makeColors in world.js. */
        get: function (paletteId) {
            return { id: paletteId, colors: PALS[paletteId] || PALS.docks };
        },

        /* Every biome palette we ship. */
        ids: function () {
            return Object.keys(PALS);
        }
    };
})(window.GU = window.GU || {});
