/*
 * LUMEN - rendering.
 *
 * The whole look rests on one thing: the scene is drawn flat into an
 * offscreen buffer, then a light mask is punched through it. Anything your
 * glow does not reach stays black. That is also the game's core rule, so the
 * shader and the mechanics are the same idea.
 *
 * Lights are collected while drawing and reused for both the mask and the
 * bloom pass, so cost is paid once per light per frame.
 */
(function (L) {
    "use strict";

    var C = L.CONFIG;
    var COL = L.COLORS;

    /* ===== Camera ===== */
    var Camera = {
        x: 0, y: 0, zoom: 1,
        shake: 0, shakeX: 0, shakeY: 0,
        w: 0, h: 0,
        view: { x0: 0, y0: 0, x1: 0, y1: 0 },
        followX: function (x, y, zoom, dt, reduceMotion) {
            /* Look slightly ahead of travel; it makes tight dodges readable. */
            var tx = x, ty = y;
            var k = 1 - Math.pow(0.0015, dt);
            this.x = L.lerp(this.x, tx, k);
            this.y = L.lerp(this.y, ty, k);
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

    /* ===== Canvas plumbing ===== */
    var canvas, ctx;
    var scene, sctx;
    var mask, mctx;
    var dpr = 1;
    var cssW = 0, cssH = 0;
    var vignette = null;
    var lights = [];
    var reduceMotion = false;

    var SNOW = [];
    var SNOW_LAYERS = [
        { factor: 0.14, r: 1.0, a: 0.16, count: 90 },
        { factor: 0.32, r: 1.7, a: 0.13, count: 70 },
        { factor: 0.58, r: 2.6, a: 0.10, count: 46 },
    ];

    function makeSnow() {
        SNOW.length = 0;
        for (var l = 0; l < SNOW_LAYERS.length; l++) {
            var layer = SNOW_LAYERS[l];
            for (var i = 0; i < layer.count; i++) {
                SNOW.push({
                    layer: l,
                    x: Math.random(),
                    y: Math.random(),
                    drift: Math.random() * 6.283,
                    speed: L.rand(4, 16),
                });
            }
        }
    }

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext("2d", { alpha: false });

        scene = document.createElement("canvas");
        sctx = scene.getContext("2d", { alpha: false });

        mask = document.createElement("canvas");
        mctx = mask.getContext("2d");

        makeSnow();
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

        scene.width = canvas.width;
        scene.height = canvas.height;

        var ms = C.light.maskScale;
        mask.width = Math.max(1, Math.round(cssW * ms));
        mask.height = Math.max(1, Math.round(cssH * ms));

        Camera.w = cssW;
        Camera.h = cssH;
        Camera._updateView();

        vignette = ctx.createRadialGradient(
            cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.32,
            cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.78
        );
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, "rgba(0,4,10,0.82)");
    }

    /* ===== Lighting helpers ===== */
    function addLight(wx, wy, radius, alpha, color) {
        var s = Camera.toScreen(wx, wy);
        var r = radius * Camera.zoom;
        if (s.x + r < -60 || s.x - r > cssW + 60) return;
        if (s.y + r < -60 || s.y - r > cssH + 60) return;
        lights.push({ x: s.x, y: s.y, r: r, a: alpha, color: color });
    }

    /* Squared falloff, approximated with four stops. Reads as light rather
     * than as a flat disc. */
    function falloff(g, r, maxAlpha) {
        g.addColorStop(0.00, "rgba(0,0,0," + maxAlpha + ")");
        g.addColorStop(0.32, "rgba(0,0,0," + maxAlpha * 0.66 + ")");
        g.addColorStop(0.64, "rgba(0,0,0," + maxAlpha * 0.21 + ")");
        g.addColorStop(1.00, "rgba(0,0,0,0)");
        return g;
    }

    function withAlpha(hex, a) {
        var h = hex.replace("#", "");
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }

    function lighten(hex, amt) {
        var h = hex.replace("#", "");
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        var r = Math.min(255, ((n >> 16) & 255) + amt);
        var g = Math.min(255, ((n >> 8) & 255) + amt);
        var b = Math.min(255, (n & 255) + amt);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    /* ===== Creature drawing ===== */
    function ribbonPath(c, r0, r1) {
        var pts = c.pts;
        var n = pts.length;
        if (n < 2) return false;
        var started = false;
        var back = [];

        for (var i = 0; i < n; i++) {
            var p = pts[i];
            var q = pts[i + 1] || pts[n - 1];
            var r = pts[i - 1] || pts[0];
            var dx = q.x - r.x, dy = q.y - r.y;
            var m = Math.sqrt(dx * dx + dy * dy);
            if (m < 1e-5) { dx = 1; dy = 0; m = 1; }
            var nx = -dy / m, ny = dx / m;
            var f = i / (n - 1);
            var rad = L.lerp(r0, r1, f * f);
            var lx = p.x + nx * rad, ly = p.y + ny * rad;
            if (!started) { sctx.moveTo(lx, ly); started = true; }
            else sctx.lineTo(lx, ly);
            back.push({ x: p.x - nx * rad, y: p.y - ny * rad });
        }
        for (var j = back.length - 1; j >= 0; j--) sctx.lineTo(back[j].x, back[j].y);
        sctx.closePath();
        return true;
    }

    function drawCreature(c, world, time) {
        var v = Camera.view;
        if (c.headX + 80 < v.x0 || c.headX - 80 > v.x1) return;
        if (c.headY + 80 < v.y0 || c.headY - 80 > v.y1) return;
        if (c.pts.length < 2) return;

        var isPlayer = c.isPlayer;
        var alpha = c.alive ? 1 : 0.35;
        var r = c.radius;

        sctx.globalAlpha = alpha;

        /* Body */
        sctx.beginPath();
        if (ribbonPath(c, r, r * 0.24)) {
            sctx.fillStyle = withAlpha(c.color, isPlayer ? 0.95 : 0.8);
            sctx.fill();
        }

        /* Bright core along the spine */
        sctx.beginPath();
        sctx.moveTo(c.pts[0].x, c.pts[0].y);
        for (var i = 1; i < c.pts.length; i++) sctx.lineTo(c.pts[i].x, c.pts[i].y);
        sctx.strokeStyle = withAlpha(lighten(c.color, 70), 0.55);
        sctx.lineWidth = Math.max(1, r * 0.45);
        sctx.lineCap = "round";
        sctx.lineJoin = "round";
        sctx.stroke();

        /* Head */
        var hx = c.pts[0].x, hy = c.pts[0].y;
        sctx.beginPath();
        sctx.arc(hx, hy, r * 0.92, 0, 6.283);
        sctx.fillStyle = lighten(c.color, 40);
        sctx.fill();

        /* Eye glints */
        var ex = Math.cos(c.angle), ey = Math.sin(c.angle);
        var px = -ey, py = ex;
        for (var s = -1; s <= 1; s += 2) {
            sctx.beginPath();
            sctx.arc(
                hx + ex * r * 0.34 + px * r * 0.36 * s,
                hy + ey * r * 0.34 + py * r * 0.36 * s,
                Math.max(0.9, r * 0.15), 0, 6.283
            );
            sctx.fillStyle = "rgba(255,255,255,0.92)";
            sctx.fill();
        }

        /* Boost sparks */
        if (c.boosting) {
            sctx.beginPath();
            sctx.arc(hx - ex * r * 1.5, hy - ey * r * 1.5, r * 0.5, 0, 6.283);
            sctx.fillStyle = withAlpha(lighten(c.color, 90), 0.8);
            sctx.fill();
        }

        sctx.globalAlpha = 1;
    }

    function drawAngler(a, world, time) {
        var v = Camera.view;
        if (a.x + 300 < v.x0 || a.x - 300 > v.x1) return;
        if (a.y + 300 < v.y0 || a.y - 300 > v.y1) return;

        sctx.globalAlpha = 1;

        /* Filament */
        sctx.beginPath();
        sctx.moveTo(a.x, a.y);
        sctx.lineTo(a.lureX, a.lureY);
        sctx.strokeStyle = withAlpha(COL.angler, 0.5);
        sctx.lineWidth = 2;
        sctx.stroke();

        /* Body, drawn from its own spine */
        sctx.beginPath();
        if (ribbonPath(a, a.radius, a.radius * 0.3)) {
            sctx.fillStyle = "rgba(30,22,64,0.92)";
            sctx.fill();
        }

        sctx.beginPath();
        sctx.moveTo(a.pts[0].x, a.pts[0].y);
        for (var i = 1; i < a.pts.length; i++) sctx.lineTo(a.pts[i].x, a.pts[i].y);
        sctx.strokeStyle = withAlpha(COL.angler, 0.55);
        sctx.lineWidth = a.radius * 0.4;
        sctx.lineCap = "round";
        sctx.stroke();

        /* Mouth */
        sctx.beginPath();
        sctx.arc(a.pts[0].x, a.pts[0].y, a.radius * 0.8, 0, 6.283);
        sctx.fillStyle = "rgba(20,14,44,0.95)";
        sctx.fill();
        sctx.strokeStyle = withAlpha(COL.angler, 0.7);
        sctx.lineWidth = 3;
        sctx.stroke();

        /* Lure: dim when lurking, blinding when it stalks, out when stunned */
        var pulse = 0.75 + Math.sin(time * 4) * 0.25;
        if (a.lureOn) {
            sctx.beginPath();
            sctx.arc(a.lureX, a.lureY, 9 * pulse, 0, 6.283);
            sctx.fillStyle = withAlpha(COL.lure, 0.95);
            sctx.fill();
        }
    }

    function drawJelly(j, time) {
        var v = Camera.view;
        if (j.x + 40 < v.x0 || j.x - 40 > v.x1) return;
        if (j.y + 40 < v.y0 || j.y - 40 > v.y1) return;

        var pulse = 1 + Math.sin(time * 2 + j.phase) * 0.14;
        sctx.save();
        sctx.translate(j.x, j.y);
        sctx.scale(pulse, 2 - pulse);

        sctx.beginPath();
        sctx.arc(0, 0, j.r, Math.PI, 0);
        sctx.quadraticCurveTo(0, j.r * 0.5, -j.r, 0);
        sctx.closePath();
        sctx.fillStyle = withAlpha(COL.jelly, 0.28);
        sctx.fill();
        sctx.strokeStyle = withAlpha(COL.jelly, 0.6);
        sctx.lineWidth = 1.6;
        sctx.stroke();

        for (var t = -2; t <= 2; t++) {
            sctx.beginPath();
            sctx.moveTo(t * j.r * 0.32, 0);
            sctx.quadraticCurveTo(
                t * j.r * 0.32 + Math.sin(time * 2.6 + t + j.phase) * 7,
                j.r * 1.3,
                t * j.r * 0.32 + Math.sin(time * 2 + t) * 5,
                j.r * 2.1
            );
            sctx.strokeStyle = withAlpha(COL.jelly, 0.35);
            sctx.lineWidth = 1.6;
            sctx.stroke();
        }
        sctx.restore();
    }

    function drawWreck(wk, time) {
        var v = Camera.view;
        if (wk.x + 200 < v.x0 || wk.x - 200 > v.x1) return;
        if (wk.y + 200 < v.y0 || wk.y - 200 > v.y1) return;

        sctx.save();
        sctx.translate(wk.x, wk.y);
        sctx.rotate(wk.rot);

        sctx.beginPath();
        var r = Math.min(wk.hw, wk.hh) * 0.35;
        if (sctx.roundRect) {
            sctx.roundRect(-wk.hw, -wk.hh, wk.hw * 2, wk.hh * 2, r);
        } else {
            sctx.rect(-wk.hw, -wk.hh, wk.hw * 2, wk.hh * 2);
        }
        sctx.fillStyle = COL.wreck;
        sctx.fill();
        sctx.strokeStyle = COL.wreckLine;
        sctx.lineWidth = 2;
        sctx.stroke();

        /* Ribs */
        sctx.strokeStyle = "rgba(18,41,61,0.7)";
        sctx.lineWidth = 1.4;
        var ribs = 4;
        for (var i = 1; i <= ribs; i++) {
            var x = -wk.hw + (wk.hw * 2 * i) / (ribs + 1);
            sctx.beginPath();
            sctx.moveTo(x, -wk.hh * 0.8);
            sctx.lineTo(x, wk.hh * 0.8);
            sctx.stroke();
        }
        sctx.restore();

        /* Barnacle glow, and the light it throws */
        for (i = 0; i < wk.barnacles; i++) {
            var a = wk.detail * 6.283 + i * 2.4;
            var bx = wk.x + Math.cos(a + wk.rot) * wk.hw * 0.8;
            var by = wk.y + Math.sin(a + wk.rot) * wk.hh * 0.8;
            sctx.beginPath();
            sctx.arc(bx, by, 2.2, 0, 6.283);
            sctx.fillStyle = "rgba(120,200,230,0.35)";
            sctx.fill();
            addLight(bx, by, 26, 0.28, "#78c8e6");
        }
    }

    function drawFood(f, time) {
        var v = Camera.view;
        if (f.x + 20 < v.x0 || f.x - 20 > v.x1) return;
        if (f.y + 20 < v.y0 || f.y - 20 > v.y1) return;

        if (f.type === "plankton") {
            var pulse = 0.55 + Math.sin(time * 2.4 + f.phase) * 0.45;
            sctx.beginPath();
            sctx.arc(f.x, f.y, f.r * (0.8 + pulse * 0.4), 0, 6.283);
            sctx.fillStyle = "rgba(140,230,255," + (0.3 + pulse * 0.35) + ")";
            sctx.fill();
            addLight(f.x, f.y, 15, 0.16 * pulse, "#8ce6ff");
        } else if (f.type === "krill") {
            var col = f.color || COL.krill;
            sctx.beginPath();
            sctx.arc(f.x, f.y, f.r, 0, 6.283);
            sctx.fillStyle = withAlpha(col, 0.35);
            sctx.fill();
            for (var i = 0; i < 5; i++) {
                var a = f.phase + i * 1.256 + time * 0.6;
                sctx.beginPath();
                sctx.arc(f.x + Math.cos(a) * f.r * 1.5, f.y + Math.sin(a) * f.r * 1.5, 1.6, 0, 6.283);
                sctx.fillStyle = withAlpha(col, 0.75);
                sctx.fill();
            }
            addLight(f.x, f.y, 54, 0.5, col);
        } else {
            var mc = f.color || COL.meat;
            var fade = f.ttl === Infinity ? 1 : L.clamp(f.ttl / 2.5, 0.25, 1);
            sctx.beginPath();
            sctx.arc(f.x, f.y, f.r * (0.9 + Math.sin(time * 5 + f.phase) * 0.12), 0, 6.283);
            sctx.fillStyle = withAlpha(mc, 0.75 * fade);
            sctx.fill();
            addLight(f.x, f.y, 34, 0.34 * fade, mc);
        }
    }

    function drawParticles() {
        var list = L.World.world.particles;
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            var a = L.clamp(p.life / p.maxLife, 0, 1);
            sctx.beginPath();
            sctx.arc(p.x, p.y, p.r * a, 0, 6.283);
            sctx.fillStyle = withAlpha(p.color, a * 0.85);
            sctx.fill();
            addLight(p.x, p.y, 20 * a, 0.18 * a, p.color);
        }
    }

    function drawSnow(time) {
        sctx.save();
        for (var i = 0; i < SNOW.length; i++) {
            var s = SNOW[i];
            var layer = SNOW_LAYERS[s.layer];
            var fw = cssW + 60, fh = cssH + 60;
            var px = (((s.x * fw - Camera.x * layer.factor * 0.02) % fw) + fw) % fw - 30;
            var py = (((s.y * fh + time * s.speed * 0.06 - Camera.y * layer.factor * 0.02) % fh) + fh) % fh - 30;
            sctx.beginPath();
            sctx.arc(px, py, layer.r, 0, 6.283);
            sctx.fillStyle = "rgba(190,235,255," + layer.a + ")";
            sctx.fill();
        }
        sctx.restore();
    }

    /* ===== Scene ===== */
    function drawScene(world, time) {
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        var grad = sctx.createLinearGradient(0, 0, 0, scene.height);
        /* Band-tinted water column: brighter blue up top, violet-black below. */
        grad.addColorStop(0, "#0a2438");
        grad.addColorStop(0.35, "#061629");
        grad.addColorStop(0.7, "#050d20");
        grad.addColorStop(1, "#080418");
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, scene.width, scene.height);

        sctx.save();
        sctx.setTransform(
            Camera.zoom * dpr, 0, 0, Camera.zoom * dpr,
            (cssW / 2 - (Camera.x + Camera.shakeX) * Camera.zoom) * dpr,
            (cssH / 2 - (Camera.y + Camera.shakeY) * Camera.zoom) * dpr
        );

        drawSnow(time);

        var i, f;
        for (i = 0; i < world.wrecks.length; i++) drawWreck(world.wrecks[i], time);
        for (i = 0; i < world.food.length; i++) drawFood(world.food[i], time);
        for (i = 0; i < world.jellies.length; i++) drawJelly(world.jellies[i], time);
        for (i = 0; i < world.anglers.length; i++) drawAngler(world.anglers[i], world, time);
        for (i = 0; i < world.creatures.length; i++) {
            if (world.creatures[i].alive) drawCreature(world.creatures[i], world, time);
        }
        drawParticles();

        sctx.restore();
    }

    /* ===== Mask and bloom ===== */
    function buildMask(world) {
        var ms = C.light.maskScale;
        mctx.setTransform(1, 0, 0, 1, 0, 0);
        mctx.globalCompositeOperation = "source-over";
        /* The darkness takes its colour from the depth band. This is the main
         * visual difference between the shallows and the trenches. */
        mctx.fillStyle = L.Zones.darknessFor(Camera.y, world.size);
        mctx.fillRect(0, 0, mask.width, mask.height);

        mctx.globalCompositeOperation = "destination-out";
        mctx.save();
        mctx.scale(ms, ms);
        for (var i = 0; i < lights.length; i++) {
            var l = lights[i];
            var g = mctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, Math.max(1, l.r));
            falloff(g, l.r, l.a);
            mctx.fillStyle = g;
            mctx.beginPath();
            mctx.arc(l.x, l.y, l.r, 0, 6.283);
            mctx.fill();
        }
        mctx.restore();
    }

    function bloom(world) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (var i = 0; i < lights.length; i++) {
            var l = lights[i];
            if (l.a < 0.4) continue;
            var g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, Math.max(1, l.r * 0.55));
            g.addColorStop(0, withAlpha(l.color, Math.min(0.5, l.a * 0.42)));
            g.addColorStop(1, withAlpha(l.color, 0));
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(l.x, l.y, l.r * 0.55, 0, 6.283);
            ctx.fill();
        }
        ctx.restore();
    }

    /* Wrecks carry a faint halo of their own. Without it the most lethal
     * thing in the game is also the least visible, which just means dying
     * to something you had no chance to read at the edge of your glow. */
    function collectWreckLights(world) {
        for (var i = 0; i < world.wrecks.length; i++) {
            var wk = world.wrecks[i];
            addLight(wk.x, wk.y, 120, 0.2, "#5fa8c8");
        }
    }

    /* Collect every light source in the world, not just what is on screen:
     * distant creatures must glimmer even outside the view rectangle, or the
     * "you see the light before you see the creature" beat never lands. */
    function collectLights(world, time) {
        var i, c, a;

        collectWreckLights(world);

        for (i = 0; i < world.creatures.length; i++) {
            c = world.creatures[i];
            if (!c.alive) continue;
            if (c.isPlayer) {
                addLight(c.headX, c.headY, c.glow, 1, c.color);
            } else {
                /* You see other LUMENs as a glow in the dark long before you
                 * can make out their body. */
                addLight(c.headX, c.headY, c.glow * C.light.enemyGlowFactor, C.light.enemyGlowAlpha, c.color);
                var s = Camera.toScreen(c.headX, c.headY);
                if (s.x > -80 && s.x < cssW + 80 && s.y > -80 && s.y < cssH + 80) {
                    addLight(c.headX, c.headY, c.glow * 0.55, 0.3, c.color);
                }
            }
        }

        for (i = 0; i < world.anglers.length; i++) {
            a = world.anglers[i];
            if (a.lureOn) {
                /* The windup flare is the tell: it has to punch through the
                 * darkness or the lunge is just an unavoidable surprise. */
                var lf = a.state === "windup" ? 1
                    : a.state === "stalk" ? 0.8
                    : a.state === "lunge" ? 0.7
                    : 0.5;
                addLight(a.lureX, a.lureY, a.lureR * 2.6 * (0.9 + Math.sin(time * 4) * 0.1), lf, COL.lure);
            } else {
                /* Stunned: the lure is out and it is your one chance. */
                addLight(a.lureX, a.lureY, 120, 0.9, COL.lure);
            }
            addLight(a.x, a.y, a.radius * 2.2, 0.4, COL.angler);
        }
    }

    /* ===== Screen-space overlays ===== */
    function drawOverlays(world, time) {
        var p = world.player;

        /* Edge warning */
        if (p && p.alive && p.atEdge) {
            var pulse = 0.25 + Math.sin(time * 8) * 0.15;
            ctx.save();
            var eg = ctx.createLinearGradient(0, 0, 0, cssH);
            eg.addColorStop(0, "rgba(255,79,107," + pulse + ")");
            eg.addColorStop(0.25, "rgba(255,79,107,0)");
            eg.addColorStop(0.75, "rgba(255,79,107,0)");
            eg.addColorStop(1, "rgba(255,79,107," + pulse + ")");
            ctx.fillStyle = eg;
            ctx.fillRect(0, 0, cssW, cssH);
            var eg2 = ctx.createLinearGradient(0, 0, cssW, 0);
            eg2.addColorStop(0, "rgba(255,79,107," + pulse + ")");
            eg2.addColorStop(0.25, "rgba(255,79,107,0)");
            eg2.addColorStop(0.75, "rgba(255,79,107,0)");
            eg2.addColorStop(1, "rgba(255,79,107," + pulse + ")");
            ctx.fillStyle = eg2;
            ctx.fillRect(0, 0, cssW, cssH);
            ctx.restore();
        }

        /* Touch marker */
        var marker = L.Player.state.marker;
        if (marker.active && marker.age < 1.2) {
            ctx.save();
            ctx.globalAlpha = L.clamp(1 - (marker.age - 0.7) / 0.5, 0, 1) * 0.5;
            ctx.beginPath();
            ctx.arc(marker.x, marker.y, 26, 0, 6.283);
            ctx.strokeStyle = "rgba(140,235,255,0.9)";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(marker.x, marker.y, 4, 0, 6.283);
            ctx.fillStyle = "rgba(200,245,255,0.95)";
            ctx.fill();
            ctx.restore();
        }

        /* Stun */
        if (p && p.alive && p.stun > 0) {
            ctx.save();
            ctx.fillStyle = "rgba(196,107,255," + (0.12 + Math.sin(time * 18) * 0.06) + ")";
            ctx.fillRect(0, 0, cssW, cssH);
            ctx.restore();
        }

        /* Vignette */
        if (vignette) {
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, cssW, cssH);
        }
    }

    /* ===== Frame =====
     * `target` overrides who the camera watches: the player by default, the
     * current leader on the menu, and your killer while spectating.
     */
    function draw(world, time, dt, target) {
        lights.length = 0;

        var t = target || world.player;
        if (t) {
            var lead = 0.22;
            Camera.followX(
                t.headX + t.vx * lead,
                t.headY + t.vy * lead,
                L.World.zoomFor(t.mass),
                dt, reduceMotion
            );
        }

        drawScene(world, time);
        collectLights(world, time);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(scene, 0, 0);

        buildMask(world);
        ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);

        bloom(world);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawOverlays(world, time);
    }

    /* ===== Minimap ===== */
    function drawMinimap(mctx2, world) {
        var size = mctx2.canvas.width;
        var k = size / world.size;
        mctx2.setTransform(1, 0, 0, 1, 0, 0);
        mctx2.clearRect(0, 0, size, size);

        mctx2.fillStyle = "rgba(3,10,20,0.55)";
        mctx2.fillRect(0, 0, size, size);

        /* Depth bands, so the minimap shows the vertical axis too. */
        var bands = L.Zones.BANDS;
        for (var b = 0; b < bands.length; b++) {
            mctx2.fillStyle = bands[b].tint;
            mctx2.globalAlpha = 0.55;
            mctx2.fillRect(0, bands[b].y0 * size, size, (bands[b].y1 - bands[b].y0) * size);
        }
        mctx2.globalAlpha = 1;

        mctx2.strokeStyle = "rgba(120,200,230,0.18)";
        mctx2.lineWidth = 1;
        mctx2.strokeRect(0.5, 0.5, size - 1, size - 1);

        for (var i = 0; i < world.wrecks.length; i++) {
            var w = world.wrecks[i];
            mctx2.fillStyle = "rgba(90,130,160,0.22)";
            mctx2.fillRect(w.x * k - 1, w.y * k - 1, 2, 2);
        }

        for (i = 0; i < world.jellies.length; i++) {
            var j = world.jellies[i];
            mctx2.beginPath();
            mctx2.arc(j.x * k, j.y * k, 1.4, 0, 6.283);
            mctx2.fillStyle = "rgba(196,107,255,0.5)";
            mctx2.fill();
        }

        for (i = 0; i < world.creatures.length; i++) {
            var c = world.creatures[i];
            if (!c.alive) continue;
            var r = Math.max(1.6, c.radius * k * 1.8);
            mctx2.beginPath();
            mctx2.arc(c.headX * k, c.headY * k, r, 0, 6.283);
            mctx2.fillStyle = c.isPlayer ? "#ffffff" : withAlpha(c.color, 0.9);
            mctx2.fill();
            if (c.isPlayer) {
                mctx2.beginPath();
                mctx2.arc(c.headX * k, c.headY * k, r + 3.5, 0, 6.283);
                mctx2.strokeStyle = "rgba(255,255,255,0.8)";
                mctx2.lineWidth = 1.4;
                mctx2.stroke();
            }
        }

        /* Viewport rectangle */
        var v = Camera.view;
        mctx2.strokeStyle = "rgba(180,240,255,0.35)";
        mctx2.lineWidth = 1;
        mctx2.strokeRect(
            L.clamp(v.x0 * k, 0, size), L.clamp(v.y0 * k, 0, size),
            Math.min(size, v.x1 * k) - L.clamp(v.x0 * k, 0, size),
            Math.min(size, v.y1 * k) - L.clamp(v.y0 * k, 0, size)
        );
    }

    L.Render = {
        init: init,
        draw: draw,
        drawMinimap: drawMinimap,
        shake: function (amount) { Camera.shake = Math.min(26, Camera.shake + amount); },
        canvas: function () { return canvas; },
        size: function () { return { w: cssW, h: cssH, dpr: dpr }; },
    };

    L.Camera = Camera;

})(window.LUMEN = window.LUMEN || {});
