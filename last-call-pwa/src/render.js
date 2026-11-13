/*
 * LAST CALL renderer — everything is drawn, nothing is downloaded.
 *
 * A neon art-deco bar counter, vectors for every glass, synth particles for
 * every pop. The renderer never mutates simulation state.
 */
(function (LC) {
    "use strict";

    var C = LC.CONFIG;
    var U = LC.U;
    var CARDS = LC.CARDS;

    var R = {
        canvas: null,
        ctx: null,
        dpr: 1,
        width: C.W,
        height: C.H,
        backdrop: null,
        state: null,
        particles: [],
        rings: [],
        floaters: [],
        shake: 0,
        flash: 0,
        lastDraw: 0,
        portraitCache: {}
    };

    var PLAYER = "#5ef2d6";
    var ENEMY = "#ff4f9a";
    var GOLD = "#e8c07d";

    function teamColor(side) {
        return side === "player" ? PLAYER : ENEMY;
    }

    function roundRect(ctx, x, y, w, h, r) {
        var rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
    }

    function ellipse(ctx, x, y, rx, ry, fill) {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        if (fill) ctx.fill();
    }

    function rgba(hex, alpha) {
        if (!hex) return "rgba(255,255,255," + alpha + ")";
        if (hex[0] === "#") {
            var h = hex.slice(1);
            if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
            var n = parseInt(h, 16);
            return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
        }
        return hex;
    }

    function shade(hex, amount) {
        if (!hex || hex[0] !== "#") return hex;
        var h = hex.slice(1);
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        var r = U.clamp(((n >> 16) & 255) + amount, 0, 255);
        var g = U.clamp(((n >> 8) & 255) + amount, 0, 255);
        var b = U.clamp((n & 255) + amount, 0, 255);
        return "rgb(" + r + "," + g + "," + b + ")";
    }

    R.init = function (canvas) {
        R.canvas = canvas;
        R.ctx = canvas.getContext("2d");
        R.resize();
        R.buildBackdrop();
    };

    R.resize = function () {
        if (!R.canvas) return;
        R.dpr = Math.min(2, window.devicePixelRatio || 1);
        R.canvas.width = Math.round(C.W * R.dpr);
        R.canvas.height = Math.round(C.H * R.dpr);
        if (R.ctx) R.ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    };

    R.setMatch = function (state) {
        R.state = state;
        R.particles.length = 0;
        R.rings.length = 0;
        R.floaters.length = 0;
        R.shake = 0;
        R.flash = 0;
        R.portraitCache = R.portraitCache || {};
    };

    /* ---------- backdrop ---------- */

    R.buildBackdrop = function () {
        var bd = document.createElement("canvas");
        bd.width = C.W;
        bd.height = C.H;
        var b = bd.getContext("2d");

        b.fillStyle = "#08050d";
        b.fillRect(0, 0, C.W, C.H);

        /* warm bar counter */
        var wood = b.createLinearGradient(0, 0, 0, C.H);
        wood.addColorStop(0, "#2a1926");
        wood.addColorStop(0.3, "#231421");
        wood.addColorStop(0.5, "#1d101d");
        wood.addColorStop(0.7, "#241421");
        wood.addColorStop(1, "#1b0f1d");
        roundRect(b, 12, 12, C.W - 24, C.H - 24, 28);
        b.fillStyle = wood;
        b.fill();

        /* plank seams + grain */
        b.save();
        roundRect(b, 12, 12, C.W - 24, C.H - 24, 28);
        b.clip();
        for (var y = 78; y < C.H - 20; y += 88) {
            b.strokeStyle = "rgba(0,0,0,0.28)";
            b.lineWidth = 2;
            b.beginPath();
            b.moveTo(14, y);
            b.lineTo(C.W - 14, y);
            b.stroke();
            b.strokeStyle = "rgba(232,192,125,0.045)";
            b.lineWidth = 1;
            b.beginPath();
            b.moveTo(14, y + 2);
            b.lineTo(C.W - 14, y + 2);
            b.stroke();
        }
        for (var i = 0; i < 34; i++) {
            var gx = (i * 197 + 41) % C.W;
            var gy = (i * 331 + 67) % C.H;
            b.strokeStyle = "rgba(232,192,125,0.05)";
            b.lineWidth = 1;
            b.beginPath();
            b.moveTo(gx, gy);
            b.bezierCurveTo(gx + 18, gy - 6, gx + 42, gy + 9, gx + 64, gy + 2);
            b.stroke();
        }
        b.restore();

        /* side rails */
        var rail = b.createLinearGradient(0, 0, 50, 0);
        rail.addColorStop(0, "#0b0710");
        rail.addColorStop(0.5, "#3a2430");
        rail.addColorStop(1, "#120a14");
        b.fillStyle = rail;
        b.fillRect(12, 80, 30, C.H - 160);
        b.save();
        b.translate(C.W - 42, 0);
        b.fillRect(0, 80, 30, C.H - 160);
        b.restore();
        b.strokeStyle = rgba(PLAYER, 0.35);
        b.lineWidth = 2;
        b.beginPath();
        b.moveTo(45, 100);
        b.lineTo(45, C.H - 100);
        b.stroke();
        b.strokeStyle = rgba(ENEMY, 0.32);
        b.beginPath();
        b.moveTo(C.W - 45, 100);
        b.lineTo(C.W - 45, C.H - 100);
        b.stroke();

        /* top and bottom shelves with bottle silhouettes */
        function shelf(y, flip) {
            var grad = b.createLinearGradient(0, y, 0, y + 58);
            grad.addColorStop(0, "rgba(10,6,14,0.94)");
            grad.addColorStop(1, "rgba(18,10,22,0.55)");
            b.fillStyle = grad;
            b.fillRect(18, y, C.W - 36, 58);
            b.strokeStyle = rgba(GOLD, 0.24);
            b.lineWidth = 1.5;
            b.beginPath();
            b.moveTo(24, y + (flip ? 2 : 56));
            b.lineTo(C.W - 24, y + (flip ? 2 : 56));
            b.stroke();
            for (var k = 0; k < 14; k++) {
                var bx = 66 + k * 56;
                var bh = 16 + ((k * 13) % 22);
                var by = flip ? y + 8 : y + 48 - bh;
                b.fillStyle = "rgba(255,255,255,0.06)";
                b.fillRect(bx, by, 7, bh);
                b.beginPath();
                b.arc(bx + 3.5, by, 3.5, 0, Math.PI * 2);
                b.fill();
                b.fillStyle = "rgba(232,192,125,0.07)";
                b.fillRect(bx + 1, by + bh * 0.35, 5, 2);
            }
        }
        shelf(16, false);
        shelf(C.H - 74, true);

        /* river */
        var river = b.createLinearGradient(0, C.RIVER.top, 0, C.RIVER.bottom);
        river.addColorStop(0, "#123a3d");
        river.addColorStop(0.5, "#0a2228");
        river.addColorStop(1, "#2a1430");
        b.fillStyle = river;
        b.fillRect(18, C.RIVER.top, C.W - 36, C.RIVER.bottom - C.RIVER.top);
        b.strokeStyle = rgba(PLAYER, 0.4);
        b.lineWidth = 2;
        b.beginPath();
        b.moveTo(18, C.RIVER.top);
        b.lineTo(C.W - 18, C.RIVER.top);
        b.stroke();
        b.strokeStyle = rgba(ENEMY, 0.38);
        b.beginPath();
        b.moveTo(18, C.RIVER.bottom);
        b.lineTo(C.W - 18, C.RIVER.bottom);
        b.stroke();
        for (var r = 0; r < 18; r++) {
            var rx = 40 + ((r * 149) % (C.W - 80));
            var ry = C.RIVER.top + 14 + ((r * 53) % 52);
            b.fillStyle = "rgba(158,240,255,0.09)";
            ellipse(b, rx, ry, 2 + (r % 3), 1.5, true);
        }

        /* bridges */
        C.BRIDGES.forEach(function (bridge) {
            var bx = bridge.x - bridge.width / 2;
            var by = C.RIVER.top - 6;
            var bw = bridge.width;
            var bh = C.RIVER.bottom - C.RIVER.top + 12;
            var deck = b.createLinearGradient(bx, 0, bx + bw, 0);
            deck.addColorStop(0, "rgba(78,49,32,0.92)");
            deck.addColorStop(0.5, "rgba(128,84,50,0.96)");
            deck.addColorStop(1, "rgba(70,43,29,0.92)");
            roundRect(b, bx, by, bw, bh, 12);
            b.fillStyle = deck;
            b.fill();
            b.strokeStyle = rgba(GOLD, 0.5);
            b.lineWidth = 2;
            b.stroke();
            for (var s = 0; s < 8; s++) {
                var sy = by + 8 + s * (bh - 16) / 8;
                b.strokeStyle = "rgba(0,0,0,0.24)";
                b.beginPath();
                b.moveTo(bx + 8, sy);
                b.lineTo(bx + bw - 8, sy);
                b.stroke();
            }
            b.strokeStyle = rgba(PLAYER, 0.6);
            b.lineWidth = 3;
            b.beginPath();
            b.moveTo(bx + 2, by + 6);
            b.lineTo(bx + 2, by + bh - 6);
            b.stroke();
            b.strokeStyle = rgba(ENEMY, 0.55);
            b.beginPath();
            b.moveTo(bx + bw - 2, by + 6);
            b.lineTo(bx + bw - 2, by + bh - 6);
            b.stroke();
        });

        /* gold inner frame + corner lamps */
        roundRect(b, 16, 16, C.W - 32, C.H - 32, 24);
        b.strokeStyle = "rgba(232,192,125,0.45)";
        b.lineWidth = 2;
        b.stroke();
        roundRect(b, 22, 22, C.W - 44, C.H - 44, 20);
        b.strokeStyle = "rgba(232,192,125,0.12)";
        b.lineWidth = 1;
        b.stroke();
        [[40, 102], [C.W - 40, 102], [40, C.H - 102], [C.W - 40, C.H - 102]].forEach(function (p) {
            var gl = b.createRadialGradient(p[0], p[1], 0, p[0], p[1], 70);
            gl.addColorStop(0, "rgba(255,209,102,0.20)");
            gl.addColorStop(1, "rgba(255,209,102,0)");
            b.fillStyle = gl;
            b.beginPath();
            b.arc(p[0], p[1], 70, 0, Math.PI * 2);
            b.fill();
        });

        /* labels */
        b.save();
        b.fillStyle = "rgba(232,192,125,0.5)";
        b.font = "600 12px Georgia, serif";
        b.textAlign = "center";
        b.fillText("R I V A L   B A R", C.W / 2, 50);
        b.fillText("Y O U R   B A R", C.W / 2, C.H - 38);
        b.restore();

        /* vignette */
        var vig = b.createRadialGradient(C.W / 2, C.H / 2, C.W * 0.25, C.W / 2, C.H / 2, C.H * 0.62);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(0,0,0,0.55)");
        b.fillStyle = vig;
        b.fillRect(0, 0, C.W, C.H);

        R.backdrop = bd;
    };

    /* ---------- particles ---------- */

    function addParticle(x, y, vx, vy, life, color, size, gravity, shape) {
        if (R.particles.length > 420) return;
        R.particles.push({
            x: x, y: y, vx: vx, vy: vy,
            life: life, maxLife: life,
            color: color, size: size,
            gravity: gravity || 0,
            shape: shape || "circle"
        });
    }

    function burst(x, y, color, count, power, size) {
        for (var i = 0; i < (count || 8); i++) {
            var a = Math.random() * Math.PI * 2;
            var s = (0.3 + Math.random()) * (power || 120);
            addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s - 40,
                0.4 + Math.random() * 0.6, color, 1 + Math.random() * (size || 3), 260, "circle");
        }
    }

    function ring(x, y, maxR, color, life, width) {
        if (R.rings.length > 24) R.rings.shift();
        R.rings.push({
            x: x, y: y, r: 8, maxR: maxR,
            life: life || 0.6, maxLife: life || 0.6,
            color: color, width: width || 3
        });
    }

    function floater(x, y, text, color, size) {
        if (R.floaters.length > 20) R.floaters.shift();
        R.floaters.push({
            x: x, y: y, text: text, color: color,
            life: 1.0, maxLife: 1.0, size: size || 16
        });
    }

    R.handleEvents = function (events) {
        if (!events || !events.length) return;
        events.forEach(function (ev) {
            var col = ev.side ? teamColor(ev.side) : GOLD;
            if (ev.type === "cardPlayed") {
                ring(ev.x, ev.y, 46, col, 0.5, 2);
            } else if (ev.type === "spawn") {
                var card = CARDS[ev.cardId];
                var c = card && card.art ? card.art.liquid : col;
                burst(ev.x, ev.y, c, ev.count && ev.count > 1 ? 12 : 6, 80, 2.4);
            } else if (ev.type === "hit") {
                var card2 = CARDS[ev.cardId];
                burst(ev.x, ev.y - 20, card2 && card2.art ? card2.art.accent : col,
                    ev.amount > 200 ? 7 : 3, 90, 2);
            } else if (ev.type === "death") {
                var card3 = CARDS[ev.cardId];
                burst(ev.x, ev.y - 18, card3 && card3.art ? card3.art.liquid : col, 10, 130, 3);
            } else if (ev.type === "towerDown") {
                var tc = ev.side === "player" ? PLAYER : ENEMY;
                burst(ev.x, ev.y, tc, 34, 260, 4.5);
                burst(ev.x, ev.y, GOLD, 18, 190, 3);
                ring(ev.x, ev.y, 150, tc, 0.8, 4);
                R.shake = 22;
                R.flash = 0.6;
                floater(ev.x, ev.y - 90, ev.towerType === "cellar" ? "CELLAR DOWN" : "+1 CROWN", tc, 20);
            } else if (ev.type === "spell") {
                ring(ev.x, ev.y, ev.radius, ev.color || col, 0.6, 4);
                burst(ev.x, ev.y, ev.color || col, 22, 180, 3.5);
                burst(ev.x, ev.y, ev.accent || "#ffffff", 10, 120, 2);
                R.shake = Math.max(R.shake, 6);
            } else if (ev.type === "splashHit") {
                ring(ev.x, ev.y, ev.radius, ev.color || col, 0.35, 2);
            } else if (ev.type === "heal") {
                ring(ev.x, ev.y, ev.radius || 160, "#9dffc4", 0.5, 2);
                for (var h = 0; h < 10; h++) {
                    addParticle(ev.x + (Math.random() * 100 - 50), ev.y + (Math.random() * 60 - 30),
                        0, -50 - Math.random() * 50, 0.6, "#9dffc4", 2, -40, "circle");
                }
            } else if (ev.type === "chargeReady" || ev.type === "chargeHit") {
                ring(ev.x, ev.y, 36, GOLD, 0.35, 2);
            } else if (ev.type === "happyHour") {
                R.flash = 0.5;
            } else if (ev.type === "overtime") {
                R.flash = 0.7;
                R.shake = 8;
            }
        });
    };

    /* ---------- drawing: drink art ---------- */

    function face(ctx, kind, y, color) {
        if (kind === "none" || !kind) return;
        var ink = "rgba(24,12,26,0.92)";
        var white = "rgba(255,255,255,0.92)";
        ctx.save();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = ink;
        if (kind === "sleepy") {
            ctx.strokeStyle = ink;
            ctx.beginPath();
            ctx.moveTo(-9, y); ctx.lineTo(-4, y + 1);
            ctx.moveTo(4, y + 1); ctx.lineTo(9, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, y + 7, 3, 0.1, Math.PI - 0.1);
            ctx.stroke();
        } else if (kind === "happy") {
            ctx.beginPath();
            ctx.arc(-6, y, 4, Math.PI * 0.1, Math.PI * 0.9);
            ctx.arc(6, y, 4, Math.PI * 0.1, Math.PI * 0.9);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, y + 7, 4, 0.15, Math.PI - 0.15);
            ctx.stroke();
        } else {
            ctx.fillStyle = white;
            ellipse(ctx, -7, y, 4.2, 4.8, true);
            ellipse(ctx, 7, y, 4.2, 4.8, true);
            ctx.fillStyle = ink;
            var px = kind === "wild" ? 1.5 : 0;
            ellipse(ctx, -7 + px, y + 0.6, 1.9, 2.4, true);
            ellipse(ctx, 7 + px, y + 0.6, 1.9, 2.4, true);
            ctx.strokeStyle = ink;
            ctx.beginPath();
            if (kind === "grin" || kind === "goofy") {
                ctx.arc(0, y + 7, 5, 0.15, Math.PI - 0.15);
            } else if (kind === "determined" || kind === "stern") {
                ctx.moveTo(-6, y + 8); ctx.lineTo(6, y + 8);
            } else if (kind === "kind") {
                ctx.arc(0, y + 7, 3.5, 0.1, Math.PI - 0.1);
            } else {
                ctx.arc(0, y + 7, 3, 0.1, Math.PI - 0.1);
            }
            ctx.stroke();
            if (kind === "determined" || kind === "stern" || kind === "wild") {
                ctx.beginPath();
                ctx.moveTo(-12, y - 8);
                ctx.lineTo(-4, y - 6);
                ctx.moveTo(12, y - 8);
                ctx.lineTo(4, y - 6);
                ctx.stroke();
            }
            if (kind === "goofy") {
                ctx.fillStyle = "rgba(255,120,140,0.9)";
                ellipse(ctx, 1, y + 11, 2.2, 3, true);
            }
        }
        ctx.restore();
    }

    function legs(ctx, art, moving, time, scale, side) {
        var swing = moving ? Math.sin(time * 12) * 4 : 0;
        ctx.strokeStyle = shade(art.accent, -30);
        ctx.lineWidth = 3.2 * scale;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-7 * scale, -8 * scale);
        ctx.lineTo(-9 * scale + swing, 0);
        ctx.moveTo(7 * scale, -8 * scale);
        ctx.lineTo(9 * scale - swing, 0);
        ctx.stroke();
        ctx.fillStyle = "#1a0e18";
        ellipse(ctx, -9 * scale + swing, 0, 2.6 * scale, 1.6 * scale, true);
        ellipse(ctx, 9 * scale - swing, 0, 2.6 * scale, 1.6 * scale, true);
    }

    function arms(ctx, art, time, side, attack) {
        var lift = attack ? -5 : Math.sin(time * 5) * 1.5;
        ctx.strokeStyle = shade(art.accent, -20);
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-17, -32);
        ctx.lineTo(-24, -26 + lift);
        ctx.moveTo(17, -32);
        ctx.lineTo(24, -26 + lift);
        ctx.stroke();
        ctx.fillStyle = art.accent;
        ellipse(ctx, -24, -26 + lift, 2.2, 2.2, true);
        ellipse(ctx, 24, -26 + lift, 2.2, 2.2, true);
    }

    function garnish(ctx, kind, art) {
        if (!kind || kind === "none") return;
        ctx.save();
        if (kind === "lime") {
            ctx.fillStyle = "#a6e34f";
            ctx.beginPath();
            ctx.arc(16, -55, 8, Math.PI * 0.9, Math.PI * 2.1);
            ctx.lineTo(16, -55);
            ctx.fill();
            ctx.strokeStyle = "#e9ffbd";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(16, -55);
            ctx.lineTo(16, -63);
            ctx.stroke();
        } else if (kind === "orange") {
            ctx.fillStyle = "#f4a63a";
            ellipse(ctx, 17, -58, 9, 9, true);
            ctx.fillStyle = "#ffd28a";
            ellipse(ctx, 17, -58, 5, 5, true);
        } else if (kind === "grape") {
            ctx.fillStyle = "#7a2b5a";
            ellipse(ctx, 17, -58, 4, 4, true);
            ellipse(ctx, 22, -54, 4, 4, true);
            ellipse(ctx, 13, -53, 4, 4, true);
        } else if (kind === "coffee") {
            ctx.fillStyle = "#7a4a2a";
            ellipse(ctx, 16, -58, 3.5, 5, true);
            ellipse(ctx, 21, -55, 3, 4, true);
        } else if (kind === "bubbles") {
            ctx.strokeStyle = "rgba(255,255,255,0.65)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(14, -58, 2.5, 0, Math.PI * 2);
            ctx.moveTo(22, -64);
            ctx.arc(20, -64, 1.6, 0, Math.PI * 2);
            ctx.moveTo(17, -48);
            ctx.arc(17, -48, 1.4, 0, Math.PI * 2);
            ctx.stroke();
        } else if (kind === "foam") {
            ctx.fillStyle = "#fff4d4";
            ellipse(ctx, 0, -62, 17, 6, true);
            ellipse(ctx, -10, -62, 7, 5, true);
            ellipse(ctx, 9, -63, 8, 5, true);
        } else if (kind === "cork") {
            ctx.fillStyle = "#d9b37a";
            roundRect(ctx, -5, -78, 10, 12, 3);
            ctx.fill();
            ctx.fillStyle = "#b58b51";
            ctx.fillRect(-5, -72, 10, 2);
        } else if (kind === "petal") {
            ctx.fillStyle = art.accent;
            ellipse(ctx, 16, -56, 5, 8, true);
            ctx.fillStyle = rgba("#ffffff", 0.32);
            ellipse(ctx, 15, -58, 2, 4, true);
        } else if (kind === "ice") {
            ctx.fillStyle = "rgba(210,248,255,0.9)";
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 1;
            roundRect(ctx, -20, -32, 10, 8, 2); ctx.fill(); ctx.stroke();
            roundRect(ctx, 9, -28, 12, 9, 2); ctx.fill(); ctx.stroke();
            roundRect(ctx, -4, -20, 9, 7, 2); ctx.fill(); ctx.stroke();
        } else if (kind === "parasol") {
            ctx.strokeStyle = "#e8c07d";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(16, -56);
            ctx.lineTo(16, -82);
            ctx.stroke();
            ctx.fillStyle = art.accent;
            ctx.beginPath();
            ctx.arc(16, -82, 14, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = rgba("#ff5e9a", 0.55);
            ctx.beginPath();
            ctx.moveTo(16, -82);
            ctx.arc(16, -82, 14, Math.PI * 0.7, Math.PI * 0.95);
            ctx.lineTo(16, -82);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawSplashArt(ctx, art) {
        ctx.fillStyle = rgba(art.liquid, 0.9);
        ellipse(ctx, 0, -8, 30, 10, true);
        ctx.fillStyle = rgba(art.accent, 0.9);
        for (var i = 0; i < 7; i++) {
            var a = (i / 7) * Math.PI * 2;
            ellipse(ctx, Math.cos(a) * (20 + i * 2), -8 + Math.sin(a) * 7, 2.5, 2.5, true);
        }
        ctx.strokeStyle = rgba("#ffffff", 0.4);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -8, 24, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawDrink(ctx, art, shape, x, y, scale, opts) {
        opts = opts || {};
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        var moving = !!opts.moving;
        var attack = !!opts.attack;
        var lunge = attack ? 4 : 0;
        if (!opts.building) {
            legs(ctx, art, moving, opts.time || 0, 1, opts.side);
            arms(ctx, art, opts.time || 0, opts.side, attack);
        }

        ctx.save();
        ctx.translate(lunge, 0);
        var glass = art.glass || "#d8f3ff";
        var liquid = art.liquid || "#8be0c8";
        var accent = art.accent || "#ffffff";

        if (shape === "highball") {
            roundRect(ctx, -15, -60, 30, 50, 6);
            ctx.fillStyle = rgba(glass, 0.24); ctx.fill();
            ctx.strokeStyle = rgba(glass, 0.9); ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = liquid;
            roundRect(ctx, -11, -44, 22, 30, 4); ctx.fill();
            ctx.fillStyle = rgba("#ffffff", 0.25);
            ctx.fillRect(-10, -42, 3, 25);
            ctx.strokeStyle = accent; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(8, -62); ctx.lineTo(15, -42); ctx.stroke();
            garnish(ctx, art.garnish, art);
            face(ctx, art.face, -34, liquid);
        } else if (shape === "flute") {
            roundRect(ctx, -9, -62, 18, 44, 6);
            ctx.fillStyle = rgba(glass, 0.2); ctx.fill();
            ctx.strokeStyle = rgba(glass, 0.85); ctx.lineWidth = 1.6; ctx.stroke();
            ctx.fillStyle = liquid;
            roundRect(ctx, -6, -50, 12, 28, 3); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.35)";
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(-4, -46); ctx.lineTo(-4, -20); ctx.stroke();
            ctx.strokeStyle = rgba(glass, 0.8);
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -5); ctx.moveTo(-8, -5); ctx.lineTo(8, -5); ctx.stroke();
            garnish(ctx, art.garnish, art);
            face(ctx, art.face, -36, liquid);
        } else if (shape === "martini") {
            ctx.beginPath();
            ctx.moveTo(-26, -58); ctx.lineTo(26, -58); ctx.lineTo(0, -26); ctx.closePath();
            ctx.fillStyle = rgba(glass, 0.2); ctx.fill();
            ctx.strokeStyle = rgba(glass, 0.9); ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-19, -52); ctx.lineTo(19, -52); ctx.lineTo(0, -31); ctx.closePath();
            ctx.fillStyle = liquid; ctx.fill();
            ctx.strokeStyle = rgba(glass, 0.9);
            ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -5); ctx.moveTo(-10, -5); ctx.lineTo(10, -5); ctx.stroke();
            garnish(ctx, art.garnish, art);
            face(ctx, art.face, -44, liquid);
        } else if (shape === "rocks") {
            roundRect(ctx, -19, -40, 38, 32, 5);
            ctx.fillStyle = rgba(glass, 0.2); ctx.fill();
            ctx.strokeStyle = rgba(glass, 0.9); ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = liquid;
            roundRect(ctx, -15, -28, 30, 16, 3); ctx.fill();
            ctx.fillStyle = rgba("#ffffff", 0.25);
            ctx.fillRect(-14, -27, 3, 14);
            garnish(ctx, art.garnish, art);
            face(ctx, art.face, -24, liquid);
        } else if (shape === "wine" || shape === "copa") {
            if (shape === "copa") {
                ctx.beginPath();
                ctx.ellipse(0, -42, 23, 22, 0, Math.PI * 0.1, Math.PI * 1.9);
                ctx.fillStyle = rgba(glass, 0.2); ctx.fill();
                ctx.strokeStyle = rgba(glass, 0.9); ctx.lineWidth = 2; ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(0, -44, 20, 0.05, Math.PI - 0.05);
                ctx.fillStyle = rgba(glass, 0.2); ctx.fill();
                ctx.strokeStyle = rgba(glass, 0.9); ctx.lineWidth = 2; ctx.stroke();
            }
            ctx.fillStyle = liquid;
            ctx.beginPath();
            ctx.arc(0, -42, 15, Math.PI * 0.18, Math.PI * 0.82);
            ctx.fill();
            ctx.strokeStyle = rgba(glass, 0.85);
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(0, -5); ctx.moveTo(-9, -5); ctx.lineTo(9, -5); ctx.stroke();
            garnish(ctx, art.garnish, art);
            face(ctx, art.face, -42, liquid);
        } else if (shape === "pint") {
            ctx.beginPath();
            ctx.moveTo(-18, -64); ctx.lineTo(18, -64); ctx.lineTo(14, -8); ctx.lineTo(-14, -8); ctx.closePath();
            ctx.fillStyle = rgba(glass, 0.18); ctx.fill();
            ctx.strokeStyle = rgba(glass, 0.9); ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = liquid;
            ctx.beginPath();
            ctx.moveTo(-15, -50); ctx.lineTo(15, -50); ctx.lineTo(12, -11); ctx.lineTo(-12, -11); ctx.closePath(); ctx.fill();
            ctx.fillStyle = rgba("#ffffff", 0.2);
            ctx.fillRect(-13, -48, 3, 32);
            garnish(ctx, art.garnish, art);
            face(ctx, art.face, -33, liquid);
        } else if (shape === "bottle" || shape === "champagne") {
            ctx.fillStyle = rgba(glass, 0.95);
            roundRect(ctx, -13, -56, 26, 50, 8); ctx.fill();
            roundRect(ctx, -6, -74, 12, 22, 3); ctx.fill();
            ctx.fillStyle = liquid;
            roundRect(ctx, -9, -42, 18, 30, 4); ctx.fill();
            ctx.fillStyle = rgba("#ffffff", 0.22);
            ctx.fillRect(-8, -40, 3, 26);
            if (shape === "champagne") {
                ctx.fillStyle = "#e8c07d";
                roundRect(ctx, -8, -76, 16, 10, 2); ctx.fill();
                ctx.fillStyle = "#2b1420";
                ctx.fillRect(-5, -50, 10, 8);
            } else {
                ctx.fillStyle = "#d9b37a";
                roundRect(ctx, -5, -78, 10, 8, 2); ctx.fill();
            }
            garnish(ctx, art.garnish, art);
            face(ctx, art.face, -30, liquid);
        } else if (shape === "barrel") {
            roundRect(ctx, -28, -44, 56, 38, 12);
            ctx.fillStyle = rgba(glass, 0.98); ctx.fill();
            ctx.strokeStyle = shade(glass, -30); ctx.lineWidth = 2; ctx.stroke();
            ctx.strokeStyle = "rgba(232,192,125,0.75)"; ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-24, -36); ctx.lineTo(-24, -14);
            ctx.moveTo(0, -44); ctx.lineTo(0, -6);
            ctx.moveTo(24, -36); ctx.lineTo(24, -14);
            ctx.stroke();
            ctx.fillStyle = liquid;
            roundRect(ctx, -21, -28, 42, 13, 4); ctx.fill();
            garnish(ctx, art.garnish, art);
            face(ctx, art.face, -24, liquid);
        } else if (shape === "bucket") {
            ctx.beginPath();
            ctx.moveTo(-24, -44); ctx.lineTo(24, -44); ctx.lineTo(17, -8); ctx.lineTo(-17, -8); ctx.closePath();
            ctx.fillStyle = rgba(glass, 0.25); ctx.fill();
            ctx.strokeStyle = rgba(glass, 0.9); ctx.lineWidth = 2.2; ctx.stroke();
            ctx.fillStyle = liquid;
            ctx.beginPath();
            ctx.moveTo(-21, -36); ctx.lineTo(21, -36); ctx.lineTo(15, -12); ctx.lineTo(-15, -12); ctx.closePath(); ctx.fill();
            garnish(ctx, art.garnish, art);
            face(ctx, art.face, -26, liquid);
        } else if (shape === "shot") {
            ctx.beginPath();
            ctx.moveTo(-10, -30); ctx.lineTo(10, -30); ctx.lineTo(7, -8); ctx.lineTo(-7, -8); ctx.closePath();
            ctx.fillStyle = rgba(glass, 0.28); ctx.fill();
            ctx.strokeStyle = rgba(glass, 0.9); ctx.lineWidth = 1.8; ctx.stroke();
            ctx.fillStyle = liquid;
            ctx.beginPath();
            ctx.moveTo(-8, -24); ctx.lineTo(8, -24); ctx.lineTo(6, -11); ctx.lineTo(-6, -11); ctx.closePath(); ctx.fill();
            garnish(ctx, art.garnish, art);
            face(ctx, art.face, -19, liquid);
        } else if (shape === "parasol") {
            ctx.strokeStyle = "#e8c07d";
            ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.moveTo(0, -80); ctx.lineTo(0, -18); ctx.stroke();
            ctx.fillStyle = rgba(glass, 0.9);
            ctx.beginPath();
            ctx.arc(0, -54, 30, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = liquid;
            ctx.beginPath();
            ctx.moveTo(0, -54);
            ctx.arc(0, -54, 30, Math.PI * 0.65, Math.PI);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = art.accent;
            ctx.beginPath();
            ctx.moveTo(0, -54);
            ctx.arc(0, -54, 30, Math.PI * 1.15, Math.PI * 1.5);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = rgba(glass, 0.25);
            roundRect(ctx, -9, -18, 18, 12, 4); ctx.fill();
            face(ctx, art.face, -58, liquid);
        } else if (shape === "hurricane") {
            ctx.beginPath();
            ctx.moveTo(-12, -60); ctx.lineTo(12, -60); ctx.quadraticCurveTo(20, -34, 10, -10);
            ctx.lineTo(-10, -10); ctx.quadraticCurveTo(-20, -34, -12, -60); ctx.closePath();
            ctx.fillStyle = rgba(glass, 0.2); ctx.fill();
            ctx.strokeStyle = rgba(glass, 0.9); ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = liquid;
            ctx.beginPath();
            ctx.moveTo(-10, -46); ctx.lineTo(10, -46); ctx.quadraticCurveTo(15, -27, 8, -15);
            ctx.lineTo(-8, -15); ctx.quadraticCurveTo(-15, -27, -10, -46); ctx.closePath(); ctx.fill();
            garnish(ctx, art.garnish, art);
            face(ctx, art.face, -33, liquid);
        } else if (shape === "sunrise") {
            ctx.fillStyle = liquid;
            roundRect(ctx, -14, -52, 28, 42, 5); ctx.fill();
            ctx.fillStyle = art.accent;
            roundRect(ctx, -14, -52, 28, 14, 5); ctx.fill();
            ctx.fillStyle = rgba("#ffffff", 0.28);
            ctx.fillRect(-11, -36, 3, 23);
            face(ctx, "none", -30, liquid);
            garnish(ctx, art.garnish, art);
        } else if (shape === "splash") {
            drawSplashArt(ctx, art);
        } else {
            roundRect(ctx, -15, -48, 30, 38, 6);
            ctx.fillStyle = rgba(glass, 0.3); ctx.fill();
            ctx.strokeStyle = rgba(glass, 0.9); ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = liquid;
            roundRect(ctx, -11, -36, 22, 22, 4); ctx.fill();
            face(ctx, art.face, -25, liquid);
        }
        ctx.restore();
        ctx.restore();
    }

    /* ---------- towers ---------- */

    function healthBar(ctx, x, y, w, ratio, color) {
        var h = 6;
        roundRect(ctx, x - w / 2, y, w, h, 3);
        ctx.fillStyle = "rgba(8,4,10,0.82)";
        ctx.fill();
        roundRect(ctx, x - w / 2 + 1, y + 1, Math.max(0, (w - 2) * U.clamp(ratio, 0, 1)), h - 2, 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "rgba(232,192,125,0.35)";
        ctx.lineWidth = 1;
        roundRect(ctx, x - w / 2, y, w, h, 3);
        ctx.stroke();
    }

    function drawTowerBase(ctx, t, time) {
        var col = teamColor(t.side);
        var pulse = 0.5 + Math.sin(time * 2.2 + t.x) * 0.1;
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.38)";
        ellipse(ctx, t.x, t.y + t.radius * 0.62, t.radius * 1.2, t.radius * 0.42, true);
        var grad = ctx.createRadialGradient(t.x, t.y, 6, t.x, t.y, t.radius * 1.25);
        grad.addColorStop(0, rgba(col, 0.12));
        grad.addColorStop(0.7, "rgba(32,18,32,0.9)");
        grad.addColorStop(1, "rgba(10,6,12,0.95)");
        ctx.fillStyle = grad;
        ellipse(ctx, t.x, t.y, t.radius * 1.18, t.radius * 0.72, true);
        ctx.strokeStyle = rgba(col, pulse);
        ctx.lineWidth = 2.5;
        ellipse(ctx, t.x, t.y, t.radius * 1.12, t.radius * 0.67);
        ctx.stroke();
        ctx.strokeStyle = rgba(GOLD, 0.35);
        ctx.lineWidth = 1.2;
        ellipse(ctx, t.x, t.y, t.radius * 0.92, t.radius * 0.5);
        ctx.stroke();
        ctx.restore();
    }

    function drawTapTower(ctx, t, time) {
        var col = teamColor(t.side);
        var recoil = t.attackAnimUntil > time ? 4 : 0;
        ctx.save();
        ctx.translate(t.x, t.y - 10 + recoil * (t.side === "player" ? 1 : -1));
        /* keg */
        var metal = ctx.createLinearGradient(-34, 0, 34, 0);
        metal.addColorStop(0, "#4a3542");
        metal.addColorStop(0.35, "#b8a6a0");
        metal.addColorStop(0.6, "#6b5060");
        metal.addColorStop(1, "#2d1e2b");
        roundRect(ctx, -33, -40, 66, 58, 12);
        ctx.fillStyle = metal;
        ctx.fill();
        ctx.strokeStyle = rgba(GOLD, 0.55);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(18,10,18,0.72)";
        ctx.fillRect(-33, -18, 66, 7);
        ctx.fillRect(-33, 2, 66, 5);
        ctx.fillStyle = rgba(col, 0.75);
        roundRect(ctx, -21, -9, 42, 9, 4);
        ctx.fill();
        /* tap handle */
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(0, -58);
        ctx.stroke();
        ctx.fillStyle = GOLD;
        roundRect(ctx, -12, -68, 24, 10, 4);
        ctx.fill();
        ctx.fillStyle = col;
        roundRect(ctx, -7, -65, 14, 4, 2);
        ctx.fill();
        /* spout */
        ctx.strokeStyle = "#c8b6b0";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(t.side === "player" ? -26 : 26, -24);
        ctx.quadraticCurveTo(t.side === "player" ? -40 : 40, -24, t.side === "player" ? -40 : 40, -12);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(-30, -36, 6, 42);
        ctx.restore();
    }

    function drawCellarTower(ctx, t, time) {
        var col = teamColor(t.side);
        var active = t.active ? 1 : 0.45;
        var recoil = t.attackAnimUntil > time ? 5 : 0;
        ctx.save();
        ctx.translate(t.x, t.y - 6 + recoil * (t.side === "player" ? 1 : -1));
        ctx.globalAlpha = active;
        /* barrel */
        var wood = ctx.createLinearGradient(-52, 0, 52, 0);
        wood.addColorStop(0, "#2b1718");
        wood.addColorStop(0.25, "#7a4a33");
        wood.addColorStop(0.55, "#9a633f");
        wood.addColorStop(1, "#3a1f1d");
        roundRect(ctx, -54, -52, 108, 74, 20);
        ctx.fillStyle = wood;
        ctx.fill();
        ctx.strokeStyle = rgba(GOLD, 0.55);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = "rgba(232,192,125,0.6)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-40, -52); ctx.lineTo(-40, 22);
        ctx.moveTo(0, -52); ctx.lineTo(0, 22);
        ctx.moveTo(40, -52); ctx.lineTo(40, 22);
        ctx.stroke();
        /* arched door */
        ctx.fillStyle = "rgba(20,8,16,0.88)";
        ctx.beginPath();
        ctx.moveTo(-24, 20); ctx.lineTo(-24, -10);
        ctx.arc(0, -10, 24, Math.PI, 0);
        ctx.lineTo(24, 20); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba(GOLD, 0.4);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        /* cork cannon */
        ctx.strokeStyle = "#c8b6b0";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(0, -52);
        ctx.lineTo(0, -72);
        ctx.stroke();
        ctx.fillStyle = col;
        roundRect(ctx, -16, -84, 32, 13, 5);
        ctx.fill();
        ctx.fillStyle = "#d9b37a";
        roundRect(ctx, -10, -94, 20, 11, 4);
        ctx.fill();
        /* crown */
        ctx.fillStyle = rgba(GOLD, 0.9);
        ctx.beginPath();
        ctx.moveTo(-12, -28); ctx.lineTo(-12, -38); ctx.lineTo(-5, -31); ctx.lineTo(0, -40);
        ctx.lineTo(5, -31); ctx.lineTo(12, -38); ctx.lineTo(12, -28); ctx.closePath();
        ctx.fill();
        ctx.restore();
        if (!t.active) {
            ctx.save();
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = "rgba(200,200,220,0.5)";
            ctx.font = "600 11px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("DORMANT", t.x, t.y - 98);
            ctx.restore();
        }
    }

    function drawTower(ctx, t, time) {
        if (!t.alive) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ellipse(ctx, t.x, t.y + 8, t.radius * 1.1, t.radius * 0.4, true);
            ctx.fillStyle = t.towerType === "cellar" ? "#3a201d" : "#42303c";
            for (var i = 0; i < 5; i++) {
                var a = (i / 5) * Math.PI * 2;
                roundRect(ctx, t.x + Math.cos(a) * 18 - 8, t.y + Math.sin(a) * 9, 16, 8, 2);
                ctx.fill();
            }
            ctx.fillStyle = "rgba(232,192,125,0.18)";
            ctx.font = "600 12px Georgia, serif";
            ctx.textAlign = "center";
            ctx.fillText("CLOSED", t.x, t.y - 10);
            ctx.restore();
            return;
        }
        drawTowerBase(ctx, t, time);
        if (t.towerType === "cellar") drawCellarTower(ctx, t, time);
        else drawTapTower(ctx, t, time);
        healthBar(ctx, t.x, t.y - (t.towerType === "cellar" ? 116 : 92),
            t.towerType === "cellar" ? 100 : 76,
            t.hp / t.maxHp, t.hp / t.maxHp > 0.35 ? teamColor(t.side) : "#ffb24d");
        if (t.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.5, t.hitFlash * 2);
            ctx.fillStyle = "#ffffff";
            ellipse(ctx, t.x, t.y, t.radius * 1.1, t.radius * 0.8, true);
            ctx.restore();
        }
    }

    /* ---------- units ---------- */

    function drawUnit(ctx, e, time) {
        if (!e.alive && e.deathAt) return;
        var col = teamColor(e.side);
        var flying = e.flying;
        var baseY = e.y + (flying ? -22 : 0);
        var bob = (!e.flying && e.kind !== "building") ? Math.sin(time * 5 + e.id * 0.7) * 1.6 : 0;
        if (e.kind === "building") bob = 0;
        var attack = e.attackAnimUntil > time;
        var moving = e.moving && !attack;

        ctx.save();
        if (flying) {
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = "#000";
            ellipse(ctx, e.x, e.y + 8, e.radius * 0.9, e.radius * 0.3, true);
            ctx.globalAlpha = 1;
            /* little altitude puffs */
            ctx.fillStyle = rgba(col, 0.18);
            ellipse(ctx, e.x - 8, e.y - 4, 4, 2, true);
            ellipse(ctx, e.x + 9, e.y + 2, 3, 1.5, true);
        } else {
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ellipse(ctx, e.x, e.y + e.radius * 0.55, e.radius * 1.05, e.radius * 0.34, true);
        }

        /* team ownership ring */
        ctx.strokeStyle = rgba(col, e.side === "player" ? 0.55 : 0.5);
        ctx.lineWidth = 2;
        ellipse(ctx, e.x, e.y + (flying ? 8 : e.radius * 0.5), e.radius * 1.05, e.radius * 0.38);
        ctx.stroke();

        if (e.deployTimer > 0) {
            var progress = 1 - e.deployTimer / (e.deployTotal || C.DEPLOY_TIME);
            ctx.strokeStyle = rgba(col, 0.8);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(e.x, e.y + (flying ? 8 : e.radius * 0.5), e.radius * 1.25,
                -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.stroke();
            ctx.globalAlpha = 0.25 + progress * 0.65;
        }

        if (e.charged) {
            ctx.strokeStyle = rgba(GOLD, 0.65);
            ctx.lineWidth = 2;
            ellipse(ctx, e.x, e.y + (flying ? 8 : e.radius * 0.5), e.radius * 1.25, e.radius * 0.48);
            ctx.stroke();
        }

        var scale = Math.max(0.8, e.radius / 15);
        if (e.kind === "building") scale = Math.max(1.0, e.radius / 22);
        drawDrink(ctx, e.art, e.art.shape, e.x, baseY + bob, scale, {
            building: e.kind === "building",
            moving: moving,
            attack: attack,
            time: time,
            side: e.side
        });

        if (e.hitFlash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.45, e.hitFlash * 2.4);
            ctx.fillStyle = "#ffffff";
            ellipse(ctx, e.x, baseY - 28 * scale, e.radius * 1.2, e.radius * 1.45, true);
            ctx.restore();
        }
        if (e.freezeUntil > time) {
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = "rgba(160,236,255,0.75)";
            ellipse(ctx, e.x, baseY - 24 * scale, e.radius * 1.1, e.radius * 1.3, true);
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = "#d9fbff";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(e.x - e.radius, baseY - 4); ctx.lineTo(e.x - 4, baseY - 24); ctx.lineTo(e.x + 6, baseY);
            ctx.moveTo(e.x + e.radius, baseY - 32); ctx.lineTo(e.x + 4, baseY - 18);
            ctx.stroke();
            ctx.restore();
        } else if (e.slowUntil > time) {
            ctx.strokeStyle = "rgba(150,220,255,0.45)";
            ctx.lineWidth = 1.5;
            ellipse(ctx, e.x, baseY - 20 * scale, e.radius * 1.3, e.radius * 1.5);
            ctx.stroke();
        }

        if (e.heal) {
            ctx.strokeStyle = "rgba(157,255,196,0.28)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(e.x, baseY - 18 * scale, e.radius * 1.6, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (e.auraSlow) {
            ctx.fillStyle = "rgba(160,230,255,0.045)";
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.auraRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(160,230,255,0.15)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        if (e.hp < e.maxHp) {
            var top = baseY - (e.kind === "building" ? 58 : 76) * scale;
            var w = Math.max(26, e.radius * 2.2);
            healthBar(ctx, e.x, top, w, e.hp / e.maxHp, e.side === "player" ? PLAYER : ENEMY);
        }
        ctx.restore();
    }

    /* ---------- projectiles + particles ---------- */

    function drawProjectiles(ctx, state, time) {
        state.projectiles.forEach(function (p) {
            if (!p.alive) return;
            ctx.save();
            var col = p.color || "#ffd166";
            ctx.shadowColor = col;
            ctx.shadowBlur = p.towerShot ? 14 : 8;
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.towerShot ? 5 : 3.5, 0, Math.PI * 2);
            ctx.fill();
            if (p.towerShot) {
                ctx.strokeStyle = rgba(p.accent || "#ffffff", 0.5);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        });
    }

    function updateEffects(dt) {
        var i;
        for (i = R.particles.length - 1; i >= 0; i--) {
            var p = R.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                R.particles.splice(i, 1);
                continue;
            }
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        }
        for (i = R.rings.length - 1; i >= 0; i--) {
            var r = R.rings[i];
            r.life -= dt;
            if (r.life <= 0) {
                R.rings.splice(i, 1);
                continue;
            }
            r.r = U.lerp(8, r.maxR, 1 - r.life / r.maxLife);
        }
        for (i = R.floaters.length - 1; i >= 0; i--) {
            var f = R.floaters[i];
            f.life -= dt;
            f.y -= 34 * dt;
            if (f.life <= 0) R.floaters.splice(i, 1);
        }
        R.shake = Math.max(0, R.shake - dt * 55);
        R.flash = Math.max(0, R.flash - dt * 2.4);
    }

    function drawEffects(ctx) {
        R.rings.forEach(function (r) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.8;
            ctx.strokeStyle = r.color;
            ctx.lineWidth = r.width;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });
        R.particles.forEach(function (p) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            if (p.shape === "drop") {
                ellipse(ctx, p.x, p.y, p.size * 0.7, p.size * 1.3, true);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
        R.floaters.forEach(function (f) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
            ctx.fillStyle = f.color;
            ctx.font = "700 " + f.size + "px Georgia, serif";
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(0,0,0,0.7)";
            ctx.shadowBlur = 5;
            ctx.fillText(f.text, f.x, f.y);
            ctx.restore();
        });
    }

    /* ---------- deploy zones + preview ---------- */

    function drawZones(ctx, state, opts) {
        if (!opts.showDeployZone) return;
        var zones = LC.Sim.getDeployZones(state, "player");
        ctx.save();
        ctx.fillStyle = "rgba(94,242,214,0.055)";
        ctx.strokeStyle = "rgba(94,242,214,0.35)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        zones.forEach(function (r) {
            ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.strokeRect(r.x, r.y, r.w, r.h);
        });
        ctx.restore();
    }

    function drawPreview(ctx, state, opts, time) {
        var p = opts.preview;
        if (!p) return;
        var card = CARDS[p.cardId];
        if (!card) return;
        var col = p.valid ? PLAYER : "#ff5964";
        if (card.type === "spell") {
            ctx.save();
            var radius = card.s.radius || 140;
            var grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, radius);
            grad.addColorStop(0, rgba(card.art.liquid, 0.28));
            grad.addColorStop(0.7, rgba(card.art.liquid, 0.12));
            grad.addColorStop(1, rgba(card.art.liquid, 0.02));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = rgba(col, 0.8);
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 0.55;
            drawDrink(ctx, card.art, card.art.shape, p.x, p.y + 24, 1.2, { time: time });
            ctx.restore();
        } else {
            ctx.save();
            ctx.globalAlpha = 0.55;
            drawDrink(ctx, card.art, card.art.shape, p.x, p.y + 8, Math.max(0.9, (card.s.radius || 18) / 15), {
                building: card.type === "building",
                time: time,
                side: "player"
            });
            ctx.globalAlpha = 1;
            ctx.strokeStyle = rgba(col, 0.9);
            ctx.lineWidth = 2.5;
            ellipse(ctx, p.x, p.y + 8, (card.s.radius || 18) * 1.25, (card.s.radius || 18) * 0.45);
            ctx.stroke();
            if (card.s.range && card.type !== "building") {
                ctx.strokeStyle = "rgba(255,255,255,0.16)";
                ctx.lineWidth = 1;
                ctx.setLineDash([6, 8]);
                ctx.beginPath();
                ctx.arc(p.x, p.y + 8, card.s.range, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
        }
    }

    /* ---------- main draw ---------- */

    R.draw = function (state, opts) {
        opts = opts || {};
        if (!R.ctx) return;
        var ctx = R.ctx;
        var now = state ? state.clock : 0;
        var dt = opts.dt || 0.016;
        R.ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
        ctx.clearRect(0, 0, C.W, C.H);
        if (R.backdrop) ctx.drawImage(R.backdrop, 0, 0, C.W, C.H);

        /* animated river highlights */
        if (state) {
            ctx.save();
            for (var i = 0; i < 9; i++) {
                var x = 40 + ((i * 137 + now * 22) % (C.W - 80));
                var y = C.RIVER.y + Math.sin(now * 1.8 + i) * 18;
                ctx.globalAlpha = 0.2 + Math.sin(now * 2 + i) * 0.08;
                ctx.fillStyle = i % 2 ? PLAYER : ENEMY;
                ellipse(ctx, x, y, 3 + (i % 3) * 2, 1.5, true);
            }
            ctx.restore();
        }

        ctx.save();
        if (R.shake > 0) {
            var sx = Math.sin(now * 91) * R.shake * 0.4;
            var sy = Math.cos(now * 73) * R.shake * 0.32;
            ctx.translate(sx, sy);
        }

        if (state) {
            drawZones(ctx, state, opts);

            /* entities in y order so closer drinks overlap farther ones */
            var drawables = [];
            state.towers.forEach(function (t) { drawables.push(t); });
            state.units.forEach(function (u) { if (u.alive) drawables.push(u); });
            state.buildings.forEach(function (b) { if (b.alive) drawables.push(b); });
            drawables.sort(function (a, b) { return a.y - b.y; });
            drawables.forEach(function (e) {
                if (e.kind === "tower") drawTower(ctx, e, now);
                else drawUnit(ctx, e, now);
            });

            drawProjectiles(ctx, state, now);
            drawEffects(ctx);
            drawPreview(ctx, state, opts, now);
        } else {
            drawEffects(ctx);
        }
        ctx.restore();

        if (R.flash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.3, R.flash * 0.35);
            ctx.fillStyle = "#fff4d6";
            ctx.fillRect(0, 0, C.W, C.H);
            ctx.restore();
        }

        updateEffects(dt);
    };

    /* ---------- portraits ---------- */

    R.makePortrait = function (cardId, size) {
        size = size || 96;
        var key = cardId + "@" + size;
        if (R.portraitCache[key]) return R.portraitCache[key];
        var card = CARDS[cardId];
        if (!card) return "";
        var px = size * 2;
        var cv = document.createElement("canvas");
        cv.width = px;
        cv.height = px;
        var ctx = cv.getContext("2d");
        var art = card.art;
        var bg = ctx.createLinearGradient(0, 0, px, px);
        bg.addColorStop(0, shade(art.liquid, -78));
        bg.addColorStop(0.55, "#1a0f20");
        bg.addColorStop(1, shade(art.accent, -92));
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, px, px);

        var glow = ctx.createRadialGradient(px * 0.5, px * 0.45, 2, px * 0.5, px * 0.5, px * 0.55);
        glow.addColorStop(0, rgba(art.liquid, 0.35));
        glow.addColorStop(1, rgba(art.liquid, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, px, px);

        ctx.strokeStyle = "rgba(232,192,125,0.16)";
        ctx.lineWidth = 2;
        ctx.strokeRect(6, 6, px - 12, px - 12);

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ellipse(ctx, px / 2, px * 0.84, px * 0.28, px * 0.06, true);

        var scale = px / 150;
        if (card.type === "spell") {
            ctx.save();
            ctx.translate(px / 2, px * 0.78);
            ctx.scale(scale * 1.5, scale * 1.5);
            drawSplashArt(ctx, art);
            garnish(ctx, art.garnish, art);
            ctx.restore();
        } else {
            drawDrink(ctx, art, art.shape, px / 2, px * 0.84, scale, {
                time: 0,
                building: card.type === "building",
                side: "player"
            });
        }
        var url = cv.toDataURL("image/png");
        R.portraitCache[key] = url;
        return url;
    };

    LC.Render = R;
})(window.LC = window.LC || {});