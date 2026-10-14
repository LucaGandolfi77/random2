/*
 * FORMICA - costanti di tuning, palette e helper matematici.
 * Caricato per primo; ogni altro modulo legge da window.FORMICA.
 */
(function (L) {
    "use strict";

    /* ===== Tuning =====
     * Tutti i numeri che danno il "feel" al gioco stanno qui. Le sessioni di
     * bilanciamento editano questo file, non i sistemi.
     */
    L.CONFIG = {
        /* Il tavolo è più largo che alto: è una tavola di legno, non una
         * colonna d'acqua. La griglia dei feromoni ci vive sopra. */
        world: {
            w: 4800,
            h: 3600,
            cell: 26,          /* lato cella feromone in px mondo */
        },

        /* Territorio: camminare dipinge. Le celle decadono lentamente verso il
         * neutro, quindi il territorio va mantenuto, non solo conquistato. */
        territory: {
            paintGain: 1.0,      /* feromone per deposito per formica */
            paintInterval: 0.07, /* secondi tra un deposito e l'altro */
            decay: 0.05,        /* forza persa al secondo (cella neutra->1) */
            enemyDecay: 0.16,   /* decadimento extra per celle nemiche adiacenti */
            owned: 0.999,       /* soglia per contarla come posseduta */
            stealDepth: 1,      /* celle nemiche che si erodono quando dipingi sopra */
        },

        /* Colonia: la "massa" è il numero di formiche. */
        colony: {
            startWorkers: 4,
            maxWorkers: 22,
            startCrumbs: 0,
            workersPerCrumbs: 7,  /* briciole per ogni formica aggiuntiva */
            workerRadius: 5.5,
            workerHitR: 3.4,      /* raggio di collisione, più stretto del visivo */
            spacing: 9,           /* passo della scia */
            lenBase: 70,
            lenPerWorker: 16,
            lenMax: 640,
            speedPerWorker: 2.6,  /* ogni formica accelera la colonia */
            maxSpeedBonus: 30,
        },

        /* Il nido è il cuore: hp che si rigenera di giorno e si erode di notte. */
        nest: {
            hp: 100,
            regen: 2.2,
            crashDamage: 24,       /* danno quando una razzia raggiunge il nido */
            crashSteal: 0.3,       /* frazione di briciole rubata */
            crashInterval: 1.3,
        },

        /* Razzie notturne: ondate di formiche nemiche che marciano sui tuoi
         * feromoni verso il nido. */
        raid: {
            intervalDay: 34,
            intervalNight: 16,
            antsPerColony: 5,
            antHp: 4,
            antSpeed: 96,
            antRadius: 5,
            offroadFactor: 0.55,  /* fuori dal proprio territorio rallentano */
            wander: 1.4,
        },

        player: {
            startWorkers: 4,
            baseSpeed: 132,
            boostSpeed: 214,
            boostDrain: 2.4,      /* briciole bruciate al secondo di scatto */
            turnFast: 4.4,
            turnSlow: 2.3,
            workersForTurnCap: 18,
        },

        /* Pericoli del tavolo. */
        hazard: {
            dropR: 30,           /* raggio contatto goccia */
            dropKill: 1,         /* formiche perse per goccia */
            dropErase: 70,       /* raggio di cancellazione feromoni */
            inkCount: 7,
            inkR: 52,
            inkKill: 2,
            pebbleCount: 26,
            pebbleR: 22,
            pebbleSlow: 0.62,
        },

        /* Ciclo giorno/notte: notte = razzie più fitte e tavolo più scuro. */
        day: {
            length: 108,         /* secondi per ciclo completo */
            nightStart: 0.58,    /* frazione del ciclo in cui cala la notte */
        },

        bots: {
            count: 5,
            thinkInterval: 0.12,
            respawnMin: 3,
            respawnMax: 5,
            startWorkersMin: 6,
            startWorkersMax: 11,
        },

        camera: {
            zoomAtMin: 0.95,
            zoomAtMax: 0.6,
            zoomMin: 0.5,
            shakeDecay: 4.5,
        },

        food: {
            crumbs: 130,
            sugars: 16,
            bugs: 6,
            crumbValue: 3,
            sugarValue: 14,
            bugValue: 26,
            respawn: 2.2,
        },
    };

    /* ===== Palette colonie ===== */
    L.PALETTE = [
        "#ff7847", "#4fc3f7", "#aed581", "#ba68c8", "#fff176", "#f06292",
        "#4db6ac", "#ffb74d",
    ];

    L.COLORS = {
        wood: "#8a6a45",
        woodDark: "#5d4530",
        woodLine: "#3f2e1f",
        crumb: "#c9a26b",
        sugar: "#f5f0e1",
        bug: "#4e342e",
        water: "#4fc3f7",
        ink: "#311b92",
        pebble: "#9e9e9e",
        raid: "#e53935",
        night: "#0b1026",
        danger: "#ff5252",
        player: "#ff7043",
    };

    /* ===== Helper matematici ===== */
    L.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
    L.lerp = function (a, b, t) { return a + (b - a) * t; };

    /* Interpolazione ad arco minimo, sempre in (-PI, PI]. */
    L.lerpAngle = function (a, b, t) {
        var d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return a + d * t;
    };

    L.rand = function (a, b) { return a + Math.random() * (b - a); };
    L.randInt = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
    L.pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };
    L.dist2 = function (ax, ay, bx, by) {
        var dx = bx - ax, dy = by - ay;
        return dx * dx + dy * dy;
    };

    /* ===== RNG deterministico =====
     * Usato per costruire il roster persistente delle colonie rivali: gli
     * stessi nomi, con gli stessi caratteri, ogni sessione su ogni device.
     */
    L.mulberry32 = function (seed) {
        var t = seed >>> 0;
        return function () {
            t = (t + 0x6d2b79f5) >>> 0;
            var r = Math.imul(t ^ (t >>> 15), 1 | t);
            r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    };

    L.hashString = function (str) {
        var h = 2166136261 >>> 0;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h >>> 0;
    };

    /* Value-noise per il wander: le formiche non si muovono mai a scatti. */
    L.wanderAngle = function (t, phase) {
        return (
            Math.sin(t * 0.71 + phase) * 1.7 +
            Math.sin(t * 0.29 + phase * 2.3) * 2.4 +
            Math.sin(t * 0.13 + phase * 5.1) * 1.3
        );
    };

})(window.FORMICA = window.FORMICA || {});
