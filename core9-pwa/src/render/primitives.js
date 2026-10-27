/*
 * CORE 9 — tiny low-poly primitives.
 *
 * Everything in the plant is made from boxes, prisms, domes, gables, pipes
 * and lattices. A face is a flat polygon in world space with one colour and
 * one brightness; the renderer projects it and fills it. No textures, no
 * gradients, no image files.
 */

const LIGHT = [-0.42, -0.55, 0.72];

export function shade(hex, factor) {
  const raw = String(hex || "#888888").trim();
  let n;
  if (raw.startsWith("rgb")) {
    const nums = raw.match(/\d+(?:\.\d+)?/g) || [];
    n = nums.slice(0, 3).map((v) => parseFloat(v));
  } else {
    const h = raw.replace("#", "");
    n = h.length === 3
      ? h.split("").map((c) => parseInt(c + c, 16))
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const r = Math.max(0, Math.min(255, Math.round((n[0] || 0) * factor)));
  const g = Math.max(0, Math.min(255, Math.round((n[1] || 0) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((n[2] || 0) * factor)));
  return "rgb(" + r + "," + g + "," + b + ")";
}

export function pushFace(out, points, color, tone = 1, opts = {}) {
  out.push({
    p: points,
    c: color,
    tone,
    alpha: opts.alpha == null ? 1 : opts.alpha,
    glow: opts.glow || 0,
  });
}

function normalTone(nx, ny, nz) {
  const d = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
  return Math.max(0.62, Math.min(1.18, 0.86 + d * 0.34));
}

export function box(out, cx, cy, z, w, h, d, color, opts = {}) {
  const x0 = cx - w / 2, x1 = cx + w / 2;
  const y0 = cy - d / 2, y1 = cy + d / 2;
  const z0 = z, z1 = z + h;
  const t = opts.tone || 1;
  pushFace(out, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], color, 1.18 * t, opts);
  pushFace(out, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], color, 0.98 * t, opts);
  pushFace(out, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], color, 1.06 * t, opts);
  pushFace(out, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], color, 0.76 * t, opts);
  pushFace(out, [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]], color, 0.82 * t, opts);
  if (opts.bottom !== false) {
    pushFace(out, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], color, 0.55 * t, opts);
  }
}

export function prism(out, cx, cy, z, r0, r1, h, sides, color, opts = {}) {
  sides = Math.max(3, sides | 0);
  const offset = opts.offset || Math.PI / sides;
  const z0 = z, z1 = z + h;
  const ring0 = [], ring1 = [];
  for (let i = 0; i < sides; i++) {
    const a = offset + (i / sides) * Math.PI * 2;
    ring0.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, z0]);
    ring1.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, z1]);
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    const a0 = offset + (i / sides) * Math.PI * 2;
    const a1 = offset + ((i + 1) / sides) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const tone = normalTone(Math.cos(am), Math.sin(am), 0.12) * (opts.tone || 1);
    pushFace(out, [ring0[i], ring0[j], ring1[j], ring1[i]], color, tone, opts);
  }
  if (r1 > 0.005) {
    const top = ring1.slice();
    pushFace(out, top, color, 1.18 * (opts.tone || 1), opts);
  }
  if (r0 > 0.005 && opts.bottom !== false) {
    const bot = ring0.slice().reverse();
    pushFace(out, bot, color, 0.58 * (opts.tone || 1), opts);
  }
}

