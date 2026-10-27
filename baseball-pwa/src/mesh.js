/*
 * DIAMOND POLY '99 · 3D Low-Poly Mesh Primitives & Articulated Characters
 * -----------------------------------------------------------------------
 * Every player, bat, helmet, base, grandstand, floodlight tower, and tree
 * is built from flat-shaded 3D polygon facets with per-face surface normals.
 */

export function boxMesh(w, d, h, color) {
  const x = w / 2, y = d / 2, z = h / 2;
  const v = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
    [-x, -y, z],  [x, -y, z],  [x, y, z],  [-x, y, z]
  ];
  const f = [
    { idx: [4, 5, 6, 7], n: [0, 0, 1],  c: color, tone: 1.08 }, // top
    { idx: [0, 1, 5, 4], n: [0, -1, 0], c: color, tone: 0.96 }, // front (-y faces home plate)
    { idx: [1, 2, 6, 5], n: [1, 0, 0],  c: color, tone: 0.88 }, // right
    { idx: [3, 0, 4, 7], n: [-1, 0, 0], c: color, tone: 0.82 }, // left
    { idx: [2, 3, 7, 6], n: [0, 1, 0],  c: color, tone: 0.74 }  // back
  ];
  return { v, f };
}

export function prismMesh(sides, rBottom, rTop, h, color) {
  const v = [];
  const f = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    v.push([ca * rBottom, sa * rBottom, 0]);
    v.push([ca * rTop, sa * rTop, h]);
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    const mid = ((i + 0.5) / sides) * Math.PI * 2;
    f.push({
      idx: [i * 2, j * 2, j * 2 + 1, i * 2 + 1],
      n: [Math.cos(mid), Math.sin(mid), 0.2],
      c: color,
      tone: 0.95
    });
  }
  const topRing = [];
  for (let i = 0; i < sides; i++) topRing.push(i * 2 + 1);
  f.push({ idx: topRing, n: [0, 0, 1], c: color, tone: 1.1 });
  return { v, f };
}

export function transformMesh(mesh, dx, dy, dz, rotZ = 0, rotX = 0) {
  const cz = Math.cos(rotZ), sz = Math.sin(rotZ);
  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  const v = mesh.v.map((p) => {
    let x = p[0], y = p[1], z = p[2];
    if (rotX !== 0) {
      const ny = y * cx - z * sx;
      const nz = y * sx + z * cx;
      y = ny; z = nz;
    }
    if (rotZ !== 0) {
      const nx = x * cz - y * sz;
      const ny = x * sz + y * cz;
      x = nx; y = ny;
    }
    return [x + dx, y + dy, z + dz];
  });
  const f = mesh.f.map((face) => {
    let nx = face.n[0], ny = face.n[1], nz = face.n[2];
    if (rotX !== 0) {
      const rny = ny * cx - nz * sx;
      const rnz = ny * sx + nz * cx;
      ny = rny; nz = rnz;
    }
    if (rotZ !== 0) {
      const rnx = nx * cz - ny * sz;
      const rny = nx * sz + ny * cz;
      nx = rnx; ny = rny;
    }
    return { idx: face.idx.slice(), n: [nx, ny, nz], c: face.c, tone: face.tone };
  });
  return { v, f };
}

export function mergeMeshes(list) {
  const v = [];
  const f = [];
  let offset = 0;
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    for (let j = 0; j < m.v.length; j++) v.push(m.v[j]);
    for (let j = 0; j < m.f.length; j++) {
      const face = m.f[j];
      f.push({
        idx: face.idx.map((k) => k + offset),
        n: face.n,
        c: face.c,
        tone: face.tone
      });
    }
    offset += m.v.length;
  }
  return { v, f };
}

/* Build a low-poly articulated baseball player mesh at a given pose */
export function buildPlayerMesh(opts) {
  const jersey = opts.jersey || "#3b82f6";
  const pants = opts.pants || "#f1f5f9";
  const cap = opts.cap || jersey;
  const skin = opts.skin || "#f1c27d";
  const stride = opts.stride || 0;      // leg swing phase
  const slide = opts.sliding || false;  // diving/sliding pose
  const batColor = opts.batColor || null;
  const swingAng = opts.swingAngle || 0;

  if (slide) {
    // Horizontal headfirst/hook slide pose!
    return mergeMeshes([
      transformMesh(boxMesh(0.52, 1.15, 0.34, jersey), 0, 0, 0.25),
      transformMesh(boxMesh(0.42, 0.85, 0.28, pants), 0, -0.85, 0.22),
      transformMesh(prismMesh(6, 0.22, 0.20, 0.36, skin), 0, 0.68, 0.22),
      transformMesh(prismMesh(6, 0.24, 0.18, 0.18, cap), 0, 0.68, 0.52)
    ]);
  }

  const legL = Math.sin(stride) * 0.28;
  const legR = -legL;
  const parts = [
    // Cleats & Legs
    transformMesh(boxMesh(0.22, 0.24, 0.72, pants), -0.16, legL, 0.36),
    transformMesh(boxMesh(0.22, 0.24, 0.72, pants),  0.16, legR, 0.36),
    // Torso (faceted jersey)
    transformMesh(prismMesh(6, 0.30, 0.36, 0.78, jersey), 0, 0, 0.70),
    // Shoulders / Arms
    transformMesh(boxMesh(0.18, 0.18, 0.55, jersey), -0.38, -legL * 0.6, 1.12),
    transformMesh(boxMesh(0.18, 0.18, 0.55, jersey),  0.38,  legL * 0.6, 1.12),
    // Head & Batting Helmet / Cap
    transformMesh(prismMesh(6, 0.22, 0.22, 0.36, skin), 0, 0, 1.48),
    transformMesh(prismMesh(6, 0.25, 0.19, 0.22, cap), 0, 0, 1.78),
    // Cap visor
    transformMesh(boxMesh(0.28, 0.22, 0.06, cap), 0, 0.20, 1.78)
  ];

  if (batColor) {
    // 3D Low-poly Baseball Bat held by batter
    const bat = prismMesh(6, 0.04, 0.085, 1.15, batColor);
    parts.push(transformMesh(bat, 0.36, 0.18, 1.25, swingAng, 1.15));
  }

  return mergeMeshes(parts);
}
