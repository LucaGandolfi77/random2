/* Circular tactical minimap. Enemies only appear when they are close enough
 * to matter or when the player is in a PvP ring, which keeps the Drift from
 * turning into a wallhack. */
(function (CB) {
    "use strict";

    var C = CB.CONFIG;
    var canvas = null, ctx = null, size = 180, dpr = 1;

    function init(el) {
        canvas = el;
        if (!canvas) return;
        ctx = canvas.getContext("2d");
        resize();
    }

    function resize() {
        if (!canvas) return;
        size = canvas.clientWidth || 170;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = size * dpr;
        canvas.height = size * dpr;
    }

    function draw(state) {
        if (!ctx) return;
        var p = state.player;
        if (!p) return;
        var w = size, h = size;
        var cx = w / 2, cy = h / 2;
        var scale = (w / 2 - 5) / (C.WORLD_RADIUS + 600);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, w / 2 - 1, 0, C.TAU);
        ctx.clip();

        ctx.fillStyle = "rgba(3,7,15,0.86)";
        ctx.fillRect(0, 0, w, h);

        /* rings */
        var rings = [
            { r: C.DRIFT_RADIUS, c: "rgba(134,239,172,0.2)" },
            { r: C.SCAB_RADIUS, c: "rgba(251,191,36,0.35)" },
            { r: C.MAW_RADIUS, c: "rgba(251,113,133,0.5)" }
        ];
        rings.forEach(function (ring) {
            ctx.strokeStyle = ring.c;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, ring.r * scale, 0, C.TAU);
            ctx.stroke();
        });

        /* safe bubble */
        var hx = cx + (state.home.x - p.x) * scale;
        var hy = cy + (state.home.y - p.y) * scale;
        ctx.strokeStyle = "rgba(94,234,212,0.35)";
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(hx, hy, C.SAFE_RADIUS * scale, 0, C.TAU);
        ctx.stroke();
        ctx.setLineDash([]);

        function dot(x, y, color, r, glow) {
            var px = cx + (x - p.x) * scale;
            var py = cy + (y - p.y) * scale;
            if ((px - cx) * (px - cx) + (py - cy) * (py - cy) > (w / 2 - 2) * (w / 2 - 2)) return;
            if (glow) {
                ctx.fillStyle = color.replace("1)", "0.25)");
                ctx.beginPath(); ctx.arc(px, py, r * 2.6, 0, C.TAU); ctx.fill();
            }
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(px, py, r, 0, C.TAU); ctx.fill();
        }

        /* relays */
        state.relays.forEach(function (r) {
            var col = r.owner === "free" ? "rgba(94,234,212,1)" :
                r.owner === "corsair" ? "rgba(251,113,133,1)" : "rgba(148,163,184,1)";
            dot(r.x, r.y, col, 2.6, false);
        });

        /* stations */
        if (state.nexus && state.nexus.alive) dot(state.nexus.x, state.nexus.y, "rgba(251,113,133,1)", 4, true);
        if (state.home && state.home.alive) dot(state.home.x, state.home.y, "rgba(94,234,212,1)", 4, true);

        /* ships */
        state.ships.forEach(function (s) {
            if (!s.alive || s.isPlayer) return;
            var col;
            if (s.team === "free") col = "rgba(94,234,212,0.9)";
            else if (s.team === "neutral") col = "rgba(196,181,253,0.9)";
            else if (s.team === "corsair") col = "rgba(251,113,133,0.95)";
            else col = "rgba(192,132,252,0.95)";
            var near = Math.hypot(s.x - p.x, s.y - p.y) < 3000;
            var zone = CB.Zones.zoneAt(p.x, p.y);
            if (s.team === "corsair" && !near && !zone.pvp) return;
            if (s.team === "feral" && !near && !s.isBoss) return;
            if (s.isBoss) col = "rgba(216,180,254,1)";
            dot(s.x, s.y, col, s.isBoss ? 5 : 2.2, s.isBoss || s.carrierCore);
        });

        /* core carrier */
        if (state.coreCarrier && state.coreCarrier.alive) {
            dot(state.coreCarrier.x, state.coreCarrier.y, "rgba(253,230,138,1)", 3.2, true);
        }

        /* player arrow */
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(p.aimY || 0, p.aimX || 1));
        ctx.fillStyle = "#fef3c7";
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4, 4);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, -4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();

        /* frame + zone tick marks */
        ctx.strokeStyle = "rgba(148,163,184,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, w / 2 - 1, 0, C.TAU);
        ctx.stroke();
        var zone = CB.Zones.zoneAt(p.x, p.y);
        ctx.fillStyle = zone.color;
        ctx.font = "700 8px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(zone.name, w / 2, h - 7);
    }

    CB.Minimap = { init: init, draw: draw, resize: resize };
})(window.CB = window.CB || {});
