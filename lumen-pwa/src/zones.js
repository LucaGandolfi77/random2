/*
 * LUMEN - depth zones.
 *
 * Four horizontal bands stacked down the map. Shallows are bright but thin on
 * food; the trenches are dark but rich, and packed with things that sting.
 *
 * Bands drive generation (what lives where), rendering (the colour of the
 * darkness itself) and the HUD depth meter, so one table stays the single
 * source of truth for the world's vertical identity.
 */
(function (L) {
    "use strict";

    /* `tint` is the colour of the darkness overlay, not a background. Deeper
     * water is both darker and shifted toward violet, which reads instantly
     * even through the fog. */
    var BANDS = [
        {
            name: "Sunlit", y0: 0.00, y1: 0.25,
            tint: "#0d2f42", accent: "#5fd6ff",
            food: 1.45, krill: 1.00, wreck: 1.20, jelly: 0.45, angler: 0.50,
            blurb: "Bright, empty water",
        },
        {
            name: "Twilight", y0: 0.25, y1: 0.50,
            tint: "#071a30", accent: "#4fa8ff",
            food: 1.15, krill: 1.10, wreck: 1.00, jelly: 1.00, angler: 0.90,
            blurb: "The light gives out",
        },
        {
            name: "Midnight", y0: 0.50, y1: 0.75,
            tint: "#050f26", accent: "#8f7bff",
            food: 0.90, krill: 1.20, wreck: 0.95, jelly: 1.45, angler: 1.30,
            blurb: "Something watches you back",
        },
        {
            name: "Trenches", y0: 0.75, y1: 1.00,
            tint: "#0b0519", accent: "#ff4fd8",
            food: 0.60, krill: 1.35, wreck: 0.90, jelly: 1.90, angler: 1.80,
            blurb: "Nowhere left to hide",
        },
    ];

    /* Width of the smooth crossfade between adjacent bands, in world px. */
    var BLEND = 260;

    function count() { return BANDS.length; }

    /* Raw band index for a y position. */
    function bandIndexAt(y, size) {
        var f = size > 0 ? y / size : 0;
        if (f < 0) f = 0;
        if (f > 0.9999) f = 0.9999;
        for (var i = 0; i < BANDS.length; i++) {
            if (f < BANDS[i].y1) return i;
        }
        return BANDS.length - 1;
    }

    function bandAt(y, size) { return BANDS[bandIndexAt(y, size)]; }

    function depthFraction(y, size) {
        var f = size > 0 ? y / size : 0;
        return f < 0 ? 0 : f > 1 ? 1 : f;
    }

    /* ---- colour helpers ---- */
    function hexToRgb(h) {
        var s = h.replace("#", "");
        if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
        var n = parseInt(s, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function rgbToHex(r, g, b) {
        var v = (1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b);
        return "#" + v.toString(16).slice(1);
    }

    function mixHex(a, b, t) {
        if (t <= 0) return a;
        if (t >= 1) return b;
        var ca = hexToRgb(a), cb = hexToRgb(b);
        return rgbToHex(
            ca[0] + (cb[0] - ca[0]) * t,
            ca[1] + (cb[1] - ca[1]) * t,
            ca[2] + (cb[2] - ca[2]) * t
        );
    }

    /* Smoothstep, for band-edge crossfades. */
    function smooth(t) { return t * t * (3 - 2 * t); }

    /* Blend factor toward the next band, 0 away from any boundary. */
    function edgeBlend(y, size) {
        var idx = bandIndexAt(y, size);
        var band = BANDS[idx];

        /* The deepest band has a boundary above it but none below. */
        if (idx >= BANDS.length - 1) {
            var fromTop = y - band.y0 * size;
            return fromTop >= BLEND ? 0 : smooth(1 - fromTop / BLEND);
        }

        var span = (band.y1 - band.y0) * size;
        if (span <= 0) return 0;
        var into = y - band.y0 * size;
        var toBottom = span - into;
        var nearest = into < toBottom ? into : toBottom;
        return nearest >= BLEND ? 0 : smooth(1 - nearest / BLEND);
    }

    function darknessFor(y, size) {
        var idx = bandIndexAt(y, size);
        if (idx >= BANDS.length - 1) return BANDS[idx].tint;
        var t = edgeBlend(y, size);
        return mixHex(BANDS[idx].tint, BANDS[idx + 1].tint, t);
    }

    function accentFor(y, size) {
        var idx = bandIndexAt(y, size);
        if (idx >= BANDS.length - 1) return BANDS[idx].accent;
        var t = edgeBlend(y, size);
        return mixHex(BANDS[idx].accent, BANDS[idx + 1].accent, t);
    }

    /* ---- generation ---- */
    /* Pick a y inside a band chosen by weight, so densities are authored per
     * zone instead of falling out of uniform randomness. */
    function pickBandY(weightKey, size, rand, pad) {
        var total = 0, i;
        for (i = 0; i < BANDS.length; i++) {
            total += (weightKey in BANDS[i]) ? BANDS[i][weightKey] : 1;
        }
        var r = rand() * total;
        var chosen = BANDS[BANDS.length - 1];
        for (i = 0; i < BANDS.length; i++) {
            var w = (weightKey in BANDS[i]) ? BANDS[i][weightKey] : 1;
            if (r < w) { chosen = BANDS[i]; break; }
            r -= w;
        }

        var top = chosen.y0 * size + (pad || 0);
        var bottom = chosen.y1 * size - (pad || 0);
        if (bottom <= top) return L.clamp(top, pad || 0, size - (pad || 0));
        return top + rand() * (bottom - top);
    }

    L.Zones = {
        BANDS: BANDS,
        BLEND: BLEND,
        count: count,
        bandIndexAt: bandIndexAt,
        bandAt: bandAt,
        depthFraction: depthFraction,
        darknessFor: darknessFor,
        accentFor: accentFor,
        pickBandY: pickBandY,
        mixHex: mixHex,
    };

})(window.LUMEN = window.LUMEN || {});
