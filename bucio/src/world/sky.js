import * as THREE from 'three';
import { P, c } from './palette.js';
import { ico, part, merge } from './geometry.js';
import { makeRng } from '../core/utils.js';
import { currentTheme } from './themes.js';

/**
 * Cielo al tramonto: il buco è cadato dal cielo, ma Portomarina fa le
 * undici di sera. Cupola a gradiente + nuvole low-poly che derivano piano.
 */
export function buildSky() {
  const sky = currentTheme().sky;
  const geo = new THREE.SphereGeometry(420, 20, 12);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const top = c(sky.top);
  const mid = c(sky.mid);
  const low = c(sky.horizon);
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 420; // -1..1
    if (y > 0.12) col.copy(mid).lerp(top, Math.min(1, (y - 0.12) / 0.75));
    else col.copy(low).lerp(mid, Math.min(1, (y + 0.1) / 0.32));
    cols[i * 3] = col.r;
    cols[i * 3 + 1] = col.g;
    cols[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })
  );
  mesh.name = 'cielo';
  mesh.frustumCulled = false;
  return mesh;
}

/** Nuvole a ciambella: un cluster di ico-sfere schiacciate. */
function cloudGeometry(rng, colA, colB) {
  const puffs = [];
  const n = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const r = 5 + rng() * 6;
    puffs.push(
      part(ico(r, 0), i % 2 ? colA : colB, {
        x: (i - n / 2) * 7 + rng() * 4,
        y: rng() * 3,
        z: (rng() - 0.5) * 8,
        sy: 0.55,
        s: 1,
      })
    );
  }
  return merge(puffs);
}

export function buildClouds() {
  const rng = makeRng(4242);
  const sky = currentTheme().sky;
  const group = new THREE.Group();
  group.name = 'nuvole';
  const mat = new THREE.MeshLambertMaterial({
    color: c(sky.cloud),
    flatShading: true,
    fog: false,
  });
  const n = sky.cloudsBelow ? 22 : 15;
  for (let i = 0; i < n; i++) {
    const mesh = new THREE.Mesh(cloudGeometry(rng, sky.cloud, P.white), mat);
    const a = rng() * Math.PI * 2;
    const rad = 120 + rng() * 240;
    // sull'isola le nuvole stanno SOTTO, a fare da pavimento
    const y = sky.cloudsBelow ? -18 - rng() * 30 : 46 + rng() * 52;
    mesh.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
    mesh.userData.speed = 1.1 + rng() * 1.8;
    mesh.rotation.y = rng() * Math.PI;
    mesh.userData.floor = sky.cloudsBelow;
    group.add(mesh);
  }
  return group;
}

export function animateSky(clouds, dt) {
  for (const cl of clouds.children) {
    cl.position.x += cl.userData.speed * dt;
    if (cl.position.x > 360) cl.position.x = -360;
  }
  clouds.rotation.y += dt * 0.004;
}

/** Qualche stella, per i temi notturni. */
function addStars(group, sky) {
  const rng = makeRng(31337);
  const count = 420;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c0 = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const y = 0.12 + rng() * 0.85;
    const r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(a) * r * 400;
    pos[i * 3 + 1] = y * 400;
    pos[i * 3 + 2] = Math.sin(a) * r * 400;
    c0.setHSL(0.58, 0.35, 0.55 + rng() * 0.45);
    col[i * 3] = c0.r;
    col[i * 3 + 1] = c0.g;
    col[i * 3 + 2] = c0.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(
    g,
    new THREE.PointsMaterial({ size: 2.4, vertexColors: true, sizeAttenuation: false, fog: false })
  );
  stars.name = 'stelle';
  stars.frustumCulled = false;
  group.add(stars);
}

/** Luce: un sole basso e caldo con ombre lunghe, più un rimbalzo dal mare. */
export function buildLights(group) {
  const sky = currentTheme().sky;
  const hemi = new THREE.HemisphereLight(sky.hemiSky, sky.hemiGround, sky.hemiInt);
  hemi.position.set(0, 60, 0);
  group.add(hemi);

  const sun = new THREE.DirectionalLight(sky.sun, sky.sunInt);
  sun.position.set(...sky.sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 300;
  const d = 78;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0016;
  sun.shadow.normalBias = 0.045;
  group.add(sun);
  group.add(sun.target);

  const bounce = new THREE.DirectionalLight(P.sea, 0.35);
  bounce.position.set(60, 24, -70);
  group.add(bounce);

  if (sky.stars) addStars(group, sky);

  return { hemi, sun, bounce };
}
