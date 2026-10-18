/*
 * IRONFALL - the minimap.
 *
 * Its own small canvas, its own scale, its own draw loop. Sharing the main
 * canvas would mean either clipping the minimap out of the world transform
 * every frame or redrawing the world behind it at 20% scale, and both cost
 * more than a 190-byte canvas element.
 *
 * The minimap carries the strategic layer the main camera cannot. It is
 * where the fog actually matters: the main view shows what is in front of
 * you, the minimap shows what your team has scouted, and the difference
 * between those two things is the whole information game.
 */
(function (S) {
    "use strict";

    var PAL = S.PAL;
    var canvas, ctx, W = 0, H = 0, dpr = 1;

    /* A coarse reveal grid. 48x48 cells over the map is a 190-unit cell,
     * which is close enough to a champion's vision radius that "we have
     * scouted this" and "we can see this" line up about as well as a
     * minimap ever does. Cheaper than storing per-unit visibility, and it
     * does not flicker as a champion walks in and out of someone's sight. */
    var GRID = 48;
    var revealed = [new Uint8Array(GRID * GRID), new Uint8Array(GRID * GRID)];

    function clear() {
        revealed[0].fill(0);
        revealed[1].fill(0);
    }

    function init(el) {
        canvas = el;
        ctx = canvas.getContext("2d");
        resize();
        clear();
        return ctx;
    }

    function resize() {
        var rect = canvas.getBoundingClientRect();
        W = Math.max(80, Math.round(rect.width || 190));
        H = Math.max(80, Math.round(rect.height || 190));
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
    }

    /* World -> minimap. The map is a diamond in the world and a square on
     * the minimap, so this is the same axonometric maths followed by a
     * rotate-and-scale. Done once per draw and shared by every mark, so the
     * lanes, the units and the pings all agree. */
    function size() { return S.Map.size; }
    function mapX(x, y) { return W * 0.5 + (x - y) / size() * (W * 0.46); }
    function mapY(x, y) { return H * 0.5 + (x + y) / size() * (H * 0.46); }

    function cellOf(x, y) {
        var gx = S.clamp(Math.floor(x / size() * GRID), 0, GRID - 1);
        var gy = S.clamp(Math.floor(y / size() * GRID), 0, GRID - 1);
        return gy * GRID + gx;
    }

    /* Update the reveal grid. Called once per second rather than once per
     * frame: vision changes at the speed a champion walks, and the grid is
     * the slowest-accepting consumer in the game. */
    function updateReveal(world) {
        var i;
        for (i = 0; i < world.champs.length; i++) {
            var c = world.champs[i];
            if (!c.alive) continue;
            var r = S.CONFIG.vision.champion;
            stamp(c.team, c.x, c.y, r);
        }
        for (i = 0; i < world.structures.length; i++) {
            var s = world.structures[i];
            if (!s.alive || s.team < 0) continue;
            stamp(s.team, s.x, s.y, S.CONFIG.vision.structure);
        }
    }

    function stamp(team, x, y, r) {
        var grid = revealed[team];
        var cell = size() / GRID;
        var gx0 = S.clamp(Math.floor((x - r) / cell), 0, GRID - 1);
        var gx1 = S.clamp(Math.floor((x + r) / cell), 0, GRID - 1);
        var gy0 = S.clamp(Math.floor((y - r) / cell), 0, GRID - 1);
        var gy1 = S.clamp(Math.floor((y + r) / cell), 0, GRID - 1);
        for (var gy = gy0; gy <= gy1; gy++) {
            for (var gx = gx0; gx <= gx1; gx++) {
                var cx = (gx + 0.5) * cell, cy = (gy + 0.5) * cell;
                if (S.dist2(cx, cy, x, y) <= r * r) grid[gy * GRID + gx] = 1;
            }
        }
    }

    function isRevealed(team, x, y) {
        return revealed[team][cellOf(x, y)] === 1;
    }

    /* ===== Drawing ===== */
    function draw(world) {
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = PAL.void;
        ctx.fillRect(0, 0, W, H);

        var team = world.player ? world.player.team : 0;
        var enemy = 1 - team;

        /* Lanes, as thick strokes so a lane reads as a road rather than as a
         * line. Only drawn through revealed ground - you cannot see a lane
         * you have never walked. */
        var names = S.Map.laneNames;
        for (var i = 0; i < names.length; i++) {
            var pts = S.Map.lanes[names[i]];
            ctx.lineWidth = 3.5;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            for (var seg = 0; seg < pts.length - 1; seg++) {
                var a = pts[seg], b = pts[seg + 1];
                var ra = isRevealed(team, a.x, a.y);
                var rb = isRevealed(team, b.x, b.y);
                if (!ra && !rb) continue;
                ctx.strokeStyle = ra && rb ? PAL.dirt : PAL.stoneDark;
                ctx.beginPath();
                ctx.moveTo(mapX(a.x, a.y), mapY(a.x, a.y));
                ctx.lineTo(mapX(b.x, b.y), mapY(b.x, b.y));
                ctx.stroke();
            }
        }

        /* River. */
        ctx.strokeStyle = PAL.teamBlueDark;
        ctx.lineWidth = 4;
        ctx.beginPath();
        var r0 = mapX(0, size()), r1 = mapY(0, size());
        var r2 = mapX(size(), 0), r3 = mapY(size(), 0);
        ctx.moveTo(r0, r1);
        ctx.lineTo(r2, r3);
        ctx.stroke();

        /* Structures. */
        var s;
        for (s = 0; s < world.structures.length; s++) {
            var st = world.structures[s];
            if (!st.alive) continue;
            var isOwn = st.team === team;
            if (!isOwn && !isRevealed(team, st.x, st.y)) continue;
            if (st.team < 0 && !isRevealed(team, st.x, st.y)) continue;
            var sx = mapX(st.x, st.y), sy = mapY(st.x, st.y);
            ctx.fillStyle = st.kind === "core" ? (isOwn ? PAL.teamBlueLit : PAL.teamRedLit)
                : (st.kind === "reliquary" ? PAL.gold
                    : (st.team < 0 ? PAL.chitin : (isOwn ? PAL.teamBlue : PAL.teamRed)));
            var sz = st.kind === "core" ? 7 : (st.kind === "reliquary" ? 5 : 5);
            ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
        }

        /* Champions. Yours always, enemies only where scouted. */
        for (var c = 0; c < world.champs.length; c++) {
            var ch = world.champs[c];
            if (!ch.alive) continue;
            var own = ch.team === team;
            if (!own && !isRevealed(team, ch.x, ch.y)) continue;
            var cx = mapX(ch.x, ch.y), cy = mapY(ch.x, ch.y);
            ctx.fillStyle = ch.isPlayer ? PAL.gold : (own ? PAL.teamBlueLit : PAL.teamRedLit);
            ctx.beginPath();
            ctx.arc(cx, cy, ch.isPlayer ? 4.5 : 3.4, 0, Math.PI * 2);
            ctx.fill();
            if (ch.isPlayer) {
                ctx.strokeStyle = PAL.gold;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        /* Minions. Drawn only for the player's team and only as tiny dots,
         * because a minimap showing ninety enemy minions is a minimap showing
         * nothing. */
        ctx.fillStyle = "rgba(200,190,170,0.5)";
        for (var m = 0; m < world.units.length; m++) {
            var u = world.units[m];
            if (!u.alive || u.kind !== "minion") continue;
            if (u.team !== team) continue;
            if (!isRevealed(team, u.x, u.y)) continue;
            ctx.fillRect(mapX(u.x, u.y) - 1, mapY(u.x, u.y) - 1, 2, 2);
        }

        /* Pings, fading. Drawn over everything: a ping that is behind a
         * structure mark is a ping nobody sees. */
        /* Pings fade over `dur` seconds, which world.step expires. Age is
         * derived from world time rather than a per-draw increment so the
         * fade is correct regardless of how often the minimap is drawn. */
        if (world.pings) {
            for (var p = 0; p < world.pings.length; p++) {
                var ping = world.pings[p];
                ping.life = world.time - ping.at;
                drawPing(ping);
            }
        }

        /* The camera frustum, as a small bracket at the camera centre. */
        if (world.player) {
            var px = mapX(S.Render.cam.x, S.Render.cam.y);
            var py = mapY(S.Render.cam.x, S.Render.cam.y);
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px - 9, py - 9, 18, 18);
        }
    }

    var PING_STYLE = {
        onMyWay: { color: "#5eead4", glyph: "!" },
        enemy: { color: "#f87171", glyph: "X" },
        danger: { color: "#fbbf24", glyph: "?" }
    };

    function drawPing(ping) {
        var st = PING_STYLE[ping.kind] || PING_STYLE.onMyWay;
        var sx = mapX(ping.x, ping.y), sy = mapY(ping.x, ping.y);
        var t = ping.life / ping.dur;
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 2;
        var r = 4 + t * 12;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = st.color;
        ctx.font = "bold 10px ui-monospace, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.fillText(st.glyph, sx, sy - r - 2);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
    }

    /* Ping placement. Capped and deduped: a player who taps the map twice a
     * second should get two pings, and one who taps thirty times a second
     * should get a clear minimap rather than thirty glyphs. */
    function addPing(world, x, y, kind) {
        if (!world.pings) world.pings = [];
        var now = world.time;
        for (var i = world.pings.length - 1; i >= 0; i--) {
            if (now - world.pings[i].at < 0.4) return false;
        }
        if (world.pings.length >= 6) world.pings.shift();
        world.pings.push({ x: x, y: y, kind: kind, life: 0, dur: 2.4, at: now });
        return true;
    }

    /* Screen position of a tap on the minimap, in minimap pixels. Used by the
     * input layer to turn a minimap tap into a world coordinate. */
    function hitToWorld(localX, localY) {
        /* Invert mapX/mapY. Same two-line solve as the main projection. */
        var nx = (localX - W * 0.5) / (W * 0.46) * size();
        var ny = (localY - H * 0.5) / (H * 0.46) * size();
        return {
            x: (nx + ny) / 2,
            y: (ny - nx) / 2
        };
    }

    S.Minimap = {
        init: init,
        resize: resize,
        draw: draw,
        clear: clear,
        updateReveal: updateReveal,
        isRevealed: isRevealed,
        addPing: addPing,
        hitToWorld: hitToWorld,
        mapX: mapX,
        mapY: mapY
    };

})(window.IF = window.IF || {});
