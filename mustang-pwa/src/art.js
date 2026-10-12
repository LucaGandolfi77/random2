/*
 * Mustang PWA - procedural artwork
 * Every unit, the terrain and the power-up crates are drawn with vector paths.
 * No binary assets ship with this game.
 */
(function (global) {
    "use strict";

    const MUSTANG = (global.MUSTANG = global.MUSTANG || {});
    const D = MUSTANG.data;

    const SHAPES = D.artShapes;

    const AXIS = {
        zero: { body: "#b8bcc4", wing: "#7d828c", trim: "#e04b3a" },
        fighter: { body: "#9aa3ad", wing: "#666e78", trim: "#e04b3a" },
        heavy: { body: "#8d9aa8", wing: "#5d6874", trim: "#c8ccd4" },
        jet: { body: "#c6ccd4", wing: "#8a919b", trim: "#e04b3a" },
        diver: { body: "#a8a094", wing: "#6f6a60", trim: "#e04b3a" },
        bomber: { body: "#98a0aa", wing: "#5f6771", trim: "#e04b3a" },
        ace: { body: "#d8dce2", wing: "#8b939d", trim: "#ff3b2f" },
        kamikaze: { body: "#b0b6be", wing: "#767d87", trim: "#e04b3a" },
        yashichi: { body: "#6fbf4a", wing: "#3f7a28", trim: "#e8f5d0" },
    };

    const ALLIED = {
        zero: { body: "#7f9fc4", wing: "#4a6b91", trim: "#e8eef6" },
        fighter: { body: "#6f93ba", wing: "#3f6188", trim: "#d94a3a" },
        heavy: { body: "#5f7f9e", wing: "#37536f", trim: "#d94a3a" },
        jet: { body: "#8fb0cf", wing: "#547695", trim: "#d94a3a" },
        diver: { body: "#6b8aa8", wing: "#3d5b78", trim: "#d94a3a" },
        bomber: { body: "#7e97b3", wing: "#456079", trim: "#d94a3a" },
        ace: { body: "#a8c4e0", wing: "#5c7fa6", trim: "#d94a3a" },
        kamikaze: { body: "#88a8c6", wing: "#4e6f8f", trim: "#d94a3a" },
        yashichi: { body: "#6fbf4a", wing: "#3f7a28", trim: "#e8f5d0" },
    };

    const EARTH = {
        tank: { body: "#6b6f4a", dark: "#4a4d32", light: "#878b5e" },
        halftrack: { body: "#6f6a4c", dark: "#4b4732", light: "#8c8763" },
        truck: { body: "#6a6152", dark: "#474135", light: "#8b8171" },
        gun: { body: "#5f6346", dark: "#41452f", light: "#7c8059" },
        flak: { body: "#5a5e44", dark: "#3e412e", light: "#787c57" },
        radar: { body: "#6c6f5c", dark: "#494c3e", light: "#8a8d78" },
    };

    const STEEL = {
        ship: { body: "#5d6a76", dark: "#3b454e", light: "#7d8b98" },
        sub: { body: "#414c56", dark: "#2a323a", light: "#606d79" },
        patrol: { body: "#6a7682", dark: "#454e58", light: "#8b98a5" },
    };

    const FALLBACK_SCHEME = { body: "#9aa0a8", wing: "#60666e", trim: "#d0d4da" };
    const schemeCache = {};

    function schemeFor(theatreId, unitId) {
        const key = theatreId + ":" + unitId;
        let hit = schemeCache[key];
        if (hit) return hit;
        const table = theatreId === "overlord" ? AXIS : ALLIED;
        hit = table[unitId] || FALLBACK_SCHEME;
        schemeCache[key] = hit;
        return hit;
    }

    function roundRect(ctx, x, y, w, h, r) {
        const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.lineTo(x + w - rr, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
        ctx.lineTo(x + w, y + h - rr);
        ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
        ctx.lineTo(x + rr, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
        ctx.lineTo(x, y + rr);
        ctx.quadraticCurveTo(x, y, x + rr, y);
        ctx.closePath();
    }

    function propeller(ctx, y, sp, time, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = "rgba(235,240,248,0.55)";
        ctx.lineWidth = 1;
        const a = time * 26;
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.ellipse(0, y, sp, sp * 0.18, a + i * Math.PI, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function warbird(ctx, art, x, y, angle, scale, c, time, alpha) {
        const s = SHAPES[art] || SHAPES.radial;
        ctx.save();
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(scale, scale);

        if (s.prop) propeller(ctx, -s.len - 1, s.propSp, time, alpha === undefined ? 1 : alpha);

        ctx.fillStyle = c.wing;
        ctx.strokeStyle = c.dark || "rgba(0,0,0,0.45)";
        ctx.lineWidth = 0.7;

        const wingLead = -s.sweep;
        const wingTrail = s.len * 0.42;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(side * 2, wingLead);
            ctx.lineTo(side * s.span, wingLead + s.sweep * 0.8);
            ctx.lineTo(side * s.span, wingTrail);
            ctx.lineTo(side * 2, wingTrail - 1);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(side * 1.5, s.len * 0.34);
            ctx.lineTo(side * s.tail, s.len * 0.34 + 2);
            ctx.lineTo(side * s.tail, s.len * 0.72);
            ctx.lineTo(side * 1.5, s.len * 0.66);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(side * 0.8, -s.len * 0.42);
            ctx.lineTo(side * 2.4, -s.len * 0.2);
            ctx.lineTo(side * 2.4, s.len * 0.5);
            ctx.lineTo(side * 0.8, s.len * 0.5);
            ctx.closePath();
            ctx.fillStyle = c.body;
            ctx.fill();
            ctx.fillStyle = c.wing;
        }

        ctx.fillStyle = c.body;
        ctx.beginPath();
        ctx.moveTo(0, -s.len);
        ctx.quadraticCurveTo(s.nose, -s.len * 0.55, s.nose * 0.85, -s.len * 0.1);
        ctx.lineTo(s.nose * 0.85, s.len * 0.45);
        ctx.quadraticCurveTo(s.nose * 0.6, s.len * 0.72, 0, s.len * 0.78);
        ctx.quadraticCurveTo(-s.nose * 0.6, s.len * 0.72, -s.nose * 0.85, s.len * 0.45);
        ctx.lineTo(-s.nose * 0.85, -s.len * 0.1);
        ctx.quadraticCurveTo(-s.nose, -s.len * 0.55, 0, -s.len);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = c.trim;
        ctx.lineWidth = 1.2;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(side * 0.9, -s.len * 0.38);
            ctx.lineTo(side * 0.9, s.len * 0.46);
            ctx.stroke();
        }

        const engCount = s.eng;
        if (engCount > 0) {
            const off = engCount === 4 ? [-s.span * 0.62, -s.span * 0.22, s.span * 0.22, s.span * 0.62]
                : engCount === 2 ? [-s.span * 0.42, s.span * 0.42]
                    : [0];
            ctx.fillStyle = c.dark || "#2a2a2a";
            for (const o of off) {
                ctx.beginPath();
                ctx.ellipse(o, -s.len * 0.22, 1.6 + s.nose * 0.18, s.nose * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.fillStyle = "rgba(200,225,245,0.85)";
        ctx.beginPath();
        ctx.ellipse(0, -s.len * 0.3, 1.7, s.len * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = c.trim;
        ctx.beginPath();
        ctx.arc(0, -s.len * 0.86, Math.max(1, s.nose * 0.3), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function tracks(ctx, w, h, col) {
        ctx.fillStyle = col;
        roundRect(ctx, -w / 2, -h / 2, w, h, 2.5);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
    }

    function wheels(ctx, positions, r, col) {
        ctx.fillStyle = col;
        for (const p of positions) {
            ctx.beginPath();
            ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function groundUnit(ctx, art, x, y, facing, time, alpha) {
        const c = EARTH[art] || EARTH.tank;
        ctx.save();
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.translate(x, y);
        if (facing < 0) ctx.scale(-1, 1);

        if (art === "tank") {
            tracks(ctx, 28, 6, c.dark);
            ctx.fillStyle = c.dark;
            roundRect(ctx, -14, 3, 28, 6, 2.5);
            ctx.fill();
            ctx.fillStyle = c.body;
            roundRect(ctx, -12, -6, 24, 11, 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.35)";
            ctx.lineWidth = 0.7;
            ctx.stroke();
            ctx.fillStyle = c.light;
            ctx.beginPath();
            ctx.arc(-1, -3, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(2, -4);
            ctx.lineTo(17, -8);
            ctx.stroke();
        } else if (art === "truck") {
            wheels(ctx, [[-8, 5], [7, 5]], 2.6, c.dark);
            ctx.fillStyle = c.body;
            roundRect(ctx, -12, -4, 24, 8, 1.6);
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.35)";
            ctx.lineWidth = 0.6;
            ctx.stroke();
            ctx.fillStyle = c.light;
            roundRect(ctx, 3, -6, 8, 8, 1.6);
            ctx.fill();
            ctx.fillStyle = "rgba(190,215,235,0.75)";
            roundRect(ctx, 5, -5, 5, 3, 1);
            ctx.fill();
        } else if (art === "gun") {
            wheels(ctx, [[-8, 4], [8, 4]], 3, c.dark);
            ctx.fillStyle = c.body;
            roundRect(ctx, -10, -4, 20, 7, 1.5);
            ctx.fill();
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-4, -3);
            ctx.lineTo(-12, -7);
            ctx.moveTo(4, -3);
            ctx.lineTo(12, -7);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-1, -3);
            ctx.lineTo(14, -9);
            ctx.stroke();
        } else if (art === "flak") {
            wheels(ctx, [[-8, 5], [-3, 5], [4, 5], [9, 5]], 2.2, c.dark);
            ctx.fillStyle = c.body;
            roundRect(ctx, -11, -3, 22, 7, 1.5);
            ctx.fill();
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 2.4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(0, -3);
            ctx.lineTo(6, -16);
            ctx.stroke();
            ctx.lineCap = "butt";
            ctx.fillStyle = c.light;
            ctx.beginPath();
            ctx.arc(0, -3, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (art === "radar") {
            ctx.fillStyle = c.dark;
            roundRect(ctx, -3, -8, 6, 16, 1.5);
            ctx.fill();
            ctx.strokeStyle = c.body;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(-9, 8);
            ctx.lineTo(-2, -6);
            ctx.moveTo(9, 8);
            ctx.lineTo(2, -6);
            ctx.stroke();
            ctx.save();
            ctx.translate(0, -9);
            ctx.rotate(Math.sin(time * 1.4) * 0.5);
            ctx.fillStyle = c.light;
            ctx.beginPath();
            ctx.ellipse(0, 0, 8, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    function seaUnit(ctx, art, x, y, time, alpha) {
        const c = STEEL[art] || STEEL.ship;
        ctx.save();
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.translate(x, y);
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 0.7;

        if (art === "ship") {
            ctx.fillStyle = "rgba(230,240,250,0.22)";
            ctx.beginPath();
            ctx.ellipse(0, 10, 24, 30, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = c.body;
            ctx.beginPath();
            ctx.moveTo(0, 58);
            ctx.lineTo(19, 30);
            ctx.lineTo(19, -40);
            ctx.lineTo(-19, -40);
            ctx.lineTo(-19, 30);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = c.dark;
            ctx.fillRect(-20, -42, 40, 6);
            ctx.fillStyle = c.light;
            ctx.fillRect(-9, -52, 18, 12);
            ctx.fillStyle = c.dark;
            ctx.beginPath();
            ctx.arc(-7, -54, 4, 0, Math.PI * 2);
            ctx.arc(7, -54, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = c.light;
            ctx.beginPath();
            ctx.arc(0, 24, 6, 0, Math.PI * 2);
            ctx.arc(0, 8, 6, 0, Math.PI * 2);
            ctx.fill();
        } else if (art === "sub") {
            ctx.fillStyle = "rgba(230,240,250,0.2)";
            ctx.beginPath();
            ctx.ellipse(0, 6, 16, 26, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = c.body;
            ctx.beginPath();
            ctx.ellipse(0, 0, 13, 27, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = c.light;
            roundRect(ctx, -4, -12, 8, 14, 2);
            ctx.fill();
            ctx.strokeStyle = c.dark;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(0, 27);
            ctx.lineTo(0, 34);
            ctx.moveTo(0, -27);
            ctx.lineTo(0, -34);
            ctx.stroke();
        } else {
            ctx.fillStyle = "rgba(230,240,250,0.22)";
            ctx.beginPath();
            ctx.ellipse(0, 12, 10, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = c.body;
            ctx.beginPath();
            ctx.moveTo(0, 24);
            ctx.lineTo(8, 8);
            ctx.lineTo(7, -12);
            ctx.lineTo(-7, -12);
            ctx.lineTo(-8, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = c.light;
            roundRect(ctx, -5, -17, 10, 7, 1.5);
            ctx.fill();
            ctx.strokeStyle = c.light;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(-4, -10);
            ctx.lineTo(-4, 22);
            ctx.moveTo(4, -10);
            ctx.lineTo(4, 22);
            ctx.stroke();
        }
        ctx.restore();
    }

    function hash01(n) {
        let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
        x ^= x >>> 13;
        x = Math.imul(x, 0xc2b2ae35);
        x ^= x >>> 16;
        return (x >>> 0) / 4294967296;
    }

    function drawSea(ctx, y0, y1, scroll, t, th) {
        ctx.drawImage(waterGradient(th), 0, y0, _w, y1 - y0);
        blitTile(ctx, seaTile(th), SEA_TILE_H, y0, y1, (scroll * 0.35) % SEA_TILE_H);
    }

    function drawBeach(ctx, y0, y1, th) {
        ctx.fillStyle = th.sand;
        ctx.fillRect(0, y0, configW(), y1 - y0);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(0, y0, configW(), 3);
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        for (let x = 0; x < configW(); x += 9) {
            ctx.fillRect(x, y1 - 3 - Math.floor(hash01(x * 7919) * 5), 5, 3);
        }
    }

    function drawLand(ctx, y0, y1, scroll, t, th) {
        ctx.fillStyle = th.land;
        ctx.fillRect(0, y0, _w, y1 - y0);
        blitTile(ctx, landTile(th), LAND_TILE_H, y0, y1, scroll % LAND_TILE_H);
        blitTile(ctx, rowsTile(), ROW_TILE_H, y0, y1, (scroll * 0.5) % ROW_TILE_H);

        ctx.globalAlpha = 0.6;
        ctx.fillStyle = th.accent2;
        const beacon = ((scroll * 0.4) % 900) - 100;
        if (beacon + y0 < y1 && beacon > y0 - y1) {
            ctx.fillRect(196, Math.max(y0, y0 + beacon), 8, 8);
        }
        ctx.globalAlpha = 1;
    }

    let _w = MUSTANG.data.config.canvasWidth;
    function configW() { return _w; }
    function setWidth(w) { _w = w; }

    /* ===== Offscreen tile cache ===== */
    let seaTileCache = null;
    let seaTileTheme = null;
    let landTileCache = null;
    let landTileTheme = null;
    const glowCache = {};

    const ROW_TILE_H = 52;

    const SEA_TILE_H = 44;
    const SEA_ROW = 22;
    const LAND_TILE_H = 68;
    const LAND_CELL = 34;

    function makeCanvas(w, h) {
        const c = global.document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
    }

    const gradCache = {};

    function waterGradient(th) {
        if (gradCache[th.bg]) return gradCache[th.bg];
        const strip = makeCanvas(1, 64);
        const c = strip.getContext("2d");
        const g = c.createLinearGradient(0, 0, 0, 64);
        g.addColorStop(0, th.waterDeep);
        g.addColorStop(1, th.water);
        c.fillStyle = g;
        c.fillRect(0, 0, 1, 64);
        gradCache[th.bg] = strip;
        return strip;
    }

    function seaTile(th) {
        if (seaTileCache && seaTileTheme === th) return seaTileCache;
        const tile = makeCanvas(_w, SEA_TILE_H);
        const c = tile.getContext("2d");
        c.strokeStyle = th.foam;
        c.globalAlpha = 0.22;
        c.lineWidth = 1;
        for (let y = 0; y < SEA_TILE_H; y += SEA_ROW) {
            c.beginPath();
            for (let x = -10; x <= _w + 10; x += 11) {
                const phase = ((y / SEA_ROW) % 2) * Math.PI;
                const w2 = Math.sin(x * 0.09 + phase) * 3.2;
                if (x === -10) c.moveTo(x, y + w2);
                else c.lineTo(x, y + w2);
            }
            c.stroke();
        }
        seaTileCache = tile;
        seaTileTheme = th;
        return tile;
    }

    let rowsTileCache = null;

    function rowsTile() {
        if (rowsTileCache) return rowsTileCache;
        const tile = makeCanvas(_w, ROW_TILE_H);
        const c = tile.getContext("2d");
        c.strokeStyle = "rgba(255,255,255,0.07)";
        c.lineWidth = 1;
        for (let y = 0; y < ROW_TILE_H; y += 26) {
            c.beginPath();
            c.moveTo(0, y);
            c.lineTo(_w, y);
            c.stroke();
        }
        rowsTileCache = tile;
        return tile;
    }

    function landTile(th) {
        if (landTileCache && landTileTheme === th) return landTileCache;
        const tile = makeCanvas(_w, LAND_TILE_H);
        const c = tile.getContext("2d");
        c.fillStyle = th.landDark;
        for (let cy = 0; cy < LAND_TILE_H; cy += LAND_CELL) {
            for (let cx = 0; cx < _w; cx += LAND_CELL) {
                const h = hash01((cx / LAND_CELL) * 7349 + (cy / LAND_CELL) * 9176);
                if (h > 0.62) {
                    const w = LAND_CELL * (0.4 + h * 0.5);
                    const hh = LAND_CELL * (0.28 + hash01(cx * 131 + cy * 17) * 0.34);
                    c.fillRect(cx + 3, cy + 3, w, hh);
                }
            }
        }
        c.strokeStyle = "rgba(0,0,0,0.1)";
        c.lineWidth = 1;
        for (let x = 0; x <= _w; x += 68) {
            c.beginPath();
            c.moveTo(x, 0);
            c.lineTo(x, LAND_TILE_H);
            c.stroke();
        }
        landTileCache = tile;
        landTileTheme = th;
        return tile;
    }

    function blitTile(ctx, tile, tileH, y0, y1, offset) {
        let y = Math.floor((y0 - offset) / tileH) * tileH + offset;
        while (y < y1) {
            const top = Math.max(y0, y);
            const bottom = Math.min(y1, y + tileH);
            if (bottom > top) {
                ctx.drawImage(tile, 0, top - y, _w, bottom - top, 0, top, _w, bottom - top);
            }
            y += tileH;
        }
    }

    function glowSprite(color) {
        if (glowCache[color]) return glowCache[color];
        const size = 32;
        const tile = makeCanvas(size, size);
        const c = tile.getContext("2d");
        const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, color);
        g.addColorStop(0.35, color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.globalAlpha = 0.85;
        c.fillStyle = g;
        c.fillRect(0, 0, size, size);
        glowCache[color] = tile;
        return tile;
    }

    function glow(ctx, x, y, r, color) {
        const s = glowSprite(color);
        ctx.drawImage(s, x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
    }

    function powCrate(ctx, kind, x, y, rot, th, pulse) {
        const def = MUSTANG.data.powerups[kind] || MUSTANG.data.powerups.red;
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = "rgba(235,240,248,0.7)";
        ctx.lineWidth = 1;
        const sway = Math.sin(rot * 1.6) * 7;
        ctx.beginPath();
        ctx.moveTo(-7, -8);
        ctx.lineTo(-7, -18);
        ctx.moveTo(7, -8);
        ctx.lineTo(7, -18);
        ctx.stroke();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(0, -20, 13, 8 + Math.sin(pulse * 3) * 1.2, 0, Math.PI, 0);
        ctx.fill();

        ctx.rotate(Math.sin(pulse * 2.2) * 0.16);
        const s = 1 + Math.sin(pulse * 5) * 0.06;
        ctx.scale(s, s);
        ctx.fillStyle = def.color;
        roundRect(ctx, -10, -10, 20, 20, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(8, 8);
        ctx.stroke();
        ctx.fillStyle = def.text;
        ctx.font = "bold 13px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(def.mark, 0, 2);
        ctx.restore();
        ctx.textBaseline = "alphabetic";
    }

    function medal(ctx, x, y, rot, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(rot * 2) * 0.2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
            const r = i % 2 === 0 ? 9 : 4;
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    MUSTANG.art = {
        warbird: warbird,
        groundUnit: groundUnit,
        seaUnit: seaUnit,
        drawSea: drawSea,
        drawBeach: drawBeach,
        drawLand: drawLand,
        powCrate: powCrate,
        medal: medal,
        glow: glow,
        roundRect: roundRect,
        schemeFor: schemeFor,
        setWidth: setWidth,
    };
})(typeof window !== "undefined" ? window : globalThis);