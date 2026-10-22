/*
 * GULPER - low-poly mesh builders.
 *
 * Every body in the game is a small pile of faceted primitives: a
 * low-segment ellipsoid for the trunk, boxes for limbs, cones for spikes.
 * Nothing is smooth and nothing is textured. The look comes from the
 * silhouette and from the flat shading, not from detail.
 *
 * A mesh is:
 *   { verts: Float32Array of x,y,z triples,
 *     faces: [ { idx: [...], n: [nx,ny,nz] } ] }
 *
 * Normals are computed once at build time and transformed with the mesh,
 * so shading costs one dot product per face per frame.
 */
(function (S) {
    "use strict";

    function Mesh() {
        this.verts = [];
        this.faces = [];
    }

    Mesh.prototype.push = function (x, y, z) {
        this.verts.push(x, y, z);
        return this.verts.length / 3 - 1;
    };

    /* Add a face from a list of vertex indices and compute its normal.
     * The normal is normalised and points away from the mesh centre, which
     * for our convex shapes is the same thing as pointing outwards. */
    Mesh.prototype.face = function (idx, mat) {
        var v = this.verts;
        var n = idx.length;
        /* Newell's method: robust for slightly non-planar polygons, which
         * a jittered blob always is. */
        var nx = 0, ny = 0, nz = 0;
        for (var i = 0; i < n; i++) {
            var a = idx[i] * 3, b = idx[(i + 1) % n] * 3;
            nx += (v[a + 1] - v[b + 1]) * (v[a + 2] + v[b + 2]);
            ny += (v[a + 2] - v[b + 2]) * (v[a] + v[b]);
            nz += (v[a] - v[b]) * (v[a + 1] + v[b + 1]);
        }
        var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        this.faces.push({ idx: idx.slice(), n: [nx / len, ny / len, nz / len], mat: mat || 0 });
    };

    Mesh.prototype.bake = function () {
        this.verts = new Float32Array(this.verts);
        return this;
    };

    /* ===== primitives ===== */

    /* A faceted ellipsoid. The workhorse: trunks, heads, drums, pods. */
    function ellipsoid(m, rx, ry, rz, seg, rings, rng, jitter, zBase) {
        var grid = [];
        var i, j;
        zBase = zBase || 0;
        for (j = 0; j <= rings; j++) {
            var theta = Math.PI * (j / rings);
            var st = Math.sin(theta), ct = Math.cos(theta);
            var row = [];
            for (i = 0; i < seg; i++) {
                var phi = (i / seg) * Math.PI * 2;
                var wob = 1;
                if (jitter && rng) wob = 1 + jitter * (rng.next() - 0.5);
                var x = rx * st * Math.cos(phi) * wob;
                var y = ry * st * Math.sin(phi) * wob;
                var z = zBase + rz * (ct * 0.5 + 0.5) * (rz > 0 ? 1 : 1);
                row.push(m.push(x, y, z));
            }
            grid.push(row);
        }
        for (j = 0; j < rings; j++) {
            for (i = 0; i < seg; i++) {
                var i2 = (i + 1) % seg;
                var a = grid[j][i], b = grid[j][i2];
                var c = grid[j + 1][i2], d = grid[j + 1][i];
                if (j === 0) {
                    m.face([a, c, d]);
                } else if (j === rings - 1) {
                    m.face([a, b, c]);
                } else {
                    m.face([a, b, c, d]);
                }
            }
        }
        return m;
    }

    /* An axis-aligned box, centred on x and y, sitting on z=0.
     *
     * `mat` is the material index: 0 is the body, 1 is skin, 2 is the
     * accent, 3 is the dark trim. A person made of one material is a
     * blob, and a blob at ten pixels tall is a smudge. */
    function box(m, w, h, d, ox, oy, z, mat) {
        var x0 = ox - w / 2, x1 = ox + w / 2;
        var y0 = oy - d / 2, y1 = oy + d / 2;
        var z0 = z, z1 = z + h;
        var v = [];
        v.push(m.push(x0, y0, z0)); /* 0 */
        v.push(m.push(x1, y0, z0)); /* 1 */
        v.push(m.push(x1, y1, z0)); /* 2 */
        v.push(x0, y1, z0); /* 3 */
        v.push(m.push(x0, y0, z1)); /* 4 */
        v.push(m.push(x1, y0, z1)); /* 5 */
        v.push(m.push(x1, y1, z1)); /* 6 */
        v.push(m.push(x0, y1, z1)); /* 7 */
        m.face([3, 2, 1, 0], mat);  /* bottom */
        m.face([4, 5, 6, 7], mat);  /* top */
        m.face([0, 1, 5, 4], mat);  /* -y */
        m.face([2, 3, 7, 6], mat);  /* +y */
        m.face([1, 2, 6, 5], mat);  /* +x */
        m.face([3, 0, 4, 7], mat);  /* -x */
        return m;
    }

    /* A cone pointing up, for spikes and crowns. */
    function cone(m, r, h, seg, ox, oy, z) {
        var tip = m.push(ox, oy, z + h);
        var ring = [];
        for (var i = 0; i < seg; i++) {
            var a = (i / seg) * Math.PI * 2;
            ring.push(m.push(ox + Math.cos(a) * r, oy + Math.sin(a) * r, z));
        }
        for (i = 0; i < seg; i++) {
            m.face([ring[i], ring[(i + 1) % seg], tip]);
        }
        return m;
    }

    /* A low-poly prism used for tapered tentacles and limbs. */
    function taper(m, r0, r1, h, seg, ox, oy, z, axis) {
        var bottom = [], top = [];
        var ax = axis === "x" ? 1 : 0;
        for (var i = 0; i < seg; i++) {
            var a = (i / seg) * Math.PI * 2;
            var ca = Math.cos(a) * r0, sa = Math.sin(a) * r0;
            var cb = Math.cos(a) * r1, sb = Math.sin(a) * r1;
            if (ax) {
                bottom.push(m.push(ox, oy + ca, z + sa));
                top.push(m.push(ox + h, oy + cb, z + sb));
            } else {
                bottom.push(m.push(ox + ca, oy + sa, z));
                top.push(m.push(ox + cb, oy + sb, z + h));
            }
        }
        for (i = 0; i < seg; i++) {
            var j = (i + 1) % seg;
            m.face([bottom[i], bottom[j], top[j], top[i]]);
        }
        /* Caps, so the shape is closed and the silhouette reads. */
        m.face(bottom.slice().reverse());
        m.face(top.slice());
        return m;
    }

    /* ===== characters ===== */

    /*
     * A human. Built from boxes: two legs, a torso, a head, two arms, and
     * whatever the role carries.
     *
     * `role` selects proportions and gear:
     *   civilian - plain, mid-height
     *   runner   - lean, forward lean
     *   heavy    - wide, bulky
     *   guard    - broad, peaked cap
     *   soldier  - helmet, webbing
     */
    function human(rng, role) {
        var m = new Mesh();
        var scale = 1;
        var legH = 15, torsoH = 13, headH = 6.5;
        var torsoW = 10, torsoD = 6;
        var legW = 4.2;

        if (role === "runner") { scale = 0.96; legH = 17; torsoH = 11; torsoW = 8.5; }
        if (role === "heavy") { scale = 1.12; legH = 13; torsoH = 15; torsoW = 13; torsoD = 8; }
        if (role === "guard") { scale = 1.04; torsoW = 12; torsoD = 7.5; }
        if (role === "soldier") { scale = 1.06; legH = 16; torsoH = 14; torsoW = 12; torsoD = 8; }

        /* Legs. The trousers are the body colour and the shoes are the
         * dark trim, which is what stops a person reading as a
         * rectangle. */
        box(m, legW * scale, legH, legW * scale, -torsoW * 0.22, 0, 0, 0);
        box(m, legW * scale, legH, legW * scale, torsoW * 0.22, 0, 0, 0);
        box(m, legW * scale * 1.1, 3, legW * scale * 1.2, -torsoW * 0.22, -0.6, 0, 3);
        box(m, legW * scale * 1.1, 3, legW * scale * 1.2, torsoW * 0.22, -0.6, 0, 3);

        /* Torso. */
        box(m, torsoW * scale, torsoH, torsoD, 0, 0, legH, 0);

        /* Arms, in skin. */
        box(m, 3.6, torsoH * 0.92, 3.6, -torsoW * 0.58 * scale, 0, legH + 1, 1);
        box(m, 3.6, torsoH * 0.92, 3.6, torsoW * 0.58 * scale, 0, legH + 1, 1);

        /* Neck and head. */
        var headZ = legH + torsoH;
        box(m, 3, 2.2, 3, 0, 0, headZ, 1);
        box(m, 6.4, headH, 6.4, 0, 0, headZ + 2, 1);

        /* Role gear, drawn as extra solids so the silhouette differs at a
         * glance even at eight pixels tall. */
        if (role === "guard" || role === "soldier") {
            /* Cap or helmet: a squat box on top, in the accent colour so
             * you can pick the armed out of a crowd. */
            box(m, 7, 2.6, 7, 0, 0, headZ + 2 + headH, 2);
            if (role === "guard") {
                box(m, 7, 1.2, 2.2, 0, -3.2, headZ + 3.6, 3);
            }
        }
        if (role === "heavy") {
            /* Shoulder plates. */
            box(m, 4.5, 4, 5.5, -torsoW * 0.62, 0, legH + torsoH - 4, 3);
            box(m, 4.5, 4, 5.5, torsoW * 0.62, 0, legH + torsoH - 4, 3);
        }
        if (role === "runner") {
            /* A hood behind the head. */
            box(m, 7, 5, 2.6, 0, 3.0, headZ + 1, 2);
        }

        /* Weapons. The right hand carries something on every role that has
         * one, so the silhouette says what it is before the colour does. */
        if (role === "soldier") {
            box(m, 2, 2, 14, torsoW * 0.6, -1.5, legH + 4, 3);
        } else if (role === "guard") {
            box(m, 1.8, 1.8, 9, torsoW * 0.6, -1.5, legH + 4, 3);
        }

        return m.bake();
    }

    /*
     * The alien.
     *
     * A soft trunk, a canted dome head, a hinged lower jaw, and a pair of
     * dorsal spines. The tentacles are not part of the mesh: they are
     * animated chains the renderer rebuilds every frame, because a static
     * tentacle is a noodle.
     */
    function alien(rng, opts) {
        opts = opts || {};
        var m = new Mesh();
        var seg = opts.seg || 9;
        var rings = opts.rings || 5;
        var bodyR = opts.bodyR || 1;

        /* Trunk: a slightly squashed ellipsoid. */
        ellipsoid(m, bodyR * 0.95, bodyR * 0.85, bodyR * 0.8, seg, rings, rng, 0.12, 0);

        /* Head: a smaller dome, pushed forward and up. */
        var head = new Mesh();
        ellipsoid(head, bodyR * 0.62, bodyR * 0.7, bodyR * 0.62, seg, Math.max(3, rings - 1), rng, 0.08, 0);
        /* Merge the head into the body mesh by offsetting its vertices. */
        merge(m, head, 0, -bodyR * 0.75, bodyR * 0.62);

        /* Jaw: a wedge under the head that the renderer can hinge open. */
        var jaw = new Mesh();
        box(jaw, bodyR * 0.72, bodyR * 0.3, bodyR * 1.05, 0, 0, 0, 2);
        merge(m, jaw, 0, -bodyR * 1.32, bodyR * 0.44);

        /* Two dorsal spines. */
        var spine = new Mesh();
        cone(spine, bodyR * 0.16, bodyR * 0.8, 5, 0, 0, 0);
        merge(m, spine, -bodyR * 0.3, bodyR * 0.15, bodyR * 1.1);
        merge(m, spine, bodyR * 0.15, bodyR * 0.2, bodyR * 1.05);

        return m.bake();
    }

    /* Copy one mesh into another with a translation. */
    function merge(dst, src, dx, dy, dz) {
        var base = dst.verts.length / 3;
        for (var i = 0; i < src.verts.length; i += 3) {
            dst.verts.push(src.verts[i] + dx, src.verts[i + 1] + dy, src.verts[i + 2] + dz);
        }
        for (var f = 0; f < src.faces.length; f++) {
            var face = src.faces[f];
            var idx = face.idx.map(function (i) { return i + base; });
            dst.faces.push({ idx: idx, n: face.n.slice() });
        }
    }

    /* ===== props =====
     * The scenery is boxes and cylinders. A cargo container is a box with a
     * rib; a barrel is a six-sided prism; a lamp post is a thin box. */

    function container(rng) {
        var m = new Mesh();
        box(m, 42, 21, 19, 0, 0, 0);
        /* Ribs, so a wall of containers is not a wall of slabs. */
        for (var i = -1; i <= 1; i++) {
            box(m, 1.8, 20, 19.8, i * 13, 0, 0.5);
        }
        return m.bake();
    }

    /*
     * A building.
     *
     * A city made of crates is a yard. These give the level structure:
     * something big to hide behind, something to run along, and a
     * silhouette on the horizon that says where the street goes.
     */
    function block(rng) {
        var m = new Mesh();
        var w = 110 + rng.next() * 40;
        var h = 40 + rng.next() * 26;
        var d = 62 + rng.next() * 26;
        box(m, w, h, d, 0, 0, 0, 0);
        /* A parapet, so the roof is not a flat lid. */
        box(m, w * 0.92, 5, d * 0.92, 0, 0, h - 1, 3);
        /* A band along the front, which is what reads as a wall. */
        box(m, w * 1.01, 4, d * 1.01, 0, 0, h * 0.55, 2);
        return m.bake();
    }

    function crate(rng) {
        var m = new Mesh();
        box(m, 17, 17, 17, 0, 0, 0);
        box(m, 17.8, 1.6, 1.6, 0, 0, 7);
        box(m, 1.6, 1.6, 17.8, 0, 0, 14.8);
        return m.bake();
    }

    function barrel(rng) {
        var m = new Mesh();
        taper(m, 7, 7, 22, 7, 0, 0, 0, "z");
        return m.bake();
    }

    function pillar(rng) {
        var m = new Mesh();
        box(m, 11, 44, 11, 0, 0, 0);
        box(m, 15, 4, 15, 0, 0, 40);
        return m.bake();
    }

    function console(rng) {
        var m = new Mesh();
        box(m, 19, 11, 12, 0, 0, 0);
        box(m, 18, 4, 2, 0, -5.5, 7);
        return m.bake();
    }

    function lamp(rng) {
        var m = new Mesh();
        box(m, 3, 34, 3, 0, 0, 0);
        box(m, 13, 4, 6, 0, -4, 31);
        return m.bake();
    }

    function rubble(rng) {
        var m = new Mesh();
        var n = 4 + Math.floor(rng.next() * 4);
        for (var i = 0; i < n; i++) {
            var s = 2 + rng.next() * 5;
            var mm = new Mesh();
            ellipsoid(mm, s, s * 0.8, s * 0.7, 5, 3, rng, 0.4, 0);
            merge(m, mm, (rng.next() - 0.5) * 14, (rng.next() - 0.5) * 14, 0);
        }
        return m.bake();
    }

    S.Meshes = {
        Mesh: Mesh,
        ellipsoid: ellipsoid,
        box: box,
        cone: cone,
        taper: taper,
        merge: merge,
        human: human,
        alien: alien,
        container: container,
        block: block,
        crate: crate,
        barrel: barrel,
        pillar: pillar,
        console: console,
        lamp: lamp,
        rubble: rubble
    };
})(window.GU = window.GU || {});
