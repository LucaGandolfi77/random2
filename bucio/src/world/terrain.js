import * as THREE from 'three';
import { P, c } from './palette.js';
import { MAP, shoreZ, groundY, ROADS, PONDS } from './layout.js';
import { clamp, smoothstep, makeRng } from '../core/utils.js';
import { currentTheme } from './themes.js';

/** Dov'è la battigia: risolve groundY == seaLevel per piccolo z. */
function waterlineZ(x) {
  const s = shoreZ(x);
  let lo = s - MAP.beachDepth * 0.42;
  let hi = s + MAP.beachDepth;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) * 0.5;
    if (groundY(x, mid) > MAP.seaLevel) lo = mid;
    else hi = mid;
  }
  return (lo + hi) * 0.5;
}

const tmpCol = new THREE.Color();

/**
 * Il mare non deve finire a bordo mappa: è una corona (un piano con un buco
 * quadrato) che parte esattamente dal limite della mappa. Sovrapporla al
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
  return mesh;
}

export function buildTerrain() {
  // la mesh segue la mappa: nel mondo grande servono più triangoli, ma non
  // così tanti da far crollare il frame (il tetto è 200 per lato)
  const seg = Math.min(200, Math.max(64, Math.round((132 * MAP.half) / 108)));
  const geo = new THREE.PlaneGeometry(MAP.half * 2, MAP.half * 2, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const rng = makeRng(90210);
  const colors = new Float32Array(pos.count * 3);
  const theme = currentTheme();
  const col = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, groundY(x, z));
    theme.ground(x, z, rng, col);
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
  // tetto basso di segmenti: il mare si ricalcola a ogni frame
  const seg = Math.min(130, Math.max(48, Math.round((90 * MAP.half) / 108)));
  const geo = new THREE.PlaneGeometry(MAP.half * 2, MAP.half * 2, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const shallow = c(P.foam).lerp(c(P.sea), 0.55);
  const deep = c(P.seaDeep);
  const deepAt = 22 * (MAP.half / 108); // la sfumatura segue la larghezza della mappa
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, MAP.seaLevel);
    const t = smoothstep(clamp((z - shoreZ(x) + 2) / deepAt, 0, 1));
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

/** Laghetti decorativi (tema Giardino delle Nuvole). */
export function buildPonds() {
  const group = new THREE.Group();
  group.name = 'laghetti';
  const mat = new THREE.MeshLambertMaterial({
    color: c(P.sea),
    flatShading: true,
    transparent: true,
    opacity: 0.9,
  });
  for (const p of PONDS) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(p.r, 18), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x, groundY(p.x, p.z) + 0.08, p.z);
    group.add(m);
    const inner = new THREE.Mesh(
      new THREE.RingGeometry(p.r * 0.55, p.r * 0.72, 18),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.copy(m.position);
    inner.position.y += 0.02;
    group.add(inner);
  }
  return group;
}

/** Anima il mare con due onde incrociate. */
export function animateSea(sea, t) {
  if (!sea) return;
  const pos = sea.geometry.attributes.position;
  const base = sea.userData.base;
  const k = 108 / MAP.half; // nel mondo grande le onde non devono allungarsi
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const z = base[i * 3 + 2];
    pos.array[i * 3 + 1] =
      Math.sin(x * 0.09 * k + t * 0.9) * 0.075 + Math.sin(z * 0.13 * k - t * 1.35) * 0.055;
  }
  pos.needsUpdate = true;
  sea.geometry.computeVertexNormals();
}

/** Schiuma: nastro lungo tutta la battigia (solo se il tema ha acqua). */
export function buildFoam() {
  if (!MAP.water) {
    const empty = new THREE.Group();
    empty.name = 'schiuma';
    return empty;
  }
  const steps = Math.min(180, Math.max(64, Math.round((96 * MAP.half) / 108)));
  const verts = [];
  const cols = [];
  const idx = [];
  const foam = c(P.foam);
  for (let i = 0; i <= steps; i++) {
    const x = -MAP.half + (i / steps) * MAP.half * 2;
    const z = waterlineZ(x);
    const w = 1.5 + Math.sin(i * 1.7) * 0.45;
    verts.push(x, MAP.seaLevel + 0.035, z - w, x, MAP.seaLevel + 0.035, z + w * 0.6);
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
  const mat = new THREE.MeshLambertMaterial({ color: c(P.stone), flatShading: true });
  for (const r of ROADS) {
    const geo =
      r.axis === 'x'
        ? new THREE.BoxGeometry(MAP.half * 2, 0.06, r.w + 3)
        : new THREE.BoxGeometry(r.w + 3, 0.06, MAP.half * 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(r.axis === 'x' ? 0 : r.at, 0.03, r.axis === 'x' ? r.at : 0);
    m.receiveShadow = true;
    group.add(m);
  }
  group.name = 'marciapiedi';
  return group;
}