/* A cooling-tower silhouette: wide base, pinched waist, open top. */
export function tower(out, cx, cy, z, radius, height, color, opts = {}) {
  const sides = opts.sides || 8;
  const rings = [
    { z: z, r: radius },
    { z: z + height * 0.18, r: radius * 0.78 },
    { z: z + height * 0.52, r: radius * 0.55 },
    { z: z + height * 0.86, r: radius * 0.63 },
    { z: z + height, r: radius * 0.72 },
  ];
  const pts = rings.map((ring) => {
    const arr = [];
    for (let i = 0; i < sides; i++) {
      const a = Math.PI / sides + (i / sides) * Math.PI * 2;
      arr.push([cx + Math.cos(a) * ring.r, cy + Math.sin(a) * ring.r, ring.z]);
    }
    return arr;
  });
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      const a0 = Math.PI / sides + (i / sides) * Math.PI * 2;
      const a1 = Math.PI / sides + ((i + 1) / sides) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const tone = normalTone(Math.cos(am), Math.sin(am), 0.08) * (opts.tone || 1);
      pushFace(out, [pts[k][i], pts[k][j], pts[k + 1][j], pts[k + 1][i]], color, tone, opts);
    }
  }
  /* Dark open mouth. */
  const top = pts[pts.length - 1];
  pushFace(out, top, opts.inner || "#1d292c", 0.72, { alpha: 0.9 });
  /* Rim. */
  prism(out, cx, cy, z + height - 0.035, radius * 0.72, radius * 0.76, 0.07, sides, opts.rim || color, {
    tone: 1.1,
    bottom: false,
  });
}

export function dome(out, cx, cy, z, radius, height, color, opts = {}) {
  const sides = opts.sides || 8;
  const rings = [
    { z: z, r: radius },
    { z: z + height * 0.42, r: radius * 0.9 },
    { z: z + height * 0.72, r: radius * 0.65 },
    { z: z + height * 0.9, r: radius * 0.34 },
  ];
  const pts = rings.map((ring) => {
    const arr = [];
    for (let i = 0; i < sides; i++) {
      const a = Math.PI / sides + (i / sides) * Math.PI * 2;
      arr.push([cx + Math.cos(a) * ring.r, cy + Math.sin(a) * ring.r, ring.z]);
    }
    return arr;
  });
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      const a0 = Math.PI / sides + (i / sides) * Math.PI * 2;
      const a1 = Math.PI / sides + ((i + 1) / sides) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const tone = normalTone(Math.cos(am), Math.sin(am), 0.38) * (opts.tone || 1);
      pushFace(out, [pts[k][i], pts[k][j], pts[k + 1][j], pts[k + 1][i]], color, tone, opts);
    }
  }
  const top = [];
  for (let i = 0; i < sides; i++) {
    const a = Math.PI / sides + (i / sides) * Math.PI * 2;
    top.push([cx + Math.cos(a) * radius * 0.08, cy + Math.sin(a) * radius * 0.08, z + height]);
  }
  pushFace(out, top, color, 1.22 * (opts.tone || 1), opts);
}

/* Gable roof, ridge running along x. */
export function gable(out, cx, cy, z, w, d, h, color, opts = {}) {
  const x0 = cx - w / 2, x1 = cx + w / 2;
  const y0 = cy - d / 2, y1 = cy + d / 2;
  const ry = cy;
  const zr = z + h;
  pushFace(out, [[x0, y0, z], [x1, y0, z], [x1, ry, zr], [x0, ry, zr]], color, 0.9, opts);
  pushFace(out, [[x0, y1, z], [x1, y1, z], [x1, ry, zr], [x0, ry, zr]], color, 1.12, opts);
  pushFace(out, [[x0, y0, z], [x0, y1, z], [x0, ry, zr]], color, 0.72, opts);
  pushFace(out, [[x1, y0, z], [x1, y1, z], [x1, ry, zr]], color, 1.0, opts);
}

/* Thin pipe along an axis. Axis is "x" or "y". */
export function pipe(out, cx, cy, z, length, thickness, axis, color, opts = {}) {
  if (axis === "y") box(out, cx, cy, z, thickness, thickness, length, color, opts);
  else box(out, cx, cy, z, length, thickness, thickness, color, opts);
}

export function pipes(out, points, thickness, color, opts = {}) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > Math.abs(dz)) {
      box(out, (a[0] + b[0]) / 2, a[1], Math.min(a[2], b[2]), Math.abs(dx) + thickness, thickness, thickness, color, opts);
    } else if (Math.abs(dy) > Math.abs(dz)) {
      box(out, a[0], (a[1] + b[1]) / 2, Math.min(a[2], b[2]), thickness, thickness, Math.abs(dy) + thickness, color, opts);
    } else {
      prism(out, a[0], a[1], Math.min(a[2], b[2]), thickness / 2, thickness / 2, Math.abs(dz) + thickness, 6, color, opts);
    }
  }
}

