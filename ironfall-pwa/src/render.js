/*
 * IRONFALL - the isometric renderer.
 *
 * Flat-shaded boxes on an axonometric grid. There is no mesh, no matrix and
 * no WebGL: a cube is eight points and six quads, and the projection is two
 * multiplications per vertex. That is the whole reason this game can draw a
 * ninety-unit wave plus every structure on a mid-range phone at 60fps, and it
 * is the same trick sector7-pwa uses for the same reason.
 *
 * Draw order is painter's algorithm on a single depth key. There is no depth
 * buffer, so sorting is the entire correctness story: if two objects are
 * drawn in the wrong order, one clips through the other, and there is no way
 * to notice at runtime other than by looking at it.
 */
(function (S) {
    "use strict";

    var C = S.CONFIG;
    var P = S.PROJ;
    var PAL = S.PAL;

    var canvas, ctx, W = 0, H = 0, dpr = 1;
    var quality = C.quality.med;

    /* Camera. World-space centre, plus the zoom. Everything the renderer
     * draws goes through project(), so this is the only place screen
     * coordinates are produced. */
    var cam = { x: 0, y: 0, span: C.camera.viewSpan, shakeX: 0, shakeY: 0 };
    var perf = { frames: 0, total: 0, tier: "med", locked: false, samples: [] };

    /* ===== Projection =====
     *
     * TWO spaces, and mixing them up is the worst bug this file ever had.
     *
     * There is the axonometric projection on its own - world +x runs
     * down-right, world +y down-left, +z straight up, so the map is a
     * diamond wider than it is tall, which is what lets it fit a portrait
     * phone. And there is the screen transform on top of it, which adds the
     * camera centre, the zoom and the screen shake.
     *
     * The world renderer needs the second. The minimap needs the first, and
     * the simulation needs neither.
     *
     * They used to be one function plus a caller-side conversion, and the
     * drawing code called the raw one - so the ground, the towers, the
     * minions and the health bars were all rendered at the world origin with
     * no camera and no zoom at all. It presented as "the camera is broken"
     * rather than as a coordinate error: enormous triangles across the middle
     * of the screen with a handful of specks on them. Every drawing function
     * now goes through project(); nothing outside this file uses it.
     */
    function projectRaw(x, y, z) {
        z = z || 0;
        return {
            x: (x - y) * P.xScale,
            y: (x + y) * P.yScale - z * P.zScale
        };
    }

    /* World to screen. The only projection the renderer draws with. */
    function project(x, y, z) {
        z = z || 0;
        var k = H / cam.span;
        var wx = x - cam.x;
        var wy = y - cam.y;
        return {
            x: W / 2 + ((wx - wy) * P.xScale + cam.shakeX) * k,
            y: H / 2 + ((wx + wy) * P.yScale - z * P.zScale + cam.shakeY) * k
        };
    }

    /* Exact inverse, used by every tap and drag. A tap that lands somewhere
     * other than where the player pressed is the loudest possible failure in
     * a MOBA. */
    function toWorld(sx, sy) {
        var k = cam.span / H;
        var px = (sx - W / 2) * k - cam.shakeX;
        var py = (sy - H / 2) * k - cam.shakeY;
        /* Invert sx = (x - y) * xScale, sy = (x + y) * yScale. Two lines of
         * algebra and no matrix inverse, which is the payoff for staying
         * linear. */
        var a = px / P.xScale;
        var b = py / P.yScale;
        return { x: cam.x + (a + b) / 2, y: cam.y + (b - a) / 2 };
    }


    /* ===== Box geometry =====
     *
     * A unit is drawn as a small stack of boxes: legs, torso, helm, and for
     * ranged champions a weapon held out to one side. That is three to five
     * boxes per body, which for ninety minions is about 350 boxes and about
     * 2100 quads. At DPR 2 on a modern phone that is comfortably inside
     * budget, and it is why there are no per-pixel effects in this renderer.
     *
     * The cube face list is built once and shared. Every box in the game is
     * the same eight points scaled and translated, so the only per-frame work
     * is transforming them. */
    var CUBE = (function () {
        var c = [
            [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
            [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
        ];
        /* Faces wound so the outward normal is consistent; the back-face test
         * below uses the sign of the projected area, which is cheaper than
         * computing normals and cannot disagree with what is drawn. */
        var f = [
            [0, 3, 2, 1], /* bottom */
            [4, 5, 6, 7], /* top */
            [0, 1, 5, 4], /* -y */
            [2, 3, 7, 6], /* +y */
            [1, 2, 6, 5], /* +x */
            [3, 0, 4, 7]  /* -x */
        ];
        /* Face lighting, precomputed from the key light. Flat shading is one
         * number per face, not a dot product per frame - and because the
         * projection is linear, a constant normal really does map to a
         * constant shade. */
        var n = [[0, 0, -1], [0, 0, 1], [0, -1, 0], [0, 1, 0], [1, 0, 0], [-1, 0, 0]];
        var light = [];
        for (var i = 0; i < 6; i++) {
            var d = n[i][0] * S.LIGHT[0] + n[i][1] * S.LIGHT[1] + n[i][2] * S.LIGHT[2];
            light.push(0.42 + 0.58 * (d * 0.5 + 0.5));
        }
        return { c: c, f: f, light: light };
    })();

    /* Draw one box. `sx,sy` is the world centre of its footprint, `w,d` its
     * depth in world units, `h` its height, `c` its base colour, `tint` an
     * optional extra multiplier for team shading. */
    /* z0 is where the box STARTS, not just how tall it is. A stepped keep is
     * three boxes and each one has to sit on top of the last; without a base
     * offset every tier is drawn from the ground and the smaller ones vanish
     * inside the larger, which is exactly what happened to the Cores and made
     * the Towers a third of the height their numbers claimed. */
    function box(x, y, sxw, syw, h, c, alpha, tint, z0) {
        var base = z0 || 0;
        var pts = new Array(8);
        var i;
        for (i = 0; i < 8; i++) {
            var v = CUBE.c[i];
            pts[i] = project(x + (v[0] - 0.5) * sxw, y + (v[1] - 0.5) * syw, base + v[2] * h);
        }
        /* Without shading, every face gets the same multiplier so the body
         * reads as a flat silhouette. That is a deliberate Low-tier
         * trade: one number instead of six per body, which at ninety minions
         * is the difference between shipping and not shipping on a budget
         * phone. */
        var l = quality.shade ? 1 : 1.16;
        var a = alpha === undefined ? 1 : alpha;
        if (a < 1) ctx.globalAlpha = a;

        for (i = 0; i < 6; i++) {
            var f = CUBE.f[i];
            var p0 = pts[f[0]], p1 = pts[f[1]], p2 = pts[f[2]], p3 = pts[f[3]];
            /* Back-face cull by signed area. Cheaper than computing a normal,
             * and guaranteed to agree with the fill because it IS the fill's
             * winding - a box drawn inside-out would be a bug this test
             * could not see. */
            var area = (p1.x - p0.x) * (p3.y - p0.y) - (p3.x - p0.x) * (p1.y - p0.y);
            if (area <= 0) continue;
            var sh = CUBE.light[i] * l * (tint || 1);
            ctx.fillStyle = shade(c, sh);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.closePath();
            ctx.fill();
        }
        if (a < 1) ctx.globalAlpha = 1;
    }

    /* ---------- faceted prisms ----------
     *
     * Everything above this line draws boxes. A box is six axis-aligned
     * quads, of which exactly three survive the back-face cull, and every
     * body in the game is a stack of them - which is why the silhouettes read
     * as "Minecraft in space" rather than as anything faceted.
     *
     * A prism generalises the box to an arbitrary convex footprint, and the
     * reason it is cheap is the same reason the box was cheap in the first
     * place. The projection is linear and has no perspective divide, so a
     * face normal that is constant in world space maps to a constant shade on
     * screen: flat shading is one dot product, computed ONCE per shape at
     * startup, never per frame. That property is what makes this affordable -
     * it is the same reason moving to a perspective projection would break
     * the shading table as well as the cull.
     *
     * A convex pentagon culls to three side faces plus a top, so a faceted
     * body costs about what a box costs. That is the whole trick: the visual
     * change is nearly free because half of an N-gon is always the far side.
     */
    function lightOf(nx, ny, nz) {
        var d = nx * S.LIGHT[0] + ny * S.LIGHT[1] + nz * S.LIGHT[2];
        return 0.42 + 0.58 * (d * 0.5 + 0.5);
    }

    /* Build a shape table from a unit footprint and an optional top scale.
     *
     * `pts` must be wound counter-clockwise in world x/y: for edge i the
     * outward normal is then (dy, -dx, 0), which is what makes the
     * screen-space back-face cull agree with the outward direction. Winding
     * it the other way silently inverts every face, and a body that is
     * inside-out still draws - it just draws its insides. */
    function makeShape(pts, topScale) {
        var n = pts.length, i;
        var faces = [], light = [];
        for (i = 0; i < n; i++) {
            var j = (i + 1) % n;
            faces.push([i, j, j + n, i + n]);
            var dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1];
            var len = Math.sqrt(dx * dx + dy * dy) || 1;
            light.push(lightOf(dy / len, -dx / len, 0));
        }
        /* The cap last so it is drawn after the sides and sits on top of
         * them wherever two silhouettes overlap. */
        var cap = [];
        for (i = 0; i < n; i++) cap.push(i + n);
        faces.push(cap);
        light.push(lightOf(0, 0, 1));
        return { n: n, pts: pts, top: topScale === undefined ? 1 : topScale,
                 faces: faces, light: light };
    }

    /* Regular n-gon, rotated so a vertex points at the front corner of the
     * view. A vertex at 45 degrees is what makes an axonometric body read as
     * solid: it puts a distinct plane on the near corner instead of leaving a
     * flat square facing the camera. */
    function ngon(sides, phase) {
        var p = [];
        for (var i = 0; i < sides; i++) {
            var a = (i / sides) * Math.PI * 2 + phase;
            p.push([Math.cos(a) * 0.5, Math.sin(a) * 0.5]);
        }
        return p;
    }

    var SHAPE = {
        /* Bodies. A pentagon is the sweet spot: three side faces survive the
         * cull plus the cap, so it costs the same as a box and looks nothing
         * like one. */
        penta: makeShape(ngon(5, Math.PI / 4), 0.74),
        /* Seven sides culls to four, which is one extra fill per body. */
        hepta: makeShape(ngon(7, Math.PI / 4), 0.8),
        /* Flattened for limbs and blades: wide across the facing axis, thin
         * through it, so a read stays a read from any angle. */
        pentaFlat: makeShape(ngon(5, Math.PI / 4), 0.8),
        /* Structures want mass at the base and a narrow top. */
        obelisk: makeShape(ngon(6, Math.PI / 6), 0.52),
        slab: makeShape(ngon(4, Math.PI / 4), 0.86),
        /* Irregular, for rubble. Five sides, not eight, and the reason is
         * arithmetic rather than taste: half of any convex outline is the far
         * side, so five sides fill three faces and eight fill five. Scenery
         * is the most numerous thing on the map - up to two per visible cell -
         * so this is where an extra face per object is least affordable, and
         * an irregular pentagon looks like a rock for exactly the price of a
         * box. Unequal side lengths do the work; the side count does not. */
        rock: makeShape([
            [-0.50, -0.14], [-0.22, -0.48], [0.30, -0.40],
            [0.50, 0.18], [-0.16, 0.46]
        ], 0.58),
        /* A wedge: four sides, tapering hard, for spines and chitin spikes. */
        shard: makeShape([
            [-0.50, -0.26], [0.50, -0.06], [0.50, 0.06], [-0.50, 0.26]
        ], 0.26)
    };

    /* Scratch vertex buffer, so a body does not allocate an array per frame.
     * prism() is never re-entered - drawUnit and its kit helpers call it in a
     * straight line with no nesting - so one shared buffer is safe. */
    var _pv = new Array(16);

    /* Draw one faceted prism. Same argument order as box() so a call site can
     * be converted by swapping the function and passing a shape. */
    function prism(shape, x, y, sxw, syw, h, c, alpha, tint, z0) {
        var base = z0 || 0, n = shape.n, pts = shape.pts, ts = shape.top;
        var i, vx, vy;
        for (i = 0; i < n; i++) {
            vx = pts[i][0]; vy = pts[i][1];
            _pv[i] = project(x + vx * sxw, y + vy * syw, base);
            _pv[i + n] = project(x + vx * sxw * ts, y + vy * syw * ts, base + h);
        }
        var l = quality.shade ? 1 : 1.16;
        var a = alpha === undefined ? 1 : alpha;
        if (a < 1) ctx.globalAlpha = a;

        var faces = shape.faces, light = shape.light;
        for (i = 0; i < faces.length; i++) {
            var f = faces[i];
            var p0 = _pv[f[0]], p1 = _pv[f[1]];
            var last = _pv[f[f.length - 1]];
            /* Same cull as box(): signed area of the projected winding, so it
             * cannot disagree with the fill. */
            var area = (p1.x - p0.x) * (last.y - p0.y) - (last.x - p0.x) * (p1.y - p0.y);
            if (area <= 0) continue;
            ctx.fillStyle = shade(c, light[i] * l * (tint || 1));
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            for (var k = 1; k < f.length; k++) ctx.lineTo(_pv[f[k]].x, _pv[f[k]].y);
            ctx.closePath();
            ctx.fill();
        }
        if (a < 1) ctx.globalAlpha = 1;
    }

    /* Pre-rotated variants of a shape, bucketed by facing.
     *
     * A body that never turns is a body that cannot be seen to walk in any
     * direction, which is the one thing a body drawn from a fixed camera most
     * obviously lacks. Rotating the outline per frame would mean a sine and a
     * cosine per vertex per part; instead the outline is rotated once at
     * startup into a ring of variants and the unit snaps to the nearest one.
     *
     * The light table has to be rebuilt for each variant, not reused - a
     * rotated face has a rotated normal, so it catches the key from a
     * different angle. That is why this goes through makeShape again instead
     * of just shuffling points. Sixteen buckets is 22.5 degrees of error,
     * which is finer than a minion is wide on screen. */
    function spinShape(shape, steps) {
        var out = [];
        for (var s = 0; s < steps; s++) {
            var a = (s / steps) * Math.PI * 2;
            var c = Math.cos(a), si = Math.sin(a);
            var pts = [];
            for (var i = 0; i < shape.n; i++) {
                var x = shape.pts[i][0], y = shape.pts[i][1];
                pts.push([x * c - y * si, x * si + y * c]);
            }
            out.push(makeShape(pts, shape.top));
        }
        return out;
    }

    var SPIN = 16;
    SHAPE.pentaS = spinShape(SHAPE.penta, SPIN);
    SHAPE.heptaS = spinShape(SHAPE.hepta, SPIN);
    SHAPE.flatS = spinShape(SHAPE.pentaFlat, SPIN);
    SHAPE.slabS = spinShape(SHAPE.slab, SPIN);
    /* Props get fewer buckets on purpose: there can be two per visible cell,
     * and sixteen orientations of a rock nobody looks at directly is sixteen
     * times the table for no gain. */
    SHAPE.rockS = spinShape(SHAPE.rock, 8);
    SHAPE.shardS = spinShape(SHAPE.shard, 8);

    /* The tier ladder, in one place.
     *
     * `quality.detail` was documented as a multiplier but was only ever
     * compared against two hardcoded thresholds, so a body cost exactly what
     * it cost at every tier except the two booleans that consulted it. This
     * makes the number mean what it says: fewer sides on cheaper hardware.
     *
     * The sides are chosen for cost, and the numbers are the measured ones:
     * a box and a pentagon both fill exactly three faces, because half of any
     * convex outline is the far side. Only the heptagon costs more, at five.
     *
     * Returning null means "use box()", which stays the Low-tier primitive
     * precisely because it is the cheapest thing that reads as solid. */
    function bodyShape(detail, flat, facing) {
        var ring;
        if (detail >= 0.9) ring = flat ? SHAPE.flatS : SHAPE.heptaS;
        else if (detail > 0.5) ring = flat ? SHAPE.flatS : SHAPE.pentaS;
        else return null;
        var s = Math.round((facing / (Math.PI * 2)) * SPIN) % SPIN;
        if (s < 0) s += SPIN;
        return ring[s];
    }

    /* Draw one part as either a prism or a plain box, so every call site
     * converts by passing a shape that may be null. */
    function part(shape, x, y, sxw, syw, h, c, alpha, tint, z0) {
        if (shape) prism(shape, x, y, sxw, syw, h, c, alpha, tint, z0);
        else box(x, y, sxw, syw, h, c, alpha, tint, z0);
    }

    function shade(hex, m) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        r = r * m; g = g * m; b = b * m;
        /* Clamp rather than let the shade overdrive into a wrap-around. A
         * face that should be in shadow coming out white is the kind of bug
         * you only notice on one champion. */
        if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
        return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
    }

    /* ===== Terrain =====
     *
     * The ground is drawn as a grid of quads, not as one big polygon, so
     * that lane colour, the river and the terrain type are all decided per
     * cell. A grid cell is 460 world units, which divides the 9200-unit map
     * into exactly twenty cells a side.
     *
     * Only cells inside the view are drawn. Without that cull the ground
     * alone is 800 quads of pure waste, and it is the single largest
     * optimisation in the file. */
    var CELL = 460;
    var CELLS = Math.round(S.Map.size / CELL);

    /* Deterministic per-cell hash.
     *
     * Every piece of ground detail in the game comes out of this: the colour
     * jitter, the rubble, the cracks. It has to be deterministic because the
     * camera pans - a cell that reshuffled its decoration every time it came
     * on screen would shimmer, and shimmer on a scrolling ground plane is the
     * single most distracting thing a renderer like this one can do.
     *
     * Integer hash, not Math.random, and not sin()-based value noise: this has
     * to produce the same number on every machine and every reload, which
     * rules out the two obvious shortcuts. */
    function cellHash(gx, gy, salt) {
        var h = (gx * 73856093) ^ (gy * 19349663) ^ ((salt || 0) * 83492791);
        h = (h ^ (h >>> 13)) * 1274126177;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    /* Cell classification. Three materials, and the lane is drawn as a ribbon
     * on top rather than as a fourth colour - see drawLaneRibbons. */
    function cellKind(gx, gy) {
        var x = gx * CELL + CELL / 2;
        var y = gy * CELL + CELL / 2;
        if (S.Map.inRiver(x, y)) return 2;
        if (S.Map.isOnLane(x, y)) return 1;
        return 0;
    }

    /* Value jitter per material. A large flat field of one colour is the
     * thing that makes a procedural world read as unfinished; a small
     * deterministic variation per cell is what makes it read as ground. */
    function groundColour(gx, gy) {
        var kind = cellKind(gx, gy);
        var j = (cellHash(gx, gy, 7) - 0.5) * 0.09;
        if (kind === 2) return shadeHex(PAL.stoneDark, 1 + j * 0.8);
        if (kind === 1) return shadeHex(PAL.dirt, 1 + j);
        /* The wilds get a second, coarser octave so they are not merely
         * noisy - they have patches. */
        var patch = cellHash(Math.floor(gx / 3), Math.floor(gy / 3), 11) - 0.5;
        return shadeHex(PAL.basalt, 1 + j * 1.4 + patch * 0.14);
    }

    function drawGround() {
        var span = cam.span;
        /* Which cells can possibly be on screen, in world space.
         *
         * The margin is derived rather than guessed. A world offset (dx, dy)
         * projects to ((dx - dy) * xScale, (dx + dy) * yScale), and the
         * visible half-extents are W/2 and H/2 divided by the scale. For a
         * 390x844 phone that puts the worst-case world offset at about
         * 0.7 * span; the bound is set to a full span so no cell on screen is
         * ever skipped, which is the direction that matters. A bound that is
         * too small shows as the world visibly ending in mid-air. */
        var half = span * 1.0;
        var x0 = cam.x - half, x1 = cam.x + half;
        var y0 = cam.y - half, y1 = cam.y + half;

        var gx0 = S.clamp(Math.floor(x0 / CELL), 0, CELLS - 1);
        var gx1 = S.clamp(Math.floor(x1 / CELL), 0, CELLS - 1);
        var gy0 = S.clamp(Math.floor(y0 / CELL), 0, CELLS - 1);
        var gy1 = S.clamp(Math.floor(y1 / CELL), 0, CELLS - 1);

        for (var gy = gy0; gy <= gy1; gy++) {
            for (var gx = gx0; gx <= gx1; gx++) {
                /* The gap between cells is deliberate at Low and filled at
                 * higher tiers. On a flat-shaded grid, adjacent cells of the
                 * same colour butt into each other invisibly and the ground
                 * reads as one enormous plane; a hairline of darker ground
                 * turns the same quads into fitted slabs. */
                var inset = quality.material > 0.5 ? 0.6 : 0;
                var a = project(gx * CELL + inset, gy * CELL + inset, 0);
                var b = project((gx + 1) * CELL - inset, gy * CELL + inset, 0);
                var c = project((gx + 1) * CELL - inset, (gy + 1) * CELL - inset, 0);
                var d = project(gx * CELL + inset, (gy + 1) * CELL - inset, 0);
                ctx.fillStyle = groundColour(gx, gy);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.lineTo(c.x, c.y);
                ctx.lineTo(d.x, d.y);
                ctx.closePath();
                ctx.fill();
            }
        }

        if (quality.material > 0) drawLaneRibbons();
        if (quality.material > 0.5) drawGroundDetail();
    }

    /* Lane ribbons.
     *
     * A lane drawn as a chain of lane-coloured cells reads as a colour change;
     * a lane drawn as a strip along its own polyline reads as a ROAD, which
     * is what tells a player where they are supposed to walk without having
     * to have the map memorised.
     *
     * Three passes: a dark shoulder where the lane meets the wilds, the body
     * of the lane, and a lighter rut down the middle where ninety minions
     * have been dragged backwards and forwards for ten minutes. */
    function drawLaneRibbons() {
        var names = S.Map.laneNames;
        for (var i = 0; i < names.length; i++) {
            var pts = S.Map.lanes[names[i]];
            ribbon(pts, C.map.laneHalf * 2.12, "#2a251d", 0.5);
            ribbon(pts, C.map.laneHalf * 1.86, PAL.dirt, 0.42);
            if (quality.material > 0.5) ribbon(pts, C.map.laneHalf * 0.7, PAL.dirtLight, 0.2);
        }
        /* The river, as a band rather than as cells that happen to be dark. */
        ribbonRiver();
    }

    function ribbon(pts, width, color, alpha) {
        var k = H / cam.span;
        var half = width / 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        /* Built as a polygon from offset segments rather than a stroked path.
         * A stroke on a line that doubles back on itself - which the flank
         * lanes do, around the far corner - paints over itself and produces
         * a blob at the turn. An explicit outline does not. */
        var left = [], right = [];
        for (var i = 0; i < pts.length; i++) {
            var prev = pts[Math.max(0, i - 1)];
            var next = pts[Math.min(pts.length - 1, i + 1)];
            var dx = next.x - prev.x, dy = next.y - prev.y;
            var len = Math.sqrt(dx * dx + dy * dy) || 1;
            var nx = -dy / len, ny = dx / len;
            var p0 = project(pts[i].x + nx * half, pts[i].y + ny * half, 1.5);
            var p1 = project(pts[i].x - nx * half, pts[i].y - ny * half, 1.5);
            left.push(p0);
            right.unshift(p1);
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(left[0].x, left[0].y);
        for (i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
        for (i = 0; i < right.length; i++) ctx.lineTo(right[i].x, right[i].y);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    /* The river crosses the map perpendicular to mid. Drawn as a band with a
     * soft edge so the lane ribbons visibly pass through it rather than over
     * it. */
    function ribbonRiver() {
        var half = S.CONFIG.map.riverHalf;
        var pts = [
            { x: 0, y: S.Map.size - half * 2 },
            { x: half * 2, y: S.Map.size },
            { x: S.Map.size - half * 2, y: 0 },
            { x: S.Map.size, y: half * 2 }
        ];
        ribbon(pts, half * 2.4, PAL.stoneDark, 0.5);
        if (quality.material > 0.5) ribbon(pts, half * 0.9, "#2b323c", 0.35);
    }

    /* Cracks and scorch marks, placed deterministically per cell. Two per
     * cell at most, drawn as short strokes in world space, and only on the
     * cells actually on screen - so the cost is bounded by the view and not
     * by the map. */
    function drawGroundDetail() {
        var span = cam.span;
        var half = span;
        var gx0 = S.clamp(Math.floor((cam.x - half) / CELL), 0, CELLS - 1);
        var gx1 = S.clamp(Math.floor((cam.x + half) / CELL), 0, CELLS - 1);
        var gy0 = S.clamp(Math.floor((cam.y - half) / CELL), 0, CELLS - 1);
        var gy1 = S.clamp(Math.floor((cam.y + half) / CELL), 0, CELLS - 1);

        ctx.lineCap = "round";
        for (var gy = gy0; gy <= gy1; gy++) {
            for (var gx = gx0; gx <= gx1; gx++) {
                var n = cellHash(gx, gy, 23);
                if (n > 0.55) continue;
                var count = n < 0.2 ? 2 : 1;
                for (var i = 0; i < count; i++) {
                    var ox = cellHash(gx, gy, 31 + i * 3);
                    var oy = cellHash(gx, gy, 37 + i * 3);
                    var ang = cellHash(gx, gy, 41 + i * 3) * Math.PI;
                    var len = 30 + cellHash(gx, gy, 47 + i * 3) * 90;
                    var kind = cellKind(gx, gy);
                    var cx = gx * CELL + ox * CELL;
                    var cy = gy * CELL + oy * CELL;
                    var dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
                    var a = project(cx - dx / 2, cy - dy / 2, 1);
                    var b = project(cx + dx / 2, cy + dy / 2, 1);
                    ctx.globalAlpha = kind === 1 ? 0.22 : 0.3;
                    ctx.strokeStyle = kind === 2 ? "#171b21" : "#14161a";
                    ctx.lineWidth = kind === 1 ? 2 : 3;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    /* Base footprints. Drawn first, flat on the ground, so units standing on
     * them read as being at home rather than walking on grass. */
    function drawBasePads() {
        var t;
        for (t = 0; t < 2; t++) {
            var b = S.Map.bases[t];
            var col = t === 0 ? PAL.teamBlueDark : PAL.teamRedDark;
            var lit = t === 0 ? PAL.teamBlue : PAL.teamRed;
            /* Flat ground decal, not a raised ring. An ellipse stroked over
             * the architecture read as a stray HUD element rather than as
             * something painted on the floor. */
            diamond(b.x, b.y, b.fountain.r * 1.9, col, 0.4);
            diamond(b.x, b.y, b.fountain.r * 1.15, lit, 0.14);
            diamond(b.fountain.x, b.fountain.y, b.fountain.r * 1.5, lit, 0.07);
        }
        /* Reliquary pad. */
        if (S.Map.reliquary) {
            diamond(S.Map.reliquary.x, S.Map.reliquary.y, S.Map.reliquary.r * 2.2, PAL.goldDim, 0.3);
        }
    }

    function diamond(x, y, size, color, alpha) {
        var h = size / 2;
        var a = project(x - h, y - h, 0), b = project(x + h, y - h, 0);
        var c = project(x + h, y + h, 0), d = project(x - h, y + h, 0);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
    }

    function ring(x, y, r, color, alpha) {
        /* A circle in world space projects to an ellipse, because the y axis
         * is squashed and the x axis is not. Scaling the context is the
         * cheap way to get it right; the alternative is 24 projected
         * segments, which is 24 chances to be one pixel off. */
        var p = project(x, y, 0);
        var k = H / cam.span;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r * P.xScale * k, r * (P.xScale + P.yScale) * 0.5 * k, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    /* ===== Sort list =====
     *
     * Everything drawable goes into one list, sorted by a single depth key,
     * then painted. The key is the dot product with the view vector, which is
     * exactly the quantity that says "further from the camera" in a linear
     * projection - so the sort cannot disagree with the projection the way a
     * hand-tuned heuristic eventually will. */
    var VL = P.viewLen;
    function depthOf(x, y, z) {
        return (x * P.viewX + y * P.viewY + (z || 0) * P.viewZ) / VL;
    }

    /* Contact shadow.
     *
     * The single highest-impact line in this renderer. Without it every body
     * is a box floating in front of a plane with no evidence of contact, and
     * the whole scene reads as a diagram. With it the same boxes are standing
     * on something.
     *
     * It is a flat ellipse offset along the key light, widened and faded by
     * height: a body high off the ground casts a broad faint shadow and one
     * planted on the floor casts a tight dark one. That single relationship
     * is what the eye reads as "grounded".
     *
     * Cheap on purpose - one ellipse fill per entity, about sixty per frame. */
    function shadow(x, y, r, height, alpha) {
        /* Offsets along the light's horizontal component, scaled by how far
         * the body is above the floor. A Minion-filter blur is not available
         * on the main path without a second canvas, so softness is faked by
         * drawing a second, larger, fainter ellipse at the tiers that can
         * afford it. */
        var lx = S.LIGHT[0], lz = S.LIGHT[2];
        var ln = Math.sqrt(lx * lx + lz * lz) || 1;
        var lift = Math.min(1.6, height / 300);
        var off = lift * 26;
        var cx = x + (lx / ln) * off;
        var cy = y + (-lz / ln) * off;
        var spread = 1 + lift * 0.75;

        var p = project(cx, cy, 1);
        var rx = r * P.xScale * (H / cam.span) * spread;
        var ry = r * (P.xScale + P.yScale) * 0.5 * (H / cam.span) * spread;
        var a = alpha * (1 - lift * 0.45);

        if (quality.shadowSoft) {
            ellipse(p.x, p.y, rx * 1.35, ry * 1.35, a * 0.3, "#05070c", 0);
        }
        ellipse(p.x, p.y, rx, ry, a, "#05070c", 0);
    }

    var drawList = [];

    function collect(world) {
        drawList.length = 0;
        var i;

        if (quality.shadows) {
            /* Shadows are collected as their own depth-sorted entries, a hair
             * in front of the body that casts them. Sorting them separately
             * would put every shadow on top of every body, and sorting them
             * at the body's key would put them behind the thing in front. */
            for (i = 0; i < world.structures.length; i++) {
                var sh = world.structures[i];
                if (!sh.alive || !sh.visible) continue;
                if (!inView(sh.x, sh.y, sh.radius)) continue;
                drawList.push({
                    d: depthOf(sh.x, sh.y, sh.height * 0.5) - 0.01,
                    kind: "shadow", o: sh,
                    r: sh.radius * 1.15, h: sh.height, a: 0.5
                });
            }
            for (i = 0; i < world.units.length; i++) {
                var su = world.units[i];
                if (!su.alive) continue;
                if (su.team !== 0 && su.team !== 1) continue;
                if (!su.visible && su.kind !== "champ") continue;
                if (!inView(su.x, su.y, su.radius + 60)) continue;
                drawList.push({
                    d: depthOf(su.x, su.y, su.height * 0.4) - 0.01,
                    kind: "shadow", o: su,
                    r: su.radius * 1.1, h: su.height * 0.5,
                    a: su.kind === "champ" ? 0.46 : 0.34
                });
            }
        }
        for (i = 0; i < world.structures.length; i++) {
            var s = world.structures[i];
            if (!s.alive) continue;
            if (!s.visible) continue;
            if (!inView(s.x, s.y, s.radius)) continue;
            drawList.push({ d: depthOf(s.x, s.y, s.height * 0.5), kind: "structure", o: s });
        }
        for (i = 0; i < world.units.length; i++) {
            var u = world.units[i];
            if (!u.alive) continue;
            if (u.team !== 0 && u.team !== 1) continue;
            if (!u.visible && u.kind !== "champ") continue;
            if (!inView(u.x, u.y, u.radius + 60)) continue;
            drawList.push({ d: depthOf(u.x, u.y, u.height * 0.4), kind: "unit", o: u });
        }
        if (quality.props > 0) collectProps(world);
        /* Effects sort with everything else so that a blast ring under a
         * minion is drawn under it, not over it. */
        for (i = 0; i < world.effects.length; i++) {
            var e = world.effects[i];
            if (!inView(e.x, e.y, (e.r || 200))) continue;
            drawList.push({ d: depthOf(e.x, e.y, 10), kind: "effect", o: e });
        }

        /* Insertion sort. The list is ~120 entries and is almost always
         * already within a few places of sorted, because the units did not
         * move much since the previous frame. A full sort here would be
         * measurably slower and measurably no better - this is the classic
         * case where the obvious choice is genuinely worse. */
        for (i = 1; i < drawList.length; i++) {
            var v = drawList[i];
            var j = i - 1;
            while (j >= 0 && drawList[j].d > v.d) {
                drawList[j + 1] = drawList[j];
                j--;
            }
            drawList[j + 1] = v;
        }
    }

    /* ===== Terrain props =====
     *
     * Rubble and ruined plinths, scattered from the same per-cell hash that
     * drives the ground colour, so they move with the ground rather than
     * floating over it.
     *
     * Two reasons they exist. Visually, a map of flat quads has no sense of
     * scale - there is nothing in it to judge a champion against except the
     * champion. And functionally, they are what makes the wilds look like the
     * remains of something rather than like empty space, which is the whole
     * setting.
     *
     * They go through collect() so they are depth-sorted with everything
     * else: a champion has to be able to walk BEHIND a plinth, which is the
     * single cheapest way to sell that the world has depth. */
    function collectProps(world) {
        var span = cam.span;
        var half = span;
        var gx0 = S.clamp(Math.floor((cam.x - half) / CELL), 0, CELLS - 1);
        var gx1 = S.clamp(Math.floor((cam.x + half) / CELL), 0, CELLS - 1);
        var gy0 = S.clamp(Math.floor((cam.y - half) / CELL), 0, CELLS - 1);
        var gy1 = S.clamp(Math.floor((cam.y + half) / CELL), 0, CELLS - 1);
        var density = quality.props;

        for (var gy = gy0; gy <= gy1; gy++) {
            for (var gx = gx0; gx <= gx1; gx++) {
                /* Never in the lanes. A boulder in the middle of a wave would
                 * read as a unit and cost a last-hit decision. */
                if (cellKind(gx, gy) === 1) continue;
                for (var i = 0; i < 2; i++) {
                    if (cellHash(gx, gy, 53 + i * 5) > density * 0.42) continue;
                    var ox = cellHash(gx, gy, 59 + i * 7);
                    var oy = cellHash(gx, gy, 67 + i * 7);
                    var seed = cellHash(gx, gy, 71 + i * 11);
                    var x = gx * CELL + 60 + ox * (CELL - 120);
                    var y = gy * CELL + 60 + oy * (CELL - 120);
                    if (!inView(x, y, 140)) continue;
                    drawList.push({
                        d: depthOf(x, y, 40), kind: "prop",
                        o: {
                            x: x, y: y,
                            kind: seed < 0.3 ? "plinth" : (seed < 0.62 ? "rock" : "spine"),
                            rot: cellHash(gx, gy, 73 + i * 13) * Math.PI,
                            s: 26 + cellHash(gx, gy, 79 + i * 13) * 46,
                            chitin: cellKind(gx, gy) === 2
                        }
                    });
                }
            }
        }
    }

    function drawProp(pr) {
        var col = pr.chitin ? "#3c4a3a" : PAL.stone;
        var dark = shadeHex(col, 0.62);
        var lit = shadeHex(col, 1.12);

        if (quality.shadows) shadow(pr.x, pr.y, pr.s * 0.8, pr.s * 0.9, 0.28);

        /* Scenery is the one place faceting is free of charge: a prop is
         * already two solids, and each has three visible faces whether it is a
         * box or a rock, so the irregular silhouette costs nothing at all.
         * It is also the one place repetition is most obvious - a field of
         * identical cubes reads as a grid, and a field of identical rocks
         * reads as a row of the same rock - so each prop's existing stable
         * `rot` picks its orientation. */
        var faceted = quality.props > 0.5;
        var r = Math.round((pr.rot / (Math.PI * 2)) * 8) % 8;
        if (r < 0) r += 8;
        var lump = faceted ? SHAPE.rockS[r] : null;
        var spike = faceted ? SHAPE.shardS[r] : null;

        if (pr.kind === "plinth") {
            /* A broken column: a heavy base and a narrower shaft, which is
             * what reads as "ruin" rather than "box". */
            part(lump, pr.x, pr.y, pr.s * 1.5, pr.s * 1.5, pr.s * 1.15, dark, 1, 1, 0);
            part(lump, pr.x + Math.cos(pr.rot) * pr.s * 0.25, pr.y + Math.sin(pr.rot) * pr.s * 0.25,
                pr.s * 1.05, pr.s * 1.05, pr.s * 0.8, col, 1, 1, pr.s * 1.15);
        } else if (pr.kind === "spine") {
            /* A rib or a chitin spike. Thin and tall, and the thing that makes
             * the wilds look like they used to have something living in them. */
            var lean = 0.28;
            part(spike, pr.x + Math.cos(pr.rot) * pr.s * lean, pr.y + Math.sin(pr.rot) * pr.s * lean,
                pr.s * 0.42, pr.s * 0.42, pr.s * 2.4, lit, 1, 1, 0);
            part(lump, pr.x, pr.y, pr.s * 0.9, pr.s * 0.9, pr.s * 0.22, dark, 1, 1, 0);
        } else {
            /* Rubble: two offset lumps, the second rotated so the pair has no
             * single silhouette. */
            part(lump, pr.x, pr.y, pr.s, pr.s * 0.86, pr.s * 0.72, col, 1, 1, 0);
            part(lump, pr.x + Math.cos(pr.rot) * pr.s * 0.42, pr.y + Math.sin(pr.rot) * pr.s * 0.42,
                pr.s * 0.66, pr.s * 0.6, pr.s * 0.5, dark, 1, 1, pr.s * 0.3);
        }
    }

    /* Screen-space bounds test. project() already returns screen pixels, so
     * the margin is a screen margin too - it used to be computed in projected
     * units and compared against screen units, which is the same class of
     * mistake this file has already made once. */
    function inView(x, y, r) {
        var p = project(x, y, 0);
        var m = (r + 500) * (H / cam.span);
        return p.x > -m && p.x < W + m && p.y > -m && p.y < H + m;
    }

    /* ===== Bodies =====
     *
     * Three silhouettes: a champion, a minion, a structure. Each is a small
     * stack of boxes. The detail level controls how many, because on a Low
     * preset the difference between a three-box minion and a five-box minion
     * is the difference between the wave being readable and not. */
    /* Unit bodies.
     *
     * Built from boxes, but with three things the first version did not have,
     * and the three are the difference between "a swarm of identical specks"
     * and "a fight":
     *
     *   1. FACING. Every body is offset along its facing, so you can tell
     *      which way a minion is about to swing. Champions had this and
     *      nothing else did, which meant the ninety minions that decide every
     *      last-hitting decision in the game were all facing nowhere.
     *   2. MOTION. A walk cycle and an idle bob, driven by u.moving. Even at
     *      four frames a body that changes shape while it moves reads as
     *      walking rather than sliding.
     *   3. CLASS. A tank, a mage, a marksman and a bruiser have different
     *      silhouettes. This is not decoration: in a fight, "which one is the
     *      damage dealer" has to be answerable in a fraction of a second.
     */
    /* Minion colour.
     *
     * Team-tinted, which is not decoration. In a fight at gameplay distance
     * on a phone, "which of the ninety bodies is on my side" has to be
     * answerable in a fraction of a second, and base greys cannot answer it -
     * a blue team's conscript and a red team's conscript are the same cube.
     * Twenty-two percent toward the team colour is enough to separate them at
     * a glance and not enough to make the whole wave look tinted. */
    function minionColour(u) {
        var base = (C.minion[u.shape] ? C.minion[u.shape].color : "#8d8577");
        var team = u.team === 0 ? "#4f86d8" : "#d8505c";
        if (u.banner) base = "#d9c98a";
        return mixHex(base, team, u.banner ? 0.12 : 0.22);
    }

    /* Linear blend between two hex colours. Written out rather than pulled
     * from a library because there is no library. */
    function mixHex(a, b, t) {
        var ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
        var br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
        var r = S.clamp((ar + (br - ar) * t) | 0, 0, 255);
        var g = S.clamp((ag + (bg - ag) * t) | 0, 0, 255);
        var bl = S.clamp((ab + (bb - ab) * t) | 0, 0, 255);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
    }

    /* A ground ring that fills as a channel completes.
     *
     * The sweep is drawn as a series of short chords rather than an arc
     * stroke: `ctx.arc` with a start angle needs no more calls, but the fill
     * reads better at this camera pitch, where a thin stroked arc collapses
     * to a flat smear while a filled band keeps its width. */
    function channelRing(x, y, radius, prog, colour) {
        var k = H / cam.span;
        var p = project(x, y, 2);
        var r = (radius + 26) * P.xScale * k;
        var ry = (radius + 26) * (P.xScale + P.yScale) * 0.5 * k;
        ctx.strokeStyle = colour;
        ctx.lineWidth = Math.max(1.5, 3 * k);
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r, ry, 0, -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * Math.min(1, Math.max(0, prog)));
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    function drawUnit(u, alpha, t) {
        var champ = u.kind === "champ";
        var bodyCol = champ ? factionColour(u) : minionColour(u);
        if (u.kind === "summon") bodyCol = "#9fb87a";

        var w = u.radius * 1.5;
        var h = u.height;
        var detail = quality.detail;

        var fx = Math.cos(u.facing);
        var fy = Math.sin(u.facing);

        /* ---- motion ----
         * The stride comes from `t` and the body's own travel rather than from
         * a per-unit clock, so nobody has to be storing an animation phase.
         * Moving fast strides faster and further, which is most of what makes
         * a walk read as a walk. */
        var anim = quality.anim ? 1 : 0;

        /* Where the BODY is, which is not always where the unit is.
         *
         * A dash resolves its damage and its position on the frame it fires
         * and then plays the travel over the next fifth of a second, so for
         * that window the logical position is already at the far end while the
         * body is still on the way. Drawing from u.x would make the dash look
         * like the blink it was always accused of being. */
        var px = u.x, py = u.y;
        if (u.dashAnim) {
            var k = Math.min(1, u.dashAnim.t / u.dashAnim.dur);
            /* Ease-out, so the dash leaves fast and settles - the shape of a
             * sprint, rather than of a linear slide. */
            var e = 1 - (1 - k) * (1 - k);
            px = u.dashAnim.x0 + (u.dashAnim.x1 - u.dashAnim.x0) * e;
            py = u.dashAnim.y0 + (u.dashAnim.y1 - u.dashAnim.y0) * e;
        }

        var stride = u.moving ? (h * 0.14) * Math.sin(t * 9 + u.id * 1.7) : 0;
        var bob = u.moving
            ? Math.abs(Math.sin(t * 9 + u.id * 1.7)) * h * 0.05
            : Math.sin(t * 1.6 + u.id * 0.9) * h * 0.014;

        /* ---- pose ----
         * The simulation already tracks everything needed to animate an
         * attack, a cast, a stun, a recall and a death. The renderer read
         * NONE of it: not `windupLeft`, not `casting`, not `recalling`, not
         * `deadFor`. Every body on the map had exactly two states, walking
         * and standing still, which is why a fight looked like a crowd of
         * statues shuffling.
         *
         * These are additive offsets on the body, deliberately not a state
         * machine: the sim stays authoritative and the renderer only ever
         * interprets it, so nothing here can desynchronise from the rules. */
        var lean = 0, crouch = 0, sink = 0, glow = 0;
        var channel = 0;

        /* Attack: windupLeft counts down to the moment of impact, so the
         * strike is the last third of it. Anticipate, then snap forward -
         * a linear lean reads as a body being pushed. */
        if (anim && u.windupLeft > 0) {
            var ph = 1 - u.windupLeft / C.champ.attackWindup;
            var strike = ph > 0.45 ? (ph - 0.45) / 0.55 : 0;
            lean = (ph <= 0.45 ? -(0.45 - ph) * 0.5 : strike * 1.2);
        }
        /* Cast: the body rises and settles over the windup. */
        if (anim && u.casting) {
            var cp = u.casting.dur > 0 ? u.casting.t / u.casting.dur : 1;
            crouch -= cp * h * 0.03;
            glow = 0.4 + cp * 0.6;
        }
        /* Recall: a five-and-a-half second channel to base that was, until
         * now, completely invisible. Nothing on the map said it was
         * happening except that the champion had stopped moving. */
        if (u.recalling > 0) {
            var rt = C.champ.recallTime > 0 ? u.recalling / C.champ.recallTime : 1;
            channel = rt;
            crouch -= rt * h * 0.05;
            sink += rt * h * 0.02;
            glow = Math.max(glow, rt);
        }
        /* Stun or root: a slumped, off-balance body that cannot be walked
         * out of by the animation. */
        if (anim && u.alive && !S.Combat.canMove(u)) {
            crouch += h * 0.07;
            lean += 0.35;
        }
        /* Death: collapse. Champions stay in the world while dead, so
         * without this a corpse stands at full height until it respawns. */
        if (!u.alive) {
            var fall = Math.min(1, (u.deadFor || 0) * 2.6);
            crouch += h * 0.62 * fall;
            sink += h * 0.1 * fall;
        }

        /* ---- faceted parts ----
         * Two shapes per body: one for mass, one for anything that should read
         * as an edge rather than a volume (limbs, blades, pauldrons). Both are
         * picked once here rather than inside each call, because the tier and
         * the facing lookup are the same answer for every part of this unit. */
        var mass = bodyShape(detail, false, u.facing);
        var limb = bodyShape(detail, true, u.facing);

        /* ---- legs ---- */
        var legH = (h - crouch) * 0.34;
        if (detail > 0.4) {
            var ls = stride * 0.5;
            part(limb, px + fx * ls, py + fy * ls, w * 0.34, w * 0.62, legH + bob * 0.5,
                shadeHex(bodyCol, 0.55), alpha, 1, 0);
            part(limb, px - fx * ls, py - fy * ls, w * 0.34, w * 0.62, legH - bob * 0.5,
                shadeHex(bodyCol, 0.48), alpha, 1, 0);
        }

        /* ---- torso ----
         * Tapered, so the body is wider at the shoulders than at the waist.
         * That single taper is what separates a body from a stack of crates. */
        var torsoH = h * 0.42;
        var leanX = fx * lean * w * 0.5, leanY = fy * lean * w * 0.5;
        part(mass, px + leanX, py + leanY, w, w * 0.78, torsoH, bodyCol, alpha, 1,
            legH + bob + sink);

        /* ---- head ----
         * Smaller, and a little wider than it is deep, so the silhouette
         * keeps a distinct head-to-shoulder break at gameplay zoom. */
        var headH = h * 0.16;
        part(mass, px + leanX * 1.5, py + leanY * 1.5, w * 0.62, w * 0.56, headH,
            shadeHex(bodyCol, 1.3), alpha, 1, legH + torsoH + bob + sink);

        /* ---- a channel you can see ----
         * Recall and a long cast both cost the player several seconds of
         * standing still. Drawn as a ring on the ground with a sweeping
         * fill, so the progress is legible from across a lane and the unit
         * visibly commits to the channel instead of merely stalling. */
        if (channel > 0 || (u.casting && u.casting.dur > 0.35)) {
            var prog = channel > 0 ? channel
                : (u.casting.t / u.casting.dur);
            channelRing(px, py, u.radius, prog, channel > 0 ? PAL.heal : PAL.gold);
        }

        if (champ) {
            drawChampionKit(u, alpha, bodyCol, w, h, fx, fy, bob, t, detail);
        } else {
            drawMinionKit(u, alpha, bodyCol, w, h, fx, fy, legH + torsoH + bob + sink, detail);
        }

        /* ---- hit flash ----
         * A body that has just been hit does not move, change shape or make
         * a sound, so before this the only evidence a champion had been hit
         * was a number - which is capped, transient, and shown only for some
         * sources. One white fill over the body, fading over a fifth of a
         * second, costs a single draw call and is the difference between
         * "something hit me" and "I have no idea what just happened".
         *
         * Drawn as one screen-space blob rather than by re-drawing the body
         * in white: re-drawing doubles the cost of every body in a teamfight,
         * which is exactly when the frame budget is worst. */
        if (u.alive && u.lastDamagedAt !== undefined) {
            var since = S.Combat.now - u.lastDamagedAt;
            if (since >= 0 && since < 0.2) {
                var fa = (1 - since / 0.2) * 0.5;
                var fp = project(px, py, (h - crouch) * 0.5 + sink);
                ctx.globalAlpha = fa;
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.ellipse(fp.x, fp.y,
                    w * 0.62 * P.xScale * (H / cam.span),
                    (h - crouch) * 0.34 * (H / cam.span),
                    0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        /* ---- the player's marker ----
         * Drawn last and in world space, because it has to read as being
         * under the body rather than on top of it. */
        if (u.isPlayer) {
            diamond(u.x, u.y, u.radius * 3.4, PAL.gold, 0.34);
            if (quality.rich) {
                diamond(u.x, u.y, u.radius * 2.2, PAL.gold, 0.18);
                diamond(u.x, u.y, u.radius * 4.1, PAL.gold, 0.1);
            }
        }
    }

    /* Champions. The silhouette is the whole point: a player scanning a fight
     * identifies champions by shape, long before they read a name. */
    function drawChampionKit(u, alpha, bodyCol, w, h, fx, fy, z, bob, t, detail) {
        var role = u.role || "bruiser";
        var wide = shadeHex(bodyCol, 1.16);
        var pale = shadeHex(bodyCol, 1.42);

        if (role === "tank") {
            /* Pauldron slab, offset forward, and a shield on the far side.
             * The most distinct silhouette in the roster and the one the
             * player needs fastest - a tank is the thing that has to be
             * watched. */
            box(u.x + fx * w * 0.34, u.y + fy * w * 0.34, w * 1.9, w * 1.5, h * 0.2, wide, alpha, 1, z + h * 0.2);
            box(u.x - fx * w * 0.72, u.y - fy * w * 0.72, w * 0.3, w * 1.5, h * 0.62, pale, alpha, 1, z - h * 0.16);
        } else if (role === "mage") {
            /* Robe: a wide skirt that flares below the torso, and a staff held
             * forward. Tall and narrow above, wide below. */
            box(u.x, u.y, w * 1.5, w * 1.15, h * 0.3, shadeHex(bodyCol, 0.8), alpha, 1, z - h * 0.26);
            box(u.x + fx * w * 0.7, u.y + fy * w * 0.7, w * 0.18, w * 0.18, h * 0.86, pale, alpha, 1, z - h * 0.3);
            box(u.x + fx * w * 0.7, u.y + fy * w * 0.7, w * 0.3, w * 0.3, h * 0.1, PAL.gold, alpha, 1, z + h * 0.5);
        } else if (role === "marksman") {
            /* Rifle held level in front, and a low crouch. The only
             * silhouette with a long horizontal line, which is exactly what
             * "the one that will kill me from across the lane" should look
             * like. */
            box(u.x + fx * w * 0.9, u.y + fy * w * 0.9, w * 1.7, w * 0.16, w * 0.16, pale, alpha, 1, z + h * 0.1);
            box(u.x, u.y, w * 0.9, w * 0.9, h * 0.1, shadeHex(bodyCol, 0.9), alpha, 1, z + h * 0.1);
        } else {
            /* Bruiser: hunched, wide blade held low and to the side. */
            box(u.x + fx * w * 0.5, u.y + fy * w * 0.5, w * 1.4, w * 0.5, h * 0.1, pale, alpha, 1, z + h * 0.14);
            box(u.x + fx * w * 1.15, u.y + fy * w * 1.15, w * 0.2, w * 0.9, h * 0.5, wide, alpha, 1, z - h * 0.12);
        }

        /* A crest in the warband colour, so faction reads from above even on
         * a Low tier where the kit detail is gone. */
        if (detail > 0.6) {
            box(u.x, u.y, w * 0.2, w * 0.2, h * 0.16, PAL.gold, alpha, 1, z + h * 0.42);
        }
    }

    /* Minions. Much less, because there are ninety of them. The forward
     * offset is the part that matters; the rest is there so the wave is not
     * a field of identical grey cubes. */
    function drawMinionKit(u, alpha, bodyCol, w, h, fx, fy, z, detail) {
        var dark = shadeHex(bodyCol, 0.7);

        if (u.shape === "ranged") {
            /* Scout: thin, with a long weapon. */
            box(u.x + fx * w * 0.75, u.y + fy * w * 0.75, w * 1.2, w * 0.16, w * 0.16, dark, alpha, 1, z + h * 0.06);
        } else if (u.shape === "cannon") {
            /* Siege: squat and broad, and it gets a bigger block on top
             * because you have to be able to find it in a wave - the cannon
             * is worth three times a conscript and losing it is the mistake
             * that decides a lane. */
            box(u.x, u.y, w * 1.7, w * 1.4, h * 0.2, dark, alpha, 1, z + h * 0.1);
            box(u.x, u.y, w * 0.9, w * 0.8, h * 0.2, PAL.goldDim, alpha, 1, z + h * 0.3);
        } else {
            /* Conscript: a weapon forward, offset along facing so it has a
             * facing at all. */
            box(u.x + fx * w * 0.6, u.y + fy * w * 0.6, w * 0.9, w * 0.22, w * 0.22, dark, alpha, 1, z + h * 0.04);
        }

        /* Banner minion: a pole, because the banner is what the whole wave
         * has to be pushed toward and it needs to be visible through nine
         * other bodies. */
        if (u.banner) {
            box(u.x - fx * w * 0.5, u.y - fy * w * 0.5, w * 0.14, w * 0.14, h * 1.1, PAL.goldDim, alpha, 1, 0);
            box(u.x - fx * w * 0.5, u.y - fy * w * 0.5, w * 0.7, w * 0.1, h * 0.22, PAL.gold, alpha, 1, h * 0.82);
        }
    }

    function factionColour(u) {
        var f = S.Factions[u.faction];
        var col = f ? f.accent : PAL.bone;
        /* The player is gold. A champion you control must never be confused
         * with a teammate you cannot tell apart, because "which one is me" is
         * the single most important piece of information on the screen. */
        if (u.isPlayer) col = PAL.gold;
        return col;
    }

    function shadeHex(hex, m) {
        /* Cheap inline lighten/darken for the secondary boxes. Kept separate
         * from shade() because that one returns a fillStyle string from a
         * lighting multiplier; this one produces a colour to pass into it. */
        var r = parseInt(hex.slice(1, 3), 16) * m;
        var g = parseInt(hex.slice(3, 5), 16) * m;
        var b = parseInt(hex.slice(5, 7), 16) * m;
        r = S.clamp(r | 0, 0, 255); g = S.clamp(g | 0, 0, 255); b = S.clamp(b | 0, 0, 255);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    /* Structures read as architecture: a tower is a tapered stack with
     * buttresses, a Core is a tall stepped keep, a camp is a low mound. The
     * difference matters because a player has to recognise "that is OUR
     * tower, and it is at two plates" from across the lane. */
    function drawStructure(s, alpha) {
        var detail = quality.detail;
        var col = s.team === 0 ? PAL.teamBlue : (s.team === 1 ? PAL.teamRed : PAL.stoneLight);
        if (s.kind === "camp") col = PAL.chitin;
        if (s.kind === "reliquary") col = PAL.gold;
        if (s.kind === "summon_turret") col = PAL.chitin;
        if (s.team < 0 && s.kind !== "camp" && s.kind !== "reliquary") col = PAL.stoneLight;

        if (s.kind === "tower" && quality.material > 0) {
            /* Scorch: the ground under a damaged structure darkens. It costs
             * one ellipse and it means a tower's health is legible from
             * across a lane, at a glance, by a player who is not looking
             * directly at it. */
            var maxHp = s.base.hp;
            var wear = maxHp > 0 ? 1 - s.hp / maxHp : 0;
            if (wear > 0.25) {
                var sp = project(s.x, s.y, 1.5);
                ellipse(sp.x, sp.y,
                    s.radius * 1.5 * P.xScale * (H / cam.span),
                    s.radius * 1.5 * (P.xScale + P.yScale) * 0.5 * (H / cam.span),
                    Math.min(0.34, wear * 0.34), "#140f0c", 0);
            }
        }

        if (s.kind === "tower") {
            var w = s.radius * 2.2;
            /* Three stacked segments, each narrower, so a tower at two plates
             * visibly loses its top third. Damage state you can read without
             * a health bar is worth six of those bars. */
            var seg = s.alive ? 3 - s.platesDown : 0;
            var hPer = s.height / 3;
            var z = 0;
            /* A tower is an obelisk, not a column of crates: every tier tapers
             * within itself as well as between tiers, so the profile narrows
             * continuously instead of stepping. The taper is free - it is a
             * property of the shape table, not extra faces. */
            var shaft = detail > 0.5 ? SHAPE.obelisk : null;
            for (var i = 0; i < 3; i++) {
                if (i >= seg) break;
                var w2 = w * (1 - i * 0.14);
                /* Buttresses on the bottom tier only: they are what makes a
                 * tower read as a fortification rather than a column. Splayed
                 * rather than square, so they flare out from the shaft. */
                if (i === 0) {
                    part(detail > 0.5 ? SHAPE.slab : null,
                        s.x, s.y, w2 * 1.22, w2 * 1.22, hPer * 0.3,
                        shadeHex(col, 0.72), alpha, 1, z);
                    z += hPer * 0.3;
                }
                part(shaft, s.x, s.y, w2, w2, hPer * 0.7, shadeHex(col, 1 - i * 0.1), alpha, 1, z);
                z += hPer * 0.7;
            }
            /* The lit top edge. Previously this was a fake: a thin bright BOX
             * sitting on top of the stack, which is the one thing a flat-shaded
             * body cannot do on its own. A real prism cap catches the key at
             * its true angle, so the highlight is now geometry rather than a
             * decal pretending to be geometry. */
            if (quality.rich) {
                prism(SHAPE.slab, s.x, s.y, w * 0.9, w * 0.82, hPer * 0.06,
                    shadeHex(col, 1.7), alpha, 1, z - hPer * 0.06);
            }
            /* The aiming block on top. A tower at zero plates is an
             * invitation and the player has to see that from the lane. */
            if (s.alive) part(detail > 0.5 ? SHAPE.slab : null,
                s.x, s.y, w * 0.46, w * 0.46, hPer * 0.5, PAL.goldDim, alpha, 1, z);
            if (s.alive) diamond(s.x, s.y, w * 1.5, PAL.gold, 0.16);
        } else if (s.kind === "core") {
            /* A stepped keep, each tier standing on the one below. Hexagonal,
             * because a Core is the one building on the map that is supposed
             * to read as ancient rather than as built, and a hexagon is the
             * cheapest way to say that with straight lines. */
            var cw = s.radius * 2.4;
            var cz = 0;
            var core = detail > 0.5 ? SHAPE.obelisk : null;
            var tiers = [[1.0, 0.34, 0.78], [0.76, 0.34, 1.05], [0.52, 0.32, 1.35]];
            for (var t = 0; t < tiers.length; t++) {
                part(core, s.x, s.y, cw * tiers[t][0], cw * tiers[t][0],
                    s.height * tiers[t][1],
                    t === 2 ? PAL.gold : shadeHex(col, tiers[t][2]), alpha, 1, cz);
                cz += s.height * tiers[t][1];
            }
            /* The sigil: a bright diamond floating clear of the roof, turning
             * slowly. It is the one animated thing on the map and it is on
             * screen in the base a player looks at most, which is exactly the
             * wrong place to waste the frame budget - so it is the only piece
             * that stops the moment anim is off. */
            diamond(s.x, s.y, cw * 0.62, PAL.gold, 0.5);
            if (quality.anim) {
                var sa = animTime * 0.5;
                for (var g = 0; g < 3; g++) {
                    var ga = sa + g * 2.094;
                    diamond(s.x + Math.cos(ga) * cw * 0.2, s.y + Math.sin(ga) * cw * 0.11,
                        cw * 0.16, "#ffe08a", 0.5);
                }
            }
        } else if (s.kind === "camp") {
            /* A chitin mound: irregular, and pointed rather than stepped. */
            var rock = detail > 0.5 ? SHAPE.rock : null;
            part(rock, s.x, s.y, s.radius * 1.8, s.radius * 1.8, s.height * 0.5,
                shadeHex(col, 0.62), alpha, 1, 0);
            part(detail > 0.5 ? SHAPE.shard : null,
                s.x, s.y, s.radius * 1.1, s.radius * 1.1, s.height * 0.6, col, alpha, 1, s.height * 0.5);
            part(detail > 0.5 ? SHAPE.shard : null,
                s.x, s.y, s.radius * 0.5, s.radius * 0.5, s.height * 0.4, shadeHex(col, 1.3), alpha, 1,
                s.height * 1.1);
        } else if (s.kind === "reliquary") {
            var slab = detail > 0.5 ? SHAPE.slab : null;
            part(slab, s.x, s.y, s.radius * 1.9, s.radius * 1.9, s.height * 0.45,
                shadeHex(col, 0.55), alpha, 1, 0);
            part(slab, s.x, s.y, s.radius * 1.25, s.radius * 1.25, s.height * 0.5,
                shadeHex(col, 0.85), alpha, 1, s.height * 0.45);
            prism(SHAPE.slab, s.x, s.y, s.radius * 0.7, s.radius * 0.7, s.height * 0.5,
                PAL.gold, alpha, 1, s.height * 0.95);
            ring(s.x, s.y, s.radius * 1.5, PAL.gold, 0.5);
        } else if (s.kind === "summon_turret") {
            part(detail > 0.5 ? SHAPE.slab : null,
                s.x, s.y, s.radius * 1.5, s.radius * 1.5, s.height * 0.35, shadeHex(col, 0.7), alpha, 1, 0);
            part(detail > 0.5 ? SHAPE.slab : null,
                s.x, s.y, s.radius * 1.05, s.radius * 1.05, s.height * 0.65, col, alpha, 1, s.height * 0.35);
        }
    }

    /* ===== Haze =====
     *
     * An enemy you cannot see is drawn, but drawn wrong: flattened to a
     * silhouette at 22% alpha with no team tint and no detail. You know
     * something is there. You do not know what it is or how hurt it is, so
     * you cannot aim a skillshot at it. That is the entire fog-of-war
     * contract, and it is why the silhouette gets no health bar. */
    function drawSilhouette(u) {
        var a = C.vision.hazeAlpha;
        ctx.globalAlpha = a;
        /* One flat diamond at the unit's footprint, tinted toward the team
         * colour by exactly enough to say "not ours". */
        diamond(u.x, u.y, u.radius * 2, PAL.teamRed, 0.9);
        ctx.globalAlpha = 1;
    }

    /* ===== Effects ===== */
    /* Per-archetype effects.
     *
     * Thirteen archetypes, thirteen silhouettes. That is the whole design
     * rule: if two abilities draw the same shape, a player cannot tell them
     * apart in the half second a fight gives them, and the archetype is doing
     * no work. Six of them - cone, dash, shield, buff, blink and summon - used
     * to draw NOTHING AT ALL, so half the roster's spellbook was invisible.
     */
    function drawEffect(e) {
        var k = H / cam.span;

        /* ---- cone: a swept wedge that collapses ---- */
        if (e.kind === "cone") {
            var t = e.life / e.dur;
            var c = project(e.x, e.y, 8);
            var reach = e.range * P.xScale * k;
            /* The wedge narrows as it fades, so the leading edge reads as
             * sweeping forward rather than as a static pie. */
            var half = e.angle * 0.5 * (1 - t * 0.35);
            ctx.globalAlpha = (1 - t) * 0.42;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.ellipse(c.x, c.y, reach * (0.6 + t * 0.4), reach * (0.6 + t * 0.4) * 0.58,
                0, e.ang - half, e.ang + half);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = (1 - t) * 0.75;
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, reach * (0.6 + t * 0.4), reach * (0.6 + t * 0.4) * 0.58,
                0, e.ang - half, e.ang + half);
            ctx.stroke();
            ctx.globalAlpha = 1;
            return;
        }

        /* ---- trail: a dash's after-images ---- */
        if (e.kind === "trail") {
            var tt = 1 - e.life / e.dur;
            var sc = 0.4 + tt * 0.6;
            ctx.globalAlpha = tt * 0.4;
            box(e.x, e.y, e.r * 2.4 * sc, e.r * 1.9 * sc, e.h * 0.5 * sc, e.color, tt * 0.4, 1, 0);
            ctx.globalAlpha = 1;
            return;
        }

        /* ---- dome: a shield shell ----
         * Drawn as three flattened elliptical bands rather than an outline,
         * because a bubble has to read as a SURFACE the champion is inside,
         * and a single stroked ellipse reads as a ring drawn on the ground. */
        if (e.kind === "dome") {
            var dt = e.life / e.dur;
            var fade = dt < 0.12 ? dt / 0.12 : (dt > 0.85 ? (1 - dt) / 0.15 : 1);
            var p0 = project(e.x, e.y, 2);
            var rx = e.r * P.xScale * k;
            var shrink = e.max > 0 && e.left !== undefined && e.left < e.max
                ? Math.max(0.35, e.left / e.max) : 1;
            ctx.globalAlpha = fade * 0.3;
            ctx.fillStyle = e.color;
            /* base */
            ctx.beginPath();
            ctx.ellipse(p0.x, p0.y, rx * shrink, rx * shrink * 0.58, 0, 0, Math.PI * 2);
            ctx.fill();
            /* mid band, raised */
            var mid = project(e.x, e.y, e.h * 0.45);
            ctx.globalAlpha = fade * 0.16;
            ctx.beginPath();
            ctx.ellipse(mid.x, mid.y, rx * shrink * 0.9, rx * shrink * 0.9 * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            /* crown, highest and brightest */
            var top = project(e.x, e.y, e.h * 0.95);
            ctx.globalAlpha = fade * 0.5;
            ctx.beginPath();
            ctx.ellipse(top.x, top.y, rx * shrink * 0.62, rx * shrink * 0.62 * 0.36, 0, 0, Math.PI * 2);
            ctx.stroke();
            /* Vertical ribs tie the three bands into one surface. */
            ctx.globalAlpha = fade * 0.22;
            ctx.lineWidth = 1.5;
            for (var ri = 0; ri < 6; ri++) {
                var ra = ri / 6 * Math.PI * 2 + e.life * 1.4;
                var rx2 = Math.cos(ra), ry2 = Math.sin(ra);
                ctx.beginPath();
                ctx.moveTo(p0.x + rx2 * rx * shrink, p0.y + ry2 * rx * shrink * 0.58);
                ctx.lineTo(top.x + rx2 * rx * shrink * 0.62, top.y + ry2 * rx * shrink * 0.62 * 0.36);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            return;
        }

        /* ---- aura: motes rising around a buffed champion ---- */
        if (e.kind === "aura") {
            var at2 = e.life / e.dur;
            var afade = at2 < 0.15 ? at2 / 0.15 : (at2 > 0.8 ? (1 - at2) / 0.2 : 1);
            var ap = project(e.x, e.y, 2);
            var ar = e.r * P.xScale * k;
            /* The group aura: a wide, faint ground disc that shows the radius
             * COMMAND is actually reaching. */
            if (e.radius > 0) {
                ellipse(ap.x, ap.y, e.radius * P.xScale * k,
                    e.radius * P.xScale * k * 0.58, afade * 0.09, e.color, 0);
                ellipse(ap.x, ap.y, e.radius * P.xScale * k,
                    e.radius * P.xScale * k * 0.58, afade * 0.2, e.color, 1);
            }
            for (var mi = 0; mi < e.seeds; mi++) {
                var ma = mi / e.seeds * Math.PI * 2 + e.life * 2.2;
                /* Rise and fade: the mote climbs, so the buff reads as
                 * something lifting rather than a halo sitting there. */
                var mz = 20 + ((e.life * 0.55 + mi * 0.16) % 1) * e.h * 1.1;
                var mp = project(e.x + Math.cos(ma) * e.r * 0.8, e.y + Math.sin(ma) * e.r * 0.8, mz);
                var ma2 = 1 - ((e.life * 0.55 + mi * 0.16) % 1);
                ctx.globalAlpha = afade * ma2 * 0.85;
                ctx.fillStyle = e.color;
                var ms = 3 * k * 400 * 0.01;
                ctx.fillRect(mp.x - ms / 2, mp.y - ms / 2, ms, ms);
            }
            ctx.globalAlpha = 1;
            return;
        }

        /* ---- warp: two portals, one of them closing ---- */
        if (e.kind === "warp") {
            var wt = e.life / e.dur;
            var wp = project(e.x, e.y, 6);
            var wr = e.r * P.xScale * k * (e.out ? 1 + wt * 0.8 : 1 - wt * 0.55);
            ctx.globalAlpha = (1 - wt) * 0.75;
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 2 + (1 - wt) * 2;
            ctx.beginPath();
            ctx.ellipse(wp.x, wp.y, wr, wr * 0.58, 0, 0, Math.PI * 2);
            ctx.stroke();
            /* Counter-rotating inner ring, so the portal reads as spinning
             * rather than as a static hoop. */
            ctx.globalAlpha = (1 - wt) * 0.4;
            ctx.beginPath();
            for (var wi = 0; wi < 3; wi++) {
                var wa = e.life * (e.out ? 5 : -5) + wi * 2.094;
                var wx = wp.x + Math.cos(wa) * wr * 0.6;
                var wy = wp.y + Math.sin(wa) * wr * 0.35;
                if (wi === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
            return;
        }

        /* ---- chain bolt ----
         * Drawn as its HOPS rather than its live segment. The interesting
         * shape of a chain bolt is the lightning arcing between two units,
         * and drawing only the current segment means the player sees a short
         * line travelling instead of a bolt crossing a fight. */
        if (e.kind === "proj" && e.look === "chain" && e.chainPts && e.chainPts.length > 1) {
            var cc = e.color || PAL.warpLit;
            ctx.lineCap = "round";
            for (var cp = 0; cp < e.chainPts.length - 1; cp++) {
                var q0 = project(e.chainPts[cp].x, e.chainPts[cp].y, 30);
                var q1 = project(e.chainPts[cp + 1].x, e.chainPts[cp + 1].y, 30);
                ctx.globalAlpha = 0.28;
                ctx.strokeStyle = cc;
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(q0.x, q0.y);
                ctx.lineTo(q1.x, q1.y);
                ctx.stroke();
                /* Zig-zag that decays toward the target, so the bolt visibly
                 * converges on it rather than just wobbling. */
                ctx.globalAlpha = 0.95;
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(q0.x, q0.y);
                var segs = 5;
                for (var sg = 1; sg < segs; sg++) {
                    var f2 = sg / segs;
                    var amp = Math.sin(f2 * Math.PI) * 16;
                    var a2 = Math.atan2(q1.y - q0.y, q1.x - q0.x) + Math.PI / 2;
                    ctx.lineTo(q0.x + (q1.x - q0.x) * f2 + Math.cos(a2) * amp,
                        q0.y + (q1.y - q0.y) * f2 + Math.sin(a2) * amp * 0.5);
                }
                ctx.lineTo(q1.x, q1.y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            return;
        }

        if (e.kind === "proj") {
            var col = e.look === "towerbolt" ? PAL.gold
                : (e.color || (e.dmgType === "magic" ? PAL.warpLit : "#ffd9a0"));
            var kk = H / cam.span;
            var base = Math.max(1.5, e.width * kk);
            var head = project(e.x, e.y, e.z);
            var mid = project(e.x - e.dx * 46, e.y - e.dy * 46, e.z);
            var tail = project(e.x - e.dx * 118, e.y - e.dy * 118, e.z);
            ctx.lineCap = "round";

            /* halo, then a tapering tail, then a white-hot core. Three
             * strokes rather than one: a single stroke reads as a drawn line,
             * and the difference between "a bolt" and "a marker on the map"
             * is the difference between an ability and a UI element. */
            ctx.globalAlpha = 0.3 * quality.rich;
            ctx.strokeStyle = col;
            ctx.lineWidth = base * 3.2;
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y);
            ctx.lineTo(head.x, head.y);
            ctx.stroke();

            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y);
            ctx.lineTo(mid.x, mid.y);
            ctx.stroke();
            ctx.lineWidth = base * 1.8;
            ctx.beginPath();
            ctx.moveTo(mid.x, mid.y);
            ctx.lineTo(head.x, head.y);
            ctx.stroke();

            ctx.globalAlpha = 0.95;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = Math.max(1, base * 0.55);
            ctx.beginPath();
            ctx.moveTo(mid.x, mid.y);
            ctx.lineTo(head.x, head.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
            return;
        }
        if (e.kind === "blast") {
            /* The telegraph. A growing circle that reads as "this is where
             * the damage will be" from the moment it appears, which is the
             * only fair way to draw a delayed AoE. */
            var k = S.clamp01(e.t / Math.max(0.01, e.dur));
            var p = project(e.x, e.y, 2);
            var kr = H / cam.span;
            var rad = (e.r || 200) * P.xScale * kr;
            var bc = e.color || PAL.ember;

            /* A countdown readable without looking at it: the interior fills
             * from the outside in while the boundary closes on the true
             * radius. Two edges converging on one moment makes the instant of
             * detonation unambiguous, which is the only fair way to draw a
             * delayed AoE. */
            ctx.globalAlpha = 0.1 + k * 0.26;
            ctx.fillStyle = bc;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rad * k, rad * k * 0.58, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 0.4 + k * 0.55;
            ctx.strokeStyle = bc;
            ctx.lineWidth = 2 + k * 2;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rad * (1.5 - k * 0.5), rad * (1.5 - k * 0.5) * 0.58, 0, 0, Math.PI * 2);
            ctx.stroke();

            /* the true radius: exactly what will be hit, always visible. */
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, rad, rad * 0.58, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            return;
        }
        if (e.kind === "field") {
            var pf = project(e.x, e.y, 2);
            var kf = H / cam.span;
            var rr = (e.r || 200) * P.xScale * kf;
            var ft = e.life / e.dur;
            var fade = ft > 0.85 ? (1 - ft) / 0.15 : 1;
            var fc = e.color || PAL.warpLit;

            ctx.globalAlpha = 0.17 * fade;
            ctx.fillStyle = fc;
            ctx.beginPath();
            ctx.ellipse(pf.x, pf.y, rr, rr * 0.58, 0, 0, Math.PI * 2);
            ctx.fill();

            if (quality.rich) {
                /* Two counter-rotating interior spirals. A flat translucent
                 * ellipse is indistinguishable from a range indicator, which
                 * is the one thing a persistent damage field must never be
                 * mistaken for. */
                ctx.globalAlpha = 0.2 * fade;
                ctx.strokeStyle = fc;
                ctx.lineWidth = 2;
                for (var si = 0; si < 2; si++) {
                    ctx.beginPath();
                    for (var sp = 0; sp <= 14; sp++) {
                        var sf = sp / 14;
                        var sa = sf * Math.PI * 3 + e.life * (si ? -1.6 : 1.6);
                        var sr = rr * sf * 0.9;
                        var sxp = pf.x + Math.cos(sa) * sr;
                        var syp = pf.y + Math.sin(sa) * sr * 0.58;
                        if (sp === 0) ctx.moveTo(sxp, syp); else ctx.lineTo(sxp, syp);
                    }
                    ctx.stroke();
                }
            }

            ctx.globalAlpha = (0.45 + Math.sin(e.life * 4) * 0.14) * fade;
            ctx.strokeStyle = fc;
            ctx.lineWidth = 2;
            var pr2 = 1 + Math.sin(e.life * 3) * 0.02;
            ctx.beginPath();
            ctx.ellipse(pf.x, pf.y, rr * pr2, rr * 0.58 * pr2, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            return;
        }
        /* ---- beam ----
         * Glow, body, wandering white core, then a flare at each end. A beam
         * drawn as one thick line is a rectangle; the layering is what makes
         * it read as something with a temperature. */
        if (e.kind === "beam") {
            var a = project(e.x, e.y, 40), b = project(e.ex, e.ey, 40);
            var fade = 1 - e.life / Math.max(0.01, e.dur);
            var bcol = e.color || PAL.warpLit;
            var bw = (e.width || 200) * P.xScale * (H / cam.span);
            /* The core wanders inside the beam so the light has a body rather
             * than being a rectangle of paint. */
            var jx = (S.rng() - 0.5) * bw * 0.06;
            var jy = (S.rng() - 0.5) * bw * 0.06;
            ctx.lineCap = "round";

            ctx.globalAlpha = fade * 0.3 * quality.rich;
            ctx.strokeStyle = bcol;
            ctx.lineWidth = bw * 1.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.stroke();

            ctx.globalAlpha = fade * 0.85;
            ctx.lineWidth = bw;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.stroke();

            ctx.globalAlpha = fade;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = Math.max(1, bw * 0.3);
            ctx.beginPath();
            ctx.moveTo(a.x + jx, a.y + jy);
            ctx.lineTo(b.x + jx, b.y + jy);
            ctx.stroke();

            /* End flares, so the beam visibly has a source and a terminus. */
            if (quality.rich) {
                ctx.globalAlpha = fade * 0.7;
                ctx.fillStyle = "#fff";
                var fr = bw * 0.4 * fade;
                ctx.beginPath();
                ctx.ellipse(a.x, a.y, fr, fr * 0.62, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(b.x, b.y, fr * 1.4, fr * 0.9, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            return;
        }
        /* ---- shockwave ----
         * A thin bright ring chasing a slower thick one. The gap between them
         * is what sells the expansion: one ring alone reads as a circle being
         * drawn, and two at different rates read as force leaving a point. */
        if (e.kind === "ring") {
            var pr = project(e.x, e.y, 4);
            var kr2 = H / cam.span;
            var grow = S.clamp01(e.life / Math.max(0.01, e.dur));
            var outR = e.r * P.xScale * kr2;
            var rcol = e.color || PAL.ember;

            ctx.globalAlpha = (1 - grow) * 0.85;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2.5 * (1 - grow) + 0.5;
            ctx.beginPath();
            ctx.ellipse(pr.x, pr.y, outR * grow, outR * 0.58 * grow, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = (1 - grow) * 0.5;
            ctx.strokeStyle = rcol;
            ctx.lineWidth = 7 * (1 - grow) + 1;
            ctx.beginPath();
            ctx.ellipse(pr.x, pr.y, outR * grow * 0.82, outR * 0.58 * grow * 0.82, 0, 0, Math.PI * 2);
            ctx.stroke();

            if (quality.rich) {
                /* dust thrown up underneath the wave */
                ctx.globalAlpha = (1 - grow) * 0.14;
                ctx.strokeStyle = "#0a0c10";
                ctx.lineWidth = 14 * (1 - grow) + 2;
                ctx.beginPath();
                ctx.ellipse(pr.x, pr.y, outR * grow * 1.06, outR * 0.58 * grow * 1.06, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    }

    /* ===== Health bars =====
     *
     * Screen-space, drawn after the world so they are never occluded by a
     * tower. Drawn for champions always, for minions only when damaged or
     * when the player asked for them - ninety health bars at once is a wall
     * of pixels that hides the wave it is describing. */
    function drawBar(u, alpha) {
        var p = project(u.x, u.y, u.height + 26);
        var max = u.kind === "tower" || u.kind === "core" ? u.base.hp : S.Combat.stat(u, "hp");
        var frac = max > 0 ? S.clamp01(u.hp / max) : 0;
        var w = u.kind === "champ" ? 54 : (u.kind === "structure" || u.kind === "tower" || u.kind === "core" ? 74 : 30);
        var h = u.kind === "champ" ? 7 : 4;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(p.x - w / 2 - 1, p.y - 1, w + 2, h + 2);
        ctx.fillStyle = u.team === 0 ? PAL.teamBlue : PAL.teamRed;
        ctx.fillRect(p.x - w / 2, p.y, w * frac, h);

        if (u.shield > 0) {
            var sfrac = S.clamp01(u.shield / Math.max(1, max));
            ctx.fillStyle = PAL.shield;
            ctx.fillRect(p.x - w / 2, p.y - 3, w * Math.min(1, sfrac), 2);
        }
        ctx.globalAlpha = 1;
    }

    /* ===== Overlays =====
     *
     * What the held ability buttons would do, drawn on the ground beneath
     * everything. This is the shape of the commitment the player is about to
     * make, and it has to be drawn UNDER the units rather than over them -
     * an arc drawn on top of a minion makes it impossible to see whether
     * that minion is inside it, which is the only question the arc exists to
     * answer. */
    function drawPreviews(world) {
        var pv = world.previews;
        if (!pv || !pv.length) return;
        var p = world.player;
        if (!p || !p.alive) return;

        for (var i = 0; i < pv.length; i++) {
            var v = pv[i];
            var col = v.affordable ? PAL.gold : "#7d8792";
            var k = H / cam.span;

            if (v.shape === "range") {
                ring(v.reach ? v.tx : p.x, v.reach ? v.ty : p.y, v.reach, col, v.affordable ? 0.3 : 0.18);
                if (v.reach) {
                    /* A short spur from the champion to the far edge, so the
                     * circle reads as attached to something. */
                    var a = project(p.x, p.y, 4);
                    var b = project(v.tx, v.ty, 4);
                    ctx.globalAlpha = v.affordable ? 0.22 : 0.12;
                    ctx.strokeStyle = col;
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([5, 7]);
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.globalAlpha = 1;
                }
                continue;
            }

            var c = project(v.tx, v.ty, 2);
            var r = v.rad * P.xScale * k;

            if (v.shape === "cone") {
                /* A swept wedge along the aim. Drawn as a filled sector with a
                 * soft edge, because the question is "is that minion in
                 * there" and a hard outline makes that harder to answer than
                 * a shaded region does. */
                ctx.globalAlpha = v.affordable ? 0.2 : 0.1;
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.moveTo(c.x, c.y);
                ctx.ellipse(c.x, c.y, v.reach * P.xScale * k, v.reach * P.xScale * k * 0.58,
                    0, v.angle - v.rad, v.angle + v.rad);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = v.affordable ? 0.55 : 0.3;
                ctx.strokeStyle = col;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.globalAlpha = 1;
                continue;
            }

            if (v.shape === "ring") {
                ellipse(c.x, c.y, r, r * 0.58, v.affordable ? 0.3 : 0.15, col, 2);
                continue;
            }

            /* Blast, beam, field: the area that will be affected. */
            var rr = v.rad * P.xScale * k;
            ctx.globalAlpha = v.affordable ? 0.16 : 0.08;
            ctx.fillStyle = col;
            ellipse(c.x, c.y, rr, rr * 0.58, 1, col, 0);
            ctx.globalAlpha = v.affordable ? 0.6 : 0.32;
            ellipse(c.x, c.y, rr, rr * 0.58, 0, col, 2);
            ctx.globalAlpha = 1;
            /* Crosshair at the centre, so the aim point is unambiguous. */
            ctx.strokeStyle = col;
            ctx.globalAlpha = v.affordable ? 0.8 : 0.4;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(c.x - 7, c.y); ctx.lineTo(c.x + 7, c.y);
            ctx.moveTo(c.x, c.y - 4); ctx.lineTo(c.x, c.y + 4);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    /* Flat ellipse helper, in screen space. Every ground decal in this
     * renderer is one of these, so it is written once. */
    function ellipse(x, y, rx, ry, fillAlpha, color, stroke) {
        if (fillAlpha > 0) {
            ctx.globalAlpha = fillAlpha;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = color;
            ctx.lineWidth = stroke;
            ctx.beginPath();
            ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    function drawRange(world, u, radius, color) {
        if (!u || !u.alive) return;
        ring(u.x, u.y, radius, color || PAL.gold, 0.28);
    }

    /* Shared animation clock. A single time source rather than a per-unit
     * phase, so nothing has to store an animation state and a unit that
     * is not on screen costs nothing. */
    var animTime = 0;

    /* ===== Frame ===== */
    function draw(world, dt) {
        animTime += dt;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        /* Screen shake.
         *
         * READ-ONLY. The decay lives in World.decayShake, beside the rest of
         * the transient ageing, because a renderer that writes simulation
         * state means two headless runs of the same seed disagree with each
         * other - and the balance harness is built entirely on the assumption
         * that they do not. */
        if (world.shakeAmt > 0.001) {
            cam.shakeX = (S.rng() - 0.5) * world.shakeAmt * 26;
            cam.shakeY = (S.rng() - 0.5) * world.shakeAmt * 20;
        } else {
            cam.shakeX = 0; cam.shakeY = 0;
        }

        ctx.fillStyle = PAL.void;
        ctx.fillRect(0, 0, W, H);

        /* World transform: everything from here is in projected space with
         * the camera baked into project(). */
        var k = H / cam.span;

        drawGround();
        drawBasePads();
        /* Under the units: an overlay drawn on top makes it impossible to
         * tell whether a minion is inside the area it marks. */
        drawPreviews(world);
        /* The player's aim line. Under everything, so it never hides a unit. */
        if (world.player && world.player.alive && world.aimPoint) {
            var ap = project(world.player.x, world.player.y, 10);
            var bp = project(world.aimPoint.x, world.aimPoint.y, 10);
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = PAL.gold;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 8]);
            ctx.beginPath();
            ctx.moveTo(ap.x, ap.y); ctx.lineTo(bp.x, bp.y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }

        collect(world);

        for (var i = 0; i < drawList.length; i++) {
            var item = drawList[i];
            if (item.kind === "shadow") {
                shadow(item.o.x, item.o.y, item.r, item.h, item.a);
                continue;
            }
            if (item.kind === "prop") {
                drawProp(item.o);
                continue;
            }
            if (item.kind === "unit") {
                var u = item.o;
                /* Haze. A unit the viewer's team cannot see is a silhouette,
                 * and gets neither a body nor a health bar. */
                var seen = u.visible || u.team === camTeam;
                if (u.kind === "champ") {
                    /* Champions are always drawn for their own team, and drawn
                     * as silhouettes for the enemy even when inside the
                     * enemy's base - you must never get free information
                     * about a champion standing on their fountain. */
                    drawUnit(u, 1, animTime);
                    if (!u.visible && u.team !== camTeam) {
                        drawSilhouette(u);
                    }
                } else if (seen) {
                    drawUnit(u, 1, animTime);
                } else if (quality.haze) {
                    drawSilhouette(u);
                }
            } else if (item.kind === "structure") {
                var s = item.o;
                drawStructure(s, s.visible || s.team === camTeam || s.team < 0 ? 1 : 0.35);
            } else {
                drawEffect(item.o);
            }
        }

        drawParticles(world, dt);
        drawBars(world);
        drawFloaters(world);
        drawNumbers(world);
    }

    var camTeam = 0;
    function setTeam(t) { camTeam = t; }

    /* Particles and floating text, and damage numbers.
     *
     * READ-ONLY. Ageing and integration happen in world.step, next to the
     * test that expires them. They used to live here, and when the expiry
     * half was moved to the simulation the ageing half was left behind - so
     * `life` only advanced when something drew, nothing ever expired, and a
     * five-minute match leaked three thousand particles drawn at full alpha.
     * Nothing in this function may mutate a particle. */
    function drawParticles(world, dt) {
        var fx = world.fx;
        var k = H / cam.span;
        for (var i = 0; i < fx.length; i++) {
            var p = fx[i];
            var t = p.life / p.dur;
            /* Off-screen particles still cost a projection and a branch.
             * The pool is capped, but a hundred and eighty of them when the
             * camera is pointed the other way is a hundred and eighty
             * wasted. */
            if (!inView(p.x, p.y, 80)) continue;
            var s = project(p.x, p.y, p.z);

            if (p.spark) {
                var a = project(p.x0, p.y0, p.z);
                var b = project(p.x1, p.y1, p.z);
                ctx.globalAlpha = (1 - t) * 0.95;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2 * quality.rich;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
                continue;
            }

            /* Bodies fade as they age and shrink slightly, so a burst reads
             * as dissipating rather than as an expanding starfield. */
            ctx.globalAlpha = (1 - t) * (1 - t) * quality.particles;
            ctx.fillStyle = p.color;
            var r = p.size * (0.5 + t * 0.9) * k * 4;
            ctx.fillRect(s.x - r / 2, s.y - r / 2, r, r);
            /* The additive core is what makes a spark look like light rather
             * than like a chip of paint. Only on the tiers that can afford it. */
            if (quality.rich && p.glow) {
                ctx.globalAlpha = (1 - t) * 0.5 * quality.particles;
                ctx.fillStyle = p.glow;
                var r2 = r * 0.45;
                ctx.fillRect(s.x - r2 / 2, s.y - r2 / 2, r2, r2);
            }
        }
        ctx.globalAlpha = 1;
    }

    /* Damage numbers. Rising, fading, and sized by magnitude - a big hit has
     * to be readable in the half second it actually takes, so the ones that
     * matter are the ones that get bigger and louder. */
    function drawNumbers(world) {
        if (!world.nums || !world.nums.length) return;
        ctx.textAlign = "center";
        for (var i = 0; i < world.nums.length; i++) {
            var n = world.nums[i];
            var t = n.life / n.dur;
            var s = project(n.x, n.y, n.z + t * 150);
            /* Pop in fast, then settle. A number that fades from zero is
             * unreadable at the moment it first appears, which is the only
             * moment anybody looks at it. */
            var pop = t < 0.12 ? 0.55 + (t / 0.12) * 0.45 : 1;
            ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
            ctx.font = "700 " + Math.round((n.crit ? 19 : 14) * pop) +
                "px ui-monospace, 'SF Mono', Menlo, monospace";
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillText(n.text, s.x + 1, s.y + 1);
            ctx.fillStyle = n.color;
            ctx.fillText(n.text, s.x, s.y);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
    }

    function drawBars(world) {
        for (var i = 0; i < world.units.length; i++) {
            var u = world.units[i];
            if (!u.alive) continue;
            if (u.kind === "champ") {
                if (u.team === camTeam || u.visible) drawBar(u, 1);
            } else if (u.kind === "minion" && (u.hp < u.base.hp || world.showMinionBars)) {
                if (u.visible || u.team === camTeam) drawBar(u, 0.7);
            }
        }
        for (i = 0; i < world.structures.length; i++) {
            var s = world.structures[i];
            if (!s.alive) continue;
            if (s.kind === "tower" || s.kind === "core") drawBar(s, 1);
        }
    }

    function drawFloaters(world) {
        ctx.textAlign = "center";
        ctx.font = "600 13px ui-monospace, 'SF Mono', Menlo, monospace";
        for (var i = world.texts.length - 1; i >= 0; i--) {
            var t = world.texts[i];
            if (t.life >= t.dur) continue;
            var p = project(t.x, t.y, t.z + t.life * 70);
            ctx.globalAlpha = 1 - t.life / t.dur;
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillText(t.text, p.x + 1, p.y + 1);
            ctx.fillStyle = t.color;
            ctx.fillText(t.text, p.x, p.y);
            ctx.globalAlpha = 1;
        }
        ctx.textAlign = "left";
    }

    /* ===== Setup ===== */
    function init(el, opts) {
        canvas = el;
        ctx = canvas.getContext("2d", { alpha: false });
        resize(opts);
        return ctx;
    }

    function resize(opts) {
        var rect = canvas.getBoundingClientRect();
        W = Math.max(320, Math.round(rect.width || window.innerWidth));
        H = Math.max(240, Math.round(rect.height || window.innerHeight));
        /* DPR is capped at 2. A 3x phone screen at full resolution is three
         * times the fill cost for a difference nobody can see on a moving
         * isometric scene, and it is the fastest way to a 30fps game on
         * hardware that is otherwise capable of 60. */
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        if (opts && opts.quality) setQuality(opts.quality);
    }

    function setQuality(name) {
        if (!C.quality[name]) return;
        quality = C.quality[name];
        perf.tier = name;
        perf.locked = name !== "med";
        dpr = Math.min(window.devicePixelRatio || 1, quality.dpr);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
    }

    /* Auto-quality. Samples real frame times and drops a tier when the
     * average is bad, rather than asking the player. A setting nobody
     * understands is a setting nobody changes. */
    function samplePerf(frameMs) {
        if (perf.locked) return;
        perf.frames++;
        perf.total += frameMs;
        if (perf.frames < C.perfSampleFrames) return;
        var avg = perf.total / perf.frames;
        perf.frames = 0; perf.total = 0;
        if (avg > C.perfDowngradeMs && perf.tier !== "low") {
            setQuality(perf.tier === "high" ? "med" : "low");
        } else if (avg < C.perfUpgradeMs && perf.tier === "low") {
            setQuality("med");
        }
    }

    /* ===== Camera control ===== */
    function follow(x, y, dt) {
        cam.x = S.damp(cam.x, x, C.camera.followLerp, dt);
        cam.y = S.damp(cam.y, y, C.camera.followLerp, dt);
    }

    function panTo(x, y) { cam.x = x; cam.y = y; }
    function setZoom(z) {
        cam.span = S.clamp(C.camera.viewSpan * z, C.camera.viewSpan * C.camera.zoomMin,
            C.camera.viewSpan * C.camera.zoomMax);
    }
    function zoomBy(z) { setZoom((cam.span / C.camera.viewSpan) * z); }

    /* ===== Menu backdrop =====
     *
     * The menu is the first thing anyone sees and the canvas behind it was
     * never painted at all, because the frame loop returns early when no
     * match is running. A comment claimed it was kept "live on the menu" and
     * the code did the opposite. Rather than run a real match in the
     * background - which would burn a phone's battery on the title screen -
     * this is a cheap drifting warp haze: about forty points of light and a
     * handful of strokes, a fraction of the cost of one match frame, and it
     * makes the title screen look like a place rather than a black rectangle.
     */
    var hazePts = null;
    function initHaze() {
        hazePts = [];
        for (var i = 0; i < 44; i++) {
            hazePts.push({
                x: S.rng(),
                y: S.rng(),
                z: S.rng(),
                s: 0.6 + S.rng() * 2.2,
                hue: S.rng()
            });
        }
    }

    function drawAmbient(dt, time) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#0c1018");
        g.addColorStop(1, PAL.void);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        if (!hazePts) initHaze();

        /* Three slow diagonals, at the same pitch as the world projection so
         * the backdrop and the battlefield agree about which way is down. */
        ctx.globalAlpha = 0.07;
        ctx.strokeStyle = PAL.warp;
        ctx.lineWidth = 2;
        for (var i = 0; i < 3; i++) {
            var p = ((time * (12 + i * 7)) % (W + 400)) - 200;
            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p - H * 0.46, H);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        for (var k = 0; k < hazePts.length; k++) {
            var h = hazePts[k];
            /* Wraps on all three axes, so the field never repeats visibly. */
            var px = ((h.x + time * 0.008 * (0.4 + h.z)) % 1) * W;
            var py = ((h.y + time * 0.012 * (0.4 + h.z * 0.6)) % 1) * H;
            var a = (0.1 + h.z * 0.3) * (0.6 + 0.4 * Math.sin(time * 0.7 + h.z * 9));
            ctx.globalAlpha = a;
            ctx.fillStyle = h.hue > 0.72 ? PAL.gold : PAL.warpLit;
            var s = h.s * (1 + h.z * 0.8);
            ctx.fillRect(px, py, s, s);
        }
        ctx.globalAlpha = 1;

        /* The three lanes, as faint ghosts: the shape of the game you are
         * about to play, behind the button that starts it. */
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = PAL.gold;
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        var names = S.Map.laneNames;
        for (var n = 0; n < names.length; n++) {
            var pts = S.Map.lanes[names[n]];
            var pr = projectRaw((pts[0].x + pts[pts.length - 1].x) / 2,
                (pts[0].y + pts[pts.length - 1].y) / 2, 0);
            ctx.beginPath();
            for (var j = 0; j < pts.length; j++) {
                var pj = projectRaw(pts[j].x, pts[j].y, 0);
                var sx = W / 2 + (pj.x - pr.x) * 0.42;
                var sy = H / 2 + (pj.y - pr.y) * 0.42;
                if (j === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    S.Render = {
        init: init,
        drawAmbient: drawAmbient,
        resize: resize,
        draw: draw,
        project: project,
        toScreen: project,
        /* Geometry internals, exposed for the render budget test: it asserts
         * on how many faces a shape actually costs, which is the number the
         * whole low-poly design rests on. */
        prism: prism,
        SHAPE: SHAPE,
        projectRaw: projectRaw,
        toWorld: toWorld,
        follow: follow,
        panTo: panTo,
        setZoom: setZoom,
        zoomBy: zoomBy,
        setQuality: setQuality,
        samplePerf: samplePerf,
        setTeam: setTeam,
        drawRange: drawRange,
        drawPreviews: drawPreviews,
        get cam() { return cam; },
        canvasSize: function () { return { width: W, height: H }; },
        get tier() { return perf.tier; }
    };

})(window.IF = window.IF || {});
