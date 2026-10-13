/*
 * SECTOR 7 - the low-poly renderer.
 *
 * No WebGL and no art assets. Every hull, rock, crate and station in the
 * sector is a small facet mesh built from primitives at load time, then drawn
 * as flat-shaded polygons through an oblique projection.
 *
 * Why that reads as low-poly rather than as flat 2D: each face gets its own
 * constant brightness from a single dot product of its 3D normal against one
 * key light. Because the projection is linear, a constant normal maps to a
 * constant screen gradient, so per-face lighting is exact and costs one
 * multiply per face.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;
    var P = S.PROJ;

    /* Hull meshes are authored at a convenient small size and drawn at this
     * one. Everything hull-shaped - engine flare offset, lock-on bracket -
     * is measured against it, so changing it rescales the whole look without
     * touching any of them. */
    var HULL_SCALE = 2.4;

    var LIGHT = S.LIGHT;
    var AMBIENT = 0.44;     /* How dark an unlit face gets. */
    var FILL = 0.16;        /* Cheap rim light so silhouettes stay readable. */

    var canvas = null;
    var ctx = null;
    var dpr = 1;
    var W = 0, H = 0;

    var cam = {
        x: 0, y: 0, zoom: 1, snapped: false,
        ox: 0, oy: 0, shake: 0,
    };

    var qualityName = "high";
    var quality = C.quality.tiers.high;

    /* Frame-time sampler that picks a quality tier on weak devices. */
    var perf = { frames: 0, accum: 0, locked: false, forced: "auto" };

    var meshCache = {};

    /* ===== Mesh construction =====
     * A mesh is { v: Float32Array(x,y,z * n), f: [{ i:[idx...], n:[x,y,z], tone }] }.
     */

    function box(w, h, d) {
        var x = w / 2, y = h / 2, z = d / 2;
        return {
            v: new Float32Array([
                -x, -y, -z, x, -y, -z, x, y, -z, -x, y, -z,
                -x, -y, z, x, -y, z, x, y, z, -x, y, z,
            ]),
            f: [
                { i: [0, 1, 2, 3], n: [0, 0, -1], tone: 0.72 },
                { i: [4, 5, 6, 7], n: [0, 0, 1], tone: 1.06 },
                { i: [0, 4, 5, 1], n: [0, -1, 0], tone: 0.84 },
                { i: [3, 2, 6, 7], n: [0, 1, 0], tone: 0.92 },
                { i: [1, 5, 6, 2], n: [1, 0, 0], tone: 1.0 },
                { i: [0, 3, 7, 4], n: [-1, 0, 0], tone: 0.78 },
            ],
        };
    }

    /* A polygonal frustum around the z axis: rings of radius rb at z=-h/2
     * and rt at z=+h/2. With rt=0 it is a pyramid, rb=0 an inverted one -
     * which is how the gems and the rock spikes are made. */
    function prism(sides, rb, rt, h, tone) {
        var v = new Float32Array(sides * 6);
        var f = [];
        var t = tone === undefined ? 1 : tone;
        var i;

        for (i = 0; i < sides; i++) {
            var a = (i / sides) * Math.PI * 2;
            var c = Math.cos(a), sn = Math.sin(a);
            var o = i * 6;
            v[o] = c * rb; v[o + 1] = sn * rb; v[o + 2] = -h / 2;
            v[o + 3] = c * rt; v[o + 4] = sn * rt; v[o + 5] = h / 2;
        }

        for (i = 0; i < sides; i++) {
            var j = (i + 1) % sides;
            var mid = ((i + 0.5) / sides) * Math.PI * 2;
            var nx = Math.cos(mid), ny = Math.sin(mid);
            var nz = rb === rt ? 0 : (rb - rt) / h;
            var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            f.push({
                i: [i, j, sides + j, sides + i],
                n: [nx / len, ny / len, nz / len],
                tone: t,
            });
        }

        if (rt > 0.001) f.push({ i: ring(sides, sides), n: [0, 0, 1], tone: t * 1.12 });
        if (rb > 0.001) f.push({ i: ring(sides, 0), n: [0, 0, -1], tone: t * 0.68 });
        return { v: v, f: f };
    }

    function ring(sides, offset) {
        var idx = [];
        for (var i = 0; i < sides; i++) idx.push(offset + i);
        return idx;
    }

    /* Jitter every vertex outward from the axis - turns a regular prism into
     * something that reads as a chipped asteroid. */
    function roughen(mesh, rng, amount, zAmount) {
        var v = mesh.v;
        for (var i = 0; i < v.length; i += 3) {
            var x = v[i], y = v[i + 1], z = v[i + 2];
            var r = Math.sqrt(x * x + y * y) || 1e-4;
            var k = 1 + (rng() - 0.5) * 2 * amount;
            v[i] = x * k;
            v[i + 1] = y * k;
            v[i + 2] = z + (rng() - 0.5) * 2 * (zAmount === undefined ? amount : zAmount);
        }
        return recomputeNormals(mesh);
    }

    /* Normals must be derived, never assumed, once the verts move. */
    function recomputeNormals(mesh) {
        for (var k = 0; k < mesh.f.length; k++) {
            var face = mesh.f[k];
            var idx = face.i;
            var a = idx[0] * 3, b = idx[1] * 3, c = idx[2] * 3;
            var ux = mesh.v[b] - mesh.v[a], uy = mesh.v[b + 1] - mesh.v[a + 1], uz = mesh.v[b + 2] - mesh.v[a + 2];
            var wx = mesh.v[c] - mesh.v[a], wy = mesh.v[c + 1] - mesh.v[a + 1], wz = mesh.v[c + 2] - mesh.v[a + 2];
            var nx = uy * wz - uz * wy;
            var ny = uz * wx - ux * wz;
            var nz = ux * wy - uy * wx;
            var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            face.n = [nx / len, ny / len, nz / len];
        }
        return mesh;
    }

    function scaleMesh(mesh, sx, sy, sz) {
        for (var i = 0; i < mesh.v.length; i += 3) {
            mesh.v[i] *= sx;
            mesh.v[i + 1] *= sy;
            mesh.v[i + 2] *= sz === undefined ? sx : sz;
        }
        return mesh;
    }

    function offsetMesh(mesh, dx, dy, dz) {
        for (var i = 0; i < mesh.v.length; i += 3) {
            mesh.v[i] += dx;
            mesh.v[i + 1] += dy;
            mesh.v[i + 2] += dz;
        }
        return mesh;
    }

    function rotZMesh(mesh, a) {
        var c = Math.cos(a), s = Math.sin(a);
        for (var i = 0; i < mesh.v.length; i += 3) {
            var x = mesh.v[i], y = mesh.v[i + 1];
            mesh.v[i] = c * x - s * y;
            mesh.v[i + 1] = s * x + c * y;
        }
        return mesh;
    }

    function merge(meshes) {
        var totalV = 0, totalF = 0, i;
        for (i = 0; i < meshes.length; i++) {
            totalV += meshes[i].v.length / 3;
            totalF += meshes[i].f.length;
        }
        var v = new Float32Array(totalV * 3);
        var f = [];
        var vo = 0;
        for (i = 0; i < meshes.length; i++) {
            v.set(meshes[i].v, vo * 3);
            for (var j = 0; j < meshes[i].f.length; j++) {
                var src = meshes[i].f[j];
                var idx = [];
                for (var k = 0; k < src.i.length; k++) idx.push(src.i[k] + vo);
                f.push({ i: idx, n: src.n, tone: src.tone });
            }
            vo += meshes[i].v.length / 3;
        }
        return { v: v, f: f };
    }

    /* ===== Hulls =====
     * All hulls point along +x, so heading 0 is nose-right.
     */

    /* Player interceptor: long diamond fuselage, swept wings, canopy,
     * twin engines. */
    function hullFighter() {
        return merge([
            scaleMesh(prism(4, 5.2, 2.6, 3.0), 2.9, 1, 1),
            offsetMesh(scaleMesh(prism(4, 3.0, 1.4, 2.4), 1.5, 0.8, 0.9), 3.0, 0, 1.9),
            rotZMesh(offsetMesh(box(11, 13, 1.1), -2.5, 0, -0.6), 0.5),
            offsetMesh(box(4, 2.2, 3.2), -7.5, 4.6, 1.2),
            offsetMesh(box(4, 2.2, 3.2), -7.5, -4.6, 1.2),
            offsetMesh(box(4.4, 2.6, 2.6), -8.6, 3.0, 0),
            offsetMesh(box(4.4, 2.6, 2.6), -8.6, -3.0, 0),
        ]);
    }

    /* NPC scout: stubbier, blunter, one wide wing. */
    function hullScout() {
        return merge([
            scaleMesh(prism(5, 4.6, 3.2, 3.2), 1.9, 1, 1),
            offsetMesh(scaleMesh(prism(5, 2.6, 0.8, 2.0), 1.1, 1, 0.8), 2.2, 0, 1.6),
            rotZMesh(offsetMesh(box(6, 15, 1.0), -1.6, 0, -0.4), 0.34),
            offsetMesh(box(3.4, 2.0, 2.2), -4.6, 0, 0),
        ]);
    }

    /* NPC gunship: wide and flat with two outboard pods. */
    function hullGunship() {
        return merge([
            scaleMesh(prism(6, 6.0, 4.4, 3.6), 1.7, 1, 1),
            offsetMesh(box(9, 3.0, 2.0), 1.0, 6.6, -0.4),
            offsetMesh(box(9, 3.0, 2.0), 1.0, -6.6, -0.4),
            offsetMesh(box(3.6, 3.6, 2.4), -6.2, 4.4, 0),
            offsetMesh(box(3.6, 3.6, 2.4), -6.2, -4.4, 0),
            offsetMesh(scaleMesh(prism(6, 2.0, 0.6, 1.6), 1, 1, 1), 5.4, 0, 2.0),
        ]);
    }

    /* NPC heavy: a slab with a heavy prow. Slow, and it hurts. */
    function hullHeavy() {
        return merge([
            scaleMesh(prism(6, 8.2, 6.4, 4.6), 1.35, 1, 1),
            offsetMesh(scaleMesh(prism(6, 4.0, 0.6, 3.4), 1, 1, 1), 12.5, 0, 0),
            offsetMesh(box(14, 4.0, 2.4), -1.0, 8.4, -0.6),
            offsetMesh(box(14, 4.0, 2.4), -1.0, -8.4, -0.6),
            offsetMesh(box(4.0, 5.0, 3.4), -11.0, 5.0, 0),
            offsetMesh(box(4.0, 5.0, 3.4), -11.0, -5.0, 0),
        ]);
    }

    /* Hull meshes are geometry data, not per-entity state, so there are only
     * ever five of them. Building one per ship was the single most wasteful
     * thing in the renderer: 13 NPCs each rebuilding identical hulls on
     * their first frame. */
    function hullFor(tier, isPlayer) {
        var key = isPlayer ? "hullPlayer"
            : tier <= 2 ? "hullScout"
            : tier <= 4 ? "hullGunship"
            : "hullHeavy";
        if (!meshCache[key]) {
            var m = isPlayer ? hullFighter()
                : tier <= 2 ? hullScout()
                : tier <= 4 ? hullGunship()
                : hullHeavy();
            meshCache[key] = scaleMesh(m, HULL_SCALE, HULL_SCALE, HULL_SCALE);
        }
        return meshCache[key];
    }

    /* A gem: two pyramids base to base. Reads as a crystal from any angle. */
    function hullGem(r) {
        return merge([
            scaleMesh(prism(6, 0, r, r * 1.7), 1, 1, 1),
            offsetMesh(scaleMesh(prism(6, r, 0, r * 1.7), 1, 1, 1), 0, 0, r * 1.7),
        ]);
    }

    /* ===== Station =====
     * Built once, split into a static core and a ring that turns, so the
     * only motion in the background is motion that reads as machinery.
     */
    function buildStation() {
        var parts = [
            offsetMesh(scaleMesh(prism(12, 152, 148, 8), 1, 1, 1), 0, 0, -16),
            offsetMesh(prism(8, 62, 50, 46), 0, 0, 14),
            offsetMesh(prism(8, 46, 30, 22), 0, 0, 48),
            offsetMesh(scaleMesh(prism(6, 9, 3, 30), 1, 1, 1), 0, 0, 74),
        ];
        for (var i = 0; i < 4; i++) {
            var a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            parts.push(rotZMesh(offsetMesh(scaleMesh(box(96, 15, 9), 1, 1, 1), 76, 0, -3), a));
            parts.push(rotZMesh(offsetMesh(box(26, 22, 4), 122, 0, 3), a));
        }

        return {
            core: merge(parts),
            ring: merge([
                offsetMesh(scaleMesh(prism(12, 104, 104, 5), 1, 1, 1), 0, 0, 6),
                offsetMesh(scaleMesh(box(150, 7, 3), 1, 1, 1), 0, 0, 9),
                rotZMesh(offsetMesh(scaleMesh(box(150, 7, 3), 1, 1, 1), 0, 0, 9), Math.PI / 2),
            ]),
        };
    }

    /* ===== Colour ===== */
    var rgbCache = {};

    function parseHex(hex) {
        var c = rgbCache[hex];
        if (c) return c;
        var h = hex.replace("#", "");
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        rgbCache[hex] = c;
        return c;
    }

    function shade(rgb, amount) {
        var r = (rgb[0] * amount) | 0;
        var g = (rgb[1] * amount) | 0;
        var b = (rgb[2] * amount) | 0;
        if (r > 255) r = 255;
        if (g > 255) g = 255;
        if (b > 255) b = 255;
        return "rgb(" + r + "," + g + "," + b + ")";
    }

    function mixTo(rgb, target, t) {
        return [
            rgb[0] + (target[0] - rgb[0]) * t,
            rgb[1] + (target[1] - rgb[1]) * t,
            rgb[2] + (target[2] - rgb[2]) * t,
        ];
    }

    /* ===== Glow sprite =====
     * Every glow in the game is the same radial falloff, so it is rendered
     * once into an offscreen canvas and blitted. Creating a radial gradient
     * per bullet per frame was measurably the most expensive thing in the
     * old renderer.
     */
    var glowSprite = null;

    function buildGlowSprite() {
        var size = 128;
        var c = document.createElement("canvas");
        c.width = size;
        c.height = size;
        var g = c.getContext("2d");
        var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.28, "rgba(255,255,255,0.55)");
        grad.addColorStop(0.62, "rgba(255,255,255,0.14)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, size, size);
        glowSprite = c;
    }

    function glow(sx, sy, radius, rgb, alpha) {
        if (radius <= 0 || alpha <= 0) return;
        if (!glowSprite) buildGlowSprite();
        var prev = ctx.globalAlpha;
        ctx.globalAlpha = prev * Math.min(1, alpha);
        ctx.drawImage(tintedSprite(rgb), sx - radius, sy - radius, radius * 2, radius * 2);
        ctx.globalAlpha = prev;
    }

    /* One cached sprite per colour. The sector only uses a handful of hues,
     * so this is a dozen small canvases created once. */
    var spriteCache = {};

    function tintedSprite(rgb) {
        var key = (rgb[0] | 0) + "," + (rgb[1] | 0) + "," + (rgb[2] | 0);
        var s = spriteCache[key];
        if (s) return s;
        s = document.createElement("canvas");
        s.width = glowSprite.width;
        s.height = glowSprite.height;
        var g = s.getContext("2d");
        g.drawImage(glowSprite, 0, 0);
        g.globalCompositeOperation = "source-in";
        g.fillStyle = "rgb(" + (rgb[0] | 0) + "," + (rgb[1] | 0) + "," + (rgb[2] | 0) + ")";
        g.fillRect(0, 0, s.width, s.height);
        spriteCache[key] = s;
        return s;
    }

    /* ===== Projection & mesh draw ===== */

    /* Screen coordinates, origin at the canvas top-left. A point sitting on
     * the camera must land dead centre - that invariant is the entire reason
     * this is a camera, and drawMesh's screen-bbox cull is written against
     * it, so it is asserted directly in tests/render.test.js. */
    function project(x, y, z) {
        return [
            (x - cam.x) * cam.zoom + cam.ox + z * P.yaw * cam.zoom + W * 0.5,
            (y - cam.y) * cam.zoom * P.ySquash - z * cam.zoom * P.zTilt + cam.oy + H * 0.5,
        ];
    }

    function depthOf(x, y, z) {
        return x * P.viewX + y * P.viewY + z * P.viewZ;
    }

    /* Scratch buffers, grown once and reused. Nothing in the draw path
     * allocates. */
    var buf = new Float32Array(512);
    var sxA = new Float32Array(64);
    var syA = new Float32Array(64);
    var faceOrder = new Int32Array(256);
    var faceDepth = new Float32Array(256);

    function drawMesh(mesh, x, y, z, heading, rgb, scale) {
        var verts = mesh.v.length / 3;
        if (verts * 3 > buf.length) buf = new Float32Array(verts * 3);
        var v = mesh.v;
        var s = scale === undefined ? 1 : scale;
        var c = Math.cos(heading) * s;
        var sn = Math.sin(heading) * s;

        /* Write into buf as a packed xyz triple. `o` must step by 3, not by
         * 1: the face loop below reads back at index*3, so a stride-1 write
         * silently smears every vertex into its neighbour's slot. Small hulls
         * still looked plausible under that; the station turned to soup. */
        for (var i = 0, o = 0; i < v.length; i += 3, o += 3) {
            var vx = v[i], vy = v[i + 1];
            buf[o] = c * vx - sn * vy + x;
            buf[o + 1] = sn * vx + c * vy + y;
            buf[o + 2] = v[i + 2] * s + z;
        }

        var faces = mesh.f;
        var count = 0;

        for (var f = 0; f < faces.length; f++) {
            var face = faces[f];
            var nx = face.n[0], ny = face.n[1], nz = face.n[2];

            /* Cull back faces against the projection's own view vector.
             * Rotating the normal by the same z-rotation as the verts keeps
             * this exact for every heading. */
            var rx = c * nx - sn * ny;
            var ry = sn * nx + c * ny;
            if (rx * P.viewX + ry * P.viewY + nz * P.viewZ <= 0) continue;

            var idx = face.i;
            var n = idx.length;
            if (n > sxA.length) { sxA = new Float32Array(n); syA = new Float32Array(n); }

            var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            var cx = 0, cy = 0, cz = 0;

            for (var k = 0; k < n; k++) {
                var vi = idx[k] * 3;
                var wx = buf[vi], wy = buf[vi + 1], wz = buf[vi + 2];
                cx += wx; cy += wy; cz += wz;
                var sp = project(wx, wy, wz);
                sxA[k] = sp[0];
                syA[k] = sp[1];
                if (sp[0] < minX) minX = sp[0];
                if (sp[0] > maxX) maxX = sp[0];
                if (sp[1] < minY) minY = sp[1];
                if (sp[1] > maxY) maxY = sp[1];
            }

            if (maxX < 0 || minX > W || maxY < 0 || minY > H) continue;

            faceDepth[count] = depthOf(cx / n, cy / n, cz / n);
            faceOrder[count] = f;
            count++;
        }

        /* Painter's order within the mesh. Hulls are assemblies of convex
         * parts, so a centroid sort is enough and costs nothing to maintain. */
        for (i = 1; i < count; i++) {
            var key = faceOrder[i];
            var kd = faceDepth[i];
            var j = i - 1;
            while (j >= 0 && faceDepth[j] > kd) {
                faceDepth[j + 1] = faceDepth[j];
                faceOrder[j + 1] = faceOrder[j];
                j--;
            }
            faceDepth[j + 1] = kd;
            faceOrder[j + 1] = key;
        }

        for (i = 0; i < count; i++) {
            var fc = faces[faceOrder[i]];
            var fi = fc.i;
            var fn = fi.length;

            for (var q = 0; q < fn; q++) {
                var vi2 = fi[q] * 3;
                var wx2 = buf[vi2], wy2 = buf[vi2 + 1], wz2 = buf[vi2 + 2];
                var sp2 = project(wx2, wy2, wz2);
                sxA[q] = sp2[0];
                syA[q] = sp2[1];
            }

            var fnx = fc.n[0], fny = fc.n[1], fnz = fc.n[2];
            var frx = c * fnx - sn * fny;
            var fry = sn * fnx + c * fny;
            var lam = frx * LIGHT[0] + fry * LIGHT[1] + fnz * LIGHT[2];
            /* Wrap the light: a face lit from behind still gets a sliver,
             * which keeps the shadow side from going flat black. */
            var lit = lam > 0 ? lam : -lam * 0.55;
            var amount = (AMBIENT + (1 - AMBIENT) * lit + FILL * (1 - lit)) * (fc.tone || 1);

            ctx.fillStyle = shade(rgb, amount);
            ctx.beginPath();
            ctx.moveTo(sxA[0], syA[0]);
            for (q = 1; q < fn; q++) ctx.lineTo(sxA[q], syA[q]);
            ctx.closePath();
            ctx.fill();

            if (quality.outlines) {
                ctx.strokeStyle = shade(rgb, amount * 0.4);
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    }

    /* ===== Backdrop ===== */

    function mod(a, n) { return ((a % n) + n) % n; }

    function drawNebula(world) {
        if (!quality.nebula) return;
        for (var i = 0; i < world.nebulae.length; i++) {
            var neb = world.nebulae[i];
            var p = project(neb.x, neb.y, 0);
            var r = neb.r * cam.zoom;
            if (p[0] + r < 0 || p[0] - r > W || p[1] + r < 0 || p[1] - r > H) continue;

            var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
            g.addColorStop(0, "rgba(" + neb.hue + "," + neb.a + ")");
            g.addColorStop(1, "rgba(" + neb.hue + ",0)");
            ctx.fillStyle = g;
            ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
        }
    }

    function drawStars(world) {
        var stars = world.stars;
        if (!stars.length) return;
        var field = world.starField;
        var layers = quality.stars;
        var t = world.time;

        ctx.fillStyle = "#ffffff";
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            if (s.layer >= layers) continue;

            /* Parallax per layer, wrapped into a field around the camera:
             * effectively infinite stars, zero allocations. */
            var par = 0.12 + s.layer * 0.14;
            var x = mod(s.x + cam.x * par, field) - field / 2 + W / 2;
            var y = mod(s.y + cam.y * par, field) - field / 2 + H / 2;
            if (x < 0 || x > W || y < 0 || y > H) continue;

            ctx.globalAlpha = s.bright * (0.75 + 0.25 * Math.sin(t * 1.7 + s.tw));
            ctx.fillRect(x, y, s.size, s.size);
        }
        ctx.globalAlpha = 1;
    }

    /* A faint grid, so a slow ship in an empty stretch does not look like it
     * is standing still. */
    function drawGrid() {
        var step = 400;
        var zoom = cam.zoom;
        var left = cam.x - (W / 2) / zoom;
        var right = cam.x + (W / 2) / zoom;
        var top = cam.y - (H / 2) / (zoom * P.ySquash);
        var bottom = cam.y + (H / 2) / (zoom * P.ySquash);

        ctx.strokeStyle = "rgba(70,110,170,0.10)";
        ctx.lineWidth = 1;
        ctx.beginPath();

        var gx = Math.floor(left / step) * step;
        for (; gx <= right; gx += step) {
            var a = project(gx, top, 0);
            var b = project(gx, bottom, 0);
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
        }
        var gy = Math.floor(top / step) * step;
        for (; gy <= bottom; gy += step) {
            var c = project(left, gy, 0);
            var d = project(right, gy, 0);
            ctx.moveTo(c[0], c[1]);
            ctx.lineTo(d[0], d[1]);
        }
        ctx.stroke();
    }

    function drawBounds(world) {
        var s = world.size;
        var pts = [
            project(0, 0, 0), project(s, 0, 0), project(s, s, 0), project(0, s, 0),
        ];
        /* Skip the whole edge when it is entirely off screen - a 4px stroke
         * around a 4800-unit rect is a lot of wasted fill on a phone. */
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (var i = 0; i < 4; i++) {
            if (pts[i][0] < minX) minX = pts[i][0];
            if (pts[i][0] > maxX) maxX = pts[i][0];
            if (pts[i][1] < minY) minY = pts[i][1];
            if (pts[i][1] > maxY) maxY = pts[i][1];
        }
        if (maxX < 0 || minX > W || maxY < 0 || minY > H) return;

        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();

        ctx.strokeStyle = "rgba(90,150,220,0.45)";
        ctx.lineWidth = 3;
        ctx.stroke();

        /* A slow pulse so the boundary reads as an active fence rather than
         * a map edge that happens to be there. */
        ctx.strokeStyle = "rgba(120,200,255," + (0.10 + 0.06 * Math.sin(world.time * 1.4)).toFixed(3) + ")";
        ctx.lineWidth = 10;
        ctx.stroke();
    }

    /* ===== Entities ===== */

    function drawStation(world) {
        var st = meshCache.station;
        var c = project(world.station.x, world.station.y, 0);
        var ringR = C.world.dockRadius * cam.zoom;
        var pulse = 0.5 + 0.5 * Math.sin(world.time * 2.2);

        drawMesh(st.ring, world.station.x, world.station.y, 8, world.time * 0.22, parseHex(S.COLORS.station));
        drawMesh(st.core, world.station.x, world.station.y, 0, 0, parseHex(S.COLORS.station));

        /* Dock ring: the only thing in the world that tells you where you
         * may land, so it glows and animates. */
        ctx.save();
        /* A soft band around the dock radius, not a disc over the station.
         * An additive glow here saturates the structure to flat cyan and the
         * player can no longer read the one landmark the map is built
         * around, which is exactly backwards. */
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(94,234,212," + (0.05 + pulse * 0.03).toFixed(3) + ")";
        ctx.lineWidth = Math.max(6, ringR * 0.55);
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], ringR, ringR * P.ySquash, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(94,234,212," + (0.3 + pulse * 0.2).toFixed(3) + ")";
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 10]);
        ctx.lineDashOffset = -world.time * 26;
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], ringR, ringR * P.ySquash, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    function drawShip(world, ship) {
        prepareShip(ship);

        var rgb = parseHex(ship.color);
        if (ship.hitFlash > 0) rgb = mixTo(rgb, [255, 255, 255], 0.7);
        /* Spawn and undock invulnerability reads as a flicker. */
        if (ship.invuln > 0 && ((ship.invuln * 9) | 0) % 2 === 0) return;

        drawMesh(ship.mesh, ship.x, ship.y, ship.z, ship.heading, rgb, ship.scale);

        /* Engine flare, sized by throttle: the main read for "am I moving". */
        if (!ship.docked) {
            var ang = ship.heading + Math.PI;
            var tail = 11 * HULL_SCALE * (ship.scale || 1);
            var ex = ship.x + Math.cos(ang) * tail;
            var ey = ship.y + Math.sin(ang) * tail;
            var p = project(ex, ey, ship.z);
            var flicker = 0.75 + 0.25 * Math.sin(world.time * 34 + ship.id);
            var r = (5 + ship.throttle * 7) * cam.zoom * flicker;

            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            glow(p[0], p[1], r * 2.4, mixTo(rgb, [255, 240, 200], 0.6),
                0.45 * (0.3 + ship.throttle * 0.7));
            ctx.restore();
        }

        var frac = ship.hull / ship.maxHull;

        /* Lock-on bracket: tells you what the soft aim has latched onto. */
        if (ship.isPlayer && ship.lockTarget && ship.lockTarget.alive) {
            var t = ship.lockTarget;
            var tp = project(t.x, t.y, t.z);
            var rr = (t.radius + 12) * cam.zoom;
            ctx.strokeStyle = "rgba(255,110,130,0.8)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tp[0] - rr, tp[1] - rr * 0.6);
            ctx.lineTo(tp[0] - rr, tp[1] - rr);
            ctx.lineTo(tp[0] - rr * 0.5, tp[1] - rr);
            ctx.stroke();

            ctx.strokeStyle = "rgba(255,110,130,0.85)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(tp[0], tp[1], rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * S.clamp(frac, 0, 1));
            ctx.stroke();
        }

        /* Hull bar under each NPC: you should never lose track of what you are
         * shooting, or how close it is to dying. */
        if (!ship.isPlayer) {
            var sp = project(ship.x, ship.y, ship.z - 15);
            var bw = Math.max(20, ship.radius * 2) * cam.zoom;
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(sp[0] - bw / 2, sp[1], bw, 3);
            ctx.fillStyle = frac > 0.5 ? "#ff8a5c" : "#ff5470";
            ctx.fillRect(sp[0] - bw / 2, sp[1], bw * S.clamp(frac, 0, 1), 3);
        }
    }

    function drawRock(world, rock) {
        var base = rock.rich ? S.COLORS.rockRich : S.COLORS.rock;
        var rgb = parseHex(rock.hitFlash > 0 ? "#e2e8f0" : base);
        drawMesh(rock.mesh, rock.x, rock.y, rock.z, rock.spin, rgb);

        if (!rock.alive) return;
        /* Rich rocks carry a real crystal cache and are the sector's main
         * crystal income, so they have to read as worth shooting from a
         * glance - a uniform glint on every rock told the player nothing. */
        var p = project(rock.x, rock.y, rock.z + rock.r * 0.7);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        glow(p[0], p[1], (rock.rich ? 20 : 8) * cam.zoom,
            parseHex(rock.rich ? S.COLORS.crystal : S.COLORS.crystal), rock.rich ? 0.42 : 0.16);
        if (rock.rich) {
            ctx.strokeStyle = "rgba(125,211,252,0.5)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(p[0], p[1], 16 * cam.zoom, 16 * cam.zoom * P.ySquash, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawCrate(world, crate) {
        var p = project(crate.x, crate.y, crate.z);
        if (p[0] < -70 || p[0] > W + 70 || p[1] < -70 || p[1] > H + 70) return;

        drawMesh(meshCache.crate, crate.x, crate.y, crate.z, crate.spin, parseHex(S.COLORS.energy));

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        glow(p[0], p[1], 24 * cam.zoom, parseHex(S.COLORS.energy), 0.2);
        ctx.restore();
    }

    function drawPickup(world, pick) {
        /* Blink out as the TTL runs down, so expiring loot is never a
         * surprise you lose energy to. */
        if (pick.life < 5 && ((pick.life * 6) | 0) % 2 === 0) return;

        var bob = Math.sin(world.time * 2.6 + pick.spin) * 3;
        var sp = project(pick.x, pick.y, pick.z + bob);
        if (sp[0] < -50 || sp[0] > W + 50 || sp[1] < -50 || sp[1] > H + 50) return;

        var mesh = pick.kind === "energy" ? meshCache.chunk : meshCache.gem;
        var col = pick.kind === "energy" ? S.COLORS.energy : S.COLORS.crystal;

        drawMesh(mesh, pick.x, pick.y, pick.z + bob, pick.spin, parseHex(col));

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        glow(sp[0], sp[1], (pick.kind === "energy" ? 15 : 18) * cam.zoom, parseHex(col), 0.3);
        ctx.restore();
    }

    function drawBullets(world) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        var list = world.bullets;
        for (var i = 0; i < list.length; i++) {
            var b = list[i];
            if (!b.on) continue;

            var p = project(b.x, b.y, b.z);
            if (p[0] < -24 || p[0] > W + 24 || p[1] < -24 || p[1] > H + 24) continue;

            var rgb = parseHex(b.color);
            var r = b.r * cam.zoom * 2.2;
            glow(p[0], p[1], r * 3.2, rgb, 0.6);

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(p[0], p[1], Math.max(1.2, r * 0.45), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawParticles(world) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        var list = world.particles;
        for (var i = 0; i < list.length; i++) {
            var pt = list[i];
            if (!pt.on) continue;
            var p = project(pt.x, pt.y, pt.z);
            if (p[0] < -24 || p[0] > W + 24 || p[1] < -24 || p[1] > H + 24) continue;

            var k = pt.life / pt.max;
            ctx.globalAlpha = k;
            ctx.fillStyle = pt.color;

            if (pt.kind === "shard") {
                /* Debris as actual little triangles - the one place the
                 * low-poly language pays off most visibly. */
                var s = pt.size * cam.zoom * k;
                ctx.beginPath();
                ctx.moveTo(p[0], p[1] - s);
                ctx.lineTo(p[0] + s * 0.8, p[1] + s * 0.7);
                ctx.lineTo(p[0] - s * 0.8, p[1] + s * 0.7);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(p[0], p[1], Math.max(0.6, pt.size * cam.zoom * k), 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function drawFloaters(world) {
        ctx.save();
        ctx.font = "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        for (var i = 0; i < world.floaters.length; i++) {
            var f = world.floaters[i];
            if (!f.on) continue;
            var p = project(f.x, f.y, f.z);
            var k = S.clamp(f.life / 0.9, 0, 1);
            ctx.globalAlpha = k;
            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgba(0,0,0,0.85)";
            ctx.strokeText(f.text, p[0], p[1]);
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, p[0], p[1]);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function drawDockRing(world) {
        var player = world.player;
        if (!player || player.docked) return;
        var ps = S.Player ? S.Player.state : null;
        var inZone = S.World.inDockZone(player.x, player.y);
        if (!inZone && (!ps || ps.dockProgress <= 0)) return;

        var c = project(world.station.x, world.station.y, 0);
        var ringR = C.world.dockRadius * cam.zoom;
        var k = ps ? S.clamp(ps.dockProgress / C.world.dockTime, 0, 1) : 0;

        ctx.save();
        ctx.strokeStyle = "rgba(94,234,212,0.95)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], ringR, ringR * P.ySquash, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
        ctx.stroke();

        if (inZone) {
            ctx.font = "700 12px system-ui, -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.fillStyle = "#5eead4";
            ctx.fillText("HOLD DOCK", c[0], c[1] - ringR * P.ySquash - 16);
        }
        ctx.restore();
    }

    /* ===== Hazards =====
     * Each sector's hazard has to be legible before it hits you. A well you
     * cannot see is a bug; a storm that scrambles the stick without warning
     * is worse.
     */
    function drawHazards(world) {
        var hz = world.hazards;
        if (!hz || !hz.length) return;
        var accent = parseHex(world.sector ? world.sector.palette.accent : S.COLORS.player);

        for (var i = 0; i < hz.length; i++) {
            var h = hz[i];
            var c = project(h.x, h.y, 0);
            var r = h.r * cam.zoom;
            if (c[0] + r < 0 || c[0] - r > W || c[1] + r < 0 || c[1] - r > H) continue;

            ctx.save();
            ctx.globalCompositeOperation = "lighter";

            if (h.kind === "storm") {
                /* Off: a faint boundary so the player knows the storm is a
                 * place. On: a hard-edged crackle they cannot miss. */
                var live = h.strength;
                ctx.strokeStyle = "rgba(94,234,212," + (0.10 + live * 0.42).toFixed(3) + ")";
                ctx.lineWidth = 2 + live * 3;
                ctx.beginPath();
                ctx.ellipse(c[0], c[1], r, r * P.ySquash, 0, 0, Math.PI * 2);
                ctx.stroke();
                if (live > 0) {
                    /* Crackle: arcs sampled from the phase, so it flickers
                     * without a per-frame random and a wall of overdraw. */
                    ctx.strokeStyle = "rgba(180,255,250," + (live * 0.5).toFixed(3) + ")";
                    ctx.lineWidth = 1.5;
                    for (var k = 0; k < 9; k++) {
                        var a = (k / 9) * Math.PI * 2 + world.time * 3 + h.phase;
                        var rr = r * (0.55 + 0.42 * Math.abs(Math.sin(a * 2.3 + world.time * 6)));
                        ctx.beginPath();
                        ctx.moveTo(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * P.ySquash);
                        ctx.lineTo(c[0] + Math.cos(a + 0.5) * rr * 0.6,
                                   c[1] + Math.sin(a + 0.5) * rr * 0.6 * P.ySquash);
                        ctx.stroke();
                    }
                }
            } else if (h.kind === "void") {
                /* Drawn dark rather than bright: this is the one hazard that
                 * takes something away instead of adding noise. */
                ctx.globalCompositeOperation = "source-over";
                ctx.fillStyle = "rgba(10,6,22,0.55)";
                ctx.beginPath();
                ctx.ellipse(c[0], c[1], r, r * P.ySquash, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = "rgba(196,181,253," + (0.14 + h.strength * 0.16).toFixed(3) + ")";
                ctx.lineWidth = 1.5;
                ctx.setLineDash([6, 12]);
                ctx.lineDashOffset = world.time * 14;
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                /* Well: a spiral so it reads as pulling rather than as a
                 * flat danger circle. */
                ctx.strokeStyle = "rgba(253,164,175," + (0.16 + h.strength * 0.2).toFixed(3) + ")";
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (var t2 = 0; t2 < 72; t2++) {
                    var ang = (t2 / 72) * Math.PI * 4 + world.time * 0.5 + h.phase;
                    var rad = r * (t2 / 72) * 0.92;
                    var px = c[0] + Math.cos(ang) * rad;
                    var py = c[1] + Math.sin(ang) * rad * P.ySquash;
                    if (t2 === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.stroke();
                ctx.fillStyle = "rgba(253,164,175,0.06)";
                ctx.beginPath();
                ctx.ellipse(c[0], c[1], r, r * P.ySquash, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
        void accent;
    }

    function drawMissiles(world) {
        var list = world.missiles;
        if (!list) return;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (var i = 0; i < list.length; i++) {
            var m = list[i];
            if (!m.on) continue;
            var p = project(m.x, m.y, m.z);
            var q = project(m.x - m.vx * 0.03, m.y - m.vy * 0.03, m.z);
            var rgb = parseHex(m.ownerIsPlayer ? "#7dd3fc" : "#ffb45e");
            ctx.strokeStyle = shade(rgb, 0.9);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p[0], p[1]);
            ctx.lineTo(q[0], q[1]);
            ctx.stroke();
            glow(p[0], p[1], 9 * cam.zoom, rgb, 0.55);
        }
        ctx.restore();
    }

    function drawMines(world) {
        var list = world.mines;
        if (!list) return;
        for (var i = 0; i < list.length; i++) {
            var m = list[i];
            if (!m.on) continue;
            var p = project(m.x, m.y, m.z);
            /* Unarmed mines are dim: you must not be able to drop one on
             * yourself by accident, and an arming flash sells the delay. */
            var armed = m.arm <= 0;
            ctx.fillStyle = armed ? "#ffb45e" : "rgba(150,160,175,0.6)";
            ctx.beginPath();
            ctx.arc(p[0], p[1], Math.max(2, 5 * cam.zoom), 0, Math.PI * 2);
            ctx.fill();
            if (armed) {
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                glow(p[0], p[1], 14 * cam.zoom, parseHex("#ff5470"), 0.22 + 0.12 * Math.sin(world.time * 5));
                ctx.restore();
                ctx.strokeStyle = "rgba(255,84,112,0.45)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(p[0], p[1], m.radius * cam.zoom, m.radius * cam.zoom * P.ySquash, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    /* The bounty hunter gets a marker so the player can find the thing that
     * is actively trying to kill them across a 900-unit view. */
    function drawBountyMarker(world) {
        var ship = null;
        for (var i = 0; i < world.ships.length; i++) {
            if (world.ships[i].isBounty) { ship = world.ships[i]; break; }
        }
        if (!ship) return;
        var p = project(ship.x, ship.y, ship.z);
        var e = edgePoint(p[0], p[1], 60);
        ctx.save();
        if (!e.inside) {
            var c = project(world.player ? world.player.x : p[0],
                world.player ? world.player.y : p[1], 0);
            chevron(e.x, e.y, Math.atan2(e.y - c[1], e.x - c[0]), 13, "#ff5470");
            ctx.font = "800 10px ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.fillStyle = "#ff8a9b";
            ctx.fillText("WANTED", e.x, e.y + 26);
        } else {
            ctx.strokeStyle = "rgba(255,84,112,0.9)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = -world.time * 20;
            ctx.beginPath();
            ctx.ellipse(p[0], p[1], (ship.radius + 14) * cam.zoom,
                (ship.radius + 14) * cam.zoom * P.ySquash, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();
    }

    /* ===== Player-facing overlays =====
     * Everything here answers a question the player cannot answer from the
     * world view alone: which way is the station, which way did that shot
     * come from, and how badly am I hurt right now.
     */

    /* Clamp a point to the screen edge with a margin, and say if it could not
     * be clamped because it was already on screen. */
    function edgePoint(x, y, margin) {
        var inside = x > margin && x < W - margin && y > margin && y < H - margin;
        if (inside) return { x: x, y: y, inside: true };
        var cx = W / 2, cy = H / 2;
        var dx = x - cx, dy = y - cy;
        var sx = (W / 2 - margin) / Math.abs(dx || 1e-6);
        var sy = (H / 2 - margin) / Math.abs(dy || 1e-6);
        var k = Math.min(sx, sy);
        return { x: cx + dx * k, y: cy + dy * k, inside: false };
    }

    function chevron(x, y, angle, size, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size * 0.75, size * 0.68);
        ctx.lineTo(-size * 0.35, 0);
        ctx.lineTo(-size * 0.75, -size * 0.68);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /* The station is the one landmark the map is built around. If it is off
     * screen there is no way to work out which way to fly, so say so. */
    function drawStationPointer(world) {
        var p = project(world.station.x, world.station.y, 0);
        var e = edgePoint(p[0], p[1], 46);
        if (e.inside) return;

        var c = project(S.World.world.player ? S.World.world.player.x : world.station.x,
            S.World.world.player ? S.World.world.player.y : world.station.y, 0);
        chevron(e.x, e.y, Math.atan2(e.y - c[1], e.x - c[0]), 11, "rgba(94,234,212,0.9)");

        ctx.save();
        ctx.font = "700 10px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(94,234,212,0.85)";
        ctx.fillText("STATION", e.x, e.y + 24);
        ctx.restore();
    }

    /* Damage direction: arcs pointing back at where each shot came from. */
    function drawDamageMarks(world) {
        var player = world.player;
        if (!player || !world.hitMarks.length) return;
        var c = project(player.x, player.y, player.z);
        var r = 46 * cam.zoom;

        ctx.save();
        for (var i = 0; i < world.hitMarks.length; i++) {
            var mk = world.hitMarks[i];
            var age = S.clamp(1 - (world.time - mk.t) / S.World.hitMarkTtl(), 0, 1);
            if (age <= 0) continue;
            /* The mark lives in world space, so rotate by the camera yaw to
             * keep it pointing at the shooter as the ship turns. */
            var a = mk.a - player.heading - Math.PI / 2;
            ctx.globalAlpha = age * 0.85;
            ctx.strokeStyle = "#ff5470";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.arc(c[0], c[1], r, a - 0.34, a + 0.34);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /* Red vignette when the hull drops, strongest on the hit that did it. */
    function drawHitFlash(world) {
        var player = world.player;
        if (!player || player.hitFlash <= 0) return;
        var k = S.clamp(player.hitFlash / C.player.hitFlashTime, 0, 1);
        var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32,
            W / 2, H / 2, Math.max(W, H) * 0.62);
        g.addColorStop(0, "rgba(255,40,70,0)");
        g.addColorStop(1, "rgba(255,40,70," + (0.34 * k).toFixed(3) + ")");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    /* ===== Camera ===== */

    function snap(x, y, zoom) {
        cam.x = x;
        cam.y = y;
        cam.snapped = true;
        cam.zoom = zoom || fitZoom();
        cam.shake = 0;
        cam.ox = 0;
        cam.oy = 0;
    }

    /* The zoom that shows CONFIG.camera.viewSpan world units across the
     * screen's short edge. Everything else derives from this, so the game
     * plays the same on a 390px phone and a 1440px monitor. */
    function fitZoom() {
        var short = Math.min(W, H);
        if (short <= 0) return C.camera.zoomMin;
        return S.clamp(short / C.camera.viewSpan, C.camera.zoomMin, C.camera.zoomMax);
    }

    function follow(ship, dt) {
        if (!ship) return;
        var k = S.damp(dt, 0.16);
        cam.x = S.lerp(cam.x, ship.x + ship.vx * C.camera.lead, k);
        cam.y = S.lerp(cam.y, ship.y + ship.vy * C.camera.lead, k);

        /* Pull back slightly at speed: velocity is felt through how much
         * more world you can see, not through a number on screen. */
        var want = fitZoom() * (1 - ship.throttle * 0.07);
        cam.zoom = S.clamp(S.lerp(cam.zoom, want, S.damp(dt, 0.5)),
            C.camera.zoomMin, C.camera.zoomMax);
    }

    /* Attract mode: park the camera on a landmark and drift the zoom, so the
     * menu sits over the station turning rather than over empty space
     * wherever the strongest NPC happens to be. */
    var orbit = { t: 0 };

    function lookAt(x, y, dt) {
        orbit.t += dt;
        var k = S.damp(dt, 0.4);
        /* Bias the framing upward: the menu panel is always centred, so a
         * landmark framed dead centre is a landmark nobody ever sees. */
        var bias = H * 0.26 / (cam.zoom * P.ySquash);
        cam.x = S.lerp(cam.x, x, k);
        cam.y = S.lerp(cam.y, y + bias, k);
        var breathe = fitZoom() * (1 + Math.sin(orbit.t * 0.35) * 0.06);
        cam.zoom = S.clamp(S.lerp(cam.zoom, breathe, S.damp(dt, 0.8)),
            C.camera.zoomMin, C.camera.zoomMax);
    }

    function updateShake(dt) {
        cam.shake = Math.max(0, cam.shake - cam.shake * S.damp(dt, 0.08) - 6 * dt);
        if (cam.shake > 0.2) {
            cam.ox = (Math.random() - 0.5) * cam.shake * 2.2;
            cam.oy = (Math.random() - 0.5) * cam.shake * 1.6;
        } else {
            cam.ox = 0;
            cam.oy = 0;
        }
    }

    function shake(n) {
        cam.shake = Math.min(30, cam.shake + n);
    }

    /* ===== Quality ===== */

    function setQuality(name) {
        qualityName = name;
        quality = C.quality.tiers[name] || C.quality.tiers.high;
    }

    /* Sample the first ~90 frames and step down if 60fps is being missed.
     * Measuring beats guessing from a user-agent string, which lies. */
    function samplePerf(frameMs) {
        if (perf.locked) return;
        perf.frames++;
        if (perf.frames < 20) return;      /* ignore warm-up frames */
        perf.accum += frameMs;
        if (perf.frames >= C.quality.sampleFrames) {
            var avg = perf.accum / (perf.frames - 20);
            if (perf.forced === "auto") setQuality(avg > C.quality.slowFrameMs ? "low" : "high");
            perf.locked = true;
        }
    }

    /* ===== Frame =====
     * One preallocated render list, reused every frame. Depth sorting is by
     * dot product with the projection's view vector, so what is drawn last is
     * always what is genuinely in front.
     */

    var KIND = { STATION: 0, ROCK: 1, CRATE: 2, PICKUP: 3, SHIP: 4 };
    var RENDER_CAP = 420;
    var renderables = new Array(RENDER_CAP);
    for (var ri = 0; ri < RENDER_CAP; ri++) renderables[ri] = { d: 0, kind: 0, e: null };
    var rcount = 0;

    function push(kind, entity) {
        if (rcount >= RENDER_CAP) return;
        var r = renderables[rcount++];
        r.kind = kind;
        r.e = entity;
        r.d = depthOf(entity.x, entity.y, entity.z);
    }

    function draw(world, dt) {
        ctx.fillStyle = S.COLORS.void;
        ctx.fillRect(0, 0, W, H);

        updateShake(dt);
        drawNebula(world);
        drawStars(world);
        drawGrid();

        drawHazards(world);

        rcount = 0;
        push(KIND.STATION, world.station);
        for (var i = 0; i < world.rocks.length; i++) push(KIND.ROCK, world.rocks[i]);
        for (i = 0; i < world.crates.length; i++) {
            if (world.crates[i].alive) push(KIND.CRATE, world.crates[i]);
        }
        for (i = 0; i < world.pickups.length; i++) {
            if (world.pickups[i].on) push(KIND.PICKUP, world.pickups[i]);
        }
        for (i = 0; i < world.ships.length; i++) push(KIND.SHIP, world.ships[i]);

        /* Insertion sort: the list is nearly ordered frame to frame because
         * nothing moves discontinuously, so this is close to O(n). */
        for (i = 1; i < rcount; i++) {
            var cur = renderables[i];
            var cd = cur.d;
            var j = i - 1;
            while (j >= 0 && renderables[j].d > cd) {
                renderables[j + 1] = renderables[j];
                j--;
            }
            renderables[j + 1] = cur;
        }

        for (i = 0; i < rcount; i++) {
            var r = renderables[i];
            switch (r.kind) {
                case KIND.STATION: drawStation(world); break;
                case KIND.ROCK: drawRock(world, r.e); break;
                case KIND.CRATE: drawCrate(world, r.e); break;
                case KIND.PICKUP: drawPickup(world, r.e); break;
                default: drawShip(world, r.e); break;
            }
        }

        drawParticles(world);
        drawBullets(world);
        drawMissiles(world);
        drawMines(world);
        drawBountyMarker(world);
        drawFloaters(world);
        drawDamageMarks(world);
        drawDockRing(world);
        drawBounds(world);
        drawHitFlash(world);
        drawStationPointer(world);
    }

    /* ===== Minimap =====
     * Straight top-down, no projection: it is a radar, not a window.
     */
    function drawMinimap(mctx, world) {
        var size = mctx.canvas.width;
        var player = world.player;
        var ox = player ? player.x : world.station.x;
        var oy = player ? player.y : world.station.y;
        var sx = (size / 900);

        function mx(x) { return size / 2 + (x - ox) * sx; }
        function my(y) { return size / 2 + (y - oy) * sx; }

        mctx.clearRect(0, 0, size, size);
        mctx.save();
        mctx.beginPath();
        mctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
        mctx.clip();

        mctx.fillStyle = "rgba(6,12,24,0.85)";
        mctx.fillRect(0, 0, size, size);

        mctx.strokeStyle = "rgba(94,234,212,0.16)";
        mctx.lineWidth = 1;
        mctx.beginPath();
        mctx.arc(size / 2, size / 2, size * 0.33, 0, Math.PI * 2);
        mctx.moveTo(size / 2, size * 0.17);
        mctx.lineTo(size / 2, size * 0.83);
        mctx.moveTo(size * 0.17, size / 2);
        mctx.lineTo(size * 0.83, size / 2);
        mctx.stroke();

        var i;
        for (i = 0; i < world.rocks.length; i++) {
            var r = world.rocks[i];
            if (!r.alive) continue;
            mctx.fillStyle = "rgba(130,140,160,0.55)";
            mctx.fillRect(mx(r.x) - 1.5, my(r.y) - 1.5, 3, 3);
        }

        for (i = 0; i < world.crates.length; i++) {
            var c = world.crates[i];
            if (!c.alive) continue;
            mctx.fillStyle = "rgba(255,209,102,0.8)";
            mctx.fillRect(mx(c.x) - 1.5, my(c.y) - 1.5, 3, 3);
        }

        mctx.strokeStyle = "rgba(94,234,212,0.55)";
        mctx.lineWidth = 1;
        mctx.beginPath();
        mctx.arc(mx(world.station.x), my(world.station.y), C.world.dockRadius * sx, 0, Math.PI * 2);
        mctx.stroke();
        mctx.fillStyle = S.COLORS.station;
        mctx.beginPath();
        mctx.arc(mx(world.station.x), my(world.station.y), 3.5, 0, Math.PI * 2);
        mctx.fill();

        for (i = 0; i < world.ships.length; i++) {
            var ship = world.ships[i];
            if (ship.isPlayer) continue;
            mctx.fillStyle = ship.color;
            mctx.beginPath();
            mctx.arc(mx(ship.x), my(ship.y), 2.8, 0, Math.PI * 2);
            mctx.fill();
        }

        if (player) {
            mctx.save();
            mctx.translate(mx(player.x), my(player.y));
            mctx.rotate(player.heading);
            mctx.fillStyle = S.COLORS.player;
            mctx.beginPath();
            mctx.moveTo(6, 0);
            mctx.lineTo(-4, 4);
            mctx.lineTo(-4, -4);
            mctx.closePath();
            mctx.fill();
            mctx.restore();
        }

        mctx.restore();
    }

    /* ===== Hulls & init ===== */

    function buildMeshes() {
        meshCache.station = buildStation();
        meshCache.gem = hullGem(6);
        meshCache.chunk = merge([
            scaleMesh(prism(6, 4.4, 3.4, 4.4), 1, 1, 1),
            box(3, 9, 1),
        ]);
        meshCache.crate = merge([
            scaleMesh(prism(6, 13, 13, 16), 1, 1, 1),
            offsetMesh(scaleMesh(prism(6, 14.5, 14.5, 2.6), 1, 1, 1), 0, 0, 4),
            offsetMesh(scaleMesh(prism(6, 14.5, 14.5, 2.6), 1, 1, 1), 0, 0, -4),
            box(4, 27, 4),
        ]);
    }

    /* Per-rock meshes are built once, at generation, from the rock's own
     * seed: a field that looks scattered but never re-rolls between frames. */
    function buildRockMesh(seed, r) {
        var rng = S.mulberry32(seed);
        var m = prism(6 + ((rng() * 3) | 0), r, r * (0.62 + rng() * 0.3), r * (0.9 + rng() * 0.5));
        return roughen(m, rng, 0.2, r * 0.5);
    }

    function prepareShip(ship) {
        if (ship.mesh) return;
        ship.mesh = hullFor(ship.tier, ship.isPlayer);
        /* Bigger tiers get bigger hulls, but not linearly - a Reaper should
         * feel like a threat, not a postage stamp. */
        ship.scale = ship.isPlayer ? 1 : 0.8 + Math.min(1.4, ship.tier * 0.1);
    }

    /* Called once the world exists, so every rock gets its mesh. */
    function bindWorld(world) {
        for (var i = 0; i < world.rocks.length; i++) {
            var rock = world.rocks[i];
            rock.mesh = buildRockMesh(rock.seed, rock.r);
            rock.spin = (rock.seed % 628) / 100;
        }
    }

    function resize() {
        /* Cap DPR at 2: a 3x phone panel triples fill cost and buys nothing
         * you can see on a moving ship. */
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        /* Re-fit on every resize so a rotation does not leave the player
         * looking at a slice of space sized for the other orientation. */
        if (!cam.snapped) cam.zoom = fitZoom();
    }

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext("2d", { alpha: false });
        resize();
        window.addEventListener("resize", resize);
        window.addEventListener("orientationchange", resize);
        buildMeshes();
        buildGlowSprite();
        setQuality("high");
        return ctx;
    }

    S.Render = {
        init: init,
        canvas: function () { return canvas; },
        draw: draw,
        drawMinimap: drawMinimap,
        bindWorld: bindWorld,
        prepareShip: prepareShip,
        follow: follow,
        lookAt: lookAt,
        snap: snap,
        shake: shake,
        quality: function () { return quality; },
        qualityName: function () { return qualityName; },
        samplePerf: samplePerf,
        setQuality: setQuality,
        setForcedQuality: function (q) { perf.forced = q; perf.locked = false; perf.frames = 0; perf.accum = 0; },
        camera: cam,
        /* World -> screen, for tests and for anything that needs to anchor a
         * DOM element to a world position. */
        toScreen: project,
        fitZoom: fitZoom,
        _mesh: {
            /* drawMesh is exposed so the render test can put one known mesh
             * through the real path and compare it against an independent
             * projection. That is the check which caught a stride bug that
             * turned the station into soup while every hull still looked
             * merely soft. */
            drawMesh: drawMesh,
            box: box, prism: prism, merge: merge, roughen: roughen,
            scaleMesh: scaleMesh, offsetMesh: offsetMesh, rotZMesh: rotZMesh,
            hullFighter: hullFighter, hullScout: hullScout,
            hullGunship: hullGunship, hullHeavy: hullHeavy, buildStation: buildStation,
        },
    };

})(window.S7 = window.S7 || {});