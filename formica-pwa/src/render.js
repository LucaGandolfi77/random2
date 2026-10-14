/*
 * FORMICA - rendering.
 *
 * Tutto il look poggia su tre cose: una grana di legno procedurale (pattern
 * tileabile, zero asset), la griglia dei feromoni disegnata come celle
 * visibili (il territorio si legge al volo), e il ciclo giorno/notte che
 * tinge il tavolo. Le formiche sono disegnate con tre segmenti e sei zampe
 * animate: la dimensione è quella di un corpo, la postura quella di una
 * formica.
 */
(function (L) {
    "use strict";

    var C = L.CONFIG;
    var COL = L.COLORS;
    var W = C.world;

    /* ===== Camera ===== */
    var Camera = {
        x: 0, y: 0, zoom: 1,
        shake: 0, shakeX: 0, shakeY: 0,
        w: 0, h: 0,
        view: { x0: 0, y0: 0, x1: 0, y1: 0 },
        followX: function (x, y, zoom, dt, reduceMotion) {
            /* Guarda leggermente avanti rispetto al moto: le virate strette
             * diventano leggibili. */
            var k = 1 - Math.pow(0.0015, dt);
            this.x = L.lerp(this.x, x, k);
            this.y = L.lerp(this.y, y, k);
            this.zoom = L.lerp(this.zoom, zoom, 1 - Math.pow(0.02, dt));

            if (this.shake > 0.01 && !reduceMotion) {
                this.shake *= Math.pow(0.015, dt);
                this.shakeX = L.rand(-1, 1) * this.shake;
                this.shakeY = L.rand(-1, 1) * this.shake;
            } else {
                this.shake = 0;
                this.shakeX = 0;
                this.shakeY = 0;
            }
            this._updateView();
        },
        snap: function (x, y, zoom) {
            this.x = x; this.y = y; this.zoom = zoom;
            this.shake = 0; this.shakeX = 0; this.shakeY = 0;
            this._updateView();
        },
        _updateView: function () {
            var hw = this.w / (2 * this.zoom);
            var hh = this.h / (2 * this.zoom);
            this.view.x0 = this.x - hw;
            this.view.x1 = this.x + hw;
            this.view.y0 = this.y - hh;
            this.view.y1 = this.y + hh;
        },
        screenToWorld: function (sx, sy) {
            return {
                x: (sx - this.w / 2) / this.zoom + this.x,
                y: (sy - this.h / 2) / this.zoom + this.y,
            };
        },
        toScreen: function (wx, wy) {
            return {
                x: (wx - this.x) * this.zoom + this.w / 2,
                y: (wy - this.y) * this.zoom + this.h / 2,
            };
        },
    };

    /* ===== Tubature canvas ===== */
    var canvas, ctx;
    var dpr = 1;
    var cssW = 0, cssH = 0;
    var vignette = null;
    var reduceMotion = false;
    var woodPattern = null;
    var terrainCanvas = null, terrainCtx = null;
    var terrainAcc = 99;
    var TERRAIN_COLORS = null;

    function hexToRgb(h) {
        var s = h.replace("#", "");
        if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
        var n = parseInt(s, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function withAlpha(hex, a) {
        var c = hexToRgb(hex);
        return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
    }

    function lighten(hex, amt) {
        var c = hexToRgb(hex);
        var r = Math.min(255, c[0] + amt);
        var g = Math.min(255, c[1] + amt);
        var b = Math.min(255, c[2] + amt);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    /* ===== Grana del legno =====
     * Un tile 512 disegnato una volta: venature come catenarie spesse e
     * qualche nodo. createPattern lo ripete su tutto il tavolo. */
    function makeWood() {
        var tile = document.createElement("canvas");
        tile.width = 512;
        tile.height = 512;
        var t = tile.getContext("2d");

        t.fillStyle = COL.wood;
        t.fillRect(0, 0, 512, 512);

        var rng = L.mulberry32(20240610);
        var i, g;

        /* venature orizzontali: file di tratti irregolari */
        for (i = 0; i < 90; i++) {
            var y = rng() * 512;
            var amp = rng() * 14 + 4;
            var period = rng() * 220 + 120;
            var thick = rng() * 2.2 + 0.4;
            g = t.createLinearGradient(0, y - 2, 512, y + 2);
            var dark = rng();
            var col = dark > 0.55 ? COL.woodDark : COL.woodLine;
            g.addColorStop(0, withAlpha(col, 0));
            g.addColorStop(0.5, withAlpha(col, 0.25 + dark * 0.3));
            g.addColorStop(1, withAlpha(col, 0));
            t.strokeStyle = g;
            t.lineWidth = thick;
            t.beginPath();
            for (var x = 0; x <= 512; x += 16) {
                var yy = y + Math.sin((x / period) * 6.283 + rng() * 0.02) * amp * 0.35
                    + Math.sin(x * 0.013 + i) * amp * 0.1;
                if (x === 0) t.moveTo(x, yy);
                else t.lineTo(x, yy);
            }
            t.stroke();
        }

        /* nodi: ellissi concentriche */
        for (i = 0; i < 7; i++) {
            var kx = rng() * 512, ky = rng() * 512;
            var kr = rng() * 18 + 10;
            t.strokeStyle = withAlpha(COL.woodDark, 0.5);
            t.lineWidth = 1.6;
            for (var r = kr * 0.25; r < kr; r += 3.2) {
                t.beginPath();
                t.ellipse(kx, ky, r, r * 0.45, rng() * 0.4, 0, 6.283);
                t.stroke();
            }
        }

        /* pulviscolo */
        for (i = 0; i < 260; i++) {
            t.fillStyle = rng() > 0.5
                ? "rgba(60,40,24,0.10)"
                : "rgba(255,230,190,0.07)";
            t.fillRect(rng() * 512, rng() * 512, rng() * 2 + 0.6, rng() * 2 + 0.6);
        }

        woodPattern = ctx.createPattern(tile, "repeat");
    }

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext("2d", { alpha: false });

        makeWood();

        /* Miniatura territorio: un canvas grande come la griglia, un pixel
         * per cella, aggiornato ogni 0.3s. */
        var G = L.World.grid;
        terrainCanvas = document.createElement("canvas");
        terrainCanvas.width = G.GW;
        terrainCanvas.height = G.GH;
        terrainCtx = terrainCanvas.getContext("2d");
        TERRAIN_COLORS = L.PALETTE.map(hexToRgb);
        TERRAIN_COLORS.unshift(hexToRgb(L.COLORS.player));
        buildTerritoryImage();

        resize();
        window.addEventListener("resize", resize);
        window.addEventListener("orientationchange", function () { setTimeout(resize, 250); });

        var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        reduceMotion = mq.matches;
        if (mq.addEventListener) {
            mq.addEventListener("change", function (e) { reduceMotion = e.matches; });
        }
    }

    function resize() {
        cssW = Math.max(1, window.innerWidth);
        cssH = Math.max(1, window.innerHeight);
        dpr = Math.min(2, window.devicePixelRatio || 1);

        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        canvas.style.width = cssW + "px";
        canvas.style.height = cssH + "px";

        Camera.w = cssW;
        Camera.h = cssH;
        Camera._updateView();

        vignette = ctx.createRadialGradient(
            cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.34,
            cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.8
        );
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, "rgba(20,12,4,0.5)");
    }

    /* ===== Territorio ===== */
    function buildTerritoryImage() {
        var G = L.World.grid;
        var img = terrainCtx.createImageData(G.GW, G.GH);
        var d = img.data;
        for (var i = 0; i < G.GW * G.GH; i++) {
            var o = G.owner[i];
            if (o === 0) continue;
            var s = G.strength[i];
            if (s < 0.05) continue;
            var c = TERRAIN_COLORS[o] || [255, 255, 255];
            var a = Math.min(1, s) * 0.55;
            var p = i * 4;
            d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2];
            d[p + 3] = Math.round(a * 255);
        }
        terrainCtx.putImageData(img, 0, 0);
    }

    /* Celle visibili: quante ne entrano nello schermo, e disegnabili senza
     * pena a 60fps. */
    function drawTerritory(world) {
        var cell = W.cell;
        var v = Camera.view;
        var G = L.World.grid;
        var z = Camera.zoom;

        var cx0 = Math.max(0, Math.floor(v.x0 / cell));
        var cx1 = Math.min(G.GW - 1, Math.ceil(v.x1 / cell));
        var cy0 = Math.max(0, Math.floor(v.y0 / cell));
        var cy1 = Math.min(G.GH - 1, Math.ceil(v.y1 / cell));

        var oversample = z < 0.65;
        var step = oversample ? 2 : 1;

        for (var cy = cy0; cy <= cy1; cy += step) {
            for (var cx = cx0; cx <= cx1; cx += step) {
                var i = cy * G.GW + cx;
                var o = G.owner[i];
                if (o === 0) continue;
                var s = G.strength[i];
                if (s < 0.08) continue;
                var col = world.bySlot[o];
                if (!col) continue;
                ctx.fillStyle = withAlpha(col.color, Math.min(0.5, 0.1 + s * 0.3));
                ctx.fillRect(cx * cell, cy * cell, cell * step, cell * step);
            }
        }
    }

    /* ===== Ambiente ===== */
    function drawBackground(world) {
        ctx.fillStyle = COL.woodDark;
        ctx.fillRect(0, 0, W.w, W.h);

        if (woodPattern) {
            ctx.save();
            ctx.translate(-Camera.x, -Camera.y);
            ctx.fillStyle = woodPattern;
            ctx.fillRect(
                Camera.view.x0 - 12, Camera.view.y0 - 12,
                (Camera.view.x1 - Camera.view.x0) + 24,
                (Camera.view.y1 - Camera.view.y0) + 24
            );
            ctx.restore();
        }

        /* Tinta della zona: la luce del tavolo non è uniforme. */
        var centerTint = L.Zones.tintFor(Camera.x, Camera.y, W.w, W.h);
        ctx.fillStyle = withAlpha(centerTint, 0.16);
        ctx.fillRect(v0x(), v0y(), Camera.view.x1 - Camera.view.x0, Camera.view.y1 - Camera.view.y0);

        /* Le linee dei confini di zona, sottili. */
        ctx.strokeStyle = "rgba(40,24,12,0.35)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(W.w / 2, 0); ctx.lineTo(W.w / 2, W.h);
        ctx.moveTo(0, W.h / 2); ctx.lineTo(W.w, W.h / 2);
        ctx.stroke();
    }

    function v0x() { return Camera.view.x0; }
    function v0y() { return Camera.view.y0; }

    function drawPebbles(world) {
        for (var i = 0; i < world.pebbles.length; i++) {
            var p = world.pebbles[i];
            if (p.x + p.r < Camera.view.x0 || p.x - p.r > Camera.view.x1) continue;
            if (p.y + p.r < Camera.view.y0 || p.y - p.r > Camera.view.y1) continue;
            ctx.fillStyle = withAlpha(COL.pebble, 0.5 + p.shade * 0.25);
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.r, p.r * (0.6 + p.shade * 0.3), p.shade * 3, 0, 6.283);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.12)";
            ctx.beginPath();
            ctx.ellipse(p.x - p.r * 0.25, p.y - p.r * 0.3, p.r * 0.35, p.r * 0.2, p.shade * 3, 0, 6.283);
            ctx.fill();
        }
    }

    function drawInks(world) {
        for (var i = 0; i < world.inks.length; i++) {
            var ink = world.inks[i];
            if (ink.x + ink.r < Camera.view.x0 || ink.x - ink.r > Camera.view.x1) continue;
            if (ink.y + ink.r < Camera.view.y0 || ink.y - ink.r > Camera.view.y1) continue;

            ctx.fillStyle = withAlpha(COL.ink, 0.85);
            ctx.beginPath();
            /* bordo irregolare: la macchia non è un cerchio */
            for (var a = 0; a < 6.283; a += 0.5) {
                var rr = ink.r * (0.85 + Math.sin(a * 3 + ink.wobble) * 0.12);
                var px = ink.x + Math.cos(a) * rr;
                var py = ink.y + Math.sin(a) * rr;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.06)";
            ctx.beginPath();
            ctx.arc(ink.x - ink.r * 0.2, ink.y - ink.r * 0.25, ink.r * 0.28, 0, 6.283);
            ctx.fill();
        }
    }

    function drawDrops(world, time) {
        for (var i = 0; i < world.drops.length; i++) {
            var d = world.drops[i];
            if (d.x + d.r < Camera.view.x0 || d.x - d.r > Camera.view.x1) continue;
            if (d.y + d.r < Camera.view.y0 || d.y - d.r > Camera.view.y1) continue;
            if (d.respawn > 0) continue;

            var wob = 1 + Math.sin(time * 3 + d.wobble) * 0.05;
            ctx.fillStyle = withAlpha(COL.water, 0.5);
            ctx.beginPath();
            ctx.ellipse(d.x, d.y + d.r * 0.2, d.r * 1.15, d.r * 0.5, 0, 0, 6.283);
            ctx.fill();
            ctx.fillStyle = withAlpha(COL.water, 0.8);
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r * 0.82 * wob, 0, 6.283);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.beginPath();
            ctx.arc(d.x - d.r * 0.28, d.y - d.r * 0.3, d.r * 0.16, 0, 6.283);
            ctx.fill();
        }
    }

    function drawCrumbs(world, time) {
        for (var i = 0; i < world.crumbs.length; i++) {
            var c = world.crumbs[i];
            if (c.x + 24 < Camera.view.x0 || c.x - 24 > Camera.view.x1) continue;
            if (c.y + 24 < Camera.view.y0 || c.y - 24 > Camera.view.y1) continue;
            if (c.taken && !c.carriedBy) continue;

            if (c.type === "crumb") {
                ctx.fillStyle = withAlpha(COL.crumb, 0.95);
                ctx.beginPath();
                for (var k = 0; k < 5; k++) {
                    var a = (k / 5) * 6.283 + c.phase;
                    var rr = c.r * (0.7 + ((k * 37) % 5) * 0.12);
                    var px = c.x + Math.cos(a) * rr;
                    var py = c.y + Math.sin(a) * rr;
                    if (k === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
            } else if (c.type === "sugar") {
                var pulse = 1 + Math.sin(time * 2.4 + c.phase) * 0.12;
                ctx.fillStyle = withAlpha(COL.sugar, 0.92);
                ctx.beginPath();
                ctx.moveTo(c.x, c.y - c.r * pulse);
                ctx.lineTo(c.x + c.r * 0.7 * pulse, c.y);
                ctx.lineTo(c.x, c.y + c.r * pulse);
                ctx.lineTo(c.x - c.r * 0.7 * pulse, c.y);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = "rgba(255,255,255,0.6)";
                ctx.beginPath();
                ctx.arc(c.x - c.r * 0.2, c.y - c.r * 0.2, c.r * 0.18, 0, 6.283);
                ctx.fill();
            } else {
                /* insetto: corpo scuro e zampe */
                ctx.strokeStyle = "rgba(30,20,12,0.8)";
                ctx.lineWidth = 1;
                for (var l = -1; l <= 1; l++) {
                    ctx.beginPath();
                    ctx.moveTo(c.x + l * 3, c.y - 2);
                    ctx.lineTo(c.x + l * 5, c.y - c.r * 0.9);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(c.x + l * 3, c.y + 2);
                    ctx.lineTo(c.x + l * 5, c.y + c.r * 0.9);
                    ctx.stroke();
                }
                ctx.fillStyle = withAlpha(COL.bug, 0.95);
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, c.r * 0.5, c.r * 0.8, 0, 0, 6.283);
                ctx.fill();
            }
        }
    }

    /* ===== Formiche =====
     * Tre segmenti e sei zampe: la dimensione è quella di un corpo, la
     * postura quella di una formica che corre. */
    function drawAnt(x, y, angle, scale, color, time, isLeader) {
        var cos = Math.cos(angle), sin = Math.sin(angle);
        var s = scale;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        /* zampe: Alternanza di fase, tre per lato */
        var gait = Math.sin(time * 18 + x * 0.05) * 0.35;
        ctx.strokeStyle = withAlpha(lighten(color, -30), 0.9);
        ctx.lineWidth = Math.max(0.6, s * 0.55);
        for (var i = -1; i <= 1; i++) {
            var ph = gait * (i + 1);
            ctx.beginPath();
            ctx.moveTo(s * (i * 0.5), 0);
            ctx.lineTo(s * (i * 0.5 - 1), s * (1.5 + ph));
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(s * (i * 0.5), 0);
            ctx.lineTo(s * (i * 0.5 - 1), -s * (1.5 - ph));
            ctx.stroke();
        }

        /* addome, torace, testa */
        ctx.fillStyle = withAlpha(color, isLeader ? 1 : 0.9);
        ctx.beginPath();
        ctx.ellipse(-s * 1.5, 0, s * 1.5, s * 1.05, 0, 0, 6.283);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(s * 0.1, 0, s * 0.8, s * 0.62, 0, 0, 6.283);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(s * 1.3, 0, s * 0.75, s * 0.58, 0, 0, 6.283);
        ctx.fill();

        /* antenne */
        ctx.strokeStyle = withAlpha(lighten(color, -20), 0.8);
        ctx.lineWidth = Math.max(0.5, s * 0.35);
        ctx.beginPath();
        ctx.moveTo(s * 1.8, s * 0.2);
        ctx.lineTo(s * (2.8 + gait * 0.4), s * (0.9 + gait * 0.3));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 1.8, -s * 0.2);
        ctx.lineTo(s * (2.8 - gait * 0.4), -s * (0.9 - gait * 0.3));
        ctx.stroke();

        if (isLeader) {
            /* la testa è un filo più grande e con un brillio */
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.beginPath();
            ctx.arc(s * 1.4, -s * 0.15, s * 0.22, 0, 6.283);
            ctx.fill();
        }

        ctx.restore();
    }

    function drawColony(col, world, time) {
        var pts = col.pts;
        if (!pts.length) return;
        var v = Camera.view;
        if (col.x + 200 < v.x0 || col.x - 200 > v.x1) return;
        if (col.y + 200 < v.y0 || col.y - 200 > v.y1) return;

        var r = L.World.workerRadius(col);
        var n = pts.length;
        var i;

        /* scia: le formiche in coda sono più piccole e indietro */
        for (i = n - 1; i >= 1; i--) {
            var p = pts[i];
            if (p.x + 40 < v.x0 || p.x - 40 > v.x1) continue;
            if (p.y + 40 < v.y0 || p.y - 40 > v.y1) continue;
            /* angolo lungo la coda */
            var q = pts[i - 1];
            var ang = Math.atan2(q.y - p.y, q.x - p.x);
            drawAnt(p.x, p.y, ang, r * (0.82 - i * 0.02), col.color, time + i, false);
        }

        /* testa */
        drawAnt(col.x, col.y, col.angle, r, lighten(col.color, 20), time, true);

        /* briciola sulla testa: il trasporto deve vedersi */
        if (col.carrying) {
            var c = col.carrying;
            ctx.fillStyle = withAlpha(COL.crumb, 0.95);
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r * 0.8, 0, 6.283);
            ctx.fill();
        }

        /* alone del possesso quando la colonia è attiva */
        if (col.boosting) {
            ctx.fillStyle = withAlpha(lighten(col.color, 60), 0.25);
            ctx.beginPath();
            ctx.arc(col.x, col.y, r * 4, 0, 6.283);
            ctx.fill();
        }
    }

    function drawNests(world, time) {
        for (var i = 0; i < world.colonies.length; i++) {
            var col = world.colonies[i];
            var nx = col.nestX, ny = col.nestY;
            if (nx + 130 < Camera.view.x0 || nx - 130 > Camera.view.x1) continue;
            if (ny + 130 < Camera.view.y0 || ny - 130 > Camera.view.y1) continue;

            /* cratero di terra smossa */
            ctx.fillStyle = "rgba(50,32,18,0.85)";
            ctx.beginPath();
            ctx.ellipse(nx, ny, 62, 42, 0.3, 0, 6.283);
            ctx.fill();

            /* anello del colore della colonia */
            ctx.strokeStyle = withAlpha(col.color, 0.85);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(nx, ny, 58, 39, 0.3, 0, 6.283);
            ctx.stroke();

            /* buco */
            ctx.fillStyle = "rgba(15,8,4,0.95)";
            ctx.beginPath();
            ctx.ellipse(nx, ny, 24, 16, 0.3, 0, 6.283);
            ctx.fill();

            /* granuli scavati */
            ctx.fillStyle = "rgba(120,84,48,0.6)";
            for (var k = 0; k < 8; k++) {
                var a = (k / 8) * 6.283 + col.slot;
                var d = 26 + ((k * 13) % 30);
                ctx.beginPath();
                ctx.arc(nx + Math.cos(a) * d, ny + Math.sin(a) * d * 0.7, 2.2, 0, 6.283);
                ctx.fill();
            }

            /* hp del nido del giocatore: arco sopra il cratere */
            if (col.isPlayer) {
                var frac = L.clamp(col.nestHp / C.nest.hp, 0, 1);
                ctx.strokeStyle = frac > 0.5 ? "rgba(160,255,170,0.9)" : frac > 0.25 ? "rgba(255,210,120,0.9)" : "rgba(255,90,90,0.95)";
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(nx, ny, 74, -Math.PI * 0.75, -Math.PI * 0.75 + Math.PI * 1.5 * frac);
                ctx.stroke();
            } else {
                /* etichetta minima: puntino colorato per riconoscere il nido */
                ctx.fillStyle = withAlpha(col.color, 0.9);
                ctx.beginPath();
                ctx.arc(nx, ny, 5, 0, 6.283);
                ctx.fill();
            }
        }
    }

    function drawRaids(world, time) {
        for (var i = 0; i < world.raids.length; i++) {
            var ant = world.raids[i];
            if (ant.x + 40 < Camera.view.x0 || ant.x - 40 > Camera.view.x1) continue;
            if (ant.y + 40 < Camera.view.y0 || ant.y - 40 > Camera.view.y1) continue;
            drawAnt(ant.x, ant.y, ant.angle, C.raid.antRadius * 0.8, COL.raid, time + i, false);
            /* hp residuo: puntino quando è ferita */
            if (ant.hp < C.raid.antHp) {
                ctx.fillStyle = "rgba(255,255,255,0.8)";
                ctx.beginPath();
                ctx.arc(ant.x, ant.y - 8, 1.4, 0, 6.283);
                ctx.fill();
            }
        }
    }

    function drawParticles(world) {
        for (var i = 0; i < world.particles.length; i++) {
            var p = world.particles[i];
            var a = L.clamp(p.life / p.maxLife, 0, 1);
            ctx.fillStyle = withAlpha(p.color, a * 0.8);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * a, 0, 6.283);
            ctx.fill();
        }
    }

    /* ===== Notte =====
     * Il buio non toglie la vista: tinge il tavolo e ispessisce la vignette.
     * La differenza la fa il ronzio dell'audio e ciò che marcia nel buio. */
    function drawNight(world) {
        var k = world.night;
        if (k <= 0.01) return;

        ctx.fillStyle = withAlpha(COL.night, 0.55 * k);
        ctx.fillRect(v0x(), v0y(), Camera.view.x1 - v0x(), Camera.view.y1 - v0y());

        /* alone caldo attorno al proprio nido: l'unica luce è casa */
        var p = world.player;
        if (p) {
            var s = Camera.toScreen(p.nestX, p.nestY);
            var r = 340 * Camera.zoom;
            var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
            g.addColorStop(0, "rgba(255,214,150," + (0.22 * k) + ")");
            g.addColorStop(1, "rgba(255,214,150,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, cssW, cssH);
        }
    }

    /* ===== Overlay in spazio schermo ===== */
    function drawOverlays(world, time) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        /* Indicatore del nido quando sei fuori schermo (o lontano). */
        var p = world.player;
        if (p && p.alive) {
            var s = Camera.toScreen(p.x, p.y);
            var ns = Camera.toScreen(p.nestX, p.nestY);
            if (ns.x < 0 || ns.x > cssW || ns.y < 0 || ns.y > cssH) {
                var ang = Math.atan2(ns.y - s.y, ns.x - s.x);
                var cx = cssW / 2, cy = cssH / 2;
                var rad = Math.min(cssW, cssH) / 2 - 46;
                var mx = cx + Math.cos(ang) * rad;
                var my = cy + Math.sin(ang) * rad;
                ctx.save();
                ctx.translate(mx, my);
                ctx.rotate(ang);
                ctx.fillStyle = "rgba(255,190,120,0.85)";
                ctx.beginPath();
                ctx.moveTo(14, 0);
                ctx.lineTo(-8, 8);
                ctx.lineTo(-8, -8);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        /* Marker touch */
        var marker = L.Player.state.marker;
        if (marker.active && marker.age < 1.2) {
            ctx.save();
            ctx.globalAlpha = L.clamp(1 - (marker.age - 0.7) / 0.5, 0, 1) * 0.5;
            ctx.beginPath();
            ctx.arc(marker.x, marker.y, 26, 0, 6.283);
            ctx.strokeStyle = "rgba(255,190,120,0.9)";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(marker.x, marker.y, 4, 0, 6.283);
            ctx.fillStyle = "rgba(255,220,170,0.95)";
            ctx.fill();
            ctx.restore();
        }

        /* Vignette: più spessa di notte. */
        if (vignette) {
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, cssW, cssH);
        }

        /* Bordo del tavolo: il legno finisce. */
        var edge = 6;
        var pulse = 0.2 + Math.sin(time * 2) * 0.05;
        ctx.strokeStyle = "rgba(30,18,8," + pulse + ")";
        ctx.lineWidth = 14;
        ctx.strokeRect(edge / 2 - 7, edge / 2 - 7, cssW - edge + 14, cssH - edge + 14);
    }

    /* ===== Frame =====
     * `target` decide chi guarda la camera: il giocatore, il leader nel
     * menu, il nemico che ti ha annesso in spettatore.
     */
    function draw(world, dt, time, target) {
        var t = target || world.player;
        if (t) {
            var lead = 0.18;
            Camera.followX(
                t.x + t.vx * lead,
                t.y + t.vy * lead,
                L.World.zoomFor(t),
                dt, reduceMotion
            );
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = COL.woodDark;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.setTransform(
            Camera.zoom * dpr, 0, 0, Camera.zoom * dpr,
            (cssW / 2 - (Camera.x + Camera.shakeX) * Camera.zoom) * dpr,
            (cssH / 2 - (Camera.y + Camera.shakeY) * Camera.zoom) * dpr
        );

        drawBackground(world);
        drawTerritory(world);
        drawPebbles(world);
        drawInks(world);
        drawDrops(world, time);
        drawCrumbs(world, time);
        drawNests(world, time);
        drawRaids(world, time);
        for (var i = 0; i < world.colonies.length; i++) {
            if (world.colonies[i].alive) drawColony(world.colonies[i], world, time);
        }
        drawParticles(world);
        drawNight(world);

        drawOverlays(world, time);

        /* Miniatura territorio, ricostruita a bassa frequenza. */
        terrainAcc += dt;
        if (terrainAcc >= 0.3) {
            terrainAcc = 0;
            buildTerritoryImage();
        }
    }

    /* ===== Minimappa ===== */
    function drawMinimap(mctx2, world) {
        var cw = mctx2.canvas.width;
        var chh = mctx2.canvas.height;
        var k = Math.min(cw / world.w, chh / world.h);

        mctx2.setTransform(1, 0, 0, 1, 0, 0);
        mctx2.clearRect(0, 0, cw, chh);
        mctx2.fillStyle = "rgba(40,26,14,0.9)";
        mctx2.fillRect(0, 0, cw, chh);

        /* territorio: il canvas griglia porta a scala */
        mctx2.imageSmoothingEnabled = false;
        mctx2.drawImage(terrainCanvas, 0, 0, world.gw * k, world.gh * k);

        /* confini di zona */
        mctx2.strokeStyle = "rgba(255,235,200,0.14)";
        mctx2.lineWidth = 1;
        mctx2.beginPath();
        mctx2.moveTo(world.w / 2 * k, 0); mctx2.lineTo(world.w / 2 * k, chh);
        mctx2.moveTo(0, world.h / 2 * k); mctx2.lineTo(cw, world.h / 2 * k);
        mctx2.stroke();

        /* nidi */
        for (var i = 0; i < world.colonies.length; i++) {
            var col = world.colonies[i];
            mctx2.fillStyle = col.color;
            mctx2.beginPath();
            mctx2.arc(col.nestX * k, col.nestY * k, 2.6, 0, 6.283);
            mctx2.fill();
        }

        /* colonie vive */
        for (i = 0; i < world.colonies.length; i++) {
            col = world.colonies[i];
            mctx2.fillStyle = col.isPlayer ? "#ffffff" : col.color;
            mctx2.beginPath();
            mctx2.arc(col.x * k, col.y * k, 2, 0, 6.283);
            mctx2.fill();
        }

        /* gocce e razzie in arrivo */
        for (i = 0; i < world.raids.length; i++) {
            mctx2.fillStyle = COL.raid;
            mctx2.fillRect(world.raids[i].x * k - 1, world.raids[i].y * k - 1, 2, 2);
        }

        /* viewport */
        var v = Camera.view;
        mctx2.strokeStyle = "rgba(255,240,220,0.5)";
        mctx2.lineWidth = 1;
        mctx2.strokeRect(
            L.clamp(v.x0 * k, 0, cw), L.clamp(v.y0 * k, 0, chh),
            Math.min(cw, v.x1 * k) - L.clamp(v.x0 * k, 0, cw),
            Math.min(chh, v.y1 * k) - L.clamp(v.y0 * k, 0, chh)
        );
    }

    L.Render = {
        init: init,
        draw: draw,
        drawMinimap: drawMinimap,
        shake: function (amount) { Camera.shake = Math.min(24, Camera.shake + amount); },
        canvas: function () { return canvas; },
        size: function () { return { w: cssW, h: cssH, dpr: dpr }; },
    };

    L.Camera = Camera;

})(window.FORMICA = window.FORMICA || {});