export function windowStrip(out, cx, cy, z, w, h, color, opts = {}) {
  box(out, cx, cy, z, w, h, 0.035, color, { tone: 1.2, glow: 0.8, ...opts });
}

export function lattice(out, cx, cy, z, w, h, color, opts = {}) {
  const t = opts.thickness || 0.055;
  const x0 = cx - w / 2, x1 = cx + w / 2;
  box(out, x0, cy, z, t, h, t, color, { tone: 0.9 });
  box(out, x1, cy, z, t, h, t, color, { tone: 0.9 });
  box(out, cx, cy - w / 2, z, t, h, t, color, { tone: 0.9 });
  box(out, cx, cy + w / 2, z, t, h, t, color, { tone: 0.9 });
  for (let i = 1; i < 4; i++) {
    box(out, cx, cy, z + (h * i) / 4, w, t, t, color, { tone: 0.85 });
    box(out, cx, cy, z + (h * i) / 4, t, t, w, color, { tone: 0.85 });
  }
  box(out, cx, cy, z + h, w * 1.35, t, t, color, { tone: 1.1 });
}

export function antenna(out, cx, cy, z, h, color, opts = {}) {
  prism(out, cx, cy, z, 0.035, 0.018, h, 5, color, { tone: 1.0 });
  box(out, cx, cy, z + h, 0.1, 0.1, 0.1, opts.light || "#ff6a5b", { tone: 1.3, glow: 1 });
}

export function crane(out, cx, cy, z, h, reach, color) {
  const t = 0.055;
  box(out, cx, cy, z, t, h, t, color, { tone: 0.85 });
  box(out, cx + reach / 2, cy, z + h, reach, t, t, color, { tone: 1.05 });
  box(out, cx, cy, z + h * 0.62, t, t, reach * 0.45, color, { tone: 0.85 });
  box(out, cx + reach, cy, z + h - 0.5, 0.03, 0.5, 0.03, "#d8d8c8", { tone: 0.9 });
}

export function tank(out, cx, cy, z, radius, height, color, opts = {}) {
  prism(out, cx, cy, z, radius, radius, height, 8, color, opts);
  dome(out, cx, cy, z + height - 0.02, radius * 1.02, radius * 0.45, color, opts);
}

export function fenceLine(out, x0, y0, x1, y1, z, color, opts = {}) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const posts = Math.max(1, Math.round(len / 0.7));
  for (let i = 0; i <= posts; i++) {
    const t = i / posts;
    const x = x0 + dx * t, y = y0 + dy * t;
    box(out, x, y, z, 0.045, 0.48, 0.045, color, { tone: 0.9 });
  }
  const midX = (x0 + x1) / 2, midY = (y0 + y1) / 2;
  if (Math.abs(dx) > Math.abs(dy)) box(out, midX, midY, z + 0.36, len, 0.035, 0.03, color, { tone: 0.8 });
  else box(out, midX, midY, z + 0.36, 0.03, 0.035, len, color, { tone: 0.8 });
}

export function groundPad(out, cx, cy, w, d, color, opts = {}) {
  box(out, cx, cy, 0.015, w, 0.06, d, color, { tone: 1.0, bottom: false, ...opts });
}

export function containerUnit(out, cx, cy, z, w, h, d, color) {
  box(out, cx, cy, z, w, h, d, color, { tone: 1 });
  const ribs = Math.max(2, Math.round(w / 0.32));
  for (let i = 1; i < ribs; i++) {
    box(out, cx - w / 2 + (w * i) / ribs, cy - d / 2 - 0.01, z + 0.06, 0.025, h * 0.86, 0.025, shade(color, 0.72), { tone: 0.9 });
  }
  box(out, cx + w / 2 - 0.18, cy + d / 2 + 0.012, z + h * 0.18, 0.28, h * 0.55, 0.025, "#27353a", { tone: 0.8 });
}
