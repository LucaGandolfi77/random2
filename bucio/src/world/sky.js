import * as THREE from 'three';
import { P, c } from './palette.js';
import { ico, part, merge } from './geometry.js';
import { makeRng } from '../core/utils.js';

/**
 * Cielo al tramonto: il buco è cadato dal cielo, ma Portomarina fa le
 * undici di sera. Cupola a gradiente + nuvole low-poly che derivano piano.
 */
export function buildSky() {
  const geo = new THREE.SphereGeometry(420, 20, 12);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const top = c(P.night).multiplyScalar(1.1);
  const mid = c(P.navy).lerp(c(P.rose), 0.28);
  const low = c(P.sky2).lerp(c(P.lemon), 0.42);
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
function cloudGeometry(rng) {
  const puffs = [];
  const n = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const r = 5 + rng() * 6;
    puffs.push(
      part(ico(r, 0), i % 2 ? P.white : P.cream, {
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
  const group = new THREE.Group();
  group.name = 'nuvole';
  const mat = new THREE.MeshLambertMaterial({ color: c(P.cream), flatShading: true, fog: false });
  for (let i = 0; i < 16; i++) {
    const mesh = new THREE.Mesh(cloudGeometry(rng), mat);
    const a = rng() * Math.PI * 2;
    const rad = 120 + rng() * 220;
    mesh.position.set(Math.cos(a) * rad, 46 + rng() * 52, Math.sin(a) * rad);
    mesh.userData.speed = 1.1 + rng() * 1.8;
    mesh.rotation.y = rng() * Math.PI;
    group.add(mesh);
  }
  return group;
}

export function animateSky(clouds, dt) {
  for (const cl of clouds.children) {
    cl.position.x += cl.userData.speed * dt;
    if (cl.position.x > 340) cl.position.x = -340;
  }
  clouds.rotation.y += dt * 0.004;
}

/** Luce: un sole basso e caldo con ombre lunghe, più un rimbalzo dal mare. */
export function buildLights(scene) {
  const hemi = new THREE.HemisphereLight(c(P.sky2).getHex(), c(P.seaDeep).getHex(), 1.05);
  hemi.position.set(0, 60, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(c(P.sun).getHex(), 2.1);
  sun.position.set(-70, 62, 96);
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
  scene.add(sun);
  scene.add(sun.target);

  const bounce = new THREE.DirectionalLight(c(P.sea).getHex(), 0.35);
  bounce.position.set(60, 24, -70);
  scene.add(bounce);

  return { hemi, sun, bounce };
}
