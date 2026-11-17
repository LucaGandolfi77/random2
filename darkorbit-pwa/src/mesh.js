/*
 * DEEP ORBIT — procedural low-poly 2.5D hulls.
 *
 * Every ship is a tiny faceted mesh built from lofted cross-sections, drawn
 * with an oblique top-down projection. Back faces are culled, faces sorted by
 * depth, and each face gets one constant brightness from a dot product
 * against a key light. No WebGL, no art assets, no per-frame allocations:
 * shaded colors and projection buffers are cached/reused.
 *
 * The mesh is purely cosmetic — targeting, hitboxes and the camera stay 2D.
 */

const TAU = Math.PI * 2;

/* Camera tilt. A top-down view with just enough height/shear that the side
   facets show, so a hull reads as a solid rather than a flat silhouette. */
const SQUASH = 0.84;
const TILT = 0.58;
const SHEAR = 0.24;

const VIEW = (function () {
    const x = -SHEAR;
    const y = TILT / SQUASH;
    const z = 1;
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
})();

const LIGHT = (function () {
    const v = [-0.48, -0.56, 0.72];
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
})();

const AMBIENT = 0.46;
const FILL = 0.14;

/* ------------------------------------------------------------------ */
/* Mesh construction                                                   */
/* ------------------------------------------------------------------ */

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function normalize(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
}

function ringPoints(w, h, sides) {
    const pts = [];
    const offset = sides === 6 ? Math.PI / 6 : Math.PI / 8;
    for (let k = 0; k < sides; k++) {
        const a = (k / sides) * TAU + offset;
        pts.push([Math.cos(a) * w, Math.sin(a) * h]);
    }
    return pts;
}

/* Loft a set of {x, w, h} cross-sections into one faceted hull. */
function loft(sections, sides, tone) {
    const n = sides;
    const vertices = [];
    for (const s of sections) {
        const pts = ringPoints(s.w, s.h, n);
        for (const p of pts) vertices.push([s.x, p[0], p[1]]);
    }

    const faces = [];
    const idx = (ring, point) => ring * n + ((point % n) + n) % n;

    for (let r = 0; r < sections.length - 1; r++) {
        for (let j = 0; j < n; j++) {
            const a = idx(r, j);
            const b = idx(r, j + 1);
            const c = idx(r + 1, j + 1);
            const d = idx(r + 1, j);
            let normal = normalize(cross(
                [vertices[b][0] - vertices[a][0], vertices[b][1] - vertices[a][1], vertices[b][2] - vertices[a][2]],
                [vertices[c][0] - vertices[a][0], vertices[c][1] - vertices[a][1], vertices[c][2] - vertices[a][2]]
            ));
            const cx = (vertices[a][0] + vertices[b][0] + vertices[c][0] + vertices[d][0]) / 4;
            const cy = (vertices[a][1] + vertices[b][1] + vertices[c][1] + vertices[d][1]) / 4;
            const cz = (vertices[a][2] + vertices[b][2] + vertices[c][2] + vertices[d][2]) / 4;
            let order = [a, b, c, d];
            if (normal[0] * cx + normal[1] * cy + normal[2] * cz < 0) {
                order = [a, d, c, b];
                normal = [-normal[0], -normal[1], -normal[2]];
            }
            faces.push({ i: order, n: normal, tone: tone || 1 });
        }
    }

    // End caps.
    const cap = (ring, sign) => {
        const list = [];
        for (let j = 0; j < n; j++) list.push(idx(ring, j));
        faces.push({ i: sign > 0 ? list : list.slice().reverse(), n: [sign, 0, 0], tone: (tone || 1) * (sign > 0 ? 1.08 : 0.78) });
    };
    cap(0, -1);
    cap(sections.length - 1, 1);

    return { v: vertices, f: faces };
}

