import * as THREE from 'three';
import { P, c } from './palette.js';
import { MAP, shoreZ, groundY, isRoad, isPiazza, ROADS } from './layout.js';
import { clamp, smoothstep, makeRng } from '../core/utils.js';

const HALF = MAP.half;
const SEA_LEVEL = MAP.seaLevel;

/** Dov'è la battigia: risolve groundY == seaLevel per piccolo z. */
function waterlineZ(x) {
  const s = shoreZ(x);
  let lo = s - MAP.beachDepth * 0.42;
  let hi = s + MAP.beachDepth;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) * 0.5;
    if (groundY(x, mid) > SEA_LEVEL) lo = mid;
    else hi = mid;
  }
  return (lo + hi) * 0.5;
}

const tmpCol = new THREE.Color();

/** Colore del terreno in base alla zona: sabbia, strada, prato, piazza. */
function groundColor(x, z, rng, out = tmpCol) {
  const s = shoreZ(x);
  const depth = z - s;
  const townEdge = -MAP.beachDepth * 0.42;

  if (isRoad(x, z)) {
    out.copy(c(P.asphalt)).lerp(c(P.stoneDark), rng() * 0.12);
    return out;
  }
  if (isPiazza(x, z)) {
    // raggio geometrico della piazza, sfumato verso l'esterno
    const d = Math.hypot(x - 16, z + 34);
    out.copy(c(P.stone)).lerp(c(P.sand), clamp((d - 9) / 7, 0, 1));
    return out;
  }
  if (depth > 1.2) {
    // fondale: sabbia bagnata -> blu profondo
    const t = clamp((depth - 1.2) / 16, 0, 1);
    out.copy(c(P.wetSand)).lerp(c(P.seaDeep), smoothstep(t));
    return out;
  }
  if (depth > townEdge) {
    // spiaggia: bagnata verso l'acqua, asciutta verso la promenade
    const t = clamp((depth - townEdge) / (1.2 - townEdge), 0, 1);
    out.copy(c(P.sandDark)).lerp(c(P.sand), smoothstep(t));
    return out;
  }
  // città: prato, aiuole e qualche cortile in pietra
  const patch = Math.sin(x * 0.11) * Math.cos(z * 0.13) + Math.sin((x + z) * 0.05) * 0.8;
  if (patch > 0.55) out.copy(c(P.palm)).lerp(c(P.olive), rng() * 0.4);
  else if (patch < -0.75) out.copy(c(P.cream)).lerp(c(P.bone), rng() * 0.5);
  else out.copy(c(P.olive)).lerp(c(P.mint), rng() * 0.35);
  return out;
}

/**
 * Il mare non deve finire a bordo mappa. È una corona (un piano con un buco
 * quadrato) che parte esattamente dal limite della mappa: sovrapporla al
 * terreno la farebbe sparire per conflitti di profondità.
 */
export function buildOpenSea() {
  const OUTER = 900;
  const INNER = MAP.half;
  const shape = new THREE.Shape();
  shape.moveTo(-OUTER, -OUTER);
  shape.lineTo(OUTER, -OUTER);
  shape.lineTo(OUTER, OUTER);
  shape.lineTo(-OUTER, OUTER);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-INNER, -INNER);
  hole.lineTo(-INNER, INNER);
  hole.lineTo(INNER, INNER);
  hole.lineTo(INNER, -INNER);
  hole.closePath();
  shape.holes.push(hole);

  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ color: c(P.seaDeep), flatShading: true })
  );
  mesh.position.y = MAP.seaLevel;
  mesh.name = 'mare-lontano';
  mesh.renderOrder = 0;
  return mesh;
}

export function buildTerrain() {
  const seg = 132;
  const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const rng = makeRng(90210);
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, groundY(x, z));
    const col = groundColor(x, z, rng);
    // micro variazione per far leggere i triangoli (effetto low-poly)
    const k = 0.94 + rng() * 0.12;
    colors[i * 3] = col.r * k;
    colors[i * 3 + 1] = col.g * k;
    colors[i * 3 + 2] = col.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
  );
  mesh.receiveShadow = true;
  mesh.name = 'terreno';
  return mesh;
}

/** Mar Tirreno: piano animato, più scuro dove è più fondo. */
export function buildSea() {
  const seg = 90;
  const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const shallow = c(P.foam).lerp(c(P.sea), 0.55);
  const deep = c(P.seaDeep);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, SEA_LEVEL);
    const t = smoothstep(clamp((z - shoreZ(x) + 2) / 22, 0, 1));
    const col = shallow.clone().lerp(deep, t);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;
  mesh.name = 'mare';
  mesh.userData.base = Float32Array.from(pos.array);
  mesh.userData.phase = 0;
  return mesh;
}

/** Anima il mare con due onde incrociate. */
export function animateSea(sea, t) {
  const pos = sea.geometry.attributes.position;
  const base = sea.userData.base;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const z = base[i * 3 + 2];
    pos.array[i * 3 + 1] =
      Math.sin(x * 0.09 + t * 0.9) * 0.075 + Math.sin(z * 0.13 - t * 1.35) * 0.055;
  }
  pos.needsUpdate = true;
  sea.geometry.computeVertexNormals();
}

/** Schiuma: nastro lungo tutta la battigia. */
export function buildFoam() {
  const steps = 96;
  const verts = [];
  const cols = [];
  const idx = [];
  const foam = c(P.foam);
  for (let i = 0; i <= steps; i++) {
    const x = -HALF + (i / steps) * HALF * 2;
    const z = waterlineZ(x);
    const w = 1.5 + Math.sin(i * 1.7) * 0.45;
    verts.push(x, SEA_LEVEL + 0.035, z - w, x, SEA_LEVEL + 0.035, z + w * 0.6);
    cols.push(foam.r, foam.g, foam.b, foam.r, foam.g, foam.b);
    if (i < steps) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    })
  );
  mesh.renderOrder = 2;
  mesh.name = 'schiuma';
  return mesh;
}

/** Marciapiedi chiari lungo le strade: un tocco di leggibilità. */
export function buildSidewalks() {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: c(P.bone), flatShading: true });
  for (const r of ROADS) {
    const geo =
      r.axis === 'x'
        ? new THREE.BoxGeometry(HALF * 2, 0.06, r.w + 3)
        : new THREE.BoxGeometry(r.w + 3, 0.06, HALF * 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(r.axis === 'x' ? 0 : r.at, 0.03, r.axis === 'x' ? r.at : 0);
    m.receiveShadow = true;
    group.add(m);
  }
  group.name = 'marciapiedi';
  return group;
}
