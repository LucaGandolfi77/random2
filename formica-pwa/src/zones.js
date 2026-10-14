/*
 * FORMICA - zone del tavolo.
 *
 * Il tavolo è diviso in quattro quadranti, ognuna con la sua identità: cosa
 * ci cade, quanto è pericolosa, e di che colore è il legno. La zona guida la
 * generazione (cosa vive dove), il rendering (la tinta del legno) e l'HUD,
 * così una sola tabella resta la fonte di verità della geografia del tavolo.
 */
(function (L) {
    "use strict";

    /* tinta: di che colore è il legno in quella zona. Non è uno sfondo: è una
     * sfumatura sopra la grana, per rendere leggibili i confini. */
    var ZONES = [
        {
            name: "Angolo del Pane", x0: 0.00, y0: 0.00, x1: 0.50, y1: 0.50,
            tint: "#a5814f", accent: "#ffcc80",
            crumbs: 1.55, sugars: 0.65, bugs: 1.20, drops: 0.70, ink: 0.60, pebbles: 1.10,
            blurb: "Briciole dappertutto",
        },
        {
            name: "Macchia d'Inchiostro", x0: 0.50, y0: 0.00, x1: 1.00, y1: 0.50,
            tint: "#4a3550", accent: "#b39ddb",
            crumbs: 0.55, sugars: 0.50, bugs: 0.80, drops: 0.90, ink: 2.10, pebbles: 1.30,
            blurb: "Il legno è macchiato",
        },
        {
            name: "Zona d'Ombra", x0: 0.00, y0: 0.50, x1: 0.50, y1: 1.00,
            tint: "#5f4a38", accent: "#bcaaa4",
            crumbs: 0.80, sugars: 0.80, bugs: 0.70, drops: 0.60, ink: 0.70, pebbles: 0.90,
            blurb: "Poche razzie, poco da mangiare",
        },
        {
            name: "Tavola Calda", x0: 0.50, y0: 0.50, x1: 1.00, y1: 1.00,
            tint: "#96684a", accent: "#ffab91",
            crumbs: 0.95, sugars: 1.85, bugs: 1.05, drops: 1.20, ink: 0.60, pebbles: 0.80,
            blurb: "Zucchero, e razzie più spesso",
        },
    ];

    /* Larghezza della sfumatura al confine, in px mondo. */
    var BLEND = 420;

    /* Indice grezzo della zona per un punto. */
    function zoneIndexAt(x, y, w, h) {
        var fx = w > 0 ? x / w : 0;
        var fy = h > 0 ? y / h : 0;
        if (fx < 0) fx = 0;
        if (fy < 0) fy = 0;
        if (fx > 0.9999) fx = 0.9999;
        if (fy > 0.9999) fy = 0.9999;
        var col = fx < 0.5 ? 0 : 1;
        var row = fy < 0.5 ? 0 : 1;
        return row * 2 + col;
    }

    function zoneAt(x, y, w, h) { return ZONES[zoneIndexAt(x, y, w, h)]; }

    /* ---- colori ---- */
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

    /* Smoothstep per le sfumature ai confini. */
    function smooth(t) { return t * t * (3 - 2 * t); }

    /* Quanto siamo vicini a un confine interno (dove fx o fy attraversano
     * 0.5): 0 lontano, 1 sopra il taglio. */
    function edgeBlend(x, y, w, h) {
        var toCrossX = Math.abs((x / w - 0.5) * w);
        var toCrossY = Math.abs((y / h - 0.5) * h);
        var near = Math.max(BLEND - toCrossX, BLEND - toCrossY);
        return smooth(L.clamp(near / BLEND, 0, 1));
    }

    function tintFor(x, y, w, h) {
        var z = ZONES[zoneIndexAt(x, y, w, h)];
        var t = edgeBlend(x, y, w, h);
        if (t <= 0) return z.tint;
        /* Confiniamo con l'adiacente sul lato sinistro/destro, sopra/sotto. */
        var fx = x / w, fy = y / h;
        var col = fx < 0.5 ? 0 : 1;
        var row = fy < 0.5 ? 0 : 1;
        var other;
        if (toCrossCloser(x, y, w, h) === "x") other = ZONES[row * 2 + (col === 0 ? 1 : 0)];
        else other = ZONES[(row === 0 ? 1 : 0) * 2 + col];
        return mixHex(z.tint, other.tint, t);
    }

    function toCrossCloser(x, y, w, h) {
        var tx = Math.abs((x / w - 0.5) * w);
        var ty = Math.abs((y / h - 0.5) * h);
        return tx < ty ? "x" : "y";
    }

    function accentFor(x, y, w, h) {
        return ZONES[zoneIndexAt(x, y, w, h)].accent;
    }

    /* ---- generazione ---- */
    /* Sceglie un punto dentro una zona pesata, così le densità sono decise
     * per zona invece di cadere uniformi a caso. */
    function pickZoneXY(weightKey, w, h, rand, pad) {
        var total = 0, i;
        for (i = 0; i < ZONES.length; i++) {
            total += (weightKey in ZONES[i]) ? ZONES[i][weightKey] : 1;
        }
        var r = rand() * total;
        var chosen = ZONES[ZONES.length - 1];
        for (i = 0; i < ZONES.length; i++) {
            var wgt = (weightKey in ZONES[i]) ? ZONES[i][weightKey] : 1;
            if (r < wgt) { chosen = ZONES[i]; break; }
            r -= wgt;
        }
        return {
            x: chosen.x0 * w + (chosen.x1 - chosen.x0) * w * (0.04 + rand() * 0.92),
            y: chosen.y0 * h + (chosen.y1 - chosen.y0) * h * (0.04 + rand() * 0.92),
        };
    }

    /* ---- giorno/notte ---- */
    /* 0 = pieno giorno, 1 = notte fonda. Il calare è graduale e leggibile. */
    function nightAmount(t, phase) {
        var dayStart = L.CONFIG.day.nightStart;
        if (phase < dayStart) return 0;
        var f = (phase - dayStart) / (1 - dayStart);
        /* sale per 35% del tempo di notte, resta alta, poi scende */
        if (f < 0.35) return smooth(f / 0.35);
        if (f < 0.8) return 1;
        return smooth(1 - (f - 0.8) / 0.2);
    }

    L.Zones = {
        ZONES: ZONES,
        BLEND: BLEND,
        zoneIndexAt: zoneIndexAt,
        zoneAt: zoneAt,
        tintFor: tintFor,
        accentFor: accentFor,
        pickZoneXY: pickZoneXY,
        mixHex: mixHex,
        nightAmount: nightAmount,
    };

})(window.FORMICA = window.FORMICA || {});
