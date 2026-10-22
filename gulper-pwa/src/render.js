/*
 * GULPER - the renderer.
 *
 * The whole scene is rasterised by hand into a low-resolution buffer and
 * blitted once per frame. Flat shading, one colour per face, hard pixel
 * edges, and a thirty-two colour palette per biome.
 *
 * The projection is axonometric: world +x runs down-right, world +y runs
 * down-left, +z straight up. Depth is x+y, and everything is painted far
 * to near. There is no depth buffer, so the sort order is the entire
 * correctness story.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;
    var PROJ = S.PROJ;

    var canvas, ctx, buf = null, imgData = null;
    var W = 0, H = 0, chunk = 2;
    var quality = C.quality.high;

    var cam = { x: 0, y: 0, shake: 0, shakeX: 0, shakeY: 0 };

    /* Scratch buffers, reused every frame so the renderer allocates
     * nothing in the hot path. */
    var vx = null, vy = null, vz = null, polyBuf = null;

    /* Mesh caches. Meshes are expensive to build and never change, so
     * they are built once and shared by every instance. */
    var meshCache = {};
    var rampCache = {};

    /* ===== the pixel font =====
     * Three by five. It has to be small: at this resolution a bigger
     * font eats the scene it is annotating. */
    var FONT = {
        "0": "111101101101111", "1": "010110010010111", "2": "111001111100111",
        "3": "111001111001111", "4": "101101111001001", "5": "111100111001111",
        "6": "111100111101111", "7": "111001001001001", "8": "111101111101111",
        "9": "111101111001111",
        "A": "111101111101101", "B": "110101110101110", "C": "111100100100111",
        "D": "110101101101110", "E": "111100111100111", "F": "111100111100100",
        "G": "111100101101111", "H": "101101111101101", "I": "111010010010111",
        "J": "001001001101111", "K": "101101110101101", "L": "100100100100111",
        "M": "101111111101101", "N": "110101101101101", "O": "111101101101111",
        "P": "111101111100100", "Q": "111101101111011", "R": "111101111110101",
        "S": "111100111001111", "T": "111010010010010", "U": "101101101101111",
        "V": "101101101101010", "W": "101101111111101", "X": "101101010101101",
        "Y": "101101010010010", "Z": "111001010100111",
        " ": "000000000000000", "+": "000010111010000", "-": "000000111000000",
        "!": "010010010000010", ".": "000000000000010", ":": "000010000010000",
        "%": "101001010100101", "?": "111001011000010", "/": "001001010100100"
    };

    function drawText(buffer, text, x, y, color, scale) {
        scale = scale || 1;
        var cx = x;
        for (var i = 0; i < text.length; i++) {
            var glyph = FONT[text.charAt(i)];
            if (!glyph) { cx += 4 * scale; continue; }
            for (var row = 0; row < 5; row++) {
                for (var col = 0; col < 3; col++) {
                    if (glyph.charAt(row * 3 + col) !== "1") continue;
                    S.Raster.fillRect(buffer, cx + col * scale, y + row * scale, scale, scale, color);
                }
            }
            cx += 4 * scale;
        }
    }

    function textWidth(text, scale) {
        return text.length * 4 * (scale || 1);
    }

    /* ===== setup ===== */
    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext("2d", { alpha: false });
        ctx.imageSmoothingEnabled = false;
        resize();
    }

    /* Choose a buffer resolution.
     *
     * The rule is that one buffer pixel should cover at least two CSS
     * pixels, so the result reads as pixel art rather than as a small
     * image. A phone gets a small buffer and therefore sees less of the
     * world, but the same amount of detail - which is the right trade for
     * a game where the pixels are the art direction. */
    function resize(forcedChunk) {
        var vw = Math.max(240, window.innerWidth || 480);
        var vh = Math.max(200, window.innerHeight || 320);
        var big = Math.min(vw, vh) >= 620;
        chunk = forcedChunk || (big ? C.render.targetChunkLarge : C.render.targetChunk);

        var bw = Math.round(vw / chunk);
        var bh = Math.round(vh / chunk);
        bw = S.clamp(bw, C.render.minBufferW, C.render.maxBufferW);
        bh = S.clamp(bh, C.render.minBufferH, C.render.maxBufferH);

        if (bw === W && bh === H && buf) return false;

        W = bw; H = bh;
        buf = S.Raster.create(W, H);
        imgData = new ImageData(buf.data, W, H);
        canvas.width = W;
        canvas.height = H;
        ctx.imageSmoothingEnabled = false;

        vx = new Float32Array(512);
        vy = new Float32Array(512);
        vz = new Float32Array(512);
        polyBuf = new Float32Array(64);
        return true;
    }

    function setQuality(tier) {
        quality = C.quality[tier] || C.quality.high;
    }

    /* ===== projection ===== */
    function project(wx, wy, wz, out) {
        var dx = wx - cam.x, dy = wy - cam.y;
        out.x = W / 2 + (dx - dy) * PROJ.xScale / C.camera.unitsPerPixel;
        out.y = H / 2 + ((dx + dy) * PROJ.yScale - (wz || 0) * PROJ.zScale) / C.camera.unitsPerPixel;
        return out;
    }

    var pt = { x: 0, y: 0 };

    function toScreen(wx, wy, wz) {
        project(wx, wy, wz || 0, pt);
        return pt;
    }

    /* The inverse projection, in buffer pixels.
     *
     * A tap that lands somewhere other than where the player pressed is
     * the loudest possible failure in a game like this, so the inverse is
     * exact algebra rather than an approximation: two lines of it and no
     * matrix inverse, which is the payoff for staying linear.
     */
    function unproject(sx, sy, out) {
        var k = C.camera.unitsPerPixel;
        var a = (sx - W / 2) * k / PROJ.xScale;   /* dx - dy */
        var b = (sy - H / 2) * k / PROJ.yScale;   /* dx + dy */
        var dx = (a + b) / 2;
        var dy = (b - a) / 2;
        out.x = cam.x + dx;
        out.y = cam.y + dy;
        return out;
    }

    /* ===== meshes ===== */
    function meshFor(key, build) {
        if (!meshCache[key]) meshCache[key] = build();
        return meshCache[key];
    }

    function rampsFor(biomeId, colors) {
        var key = biomeId + "|" + colors.join(",");
        if (!rampCache[key]) {
            var arr = [];
            for (var i = 0; i < colors.length; i++) {
                arr.push(S.Palette.ramp(biomeId, colors[i]));
            }
            rampCache[key] = arr;
        }
        return rampCache[key];
    }

    /*
     * Draw a mesh.
     *
     * `opts` carries the position, the scale, the rotation around the
     * vertical axis, and the shading ramps for each material.
     */
    function drawMesh(mesh, opts) {
        var scale = opts.scale || 1;
        var angle = opts.angle || 0;
        var cos = Math.cos(angle), sin = Math.sin(angle);
        var ox = opts.x, oy = opts.y, oz = opts.z || 0;
        var ramps = opts.ramps;
        var verts = mesh.verts;
        var count = verts.length / 3;
        var i;

        if (vx.length < count) {
            vx = new Float32Array(count * 2);
            vy = new Float32Array(count * 2);
            vz = new Float32Array(count * 2);
        }

        for (i = 0; i < count; i++) {
            var lx = verts[i * 3], ly = verts[i * 3 + 1], lz = verts[i * 3 + 2];
            var rx = lx * cos - ly * sin;
            var ry = lx * sin + ly * cos;
            var wx = ox + rx * scale;
            var wy = oy + ry * scale;
            var wz = oz + lz * scale;
            var dx = wx - cam.x, dy = wy - cam.y;
            vx[i] = W / 2 + (dx - dy) * PROJ.xScale / C.camera.unitsPerPixel;
            vy[i] = H / 2 + ((dx + dy) * PROJ.yScale - wz * PROJ.zScale) / C.camera.unitsPerPixel;
            vz[i] = wz;
        }

        var faces = mesh.faces;
        for (i = 0; i < faces.length; i++) {
            var f = faces[i];
            var nx = f.n[0], ny = f.n[1], nz = f.n[2];
            /* Rotate the normal with the body so the light stays in the
             * world and the shading turns as the creature turns. */
            var rnx = nx * cos - ny * sin;
            var rny = nx * sin + ny * cos;

            /* Back faces cannot be seen. */
            var facing = rnx * PROJ.viewX + rny * PROJ.viewY + nz * PROJ.viewZ;
            if (facing <= 0.02) continue;

            var lit = rnx * S.LIGHT[0] + rny * S.LIGHT[1] + nz * S.LIGHT[2];
            var level = S.clamp(Math.round((lit * 0.5 + 0.5) * 15), 0, 15);
            var ramp = ramps[f.mat || 0];
            var color = ramp[level];

            var idx = f.idx;
            var n = idx.length;
            for (var k = 0; k < n; k++) {
                polyBuf[k * 2] = vx[idx[k]];
                polyBuf[k * 2 + 1] = vy[idx[k]];
            }
            S.Raster.poly(buf, polyBuf.subarray(0, n * 2), color);
        }
    }

    /* ===== tentacles =====
     * A tentacle is a chain of tapering segments that wave. The chain is
     * rebuilt every frame, because a tentacle baked into a mesh is a
     * noodle. */
    function drawTentacle(opts) {
        var segs = opts.segs || 6;
        var len = opts.len;
        var thick = opts.thick || 3;
        var base = opts.angle;
        var wave = opts.wave || 0;
        var ramp = opts.ramp;
        var x = opts.x, y = opts.y, z = opts.z || 0;
        var dirX = Math.cos(base), dirY = Math.sin(base);
        var perpX = -dirY, perpY = dirX;

        var prevX = x, prevY = y, prevZ = z, prevR = thick;
        var px = [], py = [];
        for (var i = 1; i <= segs; i++) {
            var t = i / segs;
            var bend = Math.sin(wave + t * 3.1) * len * 0.22 * t;
            var sx = x + dirX * len * t + perpX * bend;
            var sy = y + dirY * len * t + perpY * bend;
            var sz = z + Math.sin(t * 2.4 + wave) * 2.2 + t * 3;
            var r = thick * (1 - t * 0.82);
            if (r < 0.6) r = 0.6;

            /* A quad between the previous segment and this one. */
            var ax = prevX + perpX * prevR, ay = prevY + perpY * prevR;
            var bx = prevX - perpX * prevR, by = prevY - perpY * prevR;
            var cx = sx - perpX * r, cy = sy - perpY * r;
            var dxp = sx + perpX * r, dyp = sy + perpY * r;
            drawWorldQuad(ax, ay, prevZ, bx, by, prevZ, cx, cy, sz, dxp, dyp, sz, ramp[6]);
            drawWorldQuad(ax, ay, prevZ, bx, by, prevZ, cx, cy, sz, dxp, dyp, sz, ramp[11]);

            prevX = sx; prevY = sy; prevZ = sz; prevR = r;
        }
    }

    /* A world-space quad, projected and filled. */
    var q0 = { x: 0, y: 0 }, q1 = { x: 0, y: 0 }, q2 = { x: 0, y: 0 }, q3 = { x: 0, y: 0 };
    function drawWorldQuad(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, color) {
        project(x0, y0, z0, q0);
        project(x1, y1, z1, q1);
        project(x2, y2, z2, q2);
        project(x3, y3, z3, q3);
        polyBuf[0] = q0.x; polyBuf[1] = q0.y;
        polyBuf[2] = q1.x; polyBuf[3] = q1.y;
        polyBuf[4] = q2.x; polyBuf[5] = q2.y;
        polyBuf[6] = q3.x; polyBuf[7] = q3.y;
        S.Raster.poly(buf, polyBuf.subarray(0, 8), color);
    }

    /* ===== background ===== */

    /* Fill a convex polygon row by row, with a callback that can choose
     * the colour per row. */
    function polyRows(pts, cb) {
        var n = pts.length >> 1;
        var minY = Infinity, maxY = -Infinity, i;
        for (i = 0; i < n; i++) {
            var py = pts[i * 2 + 1];
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
        }
        var y0 = Math.max(0, Math.floor(minY));
        var y1 = Math.min(H - 1, Math.ceil(maxY));
        for (var y = y0; y <= y1; y++) {
            var yc = y + 0.5;
            var sx = Infinity, ex = -Infinity;
            for (i = 0; i < n; i++) {
                var j = (i === n - 1) ? 0 : i + 1;
                var ay = pts[i * 2 + 1], by = pts[j * 2 + 1];
                if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
                    var t = (yc - ay) / (by - ay);
                    var x = pts[i * 2] + t * (pts[j * 2] - pts[i * 2]);
                    if (x < sx) sx = x;
                    if (x > ex) ex = x;
                }
            }
            if (ex < sx) continue;
            cb(y, Math.max(0, Math.floor(sx)), Math.min(W, Math.ceil(ex)));
        }
    }

    function drawGround(world) {
        var biome = world.biome;
        var pal = S.Palette.get(biome.palette);
        var voidColor = S.Palette.snap(biome.palette, biome.sky[0]);
        var groundA = S.Palette.snap(biome.palette, biome.ground);
        var groundB = S.Palette.snap(biome.palette, biome.ground2);

        S.Raster.clear(buf, voidColor);

        /* The arena is a rectangle in the world, so its projection is a
         * parallelogram, and a parallelogram has one span per row. */
        var a = world.arena;
        var corners = [
            a.x, a.y, a.x + a.w, a.y,
            a.x + a.w, a.y + a.h, a.x, a.y + a.h
        ];
        var pts = [];
        for (var i = 0; i < 4; i++) {
            var s = project(corners[i * 2], corners[i * 2 + 1], 0, { x: 0, y: 0 });
            pts.push(s.x, s.y);
        }

        var top = Infinity, bottom = -Infinity;
        for (i = 0; i < 4; i++) {
            if (pts[i * 2 + 1] < top) top = pts[i * 2 + 1];
            if (pts[i * 2 + 1] > bottom) bottom = pts[i * 2 + 1];
        }

        polyRows(pts, function (y, x0, x1) {
            var t = (y - top) / Math.max(1, bottom - top);
            /* Far ground is darker. Dithering makes the gradient honest. */
            var level = 0.15 + t * 0.55;
            if (quality.speckle) {
                S.Raster.ditherRect(buf, x0, y, x1 - x0, 1, groundB, groundA, level, C.render.bayer);
            } else {
                S.Raster.fillRect(buf, x0, y, x1 - x0, 1, groundB);
            }
        });

        /* Speckle: one pixel of texture every so often, deterministic so
         * it does not shimmer when the camera moves. */
        if (quality.speckle) {
            var step = C.render.speckle;
            var x0 = Math.max(0, Math.floor(W * 0.1));
            var y0 = Math.max(0, Math.floor(H * 0.1));
            for (var yy = y0; yy < H - y0; yy += 2) {
                for (var xx = x0; xx < W - x0; xx += 2) {
                    var h = S.hash2(xx / step | 0, yy / step | 0);
                    if (h > 0.86) S.Raster.pixel(buf, xx, yy, groundA);
                    else if (h < 0.05) S.Raster.pixel(buf, xx, yy, groundB);
                }
            }
        }

        /* Lamp pools. The dark levels are played by the pools of light,
         * so they have to be visible on the ground, not just on the
         * scenery. */
        if (quality.glow) {
            var glow = S.Palette.snap(biome.palette, biome.lampGlow);
            for (i = 0; i < world.props.length; i++) {
                var lamp = world.props[i];
                if (!lamp.light) continue;
                var lc = project(lamp.x, lamp.y, 0, { x: 0, y: 0 });
                var rad = 88 / C.camera.unitsPerPixel;
                for (var ry = Math.floor(lc.y - rad); ry <= lc.y + rad; ry++) {
                    if (ry < 0 || ry >= H) continue;
                    var dx = lc.x, dy = ry - lc.y;
                    var half = Math.sqrt(Math.max(0, rad * rad - dy * dy));
                    var lx0 = Math.max(0, Math.floor(dx - half));
                    var lx1 = Math.min(W, Math.ceil(dx + half));
                    if (lx1 <= lx0) continue;
                    var fade = 1 - Math.abs(dy) / rad;
                    S.Raster.ditherBlend(buf, lx0, ry, lx1 - lx0, 1, glow, fade * fade * 0.3, C.render.bayer);
                }
            }
        }

        /* A grid on the ground.
         *
         * Not decoration: a floor with no scale on it reads as an empty
         * void, and the player has no idea how fast they are moving or
         * how big anything is. The lines are one pixel wide and they are
         * the only thing in the scene that gives the eye a ruler. */
        var gridColor = S.Palette.snap(biome.palette, biome.ground2);
        var step = 100;
        var spanX = (W * C.camera.unitsPerPixel) / 2;
        var spanY = (H * C.camera.unitsPerPixel) / 2;
        var gx0 = Math.floor((cam.x - spanX) / step) * step;
        var gx1 = cam.x + spanX;
        for (var gx = gx0; gx <= gx1; gx += step) {
            var ga = project(gx, cam.y - spanY, 0, { x: 0, y: 0 });
            var gb = project(gx, cam.y + spanY, 0, { x: 0, y: 0 });
            drawDashed(ga.x, ga.y, gb.x, gb.y, gridColor);
        }
        var gy0 = Math.floor((cam.y - spanY) / step) * step;
        var gy1 = cam.y + spanY;
        for (var gy = gy0; gy <= gy1; gy += step) {
            var ha = project(cam.x - spanX, gy, 0, { x: 0, y: 0 });
            var hb = project(cam.x + spanX, gy, 0, { x: 0, y: 0 });
            drawDashed(ha.x, ha.y, hb.x, hb.y, gridColor);
        }
    }

    /* ===== props ===== */
    function propMesh(kind) {
        return meshFor("prop:" + kind, function () {
            var rng = S.Rng(kind.length * 7919 + kind.charCodeAt(0));
            switch (kind) {
                case "container": return S.Meshes.container(rng);
                case "crate": return S.Meshes.crate(rng);
                case "barrel": return S.Meshes.barrel(rng);
                case "pillar": return S.Meshes.pillar(rng);
                case "console": return S.Meshes.console(rng);
                case "lamp": return S.Meshes.lamp(rng);
                default: return S.Meshes.rubble(rng);
            }
        });
    }

    function drawProps(world, list) {
        var biome = world.biome;
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            var mesh = propMesh(p.kind);
            var colors = propColors(p.kind, p.tint);
            var ramps = rampsFor(biome.palette, colors);
            drawMesh(mesh, {
                x: p.x, y: p.y, z: 0,
                scale: 1, angle: p.rot || 0,
                ramps: ramps
            });
        }
    }

    function propColors(kind, tint) {
        var shades = ["#4d5866", "#3a434f", "#5e5158", "#667283"];
        var base = shades[(tint || 0) % shades.length];
        switch (kind) {
            case "container": return [base, "#2b323c", "#c1703a"];
            case "crate": return ["#6b3d21", "#43291a", "#c1703a"];
            case "barrel": return ["#3e8f8c", "#1f4a56", "#f2b23c"];
            case "pillar": return ["#4d5866", "#2b323c", "#8a95a3"];
            case "console": return ["#3a434f", "#1e242c", "#38c4cf"];
            case "lamp": return ["#3a434f", "#2b323c", "#f2b23c"];
            default: return ["#4d5866", "#3a434f", "#2b323c"];
        }
    }

    /* ===== characters ===== */
    function entityMesh(e) {
        var key = "ent:" + e.kind + ":" + (e.typeId || e.kind);
        return meshFor(key, function () {
            var rng = S.Rng(S.hashString(e.typeId || e.kind) || 7);
            if (e.kind === "player") {
                var stage = S.Body.stageIndex(S.CONFIG.player.mass);
                return S.Meshes.alien(rng, { seg: 9, rings: 5, bodyR: 1 });
            }
            if (e.kind === "prey") return S.Meshes.human(rng, e.def.role || "civilian");
            if (e.kind === "foe") return S.Meshes.human(rng, e.def.role || "guard");
            if (e.kind === "boss" || e.kind === "rival") {
                return S.Meshes.alien(rng, { seg: 8, rings: 4, bodyR: e.def.r / 14 });
            }
            return S.Meshes.human(rng, "civilian");
        });
    }

    function entityColors(e) {
        if (e.kind === "player") return ["#8fbf5c", "#b8d97a", "#4a5c2c", "#2a3320"];
        var c = e.def.colors || { body: "#4d5866", skin: "#c79a72", accent: "#f2b23c" };
        return [c.body, c.skin, c.accent, "#1a1d24"];
    }

    /* ===== the scene ===== */
    function draw(world, dt) {
        if (!buf) return;

        currentPalette = S.Storage.data().settings.palette;
        if (!currentPalette || currentPalette === "auto") currentPalette = world.biome.palette;

        /* Camera. */
        var p = world.player;
        var lead = C.camera.lead;
        var tx = p.x + (world.input.aimActive ? (world.input.aimX - p.x) * lead : 0);
        var ty = p.y + (world.input.aimActive ? (world.input.aimY - p.y) * lead : 0);
        cam.x = S.damp(cam.x, tx, C.camera.follow, dt);
        cam.y = S.damp(cam.y, ty, C.camera.follow, dt);

        cam.shake = Math.max(0, cam.shake - dt * C.camera.shakeDecay * C.camera.shakeDecay);
        var shakeAmt = cam.shake * C.camera.shake;
        cam.shakeX = (Math.random() - 0.5) * shakeAmt;
        cam.shakeY = (Math.random() - 0.5) * shakeAmt;

        drawGround(world);

        /* One sorted list of everything that stands on the ground. */
        var drawables = [];
        var i;
        for (i = 0; i < world.props.length; i++) {
            var pr = world.props[i];
            drawables.push({ d: pr.x + pr.y, kind: "prop", o: pr });
        }
        for (i = 0; i < world.entities.length; i++) {
            var e = world.entities[i];
            if (e.removed) continue;
            if (e.kind === "boss") drawables.push({ d: e.x + e.y - 100, kind: "boss", o: e });
            else drawables.push({ d: e.x + e.y, kind: "ent", o: e });
        }
        drawables.sort(function (a, b) { return a.d - b.d; });

        /* Shadows first, all together, so nothing casts onto a body that
         * has not been drawn yet. */
        if (quality.shadow) {
            for (i = 0; i < drawables.length; i++) {
                var dd = drawables[i];
                if (dd.kind === "prop" && !dd.o.solid) continue;
                drawShadow(dd.o, dd.kind === "ent" || dd.kind === "boss" ? dd.o.r : dd.o.r * 1.2);
            }
        }

        for (i = 0; i < drawables.length; i++) {
            var d = drawables[i];
            if (d.kind === "prop") {
                drawProps(world, [d.o]);
            } else {
                drawEntity(world, d.o, d.kind === "boss");
            }
        }

        /* Hazards. */
        drawHazards(world);

        /* The extraction zone. */
        if (world.objective.extraction) {
            drawExtraction(world);
        }

        /* Marked targets get a marker. */
        for (i = 0; i < world.entities.length; i++) {
            var mk = world.entities[i];
            if (!mk.marked || mk.dead || mk.removed) continue;
            drawMarker(world, mk);
        }

        /* Shots and beams. */
        for (i = 0; i < world.shots.length; i++) {
            var s = world.shots[i];
            var col = s.team === "player" ? world.colors.acid : world.colors.spark;
            var sp = toScreen(s.x, s.y, 8);
            S.Raster.fillRect(buf, sp.x - 1, sp.y - 1, s.kind === "flame" ? 3 : 2, s.kind === "flame" ? 3 : 2, col);
        }
        for (i = 0; i < world.beams.length; i++) {
            var bm = world.beams[i];
            var b0 = toScreen(bm.x, bm.y, 10);
            var b1 = toScreen(bm.x + Math.cos(bm.angle) * 300, bm.y + Math.sin(bm.angle) * 300, 10);
            drawLine(b0.x, b0.y, b1.x, b1.y, world.colors.spark);
        }

        /* Particles. */
        drawParticles(world);

        /* Damage numbers. */
        drawPopups(world);

        /* The player, always on top of the crowd. */
        drawPlayer(world);

        /* Screen effects. */
        drawVignette(world);

        ctx.putImageData(imgData, 0, 0);
    }

    function drawShadow(o, r) {
        var c = toScreen(o.x, o.y, 0);
        var rad = r / C.camera.unitsPerPixel;
        var dark = S.Palette.snap(world_palette_id(), "#101318");
        for (var y = Math.floor(c.y - rad * 0.5); y <= c.y + rad * 0.5; y++) {
            if (y < 0 || y >= H) continue;
            var dy = (y - c.y) / (rad * 0.5);
            var half = Math.sqrt(Math.max(0, 1 - dy * dy)) * rad;
            S.Raster.ditherBlend(buf, Math.floor(c.x - half), y, Math.ceil(half * 2), 1,
                dark, 0.45, C.render.bayer);
        }
    }

    /* The palette id of whatever is being drawn. Set once per frame by
     * drawGround so the helpers can find it without threading it through
     * every call. */
    var currentPalette = "docks";
    function world_palette_id() { return currentPalette; }

    function drawEntity(world, e, isBoss) {
        var mesh = entityMesh(e);
        var ramps = rampsFor(world.biome.palette, entityColors(e));
        var scale = 1;

        if (e.kind === "prey") scale = 0.92;
        else if (e.kind === "foe") scale = 0.98;
        else if (e.kind === "rival") scale = e.r / 13;
        else if (e.kind === "boss") scale = e.r / 13;

        var bob = Math.sin(e.anim * 2) * 0.6;
        drawMesh(mesh, {
            x: e.x, y: e.y, z: bob,
            scale: scale,
            angle: e.facing,
            ramps: ramps
        });

        /* A downed thing is on the ground. */
        if (e.down && e.state === S.STATE.prey.down) {
            var c = toScreen(e.x, e.y, 2);
            S.Raster.ditherBlend(buf, Math.floor(c.x - 4), Math.floor(c.y - 1), 8, 2,
                S.Palette.snap(world.biome.palette, "#101318"), 0.55, C.render.bayer);
        }
    }

    function drawPlayer(world) {
        var p = world.player;
        var biome = world.biome;

        var ramp = S.Palette.ramp(biome.palette, "#8fbf5c");
        var rampDark = S.Palette.ramp(biome.palette, "#2a3320");
        var scale = p.radius / 11;

        /* The tentacles. Half of them are behind the body, which is what
         * makes the thing look like it has a body rather than a shell. */
        var count = 8;
        var attack = p.attackFx ? p.attackFx : null;
        for (var i = 0; i < count; i++) {
            var base = (i / count) * Math.PI * 2 + p.animT * 0.4;
            /* The two nearest the aim stretch out when you attack. */
            var near = Math.abs(S.angleDelta(base, p.facing));
            var reach = p.reach * 0.32;
            if (attack && near < 0.8) {
                reach = S.lerp(reach, p.reach * 0.95, 1 - near / 0.8) * attack.extend;
            }
            var wave = p.animT * 3.2 + i * 0.9;
            var px = p.x + Math.cos(base) * (p.radius * 0.55);
            var py = p.y + Math.sin(base) * (p.radius * 0.55);
            var behind = Math.cos(base) * PROJ.viewX + Math.sin(base) * PROJ.viewY < 0;
            if (!behind) {
                drawTentacle({
                    x: px, y: py, z: 3, angle: base, len: reach,
                    thick: Math.max(1.6, p.radius * 0.16), wave: wave,
                    ramp: ramp, segs: 5
                });
            }
        }

        /* The body. */
        var mesh = entityMesh(p);
        var ramps = rampsFor(biome.palette, entityColors(p));
        var open = 0;
        if (p.state === S.STATE.player.swallowing) open = 1;
        drawMesh(mesh, {
            x: p.x, y: p.y, z: 0,
            scale: scale,
            angle: p.facing,
            ramps: ramps
        });

        /* The maw, when it is open. */
        if (open) {
            var mc = toScreen(p.x + Math.cos(p.facing) * p.radius * 0.9,
                p.y + Math.sin(p.facing) * p.radius * 0.9, p.radius * 0.4);
            S.Raster.ditherBlend(buf, Math.floor(mc.x - 3), Math.floor(mc.y - 2), 6, 4,
                S.Palette.snap(biome.palette, "#6b1f26"), 0.8, C.render.bayer);
        }

        /* The attack sweep. */
        if (attack) {
            attack.t -= 1 / 60;
            var a0 = p.facing - attack.arc / 2;
            var a1 = p.facing + attack.arc / 2;
            var col = S.Palette.snap(biome.palette, attack.color);
            var steps = 8;
            for (var s = 0; s <= steps; s++) {
                var ang = S.lerp(a0, a1, s / steps);
                var px2 = p.x + Math.cos(ang) * p.reach;
                var py2 = p.y + Math.sin(ang) * p.reach;
                var sp = toScreen(px2, py2, 6);
                S.Raster.fillRect(buf, Math.floor(sp.x) - 1, Math.floor(sp.y) - 1, 2, 2, col);
            }
            if (attack.t <= 0) p.attackFx = null;
        }

        /* The bulge travelling down the body after a swallow. */
        if (p.bulge) {
            var bt = p.bulge.t / p.bulge.dur;
            var bx = p.x + Math.cos(p.facing) * p.radius * (1.2 - bt);
            var by = p.y + Math.sin(p.facing) * p.radius * (1.2 - bt);
            var bc = toScreen(bx, by, p.radius * 0.5);
            S.Raster.ditherBlend(buf, Math.floor(bc.x - 3), Math.floor(bc.y - 2), 6, 4,
                S.Palette.snap(biome.palette, "#8fbf5c"), 0.7, C.render.bayer);
        }
    }

    function drawHazards(world) {
        var i;
        for (i = 0; i < world.hazards.length; i++) {
            var h = world.hazards[i];
            if (h.kind === "fence") {
                var x0, y0, x1, y1;
                if (h.horizontal) {
                    x0 = h.x - h.len / 2; x1 = h.x + h.len / 2; y0 = y1 = h.y;
                } else {
                    y0 = h.y - h.len / 2; y1 = h.y + h.len / 2; x0 = x1 = h.x;
                }
                var a = toScreen(x0, y0, 10);
                var b = toScreen(x1, y1, 10);
                drawLine(a.x, a.y, b.x, b.y, S.Palette.snap(world.biome.palette, "#66b3a4"));
                /* Posts. */
                S.Raster.fillRect(buf, Math.floor(a.x) - 1, Math.floor(a.y) - 2, 2, 4, S.Palette.snap(world.biome.palette, "#3a434f"));
                S.Raster.fillRect(buf, Math.floor(b.x) - 1, Math.floor(b.y) - 2, 2, 4, S.Palette.snap(world.biome.palette, "#3a434f"));
            } else if (h.kind === "vent" && h.hot) {
                var c = toScreen(h.x, h.y, 0);
                var rad = h.r / C.camera.unitsPerPixel;
                for (var y = Math.floor(c.y - rad * 0.5); y <= c.y + rad * 0.5; y++) {
                    if (y < 0 || y >= H) continue;
                    var dy = (y - c.y) / (rad * 0.5);
                    var half = Math.sqrt(Math.max(0, 1 - dy * dy)) * rad;
                    S.Raster.ditherBlend(buf, Math.floor(c.x - half), y, Math.ceil(half * 2), 1,
                        S.Palette.snap(world.biome.palette, "#f98a2c"), 0.8, C.render.bayer);
                }
            } else if (h.kind === "spill") {
                var cs = toScreen(h.x, h.y, 0);
                var rads = h.r / C.camera.unitsPerPixel;
                S.Raster.ditherBlend(buf, Math.floor(cs.x - rads), Math.floor(cs.y - rads),
                    Math.ceil(rads * 2), Math.ceil(rads * 2),
                    S.Palette.snap(world.biome.palette, "#4fa87a"), 0.45, C.render.bayer);
            }
        }
    }

    function drawExtraction(world) {
        var ex = world.objective.extraction;
        var c = toScreen(ex.x, ex.y, 0);
        var rad = ex.r / C.camera.unitsPerPixel;
        var col = S.Palette.snap(world.biome.palette, "#8fbf5c");
        for (var y = Math.floor(c.y - rad * 0.5); y <= c.y + rad * 0.5; y++) {
            if (y < 0 || y >= H) continue;
            var dy = (y - c.y) / (rad * 0.5);
            var half = Math.sqrt(Math.max(0, 1 - dy * dy)) * rad;
            var pulse = 0.4 + 0.25 * Math.sin(world.time * 4);
            S.Raster.ditherBlend(buf, Math.floor(c.x - half), y, Math.ceil(half * 2), 1,
                col, pulse, C.render.bayer);
        }
        drawText(buf, "EXIT", Math.floor(c.x - textWidth("EXIT") / 2), Math.floor(c.y - rad * 0.6), col, 1);
    }

    function drawMarker(world, e) {
        var c = toScreen(e.x, e.y, 40);
        var col = S.Palette.snap(world.biome.palette, "#f2b23c");
        var bob = Math.sin(world.time * 5) * 2;
        var x = Math.floor(c.x), y = Math.floor(c.y + bob);
        /* A little chevron. */
        S.Raster.fillRect(buf, x - 3, y, 7, 1, col);
        S.Raster.fillRect(buf, x - 2, y + 1, 5, 1, col);
        S.Raster.fillRect(buf, x - 1, y + 2, 3, 1, col);
        /* A will bar under the target. */
        var w = Math.round(16 * S.clamp01(e.will / (e.maxWill || 1)));
        var barY = Math.floor(c.y + 14 + bob);
        S.Raster.fillRect(buf, x - 9, barY, 18, 2, S.Palette.snap(world.biome.palette, "#14181f"));
        S.Raster.fillRect(buf, x - 9, barY, w, 2, col);
    }

    function drawParticles(world) {
        var pool = world.particles.pool;
        for (var i = 0; i < pool.length; i++) {
            var q = pool[i];
            if (!q.alive) continue;
            var c = toScreen(q.x, q.y, q.z);
            var a = S.clamp01(q.life / q.maxLife);
            S.Raster.dot(buf, c.x, c.y, q.color, a);
            if (q.size > 1) S.Raster.dot(buf, c.x + 1, c.y, q.color, a * 0.6);
        }
    }

    function drawPopups(world) {
        var list = world.player.popups;
        for (var i = 0; i < list.length; i++) {
            var p = list[i];
            var c = toScreen(p.x, p.y, p.z);
            var a = S.clamp01(p.life / 0.6);
            var w = textWidth(p.text, p.big ? 2 : 1);
            var x = Math.floor(c.x - w / 2);
            var y = Math.floor(c.y);
            /* A shadow, so the number reads over any background. */
            drawText(buf, p.text, x + 1, y + 1, S.Palette.snap(world.biome.palette, "#0a0c10"), p.big ? 2 : 1);
            drawText(buf, p.text, x, y, p.color, p.big ? 2 : 1);
        }
    }

    /* A dashed line. A floor grid that is solid reads as a wireframe
     * world; a dashed one reads as a floor. */
    function drawDashed(x0, y0, x1, y1, color) {
        var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        var err = dx - dy;
        var x = Math.round(x0), y = Math.round(y0);
        var xe = Math.round(x1), ye = Math.round(y1);
        var guard = 0, on = true;
        while (guard++ < 4000) {
            if (on) S.Raster.pixel(buf, x, y, color);
            on = !on;
            if (x === xe && y === ye) break;
            var e2 = err * 2;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }
    }

    /* A Bresenham line, for beams and fences. */
    function drawLine(x0, y0, x1, y1, color) {
        var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        var err = dx - dy;
        var x = Math.round(x0), y = Math.round(y0);
        var xe = Math.round(x1), ye = Math.round(y1);
        var guard = 0;
        while (guard++ < 4000) {
            S.Raster.pixel(buf, x, y, color);
            if (x === xe && y === ye) break;
            var e2 = err * 2;
            if (e2 > -dy) { err -= dy; x += sx; }
            if (e2 < dx) { err += dx; y += sy; }
        }
    }

    function drawVignette(world) {
        /* A cheap vignette: darken the corners by dithering toward the
         * void colour. Only on the high tier, because it is a per-pixel
         * cost and the low tier needs the cycles elsewhere. */
        if (quality.glow < 1) return;
        var dark = S.Palette.snap(world.biome.palette, "#05070c");
        var cx = W / 2, cy = H / 2;
        var maxD = Math.sqrt(cx * cx + cy * cy);
        for (var y = 0; y < H; y += 1) {
            for (var x = 0; x < W; x += 2) {
                var dx = x - cx, dy = y - cy;
                var d = Math.sqrt(dx * dx + dy * dy) / maxD;
                if (d < 0.82) continue;
                var lvl = (d - 0.82) / 0.18 * 0.34;
                S.Raster.ditherBlend(buf, x, y, 2, 1, dark, lvl, C.render.bayer);
            }
        }
    }

    /* ===== public ===== */
    S.Render = {
        init: init,
        resize: resize,
        setQuality: setQuality,
        draw: draw,
        drawText: function (buffer, text, x, y, color, scale) { drawText(buffer || buf, text, x, y, color, scale); },
        textWidth: textWidth,
        /* Screen shake, called by the world when something lands. */
        shake: function (amount) {
            try {
                if (S.Storage.data().settings.reducedMotion) return;
            } catch (e) { }
            cam.shake = Math.min(C.camera.maxShake, cam.shake + amount);
        },
        bufferSize: function () { return { w: W, h: H, chunk: chunk }; },
        setPalette: function (id) { currentPalette = id; },
        unproject: function (sx, sy, out) {
            return unproject(sx, sy, out || { x: 0, y: 0 });
        },
        /* Where the camera is, so the minimap can draw the view box. */
        camera: function () { return { x: cam.x, y: cam.y }; }
    };
})(window.GU = window.GU || {});
