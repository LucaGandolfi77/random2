import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint } from './palette.js';

/** Primitive low-poly: tutto segmenti bassi, niente tondo. */
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rTop, rBot, h, seg = 8) => new THREE.CylinderGeometry(rTop, rBot, h, seg);
export const cone = (r, h, seg = 8) => new THREE.ConeGeometry(r, h, seg);
export const sph = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
export const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
export const tor = (r, tube, rseg = 5, tseg = 12) => new THREE.TorusGeometry(r, tube, rseg, tseg);
export const plane = (w, h, ws = 1, hs = 1) => new THREE.PlaneGeometry(w, h, ws, hs);

/** Prisma triangolare, ideale per i tetti a falde. */
export const wedge = (w, h, d) => {
  const g = new THREE.BufferGeometry();
  const hw = w / 2;
  const hd = d / 2;
  const v = new Float32Array([
    // faccia frontale
    -hw, 0, hd, hw, 0, hd, 0, h, hd,
    // faccia posteriore
    hw, 0, -hd, -hw, 0, -hd, 0, h, -hd,
    // fianco sinistro
    -hw, 0, -hd, -hw, 0, hd, 0, h, hd,
    0, h, -hd, -hw, 0, -hd, 0, h, hd,
    // fianco destro
    hw, 0, hd, hw, 0, -hd, 0, h, hd,
    0, h, -hd, hw, 0, -hd, 0, h, hd,
    // fondo
    -hw, 0, -hd, -hw, 0, hd, hw, 0, hd,
    -hw, 0, -hd, hw, 0, hd, hw, 0, -hd,
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setAttribute(
    'uv',
    new THREE.BufferAttribute(new Float32Array((v.length / 3) * 2), 2)
  );
  g.computeVertexNormals();
  return g;
};

/**
 * Applica colore e trasformazione a una primitiva.
 * Ordine: scala → ruota → sposta, così da usare sempre coordinate "grezze".
 */
export function part(geo, color, o = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (color != null) paint(g, color);
  const sx = o.sx ?? o.s ?? 1;
  const sy = o.sy ?? o.s ?? 1;
  const sz = o.sz ?? o.s ?? 1;
  if (sx !== 1 || sy !== 1 || sz !== 1) g.scale(sx, sy, sz);
  if (o.rx) g.rotateX(o.rx);
  if (o.ry) g.rotateY(o.ry);
  if (o.rz) g.rotateZ(o.rz);
  g.translate(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  return g;
}

/** Triangolo piatto da tre vertici (cupole a spicchi, vele, tettucci). */
export function tri(a, b, c) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  g.computeVertexNormals();
  return g;
}

const TAU = Math.PI * 2;

/**
 * Cupola / ombrellone a spicchi alternati: triangoli indipendenti, così ogni
 * spicchio ha il suo colore (semaforo del mare, tenda a strisce…).
 */
export function stripedDome(r, h, seg, cA, cB, { droop = 0.3 } = {}) {
  const parts = [];
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * TAU;
    const a1 = ((i + 1) / seg) * TAU;
    const x0 = Math.cos(a0) * r;
    const z0 = Math.sin(a0) * r;
    const x1 = Math.cos(a1) * r;
    const z1 = Math.sin(a1) * r;
    const cx0 = Math.cos(a0 + 0.2) * r * 0.4;
    const cz0 = Math.sin(a0 + 0.2) * r * 0.4;
    const cx1 = Math.cos(a1 - 0.2) * r * 0.4;
    const cz1 = Math.sin(a1 - 0.2) * r * 0.4;
    parts.push(part(tri([x0, 0, z0], [x1, 0, z1], [0, h, 0]), i % 2 ? cA : cB));
    parts.push(
      part(
        tri([x0, 0, z0], [cx0, -h * droop, cz0], [cx1, -h * droop, cz1]),
        i % 2 ? cB : cA
      ),
      part(
        tri([x1, 0, z1], [cx1, -h * droop, cz1], [cx0, -h * droop, cz0]),
        i % 2 ? cB : cA
      )
    );
  }
  return merge(parts);
}

/** Fonde parti in una sola geometria: un prop = una geometria = un draw call. */
export function merge(parts) {
  const g = mergeGeometries(parts.filter(Boolean), false);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
