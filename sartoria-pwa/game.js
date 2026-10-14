/* =========================================================================
 * SARTORIA — couture tycoon
 *
 * Un atelier che parte da un sottoscala e arriva alla settimana della moda.
 * Vesti i manichini, guadagni fama, e ogni stagione puoi fare UNA sfilata.
 *
 * No build step. No dependencies. No art assets: il manichino, la passerella,
 * il pubblico e le luci sono disegnati su canvas da primitive box/prism, con
 * la stessa proiezione obliqua usata in sector7 (yaw-shear + back-face culling
 * sul vettore di vista). I PNG delle icone sono l'unica cosa committata che
 * non è testo, e sono generati da script.
 *
 * La risorsa scarsa non sono i soldi: è la STAGIONE. Una collezione per
 * stagione per città, e il pronostico dei trend è rumoroso. Scommettere sul
 * tag sbagliato costa una stagione intera.
 * ===================================================================== */

(function () {
    "use strict";

    /* ===== Palette =====
     * I colori sono la meccanica, non la decorazione: l'armonia è calcolata
     * sulla ruota, quindi ogni tinta ha una tinta (hue) reale. */
    var COLORS = {
        nero:     { hex: "#1b1b20", hue: 260, name: "Nero" },
        avorio:   { hex: "#f0e6d2", hue: 42,  name: "Avorio" },
        cremisi:  { hex: "#b3243c", hue: 350, name: "Cremisi" },
        cobalto:  { hex: "#2b52b8", hue: 222, name: "Cobalto" },
        smeraldo: { hex: "#178a5e", hue: 158, name: "Smeraldo" },
        zafferano:{ hex: "#e0a021", hue: 38,  name: "Zafferano" },
        viola:    { hex: "#6d3aa8", hue: 276, name: "Viola" },
        ruggine:  { hex: "#a8552a", hue: 20,  name: "Ruggine" },
        turchese: { hex: "#1f9aa8", hue: 186, name: "Turchese" },
        rosa:     { hex: "#d97a9c", hue: 338, name: "Rosa" }
    };
    var COLOR_KEYS = Object.keys(COLORS);

    /* ===== Stili =====
     * Il vocabolario con cui parlano brief, temi e trend. Otto tag, e un capo
     * ne porta uno o due: un abito può essere elegante E minimal, che è già
     * una scelta di design. */
    var TAGS = ["elegante", "casual", "street", "punk", "vintage", "etnico", "minimal", "barocco"];

    /* ===== Tessuti =====
     * Ognuno moltiplica il punteggio e ha un costo. `sheen` è quanto la luce
     * si diffonde sulla faccia del prisma: la seta brilla, il cotone no. */
    var FABRICS = {
        cotone:   { name: "Cotone",   cost: 4,   mult: 1.00, sheen: 0.05 },
        lino:     { name: "Lino",     cost: 9,   mult: 1.06, sheen: 0.08 },
        tecnico:  { name: "Tecnico",  cost: 22,  mult: 1.14, sheen: 0.22 },
        seta:     { name: "Seta",     cost: 48,  mult: 1.26, sheen: 0.40 },
        velluto:  { name: "Velluto",  cost: 95,  mult: 1.38, sheen: 0.14 },
        pelle:    { name: "Pelle",    cost: 160, mult: 1.52, sheen: 0.30 },
        ricamo:   { name: "Ricamo",   cost: 320, mult: 1.70, sheen: 0.55 }
    };
    var FABRIC_KEYS = Object.keys(FABRICS);

    /* ===== Slot =====
     * Sei slot, ognuno con il suo ancoraggio sul manichino. */
    var SLOTS = [
        { key: "head",  name: "TESTA" },
        { key: "torso", name: "BUSTO" },
        { key: "legs",  name: "GAMBE" },
        { key: "feet",  name: "PIEDI" },
        { key: "hands", name: "MANI" },
        { key: "outer", name: "ESTERNO" }
    ];

    var SAVE_KEY = "sartoria.v1.save";

    /* ===== Geometria del manichino =====
     * Unità: circa 4mm. Una figura alta ~46, una passerella larga ~260.
     * Questi numeri sono il contratto tra il renderer e i capi: se cambi la
     * lunghezza delle gambe, i piedi staccano dalle scarpe. */
    var FIG = {
        legLen: 15, hipW: 9, hipD: 5.5, hipH: 4,
        torsoH: 11, torsoW: 11, torsoD: 6.5,
        shoulderW: 12.5, armLen: 13, armW: 2.6,
        headR: 3.4, headH: 4.6, neckH: 1.6
    };

    var TAU = Math.PI * 2;

    /* ===== Utilità ===== */
    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function fmt(n) {
        n = Math.round(n);
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    function hexToRgb(hex) {
        hex = String(hex || "").replace("#", "");
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        var n = parseInt(hex, 16);
        if (!isFinite(n)) return [200, 200, 200];
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
    function mixRgb(a, b, t) {
        return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)),
                Math.round(lerp(a[2], b[2], t))];
    }
    function hashStr(s) {
        var h = 2166136261;
        for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
    }

    /* Le stringhe generate entrano in innerHTML: nomi dei clienti sono fissi,
     * ma i tag vengono costruiti a runtime. Un escape è più economico di una
     * policy CSP su una PWA offline. */
    function esc(s) {
        return String(s === undefined || s === null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
    /* RNG deterministico per seme: il calendario delle stagioni deve essere
     * riproducibile, o un giocatore che ricarica si trova un altro mondo. */
    function mulberry32(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6d2b79f5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* ===== Salvataggio =====
     * Stato piatto più una proiezione, come in sector7: il salvataggio è il
     * contratto, la partita è una vista sopra. */
    var save = null;

    function defaultSave() {
        return {
            v: 1,
            name: "",
            money: 120,
            fame: 0,
            xp: 0,
            level: 1,
            season: 1,
            day: 1,
            city: 0,
            /* Slot sbloccati: si parte con quattro, mani ed esterno arrivano
             * con il livello. Un atelier che dà subito tutto non insegna
             * niente a nessuno. */
            slots: ["head", "torso", "legs", "feet"],
            owned: [],          /* id dei capi posseduti */
            dyes: {},           /* colore -> quantità residua */
            wardrobe: [],       /* look salvati */
            models: [],
            commissions: [],
            sponsor: null,
            rivals: [],
            /* La risorsa scarsa: una sfilata per stagione. Questo flag è ciò
             * che la fa rispettare. */
            seasonShows: false,
            stats: { shows: 0, looks: 0, bestScore: 0, earned: 0 },
            log: []
        };
    }

    function load() {
        try {
            var raw = localStorage.getItem(SAVE_KEY);
            if (!raw) { save = defaultSave(); return; }
            var s = JSON.parse(raw);
            if (!s || s.v !== 1) { save = defaultSave(); return; }
            /* Merge difensivo: un salvataggio di una build precedente non deve
             * piantare il gioco con un campo mancante. */
            var d = defaultSave();
            for (var k in d) if (s[k] === undefined) s[k] = d[k];
            save = s;
        } catch (e) {
            save = defaultSave();
        }
    }

    function persist() {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* quota */ }
    }

    /* =========================================================================
     * PROGRESSIONE
     * ===================================================================== */

    /* Curva XP: lineare con esponente, così i primi livelli arrivano in pochi
     * minuti e l'ultimo è un lavoro. Il cancello non è un muro. */
    function xpForLevel(l) { return Math.round(70 * Math.pow(l, 1.45)); }

    function grantXp(n) {
        save.xp += n;
        var leveled = false;
        while (save.xp >= xpForLevel(save.level)) {
            save.xp -= xpForLevel(save.level);
            save.level++;
            leveled = true;
        }
        if (leveled) onLevelUp();
    }

    /* Gli sblocchi per livello. Ordinati, e ognuno dice cosa apre: la lista è
     * anche ciò che il pannello "obiettivi" mostra. */
    var UNLOCKS = [
        { lv: 1,  kind: "slot",   val: "hands",   text: "Slot MANI: guanti e accessori da polso" },
        { lv: 2,  kind: "tier",   val: 2,         text: "Capi di livello 2 in guardaroba" },
        { lv: 3,  kind: "fabric", val: "tecnico", text: "Tessuto TECNICO" },
        { lv: 4,  kind: "color",  val: "turchese",text: "Colore TURCHESE" },
        { lv: 5,  kind: "venue",  val: 0,         text: "Prima venue: sfilata TEMA" },
        { lv: 6,  kind: "slot",   val: "outer",   text: "Slot ESTERNO: cappotti e soprabiti" },
        { lv: 7,  kind: "tier",   val: 3,         text: "Capi di livello 3" },
        { lv: 8,  kind: "fabric", val: "seta",    text: "Tessuto SETA" },
        { lv: 10, kind: "tier",   val: 4,         text: "Capi di livello 4" },
        { lv: 12, kind: "city",   val: 1,         text: "Città: FIRENZE" },
        { lv: 14, kind: "fabric", val: "velluto", text: "Tessuto VELLUTO" },
        { lv: 16, kind: "tier",   val: 5,         text: "Capi di livello 5" },
        { lv: 18, kind: "show",   val: "collezione", text: "Sfilata COLLEZIONE" },
        { lv: 20, kind: "city",   val: 2,         text: "Città: PARIGI" },
        { lv: 22, kind: "fabric", val: "pelle",   text: "Tessuto PELLE" },
        { lv: 24, kind: "color",  val: "viola",   text: "Colore VIOLA" },
        { lv: 26, kind: "show",   val: "sfida",   text: "Sfilata SFIDA contro una rivale" },
        { lv: 28, kind: "city",   val: 3,         text: "Città: TOKYO" },
        { lv: 30, kind: "fabric", val: "ricamo",  text: "Tessuto RICAMO" },
        { lv: 32, kind: "show",   val: "benefico",text: "Sfilata BENEFICO: capi unici" },
        { lv: 36, kind: "city",   val: 4,         text: "Città: NEW YORK" },
        { lv: 40, kind: "city",   val: 5,         text: "Città: SHANGAI" }
    ];

    function unlocked(kind, val) {
        for (var i = 0; i < UNLOCKS.length; i++) {
            var u = UNLOCKS[i];
            if (u.kind === kind && u.val === val) return save.level >= u.lv;
        }
        return true;
    }

    function nextUnlocks(n) {
        return UNLOCKS.filter(function (u) { return save.level < u.lv; })
            .sort(function (a, b) { return a.lv - b.lv; }).slice(0, n || 3);
    }

    function onLevelUp() {
        /* Gli slot si aggiungono da soli: sono pochi e perdere il messaggio
         * sarebbe peggio che vederlo comparire. */
        for (var i = 0; i < UNLOCKS.length; i++) {
            var u = UNLOCKS[i];
            if (u.kind === "slot" && u.lv <= save.level && save.slots.indexOf(u.val) === -1) {
                save.slots.push(u.val);
            }
            if (u.kind === "color" && u.lv === save.level) {
                save.dyes[u.val] = (save.dyes[u.val] || 0) + 3;
            }
        }
        log("LIVELLO " + save.level, "Livello " + save.level + ": " +
            UNLOCKS.filter(function (u) { return u.lv === save.level; })
                .map(function (u) { return u.text; }).join(" · "));
    }

    function log(title, body) {
        save.log.unshift({ title: title, body: body, day: save.day, season: save.season });
        if (save.log.length > 60) save.log.pop();
    }

    /* =========================================================================
     * GEOMETRIA — primitive
     *
     * Un mesh è {v: number[], f: [{i:[], n:[]}]}. box() e prism() sono gli
     * unici due solidi; tutto il resto è composto con merge/scale/offset/rot
     * a tempo di build, non a tempo di disegno.
     * ===================================================================== */

    /* Ogni faccia porta la sua normale e un tono: è la luce. `tone` scala la
     * luminanza della faccia, così un cubo ha tre valori distinti e si legge
     * come un solido senza alcuna luceanale. */
    function mesh() { return { v: [], f: [] }; }

    function quad(m, a, b, c, d, tone) {
        var vs = m.v.length / 3;
        var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        var vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        m.v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
        m.f.push({ i: [vs, vs + 1, vs + 2, vs + 3], n: [nx / len, ny / len, nz / len], tone: tone });
    }

    function box(w, h, d) {
        var m = mesh(), x = w / 2, y = h / 2, z = d / 2;
        quad(m, [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], 0.62); /* giù */
        quad(m, [-x, y, z], [x, y, z], [x, -y, z], [-x, -y, z], 1.00);     /* su */
        quad(m, [-x, -y, z], [x, -y, z], [x, -y, -z], [-x, -y, -z], 0.80); /* fronte */
        quad(m, [x, y, z], [-x, y, z], [-x, y, -z], [x, y, -z], 0.80);     /* retro */
        quad(m, [-x, y, z], [-x, -y, z], [-x, -y, -z], [-x, y, -z], 0.72); /* sx */
        quad(m, [x, -y, z], [x, y, z], [x, y, -z], [x, -y, -z], 0.72);     /* dx */
        return m;
    }

    /* Prisma verticale: `sides` facce, raggio inferiore e superiore, altezza.
     * Usato per teste, cappelli, gonne, colonne di luce. */
    function prism(sides, rb, rt, h) {
        var m = mesh(), i, a0, a1, z0 = -h / 2, z1 = h / 2;
        rt = rt === undefined ? rb : rt;
        for (i = 0; i < sides; i++) {
            a0 = i / sides * TAU;
            a1 = (i + 1) / sides * TAU;
            var b0 = [Math.cos(a0) * rt, Math.sin(a0) * rt, z1];
            var b1 = [Math.cos(a1) * rt, Math.sin(a1) * rt, z1];
            var c1 = [Math.cos(a1) * rb, Math.sin(a1) * rb, z0];
            var c0 = [Math.cos(a0) * rb, Math.sin(a0) * rb, z0];
            quad(m, b0, b1, c1, c0, 0.66 + 0.34 * Math.max(0, Math.cos(a0 + 0.4)));
        }
        /* tappi */
        var top = mesh(), bot = mesh();
        for (i = 0; i < sides; i++) {
            a0 = i / sides * TAU; a1 = (i + 1) / sides * TAU;
            quad(top, [0, 0, z1], [Math.cos(a0) * rt, Math.sin(a0) * rt, z1],
                [Math.cos(a1) * rt, Math.sin(a1) * rt, z1], [0, 0, z1], 1.0);
            quad(bot, [0, 0, z0], [Math.cos(a0) * rb, Math.sin(a0) * rb, z0],
                [Math.cos(a1) * rb, Math.sin(a1) * rb, z0], [0, 0, z0], 0.55);
        }
        /* I tappi duplicano l'ultimo quad (degenera): rifiltro le facce nulle. */
        return { v: m.v.concat(top.v, bot.v),
                 f: m.f.concat(top.f, bot.f).filter(function (f) { return f.i.length === 4; }) };
    }

    function merge(ms) {
        var out = mesh();
        for (var i = 0; i < ms.length; i++) {
            var off = out.v.length / 3;
            for (var j = 0; j < ms[i].v.length; j++) out.v.push(ms[i].v[j]);
            for (var k = 0; k < ms[i].f.length; k++) {
                var f = ms[i].f[k];
                out.f.push({ i: f.i.map(function (x) { return x + off; }), n: f.n, tone: f.tone });
            }
        }
        return out;
    }

    function scaleMesh(m, sx, sy, sz) {
        var out = mesh();
        for (var i = 0; i < m.v.length; i += 3) {
            out.v.push(m.v[i] * sx, m.v[i + 1] * sy, m.v[i + 2] * sz);
        }
        for (var k = 0; k < m.f.length; k++) {
            var f = m.f[k];
            var n = mergeNormals([f.n[0] * sx, f.n[1] * sy, f.n[2] * sz]);
            out.f.push({ i: f.i.slice(), n: n, tone: f.tone });
        }
        return out;
    }

    function offsetMesh(m, dx, dy, dz) {
        var out = mesh();
        for (var i = 0; i < m.v.length; i += 3) {
            out.v.push(m.v[i] + dx, m.v[i + 1] + dy, m.v[i + 2] + dz);
        }
        for (var k = 0; k < m.f.length; k++) out.f.push({ i: m.f[k].i.slice(), n: m.f[k].n, tone: m.f[k].tone });
        return out;
    }

    function rotZMesh(m, a) {
        var c = Math.cos(a), s = Math.sin(a), out = mesh();
        for (var i = 0; i < m.v.length; i += 3) {
            out.v.push(c * m.v[i] - s * m.v[i + 1], s * m.v[i] + c * m.v[i + 1], m.v[i + 2]);
        }
        for (var k = 0; k < m.f.length; k++) {
            var f = m.f[k];
            var n = [c * f.n[0] - s * f.n[1], s * f.n[0] + c * f.n[1], f.n[2]];
            out.f.push({ i: f.i.slice(), n: mergeNormals(n), tone: f.tone });
        }
        return out;
    }

    function mergeNormals(n) {
        var l = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) || 1;
        return [n[0] / l, n[1] / l, n[2] / l];
    }

    /* =========================================================================
     * CATALOGO
     *
     * ~100 capi su 6 slot. Ogni capo porta uno o due tag, un livello di
     * sblocco e un valore base. Un capo con due tag è una scelta di design:
     * "abito da sera minimal" e "abito da sera barocco" sono due capi diversi
     * che rispondono a brief diversi.
     * ===================================================================== */

    var GARMENTS = [
        /* ---- TESTA ---- */
        { id: "h_fedora",   slot: "head", name: "Fedora",        tags: ["vintage", "elegante"],   tier: 1, base: 14, shape: "hat" },
        { id: "h_beanie",   slot: "head", name: "Beanie",        tags: ["casual", "street"],      tier: 1, base: 9,  shape: "beanie" },
        { id: "h_tiara",    slot: "head", name: "Tiara",         tags: ["elegante", "barocco"],   tier: 2, base: 30, shape: "tiara" },
        { id: "h_berretto", slot: "head", name: "Berretto piatto", tags: ["etnico", "vintage"],   tier: 1, base: 12, shape: "hat" },
        { id: "h_cuffia",   slot: "head", name: "Cuffia",        tags: ["minimal"],              tier: 1, base: 8,  shape: "beanie" },
        { id: "h_crest",    slot: "head", name: "Cresta",        tags: ["punk", "street"],       tier: 2, base: 16, shape: "crest" },
        { id: "h_turbante", slot: "head", name: "Turbante",      tags: ["etnico", "elegante"],   tier: 3, base: 34, shape: "turban" },
        { id: "h_cloche",   slot: "head", name: "Cloche",        tags: ["vintage", "elegante"],  tier: 2, base: 22, shape: "cloche" },
        { id: "h_cappello", slot: "head", name: "Cappello a tesa larga", tags: ["elegante", "vintage"], tier: 3, base: 38, shape: "overhat" },
        { id: "h_corona",   slot: "head", name: "Corona",        tags: ["barocco", "elegante"],  tier: 4, base: 58, shape: "crown" },
        { id: "h_casco",    slot: "head", name: "Casco",         tags: ["street", "minimal"],     tier: 2, base: 18, shape: "helmet" },
        { id: "h_fascia",   slot: "head", name: "Fascia",        tags: ["casual", "minimal"],    tier: 1, base: 10, shape: "band" },
        { id: "h_velo",     slot: "head", name: "Velo",          tags: ["elegante", "barocco"],  tier: 4, base: 52, shape: "veil" },
        { id: "h_piume",    slot: "head", name: "Piume",         tags: ["etnico", "barocco"],    tier: 3, base: 31, shape: "plume" },

        /* ---- BUSTO ---- */
        { id: "t_tshirt",   slot: "torso", name: "T-shirt",       tags: ["casual", "minimal"],    tier: 1, base: 11, shape: "tee" },
        { id: "t_camicia",  slot: "torso", name: "Camicia",       tags: ["elegante", "minimal"],  tier: 1, base: 18, shape: "shirt" },
        { id: "t_blusa",    slot: "torso", name: "Blusa",         tags: ["elegante", "vintage"],  tier: 2, base: 26, shape: "blouse" },
        { id: "t_abito",    slot: "torso", name: "Abito semplice", tags: ["elegante", "minimal"], tier: 1, base: 24, shape: "dress" },
        { id: "t_abitoric", slot: "torso", name: "Abito ricamato", tags: ["elegante", "barocco"], tier: 4, base: 72, shape: "dress" },
        { id: "t_corsetto", slot: "torso", name: "Corsetto",      tags: ["punk", "vintage"],      tier: 2, base: 28, shape: "corset" },
        { id: "t_top",      slot: "torso", name: "Top",           tags: ["casual", "minimal"],    tier: 1, base: 10, shape: "tee" },
        { id: "t_maglietta",slot: "torso", name: "Maglietta stampata", tags: ["street", "casual"], tier: 1, base: 15, shape: "tee" },
        { id: "t_gilet",    slot: "torso", name: "Gilet",         tags: ["elegante", "vintage"],  tier: 2, base: 30, shape: "vest" },
        { id: "t_tunica",   slot: "torso", name: "Tunica",        tags: ["etnico", "minimal"],    tier: 2, base: 27, shape: "tunic" },
        { id: "t_giacca",   slot: "torso", name: "Giacca",        tags: ["elegante", "minimal"],  tier: 2, base: 38, shape: "jacket" },
        { id: "t_smock",    slot: "torso", name: "Smock",         tags: ["casual", "vintage"],    tier: 1, base: 20, shape: "blouse" },
        { id: "t_bustier",  slot: "torso", name: "Bustier",       tags: ["elegante", "minimal"],  tier: 3, base: 34, shape: "corset" },
        { id: "t_kimono",   slot: "torso", name: "Kimono",        tags: ["etnico", "elegante"],   tier: 3, base: 48, shape: "kimono" },
        { id: "t_pelliccia",slot: "torso", name: "Pelliccia",     tags: ["barocco", "elegante"],  tier: 4, base: 66, shape: "fur" },
        { id: "t_maglione", slot: "torso", name: "Maglione",      tags: ["casual", "vintage"],    tier: 1, base: 19, shape: "sweater" },
        { id: "t_sobrio",   slot: "torso", name: "Abito sobrio",  tags: ["minimal", "elegante"],  tier: 2, base: 29, shape: "dress" },
        { id: "t_skin",     slot: "torso", name: "Tuta aderente", tags: ["street", "minimal"],    tier: 2, base: 26, shape: "catsuit" },
        { id: "t_paillettes",slot:"torso", name: "Corpetto paillettes", tags: ["barocco", "street"], tier: 4, base: 62, shape: "sequin" },
        { id: "t_babydoll", slot: "torso", name: "Babydoll",      tags: ["punk", "street"],       tier: 2, base: 23, shape: "dress" },
        { id: "t_tailleur", slot: "torso", name: "Tailleur",      tags: ["elegante", "minimal"],  tier: 3, base: 52, shape: "suit" },
        { id: "t_pizzo",    slot: "torso", name: "Corpetto di pizzo", tags: ["vintage", "barocco"], tier: 3, base: 44, shape: "lace" },

        /* ---- GAMBE ---- */
        { id: "l_jeans",    slot: "legs", name: "Jeans",          tags: ["casual", "street"],     tier: 1, base: 14, shape: "trousers" },
        { id: "l_gonna",    slot: "legs", name: "Gonna",          tags: ["minimal", "elegante"],  tier: 1, base: 17, shape: "skirt" },
        { id: "l_pantaloni",slot: "legs", name: "Pantaloni",      tags: ["elegante", "minimal"],  tier: 2, base: 26, shape: "trousers" },
        { id: "l_shorts",   slot: "legs", name: "Shorts",         tags: ["casual", "street"],     tier: 1, base: 11, shape: "shorts" },
        { id: "l_leggings", slot: "legs", name: "Leggings",       tags: ["street", "minimal"],    tier: 1, base: 12, shape: "trousers" },
        { id: "l_maxi",     slot: "legs", name: "Gonna maxi",     tags: ["etnico", "vintage"],    tier: 2, base: 28, shape: "longskirt" },
        { id: "l_culottes", slot: "legs", name: "Culottes",       tags: ["elegante", "vintage"],  tier: 2, base: 24, shape: "culottes" },
        { id: "l_cargo",    slot: "legs", name: "Cargo",          tags: ["street", "casual"],     tier: 1, base: 16, shape: "trousers" },
        { id: "l_zarosa",   slot: "legs", name: "Zarosa",         tags: ["barocco", "elegante"],  tier: 4, base: 58, shape: "zarosa" },
        { id: "l_sarouel",  slot: "legs", name: "Sarouel",        tags: ["etnico", "casual"],     tier: 2, base: 22, shape: "harem" },
        { id: "l_pencil",   slot: "legs", name: "Gonna a tubo",   tags: ["elegante", "minimal"],  tier: 2, base: 25, shape: "skirt" },
        { id: "l_plissé",   slot: "legs", name: "Plissé",         tags: ["elegante", "vintage"],  tier: 3, base: 36, shape: "longskirt" },
        { id: "l_punk",     slot: "legs", name: "Pantalone strappato", tags: ["punk", "street"], tier: 2, base: 21, shape: "trousers" },
        { id: "l_tutu",     slot: "legs", name: "Tutu",           tags: ["barocco", "elegante"],  tier: 3, base: 42, shape: "tutu" },
        { id: "l_sali",     slot: "legs", name: "Salopette",      tags: ["casual", "vintage"],    tier: 1, base: 20, shape: "overall" },
        { id: "l_cosa",     slot: "legs", name: "Pantalone a vita alta", tags: ["vintage", "elegante"], tier: 2, base: 27, shape: "culottes" },
        { id: "l_fuseaux",  slot: "legs", name: "Fuseaux",        tags: ["minimal", "street"],    tier: 1, base: 13, shape: "trousers" },
        { id: "l_broccato", slot: "legs", name: "Broccato",       tags: ["barocco", "vintage"],   tier: 5, base: 74, shape: "longskirt" },

        /* ---- PIEDI ---- */
        { id: "f_sneakers", slot: "feet", name: "Sneakers",       tags: ["street", "casual"],     tier: 1, base: 12, shape: "sneaker" },
        { id: "f_tacchi",   slot: "feet", name: "Tacchi",         tags: ["elegante", "minimal"],  tier: 2, base: 26, shape: "heel" },
        { id: "f_stivali",  slot: "feet", name: "Stivali",        tags: ["vintage", "punk"],      tier: 2, base: 28, shape: "boot" },
        { id: "f_mocassini",slot: "feet", name: "Mocassini",      tags: ["elegante", "vintage"],  tier: 2, base: 24, shape: "loafer" },
        { id: "f_sandali",  slot: "feet", name: "Sandali",        tags: ["casual", "etnico"],     tier: 1, base: 11, shape: "sandal" },
        { id: "f_anfibi",   slot: "feet", name: "Anfibi",         tags: ["punk", "street"],       tier: 2, base: 27, shape: "boot" },
        { id: "f_decollete",slot: "feet", name: "Décolleté",      tags: ["elegante", "barocco"],  tier: 3, base: 38, shape: "heel" },
        { id: "f_babouche", slot: "feet", name: "Babouche",       tags: ["etnico", "casual"],     tier: 1, base: 13, shape: "slipper" },
        { id: "f_zeppe",    slot: "feet", name: "Zeppe",          tags: ["casual", "vintage"],    tier: 1, base: 15, shape: "wedge" },
        { id: "f_stivaletti",slot:"feet", name: "Stivaletti",     tags: ["street", "minimal"],    tier: 1, base: 18, shape: "boot" },
        { id: "f_scarpa",   slot: "feet", name: "Scarpa classica",tags: ["minimal", "elegante"],  tier: 2, base: 23, shape: "loafer" },
        { id: "f_mules",    slot: "feet", name: "Mules",          tags: ["elegante", "vintage"],  tier: 2, base: 25, shape: "heel" },
        { id: "f_gambaletto",slot:"feet", name: "Gambaletto",     tags: ["street", "punk"],       tier: 1, base: 9,  shape: "sock" },
        { id: "f_chinese",  slot: "feet", name: "Scarpa cinese", tags: ["etnico", "vintage"],    tier: 3, base: 31, shape: "slipper" },
        { id: "f_opera",    slot: "feet", name: "Scarpa da opera",tags: ["barocco", "elegante"], tier: 4, base: 52, shape: "heel" },
        { id: "f_runner",   slot: "feet", name: "Runner",         tags: ["street", "minimal"],    tier: 3, base: 30, shape: "sneaker" },

        /* ---- MANI ---- */
        { id: "m_guanti",   slot: "hands", name: "Guanti corti",  tags: ["elegante", "vintage"],  tier: 2, base: 16, shape: "glove" },
        { id: "m_guantilun",slot: "hands", name: "Guanti lunghi", tags: ["elegante", "barocco"],  tier: 3, base: 32, shape: "longglove" },
        { id: "m_dita",     slot: "hands", name: "Guanti a dita", tags: ["street", "minimal"],    tier: 1, base: 10, shape: "fingerless" },
        { id: "m_bracciali",slot: "hands", name: "Bracciali",     tags: ["etnico", "barocco"],    tier: 1, base: 9,  shape: "bracelet" },
        { id: "m_punk",     slot: "hands", name: "Fascie con borchie", tags: ["punk", "street"], tier: 2, base: 15, shape: "studband" },
        { id: "m_pizzo",    slot: "hands", name: "Guanti di pizzo", tags: ["vintage", "elegante"], tier: 2, base: 21, shape: "laceglove" },
        { id: "m_anelli",   slot: "hands", name: "Anelli",        tags: ["barocco", "minimal"],   tier: 2, base: 19, shape: "rings" },
        { id: "m_pelle",    slot: "hands", name: "Guanti di pelle", tags: ["punk", "elegante"],  tier: 3, base: 28, shape: "glove" },
        { id: "m_smart",    slot: "hands", name: "Fascia smart",  tags: ["minimal", "street"],    tier: 3, base: 24, shape: "band" },
        { id: "m_ross",     slot: "hands", name: "Rosario",       tags: ["barocco", "etnico"],    tier: 2, base: 18, shape: "rosary" },

        /* ---- ESTERNO ---- */
        { id: "o_cappotto", slot: "outer", name: "Cappotto",      tags: ["elegante", "minimal"],  tier: 2, base: 36, shape: "coat" },
        { id: "o_trench",   slot: "outer", name: "Trench",        tags: ["vintage", "elegante"],  tier: 2, base: 34, shape: "coat" },
        { id: "o_bomber",   slot: "outer", name: "Bomber",        tags: ["street", "casual"],     tier: 1, base: 24, shape: "jacket" },
        { id: "o_chiodo",   slot: "outer", name: "Chiodo",        tags: ["punk", "street"],       tier: 2, base: 30, shape: "jacket" },
        { id: "o_pelliccia",slot: "outer", name: "Pelliccia",     tags: ["barocco", "elegante"],  tier: 4, base: 68, shape: "furcoat" },
        { id: "o_mantella", slot: "outer", name: "Mantella",      tags: ["barocco", "vintage"],   tier: 3, base: 54, shape: "cape" },
        { id: "o_kimono",   slot: "outer", name: "Kimono aperto", tags: ["etnico", "minimal"],    tier: 3, base: 44, shape: "kimonocoat" },
        { id: "o_montone",  slot: "outer", name: "Montone",       tags: ["casual", "vintage"],    tier: 1, base: 26, shape: "coat" },
        { id: "o_piumino",  slot: "outer", name: "Piumino",       tags: ["casual", "street"],     tier: 1, base: 22, shape: "puffer" },
        { id: "o_soprabito",slot: "outer", name: "Soprabito",     tags: ["elegante", "vintage"],  tier: 3, base: 46, shape: "coat" },
        { id: "o_giletpello",slot:"outer", name: "Gilet trapuntato", tags: ["minimal", "casual"], tier: 2, base: 28, shape: "vestcoat" },
        { id: "o_blazer",   slot: "outer", name: "Blazer",        tags: ["elegante", "minimal"],  tier: 2, base: 38, shape: "blazer" },
        { id: "o_stud",     slot: "outer", name: "Giacca borchie",tags: ["punk", "street"],       tier: 3, base: 40, shape: "jacket" },
        { id: "o_cappa",    slot: "outer", name: "Cappa",         tags: ["barocco", "punk"],      tier: 4, base: 60, shape: "cape" },
        { id: "o_tuta",     slot: "outer", name: "Tuta tecnica",  tags: ["street", "minimal"],    tier: 3, base: 35, shape: "techcoat" },
        { id: "o_stola",    slot: "outer", name: "Stola",         tags: ["elegante", "barocco"],  tier: 3, base: 42, shape: "stole" }
    ];

    /* Indice per slot e per id: il guardaroba li usa a ogni render. */
    var BY_SLOT = {};
    SLOTS.forEach(function (s) { BY_SLOT[s.key] = GARMENTS.filter(function (g) { return g.slot === s.key; }); });
    var BY_ID = {};
    GARMENTS.forEach(function (g) { BY_ID[g.id] = g; });
    var MAX_TIER = 5;

    /* =========================================================================
     * CITTÀ E VENUE
     *
     * Ogni città ha tre venue, gate sulla fama. Una venue grande significa
     * più giudici, più look ammessi e un affitto che deve essere ripagato:
     * la sfilata è una scommessa, non una ricompensa.
     * ===================================================================== */

    var CITIES = [
        { name: "MILANO", venues: [
            { name: "Seminterrato", rent: 0,   judges: 1, looks: 3, minFame: 0 },
            { name: "Saletta",      rent: 70,  judges: 2, looks: 4, minFame: 45 },
            { name: "Palazzina",    rent: 240, judges: 3, looks: 5, minFame: 170 }
        ]},
        { name: "FIRENZE", venues: [
            { name: "Chiostro",     rent: 120, judges: 2, looks: 4, minFame: 90 },
            { name: "Teatro",       rent: 380, judges: 3, looks: 5, minFame: 260 },
            { name: "Fortezza",     rent: 900, judges: 4, looks: 6, minFame: 520 }
        ]},
        { name: "PARIGI", venues: [
            { name: "Galleria",     rent: 320, judges: 3, looks: 5, minFame: 400 },
            { name: "Hôtel",        rent: 900, judges: 4, looks: 6, minFame: 780 },
            { name: "Grand Palais", rent: 2400, judges: 5, looks: 7, minFame: 1400 }
        ]},
        { name: "TOKYO", venues: [
            { name: "Sotterraneo",  rent: 600, judges: 3, looks: 5, minFame: 900 },
            { name: "Torre",        rent: 1600, judges: 4, looks: 6, minFame: 1600 },
            { name: "Stadio coperto", rent: 4200, judges: 5, looks: 8, minFame: 2600 }
        ]},
        { name: "NEW YORK", venues: [
            { name: "Loft",         rent: 1100, judges: 3, looks: 5, minFame: 1400 },
            { name: "Terminal",     rent: 2800, judges: 4, looks: 7, minFame: 2400 },
            { name: "Penthouse",    rent: 6400, judges: 5, looks: 8, minFame: 3600 }
        ]},
        { name: "SHANGAI", venues: [
            { name: "Molo",         rent: 2000, judges: 4, looks: 6, minFame: 2200 },
            { name: "Grattacielo",  rent: 5200, judges: 5, looks: 8, minFame: 3400 },
            { name: "Settimana della moda", rent: 12000, judges: 6, looks: 10, minFame: 5200 }
        ]}
    ];

    var SHOW_TYPES = [
        { id: "tema", name: "TEMA", minLevel: 5,
          blurb: "Un tag dichiarato. Ogni look è giudicato su quanto lo rispetta — il tag vale doppio." },
        { id: "collezione", name: "COLLEZIONE", minLevel: 18,
          blurb: "Nessun tag imposto. L'armonia della palette vale doppio: una collezione coerente batte cinque look isolati." },
        { id: "sfida", name: "SFIDA", minLevel: 26,
          blurb: "Una rivale presenta la sua collezione nello stesso venue. Il totale più alto vince il premio." },
        { id: "benefico", name: "BENEFICO", minLevel: 32,
          blurb: "Nessun premio in denaro. In cambio si sbloccano capi unici che non sono in vendita." }
    ];

    function showType(id) {
        for (var i = 0; i < SHOW_TYPES.length; i++) if (SHOW_TYPES[i].id === id) return SHOW_TYPES[i];
        return null;
    }

    /* =========================================================================
     * STAGIONI E TREND
     *
     * La meccanica firma. Il calendario è deterministico dal numero di
     * stagione, quindi ricaricare non cambia il mondo. Il pronostico pubblica
     * due tag; il terzo tag caldo è nascosto e si vede solo a posteriori.
     * ===================================================================== */

    var TREND = { hot: 3, cold: 2, hotBonus: 0.25, coldPenalty: 0.20 };

    function trendFor(season) {
        var rng = mulberry32(hashStr("trend:" + season));
        var pool = TAGS.slice();
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
        }
        return {
            season: season,
            hot: [pool[0], pool[1], pool[2]],        /* il terzo è nascosto */
            cold: [pool[3], pool[4]],
            forecast: [pool[0], pool[1]],            /* ciò che il report dice */
            wild: pool[2]                             /* ciò che tace */
        };
    }

    function tagIsHot(tag, tr) { return tr.hot.indexOf(tag) !== -1; }
    function tagIsCold(tag, tr) { return tr.cold.indexOf(tag) !== -1; }

    /* =========================================================================
     * MODELLE
     *
     * Quattro statistiche, e ognuna entra nel punteggio in un punto diverso.
     * La resistenza cala durante la sfilata: una modella stanca inciampa, e
     * inciampare è visibile in passerella.
     * ===================================================================== */

    var MODEL_FIRST = ["Vera", "Nadia", "Lila", "Mira", "Ade", "Jun", "Sofia", "Runa",
        "Elena", "Kaya", "Ines", "Talia", "Zoya", "Marta", "Noor", "Pia"];
    var MODEL_LAST = ["K.", "V.", "R.", "M.", "S.", "T.", "L.", "B.", "N.", "D.", "F.", "G."];

    function makeModel(rng, tier) {
        var t = tier || 1;
        /* Il costo segue la somma delle statistiche, non la media: una modella
         * brava in due cose è più rara di una brava in una. */
        var p = Math.round(18 + t * 7 + rng() * 14);
        var a = Math.round(14 + t * 6 + rng() * 14);
        var r = Math.round(20 + t * 6 + rng() * 12);
        var f = Math.round(6 + t * 10 + rng() * 20);
        return {
            id: "m" + Math.floor(rng() * 1e9).toString(36),
            name: MODEL_FIRST[Math.floor(rng() * MODEL_FIRST.length)] + " " +
                  MODEL_LAST[Math.floor(rng() * MODEL_LAST.length)],
            portamento: clamp(p, 1, 100),
            appeal: clamp(a, 1, 100),
            resistenza: clamp(r, 1, 100),
            fama: clamp(f, 0, 100),
            tired: 0,
            cost: Math.round((p + a + r) * 2.2 + f * 1.5),
            seed: Math.floor(rng() * 1e6)
        };
    }

    function modelScore(m) {
        /* Il portamento pesa più dell'appeal: una modella che cammina male
         * rovescia un look buono, una bella che cammina bene no. */
        return m.portamento * 0.55 + m.appeal * 0.45;
    }

    /* La prima modella utilizzabile: non stanca. Se sono tutte riposate ne
     * prendo comunque una, perché un atelier senza modelle non presenta niente
     * e deve dirlo con un punteggio basso, non con un errore. */
    function availableModel() {
        var best = null, bestScore = -1;
        for (var i = 0; i < save.models.length; i++) {
            var m = save.models[i];
            if (m.tired >= 100) continue;
            var s = modelScore(m) * (1 - m.tired / 200);
            if (s > bestScore) { bestScore = s; best = m; }
        }
        return best || save.models[0] || null;
    }

    /* =========================================================================
     * PUNTEGGIO
     *
     * Tre sistemi indipendenti che si sommano: il match col brief, l'armonia
     * sulla ruota dei colori, e il fit della modella. Ognuno è una regola che
     * il giocatore può imparare — non un numero casuale.
     * ===================================================================== */

    function hueDist(a, b) {
        var d = Math.abs(a - b) % 360;
        return d > 180 ? 360 - d : d;
    }

    /* La ruota dei colori è il sistema, e ha un trade-off reale: il
     * complementare vale il doppio dell'analogo ma richiede di tenere ENTRAMI
     * i colori opposti, e un terzo colore fuori posto annulla il bonus e ti
     * penalizza. Il monocromatico è il rifugio sicuro e paga poco. */
    function harmony(hues) {
        var maxD = 0, comp = false;
        for (var i = 0; i < hues.length; i++) {
            for (var j = i + 1; j < hues.length; j++) {
                var d = hueDist(hues[i], hues[j]);
                if (d > maxD) maxD = d;
                if (d >= 150 && d <= 210) comp = true;
            }
        }
        if (comp) return { type: "Complementare", pts: 24, note: "Colori opposti: forte, ma ogni colore fuori posto annulla il bonus." };
        if (maxD <= 32) return { type: "Monocromatico", pts: 9, note: "Toni vicini: sicuro, e paga poco." };
        if (maxD <= 62) return { type: "Analogo", pts: 16, note: "Toni adiacenti sulla ruota: il rapporto rischio/resa migliore." };
        if (maxD <= 130) return { type: "Neutro", pts: 2, note: "Nessuna relazione cercata." };
        return { type: "Stonato", pts: -14, note: "Colori lontani e non opposti: penalità." };
    }

    /* `wanted` è il tag che il brief o il tema chiede. */
    function scoreLook(look, wanted, tr, model) {
        var parts = { garments: 0, tag: 0, trend: 0, harmony: 0, model: 0, fabric: 0 };
        var hues = [];
        var hotHits = 0, coldHits = 0, wantHits = 0;

        var slots = look.slots;
        for (var k in slots) {
            var it = slots[k];
            if (!it) continue;
            var g = BY_ID[it.gid];
            if (!g) continue;
            var fab = FABRICS[it.fabric] || FABRICS.cotone;
            var col = COLORS[it.color] || COLORS.nero;
            hues.push(col.hue);

            parts.garments += g.base;
            parts.fabric += g.base * (fab.mult - 1);
            for (var t = 0; t < g.tags.length; t++) {
                if (wanted && g.tags[t] === wanted) { parts.tag += 20; wantHits++; }
                if (tr && tagIsHot(g.tags[t], tr)) { parts.trend += g.base * TREND.hotBonus; hotHits++; }
                if (tr && tagIsCold(g.tags[t], tr)) { parts.trend -= g.base * TREND.coldPenalty; coldHits++; }
            }
        }

        var h = hues.length >= 2 ? harmony(hues) : harmony([0, 0]);
        parts.harmony = h.pts;

        var ms = model ? modelScore(model) : 30;
        /* La stanchezza toglie fino al 25%: una modella a fine sfilata non
         * presenta più il look, lo trascina. */
        var tire = model ? 1 - (model.tired / 100) * 0.25 : 1;
        parts.model = ms * 0.6 * tire;

        var total = 0;
        for (var p in parts) total += parts[p];

        return {
            total: Math.max(1, Math.round(total)),
            parts: parts, harmony: h,
            hues: hues, hotHits: hotHits, coldHits: coldHits, wantHits: wantHits
        };
    }

    /* =========================================================================
     * COMMISSIONI
     *
     * Il cliente arriva con un brief. Non è un moltiplicatore: è un tag da
     * rispettare, e il budget è un limite rigido — sforarlo non è possibile,
     * quindi il tessuto costoso va guadagnato, non scelto.
     * ===================================================================== */

    var OCCASIONS = ["Gala di apertura", "Cocktail", "Servizio fotografico", "Matrimonio",
        "Concerto", "Inaugurazione", "Viaggio", "Premiazione", "Serata in galleria"];
    var CLIENT_FIRST = ["Sig.ra", "Sig.", "Dott.", "Contessa", "Barone"];
    var CLIENT_LAST = ["Alberti", "Fossati", "Greco", "Nervi", "Pazzi", "Romano",
        "Sartori", "Tesori", "Venturi", "Zanetti", "Bianchi", "Costa"];

    function makeCommission(rng, level, cityIdx) {
        var vibe = TAGS[Math.floor(rng() * TAGS.length)];
        var occ = OCCASIONS[Math.floor(rng() * OCCASIONS.length)];
        var city = CITIES[clamp(cityIdx, 0, CITIES.length - 1)];
        var pay = Math.round((70 + level * 24 + rng() * 70) * (1 + cityIdx * 0.5));
        return {
            id: "c" + Math.floor(rng() * 1e9).toString(36),
            client: CLIENT_FIRST[Math.floor(rng() * CLIENT_FIRST.length)] + " " +
                    CLIENT_LAST[Math.floor(rng() * CLIENT_LAST.length)],
            occasion: occ,
            vibe: vibe,
            /* Un unico numero: il cliente paga fino a qui. Non finanzia
             * sforamenti, quindi il tessuto costoso va guadagnato. */
            budget: pay,
            pay: pay,
            fame: Math.max(1, Math.round(pay / 12)),
            city: city.name,
            day: save.day
        };
    }

    function refreshCommissions(n) {
        var rng = mulberry32(hashStr("comm:" + save.season + ":" + save.day));
        var out = [];
        for (var i = 0; i < (n || 3); i++) out.push(makeCommission(rng, save.level, save.city));
        save.commissions = out;
    }

    /* =========================================================================
     * RIVALI
     *
     * Non sono un moltiplicatore di difficoltà: sono tre cursori di fama che
     * salgono da soli. Se una rivale supera la tua fama, i clienti iniziano a
     * preferire lei, e la commissione paga meno. È pressione morbida e
     * visibile, non un muro.
     * ===================================================================== */

    var RIVALS = [
        { name: "Bianca F.", bias: ["elegante", "minimal"], start: 0 },
        { name: "Osman D.",  bias: ["street", "punk"],      start: 0 },
        { name: "Chiara L.", bias: ["barocco", "vintage"],  start: 0 }
    ];

    function initRivals() {
        save.rivals = RIVALS.map(function (r, i) {
            return { name: r.name, bias: r.bias.slice(), fame: r.start, power: 1 + i * 0.35 };
        });
    }

    function rivalPressure() {
        /* 1 = nessuna rivale davanti. Sopra 1, i clienti pagano meno. */
        var best = 0;
        for (var i = 0; i < save.rivals.length; i++) {
            if (save.rivals[i].fame > best) best = save.rivals[i].fame;
        }
        if (best <= save.fame) return 1;
        return clamp(1.15 - (best - save.fame) / Math.max(300, save.fame) * 0.35, 0.6, 1.15);
    }

    function stepRivals() {
        var tr = trendFor(save.season);
        for (var i = 0; i < save.rivals.length; i++) {
            var r = save.rivals[i];
            /* Una rivale guadagna di più se il trend premia il suo stile: il
             * mondo reagisce allo stesso pronostico che leggi tu. */
            var biasHit = r.bias.filter(function (t) { return tagIsHot(t, tr); }).length;
            r.fame += (3 + r.power * 4) * (1 + biasHit * 1.6) * (0.6 + save.season * 0.12);
        }
    }

    /* =========================================================================
     * SPONSOR
     *
     * Uno stipendio fisso a stagione, in cambio di una quota di look che
     * usino il tessuto dello sponsor. Non rispettarla costa una penale in
     * fama, quindi è un debito, non un regalo.
     * ===================================================================== */

    var SPONSORS = [
        { id: "filati",  name: "Filati Nord",   fabric: "cotone",  stipend: 60,  demand: 0.40 },
        { id: "tessitoria", name: "Tessitoria", fabric: "lino",    stipend: 150, demand: 0.40 },
        { id: "teknos",  name: "Teknos",        fabric: "tecnico", stipend: 380, demand: 0.45 },
        { id: "maison",  name: "Maison de Soie",fabric: "seta",    stipend: 900, demand: 0.45 },
        { id: "velluti", name: "Velluti Rossi", fabric: "velluto", stipend: 1800, demand: 0.50 }
    ];

    function sponsor(id) {
        for (var i = 0; i < SPONSORS.length; i++) if (SPONSORS[i].id === id) return SPONSORS[i];
        return null;
    }

    /* =========================================================================
     * NEGOZIO E GUARDAROBA
     *
     * I capi si comprano una volta e restano. I colori si tingono e la
     * tintura ha scorte: un colore esaurito non ritorna per stagioni, ed è
     * l'unica scarsità oltre al tempo.
     * ===================================================================== */

    function garmentPrice(x) {
        /* Accetta un id o un capo: la metà del codice ha l'uno e metà l'altro,
         * e una funzione che esplode su uno dei due è un bug nascosto. */
        var g = typeof x === "string" ? BY_ID[x] : x;
        if (!g) return 0;
        return Math.round(6 * Math.pow(g.tier, 1.7) + g.base * 1.4);
    }

    function ownsGarment(id) { return save.owned.indexOf(id) !== -1; }

    function buyGarment(id) {
        var g = BY_ID[id];
        if (!g || ownsGarment(id)) return false;
        if (save.slots.indexOf(g.slot) === -1) return false;
        if (g.tier > maxTierUnlocked()) return false;
        if (save.money < garmentPrice(g)) return false;
        save.money -= garmentPrice(g);
        save.owned.push(id);
        persist();
        return true;
    }

    function maxTierUnlocked() {
        var t = 1;
        for (var i = 0; i < UNLOCKS.length; i++) {
            if (UNLOCKS[i].kind === "tier" && save.level >= UNLOCKS[i].lv &&
                UNLOCKS[i].val > t) t = UNLOCKS[i].val;
        }
        return t;
    }

    function dyeStock(color) { return save.dyes[color] || 0; }

    function buyDye(color) {
        if (save.dyes[color] === undefined) return false;
        var price = 30 + COLOR_KEYS.indexOf(color) * 12;
        if (save.money < price) return false;
        if (dyeStock(color) >= 12) return false;
        save.money -= price;
        save.dyes[color] = dyeStock(color) + 3;
        persist();
        return true;
    }

    /* Craftare un capo significa convertire soldi in tier alto senza aspettare
     * il livello: è la valvola di sfogo per chi ha soldi e non cose da fare. */
    function craftGarment(id) {
        var g = BY_ID[id];
        if (!g || ownsGarment(id)) return false;
        if (save.slots.indexOf(g.slot) === -1) return false;
        var cost = Math.round(garmentPrice(g) * 2.4 + 40);
        if (save.money < cost) return false;
        save.money -= cost;
        save.owned.push(id);
        log("CAPO CRAFTATO", g.name + " cucito a mano.");
        persist();
        return true;
    }

    /* =========================================================================
     * RENDERING — proiezione e mesh
     *
     * Stessa pietra di sector7: proiezione obliqua con yaw-shear, back-face
     * culling sul vettore di vista, tono per faccia. È esattamente il toolkit
     * che serve per una passerella e non c'è motivo di inventarne un altro.
     *
     * `project` deve mandare un punto sulla camera al centro dello schermo:
     * è l'invariante su cui poggia il cull, ed è il motivo per cui il bbox di
     * drawMesh è scritto contro di essa.
     * ===================================================================== */

    var cv = null, ctx = null, W = 0, H = 0, DPR = 1;

    var P = {
        /* yaw: quanto +z si sposta verso destra. zTilt: quanto +z sale.
         * ySquash: la compressione dell'asse y, che dà la profondità. */
        yaw: 0.34, zTilt: 0.62, ySquash: 0.52,
        viewX: -0.55, viewY: 0.62, viewZ: 0.56
    };

    var cam = { x: 0, y: 0, ox: 0, oy: 0, zoom: 1 };

    function project(x, y, z) {
        return [
            (x - cam.x) * cam.zoom + cam.ox + z * P.yaw * cam.zoom + W * 0.5,
            (y - cam.y) * cam.zoom * P.ySquash - z * cam.zoom * P.zTilt + cam.oy + H * 0.5
        ];
    }

    /* Buffer di scratch, crescuti una volta e riusati: nulla nel percorso di
     * disegno alloca. */
    var buf = new Float32Array(4096);
    var fxA = new Float32Array(16), fyA = new Float32Array(16);
    var fDepth = new Float32Array(2048);
    var fOrder = new Int32Array(2048);

    function drawMesh(mesh, x, y, z, heading, rgb, scale) {
        var v = mesh.v, n = v.length / 3;
        if (n * 3 > buf.length) buf = new Float32Array(n * 3);
        var s = scale === undefined ? 1 : scale;
        var c = Math.cos(heading) * s, sn = Math.sin(heading) * s;

        for (var i = 0, o = 0; i < v.length; i += 3, o += 3) {
            buf[o] = c * v[i] - sn * v[i + 1] + x;
            buf[o + 1] = sn * v[i] + c * v[i + 1] + y;
            buf[o + 2] = v[i + 2] * s + z;
        }

        var faces = mesh.f, count = 0;
        for (var f = 0; f < faces.length && count < fOrder.length; f++) {
            var face = faces[f];
            /* Ruoto la normale della stessa rotazione z dei vertici: così il
             * cull resta esatto per ogni heading, non solo per heading=0. */
            var rx = c * face.n[0] - sn * face.n[1];
            var ry = sn * face.n[0] + c * face.n[1];
            if (rx * P.viewX + ry * P.viewY + face.n[2] * P.viewZ <= 0) continue;
            fOrder[count] = f;
            fDepth[count] = depthOfFace(face);
            count++;
        }

        /* Dal più lontano al più vicino. Senza, un braccio passa attraverso il
         * busto — e su un manichino si vede subito. */
        for (var a = 1; a < count; a++) {
            var kf = fOrder[a], kd = fDepth[a], b = a - 1;
            while (b >= 0 && fDepth[b] > kd) {
                fDepth[b + 1] = fDepth[b]; fOrder[b + 1] = fOrder[b]; b--;
            }
            fDepth[b + 1] = kd; fOrder[b + 1] = kf;
        }

        for (var d = 0; d < count; d++) {
            var fc = faces[fOrder[d]];
            var idx = fc.i, m = idx.length;
            if (m > fxA.length) { fxA = new Float32Array(m); fyA = new Float32Array(m); }
            for (var k = 0; k < m; k++) {
                var vi = idx[k] * 3;
                var sp = project(buf[vi], buf[vi + 1], buf[vi + 2]);
                fxA[k] = sp[0]; fyA[k] = sp[1];
            }
            var tone = fc.tone === undefined ? 1 : fc.tone;
            var r = clamp(rgb[0] * tone, 0, 255),
                gg = clamp(rgb[1] * tone, 0, 255),
                bb = clamp(rgb[2] * tone, 0, 255);
            ctx.fillStyle = "rgb(" + (r | 0) + "," + (gg | 0) + "," + (bb | 0) + ")";
            ctx.beginPath();
            ctx.moveTo(fxA[0], fyA[0]);
            for (var k2 = 1; k2 < m; k2++) ctx.lineTo(fxA[k2], fyA[k2]);
            ctx.closePath();
            ctx.fill();
        }
    }

    function depthOfFace(face) {
        var cx = 0, cy = 0, cz = 0, idx = face.i;
        for (var k = 0; k < idx.length; k++) {
            var vi = idx[k] * 3;
            cx += buf[vi]; cy += buf[vi + 1]; cz += buf[vi + 2];
        }
        return cx * P.viewX + cy * P.viewY + cz * P.viewZ;
    }

    /* =========================================================================
     * OSSA
     *
     * Un arto è un mesh con il perno SULL'ARTICOLAZIONE, costruito una volta
     * con offset z negativo. Poi drawBone lo ruota su x (il passo) e su z (la
     * direzione in cui cammina). Perché serve la rotazione su x: una gamba che
     * oscilla avanti e indietro oscenna nel piano y-z, e una rotazione su z
     * non la muoverebbe di un millimetro — l'errore classico è costruire l'arto
     * verticale e ruotarlo con lo heading, ottenendo un manichino che scalcia
     * nell'aria da fermo.
     * ===================================================================== */

    function pivotAt(mesh, dx, dy, dz) {
        return offsetMesh(mesh, -dx, -dy, -dz);
    }

    var BONE = {
        leg:  pivotAt(box(3.4, 3.4, FIG.legLen), 0, 0, FIG.legLen / 2),
        arm:  pivotAt(box(FIG.armW, FIG.armW, FIG.armLen), 0, 0, FIG.armLen / 2),
        torso: offsetMesh(box(FIG.torsoW, FIG.torsoD, FIG.torsoH), 0, 0, FIG.torsoH / 2),
        hips: offsetMesh(box(FIG.hipW, FIG.hipD, FIG.hipH), 0, 0, FIG.hipH / 2),
        head: offsetMesh(prism(8, FIG.headR, FIG.headR * 0.9, FIG.headH),
                         0, 0, FIG.headH / 2 + FIG.neckH),
        neck: offsetMesh(prism(4, 2.2, 2.2, FIG.neckH), 0, 0, FIG.neckH / 2)
    };

    /* Il manichino guarda lungo +y (verso la camera). */
    var BODY_YAW = 0;

    /* Ciclo del passo, da fase 0..1. Le braccia vanno in controfase alle
     * gambe, il bacino sale due volte per ciclo e la testa ciondola una: sono
     * le quattro frequenze di una camminata reale, e toglierne una rende il
     * passo immediatamente finto. */
    function walkPose(phase) {
        var s1 = Math.sin(phase * TAU), s2 = Math.sin(phase * TAU + Math.PI);
        return {
            legL: s1 * 0.52, legR: s2 * 0.52,
            armL: -s1 * 0.40, armR: -s2 * 0.40,
            hip: Math.abs(Math.cos(phase * TAU)) * 1.9,
            headYaw: s1 * 0.10,
            lean: 0.035
        };
    }

    /* Punto solidale a un osso, dopo yaw e pitch. Serve per attaccare scarpe e
     * guanti: senza, i guanti fluttuano a mezz'aria quando il braccio oscilla. */
    function bonePoint(lx, ly, lz, yaw, pitch) {
        var cp = Math.cos(pitch), sp = Math.sin(pitch);
        var y1 = ly * cp - lz * sp, z1 = ly * sp + lz * cp;
        var cy = Math.cos(yaw), sy = Math.sin(yaw);
        return [lx * cy - y1 * sy, lx * sy + y1 * cy, z1];
    }

    /* drawBone: come drawMesh, ma con anche una rotazione su x (pitch), che è
     * ciò che fa oscillare un arto. yaw è la direzione in cui guarda il
     * manichino, pitch il movimento dell'articolazione. */
    var boneBuf = new Float32Array(4096);

    function drawBone(mesh, x, y, z, yaw, pitch, rgb, scale) {
        var v = mesh.v, n = v.length / 3;
        if (n * 3 > boneBuf.length) boneBuf = new Float32Array(n * 3);
        var s = scale === undefined ? 1 : scale;
        var cp = Math.cos(pitch) * s, sp = Math.sin(pitch) * s;
        var cy = Math.cos(yaw) * s, sy = Math.sin(yaw) * s;
        var b = boneBuf;

        for (var i = 0; i < v.length; i += 3) {
            var vx = v[i], vy = v[i + 1], vz = v[i + 2];
            var y1 = vy * cp - vz * sp, z1 = vy * sp + vz * cp;
            b[i] = vx * cy - y1 * sy + x;
            b[i + 1] = vx * sy + y1 * cy + y;
            b[i + 2] = z1 * s + z;
        }

        /* Cull e disegno riusando buf: lo riempio con le stesse coordinate. */
        for (var o = 0; o < b.length; o++) buf[o] = b[o];

        var faces = mesh.f, count = 0;
        for (var f = 0; f < faces.length && count < fOrder.length; f++) {
            var face = faces[f];
            var nx = face.n[0], ny = face.n[1], nz = face.n[2];
            /* la normale subisce pitch su x, poi yaw su z */
            var ny1 = ny * cp - nz * sp, nz1 = ny * sp + nz * cp;
            var rx = nx * cy - ny1 * sy, ry = nx * sy + ny1 * cy;
            if (rx * P.viewX + ry * P.viewY + nz1 * P.viewZ <= 0) continue;
            fOrder[count] = f;
            fDepth[count] = depthOfFace(face);
            count++;
        }
        for (var a = 1; a < count; a++) {
            var kf = fOrder[a], kd = fDepth[a], q = a - 1;
            while (q >= 0 && fDepth[q] > kd) { fDepth[q + 1] = fDepth[q]; fOrder[q + 1] = fOrder[q]; q--; }
            fDepth[q + 1] = kd; fOrder[q + 1] = kf;
        }
        for (var d = 0; d < count; d++) {
            var fc = faces[fOrder[d]], idx = fc.i, m = idx.length;
            if (m > fxA.length) { fxA = new Float32Array(m); fyA = new Float32Array(m); }
            for (var k = 0; k < m; k++) {
                var vi = idx[k] * 3;
                var pt = project(b[vi], b[vi + 1], b[vi + 2]);
                fxA[k] = pt[0]; fyA[k] = pt[1];
            }
            var tone = fc.tone === undefined ? 1 : fc.tone;
            ctx.fillStyle = "rgb(" + (clamp(rgb[0] * tone, 0, 255) | 0) + "," +
                (clamp(rgb[1] * tone, 0, 255) | 0) + "," + (clamp(rgb[2] * tone, 0, 255) | 0) + ")";
            ctx.beginPath();
            ctx.moveTo(fxA[0], fyA[0]);
            for (var k2 = 1; k2 < m; k2++) ctx.lineTo(fxA[k2], fyA[k2]);
            ctx.closePath(); ctx.fill();
        }
    }

    /* =========================================================================
     * CAPI — famiglie di mesh
     *
     * Non un mesh per capo (96 mesh da mantenere) ma quindici famiglie
     * parametriche: ogni `shape` del catalogo punta a una famiglia con i suoi
     * numeri. Aggiungere un capo è una riga nel catalogo, non una mesh nuova.
     * ===================================================================== */

    var skinRgb = [222, 186, 160];

    /* anchor: dove nasce il mesh rispetto al manichino.
     *   head    = base del collo
     *   pelvis  = base del bacino
     *   shoulder= linea spalle
     *   leg     = per gamba, è disegnato all'articolazione
     *   foot    = disegnato al piede
     *   hand    = disegnato alla mano                                        */
    var SHAPE_LIB = {
        /* ---- testa ---- */
        hat:      { f: "dome", anchor: "head", r: 5.0, h: 2.4, brim: 6.2 },
        beanie:   { f: "dome", anchor: "head", r: 4.6, h: 4.2, brim: 0 },
        tiara:    { f: "band", anchor: "head", r: 4.2, h: 0.9, spike: 2.2 },
        turban:   { f: "dome", anchor: "head", r: 5.2, h: 5.4, brim: 0 },
        cloche:   { f: "dome", anchor: "head", r: 4.8, h: 4.6, brim: 2.4 },
        overhat:  { f: "dome", anchor: "head", r: 4.4, h: 3.0, brim: 8.4 },
        crown:    { f: "spikes", anchor: "head", r: 4.4, h: 3.6 },
        helmet:   { f: "dome", anchor: "head", r: 4.8, h: 5.0, brim: 0 },
        band:     { f: "band", anchor: "head", r: 4.2, h: 1.0, spike: 0 },
        veil:     { f: "veil", anchor: "head", r: 4.6, h: 9 },
        plume:    { f: "plume", anchor: "head", r: 4.0, h: 5.5 },
        crest:    { f: "spikes", anchor: "head", r: 3.6, h: 4.4 },

        /* ---- busto ---- */
        tee:      { f: "shell", anchor: "pelvis", w: 10.4, d: 5.8, h: 6.5, flare: 0.6 },
        shirt:    { f: "shell", anchor: "pelvis", w: 10.6, d: 6.2, h: 9.5, flare: 0.4 },
        blouse:   { f: "shell", anchor: "pelvis", w: 11.2, d: 6.6, h: 9.5, flare: 1.4 },
        dress:    { f: "shell", anchor: "pelvis", w: 11.0, d: 6.6, h: 9.5, flare: 4.0, skirt: 7 },
        corset:   { f: "shell", anchor: "pelvis", w: 10.2, d: 5.6, h: 6.0, flare: -0.4 },
        vest:     { f: "shell", anchor: "pelvis", w: 11.0, d: 6.2, h: 5.5, flare: 0.6 },
        tunic:    { f: "shell", anchor: "pelvis", w: 11.6, d: 7.0, h: 10.0, flare: 3.0 },
        jacket:   { f: "open",  anchor: "pelvis", w: 11.4, d: 6.6, h: 8.0, flare: 1.0 },
        sweater:  { f: "shell", anchor: "pelvis", w: 11.6, d: 7.2, h: 9.0, flare: 1.0 },
        catsuit:  { f: "shell", anchor: "pelvis", w: 9.6, d: 5.2, h: 9.5, flare: 0 },
        sequin:   { f: "shell", anchor: "pelvis", w: 10.6, d: 6.0, h: 7.0, flare: 0.4 },
        kimono:   { f: "shell", anchor: "pelvis", w: 12.0, d: 7.2, h: 10.5, flare: 5.0 },
        fur:      { f: "shell", anchor: "pelvis", w: 12.4, d: 7.4, h: 8.0, flare: 2.0 },
        suit:     { f: "shell", anchor: "pelvis", w: 10.8, d: 6.4, h: 9.5, flare: 1.6 },
        lace:     { f: "shell", anchor: "pelvis", w: 10.4, d: 5.8, h: 6.5, flare: 0.2 },

        /* ---- gambe ---- */
        trousers: { f: "legs",  anchor: "leg", w: 4.4, d: 4.4, h: 13.5, taper: 0.55 },
        shorts:   { f: "legs",  anchor: "leg", w: 4.8, d: 4.6, h: 6.5, taper: 0.8 },
        skirt:    { f: "skirt", anchor: "pelvis", rTop: 7.4, rBot: 10.0, h: 7.0 },
        longskirt:{ f: "skirt", anchor: "pelvis", rTop: 7.2, rBot: 13.5, h: 18 },
        culottes: { f: "legs",  anchor: "leg", w: 6.4, d: 4.8, h: 11, taper: 0.7 },
        harem:    { f: "legs",  anchor: "leg", w: 5.6, d: 5.2, h: 14, taper: 0.35 },
        zarosa:   { f: "skirt", anchor: "pelvis", rTop: 7.0, rBot: 16.5, h: 22 },
        tutu:     { f: "skirt", anchor: "pelvis", rTop: 6.6, rBot: 15.0, h: 11 },
        overall:  { f: "open",  anchor: "pelvis", w: 11.0, d: 6.4, h: 9.0, flare: 1.0 },

        /* ---- piedi ---- */
        sneaker:  { f: "shoe", anchor: "foot", w: 3.6, d: 8.2, h: 2.6, heel: 1.4 },
        heel:     { f: "shoe", anchor: "foot", w: 3.2, d: 7.4, h: 2.0, heel: 4.2 },
        boot:     { f: "shoe", anchor: "foot", w: 3.8, d: 7.8, h: 6.4, heel: 2.4 },
        loafer:   { f: "shoe", anchor: "foot", w: 3.4, d: 8.0, h: 2.4, heel: 1.6 },
        sandal:   { f: "shoe", anchor: "foot", w: 3.4, d: 7.6, h: 1.2, heel: 0.6 },
        slipper:  { f: "shoe", anchor: "foot", w: 3.4, d: 7.2, h: 1.6, heel: 0.4 },
        wedge:    { f: "shoe", anchor: "foot", w: 3.6, d: 7.8, h: 2.2, heel: 5.2 },
        sock:     { f: "shoe", anchor: "foot", w: 3.6, d: 7.0, h: 4.0, heel: 0.2 },

        /* ---- mani ---- */
        glove:      { f: "hand", anchor: "hand", w: 3.0, d: 3.0, h: 3.4 },
        longglove:  { f: "hand", anchor: "hand", w: 3.0, d: 3.0, h: 8.5 },
        fingerless: { f: "hand", anchor: "hand", w: 2.8, d: 2.8, h: 2.4 },
        bracelet:   { f: "ring", anchor: "hand", r: 2.6, h: 1.0 },
        studband:   { f: "ring", anchor: "hand", r: 2.8, h: 1.6 },
        laceglove:  { f: "hand", anchor: "hand", w: 2.8, d: 2.8, h: 6.0 },
        rings:      { f: "ring", anchor: "hand", r: 2.2, h: 0.8 },
        rosary:     { f: "ring", anchor: "hand", r: 2.4, h: 2.4 },

        /* ---- esterno ---- */
        coat:    { f: "outer", anchor: "shoulder", w: 13.0, d: 7.6, h: 20, flare: 3.0 },
        jacket:  { f: "outer", anchor: "shoulder", w: 12.2, d: 7.0, h: 11, flare: 1.6 },
        furcoat: { f: "outer", anchor: "shoulder", w: 14.4, d: 8.4, h: 19, flare: 4.0 },
        cape:    { f: "cape",  anchor: "shoulder", rTop: 9.0, rBot: 17.0, h: 22 },
        kimonocoat: { f: "outer", anchor: "shoulder", w: 13.6, d: 7.8, h: 17, flare: 5.0 },
        puffer:  { f: "outer", anchor: "shoulder", w: 12.8, d: 7.4, h: 13, flare: 2.2 },
        vestcoat:{ f: "outer", anchor: "shoulder", w: 12.0, d: 6.8, h: 12, flare: 1.0 },
        blazer:  { f: "outer", anchor: "shoulder", w: 12.4, d: 7.2, h: 12, flare: 1.4 },
        techcoat:{ f: "outer", anchor: "shoulder", w: 12.0, d: 6.6, h: 14, flare: 0.6 },
        stole:   { f: "cape",  anchor: "shoulder", rTop: 7.0, rBot: 11.0, h: 15 }
    };

    /* Cache dei mesh dei capi: costruiti una volta per shape, poi ricolorati
     * a ogni disegno. Il tessuto non cambia la geometria ma la lucentezza, e
     * quella la aggiungo sul colore — così variare seta o cotone non richiede
     * due mesh. */
    var gmeshCache = {};

    function garmentMesh(shape) {
        if (gmeshCache[shape]) return gmeshCache[shape];
        var def = SHAPE_LIB[shape];
        if (!def) return null;
        var m = null;
        switch (def.f) {
            case "dome":   m = merge([prism(10, def.r, def.r * 0.86, def.h),
                                      def.brim ? prism(12, def.brim, def.brim, 0.7) : prism(4, 0.1, 0.1, 0.1)]); break;
            case "band":   m = prism(10, def.r, def.r, def.h); break;
            case "spikes": m = merge([prism(10, def.r, def.r * 0.9, def.h),
                                      offsetMesh(prism(6, def.r * 0.5, def.r * 0.5, def.h * 1.5), 0, 0, def.h * 0.5)]); break;
            case "veil":   m = prism(8, def.r, def.r * 1.5, def.h); break;
            case "plume":  m = rotZMesh(prism(4, def.r * 0.3, def.r * 0.12, def.h * 1.6), 0.5); break;
            case "shell":  m = buildShell(def.w, def.d, def.h, def.flare || 0, def.skirt || 0); break;
            case "open":   m = buildOpen(def.w, def.d, def.h, def.flare || 0); break;
            case "legs":   m = buildLeg(def.w, def.d, def.h, def.taper || 1); break;
            case "skirt":  m = prism(12, def.rTop, def.rBot, def.h); break;
            case "shoe":   m = buildShoe(def.w, def.d, def.h, def.heel); break;
            case "hand":   m = box(def.w, def.d, def.h); break;
            case "ring":   m = prism(8, def.r, def.r, def.h); break;
            case "outer":  m = buildShell(def.w, def.d, def.h, def.flare || 0, 0); break;
            case "cape":   m = prism(10, def.rBot, def.rTop, def.h); break;
            default:       m = box(4, 4, 4);
        }
        gmeshCache[shape] = m;
        return m;
    }

    /* Un guscio attorno al busto: base al bacino, alto h. `flare` allarga il
     * fondo (un abito sfila), `skirt` è la gonna che scende oltre il guscio. */
    function buildShell(w, d, h, flare, skirt) {
        var parts = [box(w, d, h)];
        if (flare) parts.push(prism(10, Math.max(1.5, w * 0.5 + flare), w * 0.5 + flare, flare * 1.6));
        if (skirt) parts.push(prism(10, w * 0.5 + flare, w * 0.5 + flare + skirt, skirt));
        return merge(parts.map(function (p, i) {
            return offsetMesh(p, 0, 0, i === 0 ? h / 2 : (i === 1 ? -flare * 0.8 : h - skirt * 0.5));
        }));
    }

    /* Giacca aperta: due pannelli laterali, con uno spiraglio al centro. */
    function buildOpen(w, d, h, flare) {
        var panel = box(w * 0.34, d, h);
        return merge([
            offsetMesh(panel, -w * 0.30, 0, h / 2),
            offsetMesh(panel, w * 0.30, 0, h / 2),
            offsetMesh(box(w * 0.34, d * 1.02, h * 0.12), 0, 0, h / 2)
        ]);
    }

    /* Gamba del capo: base all'articolazione, scende di h, si restringe. */
    function buildLeg(w, d, h, taper) {
        var top = box(w, d, h * 0.5), bot = scaleMesh(box(w, d, h * 0.5), taper, 1, 1);
        return merge([offsetMesh(top, 0, 0, -h * 0.25), offsetMesh(bot, 0, 0, -h * 0.75)]);
    }

    /* Scarpa: una tomaia più un tacco. Il tacco è la differenza fra un
     * anfibio e un décolleté, e si vede. */
    function buildShoe(w, d, h, heel) {
        var parts = [box(w, d, h)];
        if (heel > 0.4) parts.push(offsetMesh(box(w * 0.7, d * 0.34, heel), 0, d * 0.30, -heel / 2 - h * 0.1));
        return merge([offsetMesh(parts[0], 0, 0, h / 2)].concat(
            parts.slice(1).map(function (p) { return p; })));
    }

    /* Pelle sintetica: il tessuto schiarisce il colore, e la seta di più. */
    function fabricColor(colorHex, fabricKey) {
        var base = hexToRgb(colorHex);
        var sheen = (FABRICS[fabricKey] || FABRICS.cotone).sheen;
        return mixRgb(base, [255, 250, 245], sheen * 0.45);
    }

    /* =========================================================================
     * DISEGNO DEL MANICHINO
     *
     * Tutto nasce dal bacino. Per ogni pezzo calcolo l'articolazione, disegno
     * l'osso e poi il capo agganciato allo STESSO punto: un guanto segue la
     * mano, una scarpa segue il piede, una gonna resta ancorata al bacino.
     * ===================================================================== */

    function drawMannequin(rootX, rootY, rootZ, pose, look, yaw) {
        yaw = yaw === undefined ? BODY_YAW : yaw;
        var hipZ = rootZ + FIG.legLen + pose.hip;
        var hipY = rootY;

        /* --- gambe --- */
        var legs = [
            { side: -1, ang: pose.legL },
            { side: 1, ang: pose.legR }
        ];
        for (var i = 0; i < legs.length; i++) {
            var L = legs[i];
            var jx = rootX + L.side * FIG.hipW * 0.42;
            drawBone(BONE.leg, jx, hipY, hipZ, yaw, L.ang, skinRgb);

            /* il piede è la punta dell'osso, quindi lo calcolo con bonePoint */
            var foot = bonePoint(0, 0, -FIG.legLen, yaw, L.ang);
            var fx = jx + foot[0], fy = hipY + foot[1], fz = hipZ + foot[2];
            var it = look.slots.feet;
            if (it && BY_ID[it.gid]) {
                var sm = garmentMesh(BY_ID[it.gid].shape);
                if (sm) {
                    var sd = SHAPE_LIB[BY_ID[it.gid].shape];
                    /* la scarpa poggia col fondo sul pavimento: alzo di metà
                     * altezza, come fa una scarpa vera. */
                    drawBone(sm, fx, fy, fz + (sd.h || 2) * 0.5, yaw, L.ang,
                             fabricColor(COLORS[it.color].hex, it.fabric));
                }
            }
            /* il pantalone segue la gamba, ancorato all'anca */
            var lg = look.slots.legs;
            if (lg && BY_ID[lg.gid]) {
                var lm = garmentMesh(BY_ID[lg.gid].shape);
                if (lm) drawBone(lm, jx, hipY, hipZ, yaw, L.ang,
                                 fabricColor(COLORS[lg.color].hex, lg.fabric));
            }
        }

        /* --- bacino e busto --- */
        drawBone(BONE.hips, rootX, hipY, hipZ - FIG.hipH * 0.5, yaw, 0, skinRgb);
        drawBone(BONE.torso, rootX, hipY, hipZ, yaw, pose.lean, skinRgb);

        var t = look.slots.torso;
        if (t && BY_ID[t.gid]) {
            var tm = garmentMesh(BY_ID[t.gid].shape);
            if (tm) drawBone(tm, rootX, hipY, hipZ, yaw, pose.lean,
                             fabricColor(COLORS[t.color].hex, t.fabric));
        }

        /* --- braccia --- */
        var armZ = hipZ + FIG.torsoH * 0.82;
        var arms = [
            { side: -1, ang: pose.armL },
            { side: 1, ang: pose.armR }
        ];
        for (var a = 0; a < arms.length; a++) {
            var A = arms[a];
            var ax = rootX + A.side * FIG.shoulderW * 0.5;
            drawBone(BONE.arm, ax, hipY, armZ, yaw, A.ang, skinRgb);
            var hand = bonePoint(0, 0, -FIG.armLen, yaw, A.ang);
            var hx = ax + hand[0], hy = hipY + hand[1], hz = armZ + hand[2];
            var hd = look.slots.hands;
            if (hd && BY_ID[hd.gid]) {
                var hm = garmentMesh(BY_ID[hd.gid].shape);
                if (hm) {
                    var hsd = SHAPE_LIB[BY_ID[hd.gid].shape];
                    drawBone(hm, hx, hy, hz - (hsd.h || 3) * 0.5, yaw, A.ang,
                             fabricColor(COLORS[hd.color].hex, hd.fabric));
                }
            }
        }

        /* --- testa --- */
        var headZ = hipZ + FIG.torsoH + FIG.neckH;
        drawBone(BONE.neck, rootX, hipY, hipZ + FIG.torsoH, yaw, 0, skinRgb);
        drawBone(BONE.head, rootX, hipY, headZ, yaw + pose.headYaw, 0, skinRgb);
        var hd2 = look.slots.head;
        if (hd2 && BY_ID[hd2.gid]) {
            var hm2 = garmentMesh(BY_ID[hd2.gid].shape);
            if (hm2) drawBone(hm2, rootX, hipY, headZ, yaw + pose.headYaw, 0,
                              fabricColor(COLORS[hd2.color].hex, hd2.fabric));
        }

        /* --- esterno --- per ultimo, sopra tutto --- */
        var o = look.slots.outer;
        if (o && BY_ID[o.gid]) {
            var om = garmentMesh(BY_ID[o.gid].shape);
            if (om) {
                var osd = SHAPE_LIB[BY_ID[o.gid].shape];
                var oy = hipY, oz = hipZ + FIG.torsoH * 0.55;
                if (osd.f === "cape") oy = hipY;
                drawBone(om, rootX, oy, oz, yaw, pose.lean,
                         fabricColor(COLORS[o.color].hex, o.fabric));
            }
        }
    }

    /* =========================================================================
     * SCENA — passerella, pubblico, luci
     *
     * La passerella corre lungo y. Il modello entra da lontano (y piccolo) e
     * cammina verso la camera (y grande). La camera lo insegue con un ritardo
     * e stringe il piano man mano che si avvicina: è quello che dà la
     * sensazione di passeggiata invece di scorrimento.
     * ===================================================================== */

    var SCENE = {
        runwayFar: -190, runwayNear: 30, runwayW: 30,
        audienceZ: 0, camLag: 0.06
    };

    var scene = {
        active: false,
        look: null,      /* look in mostra */
        phase: 0,        /* 0..1 lungo la passerella */
        entry: null,     /* modello corrente */
        entryScore: null,
        judged: [],
        onDone: null,
        camZoom: 1
    };

    function sceneReset() {
        scene.active = false;
        scene.look = null;
        scene.phase = 0;
        scene.entry = null;
        scene.entryScore = null;
        scene.judged = [];
        scene.onDone = null;
    }

    /* Il pubblico è una griglia di prismi che ondeggia. Non è animato per
     * frame: calcolo l'onda una volta per disegno con la fase della sfilata,
     * così mille spettatori costano mille fillRect e niente di più. */
    function drawAudience(t) {
        for (var row = 0; row < 4; row++) {
            var y = SCENE.runwayFar - 24 - row * 26;
            var z = 0 + row * 2;
            for (var i = -7; i <= 7; i++) {
                var x = i * (SCENE.runwayW * 0.62) + (row % 2 ? 9 : 0);
                var bob = Math.sin(t * 1.6 + i * 0.6 + row) * (row === 0 ? 1.6 : 0.9);
                /* metà del pubblico è in ombra: dà profondità senza luci */
                var shade = 0.30 + 0.22 * ((i + row) % 3) / 2;
                var px = project(x, y, z + bob);
                var sz = Math.max(1.2, 3.4 * cam.zoom);
                ctx.fillStyle = "rgba(28,26,44," + shade.toFixed(2) + ")";
                ctx.fillRect(px[0], px[1] - sz * 2.2, sz, sz * 2.6);
            }
        }
    }

    /* La passerella: un nastro con due bordi. */
    function drawRunway() {
        var y0 = SCENE.runwayFar - 30, y1 = SCENE.runwayNear + 26;
        var halfW = SCENE.runwayW / 2;
        var a = project(-halfW, y0, 0), b = project(halfW, y0, 0);
        var c = project(halfW, y1, 0), d = project(-halfW, y1, 0);
        ctx.fillStyle = "rgba(20,17,32,0.92)";
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
        ctx.closePath(); ctx.fill();

        /* fasce di luce che scorrono: la pedana è il palco */
        ctx.fillStyle = "rgba(232,185,106,0.10)";
        for (var i = 0; i < 6; i++) {
            var yy = y0 + i * ((y1 - y0) / 6);
            var p0 = project(-halfW, yy, 0), p1 = project(halfW, yy + 8, 0);
            var p2 = project(halfW, yy + 3, 0), p3 = project(-halfW, yy + 11, 0);
            ctx.beginPath();
            ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]);
            ctx.closePath(); ctx.fill();
        }
    }

    /* Fari: coni di luce dall'alto. Disegnati come triangoli sfumati con un
     * gradiente lineare, non con un vero volume — a questo budget è la
     * differenza fra due gradienti e cento facce. */
    function drawLights(t) {
        var spots = [-1, 1, -0.35, 0.35];
        for (var i = 0; i < spots.length; i++) {
            var x = spots[i] * SCENE.runwayW * 0.9;
            var y = SCENE.runwayFar - 60 + (i % 2) * 46;
            var top = project(x, y, 120);
            var bl = project(x - 16, y + 74, 0), br = project(x + 16, y + 74, 0);
            var g = ctx.createLinearGradient(top[0], top[1], bl[0], bl[1]);
            var pulse = 0.10 + 0.05 * Math.sin(t * 1.3 + i);
            g.addColorStop(0, "rgba(255,240,205," + pulse.toFixed(3) + ")");
            g.addColorStop(1, "rgba(255,240,205,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(top[0], top[1]);
            ctx.lineTo(bl[0], bl[1]);
            ctx.lineTo(br[0], br[1]);
            ctx.closePath(); ctx.fill();
        }
    }

    /* =========================================================================
     * SIMULAZIONE SFILATA
     *
     * Una sfilata è una coda di uscite: ogni uscita è un look e una modella.
     * La modella cammina, i giudici la guardano a metà passerella, il punteggio
     * esce mentre cammina. I quattro tipi di sfilata cambiano UNA regola di
     * punteggio, non il flusso.
     * ===================================================================== */

    var SHOW = null;

    function startShow(cfg) {
        SHOW = {
            type: cfg.type,
            theme: cfg.theme || null,
            venue: CITIES[save.city].venues[cfg.venue],
            judgeCount: CITIES[save.city].venues[cfg.venue].judges,
            judges: [],
            rivals: cfg.type === "sfida" ? cfg.rivalLooks : null,
            queue: cfg.entries.slice(),
            idx: 0,
            running: true,
            total: 0,
            best: 0,
            rivalTotal: 0,
            payout: 0,
            fame: 0,
            entries: []
        };
        for (var i = 0; i < SHOW.judgeCount; i++) {
            SHOW.judges.push({
                name: JUDGE_NAMES[i % JUDGE_NAMES.length],
                bias: TAGS[Math.floor(Math.random() * TAGS.length)],
                strict: 0.7 + Math.random() * 0.6
            });
        }
        sceneReset();
        scene.active = true;
        scene.entry = SHOW.queue[0];
        scene.phase = 0;
        scene.camZoom = 1;
        return SHOW;
    }

    var JUDGE_NAMES = ["A. Moretti", "J. Duval", "K. Tanaka", "M. Rossi", "L. Ashford", "S. Bianchi"];

    /* Il "benefico" non consuma la sfilata della stagione: è una strada
     * secondaria, senza premio, e per questo non deve chiudere quella
     * principale. */
    var SHOW_TYPE_BLOCK = { tema: true, collezione: true, sfida: true, benefico: false };

    /* Ogni giudice dà un voto sul look, con il suo bias e la sua severità.
     * Un giudice severo abbassa tutto, un giudice con un bias premia quel tag:
     * è la ragione per cui una sfilata TEMA può andare bene con un giudice e
     * male con un altro, e va pianificata. */
    function judgeScore(judge, look, wanted, tr) {
        var base = scoreLook(look, wanted, tr, null).total;
        var tags = [];
        for (var k in look.slots) {
            /* Uno slot vuoto è null: leggerlo senza controllo è il modo in cui
             * una sfilata con un look a metà pianta il gioco. */
            var it = look.slots[k];
            if (!it) continue;
            var g = BY_ID[it.gid];
            if (g) for (var t = 0; t < g.tags.length; t++) tags.push(g.tags[t]);
        }
        var biasHit = tags.filter(function (x) { return x === judge.bias; }).length;
        return base * judge.strict * (1 + Math.min(0.35, biasHit * 0.12));
    }

    function advanceShow(dt) {
        if (!scene.active || !SHOW || !SHOW.running) return;
        scene.phase += dt * 0.115;
        if (scene.phase > 1) {
            /* uscita finita: il punteggio era già stato emesso a metà */
            SHOW.idx++;
            if (SHOW.idx >= SHOW.queue.length) finishShow();
            else {
                scene.entry = SHOW.queue[SHOW.idx];
                scene.phase = 0;
            }
            return;
        }
        if (Math.abs(scene.phase - 0.5) < dt * 0.115 * 0.6) judgeEntry();
    }

    function judgeEntry() {
        var e = scene.entry;
        if (!e || e.scored) return;
        e.scored = true;
        var tr = trendFor(save.season);
        var wanted = SHOW.type === "tema" ? SHOW.theme : null;
        var model = e.model;
        var s = 0;
        for (var i = 0; i < SHOW.judges.length; i++) {
            s += judgeScore(SHOW.judges[i], e.look, wanted, tr);
        }
        s /= SHOW.judges.length;
        /* il modello entra qui, non nel voto del giudice: i giudici giudicano
         * il look, la modella lo presenta. */
        s *= 0.75 + (modelScore(model) / 100) * 0.5;
        if (SHOW.type === "collezione") {
            s *= 1 + (scoreLook(e.look, null, tr, model).harmony.pts / 100);
        }
        var entry = { look: e.look, model: model, score: Math.round(s), scored: true };
        SHOW.entries.push(entry);
        SHOW.total += entry.score;
        if (entry.score > SHOW.best) SHOW.best = entry.score;
        scene.entryScore = entry;
    }

    function finishShow() {
        SHOW.running = false;
        scene.active = false;
        var venue = SHOW.venue;
        var prestige = 1 + save.fame / 400;

        if (SHOW.type === "benefico") {
            /* Nessun premio. In cambio un capo unico, proporzionale al totale:
             * fare bene la sfilata dà un capo migliore. */
            var pool = GARMENTS.filter(function (g) { return !ownsGarment(g.id) && g.tier >= 4; });
            var gift = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
            if (gift) save.owned.push(gift.id);
            SHOW.payout = 0;
            SHOW.fame = Math.round(SHOW.total * 0.05 * prestige) + 20;
            SHOW.gift = gift;
        } else {
            SHOW.payout = Math.round(SHOW.total * 1.6 * prestige) - venue.rent;
            SHOW.fame = Math.round(SHOW.total * 0.03 * prestige) + 6;
            if (SHOW.payout < 0) SHOW.payout = 0;
        }

        save.money += SHOW.payout;
        save.fame += SHOW.fame;
        save.stats.shows++;
        save.stats.earned += SHOW.payout;
        if (SHOW.best > save.stats.bestScore) save.stats.bestScore = SHOW.best;
        grantXp(Math.round(28 + SHOW.total * 0.06 + SHOW.fame * 1.5));
        log("SFILATA " + venue.name.toUpperCase(),
            showType(SHOW.type).name + " · totale " + fmt(SHOW.total) +
            " · " + fmt(SHOW.payout) + "€ · fama +" + SHOW.fame);
        persist();
    }

    /* =========================================================================
     * CICLO DI RENDER
     *
     * Due scene sulla stessa pietra: l'atelier (manichino su piedistallo che
     * gira) e la sfilata (passerella, pubblico, luci, camera che insegue).
     * Un solo requestAnimationFrame per entrambe.
     * ===================================================================== */

    var turntable = 0;
    var lastT = 0;
    var previewLook = { slots: {} };

    function emptyLook() {
        var l = { slots: {} };
        for (var i = 0; i < SLOTS.length; i++) l.slots[SLOTS[i].key] = null;
        return l;
    }

    function loop(t) {
        var dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0.016;
        lastT = t;
        turntable += dt * 0.35;

        /* L'interfaccia si ritira mentre la passerella gira: è l'unico momento
         * in cui il gioco è uno spettacolo, e uno spettacolo non si guarda
         * attraverso un elenco di capi. */
        document.body.classList.toggle("is-showing", !!scene.active);

        if (!ctx) { requestAnimationFrame(loop); return; }
        ctx.clearRect(0, 0, W, H);

        if (scene.active) {
            advanceShow(dt);
            renderShowScene(t / 1000);
        } else {
            renderAtelier();
        }
        if (!document.hidden) requestAnimationFrame(loop);
    }

    function renderAtelier() {
        /* fondale: un vago bagliore e il pavimento */
        var g = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, W * 0.6);
        g.addColorStop(0, "rgba(46,26,58,0.55)");
        g.addColorStop(1, "rgba(12,8,18,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        cam.x = 0; cam.y = 0; cam.ox = 0; cam.oy = H * 0.10; cam.zoom = Math.min(W, H) / 90;

        /* piedistallo */
        var pz = project(0, 0, -1.4);
        ctx.fillStyle = "rgba(232,185,106,0.10)";
        ctx.beginPath();
        ctx.ellipse(pz[0], pz[1], 26 * cam.zoom, 13 * cam.zoom, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(232,185,106,0.35)";
        ctx.lineWidth = 1.4;
        ctx.stroke();

        var pose = walkPose((turntable * 0.25) % 1);
        drawMannequin(0, 0, 0, pose, previewLook, turntable);
    }

    function renderShowScene(t) {
        var e = scene.entry;
        /* la camera insegue il modello con un ritardo, e stringe il piano
         * man mano che si avvicina: è ciò che dà la passeggiata. */
        var my = lerp(SCENE.runwayFar, SCENE.runwayNear, scene.phase);
        cam.y = my + 34;
        var near = 1 - clamp((my - SCENE.runwayFar) / (SCENE.runwayNear - SCENE.runwayFar), 0, 1);
        cam.zoom = lerp(Math.min(W, H) / 210, Math.min(W, H) / 120, near);
        cam.x = 0; cam.ox = 0; cam.oy = 0;

        drawAudience(t);
        drawLights(t);
        drawRunway();

        if (e) {
            var pose = walkPose((t * (scene.phase > 0.02 ? 0.62 : 0.18)) % 1);
            drawMannequin(0, my, 0, pose, e.look, BODY_YAW);
        }

        /* sovraimpressione: numero di uscita e punteggio mentre cammina */
        if (SHOW) {
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(246,241,244,0.55)";
            ctx.font = "600 11px ui-monospace, monospace";
            ctx.fillText("USCITA " + (SHOW.idx + 1) + " / " + SHOW.queue.length,
                W * 0.5, H * 0.10);
            if (scene.entryScore) {
                ctx.fillStyle = "rgba(232,185,106,0.95)";
                ctx.font = "800 15px ui-monospace, monospace";
                ctx.fillText(String(scene.entryScore.score), W * 0.5, H * 0.145);
                ctx.fillStyle = "rgba(246,241,244,0.4)";
                ctx.font = "600 9px ui-monospace, monospace";
                ctx.fillText(scene.entryScore.model.name, W * 0.5, H * 0.10 + 16);
            }
        }
    }

    /* =========================================================================
     * INTERFACCIA
     *
     * Le liste sono generate in JS, come in sector7: una riga di markup per
     * dato, così un capo nuovo non richiede di toccare l'HTML.
     * ===================================================================== */

    var D = {};
    var ui = {
        look: emptyLook(),
        commission: 0,
        pickerSlot: null,
        pickerColor: "nero",
        pickerFabric: "cotone",
        wrTab: "torso",
        showVenue: 0,
        showType: "tema",
        showTheme: "elegante",
        showLooks: [],
        showModels: [],
        screen: "menu"
    };
    previewLook = ui.look;

    function $(id) { return document.getElementById(id); }

    /* Le chiavi di D sono camelCase mentre gli id dell'HTML hanno i trattini:
     * questa funzione è il ponte. Senza, `D["wr-body"]` esiste e `D.wrBody` è
     * undefined — che è esattamente il bug che ha reso vuoti tutti i pannelli
     * al primo avvio, perché l'errore nacceva solo al momento di scrivere. */
    function camel(s) {
        return String(s).replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    }

    function initDom() {
        ["hud-money", "hud-fame", "hud-level", "hud-xp-fill", "hud-season", "hud-day",
            "brief", "slots", "scorecard", "wr-tabs", "wr-body", "md-body",
            "sh-venue", "sh-type", "sh-looks", "sh-go", "ct-body", "rp-body",
            "picker", "picker-title", "picker-body", "toast", "nav",
            "m-shows", "m-looks", "m-best", "m-fame", "stage"].forEach(function (id) {
            D[camel(id)] = $(id);
        });
        cv = D.stage;
        ctx = cv.getContext("2d");
    }

    function resize() {
        W = window.innerWidth; H = window.innerHeight;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = W * DPR; cv.height = H * DPR;
        cv.style.width = W + "px"; cv.style.height = H + "px";
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    /* ---- HUD ---- */
    function updateHud() {
        $("hud-money").textContent = fmt(save.money);
        $("hud-fame").textContent = fmt(save.fame);
        $("hud-level").textContent = save.level;
        $("hud-season").textContent = save.season;
        $("hud-day").textContent = save.day;
        var need = xpForLevel(save.level);
        $("hud-xp-fill").style.width = (clamp(save.xp / need, 0, 1) * 100).toFixed(1) + "%";
    }

    /* ---- Navigazione ---- */
    var SCREENS = ["menu", "atelier", "wardrobe", "models", "show", "city", "report"];

    function show(name) {
        ui.screen = name;
        for (var i = 0; i < SCREENS.length; i++) {
            $( "scr-" + SCREENS[i]).classList.toggle("hidden", SCREENS[i] !== name);
        }
        var btns = D.nav.querySelectorAll(".nav-btn");
        for (var b = 0; b < btns.length; b++) {
            btns[b].classList.toggle("is-on", btns[b].dataset.nav === name);
        }
        D.nav.classList.toggle("hidden", name === "menu");
        if (name === "atelier") renderAtelierUi();
        if (name === "wardrobe") renderWardrobe();
        if (name === "models") renderModels();
        if (name === "show") renderShowSetup();
        if (name === "city") renderCity();
        if (name === "report") renderReport();
    }

    /* ---- Atelier ---- */
    function currentCommission() { return save.commissions[ui.commission] || null; }

    function renderAtelierUi() {
        var c = currentCommission();
        var tr = trendFor(save.season);
        if (c) {
            D.brief.innerHTML =
                '<div class="brief-top"><b>' + esc(c.client) + '</b>' +
                '<span>' + fmt(c.pay) + ' €</span></div>' +
                '<div class="brief-row">' + esc(c.occasion) + ' · ' + esc(c.city) + '</div>' +
                '<div class="brief-row">Budget <em>' + fmt(c.budget) + ' €</em> · ' +
                'fama <em>+' + c.fame + '</em></div>' +
                '<div class="brief-vibe">VIBE ' + esc(c.vibe).toUpperCase() + '</div>';
        } else {
            D.brief.innerHTML = '<div class="brief-row">Nessuna commissione. ' +
                'Vai in Città per trovarne, o lavora per la sfilata.</div>';
        }

        var rows = "";
        for (var i = 0; i < SLOTS.length; i++) {
            var s = SLOTS[i];
            var it = ui.look.slots[s.key];
            var open = save.slots.indexOf(s.key) !== -1;
            var g = it && BY_ID[it.gid];
            rows += '<div class="slot' + (g ? "" : " empty") + '" data-slot="' + s.key + '">' +
                '<span class="slot-lbl">' + s.name + '</span>' +
                '<div class="slot-main">' +
                '<span class="slot-name">' + (g ? esc(g.name) : (open ? "— vuoto —" : "BLOCCATO")) + '</span>' +
                (g ? '<span class="slot-sub">' + esc((FABRICS[it.fabric] || FABRICS.cotone).name) +
                    ' · ' + esc(COLORS[it.color].name) + ' · ' + g.tags.map(esc).join(" + ") + '</span>' : "") +
                '</div>' +
                (g ? '<span class="slot-swatch" style="background:' + COLORS[it.color].hex + '"></span>' : "") +
                '<span class="slot-arrow">›</span></div>';
        }
        D.slots.innerHTML = rows;
        var els = D.slots.querySelectorAll(".slot");
        for (var k = 0; k < els.length; k++) {
            (function (el) {
                el.addEventListener("click", function () { openPicker(el.dataset.slot); });
            })(els[k]);
        }

        renderScorecard();
    }

    function renderScorecard() {
        var c = currentCommission();
        var tr = trendFor(save.season);
        var model = availableModel();
        var r = scoreLook(ui.look, c ? c.vibe : null, tr, model);
        var h = r.harmony;

        function bar(label, val, max) {
            return '<div class="sc-row"><span>' + label + '</span>' +
                '<span class="sc-bar"><i style="width:' +
                (clamp(val / Math.max(1, max), 0, 1) * 100).toFixed(0) + '%"></i></span>' +
                '<b>' + fmt(val) + '</b></div>';
        }

        var cost = lookCost(ui.look);
        var over = c && cost > c.pay;

        D.scorecard.innerHTML =
            '<div class="sc-total"><b>' + fmt(r.total) + '</b><span>PUNTEGGIO</span>' +
            '<span class="sc-harmony" style="color:' + (h.pts >= 14 ? "var(--ok)" : h.pts < 0 ? "var(--bad)" : "var(--muted)") + '">' +
            h.type + ' ' + (h.pts > 0 ? "+" + h.pts : h.pts) + '</span></div>' +
            '<div class="sc-rows">' +
            bar("Capi", r.parts.garments, 260) +
            bar("Brief", r.parts.tag, 90) +
            bar("Trend", r.parts.trend, 80) +
            bar("Tessuto", r.parts.fabric, 140) +
            bar("Modella", r.parts.model, 80) +
            '</div>' +
            '<p class="sc-note">' + esc(h.note) +
            (tr ? ' · Trend caldi: <b>' + tr.hot.slice(0, 2).map(esc).join(", ") + '</b>' +
                   ' (nascosto: ' + esc(tr.wild) + ')' : '') +
            (c ? ' · Costo <b style="color:' + (over ? "var(--bad)" : "var(--ok)") + '">' +
                   fmt(cost) + " / " + fmt(c.pay) + ' €</b>' : '') + '</p>';
    }

    /* Il costo del look è la manodopera più il tessuto, a ogni uso. Equilibrio
     * deliberato: un look base di livello 1 su quattro slot in cotone costa
     * circa 55 €, e la prima commissione paga 95-160. Quindi il look base
     * sta nel budget, e la seta (48 € di tessuto per capo) no: il tessuto
     * costoso è una scelta, non un obbligo. */
    function lookCost(look) {
        var t = 0;
        for (var k in look.slots) {
            var it = look.slots[k];
            if (!it) continue;
            var g = BY_ID[it.gid];
            if (!g) continue;
            var f = FABRICS[it.fabric] || FABRICS.cotone;
            t += g.base * 0.7 + f.cost * 1.6;
        }
        return Math.round(t);
    }

    /* =========================================================================
     * PICKER
     *
     * Tre livelli in un pannello: il capo, il colore, il tessuto. Sono nello
     * stesso posto perché sono una sola decisione — "questo abito, in turchese,
     * in seta" — e separarli in tre schermate triplicherebbe i tocchi.
     * ===================================================================== */

    function openPicker(slotKey) {
        if (save.slots.indexOf(slotKey) === -1) { toast("Slot bloccato: sali di livello"); return; }
        ui.pickerSlot = slotKey;
        var it = ui.look.slots[slotKey];
        if (it) {
            ui.pickerColor = it.color;
            ui.pickerFabric = it.fabric;
        } else {
            ui.pickerColor = "nero";
            ui.pickerFabric = "cotone";
        }
        D.picker.classList.remove("hidden");
        renderPicker();
    }

    function renderPicker() {
        var slotKey = ui.pickerSlot;
        var slot = null;
        for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i].key === slotKey) slot = SLOTS[i];
        D.pickerTitle.textContent = slot ? slot.name : "CAPO";

        var list = BY_SLOT[slotKey] || [];
        var tr = trendFor(save.season);
        var c = currentCommission();
        var html = "";

        /* riga "niente": togliere un capo è una scelta, non un reset */
        html += '<div class="row"><div class="row-main"><b>— vuoto —</b>' +
            '<span>Lascia lo slot libero</span></div>' +
            '<button class="btn small" data-pick="" type="button">TOGLI</button></div>';

        for (var k = 0; k < list.length; k++) {
            var g = list[k];
            var owned = ownsGarment(g.id);
            var slotOpen = save.slots.indexOf(g.slot) !== -1;
            var tierOk = g.tier <= maxTierUnlocked();
            var price = garmentPrice(g);
            var on = ui.look.slots[slotKey] && ui.look.slots[slotKey].gid === g.id;
            var tags = g.tags.map(function (t) {
                var cls = "tag" + (tagIsHot(t, tr) ? " hot" : tagIsCold(t, tr) ? " cold" : "");
                return '<span class="' + cls + '">' + esc(t) + '</span>';
            }).join("");

            html += '<div class="row' + (on ? " is-on" : "") + (owned || slotOpen ? "" : " locked") + '">' +
                '<div class="row-main"><b>' + esc(g.name) + '</b>' +
                '<span>liv ' + g.tier + (owned ? "" : " · " + fmt(price) + " €") + '</span>' +
                '<span class="row-tags">' + tags + '</span></div>' +
                (owned || slotOpen ? "" :
                    '<button class="btn buy" data-buy="' + g.id + '" type="button"' +
                    (tierOk ? "" : " disabled") + '>ACQUISTA</button>') +
                (owned ? '<button class="btn buy" data-pick="' + g.id + '" type="button">USA</button>' : "") +
                '</div>';
        }
        html += '<div class="sh-block"><h3>COLORE</h3><div class="chips" id="pick-colors"></div></div>';
        html += '<div class="sh-block"><h3>TESSUTO</h3><div class="chips" id="pick-fabrics"></div></div>';

        D.pickerBody.innerHTML = html;

        /* colori */
        var ch = "";
        for (var ci = 0; ci < COLOR_KEYS.length; ci++) {
            var ck = COLOR_KEYS[ci];
            var stock = dyeStock(ck);
            var has = save.dyes[ck] !== undefined;
            ch += '<button class="chip sw' + (ui.pickerColor === ck ? " is-on" : "") + '" ' +
                'data-color="' + ck + '" type="button"' +
                (has ? "" : " disabled") +
                ' style="background:' + COLORS[ck].hex + '" title="' + esc(COLORS[ck].name) +
                ' (' + stock + ')"></button>';
        }
        var cel = $("pick-colors");
        if (cel) cel.innerHTML = ch;

        /* tessuti */
        var fh = "";
        for (var fi = 0; fi < FABRIC_KEYS.length; fi++) {
            var fk = FABRIC_KEYS[fi];
            var f = FABRICS[fk];
            var ok = unlocked("fabric", fk);
            fh += '<button class="chip' + (ui.pickerFabric === fk ? " is-on" : "") + '" ' +
                'data-fabric="' + fk + '" type="button"' + (ok ? "" : " disabled") + '>' +
                esc(f.name) + '</button>';
        }
        var fel = $("pick-fabrics");
        if (fel) fel.innerHTML = fh;

        wirePicker();
        void c;
    }

    function wirePicker() {
        var body = D.pickerBody;
        var picks = body.querySelectorAll("[data-pick]");
        for (var i = 0; i < picks.length; i++) {
            (function (b) {
                b.addEventListener("click", function () {
                    var gid = b.dataset.pick;
                    if (!gid) { ui.look.slots[ui.pickerSlot] = null; }
                    else {
                        ui.look.slots[ui.pickerSlot] = {
                            gid: gid, color: ui.pickerColor, fabric: ui.pickerFabric
                        };
                        /* consuma una tintura: i colori hanno scorte, ed è
                         * l'unica scarsità oltre al tempo. */
                        if (dyeStock(ui.pickerColor) > 0) {
                            save.dyes[ui.pickerColor]--;
                        }
                    }
                    persist();
                    renderAtelierUi();
                });
            })(picks[i]);
        }
        var buys = body.querySelectorAll("[data-buy]");
        for (var b = 0; b < buys.length; b++) {
            (function (el) {
                el.addEventListener("click", function () {
                    if (buyGarment(el.dataset.buy)) {
                        toast("Acquistato");
                        renderPicker();
                    } else {
                        toast("Non puoi permettertelo", true);
                    }
                });
            })(buys[b]);
        }
        var cols = body.querySelectorAll("[data-color]");
        for (var c = 0; c < cols.length; c++) {
            (function (el) {
                el.addEventListener("click", function () {
                    ui.pickerColor = el.dataset.color;
                    var it = ui.look.slots[ui.pickerSlot];
                    if (it) { it.color = ui.pickerColor; persist(); }
                    renderPicker();
                    renderAtelierUi();
                });
            })(cols[c]);
        }
        var fabs = body.querySelectorAll("[data-fabric]");
        for (var f = 0; f < fabs.length; f++) {
            (function (el) {
                el.addEventListener("click", function () {
                    ui.pickerFabric = el.dataset.fabric;
                    var it = ui.look.slots[ui.pickerSlot];
                    if (it) { it.fabric = ui.pickerFabric; persist(); }
                    renderPicker();
                    renderAtelierUi();
                });
            })(fabs[f]);
        }
    }

    /* =========================================================================
     * GUARDAROBA
     *
     * Sei linguette, una per slot, e dentro l'elenco dei capi. Comprare,
     * tingere, craftare: tre modi di spendere soldi con tre rapporti diversi.
     * ===================================================================== */

    function renderWardrobe() {
        var tabs = "";
        for (var i = 0; i < SLOTS.length; i++) {
            tabs += '<button class="wr-tab' + (ui.wrTab === SLOTS[i].key ? " is-on" : "") +
                '" data-wrtab="' + SLOTS[i].key + '" type="button">' + SLOTS[i].name + '</button>';
        }
        D.wrTabs.innerHTML = tabs;
        var tw = D.wrTabs.querySelectorAll("[data-wrtab]");
        for (var t = 0; t < tw.length; t++) {
            (function (el) {
                el.addEventListener("click", function () { ui.wrTab = el.dataset.wrtab; renderWardrobe(); });
            })(tw[t]);
        }

        var list = BY_SLOT[ui.wrTab] || [];
        var html = "";
        for (var k = 0; k < list.length; k++) {
            var g = list[k];
            var owned = ownsGarment(g.id);
            var tierOk = g.tier <= maxTierUnlocked();
            var price = garmentPrice(g.id === undefined || g);
            html += '<div class="row' + (owned ? " is-on" : "") + (!tierOk ? " locked" : "") + '">' +
                '<div class="row-main"><b>' + esc(g.name) + '</b>' +
                '<span>' + esc(g.tags.join(" + ")) + ' · liv ' + g.tier + '</span></div>' +
                (owned ? '<span class="row-price">TUO</span>' :
                    '<button class="btn buy" data-wbuy="' + g.id + '" type="button"' +
                    (tierOk && save.money >= price ? "" : " disabled") + '>' + fmt(price) + ' €</button>') +
                '</div>';
        }
        /* tinture */
        html += '<div class="sh-block"><h3>TINTURE</h3>' +
            '<p>Un colore ha scorte. Quando finisce non ritorna per stagioni.</p>';
        for (var c = 0; c < COLOR_KEYS.length; c++) {
            var ck = COLOR_KEYS[c];
            var has = save.dyes[ck] !== undefined;
            var stock = dyeStock(ck);
            var dprice = 30 + c * 12;
            html += '<div class="row"><span class="slot-swatch" style="background:' +
                COLORS[ck].hex + '"></span>' +
                '<div class="row-main"><b>' + esc(COLORS[ck].name) + '</b>' +
                '<span>' + (has ? "scorta: " + stock : "non sbloccato") + '</span></div>' +
                (has ? '<button class="btn buy" data-dye="' + ck + '" type="button"' +
                    (stock < 12 && save.money >= dprice ? "" : " disabled") + '>' + fmt(dprice) + ' € (+3)</button>' : "") +
                '</div>';
        }
        html += '</div>';

        /* craft */
        var craftable = GARMENTS.filter(function (g) {
            return !ownsGarment(g.id) && g.tier >= 3 && g.tier <= maxTierUnlocked();
        }).slice(0, 6);
        html += '<div class="sh-block"><h3>CUCITURA A MANO</h3>' +
            '<p>Converti soldi in un capo di livello alto senza aspettare il livello. Costa più del doppio.</p>';
        for (var m = 0; m < craftable.length; m++) {
            var cg = craftable[m];
            var cost = Math.round(garmentPrice(cg) * 2.4 + 40);
            html += '<div class="row"><div class="row-main"><b>' + esc(cg.name) + '</b>' +
                '<span>' + esc(cg.tags.join(" + ")) + '</span></div>' +
                '<button class="btn buy" data-craft="' + cg.id + '" type="button"' +
                (save.money >= cost ? "" : " disabled") + '>' + fmt(cost) + ' €</button></div>';
        }
        html += '</div>';

        D.wrBody.innerHTML = html;

        var bs = D.wrBody.querySelectorAll("[data-wbuy]");
        for (var b = 0; b < bs.length; b++) {
            (function (el) {
                el.addEventListener("click", function () {
                    if (buyGarment(el.dataset.wbuy)) { toast("Acquistato"); renderWardrobe(); }
                    else toast("Non puoi permettertelo", true);
                });
            })(bs[b]);
        }
        var ds = D.wrBody.querySelectorAll("[data-dye]");
        for (var d = 0; d < ds.length; d++) {
            (function (el) {
                el.addEventListener("click", function () {
                    if (buyDye(el.dataset.dye)) { toast("Tintura comprata"); renderWardrobe(); }
                    else toast("Scorta piena o soldi pochi", true);
                });
            })(ds[d]);
        }
        var cs = D.wrBody.querySelectorAll("[data-craft]");
        for (var cc = 0; cc < cs.length; cc++) {
            (function (el) {
                el.addEventListener("click", function () {
                    if (craftGarment(el.dataset.craft)) { toast("Cucito"); renderWardrobe(); }
                    else toast("Non puoi permettertelo", true);
                });
            })(cs[cc]);
        }
    }

    /* =========================================================================
     * Modelli
     *
     * Assumere costa, far riposare costa un giorno. Una modella stanca non va
     * in passerella: la resistenza è una risorsa che si consuma durante la
     * sfilata e si ricarica col tempo.
     * ===================================================================== */

    function renderModels() {
        var html = "";
        if (!save.models.length) {
            html += '<div class="row"><div class="row-main"><b>Nessuna modella</b>' +
                '<span>Assumine una per poter presentare i look.</span></div></div>';
        }
        for (var i = 0; i < save.models.length; i++) {
            var m = save.models[i];
            var tired = m.tired >= 100;
            html += '<div class="row' + (tired ? " locked" : "") + '">' +
                '<div class="row-main"><b>' + esc(m.name) + '</b>' +
                '<span>portamento ' + m.portamento + ' · appeal ' + m.appeal +
                ' · resistenza ' + m.resistencia + ' · fama ' + m.fama + '</span>' +
                '<span>stanca al ' + m.tired + '%</span></div>' +
                '<button class="btn small" data-rest="' + m.id + '" type="button"' +
                (tired ? "" : " disabled") + '>RIPOSA</button></div>';
        }
        /* hiring */
        var hireCost = 120 + save.level * 60;
        html += '<div class="sh-block"><h3>ASSUMI</h3>' +
            '<p>Una modella nuova ha statistiche casuali: a volte è un affare, a volte no.</p>' +
            '<button class="btn primary" id="btn-hire" type="button">ASSUMI · ' + fmt(hireCost) + ' €</button></div>';
        D.mdBody.innerHTML = html;

        var rs = D.mdBody.querySelectorAll("[data-rest]");
        for (var r = 0; r < rs.length; r++) {
            (function (el) {
                el.addEventListener("click", function () {
                    for (var j = 0; j < save.models.length; j++) {
                        if (save.models[j].id === el.dataset.rest) {
                            save.models[j].tired = 0;
                            save.day++;
                            toast("Riposata · giorno " + save.day);
                            updateHud(); persist();
                        }
                    }
                    renderModels();
                });
            })(rs[r]);
        }
        var hb = $("btn-hire");
        if (hb) {
            hb.addEventListener("click", function () {
                if (save.money < hireCost) { toast("Non puoi permettertelo", true); return; }
                save.money -= hireCost;
                var m = makeModel(Math.random, save.level);
                save.models.push(m);
                toast(m.name + " entra in agenzia");
                updateHud(); persist(); renderModels();
            });
        }
    }

    /* =========================================================================
     * SFILATA — setup
     *
     * Quattro decisioni: dove, che tipo, quali look, quali modelle. Ognuna ha
     * un costo o un limite, e la venue è una scommessa: l'affitto si paga
     * sempre, il premio solo se va bene.
     * ===================================================================== */

    function renderShowSetup() {
        var city = CITIES[save.city];
        var venue = city.venues[ui.showVenue];

        var vh = '<div class="sh-block"><h3>VENUE · ' + esc(city.name) + '</h3>';
        for (var v = 0; v < city.venues.length; v++) {
            var ve = city.venues[v];
            var open = save.fame >= ve.minFame;
            vh += '<div class="row' + (ui.showVenue === v ? " is-on" : "") + (!open ? " locked" : "") + '">' +
                '<div class="row-main"><b>' + esc(ve.name) + '</b>' +
                '<span>' + ve.judges + ' giudici · ' + ve.looks + ' look · affitto ' + fmt(ve.rent) + ' €</span></div>' +
                (open ? '<button class="btn small" data-venue="' + v + '" type="button">SCEGLI</button>'
                    : '<span class="row-price">☆' + fmt(ve.minFame) + '</span>') + '</div>';
        }
        D.shVenue.innerHTML = vh + '</div>';

        var th = '<div class="sh-block"><h3>TIPO DI SFILATA</h3>';
        for (var s = 0; s < SHOW_TYPES.length; s++) {
            var st = SHOW_TYPES[s];
            var ok = save.level >= st.minLevel;
            th += '<div class="row' + (ui.showType === st.id ? " is-on" : "") + (!ok ? " locked" : "") + '">' +
                '<div class="row-main"><b>' + esc(st.name) + '</b><span>' + esc(st.blurb) + '</span></div>' +
                (ok ? '<button class="btn small" data-stype="' + st.id + '" type="button">SCEGLI</button>'
                    : '<span class="row-price">LIV ' + st.minLevel + '</span>') + '</div>';
        }
        /* tema: solo per la sfilata TEMA. È una scelta del giocatore, non
         * sorteggiata: scommettere sul tag giusto è il gioco. */
        if (ui.showType === "tema") {
            th += '<div class="sh-block"><h3>TEMA DICHIARATO</h3><div class="chips" id="pick-theme"></div></div>';
        }
        D.shType.innerHTML = th + '</div>';

        /* look disponibili: i look salvati, e se non ce ne sono si costruisce
         * al volo da ciò che si indossa adesso. */
        var looks = save.wardrobe.length ? save.wardrobe : [ui.look];
        var lh = '<div class="sh-block"><h3>LOOK · ' + venue.looks + ' AMMESSI</h3>' +
            '<p>Seleziona fino a ' + venue.looks + '. Il primo look è quello che porti adesso.</p>';
        for (var l = 0; l < looks.length && l < venue.looks; l++) {
            var lk = looks[l];
            var on = ui.showLooks.indexOf(l) !== -1;
            var nm = lookName(lk);
            lh += '<div class="sh-look' + (on ? " is-on" : "") + '" data-look="' + l + '">' +
                '<i>' + (l + 1) + '</i><span>' + esc(nm) + '</span></div>';
        }
        D.shLooks.innerHTML = lh +
            '<button class="btn small" id="btn-looks-all" type="button">SELEZIONA TUTTI</button></div>';

        /* modelle */
        var models = save.models.filter(function (m) { return m.tired < 100; });
        var mh = '<div class="sh-block"><h3>MODELLE</h3>';
        if (!models.length) mh += '<p>Nessuna modella riposata. Riposane una nella sezione Modelle.</p>';
        for (var mm = 0; mm < models.length; mm++) {
            var mo = models[mm];
            var mon = ui.showModels.indexOf(mo.id) !== -1;
            mh += '<div class="sh-look' + (mon ? " is-on" : "") + '" data-model="' + mo.id + '">' +
                '<i>' + esc(mo.name) + '</i><span>p ' + mo.portamento + ' · a ' + mo.appeal + '</span></div>';
        }
        mh += '</div>';
        var goh = '<div class="sh-block"><h3>PRONTI</h3>' +
            '<p>L\'affitto (' + fmt(venue.rent) + ' €) si paga sempre. Il premio solo se la collezione regge.</p>' +
            '<button class="btn primary" id="btn-launch" type="button">SCENDI IN PASSERELLA</button></div>';
        D.shGo.innerHTML = mh + goh;

        wireShowSetup(venue, looks, models);
    }

    function showThemePicker() {
        var el = $("pick-theme");
        if (!el) return;
        var tr = trendFor(save.season);
        var html = "";
        for (var i = 0; i < TAGS.length; i++) {
            var t = TAGS[i];
            var hot = tagIsHot(t, tr);
            html += '<button class="chip' + (ui.showTheme === t ? " is-on" : "") +
                (hot ? "" : "") + '" data-theme="' + t + '" type="button">' +
                esc(t) + (hot ? " ▲" : "") + '</button>';
        }
        el.innerHTML = html;
        var bs = el.querySelectorAll("[data-theme]");
        for (var b = 0; b < bs.length; b++) {
            (function (c) {
                c.addEventListener("click", function () {
                    ui.showTheme = c.dataset.theme;
                    showThemePicker();
                });
            })(bs[b]);
        }
    }

    function lookName(lk) {
        var parts = [];
        for (var k in lk.slots) {
            var it = lk.slots[k];
            if (it && BY_ID[it.gid]) parts.push(BY_ID[it.gid].name);
        }
        return parts.length ? parts.slice(0, 3).join(" + ") + (parts.length > 3 ? "…" : "") : "look vuoto";
    }

    function wireShowSetup(venue, looks, models) {
        var vs = D.shVenue.querySelectorAll("[data-venue]");
        for (var i = 0; i < vs.length; i++) {
            (function (el) {
                el.addEventListener("click", function () {
                    ui.showVenue = +el.dataset.venue; ui.showLooks = []; renderShowSetup();
                });
            })(vs[i]);
        }
        var ts = D.shType.querySelectorAll("[data-stype]");
        for (var t = 0; t < ts.length; t++) {
            (function (el) {
                el.addEventListener("click", function () {
                    ui.showType = el.dataset.stype; renderShowSetup();
                });
            })(ts[t]);
        }
        showThemePicker();
        var ls = D.shLooks.querySelectorAll("[data-look]");
        for (var l = 0; l < ls.length; l++) {
            (function (el) {
                el.addEventListener("click", function () {
                    var idx = +el.dataset.look;
                    var at = ui.showLooks.indexOf(idx);
                    if (at !== -1) ui.showLooks.splice(at, 1);
                    else if (ui.showLooks.length < venue.looks) ui.showLooks.push(idx);
                    else { toast("Venue piena", true); return; }
                    renderShowSetup();
                });
            })(ls[l]);
        }
        var la = $("btn-looks-all");
        if (la) la.addEventListener("click", function () {
            ui.showLooks = [];
            for (var i = 0; i < Math.min(venue.looks, looks.length); i++) ui.showLooks.push(i);
            renderShowSetup();
        });
        var ms = D.shGo.querySelectorAll("[data-model]");
        for (var m = 0; m < ms.length; m++) {
            (function (el) {
                el.addEventListener("click", function () {
                    var id = el.dataset.model;
                    var at = ui.showModels.indexOf(id);
                    if (at !== -1) ui.showModels.splice(at, 1);
                    else ui.showModels.push(id);
                    renderShowSetup();
                });
            })(ms[m]);
        }
        var lb = $("btn-launch");
        if (lb) lb.addEventListener("click", launchShow);
    }

    function launchShow() {
        var city = CITIES[save.city];
        var venue = city.venues[ui.showVenue];
        if (!ui.showLooks.length) { toast("Scegli almeno un look", true); return; }
        if (!ui.showModels.length) { toast("Scegli almeno una modella", true); return; }
        if (save.money < venue.rent) { toast("Non copri l'affitto", true); return; }
        if (save.seasonShows && SHOW_TYPE_BLOCK[ui.showType] !== "benefico") {
            toast("Hai già sfilato questa stagione", true);
            return;
        }
        save.money -= venue.rent;
        var looks = save.wardrobe.length ? save.wardrobe : [ui.look];
        var entries = [];
        for (var i = 0; i < ui.showLooks.length; i++) {
            var lk = looks[ui.showLooks[i]];
            var mo = save.models.filter(function (m) { return m.id === ui.showModels[i % ui.showModels.length]; })[0];
            if (!lk || !mo) continue;
            entries.push({ look: lk, model: mo });
        }
        save.seasonShows = true;
        startShow({
            type: ui.showType, venue: ui.showVenue, entries: entries,
            theme: ui.showTheme, rivalLooks: null
        });
        show("atelier");
        toast("Sfilata in corso");
    }

    /* =========================================================================
     * CITTÀ E DIARIO
     * ===================================================================== */

    function renderCity() {
        var html = "";
        for (var i = 0; i < CITIES.length; i++) {
            var c = CITIES[i];
            var open = save.city >= i || save.fame > 0;
            var here = save.city === i;
            html += '<div class="row' + (here ? " is-on" : "") + (open ? "" : " locked") + '">' +
                '<div class="row-main"><b>' + esc(c.name) + '</b>' +
                '<span>' + c.venues.map(function (v) { return esc(v.name); }).join(" · ") + '</span></div>' +
                (here ? '<span class="row-price">QUI</span>' :
                    (open && save.city > i ? '<span class="row-price">VISITATA</span>'
                        : '<span class="row-price">☆' + fmt(bestVenueFame(i)) + '</span>')) +
                '</div>';
        }

        /* Commissioni */
        var ch = currentCommission();
        html += '<div class="sh-block"><h3>COMMISSIONE ATTIVA</h3>';
        if (ch) {
            html += '<div class="row is-on"><div class="row-main"><b>' + esc(ch.client) + '</b>' +
                '<span>' + esc(ch.occasion) + ' · vibe <b>' + esc(ch.vibe) + '</b> · ' + fmt(ch.pay) + ' €</span></div>' +
                '<button class="btn small" data-comm="' + ui.commission + '" type="button">IN ATELIER</button></div>';
        } else {
            html += '<p>Nessuna commissione attiva.</p>';
        }
        for (var k = 0; k < save.commissions.length; k++) {
            if (k === ui.commission) continue;
            var cc = save.commissions[k];
            html += '<div class="row"><div class="row-main"><b>' + esc(cc.client) + '</b>' +
                '<span>' + esc(cc.occasion) + ' · vibe <b>' + esc(cc.vibe) + '</b> · ' + fmt(cc.pay) + ' €</span></div>' +
                '<button class="btn small" data-comm="' + k + '" type="button">PRENDI</button></div>';
        }
        /* stagione */
        var tr = trendFor(save.season);
        html += '<div class="sh-block"><h3>PRONOSTICO STAGIONE ' + save.season + '</h3>' +
            '<p>Tag probabili: <b>' + tr.forecast.map(esc).join(" · ") + '</b>. ' +
            'Il terzo tag caldo non è nel report, e le tue rivali scommettono sugli stessi due.</p>' +
            '<button class="btn primary" id="btn-end-season" type="button">CHIUDI LA STAGIONE</button>' +
            '<p>Chiudere la stagione paga lo sponsor, fa avanzare i trend, ' +
            'ringiovanisce le modelle e sblocca la sfilata successiva.</p></div>';
        /* rivali */
        html += '<div class="sh-block"><h3>RIVALI</h3>';
        for (var r = 0; r < save.rivals.length; r++) {
            var rv = save.rivals[r];
            var ahead = rv.fame > save.fame;
            html += '<div class="row"><div class="row-main"><b>' + esc(rv.name) + '</b>' +
                '<span>' + esc(rv.bias.join(" · ")) + '</span></div>' +
                '<span class="row-price" style="color:' + (ahead ? "var(--bad)" : "var(--ok)") + '">☆' +
                fmt(rv.fame) + '</span></div>';
        }
        html += '</div>';
        /* sponsor */
        if (!save.sponsor) {
            html += '<div class="sh-block"><h3>SPONSOR</h3><p>Uno stipendio a stagione, in cambio di una quota di look col loro tessuto.</p>';
            for (var s = 0; s < SPONSORS.length; s++) {
                var sp = SPONSORS[s];
                var ok = unlocked("fabric", sp.fabric);
                html += '<div class="row' + (ok ? "" : " locked") + '">' +
                    '<div class="row-main"><b>' + esc(sp.name) + '</b>' +
                    '<span>' + esc(FABRICS[sp.fabric].name) + ' · ' + fmt(sp.stipend) + ' €/stagione · ' +
                    Math.round(sp.demand * 100) + '% dei look</span></div>' +
                    (ok ? '<button class="btn small" data-sponsor="' + sp.id + '" type="button">FIRMA</button>'
                        : '<span class="row-price">LIV</span>') + '</div>';
            }
            html += '</div>';
        } else {
            var cur = sponsor(save.sponsor);
            html += '<div class="sh-block"><h3>SPONSOR ATTUALE</h3>' +
                '<div class="row is-on"><div class="row-main"><b>' + esc(cur.name) + '</b>' +
                '<span>' + fmt(cur.stipend) + ' € a stagione · ' + Math.round(cur.demand * 100) +
                '% dei look in ' + esc(FABRICS[cur.fabric].name) + '</span></div></div></div>';
        }

        D.ctBody.innerHTML = html;

        var cs = D.ctBody.querySelectorAll("[data-comm]");
        for (var ci = 0; ci < cs.length; ci++) {
            (function (el) {
                el.addEventListener("click", function () {
                    ui.commission = +el.dataset.comm; renderCity(); toast("Commissione selezionata");
                });
            })(cs[ci]);
        }
        var sps = D.ctBody.querySelectorAll("[data-sponsor]");
        for (var pi = 0; pi < sps.length; pi++) {
            (function (el) {
                el.addEventListener("click", function () {
                    save.sponsor = el.dataset.sponsor; persist(); toast("Contratto firmato");
                    renderCity();
                });
            })(sps[pi]);
        }
        var es = $("btn-end-season");
        if (es) es.addEventListener("click", endSeason);
    }

    /* Chiudere la stagione è il turno. Paga lo sponsor se il contratto è stato
     * rispettato (altrimenti penale in fama), fa avanzare i trend, riposa le
     * modelle e sblocca la sfilata successiva. È il battito del gioco. */
    function endSeason() {
        var stipend = 0, penality = 0;
        if (save.sponsor) {
            var sp = sponsor(save.sponsor);
            stipend = sp.stipend;
            /* controllare la quota sarebbe richiedere di tracciare ogni look:
             * lo faccio sul campione dei look salvati, che è ciò che il
             * giocatore ha davvero mostrato. */
            var sample = save.wardrobe.slice(-4);
            var hits = 0, total = 0;
            for (var i = 0; i < sample.length; i++) {
                for (var k in sample[i].slots) {
                    var it = sample[i].slots[k];
                    if (!it) continue;
                    total++;
                    if (it.fabric === sp.fabric) hits++;
                }
            }
            var quota = total ? hits / total : 0;
            save.money += stipend;
            if (quota < sp.demand) {
                penality = Math.round(sp.stipend * 0.6);
                save.fame = Math.max(0, save.fame - penality);
                log("SPONSOR DELUSO", "Quota " + Math.round(quota * 100) + "% invece di " +
                    Math.round(sp.demand * 100) + "% · fama −" + penality);
            } else {
                log("SPONSOR PAGATO", sp.name + " · +" + fmt(stipend) + " €");
            }
        }
        save.season++;
        save.seasonShows = false;
        save.day = 1;
        for (var m = 0; m < save.models.length; m++) {
            save.models[m].tired = Math.max(0, save.models[m].tired - 60);
        }
        stepRivals();
        refreshCommissions(3 + Math.min(3, save.level / 8 | 0));
        var nt = trendFor(save.season);
        log("STAGIONE " + save.season, "Trend caldi: " + nt.forecast.join(" · ") +
            " · uno nascosto");
        updateHud(); persist();
        renderCity();
        toast("Stagione " + save.season + " · nuovo pronostico");
    }

    function bestVenueFame(cityIdx) {
        var best = 0;
        for (var i = 0; i < CITIES[cityIdx].venues.length; i++) {
            var v = CITIES[cityIdx].venues[i];
            if (v.minFame > best) best = v.minFame;
        }
        return best;
    }

    function renderReport() {
        var html = "";
        /* sblocchi futuri */
        html += '<div class="sh-block"><h3>PROSSIMI TRAGUARDI</h3>';
        var nx = nextUnlocks(4);
        if (!nx.length) html += '<p>Tutto sbloccato. Sei alla settimana della moda.</p>';
        for (var i = 0; i < nx.length; i++) {
            html += '<div class="row"><div class="row-main"><b>Livello ' + nx[i].lv + '</b>' +
                '<span>' + esc(nx[i].text) + '</span></div>' +
                '<span class="row-price">' + (nx[i].lv - save.level) + ' liv</span></div>';
        }
        html += '</div>';

        /* statistiche */
        html += '<div class="sh-block"><h3>CARRIERA</h3>' +
            '<div class="row"><div class="row-main"><b>' + fmt(save.stats.shows) + '</b><span>sfilate</span></div></div>' +
            '<div class="row"><div class="row-main"><b>' + fmt(save.stats.looks) + '</b><span>look consegnati</span></div></div>' +
            '<div class="row"><div class="row-main"><b>' + fmt(save.stats.bestScore) + '</b><span>punteggio record</span></div></div>' +
            '<div class="row"><div class="row-main"><b>' + fmt(save.stats.earned) + ' €</b><span>guadagnato in sfilata</span></div></div>' +
            '</div>';

        /* diario */
        html += '<div class="sh-block"><h3>DIARIO</h3>';
        if (!save.log.length) html += '<p>Ancora niente.</p>';
        for (var l = 0; l < save.log.length; l++) {
            var e = save.log[l];
            html += '<div class="row"><div class="row-main"><b>' + esc(e.title) + '</b>' +
                '<span>' + esc(e.body) + '</span>' +
                '<span style="color:var(--faint)">stagione ' + e.season + ' · giorno ' + e.day + '</span></div></div>';
        }
        html += '</div>';
        D.rpBody.innerHTML = html;
    }

    /* =========================================================================
     * CONSEGNA E RISULTATI
     * ===================================================================== */

    function deliver() {
        var c = currentCommission();
        if (!c) { toast("Nessuna commissione", true); return; }
        var cost = lookCost(ui.look);
        if (cost > c.pay) { toast("Sfori il budget: usa un tessuto più povero", true); return; }
        var filled = 0;
        for (var k in ui.look.slots) if (ui.look.slots[k]) filled++;
        if (!filled) { toast("Il look è vuoto", true); return; }

        var tr = trendFor(save.season);
        var model = availableModel();
        var r = scoreLook(ui.look, c.vibe, tr, model);
        /* Il budget non speso è un bonus: un conto saldato sotto budget è un
         * cliente che torna. Il pagamento non può superare l'offerta, quindi
         * un look brillante non estorce denaro a un cliente piccolo. */
        var thrift = 1 + clamp((c.pay - cost) / Math.max(1, c.pay), 0, 0.4);
        var pressure = rivalPressure();
        var pay = Math.round(r.total * 1.5 * thrift * pressure);
        if (pay > c.pay) pay = c.pay;
        if (pay < 1) pay = 1;

        save.money += pay;
        save.fame += c.fame;
        save.stats.looks++;
        save.stats.earned += pay;
        if (r.total > save.stats.bestScore) save.stats.bestScore = r.total;
        grantXp(Math.round(14 + r.total * 0.12));
        log("CONSEGNA · " + c.client, c.occasion + " · " + fmt(pay) + " € · punteggio " + r.total +
            (thrift > 1.05 ? " · sotto budget" : "") + (pressure < 1 ? " · cliente corteggiato da una rivale" : ""));

        save.wardrobe.push({ slots: JSON.parse(JSON.stringify(ui.look.slots)) });
        save.commissions.splice(ui.commission, 1);
        if (ui.commission >= save.commissions.length) ui.commission = 0;
        save.day++;
        save.seasonShows = false;
        stepRivals();
        updateHud(); persist();
        renderAtelierUi();
        showResult("CONSEGNATO", r.total, pay, c);
    }

    function showResult(title, score, money, sub) {
        var el = document.createElement("div");
        el.className = "result";
        el.innerHTML = '<div class="result-card">' +
            '<h2>' + esc(title) + '</h2>' +
            '<div class="result-big">' + fmt(score) + '</div>' +
            '<p class="result-sub">punteggio del look' + (sub ? " · " + esc(sub.client) : "") + '</p>' +
            '<div class="result-rows">' +
            '<div class="result-row"><span>Pagato</span><b>' + fmt(money) + ' €</b></div>' +
            '<div class="result-row"><span>Fama</span><b>☆ ' + fmt(save.fame) + '</b></div>' +
            '<div class="result-row"><span>Livello</span><b>' + save.level + '</b></div>' +
            '</div>' +
            '<button class="btn primary" type="button">AVANTI</button></div>';
        document.body.appendChild(el);
        var btn = el.querySelector("button");
        btn.addEventListener("click", function () {
            document.body.removeChild(el);
            renderAtelierUi();
        });
    }

    /* overlay del risultato della sfilata: la somma dei punteggi di ogni
     * uscita, non un numero unico. È il resoconto che il giocatore rilegge. */
    function showShowResult() {
        var el = document.createElement("div");
        el.className = "result";
        var rows = "";
        for (var i = 0; i < SHOW.entries.length; i++) {
            var e = SHOW.entries[i];
            rows += '<div class="result-row"><span>' + (i + 1) + '. ' + esc(e.model.name) +
                ' · ' + esc(lookName(e.look)) + '</span><b>' + fmt(e.score) + '</b></div>';
        }
        rows += '<div class="result-row"><span><b>TOTALE</b></span><b>' + fmt(SHOW.total) + '</b></div>';
        el.innerHTML = '<div class="result-card">' +
            '<h2>' + esc(showType(SHOW.type).name) + ' · ' + esc(SHOW.venue.name) + '</h2>' +
            '<div class="result-big">' + fmt(SHOW.total) + '</div>' +
            '<p class="result-sub">' + SHOW.entries.length + ' uscite · ' + SHOW.judgeCount + ' giudici</p>' +
            '<div class="result-rows">' + rows +
            '<div class="result-row"><span>Premio netto</span><b>' + fmt(SHOW.payout) + ' €</b></div>' +
            '<div class="result-row"><span>Fama</span><b>+☆ ' + fmt(SHOW.fame) + '</b></div>' +
            (SHOW.gift ? '<div class="result-row"><span>Capo unico</span><b>' + esc(SHOW.gift.name) + '</b></div>' : '') +
            '</div><button class="btn primary" type="button">AVANTI</button></div>';
        document.body.appendChild(el);
        el.querySelector("button").addEventListener("click", function () {
            document.body.removeChild(el);
            sceneReset();
            renderCity();
        });
    }

    /* Controllo nel ciclo di render: quando la sfilata finisce, mostro il
     * resoconto. Meglio qui che in finishShow, che non deve toccare il DOM. */
    var showResultShown = false;
    function watchShowEnd() {
        if (SHOW && !SHOW.running && !showResultShown) {
            showResultShown = true;
            showShowResult();
        }
        if (!SHOW || SHOW.running) showResultShown = false;
    }

    /* =========================================================================
     * TOAST
     * ===================================================================== */

    var toastTimer = null;
    function toast(msg, bad) {
        D.toast.textContent = msg;
        D.toast.style.color = bad ? "var(--bad)" : "var(--gold)";
        D.toast.classList.remove("hidden");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { D.toast.classList.add("hidden"); }, 1900);
    }

    /* =========================================================================
     * BOOT
     * ===================================================================== */

    function boot() {
        initDom();
        resize();
        window.addEventListener("resize", resize);
        load();

        /* --- primo avvio --- */
        if (!save.name) {
            save.name = "atelier";
            initRivals();
            /* i colori base sono tutti disponibili: la scarsità comincia dai
             * colori che si sbloccano col livello. */
            for (var i = 0; i < COLOR_KEYS.length; i++) save.dyes[COLOR_KEYS[i]] = 6;
            /* si parte con i capi di livello 1 dei quattro slot aperti, così
             * il primo look è vestibile subito. */
            /* Il guardaroba iniziale è BILANCIATO per slot: due capi di livello
             * 1 per ogni slot aperto. Prendere "i primi 12 capi" dava dodici
             * cappelli, perché il catalogo è ordinato per slot e i cappelli
             * vengono prima — e con tre slot vuoti il primo look non era
             * vestibile. */
            for (var s = 0; s < SLOTS.length; s++) {
                if (save.slots.indexOf(SLOTS[s].key) === -1) continue;
                var perSlot = BY_SLOT[SLOTS[s].key].filter(function (g) {
                    return g.tier === 1;
                });
                for (var j = 0; j < Math.min(2, perSlot.length); j++) {
                    if (save.owned.indexOf(perSlot[j].id) === -1) save.owned.push(perSlot[j].id);
                }
            }
            var m0 = makeModel(Math.random, 1);
            save.models.push(m0);
            save.seasonShows = false;
            refreshCommissions(3);
            log("PRIMO GIORNO", "Un sottoscala, una modella, tre clienti.");
            persist();
        }

        /* --- look iniziale: ciò che si indossa --- */
        for (var s = 0; s < SLOTS.length; s++) {
            var key = SLOTS[s].key;
            if (!ui.look.slots[key]) ui.look.slots[key] = null;
        }
        /* metto un capo per slot aperto, se ne ho */
        for (var k in ui.look.slots) {
            if (ui.look.slots[k]) continue;
            if (save.slots.indexOf(k) === -1) continue;
            for (var q = 0; q < save.owned.length; q++) {
                var g = BY_ID[save.owned[q]];
                if (g && g.slot === k) {
                    ui.look.slots[k] = { gid: g.id, color: "nero", fabric: "cotone" };
                    break;
                }
            }
        }
        previewLook = ui.look;

        updateHud();
        show("menu");

        $("btn-play").addEventListener("click", function () { show("atelier"); });
        $("btn-wipe").addEventListener("click", function () {
            if (!confirm("Azzera il salvataggio? Tutto l'atelier va perso.")) return;
            localStorage.removeItem(SAVE_KEY);
            location.reload();
        });
        $("btn-save-look").addEventListener("click", function () {
            save.wardrobe.push({ slots: JSON.parse(JSON.stringify(ui.look.slots)) });
            persist();
            toast("Look salvato (" + save.wardrobe.length + ")");
        });
        $("btn-deliver").addEventListener("click", deliver);
        $("picker-close").addEventListener("click", function () {
            D.picker.classList.add("hidden");
        });

        var navs = D.nav.querySelectorAll(".nav-btn");
        for (var n = 0; n < navs.length; n++) {
            (function (el) {
                el.addEventListener("click", function () { show(el.dataset.nav); });
            })(navs[n]);
        }

        requestAnimationFrame(loop);
        /* hook leggero: il resoconto della sfilata nasce dal ciclo di render */
        setInterval(watchShowEnd, 200);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    /* Esporto per i test: un gioco senza punti di presa è un gioco che non si
     * può verificare senza un browser. */
    window.SARTORIA = {
        save: function () { return save; },
        ui: ui,
        scoreLook: scoreLook,
        harmony: harmony,
        trendFor: trendFor,
        walkPose: walkPose,
        emptyLook: emptyLook,
        lookCost: lookCost,
        startShow: startShow,
        deliver: deliver,
        show: show,
        GARMENTS: GARMENTS,
        CITIES: CITIES,
        FABRICS: FABRICS,
        COLORS: COLORS,
        SLOTS: SLOTS,
        TAGS: TAGS,
        xpForLevel: xpForLevel,
        makeModel: makeModel,
        availableModel: availableModel,
        maxTierUnlocked: maxTierUnlocked
    };

})()

