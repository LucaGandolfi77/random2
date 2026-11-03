/*
 * Canvas renderer. Every hull, rock, station and spark is drawn from numbers.
 * The camera leads the ship toward the aim point so the mouse never sits at
 * the edge of the screen, and the HUD lives in the DOM where text belongs.
 */
(function (CB) {
    "use strict";

    var C = CB.CONFIG;
    var canvas = null, ctx = null;
    var W = 0, H = 0, DPR = 1;
    var stars = [];
    var dust = [];
    var quality = "high";
    var timeAcc = 0;
    var shakeX = 0, shakeY = 0;

    function rgba(hex, a) {
        var h = hex.replace("#", "");
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }

    function buildBackground() {
        stars.length = 0;
        dust.length = 0;
        var i;
        for (i = 0; i < 720; i++) {
            stars.push({
                x: Math.random(), y: Math.random(),
                depth: 0.08 + Math.random() * 0.42,
                size: 0.4 + Math.random() * 1.5,
                a: 0.25 + Math.random() * 0.6
            });
        }
        for (i = 0; i < 26; i++) {
            dust.push({
                x: Math.random(), y: Math.random(),
                r: 100 + Math.random() * 260,
                a: 0.012 + Math.random() * 0.03
            });
        }
    }

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext("2d", { alpha: false });
        buildBackground();
        resize();
        window.addEventListener("resize", resize);
    }

    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, quality === "low" ? 1 : 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = Math.floor(W * DPR);
        canvas.height = Math.floor(H * DPR);
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
    }

    function setQuality(q) {
        quality = q || "high";
        if (ctx) resize();
    }

    function sx(x, cam) { return (x - cam.x) * cam.zoom + W / 2 + shakeX; }
    function sy(y, cam) { return (y - cam.y) * cam.zoom + H / 2 + shakeY; }

    function visible(x, y, r, cam) {
        var px = sx(x, cam), py = sy(y, cam);
        return px > -r - 80 && px < W + r + 80 && py > -r - 80 && py < H + r + 80;
    }

    function polygon(x, y, radius, sides, angle, wobble, seedOffset) {
        ctx.beginPath();
        for (var i = 0; i < sides; i++) {
            var a = angle + (i / sides) * C.TAU;
            var r = radius * (1 + Math.sin(i * 2.7 + seedOffset) * wobble);
            var px = x + Math.cos(a) * r;
            var py = y + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    function updateCamera(state, dt) {
        var p = state.player;
        var cam = state.camera;
        var targetX = p ? p.x : 0;
        var targetY = p ? p.y : 0;
        if (p && p.alive) {
            targetX += (p.aimX || 0) * 90;
            targetY += (p.aimY || 0) * 90;
        }
        cam.x += (targetX - cam.x) * Math.min(1, dt * 4.6);
        cam.y += (targetY - cam.y) * Math.min(1, dt * 4.6);
        cam.zoom = Math.min(W, H) < 620 ? 0.86 : 1;
        if (state.shake > 0.2) {
            shakeX = (Math.random() - 0.5) * state.shake;
            shakeY = (Math.random() - 0.5) * state.shake;
        } else {
            shakeX = 0; shakeY = 0;
        }
    }

    function drawBackground(state, cam) {
        var zone = state.player ? CB.Zones.zoneAt(state.player.x, state.player.y) : C.ZONE.drift;
        var t = state.time;

        ctx.fillStyle = "#050711";
        ctx.fillRect(0, 0, W, H);

        /* A soft wash in the local zone colour. */
        var grad = ctx.createRadialGradient(W * 0.5, H * 0.52, 0, W * 0.5, H * 0.52, Math.max(W, H) * 0.78);
        grad.addColorStop(0, rgba(zone.color, 0.10));
        grad.addColorStop(0.45, rgba(zone.color, 0.035));
        grad.addColorStop(1, "rgba(2,4,10,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        /* Distant dust clouds, parallaxed. */
        for (var d = 0; d < dust.length; d++) {
            var dd = dust[d];
            var dx = ((dd.x * W - cam.x * 0.08) % (W + dd.r * 2) + W + dd.r * 2) % (W + dd.r * 2) - dd.r;
            var dy = ((dd.y * H - cam.y * 0.08) % (H + dd.r * 2) + H + dd.r * 2) % (H + dd.r * 2) - dd.r;
            var g2 = ctx.createRadialGradient(dx, dy, 0, dx, dy, dd.r);
            g2.addColorStop(0, rgba(zone.color, dd.a));
            g2.addColorStop(1, rgba(zone.color, 0));
            ctx.fillStyle = g2;
            ctx.fillRect(dx - dd.r, dy - dd.r, dd.r * 2, dd.r * 2);
        }

        /* Three parallax layers of stars. */
        var count = quality === "low" ? 380 : stars.length;
        for (var i = 0; i < count; i++) {
            var st = stars[i];
            var px = ((st.x * W - cam.x * st.depth) % W + W) % W;
            var py = ((st.y * H - cam.y * st.depth) % H + H) % H;
            var tw = 0.72 + Math.sin(t * 1.6 + i) * 0.28;
            ctx.fillStyle = rgba(i % 11 === 0 ? zone.color : "#e2e8f0", st.a * tw);
            ctx.fillRect(px, py, st.size, st.size);
        }

        /* Zone rings. Concentric, glowing, readable at a glance. */
        var rings = [
            { r: C.DRIFT_RADIUS, color: "#86efac", a: 0.16 },
            { r: C.SCAB_RADIUS, color: "#fbbf24", a: 0.28 },
            { r: C.MAW_RADIUS, color: "#fb7185", a: 0.4 }
        ];
        ctx.save();
        ctx.setLineDash([18, 26]);
        ctx.lineDashOffset = -t * 14;
        for (var r = 0; r < rings.length; r++) {
            var ring = rings[r];
            var rr = ring.r * cam.zoom;
            var cx = sx(0, cam), cy = sy(0, cam);
            if (cx + rr < -40 || cx - rr > W + 40 || cy + rr < -40 || cy - rr > H + 40) continue;
            ctx.strokeStyle = rgba(ring.color, ring.a);
            ctx.lineWidth = r === 2 ? 3 : 2;
            ctx.beginPath();
            ctx.arc(cx, cy, rr, 0, C.TAU);
            ctx.stroke();
        }
        ctx.restore();

        /* Anchorage bubble. */
        var bx = sx(state.home ? state.home.x : C.HOME.x, cam);
        var by = sy(state.home ? state.home.y : C.HOME.y, cam);
        var br = C.SAFE_RADIUS * cam.zoom;
        if (bx + br > 0 && bx - br < W && by + br > 0 && by - br < H) {
            ctx.save();
            ctx.setLineDash([7, 18]);
            ctx.strokeStyle = rgba("#5eead4", 0.34);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(bx, by, br, 0, C.TAU);
            ctx.stroke();
            ctx.restore();
        }
    }

    function drawBlackHole(state, cam) {
        var x = sx(0, cam), y = sy(0, cam);
        if (x < -500 || x > W + 500 || y < -500 || y > H + 500) return;
        var radius = C.BLACK_HOLE.radius * cam.zoom;
        var t = state.time;

        var halo = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 4.6);
        halo.addColorStop(0, "rgba(251,113,133,0.30)");
        halo.addColorStop(0.28, "rgba(192,38,211,0.13)");
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, radius * 4.8, 0, C.TAU);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 0.16);
        for (var i = 0; i < 4; i++) {
            ctx.strokeStyle = rgba(i % 2 ? "#fb7185" : "#c084fc", 0.25 - i * 0.04);
            ctx.lineWidth = (4 - i * 0.6) * cam.zoom;
            ctx.beginPath();
            ctx.arc(0, 0, radius * (1.4 + i * 0.42), i * 0.8, i * 0.8 + 2.4);
            ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = "#01010a";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, C.TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(251,113,133,0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, C.TAU);
        ctx.stroke();

        ctx.fillStyle = "rgba(251,113,133,0.65)";
        ctx.font = "700 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("EVENT HORIZON", x, y + radius + 20);
    }

    function drawAsteroid(a, cam) {
        if (!visible(a.x, a.y, a.radius + 20, cam)) return;
        var x = sx(a.x, cam), y = sy(a.y, cam);
        var r = a.radius * cam.zoom;
        var ore = C.ORES[a.ore];

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a.rot);

        ctx.beginPath();
        for (var i = 0; i < a.verts.length; i++) {
            var v = a.verts[i];
            var px = Math.cos(v.a) * v.r * cam.zoom;
            var py = Math.sin(v.a) * v.r * cam.zoom;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        var g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        g.addColorStop(0, a.hitFlash > 0 ? "#f8fafc" : ore.rock);
        g.addColorStop(0.62, ore.rock);
        g.addColorStop(1, "#141a28");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = rgba(ore.color, a.rich ? 0.7 : 0.32);
        ctx.lineWidth = a.rich ? 1.6 : 1;
        ctx.stroke();

        /* Ore veins. */
        ctx.strokeStyle = rgba(ore.color, 0.55);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (var v2 = 0; v2 < 3; v2++) {
            var ang = v2 * 2.1 + a.id;
            ctx.moveTo(Math.cos(ang) * r * 0.15, Math.sin(ang) * r * 0.15);
            ctx.lineTo(Math.cos(ang + 0.6) * r * 0.58, Math.sin(ang + 0.6) * r * 0.58);
        }
        ctx.stroke();

        if (a.rich) {
            ctx.strokeStyle = rgba("#fde68a", 0.55 + Math.sin(stateTime() * 2 + a.id) * 0.15);
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, r + 4, 0, C.TAU);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();
    }

    var _state = null;
    function stateTime() { return _state ? _state.time : 0; }

    function drawPickup(p, cam) {
        if (!visible(p.x, p.y, p.core ? 60 : 18, cam)) return;
        var x = sx(p.x, cam), y = sy(p.y, cam);
        var t = stateTime();
        var bob = Math.sin(t * 3 + p.x * 0.02) * 2;
        if (p.core) {
            var pulse = 1 + Math.sin(t * 5) * 0.12;
            var g = ctx.createRadialGradient(x, y, 0, x, y, 48 * pulse);
            g.addColorStop(0, "rgba(253,230,138,0.8)");
            g.addColorStop(0.4, "rgba(251,191,36,0.28)");
            g.addColorStop(1, "rgba(251,191,36,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, 50 * pulse, 0, C.TAU); ctx.fill();
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(t * 0.7);
            ctx.fillStyle = "#fde68a";
            ctx.beginPath();
            ctx.moveTo(0, -13); ctx.lineTo(11, 0); ctx.lineTo(0, 13); ctx.lineTo(-11, 0);
            ctx.closePath(); ctx.fill();
            ctx.restore();
            ctx.fillStyle = "#fef9c3";
            ctx.font = "700 9px ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.fillText("CORE", x, y - 22);
            return;
        }
        ctx.save();
        ctx.translate(x, y + bob);
        ctx.rotate(t * 1.4 + p.x * 0.01);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    function drawRelay(relay, cam) {
        if (!visible(relay.x, relay.y, 120, cam)) return;
        var x = sx(relay.x, cam), y = sy(relay.y, cam);
        var color = relay.owner === "free" ? "#5eead4" : relay.owner === "corsair" ? "#fb7185" : "#94a3b8";
        var t = stateTime();
        ctx.save();
        ctx.translate(x, y);
        /* capture ring */
        ctx.strokeStyle = rgba(color, 0.22);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, relay.radius * cam.zoom, 0, C.TAU); ctx.stroke();
        if (Math.abs(relay.control) > 0.02) {
            ctx.strokeStyle = rgba(relay.control > 0 ? "#5eead4" : "#fb7185", 0.75);
            ctx.lineWidth = 4;
            var start = -Math.PI / 2;
            ctx.beginPath();
            ctx.arc(0, 0, relay.radius * cam.zoom - 5, start, start + C.TAU * Math.abs(relay.control));
            ctx.stroke();
        }
        ctx.rotate(t * 0.35);
        ctx.fillStyle = "rgba(10,15,26,0.9)";
        polygon(0, 0, 30, 6, 0, 0.06, 0);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.rotate(-t * 0.9);
        ctx.strokeStyle = rgba(color, 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 17, 0.4, 2.4); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 17, Math.PI + 0.4, Math.PI + 2.4); ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, C.TAU); ctx.fill();
        ctx.restore();
        ctx.fillStyle = rgba(color, 0.95);
        ctx.font = "700 9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("RELAY " + (relay.index + 1), x, y + 47);
    }

    function drawStation(station, cam) {
        if (!visible(station.x, station.y, station.radius + 160, cam)) return;
        var x = sx(station.x, cam), y = sy(station.y, cam);
        var scale = cam.zoom;
        var t = stateTime();
        var isNexus = station.kind === "nexus";
        var color = isNexus ? "#fb7185" : "#5eead4";

        if (!station.alive) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = "#475569";
            ctx.setLineDash([5, 10]);
            ctx.beginPath(); ctx.arc(x, y, station.radius * scale, 0, C.TAU); ctx.stroke();
            ctx.restore();
            return;
        }

        /* Approach ring. */
        ctx.save();
        ctx.setLineDash([8, 16]);
        ctx.lineDashOffset = t * 12;
        ctx.strokeStyle = rgba(color, 0.16);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, station.dockRadius * scale, 0, C.TAU); ctx.stroke();
        ctx.restore();

        /* Nexus shield. */
        if (isNexus && station.shield > 0) {
            var a = 0.14 + (station.shield / station.shieldMax) * 0.2 + (station.hitFlash > 0 ? 0.2 : 0);
            var g = ctx.createRadialGradient(x, y, station.radius * 0.8, x, y, station.radius * 2.4);
            g.addColorStop(0, "rgba(251,113,133,0)");
            g.addColorStop(0.75, rgba("#fb7185", a));
            g.addColorStop(1, "rgba(251,113,133,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, station.radius * 2.4, 0, C.TAU); ctx.fill();
            ctx.strokeStyle = rgba("#fb7185", 0.45);
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(x, y, station.radius * 1.9, 0, C.TAU); ctx.stroke();
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(isNexus ? -t * 0.12 : t * 0.18);

        if (isNexus) {
            /* A black sun with spikes. */
            ctx.fillStyle = "#180a12";
            polygon(0, 0, station.radius * scale, 9, 0, 0.22, 2);
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();
            for (var i = 0; i < 9; i++) {
                var ang = (i / 9) * C.TAU;
                ctx.strokeStyle = rgba(color, 0.75);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(ang) * station.radius * 0.7 * scale, Math.sin(ang) * station.radius * 0.7 * scale);
                ctx.lineTo(Math.cos(ang) * station.radius * 1.45 * scale, Math.sin(ang) * station.radius * 1.45 * scale);
                ctx.stroke();
            }
            ctx.fillStyle = rgba("#fb7185", 0.4 + Math.sin(t * 2.4) * 0.15);
            ctx.beginPath(); ctx.arc(0, 0, 20 * scale, 0, C.TAU); ctx.fill();
        } else {
            ctx.fillStyle = "#0a1720";
            ctx.beginPath(); ctx.arc(0, 0, station.radius * 0.48 * scale, 0, C.TAU); ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();
            for (var arm = 0; arm < 3; arm++) {
                ctx.save();
                ctx.rotate((arm / 3) * C.TAU);
                ctx.fillStyle = "rgba(15,32,44,0.95)";
                ctx.strokeStyle = rgba(color, 0.9);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.rect(station.radius * 0.32 * scale, -9 * scale, station.radius * 0.62 * scale, 18 * scale);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = rgba("#5eead4", 0.8);
                ctx.beginPath();
                ctx.arc(station.radius * 0.86 * scale, 0, 3 * scale, 0, C.TAU);
                ctx.fill();
                ctx.restore();
            }
            ctx.strokeStyle = rgba(color, 0.5);
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, station.radius * 0.72 * scale, 0, C.TAU); ctx.stroke();
            ctx.fillStyle = "#fef3c7";
            ctx.beginPath(); ctx.arc(0, 0, 4 * scale, 0, C.TAU); ctx.fill();
        }
        ctx.restore();

        /* Health / shield bars. */
        var barW = 150 * scale;
        var bx = x - barW / 2, by = y + station.radius * 1.6 * scale + 12;
        ctx.fillStyle = "rgba(2,6,12,0.8)";
        ctx.fillRect(bx, by, barW, 5);
        ctx.fillStyle = color;
        ctx.fillRect(bx, by, barW * (station.hp / station.hpMax), 5);
        if (isNexus && station.shield > 0) {
            ctx.fillStyle = "rgba(2,6,12,0.8)";
            ctx.fillRect(bx, by + 7, barW, 3);
            ctx.fillStyle = "#67e8f9";
            ctx.fillRect(bx, by + 7, barW * (station.shield / station.shieldMax), 3);
        }
        ctx.fillStyle = rgba(color, 0.95);
        ctx.font = "700 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(isNexus ? "CORSAIR NEXUS" : "ANCHORAGE", x, by - 8);
    }

    function shipPath(line, tier, scale, alienType) {
        var s = scale;
        ctx.beginPath();
        if (alienType === "mite") {
            for (var i = 0; i < 5; i++) {
                var a = (i / 5) * C.TAU;
                var r = (i % 2 ? 9 : 15) * s;
                if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            return;
        }
        if (alienType === "lurker" || alienType === "warden") {
            var sides = alienType === "warden" ? 7 : 6;
            for (var j = 0; j < sides; j++) {
                var ang = (j / sides) * C.TAU;
                var rad = (j % 2 ? 0.7 : 1.15) * 17 * s * (alienType === "warden" ? 1.35 : 1);
                if (j === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
                else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
            }
            ctx.closePath();
            return;
        }
        if (alienType === "leviathan") {
            /* Segmented worm. */
            var segs = 7;
            for (var k = 0; k < segs; k++) {
                var kx = -k * 22 * s;
                var ky = Math.sin(k * 1.3 + stateTime() * 2) * 5 * s;
                var kr = (1 - k / (segs + 2)) * 34 * s;
                ctx.moveTo(kx + kr, ky);
                ctx.arc(kx, ky, kr, 0, C.TAU);
            }
            return;
        }
        if (line === "bulwark") {
            var w = 18 * s, h = 21 * s;
            ctx.moveTo(0, -h);
            ctx.lineTo(w, -h * 0.34);
            ctx.lineTo(w * 0.78, h * 0.72);
            ctx.lineTo(0, h);
            ctx.lineTo(-w * 0.78, h * 0.72);
            ctx.lineTo(-w, -h * 0.34);
            ctx.closePath();
        } else if (line === "harvester") {
            var w2 = 16 * s, h2 = 19 * s;
            ctx.moveTo(0, -h2);
            ctx.lineTo(w2 * 0.62, -h2 * 0.3);
            ctx.lineTo(w2, h2 * 0.55);
            ctx.lineTo(w2 * 0.44, h2 * 0.9);
            ctx.lineTo(-w2 * 0.44, h2 * 0.9);
            ctx.lineTo(-w2, h2 * 0.55);
            ctx.lineTo(-w2 * 0.62, -h2 * 0.3);
            ctx.closePath();
        } else {
            var w3 = 14 * s, h3 = 23 * s * (0.86 + tier * 0.03);
            ctx.moveTo(0, -h3);
            ctx.lineTo(w3 * 0.5, -h3 * 0.18);
            ctx.lineTo(w3, h3 * 0.46);
            ctx.lineTo(w3 * 0.36, h3 * 0.62);
            ctx.lineTo(0, h3 * 0.94);
            ctx.lineTo(-w3 * 0.36, h3 * 0.62);
            ctx.lineTo(-w3, h3 * 0.46);
            ctx.lineTo(-w3 * 0.5, -h3 * 0.18);
            ctx.closePath();
        }
    }

    function drawShip(ship, state, cam) {
        if (!ship.alive || ship.docked) return;
        var x = sx(ship.x, cam), y = sy(ship.y, cam);
        if (x < -120 || x > W + 120 || y < -120 || y > H + 120) return;
        var t = state.time;
        var scale = Math.max(0.72, cam.zoom) * (1 + (ship.tier - 1) * 0.06);
        if (ship.isBoss) scale *= 1.9;
        var teamColor = ship.isPlayer ? "#fef3c7" :
            ship.team === "free" ? (ship.isAlien ? "#c084fc" : "#5eead4") :
            ship.team === "corsair" ? "#fb7185" :
            ship.team === "neutral" ? "#c4b5fd" : "#c084fc";

        if (ship.invuln > state.time) {
            ctx.strokeStyle = "rgba(226,232,240,0.5)";
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(x, y, ship.radius * scale + 9, 0, C.TAU); ctx.stroke();
        }

        /* Engine flame. */
        var thrust = Math.hypot(ship.thrustX || 0, ship.thrustY || 0);
        if (thrust > 0.1 || ship.boost) {
            var flame = (10 + thrust * 14 + (ship.boost ? 10 : 0)) * scale;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(ship.angle);
            var fg = ctx.createLinearGradient(-ship.radius * scale, 0, -ship.radius * scale - flame, 0);
            fg.addColorStop(0, rgba(ship.boost ? "#67e8f9" : "#fbbf24", 0.9));
            fg.addColorStop(1, "rgba(251,113,133,0)");
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.moveTo(-ship.radius * scale * 0.5, -4 * scale);
            ctx.lineTo(-ship.radius * scale - flame, 0);
            ctx.lineTo(-ship.radius * scale * 0.5, 4 * scale);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        /* Shield bubble. */
        if (ship.shield > 0 || ship.barrierHp > 0) {
            var sa = ship.barrierHp > 0 ? 0.42 : Math.min(0.24, ship.shield / ship.shieldMax * 0.24);
            ctx.strokeStyle = rgba(ship.barrierHp > 0 ? "#fbbf24" : "#67e8f9", sa + 0.12);
            ctx.fillStyle = rgba(ship.barrierHp > 0 ? "#fbbf24" : "#67e8f9", sa * 0.35);
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(x, y, ship.radius * scale + 7, 0, C.TAU); ctx.fill(); ctx.stroke();
        }

        /* Carrier aura. */
        if (ship.carrierCore) {
            var pulse = 0.5 + Math.sin(t * 5) * 0.2;
            ctx.strokeStyle = "rgba(253,230,138," + pulse + ")";
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(x, y, ship.radius * scale + 17 + Math.sin(t * 4) * 4, 0, C.TAU); ctx.stroke();
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ship.angle);
        shipPath(ship.line, ship.tier, scale, ship.isAlien ? ship.alienType : null);
        var body = ctx.createLinearGradient(0, -20 * scale, 0, 20 * scale);
        body.addColorStop(0, ship.hitFlash > 0 ? "#ffffff" : teamColor);
        body.addColorStop(1, "#0b1220");
        ctx.fillStyle = body;
        ctx.fill();
        ctx.strokeStyle = ship.isPlayer ? "#fef9c3" : teamColor;
        ctx.lineWidth = ship.isPlayer ? 2.2 : 1.5;
        ctx.stroke();

        /* Cockpit glow. */
        ctx.fillStyle = rgba("#f8fafc", 0.8);
        ctx.beginPath(); ctx.arc(2 * scale, 0, 2.6 * scale, 0, C.TAU); ctx.fill();
        ctx.restore();

        /* Outlaw ring. */
        if (ship.outlawUntil > state.time) {
            ctx.strokeStyle = "rgba(248,113,113," + (0.5 + Math.sin(t * 8) * 0.25) + ")";
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 5]);
            ctx.beginPath(); ctx.arc(x, y, ship.radius * scale + 12, 0, C.TAU); ctx.stroke();
            ctx.setLineDash([]);
        }

        /* Health bar on hostiles. */
        if (!ship.isPlayer && (ship.team !== "free" || ship.isAlien)) {
            var bw = Math.max(34, ship.radius * 2.3 * scale);
            var bx = x - bw / 2, by = y - ship.radius * scale - 16;
            ctx.fillStyle = "rgba(2,6,12,0.75)";
            ctx.fillRect(bx, by, bw, 3.5);
            ctx.fillStyle = teamColor;
            ctx.fillRect(bx, by, bw * Math.max(0, ship.hull / ship.hullMax), 3.5);
            if (ship.shield > 0) {
                ctx.fillStyle = "rgba(103,232,249,0.75)";
                ctx.fillRect(bx, by - 2.5, bw * (ship.shield / ship.shieldMax), 1.8);
            }
            ctx.fillStyle = rgba(teamColor, 0.9);
            ctx.font = "600 8px ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.fillText(ship.name, x, by - 6);
        }

        if (ship.isBoss) {
            ctx.fillStyle = "rgba(216,180,254,0.95)";
            ctx.font = "800 12px ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.fillText("LEVIATHAN", x, y - ship.radius * scale - 34);
            ctx.fillStyle = "rgba(2,6,12,0.8)";
            ctx.fillRect(x - 110, y - ship.radius * scale - 26, 220, 6);
            ctx.fillStyle = "#d8b4fe";
            ctx.fillRect(x - 110, y - ship.radius * scale - 26, 220 * (ship.hull / ship.hullMax), 6);
        }
    }

    function drawBullets(state, cam) {
        for (var i = 0; i < state.bullets.length; i++) {
            var b = state.bullets[i];
            if (!visible(b.x, b.y, 20, cam)) continue;
            var x = sx(b.x, cam), y = sy(b.y, cam);
            var len = Math.min(18, Math.hypot(b.vx, b.vy) * 0.022);
            var a = Math.atan2(b.vy, b.vx);
            ctx.strokeStyle = b.color || "#f8fafc";
            ctx.lineWidth = b.team === "feral" ? 2 : 2.4;
            ctx.globalAlpha = 0.92;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - Math.cos(a) * len, y - Math.sin(a) * len);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    function drawParticles(state, cam) {
        for (var i = 0; i < state.particles.length; i++) {
            var p = state.particles[i];
            if (!visible(p.x, p.y, 20, cam)) continue;
            var x = sx(p.x, cam), y = sy(p.y, cam);
            var a = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = a;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(x, y, p.size * a * cam.zoom, 0, C.TAU);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawCrosshair(state, cam) {
        var p = state.player;
        if (!p || !p.alive || p.docked || CB.Input.state.usingTouch) return;
        var x = CB.Input.state.pointerX;
        var y = CB.Input.state.pointerY;
        if (!x && !y) return;
        ctx.strokeStyle = "rgba(254,243,199,0.8)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, C.TAU);
        ctx.moveTo(x - 15, y); ctx.lineTo(x - 4, y);
        ctx.moveTo(x + 4, y); ctx.lineTo(x + 15, y);
        ctx.moveTo(x, y - 15); ctx.lineTo(x, y - 4);
        ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 15);
        ctx.stroke();

        /* Aim line, faint. */
        if (p.aimX || p.aimY) {
            ctx.strokeStyle = "rgba(254,243,199,0.12)";
            ctx.setLineDash([3, 7]);
            ctx.beginPath();
            var px = sx(p.x, cam), py = sy(p.y, cam);
            ctx.moveTo(px, py);
            ctx.lineTo(px + p.aimX * 120, py + p.aimY * 120);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function drawOverlay(state) {
        var p = state.player;
        if (!p) return;
        var hullPct = p.hull / p.hullMax;

        /* Low hull pulse. */
        if (p.alive && hullPct < 0.3) {
            var a = (0.08 + Math.sin(state.time * 6) * 0.05) * (1 - hullPct / 0.3);
            var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
            g.addColorStop(0, "rgba(248,113,113,0)");
            g.addColorStop(1, "rgba(248,113,113," + (0.22 + a) + ")");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }
        if (p.shieldHit > 0) {
            ctx.fillStyle = "rgba(103,232,249," + (p.shieldHit * 0.5) + ")";
            ctx.fillRect(0, 0, W, H);
        }

        /* Vignette. */
        var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.82);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, "rgba(0,0,0,0.55)");
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, W, H);

        /* Very light scanlines, only on high quality. */
        if (quality === "high" && W > 700) {
            ctx.globalAlpha = 0.035;
            ctx.fillStyle = "#000";
            for (var y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
            ctx.globalAlpha = 1;
        }
    }

    function draw(dt, state) {
        if (!ctx) return;
        _state = state;
        timeAcc += dt;
        updateCamera(state, dt);
        var cam = state.camera;

        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        drawBackground(state, cam);
        drawBlackHole(state, cam);

        var i;
        for (i = 0; i < state.asteroids.length; i++) {
            if (state.asteroids[i].alive) drawAsteroid(state.asteroids[i], cam);
        }
        for (i = 0; i < state.relays.length; i++) drawRelay(state.relays[i], cam);
        for (i = 0; i < state.stations.length; i++) drawStation(state.stations[i], cam);
        for (i = 0; i < state.pickups.length; i++) drawPickup(state.pickups[i], cam);
        for (i = 0; i < state.ships.length; i++) drawShip(state.ships[i], state, cam);
        drawBullets(state, cam);
        drawParticles(state, cam);
        drawCrosshair(state, cam);
        drawOverlay(state);
    }

    /* A tiny ship portrait for the hangar panel. */
    function drawHullPreview(canvasEl, hull, line) {
        if (!canvasEl) return;
        var c = canvasEl.getContext("2d");
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = canvasEl.clientWidth || 220;
        var h = canvasEl.clientHeight || 120;
        canvasEl.width = w * dpr;
        canvasEl.height = h * dpr;
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, w, h);
        c.save();
        c.translate(w / 2, h / 2);
        c.rotate(-Math.PI / 2);
        var oldCtx = ctx;
        ctx = c;
        var oldState = _state;
        _state = { time: 0 };
        ctx.fillStyle = "rgba(8,14,24,0.6)";
        ctx.beginPath(); ctx.arc(0, 0, 48, 0, C.TAU); ctx.fill();
        ctx.strokeStyle = rgba(hull.color || "#5eead4", 0.3);
        ctx.lineWidth = 1;
        ctx.stroke();
        shipPath(line || hull.line, hull.tier, 1.7, null);
        var g = ctx.createLinearGradient(0, -30, 0, 30);
        g.addColorStop(0, hull.color || "#5eead4");
        g.addColorStop(1, "#0b1220");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = hull.color || "#5eead4";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx = oldCtx;
        _state = oldState;
        c.restore();
    }

    CB.Render = {
        init: init,
        draw: draw,
        resize: resize,
        setQuality: setQuality,
        drawHullPreview: drawHullPreview,
        rgba: rgba
    };
})(window.CB = window.CB || {});