function box(w, h, d, tone) {
    const x = w / 2, y = h / 2, z = d / 2;
    return {
        v: [
            [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
            [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]
        ],
        f: [
            { i: [0, 1, 2, 3], n: [0, 0, -1], tone: 0.78 * (tone || 1) },
            { i: [4, 7, 6, 5], n: [0, 0, 1], tone: 1.1 * (tone || 1) },
            { i: [0, 4, 5, 1], n: [0, -1, 0], tone: 0.72 * (tone || 1) },
            { i: [3, 2, 6, 7], n: [0, 1, 0], tone: 0.96 * (tone || 1) },
            { i: [1, 5, 6, 2], n: [1, 0, 0], tone: 1.0 * (tone || 1) },
            { i: [0, 3, 7, 4], n: [-1, 0, 0], tone: 0.82 * (tone || 1) }
        ]
    };
}

function translated(mesh, dx, dy, dz) {
    return {
        v: mesh.v.map((p) => [p[0] + dx, p[1] + dy, p[2] + dz]),
        f: mesh.f
    };
}

function merge(parts) {
    const v = [];
    const f = [];
    for (const part of parts) {
        const base = v.length;
        for (const p of part.v) v.push(p);
        for (const face of part.f) {
            f.push({ i: face.i.map((i) => i + base), n: face.n, tone: face.tone });
        }
    }
    return { v, f };
}

function enrich(sections) {
    const out = [sections[0]];
    for (let i = 0; i < sections.length - 1; i++) {
        const a = sections[i];
        const b = sections[i + 1];
        out.push({
            x: (a.x + b.x) / 2,
            w: (a.w + b.w) / 2 * 0.96,
            h: (a.h + b.h) / 2 * 0.94
        });
        out.push(b);
    }
    return out;
}

function hull(profile, options) {
    const o = options || {};
    const sections = enrich(profile);
    const body = loft(sections, o.sides || 8, o.tone || 1);
    const parts = [body];

    // Canopy, sensor ridge and two wing-mounted cannon housings.
    const mid = profile[Math.floor(profile.length / 2)];
    parts.push(translated(box(6.5, mid.w * 0.42, mid.h * 0.32, 1.22), mid.x * 0.2, 0, mid.h * 0.82));
    parts.push(translated(box(3, 1.8, 1.5, 0.82), profile[0].x * 0.45, mid.w * 0.72, mid.h * 0.5));
    parts.push(translated(box(3, 1.8, 1.5, 0.82), profile[0].x * 0.45, -mid.w * 0.72, mid.h * 0.5));

    for (const pod of o.pods || []) {
        parts.push(translated(box(pod.w, pod.h, pod.d, pod.tone || 0.86), pod.x, pod.y, pod.z || 0));
    }
    return merge(parts);
}

/* ------------------------------------------------------------------ */
/* Hull catalogue                                                      */
/* ------------------------------------------------------------------ */

function P(x, w, h) { return { x, w, h }; }

const SHIP_MESHES = {
    kestrel: hull([P(20, 0.8, 0.5), P(8, 4.5, 2.8), P(-4, 8.5, 3.8), P(-14, 5.5, 2.4)]),
    viper: hull([P(25, 0.6, 0.4), P(11, 3.6, 2.2), P(-5, 5.8, 3), P(-17, 3.6, 1.9)]),
    warden: hull([P(19, 1, 0.7), P(8, 7, 3.6), P(-6, 11.5, 4.6), P(-17, 7.5, 2.8)], {
        pods: [
            { x: -3, y: 9, z: -0.4, w: 12, h: 3, d: 2.4, tone: 0.8 },
            { x: -3, y: -9, z: -0.4, w: 12, h: 3, d: 2.4, tone: 0.8 }
        ]
    }),
    bulwark: hull([P(18, 1.8, 1), P(6, 9, 4.6), P(-8, 13.5, 5.8), P(-18, 9.5, 3.6)], {
        pods: [
            { x: -4, y: 11, z: 0, w: 14, h: 4, d: 3.2, tone: 0.78 },
            { x: -4, y: -11, z: 0, w: 14, h: 4, d: 3.2, tone: 0.78 }
        ]
    }),
    spectre: hull([P(27, 0.5, 0.35), P(12, 2.8, 1.8), P(-4, 10.5, 2.4), P(-19, 5.5, 1.6)], {
        sides: 6, tone: 1.05
    }),
    colossus: hull([P(20, 2.4, 1.3), P(6, 12, 5.6), P(-10, 17, 6.8), P(-20, 11, 4.5)], {
        pods: [
            { x: 0, y: 12, z: 1.2, w: 16, h: 4.5, d: 4, tone: 0.82 },
            { x: 0, y: -12, z: 1.2, w: 16, h: 4.5, d: 4, tone: 0.82 }
        ]
    }),
    ranger: hull([P(28, 0.45, 0.35), P(12, 3.2, 2), P(-4, 7.5, 3), P(-20, 4, 1.7)], {
        sides: 6, tone: 1.08,
        pods: [
            { x: 2, y: 8, z: 0.6, w: 14, h: 2.4, d: 2.4, tone: 0.86 },
            { x: 2, y: -8, z: 0.6, w: 14, h: 2.4, d: 2.4, tone: 0.86 }
        ]
    }),
    monolith: hull([P(20, 3, 1.8), P(6, 14, 7), P(-10, 21, 9), P(-22, 14, 6)], {
        sides: 8, tone: 0.9,
        pods: [
            { x: -4, y: 15, z: 1.5, w: 18, h: 6, d: 5, tone: 0.78 },
            { x: -4, y: -15, z: 1.5, w: 18, h: 6, d: 5, tone: 0.78 }
        ]
    })
};

const ENEMY_MESHES = {
    swarm: hull([P(13, 0.5, 0.4), P(4, 3.2, 1.8), P(-8, 5, 2), P(-13, 3, 1.2)], { sides: 8, tone: 0.9 }),
    scout: hull([P(16, 0.6, 0.4), P(3, 5, 2.4), P(-8, 6.5, 2.8), P(-14, 3.5, 1.6)], { sides: 6, tone: 0.95 }),
    sentinel: hull([P(14, 1, 0.8), P(4, 6, 4), P(-8, 8, 4.8), P(-15, 5, 2.8)], { sides: 6, tone: 1.05 }),
    raider: hull([P(19, 0.7, 0.5), P(6, 4.5, 2.4), P(-7, 7, 3), P(-15, 4, 1.8)], { sides: 6 }),
    leviathan: hull([P(30, 2, 1.4), P(12, 11, 6), P(-8, 20, 9), P(-26, 12, 5.5)], {
        sides: 8,
        pods: [
            { x: -6, y: 15, z: 1, w: 20, h: 5, d: 4, tone: 0.82 },
            { x: -6, y: -15, z: 1, w: 20, h: 5, d: 4, tone: 0.82 }
        ]
    }),
    devourer: hull([P(34, 2.6, 1.8), P(14, 14, 7.5), P(-10, 24, 11), P(-30, 15, 7)], {
        sides: 8,
        pods: [
            { x: -8, y: 18, z: 1.5, w: 24, h: 6, d: 5, tone: 0.8 },
            { x: -8, y: -18, z: 1.5, w: 24, h: 6, d: 5, tone: 0.8 }
        ]
    }),
    wisp: hull([P(22, 0.35, 0.3), P(8, 2, 1.2), P(-6, 4.5, 1.6), P(-16, 2, 0.9)], { sides: 6, tone: 1.1 }),
    crawler: hull([P(16, 2, 1), P(4, 11, 3.6), P(-10, 18, 4.5), P(-20, 12, 2.8)], {
        sides: 8, tone: 0.82,
        pods: [
            { x: -6, y: 13, z: -0.6, w: 16, h: 4, d: 2.6, tone: 0.72 },
            { x: -6, y: -13, z: -0.6, w: 16, h: 4, d: 2.6, tone: 0.72 }
        ]
    }),
    phantom: hull([P(24, 0.5, 0.35), P(9, 3.2, 1.8), P(-7, 8, 2.4), P(-18, 4, 1.4)], { sides: 6, tone: 1.1 }),
    obelisk: hull([P(34, 2.2, 1.6), P(12, 13, 8), P(-10, 22, 12), P(-28, 14, 6)], {
        sides: 6, tone: 1.08,
        pods: [
            { x: -4, y: 16, z: 2, w: 22, h: 5, d: 5, tone: 0.84 },
            { x: -4, y: -16, z: 2, w: 22, h: 5, d: 5, tone: 0.84 }
        ]
    }),
    lancer: hull([P(30, 0.5, 0.4), P(11, 4, 2.4), P(-6, 8, 3.2), P(-18, 4, 2)], { sides: 6, tone: 1.06 }),
    queen: hull([P(36, 3, 2), P(14, 15, 8), P(-10, 26, 13), P(-30, 16, 7)], {
        sides: 8, tone: 1.04,
        pods: [
            { x: -6, y: 19, z: 2, w: 26, h: 6, d: 6, tone: 0.84 },
            { x: -6, y: -19, z: 2, w: 26, h: 6, d: 6, tone: 0.84 }
        ]
    })
};

const DRONE_MESH = hull([P(11, 0.4, 0.3), P(3, 2.6, 1.3), P(-7, 4.2, 1.5), P(-11, 2, 0.8)], { sides: 6, tone: 1.05 });

export function getMesh(kind, id) {
    if (kind === "ship") return SHIP_MESHES[id] || SHIP_MESHES.kestrel;
    if (kind === "enemy") return ENEMY_MESHES[id] || ENEMY_MESHES.swarm;
    if (kind === "drone") return DRONE_MESH;
    return SHIP_MESHES.kestrel;
}

export function meshStats() {
    let faces = 0;
    let verts = 0;
    for (const set of [SHIP_MESHES, ENEMY_MESHES]) {
        for (const key of Object.keys(set)) {
            faces += set[key].f.length;
            verts += set[key].v.length;
        }
    }
    return { ships: Object.keys(SHIP_MESHES).length, enemies: Object.keys(ENEMY_MESHES).length, faces, verts };
}

/* ------------------------------------------------------------------ */
/* Shading cache                                                       */
/* ------------------------------------------------------------------ */

const parsed = new Map();
const shaded = new Map();

function parseColor(color) {
    let c = parsed.get(color);
    if (c) return c;
    let hex = String(color || "#ffffff").replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const n = parseInt(hex, 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    if (!Number.isFinite(c[0])) c = [255, 255, 255];
    parsed.set(color, c);
    return c;
}

function shade(color, amount, flash) {
    const bucket = Math.round(amount * 24);
    const key = color + "|" + bucket + "|" + (flash ? 1 : 0);
    let out = shaded.get(key);
    if (out) return out;
    const rgb = parseColor(color);
    let a = amount;
    let r, g, b;
    if (flash) {
        r = rgb[0] * a * 0.4 + 255 * 0.6;
        g = rgb[1] * a * 0.4 + 255 * 0.6;
        b = rgb[2] * a * 0.4 + 255 * 0.6;
    } else {
        r = rgb[0] * a;
        g = rgb[1] * a;
        b = rgb[2] * a;
    }
    out = "rgb(" + Math.min(255, Math.round(r)) + "," + Math.min(255, Math.round(g)) + "," + Math.min(255, Math.round(b)) + ")";
    shaded.set(key, out);
    return out;
}

/* ------------------------------------------------------------------ */
/* Draw                                                                */
/* ------------------------------------------------------------------ */

const PX = new Float32Array(128);
const PY = new Float32Array(128);
const order = new Int32Array(128);
const depth = new Float32Array(128);

export function drawMesh(ctx, mesh, x, y, angle, color, scale, opts) {
    if (!mesh) return;
    const o = opts || {};
    const c = Math.cos(angle || 0);
    const s = Math.sin(angle || 0);
    const sc = scale === undefined ? 1 : scale;
    const verts = mesh.v;

    for (let i = 0; i < verts.length; i++) {
        const vx = verts[i][0];
        const vy = verts[i][1];
        const vz = verts[i][2];
        const rx = c * vx - s * vy;
        const ry = s * vx + c * vy;
        PX[i] = x + (rx + vz * SHEAR) * sc;
        PY[i] = y + (ry * SQUASH - vz * TILT) * sc;
    }

    let count = 0;
    const faces = mesh.f;
    for (let f = 0; f < faces.length; f++) {
        const face = faces[f];
        const nx = face.n[0], ny = face.n[1], nz = face.n[2];
        const rx = c * nx - s * ny;
        const ry = s * nx + c * ny;
        const facing = rx * VIEW[0] + ry * VIEW[1] + nz * VIEW[2];
        if (facing <= 0) continue;
        let d = 0;
        for (const vi of face.i) d += PX[vi] * VIEW[0] + PY[vi] * VIEW[1];
        depth[count] = d / face.i.length;
        order[count] = f;
        count += 1;
    }

    // Far faces first (smaller view-space depth).
    for (let a = 1; a < count; a++) {
        const od = order[a];
        const dd = depth[a];
        let b = a - 1;
        while (b >= 0 && depth[b] > dd) {
            order[b + 1] = order[b];
            depth[b + 1] = depth[b];
            b -= 1;
        }
        order[b + 1] = od;
        depth[b + 1] = dd;
    }

    if (o.alpha !== undefined) {
        ctx.globalAlpha = o.alpha;
    }

    for (let k = 0; k < count; k++) {
        const face = faces[order[k]];
        const nx = face.n[0], ny = face.n[1], nz = face.n[2];
        const rx = c * nx - s * ny;
        const ry = s * nx + c * ny;
        const lam = rx * LIGHT[0] + ry * LIGHT[1] + nz * LIGHT[2];
        const lit = lam > 0 ? lam : -lam * 0.42;
        const amount = (AMBIENT + (1 - AMBIENT) * lit + FILL * (1 - lit)) * (face.tone || 1);
        ctx.fillStyle = shade(color, amount, !!o.flash);
        ctx.beginPath();
        ctx.moveTo(PX[face.i[0]], PY[face.i[0]]);
        for (let q = 1; q < face.i.length; q++) ctx.lineTo(PX[face.i[q]], PY[face.i[q]]);
        ctx.closePath();
        ctx.fill();
        if (o.outlines) {
            ctx.strokeStyle = shade(color, amount * 0.45, !!o.flash);
            ctx.lineWidth = (0.8 / sc) || 0.5;
            ctx.stroke();
        }
    }

    if (o.alpha !== undefined) ctx.globalAlpha = 1;
}
